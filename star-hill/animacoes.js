// STAR HILL · Gestor de animações: efeitos, padrões do jogo, facções e cartas, em data/card-animations.json (playtest/divine/pixel-vfx.js toca).
// A carta passa por cima da facção, e a facção por cima do padrão, como nos sons. A linha de cada habilidade também se escolhe no Card Forge, aba Som.
import {ANIM_MOMENTS, ELEMENT_COLOR, allEffects, catalogNow, importVfx, editVfx, loadAnims, animsNow, saveAnim, openAnimPreview, openAnimPicker, animLabel} from '/shared/anim-picker.js?v=4';
import {categoryOf} from '/shared/anim-picker.js?v=4';
import {CATEGORIES} from '/shared/vfx/presets.js';
import {composerSection, composerMounted, livingSection, holoSection} from './animacoes-composer.js?v=1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FACCOES = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
let root = null, hooks = null, cards = [], faccao = 'Athena', cardId = '', busca = '';

const entryOf = id => ({linhas: [], ...animsNow()[id]});
const tune = id => ({ligado: true, tamanho: 1, velocidade: 1, cor: null, ...animsNow().efeitos?.[id]});
async function save(id, patch) {
  try { await saveAnim(id, patch); draw(); hooks.notice('Animação salva. Use Publicar no site para levar ao jogo online.', true); } catch (e) { hooks.notice(e.message); }
}
const chooser = (id, key, value, herda) => `<div class="tl-chooser${value == null ? ' is-empty' : ''}"><button type="button" class="tl-chooser__pick" data-an="pick" data-id="${esc(id)}" data-k="${key}" data-herda="${esc(herda)}">${esc(animLabel(value, herda))}</button>
  <button type="button" data-an="test" data-fx="${value || ''}" aria-label="Testar" title="Testar" ${value ? '' : 'disabled'}>▶</button><button type="button" data-an="clear" data-id="${esc(id)}" data-k="${key}" aria-label="Tirar" title="Tirar" ${value == null ? 'disabled' : ''}>✕</button></div>`;
const moments = (id, herda) => { const v = animsNow()[id] || {}; return ANIM_MOMENTS.map(([k, nome, quando]) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(nome)}<small>${esc(quando)}</small></span></div>${chooser(id, k, v[k], herda)}</div>`).join(''); };

// Catálogo: todas as fontes juntas, com origem, licença e acesso à vista. Só entra efeito gratuito (autor, 04/11/2026).
const ACESSO = {gratis: 'Grátis', limitado: 'Grátis com limite'};
const TIPOS = ['golpe', 'impacto', 'explosao', 'fogo', 'gelo', 'raio', 'veneno', 'luz', 'trevas', 'cura', 'aura', 'escudo', 'energia', 'magia', 'projetil', 'clima', 'outro'];
const TIPO_FIXO = {slash: 'golpe', impact: 'impacto', ice: 'gelo', fire: 'fogo', lightning: 'raio', poison: 'veneno', light: 'luz', dark: 'trevas', explosion: 'explosao', energy: 'energia', shield: 'escudo', heal: 'cura', power: 'aura', muzzle: 'projetil', blood: 'impacto', pickup: 'luz', dash: 'golpe', blink: 'magia', sparkle: 'luz', rain: 'clima', snow: 'clima', fog: 'clima', embers: 'clima', fireflies: 'clima', leaves: 'clima', bubbles: 'clima'};
let filtro = {fonte: '', tipo: '', faccao: '', gatilho: '', q: '', categoria: ''};
const fonteNome = f => catalogNow().fontes?.[f]?.nome || f;
const options = (list, value, all) => `<option value="">${all}</option>${list.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
const matches = e => (!filtro.categoria || categoryOf(e) === filtro.categoria) && (!filtro.fonte || e.fonte === filtro.fonte) && (!filtro.tipo || (e.tipo || TIPO_FIXO[e.id]) === filtro.tipo) && (!filtro.faccao || e.faccoes?.includes(filtro.faccao)) && (!filtro.gatilho || e.gatilhos?.includes(filtro.gatilho)) && (!filtro.q || e.nome.toLowerCase().includes(filtro.q.toLowerCase()));
const checks = (name, list, on) => list.map(([v, t]) => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${on?.includes(v) ? 'checked' : ''}> ${esc(t)}</label>`).join('');
const factionList = () => FACCOES.map(f => [f.toLowerCase(), f]);
const triggerList = () => ANIM_MOMENTS.map(([k, n]) => [k, n]);
function effectRows() {
  const list = allEffects().filter(matches);
  const unavailable = CATEGORIES.find(c => c.id === filtro.categoria && c.disponivel === false);
  if (unavailable) return `<p class="hint">${esc(unavailable.nome)}: tipo reconhecido, ainda sem runtime. Falta arte em camadas (PSD); ver docs/vfx-forge-v3.md.</p>`;
  return `<p class="hint">${list.length} de ${allEffects().length} efeitos.</p>${list.map(e => { if (e.id.includes(':')) return `<div class="an-row"><b>${esc(e.nome)}<small>${esc(fonteNome(e.fonte))} · ${esc(e.licenca)} · ${esc(e.tamanho)} · ${esc(e.compat)}${e.aplicacao ? ` · ${esc(e.aplicacao)}` : ''}</small></b><button type="button" data-an="test" data-fx="${esc(e.id)}">▶ Testar</button></div>`; const t = tune(e.id), own = e.arquivo; return `<div class="an-row${t.ligado ? '' : ' is-off'}"><input type="checkbox" class="tl-switch" role="switch" aria-label="Ligar ${esc(e.nome)}" data-tune="${esc(e.id)}" data-field="ligado" ${t.ligado ? 'checked' : ''}><b>${esc(e.nome)}<small>${esc(fonteNome(e.fonte))} · ${esc(e.licenca)} · ${ACESSO[e.acesso] || e.acesso}</small></b>
      <button type="button" data-an="test" data-fx="${esc(e.id)}">▶ Testar</button>
      <label class="tl-speed">Tamanho <input type="range" min="0.5" max="2" step="0.1" data-tune="${esc(e.id)}" data-field="tamanho" value="${t.tamanho}"><b>${t.tamanho}×</b></label>
      <label class="tl-speed">Velocidade <input type="range" min="0.25" max="2" step="0.25" data-tune="${esc(e.id)}" data-field="velocidade" value="${t.velocidade}"><b>${t.velocidade}×</b></label>
      ${own ? `<details class="an-meta" data-vfx="${esc(e.id)}"><summary>Categorias</summary><label>Tipo <select name="tipo">${TIPOS.map(x => `<option ${x === e.tipo ? 'selected' : ''}>${x}</option>`).join('')}</select></label><fieldset><legend>Facção</legend>${checks('faccoes', factionList(), e.faccoes)}</fieldset><fieldset><legend>Gatilho</legend>${checks('gatilhos', triggerList(), e.gatilhos)}</fieldset>${e.origem ? `<small>Origem: ${esc(e.origem)}</small>` : ''}<small>Hash: ${esc(e.hash.slice(0, 16))}…</small></details>` : `<label class="tl-speed">Cor <input type="color" data-tune="${esc(e.id)}" data-field="cor" value="${esc(t.cor || ELEMENT_COLOR[e.id] || '#e0bb62')}">${t.cor ? `<button type="button" data-an="cor-reset" data-fx="${esc(e.id)}">padrão</button>` : ''}</label>`}</div>`; }).join('')}`;
}
function efeitos() {
  const fontes = Object.entries(catalogNow().fontes || {});
  return `<section class="panel tl"><div class="tl-head"><h2>Fontes</h2><span class="tag">Só animações gratuitas</span></div>
      ${fontes.map(([id, f]) => { const n = allEffects().filter(e => e.fonte === id).length; return `<div class="an-source"><b>${esc(f.nome)}</b><span class="tag">${ACESSO[f.acesso] || f.acesso}</span><span class="tag">${n} efeitos</span><small>${esc(f.estado)} Licença: ${esc(f.licenca)}.</small></div>`; }).join('')}</section>
    <section class="panel tl"><div class="tl-head"><h2>Importar efeito</h2><span class="tag">Fica no projeto, sem serviço externo</span></div>
      <form id="an-import" class="an-import">
        <label class="tl-field"><span>Arquivo: PNG, sprite sheet, GIF, WebP, APNG ou ZIP de PNGs</span><input type="file" name="arquivo" accept=".png,.apng,.gif,.webp,.zip" required></label>
        <label class="tl-field"><span>JSON do sprite sheet (opcional)</span><input type="file" name="json" accept=".json"></label>
        <label class="tl-field"><span>Nome</span><input name="nome" maxlength="60" required></label>
        <label class="tl-field"><span>Fonte</span><select name="fonte" required>${fontes.filter(([id]) => id !== 'sprite-fusion' && id !== 'particlr').map(([id, f]) => `<option value="${esc(id)}">${esc(f.nome)}</option>`).join('')}</select></label>
        <label class="tl-field"><span>Licença</span><input name="licenca" maxlength="200" required placeholder="Ex.: CC0-1.0"></label>
        <label class="tl-field"><span>Acesso</span><select name="acesso"><option value="gratis">Grátis</option><option value="limitado">Grátis com limite</option></select></label>
        <label class="tl-field"><span>De onde veio (link)</span><input name="origem" maxlength="300"></label>
        <label class="tl-field"><span>Tipo</span><select name="tipo">${TIPOS.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="tl-field"><span>Colunas (sheet sem JSON)</span><input name="colunas" type="number" min="1"></label>
        <label class="tl-field"><span>Linhas (sheet sem JSON)</span><input name="linhas" type="number" min="1"></label>
        <label class="tl-field"><span>Quadros por segundo (opcional)</span><input name="fps" type="number" min="1" max="60"></label>
        <label class="an-loop"><input type="checkbox" name="loop"> Repete em loop</label>
        <button type="submit">Importar</button><output class="hint" id="an-import-result"></output>
      </form></section>
    <section class="panel tl"><div class="tl-head"><h2>Efeitos</h2><span class="tag">${allEffects().length} efeitos</span></div><p class="hint">Vale para todo o jogo. Efeito desligado não aparece em nenhum momento.</p>
      <div class="an-filters"><input type="search" data-filtro="q" value="${esc(filtro.q)}" placeholder="Buscar efeito" aria-label="Buscar efeito">
        <select data-filtro="categoria" aria-label="Categoria">${options(CATEGORIES.map(c => [c.id, c.nome]), filtro.categoria, 'Todas as categorias')}</select>
        <select data-filtro="fonte" aria-label="Fonte">${options(fontes.map(([id, f]) => [id, f.nome]), filtro.fonte, 'Todas as fontes')}</select>
        <select data-filtro="tipo" aria-label="Tipo">${options(TIPOS.map(x => [x, x]), filtro.tipo, 'Todos os tipos')}</select>
        <select data-filtro="faccao" aria-label="Facção">${options(factionList(), filtro.faccao, 'Todas as facções')}</select>
        <select data-filtro="gatilho" aria-label="Gatilho">${options(triggerList(), filtro.gatilho, 'Todos os gatilhos')}</select></div>
      <div id="an-effects">${effectRows()}</div></section>`;
}
function porCarta() {
  const q = busca.trim().toLowerCase(), v = animsNow();
  const list = cards.filter(c => !q ? v[c.id] : `${c.nome_exibicao_en} ${c.id}`.toLowerCase().includes(q)).slice(0, 60), card = cards.find(c => c.id === cardId);
  const lines = card?.habilidades_pt?.length ? card.habilidades_pt : card?.habilidades_en || [], own = card && (v[card.id]?.linhas || []);
  return `<section class="panel tl"><div class="tl-head"><h2>Por carta</h2><span class="tag">A carta passa por cima da facção</span></div>
    <label class="tl-field"><span>Buscar carta (vazio: as que já têm animação)</span><input id="an-busca" type="search" value="${esc(busca)}" placeholder="Nome ou código"></label>
    <div class="an-cards">${list.map(c => `<button type="button" data-an="card" data-id="${c.id}" aria-pressed="${c.id === cardId}">${esc(c.nome_exibicao_en)}</button>`).join('') || '<p class="hint">Nenhuma carta.</p>'}</div>
    ${card ? `<h3>${esc(card.nome_exibicao_en)} · habilidades</h3>${lines.map((t, i) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(String(t).split(/ — |\n/)[0].slice(0, 60))}</span></div>${chooser(card.id, `linha:${i}`, own[i], 'habilidade da carta')}</div>`).join('') || '<p class="hint">Esta carta não tem habilidades.</p>'}
      ${livingSection(card)}<h3>Momentos</h3>${moments(card.id, 'facção')}` : ''}</section>`;
}
function page() {
  return `<section class="panel tl"><div class="tl-head"><h2>Padrões do jogo</h2><span class="tag">Vale para toda carta sem escolha própria</span></div>${moments('padrao', 'sem animação nova')}</section>
    <section class="panel tl"><div class="tl-head"><h2>Por facção</h2><span class="tag">Passa por cima do padrão</span></div>
      <div class="tl-faccao-tabs" role="group" aria-label="Facção">${FACCOES.map(f => `<button type="button" data-an="faccao" data-f="${f}" aria-pressed="${f === faccao}">${f}</button>`).join('')}</div>${moments(`faccao-${faccao.toLowerCase()}`, 'padrão')}</section>
    ${porCarta()}${composerSection()}${holoSection()}${efeitos()}`;
}
function draw() {
  const y = scrollY;
  root.innerHTML = page();
  composerMounted(cards, draw, hooks.notice);
  scrollTo(0, y);
}
export async function mountAnimacoes(el, {notice}) {
  root = el; hooks = {notice};
  if (!document.querySelector('link[data-anim-picker]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-picker.css?v=2'}));
  const [, exported] = await Promise.all([loadAnims(), fetch(`../card-forge/art-web/cards.json?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json())]);
  cards = exported.cartas;
  draw();
}
function setChoice(id, key, value) {
  const entry = entryOf(id);
  if (key.startsWith('linha:')) { const i = Number(key.slice(6)), l = [...entry.linhas]; l[i] = value; for (let j = 0; j < l.length; j++) l[j] ??= null; return save(id, {...entry, linhas: l}); }
  return save(id, {...entry, [key]: value});
}
const saveTune = (id, patch) => save('efeitos', {efeitos: {...animsNow().efeitos, [id]: {...tune(id), ...patch}}});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-an]');
  if (!b || !root?.contains(b)) return;
  const act = b.dataset.an, {id, k} = b.dataset;
  if (act === 'test') return openAnimPreview(b.dataset.fx, b.closest('.tl-anim')?.querySelector('span')?.firstChild?.textContent || '');
  if (act === 'faccao') { faccao = b.dataset.f; return draw(); }
  if (act === 'card') { cardId = id; return draw(); }
  if (act === 'clear') return setChoice(id, k, null);
  if (act === 'cor-reset') return saveTune(b.dataset.fx, {cor: null});
  if (act === 'pick') {
    const entry = animsNow()[id] || {}, value = k.startsWith('linha:') ? entry.linhas?.[Number(k.slice(6))] : entry[k];
    const what = k.startsWith('linha:') ? b.closest('.tl-anim').querySelector('span').textContent : ANIM_MOMENTS.find(([m]) => m === k)?.[1];
    openAnimPicker({title: 'Escolher animação', alvo: `${id === 'padrao' ? 'Todas as cartas' : id.startsWith('faccao-') ? `Facção ${faccao}` : cards.find(c => c.id === id)?.nome_exibicao_en || id} · ${what}`, value, herda: `Usar: ${b.dataset.herda}`, onPick: v => setChoice(id, k, v)});
  }
});
const readFile = (file, how) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(Error('Não foi possível ler o arquivo.')); r[how](file); });
document.addEventListener('submit', async e => {
  if (e.target.id !== 'an-import') return;
  e.preventDefault();
  const f = new FormData(e.target), out = root.querySelector('#an-import-result'), file = f.get('arquivo'), meta = f.get('json');
  out.textContent = 'Importando…';
  try {
    const num = k => (f.get(k) ? Number(f.get(k)) : undefined);
    const data = await importVfx({nome: f.get('nome'), fonte: f.get('fonte'), licenca: f.get('licenca'), acesso: f.get('acesso'), origem: f.get('origem'), tipo: f.get('tipo'), loop: f.has('loop'), colunas: num('colunas'), linhas: num('linhas'), fps: num('fps'),
      json: meta?.size ? await readFile(meta, 'readAsText') : undefined, arquivo: {nome: file.name, base64: (await readFile(file, 'readAsDataURL')).split(',')[1]}});
    filtro = {fonte: data.efeito.fonte, tipo: '', faccao: '', gatilho: '', q: ''};
    draw();
    hooks.notice(data.duplicado ? `Esse efeito já está no catálogo como ${data.efeito.nome}.` : `${data.efeito.nome} importado: ${data.efeito.quadros} quadros.`, true);
    openAnimPreview(data.efeito.id, data.efeito.nome);
  } catch (error) { out.textContent = error.message; }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (!root?.contains(t)) return;
  if (t.dataset.filtro === 'q') { filtro.q = t.value; root.querySelector('#an-effects').innerHTML = effectRows(); return; }
  if (t.id === 'an-busca') { busca = t.value; const at = t.selectionEnd; draw(); const n = root.querySelector('#an-busca'); n.focus(); n.setSelectionRange(at, at); return; }
  if (t.dataset.tune && t.type === 'range') { const b = t.closest('label').querySelector('b'); if (b) b.textContent = `${t.value}×`; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (!root?.contains(t)) return;
  if (t.dataset.filtro) { filtro[t.dataset.filtro] = t.value; root.querySelector('#an-effects').innerHTML = effectRows(); return; }
  const meta = t.closest('.an-meta');
  if (meta) {
    const value = t.name === 'tipo' ? t.value : [...meta.querySelectorAll(`[name=${t.name}]:checked`)].map(x => x.value);
    editVfx({id: meta.dataset.vfx, [t.name]: value}).then(() => hooks.notice('Categorias salvas.', true)).catch(error => hooks.notice(error.message));
    return;
  }
  if (!t.dataset.tune) return;
  saveTune(t.dataset.tune, {[t.dataset.field]: t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value});
});
