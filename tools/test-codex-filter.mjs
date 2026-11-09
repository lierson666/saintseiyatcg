// node --test tools/test-codex-filter.mjs
// Filtro do Codex do Cosmo Hub (cosmohub/codex-filter.js): estado na URL e busca no registro canônico.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFilters, filtersQuery, filterCatalog} from '../cosmohub/codex-filter.js';

const index = JSON.parse(readFileSync(new URL('../data/registry/index.json', import.meta.url)));
const cards = JSON.parse(readFileSync(new URL(`../data/registry/cards-${index.current.catalog}.json`, import.meta.url)));
const none = readFilters('');

test('sem filtro mostra o catálogo inteiro, menos cartas cortadas', () => {
  assert.equal(filterCatalog(cards, none).length, cards.filter(c => c.publication !== 'cut').length);
  assert.ok(filterCatalog(cards, none).length > 600);
});

test('filtros vão e voltam da URL', () => {
  const f = {...none, q: 'seiya', faction: 'Athena', cost: '7+', keyword: 'Guardian'};
  assert.deepEqual(readFilters(filtersQuery(f)), f);
  assert.equal(filtersQuery(none), '');
});

test('busca ignora acento e maiúscula; facção, custo 7+ e keyword combinam', () => {
  assert.ok(filterCatalog(cards, {...none, q: 'PEGASO'}).some(c => c.id === 'athena-v6-001'));
  const big = filterCatalog(cards, {...none, faction: 'Hades', cost: '7+'});
  assert.ok(big.length && big.every(c => c.faction === 'Hades' && c.cost >= 7));
  assert.ok(filterCatalog(cards, {...none, keyword: 'Guardian'}).every(c => c.keywords.includes('Guardian')));
});
