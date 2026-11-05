// STAR HILL · Momentos do jogo: uma lista só para achar e trocar a animação e o som de cada coisa da partida, e ver na mesa real.
// Grava onde o jogo já lê: data/card-animations.json (padrao) e data/olympus-telas.json (audio e animacoes). A carta e a facção passam por cima.
import {animsNow} from '/shared/anim-picker.js?v=5';
import {loadTelas, telasSons} from './telas-editor.js?v=20261105-momentos1';
import {abilityNames} from './arena-model.js';
import {filtraMomentos} from './momentos-model.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const W = 1280, H = 720, CARTA = 'athena-v6-001', OPONENTE = 'poseidon-v6-091';
let busca = '', chooser = () => '', cards = [], notice = () => {}, velha = false, tocando = false;

const som = l => {
  if (!l.som) return '<span class="mo-vazio">Sem som próprio</span>';
  const v = telasSons.valor(l.som);
  return `<div class="tl-chooser${v ? '' : ' is-empty'}"><button type="button" class="tl-chooser__pick" data-mo="som" data-k="${l.som}">${v ? `♪ ${esc(telasSons.nome(v))}` : '+ Escolher som'}</button>
    <button type="button" data-mo="ouvir" data-k="${l.som}" aria-label="Ouvir: ${esc(l.nome)}" title="Ouvir" ${v ? '' : 'disabled'}>▶</button><button type="button" data-mo="sem-som" data-k="${l.som}" aria-label="Tirar som: ${esc(l.nome)}" title="Tirar som" ${v ? '' : 'disabled'}>✕</button></div>`;
};
const grupo = l => {
  const a = l.grupo && telasSons.anim(l.grupo);
  if (!a) return '';
  return `<div class="mo-grupo"><label><input type="checkbox" class="tl-switch" role="switch" data-mo-liga="${l.grupo}" ${a.ligada ? 'checked' : ''}> Ligada</label>
    <label class="tl-speed">Velocidade <input type="range" min="0.25" max="3" step="0.25" data-mo-vel="${l.grupo}" value="${a.velocidade}" ${a.ligada ? '' : 'disabled'}><b>${a.velocidade}×</b></label></div>`;
};
const linha = l => `<div class="mo-row"><div class="mo-what"><b>${esc(l.nome)}</b><small>${esc(l.quando)}</small>${l.cena ? `<button type="button" class="mo-play" data-mo="mesa" data-cena="${l.cena}">▶ Ver na mesa</button>` : ''}</div>
  <div class="mo-col"><small>Animação</small>${l.fx ? chooser('padrao', l.fx, animsNow().padrao?.[l.fx], 'sem efeito') : '<span class="mo-vazio">Só a animação fixa do jogo</span>'}</div>
  <div class="mo-col"><small>Som</small>${som(l)}</div>${grupo(l)}</div>`;
const linhas = () => {
  const grupos = filtraMomentos(busca);
  return grupos.length ? grupos.map(g => `<h3>${esc(g.titulo)}</h3>${g.linhas.map(linha).join('')}`).join('') : '<p class="hint">Nenhum momento com esse nome.</p>';
};
const mesaSrc = () => `/playtest/divine/?demo=criador&a=${CARTA}&b=${OPONENTE}`;

export function momentosSection(opts) {
  ({chooser, cards} = opts);
  velha = false;
  return `<section class="panel tl" id="momentos"><div class="tl-head"><h2>Momentos do jogo</h2><span class="tag">Vale para toda carta sem escolha própria</span></div>
    <p class="hint">Escolha a animação e o som de cada momento. Salva na hora. Para levar ao jogo online, publique na aba Visão geral.</p>
    <div class="mo-grid"><div class="mo-lista"><input type="search" id="mo-busca" value="${esc(busca)}" placeholder="Procurar: entra em campo, dano, turno…" aria-label="Procurar momento"><div id="mo-rows">${linhas()}</div>
      <p class="hint">Só uma carta ou facção diferente? <button type="button" class="mo-link" data-aba-ir="carta">Abrir Por carta</button></p></div>
    <aside class="mo-mesa" aria-label="Mesa real do jogo"><div class="ar-view" id="mo-view"><iframe id="mo-game" title="Mesa real do jogo" src="${mesaSrc()}"></iframe></div><output class="hint" id="mo-status" aria-live="polite">Clique em Ver na mesa em qualquer momento.</output></aside></div></section>`;
}
// Trocar um efeito não recarrega a mesa, que é pesada: só a lista muda, e a mesa recarrega antes do próximo teste.
export function momentosRepaint() {
  const box = document.querySelector('#mo-rows');
  if (!box) return false;
  box.innerHTML = linhas();
  velha = true;
  return true;
}
function fit() {
  const view = document.querySelector('#mo-view'), frame = document.querySelector('#mo-game');
  if (!view || !frame) return;
  const k = view.clientWidth / W;
  frame.style.transform = `scale(${k})`;
  view.style.height = `${Math.ceil(H * k)}px`;
}
export function momentosMounted() {
  const view = document.querySelector('#mo-view');
  if (!view) return;
  fit();
  new ResizeObserver(() => setTimeout(fit)).observe(view); // depois do quadro: fit muda a altura da caixa observada
}
export async function iniciarMomentos(api, avisar) {
  notice = avisar;
  await loadTelas(api);
  telasSons.usar(api, avisar);
}
const game = () => document.querySelector('#mo-game')?.contentWindow?.__divine?.criador;
const say = t => { const o = document.querySelector('#mo-status'); if (o) o.textContent = t; };
async function esperaMesa(trocou) {
  for (let i = 0; i < 150; i++) {
    const api = game();
    if (api && !(trocou && api === trocou)) return api;
    await new Promise(r => setTimeout(r, 100));
  }
  throw Error('A mesa não abriu.');
}
async function naMesa(cena, nome) {
  if (tocando) return;
  tocando = true;
  document.querySelectorAll('[data-mo=mesa]').forEach(b => { b.disabled = true; });
  try {
    let anterior = null;
    if (velha) { anterior = game() || null; say('Recarregando a mesa com a sua escolha…'); document.querySelector('#mo-game').src = mesaSrc(); velha = false; }
    else say('Abrindo a mesa…');
    const api = await esperaMesa(anterior);
    say('Tocando…');
    const ability = abilityNames(cards.find(c => c.id === CARTA))[0] || '';
    await api.cena(cena, {de: 'A', ability});
    say(`${nome}: tocado na mesa real.`);
  } catch (error) { console.error(error); say(`Falhou: ${error.message}`); }
  tocando = false;
  document.querySelectorAll('[data-mo=mesa]').forEach(b => { b.disabled = false; });
}
const salvo = () => { momentosRepaint(); notice('Salvo. Use Publicar para levar ao jogo online.', true); };
const falhou = error => { momentosRepaint(); notice(error.message); };

document.addEventListener('click', e => {
  const b = e.target.closest('[data-mo]');
  if (!b || !document.querySelector('#momentos')?.contains(b)) return;
  const {mo, k} = b.dataset;
  if (mo === 'mesa') return void naMesa(b.dataset.cena, b.closest('.mo-row').querySelector('b').textContent);
  if (mo === 'ouvir') return telasSons.ouvir(k);
  if (mo === 'som') return telasSons.escolher(k, salvo, falhou);
  if (mo === 'sem-som') telasSons.mudar(`audio.efeitos.${k}`, null).then(salvo, falhou);
});
document.addEventListener('input', e => {
  if (e.target.id === 'mo-busca') { busca = e.target.value; document.querySelector('#mo-rows').innerHTML = linhas(); return; }
  if (e.target.dataset.moVel) e.target.closest('label').querySelector('b').textContent = `${e.target.value}×`;
});
document.addEventListener('change', e => {
  const {moLiga, moVel} = e.target.dataset;
  if (moLiga) telasSons.mudar(`animacoes.${moLiga}.ligada`, e.target.checked).then(salvo, falhou);
  if (moVel) telasSons.mudar(`animacoes.${moVel}.velocidade`, Number(e.target.value)).then(salvo, falhou);
});
