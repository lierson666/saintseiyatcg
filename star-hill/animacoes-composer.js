// STAR HILL · VFX Forge V3: Animation Composer, Living Cards e Holographic Cards, dentro do gestor de animações.
// Grava em data/vfx-studio.json. Uma composição salva aparece no seletor de cada momento (padrão, facção, carta e linha de habilidade).
import {SHADERS, HOLO, LOTTIES, FACTION_PRESETS, LAYER_TYPES, MAX_COMPOSITION_MS} from '/shared/vfx/presets.js';
import {allEffects, mountPreview, saveStudio, setPreviewQuality, studioNow} from '/shared/anim-picker.js?v=4';
import {startCardFx} from '/shared/vfx/card-mount.js';
import {renderLiveCard} from '/shared/live-card.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LAYER_DEFAULT = {
  carta: {duracao: 900, escala: 1.1, y: -20, easing: 'ease-out'}, camera: {duracao: 1800, escala: 1.06, easing: 'ease-in-out'},
  shader: {duracao: 1400, shader: 'cosmic-aura', alvo: 'carta', forca: .8, cor: '#e6c36a'}, particulas: {duracao: 1000, efeito: 'light', cor: '#e6c36a', escala: 1},
  lottie: {duracao: 1200, lottie: LOTTIES[0].id, alvo: 'carta'}, audio: {duracao: 1000, som: '', volume: .8}, ui: {duracao: 700, alvo: 'mesa', cor: '#ffffff', opacidade: .3},
};
const typeName = id => LAYER_TYPES.find(t => t.id === id)?.nome || id;
const options = (list, value) => list.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('');
const num = (i, key, label, value, min, max, step) => `<label>${label}<input type="number" data-layer="${i}" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${esc(value ?? '')}"></label>`;
const pick = (i, key, label, list, value) => `<label>${label}<select data-layer="${i}" data-key="${key}">${options(list, value)}</select></label>`;
const color = (i, value) => `<label>Cor<input type="color" data-layer="${i}" data-key="cor" value="${esc(value || '#e6c36a')}"></label>`;
const TARGETS = [['carta', 'Carta'], ['mesa', 'Mesa inteira']];
const EASE = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map(e => [e, e]);

let comp = null, compId = '', stage = null, hooks = null, cards = [], cardFx = null, previewCard = '', playing = null;

function params(l, i) {
  const motion = `${num(i, 'x', 'X', l.x, -800, 800, 1)}${num(i, 'y', 'Y', l.y, -800, 800, 1)}${num(i, 'escala', 'Escala', l.escala, .1, 4, .01)}`;
  if (l.tipo === 'carta') return `${motion}${num(i, 'rotacao', 'Rotação', l.rotacao, -360, 360, 1)}${num(i, 'opacidade', 'Opacidade', l.opacidade, 0, 1, .05)}${pick(i, 'easing', 'Easing', EASE, l.easing)}`;
  if (l.tipo === 'camera') return `${motion}${pick(i, 'easing', 'Easing', EASE, l.easing)}`;
  if (l.tipo === 'shader') return `${pick(i, 'shader', 'Shader', SHADERS.filter(s => s.modo != null).map(s => [s.id, s.nome]), l.shader)}${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${num(i, 'forca', 'Força', l.forca, 0, 1, .05)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}${color(i, l.cor)}`;
  if (l.tipo === 'particulas') return `${pick(i, 'efeito', 'Efeito', allEffects().filter(e => !e.id.includes(':')).map(e => [e.id, e.nome]), l.efeito)}${num(i, 'escala', 'Escala', l.escala, .1, 4, .1)}${color(i, l.cor)}`;
  if (l.tipo === 'lottie') return `${pick(i, 'lottie', 'Arquivo', LOTTIES.map(x => [x.id, x.nome]), l.lottie)}${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${num(i, 'velocidade', 'Velocidade', l.velocidade, .1, 4, .1)}<label>Loop<input type="checkbox" data-layer="${i}" data-key="loop" ${l.loop === false ? '' : 'checked'}></label>`;
  if (l.tipo === 'audio') return `<label class="cx-wide">Arquivo no projeto<input data-layer="${i}" data-key="som" value="${esc(l.som)}" placeholder="playtest/assets/som.ogg"></label>${num(i, 'volume', 'Volume', l.volume, 0, 1, .05)}`;
  return `${pick(i, 'alvo', 'Alvo', TARGETS, l.alvo)}${color(i, l.cor)}${num(i, 'opacidade', 'Opacidade', l.opacidade, 0, 1, .05)}`;
}
function timeline() {
  if (!comp) return '<p class="hint">Escolha ou crie uma composição.</p>';
  const ticks = Array.from({length: 7}, (_, s) => `<span style="left:${s * 100 / 6}%">${s}s</span>`).join('');
  return `<div class="cx-ruler">${ticks}</div>${comp.camadas.map((l, i) => `<div class="cx-layer${l.ativa === false ? ' is-off' : ''}">
      <div class="cx-track"><b class="cx-bar cx-bar--${l.tipo}" style="left:${l.inicio * 100 / MAX_COMPOSITION_MS}%;width:${Math.max(1, l.duracao) * 100 / MAX_COMPOSITION_MS}%">${esc(typeName(l.tipo))}</b></div>
      <div class="cx-params"><label><input type="checkbox" data-layer="${i}" data-key="ativa" ${l.ativa === false ? '' : 'checked'}> Ligada</label>${num(i, 'inicio', 'Início (ms)', l.inicio, 0, MAX_COMPOSITION_MS, 50)}${num(i, 'duracao', 'Duração (ms)', l.duracao, 1, MAX_COMPOSITION_MS, 50)}${params(l, i)}
        <button type="button" data-cx="remove" data-i="${i}">Tirar</button></div></div>`).join('') || '<p class="hint">Sem camadas.</p>'}`;
}
export function composerSection() {
  const list = Object.entries(studioNow().composicoes || {});
  return `<section class="panel tl" id="cx"><div class="tl-head"><h2>Animation Composer</h2><span class="tag">Só apresentação: a partida segue a Engine 3.0</span></div>
    <p class="hint">Salve e escolha a composição em qualquer momento acima: padrão, facção, carta ou linha de habilidade.</p>
    <div class="cx-bar-top"><label class="tl-field"><span>Composição</span><select data-cx-select><option value="">Escolher…</option>${options(list.map(([id, c]) => [id, c.nome]), compId)}</select></label>
      <label class="tl-field"><span>Nome</span><input data-cx-name maxlength="60" value="${esc(comp?.nome || '')}" ${comp ? '' : 'disabled'}></label>
      <button type="button" data-cx="new">Nova</button><button type="button" data-cx="save" ${comp ? '' : 'disabled'}>Salvar</button><button type="button" data-cx="delete" ${compId ? '' : 'disabled'}>Excluir</button></div>
    <div class="cx-bar-top"><label class="tl-field"><span>Camada</span><select data-cx-add>${options(LAYER_TYPES.map(t => [t.id, t.nome]), 'shader')}</select></label><button type="button" data-cx="add" ${comp ? '' : 'disabled'}>Adicionar camada</button>
      <label class="tl-field"><span>Perfil da prévia</span><select data-cx-quality>${options([['high', 'HIGH'], ['medium', 'MEDIUM'], ['low', 'LOW']], 'high')}</select></label><button type="button" data-cx="play" ${comp ? '' : 'disabled'}>▶ Testar</button><output class="hint" id="cx-plan"></output></div>
    <div id="cx-stage" class="cx-stage"></div>
    <div id="cx-timeline">${timeline()}</div></section>`;
}
export function livingSection(card) {
  if (!card) return '';
  const own = studioNow().cartas?.[card.id] || {};
  const shaderList = [['', 'Sem efeito'], ...SHADERS.map(s => [s.id, s.nome])];
  return `<h3>Living Card e holográfico</h3><p class="hint">A arte original não muda. Sem escolha, a carta fica estática. Movimento vem de shader; animação esquelética depende de arte em camadas.</p>
    <div class="cx-living"><div class="cx-live" data-preview-card="${esc(card.id)}">${renderLiveCard(card)}</div><div class="cx-fields" data-living="${esc(card.id)}">
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

function mountStage() {
  const box = document.querySelector('#cx-stage');
  if (box && !box.childElementCount) stage = mountPreview(box);
}
const redrawTimeline = () => { const t = document.querySelector('#cx-timeline'); if (t) t.innerHTML = timeline(); };
export function composerMounted(list, redraw, notice) {
  cards = list; hooks = {redraw, notice};
  mountStage();
  const data = studioNow();
  cardFx ??= startCardFx({quality: 'high', data, card: id => cards.find(c => c.id === id), context: el => (el.closest('.cx-live') ? 'inspecao' : null)});
  cardFx.setData(studioNow());
}
const save = async (kind, id, value, message) => {
  try { await saveStudio(kind, id, value); hooks.notice(message, true); cardFx?.setData(studioNow()); } catch (error) { hooks.notice(error.message); }
};
const slug = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'composicao';

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cx]');
  if (!b) return;
  const act = b.dataset.cx;
  if (act === 'new') { comp = {nome: 'Nova composição', camadas: []}; compId = ''; return hooks.redraw(); }
  if (act === 'add') {
    const tipo = document.querySelector('[data-cx-add]').value;
    comp.camadas.push({tipo, inicio: 0, ...LAYER_DEFAULT[tipo]});
    return redrawTimeline();
  }
  if (act === 'remove') { comp.camadas.splice(Number(b.dataset.i), 1); return redrawTimeline(); }
  if (act === 'play') {
    const ms = playing = stage?.(comp);
    document.querySelector('#cx-plan').textContent = ms ? `${(ms / 1000).toFixed(1)} s neste perfil` : 'Nada toca neste perfil.';
    return;
  }
  if (act === 'save') {
    compId ||= slug(comp.nome);
    await save('composicao', compId, comp, 'Composição salva. Escolha nos momentos; Publicar no site leva ao jogo online.');
    return hooks.redraw();
  }
  if (act === 'delete') { await save('composicao', compId, null, 'Composição excluída.'); comp = null; compId = ''; return hooks.redraw(); }
  if (act === 'preset') {
    const box = b.closest('[data-living]'), p = FACTION_PRESETS[b.dataset.p];
    await save('carta', box.dataset.living, {...(studioNow().cartas?.[box.dataset.living] || {}), inspecao: p.shader, forca: p.forca, cor: p.cor}, `${p.nome} na inspeção.`);
    return hooks.redraw();
  }
});
const clean = entry => Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== '' && v != null));
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.matches('[data-cx-select]')) { compId = t.value; comp = compId ? structuredClone(studioNow().composicoes[compId]) : null; return hooks.redraw(); }
  if (t.matches('[data-cx-quality]')) return setPreviewQuality(t.value);
  if (t.matches('[data-cx-name]')) { comp.nome = t.value; return; }
  if (t.dataset.rarity) return save('raridade', t.dataset.rarity, t.value || null, 'Holográfico da raridade salvo.');
  if (t.dataset.layer != null) {
    const l = comp.camadas[Number(t.dataset.layer)], k = t.dataset.key;
    if (t.type === 'checkbox') l[k] = t.checked;
    else if (t.type === 'number') { if (t.value === '') delete l[k]; else l[k] = Number(t.value); }
    else l[k] = t.value;
    return redrawTimeline();
  }
  const box = t.closest('[data-living]');
  if (box) {
    const f = Object.fromEntries([...box.querySelectorAll('[name]')].map(x => [x.name, x.type === 'range' ? Number(x.value) : x.value]));
    return save('carta', box.dataset.living, clean(f).idle || clean(f).inspecao || clean(f).holo ? clean(f) : null, 'Efeito da carta salvo.');
  }
});
