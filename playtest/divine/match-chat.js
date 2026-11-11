// Chat da partida (autor, 07/11/2026): conversa e reações só deste duelo, contra o oponente. Fica ao lado do seu painel
// de recursos (canto de baixo); cada mensagem também entra no Registro da partida. Online passa pelo arena-server
// (POST /arena/matches/:id/chat, evento SSE "chat"); contra a IA fica só local.
// O texto de jogador não se traduz (translate="no"); as reações prontas são frases do jogo e se traduzem.
export const REACTIONS = ['Hello!', 'Good game!', 'Nice play!', 'Wow!', 'Thinking…', 'Oops!', 'Well played!', 'Thanks!'];

export function mountMatchChat({send, nameOf, me, log, anchor}) {
  const seen = new Set(), list = [];
  let open = false, unread = 0;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const root = document.createElement('div');
  root.className = 'mchat';
  root.innerHTML = `<button class="mchat__toggle" type="button" aria-expanded="false" aria-controls="mchat-panel"><span>Chat</span><b class="mchat__badge" hidden></b></button>
    <section class="mchat__panel" id="mchat-panel" role="dialog" aria-label="Match chat" hidden>
      <header class="mchat__head"><strong>Match chat</strong><button class="mchat__x" type="button" aria-label="Close chat">×</button></header>
      <ol class="mchat__list" aria-live="polite"></ol>
      <div class="mchat__chips">${REACTIONS.map(r => `<button type="button" class="mchat__chip" data-react="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <form class="mchat__form"><input class="mchat__input" maxlength="200" autocomplete="off" placeholder="Message your opponent" aria-label="Message"><button class="mchat__send" type="submit">Send</button></form>
    </section>`;
  document.body.append(root);
  const $ = s => root.querySelector(s), panel = $('.mchat__panel'), listEl = $('.mchat__list'), input = $('.mchat__input'), badge = $('.mchat__badge');

  const place = () => {
    const r = anchor?.();
    if (!r?.width) return;
    root.style.left = `${Math.round(r.right + 14)}px`;
    root.style.bottom = `${Math.round(innerHeight - r.bottom)}px`;
  };
  place(); setInterval(place, 500); addEventListener('resize', place);

  const paintBadge = () => { badge.hidden = !unread; badge.textContent = unread > 9 ? '9+' : String(unread); };
  const setOpen = v => {
    open = v; panel.hidden = !v; $('.mchat__toggle').setAttribute('aria-expanded', String(v));
    if (v) { unread = 0; paintBadge(); listEl.scrollTop = listEl.scrollHeight; input.focus(); }
  };
  root.addEventListener('click', e => {
    if (e.target.closest('.mchat__toggle')) return setOpen(!open);
    if (e.target.closest('.mchat__x')) return setOpen(false);
    const chip = e.target.closest('[data-react]');
    if (chip) post(chip.dataset.react);
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } });
  $('.mchat__form').addEventListener('submit', e => { e.preventDefault(); const t = input.value; input.value = ''; post(t); });
  // Atalhos do jogo não disparam enquanto se digita.
  for (const t of ['keydown', 'keyup', 'keypress']) input.addEventListener(t, e => e.stopPropagation());

  let last = 0;
  function post(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!text || Date.now() - last < 700) return;
    last = Date.now();
    Promise.resolve(send(text)).catch(() => add({from: me(), text: 'Message not sent.', at: Date.now(), system: true}));
  }
  function add(msg) {
    const id = `${msg.from}:${msg.at}:${msg.text}`;
    if (seen.has(id)) return;
    seen.add(id); list.push(msg);
    const mine = msg.from === me(), reaction = REACTIONS.includes(msg.text), name = msg.system ? '' : nameOf(msg.from);
    const li = document.createElement('li');
    li.className = `mchat__msg ${mine ? 'is-me' : 'is-them'} ${msg.system ? 'is-system' : ''}`;
    li.innerHTML = `${name ? `<small translate="no">${esc(name)}</small>` : ''}<span ${reaction || msg.system ? '' : 'translate="no"'}>${esc(msg.text)}</span>`;
    listEl.append(li);
    while (listEl.children.length > 60) listEl.firstElementChild.remove();
    listEl.scrollTop = listEl.scrollHeight;
    if (!msg.system) log(`${name}: ${reaction && window.ssI18n?.t ? window.ssI18n.t(msg.text) : msg.text}`); // reação pronta entra traduzida no Registro
    if (!open && !mine && !msg.system) { unread++; paintBadge(); root.classList.remove('is-ping'); void root.offsetWidth; root.classList.add('is-ping'); }
  }
  return {receive: data => (data?.history ? data.history.forEach(add) : add(data))};
}
