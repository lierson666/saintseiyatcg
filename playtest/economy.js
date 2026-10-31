// Economia do Olympus Arena (docs/economia.md, autor 31/10/2026): saldo de Cosmo Coins, Store, Collection e abertura de booster.
// O servidor decide tudo (saldo, coleção, conteúdo do pacote); aqui só se desenha. Visual da loja inspirado em MTG Arena e RipRush.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');
const COPY_LIMIT = 3;
// Booster (padrão MTG): arte de fundo + logo da edição embaixo, ambos editados no Card Forge (card-forge/boosters.html).
const PACK_ART = new URL('./assets/boosters/olympus.webp', import.meta.url).href;
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

const pack = () => `<div class="ec-pack" aria-hidden="true"><img class="ec-pack__art" src="${PACK_ART}" alt="" onerror="this.remove()">
  <img class="ec-pack__logo" src="${PACK_LOGO}" alt="" onerror="this.remove()"><span class="ec-pack__foil"></span></div>`;

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
export async function openBooster(face, done) {
  const dlg = document.createElement('dialog');
  dlg.className = 'ec-open';
  dlg.setAttribute('aria-label', 'Opening booster');
  dlg.innerHTML = `<div class="ec-open__pack is-tearing">${pack()}</div>`;
  document.body.append(dlg);
  document.body.classList.add('ec-opening');  // fundo da abertura = céu do site (kv-sky); o lobby some por baixo
  dlg.showModal();
  dlg.addEventListener('close', () => document.body.classList.remove('ec-opening'));
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
