// Artemis V2.0 (autor, 06/11/2026): catálogo, família Glory, tradução e direção de arte dos Anjos Celestes.
// Efeitos na Engine: tools/test-engine-v3-v6-artemis.mjs. node --test tools/test-artemis-v2.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ARMOR_SUBTYPE_NAMES, PATENTES_ARMADURA, formatCardTypeLine, typeTextIsArmor, validateEquipmentSubtypes} from '../shared/equipment-types.js';
import {forceLang, typeWord} from '../shared/card-i18n.js';
import {artemisProfileOf, artemisDirectionLines} from '../card-forge/art-direction/artemis-v2.js';
import {FAMILIES, autoField, newSpec} from '../card-forge/armor-model.js';
import {OBJECT_KINDS} from '../card-forge/art-natures.js';
import {orderFromCard} from '../card-forge/art-taxonomy.js';
import {buildImagePrompt, cardFacts, defaultParams} from '../card-forge/art-prompt.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const {cartas} = read('../data/cards.json');
const byId = id => cartas.find(c => c.id === id);
const ANGELS = ['artemis-v6-431', 'artemis-v6-433', 'artemis-v6-435'], GLORIES = ['artemis-v6-432', 'artemis-v6-434', 'artemis-v6-436'];

test('catálogo: 610 cartas (81 novas em 08/11/2026), ids únicos, 431–436 nas mesmas posições e nenhum id perdido', () => {
  assert.equal(cartas.length, 610);
  assert.equal(new Set(cartas.map(c => c.id)).size, 610);
  const before = JSON.parse(execFileSync('git', ['show', '61db6e8:data/cards.json'], {cwd: new URL('..', import.meta.url), maxBuffer: 64 << 20})).cartas;
  assert.deepEqual(cartas.slice(0, before.length).map(c => c.id), before.map(c => c.id)); // as novas entram no fim
  assert.equal(cartas.filter(c => c.faccao === 'Artemis').length, 111);
});

test('Anjos: nomes novos, subtipo Angel e atributos preservados', () => {
  const want = {'artemis-v6-431': ['THESEUS, CELESTIAL ANGEL', 4, 4, 4], 'artemis-v6-433': ['ICARUS (TOUMA), CELESTIAL ANGEL', 6, 6, 6], 'artemis-v6-435': ['ODYSSEUS, CELESTIAL ANGEL', 5, 5, 4]};
  for (const [id, [name, cost, atk, hp]] of Object.entries(want)) {
    const c = byId(id);
    assert.deepEqual([c.nome_exibicao_en, c.custo, c.power, c.vida, c.tipo], [name, cost, atk, hp, 'Devotee']);
    assert.deepEqual(c.subtipos, ['Angel', 'Celestial Warrior']);
    assert.ok(!c.habilidades_en.join(' ').includes('Satellite'), `${id} sem sinergia de Satellite`);
    assert.ok(c.nome_exibicao_pt && c.habilidades_pt.length === c.habilidades_en.length);
  }
  assert.deepEqual(byId('artemis-v6-433').keywords_en, ['Pierce']);
  assert.deepEqual(byId('artemis-v6-435').keywords_en, ['Long Range']);
});

test('Glories: subtipo Glory, custos 3/4/3, Equip 2, sem patente e sem erro de subtipo', () => {
  const want = {'artemis-v6-432': ["THESEUS' GLORY", 3], 'artemis-v6-434': ["ICARUS' GLORY", 4], 'artemis-v6-436': ["ODYSSEUS' GLORY", 3]};
  for (const [id, [name, cost]] of Object.entries(want)) {
    const c = byId(id);
    assert.deepEqual([c.nome_exibicao_en, c.custo, c.equipar_custo, c.slot_equipamento], [name, cost, 2, 'armadura']);
    assert.deepEqual(c.subtipos, ['Glory']);
    assert.equal(c.patente_armadura, undefined);
    assert.deepEqual(validateEquipmentSubtypes(c).errors, []);
    assert.equal(formatCardTypeLine(c).toUpperCase(), 'EQUIPMENT — GLORY');
  }
});

test('Glory é família de armadura sem progressão de patentes', () => {
  assert.ok(ARMOR_SUBTYPE_NAMES.includes('Glory'));
  assert.equal(PATENTES_ARMADURA.Glory, undefined);
  assert.equal(typeTextIsArmor('Equipment — Glory'), true);
  assert.ok(validateEquipmentSubtypes({tipo: 'Equipment', subtipos: ['Glory'], patente_armadura: 'Divine'}).errors.length, 'Divine não vale para Glory');
});

test('tradução: Glória, Anjo e Guerreiro Celestial; linha de tipo em PT', () => {
  forceLang('pt');
  try {
    assert.equal(typeWord('Glory'), 'Glória');
    assert.equal(typeWord('Angel'), 'Anjo');
    assert.equal(typeWord('Celestial Warrior'), 'Guerreiro Celestial');
    assert.equal(formatCardTypeLine(byId('artemis-v6-432'), typeWord).toUpperCase(), 'EQUIPAMENTO — GLÓRIA');
    assert.equal(formatCardTypeLine(byId('artemis-v6-431'), typeWord).toUpperCase(), 'DEVOTO — ANJO — GUERREIRO CELESTIAL');
  } finally { forceLang(null); }
});

test('Card Forge: perfis Artemis V2 escolhidos pela carta', () => {
  for (const id of ANGELS) assert.equal(artemisProfileOf(byId(id)).id, 'celestial_angel');
  for (const id of GLORIES) assert.equal(artemisProfileOf(byId(id)).id, 'celestial_glory');
  assert.equal(artemisProfileOf(byId('artemis-v6-363')).id, 'black_satellite'); // La Scoumoune
  assert.equal(artemisProfileOf(byId('artemis-v6-361')).id, 'temple_satellite'); // Calisto
  assert.equal(artemisProfileOf(byId('artemis-001')).id, 'artemis_divine');
  assert.equal(artemisProfileOf(byId('athena-v6-001')), null);
  assert.equal(orderFromCard('THESEUS, CELESTIAL ANGEL', ['Angel', 'Celestial Warrior']).id, 'angel_order');
});

test('Card Forge: Angel sem asas obrigatórias; Glory não vira Moonplate', () => {
  for (const id of [...ANGELS, ...GLORIES]) {
    const f = cardFacts(byId(id), cartas), prompt = buildImagePrompt(f, {...defaultParams(f), mode: 'image'});
    const [body, negative] = prompt.split('NEGATIVE PROMPT:');
    assert.ok(!/\bwinged\b/i.test(body), `${id}: sem "winged" no prompt`);
    assert.ok(/feathered wings by default|wings by default/.test(negative), `${id}: asas por padrão vão ao negativo`);
    assert.ok(body.includes('ARTEMIS V2 DIRECTION'), id);
  }
  assert.ok(FAMILIES.some(([v]) => v === 'Glory'));
  assert.ok(OBJECT_KINDS.some(([v]) => v === 'glory'));
  const glory = newSpec({name: "ICARUS' GLORY", faction: 'Artemis', fields: {family: {mode: 'manual', value: 'Glory'}}});
  assert.equal(autoField('family', glory), 'Glory');
  assert.ok(!/forest green/.test(autoField('secondary', glory)), 'Glory não herda o verde da Moonplate');
  assert.ok(artemisDirectionLines(artemisProfileOf(byId('artemis-v6-432'))).join(' ').includes('not a Moonplate'));
});

test('Armor Forge: projetos das três Glories em DRAFT e ligados às cartas', () => {
  const store = read('../card-forge/armor-forge/store.json');
  for (const [pid, glory, angel] of [['theseus-glory', 'artemis-v6-432', 'artemis-v6-431'], ['icarus-glory', 'artemis-v6-434', 'artemis-v6-433'], ['odysseus-glory', 'artemis-v6-436', 'artemis-v6-435']]) {
    const project = store.projects[pid], version = store.versions[project.head_version_id];
    assert.equal(version.status, 'DRAFT');
    assert.equal(version.spec.fields.family.value, 'Glory');
    const bound = Object.values(store.bindings).filter(b => b.project_id === pid).map(b => b.card_id).sort();
    assert.deepEqual(bound, [angel, glory].sort());
  }
});
