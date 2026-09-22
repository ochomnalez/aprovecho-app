// Íconos de línea, 24×24, trazo 2. Se pintan con currentColor.
const P = {
  mapa: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4L15 6.5 9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
  bolsa: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  usuario: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.9 4-5.8 7.5-5.8s6.3 1.9 7.5 5.8"/>',
  casa: '<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
  camara: '<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4V8Z"/><circle cx="12" cy="13.2" r="3.6"/>',
  galeria: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.7"/><path d="m4 17 5-5 4 4 2.5-2.5L20 18"/>',
  balanza: '<path d="M3.5 6.5h17"/><path d="M12 6.5v3"/><rect x="4.5" y="9.5" width="15" height="10.5" rx="2.5"/><rect x="8.5" y="12.5" width="7" height="3.5" rx="1"/>',
  grafico: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3" height="5" rx=".6"/><rect x="12.5" y="8" width="3" height="9" rx=".6"/><rect x="17.5" y="10.5" width="2.5" height="6.5" rx=".6"/>',
  chispa: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.3l-1.9-5.5-5.6-1.9L10.1 9 12 3.5Z"/><path d="M19 3.5v3M17.5 5h3"/>',
  local: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M10 20v-4.5h4V20"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h2M20 14v2"/>',
  escanear: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>',
  bajar: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
  compartir: '<path d="M12 15V4"/><path d="m8 7.5 4-3.5 4 3.5"/><path d="M6 11v8.5h12V11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  atras: '<path d="M15 5 8 12l7 7"/>',
  adelante: '<path d="m9 5 7 7-7 7"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  filtros: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  ubicar: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="7"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  hoja: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-12.5 14"/><path d="M5 19 13 11"/>',
  basura: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="m6.5 7 .9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12"/>',
  caja: '<path d="M3.5 8 12 4l8.5 4v8.5L12 20.5 3.5 16.5V8Z"/><path d="M3.5 8 12 12l8.5-4M12 12v8.5"/>',
  estrella: '<path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2 7.2 18.8l1-5.4-4-3.7 5.4-.7L12 4Z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
  alerta: '<path d="M12 4 21 19.5H3L12 4Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>',
  refrescar: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>',
  salir: '<path d="M14 4.5H6.5v15H14"/><path d="M10.5 12h9.5M16.5 8.5 20 12l-3.5 3.5"/>',
  sube: '<path d="m4 16 5.5-5.5 4 4L20 8"/><path d="M15 8h5v5"/>',
  baja: '<path d="m4 8 5.5 5.5 4-4L20 16"/><path d="M15 16h5v-5"/>',
  sucursales: '<path d="M3.5 20.5h17"/><rect x="5" y="9" width="6" height="11.5"/><rect x="13" y="4" width="6" height="16.5"/><path d="M7.5 12.5h1M7.5 16h1M15.5 7.5h1M15.5 11h1M15.5 14.5h1"/>',
  enchufe: '<path d="M9 3.5V8M15 3.5V8"/><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0V8Z"/><path d="M12 16.5v4"/>',
  excel: '<path d="M6 3.5h8.5L19 8v12.5H6V3.5Z"/><path d="M14.5 3.5V8H19"/><path d="m9.5 12 4.5 5.5M14 12l-4.5 5.5"/>',
  pdf: '<path d="M6 3.5h8.5L19 8v12.5H6V3.5Z"/><path d="M14.5 3.5V8H19"/><path d="M9 17v-4.5h1.4a1.3 1.3 0 0 1 0 2.6H9"/>',
  tarjeta: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 14.5h3"/>',
  billetera: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11" rx="2"/><circle cx="16" cy="13.5" r="1.2" fill="currentColor"/>',
  ruta: '<circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="6.5" r="2"/><path d="M8.5 17.5h6a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H15.5"/>',
  instalar: '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M12 7.5v7M9 12l3 3 3-3"/>',
  editar: '<path d="M14.5 5.5 18.5 9.5 9 19H5v-4l9.5-9.5Z"/><path d="m13 7 4 4"/>',
  etiqueta: '<path d="M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5V4Z"/><circle cx="8.3" cy="8.3" r="1.4"/>',
  rayo: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12L13 3Z"/>',
  corazon: '<path d="M12 19.5s-7.5-4.4-7.5-10a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10Z"/>',
  pausa: '<path d="M9 5v14M15 5v14"/>',
  menu: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor"/>',
};

export function icon(nombre, tam = 22, extra = '') {
  return `<svg class="ic ${extra}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nombre] || ''}</svg>`;
}

// Isotipo de la marca en línea (mismo dibujo que marca/aprovecho-isotipo.svg)
export function isotipo(tam = 96) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 240 240" aria-hidden="true">${ISO}</svg>`;
}
export const ISO = '<path d="M90.76 215.63A100 100 0 0 1 106.08 20.97M149.24 24.37A100 100 0 0 1 150.9 215.11" fill="none" stroke="#2F6B34" stroke-width="11"/><path d="M104.17 7.36L131.31 20.64L108 34.59ZM155.15 228.18L126.11 219.81L146.65 202.03Z" fill="#2F6B34"/><path d="M62.51 96.77A62 62 0 0 1 105 59.84M149.11 65.26A62 62 0 0 1 181.4 128.63M172.58 152.85A62 62 0 0 1 93.8 176.19M61.74 141.21A62 62 0 0 1 58.04 117.84" fill="none" stroke="#2F6B34" stroke-width="6.5"/><path d="M103.04 51.96L119.8 58L106.97 67.73ZM90.36 183.55L81.14 168.31L97.23 168.83Z" fill="#2F6B34"/><circle cx="120" cy="120" r="44" fill="#91B06B"/><path d="M91 124C91 108 105 101 120 101C137 101 151 108 151 122C151 132 141 137 120 137C100 137 91 134 91 124Z" fill="#C8DCAF" stroke="#2F6B34" stroke-width="4.2" stroke-linejoin="round"/><path d="M105 110C109 114 110 120 108 127M119 107C123 112 124 120 122 129M133 109C137 113 138 119 136 126" fill="none" stroke="#2F6B34" stroke-width="3.4" stroke-linecap="round"/><g transform="translate(146 179) rotate(50)"><path d="M0 0Q20 -23 0 -48Q-20 -23 0 0Z" fill="#2F6B34"/><path d="M0 -4V-39" stroke="#91B06B" stroke-width="2.4" stroke-linecap="round"/></g>';
