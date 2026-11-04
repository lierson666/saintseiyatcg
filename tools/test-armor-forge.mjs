// ARMOR FORGE: especificação, lock e prompts, sem navegador. A tela real é coberta por test-armor-forge-ui.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARAKI_STYLE, MODES, PYTHON_WARPLATE as P, armorForArt, approvalIssues, buildLock, computeDesign, consistencySummary, lockLines, modePrompt, newComponents, newSpec} from '../card-forge/armor-model.js';
import {STYLE_GROUPS, armorChoice, buildDirectorPrompt, buildImagePrompt, cardFacts, defaultParams, restoreEntry, savedEntry} from '../card-forge/art-prompt.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const ISEU = cardFacts(cartas.find((c) => c.id === 'ares-v6-279'), cartas);
const design = computeDesign(P.spec, P.components);
const lock = buildLock(design, ['ref-1', 'ref-2'], '2026-11-04T00:00:00+00:00');
const armorDesign = {name: lock.name, version: 1, status: 'APPROVED', lock, adjustments: '', references: ['a.png', 'b.png']};
const withArmor = (extra = {}) => ({...defaultParams(ISEU), armorSource: 'original', armorUse: true, armorDesign, ...extra});

test('os cinco modos saem separados e os isolados nunca pedem portador', () => {
  const texts = Object.fromEntries(['concept', 'blueprint', 'totem', 'detail'].map((m) => [m, modePrompt(m, design, {focus: 'pauldrons'})]));
  assert.equal(new Set(Object.values(texts)).size, 4);
  for (const text of Object.values(texts)) {
    const [positive, negative] = text.split('\n\nNEGATIVE PROMPT: ');
    assert.match(negative, /model wearing the armor/);
    assert.doesNotMatch(positive, /wearing the armor|worn by/i);
    assert.match(positive, /PYTHON WARPLATE/);
    assert.doesNotMatch(positive, /red fantasy armor/i);
  }
  assert.match(texts.blueprint, /FRONT view, BACK view, LEFT side view, RIGHT side view/);
  assert.match(texts.blueprint, /identical in all views/);
  assert.match(texts.totem, /coiled serpent/);
  assert.match(texts.detail, /close study of pauldrons/);
  assert.match(texts.concept, /empty on a neutral matte armature|self-supporting/);
});

test('todo prompt do criador de armadura sai no traço Araki, sem nome de ilustrador', () => {
  assert.ok(STYLE_GROUPS.Anime.map(([text]) => text).includes(ARAKI_STYLE), 'mesmo texto do estilo Araki do gerador');
  for (const [mode] of MODES) {
    const text = modePrompt(mode, mode === 'equipped' ? lock : design, {card: {name: 'ISEU OF PYTHON'}});
    assert.ok(text.includes(ARAKI_STYLE), mode);
    assert.match(text, /photorealistic render/, mode);
    assert.doesNotMatch(text, /Araki|neutral concept rendering/, mode);
  }
});

test('componente manual, automático e ausente mudam o prompt de forma diferente', () => {
  const rows = newComponents({helmet: {mode: 'manual', value: 'closed visor with a hooked beak'}, mask: {mode: 'absent'}, wings: {mode: 'absent'}});
  const spec = newSpec({name: 'TEST PLATE', faction: 'Ares', fields: {entity: {mode: 'manual', value: 'a stone wyrm'}, silhouette: {mode: 'absent'}}});
  const text = modePrompt('concept', computeDesign(spec, rows));
  assert.match(text, /Helmet: closed visor with a hooked beak\./);
  assert.match(text, /Chest plate: sculpted cuirass[^\n]*a stone wyrm/);
  assert.match(text, /EXPLICITLY ABSENT: Mask, Wings/);
  assert.doesNotMatch(text, /SILHOUETTE:/);
  assert.match(text.split('NEGATIVE PROMPT: ')[1], /mask, wings/);
});

test('aprovar exige nome, silhueta manual e referência com imagem; ficha técnica vira aviso', () => {
  const version = {id: 'v1', spec: newSpec({name: 'X'})}, rows = newComponents({helmet: {mode: 'manual', required: true, value: ''}});
  assert.equal(approvalIssues(version, rows, [], []).blocks.length, 2);
  const ready = {id: 'v1', spec: P.spec}, refs = [{version_id: 'v1', approved: true, image: 'a.png'}];
  const issues = approvalIssues(ready, P.components, refs, []);
  assert.deepEqual(issues.blocks, []);
  assert.match(issues.warnings[0], /ficha técnica/);
});

test('o lock congela o texto: mudar a especificação depois não muda o prompt do lock', () => {
  const before = lockLines(lock).join('\n'), frozen = JSON.stringify(lock);
  P.spec.fields.silhouette.value += ' CHANGED';
  assert.equal(lockLines(lock).join('\n'), before);
  assert.equal(JSON.stringify(lock), frozen);
  assert.match(modePrompt('equipped', lock, {card: {name: 'ISEU OF PYTHON'}, version: 1}), /ARMOR DESIGN LOCK/);
  P.spec.fields.silhouette.value = P.spec.fields.silhouette.value.replace(' CHANGED', '');
  assert.deepEqual(lock.required_components.sort(), ['chest', 'fangs', 'helmet', 'ornaments', 'pauldrons', 'scales', 'spikes']);
});

test('arte de carta: o lock substitui a armadura inventada, e etnia, cabelo e traço seguem iguais', () => {
  const base = defaultParams(ISEU), plain = buildImagePrompt(ISEU, base), armored = buildImagePrompt(ISEU, withArmor());
  assert.match(plain, /brutal blood-red war armor/);
  assert.doesNotMatch(armored, /brutal blood-red war armor/);
  assert.doesNotMatch(armored, /it is not based on any existing character or armor/);
  for (const piece of [`APPEARANCE (mandatory, clearly visible in the face and skin): ${base.ethnicity}.`, `HAIR, visible and not hidden by a helmet: ${base.hair}.`, `EXPRESSION: ${base.expression}.`, `ART STYLE (top priority`, `POSE: ${base.pose}`]) assert.ok(armored.includes(piece), piece);
  for (const piece of [lock.helmet, lock.pauldrons, lock.chest, lock.silhouette, 'ARMOR REFERENCES: 2 approved images']) assert.ok(armored.includes(piece), piece);
  assert.match(armored.split('NEGATIVE PROMPT: ')[1], /redesigned armor/);
});

test('a mesma armadura em outra carta mantém o bloco inteiro do lock', () => {
  const other = cardFacts(cartas.find((c) => c.tipo === 'Devotee' && c.faccao === 'Athena' && c.id !== ISEU.id), cartas);
  const block = (text) => text.slice(text.indexOf('ARMOR DESIGN LOCK'), text.indexOf('ARMOR REFERENCES'));
  const a = buildImagePrompt(ISEU, withArmor()), b = buildImagePrompt(other, {...defaultParams(other), armorSource: 'original', armorUse: true, armorDesign});
  assert.equal(block(a), block(b));
  assert.ok(block(a).length > 400);
});

test('sem armadura escolhida ou desmarcada, o prompt fica como antes', () => {
  const base = defaultParams(ISEU), plain = buildImagePrompt(ISEU, base);
  assert.equal(buildImagePrompt(ISEU, {...base, armorSource: 'original', armorDesign: null}), plain);
  assert.equal(buildImagePrompt(ISEU, {...base, armorSource: 'original', armorUse: false, armorDesign}), plain);
  assert.equal(armorChoice(base), null);
  const none = buildImagePrompt(ISEU, {...base, armorSource: 'none'});
  assert.match(none, /wears no armor at all/);
  assert.doesNotMatch(none, /brutal blood-red war armor/);
});

test('rascunho chega à arte no estado atual, sem lock; arquivada não chega', () => {
  const store = {projects: {p: {id: 'p'}}, components: {c: {version_id: 'd', ...P.components.find((x) => x.key === 'helmet')}}, references: {r: {image: 'a.png'}, s: {id: 's', version_id: 'd', approved: true, image: 's.png'}, t: {id: 't', version_id: 'd', approved: false, image: 't.png'}}, versions: {d: {id: 'd', project_id: 'p', status: 'DRAFT', number: 1, lock: null, spec: P.spec}, a: {id: 'a', project_id: 'p', status: 'APPROVED', number: 2, lock: {name: 'X', reference_ids: ['r']}}, x: {id: 'x', project_id: 'p', status: 'ARCHIVED', number: 3, lock: {name: 'X', reference_ids: []}}}};
  const draft = armorForArt(store, 'p', 'd');
  assert.equal(draft.draft, true);
  assert.deepEqual(draft.references, ['s.png']);
  assert.match(draft.lock.helmet, /serpentine crest/);
  assert.equal(store.versions.d.lock, null);
  assert.equal(armorForArt(store, 'p', 'a').draft, false);
  assert.equal(armorForArt(store, 'p', 'x'), null);
  assert.deepEqual(armorForArt(store, 'p', 'a', 'taller').references, ['a.png']);
  assert.equal(armorForArt(store, 'p', 'a', 'taller').adjustments, 'taller');
});

test('a direção salva guarda só os ids e o legado abre sem campos de armadura', () => {
  const entry = savedEntry(ISEU, withArmor({armorProject: 'p', armorVersion: 'p-v1'}), 'x');
  assert.equal('armorDesign' in entry.params, false);
  assert.equal(entry.params.armorVersion, 'p-v1');
  const legacy = restoreEntry(ISEU, {params: {notes: 'antigo'}});
  assert.equal(legacy.armorSource, 'auto');
  assert.match(buildDirectorPrompt('MASTER', ISEU, withArmor()), /ARMOR DESIGN LOCK/);
});

test('a consistência nunca afirma correspondência sem o autor conferir', () => {
  assert.equal(consistencySummary({}).state, 'UNCHECKED');
  assert.equal(consistencySummary({consistency: {checks: {helmet: 'ok', chest: 'diverge'}}}).state, 'DIVERGENT');
  assert.equal(consistencySummary({consistency: {checks: {helmet: 'ok'}}}).state, 'PARTIAL');
  const all = Object.fromEntries(['silhouette', 'helmet', 'pauldrons', 'chest', 'palette', 'materials', 'ornaments', 'proportions'].map((k) => [k, 'ok']));
  const done = consistencySummary({consistency: {checks: all}});
  assert.equal(done.state, 'REVIEWED');
  assert.doesNotMatch(done.text, /perfeit|idêntic/i);
});

test('regra das mãos: só a falange da base, em toda arte com armadura e fora da natureza divina', () => {
  const armored = buildImagePrompt(ISEU, withArmor());
  assert.match(armored, /only the GAUNTLET RULE overrides it/);
  assert.match(armored, /two outer phalanges stay free/);
  assert.match(armored, /tip phalanx stays free/);
  assert.match(armored, /show bare skin/);
  assert.match(armored, /a dark tone matching the armor/);
  assert.match(armored.split('NEGATIVE PROMPT:')[1], /armored fingertips/);
  const custom = buildImagePrompt(ISEU, withArmor({handFinish: 'mesh', lycraColor: 'navy blue'}));
  assert.match(custom, /fitted mesh/);
  assert.match(custom, /lycra glove in navy blue/);
  assert.match(buildImagePrompt(ISEU, defaultParams(ISEU)), /GAUNTLET RULE/);
  assert.doesNotMatch(buildImagePrompt(ISEU, {...defaultParams(ISEU), armorSource: 'none'}), /GAUNTLET RULE/);
  const godCard = cardFacts(cartas.find((c) => c.tipo === 'God'), cartas);
  assert.doesNotMatch(buildImagePrompt(godCard, defaultParams(godCard)), /GAUNTLET RULE/);
  const plate = cardFacts(cartas.find((c) => c.id === 'ares-v6-280'), cartas);
  assert.match(buildImagePrompt(plate, {...defaultParams(plate), bearer: 'hands'}), /GAUNTLET RULE/);
  assert.doesNotMatch(buildImagePrompt(plate, {...defaultParams(plate), bearer: 'none'}), /GAUNTLET RULE/);
  const noGauntlets = computeDesign(P.spec, P.components.map((c) => (c.key === 'gauntlets' ? {...c, mode: 'absent'} : c)));
  assert.doesNotMatch(buildImagePrompt(ISEU, withArmor({armorDesign: {...armorDesign, lock: buildLock(noGauntlets, [], 'x')}})), /GAUNTLET RULE/);
});
test('regra das mãos no Armor Forge: anéis abertos sem portador; o rascunho nasce certo', () => {
  for (const m of ['concept', 'blueprint', 'detail']) assert.match(modePrompt(m, design, {focus: 'gauntlets'}), /short open ring/);
  assert.doesNotMatch(modePrompt('totem', design), /GAUNTLET RULE/);
  assert.match(modePrompt('equipped', lock, {card: {name: 'ISEU OF PYTHON'}}), /two outer phalanges stay free/);
  assert.doesNotMatch(modePrompt('concept', computeDesign({...P.spec, divine: true}, P.components)), /GAUNTLET RULE/);
  assert.doesNotMatch(design.anatomy.find((x) => x.key === 'gauntlets').text, /plated fingers/);
  const auto = computeDesign(newSpec({name: 'X', faction: 'Ares'}), newComponents());
  assert.match(auto.anatomy.find((x) => x.key === 'gauntlets').text, /base phalanx/);
});

test('área do rosto: regra máxima no topo do prompt, com zoom out e sem corte', () => {
  const lines = buildImagePrompt(ISEU, defaultParams(ISEU)).split('\n');
  assert.match(lines[1], /FACE ZONE, MAXIMUM PRIORITY/);
  assert.match(lines[1], /from 13% to 45% of the image height measured from the top, and from 14% to 85%/);
  assert.match(lines[1], /Zoom out as far as needed/);
  assert.match(lines.at(-1), /cropped head/);
  const plate = cardFacts(cartas.find((c) => c.id === 'ares-v6-282'), cartas);
  assert.match(buildImagePrompt(plate, {...defaultParams(plate), presentation: 'mounted'}), /FACE ZONE[^\n]*the entire helmet of the empty armor/);
  assert.match(modePrompt('concept', design), /the entire helmet of the armor stays inside/);
  assert.match(modePrompt('equipped', lock, {card: {name: 'ISEU OF PYTHON'}}), /FACE ZONE/);
  assert.doesNotMatch(modePrompt('blueprint', design), /FACE ZONE/);
});
