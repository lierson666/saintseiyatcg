// Núcleo do duelo online (docs/duelo-online.md): o servidor guarda a partida inteira e aplica cada ação com a mesma
// engine da tela; cada jogador recebe só a própria visão. Sem HTTP aqui (server.mjs cuida da rede), para testar direto.
import {randomBytes, randomInt} from 'node:crypto';
import {createMatch} from '../playtest/engine-v3/match.js';
import {applyAction, advance} from '../playtest/engine-v3/actions.js';
import {runDecisions, resume, restore, snapshot, PendingDecision} from '../playtest/engine-v3/decision.js';
import {eventsFor, loseGame} from '../playtest/engine-v3/core.js';

const opaque = key => `${key}:${randomBytes(6).toString('hex')}`; // uid sem o número da carta (não revela carta escondida)
const RECONNECT_SECONDS = 90;

// Serialização da visão: Set e Map viram listas marcadas; funções (gatilhos, onClose) ficam no servidor.
export function toJSON(v) {
  if (v === null || typeof v !== 'object') return typeof v === 'function' ? undefined : v;
  if (v instanceof Set) return {$set: [...v].map(toJSON)};
  if (v instanceof Map) return {$map: [...v].map(([k, x]) => [toJSON(k), toJSON(x)])};
  if (Array.isArray(v)) return v.map(x => (typeof x === 'function' ? null : toJSON(x)));
  const out = {};
  for (const [k, x] of Object.entries(v)) if (typeof x !== 'function') out[k] = toJSON(x);
  return out;
}

export function createArena({cards, canonIndex, now = () => Date.now() / 1000}) {
  const matches = new Map();

  // decks: {A, B} já validados pelo dono; players: {A: username, B: username}.
  function create({players, decks, seed = randomInt(1, 2 ** 31)}) {
    const id = randomBytes(9).toString('base64url');
    const gods = {A: decks.A.god || 'god-athena', B: decks.B.god || 'god-athena'};
    const match = createMatch({cards, canonIndex, decks, gods, seed, uidFor: opaque});
    const rec = {id, players, match, ctx: {cards, objects: match.objects, attached: match.attached}, pending: null,
      seen: {A: now(), B: now()}, version: 0, created: now()};
    matches.set(id, rec);
    return rec;
  }
  const keyOf = (rec, username) => Object.keys(rec.players).find(k => rec.players[k].toLowerCase() === String(username).toLowerCase()) || null;

  function commit(rec, r, run) {
    rec.pending = r.pending ? {...r, run} : null;
    rec.version++;
  }
  // Ação do jogador `key` (o servidor sobrescreve a chave: ninguém age pelo outro). Erro de regra desfaz tudo.
  function act(rec, key, action) {
    const s = rec.match.state;
    if (s.victory) throw Object.assign(new Error('match over'), {decision: 'D52'});
    if (rec.pending) throw Object.assign(new Error('pending decision'), {decision: 'pending'});
    const a = {...action, key}, wasEnding = rec.match.ending, snap = snapshot(s, rec.ctx);
    const run = () => { rec.match.ending = wasEnding; applyAction(rec.match, rec.ctx, a); advance(rec.match); };
    try { commit(rec, runDecisions(s, rec.ctx, run, [], snap), run); }
    catch (e) { restore(s, rec.ctx, snap); rec.match.ending = wasEnding; throw e; }
  }
  // Resposta à decisão pendente: só quem decide responde. Resposta recusada volta ao ponto da pergunta.
  function answer(rec, key, reply) {
    const p = rec.pending;
    if (!p || p.pending.player !== key) throw Object.assign(new Error('no decision'), {decision: 'pending'});
    try { commit(rec, resume(rec.match.state, rec.ctx, p.run, p, reply), p.run); }
    catch (e) {
      if (e instanceof PendingDecision) throw e;
      restore(rec.match.state, rec.ctx, p.snap);
      runDecisions(rec.match.state, rec.ctx, p.run, p.answers, p.snap);
      throw e;
    }
  }
  function concede(rec, key, reason = 'concede') {
    const s = rec.match.state;
    if (s.victory) return;
    if (rec.pending) { restore(s, rec.ctx, rec.pending.snap); rec.pending = null; }
    loseGame(s, key, reason);
    rec.version++;
  }
  // Batimento da conexão; quem some por mais de 90 s perde por abandono.
  function heartbeat(rec, key) { rec.seen[key] = now(); }
  function sweep() {
    for (const rec of matches.values()) {
      const s = rec.match.state;
      if (!s.victory) for (const key of ['A', 'B']) if (now() - rec.seen[key] > RECONNECT_SECONDS) { concede(rec, key, 'abandon'); break; }
      if (s.victory && now() - rec.created > 6 * 3600) matches.delete(rec.id);
    }
  }

  // Visão de `viewer`: o mesmo formato do estado da engine, sem o que ele não pode ver.
  // Esconde: mão do adversário, os dois decks (nem o dono sabe a ordem) e as Bases do adversário (face para baixo).
  function view(rec, viewer) {
    const s = rec.match.state, foe = s.order.find(k => k !== viewer);
    const hidden = new Set([...s.players[foe].hand, ...s.players.A.deck, ...s.players.B.deck, ...s.players[foe].bases.map(b => b.uid)]);
    const pending = s.pending && s.pending.player === viewer ? s.pending : s.pending ? {player: s.pending.player, kind: s.pending.kind, ability: s.pending.ability, count: s.pending.count} : null;
    for (const uid of (s.pending?.player === viewer && s.pending.options) || []) hidden.delete(uid); // ex.: topo do próprio deck numa escolha
    const objects = Object.fromEntries(Object.entries(rec.match.objects).filter(([uid]) => !hidden.has(uid)));
    const state = toJSON({...s, events: eventsFor(s, viewer), pending});
    state.players[foe].bases = s.players[foe].bases.map(b => ({uid: b.uid, prepared: b.prepared}));
    return {id: rec.id, version: rec.version, you: viewer, players: rec.players, state, objects, attached: toJSON(rec.match.attached), ending: !!rec.match.ending};
  }

  return {matches, create, keyOf, act, answer, concede, heartbeat, sweep, view, get: id => matches.get(id)};
}
