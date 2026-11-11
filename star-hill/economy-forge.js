// ECONOMY FORGE (autor, 11/11/2026): preços, recompensas e chances da economia no STAR HILL.
// Rascunho (data/economy.json) → validação e diff → Publicar (sanctuary-api/economy.json, versão nova) → Rollback.
// Os campos vêm de sanctuary-api/economy.py (GROUPS), a mesma regra que o servidor do jogo usa ao iniciar.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const get = (o, path) => path.split('.').reduce((n, k) => n?.[k], o);
const set = (o, path, v) => { const k = path.split('.'), last = k.pop(); k.reduce((n, p) => n[p], o)[last] = v; };
const fmt = n => Number(n).toLocaleString('pt-BR');
let state, draft, dirty = false;

const brl = coins => (coins / draft.coins_per_brl).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const bundlePrice = b => Math.floor(draft.booster_price * b.qty * (100 - b.off) / 100);

function header(root) {
  const pub = state.publicado, tag = dirty ? 'DRAFT · não salvo' : state.estado === 'draft' ? 'DRAFT' : 'PUBLISHED';
  root.querySelector('#eco-head').innerHTML = `<h2>ECONOMY FORGE <span class="tag ${tag === 'PUBLISHED' ? 'ach-live' : 'ach-draft'}">${tag}</span></h2>
    <p class="hint">Preços da loja, recompensas e chances do booster. O servidor do jogo lê a versão publicada quando inicia; reinicie o sanctuary-api depois de publicar. Deploy continua separado.</p>
    <div class="ach-stats"><span>${pub ? `No ar: v${pub.version} · ${esc(pub.published_at)}${pub.rollback_of ? ` · rollback da v${pub.rollback_of}` : ''}` : 'Nunca publicado (o servidor usa os valores de docs/economia.md)'}</span></div>`;
}

function summary(root) {
  const d = draft, god = k => d.cosmetics[k] * d.god_multiplier;
  root.querySelector('#eco-summary').innerHTML = `<h3>Resumo</h3><ul class="eco-sum">
    ${d.bundles.map(b => `<li>${b.qty} booster${b.qty > 1 ? 's' : ''}: <b>${fmt(bundlePrice(b))}</b> coins${b.off ? ` (−${b.off}%)` : ''} · ${brl(bundlePrice(b))}</li>`).join('')}
    <li>Avatar ${fmt(d.cosmetics.avatar)} · Sleeve ${fmt(d.cosmetics.sleeve)} · Moeda ${fmt(d.cosmetics.coin)}; Deus: sleeve ${fmt(god('sleeve'))}, moeda ${fmt(god('coin'))}, avatar grátis</li>
    <li>Criar: ${['Common', 'Uncommon', 'Legendary', 'Divine'].map(r => `${r} ${fmt(d.craft_coins[r])} (${brl(d.craft_coins[r])})`).join(' · ')}</li>
    <li>Vitórias online por dia: até <b>${fmt(d.win_coins.reduce((a, b) => a + b, 0))}</b> coins</li></ul>`;
}

function fields(root) {
  root.querySelector('#eco-fields').innerHTML = state.grupos.map(g => `<fieldset class="eco-group"><legend>${esc(g.nome)}</legend><div class="ach-fields">
    ${g.campos.map(c => `<label class="field"><span>${esc(c.label)}</span><input type="number" step="1" min="${c.min}" max="${c.max}" data-eco="${esc(c.path)}" value="${get(draft, c.path)}"></label>`).join('')}
    </div></fieldset>`).join('');
}

function review(root) {
  const v = x => x === null || x === undefined ? '—' : esc(x);
  root.querySelector('#eco-review').innerHTML = `<h3>Validação</h3>${state.erros.length ? `<ul class="ach-errors">${state.erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : '<p class="hint">Sem erros no rascunho salvo.</p>'}
    <h3>Diferenças para a versão no ar ${state.diff.length ? `(${state.diff.length})` : ''}</h3>
    ${state.diff.length ? `<table class="ach-diff"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${state.diff.map(d => `<tr><td>${esc(d.label)}</td><td>${v(d.before)}</td><td>${v(d.after)}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Rascunho igual à versão no ar.</p>'}
    <h3>Versões publicadas</h3>${state.versoes.length ? `<ol class="ach-versions">${state.versoes.map(x => `<li><b>v${x.version}</b> · ${esc(x.published_at)}${x.rollback_of ? ` · rollback da v${x.rollback_of}` : ''}${state.publicado?.version === x.version ? ' · <span class="tag">no ar</span>' : ` <button data-rollback="${x.version}">Voltar para esta</button>`}</li>`).join('')}</ol>` : '<p class="hint">Nenhuma versão publicada ainda.</p>'}`;
}

function actions(root) {
  root.querySelector('#eco-save').disabled = !dirty;
  root.querySelector('#eco-publish').disabled = dirty || state.estado !== 'draft' || state.erros.length > 0;
}
function paint(root) { header(root); fields(root); summary(root); review(root); actions(root); }
async function reload(api) { state = await api('economy'); draft = structuredClone(state.rascunho); dirty = false; }
const css = href => document.querySelector(`link[href*="${href.split('?')[0].split('/').pop()}"]`) || document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href}));

export async function mountEconomy(root, {notice, api}) {
  if (!state) await reload(api);
  css('./achievements-forge.css?v=20261111-ach1');
  css('./economy-forge.css?v=20261111-eco1');
  root.innerHTML = `<section class="panel"><div id="eco-head"></div><div class="eco-workspace"><div id="eco-fields"></div><aside id="eco-summary" class="eco-summary"></aside></div>
    <div class="actions"><button class="primary" id="eco-save">Salvar rascunho</button><button id="eco-publish" title="Publica o rascunho salvo como versão nova para o servidor do jogo (local; deploy é outra etapa)">Publicar versão</button><button id="eco-reset">Descartar alterações</button></div>
    <div id="eco-review" class="ach-review"></div></section>`;
  paint(root);
  const guard = fn => async (...args) => { try { await fn(...args); } catch (e) { notice(e.message); } };
  root.querySelector('#eco-fields').oninput = e => {
    const path = e.target.dataset.eco; if (!path) return;
    set(draft, path, e.target.value === '' ? null : Number(e.target.value));
    dirty = true; header(root); actions(root);
    if (e.target.validity.valid && e.target.value !== '') summary(root);
  };
  root.querySelector('#eco-save').onclick = guard(async () => {
    state = await api('economy', {revisao: state.revisao, conteudo: draft}); draft = structuredClone(state.rascunho); dirty = false;
    notice('Rascunho salvo.', true); paint(root);
  });
  root.querySelector('#eco-publish').onclick = guard(async () => {
    if (!confirm(`Publicar o rascunho como v${(state.publicado?.version || 0) + 1}? O servidor do jogo usa esta versão quando reiniciar. Deploy continua separado.`)) return;
    state = await api('economy/publicar', {revisao: state.revisao}); draft = structuredClone(state.rascunho);
    notice(`Versão v${state.publicado.version} publicada.`, true); paint(root);
  });
  root.querySelector('#eco-reset').onclick = guard(async () => { if (dirty && !confirm('Descartar as alterações ainda não salvas?')) return; await reload(api); paint(root); });
  root.querySelector('#eco-review').onclick = guard(async e => {
    const b = e.target.closest('[data-rollback]'); if (!b) return;
    if (dirty) return notice('Salve ou descarte o rascunho antes de voltar uma versão.');
    if (!confirm(`Publicar de novo o conteúdo da v${b.dataset.rollback}? Vira uma versão nova; o histórico fica.`)) return;
    state = await api('economy/rollback', {versao: Number(b.dataset.rollback)}); draft = structuredClone(state.rascunho);
    notice(`Rollback publicado como v${state.publicado.version}.`, true); paint(root);
  });
}
