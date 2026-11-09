// node --test tools/test-codex-filter.mjs
// Filtro do Codex do Cosmo Hub (cosmohub/codex-filter.js): estado na URL e busca no registro canônico.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFilters, filtersQuery, filterCatalog, filterCollection, parseQuery, describe, sortCards} from '../cosmohub/codex-filter.js';

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

test('coleção: só o catálogo do jogo, com filtro tenho/faltam', () => {
  const pool = new Set(['athena-v6-001', 'athena-v6-003']), have = {'athena-v6-001': 2}, qty = id => have[id] || 0;
  assert.deepEqual(filterCollection(cards, none, pool, qty).map(c => c.id).sort(), ['athena-v6-001', 'athena-v6-003']);
  assert.deepEqual(filterCollection(cards, {...none, own: 'owned'}, pool, qty).map(c => c.id), ['athena-v6-001']);
  assert.ok(!filterCollection(cards, {...none, own: 'missing'}, pool, qty).some(c => c.id === 'athena-v6-001'));
  assert.equal(readFilters('o=missing').own, 'missing');
});

test('sintaxe estilo Scryfall: chave:valor em EN ou PT, comparação e negação', () => {
  const athenaBig = filterCatalog(cards, {...none, q: 'f:athena c>=5'});
  assert.ok(athenaBig.length && athenaBig.every(c => c.faction === 'Athena' && c.cost >= 5));
  assert.deepEqual(filterCatalog(cards, {...none, q: 'faccao:athena custo>=5'}).map(c => c.id), athenaBig.map(c => c.id));
  assert.ok(filterCatalog(cards, {...none, q: 't:devoto -r:common'}).every(c => c.type === 'Devotee' && c.rarity !== 'Common'));
  assert.ok(filterCatalog(cards, {...none, q: 'atk>=4 hp<=2'}).every(c => c.attack >= 4 && c.hp <= 2));
  assert.ok(filterCatalog(cards, {...none, q: 'n:seiya'}).some(c => c.id === 'athena-v6-001'));
  assert.equal(parseQuery('o:"cosmo base"')[0].value, 'cosmo base');
  assert.equal(describe('f:athena c>=5'), 'the faction is athena and the cost is ≥ 5');
});

test('ordem por custo e por nome, crescente e decrescente', () => {
  const list = filterCatalog(cards, {...none, q: 'f:hades t:devoto'});
  const up = sortCards(list, 'cost'), down = sortCards(list, 'cost', 'desc');
  assert.ok(up[0].cost <= up.at(-1).cost && down[0].cost >= down.at(-1).cost);
});
