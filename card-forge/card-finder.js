// Lista de cartas do Card Forge: busca, filtros e fila de revisão da auditoria do Equipment System V2.
import {formatCardTypeLine} from '../shared/equipment-types.js';
import {printedKind} from '../shared/rules-policy.js';

export const AUDIT_STATUS = {CONFIRMED_EXPORT: 'Confirmada', RECOMMENDED_VERIFY: 'A conferir', REVIEW_REQUIRED: 'Pendente', SPECIAL_NO_RANK: 'Especial', CATEGORY_REVIEW: 'Categoria a revisar'};
const CLASSES = {CLOTH: 'Cloth', SCALE: 'Scale', SURPLICE: 'Surplice', WARPLATE: 'Warplate', MOONPLATE: 'Moonplate', STEEL_ARMOR: 'Steel', LUNAR_VESTMENT: 'Lunar Vestment', LIVING_ARMOR: 'Living Armor', OTHER_ARMOR: 'Outra armadura', WEAPON: 'Arma', OTHER_EQUIPMENT: 'Outro equipamento'};
const QUEUE = ['RECOMMENDED_VERIFY', 'REVIEW_REQUIRED'];
const QUEUE_FILTER = 'fila';

const fold = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// Patente gravada resolve a pendência: a fila se esvazia conforme o catálogo muda, sem outro arquivo de estado.
export function auditOf(card, audit) {
  const a = audit?.[card.id];
  if (!a) return null;
  return QUEUE.includes(a.status) && card.patente_armadura ? {...a, status: 'CONFIRMED_EXPORT'} : a;
}
export const reviewQueue = (cards, audit) => cards.filter((c) => QUEUE.includes(auditOf(c, audit)?.status));
const classOf = (card, audit) => audit?.[card.id]?.familia || audit?.[card.id]?.categoria || '';

export function filterCards(cards, audit, {q = '', faccao = '', tipo = '', classe = '', status = ''} = {}) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  return cards.filter((c) => {
    if (faccao && c.faccao !== faccao) return false;
    if (tipo && printedKind(c) !== tipo) return false;
    if (classe && classOf(c, audit) !== classe) return false;
    const st = auditOf(c, audit)?.status;
    if (status === QUEUE_FILTER ? !QUEUE.includes(st) : status && st !== status) return false;
    const hay = fold([c.id, c.numero_carta, c.nome_exibicao_en, c.nome_exibicao_pt, ...(c.subtipos || []), c.patente_armadura].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

const options = (label, pairs) => `<option value="">${label}</option>${pairs.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}`;

export function mountCardFinder(root, {cards, audit, current, pick}) {
  const values = (read) => [...new Set(cards().map(read).filter(Boolean))].sort().map((v) => [v, v]);
  root.innerHTML = `<input class="cf-search" name="cfBusca" type="search" placeholder="Nome, número, id ou subtipo" aria-label="Buscar carta">
    <div class="cf-filters">
      <label>Facção <select name="faccao">${options('Todas', values((c) => c.faccao))}</select></label>
      <label>Tipo <select name="tipo">${options('Todos', values(printedKind))}</select></label>
      <label>Equipment <select name="classe">${options('Todos', Object.entries(CLASSES))}</select></label>
      <label>Auditoria <select name="status">${options('Todos', [[QUEUE_FILTER, 'Fila de revisão'], ...Object.entries(AUDIT_STATUS)])}</select></label>
    </div>
    <div class="cf-bar"><output aria-live="polite"></output><button type="button" class="eq-chip" data-cf-review></button></div>
    <ul class="cf-list"></ul>`;
  const [search, list, count, review] = ['.cf-search', '.cf-list', 'output', '[data-cf-review]'].map((s) => root.querySelector(s));
  const field = (name) => root.querySelector(`select[name=${name}]`).value;

  function draw() {
    const all = cards(), found = filterCards(all, audit, {q: search.value, faccao: field('faccao'), tipo: field('tipo'), classe: field('classe'), status: field('status')}), now = current(), queue = reviewQueue(all, audit);
    count.textContent = `${found.length} de ${all.length} cartas`;
    review.textContent = `Revisar armaduras (${queue.length})`;
    review.hidden = !queue.length;
    list.innerHTML = found.length ? found.map((c) => {
      const st = auditOf(c, audit)?.status;
      return `<li><button type="button" class="cf-row" data-cf-id="${esc(c.id)}" aria-current="${c.id === now}"><b translate="no">${c.numero_carta ? `#${esc(c.numero_carta)} ` : ''}${esc(c.nome_exibicao_en)}</b><small translate="no">${esc(formatCardTypeLine(c))} · ${esc(c.faccao)}</small>${st && st !== 'CONFIRMED_EXPORT' ? `<em data-status="${st}">${esc(AUDIT_STATUS[st])}</em>` : ''}</button></li>`;
    }).join('') : '<li class="cf-empty">Nenhuma carta com esses filtros.</li>';
  }

  root.addEventListener('input', draw);
  root.addEventListener('click', (e) => {
    const row = e.target.closest('[data-cf-id]');
    if (row) return void pick(row.dataset.cfId);
    if (!e.target.closest('[data-cf-review]')) return;
    root.querySelector('select[name=status]').value = QUEUE_FILTER;
    draw();
    pick(reviewQueue(cards(), audit)[0].id);
  });
  root.closest('details')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary').focus(); }
  });
  root.closest('details')?.addEventListener('toggle', (e) => { if (e.currentTarget.open) search.focus(); });
  draw();
  return draw;
}
