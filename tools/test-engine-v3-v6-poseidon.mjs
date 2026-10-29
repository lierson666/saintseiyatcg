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
import {playDevotee, playSpell, activate} from '../playtest/engine-v3/play.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf} from '../playtest/engine-v3/effects.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;
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
  const ctx = {cards, objects: m.objects, attached: m.attached, decide}, A = s.players.A, B = s.players.B;
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
  const guard = put('A', P('104'), 'battlefield'), foe = put('B', 'hades-v6-211', 'battlefield'); // Troll Iwan: ATK 4
  declareStrike(s, ctx, guard, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[guard].damage, 3);
});

test('declare: Marina Spearman ganha +1 ATK contra inimigo Sealed, só durante o Strike', () => {
  const {s, ctx, put} = poseidon();
  const spear = put('A', P('107'), 'battlefield'), foe = put('B', 'hades-v6-212', 'battlefield'); // Beetle: 4/5
  addSeal(s, ctx, [foe], 1, 'teste'); passAll(s);
  declareStrike(s, ctx, spear, {kind: 'devotee', uid: foe}); passAll(s);
  assert.equal(s.units[foe].damage, 3);
  assert.equal(atkOf(s, ctx, spear), 2, 'o bônus some depois do Strike');
});

test('godDamage: Siren Sorrento faz o God inimigo descartar', () => {
  const {s, ctx, B, put} = poseidon();
  const siren = put('A', P('093'), 'battlefield');
  B.hand.push(...B.deck.splice(0, 2));
  declareStrike(s, ctx, siren, {kind: 'god', player: 'B'}); passAll(s);
  assert.equal(B.hand.length, 1);
  assert.equal(B.tartarus.length, 1);
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

test('mods e aura: Herald dá +0/+1 aos Marina; Ocean Temple Guard +0/+1 com Domain', () => {
  const {s, ctx, put} = poseidon();
  const temple = put('A', P('106'), 'battlefield'), base = hpOf(s, ctx, temple);
  assert.equal(base, 4, '3 impresso + 1 do Domain');
  put('A', P('103'), 'battlefield');
  assert.equal(hpOf(s, ctx, temple), 5);
  s.domains.A = null;
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
  assert.equal(hpOf(s, ctx, spear), 4);
});

test('dano dividido: Wrath of the Seven Seas reparte 5 entre os alvos escolhidos', () => {
  let i = 0;
  const {s, ctx, put} = poseidon({'OCEANIC FURY': q => (q.choose === 'target' && q.text?.startsWith('Assign') ? q.options[i++ % 2] : q.options ? q.options[0] : true)});
  const a = put('B', 'hades-v6-219', 'battlefield'), b = put('B', 'hades-v6-212', 'battlefield');
  playSpell(s, ctx, 'A', put('A', P('174')), {}); passAll(s);
  assert.equal(s.units[a].damage + s.units[b].damage, 5);
  assert.ok(s.units[a].damage > 0 && s.units[b].damage > 0);
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

test('watchSpell (Domain): Oceanic Dominion vale ao conjurar; Ancient Secrets (148) e Forgotten Knowledge ativado por domain:A', () => {
  const {s, ctx, A, put, asked} = poseidon();
  s.domains.A = P('142');
  playSpell(s, ctx, 'A', put('A', P('137')), {}); done(s);
  assert.ok(asked.some(q => q.ability === 'OCEANIC DOMINION'));
  const {s: s2, ctx: c2, A: A2, put: put2, asked: asked2} = poseidon();
  s2.domains.A = P('148');
  const tartarus0 = A2.tartarus.length, bases0 = bases(A2);
  activate(s2, c2, 'A', 'domain:A'); done(s2);
  assert.equal(A2.tartarus.length, tartarus0 + 1); // comprou 1 e descartou 1
  assert.equal(bases(A2), bases0 - 2);
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
  const sentinel = put('A', P('105'), 'battlefield'), foe = put('B', 'hades-v6-211', 'battlefield');
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

test('watchSurvive (Domain 145): Seahorse Baian defensor sobrevive: compra e descarta (uma vez por Round)', () => {
  // Baian tem Long Range (Strike recusado pela engine, ALPHA-P05): o gancho é chamado direto.
  const {s, ctx, A, put} = poseidon();
  s.domains.A = P('145');
  const baian = put('A', P('095'), 'battlefield'), foe = put('B', 'hades-v6-211', 'battlefield');
  const tartarus0 = A.tartarus.length;
  const hook = V6[P('145')].watchSurvive;
  assert.equal(hook(s, ctx, 'A', 'domain:A', baian, 'attacker', foe), false); // só como defensor
  hook(s, ctx, 'A', 'domain:A', baian, 'defender', foe)(s);
  assert.equal(A.tartarus.length, tartarus0 + 1);
  assert.ok(s.roundUses.has('baian-surv:domain:A'));
  assert.equal(hook(s, ctx, 'A', 'domain:A', baian, 'defender', foe), false); // uma vez por Round
});

// ---------- Contra-mágicas e reações a alvo de Spell (guia §54: toda Spell abre janela; alvos escolhidos ao conjurar) ----------
// Aqui Poseidon é B (responde); A (Hades, ativo) conjura Judgment of Minos (hades-v6-258, Technique: 2 Seal no Devotee inimigo alvo).
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
  const ctx = {cards, objects: m.objects, attached: m.attached, decide}, A = s.players.A, B = s.players.B;
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
  const minos = target => { const sp = put('A', 'hades-v6-258'); answers['THE JUDGMENT OF MINOS'] = () => target; playSpell(s, ctx, 'A', sp); return sp; };
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
    if (pays) { assert.equal(sealed(x), 2); assert.equal(ready(A), bases - 2); assert.ok(!s.events.some(e => e.type === 'spell_countered')); }
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

test('156 Wall of Ocean Currents: anula Spell que mira Devotee seu; Receding Wave devolve outro Devotee (alvo escolhido ao conjurar)', () => {
  const {s, A, B, put, minos, respond, sealed, answers, asked} = duel();
  const x = put('B', P('118'), 'battlefield'), y = put('B', P('115'), 'battlefield'), sp = minos(x);
  answers['RECEDING WAVE'] = q => (q.options ? y : true);
  const w = respond('156');
  assert.deepEqual(s.chain.find(i => i.uid === w).targets, [sp, y]);
  assert.equal(asked.filter(q => q.ability === 'RECEDING WAVE' && q.options).length, 1); // uma vez, ao conjurar
  done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  assert.ok(B.hand.includes(y) && !s.units[y]);
});

test('159 The Seven Seas Answer: Denial anula; Reversal devolve Equipment inimigo', () => {
  const a = duel();
  a.answers['THE SEVEN SEAS ANSWER'] = 'Denial';
  const x = a.put('B', P('118'), 'battlefield'), sp = a.minos(x);
  a.respond('159'); done(a.s);
  assert.equal(a.sealed(x), 0); assert.ok(a.A.tartarus.includes(sp));
  const b = duel(), gear = b.put('A', 'hades-v6-224', 'battlefield');
  b.s.active = 'B'; b.s.window = null;
  b.answers['THE SEVEN SEAS ANSWER'] = 'Reversal';
  b.respond('159'); done(b.s);
  assert.ok(b.A.hand.includes(gear) && !b.A.battlefield.includes(gear));
});

test('167 Song of the Last Siren: anula; Final Melody faz o controlador descartar', () => {
  const {s, A, put, minos, respond, sealed} = duel();
  put('A', 'hades-v6-206'); // carta na mão para o descarte
  const x = put('B', P('118'), 'battlefield'), sp = minos(x), hand = A.hand.length;
  respond('167'); done(s);
  assert.equal(sealed(x), 0); assert.ok(A.tartarus.includes(sp));
  assert.equal(A.hand.length, hand - 1); // Final Melody: descartou 1
  assert.ok(s.events.some(e => e.type === 'discarded' && e.player === 'A'));
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

test('138 The Ocean\'s Embrace: Safe Passage compra se o Devotee era alvo de Spell inimiga ao conjurar', () => {
  for (const hit of [true, false]) {
    const {s, B, put, minos, respond, answers} = duel();
    const x = put('B', P('118'), 'battlefield'), y = put('B', P('115'), 'battlefield');
    minos(x); // 115 reagiria a ser alvo; aqui o alvo é x e o 115 não é mirado
    answers.RETURN = () => (hit ? x : y);
    const hand = B.hand.length;
    respond('138'); done(s);
    // x devolvido: +1 carta (retorno) +1 (Safe Passage); y devolvido: só +1 (retorno)
    assert.equal(B.hand.length - hand, hit ? 2 : 1);
  }
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
  assert.equal(sealed(x), 2); assert.ok(A.tartarus.includes(again));
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

test('124 Coral Barrier: portador mirado; paga {2}{C} e anula a menos que o controlador pague {2}{C}', () => {
  for (const pays of [false, true]) {
    const {s, ctx, A, B, put, minos, sealed, answers} = duel();
    answers['LIVING REEF'] = (q, player) => (player === 'A' ? pays : true); // A responde "pagar para manter a Spell?"; B paga o Reef
    const bearer = put('B', P('118'), 'battlefield'), gear = put('B', P('124'), 'battlefield');
    ctx.attached[gear] = bearer;
    const sp = minos(bearer), bases = ready(B);
    done(s);
    assert.equal(ready(B), bases - 2);
    assert.equal(sealed(bearer), pays ? 2 : 0);
    assert.equal(A.tartarus.includes(sp), true);
  }
});
