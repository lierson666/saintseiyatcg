// Momentos do jogo: a lista cobre tudo o que o jogo toca e a busca acha o que o autor procura.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANIM_MOMENTS} from '../playtest/divine/pixel-vfx.js';
import {CENARIOS} from '../star-hill/arena-model.js';
import {MOMENTOS_JOGO, filtraMomentos} from '../star-hill/momentos-model.js';

const linhas = MOMENTOS_JOGO.flatMap(g => g.linhas);
const editor = readFileSync(new URL('../star-hill/telas-editor.js', import.meta.url), 'utf8');
const telas = JSON.parse(readFileSync(new URL('../data/olympus-telas.json', import.meta.url)));

test('toda animação do jogo tem uma linha, e nenhuma aponta para momento que não existe', () => {
  const fx = linhas.filter(l => l.fx).map(l => l.fx);
  assert.deepEqual([...new Set(fx)].sort(), ANIM_MOMENTS.map(([k]) => k).sort());
  assert.equal(new Set(fx).size, fx.length, 'cada efeito em uma linha só');
});
test('todo som do duelo tem uma linha', () => {
  const duelo = editor.slice(editor.indexOf('const DUELO'), editor.indexOf('// Padrão por facção'));
  const sons = new Set(linhas.map(l => l.som));
  for (const [, som] of duelo.matchAll(/som: '(\w+)'/g)) assert.ok(sons.has(som), som);
});
test('grupo e cenário existem de verdade', () => {
  for (const l of linhas) {
    if (l.grupo) assert.ok(telas.animacoes[l.grupo], l.grupo);
    if (l.cena) assert.ok(CENARIOS.some(c => c.id === l.cena), l.cena);
  }
});
test('busca acha a entrada do Devotee por vários caminhos, sem acento e sem caixa', () => {
  for (const q of ['entra em campo', 'DEVOTEE ENTRA', 'campo']) assert.ok(filtraMomentos(q).flatMap(g => g.linhas).some(l => l.fx === 'entrada'), q);
  assert.ok(filtraMomentos('TÁRTARUS').flatMap(g => g.linhas).some(l => l.fx === 'retorno'));
  assert.deepEqual(filtraMomentos('xyz'), []);
  assert.equal(filtraMomentos('').flatMap(g => g.linhas).length, linhas.length);
});
