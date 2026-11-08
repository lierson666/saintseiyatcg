// Gatilhos em PT (autor, 01/11/2026): nome de habilidade da engine e efeito na tela vêm dos campos *_pt.
// node --test tools/test-card-terms-i18n.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {cardTerms, abilityText, forceLang} from '../shared/card-i18n.js';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url))).cartas;
const byName = n => cards.find(c => c.nome_exibicao_en === n);
const terms = cardTerms(cards);

test('nome de habilidade e de carta nas grafias da tela', () => {
  assert.equal(terms["SCAVENGER'S REWARD"], 'RECOMPENSA DO CATADOR');
  assert.equal(terms.KIKI, undefined, 'nome igual em PT não entra');
  assert.equal(terms['GREAT FLOOD'], 'GRANDE DILÚVIO');
  assert.equal(terms['PHOENIX IKKI'], 'IKKI DE FÊNIX');
  assert.equal(terms['Phoenix Ikki'], 'Ikki de Fênix');
});

test('efeito na pilha: PT quando a tela está em PT, sem o nome e sem a etiqueta do God', () => {
  const scav = cards.find(c => (c.habilidades_en || []).some(h => h.startsWith("Scavenger's Reward")));
  forceLang('pt');
  assert.match(abilityText(scav, "SCAVENGER'S REWARD"), /^Sempre que outro Berserker aliado é derrotado/);
  const poseidon = cards.find(c => c.id === 'poseidon-001');
  assert.match(abilityText(poseidon, 'WATER PRISON'), /^Uma vez até o início da sua próxima rodada/);
  assert.match(abilityText(poseidon, 'GREAT FLOOD'), /^Devolva todos os Devotos/);
  forceLang('en');
  assert.match(abilityText(scav, "SCAVENGER'S REWARD"), /^Whenever another friendly Berserker/);
  assert.equal(abilityText(scav, 'NOT AN ABILITY'), null);
  forceLang(null);
});

test('todo nome de habilidade citado pela engine tem PT (dicionário ou cartas)', () => {
  const pt = readFileSync(new URL('../shared/i18n-pt.js', import.meta.url), 'utf8');
  const dir = new URL('../playtest/engine-v3/v6/', import.meta.url), seen = new Set();
  for (const f of readdirSync(dir)) {
    for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/k\.(?:may|choose)\(c, key, '((?:[^'\\]|\\.)+)'/g)) seen.add(m[1].replace(/\\'/g, "'"));
  }
  const missing = [...seen].filter(a => /^[A-Z' ,.-]+$/.test(a) && a !== 'KIKI' && !/ RESONANCE$/.test(a) && !terms[a] && !pt.includes(`'${a.replace(/'/g, "\\'")}'`) && !cards.some(c => (c.nome_exibicao_en === a)));
  assert.deepEqual(missing, []);
});
