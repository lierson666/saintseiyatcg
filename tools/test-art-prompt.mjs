// Gerador de prompt de arte: segue o Master Art Prompt System e puxa os dados da carta.
// node --test tools/test-art-prompt.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARCS, BEFORE, NEXT, NOW, STYLE_GROUPS, STYLES, THEMES, VIEWER, buildDirectorPrompt, buildImagePrompt, cardFacts, defaultParams, randomParams} from '../card-forge/art-prompt.js';

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

test('referência vai sempre no prompt, e cena só vem de lista', () => {
  assert.match(promptOf('athena-v6-001'), /REFERENCES: reference images are attached/);
  assert.match(promptOf('hades-v6-182'), /REFERENCES: reference images are attached/);
  const text = promptOf('athena-v6-001', {theme: THEMES[2][0], arc: ARCS[3][0], before: BEFORE[1][0], now: NOW[1][0], next: NEXT[1][0], viewer: VIEWER[1][0]});
  assert.match(text, /SETTING: the stairway .*Inspired by: Battle of the Twelve Houses\./);
  assert.match(text, /STORY: Just happened: a blow .*Happening now: unleashing .*About to happen: the decisive .*The viewer must feel: awe\./);
});

test('randomizar muda a direção de arte e preserva o que vem da carta', () => {
  const f = cardFacts(card('athena-v6-001'), cartas), base = {...defaultParams(f), notes: 'manter', mode: 'image'};
  const first = randomParams(f, base, () => 0), last = randomParams(f, base, () => 0.999);
  assert.notEqual(first.shot, last.shot);
  assert.notEqual(first.style, last.style);
  for (const p of [first, last]) {
    for (const key of ['person', 'armor', 'god', 'notes', 'mode', 'usePowers']) assert.deepEqual(p[key], base[key], key);
    assert.doesNotMatch(buildImagePrompt(f, p), /undefined|null/);
  }
  assert.equal(first.accent, '');
  const spell = cardFacts(card('athena-v6-084'), cartas);
  assert.equal(randomParams(spell, defaultParams(spell), () => 0.5).technique, spell.name);
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

test('traço manda no desenho: versão e referências só definem o design', () => {
  const free = promptOf('athena-v6-001', {style: STYLE_GROUPS['HQ ocidental'][0][0]});
  assert.ok(free.indexOf('ART STYLE') < free.indexOf('REFERENCES'));
  assert.match(free, /ART STYLE \(top priority.*cosmic crackling/);
  assert.match(free, /Do not copy their drawing style/);
  assert.doesNotMatch(free, /DESIGN CANON|Do not mix versions/);
  assert.match(promptOf('athena-v6-001', {version: 'The Lost Canvas'}), /DESIGN CANON: costume and armor shapes follow The Lost Canvas, only as design/);
});

test('tem anime, mangá e HQ à escolha, sem traço repetido', () => {
  for (const group of ['Anime', 'Mangá', 'HQ ocidental']) assert.ok(STYLE_GROUPS[group].length >= 10, group);
  assert.equal(new Set(STYLES.map(([prompt]) => prompt)).size, STYLES.length);
  assert.equal(new Set(STYLES.map(([, label]) => label)).size, STYLES.length);
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
