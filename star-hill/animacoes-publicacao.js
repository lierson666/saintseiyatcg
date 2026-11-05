// STAR HILL · Publicação das animações: mostra o que mudou, valida e cria uma versão. Nada vai ao ar sem o deploy do site.
import {confirmar} from './confirmar.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const STATE = {rascunho: 'Rascunho', teste: 'Em teste', aprovado: 'Aprovado', publicado: 'Publicado'};
let data = null, hooks = {};

async function call(body) {
  const r = await fetch('/api/star-hill/vfx-publicacao', body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {cache: 'no-store'});
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(out.erro || 'Feche e abra o STAR HILL para atualizar o servidor.');
  return out;
}
export const publicacaoNow = () => data;
export async function loadPublicacao() {
  try { data = await call(); } catch (error) { data = {erro: error.message}; }
}
const names = list => (list.length > 12 ? `${list.slice(0, 12).join(', ')} e mais ${list.length - 12}` : list.join(', '));
export function publicacaoSection() {
  if (!data) return '<section class="panel tl"><p class="hint">Carregando…</p></section>';
  if (data.erro) return `<section class="panel tl"><p class="hint">${esc(data.erro)}</p></section>`;
  const {animacoes, estudio} = data.mudou, changed = animacoes.length + estudio.length, blocked = data.problemas.length > 0;
  return `<section class="panel tl" id="pub"><div class="tl-head"><h2>Publicação</h2><span class="tag">No ar depois do deploy: versão ${data.versao}</span></div>
    <p class="hint">O jogo online só lê a versão publicada. Publicar aqui prepara a versão; ela vai ao ar no próximo deploy do site.</p>
    <div class="an-pub-states">${Object.entries(STATE).map(([k, nome]) => `<div><b>${data.estados[k] || 0}</b><small>${nome}</small></div>`).join('')}</div>
    <h3>O que mudou desde a versão ${data.versao}</h3>
    ${changed ? `${animacoes.length ? `<p>Animações: ${esc(names(animacoes))}</p>` : ''}${estudio.length ? `<p>Composer e holográficos: ${esc(names(estudio))}</p>` : ''}` : '<p class="hint">Nada: a edição está igual à versão publicada.</p>'}
    ${blocked ? `<h3>Impede publicar</h3><ul class="an-pub-problems">${data.problemas.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <label class="tl-field"><span>O que mudou nesta versão</span><input data-pub-nota maxlength="200" placeholder="Ex.: novo golpe do Seiya"></label>
    <button type="button" data-pub="publicar" ${blocked || !changed ? 'disabled' : ''}>Publicar versão ${data.versao + 1}</button>
    ${data.efeitos.length ? `<h3>Efeitos novos</h3><ul class="an-inv">${data.efeitos.map(e => `<li><div><b>${esc(e.nome)}</b><small>${esc(e.fonte || '')} · ${esc(e.tipo || '')}</small></div><span class="tag">${STATE[e.estado]}</span></li>`).join('')}</ul>` : ''}
    <h3>Histórico</h3><ul class="an-inv">${data.historico.map(h => `<li><div><b>Versão ${h.versao}</b><small>${esc(h.em)} · ${esc(h.nota)}</small></div>${h.versao === data.versao ? '<span class="tag">Atual</span>' : `<button type="button" data-pub="restaurar" data-v="${h.versao}">Voltar a esta</button>`}</li>`).join('')}</ul></section>`;
}
export function mountPublicacao(root, {notice, redraw}) {
  hooks = {notice, redraw};
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-pub]');
    if (!b) return;
    const publish = b.dataset.pub === 'publicar', version = Number(b.dataset.v);
    if (!await confirmar(publish ? 'Criar a nova versão publicada? Ela vai ao ar no próximo deploy do site.' : `Voltar à versão ${version}? Isso cria uma versão nova; sua edição em andamento não muda.`, publish ? 'Publicar' : 'Restaurar')) return;
    try {
      data = await call(publish ? {acao: 'publicar', nota: root.querySelector('[data-pub-nota]').value} : {acao: 'restaurar', versao: version});
      hooks.notice(`Versão ${data.versao} pronta. Vai ao ar no próximo deploy do site.`, true);
      hooks.redraw();
    } catch (error) { hooks.notice(error.message); }
  });
}
