// Painel Friends do lobby (docs/contas-amigos-chat.md, etapa 2), no estilo do social do Arena:
// adicionar por código de amigo, pedidos recebidos/enviados, amigos por status, remover e bloquear.
// Vive fora do render() do lobby (#social) para a atualização a cada 15 s não apagar o que o jogador digita.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LABEL = {online: 'Online', match: 'In a match', offline: 'Offline'};

export function mountSocial({api, avatarOf, onCount}) {
  const el = document.createElement('aside');
  el.className = 'lb-social'; el.hidden = true; el.setAttribute('aria-label', 'Friends');
  document.body.append(el);
  let data = {friends: [], incoming: [], outgoing: [], blocked: []}, msg = null, open = false, timer = null, menu = null;

  const person = (p, extra = '') => `<div class="lb-friend ${p.status ? 'is-' + p.status : ''}">
    <span class="lb-friend__avatar" style="background-image:url('${avatarOf(p.avatar_card) || ''}')"></span>
    <span class="lb-friend__name"><b>${esc(p.username)}</b><small>${p.status ? LABEL[p.status] : esc(p.friend_code)}</small></span>${extra}</div>`;
  const group = (title, items) => items.length ? `<h3 class="kv-stamp">${title} · ${items.length}</h3>${items.join('')}` : '';

  function paint() {
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
        ${group('Online', by(['online', 'match']).map(f => person(f, `<button class="lb-friend__more" data-social="menu" data-user="${esc(f.username)}" aria-label="Options for ${esc(f.username)}">⋯</button>`)))}
        ${group('Offline', by(['offline']).map(f => person(f, `<button class="lb-friend__more" data-social="menu" data-user="${esc(f.username)}" aria-label="Options for ${esc(f.username)}">⋯</button>`)))}
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
    onCount(data.friends.filter(f => f.status !== 'offline').length, data.incoming.length);
  }

  async function refresh() {
    try { data = await api('/api/friends'); paint(); } catch { /* sem sessão ou offline: mantém o último estado */ }
  }
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
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });

  function toggle(state = !open) {
    open = state; el.hidden = !open;
    if (open) { msg = null; menu = null; refresh(); el.querySelector('[name=code]')?.focus(); }
  }
  // Atualiza a cada 15 s (só com a aba visível) para o contador do topo e a lista.
  refresh();
  timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
  return {toggle, refresh, stop: () => clearInterval(timer)};
}
