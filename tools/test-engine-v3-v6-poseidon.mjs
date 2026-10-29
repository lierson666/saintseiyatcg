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
