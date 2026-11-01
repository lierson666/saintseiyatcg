// Chat dos amigos no estilo do MTG Arena (autor, 31/10/2026; spec fechada no Star Hill):
// clicar num amigo abre uma janela acoplada no canto inferior direito; a lista Friends continua visível.
// Até 3 janelas lado a lado; as outras conversas viram uma faixa de abas. Cada janela minimiza numa barra.
// Mensagem nova: contador no amigo e no botão Friends, toast com o nome (clicar abre) e um som curto.
// Horário no fim de cada grupo de mensagens, separador de dia (Today/Yesterday), Challenge na janela e emoji/emotes.
// Desafios e resultados de duelo viram cartões de sistema centralizados, com selo de estado.
// Conversa aberta consulta a cada 3 s; contadores e toasts a cada 10 s. Sem push em tempo real.
// Na partida (inMatch): só amigos, janelas começam minimizadas e os toasts não tocam som.
import {playerName} from './rank.js?v=20261031-face3';
import {faceStyle} from './avatar-face.js?v=20261031-3';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const MAX_OPEN = 3, OPEN_POLL = 3000, BACKGROUND_POLL = 10000, GROUP_SECS = 300;
const EMOJI = ['😀', '😂', '😉', '😮', '😢', '😡', '👍', '👏', '🙏', '🔥', '⚔️', '🛡️', '✨', '🌌', '💫', '🏆'];
const EMOTES = ['Hello!', 'Good game!', 'Well played', 'Nice move!', 'Thinking…', 'Rematch?'];
const SEAL = {pending: 'Pending', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', cancelled: 'Cancelled'};
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  swords: svg('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'), up: svg('<path d="m18 15-6-6-6 6"/>'), close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>'),
  send: svg('<path d="M3.7 3.1a.5.5 0 0 0-.7.6l2.9 7.6a2 2 0 0 1 0 1.4L3 20.3a.5.5 0 0 0 .7.6l18-8.5a.5.5 0 0 0 0-.9zM6 12h16"/>'),
  trophy: svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>'),
};
const LABEL = {online: 'Online', match: 'In a match', offline: 'Offline'};
const time = at => new Date(at * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
const dayKey = at => new Date(at * 1000).toDateString();
function dayLabel(at) {
  const d = new Date(at * 1000), today = new Date(), yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'short'});
}
// Som curto de mensagem nova (dois tons), no volume de efeitos das Opções.
let audio = null;
function ping() {
  try {
    const gain = Number(localStorage.getItem('ss-sfx') ?? 0.7) * 0.12;
    if (!gain) return;
    audio ||= new AudioContext();
    [[880, 0], [1320, 0.09]].forEach(([hz, at]) => {
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + at;
      o.frequency.value = hz; o.type = 'sine';
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.18);
    });
  } catch { /* sem áudio: segue só com o toast */ }
}

export function mountChatDock({api, avatarOf, decks = () => [], play, inMatch = false, onFriends = () => {}, onProfile = null}) {
  const dock = document.createElement('div');
  dock.className = `cd-dock ${inMatch ? 'is-match' : ''}`;
  dock.setAttribute('aria-label', 'Chats');
  document.body.append(dock);
  let friends = [], ready = false, picker = false;
  const convs = []; // {user, min, last, seenUpTo, lastDay, el, group, g}; as MAX_OPEN primeiras são janelas, o resto abas
  const unreadSeen = new Map(); // amigo -> não lidas na última consulta (toast só quando sobe)
  const waiting = new Set(); // desafios que eu mandei: aceitos, levam à partida
  const friend = user => friends.find(f => f.username === user) || {username: user};
  const deckSelect = name => { const list = decks(); return list.length ? `<select class="kv-input cd-duel__deck" name="${name}" aria-label="Deck" translate="no">${list.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select>` : '<p class="cd-status">Build a complete deck first.</p>'; };
  const deckById = id => decks().find(d => d.id === id)?.deck;

  // ---------- janelas ----------
  function windowHtml(c) {
    const f = friend(c.user), canDuel = !inMatch && f.status === 'online';
    return `<header class="cd-win__head">
        <button class="cd-win__who" data-cd="toggle" aria-expanded="${!c.min}" aria-label="${c.min ? 'Open' : 'Minimize'} chat with ${esc(c.user)}">
          <span class="cd-avatar" style="background-image:url('${avatarOf(f.avatar_card) || ''}');${faceStyle(f.avatar_card || 'god-athena')}"></span>
          <span class="cd-win__name"><b translate="no">${playerName(c.user)}</b><small class="cd-dot is-${f.status || 'offline'}">${LABEL[f.status] || ''}</small></span>
          <b class="cd-badge" hidden></b></button>
        ${onProfile ? `<button class="cd-icon" data-cd="profile" title="View profile" aria-label="${esc(c.user)} · profile">${ICON.user}</button>` : ''}
        ${inMatch ? '' : `<button class="cd-icon" data-cd="duel-open" ${canDuel ? '' : 'disabled'} title="${canDuel ? 'Challenge to a duel' : 'Your friend must be online'}" aria-label="Challenge ${esc(c.user)}">${ICON.swords}</button>`}
        <button class="cd-icon" data-cd="toggle" title="${c.min ? 'Open' : 'Minimize'}" aria-label="${c.min ? 'Open' : 'Minimize'}">${c.min ? ICON.up : ICON.down}</button>
        <button class="cd-icon" data-cd="close" title="Close" aria-label="Close chat with ${esc(c.user)}">${ICON.close}</button></header>
      <div class="cd-win__body">
        <form class="cd-duel" data-cd-form="duel" hidden><span>Your deck</span>${deckSelect('deck')}<button class="cd-btn is-gold">Send challenge</button><button type="button" class="cd-btn" data-cd="duel-close">Cancel</button></form>
        <ol class="cd-log" aria-live="polite" aria-label="Messages with ${esc(c.user)}"></ol>
        <p class="cd-seen" hidden>Seen</p>
        <div class="cd-picker" hidden>${EMOTES.map(e => `<button type="button" class="cd-emote" data-cd="emote" data-text="${esc(e)}">${esc(e)}</button>`).join('')}
          <span class="cd-emoji">${EMOJI.map(e => `<button type="button" data-cd="emoji" data-text="${e}" aria-label="${e}">${e}</button>`).join('')}</span></div>
        <form class="cd-form" data-cd-form="msg">
          <button type="button" class="cd-icon" data-cd="picker" title="Emoji and emotes" aria-label="Emoji and emotes" aria-expanded="false">${ICON.smile}</button>
          <label class="lb-sr" for="cd-in-${esc(c.user)}">Message</label>
          <input class="cd-input" id="cd-in-${esc(c.user)}" name="msg" maxlength="500" autocomplete="off" placeholder="Message ${esc(c.user)}">
          <button class="cd-send" title="Send" aria-label="Send">${ICON.send}</button></form>
        <p class="cd-foot"><span class="cd-status" role="status"></span><button type="button" data-cd="report">Report</button></p>
      </div>`;
  }
  function layout() {
    convs.forEach((c, i) => {
      if (i < MAX_OPEN && !c.el) {
        c.el = document.createElement('section');
        c.el.className = 'cd-win'; c.el.dataset.user = c.user;
        c.el.innerHTML = windowHtml(c);
        c.last = 0; c.lastDay = null; c.group = null; c.g = 0;
        if (!c.min) pull(c);
      }
      if (i >= MAX_OPEN && c.el) { c.el.remove(); c.el = null; }
      if (c.el) { c.el.classList.toggle('is-min', c.min); dock.append(c.el); }
    });
    // Faixa de abas: conversas além das 3 janelas (clicar traz para a frente).
    let tabs = dock.querySelector('.cd-tabs');
    const extra = convs.slice(MAX_OPEN);
    if (!extra.length) tabs?.remove();
    else {
      tabs ||= Object.assign(document.createElement('nav'), {className: 'cd-tabs'});
      tabs.setAttribute('aria-label', 'More chats');
      tabs.innerHTML = extra.map(c => { const n = friend(c.user).unread || 0;
        return `<button class="cd-tab" data-cd="front" data-user="${esc(c.user)}"><span translate="no">${playerName(c.user)}</span>${n ? `<b class="cd-badge">${n}</b>` : ''}</button>`; }).join('');
      dock.append(tabs);
    }
    if (inMatch) launcher();
    badges();
  }
  function open(user, {min = false, focus = true} = {}) {
    let c = convs.find(x => x.user === user);
    if (c) { convs.splice(convs.indexOf(c), 1); if (!min) c.min = false; }
    else c = {user, min, last: 0, seenUpTo: 0, lastDay: null, el: null};
    convs.unshift(c);
    layout();
    if (!c.min) { pull(c); if (focus) c.el?.querySelector('[name=msg]')?.focus(); }
    return c;
  }
  function close(c) { c.el?.remove(); convs.splice(convs.indexOf(c), 1); layout(); }
  function toggle(c) {
    c.min = !c.min;
    c.el.classList.toggle('is-min', c.min);
    c.el.querySelectorAll('[data-cd=toggle]').forEach(b => { if (b.classList.contains('cd-icon')) { b.innerHTML = c.min ? ICON.up : ICON.down; b.title = c.min ? 'Open' : 'Minimize'; b.setAttribute('aria-label', b.title); } else b.setAttribute('aria-expanded', !c.min); });
    if (!c.min) { pull(c); c.el.querySelector('[name=msg]')?.focus(); }
  }

  // ---------- mensagens ----------
  // Cartão de sistema: ícone, título e selo de estado; ações pequenas embaixo.
  const sysRow = (icon, title, seal) => `<div class="cd-sys__row">${icon}<b>${esc(title)}</b>${seal ? `<span class="cd-seal is-${seal}">${SEAL[seal]}</span>` : ''}</div>`;
  function duelCard(ch, title) {
    // shortcut: "Open duel" some 1 h depois do desafio ou quando chega um resultado; o servidor não diz se a partida ainda existe.
    const live = ch.status === 'accepted' && ch.match && Date.now() / 1000 - ch.expires_at < 3600;
    const acts = ch.status !== 'pending' ? (live ? `<a class="cd-btn is-small cd-sys__go" href="/playtest/divine/?match=${esc(ch.match)}">Open duel</a>` : '')
      : ch.mine ? `<small>Waiting for an answer…</small><button class="cd-btn is-small" data-cd="duel-cancel" data-id="${ch.id}">Cancel</button>`
      : inMatch ? '<small>Answer after this match.</small>'
      : `${deckSelect(`deck-${ch.id}`)}<span class="cd-duel__acts"><button class="cd-btn is-small is-gold" data-cd="duel-accept" data-id="${ch.id}">Accept</button><button class="cd-btn is-small" data-cd="duel-decline" data-id="${ch.id}">Decline</button></span>`;
    return `${sysRow(ICON.swords, title, ch.status === 'pending' && !ch.mine ? '' : ch.status)}${acts ? `<div class="cd-sys__acts">${acts}</div>` : ''}`;
  }
  function append(c, list) {
    const log = c.el?.querySelector('.cd-log');
    if (!log || !list.length) return;
    let html = '';
    for (const m of list) {
      if (dayKey(m.at) !== c.lastDay) { c.lastDay = dayKey(m.at); c.group = null; html += `<li class="cd-day" role="separator"><span>${dayLabel(m.at)}</span></li>`; }
      if (m.kind === 'result' || m.challenge) {
        c.group = null;
        html += m.challenge ? `<li class="cd-sys" data-id="${m.id}" data-challenge="${m.challenge.id}" data-status="${m.challenge.status}">${duelCard(m.challenge, m.challenge.mine ? 'You sent a challenge' : m.body.replace(/^⚔\s*/, ''))}</li>`
          : `<li class="cd-sys is-result" data-id="${m.id}">${sysRow(ICON.trophy, m.body)}</li>`;
        continue;
      }
      // Grupo: mensagens seguidas da mesma pessoa em até 5 min; avatar no início (amigo) e horário no fim.
      const fresh = !(c.group && c.group.mine === m.mine && m.at - c.group.at < GROUP_SECS);
      if (fresh) c.g++;
      c.group = {mine: m.mine, at: m.at};
      const f = friend(c.user), av = fresh && !m.mine ? `<span class="cd-avatar cd-msg__av" style="background-image:url('${avatarOf(f.avatar_card) || ''}');${faceStyle(f.avatar_card || 'god-athena')}"></span>` : '';
      html += `<li class="cd-msg ${m.mine ? 'is-mine' : ''} ${fresh ? 'is-first' : ''}" data-id="${m.id}" data-g="${c.g}">${av}<p translate="no">${esc(m.body)}</p><time datetime="${new Date(m.at * 1000).toISOString()}">${time(m.at)}</time></li>`;
    }
    log.insertAdjacentHTML('beforeend', html);
    log.querySelectorAll('.cd-msg').forEach(li => li.classList.toggle('is-last', li.nextElementSibling?.dataset.g !== li.dataset.g));
    if (list.some(m => m.kind === 'result')) log.querySelectorAll('.cd-sys__go').forEach(a => a.remove()); // duelo acabou
    c.last = list.at(-1).id; log.scrollTop = log.scrollHeight;
  }
  function seen(c) { // "Seen" quando o amigo leu a minha última mensagem
    const mine = [...c.el.querySelectorAll('.cd-msg.is-mine')].at(-1), tag = c.el.querySelector('.cd-seen');
    tag.hidden = !(mine && Number(mine.dataset.id) <= c.seenUpTo && !mine.nextElementSibling);
  }
  function challenges(list) {
    for (const ch of list || []) {
      for (const li of dock.querySelectorAll(`[data-challenge="${ch.id}"]`)) {
        if (li.dataset.status !== ch.status) { li.dataset.status = ch.status; li.innerHTML = duelCard(ch, li.querySelector('b')?.textContent || ''); }
      }
      if (ch.mine && ch.status === 'accepted' && ch.match && waiting.has(ch.id)) { waiting.delete(ch.id); play?.(ch.match); }
    }
  }
  async function pull(c) {
    if (!c.el || c.min || c.busy) return;
    c.busy = true;
    try {
      const r = await api(`/api/chat/${encodeURIComponent(c.user)}?after=${c.last}`);
      if (!c.el) return;
      append(c, r.messages); challenges(r.challenges); c.seenUpTo = r.seen_up_to; seen(c);
      const f = friend(c.user); if (f.unread) { f.unread = 0; unreadSeen.set(c.user, 0); badges(); }
    } catch (err) { status(c, err.message); } finally { c.busy = false; }
  }
  const status = (c, text) => { const s = c.el?.querySelector('.cd-status'); if (s) s.textContent = text; };

  // ---------- contadores, toasts e lista ----------
  function badges() {
    for (const c of convs) {
      const b = c.el?.querySelector('.cd-badge'), n = friend(c.user).unread || 0;
      if (b) { b.hidden = !(c.min && n); b.textContent = n; }
    }
    if (inMatch) { const n = friends.reduce((s, f) => s + (f.unread || 0), 0), b = dock.querySelector('.cd-launch .cd-badge'); if (b) { b.hidden = !n; b.textContent = n; } }
  }
  function toast(f) {
    document.querySelector('.cd-toast')?.remove();
    const t = document.createElement('button');
    t.className = 'cd-toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span class="cd-avatar" style="background-image:url('${avatarOf(f.avatar_card) || ''}');${faceStyle(f.avatar_card || 'god-athena')}"></span><span><b translate="no">${playerName(f.username)}</b><small>New message${f.unread > 1 ? `s · ${f.unread}` : ''}</small></span>`;
    t.onclick = () => { t.remove(); open(f.username); };
    document.body.append(t);
    setTimeout(() => t.remove(), 6000);
    if (!inMatch) ping();
  }
  async function refreshFriends() {
    let data;
    try { data = await api('/api/friends'); } catch { if (!ready) dock.hidden = true; return; } // sem conta: sem chat
    dock.hidden = false;
    friends = data.friends;
    for (const f of friends) {
      const before = unreadSeen.get(f.username) ?? (ready ? 0 : f.unread);
      const c = convs.find(x => x.user === f.username), visible = c?.el && !c.min && !document.hidden;
      if (f.unread > before && !visible) {
        toast(f);
        if (inMatch && !c) open(f.username, {min: true, focus: false}); // na partida a conversa nova entra minimizada
      }
      unreadSeen.set(f.username, f.unread);
    }
    ready = true;
    // Conversa aberta de quem deixou de ser amigo: fecha.
    for (const c of [...convs]) if (!friends.some(f => f.username === c.user)) close(c);
    for (const c of convs) {
      const dot = c.el?.querySelector('.cd-dot'), duel = c.el?.querySelector('[data-cd=duel-open]'), f = friend(c.user);
      if (dot) { dot.className = `cd-dot is-${f.status}`; dot.textContent = LABEL[f.status] || ''; }
      if (duel) { duel.disabled = f.status !== 'online'; duel.title = duel.disabled ? 'Your friend must be online' : 'Challenge to a duel'; }
    }
    badges();
    if (convs.length > MAX_OPEN) layout();
    if (inMatch && picker) launcher();
    onFriends(data);
  }

  // Na partida não há painel Friends: um botão no canto abre a lista de amigos.
  function launcher() {
    let l = dock.querySelector('.cd-launch');
    if (!l) { l = document.createElement('div'); l.className = 'cd-launch'; }
    const online = friends.filter(f => f.status !== 'offline');
    l.innerHTML = `<button class="cd-launch__btn" data-cd="picker-friends" aria-expanded="${picker}">Friends · ${online.length}<b class="cd-badge" hidden></b></button>
      ${picker ? `<div class="cd-launch__list" role="menu">${friends.length ? [...online, ...friends.filter(f => f.status === 'offline')].map(f => `<button role="menuitem" data-cd="open" data-user="${esc(f.username)}">
        <span class="cd-avatar" style="background-image:url('${avatarOf(f.avatar_card) || ''}');${faceStyle(f.avatar_card || 'god-athena')}"></span><span class="cd-win__name"><b translate="no">${playerName(f.username)}</b><small class="cd-dot is-${f.status}">${LABEL[f.status]}</small></span>${f.unread ? `<b class="cd-badge">${f.unread}</b>` : ''}</button>`).join('') : '<p class="cd-status">No friends yet.</p>'}</div>` : ''}`;
    dock.prepend(l); badges(); // primeiro filho = canto direito (fila invertida)
  }

  // ---------- eventos ----------
  dock.addEventListener('click', async e => {
    const b = e.target.closest('[data-cd]');
    if (!b) return;
    const act = b.dataset.cd, c = convs.find(x => x.el === b.closest('.cd-win'));
    if (act === 'picker-friends') { picker = !picker; return launcher(); }
    if (act === 'open') { picker = false; launcher(); return open(b.dataset.user); }
    if (act === 'front') return open(b.dataset.user);
    if (!c) return;
    if (act === 'toggle') return toggle(c);
    if (act === 'close') return close(c);
    if (act === 'profile') return onProfile?.(c.user);
    if (act === 'picker') { const p = c.el.querySelector('.cd-picker'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', !p.hidden); return; }
    if (act === 'emoji' || act === 'emote') {
      const input = c.el.querySelector('[name=msg]');
      if (act === 'emote') return send(c, b.textContent.trim()); // manda a resposta rápida no idioma em que aparece
      input.value += b.dataset.text; input.focus(); return;
    }
    if (act === 'duel-open' || act === 'duel-close') { if (c.min) toggle(c); c.el.querySelector('.cd-duel').hidden = act === 'duel-close'; return; }
    if (act === 'report') {
      if (!confirm(`Report this conversation with ${c.user}? The last messages will be sent to the Saint Seiya TCG team.`)) return;
      try { await api(`/api/chat/${encodeURIComponent(c.user)}/report`, 'POST'); status(c, 'Thanks. The team will review it.'); } catch (err) { status(c, err.message); }
      return;
    }
    if (act.startsWith('duel-')) {
      const verb = act.slice(5), li = b.closest('[data-challenge]');
      const deck = verb === 'accept' ? deckById(li?.querySelector('select')?.value) : null;
      if (verb === 'accept' && !deck) return;
      try { const r = await api(`/api/challenges/${b.dataset.id}/${verb}`, 'POST', deck ? {deck} : {}); if (r.match) return play?.(r.match); pull(c); }
      catch (err) { status(c, err.message); }
    }
  });
  async function send(c, body) {
    try {
      const m = await api(`/api/chat/${encodeURIComponent(c.user)}`, 'POST', {body});
      status(c, ''); if (m.id > c.last) append(c, [m]); seen(c);
      c.el.querySelector('.cd-picker').hidden = true;
      return true;
    } catch (err) { status(c, err.message); return false; }
  }
  dock.addEventListener('submit', async e => {
    e.preventDefault();
    const c = convs.find(x => x.el === e.target.closest('.cd-win'));
    if (!c) return;
    if (e.target.dataset.cdForm === 'duel') {
      const deck = deckById(e.target.deck?.value);
      if (!deck) return;
      try { const r = await api('/api/challenges', 'POST', {to: c.user, deck}); waiting.add(r.id); e.target.hidden = true; pull(c); }
      catch (err) { status(c, err.message); }
      return;
    }
    const input = e.target.querySelector('[name=msg]'), body = input.value.trim();
    if (body && await send(c, body)) input.value = '';
  });
  dock.addEventListener('keydown', e => {
    const c = convs.find(x => x.el === e.target.closest('.cd-win'));
    if (e.key === 'Escape' && c && !c.min) { e.stopPropagation(); toggle(c); }
  });

  setInterval(() => { if (!document.hidden) convs.forEach(pull); }, OPEN_POLL);
  setInterval(() => { if (!document.hidden) refreshFriends(); }, BACKGROUND_POLL);
  refreshFriends();
  // Desafio de fora do chat (tela Jogar → Online, autor 01/11/2026): abre a conversa e manda o desafio como o botão da janela.
  async function challenge(user, deck) {
    const c = open(user, {focus: false}), r = await api('/api/challenges', 'POST', {to: user, deck});
    waiting.add(r.id); pull(c);
    return r;
  }
  return {open, refreshFriends, challenges, challenge, friends: () => friends};
}
