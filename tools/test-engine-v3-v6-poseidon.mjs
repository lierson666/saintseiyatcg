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

test('spell + watchSealed: Abyssal Weight põe 1 Seal, ou 2 se já tinha; Whispers Below observa 1×/Round', () => {
  const {s, ctx, A, put, asked} = poseidon();
  s.domains.A = null; // o Domain 142 (Oceanic Dominion) compraria e descartaria ao conjurar: fora deste teste
  put('A', P('102'), 'battlefield');
  const foe = put('B', 'hades-v6-211', 'battlefield'), spell = put('A', P('137')), top = A.deck[0];
  playSpell(s, ctx, 'A', spell, {}); passAll(s);
  assert.equal(s.units[foe].seal, 1);
  assert.equal(asked.filter(q => q.ability === 'WHISPERS BELOW').length, 1);
  assert.equal(A.deck.at(-1), top, 'Whispers Below mandou o topo para o fundo');
  playSpell(s, ctx, 'A', put('A', P('137')), {}); passAll(s);
  assert.equal(s.units[foe].seal, 3, 'já Sealed: +2');
});

test('watchDeclare (prevenção): Royal Trident Guard previne 1 do dano de Strike, uma vez por Round', () => {
  const {s, ctx, put} = poseidon();
  const guard = put('A', P('104'), 'battlefield'), foe = put('B', 'hades-v6-210', 'battlefield'); // Golem Rock: ATK 4 (Troll Iwan caiu para 3 em 30/10/2026)
  declareStrike(s, ctx, guard, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[guard].damage, 3);
});

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

test('mods e aura: Herald dá +0/+1 aos Marina; Ocean Temple Guard +0/+1 com Domain de Poseidon', () => {
  const {s, ctx, put} = poseidon();
  const temple = put('A', P('106'), 'battlefield'), base = hpOf(s, ctx, temple);
  assert.equal(base, 4, '3 impresso + 1 do Domain');
  put('A', P('103'), 'battlefield');
  assert.equal(hpOf(s, ctx, temple), 5);
  s.domains.A = 'athena-v6-062'; // Domain de outra facção não conta (autor, 01/11/2026)
  assert.equal(hpOf(s, ctx, temple), 4);
});

test('enter + watchMill: Drowned Prophet faz o oponente moer 2 e Prophecy of the Abyss compra pagando {1}', () => {
  const {s, ctx, A, B, put} = poseidon();
  const prophet = put('A', P('120')), deckB = B.deck.length;
  playDevotee(s, ctx, 'A', prophet, {}); passAll(s);
  assert.equal(B.deck.length, deckB - 2);
  assert.ok(A.hand.length >= 1, 'comprou 1');
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

test('watchSpell: Pearl Sanctuary Keeper compra e descarta ao conjurar Technique (uma vez por Round, paga {1}{C})', () => {
  const {s, ctx, A, put} = poseidon();
  s.domains.A = null;
  const keeper = put('A', P('116'), 'battlefield');
  const hand0 = A.hand.length, b0 = bases(A);
  const spell = put('A', P('137'));
  playSpell(s, ctx, 'A', spell, {}); done(s);
  assert.ok(s.roundUses.has(`pearldiv:${keeper}`));
  // compra 1 e descarta 1 (+ descarta a carta paga pelo Pearl of Protection? não: paga {1}{C}); Spell paga o custo impresso
  assert.equal(A.hand.length, hand0 + 1 /* Spell posta na mão */ - 1 /* conjurada */ + 1 - 1);
  assert.ok(bases(A) <= b0 - 1);
  const b1 = bases(A);
  playSpell(s, ctx, 'A', put('A', P('137')), {}); done(s);
  assert.equal(bases(A), b1 - cards.get(P('137')).cost.amount, 'segunda conjuração no Round: Pearl Divination não paga de novo');
});

test('watchSpell (Domain): Oceanic Dominion dá 1 Soul ao conjurar; Ancient Secrets (148) e Forgotten Knowledge Once per game (domain:A:opg)', () => {
  const {s, ctx, A, put} = poseidon();
  s.domains.A = P('142');
  A.soul -= 3;
  const soul0 = A.soul;
  playSpell(s, ctx, 'A', put('A', P('137')), {}); done(s);
  assert.equal(A.soul, soul0 + 1);
  const {s: s2, ctx: c2, A: A2, put: put2, asked: asked2} = poseidon();
  s2.domains.A = P('148');
  assert.throws(() => activate(s2, c2, 'A', 'domain:A'), /Domain/); // 148 não tem mais ativada na linha 1
  const tartarus0 = A2.tartarus.length, bases0 = bases(A2), hand0 = A2.hand.length;
  activate(s2, c2, 'A', 'domain:A:opg'); done(s2);
  assert.equal(A2.tartarus.length, tartarus0 + 2); // comprou 3 e descartou 2
  assert.equal(A2.hand.length, hand0 + 1);
  assert.equal(bases(A2), bases0 - 2);
  assert.throws(() => activate(s2, c2, 'A', 'domain:A:opg'), /Once per game/);
  playSpell(s2, c2, 'A', put2('A', P('137')), {}); done(s2);
  assert.ok(asked2.some(q => q.ability === 'ANCIENT SECRETS'));
  assert.ok(A2);
});

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

test('Domain 145 sem Resonance de Baian (rebalanceamento 31/10/2026); Rising Billows previne todo dano de Strike no Round', () => {
  const {s, ctx, A, put} = poseidon();
  s.domains.A = P('145');
  assert.equal(V6[P('145')].watchSurvive, undefined);
  const me = put('A', 'poseidon-v6-101', 'battlefield');
  activate(s, ctx, 'A', 'domain:A:opg'); done(s);
  assert.ok(s.effects.some(e => e.kind === 'prevent' && e.target === me && e.amount === Infinity));
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

test('136 The Sea Never Forgives: só contra Spell que mira o seu Devotee ou God; sem pagamento', () => {
  const {s, ctx, A, put, minos, respond, sealed} = duel();
  const x = put('B', P('118'), 'battlefield'), sp = minos(x);
  respond('136'); done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  // Spell que não mira nada seu (Serve the Lord of Darkness mira Devotee de A): 136 não tem alvo.
  const d = duel();
  const own = d.put('A', 'hades-v6-206', 'battlefield'), serve = d.put('A', 'hades-v6-236');
  d.answers['SERVE THE LORD OF DARKNESS'] = () => own;
  playSpell(d.s, d.ctx, 'A', serve);
  assert.throws(() => playSpell(d.s, d.ctx, 'B', d.put('B', P('136'))), RuleError);
  // Spell que mira o God (Souls of the Damned): alvo guardado sem pergunta.
  const g = duel(), souls = g.put('A', 'hades-v6-238'), soulB = g.s.players.B.soul;
  playSpell(g.s, g.ctx, 'A', souls);
  assert.deepEqual(g.s.chain[0].targets, ['god:B']);
  g.respond('136'); done(g.s);
  assert.equal(g.s.players.B.soul, soulB); // God de B não perdeu Soul
  assert.ok(g.A.tartarus.includes(souls));
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
  assert.equal(B.soul, soul - 3 + 1, 'o Domain 142 devolve {1}{S} ao conjurar Moment');
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

test('135 Opt: olha o topo, pode pôr no fundo, compra 1', () => {
  const {s, ctx, A, put} = poseidon({'BENEATH THE SURFACE': true});
  const top = A.deck[0], second = A.deck[1], hand = A.hand.length;
  playSpell(s, ctx, 'A', put('A', P('135'))); done(s);
  assert.equal(A.deck.at(-1), top, 'o topo foi ao fundo');
  assert.ok(A.hand.includes(second));
  assert.equal(A.hand.length, hand + 1 - 1 + 1 - 1 + 1); // +Spell -Spell +1 compra
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
test('103 e 118 são lordes: outras Marinas +1/+1 e +1 ATK; o próprio lorde não se conta', () => {
  const {s, ctx, put} = poseidon();
  const spear = put('A', P('107'), 'battlefield'), herald = put('A', P('103'), 'battlefield'), banner = put('A', P('118'), 'battlefield');
  assert.deepEqual([atkOf(s, ctx, spear), hpOf(s, ctx, spear)], [4, 2], 'Spearman 2/1 + 1/1 + 1/0');
  assert.deepEqual([atkOf(s, ctx, herald), hpOf(s, ctx, herald)], [3, 3], 'Herald só ganha o +1 ATK do Banner');
  assert.deepEqual([atkOf(s, ctx, banner), hpOf(s, ctx, banner)], [2, 4], 'Banner só ganha o +1/+1 do Herald');
});

test('109 Abyssal Watcher: "target player" pode moer o próprio deck (Reanimator)', () => {
  const {s, ctx, A, put} = poseidon({'EYES OF THE ABYSS': q => (q.choose === 'mode' ? 'self' : q.options ? q.options[0] : true)});
  const watcher = put('A', P('109')), deck = A.deck.length, grave = A.tartarus.length;
  playDevotee(s, ctx, 'A', watcher, {}); passAll(s);
  assert.deepEqual([A.deck.length, A.tartarus.length], [deck - 2, grave + 2]);
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
