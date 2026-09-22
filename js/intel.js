// Historia simulada del comercio y todo el análisis que se hace sobre ella.
// Las pantallas y los reportes (Excel/PDF) usan estas mismas funciones: nunca
// hay un número en pantalla que no salga de acá.
import { rng, isoDia, sumarDias, DIAS, plata, num, dec, redondear100 } from './util.js';
import { CARTA_EJEMPLO, CONFIG } from './data.js';

export const SUCURSALES = [
  { id: 'olivos', nombre: 'Olivos', escala: 1, despPan: 1.9,
    zonas: [['Olivos', .38], ['Vicente López', .27], ['Florida', .21], ['Otros barrios', .14]] },
  { id: 'sanisidro', nombre: 'San Isidro', escala: 1.15, despPan: 1.0,
    zonas: [['San Isidro', .45], ['Martínez', .25], ['Beccar', .18], ['Otros barrios', .12]] },
  { id: 'martinez', nombre: 'Martínez', escala: .85, despPan: 1.4,
    zonas: [['Martínez', .41], ['San Isidro', .26], ['La Lucila', .17], ['Otros barrios', .16]] },
];
const P = Object.fromEntries(CARTA_EJEMPLO.map(p => [p.id, p]));

// demanda base por día (a escala 1) y cuánto se produce. dem: factor por día de semana (0=dom)
const LINEAS = [
  { id: 'medialuna', base: 140, sobra: 6, dem: [1.02, .99, .875, 1, .99, 1.03, 1.1], grupo: 6, tam: 'chico' },
  { id: 'factura', base: 90, sobra: 5, dem: [.86, 1, .97, 1, 1, 1.04, 1.1], grupo: 6, tam: 'chico' },
  { id: 'pan', base: 14, sobra: 1.1, dem: [.95, 1, .97, 1, 1, 1.03, 1.12], grupo: .9, tam: 'mediano' },
  { id: 'miga', base: 60, sobra: 5, dem: [1.05, .98, .98, 1, 1, 1.02, 1.12], grupo: 6, tam: 'chico' },
  { id: 'torta', base: 22, sobra: 3, dem: [1.15, .92, .95, .97, 1, 1.05, 1.2], grupo: 3, tam: 'mediano' },
];
const DIAS_HISTORIA = 425;
export const APLICADA = { id: 'prod-factura-0', linea: 'factura', dow: 0, menos: 12, haceDias: 24, suc: 'olivos' };

let memo = null;
export function historia(hoy = new Date()) {
  const clave = isoDia(hoy);
  if (memo && memo.clave === clave) return memo.dias;
  const dias = [];
  const inicio = sumarDias(hoy, -DIAS_HISTORIA);
  for (let i = 0; i < DIAS_HISTORIA; i++) {
    const d = sumarDias(inicio, i);
    const dia = isoDia(d), dow = d.getDay(), dom = d.getDate();
    const semanasAtras = Math.floor((DIAS_HISTORIA - i) / 7);
    for (const s of SUCURSALES) {
      const r = rng(dia + s.id);
      const reg = { dia, dow, dom, suc: s.id, lineas: {}, packs: [], merma: [], horas: [0, 0, 0, 0, 0], antes18: 0 };
      // hábito de publicar temprano mejora con el tiempo
      const pTemprano = semanasAtras > 10 ? .3 : .45;
      const mesFactor = dom <= 10 ? 1 : dom <= 20 ? .985 : .965;
      const packsMes = dom <= 10 ? 1 : dom <= 20 ? .95 : .77;
      const mejora = semanasAtras < 12 ? 1 - (12 - semanasAtras) * 0.0025 : 1;
      for (const L of LINEAS) {
        const prod = P[L.id];
        const ruido = 1 + (r() - .5) * .08;
        const demanda = L.base * s.escala * L.dem[dow] * mesFactor * ruido;
        let producido = (L.base * s.escala + L.sobra * s.escala * (L.id === 'pan' ? s.despPan : 1)) * (dow === 6 ? 1.1 : 1) * mejora;
        let reduccion = 0;
        if (L.id === APLICADA.linea && dow === APLICADA.dow && s.id === APLICADA.suc && (DIAS_HISTORIA - i) <= APLICADA.haceDias) {
          reduccion = APLICADA.menos; producido -= reduccion;
        }
        if (prod.u === 'u') producido = Math.round(producido);
        const vendido = Math.min(producido, prod.u === 'u' ? Math.round(demanda) : demanda);
        const sobrante = Math.max(0, producido - vendido);
        // packs con el sobrante
        let nPacks = Math.floor(sobrante / L.grupo + (prod.u === 'kg' ? .35 : 0));
        let grandes = 0;
        if (L.id === 'torta' && sobrante >= 4 && semanasAtras < 5) { grandes = 1; nPacks = Math.max(0, Math.floor((sobrante - 4) / 3)); }
        const temprano = r() < pTemprano;
        const hora = temprano ? 17 : 18 + Math.floor(r() * 2);
        const st = Math.min(1, (temprano ? .94 : .71) * packsMes * (1 + (r() - .5) * .1));
        const vend = Math.min(nPacks, Math.round(nPacks * st));
        const vendG = grandes && r() < .97 ? grandes : 0;
        const unidadPack = L.grupo;
        const valorPack = prod.precio * unidadPack;
        const precioPack = redondear100(valorPack * (1 - CONFIG.descuentoDefault));
        const pesoPack = (prod.u === 'kg' ? unidadPack * 1000 : prod.peso * unidadPack);
        if (nPacks) reg.packs.push({ linea: L.id, tam: L.tam, pub: nPacks, vend, precio: precioPack, valor: valorPack, pesoG: pesoPack, hora });
        if (grandes) {
          const valorG = prod.precio * 4;
          reg.packs.push({ linea: L.id, tam: 'grande', pub: grandes, vend: vendG, precio: redondear100(valorG * .5), valor: valorG, pesoG: prod.peso * 4, hora, minAgotado: 25 + Math.round(r() * 20) });
        }
        const enPacksVend = vend * unidadPack + vendG * 4;
        const aBasura = Math.max(0, sobrante - enPacksVend);
        const kgU = prod.u === 'kg' ? 1 : prod.peso / 1000;
        reg.lineas[L.id] = { producido, vendido, sobrante, rescatado: enPacksVend, basura: aBasura, kgProducido: producido * kgU, kgBasura: aBasura * kgU, kgRescatado: enPacksVend * kgU, reduccion, costoEvitado: reduccion * prod.costo };
        if (aBasura > 0) reg.merma.push({ motivo: 'Sobró de producción', linea: L.id, kg: aBasura * kgU });
        const packsVendidosHoy = vend + vendG;
        const pesos = dow === 5 || dow === 6 ? [.08, .22, .38, .26, .06] : [.12, .28, .30, .22, .08];
        for (let h = 0; h < 5; h++) reg.horas[h] += packsVendidosHoy * pesos[h];
        if (temprano) reg.antes18 += nPacks;
      }
      reg.merma.push({ motivo: 'Recorte de preparación', linea: null, kg: (.25 + r() * .5) * s.escala });
      const vencidos = Math.round(r() * 4 * s.escala);
      if (vencidos) reg.merma.push({ motivo: 'Se venció', linea: 'miga', kg: vencidos * P.miga.peso / 1000 });
      if (r() < .18) reg.merma.push({ motivo: 'Se quemó o se rompió', linea: 'pan', kg: .2 + r() * .6 });
      dias.push(reg);
    }
  }
  memo = { clave, dias };
  return dias;
}

// ---------- filtros ----------
export function periodoDias(periodo, hoy = new Date()) {
  if (periodo && periodo.desde) return { desde: periodo.desde, hasta: periodo.hasta };
  const n = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : periodo === '10sem' ? 70 : DIAS_HISTORIA;
  return { desde: isoDia(sumarDias(hoy, -n)), hasta: isoDia(sumarDias(hoy, -1)) };
}
export function filtrar(periodo, suc, hoy) {
  const { desde, hasta } = periodoDias(periodo, hoy);
  return historia(hoy).filter(d => d.dia >= desde && d.dia <= hasta && (suc === 'todas' || d.suc === suc));
}

// ---------- resumen de un conjunto de días ----------
export function resumen(dias) {
  const r = { packsPub: 0, packsVend: 0, recuperado: 0, kgRescatado: 0, kgBasura: 0, kgProducido: 0, costoEvitado: 0, mermaKg: 0, porMotivo: {} };
  for (const d of dias) {
    for (const p of d.packs) { r.packsPub += p.pub; r.packsVend += p.vend; r.recuperado += p.vend * p.precio; r.kgRescatado += p.vend * p.pesoG / 1000; }
    for (const k in d.lineas) { const l = d.lineas[k]; r.kgProducido += l.kgProducido; r.costoEvitado += l.costoEvitado; }
    for (const m of d.merma) { r.mermaKg += m.kg; r.porMotivo[m.motivo] = (r.porMotivo[m.motivo] || 0) + m.kg; }
  }
  r.kgBasura = r.mermaKg;
  r.pctVend = r.packsPub ? r.packsVend / r.packsPub : 0;
  r.pctDesp = r.kgProducido ? r.kgBasura / r.kgProducido : 0;
  r.co2 = r.kgRescatado * CONFIG.factorCO2;
  return r;
}

// agrupado por día calendario (suma sucursales)
export function porDia(dias) {
  const m = new Map();
  for (const d of dias) {
    if (!m.has(d.dia)) m.set(d.dia, []);
    m.get(d.dia).push(d);
  }
  return [...m.entries()].map(([dia, regs]) => ({ dia, ...resumen(regs) }));
}

// últimas n semanas, de la más vieja a la más nueva
export function semanas(suc, n = 7, hoy = new Date()) {
  const todos = filtrar({ desde: isoDia(sumarDias(hoy, -n * 7)), hasta: isoDia(sumarDias(hoy, -1)) }, suc, hoy);
  const out = [];
  for (let i = n; i >= 1; i--) {
    const desde = isoDia(sumarDias(hoy, -i * 7)), hasta = isoDia(sumarDias(hoy, -(i - 1) * 7 - 1));
    out.push({ desde, ...resumen(todos.filter(d => d.dia >= desde && d.dia <= hasta)) });
  }
  return out;
}

// ---------- estadísticas (B-18 / B-19) ----------
export function estadisticas(suc, periodo, hoy) {
  const dias = filtrar(periodo, suc, hoy);
  const calor = Array.from({ length: 5 }, () => Array(7).fill(0));
  const tam = { chico: 0, mediano: 0, grande: 0 };
  const zonas = {};
  const tercios = [[0, 0], [0, 0], [0, 0]]; // [vendidos, publicados]
  const sucs = suc === 'todas' ? SUCURSALES : SUCURSALES.filter(s => s.id === suc);
  for (const d of dias) {
    const dow = (d.dow + 6) % 7; // lunes primero
    d.horas.forEach((v, h) => { calor[h][dow] += v; });
    let vendDia = 0, pubDia = 0;
    for (const p of d.packs) { tam[p.tam] += p.vend; vendDia += p.vend; pubDia += p.pub; }
    const s = SUCURSALES.find(x => x.id === d.suc);
    for (const [z, sh] of s.zonas) zonas[z] = (zonas[z] || 0) + vendDia * sh;
    const t = d.dom <= 10 ? 0 : d.dom <= 20 ? 1 : 2;
    tercios[t][0] += vendDia; tercios[t][1] += pubDia;
  }
  const maxCalor = Math.max(...calor.flat(), 1);
  const totTam = tam.chico + tam.mediano + tam.grande || 1;
  const totZ = Object.values(zonas).reduce((a, b) => a + b, 0) || 1;
  const zonasOrd = Object.entries(zonas).sort((a, b) => b[1] - a[1]);
  const otros = zonasOrd.filter(z => z[0] === 'Otros barrios');
  const lista = [...zonasOrd.filter(z => z[0] !== 'Otros barrios').slice(0, 4), ...otros].map(([z, v]) => [z, v / totZ]);
  const porDiaTercio = tercios.map(([v, n]) => (n ? v / n : 0)); // % vendido
  // pico
  let pico = [0, 0];
  calor.forEach((f, h) => f.forEach((v, dw) => { if (v > calor[pico[0]][pico[1]]) pico = [h, dw]; }));
  return {
    calor: calor.map(f => f.map(v => v / maxCalor)), pico,
    tam: { chico: tam.chico / totTam, mediano: tam.mediano / totTam, grande: tam.grande / totTam },
    zonas: lista, tercios: porDiaTercio,
    caidaFinMes: porDiaTercio[0] ? 1 - porDiaTercio[2] / porDiaTercio[0] : 0,
  };
}

// ---------- ranking de sucursales (B-20) ----------
export function ranking(periodo, hoy) {
  const filas = SUCURSALES.map(s => {
    const act = resumen(filtrar(periodo, s.id, hoy));
    const prevPer = periodo === 'semana' ? 7 : 30;
    const prev = resumen(filtrar({ desde: isoDia(sumarDias(hoy, -prevPer * 2)), hasta: isoDia(sumarDias(hoy, -prevPer - 1)) }, s.id, hoy));
    const pan = panRatio(periodo, s.id, hoy);
    return { ...s, ...act, delta: act.pctDesp - prev.pctDesp, panRatio: pan };
  }).sort((a, b) => a.pctDesp - b.pctDesp);
  return filas;
}
function panRatio(periodo, suc, hoy) {
  let b = 0, p = 0;
  for (const d of filtrar(periodo, suc, hoy)) { const l = d.lineas.pan; b += l.kgBasura + 0; p += l.kgProducido; }
  const sob = filtrar(periodo, suc, hoy).reduce((a, d) => a + d.lineas.pan.sobrante, 0);
  return p ? sob / p : 0;
}

// ---------- sugerencias ----------
const NOMBRE_LINEA = { medialuna: 'medialunas', factura: 'facturas', pan: 'kg de pan de campo', miga: 'sándwiches de miga', torta: 'porciones de torta' };
const confianzaDe = pct => (pct >= .8 ? 'alta' : pct >= .6 ? 'media' : 'baja');
const diasPl = dow => DIAS[dow] + (dow === 0 || dow === 6 ? 's' : '');

const cacheSug = new Map();
export function sugerencias(suc, hoy = new Date(), estados = {}) {
  const clave = suc + '|' + isoDia(hoy) + '|' + JSON.stringify(estados);
  if (!cacheSug.has(clave)) { if (cacheSug.size > 20) cacheSug.clear(); cacheSug.set(clave, calcularSugerencias(suc, hoy, estados)); }
  return cacheSug.get(clave).map(s => ({ ...s }));
}
function calcularSugerencias(suc, hoy, estados) {
  const dias = filtrar('10sem', suc, hoy);
  const out = [];
  const nSuc = suc === 'todas' ? SUCURSALES.length : 1;

  // 1) producción: el día de la semana en que más sobra de algo
  let mejor = null;
  for (const L of LINEAS) {
    const porDow = Array.from({ length: 7 }, () => []);
    const sem = new Map();
    for (const d of dias) {
      const k = d.dia + '|' + d.dow;
      if (!sem.has(k)) sem.set(k, { dow: d.dow, v: 0, dia: d.dia });
      sem.get(k).v += d.lineas[L.id].sobrante / nSuc;
    }
    for (const x of sem.values()) porDow[x.dow].push(x);
    for (let dow = 0; dow < 7; dow++) {
      if (L.id === APLICADA.linea && dow === APLICADA.dow) continue;
      const vals = porDow[dow].map(x => x.v);
      if (vals.length < 6) continue;
      const media = vals.reduce((a, b) => a + b, 0) / vals.length;
      const otros = porDow.filter((_, i) => i !== dow).flat().map(x => x.v);
      const mediaOtros = otros.reduce((a, b) => a + b, 0) / otros.length;
      const menos = P[L.id].u === 'kg' ? Math.round((media - mediaOtros) * 10) / 10 : Math.round(media - mediaOtros);
      if (menos <= 0) continue;
      const cumple = vals.filter(v => v > mediaOtros + menos / 2).length / vals.length;
      const valor = menos * P[L.id].costo * 4.33 * nSuc;
      if (!mejor || valor > mejor.valor) mejor = { L, dow, media, mediaOtros, menos, cumple, n: vals.length, valor, porDow: porDow.map(a => a.length ? a.reduce((s, x) => s + x.v, 0) / a.length : 0), vals };
    }
  }
  if (mejor) {
    const { L, dow, menos, cumple, n, valor, porDow, vals, mediaOtros } = mejor;
    const prod = P[L.id];
    const unidad = prod.u === 'kg' ? dec(menos) + ' ' + NOMBRE_LINEA[L.id] : num(menos) + ' ' + NOMBRE_LINEA[L.id];
    const min = Math.min(...vals), max = Math.max(...vals);
    const kgMes = (prod.u === 'kg' ? menos : menos * prod.peso / 1000) * 4.33 * nSuc;
    out.push({
      id: `prod-${L.id}-${dow}`, tipo: 'Producción',
      titulo: `Los ${diasPl(dow)} hacé ${unidad} menos`,
      porque: `En las últimas ${n} semanas, los ${diasPl(dow)} te sobraron entre ${fmtCant(min, prod)} y ${fmtCant(max, prod)}. El resto de los días, un promedio de ${fmtCant(mediaOtros, prod)}.`,
      cuenta: [`${fmtCant(menos, prod)} × ${plata(prod.costo)} de costo × 4,33 ${diasPl(dow)}${nSuc > 1 ? ' × ' + nSuc + ' sucursales' : ''} = ${plata(valor)}/mes`,
        `${fmtCant(menos, prod)} × ${prod.u === 'kg' ? '1 kg' : prod.peso + ' g'} × 4,33${nSuc > 1 ? ' × ' + nSuc : ''} = ${dec(kgMes)} kg/mes`],
      plata: valor, kg: kgMes, confPct: cumple, confianza: confianzaDe(cumple), semanas: n,
      grafico: { titulo: `${cap(NOMBRE_LINEA[L.id])} que sobraron por día · promedio de ${n} semanas`, labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], valores: [1, 2, 3, 4, 5, 6, 0].map(i => porDow[i]), destacar: [1, 2, 3, 4, 5, 6, 0].indexOf(dow), fmt: v => fmtCant(v, prod, true) },
      accion: `Te avisamos cada ${DIAS[dow]} a las 6:00 para ajustar la tanda. En 2 semanas comparamos el sobrante de antes y después.`,
    });
  }

  // 2) ventas: publicar antes de las 18
  let pubA = 0, vendA = 0, pubD = 0, vendD = 0, precioProm = 0, np = 0;
  for (const d of dias) for (const p of d.packs) {
    if (p.hora < 18) { pubA += p.pub; vendA += p.vend; } else { pubD += p.pub; vendD += p.vend; }
    precioProm += p.precio * p.pub; np += p.pub;
  }
  if (pubA > 20 && pubD > 20) {
    const stA = vendA / pubA, stD = vendD / pubD;
    const semanasN = 10;
    const extra = (stA - stD) * pubD * (precioProm / np) / semanasN * 4.33;
    const pct = Math.min(.79, .55 + (pubA / (pubA + pubD)) * .5);
    out.push({
      id: 'ventas-18', tipo: 'Ventas', titulo: 'Publicá los packs antes de las 18:00',
      porque: `Los packs publicados antes de las 18 se vendieron en un ${Math.round(stA * 100)}%. Los publicados después, en un ${Math.round(stD * 100)}%. El ${Math.round(pubD / (pubA + pubD) * 100)}% de tus packs sale después de las 18.`,
      cuenta: [`(${Math.round(stA * 100)}% − ${Math.round(stD * 100)}%) × ${num(pubD / semanasN * 4.33)} packs/mes que hoy publicás tarde × ${plata(precioProm / np)} = ${plata(extra)}/mes`],
      plata: extra, kg: (stA - stD) * pubD / semanasN * 4.33 * .35, confPct: pct, confianza: confianzaDe(pct), semanas: semanasN,
      grafico: { titulo: 'Qué porcentaje de los packs se vendió, según la hora de publicación', labels: ['Antes de las 18', 'Después'], valores: [stA * 100, stD * 100], destacar: 0, fmt: v => Math.round(v) + '%' },
      accion: 'Te avisamos a las 17:00 si todavía no publicaste nada.',
    });
  }

  // 3) ventas: fin de mes
  const est = estadisticas(suc, 'todo', hoy);
  if (est.caidaFinMes > .12) {
    out.push({
      id: 'ventas-finmes', tipo: 'Ventas', titulo: 'A fin de mes, publicá packs más chicos',
      porque: `Del día 21 en adelante se vende el ${Math.round(est.tercios[2] * 100)}% de los packs que publicás; en los primeros 10 días, el ${Math.round(est.tercios[0] * 100)}%. Pasa todos los meses del último año.`,
      cuenta: ['Con packs chicos el precio baja y se sigue vendiendo, en vez de que el pack grande quede sin salir.'],
      plata: finMesPlata(suc, hoy, est), kg: finMesPlata(suc, hoy, est) / 2500 * .3, confPct: .86, confianza: 'alta', semanas: 52,
      grafico: { titulo: 'Qué porcentaje de los packs se vende, según la parte del mes', labels: ['Días 1–10', '11–20', '21–31'], valores: est.tercios.map(v => v * 100), destacar: 2, fmt: v => Math.round(v) + '%' },
      accion: 'Del 21 en adelante, la IA te va a proponer packs chicos por defecto.',
    });
  }

  // 4) finanzas: el pack grande se agota rápido (pocos datos)
  const grandes = dias.flatMap(d => d.packs.filter(p => p.tam === 'grande' && p.minAgotado));
  if (grandes.length >= 5) {
    const minProm = grandes.reduce((a, p) => a + p.minAgotado, 0) / grandes.length;
    const precioAct = grandes[grandes.length - 1].precio;
    const nuevo = redondear100(precioAct * 1.15);
    out.push({
      id: 'fin-grande', tipo: 'Finanzas', titulo: `Probá el pack grande a ${plata(nuevo)}`,
      porque: `El pack grande de torta se agota en ${Math.round(minProm)} minutos en promedio. Hay pocos datos (5 semanas): probalo 2 semanas y medimos si se sigue vendiendo.`,
      cuenta: [`(${plata(nuevo)} − ${plata(precioAct)}) × ${num(grandes.length / 10 * 4.33)} packs grandes/mes = ${plata((nuevo - precioAct) * grandes.length / 10 * 4.33)}/mes`],
      plata: (nuevo - precioAct) * grandes.length / 10 * 4.33, kg: 0, confPct: .5, confianza: 'baja', semanas: 5, experimento: true,
      grafico: { titulo: 'Minutos hasta que se agota el pack grande', labels: grandes.slice(-6).map((_, i) => 'S' + (i + 1)), valores: grandes.slice(-6).map(p => p.minAgotado), destacar: -1, fmt: v => Math.round(v) + "'" },
      accion: 'Durante 2 semanas publicamos el pack grande al precio nuevo y comparamos cuánto tarda en venderse.',
    });
  }

  // 5) sucursales: la que más pan tira
  if (suc === 'todas') {
    const rk = ranking('mes', hoy);
    const peor = [...rk].sort((a, b) => b.panRatio - a.panRatio)[0];
    const mejorS = [...rk].sort((a, b) => a.panRatio - b.panRatio)[0];
    const veces = peor.panRatio / mejorS.panRatio;
    const kgMes = (peor.panRatio - mejorS.panRatio) * 14 * peor.escala * 30;
    out.push({
      id: 'suc-pan', tipo: 'Producción', titulo: `En ${peor.nombre}, ajustá la tanda de pan de la tarde`,
      porque: `${peor.nombre} tira ${dec(veces)} veces más pan que ${mejorS.nombre} por cada kg que produce. Mismo producto, misma receta: la diferencia está en cuánto se hornea.`,
      cuenta: [`Llevar ${peor.nombre} al nivel de ${mejorS.nombre}: ${dec(kgMes)} kg/mes × ${plata(P.pan.costo)} = ${plata(kgMes * P.pan.costo)}/mes`],
      plata: kgMes * P.pan.costo, kg: kgMes, confPct: .83, confianza: 'alta', semanas: 10,
      grafico: { titulo: 'Pan que sobra por cada kg producido', labels: rk.map(s => s.nombre), valores: rk.map(s => s.panRatio * 100), destacar: rk.indexOf(peor), fmt: v => dec(v) + '%' },
      accion: `Te avisamos en ${peor.nombre} a las 14:00 con la cantidad sugerida para la tanda de la tarde.`,
    });
  }

  // la ya aplicada, con su resultado medido
  const prodF = P.factura;
  const { antes, despues } = efectoAplicada(hoy);
  out.push({
    id: APLICADA.id, tipo: 'Producción', titulo: 'Los domingos hacé 12 facturas menos', aplicadaBase: true,
    porque: `La aplicaste hace ${APLICADA.haceDias} días en Olivos. El sobrante de los domingos bajó de ${antes} a ${despues} facturas.`,
    cuenta: [`12 × ${plata(prodF.costo)} de costo × 4,33 domingos = ${plata(12 * prodF.costo * 4.33)}/mes`],
    plata: 12 * prodF.costo * 4.33, kg: 12 * prodF.peso / 1000 * 4.33, confPct: .9, confianza: 'alta', semanas: 10,
    grafico: { titulo: 'Facturas que sobraron los domingos', labels: ['Antes', 'Después'], valores: [antes, despues], destacar: 1, fmt: v => num(v) },
    accion: '',
  });

  for (const s of out) {
    const e = estados[s.id];
    s.estado = s.aplicadaBase ? 'funciono' : e ? e.estado : 'nueva';
    s.motivo = e?.motivo; s.desde = e?.desde;
  }
  const peso = s => ({ nueva: 0, en_prueba: 1, funciono: 2, descartada: 3 })[s.estado];
  const confN = { alta: 3, media: 2, baja: 1 };
  return out.sort((a, b) => peso(a) - peso(b) || (b.plata * confN[b.confianza]) - (a.plata * confN[a.confianza]));
}

// packs de fin de mes que hoy no se venden y con packs chicos sí se venderían (se recupera la mitad de la brecha)
function finMesPlata(suc, hoy, est) {
  const dias = filtrar('mes', suc, hoy).filter(d => d.dom > 20);
  let pub = 0, precio = 0;
  for (const d of dias) for (const p of d.packs) { pub += p.pub; precio += p.precio * p.pub; }
  if (!pub) return 0;
  const brecha = Math.max(0, est.tercios[0] - est.tercios[2]);
  return pub * brecha * .5 * (precio / pub);
}

function fmtCant(v, prod, corto) {
  if (prod.u === 'kg') return dec(v) + ' kg';
  return num(v) + (corto ? '' : '');
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// sobrante promedio de facturas los domingos en Olivos, antes y después de aplicar
function efectoAplicada(hoy) {
  const lim = isoDia(sumarDias(hoy, -APLICADA.haceDias));
  const desde = isoDia(sumarDias(hoy, -APLICADA.haceDias - 70));
  const dom = historia(hoy).filter(d => d.suc === APLICADA.suc && d.dow === APLICADA.dow && d.dia >= desde);
  const prom = a => (a.length ? a.reduce((x, d) => x + d.lineas[APLICADA.linea].sobrante, 0) / a.length : 0);
  return { antes: Math.round(prom(dom.filter(d => d.dia < lim))), despues: Math.round(prom(dom.filter(d => d.dia >= lim))) };
}

export function costoEvitado(suc, hoy) {
  return resumen(filtrar('mes', suc, hoy)).costoEvitado;
}

// ---------- metodología (se muestra en la app y se exporta) ----------
export const METODOLOGIA = [
  ['$ recuperados', 'Σ precio del pack × packs vendidos − comisión', 'Ventas en la app', CONFIG.comision == null ? 'Comisión pendiente: se muestra bruto' : 'Neto de comisión'],
  ['Costo evitado', 'Unidades que se dejaron de producir × costo unitario', 'Sugerencias aplicadas + costo del sistema de ventas', 'Solo Intelligence'],
  ['kg rescatados', 'Básico: unidades × peso por unidad de la carta. Smart: kg de la balanza', 'Foto + carta / estación', 'En Básico es estimado'],
  ['CO2e evitado', 'kg rescatados × ' + String(CONFIG.factorCO2).replace('.', ',') + ' kg CO2e por kg', 'Factor de relleno', 'PENDIENTE: falta elegir fuente (FAO, WRAP u otra)'],
  ['Equivalencia en km', 'CO2e ÷ ' + String(CONFIG.kgCO2PorKm).replace('.', ',') + ' kg por km', 'Auto promedio', 'Referencia a validar'],
  ['% vendido', 'Packs vendidos ÷ packs publicados', 'App', '—'],
  ['% de desperdicio', 'kg a la basura ÷ kg producidos', 'Estación + sistema de ventas', 'Solo Intelligence'],
  ['Nutrición', 'Peso × valores cada 100 g del producto, ±15%', 'Valores de referencia aproximados, a validar con USDA FoodData Central', 'Rango, no apto para alergias'],
  ['Ahorro del consumidor', 'Valor en carta − precio pagado', 'Carta + app', '—'],
];
