// Biblioteca de sons em seções (autor, 02/11/2026): jogo, tipo (vozes, FX), personagem e estilo; a lista só mostra o que sobrou.
// Fonte: indice.json de tools/rea-ps3/biblioteca-sons.py, servido em /biblioteca-sons/ pelo card-forge/serve.py (só local).
const LIB = '/biblioteca-sons/';
const SECOES = [
  ['Vozes', [['voz-golpe', 'Golpes especiais'], ['voz-batalha', 'Batalha'], ['voz-historia', 'História'], ['voz-narracao', 'Narração e menus']]],
  ['Efeitos (FX)', [['fx-golpe', 'Golpes'], ['fx-sistema', 'Combate e sistema'], ['fx-ambiente', 'Ambiente']]],
];
const NOME_SECAO = Object.fromEntries(SECOES.flatMap(([, itens]) => itens));
const LANGS = [['jp', 'JP'], ['pt', 'PT'], ['es', 'ES']];
const PAGE = 200;
const ORDENS = [['', 'Ordem padrão'], ['asc', 'Menor tempo primeiro'], ['desc', 'Maior tempo primeiro']];
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z"/></svg>';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

let library = null, dialog = null, audio = null, opts = {};
// Idioma só para ouvir e escolher: a fala tem o mesmo número nos 3 idiomas, e o duelo toca a do idioma do jogador (autor, 02/11/2026).
const savedLang = () => { try { return localStorage.getItem('sb-lang'); } catch { return null; } };
const state = {jogo: 'soldiers-soul', secao: 'voz-golpe', cod: null, grupo: null, lang: LANGS.some(([k]) => k === savedLang()) ? savedLang() : 'pt', q: '', limit: PAGE, ordem: '', playing: null};
// O seletor reabre onde estava: jogo, seção, personagem, estilo e rolagem (autor, 02/11/2026).
const PLACE = 'sb-lugar';
let place = null, listScroll = 0;
try { place = JSON.parse(localStorage.getItem(PLACE)); } catch { /* sem armazenamento */ }
function savePlace() { // a cada mudança: o evento close chega tarde, com o dialog já oculto e a rolagem em 0
  const {jogo, secao, cod, grupo, limit} = state;
  if (state.q) return;
  place = {jogo, secao, cod, grupo, limit, scroll: listScroll};
  try { localStorage.setItem(PLACE, JSON.stringify(place)); } catch { /* vale até recarregar a página */ }
}

const NO_LIB = 'A biblioteca não respondeu. Feche e abra o STAR HILL ou o Card Forge para atualizar o servidor.';
const toSound = ([id, secao, cod, grupo, cue, s, langs, texto]) => ({id, secao, cod, grupo, cue, s, langs, texto, jogo: 'soldiers-soul'});
export const soundUrl = (id, lang = state.lang) => `${LIB}${lang}/${id}.mp3`;
export const soundLang = () => state.lang;
function loadLibrary() {
  // Textos à parte do índice: a transcrição (tools/rea-ps3/transcrever-sons.py) aparece aos poucos, sem regerar nada.
  return library ||= Promise.all(['indice', 'falas-pt'].map(f => fetch(`${LIB}${f}.json`, {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null)).catch(() => null))).then(([d, falas]) => {
    if (!d) library = null;
    const sons = (d?.sons || []).map(toSound);
    for (const x of sons) { const [bank, fala] = x.id.split('/'); x.texto ||= falas?.[bank]?.[fala] || ''; }
    return {ok: !!d, jogos: d?.jogos || [], nomes: d?.nomes || {}, sons: sons.sort((a, b) => !a.texto - !b.texto)}; // com fala transcrita primeiro: é o que dá para ler antes de ouvir
  });
}
const mine = () => (opts.extra || []).map(x => ({...x, jogo: 'meus'}));
const allSounds = lib => [...lib.sons, ...mine()];
const urlOf = (x, lang) => x.url || soundUrl(x.id, x.langs.includes(lang) ? lang : x.langs[0]);
const label = x => x.texto || x.nome || x.cue || x.id;
const charName = (lib, cod) => (!cod ? 'Geral' : lib.nomes[cod] || lib.nomes[cod.slice(1)] || cod);

function stop() {
  audio?.pause();
  audio = null;
  state.playing = null;
  dialog?.querySelectorAll('[data-play]').forEach(b => { b.innerHTML = PLAY; b.closest('li')?.classList.remove('is-playing'); });
}
function play(x, button) {
  const same = state.playing === x.id;
  stop();
  if (same) return;
  state.playing = x.id;
  audio = new Audio(urlOf(x, state.lang));
  audio.addEventListener('ended', stop);
  audio.play().catch(stop);
  if (button) { button.innerHTML = STOP; button.closest('li')?.classList.add('is-playing'); }
}

function filtered(lib) {
  const q = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length) return allSounds(lib).filter(x => { const hay = `${x.texto} ${x.nome} ${x.cue} ${x.id} ${charName(lib, x.cod)} ${x.grupo}`.toLowerCase(); return q.every(w => hay.includes(w)); });
  return allSounds(lib).filter(x => x.jogo === state.jogo && x.secao === state.secao);
}
// Por duração (autor, 02/11/2026); som sem duração conhecida fica por último nas duas ordens.
const ordered = list => (!state.ordem ? list : [...list].sort((a, b) => (!a.s - !b.s) || (state.ordem === 'asc' ? a.s - b.s : b.s - a.s)));
const counted = (list, key) => { const out = new Map(); for (const x of list) out.set(x[key], (out.get(x[key]) || 0) + 1); return out; };

function drawRail(lib) {
  const by = counted(allSounds(lib).filter(x => x.jogo === state.jogo), 'secao');
  const games = [...lib.jogos, ...(opts.extra?.length || opts.onUpload ? [{id: 'meus', nome: 'Meus sons'}] : [])];
  const sections = state.jogo === 'meus' ? [['Meus sons', [...by.keys()].map(k => [k, k])]] : SECOES;
  dialog.querySelector('.sb-games').innerHTML = games.map(j => `<button type="button" data-jogo="${esc(j.id)}" aria-pressed="${state.jogo === j.id}">${esc(j.nome)}</button>`).join('');
  dialog.querySelector('.sb-sections').innerHTML = sections.map(([titulo, itens]) => `<h3>${esc(titulo)}</h3>${itens.map(([id, nome]) =>
    `<button type="button" data-secao="${esc(id)}" aria-current="${!state.q && state.secao === id}"><span>${esc(nome)}</span><small>${(by.get(id) || 0).toLocaleString('pt-BR')}</small></button>`).join('')}`).join('')
    + (state.jogo === 'meus' && opts.onUpload ? '<label class="sb-upload">Enviar áudio<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav,.zip" hidden></label>' : '');
}
function drawChars(lib, list) {
  const box = dialog.querySelector('.sb-chars'), by = counted(list, 'cod'), show = !state.q && by.size > 1;
  box.hidden = !show;
  if (!show) return;
  const rows = [...by.entries()].sort((a, b) => charName(lib, a[0]).localeCompare(charName(lib, b[0]), 'pt-BR'));
  box.innerHTML = `<h3>Personagem</h3><button type="button" data-cod="" data-all aria-current="${state.cod === null}"><span>Todos</span><small>${list.length.toLocaleString('pt-BR')}</small></button>
    ${rows.map(([c, n]) => `<button type="button" data-cod="${esc(c)}" aria-current="${state.cod === c && state.cod !== null}"><span>${esc(charName(lib, c))}${c && charName(lib, c) !== c ? ` <i>${esc(c)}</i>` : ''}</span><small>${n.toLocaleString('pt-BR')}</small></button>`).join('')}`;
}
function drawGroups(list) {
  const box = dialog.querySelector('.sb-groups'), by = counted(list, 'grupo'), show = !state.q && by.size > 1;
  box.hidden = !show;
  if (!show) return;
  const rows = [...by.entries()].sort((a, b) => b[1] - a[1]);
  box.innerHTML = rows.length > 14
    ? `<label>Cena <select data-grupo-select><option value="">Todas (${list.length})</option>${[...by.keys()].sort().map(g => `<option value="${esc(g)}" ${state.grupo === g ? 'selected' : ''}>${esc(g)} (${by.get(g)})</option>`).join('')}</select></label>`
    : `<button type="button" data-grupo="" aria-pressed="${!state.grupo}">Todos</button>${rows.map(([g, n]) => `<button type="button" data-grupo="${esc(g)}" aria-pressed="${state.grupo === g}">${esc(g)} <small>${n}</small></button>`).join('')}`;
}
function drawList(lib, list) {
  const rows = list.slice(0, state.limit), current = opts.value;
  dialog.querySelector('.sb-count').textContent = `${list.length.toLocaleString('pt-BR')} ${list.length === 1 ? 'som' : 'sons'}`;
  const ul = dialog.querySelector('.sb-list');
  ul.innerHTML = rows.map(x => {
    const place = state.q ? `${NOME_SECAO[x.secao] || x.secao} · ${charName(lib, x.cod)} · ` : '', tags = (x.langs || []).length > 1 ? x.langs.join(' ').toUpperCase() : '';
    return `<li class="${x.id === current ? 'is-current' : ''}" data-id="${esc(x.id)}" tabindex="-1"><button type="button" class="sb-play" data-play aria-label="Ouvir ${esc(label(x))}">${PLAY}</button>
      <span class="sb-text"><b>${esc(label(x))}</b><small>${esc(place)}${x.texto ? `${esc(x.cue)} · ` : ''}${x.s ? `${x.s.toFixed(1)} s` : ''}${tags ? ` · ${tags}` : ''}</small></span>
      <button type="button" class="sb-use" data-use>${x.id === current ? 'Em uso' : 'Usar'}</button></li>`;
  }).join('') || `<li class="sb-empty">${lib.ok || state.jogo === 'meus' ? 'Nenhum som com esse filtro.' : NO_LIB}</li>`;
  const more = dialog.querySelector('.sb-more');
  more.hidden = list.length <= state.limit;
  more.textContent = `Mostrar mais (${(list.length - state.limit).toLocaleString('pt-BR')})`;
}
let view = [];
function draw() {
  return loadLibrary().then(lib => {
    const base = filtered(lib);
    drawRail(lib);
    drawChars(lib, base);
    const byChar = state.cod !== null && !state.q ? base.filter(x => x.cod === state.cod) : base;
    drawGroups(byChar);
    view = ordered(state.grupo && !state.q ? byChar.filter(x => x.grupo === state.grupo) : byChar);
    drawList(lib, view);
    savePlace();
    dialog.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  });
}
const reset = () => { state.cod = null; state.grupo = null; state.limit = PAGE; dialog.querySelector('.sb-list').scrollTop = 0; };

function build() {
  if (!document.querySelector('link[data-sound-browser]')) document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" data-sound-browser href="/shared/sound-browser.css?v=6">`);
  dialog = document.createElement('dialog');
  dialog.className = 'sb';
  dialog.innerHTML = `<p class="sb-target" hidden></p><header class="sb-head"><div class="sb-title"><h2></h2><small class="sb-current"></small></div>
      <input class="sb-search" type="search" placeholder="Buscar em tudo: fala, personagem, golpe" aria-label="Buscar som" autocomplete="off">
      <span class="sb-lang-label">Ouvir em</span><div class="sb-langs" role="group" aria-label="Idioma ao ouvir" title="Escolha em qualquer idioma: os outros vêm junto">${LANGS.map(([k, l]) => `<button type="button" data-lang="${k}">${l}</button>`).join('')}</div>
      <button type="button" class="sb-clear" data-clear>Sem som</button><button type="button" class="sb-close" data-close aria-label="Fechar">✕</button></header>
    <div class="sb-body"><nav class="sb-rail" aria-label="Seções"><div class="sb-games" role="group" aria-label="Jogo"></div><div class="sb-sections"></div></nav>
      <nav class="sb-chars" aria-label="Personagens"></nav>
      <section class="sb-main"><div class="sb-bar"><div class="sb-groups" role="group" aria-label="Estilo"></div><select class="sb-sort" aria-label="Ordenar sons">${ORDENS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><span class="sb-count" role="status"></span></div>
        <ul class="sb-list"></ul><button type="button" class="sb-more" hidden></button></section></div>`;
  document.body.append(dialog);
  dialog.addEventListener('close', stop);
  dialog.querySelector('.sb-list').addEventListener('scroll', e => { listScroll = e.target.scrollTop; savePlace(); });
  let typing;
  dialog.querySelector('.sb-search').addEventListener('input', e => { clearTimeout(typing); typing = setTimeout(() => { state.q = e.target.value; state.limit = PAGE; draw(); }, 120); });
  dialog.addEventListener('change', async e => {
    if (e.target.matches('[data-grupo-select]')) { state.grupo = e.target.value || null; state.limit = PAGE; draw(); }
    if (e.target.matches('.sb-sort')) { state.ordem = e.target.value; state.limit = PAGE; dialog.querySelector('.sb-list').scrollTop = 0; draw(); }
    if (e.target.closest('.sb-upload') && e.target.files?.[0]) { const file = e.target.files[0]; dialog.close(); await opts.onUpload(file); }
  });
  dialog.addEventListener('click', e => {
    if (e.target === dialog) return dialog.close(); // clique fora do painel
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset, row = b.closest('li[data-id]');
    if (d.close !== undefined) return dialog.close();
    if (d.clear !== undefined) { dialog.close(); return opts.onPick(null); }
    if (d.lang) { state.lang = d.lang; try { localStorage.setItem('sb-lang', d.lang); } catch { /* sem armazenamento */ } stop(); return draw(); }
    if (d.jogo) { state.jogo = d.jogo; state.secao = [...loaded, ...mine()].find(x => x.jogo === d.jogo)?.secao || state.secao; reset(); clearSearch(); return draw(); }
    if (d.secao) { state.secao = d.secao; reset(); clearSearch(); return draw(); }
    if (d.cod !== undefined) { state.cod = d.all !== undefined ? null : d.cod; state.grupo = null; state.limit = PAGE; dialog.querySelector('.sb-list').scrollTop = 0; return draw(); }
    if (d.grupo !== undefined) { state.grupo = d.grupo || null; state.limit = PAGE; return draw(); }
    if (b.classList.contains('sb-more')) { state.limit += PAGE; return draw(); }
    if (!row) return;
    const x = view.find(s => s.id === row.dataset.id);
    if (d.play !== undefined) return play(x, b);
    if (d.use !== undefined) {
      if (state.q) { clearSearch(); listScroll = 0; Object.assign(state, {jogo: x.jogo, secao: x.secao, cod: x.cod, grupo: null, limit: PAGE}); savePlace(); } // achou pela busca: guarda o lugar do som
      dialog.close();
      return opts.onPick(x, state.lang);
    }
  });
  // Lista inteira no teclado: setas andam, espaço ouve, Enter usa.
  dialog.querySelector('.sb-list').addEventListener('keydown', e => {
    const row = e.target.closest('li[data-id]');
    if (!row || e.target.matches('input')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); (e.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling)?.querySelector('.sb-play')?.focus(); }
    if (e.key === 'Enter' && e.target.matches('.sb-play')) { e.preventDefault(); row.querySelector('.sb-use').click(); }
  });
}
let loaded = [];
const clearSearch = () => { state.q = ''; dialog.querySelector('.sb-search').value = ''; };

// `value`: id do som em uso. `extra`: sons do projeto ({id, url, nome, secao, grupo, cod, langs: []}). `onPick(som | null, idioma)`.
export async function openSoundBrowser({title = 'Escolher som', alvo = '', value = '', extra = [], onPick, onUpload = null, secao = null, silence = false}) {
  if (!dialog) build();
  opts = {value, extra, onPick, onUpload};
  const lib = await loadLibrary();
  loaded = lib.sons;
  const now = allSounds(lib).find(x => x.id === value);
  const all = allSounds(lib), there = p => all.some(x => x.jogo === p.jogo && x.secao === p.secao && (p.cod === null || x.cod === p.cod) && (!p.grupo || x.grupo === p.grupo));
  const back = place && there(place) ? place : null; // lugar que sumiu (ex.: Meus sons no Forge) não vale
  if (back) Object.assign(state, {jogo: back.jogo, secao: back.secao, cod: back.cod, grupo: back.grupo});
  else if (now) Object.assign(state, {jogo: now.jogo, secao: now.secao, cod: now.cod, grupo: null});
  else if (secao) Object.assign(state, {jogo: 'soldiers-soul', secao, cod: null, grupo: null});
  if (!lib.ok && extra.length) state.jogo = 'meus';
  if (state.jogo === 'meus' && !extra.some(x => x.secao === state.secao)) state.secao = extra[0]?.secao || state.secao;
  state.limit = back?.limit || PAGE;
  clearSearch();
  dialog.querySelector('h2').textContent = title;
  const target = dialog.querySelector('.sb-target'); // para onde vai o som: não se perder depois de procurar um tempo (autor, 02/11/2026)
  target.textContent = alvo; target.hidden = !alvo;
  const cur = dialog.querySelector('.sb-current');
  cur.textContent = `${now ? `Em uso: ${label(now)}` : value ? `Em uso: ${value}` : 'Nenhum som escolhido'} · vale nos 3 idiomas`;
  dialog.querySelector('.sb-clear').disabled = !value && !silence; // silence: Sem som é uma escolha, mesmo sem som em uso
  dialog.showModal();
  dialog.querySelector('.sb-search').focus();
  await draw();
  if (back) dialog.querySelector('.sb-list').scrollTop = back.scroll || 0;
  else dialog.querySelector('.is-current')?.scrollIntoView({block: 'center'});
}
