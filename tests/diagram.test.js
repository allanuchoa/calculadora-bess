// Teste do gerador de diagramas. Rodar: node tests/diagram.test.js
const assert = require('assert');
const BD = require('../diagram.js');

assert.deepStrictEqual(BD.distribute(10, [1000, 300, 300]), [6, 2, 2]);
assert.deepStrictEqual(BD.distribute(10, [300, 300, 300, 300, 300, 300, 300, 300]).reduce((s, v) => s + v, 0), 10);
assert.deepStrictEqual(BD.distribute(2, [300, 300, 300]), [1, 1, 0]);
assert.strictEqual(BD.stdKva(1375), 1500); assert.strictEqual(BD.stdKva(300), 300);
assert.strictEqual(BD.ctKw(1250), 1250); assert.strictEqual(BD.ctKw(260), 500); assert.strictEqual(BD.ctKw(10), 250);

const base = { gerador: true, kvaGerador: 1000, trafos: [300, 300, 300], n: 10, pUnit: 125 };
for (const t of ['atual', 'mt', 'serie', 'bt']) {
  const d = BD.draw({ ...base, topologia: t }, { titulo: 'T <x>' });
  assert.ok(d.svg.startsWith('<svg') && d.svg.endsWith('</svg>') && d.w > 300 && d.h > 300, t);
  assert.ok(!/NaN|undefined/.test(d.svg), t + ' sem NaN');
  assert.ok(d.svg.includes('T &lt;x&gt;'), 'título escapado');
  assert.strictEqual(d.svg.includes('BESS'), t !== 'atual');
  assert.strictEqual(d.svg.includes('>EMS<'), t !== 'atual');
  assert.strictEqual((d.svg.match(/>TR-\d+</g) || []).length, 3);
}
// 10 BESS de 125 kW em transformadores de 300 kVA: 4 + 3 + 3, e o de 4 estoura
const bt = BD.draw({ ...base, topologia: 'bt' });
assert.deepStrictEqual(bt.plano.alloc, [4, 3, 3]);
assert.ok(bt.notes.some(n => /TR-1.*acima/.test(n)));
// centralizado: transformador dedicado com folga e cabine pelo total
const mt = BD.draw({ ...base, topologia: 'mt' });
assert.strictEqual(mt.plano.trBess, 1500); assert.strictEqual(mt.plano.ct, 1250);
// sem gerador não há chave de transferência; sem BESS vira a situação atual
assert.ok(!BD.draw({ ...base, gerador: false, topologia: 'mt' }).svg.includes('Chave de transferência'));
assert.ok(!BD.draw({ ...base, n: 0, topologia: 'bt' }).svg.includes('BESS'));
assert.ok(!/NaN/.test(BD.draw({ gerador: false, trafos: [500], n: 1, pUnit: 125, topologia: 'serie' }).svg));

console.log('diagram.test.js: OK');
