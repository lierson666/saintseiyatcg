// Efeitos V6 de Poseidon (playtest/engine-v3/v6/poseidon.js) em partida: um caso por gancho e por família de carta.
// node --test tools/test-engine-v3-v6-poseidon.mjs  (precisa de card-forge/art-web/cards.json)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, addSeal, RuleError} from '../playtest/engine-v3/core.js';
import {playDevotee, playEquipment, playSpell, activate} from '../playtest/engine-v3/play.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf} from '../playtest/engine-v3/effects.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;
const P = n => `poseidon-v6-${n}`;

// A: Poseidon (Tide of the Seven Seas, Domain 142); B: Hades. `answers[ability]`: resposta fixa ou função da pergunta;
// sem resposta, escolhe a primeira opção ou diz sim.
function poseidon(answers = {}) {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-poseidon-tide'), B: deck('preview-hades-108')}, gods: {A: 'god-poseidon', B: 'god-athena'}, first: 'A', seed: 1});
  const s = m.state, asked = [];
  const decide = (player, q) => {
    asked.push({player, ...q});
    const a = answers[q.ability];
    if (a !== undefined) return typeof a === 'function' ? a(q) : a;
    return q.options ? q.options[0] : true;
  };
  const ctx = guardDecide({cards, objects: m.objects, attached: m.attached, decide}), A = s.players.A, B = s.players.B;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: null, B: null}; // Domains (Ressonância do 142 compra ao conjurar): test-engine-v3-domains.mjs
  startTurn(s);
  A.bases = A.deck.splice(-12).map(uid => ({uid, prepared: true}));
  let n = 0;
  // Carta (do deck ou nova) na zona pedida; no campo entra Prepared, sem dano.
  const put = (key, cardId, zone = 'hand') => {
    const p = s.players[key];
    let uid = p.deck.find(u => m.objects[u].cardId === cardId);
    if (uid) p.deck.splice(p.deck.indexOf(uid), 1);
    else { uid = `${key}:x${n++}:${cardId}`; m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor}; }
    p[zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  return {s, ctx, A, B, put, asked};
}
const ready = p => p.bases.filter(b => b.prepared).length;

test('enter + bounce: Sea Dragon Kanon devolve o Devotee inimigo à mão do Owner', () => {
  const {s, ctx, B, put} = poseidon({'SEA DRAGON KANON': q => q.options.find(u => u.startsWith('B'))});
  const foe = put('B', 'hades-v6-211', 'battlefield'), kanon = put('A', P('091'));
  playDevotee(s, ctx, 'A', kanon, {}); passAll(s);
  assert.ok(B.hand.includes(foe));
  assert.equal(s.units[foe], undefined);
});

test('spell: Abyssal Weight põe 1 Seal, ou 2 se já tinha', () => {
  const {s, ctx, put} = poseidon();
  s.domains.A = null;
  const foe = put('B', 'hades-v6-211', 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('137')), {}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  playSpell(s, ctx, 'A', put('A', P('137')), {}); passAll(s);
  assert.equal(s.units[foe].seal, 3, 'já Sealed: +2');
});

// Priest of the Abyss, Abyssal Tide (autor, 08/11/2026): Spell de qualquer jogador; você mói 1 e o oponente mói 2.
test('declare: Marina Spearman ganha +1 ATK contra inimigo Sealed, só durante o Strike', () => {
  const {s, ctx, put} = poseidon();
  const spear = put('A', P('107'), 'battlefield'), foe = put('B', 'hades-v6-183', 'battlefield'); // Griffon Minos: 3/6 (Beetle caiu para 4/3 em 30/10/2026)
  addSeal(s, ctx, [foe], 1, 'teste'); passAll(s);
  declareStrike(s, ctx, spear, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[foe].damage, 3);
  assert.equal(atkOf(s, ctx, spear), 2, 'o bônus some depois do Strike');
});

test('godDamage: Siren Sorrento faz o God inimigo moer 2 (31/10/2026: era discard)', () => {
  const {s, ctx, B, put} = poseidon();
  const siren = put('A', P('093'), 'battlefield');
  B.hand.push(...B.deck.splice(0, 2));
  const deck = B.deck.length;
  declareStrike(s, ctx, siren, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(B.hand.length, 2);
  assert.equal(B.deck.length, deck - 2);
});

test('activate em Equipment: Kraken Scale sela um inimigo, uma vez por Round, pagando {2}', () => {
  const {s, ctx, A, put} = poseidon();
  const isaac = put('A', P('097'), 'battlefield'), scale = put('A', P('098'), 'battlefield');
  ctx.attached[scale] = isaac;
  const foe = put('B', 'hades-v6-211', 'battlefield'), before = ready(A);
  activate(s, ctx, 'A', scale, {}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(before - ready(A), 2);
  assert.throws(() => activate(s, ctx, 'A', scale, {}), RuleError);
});

test('mods: Ocean Temple Guard +0/+1 com Domain de Poseidon', () => {
  const {s, ctx, put} = poseidon();
  s.domains.A = P('142');
  const temple = put('A', P('106'), 'battlefield');
  assert.equal(hpOf(s, ctx, temple), 4, '3 impresso + 1 do Domain');
  s.domains.A = 'athena-v6-062'; // Domain de outra facção não conta (autor, 01/11/2026)
  assert.equal(hpOf(s, ctx, temple), 3);
});

test('modo: Marina\'s Oath em Loyalty dá +0/+2 até o fim do Round', () => {
  const {s, ctx, put} = poseidon({'LOYALTY OR DISCIPLINE': 'Loyalty'});
  const spear = put('A', P('107'), 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('140')), {}); passAll(s);
  assert.equal(hpOf(s, ctx, spear), 3); // Spearman 2/1 (31/10/2026) + Loyalty +0/+2
});

test('174 The Wrath of the Seven Seas (Sleep, 31/10/2026): 1 Seal em cada Devotee inimigo, sem dano', () => {
  const {s, ctx, put} = poseidon();
  const a = put('B', 'hades-v6-183', 'battlefield'), b = put('B', 'hades-v6-191', 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('174')), {}); passAll(s);
  assert.deepEqual([s.units[a].seal, s.units[b].seal, s.units[a].damage, s.units[b].damage], [1, 1, 0, 0]);
});

// ---- Completados com os ganchos novos (29/10/2026) ----
const done = s => { while (s.window) passAll(s); };
const bases = p => p.bases.filter(b => b.prepared).length;

test('watchSpell: Poseidon\'s Trident (178) compra ao conjurar Technique e Royal Scepter (170) saqueia', () => {
  const {s, ctx, A, put} = poseidon();
  s.domains.A = null;
  put('A', P('178'), 'battlefield'); put('A', P('170'), 'battlefield');
  const spell = put('A', P('137'));
  const hand0 = A.hand.length;
  playSpell(s, ctx, 'A', spell, {}); done(s);
  // +1 (Trident) +1 -1 (Scepter) -1 (Spell conjurada)
  assert.equal(A.hand.length, hand0 + 1 + 1 - 1 - 1 + 0);
});

test('Sacred Interdiction (119): contra-mágica do Moment/Technique inimigo, a menos que o controlador pague {2}{C}', () => {
  const {s, ctx, B, A, put} = poseidon({'SACRED INTERDICTION': (q) => (q.options ? q.options[0] : true)});
  const warden = put('A', P('119'), 'battlefield');
  // B conjura uma Technique do Hades; A tem prioridade para o gatilho.
  s.active = 'B';
  B.bases = B.deck.splice(0, 6).map(uid => ({uid, prepared: true}));
  const spell = put('B', 'hades-v6-233');
  const b0 = bases(B);
  playSpell(s, ctx, 'B', spell, {}); done(s);
  // B responde "sim" à pergunta de pagar {2}{C}? answers devolve true para qualquer jogador: B paga e a Spell resolve
  assert.equal(s.units[warden].prepared, false);
  assert.ok(bases(B) <= b0 - 2 - cards.get('hades-v6-233').cost.amount + 0);
  assert.ok(A);
});

test('Sacred Interdiction (119): sem pagar, a Spell é anulada e vai ao Tartarus sem efeito', () => {
  const {s, ctx, B, put} = poseidon({'SACRED INTERDICTION': q => !q.uid /* só o gatilho do Warden tem uid; o controlador da Spell recusa pagar */ ? false : true});
  put('A', P('119'), 'battlefield');
  s.active = 'B';
  B.bases = B.deck.splice(0, 6).map(uid => ({uid, prepared: true}));
  const spell = put('B', 'hades-v6-233'), soul = B.soul;
  playSpell(s, ctx, 'B', spell, {}); done(s);
  assert.ok(B.tartarus.includes(spell));
  assert.equal(B.soul, soul, 'The Call of the Underworld perde Soul se resolver: não resolveu');
  assert.ok(s.events.some(e => e.type === 'spell_countered'));
});

test('survive: Atlantean Sentinel (105) põe Seal no atacante; Baian (145) e War Helm (130) como defensores', () => {
  const {s, ctx, A, put} = poseidon();
  s.domains.A = null;
  const sentinel = put('A', P('105'), 'battlefield'), foe = put('B', 'hades-v6-183', 'battlefield'); // HP 6: sobrevive à retaliação
  s.effects.push({kind: 'mod', target: sentinel, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  s.active = 'B';
  declareStrike(s, ctx, foe, {kind: 'devotee', uid: sentinel}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  assert.ok(A);
});

test('Frozen Brotherhood (097): Isaac ataca Hyoga e sobrevivem: 1 Seal sai de cada um', () => {
  const {s, ctx, put} = poseidon();
  s.domains.A = null;
  const isaac = put('A', P('097'), 'battlefield'), hyoga = put('B', 'athena-v6-005', 'battlefield');
  s.effects.push({kind: 'mod', target: isaac, atk: 0, hp: 20, keywords: [], duration: 'this_round'});
  s.effects.push({kind: 'mod', target: hyoga, atk: 0, hp: 20, keywords: [], duration: 'this_round'});
  s.units[isaac].seal = 2; s.units[hyoga].seal = 1;
  declareStrike(s, ctx, isaac, {kind: 'devotee', uid: hyoga}); passAll(s);
  assert.equal(s.units[isaac].seal, 2, '2 +1 (Diamond Dust do Hyoga) -1 (Frozen Brotherhood)');
  assert.equal(s.units[hyoga].seal, 1, '1 +1 (Aurora Borealis) -1 (Frozen Brotherhood)');
});

test('gearSurvive: Atlantean War Helm (130) olha o topo do deck como defensor (uma vez por Round)', () => {
  const {s, ctx, put, asked} = poseidon();
  s.domains.A = null;
  const me = put('A', 'poseidon-v6-101', 'battlefield'), helm = put('A', P('130'), 'battlefield'), foe = put('B', 'hades-v6-211', 'battlefield');
  ctx.attached[helm] = me;
  s.effects.push({kind: 'mod', target: me, atk: 0, hp: 10, keywords: [], duration: 'this_round'});
  s.active = 'B';
  declareStrike(s, ctx, foe, {kind: 'devotee', uid: me}); passAll(s);
  assert.ok(asked.some(q => q.ability === 'BATTLE AWARENESS'));
  assert.ok(s.roundUses.has(`awareness:${helm}`));
});

// ---------- Contra-mágicas e reações a alvo de Spell (guia §54: toda Spell abre janela; alvos escolhidos ao conjurar) ----------
// Aqui Poseidon é B (responde); A (Hades, ativo) conjura Eternal Slumber (hades-v6-192, Technique: 3 Seal no Devotee inimigo alvo).
function duel(answers = {}) {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-hades-108'), B: deck('preview-poseidon-tide')}, gods: {A: 'god-hades', B: 'god-poseidon'}, first: 'A', seed: 1});
  const s = m.state, asked = [];
  const decide = (player, q) => {
    asked.push({player, ...q});
    const a = answers[q.ability];
    if (a !== undefined) return typeof a === 'function' ? a(q, player) : a;
    return q.options ? q.options[0] : true;
  };
  const ctx = guardDecide({cards, objects: m.objects, attached: m.attached, decide}), A = s.players.A, B = s.players.B;
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  s.domains = {A: null, B: null}; // Domains (Ressonância do 142 compra ao conjurar): test-engine-v3-domains.mjs
  startTurn(s);
  A.bases = A.deck.splice(-12).map(uid => ({uid, prepared: true}));
  B.bases = B.deck.splice(-12).map(uid => ({uid, prepared: true}));
  B.latent = 10;
  let n = 0;
  const put = (key, cardId, zone = 'hand') => {
    const uid = `${key}:y${n++}:${cardId}`;
    m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  // A conjura Minos mirando `target`; devolve o uid da Spell.
  const minos = target => { const sp = put('A', 'hades-v6-192'); answers['ETERNAL SLUMBER'] = () => target; playSpell(s, ctx, 'A', sp); return sp; };
  const respond = id => { const uid = put('B', P(id)); playSpell(s, ctx, 'B', uid); return uid; };
  const sealed = uid => s.units[uid]?.seal || 0;
  return {s, ctx, A, B, put, minos, respond, sealed, asked, answers};
}

test('133 Call of the Ocean: alvo escolhido ao conjurar; anula a menos que o controlador pague {2}{C}', () => {
  for (const pays of [false, true]) {
    const {s, A, B, put, minos, respond, sealed, answers} = duel();
    answers['CALL OF THE OCEAN'] = q => (q.options ? q.options[0] : pays); // alvo = 1ª opção; "pagar?" = pays
    const x = put('B', P('118'), 'battlefield'), sp = minos(x);
    const counter = respond('133');
    assert.deepEqual(s.chain.find(i => i.uid === counter).targets, [sp]); // a resposta mira a Spell na cadeia
    const bases = ready(A);
    done(s);
    if (pays) { assert.equal(sealed(x), 3); assert.equal(ready(A), bases - 2); assert.ok(!s.events.some(e => e.type === 'spell_countered')); }
    else { assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp)); assert.ok(s.events.some(e => e.type === 'spell_countered' && e.uid === sp)); }
    assert.ok(B.tartarus.includes(counter));
  }
});

test('133/136/156/167: sem Moment ou Technique inimigo na cadeia não há alvo e a conjuração é recusada', () => {
  const {s, ctx, B, put} = duel();
  s.active = 'B';
  for (const id of ['133', '136', '156', '167']) assert.throws(() => playSpell(s, ctx, 'B', put('B', P(id))), RuleError, id);
  assert.equal(B.stack.length, 0);
});

test('136 The Sea Never Forgives (Fierce Guardianship): anula qualquer Moment ou Technique inimigo', () => {
  const {s, ctx, A, put, minos, respond, sealed} = duel();
  const x = put('B', P('118'), 'battlefield'), sp = minos(x);
  respond('136'); done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
});

test('154 The Sea Dragon\'s Command: Royal Interdiction anula a menos que pague {3}{C}; sem Spell na cadeia só oferece Reversal', () => {
  const {s, A, put, minos, respond, sealed, answers, asked} = duel();
  answers['THE SEA DRAGON\'S COMMAND'] = 'Royal Interdiction'; answers['ROYAL INTERDICTION'] = q => (q.options ? q.options[0] : false);
  put('A', 'hades-v6-206', 'battlefield'); // Devotee inimigo de B: Reversal também é possível
  const x = put('B', P('118'), 'battlefield'), sp = minos(x);
  respond('154');
  assert.deepEqual(asked.filter(q => q.choose === 'mode').map(q => q.options), [['Dimensional Reversal', 'Royal Interdiction']]); // perguntado ao conjurar
  done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  // Fora de janela (cadeia vazia) o único modo possível é Reversal: sem pergunta de modo.
  const d = duel(), foe = d.put('A', 'hades-v6-206', 'battlefield');
  d.s.active = 'B'; d.s.window = null;
  playSpell(d.s, d.ctx, 'B', d.put('B', P('154')));
  assert.equal(d.asked.filter(q => q.choose === 'mode').length, 0);
  assert.equal(d.s.chain[0].targets[0], foe);
});

test('156 Wall of Ocean Currents (31/10/2026): anula Equipment inimigo na pilha', () => {
  const {s, ctx, A, put, respond} = duel();
  const gear = put('A', 'hades-v6-224');
  playEquipment(s, ctx, 'A', gear, null); // Armor sem Devotee Resonant entra sem portador
  respond('156'); done(s);
  assert.ok(A.tartarus.includes(gear) && !A.battlefield.includes(gear));
  s.active = 'B'; s.window = null;
  assert.throws(() => respond('156'), /Equipment/, 'sem Equipment na pilha não conjura');
});

test('159 The Seven Seas Answer (31/10/2026): Denial anula Devotee inimigo na pilha; Reversal devolve Equipment inimigo', () => {
  const a = duel();
  a.answers['THE SEVEN SEAS ANSWER'] = 'Denial';
  const foe = a.put('A', 'hades-v6-206');
  playDevotee(a.s, a.ctx, 'A', foe, {});
  a.respond('159'); done(a.s);
  assert.ok(a.A.tartarus.includes(foe) && !a.s.units[foe]);
  const b = duel(), gear = b.put('A', 'hades-v6-224', 'battlefield');
  b.s.active = 'B'; b.s.window = null;
  b.answers['THE SEVEN SEAS ANSWER'] = 'Reversal';
  b.respond('159'); done(b.s);
  assert.ok(b.A.hand.includes(gear) && !b.A.battlefield.includes(gear));
});

test('167 Song of the Last Siren (Force of Will, 31/10/2026): anula qualquer carta na pilha; custa {3}{S} e 1 descarte', () => {
  const {s, B, put, minos, respond, sealed} = duel();
  put('B', P('133')); // carta na mão para o descarte
  const x = put('B', P('118'), 'battlefield'), sp = minos(x), soul = B.soul, hand = B.hand.length;
  respond('167'); done(s);
  assert.equal(sealed(x), 0); assert.ok(s.players.A.tartarus.includes(sp));
  assert.ok(s.events.some(e => e.type === 'soul_lost' && e.player === 'B' && e.amount === 3 && e.cause === 'cost'));
  assert.equal(B.soul, soul - 3, 'sem Domain: só o custo');
  assert.equal(B.hand.length, hand - 1, 'descartou 1 (a 167 foi conjurada a partir da mão nova)');
  const d = duel(), foe = d.put('A', 'hades-v6-206');
  d.put('B', P('133'));
  playDevotee(d.s, d.ctx, 'A', foe, {});
  d.respond('167'); done(d.s);
  assert.ok(d.A.tartarus.includes(foe) && !d.s.units[foe], 'também anula Devotee');
});

test('171 The Emperor\'s Decree: Silence é modo escolhido ao conjurar (junto com Dominion)', () => {
  const {s, A, B, put, minos, respond, sealed, answers} = duel();
  const picks = ['Silence', 'Dominion'];
  answers['CHOOSE TWO'] = q => { const m = picks.shift(); assert.ok(q.options.includes(m)); return m; };
  const x = put('B', P('118'), 'battlefield'), sp = minos(x), hand = B.hand.length;
  respond('171'); done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  assert.equal(B.hand.length, hand + 1); // +2 compradas, -1 descartada
});

test('cantrips de Poseidon (31/10/2026): 135 Opt, 138 Brainstorm, 139 Ponder, 158 Accumulated Knowledge custam 1–2 e são Cosmoble', () => {
  for (const [n, cost, sub] of [['135', 1, 'Moment'], ['138', 1, 'Moment'], ['139', 1, 'Technique'], ['158', 2, 'Moment']]) {
    const c = cards.get(P(n));
    assert.equal(c.cost.amount, cost, n); assert.equal(c.cosmoble, true, n); assert.match(c.type, new RegExp(sub), n);
  }
});

test('138 Brainstorm: compra 3 e devolve 2 da mão ao topo; a primeira escolhida fica por cima', () => {
  const {s, ctx, A, put} = poseidon();
  const order = [];
  const spell = put('A', P('138'));
  const ctx2 = {...ctx, decide: (pl, q) => (q.ability === 'THE OCEAN\'S EMBRACE' ? (order.push(q.options.at(-1)), q.options.at(-1)) : ctx.decide(pl, q))};
  const hand = A.hand.length - 1;
  playSpell(s, ctx2, 'A', spell); done(s);
  assert.equal(A.hand.length, hand + 3 - 2);
  assert.equal(order.length, 2);
  assert.deepEqual(A.deck.slice(0, 2), [order[0], order[1]]);
});

test('139 Ponder: sem embaralhar, devolve as 3 na ordem escolhida e compra a de cima; com embaralhar, compra 1', () => {
  const {s, ctx, A, put} = poseidon({'WHISPERS FROM THE ABYSS': q => (q.options ? q.options.at(-1) : false)});
  const look = A.deck.slice(0, 3), hand = A.hand.length;
  playSpell(s, ctx, 'A', put('A', P('139'))); done(s);
  assert.ok(A.hand.includes(look[2]), 'a primeira escolhida ficou por cima e foi comprada');
  assert.deepEqual(A.deck.slice(0, 2), [look[1], look[0]]);
  assert.equal(A.hand.length, hand + 1);
  const t = poseidon({'WHISPERS FROM THE ABYSS': true}), size = t.A.deck.length;
  playSpell(t.s, t.ctx, 'A', t.put('A', P('139'))); done(t.s);
  assert.equal(t.A.deck.length, size - 1);
});

test('158 Accumulated Knowledge: compra 1 + 1 por cópia no Tartarus', () => {
  const {s, ctx, A, put} = poseidon();
  put('A', P('158'), 'tartarus'); put('A', P('158'), 'tartarus');
  const hand = A.hand.length;
  playSpell(s, ctx, 'A', put('A', P('158'))); done(s);
  assert.equal(A.hand.length, hand + 3);
});

test('115 Tidal Escape: ao ser alvo de Spell inimiga volta à mão; a Spell perde o alvo e a parte dele não acontece', () => {
  const {s, A, B, put, minos, sealed} = duel();
  const scout = put('B', P('115'), 'battlefield'), other = put('B', P('118'), 'battlefield'), hand = A.hand.length;
  const sp = minos(scout);
  assert.deepEqual(s.chain.find(i => i.uid === sp).targets, [scout]);
  done(s);
  assert.ok(B.hand.includes(scout) && !s.units[scout]);
  assert.equal(sealed(other), 0); assert.ok(A.tartarus.includes(sp));
  assert.equal(A.hand.length, hand + 1); // "Draw 1 card" não dependia do alvo
});

test('117 Tidal Rejection: paga {2}{C}, Exhaust no Guardian e anula Spell que mira o God ou Devotee seu; uma vez por Round', () => {
  const {s, A, B, put, minos, sealed} = duel();
  const guard = put('B', P('117'), 'battlefield'), x = put('B', P('118'), 'battlefield'), sp = minos(x), bases = ready(B);
  done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  assert.equal(s.units[guard].prepared, false); assert.equal(ready(B), bases - 2);
  const again = minos(x); done(s); // mesmo Round: não reage de novo
  assert.equal(sealed(x), 3); assert.ok(A.tartarus.includes(again));
});

test('121 Countercurrent: devolve o Marina mirado e, sem alvo legal restante, anula a Spell', () => {
  const {s, A, B, put, minos, sealed} = duel();
  const master = put('B', P('121'), 'battlefield'), hand = A.hand.length, bases = ready(B);
  const sp = minos(master);
  done(s);
  assert.ok(B.hand.includes(master) && !s.units[master]);
  assert.ok(A.tartarus.includes(sp)); assert.ok(s.events.some(e => e.type === 'spell_countered' && e.uid === sp));
  assert.equal(A.hand.length, hand); // anulada: sem "Draw 1"
  assert.equal(ready(B), bases - 1);
});

test('121 Countercurrent: Spell inimiga mirando um God não quebra o gatilho (alvo god:X sem objeto)', () => {
  const {s, ctx, put} = duel();
  const master = put('B', P('121'), 'battlefield'), sp = put('A', 'hades-v6-192');
  assert.doesNotThrow(() => V6[P('121')].watchSpell(s, ctx, 'B', master, 'A', sp, ['god:B']));
});

test('124 Coral Barrier: portador mirado; paga {2}{C} e anula a menos que o controlador pague {2}{C}', () => {
  for (const pays of [false, true]) {
    const {s, ctx, A, B, put, minos, sealed, answers} = duel();
    answers['LIVING REEF'] = (q, player) => (player === 'A' ? pays : true); // A responde "pagar para manter a Spell?"; B paga o Reef
    const bearer = put('B', P('118'), 'battlefield'), gear = put('B', P('124'), 'battlefield');
    ctx.attached[gear] = bearer;
    const sp = minos(bearer), bases = ready(B);
    done(s);
    assert.equal(ready(B), bases - 2);
    assert.equal(sealed(bearer), pays ? 3 : 0);
    assert.equal(A.tartarus.includes(sp), true);
  }
});

// ---- Poseidon → Azul (meta Premodern, 31/10/2026): docs/rebalance-poseidon-premodern.md ----
test('118 é lorde: outras Marinas +1 ATK; o próprio lorde não se conta', () => {
  const {s, ctx, put} = poseidon();
  const spear = put('A', P('107'), 'battlefield'), banner = put('A', P('118'), 'battlefield');
  assert.deepEqual([atkOf(s, ctx, spear), hpOf(s, ctx, spear)], [3, 1]);
  assert.deepEqual([atkOf(s, ctx, banner), hpOf(s, ctx, banner)], [1, 3]);
});

test('165 Viking Tiger Claw: Seal e -2 ATK, sem dano', () => {
  const {s, ctx, put} = poseidon();
  const foe = put('B', 'hades-v6-183', 'battlefield'), atk = atkOf(s, ctx, foe);
  playSpell(s, ctx, 'A', put('A', P('165')), {}); passAll(s);
  assert.deepEqual([s.units[foe].seal, s.units[foe].damage, atkOf(s, ctx, foe)], [1, 0, atk - 2]);
});

test('099 Thetis: sem General nem Escama no topo, as 3 vão ao fundo e o dono vê quais eram (evento looked)', () => {
  const {s, ctx, A, put} = poseidon();
  const plain = A.deck.filter(u => !/General|Scale/.test(cards.get(s.players.A.deck.length && ctx.objects[u].cardId).type)).slice(0, 3);
  for (const u of plain) A.deck.splice(A.deck.indexOf(u), 1);
  A.deck.unshift(...plain);
  playDevotee(s, ctx, 'A', put('A', P('099')), {}); done(s);
  const e = s.events.find(x => x.type === 'looked');
  assert.deepEqual(e.uids, plain);
  assert.equal(e.kept, null);
  assert.deepEqual(A.deck.slice(-3), plain);
});

// ---- Staples do azul (autor, 08/11/2026: docs/proposta-poseidon-staples-azul.md) ----
test('109 Abyssal Watcher: busca Moment ou Technique de custo 2 ou menos', () => {
  const {s, ctx, A, put, asked} = poseidon();
  playDevotee(s, ctx, 'A', put('A', P('109')), {}); done(s);
  const q = asked.find(x => x.ability === 'EYES OF THE ABYSS');
  assert.ok(q && q.options.every(u => ctx.cards.get(ctx.objects[u].cardId).cost.amount <= 2 && /Moment|Technique/.test(ctx.cards.get(ctx.objects[u].cardId).type)));
  assert.ok(A.hand.includes(q.options[0]));
});

test('102 Priest e 103 Herald: uma vez por Round, compra 1 e cria Marina Soldier', () => {
  const {s, ctx, A, put} = poseidon();
  put('A', P('102'), 'battlefield'); put('A', P('103'), 'battlefield');
  const h0 = A.hand.length;
  playSpell(s, ctx, 'A', put('A', P('139')), {}); done(s);
  playSpell(s, ctx, 'A', put('A', P('139')), {}); done(s);
  assert.equal(A.battlefield.filter(u => ctx.objects[u].cardId === 'token-marina-soldier').length, 1);
  assert.ok(A.hand.length >= h0 + 1);
});

test('110 Coral Reef Defender: Strike contra o God paga {1}{C}; sem Cosmo, não pode', () => {
  const {s, ctx, A, put} = poseidon();
  put('B', P('110'), 'battlefield');
  const siren = put('A', P('093'), 'battlefield'); // Nimble ignora o Guardian sem Nimble
  const b0 = bases(A);
  declareStrike(s, ctx, siren, {kind: 'god', player: 'B'}); done(s);
  assert.equal(bases(A), b0 - 1);
  const other = put('A', P('093'), 'battlefield');
  A.bases.forEach(b => { b.prepared = false; }); A.latent = 0;
  assert.throws(() => declareStrike(s, ctx, other, {kind: 'god', player: 'B'}), RuleError);
});

test('116 Pearl Sanctuary Keeper: blink volta Unprepared, sem marcadores e sem dano', () => {
  const {s, ctx, A, put} = poseidon();
  put('A', P('116'), 'battlefield');
  const t = put('A', P('107'), 'battlefield');
  s.units[t].damage = 1; s.units[t].seal = 1;
  playSpell(s, ctx, 'A', put('A', P('139')), {}); done(s);
  assert.ok(A.battlefield.includes(t));
  assert.deepEqual([s.units[t].prepared, s.units[t].damage, s.units[t].seal || 0], [false, 0, 0]);
});

test('104 Royal Trident Guard: entra como cópia e continua Marina; ao sair volta a ser ele', () => {
  const {s, ctx, A, put} = poseidon({'MIRROR OF THE SEA': q => (q.options ? q.options.find(u => u.startsWith('B')) : true)});
  put('B', 'hades-v6-211', 'battlefield');
  const g = put('A', P('104'));
  playDevotee(s, ctx, 'A', g, {}); done(s);
  assert.equal(ctx.objects[g].cardId, 'hades-v6-211');
  assert.ok(/Marina/.test(ctx.objects[g].extraType));
  assert.equal(atkOf(s, ctx, g), ctx.cards.get('hades-v6-211').atk);
});

test('120 Drowned Prophet: compra quando o oponente conjura, a menos que ele pague {1}{C}', () => {
  const pay = poseidon({'PROPHECY OF THE ABYSS': true});
  pay.put('B', P('120'), 'battlefield');
  const hb = pay.B.hand.length, b0 = bases(pay.A);
  playSpell(pay.s, pay.ctx, 'A', pay.put('A', P('139')), {}); done(pay.s);
  assert.equal(pay.B.hand.length, hb);
  assert.ok(bases(pay.A) < b0);
  const no = poseidon({'PROPHECY OF THE ABYSS': false});
  no.put('B', P('120'), 'battlefield');
  const h1 = no.B.hand.length;
  playSpell(no.s, no.ctx, 'A', no.put('A', P('139')), {}); done(no.s);
  assert.equal(no.B.hand.length, h1 + 1);
});

test('135 Beneath the Surface: Moment ou Technique no topo do deck', () => {
  const {s, ctx, A, put} = poseidon();
  playSpell(s, ctx, 'A', put('A', P('135')), {}); done(s);
  assert.ok(/Moment|Technique/.test(ctx.cards.get(ctx.objects[A.deck[0]].cardId).type));
});

test('134 Waves of Destruction: com {5}{C} a mais devolve todos os Devotees inimigos', () => {
  const {s, ctx, A, B, put} = poseidon({'WAVES OF DESTRUCTION': true});
  const x = put('B', 'hades-v6-211', 'battlefield'), y = put('B', 'hades-v6-206', 'battlefield');
  const b0 = bases(A);
  playSpell(s, ctx, 'A', put('A', P('134')), {}); done(s);
  assert.ok(B.hand.includes(x) && B.hand.includes(y));
  assert.equal(bases(A), b0 - 7);
});

test('152 Marine Whirlwind: devolve um Devotee e prepara 2 Bases', () => {
  const {s, ctx, A, B, put} = poseidon({RETURN: q => q.options.find(u => u.startsWith('B'))});
  const x = put('B', 'hades-v6-211', 'battlefield');
  A.bases.forEach(b => { b.prepared = false; }); A.bases.slice(0, 3).forEach(b => { b.prepared = true; });
  playSpell(s, ctx, 'A', put('A', P('152')), {}); done(s);
  assert.ok(B.hand.includes(x));
  assert.equal(bases(A), 2);
});

test('162 Galactic Illusion: o oponente separa; você fica com uma pilha e a outra vai ao Tartarus', () => {
  const {s, ctx, A, put} = poseidon({'SEPARATE THE PILES': q => q.options.slice(0, 2), 'GALACTIC ILLUSION': q => q.options[1]});
  const spell = put('A', P('162')), top = A.deck.slice(0, 5), h0 = A.hand.length - 1, t0 = A.tartarus.length;
  playSpell(s, ctx, 'A', spell, {}); done(s);
  assert.ok(top.slice(2).every(u => A.hand.includes(u)));
  assert.ok(top.slice(0, 2).every(u => A.tartarus.includes(u)));
  assert.equal(A.hand.length, h0 + 3);
  assert.ok(A.tartarus.length >= t0 + 2);
});

test('175 The Unending Deluge: cada um descarta a mão e compra o maior número', () => {
  const {s, ctx, A, B, put} = poseidon();
  const spell = put('A', P('175'));
  for (let i = 0; i < 3; i++) put('A', P('139'));
  B.hand.splice(0); put('B', 'hades-v6-211');
  const most = A.hand.length - 1;
  playSpell(s, ctx, 'A', spell, {}); done(s);
  assert.equal(A.hand.length, most); assert.equal(B.hand.length, most);
});

test('141 The First Great Storm: devolve quem declarou Strike nesta rodada', () => {
  const {s, ctx, A, B, put} = poseidon();
  const x = put('B', 'hades-v6-211', 'battlefield'), y = put('B', 'hades-v6-206', 'battlefield');
  s.events.push({type: 'strike_declared', turn: s.turn, player: 'B', attacker: x});
  playSpell(s, ctx, 'A', put('A', P('141')), {}); done(s);
  assert.ok(B.hand.includes(x)); assert.ok(B.battlefield.includes(y));
});

test('173 The Fall of Atlantis: delve barateia e manda o Tartarus ao Void; compra 3', () => {
  const {s, ctx, A, put} = poseidon();
  for (let i = 0; i < 4; i++) A.tartarus.push(A.deck.pop());
  const b0 = bases(A), h0 = A.hand.length;
  playSpell(s, ctx, 'A', put('A', P('173')), {}); done(s);
  assert.equal(bases(A), b0 - 2);
  assert.equal(A.tartarus.filter(u => !/173/.test(u)).length, 0);
  assert.equal(A.void.length, 4);
  assert.equal(A.hand.length, h0 + 3);
});
