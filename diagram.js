// Gerador de diagramas unifilares simplificados de implantação do BESS. Puro: devolve SVG como texto.
// Entrada: planta {topologia, gerador, kvaGerador, trafos:[kVA], n, pUnit}. Exporta BD (navegador e Node).
// Estudo de arquitetura: proteções, seccionamentos e cabeamento não são representados.
(function (root) {
  'use strict';
  const KVA = [75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];
  const stdKva = x => KVA.find(k => k >= x) || Math.ceil(x / 1000) * 1000;
  const ctKw = kw => Math.max(250, Math.ceil(kw / 250 - 1e-9) * 250);
  const f = v => (+v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // paleta fixa de papel: o diagrama vai para relatório e slide
  const C = { ink: '#1c1c1a', sub: '#6b6a65', line: '#1c1c1a', frame: '#dedcd4',
    rede: ['#efece4', '#cfcabb', '#3a3934'], bess: ['#dcebfa', '#8fb8e8', '#1d4f8f'], ems: ['#ece6fb', '#b9a8ee', '#4a3aa7'], ger: ['#fbe5df', '#eaa493', '#a33b22'],
    trafo: '#16835d', com: '#8a7fd6' };

  const TOPO = {
    atual: ['Situação atual', 'Topologia existente, sem armazenamento.'],
    mt: ['Acoplamento centralizado em média tensão', 'Os BESS são agrupados em uma cabine de transferência e conectados por transformador elevador dedicado ao alimentador, entre a medição e o barramento. O religador, logo após a medição, é o ponto de conexão e secciona a instalação em relação à rede.'],
    serie: ['Acoplamento em série com transferência em baixa tensão', 'A alimentação passa por dois transformadores em série, um abaixador e um elevador. No barramento de baixa tensão entre eles fica a cabine de transferência, onde os BESS se conectam.'],
    bt: ['Acoplamento distribuído em baixa tensão', 'Cada transformador de distribuição alimenta uma cabine de transferência própria, à qual se conectam os BESS e da qual partem as cargas de baixa tensão.']
  };

  // reparte n unidades entre os transformadores na proporção da potência (maiores restos)
  function distribute(n, kvas) {
    const tot = kvas.reduce((s, v) => s + v, 0), raw = kvas.map(k => n * k / tot), out = raw.map(Math.floor);
    let left = n - out.reduce((s, v) => s + v, 0);
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out;
  }

  function plan(pl) {
    const n = Math.max(0, Math.round(pl.n || 0)), pU = pl.pUnit || 0, kw = n * pU, t = pl.topologia, notes = [];
    const alloc = t === 'bt' && n > 0 ? distribute(n, pl.trafos) : pl.trafos.map(() => 0);
    const out = { n, kw, alloc, ct: ctKw(kw), trBess: stdKva(kw * 1.1), notes };
    if (t === 'atual' || !n) return out;
    if (t === 'bt') {
      alloc.forEach((k, i) => { const load = k * pU; if (k && load > pl.trafos[i]) notes.push(`TR-${i + 1}: ${k} BESS somam ${f(load)} kW, acima dos ${f(pl.trafos[i])} kVA do transformador.`); });
      const sem = alloc.filter(k => !k).length;
      if (sem) notes.push(`${sem} transformador(es) ficam sem BESS: há menos unidades que transformadores.`);
      notes.push('Exige uma cabine de transferência por transformador atendido e coordenação de todas elas pelo EMS.');
    } else {
      notes.push(`Transformador dedicado de ${f(out.trBess)} kVA para ${f(kw)} kW de BESS (folga de 10%).`);
      notes.push(`Cabine de transferência de ${f(out.ct)} kW.`);
      if (t === 'mt') notes.push(pl.gerador ? 'Com a chave de transferência na posição gerador, o BESS fica fora do circuito das cargas.' : 'O BESS atua sobre toda a instalação a partir do ponto de conexão.');
      if (t === 'serie') notes.push('Toda a energia da instalação passa pelos dois transformadores em série: há perda permanente, mesmo com o BESS parado.');
    }
    return out;
  }

  function draw(pl, opt) {
    opt = opt || {};
    const t = TOPO[pl.topologia] ? pl.topologia : 'atual', P = plan({ ...pl, topologia: t }), nT = pl.trafos.length, has = P.n > 0 && t !== 'atual';
    const colW = t === 'bt' && has ? 104 : 92, busW = Math.max(nT * colW, 240);
    const padL = has && t !== 'bt' ? 330 : 120, padR = pl.gerador ? 250 : 120, W = padL + busW + padR, cx = padL + busW / 2, x0 = padL;
    let o = '', y = opt.titulo ? 64 : 24;
    const L = (x1, y1, x2, y2, extra) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${C.line}" stroke-width="1.6" fill="none"${extra || ''}/>`;
    const poly = (pts, dash) => `<path d="M${pts.map(p => p.join(' ')).join('L')}" stroke="${dash ? C.com : C.line}" stroke-width="${dash ? 1.2 : 1.6}" fill="none"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
    const tx = (x, yy, s, o2) => { o2 = o2 || {}; return `<text x="${x}" y="${yy}" font-size="${o2.z || 11}" fill="${o2.c || C.ink}" text-anchor="${o2.a || 'middle'}" font-weight="${o2.w || 400}">${esc(s)}</text>`; };
    const box = (x, yy, w, h, a, b, col) => `<rect x="${x - w / 2}" y="${yy}" width="${w}" height="${h}" rx="5" fill="${col[0]}" stroke="${col[1]}" stroke-width="1.2"/>` +
      tx(x, yy + (b ? h / 2 - 2 : h / 2 + 4), a, { w: 600, c: col[2], z: 11 }) + (b ? tx(x, yy + h / 2 + 11, b, { c: col[2], z: 9.5 }) : '');
    const trafo = (x, yy, horiz) => { const d = 6; return horiz
      ? `<circle cx="${x - d}" cy="${yy}" r="10" fill="#fff" stroke="${C.trafo}" stroke-width="1.6"/><circle cx="${x + d}" cy="${yy}" r="10" fill="none" stroke="${C.trafo}" stroke-width="1.6"/>`
      : `<circle cx="${x}" cy="${yy - d}" r="10" fill="#fff" stroke="${C.trafo}" stroke-width="1.6"/><circle cx="${x}" cy="${yy + d}" r="10" fill="none" stroke="${C.trafo}" stroke-width="1.6"/>`; };
    const node = (x, yy) => `<circle cx="${x}" cy="${yy}" r="2.2" fill="#fff" stroke="${C.line}" stroke-width="1.4"/>`;
    // chave aberta na vertical: contato em cima, lâmina inclinada, contato embaixo
    const sw = (x, y1, y2) => L(x, y1, x, y1 + 10) + node(x, y1 + 12) + L(x, y2 - 12, x - 11, y1 + 18) + node(x, y2 - 12) + L(x, y2 - 10, x, y2);
    const arrow = (x, y1, y2) => L(x, y1, x, y2 - 7) + `<path d="M${x - 4.5} ${y2 - 8}L${x + 4.5} ${y2 - 8}L${x} ${y2}Z" fill="${C.line}"/>`;
    const dot = (x, yy) => `<circle cx="${x}" cy="${yy}" r="2.6" fill="${C.line}"/>`;

    if (opt.titulo) o += tx(24, 30, opt.titulo, { a: 'start', z: 15, w: 600 }) + (opt.subtitulo ? tx(24, 48, opt.subtitulo, { a: 'start', z: 11, c: C.sub }) : '');

    // rede e medição
    o += box(cx, y, 176, 32, 'Rede da concessionária', '', C.rede); o += L(cx, y + 32, cx, y + 56);
    o += box(cx, y + 56, 176, 42, 'Cabine de medição', 'Concessionária', C.rede); y += 98;
    const com = []; let ems = null;   // pontos que o EMS supervisiona

    if (has && t === 'mt') {
      o += sw(cx, y, y + 62) + tx(cx + 16, y + 28, 'Religador', { a: 'start', w: 600 }) + tx(cx + 16, y + 41, 'Ponto de conexão', { a: 'start', z: 9.5, c: C.sub });
      const yj = y + 96, xt = cx - 62, xc = cx - 156, xb = cx - 262;
      o += L(cx, y + 62, cx, yj + 44) + dot(cx, yj) + L(cx, yj, xt + 16, yj) + trafo(xt, yj, true) + L(xt - 16, yj, xc + 42, yj);
      o += tx(xt, yj - 30, 'TR-BESS', { w: 600 }) + tx(xt, yj - 18, f(P.trBess) + ' kVA', { z: 9.5, c: C.sub });
      o += box(xc, yj - 19, 84, 38, 'Transferência', f(P.ct) + ' kW', C.bess) + L(xc - 42, yj, xb + 44, yj) + box(xb, yj - 19, 88, 38, P.n + '× BESS', f(pl.pUnit) + ' kW cada', C.bess);
      ems = [xb + 30, yj - 82]; com.push([[xb, yj - 19], [xb, yj - 44]], [[xc, yj - 19], [xc, yj - 63], [ems[0] + 36, yj - 63]], [[ems[0] + 36, yj - 70], [cx - 14, yj - 70], [cx - 14, y + 30]]);
      y = yj + 44;
    } else if (has && t === 'serie') {
      const k = f(stdKva(Math.max(P.kw, pl.trafos.reduce((s, v) => s + v, 0)) * 1.0)) + ' kVA', y1 = y + 34, y2 = y + 96, y3 = y + 172, xb = cx - 170;
      o += L(cx, y, cx, y1 - 16) + trafo(cx, y1) + tx(cx - 20, y1 - 2, 'Trafo abaixador', { a: 'end', w: 600 }) + tx(cx - 20, y1 + 11, 'MT/BT · ' + k, { a: 'end', z: 9.5, c: C.sub });
      o += L(cx, y1 + 16, cx, y2) + box(cx, y2, 92, 38, 'Transferência', f(P.ct) + ' kW', C.bess) + L(cx - 46, y2 + 19, xb + 44, y2 + 19) + box(xb, y2, 88, 38, P.n + '× BESS', f(pl.pUnit) + ' kW cada', C.bess);
      o += L(cx, y2 + 38, cx, y3 - 16) + trafo(cx, y3) + tx(cx - 20, y3 - 2, 'Trafo elevador', { a: 'end', w: 600 }) + tx(cx - 20, y3 + 11, 'BT/MT · ' + k, { a: 'end', z: 9.5, c: C.sub });
      o += L(cx, y3 + 16, cx, y3 + 40);
      ems = [xb, y2 - 62]; com.push([[xb, y2], [xb, y2 - 26]], [[ems[0] + 36, y2 - 44], [cx + 62, y2 - 44], [cx + 62, y2 + 12], [cx + 46, y2 + 12]]);
      y = y3 + 40;
    }

    // chave de transferência e gerador
    const yq = y + (pl.gerador ? 134 : 0);
    if (pl.gerador) {
      const xg = cx + 164, yg = y + 14;
      o += box(xg, yg - 8, 86, 38, 'Gerador', 'Baixa tensão', C.ger) + L(xg, yg + 30, xg, yg + 40) + trafo(xg, yg + 56) + tx(xg + 16, yg + 54, 'TR-G', { a: 'start', w: 600 }) + tx(xg + 16, yg + 67, f(pl.kvaGerador) + ' kVA', { a: 'start', z: 9.5, c: C.sub });
      o += `<rect x="${cx - 26}" y="${yq - 24}" width="52" height="50" rx="4" fill="none" stroke="${C.sub}" stroke-width="1" stroke-dasharray="3 3"/>`;
      o += poly([[cx, y], [cx, yq - 40], [cx - 12, yq - 40], [cx - 12, yq - 14]]) + poly([[xg, yg + 72], [xg, yq - 34], [cx + 12, yq - 34], [cx + 12, yq - 14]]);
      o += node(cx - 12, yq - 12) + node(cx + 12, yq - 12) + L(cx - 11, yq - 10, cx, yq + 12) + node(cx, yq + 14) + L(cx, yq + 16, cx, yq + 26);
      o += tx(cx - 34, yq + 20, 'Chave de transferência', { a: 'end', w: 600 }) + tx(cx - 34, yq + 33, 'Rede ou gerador', { a: 'end', z: 9.5, c: C.sub });
      if (has) com.push('qta');
    }
    // barramento e transformadores de distribuição
    const yb = (pl.gerador ? yq + 26 : y) + 44;
    o += L(cx, pl.gerador ? yq + 26 : y, cx, yb) + `<path d="M${x0} ${yb}L${x0 + busW} ${yb}" stroke="${C.line}" stroke-width="3.2"/>` + tx(x0 + busW, yb - 8, 'Barramento de média tensão', { a: 'end', z: 9.5, c: C.sub });
    const xs = pl.trafos.map((_, i) => x0 + (busW - nT * colW) / 2 + colW * (i + 0.5)), yt = yb + 36;
    let yEnd = yt + 78;
    pl.trafos.forEach((kva, i) => {
      const x = xs[i], k = P.alloc[i];
      o += L(x, yb, x, yt - 16) + trafo(x, yt) + tx(x + 15, yt - 3, 'TR-' + (i + 1), { a: 'start', w: 600, z: 10.5 }) + tx(x + 15, yt + 9, f(kva) + ' kVA', { a: 'start', z: 9, c: C.sub });
      if (has && t === 'bt' && k) {
        const yc = yt + 34, xbs = x + 18;
        o += L(x, yt + 16, x, yc) + box(x, yc, 70, 30, 'Transf.', f(ctKw(k * pl.pUnit)) + ' kW', C.bess);
        o += arrow(x - 22, yc + 30, yc + 124) + L(xbs, yc + 30, xbs, yc + 46) + box(xbs, yc + 46, 56, 36, k + '× BESS', f(k * pl.pUnit) + ' kW', C.bess);
        com.push([[xbs + 18, yc + 82], [xbs + 18, yc + 108]]); yEnd = Math.max(yEnd, yc + 124);
      } else o += arrow(x, yt + 16, yt + 78);
    });
    if (has && t === 'bt') {
      const yl = yEnd - 16, xe = cx; yEnd += 56; ems = [xe, yEnd - 34];
      const a = xs.filter((_, i) => P.alloc[i]).map(x => x + 36);
      com.push([[Math.min(...a, xe), yl], [Math.max(...a, xe), yl]], [[xe, yl], [xe, ems[1]]]);
      if (pl.gerador) com.push([[Math.min(...a, xe), yl], [x0 - 34, yl], [x0 - 34, yq], [cx - 26, yq]]);
    }
    if (ems) {
      const [ex, ey] = ems;
      o += box(ex, ey, 72, 34, 'EMS', 'Controle', C.ems);
      com.forEach(c => { if (c === 'qta') { if (t !== 'bt') o += poly([[ex - 36, ey + 17], [x0 - 60 < 12 ? 12 : Math.min(ex - 60, x0 - 20), ey + 17], [x0 - 60 < 12 ? 12 : Math.min(ex - 60, x0 - 20), yq], [cx - 26, yq]], true); } else o += poly(c, true); });
    }
    // legenda e nota
    const yl = yEnd + 30;
    if (ems) o += `<path d="M${cx - 150} ${yl - 4}L${cx - 112} ${yl - 4}" stroke="${C.com}" stroke-width="1.2" stroke-dasharray="5 4"/>` + tx(cx - 104, yl, 'Comunicação do EMS', { a: 'start', z: 10, c: C.sub });
    o += arrow(cx + 40, yl - 12, yl + 2) + tx(cx + 52, yl, 'Cargas em baixa tensão', { a: 'start', z: 10, c: C.sub });
    o += tx(24, yl + 30, 'Diagrama unifilar simplificado para estudo de arquitetura. Proteções, seccionamentos e cabeamento não representados.', { a: 'start', z: 9.5, c: C.sub });
    const H = yl + 46;
    const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, 'Segoe UI', Arial, sans-serif" role="img" aria-label="${esc(TOPO[t][0])}">` +
      `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="#fff" stroke="${C.frame}"/>` + o + '</svg>';
    return { svg, w: W, h: H, titulo: TOPO[t][0], descricao: TOPO[t][1], notes: P.notes, plano: P };
  }

  const BD = { TOPO, draw, plan, distribute, stdKva, ctKw };
  if (typeof module !== 'undefined' && module.exports) module.exports = BD; else root.BD = BD;
})(typeof window !== 'undefined' ? window : globalThis);
