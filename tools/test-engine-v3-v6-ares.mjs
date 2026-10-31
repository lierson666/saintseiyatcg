// Efeitos V6 de Ares (playtest/engine-v3/v6/ares.js): um caso por gancho e por família.
// node --test tools/test-engine-v3-v6-ares.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, playEquipment, activate} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {checkDefeats, atkOf, keywordsOf} from '../playtest/engine-v3/effects.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';

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
    m.objects[uid] = {owner: key, cardId: `ares-v6-${id}`, armor: false};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  return {s, ctx, give};
}
const strike = (s, ctx, attacker, target) => { declareStrike(s, ctx, attacker, target); passAll(s); };
const god = {kind: 'god', player: 'B'};

test('enter: Alcmenes causa 3 a um Devotee inimigo', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', '304'), alc = give('A', '271', 'hand');
  playDevotee(s, ctx, 'A', alc, {}); passAll(s);
  assert.ok(s.players.B.tartarus.includes(foe));
});

test('declare + watchDeclare: Burning Assault tira 1 do God; Coordinated Assault dá +1 ao outro Berserker', () => {
  const {s, ctx, give} = setup();
  const a = give('A', '291'), b = give('A', '292');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, a), before = atkOf(s, ctx, b);
  strike(s, ctx, a, god);
  assert.equal(s.players.B.soul, soul - 1 - atk);
  assert.equal(atkOf(s, ctx, b), before + 1);
});

test('Berserker morto: Glorious Demise, Cruel Entertainment (God) e Lethal Opportunist (+2)', () => {
  const {s, ctx, give} = setup();
  const dead = give('A', '293'); give('A', '275'); const iseu = give('A', '279');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, iseu);
  s.units[dead].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 2);
  assert.equal(atkOf(s, ctx, iseu), atk + 2);
});

test('Warplate: Razor Winds no Strike; Resonance e Enyo dão Pierce só ao portador certo', () => {
  const {s, ctx, give} = setup();
  const foe = give('B', '302'), iseu = give('A', '279'), alc = give('A', '271'), gal = give('A', '310');
  give('A', '276', 'battlefield', iseu);
  give('A', '272', 'battlefield', alc);
  give('A', '272', 'battlefield', gal);
  strike(s, ctx, iseu, {kind: 'devotee', uid: foe});
  assert.ok(s.events.some(e => e.type === 'damage' && e.uid === foe && !e.strike && e.dealt === 1));
  assert.ok(keywordsOf(s, ctx, alc).includes('Pierce'));
  assert.ok(!keywordsOf(s, ctx, gal).includes('Pierce'));
  give('A', '289', 'battlefield', gal);
  assert.ok(keywordsOf(s, ctx, gal).includes('Pierce'));
});

test('activate: Suicide Orders derrota outro Berserker e dá +3/Pierce a Lior; uma vez por rodada', () => {
  const {s, ctx, give} = setup();
  const lior = give('A', '275'), dead = give('A', '293'); give('A', '291');
  const soul = s.players.B.soul, atk = atkOf(s, ctx, lior);
  activate(s, ctx, 'A', lior); passAll(s);
  assert.ok(s.players.A.tartarus.includes(dead));
  assert.equal(atkOf(s, ctx, lior), atk + 3);
  assert.ok(keywordsOf(s, ctx, lior).includes('Pierce'));
  assert.equal(s.players.B.soul, soul - 2); // Glorious Demise + Cruel Entertainment
  assert.throws(() => activate(s, ctx, 'A', lior));
});

test('Moment em área: Azure Plague (1 em cada inimigo) derrota um e tira 1 do God por derrotado', () => {
  const {s, ctx, give} = setup();
  const small = give('B', '293'), big = give('B', '302'), spell = give('A', '351', 'hand');
  const soul = s.players.B.soul;
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.ok(s.players.B.tartarus.includes(small));
  assert.equal(s.units[big].damage, 1);
  assert.equal(s.players.B.soul, soul - 1);
});

test('Moment em área: Eternal Bloodshed derrota todos, 1 por Berserker ao God, compra 3 e descarta 2', () => {
  const {s, ctx, give} = setup();
  give('B', '304'); give('A', '291');
  const spell = give('A', '360', 'hand'), soul = s.players.B.soul, hand = s.players.A.hand.length - 1;
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  assert.equal(s.players.B.battlefield.length + s.players.A.battlefield.filter(u => ctx.cards.get(ctx.objects[u].cardId).kind === 'Devotee').length, 0);
  assert.equal(s.players.B.soul, soul - 2);
  assert.equal(s.players.A.hand.length, hand + 1);
});

test('fim do turno: Reckless Bloodlust e Uncontrolled Power derrotam no fim do turno', () => {
  const {s, ctx, give} = setup();
  const reckless = give('A', '295'), other = give('A', '292'), spell = give('A', '324', 'hand');
  ctx.decide = (player, q) => (q.options ? (q.options.includes(other) ? other : q.options[0]) : player === 'A');
  playSpell(s, ctx, 'A', spell); if (s.window) passAll(s);
  strike(s, ctx, reckless, god);
  endTurn(s); passAll(s);
  assert.ok(s.players.A.tartarus.includes(reckless));
  assert.ok(s.players.A.tartarus.includes(other));
});

test('mods: Royal Guard ganha +1 por outro Berserker que declarou Strike no turno', () => {
  const {s, ctx, give} = setup();
  const guard = give('A', '309'), a = give('A', '291'), b = give('A', '304');
  const base = atkOf(s, ctx, guard);
  strike(s, ctx, a, god); strike(s, ctx, b, god);
  assert.equal(atkOf(s, ctx, guard), base + 2);
});

test('godDamage: Psychological Warfare tira 1 Latent do dono do God (Sligh, 31/10/2026)', () => {
  const {s, ctx, give} = setup();
  const card = give('B', '291', 'hand'), fear = give('A', '294');
  s.players.B.latent = 2;
  strike(s, ctx, fear, god);
  assert.equal(s.players.B.latent, 1);
  assert.ok(s.players.B.hand.includes(card));
});

test('Basil: inimigo que levou dano dele no turno e morre tira 1 do God', () => {
  const {s, ctx, give} = setup();
  s.domains.A = null;
  const foe = give('B', '309'), basil = give('A', '287');
  for (const u of [foe, basil]) s.effects.push({kind: 'mod', target: u, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  strike(s, ctx, basil, {kind: 'devotee', uid: foe});
  const soul = s.players.B.soul;
  s.units[foe].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.B.soul, soul - 1);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
test('303 Bloodied Pride: tomar dano (Strike ou efeito) causa 1 ao próprio God', () => {
  const {s, ctx, give} = setup();
  s.domains.A = null; // Eternal Bloodshed (332) agora cobra Soul
  const glad = give('A', '303'), foe = give('B', '304'), soul = s.players.A.soul;
  strike(s, ctx, glad, {kind: 'devotee', uid: foe}); // 303 tem HP 1: o Strike o derrota, mas o gatilho ainda vale
  assert.equal(s.players.A.soul, soul - 1);
  const {s: s2, ctx: c2, give: g2} = setup();
  const glad2 = g2('A', '303'), soul2 = s2.players.A.soul;
  k.damage(s2, c2, glad2, 1); passAll(s2);
  assert.equal(s2.players.A.soul, soul2 - 1);
  assert.ok(V6['ares-v6-303']);
});

test('341 Crimson Retaliation: dano de combate de Devotee inimigo volta em 2 para ele', () => {
  const {s, ctx, give} = setup();
  const guard = give('A', '341'), foe = give('B', '304'); // 304: 3/2, o Guardian leva 3
  s.active = 'B'; strike(s, ctx, foe, {kind: 'devotee', uid: guard});
  assert.ok(s.players.B.tartarus.includes(foe)); // morre na retaliação (5) de qualquer jeito
  const {s: s2, ctx: c2, give: g2} = setup();
  const guard2 = g2('A', '341'), foe2 = g2('B', '309'); // 4/5: sobrevive ao 5 de retaliação? HP 5 -> morre; usa 2 de HP extra
  s2.effects.push({kind: 'mod', target: foe2, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  s2.active = 'B'; strike(s2, c2, foe2, {kind: 'devotee', uid: guard2});
  const back = s2.events.find(e => e.type === 'damage' && e.uid === foe2 && e.strike).dealt;
  assert.equal(s2.units[foe2].damage, back + 2); // retaliação + 2 de Crimson Retaliation
});

test('309 War God\'s Protection: outro Berserker amigo tomou dano; pode causar 1 a um Devotee inimigo', () => {
  const {s, ctx, give} = setup();
  const royal = give('A', '309'), ally = give('A', '292'), foe = give('B', '309');
  s.effects.push({kind: 'mod', target: foe, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  k.damage(s, ctx, ally, 1); passAll(s);
  assert.equal(s.units[foe].damage, 1);
  assert.ok(royal);
});

test('290 Shield of the War God: sobrevive e causa 2 ao Devotee inimigo; ao tomar dano ganha +2 ATK', () => {
  const {s, ctx, give} = setup();
  const me = give('A', '309'), shield = give('A', '290', 'battlefield', me), foe = give('B', '309');
  s.effects.push({kind: 'mod', target: foe, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  const atk = atkOf(s, ctx, me);
  strike(s, ctx, me, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].damage, atkOf(s, ctx, me) - 2 + 2); // dano do Strike (ATK já com +2) + 2 da Warborn Defiance
  assert.equal(atkOf(s, ctx, me), atk + 2); // Unyielding Fury (retaliação do foe feriu o portador)
  assert.ok(shield);
});

test('337 Flame Resonance: Flame Legion Berserker equipado ganha +1 ATK quando você conjura Technique', () => {
  const {s, ctx, give} = setup();
  const bers = give('A', '292'), plate = give('A', '337', 'battlefield', bers);
  const spell = give('A', '323', 'hand'), ally = give('A', '292');
  const atk = atkOf(s, ctx, bers);
  playSpell(s, ctx, 'A', spell, {target: ally});
  assert.ok(s.window); // gatilho do observador: a Technique espera na cadeia
  passAll(s);
  assert.equal(atkOf(s, ctx, bers), atk + 2 + 1); // +2 da Charge Into Battle (alvo: o primeiro Berserker) e +1 da Flame Resonance
  assert.ok(s.players.A.tartarus.includes(spell));
  assert.ok(plate);
});

// Rebalanceamento (autor, 30/10/2026): dano automático no God custa Soul, e é opcional.
test('Burning Assault (291): pagar 1 Soul tira 1 do God inimigo; recusar não paga nem causa dano', () => {
  for (const pay of [true, false]) {
    const {s, ctx, give} = setup();
    ctx.decide = (player, q) => (q.options ? q.options[0] : pay && q.ability === 'BURNING ASSAULT');
    s.domains.A = null; // sem Eternal Bloodshed (332) somando dano
    const red = give('A', '291'), foe = give('B', '293');
    const a = s.players.A.soul, b = s.players.B.soul;
    strike(s, ctx, red, {kind: 'devotee', uid: foe});
    assert.deepEqual([s.players.A.soul, s.players.B.soul], pay ? [a - 1, b - 1] : [a, b]);
  }
});

test('Alcmenes (271) não tem mais Promethean Fire; Final Explosion (313) paga mesmo mirando Devotee', () => {
  const {s, ctx, give} = setup();
  ctx.decide = (player, q) => (q.options ? (q.options.find(o => !String(o).startsWith('god:')) ?? q.options[0]) : player === 'A');
  s.domains.A = null;
  const alc = give('A', '271'), foe = give('B', '293'), boom = give('A', '313');
  const a = s.players.A.soul, b = s.players.B.soul;
  strike(s, ctx, alc, {kind: 'devotee', uid: foe});
  assert.deepEqual([s.players.A.soul, s.players.B.soul], [a, b]);
  s.units[boom].damage = 99; checkDefeats(s, ctx); passAll(s);
  assert.equal(s.players.A.soul, a - 1, 'Final Explosion cobra 1 Soul também contra Devotee');
});

// Ares → Sligh (meta Premodern, 31/10/2026).
const cast = (s, ctx, spell, opts) => { playSpell(s, ctx, 'A', spell, opts); if (s.window) passAll(s); };
test('First Blood (322): 3 num Devotee inimigo ou 1 no God', () => {
  const {s, ctx, give} = setup();
  const soul = s.players.B.soul;
  cast(s, ctx, give('A', '322', 'hand')); // decide: God primeiro
  assert.equal(s.players.B.soul, soul - 1);
  ctx.decide = (player, q) => (q.options ? q.options.find(o => !String(o).startsWith('god:')) ?? q.options[0] : player === 'A');
  const foe = give('B', '309');
  cast(s, ctx, give('A', '322', 'hand'));
  assert.equal(s.units[foe].damage, 3);
});
test('Rain of Spears (327) distribui 3 entre até dois; Burn It All (328) causa 2 em todos', () => {
  const {s, ctx, give} = setup();
  const x = give('B', '309'), y = give('B', '309'), z = give('B', '309');
  ctx.decide = (player, q) => (q.options ? (q.count ? q.options.slice(0, q.count) : q.options[0]) : player === 'A');
  cast(s, ctx, give('A', '327', 'hand'));
  assert.deepEqual([x, y, z].map(u => s.units[u].damage).sort(), [0, 1, 2]);
  const mine = give('A', '309');
  cast(s, ctx, give('A', '328', 'hand'));
  assert.equal(s.units[mine].damage, 2);
  assert.equal(s.units[z].damage + s.units[y].damage + s.units[x].damage, 3 + 6);
});
test('Bloody Rain (352): 4 no God inimigo, 1 no seu; Apocalypse (359): 1 por Devotee no seu Tartarus, até 5', () => {
  const {s, ctx, give} = setup();
  s.domains.A = null;
  const a = s.players.A.soul, b = s.players.B.soul;
  cast(s, ctx, give('A', '352', 'hand'));
  assert.deepEqual([s.players.A.soul, s.players.B.soul], [a - 1, b - 4]);
  for (let i = 0; i < 7; i++) give('A', '293', 'tartarus');
  give('A', '322', 'tartarus');
  cast(s, ctx, give('A', '359', 'hand'));
  assert.equal(s.players.B.soul, b - 4 - 5);
});
test('Living Nightmare (348) tira até 2 Latent e 1 no God por Latent; Feast on Fear (344) ganha +1 ATK', () => {
  const {s, ctx, give} = setup();
  const weaver = give('A', '344'), atk = atkOf(s, ctx, weaver);
  s.players.B.latent = 1;
  const soul = s.players.B.soul;
  cast(s, ctx, give('A', '348', 'hand'));
  assert.equal(s.players.B.latent, 0);
  assert.equal(s.players.B.soul, soul - 1);
  assert.equal(atkOf(s, ctx, weaver), atk + 1);
});
test("War Cry (296): o Berserker que acabou de entrar ganha Impulse e fica Prepared", () => {
  const {s, ctx, give} = setup();
  const fresh = give('A', '291');
  s.units[fresh] = {prepared: false, damage: 0, entered: s.turn};
  ctx.decide = (player, q) => (q.options ? (q.options.includes(fresh) ? fresh : q.options[0]) : player === 'A');
  playDevotee(s, ctx, 'A', give('A', '296', 'hand'), {}); passAll(s);
  assert.ok(s.units[fresh].prepared);
  assert.ok(keywordsOf(s, ctx, fresh).includes('Impulse'));
});


test('Warplate é Armor (guia §26/§28): só entra vestida no Resonant; sem ele, entra sem portador', () => {
  const {s, ctx, give} = setup();
  assert.ok(cards.get('ares-v6-272').armor);
  const alc = give('A', '271'), gal = give('A', '310');
  const loose = give('A', '272', 'hand'), worn = give('A', '272', 'hand');
  assert.throws(() => playEquipment(s, ctx, 'A', loose, gal), /Resonant/);
  playEquipment(s, ctx, 'A', loose, null); passAll(s);
  assert.ok(s.players.A.battlefield.includes(loose));
  assert.equal(ctx.attached[loose], undefined);
  playEquipment(s, ctx, 'A', worn, alc); passAll(s);
  assert.equal(ctx.attached[worn], alc);
});
