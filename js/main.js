// Arranque, navegación con historial (el "atrás" del celu funciona) y eventos.
import { cargar, S, hoy, guardar } from './store.js';
import { nav } from './nav.js';
import { cerrarHoja, hojaAbierta, toast } from './ui.js';
import { iniciarPwa, instalar } from './pwa.js';
import { reducirMovimiento } from './util.js';
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
let actual = null;          // { ruta, el, pantalla }
let indice = 0;             // posición en el historial propio

function resolver(ruta) {
  if (PANTALLAS[ruta]) return [PANTALLAS[ruta], undefined];
  const i = ruta.lastIndexOf('/');
  const clave = ruta.slice(0, i), param = decodeURIComponent(ruta.slice(i + 1));
  return PANTALLAS[clave] ? [PANTALLAS[clave], param] : [null];
}

function inicio() {
  if (S.rol === 'cliente') return S.ubic ? 'c/mapa' : 'c/ubicacion';
  if (S.rol === 'comercio') return S.onboarding.hecho ? 'b/hoy' : 'b/plan';
  return 'bienvenida';
}

function pintar(ruta, anim = 'fade') {
  let [fn, param] = resolver(ruta);
  if (!fn || (!S.rol && ruta !== 'bienvenida')) { ruta = inicio(); [fn, param] = resolver(ruta); anim = 'fade'; }
  const p = fn(param);
  if (p.redirigir) { ir(p.redirigir, { replace: true }); return; }

  const el = document.createElement('div');
  el.className = 'pantalla actual ' + (p.clase || '');
  el.innerHTML = p.html + (p.tabs || '');
  const viejo = actual;
  if (viejo?.pantalla.desmontar) viejo.pantalla.desmontar();
  cerrarHoja(true);
  document.querySelectorAll('.toast').forEach(t => { if (anim !== 'mismo') t.remove(); });

  if (viejo && anim === 'mismo') {
    // re-render en el lugar: se conserva el scroll
    const sc = viejo.el.querySelector('.cuerpo')?.scrollTop || 0;
    viejo.el.replaceWith(el);
    const cu = el.querySelector('.cuerpo'); if (cu) cu.scrollTop = sc;
  } else if (viejo && !reducirMovimiento() && anim !== 'fade') {
    viejo.el.classList.remove('actual');
    const [inC, outC] = anim === 'pop' ? ['anim-pop-in', 'anim-pop-out'] : ['anim-push-in', 'anim-push-out'];
    el.classList.add(inC); viejo.el.classList.add(outC);
    app.appendChild(el);
    const v = viejo.el;
    setTimeout(() => { v.remove(); el.classList.remove(inC); }, 340);
  } else {
    if (viejo) viejo.el.remove();
    el.classList.add('anim-fade');
    app.appendChild(el);
  }
  actual = { ruta, el, pantalla: p };
  nav.ruta = ruta;
  document.title = 'Aprovecho';
  if (p.montar) p.montar(el);
}

export function ir(ruta, { replace = false, raiz = false } = {}) {
  if (raiz) {
    indice = 0;
    history.replaceState({ ruta, i: 0 }, '', '#/' + ruta);
    pintar(ruta, actual ? 'fade' : 'fade');
  } else if (replace) {
    history.replaceState({ ruta, i: indice }, '', '#/' + ruta);
    pintar(ruta, 'fade');
  } else {
    indice += 1;
    history.pushState({ ruta, i: indice }, '', '#/' + ruta);
    pintar(ruta, 'push');
  }
}

function atras() {
  if (hojaAbierta()) { cerrarHoja(); return; }
  if (indice > 0) history.back();
  else { const r = inicio(); history.replaceState({ ruta: r, i: 0 }, '', '#/' + r); pintar(r, 'pop'); }
}

const rutaDelHash = () => decodeURIComponent((location.hash || '').replace(/^#\//, ''));

window.addEventListener('popstate', e => {
  if (hojaAbierta()) cerrarHoja();
  // un link directo (cambio de #) llega sin estado: se toma la ruta del link
  const st = e.state || { ruta: resolver(rutaDelHash())[0] ? rutaDelHash() : inicio(), i: indice + 1 };
  if (!e.state) history.replaceState(st, '', location.hash);
  const dir = st.i < indice ? 'pop' : 'push';
  indice = st.i;
  pintar(st.ruta, dir);
});

nav.go = ir;
nav.atras = atras;
nav.render = () => actual && pintar(actual.ruta, 'mismo');

// ---------- eventos delegados ----------
app.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-tab],[data-act]');
  if (!t || t.disabled || t.classList.contains('off')) return;
  if (t.dataset.go) { e.preventDefault(); ir(t.dataset.go); return; }
  if (t.dataset.tab) { e.preventDefault(); if (actual?.ruta !== t.dataset.tab) ir(t.dataset.tab, { raiz: true }); else actual.el.querySelector('.cuerpo')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
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

// ---------- arranque ----------
cargar();
iniciarPwa(() => { if (['bienvenida', 'c/perfil', 'b/cuenta'].includes(nav.ruta)) nav.render(); });
const pedida = rutaDelHash();
const primera = S.rol && pedida && resolver(pedida)[0] ? pedida : inicio();
history.replaceState({ ruta: primera, i: 0 }, '', '#/' + primera);
app.querySelectorAll('.pantalla').forEach(p => p.remove()); // el splash de carga del HTML
pintar(primera, 'fade');

// la historia de Intelligence se calcula en segundo plano, así las pantallas abren al instante
(window.requestIdleCallback || (f => setTimeout(f, 600)))(() => import('./intel.js').then(m => m.historia(new Date())));

// la cuenta regresiva de Hoy y el cambio de día
setInterval(() => { if (nav.ruta === 'b/hoy' && !hojaAbierta()) nav.render(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.dia !== hoy()) { cargar(); nav.render(); }
});
window.addEventListener('pagehide', guardar);
