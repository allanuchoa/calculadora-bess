// Teste do motor. Rodar: node tests/engine.test.js
const assert = require('assert');
const BE = require('../engine.js');
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

// ---------- eficiência: produto da cadeia, carga x descarga = total ----------
const p0 = BE.clean({});
const e = BE.eff(p0);
near(e.rte, 0.95 * 0.985 ** 2 * 0.995 ** 2 * 0.985, 1e-9);
near(e.etaC * e.etaD, e.rte, 1e-12);
near(e.items[e.items.length - 1].depois, e.rte * 100, 1e-9);
near(e.items.reduce((s, i) => s + i.perda, 0), 100 - e.rte * 100, 1e-9);   // a cascata fecha
// cada transformador entra nos dois sentidos
near(BE.eff(BE.clean({ nTrafos: 2 })).rte / e.rte, 0.99 ** 4, 1e-9);

// ---------- necessidade por ciclo ----------
let nd = BE.need(p0);
near(nd.eCiclo, 4620 / 22); near(nd.pReq, 210 / 3); assert.strictEqual(nd.ciclosAno, 264);
nd = BE.need(BE.clean({ estrategia: 'peak', picoMedido: 560, limite: 470, duracaoPico: 2, fatorForma: 0.6 }));
near(nd.pReq, 90); near(nd.eCiclo, 108);
nd = BE.need(BE.clean({ estrategia: 'diesel', potGerador: 300, horasGerador: 3 }));
near(nd.eCiclo, 900); near(nd.pReq, 300);

// ---------- estado de saúde ----------
near(BE.soh(0, 0.5, 365, 30), 100);
near(BE.soh(10, 0.5, 365, 30), 80.0);            // 1 ciclo por dia reproduz a tabela
near(BE.soh(10, 0.25, 365, 30), 80.3);
assert.ok(BE.soh(10, 0.5, 730, 30) < 80 && BE.soh(10, 0.5, 100, 30) > 80);   // mais ciclos, mais desgaste
near(100 - BE.soh(10, 0.5, 0, 30), 20 * 0.3);    // sem ciclos sobra só a parcela de calendário
assert.ok(BE.soh(20, 0.5, 365, 30) < BE.soh(15, 0.5, 365, 30));              // extrapola além da tabela
assert.ok(BE.soh(10, 0.1, 365, 30) > BE.soh(10, 0.25, 365, 30));             // taxa menor desgasta menos

// ---------- arredondamento: os exemplos do documento de requisitos ----------
const nFor = exato => { // força um "exato" por energia ajustando a energia do período
  const base = BE.clean({ tolerancia: 4, pUnit: 1e6 }), ef = BE.eff(base), unit = base.eUnit * base.dod / 100 * ef.etaD;
  return BE.run({ ...base, energiaPeriodo: exato * unit * base.dias }).size;
};
assert.strictEqual(nFor(0.67).n, 1); assert.strictEqual(nFor(1.01).n, 1); assert.strictEqual(nFor(3.1).n, 3); assert.strictEqual(nFor(4.2).n, 5);
near(nFor(3.1).exato, 3.1, 1e-6);
// quem limita pode ser a potência
const sp = BE.run({ estrategia: 'peak', picoMedido: 1000, limite: 500, duracaoPico: 0.5, fatorForma: 0.5 }).size;
assert.strictEqual(sp.limitante, 'potência'); assert.strictEqual(sp.n, 4);

// ---------- caso padrão de ponta a ponta ----------
const R = BE.run({});
assert.strictEqual(R.size.n, 1);
near(R.size.ciclo.cargaRede * R.eff.rte, R.size.ciclo.entregue, 1e-9);        // o que sai é o que entra vezes o rendimento
near(R.size.ciclo.perdas, R.size.ciclo.cargaRede - R.size.ciclo.entregue, 1e-9);
assert.ok(R.warns.length === 1 && /entrega/.test(R.warns[0]) === false || R.warns.length <= 1);
// retenção: cobertura cai com o tempo, e nunca se entrega mais que o exigido
assert.ok(R.ret[15].cobertura < R.ret[0].cobertura && R.ret.every(r => r.entregue <= r.exigido + 1e-9));
assert.strictEqual(R.ret.length, 16);
// dia típico: energia conservada e ponta coberta
const d = R.dia, dis = d.bess.filter(v => v > 0).reduce((s, v) => s + v, 0), chg = -d.bess.filter(v => v < 0).reduce((s, v) => s + v, 0);
near(dis, R.size.ciclo.entregue, 1e-6); near(chg, R.size.ciclo.cargaRede, 1e-6);
d.rede.forEach((v, h) => near(v, d.carga[h] - d.bess[h], 1e-9));
assert.ok([18, 19, 20].every(h => d.bess[h] > 0) && d.bess[21] === 0);

// ---------- augmentation ----------
const big = BE.run({ energiaPeriodo: 22 * 2000, pontaDur: 3 });
const A = big.planos.bol, B = big.planos.aug, tol = 0.96;
assert.ok(A.rows.every(r => r.cobertura >= tol - 1e-9), 'compra única cobre todo o horizonte');
assert.ok(B.rows.every(r => r.cobertura >= tol - 1e-9), 'reposição mantém a cobertura');
assert.ok(B.fleet.length > 1 && B.fleet[0].n < A.fleet[0].n, 'reposição começa menor');
assert.ok(B.fleet.every((c, i) => !i || c.ano > B.fleet[i - 1].ano));
assert.strictEqual(B.unidades, B.fleet.reduce((s, c) => s + c.n, 0));
// com folga larga e horizonte curto não há reposição
assert.strictEqual(BE.run({ energiaPeriodo: 22 * 2000, horizonte: 1, tolerancia: 30 }).planos.aug.fleet.length, 1);

// ---------- financeiro ----------
const F = big.fin;
near(F.linhas[0].fluxo, -F.capexInicial);
near(F.linhas[F.linhas.length - 1].acumulado, F.linhas.reduce((s, l) => s + l.fluxo, 0), 1e-6);
assert.ok(F.payback > 0 && F.payback < 15 && F.paybackDesc > F.payback);
assert.ok(F.tir > 10 === F.vpl > 0, 'TIR acima da taxa equivale a VPL positivo');
// economia do ano 1, deslocamento: energia x (ponta - fora de ponta / rendimento)
const sh = BE.run({ horizonte: 2 }), E1 = (sh.plano.rows[0].entregue + sh.plano.rows[1].entregue) / 2 * 264;
near(sh.fin.economiaAno1, E1 * 2.02 - E1 / sh.eff.rte * 0.42, 1e-6);
// tarifa sem diferença entre ponta e fora de ponta não se paga
const bad = BE.run({ tPonta: 0.42 }).fin;
assert.ok(bad.payback === null && bad.vpl < 0 && bad.tir === null);
// corte de pico: economia vem da demanda; tarifa azul usa a demanda de ponta
const pv = BE.run({ estrategia: 'peak', modalidade: 'verde', horizonte: 2 }).fin.economiaAno1, pa = BE.run({ estrategia: 'peak', modalidade: 'azul', horizonte: 2 }).fin.economiaAno1;
assert.ok(pa > pv && pv > 0);

// ---------- diesel ----------
const D = BE.run({ estrategia: 'diesel' }).diesel;
near(D.litros, D.energia * 0.30); near(D.kwhDiesel, 0.30 * 6.20 + 0.12); near(D.economia, D.custoDiesel - D.custoBess);
assert.ok(D.co2Diesel > D.co2Bess);

// ---------- entrada suja não derruba ----------
const dirty = BE.clean({ estrategia: 'x', dod: 500, dias: 'abc', energiaPeriodo: '', planta: { trafos: ['a', -1], topologia: 'zzz' }, nome: 5 });
assert.strictEqual(dirty.estrategia, 'shift'); assert.strictEqual(dirty.dod, 100); assert.strictEqual(dirty.dias, 22); assert.strictEqual(dirty.energiaPeriodo, 4620);
assert.deepStrictEqual(dirty.planta.trafos, [300, 300, 300]); assert.strictEqual(dirty.planta.topologia, 'bt');
assert.doesNotThrow(() => BE.run({ energiaPeriodo: 0, eUnit: 0, pUnit: 0 }));

console.log('engine.test.js: OK');
