// COSMO CHRONICLES FORGE (autor, 11/11/2026): painel do modo história no STAR HILL.
// Visão da saga (capítulos, missões, pendências) e, por missão, um storyboard: abertura → preparação → combate → desfecho,
// com o editor da cena escolhida ao lado. Também edita dados, personagens, dicas e decks emprestados.
// Grava pelo /api/star-hill/chronicles, que confere a revisão, valida e guarda a versão anterior em star-hill/historico/chronicles/.
import {loadCanon} from '../shared/canon-cards.js';
import {addPreviewCards} from '../shared/preview-cards.js';
import {canonIndex, validateDeck} from '../shared/deck-v3.js';
import {lightArt} from '../shared/light-art.js?v=20261102-art1';

const ART = '../card-forge/art-web/', MARIN = '../playtest/divine/assets/marin/';
const POSES = {idle: '01_idle', wave: '02_saudacao', point: '03_apontar_direita', explain: '05_explicando', confident: '06_confianca', tip: '07_dica', good: '09_aprovacao', cheer: '10_vitoria'};
const POSE_PT = {idle: 'Parada', wave: 'Acenando', point: 'Apontando', explain: 'Explicando', confident: 'Confiante', tip: 'Dica', good: 'Aprovando', cheer: 'Comemorando'};
const ACTS = [['intro', 'Abertura', 'Antes da luta'], ['prep', 'Preparação', 'O mentor orienta'], ['fight', 'Combate', 'A partida'], ['win', 'Vitória', 'Desfecho'], ['lose', 'Derrota', 'Desfecho']];
const TABS = {historia: 'História', combate: 'Combate e dicas', decks: 'Decks', dados: 'Dados e personagens'};
const DECK_ERR = {size: 'não tem 50 cartas', copies: 'passa de 3 cópias', domain: 'Domínio inválido', unknown: 'carta desconhecida', god: 'Deus inválido'};
const AI_PT = {easy: 'Fácil', normal: 'Normal', hard: 'Difícil'};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const json = u => fetch(u, {cache: 'no-store'}).then(r => (r.ok ? r.json() : Promise.reject(Error(`${r.status} ${u}`))));
const sentences = t => (String(t).trim().match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).filter(s => s.trim()).length;
const num = id => id.replace('-', '.');

let api, notice, host, saga, sagas = [], store = {}, drafts = {}, forge = new Map(), index, preview = '../playtest/chronicles/';
let current = null, tab = 'historia', pick = {kind: 'intro', i: 0};

const art = (id, size = 'thumb') => { const f = forge.get(id); return f?.ilustracao ? lightArt(ART + f.ilustracao, size) : ''; };
const provisional = id => /-ref\b/.test(forge.get(id)?.ilustracao || '');
const cardName = id => { const f = forge.get(id); return f ? f.nome_exibicao_pt || f.nome_exibicao_en || id : id || '—'; };
const draft = () => drafts[current];
const dirty = id => JSON.stringify(drafts[id]) !== JSON.stringify({mission: store[id].mission, dialogues: store[id].dialogues});
const get = (o, path) => path.reduce((v, k) => v?.[k], o);
function set(o, path, value) { const last = path.at(-1); const parent = path.slice(0, -1).reduce((v, k) => (v[k] ??= typeof k === 'number' ? [] : {}), o); parent[last] = value; }
const bind = (path, extra = '') => `data-bind='${esc(JSON.stringify(path))}' ${extra}`;
const chars = () => draft().mission.characters;
const charOptions = () => Object.fromEntries(Object.entries(chars()).map(([k, c]) => [k, c.name?.pt || k]));
const newKey = base => { let n = 1; const lines = draft().dialogues.lines; while (lines[`${base}_${n}`]) n++; return `${base}_${n}`; };

// ---------- Campos ----------
const input = (path, label, {area = false} = {}) => {
  const v = get(draft(), path) ?? '';
  return `<label class="field">${esc(label)}${area ? `<textarea rows="2" ${bind(path)}>${esc(v)}</textarea>` : `<input ${bind(path)} value="${esc(v)}">`}</label>`;
};
const pair = (path, label, opts = {}) => `<div class="cf-pair">${input([...path, 'pt'], `${label} · PT`, opts)}${input([...path, 'en'], `${label} · EN`, opts)}</div>`;
const select = (path, label, options, {empty = ''} = {}) => {
  const v = get(draft(), path) ?? '';
  return `<label class="field">${esc(label)}<select ${bind(path)}>${empty ? `<option value="">${esc(empty)}</option>` : ''}${Object.entries(options).map(([k, t]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
};
// Arte: busca por ID ou nome, mais atalhos com as cartas que a missão já usa (um clique).
function cardInput(path, label, {quick = false} = {}) {
  const id = get(draft(), path) ?? '';
  const used = quick ? [...new Set([...Object.values(chars()).map(c => c.card), ...['intro', 'win', 'lose', 'objective'].flatMap(k => (draft().mission.scenes[k] || []).map(s => s.art))].filter(Boolean))] : [];
  return `<div class="field"><span>${esc(label)}</span><span class="cf-card"><img src="${esc(art(id))}" alt=""><input list="cf-cards" aria-label="${esc(label)}" ${bind(path, 'data-card')} value="${esc(id)}"></span>
    <small>${esc(cardName(id))}${provisional(id) ? ' · <b class="cf-warn">arte provisória</b>' : ''}</small>
    ${used.length ? `<div class="cf-quick" aria-label="Cartas desta missão">${used.map(u => `<button type="button" class="cf-quick__btn" data-act="pick-art" data-path='${esc(JSON.stringify(path))}' data-card="${esc(u)}" aria-pressed="${u === id}" title="${esc(cardName(u))}"><img src="${esc(art(u))}" alt="${esc(cardName(u))}"></button>`).join('')}</div>` : ''}</div>`;
}
const lineFields = (key, label = 'Fala') => {
  const line = draft().dialogues.lines[key] || {pt: '', en: ''};
  return `<div class="cf-pair">${['pt', 'en'].map(l => `<label class="field">${esc(label)} · ${l.toUpperCase()}<textarea rows="3" ${bind(['dialogues', 'lines', key, l])}>${esc(line[l])}</textarea>${sentences(line[l]) > 2 ? '<small class="cf-warn">Mais de duas frases.</small>' : ''}</label>`).join('')}</div>`;
};

// ---------- Pendências ----------
function issues(d) {
  const out = [], lines = d.dialogues.lines, m = d.mission;
  for (const [k, l] of Object.entries(lines)) {
    if (!l.pt?.trim() || !l.en?.trim()) out.push(`Fala ${k} sem ${!l.pt?.trim() ? 'PT' : 'EN'}`);
    else if (sentences(l.pt) > 2 || sentences(l.en) > 2) out.push(`Fala ${k} com mais de duas frases`);
  }
  const arts = new Set([...['intro', 'win', 'lose', 'objective'].flatMap(k => (m.scenes[k] || []).map(s => s.art)), ...Object.values(m.characters).map(c => c.card).filter(Boolean)]);
  for (const a of arts) if (provisional(a)) out.push(`Arte provisória: ${cardName(a)}`);
  if (index) for (const deck of m.decks) if (validateDeck(deck, index).length) out.push(`Deck ${deck.id} inválido`);
  return out;
}

// ---------- Visão da saga ----------
function overview() {
  const ready = Object.keys(store), all = saga.chapters.flatMap(c => c.missions);
  const pend = ready.reduce((n, id) => n + issues(drafts[id]).length, 0);
  const lines = ready.reduce((n, id) => n + Object.keys(drafts[id].dialogues.lines).length, 0);
  const card = m => {
    if (!store[m.id]) return `<div class="cf-mcard is-soon" aria-disabled="true"><span class="cf-mcard__art" style="background-image:url('${esc(art(m.art))}')"></span><span class="cf-mcard__num">${num(m.id)}</span><strong>${esc(m.title.pt)}</strong><span class="tag">Em breve</span></div>`;
    const d = drafts[m.id], n = issues(d).length, sc = ['intro', 'win', 'lose'].reduce((a, k) => a + (d.mission.scenes[k] || []).length, 0);
    return `<button class="cf-mcard" data-act="open" data-id="${m.id}"><span class="cf-mcard__art" style="background-image:url('${esc(art(d.mission.scenes.intro[0]?.art || m.art))}')"></span>
      <span class="cf-mcard__num">${num(m.id)}</span><strong>${esc(d.mission.title.pt)}</strong>
      <span class="cf-mcard__meta">${sc} cenas · ${(d.mission.hints || []).length} dicas · IA ${AI_PT[d.mission.rival.ai] || d.mission.rival.ai}</span>
      <span class="cf-mcard__tags"><span class="tag">Pronta</span>${dirty(m.id) ? '<span class="tag cf-tag--edit">Não gravada</span>' : ''}${n ? `<span class="tag cf-bad">${n} pendência${n > 1 ? 's' : ''}</span>` : ''}</span></button>`;
  };
  return `<div class="stats"><div class="stat"><b>${ready.length}/${all.length}</b><span>missões prontas na Saga 01</span></div><div class="stat"><b>${sagas.length}</b><span>sagas no mapa</span></div>
      <div class="stat"><b>${lines}</b><span>falas escritas</span></div><div class="stat"><b>${pend}</b><span>pendências</span></div></div>
    <nav class="chips cf-sagas" aria-label="Sagas">${sagas.map(s => `<span class="chip" aria-pressed="${s.id === saga.id}" ${s.id === saga.id ? '' : 'aria-disabled="true"'}>${String(s.n).padStart(2, '0')} · ${esc(s.title.pt)}${s.status === 'ready' ? '' : ' · em breve'}</span>`).join('')}</nav>
    ${saga.chapters.map(c => `<section class="panel cf-chapter"><header class="cf-head"><h3>Capítulo ${c.n} · ${esc(c.title.pt)}</h3><small>${c.missions.filter(m => store[m.id]).length}/${c.missions.length} prontas</small></header>
      <div class="cf-mgrid">${c.missions.map(card).join('')}</div></section>`).join('')}
    <p class="hint">Sagas "em breve" ganham missões quando o roteiro de cada uma for aprovado (CONTEXT/prompt-chatgpt-roteiro-cosmo-chronicles.md).</p>`;
}

// ---------- Missão: storyboard ----------
function frame(kind, s, i) {
  const c = chars()[s.who] || {}, on = pick.kind === kind && pick.i === i, line = draft().dialogues.lines[s.line] || {};
  const face = s.who === 'narrator' ? '' : c.chibi ? `${MARIN}${POSES[s.pose] || POSES.idle}.webp?v=1` : art(c.card);
  const warn = !line.pt?.trim() || !line.en?.trim() || sentences(line.pt) > 2 || sentences(line.en) > 2 || provisional(s.art);
  return `<button class="cf-frame ${on ? 'is-on' : ''}" data-act="pick" data-kind="${kind}" data-i="${i}" aria-pressed="${on}">
    <span class="cf-frame__art" style="background-image:url('${esc(art(s.art, 'normal'))}')">${face ? `<img src="${esc(face)}" alt="">` : ''}<b>${i + 1}</b>${warn ? '<i class="cf-frame__warn">pendência</i>' : ''}</span>
    <span class="cf-frame__who">${esc(s.who === 'narrator' ? 'Narração' : c.name?.pt || s.who)}</span><span class="cf-frame__line">${esc(line.pt || '(sem fala)')}</span></button>`;
}
function storyboard() {
  const m = draft().mission, prep = m.scenes.prep, mentor = chars()[prep.who] || {};
  const lane = (kind, title, sub) => {
    if (kind === 'prep') return `<section class="cf-lane"><header><b>${title}</b><small>${sub}</small></header><div class="cf-lane__row">
      <button class="cf-frame ${pick.kind === 'prep' ? 'is-on' : ''}" data-act="pick" data-kind="prep" data-i="0" aria-pressed="${pick.kind === 'prep'}"><span class="cf-frame__art cf-frame__art--mentor"><img src="${esc(mentor.chibi ? `${MARIN}${POSES[prep.pose] || POSES.tip}.webp?v=1` : art(mentor.card))}" alt=""></span>
      <span class="cf-frame__who">${esc(mentor.name?.pt || prep.who)}</span><span class="cf-frame__line">${esc(draft().dialogues.lines[prep.line]?.pt || '')}</span></button></div></section>`;
    if (kind === 'fight') return `<section class="cf-lane cf-lane--fight"><header><b>${title}</b><small>${sub}</small></header><div class="cf-lane__row">
      <button class="cf-fight" data-act="tab" data-tab="combate"><span style="background-image:url('${esc(art(chars()[m.player.character]?.card))}')"></span><b>×</b><span style="background-image:url('${esc(art(chars()[m.rival.character]?.card))}')"></span>
      <small>${esc(m.objective?.pt || 'Vencer')} · IA ${AI_PT[m.rival.ai] || m.rival.ai} · ${(m.hints || []).length} dicas</small></button></div></section>`;
    const list = m.scenes[kind] || [];
    return `<section class="cf-lane"><header><b>${title}</b><small>${sub} · ${list.length} cena${list.length === 1 ? '' : 's'}</small></header><div class="cf-lane__row">
      ${list.map((s, i) => frame(kind, s, i)).join('')}<button class="cf-add" data-act="add-scene" data-kind="${kind}" aria-label="Acrescentar cena em ${title}">+ Cena</button></div></section>`;
  };
  const extra = m.scenes.objective ? [['objective', 'Venceu sem o objetivo', 'Desfecho']] : [];
  return `<div class="cf-story"><div class="cf-board">${[...ACTS, ...extra].map(([k, t, s]) => lane(k, t, s)).join('')}</div><aside class="panel cf-editor" aria-label="Cena escolhida">${sceneEditor()}</aside></div>`;
}
function sceneEditor() {
  const m = draft().mission, {kind, i} = pick;
  if (kind === 'prep') {
    const prep = m.scenes.prep, mentor = chars()[prep.who] || {};
    return `<h3>Preparação</h3><p class="hint">Quem orienta o jogador antes da batalha.</p>${select(['mission', 'scenes', 'prep', 'who'], 'Quem fala', charOptions())}
      ${mentor.chibi ? select(['mission', 'scenes', 'prep', 'pose'], 'Pose da Marin', POSE_PT, {empty: 'Padrão'}) : ''}${lineFields(prep.line)}`;
  }
  const list = m.scenes[kind] || [], s = list[i];
  if (!s) return '<p class="empty">Escolha uma cena no storyboard.</p>';
  const p = ['mission', 'scenes', kind, i], c = chars()[s.who] || {}, title = (ACTS.find(a => a[0] === kind) || [, 'Venceu sem o objetivo'])[1];
  return `<header class="cf-head"><h3>${title} · cena ${i + 1}</h3><span class="cf-tools">
      <button class="secondary" data-act="move" data-dir="-1" ${i ? '' : 'disabled'} aria-label="Mover para antes">←</button><button class="secondary" data-act="move" data-dir="1" ${i < list.length - 1 ? '' : 'disabled'} aria-label="Mover para depois">→</button>
      <button class="secondary" data-act="del-scene" ${list.length > 1 || kind === 'objective' ? '' : 'disabled'}>Remover</button></span></header>
    <div class="cf-preview" style="background-image:url('${esc(art(s.art, 'normal'))}')">${s.who !== 'narrator' ? `<img src="${esc(c.chibi ? `${MARIN}${POSES[s.pose] || POSES.idle}.webp?v=1` : art(c.card))}" alt="">` : ''}
      <p><b>${esc(s.who === 'narrator' ? '' : c.name?.pt || '')}</b>${esc(draft().dialogues.lines[s.line]?.pt || '')}</p></div>
    ${cardInput([...p, 'art'], 'Arte de fundo', {quick: true})}
    <div class="cf-row">${select([...p, 'who'], 'Quem fala', charOptions())}${c.chibi ? select([...p, 'pose'], 'Pose da Marin', POSE_PT, {empty: 'Padrão'}) : ''}</div>
    ${lineFields(s.line)}`;
}

// ---------- Missão: outras abas ----------
function tabCombate() {
  const m = draft().mission, hints = m.hints || [];
  return `<section class="panel"><h3>Combate</h3><div class="cf-row">${select(['mission', 'player', 'character'], 'Jogador joga com', charOptions())}${select(['mission', 'rival', 'character'], 'Rival', charOptions())}
      ${select(['mission', 'rival', 'ai'], 'IA do rival', AI_PT)}${select(['mission', 'arena'], 'Arena', {olympus: 'Olympus', athena: 'Athena'})}</div>
    ${pair(['mission', 'objective'], 'Objetivo mostrado ao jogador (vazio = só vencer)', {area: true})}${m.challenge ? pair(['mission', 'challenge'], 'Desafio extra', {area: true}) : ''}
    <p class="hint">Regra de vitória no código: ${esc(JSON.stringify(m.victory))}. Para mudar essa regra, peça a alteração.</p></section>
    <section class="panel"><header class="cf-head"><h3>Dicas durante a partida</h3><button data-act="add-hint">+ Dica</button></header>
    <p class="hint">Cada dica aparece uma vez. Escolha quando ela aparece; o modo avançado aceita qualquer gatilho em JSON.</p>
    ${hints.map((h, i) => `<article class="cf-hint">${lineFields(h.id, `Dica ${i + 1}`)}
      <div class="cf-row">${triggerField(h, i)}${select(['mission', 'hints', i, 'who'], 'Quem fala', charOptions(), {empty: 'Mentor (Marin)'})}${select(['mission', 'hints', i, 'pose'], 'Pose da Marin', POSE_PT, {empty: 'Padrão'})}</div>
      <details><summary>Gatilho avançado (JSON)</summary><textarea rows="2" class="cf-code" aria-label="Gatilho em JSON" data-json='${esc(JSON.stringify(['mission', 'hints', i, 'when']))}'>${esc(JSON.stringify(h.when))}</textarea></details>
      <div class="cf-tools"><button class="secondary" data-act="del-hint" data-i="${i}">Remover dica</button></div></article>`).join('') || '<p class="empty">Sem dicas.</p>'}</section>`;
}
// Gatilhos simples por nome; o resto fica no JSON avançado.
const TRIGGERS = {stall: 'Jogador parado 2 turnos', low: 'Soul do jogador baixa (8 ou menos)', rival_card: 'Carta do rival entra em campo', my_card: 'Carta do jogador entra em campo', rival_dev: 'Rival põe um Devoto em campo', down: 'Devoto do rival destruído'};
function triggerOf(when) {
  const w = [when].flat(), one = w.length === 1 ? w[0] : null;
  if (w.length === 2 && w.some(x => x.stall) && w.some(x => x.event === 'soul_lost')) return 'stall_low';
  if (!one) return 'custom';
  if (one.stall) return 'stall';
  if (one.event === 'soul_lost') return 'low';
  if (one.event === 'card_played' && one.card) return one.player === 'B' ? 'rival_card' : 'my_card';
  if (one.event === 'card_played' && one.kind === 'Devotee') return 'rival_dev';
  if (one.event === 'destroyed' && one.owner === 'B') return 'down';
  return 'custom';
}
function triggerField(h, i) {
  const t = triggerOf(h.when), one = [h.when].flat()[0] || {};
  const opts = {stall_low: 'Parado 2 turnos ou Soul baixa', ...TRIGGERS, ...(t === 'custom' ? {custom: 'Personalizado (JSON)'} : {})};
  return `<label class="field">Quando aparece<select data-trigger="${i}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${k === t ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    ${t === 'rival_card' || t === 'my_card' ? cardInput(['mission', 'hints', i, 'when', 0, 'card'], 'Qual carta') : ''}`;
}
const TRIGGER_WHEN = {stall_low: () => [{stall: 2}, {event: 'soul_lost', player: 'A', atMost: {soul: 8}}], stall: () => [{stall: 2}], low: () => [{event: 'soul_lost', player: 'A', atMost: {soul: 8}}],
  rival_card: () => [{event: 'card_played', player: 'B', card: draft().mission.characters[draft().mission.rival.character]?.card || ''}],
  my_card: () => [{event: 'card_played', player: 'A', card: draft().mission.characters[draft().mission.player.character]?.card || ''}],
  rival_dev: () => [{event: 'card_played', player: 'B', kind: 'Devotee'}], down: () => [{event: 'destroyed', owner: 'B'}]};

function tabDecks() {
  const m = draft().mission;
  return m.decks.map((d, di) => {
    const total = d.main_deck.reduce((n, c) => n + (c.quantity || 0), 0), errs = index ? validateDeck(d, index) : [];
    const role = d.id === m.player.deck ? 'Deck do jogador' : d.id === m.rival.deck ? 'Deck do rival' : 'Deck sem uso';
    return `<details class="panel cf-deck" ${di === 0 ? 'open' : ''}><summary class="cf-head"><h3>${role}</h3><span class="tag ${total === 50 && !errs.length ? '' : 'cf-bad'}">${total}/50 cartas${errs.length ? ' · com erro' : ''}</span></summary>
      ${errs.length ? `<p class="cf-warn">${errs.map(e => `${DECK_ERR[e.code] || e.code}${e.card_id ? ` (${esc(cardName(e.card_id))})` : ''}`).join(' · ')}</p>` : ''}
      ${cardInput(['mission', 'decks', di, 'domain_id'], 'Domínio')}
      <div class="table-wrap"><table><thead><tr><th>Carta</th><th>Cópias</th><th><span class="sr-only">Remover</span></th></tr></thead><tbody>
      ${d.main_deck.map((c, ci) => `<tr><td><span class="cf-card"><img src="${esc(art(c.card_id))}" alt=""><input list="cf-cards" aria-label="Carta" ${bind(['mission', 'decks', di, 'main_deck', ci, 'card_id'], 'data-card')} value="${esc(c.card_id)}"></span><small>${esc(cardName(c.card_id))}</small></td>
        <td><input type="number" min="1" max="3" aria-label="Cópias" ${bind(['mission', 'decks', di, 'main_deck', ci, 'quantity'], 'data-num')} value="${c.quantity}"></td><td><button class="secondary" data-act="del-card" data-d="${di}" data-i="${ci}">Remover</button></td></tr>`).join('')}
      </tbody></table></div><div class="actions"><button data-act="add-card" data-d="${di}">+ Carta</button></div>
      <p class="hint">Mudar o deck muda a dificuldade, que foi medida por simulação. Avise para simular de novo.</p></details>`;
  }).join('');
}

function tabDados() {
  const m = draft().mission;
  return `<section class="panel"><h3>Missão</h3>${pair(['mission', 'title'], 'Título')}${pair(['mission', 'description'], 'Descrição', {area: true})}
    ${pair(['mission', 'level'], 'Nível')}${pair(['mission', 'duration'], 'Duração')}
    <div class="cf-row"><label class="field">Exige (missões, separadas por vírgula)<input data-list='["mission","requires"]' value="${esc((m.requires || []).join(', '))}"></label>${input(['mission', 'next'], 'Próxima missão')}</div></section>
    <section class="panel"><header class="cf-head"><h3>Personagens</h3><button data-act="add-char">+ Personagem</button></header>
    ${Object.entries(chars()).map(([k, c]) => `<article class="cf-person"><span class="cf-person__face"><img src="${esc(c.chibi ? `${MARIN}${POSES.idle}.webp?v=1` : art(c.card))}" alt=""></span><div>
      ${pair(['mission', 'characters', k, 'name'], 'Nome')}
      ${k === 'narrator' ? '<p class="hint">A narração não tem retrato.</p>' : `<div class="cf-row">${cardInput(['mission', 'characters', k, 'card'], 'Retrato (carta)')}<label class="field cf-check"><input type="checkbox" ${bind(['mission', 'characters', k, 'chibi'])} ${c.chibi ? 'checked' : ''}> Aparece como a Marin chibi</label></div>
      <div class="cf-tools"><button class="secondary" data-act="del-char" data-k="${esc(k)}">Remover personagem</button></div>`}</div></article>`).join('')}</section>`;
}

// ---------- Tela ----------
function render() {
  if (!current) { host.innerHTML = `<div class="cf-dash">${overview()}</div>`; return; }
  const m = draft().mission, ch = saga.chapters.find(c => c.missions.some(x => x.id === current)), pend = issues(draft());
  host.innerHTML = `<div class="cf-dash">
    <header class="cf-head cf-top"><div><button class="secondary cf-back" data-act="home">← Saga 01</button>
      <p class="tag">Capítulo ${ch?.n} · Missão ${num(current)}</p><h2>${esc(m.title.pt)}</h2></div>
      <div class="actions"><a href="${esc(preview)}#m/${current}/story" target="_blank" rel="noopener">Ver história ↗</a><a href="${esc(preview)}#m/${current}/prep" target="_blank" rel="noopener">Ver preparação ↗</a></div></header>
    ${pend.length ? `<details class="cf-issues"><summary>${pend.length} pendência${pend.length > 1 ? 's' : ''} nesta missão</summary><ul>${pend.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>` : '<p class="cf-ok">Sem pendências nesta missão.</p>'}
    <nav class="chips cf-tabs" aria-label="Partes da missão">${Object.entries(TABS).map(([k, t]) => `<button class="chip" data-act="tab" data-tab="${k}" aria-pressed="${k === tab}">${t}</button>`).join('')}</nav>
    <div class="cf-tab">${{historia: storyboard, combate: tabCombate, decks: tabDecks, dados: tabDados}[tab]()}</div>
    <div class="save-bar"><small role="status">${dirty(current) ? 'Alterações não gravadas. "Ver história" mostra a versão gravada.' : 'Tudo gravado.'}</small>
      <span class="actions"><button class="secondary" data-act="revert" ${dirty(current) ? '' : 'disabled'}>Descartar</button><button class="primary" data-act="save" ${dirty(current) ? '' : 'disabled'}>Gravar missão</button></span></div></div>
    <datalist id="cf-cards">${[...forge.values()].map(c => `<option value="${esc(c.id)}">${esc(c.nome_exibicao_pt || c.nome_exibicao_en || '')}</option>`).join('')}</datalist>`;
}

const lineRefs = d => new Set([...['intro', 'win', 'lose', 'objective'].flatMap(k => (d.mission.scenes[k] || []).map(s => s.line)), d.mission.scenes.prep.line, ...(d.mission.hints || []).map(h => h.id)]);
async function save(b) {
  const d = structuredClone(draft()), keep = lineRefs(d);
  for (const k of Object.keys(d.dialogues.lines)) if (!keep.has(k)) delete d.dialogues.lines[k]; // fala sem cena nem dica sai
  for (const k of ['objective', 'challenge']) if (d.mission[k] && !d.mission[k].pt?.trim() && !d.mission[k].en?.trim()) delete d.mission[k];
  b.textContent = 'Gravando…';
  const r = await api('chronicles', {id: current, revisao: store[current].revisao, mission: d.mission, dialogues: d.dialogues});
  store[current] = {mission: d.mission, dialogues: d.dialogues, revisao: r.revisao};
  drafts[current] = structuredClone({mission: d.mission, dialogues: d.dialogues});
  notice(`Missão ${num(current)} gravada.`, true);
  render();
}

function act(b) {
  const d = draft(), sc = d?.mission.scenes;
  switch (b.dataset.act) {
    case 'open': current = b.dataset.id; tab = 'historia'; pick = {kind: 'intro', i: 0}; break;
    case 'home': current = null; break;
    case 'tab': tab = b.dataset.tab; break;
    case 'pick': pick = {kind: b.dataset.kind, i: Number(b.dataset.i)}; break;
    case 'pick-art': set(d, JSON.parse(b.dataset.path), b.dataset.card); break;
    case 'move': { const list = sc[pick.kind], j = pick.i + Number(b.dataset.dir); [list[pick.i], list[j]] = [list[j], list[pick.i]]; pick.i = j; break; }
    case 'del-scene': sc[pick.kind].splice(pick.i, 1); pick.i = Math.max(0, pick.i - 1); break;
    case 'add-scene': { const k = b.dataset.kind, key = newKey(k.toUpperCase()), list = (sc[k] ||= []), last = list.at(-1);
      d.dialogues.lines[key] = {pt: '', en: ''}; list.push({art: last?.art || chars()[d.mission.rival.character]?.card || '', who: last?.who || 'narrator', line: key}); pick = {kind: k, i: list.length - 1}; break; }
    case 'add-hint': { const key = newKey('HINT'); d.dialogues.lines[key] = {pt: '', en: ''}; (d.mission.hints ||= []).push({id: key, when: [{stall: 2}]}); break; }
    case 'del-hint': d.mission.hints.splice(Number(b.dataset.i), 1); break;
    case 'add-char': { const k = prompt('Nome curto do personagem, em minúsculas e sem espaço (ex.: shaina):', '')?.trim(); if (!k || !/^[a-z][a-z0-9_]*$/.test(k) || chars()[k]) return notice('Nome inválido ou já usado.'); chars()[k] = {card: '', name: {pt: k, en: k}}; break; }
    case 'del-char': { const k = b.dataset.k, used = JSON.stringify(d.mission.scenes).includes(`"who":"${k}"`) || [d.mission.player.character, d.mission.rival.character].includes(k) || (d.mission.hints || []).some(h => h.who === k);
      if (used) return notice('Esse personagem ainda fala em alguma cena ou dica, ou é o jogador ou o rival.'); delete chars()[k]; break; }
    case 'add-card': d.mission.decks[b.dataset.d].main_deck.push({card_id: '', quantity: 1}); break;
    case 'del-card': d.mission.decks[b.dataset.d].main_deck.splice(Number(b.dataset.i), 1); break;
    case 'revert': drafts[current] = structuredClone({mission: store[current].mission, dialogues: store[current].dialogues}); break;
    case 'save': b.disabled = true; return save(b).catch(e => { notice(e.message); render(); });
    default: return;
  }
  render();
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.bind) {
    const path = JSON.parse(t.dataset.bind), v = t.type === 'checkbox' ? t.checked : 'num' in t.dataset ? Number(t.value) : t.value;
    if (t.type === 'checkbox' && !v) delete get(draft(), path.slice(0, -1))[path.at(-1)]; else set(draft(), path, v);
    if (e.type === 'change' && (t.tagName === 'SELECT' || t.type === 'checkbox' || 'card' in t.dataset)) return render(); // muda imagem ou opções: redesenha
  } else if (t.dataset.trigger != null && e.type === 'change') {
    const h = draft().mission.hints[Number(t.dataset.trigger)];
    if (TRIGGER_WHEN[t.value]) h.when = TRIGGER_WHEN[t.value]();
    return render();
  } else if (t.dataset.list) set(draft(), JSON.parse(t.dataset.list), t.value.split(',').map(s => s.trim()).filter(Boolean));
  else if (t.dataset.json) {
    try { set(draft(), JSON.parse(t.dataset.json), JSON.parse(t.value)); t.setCustomValidity(''); } catch { t.setCustomValidity('JSON inválido'); }
    t.reportValidity();
  }
  const status = host.querySelector('.save-bar small'), sb = host.querySelector('[data-act="save"]'), rv = host.querySelector('[data-act="revert"]');
  if (status) { const on = dirty(current); status.textContent = on ? 'Alterações não gravadas. "Ver história" mostra a versão gravada.' : 'Tudo gravado.'; sb.disabled = rv.disabled = !on; }
}

export async function mountChroniclesForge(el, context) {
  ({api, notice} = context); host = el;
  if (!document.querySelector('link[href*="chronicles-forge.css"]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: './chronicles-forge.css?v=20261111-cf2'}));
  host.innerHTML = '<p>Carregando missões…</p>';
  const [data, list, canon] = await Promise.all([api('chronicles'), json('../card-forge/art-web/cards.json').catch(() => ({cartas: []})), json('../data/canon/d268.json').catch(() => null)]);
  forge = new Map(list.cartas.map(c => [c.id, c]));
  if (canon) { const cards = loadCanon(canon); index = canonIndex(canon); addPreviewCards(cards, index, list.cartas); }
  saga = data.saga; store = data.missoes; sagas = data.sagas || []; preview = data.previa || preview;
  for (const id of Object.keys(store)) drafts[id] ??= structuredClone({mission: store[id].mission, dialogues: store[id].dialogues});
  if (current && !store[current]) current = null;
  if (!host.dataset.cf) {
    host.dataset.cf = '1';
    host.addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b && host.contains(b)) act(b); });
    host.addEventListener('input', onInput); host.addEventListener('change', onInput);
    addEventListener('beforeunload', e => { if (Object.keys(store).some(dirty)) e.preventDefault(); });
  }
  render();
}
