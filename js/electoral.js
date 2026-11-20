/*
 * Motor de reparto de escaños. Sin dependencias; funciona en el navegador y en Node.
 *
 * Reglas de la LOREG (art. 163) para el Congreso:
 *  - Solo entran en el reparto las candidaturas con al menos el 3 % de los votos válidos
 *    de la circunscripción (votos válidos = votos a candidaturas + votos en blanco).
 *  - Se dividen los votos de cada candidatura entre 1, 2, 3… hasta el número de escaños
 *    y se asignan los escaños a los cocientes mayores (ley D'Hondt).
 *  - Empate entre cocientes: gana la candidatura con más votos totales.
 */
(function (root) {
  'use strict';

  const DIVISORES = {
    dhondt: (i) => i + 1,            // 1, 2, 3, 4…
    sainte: (i) => 2 * i + 1,        // 1, 3, 5, 7… (Sainte-Laguë)
  };

  function candidaturasAptas(votos, validos, umbralPct) {
    const minimo = (umbralPct / 100) * validos;
    const aptas = {};
    for (const [p, v] of Object.entries(votos)) if (v > 0 && v >= minimo) aptas[p] = v;
    return aptas;
  }

  // Devuelve todos los cocientes ordenados y el reparto.
  function repartoDivisor(votos, escanos, metodo) {
    const div = DIVISORES[metodo];
    const cocientes = [];
    for (const [p, v] of Object.entries(votos)) {
      for (let i = 0; i < escanos; i++) cocientes.push({ partido: p, divisor: div(i), cociente: v / div(i), votos: v });
    }
    cocientes.sort((a, b) => b.cociente - a.cociente || b.votos - a.votos);
    const reparto = {};
    cocientes.forEach((c, i) => {
      c.orden = i + 1;
      c.elegido = i < escanos;
      if (c.elegido) reparto[c.partido] = (reparto[c.partido] || 0) + 1;
    });
    return { reparto, cocientes };
  }

  // Restos mayores con cuota Hare: proporcional "puro" dentro de cada circunscripción.
  function repartoHare(votos, escanos) {
    const total = Object.values(votos).reduce((a, b) => a + b, 0);
    const reparto = {};
    if (!total || !escanos) return { reparto };
    const cuota = total / escanos;
    const restos = [];
    let asignados = 0;
    for (const [p, v] of Object.entries(votos)) {
      const ent = Math.floor(v / cuota);
      if (ent) reparto[p] = ent;
      asignados += ent;
      restos.push({ p, resto: v / cuota - ent, v });
    }
    restos.sort((a, b) => b.resto - a.resto || b.v - a.v);
    for (let i = 0; asignados < escanos && i < restos.length; i++, asignados++) {
      reparto[restos[i].p] = (reparto[restos[i].p] || 0) + 1;
    }
    return { reparto };
  }

  function validos(circ) {
    let s = circ.blanco + circ.otros;
    for (const v of Object.values(circ.votos)) s += v;
    return s;
  }

  // circ = { escanos, blanco, otros, votos: {partido: n} }
  function repartir(circ, metodo = 'dhondt', umbralPct = 3) {
    const val = validos(circ);
    const aptas = candidaturasAptas(circ.votos, val, umbralPct);
    if (metodo === 'hare') return Object.assign(repartoHare(aptas, circ.escanos), { validos: val, aptas });
    return Object.assign(repartoDivisor(aptas, circ.escanos, metodo), { validos: val, aptas });
  }

  // Votos adicionales mínimos que necesita `partido` para ganar un escaño más,
  // manteniendo fijos los votos del resto. Devuelve null si no es posible.
  function votosParaSiguiente(circ, partido, metodo = 'dhondt', umbralPct = 3) {
    const base = repartir(circ, metodo, umbralPct).reparto[partido] || 0;
    if (base >= circ.escanos) return null;
    const probar = (extra) => {
      const c = { ...circ, votos: { ...circ.votos, [partido]: (circ.votos[partido] || 0) + extra } };
      return (repartir(c, metodo, umbralPct).reparto[partido] || 0) > base;
    };
    let hi = Math.max(1000, validos(circ));
    let guard = 0;
    while (!probar(hi) && guard++ < 6) hi *= 4;
    if (!probar(hi)) return null;
    let lo = 0;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (probar(mid)) hi = mid; else lo = mid;
    }
    return hi;
  }

  // Votos que puede perder `partido` sin perder ninguno de sus escaños (null si no tiene).
  function margenPerdida(circ, partido, metodo = 'dhondt', umbralPct = 3) {
    const actual = circ.votos[partido] || 0;
    const base = repartir(circ, metodo, umbralPct).reparto[partido] || 0;
    if (!base) return null;
    const mantiene = (menos) => {
      const c = { ...circ, votos: { ...circ.votos, [partido]: actual - menos } };
      return (repartir(c, metodo, umbralPct).reparto[partido] || 0) >= base;
    };
    let lo = 0, hi = actual;
    if (mantiene(hi)) return actual;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (mantiene(mid)) lo = mid; else hi = mid;
    }
    return lo;
  }

  // Reparto en circunscripción única nacional (todo el país junto).
  function repartoNacional(circs, escanos = 350, metodo = 'hare', umbralPct = 0) {
    const agg = { escanos, blanco: 0, otros: 0, votos: {} };
    for (const c of circs) {
      agg.blanco += c.blanco; agg.otros += c.otros;
      for (const [p, v] of Object.entries(c.votos)) agg.votos[p] = (agg.votos[p] || 0) + v;
    }
    return repartir(agg, metodo, umbralPct);
  }

  const API = { repartir, repartoDivisor, repartoHare, candidaturasAptas, votosParaSiguiente, margenPerdida, repartoNacional, validos };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Electoral = API;
})(typeof window !== 'undefined' ? window : globalThis);
