// Visor 360° de los equipos de cada plan: modelos 3D que se giran con el dedo, con inercia,
// como los visores de producto. three.js se baja recién cuando hace falta y hay un solo lienzo
// para toda la app (se reubica en cada pantalla, igual que el mapa), así no se pierden contextos
// de WebGL ni parpadea al redibujar.
//
// Los modelos son ILUSTRATIVOS: muestran cómo es cada tipo de equipo (balanza conectada del plan
// Smart; estación automática de cámara y balanza del plan Intelligence), no un producto elegido.

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// encuadre de cada modelo: a dónde mira la cámara, a qué distancia y con qué inclinación
const ENCUADRE = {
  balanza: { y: 0.005, alto: 0.4, ancho: 0.6, incl: 0.5 },
  estacion: { y: 0.285, alto: 1.12, ancho: 0.8, incl: 0.2 },
};
const GIRO_INICIAL = -0.6;

let T = null;          // three.js, una vez cargado
let cargando = null;   // promesa de la carga
let v = null;          // { renderer, escena, camara, pivote, modelos, lienzo, ... }
let slot = null;       // contenedor actual del lienzo
let yaUsado = false;   // la persona ya lo giró: no hace falta repetir la pista
const posters = {};    // última imagen de cada modelo, para mostrar algo al instante

export const posterDe = m => posters[m] || '';
export const visorUsado = () => yaUsado;

// ------------------------------------------------------------------ geometría
function caja(w, h, d, r = 0.02, b = 0.004) {
  // caja de esquinas redondeadas y cantos biselados, apoyada sobre el plano XZ y centrada
  const x = w / 2 - b, z = d / 2 - b, rr = Math.max(r - b, 0.001);
  const s = new T.Shape();
  s.moveTo(-x + rr, -z);
  s.lineTo(x - rr, -z); s.absarc(x - rr, -z + rr, rr, -Math.PI / 2, 0);
  s.lineTo(x, z - rr); s.absarc(x - rr, z - rr, rr, 0, Math.PI / 2);
  s.lineTo(-x + rr, z); s.absarc(-x + rr, z - rr, rr, Math.PI / 2, Math.PI);
  s.lineTo(-x, -z + rr); s.absarc(-x + rr, -z + rr, rr, Math.PI, Math.PI * 1.5);
  const g = new T.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b - h / 2, 0);
  return g;
}
function disco(R, h, r = 0.008, lados = 56) {
  // cilindro de cantos redondeados (perfil torneado)
  const p = [new T.Vector2(0, -h / 2), new T.Vector2(R - r, -h / 2)];
  for (let i = 1; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); p.push(new T.Vector2(R - r + Math.cos(a) * r, -h / 2 + r + Math.sin(a) * r)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); p.push(new T.Vector2(R - r + Math.cos(a) * r, h / 2 - r + Math.sin(a) * r)); }
  p.push(new T.Vector2(0, h / 2));
  return new T.LatheGeometry(p, lados);
}
function malla(geo, mat, x = 0, y = 0, z = 0, sombra = true) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = sombra; m.receiveShadow = true;
  return m;
}
function textura(ancho, alto, dibujar) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  dibujar(c.getContext('2d'), ancho, alto);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = v.renderer.capabilities.getMaxAnisotropy();
  return t;
}
const FUENTE = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function texPantalla() {
  // lo que muestra el visor de la balanza: el peso, la unidad y el estado de la conexión
  return textura(640, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#C8F5B4';
    c.textBaseline = 'middle';
    c.font = `600 84px ${FUENTE}`;
    c.fillText('0,00', 34, h / 2 + 4);
    const fin = 34 + c.measureText('0,00').width;
    c.font = `600 40px ${FUENTE}`;
    c.fillStyle = 'rgba(200,245,180,.72)';
    c.fillText('kg', fin + 14, h / 2 + 20);
    // ondas de conexión
    c.strokeStyle = '#C8F5B4'; c.lineWidth = 7; c.lineCap = 'round';
    const cx = w - 78, cy = h / 2 + 22;
    for (let i = 1; i <= 3; i++) { c.globalAlpha = 0.35 + i * 0.2; c.beginPath(); c.arc(cx, cy, i * 15, Math.PI * 1.22, Math.PI * 1.78); c.stroke(); }
    c.globalAlpha = 1;
    c.beginPath(); c.arc(cx, cy, 5, 0, Math.PI * 2); c.fillStyle = '#C8F5B4'; c.fill();
  });
}
function texMarca() {
  return textura(512, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(40,52,43,.62)';
    c.textBaseline = 'middle';
    c.font = `800 54px "Montserrat", ${FUENTE}`;
    c.fillText('aprovecho', 8, h / 2 + 3);
  });
}
function texSombra() {
  // mancha suave bajo el equipo, para que apoye en el piso
  return textura(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(20,26,21,.55)'); g.addColorStop(0.55, 'rgba(20,26,21,.16)'); g.addColorStop(1, 'rgba(20,26,21,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}

// ------------------------------------------------------------------ materiales y modelos
function materiales() {
  return {
    acero: new T.MeshStandardMaterial({ color: 0xdfe2e0, metalness: 1, roughness: 0.22, envMapIntensity: 1.15 }),
    aluminio: new T.MeshStandardMaterial({ color: 0xc9cecb, metalness: 0.95, roughness: 0.42 }),
    blanco: new T.MeshStandardMaterial({ color: 0xf3f4f0, metalness: 0, roughness: 0.52 }),
    grafito: new T.MeshStandardMaterial({ color: 0x1d231f, metalness: 0.15, roughness: 0.48 }),
    pantalla: new T.MeshStandardMaterial({ color: 0x0b0e0c, metalness: 0, roughness: 0.38, envMapIntensity: 0.35 }),
    goma: new T.MeshStandardMaterial({ color: 0x131614, metalness: 0, roughness: 0.92 }),
    vidrio: new T.MeshPhysicalMaterial({ color: 0x0a0d0b, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
    verde: new T.MeshStandardMaterial({ color: 0x2f6b34, metalness: 0, roughness: 0.45 }),
    luzVerde: new T.MeshBasicMaterial({ color: 0x7ee08a, toneMapped: false }),
    luzCalida: new T.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false }),
  };
}
// Los modelos se arman con el cuerpo a 12 mm del piso y después bajan 8 mm: quedan apoyados sobre
// patas cortas, sin la rendija por la que se colaba la luz y dibujaba una sombra rayada.
const BAJAR = 0.008;
function patas(g, m, w, d) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(malla(disco(0.02, 0.006, 0.002, 24), m.goma, sx * (w / 2 - 0.045), BAJAR + 0.003, sz * (d / 2 - 0.045), false));
}
function sombraDeContacto(g, w, d) {
  const s = new T.Mesh(new T.PlaneGeometry(w * 1.55, d * 1.55), new T.MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false, opacity: 0.7 }));
  s.rotation.x = -Math.PI / 2; s.position.y = BAJAR + 0.0015;
  g.add(s);
  g.position.y = -BAJAR;
}

function armarBalanza(m) {
  // Balanza conectada (plan Smart): cuerpo bajo, plato de acero y un visor al frente
  const g = new T.Group();
  const W = 0.36, D = 0.31;
  g.add(malla(caja(W, 0.046, D, 0.04, 0.006), m.blanco, 0, 0.035, 0));
  g.add(malla(caja(W - 0.036, 0.009, D - 0.092, 0.03, 0.003), m.acero, 0, 0.0625, -0.03));     // plato
  g.add(malla(caja(0.17, 0.004, 0.044, 0.012, 0.0015), m.pantalla, 0.072, 0.06, D / 2 - 0.036, false)); // visor
  const pant = new T.Mesh(new T.PlaneGeometry(0.155, 0.031), new T.MeshBasicMaterial({ map: texPantalla(), transparent: true, toneMapped: false }));
  pant.rotation.x = -Math.PI / 2; pant.position.set(0.072, 0.0625, D / 2 - 0.036);
  g.add(pant);
  const marca = new T.Mesh(new T.PlaneGeometry(0.105, 0.0197), new T.MeshBasicMaterial({ map: texMarca(), transparent: true }));
  marca.rotation.x = -Math.PI / 2; marca.position.set(-0.098, 0.0585, D / 2 - 0.036);
  g.add(marca);
  g.add(malla(caja(0.07, 0.004, 0.0035, 0.0015, 0.001), m.luzVerde, 0, 0.03, D / 2 + 0.0005, false)); // luz de encendido
  patas(g, m, W, D);
  sombraDeContacto(g, W, D);
  return g;
}

function armarEstacion(m) {
  // Estación automática (plan Intelligence): balanza de base y una cámara cenital sobre un brazo
  const g = new T.Group();
  const W = 0.44, D = 0.4;
  g.add(malla(caja(W, 0.05, D, 0.045, 0.006), m.grafito, 0, 0.037, 0));
  g.add(malla(caja(W - 0.07, 0.009, D - 0.13, 0.03, 0.003), m.acero, 0, 0.0665, 0.03));        // plato
  g.add(malla(caja(0.08, 0.004, 0.0035, 0.0015, 0.001), m.luzVerde, 0, 0.032, D / 2 + 0.0005, false));
  // brazo: un solo tubo que sube por atrás y se curva hacia adelante
  const zA = -D / 2 + 0.05;
  const curva = new T.CatmullRomCurve3([
    new T.Vector3(0, 0.06, zA), new T.Vector3(0, 0.3, zA), new T.Vector3(0, 0.52, zA + 0.004),
    new T.Vector3(0, 0.622, zA + 0.045), new T.Vector3(0, 0.657, zA + 0.125), new T.Vector3(0, 0.657, -0.035),
  ], false, 'catmullrom', 0.35);
  g.add(malla(new T.TubeGeometry(curva, 96, 0.0155, 20), m.aluminio));
  g.add(malla(disco(0.034, 0.02, 0.006, 32), m.aluminio, 0, 0.07, zA));                       // collar del brazo
  // cabezal con la cámara y el aro de luz, mirando al plato
  const yC = 0.655;
  g.add(malla(disco(0.082, 0.042, 0.014), m.blanco, 0, yC, 0.03));
  g.add(malla(disco(0.03, 0.014, 0.004, 40), m.grafito, 0, yC - 0.026, 0.03));
  g.add(malla(disco(0.019, 0.006, 0.002, 32), m.vidrio, 0, yC - 0.034, 0.03));
  const aro = new T.Mesh(new T.TorusGeometry(0.055, 0.0042, 12, 64), m.luzCalida);
  aro.rotation.x = Math.PI / 2; aro.position.set(0, yC - 0.0215, 0.03);
  g.add(aro);
  // visor de estado sobre el brazo
  const visor = new T.Group();
  visor.add(malla(caja(0.135, 0.014, 0.062, 0.012, 0.002), m.pantalla));
  const pant = new T.Mesh(new T.PlaneGeometry(0.118, 0.0236), new T.MeshBasicMaterial({ map: texPantalla(), transparent: true, toneMapped: false }));
  pant.rotation.x = -Math.PI / 2; pant.position.y = 0.0075;
  visor.add(pant);
  visor.rotation.x = Math.PI / 2 - 0.3; visor.position.set(0, 0.285, zA + 0.026);
  g.add(visor);
  // luz del cabezal sobre el plato
  const foco = new T.SpotLight(0xfff0d6, 1.1, 1.2, 0.5, 0.7, 1.4);
  foco.position.set(0, yC - 0.03, 0.03); foco.target.position.set(0, 0.06, 0.03);
  g.add(foco, foco.target);
  patas(g, m, W, D);
  sombraDeContacto(g, W, D);
  return g;
}

function sala() {
  // "estudio" mínimo para los reflejos: paredes claras y tres paneles de luz
  const s = new T.Scene();
  const pared = new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x8c918c, side: T.BackSide }));
  s.add(pared);
  const panel = (w, h, x, y, z, i) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color().setScalar(i), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(5, 5, 0, 4.6, 0, 9);        // techo
  panel(3.4, 4, -4.4, 1.6, 2.4, 13); // luz principal, de costado
  panel(2.6, 3, 4.4, 1.2, -1.6, 6);  // relleno
  panel(4, 1.6, 0, 0.4, 4.6, 3);    // frente bajo
  return s;
}

// ------------------------------------------------------------------ puesta en marcha
async function iniciar() {
  T = await import(THREE_URL);
  const lienzo = document.createElement('canvas');
  lienzo.setAttribute('aria-hidden', 'true');
  const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  v = { renderer, lienzo };

  const escena = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  escena.environment = pm.fromScene(sala(), 0.03).texture;
  pm.dispose();

  const sol = new T.DirectionalLight(0xffffff, 1.9);
  sol.position.set(-1.3, 2.4, 1.7);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { near: 0.5, far: 6, left: -0.9, right: 0.9, top: 1.2, bottom: -0.6 });
  sol.shadow.radius = 5; sol.shadow.blurSamples = 16; sol.shadow.bias = -0.0002; sol.shadow.normalBias = 0.012;
  escena.add(sol);

  const piso = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: 0.13 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true;
  escena.add(piso);

  const pivote = new T.Group();
  escena.add(pivote);
  const m = materiales();
  const modelos = { balanza: armarBalanza(m), estacion: armarEstacion(m) };
  for (const k in modelos) { modelos[k].visible = false; pivote.add(modelos[k]); }

  const camara = new T.PerspectiveCamera(27, 1, 0.1, 20);
  Object.assign(v, {
    escena, camara, pivote, modelos,
    modelo: null, giro: GIRO_INICIAL, vel: 0, arrastrando: false, ultimoToque: 0,
    enc: { ...ENCUADRE.balanza }, escala: 1, cambio: null, activo: false, t: 0, visible: true,
  });

  lienzo.addEventListener('webglcontextlost', e => e.preventDefault());
  lienzo.addEventListener('webglcontextrestored', () => pintar());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) andar(); });
}

function encuadrar() {
  const { camara, enc } = v;
  // la distancia sale de lo que tiene que entrar: el alto del equipo o, en un marco angosto, su ancho al girar
  const dist = Math.max(enc.alto, enc.ancho / camara.aspect) / (2 * Math.tan(camara.fov * Math.PI / 360));
  camara.position.set(0, enc.y + Math.sin(enc.incl) * dist, Math.cos(enc.incl) * dist);
  camara.lookAt(0, enc.y, 0);
}
function medir() {
  if (!slot) return;
  const w = Math.max(1, slot.clientWidth), h = Math.max(1, slot.clientHeight);
  v.renderer.setSize(w, h, false);
  v.camara.aspect = w / h;
  v.camara.updateProjectionMatrix();
}
function pintar() {
  if (!v || !slot) return;
  v.pivote.rotation.y = v.giro;
  v.pivote.scale.setScalar(v.escala);
  encuadrar();
  v.renderer.render(v.escena, v.camara);
}
const suave = t => 1 - Math.pow(1 - t, 3);

// Un paso de la animación, sin depender del reloj del navegador: devuelve si hay que seguir dibujando.
function paso(dt, ahora) {
  let sigue = false;
  if (v.cambio) {
    // cambio de equipo: el que estaba se achica, entra el otro girando y la cámara se reacomoda
    const c = v.cambio;
    c.p = Math.min(1, c.p + dt / 0.62);
    if (c.p < 0.38) v.escala = 1 - suave(c.p / 0.38) * 0.94;
    else {
      if (!c.hecho) { c.hecho = true; v.modelos[c.de].visible = false; v.modelos[c.a].visible = true; }
      v.escala = 0.06 + suave((c.p - 0.38) / 0.62) * 0.94;
    }
    const e = suave(c.p), a = c.encDe, b = ENCUADRE[c.a];
    v.enc = { y: a.y + (b.y - a.y) * e, alto: a.alto + (b.alto - a.alto) * e, ancho: a.ancho + (b.ancho - a.ancho) * e, incl: a.incl + (b.incl - a.incl) * e };
    v.giro += dt * (1 - c.p) * 5.5;
    if (c.p >= 1) { v.cambio = null; v.escala = 1; v.enc = { ...b }; guardarPoster(); }
    sigue = true;
  }
  if (!v.arrastrando) {
    if (Math.abs(v.vel) > 0.02) { v.giro += v.vel * dt; v.vel *= Math.pow(0.045, dt); sigue = true; } // inercia
    else {
      v.vel = 0;
      // sin tocarlo, gira despacio solo (si está a la vista y no se pidió menos movimiento)
      if (v.visible && !quieto()) { const espera = (ahora - v.ultimoToque) / 1000; if (espera > 1.6) v.giro += dt * 0.38 * Math.min(1, (espera - 1.6) / 1.2); sigue = true; }
    }
  } else sigue = true;
  return sigue;
}
function cuadro(ahora) {
  if (!v.lienzo.isConnected || document.hidden) { v.activo = false; return; }
  const dt = Math.min(0.05, Math.max(0, (ahora - v.t) / 1000) || 0.016);
  v.t = ahora;
  const sigue = paso(dt, ahora);
  pintar();
  if (sigue) requestAnimationFrame(cuadro); else v.activo = false;
}
/** Solo para pruebas: adelanta la animación `seg` segundos de una vez y devuelve el estado. */
export function simular(seg) {
  if (!v) return null;
  const t0 = performance.now();
  for (let t = 0; t < seg; t += 1 / 60) paso(1 / 60, t0 + t * 1000);
  pintar();
  return { modelo: v.modelo, giro: +v.giro.toFixed(3), escala: +v.escala.toFixed(3), enCambio: !!v.cambio, vel: +v.vel.toFixed(3) };
}
function andar() {
  if (!v || v.activo || !slot) return;
  v.activo = true; v.t = performance.now();
  requestAnimationFrame(cuadro);
}
function guardarPoster() {
  try { pintar(); posters[v.modelo] = v.lienzo.toDataURL('image/webp', 0.86); } catch (e) { /* sin poster */ }
}

// ------------------------------------------------------------------ gestos
function gestos(el) {
  if (el._v3) return; el._v3 = true;
  let x0 = 0, tAnt = 0, id = null;
  el.addEventListener('pointerdown', e => {
    if (!v || e.button > 0) return;
    id = e.pointerId; x0 = e.clientX; tAnt = e.timeStamp;
    v.arrastrando = true; v.vel = 0; v.ultimoToque = performance.now();
    try { el.setPointerCapture(id); } catch (err) { /* sin captura */ }
    el.classList.add('agarrado');
    andar();
  });
  el.addEventListener('pointermove', e => {
    if (!v || !v.arrastrando || e.pointerId !== id) return;
    const dx = e.clientX - x0, dt = Math.max(1, e.timeStamp - tAnt) / 1000;
    const paso = dx * (Math.PI * 1.15 / Math.max(160, el.clientWidth));   // de lado a lado, algo más de media vuelta
    v.giro += paso;
    v.vel = v.vel * 0.55 + (paso / dt) * 0.45;
    x0 = e.clientX; tAnt = e.timeStamp;
    if (Math.abs(dx) > 2 && !yaUsado) { yaUsado = true; el.classList.add('usado'); }
  });
  const soltar = e => {
    if (!v || e.pointerId !== id) return;
    id = null; v.arrastrando = false; v.ultimoToque = performance.now();
    v.vel = Math.max(-9, Math.min(9, v.vel));
    el.classList.remove('agarrado');
    andar();
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('keydown', e => {
    if (!v || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    v.vel = e.key === 'ArrowLeft' ? -2.6 : 2.6; v.ultimoToque = performance.now();
    yaUsado = true; el.classList.add('usado');
    andar();
  });
}

const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (v && slot) { medir(); pintar(); } }) : null;
const aLaVista = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { if (!v) return; v.visible = es[es.length - 1].isIntersecting; if (v.visible) andar(); }) : null;

/** Pone el visor dentro de `el` mostrando `modelo` ('balanza' | 'estacion'). Se puede llamar en cada render. */
export async function montarVisor(el, modelo) {
  if (!el) return false;
  slot = el;
  if (yaUsado) el.classList.add('usado');
  try {
    if (!v) { cargando = cargando || iniciar(); await cargando; }
  } catch (e) {
    cargando = null; v = null;
    if (el.isConnected) el.classList.add('fallo');
    return false;
  }
  if (slot !== el || !el.isConnected) return false;          // mientras cargaba, la pantalla cambió
  el.prepend(v.lienzo);
  observador?.disconnect(); observador?.observe(el);
  aLaVista?.disconnect(); aLaVista?.observe(el);
  gestos(el);
  medir();
  if (v.modelo === null) {
    v.modelo = modelo; v.modelos[modelo].visible = true; v.enc = { ...ENCUADRE[modelo] };
    v.ultimoToque = performance.now() - 1200;
    pintar(); guardarPoster();
  } else if (v.modelo !== modelo) {
    v.cambio = { de: v.modelo, a: modelo, p: 0, hecho: false, encDe: { ...v.enc } };
    v.modelo = modelo; v.vel = 0; v.ultimoToque = performance.now();
    pintar();
  } else pintar();
  el.classList.add('lista');
  andar();
  return true;
}
