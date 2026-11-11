// Descubra seu Cosmo (autor, 10/11/2026): depois do Tutorial 001, Marin apresenta os 5 Starter Decks, um por Deus, na ordem que o jogador quiser.
// Progresso por conta: na API quando há login e neste aparelho para visitantes.
export const GODS = [
  {god: 'athena', name: 'Athena', style: 'Balanced pressure', level: 'Easy', teaches: 'Combat, Equipment and protection.', line: 'Athena unites courage and protection. Strengthen your Saints and strike at the right time.'},
  {god: 'poseidon', name: 'Poseidon', style: 'Control', level: 'Medium', teaches: 'Returning cards to the hand and card advantage.', line: 'Poseidon wins without hurry. Send enemies back to the hand and control the pace of battle.'},
  {god: 'hades', name: 'Hades', style: 'Sacrifice and return', level: 'Advanced', teaches: 'Sacrifice, the Tartarus and recovery.', line: 'For Hades, death is only the beginning. Sacrifice, recover and come back stronger.'},
  {god: 'ares', name: 'Ares', style: 'Aggression', level: 'Easy', teaches: 'Impulse, fast attacks and direct damage.', line: 'Ares does not wait. Strike first and leave no time to react.'},
  {god: 'artemis', name: 'Artemis', style: 'Growth', level: 'Medium', teaches: 'Training counters and building up resources.', line: 'Artemis hunts with patience. Prepare your allies and watch them grow.'},
];
const OPENING = 'Now choose your path. Try as many as you want: they are all yours.';
const key = name => `sstcg.onboarding.cosmo.${name}`;
const local = name => { try { return JSON.parse(localStorage.getItem(key(name))) || {}; } catch { return {}; } };

export const readDiscover = (name, user) => ({...local(name), ...(user?.onboarding_cosmo || {})});
export function saveDiscover(name, user, patch) {
  const next = {...readDiscover(name, user), ...patch};
  try { localStorage.setItem(key(name), JSON.stringify(next)); } catch { /* sem armazenamento */ }
  if (!user) return;
  user.onboarding_cosmo = next;
  fetch('/api/me', {method: 'PATCH', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({onboarding_cosmo: next})}).catch(() => {});
}

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function discoverScreen({god, showCards, starterOf, artOf, face, name, tried}) {
  const g = GODS.find(x => x.god === god), deck = g && starterOf(g.god);
  const tab = x => `<button class="dc-god ${x.god === god ? 'is-on' : ''}" data-act="dc-god" data-god="${x.god}" aria-pressed="${x.god === god}">
    <img src="${esc(artOf(`god-${x.god}`, 'sm') || '')}" alt=""><b>${x.name}</b>${tried.includes(x.god) ? '<small>Tried</small>' : ''}</button>`;
  const list = deck && showCards ? `<ul class="dc-list">${deck.main_deck.map(e => `<li><button data-act="show-card" data-id="${esc(e.card_id)}"><b>${e.quantity}×</b> ${esc(name(e.card_id))}</button></li>`).join('')}</ul>` : '';
  const panel = deck ? `<article class="dc-panel">
      <div class="dc-star"><span class="kv-stamp kv-stamp--gold">Star card</span>${face(deck.alto_escalao)}</div>
      <div class="dc-info">
        <h2>${esc(deck.nome)}</h2>
        <p class="dc-tags"><span>${g.level}</span><span>${g.style}</span></p>
        <h3 class="kv-stamp">This deck teaches</h3><p>${g.teaches}</p>
        <div class="dc-actions"><button class="kv-button" data-act="dc-train">Train against the AI</button><button class="kv-ghost" data-act="dc-cards" aria-expanded="${!!showCards}">${showCards ? 'Hide the cards' : 'See the cards'}</button></div>
        ${list}
      </div></article>` : '<p class="dc-hint">Choose a God above to meet the deck.</p>';
  return `<section class="dc">
    <header class="dc-head"><h1>Discover your Cosmo</h1><p>Five paths are already yours. Try as many as you like.</p></header>
    <div class="dc-marin"><img src="./divine/assets/marin/${g ? '05_explicando' : '02_saudacao'}.webp" alt="Marin"><p role="status">${g ? g.line : OPENING}</p></div>
    <nav class="dc-gods">${GODS.map(tab).join('')}</nav>
    ${panel}
    <button class="kv-ghost dc-home" data-act="dc-home">Go to the home screen</button>
  </section>`;
}
