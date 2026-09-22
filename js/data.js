// Datos de la demo y reglas de negocio. Todo número que la app muestra sale de acá.
import { redondear100, desplazar, rng } from './util.js';

// ---------- configuración de negocio (una sola fuente de verdad) ----------
export const CONFIG = {
  descuentoDefault: 0.5,          // 50% por defecto, editable entre 40 y 70%
  descuentoMin: 0.4, descuentoMax: 0.7,
  horasAnticipacion: 2,           // publicar hasta 2 h antes del cierre
  radioKm: 3,
  factorCO2: 1.6,                 // kg CO2e por kg de comida · PLACEHOLDER sin fuente
  kgCO2PorKm: 0.17,               // auto promedio · referencia a validar
  rangoNutri: 0.15,               // ±15%
  comision: null,                 // a definir: mientras sea null, $ recuperados es bruto
  umbralAlta: 0.85, umbralDuda: 0.60,
  precios: {                      // PRECIOS DE EJEMPLO
    basico: { txt: 'Sin abono', sub: '+ comisión por pack vendido' },
    smart: { txt: 'USD 450/mes', sub: '+ comisión · incluye la estación' },
    intelligence: { txt: 'USD 900/mes', sub: 'por sucursal + comisión' },
  },
};

export const PLANES = {
  basico: { nombre: 'Básico', lema: 'Mostranos lo que te sobró. Aprovecho hace el resto.',
    incluye: ['Publicás con una foto: la IA arma los packs', 'Impacto en plata, kg y CO₂', 'Reportes en Excel y PDF'] },
  smart: { nombre: 'Smart', lema: 'Medí con precisión lo que desperdiciás y recuperá más.',
    incluye: ['Todo lo de Básico', 'Estación con balanza y cámara en tu cocina', 'Publicación automática y dato medido', 'Registro de lo que se tira, con motivo'] },
  intelligence: { nombre: 'Intelligence', lema: 'Entendé por qué desperdiciás y empezá a desperdiciar menos.',
    incluye: ['Todo lo de Smart', 'Conexión con tu sistema de ventas', 'Sugerencias de producción, ventas y finanzas', 'Estadísticas y comparación de sucursales'] },
};

export const CATEGORIAS = ['Panificados', 'Pastelería', 'Sándwiches', 'Viandas'];
export const CONDICIONES = ['Sin TACC', 'Vegetariano', 'Vegano'];
export const TAMANOS = { chico: 'Chico', mediano: 'Mediano', grande: 'Grande' };

// ---------- carta de La Espiga (14 productos; uno sin precio legible) ----------
// nutri: kcal, proteínas, carbohidratos, grasas cada 100 g (valores de referencia aproximados)
export const CARTA_EJEMPLO = [
  { id: 'medialuna', nombre: 'Medialuna de manteca', cat: 'Panificados', precio: 1000, peso: 45, u: 'u', costo: 600, nutri: [410, 8, 45, 21] },
  { id: 'grasa', nombre: 'Medialuna de grasa', cat: 'Panificados', precio: 900, peso: 40, u: 'u', costo: 520, nutri: [390, 8, 47, 18] },
  { id: 'factura', nombre: 'Factura surtida', cat: 'Panificados', precio: 1000, peso: 50, u: 'u', costo: 550, nutri: [400, 7, 50, 19] },
  { id: 'bizcocho', nombre: 'Bizcochitos de grasa (100 g)', cat: 'Panificados', precio: 900, peso: 100, u: 'u', costo: 420, nutri: [450, 8, 55, 22] },
  { id: 'pan', nombre: 'Pan de campo', cat: 'Panificados', precio: 4500, peso: 1000, u: 'kg', costo: 2200, nutri: [250, 9, 50, 1.5] },
  { id: 'frances', nombre: 'Pan francés', cat: 'Panificados', precio: 3200, peso: 1000, u: 'kg', costo: 1500, nutri: [270, 9, 55, 1.2] },
  { id: 'miga', nombre: 'Sándwich de miga', cat: 'Sándwiches', precio: 1200, peso: 35, u: 'u', costo: 700, nutri: [280, 10, 28, 14] },
  { id: 'torta', nombre: 'Torta de chocolate (porción)', cat: 'Pastelería', precio: 4000, peso: 120, u: 'u', costo: 1800, nutri: [380, 5, 48, 19] },
  { id: 'ricota', nombre: 'Tarta de ricota (porción)', cat: 'Pastelería', precio: null, peso: 120, u: 'u', costo: 1500, nutri: [300, 10, 32, 15] },
  { id: 'empanada', nombre: 'Empanada de carne', cat: 'Viandas', precio: 1300, peso: 90, u: 'u', costo: 700, nutri: [250, 9, 26, 12] },
  { id: 'alfajor', nombre: 'Alfajor de maicena', cat: 'Pastelería', precio: 900, peso: 50, u: 'u', costo: 400, nutri: [420, 5, 60, 18] },
  { id: 'budin', nombre: 'Budín de limón', cat: 'Pastelería', precio: 6500, peso: 450, u: 'u', costo: 3000, nutri: [370, 5, 52, 16] },
  { id: 'chipa', nombre: 'Chipá (100 g)', cat: 'Panificados', precio: 1500, peso: 100, u: 'u', costo: 700, nutri: [330, 9, 36, 16] },
  { id: 'salvado', nombre: 'Pan de salvado', cat: 'Panificados', precio: 4800, peso: 1000, u: 'kg', costo: 2400, nutri: [240, 10, 44, 3] },
];

// ---------- IA de visión simulada: qué "ve" en cada foto de muestra ----------
export const RECONOCIMIENTO = {
  medialunas: { producto: 'medialuna', unidades: 12, confianza: 0.94 },
  facturas: { producto: 'factura', unidades: 12, confianza: 0.52,
    opciones: [['factura', 0.52], ['grasa', 0.30], ['bizcocho', 0.11]] },
  pan: { producto: 'pan', kg: 1.84, confianza: 0.91 },
  sandwiches: { producto: 'miga', unidades: 18, confianza: 0.89 },
  empanadas: { producto: 'empanada', unidades: 10, confianza: 0.72, duda: 'unidades' },
  torta: { producto: 'torta', unidades: 6, confianza: 0.88 },
  grasa: { producto: 'grasa', unidades: 12, confianza: 0.86 },
};

// ---------- reglas de armado de packs ----------
// por producto: tamaño del grupo y tamaño resultante del pack
const GRUPO = {
  medialuna: [6, 'chico', 'Media docena de medialunas'],
  grasa: [6, 'chico', 'Media docena de medialunas de grasa'],
  factura: [6, 'chico', 'Media docena de facturas'],
  alfajor: [6, 'chico', 'Media docena de alfajores'],
  miga: [6, 'chico', 'Media docena de sándwiches de miga'],
  empanada: [6, 'mediano', 'Media docena de empanadas'],
  torta: [3, 'mediano', 'Tres porciones de torta'],
  ricota: [3, 'mediano', 'Tres porciones de tarta'],
  bizcocho: [3, 'chico', '300 g de bizcochitos'],
  chipa: [3, 'chico', '300 g de chipá'],
  budin: [1, 'mediano', 'Un budín'],
};

export function armarPacks(prod, cantidad, descuento) {
  // cantidad: unidades, o kg si el producto se vende por kg
  const packs = [];
  if (prod.u === 'kg') {
    const n = Math.max(1, Math.round(cantidad / 0.9));
    const kgPack = cantidad / n;
    for (let i = 0; i < n; i++) packs.push(nuevoPack(prod, kgPack, 'mediano', `${String(kgPack.toFixed(2)).replace('.', ',')} kg de ${prod.nombre.toLowerCase()}`, descuento));
    return packs;
  }
  const [g, tam, titulo] = GRUPO[prod.id] || [Math.max(1, cantidad), 'mediano', prod.nombre];
  let resto = cantidad;
  while (resto >= g) { packs.push(nuevoPack(prod, g, tam, titulo, descuento)); resto -= g; }
  if (resto > 0) {
    if (resto >= Math.ceil(g / 2) || !packs.length) {
      packs.push(nuevoPack(prod, resto, resto >= g ? tam : 'chico', `${resto} u de ${prod.nombre.toLowerCase()}`, descuento));
    } else {
      const ult = packs[packs.length - 1];
      Object.assign(ult, nuevoPack(prod, ult.cantidad + resto, ult.tam, `${ult.cantidad + resto} u de ${prod.nombre.toLowerCase()}`, descuento));
    }
  }
  return packs;
}
function nuevoPack(prod, cantidad, tam, titulo, descuento) {
  const valor = prod.u === 'kg' ? prod.precio * cantidad : prod.precio * cantidad;
  const pesoG = prod.u === 'kg' ? cantidad * 1000 : prod.peso * cantidad;
  return { productoId: prod.id, cantidad, tam, titulo, valor, precio: redondear100(valor * (1 - descuento)), pesoG: Math.round(pesoG), cat: prod.cat };
}

// fusiona packs iguales para mostrarlos como "2 packs chicos"
export function agrupar(packs) {
  const m = new Map();
  for (const p of packs) {
    const k = p.titulo + '|' + p.precio + '|' + p.tam;
    if (m.has(k)) m.get(k).stock++; else m.set(k, { ...p, stock: 1 });
  }
  return [...m.values()];
}

// ---------- nutrición y CO2 ----------
export function nutricion(nutri100, pesoG, rango = CONFIG.rangoNutri) {
  const f = pesoG / 100;
  return nutri100.map(v => [v * f * (1 - rango), v * f * (1 + rango)]);
}
export const co2 = kg => kg * CONFIG.factorCO2;
export const kmAuto = kgCO2 => kgCO2 / CONFIG.kgCO2PorKm;

// ---------- comercios de ejemplo (ficticios), ubicados alrededor tuyo ----------
export const COMERCIOS_BASE = [
  { id: 'c1', corto: 'La Espiga', logo: { bg: '#E3A93B', fg: '#FFFFFF', emblema: 'espiga' }, nombre: 'Panadería La Espiga', cat: 'Panificados', cierre: '21:00', rating: 4.7, resenas: 312, dist: 350, rumbo: 40, color: '#E7C27E', esMio: true },
  { id: 'c2', corto: 'Don Luis', logo: { bg: '#C4432D', fg: '#FFFFFF', emblema: 'chef' }, nombre: 'Rotisería Don Luis', cat: 'Viandas', cierre: '22:00', rating: 4.5, resenas: 188, dist: 900, rumbo: 120, color: '#D9C39A', estacion: true },
  { id: 'c3', corto: 'Café Plaza', logo: { bg: '#6B4430', fg: '#F6E7D6', emblema: 'taza' }, nombre: 'Café Plaza', cat: 'Pastelería', cierre: '20:30', rating: 4.8, resenas: 97, dist: 600, rumbo: 250, color: '#E9B8A7' },
  { id: 'c4', corto: 'Lulú', logo: { bg: '#F2A0B4', fg: '#FFFFFF', emblema: 'cupcake' }, nombre: 'Pastelería Lulú', cat: 'Pastelería', cierre: '20:00', rating: 4.6, resenas: 141, dist: 1300, rumbo: 310, color: '#E9B8A7' },
  { id: 'c5', corto: 'Brote', logo: { bg: '#3E8E52', fg: '#FFFFFF', emblema: 'hoja' }, nombre: 'Almacén Natural Brote', cat: 'Viandas', cierre: '21:30', rating: 4.9, resenas: 76, dist: 1800, rumbo: 190, color: '#C9DDBC' },
  { id: 'c6', corto: 'El Buen Pan', logo: { bg: '#F08A24', fg: '#FFFFFF', emblema: 'sandwich' }, nombre: 'Sandwichería El Buen Pan', cat: 'Sándwiches', cierre: '21:00', rating: 4.4, resenas: 203, dist: 750, rumbo: 80, color: '#EAD8A6' },
  { id: 'c7', corto: 'Mamma Rosa', logo: { bg: '#D6363A', fg: '#FFFFFF', emblema: 'pizza' }, nombre: 'Pizzería Mamma Rosa', cat: 'Viandas', cierre: '23:30', rating: 4.3, resenas: 265, dist: 2200, rumbo: 20, color: '#F0C5A8', estacion: true },
  { id: 'c8', corto: 'Celia', logo: { bg: '#23907F', fg: '#FFFFFF', emblema: 'sintacc' }, nombre: 'Panadería Celia Sin TACC', cat: 'Panificados', cierre: '20:30', rating: 4.8, resenas: 59, dist: 1100, rumbo: 160, color: '#E7C27E' },
];

export function ubicarComercios(centro) {
  return COMERCIOS_BASE.map(c => ({ ...c, ...desplazar(centro, c.dist, c.rumbo) }));
}

// packs de los otros locales, para que el mapa arranque con oferta
const NUTRI_CAT = { Panificados: [360, 8, 48, 14], Pastelería: [370, 5, 50, 17], Sándwiches: [280, 10, 28, 14], Viandas: [210, 11, 20, 10] };
export function packsSemilla(dia) {
  const r = rng('packs' + dia);
  const def = [
    ['c1', 'mediano', 2000, 4100, 910, [], 'Panificados', 2, false, 'pan'],
    ['c2', 'mediano', 4500, 9000, 650, [], 'Viandas', 3, true],
    ['c2', 'grande', 7000, 14000, 1300, [], 'Viandas', 1, true],
    ['c3', 'chico', 2500, 5000, 330, ['Vegetariano'], 'Pastelería', 2, false],
    ['c4', 'mediano', 3800, 7600, 520, ['Vegetariano'], 'Pastelería', 2, false],
    ['c5', 'mediano', 4200, 8400, 600, ['Vegano', 'Sin TACC'], 'Viandas', 2, false],
    ['c6', 'chico', 2800, 5600, 280, [], 'Sándwiches', 4, false],
    ['c7', 'grande', 6000, 12000, 1100, ['Vegetariano'], 'Viandas', 2, true],
    ['c8', 'chico', 3000, 6000, 350, ['Sin TACC'], 'Panificados', 3, false],
  ];
  return def.map(([comercioId, tam, precio, valor, pesoG, cond, cat, stock, medido, productoId], i) => ({
    id: 'ps' + i, comercioId, tam, precio, valor, pesoG, cond, cat, stock, vendidos: 0,
    medido, origen: medido ? 'estacion' : 'foto', productoId: productoId || null,
    nutri100: NUTRI_CAT[cat], dia, titulo: null, creado: null, estado: 'activo',
    minutosPublicado: 20 + Math.floor(r() * 90),
  }));
}

// ---------- consumidor ----------
export const NIVELES = [
  { min: 0, a: 'Rescatadora novata', o: 'Rescatador novato', n: 'Novato' },
  { min: 5, a: 'Rescatadora comprometida', o: 'Rescatador comprometido', n: 'Comprometido' },
  { min: 25, a: 'Rescatadora experta', o: 'Rescatador experto', n: 'Experto' },
  { min: 60, a: 'Embajadora', o: 'Embajador', n: 'Embajador' },
];
export const HISTORIAL_CONSUMIDOR = { packs: 19, kg: 7.8, ahorro: 54000 };

export const MOTIVOS_MERMA = ['Sobró de producción', 'Se venció', 'Recorte de preparación', 'Resto de plato', 'Se quemó o se rompió'];
export const MOTIVOS_DESCARTE = ['No se puede hacer', 'Ya lo hago', 'No creo que funcione', 'Otro motivo'];

// ---------- Inicio del consumidor ----------
// categorías grandes (arriba) y chicas (fila deslizable)
export const CATS_GRANDES = [
  { id: 'Panificados', titulo: 'Panaderías', ilus: 'medialuna', fondo: '#FBEBD2', tinta: '#7A4A12' },
  { id: 'Viandas', titulo: 'Viandas', ilus: 'vianda', fondo: '#E3F1DC', tinta: '#23572B' },
];
export const CATS_CHICAS = [
  { id: 'Pastelería', titulo: 'Pastelería', ilus: 'torta', fondo: '#FBE1E6' },
  { id: 'Sándwiches', titulo: 'Sándwiches', ilus: 'sandwich', fondo: '#FDF1CF' },
  { id: 'Sin TACC', titulo: 'Sin TACC', ilus: 'sintacc', fondo: '#E0F2EE', cond: true },
  { id: 'Vegano', titulo: 'Vegano', ilus: 'hoja', fondo: '#E6F4DC', cond: true },
  { id: 'agotan', titulo: 'Se agotan', ilus: 'fuego', fondo: '#FDE7DC' },
  { id: 'mejores', titulo: 'Mejor puntuados', ilus: 'estrella', fondo: '#FFF3D6' },
];
export const BUSQUEDAS = ['medialunas', 'viandas', 'sin TACC', 'Don Luis', 'pastelería', 'pizza', 'vegano'];
export const BANNERS = [
  { id: 'merienda', tono: 'verde', eti: 'Hasta 70% off', titulo: 'Rescatá la merienda', texto: 'Medialunas, facturas y pan de las panaderías de tu barrio.', cta: 'Ver panaderías', ir: 'c/lista/Panificados', ilus: ['medialuna', 'cafe'] },
  { id: 'sintacc', tono: 'teal', eti: 'Nuevo', titulo: 'Packs sin TACC cerca tuyo', texto: 'Cada local declara qué puede ofrecer, pack por pack.', cta: 'Ver sin TACC', ir: 'c/lista/Sin TACC', ilus: ['sintacc'] },
  { id: 'compartir', tono: 'naranja', eti: 'Sumá gente', titulo: 'Pasale Aprovecho a un amigo', texto: 'Cuanta más gente rescata, menos comida se tira.', cta: 'Compartir', act: 'compartir-app', ilus: ['caja'] },
  { id: 'impacto', tono: 'oscuro', eti: 'Tu impacto', titulo: 'Ya rescataste {kg} kg', texto: 'Equivale a {co2} kg de CO₂e que no se emitieron.', cta: 'Ver mi perfil', ir: 'c/perfil', ilus: ['hoja'] },
];
