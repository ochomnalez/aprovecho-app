// Reportes descargables: Excel (.xlsx real, escrito a mano) y PDF (jsPDF).
// Usan las mismas funciones de cálculo que las pantallas, así coinciden al peso.
import { cargarScript, isoDia, ddmm, plata, dec, num, pct, MESES } from './util.js';
import { S, hoy, ahora, miComercio, tienePlan } from './store.js';
import { filtrar, resumen, porDia, sugerencias, ranking, METODOLOGIA, SUCURSALES, periodoDias, semanas } from './intel.js';
import { ISO } from './icons.js';
import { CONFIG, PLANES } from './data.js';

export const JSPDF_JS = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';

// ---------------------------------------------------------------------------
// datos del reporte
// ---------------------------------------------------------------------------
export function seccionesDisponibles() {
  const s = [['impacto', 'Impacto: $, kg y CO₂'], ['packs', 'Packs y ventas']];
  if (tienePlan('smart')) s.push(['merma', 'Merma por motivo']);
  if (tienePlan('intelligence')) {
    s.push(['sugerencias', 'Sugerencias y resultados']);
    s.push(['sucursales', 'Comparación de sucursales']);
  }
  return s;
}

function hoyLocal() {
  // lo que se hizo hoy en la app, como un día más
  const d = hoy();
  // mismos packs que suma la pantalla de Impacto: todos los del local hoy
  const mios = S.packs.filter(p => p.comercioId === 'c1' && p.dia === d);
  for (const p of mios) if (p.stockInicial == null) p.stockInicial = p.stock + (p.vendidos || 0);
  const pub = mios.reduce((a, p) => a + p.stockInicial, 0);
  const vend = mios.reduce((a, p) => a + p.vendidos, 0);
  const rec = mios.reduce((a, p) => a + p.vendidos * p.precio, 0);
  const kgR = mios.reduce((a, p) => a + p.vendidos * p.pesoG / 1000, 0);
  const merma = S.capturas.filter(c => c.dia === d && c.destino === 'basura');
  return { dia: d, packsPub: pub, packsVend: vend, recuperado: rec, kgRescatado: kgR, co2: kgR * CONFIG.factorCO2, mermaKg: merma.reduce((a, c) => a + c.kg, 0), merma, mios };
}

export function datosReporte({ periodo, suc, secciones }) {
  const sucEf = tienePlan('intelligence') ? suc : 'olivos';
  const dias = filtrar(periodo, sucEf, ahora());
  const r = resumen(dias);
  const hl = hoyLocal();
  const { desde, hasta } = periodoDias(periodo, ahora());
  const incluyeHoy = !periodo.desde || periodo.hasta >= hoy();
  const filasDia = porDia(dias).map(x => [x.dia, x.packsPub, x.packsVend, x.recuperado, x.kgRescatado, x.co2, x.mermaKg]);
  if (incluyeHoy && (hl.packsPub || hl.mermaKg)) filasDia.push([hl.dia, hl.packsPub, hl.packsVend, hl.recuperado, hl.kgRescatado, hl.co2, hl.mermaKg]);
  const tot = {
    packsPub: r.packsPub + (incluyeHoy ? hl.packsPub : 0), packsVend: r.packsVend + (incluyeHoy ? hl.packsVend : 0),
    recuperado: r.recuperado + (incluyeHoy ? hl.recuperado : 0), kgRescatado: r.kgRescatado + (incluyeHoy ? hl.kgRescatado : 0),
    mermaKg: r.mermaKg + (incluyeHoy ? hl.mermaKg : 0), kgProducido: r.kgProducido, costoEvitado: r.costoEvitado, porMotivo: { ...r.porMotivo },
  };
  if (incluyeHoy) for (const m of hl.merma) tot.porMotivo[m.motivo || 'Sin motivo'] = (tot.porMotivo[m.motivo || 'Sin motivo'] || 0) + m.kg;
  tot.co2 = tot.kgRescatado * CONFIG.factorCO2;
  tot.pctVend = tot.packsPub ? tot.packsVend / tot.packsPub : 0;
  tot.pctDesp = tot.kgProducido ? tot.mermaKg / tot.kgProducido : 0;

  const packs = [];
  for (const d of dias) for (const p of d.packs) packs.push([d.dia, SUCURSALES.find(s => s.id === d.suc).nombre, nombreLinea(p.linea), cap(p.tam), p.pub, p.vend, p.precio, p.vend * p.precio]);
  if (incluyeHoy) for (const p of hl.mios) packs.push([hl.dia, 'Olivos', p.titulo || 'Pan de campo', cap(p.tam), p.stockInicial, p.vendidos, p.precio, p.vendidos * p.precio]);

  const merma = [];
  for (const d of dias) for (const m of d.merma) merma.push([d.dia, SUCURSALES.find(s => s.id === d.suc).nombre, m.motivo, m.linea ? nombreLinea(m.linea) : 'Varios', m.kg]);
  if (incluyeHoy) for (const m of hl.merma) merma.push([hl.dia, 'Olivos', m.motivo || 'Sin motivo', m.producto, m.kg]);

  const sug = secciones.includes('sugerencias') ? sugerencias(sucEf, ahora(), S.sugerencias) : [];
  const rk = secciones.includes('sucursales') && sucEf === 'todas' ? ranking(periodo.desde ? 'mes' : periodo, ahora()) : [];
  const sem = semanas(sucEf, 8, ahora());
  return { desde, hasta: incluyeHoy ? hoy() : hasta, sucEf, tot, filasDia, packs, merma, sug, rk, sem, secciones };
}

const LINEA = { medialuna: 'Medialunas', factura: 'Facturas', pan: 'Pan de campo', miga: 'Sándwiches de miga', torta: 'Torta (porción)' };
const nombreLinea = id => LINEA[id] || id;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fechaTxt = iso => { const [y, m, d] = iso.split('-'); return `${+d} de ${MESES[+m - 1]} de ${y}`; };
export const nombreArchivo = (ext, periodo) => `aprovecho-la-espiga-${periodo?.desde ? periodo.desde.slice(0, 7) : isoDia(ahora()).slice(0, 7)}.${ext}`;
const nombreSuc = suc => (suc === 'todas' ? 'Todas las sucursales' : SUCURSALES.find(s => s.id === suc)?.nombre || '');

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------
const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COL = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const serial = iso => { const [y, m, d] = iso.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000; };
const ESTILO = { txt: 0, header: 1, plata: 2, dec: 3, pct: 4, fecha: 5, ent: 6, titulo: 7, bold: 8, wrap: 9, nota: 10 };

function hojaXml({ titulo, subtitulo, columnas, filas, notas = [] }) {
  const out = [];
  let r = 1;
  const celda = (c, v, s) => {
    const ref = COL(c) + r;
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${s}"><v>${+v.toFixed(6)}</v></c>`;
    return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
  };
  out.push(`<row r="${r}" ht="24" customHeight="1">${celda(0, titulo, ESTILO.titulo)}</row>`); r++;
  out.push(`<row r="${r}">${celda(0, subtitulo, ESTILO.nota)}</row>`); r += 2;
  const filaEnc = r;
  out.push(`<row r="${r}" ht="22" customHeight="1">${columnas.map((c, i) => celda(i, c.t, ESTILO.header)).join('')}</row>`); r++;
  for (const f of filas) {
    out.push(`<row r="${r}">${f.map((v, i) => {
      const fmt = columnas[i].f || 'txt';
      if (fmt === 'fecha' && typeof v === 'string') return celda(i, serial(v), ESTILO.fecha);
      return celda(i, v, ESTILO[fmt] ?? 0);
    }).join('')}</row>`); r++;
  }
  if (notas.length) { r++; for (const n of notas) { out.push(`<row r="${r}">${celda(0, n, ESTILO.nota)}</row>`); r++; } }
  const cols = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 14}" customWidth="1"/>`).join('');
  const ultima = COL(columnas.length - 1);
  const filtro = filas.length ? `<autoFilter ref="A${filaEnc}:${ultima}${filaEnc + filas.length}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${filaEnc}" topLeftCell="A${filaEnc + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${cols}</cols><sheetData>${out.join('')}</sheetData>${filtro}</worksheet>`;
}

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/><numFmt numFmtId="165" formatCode="#,##0.0"/><numFmt numFmtId="166" formatCode="0.0%"/><numFmt numFmtId="167" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="5"><font><sz val="11"/><color rgb="FF17231A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF17231A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF2F6B34"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF77837A"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F6B34"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E8E1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export async function armarExcel(D) {
  const sub = `La Espiga · ${nombreSuc(D.sucEf)} · del ${fechaTxt(D.desde)} al ${fechaTxt(D.hasta)} · plan ${PLANES[S.plan].nombre}`;
  const hojas = [];
  const t = D.tot;
  const resumenFilas = [
    ['Packs publicados', t.packsPub, 'ent'], ['Packs vendidos', t.packsVend, 'ent'], ['% vendido', t.pctVend, 'pct'],
    ['$ recuperados (bruto)', t.recuperado, 'plata'], ['kg rescatados', t.kgRescatado, 'dec'], ['kg CO2e evitados', t.co2, 'dec'],
  ];
  if (tienePlan('smart')) resumenFilas.push(['kg a la basura (merma registrada)', t.mermaKg, 'dec']);
  if (tienePlan('intelligence')) { resumenFilas.push(['% de desperdicio sobre lo producido', t.pctDesp, 'pct']); resumenFilas.push(['Costo evitado por sugerencias aplicadas', t.costoEvitado, 'plata']); }
  hojas.push({
    nombre: 'Resumen', titulo: 'Reporte de impacto · Aprovecho', subtitulo: sub,
    columnas: [{ t: 'Indicador', w: 40 }, { t: 'Valor', w: 18, f: 'dec' }],
    filas: resumenFilas.map(([k, v]) => [k, v]),
    notas: ['El formato de cada valor está en la hoja de cada tema. Cómo se calcula cada número: hoja Metodología.', '$ recuperados es bruto: la comisión todavía no está definida.'],
    fmtFila: resumenFilas.map(x => x[2]),
  });
  if (D.secciones.includes('impacto')) hojas.push({
    nombre: 'Por día', titulo: 'Impacto por día', subtitulo: sub,
    columnas: [{ t: 'Fecha', w: 13, f: 'fecha' }, { t: 'Packs publicados', w: 17, f: 'ent' }, { t: 'Packs vendidos', w: 16, f: 'ent' }, { t: '$ recuperados', w: 16, f: 'plata' }, { t: 'kg rescatados', w: 15, f: 'dec' }, { t: 'kg CO2e evitados', w: 17, f: 'dec' }, ...(tienePlan('smart') ? [{ t: 'kg a la basura', w: 15, f: 'dec' }] : [])],
    filas: D.filasDia.map(f => (tienePlan('smart') ? f : f.slice(0, 6))),
  });
  if (D.secciones.includes('packs')) hojas.push({
    nombre: 'Packs', titulo: 'Packs publicados y vendidos', subtitulo: sub,
    columnas: [{ t: 'Fecha', w: 13, f: 'fecha' }, { t: 'Sucursal', w: 14 }, { t: 'Producto', w: 30 }, { t: 'Tamaño', w: 11 }, { t: 'Publicados', w: 12, f: 'ent' }, { t: 'Vendidos', w: 11, f: 'ent' }, { t: 'Precio del pack', w: 16, f: 'plata' }, { t: '$ recuperados', w: 16, f: 'plata' }],
    filas: D.packs,
  });
  if (D.secciones.includes('merma') && tienePlan('smart')) hojas.push({
    nombre: 'Merma', titulo: 'Lo que se tiró, por motivo', subtitulo: sub,
    columnas: [{ t: 'Fecha', w: 13, f: 'fecha' }, { t: 'Sucursal', w: 14 }, { t: 'Motivo', w: 26 }, { t: 'Producto', w: 24 }, { t: 'kg', w: 10, f: 'dec' }],
    filas: D.merma,
  });
  if (D.secciones.includes('sugerencias') && D.sug.length) hojas.push({
    nombre: 'Sugerencias', titulo: 'Sugerencias de Intelligence', subtitulo: sub,
    columnas: [{ t: 'Tipo', w: 13 }, { t: 'Sugerencia', w: 44, f: 'wrap' }, { t: 'Por qué', w: 60, f: 'wrap' }, { t: 'Impacto $/mes', w: 15, f: 'plata' }, { t: 'Impacto kg/mes', w: 15, f: 'dec' }, { t: 'Confianza', w: 12 }, { t: 'Estado', w: 14 }],
    filas: D.sug.map(s => [s.tipo, s.titulo, s.porque, s.plata, s.kg, cap(s.confianza), { nueva: 'Nueva', en_prueba: 'En prueba', funciono: 'Funcionó', descartada: 'Descartada' }[s.estado]]),
  });
  if (D.secciones.includes('sucursales') && D.rk.length) hojas.push({
    nombre: 'Sucursales', titulo: 'Comparación de sucursales', subtitulo: sub,
    columnas: [{ t: 'Sucursal', w: 16 }, { t: '% de desperdicio', w: 17, f: 'pct' }, { t: 'kg producidos', w: 15, f: 'dec' }, { t: 'kg a la basura', w: 15, f: 'dec' }, { t: '$ recuperados', w: 16, f: 'plata' }, { t: 'Packs vendidos', w: 15, f: 'ent' }],
    filas: D.rk.map(s => [s.nombre, s.pctDesp, s.kgProducido, s.kgBasura, s.recuperado, s.packsVend]),
  });
  hojas.push({
    nombre: 'Metodología', titulo: 'Cómo se calcula cada número', subtitulo: 'Todo número del reporte sale de estas fórmulas. Los marcados como PENDIENTE todavía no tienen fuente definida.',
    columnas: [{ t: 'Cifra', w: 24, f: 'bold' }, { t: 'Fórmula', w: 52, f: 'wrap' }, { t: 'De dónde sale', w: 40, f: 'wrap' }, { t: 'Estado', w: 36, f: 'wrap' }],
    filas: METODOLOGIA,
    notas: ['Demo de validación: los datos del historial son simulados. Precios de los planes: de ejemplo.'],
  });

  // la hoja Resumen tiene formatos distintos por fila
  const archivos = {};
  hojas.forEach((h, i) => {
    let xml = hojaXml(h);
    if (h.fmtFila) h.fmtFila.forEach((f, j) => {
      const ref = 'B' + (5 + j);
      xml = xml.replace(new RegExp(`<c r="${ref}" s="\\d+"`), `<c r="${ref}" s="${ESTILO[f]}"`);
    });
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = xml;
  });
  const ns = 'http://schemas.openxmlformats.org';
  archivos['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  archivos['_rels/.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="${ns}/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${ns}/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  archivos['xl/workbook.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${hojas.map((h, i) => `<sheet name="${xesc(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  archivos['xl/_rels/workbook.xml.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  archivos['xl/styles.xml'] = ESTILOS_XML;
  const ahoraIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  archivos['docProps/core.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="${ns}/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Reporte de impacto · Aprovecho</dc:title><dc:creator>Aprovecho</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${ahoraIso}</dcterms:created></cp:coreProperties>`;
  archivos['docProps/app.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="${ns}/officeDocument/2006/extended-properties"><Application>Aprovecho</Application></Properties>`;
  return new Blob([await zip(archivos)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------- zip: comprime con el deflate nativo del navegador; si no hay, guarda sin comprimir ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function deflar(data) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const flujo = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  } catch (e) { return null; }
}
async function zip(archivos) {
  const enc = new TextEncoder();
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const partes = [], central = [];
  let off = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const nb = enc.encode(nombre), data = enc.encode(contenido), crc = crc32(data);
    const comp = await deflar(data);
    const metodo = comp ? 8 : 0, cuerpo = comp || data;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, metodo, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
    h.setUint32(18, cuerpo.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    partes.push(new Uint8Array(h.buffer), nb, cuerpo);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, metodo, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, cuerpo.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nb.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + cuerpo.length;
  }
  const tamC = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  const n = Object.keys(archivos).length;
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, tamC, true); e.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(e.buffer)]);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
const pdfTxt = s => String(s).replace(/₂/g, '2').replace(/≈/g, 'aprox.').replace(/Σ/g, 'Suma de').replace(/−/g, '-').replace(/≥/g, '>=').replace(/→/g, '->');

async function logoPng(px = 240) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${ISO}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = px;
  c.getContext('2d').drawImage(img, 0, 0, px, px);
  return c.toDataURL('image/png');
}

export async function armarPdf(D) {
  const { jsPDF } = await cargarScript(JSPDF_JS, 'jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, M = 42;
  const verde = [47, 107, 52], tinta = [23, 35, 26], gris = [119, 131, 122], linea = [227, 232, 225], suave = [241, 246, 238];
  let y = 0;
  const texto = (s, x, yy, o = {}) => doc.text(pdfTxt(s), x, yy, o);
  const nueva = () => { doc.addPage(); y = M; };
  const espacio = h => { if (y + h > 800) nueva(); };

  // encabezado
  doc.setFillColor(...suave); doc.rect(0, 0, W, 120, 'F');
  doc.addImage(await logoPng(), 'PNG', M, 24, 72, 72);
  doc.setTextColor(...verde); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  texto('APROVECHO', M + 88, 56);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...gris);
  texto('Nada se pierde, todo vale', M + 88, 73);
  doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  texto('Reporte de impacto · Panadería La Espiga', M + 88, 96);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...gris);
  texto(`${nombreSuc(D.sucEf)} · del ${fechaTxt(D.desde)} al ${fechaTxt(D.hasta)} · plan ${PLANES[S.plan].nombre}`, M + 88, 110);
  y = 150;

  // indicadores
  const t = D.tot;
  const kpis = [
    ['$ recuperados', plata(t.recuperado), 'lo cobrado por packs (bruto)'],
    ['kg rescatados', dec(t.kgRescatado), 'comida que no se tiró'],
    ['kg CO2e evitados', dec(t.co2), `aprox. ${num(t.co2 / CONFIG.kgCO2PorKm)} km en auto`],
    ['Packs vendidos', num(t.packsVend), `de ${num(t.packsPub)} publicados (${pct(t.pctVend)})`],
  ];
  if (tienePlan('smart')) kpis.push(['kg a la basura', dec(t.mermaKg), 'merma registrada por la estación']);
  if (tienePlan('intelligence')) kpis.push(['% de desperdicio', (t.pctDesp * 100).toFixed(1).replace('.', ',') + '%', 'sobre lo producido']);
  doc.setFontSize(10);
  const bw = (W - M * 2 - 20) / 3, bh = 70;
  kpis.forEach((k, i) => {
    const x = M + (i % 3) * (bw + 10), yy = y + Math.floor(i / 3) * (bh + 10);
    doc.setDrawColor(...linea); doc.setFillColor(255, 255, 255); doc.roundedRect(x, yy, bw, bh, 8, 8, 'FD');
    doc.setTextColor(...gris); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); texto(k[0].toUpperCase(), x + 12, yy + 20);
    doc.setTextColor(...tinta); doc.setFontSize(19); texto(k[1], x + 12, yy + 44);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gris); texto(k[2], x + 12, yy + 59);
  });
  y += Math.ceil(kpis.length / 3) * (bh + 10) + 18;

  // evolución semanal
  espacio(190);
  doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); texto('Evolución de las últimas 8 semanas', M, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...gris); texto('kg rescatados por semana', M, y + 12); y += 24;
  const maxK = Math.max(...D.sem.map(s => s.kgRescatado), 1), ch = 110, cw = (W - M * 2) / D.sem.length;
  D.sem.forEach((s, i) => {
    const h = s.kgRescatado / maxK * ch;
    doc.setFillColor(...(i === D.sem.length - 1 ? verde : [201, 221, 188]));
    doc.roundedRect(M + i * cw + 8, y + ch - h, cw - 16, h, 3, 3, 'F');
    doc.setTextColor(...tinta); doc.setFontSize(8.5); texto(dec(s.kgRescatado), M + i * cw + cw / 2, y + ch - h - 4, { align: 'center' });
    doc.setTextColor(...gris); texto(ddmm(new Date(s.desde + 'T12:00')), M + i * cw + cw / 2, y + ch + 13, { align: 'center' });
  });
  y += ch + 34;

  // merma por motivo
  if (D.secciones.includes('merma') && tienePlan('smart')) {
    espacio(150);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); texto('Lo que se tiró, por motivo', M, y); y += 18;
    const mot = Object.entries(t.porMotivo).sort((a, b) => b[1] - a[1]);
    const maxM = Math.max(...mot.map(m => m[1]), 1);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    for (const [m, v] of mot) {
      doc.setTextColor(...tinta); texto(m, M, y + 9);
      doc.setFillColor(...linea); doc.roundedRect(M + 170, y, 260, 11, 5, 5, 'F');
      doc.setFillColor(180, 83, 31); doc.roundedRect(M + 170, y, Math.max(6, 260 * v / maxM), 11, 5, 5, 'F');
      doc.setTextColor(...gris); texto(dec(v) + ' kg', W - M, y + 9, { align: 'right' });
      y += 20;
    }
    y += 14;
  }

  // sugerencias
  if (D.secciones.includes('sugerencias') && D.sug.length) {
    espacio(80);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); texto('Sugerencias de Intelligence', M, y); y += 16;
    for (const s of D.sug) {
      const porque = doc.splitTextToSize(pdfTxt(s.porque), W - M * 2 - 24);
      const alto = 40 + porque.length * 12;
      espacio(alto + 8);
      doc.setDrawColor(...linea); doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, W - M * 2, alto, 8, 8, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...verde);
      texto(`${s.tipo.toUpperCase()} · CONFIANZA ${s.confianza.toUpperCase()} · ${({ nueva: 'NUEVA', en_prueba: 'EN PRUEBA', funciono: 'FUNCIONÓ', descartada: 'DESCARTADA' })[s.estado]}`, M + 12, y + 16);
      doc.setTextColor(...tinta); doc.setFontSize(11.5); texto(s.titulo, M + 12, y + 31);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...gris); doc.text(porque, M + 12, y + 45);
      if (s.plata) { doc.setFont('helvetica', 'bold'); doc.setTextColor(...verde); texto('aprox. ' + plata(Math.round(s.plata / 100) * 100) + '/mes', W - M - 12, y + 31, { align: 'right' }); }
      y += alto + 8;
    }
    y += 10;
  }

  // sucursales
  if (D.secciones.includes('sucursales') && D.rk.length) {
    espacio(40 + D.rk.length * 20);
    doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); texto('Comparación de sucursales', M, y); y += 18;
    const cols = [['Sucursal', M], ['% desperdicio', M + 170], ['kg a la basura', M + 280], ['$ recuperados', M + 400]];
    doc.setFontSize(8.5); doc.setTextColor(...gris); cols.forEach(([c, x]) => texto(c.toUpperCase(), x, y)); y += 8;
    doc.setDrawColor(...linea); doc.line(M, y, W - M, y); y += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...tinta);
    for (const s of D.rk) {
      texto(s.nombre, M, y); texto((s.pctDesp * 100).toFixed(1).replace('.', ',') + '%', M + 170, y); texto(dec(s.kgBasura), M + 280, y); texto(plata(s.recuperado), M + 400, y);
      y += 20;
    }
    y += 10;
  }

  // metodología
  espacio(60);
  doc.setTextColor(...tinta); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); texto('Cómo se calcula cada número', M, y); y += 16;
  doc.setFontSize(8.8);
  for (const [cifra, formula, fuente, estado] of METODOLOGIA) {
    const lin = doc.splitTextToSize(pdfTxt(`${formula}. Fuente: ${fuente}. ${estado}.`), W - M * 2 - 130);
    espacio(lin.length * 11 + 8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...tinta); texto(cifra, M, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...gris); doc.text(lin, M + 130, y);
    y += lin.length * 11 + 7;
  }
  y += 6; espacio(30);
  doc.setFontSize(8.5); doc.setTextColor(...gris);
  texto('Demo de validación: el historial es simulado y los precios de los planes son de ejemplo.', M, y);

  // pie en todas las páginas
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...linea); doc.line(M, 812, W - M, 812);
    doc.setFontSize(8); doc.setTextColor(...gris);
    texto(`Aprovecho · Nada se pierde, todo vale · generado el ${ddmm(new Date())}/${new Date().getFullYear()}`, M, 826);
    texto(`${i} / ${n}`, W - M, 826, { align: 'right' });
  }
  return doc.output('blob');
}

// ---------------------------------------------------------------------------
export async function entregar(blob, nombre) {
  const tipo = blob.type || (nombre.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
  const archivo = new File([blob], nombre, { type: tipo });
  const tactil = matchMedia('(pointer:coarse)').matches;
  if (tactil && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre }); return 'compartido'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'descargado';
}
