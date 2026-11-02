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
const CODES = {SEY: 'Seiya', SRU: 'Shiryu', HYG: 'Hyoga', SYN: 'Shun', IKI: 'Ikki'};
const lineText = value => { const [c, n] = (value || '').split('/'); return falas[c]?.[n]; };
const hear = value => {
  player?.pause();
  if (!value) return;
  const [c, n] = value.split('/');
  player = new Audio(`/MUSIC/fx/ps3-voz-${c}-jp/${n}.mp3`);
  player.play().catch(() => {});
};
const picker = (key, value) => {
  const text = lineText(value);
  return `<span class="rr-voice"><button type="button" class="rr-voice-open" data-voice="${key}" data-value="${esc(value)}" aria-haspopup="dialog" title="Escolher voz">${value ? `<b>${esc(value)}</b> ${esc(text ?? '')}` : '— sem voz —'}</button><button type="button" data-hear="${key}" aria-label="Ouvir em japonês" ${value ? '' : 'disabled'}>▶</button></span>`;
};

// Popup de vozes: personagem à esquerda, falas à direita. Ouvir não escolhe; clicar na fala escolhe e fecha.
let dialog = null, choose = null, chosen = '', code = '';
function voiceRows() {
  const query = dialog.querySelector('.vp-search').value.trim().toLowerCase();
  const rows = (query ? Object.keys(falas) : [code]).flatMap(c => Object.entries(falas[c] || {})
    .filter(([n, t]) => !query || `${c}/${n} ${t}`.toLowerCase().includes(query))
    .map(([n, t]) => `<li><button type="button" class="vp-pick" data-pick="${c}/${n}" aria-current="${chosen === `${c}/${n}`}">${query ? `<b>${c}</b> ` : ''}<b>${n}</b><span>${esc(t)}</span></button><button type="button" data-listen="${c}/${n}" aria-label="Ouvir ${c} ${n}">▶</button></li>`));
  dialog.querySelector('.vp-list').innerHTML = rows.join('') || '<li class="vp-empty">Nenhuma fala encontrada.</li>';
  dialog.querySelector('.vp-count').textContent = rows.length === 1 ? '1 fala' : `${rows.length} falas`;
  dialog.querySelectorAll('[data-code]').forEach(b => b.setAttribute('aria-pressed', String(!query && b.dataset.code === code)));
}
function voiceDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'voice-picker';
  dialog.setAttribute('aria-label', 'Escolher voz');
  dialog.innerHTML = `<header><h2>Escolher voz</h2><input class="vp-search" type="search" placeholder="Buscar fala ou número em todos os personagens" aria-label="Buscar fala"><span class="vp-count" role="status"></span><button type="button" data-pick="">Sem voz</button><button type="button" data-close aria-label="Fechar">✕</button></header>
    <nav aria-label="Personagens">${Object.entries(falas).map(([c, list]) => `<button type="button" data-code="${c}"><b>${c}</b>${CODES[c] ? `<span>${CODES[c]}</span>` : ''}<small>${Object.keys(list).length}</small></button>`).join('')}</nav>
    <ul class="vp-list"></ul>`;
  document.body.append(dialog);
  dialog.querySelector('.vp-search').addEventListener('input', voiceRows);
  dialog.addEventListener('close', () => player?.pause());
  dialog.addEventListener('click', e => {
    if (e.target === dialog) return dialog.close(); // clique fora do popup
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.close !== undefined) dialog.close();
    if (b.dataset.listen) hear(b.dataset.listen);
    if (b.dataset.code) { code = b.dataset.code; dialog.querySelector('.vp-search').value = ''; voiceRows(); dialog.querySelector('.vp-list').scrollTop = 0; }
    if (b.dataset.pick !== undefined) { choose(b.dataset.pick); dialog.close(); }
  });
  return dialog;
}
function openVoices(value, onChoose) {
  voiceDialog();
  choose = onChoose;
  chosen = value;
  code = value.split('/')[0] in falas ? value.split('/')[0] : Object.keys(falas)[0];
  dialog.querySelector('.vp-search').value = '';
  voiceRows();
  dialog.showModal();
  dialog.querySelector('.vp-pick[aria-current=true]')?.scrollIntoView({block: 'center'});
}

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
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.hear !== undefined) {
      hear(box.querySelector(`[data-voice="${b.dataset.hear}"]`).dataset.value);
      return;
    }
    if (b.dataset.voice !== undefined) {
      const key = b.dataset.voice;
      openVoices(b.dataset.value, picked => {
        const v = entry(getId()), value = picked || null;
        if (/^\d+$/.test(key)) { v.linhas[Number(key)] = value; for (let i = 0; i < v.linhas.length; i++) v.linhas[i] ??= null; } else v[key] = value;
        save(getId());
        draw([...box.querySelectorAll('.rr-text')].map(t => t.value));
      });
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
  let drawnId = null;
  const refresh = () => {
    const typing = box.contains(document.activeElement) && document.activeElement.classList.contains('rr-text');
    const same = [...box.querySelectorAll('.rr-text')].map(t => t.value.trim()).filter(Boolean).join('\n\n') === area.value.trim();
    const id = getId?.() ?? null;
    if (typing && same && id === drawnId) return;
    drawnId = id;
    draw();
  };
  ready.then(refresh);
  return refresh;
}
