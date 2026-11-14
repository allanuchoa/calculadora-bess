// Motor puro (sem DOM): dimensionamento, eficiência, vida útil, augmentation, diesel, financeiro e operação diária.
// Exporta BE (navegador e Node). Unidades: kW, kWh, R$, %. "Ponto de conexão" = onde a energia é medida para a carga.
(function (root) {
  'use strict';
  const sum = a => a.reduce((s, v) => s + v, 0), clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Estado de saúde de referência, ano 0 a 15, a 1 ciclo por dia (tabela de fabricante usada na versão anterior)
  const SOH = {
    0.5: [100, 95.0, 92.8, 90.9, 89.1, 87.5, 85.9, 84.4, 82.9, 81.4, 80.0, 78.6, 77.3, 76.0, 74.7, 73.4],
    0.25: [100, 95.3, 93.1, 91.2, 89.4, 87.8, 86.2, 84.7, 83.2, 81.7, 80.3, 78.9, 77.6, 76.3, 75.0, 73.7]
  };
  const KVA = [75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000];
  // perfil industrial típico, normalizado pelo pico (ilustrativo)
  const SHAPE = [.55, .52, .5, .5, .52, .6, .75, .9, .97, 1, .98, .92, .9, .96, 1, .99, .95, .9, .85, .8, .75, .7, .62, .58];

  const DEF = {
    nome: '', aplicacao: '', concessionaria: '', grupo: 'A4', modalidade: 'verde', estrategia: 'shift',
    demandaContratada: 470,
    energiaPeriodo: 4620, dias: 22, ciclosDia: 1,                          // deslocamento de carga
    picoMedido: 560, limite: 470, duracaoPico: 2, fatorForma: 0.6, eventosMes: 22,   // corte de pico
    potGerador: 300, horasGerador: 3, diasGerador: 22, consumoEspecifico: 0.30, precoDiesel: 6.20, omGerador: 0.12,
    emissaoDiesel: 2.68, emissaoRede: 0.04,                                // kgCO2 por litro e por kWh
    pontaIni: 18, pontaDur: 3, recargaIni: 0, recargaDur: 6,
    tPonta: 2.02, tFora: 0.42, tDemanda: 32, tDemandaPonta: 55,
    modelo: '', eUnit: 261, pUnit: 125, dod: 90, eol: 70, ciclosGarantidos: 8000,
    rteBat: 95, pcs: 98.5, trafo: 99, nTrafos: 0, cabos: 99.5, aux: 1.5,
    horizonte: 15, parcelaCalendario: 30, tolerancia: 4, anoProjeto: 0,
    plano: 'aug', quedaPreco: 3,
    capexKwh: 2200, capexFixo: 60000, opexPct: 1.5, taxa: 10, reajuste: 5,
    planta: { gerador: true, kvaGerador: 1000, trafos: [300, 300, 300], topologia: 'bt' }
  };
  const LIM = { dias: [1, 31], ciclosDia: [0.1, 4], pontaIni: [0, 23], pontaDur: [1, 8], recargaIni: [0, 23], recargaDur: [1, 12], dod: [10, 100], eol: [40, 95],
    rteBat: [50, 100], pcs: [80, 100], trafo: [90, 100], nTrafos: [0, 4], cabos: [90, 100], aux: [0, 20], horizonte: [1, 30], parcelaCalendario: [0, 100],
    tolerancia: [0, 30], anoProjeto: [0, 30], fatorForma: [0.1, 1], quedaPreco: [0, 20], taxa: [0, 50], reajuste: [0, 30], opexPct: [0, 20] };

  // entrada salva ou vinda de fora é conferida campo a campo
  function clean(p) {
    const o = JSON.parse(JSON.stringify(DEF)); p = p && typeof p === 'object' ? p : {};
    for (const k in DEF) {
      if (k === 'planta') continue;
      if (typeof DEF[k] === 'number') { const v = +p[k]; if (p[k] !== '' && p[k] != null && isFinite(v)) o[k] = LIM[k] ? clamp(v, LIM[k][0], LIM[k][1]) : Math.max(v, 0); }
      else if (typeof p[k] === 'string') o[k] = p[k].slice(0, 120);
    }
    if (!['shift', 'peak', 'diesel'].includes(o.estrategia)) o.estrategia = 'shift';
    if (!['verde', 'azul'].includes(o.modalidade)) o.modalidade = 'verde';
    if (!['aug', 'bol'].includes(o.plano)) o.plano = 'aug';
    const pl = p.planta && typeof p.planta === 'object' ? p.planta : {};
    o.planta.gerador = pl.gerador == null ? DEF.planta.gerador : !!pl.gerador;
    if (isFinite(+pl.kvaGerador) && +pl.kvaGerador > 0) o.planta.kvaGerador = +pl.kvaGerador;
    if (Array.isArray(pl.trafos) && pl.trafos.length) o.planta.trafos = pl.trafos.map(Number).filter(v => isFinite(v) && v > 0).slice(0, 12);
    if (!o.planta.trafos.length) o.planta.trafos = DEF.planta.trafos.slice();
    if (['atual', 'mt', 'serie', 'bt'].includes(pl.topologia)) o.planta.topologia = pl.topologia;
    return o;
  }

  // ---------- eficiência: cadeia de perdas entre a bateria e o ponto de conexão ----------
  function eff(p) {
    const bat = p.rteBat / 100, pcs = p.pcs / 100, tr = Math.pow(p.trafo / 100, p.nTrafos), cab = p.cabos / 100, aux = 1 - p.aux / 100;
    const path = Math.sqrt(bat) * pcs * tr * cab;      // um sentido, sem auxiliares
    const steps = [['Bateria (ida e volta em CC)', bat], ['Conversor (carga e descarga)', pcs * pcs], ['Transformadores (' + p.nTrafos + ', dois sentidos)', tr * tr],
      ['Cabos e conexões (dois sentidos)', cab * cab], ['Auxiliares (climatização, controle)', aux]];
    let acc = 100; const items = steps.map(([label, f]) => { const before = acc; acc *= f; return { label, fator: f, antes: before, depois: acc, perda: before - acc }; });
    return { etaC: path, etaD: path * aux, rte: path * path * aux, items };
  }

  // ---------- o que o sistema precisa entregar por ciclo, no ponto de conexão ----------
  function need(p) {
    if (p.estrategia === 'peak') { const pw = Math.max(p.picoMedido - p.limite, 0); return { eCiclo: pw * p.duracaoPico * p.fatorForma, pReq: pw, ciclosAno: p.eventosMes * 12, horas: p.duracaoPico }; }
    if (p.estrategia === 'diesel') return { eCiclo: p.potGerador * p.horasGerador, pReq: p.potGerador, ciclosAno: p.diasGerador * 12, horas: p.horasGerador };
    const e = p.dias > 0 && p.ciclosDia > 0 ? p.energiaPeriodo / p.dias / p.ciclosDia : 0;
    return { eCiclo: e, pReq: e / p.pontaDur, ciclosAno: p.dias * 12 * p.ciclosDia, horas: p.pontaDur };
  }

  // ---------- estado de saúde (%) depois de `ano` anos ----------
  // A tabela vale para 1 ciclo por dia. Uma parcela do desgaste é de calendário (não depende do uso); o resto escala com os ciclos por ano.
  function soh(ano, cRate, ciclosAno, parcelaCal) {
    const at = (t, y) => { const i = Math.floor(y); return i >= 15 ? t[15] + (t[15] - t[14]) * (y - 15) : t[i] + (t[i + 1] - t[i]) * (y - i); };
    const f5 = 100 - at(SOH[0.5], ano), f25 = 100 - at(SOH[0.25], ano), c = clamp(cRate || 0.25, 0.1, 0.5);
    const ref = c >= 0.25 ? f25 + (f5 - f25) * (c - 0.25) / 0.25 : f25 * (0.85 + 0.15 * (c - 0.1) / 0.15);   // abaixo de 0,25C: até 15% menos desgaste
    const cal = clamp(parcelaCal, 0, 100) / 100;
    return Math.max(100 - ref * (cal + (1 - cal) * ciclosAno / 365), 0);
  }

  // frota = conjuntos de unidades instaladas em anos diferentes: [{n, ano}]
  function fleetRow(p, fleet, ano, nd, e, cRate) {
    let util = 0, n = 0;
    for (const c of fleet) if (c.ano <= ano) { n += c.n; util += c.n * p.eUnit * p.dod / 100 * soh(ano - c.ano, cRate, nd.ciclosAno, p.parcelaCalendario) / 100; }
    const entregavel = util * e.etaD, first = fleet[0] ? soh(ano - fleet[0].ano, cRate, nd.ciclosAno, p.parcelaCalendario) : 100;
    return { ano, n, soh: first, util, entregavel, exigido: nd.eCiclo, cobertura: nd.eCiclo > 0 ? entregavel / nd.eCiclo : 1,
      entregue: Math.min(entregavel, nd.eCiclo), ciclosAcum: ano * nd.ciclosAno, potencia: n * p.pUnit };
  }
  const rows = (p, fleet, nd, e, cRate) => Array.from({ length: Math.round(p.horizonte) + 1 }, (_, a) => fleetRow(p, fleet, a, nd, e, cRate));

  // ---------- dimensionamento ----------
  function size(p, nd, e) {
    const cRate0 = clamp(nd.pReq / Math.max(nd.eCiclo / (p.dod / 100 * e.etaD), 1e-9), 0.1, 0.5);   // estimativa para ler a tabela
    const unit = y => p.eUnit * p.dod / 100 * soh(y, cRate0, nd.ciclosAno, p.parcelaCalendario) / 100 * e.etaD;   // kWh entregáveis por unidade
    const nE = unit(p.anoProjeto) > 0 ? nd.eCiclo / unit(p.anoProjeto) : 0, nP = p.pUnit > 0 ? nd.pReq / p.pUnit : 0, exato = Math.max(nE, nP);
    // arredondamento: aceita ficar abaixo do exigido até a tolerância; passou disso, sobe uma unidade
    const n = Math.max(1, Math.ceil(exato * (1 - p.tolerancia / 100) - 1e-9));
    const cRate = clamp(Math.min(nd.pReq, n * p.pUnit) / (n * p.eUnit), 0.1, 0.5);
    const entregue = Math.min(nd.eCiclo, n * unit(0)), dc = e.etaD > 0 ? entregue / e.etaD : 0, carga = e.etaC > 0 ? dc / e.etaC : 0;
    return { nE, nP, exato, n, limitante: nP > nE ? 'potência' : 'energia', cRate, eNom: n * p.eUnit, pNom: n * p.pUnit,
      eNomExigida: exato * p.eUnit, coberturaBol: nd.eCiclo > 0 ? n * unit(0) / nd.eCiclo : 1, coberturaPot: nd.pReq > 0 ? n * p.pUnit / nd.pReq : 1,
      opcoes: [Math.max(1, Math.floor(exato)), Math.max(1, Math.ceil(exato))].filter((v, i, a) => a.indexOf(v) === i).map(k => ({ n: k, cobertura: nd.eCiclo > 0 ? Math.min(k * unit(p.anoProjeto) / nd.eCiclo, k * p.pUnit / Math.max(nd.pReq, 1e-9)) : 1 })),
      ciclo: { entregue, descargaCC: dc, cargaRede: carga, perdas: carga - entregue, horasDescarga: n * p.pUnit > 0 ? entregue / Math.min(n * p.pUnit, Math.max(nd.pReq, 1e-9)) : 0 } };
  }

  // ---------- augmentation: sobredimensionar no início ou acrescentar ao longo dos anos ----------
  function plans(p, nd, e, sz) {
    const tol = 1 - p.tolerancia / 100, H = Math.round(p.horizonte), nMin = Math.max(1, Math.ceil(sz.nP * tol - 1e-9));
    const cost = fleet => sum(fleet.map(c => c.n * p.eUnit * p.capexKwh * Math.pow(1 - p.quedaPreco / 100, c.ano) / Math.pow(1 + p.taxa / 100, c.ano)));
    const pack = fleet => ({ fleet, unidades: sum(fleet.map(c => c.n)), vpCapex: cost(fleet) + p.capexFixo, rows: rows(p, fleet, nd, e, sz.cRate) });
    // A: uma compra só, grande o bastante para o último ano
    let n0 = Math.max(nMin, 1);
    while (n0 < 5000 && fleetRow(p, [{ n: n0, ano: 0 }], H, nd, e, sz.cRate).cobertura < tol) n0++;
    // B: começa com o necessário no ano 0 e repõe quando a cobertura cai abaixo da tolerância
    let b0 = Math.max(nMin, 1);
    while (b0 < 5000 && fleetRow(p, [{ n: b0, ano: 0 }], 0, nd, e, sz.cRate).cobertura < tol) b0++;
    const fleet = [{ n: b0, ano: 0 }];
    for (let a = 1; a <= H; a++) {
      const r = fleetRow(p, fleet, a, nd, e, sz.cRate);
      if (r.cobertura < tol) { const per = p.eUnit * p.dod / 100 * e.etaD; fleet.push({ n: Math.max(1, Math.ceil((nd.eCiclo - r.entregavel) / per - 1e-9)), ano: a }); }
    }
    return { bol: pack([{ n: n0, ano: 0 }]), aug: pack(fleet) };
  }

  // ---------- economia anual e fluxo de caixa ----------
  function saving(p, nd, e, entregueCiclo, cobertura) {   // R$ por ano, a preços do ano 0
    const E = entregueCiclo * nd.ciclosAno, recarga = e.rte > 0 ? E / e.rte * p.tFora : 0;
    if (p.estrategia === 'peak') return Math.min(cobertura, 1) * nd.pReq * (p.modalidade === 'azul' ? p.tDemandaPonta : p.tDemanda) * 12 - (recarga - E * p.tFora);
    if (p.estrategia === 'diesel') return E * (p.consumoEspecifico * p.precoDiesel + p.omGerador) - recarga;
    return E * p.tPonta - recarga;
  }
  function irr(flow) {
    const npv = r => sum(flow.map((v, i) => v / Math.pow(1 + r, i)));
    if (npv(0) <= 0 || flow[0] >= 0) return null;
    let lo = 0, hi = 10; if (npv(hi) > 0) return null;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (npv(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2 * 100;
  }
  function finance(p, nd, e, plan) {
    const H = Math.round(p.horizonte), r = p.taxa / 100, g = p.reajuste / 100, capexAno = new Array(H + 1).fill(0);
    plan.fleet.forEach(c => { capexAno[c.ano] += c.n * p.eUnit * p.capexKwh * Math.pow(1 - p.quedaPreco / 100, c.ano); });
    capexAno[0] += p.capexFixo;
    const flow = [-capexAno[0]], linhas = [{ ano: 0, economia: 0, opex: 0, capex: capexAno[0], fluxo: -capexAno[0], acumulado: -capexAno[0] }];
    let acum = -capexAno[0], acumDesc = -capexAno[0], investido = capexAno[0], pb = null, pbDesc = null, vpEnergia = 0, vpCusto = capexAno[0];
    for (let a = 1; a <= H; a++) {
      const r0 = plan.rows[a - 1], r1 = plan.rows[a], ent = (r0.entregue + r1.entregue) / 2, cob = (r0.cobertura + r1.cobertura) / 2;   // média do ano
      const eco = saving(p, nd, e, ent, cob) * Math.pow(1 + g, a - 1), opex = investido * p.opexPct / 100 * Math.pow(1 + g, a - 1);
      const cap = a < H ? capexAno[a] : 0, f = eco - opex - cap, d = Math.pow(1 + r, a);
      if (pb == null && acum + f >= 0 && f > 0) pb = a - 1 + (-acum) / f;
      if (pbDesc == null && acumDesc + f / d >= 0 && f > 0) pbDesc = a - 1 + (-acumDesc) / (f / d);
      acum += f; acumDesc += f / d; investido += cap; flow.push(f);
      vpEnergia += ent * nd.ciclosAno / d; vpCusto += (opex + cap + (e.rte > 0 ? ent * nd.ciclosAno / e.rte * p.tFora * Math.pow(1 + g, a - 1) : 0)) / d;
      linhas.push({ ano: a, economia: eco, opex, capex: cap, fluxo: f, acumulado: acum });
    }
    return { linhas, capexInicial: capexAno[0], capexTotal: sum(capexAno.slice(0, H)), economiaAno1: linhas[1] ? linhas[1].economia : 0,
      payback: pb, paybackDesc: pbDesc, vpl: acumDesc, tir: irr(flow), lcos: vpEnergia > 0 ? vpCusto / vpEnergia : null };
  }

  // ---------- gerador a diesel contra BESS (por ano, início de vida) ----------
  function diesel(p, nd, e, sz) {
    const E = sz.ciclo.entregue * nd.ciclosAno, litros = E * p.consumoEspecifico, custoDiesel = litros * p.precoDiesel + E * p.omGerador, custoBess = e.rte > 0 ? E / e.rte * p.tFora : 0;
    return { energia: E, litros, custoDiesel, custoBess, economia: custoDiesel - custoBess, kwhDiesel: p.consumoEspecifico * p.precoDiesel + p.omGerador, kwhBess: e.rte > 0 ? p.tFora / e.rte : 0,
      co2Diesel: litros * p.emissaoDiesel, co2Bess: e.rte > 0 ? E / e.rte * p.emissaoRede : 0 };
  }

  // ---------- dia típico: 24 valores de potência média por hora ----------
  const inWin = (h, ini, dur) => ((h - ini) % 24 + 24) % 24 < dur;
  function profile(p, nd, e, sz) {
    const peak = p.estrategia === 'peak', base = peak ? p.picoMedido : p.demandaContratada * 0.95;
    const carga = SHAPE.map(v => v * base), bess = new Array(24).fill(0), warns = [];
    let dc = 0;                                              // energia retirada da bateria, lado CC
    if (peak) {
      let disp = sz.ciclo.entregue;
      carga.forEach((l, h) => { if (l > p.limite && disp > 0) { const d = Math.min(l - p.limite, sz.pNom, disp); bess[h] = d; disp -= d; dc += d / e.etaD; } });
    } else {
      const hrs = [...Array(24).keys()].filter(h => inWin(h, p.pontaIni, p.pontaDur)); let disp = sz.ciclo.entregue;
      hrs.forEach((h, i) => { const d = Math.min(disp / (hrs.length - i), sz.pNom, carga[h]); bess[h] = d; disp -= d; dc += d / e.etaD; });
      if (disp > 1) warns.push('A carga na ponta é menor que a energia a deslocar: sobram ' + Math.round(disp) + ' kWh por ciclo sem uso. Confira a energia do período ou a demanda.');
    }
    const rec = [...Array(24).keys()].filter(h => inWin(h, p.recargaIni, p.recargaDur) && bess[h] === 0), need24 = e.etaC > 0 ? dc / e.etaC : 0;
    const pRec = rec.length ? need24 / rec.length : 0;
    rec.forEach(h => { bess[h] = -Math.min(pRec, sz.pNom); });
    const rede = carga.map((l, h) => l - bess[h]), antes = p.estrategia === 'diesel' ? carga.map((l, h) => inWin(h, p.pontaIni, p.pontaDur) ? Math.max(l - p.potGerador, 0) : l) : carga;
    if (pRec > sz.pNom + 1e-6) warns.push('A janela de recarga é curta: seriam precisos ' + Math.round(pRec) + ' kW e o sistema tem ' + Math.round(sz.pNom) + ' kW.');
    const pico = Math.max(...rec.map(h => rede[h]), 0);
    if (rec.length && pico > p.demandaContratada + 0.5) warns.push('Na recarga a rede chega a ' + Math.round(pico) + ' kW, acima da demanda contratada de ' + Math.round(p.demandaContratada) + ' kW.');
    return { carga, bess, rede, antes, warns, picoAntes: Math.max(...antes), picoDepois: Math.max(...rede) };
  }

  function run(input) {
    const p = clean(input), e = eff(p), nd = need(p), sz = size(p, nd, e), pl = plans(p, nd, e, sz), plan = pl[p.plano];
    const ret = rows(p, [{ n: sz.n, ano: 0 }], nd, e, sz.cRate);   // retenção da compra inicial, sem reposição
    const anoEol = ret.find(r => r.soh <= p.eol), anoDeficit = ret.find(r => r.cobertura < 1 - p.tolerancia / 100);
    const warns = [];
    if (nd.eCiclo <= 0) warns.push('A energia exigida por ciclo é zero: confira as premissas da estratégia.');
    if (sz.coberturaPot < 1 - 1e-9 && sz.n * p.pUnit < nd.pReq) warns.push('A potência instalada (' + Math.round(sz.pNom) + ' kW) fica abaixo da exigida (' + Math.round(nd.pReq) + ' kW).');
    if (sz.coberturaBol < 1 - 1e-9) warns.push('Com ' + sz.n + ' unidade(s) o sistema entrega ' + Math.round(sz.coberturaBol * 100) + '% da energia exigida já no início de vida.');
    return { p, eff: e, need: nd, size: sz, ret, planos: pl, plano: plan, fin: finance(p, nd, e, plan), finAlt: finance(p, nd, e, pl[p.plano === 'aug' ? 'bol' : 'aug']),
      diesel: diesel(p, nd, e, sz), dia: profile(p, nd, e, sz), warns,
      vida: { anoEol: anoEol ? anoEol.ano : null, anoGarantia: nd.ciclosAno > 0 ? p.ciclosGarantidos / nd.ciclosAno : null, anoDeficit: anoDeficit ? anoDeficit.ano : null } };
  }

  const BE = { DEF, KVA, SHAPE, clean, eff, need, soh, size, plans, finance, diesel, profile, run, inWin };
  if (typeof module !== 'undefined' && module.exports) module.exports = BE; else root.BE = BE;
})(typeof window !== 'undefined' ? window : globalThis);
