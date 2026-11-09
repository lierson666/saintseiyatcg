// Filtro do Codex (Cosmo Hub 2.0, P1): estado na URL (#/codex/cards?f=Athena&q=seiya…) para o filtro sobreviver a
// navegação, recarga e link compartilhado. Só lê o registro canônico (data/registry); nenhuma base de cartas paralela.
export const KEYS = {q: 'q', faction: 'f', type: 't', rarity: 'r', cost: 'c', keyword: 'k', own: 'o', sort: 's', dir: 'd', view: 'v'}; // own: só na Coleção (owned | missing)

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

// Busca no estilo Scryfall: palavras soltas procuram no nome, texto, id, palavras-chave e subtipos; filtros chave:valor
// (EN ou PT) combinam com E; "-" na frente nega. Ex.: f:athena c>=5 t:devoto k:guardian o:"Cosmo Base" -r:common
const FIELDS = {
  f: 'faction', faction: 'faction', faccao: 'faction', 'facção': 'faction', g: 'faction', god: 'faction', deus: 'faction',
  t: 'type', type: 'type', tipo: 'type', r: 'rarity', rarity: 'rarity', raridade: 'rarity',
  c: 'cost', cost: 'cost', custo: 'cost', mv: 'cost', atk: 'attack', atq: 'attack', power: 'attack', hp: 'hp', vida: 'hp',
  k: 'keyword', kw: 'keyword', keyword: 'keyword', o: 'text', oracle: 'text', texto: 'text', is: 'is', n: 'name', name: 'name', nome: 'name',
};
const TYPES = {devotee: 'Devotee', devoto: 'Devotee', spell: 'Spell', magia: 'Spell', momento: 'Spell', tecnica: 'Spell', equipment: 'Equipment', equipamento: 'Equipment', domain: 'Domain', dominio: 'Domain', god: 'God', deus: 'God'};
const RARITIES = {c: 'Common', common: 'Common', comum: 'Common', u: 'Uncommon', uncommon: 'Uncommon', incomum: 'Uncommon', l: 'Legendary', legendary: 'Legendary', lendaria: 'Legendary', rare: 'Legendary', d: 'Divine', divine: 'Divine', divina: 'Divine'};
const NUMERIC = new Set(['cost', 'attack', 'hp']);
export function parseQuery(q) {
  const out = [], re = /(-?)([a-zçãéí]+)(:|>=|<=|!=|>|<|=)("[^"]*"|\S+)|(-?)("[^"]*"|\S+)/gi;
  for (const m of String(q || '').matchAll(re)) {
    const field = m[2] && FIELDS[fold(m[2])];
    if (field) out.push({field, op: m[3] === ':' ? '=' : m[3], value: m[4].replace(/^"|"$/g, ''), not: m[1] === '-'});
    else { const raw = m[0].replace(/^-/, ''), neg = m[0].startsWith('-') && raw.length > 0; out.push({field: 'any', op: '=', value: raw.replace(/^"|"$/g, ''), not: neg}); }
  }
  return out;
}
const cmp = (a, op, b) => a != null && ({'=': a === b, '!=': a !== b, '>': a > b, '<': a < b, '>=': a >= b, '<=': a <= b})[op];
function test(c, t) {
  const v = fold(t.value);
  let ok;
  if (NUMERIC.has(t.field)) ok = cmp(c[t.field] == null ? null : Number(c[t.field]), t.op, Number(t.value));
  else if (t.field === 'faction') ok = fold(c.faction).startsWith(v);
  else if (t.field === 'type') ok = (TYPES[v] ? c.type === TYPES[v] : fold(c.type) === v) || (c.subtypes || []).some(x => fold(x).includes(v));
  else if (t.field === 'rarity') ok = c.rarity === (RARITIES[v] || t.value);
  else if (t.field === 'keyword') ok = (c.keywords || []).some(k => fold(k).includes(v));
  else if (t.field === 'text') ok = fold([...(c.abilities || []), ...(c.abilities_pt || []), c.awaken_text, c.ultimate].join(' ')).includes(v);
  else if (t.field === 'name') ok = fold([c.name, c.name_pt].join(' ')).includes(v);
  else if (t.field === 'is') ok = v === 'cosmoble' ? !!c.cosmoble : false;
  else ok = fold([c.name, c.name_pt, c.id, ...(c.abilities || []), ...(c.abilities_pt || []), ...(c.keywords || []), ...(c.subtypes || [])].join(' ')).includes(v);
  return t.not ? !ok : ok;
}
// Frase do resultado, como o Scryfall ("where the cost is ≥ 5 and the faction is Athena").
const OPS = {'=': 'is', '!=': 'is not', '>': 'is >', '<': 'is <', '>=': 'is ≥', '<=': 'is ≤'};
const LABEL = {faction: 'the faction', type: 'the type', rarity: 'the rarity', cost: 'the cost', attack: 'ATK', hp: 'HP', keyword: 'a keyword', text: 'the text', name: 'the name', is: 'it', any: 'name or text'};
const PT = {ops: {'=': 'é', '!=': 'não é', '>': 'é >', '<': 'é <', '>=': 'é ≥', '<=': 'é ≤'}, label: {faction: 'a facção', type: 'o tipo', rarity: 'a raridade', cost: 'o custo', attack: 'o ATQ', hp: 'a Vida', keyword: 'uma palavra-chave', text: 'o texto', name: 'o nome', is: 'ela', any: 'nome ou texto'}, has: 'inclui', hasnt: 'não inclui', and: ' e '};
export function describe(q, lang = 'en') {
  const pt = lang === 'pt', ops = pt ? PT.ops : OPS, label = pt ? PT.label : LABEL;
  return parseQuery(q).map(t => t.field === 'any' || t.field === 'text' || t.field === 'name' || t.field === 'keyword'
    ? `${label[t.field]} ${t.not ? (pt ? PT.hasnt : 'does not include') : (pt ? PT.has : 'includes')} “${t.value}”`
    : `${label[t.field]} ${t.not ? (pt ? 'não é' : 'is not') : ops[t.op]} ${t.value}`).join(pt ? PT.and : ' and ');
}

export function filterCatalog(cards, f) {
  const terms = parseQuery(f.q);
  return cards.filter(c => c.publication !== 'cut'
    && terms.every(t => test(c, t))
    && (!f.faction || c.faction === f.faction) && (!f.type || c.type === f.type) && (!f.rarity || c.rarity === f.rarity)
    && (f.cost === '' || f.cost == null || (f.cost === '7+' ? Number(c.cost) >= 7 : c.cost === Number(f.cost)))
    && (!f.keyword || (c.keywords || []).includes(f.keyword)));
}

// Coleção (P4): só o catálogo de cartas que o jogo dá (booster), com o filtro de posse.
export function filterCollection(cards, f, pool, qty) {
  return filterCatalog(cards.filter(c => pool.has(c.id)), f).filter(c => !f.own || (f.own === 'owned') === qty(c.id) > 0);
}

// Ordem do resultado (nome, custo, ATK, HP, raridade, número), como o "sorted by" do Scryfall.
const RANK = {Common: 1, Uncommon: 2, Legendary: 3, Divine: 4};
export function sortCards(list, sort = 'name', dir = '', nameOf = c => c.name) {
  const key = {cost: c => Number(c.cost ?? -1), atk: c => Number(c.attack ?? -1), hp: c => Number(c.hp ?? -1), rarity: c => RANK[c.rarity] || 0, number: c => Number(c.number || 0)}[sort];
  const out = [...list].sort((a, b) => (key ? key(a) - key(b) : 0) || String(nameOf(a)).localeCompare(String(nameOf(b))));
  return dir === 'desc' ? out.reverse() : out;
}
