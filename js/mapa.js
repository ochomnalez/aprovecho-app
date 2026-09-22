// Mapa real con Leaflet + teselas de OpenStreetMap (sin clave; se cachean solo las que se ven).
// La instancia se crea una sola vez y se reubica en cada render, así no se recargan
// las teselas cada vez que el usuario vuelve a la pestaña.
import { cargarScript, cargarCss, esc, plata } from './util.js';

export const LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
export const LEAFLET_CSS = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

let L = null, mapa = null, caja = null, capa = null, marcaVos = null, pines = {}, alTocar = null;

export async function montarMapa(slot, { centro, comercios, seleccionado, onPin, onMover }) {
  cargarCss(LEAFLET_CSS);
  L = await cargarScript(LEAFLET_JS, 'L');
  alTocar = onPin;
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'mapa-caja';
    slot.appendChild(caja);
    mapa = L.map(caja, { zoomControl: false, attributionControl: true, tap: true, zoomSnap: .5 });
    // encuadra de entrada tu ubicación y los locales (sin pasar antes por otro zoom), dejando libre lo que tapa la hoja
    if (comercios.length) {
      const b = L.latLngBounds([[centro.lat, centro.lng], ...comercios.map(c => [c.lat, c.lng])]);
      mapa.fitBounds(b, { paddingTopLeft: [28, 150], paddingBottomRight: [28, Math.round(slot.clientHeight * .46) + 28], maxZoom: 16, animate: false });
    } else mapa.setView([centro.lat, centro.lng], 15);
    L.tileLayer(TESELAS, {
      maxZoom: 19, crossOrigin: true,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapa);
    mapa.attributionControl.setPrefix(false);
    capa = L.layerGroup().addTo(mapa);
    mapa.on('click', () => onMover && onMover(null));
  } else {
    slot.appendChild(caja);
    requestAnimationFrame(() => mapa.invalidateSize());
  }
  ponerVos(centro);
  ponerPines(comercios, seleccionado);
  return mapa;
}

// para la vista previa al deslizar hacia el mapa: se muestra el mismo mapa ya cargado
export function prestarMapa(slot) {
  if (!caja || !slot) return false;
  slot.appendChild(caja);
  return true;
}

function ponerVos(c) {
  const ic = L.divIcon({ className: '', html: '<div class="pin-vos" aria-label="Vos"></div>', iconSize: [0, 0] });
  if (marcaVos) marcaVos.setLatLng([c.lat, c.lng]);
  else marcaVos = L.marker([c.lat, c.lng], { icon: ic, interactive: false, zIndexOffset: -100 }).addTo(mapa);
}

export function ponerPines(comercios, seleccionado) {
  if (!mapa) return;
  capa.clearLayers();
  pines = {};
  for (const c of comercios) {
    const html = `<button class="pin-precio${c.id === seleccionado ? ' sel' : ''}${c.agotado ? ' agotado' : ''}" aria-label="${esc(c.nombre)}">${c.agotado ? 'Agotado' : plata(c.desde)}</button>`;
    const m = L.marker([c.lat, c.lng], {
      icon: L.divIcon({ className: '', html, iconSize: [0, 0] }),
      zIndexOffset: c.id === seleccionado ? 1000 : 0, keyboard: true, title: c.nombre,
    });
    m.on('click', e => { L.DomEvent.stopPropagation(e); alTocar && alTocar(c.id); });
    m.addTo(capa);
    pines[c.id] = m;
  }
}

export function enfocar(c, zoom) {
  if (mapa && c) mapa.flyTo([c.lat, c.lng], zoom || Math.max(mapa.getZoom(), 15), { duration: .6 });
}
export const hayMapa = () => !!mapa;
