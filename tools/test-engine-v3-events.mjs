// Fluxo de eventos da engine 3.0 para a apresentação (Divine Arena). node --test tools/test-engine-v3-events.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {createMatch, mulligan} from '../playtest/engine-v3/match.js';
import {startTurn, endTurn, passAll} from '../playtest/engine-v3/core.js';
import {declareStrike} from '../playtest/engine-v3/strike.js';
import {playDevotee} from '../playtest/engine-v3/play.js';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const canon = read('../data/canon/d268.json');
const cards = loadCanon(canon);
const [rush, fortress] = read('../data/alpha-0.1/decks-proposta-d171.json').decks;

test('eventos têm seq contínuo e seguem a ordem real: mulligan, turno, compra, Base, jogada, Strike, dano, Soul', () => {
  const m = createMatch({cards, canonIndex: canonIndex(canon), decks: {A: rush, B: fortress}, first: 'A', seed: 3});
  const s = m.state, ctx = {cards, objects: m.objects, attached: m.attached};
  mulligan(m, 'A', []); mulligan(m, 'B', []);
  startTurn(s);
  const seiya = Object.keys(m.objects).find(u => u.startsWith('A:001:'));
  for (const p of Object.values(s.players)) for (const z of ['deck', 'hand']) { const i = p[z].indexOf(seiya); if (i >= 0) p[z].splice(i, 1); }
  s.players.A.hand.push(seiya);
  s.players.A.bases = s.players.A.deck.splice(0, 3).map(uid => ({uid, prepared: true}));
  playDevotee(s, ctx, 'A', seiya);
  for (let i = 0; i < 2; i++) { endTurn(s); passAll(s); startTurn(s); }
  declareStrike(s, ctx, seiya, {kind: 'god', player: 'B'});
  passAll(s);
  const ev = s.events;
  assert.deepEqual(ev.map(e => e.seq), ev.map((_, i) => i + 1));
  const types = ev.map(e => e.type);
  const order = ['mulligan', 'turn_start', 'cosmo_spent', 'card_played', 'end_phase', 'draw', 'strike_declared', 'window_open', 'pass', 'window_close', 'strike_resolve', 'damage', 'god_damage', 'soul_lost'];
  let at = -1;
  for (const t of order) { const i = types.indexOf(t, at + 1); assert.ok(i > at, `${t} depois da posição ${at}`); at = i; }
  const hit = ev.find(e => e.type === 'damage' && e.uid === seiya);
  assert.deepEqual([hit.incoming, hit.dealt, hit.strike], [3, 3, true], 'retaliação do God');
  assert.deepEqual(ev.find(e => e.type === 'soul_lost'), {...ev.find(e => e.type === 'soul_lost'), player: 'B', amount: 2, soul: 18});
});
