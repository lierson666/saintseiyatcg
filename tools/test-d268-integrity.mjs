// Integridade do snapshot canônico D268: 95 registros originais e Kamui 019 congelada.
// node --test tools/test-d268-integrity.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const path = new URL('../data/canon/d268.json', import.meta.url);
const raw = readFileSync(path);
const canon = JSON.parse(raw);
const sha = value => createHash('sha256').update(value).digest('hex');
const records = [...canon.cards, ...canon.gods];

// Projeção lida do Drive em 28/10/2026 (doc 04). Mudou o arquivo? Revise o diff com o autor antes de atualizar.
// 29/10/2026: GOD-ARES AWAKEN 5 → 7 no texto aprovado (autor; docs/CHANGELOG-regras.md).
const SNAPSHOT_SHA256 = 'a4691d2e0c1808a143f1b0799370dba9c7260379ade6135a66caac0358c4a9a1';
const KAMUI_ORIGINAL_SHA256 = '153ad7e355b3fd87d9dc79ead14f62dfd7d2c03e8c703c56ec9bcee256ca5099';

test('snapshot não foi editado desde a importação', () => {
  assert.equal(sha(raw), SNAPSHOT_SHA256);
});

test('95 registros únicos: 90 cartas Athena e 5 Gods', () => {
  assert.equal(canon.cards.length, 90);
  assert.equal(canon.gods.length, 5);
  assert.equal(new Set(records.map(r => r.id)).size, 95);
});

test('texto original de cada registro confere com o hash publicado', () => {
  const broken = records.filter(r => sha(r.original_text) !== r.original_sha256).map(r => r.id);
  assert.deepEqual(broken, []);
});

test('Kamui 019 congelada: original fixo e texto corrente idêntico ao original', () => {
  const kamui = canon.cards.find(c => c.id === 'ATHENA-V6-019');
  assert.ok(canon.pegausus_god_cloth_019_frozen);
  assert.equal(kamui.original_sha256, KAMUI_ORIGINAL_SHA256);
  assert.equal(kamui.approved_current_text_as_of_d268, kamui.original_text);
});

test('última decisão aprovada é D268; D269 não entra como aprovada', () => {
  const ids = Object.keys(canon.approved_rule_records_d192_to_d268);
  assert.equal(canon.approved_decision, 268);
  assert.equal(ids.length, 77);
  assert.equal(ids.at(-1), 'D268');
  assert.ok(!ids.includes('D269'));
});
