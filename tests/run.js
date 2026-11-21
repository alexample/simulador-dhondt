#!/usr/bin/env node
// Pruebas sin dependencias: node tests/run.js
const assert = require('assert');
const E = require('../js/electoral.js');
const D = require('../data/elecciones.js');

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('✓', name); };

test('Ejemplo clásico de D\'Hondt (7 escaños)', () => {
  const r = E.repartoDivisor({ A: 340000, B: 280000, C: 160000, D: 60000 }, 7, 'dhondt').reparto;
  assert.deepStrictEqual(r, { A: 3, B: 3, C: 1 });
});

test('Umbral del 3 % sobre votos válidos (incluye blancos)', () => {
  const circ = { escanos: 10, blanco: 2000, otros: 0, votos: { A: 50000, B: 45000, C: 2900 } };
  // válidos = 99.900 → 3 % = 2.997 → C queda fuera
  assert.strictEqual(E.repartir(circ).reparto.C, undefined);
  assert.strictEqual(E.repartir(circ, 'dhondt', 0).aptas.C, 2900);
});

test('Hare reparte todos los escaños', () => {
  const r = E.repartoHare({ A: 47000, B: 16000, C: 15800, D: 12000, E: 6100, F: 3100 }, 10).reparto;
  assert.strictEqual(Object.values(r).reduce((a, b) => a + b, 0), 10);
});

for (const [id, el] of Object.entries(D.elecciones).filter(([, e]) => !e.escenario)) {
  test(`${el.corto}: D'Hondt reproduce los escaños oficiales en las 52 circunscripciones`, () => {
    let total = 0;
    for (const [ine, c] of Object.entries(el.provincias)) {
      const r = E.repartir(c).reparto;
      assert.deepStrictEqual(r, c.oficial, `${id} ${ine}`);
      total += c.escanos;
    }
    assert.strictEqual(total, 350);
  });
}

test('23J 2023: totales nacionales del BOE', () => {
  const tot = {};
  for (const c of Object.values(D.elecciones['2023'].provincias))
    for (const [p, v] of Object.entries(c.votos)) tot[p] = (tot[p] || 0) + v;
  assert.strictEqual(tot.PP, 8160837);
  assert.strictEqual(tot.PSOE, 7821718);
  assert.strictEqual(tot.VOX, 3057000);
  assert.strictEqual(tot.SUMAR, 3044996);
});

test('29N 2026: 350 escaños con el reparto del Real Decreto 806/2026', () => {
  const el = D.elecciones['2026'];
  assert(el.escenario);
  assert.strictEqual(el.provincias['28'].escanos, 38);
  assert.strictEqual(el.provincias['11'].escanos, 8);
  assert.strictEqual(Object.values(el.provincias).reduce((a, c) => a + c.escanos, 0), 350);
  for (const c of Object.values(el.provincias)) assert(c.otros >= 0);
  assert.strictEqual(el.provincias['51'].votos.FA, undefined); // Frente Amplio no se presenta en Ceuta
  assert.strictEqual(el.provincias['08'].votos.PODEMOS, undefined); // Podemos va con ERC en Cataluña
});

test('votosParaSiguiente: con esos votos se gana el escaño y con uno menos no', () => {
  const c = D.elecciones['2023'].provincias['42']; // Soria
  const x = E.votosParaSiguiente(c, 'SORIAYA');
  const con = (k) => E.repartir({ ...c, votos: { ...c.votos, SORIAYA: c.votos.SORIAYA + k } }).reparto.SORIAYA || 0;
  assert.strictEqual(con(x), 1);
  assert.strictEqual(con(x - 1), 0);
});

test('Mapa de teselas sin posiciones repetidas', () => {
  const seen = new Set();
  for (const p of D.provincias) {
    const k = p.x + ',' + p.y;
    assert(!seen.has(k), 'posición repetida ' + k + ' ' + p.nombre);
    seen.add(k);
  }
});

console.log(`\n${n} pruebas superadas`);
