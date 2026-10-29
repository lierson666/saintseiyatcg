// Painel Friends do lobby (docs/contas-amigos-chat.md, etapa 2), no estilo do social do Arena:
// adicionar por código de amigo, pedidos recebidos/enviados, amigos por status, remover e bloquear.
// Chat (etapa 3): conversa um a um com amigos dentro do painel; busca mensagens novas a cada 3 s com a conversa aberta.
// Vive fora do render() do lobby (#social) para a atualização a cada 15 s não apagar o que o jogador digita.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LABEL = {online: 'Online', match: 'In a match', offline: 'Offline'};

export function mountSocial({api, avatarOf, onCount}) {
  const el = document.createElement('aside');
  el.className = 'lb-social'; el.hidden = true; el.setAttribute('aria-label', 'Friends');
  document.body.append(el);
  let data = {friends: [], incoming: [], outgoing: [], blocked: []}, msg = null, open = false, timer = null, menu = null, chat = null;

  const person = (p, extra = '') => `<div class="lb-friend ${p.status ? 'is-' + p.status : ''}">
    <span class="lb-friend__avatar" style="background-image:url('${avatarOf(p.avatar_card) || ''}')"></span>
    <span class="lb-friend__name"><b>${esc(p.username)}</b><small>${p.status ? LABEL[p.status] : esc(p.friend_code)}</small></span>${extra}</div>`;
  // Amigo: a linha abre o chat; mostra quantas mensagens não lidas.
  const friendRow = f => person(f, `${f.unread ? `<span class="lb-friend__unread" aria-label="${f.unread} unread">${f.unread}</span>` : ''}
    <button class="lb-friend__open" data-social="chat" data-user="${esc(f.username)}" aria-label="Chat with ${esc(f.username)}"></button>
    <button class="lb-friend__more" data-social="menu" data-user="${esc(f.username)}" aria-label="Options for ${esc(f.username)}">⋯</button>`);
  const group = (title, items) => items.length ? `<h3 class="kv-stamp">${title} · ${items.length}</h3>${items.join('')}` : '';

  const counts = () => onCount(data.friends.filter(f => f.status !== 'offline').length, data.incoming.length + data.friends.reduce((n, f) => n + (f.unread || 0), 0));
  function paint() {
    if (chat) return counts(); // conversa aberta: não redesenha (preserva o que está sendo digitado)
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
        <button role="menuitem" data-social="remove" data-user="${esc(menu)}">Remove friend</button>
        <button role="menuitem" data-social="block" data-user="${esc(menu)}">Block</button>
        <button role="menuitem" data-social="menu-close">Cancel</button></div>` : ''}`;
    const nf = el.querySelector('[name=code]');
    nf.value = typed; if (focused) nf.focus();
    counts();
  }

  // ---------- chat ----------
  const time = at => new Date(at * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  function openChat(username) {
    const f = data.friends.find(x => x.username === username);
    chat = {user: username, last: 0, seenUpTo: 0, poll: null};
    el.innerHTML = `<header class="lb-chat__head"><button class="lb-x" data-social="back" aria-label="Back to friends">‹</button>
        ${person(f || {username})}<button class="lb-chat__report" data-social="report" data-user="${esc(username)}">Report</button></header>
      <ol class="lb-chat__log" aria-live="polite" aria-label="Messages with ${esc(username)}"></ol>
      <p class="lb-chat__seen" hidden>Seen</p>
      <form class="lb-chat__form" data-social-form="chat">
        <label class="lb-sr" for="chat-msg">Message</label>
        <input class="kv-input" id="chat-msg" name="msg" maxlength="500" autocomplete="off" placeholder="Message ${esc(username)}">
        <button class="kv-ghost is-gold">Send</button>
      </form><p class="kv-status" role="status"></p>`;
    el.querySelector('[name=msg]').focus();
    pull();
    chat.poll = setInterval(() => { if (!document.hidden) pull(); }, 3000);
  }
  function closeChat() { if (chat) clearInterval(chat.poll); chat = null; refresh(); }
  function append(list) {
    const log = el.querySelector('.lb-chat__log');
    if (!log || !list.length) return;
    log.insertAdjacentHTML('beforeend', list.map(m => `<li class="lb-msg ${m.mine ? 'is-mine' : ''}" data-id="${m.id}"><p>${esc(m.body)}</p><time>${time(m.at)}</time></li>`).join(''));
    chat.last = list.at(-1).id; log.scrollTop = log.scrollHeight;
  }
  function seen() { // "Seen" embaixo da conversa quando o amigo leu a minha última mensagem
    const mine = [...el.querySelectorAll('.lb-msg.is-mine')].at(-1), tag = el.querySelector('.lb-chat__seen');
    if (tag) tag.hidden = !(mine && Number(mine.dataset.id) <= chat.seenUpTo && !mine.nextElementSibling);
  }
  async function pull() {
    const who = chat?.user;
    try {
      const r = await api(`/api/chat/${encodeURIComponent(who)}?after=${chat.last}`);
      if (chat?.user !== who) return;
      append(r.messages); chat.seenUpTo = r.seen_up_to; seen();
    } catch (err) { if (chat) el.querySelector('.kv-status').textContent = err.message; }
  }

  async function refresh() {
    try { data = await api('/api/friends'); paint(); } catch { /* sem sessão ou offline: mantém o último estado */ }
  }
  const say = (text, kind) => { msg = {text, kind}; paint(); };

  el.addEventListener('submit', async e => {
    e.preventDefault();
    if (e.target.dataset.socialForm === 'chat') {
      const input = e.target.querySelector('[name=msg]'), body = input.value.trim(), status = el.querySelector('.kv-status');
      if (!body) return;
      try { const m = await api(`/api/chat/${encodeURIComponent(chat.user)}`, 'POST', {body}); input.value = ''; status.textContent = ''; if (m.id > chat.last) append([m]); seen(); }
      catch (err) { status.textContent = err.message; status.className = 'kv-status err'; }
      return;
    }
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
    if (act === 'chat') { menu = null; return openChat(user); }
    if (act === 'back') return closeChat();
    if (act === 'report') {
      if (!confirm(`Report this conversation with ${user}? The last messages will be sent to the Saint Seiya TCG team.`)) return;
      try { await api(`/api/chat/${encodeURIComponent(user)}/report`, 'POST'); el.querySelector('.kv-status').textContent = 'Thanks. The team will review it.'; } catch (err) { el.querySelector('.kv-status').textContent = err.message; }
      return;
    }
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
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) { if (chat) closeChat(); else toggle(false); } });

  function toggle(state = !open) {
    open = state; el.hidden = !open;
    if (!open && chat) { clearInterval(chat.poll); chat = null; }
    if (open) { msg = null; menu = null; refresh(); el.querySelector('[name=code]')?.focus(); }
  }
  // Atualiza a cada 15 s (só com a aba visível) para o contador do topo e a lista.
  refresh();
  timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
  return {toggle, refresh, stop: () => clearInterval(timer)};
}
