// Fotos de muestra: ilustraciones vectoriales de excedentes típicos, vistas desde arriba.
// Todas en un viewBox 400×300. Las "cajas" son lo que la IA simulada detecta, en las
// mismas coordenadas, así los recuadros caen exactamente sobre cada pieza.

const W = 400, H = 300;

const defs = `
<defs>
  <linearGradient id="fMadera" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8D3B0"/><stop offset="1" stop-color="#D9BF94"/></linearGradient>
  <linearGradient id="fBandeja" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A5158"/><stop offset="1" stop-color="#383E44"/></linearGradient>
  <radialGradient id="fDorado" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#EDB661"/><stop offset=".6" stop-color="#D38E3A"/><stop offset="1" stop-color="#A9652A"/></radialGradient>
  <radialGradient id="fDorado2" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#E7C27E"/><stop offset=".7" stop-color="#CF9A4F"/><stop offset="1" stop-color="#AE7536"/></radialGradient>
  <radialGradient id="fPan" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#D59A55"/><stop offset=".65" stop-color="#B57434"/><stop offset="1" stop-color="#8C5424"/></radialGradient>
  <radialGradient id="fChoco" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#6A3B24"/><stop offset="1" stop-color="#3C1F12"/></radialGradient>
  <filter id="fSombra" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".28"/></filter>
</defs>`;

function fondoMadera() {
  let vetas = '';
  for (let i = 0; i < 9; i++) {
    const y = 18 + i * 34;
    vetas += `<path d="M0 ${y}C120 ${y - 8} 260 ${y + 10} 400 ${y - 4}" stroke="#CDAE7E" stroke-width="1.4" fill="none" opacity=".55"/>`;
  }
  return `<rect width="${W}" height="${H}" fill="url(#fMadera)"/>${vetas}`;
}
const bandeja = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#fBandeja)" filter="url(#fSombra)"/>` +
  `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="10" fill="none" stroke="#5A626A" stroke-width="2"/>`;
const papel = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#F7F1E6" filter="url(#fSombra)"/>`;

// ---------- piezas ----------
function medialuna(cx, cy, rot, escala = 1, grad = 'fDorado') {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${escala})" filter="url(#fSombra)">
    <path d="M-30 8C-26 -16 26 -16 30 8C24 2 16 -3 0 -3C-16 -3 -24 2 -30 8Z" fill="url(#${grad})"/>
    <path d="M-30 8C-27 2 -22 -2 -17 -4M-12 -12C-8 -6 -8 -2 -9 -3M0 -14V-3M12 -12C8 -6 8 -2 9 -3M30 8C27 2 22 -2 17 -4" stroke="#8E5222" stroke-width="1.6" fill="none" opacity=".55"/>
    <path d="M-16 -9C-6 -14 6 -14 16 -9" stroke="#F7D48F" stroke-width="2.2" fill="none" opacity=".7" stroke-linecap="round"/>
  </g>`;
}
function sandwich(cx, cy, rot) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#fSombra)">
    <path d="M-26 -18H26V18H-26Z" fill="#FBF6EA"/>
    <path d="M-26 18H26L24 22H-24Z" fill="#E9C995"/>
    <path d="M-24 14H24" stroke="#E9A3A0" stroke-width="3"/>
    <path d="M-24 10H24" stroke="#F4D46A" stroke-width="2.5"/>
    <path d="M-26 -18H26V18H-26Z" fill="none" stroke="#E4CFA6" stroke-width="2"/>
  </g>`;
}
function empanada(cx, cy, rot) {
  let repulgue = '';
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const x = Math.cos(a) * 30, y = Math.sin(a) * 22;
    repulgue += `<circle cx="${(x * 1.02).toFixed(1)}" cy="${(y * 1.02).toFixed(1)}" r="4.2" fill="#C98A3E"/>`;
  }
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#fSombra)">
    <path d="M-32 6A32 24 0 0 1 32 6Z" fill="url(#fDorado2)"/>${repulgue}
    <path d="M-14 -6C-6 -11 6 -11 14 -6" stroke="#F3D59B" stroke-width="2" fill="none" opacity=".8" stroke-linecap="round"/>
  </g>`;
}
function bolaFraile(cx, cy) {
  let azucar = '';
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, r = 5 + (i % 4) * 3;
    azucar += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="1.3" fill="#FFF8EC"/>`;
  }
  return `<g transform="translate(${cx} ${cy})" filter="url(#fSombra)"><circle r="19" fill="url(#fDorado2)"/>${azucar}</g>`;
}
function vigilante(cx, cy, rot) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#fSombra)">
    <rect x="-30" y="-10" width="60" height="20" rx="8" fill="url(#fDorado)"/>
    <rect x="-24" y="-4" width="48" height="8" rx="4" fill="#9C5A2A"/>
    <path d="M-22 0H22" stroke="#C07A3C" stroke-width="2" opacity=".8"/>
  </g>`;
}
function panCampo(cx, cy, r, rot) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#fSombra)">
    <ellipse rx="${r}" ry="${r * .9}" fill="url(#fPan)"/>
    <path d="M${-r * .55} ${-r * .15}L${r * .55} ${r * .15}M${-r * .15} ${-r * .55}L${r * .15} ${r * .55}" stroke="#E7C089" stroke-width="5" stroke-linecap="round"/>
    <ellipse rx="${r * .7}" ry="${r * .6}" fill="#FFF" opacity=".10"/>
  </g>`;
}

// ---------- composiciones ----------
function fotoMedialunas() {
  let piezas = '', cajas = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) {
    const cx = 92 + c * 72 + (f % 2 ? 10 : 0), cy = 82 + f * 70, rot = (c * 17 + f * 23) % 30 - 15;
    piezas += medialuna(cx, cy, rot);
    cajas.push({ x: cx - 36, y: cy - 22, w: 72, h: 38 });
  }
  return { svg: fondoMadera() + bandeja(32, 30, 336, 240) + piezas, cajas };
}
function fotoMedialunasGrasa() {
  let piezas = '', cajas = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) {
    const cx = 88 + c * 74, cy = 82 + f * 70, rot = (c * 11 + f * 19) % 16 - 8;
    piezas += medialuna(cx, cy, rot, .92, 'fDorado2');
    cajas.push({ x: cx - 34, y: cy - 20, w: 68, h: 36 });
  }
  return { svg: fondoMadera() + papel(34, 30, 332, 240) + piezas, cajas };
}
function fotoSandwiches() {
  let piezas = '', cajas = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 6; c++) {
    const cx = 62 + c * 55, cy = 80 + f * 72, rot = (c + f) % 2 ? 4 : -4;
    piezas += sandwich(cx, cy, rot);
    cajas.push({ x: cx - 29, y: cy - 22, w: 58, h: 46 });
  }
  return { svg: fondoMadera() + papel(24, 36, 352, 232) + piezas, cajas };
}
function fotoTorta() {
  let porciones = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    porciones += `<path d="M0 0L${(Math.cos(a) * 104).toFixed(1)} ${(Math.sin(a) * 104).toFixed(1)}" stroke="#2A140B" stroke-width="2.4"/>`;
  }
  let virutas = '';
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39, r = 18 + (i * 7) % 78;
    virutas += `<rect x="${(Math.cos(a) * r).toFixed(1)}" y="${(Math.sin(a) * r).toFixed(1)}" width="6" height="2.4" rx="1" fill="#C98B5A" transform="rotate(${(i * 37) % 180} ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)})"/>`;
  }
  // faltan dos porciones: quedan 6
  const svg = fondoMadera() +
    `<g transform="translate(200 152)"><circle r="132" fill="#FAFAF7" filter="url(#fSombra)"/><circle r="120" fill="none" stroke="#ECEBE4" stroke-width="3"/>
     <path d="M0 0L104 0A104 104 0 1 1 0 -104Z" fill="url(#fChoco)"/>
     <path d="M0 0L104 0A104 104 0 1 1 0 -104Z" fill="none" stroke="#2A140B" stroke-width="3"/>
     <g clip-path="none">${porciones}</g>${virutas}
     <circle r="10" fill="#4A2616"/></g>`;
  return { svg, cajas: [{ x: 90, y: 42, w: 218, h: 218 }] };
}
function fotoEmpanadas() {
  let piezas = '', cajas = [];
  for (let f = 0; f < 2; f++) for (let c = 0; c < 5; c++) {
    const cx = 72 + c * 64, cy = 112 + f * 88, rot = f ? 180 : 0;
    piezas += empanada(cx, cy, rot + ((c % 2) ? 6 : -6));
    cajas.push({ x: cx - 34, y: cy - (f ? 10 : 26), w: 68, h: 38 });
  }
  return { svg: fondoMadera() + bandeja(26, 44, 348, 220) + piezas, cajas };
}
function fotoFacturas() {
  let piezas = '';
  const items = [
    ['m', 82, 84, -10], ['b', 158, 80], ['v', 238, 84, 12], ['m', 316, 86, 8],
    ['b', 88, 154], ['v', 168, 152, -8], ['m', 246, 156, -14], ['b', 318, 154],
    ['v', 86, 222, 6], ['m', 164, 224, 16], ['b', 240, 222], ['v', 316, 222, -10],
  ];
  for (const [t, x, y, r] of items) piezas += t === 'm' ? medialuna(x, y, r || 0, .85, 'fDorado2') : t === 'b' ? bolaFraile(x, y) : vigilante(x, y, r || 0);
  return { svg: fondoMadera() + papel(30, 34, 340, 236) + piezas, cajas: [{ x: 44, y: 50, w: 312, h: 206 }] };
}
function fotoPan() {
  return {
    svg: fondoMadera() + `<rect x="36" y="40" width="328" height="222" rx="18" fill="#C9A36E" filter="url(#fSombra)"/>` +
      `<rect x="44" y="48" width="312" height="206" rx="14" fill="none" stroke="#B48D58" stroke-width="3" stroke-dasharray="2 6"/>` +
      panCampo(136, 152, 76, -12) + panCampo(270, 150, 72, 20),
    cajas: [{ x: 56, y: 78, w: 162, h: 148 }, { x: 196, y: 80, w: 150, h: 142 }],
  };
}

const CATALOGO = {
  medialunas: { nombre: 'Medialunas', f: fotoMedialunas },
  grasa: { nombre: 'Medialunas de grasa', f: fotoMedialunasGrasa },
  sandwiches: { nombre: 'Sándwiches de miga', f: fotoSandwiches },
  torta: { nombre: 'Torta', f: fotoTorta },
  empanadas: { nombre: 'Empanadas', f: fotoEmpanadas },
  facturas: { nombre: 'Facturas surtidas', f: fotoFacturas },
  pan: { nombre: 'Pan de campo', f: fotoPan },
};
const cache = {};
export function foto(id) {
  if (!cache[id]) cache[id] = CATALOGO[id].f();
  return cache[id];
}
export function fotoSvg(id, extra = '') {
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ${extra}>${defs}${foto(id).svg}</svg>`;
}
export const MUESTRAS = ['medialunas', 'facturas', 'pan', 'sandwiches', 'empanadas', 'torta'];
export const nombreMuestra = id => CATALOGO[id]?.nombre || id;
// convierte una caja en coordenadas de la foto a porcentajes para posicionarla encima
export const cajaPct = c => `left:${(c.x / W * 100).toFixed(2)}%;top:${(c.y / H * 100).toFixed(2)}%;width:${(c.w / W * 100).toFixed(2)}%;height:${(c.h / H * 100).toFixed(2)}%`;

// Ilustración de "caja sorpresa" para el consumidor: se ve la categoría, no el contenido
export function cajaSorpresa(categoria, tam = 'chico') {
  const tono = { Panificados: '#E7C27E', Pastelería: '#E9B8A7', Sándwiches: '#EAD8A6', Viandas: '#D9C39A' }[categoria] || '#E7C27E';
  const s = tam === 'grande' ? 1.12 : tam === 'mediano' ? 1 : .88;
  return `<svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="160" fill="#F1F6EE"/>
    <circle cx="100" cy="80" r="62" fill="${tono}" opacity=".35"/>
    <g transform="translate(100 88) scale(${s})">
      <path d="M-52 -18 0 -40 52 -18 0 4Z" fill="#E0C79E"/>
      <path d="M-52 -18V30L0 52V4Z" fill="#C9A775"/>
      <path d="M52 -18V30L0 52V4Z" fill="#B8935F"/>
      <path d="M-52 -18 0 4 52 -18" fill="none" stroke="#A98452" stroke-width="2"/>
      <path d="M-26 -29 26 -7" stroke="#2F6B34" stroke-width="7" stroke-linecap="round"/>
      <circle cx="0" cy="-18" r="6" fill="#2F6B34"/>
    </g>
  </svg>`;
}
