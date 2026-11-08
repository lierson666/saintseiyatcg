// Cartas novas de 08/11/2026 (playtest/engine-v3/v6/novas.js; docs/proposta-cartas-novas.md).
// node --test tools/test-engine-v3-v6-novas.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll, runCheckpoint, draw, placeBase} from '../playtest/engine-v3/core.js';
import {playDevotee, playSpell, playableFrom, castFromZone} from '../playtest/engine-v3/play.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, hpOf, keywordsOf} from '../playtest/engine-v3/effects.js';
import * as k from '../playtest/engine-v3/v6/kit.js';
import {bindContext} from '../playtest/engine-v3/v6/hooks.js';
import {guardDecide} from './engine-test-upto.mjs';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('./fixtures/decks-preview.json').decks;

// A ativo, 10 Bases Prepared; decisões: God se houver, senão a primeira opção; "you may" sim só para A.
function setup() {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}, first: 'A', seed: 1});
  const s = m.state, ctx = guardDecide({cards, objects: m.objects, attached: m.attached});
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0));
  s.setup = null;
  s.domains.A = null; s.domains.B = null;
  startTurn(s);
  s.players.A.bases = s.players.A.deck.splice(0, 10).map(uid => ({uid, prepared: true}));
  ctx.decide = (player, q) => (q.options ? (q.options.find(o => String(o).startsWith('god:')) ?? q.options[0]) : player === 'A');
  bindContext(s, ctx); // ganchos sem ctx (Base posta, compra, início de rodada) usam este decide
  let n = 0;
  const give = (key, id, zone = 'battlefield', bearer) => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: false};
    if (zone === 'top') s.players[key].deck.unshift(uid); else s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    if (bearer) ctx.attached[uid] = bearer;
    return uid;
  };
  const cast = (key, id, choice = {}) => { const uid = give(key, id, 'hand'); playSpell(s, ctx, key, uid, choice); if (s.window) passAll(s); return uid; };
  const enter = (key, id) => { const uid = give(key, id, 'hand'); playDevotee(s, ctx, key, uid, {}); if (s.window) passAll(s); return uid; };
  return {s, ctx, give, cast, enter, A: s.players.A, B: s.players.B};
}
const ready = (s, key) => s.players[key].bases.filter(b => b.prepared).length;
const V = 'athena-v6-525'; // vanilla 2/2, custo 1
const BIG = 'athena-v6-526'; // vanilla 2/3
// B golpeia (rodada de B); Nimble para passar de qualquer Guardian.
const foeStrike = (s, ctx, attacker, target) => { s.active = 'B'; s.units[attacker].keywords = ['Nimble']; declareStrike(s, ctx, attacker, target); passAll(s); };
const godA = {kind: 'god', player: 'A'}, godB = {kind: 'god', player: 'B'};
const pickFirst = (ctx, fn) => { const base = ctx.decide; ctx.decide = (p, q) => fn(p, q) ?? base(p, q); };

// ---------- Athena ----------
test('531 Saint\'s Burden: dano de Strike e de efeito no God vai ao Devotee equipado', () => {
  const {s, ctx, give, A} = setup();
  const bearer = give('A', 'athena-v6-530'), gear = give('A', 'athena-v6-531', 'battlefield', bearer), foe = give('B', V);
  const soul = A.soul;
  foeStrike(s, ctx, foe, godA);
  assert.equal(A.soul, soul);
  assert.equal(s.units[bearer].damage, 2);
  k.damage(s, ctx, 'god:A', 1);
  assert.equal(A.soul, soul);
  assert.equal(s.units[bearer].damage, 3);
  assert.ok(gear);
});

test('539 Nike (Worship): com Devotee, nenhuma perda leva o Soul abaixo de 1; em 1 não paga Soul', () => {
  const {s, give, A} = setup();
  give('A', 'athena-v6-539'); const dev = give('A', V);
  k.loseSoulOf(s, 'A', 999);
  assert.equal(A.soul, 1);
  assert.equal(s.victory, null);
  assert.equal(k.paySoul(s, 'A', 1), false);
  A.battlefield.splice(A.battlefield.indexOf(dev), 1); delete s.units[dev];
  k.loseSoulOf(s, 'A', 1);
  assert.equal(A.soul, 0);
});

test('532 Exile to Star Hill: inimigo ao Void e o controlador ganha Base Unprepared', () => {
  const {s, cast, give, B} = setup();
  const foe = give('B', V), bases = B.bases.length;
  cast('A', 'athena-v6-532');
  assert.ok(B.void.includes(foe));
  assert.equal(B.bases.length, bases + 1);
  assert.equal(B.bases.at(-1).prepared, false);
});

test('533 Banner-Bearer: tokens aliados +1/+1; Devotee comum não', () => {
  const {s, ctx, give} = setup();
  give('A', 'athena-v6-533');
  const tok = k.summonToken(s, ctx, 'A', {id: 'neutral-token-sanctuary-soldier', name: 'Sanctuary Soldier', atk: 1, hp: 1, type: 'Soldier'}), dev = give('A', V);
  assert.equal(atkOf(s, ctx, tok), 2);
  assert.equal(atkOf(s, ctx, dev), 2);
});

test('534 Hymn of the Saints: Devotee aliado entra → 1 marcador em cada aliado', () => {
  const {s, give, enter} = setup();
  give('A', 'athena-v6-534'); const old = give('A', V);
  const fresh = enter('A', V);
  assert.equal(s.units[old].training, 1);
  assert.equal(s.units[fresh].training, 1);
});

test('535 Unbreakable Formation: Guardian; com Gold Saint, não é derrotado por dano', () => {
  const {s, ctx, give, cast} = setup();
  give('A', 'athena-v6-011'); const dev = give('A', V);
  cast('A', 'athena-v6-535');
  assert.ok(keywordsOf(s, ctx, dev).includes('Guardian'));
  k.damage(s, ctx, dev, 10);
  assert.ok(s.units[dev], 'segue em campo');
});

test('536 Gatekeeper: Strike inimigo contra o seu God leva 2 de dano', () => {
  const {s, ctx, give} = setup();
  give('A', 'athena-v6-536'); const foe = give('B', 'athena-v6-530');
  foeStrike(s, ctx, foe, godA);
  assert.equal(s.units[foe].damage, 2);
});

test('537 Archer Captain: cria um Sanctuary Soldier ao declarar Strike', () => {
  const {s, ctx, give, A} = setup();
  const cap = give('A', 'athena-v6-537'), before = A.battlefield.length;
  declareStrike(s, ctx, cap, godB); passAll(s);
  assert.equal(A.battlefield.length, before + 1);
});

test('538 Grand Elder: aliados +1/+1, inimigos −1/−1', () => {
  const {s, ctx, give} = setup();
  const elder = give('A', 'athena-v6-538'), ally = give('A', V), foe = give('B', BIG);
  assert.equal(atkOf(s, ctx, ally), 3);
  assert.equal(hpOf(s, ctx, foe), 2);
  assert.equal(atkOf(s, ctx, elder), 5, 'não se dá o bônus');
});

// ---------- Poseidon ----------
test('546 Abyssal Seer: compra 2 ao entrar', () => {
  const {A, enter} = setup();
  const hand = A.hand.length;
  enter('A', 'poseidon-v6-546');
  assert.equal(A.hand.length, hand + 2);
});

test('547 Rapid Hybridization: derrota e o controlador cria Sea Beast 3/3', () => {
  const {s, ctx, give, cast, B} = setup();
  const foe = give('B', V);
  cast('A', 'poseidon-v6-547');
  assert.ok(B.tartarus.includes(foe));
  const tok = B.battlefield.find(u => ctx.objects[u].token);
  assert.equal(atkOf(s, ctx, tok), 3);
});

test('548 Spell Pierce: contraria a Technique inimiga se o dono não paga {2}', () => {
  const {s, ctx, give, B, A} = setup();
  s.active = 'B';
  B.bases = B.deck.splice(0, 5).map(uid => ({uid, prepared: true}));
  const tech = give('B', 'hades-v6-567', 'hand');
  playSpell(s, ctx, 'B', tech, {});
  A.latent = 1;
  const pierce = give('A', 'poseidon-v6-548', 'hand');
  playSpell(s, ctx, 'A', pierce, {});
  passAll(s);
  assert.ok(B.tartarus.includes(tech));
});

test('549 Aqueous Form: o portador ignora Guardian', () => {
  const {s, ctx, give} = setup();
  const dev = give('A', V); give('A', 'poseidon-v6-549', 'battlefield', dev); give('B', 'athena-v6-011');
  declareStrike(s, ctx, dev, godB); passAll(s);
  assert.ok(s.strikes.has(dev));
});

test('550 Dig Through Time: delve, olha 4 e fica com 2, o resto ao Tartarus', () => {
  const {s, ctx, give, cast, A} = setup();
  for (let i = 0; i < 6; i++) give('A', V, 'tartarus');
  const bases = ready(s, 'A'), hand = A.hand.length;
  cast('A', 'poseidon-v6-550');
  assert.equal(bases - ready(s, 'A'), 2, '8 - 6 do delve');
  assert.equal(A.hand.length, hand + 2);
  assert.equal(A.void.length, 6);
});

test('551 Tidecaller Siren: uma vez por rodada, Moment conjurado devolve um inimigo', () => {
  const {s, ctx, give, cast, B} = setup();
  give('A', 'poseidon-v6-551'); const foe = give('B', V), foe2 = give('B', V);
  cast('A', 'ares-v6-576');
  cast('A', 'ares-v6-576');
  assert.equal(B.hand.filter(u => u === foe || u === foe2).length, 1);
});

test('552 Archivist: Moment custa 1 a menos (mínimo 1) e compra 1', () => {
  const {s, give, cast, A} = setup();
  give('A', 'poseidon-v6-552'); give('A', V, 'hand');
  const bases = ready(s, 'A'), hand = A.hand.length;
  cast('A', 'hades-v6-564'); // custo 2 → 1; descarta 1 (custo adicional), compra 1
  assert.equal(bases - ready(s, 'A'), 1);
  assert.equal(A.hand.length, hand); // +1 dada, −1 conjurada, −1 descarte, +1 compra
});

test('553 Serpent of the Abyss: na 2ª compra do oponente na rodada, compre 2', () => {
  const {s, give, A} = setup();
  give('A', 'poseidon-v6-553');
  const hand = A.hand.length;
  draw(s, 'B', 1); runCheckpoint(s); if (s.window) passAll(s);
  assert.equal(A.hand.length, hand);
  draw(s, 'B', 1); runCheckpoint(s); if (s.window) passAll(s);
  assert.equal(A.hand.length, hand + 2);
});

test('554 The Endless Tide: rodada extra e a carta vai ao Void', () => {
  const {s, cast, A} = setup();
  const uid = cast('A', 'poseidon-v6-554');
  assert.ok(A.void.includes(uid));
  endTurn(s); passAll(s);
  assert.equal(s.active, 'A');
  endTurn(s); passAll(s);
  assert.equal(s.active, 'B');
});

// ---------- Hades ----------
test('561 Village Rites: sacrifica um Devotee e compra 2', () => {
  const {s, give, cast, A} = setup();
  const dev = give('A', V), hand = A.hand.length;
  cast('A', 'hades-v6-561');
  assert.ok(A.tartarus.includes(dev));
  assert.equal(A.hand.length, hand + 2);
});

test('562 Forbidden Pages: no início da sua rodada, compra 1 e perde 1 Soul', () => {
  const {s, give, A} = setup();
  give('A', 'hades-v6-562');
  const soul = A.soul;
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  endTurn(s); passAll(s); startTurn(s); if (s.window) passAll(s);
  assert.equal(A.soul, soul - 1);
});

test('563 Soul Merchant: oponente perde 1 por Specter seu', () => {
  const {s, give, enter, B} = setup();
  give('A', 'hades-v6-181'); give('A', 'hades-v6-183');
  const soul = B.soul;
  enter('A', 'hades-v6-563');
  assert.equal(B.soul, soul - 2);
});

test('564 Bitter Triumph: descarta (custo adicional) e derrota', () => {
  const {s, give, cast, A, B} = setup();
  const foe = give('B', V); give('A', V, 'hand');
  const yard = A.tartarus.length;
  cast('A', 'hades-v6-564');
  assert.ok(B.tartarus.includes(foe));
  assert.equal(A.tartarus.length, yard + 2, 'descarte + a própria Spell');
});

test('565 Feed the Swarm: destrói Equipment e perde Soul igual ao custo', () => {
  const {s, give, cast, A, B} = setup();
  const gear = give('B', 'athena-v6-539'), soul = A.soul;
  cast('A', 'hades-v6-565');
  assert.ok(B.tartarus.includes(gear));
  assert.equal(A.soul, soul - 6);
});

test('566 Cerberus: −2/−2 nos inimigos; cada inimigo derrotado na rodada custa 1 Soul', () => {
  const {s, ctx, give, enter, B} = setup();
  const small = give('B', V), big = give('B', 'athena-v6-530'), soul = B.soul;
  enter('A', 'hades-v6-566');
  assert.ok(B.tartarus.includes(small));
  assert.equal(B.soul, soul - 1);
  assert.equal(hpOf(s, ctx, big), 5);
});

test('567 Pandora\'s Contract: busca qualquer carta', () => {
  const {cast, A} = setup();
  const hand = A.hand.length;
  cast('A', 'hades-v6-567');
  assert.equal(A.hand.length, hand + 1);
});

test('568 River Lethe: paga X Soul, todos os Devotees −X/−X', () => {
  const {s, ctx, give, cast, A} = setup();
  pickFirst(ctx, (p, q) => (q.ability === 'RIVER LETHE' && q.choose === 'mode' ? 2 : undefined));
  const big = give('B', 'athena-v6-530'), soul = A.soul;
  cast('A', 'hades-v6-568');
  assert.equal(A.soul, soul - 2);
  assert.equal(hpOf(s, ctx, big), 5);
});

test('569 Gate of Elysion: joga o topo pagando Soul no lugar do custo', () => {
  const {s, ctx, give, A} = setup();
  give('A', 'hades-v6-569');
  const top = give('A', 'athena-v6-530', 'top'), soul = A.soul, bases = ready(s, 'A');
  const z = playableFrom(s, ctx, 'A').find(x => x.uid === top);
  assert.ok(z?.soulInstead);
  castFromZone(s, ctx, 'A', top); if (s.window) passAll(s);
  assert.ok(A.battlefield.includes(top));
  assert.equal(ready(s, 'A'), bases);
  assert.equal(A.soul, soul - k.costOf(ctx, top));
});

// ---------- Ares ----------
test('576 Lightning Bolt: 3 no God', () => {
  const {ctx, cast, B} = setup();
  pickFirst(ctx, (p, q) => (q.options?.includes('god:B') ? 'god:B' : undefined));
  const soul = B.soul;
  cast('A', 'ares-v6-576');
  assert.equal(B.soul, soul - 3);
});

test('577 Fiery Confluence: três vezes 1 em cada inimigo', () => {
  const {s, give, cast, B} = setup();
  const big = give('B', 'athena-v6-530');
  cast('A', 'ares-v6-577');
  assert.equal(s.units[big].damage, 3);
});

test('578 Jeska\'s Will: Latent pela mão do oponente e 3 do topo jogáveis do Void nesta rodada', () => {
  const {s, ctx, cast, A, B} = setup();
  B.hand.push(...B.deck.splice(0, 5));
  const latent = A.latent;
  cast('A', 'ares-v6-578');
  assert.equal(A.latent, latent + 3);
  assert.equal(playableFrom(s, ctx, 'A').filter(z => z.zone === 'void').length, 3);
  endTurn(s); passAll(s);
  assert.equal((s.zonePlay || []).length, 0, 'vence no fim da rodada');
});

test('579 Bonecrusher: alvo de Spell inimiga causa 2 ao God de quem conjurou', () => {
  const {s, ctx, give, cast, A} = setup();
  const bc = give('B', 'ares-v6-579'), soul = A.soul;
  pickFirst(ctx, (p, q) => (q.ability === 'WAR SPARK' ? bc : undefined));
  cast('A', 'ares-v6-576');
  assert.equal(A.soul, soul - 2);
});

test('580 Blood Rider: Devotee aliado declara Strike → 1 no God inimigo', () => {
  const {s, ctx, give, B} = setup();
  give('A', 'ares-v6-580'); const dev = give('A', V), soul = B.soul;
  declareStrike(s, ctx, dev, godB); passAll(s);
  assert.equal(B.soul, soul - 3);
});

test('581 Drakon: Spell inimiga que o mira custa {3} a mais; Dragonfire ao entrar aliado', () => {
  const {s, ctx, give, cast, enter, B} = setup();
  const drakon = give('B', 'ares-v6-581');
  pickFirst(ctx, (p, q) => (q.ability === 'WAR SPARK' ? drakon : undefined));
  const bases = ready(s, 'A');
  cast('A', 'ares-v6-576');
  assert.equal(bases - ready(s, 'A'), 4);
  const mine = give('A', 'ares-v6-581'), soul = B.soul;
  enter('A', V);
  assert.equal(B.soul, soul - 2);
  assert.ok(mine);
});

test('582 Pyre Colossus: 3 de dano divididos ao entrar', () => {
  const {ctx, enter, B} = setup();
  pickFirst(ctx, (p, q) => (q.options?.includes('god:B') ? 'god:B' : undefined));
  const soul = B.soul;
  enter('A', 'ares-v6-582');
  assert.equal(B.soul, soul - 3);
});

test('583 Plunderer: Latent por Equipment inimigo (máximo 3)', () => {
  const {give, enter, A} = setup();
  give('B', 'athena-v6-045'); give('B', 'athena-v6-046');
  const latent = A.latent;
  enter('A', 'ares-v6-583');
  assert.equal(A.latent, latent + 2);
});

test('584 Insurrection: controle dos inimigos até o fim da rodada, Prepared e com Impulse', () => {
  const {s, ctx, give, cast, A, B} = setup();
  const foe = give('B', V); s.units[foe].prepared = false;
  cast('A', 'ares-v6-584');
  assert.ok(A.battlefield.includes(foe));
  assert.equal(s.units[foe].prepared, true);
  assert.ok(keywordsOf(s, ctx, foe).includes('Impulse'));
  endTurn(s); passAll(s);
  assert.ok(B.battlefield.includes(foe));
});

// ---------- Artemis ----------
const base = (s, ctx, give, key = 'A') => { const uid = give(key, 'artemis-v6-586', 'hand'); placeBase(s, key, uid, ctx.cards.get('artemis-v6-586')); if (s.window) passAll(s); };

test('591 Tireless Huntress: Base posta → marcador e paga {1} para comprar (uma vez por rodada)', () => {
  const {s, ctx, give, A} = setup();
  const h = give('A', 'artemis-v6-591'), hand = A.hand.length;
  base(s, ctx, give);
  assert.equal(s.units[h].training, 1);
  assert.equal(A.hand.length, hand + 1);
});

test('594 Grove Keeper Stag: Base posta → +1 Soul', () => {
  const {s, ctx, give, A} = setup();
  give('A', 'artemis-v6-594'); A.soul = 10;
  base(s, ctx, give);
  assert.equal(A.soul, 11);
});

test('595 Moonseed Muse: Base posta → {1}{L}; Devotee conjurado → compra 1, uma vez por rodada', () => {
  const {s, ctx, give, enter, A} = setup();
  give('A', 'artemis-v6-595');
  const latent = A.latent;
  base(s, ctx, give);
  assert.equal(A.latent, latent + 1);
  const hand = A.hand.length;
  enter('A', V); enter('A', V);
  assert.equal(A.hand.length, hand + 1);
});

test('592 Nature\'s Claim: destrói Equipment e o controlador ganha 4 Soul', () => {
  const {give, cast, B} = setup();
  const gear = give('B', 'athena-v6-045'); B.soul = 10;
  cast('A', 'artemis-v6-592');
  assert.ok(B.tartarus.includes(gear));
  assert.equal(B.soul, 14);
});

test('593 Worldly Tutor: Devotee buscado vai ao topo', () => {
  const {ctx, cast, A} = setup();
  cast('A', 'artemis-v6-593');
  assert.equal(ctx.cards.get(ctx.objects[A.deck[0]].cardId).kind, 'Devotee');
});

test('596 Endless Growth: dobra tokens e marcadores', () => {
  const {s, ctx, give, A} = setup();
  give('A', 'artemis-v6-596'); const dev = give('A', V), before = A.battlefield.length;
  k.summonToken(s, ctx, 'A', {id: 'token-wolf', name: 'Wolf', atk: 1, hp: 1, type: 'Wolf'});
  assert.equal(A.battlefield.length, before + 2);
  k.addCounter(s, dev, 1);
  assert.equal(s.units[dev].training, 2);
});

test('597 Natural Order: sacrifica Sacred Beast e põe Devotee do deck no campo', () => {
  const {s, ctx, give, cast, A} = setup();
  const beast = give('A', 'artemis-v6-587'), before = A.battlefield.length;
  cast('A', 'artemis-v6-597');
  assert.ok(A.tartarus.includes(beast));
  assert.equal(A.battlefield.length, before);
});

test('598 Silverhorn Hydra: entra com 1 marcador por Base (máximo 3)', () => {
  const {s, enter} = setup();
  const h = enter('A', 'artemis-v6-598');
  assert.equal(s.units[h].training, 3);
});

test('599 Genesis Wave: Devotees e Equipment de custo 7 ou menos ao campo, o resto ao Tartarus', () => {
  const {s, ctx, give, cast, A} = setup();
  const top = [V, V, 'athena-v6-045', 'ares-v6-576', V, V, V].reverse().map(id => give('A', id, 'top')).reverse();
  cast('A', 'artemis-v6-599');
  assert.equal(top.filter(u => A.battlefield.includes(u)).length, 6);
  assert.ok(A.tartarus.includes(top[3]));
});
