// arena-server: duelo online do Saint Seiya TCG (docs/duelo-online.md). Só Node, sem dependências.
// Rede: Server-Sent Events para o servidor mandar a visão de cada jogador e POST para as ações (passa pelo Caddy como
// qualquer requisição). Login: o cookie de sessão é conferido no sanctuary-api (/api/me).
// Rotas (atrás do Caddy em /arena/*):
//   POST /arena/matches                 interna (cabeçalho X-Arena-Secret): cria a partida {players: {A, B}, decks: {A, B}}
//   GET  /arena/matches/:id/stream      SSE com a visão do jogador logado
//   POST /arena/matches/:id/action      {action}   ·   POST /arena/matches/:id/answer {answer}   ·   POST /arena/matches/:id/concede
//   GET  /arena/matches/:id/result      interno: vencedor (o sanctuary-api escreve no chat)
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {loadCanon} from '../shared/canon-cards.js';
import {canonIndex} from '../shared/deck-v3.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {createArena} from './arena.mjs';

const ROOT = new URL('..', import.meta.url);
const PORT = Number(process.env.PORT || 8090);
const ORIGIN = process.env.ARENA_ORIGIN || 'https://saintseiyatcg.com';
const ACCOUNTS = process.env.ARENA_ACCOUNTS || 'http://sanctuary-api:8080';
const SECRET = process.env.ARENA_SECRET || '';
if (!SECRET) throw new Error('ARENA_SECRET is required');

const read = path => JSON.parse(readFileSync(new URL(path, ROOT)));
const canon = read('data/canon/d268.json');
const cards = loadCanon(canon), index = canonIndex(canon);
try { addPreviewCards(cards, index, read('card-forge/art-web/cards.json').cartas); } catch { /* sem export do Forge: só o D268 */ }
const arena = createArena({cards, canonIndex: index});
const streams = new Map(); // matchId -> Set({res, key})

const send = (res, status, body) => { res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(body)); };
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 256 * 1024) throw Object.assign(new Error('Request is too large.'), {status: 413}); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('Request is not valid JSON.'), {status: 400}); }
}
async function who(req) {
  const r = await fetch(`${ACCOUNTS}/api/me`, {headers: {Cookie: req.headers.cookie || ''}}).catch(() => null);
  if (!r?.ok) return null;
  return (await r.json()).username || null;
}
// Mensagem de regra (RuleError traz `decision`) em texto de jogador; o resto vira erro genérico.
const ruleText = e => (e.decision ? {error: e.message, decision: e.decision} : {error: "That can't be done right now."});

function broadcast(rec) {
  for (const sub of streams.get(rec.id) || []) sub.res.write(`event: view\ndata: ${JSON.stringify(arena.view(rec, sub.key))}\n\n`);
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://arena');
  const m = url.pathname.match(/^\/arena\/matches(?:\/([\w-]{8,20})(?:\/(stream|action|answer|concede|result))?)?\/?$/);
  if (!m) return send(res, 404, {error: 'Not found.'});
  const [, id, verb] = m;

  if (!id && req.method === 'POST') { // criação interna, chamada pelo sanctuary-api ao aceitar o desafio
    if (req.headers['x-arena-secret'] !== SECRET) return send(res, 403, {error: 'Forbidden.'});
    const {players, decks} = await body(req);
    try { return send(res, 201, {id: arena.create({players, decks}).id}); }
    catch (e) { return send(res, 400, {error: `Invalid deck: ${e.message}`}); }
  }
  const rec = id && arena.get(id);
  if (!rec) return send(res, 404, {error: 'This duel does not exist or has ended.'});
  if (verb === 'result') {
    if (req.headers['x-arena-secret'] !== SECRET) return send(res, 403, {error: 'Forbidden.'});
    return send(res, 200, {victory: rec.match.state.victory, players: rec.players});
  }
  const username = await who(req), key = username && arena.keyOf(rec, username);
  if (!key) return send(res, 403, {error: 'You are not in this duel.'});

  if (verb === 'stream' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
    const sub = {res, key};
    if (!streams.has(rec.id)) streams.set(rec.id, new Set());
    streams.get(rec.id).add(sub);
    arena.heartbeat(rec, key);
    res.write(`event: view\ndata: ${JSON.stringify(arena.view(rec, key))}\n\n`);
    const beat = setInterval(() => { arena.heartbeat(rec, key); res.write(': ping\n\n'); }, 15000);
    req.on('close', () => { clearInterval(beat); streams.get(rec.id)?.delete(sub); });
    return;
  }
  if (req.method !== 'POST') return send(res, 405, {error: 'Method not allowed.'});
  if (req.headers.origin !== ORIGIN) return send(res, 403, {error: 'Request origin is not allowed.'});
  const data = await body(req);
  try {
    if (verb === 'action') arena.act(rec, key, data.action || {});
    else if (verb === 'answer') arena.answer(rec, key, data.answer || {});
    else if (verb === 'concede') arena.concede(rec, key);
    else return send(res, 404, {error: 'Not found.'});
  } catch (e) {
    if (!e.decision) console.error(e);
    return send(res, 409, ruleText(e));
  }
  broadcast(rec);
  send(res, 200, {version: rec.version});
}

// Abandono: confere a cada 10 s quem está sem conexão há mais de 90 s.
setInterval(() => {
  const before = new Map([...arena.matches.values()].map(r => [r, r.version]));
  arena.sweep();
  for (const [rec, v] of before) if (rec.version !== v) broadcast(rec);
}, 10000);

http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); if (!res.headersSent) send(res, e.status || 500, {error: e.status ? e.message : 'Server error.'}); }))
  .listen(PORT, () => console.log(`arena-server on :${PORT}`));
