// Sistema de personagens e criaturas do gerador de arte: anatomia, quantidade, formação, negative e compatibilidade.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FORMATIONS, CREATURES, ORDERS, COUNTS, VARIETIES, LEADS} from '../card-forge/art-taxonomy.js';
import {SHOTS, THEMES, buildImagePrompt, cardFacts, defaultParams, promptWarnings, randomParams, resolveCast, suggestShot} from '../card-forge/art-prompt.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const byName = (name) => cartas.find((c) => c.nome_exibicao_en === name);
const build = (name, extra = {}) => {
  const f = cardFacts(byName(name), cartas), p = {...defaultParams(f), ...extra};
  return {f, p, text: buildImagePrompt(f, p), negative: buildImagePrompt(f, p).split('NEGATIVE PROMPT: ')[1], c: resolveCast(f, p)};
};
const fake = (nome, faccao, subtipos = []) => ({id: nome, nome_exibicao_en: nome, tipo: 'Moment', faccao, subtipos, raridade: 'Legendary', habilidades_en: []});
const buildFake = (card, extra) => { const f = cardFacts(card, cartas), p = {...defaultParams(f), ...extra}; return {f, p, text: buildImagePrompt(f, p), negative: buildImagePrompt(f, p).split('NEGATIVE PROMPT: ')[1]}; };
const OCEAN = new Set(THEMES.filter(([, pt]) => pt.startsWith('Poseidon: ')).map(([en]) => en));
const SPEARMAN = 'MARINA SPEARMAN', GUARD = 'OCEAN TEMPLE GUARD', WATCHER = 'ABYSSAL WATCHER';
const SINGLE_ONLY = /exactly one figure|no extra characters|no other characters|\bextra characters\b|\bcrowd\b(?! shot)|multiple figures/i;
const HUMAN_TERMS = /five fingers|APPEARANCE|HAIR,|Human face|EXPRESSION:/;

test('a taxonomia tem os 60 tipos com id estável, separados da mecânica', () => {
  assert.equal(CREATURES.length, 60);
  assert.equal(new Set(CREATURES.map((c) => c.id)).size, 60);
  assert.equal(FORMATIONS.length, 29);
  assert.equal(COUNTS.length, 14);
  assert.equal(VARIETIES.length, 6);
  assert.equal(LEADS.length, 4);
  assert.ok(ORDERS.length >= 33);
  for (const o of ORDERS) if (o.source === 'original') assert.doesNotMatch(o.en, /canon|official/i, o.id);
  for (const shot of ['Extreme Wide Shot', 'Army Shot', 'Massive Crowd Shot', 'Aerial Formation Shot', 'Underwater Formation Shot', 'Battlefield Panorama', 'Establishing Shot', 'Creature Scale Shot', 'Silhouette Army Shot', 'Temple Defense Shot']) assert.ok(SHOTS.some(([en]) => en === shot), shot);
});

test('1: humano individual mantém o prompt de sempre', () => {
  const {text, negative} = build('PEGASUS SEIYA');
  assert.match(text, /7\/10 of the image height/);
  assert.match(text, /exactly five fingers/);
  assert.match(negative, /extra fingers/);
  assert.doesNotMatch(text, /CREATURE MORPHOLOGY|GROUP VARIATION|FORMATION:/);
});

test('2: três humanos nadando não pedem figura única', () => {
  const {text, negative} = build(SPEARMAN, {count: '3', formation: 'swimming', creature: 'human'});
  assert.match(text, /exactly three distinct Marinas/);
  assert.match(text, /FORMATION: Three Marinas swimming together/);
  assert.doesNotMatch(text, SINGLE_ONLY);
  assert.match(negative, /beyond the requested count/);
  assert.equal(suggestShot(3, 'swimming'), 'Wide Shot (WS)');
});

test('3: dez em formação geram instrução de composição real', () => {
  const {text} = build(GUARD, {count: '10', formation: 'temple_guard', variety: 'same_class'});
  assert.match(text, /FORMATION: Ten Ocean Temple Guards standing in disciplined defensive formation before the sacred pillars of Poseidon's underwater temple\./);
  assert.match(text, /original order created for this game/);
  assert.doesNotMatch(text, SINGLE_ONLY);
  assert.equal(suggestShot(10, 'temple_guard'), 'Wide Group Shot');
});

test('4 e 19: cinquenta Specters viram exército, sem regra de rosto', () => {
  const {text, negative} = buildFake(fake('HADES ARMY', 'Hades'), {count: '50', order: 'specter', formation: 'march', variety: 'different', shot: 'Extreme Wide Shot', god: 'Hades'});
  assert.match(text, /about 50 Specters/);
  assert.match(text, /SCALE AND READING: .*silhouettes/);
  assert.doesNotMatch(text, /FACE PLACEMENT|EXPRESSION|APPEARANCE/);
  assert.match(text, /point of greatest attention sits at about 7\/10/);
  assert.doesNotMatch(text, SINGLE_ONLY);
  assert.match(negative, /merged silhouettes/);
  assert.match(negative, /repeated identical faces/);
  assert.equal(suggestShot(50, 'march'), 'Extreme Wide Shot');
  assert.equal(suggestShot(100, ''), 'Massive Army Shot');
  const crowd = buildFake(fake('HADES ARMY', 'Hades'), {count: '100', order: 'specter'}).text;
  assert.match(crowd, /more than a hundred Specters.*no attempt at a precise count/);
});

test('5: monstro abissal não é humano nem traz humano na frente', () => {
  const {text, negative, c} = build(WATCHER);
  assert.equal(c.creature.id, 'abyssal_monster');
  assert.match(text, /tentacles/);
  assert.match(text, /not a human in armor/);
  assert.match(text, /FOCAL POINT: the head, the eyes/);
  assert.doesNotMatch(text, HUMAN_TERMS);
  assert.match(negative, /human warrior in armor/);
  assert.doesNotMatch(negative, /extra limbs|extra fingers/);
});

test('6: Kraken, 7: ave e 8: dragão têm a anatomia do próprio corpo', () => {
  const kraken = build(WATCHER, {creature: 'kraken'}), bird = build('MOONLIT WOLF', {creature: 'raptor'}), dragon = build('MOONLIT WOLF', {creature: 'dragon'});
  assert.match(kraken.text, /suckers/);
  assert.match(bird.text, /two wings, a beak, feathers, talons/);
  assert.match(dragon.text, /scales, a long tail/);
  for (const x of [kraken, bird, dragon]) { assert.doesNotMatch(x.text, HUMAN_TERMS); assert.doesNotMatch(x.negative, /extra limbs|fingers/); }
});

test('9: centauro tem tronco humano, quatro patas e os dedos dos braços', () => {
  const {text} = build(SPEARMAN, {creature: 'centaur'});
  assert.match(text, /centaur anatomy: human torso.*four legs and hooves/);
  assert.match(text, /five fingers/);
});

test('10: construto é inorgânico, sem pele nem dedos humanos', () => {
  const {text, negative} = build(GUARD, {creature: 'golem'});
  assert.match(text, /mechanical or stone joints/);
  assert.doesNotMatch(text, HUMAN_TERMS);
  assert.match(negative, /skin, human face/);
});

test('11: híbrida usa campos humanos e não humanos', () => {
  const {text} = build(SPEARMAN, {creature: 'mutant', traits: 'one arm turned into a claw'});
  assert.match(text, /hybrid body/);
  assert.match(text, /APPEARANCE/);
  assert.match(text, /SPECIAL FEATURES: one arm turned into a claw/);
  assert.doesNotMatch(text, /five fingers/);
});

test('12: grupo de espécies diferentes não proíbe nenhum corpo', () => {
  const {text, negative} = buildFake(fake('ARTEMIS HUNT', 'Artemis'), {count: '8', order: 'huntress', variety: 'mixed', formation: 'hunting', god: 'Artemis'});
  assert.match(text, /exactly eight figures of mixed species: huntresses and mythological creatures/);
  assert.match(text, /each species keeps its own coherent anatomy/);
  assert.doesNotMatch(negative, /human face|human skin/);
  assert.doesNotMatch(text, SINGLE_ONLY);
});

const seq = (seed = 1) => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
test('13: randomizar humano mantém humano e sorteia aparência', () => {
  const f = cardFacts(byName(SPEARMAN), cartas), p = defaultParams(f), rand = seq(), seen = new Set();
  for (let i = 0; i < 40; i++) {
    const r = randomParams(f, p, rand);
    seen.add(r.ethnicity);
    assert.equal(resolveCast(f, r).creature.id, 'human');
    assert.equal(r.count, p.count);
  }
  assert.ok(seen.size > 5);
});

test('14 e 13: randomizar monstro nunca vira humano; escopos só mexem no próprio grupo de campos', () => {
  const f = cardFacts(byName(WATCHER), cartas), p = defaultParams(f), rand = seq(7);
  for (let i = 0; i < 40; i++) {
    const r = randomParams(f, p, rand), text = buildImagePrompt(f, r);
    assert.equal(resolveCast(f, r).creature.id, 'abyssal_monster');
    assert.equal(r.ethnicity, p.ethnicity);
    assert.equal(r.hair, p.hair);
    assert.doesNotMatch(text, HUMAN_TERMS);
    assert.ok(OCEAN.has(r.theme), r.theme);
  }
  const group = {...p, count: '10', formation: 'patrol'};
  const camera = randomParams(f, group, rand, 'camera');
  assert.equal(camera.formation, 'patrol');
  assert.equal(camera.style, group.style);
  const only = randomParams(f, group, rand, 'group');
  assert.equal(only.shot, group.shot);
  assert.equal(only.count, '10');
  const look = randomParams(f, p, rand, 'appearance');
  assert.equal(look.angle, p.angle);
  assert.equal(look.creature, p.creature);
  for (let i = 0; i < 60; i++) {
    const big = randomParams(f, {...p, count: '50'}, rand);
    assert.ok(!/Close-Up|Bust|Portrait/.test(big.shot), big.shot);
    assert.notEqual(big.formation, 'triangle');
  }
});

test('15: preset antigo sem os campos novos segue como legado', () => {
  const f = cardFacts(byName('PEGASUS SEIYA'), cartas), full = defaultParams(f), old = {...full};
  for (const key of ['creature', 'creatureCustom', 'species', 'order', 'orderCustom', 'count', 'countCustom', 'formation', 'formationCustom', 'variety', 'lead', 'traits', 'special', 'creaturePose', 'creatureMood', 'shotManual', 'scope']) delete old[key];
  assert.equal(buildImagePrompt(f, old), buildImagePrompt(f, full));
  const g = cardFacts(byName(SPEARMAN), cartas), gOld = {...defaultParams(g)};
  for (const key of ['creature', 'count', 'variety', 'lead']) delete gOld[key];
  assert.doesNotThrow(() => randomParams(g, gOld));
  assert.match(buildImagePrompt(g, gOld), /Exactly one figure/);
});

test('16: negative muda com o caso e nunca contradiz', () => {
  assert.match(build(SPEARMAN).negative, /extra characters, crowd/);
  assert.doesNotMatch(build(SPEARMAN, {count: '3'}).negative, /extra characters|\bcrowd\b/);
  assert.doesNotMatch(build(SPEARMAN, {count: '50'}).negative, /extra characters|\bcrowd\b/);
  assert.doesNotMatch(build(SPEARMAN, {count: '3', variety: 'identical'}).negative, /identical faces/);
  for (const creature of CREATURES) for (const count of ['1', '3', '50']) {
    const {text, negative} = build(GUARD, {creature: creature.id, count});
    assert.doesNotMatch(text, /undefined|null|\[object/, creature.id);
    if (count !== '1') assert.doesNotMatch(text, /exactly one figure|no extra characters/i, creature.id);
    if (!/human|divine|winged|centaur|merfolk/.test(creature.profile)) assert.doesNotMatch(text, /five fingers/, creature.id);
    if (['human', 'divine', 'winged'].includes(creature.profile)) assert.doesNotMatch(negative, /human face|human skin/, creature.id);
  }
});

test('17: etnia e cabelo somem do prompt sem apagar o valor guardado', () => {
  const human = build(SPEARMAN), monster = build(SPEARMAN, {creature: 'dragon'}), bird = build(SPEARMAN, {creature: 'bird', traits: 'iridescent plumage'});
  assert.match(human.text, new RegExp(`APPEARANCE .*${human.p.ethnicity.slice(0, 20)}`));
  assert.doesNotMatch(monster.text, /APPEARANCE|HAIR,/);
  assert.equal(monster.p.ethnicity, human.p.ethnicity);
  assert.match(bird.text, /SPECIAL FEATURES: iridescent plumage/);
  assert.doesNotMatch(bird.text, /HAIR,/);
});

test('18: em grupo a regra do rosto vale só para o protagonista', () => {
  const moderate = build(GUARD, {count: '4'}).text, collective = build(GUARD, {count: '4', lead: 'collective'}).text;
  assert.match(moderate, /7\/10 RULE \(protagonist or main face only\)/);
  assert.match(moderate, /PROTAGONIST POSE/);
  assert.match(collective, /GROUP READING/);
  assert.doesNotMatch(collective, /FACE PLACEMENT|POSE:/);
  assert.match(collective, /GROUP READING: .*7\/10/);
  assert.match(build(SPEARMAN, {count: '3', variety: 'leader_uniform'}).text, /one protagonist dominates/);
});

test('20: nada do que o gerador faz mexe nos dados da carta', () => {
  const before = JSON.stringify(cartas);
  for (const card of cartas) {
    const f = cardFacts(card, cartas), p = defaultParams(f);
    buildImagePrompt(f, {...p, count: '10', creature: 'kraken'});
    buildImagePrompt(f, randomParams(f, p, seq(3)));
  }
  assert.equal(JSON.stringify(cartas), before);
});

test('Equipment e Domain continuam sem elenco; Moment só ganha se o autor pedir', () => {
  const eq = cartas.find((c) => c.tipo === 'Equipment'), f = cardFacts(eq, cartas), p = defaultParams(f);
  assert.equal(resolveCast(f, {...p, count: '10', creature: 'dragon'}).active, resolveCast(f, p).active);
  assert.doesNotMatch(buildImagePrompt(f, {...p, count: '10'}), /FORMATION:|GROUP VARIATION/);
});

test('observação contra a regra técnica é avisada e fica fora; a compatível entra', () => {
  const clash = build(GUARD, {notes: 'Nuvens pesadas ao fundo. Coloque o texto do título em cima.'});
  assert.match(clash.text, /Nuvens pesadas ao fundo\./);
  assert.doesNotMatch(clash.text, /texto do título/);
  const w = promptWarnings(clash.f, clash.p);
  assert.equal(w[0].action, 'fixnotes');
  assert.deepEqual(promptWarnings(clash.f, {...clash.p, notes: 'Sem texto na imagem'}), []);
  assert.match(build(GUARD, {notes: 'Sem texto na imagem'}).text, /Sem texto na imagem/);
  assert.equal(promptWarnings(clash.f, {...clash.p, notes: 'só um, sozinho', count: '5'})[0].action, 'solo');
  assert.equal(promptWarnings(clash.f, {...clash.p, notes: '', count: '50', shot: 'Close-Up (CU)'})[0].action, 'shot');
});
