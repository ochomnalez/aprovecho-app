// Pantallas del comercio (Básico y Smart) + reportes. Intelligence vive en intelui.js.
import { esc, plata, dec, num, kg, gramos, pct, hhmm, pad, vibrar, esperar, uid, isoDia, sumarDias, DIAS_CORTO, ddmm, MESES } from './util.js';
import { icon } from './icons.js';
import { S, guardar, ahora, hoy, comercio, miComercio, producto, evento, tienePlan, ZONA_NORTE, ubicar, reiniciar } from './store.js';
import { CONFIG, PLANES, CONDICIONES, TAMANOS, RECONOCIMIENTO, armarPacks, agrupar, co2, kmAuto, MOTIVOS_MERMA } from './data.js';
import { barra, tabsComercio, abrirHoja, cerrarHoja, toast, vacio, badgeDato, nota, demoPill, barras, confirmar } from './ui.js';
import { fotoSvg, foto, cajaPct, MUESTRAS, nombreMuestra } from './fotos.js';
import { filtrar, resumen, porDia, SUCURSALES, sugerencias } from './intel.js';
import { leerPayload, escanear, detener } from './qr.js';
import { datosReporte, armarExcel, armarPdf, entregar, nombreArchivo, seccionesDisponibles } from './export.js';
import { nav } from './nav.js';
import { sumarAlPerfil, retiroTxt } from './cliente.js';
import { instalarUI } from './pwa.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const cierre = () => miComercio()?.cierre || '21:00';
function limite() {
  const [h, m] = cierre().split(':').map(Number);
  const d = new Date(ahora()); d.setHours(h - CONFIG.horasAnticipacion, m, 0, 0);
  return d;
}
const minutosAlLimite = () => Math.round((limite() - ahora()) / 60000);
const puedePublicar = () => minutosAlLimite() > 0;
const misPacksHoy = () => S.packs.filter(p => p.comercioId === 'c1' && p.dia === hoy() && !String(p.id).startsWith('ps'));
const semillaMia = () => S.packs.filter(p => p.comercioId === 'c1' && p.dia === hoy() && String(p.id).startsWith('ps'));
const reservasMias = () => S.reservas.filter(r => r.comercioId === 'c1' && r.dia === hoy());
const porRetirar = () => reservasMias().filter(r => r.estado === 'activa').length + (S.externas || []).filter(x => x.dia === hoy() && x.estado === 'activa').length;
const tabs = activa => tabsComercio(activa, porRetirar());
const nombrePlan = () => PLANES[S.plan].nombre;
const sucLocal = () => (tienePlan('intelligence') ? ' · Olivos' : '');

function asegurarComercios() {
  if (!S.ubic) ubicar({ ...ZONA_NORTE });
  if (!S.comercios.length) ubicar(S.ubic);
}

// ---------------------------------------------------------------------------
// Alta (B-01 a B-03)
// ---------------------------------------------------------------------------
function altaPlan() {
  const card = k => {
    const pl = PLANES[k], pr = CONFIG.precios[k], on = S.plan === k;
    return `<button class="card toque${on ? ' sel' : ''}" data-act="plan-alta" data-v="${k}" style="text-align:left" aria-pressed="${on}">
      <div class="fila entre"><h3 style="font-size:19px">${pl.nombre}</h3>${k === 'basico' ? '<span class="badge">Para empezar</span>' : ''}</div>
      <p class="chico">${esc(pl.lema)}</p>
      <div class="fila entre"><span class="fuerte verde">${esc(pr.txt)}</span><span class="mini">${esc(pr.sub)}</span></div>
    </button>`;
  };
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Paso 1 de 3', centro: true })}
    <div class="cuerpo">
      <h1 class="gran-titulo">Elegí tu plan</h1>
      <p class="subtitulo" style="margin-top:0">Lo podés cambiar cuando quieras.</p>
      ${card('basico')}${card('smart')}${card('intelligence')}
      <p class="mini">Precios de ejemplo. La comisión por pack todavía no está definida.</p>
      <button class="btn bloque" data-go="b/carta">Seguir con ${nombrePlan()}</button>
    </div>`,
  };
}

let cartaLeida = false;
function altaCarta() {
  const faltan = S.carta.filter(p => p.precio == null);
  const lista = S.carta.map(p => `<button class="item" data-act="editar-precio" data-id="${p.id}">
    <span class="col crece"><span class="fuerte trunc">${esc(p.nombre)}</span><span class="mini">${esc(p.cat)} · ${p.u === 'kg' ? 'por kg' : gramos(p.peso) + ' por unidad'}</span></span>
    ${p.precio == null ? '<span class="badge horno">No pude leer el precio</span>' : `<span class="fuerte">${plata(p.precio)}${p.u === 'kg' ? '/kg' : ''}</span>`}
  </button>`).join('');
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Paso 2 de 3', centro: true })}
    <div class="cuerpo">
      <h1 class="gran-titulo">Cargá tu carta</h1>
      <p class="subtitulo" style="margin-top:0">Una sola vez. Con esto la IA sabe el precio y el peso de cada cosa que fotografíes.</p>
      ${cartaLeida ? `
        <div class="card suave fila" style="gap:12px">${icon('check', 22, 'verde')}<span class="crece"><b>Leí ${S.carta.length} productos.</b> Revisá los que están marcados.</span></div>
        <div class="lista">${lista}</div>
        <p class="mini">El peso por unidad es sugerido por la IA. Si lo corregís, los packs salen más exactos.</p>
        <button class="btn bloque${faltan.length ? ' off' : ''}" data-go="b/local">${faltan.length ? `Falta ${faltan.length} precio` : 'Guardar carta'}</button>
      ` : `
        <div class="foto" style="aspect-ratio:4/3">${pizarra()}</div>
        <button class="btn bloque" data-act="leer-carta">${icon('camara', 20)} Sacarle foto a mi lista de precios</button>
        <button class="btn bloque sec" data-act="leer-carta">Usar la carta de ejemplo</button>
        ${nota('También sirve la pizarra, el menú impreso o una captura de tu sistema de ventas.')}
      `}
    </div>`,
  };
}
function pizarra() {
  const lineas = S.carta.slice(0, 9).map((p, i) => `<text x="36" y="${58 + i * 26}" fill="#F2EFE6" font-family="Segoe Print, Comic Sans MS, cursive" font-size="16">${esc(p.nombre.replace(/ \(.*\)/, ''))}</text><text x="364" y="${58 + i * 26}" fill="#F2EFE6" font-family="Segoe Print, Comic Sans MS, cursive" font-size="16" text-anchor="end">${p.precio ? '$' + num(p.precio) : '$ ?'}</text>`).join('');
  return `<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#8B6A43"/><rect x="14" y="14" width="372" height="272" rx="6" fill="#2E3B32"/><text x="200" y="36" fill="#E7C27E" font-family="Segoe Print, Comic Sans MS, cursive" font-size="17" text-anchor="middle">LA ESPIGA</text>${lineas}</svg>`;
}

function altaLocal() {
  const c = miComercio();
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Paso 3 de 3', centro: true })}
    <div class="cuerpo">
      <h1 class="gran-titulo">Tu local</h1>
      <div class="campo"><label for="nom-local">Nombre</label><input class="input" id="nom-local" value="${esc(c.nombre)}" maxlength="40"></div>
      <div class="campo"><label for="cierre">Hora de cierre</label>
        <select class="input" id="cierre">${['20:00', '20:30', '21:00', '21:30', '22:00'].map(h => `<option${h === c.cierre ? ' selected' : ''}>${h}</option>`).join('')}</select></div>
      <div class="nota">${icon('reloj', 18)}<span>Los packs se publican hasta <b>2 horas antes</b> del cierre, para que siempre se puedan retirar el mismo día.</span></div>
      <div class="campo"><div class="fila entre"><label for="desc">Descuento por defecto</label><span class="fuerte verde" id="desc-v">${Math.round(S.descuento * 100)}%</span></div>
        <input class="rango" id="desc" type="range" min="40" max="70" step="5" value="${Math.round(S.descuento * 100)}"></div>
      <div class="campo"><label>¿Qué podés ofrecer a veces?</label>
        <div class="chips">${CONDICIONES.map(x => `<button class="chip${S.condLocal.includes(x) ? ' on' : ''}" data-act="cond-local" data-v="${x}">${x}</button>`).join('')}</div>
        <span class="mini">Esto solo habilita la opción. En cada pack la marcás vos, si corresponde.</span></div>
      <button class="btn bloque" data-act="terminar-alta">Terminar</button>
    </div>`,
    montar: el => {
      const r = el.querySelector('#desc');
      r.addEventListener('input', () => { el.querySelector('#desc-v').textContent = r.value + '%'; });
    },
  };
}

// ---------------------------------------------------------------------------
// Hoy (B-04)
// ---------------------------------------------------------------------------
function hoyPantalla() {
  const mios = misPacksHoy();
  const todos = [...semillaMia(), ...mios];
  const publicados = todos.reduce((a, p) => a + (p.stockInicial || p.stock + (p.vendidos || 0)), 0);
  const vendidos = todos.reduce((a, p) => a + (p.vendidos || 0), 0);
  const recuperado = todos.reduce((a, p) => a + (p.vendidos || 0) * p.precio, 0);
  const min = minutosAlLimite();
  const ult = S.capturas.filter(c => c.tipo === 'pesaje' && c.dia === hoy()).slice(-1)[0];
  const sugN = tienePlan('intelligence') ? sugerencias(S.sucursal, ahora(), S.sugerencias).filter(s => s.estado === 'nueva').length : 0;
  const activos = todos.filter(p => p.estado === 'activo' || p.estado === 'agotado');
  return {
    tabs: tabs('b/hoy'), clase: 'con-tabs gris',
    html: `<header class="barra" style="background:var(--fondo-2)"><div class="titulo" style="font-size:20px">${esc(miComercio().nombre.replace('Panadería ', ''))}<span class="mini" style="display:block;font-family:var(--ui);font-weight:700;letter-spacing:0">Hoy · ${nombrePlan()}${sucLocal()}</span></div>${demoPill()}</header>
    <div class="cuerpo">
      ${min > 0 ? `<div class="card aviso fila entre">
          <span class="col"><span class="fuerte">Publicá antes de las ${hhmm(limite())}</span><span class="chico">Cerrás a las ${cierre()}</span></span>
          <span class="badge horno">${min >= 60 ? `Faltan ${Math.floor(min / 60)} h ${pad(min % 60)}` : `Faltan ${min} min`}</span></div>`
        : `<div class="card plana fila">${icon('reloj', 22)}<span class="col"><span class="fuerte">Ya pasó el límite de hoy</span><span class="chico">Lo que sobre se puede publicar mañana. ${tienePlan('smart') ? 'La estación sigue registrando lo que se tira.' : ''}</span></span></div>`}
      <div class="card">
        <h2>¿Qué te sobró hoy?</h2>
        <p class="chico" style="margin-top:-4px">Sacale una foto y la IA arma los packs.</p>
        <button class="btn bloque${min > 0 ? '' : ' off'}" data-go="b/camara">${icon('camara', 20)} Sacar foto</button>
      </div>
      ${tienePlan('smart') ? `<button class="card toque" data-go="b/estacion" style="text-align:left">
        <div class="fila entre"><span class="fila" style="gap:8px">${icon('balanza', 22, 'verde')}<span class="fuerte">Estación de cocina</span></span><span class="badge">● Conectada</span></div>
        <span class="chico">${ult ? `${hhmm(new Date(ult.t))} · ${dec(ult.kg)} kg de ${esc(ult.producto)} → ${ult.destino === 'basura' ? 'a la basura' : 'para vender'}` : 'Apoyá lo que sobra: la estación lo pesa, lo reconoce y lo publica.'}</span>
      </button>` : ''}
      ${sugN ? `<button class="card toque verde" data-tab="b/intel" style="text-align:left"><div class="fila entre"><span class="fila" style="gap:8px">${icon('chispa', 22)}<span class="fuerte">${sugN} sugerencias nuevas</span></span>${icon('adelante', 20)}</div><span class="chico">Intelligence encontró patrones en tu desperdicio.</span></button>` : ''}
      <div class="stats">
        <div class="stat"><span class="n">${publicados}</span><span class="k">Publicados</span></div>
        <div class="stat"><span class="n">${vendidos}</span><span class="k">Vendidos</span></div>
        <div class="stat"><span class="n">${porRetirar()}</span><span class="k">A retirar</span></div>
      </div>
      <div class="card fila entre"><span class="col"><span class="chico">$ recuperados hoy</span><span class="mini">lo cobrado por packs</span></span><span class="kpi"><span class="n md verde">${plata(recuperado)}</span></span></div>
      <div class="seccion"><h3>Tus packs de hoy</h3></div>
      ${activos.length ? `<div class="lista">${activos.map(p => `<button class="item" data-act="opciones-pack" data-id="${p.id}">
        <span class="ic-caja">${icon(p.origen === 'estacion' ? 'balanza' : 'camara', 20)}</span>
        <span class="col crece"><span class="fuerte trunc">${esc(p.titulo || 'Pan de campo')}</span><span class="mini">${TAMANOS[p.tam]} · ${plata(p.precio)} · ${p.vendidos || 0} de ${p.stockInicial || p.stock + (p.vendidos || 0)} vendidos</span></span>
        ${p.estado === 'agotado' ? '<span class="badge">Agotado</span>' : `<span class="badge gris">Quedan ${p.stock}</span>`}</button>`).join('')}</div>`
        : vacio('camara', 'Todavía no publicaste nada hoy', 'Cuando saques la primera foto, tus packs aparecen acá.')}
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Publicar con foto (B-05 a B-09)
// ---------------------------------------------------------------------------
let flujo = null;
function camara() {
  const puede = puedePublicar();
  return {
    html: `${barra({ titulo: 'Foto del excedente', cerrar: true, centro: true })}
    <div class="cuerpo">
      ${puede ? '' : nota('Pasó el límite de publicación de hoy (2 horas antes del cierre). Para la demo podés volver a la hora simulada desde Cuenta.', 'reloj', 'horno')}
      <label class="card toque${puede ? '' : ' off'}" style="align-items:center;text-align:center;padding:26px 16px;gap:8px;background:var(--verde-50);box-shadow:inset 0 0 0 1.5px var(--verde-200)">
        <span class="ok-grande" style="width:74px;height:74px;box-shadow:none;animation:none">${icon('camara', 34)}</span>
        <span class="fuerte" style="font-size:18px">Sacar una foto</span>
        <span class="chico">Poné todo junto y sacá de arriba, con buena luz.</span>
        <input type="file" accept="image/*" capture="environment" data-act-change="foto-propia" hidden ${puede ? '' : 'disabled'}>
      </label>
      <label class="btn bloque sec${puede ? '' : ' off'}">${icon('galeria', 20)} Elegir de la galería<input type="file" accept="image/*" data-act-change="foto-propia" hidden></label>
      <div class="seccion"><h3>O probá con una foto de muestra</h3></div>
      <div class="muestras">${MUESTRAS.map(id => `<button class="muestra" data-act="usar-muestra" data-v="${id}"${puede ? '' : ' disabled'}><div class="mini-foto">${fotoSvg(id)}</div><span>${esc(nombreMuestra(id))}</span></button>`).join('')}</div>
      ${nota('En la demo la IA está simulada: con las fotos de muestra reconoce el producto; con una foto tuya te pregunta qué es.')}
    </div>`,
  };
}

let timers = [];
const limpiarTimers = () => { timers.forEach(clearTimeout); timers = []; };
function analizando() {
  if (!flujo) return { html: '', redirigir: 'b/camara' };
  const f = flujo;
  const cajas = f.muestraId ? foto(f.muestraId).cajas : [];
  const unidades = f.unidades ?? (f.kg ? dec(f.kg) + ' kg' : '');
  return {
    html: `${barra({ titulo: 'Analizando', centro: true })}
    <div class="cuerpo">
      <div class="foto escaneo" id="foto-an">${f.muestraId ? fotoSvg(f.muestraId) : `<img src="${f.fotoUrl}" alt="Tu foto">`}</div>
      <div class="pasos" id="pasos">
        <div class="paso" data-p="0"><i></i>Reconociendo productos</div>
        <div class="paso" data-p="1"><i></i>Contando unidades<span class="crece"></span><span class="fuerte num" id="cuenta"></span></div>
        <div class="paso" data-p="2"><i></i>Cruzando con tu carta</div>
        <div class="paso" data-p="3"><i></i>Armando los packs</div>
      </div>
      <div style="flex:1"></div>
      <p class="mini" style="text-align:center">Tarda unos segundos.</p>
    </div>`,
    montar: el => {
      limpiarTimers();
      const pasos = [...el.querySelectorAll('.paso')];
      const marcar = (i, estado) => { const p = pasos[i]; p.classList.remove('ahora'); p.classList.add(estado); if (estado === 'hecho') p.querySelector('i').innerHTML = icon('check', 14); };
      const cont = el.querySelector('#foto-an');
      marcar(0, 'ahora');
      const paso = 2300 / Math.max(cajas.length, 1);
      cajas.forEach((c, i) => timers.push(setTimeout(() => {
        const d = document.createElement('div');
        const dudosa = f.confianza < CONFIG.umbralDuda;
        d.className = 'caja-det' + (dudosa ? ' duda' : '');
        d.style.cssText = cajaPct(c);
        if (i === 0) d.innerHTML = `<b>${dudosa ? '¿qué es?' : esc(producto(f.producto)?.nombre.split(' ')[0].toLowerCase() || '')} ${dudosa ? '' : String(f.confianza).replace('.', ',').slice(0, 4)}</b>`;
        cont.appendChild(d);
        if (f.unidades) el.querySelector('#cuenta').textContent = Math.round((i + 1) / cajas.length * f.unidades);
      }, 250 + i * paso)));
      timers.push(setTimeout(() => { marcar(0, 'hecho'); marcar(1, 'ahora'); }, 700));
      timers.push(setTimeout(() => { marcar(1, 'hecho'); marcar(2, 'ahora'); if (!f.unidades && f.kg) el.querySelector('#cuenta').textContent = dec(f.kg) + ' kg'; if (!f.muestraId) el.querySelector('#cuenta').textContent = ''; }, 1800));
      timers.push(setTimeout(() => { marcar(2, 'hecho'); marcar(3, 'ahora'); }, 2400));
      timers.push(setTimeout(() => {
        marcar(3, 'hecho');
        if (!f.muestraId || f.confianza < CONFIG.umbralDuda) { nav.go('b/duda', { replace: true }); return; }
        armarFlujo();
        nav.go('b/revisar', { replace: true });
      }, 2950));
    },
    desmontar: limpiarTimers,
  };
}
function armarFlujo() {
  const prod = producto(flujo.producto);
  const cant = prod.u === 'kg' ? flujo.kg : flujo.unidades;
  flujo.packs = agrupar(armarPacks(prod, cant, S.descuento));
  flujo.cond = flujo.cond || [];
  flujo.retiro = flujo.retiro || 0;
}

function duda() {
  if (!flujo) return { html: '', redirigir: 'b/camara' };
  const f = flujo;
  const ops = f.opciones || [];
  const elegido = f.elegido || (ops[0] && ops[0][0]);
  const prodEl = producto(elegido);
  const esKg = prodEl?.u === 'kg';
  if (f.unidadesDuda == null) f.unidadesDuda = f.unidades || 6;
  if (f.kgDuda == null) f.kgDuda = f.kg || 1;
  return {
    html: `${barra({ titulo: f.muestraId ? 'Ayudame con esta' : '¿Qué es?', centro: true })}
    <div class="cuerpo">
      <div class="foto" style="aspect-ratio:16/9">${f.muestraId ? fotoSvg(f.muestraId) : `<img src="${f.fotoUrl}" alt="Tu foto">`}
        ${f.muestraId ? `<div class="caja-det duda" style="${cajaPct(foto(f.muestraId).cajas[0])}"><b>¿qué es?</b></div>` : ''}</div>
      <h2>${f.muestraId ? 'No estoy seguro de qué es. ¿Cuál es?' : 'Contame qué hay en la foto'}</h2>
      ${f.muestraId ? '' : '<p class="chico" style="margin-top:-6px">En la demo la IA no mira tu foto: elegí el producto y cuántos hay.</p>'}
      <div class="lista">
        ${(ops.length ? ops : S.carta.filter(p => p.precio != null).slice(0, 5).map(p => [p.id, null])).map(([id, pr]) => `<button class="item" data-act="elegir-duda" data-v="${id}">
          <span class="col crece"><span class="fuerte">${esc(producto(id).nombre)}</span>${pr != null ? `<span class="mini">${Math.round(pr * 100)}% de probabilidad</span>` : ''}</span>
          ${id === elegido ? icon('check', 22, 'verde') : ''}</button>`).join('')}
        <button class="item" data-act="otro-producto"><span class="crece fuerte">Otra cosa de tu carta…</span>${icon('adelante', 20, 'chev')}</button>
      </div>
      <div class="card fila entre"><span class="fuerte">${esKg ? 'Peso' : 'Unidades'}</span>
        <div class="stepper"><button data-act="duda-menos" aria-label="Menos">${icon('menos', 18)}</button><span>${esKg ? dec(f.kgDuda) + ' kg' : f.unidadesDuda}</span><button data-act="duda-mas" aria-label="Más">${icon('mas', 18)}</button></div></div>
      <div style="flex:1"></div>
      <button class="btn bloque${elegido ? '' : ' off'}" data-act="confirmar-duda">Seguir</button>
    </div>`,
  };
}

function revisar() {
  if (!flujo || !flujo.packs) return { html: '', redirigir: 'b/camara' };
  const f = flujo;
  const prod = producto(f.producto);
  const n = f.packs.reduce((a, p) => a + p.stock, 0);
  const pesoTot = f.packs.reduce((a, p) => a + p.pesoG * p.stock, 0) / 1000;
  const valor = f.packs.reduce((a, p) => a + p.valor * p.stock, 0);
  const dudaUnid = f.duda === 'unidades' && f.confianza < CONFIG.umbralAlta && !f.revisado;
  const esKg = prod.u === 'kg';
  const cantTxt = esKg ? dec(f.kg) + ' kg' : f.unidades;
  const c = miComercio();
  const [hc] = c.cierre.split(':').map(Number);
  const ventanas = [`${pad(hc - 1)}:00 – ${c.cierre}`, `${pad(hc - 1)}:30 – ${c.cierre}`, `${pad(hc - 2)}:00 – ${c.cierre}`];
  return {
    html: `${barra({ titulo: 'Revisá y publicá', centro: true })}
    <div class="cuerpo">
      <div class="card">
        <div class="fila arriba">
          <div class="foto" style="width:92px;aspect-ratio:1;flex:none;border-radius:14px">${f.muestraId ? fotoSvg(f.muestraId) : f.fotoUrl ? `<img src="${f.fotoUrl}" alt="">` : fotoSvg('pan')}</div>
          <div class="col crece" style="gap:6px">
            <button class="fila entre" data-act="otro-producto" style="text-align:left"><span class="fuerte" style="font-size:17px">${esc(prod.nombre)}</span>${icon('editar', 18, 'verde')}</button>
            <div class="confianza"><div class="progreso${f.confianza >= CONFIG.umbralAlta ? '' : ' medio'}"><i style="width:${Math.round(f.confianza * 100)}%"></i></div><span class="mini fuerte">${f.medido ? 'Balanza' : Math.round(f.confianza * 100) + '%'}</span></div>
            <span class="mini">Valor en tu carta: <b>${plata(valor)}</b></span>
          </div>
        </div>
        <div class="fila entre" style="${dudaUnid ? 'background:var(--horno-50);margin:0 -8px;padding:8px;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--horno-100)' : ''}">
          <span class="col"><span class="fuerte">${esKg ? 'Peso' : 'Unidades'}</span>${dudaUnid ? '<span class="mini" style="color:var(--horno)">No estoy seguro de haber contado bien</span>' : ''}</span>
          <div class="stepper"><button data-act="cant-menos" aria-label="Menos">${icon('menos', 18)}</button><span>${cantTxt}</span><button data-act="cant-mas" aria-label="Más">${icon('mas', 18)}</button></div>
        </div>
      </div>
      <div class="seccion"><h3>Te sugiero</h3><span class="mini">${Math.round(S.descuento * 100)}% off</span></div>
      ${f.packs.map((p, i) => `<div class="card sel" style="gap:6px">
        <div class="fila entre"><span class="fuerte">${p.stock} × Pack ${TAMANOS[p.tam].toLowerCase()}</span><span class="fuerte verde" style="font-size:19px">${plata(p.precio)}<span class="mini" style="font-family:var(--ui)"> c/u</span></span></div>
        <div class="fila entre"><span class="chico">${esc(p.titulo)} · ≈ ${gramos(p.pesoG)}</span><span class="tachado">${plata(p.valor)}</span></div>
        <div class="fila" style="gap:8px"><button class="btn chico gris" data-act="precio-pack" data-i="${i}">${icon('etiqueta', 16)} Precio</button><button class="btn chico gris" data-act="quitar-pack" data-i="${i}">${icon('menos', 16)} Uno menos</button></div>
      </div>`).join('')}
      <div class="campo"><label>Retiro</label>
        <div class="seg">${ventanas.map((v, i) => `<button class="${f.retiro === i ? 'on' : ''}" data-act="retiro" data-v="${i}">${v.replace(' – ' + c.cierre, '')}</button>`).join('')}</div>
        <span class="mini">Hoy de ${ventanas[f.retiro]}</span></div>
      <div class="campo"><label>Condiciones · las marcás vos</label>
        <div class="chips">${CONDICIONES.map(x => `<button class="chip${f.cond.includes(x) ? ' on' : ''}" data-act="cond-pack" data-v="${x}"${S.condLocal.includes(x) ? '' : ' disabled'}>${x}</button>`).join('')}</div>
        ${S.condLocal.length < 3 ? '<span class="mini">Las que no ofrecés están apagadas. Se habilitan en Cuenta → Datos del local.</span>' : ''}</div>
      <div class="fila entre"><span class="chico">Si se venden: <b>${dec(pesoTot)} kg</b> · ≈ ${dec(co2(pesoTot))} kg CO₂e</span>${badgeDato(f.medido)}</div>
      <button class="btn bloque${n ? '' : ' off'}" data-act="publicar">Publicar ${n} pack${n === 1 ? '' : 's'}</button>
    </div>`,
  };
}

function publicado(ids) {
  const lista = String(ids || '').split(',').map(id => S.packs.find(p => p.id === id)).filter(Boolean);
  if (!lista.length) return { html: '', redirigir: 'b/hoy' };
  const n = lista.reduce((a, p) => a + p.stockInicial, 0);
  const plataT = lista.reduce((a, p) => a + p.stockInicial * p.precio, 0);
  const kgT = lista.reduce((a, p) => a + p.stockInicial * p.pesoG, 0) / 1000;
  const seg = lista[0].segundosDesdeFoto;
  return {
    html: `<header class="barra"><div class="titulo"></div><button class="icbtn" data-tab="b/hoy" aria-label="Cerrar">${icon('x', 24)}</button></header>
    <div class="cuerpo" style="gap:16px">
      <div style="flex:.6"></div>
      <div class="ok-grande">${icon('check', 46)}</div>
      <h1 class="gran-titulo" style="text-align:center">Publicaste ${n} pack${n === 1 ? '' : 's'}</h1>
      <p class="chico" style="text-align:center">Ya los ven los clientes que están a menos de ${CONFIG.radioKm} km.</p>
      <div class="card">
        <div class="fila entre"><span class="chico">Si se venden todos</span><span class="fuerte verde">${plata(plataT)}</span></div>
        <div class="fila entre"><span class="chico">Comida que no se tira</span><span class="fuerte">${dec(kgT)} kg</span></div>
        ${seg != null ? `<div class="fila entre"><span class="chico">Tiempo desde la foto</span><span class="fuerte">${seg} s</span></div>` : ''}
      </div>
      <div style="flex:1"></div>
      <button class="btn bloque sec" data-go="c/pack/${lista[0].id}">${icon('usuario', 20)} Ver cómo lo ve el cliente</button>
      <button class="btn bloque" data-tab="b/hoy">Volver a Hoy</button>
    </div>`,
  };
}

function publicar() {
  const f = flujo;
  const prod = producto(f.producto);
  const c = miComercio();
  const [hc] = c.cierre.split(':').map(Number);
  const desde = [`${pad(hc - 1)}:00`, `${pad(hc - 1)}:30`, `${pad(hc - 2)}:00`][f.retiro];
  const seg = Math.round((Date.now() - f.t0) / 1000);
  const captura = { id: uid('cap'), dia: hoy(), t: ahora().getTime(), tipo: f.medido ? 'pesaje' : 'foto', producto: prod.nombre, productoId: prod.id, unidades: f.unidades, kg: f.kg ?? (f.unidades * prod.peso / 1000), confianza: f.confianza, destino: 'vender', correcciones: f.correcciones || [] };
  S.capturas.push(captura);
  const ids = [];
  for (const p of f.packs) {
    const id = uid('p');
    ids.push(id);
    S.packs.push({ id, comercioId: 'c1', dia: hoy(), estado: 'activo', stock: p.stock, stockInicial: p.stock, vendidos: 0,
      tam: p.tam, precio: p.precio, valor: p.valor, pesoG: p.pesoG, cat: p.cat, cond: [...f.cond], titulo: p.titulo,
      productoId: prod.id, nutri100: prod.nutri, medido: !!f.medido, origen: f.medido ? 'estacion' : 'foto',
      retiroDesde: desde, creado: ahora().getTime(), capturaId: captura.id, segundosDesdeFoto: f.medido ? null : seg });
  }
  evento('pack_publicado', { n: ids.length, segundos: seg, origen: f.medido ? 'estacion' : 'foto', correcciones: (f.correcciones || []).length });
  guardar();
  vibrar(25);
  flujo = null;
  return ids;
}

function registrarCorreccion(campo, ia, final) {
  if (!flujo) return;
  flujo.correcciones = flujo.correcciones || [];
  const ex = flujo.correcciones.find(c => c.campo === campo);
  if (ex) ex.final = final; else flujo.correcciones.push({ campo, ia, final });
}

// ---------------------------------------------------------------------------
// Estación (B-10, B-11)
// ---------------------------------------------------------------------------
const PESAJES = [
  { producto: 'pan', kg: 1.84, muestra: 'pan', conf: .91 },
  { producto: null, nombre: 'Recortes de masa', kg: .62, soloBasura: true, conf: .88 },
  { producto: 'medialuna', kg: .54, unidades: 12, muestra: 'medialunas', conf: .96 },
  { producto: 'torta', kg: .72, unidades: 6, muestra: 'torta', conf: .9 },
  { producto: null, nombre: 'Sándwiches de miga vencidos', kg: .21, soloBasura: true, conf: .83 },
  { producto: 'miga', kg: .63, unidades: 18, muestra: 'sandwiches', conf: .9 },
];
let enBalanza = null;
function estacion() {
  if (!tienePlan('smart')) return { html: '', redirigir: 'b/hoy' };
  const hoyCap = S.capturas.filter(c => c.tipo === 'pesaje' && c.dia === hoy()).slice().reverse();
  const kgV = hoyCap.filter(c => c.destino === 'vender').reduce((a, c) => a + c.kg, 0);
  const kgB = hoyCap.filter(c => c.destino === 'basura').reduce((a, c) => a + c.kg, 0);
  const puede = puedePublicar();
  const b = enBalanza;
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Estación', accion: '<span class="badge" style="margin-right:8px">● Conectada</span>' })}
    <div class="cuerpo">
      <div class="card${b ? ' sel' : ''}" id="balanza">
        <span class="eti">En la balanza ahora</span>
        ${b ? `<div class="fila" style="gap:14px">
            <div class="foto" style="width:96px;aspect-ratio:1;flex:none;border-radius:14px">${b.muestra ? fotoSvg(b.muestra) : `<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--horno)">${icon('basura', 34)}</div>`}</div>
            <div class="col crece"><span class="kpi"><span class="n num" id="peso">0,00 kg</span></span><span class="chico" id="reco">Reconociendo…</span></div></div>
          <div class="fila-btns" id="botones-balanza" style="opacity:.3;pointer-events:none;transition:opacity .2s">
            <button class="btn${puede && !b.soloBasura ? '' : ' off'}" data-act="pesaje-vender">${icon('etiqueta', 20)} Para vender</button>
            <button class="btn sec" data-act="pesaje-basura" style="color:var(--horno);box-shadow:inset 0 0 0 1.5px var(--horno-100)">${icon('basura', 20)} A la basura</button>
          </div>
          ${!puede && !b.soloBasura ? '<span class="mini">Pasó el límite de publicación: hoy solo se registra.</span>' : ''}`
        : `<div class="vacio" style="padding:16px 0 6px"><div class="circ">${icon('balanza', 30)}</div><p class="chico">Apoyá lo que sobró en la estación. La balanza lo pesa y la cámara lo reconoce.</p></div>
          <button class="btn bloque sec" data-act="simular-pesaje">${icon('rayo', 20)} Simular un pesaje (demo)</button>`}
      </div>
      <div class="card fila entre">
        <span class="col crece"><span class="fuerte">Publicar solo lo que va para vender</span><span class="mini">${S.estacion.auto ? 'Arma y publica el pack al instante, con opción de deshacer.' : 'Cada pesaje abre la revisión, como una foto.'}</span></span>
        <label class="switch"><input type="checkbox" data-act-change="auto-estacion" ${S.estacion.auto ? 'checked' : ''} aria-label="Publicación automática"><i></i></label>
      </div>
      <div class="seccion"><h3>Hoy</h3><span class="mini">${dec(kgV)} kg para vender · ${dec(kgB)} kg a la basura</span></div>
      ${hoyCap.length ? `<div class="lista">${hoyCap.map(c => `<div class="item">
        <span class="ic-caja" style="${c.destino === 'basura' ? 'background:var(--horno-50);color:var(--horno)' : ''}">${icon(c.destino === 'basura' ? 'basura' : 'etiqueta', 20)}</span>
        <span class="col crece"><span class="fuerte trunc">${esc(c.producto)}</span><span class="mini">${hhmm(new Date(c.t))} · ${dec(c.kg)} kg${c.motivo ? ' · ' + esc(c.motivo) : ''}</span></span>
        ${c.destino === 'basura' ? '<span class="badge horno">Basura</span>' : `<span class="badge">${c.packs || 0} pack${c.packs === 1 ? '' : 's'}</span>`}</div>`).join('')}</div>`
        : '<p class="chico">Todavía no se pesó nada hoy.</p>'}
      ${nota('En la estación real estos dos botones están en la pantalla de la balanza: no hace falta tocar el celu.')}
    </div>`,
    montar: el => {
      if (!b || b.listo) { if (b) mostrarPesoFinal(el, b); return; }
      limpiarTimers();
      const pesoEl = el.querySelector('#peso');
      const pasos = 16;
      for (let i = 1; i <= pasos; i++) timers.push(setTimeout(() => {
        const v = b.kg * (1 - Math.pow(1 - i / pasos, 3)) + (i < pasos ? (Math.random() - .5) * .04 : 0);
        pesoEl.textContent = Math.max(0, v).toFixed(2).replace('.', ',') + ' kg';
      }, i * 60));
      timers.push(setTimeout(() => { b.listo = true; mostrarPesoFinal(el, b); vibrar(12); }, pasos * 60 + 450));
    },
    desmontar: limpiarTimers,
  };
}
function mostrarPesoFinal(el, b) {
  el.querySelector('#peso').textContent = b.kg.toFixed(2).replace('.', ',') + ' kg';
  el.querySelector('#reco').innerHTML = `${esc(b.producto ? producto(b.producto).nombre : b.nombre)}${b.unidades ? ' · ' + b.unidades + ' u' : ''} · ${Math.round(b.conf * 100)}%`;
  const bt = el.querySelector('#botones-balanza'); bt.style.opacity = '1'; bt.style.pointerEvents = 'auto';
}

function merma(id) {
  const c = S.capturas.find(x => x.id === id);
  if (!c) return { html: '', redirigir: 'b/estacion' };
  return {
    html: `${barra({ titulo: 'A la basura', centro: true })}
    <div class="cuerpo">
      <div class="card aviso"><div class="fila entre"><span class="kpi"><span class="n md">${dec(c.kg)} kg</span></span><span class="badge horno">No se publica</span></div><span class="chico">${esc(c.producto)} · ${hhmm(new Date(c.t))}</span></div>
      <h2>¿Por qué se tira?</h2>
      <div class="chips">${MOTIVOS_MERMA.map(m => `<button class="chip${c.motivo === m ? ' on' : ''}" data-act="motivo" data-id="${c.id}" data-v="${m}">${m}</button>`).join('')}</div>
      <p class="chico">Con esto, Intelligence te puede decir qué conviene producir menos y qué comprar más seguido.</p>
      <div style="flex:1"></div>
      <button class="btn bloque${c.motivo ? '' : ' off'}" data-act="guardar-merma" data-id="${c.id}">Guardar</button>
      <button class="btn bloque gris" data-act="guardar-merma" data-id="${c.id}" data-saltear="1">Saltear</button>
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Retiros (B-12, B-13)
// ---------------------------------------------------------------------------
function retiros() {
  const rs = reservasMias();
  const ext = (S.externas || []).filter(x => x.dia === hoy());
  const act = [...rs.filter(r => r.estado === 'activa'), ...ext.filter(x => x.estado === 'activa')];
  const ret = [...rs.filter(r => r.estado === 'retirada'), ...ext.filter(x => x.estado === 'retirada')];
  const fila = (r, retirada) => `<div class="item"><span class="ic-caja">${icon(retirada ? 'check' : 'usuario', 20)}</span>
    <span class="col crece"><span class="fuerte">${esc(r.cliente)}${r.externa ? ' <span class="mini">· otro celu</span>' : ''}</span><span class="mini">Pack ${TAMANOS[r.tam]?.toLowerCase() || ''} · ${esc(r.cat)} · ${retiroTxt(miComercio())}</span></span>
    ${retirada ? '<span class="badge">Retirado</span>' : `<span class="fuerte num" style="letter-spacing:.12em">${esc(r.code)}</span>`}</div>`;
  return {
    tabs: tabs('b/retiros'), clase: 'con-tabs gris',
    html: `${barra({ titulo: 'Retiros', atras: false, accion: `<span class="mini" style="padding-right:10px">Hoy</span>` })}
    <div class="cuerpo">
      <button class="btn bloque" data-go="b/escanear">${icon('escanear', 22)} Escanear el QR del cliente</button>
      <form class="fila" data-form="codigo" style="gap:8px">
        <input class="input crece" name="codigo" placeholder="O escribí el código (ej. K7Q2)" maxlength="4" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.14em;font-weight:800">
        <button class="btn" style="flex:none;width:96px" type="submit">Validar</button>
      </form>
      <div class="seccion"><h3>Por retirar · ${act.length}</h3></div>
      ${act.length ? `<div class="lista">${act.map(r => fila(r, false)).join('')}</div>` : '<p class="chico">No hay retiros pendientes. Cuando alguien reserve, aparece acá.</p>'}
      ${ret.length ? `<div class="seccion"><h3>Retirados · ${ret.length}</h3></div><div class="lista">${ret.map(r => fila(r, true)).join('')}</div>` : ''}
      ${nota('Al cierre, lo que no se retiró pasa a "No retirado". La plata no se devuelve.')}
    </div>`,
  };
}

function escanearPantalla() {
  return {
    html: `${barra({ titulo: 'Escanear', cerrar: true, centro: true })}
    <div class="cuerpo">
      <div class="visor"><video id="video" muted playsinline></video><div class="marco"></div><div class="ayuda" id="ayuda">Apuntá al QR del cliente</div></div>
      <form class="fila" data-form="codigo" style="gap:8px">
        <input class="input crece" name="codigo" placeholder="O escribí el código" maxlength="4" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.14em;font-weight:800">
        <button class="btn" style="flex:none;width:96px" type="submit">Validar</button>
      </form>
    </div>`,
    montar: async el => {
      const v = el.querySelector('#video');
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw new Error('sin camara');
        await escanear(v, txt => validar(txt, true));
      } catch (e) {
        el.querySelector('.visor').innerHTML = `<div class="vacio" style="position:absolute;inset:0;justify-content:center;color:#fff">${icon('camara', 34)}<p style="color:#fff">No hay acceso a la cámara.<br>Escribí el código de 4 letras abajo.</p></div>`;
      }
    },
    desmontar: detener,
  };
}

export function validar(texto, desdeQr) {
  const t = String(texto || '').trim();
  const pl = leerPayload(t);
  const code = (pl ? pl.code : t).toUpperCase();
  const local = S.reservas.find(r => r.code === code && r.comercioId === 'c1');
  let item = null, externa = false;
  if (local) item = local;
  else if (pl) {
    if (pl.comercioId !== 'c1') return resultado({ error: `Este QR es de otro local (${pl.comercio}).` });
    if (pl.dia !== hoy()) return resultado({ error: 'Esta reserva es de otro día y ya venció.' });
    S.externas = S.externas || [];
    item = S.externas.find(x => x.code === code) || { code, cliente: pl.cliente, tam: pl.tam, cat: pl.cat, dia: pl.dia, estado: 'activa', externa: true };
    if (!S.externas.includes(item)) S.externas.push(item);
    externa = true;
  }
  if (!item) return resultado({ error: desdeQr ? 'Este QR no es de una reserva de Aprovecho.' : `No encontramos una reserva con el código ${code}.` });
  if (item.estado === 'retirada') return resultado({ error: `El pack de ${item.cliente} ya se entregó.` });
  if (item.estado === 'no_retirada' || item.dia !== hoy()) return resultado({ error: 'Esta reserva venció.' });
  resultado({ item, externa });
}
function resultado({ error, item, externa }) {
  vibrar(error ? [30, 40, 30] : 20);
  if (error) {
    abrirHoja(`<div class="vacio" style="padding:10px 0"><div class="circ" style="background:var(--rojo-50);color:var(--rojo)">${icon('alerta', 30)}</div><h2>No se puede entregar</h2><p class="chico">${esc(error)}</p></div><button class="btn bloque gris" data-act="cerrar-hoja">Entendido</button>`);
    return;
  }
  abrirHoja(`<div class="fila entre"><h2>Código ${esc(item.code)}</h2><span class="badge">Válido</span></div>
    <div class="card plana"><span class="fuerte" style="font-size:18px">${esc(item.cliente)}</span><span class="chico">Pack ${TAMANOS[item.tam]?.toLowerCase() || ''} · ${esc(item.cat)}</span>
    ${externa ? '<span class="mini">Reserva hecha en otro celular (demo sin servidor: los datos vienen en el QR).</span>' : ''}</div>
    <button class="btn bloque" data-act="entregar" data-code="${esc(item.code)}">${icon('check', 20)} Confirmar entrega</button>
    <button class="btn bloque gris" data-act="cerrar-hoja">Cancelar</button>`);
}

// ---------------------------------------------------------------------------
// Impacto (B-14)
// ---------------------------------------------------------------------------
let periodoImp = 'semana';
export function impactoDatos(periodo, suc) {
  const dias = filtrar(periodo, suc, ahora());
  const r = resumen(dias);
  const mios = [...semillaMia(), ...misPacksHoy()];
  const vend = mios.reduce((a, p) => a + (p.vendidos || 0), 0);
  r.recuperado += mios.reduce((a, p) => a + (p.vendidos || 0) * p.precio, 0);
  r.kgRescatado += mios.reduce((a, p) => a + (p.vendidos || 0) * p.pesoG, 0) / 1000;
  r.packsVend += vend;
  r.packsPub += mios.reduce((a, p) => a + (p.stockInicial || p.stock + (p.vendidos || 0)), 0);
  r.pctVend = r.packsPub ? r.packsVend / r.packsPub : 0;
  const mermaHoy = S.capturas.filter(c => c.dia === hoy() && c.destino === 'basura');
  r.mermaKg += mermaHoy.reduce((a, c) => a + c.kg, 0);
  for (const c of mermaHoy) r.porMotivo[c.motivo || 'Sin motivo'] = (r.porMotivo[c.motivo || 'Sin motivo'] || 0) + c.kg;
  r.co2 = co2(r.kgRescatado);
  return { r, dias };
}
function graficoImpacto(periodo, dias) {
  const pd = porDia(dias);
  if (periodo === 'semana') {
    const ult = pd.slice(-6);
    const hoyKg = [...semillaMia(), ...misPacksHoy()].reduce((a, p) => a + (p.vendidos || 0) * p.pesoG, 0) / 1000;
    const vals = [...ult.map(x => x.kgRescatado), hoyKg];
    const labs = [...ult.map(x => DIAS_CORTO[new Date(x.dia + 'T12:00').getDay()]), 'Hoy'];
    return { vals, labs, titulo: 'kg rescatados por día' };
  }
  if (periodo === 'mes') {
    const sem = [];
    for (let i = 0; i < pd.length; i += 7) sem.push(pd.slice(i, i + 7));
    return { vals: sem.map(s => s.reduce((a, x) => a + x.kgRescatado, 0)), labs: sem.map(s => ddmm(new Date(s[0].dia + 'T12:00'))), titulo: 'kg rescatados por semana' };
  }
  const meses = new Map();
  for (const x of pd) { const k = x.dia.slice(0, 7); meses.set(k, (meses.get(k) || 0) + x.kgRescatado); }
  const e = [...meses.entries()].slice(-8);
  return { vals: e.map(x => x[1]), labs: e.map(x => MESES[+x[0].slice(5) - 1].slice(0, 3)), titulo: 'kg rescatados por mes' };
}
function impacto() {
  const { r, dias } = impactoDatos(periodoImp, 'olivos');
  const g = graficoImpacto(periodoImp, dias);
  const smart = tienePlan('smart');
  const topMot = Object.entries(r.porMotivo).sort((a, b) => b[1] - a[1])[0];
  return {
    tabs: tabs('b/impacto'), clase: 'con-tabs gris',
    html: `${barra({ titulo: 'Impacto', atras: false, accion: `<button class="btn chico gris" data-go="b/reporte" style="margin-right:6px">${icon('bajar', 18)} Descargar</button>` })}
    <div class="cuerpo">
      <div class="seg">${[['semana', 'Semana'], ['mes', 'Mes'], ['todo', 'Desde el alta']].map(([k, t]) => `<button class="${periodoImp === k ? 'on' : ''}" data-act="periodo-imp" data-v="${k}">${t}</button>`).join('')}</div>
      <div class="card">
        <div class="kpi"><span class="n verde">${plata(r.recuperado)}</span><span class="k">recuperados · lo que cobraste por packs${CONFIG.comision == null ? ' (bruto)' : ''}</span></div>
        ${barras(g.vals, g.labs, { destacar: g.vals.length - 1, fmt: v => dec(v), alto: 130 })}
        <span class="mini">${g.titulo}</span>
      </div>
      <div class="stats">
        <div class="stat"><span class="n">${dec(r.kgRescatado)}</span><span class="k">kg rescatados</span></div>
        <div class="stat"><span class="n">${dec(r.co2)}</span><span class="k">kg CO₂e evitado</span></div>
        <div class="stat"><span class="n">${pct(r.pctVend)}</span><span class="k">de los packs se vendió</span></div>
      </div>
      <p class="chico">${dec(r.co2)} kg de CO₂e ≈ <b>${num(kmAuto(r.co2))} km</b> en auto.</p>
      <div class="fila entre"><span class="chico">Precisión del dato</span>${badgeDato(smart)}</div>
      ${smart ? `<div class="card aviso">
          <div class="fila entre"><span class="fuerte">Tiraste ${dec(r.mermaKg)} kg</span><span class="badge horno">Merma</span></div>
          <span class="chico">El motivo principal: ${esc((topMot?.[0] || '').toLowerCase())} (${dec(topMot?.[1] || 0)} kg).</span>
          ${tienePlan('intelligence') ? '' : `<button class="link" data-act="ver-planes" style="align-self:flex-start">Intelligence te dice qué la genera ${icon('adelante', 16)}</button>`}
        </div>` : `<div class="card plana"><span class="fuerte">¿Querés saber cuánto tirás?</span><span class="chico">Con la estación de Smart se pesa lo que se tira y el dato pasa de estimado a medido.</span><button class="link" data-act="ver-planes" style="align-self:flex-start">Ver planes ${icon('adelante', 16)}</button></div>`}
      ${nota(`El CO₂ usa un factor de ${String(CONFIG.factorCO2).replace('.', ',')} kg por kg que todavía no tiene fuente elegida.`)}
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Cuenta (B-21)
// ---------------------------------------------------------------------------
function cuenta() {
  const pl = PLANES[S.plan];
  const sig = S.plan === 'basico' ? 'smart' : S.plan === 'smart' ? 'intelligence' : null;
  return {
    tabs: tabs('b/cuenta'), clase: 'con-tabs gris',
    html: `${barra({ titulo: 'Cuenta', atras: false })}
    <div class="cuerpo">
      <div class="card sel">
        <div class="fila entre"><h2>Plan ${pl.nombre}</h2><span class="badge">Activo</span></div>
        <div class="pila-s">${pl.incluye.map(x => `<span class="fila chico" style="gap:8px">${icon('check', 18, 'verde')}${esc(x)}</span>`).join('')}</div>
        <span class="mini">${esc(CONFIG.precios[S.plan].txt)} · ${esc(CONFIG.precios[S.plan].sub)} · precio de ejemplo</span>
      </div>
      ${sig ? `<div class="card"><span class="fuerte">Pasá a ${PLANES[sig].nombre}</span><span class="chico">${esc(PLANES[sig].lema)}</span><button class="btn chico" data-act="ver-planes" style="align-self:flex-start">Ver qué incluye</button></div>` : ''}
      <div class="lista">
        <button class="item" data-act="ver-carta"><span class="ic-caja">${icon('etiqueta', 20)}</span><span class="col crece"><span class="fuerte">Tu carta</span><span class="mini">${S.carta.length} productos</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-go="b/local"><span class="ic-caja">${icon('local', 20)}</span><span class="col crece"><span class="fuerte">Datos del local</span><span class="mini">Cierre ${cierre()} · descuento ${Math.round(S.descuento * 100)}%</span></span>${icon('adelante', 20, 'chev')}</button>
        ${tienePlan('smart') ? `<button class="item" data-go="b/estacion"><span class="ic-caja">${icon('balanza', 20)}</span><span class="col crece"><span class="fuerte">Estación</span><span class="mini">Conectada · calibrada hoy 08:10</span></span>${icon('adelante', 20, 'chev')}</button>` : ''}
        <button class="item" data-go="b/reporte"><span class="ic-caja">${icon('bajar', 20)}</span><span class="col crece"><span class="fuerte">Descargar reporte</span><span class="mini">Excel o PDF</span></span>${icon('adelante', 20, 'chev')}</button>
      </div>
      <span class="eti">Modo demo</span>
      <div class="card">
        <span class="fuerte">Plan de la demo</span>
        <div class="seg">${Object.entries(PLANES).map(([k, v]) => `<button class="${S.plan === k ? 'on' : ''}" data-act="plan-demo" data-v="${k}">${v.nombre}</button>`).join('')}</div>
        <div class="sep"></div>
        <div class="fila entre"><span class="col crece"><span class="fuerte">Usar la hora real</span><span class="mini">${S.horaReal ? 'Ahora usa la hora de tu celu.' : 'Apagado: la demo arranca a las 17:10 para que siempre se pueda publicar.'}</span></span>
          <label class="switch"><input type="checkbox" data-act-change="hora-real" ${S.horaReal ? 'checked' : ''} aria-label="Usar la hora real"><i></i></label></div>
      </div>
      <div class="lista">
        <button class="item" data-act="entrar-cliente"><span class="ic-caja">${icon('usuario', 20)}</span><span class="col crece"><span class="fuerte">Pasar al modo cliente</span><span class="mini">Para ver tus packs como los ve la gente</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="reiniciar"><span class="ic-caja" style="background:var(--rojo-50);color:var(--rojo)">${icon('refrescar', 20)}</span><span class="col crece"><span class="fuerte">Reiniciar la demo</span><span class="mini">Borra lo que hiciste en este celu</span></span></button>
      </div>
      ${instalarUI(true)}
    </div>`,
  };
}

function hojaPlanes() {
  const h = abrirHoja(`<h2>Planes</h2>
    ${Object.entries(PLANES).map(([k, v]) => `<button class="card toque${S.plan === k ? ' sel' : ''}" data-plan="${k}" style="text-align:left">
      <div class="fila entre"><h3 style="font-size:18px">${v.nombre}</h3>${S.plan === k ? '<span class="badge">Tu plan</span>' : ''}</div>
      <p class="chico">${esc(v.lema)}</p>
      <div class="pila-s">${v.incluye.map(x => `<span class="fila mini" style="gap:6px">${icon('check', 15, 'verde')}${esc(x)}</span>`).join('')}</div>
      <span class="fuerte verde">${esc(CONFIG.precios[k].txt)} <span class="mini" style="font-weight:600">${esc(CONFIG.precios[k].sub)}</span></span>
    </button>`).join('')}
    <p class="mini">Precios de ejemplo. En la demo el cambio es inmediato; en la vida real, Smart e Intelligence incluyen coordinar la instalación de la estación.</p>`);
  h.addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) { cambiarPlan(b.dataset.plan); cerrarHoja(); } });
}
export function cambiarPlan(k) {
  if (S.plan === k) return;
  S.plan = k; evento('plan', { plan: k }); guardar();
  toast(`Demo en plan ${PLANES[k].nombre}`);
  const r = nav.ruta;
  if (r === 'b/intel' && k !== 'intelligence') nav.go('b/impacto', { raiz: true });
  else if (r === 'b/impacto' && k === 'intelligence') nav.go('b/intel', { raiz: true });
  else if (r === 'b/estacion' && k === 'basico') nav.go('b/hoy', { raiz: true });
  else nav.render();
}

// ---------------------------------------------------------------------------
// Reporte (B-22)
// ---------------------------------------------------------------------------
let rep = { periodo: 'mes', formato: 'xlsx', secciones: null, desde: null, hasta: null, generando: false };
function reporte() {
  const disp = seccionesDisponibles();
  if (!rep.secciones) rep.secciones = disp.map(s => s[0]);
  rep.secciones = rep.secciones.filter(s => disp.some(d => d[0] === s));
  const intel = tienePlan('intelligence');
  const f = d => isoDia(d);
  if (!rep.desde) { rep.desde = f(sumarDias(ahora(), -30)); rep.hasta = f(ahora()); }
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Descargar reporte', cerrar: true, centro: true })}
    <div class="cuerpo">
      <span class="eti">Período</span>
      <div class="seg">${[['semana', 'Semana'], ['mes', 'Mes'], ['todo', 'Desde el alta'], ['fechas', 'Fechas']].map(([k, t]) => `<button class="${rep.periodo === k ? 'on' : ''}" data-act="rep-periodo" data-v="${k}">${t}</button>`).join('')}</div>
      ${rep.periodo === 'fechas' ? `<div class="fila" style="gap:10px"><label class="campo crece"><span class="mini">Desde</span><input class="input" type="date" data-rep="desde" value="${rep.desde}" max="${f(ahora())}"></label><label class="campo crece"><span class="mini">Hasta</span><input class="input" type="date" data-rep="hasta" value="${rep.hasta}" max="${f(ahora())}"></label></div>` : ''}
      ${intel ? `<button class="card toque fila entre" data-act="elegir-sucursal" style="text-align:left"><span class="col"><span class="mini">Sucursal</span><span class="fuerte">${S.sucursal === 'todas' ? 'Todas las sucursales' : esc(SUCURSALES.find(s => s.id === S.sucursal).nombre)}</span></span>${icon('abajo', 20)}</button>` : ''}
      <span class="eti">Qué incluir</span>
      <div class="lista">${disp.map(([k, t]) => `<label class="item"><span class="crece fuerte">${esc(t)}</span><span class="switch"><input type="checkbox" data-act-change="rep-sec" data-v="${k}" ${rep.secciones.includes(k) ? 'checked' : ''}><i></i></span></label>`).join('')}</div>
      ${!tienePlan('smart') ? '<p class="mini">Merma, sugerencias y sucursales se suman con Smart e Intelligence.</p>' : ''}
      <span class="eti">Formato</span>
      <div class="fila-btns">
        ${[['xlsx', 'excel', 'Excel', 'Para analizar: una hoja por tema'], ['pdf', 'pdf', 'PDF', 'Para compartir: con tu marca']].map(([k, ic, t, s]) => `<button class="card toque${rep.formato === k ? ' sel' : ''}" data-act="rep-formato" data-v="${k}" style="text-align:left;flex:1">${icon(ic, 26, 'verde')}<span class="fuerte">${t}</span><span class="mini">${s}</span></button>`).join('')}
      </div>
      <p class="mini">Incluye cómo se calcula cada número. El archivo coincide con lo que ves en la app.</p>
      <button class="btn bloque${rep.secciones.length ? '' : ' off'}" data-act="descargar" id="btn-descargar">${icon('bajar', 20)} Descargar ${rep.formato === 'xlsx' ? 'Excel' : 'PDF'}</button>
    </div>`,
    montar: el => {
      el.querySelectorAll('[data-rep]').forEach(i => i.addEventListener('change', () => { rep[i.dataset.rep] = i.value; }));
    },
  };
}
async function descargar(b) {
  if (rep.generando) return;
  rep.generando = true;
  b.innerHTML = '<span class="spin"></span> Armando el archivo';
  b.classList.add('off');
  try {
    const periodo = rep.periodo === 'fechas' ? { desde: rep.desde < rep.hasta ? rep.desde : rep.hasta, hasta: rep.desde < rep.hasta ? rep.hasta : rep.desde } : rep.periodo;
    const D = datosReporte({ periodo, suc: S.sucursal, secciones: rep.secciones });
    await esperar(150);
    const blob = rep.formato === 'xlsx' ? await armarExcel(D) : await armarPdf(D);
    const nombre = nombreArchivo(rep.formato, typeof periodo === 'object' ? periodo : null);
    const r = await entregar(blob, nombre);
    evento('reporte', { formato: rep.formato, periodo: rep.periodo, secciones: rep.secciones.length });
    guardar();
    if (r !== 'cancelado') toast(`Listo: ${nombre}`, { ic: rep.formato === 'xlsx' ? 'excel' : 'pdf', sinTabs: true });
  } catch (e) {
    console.error(e);
    toast(rep.formato === 'pdf' ? 'No se pudo armar el PDF. Revisá la conexión e intentá de nuevo.' : 'No se pudo armar el archivo. Intentá de nuevo.', { ic: 'alerta', sinTabs: true });
  } finally {
    rep.generando = false;
    nav.render();
  }
}

// ---------------------------------------------------------------------------
export const pantallas = {
  'b/plan': altaPlan, 'b/carta': altaCarta, 'b/local': altaLocal, 'b/hoy': hoyPantalla,
  'b/camara': camara, 'b/analizando': analizando, 'b/duda': duda, 'b/revisar': revisar, 'b/publicado': publicado,
  'b/estacion': estacion, 'b/merma': merma, 'b/retiros': retiros, 'b/escanear': escanearPantalla,
  'b/impacto': impacto, 'b/cuenta': cuenta, 'b/reporte': reporte,
};

export const acciones = {
  'entrar-comercio': () => {
    S.rol = 'comercio'; asegurarComercios(); guardar();
    nav.go(S.onboarding.hecho ? (tienePlan('intelligence') ? 'b/hoy' : 'b/hoy') : 'b/plan', { raiz: true });
  },
  'plan-alta': ds => { S.plan = ds.v; guardar(); nav.render(); },
  'leer-carta': async (ds, b) => { b.innerHTML = '<span class="spin"></span> Leyendo tu lista'; b.classList.add('off'); await esperar(1400); cartaLeida = true; nav.render(); },
  'editar-precio': ds => editarPrecio(ds.id),
  'cond-local': ds => { const i = S.condLocal.indexOf(ds.v); i >= 0 ? S.condLocal.splice(i, 1) : S.condLocal.push(ds.v); guardar(); nav.render(); },
  'terminar-alta': () => {
    const el = document.querySelector('.pantalla.actual');
    const c = miComercio();
    c.nombre = el.querySelector('#nom-local').value.trim() || c.nombre;
    c.cierre = el.querySelector('#cierre').value;
    S.descuento = +el.querySelector('#desc').value / 100;
    S.onboarding.hecho = true; guardar();
    toast('¡Listo! Ya podés publicar tu primer pack.');
    nav.go('b/hoy', { raiz: true });
  },
  'usar-muestra': ds => {
    const rec = RECONOCIMIENTO[ds.v];
    flujo = { ...rec, muestraId: ds.v, t0: Date.now(), cond: [], retiro: 0, correcciones: [] };
    evento('foto_analizada', { muestra: ds.v, confianza: rec.confianza });
    nav.go('b/analizando');
  },
  'elegir-duda': ds => { flujo.elegido = ds.v; const p = producto(ds.v); if (p.u === 'kg' && flujo.kgDuda == null) flujo.kgDuda = 1; nav.render(); },
  'duda-menos': () => { const p = producto(flujo.elegido || flujo.opciones?.[0]?.[0]); if (p?.u === 'kg') flujo.kgDuda = Math.max(.1, Math.round((flujo.kgDuda - .1) * 10) / 10); else flujo.unidadesDuda = Math.max(1, flujo.unidadesDuda - 1); nav.render(); },
  'duda-mas': () => { const p = producto(flujo.elegido || flujo.opciones?.[0]?.[0]); if (p?.u === 'kg') flujo.kgDuda = Math.round((flujo.kgDuda + .1) * 10) / 10; else flujo.unidadesDuda += 1; nav.render(); },
  'confirmar-duda': () => {
    const id = flujo.elegido || flujo.opciones?.[0]?.[0];
    const p = producto(id);
    registrarCorreccion('producto', flujo.producto || null, id);
    flujo.producto = id;
    if (p.u === 'kg') { flujo.kg = flujo.kgDuda; flujo.unidades = null; } else { if (flujo.unidades && flujo.unidades !== flujo.unidadesDuda) registrarCorreccion('unidades', flujo.unidades, flujo.unidadesDuda); flujo.unidades = flujo.unidadesDuda; flujo.kg = null; }
    flujo.confianza = 1; flujo.revisado = true;
    evento('correccion_ia', { tipo: 'baja_confianza', producto: id });
    armarFlujo();
    nav.go('b/revisar', { replace: true });
  },
  'otro-producto': () => {
    const h = abrirHoja(`<h2>¿Qué es?</h2><div class="lista">${S.carta.filter(p => p.precio != null).map(p => `<button class="item" data-p="${p.id}"><span class="col crece"><span class="fuerte">${esc(p.nombre)}</span><span class="mini">${esc(p.cat)} · ${plata(p.precio)}${p.u === 'kg' ? '/kg' : ''}</span></span></button>`).join('')}</div>`);
    h.addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      cerrarHoja();
      const p = producto(b.dataset.p);
      if (nav.ruta === 'b/duda') { flujo.elegido = p.id; nav.render(); return; }
      registrarCorreccion('producto', flujo.producto, p.id);
      flujo.producto = p.id;
      if (p.u === 'kg') { flujo.kg = flujo.kg || (flujo.unidades ? flujo.unidades * .1 : 1); flujo.unidades = null; }
      else { flujo.unidades = flujo.unidades || Math.max(1, Math.round((flujo.kg || .5) * 1000 / p.peso)); flujo.kg = null; }
      armarFlujo(); nav.render();
    });
  },
  'cant-menos': () => cambiarCant(-1),
  'cant-mas': () => cambiarCant(1),
  'precio-pack': ds => {
    const p = flujo.packs[+ds.i];
    const h = abrirHoja(`<h2>Precio del pack</h2><p class="chico">Valor en tu carta: ${plata(p.valor)}</p>
      <div class="fila entre"><div class="stepper"><button data-d="-500">${icon('menos', 18)}</button><span id="pp" style="min-width:90px;font-size:20px">${plata(p.precio)}</span><button data-d="500">${icon('mas', 18)}</button></div><span class="badge" id="pd">${Math.round((1 - p.precio / p.valor) * 100)}% off</span></div>
      <span class="mini">Entre ${Math.round(CONFIG.descuentoMin * 100)}% y ${Math.round(CONFIG.descuentoMax * 100)}% off.</span>
      <button class="btn bloque" data-ok>Listo</button>`, { alCerrar: () => nav.render() });
    h.addEventListener('click', e => {
      const d = e.target.closest('[data-d]');
      if (d) {
        const min = Math.ceil(p.valor * (1 - CONFIG.descuentoMax) / 100) * 100, max = Math.floor(p.valor * (1 - CONFIG.descuentoMin) / 100) * 100;
        p.precio = Math.min(max, Math.max(min, p.precio + +d.dataset.d));
        h.querySelector('#pp').textContent = plata(p.precio); h.querySelector('#pd').textContent = Math.round((1 - p.precio / p.valor) * 100) + '% off';
        registrarCorreccion('precio', null, p.precio);
      }
      if (e.target.closest('[data-ok]')) cerrarHoja();
    });
  },
  'quitar-pack': ds => { const p = flujo.packs[+ds.i]; p.stock -= 1; if (p.stock <= 0) flujo.packs.splice(+ds.i, 1); nav.render(); },
  retiro: ds => { flujo.retiro = +ds.v; nav.render(); },
  'cond-pack': ds => { const i = flujo.cond.indexOf(ds.v); i >= 0 ? flujo.cond.splice(i, 1) : flujo.cond.push(ds.v); nav.render(); },
  publicar: () => { const ids = publicar(); nav.go('b/publicado/' + ids.join(','), { replace: true }); },
  'opciones-pack': ds => opcionesPack(ds.id),
  'simular-pesaje': () => {
    const i = (S.capturas.filter(c => c.tipo === 'pesaje').length) % PESAJES.length;
    enBalanza = { ...PESAJES[i], kg: Math.round(PESAJES[i].kg * (0.92 + Math.random() * .16) * 100) / 100, listo: false };
    nav.render();
  },
  'pesaje-vender': () => pesajeVender(),
  'pesaje-basura': () => {
    const b = enBalanza; if (!b) return;
    const c = { id: uid('cap'), dia: hoy(), t: ahora().getTime(), tipo: 'pesaje', producto: b.producto ? producto(b.producto).nombre : b.nombre, productoId: b.producto, kg: b.kg, confianza: b.conf, destino: 'basura', motivo: null };
    S.capturas.push(c); enBalanza = null; guardar();
    evento('pesaje', { destino: 'basura', kg: b.kg });
    nav.go('b/merma/' + c.id);
  },
  motivo: ds => { const c = S.capturas.find(x => x.id === ds.id); c.motivo = ds.v; vibrar(6); nav.render(); },
  'guardar-merma': ds => {
    const c = S.capturas.find(x => x.id === ds.id);
    if (ds.saltear) c.motivo = null;
    guardar();
    toast(c.motivo ? `Registrado: ${dec(c.kg)} kg · ${c.motivo.toLowerCase()}` : `Registrado: ${dec(c.kg)} kg sin motivo`, { ic: 'basura', sinTabs: true });
    nav.atras();
  },
  'deshacer-estacion': ds => {
    const ids = ds.id.split(',');
    const alguno = S.packs.filter(p => ids.includes(p.id));
    if (alguno.some(p => p.vendidos > 0)) { toast('Ya reservaron alguno: no se puede deshacer.', { ic: 'alerta' }); return; }
    S.packs = S.packs.filter(p => !ids.includes(p.id));
    const cap = S.capturas.find(c => c.id === alguno[0]?.capturaId);
    if (cap) { cap.destino = 'deshecho'; }
    S.capturas = S.capturas.filter(c => c.destino !== 'deshecho');
    guardar(); toast('Listo, se bajaron los packs.'); nav.render();
  },
  entregar: ds => {
    const r = S.reservas.find(x => x.code === ds.code && x.comercioId === 'c1') || (S.externas || []).find(x => x.code === ds.code);
    if (!r) return;
    r.estado = 'retirada'; r.retirada = ahora().getTime();
    if (!r.externa) sumarAlPerfil(r);
    evento('retiro', { code: r.code, externa: !!r.externa });
    guardar(); cerrarHoja(); vibrar(30);
    toast(`Entregado a ${r.cliente}`);
    if (nav.ruta === 'b/escanear') nav.atras(); else nav.render();
  },
  'cerrar-hoja': () => cerrarHoja(),
  'periodo-imp': ds => { periodoImp = ds.v; nav.render(); },
  'ver-planes': () => hojaPlanes(),
  'elegir-plan-demo': () => hojaPlanes(),
  'plan-demo': ds => cambiarPlan(ds.v),
  'ver-carta': () => {
    const h = abrirHoja(`<h2>Tu carta</h2><p class="chico">Tocá un producto para cambiar el precio.</p><div class="lista">${S.carta.map(p => `<button class="item" data-p="${p.id}"><span class="col crece"><span class="fuerte trunc">${esc(p.nombre)}</span><span class="mini">${p.u === 'kg' ? 'por kg' : gramos(p.peso) + ' por unidad'}</span></span><span class="fuerte">${p.precio == null ? '—' : plata(p.precio)}</span></button>`).join('')}</div>`);
    h.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { cerrarHoja(true); editarPrecio(b.dataset.p); } });
  },
  'rep-periodo': ds => { rep.periodo = ds.v; nav.render(); },
  'rep-formato': ds => { rep.formato = ds.v; nav.render(); },
  descargar: (ds, b) => descargar(b),
  'elegir-sucursal': () => elegirSucursal(),
  reiniciar: async () => {
    const ok = await confirmar({ titulo: '¿Reiniciar la demo?', texto: 'Se borra todo lo que hiciste en este celu: packs, reservas, pesajes y ajustes.', si: 'Reiniciar', peligro: true });
    if (!ok) return;
    reiniciar(); cartaLeida = false; flujo = null;
    toast('Demo reiniciada', { sinTabs: true });
    nav.go('bienvenida', { raiz: true });
  },
};

export const accionesCambio = {
  'foto-propia': input => {
    const f = input.files && input.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    flujo = { fotoUrl: url, t0: Date.now(), confianza: 0, cond: [], retiro: 0, correcciones: [], unidades: 6 };
    evento('foto_analizada', { propia: true });
    nav.go('b/analizando');
  },
  'auto-estacion': input => { S.estacion.auto = input.checked; guardar(); nav.render(); },
  'hora-real': input => { S.horaReal = input.checked; guardar(); nav.render(); },
  'rep-sec': input => { const v = input.dataset.v; const i = rep.secciones.indexOf(v); if (input.checked && i < 0) rep.secciones.push(v); if (!input.checked && i >= 0) rep.secciones.splice(i, 1); nav.render(); },
};

export const formularios = {
  codigo: form => {
    const v = form.codigo.value.trim().toUpperCase();
    if (v.length !== 4) { toast('El código tiene 4 caracteres.', { ic: 'alerta' }); return; }
    form.codigo.value = '';
    form.codigo.blur();
    validar(v, false);
  },
};

// ---------------------------------------------------------------------------
function cambiarCant(d) {
  const f = flujo, prod = producto(f.producto);
  if (prod.u === 'kg') { const ant = f.kg; f.kg = Math.max(.1, Math.round((f.kg + d * .1) * 10) / 10); registrarCorreccion('kg', ant, f.kg); }
  else { const ant = f.unidades; f.unidades = Math.max(1, f.unidades + d); registrarCorreccion('unidades', ant, f.unidades); }
  f.revisado = true;
  const cond = f.cond, retiro = f.retiro;
  armarFlujo(); f.cond = cond; f.retiro = retiro;
  nav.render();
}

function editarPrecio(id) {
  const p = producto(id);
  const h = abrirHoja(`<h2>${esc(p.nombre)}</h2>
    <div class="campo"><label for="precio">Precio de venta${p.u === 'kg' ? ' por kg' : ''}</label><input class="input" id="precio" inputmode="numeric" pattern="[0-9]*" value="${p.precio ?? ''}" placeholder="Ej. 4000"></div>
    ${p.u === 'kg' ? '' : `<div class="campo"><label for="peso">Peso por unidad (g)</label><input class="input" id="peso" inputmode="numeric" pattern="[0-9]*" value="${p.peso}"></div>`}
    <button class="btn bloque" data-ok>Guardar</button>`);
  h.querySelector('[data-ok]').addEventListener('click', () => {
    const v = parseInt(h.querySelector('#precio').value.replace(/\D/g, ''), 10);
    if (!v || v < 50) { toast('Poné un precio válido.', { ic: 'alerta', sinTabs: true }); return; }
    p.precio = v;
    const peso = h.querySelector('#peso'); if (peso) { const g = parseInt(peso.value.replace(/\D/g, ''), 10); if (g > 0) p.peso = g; }
    guardar(); cerrarHoja(); nav.render();
  });
}

function opcionesPack(id) {
  const p = S.packs.find(x => x.id === id);
  if (!p) return;
  const reservado = (p.vendidos || 0) > 0;
  const h = abrirHoja(`<h2>${esc(p.titulo || 'Pack')}</h2>
    <p class="chico">${TAMANOS[p.tam]} · ${plata(p.precio)} · ${p.vendidos || 0} vendidos · quedan ${p.stock}</p>
    <div class="lista">
      <button class="item" data-o="ver"><span class="ic-caja">${icon('usuario', 20)}</span><span class="crece fuerte">Ver cómo lo ve el cliente</span></button>
      ${p.stock > 0 ? `<button class="item" data-o="bajar"><span class="ic-caja" style="background:var(--rojo-50);color:var(--rojo)">${icon('basura', 20)}</span><span class="col crece"><span class="fuerte">${reservado ? 'Bajar lo que queda' : 'Bajar el pack'}</span><span class="mini">${reservado ? 'Las reservas ya hechas se mantienen' : 'Deja de verse en el mapa'}</span></span></button>` : ''}
    </div>`);
  h.addEventListener('click', e => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    cerrarHoja(true);
    if (b.dataset.o === 'ver') nav.go('c/pack/' + p.id);
    else { p.stock = 0; p.estado = reservado ? 'agotado' : 'bajado'; if (!reservado) p.stockInicial = 0; guardar(); toast('Pack bajado'); nav.render(); }
  });
}

function pesajeVender() {
  const b = enBalanza; if (!b || !b.producto) return;
  const prod = producto(b.producto);
  const cant = prod.u === 'kg' ? b.kg : b.unidades;
  if (!S.estacion.auto) {
    flujo = { producto: prod.id, kg: prod.u === 'kg' ? b.kg : null, unidades: prod.u === 'kg' ? null : b.unidades, confianza: b.conf, medido: true, muestraId: b.muestra, t0: Date.now(), cond: [], retiro: 0, correcciones: [] };
    enBalanza = null;
    armarFlujo();
    nav.go('b/revisar');
    return;
  }
  flujo = { producto: prod.id, kg: prod.u === 'kg' ? b.kg : null, unidades: prod.u === 'kg' ? null : b.unidades, confianza: b.conf, medido: true, muestraId: b.muestra, t0: Date.now(), cond: [], retiro: 0, correcciones: [] };
  armarFlujo();
  const nPacks = flujo.packs.reduce((a, p) => a + p.stock, 0);
  const ids = publicar();
  const cap = S.capturas[S.capturas.length - 1];
  cap.packs = nPacks; cap.kg = b.kg;
  enBalanza = null;
  guardar();
  evento('pesaje', { destino: 'vender', kg: b.kg, auto: true });
  nav.render();
  toast(`Estación: publicaste ${nPacks} pack${nPacks === 1 ? '' : 's'} de ${prod.nombre.toLowerCase()}`, { ic: 'balanza', accion: { txt: 'Deshacer', act: 'deshacer-estacion', id: ids.join(',') }, ms: 6000, sinTabs: true });
}

export function elegirSucursal() {
  const h = abrirHoja(`<h2>Sucursal</h2><div class="lista">${[['todas', 'Todas las sucursales'], ...SUCURSALES.map(s => [s.id, s.nombre])].map(([k, t]) => `<button class="item" data-s="${k}"><span class="ic-caja">${icon(k === 'todas' ? 'sucursales' : 'local', 20)}</span><span class="crece fuerte">${esc(t)}</span>${S.sucursal === k ? icon('check', 22, 'verde') : ''}</button>`).join('')}</div>`);
  h.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { S.sucursal = b.dataset.s; guardar(); cerrarHoja(); nav.render(); } });
}
