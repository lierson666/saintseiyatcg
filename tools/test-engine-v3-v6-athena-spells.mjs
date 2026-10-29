// Spells, Domains e Freezing Coffin (Camus) V6 de Athena: playtest/engine-v3/v6/athena-spells.js e athena.js.
// node --test tools/test-engine-v3-v6-athena-spells.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, runCheckpoint} from '../playtest/engine-v3/core.js';
import {playSpell, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, keywordsOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// A: Ares (Domain 332); B: sem Domain, só com cartas injetadas. Decisões: primeira opção (God se houver);
// "you may" sim para A, não para B.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached}, p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains.B = null;
  startTurn(s);
  p.bases = p.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? (q.options.find(o => String(o).startsWith('god:')) ?? q.options[0]) : player === 'A');
  let n = 0;
  // Cria a carta na zona pedida; no campo entra Prepared e sem dano.
  const give = (key, id, zone = 'battlefield', bearer) => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: false};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  return {s, ctx, give};
}
import {V6} from '../playtest/engine-v3/v6/hooks.js';

const A = n => `athena-v6-${n}`;
const FOE = 'artemis-v6-399';
// Event/Miracle ainda não passam por playSpell (hooks.js v6Spell): roda a resolução direto.
const cast = (s, ctx, n, key = 'A') => { V6[A(n)].spell.run(s, ctx, key, `${key}:spell:${n}`, {}); };
const endRound = s => { for (const t of s.delayed.splice(0)) t.run(s); };
const hp = (s, uid) => s.units[uid].damage;

test('Freezing Coffin (Camus): {2}{C}, {T} põe 2 Seal no Devotee inimigo', () => {
  const {s, ctx, give} = setup();
  const camus = give('A', A('017')), foe = give('B', FOE);
  activate(s, ctx, 'A', camus, {}); passAll(s);
  assert.equal(s.units[foe].seal, 2);
  assert.equal(s.units[camus].prepared, false);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, 8);
  assert.throws(() => activate(s, ctx, 'A', camus, {}));
});

test('055 Oath: Silver Saint +1/+2; Marin ou Shaina compra 1', () => {
  const {s, ctx, give} = setup();
  const marin = give('A', A('021')), hand = s.players.A.hand.length;
  const atk = atkOf(s, ctx, marin), life = hpOf(s, ctx, marin);
  cast(s, ctx, '055');
  assert.equal(atkOf(s, ctx, marin), atk + 1);
  assert.equal(hpOf(s, ctx, marin), life + 2);
  assert.equal(s.players.A.hand.length, hand + 1);
});

test('055 Oath: outro Silver Saint não compra', () => {
  const {s, ctx, give} = setup();
  const silver = [...Array(200).keys()].map(n => A(String(n + 1).padStart(3, '0'))).find(id => ctx.cards.get(id)?.kind === 'Devotee' && /Silver Saint/.test(ctx.cards.get(id).type) && !['021', '022'].includes(id.slice(-3)));
  give('A', silver);
  const hand = s.players.A.hand.length;
  cast(s, ctx, '055');
  assert.equal(s.players.A.hand.length, hand);
});

test('057 Telekinesis: devolve Equipment à mão; compra se controla Kiki', () => {
  const {s, ctx, give} = setup();
  const kiki = give('A', A('026')), gear = give('A', A('002'), 'battlefield', kiki), spell = give('A', A('057'), 'hand');
  const hand = s.players.A.hand.length;
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.ok(s.players.A.hand.includes(gear));
  assert.equal(s.players.A.hand.length, hand - 1 + 1 + 1); // gasta a Spell, recebe o Equipment e compra 1
  assert.equal(ctx.attached[gear], undefined);
});

test('078 Freezing Coffin (Spell): 2 Seal; 3 com Camus; já Sealed leva 2 de dano', () => {
  let {s, ctx, give} = setup();
  let foe = give('B', FOE), spell = give('A', A('078'), 'hand');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.equal(s.units[foe].seal, 2);
  assert.equal(hp(s, foe), 0);
  ({s, ctx, give} = setup());
  give('A', A('017')); foe = give('B', FOE); s.units[foe].seal = 1; spell = give('A', A('078'), 'hand');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.equal(s.units[foe].seal, 4);
  assert.equal(hp(s, foe), 2);
});

test('079 Shun: previne 4 de Strike no Saint; Shun protege também o God (2)', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', A('007'));
  cast(s, ctx, '079');
  assert.ok(s.effects.some(e => e.kind === 'prevent' && e.target === shun && e.amount === 4 && e.strikeOnly));
  assert.ok(s.effects.some(e => e.kind === 'prevent' && e.target === 'god:A' && e.amount === 2));
});

test('080 Phoenix: Bronze Saint volta Exhausted; Ikki ganha Rebirth e perde dano', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', A('009'), 'tartarus');
  cast(s, ctx, '080');
  assert.ok(s.players.A.battlefield.includes(ikki));
  assert.equal(s.units[ikki].prepared, false);
  assert.equal(hp(s, ikki), 0);
  assert.equal(s.units[ikki].markers.Rebirth, 1);
});

test('083 Twelve Flames: Flame + 1 ATK; no fim da rodada remove Flame e cura', () => {
  const {s, ctx, give} = setup();
  const a = give('A', A('007')); s.units[a].damage = 1;
  const atk = atkOf(s, ctx, a);
  cast(s, ctx, '083');
  assert.equal(s.units[a].markers.Flame, 1);
  assert.equal(atkOf(s, ctx, a), atk + 1);
  endRound(s);
  assert.equal(s.units[a].markers.Flame, 0);
  assert.equal(hp(s, a), 0);
});

test('084 Absolute Zero: 3 de dano, 5 se Sealed; com Hyoga põe 1 Seal depois', () => {
  let {s, ctx, give} = setup();
  let foe = give('B', FOE), spell = give('A', A('084'), 'hand');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.equal(hp(s, foe), 3);
  assert.equal(s.units[foe].seal, undefined);
  ({s, ctx, give} = setup());
  give('A', A('005')); foe = give('B', FOE); s.units[foe].seal = 1; spell = give('A', A('084'), 'hand');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.ok(!s.units[foe] || (hp(s, foe) === 5 && s.units[foe].seal === 2)); // 5 de dano; Seal só se sobreviveu
});

test('086 Deprived: +3/+3, Ikki ganha Pierce; derrotado no fim da rodada', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', A('009')), atk = atkOf(s, ctx, ikki);
  cast(s, ctx, '086');
  assert.equal(atkOf(s, ctx, ikki), atk + 3);
  assert.ok(keywordsOf(s, ctx, ikki).includes('Pierce'));
  endRound(s);
  assert.ok(s.players.A.tartarus.includes(ikki));
});

test('089 Wall: derrota Saints, compra 2 por cada e dá +2/+2 se houve Gold', () => {
  const {s, ctx, give} = setup();
  const gold = give('A', A('017')), keep = give('A', A('007'));
  let asked = 0; // aceita só a primeira vez o "até três" (gold); depois recusa
  ctx.decide = (player, q) => (q.choose === 'mode' ? q.options[2] : !q.options && q.ability === 'THE FINAL SACRIFICE' ? asked++ === 0 : q.options ? (q.options.includes(gold) ? gold : q.options[0]) : player === 'A');
  const hand = s.players.A.hand.length, atk = atkOf(s, ctx, keep);
  cast(s, ctx, '089');
  assert.ok(s.players.A.tartarus.includes(gold));
  assert.equal(s.players.A.hand.length, hand + 2);
  assert.equal(atkOf(s, ctx, keep), atk + 2);
});

test('090 Will: +3/+3, God imune a Strike; com Soul baixa traz Saint de volta', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', A('007')), dead = give('A', A('009'), 'tartarus'), atk = atkOf(s, ctx, shun);
  s.players.A.soul = 5;
  cast(s, ctx, '090');
  assert.equal(atkOf(s, ctx, shun), atk + 3);
  assert.ok(s.effects.some(e => e.kind === 'prevent' && e.target === 'god:A' && e.amount === Infinity));
  assert.ok(s.players.A.battlefield.includes(dead));
});

test('090 Will: com Soul acima de 5 não retorna Saint', () => {
  const {s, ctx, give} = setup();
  give('A', A('007')); const dead = give('A', A('009'), 'tartarus');
  s.players.A.soul = 6;
  cast(s, ctx, '090');
  assert.ok(s.players.A.tartarus.includes(dead));
});

test('063 Jamir Tower: Cloth Restoration tira 1 de dano de Armor amiga', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', A('007')), armor = give('A', A('002'), 'battlefield', shun);
  s.units[armor] ||= {prepared: true, damage: 0, entered: 0};
  s.units[armor].damage = 2;
  V6[A('063')].activate.run(s, ctx, 'A');
  assert.equal(s.units[armor].damage, 1);
});
