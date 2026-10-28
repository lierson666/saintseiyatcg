// Gatilhos, habilidades {T}, dano direto e Resonance das cartas dos decks D171. node --test tools/test-engine-v3-triggers.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, checkInvariants, NotSpecified} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee, playEquipment, playSpell, activate} from '../playtest/engine-v3/play.js';
import {atkOf, hpOf, SPELLS} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup(decks = {A: rush, B: fortress}, decide) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null; // cenário isolado
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const equip = (key, id, bearer) => { const uid = take(key, id); s.players[key].battlefield.push(uid); ctx.attached[uid] = bearer; return uid; };
  const hand = (key, id) => { const uid = take(key, id); s.players[key].hand.push(uid); return uid; };
  const bases = (key, n) => { s.players[key].bases.push(...s.players[key].deck.splice(-n).map(uid => ({uid, prepared: true}))); };
  const strike = (attacker, target) => { declareStrike(s, ctx, attacker, target); return passAll(s); };
  const next = () => { for (let i = 0; i < 2; i++) { endTurn(s); passAll(s); startTurn(s); } };
  startTurn(s);
  return {s, ctx, objects: m.objects, field, equip, hand, bases, strike, next};
}
const yes = () => true;

test('Miracle (001) e Resonance da 019: só com o God atrás; a Resonance só vale equipada em Pegasus Seiya', () => {
  const {s, ctx, field, equip} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  equip('A', '019', jabu);
  assert.equal(atkOf(s, ctx, seiya), 2);
  s.players.A.soul = 29;
  assert.deepEqual([atkOf(s, ctx, seiya), hpOf(s, ctx, jabu)], [3, 2], 'Miracle; 019 em Jabu não dá +2/+2');
  const t = setup(), seiya2 = t.field('A', '001');
  t.equip('A', '019', seiya2);
  t.s.players.A.soul = 29;
  assert.deepEqual([atkOf(t.s, t.ctx, seiya2), hpOf(t.s, t.ctx, seiya2)], [2 + 1 + 3 + 2, 6]);
});

test('Seventh Sense: Seiya sobrevive a Strike contra Devotee de ATK maior e ganha +1 ATK permanente', () => {
  const {s, ctx, field, strike, next} = setup();
  const seiya = field('A', '001'), mu = field('B', '011'); // Mu 3/5
  strike(seiya, {kind: 'devotee', uid: mu});
  assert.deepEqual([s.units[seiya].damage, atkOf(s, ctx, seiya)], [3, 3]);
  next(); next();
  assert.equal(atkOf(s, ctx, seiya), 3, 'não expira');
});

test('Pegasus Cloth (002) Resonance prepara Seiya; Seika remove 1 de dano dele', () => {
  const {s, ctx, field, equip, strike} = setup({A: rush, B: fortress}, yes);
  const seiya = field('A', '001');
  equip('A', '002', seiya); field('A', '036');
  s.units[seiya].damage = 1;
  strike(seiya, {kind: 'god', player: 'B'});
  assert.deepEqual([s.units[seiya].prepared, s.units[seiya].damage], [true, 0], 'retaliação na Armor; Seika tira 1');
});

test('Libra Sword (048) em Shiryu: 1 de dano adicional ao Devotee que recebeu dano de Strike', () => {
  const {s, ctx, field, equip, strike} = setup({A: fortress, B: rush}, yes);
  const shiryu = field('A', '003'), tatsumi = field('B', '034');
  equip('A', '048', shiryu);
  s.players.B.soul = 5; // Tatsumi 1/5, e Athena de B fica Awaken no checkpoint: +1/+1 (Divine Protection), 2/6
  s.units[tatsumi].damage = 1;
  strike(shiryu, {kind: 'devotee', uid: tatsumi});
  assert.ok(s.players.B.tartarus.includes(tatsumi), '1 anterior + 4 do Strike + 1 adicional = 6');
});

test('Eagle Marin: Training counter ao entrar; Master\'s Guidance dá +1/+1 enquanto ela está em campo', () => {
  const {s, ctx, field, hand, bases} = setup();
  const seiya = field('A', '001'), marin = hand('A', '021');
  bases('A', 3);
  playDevotee(s, ctx, 'A', marin, {target: seiya});
  assert.ok(s.window, 'gatilho de entrada abre janela');
  passAll(s);
  assert.deepEqual([s.units[seiya].training, atkOf(s, ctx, seiya), hpOf(s, ctx, seiya)], [1, 3, 5]);
});

test('Star Hill Acolyte: olha as 2 do topo, uma fica e a outra vai ao fundo', () => {
  const {s, ctx, hand, bases} = setup({A: rush, B: fortress}, (k, q) => q.cards?.[1]);
  const acolyte = hand('A', '043');
  bases('A', 2);
  const [a, b] = s.players.A.deck;
  playDevotee(s, ctx, 'A', acolyte);
  passAll(s);
  assert.deepEqual([s.players.A.deck[0], s.players.A.deck.at(-1)], [b, a]);
});

test('Pegasus God Cloth (019): ao jogar com o God atrás, +3/+3 e prepara; Divine Cosmo e Divine Protection pagam Base', () => {
  const {s, ctx, field, hand, bases, strike} = setup({A: rush, B: fortress}, yes);
  const seiya = field('A', '001'), jabu = field('A', '028'), kamui = hand('A', '019');
  s.units[jabu].prepared = false;
  s.players.A.soul = 15; // continua atrás depois do Strike (B cai para 20)
  bases('A', 11);
  playEquipment(s, ctx, 'A', kamui, seiya, {target: jabu});
  passAll(s);
  assert.deepEqual([atkOf(s, ctx, jabu), s.units[jabu].prepared], [5, true]);
  s.units[seiya].damage = 5; s.units[kamui] = {damage: 6}; // HP 4 + 2 da Resonance; Armor com 1 de folga
  strike(seiya, {kind: 'god', player: 'B'}); // 2 + Miracle 1 + 019 3 + Resonance 2 + Divine Cosmo 2 = 10
  assert.equal(s.players.B.soul, 20);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, 0, '6 + 3 + 2 Bases');
  assert.deepEqual([s.units[seiya].damage, s.units[kamui].damage], [5, 6], 'Divine Protection preveniu a retaliação que derrotaria');
});

test('{T}: Sacred Recovery (041), Armor Ward (042) e Cloth Restoration (011, uma vez por Round)', () => {
  const {s, ctx, field, equip, bases} = setup({A: fortress, B: rush});
  const healer = field('A', '041'), repairer = field('A', '042'), mu = field('A', '011'), shiryu = field('A', '003');
  const cloth = equip('A', '004', shiryu);
  s.units[shiryu].damage = 3;
  bases('A', 5);
  s.units[healer].prepared = false;
  assert.throws(() => activate(s, ctx, 'A', healer, {target: shiryu}), /Prepared/);
  s.units[healer].prepared = true;
  activate(s, ctx, 'A', healer, {target: shiryu});
  activate(s, ctx, 'A', repairer, {target: cloth});
  activate(s, ctx, 'A', mu, {target: cloth});
  s.units[mu].prepared = true;
  assert.throws(() => activate(s, ctx, 'A', mu, {target: cloth}), /D191/);
  assert.deepEqual([s.units[shiryu].damage, s.units[healer].prepared, s.players.A.bases.filter(b => b.prepared).length], [1, false, 1]);
  assert.deepEqual(s.effects.filter(e => e.target === cloth).map(e => e.amount), [1, 2]);
});

test('A Promise to Shunrei (059): remove 2 de dano e, com Shunrei, prepara', () => {
  const {s, ctx, field, hand, bases} = setup({A: fortress, B: rush});
  const shiryu = field('A', '003'), promise = hand('A', '059');
  field('A', '037');
  s.units[shiryu].damage = 3; s.units[shiryu].prepared = false;
  bases('A', 2);
  playSpell(s, ctx, 'A', promise, {target: shiryu, prepare: true});
  assert.deepEqual([s.units[shiryu].damage, s.units[shiryu].prepared], [1, true]);
});

test('dano que não é de Strike (082) passa pela Armor e ignora prevenções de Strike; 082 e 085 são Technique', () => {
  const {s, ctx, field, equip, hand, bases} = setup();
  const seiya = field('A', '001'), repairer = field('B', '042');
  const cracked = equip('B', '044', repairer); // Last Protection é só contra Strike
  const arrow = hand('A', '082');
  bases('A', 5);
  playSpell(s, ctx, 'A', arrow, {target: repairer});
  assert.ok(s.players.B.tartarus.includes(cracked) && s.players.B.tartarus.includes(repairer), '6 com Seiya: Armor 2, Devotee 4');
  assert.equal(s.window, null, 'Technique: Sorcery, sem janela');
  const t = setup({A: fortress, B: rush}), shiryu = t.field('A', '003'), guard = t.field('B', '040');
  t.bases('A', 6);
  playSpell(t.s, t.ctx, 'A', t.hand('A', '085'), {source: shiryu, target: guard});
  assert.ok(t.s.players.A.tartarus.includes(shiryu) && t.s.players.B.tartarus.includes(guard));
  checkInvariants(t.s, t.objects);
});

test('Dragon Cloth (004) Resonance: redireciona até 2 de outro Saint para Shiryu, como dano de Strike nele', () => {
  const {s, ctx, field, equip, strike} = setup({A: rush, B: fortress}, (k, q) => q.ability === 'Dragon Cloth Resonance');
  const seiya = field('A', '001'), mu = field('B', '011'), shiryu = field('B', '003');
  const cloth = equip('B', '004', shiryu);
  s.units[shiryu].prepared = false; // sem Guardian em guarda
  strike(seiya, {kind: 'devotee', uid: mu});
  assert.equal(s.units[mu].damage, 0, '2 redirecionados');
  assert.deepEqual([s.units[cloth].damage, s.units[shiryu].damage], [1, 0], 'Dragon Shield de Shiryu previne 1 dos 2');
});
