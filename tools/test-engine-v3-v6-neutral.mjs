// Efeitos V6 das cartas neutras (playtest/engine-v3/v6/neutral.js).
// node --test tools/test-engine-v3-v6-neutral.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, runCheckpoint, addSeal} from '../playtest/engine-v3/core.js';
import {playDevotee as playDevoteeRaw, playSpell, playEquipment as playEquipmentRaw, activate as activateRaw, castCost} from '../playtest/engine-v3/play.js';
import {declareStrike, mustStrike} from '../playtest/engine-v3/strike.js';
import {V6, bindContext} from '../playtest/engine-v3/v6/hooks.js';
import {checkDefeats, atkOf, hpOf, modify, keywordsOf} from '../playtest/engine-v3/effects.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {guardDecide} from './engine-test-upto.mjs';
// Guia §56 (30/10/2026): jogada e {T} vão à pilha; aqui os dois passam e a pilha resolve na hora.
const resolved = fn => (s, ...a) => { const r = fn(s, ...a); passAll(s); return r; };
const playDevotee = resolved(playDevoteeRaw), playEquipment = resolved(playEquipmentRaw), activate = resolved(activateRaw);
const modifyAtk = (s, uid, atk) => modify(s, uid, {atk});

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;

// A: Ares (Domain 332); B: sem Domain, só com cartas injetadas. Decisões: primeira opção (God se houver);
// "you may" sim para A, não para B.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached}), p = s.players.A;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains.B = null; s.domains.A = null;
  bindContext(s, ctx); // gatilhos de turno e checkpoint usam o mesmo ctx (com decide)
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

const strike = (s, ctx, attacker, target) => { declareStrike(s, ctx, attacker, target); passAll(s); };
const N = n => `neutral-v6-${n}`;
const FOE = 'artemis-v6-399'; // carta de enchimento (tem Guardian: não serve como inimigo em campo)
// Inimigo sem keywords: Steel Saint Recruit com +2/+2 (3/4).
const mkFoe = (s, give, key = 'B') => { const u = give(key, N(468)); modify(s, u, {atk: 2, hp: 2}); return u; };
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const foeStrike = (s, ctx, attacker, target) => { s.active = 'B'; strike(s, ctx, attacker, target); };
const play = (s, ctx, uid) => { playDevotee(s, ctx, 'A', uid, {}); passAll(s); };
const cast = (s, ctx, uid) => { playSpell(s, ctx, 'A', uid); passAll(s); };
const equip = (s, ctx, uid, bearer) => { playEquipment(s, ctx, 'A', uid, bearer, {}); passAll(s); };
const dev = uid => ({kind: 'devotee', uid});
const god = {kind: 'god', player: 'B'};
const tough = (s, uid, hp = 20) => modify(s, uid, {hp});
const kill = (s, ctx, uid) => { s.units[uid].damage = hpOf(s, ctx, uid); checkDefeats(s, ctx); passAll(s); };
const bank = (s, key, n) => { for (let i = 0; i < n; i++) s.players[key].bases.push({uid: s.players[key].deck.shift(), prepared: true}); };
const pickB = ctx => { ctx.decide = (p, q) => (q.options ? (q.options.find(o => String(o).startsWith('B:')) ?? q.options[0]) : p === 'A'); };
const ability = (s, ctx, uid, choice) => activate(s, ctx, 'A', uid, choice);

// ---------- Black Saints ----------
test('451 Black Meteor Fist: dano de combate a Devotee inimigo causa 1 ao God dele; Corrupted Cosmo: perde 1 Soul ao atacar', () => {
  const {s, ctx, give} = setup();
  const peg = give('A', N(451)), foe = mkFoe(s, give);
  tough(s, foe);
  const a = s.players.A.soul, b = s.players.B.soul;
  strike(s, ctx, peg, dev(foe));
  assert.equal(s.players.B.soul, b - 1);
  assert.equal(s.players.A.soul, a - 1);
});

test('452 Dark Dragon Fist: paga 2 Soul e derrota Devotee com 3 ou menos HP; Cruel Strength: derrotar em combate custa 1 Soul', () => {
  const {s, ctx, give} = setup();
  const weak = give('B', N(468)); // Steel Saint Recruit, 2 HP
  const dragon = give('A', N(452), 'hand');
  const a = s.players.A.soul;
  play(s, ctx, dragon);
  assert.ok(s.players.B.tartarus.includes(weak));
  assert.equal(s.players.A.soul, a - 2);
  const foe = give('B', N(468));
  s.units[dragon].prepared = true;
  strike(s, ctx, dragon, dev(foe));
  assert.equal(s.players.A.soul, a - 3);
});

test('452 Dark Dragon Fist: sem alvo com 3 ou menos HP, não paga', () => {
  const {s, ctx, give} = setup();
  const big = mkFoe(s, give), dragon = give('A', N(452), 'hand'), a = s.players.A.soul;
  play(s, ctx, dragon);
  assert.ok(s.players.B.battlefield.includes(big));
  assert.equal(s.players.A.soul, a);
});

test('453 Black Blizzard: Seal no Devotee inimigo; Frozen Sacrifice pula a próxima compra', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), swan = give('A', N(453), 'hand');
  play(s, ctx, swan);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(s.skipDraw.A, true);
  s.active = 'A'; s.players.A.ownTurns = 3; s.window = null; s.chain.length = 0;
  const hand = s.players.A.hand.length;
  startTurn(s); passAll(s);
  assert.equal(s.players.A.hand.length, hand, 'não comprou');
  assert.ok(!s.skipDraw.A, 'marca consumida');
});

test('454 Black Andromeda: -1/-1 no atingido; inimigo com marcador derrotado: dono perde 1 Soul e você ganha 1', () => {
  const {s, ctx, give} = setup();
  const andro = give('A', N(454)), foe = mkFoe(s, give);
  tough(s, foe, 1); tough(s, andro);
  s.players.A.soul = 15;
  const b = s.players.B.soul;
  strike(s, ctx, andro, dev(foe));
  assert.equal(s.units[foe].counters, -1);
  assert.equal(s.players.A.soul, 14); // Dark Reflection
  kill(s, ctx, foe);
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.equal(s.players.B.soul, b - 1);
  assert.equal(s.players.A.soul, 15); // 14 + 1
});

test('455 False Rebirth: derrotada, paga 3 Cosmo, descarta 2 e perde 2 Soul para voltar exhausted', () => {
  const {s, ctx, give} = setup();
  const ph = give('A', N(455));
  give('A', FOE, 'hand'); give('A', FOE, 'hand');
  const soul = s.players.A.soul, r = ready(s, 'A');
  kill(s, ctx, ph);
  assert.ok(s.players.A.battlefield.includes(ph));
  assert.equal(s.units[ph].prepared, false);
  assert.equal(s.units[ph].damage, 0);
  assert.equal(ready(s, 'A'), r - 3);
  assert.equal(s.players.A.hand.length, 0);
  assert.equal(s.players.A.soul, soul - 2);
});

test('455 False Rebirth: sem 2 cartas na mão, não volta', () => {
  const {s, ctx, give} = setup();
  const ph = give('A', N(455));
  kill(s, ctx, ph);
  assert.ok(s.players.A.tartarus.includes(ph));
});

test('455 Shadow Flame: ao atacar, 1 de dano em cada Devotee inimigo e 1 no seu God', () => {
  const {s, ctx, give} = setup();
  const ph = give('A', N(455)), f1 = mkFoe(s, give), f2 = mkFoe(s, give);
  tough(s, ph); tough(s, f1);
  const a = s.players.A.soul;
  strike(s, ctx, ph, dev(f1));
  assert.equal(s.units[f2].damage, 1);
  assert.equal(s.units[f1].damage, 1 + atkOf(s, ctx, ph));
  assert.equal(s.players.A.soul, a - 1);
});

test('456 Death Queen Inferno: 3 de dano no alvo e 2 no seu God; Tyrant\'s Command: outros Black Saints +1/+0', () => {
  const {s, ctx, give} = setup();
  pickB(ctx);
  const foe = mkFoe(s, give), a = s.players.A.soul;
  const jango = give('A', N(456), 'hand');
  play(s, ctx, jango);
  assert.equal(s.units[foe].damage, 3);
  assert.equal(s.players.A.soul, a - 2);
  const peg = give('A', N(451));
  assert.equal(atkOf(s, ctx, peg), k.card(ctx, peg).atk + 1);
  assert.equal(atkOf(s, ctx, jango), k.card(ctx, jango).atk);
});

test('456 Rule Through Fear: no end step, com outro Black Saint, sacrifica um', () => {
  const {s, ctx, give} = setup();
  const jango = give('A', N(456)), peg = give('A', N(451));
  endTurn(s); passAll(s);
  assert.ok(!s.players.A.battlefield.includes(peg));
  assert.ok(s.players.A.battlefield.includes(jango));
});

test('456 Rule Through Fear: se recusa o sacrifício, perde 3 Soul; sem outro Black Saint, nada', () => {
  const {s, ctx, give} = setup();
  const jango = give('A', N(456));
  const a = s.players.A.soul;
  endTurn(s); passAll(s);
  assert.equal(s.players.A.soul, a);
  const {s: s2, ctx: ctx2, give: give2} = setup();
  give2('A', N(456)); const peg = give2('A', N(451));
  ctx2.decide = () => 'lose-soul';
  endTurn(s2); passAll(s2);
  assert.ok(s2.players.A.battlefield.includes(peg));
  assert.equal(s2.players.A.soul, a - 3);
});

test('457 Sanctuary Sentry: Guardian (keywords_en)', () => {
  const {s, ctx, give} = setup();
  const sentry = give('A', N(457));
  assert.ok(keywordsOf(s, ctx, sentry).includes('Guardian'));
});

test('458 Last Report: derrotado, compra 1', () => {
  const {s, ctx, give} = setup();
  const sc = give('A', N(458)), deck = s.players.A.deck.length, hand = s.players.A.hand.length;
  kill(s, ctx, sc);
  assert.equal(s.players.A.deck.length, deck - 1);
  assert.equal(s.players.A.hand.length, hand + 1);
});

test('459 Crushing Impact: ao atacar, paga 2 Cosmo e um Devotee inimigo fica com -2/-2 no turno', () => {
  const {s, ctx, give} = setup();
  const whale = give('A', N(459)), foe = mkFoe(s, give), r = ready(s, 'A');
  tough(s, whale);
  declareStrike(s, ctx, whale, god); passAll(s);
  assert.equal(ready(s, 'A'), r - 2);
  assert.equal(atkOf(s, ctx, foe), k.card(ctx, foe).atk); // +2 do mkFoe, -2 do Crushing Impact
  assert.equal(hpOf(s, ctx, foe), k.card(ctx, foe).hp);
});

test('460 War Charger: Impulse; compra ao causar dano de Strike ao God', () => {
  const {s, ctx, give} = setup();
  const ch = give('A', N(460));
  assert.ok(keywordsOf(s, ctx, ch).includes('Impulse'));
  tough(s, ch);
  const deck = s.players.A.deck.length;
  strike(s, ctx, ch, god);
  assert.equal(s.players.A.deck.length, deck - 1);
});

// ---------- Steel Saints ----------
test('461 Mechanical Precision: ao equipar Item em Sho, compra 1 e descarta 1 (uma vez por turno)', () => {
  const {s, ctx, give} = setup();
  const sho = give('A', N(461)), junk = give('A', FOE, 'hand'), g1 = give('A', N(469), 'hand'), g2 = give('A', N(469), 'hand');
  const t = s.players.A.tartarus.length;
  equip(s, ctx, g1, sho);
  assert.equal(s.players.A.tartarus.length, t + 1);
  assert.ok(s.players.A.tartarus.includes(junk));
  equip(s, ctx, g2, sho);
  assert.equal(s.players.A.tartarus.length, t + 1); // não repete
});

test('462 Daichi: +0/+2 equipado; Earthquake Generator: ao defender, paga 2 e causa 1 ao atacante', () => {
  const {s, ctx, give} = setup();
  const daichi = give('A', N(462)), base = hpOf(s, ctx, daichi);
  give('A', N(469), 'battlefield', daichi);
  assert.equal(hpOf(s, ctx, daichi), base + 2 + 1); // +2 Steel Fortress, +1 do Prototype
  const foe = mkFoe(s, give), r = ready(s, 'A');
  tough(s, foe);
  foeStrike(s, ctx, foe, dev(daichi));
  assert.equal(ready(s, 'A'), r - 2);
  assert.equal(s.units[foe].damage, 1 + atkOf(s, ctx, daichi));
});

test('463 Ushio: compra 1 e descarta 1 ao entrar; Resonance Engine devolve Devotee inimigo de custo 2 ou menos', () => {
  const {s, ctx, give} = setup();
  const t = s.players.A.tartarus.length;
  const ushio = give('A', N(463), 'hand');
  play(s, ctx, ushio);
  assert.equal(s.players.A.tartarus.length, t + 1);
  const cheap = give('B', N(468)), pricey = mkFoe(s, give);
  const gear = give('A', N(469), 'hand');
  equip(s, ctx, gear, ushio);
  assert.ok(s.players.B.hand.includes(cheap));
  assert.ok(s.players.B.battlefield.includes(pricey));
});

test('464 Steel Innovation: paga 2 e exaure Asamori para buscar um Equipment no deck', () => {
  const {s, ctx, give} = setup();
  const asa = give('A', N(464)), gear = give('A', N(469), 'deck'), r = ready(s, 'A');
  ability(s, ctx, asa);
  assert.equal(s.players.A.hand.length, 1);
  assert.equal(k.card(ctx, s.players.A.hand[0]).kind, 'Equipment');
  assert.equal(s.units[asa].prepared, false);
  assert.equal(ready(s, 'A'), r - 2);
});

test('466 Land Steel Cloth: previne 1 do primeiro dano do turno; Steel Saint portador ganha +1/+1', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), base = [atkOf(s, ctx, rec), hpOf(s, ctx, rec)];
  give('A', N(466), 'battlefield', rec);
  assert.deepEqual([atkOf(s, ctx, rec), hpOf(s, ctx, rec)], [base[0] + 1 + 1, base[1] + 3 + 1 + 1]);
  const foe = mkFoe(s, give);
  tough(s, foe);
  foeStrike(s, ctx, foe, dev(rec));
  assert.equal(s.units[rec].damage, atkOf(s, ctx, foe) - 1);
});

test('467 Steel Synchronization: Steel Saint portador que derrota em combate compra 1 e descarta 1', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), foe = mkFoe(s, give);
  give('A', N(467), 'battlefield', rec);
  s.units[foe].damage = hpOf(s, ctx, foe) - 1;
  const t = s.players.A.tartarus.length;
  strike(s, ctx, rec, dev(foe));
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.equal(s.players.A.tartarus.length, t + 1);
});

test('467 Sonic Disruption: dano de combate dá -2/-0 ao atingido', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), foe = mkFoe(s, give);
  give('A', N(467), 'battlefield', rec);
  tough(s, foe); tough(s, rec);
  const atk = atkOf(s, ctx, foe);
  strike(s, ctx, rec, dev(foe));
  assert.equal(atkOf(s, ctx, foe), atk - 2);
});

test('468 Mechanical Training: +1/+1 equipado', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), base = [atkOf(s, ctx, rec), hpOf(s, ctx, rec)];
  give('A', N(467), 'battlefield', rec);
  assert.deepEqual([atkOf(s, ctx, rec), hpOf(s, ctx, rec)], [base[0] + 1 + 1, base[1] + 1 + 1]);
});

test('469 Unstable Mechanism: ao atacar, paga 1 Cosmo para +1/+0', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), foe = mkFoe(s, give);
  give('A', N(469), 'battlefield', rec);
  tough(s, foe);
  const r = ready(s, 'A'), atk = atkOf(s, ctx, rec);
  strike(s, ctx, rec, dev(foe));
  assert.equal(ready(s, 'A'), r - 1);
  assert.equal(s.units[foe].damage, atk + 1);
});

test('470 Research Facility: paga 2, compra 1 e descarta 1; segundo Equipment do turno cria Steel Recruit', () => {
  const {s, ctx, give} = setup();
  const lab = give('A', N(470)), rec = give('A', N(468)), r = ready(s, 'A');
  ability(s, ctx, lab);
  assert.equal(ready(s, 'A'), r - 2);
  assert.equal(s.players.A.hand.length, 0);
  const g1 = give('A', N(469), 'hand'), g2 = give('A', N(469), 'hand');
  equip(s, ctx, g1, rec);
  const before = s.players.A.battlefield.length;
  equip(s, ctx, g2, rec);
  assert.equal(s.players.A.battlefield.length, before + 2); // Equipment + token
  const token = s.players.A.battlefield.find(u => ctx.objects[u].token);
  assert.equal(atkOf(s, ctx, token), 1);
  assert.equal(hpOf(s, ctx, token), 1);
});

// ---------- Ghost Saints ----------
test('471 Geist: devolve Devotee inimigo à mão; Ghost Command: outros Ghost Saints +1/+1', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), geist = give('A', N(471), 'hand');
  play(s, ctx, geist);
  assert.ok(s.players.B.hand.includes(foe));
  const dol = give('A', N(472));
  assert.equal(atkOf(s, ctx, dol), k.card(ctx, dol).atk + 1);
  assert.equal(hpOf(s, ctx, dol), k.card(ctx, dol).hp + 1);
  assert.equal(hpOf(s, ctx, geist), k.card(ctx, geist).hp);
});

test('472 Aquatic Ambush: paga 2 e exaure Devotee inimigo; Phantom Retreat: volta à mão ao ferir o God', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), dol = give('A', N(472), 'hand'), r = ready(s, 'A');
  play(s, ctx, dol);
  assert.equal(s.units[foe].prepared, false);
  assert.equal(ready(s, 'A'), r - 2 - k.card(ctx, dol).cost.amount);
  s.units[dol].prepared = true; s.units[dol].entered = s.turn - 1; tough(s, dol); // rodada seguinte (§47)
  strike(s, ctx, dol, god);
  assert.ok(s.players.A.hand.includes(dol));
});

test('473 Sea Serpent: -1/-1 no atingido; Venomous Waters: derrotado com marcador, dono perde 1 Soul', () => {
  const {s, ctx, give} = setup();
  const ser = give('A', N(473)), foe = mkFoe(s, give);
  tough(s, foe, 1); tough(s, ser);
  strike(s, ctx, ser, dev(foe));
  assert.equal(s.units[foe].counters, -1);
  const b = s.players.B.soul;
  kill(s, ctx, foe);
  assert.equal(s.players.B.soul, b - 1);
});

test('474 Jellyfish: Seal no atingido; Toxic Defense: atacante fica com -1/-1', () => {
  const {s, ctx, give} = setup();
  const jel = give('A', N(474)), foe = mkFoe(s, give);
  tough(s, foe);
  strike(s, ctx, jel, dev(foe));
  assert.equal(s.units[foe].seal, 1);
  const foe2 = mkFoe(s, give);
  foeStrike(s, ctx, foe2, dev(jel));
  assert.equal(atkOf(s, ctx, foe2), k.card(ctx, foe2).atk + 2 - 1);
});

test('475 Phantom Sea Ambush: devolve um Devotee seu e um inimigo; com Ghost Saint, compra e descarta', () => {
  const {s, ctx, give} = setup();
  const own = give('A', N(472)), foe = mkFoe(s, give), spell = give('A', N(475), 'hand');
  const t = s.players.A.tartarus.length;
  cast(s, ctx, spell);
  assert.ok(s.players.A.hand.includes(own));
  assert.ok(s.players.B.hand.includes(foe));
  assert.equal(s.players.A.tartarus.length, t + 1 /* a Spell */);
});

test('475 Phantom Sea Ambush: com outro Ghost Saint em campo, Ghost Tactics compra e descarta', () => {
  const {s, ctx, give} = setup();
  give('A', N(473)); const own = give('A', N(472)), foe = mkFoe(s, give), spell = give('A', N(475), 'hand');
  const t = s.players.A.tartarus.length;
  cast(s, ctx, spell);
  assert.equal(s.players.A.tartarus.length, t + 2); // Spell + descarte
});

test('476 Cosmo Disruption: Moment em resposta, descarta 1 como custo, contraria a Spell e perde 2 Soul', () => {
  const {s, ctx, give} = setup();
  const target = give('A', N(479), 'hand'), mine = give('B', N(476), 'hand'), fodder = give('B', FOE, 'hand');
  playSpell(s, ctx, 'A', target);
  assert.equal(s.window.priority, 'B');
  s.players.B.latent = 3;
  const soul = s.players.B.soul, hand = s.players.A.hand.length;
  playSpell(s, ctx, 'B', mine);
  assert.ok(s.players.B.tartarus.includes(fodder)); // descarte pago ao conjurar
  passAll(s);
  assert.ok(s.players.A.tartarus.includes(target));
  assert.equal(s.players.A.hand.length, hand); // 479 não comprou
  assert.equal(s.players.B.soul, soul - 2);
  assert.equal(s.players.B.latent, 0);
});

test('476 Cosmo Disruption: sem outra carta na mão ou sem Spell na cadeia, não conjura', () => {
  const {s, ctx, give} = setup();
  const target = give('A', N(479), 'hand'), mine = give('B', N(476), 'hand');
  playSpell(s, ctx, 'A', target);
  s.players.B.latent = 3;
  assert.throws(() => playSpell(s, ctx, 'B', mine), /descartar/);
  passAll(s);
  s.active = 'B'; give('B', FOE, 'hand');
  assert.throws(() => playSpell(s, ctx, 'B', mine));
});

test('477 Desperate Resurrection: devolve Devotee do Tartarus exhausted e perde 3 Soul', () => {
  const {s, ctx, give} = setup();
  const dead = give('A', N(451), 'tartarus'), spell = give('A', N(477), 'hand'), soul = s.players.A.soul;
  cast(s, ctx, spell);
  assert.ok(s.players.A.battlefield.includes(dead));
  assert.equal(s.units[dead].prepared, false);
  assert.equal(s.players.A.soul, soul - 3);
});

test('478 Universal Cosmo Crystal: gera 1 Latent uma vez por Round; sacrifício gera 2', () => {
  const {s, ctx, give} = setup();
  const crystal = give('A', N(478)), latent = s.players.A.latent;
  ability(s, ctx, crystal, {mode: 'amplify'});
  assert.equal(s.players.A.latent, latent + 1);
  assert.throws(() => ability(s, ctx, crystal, {mode: 'amplify'}), /modo ilegal/);
  ability(s, ctx, crystal, {mode: 'overload'});
  assert.equal(s.players.A.latent, Math.min(3, latent + 3));
  assert.ok(s.players.A.tartarus.includes(crystal));
});

test('479 Forbidden Knowledge: compra 3, descarta 1 e perde 2 Soul', () => {
  const {s, ctx, give} = setup();
  const spell = give('A', N(479), 'hand'), soul = s.players.A.soul;
  cast(s, ctx, spell);
  assert.equal(s.players.A.hand.length, 2);
  assert.equal(s.players.A.soul, soul - 2);
});

test('480 Divine Judgment: derrota o alvo e sacrifica um Devotee seu; sem Devotee, perde 4 Soul', () => {
  const {s, ctx, give} = setup();
  pickB(ctx);
  const foe = mkFoe(s, give), own = give('A', N(451)), spell = give('A', N(480), 'hand'), soul = s.players.A.soul;
  cast(s, ctx, spell);
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.ok(s.players.A.tartarus.includes(own));
  assert.equal(s.players.A.soul, soul);
  const {s: s2, ctx: ctx2, give: give2} = setup();
  pickB(ctx2);
  const f2 = mkFoe(s2, give2), sp2 = give2('A', N(480), 'hand'), soul2 = s2.players.A.soul;
  cast(s2, ctx2, sp2);
  assert.ok(s2.players.B.tartarus.includes(f2));
  assert.equal(s2.players.A.soul, soul2 - 4);
});

test('481 Freezing Coffin: paga 2 e põe Seal; Frozen Discipline: +1/+1 quando inimigo fica Sealed', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), crystal = give('A', N(481), 'hand');
  play(s, ctx, crystal);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(atkOf(s, ctx, crystal), k.card(ctx, crystal).atk + 1);
  assert.equal(hpOf(s, ctx, crystal), k.card(ctx, crystal).hp + 1);
  const foe2 = mkFoe(s, give);
  addSeal(s, ctx, [foe2], 1, 'teste'); passAll(s);
  assert.equal(atkOf(s, ctx, crystal), k.card(ctx, crystal).atk + 2);
  addSeal(s, ctx, [foe2], 1, 'teste'); passAll(s); // já estava Sealed: não é "becomes Sealed"
  assert.equal(atkOf(s, ctx, crystal), k.card(ctx, crystal).atk + 2);
});

test('482 Ohko: ao atacar, +2/+0 e 1 de dano no seu God', () => {
  const {s, ctx, give} = setup();
  const ohko = give('A', N(482)), foe = mkFoe(s, give), soul = s.players.A.soul;
  tough(s, ohko); tough(s, foe);
  strike(s, ctx, ohko, dev(foe));
  assert.equal(s.units[foe].damage, k.card(ctx, ohko).atk + 2);
  assert.equal(s.players.A.soul, soul - 1);
});

test('483 Leda: sozinha não ganha bônus; +1/+1 ao atacar depois de outro Devotee seu no turno', () => {
  const {s, ctx, give} = setup();
  const leda = give('A', N(483)), other = give('A', N(468)), foe = mkFoe(s, give), foe2 = mkFoe(s, give);
  tough(s, foe); tough(s, foe2); tough(s, leda); tough(s, other);
  strike(s, ctx, leda, dev(foe));
  assert.equal(s.units[foe].damage, atkOf(s, ctx, leda));
  s.units[leda].prepared = true; s.strikes.delete(leda);
  strike(s, ctx, other, dev(foe2)); // outro ataca primeiro
  s.units[leda].prepared = true; s.strikes.delete(leda);
  const dmg = s.units[foe2].damage;
  strike(s, ctx, leda, dev(foe2));
  assert.equal(s.units[foe2].damage - dmg, k.card(ctx, leda).atk + 1);
});

test('483 Chain Coordination: Guardian se controla Spica', () => {
  const {s, ctx, give} = setup();
  const leda = give('A', N(483));
  assert.ok(!k.keywordsOf(s, ctx, leda).includes('Guardian'));
  give('A', N(484));
  assert.ok(k.keywordsOf(s, ctx, leda).includes('Guardian'));
});

test('484 Spica: paga 2 e exaure inimigo; Twin Assault com Leda: alvo inimigo -2/-0', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), spica = give('A', N(484), 'hand');
  play(s, ctx, spica);
  assert.equal(s.units[foe].prepared, false);
  give('A', N(483));
  s.units[spica].prepared = true; tough(s, spica); tough(s, foe);
  strike(s, ctx, spica, dev(foe));
  assert.equal(atkOf(s, ctx, foe), k.card(ctx, foe).atk); // +2 do mkFoe, -2 do Twin Assault
});

test('485 Shiva: paga 2 e divide 2 de dano; Mystic Meditation: +1/+0 ao conjurar Technique', () => {
  const {s, ctx, give} = setup();
  bank(s, 'A', 4);
  const foe = mkFoe(s, give), shiva = give('A', N(485), 'hand');
  play(s, ctx, shiva);
  assert.equal(s.units[foe].damage, 2);
  const spell = give('A', N(496), 'hand');
  cast(s, ctx, spell);
  assert.equal(atkOf(s, ctx, shiva), k.card(ctx, shiva).atk + 1);
});

test('486 Lotus Meditation: primeira Technique do turno, paga 2 e compra 1 (só a primeira)', () => {
  const {s, ctx, give} = setup();
  bank(s, 'A', 8);
  give('A', N(486));
  const junk = give('A', FOE, 'hand'), s1 = give('A', N(496), 'hand'), s2 = give('A', N(496), 'hand');
  cast(s, ctx, s1);
  assert.ok(s.players.A.tartarus.includes(junk)); // Energy Debt descartou o primeiro
  assert.equal(s.players.A.hand.length, 2); // s2 + a compra de Lotus Meditation
  const r = ready(s, 'A');
  cast(s, ctx, s2);
  assert.equal(ready(s, 'A'), r - 5); // só o custo: Lotus Meditation não paga na segunda
  assert.equal(s.players.A.hand.length, 0);
});

test('487 Arachne: exaure inimigo ao entrar; Venomous Trap: inimigo Exhausted derrotado, compra e descarta', () => {
  const {s, ctx, give} = setup();
  const foe = mkFoe(s, give), arachne = give('A', N(487), 'hand');
  play(s, ctx, arachne);
  assert.equal(s.units[foe].prepared, false);
  const t = s.players.A.tartarus.length;
  kill(s, ctx, foe);
  assert.equal(s.players.A.tartarus.length, t + 1);
  const foe2 = mkFoe(s, give); // Prepared: não conta
  kill(s, ctx, foe2);
  assert.equal(s.players.A.tartarus.length, t + 1);
});

test('488 Gigas: cria Sanctuary Soldier; Political Manipulation: paga 3, sacrifica outro e compra 2', () => {
  const {s, ctx, give} = setup();
  const gigas = give('A', N(488), 'hand');
  play(s, ctx, gigas);
  const token = s.players.A.battlefield.find(u => ctx.objects[u].token);
  assert.equal(atkOf(s, ctx, token), 1);
  assert.equal(hpOf(s, ctx, token), 1);
  s.units[gigas].prepared = true;
  const hand = s.players.A.hand.length;
  ability(s, ctx, gigas);
  assert.ok(!s.players.A.battlefield.includes(token)); // o único outro Devotee foi sacrificado
  assert.ok(s.players.A.battlefield.includes(gigas));
  assert.equal(s.players.A.hand.length, hand + 2);
});

test('488 Political Manipulation: sem outro Devotee, não ativa', () => {
  const {s, ctx, give} = setup();
  const gigas = give('A', N(488));
  assert.throws(() => ability(s, ctx, gigas), /sacrificar/);
});

test('489 Phaeton: Soldiers amigos +1/+0; paga 2 e cria Sanctuary Soldier', () => {
  const {s, ctx, give} = setup();
  const phaeton = give('A', N(489), 'hand');
  play(s, ctx, phaeton);
  const token = s.players.A.battlefield.find(u => ctx.objects[u].token);
  assert.equal(atkOf(s, ctx, token), 2);
  assert.equal(atkOf(s, ctx, phaeton), k.card(ctx, phaeton).atk);
});

test('490 Paid Loyalty: paga 1 Cosmo no início do turno ou não pode atacar', () => {
  const {s, ctx, give} = setup();
  const merc = give('A', N(490)), foe = mkFoe(s, give);
  V6[N(490)].startTurn(s, ctx, 'A', merc)(s);
  strike(s, ctx, merc, dev(foe)); // pagou
  const {s: s2, ctx: ctx2, give: give2} = setup();
  const m2 = give2('A', N(490)), f2 = mkFoe(s2, give2);
  s2.players.A.bases.forEach(b => { b.prepared = false; });
  V6[N(490)].startTurn(s2, ctx2, 'A', m2)(s2);
  assert.throws(() => declareStrike(s2, ctx2, m2, dev(f2)), /não pode declarar Strike/);
});

test('491 Cloth Repair Tools: remove até 2 dano (pagando 2); sacrifício devolve Equipment do Tartarus', () => {
  const {s, ctx, give} = setup();
  const tools = give('A', N(491)), rec = give('A', N(468)), r = ready(s, 'A');
  s.units[rec].damage = 5; // vira alvo (primeira opção dos Devotees seus)
  tough(s, rec);
  ability(s, ctx, tools, {mode: 'repair'});
  assert.equal(s.units[rec].damage, 3);
  assert.equal(ready(s, 'A'), r - 2);
  assert.throws(() => ability(s, ctx, tools, {mode: 'repair'}), /modo ilegal/);
  const gear = give('A', N(469), 'tartarus');
  ability(s, ctx, tools, {mode: 'salvage'});
  assert.ok(s.players.A.hand.includes(gear) || s.players.A.hand.includes(tools));
  assert.ok(!s.players.A.battlefield.includes(tools));
});

test('492 Death Queen Mask: dano de combate fatal ao inimigo custa 2 Soul; Corrupted Protection impede a derrota', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), foe = mkFoe(s, give), mask = give('A', N(492), 'battlefield', rec);
  s.units[foe].damage = hpOf(s, ctx, foe) - 1; tough(s, rec);
  const soul = s.players.B.soul;
  strike(s, ctx, rec, dev(foe));
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.equal(s.players.B.soul, soul - 2, 'Forbidden Power: o dono do derrotado perde 2 (autor, 30/10/2026)');
  kill(s, ctx, rec);
  assert.ok(s.players.A.battlefield.includes(rec));
  assert.equal(s.units[rec].damage, 0);
  assert.ok(s.players.A.tartarus.includes(mask));
});

test('493 Cosmo Converter: paga 1 Soul para 2 Latent; Overloaded Circuits: não volta a ser usado no próximo turno', () => {
  const {s, ctx, give} = setup();
  const conv = give('A', N(493)), soul = s.players.A.soul, latent = s.players.A.latent;
  ability(s, ctx, conv);
  assert.equal(s.players.A.soul, soul - 1);
  assert.equal(s.players.A.latent, latent + 2);
  s.roundUses.clear(); s.players.A.ownTurns++; // próximo turno próprio
  assert.throws(() => ability(s, ctx, conv), /readied/);
  s.players.A.ownTurns++;
  ability(s, ctx, conv);
});

test('494 Sanctuary Supply Chest: compra e descarta ao entrar; Last Reserves: paga 3, sacrifica e compra 2', () => {
  const {s, ctx, give} = setup();
  const rec = give('A', N(468)), chest = give('A', N(494), 'hand');
  const t = s.players.A.tartarus.length;
  equip(s, ctx, chest, rec);
  assert.equal(s.players.A.tartarus.length, t + 1);
  const hand = s.players.A.hand.length;
  ability(s, ctx, chest);
  assert.equal(s.players.A.hand.length, hand + 2);
  assert.ok(s.players.A.tartarus.includes(chest));
});

test('495 Forced Exile: manda o alvo ao Void e devolve um Devotee seu à mão', () => {
  const {s, ctx, give} = setup();
  pickB(ctx);
  const foe = mkFoe(s, give), own = give('A', N(451)), spell = give('A', N(495), 'hand');
  cast(s, ctx, spell);
  assert.ok(s.players.B.void.includes(foe));
  assert.ok(s.players.A.hand.includes(own));
});

test('496 Cosmo Extraction: topo do deck vira Base, perde 2 Soul e descarta 1', () => {
  const {s, ctx, give} = setup();
  give('A', FOE, 'hand');
  const spell = give('A', N(496), 'hand'), bases = s.players.A.bases.length, soul = s.players.A.soul, deck = s.players.A.deck.length;
  cast(s, ctx, spell);
  assert.equal(s.players.A.bases.length, bases + 1);
  assert.equal(s.players.A.deck.length, deck - 1);
  assert.equal(s.players.A.soul, soul - 2);
  assert.equal(s.players.A.hand.length, 0);
});

test('497 Last Moment Defense: previne dano de combate no alvo e o exaure sem preparar no próximo ready', () => {
  const {s, ctx, give} = setup();
  const own = give('A', N(468)), foe = mkFoe(s, give), spell = give('A', N(497), 'hand');
  cast(s, ctx, spell);
  assert.equal(s.units[own].prepared, false);
  assert.equal(s.units[own].skipPrepare, true);
  const dmg = s.units[own].damage;
  s.units[foe].prepared = true; s.units[own].prepared = true;
  foeStrike(s, ctx, foe, dev(own));
  assert.equal(s.units[own].damage, dmg);
});

test('498 Dark Tournament: cada jogador sacrifica um Devotee; com Black Saint, compra 2 e descarta 1', () => {
  const {s, ctx, give} = setup();
  const mine = give('A', N(451)), mine2 = give('A', N(451)), foe = mkFoe(s, give), spell = give('A', N(498), 'hand');
  cast(s, ctx, spell);
  assert.ok(s.players.B.tartarus.includes(foe));
  assert.equal(s.players.A.battlefield.length, 1);
  assert.equal(s.players.A.hand.length, 1);
});

test('499 Humanity\'s Defiance: +2/+2 e Pierce na rodada; sacrifica um Devotee no end step', () => {
  const {s, ctx, give} = setup();
  const a = give('A', N(468)), b = give('A', N(468)), spell = give('A', N(499), 'hand');
  cast(s, ctx, spell);
  assert.equal(atkOf(s, ctx, a), k.card(ctx, a).atk + 2);
  assert.equal(hpOf(s, ctx, a), k.card(ctx, a).hp + 2);
  assert.ok(k.keywordsOf(s, ctx, a).includes('Pierce'));
  endTurn(s); passAll(s);
  assert.equal(s.players.A.battlefield.length, 1);
  assert.equal(atkOf(s, ctx, s.players.A.battlefield[0]), k.card(ctx, b).atk + 2); // "until end of turn" = fim da rodada (§64)
});

test('500 The Eighth Sense: devolve até 2 Devotees exhausted, imortais; perde 5 Soul', () => {
  const {s, ctx, give} = setup();
  const d1 = give('A', N(451), 'tartarus'), d2 = give('A', N(458), 'tartarus'), spell = give('A', N(500), 'hand'), soul = s.players.A.soul;
  cast(s, ctx, spell);
  for (const d of [d1, d2]) { assert.ok(s.players.A.battlefield.includes(d)); assert.equal(s.units[d].prepared, false); }
  assert.equal(s.players.A.soul, soul - 5);
  kill(s, ctx, d1);
  assert.ok(s.players.A.battlefield.includes(d1)); // não é derrotado
  assert.equal(s.units[d1].damage, hpOf(s, ctx, d1) - 1);
  kill(s, ctx, d1); // continua protegido
  assert.ok(s.players.A.battlefield.includes(d1));
});

test('464 Mechanical Engineering e 470 Technological Advancement: Equipment custa menos (mínimo 1); 470 só o primeiro do Round', () => {
  const {s, ctx, give} = setup();
  const eq = give('A', N(466), 'hand'), cost = ctx.cards.get(N(466)).cost;
  assert.equal(castCost(s, ctx, 'A', eq, cost).amount, cost.amount);
  give('A', N(464));
  assert.equal(castCost(s, ctx, 'A', eq, cost).amount, Math.max(1, cost.amount - 1));
  const lab = give('A', N(470));
  assert.equal(castCost(s, ctx, 'A', eq, cost).amount, Math.max(1, cost.amount - 2));
  assert.equal(castCost(s, ctx, 'A', eq, {amount: 1, unit: 'base'}).amount, 1, 'mínimo 1');
  s.roundUses.add(`tech:${lab}`);
  assert.equal(castCost(s, ctx, 'A', eq, cost).amount, Math.max(1, cost.amount - 1));
});

test('Unshaken Loyalty (Poseidon 176): noBounce barra retorno à mão por efeito inimigo, não pelo próprio', () => {
  const {s, ctx, give} = setup();
  const general = give('B', N(466));
  k.addEffect(s, {kind: 'noBounce', target: general, duration: 'this_round'});
  assert.equal(k.toHand(s, ctx, general, 'battlefield', 'A'), false);
  assert.ok(s.players.B.battlefield.includes(general));
  assert.equal(k.toHand(s, ctx, general, 'battlefield', 'B'), true);
});

test('Alvo de Technique inimiga: Geist (471) sacrifica outro e contraria; Agora (486) cobra {2} a mais', () => {
  const t = setup();
  const geist = t.give('B', N(471)), other = t.give('B', N(468));
  const yesB = t.ctx.decide;
  t.ctx.decide = (player, q) => (q.ability === 'DECEPTIVE PRESENCE' && !q.options ? true : yesB(player, q));
  const spell = t.give('A', 'hades-v6-192', 'hand');
  playSpell(t.s, t.ctx, 'A', spell, {}); passAll(t.s);
  assert.ok(t.s.events.some(e => e.type === 'spell_countered' && e.uid === spell));
  assert.ok(t.s.players.B.tartarus.includes(other), 'sacrificou o outro');
  assert.ok(!t.s.units[geist]?.seal, 'Geist sem Seal');
  const a = setup();
  const agora = a.give('B', N(486));
  const spell2 = a.give('A', 'hades-v6-192', 'hand'), before = a.s.players.A.bases.filter(b => b.prepared).length;
  playSpell(a.s, a.ctx, 'A', spell2, {}); passAll(a.s);
  assert.equal(a.s.players.A.bases.filter(b => b.prepared).length, before - a.ctx.cards.get('hades-v6-192').cost.amount - 2, 'pagou {2} a mais');
  assert.equal(a.s.units[agora].seal, 3);
});

test('461 Sky Defender: paga 2 e a Technique inimiga que mirava outro Devotee vai para Sho', () => {
  const {s, ctx, give} = setup();
  const other = give('B', N(468)), sho = give('B', N(461));
  const base = ctx.decide;
  ctx.decide = (player, q) => (q.ability === 'SKY DEFENDER' && !q.options ? true : base(player, q));
  s.players.B.bases = s.players.B.deck.splice(0, 3).map(uid => ({uid, prepared: true}));
  const spell = give('A', 'hades-v6-192', 'hand');
  playSpell(s, ctx, 'A', spell, {}); passAll(s);
  assert.equal(s.units[sho].seal, 3, 'Sho recebeu o efeito');
  assert.ok(!s.units[other].seal, 'o alvo original não');
});

test('458 False Wings: Black Phoenix Shadow não retalia; 482 Uncontrolled Rage: Ohko deve atacar antes do END TURN', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', N(458)), att = give('A', N(468));
  declareStrike(s, ctx, att, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[att]?.damage ?? 0, 0, 'sem retaliação');
  const ohko = give('A', N(482));
  assert.deepEqual(mustStrike(s, ctx, 'A'), [ohko]);
  declareStrike(s, ctx, ohko, {kind: 'god', player: 'B'}); passAll(s);
  assert.deepEqual(mustStrike(s, ctx, 'A'), []);
});
