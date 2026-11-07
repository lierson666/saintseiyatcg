// Domains (rebalanceamento aprovado pelo autor em 01/11/2026, docs/domains-rebalance-proposta.md): 30 Domains, 6 por Deus.
// Cada Domain: linha geral (vale com qualquer God) + Ressonância (só com God da facção do Domain, uma vez por turno).
// Para cada Domain: a linha geral, a Ressonância com o God da facção e a Ressonância barrada com outro God.
// node --test tools/test-engine-v3-domains.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, addSeal, placeBase} from '../playtest/engine-v3/core.js';
import {activate, playSpell} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {bindContext, V6} from '../playtest/engine-v3/v6/registry.js';
import * as k from '../playtest/engine-v3/v6/kit.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = [...read('./fixtures/decks-preview.json').decks, ...read('./fixtures/decks-competitivos.json').decks];
const deck = id => ({...decks.find(d => d.id === id)});
const DECK = {athena: 'comp-athena-cloth-voltron', poseidon: 'preview-poseidon-tide', hades: 'preview-hades-108', ares: 'preview-ares-legions', artemis: 'preview-artemis-hunt'};
const faction = id => id.split('-')[0];
// God de outra facção (Ressonância barrada).
const otherGod = domain => (faction(domain) === 'athena' ? 'god-hades' : 'god-athena');

// A joga com o Domain `domain` e o God `god` (padrão: o da facção); B, Ares sem Domain. Cartas avulsas por `field`/`put`.
function setup(domain, god = `god-${faction(domain)}`) {
  const m = createMatch({cards, canonIndex: index, decks: {A: deck(DECK[faction(domain)]), B: deck('preview-ares-legions')}, gods: {A: god, B: 'god-ares'}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  bindContext(s, ctx);
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: domain, B: null};
  startTurn(s); passAll(s);
  p.bases = p.deck.splice(0, 6).map(uid => ({uid, prepared: true}));
  let n = 0;
  const put = (key, cardId, zone = 'hand') => {
    const uid = `${key}:t${++n}:${cardId.slice(-3)}`;
    m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  const field = (key, cardId) => put(key, cardId, 'battlefield');
  ctx.decide = (player, q) => (q.options ? (q.count ? q.options.slice(0, q.count) : q.options[0]) : true);
  const ready = () => p.bases.filter(b => b.prepared).length;
  const strike = (attacker, target) => { s.active = k.controllerOf(s, attacker); declareStrike(s, ctx, attacker, target); passAll(s); s.active = 'A'; };
  return {s, ctx, p, B: s.players.B, put, field, ready, strike};
}
const res = (s, ctx, choice = {}) => { activate(s, ctx, 'A', 'domain:A:res', choice); passAll(s); };
const general = (s, ctx) => { activate(s, ctx, 'A', 'domain:A'); passAll(s); };
const god = player => ({kind: 'god', player});
const dev = uid => ({kind: 'devotee', uid});
// Ressonância ativada: com outro God a engine recusa; com o da facção, a segunda no mesmo turno também.
function gate(domain, prepare = () => {}) {
  const off = setup(domain, otherGod(domain));
  prepare(off);
  assert.throws(() => activate(off.s, off.ctx, 'A', 'domain:A:res'), /facção/, `${domain}: Ressonância barrada com outro God`);
}
const twice = (s, ctx) => assert.throws(() => activate(s, ctx, 'A', 'domain:A:res'), /Round/);

test('30 Domains no engine: 146, 147 e 148 saíram; cada Domain tem Ressonância', () => {
  for (const id of ['poseidon-v6-146', 'poseidon-v6-147', 'poseidon-v6-148']) assert.equal(V6[id], undefined, id);
  const ids = ['athena-v6-062', 'athena-v6-063', 'athena-v6-064', 'athena-v6-065', 'athena-v6-501', 'athena-v6-520',
    'poseidon-v6-142', 'poseidon-v6-143', 'poseidon-v6-144', 'poseidon-v6-145', 'poseidon-v6-149', 'poseidon-v6-502',
    'hades-v6-242', 'hades-v6-243', 'hades-v6-244', 'hades-v6-245', 'hades-v6-521', 'hades-v6-522',
    'ares-v6-332', 'ares-v6-333', 'ares-v6-334', 'ares-v6-335', 'ares-v6-503', 'ares-v6-523',
    'artemis-v6-427', 'artemis-v6-428', 'artemis-v6-429', 'artemis-v6-430', 'artemis-v6-504', 'artemis-v6-524'];
  for (const id of ids) assert.ok(V6[id]?.res || V6[id]?.resonance, `${id}: Ressonância`);
  for (const id of ids) assert.equal(V6[id].opg, undefined, `${id}: sem Once per game`);
});

// ---------- Athena ----------
test('062 Galaxian Wars Arena: Bronze Saint derrota no Strike, +1 ATK (qualquer God); Ressonância +2/+2 no Bronze Saint', () => {
  for (const g of ['god-athena', 'god-hades']) {
    const {s, ctx, field, strike} = setup('athena-v6-062', g);
    const saint = field('A', 'athena-v6-028'), foe = field('B', 'artemis-v6-386');
    const atk = k.atkOf(s, ctx, saint);
    strike(saint, dev(foe));
    assert.ok(!s.players.B.battlefield.includes(foe));
    assert.equal(k.atkOf(s, ctx, saint), atk + 1, g);
  }
  const {s, ctx, field, ready} = setup('athena-v6-062');
  const saint = field('A', 'athena-v6-028'), atk = k.atkOf(s, ctx, saint), hp = k.hpOf(s, ctx, saint), r = ready();
  res(s, ctx);
  assert.equal(k.atkOf(s, ctx, saint), atk + 2);
  assert.equal(k.hpOf(s, ctx, saint), hp + 2);
  assert.equal(ready(), r - 2, '{2}{C}');
  twice(s, ctx);
  gate('athena-v6-062', o => o.field('A', 'athena-v6-028'));
});

test('063 Jamir Tower: {1}{C} remove 1 dano de Devotee com Armor; Ressonância devolve Armor do Tartarus à mão', () => {
  const {s, ctx, p, field, put} = setup('athena-v6-063', 'god-hades'); // linha geral: qualquer God
  const saint = field('A', 'athena-v6-028'), armor = field('A', 'athena-v6-002');
  ctx.attached[armor] = saint; s.units[saint].damage = 2;
  general(s, ctx);
  assert.equal(s.units[saint].damage, 1);
  const r = setup('athena-v6-063'), dead = r.put('A', 'athena-v6-004', 'tartarus');
  res(r.s, r.ctx);
  assert.ok(r.p.hand.includes(dead));
  gate('athena-v6-063', o => o.put('A', 'athena-v6-004', 'tartarus'));
  assert.ok(p && put);
});

test('064 The Five Old Peaks: Saint com Guardian +0/+1 (qualquer God); Ressonância dá Guardian e remove 1 dano', () => {
  const run = (domain, g) => { const {s, ctx, field} = setup(domain ?? 'athena-v6-064', g); s.domains.A = domain; return k.hpOf(s, ctx, field('A', 'athena-v6-011')); };
  assert.equal(run('athena-v6-064', 'god-hades'), run(null, 'god-hades') + 1);
  const {s, ctx, field} = setup('athena-v6-064');
  const saint = field('A', 'athena-v6-028'); s.units[saint].damage = 1;
  res(s, ctx);
  assert.ok(k.keywordsOf(s, ctx, saint).includes('Guardian'));
  assert.equal(s.units[saint].damage, 0);
  gate('athena-v6-064', o => o.field('A', 'athena-v6-028'));
});

test('065 The Stairway: Saint sobrevive a um Strike e pode pagar {1}{C} por +1 ATK; Ressonância +1 ATK nos Saints', () => {
  const {s, ctx, field, strike, ready} = setup('athena-v6-065', 'god-hades');
  const saint = field('A', 'athena-v6-028'), foe = field('B', 'athena-v6-027');
  k.buff(s, saint, 0, 10);
  const atk = k.atkOf(s, ctx, saint), r = ready();
  strike(saint, dev(foe));
  assert.equal(k.atkOf(s, ctx, saint), atk + 1);
  assert.equal(ready(), r - 1);
  const o = setup('athena-v6-065'), a = o.field('A', 'athena-v6-028'), b = o.field('A', 'athena-v6-011');
  const atkA = k.atkOf(o.s, o.ctx, a), atkB = k.atkOf(o.s, o.ctx, b);
  res(o.s, o.ctx);
  assert.deepEqual([k.atkOf(o.s, o.ctx, a), k.atkOf(o.s, o.ctx, b)], [atkA + 1, atkB + 1]);
  assert.equal(o.ready(), 6 - 3);
  gate('athena-v6-065');
});

test("501 Athena's Statue: no seu turno põe 1 carta da mão no Void, perde {2}{S} e compra; Ressonância: Saint sobrevive, paga {1}{C}, +2 Soul", () => {
  const {s, ctx, p, put} = setup('athena-v6-501', 'god-hades');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A'), /mão/, 'sem carta na mão: drawback não pago, não compra');
  put('A', 'athena-v6-028');
  const soul = p.soul, deckN = p.deck.length;
  general(s, ctx);
  assert.equal(p.void.length, 1);
  assert.equal(p.hand.length, 1, 'trocou a carta por uma comprada');
  assert.equal(p.deck.length, deckN - 1);
  assert.equal(p.soul, soul - 2);
  assert.throws(() => activate(s, ctx, 'A', 'domain:A'), /Round/);
  const survive = g => {
    const o = setup('athena-v6-501', g), saint = o.field('A', 'athena-v6-028'), foe = o.field('B', 'athena-v6-027');
    k.buff(o.s, saint, 0, 10); o.p.soul -= 5;
    const soul0 = o.p.soul;
    o.strike(saint, dev(foe));
    return o.p.soul - soul0;
  };
  assert.equal(survive('god-athena'), 2);
  assert.equal(survive('god-hades'), 0, 'Ressonância barrada com outro God');
});

test('520 The Sanctuary Gates: primeiro Strike inimigo no seu God, -1 ATK; Ressonância previne 3 até o seu próximo turno', () => {
  const {s, ctx, p, field, strike} = setup('athena-v6-520', 'god-hades');
  const a = field('B', 'athena-v6-027'), b = field('B', 'athena-v6-028');
  const soul = p.soul;
  strike(a, god('A'));
  assert.equal(p.soul, soul - (k.atkOf(s, ctx, a) - 1), 'primeiro: -1 ATK');
  strike(b, god('A'));
  assert.equal(p.soul, soul - (k.atkOf(s, ctx, a) - 1) - k.atkOf(s, ctx, b), 'segundo: sem redução');
  const o = setup('athena-v6-520');
  res(o.s, o.ctx);
  const sh = o.s.effects.find(e => e.kind === 'prevent' && e.target === 'god:A');
  assert.equal(sh.amount, 3); assert.equal(sh.duration, 'until_next_turn'); assert.equal(sh.owner, 'A');
  endTurn(o.s); passAll(o.s); startTurn(o.s); passAll(o.s); // turno de B: o escudo continua
  assert.equal(o.s.active, 'B');
  assert.ok(o.s.effects.includes(sh));
  endTurn(o.s); passAll(o.s); startTurn(o.s); passAll(o.s); // próximo turno de A: vence
  assert.equal(o.s.active, 'A');
  assert.ok(!o.s.effects.some(e => e.target === 'god:A' && e.duration === 'until_next_turn'));
  gate('athena-v6-520');
});

// ---------- Poseidon ----------
test('142 The Undersea Sanctuary: compra, descarta 1 e mói 4 (sem 5 no deck, não usa); Ressonância: Moment/Technique, paga {2}{C} e compra', () => {
  const {s, ctx, p, put} = setup('poseidon-v6-142', 'god-athena');
  put('A', 'poseidon-v6-133');
  const deckN = p.deck.length, hand = p.hand.length, tart = p.tartarus.length;
  general(s, ctx);
  assert.equal(p.hand.length, hand);
  assert.equal(p.deck.length, deckN - 5);
  assert.equal(p.tartarus.length, tart + 5, '1 descarte + 4 moídas');
  const short = setup('poseidon-v6-142', 'god-athena');
  short.p.deck.splice(4);
  assert.throws(() => activate(short.s, short.ctx, 'A', 'domain:A'), /deck/);
  const cast = g => {
    const o = setup('poseidon-v6-142', g), spell = o.put('A', 'poseidon-v6-135');
    const hand0 = o.p.hand.length;
    playSpell(o.s, o.ctx, 'A', spell, {}); passAll(o.s);
    return o.p.hand.length - hand0;
  };
  assert.equal(cast('god-poseidon'), cast('god-athena') + 1);
});

test('143 The North Atlantic Pillar: devolver Devotee inimigo faz o controlador moer 1; Ressonância devolve inimigo de custo 3 ou menos', () => {
  const {s, ctx, B, field, put} = setup('poseidon-v6-143', 'god-athena');
  const foe = field('B', 'athena-v6-027'), deckB = B.deck.length;
  playSpell(s, ctx, 'A', put('A', 'poseidon-v6-508'), {}); passAll(s); // Undertow
  assert.ok(B.hand.includes(foe));
  assert.equal(B.deck.length, deckB - 1);
  const o = setup('poseidon-v6-143'), f2 = o.field('B', 'athena-v6-027'), big = o.field('B', 'athena-v6-011');
  res(o.s, o.ctx);
  assert.ok(o.B.hand.includes(f2));
  assert.ok(o.B.battlefield.includes(big), 'custo 5: não é alvo');
  gate('poseidon-v6-143', x => x.field('B', 'athena-v6-027'));
});

test('144 The South Atlantic Pillar: Strike inimigo, paga {1}{C} e ele tem -1 ATK; Ressonância põe um Seal', () => {
  const {s, ctx, p, field, strike, ready} = setup('poseidon-v6-144', 'god-athena');
  const foe = field('B', 'athena-v6-027'), soul = p.soul, r = ready();
  strike(foe, god('A'));
  assert.equal(p.soul, soul - (k.atkOf(s, ctx, foe) - 1));
  assert.equal(ready(), r - 1);
  const o = setup('poseidon-v6-144'), t = o.field('B', 'athena-v6-027');
  res(o.s, o.ctx);
  assert.equal(o.s.units[t].seal, 1);
  gate('poseidon-v6-144', x => x.field('B', 'athena-v6-027'));
});

test('145 The North Pacific Pillar: paga {1}{C} e previne 1 do dano de Strike; Ressonância previne todo até o seu próximo turno', () => {
  const {s, field, strike} = setup('poseidon-v6-145', 'god-athena');
  const mine = field('A', 'athena-v6-028'), foe = field('B', 'athena-v6-027');
  strike(foe, dev(mine));
  assert.equal(s.units[mine].damage, 1, '2 de dano, 1 prevenido');
  const o = setup('poseidon-v6-145'), m2 = o.field('A', 'athena-v6-028'), f2 = o.field('B', 'athena-v6-027');
  res(o.s, o.ctx);
  assert.ok(o.s.effects.some(e => e.kind === 'prevent' && e.target === m2 && e.amount === Infinity && e.duration === 'until_next_turn'));
  o.strike(f2, dev(m2));
  assert.equal(o.s.units[m2].damage, 0);
  gate('poseidon-v6-145', x => x.field('A', 'athena-v6-028'));
});

test('149 The Abyssal Trench: inimigo fica Sealed e o controlador mói 2; Ressonância: o oponente mói 3', () => {
  const {s, ctx, B, field} = setup('poseidon-v6-149', 'god-athena');
  const deckB = B.deck.length;
  addSeal(s, ctx, [field('B', 'athena-v6-027')], 1, 'TEST'); passAll(s);
  assert.equal(B.deck.length, deckB - 2);
  const o = setup('poseidon-v6-149'), d0 = o.B.deck.length;
  res(o.s, o.ctx);
  assert.equal(o.B.deck.length, d0 - 3);
  gate('poseidon-v6-149');
});

test('502 The Tidal Archive: Sealed olha o topo; Ressonância paga {1}{C} e compra, uma vez por turno (também no turno do oponente)', () => {
  const {s, ctx, p, field} = setup('poseidon-v6-502', 'god-athena');
  const top = p.deck[0], hand = p.hand.length;
  addSeal(s, ctx, [field('B', 'athena-v6-027')], 1, 'TEST'); passAll(s);
  assert.equal(p.deck.at(-1), top, 'topo foi para o fundo');
  assert.equal(p.hand.length, hand, 'sem Ressonância: não compra');
  const o = setup('poseidon-v6-502'), h0 = o.p.hand.length;
  const second = o.field('B', 'athena-v6-028'); // personagens diferentes (unicidade, §63)
  addSeal(o.s, o.ctx, [o.field('B', 'athena-v6-027')], 1, 'TEST'); passAll(o.s);
  addSeal(o.s, o.ctx, [second], 1, 'TEST'); passAll(o.s);
  assert.equal(o.s.units[second].seal, 1);
  assert.equal(o.p.hand.length, h0 + 1, 'uma vez por turno');
  endTurn(o.s); passAll(o.s); startTurn(o.s); passAll(o.s); // turno de B (mesmo Round)
  o.p.bases.forEach(b => { b.prepared = true; });
  const h1 = o.p.hand.length;
  addSeal(o.s, o.ctx, [o.field('B', 'athena-v6-011')], 1, 'TEST'); passAll(o.s);
  assert.equal(o.p.hand.length, h1 + 1, 'outro turno: compra de novo');
});

// ---------- Hades ----------
test('242 Hades Castle: Specter amigo derrotado, God inimigo perde 1; Ressonância devolve Specter de custo 3 ou menos à mão', () => {
  const {s, ctx, B, field} = setup('hades-v6-242', 'god-athena');
  const sp = field('A', 'hades-v6-207'), soul = B.soul;
  k.defeat(s, ctx, sp); passAll(s);
  assert.equal(B.soul, soul - 1);
  const o = setup('hades-v6-242'), dead = o.put('A', 'hades-v6-207', 'tartarus');
  res(o.s, o.ctx);
  assert.ok(o.p.hand.includes(dead));
  gate('hades-v6-242', x => x.put('A', 'hades-v6-207', 'tartarus'));
});

test('243 The River Acheron: no seu turno perde {3}{S} e compra; Ressonância: Devotee volta do Tartarus à mão, paga {1}{C}, +2 Soul', () => {
  const {s, ctx, p} = setup('hades-v6-243', 'god-athena');
  const soul = p.soul, hand = p.hand.length;
  general(s, ctx);
  assert.equal(p.soul, soul - 3);
  assert.equal(p.hand.length, hand + 1);
  const poor = setup('hades-v6-243', 'god-athena'); poor.p.soul = 2;
  assert.throws(() => activate(poor.s, poor.ctx, 'A', 'domain:A'), /Soul/);
  const recall = g => {
    const o = setup('hades-v6-243', g), dead = o.put('A', 'hades-v6-207', 'tartarus');
    o.p.soul -= 5;
    const soul0 = o.p.soul;
    k.toHand(o.s, o.ctx, dead, 'tartarus'); passAll(o.s);
    return o.p.soul - soul0;
  };
  assert.equal(recall('god-hades'), 2);
  assert.equal(recall('god-athena'), 0);
});

test('244 The First Prison: oponente descarta e perde 1 Soul; Ressonância faz o oponente descartar', () => {
  const {s, ctx, B, put} = setup('hades-v6-244', 'god-athena');
  put('B', 'athena-v6-027');
  const soul = B.soul;
  k.discard(s, ctx, 'B', 1); passAll(s);
  assert.equal(B.soul, soul - 1);
  const o = setup('hades-v6-244'), c = o.put('B', 'athena-v6-027');
  res(o.s, o.ctx);
  assert.ok(o.B.tartarus.includes(c));
  gate('hades-v6-244');
});

test('245 The Gates of the Underworld: primeiro retorno do Tartarus ao campo, +1 ATK; Ressonância põe Specter de custo 2 ou menos no campo Unprepared', () => {
  const {s, ctx, field, put} = setup('hades-v6-245', 'god-athena');
  const dead = put('A', 'hades-v6-207', 'tartarus'), atk = cards.get('hades-v6-207').atk;
  k.putOntoField(s, ctx, 'A', dead, 'tartarus'); passAll(s);
  assert.equal(k.atkOf(s, ctx, dead), atk + 1);
  const o = setup('hades-v6-245'), d2 = o.put('A', 'hades-v6-207', 'tartarus');
  res(o.s, o.ctx);
  assert.ok(o.p.battlefield.includes(d2));
  assert.equal(o.s.units[d2].prepared, false);
  gate('hades-v6-245', x => x.put('A', 'hades-v6-207', 'tartarus'));
  assert.ok(field);
});

test('521 Cocytus: Devotee amigo derrotado, alvo inimigo -1 ATK; Ressonância sacrifica um amigo e derrota inimigo de custo 3 ou menos', () => {
  const {s, ctx, field} = setup('hades-v6-521', 'god-athena');
  const mine = field('A', 'hades-v6-207'), foe = field('B', 'athena-v6-027'), atk = k.atkOf(s, ctx, foe);
  k.defeat(s, ctx, mine); passAll(s);
  assert.equal(k.atkOf(s, ctx, foe), atk - 1);
  const o = setup('hades-v6-521'), m2 = o.field('A', 'hades-v6-207'), f2 = o.field('B', 'athena-v6-027');
  res(o.s, o.ctx);
  assert.ok(o.p.tartarus.includes(m2), 'sacrificou');
  assert.ok(o.B.tartarus.includes(f2), 'derrotou');
  gate('hades-v6-521', x => { x.field('A', 'hades-v6-207'); x.field('B', 'athena-v6-027'); });
});

test('522 Elysion: Specters amigos +1 ATK com o God em 12 Soul ou menos; Ressonância -2/-2 no inimigo', () => {
  const {s, ctx, p, field} = setup('hades-v6-522', 'god-athena');
  const sp = field('A', 'hades-v6-207'), atk = cards.get('hades-v6-207').atk;
  assert.equal(k.atkOf(s, ctx, sp), atk);
  p.soul = 12;
  assert.equal(k.atkOf(s, ctx, sp), atk + 1);
  const o = setup('hades-v6-522'), foe = o.field('B', 'athena-v6-027');
  const fa = k.atkOf(o.s, o.ctx, foe), fh = k.hpOf(o.s, o.ctx, foe);
  res(o.s, o.ctx);
  assert.deepEqual([k.atkOf(o.s, o.ctx, foe), k.hpOf(o.s, o.ctx, foe)], [fa - 2, fh - 2]);
  gate('hades-v6-522', x => x.field('B', 'athena-v6-027'));
});

// ---------- Ares ----------
// Dano ao God inimigo no Strike de um Berserker, com e sem o Domain (mesmo God).
const godHit = (domain, g, prep = () => {}) => {
  const {s, ctx, B, field, strike} = setup(domain ?? 'ares-v6-332', g);
  s.domains.A = domain;
  const b = field('A', 'ares-v6-294'), soul = B.soul;
  prep({s, ctx, b, field});
  strike(b, god('B'));
  return soul - B.soul;
};

test("332 Ares' War Temple: o primeiro Berserker que declara Strike no Round, +1 ATK nesse Strike; Ressonância +1 ATK nos Berserkers", () => {
  assert.equal(godHit('ares-v6-332', 'god-athena'), godHit(null, 'god-athena') + 1);
  const {s, ctx, field, strike} = setup('ares-v6-332', 'god-athena');
  const a = field('A', 'ares-v6-294'), b = field('A', 'ares-v6-294'), atk = k.atkOf(s, ctx, b);
  strike(a, god('B'));
  const soul = s.players.B.soul;
  strike(b, god('B'));
  assert.equal(soul - s.players.B.soul, atk, 'o segundo Strike do Round não ganha');
  assert.equal(k.atkOf(s, ctx, a), cards.get('ares-v6-294').atk, 'só durante o Strike');
  const o = setup('ares-v6-332'), x = o.field('A', 'ares-v6-294'), ax = k.atkOf(o.s, o.ctx, x);
  res(o.s, o.ctx);
  assert.equal(k.atkOf(o.s, o.ctx, x), ax + 1);
  gate('ares-v6-332');
});

test('333 The Burning Battlefield: Berserker declara Strike, paga {1}{S} e causa 1 a um Devotee inimigo; Ressonância 1 em cada inimigo', () => {
  const {s, ctx, p, field, strike} = setup('ares-v6-333', 'god-athena');
  const b = field('A', 'ares-v6-294'), foe = field('B', 'athena-v6-011'), soul = p.soul;
  k.buff(s, foe, 0, 10);
  strike(b, dev(foe));
  assert.equal(p.soul, soul - 1);
  assert.equal(s.units[foe].damage, 1 + k.atkOf(s, ctx, b));
  const o = setup('ares-v6-333'), f1 = o.field('B', 'athena-v6-011'), f2 = o.field('B', 'athena-v6-027'); // personagens diferentes (unicidade, §63)
  res(o.s, o.ctx);
  assert.deepEqual([o.s.units[f1].damage, o.s.units[f2].damage], [1, 1]);
  gate('ares-v6-333');
});

test('334 The Arena of Blood: Berserker derrota inimigo no combate, +1 ATK; Ressonância +2 ATK e Impulse até o fim do turno e 3 de dano a Ares', () => {
  const {s, ctx, field, strike} = setup('ares-v6-334', 'god-athena');
  const b = field('A', 'ares-v6-294'), foe = field('B', 'artemis-v6-386'), atk = k.atkOf(s, ctx, b);
  strike(b, dev(foe));
  assert.equal(k.atkOf(s, ctx, b), atk + 1);
  const o = setup('ares-v6-334'), x = o.field('A', 'ares-v6-294');
  o.s.units[x] = {prepared: false, damage: 0, entered: o.s.turn}; // entrou neste turno
  const ax = k.atkOf(o.s, o.ctx, x), soul = o.s.players.A.soul;
  res(o.s, o.ctx);
  assert.equal(k.atkOf(o.s, o.ctx, x), ax + 2);
  assert.equal(o.s.players.A.soul, soul - 3, 'Ressonância causa 3 de dano a Ares (autor, 07/11/2026)');
  assert.ok(k.keywordsOf(o.s, o.ctx, x).includes('Impulse'));
  assert.equal(o.s.units[x].prepared, true, 'Impulse: pode atacar neste turno');
  assert.ok(o.s.effects.some(e => e.target === x && e.duration === 'this_turn'));
  gate('ares-v6-334', y => y.field('A', 'ares-v6-294'));
});

test('335 The Fields of Carnage: Berserker amigo derrotado, paga {1}{S} e o God inimigo perde {1}{S}; Ressonância 2 de dano', () => {
  const {s, ctx, p, B, field} = setup('ares-v6-335', 'god-athena');
  const b = field('A', 'ares-v6-294'), soulA = p.soul, soulB = B.soul;
  s.units[b].damage = 99; k.checkDefeats(s, ctx); passAll(s);
  assert.equal(p.soul, soulA - 1);
  assert.equal(B.soul, soulB - 1);
  assert.ok(s.events.some(e => e.type === 'soul_lost' && e.player === 'B' && e.cause === 'loss'), 'perda, não dano');
  const o = setup('ares-v6-335'), foe = o.field('B', 'athena-v6-011');
  res(o.s, o.ctx);
  assert.equal(o.s.units[foe].damage, 2);
  gate('ares-v6-335', y => y.field('B', 'athena-v6-011'));
});

test('503 The Altar of Slaughter: sacrifica um amigo e perde {2}{S} para comprar; Ressonância {1}{C} + sacrifício, 2 de dano', () => {
  const {s, ctx, p, field} = setup('ares-v6-503', 'god-athena');
  assert.throws(() => activate(s, ctx, 'A', 'domain:A'), /sacrificar/);
  const mine = field('A', 'ares-v6-294'), soul = p.soul, hand = p.hand.length;
  general(s, ctx);
  assert.ok(p.tartarus.includes(mine));
  assert.equal(p.soul, soul - 2);
  assert.equal(p.hand.length, hand + 1);
  const o = setup('ares-v6-503'), m2 = o.field('A', 'ares-v6-294'), foe = o.field('B', 'athena-v6-011');
  res(o.s, o.ctx);
  assert.ok(o.p.tartarus.includes(m2));
  assert.equal(o.s.units[foe].damage, 2);
  assert.equal(o.ready(), 6 - 1);
  gate('ares-v6-503', y => y.field('A', 'ares-v6-294'));
});

test('523 The Forge of War: Devotee com Equipment declara Strike, +1 ATK nesse Strike; Ressonância devolve Equipment do Tartarus à mão', () => {
  const withGear = ({b, field, ctx}) => { ctx.attached[field('A', 'ares-v6-315')] = b; };
  assert.equal(godHit('ares-v6-523', 'god-athena', withGear), godHit(null, 'god-athena', withGear) + 1);
  assert.equal(godHit('ares-v6-523', 'god-athena'), godHit(null, 'god-athena'), 'sem Equipment: nada');
  const o = setup('ares-v6-523'), gear = o.put('A', 'ares-v6-315', 'tartarus');
  res(o.s, o.ctx);
  assert.ok(o.p.hand.includes(gear));
  gate('ares-v6-523', y => y.put('A', 'ares-v6-315', 'tartarus'));
});

// ---------- Artemis ----------
test('427 Temple of the Moon: Satellites +0/+1 (qualquer God); Ressonância Training counter em cada Satellite', () => {
  const {s, ctx, field} = setup('artemis-v6-427', 'god-athena');
  const sat = field('A', 'artemis-v6-386');
  assert.equal(k.hpOf(s, ctx, sat), cards.get('artemis-v6-386').hp + 1);
  const o = setup('artemis-v6-427'), s2 = o.field('A', 'artemis-v6-386'), other = o.field('A', 'athena-v6-028');
  res(o.s, o.ctx);
  assert.equal(o.s.units[s2].training, 1);
  assert.ok(!o.s.units[other].training);
  gate('artemis-v6-427');
});

test('428 The Sacred Forest: Devotee de custo 4+ entra, +1 Soul; Ressonância põe o topo do deck como Base Unprepared', () => {
  const {s, ctx, p} = setup('artemis-v6-428', 'god-athena');
  p.soul -= 5;
  const soul = p.soul, big = 'A:big:361';
  ctx.objects[big] = {owner: 'A', cardId: 'artemis-v6-361', armor: false}; p.deck.push(big);
  k.putOntoField(s, ctx, 'A', big, 'deck'); passAll(s);
  assert.equal(p.soul, soul + 1);
  const o = setup('artemis-v6-428'), top = o.p.deck[0], n = o.p.bases.length;
  res(o.s, o.ctx);
  assert.equal(o.p.bases.length, n + 1);
  assert.deepEqual(o.p.bases.at(-1), {uid: top, prepared: false});
  gate('artemis-v6-428');
});

test('429 The Ancient Grove: quem tem Training counter ganha +0/+1 ao declarar Strike, até o fim do turno; Ressonância: sobrevive, paga {2}{C} e ganha outro', () => {
  const {s, ctx, field} = setup('artemis-v6-429', 'god-athena');
  const u = field('A', 'athena-v6-028'), hp = k.hpOf(s, ctx, u);
  k.addCounter(s, u, 1);
  assert.equal(k.hpOf(s, ctx, u), hp + 1, 'só o marcador: o Domain não dá PV fixo');
  const survive = g => {
    const o = setup('artemis-v6-429', g), x = o.field('A', 'athena-v6-028'), foe = o.field('B', 'artemis-v6-386');
    k.addCounter(o.s, x, 1); k.buff(o.s, x, 0, 10);
    const hp0 = k.hpOf(o.s, o.ctx, x);
    o.strike(x, dev(foe));
    assert.equal(k.hpOf(o.s, o.ctx, x) - (o.s.units[x].training - 1), hp0 + 1, 'Strike declarado: +1 PV até o fim do turno');
    return o.s.units[x].training;
  };
  assert.equal(survive('god-artemis'), 2);
  assert.equal(survive('god-athena'), 1);
});

test('430 The Lunar Hunting Grounds: ATK 4+ declara Strike em Devotee, +1 nesse Strike; Ressonância dá Pierce ao ATK 4+', () => {
  const {s, ctx, field, strike} = setup('artemis-v6-430', 'god-athena');
  const hunter = field('A', 'artemis-v6-361'), foe = field('B', 'athena-v6-011');
  k.buff(s, foe, 0, 10);
  strike(hunter, dev(foe));
  assert.equal(s.units[foe].damage, k.atkOf(s, ctx, hunter) + 1);
  const o = setup('artemis-v6-430'), h2 = o.field('A', 'artemis-v6-361');
  res(o.s, o.ctx);
  assert.ok(k.keywordsOf(o.s, o.ctx, h2).includes('Pierce'));
  gate('artemis-v6-430', y => y.field('A', 'artemis-v6-361'));
});

test("504 The Hunter's Moon: perde todo o Latent e devolve uma Base à mão para comprar; Ressonância busca Devotee de custo 5+", () => {
  const {s, ctx, p} = setup('artemis-v6-504', 'god-athena');
  p.latent = 2;
  const bases = p.bases.length, hand = p.hand.length, base = p.bases[0].uid;
  general(s, ctx);
  assert.equal(p.latent, 0);
  assert.equal(p.bases.length, bases - 1);
  assert.ok(p.hand.includes(base));
  assert.equal(p.hand.length, hand + 2, 'a Base + a compra');
  const none = setup('artemis-v6-504', 'god-athena'); none.p.bases = [];
  assert.throws(() => activate(none.s, none.ctx, 'A', 'domain:A'), /Base/);
  const o = setup('artemis-v6-504');
  res(o.s, o.ctx);
  const got = o.p.hand.at(-1);
  assert.ok(cards.get(o.ctx.objects[got].cardId).cost.amount >= 5);
  assert.ok(o.s.events.some(e => e.type === 'shuffle' && e.player === 'A'));
  gate('artemis-v6-504');
});

test('524 The Night Vale: você põe uma Base, alvo amigo +1 ATK; Ressonância +2/+2', () => {
  const {s, ctx, p, field, put} = setup('artemis-v6-524', 'god-athena');
  const u = field('A', 'athena-v6-028'), atk = k.atkOf(s, ctx, u), c = put('A', 'artemis-v6-386');
  placeBase(s, 'A', c, {...cards.get('artemis-v6-386'), cosmoble: true}); passAll(s);
  assert.ok(p.bases.some(b => b.uid === c));
  assert.equal(k.atkOf(s, ctx, u), atk + 1);
  const o = setup('artemis-v6-524'), x = o.field('A', 'athena-v6-028');
  const ax = k.atkOf(o.s, o.ctx, x), hx = k.hpOf(o.s, o.ctx, x);
  res(o.s, o.ctx);
  assert.deepEqual([k.atkOf(o.s, o.ctx, x), k.hpOf(o.s, o.ctx, x)], [ax + 2, hx + 2]);
  twice(o.s, o.ctx);
  gate('artemis-v6-524', y => y.field('A', 'athena-v6-028'));
});

test('Ressonância paga em Cosmo: Base preparada primeiro, depois Latent', () => {
  const {s, ctx, p} = setup('poseidon-v6-149');
  p.bases.forEach((b, i) => { b.prepared = i < 1; }); p.latent = 2;
  res(s, ctx);
  assert.equal(p.bases.filter(b => b.prepared).length, 0);
  assert.equal(p.latent, 0);
});
