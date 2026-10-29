// Decks do jogador. O localStorage é o cache local (leitura síncrona, funciona sem conta e sem rede);
// logado, o mesmo cache é sincronizado com /api/decks do sanctuary-api (docs/arquitetura-area-do-usuario.md).
// Os presets D171 vêm de data/alpha-0.1/decks-proposta-d171.json.
// Formato igual ao dos presets: {id, nome, god, domain_id, main_deck: [{card_id, quantity}]}.
const KEY = 'sstcg.decks.v1', META = 'sstcg.decks.meta.v1';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navegador sem armazenamento: o deck vale só nesta aba */ } };

let user = null;                     // username logado (null = só neste aparelho)
let listener = () => {};
let busy = Promise.resolve();        // fila: uma sincronização por vez
const say = (text, kind = 'ok') => listener({text, kind});
export const onDeckStatus = fn => { listener = fn; };

// Metadados por conta: rev = revisão do servidor, dirty = decks por enviar, gone = apagados por avisar ao servidor.
const metaAll = () => read(META, {users: {}});
const mine = m => (m.users[user] ||= {rev: {}, dirty: [], gone: [], migrated: false});
const OFFLINE = 'Saved on this device only — will sync when you are online';

export function loadMyDecks() { return read(KEY, []); }

export function saveMyDecks(list) {
  const before = new Map(loadMyDecks().map(d => [d.id, JSON.stringify(d)]));
  write(KEY, list);
  if (!user) return say('Saved on this device only — sign in to sync', 'warn');
  const m = metaAll(), u = mine(m), ids = new Set(list.map(d => d.id));
  for (const d of list) if (before.get(d.id) !== JSON.stringify(d) && !u.dirty.includes(d.id)) u.dirty.push(d.id);
  for (const id of before.keys()) if (!ids.has(id)) { u.dirty = u.dirty.filter(x => x !== id); if (id in u.rev && !u.gone.includes(id)) u.gone.push(id); }
  write(META, m);
  queue(flush);
}

export const findDeck = (id, presets) => presets.find(d => d.id === id) || loadMyDecks().find(d => d.id === id) || null;

const call = (path, method = 'GET', body) => fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)})
  .then(async r => ({status: r.status, body: await r.json().catch(() => ({}))}));
const queue = fn => (busy = busy.then(fn).catch(() => say(OFFLINE, 'warn')));
const url = id => `/api/decks/${encodeURIComponent(id)}`;

// Envia o que está pendente. Conflito (409): vale o que o jogador salvou agora (última gravação vence),
// mas a versão do outro aparelho vira uma cópia local para nada sumir em silêncio.
async function flush() {
  const m = metaAll(), u = mine(m);
  let cache = loadMyDecks(), failed = false;
  for (const id of [...u.gone]) {
    const r = await call(url(id), 'DELETE');
    if (r.status !== 200) { failed = true; continue; }
    u.gone = u.gone.filter(x => x !== id); delete u.rev[id];
  }
  for (const id of [...u.dirty]) {
    const deck = cache.find(d => d.id === id);
    if (!deck) { u.dirty = u.dirty.filter(x => x !== id); continue; }
    let r = await call(url(id), 'PUT', {data: deck, revision: u.rev[id] || 0});
    if (r.status === 409) {
      const other = r.body.server;
      if (other && JSON.stringify(other.data) !== JSON.stringify(deck)) {
        const copy = {...other.data, id: `${id}-other`.slice(0, 80), nome: `${other.data.nome || 'Deck'} (other device)`};
        cache = [...cache.filter(d => d.id !== copy.id), copy]; u.dirty.push(copy.id);
      }
      r = await call(url(id), 'PUT', {data: deck, revision: other?.revision ?? 0});
    }
    if (r.status === 200) { u.rev[id] = r.body.revision; u.dirty = u.dirty.filter(x => x !== id); } else failed = true;
    if (r.status === 400) say(r.body.error || 'This deck could not be saved to your account', 'err');
  }
  write(KEY, cache); write(META, m);
  if (failed) return say(OFFLINE, 'warn');
  if (u.dirty.length) return flush(); // sobrou a cópia de conflito
  say('Saved to your account');
}

// Chamado quando o /api/me responde: junta o servidor com o cache e envia o que só existe aqui.
export function syncDecks(username, onDone = () => {}) {
  user = username;
  return queue(async () => {
    const r = await call('/api/decks');
    if (r.status !== 200) throw Error('offline');
    const m = metaAll(), u = mine(m), server = new Map(r.body.decks.map(d => [d.id, d]));
    const others = new Set(Object.entries(m.users).filter(([n]) => n !== user).flatMap(([, v]) => Object.keys(v.rev)));
    let cache = loadMyDecks().filter(d => !others.has(d.id) || server.has(d.id)); // deck de outra conta não migra
    for (const [id, s] of server) {
      const at = cache.findIndex(d => d.id === id);
      if (u.gone.includes(id)) continue;
      if (at < 0) { cache.push(s.data); u.rev[id] = s.revision; }
      else if (u.rev[id] === undefined && JSON.stringify(cache[at]) !== JSON.stringify(s.data)) u.dirty.push(id); // mesmo id, conteúdo diferente: o 409 guarda as duas versões
      else if (!u.dirty.includes(id) && u.rev[id] !== s.revision) { cache[at] = s.data; u.rev[id] = s.revision; }
    }
    for (const d of cache.slice()) {
      if (server.has(d.id) || u.dirty.includes(d.id)) continue;
      if (d.id in u.rev) { cache = cache.filter(x => x.id !== d.id); delete u.rev[d.id]; } // apagado em outro aparelho (fica 30 dias na lixeira da conta)
      else u.dirty.push(d.id);                                                              // só existe neste navegador: importa para a conta
    }
    u.migrated = true;
    write(KEY, cache); write(META, m);
    await flush();
    onDone();
  });
}
