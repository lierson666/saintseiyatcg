// Efeitos V6 de Athena — Equipment (playtest/engine-v3/v6/athena-gear.js).
// node --test tools/test-engine-v3-v6-athena-gear.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {activate as activateRaw, playEquipment as playEquipmentRaw, reequip} from '../playtest/engine-v3/play.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf, keywordsOf} from '../playtest/engine-v3/effects.js';
import {guardDecide} from './engine-test-upto.mjs';
// Guia §56 (30/10/2026): jogada e {T} vão à pilha; aqui os dois passam e a pilha resolve na hora.
const resolved = fn => (s, ...a) => { const r = fn(s, ...a); passAll(s); return r; };
const activate = resolved(activateRaw), playEquipment = resolved(playEquipmentRaw);

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

const G = n => `athena-v6-${String(n).padStart(3, '0')}`;
const FOE = 'artemis-v6-399'; // Wildwood Protector 3/4 Guardian
const SAINT = G(29); // Bear Geki 3/4 Bronze Saint
const [HYOGA, SHUN, IKKI, MU, SAGA, AIOLIA, CAMUS, SHAINA, ORPHEE] = [5, 7, 9, 11, 13, 15, 17, 22, 25].map(G);

// Igual a test-engine-v3-v6-athena.mjs. `decide` padrão: primeira opção (God se houver); "you may" sim só para A.
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
const strike = (s, ctx, attacker, target) => { const st = declareStrike(s, ctx, attacker, target); passAll(s); return st; };
const ready = s => s.players.A.bases.filter(b => b.prepared).length;
const dmg = (s, uid) => s.units[uid]?.damage ?? Infinity;
// +10 HP até o fim do Round: o alvo sobrevive ao Strike e os efeitos pós-dano podem ser observados.
const tough = (s, uid) => s.effects.push({kind: 'mod', target: uid, atk: 0, hp: 10, keywords: [], duration: 'this_round'});

test('006 Freezing Aura: dano de Strike põe 1 Seal; só uma vez por Round', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(6), 'battlefield', bear), foe = give('B', FOE);
  tough(s, foe);
  strike(s, ctx, bear, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal, 1);
  assert.ok(s.roundUses.has(`freezing:${cloth}`));
});

test('006 Freezing Aura: Seal prévio no início do Strike permite escolher comprar', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), foe = give('B', FOE);
  give('A', G(6), 'battlefield', bear);
  tough(s, foe);
  s.units[foe].seal = 1;
  const decide = ctx.decide;
  ctx.decide = (p, q) => (q.choose === 'mode' ? 'draw' : decide(p, q));
  const hand = s.players.A.hand.length;
  strike(s, ctx, bear, {kind: 'devotee', uid: foe});
  assert.equal(s.players.A.hand.length, hand + 1);
  assert.equal(s.units[foe].seal, 1); // não ganhou Seal extra
});

test('006 Resonance Hyoga: +2 ATK no Strike contra Devotee com Seal; sem Seal, nada', () => {
  const {s, ctx, give} = setup();
  const hyoga = give('A', HYOGA), foe = give('B', FOE);
  give('A', G(6), 'battlefield', hyoga);
  const base = atkOf(s, ctx, hyoga);
  s.units[foe].seal = 1;
  const st = strike(s, ctx, hyoga, {kind: 'devotee', uid: foe});
  assert.equal(st.atks[hyoga], base + 2);
  // sem Seal
  const t = setup(), h2 = t.give('A', HYOGA), f2 = t.give('B', FOE);
  t.give('A', G(6), 'battlefield', h2);
  const st2 = strike(t.s, t.ctx, h2, {kind: 'devotee', uid: f2});
  assert.equal(st2.atks[h2], base);
});

test('010 Burning Spirit: +1 ATK só com dano marcado no portador', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT);
  give('A', G(10), 'battlefield', bear);
  const base = atkOf(s, ctx, bear); // inclui o +2 impresso
  s.units[bear].damage = 1;
  assert.equal(atkOf(s, ctx, bear), base + 1);
});

test('010 Resonance Ikki (01/11/2026): Ikki equipado derrotado compra 1; outro portador não', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', IKKI), other = give('A', SAINT);
  give('A', G(10), 'battlefield', ikki); give('A', G(10), 'battlefield', other);
  const hand = s.players.A.hand.length;
  s.units[ikki].damage = 99; s.units[other].damage = 99;
  k.checkDefeats(s, ctx); passAll(s);
  assert.ok(s.players.A.tartarus.includes(ikki));
  assert.equal(s.players.A.hand.length, hand + 1);
});

test('010 Phoenix Cloth V2: fora de Ikki a Armor não entra vestida (guia §28)', () => {
  const {s, ctx, give} = setup();
  const other = give('A', SAINT), c2 = give('A', G(10), 'hand');
  assert.throws(() => playEquipment(s, ctx, 'A', c2, other), /Resonant/);
});

test('012 Stardust Revolution: 3 de dano no alvo; custo 3 Base; uma vez por Round', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(12), 'battlefield', bear), foe = give('B', FOE), foe2 = give('B', FOE);
  activate(s, ctx, 'A', cloth, {target: foe});
  assert.equal(dmg(s, foe), 3);
  assert.equal(dmg(s, foe2), 0);
  assert.equal(ready(s), 7);
  assert.throws(() => activate(s, ctx, 'A', cloth, {target: foe}));
});

test('012 Resonance Mu: 1 de dano em cada Devotee inimigo, inclusive o alvo', () => {
  const {s, ctx, give} = setup();
  const mu = give('A', MU), cloth = give('A', G(12), 'battlefield', mu), foe = give('B', FOE), foe2 = give('B', FOE);
  activate(s, ctx, 'A', cloth, {target: foe});
  assert.equal(dmg(s, foe), 4); // 3 + 1 (o par de Wildwood Protector dá HP 5: sobrevive)
  assert.equal(dmg(s, foe2), 1);
});

test('014 Galaxian Explosion: distribui 5 entre os alvos escolhidos; Saga distribui 7', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(14), 'battlefield', bear), f1 = give('B', FOE), f2 = give('B', FOE);
  s.units[f1].damage = 0;
  activate(s, ctx, 'A', cloth);
  // decide: primeiro alvo = f1; "up to": aceita; segundo = f2; os pontos extras vão para o primeiro (f1). 5 = f1: 4 (derrotado) ...
  const total = (s.players.B.tartarus.includes(f1) ? 4 : dmg(s, f1)) + (s.players.B.tartarus.includes(f2) ? 4 : dmg(s, f2));
  assert.ok(total >= 5, 'f1 recebeu ao menos 1 e todo o dano foi distribuído');
  assert.equal(ready(s), 6); // 10 - 4
  // Saga: 7
  const t = setup(), saga = t.give('A', SAGA), c2 = t.give('A', G(14), 'battlefield', saga), g1 = t.give('B', FOE);
  t.s.units[g1].damage = 0;
  activate(t.s, t.ctx, 'A', c2);
  assert.ok(t.s.players.B.tartarus.includes(g1)); // 7 ≥ HP 4
});

test('014 Galaxian Explosion: alvo único recebe os 5', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(14), 'battlefield', bear), f1 = give('B', FOE);
  activate(s, ctx, 'A', cloth);
  assert.ok(s.players.B.tartarus.includes(f1));
});

test('016 Lightning Plasma: 2 de dano em até dois alvos diferentes; Aiolia +1 em cada', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(16), 'battlefield', bear), f1 = give('B', FOE), f2 = give('B', FOE), f3 = give('B', FOE);
  activate(s, ctx, 'A', cloth);
  assert.deepEqual([f1, f2, f3].map(u => dmg(s, u)), [2, 2, 0]);
  const t = setup(), ai = t.give('A', AIOLIA), c2 = t.give('A', G(16), 'battlefield', ai), g1 = t.give('B', FOE), g2 = t.give('B', FOE);
  activate(t.s, t.ctx, 'A', c2);
  assert.deepEqual([g1, g2].map(u => dmg(t.s, u)), [3, 3]);
});

test('018 Aurora Execution: 3 de dano; +2 se o alvo tem Seal', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(18), 'battlefield', bear), foe = give('B', FOE);
  activate(s, ctx, 'A', cloth, {target: foe});
  assert.equal(dmg(s, foe), 3);
  const t = setup(), b2 = t.give('A', SAINT), c2 = t.give('A', G(18), 'battlefield', b2), f2 = t.give('B', FOE);
  t.s.units[f2].seal = 1;
  activate(t.s, t.ctx, 'A', c2, {target: f2});
  assert.ok(t.s.players.B.tartarus.includes(f2)); // 5 ≥ HP 4
});

test('018 Resonance Camus: remove todos os Seals e causa 1 a mais por Seal (máx. 3)', () => {
  const {s, ctx, give} = setup();
  const camus = give('A', CAMUS), cloth = give('A', G(18), 'battlefield', camus), foe = give('B', FOE);
  s.units[foe].seal = 2;
  s.units[foe].damage = 0;
  // HP 4: 5 de dano já derrota; usa alvo com mais HP via dano a menos não existe — checa pela derrota e pelo Seal
  activate(s, ctx, 'A', cloth, {target: foe});
  assert.ok(s.players.B.tartarus.includes(foe)); // 5 ≥ 4: derrotado antes de remover Seals; sem dano extra
  // Alvo com HP maior: Sea Dragon Kanon 4/5 + Seal 1: 5 de dano o derrota; use Seal e HP com buff
  const t = setup(), c2 = t.give('A', CAMUS), cl2 = t.give('A', G(18), 'battlefield', c2), f2 = t.give('B', FOE);
  t.s.units[f2].seal = 0;
  activate(t.s, t.ctx, 'A', cl2, {target: f2});
  assert.equal(dmg(t.s, f2), 3); // sem Seal: sem extra
});

test('018 Resonance Camus: com HP sobrando, remove Seals e causa o extra', () => {
  const {s, ctx, give} = setup();
  const camus = give('A', CAMUS), cloth = give('A', G(18), 'battlefield', camus), foe = give('B', FOE);
  // buff de HP para o alvo sobreviver: +10 HP até o fim do Round
  tough(s, foe);
  s.units[foe].seal = 3;
  activate(s, ctx, 'A', cloth, {target: foe});
  // 3 + 2 (Seal) = 5; depois remove 3 Seals e causa +3
  assert.equal(s.units[foe].seal, 0);
  assert.equal(dmg(s, foe), 8);
});

test('020 Divine Aegis e Miracle: Saints amigos +0/+1; com 5 ou menos Soul, +1/+2', () => {
  const {s, ctx, give} = setup();
  const saint = give('A', SAINT), foeSaint = give('B', SAINT);
  const [atk, hp, fatk, fhp] = [atkOf(s, ctx, saint), hpOf(s, ctx, saint), atkOf(s, ctx, foeSaint), hpOf(s, ctx, foeSaint)];
  give('A', G(20));
  assert.equal(hpOf(s, ctx, saint), hp + 1);
  assert.equal(atkOf(s, ctx, saint), atk);
  assert.equal(hpOf(s, ctx, foeSaint), fhp); // só Saints amigos
  assert.equal(atkOf(s, ctx, foeSaint), fatk);
  s.players.A.soul = 5;
  assert.equal(atkOf(s, ctx, saint), atk + 1);
  assert.equal(hpOf(s, ctx, saint), hp + 2);
  const warrior = give('A', FOE);
  assert.equal(hpOf(s, ctx, warrior), 4); // não-Saint: sem bônus
});

test('020 Athena\'s Shield (31/10/2026): sem The Last Miracle, mesmo com 5 ou menos Soul', () => {
  const {s, ctx, give} = setup();
  s.players.A.soul = 5;
  playEquipment(s, ctx, 'A', give('A', G(20), 'hand'), null);
  passAll(s);
  assert.ok(!s.v6Game?.['A:last-miracle']);
  assert.ok(!s.effects.some(e => e.kind === 'prevent'));
});

test('020 Divine Sanctuary: Strike contra seu God, paga 3 e previne até 3', () => {
  const {s, ctx, give} = setup();
  give('A', G(20));
  const foe = give('B', FOE), soul = s.players.A.soul;
  s.active = 'B';
  declareStrike(s, ctx, foe, {kind: 'god', player: 'A'}); passAll(s);
  assert.equal(s.players.A.soul, soul); // ATK 3 inteiro prevenido
  assert.equal(ready(s), 7);
  assert.ok([...s.roundUses].some(t => String(t).startsWith('sanctuary:')));
});

test('046 Chain Defense: Strike contra outro Saint amigo, paga 1 e o atacante tem -1 ATK (-2 com Shun)', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), friend = give('A', G(28)), foe = give('B', FOE);
  give('A', G(46), 'battlefield', bear);
  s.active = 'B';
  tough(s, friend);
  const st = declareStrike(s, ctx, foe, {kind: 'devotee', uid: friend}); passAll(s);
  assert.equal(st.atks[foe], 2); // 3 - 1 durante o Strike
  assert.equal(atkOf(s, ctx, foe), 3); // o -1 acabou com o Strike
  assert.equal(dmg(s, friend), 2);
  assert.equal(ready(s), 9);
  // Shun: -2
  const t = setup(), shun = t.give('A', SHUN), fr = t.give('A', SAINT), f2 = t.give('B', FOE);
  t.give('A', G(46), 'battlefield', shun);
  t.s.active = 'B'; tough(t.s, fr);
  const st2 = declareStrike(t.s, t.ctx, f2, {kind: 'devotee', uid: fr}); passAll(t.s);
  assert.equal(st2.atks[f2], 1); // 3 - 2 (o dano ao alvo pode ser reduzido pelo Nebula Chain do Shun)
});

test('046 Chain Defense: não vale para o próprio portador; vale para o God; uma vez por Round', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), foe = give('B', FOE), foe2 = give('B', FOE);
  give('A', G(46), 'battlefield', bear);
  s.active = 'B';
  declareStrike(s, ctx, foe, {kind: 'devotee', uid: bear}); passAll(s);
  assert.equal(ready(s), 10, 'portador não conta como "another friendly Saint"');
  const soul = s.players.A.soul;
  declareStrike(s, ctx, foe2, {kind: 'god', player: 'A'}); passAll(s);
  assert.equal(soul - s.players.A.soul, atkOf(s, ctx, foe2) - 1); // ATK do par de Wildwood menos 1
  assert.equal(ready(s), 9);
});

test('047 Burning Will: +1 ATK com dano marcado no portador', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT);
  give('A', G(47), 'battlefield', bear);
  const base = atkOf(s, ctx, bear);
  assert.equal(base, 3);
  s.units[bear].damage = 2;
  assert.equal(atkOf(s, ctx, bear), 4);
});

test('050 Repair Tools: remove 1 dano de Devotee amigo com Armor; Mu remove até 2', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), tools = give('A', G(50), 'battlefield', bear);
  give('A', G(6), 'battlefield', bear);
  s.units[bear].damage = 3;
  activate(s, ctx, 'A', tools, {target: bear});
  assert.equal(s.units[bear].damage, 2);
  assert.equal(ready(s), 9);
  const t = setup(), mu = t.give('A', MU), tl = t.give('A', G(50), 'battlefield', mu);
  t.give('A', G(6), 'battlefield', mu);
  t.s.units[mu].damage = 3;
  activate(t.s, t.ctx, 'A', tl, {target: mu});
  assert.equal(t.s.units[mu].damage, 1);
});

test('051 Sacred Flame: +1 ATK só enquanto seu God tem menos Soul que o oposto', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT);
  give('A', G(51), 'battlefield', bear);
  const base = atkOf(s, ctx, bear);
  s.players.A.soul = 10; s.players.B.soul = 10;
  assert.equal(atkOf(s, ctx, bear), base);
  s.players.A.soul = 9;
  assert.equal(atkOf(s, ctx, bear), base + 1);
  s.players.A.soul = 11;
  assert.equal(atkOf(s, ctx, bear), base);
});

test('066 Aerial Grace: o portador ganha Nimble', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), other = give('A', SAINT);
  assert.ok(!keywordsOf(s, ctx, bear).includes('Nimble'));
  give('A', G(66), 'battlefield', bear);
  assert.ok(keywordsOf(s, ctx, bear).includes('Nimble'));
  assert.ok(!keywordsOf(s, ctx, other).includes('Nimble'));
});

test('067 Serpent’s Fang: dano de Strike dá -1 ATK ao Devotee atingido, uma vez por Round', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), cloth = give('A', G(67), 'battlefield', bear), foe = give('B', FOE);
  tough(s, foe);
  const base = atkOf(s, ctx, foe);
  strike(s, ctx, bear, {kind: 'devotee', uid: foe});
  assert.equal(atkOf(s, ctx, foe), base - 1);
  assert.ok(s.roundUses.has(`fang:${cloth}`));
});

test('067 Resonance Shaina: +1 de dano em alvo que tinha Seal no início do Strike', () => {
  const {s, ctx, give} = setup();
  const shaina = give('A', SHAINA), foe = give('B', FOE);
  give('A', G(67), 'battlefield', shaina);
  s.units[foe].seal = 1;
  tough(s, foe);
  strike(s, ctx, shaina, {kind: 'devotee', uid: foe});
  // dano de 1 fora de Strike = o extra da Resonance (o Thunder Claw da própria Shaina causa 2)
  const extra = st => st.events.filter(e => e.type === 'damage' && e.uid === foe && !e.strike && e.incoming === 1).length;
  assert.equal(extra(s), 1);
  // sem Seal: sem dano extra
  const t = setup(), sh2 = t.give('A', SHAINA), f2 = t.give('B', FOE);
  t.give('A', G(67), 'battlefield', sh2);
  tough(t.s, f2);
  strike(t.s, t.ctx, sh2, {kind: 'devotee', uid: f2});
  assert.equal(t.s.events.filter(e => e.type === 'damage' && e.uid === f2 && !e.strike && e.incoming === 1).length, 0);
});

test('068 Air Barrier: portador atacado, paga 1 e previne 1; uma vez por Round', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), foe = give('B', FOE), cloth = give('A', G(68), 'battlefield', bear);
  s.active = 'B';
  declareStrike(s, ctx, foe, {kind: 'devotee', uid: bear}); passAll(s);
  assert.equal(dmg(s, bear), 2); // 3 - 1; o dano que passou vai ao portador (a Armor não tem dano próprio)
  assert.equal(s.units[cloth]?.damage ?? 0, 0, 'a Armor não acumula dano');
  assert.equal(ready(s), 9);
});

test('070 Healing Melody: remove 1 de dano de Saint amigo; Orphee pode curar outro Saint', () => {
  const {s, ctx, give} = setup();
  const bear = give('A', SAINT), lyra = give('A', G(70), 'battlefield', bear);
  s.units[bear].damage = 2;
  activate(s, ctx, 'A', lyra, {target: bear});
  assert.equal(s.units[bear].damage, 1);
  assert.equal(ready(s), 9);
  const t = setup(), orphee = t.give('A', ORPHEE), friend = t.give('A', SAINT), c2 = t.give('A', G(70), 'battlefield', orphee);
  t.s.units[orphee].damage = 2; t.s.units[friend].damage = 2;
  activate(t.s, t.ctx, 'A', c2, {target: orphee});
  assert.equal(t.s.units[orphee].damage, 1);
  assert.equal(t.s.units[friend].damage, 1);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
const foeStrike = (s, ctx, attacker, target) => { s.active = 'B'; return strike(s, ctx, attacker, target); };

test('008 Counterattack: Nebula Chain do Shun previne e o atacante leva metade do dano prevenido (para baixo)', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', SHUN), cloth = give('A', G(8), 'battlefield', shun), ally = give('A', SAINT), foe = give('B', FOE);
  const atk = atkOf(s, ctx, foe);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: ally});
  assert.equal(dmg(s, ally), 0);
  assert.equal(dmg(s, foe), Math.floor(atk / 2));
  assert.ok(cloth);
});

test('008 Counterattack: vale também para Strike contra o God; sem Nebula Chain não dispara', () => {
  const {s, ctx, give} = setup();
  const shun = give('A', SHUN); give('A', G(8), 'battlefield', shun);
  const foe = give('B', FOE), atk = atkOf(s, ctx, foe);
  foeStrike(s, ctx, foe, {kind: 'god', player: 'A'});
  assert.equal(dmg(s, foe), Math.floor(atk / 2));
  const {s: s2, ctx: c2, give: g2} = setup();
  const shun2 = g2('A', SHUN); g2('A', G(8), 'battlefield', shun2);
  s2.units[shun2].prepared = false; // sem Prepared, o Nebula Chain não acontece
  const ally2 = g2('A', SAINT), foe2 = g2('B', FOE);
  foeStrike(s2, c2, foe2, {kind: 'devotee', uid: ally2});
  assert.ok(dmg(s2, ally2) > 0);
});

test('016 Leo Gold Cloth, Resonance Ikki (01/11/2026): Ikki voltando do Tártaro causa 1 de dano', () => {
  const {s, ctx, give} = setup();
  give('A', G(16)); // solta no campo
  const ikki = give('A', IKKI, 'tartarus'), foe = give('B', FOE);
  k.putOntoField(s, ctx, 'A', ikki, 'tartarus'); passAll(s);
  assert.equal(s.units[foe].damage, 1);
  const other = give('A', SAINT, 'tartarus');
  k.putOntoField(s, ctx, 'A', other, 'tartarus'); passAll(s);
  assert.equal(s.units[foe].damage, 1, 'só Ikki dispara');
});

test('047 Phoenix Feather: Ikki sobrevive a um Strike e pode remover 1 dano (uma vez por Round)', () => {
  const {s, ctx, give} = setup();
  const ikki = give('A', IKKI), feather = give('A', G(47), 'battlefield', ikki), foe = give('B', FOE);
  tough(s, ikki);
  strike(s, ctx, ikki, {kind: 'devotee', uid: foe});
  const taken = (atkOf(s, ctx, foe));
  assert.equal(dmg(s, ikki), taken - 1);
  assert.ok(s.roundUses.has(`feather:${feather}`));
});

test('066 Eagle Silver Cloth: Marin sobrevive e põe 1 Training em outro Bronze Saint amigo', () => {
  const {s, ctx, give} = setup();
  const marin = give('A', G(21)), cloth = give('A', G(66), 'battlefield', marin), ally = give('A', SAINT), foe = give('B', FOE);
  tough(s, marin);
  strike(s, ctx, marin, {kind: 'devotee', uid: foe});
  assert.equal(s.units[ally].training, 1);
  assert.ok(s.roundUses.has(`aerial:${cloth}`));
});

test('069 Medusa\'s Curse: o portador sobrevive como defensor e o atacante fica com -1 ATK (31/10/2026)', () => {
  const {s, ctx, give} = setup();
  const me = give('A', SAINT), cloth = give('A', G(69), 'battlefield', me), foe = give('B', FOE), atk = atkOf(s, ctx, foe);
  tough(s, me);
  foeStrike(s, ctx, foe, {kind: 'devotee', uid: me});
  assert.equal(s.units[foe].seal || 0, 0);
  assert.equal(atkOf(s, ctx, foe), atk - 1);
  assert.ok(s.roundUses.has(`curse:${cloth}`));
});

test('069 Medusa\'s Curse: como atacante não dispara', () => {
  const {s, ctx, give} = setup();
  const me = give('A', SAINT); give('A', G(69), 'battlefield', me);
  const foe = give('B', FOE);
  tough(s, me); tough(s, foe);
  strike(s, ctx, me, {kind: 'devotee', uid: foe});
  assert.equal(s.units[foe].seal || 0, 0);
});
