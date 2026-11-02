// Gerador de prompt de arte: segue o Master Art Prompt System e puxa os dados da carta.
// node --test tools/test-art-prompt.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STYLES, buildDirectorPrompt, buildImagePrompt, cardFacts, defaultParams} from '../card-forge/art-prompt.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
const master = readFileSync(new URL('../card-forge/art-master-prompt.md', import.meta.url), 'utf8');
const card = (id) => cartas.find((c) => c.id === id);
const promptOf = (id, change = {}) => { const f = cardFacts(card(id), cartas); return buildImagePrompt(f, {...defaultParams(f), ...change}); };

test('Devotee: personagem, armadura ligada, poder, regra de 7/10 e 3:4', () => {
  const text = promptOf('athena-v6-001');
  assert.match(text, /^Vertical 3:4/);
  assert.match(text, /SUBJECT: PEGASUS SEIYA, wearing .*CLOTH/);
  assert.match(text, /7\/10 of the image height measured from the bottom, never above that line/);
  assert.match(text, /exactly five fingers/);
  assert.match(text, /FACTION IDENTITY: Athena/);
  assert.match(text, /Seventh Sense/);
});

test('Technique: conjurador vem do nome da carta e a técnica já vem marcada', () => {
  const f = cardFacts(card('athena-v6-084'), cartas);
  assert.equal(f.person, 'CYGNUS HYOGA');
  assert.match(promptOf('athena-v6-084'), /TECHNIQUE IN USE: HYOGA’S ABSOLUTE ZERO/);
});

test('Equipment começa sozinho, e o portador fica só como opção', () => {
  const f = cardFacts(card('hades-v6-182'), cartas);
  assert.equal(f.person, '');
  assert.equal(f.people[0], 'WYVERN RHADAMANTHYS');
  const alone = promptOf('hades-v6-182');
  assert.match(alone, /alone as a sacred object/);
  assert.doesNotMatch(alone, /FACE PLACEMENT|POSE:|EXPRESSION:|extra fingers/);
  assert.match(promptOf('hades-v6-182', {person: f.people[0]}), /WYVERN RHADAMANTHYS, wearing WYVERN SURPLICE \(Equipment — Judge Surplice\)/);
});

test('grandiosidade segue a raridade e God é divino', () => {
  assert.equal(defaultParams(cardFacts(card('athena-v6-084'), cartas)).epic, '4');
  const god = cartas.find((c) => c.tipo === 'God');
  assert.equal(defaultParams(cardFacts(god, cartas)).epic, '5');
});

test('toda carta gera prompt limpo, com negative prompt separado', () => {
  for (const c of cartas) {
    const text = promptOf(c.id);
    assert.doesNotMatch(text, /undefined|null|false|\[object|[@{}]/, c.id);
    const parts = text.split('\n\n');
    assert.equal(parts.length, 2, c.id);
    assert.match(parts[1], /^NEGATIVE PROMPT: .*low resolution\.$/, c.id);
  }
});

test('modo diretor leva o Master inteiro e pede o formato da seção 12', () => {
  const f = cardFacts(card('athena-v6-001'), cartas), text = buildDirectorPrompt(master, f, defaultParams(f));
  assert.ok(text.startsWith('SAINT SEIYA TCG — MASTER ART PROMPT SYSTEM V1.0'));
  assert.ok(text.includes(master.trim()));
  assert.match(text, /formato obrigatório da seção 12\. Não gere a imagem/);
  assert.match(text, /SUBJECT: PEGASUS SEIYA/);
});

test('traço descreve o estilo sem nome de ilustrador no prompt direto', () => {
  for (const [prompt, label] of STYLES) {
    for (const name of label.match(/\(([^)]+)\)/)[1].split(', ')) assert.ok(!prompt.includes(name), name);
  }
});
