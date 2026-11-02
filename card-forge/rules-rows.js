// Regras do Card Forge habilidade por habilidade, de cima para baixo, cada uma com a sua fala (autor, 02/11/2026).
// O textarea original segue sendo a fonte do texto (linha em branco separa habilidades); as falas ficam em data/card-voices.json.
const split = t => t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
import {openSoundBrowser, soundUrl} from '/shared/sound-browser.js?v=9';
let falas = {}, vozes = {}, player = null;
const ready = Promise.all([
  fetch('/biblioteca-sons/falas-pt.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
  fetch('../data/card-voices.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
]).then(([f, v]) => { falas = f; vozes = v; });

const entry = id => (vozes[id] ||= {linhas: []});
function save(id) {
  return fetch('/api/star-hill/card-voice', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, ...entry(id)})})
    .then(async r => { if (!r.ok) throw Error((await r.json().catch(() => ({}))).erro || 'Falha ao salvar.'); })
    .catch(e => alert(`O som não foi salvo: ${e.message}`));
}
const lineText = value => { const [c, n] = (value || '').split('/'); return falas[c]?.[n]; };
const hear = value => {
  player?.pause();
  if (!value) return;
  player = new Audio(soundUrl(value));
  player.play().catch(() => {});
};
const picker = (key, value) => {
  const text = lineText(value);
  return `<span class="rr-voice"><button type="button" class="rr-voice-open" data-voice="${key}" data-value="${esc(value || '')}" aria-haspopup="dialog" title="Escolher som">${value ? `<b>${esc(value)}</b> ${esc(text ?? '')}` : value === false ? '— sem som —' : '— som da facção —'}</button><button type="button" data-hear="${key}" aria-label="Ouvir" ${value ? '' : 'disabled'}>▶</button><button type="button" class="rr-mute" data-mute="${key}" aria-pressed="${value === false}" title="Passiva ou efeito sem fala: não toca nem o som da facção">Sem som</button></span>`;
};

// sound: onde ficam os seletores de som (a aba Som do Forge); as caixas de texto ficam só com o texto.
// Nome e texto em campos separados (autor, 02/11/2026): o nome vira **Nome:** em cima do texto; caixa só com keywords fica sem nome.
const parseAbility = t => {
  const m = t.match(/^\*\*([^*]+?):\*\*\s*([\s\S]*)$/) || t.match(/^\*\*([^*]+)\*\*()$/);
  return m ? {name: m[1].trim(), text: m[2].trim()} : {name: '', text: t.trim()};
};
const composeAbility = (name, text) => (name.trim() ? `**${name.trim()}${text.trim() ? ':' : ''}**${text.trim() ? `\n${text.trim()}` : ''}` : text.trim());
const abilityName = (t, i) => parseAbility(t).name || t.trim().slice(0, 28) || `Habilidade ${i + 1}`;

// @Resonance no nome ou no texto abre a lista de personagens; escolher preenche "Resonance — Nome" (guia §27).
const RESONANCE_TOKEN = /@res\p{L}*(?:\s+([^@\n]*))?$/iu;

export function mountRulesRows(area, {getId = null, moments = null, sound = null, resonanceCards = null, onResonance = null} = {}) {
  area.hidden = true;
  const box = document.createElement('div');
  box.className = 'rr';
  (area.closest('label') || area).after(box);
  const current = () => [...box.querySelectorAll('.rr-row')].map(r => composeAbility(r.querySelector('.rr-name').value, r.querySelector('.rr-text').value));
  const sync = () => {
    const value = current().filter(Boolean).join('\n\n');
    if (value !== area.value.trim()) { area.value = value; area.dispatchEvent(new Event('input', {bubbles: true})); }
  };
  const drawSound = lines => {
    if (!sound || !getId) return;
    const v = entry(getId()), row = (label, key, value) => `<div class="rr-sound"><span title="${esc(label)}">${esc(label)}</span>${picker(key, value ?? '')}</div>`;
    sound.innerHTML = `<h3 class="rr-head">Habilidades</h3>${lines.map((t, i) => row(abilityName(t, i), i, v.linhas[i])).join('') || '<p class="hint">Esta carta não tem habilidades.</p>'}
      ${moments ? `<h3 class="rr-head">Momentos da carta</h3>${moments().map(([key, label]) => row(label, key, v[key])).join('')}` : ''}`;
  };
  const draw = (lines = split(area.value)) => {
    suggest = null; // a lista some junto com as linhas redesenhadas
    box.innerHTML = `${lines.map((t, i) => `<div class="rr-row" data-i="${i}"><div class="rr-fields"><input class="rr-name" placeholder="Nome da habilidade (vazio se for só keyword)" aria-label="Nome da habilidade ${i + 1}" value="${esc(parseAbility(t).name)}"><textarea class="rr-text" rows="3" spellcheck="true" placeholder="Texto da habilidade" aria-label="Texto da habilidade ${i + 1}">${esc(parseAbility(t).text)}</textarea></div>
      <div class="rr-tools"><button type="button" data-move="-1" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button type="button" data-move="1" ${i < lines.length - 1 ? '' : 'disabled'} aria-label="Descer">↓</button><button type="button" data-del aria-label="Remover">✕</button></div></div>`).join('')}
      <button type="button" data-add>+ Habilidade</button>`;
    drawSound(lines);
  };
  box.addEventListener('input', e => { if (e.target.matches('.rr-text, .rr-name')) { sync(); drawSound(current()); } });
  let suggest = null; // {field, row, options, active, el}
  const closeSuggest = () => { suggest?.el.remove(); suggest = null; };
  const paintSuggest = () => {
    suggest.el.innerHTML = suggest.options.map((o, i) => `<div role="option" class="rr-option" data-res="${esc(o.name)}" aria-selected="${i === suggest.active}"><b>${esc(o.name)}</b><small>${esc(o.detail || '')}</small></div>`).join('') || '<p class="hint">Nenhuma carta com esse nome.</p>';
    suggest.el.querySelector('[aria-selected=true]')?.scrollIntoView({block: 'nearest'});
  };
  const updateSuggest = field => {
    const m = resonanceCards && field.value.slice(0, field.selectionEnd).match(RESONANCE_TOKEN);
    if (!m) return closeSuggest();
    const q = (m[1] || '').trim().toLowerCase(), options = resonanceCards().filter(o => o.name.toLowerCase().includes(q)).slice(0, 40), row = field.closest('.rr-row');
    if (suggest?.row !== row) { closeSuggest(); suggest = {row, el: Object.assign(document.createElement('div'), {className: 'rr-suggest'})}; suggest.el.setAttribute('role', 'listbox'); suggest.el.setAttribute('aria-label', 'Personagem da Resonance'); row.querySelector('.rr-fields').append(suggest.el); }
    Object.assign(suggest, {field, options, active: 0});
    paintSuggest();
  };
  const pickResonance = name => {
    const {field, row} = suggest, nameField = row.querySelector('.rr-name'), textField = row.querySelector('.rr-text'), end = field.selectionEnd;
    field.value = field.value.slice(0, end).replace(RESONANCE_TOKEN, '').trimEnd() + field.value.slice(end);
    const old = nameField.value.trim();
    if (old && !/^Resonance\b/i.test(old)) textField.value = `${old} — ${textField.value.trim()}`; // o nome antigo vira começo do texto, como em "Resonance — Shun: Counterattack — …"
    nameField.value = `Resonance — ${name}`;
    closeSuggest();
    sync();
    drawSound(current());
    onResonance?.(name);
    textField.focus();
  };
  box.addEventListener('input', e => { if (e.target.matches('.rr-text, .rr-name')) updateSuggest(e.target); });
  box.addEventListener('keydown', e => {
    if (!suggest) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return closeSuggest(); }
    if (!suggest.options.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); suggest.active = (suggest.active + (e.key === 'ArrowDown' ? 1 : -1) + suggest.options.length) % suggest.options.length; paintSuggest(); }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickResonance(suggest.options[suggest.active].name); }
  });
  box.addEventListener('mousedown', e => { const o = e.target.closest('[data-res]'); if (o) { e.preventDefault(); pickResonance(o.dataset.res); } });
  box.addEventListener('focusout', e => { if (suggest && !box.contains(e.relatedTarget)) closeSuggest(); });
  const onClick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.hear !== undefined) {
      hear(sound.querySelector(`[data-voice="${b.dataset.hear}"]`).dataset.value);
      return;
    }
    if (b.dataset.mute !== undefined) { // false: mudo de propósito; null: volta ao som da facção
      const key = b.dataset.mute, v = entry(getId()), set = value => { if (/^\d+$/.test(key)) { v.linhas[Number(key)] = value; for (let i = 0; i < v.linhas.length; i++) v.linhas[i] ??= null; } else v[key] = value; };
      set(b.getAttribute('aria-pressed') === 'true' ? null : false);
      save(getId());
      draw(current());
      return;
    }
    if (b.dataset.voice !== undefined) {
      const key = b.dataset.voice;
      openSoundBrowser({title: 'Escolher som da carta', value: b.dataset.value, silence: true, secao: key === 'golpe' || key === 'ultimate' ? 'voz-golpe' : 'voz-batalha', onPick: picked => {
        const v = entry(getId()), value = picked?.id ?? false; // o botão Sem som do seletor chega como null
        if (/^\d+$/.test(key)) { v.linhas[Number(key)] = value; for (let i = 0; i < v.linhas.length; i++) v.linhas[i] ??= null; } else v[key] = value;
        save(getId());
        draw(current());
      }});
      return;
    }
    const lines = current(), i = Number(b.closest('.rr-row')?.dataset.i), v = getId && entry(getId());
    if (b.dataset.add !== undefined) lines.push('');
    if (b.dataset.del !== undefined) { lines.splice(i, 1); v?.linhas.splice(i, 1); }
    if (b.dataset.move) {
      const j = i + Number(b.dataset.move);
      [lines[i], lines[j]] = [lines[j], lines[i]];
      if (v) { const l = v.linhas; [l[i], l[j]] = [l[j] ?? null, l[i] ?? null]; }
    }
    if (v && !b.dataset.add) save(getId());
    draw(lines);
    sync();
    if (b.dataset.add !== undefined) [...box.querySelectorAll('.rr-name')].at(-1)?.focus();
  };
  box.addEventListener('click', onClick);
  sound?.addEventListener('click', onClick);
  // Texto trocado de fora (outra carta, desfazer): redesenha sem atrapalhar quem está digitando.
  let drawnId = null;
  const refresh = () => {
    const typing = box.contains(document.activeElement) && document.activeElement.matches('.rr-text, .rr-name');
    const same = current().filter(Boolean).join('\n\n') === area.value.trim();
    const id = getId?.() ?? null;
    if (typing && same && id === drawnId) return;
    drawnId = id;
    draw();
  };
  ready.then(refresh);
  return refresh;
}
