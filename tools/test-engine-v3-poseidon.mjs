// Seal (D211/D212) e God Poseidon (Water Prison, Pressure of the Deep, Great Flood) na engine 3.0; loader Poseidon V6.
// FIXTURE: não existe carta Poseidon V6 canônica (data/poseidon-v6/inventario.json). O God Poseidon é canônico (D268);
// o deck que ele pilota aqui é o Dragon Fortress de Athena V6 (decks-proposta-d171), rotulado como fixture, não oficial.
// Regras homologadas em 28/10/2026: G3-032 (1 marcador por "Seal that Devotee"), G3-033 (Prepare redundante não
// remove Seal), G3-034 (quem descarta escolhe no Great Flood). Só o deck do Poseidon continua FIXTURE.
// node --test tools/test-engine-v3-poseidon.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex, validateDeck} from '../shared/deck-v3.js';
import {loadPoseidonCatalog, officialDeckErrors} from '../shared/poseidon-v6.js';
import {createMatch, mulligan} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, pass, addSeal, destroyDevotee, placeBase, checkInvariants, NotSpecified, RuleError} from '../playtest/engine-v3/core.js';
import {declareStrike, strikeTargets} from '../playtest/engine-v3/strike.js';
import {playDevotee, duplicateCharacter} from '../playtest/engine-v3/play.js';
import {refreshAwaken, announceGreatFlood, greatFloodBlock} from '../playtest/engine-v3/gods.js';
import {timeoutAutoChoice} from '../playtest/engine-v3/clock.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const inventory = read('../data/poseidon-v6/inventario.json');
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

function setup({decide = () => true} = {}) {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-poseidon'}, first: 'A', seed: 5});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide};
  const take = (key, id) => { const p = s.players[key], uid = p.deck.find(u => u.includes(`:${id}:`)); p.deck.splice(p.deck.indexOf(uid), 1); return uid; };
  const field = (key, id) => { const uid = take(key, id); s.players[key].battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const bases = (key, n) => { s.players[key].bases.push(...s.players[key].deck.splice(-n).map(uid => ({uid, prepared: true}))); };
  startTurn(s);
  return {s, ctx, take, field, bases};
}
const types = s => s.events.map(e => e.type);
const count = (s, type, ability) => s.events.filter(e => e.type === type && (!ability || e.ability === ability)).length;
const awaken = s => { s.players.B.soul = 4; refreshAwaken(s); };

// ---------- Seal ----------
test('D211: Seal são marcadores; cada Prepare remove 1 em vez de preparar; N marcadores atrasam N Prepares', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  s.units[seiya].prepared = false;
  addSeal(s, ctx, [seiya], 2, 'fixture'); passAll(s);
  assert.equal(s.units[seiya].seal, 2);
  for (const expected of [1, 0]) {
    endTurn(s); passAll(s); startTurn(s); endTurn(s); passAll(s); startTurn(s); // volta ao turno de A
    assert.equal(s.units[seiya].seal, expected);
    assert.equal(s.units[seiya].prepared, false, 'o Prepare foi trocado pela remoção de 1 marcador');
  }
  endTurn(s); passAll(s); startTurn(s); endTurn(s); passAll(s); startTurn(s);
  assert.equal(s.units[seiya].prepared, true, 'sem marcador, prepara normalmente');
  assert.equal(count(s, 'seal_removed'), 2);
});

test('Seal não é stun: Devotee Sealed e Prepared ainda declara Strike', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  addSeal(s, ctx, [seiya], 1, 'fixture'); passAll(s);
  assert.ok(strikeTargets(s, ctx, seiya).length > 0);
  assert.throws(() => declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}), NotSpecified, 'Water Prison em atacante já Sealed: D269 pendente');
  s.roundUses.add('god:B:water-prison'); // sem a oportunidade, o Strike segue
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}); passAll(s);
  assert.ok(types(s).includes('god_damage'));
});

test('G3-033: Prepare redundante em Devotee já Prepared não remove Seal; Unprepared segue a D211', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  addSeal(s, ctx, [seiya], 2, 'fixture'); passAll(s);
  endTurn(s); passAll(s); startTurn(s); endTurn(s); passAll(s); startTurn(s);
  assert.deepEqual([s.units[seiya].prepared, s.units[seiya].seal], [true, 2], 'Prepared com 2 marcadores continua assim');
  s.units[seiya].prepared = false;
  endTurn(s); passAll(s); startTurn(s); endTurn(s); passAll(s); startTurn(s);
  assert.deepEqual([s.units[seiya].prepared, s.units[seiya].seal], [false, 1]);
});

// ---------- Water Prison ----------
test('D212/D198: Water Prison pago (2 Latent) sela o atacante e o Strike segue normalmente', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  s.players.B.latent = 3;
  const soul = s.players.B.soul;
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(s.players.B.latent, 1);
  assert.equal(s.units[seiya].seal, 1);
  assert.ok(s.players.B.soul < soul, 'Seal depois da declaração não cancela o Strike');
  assert.ok(s.roundUses.has('god:B:water-prison'));
});

test('D268: recusar não paga, não sela e não gasta o uso; o próximo Strike inimigo oferece de novo', () => {
  const answers = [false, true];
  const {s, ctx, field} = setup({decide: (p, q) => (q.ability === 'WATER PRISON' ? answers.shift() : true)});
  const seiya = field('A', '001'), jabu = field('A', '028');
  s.players.B.latent = 2;
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(s.players.B.latent, 2);
  assert.equal(s.units[seiya].seal, undefined);
  assert.equal(count(s, 'divine_power_declined', 'WATER PRISON'), 1);
  declareStrike(s, ctx, jabu, {kind: 'god', player: 'B'}); passAll(s);
  assert.deepEqual(s.events.filter(e => e.type === 'seal_added').map(e => [e.uid, e.counters]), [[jabu, 1]]);
  assert.equal(s.players.B.latent, 0);
});

test('D268: uso gasto com pagamento legal mesmo sem Seal efetivo; uma vez por Round', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  s.players.B.latent = 3;
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  destroyDevotee(s, seiya, ctx.objects, ctx.attached); // atacante sai antes da Water Prison resolver
  pass(s, 'B');
  pass(s, 'A');
  assert.equal(count(s, 'strike_fizzled'), 1, 'G3-036: Strike sem atacante é anulado');
  assert.equal(count(s, 'seal_failed'), 1);
  assert.ok(s.roundUses.has('god:B:water-prison'));
  declareStrike(s, ctx, jabu, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(count(s, 'divine_power', 'WATER PRISON'), 1, 'sem segunda Water Prison no Round');
  assert.equal(s.players.B.latent, 1);
});

test('G3-032: "Seal that Devotee" põe exatamente 1 marcador; aplicações sucessivas acumulam', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  s.players.B.latent = 3;
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'}); passAll(s);
  assert.deepEqual(s.events.filter(e => e.type === 'seal_added').map(e => [e.added, e.counters]), [[1, 1]]);
  addSeal(s, ctx, [seiya], 1, 'fixture'); passAll(s);
  assert.equal(s.units[seiya].seal, 2);
});

// ---------- Pressure of the Deep ----------
test('D211/D234: Awaken ativo, Devotee inimigo passa de 0 para ≥1 Seal: o controlador dele faz Mill 2 e Poseidon compra 1', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  awaken(s);
  s.players.B.latent = 2;
  const deckA = s.players.A.deck.length, handB = s.players.B.hand.length;
  declareStrike(s, ctx, seiya, {kind: 'devotee', uid: field('B', '003')}); passAll(s);
  assert.equal(count(s, 'divine_power', 'PRESSURE OF THE DEEP'), 1);
  assert.equal(s.players.A.deck.length, deckA - 2);
  assert.equal(s.players.B.hand.length, handB + 1);
});

test('D211: selar quem já está Sealed acumula marcadores sem novo gatilho; sem Awaken, nenhum gatilho', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  addSeal(s, ctx, [seiya], 1, 'fixture'); passAll(s);
  assert.equal(count(s, 'divine_power', 'PRESSURE OF THE DEEP'), 0, 'Poseidon sem Awaken');
  awaken(s);
  addSeal(s, ctx, [seiya], 1, 'fixture'); passAll(s);
  assert.equal(s.units[seiya].seal, 2);
  assert.equal(count(s, 'divine_power', 'PRESSURE OF THE DEEP'), 0, 'não houve transição 0 → ≥1');
});

test('D267/D211: dois Devotees selados no mesmo evento = dois gatilhos; vários marcadores no mesmo = um', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001'), jabu = field('A', '028');
  awaken(s);
  addSeal(s, ctx, [seiya, jabu], 3, 'fixture'); passAll(s);
  assert.equal(count(s, 'divine_power', 'PRESSURE OF THE DEEP'), 2);
});

test('D264: Devotee do próprio Poseidon selado não dispara Pressure', () => {
  const {s, ctx, field} = setup();
  awaken(s);
  addSeal(s, ctx, [field('B', '003')], 1, 'fixture');
  assert.equal(s.chain.length, 0);
});

test('D265/D266/D233: Mill fica com quem controlava no Seal; gatilho resolve mesmo se o Devotee saiu; deck curto não dá Fatigue', () => {
  const {s, ctx, field} = setup();
  const seiya = field('A', '001');
  awaken(s);
  s.players.A.tartarus.push(...s.players.A.deck.splice(1)); // A fica com 1 carta
  addSeal(s, ctx, [seiya], 1, 'fixture');
  destroyDevotee(s, seiya, ctx.objects, ctx.attached);
  const handB = s.players.B.hand.length;
  passAll(s);
  assert.equal(s.players.A.deck.length, 0);
  assert.deepEqual(s.events.filter(e => e.type === 'mill').map(e => [e.player, e.requested, e.moved]), [['A', 2, 1]]);
  assert.equal(count(s, 'fatigue'), 0);
  assert.equal(s.players.B.hand.length, handB + 1, 'D234: a compra independe do Mill');
});

// ---------- Great Flood ----------
function floodSetup() {
  const picks = [];
  const env = setup({decide: (player, q) => {
    if (q.choose === 'base') { picks.push(['base', player]); return q.options[0]; }
    if (q.choose === 'discard') { picks.push(['discard', player, q.count]); return q.options.slice(0, q.count); }
    return true;
  }});
  const {s, ctx, field, take, bases} = env;
  const seiya = field('A', '001'), jabu = field('A', '028'), cloth = take('A', '002');
  s.players.A.battlefield.push(cloth); ctx.attached[cloth] = seiya;
  bases('A', 3);
  s.players.A.hand.push(take('A', '021'), take('A', '053'));
  endTurn(s); passAll(s); startTurn(s); // turno de B
  bases('B', 8);
  return {...env, seiya, jabu, cloth, picks};
}

test('D207/D231/D232/D253/G3-034: Great Flood devolve Devotees e Equipment juntos, uma Base por Devotee, descarta metade, Mill 3 por descarte', () => {
  const {s, ctx, seiya, jabu, cloth, picks} = floodSetup();
  const handBefore = s.players.A.hand.length, deck = s.players.A.deck.length;
  announceGreatFlood(s, ctx, 'B'); passAll(s);
  assert.equal(s.players.A.battlefield.length, 0);
  assert.equal(Object.keys(ctx.attached).length, 0);
  assert.equal(s.players.A.bases.length, 1, '2 Devotees devolvidos → 2 Bases');
  const hand = handBefore + 3 + 2, discard = Math.ceil(hand / 2);
  assert.equal(s.players.A.hand.length, hand - discard);
  assert.equal(s.players.A.deck.length, deck - 3 * discard);
  assert.ok([seiya, jabu, cloth].every(uid => s.players.A.hand.includes(uid) || s.players.A.tartarus.includes(uid)));
  assert.deepEqual(picks.map(p => p.slice(0, 2)), [['base', 'A'], ['base', 'A'], ['discard', 'A']], 'D231: quem controla as Bases escolhe; G3-034: quem descarta escolhe');
  assert.equal(s.divine.B.ultimateUsed, true);
});

test('G3-005/006: Great Flood custo 8 em Base; anúncio ilegal não gasta nada; uma por partida', () => {
  const {s, ctx} = floodSetup();
  s.players.B.bases[0].prepared = false;
  assert.equal(greatFloodBlock(s, 'B'), 'cost');
  assert.throws(() => announceGreatFlood(s, ctx, 'B'), RuleError);
  assert.equal(s.divine.B.ultimateUsed, false);
  s.players.B.bases[0].prepared = true;
  announceGreatFlood(s, ctx, 'B'); passAll(s);
  assert.equal(greatFloodBlock(s, 'B'), 'used');
});

test('G3-034: Poseidon não escolhe a mão adversária; resposta fora das opções é recusada; timeout usa G3-030', () => {
  const {s, ctx} = floodSetup();
  const asked = [];
  ctx.decide = (player, q) => {
    asked.push([player, q.choose]);
    if (q.choose === 'discard') return timeoutAutoChoice(s, {player, options: q.options, count: q.count, legal: o => s.players[player].hand.includes(o)});
    return q.options[0];
  };
  announceGreatFlood(s, ctx, 'B'); passAll(s);
  assert.ok(asked.every(([player]) => player === 'A'));
  const auto = s.events.find(e => e.type === 'TIMEOUT_AUTO_CHOICE');
  assert.deepEqual(s.events.find(e => e.type === 'discarded').uids, auto.result);
  assert.deepEqual(auto.result, [...auto.eligible].slice(0, auto.count), 'menor id estável primeiro');
});

test('G3-034: descarte inválido (carta fora da mão) é erro de regra, não escolha automática', () => {
  const {s, ctx} = floodSetup();
  ctx.decide = (player, q) => (q.choose === 'discard' ? ['B:999:1'] : q.options[0]);
  announceGreatFlood(s, ctx, 'B');
  assert.throws(() => passAll(s), RuleError);
});

// ---------- Catálogo ----------
test('Loader Poseidon V6: nenhuma carta canônica; as 4 fichas recuperadas ficam PARCIAL e bloqueadas em deck oficial', () => {
  const catalog = loadPoseidonCatalog(inventory);
  assert.equal(catalog.official.size, 0);
  assert.deepEqual(catalog.blocked.map(b => [b.card_id, b.state]), [
    ['poseidon-v6-091', 'PARCIAL'], ['poseidon-v6-092', 'PARCIAL'], ['poseidon-v6-093', 'PARCIAL'], ['poseidon-v6-094', 'PARCIAL']]);
  assert.equal(catalog.god.soul, cards.get('god-poseidon').soul);
  const deck = {...fortress, main_deck: [...fortress.main_deck.slice(0, -1), {card_id: 'poseidon-v6-091', quantity: 3}]};
  assert.ok(officialDeckErrors(deck, canonIndex(canon), catalog).some(e => e.code === 'incomplete' && e.card_id === 'poseidon-v6-091'));
  assert.deepEqual(officialDeckErrors(fortress, canonIndex(canon), catalog), [], 'D171: deck só com cartas canônicas passa');
});

test('God Poseidon canônico: Soul 27, Attack 2, Awaken 4', () => {
  const g = cards.get('god-poseidon');
  assert.deepEqual([g.soul, g.atk, g.awaken], [27, 2, 4]);
});

// ---------- Duelo ----------
// FIXTURE de duelo Athena × Poseidon: Pegasus Rush (God Athena) contra Dragon Fortress pilotado pelo God Poseidon.
// Bot simples e determinístico: coloca Base, joga o Devotee mais barato que puder, ataca o God com tudo, Water Prison sempre.
test('Duelo FIXTURE Athena × Poseidon: partida reproduzível até o fim, Water Prison e Seal acontecem, invariantes ok', () => {
  const run = seed => {
    const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-poseidon'}, first: 'A', seed});
    const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached, decide: () => true};
    mulligan(m, 'A', []); mulligan(m, 'B', []);
    for (let turn = 0; turn < 60 && !s.victory; turn++) {
      startTurn(s); passAll(s);
      if (s.victory) break;
      const key = s.active, p = s.players[key];
      const base = p.hand.find(uid => cards.get(m.objects[uid].cardId).cosmoble);
      if (base) placeBase(s, key, base, cards.get(m.objects[base].cardId));
      for (const uid of [...p.hand].filter(u => cards.get(m.objects[u].cardId).kind === 'Devotee').sort()) {
        if (duplicateCharacter(s, ctx, key, uid)) continue; // bot não troca um personagem por ele mesmo (§63)
        try { playDevotee(s, ctx, key, uid); passAll(s); } catch (e) { if (!(e instanceof RuleError)) throw e; }
      }
      for (const uid of p.battlefield.filter(u => cards.get(m.objects[u].cardId).kind === 'Devotee')) {
        if (s.victory || !s.units[uid]) continue;
        const target = strikeTargets(s, ctx, uid).find(t => t.kind === 'god') ?? strikeTargets(s, ctx, uid)[0];
        if (target) { declareStrike(s, ctx, uid, target); passAll(s); }
      }
      if (s.victory) break;
      endTurn(s); passAll(s);
      checkInvariants(s, m.objects);
    }
    return s;
  };
  const a = run(11), b = run(11);
  assert.deepEqual(a.events.map(e => e.type), b.events.map(e => e.type), 'mesma seed, mesma partida');
  assert.ok(a.victory, 'a partida termina');
  assert.ok(count(a, 'divine_power', 'WATER PRISON') > 0);
  assert.ok(count(a, 'seal_added') > 0 && count(a, 'seal_removed') > 0);
});
