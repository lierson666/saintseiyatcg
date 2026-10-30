// Gods Hades, Ares e Artemis na engine 3.0 (gods.js): Divine Power, Awaken e Ultimate.
// node --test tools/test-engine-v3-gods-v6.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, runCheckpoint, gainLatent, RuleError, NotSpecified} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {declareStrike, checkStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, keywordsOf, damageDevotee, checkDefeats, hpOf} from '../playtest/engine-v3/effects.js';
import {refreshAwaken, announceGreatEclipse, greatEclipseBlock, activateBloodlust, announceObliteration, placeBaseMoonHarvest, moonAwakeningBlock} from '../playtest/engine-v3/gods.js';
import {putOntoField} from '../playtest/engine-v3/v6/kit.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

// A joga o God `god`; B é Athena. `decide` padrão: sim / primeira opção.
function setup(god, decide = (p, q) => (q.options ? q.options[0] : true)) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: god, B: 'god-athena'}, first: 'A', seed: 3});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide};
  bindContext(s, ctx);
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id, prepared = true) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared, damage: 0}; return uid; };
  const bases = (key, n) => { s.players[key].bases.push(...s.players[key].deck.splice(-n).map(uid => ({uid, prepared: true}))); };
  const soul = (key, n) => { s.players[key].soul = n; refreshAwaken(s); };
  // Devotees baratos do deck de B (o deck fortress não tem os mesmos ids do rush).
  const foes = () => s.players.B.deck.filter(u => cards.get(m.objects[u].cardId).kind === 'Devotee').slice(0, 3);
  const foe = () => { const uid = foes()[0]; s.players.B.deck.splice(s.players.B.deck.indexOf(uid), 1); s.players.B.battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  startTurn(s);
  return {s, ctx, field, foe, bases, take, soul, A: s.players.A, B: s.players.B};
}
const kill = (s, ctx, uid) => { damageDevotee(s, ctx, uid, 99, false); checkDefeats(s, ctx); runCheckpoint(s); passAll(s); };
const count = (s, type, ability) => s.events.filter(e => e.type === type && (!ability || e.ability === ability)).length;

// Devotee do próprio A no campo (deck rush).
const ownDevotee = (s, ctx) => { const p = s.players.A, uid = p.deck.find(u => ctx.cards.get(ctx.objects[u].cardId).kind === 'Devotee'); p.deck.splice(p.deck.indexOf(uid), 1); p.battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };

test('Hades Offering of Life: só Devotee SEU derrotado → perde 2 Soul, compra 1 e ganha 1 Latent; uma vez por Round', () => {
  const {s, ctx, foe: mk, A} = setup('god-hades');
  const hand0 = A.hand.length, soul = A.soul;
  kill(s, ctx, mk());
  assert.deepEqual([A.soul, A.hand.length, count(s, 'divine_power', 'OFFERING OF LIFE')], [soul, hand0, 0], 'Devotee inimigo não dispara');
  const foe = ownDevotee(s, ctx), foe2 = ownDevotee(s, ctx), hand = A.hand.length;
  kill(s, ctx, foe);
  assert.deepEqual([A.soul, A.hand.length, A.latent], [soul - 2, hand + 1, 1]);
  kill(s, ctx, foe2);
  assert.equal(A.soul, soul - 2, 'segundo Devotee no mesmo Round não repete');
  assert.equal(count(s, 'divine_power', 'OFFERING OF LIFE'), 1);
});

test('Hades Offering of Life: recusar não gasta Soul nem o uso do Round', () => {
  let answer = false;
  const {s, ctx, A} = setup('god-hades', () => answer);
  kill(s, ctx, ownDevotee(s, ctx));
  assert.deepEqual([A.soul, A.latent, count(s, 'divine_power_declined')], [22, 0, 1]);
  answer = true;
  kill(s, ctx, ownDevotee(s, ctx));
  assert.deepEqual([A.soul, A.latent], [20, 1]);
});

test('Hades King of Tartarus (Awaken 7): Devotee que volta do próprio Tartarus tira 1 Soul do inimigo e dá 1 ao Hades', () => {
  for (const awake of [true, false]) {
    const {s, ctx, take, soul, A, B} = setup('god-hades');
    soul('A', awake ? 7 : 12);
    const dead = take('A', '001'); A.tartarus.push(dead);
    putOntoField(s, ctx, 'A', dead, 'tartarus');
    runCheckpoint(s); passAll(s);
    assert.deepEqual([A.soul, B.soul], awake ? [8, 19] : [12, 20]);
  }
});

test('Hades Great Eclipse (Ultimate 7): até 3 Devotees do Tartarus voltam Unprepared sem Impulse; inimigo perde 2 por Devotee; Hades ganha metade (arredondada para cima)', () => {
  const {s, ctx, bases, take, soul, A, B} = setup('god-hades');
  bases('A', 7); soul('A', 10);
  const dead = ['001', '028'].map(id => take('A', id)); A.tartarus.push(...dead);
  assert.equal(greatEclipseBlock(s, 'A'), null);
  announceGreatEclipse(s, ctx, 'A'); passAll(s);
  for (const uid of dead) assert.deepEqual([s.players.A.battlefield.includes(uid), s.units[uid].prepared, s.units[uid].entered], [true, false, null]);
  assert.equal(B.soul, 20 - 4);
  assert.equal(A.soul, 10 + 2);
  assert.equal(A.bases.filter(b => b.prepared).length, 0);
  assert.equal(greatEclipseBlock(s, 'A'), 'used');
});

test('Hades Great Eclipse: sem Devotee no Tartarus gasta o custo e não muda Soul; sem 7 Bases preparadas é bloqueada', () => {
  const {s, ctx, bases, soul, B} = setup('god-hades');
  assert.equal(greatEclipseBlock(s, 'A'), 'cost');
  bases('A', 7); soul('A', 10);
  announceGreatEclipse(s, ctx, 'A'); passAll(s);
  assert.deepEqual([B.soul, s.players.A.soul], [20, 10]);
});

test('Ares Bloodlust (Divine Power, 3 Cosmo): prepara o Devotee e dá +1 ATK até o fim do Round; uma vez por Round', () => {
  const {s, ctx, field, A} = setup('god-ares');
  const unit = field('A', '001', false), base = atkOf(s, ctx, unit);
  A.latent = 3;
  activateBloodlust(s, ctx, 'A', unit); passAll(s);
  assert.deepEqual([s.units[unit].prepared, atkOf(s, ctx, unit), A.latent], [true, base + 1, 0]);
  A.latent = 3;
  assert.throws(() => activateBloodlust(s, ctx, 'A', unit), RuleError);
  // Rebalanceamento (autor, 30/10/2026): o Devotee preparado não mira God nesta rodada.
  assert.throws(() => checkStrike(s, ctx, unit, {kind: 'god', player: 'B'}), /God/);
});

test('Ares Bloodlust paga com Base preparada primeiro e completa com Latent', () => {
  const {s, ctx, field, A} = setup('god-ares');
  const unit = field('A', '001', false);
  A.bases = [{uid: 'b1', prepared: true}, {uid: 'b2', prepared: true}]; A.latent = 1;
  activateBloodlust(s, ctx, 'A', unit); passAll(s);
  assert.deepEqual([A.bases.filter(b => b.prepared).length, A.latent, s.units[unit].prepared], [0, 0, true]);
});

test('Ares Awaken 7 (canônico, autor 29/10/2026)', () => {
  const {s} = setup('god-ares');
  assert.equal(s.divine.A.awakenAt, 7);
});

test('Ares Butchery (Awaken 7): Devotee seu derrota Devotee inimigo em Strike → o God inimigo perde 1 Soul (só com Awaken)', () => {
  for (const awake of [true, false]) {
    const {s, ctx, field, foe: mk, soul, B} = setup('god-ares');
    soul('A', awake ? 7 : 12);
    const atk = field('A', '001'), foe = mk();
    damageDevotee(s, ctx, foe, hpOf(s, ctx, foe) - 1, false);
    declareStrike(s, ctx, atk, {kind: 'devotee', uid: foe}); passAll(s);
    assert.ok(s.players.B.tartarus.includes(foe));
    assert.equal(B.soul, awake ? 19 : 20);
  }
});

test('Ares Obliteration (Ultimate 6): prepara todos, +3 ATK/Pierce/Long Range no Round; Devotee que completa um Strike é destruído', () => {
  const {s, ctx, field, bases, A, B} = setup('god-ares');
  const one = field('A', '001', false), two = field('A', '028');
  bases('A', 6);
  const before = atkOf(s, ctx, two);
  announceObliteration(s, ctx, 'A'); passAll(s);
  assert.equal(s.units[one].prepared, true);
  assert.equal(atkOf(s, ctx, two), before + 3);
  assert.ok(['Pierce', 'Long Range'].every(w => keywordsOf(s, ctx, two).includes(w)));
  assert.throws(() => declareStrike(s, ctx, two, {kind: 'god', player: 'B'}), NotSpecified, 'Long Range ainda não tem efeito especificado no Strike');
  for (const e of s.effects) if (e.keywords) e.keywords = e.keywords.filter(w => w !== 'Long Range'); // teste: tira o Long Range pendente para exercer o resto
  declareStrike(s, ctx, two, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(B.soul, 20 - (before + 3), 'Pierce/ATK +3 contam; Soul de B é 20');
  assert.ok(A.tartarus.includes(two), 'quem completou o Strike foi destruído');
  assert.ok(s.players.A.battlefield.includes(one), 'quem não atacou fica');
});

test('Artemis Moon Harvest: Base sem Cosmoble pagando 2 Soul; uma vez por Round', () => {
  const {s, ctx, A} = setup('god-artemis');
  const pick = () => A.deck.find(u => ctx.cards.get(ctx.objects[u].cardId).cosmoble === false);
  const uid = pick(); A.deck.splice(A.deck.indexOf(uid), 1); A.hand.push(uid);
  const soul = A.soul;
  placeBaseMoonHarvest(s, ctx, 'A', uid);
  assert.deepEqual([A.bases.some(b => b.uid === uid), A.soul], [true, soul - 2]);
  const again = pick(); A.deck.splice(A.deck.indexOf(again), 1); A.hand.push(again);
  assert.throws(() => placeBaseMoonHarvest(s, ctx, 'A', again), RuleError);
});

test('Artemis Moonlight Blessing (Awaken 3): +1 Latent extra no primeiro ganho do Round, até o teto 3', () => {
  const {s, soul, A} = setup('god-artemis');
  soul('A', 3);
  gainLatent(s, 'A', 1); runCheckpoint(s);
  assert.equal(A.latent, 2);
  A.latent = 0;
  gainLatent(s, 'A', 1); runCheckpoint(s);
  assert.equal(A.latent, 1, 'só uma vez por Round');
  const {s: s2, soul: soul2, A: A2} = setup('god-artemis');
  soul2('A', 9);
  gainLatent(s2, 'A', 1); runCheckpoint(s2);
  assert.equal(A2.latent, 1, 'sem Awaken não há bônus');
});

test('Artemis Moonlight Blessing: respeita o teto de 3', () => {
  const {s, soul, A} = setup('god-artemis');
  soul('A', 3); A.latent = 2;
  gainLatent(s, 'A', 1); runCheckpoint(s);
  assert.equal(A.latent, 3);
});

test('Artemis Moon Awakening (Ultimate 9): pendente, bloqueada na interface', () => {
  assert.equal(moonAwakeningBlock(), 'pendente');
});
