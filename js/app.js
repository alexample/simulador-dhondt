/* Simulador D'Hondt: interfaz. Depende de data/elecciones.js y js/electoral.js */
(function () {
  'use strict';
  const D = window.DATOS_ELECTORALES;
  const E = window.Electoral;
  const fmt = new Intl.NumberFormat('es-ES');
  const fmtPct = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const $ = (s, el = document) => el.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const k of kids) if (k != null) n.append(k);
    return n;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  // Orden de izquierda a derecha en el hemiciclo (convención de asientos).
  const ORDEN = ['CUP', 'BILDU', 'BNG', 'UP', 'SUMAR', 'MP', 'ERC', 'PSOE', 'PACMA', 'CHA', 'MES', 'ADELANTE', 'GBAI', 'NC',
    'PNV', 'JUNTS', 'PDECAT', 'CCA', 'PRC', 'EXISTE', 'SORIAYA', 'XAV', 'UPL', 'VPAL', 'ZSI', 'JMM', 'MDYC', 'CPM', 'CS', 'UPN', 'NASUMA', 'PP', 'VOX'];
  const orden = (p) => { const i = ORDEN.indexOf(p); return i < 0 ? 50 : i; };
  const METODOS = { dhondt: "D'Hondt", sainte: 'Sainte-Laguë', hare: 'Hare provincial', nacional: 'Nacional proporcional' };
  const P = (k) => D.partidos[k] || { nombre: k, corto: k, color: '#888' };

  const state = { eleccion: Object.keys(D.elecciones)[0], metodo: 'dhondt', umbral: 3, sel: '28', mapa: 'ganador', partidoMapa: 'PP', circ: {}, res: null };

  function cargarEleccion(id) {
    state.eleccion = id;
    state.circ = {};
    for (const [ine, c] of Object.entries(D.elecciones[id].provincias)) {
      state.circ[ine] = { escanos: c.escanos, blanco: c.blanco, otros: c.otros, votos: { ...c.votos } };
    }
  }
  const original = (ine) => D.elecciones[state.eleccion].provincias[ine];

  // ---------- Cálculo ----------
  function calcular() {
    const res = { prov: {}, tot: { dhondt: {}, sainte: {}, hare: {}, real: {} }, votos: {}, validos: 0, escanos: 0 };
    for (const [ine, c] of Object.entries(state.circ)) {
      const r = {};
      for (const m of ['dhondt', 'sainte', 'hare']) {
        r[m] = E.repartir(c, m, state.umbral);
        for (const [p, s] of Object.entries(r[m].reparto)) res.tot[m][p] = (res.tot[m][p] || 0) + s;
      }
      res.prov[ine] = r;
      res.validos += r.dhondt.validos;
      res.escanos += c.escanos;
      for (const [p, v] of Object.entries(c.votos)) res.votos[p] = (res.votos[p] || 0) + v;
      for (const [p, s] of Object.entries(original(ine).oficial)) res.tot.real[p] = (res.tot.real[p] || 0) + s;
    }
    res.tot.nacional = E.repartoNacional(Object.values(state.circ), res.escanos, 'hare', 0).reparto;
    state.res = res;
    return res;
  }
  const totalesMetodo = () => state.res.tot[state.metodo];
  const repartoProv = (ine) => {
    const m = state.metodo === 'nacional' ? 'dhondt' : state.metodo;
    return state.res.prov[ine][m].reparto;
  };

  // ---------- Hemiciclo ----------
  function posicionesHemiciclo(n) {
    const filas = Math.max(4, Math.round(Math.sqrt(n / 3.2)));
    const r0 = 0.42;
    const radios = Array.from({ length: filas }, (_, i) => r0 + (1 - r0) * (i / (filas - 1)));
    const suma = radios.reduce((a, b) => a + b, 0);
    let cuentas = radios.map((r) => Math.floor((n * r) / suma));
    let falta = n - cuentas.reduce((a, b) => a + b, 0);
    for (let i = filas - 1; falta > 0; i = (i - 1 + filas) % filas, falta--) cuentas[i]++;
    const pos = [];
    radios.forEach((r, i) => {
      const k = cuentas[i];
      for (let j = 0; j < k; j++) {
        const a = Math.PI - (k === 1 ? Math.PI / 2 : (j / (k - 1)) * Math.PI);
        pos.push({ x: r * Math.cos(a), y: r * Math.sin(a), a, r });
      }
    });
    pos.sort((p, q) => q.a - p.a || q.r - p.r);
    return { pos, radioPunto: (1 - r0) / filas * 0.42 };
  }

  function renderHemiciclo() {
    const tot = totalesMetodo();
    const n = state.res.escanos;
    const partidos = Object.keys(tot).filter((p) => tot[p] > 0).sort((a, b) => orden(a) - orden(b));
    const colores = [];
    for (const p of partidos) for (let i = 0; i < tot[p]; i++) colores.push(P(p).color);
    const { pos, radioPunto } = posicionesHemiciclo(n);
    const W = 400, H = 230, cx = 200, cy = 200, R = 190;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}` });
    pos.forEach((p, i) => s.append(svg('circle', { cx: (cx + p.x * R).toFixed(1), cy: (cy - p.y * R).toFixed(1), r: (radioPunto * R).toFixed(2), fill: colores[i] || 'var(--tile-empty)' })));
    const mayoria = Math.floor(n / 2) + 1;
    const t = svg('text', { x: cx, y: cy - 8, 'text-anchor': 'middle', class: 'total', 'font-size': 34 });
    t.textContent = n;
    const t2 = svg('text', { x: cx, y: cy + 24, 'text-anchor': 'middle', class: 'total-sub' });
    t2.textContent = `escaños · mayoría absoluta ${mayoria}`;
    s.append(t, t2);
    const cont = $('#hemiciclo');
    cont.replaceChildren(s);

    const ley = $('#leyenda');
    ley.replaceChildren();
    const real = state.res.tot.real;
    [...partidos].sort((a, b) => tot[b] - tot[a]).forEach((p) => {
      const d = tot[p] - (real[p] || 0);
      ley.append(el('li', {}, el('span', { class: 'dot', style: `background:${P(p).color}` }),
        el('span', { text: P(p).corto }), el('b', { class: 'num', text: tot[p] }),
        d ? el('span', { class: 'delta ' + (d > 0 ? 'up' : 'down'), text: (d > 0 ? '+' : '') + d }) : null));
    });
    const editado = Object.keys(state.circ).some(esEditada);
    $('#resumen-nota').textContent = `${METODOS[state.metodo]} · ${D.elecciones[state.eleccion].corto}` +
      (editado ? ' · con tus cambios' : ' · votos reales') + ' · diferencias frente al resultado real';
  }

  function esEditada(ine) {
    const c = state.circ[ine], o = original(ine);
    if (c.escanos !== o.escanos || c.blanco !== o.blanco || c.otros !== o.otros) return true;
    return Object.keys(o.votos).some((p) => c.votos[p] !== o.votos[p]);
  }

  // ---------- Mapa ----------
  const TW = 56, TH = 50, GAP = 5;
  function renderMapa() {
    const provs = D.provincias;
    const maxX = Math.max(...provs.map((p) => p.x)) + 1, maxY = Math.max(...provs.map((p) => p.y)) + 1;
    const W = maxX * (TW + GAP) + GAP, H = maxY * (TH + GAP) + GAP;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H.toFixed(0)}`, role: 'group', 'aria-label': 'Mapa de circunscripciones' });
    // Recuadros para Canarias y para Ceuta y Melilla
    s.append(svg('rect', { class: 'mapa-sea', x: GAP / 2, y: 8.15 * (TH + GAP), width: 2 * (TW + GAP), height: TH + GAP * 2, rx: 8 }));
    s.append(svg('rect', { class: 'mapa-sea', x: 2.5 * (TW + GAP), y: 7.95 * (TH + GAP), width: 3 * (TW + GAP), height: TH + GAP * 2, rx: 8 }));

    let maxPct = 0;
    if (state.mapa === 'partido') {
      for (const [ine, c] of Object.entries(state.circ)) {
        const v = c.votos[state.partidoMapa] || 0;
        maxPct = Math.max(maxPct, v / state.res.prov[ine].dhondt.validos);
      }
    }
    for (const p of provs) {
      const c = state.circ[p.ine];
      const rep = repartoProv(p.ine);
      const x = GAP + p.x * (TW + GAP), y = GAP + p.y * (TH + GAP);
      const g = svg('g', { class: 'tile' + (p.ine === state.sel ? ' sel' : ''), tabindex: 0, role: 'button', 'aria-label': `${p.nombre}, ${c.escanos} escaños` });
      g.addEventListener('click', () => seleccionar(p.ine));
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleccionar(p.ine); } });
      const title = svg('title');
      title.textContent = `${p.nombre} (${c.escanos}): ` + Object.entries(rep).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${P(k).corto} ${n}`).join(', ');
      g.append(title);

      let fill = 'var(--tile-empty)', txt = 'var(--ink)', opacity = 1;
      const ganador = Object.entries(c.votos).sort((a, b) => b[1] - a[1])[0];
      if (state.mapa === 'ganador' && ganador) { fill = P(ganador[0]).color; txt = '#fff'; }
      if (state.mapa === 'cambios') {
        const cambia = difiere(rep, original(p.ine).oficial);
        fill = cambia ? 'var(--change)' : 'var(--tile-empty)';
        txt = cambia ? '#1a1a1a' : 'var(--muted)';
      }
      if (state.mapa === 'partido') {
        const v = c.votos[state.partidoMapa] || 0;
        const pct = v / state.res.prov[p.ine].dhondt.validos;
        fill = v ? P(state.partidoMapa).color : 'var(--tile-empty)';
        opacity = v ? 0.18 + 0.82 * (pct / (maxPct || 1)) : 1;
        txt = opacity > 0.55 ? '#fff' : 'var(--ink)';
      }
      const bg = svg('rect', { class: 'tile-bg', x, y, width: TW, height: TH, rx: 6, fill });
      if (opacity !== 1) bg.setAttribute('fill-opacity', opacity.toFixed(2));
      g.append(bg);
      const a = svg('text', { x: x + 6, y: y + 18, class: 'tile-abr', fill: txt }); a.textContent = p.abr;
      const nn = svg('text', { x: x + TW - 6, y: y + 17, class: 'tile-n', 'text-anchor': 'end', fill: txt });
      nn.textContent = state.mapa === 'partido'
        ? fmtPct.format(100 * (c.votos[state.partidoMapa] || 0) / state.res.prov[p.ine].dhondt.validos)
        : c.escanos;
      g.append(a, nn);
      // franja de escaños
      const seats = Object.entries(rep).sort((q, r) => orden(q[0]) - orden(r[0]));
      const sx = x + 4, sw = TW - 8, sy = y + TH - 16, sh = 11;
      g.append(svg('rect', { x: sx - 1, y: sy - 1, width: sw + 2, height: sh + 2, rx: 2, fill: 'var(--surface)' }));
      let acc = 0;
      for (const [k, n] of seats) {
        const w = (sw * n) / c.escanos;
        g.append(svg('rect', { x: (sx + acc).toFixed(2), y: sy, width: Math.max(0.5, w - (c.escanos > 1 ? 0.6 : 0)).toFixed(2), height: sh, fill: P(k).color }));
        acc += w;
      }
      s.append(g);
    }
    $('#mapa').replaceChildren(s);
  }
  const difiere = (a, b) => {
    const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of ks) if ((a[k] || 0) !== (b[k] || 0)) return true;
    return false;
  };

  // ---------- Panel de provincia ----------
  let panelRefs = null;
  function construirPanel() {
    const ine = state.sel;
    const prov = D.provincias.find((p) => p.ine === ine);
    const c = state.circ[ine];
    const o = original(ine);
    const panel = $('#panel');
    panel.replaceChildren();
    panelRefs = { filas: {} };

    const stepper = el('div', { class: 'stepper', role: 'group', 'aria-label': 'Escaños de la circunscripción' },
      el('button', { type: 'button', 'aria-label': 'Un escaño menos', text: '−', onclick: () => cambiarEscanos(-1) }),
      (panelRefs.escanos = el('output', { text: c.escanos })),
      el('button', { type: 'button', 'aria-label': 'Un escaño más', text: '+', onclick: () => cambiarEscanos(1) }),
      el('span', { class: 'muted small', text: 'escaños' }));
    panel.append(el('div', { class: 'prov-head' },
      el('div', {}, el('h2', { id: 'h-prov', text: prov.nombre }), el('p', { class: 'muted small', style: 'margin:0', text: prov.ccaa })),
      stepper,
      el('button', { type: 'button', class: 'btn', text: 'Restablecer provincia', onclick: () => { restablecerProvincia(ine); construirPanel(); actualizar(); } })));
    panelRefs.strip = el('div', { class: 'seat-strip', 'aria-label': 'Escaños simulados' });
    panelRefs.validos = el('p', { class: 'muted small', style: 'margin:0' });
    panel.append(panelRefs.strip, panelRefs.validos);

    const filas = el('div', { class: 'filas' });
    const partidos = Object.keys(o.votos).sort((a, b) => o.votos[b] - o.votos[a]);
    const validosOrig = E.validos(o);
    for (const p of partidos) filas.append(filaVotos(p, P(p).nombre, P(p).color, Math.max(o.votos[p] * 2, validosOrig * 0.4), true));
    filas.append(filaVotos('_blanco', 'Votos en blanco', '#9AA3B2', Math.max(o.blanco * 4, validosOrig * 0.05), false));
    filas.append(filaVotos('_otros', 'Otras candidaturas (no compiten por escaño)', '#7D8594', Math.max(o.otros * 4, validosOrig * 0.05), false));
    panel.append(filas);

    // Transferencia de votos
    const opts = () => [...partidos.map((p) => [p, P(p).corto]), ['_blanco', 'En blanco'], ['_otros', 'Otros'], ['_abst', 'Abstención']];
    const selDe = el('select', { id: 'tr-de' }, ...opts().filter((x) => x[0] !== '_abst').map(([v, t]) => el('option', { value: v, text: t })));
    const selA = el('select', { id: 'tr-a' }, ...opts().map(([v, t]) => el('option', { value: v, text: t })));
    if (partidos[1]) selA.value = partidos[1];
    const inpPct = el('input', { id: 'tr-pct', type: 'number', min: 1, max: 100, step: 1, value: 10 });
    const chk = el('input', { id: 'tr-todas', type: 'checkbox' });
    const aviso = el('p', { class: 'aviso', 'aria-live': 'polite' });
    panel.append(el('div', { class: 'bloque' },
      el('h3', { text: 'Mover votos entre partidos' }),
      el('div', { class: 'transfer' },
        el('label', { for: 'tr-pct' }, 'Porcentaje', el('span', { class: 'with-unit' }, inpPct, el('em', { text: '%' }))),
        el('label', { for: 'tr-de' }, 'De', selDe),
        el('label', { for: 'tr-a' }, 'A', selA),
        el('label', { class: 'check', for: 'tr-todas' }, chk, 'En toda España'),
        el('button', { type: 'button', class: 'btn btn-primary', text: 'Aplicar', onclick: () => {
          aviso.textContent = transferir(selDe.value, selA.value, Number(inpPct.value), chk.checked);
          construirPanel(); actualizar();
          $('#panel .aviso').textContent = aviso.textContent;
        } })),
      aviso));

    // Tabla D'Hondt
    panelRefs.cocientes = el('div', { class: 'table-wrap' });
    panelRefs.tituloCoc = el('h3');
    panel.append(el('div', { class: 'bloque' }, panelRefs.tituloCoc,
      el('p', { class: 'leyenda-cocientes' },
        el('span', { class: 'lc-ultimo', text: 'último escaño repartido' }),
        el('span', { class: 'lc-siguiente', text: 'primer cociente que se queda sin escaño' })),
      panelRefs.cocientes));
  }

  function filaVotos(key, nombre, color, max, compite) {
    const ine = state.sel;
    const get = () => key === '_blanco' ? state.circ[ine].blanco : key === '_otros' ? state.circ[ine].otros : state.circ[ine].votos[key];
    const set = (v) => {
      v = Math.max(0, Math.round(v || 0));
      if (key === '_blanco') state.circ[ine].blanco = v;
      else if (key === '_otros') state.circ[ine].otros = v;
      else state.circ[ine].votos[key] = v;
    };
    const step = max > 200000 ? 100 : max > 20000 ? 10 : 1;
    max = Math.ceil(max / step / 10) * step * 10;
    const id = 'v-' + key.replace(/[^A-Za-z0-9]/g, '');
    const range = el('input', { type: 'range', min: 0, max, step, value: get(), id: id + '-r', 'aria-label': 'Votos de ' + nombre, style: `--slider:${color}` });
    const num = el('input', { type: 'number', min: 0, step: 1, value: get(), id: id + '-n', 'aria-label': 'Votos de ' + nombre + ' (número)', inputmode: 'numeric' });
    range.addEventListener('input', () => { set(Number(range.value)); num.value = get(); actualizar(); });
    num.addEventListener('input', () => {
      set(Number(num.value));
      if (get() > Number(range.max)) range.max = get();
      range.value = get(); actualizar();
    });
    const pct = el('span', { class: 'pct' });
    const seats = el('span', { class: 'fila-seats' });
    const hint = el('div', { class: 'fila-hint' });
    const fila = el('div', { class: 'fila' },
      el('div', { class: 'fila-top' }, el('span', { class: 'dot', style: `background:${color}` }), el('strong', { text: nombre, title: nombre })),
      compite ? seats : el('span'),
      el('div', { class: 'fila-ctrl' }, range, num, pct),
      compite ? hint : null);
    panelRefs.filas[key] = { fila, range, num, pct, seats, hint, compite, get };
    return fila;
  }

  function actualizarPanel() {
    if (!panelRefs) return;
    const ine = state.sel;
    const c = state.circ[ine];
    const o = original(ine);
    const m = state.metodo === 'nacional' ? 'dhondt' : state.metodo;
    const r = state.res.prov[ine][m];
    const val = r.validos;
    panelRefs.escanos.textContent = c.escanos;
    panelRefs.strip.replaceChildren(...Object.entries(r.reparto).sort((a, b) => orden(a[0]) - orden(b[0]))
      .flatMap(([p, n]) => Array.from({ length: n }, () => el('span', { style: `background:${P(p).color}`, title: P(p).corto }))));
    panelRefs.validos.textContent = `${fmt.format(val)} votos válidos · umbral ${fmtPct.format(state.umbral)} % = ${fmt.format(Math.ceil(val * state.umbral / 100))} votos` +
      (state.metodo === 'nacional' ? " · En modo nacional, la provincia se muestra con D'Hondt" : ` · ${METODOS[m]}`);

    for (const [key, f] of Object.entries(panelRefs.filas)) {
      const v = f.get();
      if (document.activeElement !== f.num) f.num.value = v;
      if (document.activeElement !== f.range) f.range.value = v;
      f.pct.textContent = fmtPct.format((100 * v) / (val || 1)) + ' %';
      if (!f.compite) continue;
      const s = r.reparto[key] || 0;
      const d = s - (o.oficial[key] || 0);
      f.seats.replaceChildren(el('b', { text: s }), el('span', { class: 'muted small', text: s === 1 ? 'escaño' : 'escaños' }),
        d ? el('span', { class: 'delta ' + (d > 0 ? 'up' : 'down'), text: (d > 0 ? '+' : '') + d }) : '');
      const apto = r.aptas[key] !== undefined;
      f.fila.classList.toggle('fuera', !apto);
      const partes = [];
      if (!apto && v > 0) partes.push(el('span', { class: 'warn', text: `Bajo el umbral del ${fmtPct.format(state.umbral)} %. ` }));
      const mas = E.votosParaSiguiente(c, key, m, state.umbral);
      if (mas != null) partes.push(`+${fmt.format(mas)} votos para ${s ? 'otro escaño' : 'su primer escaño'}`);
      const menos = E.margenPerdida(c, key, m, state.umbral);
      if (menos != null) partes.push((partes.length ? ' · ' : '') + `puede perder ${fmt.format(menos)} sin perder escaño`);
      f.hint.replaceChildren(...partes);
    }
    renderCocientes(r, c.escanos);
  }

  function renderCocientes(r, escanos) {
    const metodoTabla = state.metodo === 'sainte' ? 'sainte' : 'dhondt';
    const rr = metodoTabla === (state.metodo === 'nacional' ? 'dhondt' : state.metodo) ? r : E.repartir(state.circ[state.sel], metodoTabla, state.umbral);
    const cols = Math.min(escanos, 40);
    const divs = Array.from({ length: cols }, (_, i) => metodoTabla === 'sainte' ? 2 * i + 1 : i + 1);
    panelRefs.tituloCoc.replaceChildren(el('span', { text: `Tabla de cocientes (${metodoTabla === 'sainte' ? 'Sainte-Laguë' : "D'Hondt"})` }),
      state.metodo === 'hare' ? el('span', { class: 'muted small', text: 'referencia' }) : '');
    const ultimo = rr.cocientes.filter((q) => q.elegido).pop();
    const siguiente = rr.cocientes.find((q) => !q.elegido);
    const t = el('table', { class: 'cocientes' });
    t.append(el('thead', {}, el('tr', {}, el('th', { text: 'Partido' }), ...divs.map((d) => el('th', { text: '÷' + d })))));
    const tb = el('tbody');
    const partidos = Object.keys(rr.aptas).sort((a, b) => rr.aptas[b] - rr.aptas[a]);
    for (const p of partidos) {
      const tr = el('tr', {}, el('td', {}, el('span', { class: 'dot', style: `background:${P(p).color};margin-right:6px;vertical-align:-1px` }), P(p).corto));
      for (const d of divs) {
        const q = rr.cocientes.find((x) => x.partido === p && x.divisor === d);
        const cls = [q.elegido ? 'gana' : '', q === ultimo ? 'ultimo' : '', q === siguiente ? 'siguiente' : ''].join(' ').trim();
        tr.append(el('td', { class: cls, style: `--c:${P(p).color}`, text: fmt.format(Math.round(q.cociente)) }));
      }
      tb.append(tr);
    }
    t.append(tb);
    if (!partidos.length) panelRefs.cocientes.replaceChildren(el('p', { class: 'muted small', text: 'Ninguna candidatura supera el umbral.' }));
    else panelRefs.cocientes.replaceChildren(t);
    if (escanos > cols) panelRefs.cocientes.append(el('p', { class: 'muted small', text: `Se muestran los primeros ${cols} divisores.` }));
  }

  function cambiarEscanos(d) {
    const c = state.circ[state.sel];
    c.escanos = Math.max(1, Math.min(60, c.escanos + d));
    actualizar();
  }

  function restablecerProvincia(ine) {
    const o = original(ine);
    state.circ[ine] = { escanos: o.escanos, blanco: o.blanco, otros: o.otros, votos: { ...o.votos } };
  }

  function transferir(de, a, pct, todas) {
    if (de === a) return 'Elige dos opciones distintas.';
    if (!(pct > 0 && pct <= 100)) return 'El porcentaje debe estar entre 1 y 100.';
    const ines = todas ? Object.keys(state.circ) : [state.sel];
    let movidos = 0, saltadas = 0;
    for (const ine of ines) {
      const c = state.circ[ine];
      const leer = (k) => k === '_blanco' ? c.blanco : k === '_otros' ? c.otros : c.votos[k];
      const escribir = (k, v) => { if (k === '_blanco') c.blanco = v; else if (k === '_otros') c.otros = v; else if (k !== '_abst') c.votos[k] = v; };
      const vDe = leer(de);
      if (vDe == null || (a !== '_abst' && leer(a) == null)) { saltadas++; continue; }
      const x = Math.round((vDe * pct) / 100);
      escribir(de, vDe - x);
      if (a !== '_abst') escribir(a, leer(a) + x);
      movidos += x;
    }
    const nombre = (k) => ({ _blanco: 'voto en blanco', _otros: 'otras candidaturas', _abst: 'abstención' }[k] || P(k).corto);
    return `Movidos ${fmt.format(movidos)} votos de ${nombre(de)} a ${nombre(a)}` +
      (saltadas ? ` (${saltadas} circunscripciones omitidas porque alguno de los dos no se presentaba)` : '') + '.';
  }

  // ---------- Comparativa ----------
  function renderTabla() {
    const r = state.res;
    const cols = [['real', 'Real'], ['dhondt', "D'Hondt"], ['sainte', 'Sainte-Laguë'], ['hare', 'Hare provincial'], ['nacional', 'Nacional proporcional']];
    const partidos = Object.keys(r.votos).filter((p) => cols.some(([k]) => r.tot[k][p]) || r.votos[p] / r.validos > 0.005)
      .sort((a, b) => r.votos[b] - r.votos[a]);
    const t = $('#tabla');
    t.replaceChildren();
    t.append(el('thead', {}, el('tr', {}, el('th', { text: 'Partido' }), el('th', { text: 'Votos' }), el('th', { text: '%' }),
      ...cols.map(([k, n]) => el('th', { class: k === state.metodo ? 'sel' : '', text: n })))));
    const tb = el('tbody');
    for (const p of partidos) {
      tb.append(el('tr', {}, el('td', {}, el('span', { class: 'dot', style: `background:${P(p).color};margin-right:6px;vertical-align:-1px` }), P(p).corto),
        el('td', { text: fmt.format(r.votos[p]) }), el('td', { text: fmtPct.format((100 * r.votos[p]) / r.validos) }),
        ...cols.map(([k]) => el('td', { class: k === state.metodo ? 'sel' : '', text: r.tot[k][p] || '–' }))));
    }
    t.append(tb);
    const suma = (k) => Object.values(r.tot[k]).reduce((a, b) => a + b, 0);
    t.append(el('tfoot', {}, el('tr', {}, el('td', { text: 'Total' }), el('td', { text: fmt.format(r.validos) }), el('td', { text: 'válidos' }),
      ...cols.map(([k]) => el('td', { class: k === state.metodo ? 'sel' : '', text: suma(k) })))));
  }

  // ---------- Orquestación ----------
  function actualizar() {
    calcular();
    renderHemiciclo();
    renderMapa();
    renderTabla();
    actualizarPanel();
  }
  function seleccionar(ine) {
    state.sel = ine;
    construirPanel();
    actualizar();
    if (window.matchMedia('(max-width: 900px)').matches) $('#panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function opcionesPartidoMapa() {
    const s = $('#sel-partido-mapa');
    const tot = {};
    for (const c of Object.values(state.circ)) for (const [p, v] of Object.entries(c.votos)) tot[p] = (tot[p] || 0) + v;
    const lista = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
    if (!lista.includes(state.partidoMapa)) state.partidoMapa = lista[0];
    s.replaceChildren(...lista.map((p) => el('option', { value: p, text: P(p).corto })));
    s.value = state.partidoMapa;
  }

  function init() {
    const selE = $('#sel-eleccion');
    for (const [id, e] of Object.entries(D.elecciones)) selE.append(el('option', { value: id, text: e.nombre }));
    selE.addEventListener('change', () => { cargarEleccion(selE.value); opcionesPartidoMapa(); construirPanel(); actualizar(); });
    $('#sel-metodo').addEventListener('change', (ev) => { state.metodo = ev.target.value; actualizar(); });
    $('#inp-umbral').addEventListener('input', (ev) => {
      const v = Number(ev.target.value);
      if (v >= 0 && v <= 50) { state.umbral = v; actualizar(); }
    });
    $('#btn-reset-todo').addEventListener('click', () => { cargarEleccion(state.eleccion); construirPanel(); actualizar(); });
    document.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => {
      state.mapa = b.dataset.mapa;
      document.querySelectorAll('.seg-btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#sel-partido-mapa').hidden = state.mapa !== 'partido';
      renderMapa();
    }));
    $('#sel-partido-mapa').addEventListener('change', (ev) => { state.partidoMapa = ev.target.value; renderMapa(); });
    $('#fuentes').textContent = 'Fuentes: ' + Object.values(D.elecciones).map((e) => `${e.corto}: ${e.fuente}`).join(' · ') +
      '. Los votos de candidaturas pequeñas sin opción a escaño se agrupan en «otras candidaturas».';

    cargarEleccion(state.eleccion);
    opcionesPartidoMapa();
    construirPanel();
    actualizar();
  }
  init();
})();
