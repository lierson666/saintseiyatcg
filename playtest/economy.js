// Economia do Olympus Arena (docs/economia.md, autor 31/10/2026): saldo de Cosmo Coins, Store, Collection e abertura de booster.
// O servidor decide tudo (saldo, coleção, conteúdo do pacote); aqui só se desenha. Visual da loja inspirado em MTG Arena e RipRush.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');
const COPY_LIMIT = 3;
// Arte de fundo do booster: o logo vai por cima automaticamente (padrão MTG). Trocar o arquivo troca a arte.
const PACK_ART = new URL('./assets/boosters/olympus.webp', import.meta.url).href;
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

const pack = (label = 'Olympus') => `<div class="ec-pack" aria-hidden="true"><img class="ec-pack__art" src="${PACK_ART}" alt="" onerror="this.remove()">
  <img class="ec-pack__logo" src="${LOGO}" alt=""><span class="ec-pack__name">${esc(label)}</span><span class="ec-pack__foil"></span></div>`;

export function storeScreen(e) {
  if (!e) return `<section class="lb-page"><header class="lb-page__head"><h1>Store</h1><p>Sign in to buy and open boosters.</p></header></section>`;
  const price = e.prices.booster, can = e.coins >= price;
  return `<section class="lb-page ec-store">
    <header class="lb-page__head"><h1>Store</h1><p>Spend Cosmo Coins on boosters. Each booster has 14 cards: 10 Common, 3 Uncommon and 1 Legendary or Divine.</p></header>
    <div class="ec-store__grid">
      <article class="ec-tile ec-tile--olympus">
        ${pack()}
        <div class="ec-tile__body"><h2>Olympus Booster</h2><p class="kv-status">All Gods · 14 cards · Divine in about 1 of 8</p>
          <button class="kv-button ec-buy" data-act="buy-booster" ${can ? '' : 'disabled'}><i class="ec-coin" aria-hidden="true"></i>${fmt(price)}</button>
          ${can ? '' : `<p class="kv-status">You need ${fmt(price - e.coins)} more Cosmo Coins.</p>`}</div>
      </article>
      <article class="ec-tile ec-tile--owned">
        <div class="ec-stack" aria-hidden="true">${pack()}${e.boosters > 1 ? pack() : ''}</div>
        <div class="ec-tile__body"><h2>My boosters</h2><p class="ec-count">${e.boosters}</p>
          <button class="kv-button is-gold" data-act="open-booster" ${e.boosters ? '' : 'disabled'}>Open booster</button></div>
      </article>
    </div>
    <p class="kv-status">Sleeves, avatars and God art arrive in the Store soon.</p>
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
  dlg.showModal();
  let r;
  try { r = await call('/api/boosters/open', 'POST'); } catch (err) {
    dlg.innerHTML = `<p class="kv-status err" role="status">${esc(err.message)}</p><button class="kv-ghost" data-close>Close</button>`;
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => dlg.remove());
    return;
  }
  await new Promise(ok => setTimeout(ok, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900));
  const coins = r.cards.reduce((n, c) => n + c.coins, 0);
  dlg.innerHTML = `<div class="ec-open__cards">${r.cards.map((c, i) => `<button class="ec-flip is-${c.rarity.toLowerCase()}" style="--i:${i}" data-i="${i}" aria-label="Reveal card ${i + 1}">
      <span class="ec-flip__back"><img src="${LOGO}" alt=""></span><span class="ec-flip__front">${face(c.id)}
      ${c.new ? '<b class="ec-tag ec-tag--new">New</b>' : ''}${c.coins ? `<b class="ec-tag ec-tag--coins">+${c.coins}</b>` : ''}</span></button>`).join('')}</div>
    <footer class="ec-open__foot"><button class="kv-ghost" data-reveal>Reveal all</button>
      ${coins ? `<p class="kv-status ec-open__coins" hidden>Extra copies: +${fmt(coins)} Cosmo Coins</p>` : ''}
      <button class="kv-button is-gold" data-close>Done</button></footer>`;
  const flip = b => {
    b.classList.add('is-open');
    const tally = dlg.querySelector('.ec-open__coins');
    if (tally && !dlg.querySelector('.ec-flip:not(.is-open)')) tally.hidden = false;  // total das repetidas só depois de virar tudo
  };
  dlg.addEventListener('click', ev => {
    const b = ev.target.closest('.ec-flip');
    if (b) flip(b);
    if (ev.target.closest('[data-reveal]')) dlg.querySelectorAll('.ec-flip').forEach((x, i) => setTimeout(() => flip(x), i * 60));
    if (ev.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', () => { dlg.remove(); done(r); });
}

export const buyBooster = () => call('/api/store/buy', 'POST', {item: 'booster'});
