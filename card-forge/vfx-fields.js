// Card Forge, aba Animações: efeito de shader por carta (VFX Forge V3). Grava em data/vfx-studio.json, nunca em data/cards.json nem na arte.
import {SHADERS, HOLO} from '../shared/vfx/presets.js';
import {startCardFx} from '../shared/vfx/card-mount.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const box = document.querySelector('#vfxFields');
let studio = {cartas: {}, raridades: {}, composicoes: {}}, current = null, shownId = null, fx = null;
const options = (list, value) => list.map(([v, t]) => `<option value="${esc(v)}" ${v === (value || '') ? 'selected' : ''}>${esc(t)}</option>`).join('');
const shaders = [['', 'Sem efeito'], ...SHADERS.map(s => [s.id, s.nome])];

function paint() {
  const own = studio.cartas?.[current?.id] || {}, holoName = HOLO.find(h => h.id === studio.raridades?.[current?.raridade])?.nome || 'sem efeito';
  box.innerHTML = `<h4>Efeitos na carta</h4><p class="hint">A arte não muda. Sem efeito, a carta fica como está.</p>
    <label>Parada na mesa <select name="idle">${options(shaders, own.idle)}</select></label>
    <label>Inspeção <select name="inspecao">${options(shaders, own.inspecao)}</select></label>
    <label>Holográfico na coleção <select name="holo">${options([['', `O da raridade (${holoName})`], ...HOLO.map(h => [h.id, h.nome])], own.holo)}</select></label>
    <label>Força <input type="range" name="forca" min="0" max="1" step="0.05" value="${own.forca ?? .6}"></label>
    <label>Velocidade <input type="range" name="velocidade" min="0.1" max="4" step="0.1" value="${own.velocidade ?? 1}"></label>
    <label>Cor <input type="color" name="cor" value="${esc(own.cor || '#e6c36a')}"></label>
    <button type="button" data-vfx-preview>Ver na carta viva</button><button type="button" data-vfx-request>Gerar animação…</button><a class="hint" href="/star-hill/criador.html?a=${current?.id || ''}" target="_blank" rel="noopener">Testar no Criador</a><output class="hint" data-vfx-status></output>`;
}
async function save() {
  const f = Object.fromEntries([...box.querySelectorAll('[name]')].map(x => [x.name, x.type === 'range' ? Number(x.value) : x.value]));
  const entry = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
  const status = box.querySelector('[data-vfx-status]');
  try {
    const r = await fetch('/api/star-hill/vfx-studio', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tipo: 'carta', id: current.id, valor: entry.idle || entry.inspecao || entry.holo ? entry : null})});
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(data.erro || 'Não foi salvo. Feche e abra o Card Forge para atualizar o servidor.');
    studio = data.studio;
    fx?.setData(studio);
    status.textContent = 'Salvo.';
  } catch (error) { status.textContent = error.message; }
}
export async function mountVfxFields() {
  studio = await fetch('/data/vfx-studio.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : studio)).catch(() => studio);
  fx = startCardFx({quality: 'high', data: studio, card: id => (current?.id === id ? current : null), context: el => (el.closest('#livePreview') ? 'inspecao' : null)});
  box.addEventListener('change', save);
  box.addEventListener('click', e => {
    if (e.target.closest('[data-vfx-request]')) return void import('/shared/anim-request.js').then(m => m.openAnimRequest({card: current, cards: current ? [current] : []}));
    if (!e.target.closest('[data-vfx-preview]')) return;
    const select = document.querySelector('#representation');
    select.value = 'live';
    select.dispatchEvent(new Event('input', {bubbles: true}));
  });
  if (current) paint();
}
export function syncVfxFields(card) {
  current = card;
  if (card?.id !== shownId) { shownId = card?.id; paint(); }
}
