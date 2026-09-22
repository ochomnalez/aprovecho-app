// Utilidades compartidas. Sin dependencias.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

// ---------- números en formato argentino ----------
const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const plata = n => '$' + nf0.format(Math.round(n));
export const num = n => nf0.format(Math.round(n));
export const dec = n => nf1.format(n);
export const kg = n => (n >= 10 ? nf0.format(n) : nf1.format(n)) + ' kg';
export const gramos = g => (g >= 1000 ? dec(g / 1000) + ' kg' : nf0.format(g) + ' g');
export const pct = n => nf0.format(Math.round(n * 100)) + '%';
export const pct1 = n => nf1.format(n * 100) + '%';
export const redondear100 = n => Math.max(100, Math.round(n / 100) * 100);

// ---------- fechas ----------
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTO = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const pad = n => String(n).padStart(2, '0');
export const hhmm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const isoDia = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const ddmm = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
export const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ---------- azar reproducible ----------
export function rng(seed) {
  let a = typeof seed === 'number' ? seed : hash(seed);
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- geo ----------
export function distanciaM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const distTxt = m => (m < 1000 ? Math.round(m / 10) * 10 + ' m' : dec(m / 1000) + ' km');
export function desplazar(p, metros, rumboGrados) {
  const r = Math.PI / 180, R = 6371000;
  const d = metros / R, th = rumboGrados * r, la = p.lat * r, lo = p.lng * r;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(th));
  const lo2 = lo + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / r, lng: lo2 / r };
}

// ---------- ids ----------
export const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const codigo = () => Array.from({ length: 4 }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join('');

// ---------- scripts de CDN, cargados una sola vez ----------
const cargados = {};
export function cargarScript(url, global) {
  if (global && window[global]) return Promise.resolve(window[global]);
  if (!cargados[url]) {
    cargados[url] = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = url; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => ok(global ? window[global] : true);
      s.onerror = () => { delete cargados[url]; ko(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }
  return cargados[url];
}
export function cargarCss(url) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = url; l.crossOrigin = 'anonymous';
  document.head.appendChild(l);
}

export const vibrar = (ms = 10) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* no soportado */ } };
export const esperar = ms => new Promise(r => setTimeout(r, ms));
export const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
