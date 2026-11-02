// Regras do Card Forge habilidade por habilidade, de cima para baixo, cada uma com a sua fala (autor, 02/11/2026).
// O textarea original segue sendo a fonte do texto (linha em branco separa habilidades); as falas ficam em data/card-voices.json.
const split = t => t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
let falas = {}, vozes = {}, player = null;
const ready = Promise.all([
  fetch('/MUSIC/fx/ps3-voz-falas.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
  fetch('../data/card-voices.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
]).then(([f, v]) => { falas = f; vozes = v; });

const entry = id => (vozes[id] ||= {golpe: null, ultimate: null, linhas: []});
function save(id) {
  return fetch('/api/star-hill/card-voice', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, ...entry(id)})});
}
const options = value => `<option value="">— sem voz —</option>${Object.entries(falas).map(([c, list]) => `<optgroup label="${c}">${Object.entries(list).map(([n, t]) => `<option value="${c}/${n}" ${value === `${c}/${n}` ? 'selected' : ''}>${n} · ${esc(t || '(sem fala)')}</option>`).join('')}</optgroup>`).join('')}`;
const picker = (key, value) => `<span class="rr-voice"><select data-voice="${key}" aria-label="Fala">${options(value)}</select><button type="button" data-hear="${key}" aria-label="Ouvir em japonês">▶</button></span>`;

export function mountRulesRows(area, {getId = null, moments = null} = {}) {
  area.hidden = true;
  const box = document.createElement('div');
  box.className = 'rr';
  (area.closest('label') || area).after(box);
  const sync = () => {
    const value = [...box.querySelectorAll('.rr-text')].map(t => t.value.trim()).filter(Boolean).join('\n\n');
    if (value !== area.value.trim()) { area.value = value; area.dispatchEvent(new Event('input', {bubbles: true})); }
  };
  const draw = (lines = split(area.value)) => {
    const v = getId && entry(getId());
    box.innerHTML = `${lines.map((t, i) => `<div class="rr-row" data-i="${i}"><textarea class="rr-text" rows="3" spellcheck="true" aria-label="Habilidade ${i + 1}">${esc(t)}</textarea>
      <div class="rr-tools">${v ? picker(i, v.linhas[i] || '') : ''}<button type="button" data-move="-1" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button type="button" data-move="1" ${i < lines.length - 1 ? '' : 'disabled'} aria-label="Descer">↓</button><button type="button" data-del aria-label="Remover">✕</button></div></div>`).join('')}
      <button type="button" data-add>+ Habilidade</button>
      ${v && moments ? moments().map(([key, label]) => `<label class="rr-moment"><span>${label}</span>${picker(key, v[key] || '')}</label>`).join('') : ''}`;
  };
  box.addEventListener('input', e => { if (e.target.classList.contains('rr-text')) sync(); });
  box.addEventListener('change', e => {
    const key = e.target.dataset.voice;
    if (key === undefined || !getId) return;
    const v = entry(getId()), value = e.target.value || null;
    if (/^\d+$/.test(key)) { v.linhas[Number(key)] = value; for (let i = 0; i < v.linhas.length; i++) v.linhas[i] ??= null; } else v[key] = value;
    save(getId());
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.hear !== undefined) {
      const value = box.querySelector(`[data-voice="${b.dataset.hear}"]`).value;
      if (value) { const [c, n] = value.split('/'); player?.pause(); player = new Audio(`/MUSIC/fx/ps3-voz-${c}-jp/${n}.mp3`); player.play().catch(() => {}); }
      return;
    }
    const lines = [...box.querySelectorAll('.rr-text')].map(t => t.value), i = Number(b.closest('.rr-row')?.dataset.i), v = getId && entry(getId());
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
    if (b.dataset.add !== undefined) [...box.querySelectorAll('.rr-text')].at(-1)?.focus();
  });
  // Texto trocado de fora (outra carta, desfazer): redesenha sem atrapalhar quem está digitando.
  const refresh = () => { if (!box.contains(document.activeElement) || !document.activeElement.classList.contains('rr-text')) draw(); };
  ready.then(refresh);
  return refresh;
}
