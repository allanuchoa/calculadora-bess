// Interface da Calculadora BESS. Todo cálculo vem de BE.run (engine.js); o diagrama, de BD.draw (diagram.js).
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = 'bess.v2', sb = typeof getSupabaseClient === 'function' && window.supabase ? getSupabaseClient() : null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: d }));
  const brl = v => (v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR'));
  const pct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : f(v * 100, d) + ' %');
  const anos = v => (v == null ? 'não se paga no horizonte' : f(v, 1) + ' anos');

  let raw, R, user = null, sims = [];
  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(raw)); } catch (e) { /* sem armazenamento: segue sem lembrar */ } };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200); }

  const HINT = {
    shift: 'Carrega fora de ponta e atende a carga no horário de ponta, quando a energia é mais cara.',
    peak: 'Descarrega só quando a carga passa do limite, para reduzir a demanda registrada.',
    diesel: 'Substitui o gerador a diesel que hoje atende a carga no horário de ponta.'
  };

  // ---------- gráfico de linhas e barras em SVG (um eixo, cores por classe) ----------
  function chart(el, cfg) {
    const W = cfg.w || 720, H = cfg.h || 300, ml = 58, mr = 14, mt = 34, mb = 30, n = cfg.labels.length, sw = (W - ml - mr) / n, cx = i => ml + sw * (i + 0.5);
    const vals = [0].concat(...cfg.series.map(s => s.data.filter(v => v != null && isFinite(v))));
    let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) hi = lo + 1;
    const rawStep = (hi - lo) / 5, p10 = Math.pow(10, Math.floor(Math.log10(rawStep))), q = rawStep / p10, step = (q < 1.5 ? 1 : q < 3 ? 2 : q < 7 ? 5 : 10) * p10;
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const y = v => H - mb - (v - lo) / (hi - lo) * (H - mt - mb);
    let o = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.title || 'Gráfico')}">`;
    if (cfg.band) cfg.labels.forEach((_, i) => { if (cfg.band(i)) o += `<rect x="${ml + sw * i}" y="${mt}" width="${sw}" height="${H - mt - mb}" class="band"/>`; });
    for (let v = lo; v <= hi + step / 2; v += step) o += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="${Math.abs(v) < step / 1e6 ? 'axis' : 'grid'}"/><text x="${ml - 8}" y="${y(v) + 4}" class="tick" text-anchor="end">${f(v, 1)}</text>`;
    const every = Math.ceil(n / 16);
    cfg.labels.forEach((l, i) => { if (i % every === 0) o += `<text x="${cx(i)}" y="${H - mb + 16}" class="tick" text-anchor="middle">${esc(l)}</text>`; });
    o += `<text x="12" y="${mt - 14}" class="tick">${esc(cfg.unit || '')}</text>`;
    let lx = ml + 60;
    cfg.series.forEach(s => {
      const pts = s.data.map((v, i) => (v == null ? null : [cx(i), y(v)]));
      if (s.kind === 'bar') s.data.forEach((v, i) => { if (v) o += `<rect x="${cx(i) - sw * 0.3}" y="${Math.min(y(v), y(0))}" width="${sw * 0.6}" height="${Math.max(Math.abs(y(v) - y(0)), 1)}" rx="2" class="${s.cls}${s.sign && v < 0 ? ' neg' : ''}"/>`; });
      else o += `<path d="${pts.map((p, i) => (p ? (i && pts[i - 1] ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) : '')).join('')}" class="ln ${s.cls}${s.kind === 'dash' ? ' dash' : ''}"/>`;
      o += (s.kind === 'bar' ? `<rect x="${lx}" y="${mt - 24}" width="14" height="10" rx="2" class="${s.cls}"/>` : `<line x1="${lx}" x2="${lx + 18}" y1="${mt - 19}" y2="${mt - 19}" class="ln ${s.cls}${s.kind === 'dash' ? ' dash' : ''}"/>`) +
        `<text x="${lx + 24}" y="${mt - 15}" class="leg">${esc(s.name)}</text>`;
      lx += 34 + s.name.length * 6.6;
    });
    o += `<line id="xh" x1="0" x2="0" y1="${mt}" y2="${H - mb}" class="xh" visibility="hidden"/></svg><div class="tip" hidden></div>`;
    el.innerHTML = o;
    const svg = $('svg', el), tip = $('.tip', el), xh = $('#xh', el);
    el.onpointermove = e => {
      const rc = svg.getBoundingClientRect(), i = Math.floor(((e.clientX - rc.left) / rc.width * W - ml) / sw);
      if (i < 0 || i >= n) { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); return; }
      xh.setAttribute('x1', cx(i)); xh.setAttribute('x2', cx(i)); xh.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + esc((cfg.tipLabel || (l => l))(cfg.labels[i])) + '</b>' + cfg.series.map(s => '<div><span>' + esc(s.name) + '</span><span>' + (cfg.fmt || (v => f(v, 1)))(s.data[i]) + '</span></div>').join('');
      tip.hidden = false; const px = e.clientX - rc.left; tip.style.left = (px > rc.width / 2 ? px - tip.offsetWidth - 14 : px + 14) + 'px';
    };
    el.onpointerleave = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); };
  }
  // barras horizontais em HTML: [{label, value, text, cls}]
  function bars(el, rows) {
    const max = Math.max(...rows.map(r => Math.abs(r.value)), 1e-9);
    el.innerHTML = rows.map(r => '<div class="bar-row"><span>' + esc(r.label) + '</span><div class="track"><i class="' + (r.cls || 'c-bess') + '" style="width:' + (Math.abs(r.value) / max * 100).toFixed(1) + '%"></i></div><b>' + esc(r.text) + '</b></div>').join('');
  }
  const table = (el, rows, head) => { el.innerHTML = (head ? '<thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead>' : '') + '<tbody>' + rows.map(r => '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + '>' + (r.cells || r).map((c, i) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>'; };

  // ---------- desenho ----------
  function render() {
    R = BE.run(raw); const p = R.p, sz = R.size, nd = R.need, e = R.eff, plano = R.plano, fin = R.fin, n0 = plano.fleet[0].n;
    $$('#est button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === p.estrategia));
    $$('#plano button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === p.plano));
    $$('#topo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === p.planta.topologia));
    $$('[data-est]').forEach(el => { el.hidden = el.dataset.est !== p.estrategia; });
    $$('[data-mod]').forEach(el => { el.hidden = el.dataset.mod !== p.modalidade; });
    $('#est-hint').textContent = HINT[p.estrategia];
    $('#pl-kva-wrap').hidden = !p.planta.gerador;

    $('#kpis').innerHTML = [
      ['Unidades', f(n0) + (plano.unidades > n0 ? ' + ' + f(plano.unidades - n0) : ''), plano.unidades > n0 ? 'no início e em reposições' : f(p.eUnit) + ' kWh · ' + f(p.pUnit) + ' kW cada'],
      ['Potência instalada', f(n0 * p.pUnit) + ' kW', 'exigida: ' + f(nd.pReq, 1) + ' kW'],
      ['Energia nominal', f(n0 * p.eUnit) + ' kWh', 'por ciclo: ' + f(nd.eCiclo, 1) + ' kWh'],
      ['Rendimento de ida e volta', pct(e.rte), 'no ponto de conexão'],
      ['Economia no 1º ano', brl(fin.economiaAno1), f(nd.ciclosAno) + ' ciclos por ano'],
      ['Retorno simples', fin.payback == null ? 'não se paga' : f(fin.payback, 1) + ' anos', 'investimento: ' + brl(fin.capexInicial)],
      ['Valor presente líquido', brl(fin.vpl), fin.tir == null ? 'sem taxa interna de retorno' : 'taxa interna: ' + f(fin.tir, 1) + ' % ao ano']
    ].map(([l, v, s]) => '<div class="kpi"><small>' + l + '</small><strong>' + v + '</strong><em>' + s + '</em></div>').join('');
    $('#warns').innerHTML = R.warns.concat(R.dia.warns).map(w => '<div class="warn">⚠ ' + esc(w) + '</div>').join('');

    // 2. dimensionamento
    const first = p.estrategia === 'peak'
      ? [['Potência exigida', 'pico − limite', f(nd.pReq, 1) + ' kW'], ['Energia por ciclo', 'potência × duração × fator de forma', f(nd.eCiclo, 1) + ' kWh']]
      : p.estrategia === 'diesel'
        ? [['Energia por ciclo', 'potência do gerador × horas', f(nd.eCiclo, 1) + ' kWh'], ['Potência exigida', 'potência atendida pelo gerador', f(nd.pReq, 1) + ' kW']]
        : [['Energia por ciclo', 'energia do período ÷ dias ÷ ciclos por dia', f(nd.eCiclo, 1) + ' kWh'], ['Potência exigida', 'energia por ciclo ÷ duração da ponta', f(nd.pReq, 1) + ' kW']];
    const unit = sz.nE > 0 ? nd.eCiclo / sz.nE : 0;
    table($('#memoria'), first.concat([
      ['Rendimento na descarga', 'bateria, conversor, transformadores, cabos e auxiliares', pct(e.etaD)],
      ['Energia entregável por unidade', 'energia × profundidade × saúde' + (p.anoProjeto ? ' no ano ' + f(p.anoProjeto) : '') + ' × rendimento', f(unit, 1) + ' kWh'],
      ['Unidades pela energia', 'energia por ciclo ÷ entregável por unidade', f(sz.nE, 2)],
      ['Unidades pela potência', 'potência exigida ÷ potência da unidade', f(sz.nP, 2)],
      { cls: 'hl', cells: ['Unidades adotadas', 'o maior dos dois, com déficit aceito de ' + f(p.tolerancia, 1) + ' %; limita a ' + sz.limitante, '<strong>' + f(sz.n) + '</strong>'] },
      ['Capacidade instalada', 'unidades × valores nominais', f(sz.eNom) + ' kWh · ' + f(sz.pNom) + ' kW'],
      ['Taxa de uso', 'potência usada ÷ energia nominal', f(sz.cRate, 2) + ' C']
    ]), ['Grandeza', 'Como se calcula', 'Valor']);
    table($('#opcoes'), sz.opcoes.map(o => ({ cls: o.n === sz.n ? 'hl' : '', cells: [f(o.n) + (o.n === sz.n ? ' (adotado)' : ''), pct(Math.min(o.cobertura, 9.99), 0), o.cobertura >= 1 ? 'atende com folga de ' + pct(o.cobertura - 1, 0) : 'faltam ' + pct(1 - o.cobertura, 0)] })), ['Unidades', 'Cobertura', 'Leitura']);
    const c = sz.ciclo;
    bars($('#ciclo'), [{ label: 'Recarga pela rede', value: c.cargaRede, text: f(c.cargaRede, 1) + ' kWh', cls: 'c-rede' }, { label: 'Entregue à carga', value: c.entregue, text: f(c.entregue, 1) + ' kWh', cls: 'c-bess' }, { label: 'Perdas no ciclo', value: c.perdas, text: f(c.perdas, 1) + ' kWh', cls: 'c-neg' }]);

    // 3. operação
    const d = R.dia, hrs = d.carga.map((_, h) => h + 'h');
    chart($('#ch-dia'), { title: 'Dia típico', unit: 'kW', w: 1180, h: 320, labels: hrs, tipLabel: l => l + ' às ' + (parseInt(l, 10) + 1) + 'h', fmt: v => f(v, 0) + ' kW',
      band: p.estrategia === 'peak' ? null : h => BE.inWin(h, p.pontaIni, p.pontaDur),
      series: [{ name: 'BESS (+ descarga, − recarga)', data: d.bess, kind: 'bar', cls: 'c-bess' }, { name: 'Carga', data: d.carga, kind: 'dash', cls: 'c-carga' }, { name: 'Rede com BESS', data: d.rede, kind: 'line', cls: 'c-rede' }] });
    const rec = Math.max(...d.bess.map(v => -v), 0);
    $('#dia-facts').innerHTML = [['Pico da rede', f(d.picoAntes) + ' → ' + f(d.picoDepois) + ' kW'], ['Maior descarga', f(Math.max(...d.bess), 0) + ' kW'], ['Potência de recarga', f(rec) + ' kW'],
      ['Duração da descarga', f(c.horasDescarga, 1) + ' h']].map(([l, v]) => '<div><small>' + l + '</small><strong>' + v + '</strong></div>').join('');

    // 4. eficiência
    bars($('#rte'), e.items.map(i => ({ label: i.label, value: i.perda, text: '−' + f(i.perda, 2) + ' p.p. → ' + f(i.depois, 1) + ' %', cls: 'c-neg' })).concat([{ label: 'Rendimento no ponto de conexão', value: 0, text: pct(e.rte), cls: 'c-bess' }]));

    // 5. vida útil
    const v = R.vida, ys = R.ret.map(r => String(r.ano));
    $('#vida-facts').innerHTML = [
      ['Fim de vida pelo estado de saúde', v.anoEol == null ? 'depois do horizonte' : 'no ano ' + f(v.anoEol)],
      ['Ciclos garantidos atingidos', v.anoGarantia == null ? '—' : 'no ano ' + f(v.anoGarantia, 1)],
      ['Entrega abaixo do exigido, sem reposição', v.anoDeficit == null ? 'não ocorre no horizonte' : 'a partir do ano ' + f(v.anoDeficit)]
    ].map(([l, x]) => '<div><small>' + l + '</small><strong>' + x + '</strong></div>').join('');
    chart($('#ch-vida'), { title: 'Energia entregável por ciclo ao longo dos anos', unit: 'kWh por ciclo', labels: ys, tipLabel: l => 'Ano ' + l, fmt: x => f(x, 0) + ' kWh',
      series: [{ name: 'Entregável, sem reposição', data: R.ret.map(r => r.entregavel), kind: 'line', cls: 'c-bess' }, { name: 'Exigido', data: R.ret.map(r => r.exigido), kind: 'dash', cls: 'c-carga' }] });
    table($('#vida-tbl'), R.ret.map(r => [f(r.ano), f(r.ciclosAcum), pct(r.soh / 100), f(r.util, 0), f(r.entregavel, 0), pct(r.cobertura, 0)]), ['Ano', 'Ciclos acumulados', 'Estado de saúde', 'Energia útil (kWh)', 'Entregável (kWh)', 'Cobertura']);

    // 6. reposição
    const A = R.planos.aug, B = R.planos.bol, fa = p.plano === 'aug' ? fin : R.finAlt, fb = p.plano === 'bol' ? fin : R.finAlt;
    table($('#aug-cmp'), [
      ['Unidades no início', f(A.fleet[0].n), f(B.fleet[0].n)], ['Unidades no total', f(A.unidades), f(B.unidades)],
      ['Investimento, valor presente', brl(A.vpCapex), brl(B.vpCapex)], ['Valor presente líquido', brl(fa.vpl), brl(fb.vpl)], ['Retorno simples', anos(fa.payback), anos(fb.payback)]
    ], ['', 'Acrescentar ao longo dos anos', 'Comprar a mais no início']);
    $('#aug-sched').innerHTML = '<h3>Cronograma do plano escolhido</h3><ul class="notes">' + plano.fleet.map(k => '<li>Ano ' + f(k.ano) + ': ' + (k.ano ? '+' : '') + f(k.n) + ' unidade(s), ' + f(k.n * p.eUnit) + ' kWh</li>').join('') + '</ul>';
    chart($('#ch-aug'), { title: 'Entregável com o plano escolhido', unit: 'kWh por ciclo', labels: ys, tipLabel: l => 'Ano ' + l, fmt: x => f(x, 0) + ' kWh',
      series: [{ name: 'Com o plano escolhido', data: plano.rows.map(r => r.entregavel), kind: 'line', cls: 'c-rede' }, { name: 'Sem reposição', data: R.ret.map(r => r.entregavel), kind: 'line', cls: 'c-bess' }, { name: 'Exigido', data: plano.rows.map(r => r.exigido), kind: 'dash', cls: 'c-carga' }] });

    // 7. diesel
    const dz = R.diesel;
    table($('#diesel-tbl'), [['Energia atendida por ano', f(dz.energia) + ' kWh'], ['Diesel consumido', f(dz.litros) + ' L'], ['Custo por kWh com gerador', 'R$ ' + f(dz.kwhDiesel, 2)], ['Custo por kWh com BESS', 'R$ ' + f(dz.kwhBess, 2)],
      { cls: 'hl', cells: ['Economia por ano', '<strong>' + brl(dz.economia) + '</strong>'] }, ['Emissão evitada por ano', f((dz.co2Diesel - dz.co2Bess) / 1000, 1) + ' t CO₂']]);
    bars($('#diesel-bars'), [{ label: 'Gerador a diesel', value: dz.custoDiesel, text: brl(dz.custoDiesel), cls: 'c-alt' }, { label: 'BESS (recarga)', value: dz.custoBess, text: brl(dz.custoBess), cls: 'c-bess' }]);
    bars($('#diesel-co2'), [{ label: 'Gerador a diesel', value: dz.co2Diesel, text: f(dz.co2Diesel / 1000, 1) + ' t CO₂', cls: 'c-alt' }, { label: 'BESS (rede)', value: dz.co2Bess, text: f(dz.co2Bess / 1000, 1) + ' t CO₂', cls: 'c-bess' }]);

    // 8. financeiro
    table($('#fin-tbl'), [['Investimento inicial', brl(fin.capexInicial)], ['Investimento total, com reposições', brl(fin.capexTotal)], ['Economia no 1º ano', brl(fin.economiaAno1)],
      ['Retorno simples', anos(fin.payback)], ['Retorno descontado', anos(fin.paybackDesc)], { cls: 'hl', cells: ['Valor presente líquido', '<strong>' + brl(fin.vpl) + '</strong>'] },
      ['Taxa interna de retorno', fin.tir == null ? 'não existe' : f(fin.tir, 1) + ' % ao ano'], ['Custo nivelado da energia entregue', fin.lcos == null ? '—' : 'R$ ' + f(fin.lcos, 2) + ' por kWh']]);
    chart($('#ch-fin'), { title: 'Fluxo de caixa acumulado', unit: 'R$ mil, acumulado', labels: fin.linhas.map(l => String(l.ano)), tipLabel: l => 'Ano ' + l, fmt: x => brl(x * 1000),
      series: [{ name: 'Saldo acumulado', data: fin.linhas.map(l => l.acumulado / 1000), kind: 'bar', cls: 'c-bess', sign: true }] });
    table($('#fin-flow'), fin.linhas.map(l => [f(l.ano), brl(l.economia), brl(-l.opex), brl(-l.capex), brl(l.fluxo), brl(l.acumulado)]), ['Ano', 'Economia', 'Operação', 'Investimento', 'Fluxo', 'Acumulado']);

    // 9. diagrama
    const dg = BD.draw({ ...p.planta, n: n0, pUnit: p.pUnit }, { titulo: BD.TOPO[p.planta.topologia][0],
      subtitulo: [p.nome || 'Estudo', p.planta.topologia === 'atual' ? '' : f(n0) + ' BESS de ' + f(p.pUnit) + ' kW / ' + f(p.eUnit) + ' kWh', p.modelo].filter(Boolean).join(' · ') });
    $('#diagram').innerHTML = dg.svg; $('#diag-desc').textContent = dg.descricao;
    $('#diag-notes').innerHTML = dg.notes.map(x => '<li>' + esc(x) + '</li>').join('');
  }

  // ---------- entradas ----------
  function fill() {   // escreve o estado nos campos (na carga, ao recomeçar e ao abrir um estudo)
    const p = BE.clean(raw);
    $$('[data-k]').forEach(el => { el.value = p[el.dataset.k]; });
    $('#pl-trafos').value = p.planta.trafos.join(', '); $('#pl-ger').checked = p.planta.gerador; $('#pl-kva').value = p.planta.kvaGerador;
  }
  const planta = () => (raw.planta = raw.planta && typeof raw.planta === 'object' ? raw.planta : {});
  let timer;
  const changed = () => { save(); clearTimeout(timer); timer = setTimeout(render, 60); };

  // ---------- diagrama: exportação ----------
  const svgText = () => { const n = $('#diagram svg').cloneNode(true), vb = n.viewBox.baseVal; n.setAttribute('width', vb.width * 2); n.setAttribute('height', vb.height * 2); return new XMLSerializer().serializeToString(n); };
  function png() {
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([svgText()], { type: 'image/svg+xml' }));
      img.onload = () => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); cv.toBlob(ok, 'image/png'); };
      img.onerror = no; img.src = url;
    });
  }
  function dl(blob, ext) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = ((raw.nome || 'diagrama-bess') + '-' + BE.clean(raw).planta.topologia).replace(/[\\/:*?"<>|]+/g, '').trim() + '.' + ext; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- estudos salvos (Supabase, tabela bes_simulations) ----------
  async function loadSims() {
    const { data, error } = await sb.from('bes_simulations').select('id, name, inputs').order('updated_at', { ascending: false });
    sims = error ? [] : data || [];
    $('#sim').innerHTML = '<option value="">(não salvo)</option>' + sims.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('');
  }
  async function saveSim() {
    const name = (prompt('Nome do estudo', raw.nome || 'Estudo 1') || '').trim(); if (!name) return;
    const old = sims.find(s => s.name === name), row = { user_id: user.id, name, inputs: BE.clean(raw), outputs: { unidades: R.plano.unidades, potencia_kw: R.size.pNom, energia_kwh: R.size.eNom, vpl: R.fin.vpl } };
    const q = old ? sb.from('bes_simulations').update(row).eq('id', old.id) : sb.from('bes_simulations').insert(row);
    const { error } = await q; if (error) return toast('Não consegui salvar: ' + error.message);
    await loadSims(); const now = sims.find(s => s.name === name); if (now) $('#sim').value = now.id; toast('Estudo salvo.');
  }

  async function init() {
    raw = load(); fill(); render();
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.k) { raw[el.dataset.k] = el.type === 'number' ? (el.value === '' ? null : +el.value) : el.value; changed(); }
      else if (el.id === 'pl-trafos') { planta().trafos = el.value.split(/[;,\s]+/).map(s => parseFloat(s.replace(',', '.'))).filter(v => v > 0); changed(); }
      else if (el.id === 'pl-ger') { planta().gerador = el.checked; changed(); }
      else if (el.id === 'pl-kva') { planta().kvaGerador = +el.value; changed(); }
    });
    [['#est', 'estrategia'], ['#plano', 'plano']].forEach(([sel, k]) => $(sel).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { raw[k] = b.dataset.v; changed(); } }));
    $('#topo').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { planta().topologia = b.dataset.v; changed(); } });
    $('#reset').addEventListener('click', () => { if (confirm('Descartar as premissas atuais e voltar ao exemplo inicial?')) { raw = {}; save(); fill(); render(); } });
    $('#print').addEventListener('click', () => { $$('details').forEach(d => { d.open = true; }); window.print(); });
    $('#dg-png').addEventListener('click', () => png().then(b => dl(b, 'png')).catch(() => toast('Não consegui gerar a imagem.')));
    $('#dg-svg').addEventListener('click', () => dl(new Blob([svgText()], { type: 'image/svg+xml' }), 'svg'));
    $('#dg-copy').addEventListener('click', () => png().then(b => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])).then(() => toast('Diagrama copiado.')).catch(() => toast('O navegador não deixou copiar. Use Baixar PNG.')));
    // menu lateral: marca a etapa visível
    const links = $$('.nav a'), io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
    $$('.content section').forEach(s => io.observe(s));

    if (!sb) return;
    sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') window.location.href = CONFIG.PORTAL_URL; });
    const { data } = await sb.auth.getSession(); user = data.session && data.session.user;
    if (!user) return;
    ['#sim-wrap', '#sim-save', '#sim-del'].forEach(s => { $(s).hidden = false; });
    await loadSims();
    $('#sim').addEventListener('change', e => { const s = sims.find(x => x.id === e.target.value); if (s) { raw = s.inputs || {}; save(); fill(); render(); } });
    $('#sim-save').addEventListener('click', saveSim);
    $('#sim-del').addEventListener('click', async () => {
      const s = sims.find(x => x.id === $('#sim').value); if (!s) return toast('Escolha um estudo salvo para excluir.');
      if (!confirm('Excluir o estudo "' + s.name + '"? Isso não pode ser desfeito.')) return;
      const { error } = await sb.from('bes_simulations').delete().eq('id', s.id);
      if (error) return toast('Não consegui excluir: ' + error.message); await loadSims(); toast('Estudo excluído.');
    });
  }
  init();
})();
