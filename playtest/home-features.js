// Home estilo MTG Arena (autor, 31/10/2026: "não precisa desse exagero"): embaixo do carrossel, só a trilha de progresso
// do jogador — nível, XP contra a IA hoje, rank e boosters para abrir —, cada marco clicável. PLAY fica no canto direito.
import {PACK_ART} from './economy.js?v=20261031-face2';
import {rankName, rankEmblem} from './rank.js?v=20261031-face2';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en');
const pct = (a, b) => Math.max(0, Math.min(100, b ? 100 * a / b : 0));
// Anel de progresso: o miolo mostra o marco; em cima, a contagem (como o "0/15" do Arena); embaixo, o nome.
const ring = (value, inner) => `<span class="lb-mark__ring" style="--p:${value}%">${inner}</span>`;

export function progressTrack({user, econ, rank}) {
  if (!user) return `<nav class="lb-track lb-track--guest" aria-label="Progress"><a class="lb-mark" href="/login/?v=3&next=/playtest/">
    ${ring(0, '<b>?</b>')}<span class="lb-mark__label">Sign in to track your progress</span></a></nav>`;
  const marks = [];
  if (rank) {
    marks.push(`<button class="lb-mark" data-act="rank" aria-label="Level ${rank.level}, ${rank.xp_in_level} of ${rank.xp_level_size} XP">
      <span class="lb-mark__count">${fmt(rank.xp_in_level)} / ${fmt(rank.xp_level_size)}</span>${ring(pct(rank.xp_in_level, rank.xp_level_size), `<b>${rank.level}</b>`)}
      <span class="lb-mark__label">Level${rank.title ? ` · ${esc(rank.title)}` : ''}</span></button>`);
    marks.push(`<button class="lb-mark" data-act="rank" aria-label="${rank.ai_xp_today} of ${rank.ai_xp_cap} XP against the AI today">
      <span class="lb-mark__count">${fmt(rank.ai_xp_today)} / ${fmt(rank.ai_xp_cap)}</span>${ring(pct(rank.ai_xp_today, rank.ai_xp_cap), '<b class="lb-mark__xp">XP</b>')}
      <span class="lb-mark__label">vs AI today</span></button>`);
    marks.push(`<button class="lb-mark lb-mark--rank" data-act="rank" aria-label="Rank ${esc(rankName(rank))}">
      <span class="lb-mark__count">Season ${esc(rank.season || '')}</span><span class="lb-mark__ring lb-mark__ring--plain">${rankEmblem(rank)}</span>
      <span class="lb-mark__label">${esc(rankName(rank))}</span></button>`);
  }
  if (econ) marks.push(`<button class="lb-mark ${econ.boosters ? 'is-hot' : ''}" data-act="go" data-screen="store" aria-label="${econ.boosters} boosters to open">
      <span class="lb-mark__count">${econ.boosters ? `${econ.boosters} to open` : `${fmt(econ.coins)} coins`}</span>
      <span class="lb-mark__ring lb-mark__ring--plain"><img class="lb-mark__pack" src="${PACK_ART}" alt=""></span>
      <span class="lb-mark__label">Boosters</span></button>`);
  return `<nav class="lb-track" aria-label="Your progress">${marks.join('')}</nav>`;
}
