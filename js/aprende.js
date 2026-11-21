/* Parte educativa: laboratorio D'Hondt, valor del voto, retos, test y glosario. */
(function () {
  'use strict';
  const S = window.Simulador;
  const E = window.Electoral;
  const fmt = new Intl.NumberFormat('es-ES');
  const fmt1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const k of kids) if (k != null) n.append(k);
    return n;
  };
  const sumar = (o) => Object.values(o).reduce((a, b) => a + b, 0);

  // =============== 1. Laboratorio ===============
  const LAB_INICIAL = [
    { id: 'G', nombre: 'Partido Girasol', color: '#E39B12', votos: 46000 },
    { id: 'O', nombre: 'Partido Olivo', color: '#3F8A3A', votos: 27000 },
    { id: 'F', nombre: 'Partido Faro', color: '#2B6CB0', votos: 16000 },
    { id: 'A', nombre: 'Partido Ola', color: '#8A4FC0', votos: 11000 },
  ];
  const lab = { partidos: LAB_INICIAL.map((p) => ({ ...p })), escanos: 5, paso: 0 };
  const labP = (id) => lab.partidos.find((p) => p.id === id);

  function labCalcular() {
    const votos = Object.fromEntries(lab.partidos.map((p) => [p.id, p.votos]));
    return E.repartoDivisor(votos, lab.escanos, 'dhondt').cocientes;
  }

  function labConstruirEntradas() {
    $('#lab-partidos').replaceChildren(...lab.partidos.map((p) => {
      const inp = el('input', { type: 'number', min: 0, step: 500, value: p.votos, id: 'lab-v-' + p.id, inputmode: 'numeric' });
      inp.addEventListener('input', () => { p.votos = Math.max(0, Math.round(Number(inp.value) || 0)); lab.paso = 0; labRender(); });
      return el('label', { class: 'lab-partido', for: 'lab-v-' + p.id },
        el('span', { class: 'dot', style: `background:${p.color}` }), el('span', { text: p.nombre }), inp);
    }));
  }

  function labRender() {
    const coc = labCalcular();
    const total = sumar(Object.fromEntries(lab.partidos.map((p) => [p.id, p.votos]))) || 1;
    $('#lab-n').textContent = lab.escanos;
    const ganados = coc.slice(0, lab.paso);
    // asientos
    const asientos = [];
    for (let i = 0; i < lab.escanos; i++) {
      const g = ganados[i];
      asientos.push(el('span', { class: 'asiento' + (g ? ' lleno' : ''), style: g ? `background:${labP(g.partido).color}` : '', title: g ? `Escaño ${i + 1}: ${labP(g.partido).nombre}` : `Escaño ${i + 1} sin repartir`, text: i + 1 }));
    }
    $('#lab-escanos').replaceChildren(...asientos);
    // tabla
    const t = $('#lab-cocientes');
    const divs = Array.from({ length: lab.escanos }, (_, i) => i + 1);
    t.replaceChildren(el('thead', {}, el('tr', {}, el('th', { text: 'Partido' }), el('th', { text: '% votos' }), ...divs.map((d) => el('th', { text: '÷ ' + d })))));
    const tb = el('tbody');
    const actual = ganados[ganados.length - 1];
    const siguiente = coc[lab.paso];
    for (const p of [...lab.partidos].sort((a, b) => b.votos - a.votos)) {
      const tr = el('tr', {}, el('td', {}, el('span', { class: 'dot', style: `background:${p.color};margin-right:6px;vertical-align:-1px` }), p.nombre.replace('Partido ', '')),
        el('td', { text: fmt1.format((100 * p.votos) / total) + ' %' }));
      for (const d of divs) {
        const q = coc.find((x) => x.partido === p.id && x.divisor === d);
        const idx = coc.indexOf(q);
        const gana = idx < lab.paso;
        const cls = [gana ? 'gana' : '', q === actual ? 'ultimo' : '', lab.paso < lab.escanos && q === siguiente ? 'candidato' : ''].join(' ').trim();
        tr.append(el('td', { class: cls, style: `--c:${p.color}` }, el('span', { text: fmt.format(Math.round(q.cociente)) }), gana ? el('sup', { text: ' ' + (idx + 1) + 'º' }) : null));
      }
      tb.append(tr);
    }
    t.append(tb);
    // explicación
    const ex = $('#lab-explica');
    if (lab.paso === 0) {
      ex.replaceChildren(el('p', { html: `Hay <b>${lab.escanos} escaños</b>. La tabla ya muestra los votos de cada partido divididos entre 1, 2, 3… Pulsa <b>Repartir el siguiente escaño</b> para dárselo al número más alto.` }));
    } else {
      const p = labP(actual.partido);
      const partes = [el('p', { html: `<b>Escaño ${lab.paso}</b> para <b style="color:${p.color}">${p.nombre}</b>: su número ${fmt.format(Math.round(actual.cociente))} (= ${fmt.format(p.votos)} votos ÷ ${actual.divisor}) es el más alto de los que quedaban.` })];
      if (lab.paso < lab.escanos) {
        partes.push(el('p', { html: `Ahora, para su siguiente escaño, ${p.nombre} compite con sus votos ÷ ${actual.divisor + 1}. El próximo número más alto es <b>${fmt.format(Math.round(siguiente.cociente))}</b> (marcado en amarillo).` }));
      } else {
        partes.push(labResumen(coc, total));
      }
      ex.replaceChildren(...partes);
    }
    $('#lab-siguiente').disabled = lab.paso >= lab.escanos;
  }

  function labResumen(coc, total) {
    const rep = {};
    coc.slice(0, lab.escanos).forEach((q) => { rep[q.partido] = (rep[q.partido] || 0) + 1; });
    const hare = E.repartoHare(Object.fromEntries(lab.partidos.map((p) => [p.id, p.votos])), lab.escanos).reparto;
    const filas = lab.partidos.map((p) => el('tr', {},
      el('td', {}, el('span', { class: 'dot', style: `background:${p.color};margin-right:6px;vertical-align:-1px` }), p.nombre.replace('Partido ', '')),
      el('td', { text: fmt1.format((100 * p.votos) / total) + ' %' }),
      el('td', { text: fmt1.format((100 * (rep[p.id] || 0)) / lab.escanos) + ' %' }),
      el('td', { text: rep[p.id] || 0 }), el('td', { text: hare[p.id] || 0 })));
    const sinEscano = lab.partidos.filter((p) => !rep[p.id] && p.votos > 0);
    const caja = el('div', { class: 'lab-final' },
      el('p', { html: '<b>¡Reparto terminado!</b> Compara el porcentaje de votos con el porcentaje de escaños:' }),
      el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Partido' }), el('th', { text: '% votos' }), el('th', { text: '% escaños' }), el('th', { text: "D'Hondt" }), el('th', { text: 'Si fuera proporcional' }))), el('tbody', {}, ...filas))));
    const moral = [];
    if (sinEscano.length) moral.push(`${sinEscano.map((p) => p.nombre).join(' y ')} ${sinEscano.length > 1 ? 'tienen' : 'tiene'} votos pero ningún escaño.`);
    const ganador = lab.partidos.reduce((a, b) => ((rep[b.id] || 0) / lab.escanos - b.votos / total > (rep[a.id] || 0) / lab.escanos - a.votos / total ? b : a));
    moral.push(`El más beneficiado es ${ganador.nombre}: tiene más % de escaños que de votos.`);
    moral.push('Prueba a subir los escaños a 10 o a bajarlos a 2 y fíjate en cómo cambia: con pocos escaños, D\'Hondt premia mucho más al partido grande.');
    caja.append(el('p', { text: moral.join(' ') }));
    return caja;
  }

  $('#lab-siguiente').addEventListener('click', () => { if (lab.paso < lab.escanos) lab.paso++; labRender(); });
  $('#lab-todos').addEventListener('click', () => { lab.paso = lab.escanos; labRender(); });
  $('#lab-reset').addEventListener('click', () => { lab.partidos = LAB_INICIAL.map((p) => ({ ...p })); lab.escanos = 5; lab.paso = 0; labConstruirEntradas(); labRender(); });
  $('#lab-menos').addEventListener('click', () => { lab.escanos = Math.max(1, lab.escanos - 1); lab.paso = 0; labRender(); });
  $('#lab-mas').addEventListener('click', () => { lab.escanos = Math.min(12, lab.escanos + 1); lab.paso = 0; labRender(); });
  labConstruirEntradas();
  labRender();

  // =============== 3. Valor del voto ===============
  function barras(cont, filas, maxV, formato) {
    cont.replaceChildren(...filas.map((f) => el('div', { class: 'barra' + (f.sel ? ' sel' : '') },
      el('span', { class: 'barra-nombre', text: f.nombre }),
      el('span', { class: 'barra-pista' }, el('span', { class: 'barra-relleno', style: `width:${Math.max(1, (100 * f.valor) / maxV)}%;background:${f.color || 'var(--accent)'}` })),
      el('span', { class: 'barra-valor', text: formato(f.valor) }))));
  }
  function renderValor(state) {
    const provs = window.DATOS_ELECTORALES.provincias;
    const datos = provs.map((p) => {
      const c = state.circ[p.ine];
      return { ine: p.ine, nombre: p.nombre, valor: E.validos(c) / c.escanos };
    }).sort((a, b) => a.valor - b.valor);
    const barato = datos[0], caro = datos[datos.length - 1];
    const sel = datos.find((d) => d.ine === state.sel);
    const lista = [...datos.slice(0, 4), ...datos.slice(-4)];
    if (sel && !lista.includes(sel)) lista.splice(4, 0, sel);
    lista.forEach((d) => { d.sel = d === sel; d.color = 'var(--accent)'; });
    barras($('#valor-prov'), lista, caro.valor, (v) => fmt.format(Math.round(v)));
    $('#valor-frase').innerHTML = `En <b>${barato.nombre}</b> cada escaño se reparte entre unos <b>${fmt.format(Math.round(barato.valor))}</b> votos; en <b>${caro.nombre}</b>, entre <b>${fmt.format(Math.round(caro.valor))}</b>. Un voto en ${barato.nombre} pesa <b>${fmt1.format(caro.valor / barato.valor)} veces</b> más.`;

    const tot = state.res.tot.dhondt, votos = state.res.votos;
    const part = Object.keys(tot).filter((p) => tot[p] > 0).map((p) => ({ nombre: S.P(p).corto, valor: votos[p] / tot[p], color: S.P(p).color }))
      .sort((a, b) => a.valor - b.valor);
    const sinEsc = Object.keys(votos).filter((p) => !tot[p] && votos[p] / state.res.validos > 0.005).sort((a, b) => votos[b] - votos[a]);
    barras($('#valor-part'), part, part[part.length - 1].valor, (v) => fmt.format(Math.round(v)));
    const pb = part[0], pc = part[part.length - 1];
    let frase = `A <b>${pb.nombre}</b> cada escaño le cuesta unos <b>${fmt.format(Math.round(pb.valor))}</b> votos; a <b>${pc.nombre}</b>, unos <b>${fmt.format(Math.round(pc.valor))}</b>.`;
    if (sinEsc.length) frase += ` Y ${sinEsc.slice(0, 2).map((p) => `<b>${S.P(p).corto}</b> (${fmt.format(votos[p])} votos)`).join(' y ')} se ${sinEsc.length > 1 ? 'quedan' : 'queda'} sin ningún escaño.`;
    $('#valor-frase-p').innerHTML = frase;
  }

  // =============== 4. Retos ===============
  const oficialTotal = () => {
    const t = {};
    for (const ine of Object.keys(S.state.circ)) for (const [p, n] of Object.entries(S.original(ine).oficial)) t[p] = (t[p] || 0) + n;
    return t;
  };
  const RETOS = [
    {
      titulo: 'Rompe el bipartidismo en Soria',
      texto: 'Soria solo reparte 2 escaños. Consigue que uno sea para un partido que no sea ni PP ni PSOE.',
      pista: 'Toca Soria en el mapa y mira las pistas debajo de cada deslizador: te dicen cuántos votos faltan.',
      boton: ['Ir a Soria', () => { S.seleccionar('42'); S.irAlPanel(); }],
      check: (st) => Object.keys(st.res.prov['42'].dhondt.reparto).some((p) => p !== 'PP' && p !== 'PSOE'),
      exito: 'Has visto lo difícil que es: en una provincia de 2 escaños hace falta cerca de un tercio de los votos.',
    },
    {
      titulo: 'El último escaño se decide por poco',
      texto: 'Elige cualquier provincia y cambia quién gana un escaño moviendo, en total, menos de 2.000 votos.',
      pista: 'Busca en la tabla de cocientes la casilla negra (último escaño) y la amarilla (la primera que se queda fuera). Si están cerca, pocos votos lo cambian.',
      boton: ['Abrir el panel', () => S.irAlPanel()],
      check: (st) => Object.keys(st.circ).some((ine) => {
        const c = st.circ[ine], o = S.original(ine);
        if (c.escanos !== o.escanos) return false;
        let cambio = Math.abs(c.blanco - o.blanco) + Math.abs(c.otros - o.otros);
        for (const p of Object.keys(o.votos)) cambio += Math.abs((c.votos[p] || 0) - o.votos[p]);
        const r = st.res.prov[ine].dhondt.reparto;
        const dif = [...new Set([...Object.keys(r), ...Object.keys(o.oficial)])].some((p) => (r[p] || 0) !== (o.oficial[p] || 0));
        return dif && cambio > 0 && cambio < 2000;
      }),
      exito: 'Unos pocos miles de votos pueden mover un diputado. Por eso los partidos se vuelcan en las provincias «en el aire».',
    },
    {
      titulo: 'Quita la barrera',
      texto: 'Pon el umbral en 0 % (arriba del todo) y consigue que entre en el Congreso algún partido que antes no tenía escaños.',
      pista: 'El umbral está junto al selector de sistema. Con D\'Hondt el 3 % casi solo importa en Madrid y Barcelona, donde se reparten muchos escaños.',
      boton: ['Poner umbral 0 %', () => S.setUmbral(0)],
      check: (st) => {
        const ofi = oficialTotal(), tot = st.res.tot[st.metodo];
        return st.umbral < 3 && Object.keys(tot).some((p) => tot[p] > 0 && !ofi[p]);
      },
      exito: 'Sin umbral entran partidos más pequeños. En la mayoría de provincias, sin embargo, la barrera real es el pequeño número de escaños.',
    },
    {
      titulo: 'Más votos, menos escaños',
      texto: 'Descubre dos partidos donde el que tiene MÁS votos en toda España tiene MENOS escaños.',
      pista: 'Mira la tabla «¿Y sin la ley D\'Hondt?» y compara la columna de votos con la de escaños.',
      boton: ['Ver la tabla', () => document.getElementById('h-comp').scrollIntoView({ behavior: 'smooth' })],
      check: (st) => !!parejaInjusta(st),
      exito: () => {
        const r = parejaInjusta(S.state);
        if (!r) return '';
        const [a, b] = r, t = S.state.res.tot.dhondt, v = S.state.res.votos;
        return `Ejemplo: ${S.P(a).corto} tiene ${fmt.format(v[a])} votos y ${t[a] || 0} escaños; ${S.P(b).corto} tiene ${fmt.format(v[b])} votos y ${t[b] || 0}. El voto concentrado en pocas provincias rinde más que el repartido.`;
      },
    },
    {
      titulo: 'Mayoría absoluta',
      texto: 'Mueve votos hasta que un solo partido consiga 176 escaños o más.',
      pista: 'Usa «Ajustar a porcentajes nacionales» o «Mover votos… En toda España». ¿Con qué % de votos se llega? Seguramente con menos del 50 %.',
      boton: ['Ir al ajuste nacional', () => document.getElementById('h-encuesta').scrollIntoView({ behavior: 'smooth' })],
      check: (st) => Math.max(...Object.values(st.res.tot[st.metodo])) >= 176,
      exito: () => {
        const t = S.state.res.tot[S.state.metodo];
        const p = Object.keys(t).sort((a, b) => t[b] - t[a])[0];
        return `${S.P(p).corto} logra ${t[p]} escaños con el ${fmt1.format((100 * S.state.res.votos[p]) / S.state.res.validos)} % de los votos. D'Hondt convierte una mayoría de votos en una mayoría más grande de escaños.`;
      },
    },
    {
      titulo: 'Cambia de sistema',
      texto: 'Cambia el sistema de reparto a «Proporcional nacional». ¿Qué partido gana más escaños sin D\'Hondt? ¿Cuál pierde más?',
      pista: 'El selector de sistema está arriba. La circunscripción única cuenta todos los votos de España juntos.',
      boton: ['Probar proporcional', () => S.setMetodo('nacional')],
      check: (st) => st.metodo !== 'dhondt',
      exito: () => {
        const d = S.state.res.tot.dhondt, n = S.state.res.tot[S.state.metodo];
        const ps = [...new Set([...Object.keys(d), ...Object.keys(n)])].map((p) => [p, (n[p] || 0) - (d[p] || 0)]).sort((a, b) => b[1] - a[1]);
        const [g, pe] = [ps[0], ps[ps.length - 1]];
        return `Con este sistema, ${S.P(g[0]).corto} gana ${g[1]} escaños y ${S.P(pe[0]).corto} pierde ${-pe[1]} respecto a D'Hondt. Ningún sistema es neutral: cada uno favorece a alguien.`;
      },
    },
  ];
  function parejaInjusta(st) {
    const t = st.res.tot.dhondt, v = st.res.votos;
    const ps = Object.keys(v).filter((p) => v[p] / st.res.validos > 0.003).sort((a, b) => v[b] - v[a]);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if ((t[ps[i]] || 0) < (t[ps[j]] || 0)) return [ps[i], ps[j]];
    return null;
  }
  const hechos = new Set();
  function renderRetos(state) {
    let n = 0;
    const items = RETOS.map((r, i) => {
      let ok = false;
      try { ok = r.check(state); } catch (e) { ok = false; }
      if (ok) hechos.add(i);
      const logrado = hechos.has(i);
      if (logrado) n++;
      const exito = typeof r.exito === 'function' ? r.exito() : r.exito;
      return el('li', { class: 'reto' + (logrado ? ' hecho' : '') },
        el('div', { class: 'reto-estado', 'aria-label': logrado ? 'Superado' : 'Pendiente', text: logrado ? '✓' : i + 1 }),
        el('div', { class: 'reto-cuerpo' },
          el('h3', { text: r.titulo }), el('p', { text: r.texto }),
          logrado ? el('p', { class: 'reto-exito', text: exito }) : el('details', {}, el('summary', { text: 'Pista' }), el('p', { text: r.pista })),
          el('button', { type: 'button', class: 'btn', text: r.boton[0], onclick: r.boton[1] })));
    });
    $('#retos-lista').replaceChildren(...items);
    $('#retos-cuenta').textContent = n;
    $('#retos-total').textContent = RETOS.length;
  }

  // =============== 5. Test ===============
  const TEST = [
    ['¿Cuántos diputados tiene el Congreso?', ['208', '350', '400'], 1, 'Son 350, repartidos entre 52 circunscripciones.'],
    ['En las elecciones generales, ¿qué es una circunscripción?', ['Un barrio', 'Una comunidad autónoma', 'Una provincia (y Ceuta y Melilla)'], 2, 'Cada provincia elige sus diputados por separado; Ceuta y Melilla eligen uno cada una.'],
    ['¿Qué porcentaje mínimo necesita un partido en una provincia para optar a escaño?', ['3 % de los votos válidos', '5 % de los votos de toda España', '10 % de los votos'], 0, 'Es el 3 % de los votos válidos de esa provincia (incluidos los votos en blanco).'],
    ['¿El voto en blanco cuenta para calcular ese 3 %?', ['Sí, es un voto válido', 'No, se tira como el nulo', 'Solo en Madrid'], 0, 'El voto en blanco es válido, así que sube la cantidad de votos necesaria para superar el 3 %. El nulo no cuenta.'],
    ['Un partido ya tiene 2 escaños. ¿Entre cuánto se dividen sus votos para optar al tercero?', ['Entre 2', 'Entre 3', 'Entre 4'], 1, 'En D\'Hondt se divide entre el número de escaños que ya tiene más uno: 2 + 1 = 3.'],
    ['¿A quién favorece más D\'Hondt en provincias con pocos escaños?', ['A los partidos pequeños', 'A los partidos más votados', 'A nadie, es exacto'], 1, 'Con 2, 3 o 4 escaños, solo los primeros partidos llegan a obtener alguno.'],
    ['¿Cuántos escaños hacen falta para la mayoría absoluta?', ['175', '176', '200'], 1, 'La mitad de 350 más uno: 176.'],
    ['¿Por qué un voto en Soria «pesa» más que uno en Madrid?', ['Porque allí se vota dos veces', 'Porque cada provincia tiene un mínimo de diputados aunque tenga poca población', 'Porque Soria tiene más habitantes'], 1, 'La ley da 2 escaños de partida a cada provincia; así, en las poco pobladas hacen falta menos votos por escaño.'],
  ];
  const respuestas = {};
  function renderTest() {
    const lista = TEST.map(([q, ops, ok, exp], i) => {
      const r = respuestas[i];
      return el('li', { class: 'pregunta' },
        el('p', { class: 'preg', text: q }),
        el('div', { class: 'opciones', role: 'group', 'aria-label': q }, ...ops.map((o, j) => el('button', {
          type: 'button', class: 'opcion' + (r != null && j === ok ? ' correcta' : '') + (r === j && j !== ok ? ' incorrecta' : ''),
          'aria-pressed': String(r === j), text: o, onclick: () => { respuestas[i] = j; renderTest(); },
        }))),
        r != null ? el('p', { class: 'feedback ' + (r === ok ? 'bien' : 'mal'), text: (r === ok ? '¡Correcto! ' : 'No exactamente. ') + exp }) : null);
    });
    $('#test-lista').replaceChildren(...lista);
    const hechas = Object.keys(respuestas).length;
    const bien = Object.entries(respuestas).filter(([i, r]) => TEST[i][2] === r).length;
    const nota = $('#test-nota');
    nota.replaceChildren(hechas < TEST.length ? `${hechas} de ${TEST.length} respondidas · ${bien} correctas` : `Resultado: ${bien} de ${TEST.length}. ${bien === TEST.length ? '¡Perfecto!' : 'Repasa las que fallaste con el laboratorio.'} `,
      hechas ? el('button', { type: 'button', class: 'btn btn-ghost btn-mini', text: 'Repetir', onclick: () => { for (const k in respuestas) delete respuestas[k]; renderTest(); } }) : '');
  }
  renderTest();

  // =============== Glosario ===============
  const GLOSARIO = [
    ['Escaño', 'Cada uno de los 350 asientos del Congreso. Quien lo ocupa es un diputado o diputada.'],
    ['Circunscripción', 'El territorio que elige sus propios diputados. En las generales es la provincia; Ceuta y Melilla son una cada una.'],
    ['Ley D\'Hondt', 'Fórmula para repartir escaños: se dividen los votos de cada partido entre 1, 2, 3… y se dan los escaños a los resultados más altos. Lleva el nombre del jurista belga Victor D\'Hondt.'],
    ['Cociente', 'El resultado de cada división (votos ÷ 1, votos ÷ 2…). Los escaños son para los cocientes mayores.'],
    ['Umbral o barrera electoral', 'Porcentaje mínimo de votos para poder entrar en el reparto. En el Congreso es el 3 % de los votos válidos de cada provincia.'],
    ['Voto válido', 'Los votos a candidaturas más los votos en blanco.'],
    ['Voto en blanco', 'Sobre sin papeleta. Es válido: cuenta para calcular el 3 %, pero no da escaños a nadie.'],
    ['Voto nulo', 'Papeleta tachada, de otra elección o con varias papeletas distintas. No cuenta para nada.'],
    ['Abstención', 'No ir a votar. No cuenta ni para el umbral ni para el reparto.'],
    ['Mayoría absoluta', '176 escaños, la mitad más uno. Es lo que hace falta para investir presidente en la primera votación.'],
    ['Proporcionalidad', 'Que el % de escaños de cada partido se parezca a su % de votos. D\'Hondt con provincias pequeñas es poco proporcional.'],
    ['Sainte-Laguë', 'Fórmula parecida a D\'Hondt pero dividiendo entre 1, 3, 5, 7… Trata mejor a los partidos medianos. Se usa, por ejemplo, en Alemania y en Noruega.'],
  ];
  $('#glos-lista').replaceChildren(...GLOSARIO.flatMap(([t, d]) => [el('dt', { text: t }), el('dd', { text: d })]));

  // Conectar con el simulador
  S.onUpdate((st) => { renderValor(st); renderRetos(st); });
})();
