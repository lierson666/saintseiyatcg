// Criador de animações: testa um efeito na mesa real do jogo (?demo=criador), na visão do jogador.
// Os efeitos novos nascem na conversa com o Claude (tools/vfx-criar.mjs) e chegam aqui como rascunho. Nada aqui muda regra.
import {ANIM_MOMENTS, allEffects, animsNow, editVfx, loadAnims, saveAnim} from '/shared/anim-picker.js?v=5';

import {openAnimRequest} from '/shared/anim-request.js';
import {PARTICLE_GROUPS} from '/playtest/divine/particle-tune.js';
import {COMBAT, EFFECTS, measureCombat} from '/playtest/divine/pixel-vfx.js';
import {COMBAT_TRACKS} from '/playtest/divine/combat-tracks.js';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const query = new URLSearchParams(location.search);
// Momentos que a sequência de Strike e a entrada em campo mostram.
const TESTABLE = ['golpe', 'impacto', 'impacto_deus', 'carga', 'declarar', 'strike', 'dano', 'entrada'];
const say = text => { $('status').textContent = text; };
const effect = () => allEffects().find(e => e.id === $('effect').value);
const game = () => $('game').contentWindow?.__divine?.criador;
let playing = false;

function loadGame() {
  say('Abrindo a mesa…');
  $('game').src = `/playtest/divine/?demo=criador&a=${encodeURIComponent($('cardA').value)}&b=${encodeURIComponent($('cardB').value)}`;
}
function fit() {
  const [w, h] = $('screen').value.split('x').map(Number), view = $('view'), frame = $('game');
  const room = Math.max(240, innerHeight - 24), k = Math.min(view.clientWidth / w, room / h);
  frame.style.width = `${w}px`; frame.style.height = `${h}px`; frame.style.transform = `scale(${k})`;
  view.style.height = `${Math.ceil(h * k)}px`;
}
function paintEffects(keep) {
  if ($('lpA').options.length) lpSelects();
  const list = allEffects().filter(e => !e.soCatalogo), drafts = list.filter(e => e.rascunho), rest = list.filter(e => !e.rascunho);
  const group = (name, items) => (items.length ? `<optgroup label="${esc(name)}">${items.map(e => `<option value="${esc(e.id)}">${esc(e.nome)}${e.estado === 'teste' ? ' · testado' : ''}</option>`).join('')}</optgroup>` : '');
  const fontes = [...new Set(rest.map(e => e.fonte || 'Jogo'))];
  $('effect').innerHTML = group('Rascunhos', drafts) + fontes.map(f => group(f, rest.filter(e => (e.fonte || 'Jogo') === f))).join('');
  if (keep && list.some(e => e.id === keep)) $('effect').value = keep;
  paintTune();
}
function paintTune() {
  const e = effect(), t = animsNow().efeitos?.[e?.id] || {};
  $('size').value = t.tamanho ?? 1; $('speed').value = t.velocidade ?? 1; $('anchor').value = t.ancora || '';
  $('anchor').disabled = !e?.arquivo; // só folha importada escolhe posição
  $('discard').disabled = !e?.rascunho;
  $('restoreTune').disabled = !animsNow().efeitos?.[e?.id];
  $('approve').disabled = e?.estado !== 'teste'; // só depois de tocar na mesa
  $('useCard').disabled = $('useAll').disabled = !e || !!e.rascunho;
}
const tune = () => {
  const base = {ligado: true, tamanho: 1, velocidade: 1, cor: null, ...animsNow().efeitos?.[effect().id]};
  const out = {...base, tamanho: Number($('size').value), velocidade: Number($('speed').value)};
  if ($('anchor').value) out.ancora = $('anchor').value; else delete out.ancora;
  return out;
};
async function play() {
  const api = game(), e = effect();
  if (!api) return say('A mesa ainda está abrindo.');
  if (!e || playing) return;
  playing = true; $('play').disabled = true; say('');
  const moment = $('moment').value, args = {anim: {[moment]: e.id}, tune: {[e.id]: tune()}, de: $('side').value};
  try {
    await (moment === 'entrada' ? api.entrada(args) : api.strike({...args, deus: moment === 'impacto_deus'}));
    if (e.rascunho && e.estado !== 'teste') { await editVfx({id: e.id, testado: true}); await loadAnims(); paintEffects(e.id); say('Testado na mesa. Agora dá para guardar no banco.'); }
  } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('play').disabled = false;
}
async function run(action, done) {
  try { await action(); say(done); } catch (error) { say(error.message); }
}
const use = (id, label) => run(() => saveAnim(id, {linhas: [], ...animsNow()[id], [$('moment').value]: effect().id}), `Salvo ${label}. Vai ao jogo online depois de uma versão na aba Publicação e do deploy do site.`);
const refresh = async () => { await loadAnims(); paintEffects($('effect').value); loadGame(); };

const [, exported] = await Promise.all([loadAnims(), fetch(`/card-forge/art-web/cards.json?t=${Date.now()}`, {cache: 'no-store'}).then(r => r.json())]);
const devotees = exported.cartas.filter(c => c.tipo === 'Devotee').sort((a, b) => a.id.localeCompare(b.id));
const cardOptions = devotees.map(c => `<option value="${esc(c.id)}">${esc(c.nome_exibicao_pt || c.nome_exibicao_en || c.id)} · ${esc(c.id)}</option>`).join('');
$('cardA').innerHTML = $('cardB').innerHTML = cardOptions;
const pick = (select, id, fallback) => { select.value = devotees.some(c => c.id === id) ? id : fallback; };
pick($('cardA'), query.get('a'), 'athena-v6-001');
pick($('cardB'), query.get('b'), 'poseidon-v6-091');
$('moment').innerHTML = ANIM_MOMENTS.filter(([k]) => TESTABLE.includes(k)).map(([k, nome]) => `<option value="${k}">${esc(nome)}</option>`).join('');
paintEffects();

// Efeito novo só chega ao jogo recarregando a mesa, que lê o catálogo ao abrir.
async function testNew(id) {
  location.hash = '';
  const opened = new Promise(done => $('game').addEventListener('load', done, {once: true}));
  await refresh();
  await opened;
  for (let i = 0; i < 200 && !game(); i++) await new Promise(done => setTimeout(done, 100));
  $('effect').value = id; paintTune();
  await play();
}
$('request').addEventListener('click', () => openAnimRequest({cards: exported.cartas, onTest: testNew, onChange: () => loadAnims().then(() => paintEffects($('effect').value))}));
$('effect').addEventListener('change', paintTune);
$('play').addEventListener('click', play);
$('cardA').addEventListener('change', loadGame);
$('cardB').addEventListener('change', loadGame);
$('screen').addEventListener('change', () => { fit(); loadGame(); });
$('refresh').addEventListener('click', () => run(refresh, 'Lista atualizada.'));
$('saveTune').addEventListener('click', () => run(async () => { await saveAnim('efeitos', {efeitos: {...animsNow().efeitos, [effect().id]: tune()}}); paintTune(); }, 'Ajuste salvo.'));
$('restoreTune').addEventListener('click', () => run(async () => { const {[effect().id]: dropped, ...rest} = animsNow().efeitos; await saveAnim('efeitos', {efeitos: rest}); paintTune(); }, 'Original restaurado.'));
$('approve').addEventListener('click', () => run(async () => { await editVfx({id: effect().id, aprovar: true}); await loadAnims(); paintEffects($('effect').value); }, 'Guardado no banco de efeitos.'));
$('discard').addEventListener('click', () => run(async () => { await editVfx({id: effect().id, descartar: true}); await refresh(); }, 'Rascunho descartado.'));
$('useCard').addEventListener('click', () => use($('side').value === 'A' ? $('cardA').value : $('cardB').value, 'nesta carta'));
$('useAll').addEventListener('click', () => use('padrao', 'como padrão'));
$('game').addEventListener('load', () => say(''));

// Modo Partículas: mesmo palco, um ajuste por grupo. Testar não salva.
const ORIGINAL = {ligado: true, quantidade: 1, tamanho: 1, duracao: 1, cor: null};
$('pGroup').innerHTML = PARTICLE_GROUPS.map(([k, nome]) => `<option value="${esc(k)}">${esc(nome)}</option>`).join('');
const pShow = () => { for (const [range, out] of [['pCount', 'pCountOut'], ['pSize', 'pSizeOut'], ['pTime', 'pTimeOut']]) $(out).textContent = `${Number($(range).value).toFixed(2).replace('.', ',')}×`; $('pColor').disabled = !$('pOwnColor').checked; };
function pPaint() {
  const key = $('pGroup').value, t = {...ORIGINAL, ...animsNow().particulas?.[key]};
  $('pWhen').textContent = PARTICLE_GROUPS.find(g => g[0] === key)[2];
  $('pOn').checked = t.ligado; $('pCount').value = t.quantidade; $('pSize').value = t.tamanho; $('pTime').value = t.duracao;
  $('pOwnColor').checked = !!t.cor; if (t.cor) $('pColor').value = t.cor;
  pShow();
}
const pTune = () => ({ligado: $('pOn').checked, quantidade: Number($('pCount').value), tamanho: Number($('pSize').value), duracao: Number($('pTime').value), cor: $('pOwnColor').checked ? $('pColor').value : null});
const pStore = (key, tune) => {
  const all = {...animsNow().particulas};
  if (tune) all[key] = tune; else delete all[key];
  return saveAnim('particulas', {particulas: all});
};
$('pGroup').addEventListener('change', pPaint);
$('modoParticulas').addEventListener('input', pShow);
$('pPlay').addEventListener('click', async () => {
  const api = game();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  playing = true; $('pPlay').disabled = true; say('');
  try { await api.particula({key: $('pGroup').value, tune: pTune(), de: $('pSide').value}); } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('pPlay').disabled = false;
});
$('pSave').addEventListener('click', () => run(() => pStore($('pGroup').value, pTune()), 'Partícula salva. Publicar no site leva ao jogo online.'));
$('pReset').addEventListener('click', () => run(async () => { await pStore($('pGroup').value, null); pPaint(); }, 'Voltou ao original.'));
// Modo Interface: animações CSS antigas pelo nome do @keyframes (shared/anim-css-adapter.js). Testar não salva.
const inventario = await fetch('/data/vfx-inventario.json', {cache: 'no-store'}).then(r => r.json()).catch(() => ({animacoes: []}));
const cssRows = inventario.animacoes.filter(a => a.aba === 'interface');
const cssRow = () => cssRows.find(a => a.nome === $('iAnim').value);
$('iAnim').innerHTML = [...new Set(cssRows.map(a => a.categoria))].sort().map(c => `<optgroup label="${esc(c)}">${cssRows.filter(a => a.categoria === c).map(a => `<option value="${esc(a.nome)}">${esc(a.nome)}</option>`).join('')}</optgroup>`).join('');
const iShow = () => { $('iSpeedOut').textContent = `${Number($('iSpeed').value).toFixed(2).replace('.', ',')}×`; };
function iPaint() {
  const row = cssRow(), t = animsNow().css?.[$('iAnim').value];
  $('iWhen').textContent = row ? `${row.gatilho} · ${row.arquivos[0]}${row.pagina === 'mesa' ? '' : ' · roda no lobby, fora da mesa'}` : '';
  $('iOn').checked = t?.ligado ?? true; $('iSpeed').value = t?.velocidade ?? 1;
  $('iPlay').disabled = row?.pagina !== 'mesa';
  iShow();
}
const iMap = tune => {
  const all = {...animsNow().css}, on = tune.ligado && tune.velocidade === 1;
  if (on) delete all[$('iAnim').value]; else all[$('iAnim').value] = tune;
  return all;
};
const iTune = () => ({ligado: $('iOn').checked, velocidade: Number($('iSpeed').value)});
$('iAnim').addEventListener('change', iPaint);
$('iSpeed').addEventListener('input', iShow);
$('iPlay').addEventListener('click', async () => {
  const api = game();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  playing = true; $('iPlay').disabled = true; say('');
  try {
    const nome = $('iAnim').value, r = await api.interface({nome, mapa: iMap(iTune())});
    say(`${r.tocou ? 'Amostra numa carta da mesa: a animação é a real, mas o elemento pode não ser o original.' : 'Não há carta na mesa para a amostra.'} ${r.rodando ? `${r.rodando} já rodando nesta mesa.` : 'Nenhuma rodando nesta mesa agora.'}`);
  } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('iPlay').disabled = false;
});
$('iSave').addEventListener('click', () => run(() => saveAnim('css', {css: iMap(iTune())}), 'Animação salva. Publicar no site leva ao jogo online.'));
$('iReset').addEventListener('click', () => run(async () => {
  await saveAnim('css', {css: iMap({ligado: true, velocidade: 1})});
  iPaint();
  await game()?.interface({nome: $('iAnim').value, mapa: animsNow().css || {}, amostra: false});
}, 'Voltou ao original.'));
// Modo Céu e moeda: dois laços próprios do jogo, com os valores originais à mão. Testar não salva.
const times = v => `${Number(v).toFixed(2).replace('.', ',')}×`;
const COIN = {ligado: true, duracao: 1, giros: 6}, SKY = {ligado: true, estrelas: 1};
const mTune = () => ({ligado: $('mOn').checked, duracao: Number($('mTime').value), giros: Number($('mSpin').value)});
const sTune = () => ({ligado: $('sOn').checked, estrelas: Number($('sStars').value)});
const mShow = () => { $('mTimeOut').textContent = times($('mTime').value); $('mSpinOut').textContent = $('mSpin').value; };
const sShow = () => { $('sStarsOut').textContent = times($('sStars').value); };
function mPaint() { const t = {...COIN, ...animsNow().moeda}; $('mOn').checked = t.ligado; $('mTime').value = t.duracao; $('mSpin').value = t.giros; mShow(); }
function sPaint() { const t = {...SKY, ...animsNow().ceu}; $('sOn').checked = t.ligado; $('sStars').value = t.estrelas; sShow(); }
const onSky = () => $('game').src.includes('/about/');
const skyApi = () => $('game').contentWindow?.__kvSky;
$('mTime').addEventListener('input', mShow); $('mSpin').addEventListener('input', mShow); $('sStars').addEventListener('input', sShow);
$('mPlay').addEventListener('click', async () => {
  if (onSky()) { loadGame(); return say('Voltando à mesa. Teste de novo quando ela abrir.'); }
  const api = game();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  playing = true; $('mPlay').disabled = true; say('');
  try { const r = await api.moeda({tune: mTune(), vencedor: $('mWinner').value}); if (!r.webgl) say('Sem WebGL neste aparelho: a partida usa a moeda em CSS, que este ajuste não alcança.'); } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('mPlay').disabled = false;
});
$('sPlay').addEventListener('click', async () => {
  if (!onSky()) {
    say('Abrindo a página real…');
    await new Promise(done => { $('game').addEventListener('load', done, {once: true}); $('game').src = '/about/'; });
  }
  for (let i = 0; i < 40 && !skyApi(); i++) await new Promise(done => setTimeout(done, 100));
  if (!skyApi()) return say('O céu não abriu nesta página.');
  skyApi().tune(sTune()); say('Céu com o ajuste em teste. Sem salvar.');
});
$('mSave').addEventListener('click', () => run(() => saveAnim('moeda', {moeda: mTune()}), 'Moeda salva. Publicar no site leva ao jogo online.'));
$('sSave').addEventListener('click', () => run(() => saveAnim('ceu', {ceu: sTune()}), 'Céu salvo. Publicar no site leva ao jogo online.'));
$('mReset').addEventListener('click', () => run(async () => { await saveAnim('moeda', {moeda: null}); mPaint(); }, 'Voltou ao original.'));
$('sReset').addEventListener('click', () => run(async () => { await saveAnim('ceu', {ceu: null}); sPaint(); skyApi()?.tune(SKY); }, 'Voltou ao original.'));
// Modo Sprite Fusion: receita em código. Testar não salva; salvar cria rascunho sem carta.
const baseName = id => EFFECTS.find(e => e[0] === id)?.[1] || id;
const fKind = () => COMBAT[$('fType').value];
$('fType').innerHTML = Object.entries(COMBAT).map(([k, c]) => `<option value="${k}">${esc(c.nome)}</option>`).join('');
const fShow = () => {
  $('fScaleOut').textContent = times($('fScale').value); $('fSpeedOut').textContent = times($('fSpeed').value);
  const kind = fKind(), plain = kind.camadas.filter(c => !c.cor).map(c => baseName(c.base)), any = plain.length < kind.camadas.length;
  $('fOwnColor').disabled = !any; if (!any) $('fOwnColor').checked = false;
  $('fColor').disabled = !$('fOwnColor').checked;
  $('fColorNote').textContent = !any ? 'Este tipo mantém as cores do próprio efeito.' : plain.length ? `A cor não muda: ${[...new Set(plain)].join(', ')}.` : '';
};
function fPaint() {
  const kind = fKind();
  $('fName').value = kind.nome;
  $('fLayers').innerHTML = kind.camadas.map((c, i) => `<div><label class="cr-check"><input type="checkbox" data-layer="${i}" checked> ${esc(baseName(c.base))}</label><label>Atraso <output data-delay-out="${i}">${c.atraso ?? 0} ms</output><input type="range" data-delay="${i}" min="0" max="1500" step="10" value="${c.atraso ?? 0}"></label></div>`).join('');
  $('fMeta').textContent = '';
  fShow();
}
const fRecipe = () => ({tipo: $('fType').value, cor: $('fOwnColor').checked ? $('fColor').value : null, escala: Number($('fScale').value), velocidade: Number($('fSpeed').value), ancora: $('fAnchor').value,
  camadas: fKind().camadas.map((_, i) => ({ligada: document.querySelector(`[data-layer="${i}"]`).checked, atraso: Number(document.querySelector(`[data-delay="${i}"]`).value)}))});
const fFacts = async r => { const ms = await measureCombat(r); $('fMeta').textContent = `Duração ${ms} ms · ${r.camadas.filter(c => c.ligada).length} camadas · código ao vivo, sem arquivo · fundo transparente · licença MIT`; return ms; };
$('fType').addEventListener('change', fPaint);
$('modoSprite').addEventListener('input', e => { const i = e.target.dataset.delay; if (i != null) document.querySelector(`[data-delay-out="${i}"]`).textContent = `${e.target.value} ms`; fShow(); });
$('fPlay').addEventListener('click', async () => {
  const api = game(), r = fRecipe();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  if (!r.camadas.some(c => c.ligada)) return say('Ligue ao menos uma camada.');
  playing = true; $('fPlay').disabled = true; say('');
  try { await fFacts(r); await api.receita({receita: r, de: $('fSide').value, deus: !!$('fTarget').value}); } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('fPlay').disabled = false;
});
$('fSave').addEventListener('click', () => run(async () => {
  const r = fRecipe();
  await editVfx({nome: $('fName').value, receita: r, duracao_ms: await fFacts(r)});
  await loadAnims(); paintEffects($('effect').value);
}, 'Rascunho salvo. Em Efeitos, teste e guarde no banco ou descarte.'));
// Modo Combate: uma coreografia, uma linha por fase, tudo medido a partir do começo do Strike. Testar não salva.
const LANE_MS = 2500;
const TEMPLATES = {
  fisico: {hit: 220, faixas: {charge: {efeito: 'power', inicio: 0}, impact: {efeito: 'impact', inicio: 220}, hitstop: {inicio: 220, duracao: 80}, knockback: {inicio: 220, distancia: 1}}},
  projetil: {hit: 620, faixas: {charge: {efeito: 'energy', inicio: 0}, projectile: {efeito: 'energy', inicio: 320}, impact: {efeito: 'impact', inicio: 620}, hitstop: {inicio: 620, duracao: 60}, knockback: {inicio: 620, distancia: 1.2}, aftermath: {efeito: 'embers', inicio: 700}}},
};
let cho = structuredClone(TEMPLATES.fisico), sounds = [];
fetch('/data/olympus-telas.json', {cache: 'no-store'}).then(r => r.json()).then(d => { sounds = Object.keys(d.audio?.efeitos || {}).sort(); cDraw(); }).catch(() => {});
const bankEffects = () => allEffects().filter(e => !e.soCatalogo && !e.coreografia && !e.id.includes(':')).sort((a, b) => (b.fonte === 'sprite-fusion') - (a.fonte === 'sprite-fusion'));
const lengthOf = (key, b) => (key === 'hitstop' ? b.duracao : key === 'knockback' ? 420 : key === 'sound' ? 300 : (() => { const e = allEffects().find(x => x.id === b.efeito); return e?.quadros ? e.quadros / e.fps * 1000 : e?.duracao_ms || 500; })());
const cEnd = () => Math.max(cho.hit, ...Object.entries(cho.faixas).map(([k, b]) => b.inicio + lengthOf(k, b)));
const pct = ms => `${Math.min(100, ms / LANE_MS * 100)}%`;
function cDraw() {
  const effects = bankEffects(), fontes = [...new Set(effects.map(e => e.fonte || 'Jogo'))];
  const list = fontes.map(f => `<optgroup label="${esc(f)}">${effects.filter(e => (e.fonte || 'Jogo') === f).map(e => `<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('')}</optgroup>`).join('');
  const hit = `<i class="cb-hit" style="left:${pct(cho.hit)}"></i>`;
  $('cTracks').innerHTML = COMBAT_TRACKS.map(([key, nome, tipo]) => {
    const b = cho.faixas[key];
    const control = tipo === 'efeito' ? `<select data-track="${key}" aria-label="Efeito de ${nome}"><option value="">Nada</option>${list}</select>`
      : tipo === 'hitstop' ? `<label><input type="number" data-value="${key}" min="0" max="300" step="10" value="${b?.duracao ?? 0}" aria-label="Duração do ${nome} em ms"></label>`
      : tipo === 'knockback' ? `<label><input type="number" data-value="${key}" min="0" max="3" step=".05" value="${b?.distancia ?? 0}" aria-label="Distância do ${nome}"></label>`
      : `<select data-track="${key}" aria-label="Som"><option value="">Padrão do jogo</option>${sounds.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>`;
    return `<div class="cb-row"><b>${nome}</b>${control}<div class="cb-lane${b ? '' : ' is-empty'}">${hit}<input type="range" data-start="${key}" min="0" max="${LANE_MS}" step="10" value="${b?.inicio ?? 0}" aria-label="Início de ${nome}"${b ? '' : ' disabled'}><i class="cb-block" style="left:${pct(b?.inicio ?? 0)};width:${b ? pct(lengthOf(key, b)) : 0}"></i></div></div>`;
  }).join('');
  for (const [key, , tipo] of COMBAT_TRACKS) if (tipo === 'efeito' || tipo === 'som') document.querySelector(`[data-track="${key}"]`).value = cho.faixas[key]?.efeito ?? cho.faixas[key]?.som ?? '';
  $('cHit').value = cho.hit; $('cHitOut').textContent = `${cho.hit} ms`;
}
$('cTemplate').addEventListener('change', () => { cho = structuredClone(TEMPLATES[$('cTemplate').value]); cDraw(); });
$('cHit').addEventListener('input', () => { cho.hit = Number($('cHit').value); cDraw(); });
$('cTracks').addEventListener('change', e => {
  const {track, value} = e.target.dataset;
  if (track) {
    const field = track === 'sound' ? 'som' : 'efeito';
    if (e.target.value) cho.faixas[track] = {inicio: cho.faixas[track]?.inicio ?? cho.hit, [field]: e.target.value}; else delete cho.faixas[track];
  }
  if (value) {
    const n = Number(e.target.value), field = value === 'hitstop' ? 'duracao' : 'distancia', low = value === 'knockback' ? .25 : 1;
    if (n >= low) cho.faixas[value] = {inicio: cho.faixas[value]?.inicio ?? cho.hit, [field]: n}; else delete cho.faixas[value];
  }
  cDraw();
});
$('cTracks').addEventListener('input', e => {
  const key = e.target.dataset.start;
  if (!key) return;
  cho.faixas[key].inicio = Number(e.target.value);
  e.target.nextElementSibling.style.left = pct(cho.faixas[key].inicio);
});
$('cPlay').addEventListener('click', async () => {
  const api = game();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  playing = true; $('cPlay').disabled = true; say('');
  try { const r = await api.coreografia({coreografia: structuredClone(cho), cenario: $('cScenario').value, de: $('cSide').value}); say(`Sequência completa na mesa: ${(r.ms / 1000).toFixed(1).replace('.', ',')} s.`); } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('cPlay').disabled = false;
});
$('cSave').addEventListener('click', () => run(async () => {
  await editVfx({nome: $('cName').value, coreografia: cho, duracao_ms: Math.round(cEnd())});
  await loadAnims(); paintEffects($('effect').value);
}, 'Rascunho salvo. Em Efeitos, teste no momento Golpe do Strike e guarde no banco ou descarte.'));
// Live Preview: tudo age na mesa real dentro do iframe. Recarregar a mesa zera o relógio: o estado é reaplicado ao abrir.
let clockReady = null;
const clock = () => (clockReady ??= game()?.relogio() ?? null);
const lpOff = () => [...document.querySelectorAll('[data-layer-view]')].filter(i => !i.checked).map(i => i.dataset.layerView);
function lpPaused(on) { $('lpPause').textContent = on ? '▶ Continuar' : '⏸ Pausar'; $('lpStep').disabled = !on; }
function lpApply() { game()?.camadas(lpOff()); game()?.ancoras($('lpAnchors').checked, $('side').value); }
const lpSelects = () => {
  const list = allEffects().filter(e => !e.soCatalogo && !e.id.includes(':')).sort((a, b) => (b.fonte === 'sprite-fusion') - (a.fonte === 'sprite-fusion')), html = list.map(e => `<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('');
  for (const id of ['lpA', 'lpB']) { const keep = $(id).value; $(id).innerHTML = html; if (keep) $(id).value = keep; }
  if (!$('lpB').dataset.set && list[1]) { $('lpB').value = list[1].id; $('lpB').dataset.set = '1'; }
};
$('game').addEventListener('load', async () => {
  clockReady = null; lpPaused(false); $('lpRate').value = '1';
  for (let i = 0; i < 100 && $('game').src.includes('/playtest/') && !game(); i++) await new Promise(done => setTimeout(done, 100));
  lpApply();
});
$('lpPause').addEventListener('click', async () => { const c = await clock(); if (!c) return say('A mesa ainda está abrindo.'); c.pause(!c.paused); lpPaused(c.paused); });
$('lpStep').addEventListener('click', async () => (await clock())?.step());
$('lpRate').addEventListener('change', async () => (await clock())?.setRate(Number($('lpRate').value)));
$('lpBench').addEventListener('click', () => { const b = game()?.medirRender(); say(b ? `Render: mundo ${b.world} ms, partículas ${b.fx} ms, em ${b.px.join('×')}.` : 'A mesa não mediu o render.'); });
$('live').addEventListener('change', e => { if (e.target.dataset.layerView || e.target.id === 'lpAnchors') lpApply(); });
$('lpCompare').addEventListener('click', async () => {
  const api = game();
  if (!api) return say('A mesa ainda está abrindo.');
  if (playing) return;
  playing = true; $('lpCompare').disabled = true;
  try {
    for (const [letter, id] of [['A', $('lpA').value], ['B', $('lpB').value]]) {
      const e = allEffects().find(x => x.id === id);
      say(`${letter}: ${e?.nome || id}`);
      await api.strike({anim: e?.coreografia ? {golpe: id} : {impacto: id}, tune: null, de: $('side').value});
      await new Promise(done => setTimeout(done, 600));
    }
    say('Comparação concluída.');
  } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  playing = false; $('lpCompare').disabled = false;
});
setInterval(() => {
  const m = !document.hidden && game()?.metricas();
  if (m) $('lpMetrics').textContent = `${m.fps ? `${m.fps} fps · pior quadro ${m.piorMs} ms · ` : ''}${m.efeitos} efeitos · pixel ${m.pixel ?? '-'} · WebGL ${m.webgl ?? '-'}${m.memoriaMB ? ` · ${m.memoriaMB} MB` : ''}`;
}, 500);
// #particulas, #interface, #cena, #sprite e #combate: a aba do Star Hill troca o modo sem recarregar a mesa.
function showMode() {
  const modo = location.hash.slice(1) || 'efeitos';
  $('modoEfeitos').hidden = modo !== 'efeitos'; $('modoParticulas').hidden = modo !== 'particulas'; $('modoInterface').hidden = modo !== 'interface'; $('modoCena').hidden = modo !== 'cena'; $('modoSprite').hidden = modo !== 'sprite'; $('modoCombate').hidden = modo !== 'combate'; $('cTimeline').hidden = modo !== 'combate';
  if (modo !== 'cena' && onSky()) loadGame();
  for (const b of document.querySelectorAll('[data-modo]')) b.setAttribute('aria-pressed', String(b.dataset.modo === modo));
}
document.querySelector('.cr-modes').addEventListener('click', e => { const m = e.target.closest('[data-modo]')?.dataset.modo; if (m) location.hash = m === 'efeitos' ? '' : m; });
addEventListener('hashchange', showMode);
pPaint();
iPaint();
mPaint();
sPaint();
fPaint();
cDraw();
lpSelects();
showMode();
new ResizeObserver(fit).observe($('view'));
addEventListener('resize', fit);
fit();
loadGame();
