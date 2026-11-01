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
import {playSpell, activate as activateRaw} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, keywordsOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

// A: Ares (Domain 332); B: sem Domain, só com cartas injetadas. Decisões: primeira opção (God se houver);
// "you may" sim para A, não para B.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A;
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
import {V6, v6Spell} from '../playtest/engine-v3/v6/hooks.js';
import {guardDecide} from './engine-test-upto.mjs';
// Guia §56 (30/10/2026): jogada e {T} vão à pilha; aqui os dois passam e a pilha resolve na hora.
const resolved = fn => (s, ...a) => { const r = fn(s, ...a); passAll(s); return r; };
const activate = resolved(activateRaw);

const A = n => `athena-v6-${n}`;
const FOE = 'artemis-v6-399';
// Resolução chamada direto (o caminho por playSpell é coberto no último teste).
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

test('080 Phoenix (01/11/2026): alvo Ikki traz todos os Ikki do Tártaro, Unprepared e sem Strike', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', A('009'), 'tartarus'), ikki2 = give('A', A('009'), 'tartarus');
  cast(s, ctx, '080');
  for (const u of [ikki, ikki2]) {
    assert.ok(s.players.A.battlefield.includes(u));
    assert.equal(s.units[u].prepared, false);
    assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === u));
  }
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

test('090 Will: +2/+2 (31/10/2026), God imune a Strike; com Soul baixa traz Saint de volta', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', A('007')), dead = give('A', A('009'), 'tartarus'), atk = atkOf(s, ctx, shun);
  s.players.A.soul = 5;
  cast(s, ctx, '090');
  assert.equal(atkOf(s, ctx, shun), atk + 2);
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

test('063 Jamir Tower: Cloth Restoration tira 1 de dano de Devotee amigo com Armor', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', A('007'));
  give('A', A('002'), 'battlefield', shun);
  s.units[shun].damage = 2;
  V6[A('063')].activate.run(s, ctx, 'A');
  assert.equal(s.units[shun].damage, 1);
});

test('Ex-Events e truques defensivos são Moment; ex-Miracles são Technique (autor, 31/10/2026)', () => {
  const {ctx, give} = setup();
  for (const n of ['055', '079', '082', '083']) assert.equal(v6Spell(ctx, give('A', A(n), 'hand'))?.category, 'Moment', n);
  for (const n of ['089', '090']) assert.equal(v6Spell(ctx, give('A', A(n), 'hand')).category, 'Technique', n);
});

test('082 The Golden Arrow (Swords, 31/10/2026): Moment {1}; Devotee inimigo que declarou Strike vai ao Void e o God dele ganha Soul = ATK', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', FOE), arrow = give('A', A('082'), 'hand');
  s.players.B.soul = 10; // abaixo do teto, para o ganho inteiro aparecer
  const soul = s.players.B.soul, atk = atkOf(s, ctx, foe), before = s.players.A.bases.filter(b => b.prepared).length;
  s.strikes.set(foe, s.turn);
  playSpell(s, ctx, 'A', arrow, {target: foe});
  assert.ok(s.window, 'Moment: abre janela de resposta');
  passAll(s);
  assert.ok(s.players.B.void.includes(foe));
  assert.equal(s.players.B.soul, soul + atk);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, before - 1);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
test('063 Jamir Tower: ativada de ponta a ponta por play.activate("domain:A"), paga {1}{C} (§63, 31/10/2026), uma vez por Round', () => {
  const {s, ctx, give} = setup();
  s.domains.A = A('063');
  const shun = give('A', A('007'));
  give('A', A('002'), 'battlefield', shun);
  s.units[shun].damage = 2;
  const before = s.players.A.bases.filter(b => b.prepared).length;
  activate(s, ctx, 'A', 'domain:A');
  assert.equal(s.units[shun].damage, 1);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, before - 1);
  assert.throws(() => activate(s, ctx, 'A', 'domain:A'), /já foi usada/);
});

test('080 e 090: o Saint devolvido não declara Strike neste Round (cannotStrike)', () => {
  for (const [n, id] of [['080', A('001')], ['090', A('001')]]) {
    const {s, ctx, give} = setup();
    const dead = give('A', id, 'tartarus');
    s.players.A.soul = 4;
    cast(s, ctx, n);
    assert.ok(s.players.A.battlefield.includes(dead), n);
    assert.ok(s.effects.some(e => e.kind === 'noStrike' && e.target === dead), n);
  }
});

test('065 Stairway: Saint amigo sobrevive a um Strike; paga {1}{C} e ganha +1 ATK, uma vez por Round', () => {
  const {s, ctx, give} = setup();
  s.domains.A = A('065');
  const saint = give('A', A('029')), foe = give('B', FOE);
  const atk = atkOf(s, ctx, saint), bases = s.players.A.bases.filter(b => b.prepared).length;
  s.active = 'B'; declareStrike(s, ctx, foe, {kind: 'devotee', uid: saint}); passAll(s);
  assert.equal(atkOf(s, ctx, saint), atk + 1);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, bases - 1);
  assert.ok(s.roundUses.has('twelve-temples:A'));
});

test('Domains de Athena (§63, 31/10/2026): texto do Forge por cima do D268; 501 Athena\'s Statue existe na engine', () => {
  const statue = cards.get(A('501')), arena = index.get(A('062')).approved_current_text_as_of_d268;
  assert.equal(statue?.kind, 'Domain');
  assert.match(arena, /Once per game|Resonance/); // Resonance quando art-web for regerado do cards.json (Domains de 01/11/2026)
  assert.doesNotMatch(arena, /you may draw a card/, 'a linha 1 antiga (compra) saiu');
  const azorius = read('./fixtures/decks-competitivos.json').decks.find(d => d.id === 'comp-azorius');
  assert.doesNotThrow(() => createMatch({cards, canonIndex: index, decks: {A: azorius, B: {...decks.find(d => d.id === 'preview-ares-legions')}}, first: 'A', seed: 1}));
});

test('Cosmoble de Athena vem do Forge (rebalanceamento de 31/10/2026): Aquarius Camus deixa de ser Cosmoble', () => {
  assert.equal(cards.get(A('017')).cosmoble, false);
  assert.equal(cards.get(A('001')).cosmoble, true);
});
