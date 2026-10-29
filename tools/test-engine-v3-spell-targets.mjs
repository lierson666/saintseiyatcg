// Alvos de Spell escolhidos ao conjurar (guia §54, autor 29/10/2026): pergunta na conjuração, alvo visível na cadeia,
// alvo que sai antes da resolução faz só a parte dele não acontecer, e o protocolo de decisões (replay) continua determinístico.
// node --test tools/test-engine-v3-spell-targets.mjs  (precisa de card-forge/art-web/cards.json)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createMatch} from '../playtest/engine-v3/match.js';
import {startTurn, passAll} from '../playtest/engine-v3/core.js';
import {playSpell} from '../playtest/engine-v3/play.js';
import {runDecisions, resume} from '../playtest/engine-v3/decision.js';
import {toHand} from '../playtest/engine-v3/v6/kit.js';
import {V6} from '../playtest/engine-v3/v6/hooks.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json'), cards = loadCanon(canon), index = canonIndex(canon);
addPreviewCards(cards, index, read('../card-forge/art-web/cards.json').cartas);
const decks = read('../data/alpha-0.1/decks-preview.json').decks;
const MINOS = 'hades-v6-258'; // Technique: 2 Seal no Devotee inimigo alvo; "Draw 1 card" (não depende do alvo)

function duel(decide) {
  const deck = id => ({...decks.find(d => d.id === id)});
  const m = createMatch({cards, canonIndex: index, decks: {A: deck('preview-hades-108'), B: deck('preview-poseidon-tide')}, gods: {A: 'god-hades', B: 'god-poseidon'}, first: 'A', seed: 1});
  const s = m.state, asked = [];
  const ctx = {cards, objects: m.objects, attached: m.attached, decide: decide || ((player, q) => { asked.push(q); return q.options ? q.options[0] : true; })};
  for (const pl of Object.values(s.players)) pl.deck.push(...pl.hand.splice(0)); s.setup = null;
  startTurn(s);
  s.players.A.bases = s.players.A.deck.splice(-12).map(uid => ({uid, prepared: true}));
  let n = 0;
  const put = (key, cardId, zone = 'hand') => {
    const uid = `${key}:z${n++}:${cardId}`;
    m.objects[uid] = {owner: key, cardId, armor: cards.get(cardId).armor};
    s.players[key][zone].push(uid);
    if (zone === 'battlefield') s.units[uid] = {prepared: true, damage: 0, entered: 0};
    return uid;
  };
  return {s, ctx, put, asked, A: s.players.A, B: s.players.B};
}
const done = s => { while (s.window) passAll(s); };

test('alvo é perguntado ao conjurar, aparece na cadeia e no log, e não é perguntado de novo na resolução', () => {
  const {s, ctx, put, asked, A} = duel();
  put('B', 'poseidon-v6-118', 'battlefield');
  const foe = put('B', 'poseidon-v6-120', 'battlefield'), sp = put('A', MINOS);
  playSpell(s, ctx, 'A', sp);
  assert.equal(asked.filter(q => q.choose === 'target').length, 1); // antes de qualquer passe
  const item = s.chain.find(i => i.uid === sp);
  assert.equal(item.targets.length, 1);
  assert.equal(item.target, item.targets[0]); // a interface desenha a seta a partir daqui
  assert.deepEqual(s.events.find(e => e.type === 'card_played' && e.uid === sp).targets, item.targets);
  assert.equal(s.units[item.targets[0]].seal ?? 0, 0); // nada resolveu ainda
  done(s);
  assert.equal(asked.filter(q => q.choose === 'target').length, 1); // resolução usa a resposta guardada
  assert.equal(s.units[item.targets[0]].seal, 2);
  assert.ok(A.tartarus.includes(sp));
  assert.ok(foe);
});

test('o ensaio de alvos não altera o estado real nem executa custos duas vezes', () => {
  const {s, ctx, put, A} = duel();
  put('B', 'poseidon-v6-118', 'battlefield');
  const sp = put('A', MINOS), players = s.players, hand = A.hand.length, deck = A.deck.length, bases = A.bases.filter(b => b.prepared).length;
  playSpell(s, ctx, 'A', sp);
  assert.equal(s.players, players); // mesma referência: nada foi restaurado por cima
  assert.equal(A.hand.length, hand - 1); // só a Spell saiu da mão
  assert.equal(A.deck.length, deck); // "Draw 1" ainda não rodou
  assert.ok(A.bases.filter(b => b.prepared).length < bases);
});

test('alvo que saiu do campo antes da resolução: a parte dele não acontece, as outras sim', () => {
  const {s, ctx, put, A, B} = duel();
  const foe = put('B', 'poseidon-v6-118', 'battlefield'), other = put('B', 'poseidon-v6-120', 'battlefield'), sp = put('A', MINOS);
  A.deck.push(...A.deck.splice(0, 0)); // sem efeito: garante deck para comprar
  playSpell(s, ctx, 'A', sp);
  const target = s.chain[0].targets[0];
  toHand(s, ctx, target, 'battlefield'); // saiu em resposta
  const hand = A.hand.length;
  done(s);
  assert.ok(B.hand.includes(target));
  for (const u of [foe, other]) assert.ok(!(s.units[u]?.seal > 0)); // nenhum Seal em ninguém
  assert.equal(A.hand.length, hand + 1); // "Draw 1 card" não dependia do alvo
  assert.ok(A.tartarus.includes(sp));
});

test('protocolo de decisões: a pergunta de alvo chega na conjuração, o estado fica intacto e a resposta continua por replay', () => {
  const {s, ctx, put, A} = duel();
  const foe = put('B', 'poseidon-v6-118', 'battlefield'), other = put('B', 'poseidon-v6-120', 'battlefield'), sp = put('A', MINOS);
  const run = () => playSpell(s, ctx, 'A', sp);
  const r = runDecisions(s, ctx, run);
  assert.equal(r.pending.choose, 'target');
  assert.equal(r.pending.player, 'A');
  assert.deepEqual([...r.pending.options].sort(), [foe, other].sort());
  assert.ok(A.hand.includes(sp) && s.chain.length === 0); // nada pago nem posto na cadeia antes da resposta
  const r2 = resume(s, ctx, run, r, {value: other});
  assert.ok(r2.done);
  assert.deepEqual(s.chain[0].targets, [other]);
});

test('resposta de alvo fora das opções legais é recusada pelo protocolo', () => {
  const {s, ctx, put} = duel();
  put('B', 'poseidon-v6-118', 'battlefield');
  const sp = put('A', MINOS), run = () => playSpell(s, ctx, 'A', sp);
  const r = runDecisions(s, ctx, run);
  assert.throws(() => resume(s, ctx, run, r, {value: 'A:inexistente'}), /fora das opções legais/);
});

test('alvos explícitos (`targets` na entrada) não ensaiam o run e chegam como 6º argumento', () => {
  const entry = {spell: {targets: (st, c, key) => [`god:${key === 'A' ? 'B' : 'A'}`], run: (...args) => { seen.push(args[5]); }}};
  const seen = [];
  const {s, ctx, put} = duel();
  const saved = V6[MINOS];
  V6[MINOS] = entry;
  try {
    const sp = put('A', MINOS);
    playSpell(s, ctx, 'A', sp);
    assert.deepEqual(s.chain[0].targets, ['god:B']);
    assert.equal(seen.length, 0); // sem ensaio
    done(s);
    assert.deepEqual(seen, [['god:B']]);
  } finally { V6[MINOS] = saved; }
});
