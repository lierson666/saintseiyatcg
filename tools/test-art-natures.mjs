// Natureza da arte: cada modo gera o próprio prompt, com zero personagens quando pedido, sem contradição e sem tocar na carta.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DIVINE_LANGUAGE, NATURES, PRESENTATIONS, EFFECTS, SCENE_TYPES, VISIBLE, classificationRow, classifyFacts} from '../card-forge/art-natures.js';
import {buildImagePrompt, cardFacts, defaultParams, natureOf, promptWarnings, randomParams, resolveCast, restoreEntry, savedEntry} from '../card-forge/art-prompt.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const byName = (name) => cartas.find((c) => c.nome_exibicao_en === name) || assert.fail(`sem carta ${name}`);
const build = (name, extra = {}) => {
  const f = cardFacts(byName(name), cartas), p = {...defaultParams(f), ...extra}, text = buildImagePrompt(f, p);
  return {f, p, text, positive: text.split('\n\nNEGATIVE PROMPT: ')[0], negative: text.split('NEGATIVE PROMPT: ')[1], c: resolveCast(f, p)};
};
const HUMAN = /FACE PLACEMENT|five fingers|APPEARANCE|HAIR,|POSE:|EXPRESSION/;
const SACRIFICE = 'CASSIOS’S SACRIFICE', ARROW = 'THE GOLDEN ARROW', COFFIN = 'FREEZING COFFIN', CLOTH = 'PEGASUS CLOTH V2', CRACKED = 'CRACKED WARPLATE', TRIDENT = "POSEIDON'S TRIDENT", SANCTUARY = 'THE UNDERSEA SANCTUARY', WATCHER = 'ABYSSAL WATCHER';
const seq = (seed = 1) => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };

test('as contagens do catálogo batem e o tipo mecânico não decide sozinho', () => {
  const tally = cartas.reduce((all, c) => ({...all, [c.tipo]: (all[c.tipo] || 0) + 1}), {});
  assert.equal(cartas.length, tally.Devotee + tally.Spell + tally.Equipment + tally.Domain + tally.God);
  assert.equal(NATURES.length, 7);
  assert.equal(SCENE_TYPES.length, 36);
  assert.equal(EFFECTS.length, 41);
  assert.equal(PRESENTATIONS.length, 22);
  assert.equal(classifyFacts(cardFacts(byName('THE TRAINING OF PEGASUS'), cartas)).nature, 'scene');
  assert.equal(classifyFacts(cardFacts(byName(COFFIN), cartas)).nature, 'technique');
});

test('1: Moment sem personagens não inventa ninguém', () => {
  const {positive, negative, c} = build(SACRIFICE, {count: '0', sceneType: 'sacrifice'});
  assert.equal(c.active, false);
  assert.match(positive, /No people appear in the image/);
  assert.match(positive, /SCENE: a sacrifice, the decisive instant/);
  assert.doesNotMatch(positive, HUMAN);
  assert.match(negative, /people, human figures, faces, characters in the background/);
});

test('2: Moment com três personagens tem formação e não bane gente', () => {
  const {positive, negative} = build(SACRIFICE, {count: '3', person: '', sceneFocus: 'interaction'});
  assert.match(positive, /FORMATION: Three /);
  assert.match(positive, /7\/10 RULE \(protagonist or main face only\)/);
  assert.doesNotMatch(negative, /human figures|people,/);
});

test('3: Moment representado por objeto', () => {
  const {positive, c, negative} = build(ARROW);
  assert.equal(c.active, false);
  assert.match(positive, /MAIN VISUAL ELEMENT: the object named by the card/);
  assert.match(positive, /FOCAL POINT: the object named by the card/);
  assert.match(negative, /people/);
});

test('4 a 7: Technique com zero, conjurador, alvo e vários', () => {
  const none = build(COFFIN);
  assert.equal(none.c.n, 0);
  assert.match(none.positive, /EFFECT: absolute freezing/);
  assert.match(none.positive, /No caster, no target and no people/);
  assert.doesNotMatch(none.positive, HUMAN);
  const caster = build('SHIRYU’S LAST DRAGON', {visible: 'caster', person: 'SHIRYU'});
  assert.match(caster.positive, /SUBJECT: SHIRYU/);
  assert.match(caster.positive, /VISIBLE FIGURES: only the caster/);
  assert.match(caster.positive, /five fingers/);
  const target = build(COFFIN, {visible: 'target', person: 'HYOGA'});
  assert.match(target.positive, /VISIBLE FIGURES: only the target/);
  assert.doesNotMatch(target.positive, /SUBJECT: HYOGA/);
  const many = build(COFFIN, {visible: 'casters', count: '5', person: ''});
  assert.equal(many.c.n, 5);
  assert.match(many.positive, /FORMATION: Five /);
  assert.doesNotMatch(many.positive, /Exactly one figure/);
  const hands = build(COFFIN, {origin: 'hands'});
  assert.doesNotMatch(hands.positive, /ORIGIN: the hands/);
  assert.equal(promptWarnings(hands.f, hands.p)[0].action, 'addcaster');
  assert.equal(VISIBLE.length, 8);
});

test('8 a 12: Equipment isolado, equipado, quebrado, Object Form e Cloth Box', () => {
  const alone = build(TRIDENT);
  assert.match(alone.positive, /alone as a sacred object, with no wearer/);
  assert.doesNotMatch(alone.positive, HUMAN);
  assert.match(alone.negative, /wearer, mannequin, hands/);
  const worn = build(CLOTH, {presentation: 'worn', person: 'PEGASUS SEIYA'});
  assert.match(worn.positive, /SUBJECT: PEGASUS SEIYA, wearing PEGASUS CLOTH V2/);
  assert.match(worn.positive, /the object stays the main subject/);
  assert.doesNotMatch(worn.negative, /wearer|mannequin/);
  const cracked = build(CRACKED);
  assert.equal(cracked.p.equipState, 'cracked');
  assert.match(cracked.positive, /cracked, the cracks clearly visible/);
  assert.doesNotMatch(cracked.negative, /unintended damage/);
  assert.match(build(CLOTH, {presentation: 'object_form'}).positive, /object form, the totem shape/);
  assert.match(build(CLOTH, {presentation: 'box_open'}).positive, /open Cloth Box/);
  const held = build(TRIDENT, {presentation: 'held', bearer: 'none'});
  assert.match(held.positive, /floating in the air/);
  assert.equal(promptWarnings(held.f, held.p)[0].action, 'addbearer');
  const hands = build(TRIDENT, {presentation: 'held'});
  assert.match(hands.positive, /only the hands holding it/);
  assert.match(hands.positive, /exactly five fingers/);
  assert.doesNotMatch(hands.negative, /\bhands\b.*mannequin|mannequin, hands/);
  const clash = build(TRIDENT, {presentation: 'alone', bearer: 'full'});
  assert.equal(promptWarnings(clash.f, clash.p)[0].action, 'nobearer');
});

test('13 a 15: Domain vazio, com dez guardas e com exército', () => {
  const empty = build(SANCTUARY);
  assert.equal(empty.c.active, false);
  assert.match(empty.positive, /with no characters/);
  assert.match(empty.positive, /FOCAL POINT: the structure or landscape/);
  assert.doesNotMatch(empty.positive, HUMAN);
  const ten = build(SANCTUARY, {count: '10', order: 'ocean_temple_guard', formation: 'temple_guard'});
  assert.match(ten.positive, /FORMATION: Ten Ocean Temple Guards standing/);
  assert.match(ten.positive, /small against it/);
  assert.doesNotMatch(ten.negative, /human figures/);
  assert.doesNotMatch(ten.positive, /with no characters|POSE:/);
  const army = build(SANCTUARY, {count: '50', order: 'marina'});
  assert.match(army.positive, /about 50 Marinas/);
  assert.doesNotMatch(army.text, /Exactly one figure|extra characters|, crowd/);
});

test('16 e 17: deus em forma física e em manifestação abstrata', () => {
  const body = build('ATHENA');
  assert.equal(natureOf(body.f, body.p), 'divine');
  assert.match(body.positive, /SUBJECT: ATHENA.*Match the attached/);
  assert.match(body.positive, /FACE PLACEMENT/);
  assert.match(body.positive, new RegExp(DIVINE_LANGUAGE.Athena));
  const energy = build('HADES', {manifestation: 'energy', divineScale: 'cosmic'});
  assert.match(energy.positive, /HADES, manifested as energy without a body/);
  assert.doesNotMatch(energy.positive, HUMAN);
  assert.doesNotMatch(energy.positive, /REFERENCES/);
  assert.match(energy.negative, /human body/);
  assert.match(build('ARES', {manifestation: 'symbol'}).positive, /Do not present any invented symbol as an official emblem/);
});

test('18 e 19: monstro e exército seguem certos no modo Character', () => {
  const monster = build(WATCHER);
  assert.equal(monster.c.nature, 'character');
  assert.doesNotMatch(monster.positive, HUMAN);
  const army = build('MARINA SPEARMAN', {count: '50'});
  assert.doesNotMatch(army.negative, /extra characters|\bcrowd\b/);
  assert.doesNotMatch(army.positive, /Exactly one figure/);
});

test('natureza escolhida vence o tipo mecânico', () => {
  const asCharacter = build(CLOTH, {nature: 'character', generic: true});
  assert.equal(asCharacter.c.active, true);
  assert.match(asCharacter.positive, /an original character/);
  const moment = build(ARROW, {nature: 'equipment'});
  assert.match(moment.positive, /OBJECT:/);
  const scene = build(CLOTH, {nature: 'scene', count: '0'});
  assert.match(scene.positive, /SCENE:/);
  const god = build(SANCTUARY, {nature: 'divine', manifestation: 'vision'});
  assert.match(god.positive, /DIVINE MANIFESTATION/);
});

test('papel do personagem entra só em arte com personagem, e silhueta dispensa rosto', () => {
  const guard = build('MARINA SPEARMAN', {role: 'guardian'});
  assert.match(guard.positive, /CHARACTER ROLE \(visual only\): a guardian/);
  const far = build('MARINA SPEARMAN', {role: 'distant'});
  assert.doesNotMatch(far.positive, /FACE PLACEMENT|EXPRESSION/);
  assert.doesNotMatch(build(COFFIN, {role: 'guardian'}).positive, /CHARACTER ROLE/);
});

test('20: Randomizar respeita a natureza e a identidade', () => {
  const rand = seq(5);
  const eq = build(CRACKED);
  for (let i = 0; i < 30; i++) {
    const r = randomParams(eq.f, eq.p, rand);
    assert.equal(r.equipState, 'cracked');
    assert.equal(r.objectKind, eq.p.objectKind);
    assert.equal(natureOf(eq.f, r), 'equipment');
    assert.ok(!PRESENTATIONS.find(([id]) => id === r.presentation)[3], r.presentation);
    assert.doesNotMatch(buildImagePrompt(eq.f, r).split('\n\n')[0], HUMAN);
  }
  const tec = build(COFFIN);
  for (let i = 0; i < 30; i++) {
    const r = randomParams(tec.f, tec.p, rand);
    assert.equal(r.effect, 'freeze');
    assert.equal(r.visible, 'none');
    assert.ok(!['body', 'hands', 'eyes'].includes(r.origin), r.origin);
  }
  const sc = build(SACRIFICE, {count: '0'});
  for (let i = 0; i < 30; i++) {
    const r = randomParams(sc.f, sc.p, rand);
    assert.equal(r.count, '0');
    assert.equal(r.sceneType, sc.p.sceneType);
    assert.ok(!['character', 'interaction'].includes(r.sceneFocus));
  }
  const dom = build(SANCTUARY);
  const r = randomParams(dom.f, dom.p, rand);
  assert.equal(r.envType, dom.p.envType);
  assert.equal(r.count, '0');
  assert.ok(r.weather);
  const god = build('ARTEMIS');
  const gods = new Set(Array.from({length: 40}, () => randomParams(god.f, god.p, rand).manifestation));
  assert.ok(gods.size > 5);
  assert.equal(randomParams(god.f, god.p, rand).god, 'Artemis');
});

test('21 e 22: dados V2 e presets sem natureza geram o prompt antigo', () => {
  const f = cardFacts(byName(COFFIN), cartas), p = defaultParams(f), old = {...p};
  delete old.nature;
  assert.equal(natureOf(f, old), 'legacy');
  assert.match(buildImagePrompt(f, old), /TECHNIQUE IN USE: FREEZING COFFIN/);
  assert.doesNotMatch(buildImagePrompt(f, old), /EFFECT:/);
  const eq = cardFacts(byName(TRIDENT), cartas), oldEq = {...defaultParams(eq)};
  delete oldEq.nature;
  assert.match(buildImagePrompt(eq, oldEq), /alone as a sacred object/);
  const dev = cardFacts(byName('PEGASUS SEIYA'), cartas), auto = defaultParams(dev), legacy = {...auto};
  delete legacy.nature;
  assert.equal(buildImagePrompt(dev, legacy), buildImagePrompt(dev, auto));
});

test('nenhuma carta em nenhuma natureza gera contradição', () => {
  const natures = NATURES.map(([id]) => id);
  for (const card of cartas) for (const nature of natures) for (const count of ['0', '1', '50']) {
    const f = cardFacts(card, cartas), p = {...defaultParams(f), nature, count}, text = buildImagePrompt(f, p), c = resolveCast(f, p);
    const [positive, negative] = text.split('\n\nNEGATIVE PROMPT: ');
    const tag = `${card.id} ${nature} ${count}`;
    assert.doesNotMatch(text, /undefined|\bnull\b|\[object|\bfalse\b/, tag);
    assert.ok(negative, tag);
    if (c.group) assert.doesNotMatch(text, /Exactly one figure|extra characters/, tag);
    if (!c.active) assert.doesNotMatch(positive, /FACE PLACEMENT|ANATOMY|APPEARANCE|POSE:/, tag);
    if (c.active) assert.doesNotMatch(negative, /human figures, faces/, tag);
    if (c.active && !c.profile.hands) assert.doesNotMatch(positive, /ANATOMY.*five fingers/, tag);
  }
});

test('observação pedindo gente em arte vazia é avisada e fica fora', () => {
  const x = build(COFFIN, {notes: 'Um guerreiro ao fundo. Muito gelo.'});
  assert.doesNotMatch(x.positive, /guerreiro/);
  assert.match(x.positive, /Muito gelo/);
  assert.equal(promptWarnings(x.f, x.p)[0].action, 'addcaster');
  assert.match(build(COFFIN, {visible: 'caster', notes: 'Um guerreiro ao fundo.'}).positive, /guerreiro/);
  assert.match(build(COFFIN, {notes: 'sem personagem nenhum'}).positive, /sem personagem nenhum/);
});

test('25: classificação fica separada e cobre o catálogo', () => {
  const before = JSON.stringify(cartas);
  const rows = cartas.map((c) => classificationRow(c.id, cardFacts(c, cartas), c.tipo));
  assert.equal(new Set(rows.map((r) => r.id)).size, cartas.length);
  for (const r of rows) {
    assert.ok(['character', 'scene', 'technique', 'equipment', 'domain', 'divine'].includes(r.natureza_sugerida), r.id);
    assert.ok(['alta', 'media', 'baixa'].includes(r.confianca), r.id);
    assert.ok(r.justificativa, r.id);
    assert.equal(r.status_revisao, 'pendente', r.id);
    assert.ok(!('custo' in r) && !('caminho_imagem' in r) && !('habilidades_en' in r), r.id);
  }
  assert.equal(JSON.stringify(cartas), before);
});

// Fluxo real: escolhe, edita o prompt, grava pela camada do servidor, reabre e continua igual.
const python = (code, input) => {
  const out = spawnSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'card-forge'); import art_direction as a\n${code}`], {cwd: new URL('..', import.meta.url), input: JSON.stringify(input), encoding: 'utf8'});
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
};
const SAVE = `
payload = json.load(sys.stdin)
store = payload["store"]
result = []
for request in payload["requests"]:
    try:
        a.apply(store, request, set(payload["ids"]), now="2026-11-02T00:00:00+00:00")
        result.append("ok")
    except a.Conflict:
        result.append("conflict")
    except ValueError as error:
        result.append(str(error))
print(json.dumps({"store": store, "result": result}))
`;

test('23, 24 e integração: salvar, reabrir, variantes por card_id e aprovação protegida', () => {
  const f = cardFacts(byName(COFFIN), cartas), p = {...defaultParams(f), phase: 'impact', notes: 'Muito gelo'};
  const edited = `${buildImagePrompt(f, p)}\nEXTRA EDIT`;
  const entry = savedEntry(f, p, edited);
  const manga = savedEntry(f, {...p, phase: 'fade'}, 'prompt manga');
  const id = byName(COFFIN).id;
  const run = (requests, store = {versao: 1, cartas: {}}) => JSON.parse(python(SAVE, {store, ids: cartas.map((c) => c.id), requests}));
  const first = run([{card_id: id, variant: 'default', entry, approve: true}, {card_id: id, variant: 'manga', entry: manga}, {card_id: id, review: {status: 'aceita'}}]);
  assert.deepEqual(first.result, ['ok', 'ok', 'ok']);
  const card = first.store.cartas[id];
  assert.equal(card.variants.default.approved, true);
  assert.equal(card.variants.manga.approved, false);
  assert.equal(card.review.status, 'aceita');
  const reopened = restoreEntry(f, JSON.parse(JSON.stringify(card.variants.default)));
  assert.equal(reopened.phase, 'impact');
  assert.equal(buildImagePrompt(f, reopened), buildImagePrompt(f, p));
  assert.equal(card.variants.default.prompt, edited);
  assert.equal(restoreEntry(f, card.variants.manga).phase, 'fade');
  const blocked = run([{card_id: id, variant: 'default', entry: manga}], first.store);
  assert.deepEqual(blocked.result, ['conflict']);
  assert.equal(blocked.store.cartas[id].variants.default.prompt, edited);
  const replaced = run([{card_id: id, variant: 'default', entry: manga, replace_approved: true}], first.store);
  assert.deepEqual(replaced.result, ['ok']);
  assert.equal(replaced.store.cartas[id].variants.default.approved, false);
  const bad = run([{card_id: 'nao-existe', variant: 'default', entry}, {card_id: id, variant: 'colecao', entry}, {card_id: id, variant: 'default', entry: {caminho_imagem: 'x.webp'}, replace_approved: true}, {card_id: id, review: {status: 'publicada'}}], first.store);
  assert.ok(bad.result.every((r) => r !== 'ok'), JSON.stringify(bad.result));
  assert.ok(!('caminho_imagem' in bad.store.cartas[id].variants.default));
});

test('23: a camada de direção nunca grava no catálogo nem em arte', () => {
  const source = readFileSync(new URL('../card-forge/art_direction.py', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /write_text|atomic_write\(CARDS/);
  assert.match(source, /atomic_write\(STORE/);
  const tmp = mkdtempSync(join(tmpdir(), 'art-'));
  const out = python(`print(json.dumps(a.load(sys.argv[0] if False else ${JSON.stringify(join(tmp, 'nada.json'))})))`, {});
  assert.deepEqual(JSON.parse(out), {versao: 1, cartas: {}});
});
