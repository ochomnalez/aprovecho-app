// Ilustraciones de comida y logos de los locales. Todo vectorial, dibujado a mano:
// no hay imágenes bajadas de internet. viewBox 0 0 120 120 en las ilustraciones.

const sombra = (cx = 60, cy = 100, rx = 36) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * .17}" fill="#1b2a1e" opacity=".13"/>`;
const brillo = (cx, cy, rx, ry, rot = -20) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity=".38"/>`;

const DIBUJOS = {
  medialuna: () => `
    <defs><radialGradient id="gMed" cx=".42" cy=".3" r=".85"><stop offset="0" stop-color="#FACB77"/><stop offset=".55" stop-color="#E39A45"/><stop offset="1" stop-color="#B26A2C"/></radialGradient></defs>
    ${sombra(60, 98, 42)}
    <g fill="url(#gMed)" stroke="#A55E24" stroke-width="1.4" stroke-opacity=".45">
      <ellipse cx="20" cy="84" rx="10" ry="12" transform="rotate(-50 20 84)"/>
      <ellipse cx="100" cy="84" rx="10" ry="12" transform="rotate(50 100 84)"/>
      <ellipse cx="36" cy="70" rx="15" ry="18" transform="rotate(-30 36 70)"/>
      <ellipse cx="84" cy="70" rx="15" ry="18" transform="rotate(30 84 70)"/>
      <ellipse cx="60" cy="62" rx="19" ry="22"/>
    </g>
    ${brillo(52, 52, 8, 5)}${brillo(30, 62, 5, 3, -40)}${brillo(79, 60, 5, 3, 10)}`,

  pan: () => `
    <defs><radialGradient id="gPan" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#E2A865"/><stop offset=".6" stop-color="#BF7A38"/><stop offset="1" stop-color="#8E5222"/></radialGradient></defs>
    ${sombra(60, 96, 44)}
    <g transform="rotate(-12 60 66)">
      <ellipse cx="60" cy="66" rx="46" ry="26" fill="url(#gPan)"/>
      <path d="M34 60c6 6 8 12 6 18M52 52c6 7 8 15 6 22M70 50c6 7 8 15 6 22M88 54c5 6 6 12 4 18" stroke="#F4D7A4" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
    ${brillo(46, 50, 12, 5, -15)}
    <g fill="#fff" opacity=".55"><circle cx="40" cy="70" r="1.2"/><circle cx="66" cy="58" r="1"/><circle cx="80" cy="74" r="1.1"/><circle cx="56" cy="80" r=".9"/></g>`,

  torta: () => `
    ${sombra(60, 100, 40)}
    <path d="M18 50 96 64 66 38Z" fill="#F7E4CB"/>
    <path d="M18 50 96 64V92L18 78Z" fill="#6C3B22"/>
    <path d="M18 60 96 74M18 69 96 83" stroke="#F4D9B5" stroke-width="4"/>
    <path d="M18 50 96 64V92L18 78Z" fill="none" stroke="#3E1F10" stroke-width="1.5" stroke-opacity=".35"/>
    <path d="M22 50c6 5 12 5 18 1 6 5 12 5 18 1 6 5 12 5 18 1 6 5 12 5 16 2" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
    <circle cx="64" cy="44" r="7.5" fill="#D8313B"/><circle cx="61.5" cy="41.5" r="2.2" fill="#fff" opacity=".6"/>
    <path d="M65 37c2-6 6-9 11-10" stroke="#3D6B2E" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,

  cupcake: () => `
    ${sombra(60, 102, 30)}
    <path d="M32 64h56l-8 36H40Z" fill="#F29BB2"/>
    <path d="M40 64l4 36M50 64l2 36M60 64v36M70 64l-2 36M80 64l-4 36" stroke="#D9728E" stroke-width="2"/>
    <ellipse cx="60" cy="62" rx="32" ry="10" fill="#FBEFE4"/>
    <path d="M30 60c0-12 12-18 20-16 2-10 18-12 22-2 10-2 20 6 18 18Z" fill="#FFF6EC"/>
    <path d="M40 46c4-10 16-14 22-8 8-4 18 2 16 10" fill="#FFF6EC"/>
    <path d="M52 36c2-8 12-10 16-4" fill="#FFF6EC" stroke="#F3DCC9" stroke-width="1"/>
    <g stroke-width="3" stroke-linecap="round"><path d="M44 52l3-2" stroke="#E4495F"/><path d="M60 46l3 2" stroke="#3AA6D8"/><path d="M72 54l-3 2" stroke="#F4B400"/><path d="M52 58l3 1" stroke="#7BBF45"/><path d="M68 40l2-3" stroke="#E4495F"/></g>
    <circle cx="60" cy="28" r="6" fill="#D8313B"/>`,

  sandwich: () => `
    ${sombra(60, 98, 42)}
    <path d="M18 78 60 24 102 78Z" fill="#FFF8EA"/>
    <path d="M18 78 60 24 102 78" fill="none" stroke="#E6C48D" stroke-width="5" stroke-linejoin="round"/>
    <path d="M18 78h84v5H18Z" fill="#8DC05A"/>
    <path d="M18 83h84v5H18Z" fill="#F2A6A0"/>
    <path d="M18 88h84v4H18Z" fill="#F7D35C"/>
    <path d="M18 92h84v6c-2 2-82 2-84 0Z" fill="#FFF8EA" stroke="#E6C48D" stroke-width="2"/>
    ${brillo(54, 50, 10, 4, -50)}`,

  empanada: () => {
    let rep = '';
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; rep += `<circle cx="${(60 + Math.cos(a) * 44).toFixed(1)}" cy="${(78 + Math.sin(a) * 34).toFixed(1)}" r="5.4" fill="#C9853A"/>`; }
    return `<defs><radialGradient id="gEmp" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#F2C987"/><stop offset=".7" stop-color="#D69A4E"/><stop offset="1" stop-color="#B07434"/></radialGradient></defs>
    ${sombra(60, 98, 44)}<path d="M14 80A46 36 0 0 1 106 80Z" fill="url(#gEmp)"/>${rep}${brillo(50, 60, 14, 5, -12)}`;
  },

  vianda: () => `
    ${sombra(60, 102, 42)}
    <path d="M14 64h92c0 22-20 36-46 36S14 86 14 64Z" fill="#FFFFFF"/>
    <path d="M14 64h92c0 22-20 36-46 36S14 86 14 64Z" fill="none" stroke="#DDE4DA" stroke-width="2"/>
    <path d="M22 64c4-18 22-26 38-26s34 8 38 26Z" fill="#F4EBD7"/>
    <circle cx="44" cy="52" r="8" fill="#7BBF45"/><circle cx="54" cy="46" r="7" fill="#5FA83A"/>
    <circle cx="74" cy="50" r="7" fill="#E4573D"/><circle cx="72" cy="48" r="2" fill="#fff" opacity=".5"/>
    <ellipse cx="62" cy="58" rx="7" ry="4" fill="#F29A3A"/><ellipse cx="84" cy="58" rx="6" ry="3.5" fill="#F29A3A"/>
    <path d="M36 60c4-2 8-2 12 0" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/>
    ${brillo(34, 74, 10, 4, -10)}`,

  pizza: () => `
    ${sombra(60, 102, 36)}
    <path d="M60 104 20 30c26-12 54-12 80 0Z" fill="#F7C847"/>
    <path d="M20 30c26-12 54-12 80 0l-4 8c-24-10-48-10-72 0Z" fill="#D9883A"/>
    <circle cx="48" cy="50" r="8" fill="#C8352E"/><circle cx="72" cy="52" r="8" fill="#C8352E"/><circle cx="60" cy="76" r="7" fill="#C8352E"/>
    <circle cx="46" cy="48" r="2" fill="#fff" opacity=".35"/><circle cx="70" cy="50" r="2" fill="#fff" opacity=".35"/>
    <circle cx="62" cy="40" r="3" fill="#2E3A2A"/><circle cx="54" cy="64" r="3" fill="#2E3A2A"/>
    <path d="M40 60l3 3M76 66l3-2" stroke="#4E8A3A" stroke-width="3" stroke-linecap="round"/>`,

  cafe: () => `
    ${sombra(60, 100, 40)}
    <ellipse cx="60" cy="92" rx="40" ry="8" fill="#FFFFFF" stroke="#DDE4DA" stroke-width="2"/>
    <path d="M30 50h54l-4 34c-1 6-6 9-12 9H46c-6 0-11-3-12-9Z" fill="#FFFFFF" stroke="#DDE4DA" stroke-width="2"/>
    <path d="M84 58c10 0 14 6 12 12s-8 8-14 6" fill="none" stroke="#FFFFFF" stroke-width="7"/>
    <path d="M84 58c10 0 14 6 12 12s-8 8-14 6" fill="none" stroke="#DDE4DA" stroke-width="2"/>
    <ellipse cx="57" cy="52" rx="25" ry="5" fill="#7B4A2A"/><ellipse cx="54" cy="51" rx="8" ry="2" fill="#C99A6B"/>
    <path d="M46 40c-4-6 4-8 0-14M58 40c-4-6 4-8 0-14M70 40c-4-6 4-8 0-14" stroke="#C9D2C6" stroke-width="3" stroke-linecap="round" fill="none"/>`,

  hoja: () => `
    <defs><linearGradient id="gHoja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FD16A"/><stop offset="1" stop-color="#2F8A3E"/></linearGradient></defs>
    ${sombra(60, 102, 30)}
    <path d="M26 92C24 50 54 20 98 18c2 44-26 76-72 74Z" fill="url(#gHoja)"/>
    <path d="M30 88C46 66 64 48 90 26" stroke="#E6F5D9" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M46 70c-6-4-8-10-8-16M58 58c0-8 4-14 10-18M62 58c8 0 14 2 18 8" stroke="#E6F5D9" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>
    ${brillo(52, 40, 12, 5, -40)}`,

  sintacc: () => {
    let granos = '';
    for (let i = 0; i < 5; i++) { const y = 34 + i * 11; granos += `<ellipse cx="52" cy="${y}" rx="6" ry="9" transform="rotate(-28 52 ${y})" fill="#E6B653"/><ellipse cx="68" cy="${y}" rx="6" ry="9" transform="rotate(28 68 ${y})" fill="#D9A43E"/>`; }
    return `${sombra(60, 104, 32)}<path d="M60 28V100" stroke="#C38F2F" stroke-width="4" stroke-linecap="round"/>${granos}<ellipse cx="60" cy="26" rx="5" ry="9" fill="#E6B653"/>
    <circle cx="60" cy="62" r="44" fill="none" stroke="#C0392B" stroke-width="8"/><path d="M29 31 91 93" stroke="#C0392B" stroke-width="8" stroke-linecap="round"/>`;
  },

  caja: () => `
    ${sombra(60, 104, 42)}
    <path d="M20 44 60 28 100 44 60 60Z" fill="#E4C79A"/>
    <path d="M20 44V86L60 104V60Z" fill="#CFA86F"/>
    <path d="M100 44V86L60 104V60Z" fill="#B99159"/>
    <path d="M40 36 80 52V70" stroke="#2F6B34" stroke-width="7" fill="none" stroke-linejoin="round"/>
    <path d="M80 36 40 52V70" stroke="#3F8A45" stroke-width="7" fill="none" stroke-linejoin="round"/>
    <circle cx="60" cy="44" r="6" fill="#2F6B34"/>`,

  pin: () => `
    <circle cx="60" cy="96" r="18" fill="#2F6B34" opacity=".12"/><circle cx="60" cy="96" r="9" fill="#2F6B34" opacity=".2"/>
    <path d="M60 96S30 66 30 46a30 30 0 0 1 60 0c0 20-30 50-30 50Z" fill="#2F6B34"/>
    <circle cx="60" cy="46" r="12" fill="#fff"/>${brillo(46, 30, 8, 4, -30)}`,

  fuego: () => `
    <defs><linearGradient id="gFue" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E4402B"/><stop offset=".6" stop-color="#F48A2A"/><stop offset="1" stop-color="#FFC94A"/></linearGradient></defs>
    ${sombra(60, 104, 28)}
    <path d="M60 102c-22 0-34-14-34-32 0-20 16-28 18-46 10 8 14 18 12 28 6-4 10-12 10-20 14 12 28 26 28 42 0 16-12 28-34 28Z" fill="url(#gFue)"/>
    <path d="M60 102c-10 0-16-6-16-16 0-10 8-14 10-24 8 8 20 14 20 26 0 8-6 14-14 14Z" fill="#FFE08A"/>`,

  estrella: () => `
    <defs><linearGradient id="gEst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD66B"/><stop offset="1" stop-color="#F0A21A"/></linearGradient></defs>
    ${sombra(60, 104, 30)}
    <path d="M60 14l13 28 30 3-23 20 7 30-27-16-27 16 7-30-23-20 30-3Z" fill="url(#gEst)" stroke="#D98D10" stroke-width="2" stroke-linejoin="round"/>${brillo(52, 40, 8, 4, -30)}`,
};

export function ilus(nombre, tam = 72, extra = '') {
  const d = DIBUJOS[nombre] || DIBUJOS.caja;
  return `<svg class="ilus ${extra}" width="${tam}" height="${tam}" viewBox="0 0 120 120" aria-hidden="true">${d()}</svg>`;
}

// ilustración según la categoría del pack (para las tarjetas)
export const ilusCategoria = { Panificados: 'medialuna', Pastelería: 'torta', Sándwiches: 'sandwich', Viandas: 'vianda' };
export const fondoCategoria = { Panificados: '#FBEBD2', Pastelería: '#FBE1E6', Sándwiches: '#FDF1CF', Viandas: '#E3F1DC' };

// ---------- logos de los locales (ficticios) ----------
const EMBLEMAS = {
  espiga: '<path d="M24 42V14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><g fill="currentColor"><ellipse cx="19.5" cy="18" rx="3.6" ry="5.6" transform="rotate(-30 19.5 18)"/><ellipse cx="28.5" cy="18" rx="3.6" ry="5.6" transform="rotate(30 28.5 18)"/><ellipse cx="19.5" cy="26" rx="3.6" ry="5.6" transform="rotate(-30 19.5 26)"/><ellipse cx="28.5" cy="26" rx="3.6" ry="5.6" transform="rotate(30 28.5 26)"/><ellipse cx="19.5" cy="34" rx="3.6" ry="5.6" transform="rotate(-30 19.5 34)"/><ellipse cx="28.5" cy="34" rx="3.6" ry="5.6" transform="rotate(30 28.5 34)"/><ellipse cx="24" cy="10" rx="3" ry="5"/></g>',
  chef: '<path d="M14 26c-5 0-7-4-6-8 1-5 7-6 9-3 1-6 13-7 14 0 3-3 9-1 9 4 1 5-3 7-6 7v12H14Z" fill="currentColor"/><path d="M14 38h20" stroke="currentColor" stroke-width="3"/>',
  taza: '<path d="M10 20h24l-2 14c-1 4-4 6-8 6h-4c-4 0-7-2-8-6Z" fill="currentColor"/><path d="M34 23c5 0 7 3 6 6-1 3-4 4-7 3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M17 15c-2-3 2-4 0-7M24 15c-2-3 2-4 0-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
  cupcake: '<path d="M13 26h22l-3 14H16Z" fill="currentColor"/><path d="M12 25c0-6 5-9 9-8 1-5 9-6 11-1 5-1 9 3 8 9Z" fill="currentColor"/><circle cx="24" cy="10" r="3" fill="currentColor"/>',
  hoja: '<path d="M12 38C11 22 23 10 38 9c1 16-10 28-26 29Z" fill="currentColor"/><path d="M14 36 34 14" stroke-width="2" stroke-linecap="round" class="corte"/>',
  sandwich: '<path d="M8 32 24 11l16 21Z" fill="currentColor"/><path d="M8 34h32v4H8Z" fill="currentColor"/><path d="M8 29h32" stroke-width="2.4" class="corte"/>',
  pizza: '<path d="M24 42 9 14c10-5 20-5 30 0Z" fill="currentColor"/><g class="corte-f"><circle cx="20" cy="21" r="3"/><circle cx="29" cy="22" r="3"/><circle cx="24" cy="31" r="2.6"/></g>',
  sintacc: '<path d="M24 38V14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><g fill="currentColor"><ellipse cx="20" cy="18" rx="3" ry="4.6" transform="rotate(-30 20 18)"/><ellipse cx="28" cy="18" rx="3" ry="4.6" transform="rotate(30 28 18)"/><ellipse cx="20" cy="26" rx="3" ry="4.6" transform="rotate(-30 20 26)"/><ellipse cx="28" cy="26" rx="3" ry="4.6" transform="rotate(30 28 26)"/></g><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 12l24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
};

export function logoLocal(c, tam = 56, radio = 16, conNombre = false) {
  const L = c.logo || { bg: '#2F6B34', fg: '#fff', emblema: 'espiga' };
  const e = EMBLEMAS[L.emblema] || EMBLEMAS.espiga;
  const nombre = conNombre ? `<span class="logo-nombre" style="color:${L.fg}">${c.corto || c.nombre}</span>` : '';
  return `<span class="logo-local${conNombre ? ' con-nombre' : ''}" style="width:${tam}px;height:${tam}px;border-radius:${radio}px;background:${L.bg};color:${L.fg};--corte:${L.bg}">
    <svg viewBox="0 0 48 48" width="${Math.round(tam * (conNombre ? .46 : .6))}" height="${Math.round(tam * (conNombre ? .46 : .6))}" aria-hidden="true">${e}</svg>${nombre}</span>`;
}
