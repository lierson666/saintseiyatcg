// Composer do Star Hill: edição de camadas, id sem sobrescrever e prévia em outra velocidade sem tocar no original.
import assert from 'node:assert/strict';
import test from 'node:test';
import {MAX_LAYERS, addLayer, atRate, duplicateLayer, fitTiming, moveLayer, removeLayer, slug, totalMs, uniqueId} from '../star-hill/composer-model.js';
import {createHistory} from '../shared/editor-history.js';

const comp = () => ({nome: 'C', camadas: [{tipo: 'carta', inicio: 0, duracao: 500, escala: 1.2}, {tipo: 'ui', inicio: 100, duracao: 300}, {tipo: 'audio', inicio: 200, duracao: 400, ativa: false}]});

test('duplicar cria cópia independente logo depois da original', () => {
  const c = comp();
  assert.equal(duplicateLayer(c, 0), 1);
  assert.equal(c.camadas.length, 4);
  c.camadas[1].escala = 9;
  assert.equal(c.camadas[0].escala, 1.2);
  assert.equal(duplicateLayer(c, 99), -1);
});

test('o limite de camadas do servidor vale para adicionar e duplicar', () => {
  const c = {nome: 'C', camadas: Array.from({length: MAX_LAYERS}, () => ({tipo: 'ui', inicio: 0, duracao: 1}))};
  assert.equal(addLayer(c, {tipo: 'ui'}), -1);
  assert.equal(duplicateLayer(c, 0), -1);
  assert.equal(c.camadas.length, MAX_LAYERS);
});

test('mover respeita as pontas e devolve a nova posição', () => {
  const c = comp();
  assert.equal(moveLayer(c, 0, -1), 0);
  assert.equal(moveLayer(c, 0, 1), 1);
  assert.deepEqual(c.camadas.map(l => l.tipo), ['ui', 'carta', 'audio']);
  assert.equal(moveLayer(c, 2, 1), 2);
});

test('remover escolhe a vizinha e avisa quando acabou', () => {
  const c = comp();
  assert.equal(removeLayer(c, 2), 1);
  assert.equal(removeLayer(c, 0), 0);
  assert.equal(removeLayer(c, 0), -1);
  assert.equal(removeLayer(c, 0), -1);
});

test('tempos ficam dentro da linha do tempo, com passo de 50 ms', () => {
  assert.deepEqual(fitTiming(-300, 0), {inicio: 0, duracao: 50});
  assert.deepEqual(fitTiming(5980, 900), {inicio: 5950, duracao: 50});
  assert.deepEqual(fitTiming(1020, 8000), {inicio: 1000, duracao: 5000});
});

test('nome repetido não sobrescreve composição existente', () => {
  assert.equal(slug('Golpe de Fênix!'), 'golpe-de-fenix');
  assert.equal(slug('!!!'), 'composicao');
  assert.equal(uniqueId('Golpe', ['outra']), 'golpe');
  assert.equal(uniqueId('Golpe', ['golpe', 'golpe-2']), 'golpe-3');
});

test('velocidade da prévia não altera a composição original', () => {
  const c = comp(), before = JSON.stringify(c), fast = atRate(c, 2);
  assert.equal(JSON.stringify(c), before);
  assert.equal(fast.camadas[0].duracao, 250);
  assert.equal(fast.camadas[1].inicio, 50);
  assert.equal(fast.camadas[0].velocidade, 2);
  assert.equal(atRate(c, 1), c);
  assert.equal(atRate({camadas: [{inicio: 0, duracao: 1, velocidade: 4}]}, 2).camadas[0].velocidade, 4);
});

test('duração total ignora camada desligada', () => {
  assert.equal(totalMs(comp()), 500);
  assert.equal(totalMs(null), 0);
});

test('desfazer e refazer voltam ao estado exato da composição', () => {
  const c = comp(), history = createHistory(c);
  duplicateLayer(c, 0); history.record(c);
  moveLayer(c, 1, 1); history.record(c);
  assert.equal(history.undo().camadas.length, 4);
  assert.equal(history.undo().camadas.length, 3);
  assert.equal(history.undo(), null);
  assert.equal(history.redo().camadas.length, 4);
});
