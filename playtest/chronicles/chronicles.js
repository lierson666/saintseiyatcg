// Cosmo Chronicles V0.1 (autor, 11/11/2026): mapa da saga, cenas, preparação e desfecho da missão.
// A batalha é a partida normal (../divine/?chronicle=ID); quem decide o vencedor é a engine. Progresso fica na conta (/api/me).
// Texto da interface em inglês (shared/i18n-pt.js traduz); falas da história vêm em {pt, en} dos dados da missão.
import {lightArt} from '../../shared/light-art.js?v=20261102-art1';

const DATA = '../../data/chronicles/', ART = '../../card-forge/art-web/', MARIN = '../divine/assets/marin/';
const POSES = {idle: '01_idle', wave: '02_saudacao', point: '03_apontar_direita', explain: '05_explicando', confident: '06_confianca', tip: '07_dica', good: '09_aprovacao', cheer: '10_vitoria'};
const CC_RESULT = 'cc-result', ccSave = id => `cc-save-${id}`;
const root = document.getElementById('cc');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const lang = () => (window.ssI18n?.lang === 'pt' ? 'pt' : 'en');
const L = v => (v && typeof v === 'object' ? v[lang()] ?? v.en : v ?? '');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Dentro do lobby (?embed=1): o menu do jogo fica por cima; links que saem da página (batalha) trocam o lobby, não só o quadro.
const EMBED = new URLSearchParams(location.search).get('embed') === '1' && parent !== window;
// Aberto direto (sem o lobby): volta para dentro do lobby, que mostra o menu do jogo fixo por cima (autor, 11/11/2026).
if (!EMBED && parent === window) location.replace(`/playtest/?story=${encodeURIComponent(location.hash.slice(1) || 'map')}`);
if (EMBED) {
  document.documentElement.classList.add('cc-embed');
  document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) { e.preventDefault(); parent.location.href = a.href; } });
}

const getJSON = url => fetch(url, {credentials: 'same-origin'}).then(r => (r.ok ? r.json() : Promise.reject(Error(`${r.status} ${url}`))));
const [saga, forgeList, sagaIndex] = await Promise.all([getJSON(`${DATA}saga-01.json`), getJSON(`${ART}cards.json`).catch(() => ({cartas: []})), getJSON(`${DATA}sagas.json`).catch(() => ({sagas: []}))]);
const forge = new Map(forgeList.cartas.map(c => [c.id, c]));
const art = (id, size) => { const f = forge.get(id); return f?.ilustracao ? lightArt(ART + f.ilustracao, size) : ''; };
const cardName = id => { const f = forge.get(id); return (lang() === 'pt' && f?.nome_exibicao_pt) || f?.nome_exibicao_en || id; };
const missions = new Map(), mission = async id => missions.get(id) || missions.set(id, Promise.all([getJSON(`${DATA}${id}.json`), getJSON(`${DATA}${id}.dialogues.json`)])).get(id);
const allMissions = saga.chapters.flatMap(c => c.missions.map(m => ({...m, chapter: c.n})));

// ---------- Conta ----------
let me = null; // null: sem login (joga, mas não salva)
const loadMe = () => getJSON('/api/me').then(u => { me = u; }).catch(() => { me = null; });
const completed = () => new Set(me?.chronicles?.completed || []);
const statusOf = m => (completed().has(m.id) ? 'done' : m.status !== 'ready' ? 'soon' : (m.requires || []).every(r => completed().has(r)) ? 'ready' : 'locked');
async function saveWin(id) { // só acrescenta; o servidor recusa ID desconhecido e nunca apaga missão concluída
  if (!me) return false;
  const r = await fetch('/api/me', {method: 'PATCH', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({chronicles: {completed: [...completed(), id]}})});
  if (!r.ok) return false;
  me = await r.json();
  lastReward = me.chronicle_rewards?.find(x => x.mission === id) || null; // prêmio da 1ª vitória, pago pelo servidor
  return completed().has(id);
}
let lastReward = null;
// Prêmio na tela (o servidor é quem paga: 250 coins + 1 booster; chefe 3 boosters, só na 1ª vitória).
const prize = r => r ? L({pt: `${r.boosters} booster${r.boosters > 1 ? 's' : ''} + ${r.coins} Cosmo Coins`, en: `${r.boosters} booster${r.boosters > 1 ? 's' : ''} + ${r.coins} Cosmo Coins`}) : '';
const hasSave = id => { try { return !!localStorage.getItem(ccSave(id)); } catch { return false; } };

// ---------- Telas ----------
// Fundo temático da página: arte da saga no mapa, do capítulo nas telas da missão (autor, 11/11/2026).
const setBg = id => document.documentElement.style.setProperty('--cc-bg', id && art(id) ? `url('${art(id)}')` : 'none');
function show(html, cls) {
  root.className = `cc-view ${cls}`;
  root.innerHTML = html;
  if (!reduced) { root.classList.add('is-entering'); void root.offsetWidth; root.classList.remove('is-entering'); } // reflow: a transição roda sem depender de requestAnimationFrame
  root.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
  root.querySelector('h1, h2')?.focus({preventScroll: true});
  scrollTo(0, 0);
}

// Mapa em abas: uma aba por saga (autor, 11/11/2026). Cada saga tem um roadmap em forma de constelação sobre a arte da saga.
const sagaStops = s => s.id === saga.id
  ? saga.chapters.flatMap(c => [{kind: 'chapter', c}, ...c.missions.map(m => ({kind: 'mission', m}))])
  : s.chapters.map(c => ({kind: 'chapter', c, soon: true})); // saga futura: só os capítulos, todos Em breve
function roadmap(s) {
  const stops = [...sagaStops(s), {kind: 'end'}], H = {chapter: 130, mission: 168, end: 200}, pts = [];
  let y = 40, k = 0;
  const items = stops.map(st => {
    const h = H[st.kind], cy = y + h / 2; y += h;
    const x = st.kind !== 'mission' ? 50 : 50 + 28 * Math.sin(k++ * 1.15 + .6); // serpenteia entre 22% e 78%
    pts.push({x, y: cy, st});
    return {st, x, cy};
  });
  const total = y + 40;
  const seg = (a, b) => `C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
  const path = list => list.length > 1 ? `M${list[0].x} ${list[0].y}` + list.slice(1).map((p, i) => seg(list[i], p)).join('') : '';
  const lastLit = pts.reduce((n, p, i) => (p.st.kind === 'mission' && ['done', 'ready'].includes(statusOf(p.st.m)) ? i : n), -1);
  const lit = path(pts.slice(0, lastLit + 1)), rest = path(pts.slice(Math.max(lastLit, 0)));
  const node = ({st, x, cy}) => {
    if (st.kind === 'end') { const all = s.id === saga.id && allMissions.every(m => statusOf(m) === 'done');
      return `<li class="cc-road__end${all ? ' is-done' : ''}" style="top:${cy}px"><span class="cc-road__seal" style="--art:url('${art(s.art, 'thumb')}')" aria-hidden="true"></span><span class="kv-stamp kv-stamp--gold" translate="no">${L(all ? {pt: 'Saga concluída', en: 'Saga complete'} : {pt: 'Fim da saga', en: 'End of the saga'})}</span></li>`; }
    if (st.kind === 'chapter') return `<li class="cc-road__chapter${st.soon ? ' is-soon' : ''}" style="top:${cy}px;--art:url('${art(st.c.art || s.art, 'thumb')}')">
      <span class="kv-stamp">Chapter ${String(st.c.n).padStart(2, '0')}</span><strong translate="no">${esc(L(st.c.title))}</strong>${st.soon ? '<span class="cc-tile__st kv-stamp">Coming soon</span>' : ''}</li>`;
    const m = st.m, sts = statusOf(m), label = {done: 'Completed', ready: 'Play', locked: 'Locked', soon: 'Coming soon'}[sts];
    const inner = `<span class="cc-node__disc" style="--art:url('${art(m.art, 'thumb')}')" aria-hidden="true">${sts === 'done' ? '<i>✓</i>' : ''}</span>
      <span class="cc-node__txt"><span class="cc-tile__num">${m.id.replace('-', '.')}${m.boss ? `<span class="cc-node__boss" translate="no">${L({pt: 'Chefe', en: 'Boss'})}</span>` : ''}</span><strong translate="no">${esc(L(m.title))}</strong><span class="cc-tile__st kv-stamp ${sts === 'done' || sts === 'ready' ? 'kv-stamp--gold' : ''}">${label}</span></span>`;
    const cls = `cc-node is-${sts} ${x > 50 ? 'is-right' : 'is-left'}`, pos = `style="left:${x}%;top:${cy}px"`;
    return `<li class="cc-road__stop" ${pos}>${sts === 'done' || sts === 'ready' ? `<a class="${cls}" href="#m/${m.id}">${inner}</a>` : `<div class="${cls}" aria-disabled="true">${inner}</div>`}</li>`;
  };
  return `<section class="cc-road" style="--art:url('${art(s.art)}');height:${total}px" aria-label="${L({pt: 'Caminho da saga', en: 'Saga roadmap'})}">
    <svg class="cc-road__line" viewBox="0 0 100 ${total}" preserveAspectRatio="none" aria-hidden="true">
      <path class="is-rest" d="${rest}" vector-effect="non-scaling-stroke"/>${lit ? `<path class="is-lit" d="${lit}" vector-effect="non-scaling-stroke"/>` : ''}</svg>
    <ol>${items.map(node).join('')}</ol></section>`;
}
function mapScreen(sagaId = saga.id) {
  const all = sagaIndex.sagas.length ? sagaIndex.sagas : [saga], s = all.find(x => x.id === sagaId) || all[0], live = s.id === saga.id;
  setBg(s.art);
  const done = completed().size, next = allMissions.find(m => statusOf(m) === 'ready') || allMissions.filter(m => statusOf(m) === 'done').at(-1);
  const meta = x => x.id === saga.id ? L({pt: `${saga.total_missions} missões`, en: `${saga.total_missions} missions`}) : L({pt: 'Em breve', en: 'Coming soon'});
  const tabs = `<div class="cc-tabbar"><button class="cc-tabbar__arrow is-prev" type="button" data-tabs="prev" aria-label="${L({pt: 'Sagas anteriores', en: 'Previous sagas'})}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><nav class="cc-tabs" aria-label="Sagas">${all.map(x => `<a class="cc-tab${x.id === s.id ? ' is-on' : ''}${x.status === 'ready' ? '' : ' is-soon'}" href="#s/${x.id}"${x.id === s.id ? ' aria-current="page"' : ''}>
      <span class="cc-tab__art" style="--art:url('${art(x.art, 'thumb')}')" aria-hidden="true"></span><span class="cc-tab__n">${String(x.n).padStart(2, '0')}</span><span class="cc-tab__body"><span class="cc-tab__t" translate="no">${esc(L(x.title))}</span><span class="cc-tab__meta" translate="no">${x.status === 'ready' ? '' : '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v7h-9z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'}${meta(x)}</span></span></a>`).join('')}</nav><button class="cc-tabbar__arrow is-next" type="button" data-tabs="next" aria-label="${L({pt: 'Próximas sagas', en: 'Next sagas'})}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`;
  show(`${tabs}<header class="cc-hero">
      <p class="kv-stamp kv-stamp--gold">Story mode · Saga ${String(s.n).padStart(2, '0')}</p>
      <h1><span class="kv-lyric" translate="no">${esc(L(s.title))}</span><span class="kv-cosmo cc-anchor">Cosmo Chronicles</span></h1>
      ${live ? `<p class="cc-progress"><b>${done}</b> / ${saga.total_missions} <span>missions completed</span></p>
      ${me ? '' : '<p class="kv-status err">Sign in to save your progress.</p>'}
      ${next ? `<a class="kv-button" href="#m/${next.id}">${done ? 'Continue' : 'Begin the journey'}</a>` : ''}` : `<p class="cc-progress"><span translate="no">${L({pt: 'Em breve. A história desta saga ainda está sendo escrita.', en: 'Coming soon. The story of this saga is still being written.'})}</span></p>`}
    </header>${roadmap(s)}`, 'cc-map');
  const bar = root.querySelector('.cc-tabs'), on = bar.querySelector('.is-on');
  if (on) bar.scrollLeft = on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2; // aba atual no centro, sem rolar a página
  const edges = () => { const end = bar.scrollWidth - bar.clientWidth - 2; root.querySelector('.cc-tabbar').classList.toggle('at-start', bar.scrollLeft <= 2); root.querySelector('.cc-tabbar').classList.toggle('at-end', bar.scrollLeft >= end);
    root.querySelector('[data-tabs="prev"]').disabled = bar.scrollLeft <= 2; root.querySelector('[data-tabs="next"]').disabled = bar.scrollLeft >= end; };
  bar.addEventListener('scroll', edges, {passive: true}); edges();
  root.querySelectorAll('[data-tabs]').forEach(b => b.addEventListener('click', () => bar.scrollBy({left: (b.dataset.tabs === 'next' ? 1 : -1) * bar.clientWidth * .8, behavior: reduced ? 'auto' : 'smooth'})));
}

async function briefing(id) {
  const [m] = await mission(id), st = statusOf(allMissions.find(x => x.id === id) || {id});
  if (st === 'locked' || st === 'soon') return go('');
  const hero = m.characters[m.player.character], foe = m.characters[m.rival.character];
  show(`<article class="cc-brief">
      <div class="cc-versus" aria-hidden="true"><span style="--art:url('${art(hero.card)}')"></span><span style="--art:url('${art(foe.card)}')"></span><b>×</b></div>
      <div class="cc-brief__copy">
        <p class="kv-stamp kv-stamp--gold">Chapter ${String(m.chapter).padStart(2, '0')} · Mission ${String(m.order).padStart(2, '0')}</p>${st === 'done' ? '<p class="kv-stamp kv-stamp--gold"><span aria-hidden="true">✓ </span>Completed</p>' : ''}
        <h1><span class="kv-lyric cc-anchor" translate="no">${esc(L(m.title))}</span></h1>
        <p class="cc-desc" translate="no">${esc(L(m.description))}</p>
        ${m.objective ? `<p class="cc-objective"><b class="kv-stamp kv-stamp--gold">Objective</b> <span translate="no">${esc(L(m.objective))}</span></p>` : ''}${challenge(m)}
        <dl class="cc-facts">
          <div><dt>You play</dt><dd translate="no">${esc(L(hero.name))}</dd></div>
          <div><dt>Opponent</dt><dd translate="no">${esc(L(foe.name))}</dd></div>
          <div><dt>Battle</dt><dd>Real match against the AI</dd></div>
          <div><dt>Level</dt><dd translate="no">${esc(L(m.level))}</dd></div>
          <div><dt>Duration</dt><dd translate="no">${esc(L(m.duration))}</dd></div>
          ${m.reward?.enabled ? `<div class="cc-prize${m.reward.boss ? ' is-boss' : ''}"><dt translate="no">${L(st === 'done' ? {pt: 'Prêmio recebido', en: 'Reward received'} : m.reward.boss ? {pt: 'Prêmio de chefe', en: 'Boss reward'} : {pt: 'Prêmio da 1ª vitória', en: 'First-win reward'})}</dt><dd translate="no">${esc(prize(m.reward))}</dd></div>` : ''}
        </dl>
        <div class="cc-actions">
          <a class="kv-button" href="#m/${id}/story">${st === 'done' ? 'Replay the story' : 'Start'}</a>
          ${hasSave(id) ? `<a class="kv-ghost" href="../divine/?chronicle=${id}&resume=1">Resume battle</a>` : ''}
          <a class="kv-ghost" href="#m/${id}/prep">Skip story</a>
          <a class="kv-ghost" href="#">Saga map</a>
        </div>
      </div></article>`, 'cc-briefing');
}

// Cena: arte da carta de fundo, quem fala em destaque, uma fala por vez (máximo duas frases), voltar e pular.
async function scenes(id, list, after, kind) {
  const [m, d] = await mission(id);
  let i = 0;
  const draw = () => {
    const s = list[i], who = m.characters[s.who] || {}, marin = who.chibi;
    const face = marin ? `<img class="cc-scene__marin" src="${MARIN}${POSES[s.pose] || POSES.idle}.webp?v=1" alt="">` : who.card ? `<span class="cc-scene__card" style="--art:url('${art(who.card)}')" aria-hidden="true"></span>` : '';
    show(`<section class="cc-scene cc-scene--${kind} ${s.who === 'narrator' ? 'is-narration' : ''}" aria-label="Story">
        <div class="cc-scene__bg" style="--art:url('${art(s.art)}')" aria-hidden="true"></div>
        <div class="cc-scene__stage">${face}
          <div class="cc-scene__box kv-card">
            ${s.who === 'narrator' ? '' : `<p class="kv-stamp kv-stamp--gold cc-scene__who" translate="no">${esc(L(who.name))}</p>`}
            <p class="cc-scene__line ${s.who === 'narrator' ? 'kv-lyric' : ''}" translate="no">${esc(L(d.lines[s.line]))}</p>
            <div class="cc-actions">
              <button class="kv-button" data-next>${i < list.length - 1 ? 'Next' : 'Continue'}</button>
              ${i ? '<button class="kv-ghost" data-prev>Back</button>' : ''}
              ${i < list.length - 1 ? '<button class="kv-ghost" data-skip>Skip</button>' : ''}
            </div>
            <p class="cc-scene__count" aria-hidden="true">${i + 1} / ${list.length}</p>
          </div></div></section>`, 'cc-story');
    root.querySelector('[data-next]').focus({preventScroll: true});
  };
  root.onclick = e => {
    if (e.target.closest('[data-next]')) { if (++i < list.length) draw(); else { root.onclick = null; after(); } }
    else if (e.target.closest('[data-prev]')) { i = Math.max(0, i - 1); draw(); }
    else if (e.target.closest('[data-skip]')) { root.onclick = null; after(); }
  };
  draw();
}

async function prep(id) {
  const [m, d] = await mission(id), deck = m.decks.find(x => x.id === m.player.deck), foe = m.characters[m.rival.character];
  const p = m.scenes.prep, mentor = m.characters[p.who] || {}, rivalDeck = m.decks.find(x => x.id === m.rival.deck);
  show(`<section class="cc-prep">
      <header class="cc-prep__head"><p class="kv-stamp kv-stamp--gold">Preparation</p><h1><span class="kv-lyric cc-anchor" translate="no">${esc(L(m.title))}</span></h1></header>
      ${m.objective ? `<p class="cc-objective"><b class="kv-stamp kv-stamp--gold">Objective</b> <span translate="no">${esc(L(m.objective))}</span></p>` : ''}${challenge(m)}
      <div class="cc-mentor">${mentor.chibi ? `<img src="${MARIN}${POSES[p.pose] || POSES.tip}.webp?v=1" alt="">` : `<span class="cc-mentor__card" style="--art:url('${art(mentor.card)}')" aria-hidden="true"></span>`}<p class="kv-card" translate="no"><b class="kv-stamp kv-stamp--gold">${esc(L(mentor.name))}</b>${esc(L(d.lines[p.line]))}</p></div>
      <div class="cc-prep__grid">
        <section class="cc-deck kv-card" aria-label="Your deck">
          <h2>Your deck <small>${deck.main_deck.reduce((n, c) => n + c.quantity, 0)} cards · loaned for this mission</small></h2>
          <ul>${deck.main_deck.map(c => `<li><span class="cc-deck__art" style="--art:url('${art(c.card_id, 'thumb')}')" aria-hidden="true"></span><span class="cc-deck__name" translate="no">${esc(cardName(c.card_id))}</span><b>×${c.quantity}</b></li>`).join('')}</ul>
          <p class="cc-note">Domain: <span translate="no">${esc(cardName(deck.domain_id))}</span></p>
        </section>
        <aside class="cc-foe kv-card" aria-label="Opponent">
          <span class="cc-foe__art" style="--art:url('${art(foe.card)}')" aria-hidden="true"></span>
          <p class="kv-stamp">Opponent</p><h2 translate="no">${esc(L(foe.name))}</h2>
          <p class="cc-note">AI difficulty: ${esc({easy: 'Easy', normal: 'Normal', hard: 'Hard'}[m.rival.ai])}</p>
          <p class="cc-note">Match setup: both sides use the Athena God card. Normal rules, no bonus.</p>
          <p class="cc-note">Domain: <span translate="no">${esc(cardName(rivalDeck.domain_id))}</span></p>
        </aside>
      </div>
      <div class="cc-actions cc-actions--end">
        <a class="kv-button" href="../divine/?chronicle=${id}">Start battle</a>
        <a class="kv-ghost" href="#m/${id}/story">Rewatch the story</a>
        <a class="kv-ghost" href="#m/${id}">Back</a>
      </div></section>`, 'cc-preparation');
}

// Desfecho: só existe se a partida deixou o resultado da engine nesta aba (cc-result). Recarregar não repete o registro.
async function result(id) {
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem(CC_RESULT) || 'null'); sessionStorage.removeItem(CC_RESULT); } catch { /* sem armazenamento */ }
  if (!r || r.mission !== id) return go(`m/${id}`);
  const [m] = await mission(id), win = r.outcome === 'win', missed = r.outcome === 'objective';
  lastReward = null;
  const saved = win ? await saveWin(id).catch(() => false) : false;
  const winScenes = m.scenes.win_with && r.field?.includes(m.scenes.win_with.card) ? m.scenes.win_with.scenes : m.scenes.win; // cena de vitória alternativa (4.5: Shun em campo)
  await scenes(id, win ? winScenes : missed && m.scenes.objective ? m.scenes.objective : m.scenes.lose, () => summary(m, win, saved, r.round, missed, r.bonus, r.held), win ? 'win' : 'lose');
}
// Desafio extra (m.challenge): só informa; não muda resultado nem progresso.
const challenge = m => m.challenge ? `<p class="cc-objective"><b class="kv-stamp kv-stamp--gold">Bonus challenge</b> <span translate="no">${esc(L(m.challenge))}</span></p>` : '';
function summary(m, win, saved, round, missed = false, bonus = null, held = false) {
  const next = allMissions.find(x => x.id === m.next);
  show(`<section class="cc-end kv-card ${win ? 'is-win' : 'is-lose'}">
      <span class="cc-end__art" style="--art:url('${art(win ? m.scenes.win[0].art : m.characters[m.rival.character].card)}')" aria-hidden="true"></span>
      <p class="kv-stamp kv-stamp--gold">${win ? 'Mission complete' : missed ? 'Objective not met' : 'Defeat'}</p>
      <h1><span class="kv-lyric cc-anchor" translate="no">${esc(L(m.title))}</span></h1>
      <p class="cc-desc">${win ? (held === 'objective' ? 'You completed the objective.' : held ? 'You held on until the end.' : 'The engine confirmed your victory.') : missed ? 'You won the match, but the mission asks for more. Try again.' : 'Defeat costs nothing. Your progress is safe.'} <span translate="no">${round ? `· R${round}` : ''}</span></p>
      ${win ? (saved ? '<p class="kv-status ok">Progress saved to your account.</p>' : me ? '<p class="kv-status err">Could not save. Your victory will count when you win again.</p>' : '<p class="kv-status err">Sign in to save your progress.</p>') : ''}
      ${win && lastReward ? `<p class="cc-prize-won"><span class="kv-stamp kv-stamp--gold" translate="no">${L(lastReward.boosters > 1 ? {pt: 'Prêmio de chefe', en: 'Boss reward'} : {pt: 'Prêmio', en: 'Reward'})}</span> <b translate="no">+ ${esc(prize(lastReward))}</b></p>` : ''}
      ${win && m.challenge && bonus != null ? `<p class="kv-status ${bonus ? 'ok' : 'err'}">${bonus ? 'Challenge met:' : 'Challenge not met:'} <span translate="no">${esc(L(m.challenge))}</span></p>` : ''}
      ${win && next ? `<p class="cc-next">Next: <b translate="no">${next.id.replace('-', '.')} · ${esc(L(next.title))}</b> <span>${statusOf(next) === 'soon' ? '(coming soon)' : ''}</span></p>` : ''}
      <div class="cc-actions">
        ${win ? '<a class="kv-button" href="#">Saga map</a>' : `<a class="kv-button" href="../divine/?chronicle=${m.id}">Try again</a>`}
        <a class="kv-ghost" href="#m/${m.id}/story">Rewatch the story</a>
        ${win ? `<a class="kv-ghost" href="../divine/?chronicle=${m.id}">Play again</a>` : '<a class="kv-ghost" href="#">Saga map</a>'}
      </div></section>`, 'cc-outcome');
}

// ---------- Rotas (#m/1-2, #m/1-2/story, #m/1-2/prep, #m/1-2/result) ----------
const go = h => { location.hash = h; };
async function route() {
  root.onclick = null;
  const [, id, step] = location.hash.match(/^#m\/(\d+-\d+)(?:\/(\w+))?/) || [];
  setBg(id ? saga.chapters.find(c => c.missions.some(m => m.id === id))?.art : saga.art);
  const sagaTab = location.hash.match(/^#s\/([\w-]+)/)?.[1];
  if (sagaTab) return mapScreen(sagaTab);
  if (!id || !allMissions.some(x => x.id === id)) return mapScreen();
  if (step === 'story') { const [m] = await mission(id); return scenes(id, m.scenes.intro, () => go(`m/${id}/prep`), 'intro'); }
  if (step === 'prep') return prep(id);
  if (step === 'result') return result(id);
  return briefing(id);
}
const navH = () => document.documentElement.style.setProperty('--nav-h', `${document.querySelector('.cc-nav').offsetHeight}px`); // cena ocupa a tela abaixo da barra
navH(); addEventListener('resize', navH);
addEventListener('hashchange', route);
addEventListener('ss-lang', route);
addEventListener('keydown', e => { if (e.key === 'Escape' && root.querySelector('[data-skip]')) root.querySelector('[data-skip]').click(); });
await loadMe();
route();
