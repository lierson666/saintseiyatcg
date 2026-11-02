// Lista do Card Forge: busca, filtros, fila de revisão e validade das propostas da auditoria V2.
// node --test tools/test-card-finder.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditOf, filterCards, reviewQueue} from '../card-forge/card-finder.js';
import {patentesDe} from '../shared/equipment-types.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const {cartas} = read('../data/cards.json');
const audit = read('../card-forge/equipment-audit-v2.json').cartas;
const ids = (list) => list.map((c) => c.id);

const cards = [
  {id: 'a-1', numero_carta: 1, nome_exibicao_en: 'PEGASUS SEIYA', nome_exibicao_pt: 'SEIYA DE PÉGASO', tipo: 'Devotee', faccao: 'Athena'},
  {id: 'h-1', numero_carta: 2, nome_exibicao_en: 'WYVERN SURPLICE', tipo: 'Equipment', faccao: 'Hades', subtipos: ['Surplice']},
  {id: 'h-2', numero_carta: 3, nome_exibicao_en: 'HARPY SURPLICE', tipo: 'Equipment', faccao: 'Hades', subtipos: ['Surplice'], patente_armadura: 'Celestial'},
];
const sample = {
  'h-1': {categoria: 'ARMOR', familia: 'SURPLICE', status: 'RECOMMENDED_VERIFY', patente: 'Judge', motivo: 'x'},
  'h-2': {categoria: 'ARMOR', familia: 'SURPLICE', status: 'REVIEW_REQUIRED', motivo: 'x'},
};

test('busca ignora acento e caixa, e cruza as palavras', () => {
  assert.deepEqual(ids(filterCards(cards, sample, {q: 'pegaso'})), ['a-1']);
  assert.deepEqual(ids(filterCards(cards, sample, {q: 'surplice wyvern'})), ['h-1']);
  assert.deepEqual(ids(filterCards(cards, sample, {q: 'zzz'})), []);
});

test('filtros combinam e a fila ignora carta com patente gravada', () => {
  assert.deepEqual(ids(filterCards(cards, sample, {faccao: 'Hades', classe: 'SURPLICE'})), ['h-1', 'h-2']);
  assert.deepEqual(ids(filterCards(cards, sample, {status: 'fila'})), ['h-1']);
  assert.deepEqual(ids(reviewQueue(cards, sample)), ['h-1']);
  assert.equal(auditOf(cards[2], sample).status, 'CONFIRMED_EXPORT');
  assert.equal(auditOf(cards[0], sample), null);
});

test('auditoria cobre todo Equipment, e nada além dele', () => {
  const equipment = cartas.filter((c) => c.tipo === 'Equipment').map((c) => c.id).sort();
  assert.deepEqual(Object.keys(audit).sort(), equipment);
});

test('toda patente proposta existe na família da carta e carta especial não tem proposta', () => {
  const byId = new Map(cartas.map((c) => [c.id, c]));
  for (const [id, a] of Object.entries(audit)) {
    if (a.patente) assert.ok(patentesDe(byId.get(id).subtipos).includes(a.patente), `${id}: ${a.patente}`);
    if (a.status === 'SPECIAL_NO_RANK') assert.equal(a.patente, undefined, id);
  }
});
