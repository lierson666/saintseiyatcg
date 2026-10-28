// node --test tools/test-deck-v3.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonIndex, validateDeck} from '../shared/deck-v3.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const index = canonIndex(read('../data/canon/d268.json'));
const {decks} = read('../data/alpha-0.1/decks-experimentais.json');
const deck = (entries, domain_id = 'athena-v6-062') => ({domain_id, main_deck: entries});
const codes = errors => errors.map(e => e.code);

test('deck de 60 com 3 cópias e Domain fora é válido', () => {
  const ids = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '018', '020', '021'];
  assert.deepEqual(validateDeck(deck(ids.map(n => ({card_id: `athena-v6-${n}`, quantity: 3}))), index), []);
});

test('quarta cópia, tamanho errado, Domain no deck e carta desconhecida são recusados', () => {
  const errors = validateDeck(deck([
    {card_id: 'athena-v6-001', quantity: 4},
    {card_id: 'athena-v6-062', quantity: 1},
    {card_id: 'athena-v6-999', quantity: 1},
  ], 'athena-v6-001'), index);
  assert.deepEqual(codes(errors).sort(), ['copies', 'domain', 'outside', 'size', 'unknown']);
});

test('as duas listas experimentais excedem o limite de 3 (D171) só nas cartas com 4 cópias', () => {
  const excess = d => validateDeck(d, index).filter(e => e.code === 'copies').map(e => e.card_id.slice(-3)).sort();
  assert.deepEqual(excess(decks[0]), ['001', '002', '021', '028', '053', '054', '060']);
  assert.deepEqual(excess(decks[1]), ['003', '004', '011', '037', '040', '041', '042', '045', '058']);
  for (const d of decks) assert.deepEqual(codes(validateDeck(d, index)).filter(c => c !== 'copies'), [], d.alpha_nome);
  // Com o limite antigo de 4, as listas passam: o conflito é só a D171.
  for (const d of decks) assert.deepEqual(validateDeck(d, index, {copyLimit: 4}), [], d.alpha_nome);
});
