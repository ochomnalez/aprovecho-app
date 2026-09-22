// Instalación en la pantalla de inicio y funcionamiento sin internet.
import { icon } from './icons.js';

let promptInstalar = null;
let alCambiar = () => {};

export const esStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esSafariIOS = () => esIOS() && !/crios|fxios|edgios/i.test(navigator.userAgent);

export function iniciarPwa(render) {
  alCambiar = render;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; alCambiar(); });
  window.addEventListener('appinstalled', () => { promptInstalar = null; alCambiar(); });
  // en localhost no se registra (salvo con ?sw), así desarrollar no sirve archivos viejos
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw\b/.test(location.search);
  if ('serviceWorker' in navigator && window.isSecureContext && !local) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

export async function instalar() {
  if (!promptInstalar) return false;
  promptInstalar.prompt();
  const r = await promptInstalar.userChoice;
  promptInstalar = null;
  alCambiar();
  return r.outcome === 'accepted';
}

// Bloque que se muestra en la bienvenida y en el perfil. Tres casos:
// ya instalada (nada) · Android/Chrome (botón nativo) · iPhone (explicar el gesto)
export function instalarUI(enPerfil = false) {
  if (esStandalone()) return '';
  if (promptInstalar) {
    return `<button class="btn bloque sec" data-act="instalar">${icon('instalar', 20)} Instalar la app en el celu</button>`;
  }
  if (esIOS()) {
    return `<div class="nota" style="align-items:center">${icon('instalar', 20)}<span>${esSafariIOS()
      ? 'Para tenerla como app: tocá <b>Compartir</b> <span aria-hidden="true">⎋</span> abajo y después <b>Agregar a inicio</b>.'
      : 'Para instalarla, abrí este link en <b>Safari</b> y usá <b>Compartir → Agregar a inicio</b>.'}</span></div>`;
  }
  return enPerfil ? '' : '';
}
