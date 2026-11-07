// ARENA FORGE · Produção de arena (autor, 07/11/2026): pipeline CONCEPT → PUBLICATION, Camera Composition Template medido no
// jogo real, Master Artboard Studio (versões, aprovar e congelar, anotações, regiões), Artboard Match (lado a lado, sobreposição,
// diferença) com o render da câmera competitiva, Asset Breakdown, materiais da arena, Scene Manifest e pacote ZIP.
// Backend: card-forge/arena_production.py. Nada aqui converte pintura em 3D: o artboard é referência; o 3D vem do módulo da cena.
import * as THREE from '../playtest/divine/vendor/three-0.160.0-slim.js';

const PID = 'poseidon-palace';
const GAME = `/playtest/divine/?arena=poseidon&arenaPreview=${PID}&ai=none&demo=ultimate&noIntro=1`;
const GW = 1600, GH = 900, TW = 3840, TH = 2160;
const STAGE_PT = {'concept': 'Concept', 'art-direction': 'Art Direction', 'master-artboard': 'Master Artboard', 'asset-breakdown': 'Asset Breakdown',
  'asset-production': 'Asset Production', 'material-production': 'Material Production', 'scene-assembly': 'Scene Assembly', 'visual-matching': 'Visual Matching',
  'gameplay-preview': 'Gameplay Preview', 'validation': 'Validation', 'approval': 'Approval', 'publication': 'Publication'};
const STATUS = ['pendente', 'em andamento', 'concluida', 'aprovada'];
const CATS = ['architecture', 'monuments', 'terrain', 'battlefield', 'atmosphere', 'lighting'];
const STATES = ['reference', 'concept', 'model', 'uv', 'texture', 'material', 'preview', 'approval'];
const CHECK = ['Silhueta', 'Proporções', 'Escala', 'Profundidade', 'Contraste', 'Direção da luz', 'Paleta', 'Materiais', 'Atmosfera',
  'Legibilidade das cartas', 'Centralização', 'Zonas de jogo livres'];
// Elementos do HUD medidos no jogo. "protegida" = gameplay; o cenário não pode competir com eles.
const HUD = [['field', '.field', 'protegida'], ['god-opp', '.godhud--opp', 'protegida'], ['god-me', '.godhud--me', 'protegida'], ['hand-me', '.hand--me', 'protegida'],
  ['hand-opp', '.hand--opp', 'protegida'], ['rail', '.rail', 'hud'], ['clock', '.zclock', 'hud'], ['turn', '.phasebar__turn', 'hud'], ['action', '.action-btn', 'hud']];
// Bíblia Visual (IMMERSIVE WORLD V1): cada arena tem Battlefield Artboard (câmera competitiva), Cinematic Artboard e Storyboard da transição.
const ABT = {battlefield: 'Battlefield', cinematic: 'Cinematic', storyboard: 'Storyboard'};
const EASES = ['linear', 'easeIn', 'easeOut', 'easeInOut'], VFX = ['', 'dust', 'shockwave', 'flash'];
const COLORS = {protegida: '#ff5a6a', hud: '#ffd36e', campo: '#6fe0ff', arquitetura: '#b48cff'};

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const css = `
.ap { display: grid; grid-template-columns: 270px minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
.ap-col { display: grid; gap: 10px; max-height: 84vh; overflow: auto; }
.ap fieldset { border: 1px solid #ffffff22; border-radius: 10px; padding: 8px 10px; display: grid; gap: 6px; min-width: 0; }
.ap legend { font-weight: 600; padding: 0 4px; }
.ap-stage { position: relative; aspect-ratio: 16 / 9; background: #05060f; border-radius: 10px; overflow: hidden; user-select: none; touch-action: none; }
.ap-layers, .ap-layers > img, .ap-layer, .ap-layer > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.ap-stage iframe { position: absolute; left: 0; top: 0; width: ${GW}px; height: ${GH}px; border: 0; transform-origin: 0 0; }
.ap-stage svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ap-reg { position: absolute; border: 2px solid #6fe0ff; background: #6fe0ff1a; font: 11px/1.2 system-ui; color: #fff; padding: 2px 4px; pointer-events: none; text-shadow: 0 1px 2px #000; }
.ap-reg[data-on="1"] { border-color: #ffd36e; background: #ffd36e26; }
.ap-pin { position: absolute; transform: translate(-50%, -100%); background: #ff5a6a; color: #fff; font: 11px system-ui; padding: 2px 6px; border-radius: 6px 6px 6px 0; max-width: 220px; pointer-events: auto; }
.ap-hit { position: absolute; inset: 0; } .ap-stage[data-mode="jogo"] .ap-layers { pointer-events: none; }
.ap-hit[data-tool="regiao"], .ap-hit[data-tool="nota"] { cursor: crosshair; }
.ap-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; font-size: 13px; }
.ap-bar button[aria-pressed="true"] { outline: 2px solid currentColor; }
.ap-stg { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; font-size: 12px; }
.ap-stg small { grid-column: 1 / -1; opacity: .6; }
.ap-list { display: grid; gap: 4px; max-height: 300px; overflow: auto; }
.ap-list button { text-align: left; display: grid; grid-template-columns: 1fr auto; gap: 6px; font-size: 12px; padding: 4px 6px; }
.ap-list button[aria-current="true"] { outline: 2px solid currentColor; }
.ap-row { display: grid; grid-template-columns: 96px 1fr; gap: 6px; align-items: center; font-size: 12px; }
.ap-row input, .ap-row select, .ap-row textarea { min-width: 0; width: 100%; }
.ap-xyz { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
.ap-chk { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 12px; }
.ap pre { max-height: 260px; overflow: auto; font-size: 11px; background: #0008; padding: 8px; border-radius: 8px; }
.ap-keys { border-collapse: collapse; font-size: 12px; } .ap-keys td, .ap-keys th { padding: 2px 3px; text-align: left; white-space: nowrap; }
.ap-keys input[type=number] { width: 58px; } .ap-keys tr[aria-current="true"] { background: #ffffff12; } .ap-keys .ap-xyz { display: table-cell; }
.ap-thumb { width: 100%; border-radius: 6px; background: #111; }
@media (max-width: 1200px) { .ap { grid-template-columns: 1fr; } .ap-col { max-height: none; } }`;

let ctx, root, proj, ui;
const fresh = () => ({keys: null, ksel: 0, posed: null, abTipo: 'battlefield', ab: null, mode: 'artboard', tool: 'ver', opa: .55, tpl: true, split: .5, mix: .5, asset: null, cat: '', render: null, gameOn: false, manifest: null, drag: null});
const ab = () => proj.artboards.find(b => b.id === ui.ab);
const asset = () => proj.assets.find(a => a.id === ui.asset);
const $ = s => root.querySelector(s);

export async function mountProduction(host, context, nav) {
  ctx = context; ui = fresh();
  if (!document.querySelector('#ap-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'ap-style', textContent: css}));
  host.innerHTML = `${nav}<section class="ap" aria-label="Produção de arena"><p class="hint">Carregando projeto…</p></section>`;
  root = host.querySelector('.ap');
  try { proj = await ctx.api(`producao?id=${PID}`); } catch (e) { root.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  ui.ab = (proj.artboards.find(b => b.congelado) || proj.artboards.at(-1))?.id || null;
  // O palco fica fixo: re-pintar os painéis nunca recria o iframe do jogo.
  root.innerHTML = `<div class="ap-col" id="ap-left"></div><div><div id="ap-top"></div><div class="ap-stage" id="ap-stage"><div class="ap-layers"></div></div><div id="ap-bottom"></div></div><div class="ap-col" id="ap-right"></div>`;
  new ResizeObserver(() => ui.gameOn && placeGame()).observe($('#ap-stage'));
  root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('input', onInput);
  root.addEventListener('pointerdown', onDown);
  paint();
}

// ---------------- Pintura ----------------
function paint() {
  $('#ap-left').innerHTML = left(); $('#ap-top').innerHTML = top(); $('#ap-bottom').innerHTML = bottom(); $('#ap-right').innerHTML = right();
  stage();
}

function left() {
  const st = Object.entries(proj.etapas).map(([k, e]) => `<label class="ap-stg"><span>${STAGE_PT[k]} <small>v${e.versao}</small></span>
    <select data-stage="${k}">${STATUS.map(s => `<option ${s === e.status ? 'selected' : ''} ${k === 'publication' && s !== 'pendente' && s !== 'em andamento' ? 'disabled' : ''}>${s}</option>`).join('')}</select>
    ${e.historico.length ? `<small>${esc(e.historico.at(-1).de)} → ${esc(e.historico.at(-1).para)} · ${esc(e.historico.at(-1).em.slice(0, 16).replace('T', ' '))}</small>` : ''}</label>`).join('');
  const abs = proj.artboards.map(b => `<button data-ab="${b.id}" aria-current="${b.id === ui.ab}"><span>${esc(b.nome)} <small>v${b.versao} · ${ABT[b.tipo || 'battlefield']}</small></span><span>${b.congelado ? 'aprovado 🔒' : ''}</span></button>`).join('') || '<p class="hint">Nenhum artboard. Importe o concept aprovado.</p>';
  const refs = proj.referencias.map(r => `<button data-ref="${r.id}"><span>${esc(r.nome)}</span><small>${esc(r.tipo || 'ref')}</small></button>`).join('') || '<p class="hint">Sem referências.</p>';
  return `<fieldset><legend>${esc(proj.nome)}</legend><small>${esc(proj.direcao)} · projeto v${proj.versao}</small>${st}
    <small>Publicação no jogo oficial é deploy separado, aprovado pelo autor.</small></fieldset>
  <fieldset><legend>Master Artboard</legend><div class="ap-list">${abs}</div>
    <label class="ap-row"><span>Tipo</span><select data-ui="abtipo">${Object.entries(ABT).map(([k, l]) => `<option value="${k}" ${k === ui.abTipo ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="ap-row"><span>Nova versão</span><input type="file" accept="image/png,image/jpeg,image/webp" data-up="artboard"></label>
    ${ab() && !ab().congelado ? '<button data-act="approve">Aprovar e congelar esta versão</button>' : ''}</fieldset>
  <fieldset><legend>Referências</legend><div class="ap-list">${refs}</div>
    <label class="ap-row"><span>Importar</span><input type="file" accept="image/png,image/jpeg,image/webp" data-up="referencia"></label></fieldset>
  <fieldset><legend>Camera Composition Template</legend>
    ${proj.template ? `<small>Medido em ${esc(proj.template.medido_em.slice(0, 16).replace('T', ' '))} · ${proj.template.zonas.length} zonas · ${TW}×${TH}</small>
      <a href="${esc(proj.template.arquivo)}" download>Baixar PNG</a><a href="data:application/json,${encodeURIComponent(JSON.stringify(proj.template, null, 1))}" download="camera-template.json">Baixar JSON</a>` : '<small>Ainda não medido.</small>'}
    <button data-act="template">${proj.template ? 'Medir de novo no jogo' : 'Medir no jogo real'}</button></fieldset>
  <fieldset><legend>Pacote</legend>
    <button data-act="manifest">Ver Scene Manifest</button>
    <a href="/api/star-hill/producao/exportar?id=${PID}" download>Exportar pacote ZIP</a>
    <label class="ap-row"><span>Importar ZIP</span><input type="file" accept=".zip,application/zip" data-up="zip"></label>
    ${ui.manifest ? `<pre>${esc(JSON.stringify(ui.manifest, null, 1))}</pre>` : ''}</fieldset>`;
}

function top() {
  const modes = [['artboard', 'Artboard'], ['jogo', 'Jogo (câmera real)'], ['split', 'Lado a lado'], ['overlay', 'Sobrepor'], ['diferenca', 'Diferença'], ['cinematica', 'Cinemática']];
  return `<div class="ap-bar">${modes.map(([k, l]) => `<button data-mode="${k}" aria-pressed="${ui.mode === k}">${l}</button>`).join('')}</div>`;
}
function bottom() {
  if (ui.mode === 'cinematica') return cineEditor();
  const b = ab(), modes = [['artboard', 'Artboard'], ['jogo', 'Jogo (câmera real)'], ['split', 'Lado a lado'], ['overlay', 'Sobrepor'], ['diferenca', 'Diferença']];
  const tools = [['ver', 'Ver'], ['regiao', 'Marcar região'], ['nota', 'Anotar']];
  return `<div class="ap-bar">${tools.map(([k, l]) => `<button data-tool="${k}" aria-pressed="${ui.tool === k}" ${k !== 'ver' && (!b || (k === 'nota' && b.congelado)) ? 'disabled' : ''}>${l}</button>`).join('')}
      <label><input type="checkbox" data-ui="tpl" ${ui.tpl ? 'checked' : ''} ${proj.template ? '' : 'disabled'}> Template</label>
      <label>Opacidade <input type="range" min="0" max="1" step=".05" value="${ui.opa}" data-ui="opa"></label>
      ${ui.mode === 'split' ? `<label>Divisão <input type="range" min="0" max="1" step=".01" value="${ui.split}" data-ui="split"></label>` : ''}
      ${ui.mode === 'overlay' ? `<label>Render <input type="range" min="0" max="1" step=".05" value="${ui.mix}" data-ui="mix"></label>` : ''}
      <button data-act="render">${ui.render ? 'Capturar render de novo' : 'Capturar render 3D do jogo'}</button>
      ${ui.render ? '<button data-act="save-render">Guardar render como referência</button>' : ''}</div>
    <p class="hint">${ui.tool === 'regiao' ? (ui.asset ? `Arraste no artboard para marcar a região de <b>${esc(asset().nome)}</b>.` : 'Escolha um asset à direita e arraste a região.')
      : ui.tool === 'nota' ? 'Clique no artboard para anotar.' : 'O artboard é referência 2D aprovada; o cenário jogável é o 3D da cena.'}</p>
    ${b ? `<fieldset><legend>Artboard Match · ${esc(b.nome)}</legend><div class="ap-chk">${CHECK.map(c => `<label><input type="checkbox" data-check="${esc(c)}" ${(b.checklist || {})[c] ? 'checked' : ''} ${b.congelado ? '' : ''}> ${c}</label>`).join('')}</div>
      <small>${Object.values(b.checklist || {}).filter(Boolean).length}/${CHECK.length} itens conferidos contra o render</small></fieldset>` : ''}`;
}

function stage() {
  const s = $("#ap-stage"), b = ab();
  s.dataset.mode = ui.mode === 'cinematica' ? 'jogo' : ui.mode;
  const L = s.querySelector('.ap-layers'), art = b ? `<img src="${esc(b.arquivo)}" alt="Artboard ${esc(b.nome)}">` : '';
  const rend = ui.render ? `<img src="${ui.render}" alt="Render 3D na câmera competitiva" class="ap-render">` : '';
  let body = '';
  if (ui.mode === 'cinematica') body = '';
  else if (ui.mode === 'artboard') body = art || '<p class="hint" style="padding:20px">Importe um artboard.</p>';
  else if (ui.mode === 'split') body = art + (rend && `<div class="ap-layer" style="clip-path:inset(0 0 0 ${ui.split * 100}%)">${rend}</div>`);
  else if (ui.mode === 'overlay') body = art + (rend && `<div class="ap-layer" style="opacity:${ui.mix}">${rend}</div>`);
  else if (ui.mode === 'diferenca') body = art + (rend && `<div class="ap-layer" style="mix-blend-mode:difference">${rend}</div>`);
  if (!['artboard', 'jogo', 'cinematica'].includes(ui.mode) && !ui.render) body += '<p class="hint" style="position:absolute;bottom:8px;left:12px">Capture o render 3D para comparar.</p>';
  const regs = ui.mode === 'jogo' || ui.mode === 'cinematica' || !b ? '' : proj.assets.filter(a => a.referencia && (a.referencia.artboard || b.id) === b.id).map(a => { const r = a.referencia;
    return `<div class="ap-reg" data-on="${a.id === ui.asset ? 1 : 0}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%">${esc(a.nome)}</div>`; }).join('');
  const pins = ui.mode === 'jogo' || ui.mode === 'cinematica' || !b ? '' : (b.anotacoes || []).map((n, i) => `<div class="ap-pin" style="left:${n.x * 100}%;top:${n.y * 100}%" title="${esc(n.texto)}">${i + 1}. ${esc(n.texto)}</div>`).join('');
  L.innerHTML = body + regs + pins + (ui.tpl && proj.template && ui.mode !== 'cinematica' ? overlaySvg(proj.template) : '') + `<div class="ap-hit" data-tool="${ui.tool}"></div>`;
  if (ui.gameOn) placeGame();
}

function overlaySvg(t) {
  const P = pts => pts.map(([x, y]) => `${(x * GW).toFixed(1)},${(y * GH).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${GW} ${GH}" preserveAspectRatio="none" style="opacity:${ui.opa}">
    ${t.arquitetura ? `<rect x="0" y="${t.arquitetura.topo * GH}" width="${GW}" height="${(t.arquitetura.base - t.arquitetura.topo) * GH}" fill="${COLORS.arquitetura}22" stroke="${COLORS.arquitetura}" stroke-dasharray="10 6"/>` : ''}
    <line x1="0" x2="${GW}" y1="${t.horizonte * GH}" y2="${t.horizonte * GH}" stroke="#fff" stroke-dasharray="4 6"/>
    ${t.silhuetas.map((s, i) => `<polygon points="${P(s.pontos)}" fill="none" stroke="${i ? COLORS.arquitetura : COLORS.campo}" stroke-width="2" ${i ? 'stroke-dasharray="8 6"' : ''}/>`).join('')}
    ${t.zonas.map(z => `<rect x="${z.x * GW}" y="${z.y * GH}" width="${z.w * GW}" height="${z.h * GH}" fill="${COLORS[z.tipo]}18" stroke="${COLORS[z.tipo]}" stroke-width="2"/>`).join('')}
    <line x1="${GW / 2}" x2="${GW / 2}" y1="0" y2="${GH}" stroke="#ffffff55"/></svg>`;
}

function right() {
  const list = proj.assets.filter(a => !ui.cat || a.categoria === ui.cat).map(a => `<button data-asset="${a.id}" aria-current="${a.id === ui.asset}"><span>${esc(a.nome)} <small>${a.categoria}</small></span><small>${a.estado}${a.referencia ? ' ▣' : ''}${a.glb ? ' GLB' : ''}</small></button>`).join('');
  const a = asset(), mats = proj.materiais.map(m => m.id);
  const xyz = k => `<span class="ap-xyz">${a[k].map((v, i) => `<input type="number" step=".01" value="${v}" data-xyz="${k}" data-i="${i}">`).join('')}</span>`;
  const sel = (k, opts) => `<select data-field="${k}">${opts.map(o => `<option ${o === a[k] ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  return `<fieldset><legend>Asset Breakdown (${proj.assets.length})</legend>
    <select data-ui="cat"><option value="">Todas as categorias</option>${CATS.map(c => `<option ${c === ui.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <div class="ap-list">${list}</div><button data-act="new-asset">Novo asset</button></fieldset>
  ${a ? `<fieldset><legend>${esc(a.nome)} · v${a.versao}</legend>
    ${a.thumb ? `<img class="ap-thumb" src="${esc(a.thumb)}" alt="">` : ''}
    <label class="ap-row"><span>id</span><code>${esc(a.id)}</code></label>
    <label class="ap-row"><span>Nome</span><input data-field="nome" value="${esc(a.nome)}"></label>
    <label class="ap-row"><span>Categoria</span>${sel('categoria', CATS)}</label>
    <label class="ap-row"><span>Estado</span>${sel('estado', STATES)}</label>
    <label class="ap-row"><span>Material</span><select data-field="material"><option value="">—</option>${mats.map(m => `<option ${m === a.material ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <label class="ap-row"><span>LOD</span><input data-field="lod" value="${esc(a.lod)}"></label>
    <div class="ap-row"><span>Posição (m)</span>${xyz('posicao')}</div><div class="ap-row"><span>Dimensões (m)</span>${xyz('dimensoes')}</div><div class="ap-row"><span>Escala</span>${xyz('escala')}</div>
    <label class="ap-row"><span>Dependências</span><input data-field="dependencias" value="${esc(a.dependencias.join(', '))}"></label>
    <label class="ap-row"><span>Nota</span><textarea data-field="nota" rows="2">${esc(a.nota)}</textarea></label>
    <label class="ap-row"><span>Modelo GLB</span><input type="file" accept=".glb,model/gltf-binary" data-up="asset"></label>
    ${a.glb ? `<small>GLB: ${esc(a.glb.split('/').pop())}</small>` : '<small>Sem GLB: geometria procedural da cena.</small>'}
    <small>Região: ${a.referencia ? `${['x', 'y', 'w', 'h'].map(k => a.referencia[k].toFixed(3)).join(' · ')}` : 'não marcada'}</small>
    ${a.referencia && ab() ? '<button data-act="thumb">Recortar miniatura do artboard</button>' : ''}
    ${a.referencia ? '<button data-act="clear-region">Limpar região</button>' : ''}
    <button data-act="del-asset">Apagar asset</button></fieldset>` : ''}
  <fieldset><legend>Materiais da arena</legend>${proj.materiais.map((m, i) => `<div class="ap-row"><span title="${esc(m.id)}">${esc(m.nome)}</span>
    <span class="ap-xyz"><input type="color" value="${esc(m.baseColor)}" data-mat="${i}" data-k="baseColor" title="Cor base">
    <input type="number" min="0" max="1" step=".01" value="${m.roughness}" data-mat="${i}" data-k="roughness" title="Roughness">
    <input type="number" min="0" max="1" step=".01" value="${m.metalness}" data-mat="${i}" data-k="metalness" title="Metalness"></span></div>`).join('')}
    <small>PBR de origem: Texture Library (data/material-library.json). Os parâmetros pictóricos ficam no Material Studio.</small></fieldset>
  <button data-act="save">Salvar projeto</button>`;
}

// ---------------- Jogo real (iframe) ----------------
function placeGame() {
  const s = $('#ap-stage');
  let f = s.querySelector('#ap-game');
  if (!f) { f = Object.assign(document.createElement('iframe'), {id: 'ap-game', title: 'Partida real (câmera competitiva)', src: GAME}); s.prepend(f); }
  f.style.transform = `scale(${s.clientWidth / GW})`;
  f.style.visibility = ui.mode === 'jogo' || ui.mode === 'cinematica' ? 'visible' : 'hidden';
}
async function game() {
  ui.gameOn = true; placeGame();
  const f = root.querySelector('#ap-game');
  for (let i = 0; i < 200; i++) {
    const sc = f.contentWindow?.__divine?.scene;
    if (sc?.composition?.() && f.contentDocument.querySelector('.field')) { if (!f.dataset.ready) { await new Promise(r => setTimeout(r, 600)); f.dataset.ready = 1; } return {sc, doc: f.contentDocument}; }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('O jogo não carregou a cena a tempo.');
}

// Template medido: câmera real do scene.js, faixa de arquitetura do backdrop e retângulos reais do HUD numa janela 1600×900.
async function measure() {
  const {sc, doc} = await game(), comp = sc.composition(), c = comp.camera;
  const cam = new THREE.PerspectiveCamera(c.fov, GW / GH, .1, 2000);
  cam.position.fromArray(c.position); cam.lookAt(new THREE.Vector3().fromArray(c.lookAt)); cam.updateMatrixWorld();
  const proj2 = v => { const p = v.clone().project(cam); return [+((p.x + 1) / 2).toFixed(4), +((1 - p.y) / 2).toFixed(4)]; };
  const ring = (r, n = 96) => Array.from({length: n}, (_, i) => proj2(new THREE.Vector3(Math.cos(i / n * Math.PI * 2) * r, 0, Math.sin(i / n * Math.PI * 2) * r)));
  const zonas = HUD.flatMap(([id, q, tipo]) => [...doc.querySelectorAll(q)].map(el => el.getBoundingClientRect())
    .map(r => { const x0 = Math.max(0, r.left / GW), y0 = Math.max(0, r.top / GH), x1 = Math.min(1, r.right / GW), y1 = Math.min(1, r.bottom / GH); return [x0, y0, x1 - x0, y1 - y0]; }) // só a parte na tela
    .filter(([, , w, h]) => w > .002 && h > .002)
    .map(([x, y, w, h], i, all) => ({id: all.length > 1 ? `${id}-${i + 1}` : id, seletor: q, tipo, x: +x.toFixed(4), y: +y.toFixed(4), w: +w.toFixed(4), h: +h.toFixed(4)})));
  const t = {schema: 1, medido_em: new Date().toISOString(), resolucao: [TW, TH], aspecto: '16:9', janela: [GW, GH], camera: {...c, somenteLeitura: true},
    horizonte: proj2(new THREE.Vector3(0, 0, -5000))[1],
    // IMMERSIVE WORLD: o palácio não entra na câmera competitiva; o template marca o campo e os anéis da moldura ambiental.
    silhuetas: [{id: 'campo-16m', pontos: ring(16)}, {id: 'balaustrada-17.3m', pontos: ring(17.3)}, {id: 'colunata-19.4m', pontos: ring(19.4)}], zonas};
  t.arquivo = (await upload('template', 'camera-composition-template.png', templatePng(t))).caminho;
  return t;
}
function templatePng(t) {
  const c = Object.assign(document.createElement('canvas'), {width: TW, height: TH}), g = c.getContext('2d'), X = x => x * TW, Y = y => y * TH;
  g.fillStyle = '#0b1622'; g.fillRect(0, 0, TW, TH);
  g.lineWidth = 6; g.font = '600 44px system-ui'; g.setLineDash([24, 14]); g.strokeStyle = '#ffffff99';
  g.beginPath(); g.moveTo(0, Y(t.horizonte)); g.lineTo(TW, Y(t.horizonte)); g.moveTo(TW / 2, 0); g.lineTo(TW / 2, TH); g.stroke(); g.setLineDash([]);
  for (const [i, s] of t.silhuetas.entries()) { g.strokeStyle = i ? COLORS.arquitetura : COLORS.campo; g.beginPath(); s.pontos.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](X(x), Y(y))); g.closePath(); g.stroke(); }
  for (const z of t.zonas) { g.strokeStyle = COLORS[z.tipo]; g.fillStyle = COLORS[z.tipo] + '30'; g.fillRect(X(z.x), Y(z.y), X(z.w), Y(z.h)); g.strokeRect(X(z.x), Y(z.y), X(z.w), Y(z.h));
    g.fillStyle = '#fff'; g.fillText(z.id, X(z.x) + 12, Y(z.y) + 52); }
  g.fillStyle = '#fff'; g.fillText('CAMPO 16 m · BALAUSTRADA 17,3 m · COLUNATA 19,4 m (moldura ambiental)', 24, 60);
  g.fillText(`CAMERA FOV ${t.camera.fov} · pos ${t.camera.position.join(', ')} · lookAt ${t.camera.lookAt.join(', ')} · somente leitura`, 24, TH - 40);
  return c.toDataURL('image/png');
}

// ---------------- Ações ----------------
async function upload(tipo, nome, dados) { return ctx.api('producao/arquivo', {id: PID, tipo, nome, dados}); }
const readFile = (file, bin) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; bin ? r.readAsArrayBuffer(file) : r.readAsDataURL(file); });
const uid = p => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
async function save(msg) {
  const r = await ctx.api('producao', {projeto: proj});
  proj = r.projeto; ui.manifest &&= r.manifesto;
  if (msg) ctx.notice(msg, true);
}
const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { ctx.notice(e.message); } paint(); };

const onClick = guard(async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.mode) {
    if (ui.mode === 'cinematica' && d.mode !== 'cinematica' && ui.gameOn) { const g = await game(); g.sc.poseCinematic(null); g.doc.querySelector('#stage')?.classList.remove('arena-intro'); }
    ui.mode = d.mode;
    if (d.mode === 'jogo') await game();
    if (d.mode === 'cinematica') { await loadKeys(); (await game()).doc.querySelector('#stage')?.classList.add('arena-intro'); } // só o mundo, como na abertura
    return;
  }
  if (d.cine) return cineAction(d.cine, +d.k);
  if (d.tool) { ui.tool = d.tool; return; }
  if (d.ab) { ui.ab = d.ab; return; }
  if (d.ref) { const r = proj.referencias.find(x => x.id === d.ref); ui.render = r.arquivo; ui.mode = ui.mode === 'artboard' || ui.mode === 'jogo' ? 'split' : ui.mode; return; }
  if (d.asset) { ui.asset = d.asset === ui.asset ? null : d.asset; return; }
  const act = d.act;
  if (act === 'template') { proj.template = await measure(); await save('Camera Composition Template medido no jogo real e salvo.'); ui.tpl = true; }
  if (act === 'render') { const {sc} = await game(); ui.render = sc.snapshot(1920); if (ui.mode === 'jogo' || ui.mode === 'artboard') ui.mode = 'split'; }
  if (act === 'save-render') {
    const up = await upload('referencia', `render-camera-competitiva`, ui.render);
    proj.referencias.push({id: uid('render'), nome: `Render 3D ${new Date().toLocaleString('pt-BR')}`, tipo: 'render', arquivo: up.caminho, largura: up.largura, altura: up.altura});
    await save('Render guardado nas referências.');
  }
  if (act === 'approve') {
    const b = ab(); if (!confirm(`Aprovar ${b.nome} e congelar? Arquivo e anotações deixam de mudar; correções viram nova versão.`)) return;
    b.congelado = true; b.aprovado_em = new Date().toISOString(); stageTo('master-artboard', 'aprovada'); await save(`${b.nome} aprovado e congelado.`);
  }
  if (act === 'manifest') ui.manifest = ui.manifest ? null : await ctx.api(`producao/manifesto?id=${PID}`);
  if (act === 'new-asset') {
    const nome = prompt('Nome do asset (ex.: Balustrade Left)'); if (!nome) return;
    const id = nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    if (!id || proj.assets.some(a => a.id === id)) return ctx.notice('Id vazio ou repetido.');
    proj.assets.push({id, nome, categoria: ui.cat || 'architecture', referencia: null, dimensoes: [1, 1, 1], posicao: [0, 0, 0], escala: [1, 1, 1], material: null, lod: 'procedural', estado: 'reference', dependencias: [], glb: null, thumb: null, versao: 1, nota: ''});
    ui.asset = id;
  }
  if (act === 'del-asset') {
    const users = proj.assets.filter(a => a.dependencias.includes(ui.asset)).map(a => a.nome);
    if (users.length) return ctx.notice(`Dependem dele: ${users.join(', ')}.`);
    if (!confirm('Apagar este asset do breakdown? (o arquivo GLB fica no disco)')) return;
    proj.assets = proj.assets.filter(a => a.id !== ui.asset); ui.asset = null;
  }
  if (act === 'clear-region') asset().referencia = null;
  if (act === 'thumb') { const a = asset(); a.thumb = (await upload('thumb', `${a.id}-thumb.png`, await crop(ab().arquivo, a.referencia))).caminho; a.versao++; }
  if (act === 'save') await save('Projeto de produção salvo em data/arena-production/poseidon-palace.json.');
});

function stageTo(k, para) {
  const e = proj.etapas[k]; if (e.status === para) return;
  e.historico.push({em: new Date().toISOString(), de: e.status, para}); e.status = para;
  if (para === 'concluida' || para === 'aprovada') e.versao++;
}

async function crop(src, r) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const w = Math.max(1, Math.round(r.w * img.naturalWidth)), h = Math.max(1, Math.round(r.h * img.naturalHeight)), s = Math.min(1, 512 / Math.max(w, h));
  const c = Object.assign(document.createElement('canvas'), {width: Math.round(w * s), height: Math.round(h * s)});
  c.getContext('2d').drawImage(img, r.x * img.naturalWidth, r.y * img.naturalHeight, w, h, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

const onChange = guard(async e => {
  const t = e.target, d = t.dataset;
  if (d.kf) return keyInput(t);
  if (d.stage) { stageTo(d.stage, t.value); return save(); }
  if (d.ui === 'cat') { ui.cat = t.value; return; }
  if (d.ui === 'abtipo') { ui.abTipo = t.value; return; }
  if (d.ui === 'tpl') { ui.tpl = t.checked; return; }
  if (d.check) { const b = ab(); (b.checklist ||= {})[d.check] = t.checked; return save(); }
  if (d.field) { const a = asset(); a[d.field] = d.field === 'dependencias' ? t.value.split(',').map(s => s.trim()).filter(Boolean) : t.value || (d.field === 'material' ? null : ''); return; }
  if (d.xyz) { asset()[d.xyz][+d.i] = +t.value; return; }
  if (d.mat) { const m = proj.materiais[+d.mat]; m[d.k] = d.k === 'baseColor' ? t.value : +t.value; return; }
  if (!d.up || !t.files[0]) return;
  const file = t.files[0];
  if (d.up === 'zip') {
    const buf = new Uint8Array(await readFile(file, true)); let bin = ''; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode(...buf.subarray(i, i + 32768));
    if (!confirm('Importar o pacote substitui o projeto atual com o mesmo id. Continuar?')) return;
    const r = await ctx.api('producao/importar', {zip: btoa(bin)}); proj = r.projeto; ui = {...fresh(), ab: proj.artboards.at(-1)?.id || null};
    return ctx.notice(`Pacote importado: ${r.restaurados.length} arquivos restaurados.`, true);
  }
  const up = await upload(d.up, file.name, await readFile(file));
  if (d.up === 'artboard') {
    const v = Math.max(0, ...proj.artboards.filter(b => (b.tipo || 'battlefield') === ui.abTipo).map(b => b.versao)) + 1, id = uid('ab');
    proj.artboards.push({id, tipo: ui.abTipo, versao: v, nome: `${ABT[ui.abTipo]} Artboard V${v}`, arquivo: up.caminho, largura: up.largura, altura: up.altura, congelado: false, anotacoes: [], checklist: {}, criado_em: new Date().toISOString()});
    ui.ab = id; ui.mode = 'artboard'; stageTo('master-artboard', 'em andamento');
    if (up.largura && Math.abs(up.largura / up.altura - 16 / 9) > .02) ctx.notice(`Atenção: ${up.largura}×${up.altura} não é 16:9; o template não vai alinhar.`);
  }
  if (d.up === 'referencia') proj.referencias.push({id: uid('ref'), nome: file.name, tipo: 'referencia', arquivo: up.caminho, largura: up.largura, altura: up.altura});
  if (d.up === 'asset') { const a = asset(); a.glb = up.caminho; a.versao++; if (STATES.indexOf(a.estado) < STATES.indexOf('model')) a.estado = 'model'; }
  await save(`${file.name} validado e salvo (${(up.bytes / 1048576).toFixed(2)} MB).`);
});

function onInput(e) {
  const d = e.target.dataset;
  if (!['opa', 'split', 'mix'].includes(d.ui)) return;
  ui[d.ui] = +e.target.value; stage();
}

// Região (arrastar) e anotação (clique) em coordenadas normalizadas do artboard.
function onDown(e) {
  const hit = e.target.closest('.ap-hit'); if (!hit || ui.tool === 'ver' || ui.mode === 'jogo' || !ab()) return;
  const box = hit.getBoundingClientRect(), at = ev => [Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width)), Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height))];
  const [x0, y0] = at(e);
  if (ui.tool === 'nota') {
    if (ab().congelado) return;
    const texto = prompt('Anotação'); if (!texto) return;
    ab().anotacoes.push({x: +x0.toFixed(4), y: +y0.toFixed(4), texto}); save().then(paint, err => ctx.notice(err.message)); return;
  }
  if (!ui.asset) return ctx.notice('Escolha um asset na lista antes de marcar a região.');
  const box2 = Object.assign(document.createElement('div'), {className: 'ap-reg'}); hit.append(box2);
  const move = ev => { const [x1, y1] = at(ev); Object.assign(box2.style, {left: `${Math.min(x0, x1) * 100}%`, top: `${Math.min(y0, y1) * 100}%`, width: `${Math.abs(x1 - x0) * 100}%`, height: `${Math.abs(y1 - y0) * 100}%`}); };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    const [x1, y1] = at(ev), r = {x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0)};
    if (r.w < .005 || r.h < .005) { box2.remove(); return; }
    const a = asset(); a.referencia = {...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(4)])), artboard: ab().id};
    if (STATES.indexOf(a.estado) < STATES.indexOf('concept')) a.estado = 'concept';
    stageTo('asset-breakdown', 'em andamento'); paint();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

// ---------------- Cinematic Sequence Editor ----------------
// Monta a abertura da arena: ESTABLISHING SHOT → ENVIRONMENT REVEAL → CAMERA TRAVEL → BATTLEFIELD ARRIVAL → GOD REVEAL → GAMEPLAY START.
// Prévia no jogo real (iframe): a câmera cinematográfica usa a mesma cena; a última chave é a competitiva e não se edita.
async function loadKeys() {
  const {sc} = await game();
  const saved = await ctx.api('producao/cinematica?arena=poseidon');
  ui.keys = structuredClone(saved.keys || sc.cinematicKeys);
  ui.ksel = Math.min(ui.ksel, ui.keys.length - 1);
}
function cineEditor() {
  if (!ui.keys) return '<p class="hint">Carregando a abertura…</p>';
  const total = ui.keys.reduce((a, k) => a + (+k.dur || 0), 0);
  const n = (i, f, c, step = .1, dis = false) => `<input type="number" step="${step}" value="${c === undefined ? ui.keys[i][f] : ui.keys[i][f][c]}" data-kf="${f}" data-k="${i}" ${c === undefined ? '' : `data-kc="${c}"`} ${dis ? 'disabled' : ''}>`;
  const rows = ui.keys.map((k, i) => { const L = !!k.locked;
    return `<tr aria-current="${i === ui.ksel}"><td>${i + 1}</td>
      <td><input value="${esc(k.stage)}" data-kf="stage" data-k="${i}" ${L ? 'disabled' : ''}></td>
      <td class="ap-xyz">${[0, 1, 2].map(c => n(i, 'pos', c, .5, L)).join('')}</td>
      <td class="ap-xyz">${[0, 1, 2].map(c => n(i, 'look', c, .5, L)).join('')}</td>
      <td>${n(i, 'fov', undefined, 1, L)}</td><td>${n(i, 'roll', undefined, 1, L)}</td><td>${n(i, 'dur', undefined, 100)}</td>
      <td><select data-kf="ease" data-k="${i}">${EASES.map(x => `<option ${x === k.ease ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
      <td>${n(i, 'light', undefined, .05, L)}</td>
      <td><select data-kf="vfx" data-k="${i}" ${L ? 'disabled' : ''}>${VFX.map(x => `<option value="${x}" ${x === (k.vfx || '') ? 'selected' : ''}>${x || '—'}</option>`).join('')}</select></td>
      <td><input value="${esc(k.sound || '')}" data-kf="sound" data-k="${i}" placeholder="—" ${L ? 'disabled' : ''} size="6"></td>
      <td><button data-cine="pose" data-k="${i}">Ver</button>${L ? '<small> competitiva 🔒</small>' : `<button data-cine="up" data-k="${i}" ${i ? '' : 'disabled'}>↑</button><button data-cine="down" data-k="${i}" ${i < ui.keys.length - 2 ? '' : 'disabled'}>↓</button><button data-cine="dup" data-k="${i}">+</button><button data-cine="del" data-k="${i}" ${ui.keys.length > 2 ? '' : 'disabled'}>×</button>`}</td></tr>`; }).join('');
  return `<div class="ap-bar"><button data-cine="play">▶ Tocar abertura</button><button data-cine="skip">Pular</button><button data-cine="home">Câmera competitiva</button>
      <button data-cine="save">Salvar abertura</button><button data-cine="storyboard">Gerar storyboard</button><button data-cine="reset">Padrão</button>
      <small>${ui.keys.length} chaves · ${(total / 1000).toFixed(1)} s · arena-forge/cinematics/poseidon.json</small></div>
    <div style="overflow:auto"><table class="ap-keys"><thead><tr><th>#</th><th>Etapa</th><th>Posição x y z</th><th>Ponto focal x y z</th><th>FOV</th><th>Roll°</th><th>ms</th><th>Easing</th><th>Luz</th><th>VFX</th><th>Som</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">Duração = tempo para chegar na chave (na primeira, tempo parado no plano de abertura). Pular e "reduzir movimento" vão direto para a câmera competitiva. Som: nome do áudio ambiente; o jogo ainda não toca som na abertura.</p>`;
}
async function keyInput(el) {
  const k = ui.keys[+el.dataset.k], f = el.dataset.kf;
  if (el.dataset.kc !== undefined) k[f][+el.dataset.kc] = +el.value;
  else if (f === 'stage' || f === 'ease') k[f] = el.value;
  else if (f === 'sound' || f === 'vfx') k[f] = el.value || null;
  else k[f] = +el.value;
  ui.ksel = +el.dataset.k;
  if (ui.posed === ui.ksel) (await game()).sc.poseCinematic(k);
}
async function cineAction(act, i) {
  const {sc} = await game(), K = ui.keys;
  if (act === 'pose') { ui.ksel = i; ui.posed = K[i].locked ? null : i; sc.poseCinematic(K[i].locked ? null : K[i]); }
  if (act === 'home') { ui.posed = null; sc.poseCinematic(null); }
  if (act === 'play') { ui.posed = null; sc.poseCinematic(null); sc.cinematic(K); }
  if (act === 'skip') sc.skipCinematic();
  if (act === 'up') { [K[i - 1], K[i]] = [K[i], K[i - 1]]; ui.ksel = i - 1; }
  if (act === 'down') { [K[i + 1], K[i]] = [K[i], K[i + 1]]; ui.ksel = i + 1; }
  if (act === 'dup') { K.splice(i + 1, 0, {...structuredClone(K[i]), stage: `${K[i].stage} 2`}); ui.ksel = i + 1; }
  if (act === 'del') { K.splice(i, 1); ui.ksel = Math.max(0, i - 1); }
  if (act === 'reset') {
    if (!confirm('Voltar para a abertura padrão de Poseidon? As mudanças não salvas se perdem.')) return;
    ui.keys = structuredClone((await import('../arena-forge/poseidon-palace.js')).CINEMATIC_POSEIDON);
  }
  if (act === 'save') {
    const r = await ctx.api('producao/cinematica', {arena: 'poseidon', keys: K});
    if (proj.etapas['art-direction'].status === 'pendente') stageTo('art-direction', 'em andamento');
    await save(`Abertura salva (${(r.duracao_ms / 1000).toFixed(1)} s). O preview do jogo lê o mesmo arquivo.`);
  }
  if (act === 'storyboard') await storyboard(sc);
}
// Camera Transition Storyboard: um quadro por chave, montados numa folha 16:9 que vira artboard do tipo Storyboard (aprovável).
async function storyboard(sc) {
  const shots = [];
  for (const k of ui.keys) { sc.poseCinematic(k.locked ? null : k); await new Promise(r => setTimeout(r, 450)); shots.push([k, sc.snapshot(960)]); }
  sc.poseCinematic(null); ui.posed = null;
  const W = 1920, H = 1080, cols = 3, rows = Math.ceil(shots.length / cols), cw = W / cols, ch = H / rows;
  const c = Object.assign(document.createElement('canvas'), {width: W, height: H}), g = c.getContext('2d');
  g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H); g.font = '600 22px system-ui';
  for (const [i, [k, url]] of shots.entries()) {
    const img = await new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.src = url; });
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, w = cw - 12, h = Math.min(w * 9 / 16, ch - 40);
    g.drawImage(img, x + 6, y + 6, h * 16 / 9, h);
    g.fillStyle = '#fff'; g.fillText(`${i + 1}. ${k.stage} · ${k.dur} ms · FOV ${k.fov}`, x + 10, y + h + 30);
  }
  const up = await upload('artboard', 'camera-transition-storyboard.png', c.toDataURL('image/png'));
  const v = Math.max(0, ...proj.artboards.filter(b => b.tipo === 'storyboard').map(b => b.versao)) + 1, id = uid('ab');
  proj.artboards.push({id, tipo: 'storyboard', versao: v, nome: `Storyboard Artboard V${v}`, arquivo: up.caminho, largura: up.largura, altura: up.altura,
    congelado: false, anotacoes: [], checklist: {}, criado_em: new Date().toISOString(), chaves: ui.keys.map(k => k.stage)});
  await save(`Storyboard V${v} gerado com ${shots.length} quadros da câmera real.`);
}
