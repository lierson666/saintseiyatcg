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

test('pose inicial varia por carta e nada de mão vindo para a câmera', () => {
  const devotees = cartas.filter((c) => c.tipo === 'Devotee'), start = devotees.map((c) => defaultParams(cardFacts(c, cartas)));
  for (const key of ['pose', 'angle']) {
    const counts = {};
    for (const p of start) counts[p[key]] = (counts[p[key]] || 0) + 1;
    assert.ok(Object.keys(counts).length >= 5, key);
    assert.ok(Math.max(...Object.values(counts)) < devotees.length * 0.3, key);
  }
  assert.equal(defaultParams(cardFacts(card('athena-v6-001'), cartas)).pose, start[devotees.findIndex((c) => c.id === 'athena-v6-001')].pose);
  const text = promptOf('athena-v6-001');
  assert.match(text, /No arm reaching or fist punching toward the camera/);
  assert.match(text, /NEGATIVE PROMPT: .*oversized foreshortened hand/);
});

test('carta genérica: personagem original, sem referência, sem regras e sem cânone', () => {
  const herald = card('poseidon-v6-103'), f = cardFacts(herald, cartas), text = promptOf('poseidon-v6-103');
  assert.equal(f.generic, true);
  assert.equal(defaultParams(f).mode, 'image');
  assert.match(text, /HERALD OF THE SEVEN SEAS, an original character created for this card, serving Poseidon/);
  assert.match(text, /Exactly one figure/);
  assert.doesNotMatch(text, /REFERENCES|reference images|Saint Seiya|DESIGN CANON|POWERS TO EVOKE|Marina Devotees/);
  assert.match(text, /NEGATIVE PROMPT: .*existing anime characters/);
  assert.doesNotMatch(promptOf('poseidon-v6-103', {version: 'The Lost Canvas', arc: ARCS[4][0], technique: f.techniques[0]}), /Lost Canvas|Poseidon chapter|Other friendly/);
  assert.doesNotMatch(buildDirectorPrompt('MASTER', f, defaultParams(f)), /vão anexadas/);
});

test('cânone continua com referências, e criatura genérica não ganha dedos', () => {
  const byName = (n) => cartas.find((c) => c.nome_exibicao_en === n);
  for (const n of ['PEGASUS SEIYA', 'MERMAID THETIS', 'MERMAID SCALE', 'GALACTIC ILLUSION', 'THE BETRAYAL OF THE GOLD SAINTS', 'ATHENA', 'HADES CASTLE']) assert.equal(cardFacts(byName(n), cartas).generic, false, n);
  for (const n of ['MARINA SPEARMAN', 'OCEANIC SPEAR', 'THE RISING TIDE', 'THE SUNKEN TEMPLE']) {
    const f = cardFacts(byName(n), cartas), text = buildImagePrompt(f, defaultParams(f));
    assert.equal(f.generic, true, n);
    assert.doesNotMatch(text, /reference|Saint Seiya/i, n);
  }
  const wolf = cardFacts(byName('MOONLIT WOLF'), cartas), text = buildImagePrompt(wolf, defaultParams(wolf));
  assert.equal(wolf.creature, true);
  assert.doesNotMatch(text, /fingers|POSE:|EXPRESSION:/);
  assert.match(text, /an original creature/);
});
