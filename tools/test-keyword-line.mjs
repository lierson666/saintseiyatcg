// Sintaxe das keywords (guia Cap. IX): caixa só com keywords da linha vira keyword; o resto é habilidade.
import test from 'node:test';
import assert from 'node:assert/strict';
import {keywordsOfLine} from '../shared/card-model.js';

test('caixa só com keywords devolve os nomes oficiais', () => {
  assert.deepEqual(keywordsOfLine('Guardian'), ['Guardian']);
  assert.deepEqual(keywordsOfLine('guardian, long range.'), ['Guardian', 'Long Range']);
  assert.deepEqual(keywordsOfLine('**GUARDIAN, PIERCE.**'), ['Guardian', 'Pierce']);
  assert.deepEqual(keywordsOfLine('Nimble. Impulse. Nimble'), ['Nimble', 'Impulse']);
});
test('habilidade inteira e keyword com valor continuam como habilidade', () => {
  for (const text of ['', 'Hidden Cosmo {5}', 'Afterlife {2}{C}: Draw 1 card.', 'Immune to Hades.', 'Guardian, draw a card.', '**Dragon Shield:**\nOnce each round, prevent 1.']) assert.equal(keywordsOfLine(text), null);
});
