// Arena de testes: o que cada cenário toca e a comparação entre rascunho e versão publicada.
import assert from 'node:assert/strict';
import test from 'node:test';
import {CENARIOS, abilityNames, differs, resolveCenario} from '../star-hill/arena-model.js';

const a = {id: 'c1', faccao: 'Hades', raridade: 'Legendary', habilidades_en: ['Lethargy — Text', 'Other — Text']}, b = {id: 'c2', faccao: 'Athena'};
const anims = {padrao: {golpe: 'slash', dano: 'impact', morte: null}, 'faccao-hades': {entrada: 'dark'}, c1: {golpe: 'vx-1', linhas: ['vx-2', null], declarar: false}, c2: {strike: 'ice'}};
const studio = {cartas: {c1: {idle: 'cosmic-aura', forca: .5}}, raridades: {Legendary: 'divine-holo'}};
const row = (id, opts = {}) => resolveCenario(id, {anims, studio, a, b, ...opts});

test('segue a ordem do jogo: carta, facção, padrão', () => {
  assert.deepEqual(row('entrada'), [{momento: 'entrada', valor: 'dark', origem: 'Facção'}]);
  assert.deepEqual(row('dano'), [{momento: 'dano', valor: 'impact', origem: 'Padrão'}]);
  const ataque = row('ataque');
  assert.equal(ataque.find(r => r.momento === 'golpe').origem, 'Carta');
  assert.equal(ataque.find(r => r.momento === 'strike').valor, 'ice', 'quem recebe o Strike é a carta B');
});
test('momento desligado e sem vínculo são coisas diferentes', () => {
  assert.equal(row('ataque').find(r => r.momento === 'declarar').valor, false);
  assert.equal(row('morte')[0].valor, null);
});
test('habilidade usa a linha escolhida', () => {
  assert.deepEqual(abilityNames(a), ['Lethargy', 'Other']);
  assert.deepEqual(row('habilidade', {ability: 'Lethargy'}), [{momento: 'habilidade', valor: 'vx-2', origem: 'Linha da carta'}]);
  assert.equal(row('habilidade', {ability: 'Other'})[0].valor, null);
});
test('repouso, inspeção e coleção usam o mesmo cálculo da carta real', () => {
  assert.deepEqual(row('repouso'), [{momento: 'idle', valor: 'cosmic-aura', origem: 'Carta'}]);
  assert.equal(row('inspecao')[0].valor, null);
  assert.equal(row('colecao')[0].origem, 'Raridade');
  assert.equal(row('colecao')[0].valor, 'holo-foil');
});
test('compara rascunho com a publicada', () => {
  const draft = row('ataque'), published = resolveCenario('ataque', {anims: {padrao: {golpe: 'slash'}}, studio: {}, a, b});
  assert.equal(differs(draft, draft), false);
  assert.equal(differs(draft, published), true);
});
test('versão publicada vazia não quebra nenhum cenário', () => {
  for (const c of CENARIOS) assert.ok(Array.isArray(resolveCenario(c.id, {anims: {}, studio: {}, a, b})), c.id);
});
