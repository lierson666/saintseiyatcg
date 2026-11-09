// Filtro do Codex (Cosmo Hub 2.0, P1): estado na URL (#/codex/cards?f=Athena&q=seiya…) para o filtro sobreviver a
// navegação, recarga e link compartilhado. Só lê o registro canônico (data/registry); nenhuma base de cartas paralela.
export const KEYS = {q: 'q', faction: 'f', type: 't', rarity: 'r', cost: 'c', keyword: 'k'};

export function readFilters(search) {
  const p = new URLSearchParams(search || '');
  return Object.fromEntries(Object.entries(KEYS).map(([name, key]) => [name, p.get(key) || '']));
}

export function filtersQuery(f) {
  const p = new URLSearchParams();
  for (const [name, key] of Object.entries(KEYS)) if (f[name]) p.set(key, f[name]);
  return p.toString();
}

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterCatalog(cards, f) {
  const term = fold(f.q).trim();
  return cards.filter(c => c.publication !== 'cut'
    && (!term || fold([c.name, c.name_pt, c.id, ...(c.abilities || []), ...(c.keywords || []), ...(c.subtypes || [])].join(' ')).includes(term))
    && (!f.faction || c.faction === f.faction) && (!f.type || c.type === f.type) && (!f.rarity || c.rarity === f.rarity)
    && (f.cost === '' || f.cost == null || (f.cost === '7+' ? Number(c.cost) >= 7 : c.cost === Number(f.cost)))
    && (!f.keyword || (c.keywords || []).includes(f.keyword)));
}
