// Painel Friends do lobby (docs/contas-amigos-chat.md, etapa 2), no estilo do social do Arena:
// adicionar por código de amigo, pedidos recebidos/enviados, amigos por status, remover e bloquear.
// Chat (31/10/2026, estilo Arena): clicar num amigo abre uma janela acoplada no canto (chat-dock.js); a lista continua aqui.
// Vive fora do render() do lobby (#social) para a atualização não apagar o que o jogador digita.
// Duelo (etapa 4, docs/duelo-online.md): Challenge no chat com escolha de deck; o desafio vira mensagem com Accept/Decline,
// expira em 60 s e, aceito, leva os dois para a mesma partida. Fora do chat, um aviso no topo mostra o desafio recebido.
import {playerName} from './rank.js?v=20261031-face3';
import {mountChatDock} from './chat-dock.js?v=20261101-online1';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LABEL = {online: 'Online', match: 'In a match', offline: 'Offline'};

export function mountSocial({api, avatarOf, onCount, decks = () => [], onProfile = () => {}, play = id => location.assign(`/playtest/divine/?match=${encodeURIComponent(id)}`)}) {
  const el = document.createElement('aside');
  el.className = 'lb-social'; el.hidden = true; el.setAttribute('aria-label', 'Friends');
  document.body.append(el);
  let data = {friends: [], incoming: [], outgoing: [], blocked: []}, msg = null, open = false, menu = null;
  const deckSelect = name => { const list = decks(); return list.length ? `<select class="kv-input lb-duel__deck" name="${name}" aria-label="Deck">${list.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select>` : '<p class="kv-status err">Build a complete deck first.</p>'; };
  const deckById = id => decks().find(d => d.id === id)?.deck;

  const person = (p, extra = '') => `<div class="lb-friend ${p.status ? 'is-' + p.status : ''}">
    <button class="lb-friend__who" data-social="profile" data-user="${esc(p.username)}" aria-label="${esc(p.username)} · player profile"><span class="lb-friend__avatar" style="background-image:url('${avatarOf(p.avatar_card) || ''}')"></span></button>
    <span class="lb-friend__name"><b>${playerName(p.username)}</b><small>${p.status ? LABEL[p.status] : esc(p.friend_code)}</small></span>${extra}</div>`;
  // Amigo: a linha abre o chat; mostra quantas mensagens não lidas.
  const friendRow = f => person(f, `${f.unread ? `<span class="lb-friend__unread" aria-label="${f.unread} unread">${f.unread}</span>` : ''}
    <button class="lb-friend__open" data-social="chat" data-user="${esc(f.username)}" aria-label="Chat with ${esc(f.username)}"></button>
    <button class="lb-friend__more" data-social="menu" data-user="${esc(f.username)}" aria-label="Options for ${esc(f.username)}">⋯</button>`);
  const group = (title, items) => items.length ? `<h3 class="kv-stamp">${title} · ${items.length}</h3>${items.join('')}` : '';

  const counts = () => onCount(data.friends.filter(f => f.status !== 'offline').length, data.incoming.length + data.friends.reduce((n, f) => n + (f.unread || 0), 0));
  function paint() {
    if (!open) return counts();
    const field = el.querySelector('[name=code]'), typed = field?.value || '', focused = document.activeElement === field;
    const by = s => data.friends.filter(f => s.includes(f.status));
    el.innerHTML = `<header><h2>Friends</h2><button class="lb-x" data-social="close" aria-label="Close">×</button></header>
      <form class="lb-social__add" data-social-form="add">
        <label class="kv-field"><span class="kv-stamp">Add by friend code</span><input class="kv-input" name="code" placeholder="Name#1234" autocomplete="off" spellcheck="false" maxlength="30"></label>
        <button class="kv-ghost">Send</button>
        ${msg ? `<p class="kv-status ${msg.kind}" role="status">${esc(msg.text)}</p>` : '<p class="kv-status" role="status"></p>'}
      </form>
      <div class="lb-social__list">
        ${group('Requests', data.incoming.map(r => person(r, `<span class="lb-friend__acts"><button class="kv-ghost is-gold" data-social="accept" data-id="${r.id}">Accept</button><button class="kv-ghost" data-social="decline" data-id="${r.id}">Decline</button></span>`)))}
        ${group('Online', by(['online', 'match']).map(friendRow))}
        ${group('Offline', by(['offline']).map(friendRow))}
        ${group('Sent', data.outgoing.map(r => person(r, `<button class="kv-ghost" data-social="cancel" data-id="${r.id}">Cancel</button>`)))}
        ${!data.friends.length && !data.incoming.length ? '<p class="lb-social__empty">No friends yet. Share your friend code from Profile, or add someone by theirs.</p>' : ''}
        ${data.blocked.length ? `<details class="lb-social__blocked"><summary class="kv-stamp">Blocked · ${data.blocked.length}</summary>${data.blocked.map(b => person(b, `<button class="kv-ghost" data-social="unblock" data-user="${esc(b.username)}">Unblock</button>`)).join('')}</details>` : ''}
      </div>
      ${menu ? `<div class="lb-friend__menu" role="menu"><p class="kv-stamp">${esc(menu)}</p>
        <button role="menuitem" data-social="profile" data-user="${esc(menu)}">View profile</button>
        <button role="menuitem" data-social="remove" data-user="${esc(menu)}">Remove friend</button>
        <button role="menuitem" data-social="block" data-user="${esc(menu)}">Block</button>
        <button role="menuitem" data-social="menu-close">Cancel</button></div>` : ''}`;
    const nf = el.querySelector('[name=code]');
    nf.value = typed; if (focused) nf.focus();
    counts();
  }

  async function refresh() {
    try { data = await api('/api/friends'); paint(); } catch { /* sem sessão ou offline: mantém o último estado */ }
  }
  // Janelas de conversa: a lista de amigos é atualizada a cada 10 s por elas (contadores, toasts e este painel).
  const dock = mountChatDock({api, avatarOf, decks, play, onProfile, onFriends: d => { data = d; paint(); }});
  const say = (text, kind) => { msg = {text, kind}; paint(); };

  el.addEventListener('submit', async e => {
    e.preventDefault();
    const code = new FormData(e.target).get('code').trim();
    if (!/^[A-Za-z0-9_]{3,20}#\d{4}$/.test(code)) return say('Use the full friend code, like Seiya#1234.', 'err');
    try {
      const r = await api('/api/friends/requests', 'POST', {code});
      e.target.reset(); el.querySelector('[name=code]').value = '';
      await refresh(); say(r.friend ? `${r.friend} is now your friend.` : `Request sent to ${r.sent}.`, 'ok');
    } catch (err) { say(err.message, 'err'); }
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-social]');
    if (!b) return;
    const {social: act, id, user} = b.dataset;
    if (act === 'close') return toggle(false);
    if (act === 'chat') { menu = null; paint(); return dock.open(user); }
    if (act === 'profile') { menu = null; paint(); return onProfile(user); }
    if (act === 'notice-accept' || act === 'notice-decline') return duelAnswer(act, id, b);
    if (act === 'menu') { menu = user; return paint(); }
    if (act === 'menu-close') { menu = null; return paint(); }
    menu = null;
    try {
      if (act === 'accept' || act === 'decline') await api(`/api/friends/requests/${id}/${act}`, 'POST');
      if (act === 'cancel') await api(`/api/friends/requests/${id}`, 'DELETE');
      if (act === 'remove' && confirm(`Remove ${user} from your friends?`)) await api(`/api/friends/${encodeURIComponent(user)}`, 'DELETE');
      if (act === 'block' && confirm(`Block ${user}? They will not be able to add you.`)) await api('/api/blocks', 'POST', {username: user});
      if (act === 'unblock') await api(`/api/blocks/${encodeURIComponent(user)}`, 'DELETE');
      msg = null; await refresh();
    } catch (err) { say(err.message, 'err'); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && open && !e.target.closest?.('.cd-win')) toggle(false); });

  async function duelAnswer(act, id, b) {
    const verb = act.replace(/^notice-/, ''), scope = b.closest('.lb-notice') || el;
    const deck = verb === 'accept' ? deckById(scope.querySelector('select')?.value) : null;
    if (verb === 'accept' && !deck) return;
    try {
      const r = await api(`/api/challenges/${id}/${verb}`, 'POST', deck ? {deck} : {});
      if (r.match) return play(r.match);
      notice?.remove(); notice = null;
    } catch (err) { const s = scope.querySelector('.kv-status') || el.querySelector('.kv-status'); if (s) { s.textContent = err.message; s.className = 'kv-status err'; } }
  }
  // Aviso no topo do lobby: desafio recebido (fora da conversa) e o meu que foi aceito.
  let notice = null;
  async function checkDuels() {
    let list;
    try { list = (await api('/api/challenges/pending')).challenges; } catch { return; }
    dock.challenges(list);
    const incoming = list.find(c => !c.mine && c.status === 'pending');
    if (!incoming) { notice?.remove(); notice = null; return; }
    if (notice?.dataset.challenge === String(incoming.id)) return;
    notice?.remove();
    notice = document.createElement('div');
    notice.className = 'lb-notice kv-card'; notice.dataset.challenge = incoming.id; notice.setAttribute('role', 'alertdialog');
    notice.innerHTML = `<p><b>⚔ ${esc(incoming.from)} challenged you to a duel</b></p>${deckSelect('notice-deck')}
      <span class="lb-duel__acts"><button class="kv-ghost is-gold" data-social="notice-accept" data-id="${incoming.id}">Accept</button><button class="kv-ghost" data-social="notice-decline" data-id="${incoming.id}">Decline</button></span><p class="kv-status" role="status"></p>`;
    notice.addEventListener('click', e => { const b = e.target.closest('[data-social]'); if (b) duelAnswer(b.dataset.social, b.dataset.id, b); });
    document.body.append(notice);
    setTimeout(() => { if (notice?.dataset.challenge === String(incoming.id)) { notice.remove(); notice = null; } }, Math.max(0, incoming.expires_at * 1000 - Date.now()));
  }
  setInterval(() => { if (!document.hidden) checkDuels(); }, 4000);
  checkDuels();

  function toggle(state = !open) {
    open = state; el.hidden = !open;
    if (open) { msg = null; menu = null; refresh(); el.querySelector('[name=code]')?.focus(); }
  }
  return {toggle, refresh, open: user => dock.open(user), friends: () => data.friends, challenge: (user, deck) => dock.challenge(user, deck)};
}
