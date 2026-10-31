// Home vitrine (autor, 31/10/2026, estilo MTG Arena): abaixo do carrossel, um bloco para cada feature do jogo,
// com arte do próprio jogo e informação ao vivo do jogador. PLAY continua sendo a ação principal (dock à direita).
import {PACK_ART} from './economy.js?v=20261031-live3';
import {rankName, rankEmblem} from './rank.js?v=20261031-8';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');

// Cada bloco: ação (data-act/data-screen ou link), arte, rótulo, título, linha e um selo ao vivo (ou null).
// `art(id)` devolve a arte de uma carta (artOf do lobby); `total` = cartas jogáveis (sem Gods).
export function featureGrid({user, econ, rank, online = 0, total = 0, art}) {
  const owned = econ ? (econ.full_access ? total : Object.keys(econ.collection).length) : 0;
  const tiles = [
    {act: 'data-act="go" data-screen="store"', bg: PACK_ART, tag: 'Store', title: 'Boosters',
      line: '14 cards per booster. Divine in about 1 of 8.',
      live: econ && (econ.boosters ? `${econ.boosters} to open` : `${fmt(econ.coins)} coins`), hot: !!econ?.boosters},
    {act: 'data-act="go" data-screen="collection"', bg: art('god-poseidon'), tag: 'Collection', title: 'Your cards',
      line: 'Every card you own, and the ones still missing.', live: econ && `${owned} / ${total}`},
    {act: 'data-act="rank"', bg: art('god-ares'), tag: `Season ${esc(rank?.season || '')}`, title: 'Ranked',
      line: 'Climb from Steel to Kamui in online duels.', live: rank && rankName(rank), emblem: rank && rankEmblem(rank), need: !rank},
    {act: 'data-act="my-profile"', bg: art('god-athena'), tag: 'Profile', title: 'Achievements',
      line: 'Level up and unlock titles as you play.', live: rank && `Level ${rank.level}${rank.title ? ` · ${esc(rank.title)}` : ''}`, need: !user?.complete},
    {act: 'data-act="friends"', bg: art('god-hades'), tag: 'Online', title: 'Duel a friend',
      line: 'Add friends by code, chat and challenge them.', live: user?.complete && `${online} online`, hot: online > 0, need: !user?.complete},
    {act: 'data-act="go" data-screen="decks"', bg: art('god-artemis'), tag: 'Decks', title: 'Deck builder',
      line: 'Build 60 cards around your God.', live: null},
    {href: '/how-to-play/', bg: art('athena-v6-001'), tag: 'Learn', title: 'How to play', line: 'Rules, turns and keywords in 5 minutes.', live: null},
    {href: '/download/', bg: art('neutral-v6-451'), tag: 'Desktop', title: 'Get the app', line: 'Play on Windows and Mac.', live: null},
  ];
  // Sem conta: blocos que dependem dela levam ao login.
  const open = t => t.href ? `href="${t.href}"` : t.need ? 'href="/login/?v=3&next=/playtest/"' : '';
  return `<section class="lb-features" aria-label="Game features">${tiles.map(t => {
    const tag = t.href || t.need ? 'a' : 'button';
    return `<${tag} class="lb-feat ${t.hot ? 'is-hot' : ''}" ${tag === 'a' ? open(t) : t.act} style="--feat:url('${t.bg || ''}')">
      ${t.emblem ? `<span class="lb-feat__emblem">${t.emblem}</span>` : ''}
      <small>${t.tag}</small><strong>${t.title}</strong><span>${t.line}</span>
      ${t.live ? `<b class="lb-feat__live">${t.live}</b>` : ''}</${tag}>`;
  }).join('')}</section>`;
}
