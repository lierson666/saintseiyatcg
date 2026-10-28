// Bônus de Equipment e dano em Armor na engine 3.0 (decisões do autor em 28/10/2026). node --test tools/test-engine-v3-equipment.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, checkInvariants, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike, atkOf, hpOf, keywordsOf} from '../playtest/engine-v3/strike.js';
import {reequip} from '../playtest/engine-v3/play.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup(decks = {A: rush, B: fortress}) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null; // cenário isolado
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); p.battlefield.push(uid); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const equip = (key, id, bearer) => { const uid = take(key, id); ctx.attached[uid] = bearer; return uid; };
  const strike = (attacker, target) => { declareStrike(s, ctx, attacker, target); return passAll(s); };
  const next = () => { for (let i = 0; i < 2; i++) { endTurn(s); passAll(s); startTurn(s); } };
  startTurn(s);
  return {s, ctx, objects: m.objects, field, equip, strike, next};
}

test('parser: bônus fixo de Equipment só nas linhas incondicionais', () => {
  assert.deepEqual(cards.get('athena-v6-002').equipped, {atk: 1, hp: 0, keywords: []});
  assert.deepEqual(cards.get('athena-v6-019').equipped, {atk: 3, hp: 0, keywords: ['Cheater']});
  assert.deepEqual(cards.get('athena-v6-049').equipped, {atk: 0, hp: 2, keywords: []});
  assert.equal(cards.get('athena-v6-047').equipped, null, '"while it has damage" fica para os efeitos');
  assert.equal(cards.get('athena-v6-004').equipped, null);
});

test('Armor dá ATK e absorve o dano primeiro; destruída vai ao Tartarus do Owner e o excesso passa ao Devotee', () => {
  const {s, ctx, objects, field, equip, strike, next} = setup();
  const seiya = field('A', '001'), cloth = equip('A', '002', seiya); // 2/4 + Cloth (+1 ATK, HP 4)
  assert.deepEqual([atkOf(ctx, seiya), hpOf(ctx, seiya)], [3, 4]);
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.players.B.soul, 27);
  assert.deepEqual([s.units[cloth].damage, s.units[seiya].damage], [3, 0], 'retaliação 3 toda na Armor');
  next();
  strike(seiya, {kind: 'god', player: 'B'});
  assert.ok(s.players.A.tartarus.includes(cloth), 'Armor com 4 de dano sai');
  assert.equal(ctx.attached[cloth], undefined);
  assert.deepEqual([s.units[seiya].damage, atkOf(ctx, seiya)], [2, 2], 'excesso 2 no Seiya; perde o +1');
  assert.equal(s.players.B.soul, 24, 'o ATK foi lido antes do dano');
  checkInvariants(s, objects);
});

test('várias Armor: absorvem na ordem em que foram equipadas', () => {
  const {s, ctx, field, equip, strike} = setup();
  const jabu = field('A', '028'), first = equip('A', '044', jabu), second = equip('A', '044', jabu); // HP 2 cada, +1 ATK cada
  assert.equal(atkOf(ctx, jabu), 4);
  strike(jabu, {kind: 'god', player: 'B'});
  assert.ok(s.players.A.tartarus.includes(first));
  assert.deepEqual([s.units[second].damage, s.units[jabu].damage], [1, 0]);
});

test('Divine Weapon com +HP (049) segura o Devotee; Pierce não passa do que a Armor absorveu', () => {
  const {s, ctx, field, equip, strike} = setup({A: fortress, B: rush});
  const cassios = field('A', '027');
  equip('A', '049', cassios); // 2/3 com +0 ATK / +2 HP, não é Armor
  strike(cassios, {kind: 'god', player: 'B'});
  assert.deepEqual([s.units[cassios].damage, hpOf(ctx, cassios)], [3, 5]);
  const t = setup();
  const seiya = t.field('A', '001'), repairer = t.field('B', '042');
  t.equip('B', '044', repairer); // Armor HP 2, +1 ATK
  t.s.units[seiya].keywords = ['Pierce'];
  t.strike(seiya, {kind: 'devotee', uid: repairer});
  assert.deepEqual([t.s.units[repairer].damage, t.s.players.B.soul, t.s.units[seiya].damage], [0, 30, 2]);
});

test('019 equipada dá Cheater: ignora Guardian contra o God; texto da 019 intacto', () => {
  const {s, ctx, field, equip, strike} = setup();
  const seiya = field('A', '001');
  field('B', '040');
  equip('A', '019', seiya);
  assert.ok(keywordsOf(s, ctx, seiya).includes('Cheater'));
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.players.B.soul, 25);
  const original = canon.cards.find(c => c.id.toLowerCase() === 'athena-v6-019');
  assert.equal(cards.get('athena-v6-019').text, original.original_text);
});

test('Equipment não-Armor fica solto quando o portador sai e é reequipado pagando Equip {N}', () => {
  const {s, ctx, objects, field, equip, strike} = setup({A: fortress, B: rush});
  const cassios = field('A', '027'), weapon = equip('A', '049', cassios), acolyte = field('A', '043');
  s.units[cassios].damage = 3; // 2/3 + 2 HP: morre com a retaliação 3
  strike(cassios, {kind: 'god', player: 'B'});
  assert.ok(s.players.A.tartarus.includes(cassios));
  assert.ok(s.players.A.battlefield.includes(weapon) && !ctx.attached[weapon]);
  checkInvariants(s, objects);
  s.players.A.bases = s.players.A.deck.splice(0, 4).map(uid => ({uid, prepared: true}));
  assert.throws(() => reequip(s, ctx, 'B', weapon, acolyte), /D1/);
  assert.deepEqual(reequip(s, ctx, 'A', weapon, acolyte), {cost: {amount: 4, unit: 'base'}});
  assert.equal(ctx.attached[weapon], acolyte);
  assert.throws(() => reequip(s, ctx, 'A', weapon, acolyte), e => e instanceof RuleError && /solto/.test(e.message));
});
