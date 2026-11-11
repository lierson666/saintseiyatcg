// ACHIEVEMENTS FORGE V1.0 (autor, 11/11/2026): conquistas e títulos do jogo no STAR HILL.
// Rascunho (data/achievements.json) → validação e diff → Publicar (sanctuary-api/achievements.json, versão nova) → Rollback.
// Grava por /api/star-hill/achievements*, que confere a revisão e usa a mesma validação do servidor do jogo (sanctuary-api/achievements.py).
// Title Designer: prévia da placa (shared/title-plate.js, a mesma do lobby), presets por raridade, PNG/WebP e movimento reduzido.
import {titlePlate, drawPlate, PRESETS, artFor} from '../shared/title-plate.js?v=20261111-ach2';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const TRACK = {server: 'Servidor', client_reported: 'Navegador (sem moedas)', pending: 'Pendente · não desbloqueia'};
let state, draft, chosen = 0, dirty = false, filter = '', rarity = '';
const view = {lang: 'pt', still: false, bg: 'dark'};

const plate = a => ({id: a.id, name: view.lang === 'pt' ? a.title_pt : a.title, rarity: a.rarity, effect: a.visual.effect});
const nextId = () => `ach-${String(Math.max(0, ...draft.achievements.map(a => Number(a.id.slice(4)))) + 1).padStart(3, '0')}`;
const counts = key => draft.achievements.reduce((m, a) => (m[a[key]] = (m[a[key]] || 0) + 1, m), {});

function header(root) {
  const pend = draft.achievements.filter(a => state.metricas[a.metric]?.tracking === 'pending').length;
  const pub = state.publicado, r = counts('rarity');
  const tag = dirty ? 'DRAFT · não salvo' : state.estado === 'draft' ? 'DRAFT' : 'PUBLISHED';
  root.querySelector('#ach-head').innerHTML = `<h2>ACHIEVEMENTS FORGE <span class="tag ${tag === 'PUBLISHED' ? 'ach-live' : 'ach-draft'}">${tag}</span></h2>
    <p class="hint">Conquistas e títulos do jogo. O servidor só desbloqueia métrica que ele mesmo registra; as pendentes aparecem no jogo como "em breve" e não desbloqueiam.</p>
    <div class="ach-stats"><strong>${draft.achievements.length} títulos</strong>${state.raridades.map(x => `<span>${x} ${r[x] || 0}</span>`).join('')}<span>${pend} pendentes</span>
      <span>${pub ? `No ar: v${pub.version} · ${esc(pub.published_at)}${pub.rollback_of ? ` · rollback da v${pub.rollback_of}` : ''}` : 'Nunca publicado'}</span></div>`;
}

function list(root) {
  const q = filter.toLowerCase();
  const items = draft.achievements.map((a, i) => [a, i]).filter(([a]) => (!rarity || a.rarity === rarity) && `${a.id} ${a.title} ${a.title_pt} ${a.metric}`.toLowerCase().includes(q));
  root.querySelector('#ach-list').innerHTML = items.map(([a, i]) => {
    const t = state.metricas[a.metric]?.tracking;
    return `<button class="ach-entry ${i === chosen ? 'selected' : ''} ${a.enabled ? '' : 'is-off'}" data-ach-index="${i}"><small>${esc(a.id)} · ${esc(a.rarity)}${t === 'pending' ? ' · pendente' : ''}${a.enabled ? '' : ' · desativada'}</small><b>${esc(a.title_pt)}</b><span>${esc(a.title)} · ${esc(a.metric)} ${a.target}</span></button>`;
  }).join('') || '<p class="hint">Nenhum resultado.</p>';
}

function preview(root) {
  const a = draft.achievements[chosen], el = root.querySelector('#ach-preview');
  el.className = `ach-stage ach-stage--${view.bg}`;
  const o = size => ({size, still: view.still, lang: view.lang}), art = artFor(a.id, view.lang);
  el.innerHTML = `${titlePlate(plate(a), o('lg'))}
    <div class="ach-stage__row">${titlePlate(plate(a), o('md'))}${titlePlate(plate(a), o('sm'))}</div>
    ${art ? `<p class="hint">Arte pronta do autor (shared/title-art/${esc(a.id)}.webp). Mudar o título EN aqui não muda o texto da arte. Sem arte, vale a placa desenhada:</p>${titlePlate({...plate(a), id: null}, o('md'))}` : ''}`;
}

function editor(root) {
  const a = draft.achievements[chosen], m = state.metricas[a.metric] || {};
  const opt = (items, cur, label = x => x) => items.map(x => `<option value="${esc(x)}" ${x === cur ? 'selected' : ''}>${esc(label(x))}</option>`).join('');
  root.querySelector('#ach-editor').innerHTML = `<p class="hint">ID permanente: <b>${esc(a.id)}</b> · rastreio: <b class="ach-track ach-track--${esc(m.tracking)}">${TRACK[m.tracking] || '—'}</b> · ${esc(m.info || '')}</p>
    <section class="ach-designer"><h3>Title Designer</h3><div id="ach-preview"></div>
      <div class="actions ach-tools">
        <button data-view="lang">${view.lang === 'pt' ? 'Prévia em PT' : 'Prévia em EN'}</button>
        <button data-view="bg">Fundo ${view.bg === 'dark' ? 'escuro' : 'claro'}</button>
        <button data-view="still" aria-pressed="${view.still}">${view.still ? 'Movimento reduzido' : 'Com movimento'}</button>
        <button data-preset>Preset ${esc(a.rarity)}</button>
        <button data-export="png">Exportar PNG</button><button data-export="webp">Exportar WebP</button></div></section>
    <div class="ach-fields">
      <label class="field"><span>Título (EN, no jogo)</span><input data-ach-field="title" maxlength="40" value="${esc(a.title)}"></label>
      <label class="field"><span>Título (PT)</span><input data-ach-field="title_pt" maxlength="40" value="${esc(a.title_pt)}"></label>
      <label class="field ach-full"><span>Condição (EN)</span><input data-ach-field="description" maxlength="200" value="${esc(a.description)}"></label>
      <label class="field ach-full"><span>Condição (PT)</span><input data-ach-field="description_pt" maxlength="200" value="${esc(a.description_pt)}"></label>
      <label class="field"><span>Raridade</span><select data-ach-field="rarity">${opt(state.raridades, a.rarity)}</select></label>
      <label class="field"><span>Categoria</span><select data-ach-field="category">${opt(state.categorias, a.category)}</select></label>
      <label class="field"><span>Métrica</span><select data-ach-field="metric">${opt(Object.keys(state.metricas), a.metric, x => `${x} · ${TRACK[state.metricas[x].tracking]}`)}</select></label>
      <label class="field"><span>Objetivo${a.metric === 'season_top' ? ' (TOP N)' : ''}</span><input type="number" min="1" max="1000000" data-ach-field="target" value="${a.target}"></label>
      <label class="field"><span>Cosmo Coins${m.tracking === 'server' ? '' : ' (só métrica do servidor)'}</span><input type="number" min="0" max="2000" data-ach-field="coins" value="${a.reward.coins}" ${m.tracking === 'server' ? '' : 'disabled'}></label>
      <label class="field"><span>Efeito (VFX Forge)</span><select data-ach-field="effect">${opt(state.efeitos, a.visual.effect)}</select></label>
      <label class="field ach-check"><input type="checkbox" data-ach-field="enabled" ${a.enabled ? 'checked' : ''}><span>Ativa no jogo (desative em vez de apagar)</span></label>
    </div>`;
  preview(root);
}

function review(root) {
  const errs = state.erros, diff = state.diff;
  const fmt = v => v === undefined || v === null ? '—' : esc(String(v).length > 60 ? String(v).slice(0, 60) + '…' : v);
  root.querySelector('#ach-review').innerHTML = `<h3>Validação</h3>${errs.length ? `<ul class="ach-errors">${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : '<p class="hint">Sem erros no rascunho salvo.</p>'}
    <h3>Diferenças para a versão no ar ${diff.length ? `(${diff.length})` : ''}</h3>
    ${diff.length ? `<table class="ach-diff"><thead><tr><th>ID</th><th>Mudança</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${diff.slice(0, 120).map(d => `<tr><td>${esc(d.id)}</td><td>${d.change === 'changed' ? esc(d.field) : d.change === 'added' ? 'nova' : 'removida'}</td><td>${fmt(d.before)}</td><td>${fmt(d.after)}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Rascunho igual ao publicado.</p>'}
    <h3>Versões publicadas</h3>${state.versoes.length ? `<ol class="ach-versions">${state.versoes.map(v => `<li><b>v${v.version}</b> · ${esc(v.published_at)} · ${v.count} títulos${v.rollback_of ? ` · rollback da v${v.rollback_of}` : ''}${state.publicado?.version === v.version ? ' · <span class="tag">no ar</span>' : ` <button data-rollback="${v.version}">Voltar para esta</button>`}</li>`).join('')}</ol>` : '<p class="hint">Nenhuma ainda.</p>'}`;
}

function actions(root) {
  root.querySelector('#ach-save').disabled = !dirty;
  root.querySelector('#ach-publish').disabled = dirty || state.estado !== 'draft' || state.erros.length > 0;
}
function paint(root) { header(root); list(root); editor(root); review(root); actions(root); }
async function reload(api) { state = await api('achievements'); draft = structuredClone(state.rascunho); dirty = false; }
const css = href => document.querySelector(`link[href*="${href.split('?')[0].split('/').pop()}"]`) || document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href}));

export async function mountAchievements(root, {notice, api}) {
  if (!state) await reload(api);
  css('../shared/title-plate.css?v=20261111-ach2');
  css('./achievements-forge.css?v=20261111-ach1');
  root.innerHTML = `<section class="panel"><div id="ach-head"></div>
    <div class="ach-workspace"><aside><input id="ach-search" class="search" placeholder="Buscar título, ID ou métrica" aria-label="Buscar conquista">
      <select id="ach-rarity" aria-label="Filtrar raridade"><option value="">Todas as raridades</option>${state.raridades.map(r => `<option>${r}</option>`).join('')}</select>
      <div id="ach-list"></div><button id="ach-new">+ Nova conquista</button></aside><div id="ach-editor"></div></div>
    <div class="actions"><button class="primary" id="ach-save">Salvar rascunho</button><button id="ach-publish" title="Publica o rascunho salvo como versão nova para o servidor do jogo (local; deploy é outra etapa)">Publicar versão</button><button id="ach-reset">Descartar alterações</button></div>
    <div id="ach-review" class="ach-review"></div></section>`;
  paint(root);
  const guard = fn => async (...args) => { try { await fn(...args); } catch (e) { notice(e.message); } };
  root.querySelector('#ach-search').oninput = e => { filter = e.target.value; list(root); };
  root.querySelector('#ach-rarity').onchange = e => { rarity = e.target.value; list(root); };
  root.querySelector('#ach-list').onclick = e => { const b = e.target.closest('[data-ach-index]'); if (!b) return; chosen = Number(b.dataset.achIndex); list(root); editor(root); };
  root.querySelector('#ach-new').onclick = () => { // nasce desativada: só entra no jogo quando o autor ativar e publicar
    draft.achievements.push({id: nextId(), title: 'New title', title_pt: 'Novo título', description: 'Win 1 online duel.', description_pt: 'Vença 1 duelo online.', rarity: 'Common',
      category: 'competitive', metric: 'wins', target: 1, enabled: false, tracking: 'server', reward: {title: true, coins: 0}, visual: {frame: 'common', effect: 'none'}});
    chosen = draft.achievements.length - 1; dirty = true; paint(root);
  };
  const editorEl = root.querySelector('#ach-editor');
  editorEl.oninput = editorEl.onchange = e => {
    const f = e.target.dataset.achField; if (!f) return;
    const a = draft.achievements[chosen], v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === 'coins') a.reward.coins = Number(v) || 0;
    else if (f === 'effect') a.visual.effect = v;
    else if (f === 'target') a.target = Number(v) || 0;
    else a[f] = v;
    if (f === 'rarity') a.visual.frame = v.toLowerCase();
    if (f === 'metric' && state.metricas[v]?.tracking !== 'server') a.reward.coins = 0;
    dirty = true; header(root); list(root); actions(root);
    if (e.type === 'change' && ['rarity', 'metric', 'enabled', 'effect'].includes(f)) editor(root); else preview(root);
  };
  editorEl.onclick = e => {
    const a = draft.achievements[chosen], b = e.target.closest('button'); if (!b) return;
    if (b.dataset.view) { view[b.dataset.view] = {lang: view.lang === 'pt' ? 'en' : 'pt', bg: view.bg === 'dark' ? 'light' : 'dark', still: !view.still}[b.dataset.view]; return editor(root); }
    if ('preset' in b.dataset) { a.visual = {frame: a.rarity.toLowerCase(), effect: PRESETS[a.rarity]}; dirty = true; header(root); actions(root); return editor(root); }
    if (b.dataset.export) {
      const type = b.dataset.export;
      drawPlate(plate(a), plate(a).name).toBlob(blob => {
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), {href: url, download: `${a.id}-${view.lang}.${type}`}).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, `image/${type}`, 0.92);
    }
  };
  root.querySelector('#ach-save').onclick = guard(async () => {
    state = await api('achievements', {revisao: state.revisao, conteudo: draft}); draft = structuredClone(state.rascunho); dirty = false;
    notice('Rascunho salvo.', true); paint(root);
  });
  root.querySelector('#ach-publish').onclick = guard(async () => {
    if (!confirm(`Publicar o rascunho como v${(state.publicado?.version || 0) + 1}? O servidor local passa a usar esta versão. Deploy continua separado.`)) return;
    state = await api('achievements/publicar', {revisao: state.revisao}); draft = structuredClone(state.rascunho);
    notice(`Versão v${state.publicado.version} publicada.`, true); paint(root);
  });
  root.querySelector('#ach-reset').onclick = guard(async () => { if (dirty && !confirm('Descartar as alterações ainda não salvas?')) return; await reload(api); paint(root); });
  root.querySelector('#ach-review').onclick = guard(async e => {
    const b = e.target.closest('[data-rollback]'); if (!b) return;
    if (dirty) return notice('Salve ou descarte o rascunho antes de voltar uma versão.');
    if (!confirm(`Publicar de novo o conteúdo da v${b.dataset.rollback}? Vira uma versão nova; o histórico fica.`)) return;
    state = await api('achievements/rollback', {versao: Number(b.dataset.rollback)}); draft = structuredClone(state.rascunho);
    notice(`Rollback publicado como v${state.publicado.version}.`, true); paint(root);
  });
}
