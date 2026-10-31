// Bônus de Equipment e dano em Armor na engine 3.0 (decisões do autor em 28/10/2026). node --test tools/test-engine-v3-equipment.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, checkInvariants, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike, atkOf, hpOf, keywordsOf} from '../playtest/engine-v3/strike.js';
import {reequip, playEquipment} from '../playtest/engine-v3/play.js';

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

test('Armor soma ATK e HP ao portador, não tem dano próprio e fica solta no campo quando o portador sai', () => {
  const {s, ctx, objects, field, equip, strike, next} = setup();
  const seiya = field('A', '001'), cloth = equip('A', '002', seiya); // 2/4 + Cloth (+1 ATK, HP impresso 4 soma ao máximo)
  assert.deepEqual([atkOf(s, ctx, seiya), hpOf(s, ctx, seiya)], [3, 8]);
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.players.B.soul, 17);
  assert.equal(s.units[cloth]?.damage ?? 0, 0, 'a Armor não recebe dano');
  assert.equal(s.units[seiya].damage, 3, 'retaliação 3 toda no portador');
  next();
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.units[seiya].damage, 6);
  assert.ok(s.players.A.battlefield.includes(cloth), 'Armor nunca é destruída por dano');
  assert.equal(ctx.attached[cloth], seiya);
  assert.equal(s.players.B.soul, 14);
  checkInvariants(s, objects);
});

// Removido: "várias Armor: absorvem na ordem em que foram equipadas" — Armor não absorve mais dano (guia §26A, 30/10/2026).

test('Divine Weapon com +HP (049) soma HP; a Armor (044) soma o HP impresso ao portador e o Pierce mede só o portador', () => {
  const {s, ctx, field, equip, strike} = setup({A: fortress, B: rush});
  const cassios = field('A', '027');
  equip('A', '049', cassios); // 2/3 com +0 ATK / +2 HP, não é Armor; Libra Defense previne 1
  strike(cassios, {kind: 'god', player: 'B'});
  assert.deepEqual([s.units[cassios].damage, hpOf(s, ctx, cassios)], [2, 5]);
  const t = setup();
  const seiya = t.field('A', '001'), repairer = t.field('B', '042');
  const cracked = t.equip('B', '044', repairer); // Armor HP 2 (soma ao portador), +1 ATK, Last Protection previne 1
  t.s.units[seiya].keywords = ['Pierce'];
  const hp0 = hpOf(t.s, t.ctx, repairer);
  t.strike(seiya, {kind: 'devotee', uid: repairer});
  assert.equal(hp0, 4, 'HP 2 do Devotee + HP 2 da Armor');
  assert.equal(t.s.units[cracked]?.damage ?? 0, 0, 'a Armor não guarda dano');
  assert.deepEqual([t.s.units[repairer].damage, t.s.players.B.soul, t.s.units[seiya].damage], [1, 20, 2], 'sem excesso: Pierce não passa ao God');
});

test('019 equipada dá Cheater: ignora Guardian contra o God; texto da 019 intacto', () => {
  const {s, ctx, field, equip, strike} = setup();
  const seiya = field('A', '001');
  field('B', '040');
  equip('A', '019', seiya);
  assert.ok(keywordsOf(s, ctx, seiya).includes('Cheater'));
  strike(seiya, {kind: 'god', player: 'B'});
  assert.equal(s.players.B.soul, 15);
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

test('item global (Equip: None — Global) paga o Casting Cost e fica no campo sem portador (guia §33, 29/10/2026)', () => {
  const {s, ctx} = setup({A: fortress, B: rush});
  const shield = cards.get('athena-v6-020');
  assert.equal(shield.global, true);
  assert.equal(cards.get('athena-v6-049').global, false);
  const p = s.players.A, uid = p.deck.find(u => u.includes(':020:')) ?? p.deck[0];
  ctx.cards = new Map(cards);
  ctx.cards.set(ctx.objects[uid].cardId, {...shield, id: ctx.objects[uid].cardId, cost: {amount: 1, unit: 'base'}});
  p.deck.splice(p.deck.indexOf(uid), 1); p.hand.push(uid);
  p.bases = p.deck.splice(0, 2).map(u => ({uid: u, prepared: true}));
  assert.deepEqual(playEquipment(s, ctx, 'A', uid, null), {cost: {amount: 1, unit: 'mixed'}}); // guia §5: Base e/ou Latent
  passAll(s); // guia §56: resolve a pilha
  assert.ok(p.battlefield.includes(uid) && !ctx.attached[uid]);
  assert.throws(() => reequip(s, ctx, 'A', uid, uid), RuleError);
});
