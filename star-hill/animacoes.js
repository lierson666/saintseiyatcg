// STAR HILL · Gestor de animações: efeitos, padrões do jogo, facções e cartas, em data/card-animations.json (playtest/divine/pixel-vfx.js toca).
// A carta passa por cima da facção, e a facção por cima do padrão, como nos sons. A linha de cada habilidade também se escolhe no Card Forge, aba Som.
import {ANIM_MOMENTS, ELEMENT_COLOR, allEffects, catalogNow, importVfx, editVfx, loadAnims, animsNow, saveAnim, openAnimPreview, openAnimPicker, animLabel} from '/shared/anim-picker.js?v=5';
import {categoryOf} from '/shared/anim-picker.js?v=5';
import {CATEGORIES} from '/shared/vfx/presets.js';
import {composerSection, composerMounted, livingSection, holoSection, previewStudioFx} from './animacoes-composer.js?v=4';
import {arenaSection, arenaMounted, arenaDefaults} from './animacoes-arena.js';
import {momentosSection, momentosMounted, momentosRepaint, iniciarMomentos} from './animacoes-momentos.js';
import {loadPublicacao, mountPublicacao, publicacaoSection, publicacaoNow} from './animacoes-publicacao.js?v=3';
import {bibliotecaSection, libraryRows, overview, visaoSection} from './animacoes-biblioteca.js?v=1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FACCOES = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
let root = null, tabs = null, host = null, hooks = null, cards = [], faccao = 'Athena', cardId = '', busca = '', cartaFaccao = '', momentosAbertos = false;

const entryOf = id => ({linhas: [], ...animsNow()[id]});
const tune = id => ({ligado: true, tamanho: 1, velocidade: 1, cor: null, ...animsNow().efeitos?.[id]});
async function save(id, patch) {
  try { await saveAnim(id, patch); draw(); hooks.notice('Animação salva. Use Publicar no site para levar ao jogo online.', true); } catch (e) { hooks.notice(e.message); }
}
const chooser = (id, key, value, herda) => `<div class="tl-chooser${value == null ? ' is-empty' : ''}"><button type="button" class="tl-chooser__pick" data-an="pick" data-id="${esc(id)}" data-k="${key}" data-herda="${esc(herda)}">${esc(animLabel(value, herda))}</button>
  <button type="button" data-an="test" data-fx="${value || ''}" aria-label="Testar" title="Testar" ${value ? '' : 'disabled'}>▶</button><button type="button" data-an="clear" data-id="${esc(id)}" data-k="${key}" aria-label="Tirar" title="Tirar" ${value == null ? 'disabled' : ''}>✕</button></div>`;
const moments = (id, herda) => { const v = animsNow()[id] || {}; return ANIM_MOMENTS.map(([k, nome, quando]) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(nome)}<small>${esc(quando)}</small></span></div>${chooser(id, k, v[k], herda)}</div>`).join(''); };

// Catálogo: todas as fontes juntas, com origem, licença e acesso à vista. Só entra efeito gratuito (autor, 04/11/2026).
const ACESSO = {gratis: 'Grátis', limitado: 'Grátis com limite'};
const TIPOS = ['golpe', 'impacto', 'explosao', 'fogo', 'gelo', 'raio', 'veneno', 'luz', 'trevas', 'cura', 'aura', 'escudo', 'energia', 'magia', 'projetil', 'clima', 'outro'];
const TIPO_FIXO = {slash: 'golpe', impact: 'impacto', ice: 'gelo', fire: 'fogo', lightning: 'raio', poison: 'veneno', light: 'luz', dark: 'trevas', explosion: 'explosao', energy: 'energia', shield: 'escudo', heal: 'cura', power: 'aura', muzzle: 'projetil', blood: 'impacto', pickup: 'luz', dash: 'golpe', blink: 'magia', sparkle: 'luz', rain: 'clima', snow: 'clima', fog: 'clima', embers: 'clima', fireflies: 'clima', leaves: 'clima', bubbles: 'clima'};
let filtro = {fonte: '', tipo: '', faccao: '', gatilho: '', q: '', categoria: ''};
const fonteNome = f => catalogNow().fontes?.[f]?.nome || f;
const options = (list, value, all) => `<option value="">${all}</option>${list.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
const matches = e => (!filtro.categoria || categoryOf(e) === filtro.categoria) && (!filtro.fonte || e.fonte === filtro.fonte) && (!filtro.tipo || (e.tipo || TIPO_FIXO[e.id]) === filtro.tipo) && (!filtro.faccao || e.faccoes?.includes(filtro.faccao)) && (!filtro.gatilho || e.gatilhos?.includes(filtro.gatilho)) && (!filtro.q || e.nome.toLowerCase().includes(filtro.q.toLowerCase()));
const checks = (name, list, on) => list.map(([v, t]) => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${on?.includes(v) ? 'checked' : ''}> ${esc(t)}</label>`).join('');
const factionList = () => FACCOES.map(f => [f.toLowerCase(), f]);
const triggerList = () => ANIM_MOMENTS.map(([k, n]) => [k, n]);
function effectRows() {
  const list = allEffects().filter(matches);
  const unavailable = CATEGORIES.find(c => c.id === filtro.categoria && c.disponivel === false);
  if (unavailable) return `<p class="hint">${esc(unavailable.nome)}: tipo reconhecido, ainda sem runtime. Falta arte em camadas (PSD); ver docs/vfx-forge-v3.md.</p>`;
  return `<p class="hint">${list.length} de ${allEffects().length} efeitos.</p>${list.map(e => { if (e.id.includes(':')) return `<div class="an-row"><b>${esc(e.nome)}<small>${esc(fonteNome(e.fonte))} · ${esc(e.licenca)} · ${esc(e.tamanho)} · ${esc(e.compat)}${e.aplicacao ? ` · ${esc(e.aplicacao)}` : ''}</small></b><button type="button" data-an="test" data-fx="${esc(e.id)}">▶ Testar</button></div>`; const t = tune(e.id), own = e.arquivo; return `<div class="an-row${t.ligado ? '' : ' is-off'}"><input type="checkbox" class="tl-switch" role="switch" aria-label="Ligar ${esc(e.nome)}" data-tune="${esc(e.id)}" data-field="ligado" ${t.ligado ? 'checked' : ''}><b>${esc(e.nome)}<small>${esc(fonteNome(e.fonte))} · ${esc(e.licenca)} · ${ACESSO[e.acesso] || e.acesso}</small></b>
      <button type="button" data-an="test" data-fx="${esc(e.id)}">▶ Testar</button>
      <label class="tl-speed">Tamanho <input type="range" min="0.5" max="2" step="0.1" data-tune="${esc(e.id)}" data-field="tamanho" value="${t.tamanho}"><b>${t.tamanho}×</b></label>
      <label class="tl-speed">Velocidade <input type="range" min="0.25" max="2" step="0.25" data-tune="${esc(e.id)}" data-field="velocidade" value="${t.velocidade}"><b>${t.velocidade}×</b></label>
      ${own ? `<details class="an-meta" data-vfx="${esc(e.id)}"><summary>Categorias</summary><label>Tipo <select name="tipo">${TIPOS.map(x => `<option ${x === e.tipo ? 'selected' : ''}>${x}</option>`).join('')}</select></label><fieldset><legend>Facção</legend>${checks('faccoes', factionList(), e.faccoes)}</fieldset><fieldset><legend>Gatilho</legend>${checks('gatilhos', triggerList(), e.gatilhos)}</fieldset>${e.origem ? `<small>Origem: ${esc(e.origem)}</small>` : ''}<small>Hash: ${esc(e.hash.slice(0, 16))}…</small></details>` : `<label class="tl-speed">Cor <input type="color" data-tune="${esc(e.id)}" data-field="cor" value="${esc(t.cor || ELEMENT_COLOR[e.id] || '#e0bb62')}">${t.cor ? `<button type="button" data-an="cor-reset" data-fx="${esc(e.id)}">padrão</button>` : ''}</label>`}</div>`; }).join('')}`;
}
function efeitos() {
  const fontes = Object.entries(catalogNow().fontes || {});
  return `<section class="panel tl"><div class="tl-head"><h2>Fontes</h2><span class="tag">Só animações gratuitas</span></div>
      ${fontes.map(([id, f]) => { const n = allEffects().filter(e => e.fonte === id).length; return `<div class="an-source"><b>${esc(f.nome)}</b><span class="tag">${ACESSO[f.acesso] || f.acesso}</span><span class="tag">${n} efeitos</span><small>${esc(f.estado)} Licença: ${esc(f.licenca)}.</small></div>`; }).join('')}</section>
    <section class="panel tl"><div class="tl-head"><h2>Importar efeito</h2><span class="tag">Fica no projeto, sem serviço externo</span></div>
      <form id="an-import" class="an-import">
        <label class="tl-field"><span>Arquivo: PNG, sprite sheet, GIF, WebP, APNG ou ZIP de PNGs</span><input type="file" name="arquivo" accept=".png,.apng,.gif,.webp,.zip" required></label>
        <label class="tl-field"><span>JSON do sprite sheet (opcional)</span><input type="file" name="json" accept=".json"></label>
        <label class="tl-field"><span>Nome</span><input name="nome" maxlength="60" required></label>
        <label class="tl-field"><span>Fonte</span><select name="fonte" required>${fontes.filter(([id]) => id !== 'sprite-fusion' && id !== 'particlr').map(([id, f]) => `<option value="${esc(id)}">${esc(f.nome)}</option>`).join('')}</select></label>
        <label class="tl-field"><span>Licença</span><input name="licenca" maxlength="200" required placeholder="Ex.: CC0-1.0"></label>
        <label class="tl-field"><span>Acesso</span><select name="acesso"><option value="gratis">Grátis</option><option value="limitado">Grátis com limite</option></select></label>
        <label class="tl-field"><span>De onde veio (link)</span><input name="origem" maxlength="300"></label>
        <label class="tl-field"><span>Tipo</span><select name="tipo">${TIPOS.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="tl-field"><span>Colunas (sheet sem JSON)</span><input name="colunas" type="number" min="1"></label>
        <label class="tl-field"><span>Linhas (sheet sem JSON)</span><input name="linhas" type="number" min="1"></label>
        <label class="tl-field"><span>Quadros por segundo (opcional)</span><input name="fps" type="number" min="1" max="60"></label>
        <label class="an-loop"><input type="checkbox" name="loop"> Repete em loop</label>
        <button type="submit">Importar</button><output class="hint" id="an-import-result"></output>
      </form></section>
    <section class="panel tl"><div class="tl-head"><h2>Efeitos</h2><span class="tag">${allEffects().length} efeitos</span></div><p class="hint">Vale para todo o jogo. Efeito desligado não aparece em nenhum momento.</p>
      <div class="an-filters"><input type="search" data-filtro="q" value="${esc(filtro.q)}" placeholder="Buscar efeito" aria-label="Buscar efeito">
        <select data-filtro="categoria" aria-label="Categoria">${options(CATEGORIES.map(c => [c.id, c.nome]), filtro.categoria, 'Todas as categorias')}</select>
        <select data-filtro="fonte" aria-label="Fonte">${options(fontes.map(([id, f]) => [id, f.nome]), filtro.fonte, 'Todas as fontes')}</select>
        <select data-filtro="tipo" aria-label="Tipo">${options(TIPOS.map(x => [x, x]), filtro.tipo, 'Todos os tipos')}</select>
        <select data-filtro="faccao" aria-label="Facção">${options(factionList(), filtro.faccao, 'Todas as facções')}</select>
        <select data-filtro="gatilho" aria-label="Gatilho">${options(triggerList(), filtro.gatilho, 'Todos os gatilhos')}</select></div>
      <div id="an-effects">${effectRows()}</div></section>`;
}
// Dois painéis: à esquerda escolher a carta, à direita o que ela toca. Lista filtrada por facção, para não precisar saber o nome.
function porCarta() {
  const q = busca.trim().toLowerCase(), v = animsNow(), has = c => !!v[c.id];
  const list = cards.filter(c => (cartaFaccao === 'todas' || (cartaFaccao ? c.faccao === cartaFaccao : q || has(c))) && (!q || `${c.nome_exibicao_en} ${c.nome_exibicao_pt || ''} ${c.id}`.toLowerCase().includes(q))).sort((a, b) => a.nome_exibicao_en.localeCompare(b.nome_exibicao_en)), card = cards.find(c => c.id === cardId);
  const lines = card?.habilidades_pt?.length ? card.habilidades_pt : card?.habilidades_en || [], own = card && (v[card.id]?.linhas || []);
  const faccoes = [...new Set(cards.map(c => c.faccao).filter(Boolean))].sort();
  return `<section class="panel tl"><div class="tl-head"><h2>Por carta</h2><span class="tag">A carta passa por cima da facção</span></div>
    <div class="an-carta"><aside class="an-carta__lista">
      <label class="tl-field"><span>Facção</span><select id="an-carta-faccao"><option value="">Só as que já têm animação</option><option value="todas" ${cartaFaccao === 'todas' ? 'selected' : ''}>Todas as cartas</option>${faccoes.map(f => `<option ${f === cartaFaccao ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <label class="tl-field"><span>Buscar carta</span><input id="an-busca" type="search" value="${esc(busca)}" placeholder="Nome ou código"></label>
      <p class="hint" aria-live="polite">${list.length} ${list.length === 1 ? 'carta' : 'cartas'}</p>
      <div class="an-cards">${list.map(c => `<button type="button" data-an="card" data-id="${esc(c.id)}" aria-pressed="${c.id === cardId}">${has(c) ? '<i class="an-dot" title="Tem animação própria"></i>' : ''}<span>${esc(c.nome_exibicao_en)}<small>${esc(c.id)}</small></span></button>`).join('') || '<p class="hint">Nenhuma carta com esses filtros.</p>'}</div></aside>
    <div class="an-carta__detalhe">${card ? `<h3>${esc(card.nome_exibicao_en)} · habilidades</h3>${lines.map((t, i) => `<div class="tl-anim tl-anim--faccao"><div class="tl-anim__what"><span>${esc(String(t).split(/ — |\n/)[0].slice(0, 60))}</span></div>${chooser(card.id, `linha:${i}`, own[i], 'habilidade da carta')}</div>`).join('') || '<p class="hint">Esta carta não tem habilidades.</p>'}
      ${livingSection(card)}<details class="an-momentos" ${momentosAbertos ? 'open' : ''}><summary>Momentos: entrada, golpe, dano, morte e outros</summary>${moments(card.id, 'facção')}</details>` : '<p class="bl-empty">Escolha uma carta na lista para ver as habilidades, o Living Card e os momentos dela.</p>'}</div></div></section>`;
}
const ESTADO = {editavel: 'No Forge', parcial: 'Parcial', legado: 'Legado', excecao: 'Exceção'};
const CRITERIO = {forge: 'presença no Forge', edita: 'edição', aplica: 'efeito no jogo', preview: 'teste na mesa', restaura: 'restaurar', testes: 'testes'};
let inventario = {resumo: {}, animacoes: []}, invBusca = '';
const invFiltro = {estado: '', categoria: '', tecnologia: '', origem: ''};
const invRows = () => inventario.animacoes.filter(a => Object.entries(invFiltro).every(([k, v]) => !v || a[k] === v) && (!invBusca || `${a.id} ${a.nome} ${a.gatilho} ${a.arquivos.join(' ')}`.toLowerCase().includes(invBusca.toLowerCase())));
const invFaltam = a => Object.keys(CRITERIO).filter(k => !a.criterios[k]).map(k => CRITERIO[k]).join(', ');
const invItem = a => `<li><div><b>${esc(a.nome)}</b><small>${esc(a.categoria)} · ${esc(a.tecnologia)} · ${esc(a.origem)}${a.gatilho ? ` · ${esc(a.gatilho)}` : ''}</small>${a.parametros.length ? `<small>Ajusta: ${esc(a.parametros.join(', '))}</small>` : ''}${a.limite ? `<small>${esc(a.limite)}</small>` : ''}${a.migrada || a.estado === 'excecao' ? '' : `<small>Falta: ${esc(invFaltam(a))}</small>`}<code>${esc(a.id)} · ${esc(a.arquivos[0])}${a.arquivos.length > 1 ? ` +${a.arquivos.length - 1}` : ''}</code></div><span class="tag an-inv--${a.estado}">${a.migrada ? 'Migrada' : ESTADO[a.estado]}</span>${a.aba === 'telas' ? '<a href="#hud">Abrir HUD Forge</a>' : a.aba ? `<button type="button" data-aba-ir="${a.aba}">Abrir</button>` : ''}</li>`;
const INV_MAX = 200; // a lista inteira trava o redesenho; a busca e os filtros alcançam o resto
const invList = () => { const list = invRows(); return `<p class="an-inv-count">${list.length} de ${inventario.animacoes.length}${list.length > INV_MAX ? `; mostrando ${INV_MAX}. Use a busca ou os filtros.` : ''}</p><ul class="an-inv">${list.slice(0, INV_MAX).map(invItem).join('')}</ul>`; };
const invOptions = key => [...new Set(inventario.animacoes.map(a => a[key]))].sort().map(v => [v, v]);
const todas = () => { const r = inventario.resumo; return `<section class="panel tl"><div class="tl-head"><h2>Todas as animações</h2><span class="tag">${r.migradas || 0} migradas · ${r.editavel || 0} no Forge · ${r.parcial || 0} parciais · ${r.legado || 0} legadas</span></div>
    <p class="hint">Migrada é a animação com os oito critérios. Das ${r.total || 0} registradas, todas com id estável: ${Object.entries(CRITERIO).map(([k, nome]) => `${r.criterios?.[k] ?? 0} com ${nome}`).join(' · ')}.</p>
    <div class="an-inv-filtros"><input type="search" data-inv="busca" value="${esc(invBusca)}" placeholder="Nome, id, arquivo ou evento" aria-label="Buscar animação"><select data-inv="estado" aria-label="Situação">${options(Object.entries(ESTADO), invFiltro.estado, 'Toda situação')}</select><select data-inv="categoria" aria-label="Categoria">${options(invOptions('categoria'), invFiltro.categoria, 'Toda categoria')}</select><select data-inv="tecnologia" aria-label="Tecnologia">${options(invOptions('tecnologia'), invFiltro.tecnologia, 'Toda tecnologia')}</select><select data-inv="origem" aria-label="Origem">${options(invOptions('origem'), invFiltro.origem, 'Toda origem')}</select></div><div data-inv-list>${invList()}</div></section>`; };
const BIB_VAZIA = {q: '', categoria: '', fonte: '', faccao: '', gatilho: '', estado: '', vinculo: '', ordem: 'nome'};
let bib = {...BIB_VAZIA}, bibMax = 60;
const bibRows = () => libraryRows({effects: allEffects(), anims: animsNow(), cards, filtro: bib, categoryOf, limit: bibMax, fonteNome, momentName: k => ANIM_MOMENTS.find(([m]) => m === k)?.[1] || k});
function bibRedraw() { const box = root.querySelector('#bib-rows'); if (box) box.innerHTML = bibRows(); }
const biblioteca = () => bibliotecaSection({filtro: bib, rows: bibRows(), fontes: Object.entries(catalogNow().fontes || {}).map(([id, f]) => [id, f.nome]), categorias: CATEGORIES.map(c => [c.id, c.nome]), faccoes: factionList(), momentos: triggerList()});
const ABAS = {
  visao: ['Resumo', () => visaoSection({numeros: overview({effects: allEffects(), anims: animsNow(), cards, inventario}), pub: publicacaoNow()})],
  biblioteca: ['Catálogo', biblioteca],
  criador: ['Mesa real', () => ''],
  todas: ['Inventário', todas],
  particulas: ['Partículas', () => ''],
  interface: ['Interface', () => ''],
  cena: ['Céu e moeda', () => ''],
  sprite: ['Sprite Fusion', () => ''],
  combate: ['Combate', () => ''],
  padroes: ['Padrões', () => `<section class="panel tl"><div class="tl-head"><h2>Padrões do jogo</h2><span class="tag">Vale para toda carta sem escolha própria</span></div>${moments('padrao', 'sem animação nova')}</section>`],
  faccao: ['Por facção', () => `<section class="panel tl"><div class="tl-head"><h2>Por facção</h2><span class="tag">Passa por cima do padrão</span></div>
      <div class="tl-faccao-tabs" role="group" aria-label="Facção">${FACCOES.map(f => `<button type="button" data-an="faccao" data-f="${f}" aria-pressed="${f === faccao}">${f}</button>`).join('')}</div>${moments(`faccao-${faccao.toLowerCase()}`, 'padrão')}</section>`],
  momentos: ['Momentos do jogo', () => momentosSection({chooser, cards})],
  carta: ['Por carta', porCarta],
  composer: ['Composer', composerSection],
  arena: ['Cenários', arenaSection],
  holo: ['Holográficos', holoSection],
  efeitos: ['Importar e ajustar', efeitos],
  publicacao: ['Publicação', publicacaoSection],
};
// Seis espaços. Toda aba antiga continua aqui, com o mesmo id, dentro do espaço a que pertence.
const ESPACOS = [['momentos', 'Momentos do jogo', ['momentos']], ['visao', 'Visão geral', ['visao', 'publicacao']], ['biblioteca', 'Biblioteca', ['biblioteca', 'todas', 'efeitos', 'particulas', 'interface', 'cena']], ['carta', 'Por carta', ['carta', 'faccao', 'padroes']], ['composer', 'Composer', ['composer', 'sprite', 'combate', 'holo']], ['arena', 'Arena de testes', ['arena', 'criador']]];
const espacoDe = id => ESPACOS.find(([, , abas]) => abas.includes(id));
const ultima = {};
let aba = 'momentos';
try { if (ABAS[localStorage.getItem('sh-anim-aba')]) aba = localStorage.getItem('sh-anim-aba'); } catch { /* sem armazenamento: começa em Padrões */ }
let publicando = false;
function irPara(id) {
  aba = id;
  try { localStorage.setItem('sh-anim-aba', aba); } catch { /* sem armazenamento: só não lembra a aba */ }
  draw();
  scrollTo(0, 0);
}
function draw() {
  const y = scrollY;
  const atual = espacoDe(aba);
  ultima[atual[0]] = aba;
  tabs.innerHTML = `<nav class="an-espacos" aria-label="Espaços de animação">${ESPACOS.map(([id, nome, abas]) => `<button type="button" data-aba="${ultima[id] || abas[0]}" ${id === atual[0] ? 'aria-current="page"' : ''}>${nome}</button>`).join('')}</nav>${atual[2].length > 1 ? `<div class="tl-faccao-tabs an-sub" role="group" aria-label="Seções de ${atual[1]}">${atual[2].map(k => `<button type="button" data-aba="${k}" aria-pressed="${k === aba}">${ABAS[k][0]}</button>`).join('')}</div>` : ''}`;
  if (aba === 'momentos' && momentosRepaint()) return;
  // O jogo do Criador fica fora do redesenho: só carrega na primeira visita à aba e não recomeça a cada troca.
  const palco = ['criador', 'particulas', 'interface', 'cena', 'sprite', 'combate'].includes(aba), modo = aba === 'criador' ? '' : `#${aba}`;
  host.hidden = !palco;
  if (palco && !host.firstChild) host.innerHTML = `<iframe class="an-criador" src="/star-hill/criador.html${modo}" title="Criador de animações"></iframe>`;
  else if (palco) host.firstChild.contentWindow.location.hash = modo;
  if (aba === 'arena') arenaDefaults(cards);
  root.innerHTML = ABAS[aba][1]();
  if (['publicacao', 'visao'].includes(aba) && !publicando) { publicando = true; loadPublicacao().then(() => { draw(); publicando = false; }); }
  composerMounted(cards, draw, hooks.notice);
  if (aba === 'arena') arenaMounted(cards, {setStudioFx: previewStudioFx});
  if (aba === 'momentos') momentosMounted();
  scrollTo(0, y);
}
export async function mountAnimacoes(el, {notice, api}) {
  el.innerHTML = '<div class="an-abas"></div><div class="an-criador-host" hidden></div><div></div>';
  [tabs, host, root] = el.children; hooks = {notice};
  mountPublicacao(root, {notice, redraw: () => { publicando = true; draw(); publicando = false; }});
  root.addEventListener('input', e => {
    const kind = e.target.dataset.inv;
    if (!kind) return;
    if (kind === 'busca') invBusca = e.target.value; else invFiltro[kind] = e.target.value;
    root.querySelector('[data-inv-list]').innerHTML = invList();
  });
  root.addEventListener('click', e => {
    const go = e.target.closest('[data-aba-ir]')?.dataset.abaIr;
    if (go) return irPara(go);
    const carta = e.target.closest('[data-bib-carta]')?.dataset.bibCarta;
    if (carta) { cardId = carta; momentosAbertos = true; return irPara('carta'); }
    const f = e.target.closest('[data-carta-faccao]')?.dataset.cartaFaccao;
    if (f) { cartaFaccao = f; return irPara('carta'); }
    const vinculo = e.target.closest('[data-bib-vinculo]')?.dataset.bibVinculo, bq = e.target.closest('[data-bib-q]')?.dataset.bibQ;
    if (vinculo || bq) { bib = {...BIB_VAZIA, vinculo: vinculo || '', q: bq || ''}; return irPara('biblioteca'); }
    if (e.target.closest('[data-bib-limpar]')) { bib = {...BIB_VAZIA}; bibMax = 60; return draw(); }
    if (e.target.closest('[data-bib-mais]')) { bibMax += 60; return bibRedraw(); }
  });
  root.addEventListener('toggle', e => { if (e.target.matches?.('.an-momentos')) momentosAbertos = e.target.open; }, true);
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-aba]');
    if (b) irPara(b.dataset.aba);
  });
  // Sem este CSS a carta de prévia fica solta, e a imagem dela cobre a página e bloqueia todos os cliques.
  if (!document.querySelector('link[href*="live-card.css"]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/live-card.css?v=20261102-escala1'}));
  if (!document.querySelector('link[data-anim-picker]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: '/shared/anim-picker.css?v=2'}));
  const [, , exported, list] = await Promise.all([loadAnims(), iniciarMomentos(api, notice), fetch(`../card-forge/art-web/cards.json?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json()), fetch('/data/vfx-inventario.json', {cache: 'no-store'}).then(r => (r.ok ? r.json() : inventario)).catch(() => inventario)]);
  cards = exported.cartas; inventario = list;
  draw();
}
function setChoice(id, key, value) {
  const entry = entryOf(id);
  if (key.startsWith('linha:')) { const i = Number(key.slice(6)), l = [...entry.linhas]; l[i] = value; for (let j = 0; j < l.length; j++) l[j] ??= null; return save(id, {...entry, linhas: l}); }
  return save(id, {...entry, [key]: value});
}
const saveTune = (id, patch) => save('efeitos', {efeitos: {...animsNow().efeitos, [id]: {...tune(id), ...patch}}});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-an]');
  if (!b || !root?.contains(b)) return;
  const act = b.dataset.an, {id, k} = b.dataset;
  if (act === 'test') return openAnimPreview(b.dataset.fx, b.closest('.tl-anim')?.querySelector('span')?.firstChild?.textContent || '');
  if (act === 'faccao') { faccao = b.dataset.f; return draw(); }
  if (act === 'card') { cardId = id; return draw(); }
  if (act === 'clear') return setChoice(id, k, null);
  if (act === 'cor-reset') return saveTune(b.dataset.fx, {cor: null});
  if (act === 'pick') {
    const entry = animsNow()[id] || {}, value = k.startsWith('linha:') ? entry.linhas?.[Number(k.slice(6))] : entry[k];
    const what = k.startsWith('linha:') ? b.closest('.tl-anim').querySelector('span').textContent : ANIM_MOMENTS.find(([m]) => m === k)?.[1];
    openAnimPicker({title: 'Escolher animação', alvo: `${id === 'padrao' ? 'Todas as cartas' : id.startsWith('faccao-') ? `Facção ${faccao}` : cards.find(c => c.id === id)?.nome_exibicao_en || id} · ${what}`, value, herda: `Usar: ${b.dataset.herda}`, onPick: v => setChoice(id, k, v)});
  }
});
const readFile = (file, how) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(Error('Não foi possível ler o arquivo.')); r[how](file); });
document.addEventListener('submit', async e => {
  if (e.target.id !== 'an-import') return;
  e.preventDefault();
  const f = new FormData(e.target), out = root.querySelector('#an-import-result'), file = f.get('arquivo'), meta = f.get('json');
  out.textContent = 'Importando…';
  try {
    const num = k => (f.get(k) ? Number(f.get(k)) : undefined);
    const data = await importVfx({nome: f.get('nome'), fonte: f.get('fonte'), licenca: f.get('licenca'), acesso: f.get('acesso'), origem: f.get('origem'), tipo: f.get('tipo'), loop: f.has('loop'), colunas: num('colunas'), linhas: num('linhas'), fps: num('fps'),
      json: meta?.size ? await readFile(meta, 'readAsText') : undefined, arquivo: {nome: file.name, base64: (await readFile(file, 'readAsDataURL')).split(',')[1]}});
    filtro = {fonte: data.efeito.fonte, tipo: '', faccao: '', gatilho: '', q: ''};
    draw();
    hooks.notice(data.duplicado ? `Esse efeito já está no catálogo como ${data.efeito.nome}.` : `${data.efeito.nome} importado: ${data.efeito.quadros} quadros.`, true);
    openAnimPreview(data.efeito.id, data.efeito.nome);
  } catch (error) { out.textContent = error.message; }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (!root?.contains(t)) return;
  if (t.dataset.bib) { bib[t.dataset.bib] = t.value; bibMax = 60; return bibRedraw(); }
  if (t.dataset.filtro === 'q') { filtro.q = t.value; root.querySelector('#an-effects').innerHTML = effectRows(); return; }
  if (t.id === 'an-busca') { busca = t.value; const at = t.selectionEnd; draw(); const n = root.querySelector('#an-busca'); n.focus(); n.setSelectionRange(at, at); return; }
  if (t.dataset.tune && t.type === 'range') { const b = t.closest('label').querySelector('b'); if (b) b.textContent = `${t.value}×`; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (!root?.contains(t)) return;
  if (t.id === 'an-carta-faccao') { cartaFaccao = t.value; return draw(); }
  if (t.dataset.filtro) { filtro[t.dataset.filtro] = t.value; root.querySelector('#an-effects').innerHTML = effectRows(); return; }
  const meta = t.closest('.an-meta');
  if (meta) {
    const value = t.name === 'tipo' ? t.value : [...meta.querySelectorAll(`[name=${t.name}]:checked`)].map(x => x.value);
    editVfx({id: meta.dataset.vfx, [t.name]: value}).then(() => hooks.notice('Categorias salvas.', true)).catch(error => hooks.notice(error.message));
    return;
  }
  if (!t.dataset.tune) return;
  saveTune(t.dataset.tune, {[t.dataset.field]: t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value});
});
