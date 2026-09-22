// Componentes de interfaz compartidos.
import { icon } from './icons.js';
import { esc } from './util.js';
import { S, tienePlan } from './store.js';
import { nav } from './nav.js';

// ---------- barra superior ----------
export function barra({ titulo = '', atras = true, accion = '', borde = false, centro = false, cerrar = false, grande = false } = {}) {
  const izq = atras ? `<button class="icbtn" data-act="atras" aria-label="${cerrar ? 'Cerrar' : 'Volver'}">${icon(cerrar ? 'x' : 'atras', 24)}</button>` : '';
  return `<header class="barra${borde ? ' borde' : ''}${grande ? ' grande' : ''}">${izq}<div class="titulo${centro ? ' centro' : ''}">${esc(titulo)}</div>${accion || (atras && centro ? '<span style="width:42px"></span>' : '')}</header>`;
}

// ---------- pestañas: barra flotante + botón circular (estilo Rappi) ----------
const tabBtn = (activa, id, ic, txt, extra = '', corto = '') => `<button class="tab${activa === id ? ' on' : ''}" data-tab="${id}" aria-label="${txt}"${activa === id ? ' aria-current="page"' : ''}>${icon(ic, 23)}${corto ? `<span class="largo">${txt}</span><span class="corto">${corto}</span>` : `<span>${txt}</span>`}${extra}</button>`;
export function tabsCliente(activa, reservasActivas = 0) {
  return `<nav class="tabs con-circulo" aria-label="Secciones"><span class="indicador"></span>
    ${tabBtn(activa, 'c/inicio', 'casa', 'Inicio')}
    ${tabBtn(activa, 'c/mapa', 'mapa', 'Mapa')}
    ${tabBtn(activa, 'c/reservas', 'bolsa', 'Reservas', reservasActivas ? `<span class="punto">${reservasActivas}</span>` : '')}
    ${tabBtn(activa, 'c/perfil', 'usuario', 'Perfil')}
  </nav><button class="circulo-tab" data-go="c/buscar" aria-label="Buscar">${icon('buscar', 25)}</button>`;
}
export function tabsComercio(activa, porRetirar = 0) {
  const intel = tienePlan('intelligence');
  return `<nav class="tabs con-circulo" aria-label="Secciones"><span class="indicador"></span>
    ${tabBtn(activa, 'b/hoy', 'casa', 'Hoy')}
    ${tabBtn(activa, 'b/retiros', 'qr', 'Retiros', porRetirar ? `<span class="punto">${porRetirar}</span>` : '')}
    ${intel ? tabBtn(activa, 'b/intel', 'chispa', 'Intelligence', '', 'Intel') : tabBtn(activa, 'b/impacto', 'grafico', 'Impacto')}
    ${tabBtn(activa, 'b/cuenta', 'local', 'Cuenta')}
  </nav><button class="circulo-tab verde" data-go="b/camara" aria-label="Publicar con una foto">${icon('camara', 27)}</button>`;
}

export function ordenPestanas(rol) {
  return rol === 'comercio' ? ['b/hoy', 'b/retiros', tienePlan('intelligence') ? 'b/intel' : 'b/impacto', 'b/cuenta'] : ['c/inicio', 'c/mapa', 'c/reservas', 'c/perfil'];
}

// ---------- ruedita de carga, estilo iOS ----------
export const spinner = (extra = '') => `<span class="spinner ${extra}" role="progressbar" aria-label="Cargando">${'<i></i>'.repeat(12)}</span>`;

// cartel de "cargando" sobre toda la pantalla; devuelve cómo cerrarlo o marcarlo listo
export function cargando(texto = 'Cargando…') {
  const el = document.createElement('div');
  el.className = 'cargando';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="caja">${spinner('grande')}<span>${esc(texto)}</span></div>`;
  document.getElementById('app').appendChild(el);
  return {
    texto: t => { el.querySelector('span').textContent = t; },
    listo: t => {
      el.classList.add('listo');
      el.querySelector('.caja').insertAdjacentHTML('afterbegin', `<span class="tilde">${icon('check', 32)}</span>`);
      if (t) el.querySelector('span:last-child').textContent = t;
    },
    cerrar: () => { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 220); },
  };
}

// números que suben de 0 al valor cuando aparecen (data-contar="valor" data-fmt="plata|num|dec|pct")
export function animarNumeros(root, fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-contar]').forEach(el => {
    const fin = parseFloat(el.dataset.contar), tipo = el.dataset.fmt || 'num';
    if (!isFinite(fin) || fin === 0) return;
    const t0 = performance.now(), dur = 700;
    const paso = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt[tipo](fin * e);
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

// carrusel: avanza solo cada 4,5 s, se frena mientras el dedo está encima, actualiza los puntos
export function carrusel(root) {
  const pista = root.querySelector('.pista'), puntos = [...root.querySelectorAll('.puntos i')];
  if (!pista || !pista.children.length) return () => {};
  const n = pista.children.length;
  let i = 0, pausa = false, auto = false, t = null, tAuto = null, tSoltar = null;
  const ancho = () => pista.children[0].getBoundingClientRect().width + 12;
  const marcar = k => puntos.forEach((p, j) => p.classList.toggle('on', j === k));
  const ir = k => {
    i = (k + n) % n; marcar(i);
    auto = true; clearTimeout(tAuto); tAuto = setTimeout(() => { auto = false; }, 900); // el scroll animado no cuenta como gesto
    pista.scrollTo({ left: i * ancho(), behavior: 'smooth' });
  };
  const tic = () => { t = setTimeout(() => { if (!pausa && document.visibilityState === 'visible' && pista.isConnected) ir(i + 1); tic(); }, 4500); };
  const leer = () => { if (auto) return; const k = Math.round(pista.scrollLeft / ancho()); if (k !== i && k >= 0 && k < n) { i = k; marcar(i); } };
  pista.addEventListener('scroll', () => { clearTimeout(pista._fin); pista._fin = setTimeout(leer, 90); }, { passive: true });
  const tocar = () => { pausa = true; auto = false; clearTimeout(tSoltar); };
  const soltar = () => { clearTimeout(tSoltar); tSoltar = setTimeout(() => { pausa = false; }, 3000); };
  pista.addEventListener('touchstart', tocar, { passive: true });
  pista.addEventListener('pointerdown', tocar, { passive: true });
  pista.addEventListener('touchend', soltar, { passive: true });
  pista.addEventListener('pointerup', soltar, { passive: true });
  marcar(0); tic();
  return () => { clearTimeout(t); clearTimeout(tAuto); clearTimeout(tSoltar); };
}

// ---------- gráfico de barras ----------
export function barras(valores, labels, { destacar = -1, fmt = v => v, alto = 120, warn = false, mostrar = true } = {}) {
  const max = Math.max(...valores, 0.0001);
  return `<div class="barras" style="height:${alto}px">${valores.map((v, i) => `
    <div class="b${i === destacar ? (warn ? ' warn' : ' hi') : ''}">
      ${mostrar ? `<em>${esc(fmt(v))}</em>` : ''}
      <i style="height:${Math.max(3, v / max * (alto - 44))}px;animation-delay:${i * 40}ms"></i>
      <span>${esc(labels[i])}</span>
    </div>`).join('')}</div>`;
}

export function vacio(ic, titulo, texto, boton = '') {
  return `<div class="vacio"><div class="circ">${icon(ic, 30)}</div><h3>${esc(titulo)}</h3><p class="chico">${esc(texto)}</p>${boton}</div>`;
}

export const badgeConfianza = c => ({ alta: '<span class="badge">Confianza alta</span>', media: '<span class="badge gris">Confianza media</span>', baja: '<span class="badge horno">Confianza baja</span>' })[c];
export const badgeDato = medido => medido
  ? `<span class="badge">${icon('balanza', 14)} Pesado con balanza</span>`
  : `<span class="badge gris">${icon('camara', 14)} Estimado por foto</span>`;

export function nota(texto, ic = 'info', tipo = '') {
  return `<div class="nota ${tipo}">${icon(ic, 18)}<span>${texto}</span></div>`;
}

// botón "Demo" del modo cliente: abre el menú para pasar al modo local, cambiar de zona o reiniciar
export function demoBtnCliente(sobreMapa = false) {
  return `<button class="demo-pill${sobreMapa ? ' sobre-mapa' : ''}" data-act="menu-demo-cliente" aria-label="Opciones de la demo">Demo${icon('abajo', 16)}</button>`;
}

export function demoPill() {
  const n = { basico: 'Básico', smart: 'Smart', intelligence: 'Intelligence' }[S.plan];
  return `<button class="demo-pill" data-act="elegir-plan-demo" aria-label="Demo, plan ${n}. Cambiar el plan">Demo<span class="demo-plan">&nbsp;· ${n}</span>${icon('abajo', 16)}</button>`;
}

// ---------- hojas, avisos, confirmaciones (se montan sobre #app) ----------
let hojaActual = null;
export function abrirHoja(html, { alCerrar } = {}) {
  cerrarHoja(true);
  const app = document.getElementById('app');
  const velo = document.createElement('div');
  velo.className = 'velo';
  const hoja = document.createElement('div');
  hoja.className = 'hoja';
  hoja.setAttribute('role', 'dialog');
  hoja.setAttribute('aria-modal', 'true');
  hoja.innerHTML = `<div class="asa"></div><div class="contenido">${html}</div>`;
  velo.addEventListener('click', () => cerrarHoja());
  app.append(velo, hoja);
  hojaActual = { velo, hoja, alCerrar };
  // terminada la entrada se saca la animación, así el arrastre y el cierre parten de donde está
  const listo = e => { if (e.target !== hoja) return; hoja.removeEventListener('animationend', listo); if (!hoja.classList.contains('cierra')) hoja.style.animation = 'none'; };
  hoja.addEventListener('animationend', listo);
  velo.addEventListener('animationend', () => { velo.style.animation = 'none'; }, { once: true });
  arrastrarParaCerrar(hoja, velo);
  const primero = hoja.querySelector('button, input, select');
  if (primero && !matchMedia('(pointer:coarse)').matches) primero.focus();
  nav.hojaAbierta?.();
  return hoja;
}
// se cierra tirando para abajo: desde la manija o desde el contenido cuando ya está arriba de todo
function arrastrarParaCerrar(hoja, velo) {
  const cont = hoja.querySelector('.contenido');
  let y0 = null, x0 = 0, dy = 0, t0 = 0, activo = false;
  const empezar = (x, y, t) => { y0 = y; x0 = x; dy = 0; t0 = t; activo = false; };
  const mover = (x, y) => {
    const d = y - y0;
    if (!activo) {
      if (d < -4 || Math.abs(x - x0) > Math.abs(d)) { y0 = null; return false; }
      if (d < 8 || cont.scrollTop > 0) return false;
      activo = true; hoja.style.animation = 'none'; hoja.style.transition = 'none'; velo.style.animation = 'none'; velo.style.transition = 'none';
    }
    dy = Math.max(0, d);
    hoja.style.transform = `translate3d(0,${dy}px,0)`;
    velo.style.opacity = String(1 - Math.min(1, dy / hoja.offsetHeight) * .9);
    return true;
  };
  const soltar = t => {
    if (y0 == null) return;
    y0 = null;
    if (!activo) return;
    activo = false;
    const v = dy / Math.max(1, t - t0);
    if (dy > Math.min(130, hoja.offsetHeight * .3) || (v > .5 && dy > 30)) cerrarHoja();
    else { hoja.style.transition = 'transform .26s cubic-bezier(.2,.8,.2,1)'; hoja.style.transform = ''; velo.style.transition = 'opacity .26s'; velo.style.opacity = ''; }
  };
  hoja.addEventListener('touchstart', e => {
    if (e.touches.length > 1 || e.target.closest('input[type=range],textarea,.chips.scroll,.carril')) return;
    if (cont.contains(e.target) && cont.scrollTop > 0) return;
    empezar(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp);
  }, { passive: true });
  hoja.addEventListener('touchmove', e => { if (y0 != null && mover(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault(); }, { passive: false });
  hoja.addEventListener('touchend', e => soltar(e.timeStamp));
  hoja.addEventListener('touchcancel', e => soltar(e.timeStamp));
  // con mouse, desde la manija
  const asa = hoja.querySelector('.asa');
  asa.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; empezar(e.clientX, e.clientY, e.timeStamp); asa.setPointerCapture(e.pointerId); });
  asa.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && y0 != null) mover(x0, e.clientY); });
  asa.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') soltar(e.timeStamp); });
}
export function cerrarHoja(inmediato) {
  if (!hojaActual) return;
  const { velo, hoja, alCerrar } = hojaActual;
  hojaActual = null;
  if (inmediato) { velo.remove(); hoja.remove(); }
  else {
    hoja.style.animation = ''; hoja.style.transition = '';
    hoja.classList.add('cierra'); velo.style.animation = 'none'; velo.style.transition = 'opacity .2s'; velo.style.opacity = '0';
    setTimeout(() => { velo.remove(); hoja.remove(); }, 240);
  }
  alCerrar && alCerrar();
  nav.hojaCerrada?.();
}
export const hojaAbierta = () => !!hojaActual;

let toastT = null;
export function toast(msg, { ic = 'check', accion = null, sinTabs = false, ms = 3800 } = {}) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (sinTabs || !document.querySelector('#barra-tabs:not(.oculta) .tabs') ? ' sin-tabs' : '');
  t.setAttribute('role', 'status');
  t.innerHTML = `${icon(ic, 20)}<span>${msg}</span>${accion ? `<button data-act="${accion.act}"${accion.id ? ` data-id="${esc(accion.id)}"` : ''}>${esc(accion.txt)}</button>` : ''}`;
  document.getElementById('app').append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, ms);
}

export function confirmar({ titulo, texto, si = 'Confirmar', no = 'Cancelar', peligro = false }) {
  return new Promise(ok => {
    const h = abrirHoja(`
      <h2>${esc(titulo)}</h2>
      ${texto ? `<p class="chico">${esc(texto)}</p>` : ''}
      <div class="pila">
        <button class="btn bloque${peligro ? ' peligro' : ''}" data-r="1">${esc(si)}</button>
        <button class="btn bloque gris" data-r="0">${esc(no)}</button>
      </div>`, { alCerrar: () => ok(false) });
    h.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.r === '1';
      hojaActual && (hojaActual.alCerrar = null);
      cerrarHoja();
      ok(r);
    }));
  });
}
