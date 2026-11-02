// STAR HILL · Telas e som (autor, 30/10/2026): edita data/olympus-telas.json, que o jogo lê em playtest/telas.js.
// Home (carrossel e blocos), fundos, cores, textos, animações (ligada e velocidade) e áudio (músicas e sons por evento).
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ANIMS = {compra: 'Compra de carta', conjurar: 'Conjurar carta e Base', cosmo: 'Cosmo pago e Latent', gatilho: 'Gatilhos e habilidades',
  ataque: 'Ataque (Strike)', dano: 'Dano e Soul', morte: 'Carta derrotada', turno: 'Início de turno e rodada', ultimate: 'Ultimate'};
const SOUNDS = {ultimate: 'Ultimate', clique: 'Clique nos menus', play: 'Botão Play', voltar: 'Voltar', turno: 'Início de turno', compra: 'Compra de carta', conjurar: 'Conjurar carta',
  cosmo: 'Cosmo pago', gatilho: 'Gatilho', ataque: 'Ataque', dano: 'Dano', morte: 'Carta derrotada', vitoria: 'Vitória', derrota: 'Derrota'};
// Cores com o valor padrão do CSS (shared/kv.css e playtest/divine/divine.css).
const COLORS = {
  lobby: {'--kv-bg': '#05060c', '--kv-ink': '#f5f1e6', '--kv-muted': '#a8a397', '--kv-gold': '#e6c36a', '--kv-gold-2': '#ffe7a3', '--kv-ember': '#ff8a2b', '--kv-error': '#ff9a87'},
  duelo: {'--ink': '#f4efe2', '--muted': '#b8b1c9', '--gold': '#e8c46a', '--gold-hi': '#ffe4a0', '--base': '#ffd36e', '--latent': '#b58cff', '--red': '#ff7a6a', '--shield': '#8fd8ff', '--armor': '#d8e4ff'},
};
const DESTINOS = {decks: 'Tela Decks', play: 'Abrir o Play', profile: 'Tela Profile', options: 'Tela Options'};

let doc = null, revisao = null, dirty = false, arts = [], uploads = [], audios = [], pairs = [], root = null, hooks = null;

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
function set(path, value) {
  const keys = path.split('.'), last = keys.pop();
  keys.reduce((o, k) => o[k], doc)[last] = value;
  dirty = true; status();
}
const url = path => '../' + path.split('/').map(encodeURIComponent).join('/');
const artUrl = v => !v ? '' : v.startsWith('card:') ? (arts.find(a => a.value === v)?.url || '') : url(v);

export async function loadTelas(api) {
  const [t, assets, exported] = await Promise.all([api('telas'), api('assets'), fetch(`../card-forge/art-web/cards.json?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json())]);
  doc = t.conteudo; revisao = t.revisao; dirty = false; pairs = Object.entries(doc.textos);
  // Artes -ref (provisórias, de terceiros) não entram: não vão para o site.
  arts = exported.cartas.filter(c => c.ilustracao && !c.ilustracao.includes('-ref.'))
    // God: o jogo chama de god-<facção> e acha a arte em <facção>-001 (playtest/lobby.js godForge).
    .map(c => ({value: /^[a-z]+-001$/.test(c.id) ? `card:god-${c.id.slice(0, -4)}` : `card:${c.id}`, label: `${c.nome_exibicao_en || c.nome_en || c.id} · ${c.id}`, url: '../card-forge/art-web/' + c.ilustracao}));
  library(assets);
}
function library(assets) {
  uploads = assets.arquivos.filter(a => a.grupo === 'visual' && /\.(png|jpe?g|webp|gif)$/i.test(a.arquivo));
  audios = assets.arquivos.filter(a => a.grupo !== 'visual');
}

function imagePicker(path, optional = false) {
  const v = get(doc, path) || '';
  const opts = [...arts.map(a => [a.value, a.label]), ...uploads.map(a => [a.arquivo, `Enviada · ${a.nome}`])];
  if (v && !opts.some(([o]) => o === v)) opts.unshift([v, v]);
  return `<div class="tl-img"><span class="tl-thumb" style="background-image:url('${esc(artUrl(v))}')"></span>
    <select data-path="${path}" data-kind="image">${optional ? `<option value="">— padrão do jogo —</option>` : ''}
      ${opts.map(([o, l]) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <label class="tl-upload">Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${path}" hidden></label></div>`;
}
function audioPicker(path, optional = false) {
  const v = get(doc, path);
  return `<div class="tl-audio"><select data-path="${path}" data-kind="audio">${optional ? '<option value="">— som padrão / nenhum —</option>' : ''}
    ${audios.map(a => `<option value="${esc(a.arquivo)}" ${a.arquivo === v ? 'selected' : ''}>${esc(a.grupo === 'fx' ? 'FX · ' : '')}${esc(a.nome)}</option>`).join('')}</select>
    <button type="button" data-tl="ouvir" data-src="${esc(v || '')}" ${v ? '' : 'disabled'} aria-label="Ouvir">▶</button>
    <label class="tl-upload">Enviar áudio<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" data-upload="${path}" hidden></label></div>`;
}
const field = (path, label, limit = 200) => `<label class="tl-field"><span>${label}</span><input data-path="${path}" maxlength="${limit}" value="${esc(get(doc, path))}"></label>`;
const moveBtns = (list, i, n) => `<div class="tl-row-actions"><button type="button" data-tl="up" data-list="${list}" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Subir">↑</button>
  <button type="button" data-tl="down" data-list="${list}" data-i="${i}" ${i < n - 1 ? '' : 'disabled'} aria-label="Descer">↓</button>
  <button type="button" data-tl="del" data-list="${list}" data-i="${i}" aria-label="Remover">Remover</button></div>`;

function page() {
  const h = doc.home;
  return `<div class="tl-bar panel"><span id="tl-status" class="tag"></span>
      <div class="actions"><button class="primary" data-tl="save">Salvar</button><a href="../playtest/" target="_blank" rel="noopener">Abrir jogo ↗</a>
      <button data-action="publish-site" title="Envia cartas, artes, telas e sons ao saintseiyatcg.com (sem as artes -ref).">Publicar no site</button></div></div>
    <section class="panel tl"><h2>Home · carrossel</h2><p class="hint">Cada slide: imagem de fundo e textos. A ordem aqui é a ordem no jogo.</p>
      ${h.slides.map((s, i) => `<div class="tl-card">${imagePicker(`home.slides.${i}.imagem`)}
        <div class="tl-grid">${field(`home.slides.${i}.carimbo`, 'Selo')}${field(`home.slides.${i}.linha1`, 'Linha 1')}${field(`home.slides.${i}.linha2`, 'Linha 2 (grande)')}${field(`home.slides.${i}.texto`, 'Texto')}</div>
        ${moveBtns('home.slides', i, h.slides.length)}</div>`).join('')}
      <button data-tl="add-slide" ${h.slides.length >= 12 ? 'disabled' : ''}>+ Slide</button></section>
    <section class="panel tl"><h2>Home · blocos ao lado</h2>
      ${h.blocos.map((b, i) => `<div class="tl-card">${imagePicker(`home.blocos.${i}.imagem`)}
        <div class="tl-grid">${field(`home.blocos.${i}.rotulo`, 'Rótulo')}${field(`home.blocos.${i}.titulo`, 'Título')}
        <label class="tl-field"><span>Ao clicar</span><select data-path="home.blocos.${i}.destino">${Object.entries(DESTINOS).map(([k, l]) => `<option value="${k}" ${b.destino === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        ${moveBtns('home.blocos', i, h.blocos.length)}</div>`).join('')}
      <button data-tl="add-bloco" ${h.blocos.length >= 6 ? 'disabled' : ''}>+ Bloco</button>
      <div class="tl-grid">${field('home.botao_play', 'Texto do botão Play', 30)}</div></section>
    <section class="panel tl"><h2>Fundos</h2>
      <h3>Menus (Home, Decks, Profile, Options)</h3>${imagePicker('fundos.lobby', true)}
      <h3>Duelo</h3><p class="hint">Fica por cima do cenário 3D, atrás das cartas.</p>${imagePicker('fundos.duelo', true)}
      <label class="tl-field"><span>Opacidade do fundo do duelo: <b>${Math.round(doc.fundos.duelo_opacidade * 100)}%</b></span>
        <input type="range" min="0" max="1" step="0.05" data-path="fundos.duelo_opacidade" data-kind="number" value="${doc.fundos.duelo_opacidade}"></label></section>
    <section class="panel tl"><h2>Cores</h2>
      ${Object.entries(COLORS).map(([tela, vars]) => `<h3>${tela === 'lobby' ? 'Menus' : 'Duelo'}</h3><div class="tl-colors">
        ${Object.entries(vars).map(([k, d]) => { const v = doc.cores[tela][k]; return `<label class="tl-color"><input type="color" data-color="${tela}" data-var="${k}" value="${esc(v || d)}"><span>${k.replace(/^--(kv-)?/, '')}</span>${v ? `<button type="button" data-tl="color-reset" data-color="${tela}" data-var="${k}">padrão</button>` : ''}</label>`; }).join('')}</div>`).join('')}</section>
    <section class="panel tl"><h2>Textos</h2><p class="hint">Troca qualquer texto visível do jogo (menus e duelo). Escreva o texto original exatamente como aparece na tela.</p>
      ${pairs.map(([a, b], i) => `<div class="tl-text"><input data-text-from="${i}" value="${esc(a)}" placeholder="Texto original" maxlength="300"><span aria-hidden="true">→</span>
        <input data-text-to="${i}" value="${esc(b)}" placeholder="Texto novo" maxlength="300"><button type="button" data-tl="text-del" data-i="${i}">Remover</button></div>`).join('')}
      <button data-tl="text-add">+ Texto</button></section>
    <section class="panel tl"><h2>Animações do duelo</h2>
      ${Object.entries(ANIMS).map(([k, l]) => { const a = doc.animacoes[k]; return `<div class="tl-anim"><label><input type="checkbox" data-path="animacoes.${k}.ligada" data-kind="bool" ${a.ligada ? 'checked' : ''}> ${l}</label>
        ${soundChooser(`audio.efeitos.${k}`)}
        <label class="tl-speed">Velocidade <b>${a.velocidade}×</b><input type="range" min="0.25" max="3" step="0.25" data-path="animacoes.${k}.velocidade" data-kind="number" value="${a.velocidade}" ${a.ligada ? '' : 'disabled'}></label></div>`; }).join('')}</section>
    <section class="panel tl"><h2>Músicas</h2>
      <h3>Menus</h3>${audioPicker('audio.menu')}<h3>Abertura da batalha</h3>${audioPicker('audio.inicio_batalha')}
      <h3>Playlist da batalha</h3><p class="hint">Tocam em ordem aleatória depois da abertura.</p><div class="tl-playlist">
      ${audios.filter(a => a.grupo === 'musica').map(a => `<label><input type="checkbox" data-playlist="${esc(a.arquivo)}" ${doc.audio.playlist.includes(a.arquivo) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('')}</div></section>
    <section class="panel tl"><h2>Sons dos menus e do fim da partida</h2>
      ${Object.entries(SOUNDS).filter(([k]) => !ANIMS[k]).map(([k, l]) => `<div class="tl-sound"><span>${l}</span>${soundChooser(`audio.efeitos.${k}`)}</div>`).join('')}</section>
    ${vozes()}
    <dialog id="tl-sounds" class="tl-dialog"></dialog>`;
}

// Falas do jogo (MUSIC/fx/ps3-voz-<código>-<idioma>): o mesmo número é a mesma fala nos 3 idiomas; a marcada vale para os 3.
const VOZES = {SEY: 'SEIYA', SRU: 'SHIRYU', HYG: 'HYOGA', SYN: 'SHUN', IKI: 'IKKI', ATG: 'ATHENA'};
const vozDe = c => (doc.audio.vozes || []).find(v => v.codigo === c) || {golpe: [], ultimate: []};
function vozes() {
  const linhas = Object.entries(VOZES).map(([c, nome]) => {
    const jp = audios.filter(a => a.origem === `ps3-voz-${c}-jp`), v = vozDe(c);
    if (!jp.length) return '';
    return `<details class="tl-voz"><summary>${nome} · ${jp.length} falas · golpe ${v.golpe.length} · Ultimate ${v.ultimate.length}</summary>${jp.map(a => { const id = a.nome.match(/\d{3,4}/)?.[0], f = l => a.arquivo.replace(`-${c}-jp/`, `-${c}-${l}/`);
      return `<div class="tl-sound"><span>${id}</span><button type="button" data-tl="ouvir" data-src="${esc(a.arquivo)}">▶ JP</button><button type="button" data-tl="ouvir" data-src="${esc(f('pt'))}">▶ PT</button><button type="button" data-tl="ouvir" data-src="${esc(f('es'))}">▶ ES</button>
        ${['golpe', 'ultimate'].map(k => `<label><input type="checkbox" data-voz="${c}" data-voz-kind="${k}" data-voz-id="${id}" ${v[k].includes(id) ? 'checked' : ''}> ${k === 'golpe' ? 'Golpe' : 'Ultimate'}</label>`).join('')}</div>`; }).join('')}</details>`;
  }).join('');
  return linhas ? `<section class="panel tl"><h2>Vozes dos personagens</h2><p class="hint">Marque o que toca em cada momento. Áudio extraído do jogo: fica só atrás do login.</p>${linhas}</section>` : '';
}

// Biblioteca de FX (MUSIC/fx/<fonte>, a mesma do Star Hill antigo): botão com o som atual e lista com busca e Ouvir.
const fxName = path => audios.find(a => a.arquivo === path)?.nome || path?.split('/').pop() || '';
const soundChooser = path => { const v = get(doc, path); return `<div class="tl-chooser"><button type="button" class="tl-chooser__pick" data-tl="pick-sound" data-path="${path}">${v ? `♪ ${esc(fxName(v))}` : 'Sem som'}</button>
  ${v ? `<button type="button" data-tl="ouvir" data-src="${esc(v)}" aria-label="Ouvir">▶</button><button type="button" data-tl="clear-sound" data-path="${path}" aria-label="Tirar som">✕</button>` : ''}</div>`; };
let picking = null;
function soundList() {
  const q = (document.querySelector('#tl-sound-q')?.value || '').toLowerCase(), src = document.querySelector('#tl-sound-src')?.value || '';
  const list = audios.filter(a => (!src || (src === 'musica' ? a.grupo === 'musica' : a.origem === src)) && (!q || `${a.nome} ${a.origem}`.toLowerCase().includes(q)));
  return list.length ? list.map(a => `<li><button type="button" data-tl="ouvir" data-src="${esc(a.arquivo)}" aria-label="Ouvir ${esc(a.nome)}">▶</button><span>${esc(a.nome)}<small>${esc(a.grupo === 'musica' ? 'música' : a.origem)} · ${(a.bytes / 1024).toFixed(0)} KB</small></span>
    <button type="button" class="primary" data-tl="use-sound" data-src="${esc(a.arquivo)}">Usar</button></li>`).join('') : '<li class="hint">Nenhum som com esse filtro.</li>';
}
function openSounds(path) {
  picking = path;
  const dlg = root.querySelector('#tl-sounds'), sources = [...new Set(audios.filter(a => a.grupo === 'fx').map(a => a.origem))];
  dlg.innerHTML = `<form method="dialog" class="tl-dialog__head"><strong>Escolher som</strong><button aria-label="Fechar">✕</button></form>
    <div class="tl-dialog__filters"><input id="tl-sound-q" type="search" placeholder="Buscar (hit, cosmo, punch…)" autocomplete="off">
    <select id="tl-sound-src"><option value="">Todas as fontes</option>${sources.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}<option value="musica">Músicas</option></select>
    <label class="tl-upload">Enviar áudio<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav,.zip" data-upload="${path}" hidden></label></div>
    <ul id="tl-sound-list" class="tl-sound-list">${soundList()}</ul>`;
  dlg.showModal(); dlg.querySelector('#tl-sound-q').focus();
}

function status() {
  const s = root?.querySelector('#tl-status');
  if (s) s.textContent = dirty ? 'Alterações não salvas' : 'Salvo';
}
function draw() {
  const y = scrollY;
  root.innerHTML = page();
  status();
  scrollTo(0, y);
}

export function mountTelas(el, {api, notice, publishSite}) {
  root = el; hooks = {api, notice, publishSite};
  draw();
}

async function upload(file, path) {
  const r = await fetch('/api/star-hill/upload', {method: 'POST', headers: {'X-File-Name': encodeURIComponent(file.name), 'X-Game-Source': 'telas'}, body: file});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || 'Falha no envio.');
  library(await hooks.api('assets'));
  return data.arquivo || data.arquivos?.[0];
}

// Eventos só agem quando o editor está montado na página.
document.addEventListener('input', e => {
  if (!root?.contains(e.target)) return;
  const t = e.target;
  if (t.dataset.path && t.type !== 'file') {
    const v = t.dataset.kind === 'number' ? Number(t.value) : t.dataset.kind === 'bool' ? t.checked : t.value;
    set(t.dataset.path, t.dataset.kind === 'image' && v === '' ? null : t.dataset.kind === 'audio' && v === '' ? null : v);
    if (['image', 'number', 'bool', 'audio'].includes(t.dataset.kind)) draw();
  } else if (t.dataset.color) {
    doc.cores[t.dataset.color][t.dataset.var] = t.value; dirty = true; status();
  } else if (t.dataset.textFrom || t.dataset.textTo) {
    pairs[Number(t.dataset.textFrom ?? t.dataset.textTo)][t.dataset.textFrom !== undefined ? 0 : 1] = t.value;
    dirty = true; status();
  } else if (t.dataset.voz) {
    const c = t.dataset.voz, k = t.dataset.vozKind, id = t.dataset.vozId, list = doc.audio.vozes ||= [];
    let v = list.find(x => x.codigo === c);
    if (!v) list.push(v = {nome: VOZES[c], codigo: c, golpe: [], ultimate: []});
    v[k] = v[k].filter(x => x !== id);
    if (t.checked) v[k].push(id);
    dirty = true; status();
  } else if (t.dataset.playlist) {
    const list = doc.audio.playlist.filter(p => p !== t.dataset.playlist);
    if (t.checked) list.push(t.dataset.playlist);
    doc.audio.playlist = list; dirty = true; status();
  }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (!root?.contains(t) || !t.dataset.upload || !t.files[0]) return;
  try {
    hooks.notice('Enviando…');
    const path = await upload(t.files[0], t.dataset.upload);
    set(t.dataset.upload, path); draw(); hooks.notice('Arquivo enviado. Salve para usar no jogo.');
  } catch (err) { hooks.notice(err.message); }
});
let player = null;
document.addEventListener('input', e => { if (e.target.id === 'tl-sound-q' || e.target.id === 'tl-sound-src') root.querySelector('#tl-sound-list').innerHTML = soundList(); });
document.addEventListener('change', e => { if (e.target.id === 'tl-sound-src') root.querySelector('#tl-sound-list').innerHTML = soundList(); });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-tl]');
  if (!b || !root?.contains(b)) return;
  const act = b.dataset.tl, list = b.dataset.list && get(doc, b.dataset.list), i = Number(b.dataset.i);
  if (act === 'up' || act === 'down') { const j = act === 'up' ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; dirty = true; }
  if (act === 'del') { if (b.dataset.list === 'home.slides' && list.length === 1) return hooks.notice('O carrossel precisa de pelo menos 1 slide.'); list.splice(i, 1); dirty = true; }
  if (act === 'add-slide') { doc.home.slides.push({imagem: arts[0]?.value || 'card:god-athena', carimbo: '', linha1: '', linha2: 'New slide', texto: ''}); dirty = true; }
  if (act === 'add-bloco') { doc.home.blocos.push({imagem: arts[0]?.value || 'card:god-athena', rotulo: '', titulo: 'New', destino: 'decks'}); dirty = true; }
  if (act === 'color-reset') { delete doc.cores[b.dataset.color][b.dataset.var]; dirty = true; }
  if (act === 'text-add') { pairs.push(['', '']); dirty = true; }
  if (act === 'text-del') { pairs.splice(i, 1); dirty = true; }
  if (act === 'ouvir') { player?.pause(); player = new Audio(url(b.dataset.src)); player.play().catch(() => {}); return; }
  if (act === 'pick-sound') return openSounds(b.dataset.path);
  if (act === 'use-sound') { player?.pause(); set(picking, b.dataset.src); root.querySelector('#tl-sounds').close(); }
  if (act === 'clear-sound') set(b.dataset.path, null);
  if (act === 'save') {
    // Linhas de texto sem original são descartadas ao salvar.
    doc.textos = Object.fromEntries(pairs.filter(([a]) => a.trim()));
    try { const r = await hooks.api('telas', {conteudo: doc, revisao}); revisao = r.revisao; dirty = false; hooks.notice('Telas salvas. Recarregue o jogo para ver; use Publicar no site para levar ao jogo online.'); }
    catch (err) { hooks.notice(err.message); }
  }
  draw();
});
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });
