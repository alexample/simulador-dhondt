#!/usr/bin/env node
// Convierte los ficheros de data/raw/*.txt en data/elecciones.js
// Formato de cada línea raw: Provincia|votos_validos|votos_blanco|PARTIDO:votos:escaños;PARTIDO:votos:escaños;...
// Uso: node scripts/build_data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Circunscripciones: código INE, nombre, abreviatura, comunidad, posición en el mapa de teselas (col, fila)
const PROVINCIAS = [
  ['01', 'Álava', 'VI', 'País Vasco', 5, 1, ['Araba/Álava']],
  ['02', 'Albacete', 'AB', 'Castilla-La Mancha', 4, 4],
  ['03', 'Alicante', 'A', 'C. Valenciana', 5, 4, ['Alicante/Alacant']],
  ['04', 'Almería', 'AL', 'Andalucía', 4, 6],
  ['05', 'Ávila', 'AV', 'Castilla y León', 2, 3],
  ['06', 'Badajoz', 'BA', 'Extremadura', 1, 5],
  ['07', 'Illes Balears', 'PM', 'Illes Balears', 8, 3, ['Balears (Illes)']],
  ['08', 'Barcelona', 'B', 'Cataluña', 9, 1],
  ['09', 'Burgos', 'BU', 'Castilla y León', 4, 1],
  ['10', 'Cáceres', 'CC', 'Extremadura', 1, 4],
  ['11', 'Cádiz', 'CA', 'Andalucía', 2, 7],
  ['12', 'Castellón', 'CS', 'C. Valenciana', 6, 2, ['Castellón/Castelló']],
  ['13', 'Ciudad Real', 'CR', 'Castilla-La Mancha', 3, 4],
  ['14', 'Córdoba', 'CO', 'Andalucía', 2, 5],
  ['15', 'A Coruña', 'C', 'Galicia', 0, 0, ['Coruña (A)']],
  ['16', 'Cuenca', 'CU', 'Castilla-La Mancha', 5, 3],
  ['17', 'Girona', 'GI', 'Cataluña', 9, 0],
  ['18', 'Granada', 'GR', 'Andalucía', 3, 6],
  ['19', 'Guadalajara', 'GU', 'Castilla-La Mancha', 4, 3],
  ['20', 'Gipuzkoa', 'SS', 'País Vasco', 5, 0],
  ['21', 'Huelva', 'H', 'Andalucía', 1, 6],
  ['22', 'Huesca', 'HU', 'Aragón', 7, 0],
  ['23', 'Jaén', 'J', 'Andalucía', 3, 5],
  ['24', 'León', 'LE', 'Castilla y León', 2, 1],
  ['25', 'Lleida', 'L', 'Cataluña', 8, 0],
  ['26', 'La Rioja', 'LO', 'La Rioja', 6, 1, ['Rioja (La)']],
  ['27', 'Lugo', 'LU', 'Galicia', 1, 0],
  ['28', 'Madrid', 'M', 'C. de Madrid', 3, 3],
  ['29', 'Málaga', 'MA', 'Andalucía', 3, 7],
  ['30', 'Murcia', 'MU', 'Región de Murcia', 4, 5],
  ['31', 'Navarra', 'NA', 'Navarra', 6, 0],
  ['32', 'Ourense', 'OU', 'Galicia', 1, 1],
  ['33', 'Asturias', 'O', 'Asturias', 2, 0],
  ['34', 'Palencia', 'P', 'Castilla y León', 3, 1],
  ['35', 'Las Palmas', 'GC', 'Canarias', 1, 8.4, ['Palmas (Las)']],
  ['36', 'Pontevedra', 'PO', 'Galicia', 0, 1],
  ['37', 'Salamanca', 'SA', 'Castilla y León', 1, 3],
  ['38', 'S. C. de Tenerife', 'TF', 'Canarias', 0, 8.4, ['Santa Cruz de Tenerife']],
  ['39', 'Cantabria', 'S', 'Cantabria', 3, 0],
  ['40', 'Segovia', 'SG', 'Castilla y León', 3, 2],
  ['41', 'Sevilla', 'SE', 'Andalucía', 2, 6],
  ['42', 'Soria', 'SO', 'Castilla y León', 4, 2],
  ['43', 'Tarragona', 'T', 'Cataluña', 8, 1],
  ['44', 'Teruel', 'TE', 'Aragón', 5, 2],
  ['45', 'Toledo', 'TO', 'Castilla-La Mancha', 2, 4],
  ['46', 'Valencia', 'V', 'C. Valenciana', 6, 3, ['Valencia/València']],
  ['47', 'Valladolid', 'VA', 'Castilla y León', 2, 2],
  ['48', 'Bizkaia', 'BI', 'País Vasco', 4, 0],
  ['49', 'Zamora', 'ZA', 'Castilla y León', 1, 2],
  ['50', 'Zaragoza', 'Z', 'Aragón', 7, 1],
  ['51', 'Ceuta', 'CE', 'Ceuta', 2.6, 8.2],
  ['52', 'Melilla', 'ML', 'Melilla', 4.4, 8.2],
];

// Normalización de siglas de los ficheros raw → clave de partido
const ALIAS = {
  'PSC': 'PSOE', 'EH BILDU': 'BILDU', 'CCa': 'CCA', 'NCbc': 'NC', 'CUP-PR': 'CUP',
  'COALICIÓN POR MELILLA': 'CPM', 'JAÉN MERECE MÁS': 'JMM', 'SORIA YA': 'SORIAYA',
  'VAMOS PALENCIA': 'VPAL', 'ZAMORA SÍ': 'ZSI', 'ADELANTE ANDALUCÍA': 'ADELANTE', 'PDeCAT': 'PDECAT',
  'EXISTE': 'EXISTE', 'NA+': 'NASUMA',
};

const PARTIDOS = {
  PP: { nombre: 'Partido Popular', corto: 'PP', color: '#1E73BE' },
  PSOE: { nombre: 'PSOE', corto: 'PSOE', color: '#E2001A' },
  VOX: { nombre: 'Vox', corto: 'Vox', color: '#5AC035' },
  SUMAR: { nombre: 'Sumar', corto: 'Sumar', color: '#E5007E' },
  UP: { nombre: 'Unidas Podemos (y confluencias)', corto: 'UP', color: '#6B2C91' },
  CS: { nombre: 'Ciudadanos', corto: 'Cs', color: '#F47920' },
  MP: { nombre: 'Más País (y Compromís)', corto: 'Más País', color: '#0FB59C' },
  ERC: { nombre: 'Esquerra Republicana', corto: 'ERC', color: '#F5B700' },
  JUNTS: { nombre: 'Junts per Catalunya', corto: 'Junts', color: '#1BB5C4' },
  PNV: { nombre: 'EAJ-PNV', corto: 'PNV', color: '#2E8B3A' },
  BILDU: { nombre: 'EH Bildu', corto: 'Bildu', color: '#A6C51C' },
  CUP: { nombre: 'CUP', corto: 'CUP', color: '#D8C800' },
  BNG: { nombre: 'Bloque Nacionalista Galego', corto: 'BNG', color: '#7FB7DE' },
  CCA: { nombre: 'Coalición Canaria', corto: 'CC', color: '#F2D21B' },
  NC: { nombre: 'Nueva Canarias', corto: 'NC', color: '#8DB33A' },
  UPN: { nombre: 'Unión del Pueblo Navarro', corto: 'UPN', color: '#2B4A9B' },
  NASUMA: { nombre: 'Navarra Suma', corto: 'NA+', color: '#2B4A9B' },
  PRC: { nombre: 'Partido Regionalista de Cantabria', corto: 'PRC', color: '#B5C21A' },
  EXISTE: { nombre: 'Teruel Existe / Existe', corto: 'Existe', color: '#0B6B4F' },
  GBAI: { nombre: 'Geroa Bai', corto: 'GBai', color: '#C2373D' },
  PACMA: { nombre: 'PACMA', corto: 'PACMA', color: '#8FA83A' },
  XAV: { nombre: 'Por Ávila', corto: 'XAV', color: '#5C6F86' },
  UPL: { nombre: 'Unión del Pueblo Leonés', corto: 'UPL', color: '#9C2A3C' },
  SORIAYA: { nombre: 'Soria ¡Ya!', corto: 'Soria Ya', color: '#3A9F6F' },
  VPAL: { nombre: 'Vamos Palencia', corto: 'V. Palencia', color: '#6A7D3A' },
  ZSI: { nombre: 'Zamora Sí', corto: 'Zamora Sí', color: '#8A6A3A' },
  JMM: { nombre: 'Jaén Merece Más', corto: 'JM+', color: '#3C8D5A' },
  ADELANTE: { nombre: 'Adelante Andalucía', corto: 'Adelante', color: '#3BA55C' },
  PDECAT: { nombre: 'PDeCAT', corto: 'PDeCAT', color: '#2B5F8A' },
  CPM: { nombre: 'Coalición por Melilla', corto: 'CpM', color: '#3E8E41' },
  MDYC: { nombre: 'Movimiento por la Dignidad y la Ciudadanía', corto: 'MDyC', color: '#2F7D5D' },
  MES: { nombre: 'Més Esquerra', corto: 'Més', color: '#D85A2A' },
  CHA: { nombre: 'Chunta Aragonesista', corto: 'CHA', color: '#C23B2E' },
  PPSO: { nombre: 'Plataforma del Pueblo Soriano', corto: 'PPSO', color: '#6E8C5A' },
  FA: { nombre: 'Frente Amplio (y marcas territoriales)', corto: 'F. Amplio', color: '#D81E6C' },
  PODEMOS: { nombre: 'Podemos', corto: 'Podemos', color: '#6B2C91' },
  SALF: { nombre: 'Se Acabó La Fiesta', corto: 'SALF', color: '#5B4E44' },
  ALHORA: { nombre: 'Alhora', corto: 'Alhora', color: '#E07B39' },
};

const ELECCIONES = [
  { id: '2023', nombre: 'Generales 23 de julio de 2023', corto: '23J 2023', fichero: 'g2023_boe.txt',
    fuente: 'BOE-A-2023-18907 (Junta Electoral Central, resultados oficiales)' },
  { id: '2019N', nombre: 'Generales 10 de noviembre de 2019', corto: '10N 2019', fichero: 'g2019n.txt',
    fuente: 'Resultados por provincia publicados por Público (escrutinio al 100%)' },
];

const byRawName = {};
for (const p of PROVINCIAS) {
  byRawName[p[1]] = p[0];
  for (const a of p[6] || []) byRawName[a] = p[0];
}

const out = {
  generado: new Date().toISOString().slice(0, 10),
  provincias: PROVINCIAS.map(([ine, nombre, abr, ccaa, x, y]) => ({ ine, nombre, abr, ccaa, x, y })),
  partidos: PARTIDOS,
  elecciones: {},
};

for (const e of ELECCIONES) {
  const txt = fs.readFileSync(path.join(ROOT, 'data/raw', e.fichero), 'utf8').trim();
  const prov = {};
  for (const line of txt.split('\n')) {
    const [name, validos, blanco, parts] = line.split('|');
    const ine = byRawName[name];
    if (!ine) throw new Error('Provincia desconocida: ' + name);
    const votos = {}, escanos = {};
    let suma = 0, total = 0;
    for (const item of parts.split(';')) {
      const [sig, v, s] = item.split(':');
      const key = ALIAS[sig] || sig;
      if (!PARTIDOS[key]) throw new Error('Partido sin definir: ' + key);
      votos[key] = (votos[key] || 0) + Number(v);
      if (Number(s)) escanos[key] = (escanos[key] || 0) + Number(s);
      suma += Number(v); total += Number(s) || 0;
    }
    const otros = Number(validos) - Number(blanco) - suma;
    if (otros < 0) throw new Error('Votos negativos para otros en ' + name);
    prov[ine] = { escanos: total, blanco: Number(blanco), otros, votos, oficial: escanos };
  }
  if (Object.keys(prov).length !== 52) throw new Error(e.id + ': faltan circunscripciones');
  out.elecciones[e.id] = { nombre: e.nombre, corto: e.corto, fuente: e.fuente, provincias: prov };
}

// ---------- Escenario 29N 2026 ----------
// Votos de partida = votos del 23J en cada provincia, reescalados para que cada partido
// alcance su porcentaje nacional en la media de encuestas. Partidos nuevos sin historial
// (SALF, Adelante en toda Andalucía): mismo porcentaje en cada provincia donde se presentan.
// Partidos sin dato de encuesta: conservan sus votos del 23J. Alhora empieza en 0.
const E = require('../js/electoral.js');
function construirEscenario(cfg) {
  const base = out.elecciones[cfg.base].provincias;
  const ines = Object.keys(base);
  const corre = (c, ine) => (c.donde === 'todas' || c.donde.includes(ine)) && !(c.excepto || []).includes(ine);
  const val23 = (ine) => E.validos(base[ine]);
  const valNac = ines.reduce((a, i) => a + val23(i), 0);
  const votos = {};
  for (const ine of ines) votos[ine] = {};
  for (const [k, c] of Object.entries(cfg.candidaturas)) {
    if (!PARTIDOS[k]) throw new Error('Partido sin definir: ' + k);
    const donde = ines.filter((i) => corre(c, i));
    const b = Object.fromEntries(donde.map((i) => [i, c.base.reduce((a, p) => a + (base[i].votos[p] || 0), 0)]));
    const sumaB = Object.values(b).reduce((a, x) => a + x, 0);
    const objetivo = cfg.encuesta[k] != null ? (cfg.encuesta[k] / 100) * valNac : null;
    for (const i of donde) {
      let v;
      if (objetivo == null) v = b[i];
      else if (sumaB > 0) v = (b[i] * objetivo) / sumaB;
      else { const valDonde = donde.reduce((a, j) => a + val23(j), 0); v = (objetivo * val23(i)) / valDonde; }
      votos[i][k] = Math.round(v);
    }
  }
  const prov = {};
  for (const ine of ines) {
    const val = val23(ine), blanco = base[ine].blanco;
    let suma = Object.values(votos[ine]).reduce((a, x) => a + x, 0);
    if (suma > val - blanco) { // no caben: se escalan para no dejar «otros» en negativo
      const f = (val - blanco) / suma;
      for (const k of Object.keys(votos[ine])) votos[ine][k] = Math.floor(votos[ine][k] * f);
      suma = Object.values(votos[ine]).reduce((a, x) => a + x, 0);
    }
    const escanos = cfg.escanos[ine] || base[ine].escanos;
    const c = { escanos, blanco, otros: val - blanco - suma, votos: votos[ine] };
    c.oficial = E.repartir(c).reparto;
    prov[ine] = c;
  }
  const total = Object.values(prov).reduce((a, c) => a + c.escanos, 0);
  if (total !== 350) throw new Error('El escenario suma ' + total + ' escaños');
  const etiquetas = {};
  for (const [k, m] of Object.entries(cfg.etiquetas || {})) for (const [ine, t] of Object.entries(m)) (etiquetas[ine] ||= {})[k] = t;
  return { nombre: cfg.nombre, corto: cfg.corto, fuente: cfg.fuente, nota: cfg.nota, escenario: true,
    encuesta: cfg.encuesta, etiquetas, provincias: prov };
}
const cfg29n = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/raw/escenario_29n.json'), 'utf8'));
out.elecciones = { [cfg29n.id]: construirEscenario(cfg29n), ...out.elecciones };
const PSC = { '08': 'PSC-PSOE', '17': 'PSC-PSOE', '25': 'PSC-PSOE', '43': 'PSC-PSOE' };
for (const e of Object.values(out.elecciones)) {
  e.etiquetas = e.etiquetas || {};
  for (const [ine, t] of Object.entries(PSC)) (e.etiquetas[ine] ||= {}).PSOE = t;
}
out.orden = [cfg29n.id, ...ELECCIONES.map((e) => e.id)];

const js = '// Generado por scripts/build_data.js. No editar a mano: edita data/raw/*.txt\n' +
  'globalThis.DATOS_ELECTORALES = ' + JSON.stringify(out) + ';\n' +
  'if (typeof module !== "undefined") module.exports = globalThis.DATOS_ELECTORALES;\n';
fs.writeFileSync(path.join(ROOT, 'data/elecciones.js'), js);
console.log('data/elecciones.js generado:', Object.keys(out.elecciones).join(', '));
