// Ranking e XP do Olympus Arena (docs/ranking-xp.md, aprovado em 31/10/2026). O sanctuary-api calcula rank e XP;
// aqui só se desenha: selo na barra do lobby, painel de rank e o resumo animado no fim da partida.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const TIERS = ['Steel', 'Iron', 'Bronze', 'Silver', 'Gold', 'Kamui'];
const CACHE = 'sstcg.rank.v1'; // último rank visto: base do "antes → depois" no fim da partida
const PIPS = 6;

// Lendas (autor, 31/10/2026): nome em dourado, como os devs no MTG Arena. Usernames são únicos (índice users_username).
const LEGENDS = new Set(['lierson']);
export const playerName = name => {
  const legend = LEGENDS.has(String(name ?? '').split('#')[0].trim().toLowerCase());
  return legend ? `<span class="is-legend" title="Legend">${esc(name)}</span>` : esc(name);
};
export const rankName = r => r.tier === 'Kamui' ? 'Kamui' : `${r.tier} ${ROMAN[r.division]}`;
// Símbolos do autor (LOGO/SSTCG_Ranked_Transparent_PNG.zip): emblema do tier; a divisão vai no texto.
// Os escudos de divisão do zip vieram cortados com pedaços dos vizinhos; voltam quando chegarem recortados certo.
const art = name => new URL(`./assets/rank/${name}.webp`, import.meta.url).href;
const emblem = (r, big) => `<img class="rk-emblem ${big ? 'rk-emblem--big' : ''}" src="${art(r.tier === 'Kamui' ? 'kamui' : `${r.tier.toLowerCase()}-emblem`)}" alt="" draggable="false">`;
const pips = r => r.tier === 'Kamui' ? `<span class="rk-points">${r.points} pts</span>`
  : `<span class="rk-pips rk-${r.tier.toLowerCase()}" aria-label="${r.pips} of ${PIPS} pips">${Array.from({length: PIPS}, (_, i) => `<i class="${i < r.pips ? 'on' : ''}"></i>`).join('')}</span>`;
const xpBar = r => `<span class="rk-xp" aria-label="${r.xp_in_level} of ${r.xp_level_size} XP"><i style="width:${100 * r.xp_in_level / r.xp_level_size}%"></i></span>`;
const order = r => TIERS.indexOf(r.tier) * 10 - (r.division || 0);

const remember = r => { try { localStorage.setItem(CACHE, JSON.stringify(r)); } catch { /* sem armazenamento: só perde a animação */ } };
const cached = () => { try { return JSON.parse(localStorage.getItem(CACHE)); } catch { return null; } };
async function call(path, method = 'GET', body) {
  const r = await fetch(path, {method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {}, body: body && JSON.stringify(body)});
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

// Lobby: busca o rank (sem conta ou sem API, devolve null e o lobby segue sem selo).
export async function loadRank() {
  try { const r = await call('/api/rank'); remember(r); return r; } catch { return null; }
}

// Perfil de jogador (lobby): emblema, rank, pips e nível.
export const rankSummary = r => `<div class="rk-summary">${emblem(r, true)}<div><b>${esc(rankName(r))}</b>${pips(r)}
  <small>Level ${r.level}${r.title ? ` · ${esc(r.title)}` : ''}</small></div></div>`;

export const rankBadge = r => `<button class="rk-badge" data-act="rank" aria-label="Rank ${esc(rankName(r))}, level ${r.level}">
  ${emblem(r)}<span><b>${esc(rankName(r))}</b><small>Lv ${r.level}</small></span></button>`;

export function openRankPanel(r, opener) {
  const dlg = document.createElement('dialog');
  dlg.className = 'rk-panel kv-card';
  dlg.setAttribute('aria-label', 'Rank');
  const ends = new Date(r.season_ends * 1000).toLocaleDateString('en', {day: 'numeric', month: 'short'});
  dlg.innerHTML = `<header class="rk-panel__head"><p class="kv-stamp kv-stamp--gold">Season ${esc(r.season)} · ends ${ends}</p>
      <button class="kv-ghost" data-close autofocus>Close</button></header>
    <section class="rk-panel__rank">${emblem(r, true)}<div><h2>${esc(rankName(r))}</h2>${pips(r)}
      ${r.best ? `<p class="kv-stamp">Best this season · ${esc(rankName(r.best))}</p>` : ''}
      ${r.last_season ? `<p class="kv-stamp">Last season · ${esc(rankName(r.last_season))}</p>` : ''}</div></section>
    <section class="rk-panel__level"><h3 class="kv-stamp">Level ${r.level}${r.title ? ` · ${esc(r.title)}` : ''}</h3>${xpBar(r)}
      <p class="kv-status">${r.xp_in_level} / ${r.xp_level_size} XP · vs AI today ${r.ai_xp_today} / ${r.ai_xp_cap} XP</p></section>
    <p class="kv-status">Rank moves only in online duels. Matches vs the AI give XP.</p>
    <h3 class="rk-board__head"><img src="${art('kamui-top20')}" alt="Kamui · Top 20"></h3>
    ${r.kamui?.length ? `<ol class="rk-board">${r.kamui.map(k => `<li><b>${playerName(k.username)}</b><span>${k.points} pts</span></li>`).join('')}</ol>` : '<p class="kv-status">No one has reached Kamui yet.</p>'}`;
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => { dlg.remove(); opener?.focus?.(); });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
}

// Fim da partida (Olympus Arena): IA manda o resultado e ganha só XP; online espera o servidor fechar o duelo.
let done = false;
export async function rankAfterMatch({victory, me, online}) {
  if (done || !me) return;
  done = true;
  const result = victory.draw ? 'draw' : victory.winner === me ? 'win' : 'loss';
  try {
    const before = cached() || await call('/api/rank');
    let after;
    if (!online) after = await call('/api/xp/ai', 'POST', {result});
    else for (let i = 0; i < 5; i++) { // o duelo entra no rank quando o arena-server confirma o resultado
      after = await call('/api/rank');
      if (after.xp !== before.xp) break;
      await new Promise(ok => setTimeout(ok, 1500));
    }
    remember(after);
    showResult(before, after, online);
  } catch { /* sem conta ou sem API (dev local): partida segue sem resumo de rank */ }
}

function showResult(before, after, online) {
  const gained = after.xp - before.xp, up = order(after) > order(before), down = order(after) < order(before);
  const box = document.createElement('aside');
  box.className = 'rk-result';
  box.setAttribute('role', 'status');
  box.innerHTML = `${online ? `<div class="rk-result__rank">${emblem(before)}<div><b>${esc(rankName(before))}</b>${pips(before)}</div></div>` : ''}
    <div class="rk-result__xp"><b>+${gained} XP</b><span class="rk-result__lv">Level ${before.level}</span>${xpBar(before)}</div>
    <button class="rk-result__x" aria-label="Close">×</button>`;
  document.body.append(box);
  box.querySelector('.rk-result__x').onclick = () => box.remove();
  // Um quadro depois troca para o estado novo: as transições do CSS animam pips e barra de XP.
  setTimeout(() => {
    if (online) box.querySelector('.rk-result__rank').innerHTML = `${emblem(after)}<div><b>${esc(rankName(after))}</b>${pips(after)}
      ${up ? `<p class="rk-result__promo">Promoted to ${esc(rankName(after))}!</p>` : down ? '<p class="rk-result__drop">Division lost</p>' : ''}</div>`;
    const xp = box.querySelector('.rk-result__xp');
    xp.querySelector('.rk-result__lv').textContent = after.level > before.level ? `Level up! Level ${after.level}${after.title ? ` · ${after.title}` : ''}` : `Level ${after.level}`;
    xp.querySelector('.rk-xp i').style.width = `${after.level > before.level ? 100 : 100 * after.xp_in_level / after.xp_level_size}%`;
    if (!online && !gained) xp.querySelector('b').textContent = 'Daily AI XP limit reached';
  }, 900);
}

// Placas da mesa (pedido do autor, 31/10/2026): canto direito, adversário em cima, eu embaixo; nome + selo do rank.
// players: {A: username, B: username} no online; contra a IA só o meu lado tem conta.
export async function mountNameplates({online, players, you}) {
  if (document.querySelector('.rk-plate')) return;
  const [me, mine] = await Promise.all([call('/api/me').catch(() => null), call('/api/rank').catch(() => cached())]);
  const foeName = online ? players?.[Object.keys(players).find(k => k !== you)] : null;
  const foe = foeName ? await call(`/api/profile/${encodeURIComponent(foeName)}`).catch(() => null) : null;
  const plate = (side, name, r) => `<aside class="rk-plate rk-plate--${side}" aria-label="${side === 'me' ? 'You' : 'Opponent'}: ${esc(name)}${r ? `, ${esc(rankName(r))}` : ''}">
    ${r ? emblem(r) : ''}<span><b>${playerName(name)}</b>${r ? `<small>${esc(rankName(r))} · Lv ${r.level}</small>` : ''}</span></aside>`;
  document.body.insertAdjacentHTML('beforeend', plate('foe', foe?.username || foeName || 'AI Opponent', foe?.rank)
    + (me ? plate('me', me.username, mine) : ''));
}
