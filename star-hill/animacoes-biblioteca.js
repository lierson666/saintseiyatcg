// STAR HILL · Biblioteca e Visão geral das animações: busca, filtros e uso real de cada efeito. Só lê; quem grava segue em animacoes.js.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const CONFIG = new Set(['efeitos', 'particulas', 'css', 'moeda', 'ceu']); // ajustes do jogo em card-animations.json; não são donos de vínculo
export const ESTADOS = {ativo: 'Ativo', rascunho: 'Rascunho', teste: 'Em teste', aprovado: 'Aprovado', publicado: 'Publicado'};
export const estadoOf = e => e.estado || 'ativo';

// Quem usa cada efeito: {efeito: [{dono, chave}]}. `false` desliga o momento de propósito e `null` herda, então nenhum dos dois conta.
export function usageMap(anims = {}) {
  const uso = {};
  const add = (fx, dono, chave) => { if (typeof fx === 'string' && fx) (uso[fx] ??= []).push({dono, chave}); };
  for (const [dono, entry] of Object.entries(anims)) {
    if (CONFIG.has(dono) || !entry || typeof entry !== 'object') continue;
    for (const [chave, fx] of Object.entries(entry)) {
      if (chave === 'linhas') (fx || []).forEach((line, i) => add(line, dono, `linha:${i}`));
      else add(fx, dono, chave);
    }
  }
  return uso;
}
const abilityTitle = (card, i) => String((card?.habilidades_pt?.length ? card.habilidades_pt : card?.habilidades_en)?.[i] ?? '').split(/ — |\n/)[0];
const cardName = c => c?.nome_exibicao_pt || c?.nome_exibicao_en || c?.id || '';
const ownerFaction = (dono, cardsById) => (dono.startsWith('faccao-') ? dono.slice(7) : String(cardsById.get(dono)?.faccao || '').toLowerCase());

// Filtra e ordena. Busca por nome e id do efeito, fonte, e pelas cartas e habilidades que o usam.
export function filterEffects(effects, {q = '', categoria = '', fonte = '', faccao = '', gatilho = '', estado = '', vinculo = '', ordem = 'nome'} = {}, uso = {}, cards = [], categoryOf = e => e.categoria) {
  const byId = new Map(cards.map(c => [c.id, c])), terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = effects.filter(e => {
    const users = uso[e.id] || [];
    if (categoria && categoryOf(e) !== categoria) return false;
    if (fonte && e.fonte !== fonte) return false;
    if (estado && estadoOf(e) !== estado) return false;
    if (vinculo === 'com' && !users.length) return false;
    if (vinculo === 'sem' && users.length) return false;
    if (faccao && !e.faccoes?.includes(faccao) && !users.some(u => ownerFaction(u.dono, byId) === faccao)) return false;
    if (gatilho && !e.gatilhos?.includes(gatilho) && !users.some(u => u.chave === gatilho)) return false;
    if (!terms.length) return true;
    const text = [e.nome, e.id, e.fonte, ...users.flatMap(u => { const c = byId.get(u.dono); return [u.dono, c?.nome_exibicao_en, c?.nome_exibicao_pt, u.chave.startsWith('linha:') ? abilityTitle(c, Number(u.chave.slice(6))) : u.chave]; })].join(' ').toLowerCase();
    return terms.every(t => text.includes(t));
  });
  const name = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt');
  return list.sort(ordem === 'uso' ? (a, b) => (uso[b.id]?.length || 0) - (uso[a.id]?.length || 0) || name(a, b) : name);
}

const options = (list, value, all) => `<option value="">${esc(all)}</option>${list.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
const ownerLabel = (u, byId) => (u.dono === 'padrao' ? 'Padrão do jogo' : u.dono.startsWith('faccao-') ? `Facção ${u.dono.slice(7)}` : cardName(byId.get(u.dono)));
const thumb = e => {
  if (!e.arquivo || !e.cols) return `<span class="bl-thumb bl-thumb--code" aria-hidden="true">${esc(e.id.includes(':') ? e.id.split(':')[0] : 'código')}</span>`;
  const rows = Math.ceil((e.quadros || e.cols) / e.cols);
  return `<span class="bl-thumb" aria-hidden="true" style="background-image:url('/${esc(e.arquivo)}');background-size:${e.cols * 100}% ${rows * 100}%"></span>`;
};
function row(e, uso, byId, momentName) {
  const users = uso[e.id] || [], cartas = users.filter(u => u.dono !== 'padrao' && !u.dono.startsWith('faccao-')).length;
  const resumo = users.length ? `${users.length} ${users.length === 1 ? 'vínculo' : 'vínculos'}${cartas ? ` · ${cartas} em carta` : ''}` : 'Sem vínculo';
  const lista = users.slice(0, 40).map(u => { const onde = u.chave.startsWith('linha:') ? abilityTitle(byId.get(u.dono), Number(u.chave.slice(6))) : momentName(u.chave); return `<li>${byId.has(u.dono) ? `<button type="button" data-bib-carta="${esc(u.dono)}">${esc(ownerLabel(u, byId))}</button>` : `<span>${esc(ownerLabel(u, byId))}</span>`}<small>${esc(onde)}</small></li>`; }).join('');
  return `<li class="bl-row">${thumb(e)}<div class="bl-main"><b>${esc(e.nome)}</b><small>${esc(e.id)} · ${esc(e.fonteNome || e.fonte)} · ${esc(ESTADOS[estadoOf(e)] || estadoOf(e))}</small></div>
    ${users.length ? `<details class="bl-use"><summary>${esc(resumo)}</summary><ul>${lista}</ul></details>` : `<span class="bl-none">${resumo}</span>`}
    <button type="button" data-an="test" data-fx="${esc(e.id)}">▶ Testar</button></li>`;
}
const PAGE = 60;
export function libraryRows({effects, anims, cards, filtro, categoryOf, momentName = k => k, limit = PAGE, fonteNome = f => f}) {
  const uso = usageMap(anims), byId = new Map(cards.map(c => [c.id, c])), list = filterEffects(effects, filtro, uso, cards, categoryOf);
  if (!list.length) return `<p class="bl-empty">Nenhum efeito com esses filtros. <button type="button" data-bib-limpar>Limpar filtros</button></p>`;
  return `<p class="hint" aria-live="polite">${list.length} de ${effects.length} efeitos.</p><ul class="bl-list">${list.slice(0, limit).map(e => row({...e, fonteNome: fonteNome(e.fonte)}, uso, byId, momentName)).join('')}</ul>${list.length > limit ? `<button type="button" data-bib-mais>Mostrar mais ${Math.min(PAGE, list.length - limit)}</button>` : ''}`;
}
export function bibliotecaSection({filtro, fontes, categorias, faccoes, momentos, rows}) {
  return `<section class="panel tl"><div class="tl-head"><h2>Biblioteca</h2><span class="tag">Testar não altera nada</span></div>
    <p class="hint">Busque por efeito, código, carta ou habilidade. O vínculo se troca em Por carta.</p>
    <div class="an-filters bl-filters"><input type="search" data-bib="q" value="${esc(filtro.q)}" placeholder="Efeito, código, carta ou habilidade" aria-label="Buscar na biblioteca">
      <select data-bib="categoria" aria-label="Categoria">${options(categorias, filtro.categoria, 'Toda categoria')}</select>
      <select data-bib="fonte" aria-label="Fonte">${options(fontes, filtro.fonte, 'Toda fonte')}</select>
      <select data-bib="faccao" aria-label="Facção">${options(faccoes, filtro.faccao, 'Toda facção')}</select>
      <select data-bib="gatilho" aria-label="Gatilho">${options(momentos, filtro.gatilho, 'Todo gatilho')}</select>
      <select data-bib="estado" aria-label="Status">${options(Object.entries(ESTADOS), filtro.estado, 'Todo status')}</select>
      <select data-bib="vinculo" aria-label="Vínculo">${options([['com', 'Com vínculo'], ['sem', 'Sem vínculo']], filtro.vinculo, 'Todo vínculo')}</select>
      <select data-bib="ordem" aria-label="Ordenar"><option value="nome" ${filtro.ordem !== 'uso' ? 'selected' : ''}>Ordem: nome</option><option value="uso" ${filtro.ordem === 'uso' ? 'selected' : ''}>Ordem: mais usados</option></select></div>
    <div id="bib-rows">${rows}</div></section>`;
}

// Números da Visão geral: cada um é contado dos dados reais, sem estimativa.
export function overview({effects, anims, cards, inventario = {}}) {
  const uso = usageMap(anims), comVinculo = effects.filter(e => uso[e.id]?.length).length;
  const donos = new Set(Object.values(uso).flat().map(u => u.dono)), porFaccao = {};
  for (const c of cards) { const f = c.faccao || 'Neutral'; (porFaccao[f] ??= {total: 0, com: 0}).total++; if (donos.has(c.id)) porFaccao[f].com++; }
  const quebrados = Object.keys(uso).filter(id => !effects.some(e => e.id === id));
  return {efeitos: effects.length, comVinculo, semVinculo: effects.length - comVinculo, cartas: cards.length, cartasCom: cards.filter(c => donos.has(c.id)).length, porFaccao, quebrados, rascunhos: effects.filter(e => ['rascunho', 'teste'].includes(e.estado)), resumo: inventario.resumo || {}};
}
const tile = (valor, nome, attrs = '') => `<button type="button" class="ov-tile" ${attrs}><b>${esc(valor)}</b><small>${esc(nome)}</small></button>`;
export function visaoSection({numeros: n, pub}) {
  const mudou = pub?.mudou ? pub.mudou.animacoes.length + pub.mudou.estudio.length : null;
  const pendencias = [
    ...n.quebrados.map(id => [`Vínculo aponta para efeito que não existe: ${id}`, 'data-bib-q="' + esc(id) + '"']),
    ...n.rascunhos.map(e => [`${e.nome}: ${ESTADOS[e.estado]}, ainda não pode ser escolhido nem publicado`, 'data-aba-ir="criador"']),
    ...(pub?.problemas || []).map(p => [`Impede publicar: ${p}`, 'data-aba-ir="publicacao"']),
    ...(pub?.erro ? [[pub.erro, 'data-aba-ir="publicacao"']] : []),
  ];
  return `<section class="panel tl"><div class="tl-head"><h2>Visão geral</h2>${pub?.versao != null ? `<span class="tag">Versão publicada: ${esc(pub.versao)}</span>` : ''}</div>
    <div class="ov-tiles">${tile(n.efeitos, 'efeitos na biblioteca', 'data-aba-ir="biblioteca"')}${tile(n.semVinculo, 'efeitos sem vínculo', 'data-bib-vinculo="sem"')}${tile(`${n.cartasCom} de ${n.cartas}`, 'cartas com animação própria', 'data-aba-ir="carta"')}${tile(n.resumo.total ?? '–', 'animações no inventário', 'data-aba-ir="todas"')}${tile(mudou ?? '–', 'mudanças ainda não publicadas', 'data-aba-ir="publicacao"')}</div>
    <h3>Pendências</h3>${pendencias.length ? `<ul class="an-inv">${pendencias.slice(0, 30).map(([t, attrs]) => `<li><div>${esc(t)}</div><button type="button" ${attrs}>Abrir</button></li>`).join('')}</ul>` : '<p class="hint">Nenhuma: nenhum vínculo quebrado, rascunho parado ou bloqueio de publicação.</p>'}
    <h3>Cartas com animação, por facção</h3><ul class="ov-faccoes">${Object.entries(n.porFaccao).sort(([a], [b]) => a.localeCompare(b)).map(([f, v]) => `<li><button type="button" data-carta-faccao="${esc(f)}"><span>${esc(f)}</span><b>${v.com} de ${v.total}</b><i style="--p:${v.total ? Math.round(v.com / v.total * 100) : 0}%" aria-hidden="true"></i></button></li>`).join('')}</ul></section>`;
}
