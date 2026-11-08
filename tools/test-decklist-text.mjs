// node --test tools/test-decklist-text.mjs
// Ida e volta da decklist em texto (shared/decklist-text.js): exportar, importar e chegar ao mesmo deck.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {decklistIndex, deckToText, textToDeck} from '../shared/decklist-text.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const cards = loadCanon(read('../data/canon/d268.json')), art = read('../card-forge/art-web/cards.json').cartas;
addPreviewCards(cards, null, art); // como no lobby: as outras facções vêm do Forge
const forge = new Map(art.map(c => [c.id, c]));
const index = decklistIndex([...cards.values()].map(c => ({id: c.id, kind: c.kind, names: [forge.get(c.id)?.nome_exibicao_en, forge.get(c.id)?.nome_exibicao_pt, c.name]})));
const nameEN = id => forge.get(id)?.nome_exibicao_en || cards.get(id).name;
const namePT = id => forge.get(id)?.nome_exibicao_pt || nameEN(id);
const same = d => ({nome: d.alpha_nome || d.nome, god: d.god || 'god-athena', domain_id: d.domain_id, main_deck: d.main_deck});
const presets = ['decks-competitivos', 'decks-ultra', 'decks-hiper', 'decks-preview'].flatMap(f => read(`../data/alpha-0.1/${f}.json`).decks)
  .filter(d => d.main_deck.every(e => cards.has(e.card_id)));

test('todos os decks prontos voltam iguais (com id e nome EN; sem id e nome PT)', () => {
  assert.ok(presets.length > 5);
  for (const d of presets) for (const text of [deckToText(d, nameEN), deckToText(d, namePT).replace(/ \([^()]+\)$/gm, '')]) {
    const {deck, errors} = textToDeck(text, index);
    assert.deepEqual(errors, [], d.id);
    assert.deepEqual(deck, same(d), d.id);
  }
});

test('sem id, com nome em PT e em EN, "3x" e acentos/maiúsculas trocados', () => {
  const d = presets[0];
  const strip = t => t.replace(/ \([^()]+\)$/gm, '');
  for (const nameOf of [nameEN, namePT]) {
    const {deck, errors} = textToDeck(strip(deckToText(d, nameOf)), index);
    assert.deepEqual(errors, []);
    assert.deepEqual(deck, same(d));
  }
  const {deck} = textToDeck(`deus\nATHENA\n2x ${nameEN(d.main_deck[0].card_id).toLowerCase()}`, index);
  assert.equal(deck.god, 'god-athena');
  assert.deepEqual(deck.main_deck, [{card_id: d.main_deck[0].card_id, quantity: 2}]);
});

test('nome repetido entre facções segue o Deus do deck', () => {
  assert.equal(textToDeck('God\n1 Hades\n1 Gemini Saga', index).deck.main_deck[0].card_id, 'hades-v6-255');
  assert.equal(textToDeck('God\n1 Athena\n1 Saga de Gêmeos', index).deck.main_deck[0].card_id, 'athena-v6-013');
});

test('linha desconhecida vira erro e não derruba o resto', () => {
  const {deck, errors} = textToDeck('3 Carta Que Não Existe\n2 athena-v6-013\nlixo (zzz-999)', index);
  assert.deepEqual(deck.main_deck, [{card_id: 'athena-v6-013', quantity: 2}]);
  assert.deepEqual(errors.map(e => e.line), [1, 3]);
});
