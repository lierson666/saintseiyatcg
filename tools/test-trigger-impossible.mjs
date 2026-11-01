// Guia §56 (autor, 31/10/2026): gatilho opcional impossível no disparo (custo que não dá para pagar, "once each round"
// já usado, sem alvo válido) não dispara: não vai à pilha, não abre janela, não aparece no log e não pergunta.
// Cobre Base de Cosmo (Domain 065 paga {1}{C} da Base) e Deus (Water Prison, Offering of Life). Quando dá para usar, segue igual.
// node --test tools/test-trigger-impossible.mjs  (precisa de card-forge/art-web/cards.json: tools/forge-art-web.sh)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll, runCheckpoint} from '../playtest/engine-v3/core.js';
import {bindContext} from '../playtest/engine-v3/v6/registry.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {atkOf, damageDevotee, checkDefeats} from '../playtest/engine-v3/effects.js';
import {refreshAwaken} from '../playtest/engine-v3/gods.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const previews = read('./fixtures/decks-preview.json').decks;
const [rush, fortress] = read('./fixtures/decks-proposta-d171.json').decks;

// Partida com `decks`/`gods`; `asked` guarda cada pergunta feita ao jogador (ability). Decisão: sim / primeira opção.
function setup({decks, gods, seed = 1}) {
  const m = createMatch({cards, canonIndex: index, decks, gods, first: 'A', seed});
  for (const p of Object.values(m.state.players)) p.deck.push(...p.hand.splice(0)); m.state.setup = null;
  const s = m.state, asked = [];
  const ctx = {cards, objects: m.objects, attached: m.attached, decide: (player, q) => { asked.push(q.ability); return q.options ? q.options[0] : true; }};
  bindContext(s, ctx);
  startTurn(s);
  let n = 0;
  const give = (key, id) => {
    const uid = `${key}:${id}:t${n++}`;
    m.objects[uid] = {owner: key, cardId: id, armor: false};
    s.players[key].battlefield.push(uid);
    s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  return {s, ctx, give, asked};
}
const fired = (s, match) => s.events.filter(e => e.type === 'trigger' && match(e)).length;

// ---------- Base de Cosmo ----------
// 065 Stairway (Domain de Athena): "Saint amigo sobrevive a um Strike: você pode pagar {1}{C}; se pagar, +1 ATK" (1×/Round).
function stairway(prepared) {
  const deck = id => ({...previews.find(d => d.id === id)});
  const t = setup({decks: {A: deck('preview-ares-legions'), B: deck('preview-artemis-hunt')}});
  const {s, ctx, give} = t;
  s.domains.A = 'athena-v6-065'; s.domains.B = null;
  s.players.A.bases = s.players.A.deck.splice(0, 3).map((uid, i) => ({uid, prepared: i < prepared}));
  const saint = give('A', 'athena-v6-029'), foe = give('B', 'artemis-v6-399');
  const atk = atkOf(s, ctx, saint);
  s.active = 'B'; declareStrike(s, ctx, foe, {kind: 'devotee', uid: saint}); passAll(s);
  return {...t, saint, atk};
}

test('Base de Cosmo: sem Base Prepared para o {1}{C}, o Domain 065 não dispara, não pergunta e não gasta o uso', () => {
  const {s, ctx, asked, saint, atk} = stairway(0);
  assert.equal(fired(s, e => e.uid === 'domain:A'), 0, 'não vai à pilha nem ao log');
  assert.ok(!asked.includes('TWELVE TEMPLES'), 'não pergunta');
  assert.ok(!s.roundUses.has('twelve-temples:A'));
  assert.equal(atkOf(s, ctx, saint), atk);
});

test('Base de Cosmo: com 1 Base Prepared, o Domain 065 dispara, pergunta e paga como antes', () => {
  const {s, ctx, asked, saint, atk} = stairway(1);
  assert.equal(fired(s, e => e.uid === 'domain:A'), 1);
  assert.ok(asked.includes('TWELVE TEMPLES'));
  assert.equal(atkOf(s, ctx, saint), atk + 1);
  assert.equal(s.players.A.bases.filter(b => b.prepared).length, 0);
});

// ---------- Deus ----------
// Water Prison (Poseidon): Strike inimigo declarado → você pode pagar 2 Latent para selar o atacante.
function waterPrison(latent) {
  const t = setup({decks: {A: rush, B: fortress}, gods: {A: 'god-athena', B: 'god-poseidon'}, seed: 5});
  const {s, ctx} = t, p = s.players.A, seiya = p.deck.find(u => u.includes(':001:'));
  p.deck.splice(p.deck.indexOf(seiya), 1); p.battlefield.push(seiya); s.units[seiya] = {prepared: true, damage: 0};
  s.players.B.latent = latent;
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  const onChain = s.chain.some(i => i.ability === 'WATER PRISON');
  passAll(s);
  return {...t, seiya, onChain};
}

test('Deus: Water Prison sem 2 Latent não dispara, não pergunta e não entra na pilha', () => {
  const {s, asked, seiya, onChain} = waterPrison(1);
  assert.equal(onChain, false);
  assert.equal(fired(s, e => e.ability === 'WATER PRISON'), 0);
  assert.ok(!asked.includes('WATER PRISON'));
  assert.equal(s.players.B.latent, 1);
  assert.equal(s.units[seiya]?.seal, undefined);
});

test('Deus: Water Prison com 2 Latent dispara e sela como antes', () => {
  const {s, asked, seiya, onChain} = waterPrison(2);
  assert.equal(onChain, true);
  assert.ok(asked.includes('WATER PRISON'));
  assert.equal(s.players.B.latent, 0);
  assert.equal(s.units[seiya].seal, 1);
});

// Offering of Life (Hades): Devotee seu derrotado → você pode perder 2 Soul para comprar 1 e ganhar 1 Latent (1×/Round).
test('Deus: Offering of Life já usado no Round não dispara de novo; o primeiro dispara normal', () => {
  const {s, ctx, asked} = setup({decks: {A: rush, B: fortress}, gods: {A: 'god-hades', B: 'god-athena'}, seed: 3});
  s.players.A.soul = 10; refreshAwaken(s);
  const own = () => { const p = s.players.A, uid = p.deck.find(u => cards.get(ctx.objects[u].cardId).kind === 'Devotee'); p.deck.splice(p.deck.indexOf(uid), 1); p.battlefield.push(uid); s.units[uid] = {prepared: true, damage: 0}; return uid; };
  const kill = uid => { damageDevotee(s, ctx, uid, 99, false); checkDefeats(s, ctx); runCheckpoint(s); passAll(s); };
  const a = own(), b = own();
  kill(a);
  assert.equal(fired(s, e => e.ability === 'OFFERING OF LIFE'), 1);
  assert.equal(asked.filter(x => x === 'OFFERING OF LIFE').length, 1);
  assert.equal(s.players.A.soul, 8);
  kill(b);
  assert.equal(fired(s, e => e.ability === 'OFFERING OF LIFE'), 1, 'segundo no Round não vai à pilha');
  assert.equal(asked.filter(x => x === 'OFFERING OF LIFE').length, 1);
  assert.equal(s.players.A.soul, 8);
});
