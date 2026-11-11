// Gerador de prompt de arte: segue o Master Art Prompt System e puxa os dados da carta.
// node --test tools/test-art-prompt.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANGLES, ARCS, BEFORE, ETHNICITIES, HAIRSTYLES, NEXT, NOW, POSES, SHOTS, STYLE_GROUPS, STYLES, THEMES, VIEWER, buildDirectorPrompt, buildImagePrompt, cardFacts, defaultParams, randomParams} from '../card-forge/art-prompt.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
const master = readFileSync(new URL('../card-forge/art-master-prompt.md', import.meta.url), 'utf8');
const card = (id) => cartas.find((c) => c.id === id);
const promptOf = (id, change = {}) => { const f = cardFacts(card(id), cartas); return buildImagePrompt(f, {...defaultParams(f), ...change}); };

test('Devotee: personagem, armadura ligada, poder, regra de 7/10 e 3:4', () => {
  const text = promptOf('athena-v6-001');
  assert.match(text, /^Vertical 3:4/);
  assert.match(text, /SUBJECT: PEGASUS SEIYA, wearing .*CLOTH/);
  assert.match(text, /FACE ZONE, MAXIMUM PRIORITY[^\n]*at about 7\/10 of the image height measured from the bottom/);
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
  const f = cardFacts(card('athena-v6-085'), cartas);
  assert.equal(f.person, 'DRAGON SHIRYU');
  assert.match(promptOf('athena-v6-085'), /TECHNIQUE IN USE: SHIRYU’S LAST DRAGON/);
});

test('Equipment começa sozinho, e o portador fica só como opção', () => {
  const f = cardFacts(card('hades-v6-182'), cartas);
  assert.equal(f.person, '');
  assert.equal(f.people[0], 'WYVERN RHADAMANTHYS');
  const alone = promptOf('hades-v6-182');
  assert.match(alone, /alone as a sacred object/);
  assert.doesNotMatch(alone, /entire head of the (main|protagonist)|POSE:|EXPRESSION:|extra fingers/);
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
  assert.equal(defaultParams(cardFacts(card('athena-v6-085'), cartas)).epic, '4');
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

test('pose e ângulo iniciais variam por carta', () => {
  const devotees = cartas.filter((c) => c.tipo === 'Devotee'), start = devotees.map((c) => defaultParams(cardFacts(c, cartas)));
  for (const key of ['pose', 'angle']) {
    const counts = {};
    for (const p of start) counts[p[key]] = (counts[p[key]] || 0) + 1;
    assert.ok(Object.keys(counts).length >= 5, key);
    assert.ok(Math.max(...Object.values(counts)) < devotees.length * 0.3, key);
  }
  assert.equal(defaultParams(cardFacts(card('athena-v6-001'), cartas)).pose, start[devotees.findIndex((c) => c.id === 'athena-v6-001')].pose);
});

test('listas de pose, plano e ângulo são grandes e sem repetir', () => {
  assert.ok(POSES.length >= 40);
  assert.equal(new Set(POSES.map(([en]) => en)).size, POSES.length);
  for (const [list, size] of [[SHOTS, 24], [ANGLES, 35]]) {
    assert.ok(list.length >= size);
    assert.equal(new Set(list.map(([en]) => en)).size, list.length);
  }
  for (const c of cartas.filter((x) => x.tipo === 'Devotee')) {
    const p = defaultParams(cardFacts(c, cartas));
    assert.ok(SHOTS.some(([en]) => en === p.shot) && ANGLES.some(([en]) => en === p.angle) && POSES.some(([en]) => en === p.pose), c.id);
  }
  const f = cardFacts(card('athena-v6-001'), cartas), seen = new Set();
  for (let i = 0; i < POSES.length; i++) seen.add(randomParams(f, defaultParams(f), () => i / POSES.length).pose);
  assert.equal(seen.size, POSES.length);
});

test('listas de cena cresceram sem repetir, e genérica não sorteia lugar do cânone', () => {
  for (const [list, size] of [[THEMES, 40], [BEFORE, 20], [NOW, 25], [NEXT, 20], [VIEWER, 20]]) {
    assert.ok(list.length >= size, String(size));
    assert.equal(new Set(list.map(([en]) => en)).size, list.length);
    assert.equal(new Set(list.map(([, pt]) => pt)).size, list.length);
  }
  const f = cardFacts(card('poseidon-v6-103'), cartas), themes = new Set();
  for (let i = 0; i < 100; i++) themes.add(randomParams(f, defaultParams(f), () => i / 100).theme);
  assert.ok(themes.size >= 5);
  for (const t of themes) assert.doesNotMatch(t, /Twelve Houses|Sanctuary|undersea|Underworld|Elysion|Jamir|Asgard|Olympus/, t);
  assert.ok([...themes].some((t) => /Coral Labyrinth/.test(t)));
  assert.ok(THEMES.filter(([, pt]) => /^(Atlântida|Poseidon):/.test(pt)).length >= 20);
  const athena = cardFacts(cartas.find((c) => c.nome_exibicao_en === 'SANCTUARY GUARD'), cartas), other = new Set();
  for (let i = 0; i < 100; i++) other.add(randomParams(athena, defaultParams(athena), () => i / 100).theme);
  assert.ok(![...other].some((t) => /Coral Labyrinth|Abyssal Trench/.test(t)));
});

test('todo ângulo vem descrito antes do traço, sem proibir nenhum', () => {
  for (const [angle] of ANGLES) {
    const text = promptOf('athena-v6-001', {angle});
    assert.ok(text.includes(`CAMERA VIEWPOINT (mandatory, overrides any other hint about viewpoint): ${angle}: `), angle);
    assert.ok(text.indexOf('CAMERA VIEWPOINT') < text.indexOf('ART STYLE'), angle);
    assert.doesNotMatch(text, /Do not use a low camera|camera looking up at the figure|oversized foreshortened hand/, angle);
  }
  const f = cardFacts(card('athena-v6-001'), cartas), angles = new Set();
  for (let i = 0; i < ANGLES.length; i++) angles.add(randomParams(f, defaultParams(f), () => i / ANGLES.length).angle);
  assert.equal(angles.size, ANGLES.length);
});

test('personagem genérico varia etnia e cabelo; cânone e criatura não recebem', () => {
  assert.ok(ETHNICITIES.length >= 15);
  assert.ok(HAIRSTYLES.length >= 40);
  for (const list of [ETHNICITIES, HAIRSTYLES]) assert.equal(new Set(list.map(([en]) => en)).size, list.length);
  const generic = cartas.filter((c) => c.tipo === 'Devotee').map((c) => cardFacts(c, cartas)).filter((f) => f.generic && !f.creature);
  assert.ok(generic.length > 50);
  for (const key of ['ethnicity', 'hair']) {
    const counts = {};
    for (const f of generic) { const v = defaultParams(f)[key]; counts[v] = (counts[v] || 0) + 1; }
    assert.ok(Object.keys(counts).length >= 12, key);
    assert.ok(Math.max(...Object.values(counts)) <= generic.length * 0.2, key);
  }
  const herald = cardFacts(card('poseidon-v6-103'), cartas), p = defaultParams(herald);
  assert.ok(buildImagePrompt(herald, p).includes(`APPEARANCE (mandatory, clearly visible in the face and skin): ${p.ethnicity}. HAIR, visible and not hidden by a helmet: ${p.hair}.`));
  assert.doesNotMatch(promptOf('athena-v6-001'), /APPEARANCE/);
  assert.doesNotMatch(buildImagePrompt(cardFacts(cartas.find((c) => c.nome_exibicao_en === 'MOONLIT WOLF'), cartas), defaultParams(cardFacts(cartas.find((c) => c.nome_exibicao_en === 'MOONLIT WOLF'), cartas))), /APPEARANCE/);
  assert.doesNotMatch(promptOf('poseidon-v6-103').split('NEGATIVE')[0].replace(/APPEARANCE.*\n/, ''), /heritage/);
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
  for (const n of ['PEGASUS SEIYA', 'MERMAID THETIS', 'MERMAID SCALE', 'GALACTIC ILLUSION', 'THE DESTRUCTION OF THE GOLD CLOTHS', 'ATHENA', 'HADES CASTLE']) assert.equal(cardFacts(byName(n), cartas).generic, false, n);
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
