// Economia do Olympus Arena (docs/economia.md, autor 31/10/2026): saldo de Cosmo Coins, Store, Collection e abertura de booster.
// O servidor decide tudo (saldo, coleção, conteúdo do pacote); aqui só se desenha. Visual da loja inspirado em MTG Arena e RipRush.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');
const COPY_LIMIT = 3;
// Booster (padrão MTG): arte de fundo + logo da edição embaixo, ambos editados no Card Forge (card-forge/boosters.html).
export const PACK_ART = new URL('./assets/boosters/olympus.webp', import.meta.url).href;
const PACK_LOGO = new URL('./assets/boosters/logo/olympus.webp', import.meta.url).href;
const LOGO = new URL('../LOGO/logo-web.webp', import.meta.url).href;

async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const loadEconomy = () => call('/api/economy').catch(() => null);

// Quantas cópias o jogador pode pôr no deck (sem conta ou com acesso total: o limite normal).
export const ownedLimit = (e, id, kind) => !e || e.full_access || kind === 'God' || kind === 'Domain' ? COPY_LIMIT : Math.min(COPY_LIMIT, e.collection[id] || 0);
// Cartas do deck que faltam na coleção: [{card_id, have, need}].
export const missingCards = (e, deck, kindOf) => !e || e.full_access ? [] : deck.main_deck
  .filter(x => !['God', 'Domain'].includes(kindOf(x.card_id)) && x.quantity > (e.collection[x.card_id] || 0))
  .map(x => ({card_id: x.card_id, have: e.collection[x.card_id] || 0, need: x.quantity}));

export const coinBadge = e => `<button class="ec-coins" data-act="go" data-screen="store" aria-label="${fmt(e.coins)} Cosmo Coins. Open the Store">
  <i aria-hidden="true"></i><b>${fmt(e.coins)}</b></button>`;

const pack = (cls = '') => `<div class="ec-pack is-live ${cls}" aria-hidden="true"><img class="ec-pack__art" src="${PACK_ART}" alt="" onerror="this.remove()">
  <img class="ec-pack__logo" src="${PACK_LOGO}" alt="" onerror="this.remove()"><span class="ec-pack__foil"></span><span class="ec-pack__glare"></span></div>`;

// Pacote vivo (ideias do gacha-card-game, autor 31/10/2026; código próprio, o repositório não tem licença):
// inclina seguindo o ponteiro e o brilho do plástico acompanha; ao sair, volta macio (transição no CSS).
const STILL = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('pointermove', e => {
  const p = e.target.closest?.('.ec-pack.is-live');
  if (!p || STILL.matches || p.closest('.ec-ring.is-dragging')) return;
  const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  p.classList.add('is-tilting');
  p.style.setProperty('--rx', `${((.5 - y) * 18).toFixed(1)}deg`);
  p.style.setProperty('--ry', `${((x - .5) * 22).toFixed(1)}deg`);
  p.style.setProperty('--gx', `${(x * 100).toFixed(0)}%`);
  p.style.setProperty('--gy', `${(y * 100).toFixed(0)}%`);
});
document.addEventListener('pointerout', e => {
  const p = e.target.closest?.('.ec-pack.is-live');
  if (p && !p.contains(e.relatedTarget)) { p.classList.remove('is-tilting'); ['--rx', '--ry'].forEach(k => p.style.removeProperty(k)); }
});

export function storeScreen(e) {
  if (!e) return `<section class="lb-page"><header class="lb-page__head"><h1>Store</h1><p>Sign in to buy and open boosters.</p></header></section>`;
  // Layout (autor pediu /ui-ux-pro-max, 31/10/2026): vitrine preto + dourado; booster em destaque, cosméticos "em breve" embaixo.
  const price = e.prices.booster, can = e.coins >= price;
  const odds = [['10', 'Common'], ['3', 'Uncommon'], ['1', 'Legendary or Divine']];
  const soon = [['Sleeves', 'Card backs for your decks'], ['Avatars', 'Your portrait in the lobby'], ['God art', 'New art for your God on the table']];
  return `<section class="lb-page ec-store">
    <header class="ec-store__head"><div><h1>Store</h1><p>Spend Cosmo Coins earned in duels.</p></div>
      <div class="ec-wallet" aria-label="Your wallet"><span><i class="ec-coin" aria-hidden="true"></i><b>${fmt(e.coins)}</b><small>Cosmo Coins</small></span>
        <span><b>${e.boosters}</b><small>${e.boosters === 1 ? 'Booster' : 'Boosters'}</small></span></div></header>
    <article class="ec-feature">
      <div class="ec-feature__pack">${pack()}</div>
      <div class="ec-feature__info">
        <p class="ec-eyebrow">Booster · All Gods</p>
        <h2>Olympus</h2>
        <ul class="ec-odds" aria-label="Each booster has 14 cards">${odds.map(([n, r]) => `<li><b>${n}</b>${r}</li>`).join('')}</ul>
        <p class="ec-note">A Divine card replaces the Legendary in about 1 of 8 boosters. Copies beyond 3 turn into Cosmo Coins.</p>
        <div class="ec-actions">
          ${e.boosters ? `<button class="ec-cta" data-act="open-booster">Open booster (${e.boosters})</button>` : ''}
          <button class="ec-cta ${e.boosters ? 'ec-cta--open' : ''}" data-act="buy-booster" ${can ? '' : 'disabled'} aria-describedby="ec-price-hint"><i class="ec-coin" aria-hidden="true"></i>Buy · ${fmt(price)}</button>
        </div>
        <p class="ec-hint" id="ec-price-hint">${can ? `You'll have ${fmt(e.coins - price)} left.` : `${fmt(price - e.coins)} more Cosmo Coins to buy one.`}</p>
      </div>
    </article>
    <h2 class="ec-section">Cosmetics <span>Coming soon</span></h2>
    <div class="ec-soon">${soon.map(([t, d]) => `<article class="ec-soon__item"><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
  </section>`;
}

// Coleção: todas as cartas jogáveis (sem Gods), com quantas o jogador tem; as que faltam ficam apagadas.
export function collectionScreen(e, list, face, filter = 'all') {
  if (!e) return `<section class="lb-page"><header class="lb-page__head"><h1>Collection</h1><p>Sign in to see your collection.</p></header></section>`;
  const owned = c => c.kind === 'Domain' || e.full_access ? COPY_LIMIT : e.collection[c.id] || 0;
  const shown = list.filter(c => filter === 'all' || (filter === 'owned' ? owned(c) > 0 : owned(c) === 0));
  const have = list.filter(c => owned(c) > 0).length;
  const pill = (v, label) => `<button class="lb-pill ${filter === v ? 'is-active' : ''}" data-act="collection-filter" data-value="${v}">${label}</button>`;
  return `<section class="lb-page ec-collection">
    <header class="lb-page__head"><h1>Collection</h1><p>${have} of ${list.length} cards${e.full_access ? ' · full access' : ''}. Open boosters to get more.</p>
      <div class="lb-pills">${pill('all', 'All')}${pill('owned', 'Owned')}${pill('missing', 'Missing')}</div></header>
    <div class="lb-grid ec-grid" style="--slot:150px">${shown.map(c => `<div class="ec-card ${owned(c) ? '' : 'is-missing'}">${face(c.id)}
      <i class="lb-slot__count">${c.kind === 'Domain' ? 'Domain' : `${owned(c)} / ${COPY_LIMIT}`}</i></div>`).join('') || '<p class="lb-empty">Nothing here.</p>'}</div>
  </section>`;
}

// Abertura (estilo MTG Arena): o pacote rasga, as 14 cartas caem viradas; clique vira uma, "Reveal all" vira todas.
// Legendary e Divine brilham antes de virar; repetidas acima de 3 mostram as coins que viraram.
export async function openBooster(face, done, count = 1) {
  const dlg = document.createElement('dialog');
  dlg.className = 'ec-open';
  dlg.setAttribute('aria-label', 'Opening booster');
  // Carrossel (até 5 dos boosters do jogador, em leque 3D): arrastar gira e para no mais próximo; o da frente é o que abre.
  // Rasgar (estilo TCG Pocket): arrastar pela faixa de cima do pacote da frente corta; Enter ou o botão abrem direto.
  const owned = Math.max(1, Math.min(5, count)), step = 24;
  dlg.innerHTML = `<div class="ec-stage"><div class="ec-ring" style="--n:${owned}">${Array.from({length: owned}, (_, i) =>
      `<div class="ec-ring__slot" style="--i:${i}">${pack()}</div>`).join('')}</div>
      <div class="ec-cut" aria-hidden="true"><i></i></div></div>
    <p class="ec-open__hint">Swipe across the top of the pack to tear it open</p>
    <footer class="ec-open__foot"><button class="kv-ghost" data-close>Not now</button><button class="kv-button is-gold" data-tear>Open</button></footer>`;
  document.body.append(dlg);
  document.body.classList.add('ec-opening');  // fundo da abertura = céu do site (kv-sky); o lobby some por baixo
  dlg.showModal();
  dlg.addEventListener('close', () => document.body.classList.remove('ec-opening'));
  const ring = dlg.querySelector('.ec-ring'), cut = dlg.querySelector('.ec-cut');
  let angle = 0, drag = null;
  const front = () => ring.children[Math.round(-angle / step)].querySelector('.ec-pack');
  const spin = a => { angle = Math.max(-(owned - 1) * step, Math.min(0, a)); ring.style.setProperty('--a', `${angle}deg`); };
  const torn = new Promise(ok => {
    dlg.addEventListener('pointerdown', e => {
      const p = front(), r = p.getBoundingClientRect();
      if (!e.target.closest('.ec-stage')) return;
      const onTop = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.top + r.height * .28;
      drag = {x: e.clientX, a: angle, tear: onTop, r};
      if (onTop) { cut.style.cssText = `left:${r.left}px;top:${r.top + r.height * .12}px;width:${r.width}px`; cut.classList.add('is-on'); }
      else ring.classList.add('is-dragging');
      dlg.setPointerCapture?.(e.pointerId);
    });
    dlg.addEventListener('pointermove', e => {
      if (!drag) return;
      if (drag.tear) cut.style.setProperty('--p', Math.max(0, Math.min(1, (e.clientX - drag.r.left) / drag.r.width)));
      else if (owned > 1) spin(drag.a + (e.clientX - drag.x) * .4);
    });
    dlg.addEventListener('pointerup', () => {
      if (!drag) return;
      const p = Number(cut.style.getPropertyValue('--p') || 0), was = drag;
      drag = null; ring.classList.remove('is-dragging');
      if (was.tear && p > .7) return ok();
      cut.classList.remove('is-on'); cut.style.removeProperty('--p');
      if (!was.tear) spin(Math.round(angle / step) * step);  // para no pacote mais próximo
    });
    dlg.addEventListener('click', e => { if (e.target.closest('[data-tear]')) ok(); });
  });
  dlg.addEventListener('click', e => { if (e.target.closest('[data-close]') && !dlg.querySelector('.ec-flip')) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove(), {once: true});
  dlg.querySelector('[data-tear]').focus();
  await torn;
  // Rasgo: a tira de cima voa, o resto do pacote cai e as cartas aparecem.
  const p = front(), slot = p.parentElement;
  cut.classList.add('is-done');
  slot.insertAdjacentHTML('beforeend', `<div class="ec-strip">${p.outerHTML}</div>`);
  p.classList.add('is-torn');
  ring.classList.add('is-opening');
  let r;
  try { r = await call('/api/boosters/open', 'POST'); } catch (err) {
    dlg.innerHTML = `<p class="kv-status err" role="status">${esc(err.message)}</p><button class="kv-ghost" data-close>Close</button>`;
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => dlg.remove());
    return;
  }
  await new Promise(ok => setTimeout(ok, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900));
  const coins = r.cards.reduce((n, c) => n + c.coins, 0);
  dlg.innerHTML = `<div class="ec-open__cards">${r.cards.map((c, i) => `<button class="ec-flip is-${c.rarity.toLowerCase()} ${c.new ? 'is-new' : ''}" style="--i:${i}" data-i="${i}" data-id="${esc(c.id)}" aria-label="Reveal card ${i + 1}">
      <span class="ec-flip__back"><img src="${LOGO}" alt=""></span><span class="ec-flip__front">${face(c.id)}
      ${c.new ? '<b class="ec-tag ec-tag--new">New</b>' : ''}${c.coins ? `<b class="ec-tag ec-tag--coins">+${c.coins}</b>` : ''}</span></button>`).join('')}</div>
    <footer class="ec-open__foot"><button class="kv-ghost" data-reveal>Reveal all</button>
      ${coins ? `<p class="kv-status ec-open__coins" hidden>Extra copies: +${fmt(coins)} Cosmo Coins</p>` : ''}
      <button class="kv-button is-gold" data-close>Done</button></footer>
    <div class="ec-zoom" hidden></div>`;
  // Zoom (autor, 31/10/2026): botão direito numa carta já virada mostra a carta grande; clique, botão direito ou Esc fecham.
  const zoom = dlg.querySelector('.ec-zoom');
  const unzoom = () => { zoom.hidden = true; zoom.innerHTML = ''; };
  dlg.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    const b = ev.target.closest('.ec-flip.is-open');
    if (!zoom.hidden || !b) return unzoom();
    zoom.innerHTML = face(b.dataset.id, 'lb-card--big');
    zoom.hidden = false;
  });
  dlg.addEventListener('cancel', ev => { if (!zoom.hidden) { ev.preventDefault(); unzoom(); } });
  // Drama por raridade (autor, 31/10/2026): Uncommon dá um clarão; Legendary e Divine tremem antes de virar,
  // clarão na cor da raridade, tela treme e faíscas saem da carta. Com prefers-reduced-motion só o clarão.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAMA = {uncommon: {wait: 0, sparks: 0}, legendary: {wait: 650, sparks: 18, shake: 'ec-shake'}, divine: {wait: 1100, sparks: 32, shake: 'ec-shake--big'}};
  const sleep = ms => new Promise(ok => setTimeout(ok, still ? 0 : ms));
  const flip = async b => {
    if (b.classList.contains('is-open') || b.classList.contains('is-charging')) return;
    const rarity = ['divine', 'legendary', 'uncommon'].find(k => b.classList.contains(`is-${k}`)), d = DRAMA[rarity];
    if (d?.wait) { b.classList.add('is-charging'); await sleep(d.wait); b.classList.remove('is-charging'); }
    b.classList.add('is-open');
    if (d) {
      dlg.insertAdjacentHTML('beforeend', `<div class="ec-flash ec-flash--${rarity}" aria-hidden="true"></div>`);
      setTimeout(() => dlg.querySelector('.ec-flash')?.remove(), 900);
      if (!still && d.shake) { dlg.classList.remove('ec-shake', 'ec-shake--big'); void dlg.offsetWidth; dlg.classList.add(d.shake); }
      if (!still) for (let i = 0; i < d.sparks; i++) {
        const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120;
        b.insertAdjacentHTML('beforeend', `<i class="ec-spark" style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;--d:${(Math.random() * 300) | 0}ms"></i>`);
      }
      setTimeout(() => b.querySelectorAll('.ec-spark').forEach(x => x.remove()), 1400);
    }
    const tally = dlg.querySelector('.ec-open__coins');
    if (tally && !dlg.querySelector('.ec-flip:not(.is-open)')) tally.hidden = false;  // total das repetidas só depois de virar tudo
    return d?.wait ? 700 : 60;
  };
  dlg.addEventListener('click', ev => {
    if (!zoom.hidden) return unzoom();
    const b = ev.target.closest('.ec-flip');
    if (b) flip(b);
    if (ev.target.closest('[data-reveal]')) (async () => { for (const x of dlg.querySelectorAll('.ec-flip:not(.is-open)')) await sleep(await flip(x) || 0); })();
    if (ev.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', () => { dlg.remove(); done(r); });
}

export const buyBooster = () => call('/api/store/buy', 'POST', {item: 'booster'});
