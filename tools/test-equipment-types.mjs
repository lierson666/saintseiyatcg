// Equipment System V1: tipos, grupos, validação e impressão.
// node --test tools/test-equipment-types.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARMOR_FAMILY, PATENTES_ARMADURA, patentesDe, ARMOR_FAMILY_NAMES, belongsToEquipmentGroup, formatCardTypeLine, getCardTypes, hasAnySubtype, hasSubtype, normalizeSubtypes, toggleSubtype, typeTextIsArmor, validateEquipmentSubtypes} from '../shared/equipment-types.js';

const eq = (...subtipos) => ({tipo: 'Equipment', subtipos});
const line = c => formatCardTypeLine(c).toUpperCase();

test('as seis famílias são Equipment, pertencem a ARMOR_FAMILY e não se confundem', () => {
  assert.deepEqual(ARMOR_FAMILY_NAMES, ['Cloth', 'Scale', 'Surplice', 'Warplate', 'Moonplate', 'Glory']);
  for (const name of ARMOR_FAMILY_NAMES) {
    assert.equal(getCardTypes(eq(name)).cardType, 'EQUIPMENT');
    assert.equal(belongsToEquipmentGroup(eq(name), ARMOR_FAMILY), true);
    assert.equal(line(eq(name)), `EQUIPMENT — ${name.toUpperCase()}`);
  }
  assert.equal(hasSubtype(eq('Scale'), 'Cloth'), false);
  assert.equal(hasSubtype(eq('Moonplate'), 'Warplate'), false);
  assert.equal(hasSubtype(eq('Glory'), 'Moonplate'), false);
});

test('Armor genérica fica fora do grupo e some ao lado de uma família', () => {
  assert.equal(line(eq('Armor')), 'EQUIPMENT — ARMOR');
  assert.equal(belongsToEquipmentGroup(eq('Armor'), ARMOR_FAMILY), false);
  assert.equal(line(eq('Armor', 'Cloth')), 'EQUIPMENT — CLOTH');
});

test('armas: subtipo específico exige Weapon e satisfaz os dois', () => {
  const sword = eq('Weapon', 'Sword');
  assert.equal(hasSubtype(sword, 'WEAPON'), true);
  assert.equal(hasSubtype(sword, 'SWORD'), true);
  assert.equal(hasSubtype(sword, 'Spear'), false);
  assert.equal(hasAnySubtype(sword, ['Spear', 'Sword']), true);
  assert.deepEqual(validateEquipmentSubtypes(sword).errors, []);
  assert.deepEqual(validateEquipmentSubtypes(eq('Sword')).errors, ['Sword exige Weapon']);
  assert.deepEqual(validateEquipmentSubtypes(eq('Weapon')).errors, []);
});

test('validação rejeita desconhecido e duplicata sem mexer no dado', () => {
  const card = eq('Weapon', 'Weapon', 'Laser');
  const {errors} = validateEquipmentSubtypes(card);
  assert.ok(errors.some(e => e.includes('repetido')));
  assert.ok(errors.some(e => e.includes('desconhecido') && e.includes('Laser')));
  assert.deepEqual(card.subtipos, ['Weapon', 'Weapon', 'Laser']);
  assert.ok(validateEquipmentSubtypes(eq('Sacred Armor')).warnings[0].includes('Moonplate'));
  assert.deepEqual(validateEquipmentSubtypes(eq('Sacred Armor')).errors, []);
});

test('ordem canônica e estável; múltiplos subtipos com espaço', () => {
  assert.deepEqual(normalizeSubtypes(['Sword', 'Relic', 'Weapon', 'Sword']), ['Weapon', 'Sword', 'Relic']);
  assert.equal(line(eq('Relic', 'Sword', 'Weapon')), 'EQUIPMENT — WEAPON SWORD RELIC');
  assert.equal(line(eq('Harp', 'Instrument')), 'EQUIPMENT — INSTRUMENT HARP');
});

test('patente sai do campo próprio e aparece na linha; raridade e facção não', () => {
  const gold = {...eq('Cloth'), patente_armadura: 'Gold', raridade: 'Legendary', faccao: 'Athena'};
  assert.equal(line(gold), 'EQUIPMENT — GOLD CLOTH');
  assert.equal(line(eq('Cloth')), 'EQUIPMENT — CLOTH');
  assert.equal(hasSubtype(gold, 'Gold'), false);
  const pt = w => ({Equipment: 'Equipamento', Cloth: 'Armadura', Gold: 'Ouro'}[w] ?? w);
  assert.equal(formatCardTypeLine(gold, pt), 'Equipamento — Armadura Ouro');
  assert.equal(hasSubtype(gold, 'Relic'), false);
  assert.equal(hasSubtype({...eq('Scale'), faccao: 'Athena'}, 'Cloth'), false);
  assert.deepEqual(validateEquipmentSubtypes({...eq('Cloth'), patente_armadura: 'Gold'}).errors, []);
  assert.deepEqual(validateEquipmentSubtypes({...eq('Scale'), patente_armadura: 'General'}).errors, []);
  assert.equal(line({...eq('Scale'), patente_armadura: 'General'}), 'EQUIPMENT — GENERAL SCALE');
  assert.ok(validateEquipmentSubtypes({...eq('Scale'), patente_armadura: 'Gold'}).errors[0].includes('Gold'));
  assert.ok(validateEquipmentSubtypes({...eq('Cloth'), patente_armadura: 'General'}).errors[0].includes('General'));
  assert.ok(validateEquipmentSubtypes({...eq('Surplice'), patente_armadura: 'Gold'}).errors[0].includes('Gold'));
  for (const [family, rank] of [['Cloth', 'God'], ['Scale', 'Captain'], ['Surplice', 'Judge'], ['Warplate', 'Warlord'], ['Moonplate', 'Crescent'], ['Moonplate', 'Divine']]) assert.deepEqual(validateEquipmentSubtypes({...eq(family), patente_armadura: rank}).errors, []);
  assert.ok(validateEquipmentSubtypes({...eq('Scale'), patente_armadura: 'Marina'}).errors.length);
  assert.ok(validateEquipmentSubtypes({...eq('Cloth'), patente_armadura: 'Rainbow'}).errors[0].includes('Rainbow'));
});

test('editor: marcar traz a dependência, desmarcar leva o dependente', () => {
  assert.deepEqual(toggleSubtype([], 'Sword'), ['Weapon', 'Sword']);
  assert.deepEqual(toggleSubtype(['Weapon', 'Sword'], 'Weapon'), []);
  assert.deepEqual(toggleSubtype(['Weapon', 'Sword'], 'Sword'), ['Weapon']);
  assert.deepEqual(toggleSubtype([], 'Cloth'), ['Cloth']);
});

test('outros tipos seguem como estão', () => {
  assert.equal(formatCardTypeLine({tipo: 'Devotee', subtipos: ['Marina', 'Warrior']}), 'Devotee — Marina — Warrior');
  assert.equal(formatCardTypeLine({tipo: 'Spell', subtipos: ['Moment']}), 'Moment');
  assert.equal(hasSubtype({tipo: 'Devotee', subtipos: ['Cloth']}, 'Cloth'), false);
});

test('carta da Engine (texto type) responde às mesmas consultas', () => {
  const card = {kind: 'Equipment', type: 'Equipment — Weapon Sword Relic'};
  assert.equal(hasSubtype(card, 'Sword'), true);
  assert.equal(hasSubtype(card, 'Relic'), true);
  assert.equal(hasSubtype(card, 'Spear'), false);
  assert.equal(belongsToEquipmentGroup({kind: 'Equipment', type: 'Equipment — Scale'}, ARMOR_FAMILY), true);
});

test('slot de Armor da Engine: formato antigo e novo dão o mesmo resultado', () => {
  for (const [a, b] of [['Equipment — Armor Cloth', 'Equipment — Cloth'], ['Equipment — Armor Scale', 'Equipment — Scale'], ['Equipment — Armor Surplice', 'Equipment — Surplice'], ['Equipment — Satellite Armor', 'Equipment — Moonplate']]) {
    assert.equal(typeTextIsArmor(a), true);
    assert.equal(typeTextIsArmor(b), true);
  }
  assert.equal(typeTextIsArmor('Equipment — Steel Cloth'), true); // guia §26, autor 02/11/2026
  for (const t of ['Equipment — Weapon Sword', 'Equipment — Relic']) assert.equal(typeTextIsArmor(t), false, t);
});

const table = JSON.parse(readFileSync(new URL('./equipment-migration-v1.json', import.meta.url)));
const migrated = (card, all = true) => {
  const row = table.cartas[card.id];
  return row && (all || !row.revisao) ? {...card, subtipos: row.subtipos, patente_armadura: row.patente} : card;
};

test('migração: a tabela completa deixa o catálogo sem erro de subtipo', () => {
  const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
  const errors = cartas.filter(c => c.tipo === 'Equipment').map(c => migrated(c)).flatMap(c => validateEquipmentSubtypes(c).errors.map(e => `${c.id}: ${e}`));
  assert.deepEqual(errors, []);
});

test('migração: slot de Armor só muda nas cartas decididas pelo autor (guia §26)', () => {
  const decided = new Set(['neutral-v6-465', 'neutral-v6-466', 'neutral-v6-467', 'neutral-v6-469', 'artemis-v6-362']);
  const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
  const typeOf = c => [c.tipo, (c.subtipos || []).join(' ')].filter(Boolean).join(' — ');
  const old = t => /Armor|Warplate|Moonplate/.test(t);
  const before = c => (table.cartas[c.id] ? {...c, subtipos: table.cartas[c.id].antes} : c); // a tabela guarda o estado anterior à gravação
  const changed = cartas.filter(c => !decided.has(c.id) && old(typeOf(before(c))) !== typeTextIsArmor(typeOf(migrated(c)))).map(c => c.id);
  assert.deepEqual(changed, []);
});

test('Steel é patente de Cloth fora da progressão', () => {
  assert.ok(patentesDe(['Cloth']).includes('Steel'));
  assert.ok(!PATENTES_ARMADURA.Cloth.includes('Steel'));
  assert.ok(!patentesDe(['Scale']).includes('Steel'));
  assert.deepEqual(validateEquipmentSubtypes({...eq('Cloth'), patente_armadura: 'Steel'}).errors, []);
  assert.equal(line({...eq('Cloth'), patente_armadura: 'Steel'}), 'EQUIPMENT — STEEL CLOTH');
});

test('migração: só Equipment e sem carta inventada', () => {
  const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
  const byId = new Map(cartas.map(c => [c.id, c]));
  for (const id of Object.keys(table.cartas)) assert.equal(byId.get(id)?.tipo, 'Equipment', id);
  const total = cartas.filter(c => c.tipo === 'Equipment').length;
  assert.equal(Object.keys(table.cartas).length + Object.keys(table.sem_alteracao).length, total);
});
