// STAR HILL · VFX Forge V3: Animation Composer, Living Cards e Holographic Cards, dentro do gestor de animações.
// Grava em data/vfx-studio.json. Uma composição salva aparece no seletor de cada momento (padrão, facção, carta e linha de habilidade).
// O rascunho vive em memória: nenhuma edição, prévia ou desfazer grava arquivo; só o botão Salvar grava.
import {SHADERS, HOLO, LOTTIES, FACTION_PRESETS, LAYER_TYPES} from '/shared/vfx/presets.js';
import {allEffects, mountPreview, saveStudio, setPreviewQuality, studioNow} from '/shared/anim-picker.js?v=5';
import {startCardFx} from '/shared/vfx/card-mount.js';
import {renderLiveCard} from '/shared/live-card.js';
import {createHistory} from '/shared/editor-history.js';
import {MAX_MS, PICO_PADRAO, addLayer, atRate, duplicateLayer, fitTiming, moveLayer, removeLayer, sameComp, totalMs, uniqueId} from './composer-model.js';
import {confirmar} from './confirmar.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LAYER_DEFAULT = {
  carta: {duracao: 900, escala: 1.1, y: -20, easing: 'ease-out'}, camera: {duracao: 1800, escala: 1.06, easing: 'ease-in-out'},
  shader: {duracao: 1400, shader: 'cosmic-aura', alvo: 'carta', forca: .8, cor: '#e6c36a'}, particulas: {duracao: 1000, efeito: 'light', cor: '#e6c36a', escala: 1},
  lottie: {duracao: 1200, lottie: LOTTIES[0].id, alvo: 'carta'}, audio: {duracao: 1000, som: '', volume: .8}, ui: {duracao: 700, alvo: 'mesa', cor: '#ffffff', opacidade: .3},
};
// Receitas são só camadas comuns já preenchidas: depois de adicionadas, editam-se como qualquer outra.
const RECEITAS = {
  flash: {nome: 'Flash', camadas: [{tipo: 'ui', inicio: 0, duracao: 200, alvo: 'mesa', cor: '#ffffff', opacidade: .7, pico: .2}]},
  tremor: {nome: 'Tremor', camadas: [-10, 9, -6, 4].map((x, n) => ({tipo: 'camera', inicio: n * 70, duracao: 70, x, escala: 1, easing: 'linear'}))},
  recuo: {nome: 'Recuo', camadas: [{tipo: 'carta', inicio: 0, duracao: 300, y: 16, escala: .95, pico: .2, easing: 'ease-out'}]},
};
const typeName = id => LAYER_TYPES.find(t => t.id === id)?.nome || id;
const options = (list, value) => list.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('');
const num = (i, key, label, value, min, max, step) => `<label>${label}<input type="number" data-layer="${i}" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${esc(value ?? '')}"></label>`;
const pick = (i, key, label, list, value) => `<label>${label}<select data-layer="${i}" data-key="${key}">${options(list, value)}</select></label>`;
const color = (i, value) => `<label>Cor<input type="color" data-layer="${i}" data-key="cor" value="${esc(value || '#e6c36a')}"></label>`;
const TARGETS = [['carta', 'Carta'], ['mesa', 'Mesa inteira']];
const EASE = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map(e => [e, e]);
const load = (key, fallback) => { try { return Number(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const keep = (key, value) => { try { localStorage.setItem(key, value); } catch { /* sem armazenamento: vale só até fechar */ } };

let comp = null, compId = '', saved = null, history = null, sel = -1, stage = null, hooks = null, cards = [], cardFx = null;
let rate = 1, zoom = 1, loop = false, auto = true, paused = false, autoTimer = 0, versoes = null, relogio = null;

const dirty = () => !!comp && !sameComp(comp, saved);
const layerName = l => {
  const extra = l.tipo === 'shader' ? SHADERS.find(s => s.id === l.shader)?.nome : l.tipo === 'particulas' ? allEffects().find(e => e.id === l.efeito)?.nome : l.tipo === 'lottie' ? LOTTIES.find(x => x.id === l.lottie)?.nome : l.tipo === 'audio' ? l.som?.split('/').pop() : '';
  return extra ? `${typeName(l.tipo)} · ${extra}` : typeName(l.tipo);
};

// Só aparece o que o motor respeita em cada tipo. O que parece funcionar e não funciona vira aviso, não campo.
function params(l, i) {
  const motion = `${num(i, 'x', 'Posição X', l.x, -800, 800, 1)}${num(i, 'y', 'Posição Y', l.y, -800, 800, 1)}${num(i, 'escala', 'Escala', l.escala, .1, 4, .01)}`;
  const pico = key => num(i, 'pico', 'Auge (0,05 a 0,95)', l.pico ?? PICO_PADRAO[key], .05, .95, .05);
  if (l.tipo === 'carta') return `${motion}${num(i, 'rotacao', 'Rotação', l.rotacao, -360, 360, 1)}${num(i, 'opacidade', 'Opacidade', l.opacidade, 0, 1, .05)}${pick(i, 'easing', 'Easing', EASE, l.easing)}${pico('carta')}`;
  if (l.tipo === 'camera') return `${motion}${pick(i, 'easing', 'Easing', EASE, l.easing)}${pico('camera')}`;
  if (l.tipo === 'shader') return `${pick(i, 'shader', 'Shader', SHADERS.filter(s => s.modo != null).map(s => [s.id, s.nome]), l.shader)}${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${num(i, 'forca', 'Força', l.forca, 0, 1, .05)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}${color(i, l.cor)}`;
  if (l.tipo === 'particulas') return `${pick(i, 'efeito', 'Efeito', allEffects().filter(e => !e.id.includes(':')).map(e => [e.id, e.nome]), l.efeito)}${num(i, 'escala', 'Força do impacto', l.escala, .1, 4, .1)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}${color(i, l.cor)}<p class="hint cx-wide">O efeito dura o que sua folha de sprites dura: a duração só marca a barra. Para durar menos, aumente a velocidade.</p>`;
  if (l.tipo === 'lottie') return `${pick(i, 'lottie', 'Arquivo', LOTTIES.map(x => [x.id, x.nome]), l.lottie)}${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}<label class="cx-check"><input type="checkbox" data-layer="${i}" data-key="loop" ${l.loop === false ? '' : 'checked'}> Repetir</label>`;
  if (l.tipo === 'audio') return `<label class="cx-wide">Arquivo no projeto<input data-layer="${i}" data-key="som" value="${esc(l.som)}" placeholder="playtest/assets/som.ogg"></label>${num(i, 'volume', 'Volume', l.volume, 0, 1, .05)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}<p class="hint cx-wide">O som toca até o fim do arquivo: a duração não corta.</p>`;
  return `${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${color(i, l.cor)}${num(i, 'opacidade', 'Opacidade', l.opacidade, 0, 1, .05)}${pico('ui')}`;
}
function propsHtml() {
  const l = comp?.camadas[sel];
  if (!l) return `<h3>Propriedades</h3><p class="hint">${comp ? 'Selecione uma camada na lista ou na linha do tempo.' : 'Escolha ou crie uma composição.'}</p>`;
  return `<h3>${esc(layerName(l))}</h3><div class="cx-fields-grid">${num(sel, 'inicio', 'Início / delay (ms)', l.inicio, 0, MAX_MS, 50)}${num(sel, 'duracao', 'Duração (ms)', l.duracao, 1, MAX_MS, 50)}${params(l, sel)}</div>`;
}
const barStyle = l => `left:${l.inicio * 100 / MAX_MS}%;width:${Math.max(.5, l.duracao * 100 / MAX_MS)}%`;
const peakOf = l => l.pico ?? PICO_PADRAO[l.tipo];
const barText = l => `${l.inicio} ms, dura ${l.duracao} ms`;
function timelineHtml() {
  if (!comp) return '<p class="hint">Escolha ou crie uma composição.</p>';
  if (!comp.camadas.length) return '<p class="hint">Sem camadas. Adicione uma no painel à esquerda.</p>';
  const ticks = Array.from({length: 7}, (_, s) => `<span style="left:${s * 100 / 6}%">${s}s</span>`).join('');
  return `<div class="cx-tl"><div class="cx-ruler"><i></i><div>${ticks}</div></div><div class="cx-rows">${comp.camadas.map((l, i) => `<div class="cx-row${i === sel ? ' is-sel' : ''}${l.ativa === false ? ' is-off' : ''}" data-row="${i}">
    <button type="button" class="cx-row-name" data-cx="select" data-i="${i}" title="${esc(layerName(l))}">${esc(layerName(l))}</button>
    <div class="cx-track"><div class="cx-bar" data-bar="${i}" tabindex="0" role="slider" aria-label="${esc(layerName(l))}" aria-valuemin="0" aria-valuemax="${MAX_MS}" aria-valuenow="${l.inicio}" aria-valuetext="${barText(l)}" title="Arraste para mover. Setas movem 50 ms, Shift 250 ms, Alt muda a duração." style="${barStyle(l)}">
      ${peakOf(l) != null ? `<i class="cx-peak" data-handle="peak" title="Auge da animação: arraste" style="left:${peakOf(l) * 100}%"></i>` : ''}<i class="cx-grip" data-handle="size" title="Arraste para mudar a duração"></i></div></div></div>`).join('')}<i class="cx-head" id="cx-head" hidden></i></div></div>`;
}
function layersHtml() {
  if (!comp) return '<p class="hint">Nenhuma composição aberta.</p>';
  const last = comp.camadas.length - 1;
  return `<ol class="cx-list">${comp.camadas.map((l, i) => `<li class="${i === sel ? 'is-sel' : ''}${l.ativa === false ? ' is-off' : ''}" data-item="${i}">
    <input type="checkbox" data-layer="${i}" data-key="ativa" ${l.ativa === false ? '' : 'checked'} aria-label="Ligar ${esc(layerName(l))}" title="Ligar ou desligar">
    <button type="button" class="cx-list-name" data-cx="select" data-i="${i}" title="${esc(layerName(l))}">${esc(layerName(l))}</button>
    <span class="cx-list-acts"><button type="button" data-cx="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Subir" title="Subir: a ordem decide quem desenha por cima e qual shader entra quando o perfil limita">↑</button><button type="button" data-cx="down" data-i="${i}" ${i < last ? '' : 'disabled'} aria-label="Descer" title="Descer">↓</button><button type="button" data-cx="dup" data-i="${i}" aria-label="Duplicar" title="Duplicar">⧉</button><button type="button" data-cx="remove" data-i="${i}" aria-label="Remover" title="Remover">✕</button></span></li>`).join('')}</ol>${comp.camadas.length ? '' : '<p class="hint">Sem camadas ainda.</p>'}
    <div class="cx-add"><select data-cx-add aria-label="Tipo de camada">${options(LAYER_TYPES.map(t => [t.id, t.nome]), 'shader')}</select><button type="button" data-cx="add">Adicionar</button></div>
    <div class="cx-add"><span class="hint">Receitas:</span>${Object.entries(RECEITAS).map(([id, r]) => `<button type="button" data-cx="receita" data-r="${id}">${esc(r.nome)}</button>`).join('')}</div>`;
}
function versionsHtml() {
  if (!compId) return '';
  if (versoes === 'indisponivel') return '<p class="hint">Feche e abra o STAR HILL para ver as versões salvas.</p>';
  if (!versoes?.length) return '<p class="hint">Nenhuma versão anterior ainda. Cada Salvar guarda a que estava antes.</p>';
  return `<details class="cx-versions"><summary>${versoes.length} ${versoes.length === 1 ? 'versão anterior' : 'versões anteriores'}</summary><ul>${versoes.map((v, i) => `<li><span>${esc(v.em.replace('T', ' ').slice(0, 16))}<small>${esc(v.nome)} · ${v.camadas.length} camadas</small></span><button type="button" data-cx="version" data-i="${i}">Abrir</button></li>`).join('')}</ul></details>`;
}
const compOptions = () => `<option value="">Escolher…</option>${options(Object.entries(studioNow().composicoes || {}).map(([id, c]) => [id, c.nome]), compId)}`;
export function composerSection() {
  return `<section class="panel tl cx" id="cx"><div class="tl-head"><h2>Composer</h2><span class="tag" id="cx-dirty"></span><span class="tag">Só apresentação: a partida segue a Engine 3.0</span></div>
    <div class="cx-editor" id="cx-editor">
      <aside class="cx-left" aria-label="Composição e camadas">
        <label class="tl-field"><span>Composição</span><select data-cx-select>${compOptions()}</select></label>
        <label class="tl-field"><span>Nome</span><input data-cx-name maxlength="60" value="${esc(comp?.nome || '')}" ${comp ? '' : 'disabled'}></label>
        <div class="cx-actions"><button type="button" data-cx="new">Nova</button><button type="button" class="cx-primary" data-cx="save">Salvar</button><button type="button" data-cx="delete">Excluir</button><button type="button" data-cx="undo" aria-label="Desfazer" title="Desfazer (Cmd+Z)">↶</button><button type="button" data-cx="redo" aria-label="Refazer" title="Refazer (Cmd+Shift+Z)">↷</button></div>
        <div id="cx-versions">${versionsHtml()}</div>
        <h3>Camadas</h3><div id="cx-layers">${layersHtml()}</div></aside>
      <div class="cx-split" data-split="l" role="separator" aria-orientation="vertical" aria-label="Largura do painel de camadas" tabindex="0"></div>
      <div class="cx-center">
        <div class="cx-transport"><button type="button" class="cx-primary" data-cx="play">▶ Tocar do início</button><button type="button" data-cx="pause" aria-pressed="false">Pausar</button>
          <label class="cx-check"><input type="checkbox" data-cx-opt="loop" ${loop ? 'checked' : ''}> Loop</label><label class="cx-check" title="Toca sozinho depois de cada edição, sem salvar"><input type="checkbox" data-cx-opt="auto" ${auto ? 'checked' : ''}> Prévia ao editar</label>
          <label>Velocidade <select data-cx-opt="rate">${options([['0.25', '0,25×'], ['0.5', '0,5×'], ['1', '1×'], ['2', '2×']], String(rate))}</select></label>
          <label>Zoom <select data-cx-opt="zoom">${options([['1', '100%'], ['1.5', '150%'], ['2', '200%']], String(zoom))}</select></label>
          <label>Perfil <select data-cx-quality>${options([['high', 'HIGH'], ['medium', 'MEDIUM'], ['low', 'LOW']], 'high')}</select></label><output class="hint" id="cx-plan"></output></div>
        <div id="cx-stage" class="cx-stage"></div></div>
      <div class="cx-split" data-split="r" role="separator" aria-orientation="vertical" aria-label="Largura do painel de propriedades" tabindex="0"></div>
      <aside class="cx-right" id="cx-props" aria-label="Propriedades da camada">${propsHtml()}</aside>
      <div class="cx-split cx-split--b" data-split="b" role="separator" aria-orientation="horizontal" aria-label="Altura da linha do tempo" tabindex="0"></div>
      <div class="cx-bottom" id="cx-timeline">${timelineHtml()}</div>
    </div></section>`;
}
export function livingSection(card) {
  if (!card) return '';
  const own = studioNow().cartas?.[card.id] || {};
  const shaderList = [['', 'Sem efeito'], ...SHADERS.map(s => [s.id, s.nome])];
  return `<h3>Living Card e holográfico</h3><p class="hint">A arte original não muda. Sem escolha, a carta fica estática. Movimento vem de shader; animação esquelética depende de arte em camadas.</p>
    <div class="cx-living"><div class="cx-live" data-preview-card="${esc(card.id)}">${renderLiveCard(card, {art: card.ilustracao ? `/card-forge/art-web/${card.ilustracao}` : undefined})}</div><div class="cx-fields" data-living="${esc(card.id)}">
      <label class="tl-field"><span>Parada na mesa (idle)</span><select name="idle">${options(shaderList, own.idle || '')}</select></label>
      <label class="tl-field"><span>Inspeção</span><select name="inspecao">${options(shaderList, own.inspecao || '')}</select></label>
      <label class="tl-field"><span>Holográfico na coleção (vazio: o da raridade)</span><select name="holo">${options([['', 'O da raridade'], ...HOLO.map(h => [h.id, h.nome])], own.holo || '')}</select></label>
      <label class="tl-speed">Força <input type="range" name="forca" min="0" max="1" step="0.05" value="${own.forca ?? .6}"></label>
      <label class="tl-speed">Velocidade <input type="range" name="velocidade" min="0.1" max="4" step="0.1" value="${own.velocidade ?? 1}"></label>
      <label class="tl-speed">Cor <input type="color" name="cor" value="${esc(own.cor || '#e6c36a')}"></label>
      <div class="cx-presets">${Object.entries(FACTION_PRESETS).map(([id, p]) => `<button type="button" data-cx="preset" data-p="${id}">${esc(p.nome)}</button>`).join('')}</div>
      <p class="hint">Entrada, Strike, habilidade e derrota usam os Momentos abaixo; escolha uma composição neles.</p></div></div>`;
}
export function holoSection() {
  const real = Object.keys(studioNow().raridades || {});
  return `<section class="panel tl"><div class="tl-head"><h2>Holographic Cards</h2><span class="tag">Raridades reais do jogo</span></div>
    <p class="hint">Reage ao cursor ou ao toque, na coleção.</p>${real.map(r => `<label class="tl-field"><span>${esc(r)}</span><select data-rarity="${esc(r)}">${options([['', 'Sem efeito'], ...HOLO.map(h => [h.id, h.nome])], studioNow().raridades[r])}</select></label>`).join('')}</section>`;
}

const $ = s => document.querySelector(s);
function paintHead() {
  const tag = $('#cx-dirty');
  if (!tag) return;
  tag.textContent = !comp ? 'Nada aberto' : dirty() ? 'Rascunho não salvo' : 'Salvo';
  tag.classList.toggle('is-dirty', dirty());
  const set = (act, off) => { const b = $(`[data-cx="${act}"]`); if (b) b.disabled = off; };
  set('save', !comp || !dirty()); set('delete', !compId); set('undo', !history?.canUndo); set('redo', !history?.canRedo); set('play', !comp?.camadas.length); set('pause', !relogio);
}
function paint() {
  const set = (s, html) => { const el = $(s); if (el) el.innerHTML = html; };
  set('#cx-layers', layersHtml()); set('#cx-props', propsHtml()); set('#cx-timeline', timelineHtml()); set('#cx-versions', versionsHtml());
  const name = $('[data-cx-name]');
  if (name) { name.disabled = !comp; if (document.activeElement !== name) name.value = comp?.nome || ''; }
  const select = $('[data-cx-select]');
  if (select) select.innerHTML = compOptions();
  paintHead();
}
function selectLayer(i) {
  sel = i;
  document.querySelectorAll('[data-row]').forEach(r => r.classList.toggle('is-sel', Number(r.dataset.row) === i));
  document.querySelectorAll('[data-item]').forEach(r => r.classList.toggle('is-sel', Number(r.dataset.item) === i));
  const props = $('#cx-props');
  if (props) props.innerHTML = propsHtml();
}
function open(next, id) {
  stopPreview();
  comp = next; compId = id; saved = id ? structuredClone(next) : null; sel = next?.camadas.length ? 0 : -1;
  history = next ? createHistory(next) : null;
  versoes = null;
  paint();
  loadVersions();
}
async function loadVersions() {
  if (!compId) return;
  const id = compId;
  try {
    const r = await fetch(`/api/star-hill/vfx-versoes/${encodeURIComponent(id)}`);
    if (id !== compId) return;
    versoes = r.ok ? (await r.json()).versoes : 'indisponivel';
  } catch { versoes = 'indisponivel'; }
  const box = $('#cx-versions');
  if (box) box.innerHTML = versionsHtml();
}
function commit(key = null) {
  history?.record(comp, key);
  paintHead();
  if (auto) { clearTimeout(autoTimer); autoTimer = setTimeout(playPreview, 300); }
}
function travel(direction) {
  const value = history?.[direction]();
  if (!value) return false;
  comp = value;
  sel = Math.min(sel, comp.camadas.length - 1);
  if (sel < 0 && comp.camadas.length) sel = 0;
  paint();
  if (auto) { clearTimeout(autoTimer); autoTimer = setTimeout(playPreview, 300); }
  return true;
}
const composerVisible = () => !!$('#cx-editor')?.offsetParent && !!comp;

// Prévia: toca o rascunho na velocidade escolhida, sem gravar. A marca da linha do tempo segue o relógio; os motores não aceitam pular para um ponto.
function stopPreview() {
  clearTimeout(autoTimer);
  stage?.stop();
  if (relogio) cancelAnimationFrame(relogio.raf);
  relogio = null; paused = false;
  const b = $('[data-cx="pause"]');
  if (b) { b.textContent = 'Pausar'; b.setAttribute('aria-pressed', 'false'); }
  const head = $('#cx-head');
  if (head) head.hidden = true;
  paintHead();
}
function playPreview() {
  if (!comp || !stage) return;
  stopPreview();
  const ms = stage(atRate(comp, rate));
  const plan = $('#cx-plan');
  if (plan) plan.textContent = ms ? `${(ms * rate / 1000).toFixed(1).replace('.', ',')} s da composição neste perfil` : 'Nada toca neste perfil.';
  if (!ms) return;
  relogio = {t: 0, last: performance.now(), raf: 0};
  const tick = now => {
    if (!relogio) return;
    if (!paused) relogio.t += now - relogio.last;
    relogio.last = now;
    const head = $('#cx-head');
    if (relogio.t >= ms) {
      if (loop) return playPreview();
      return stopPreview();
    }
    if (head) { head.hidden = false; head.style.setProperty('--at', relogio.t * rate / MAX_MS); }
    relogio.raf = requestAnimationFrame(tick);
  };
  relogio.raf = requestAnimationFrame(tick);
  paintHead();
}
function togglePause() {
  if (!relogio) return;
  paused = !paused;
  stage[paused ? 'pause' : 'resume']();
  const b = $('[data-cx="pause"]');
  b.textContent = paused ? 'Retomar' : 'Pausar';
  b.setAttribute('aria-pressed', String(paused));
}

// Painéis redimensionáveis: mouse e setas; o tamanho fica guardado neste computador.
const SPLITS = {l: {key: 'cx-l', css: '--cx-l', min: 200, max: 460, base: 270, dir: 1}, r: {key: 'cx-r', css: '--cx-r', min: 220, max: 480, base: 290, dir: -1}, b: {key: 'cx-b', css: '--cx-b', min: 130, max: 480, base: 220, dir: -1}};
function setSplit(id, value) {
  const s = SPLITS[id], v = Math.min(s.max, Math.max(s.min, Math.round(value)));
  $('#cx-editor')?.style.setProperty(s.css, `${v}px`);
  document.querySelector(`[data-split="${id}"]`)?.setAttribute('aria-valuenow', v);
  keep(s.key, v);
  return v;
}
function mountEditor() {
  if (!$('#cx-editor')) return;
  for (const id of Object.keys(SPLITS)) setSplit(id, load(SPLITS[id].key, SPLITS[id].base));
  $('#cx-editor').style.setProperty('--cx-zoom', zoom);
  paintHead();
}
const syncField = (i, key, value) => { const f = $(`#cx-props [data-layer="${i}"][data-key="${key}"]`); if (f && document.activeElement !== f) f.value = value; };
function updateBar(i) {
  const bar = document.querySelector(`[data-bar="${i}"]`), l = comp.camadas[i];
  if (!bar) return;
  bar.style.cssText = barStyle(l);
  bar.setAttribute('aria-valuenow', l.inicio);
  bar.setAttribute('aria-valuetext', barText(l));
  const peak = bar.querySelector('.cx-peak');
  if (peak) peak.style.left = `${peakOf(l) * 100}%`;
  syncField(i, 'inicio', l.inicio); syncField(i, 'duracao', l.duracao);
  if (l.pico != null) syncField(i, 'pico', l.pico);
}
document.addEventListener('pointerdown', e => {
  const split = e.target.closest('[data-split]');
  if (split) {
    const id = split.dataset.split, s = SPLITS[id], from = id === 'b' ? e.clientY : e.clientX, start = load(s.key, s.base);
    e.preventDefault();
    const move = ev => setSplit(id, start + ((id === 'b' ? ev.clientY : ev.clientX) - from) * s.dir);
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
    return;
  }
  const bar = e.target.closest('[data-bar]');
  if (!bar || e.button) return;
  const i = Number(bar.dataset.bar), l = comp.camadas[i], handle = e.target.dataset.handle, w = bar.parentElement.clientWidth, x0 = e.clientX, s0 = l.inicio, d0 = l.duracao;
  selectLayer(i);
  bar.setPointerCapture(e.pointerId);
  const move = ev => {
    const delta = (ev.clientX - x0) / w * MAX_MS;
    if (handle === 'size') Object.assign(l, fitTiming(s0, d0 + delta));
    else if (handle === 'peak') { const r = bar.getBoundingClientRect(); l.pico = Math.min(.95, Math.max(.05, Math.round((ev.clientX - r.left) / r.width * 20) / 20)); }
    else Object.assign(l, fitTiming(Math.min(s0 + delta, MAX_MS - d0), d0));
    updateBar(i);
  };
  const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); commit(); };
  bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
});
document.addEventListener('keydown', e => {
  if (!$('#cx-editor')?.offsetParent) return;
  const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight', sign = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
  const split = e.target.closest?.('[data-split]');
  if (split && (split.dataset.split === 'b' ? e.key === 'ArrowUp' || e.key === 'ArrowDown' : horizontal)) {
    const s = SPLITS[split.dataset.split];
    e.preventDefault();
    return void setSplit(split.dataset.split, load(s.key, s.base) + sign * s.dir * 16);
  }
  const bar = e.target.closest?.('[data-bar]');
  if (bar && horizontal) {
    const i = Number(bar.dataset.bar), l = comp.camadas[i], step = sign * (e.shiftKey ? 250 : 50);
    e.preventDefault();
    selectLayer(i);
    Object.assign(l, e.altKey ? fitTiming(l.inicio, l.duracao + step) : fitTiming(Math.min(l.inicio + step, MAX_MS - l.duracao), l.duracao));
    updateBar(i);
    return commit(`bar:${i}`);
  }
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'z' && comp) {
    e.preventDefault();
    travel(e.shiftKey ? 'redo' : 'undo');
  }
}, true);

export function composerMounted(list, redraw, notice) {
  cards = list; hooks = {redraw, notice};
  // O Cmd+Z do menu do app chama window.starHillHistory: com o Composer na tela, ele vale para o rascunho aberto.
  const base = window.starHillHistory;
  if (!base?.composer) window.starHillHistory = {composer: true, undo: () => (composerVisible() ? travel('undo') : base?.undo() ?? false), redo: () => (composerVisible() ? travel('redo') : base?.redo() ?? false)};
  const box = $('#cx-stage');
  if (box && !box.childElementCount) { stopPreview(); stage = mountPreview(box); mountEditor(); }
  const data = studioNow();
  cardFx ??= startCardFx({quality: 'high', data, card: id => cards.find(c => c.id === id), context: el => (el.closest('.ar-colecao') ? 'colecao' : el.closest('.cx-live') ? 'inspecao' : null)});
  cardFx.setData(studioNow());
}
// A Arena mostra a coleção com a versão escolhida, no mesmo montador. Só muda a prévia, nunca o arquivo.
export const previewStudioFx = data => cardFx?.setData(data);
const save = async (kind, id, value, message) => {
  try { await saveStudio(kind, id, value); hooks.notice(message, true); cardFx?.setData(studioNow()); return true; } catch (error) { hooks.notice(error.message); return false; }
};
const discardOk = async () => !dirty() || confirmar('Descartar as alterações não salvas desta composição?', 'Descartar');
// Depois de redesenhar a lista, o foco volta ao mesmo botão da camada; desligado na ponta, vai para o nome dela.
function focusLayerButton(act, i) {
  const b = $(`#cx-layers [data-cx="${act}"][data-i="${i}"]`);
  (b && !b.disabled ? b : $(`#cx-layers [data-cx="select"][data-i="${i}"]`) || $('[data-cx-add]'))?.focus();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cx]');
  if (!b) return;
  const act = b.dataset.cx, i = Number(b.dataset.i);
  if (act === 'select') return selectLayer(i);
  if (act === 'play') return playPreview();
  if (act === 'pause') return togglePause();
  if (act === 'undo' || act === 'redo') return travel(act);
  if (act === 'new') { if (await discardOk()) open({nome: 'Nova composição', camadas: []}, ''); return; }
  if (['add', 'receita', 'up', 'down', 'dup', 'remove'].includes(act)) {
    if (act === 'add') {
      const tipo = $('[data-cx-add]').value, at = addLayer(comp, {tipo, inicio: 0, ...LAYER_DEFAULT[tipo]});
      if (at < 0) return hooks.notice('Limite de 24 camadas por composição.');
      sel = at;
    } else if (act === 'receita') {
      const list = RECEITAS[b.dataset.r].camadas;
      if (comp.camadas.length + list.length > 24) return hooks.notice('Limite de 24 camadas por composição.');
      for (const l of list) sel = addLayer(comp, structuredClone(l));
    } else if (act === 'dup') {
      const at = duplicateLayer(comp, i);
      if (at < 0) return hooks.notice('Limite de 24 camadas por composição.');
      sel = at;
    } else if (act === 'remove') sel = removeLayer(comp, i);
    else sel = moveLayer(comp, i, act === 'up' ? -1 : 1);
    paint();
    if (act === 'up' || act === 'down') focusLayerButton(act, sel);
    else if (act === 'remove') focusLayerButton('remove', sel);
    return commit();
  }
  if (act === 'version') {
    const v = versoes[i];
    comp = {...comp, nome: v.nome, camadas: structuredClone(v.camadas)};
    sel = comp.camadas.length ? 0 : -1;
    paint();
    commit();
    return hooks.notice('Versão aberta como rascunho. Nada muda até você salvar; a atual vira uma versão anterior.', true);
  }
  if (act === 'save') {
    const id = compId || uniqueId(comp.nome, Object.keys(studioNow().composicoes || {}));
    if (await save('composicao', id, comp, 'Composição salva. Escolha nos momentos; Publicar no site leva ao jogo online.')) { compId = id; saved = structuredClone(comp); versoes = null; paint(); loadVersions(); }
    return;
  }
  if (act === 'delete') {
    if (await confirmar(`Excluir a composição “${comp.nome}”? Momentos que a usam deixam de tocá-la.`, 'Excluir') && await save('composicao', compId, null, 'Composição excluída.')) open(null, '');
    return;
  }
  if (act === 'preset') {
    const box = b.closest('[data-living]'), p = FACTION_PRESETS[b.dataset.p];
    await save('carta', box.dataset.living, {...(studioNow().cartas?.[box.dataset.living] || {}), inspecao: p.shader, forca: p.forca, cor: p.cor}, `${p.nome} na inspeção.`);
    return hooks.redraw();
  }
});
function editLayer(t) {
  const i = Number(t.dataset.layer), l = comp.camadas[i], k = t.dataset.key;
  if (t.type === 'checkbox') l[k] = t.checked;
  else if (t.type === 'number') { if (t.value === '') delete l[k]; else l[k] = Number(t.value); }
  else l[k] = t.value;
  const set = (s, html) => { const el = $(s); if (el) el.innerHTML = html; };
  if (k === 'inicio' || k === 'duracao' || k === 'pico') updateBar(i);
  else { set('#cx-timeline', timelineHtml()); set('#cx-layers', layersHtml()); }
  commit(`${i}:${k}`);
}
// Número, cor e texto mudam a cada toque; o histórico junta os toques seguidos no mesmo campo.
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('[data-cx-name]')) { comp.nome = t.value; return commit('nome'); }
  if (t.dataset.layer != null && t.tagName === 'INPUT' && t.type !== 'checkbox') editLayer(t);
});
const clean = entry => Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== '' && v != null));
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.matches('[data-cx-select]')) {
    if (!await discardOk()) { t.value = compId; return; }
    return t.value ? open(structuredClone(studioNow().composicoes[t.value]), t.value) : open(null, '');
  }
  if (t.matches('[data-cx-quality]')) return setPreviewQuality(t.value);
  if (t.dataset.cxOpt) {
    if (t.dataset.cxOpt === 'loop') loop = t.checked;
    if (t.dataset.cxOpt === 'auto') auto = t.checked;
    if (t.dataset.cxOpt === 'rate') { rate = Number(t.value); if (relogio) playPreview(); }
    if (t.dataset.cxOpt === 'zoom') { zoom = Number(t.value); $('#cx-editor').style.setProperty('--cx-zoom', zoom); }
    return;
  }
  if (t.dataset.rarity) return save('raridade', t.dataset.rarity, t.value || null, 'Holográfico da raridade salvo.');
  if (t.dataset.layer != null) {
    if (t.tagName === 'SELECT' || t.type === 'checkbox') { editLayer(t); if (t.tagName === 'SELECT') { const h = $('#cx-props h3'); if (h) h.textContent = layerName(comp.camadas[sel]); } }
    return;
  }
  const box = t.closest('[data-living]');
  if (box) {
    const f = Object.fromEntries([...box.querySelectorAll('[name]')].map(x => [x.name, x.type === 'range' ? Number(x.value) : x.value]));
    return save('carta', box.dataset.living, clean(f).idle || clean(f).inspecao || clean(f).holo ? clean(f) : null, 'Efeito da carta salvo.');
  }
});
