// QR real y escaneable. El QR lleva los datos de la reserva, así un celu puede
// validar una reserva hecha en otro celu aunque la demo no tenga servidor.
import { cargarScript } from './util.js';

export const QR_JS = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
export const JSQR_JS = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

export function payload(res, pack, comercio) {
  return ['APV2', res.code, pack.id, comercio.id, pack.tam, pack.cat, res.cliente || 'Cliente', res.dia, comercio.nombre].join('|');
}
export function leerPayload(txt) {
  const p = String(txt || '').split('|');
  if (p[0] !== 'APV2' || p.length < 9) return null;
  return { code: p[1], packId: p[2], comercioId: p[3], tam: p[4], cat: p[5], cliente: p[6], dia: p[7], comercio: p[8] };
}

export async function qrSvg(texto) {
  const qrcode = await cargarScript(QR_JS, 'qrcode');
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount(), m = 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges" role="img" aria-label="Código QR de la reserva"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#17231A"/></svg>`;
}

// ---------- escáner ----------
let flujo = null, activo = false;
export async function escanear(video, alLeer) {
  flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  video.srcObject = flujo;
  video.setAttribute('playsinline', '');
  await video.play();
  activo = true;
  let detector = null;
  if ('BarcodeDetector' in window) {
    try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
  }
  let jsQR = null;
  if (!detector) jsQR = await cargarScript(JSQR_JS, 'jsQR');
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  const vuelta = async () => {
    if (!activo) return;
    try {
      if (video.readyState >= 2) {
        if (detector) {
          const r = await detector.detect(video);
          if (r.length) { detener(); alLeer(r[0].rawValue); return; }
        } else {
          const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * (w / video.videoWidth));
          lienzo.width = w; lienzo.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const r = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (r) { detener(); alLeer(r.data); return; }
        }
      }
    } catch (e) { /* cuadro salteado */ }
    setTimeout(vuelta, 160);
  };
  vuelta();
}
export function detener() {
  activo = false;
  if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; }
}
