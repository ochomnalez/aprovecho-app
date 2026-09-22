// Pantallas del consumidor.
import { esc, plata, dec, num, distanciaM, distTxt, gramos, pad, vibrar, esperar, codigo, uid, kg } from './util.js';
import { icon, isotipo } from './icons.js';
import { S, guardar, ahora, hoy, comercio, packsActivos, evento, ubicar, ZONA_NORTE, producto } from './store.js';
import { CONFIG, CATEGORIAS, CONDICIONES, TAMANOS, nutricion, NIVELES, co2, kmAuto } from './data.js';
import { barra, tabsCliente, abrirHoja, cerrarHoja, toast, vacio, badgeDato, nota, demoBtnCliente } from './ui.js';
import { cajaSorpresa } from './fotos.js';
import { montarMapa, ponerPines, enfocar } from './mapa.js';
import { qrSvg, payload } from './qr.js';
import { nav } from './nav.js';
import { instalarUI } from './pwa.js';

const ZONAS = [
  ['Olivos', -34.5087, -58.4877], ['Vicente López', -34.5262, -58.4747], ['Martínez', -34.4926, -58.5057],
  ['San Isidro', -34.4708, -58.5286], ['Pilar', -34.4587, -58.9140], ['Belgrano, CABA', -34.5627, -58.4563],
  ['Palermo, CABA', -34.5780, -58.4265],
];

// ---------------------------------------------------------------------------
// helpers de packs para el consumidor
// ---------------------------------------------------------------------------
export function retiroTxt(c) {
  const [h, m] = c.cierre.split(':').map(Number);
  return `${pad(h - 1)}:${pad(m)} – ${c.cierre}`;
}
export function nutriPack(p) {
  const n100 = p.nutri100 || producto(p.productoId)?.nutri;
  return n100 ? nutricion(n100, p.pesoG, p.medido ? 0.08 : CONFIG.rangoNutri) : null;
}
function packsVisibles() {
  const f = S.filtros;
  const centro = S.ubic || ZONA_NORTE;
  const q = (buscar || '').trim().toLowerCase();
  return packsActivos().map(p => {
    const c = comercio(p.comercioId);
    return { ...p, c, dist: distanciaM(centro, c) };
  }).filter(p =>
    (!f.tam.length || f.tam.includes(p.tam)) &&
    (!f.cond.length || f.cond.every(x => p.cond.includes(x))) &&
    (!f.cat.length || f.cat.includes(p.cat)) &&
    p.dist <= f.distKm * 1000 &&
    (!q || p.c.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)),
  ).sort((a, b) => a.dist - b.dist);
}
const filtrosActivos = () => S.filtros.tam.length + S.filtros.cond.length + S.filtros.cat.length + (S.filtros.distKm !== 3 ? 1 : 0);
let buscar = '';
let selMapa = null;
let alturaHoja = 'media';

function avatarComercio(c, tam = 58) {
  const inicial = c.nombre.replace(/^(Panadería|Rotisería|Café|Pastelería|Almacén|Sandwichería|Pizzería)\s+/i, '').charAt(0);
  return `<div class="avatar" style="width:${tam}px;height:${tam}px;background:${c.color}33;color:#5b3d17;font-family:var(--display);font-weight:800;font-size:${tam * .42}px">${esc(inicial)}</div>`;
}

// ---------------------------------------------------------------------------
// Bienvenida (C-01)
// ---------------------------------------------------------------------------
function bienvenida() {
  return {
    html: `<div class="cuerpo centro" style="gap:22px;padding-top:calc(30px + var(--st))">
      <div class="pila aparece" style="align-items:center;gap:12px;text-align:center">
        ${isotipo(150)}
        <div class="wordmark" style="font-size:38px;letter-spacing:.02em;line-height:1">APROVECHO</div>
        <p style="color:var(--tinta-2);font-size:17px">Nada se pierde, todo vale</p>
      </div>
      <p class="chico aparece" style="text-align:center;max-width:32ch;align-self:center;animation-delay:.08s">Comida rica que sobró en los locales de tu barrio, a mitad de precio. Reservás, pasás a buscarla y listo.</p>
      <div class="pila aparece" style="animation-delay:.14s;margin-top:6px">
        <button class="btn bloque" data-act="entrar-cliente">Entrar como cliente</button>
        <button class="btn bloque sec" data-act="entrar-comercio">${icon('local', 20)} Entrar como comercio</button>
      </div>
      ${instalarUI()}
      <p class="mini" style="text-align:center">Demo de validación · los datos son simulados</p>
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Ubicación (C-02)
// ---------------------------------------------------------------------------
function ubicacion() {
  return {
    html: `${barra({ titulo: '', atras: true })}
    <div class="cuerpo" style="gap:18px">
      <div class="vacio" style="padding-top:10px"><div class="circ" style="width:88px;height:88px">${icon('pin', 40)}</div></div>
      <h1 class="gran-titulo" style="text-align:center">Mostrame lo que hay cerca</h1>
      <p class="chico" style="text-align:center">Usamos tu ubicación solo para ordenar los packs por distancia. No se guarda en ningún servidor.</p>
      <div style="flex:1"></div>
      <button class="btn bloque" data-act="usar-gps">${icon('ubicar', 20)} Usar mi ubicación</button>
      <button class="btn bloque sec" data-act="elegir-zona">Elegir una zona a mano</button>
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Mapa (C-03)
// ---------------------------------------------------------------------------
function mapa() {
  const lista = packsVisibles();
  const nf = filtrosActivos();
  const porComercio = new Map();
  for (const p of lista) {
    const x = porComercio.get(p.c.id) || { ...p.c, desde: Infinity, n: 0 };
    x.desde = Math.min(x.desde, p.precio); x.n += p.stock; porComercio.set(p.c.id, x);
  }
  const alturas = { baja: 150, media: '46%', alta: 'calc(100% - 120px - var(--st))' };
  const tarjetas = lista.length ? lista.map(p => `
    <button class="pack-fila${p.c.id === selMapa ? ' sel' : ''}" data-go="c/pack/${p.id}" data-com="${p.c.id}">
      ${avatarComercio(p.c)}
      <div class="col crece">
        <span class="fuerte trunc">${esc(p.c.nombre)}</span>
        <span class="chico trunc">Pack ${TAMANOS[p.tam].toLowerCase()} · ${esc(p.cat)}${p.cond.length ? ' · ' + esc(p.cond.join(', ')) : ''}</span>
        <span class="mini">${distTxt(p.dist)} · hoy ${retiroTxt(p.c)} · quedan ${p.stock}</span>
      </div>
      <div class="col" style="align-items:flex-end;gap:0"><span class="precio">${plata(p.precio)}</span><span class="tachado">${plata(p.valor)}</span></div>
    </button>`).join('')
    : vacio('bolsa', 'No hay packs con esos filtros', 'Probá sacar algún filtro o ampliar la distancia. Suelen aparecer entre las 18 y las 20.', nf ? '<button class="btn chico sec" data-act="limpiar-filtros">Sacar filtros</button>' : '');
  return {
    tabs: tabsCliente('c/mapa', S.reservas.filter(r => r.estado === 'activa').length),
    clase: 'con-tabs',
    html: `<div class="cuerpo sin-pad" style="position:relative;overflow:hidden">
      <div id="slot-mapa" style="position:absolute;inset:0"></div>
      <div class="mapa-arriba">
        <div class="fila" style="gap:10px">
          <label class="buscador crece">${icon('buscar', 20)}<input id="buscar" type="search" placeholder="Buscar local o categoría" value="${esc(buscar)}" autocomplete="off" enterkeyhint="search"></label>
          ${demoBtnCliente(true)}
        </div>
        <div class="chips scroll" style="margin:0 -14px;padding:2px 14px 6px">
          <button class="chip${nf ? ' on' : ''}" data-act="abrir-filtros">${icon('filtros', 18)} Filtros${nf ? ' · ' + nf : ''}</button>
          ${Object.entries(TAMANOS).map(([k, v]) => `<button class="chip${S.filtros.tam.includes(k) ? ' on' : ''}" data-act="filtro-rapido" data-grupo="tam" data-v="${k}">${v}</button>`).join('')}
          ${CONDICIONES.map(v => `<button class="chip${S.filtros.cond.includes(v) ? ' on' : ''}" data-act="filtro-rapido" data-grupo="cond" data-v="${esc(v)}">${v}</button>`).join('')}
        </div>
      </div>
      <button class="boton-centrar" data-act="centrar" aria-label="Centrar en mi ubicación" style="bottom:calc(${typeof alturas[alturaHoja] === 'number' ? alturas[alturaHoja] + 'px' : alturas[alturaHoja]} + 14px)">${icon('ubicar', 24)}</button>
      <section class="hoja-mapa" id="hoja-mapa" style="height:${typeof alturas[alturaHoja] === 'number' ? alturas[alturaHoja] + 'px' : alturas[alturaHoja]}" aria-label="Packs cerca">
        <div class="asa-zona" id="asa-mapa"><div class="asa"></div></div>
        <div class="enc fila entre"><h2 style="font-size:18px">${lista.length ? `${lista.length} pack${lista.length > 1 ? 's' : ''} cerca` : 'Sin packs cerca'}</h2><span class="mini">${S.ubic?.fuente === 'gps' ? 'cerca tuyo' : esc(S.ubic?.barrio || 'Olivos')}</span></div>
        <div class="lista-packs" id="lista-packs">${tarjetas}</div>
      </section>
    </div>`,
    montar: el => {
      const slot = el.querySelector('#slot-mapa');
      const centro = S.ubic || ZONA_NORTE;
      montarMapa(slot, {
        centro, comercios: [...porComercio.values()], seleccionado: selMapa,
        onPin: id => { selMapa = id; vibrar(); marcarSeleccion(el, id, true); },
        onMover: () => {},
      }).catch(() => {
        slot.innerHTML = `<div class="vacio" style="position:absolute;inset:0;justify-content:center;background:var(--fondo-2)">${icon('mapa', 30)}<p class="chico">Sin conexión no se puede mostrar el mapa.<br>La lista de abajo sigue andando.</p></div>`;
      });
      const inp = el.querySelector('#buscar');
      inp.addEventListener('input', () => { buscar = inp.value; refrescarLista(el); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
      hojaArrastrable(el);
    },
  };
}
function refrescarLista(el) {
  const html = mapa().html;
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  el.querySelector('#lista-packs').innerHTML = tmp.querySelector('#lista-packs').innerHTML;
  el.querySelector('.enc h2').textContent = tmp.querySelector('.enc h2').textContent;
  const lista = packsVisibles();
  const porC = new Map();
  for (const p of lista) { const x = porC.get(p.c.id) || { ...p.c, desde: Infinity, n: 0 }; x.desde = Math.min(x.desde, p.precio); x.n += p.stock; porC.set(p.c.id, x); }
  ponerPines([...porC.values()], selMapa);
}
function marcarSeleccion(el, id, desplazar) {
  el.querySelectorAll('.pack-fila').forEach(b => b.classList.toggle('sel', b.dataset.com === id));
  refrescarLista(el);
  const card = el.querySelector(`.pack-fila[data-com="${id}"]`);
  if (alturaHoja === 'baja') ponerAltura(el, 'media');
  if (card && desplazar) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  enfocar(comercio(id));
}
function ponerAltura(el, a) {
  alturaHoja = a;
  const h = el.querySelector('#hoja-mapa'), b = el.querySelector('.boton-centrar');
  const v = { baja: '150px', media: '46%', alta: 'calc(100% - 120px - var(--st))' }[a];
  h.style.height = v; b.style.bottom = `calc(${v} + 14px)`;
}
function hojaArrastrable(el) {
  const h = el.querySelector('#hoja-mapa'), asa = el.querySelector('#asa-mapa');
  let y0 = null, h0 = 0;
  const alto = () => el.getBoundingClientRect().height;
  asa.addEventListener('pointerdown', e => { y0 = e.clientY; h0 = h.getBoundingClientRect().height; h.style.transition = 'none'; asa.setPointerCapture(e.pointerId); });
  asa.addEventListener('pointermove', e => { if (y0 == null) return; h.style.height = Math.max(120, Math.min(alto() - 110, h0 - (e.clientY - y0))) + 'px'; });
  const fin = e => {
    if (y0 == null) return;
    const dy = e.clientY - y0; y0 = null; h.style.transition = '';
    const hAct = h.getBoundingClientRect().height, A = alto();
    if (Math.abs(dy) < 6) { ponerAltura(el, alturaHoja === 'alta' ? 'media' : 'alta'); return; }
    const op = [['baja', 150], ['media', A * .46], ['alta', A - 120]];
    op.sort((a, b) => Math.abs(a[1] - hAct) - Math.abs(b[1] - hAct));
    ponerAltura(el, op[0][0]);
  };
  asa.addEventListener('pointerup', fin);
  asa.addEventListener('pointercancel', fin);
}

// ---------------------------------------------------------------------------
// Filtros (C-04), como hoja
// ---------------------------------------------------------------------------
function abrirFiltros() {
  const f = S.filtros;
  const html = () => {
    const n = packsVisibles().length;
    return `<div class="fila entre"><h2>Filtros</h2><button class="link" data-f="limpiar">Limpiar</button></div>
    <div class="pila-s"><span class="eti">Tamaño</span><div class="chips">${Object.entries(TAMANOS).map(([k, v]) => `<button class="chip${f.tam.includes(k) ? ' on' : ''}" data-f="tam" data-v="${k}">${v}</button>`).join('')}</div></div>
    <div class="pila-s"><span class="eti">Condición · la declara el local</span><div class="chips">${CONDICIONES.map(v => `<button class="chip${f.cond.includes(v) ? ' on' : ''}" data-f="cond" data-v="${v}">${v}</button>`).join('')}</div></div>
    <div class="pila-s"><span class="eti">Categoría</span><div class="chips">${CATEGORIAS.map(v => `<button class="chip${f.cat.includes(v) ? ' on' : ''}" data-f="cat" data-v="${v}">${v}</button>`).join('')}</div></div>
    <div class="pila-s"><div class="fila entre"><span class="eti">Distancia</span><span class="fuerte">Hasta ${f.distKm} km</span></div>
      <input class="rango" type="range" min="1" max="5" step="0.5" value="${f.distKm}" data-f="dist" aria-label="Distancia máxima"></div>
    <button class="btn bloque" data-f="ver">${n ? `Ver ${n} pack${n > 1 ? 's' : ''}` : 'No hay packs con esos filtros'}</button>`;
  };
  const hoja = abrirHoja(html(), { alCerrar: () => { guardar(); nav.render(); } });
  const pintar = () => { hoja.querySelector('.contenido').innerHTML = html(); };
  hoja.addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const k = b.dataset.f;
    if (k === 'ver') { cerrarHoja(); return; }
    if (k === 'limpiar') Object.assign(f, { tam: [], cond: [], cat: [], distKm: 3 });
    else if (k !== 'dist') { const a = f[k]; const v = b.dataset.v; const i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); vibrar(6); }
    pintar();
  });
  hoja.addEventListener('input', e => { if (e.target.dataset.f === 'dist') { f.distKm = +e.target.value; pintar(); } });
}

// ---------------------------------------------------------------------------
// Detalle del pack (C-05)
// ---------------------------------------------------------------------------
function detalle(id) {
  const p = S.packs.find(x => x.id === id);
  if (!p) return noEncontrado();
  const c = comercio(p.comercioId);
  const d = distanciaM(S.ubic || ZONA_NORTE, c);
  const n = nutriPack(p);
  const r = x => num(x[0]) + '–' + num(x[1]);
  const agotado = p.stock <= 0 || p.estado !== 'activo';
  return {
    html: `<div class="cuerpo sin-pad">
      <div class="hero-local">${cajaSorpresa(p.cat, p.tam)}<button class="icbtn sobre" data-act="atras" aria-label="Volver">${icon('atras', 24)}</button></div>
      <div class="pila" style="padding:18px 18px calc(110px + var(--sb));gap:16px">
        <div class="fila" style="gap:12px">${avatarComercio(c, 46)}
          <div class="col crece"><span class="fuerte">${esc(c.nombre)}</span><span class="mini">★ ${String(c.rating).replace('.', ',')} · ${c.resenas} reseñas</span></div>
        </div>
        <div class="pila-s">
          <h1 class="gran-titulo" style="font-size:25px">Pack sorpresa · ${esc(p.cat)}</h1>
          <div class="fila" style="gap:10px"><span class="kpi"><span class="n verde" style="font-size:30px">${plata(p.precio)}</span></span><span class="tachado">${plata(p.valor)}</span><span class="badge">${Math.round((1 - p.precio / p.valor) * 100)}% off</span></div>
        </div>
        <div class="chips">
          <span class="chip">${icon('caja', 16)} ${TAMANOS[p.tam]}</span>
          <span class="chip">≈ ${gramos(p.pesoG)}</span>
          ${p.cond.map(x => `<span class="chip suave on">${esc(x)} · lo declara el local</span>`).join('')}
        </div>
        <div class="card plana" style="gap:8px">
          <div class="fila entre"><span class="fila" style="gap:8px">${icon('reloj', 20, 'verde')}<span class="fuerte">Hoy ${retiroTxt(c)}</span></span><span class="chico">${distTxt(d)}</span></div>
          <div class="fila entre"><span class="chico">Quedan ${p.stock}</span>${badgeDato(p.medido)}</div>
        </div>
        ${n ? `<div class="pila-s"><div class="seccion"><h3>Nutrición estimada del pack</h3></div>
          <div class="nutri"><div><b>${r(n[0])}</b><span>kcal</span></div><div><b>${r(n[1])} g</b><span>Proteínas</span></div><div><b>${r(n[2])} g</b><span>Carbohidratos</span></div><div><b>${r(n[3])} g</b><span>Grasas</span></div></div>
          ${nota('Es una estimación hecha por IA a partir del peso. No sirve para decidir por alergias o intolerancias: consultá al local.', 'info')}</div>` : ''}
        <div class="pila-s"><h3>Qué puede traer</h3><p class="chico">Lo que le sobró hoy a ${esc(c.nombre)} en ${esc(p.cat.toLowerCase())}. Es sorpresa: el contenido exacto lo ves al retirarlo.</p></div>
        <a class="link" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank" rel="noopener">${icon('ruta', 18)} Cómo llegar</a>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:0;padding:12px 18px calc(12px + var(--sb));background:linear-gradient(transparent,#fff 30%)">
        <button class="btn bloque${agotado ? ' off' : ''}" data-go="c/pago/${p.id}">${agotado ? 'Agotado' : `Reservar por ${plata(p.precio)}`}</button>
      </div>
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Pago (C-06)
// ---------------------------------------------------------------------------
let medioPago = 'mp';
function pago(id) {
  const p = S.packs.find(x => x.id === id);
  if (!p) return noEncontrado();
  const c = comercio(p.comercioId);
  const op = (k, ic, t, s) => `<button class="item" data-act="medio-pago" data-v="${k}" aria-pressed="${medioPago === k}">
    <span class="ic-caja">${icon(ic, 20)}</span><span class="col crece"><span class="fuerte">${t}</span><span class="mini">${s}</span></span>
    <span class="switch" style="width:24px;height:24px"><i style="border-radius:99px;background:${medioPago === k ? 'var(--verde)' : 'var(--fondo-3)'};box-shadow:${medioPago === k ? 'inset 0 0 0 6px #fff, 0 0 0 1.5px var(--verde)' : 'inset 0 0 0 1.5px var(--linea)'}"></i></span></button>`;
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Confirmá tu reserva', centro: true })}
    <div class="cuerpo">
      <div class="card">
        <div class="fila">${avatarComercio(c, 50)}<div class="col crece"><span class="fuerte">Pack sorpresa · ${esc(p.cat)}</span><span class="chico">${esc(c.nombre)} · hoy ${retiroTxt(c)}</span></div></div>
        <div class="sep"></div>
        <div class="fila entre"><span class="chico">Valor en el local</span><span class="tachado">${plata(p.valor)}</span></div>
        <div class="fila entre"><span class="fuerte">Pagás</span><span class="fuerte verde" style="font-size:20px">${plata(p.precio)}</span></div>
      </div>
      <span class="eti">Cómo pagás</span>
      <div class="lista">${op('mp', 'billetera', 'Mercado Pago', 'Dinero en cuenta o tarjetas guardadas')}${op('tarjeta', 'tarjeta', 'Tarjeta de débito o crédito', 'Visa, Mastercard, Amex')}</div>
      ${nota('Si no pasás a retirarlo en el horario, el pack se pierde y no hay reintegro.', 'alerta', 'horno')}
      <div style="flex:1"></div>
      <p class="mini" style="text-align:center">Pago simulado · demo</p>
      <button class="btn bloque" data-act="pagar" data-id="${p.id}">Pagar ${plata(p.precio)}</button>
    </div>`,
  };
}

async function pagar(id, boton) {
  const p = S.packs.find(x => x.id === id);
  if (!p || p.stock <= 0) { toast('Uy, justo se agotó. Mirá otros packs cerca.', { ic: 'alerta' }); nav.go('c/mapa', { replace: true }); return; }
  boton.innerHTML = '<span class="spin"></span> Procesando pago';
  boton.classList.add('off');
  await esperar(1100);
  const r = {
    id: uid('r'), code: codigo(), packId: p.id, comercioId: p.comercioId, dia: hoy(), creada: ahora().getTime(),
    estado: 'activa', pago: medioPago, cliente: S.perfil.nombre || 'Cliente', precio: p.precio, valor: p.valor,
    pesoG: p.pesoG, cat: p.cat, tam: p.tam,
  };
  p.stock -= 1; p.vendidos = (p.vendidos || 0) + 1;
  if (p.stock <= 0) p.estado = 'agotado';
  S.reservas.unshift(r);
  evento('reserva', { packId: p.id, precio: p.precio });
  guardar();
  vibrar(20);
  // raíz: al cerrar la reserva recién pagada se vuelve al mapa, no al pago ni al detalle
  nav.go('c/reserva/' + r.id, { raiz: true });
}

// ---------------------------------------------------------------------------
// QR de retiro (C-07)
// ---------------------------------------------------------------------------
function reserva(id) {
  const r = S.reservas.find(x => x.id === id);
  if (!r) return noEncontrado();
  const c = comercio(r.comercioId);
  const recien = ahora().getTime() - r.creada < 60000;
  const estado = { activa: '', retirada: '<span class="badge">Retirada</span>', no_retirada: '<span class="badge horno">No retirada</span>' }[r.estado];
  return {
    clase: 'gris',
    html: `${barra({ titulo: 'Tu reserva', cerrar: true, centro: true })}
    <div class="cuerpo" style="gap:16px">
      ${recien && r.estado === 'activa' ? `<div class="ok-grande">${icon('check', 44)}</div><h1 class="gran-titulo" style="text-align:center">¡Reservado!</h1>` : `<div style="text-align:center">${estado}</div>`}
      <p class="chico" style="text-align:center">Mostrá este código en <b>${esc(c.nombre)}</b>.</p>
      <div class="qr-caja" id="qr">${'<div class="skeleton" style="aspect-ratio:1"></div>'}</div>
      <div class="codigo-grande num">${esc(r.code)}</div>
      <div class="card">
        <div class="fila entre"><span class="chico">Retiro</span><span class="fuerte">Hoy ${retiroTxt(c)}</span></div>
        <div class="fila entre"><span class="chico">Pack</span><span class="fuerte">${TAMANOS[r.tam]} · ${esc(r.cat)}</span></div>
        <div class="fila entre"><span class="chico">Pagaste</span><span class="fuerte">${plata(r.precio)}</span></div>
      </div>
      ${r.estado === 'retirada' && !r.calificacion ? `<button class="btn bloque" data-go="c/calificar/${r.id}">${icon('estrella', 20)} Calificar</button>` : ''}
      <a class="btn bloque sec" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank" rel="noopener">${icon('ruta', 20)} Cómo llegar</a>
    </div>`,
    montar: async el => {
      try {
        const pack = S.packs.find(x => x.id === r.packId) || { id: r.packId, tam: r.tam, cat: r.cat };
        el.querySelector('#qr').innerHTML = await qrSvg(payload(r, pack, c));
      } catch (e) {
        el.querySelector('#qr').innerHTML = `<div class="vacio" style="padding:20px">${icon('qr', 30)}<p class="mini">Sin conexión no se pudo dibujar el QR. El código de 4 letras funciona igual.</p></div>`;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Mis reservas (C-08)
// ---------------------------------------------------------------------------
let segReservas = 'activas';
function reservas() {
  const act = S.reservas.filter(r => r.estado === 'activa');
  const ant = S.reservas.filter(r => r.estado !== 'activa');
  const fila = r => {
    const c = comercio(r.comercioId);
    const der = r.estado === 'retirada'
      ? (r.calificacion ? `<span class="mini">${'★'.repeat(r.calificacion)}</span>` : '<span class="link">Calificar</span>')
      : r.estado === 'no_retirada' ? '<span class="badge horno">No retirado</span>' : '<span class="badge">Hoy</span>';
    return `<button class="item" data-go="${r.estado === 'retirada' && !r.calificacion ? 'c/calificar/' : 'c/reserva/'}${r.id}">
      ${avatarComercio(c, 44)}<span class="col crece"><span class="fuerte trunc">${esc(c.nombre)}</span><span class="mini">Pack ${TAMANOS[r.tam].toLowerCase()} · ${r.dia === hoy() ? 'hoy' : r.dia.slice(8) + '/' + r.dia.slice(5, 7)} · ${plata(r.precio)}</span></span>${der}</button>`;
  };
  const cuerpo = segReservas === 'activas'
    ? (act.length ? act.map(r => {
      const c = comercio(r.comercioId);
      return `<button class="card toque sel" data-go="c/reserva/${r.id}" style="text-align:left">
        <div class="fila entre"><span class="fuerte">${esc(c.nombre)}</span><span class="badge">Hoy</span></div>
        <span class="chico">Pack ${TAMANOS[r.tam].toLowerCase()} · ${esc(r.cat)} · retiro ${retiroTxt(c)}</span>
        <div class="fila entre"><span class="codigo-grande num" style="font-size:24px;text-align:left;padding:0">${esc(r.code)}</span><span class="btn chico">${icon('qr', 18)} Mostrar QR</span></div>
      </button>`;
    }).join('') : vacio('bolsa', 'No tenés reservas activas', 'Cuando reserves un pack, el código para retirarlo aparece acá.', '<button class="btn chico" data-tab="c/mapa">Ver packs cerca</button>'))
    : (ant.length ? `<div class="lista">${ant.map(fila).join('')}</div>` : vacio('reloj', 'Todavía no hay reservas anteriores', 'Tus packs retirados van a aparecer acá.'));
  return {
    tabs: tabsCliente('c/reservas', act.length), clase: 'con-tabs gris',
    html: `${barra({ titulo: 'Reservas', atras: false, accion: demoBtnCliente() })}
    <div class="cuerpo">
      <div class="seg"><button class="${segReservas === 'activas' ? 'on' : ''}" data-act="seg-reservas" data-v="activas">Activas${act.length ? ' · ' + act.length : ''}</button><button class="${segReservas === 'anteriores' ? 'on' : ''}" data-act="seg-reservas" data-v="anteriores">Anteriores</button></div>
      ${cuerpo}
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Calificar (C-09)
// ---------------------------------------------------------------------------
const ETIQUETAS = ['Buena cantidad', 'Rico', 'Coincidió con la pista', 'Buena atención', 'Llegó justo'];
let calif = { estrellas: 0, tags: [] };
function calificar(id) {
  const r = S.reservas.find(x => x.id === id);
  if (!r) return noEncontrado();
  const c = comercio(r.comercioId);
  return {
    html: `${barra({ titulo: '¿Qué tal estuvo?', cerrar: true, centro: true })}
    <div class="cuerpo" style="gap:20px">
      <div class="vacio" style="padding:10px 0 0">${avatarComercio(c, 72)}<h2>${esc(c.nombre)}</h2><p class="chico">Pack ${TAMANOS[r.tam].toLowerCase()} · ${esc(r.cat)}</p></div>
      <div class="estrellas" role="radiogroup" aria-label="Calificación">${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="${calif.estrellas === n}" aria-label="${n} estrellas" class="${calif.estrellas >= n ? 'on' : ''}" data-act="estrella" data-v="${n}"><svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.6Z"/></svg></button>`).join('')}</div>
      <div class="chips" style="justify-content:center">${ETIQUETAS.map(t => `<button class="chip${calif.tags.includes(t) ? ' on' : ''}" data-act="tag-calif" data-v="${t}">${t}</button>`).join('')}</div>
      <textarea class="input" id="comentario" placeholder="Contanos algo más (opcional)" maxlength="400"></textarea>
      <div style="flex:1"></div>
      <button class="btn bloque${calif.estrellas ? '' : ' off'}" data-act="enviar-calif" data-id="${r.id}">Enviar</button>
    </div>`,
  };
}

// ---------------------------------------------------------------------------
// Perfil (C-10)
// ---------------------------------------------------------------------------
export function nivel(n) {
  let i = 0;
  NIVELES.forEach((x, j) => { if (n >= x.min) i = j; });
  return { i, act: NIVELES[i], sig: NIVELES[i + 1] };
}
function perfil() {
  const k = S.consumidor;
  const { i, act, sig } = nivel(k.packs);
  const forma = S.perfil.forma;
  const nombreNivel = x => (forma === 'a' ? x.a : forma === 'o' ? x.o : x.n);
  const prog = sig ? (k.packs - act.min) / (sig.min - act.min) : 1;
  const co = co2(k.kg);
  return {
    tabs: tabsCliente('c/perfil', S.reservas.filter(r => r.estado === 'activa').length), clase: 'con-tabs gris',
    html: `${barra({ titulo: 'Perfil', atras: false, accion: demoBtnCliente() })}
    <div class="cuerpo">
      <div class="card">
        <div class="fila"><div class="avatar" style="width:60px;height:60px;border-radius:99px;display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:24px;color:var(--verde)">${esc((S.perfil.nombre || '?').charAt(0).toUpperCase())}</div>
          <div class="col crece"><span class="fuerte" style="font-size:19px">${esc(S.perfil.nombre || 'Sin nombre')}</span><span class="plan-tag" style="align-self:flex-start">${esc(nombreNivel(act))}</span></div></div>
        <div class="progreso"><i style="width:${Math.round(prog * 100)}%"></i></div>
        <span class="chico">${sig ? `Te faltan <b>${sig.min - k.packs} packs</b> para ${esc(nombreNivel(sig))}` : '¡Llegaste al nivel más alto!'}</span>
      </div>
      <div class="stats dos">
        <div class="stat"><span class="n">${num(k.packs)}</span><span class="k">Packs rescatados</span></div>
        <div class="stat"><span class="n">${dec(k.kg)} kg</span><span class="k">Comida que no se tiró</span></div>
        <div class="stat"><span class="n">${dec(co)} kg</span><span class="k">CO₂e evitado · ≈ ${num(kmAuto(co))} km en auto</span></div>
        <div class="stat"><span class="n">${plata(k.ahorro)}</span><span class="k">Ahorraste vs. precio de lista</span></div>
      </div>
      <div class="pila-s"><span class="eti">Niveles</span><div class="chips">${NIVELES.map((x, j) => `<span class="chip${j === i ? ' on' : ''}">${esc(x.n)} · ${x.min}+</span>`).join('')}</div></div>
      <span class="eti" style="margin-top:6px">Ajustes</span>
      <div class="lista">
        <button class="item" data-act="editar-nombre"><span class="ic-caja">${icon('usuario', 20)}</span><span class="col crece"><span class="fuerte">Nombre</span><span class="mini">${esc(S.perfil.nombre || 'Sin nombre')}</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="forma-nivel"><span class="ic-caja">${icon('etiqueta', 20)}</span><span class="col crece"><span class="fuerte">Cómo se muestra tu nivel</span><span class="mini">${esc(nombreNivel(act))}</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="elegir-zona"><span class="ic-caja">${icon('pin', 20)}</span><span class="col crece"><span class="fuerte">Zona</span><span class="mini">${S.ubic?.fuente === 'gps' ? 'Tu ubicación actual' : esc(S.ubic?.barrio || 'Olivos')}</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="entrar-comercio"><span class="ic-caja">${icon('local', 20)}</span><span class="col crece"><span class="fuerte">Pasar al modo local</span><span class="mini">Ver la app como un comercio</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="reiniciar"><span class="ic-caja" style="background:var(--rojo-50);color:var(--rojo)">${icon('refrescar', 20)}</span><span class="col crece"><span class="fuerte">Reiniciar la demo</span><span class="mini">Borra lo que hiciste en este celu</span></span></button>
      </div>
      ${instalarUI(true)}
    </div>`,
  };
}

function noEncontrado() {
  return { html: `${barra({ titulo: '' })}<div class="cuerpo">${vacio('alerta', 'No encontramos eso', 'Puede que ya no esté disponible.', '<button class="btn chico" data-tab="c/mapa">Ir al mapa</button>')}</div>` };
}

// ---------------------------------------------------------------------------
export const pantallas = {
  bienvenida, 'c/ubicacion': ubicacion, 'c/mapa': mapa, 'c/pack': detalle, 'c/pago': pago,
  'c/reserva': reserva, 'c/reservas': reservas, 'c/calificar': calificar, 'c/perfil': perfil,
};

export const acciones = {
  'entrar-cliente': () => { S.rol = 'cliente'; guardar(); nav.go(S.ubic ? 'c/mapa' : 'c/ubicacion', { raiz: true }); },
  'usar-gps': async (ds, b) => {
    if (!('geolocation' in navigator) || !window.isSecureContext) { usarZona(ZONAS[0], 'No se puede usar el GPS acá: arrancamos en Olivos.'); return; }
    b.innerHTML = '<span class="spin"></span> Buscando tu ubicación'; b.classList.add('off');
    navigator.geolocation.getCurrentPosition(pos => {
      ubicar({ lat: pos.coords.latitude, lng: pos.coords.longitude, fuente: 'gps', barrio: 'tu zona' });
      evento('ubicacion', { fuente: 'gps' });
      nav.go('c/mapa', { raiz: true });
    }, () => usarZona(ZONAS[0], 'No pudimos usar tu ubicación: arrancamos en Olivos.'), { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
  },
  'elegir-zona': () => {
    const h = abrirHoja(`<h2>Elegí una zona</h2><div class="lista">${ZONAS.map((z, i) => `<button class="item" data-z="${i}"><span class="ic-caja">${icon('pin', 20)}</span><span class="crece fuerte">${z[0]}</span>${icon('adelante', 20, 'chev')}</button>`).join('')}</div>`);
    h.addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (b) { cerrarHoja(); usarZona(ZONAS[+b.dataset.z]); } });
  },
  'menu-demo-cliente': () => {
    const zona = S.ubic?.fuente === 'gps' ? 'Tu ubicación actual' : (S.ubic?.barrio || 'Olivos');
    // los botones usan acciones que ya existen: main.js las resuelve y cada una cierra esta hoja al navegar
    abrirHoja(`<div class="fila entre"><h2>Demo</h2><span class="badge gris">Modo cliente</span></div>
      <div class="lista">
        <button class="item" data-act="entrar-comercio"><span class="ic-caja">${icon('local', 20)}</span><span class="col crece"><span class="fuerte">Pasar al modo local</span><span class="mini">Ver la app como un comercio: publicar, estación, Intelligence</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="elegir-zona"><span class="ic-caja">${icon('pin', 20)}</span><span class="col crece"><span class="fuerte">Cambiar de zona</span><span class="mini">${esc(zona)}</span></span>${icon('adelante', 20, 'chev')}</button>
        <button class="item" data-act="reiniciar"><span class="ic-caja" style="background:var(--rojo-50);color:var(--rojo)">${icon('refrescar', 20)}</span><span class="col crece"><span class="fuerte">Reiniciar la demo</span><span class="mini">Borra lo que hiciste en este celu</span></span></button>
      </div>
      <p class="mini">Los datos de la demo son simulados y quedan solo en este celu.</p>`);
  },
  'abrir-filtros': () => abrirFiltros(),
  'filtro-rapido': ds => { const a = S.filtros[ds.grupo]; const i = a.indexOf(ds.v); i >= 0 ? a.splice(i, 1) : a.push(ds.v); vibrar(6); guardar(); nav.render(); },
  'limpiar-filtros': () => { Object.assign(S.filtros, { tam: [], cond: [], cat: [], distKm: 3 }); buscar = ''; guardar(); nav.render(); },
  centrar: () => { enfocar(S.ubic || ZONA_NORTE, 15); },
  'medio-pago': ds => { medioPago = ds.v; nav.render(); },
  pagar: (ds, b) => pagar(ds.id, b),
  'seg-reservas': ds => { segReservas = ds.v; nav.render(); },
  estrella: ds => { calif.estrellas = +ds.v; vibrar(8); nav.render(); },
  'tag-calif': ds => { const i = calif.tags.indexOf(ds.v); i >= 0 ? calif.tags.splice(i, 1) : calif.tags.push(ds.v); nav.render(); },
  'enviar-calif': ds => {
    const r = S.reservas.find(x => x.id === ds.id);
    r.calificacion = calif.estrellas; r.tags = [...calif.tags];
    r.comentario = (document.getElementById('comentario')?.value || '').slice(0, 400);
    evento('calificacion', { estrellas: r.calificacion, pista: r.tags.includes('Coincidió con la pista') });
    calif = { estrellas: 0, tags: [] };
    guardar();
    toast('¡Gracias! Tu calificación ayuda al local y a la IA.');
    nav.atras();
  },
  'editar-nombre': () => {
    const h = abrirHoja(`<h2>Tu nombre</h2><div class="campo"><label for="nom">Así te ve el local cuando retirás</label><input class="input" id="nom" maxlength="30" value="${esc(S.perfil.nombre)}" autocomplete="given-name"></div><button class="btn bloque" data-ok>Guardar</button>`);
    h.querySelector('[data-ok]').addEventListener('click', () => { S.perfil.nombre = h.querySelector('#nom').value.trim().slice(0, 30); guardar(); cerrarHoja(); nav.render(); });
  },
  'forma-nivel': () => {
    const { act } = nivel(S.consumidor.packs);
    const h = abrirHoja(`<h2>¿Cómo se muestra tu nivel?</h2><div class="lista">${[['a', act.a], ['o', act.o], ['n', act.n + ' (solo el nivel)']].map(([k, t]) => `<button class="item" data-fm="${k}"><span class="crece fuerte">${esc(t)}</span>${S.perfil.forma === k ? icon('check', 20, 'verde') : ''}</button>`).join('')}</div>`);
    h.addEventListener('click', e => { const b = e.target.closest('[data-fm]'); if (b) { S.perfil.forma = b.dataset.fm; guardar(); cerrarHoja(); nav.render(); } });
  },
};

function usarZona(z, aviso) {
  ubicar({ lat: z[1], lng: z[2], fuente: 'manual', barrio: z[0] });
  evento('ubicacion', { fuente: 'manual', zona: z[0] });
  if (aviso) toast(aviso, { ic: 'info', sinTabs: true });
  nav.go('c/mapa', { raiz: true });
}

// cuando el comercio entrega un pack en este mismo celu, suma al perfil del consumidor
export function sumarAlPerfil(r) {
  S.consumidor.packs += 1;
  S.consumidor.kg = Math.round((S.consumidor.kg + r.pesoG / 1000) * 10) / 10;
  S.consumidor.ahorro += r.valor - r.precio;
}
