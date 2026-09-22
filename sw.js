/* Service worker de APROVECHO v2.
   - La app, las librerías y las tipografías se guardan al instalar: abre sin internet.
   - Las calles del mapa que ya viste quedan guardadas (hasta 500 teselas).
   Al cambiar cualquier archivo, subí VERSION: invalida el cache viejo en los celus. */

const VERSION = 'aprovecho-v3-3.1.0';
const TESELAS = 'aprovecho-v3-teselas';
const FUENTES = 'aprovecho-v3-fuentes';

const LOCALES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/nav.js', './js/util.js', './js/icons.js', './js/store.js', './js/data.js',
  './js/fotos.js', './js/intel.js', './js/ui.js', './js/mapa.js', './js/qr.js', './js/export.js',
  './js/pwa.js', './js/cliente.js', './js/comercio.js', './js/intelui.js', './js/ilus.js',
  './img/aprovecho-isotipo.svg', './img/aprovecho-isotipo-blanco.svg', './img/aprovecho-logo.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-64.png', './icons/favicon.svg',
];
const LIBRERIAS = [
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCALES);
    // las librerías de CDN no deben trabar la instalación si alguna falla
    await Promise.all(LIBRERIAS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    // borra solo lo suyo: versiones viejas de la v3 y las cachés de la v2 que vivía en esta misma dirección.
    // No toca 'aprovecho-v2-archivo-*', que es la v2 guardada en su propio link.
    const propia = k => k.startsWith('aprovecho-v3-') || /^aprovecho-v2\.\d/.test(k) || k === 'aprovecho-teselas' || k === 'aprovecho-fuentes';
    await Promise.all(claves.filter(k => propia(k) && k !== VERSION && k !== TESELAS && k !== FUENTES).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function recortar(nombre, max) {
  const c = await caches.open(nombre);
  const k = await c.keys();
  if (k.length > max) await Promise.all(k.slice(0, k.length - max).map(r => c.delete(r)));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // navegación: la app de la cache, así abre sin señal
  if (req.mode === 'navigate' && url.origin === location.origin) {
    // solo se guarda como index lo que es la raíz de esta app (nunca otra página del mismo dominio)
    const raiz = new URL('./', self.registration.scope).pathname;
    const esLaApp = url.pathname === raiz || url.pathname === raiz + 'index.html';
    if (!esLaApp) return;
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copia)); } return r; })
      .catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }

  // teselas del mapa: cache primero
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TESELAS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r.ok || r.type === 'opaque') { c.put(req, r.clone()); recortar(TESELAS, 500); }
        return r;
      } catch (err) { return new Response('', { status: 504 }); }
    }));
    return;
  }

  // tipografías: la de la cache y se actualiza de fondo
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FUENTES).then(async c => {
      const hit = await c.match(req);
      const red = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || red;
    }));
    return;
  }

  // archivos propios y librerías: cache primero, se refresca de fondo
  if (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req, { ignoreSearch: url.origin === location.origin }).then(hit => {
      const red = fetch(req).then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => hit);
      return hit || red;
    }));
  }
});
