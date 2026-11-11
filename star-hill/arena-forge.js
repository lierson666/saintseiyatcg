// ARENA FORGE 5.0 (autor, 07/11/2026): biblioteca de arenas, variantes, pipeline (rascunho → publicada → arquivada),
// validação automática e histórico com volta de versão. Prévia ao vivo com a mesma cena da partida (playtest/divine/scene.js).
// Regras: shared/arena-model.js. Gravação: card-forge/arena_forge.py (data/arena-library.json + data/arenas-published.json).
// "Publicar" aqui atualiza o manifesto local; o jogo oficial só muda num deploy aprovado pelo autor.
import {createScene, THEMES, DEFAULT_THEMES} from '../playtest/divine/scene.js?v=20261107-af5';
import {STATUS, STATUS_PT, VARIANTS, FACTIONS, canMove, arenaErrors, resolveParams, gate, publish, rollback, startEdit, duplicate, move, BUDGET} from '../shared/arena-model.js?v=20261107-af5';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const MASKS = {0: 'Liso (só mármore)', 1: 'Fendas de lava', 2: 'Flores', 3: 'Placas de bronze', 4: 'Manchas de luar'};
const FALLBACK = {cap: '#d9b25c', glow: '#000000'};
const GROUPS = [
  ['Céu e névoa', [['skyTop', 'Céu (alto)', 'color'], ['skyBottom', 'Céu (horizonte)', 'color'], ['fog', 'Névoa', 'color']]],
  ['Chão', [['floorA', 'Mármore claro', 'color'], ['floorB', 'Mármore escuro', 'color'], ['line', 'Anéis e linhas', 'color'],
    ['mask', 'Desenho', 'mask'], ['glow', 'Brilho do desenho', 'color'], ['pulse', 'Pulso do brilho', 'range', 0, 4, .1],
    ['zodiac', 'Mostrador zodiacal', 'flag'], ['caustics', 'Cáusticas (água)', 'flag']]],
  ['Colunas', [['column', 'Fuste e base', 'color'], ['cap', 'Capitel / copa', 'color'], ['metal', 'Metal', 'range', 0, 1, .05],
    ['broken', 'Quebradas', 'flag'], ['trees', 'Árvores (pinheiros)', 'flag']]],
  ['Luz e partículas', [['light', 'Luz e raios', 'color'], ['dust', 'Partículas', 'color'], ['dustSize', 'Tamanho', 'range', .3, 4, .1],
    ['fall', 'Caem (pétalas)', 'flag'], ['blink', 'Piscam (vaga-lumes)', 'flag']]],
];
const VIEWS = {desktop: ['Desktop', 16 / 9], tablet: ['Tablet', 4 / 3], deitado: ['Celular deitado', 19.5 / 9], empe: ['Celular em pé', 9 / 19.5]};
const BASES = Object.keys(DEFAULT_THEMES);
const EDIT = '__forge';

let ctx, scene, lib, manifest, sel = null, variant = 'standard', tab = 'params', view = 'desktop', quality = 'high', still = false;
let q = '', fFaction = '', fStatus = '', dirty = false, busy = '';

const css = `
.af5 { display: grid; grid-template-columns: 250px minmax(0, 1fr) 330px; gap: 14px; align-items: start; }
.af5-lib, .af5-side { display: grid; gap: 8px; max-height: 80vh; overflow: auto; }
.af5-lib input, .af5-lib select { width: 100%; }
.af5-item { display: grid; grid-template-columns: 54px 1fr; gap: 8px; text-align: left; padding: 6px; border-radius: 8px; border: 1px solid #ffffff1a; background: none; color: inherit; cursor: pointer; }
.af5-item[aria-current="true"] { border-color: currentColor; background: #ffffff10; }
.af5-item img, .af5-item .ph { width: 54px; height: 32px; object-fit: cover; border-radius: 4px; background: #222; }
.af5-item small { display: block; opacity: .75; }
.chip { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 11px; border: 1px solid #ffffff33; margin-right: 4px; }
.chip[data-s="published"] { border-color: #6fd38f; color: #9ff0b8; } .chip[data-s="approved"] { border-color: #8fc4ff; color: #bcdcff; }
.chip[data-s="validation"] { border-color: #ffd36e; color: #ffe39f; } .chip[data-s="archived"] { opacity: .5; }
.af5-stage { display: grid; place-items: center; background: #05060f; border-radius: 12px; padding: 12px; min-height: 380px; }
.af5-frame { position: relative; width: 100%; max-height: 66vh; overflow: hidden; border-radius: 8px; }
.af5-frame .arena-host { position: absolute; inset: 0; }
.af5-frame canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.af5-frame .fx-canvas { pointer-events: none; }
.af5-zone { position: absolute; border: 1px dashed #ffffff55; pointer-events: none; }
.af5-cards { position: absolute; inset: 0; display: grid; grid-template-rows: 1fr 1fr; padding: 14% 18%; gap: 6%; pointer-events: none; }
.af5-cards div { display: flex; justify-content: center; gap: 4%; }
.af5-cards span { aspect-ratio: 5 / 7; height: 100%; border-radius: 6px; background: linear-gradient(160deg, #3b4a7a, #12182e); border: 1px solid #e3c27a88; box-shadow: 0 4px 14px #0008; }
.af5-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
.af5-tabs { display: flex; gap: 4px; flex-wrap: wrap; } .af5-tabs button[aria-pressed="true"] { outline: 2px solid currentColor; }
.af5-side fieldset { border: 1px solid #ffffff22; border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; }
.af5-side legend { font-weight: 600; padding: 0 4px; }
.af5-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.af5-row input[type=range] { width: 110px; } .af5-row output { min-width: 3ch; display: inline-block; text-align: right; }
.af5-row input[type=text], .af5-row textarea, .af5-row select { max-width: 170px; }
.af5-gate li { list-style: none; font-size: 13px; } .af5-gate li::before { content: '● '; }
.af5-gate [data-n="ok"]::before { color: #6fd38f; } .af5-gate [data-n="aviso"]::before { color: #ffd36e; } .af5-gate [data-n="erro"]::before { color: #ff7a6a; }
.af5-actions { display: flex; gap: 6px; flex-wrap: wrap; }
@media (max-width: 1100px) { .af5 { grid-template-columns: 1fr; } .af5-lib, .af5-side { max-height: none; } }`;

const cur = () => lib.arenas.find(a => a.id === sel);
const layer = a => (variant === 'standard' ? (a.params ||= {}) : (a.variantes.find(v => v.id === variant).params ||= {}));
const resolved = a => resolveParams(DEFAULT_THEMES, a, variant);
const val = (t, f) => t[f] ?? FALLBACK[f] ?? (f === 'dustSize' ? 1 : 0);

function list() {
  const s = q.toLowerCase();
  return lib.arenas.filter(a => (!fFaction || a.faccao === fFaction) && (!fStatus || a.status === fStatus) && `${a.nome} ${a.id} ${a.descricao}`.toLowerCase().includes(s))
    .map(a => {
      const t = a.variantes[0]?.thumb;
      return `<button class="af5-item" data-af5-sel="${a.id}" aria-current="${a.id === sel}">${t ? `<img src="${esc(t)}" alt="">` : '<span class="ph"></span>'}
        <span><b>${esc(a.nome)}</b><small>${esc(a.faccao)} · v${a.versao}${a.publicado ? ` · no jogo v${a.publicado}` : ''}</small>
        <span class="chip" data-s="${a.status}">${STATUS_PT[a.status]}</span><span class="chip">${a.variantes.length} var.</span></span></button>`;
    }).join('') || '<p class="hint">Nada encontrado.</p>';
}

function row([f, label, type, min, max, step], t) {
  const v = val(t, f);
  const input = type === 'color' ? `<input type="color" data-af="${f}" value="${esc(v)}">`
    : type === 'flag' ? `<input type="checkbox" data-af="${f}" ${v ? 'checked' : ''}>`
    : type === 'mask' ? `<select data-af="${f}">${Object.entries(MASKS).map(([k, l]) => `<option value="${k}" ${+k === +v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
    : `<span><input type="range" data-af="${f}" min="${min}" max="${max}" step="${step}" value="${v}"> <output>${v}</output></span>`;
  return `<label class="af5-row"><span>${label}</span>${input}</label>`;
}

function paramsTab(a) {
  const t = resolved(a), o = t.orb;
  return `<p class="hint">${variant === 'standard' ? 'Editando a arena (vale para todas as variantes).' : `Editando só a variante ${esc(variant)}: o que mudar aqui passa por cima da arena.`}</p>
    ${GROUPS.map(([title, fields]) => `<fieldset><legend>${title}</legend>${fields.map(f => row(f, t)).join('')}</fieldset>`).join('')}
    <fieldset><legend>Astro no fundo</legend>
      <label class="af5-row"><span>Mostrar (sol / lua)</span><input type="checkbox" data-orb="on" ${o ? 'checked' : ''}></label>
      ${o ? `<label class="af5-row"><span>Cor</span><input type="color" data-orb="color" value="${esc(o.color)}"></label>
      <label class="af5-row"><span>Tamanho</span><span><input type="range" data-orb="size" min="2" max="30" step="1" value="${o.size}"> <output>${o.size}</output></span></label>
      <label class="af5-row"><span>Posição</span><span><input type="range" data-orb="x" min="-30" max="30" step="1" value="${o.x}"> <output>${o.x}</output></span></label>` : ''}
    </fieldset>`;
}

function infoTab(a) {
  return `<fieldset><legend>Arena</legend>
    <label class="af5-row"><span>ID</span><code>${esc(a.id)}</code></label>
    <label class="af5-row"><span>Nome</span><input type="text" data-meta="nome" value="${esc(a.nome)}"></label>
    <label class="af5-row"><span>Facção</span><select data-meta="faccao">${FACTIONS.map(f => `<option ${f === a.faccao ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <label class="af5-row"><span>Base no código</span><select data-meta="base">${BASES.map(b => `<option ${b === a.base ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
    <label class="af5-row"><span>Autor</span><input type="text" data-meta="autor" value="${esc(a.autor || '')}"></label>
    <label class="af5-row"><span>Descrição</span><textarea data-meta="descricao" rows="3">${esc(a.descricao || '')}</textarea></label>
    <p class="hint">Cosmético: não muda regra nem dado competitivo. Aquisição: livre (preço, drop e venda só com aprovação do autor).</p></fieldset>
    <fieldset><legend>Variantes</legend>
      ${a.variantes.map(v => `<div class="af5-row"><span>${esc(v.nome)} <small>(${v.tipo})</small></span>${v.id === 'standard' ? '' : `<button class="secondary" data-af5="del-var" data-v="${v.id}">Remover</button>`}</div>`).join('')}
      <div class="af5-row"><select id="af5-newtype">${VARIANTS.filter(t => t !== 'standard').map(t => `<option>${t}</option>`).join('')}</select><button class="secondary" data-af5="add-var">Nova variante</button></div>
    </fieldset>`;
}

function pipelineTab(a) {
  const v = a.validacao, next = STATUS.filter(s => s !== 'published' && canMove(a.status, s));
  return `<fieldset><legend>Status: ${STATUS_PT[a.status]} · v${a.versao}</legend>
      <p class="hint">Rascunho → Desenvolvimento → Validação → Aprovada → Publicada → Arquivada. No jogo agora: ${a.publicado ? `v${a.publicado}` : 'nada'}.</p>
      <div class="af5-actions">${next.map(s => `<button class="secondary" data-af5="move" data-to="${s}">Mover para ${STATUS_PT[s]}</button>`).join('')}</div>
      <div class="af5-actions"><button class="primary" data-af5="validate" ${busy ? 'disabled' : ''}>${busy === 'validate' ? 'Validando…' : 'Validar agora'}</button>
        ${a.status === 'approved' ? `<button class="primary" data-af5="publish">Publicar v${a.versao} no manifesto</button>` : ''}</div>
    </fieldset>
    <fieldset><legend>Validação ${v ? `(v${v.versao}, ${esc(new Date(v.em).toLocaleString('pt-BR'))})` : ''}</legend>
      ${v ? `<p><b>${v.ok ? 'Passou' : 'Bloqueada'}</b>${v.versao !== a.versao ? ' · de outra versão: valide de novo' : ''}</p><ul class="af5-gate">${v.itens.map(i => `<li data-n="${i.nivel}"><b>${esc(i.regra)}</b>: ${esc(i.detalhe)}</li>`).join('')}</ul>` : '<p class="hint">Ainda não validada.</p>'}
      <p class="hint">Teto: ${BUDGET.calls} draw calls no desktop, ${BUDGET.callsPhone} no celular, ${BUDGET.worldMs} ms de GPU, campo sem nada por cima e sem brilho alto.</p>
    </fieldset>
    <fieldset><legend>Histórico publicado</legend>
      ${(a.historico || []).slice().reverse().map(h => `<div class="af5-row"><span>v${h.versao} · ${esc(new Date(h.em).toLocaleDateString('pt-BR'))} · ${esc(h.nota || '')}</span>${h.versao === a.publicado ? '<span class="chip" data-s="published">no jogo</span>' : `<button class="secondary" data-af5="rollback" data-ver="${h.versao}">Voltar a esta</button>`}</div>`).join('') || '<p class="hint">Nunca publicada.</p>'}
    </fieldset>`;
}

function side() {
  const a = cur();
  if (!a) return '<p class="hint">Escolha uma arena.</p>';
  return `<div class="af5-tabs">${[['params', 'Visual'], ['info', 'Arena e variantes'], ['pipeline', 'Pipeline']].map(([k, l]) => `<button class="secondary" data-af5-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>
    <label class="af5-row"><span>Variante</span><select data-af5-var>${a.variantes.map(v => `<option value="${v.id}" ${v.id === variant ? 'selected' : ''}>${esc(v.nome)}</option>`).join('')}</select></label>
    ${tab === 'info' ? infoTab(a) : tab === 'pipeline' ? pipelineTab(a) : paramsTab(a)}
    <div class="af5-actions"><button class="primary" data-af5="save" ${dirty ? '' : 'disabled'}>Salvar biblioteca</button></div>`;
}

function frameStyle() { const r = VIEWS[view][1]; return r < 1 ? `aspect-ratio: ${r}; height: 66vh; width: auto;` : `aspect-ratio: ${r};`; }
function paint() {
  const z = {x0: .14, x1: .86, y0: .22, y1: .82};
  document.querySelector('#arena-forge').innerHTML = `
    <aside class="af5-lib panel"><input type="search" placeholder="Buscar arena" data-af5-q value="${esc(q)}">
      <select data-af5-ff><option value="">Todas as facções</option>${FACTIONS.map(f => `<option ${f === fFaction ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <select data-af5-fs><option value="">Todos os status</option>${STATUS.map(s => `<option value="${s}" ${s === fStatus ? 'selected' : ''}>${STATUS_PT[s]}</option>`).join('')}</select>
      <div class="af5-actions"><button class="secondary" data-af5="dup" ${sel ? '' : 'disabled'}>Duplicar</button><button class="secondary" data-af5="archive" ${cur() && canMove(cur().status, 'archived') ? '' : 'disabled'}>Arquivar</button></div>
      <div id="af5-list">${list()}</div></aside>
    <div><div class="af5-stage"><div class="af5-frame" style="${frameStyle()}"><div class="arena-host"></div>
      <div class="af5-cards" aria-hidden="true"><div><span></span><span></span><span></span></div><div><span></span><span></span><span></span></div></div>
      <div class="af5-zone" style="left:${z.x0 * 100}%;right:${(1 - z.x1) * 100}%;top:${z.y0 * 100}%;bottom:${(1 - z.y1) * 100}%" title="Zona protegida do campo"></div></div></div>
      <div class="af5-bar">
        <label>Tela <select data-af5-view>${Object.entries(VIEWS).map(([k, [l]]) => `<option value="${k}" ${k === view ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Gráficos <select data-af5-quality>${['phone', 'low', 'medium', 'high', 'ultra'].map(x => `<option ${x === quality ? 'selected' : ''} value="${x}">${x === 'phone' ? 'celular' : x}</option>`).join('')}</select></label>
        <label><input type="checkbox" data-af5-still ${still ? 'checked' : ''}> Reduzir movimento</label>
        <button class="secondary" data-af5="hit">Testar golpe</button><button class="primary" data-af5="play-dev">Testar no jogo 3D</button><small class="hint" id="af5-stats"></small>
      </div></div>
    <div class="af5-side panel">${side()}</div>`;
  mountScene();
}
const refresh = () => {
  document.querySelector('#af5-list').innerHTML = list();
  document.querySelector('#arena-forge .af5-side').innerHTML = side();
};
function preview() {
  const a = cur();
  if (!a || !scene) return;
  THEMES[EDIT] = resolved(a);
  scene.setTheme(EDIT);
}
async function mountScene() {
  scene?.dispose();
  const host = document.querySelector('#arena-forge .arena-host');
  scene = await createScene(host, {quality, theme: 'olympus', reduceMotion: still});
  if (!scene) { host.innerHTML = '<p class="hint" style="padding:16px">Sem WebGL neste navegador: a partida usa o fundo em gradiente.</p>'; return; }
  preview();
  setTimeout(() => { const s = scene?.stats(); if (s) document.querySelector('#af5-stats').textContent = `${s.calls} draw calls · ${s.pixelRatio}x · ${s.level}`; }, 600);
}

// Toda edição invalida a validação; editar uma arena publicada abre a próxima versão (a publicada fica no jogo).
function edited() {
  let a = cur();
  if (a.status === 'published') { lib = startEdit(lib, sel); a = cur(); ctx.notice(`Editando a v${a.versao}. A v${a.publicado} continua no jogo até a nova publicação.`, true); }
  if (['validation', 'approved'].includes(a.status)) a.status = 'development';
  delete a.validacao;
  dirty = true;
  const save = document.querySelector('[data-af5="save"]'); if (save) save.disabled = false;
  preview();
}

const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));
async function validate() {
  const a = cur(), worst = {calls: 0, callsPhone: 0, worldMs: 0, textures: 0, geometries: 0, zoneHits: new Set(), luma: 0, busy: 0, shaderErrors: 0};
  const schema = arenaErrors(a, BASES);
  let stillOk = true;
  if (scene) {
    for (const v of a.variantes) {
      THEMES[EDIT] = resolveParams(DEFAULT_THEMES, a, v.id);
      scene.setQuality('high'); scene.setTheme(EDIT); await tick();
      const au = scene.audit(), s = scene.stats(), b = scene.bench(5);
      worst.calls = Math.max(worst.calls, s.calls); worst.worldMs = Math.max(worst.worldMs, b.world);
      worst.textures = Math.max(worst.textures, s.textures); worst.geometries = Math.max(worst.geometries, s.geometries);
      au.zoneHits.forEach(h => worst.zoneHits.add(`${h} (${v.nome})`)); worst.luma = Math.max(worst.luma, au.luma); worst.busy = Math.max(worst.busy, au.busy);
      worst.shaderErrors = Math.max(worst.shaderErrors, au.shaderErrors);
      try { const r = await ctx.api('arenas/miniatura', {id: a.id, versao: a.versao, variante: v.id, imagem: scene.snapshot()}); v.thumb = r.arquivo; } catch (e) { schema.push(`miniatura ${v.id}: ${e.message}`); }
      scene.setQuality('phone'); await tick(); scene.audit(); worst.callsPhone = Math.max(worst.callsPhone, scene.stats().calls);
    }
    scene.setQuality(quality);
    scene.reduceMotion = true; await tick(200);
    const f0 = scene.frames(); await tick(700); stillOk = scene.frames() - f0 <= 1;
    scene.reduceMotion = still; preview();
  }
  const g = gate({...worst, zoneHits: [...worst.zoneHits], schema, loaded: !!scene, stillOk});
  a.validacao = {...g, versao: a.versao, em: new Date().toISOString()};
  if (a.status === 'development' || a.status === 'draft') a.status = 'validation';
  dirty = true;
}

async function save(msg = 'Biblioteca salva. O manifesto publicado foi refeito a partir do histórico.') {
  const r = await ctx.api('arenas', {biblioteca: lib});
  lib = r.biblioteca; manifest = r.manifesto; dirty = false;
  ctx.notice(msg, true);
}

function onInput(e) {
  const el = e.target;
  if (el.matches('[data-af5-q]')) { q = el.value; document.querySelector('#af5-list').innerHTML = list(); return; }
  if (el.matches('[data-af5-ff]')) { fFaction = el.value; document.querySelector('#af5-list').innerHTML = list(); return; }
  if (el.matches('[data-af5-fs]')) { fStatus = el.value; document.querySelector('#af5-list').innerHTML = list(); return; }
  if (el.matches('[data-af5-view]')) { view = el.value; return paint(); }
  if (el.matches('[data-af5-quality]')) { quality = el.value; scene?.setQuality(quality); return; }
  if (el.matches('[data-af5-still]')) { still = el.checked; if (scene) scene.reduceMotion = still; return; }
  if (el.matches('[data-af5-var]')) { variant = el.value; preview(); return refresh(); }
  if (!cur()) return;
  if (el.dataset.meta) { edited(); cur()[el.dataset.meta] = el.value; if (el.dataset.meta === 'base') preview(); return; }
  if (el.dataset.af) {
    edited();
    const L = layer(cur()), f = el.dataset.af;
    L[f] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.type === 'color' ? el.value : Number(el.value);
    if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = el.value;
    if (f === 'mask' && L.mask && !resolved(cur()).glow) L.glow = '#ffffff';
    return preview();
  }
  if (el.dataset.orb) {
    edited();
    const L = layer(cur()), o = el.dataset.orb;
    if (o === 'on') { L.orb = el.checked ? {color: '#fff4d8', size: 10, x: 15} : null; preview(); return refresh(); }
    L.orb = {...resolved(cur()).orb, [o]: o === 'color' ? el.value : Number(el.value)};
    if (el.nextElementSibling?.tagName === 'OUTPUT') el.nextElementSibling.textContent = el.value;
    preview();
  }
}

async function onClick(e) {
  const b = e.target.closest('button');
  if (!b || !b.closest('#arena-forge')) return;
  if (b.dataset.af5Sel) { sel = b.dataset.af5Sel; variant = 'standard'; preview(); return refresh(); }
  if (b.dataset.af5Tab) { tab = b.dataset.af5Tab; return refresh(); }
  const act = b.dataset.af5, a = cur();
  try {
    if (act === 'play-dev') {
      if (a?.faccao !== 'Poseidon') { ctx.notice('O preview 3D arquitetônico está disponível para Poseidon nesta etapa.'); return; }
      window.open('/playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&ai=none', '_blank', 'noopener');
      return;
    }
    if (act === 'hit' && scene) {
      const c = document.querySelector('#arena-forge .af5-frame').getBoundingClientRect(), x = c.width / 2, y = c.height / 2, t = THEMES[EDIT] || {};
      scene.fx.charge(x, y, {color: t.dust}); setTimeout(() => { scene.fx.burst(x, y, {color: t.light}); scene.fx.shockwave(x, y); scene.fx.shake(6); }, 450);
      return;
    }
    if (act === 'save') return await save().then(refresh);
    if (act === 'dup') {
      const id = prompt('ID da nova arena (minúsculas e hífen):', `${a.id}-copia`); if (!id) return;
      lib = duplicate(lib, a.id, id, `${a.nome} (cópia)`); sel = id; dirty = true; return paint();
    }
    if (act === 'archive') { lib = move(lib, a.id, 'archived'); dirty = true; return refresh(); }
    if (act === 'move') { lib = move(lib, a.id, b.dataset.to); dirty = true; return refresh(); }
    if (act === 'add-var') {
      const tipo = document.querySelector('#af5-newtype').value, nome = prompt('Nome da variante:', tipo[0].toUpperCase() + tipo.slice(1)); if (!nome) return;
      const id = nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || tipo;
      if (a.variantes.some(v => v.id === id)) throw Error(`Já existe a variante ${id}.`);
      edited(); cur().variantes.push({id, nome, tipo, params: {}}); variant = id; preview(); return refresh();
    }
    if (act === 'del-var') { edited(); cur().variantes = cur().variantes.filter(v => v.id !== b.dataset.v); variant = 'standard'; preview(); return refresh(); }
    if (act === 'validate') { busy = 'validate'; refresh(); await validate(); busy = ''; await save('Validação gravada.'); return refresh(); }
    if (act === 'publish') {
      const nota = prompt(`Nota da versão ${a.versao} (aparece no histórico):`, ''); if (nota === null) return;
      lib = publish(lib, a.id, DEFAULT_THEMES, {autor: 'autor', nota});
      await save(`${a.nome} v${a.versao} publicada no manifesto local. O jogo oficial só muda no próximo deploy aprovado.`); return refresh();
    }
    if (act === 'rollback') {
      const v = +b.dataset.ver;
      if (!confirm(`Fazer o jogo voltar para a v${v} de ${a.nome}?`)) return;
      lib = rollback(lib, a.id, v); await save(`${a.nome}: o manifesto aponta para a v${v}.`); return refresh();
    }
  } catch (err) { busy = ''; ctx.notice(err.message); refresh(); }
}

export async function mountArenaForge(host, context) {
  ctx = context;
  const sub = location.hash.split('/')[1];
  scene?.dispose(); scene = null;
  // Texture Library e Material Studio: seções do mesmo Arena Forge; o Three.js completo só carrega quando abertas.
  if (sub === 'materiais' || sub === 'estudio') return (await import('./material-studio.js?v=20261108-ms3')).mountMaterials(host, context, sub);
  if (sub === 'escultura') return (await import('./sculpture-inspector.js?v=20261108-ss2')).mountSculpture(host, context, (await import('./material-studio.js?v=20261108-ms3')).arenaNav());
  if (sub === 'producao') return (await import('./arena-production.js?v=20261107-ap3')).mountProduction(host, context, (await import('./material-studio.js?v=20261108-ms3')).arenaNav());
  if (!document.querySelector('#af5-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'af5-style', textContent: css}));
  host.innerHTML = `<nav class="ms-tabs" aria-label="Arena Forge" style="display:flex;gap:6px;margin-bottom:12px">${[['#arenas', 'Arenas'], ['#arenas/materiais', 'Texture Library'], ['#arenas/estudio', 'Material Studio · Palácio de Poseidon'], ['#arenas/producao', 'Produção · Artboard'], ['#arenas/escultura', 'Sculpture Studio']]
    .map(([h, l]) => `<a href="${h}" ${location.hash === h || (h === '#arenas' && !sub) ? 'aria-current="page"' : ''} style="padding:6px 12px;border-radius:99px;border:1px solid #ffffff2a;color:inherit;text-decoration:none">${l}</a>`).join('')}</nav>
    <section id="arena-forge" class="af5" aria-label="Arena Forge"><p class="hint">Carregando biblioteca…</p></section>`;
  try { ({biblioteca: lib, manifesto: manifest} = await ctx.api('arenas')); }
  catch (e) { host.querySelector('#arena-forge').innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  sel ||= lib.arenas[0]?.id; dirty = false;
  paint();
}
addEventListener('hashchange', () => { if (location.hash !== '#arenas') { scene?.dispose(); scene = null; } });
addEventListener('beforeunload', e => { if (dirty && location.hash.startsWith('#arenas')) e.preventDefault(); });
document.addEventListener('input', e => e.target.closest('#arena-forge') && onInput(e));
document.addEventListener('click', onClick);
