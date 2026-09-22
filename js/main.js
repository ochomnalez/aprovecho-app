// Arranque, navegación con historial (el "atrás" del celu funciona), barra de pestañas
// fija, gestos (deslizar entre secciones y volver desde el borde) y eventos.
import { cargar, S, hoy, guardar } from './store.js';
import { nav } from './nav.js';
import { cerrarHoja, hojaAbierta, toast, ordenPestanas } from './ui.js';
import { iniciarPwa, instalar, esStandalone, esIOS } from './pwa.js';
import { reducirMovimiento } from './util.js';
import { prestarMapa } from './mapa.js';
import * as cliente from './cliente.js';
import * as comercio from './comercio.js';
import * as intelui from './intelui.js';

const PANTALLAS = { ...cliente.pantallas, ...comercio.pantallas, ...intelui.pantallas };
const ACCIONES = {
  ...cliente.acciones, ...comercio.acciones, ...intelui.acciones,
  atras: () => atras(),
  instalar: async () => { const ok = await instalar(); if (ok) toast('¡Listo! Aprovecho quedó en tu pantalla de inicio.'); },
};
const CAMBIOS = { ...comercio.accionesCambio };
const FORMS = { ...comercio.formularios };

const app = document.getElementById('app');
const barraTabs = document.createElement('div');
barraTabs.id = 'barra-tabs';
barraTabs.className = 'oculta';
app.appendChild(barraTabs);

let actual = null;          // { ruta, el, pantalla }
let indice = 0;             // posición en el historial propio
const ANIM_TAB = { 'tab-der': 'anim-tab-der', 'tab-izq': 'anim-tab-izq' };

function resolver(ruta) {
  if (PANTALLAS[ruta]) return [PANTALLAS[ruta], undefined];
  const i = ruta.lastIndexOf('/');
  const clave = ruta.slice(0, i), param = decodeURIComponent(ruta.slice(i + 1));
  return PANTALLAS[clave] ? [PANTALLAS[clave], param] : [null];
}

function inicio() {
  if (S.rol === 'cliente') return S.ubic ? 'c/inicio' : 'c/ubicacion';
  if (S.rol === 'comercio') return S.onboarding.hecho ? 'b/hoy' : 'b/plan';
  return 'bienvenida';
}

// ---------- barra de pestañas fija, con el resaltado que se desliza ----------
// Es una sola para toda la app: entre secciones solo cambia cuál está prendida, así el
// resaltado viaja de una pestaña a la otra en vez de aparecer de golpe.
let indVisto = null; // dónde quedó dibujado el resaltado
const idsTabs = raiz => [...raiz.querySelectorAll('[data-tab],[data-go]')].map(b => b.dataset.tab || b.dataset.go).join('|');
function actualizarBarra(html) {
  if (!html) { barraTabs.classList.add('oculta'); return; }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  if (idsTabs(tpl.content) === idsTabs(barraTabs)) {
    // misma barra: se copian el estado y los contadores sin rehacerla
    const nuevos = tpl.content.querySelectorAll('.tab'), vivos = barraTabs.querySelectorAll('.tab');
    nuevos.forEach((n, i) => {
      const v = vivos[i];
      v.className = n.className;
      if (n.hasAttribute('aria-current')) v.setAttribute('aria-current', 'page'); else v.removeAttribute('aria-current');
      if (v.innerHTML !== n.innerHTML) v.innerHTML = n.innerHTML;
    });
  } else {
    barraTabs.replaceChildren(tpl.content);
  }
  const estabaOculta = barraTabs.classList.contains('oculta');
  barraTabs.classList.remove('oculta');
  moverIndicador(!estabaOculta);
}
function medir(tab) { return tab ? { x: tab.offsetLeft, w: tab.offsetWidth } : null; }
function ponerIndicador(ind, p) { ind.style.width = p.w + 'px'; ind.style.transform = `translate3d(${p.x - 6}px,0,0)`; indVisto = p; }
function moverIndicador(animar) {
  const ind = barraTabs.querySelector('.indicador');
  if (!ind) return;
  const destino = medir(barraTabs.querySelector('.tab.on'));
  if (!destino || !destino.w) { ind.style.opacity = '0'; return; }
  ind.style.opacity = '1';
  const desde = indVisto;
  if (animar && desde && (Math.abs(desde.x - destino.x) > .5 || Math.abs(desde.w - destino.w) > .5) && !reducirMovimiento()) {
    if (!ind.style.width) { ind.classList.remove('anim'); ponerIndicador(ind, desde); ind.getBoundingClientRect(); }
    ind.classList.add('anim');
  } else ind.classList.remove('anim');
  ponerIndicador(ind, destino);
}
// durante el gesto: el resaltado acompaña al dedo entre la pestaña actual y la vecina
function indicadorEntre(desde, hasta, t) {
  const ind = barraTabs.querySelector('.indicador');
  const tabs = barraTabs.querySelectorAll('.tab');
  const a = medir(tabs[desde]), b = medir(tabs[hasta]);
  if (!ind || !a) return;
  ind.classList.remove('anim');
  ponerIndicador(ind, b ? { x: a.x + (b.x - a.x) * t, w: a.w + (b.w - a.w) * t } : a);
}
new ResizeObserver(() => { if (!barraTabs.classList.contains('oculta')) moverIndicador(false); }).observe(app);

// ---------- dibujar una pantalla ----------
function pintar(ruta, anim = 'fade') {
  let [fn, param] = resolver(ruta);
  if (!fn || (!S.rol && ruta !== 'bienvenida')) { ruta = inicio(); [fn, param] = resolver(ruta); anim = 'fade'; }
  const p = fn(param);
  if (p.redirigir) { ir(p.redirigir, { replace: true }); return; }

  const el = document.createElement('div');
  el.className = 'pantalla actual ' + (p.clase || '');
  el.innerHTML = p.html;
  const viejo = actual;
  if (viejo?.pantalla.desmontar) viejo.pantalla.desmontar();
  cerrarHoja(true);
  if (anim !== 'mismo') document.querySelectorAll('.toast').forEach(t => t.remove());
  const quieto = reducirMovimiento();

  if (viejo && anim === 'mismo') {
    // re-render en el lugar: se conserva el scroll
    const sc = viejo.el.querySelector('.cuerpo')?.scrollTop || 0;
    viejo.el.replaceWith(el);
    const cu = el.querySelector('.cuerpo'); if (cu) cu.scrollTop = sc;
  } else if (viejo && typeof anim === 'object' && anim.pager != null) {
    // viene de deslizar entre secciones: la nueva entra desde donde quedó, junto con la vieja
    el.style.transform = `translate3d(${anim.pager}px,0,0)`;
    app.insertBefore(el, barraTabs);
    el.getBoundingClientRect();
    el.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)';
    el.style.transform = '';
    const v = viejo.el;
    v.classList.remove('actual');
    setTimeout(() => { v.remove(); el.style.transition = ''; }, 300);
  } else if (viejo && !quieto && (anim === 'push' || anim === 'pop')) {
    viejo.el.classList.remove('actual');
    const [inC, outC] = anim === 'pop' ? ['anim-pop-in', 'anim-pop-out'] : ['anim-push-in', 'anim-push-out'];
    el.classList.add(inC); viejo.el.classList.add(outC);
    app.insertBefore(el, barraTabs);
    const v = viejo.el;
    setTimeout(() => { v.remove(); el.classList.remove(inC); }, 370);
  } else if (viejo && !quieto && ANIM_TAB[anim]) {
    viejo.el.remove();
    el.classList.add(ANIM_TAB[anim]);
    app.insertBefore(el, barraTabs);
    setTimeout(() => el.classList.remove(ANIM_TAB[anim]), 320);
  } else {
    if (viejo) viejo.el.remove();
    el.classList.add('anim-fade');
    app.insertBefore(el, barraTabs);
  }
  actual = { ruta, el, pantalla: p };
  nav.ruta = ruta;
  document.title = 'Aprovecho';
  actualizarBarra(p.tabs);
  if (p.montar) p.montar(el);
}

export function ir(ruta, opts = {}) {
  const { replace = false, raiz = false, anim = null } = opts;
  if (hojaEnHist) {
    // había una hoja abierta con su lugar en el historial: la navegación ocupa ese lugar
    hojaEnHist = false;
    if (raiz || replace) { pendiente = () => ir(ruta, opts); saltarPop++; history.back(); return; }
    indice += 1;
    history.replaceState({ ruta, i: indice }, '', '#/' + ruta);
    pintar(ruta, anim || 'push');
    return;
  }
  if (raiz) {
    indice = 0;
    history.replaceState({ ruta, i: 0 }, '', '#/' + ruta);
    pintar(ruta, anim || 'fade');
  } else if (replace) {
    history.replaceState({ ruta, i: indice }, '', '#/' + ruta);
    pintar(ruta, anim || 'fade');
  } else {
    indice += 1;
    history.pushState({ ruta, i: indice }, '', '#/' + ruta);
    pintar(ruta, anim || 'push');
  }
}

// Cada hoja abierta ocupa un lugar en el historial: el "atrás" del celu la cierra
// (en vez de cerrar la app si estás en una pantalla principal).
let hojaEnHist = false, saltarPop = 0, pendiente = null;
nav.hojaAbierta = () => {
  if (hojaEnHist || !actual) return;
  history.pushState({ ruta: actual.ruta, i: indice, hoja: 1 }, '', location.hash);
  hojaEnHist = true;
};
nav.hojaCerrada = () => {
  // se cerró tocando afuera, con un botón o arrastrando: se saca su lugar del historial.
  // Se espera un instante porque a veces una hoja se cierra para abrir otra enseguida.
  setTimeout(() => {
    if (hojaEnHist && !hojaAbierta()) { hojaEnHist = false; saltarPop++; history.back(); }
  }, 0);
};

function atras() {
  if (hojaAbierta()) { cerrarHoja(); return; }
  if (indice > 0) history.back();
  else { const r = inicio(); history.replaceState({ ruta: r, i: 0 }, '', '#/' + r); pintar(r, 'pop'); }
}

const rutaDelHash = () => decodeURIComponent((location.hash || '').replace(/^#\//, ''));

let sinAnimacion = false; // la pantalla ya salió deslizada con el dedo
window.addEventListener('popstate', e => {
  if (saltarPop) {
    // vuelta atrás propia (se sacó el lugar de una hoja): no se redibuja nada
    saltarPop--;
    if (pendiente) { const f = pendiente; pendiente = null; f(); }
    return;
  }
  // el "atrás" del celu con una hoja abierta la cierra, sin irse de la pantalla
  if (hojaAbierta() && actual) {
    if (hojaEnHist) hojaEnHist = false;
    else history.pushState({ ruta: actual.ruta, i: indice }, '', '#/' + actual.ruta);
    cerrarHoja();
    return;
  }
  // un link directo (cambio de #) llega sin estado: se toma la ruta del link
  const st = e.state || { ruta: resolver(rutaDelHash())[0] ? rutaDelHash() : inicio(), i: indice + 1 };
  if (!e.state) history.replaceState(st, '', location.hash);
  const dir = sinAnimacion ? 'fade' : st.i < indice ? 'pop' : st.i > indice ? 'push' : 'fade';
  sinAnimacion = false;
  indice = st.i;
  pintar(st.ruta, dir);
});

nav.go = ir;
nav.atras = atras;
nav.render = () => actual && pintar(actual.ruta, 'mismo');

// ---------- eventos delegados ----------
function irPestana(ruta) {
  if (actual?.ruta === ruta) { actual.el.querySelector('.cuerpo')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const orden = ordenPestanas(S.rol), de = orden.indexOf(actual?.ruta), a = orden.indexOf(ruta);
  ir(ruta, { raiz: true, anim: de >= 0 && a >= 0 ? (a > de ? 'tab-der' : 'tab-izq') : 'fade' });
}
// el toque que cierra un gesto de deslizar no cuenta como toque
app.addEventListener('click', e => { if (Date.now() - ultimoGesto < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
app.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-tab],[data-act]');
  if (!t || t.disabled || t.classList.contains('off')) return;
  if (t.dataset.go) { e.preventDefault(); ir(t.dataset.go); return; }
  if (t.dataset.tab) { e.preventDefault(); irPestana(t.dataset.tab); return; }
  const fn = ACCIONES[t.dataset.act];
  if (fn) { e.preventDefault(); fn({ ...t.dataset }, t, e); }
});
app.addEventListener('change', e => {
  const t = e.target.closest('[data-act-change]');
  if (t && CAMBIOS[t.dataset.actChange]) CAMBIOS[t.dataset.actChange](t, e);
});
app.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (f && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && hojaAbierta()) cerrarHoja(); });

// ---------- deslizar de costado para cambiar de sección (cliente y local) ----------
// No arranca sobre lo que ya se mueve de costado: filas, carrusel, pestañas, mapa, controles.
const NO_DESLIZAR = '.seg,#slot-mapa,.mapa-caja,.leaflet-container,input,textarea,select,.asa-zona,.rango,.visor,.switch,.stepper,#barra-tabs';
const FILAS = '.carril,.pista,.chips.scroll,.pestanas';
function tocaFila(el) {
  const f = el.closest(FILAS);
  return f && f.scrollWidth > f.clientWidth + 2; // una fila que entra entera no se mueve: ahí sí se desliza de sección
}
// Los movimientos se escuchan en el elemento que se tocó: si la pantalla se redibuja
// con el dedo apoyado, ese elemento sale del documento y sus eventos ya no llegan a #app.
function seguirToque(target, mover, soltar) {
  const dejar = () => { target.removeEventListener('touchmove', mover); target.removeEventListener('touchend', fin); target.removeEventListener('touchcancel', fin); };
  const fin = e => { dejar(); soltar(e); };
  target.addEventListener('touchmove', mover, { passive: false });
  target.addEventListener('touchend', fin);
  target.addEventListener('touchcancel', fin);
  return dejar; // para soltar el dedo antes: cuando el gesto resulta ser un scroll para abajo
}

let gt = null, ultimoGesto = 0;
app.addEventListener('touchstart', e => {
  if (gt) { gt.dejar?.(); soltarPestana(); } // un gesto anterior que no terminó bien no deja trabada la pantalla
  if (gesto || !actual || hojaAbierta() || e.touches.length > 1 || document.querySelector('.cargando')) return;
  const orden = ordenPestanas(S.rol), idx = orden.indexOf(actual.ruta);
  if (idx < 0 || indice !== 0 || e.target.closest(NO_DESLIZAR) || tocaFila(e.target)) return;
  const t = e.touches[0];
  gt = { x0: t.clientX, y0: t.clientY, dx: 0, activo: false, idx, orden, el: actual.el, w: app.getBoundingClientRect().width, xl: t.clientX, tl: e.timeStamp, v: 0, vecino: null, dirVecino: 0 };
  gt.dejar = seguirToque(e.target, moverPestana, soltarPestana);
}, { passive: true });

function vistaVecina(g, dir) {
  // una vista previa de la sección de al lado, para que entre junto con el dedo
  if (g.vecino && g.dirVecino === dir) return g.vecino;
  if (g.vecino) g.vecino.remove();
  g.vecino = null; g.dirVecino = dir;
  const ruta = g.orden[g.idx + dir];
  if (!ruta) return null;
  const [fn, param] = resolver(ruta);
  if (!fn) return null;
  const p = fn(param);
  if (p.redirigir) return null;
  const v = document.createElement('div');
  v.className = 'pantalla ' + (p.clase || '');
  v.style.pointerEvents = 'none';
  v.setAttribute('aria-hidden', 'true');
  v.innerHTML = p.html;
  const slot = v.querySelector('#slot-mapa');
  if (slot && prestarMapa(slot)) slot.querySelector('.mapa-cargando')?.remove();
  app.insertBefore(v, barraTabs);
  g.vecino = v;
  return v;
}

function moverPestana(e) {
  if (!gt) return;
  const t = e.touches[0], dx = t.clientX - gt.x0, dy = t.clientY - gt.y0;
  if (!gt.activo) {
    if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { gt.dejar(); gt = null; return; } // es un scroll para abajo
    if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    gt.activo = true;
    gt.el.style.transition = 'none';
    // mientras se desliza de costado la pantalla no se mueve para arriba ni para abajo
    gt.cu = [...gt.el.querySelectorAll('.cuerpo, .lista-packs')];
    gt.cu.forEach(c => { c.style.overflowY = 'hidden'; });
  }
  e.preventDefault();
  const dir = dx < 0 ? 1 : -1;
  const hay = gt.idx + dir >= 0 && gt.idx + dir < gt.orden.length;
  gt.dx = hay ? dx : dx * 0.25;                 // resistencia en los extremos
  const dt = Math.max(1, e.timeStamp - gt.tl);
  gt.v = (t.clientX - gt.xl) / dt; gt.xl = t.clientX; gt.tl = e.timeStamp;
  gt.el.style.transform = `translate3d(${gt.dx}px,0,0)`;
  const v = hay ? vistaVecina(gt, dir) : null;
  if (!hay && gt.vecino) { gt.vecino.remove(); gt.vecino = null; gt.dirVecino = 0; }
  if (v) v.style.transform = `translate3d(${gt.dx + dir * gt.w}px,0,0)`;
  indicadorEntre(gt.idx, gt.idx + dir, hay ? Math.min(1, Math.abs(dx) / gt.w) : 0);
}

function soltarPestana() {
  if (!gt) return;
  const g = gt; gt = null;
  if (!g.activo) return;
  ultimoGesto = Date.now();
  g.cu?.forEach(c => { c.style.overflowY = ''; });
  const dir = g.dx < 0 ? 1 : -1, destino = g.idx + dir;
  const hay = destino >= 0 && destino < g.orden.length;
  const rapido = Math.abs(g.v) > 0.45 && Math.sign(g.v) === -dir && Math.abs(g.dx) > 24;
  const va = hay && actual?.el === g.el && (Math.abs(g.dx) > g.w * 0.26 || rapido);
  const curva = 'transform .28s cubic-bezier(.2,.8,.2,1)';
  g.el.style.transition = curva;
  if (va) {
    g.el.style.transform = `translate3d(${-dir * g.w}px,0,0)`;
    const desde = g.dx + dir * g.w;
    if (g.vecino) g.vecino.remove();
    ir(g.orden[destino], { raiz: true, anim: { pager: desde } });
  } else {
    g.el.style.transform = '';
    if (g.vecino) {
      const v = g.vecino;
      v.style.transition = curva;
      v.style.transform = `translate3d(${g.dirVecino * g.w}px,0,0)`;
      setTimeout(() => v.remove(), 300);
    }
    moverIndicador(true);
    const el = g.el;
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 300);
  }
}

// ---------- volver deslizando desde el borde (iPhone con la app instalada, que no trae el gesto) ----------
let gesto = null;
if (esIOS() && esStandalone()) {
  const mover = e => {
    if (!gesto) return;
    const t = e.touches[0], dx = t.clientX - gesto.x0, dy = t.clientY - gesto.y0;
    if (!gesto.activo) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { gesto = null; return; }
      if (dx < 8) return;
      gesto.activo = true; gesto.el.classList.add('arrastrando');
    }
    e.preventDefault();
    gesto.dx = Math.max(0, dx);
    gesto.el.style.transform = `translate3d(${gesto.dx}px,0,0)`;
  };
  const soltar = () => {
    if (!gesto) return;
    const g = gesto; gesto = null;
    if (!g.activo) return;
    ultimoGesto = Date.now();
    const irse = g.dx > g.w * .32;
    g.el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
    g.el.style.transform = irse ? `translate3d(${g.w}px,0,0)` : '';
    setTimeout(() => {
      g.el.classList.remove('arrastrando'); g.el.style.transition = '';
      if (irse) { sinAnimacion = true; history.back(); } else g.el.style.transform = '';
    }, 220);
  };
  app.addEventListener('touchstart', e => {
    if (gesto) soltar();
    if (indice === 0 || hojaAbierta() || !actual || e.touches.length > 1) return;
    const t = e.touches[0], r = app.getBoundingClientRect();
    if (t.clientX - r.left > 22) return;
    gesto = { x0: t.clientX, y0: t.clientY, dx: 0, activo: false, el: actual.el, w: r.width };
    seguirToque(e.target, mover, soltar);
  }, { passive: true });
}

// ---------- arranque ----------
cargar();
iniciarPwa(() => { if (['bienvenida', 'c/perfil', 'b/cuenta'].includes(nav.ruta)) nav.render(); });
const pedida = rutaDelHash();
const primera = S.rol && pedida && resolver(pedida)[0] ? pedida : inicio();
history.replaceState({ ruta: primera, i: 0 }, '', '#/' + primera);
pintar(primera, 'fade');

// pantalla de carga verde: se va cuando la app ya se dibujó (y se ve por lo menos un instante)
const splash = document.getElementById('splash');
if (splash) setTimeout(() => { splash.classList.add('fuera'); setTimeout(() => splash.remove(), 420); }, Math.max(250, 950 - performance.now()));

// la historia de Intelligence se calcula en segundo plano, así las pantallas abren al instante
(window.requestIdleCallback || (f => setTimeout(f, 600)))(() => import('./intel.js').then(m => m.historia(new Date())));

// la cuenta regresiva de Hoy y el cambio de día
setInterval(() => { if (nav.ruta === 'b/hoy' && !hojaAbierta() && !gt) nav.render(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.dia !== hoy()) { cargar(); nav.render(); }
});
window.addEventListener('pagehide', guardar);
