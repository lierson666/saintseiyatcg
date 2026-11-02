// Vinheta só em volta do personagem, sem degrau, e nenhuma camada de moldura com preto embutido.
// node --test tools/test-card-scrim.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardVignette, scrimCss} from '../shared/card-scrim.js';

// x e y em fração da carta.
const alphaAt = (v, x, y) => {
  const r = Math.hypot((x - v.cx) / v.rx, (y - v.cy) / v.ry), next = v.stops.findIndex(([at]) => at >= r);
  if (next < 0) return v.stops.at(-1)[1];
  if (next === 0) return v.stops[0][1];
  const [[p0, a0], [p1, a1]] = [v.stops[next - 1], v.stops[next]];
  return a0 + (a1 - a0) * (r - p0) / (p1 - p0);
};

test('personagem 100% visível no centro da carta', () => {
  const v = cardVignette();
  for (const y of [0.2, 0.3, 0.4, 0.5]) assert.equal(alphaAt(v, 0.5, y), 0, `${y}`);
  for (const x of [0.2, 0.5, 0.8]) assert.equal(alphaAt(v, x, 0.35), 0, `${x}`);
});

test('escuro nas bordas, forte atrás do texto e sutil nas laterais do personagem', () => {
  const v = cardVignette();
  assert.ok(alphaAt(v, 0.5, 0) >= 0.85);
  assert.ok(alphaAt(v, 0.5, 0.63) >= 0.7);
  assert.ok(alphaAt(v, 0.5, 0.8) >= 0.9);
  assert.ok(alphaAt(v, 0.5, 1) >= 0.9);
  const side = alphaAt(v, 0, v.cy);
  assert.ok(side > 0.1 && side < 0.45, `${side}`);
});

test('a vinheta acompanha o início do texto', () => {
  assert.ok(alphaAt(cardVignette(0.4), 0.5, 0.4) >= 0.7);
  assert.equal(alphaAt(cardVignette(), 0.5, 0.4), 0);
});

test('some aos poucos: nenhum salto brusco entre paradas', () => {
  for (const top of [0.63, 0.58, 0.4]) {
    const {stops} = cardVignette(top);
    for (let i = 2; i < stops.length; i++) {
      assert.ok(stops[i][0] > stops[i - 1][0]);
      assert.ok(stops[i][1] - stops[i - 1][1] <= 0.15, `${top} ${stops[i][0]}`);
    }
  }
});

test('CSS é um gradiente elíptico, não uma faixa reta', () => {
  assert.match(scrimCss(), /^radial-gradient\(ellipse [\d.]+% [\d.]+% at 50% [\d.]+%,rgba\(0,0,0,0\) 0%,.*rgba\(0,0,0,0\.9\) 100%\)$/);
});

test('templates e layouts não usam as camadas de preto embutido', () => {
  const dark = /frame_1|vignette|poseidon\/frame_2/;
  const {factions} = JSON.parse(readFileSync(new URL('../CARD-TEMPLATE/templates.json', import.meta.url)));
  for (const [name, pack] of Object.entries(factions)) assert.doesNotMatch(pack.frame.join(' '), dark, name);
  assert.doesNotMatch(readFileSync(new URL('../data/card-layouts.json', import.meta.url), 'utf8'), dark);
});
