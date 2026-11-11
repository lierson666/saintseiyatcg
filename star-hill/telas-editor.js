// STAR HILL · HUD Forge e Sound Forge (autor, 11/11/2026; antes "Telas e som", 30/10/2026): editam data/olympus-telas.json, que o jogo lê em playtest/telas.js.
// HUD Forge: home (banner reserva e botão Play), fundos, cores, textos, duelo (animação e som por evento). Sound Forge: músicas, sons dos menus, facções e vozes.
import {openSoundBrowser, soundUrl} from '/shared/sound-browser.js?v=12';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const ANIMS = {compra: 'Compra de carta', conjurar: 'Conjurar carta e Base', cosmo: 'Cosmo pago e Latent', gatilho: 'Gatilhos e habilidades',
  ataque: 'Ataque (Strike)', dano: 'Dano e Soul', morte: 'Carta derrotada', turno: 'Início de turno e rodada', ultimate: 'Ultimate'};
// Tabela do duelo: `anim` é o grupo com ligar e velocidade; os sons de equipar só tocam, a animação é a de Conjurar.
const DUELO = [
  {titulo: 'Cartas', linhas: [
    {som: 'compra', anim: 'compra', quando: 'Comprou carta do deck'}, {som: 'conjurar', anim: 'conjurar', quando: 'Carta ou Base entrou em jogo'},
    {som: 'equipar_armadura', nome: 'Equipar armadura', quando: 'Armadura presa no Devotee'}, {som: 'equipar_arma', nome: 'Equipar arma', quando: 'Arma ou item preso no Devotee'},
    {som: 'cosmo', anim: 'cosmo', quando: 'Pagou Cosmo ou ganhou Latent'}]},
  {titulo: 'Combate', linhas: [
    {som: 'gatilho', anim: 'gatilho', quando: 'Habilidade ou gatilho resolveu'}, {som: 'declarar_ataque', nome: 'Declarar ataque', quando: 'Devotee declarou o Strike', nota: ''}, {som: 'ataque', anim: 'ataque', quando: 'O Strike resolveu'},
    {som: 'carga', nome: 'Carga do golpe', quando: 'Vazio: som sintetizado do jogo', nota: ''}, {som: 'impacto', nome: 'Impacto em Devotee', quando: 'Vazio: som sintetizado do jogo', nota: ''}, {som: 'impacto_deus', nome: 'Impacto no Deus', quando: 'Vazio: som sintetizado do jogo', nota: ''}, {som: 'dano_deus', nome: 'Dano no Soul', quando: 'Vazio: usa o som de Dano', nota: ''},
    {som: 'poder_divino', nome: 'Poder Divino', quando: 'Vazio: som sintetizado do jogo', nota: ''}, {som: 'poder_dominio', nome: 'Poder do Domain', quando: 'Vazio: som sintetizado do jogo', nota: ''}, {som: 'awaken', nome: 'Awaken', quando: 'God despertou', nota: ''}, {som: 'morte_deus', nome: 'Explosão do Deus', quando: 'Vazio: estrondo sintetizado', nota: ''},
    {som: 'dano', anim: 'dano', quando: 'Dano em Devotee'}, {som: 'morte', anim: 'morte', quando: 'Devotee foi derrotado'}, {som: 'ultimate', anim: 'ultimate', quando: 'A Ultimate resolveu'}]},
  {titulo: 'Partida', linhas: [{som: 'turno', anim: 'turno', quando: 'Novo turno ou nova rodada'}, {som: 'passar_turno', nome: 'Passar o turno', quando: 'Clicou em End Turn ou passou a prioridade', nota: ''}, {som: 'receber_turno', nome: 'Receber o turno', quando: 'Começou o seu turno', nota: ''}]},
  {titulo: 'Mouse', linhas: [{som: 'hover', nome: 'Passar o mouse', quando: 'Botão ou carta na mesa', nota: ''}, {som: 'hover_mao', nome: 'Carta na mão', quando: 'Mouse sobre uma carta da mão', nota: ''}, {som: 'hover_base', nome: 'Base de Cosmo', quando: 'Mouse sobre uma Base ou o Cosmo', nota: ''}]},
];
// Padrão por facção (card-voices.json, id faccao-<nome>): vale para toda carta dela que não tiver som próprio no Card Forge.
const FACCOES = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
const MOMENTOS = [['cast', 'Ao conjurar', 'A carta foi jogada'], ['entrada', 'Entrada no campo', 'Devotee ou Equipment entrou no campo'], ['declarar', 'Ao declarar ataque', 'Devotee declarou o Strike'], ['golpe', 'Quando o ataque resolve', 'O Strike resolveu'],
  ['strike', 'Ao receber Strike', 'Foi atingido por um Strike'], ['morte', 'Ao morrer', 'Foi derrotado'], ['retorno', 'Volta do Tartarus', 'Voltou ao campo ou à mão'],
  ['habilidade', 'Habilidade', 'Gatilho ou habilidade resolveu'], ['ultimate', 'Ultimate', 'A Ultimate resolveu'],
  ['carga', 'Barulho: carga do golpe', 'Cosmo sobe antes do impacto'], ['impacto', 'Barulho: impacto em Devotee', 'Strike acertou um Devotee'], ['impacto_deus', 'Barulho: impacto no Deus', 'Strike acertou o Deus'],
  ['poder_divino', 'Barulho: Poder Divino', 'God usou o Poder Divino'], ['poder_dominio', 'Barulho: poder do Domain', 'Domain usou o poder'], ['awaken', 'Barulho: Awaken', 'God despertou'], ['morte_deus', 'Barulho: explosão ao morrer', 'O Deus caiu']];
let cardVoices = {}, faccao = 'Athena';
// Duas áreas do menu (autor, 11/11/2026): HUD Forge (telas) e Sound Forge (músicas e sons). O mesmo JSON; cada área só mexe na sua parte.
const SECOES = {
  hud: [['home', 'Home'], ['fundos', 'Fundos'], ['cores', 'Cores'], ['textos', 'Textos'], ['duelo', 'Duelo'], ['previa', 'Prévia']],
  som: [['musicas', 'Músicas'], ['sons', 'Sons dos menus'], ['faccoes', 'Sons por facção'], ['vozes', 'Vozes']],
};
let area = 'hud', previa = null;
const SOUNDS = {ultimate: 'Ultimate', clique: 'Clique nos menus', play: 'Botão Play', turno: 'Início de turno', compra: 'Compra de carta', conjurar: 'Conjurar carta', equipar_armadura: 'Equipar armadura', equipar_arma: 'Equipar arma',
  cosmo: 'Cosmo pago', hover: 'Passar o mouse', hover_mao: 'Carta na mão', hover_base: 'Base de Cosmo', passar_turno: 'Passar o turno', receber_turno: 'Receber o turno', declarar_ataque: 'Declarar ataque', carga: 'Carga do golpe', impacto: 'Impacto em Devotee', impacto_deus: 'Impacto no Deus', dano_deus: 'Dano no Soul', poder_divino: 'Poder Divino', poder_dominio: 'Poder do Domain', awaken: 'Awaken', morte_deus: 'Explosão do Deus', gatilho: 'Gatilho', ataque: 'Ataque', dano: 'Dano', morte: 'Carta derrotada', vitoria: 'Vitória', derrota: 'Derrota'};
// Cores com o valor padrão do CSS (shared/kv.css e playtest/divine/divine.css).
const COLORS = {
  lobby: {'--kv-bg': '#05060c', '--kv-ink': '#f5f1e6', '--kv-muted': '#a8a397', '--kv-gold': '#e6c36a', '--kv-gold-2': '#ffe7a3', '--kv-ember': '#ff8a2b', '--kv-error': '#ff9a87'},
  duelo: {'--ink': '#f4efe2', '--muted': '#b8b1c9', '--gold': '#e8c46a', '--gold-hi': '#ffe4a0', '--base': '#ffd36e', '--latent': '#b58cff', '--red': '#ff7a6a', '--shield': '#8fd8ff', '--armor': '#d8e4ff'},
};

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
  cardVoices = await fetch('../data/card-voices.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
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
  return `<div class="tl-bar panel"><span id="tl-status" class="tag"></span>
      <div class="actions"><button class="primary" data-tl="save">Salvar</button><a href="../playtest/" target="_blank" rel="noopener">Abrir jogo ↗</a>
      <button data-action="publish-site" title="Envia cartas, artes, telas e sons ao saintseiyatcg.com.">Publicar no site</button></div>
      <nav class="tl-nav" aria-label="Seções">${SECOES[area].filter(([id]) => id !== 'vozes' || audios.some(a => a.origem?.startsWith('ps3-voz-'))).map(([id, l]) => `<button type="button" data-tl="jump" data-to="tl-${id}">${l}</button>`).join('')}</nav></div>
    ${area === 'som' ? somPage() : hudPage()}`;
}

// Como a home do lobby é montada hoje (playtest/lobby.js, 11/11/2026). Só o que está aqui sai do JSON; o resto é fixo no código.
function hudPage() {
  const h = doc.home;
  return `<section class="panel tl" id="tl-home"><h2>Home · o que o jogo mostra hoje</h2>
      <ul class="tl-uso">
        <li><b>Banner do topo</b> — as 5 matérias mais novas do blog do Cosmo Hub, no idioma do jogador. <span class="tag">automático</span></li>
        <li><b>Banner reserva</b> — os slides abaixo. Só aparecem quando o Cosmo Hub não tem matéria ou não responde. <span class="tag">editável</span></li>
        <li><b>Menu</b> — 4 botões fixos: Story mode, Ranked match, Friendly match e Tutorial. <span class="tag">fixo no código</span></li>
        <li><b>Botão Play</b> — abre a aba JOGAR. Só o texto dele vem daqui. <span class="tag">editável</span></li>
      </ul>
      <h3>Banner reserva · slides</h3><p class="hint">Cada slide: imagem de fundo e textos. A ordem aqui é a ordem no jogo.</p>
      ${h.slides.map((s, i) => `<div class="tl-card">${imagePicker(`home.slides.${i}.imagem`)}
        <div class="tl-grid">${field(`home.slides.${i}.carimbo`, 'Selo')}${field(`home.slides.${i}.linha1`, 'Linha 1')}${field(`home.slides.${i}.linha2`, 'Linha 2 (grande)')}${field(`home.slides.${i}.texto`, 'Texto')}</div>
        ${moveBtns('home.slides', i, h.slides.length)}</div>`).join('')}
      <button data-tl="add-slide" ${h.slides.length >= 12 ? 'disabled' : ''}>+ Slide</button>
      <div class="tl-grid">${field('home.botao_play', 'Texto do botão Play', 30)}</div>
</section>
    <section class="panel tl" id="tl-fundos"><h2>Fundos</h2>
      <h3>Menus (Home, Decks, Profile, Options)</h3>${imagePicker('fundos.lobby', true)}
      <h3>Duelo</h3><p class="hint">Fica por cima do cenário 3D, atrás das cartas.</p>${imagePicker('fundos.duelo', true)}
      <label class="tl-field"><span>Opacidade do fundo do duelo: <b>${Math.round(doc.fundos.duelo_opacidade * 100)}%</b></span>
        <input type="range" min="0" max="1" step="0.05" data-path="fundos.duelo_opacidade" data-kind="number" value="${doc.fundos.duelo_opacidade}"></label></section>
    <section class="panel tl" id="tl-cores"><h2>Cores</h2>
      ${Object.entries(COLORS).map(([tela, vars]) => `<h3>${tela === 'lobby' ? 'Menus' : 'Duelo'}</h3><div class="tl-colors">
        ${Object.entries(vars).map(([k, d]) => { const v = doc.cores[tela][k]; return `<label class="tl-color"><input type="color" data-color="${tela}" data-var="${k}" value="${esc(v || d)}"><span>${k.replace(/^--(kv-)?/, '')}</span>${v ? `<button type="button" data-tl="color-reset" data-color="${tela}" data-var="${k}">padrão</button>` : ''}</label>`; }).join('')}</div>`).join('')}</section>
    <section class="panel tl" id="tl-textos"><h2>Textos</h2><p class="hint">Troca qualquer texto visível do jogo (menus e duelo). Escreva o texto original exatamente como aparece na tela.</p>
      ${pairs.map(([a, b], i) => `<div class="tl-text"><input data-text-from="${i}" value="${esc(a)}" placeholder="Texto original" maxlength="300"><span aria-hidden="true">→</span>
        <input data-text-to="${i}" value="${esc(b)}" placeholder="Texto novo" maxlength="300"><button type="button" data-tl="text-del" data-i="${i}">Remover</button></div>`).join('')}
      <button data-tl="text-add">+ Texto</button></section>
    ${duelo()}`;
}

function somPage() {
  return `<section class="panel tl" id="tl-musicas"><h2>Músicas</h2>
      <h3>Menus</h3>${audioPicker('audio.menu')}<h3>Abertura da batalha</h3>${audioPicker('audio.inicio_batalha')}
      <h3>Playlist da batalha</h3><p class="hint">Tocam em ordem aleatória depois da abertura.</p><div class="tl-playlist">
      ${audios.filter(a => a.grupo === 'musica').map(a => `<label><input type="checkbox" data-playlist="${esc(a.arquivo)}" ${doc.audio.playlist.includes(a.arquivo) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('')}</div></section>
    <section class="panel tl" id="tl-sons"><h2>Sons dos menus e do fim da partida</h2>
      ${Object.entries(SOUNDS).filter(([k]) => !DUELO.some(g => g.linhas.some(l => l.som === k))).map(([k, l]) => `<div class="tl-sound"><span>${l}</span>${soundChooser(`audio.efeitos.${k}`)}</div>`).join('')}
      <p class="hint">Os sons dos eventos do duelo ficam no <a href="#hud">HUD Forge → Duelo</a>, ao lado da animação de cada evento.</p></section>
    ${faccoes()}
    ${vozes()}`;
}

function duelo() {
  const todas = DUELO.flatMap(g => g.linhas), comSom = todas.filter(l => doc.audio.efeitos[l.som]).length;
  const linha = l => {
    const a = l.anim && doc.animacoes[l.anim], nome = l.nome || ANIMS[l.anim];
    return `<div class="tl-anim${a && !a.ligada ? ' is-off' : ''}"><div class="tl-anim__what">${a ? `<input type="checkbox" class="tl-switch" role="switch" aria-label="Animação: ${esc(nome)}" title="Ligar ou desligar a animação" data-path="animacoes.${l.anim}.ligada" data-kind="bool" ${a.ligada ? 'checked' : ''}>` : '<span class="tl-switch-gap"></span>'}
        <span>${esc(nome)}<small>${esc(l.quando)}</small></span></div>
      ${soundChooser(`audio.efeitos.${l.som}`)}
      ${a ? `<label class="tl-speed"><input type="range" aria-label="Velocidade: ${esc(nome)}" min="0.25" max="3" step="0.25" data-path="animacoes.${l.anim}.velocidade" data-kind="number" value="${a.velocidade}" ${a.ligada ? '' : 'disabled'}><b>${a.velocidade}×</b></label>` : '<span class="tl-speed tl-speed--none">' + (l.nota ?? 'Usa Conjurar') + '</span>'}</div>`;
  };
  return `<section class="panel tl" id="tl-duelo"><div class="tl-head"><h2>Animações e sons do duelo</h2><span class="tag">${comSom} de ${todas.length} com som</span></div>
    <p class="hint">Para escolher o efeito e o som juntos e ver na mesa: Animações → Momentos do jogo.</p>
    <div class="tl-anim tl-anim--head" aria-hidden="true"><span>Evento</span><span>Som</span><span>Velocidade</span></div>
    ${DUELO.map(g => `<h3>${g.titulo}</h3>${g.linhas.map(linha).join('')}`).join('')}</section>`;
}
function faccoes() {
  const v = cardVoices[`faccao-${faccao.toLowerCase()}`] || {};
  return `<section class="panel tl" id="tl-faccoes"><div class="tl-head"><h2>Sons por facção</h2><span class="tag">A carta com som próprio passa por cima</span></div>
    <div class="tl-faccao-tabs" role="group" aria-label="Facção">${FACCOES.map(f => `<button type="button" data-tl="faccao" data-f="${f}" aria-pressed="${f === faccao}">${f}</button>`).join('')}</div>
    ${MOMENTOS.map(([k, nome, quando]) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${nome}<small>${quando}</small></span></div>
      <div class="tl-chooser${v[k] ? '' : ' is-empty'}"><button type="button" class="tl-chooser__pick" data-tl="faccao-pick" data-k="${k}">${v[k] ? `♪ ${esc(v[k])}` : '+ Escolher som'}</button>
      <button type="button" data-tl="faccao-ouvir" data-id="${esc(v[k] || '')}" aria-label="Ouvir" title="Ouvir" ${v[k] ? '' : 'disabled'}>▶</button><button type="button" data-tl="faccao-tirar" data-k="${k}" aria-label="Tirar som" title="Tirar som" ${v[k] ? '' : 'disabled'}>✕</button></div></div>`).join('')}</section>`;
}
async function saveFaction(key, value) {
  const id = `faccao-${faccao.toLowerCase()}`, entry = {linhas: [], ...cardVoices[id], [key]: value};
  try { cardVoices = (await hooks.api('card-voice', {id, ...entry})).vozes; draw(); hooks.notice?.(`Som de ${faccao} salvo.`, true); } catch (error) { hooks.notice?.(error.message); }
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
  return linhas ? `<section class="panel tl" id="tl-vozes"><h2>Vozes dos personagens</h2><p class="hint">Marque o que toca em cada momento. Áudio extraído do jogo: fica só atrás do login.</p>${linhas}</section>` : '';
}

// Biblioteca de FX (MUSIC/fx/<fonte>, a mesma do Star Hill antigo): botão com o som atual e lista com busca e Ouvir.
const fxName = path => /ps3-(?:voz|se)-(.+)-(?:jp|pt|es)\/(\d+)\.mp3$/.exec(path || '')?.slice(1).join('/') || (audios.find(a => a.arquivo === path)?.nome || path?.split('/').pop() || '').replace(/^[A-Z_]+-\d+--/, '').replace(/--[0-9a-f]{12}.*$/, '');
const soundChooser = path => { const v = get(doc, path); return `<div class="tl-chooser${v ? '' : ' is-empty'}"><button type="button" class="tl-chooser__pick" data-tl="pick-sound" data-path="${path}">${v ? `♪ ${esc(fxName(v))}` : '+ Escolher som'}</button>
  <button type="button" data-tl="ouvir" data-src="${esc(v || '')}" aria-label="Ouvir" title="Ouvir" ${v ? '' : 'disabled'}>▶</button><button type="button" data-tl="clear-sound" data-path="${path}" aria-label="Tirar som" title="Tirar som" ${v ? '' : 'disabled'}>✕</button></div>`; };
// Sons do projeto (enviados e músicas); o que veio do jogo mora na biblioteca, em seções (shared/sound-browser.js).
const projectSounds = () => audios.filter(a => !a.origem?.startsWith('ps3-voz-')).map(a => ({id: a.arquivo, url: `/${a.arquivo.split('/').map(encodeURIComponent).join('/')}`, nome: fxName(a.arquivo) || a.nome,
  secao: a.grupo === 'musica' ? 'Músicas' : 'Efeitos', cod: a.grupo === 'musica' ? '' : a.origem, grupo: a.origem, s: 0, langs: []}));
const libraryId = path => { const m = /ps3-(?:voz|se)-(.+)-(?:jp|pt|es)\/(\d+)\.mp3$/.exec(path || ''); return m ? `${m[1]}/${m[2]}` : path || ''; };
function openSounds(path, after = draw) {
  openSoundBrowser({title: 'Escolher som', alvo: SOUNDS[path.split('.').pop()] ? `Todas as cartas · ${SOUNDS[path.split('.').pop()]}` : '', value: libraryId(get(doc, path)), extra: projectSounds(), secao: 'fx-golpe',
    onUpload: async file => { try { const arquivo = await upload(file, path); if (arquivo) { set(path, arquivo); after(); } } catch (error) { hooks.notice?.(error.message); } },
    onPick: async (sound, lang) => {
      if (!sound) { set(path, null); return after(); }
      if (sound.jogo === 'meus') { set(path, sound.id); return after(); }
      try {
        const {arquivo} = await hooks.api('som-biblioteca', {id: sound.id, lang, tipo: sound.secao.startsWith('fx') ? 'se' : 'voz'});
        library(await hooks.api('assets'));
        set(path, arquivo);
        after();
      } catch (error) { hooks.notice?.(error.message); }
    }});
}
async function saveDoc() {
  // Linhas de texto sem original são descartadas ao salvar.
  doc.textos = Object.fromEntries(pairs.filter(([a]) => a.trim()));
  const r = await hooks.api('telas', {conteudo: doc, revisao});
  revisao = r.revisao; dirty = false;
}
// Momentos do jogo (animacoes-momentos.js) edita os mesmos sons, sem passar pelo botão Salvar desta tela.
export const telasSons = {
  usar(api, notice) { hooks = {...hooks, api, notice}; },
  valor: k => doc.audio.efeitos[k] || null,
  nome: fxName,
  anim: g => doc.animacoes[g],
  ouvir(k) { player?.pause(); player = new Audio(url(doc.audio.efeitos[k])); player.play().catch(() => {}); },
  escolher(k, ok, erro) { const path = `audio.efeitos.${k}`, antes = get(doc, path); openSounds(path, () => saveDoc().then(ok, e => { set(path, antes); erro(e); })); },
  async mudar(path, value) { const antes = get(doc, path); set(path, value); try { await saveDoc(); } catch (e) { set(path, antes); throw e; } },
};

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

// A prévia fica fora do `root`: o editor redesenha a cada clique e isso recarregaria o jogo.
export function mountTelas(el, {api, notice, publishSite, area: qual = 'hud'}) {
  area = qual;
  el.innerHTML = `<div></div>${area === 'hud' ? `<section class="panel tl" id="tl-previa"><div class="tl-head"><h2>Prévia da home</h2><button type="button" id="tl-previa-reload">Atualizar prévia</button></div>
    <p class="hint">O jogo real com o que está salvo. Neste servidor local não há blog, então aparece o banner reserva. Salvar atualiza a prévia.</p>
    <iframe class="tl-previa" title="Prévia da home do jogo" src="../playtest/?previa=${Date.now()}"></iframe></section>` : ''}`;
  root = el.firstElementChild; hooks = {api, notice, publishSite};
  previa = el.querySelector('.tl-previa');
  el.querySelector('#tl-previa-reload')?.addEventListener('click', reloadPreview);
  draw();
}
function reloadPreview() { if (previa?.isConnected) previa.src = `../playtest/?previa=${Date.now()}`; }

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
    // Controle deslizante: redesenhar no meio do arraste solta o controle.
    if (t.dataset.kind === 'number') { const b = t.closest('label')?.querySelector('b'); if (b) b.textContent = t.max === '1' ? `${Math.round(v * 100)}%` : `${v}×`; }
    if (['image', 'bool', 'audio'].includes(t.dataset.kind)) draw();
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
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-tl]');
  if (!b || !root?.contains(b)) return;
  const act = b.dataset.tl, list = b.dataset.list && get(doc, b.dataset.list), i = Number(b.dataset.i);
  if (act === 'up' || act === 'down') { const j = act === 'up' ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; dirty = true; }
  if (act === 'del') { if (b.dataset.list === 'home.slides' && list.length === 1) return hooks.notice('O carrossel precisa de pelo menos 1 slide.'); list.splice(i, 1); dirty = true; }
  if (act === 'add-slide') { doc.home.slides.push({imagem: arts[0]?.value || 'card:god-athena', carimbo: '', linha1: '', linha2: 'New slide', texto: ''}); dirty = true; }
  if (act === 'color-reset') { delete doc.cores[b.dataset.color][b.dataset.var]; dirty = true; }
  if (act === 'text-add') { pairs.push(['', '']); dirty = true; }
  if (act === 'text-del') { pairs.splice(i, 1); dirty = true; }
  if (act === 'ouvir') { player?.pause(); player = new Audio(url(b.dataset.src)); player.play().catch(() => {}); return; }
  if (act === 'jump') return document.getElementById(b.dataset.to)?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  if (act === 'pick-sound') return openSounds(b.dataset.path);
  if (act === 'faccao') { faccao = b.dataset.f; return draw(); }
  if (act === 'faccao-pick') return openSoundBrowser({title: `Som de ${faccao}`, alvo: `Facção ${faccao} · ${MOMENTOS.find(([k]) => k === b.dataset.k)?.[1] || b.dataset.k}`, value: cardVoices[`faccao-${faccao.toLowerCase()}`]?.[b.dataset.k] || '', secao: 'voz-batalha', onPick: s => saveFaction(b.dataset.k, s?.id || null)});
  if (act === 'faccao-tirar') return saveFaction(b.dataset.k, null);
  if (act === 'faccao-ouvir') { player?.pause(); player = new Audio(soundUrl(b.dataset.id)); player.play().catch(() => {}); return; }
  if (act === 'clear-sound') set(b.dataset.path, null);
  if (act === 'save') {
    try { await saveDoc(); reloadPreview(); hooks.notice('Salvo. Recarregue o jogo para ver; use Publicar no site para levar ao jogo online.', true); }
    catch (err) { hooks.notice(err.message); }
  }
  draw();
});
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });
