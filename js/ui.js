// Componentes de interfaz compartidos.
import { icon } from './icons.js';
import { esc } from './util.js';
import { S, tienePlan } from './store.js';

// ---------- barra superior ----------
export function barra({ titulo = '', atras = true, accion = '', borde = false, centro = false, cerrar = false } = {}) {
  const izq = atras ? `<button class="icbtn" data-act="atras" aria-label="${cerrar ? 'Cerrar' : 'Volver'}">${icon(cerrar ? 'x' : 'atras', 24)}</button>` : '';
  return `<header class="barra${borde ? ' borde' : ''}">${izq}<div class="titulo${centro ? ' centro' : ''}">${esc(titulo)}</div>${accion || (atras && centro ? '<span style="width:42px"></span>' : '')}</header>`;
}

// ---------- pestañas ----------
export function tabsCliente(activa, reservasActivas = 0) {
  const t = (id, ic, txt, extra = '') => `<button class="tab${activa === id ? ' on' : ''}" data-tab="${id}">${icon(ic, 24)}<span>${txt}</span>${extra}</button>`;
  return `<nav class="tabs" aria-label="Secciones">
    ${t('c/mapa', 'mapa', 'Explorar')}
    ${t('c/reservas', 'bolsa', 'Reservas', reservasActivas ? `<span class="punto">${reservasActivas}</span>` : '')}
    ${t('c/perfil', 'usuario', 'Perfil')}
  </nav>`;
}
export function tabsComercio(activa, porRetirar = 0) {
  const t = (id, ic, txt, extra = '') => `<button class="tab${activa === id ? ' on' : ''}" data-tab="${id}">${icon(ic, 24)}<span>${txt}</span>${extra}</button>`;
  const intel = tienePlan('intelligence');
  return `<nav class="tabs" aria-label="Secciones">
    ${t('b/hoy', 'casa', 'Hoy')}
    ${t('b/retiros', 'qr', 'Retiros', porRetirar ? `<span class="punto">${porRetirar}</span>` : '')}
    <button class="tab central" data-go="b/camara" aria-label="Publicar con una foto"><span class="bola">${icon('camara', 26)}</span><span>Publicar</span></button>
    ${intel ? t('b/intel', 'chispa', 'Intelligence') : t('b/impacto', 'grafico', 'Impacto')}
    ${t('b/cuenta', 'local', 'Cuenta')}
  </nav>`;
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

export function demoPill() {
  const n = { basico: 'Básico', smart: 'Smart', intelligence: 'Intelligence' }[S.plan];
  return `<button class="demo-pill" data-act="elegir-plan-demo" aria-label="Cambiar el plan de la demo">Demo · ${n}${icon('abajo', 16)}</button>`;
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
  // arrastrar hacia abajo para cerrar
  let y0 = null;
  hoja.querySelector('.asa').addEventListener('pointerdown', e => { y0 = e.clientY; hoja.setPointerCapture(e.pointerId); });
  hoja.addEventListener('pointermove', e => { if (y0 != null) { const dy = Math.max(0, e.clientY - y0); hoja.style.transform = `translateY(${dy}px)`; } });
  hoja.addEventListener('pointerup', e => { if (y0 != null) { const dy = e.clientY - y0; y0 = null; hoja.style.transform = ''; if (dy > 90) cerrarHoja(); } });
  const primero = hoja.querySelector('button, input, select');
  if (primero && !matchMedia('(pointer:coarse)').matches) primero.focus();
  return hoja;
}
export function cerrarHoja(inmediato) {
  if (!hojaActual) return;
  const { velo, hoja, alCerrar } = hojaActual;
  hojaActual = null;
  if (inmediato) { velo.remove(); hoja.remove(); }
  else { hoja.classList.add('cierra'); velo.style.opacity = '0'; velo.style.transition = 'opacity .2s'; setTimeout(() => { velo.remove(); hoja.remove(); }, 240); }
  alCerrar && alCerrar();
}
export const hojaAbierta = () => !!hojaActual;

let toastT = null;
export function toast(msg, { ic = 'check', accion = null, sinTabs = false, ms = 3800 } = {}) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (sinTabs || !document.querySelector('.pantalla.actual .tabs, #app > .tabs') ? ' sin-tabs' : '');
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
