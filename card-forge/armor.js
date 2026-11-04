// Tela do ARMOR FORGE. Cada controle grava em armor_forge.py e alimenta os prompts de armor-model.js: nada aqui fica só na memória.
import {ALL_COMPONENTS, ANATOMY, CHECK_VALUES, DESIGN_FIELDS, FACTIONS, FAMILIES, FIELD_MODES, GRANDEUR, IDENTITY_FIELDS, ISOLATED_MODES, LOCK_CHECKS, MODES, MYTHIC, PYTHON_WARPLATE, STATES, STATE_LABELS, approvalIssues, autoComponent, autoField, buildLock, computeDesign, consistencySummary, imageUrl, latestVersions, modePrompt, newComponents, newSpec, versionComponents, versionReferences} from './armor-model.js';

const $ = (s, root = document) => root.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const options = (list, value) => list.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t ?? v)}</option>`).join('');
const say = (text, bad = false) => { const el = $('#status'); el.textContent = text; el.style.color = bad ? '#ff9c8f' : ''; };
const GPT_URL = 'https://chatgpt.com/';
const PIPE = ['CARD DATA', 'MYTHOLOGY', 'ARMOR SPECIFICATION', 'ARMOR CONCEPT', 'APPROVAL', 'EQUIPPED CHARACTER', 'FINAL CARD ART'];
const VARIANTS = [['default', 'Arte padrão'], ['manga', 'Mangá'], ['anime', 'Anime'], ['narrative', 'Narrativa'], ['symbolic', 'Simbólica'], ['character', 'Personagem'], ['effect', 'Efeito'], ['equipment', 'Equipamento'], ['promo', 'Promo']];

let store = null, cards = [], projectId = '', versionId = '', mode = 'concept', focusKey = 'helmet', bindingId = '', typedPrompt = null, saveTimer = null, savePending = false, entryCard = null;

async function api(op, payload, {keep = false} = {}) {
  const r = await fetch(`/api/armor-forge/${op}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  const data = await r.json();
  if (r.status === 409) return data;
  if (!r.ok) throw new Error(data.erro || 'O servidor recusou a gravação.');
  if (!keep) store = data.store;
  return data;
}
const fail = (error) => say(error.message || 'Não consegui gravar: abra pelo servidor local.', true);

const project = () => store?.projects[projectId];
const version = () => store?.versions[versionId];
const components = () => versionComponents(store, versionId);
const references = () => versionReferences(store, versionId);
const editableNow = () => version()?.status === 'DRAFT';
const ctxOf = () => ({originName: project()?.origin_card_name});
const designNow = () => version().lock || computeDesign(version().spec, components(), ctxOf());
const generations = () => Object.values(store.generations).filter((g) => g.version_id === versionId).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
const bindingsOf = () => Object.values(store.bindings).filter((b) => b.project_id === projectId);
const referenceCount = () => (version().lock ? version().lock.reference_ids.length : references().filter((r) => r.approved && r.image).length);
const statusBadge = (state) => `<span class="af-state" data-state="${state}">${esc(state)}</span>`;

function select(id, version) { projectId = id; versionId = version || store.projects[id]?.head_version_id || ''; typedPrompt = null; render(); }

// Rascunho salva sozinho. Só o que está em DRAFT chega aqui: o resto nem aceita digitação.
function scheduleSave() {
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 350);
  say('Salvando…');
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (!savePending) return;
  savePending = false;
  try {
    const v = version();
    const done = await api('version-update', {version_id: v.id, spec: v.spec, components: components().map(({id, mode: m, value, required}) => ({id, mode: m, value, required}))}, {keep: true});
    say(done.conflict ? done.erro : 'Rascunho salvo.', Boolean(done.conflict));
    if (project().head_version_id === v.id) Object.assign(project(), {name: v.spec.name, faction: v.spec.faction});
    renderList();
  } catch (error) { savePending = true; fail(error); }
}

function renderPipeline() {
  const v = version(), shots = v ? generations().filter((g) => g.image) : [];
  const stage = !v ? 0 : shots.some((g) => g.mode === 'card_art') ? 6 : shots.some((g) => g.mode === 'equipped') || v.lock ? 5 : v.status === 'IN_REVIEW' ? 4 : shots.length ? 4 : v.spec.fields?.silhouette?.mode === 'manual' ? 3 : 2;
  $('#pipeline').innerHTML = PIPE.map((label, i) => `<li class="${i === stage ? 'now' : i < stage ? 'done' : ''}">${label}</li>`).join('');
}
function renderList() {
  const term = $('#search').value.trim().toLowerCase(), state = $('#stateFilter').value;
  const rows = Object.values(store.projects).map((p) => ({p, head: store.versions[p.head_version_id], canon: store.versions[p.canonical_version_id]})).filter(({p, head}) => (!state || head?.status === state) && (!term || `${p.name} ${p.faction} ${p.origin_card_name} ${p.origin_card_id}`.toLowerCase().includes(term))).sort((a, b) => a.p.name.localeCompare(b.p.name));
  $('#projects').innerHTML = rows.map(({p, head, canon}) => `<li><button type="button" data-project="${esc(p.id)}" aria-current="${p.id === projectId}"><span translate="no">${esc(p.name)}</span><small>${esc(p.faction)} · v${head?.number ?? 1} ${statusBadge(head?.status || 'DRAFT')}${canon ? ` · canônica v${canon.number}` : ''}</small></button></li>`).join('') || '<li class="af-note">Nenhuma armadura ainda.</li>';
  $('#seedExample').hidden = Boolean(store.projects[PYTHON_WARPLATE.id]);
}

function fieldRow(key, label, placeholder, spec, ro) {
  const field = spec.fields[key] || {mode: 'auto', value: ''}, auto = autoField(key, spec, ctxOf());
  const lists = {grandeur: GRANDEUR.map(([id, text]) => [id, text]), family: FAMILIES};
  let box;
  if (field.mode === 'absent') box = '<textarea readonly rows="1">Explicitamente ausente</textarea>';
  else if (field.mode === 'auto') box = `<textarea readonly rows="1">${esc(key === 'grandeur' ? (GRANDEUR.find(([id]) => id === auto)?.[1] || auto) : auto || 'Sem valor: fica fora do prompt')}</textarea>`;
  else if (lists[key]) box = `<select data-field-value="${key}"${ro ? ' disabled' : ''}>${options([['', 'Escolha'], ...lists[key]], field.value)}</select>`;
  else box = `<textarea rows="1" data-field-value="${key}" placeholder="${esc(placeholder)}"${ro ? ' readonly' : ''}>${esc(field.value)}</textarea>`;
  return `<div class="af-field"><span>${esc(label)}</span><select data-field-mode="${key}" aria-label="Modo de ${esc(label)}"${ro ? ' disabled' : ''}>${options(FIELD_MODES, field.mode)}</select>${box}</div>`;
}
function componentRow(row, spec, ro) {
  const meta = ALL_COMPONENTS.find(([k]) => k === row.key), auto = row.group === 'mythic' ? 'Só se derivar da criatura: o prompt não obriga' : autoComponent(row.key, spec);
  const box = row.mode === 'absent' ? '<textarea readonly rows="1">Explicitamente ausente</textarea>' : row.mode === 'auto' ? `<textarea readonly rows="1">${esc(auto)}</textarea>` : `<textarea rows="1" data-comp-value="${row.id}" placeholder="Forma, encaixe e detalhe concretos"${ro ? ' readonly' : ''}>${esc(row.value)}</textarea>`;
  return `<div class="af-field" data-component="${esc(row.key)}"><span>${esc(meta[1])}</span><select data-comp-mode="${row.id}" aria-label="Modo de ${esc(meta[1])}"${ro ? ' disabled' : ''}>${options(FIELD_MODES, row.mode)}</select>${box}${row.mode === 'absent' ? '' : `<label class="af-req"><input type="checkbox" data-comp-req="${row.id}"${row.required ? ' checked' : ''}${ro ? ' disabled' : ''}> Obrigatório no lock</label>`}</div>`;
}
function renderEditor() {
  const el = $('#editor'), v = version();
  if (!v) { el.innerHTML = '<div class="af-card"><p class="af-note">Escolha ou crie uma armadura. Ela nasce sem portador; o personagem vem depois da aprovação.</p></div>'; return; }
  const spec = v.spec, ro = !editableNow(), rows = components(), open = new Set([...el.querySelectorAll('details')].filter((d) => !d.open).map((d) => d.dataset.key));
  const group = (list) => list.map(([key]) => rows.find((c) => c.key === key)).filter(Boolean).map((row) => componentRow(row, spec, ro)).join('');
  const fold = (key, title, body) => `<div class="af-card"><details data-key="${key}"${open.has(key) ? '' : ' open'}><summary>${title}</summary>${body}</details></div>`;
  const scroll = window.scrollY;
  el.innerHTML = `${ro ? `<p class="af-warn">Versão ${v.number} está ${esc(STATE_LABELS[v.status])}: ${v.lock ? 'o Design Lock é imutável. Crie uma nova versão para alterar; esta fica guardada.' : 'só leitura. Devolva para rascunho para editar.'}</p>` : ''}
    <div class="af-card"><h2>Identidade</h2>
      <label>Nome oficial<input data-spec="name" value="${esc(spec.name)}" translate="no"${ro ? ' readonly' : ''}></label>
      <label>Facção e Deus<select data-spec="faction"${ro ? ' disabled' : ''}>${options(FACTIONS.map((f) => [f, f]), spec.faction)}</select></label>
      <div>${IDENTITY_FIELDS.map(([k, l, ph]) => fieldRow(k, l, ph, spec, ro)).join('')}</div>
      <label><input type="checkbox" data-divine${spec.divine ? ' checked' : ''}${ro ? ' disabled' : ''}> Armadura de deus: fora da regra das mãos</label></div>
    ${fold('design', 'Design', DESIGN_FIELDS.map(([k, l, ph]) => fieldRow(k, l, ph, spec, ro)).join('') + fieldRow('totem', 'Forma totêmica (modo C)', 'Só quando fizer sentido para a facção', spec, ro))}
    ${fold('anatomy', 'Anatomia da armadura', group(ANATOMY))}
    ${fold('mythic', 'Elementos mitológicos', group(MYTHIC))}`;
  window.scrollTo(0, scroll);
}

function promptFor() {
  const v = version(), binding = store.bindings[bindingId], design = designNow();
  // Sem aprovação, o personagem equipado usa o estado atual da armadura (autor, 04/11/2026).
  const d = mode === 'equipped' && !v.lock ? buildLock(design, []) : design;
  if (mode === 'equipped' && !binding) return {blocked: 'Vincule a armadura a uma carta para gerar o personagem equipado.'};
  if (mode === 'totem' && !d.totem) return {blocked: 'Forma totêmica marcada como ausente neste projeto. Nem toda facção precisa dela.'};
  const focus = ALL_COMPONENTS.find(([k]) => k === focusKey)?.[2];
  return {text: modePrompt(mode, d, {version: v.number, focus: focus?.toLowerCase(), card: binding ? {name: binding.card_name || binding.card_id} : null, adjustments: binding?.adjustments, referenceCount: referenceCount()})};
}
const shownPrompt = () => $('#armorPrompt')?.value || '';

function lockHtml(lock) {
  const items = [['Silhueta imutável', lock.silhouette], ['Componentes obrigatórios', lock.required_components.map((k) => ALL_COMPONENTS.find(([x]) => x === k)?.[1] || k).join(', ') || 'Nenhum marcado'], ['Elmo', lock.helmet], ['Ombreiras', lock.pauldrons], ['Peitoral', lock.chest], ['Paleta', [lock.palette?.primary, lock.palette?.secondary, lock.palette?.details].filter(Boolean).join(' · ')], ['Materiais', lock.materials], ['Ornamentos identificadores', lock.identifying_ornaments.join(' | ') || 'Nenhum'], ['Proporções e articulações', lock.proportions], ['Referências aprovadas', `${lock.reference_ids.length} imagem(ns)`]];
  return `<details data-key="lock" open><summary>ARMOR DESIGN LOCK · ${esc(lock.locked_at)}</summary><dl class="af-lock">${items.map(([k, t]) => `<dt>${esc(k)}</dt><dd>${esc(t)}</dd>`).join('')}</dl></details>`;
}
function statusCard() {
  const v = version(), all = latestVersions(store, projectId), issues = approvalIssues(v, components(), references(), generations());
  const actions = {DRAFT: [['IN_REVIEW', 'Enviar para revisão', 'primary'], ['ARCHIVED', 'Arquivar', '']], IN_REVIEW: [['APPROVED', 'Aprovar e travar design', 'primary'], ['DRAFT', 'Devolver para rascunho', ''], ['ARCHIVED', 'Arquivar', '']], APPROVED: [['CANONICAL', 'Tornar canônica', 'primary'], ['ARCHIVED', 'Arquivar', '']], CANONICAL: [['ARCHIVED', 'Arquivar', '']], ARCHIVED: [['RESTORE', 'Restaurar', '']]}[v.status];
  const reviewing = v.status === 'IN_REVIEW' || v.status === 'DRAFT';
  return `<div class="af-card"><h2>Versão e aprovação</h2>
    <ul class="af-versions">${all.map((x) => `<li><button type="button" data-version="${esc(x.id)}" aria-current="${x.id === versionId}"><span>v${x.number}${x.note ? ` · ${esc(x.note)}` : ''}</span>${statusBadge(x.status)}</button></li>`).join('')}</ul>
    ${reviewing ? [...issues.blocks.map((t) => `<p class="af-block">${esc(t)}</p>`), ...issues.warnings.map((t) => `<p class="af-warn">${esc(t)}</p>`)].join('') : ''}
    <label>Nota da decisão ou da nova versão<input id="decisionNote" placeholder="Por que esta decisão"></label>
    <div class="af-row">${actions.map(([to, label, cls]) => `<button type="button" data-transition="${to}" class="${cls}"${to === 'APPROVED' && issues.blocks.length ? ' disabled title="Resolva os itens em vermelho"' : ''}>${esc(label)}</button>`).join('')}<button type="button" data-new-version>Nova versão</button></div>
    ${v.lock ? lockHtml(v.lock) : ''}</div>`;
}
function promptCard() {
  const built = promptFor(), binds = bindingsOf();
  const extra = mode === 'detail' ? `<label>Componente em foco<select data-focus>${options(ALL_COMPONENTS.map(([k, l]) => [k, l]), focusKey)}</select></label>` : mode === 'equipped' ? `<label>Carta vinculada<select data-binding>${options([['', 'Escolha'], ...binds.map((b) => [b.id, `${b.card_name || b.card_id} (${b.variant})`])], bindingId)}</select></label>` : '';
  const isolated = ISOLATED_MODES.has(mode) ? '<p class="af-note">Geração isolada: nunca desenha pessoa usando a armadura.</p>' : '';
  return `<div class="af-card"><h2>Prompts em inglês</h2>
    <div class="af-tabs" role="tablist">${MODES.map(([id, label]) => `<button type="button" role="tab" aria-selected="${id === mode}" data-mode="${id}">${esc(label)}</button>`).join('')}</div>
    ${isolated}${extra}
    ${built.blocked ? `<p class="af-warn">${esc(built.blocked)}</p>` : `<textarea id="armorPrompt" class="af-prompt" rows="16" spellcheck="false" translate="no">${esc(typedPrompt ?? built.text)}</textarea>
    <div class="af-row"><button type="button" class="primary" data-prompt="copy">Copiar prompt</button><button type="button" data-prompt="gpt">Abrir no ChatGPT</button><button type="button" data-prompt="save">Guardar no histórico</button>${typedPrompt !== null ? '<button type="button" data-prompt="reset">Voltar ao prompt gerado</button>' : ''}</div>`}</div>`;
}
function checksHtml(g) {
  const summary = consistencySummary(g), checks = g.consistency?.checks || {};
  return `<details data-key="check-${g.id}"${summary.state === 'DIVERGENT' ? ' open' : ''}><summary>Verificar consistência</summary>
    <p class="${summary.state === 'DIVERGENT' ? 'af-block' : 'af-note'}">${esc(summary.text)}</p>
    <div class="af-checks">${LOCK_CHECKS.map(([key, label]) => `<label>${esc(label)}<select data-check="${g.id}" data-check-key="${key}">${options(CHECK_VALUES, checks[key] || '')}</select></label>`).join('')}</div>
    <label>Observação<input data-check-note="${g.id}" value="${esc(g.consistency?.note || '')}"></label></details>`;
}
function shotHtml(g) {
  const label = MODES.find(([id]) => id === g.mode)?.[1] || 'Arte de carta', ref = Object.values(store.references).find((r) => r.generation_id === g.id), locked = version().lock?.reference_ids.includes(ref?.id);
  const summary = consistencySummary(g);
  const refButton = !g.image ? '' : locked ? '<span>Referência do lock</span>' : version().lock ? '<span>Fora do lock: não altera o design</span>' : ISOLATED_MODES.has(g.mode) ? `<button type="button" data-ref-toggle="${g.id}">${ref?.approved ? 'Tirar das referências' : 'Marcar como referência aprovada'}</button>` : '';
  return `<article class="af-shot" data-generation="${g.id}" data-consistency="${summary.state}"><b>${esc(label)}${g.card_name ? ` · ${esc(g.card_name)}` : ''}</b>
    ${g.image ? `<a href="${imageUrl(g.image)}" target="_blank" rel="noopener"><img src="${imageUrl(g.image)}" alt="${esc(label)}" loading="lazy"></a>` : `<div class="af-noimg">Só prompt</div><label>Registrar imagem<input type="file" data-attach="${g.id}" accept="image/png,image/jpeg,image/webp"></label>`}
    <span>${esc(g.created_at)}</span>${refButton}
    <details><summary>Prompt usado</summary><textarea readonly rows="6">${esc(g.prompt)}</textarea></details>
    ${g.image && version().lock ? checksHtml(g) : ''}</article>`;
}
function galleryCard() {
  const list = generations(), diverging = list.filter((g) => consistencySummary(g).state === 'DIVERGENT').length;
  return `<div class="af-card"><h2>Imagens e prompts desta versão</h2>
    ${promptFor().text ? `<label>Registrar imagem gerada com o prompt acima<input type="file" id="registerImage" accept="image/png,image/jpeg,image/webp"></label>
    <p class="af-note">O Card Forge não gera a imagem: cole o prompt no gerador${referenceCount() ? ', anexe as referências aprovadas' : ''} e registre o resultado aqui.${version().lock ? ' Imagem nova nunca altera o design aprovado.' : ''}</p>` : ''}
    ${diverging ? `<p class="af-block">${diverging} imagem(ns) com divergência em relação ao lock: revisar.</p>` : ''}
    ${version().lock ? '<p class="af-note">A verificação é feita por você olhando a imagem. O sistema não confirma correspondência sozinho.</p>' : ''}
    <div class="af-gallery">${list.map(shotHtml).join('') || '<p class="af-note">Nenhum prompt ou imagem registrado.</p>'}</div></div>`;
}
function referencesCard() {
  const own = references();
  return `<div class="af-card"><h2>Referências</h2>
    <div class="af-gallery">${own.map((r) => `<article class="af-shot"><b>${esc(r.kind)}</b>${r.image ? `<a href="${imageUrl(r.image)}" target="_blank" rel="noopener"><img src="${imageUrl(r.image)}" alt="Referência" loading="lazy"></a>` : ''}<span>${r.approved ? 'Aprovada' : 'Não aprovada'}${version().lock?.reference_ids.includes(r.id) ? ' · no lock' : ''}</span>${editableRefs() && !r.generation_id ? `<button type="button" data-ref-approve="${r.id}">${r.approved ? 'Tirar da aprovação' : 'Aprovar referência'}</button>` : ''}${r.note ? `<span>${esc(r.note)}</span>` : ''}</article>`).join('') || '<p class="af-note">Nenhuma. Marque uma imagem acima ou envie uma externa.</p>'}</div>
    <label>Enviar referência externa<input type="file" id="externalRef" accept="image/png,image/jpeg,image/webp"></label></div>`;
}
const editableRefs = () => ['DRAFT', 'IN_REVIEW'].includes(version().status);
function bindingsCard() {
  const v = version(), list = bindingsOf();
  return `<div class="af-card"><h2>Cartas e artes vinculadas</h2>
    <ul class="af-binds">${list.map((b) => { const bound = store.versions[b.version_id]; return `<li><span translate="no">${esc(b.card_name || b.card_id)} · ${esc(b.variant)} · v${bound?.number} ${statusBadge(bound?.status || 'DRAFT')}${b.adjustments ? ` · ${esc(b.adjustments)}` : ''}</span><span class="af-row">${b.version_id !== versionId ? `<button type="button" data-rebind="${b.id}">Apontar para v${v.number}</button>` : ''}<button type="button" data-unbind="${b.id}">Desvincular</button></span></li>`; }).join('') || '<li class="af-note">Sem vínculos. A mesma armadura pode servir a várias cartas.</li>'}</ul>
    <label>Carta<input id="bindCard" list="cardList" placeholder="Id ou nome da carta"></label>
    <label>Arte<select id="bindVariant">${options(VARIANTS, 'default')}</select></label>
    <label>Ajuste ao personagem (proporção, encaixe, articulação)<input id="bindAdjust" placeholder="Taller and leaner than the armature; same plates"></label>
    <div class="af-row"><button type="button" data-bind>Vincular à v${v.number}</button></div>
    ${v.lock ? '' : '<p class="af-note">Sem aprovação, a arte usa o estado atual: mudar a armadura muda o próximo prompt.</p>'}</div>`;
}
function historyCard() {
  const rows = (project().history || []).slice().reverse();
  return `<div class="af-card"><h2>Histórico e decisões</h2><ul class="af-history">${rows.map((h) => `<li>${esc(h.at)} · ${esc(h.action)}${h.version_id ? ` · ${esc(h.version_id)}` : ''}${h.frm ? ` · ${esc(h.frm)} para ${esc(h.to)}` : ''}${h.card_id ? ` · ${esc(h.card_id)}` : ''}${h.note ? ` · ${esc(h.note)}` : ''}</li>`).join('')}</ul></div>`;
}
function renderSide() {
  const el = $('#side');
  if (!version()) { el.innerHTML = ''; return; }
  const open = new Set([...el.querySelectorAll('details[open]')].map((d) => d.dataset.key).filter(Boolean)), scroll = window.scrollY;
  // O prompt é o resultado principal; aprovação, imagens e vínculos ficam guardados para quando forem usados.
  el.innerHTML = `${promptCard()}<div class="af-card"><details data-key="more"><summary>Aprovação, imagens e vínculos (opcional) · v${version().number} ${statusBadge(version().status)}</summary><div class="af-more">${statusCard()}${galleryCard()}${referencesCard()}${bindingsCard()}${historyCard()}</div></details></div>`;
  for (const d of el.querySelectorAll('details[data-key]')) if (open.has(d.dataset.key)) d.open = true;
  window.scrollTo(0, scroll);
}
function render() {
  renderList(); renderEditor(); renderSide(); renderPipeline();
  if (project()) history.replaceState(null, '', `?project=${encodeURIComponent(projectId)}&version=${encodeURIComponent(versionId)}`);
  $('#backToForge').href = project()?.origin_card_id ? `index.html?card=${encodeURIComponent(project().origin_card_id)}` : 'index.html';
}
function refreshPrompt() {
  const box = $('#armorPrompt');
  if (box && typedPrompt === null) { const built = promptFor(); if (built.text) box.value = built.text; }
}

$('#editor').addEventListener('input', (e) => {
  const t = e.target, v = version();
  if (!v || !editableNow()) return;
  if (t.dataset.spec) { v.spec[t.dataset.spec] = t.value; if (t.dataset.spec === 'faction') return afterMode(); }
  else if (t.dataset.fieldValue) v.spec.fields[t.dataset.fieldValue].value = t.value;
  else if (t.dataset.compValue) store.components[t.dataset.compValue].value = t.value;
  else return;
  scheduleSave(); refreshPrompt();
});
function afterMode() { scheduleSave(); renderEditor(); refreshPrompt(); }
$('#editor').addEventListener('change', (e) => {
  const t = e.target, v = version();
  if (!v || !editableNow()) return;
  if (t.dataset.fieldMode) { v.spec.fields[t.dataset.fieldMode].mode = t.value; return afterMode(); }
  if (t.dataset.compMode) { store.components[t.dataset.compMode].mode = t.value; return afterMode(); }
  if ('divine' in t.dataset) { v.spec.divine = t.checked; return afterMode(); }
  if (t.dataset.compReq) { store.components[t.dataset.compReq].required = t.checked; scheduleSave(); refreshPrompt(); renderSide(); }
});

async function recordGeneration(prompt) {
  const binding = mode === 'equipped' ? store.bindings[bindingId] : null;
  const same = generations().find((g) => g.mode === mode && g.prompt === prompt && !g.image);
  if (same) return same.id;
  const made = await api('generation', {version_id: versionId, mode, prompt, card_id: binding?.card_id || '', card_name: binding?.card_name || '', variant: binding?.variant || ''});
  return made.generation_id;
}
async function uploadImage(id, file) {
  if (!file) return;
  const r = await fetch(`/api/armor-forge/image/${encodeURIComponent(id)}`, {method: 'POST', body: file});
  const data = await r.json();
  if (!r.ok) throw new Error(data.erro || 'Imagem recusada.');
  store = data.store;
}
async function copyPrompt() {
  const box = $('#armorPrompt');
  try { await navigator.clipboard.writeText(box.value); return true; } catch {}
  box.select();
  try { return document.execCommand('copy'); } catch { return false; }
}
async function runTransition(to) {
  await flushSave();
  const note = $('#decisionNote')?.value || '', payload = {version_id: versionId, to, note};
  if (to === 'APPROVED') {
    const refs = references().filter((r) => r.approved && r.image).map((r) => r.id);
    payload.lock = buildLock(computeDesign(version().spec, components(), ctxOf()), refs);
  }
  let done = await api('transition', payload);
  if (done.conflict && to === 'CANONICAL') {
    if (!window.confirm(`${done.erro} A anterior continua guardada e travada.`)) return say('A versão canônica ficou como estava.');
    done = await api('transition', {...payload, replace_canonical: true});
  }
  if (done.conflict) return say(done.erro, true);
  say(`Versão ${version().number}: ${STATE_LABELS[version().status]}.`);
  typedPrompt = null;
  render();
}
const cardFromInput = (text) => {
  const value = text.trim(), id = value.split(/\s+/)[0];
  const found = cards.find((c) => c.id === id) || cards.find((c) => c.nome_exibicao_en?.toUpperCase() === value.toUpperCase());
  if (found) return {card_id: found.id, card_name: found.nome_exibicao_en};
  if (entryCard?.id === id) return {card_id: id, card_name: entryCard.name};
  return /^[a-z0-9][a-z0-9-]*$/.test(id) ? {card_id: id, card_name: id} : null;
};

$('#side').addEventListener('input', (e) => {
  if (e.target.id === 'armorPrompt') { const built = promptFor(); typedPrompt = e.target.value === built.text ? null : e.target.value; }
});
$('#side').addEventListener('change', async (e) => {
  const t = e.target;
  try {
    if (t.dataset.focus !== undefined) { focusKey = t.value; typedPrompt = null; return renderSide(); }
    if (t.dataset.binding !== undefined) { bindingId = t.value; typedPrompt = null; return renderSide(); }
    if (t.id === 'registerImage' && t.files[0]) {
      await flushSave();
      await uploadImage(await recordGeneration(shownPrompt()), t.files[0]);
      say('Imagem registrada no projeto.');
      return render();
    }
    if (t.dataset.attach && t.files[0]) { await uploadImage(t.dataset.attach, t.files[0]); say('Imagem registrada no projeto.'); return render(); }
    if (t.id === 'externalRef' && t.files[0]) {
      const made = await api('reference', {version_id: versionId, kind: 'external', note: t.files[0].name, approved: editableRefs()});
      await uploadImage(made.reference_id, t.files[0]);
      say(version().lock ? 'Referência guardada fora do lock.' : 'Referência externa guardada.');
      return render();
    }
    if (t.dataset.check || t.dataset.checkNote) {
      const id = t.dataset.check || t.dataset.checkNote, shot = t.closest('[data-generation]');
      const checks = Object.fromEntries([...shot.querySelectorAll('[data-check]')].map((s) => [s.dataset.checkKey, s.value]));
      await api('consistency', {generation_id: id, checks, note: shot.querySelector('[data-check-note]').value});
      say('Verificação gravada.');
      return renderSide();
    }
  } catch (error) { fail(error); t.value = ''; }
});
$('#side').addEventListener('click', async (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  const d = button.dataset;
  try {
    if (d.mode) { mode = d.mode; typedPrompt = null; return renderSide(); }
    if (d.version) { await flushSave(); versionId = d.version; typedPrompt = null; bindingId = ''; return render(); }
    if (d.transition) return await runTransition(d.transition);
    if (d.newVersion !== undefined) {
      await flushSave();
      const done = await api('version-new', {from_version_id: versionId, note: $('#decisionNote').value});
      versionId = done.version_id; typedPrompt = null;
      say(`Versão ${version().number} criada. A anterior continua guardada.`);
      return render();
    }
    if (d.prompt === 'reset') { typedPrompt = null; return renderSide(); }
    if (d.prompt) {
      await flushSave();
      const prompt = shownPrompt();
      await recordGeneration(prompt);
      const copied = d.prompt === 'save' ? true : await copyPrompt();
      if (d.prompt === 'gpt') window.open(GPT_URL, '_blank', 'noopener');
      say(d.prompt === 'save' ? 'Prompt guardado no histórico.' : copied ? 'Prompt copiado e guardado no histórico.' : 'Prompt guardado: selecione o texto para copiar.', !copied);
      renderSide();
      renderPipeline();
      return undefined;
    }
    if (d.refToggle) {
      const ref = Object.values(store.references).find((r) => r.generation_id === d.refToggle && r.version_id === versionId);
      if (ref) await api('reference-update', {id: ref.id, approved: !ref.approved});
      else await api('reference', {version_id: versionId, generation_id: d.refToggle, approved: true});
      return renderSide();
    }
    if (d.refApprove) { await api('reference-update', {id: d.refApprove, approved: !store.references[d.refApprove].approved}); return renderSide(); }
    if (d.bind !== undefined) {
      const card = cardFromInput($('#bindCard').value);
      if (!card) return say('Escreva o id ou o nome de uma carta.', true);
      const made = await api('binding', {...card, variant: $('#bindVariant').value, version_id: versionId, adjustments: $('#bindAdjust').value, armor_type: version().lock?.family || '', use: true});
      bindingId = made.binding_id;
      say(`Armadura vinculada a ${card.card_name}.`);
      return renderSide();
    }
    if (d.rebind) { const b = store.bindings[d.rebind]; await api('binding', {card_id: b.card_id, card_name: b.card_name, variant: b.variant, version_id: versionId, adjustments: b.adjustments, armor_type: b.armor_type, use: b.use}); say('Vínculo apontado para esta versão.'); return renderSide(); }
    if (d.unbind) { await api('binding-delete', {id: d.unbind}); if (bindingId === d.unbind) bindingId = ''; say('Vínculo removido. A armadura continua no projeto.'); return renderSide(); }
  } catch (error) { fail(error); }
  return undefined;
});
$('#projects').addEventListener('click', async (e) => {
  const id = e.target.closest('[data-project]')?.dataset.project;
  if (id) { await flushSave(); bindingId = ''; select(id); }
});
$('#search').addEventListener('input', renderList);
$('#stateFilter').addEventListener('change', renderList);
$('#newProject').addEventListener('click', () => openNew());
function openNew(given = {}) {
  const values = {faction: entryCard?.faction, card: entryCard?.id || '', ...given}, form = $('#newDialog form');
  form.name.value = values.name || '';
  form.faction.value = FACTIONS.includes(values.faction) ? values.faction : 'Neutral';
  form.family.value = values.family || {Athena: 'Cloth', Poseidon: 'Scale', Hades: 'Surplice', Ares: 'Warplate', Artemis: 'Moonplate'}[form.faction.value] || 'Sacred Armor';
  form.card.value = values.card || '';
  $('#newDialog').showModal();
}
$('#newDialog').addEventListener('close', async () => {
  if ($('#newDialog').returnValue !== 'create') return;
  const form = $('#newDialog form'), card = form.card.value.trim() ? cardFromInput(form.card.value) : null;
  try {
    const done = await api('project', {spec: newSpec({name: form.name.value, faction: form.faction.value, fields: {family: {mode: 'manual', value: form.family.value}, ...(card ? {bearer: {mode: 'manual', value: card.card_name}} : {})}}), components: newComponents(), origin: card || {}});
    // Quem veio de uma carta já sai vinculado e a arte já pode usar a armadura.
    if (card) await api('binding', {...card, variant: 'default', version_id: done.version_id, use: true});
    say('Projeto criado em rascunho. Defina a armadura, sem portador.');
    select(done.project_id, done.version_id);
  } catch (error) { fail(error); }
});
$('#seedExample').addEventListener('click', async () => {
  try {
    const done = await api('project', {id: PYTHON_WARPLATE.id, spec: PYTHON_WARPLATE.spec, components: PYTHON_WARPLATE.components, origin: PYTHON_WARPLATE.origin});
    await api('binding', {...PYTHON_WARPLATE.origin, variant: 'default', version_id: done.version_id, use: true});
    await api('binding', {card_id: 'ares-v6-280', card_name: 'PYTHON WARPLATE', variant: 'default', version_id: done.version_id, use: true}); // a carta de Equipment com o mesmo nome
    say('PYTHON WARPLATE criado em rascunho: gere o conceito, depois a ficha técnica.');
    select(done.project_id, done.version_id);
  } catch (error) { fail(error); }
});
window.addEventListener('beforeunload', () => { if (savePending) flushSave(); });

(async function start() {
  $('#stateFilter').innerHTML = options([['', 'Todos'], ...STATES.map((s) => [s, STATE_LABELS[s]])], '');
  const form = $('#newDialog form');
  form.faction.innerHTML = options(FACTIONS.map((f) => [f, f]), 'Neutral');
  form.family.innerHTML = options(FAMILIES, 'Warplate');
  try {
    const [state, catalog] = await Promise.all([fetch('/api/armor-forge').then((r) => { if (!r.ok) throw new Error(); return r.json(); }), fetch('/data/cards.json').then((r) => r.json())]);
    store = state; cards = catalog.cartas || [];
  } catch { return say('Não consegui ler as armaduras: abra pelo servidor local e reinicie o card-forge.', true); }
  $('#cardList').innerHTML = cards.map((c) => `<option value="${esc(c.id)}">${esc(c.nome_exibicao_en)}</option>`).join('');
  const q = new URLSearchParams(location.search), wanted = q.get('project');
  if (q.get('card')) entryCard = {id: q.get('card'), name: q.get('name') || q.get('card'), faction: q.get('faction')};
  const bound = entryCard && !wanted && Object.values(store.bindings).find((b) => b.card_id === entryCard.id && store.projects[b.project_id]);
  if (wanted && store.projects[wanted]) select(wanted, store.versions[q.get('version')]?.project_id === wanted ? q.get('version') : null);
  else if (bound) select(bound.project_id, bound.version_id);
  else if (entryCard && !q.get('new')) { render(); say(`${entryCard.name} ainda não tem armadura: use Nova armadura ou escolha uma da lista.`); }
  else { const first = Object.values(store.projects).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]; if (first && !q.get('new')) select(first.id); else render(); }
  if (q.get('new')) openNew();
})();
