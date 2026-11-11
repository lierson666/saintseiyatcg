// Economia do Olympus Arena (docs/economia.md, autor 31/10/2026): saldo de Cosmo Coins, Store, Collection e abertura de booster.
// O servidor decide tudo (saldo, coleção, conteúdo do pacote); aqui só se desenha. Visual da loja inspirado em MTG Arena e RipRush.
import {faceStyle} from './avatar-face.js?v=20261031-3';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');
const COPY_LIMIT = 3;
// Booster (padrão MTG): arte de fundo + logo da edição embaixo, ambos editados no Card Forge (card-forge/boosters.html).
export const PACK_ART = new URL('./assets/boosters/olympus.webp?v=20261031-athena', import.meta.url).href;
const PACK_LOGO = new URL('./assets/boosters/logo/olympus.webp', import.meta.url).href;
const LOGO = new URL('../LOGO/logo-web.webp', import.meta.url).href;

async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const loadEconomy = () => call('/api/economy').catch(() => null);

// Wildcard (estilo MTG Arena, autor 07/11/2026): sai no lugar de uma carta do booster e vira qualquer carta da mesma raridade.
const RARITY_PT = {Common: 'Common', Uncommon: 'Uncommon', Legendary: 'Legendary', Divine: 'Divine'};
const isWild = id => String(id).startsWith('wildcard-');
const wildRarity = id => Object.keys(RARITY_PT).find(r => `wildcard-${r.toLowerCase()}` === id);
const wildFace = rarity => `<div class="ec-wild ec-wild--${rarity.toLowerCase()}"><b>Wildcard</b><small>${RARITY_PT[rarity]}</small><p>Trade it for any ${RARITY_PT[rarity]} card in the Collection.</p></div>`;
const faceOf = (face, id, cls) => (isWild(id) ? wildFace(wildRarity(id)) : face(id, cls));
export const redeemWildcard = (card, pay) => call('/api/wildcards/redeem', 'POST', {card, pay});

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

// Cosméticos (autor, 31/10/2026): avatar, sleeve e deck box por personagem; o servidor manda catálogo, preço e posse.
// art(id, size) devolve a arte do personagem (Deus: 'god-<nome>'); o rosto do avatar é recorte automático da arte.
export const COS_KINDS = [['avatar', 'Avatar'], ['sleeve', 'Sleeve']]; // Deck box saiu (autor, 31/10/2026): a capa do deck já faz isso
// Avatar: recorte no rosto (avatar-face.js); sleeve e caixa usam a arte inteira.
export const cosPreview = (kind, url, id) => `<span class="ec-cos-${kind}" style="background-image:url('${url || ''}');${kind === 'avatar' ? faceStyle(id) : ''}" aria-hidden="true"></span>`;
// Loja estilo MTG Arena (autor, 31/10/2026): abas por categoria, um item grande por tile com o preço no botão,
// filtro por grupo e confirmação de compra com a prévia grande. Textos: /design:ux-copy.
const TABS = [['boosters', 'Boosters'], ['avatar', 'Avatars'], ['sleeve', 'Sleeves'], ['coin', 'Toss Coins'], ['set', 'Sets']];
const KIND = {avatar: {one: 'Avatar', what: 'Your portrait in the lobby and at the table.'},
  sleeve: {one: 'Sleeve', what: 'The back of your cards. Your opponent sees it too.'},
  coin: {one: 'Toss Coin', what: 'Your side of the opening coin toss. Your opponent sees it too.'},
  set: {one: 'Set', what: 'Avatar and Sleeve together.'}};
const paidKinds = c => COS_KINDS.filter(([k]) => c[k].price).map(([k]) => k);
const setFull = c => paidKinds(c).reduce((n, k) => n + c[k].price, 0);
const setOpen = c => paidKinds(c).every(k => !c[k].owned);
const coinPrice = (now, was) => `<i class="ec-coin" aria-hidden="true"></i>${was ? `<s>${fmt(was)}</s>` : ''}${fmt(now)}`;
const allItems = e => (e.cosmetics || []).flatMap(g => g.items.map(c => ({...c, group: g.group})));
function setArt(c, art) {
  return `<span class="ec-set__art" aria-hidden="true">${COS_KINDS.map(([k]) => cosPreview(k, art(c.id, 'webp'), c.id)).join('')}</span>`;
}
function itemTile(e, c, kind, art, using) {
  const set = kind === 'set', it = set ? null : c[kind], owned = set ? !setOpen(c) : it.owned;
  const price = set ? c.set : it.price, inUse = !set && using[kind] === c.id;
  const action = !owned ? `<button class="ec-cta ec-tile__price" data-act="cos-pick" data-kind="${kind}" data-id="${c.id}" aria-label="Buy ${esc(c.name)} ${KIND[kind].one} for ${fmt(price)} Cosmo Coins">${price ? coinPrice(price, set ? setFull(c) : 0) : 'Free'}</button>`
    : set ? '<span class="ec-tile__state">Owned</span>'
    : inUse ? '<span class="ec-tile__state is-on">Equipped</span>'
    : `<button class="ec-tile__equip" data-act="use-cos" data-kind="${kind}" data-id="${c.id}">Equip</button>`;
  return `<article class="ec-tile ec-tile--${kind} ${owned ? 'is-owned' : ''}">
    ${set ? `<b class="ec-bundle__off">-${e.set_off}%</b>` : ''}
    <button class="ec-tile__look" data-act="cos-pick" data-kind="${kind}" data-id="${c.id}" aria-label="See ${esc(c.name)} ${KIND[kind].one}">${set ? setArt(c, art) : cosPreview(kind, art(c.id, 'webp'), c.id)}</button>
    <h4>${esc(c.name)}</h4><small>${esc(c.group)}</small>${action}</article>`;
}
// Cardback vanilla (autor, 02/11/2026): grátis e sempre na vitrine, para voltar a ele de qualquer sleeve. Equipar é ficar sem sleeve.
function vanillaTile(using) {
  const preview = `<span class="ec-cos-sleeve" style="background-image:url('${new URL('../LOGO/cardback-vanilla.webp', import.meta.url).href}')" aria-hidden="true"></span>`;
  return `<article class="ec-tile ec-tile--sleeve is-owned"><div class="ec-tile__look" style="cursor:default">${preview}</div><h4>Vanilla</h4><small>Saint Seiya TCG</small>
    ${using.sleeve ? '<button class="ec-tile__equip" data-act="use-cos" data-kind="sleeve" data-id="">Equip</button>' : '<span class="ec-tile__state is-on">Equipped</span>'}</article>`;
}
// Confirmação (o que compra, quanto custa, quanto falta); dono do item: só a prévia e o atalho de equipar.
function confirmBox(e, c, kind, art, using) {
  const set = kind === 'set', owned = set ? !setOpen(c) : c[kind].owned, price = set ? c.set : c[kind].price, short = price - e.coins;
  const title = `${esc(c.name)} ${KIND[kind].one}`;
  const cta = owned ? !set && using[kind] !== c.id ? `<button class="ec-cta" data-act="use-cos" data-kind="${kind}" data-id="${c.id}">Equip</button>` : ''
    : `<button class="ec-cta" data-act="buy-cos" data-kind="${kind}" data-id="${c.id}" ${short > 0 ? 'disabled' : ''}>Buy for ${coinPrice(price)}</button>`;
  return `<div class="ec-confirm" role="dialog" aria-modal="true" aria-labelledby="ec-confirm-t"><div class="ec-confirm__box">
    <div class="ec-confirm__art ec-tile--${kind}">${set ? setArt(c, art) : cosPreview(kind, art(c.id, 'webp'), c.id)}</div>
    <div class="ec-confirm__info"><p class="ec-eyebrow">${esc(c.group)} · ${KIND[kind].one}</p><h2 id="ec-confirm-t">${title}</h2><p>${KIND[kind].what}</p>
      ${set && !owned ? `<p class="ec-confirm__deal"><b class="ec-bundle__off">-${e.set_off}%</b> ${fmt(setFull(c) - c.set)} Cosmo Coins less than buying each one.</p>` : ''}
      ${owned ? '<p class="ec-confirm__owned">You own this.</p>' : short > 0 ? `<p class="ec-hint">You need ${fmt(short)} more Cosmo Coins.</p>` : ''}
      <div class="ec-actions">${cta}<button class="ec-cta ec-cta--open" data-act="cos-close">${owned ? 'Close' : 'Not now'}</button></div></div></div></div>`;
}
function cosmeticsTab(e, art, me, view) {
  const using = {avatar: me?.avatar_card || 'god-athena', sleeve: me?.sleeve || null, coin: me?.coin || null}, kind = view.tab;
  const groups = (e.cosmetics || []).map(g => g.group), group = groups.includes(view.group) ? view.group : 'all';
  const items = allItems(e).filter(c => group === 'all' || c.group === group).filter(c => kind !== 'set' || paidKinds(c).length > 1); // Deus: avatar grátis, sem set
  const chip = (v, label) => `<button class="lb-pill ${group === v ? 'is-active' : ''}" data-act="store-group" data-value="${esc(v)}">${esc(label)}</button>`;
  const pick = view.pick && allItems(e).find(c => c.id === view.pick.id);
  return `<p class="ec-tabnote">${KIND[kind].what}${kind === 'set' ? ` Save ${e.set_off}%.` : ''}</p>
    <div class="lb-pills ec-groups">${chip('all', 'All')}${groups.map(g => chip(g, g)).join('')}</div>
    <div class="ec-tiles ec-tiles--${kind}">${kind === 'sleeve' ? vanillaTile(using) : ''}${items.map(c => itemTile(e, c, kind, art, using)).join('')}</div>
    ${pick ? confirmBox(e, pick, view.pick.kind, art, using) : ''}`;
}

export function storeScreen(e, art = () => null, me = null, view = {}) {
  if (!e) return `<section class="lb-page"><header class="lb-page__head"><h1>Store</h1><p>Sign in to buy and open boosters.</p></header></section>`;
  // Layout (autor pediu /ui-ux-pro-max, 31/10/2026): vitrine preto + dourado; booster em destaque, cosméticos "em breve" embaixo.
  const price = e.prices.booster, can = e.coins >= price;
  // Pacotes com desconto escalonado (autor, 31/10/2026, estilo MTG Arena): 1, 3, 10 e 25, preço riscado e selo do desconto.
  const bundles = e.prices.bundles || [{qty: 1, off: 0, price}];
  const bundle = b => { const ok = e.coins >= b.price, full = price * b.qty;
    return `<li class="ec-bundle ${b.off ? 'has-off' : ''}">${b.off ? `<b class="ec-bundle__off">-${b.off}%</b>` : ''}
      <strong>${b.qty}</strong><small>${b.qty === 1 ? 'Booster' : 'Boosters'}</small>
      <button class="ec-cta ec-bundle__buy" data-act="buy-booster" data-qty="${b.qty}" ${ok ? '' : 'disabled'} aria-label="Buy ${b.qty} for ${fmt(b.price)} Cosmo Coins${b.off ? `, ${b.off}% off` : ''}">
        <i class="ec-coin" aria-hidden="true"></i>${b.off ? `<s>${fmt(full)}</s>` : ''}${fmt(b.price)}</button></li>`; };
  // Abrir 1 ou 10 de uma vez; com menos de 10, "Open all (N)".
  const opens = e.boosters > 1 ? `<button class="ec-cta ec-cta--open" data-act="open-booster" data-count="${Math.min(10, e.boosters)}">${e.boosters >= 10 ? 'Open 10' : `Open all (${e.boosters})`}</button>` : '';
  const odds = [['9', 'Common'], ['5', 'Uncommon'], ['1', 'Legendary or Divine']];
  const tab = TABS.some(([t]) => t === view.tab) && (view.tab === 'boosters' || e.cosmetics) ? view.tab : 'boosters';
  const boosters = `<article class="ec-feature">
      <div class="ec-feature__pack">${pack()}</div>
      <div class="ec-feature__info">
        <p class="ec-eyebrow">Booster · All Gods</p>
        <h2>Olympus</h2>
        <ul class="ec-odds" aria-label="Each booster has 15 cards">${odds.map(([n, r]) => `<li><b>${n}</b>${r}</li>`).join('')}</ul>
        <p class="ec-hint ec-odds__extra">Always 15 cards. 1 in 10 boosters brings a second Legendary, and some bring a Wildcard.</p>
        <p class="ec-note">A Divine card replaces the Legendary in about 1 of 8 boosters. Copies beyond 3 turn into Cosmo Coins.</p>
        ${e.boosters ? `<div class="ec-actions"><button class="ec-cta" data-act="open-booster" data-count="1">Open 1</button>${opens}</div>` : ''}
        <ul class="ec-bundles" aria-label="Buy boosters">${bundles.map(bundle).join('')}</ul>
        ${can ? '' : `<p class="ec-hint">You need ${fmt(price - e.coins)} more Cosmo Coins for one booster.</p>`}
      </div>
    </article>`;
  return `<section class="lb-page ec-store">
    <header class="ec-store__head"><div><h1>Store</h1><p>Spend Cosmo Coins earned in duels.</p></div>
      <div class="ec-wallet" aria-label="Your wallet"><span><i class="ec-coin" aria-hidden="true"></i><b>${fmt(e.coins)}</b><small>Cosmo Coins</small></span>
        <span><b>${e.boosters}</b><small>${e.boosters === 1 ? 'Booster' : 'Boosters'}</small></span></div></header>
    <nav class="ec-tabs" role="tablist" aria-label="Store">${TABS.filter(([t]) => t === 'boosters' || e.cosmetics).map(([t, label]) =>
      `<button role="tab" aria-selected="${t === tab}" class="ec-tab ${t === tab ? 'is-active' : ''}" data-act="store-tab" data-value="${t}">${label}</button>`).join('')}</nav>
    ${tab === 'boosters' ? boosters : cosmeticsTab(e, art, me, {...view, tab})}
  </section>`;
}

// Coleção: todas as cartas jogáveis (sem Gods), com quantas o jogador tem; as que faltam ficam apagadas.
export function collectionScreen(e, list, face, filter = 'all', {bar = '', slot = 150} = {}) { // bar/slot: filtros do pool (lobby.js)
  if (!e) return `<section class="lb-page"><header class="lb-page__head"><h1>Collection</h1><p>Sign in to see your collection.</p></header></section>`;
  const owned = c => c.kind === 'Domain' || e.full_access ? COPY_LIMIT : e.collection[c.id] || 0;
  const wild = e.wildcards || {}, wilds = Object.entries(wild).filter(([, n]) => n > 0);
  // Botão Craft: carta do booster com menos de 3 cópias. Usa a wildcard da raridade; sem ela, mostra o preço em coins (docs/economia.md).
  const price = c => e.prices?.craft?.[c.rarity];
  const craft = c => {
    if (e.full_access || c.kind === 'Domain' || owned(c) >= COPY_LIMIT || !RARITY_PT[c.rarity]) return '';
    const attrs = `class="ec-craft" data-act="craft" data-id="${esc(c.id)}" data-rarity="${esc(c.rarity)}"`;
    if (wild[c.rarity] > 0) return `<button ${attrs}>Craft</button>`;
    if (!price(c)) return '';
    const short = e.coins < price(c);
    return `<button ${attrs} data-price="${price(c)}" ${short ? `disabled title="Not enough Cosmo Coins"` : ''} aria-label="Craft for ${fmt(price(c))} Cosmo Coins">Craft <i class="ec-coin" aria-hidden="true"></i>${fmt(price(c))}</button>`;
  };
  const shown = list.filter(c => filter === 'all' || (filter === 'owned' ? owned(c) > 0 : owned(c) === 0));
  const have = list.filter(c => owned(c) > 0).length;
  const pill = (v, label) => `<button class="lb-pill ${filter === v ? 'is-active' : ''}" data-act="collection-filter" data-value="${v}">${label}</button>`;
  return `<section class="lb-page ec-collection">
    <header class="lb-page__head"><h1>Collection</h1><p>${have} of ${list.length} cards${e.full_access ? ' · full access' : ''}. Open boosters to get more.</p>
      <div class="lb-pills">${pill('all', 'All')}${pill('owned', 'Owned')}${pill('missing', 'Missing')}</div>
      ${wilds.length ? `<ul class="ec-wallet-wild" aria-label="Your wildcards">${wilds.map(([r, n]) => `<li class="is-${r.toLowerCase()}"><b>${n}</b>${RARITY_PT[r]} Wildcard</li>`).join('')}</ul>` : ''}</header>
    ${bar}
    <div class="lb-grid ec-grid" style="--slot:${slot}px">${shown.map(c => `<div class="ec-card ${owned(c) ? '' : 'is-missing'}">${face(c.id)}
      <i class="lb-slot__count">${c.kind === 'Domain' ? 'Domain' : `${owned(c)} / ${COPY_LIMIT}`}</i>${craft(c)}</div>`).join('') || '<p class="lb-empty">Nothing here.</p>'}</div>
  </section>`;
}

// Abertura (estilo MTG Arena): o pacote rasga, as 14 cartas caem viradas; clique vira uma, "Reveal all" vira todas.
// Legendary e Divine brilham antes de virar; repetidas acima de 3 mostram as coins que viraram.
export async function openBooster(face, done, count = 1, open = 1) {
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
  // Vários de uma vez: todos os pacotes do leque rasgam juntos.
  (open > 1 ? ring.querySelectorAll('.ec-pack') : [p]).forEach(x => x.classList.add('is-torn'));
  ring.classList.add('is-opening');
  let r;
  try { r = await call('/api/boosters/open', 'POST', {count: open}); } catch (err) {
    dlg.innerHTML = `<p class="kv-status err" role="status">${esc(err.message)}</p><button class="kv-ghost" data-close>Close</button>`;
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => dlg.remove());
    return;
  }
  await new Promise(ok => setTimeout(ok, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900));
  const coins = r.cards.reduce((n, c) => n + c.coins, 0);
  if (r.packs?.length > 1) summary(dlg, r, face, coins);
  else dlg.innerHTML = `<div class="ec-open__cards">${r.cards.map((c, i) => `<button class="ec-flip is-${c.rarity.toLowerCase()} ${c.new ? 'is-new' : ''}" style="--i:${i}" data-i="${i}" data-id="${esc(c.id)}" aria-label="Reveal card ${i + 1}">
      <span class="ec-flip__back"><img src="${LOGO}" alt=""></span><span class="ec-flip__front">${faceOf(face, c.id)}
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
    const b = ev.target.closest('.ec-flip.is-open, .ec-sum__card');
    if (!zoom.hidden || !b) return unzoom();
    zoom.innerHTML = faceOf(face, b.dataset.id, 'lb-card--big');
    zoom.hidden = false;
  });
  dlg.addEventListener('cancel', ev => { if (!zoom.hidden) { ev.preventDefault(); unzoom(); } });
  // Drama por raridade (autor, 31/10/2026): Uncommon dá um clarão; Legendary e Divine tremem antes de virar,
  // clarão na cor da raridade, tela treme e faíscas saem da carta. Com prefers-reduced-motion só o clarão.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Revelação épica (autor, 06/11/2026, receita "card reveal" em 5 passos): pedestal e brilho crescendo, giro lento,
  // raios + anel de luz no meio do giro, reflexo de arco-íris que acompanha a inclinação e partículas que ficam no ar.
  const DRAMA = {uncommon: {wait: 0, sparks: 0}, legendary: {wait: 900, sparks: 18, shake: 'ec-shake'}, divine: {wait: 1400, sparks: 32, shake: 'ec-shake--big'}};
  const sleep = ms => new Promise(ok => setTimeout(ok, still ? 0 : ms));
  const flip = async b => {
    if (b.classList.contains('is-open') || b.classList.contains('is-charging')) return;
    const rarity = ['divine', 'legendary', 'uncommon'].find(k => b.classList.contains(`is-${k}`)), d = DRAMA[rarity];
    const epic = !still && (rarity === 'legendary' || rarity === 'divine');
    // .is-epic entra antes da espera: a frente já fica na mesma lista de transform do giro; trocar a lista junto com
    // .is-open fazia o navegador interpolar por matriz e a carta piscava no começo do giro.
    if (epic) b.classList.add('is-epic');
    if (d?.wait) { b.style.setProperty('--wait', `${d.wait}ms`); b.classList.add('is-charging'); await sleep(d.wait); b.classList.remove('is-charging'); }
    b.classList.add('is-open');
    if (epic) {
      setTimeout(() => b.classList.add('is-settled'), 1100);  // fim do giro lento: a inclinação passa a seguir o ponteiro
      await sleep(450);  // a luz explode no meio do giro
      b.insertAdjacentHTML('afterbegin', '<i class="ec-rays" aria-hidden="true"></i><i class="ec-shock" aria-hidden="true"></i>');
      setTimeout(() => b.querySelectorAll('.ec-rays, .ec-shock').forEach(x => x.remove()), 1900);
      b.insertAdjacentHTML('beforeend', `<span class="ec-motes" aria-hidden="true">${Array.from({length: 8}, (_, k) => `<i style="--k:${k}"></i>`).join('')}</span>`);
    }
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
    return epic ? 1100 : d?.wait ? 700 : 60;
  };
  // Reflexo de arco-íris: depois do giro, a carta épica inclina e o brilho corre conforme o ponteiro.
  dlg.addEventListener('pointermove', ev => {
    const b = ev.target.closest?.('.ec-flip.is-epic.is-settled');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--tx', ((ev.clientX - r.left) / r.width - .5).toFixed(3));
    b.style.setProperty('--ty', ((ev.clientY - r.top) / r.height - .5).toFixed(3));
  });
  dlg.addEventListener('pointerout', ev => {
    const b = ev.target.closest?.('.ec-flip.is-epic');
    if (b && !b.contains(ev.relatedTarget)) { b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); }
  });
  dlg.addEventListener('click', ev => {
    if (!zoom.hidden) return unzoom();
    const b = ev.target.closest('.ec-flip');
    if (b) flip(b);
    if (ev.target.closest('[data-reveal]')) (async () => { for (const x of dlg.querySelectorAll('.ec-flip:not(.is-open)')) await sleep(await flip(x) || 0); })();
    if (ev.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', () => { dlg.remove(); done(r); });
}

// Resumo de vários boosters (autor, 31/10/2026): uma tela só, cartas agrupadas; Divine e Legendary primeiro, brilhando.
const RANK = {Divine: 0, Legendary: 1, Uncommon: 2, Common: 3};
function summary(dlg, r, face, coins) {
  const by = new Map();
  for (const c of r.cards) { const g = by.get(c.id) || {...c, n: 0, coins: 0}; g.n++; g.coins += c.coins; g.new ||= c.new; by.set(c.id, g); }
  const list = [...by.values()].sort((a, b) => RANK[a.rarity] - RANK[b.rarity] || b.new - a.new);
  const fresh = list.filter(c => c.new).length;
  dlg.innerHTML = `<header class="ec-sum__head"><h2>${r.packs.length} boosters opened</h2>
      <p>${r.cards.length} cards · ${fresh} new${coins ? ` · +${fmt(coins)} Cosmo Coins from extra copies` : ''}</p></header>
    <div class="ec-sum">${list.map((c, i) => `<div class="ec-sum__card is-${c.rarity.toLowerCase()}" style="--i:${i}" data-id="${esc(c.id)}">${faceOf(face, c.id)}
      ${c.n > 1 ? `<b class="ec-tag ec-tag--count">×${c.n}</b>` : ''}${c.new ? '<b class="ec-tag ec-tag--new">New</b>' : ''}</div>`).join('')}</div>
    <footer class="ec-open__foot"><p class="kv-status">Right-click a card to see it big.</p><button class="kv-button is-gold" data-close>Done</button></footer>
    <div class="ec-zoom" hidden></div>`;
}

export const buyBooster = (qty = 1) => call('/api/store/buy', 'POST', {item: 'booster', qty});
export const buyCosmetic = (item, id) => call('/api/store/buy', 'POST', {item, id});
