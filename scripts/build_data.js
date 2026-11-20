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
  PSOE: { nombre: 'PSOE (PSC en Cataluña)', corto: 'PSOE', color: '#E2001A' },
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

const js = '// Generado por scripts/build_data.js. No editar a mano: edita data/raw/*.txt\n' +
  'globalThis.DATOS_ELECTORALES = ' + JSON.stringify(out) + ';\n' +
  'if (typeof module !== "undefined") module.exports = globalThis.DATOS_ELECTORALES;\n';
fs.writeFileSync(path.join(ROOT, 'data/elecciones.js'), js);
console.log('data/elecciones.js generado:', Object.keys(out.elecciones).join(', '));
