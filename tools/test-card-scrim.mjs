// Escuro só no topo e no rodapé, e nenhuma camada de moldura com preto embutido.
// node --test tools/test-card-scrim.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scrimCss, scrimStops} from '../shared/card-scrim.js';

const alphaAt = (stops, at) => {
  const next = stops.findIndex(([p]) => p >= at);
  if (next <= 0) return stops[Math.max(next, 0)][1];
  const [[p0, a0], [p1, a1]] = [stops[next - 1], stops[next]];
  return a0 + (a1 - a0) * (at - p0) / (p1 - p0);
};

test('área do personagem 100% visível, de 20% a 51%; forte atrás do texto', () => {
  const stops = scrimStops();
  for (const at of [0.2, 0.3, 0.45, 0.51]) assert.equal(alphaAt(stops, at), 0, `${at}`);
  assert.ok(alphaAt(stops, 0) >= 0.9);
  assert.ok(alphaAt(stops, 0.63) >= 0.75);
  assert.ok(alphaAt(stops, 0.8) >= 0.9);
  assert.ok(alphaAt(stops, 1) >= 0.9);
});

test('degradê some aos poucos: nenhum salto brusco entre paradas', () => {
  for (const stops of [scrimStops(), scrimStops(0.42)]) for (let i = 1; i < stops.length - 1; i++) {
    const rate = Math.abs(stops[i][1] - stops[i - 1][1]) / (stops[i][0] - stops[i - 1][0]);
    assert.ok(rate <= 10.5, `${stops[i][0]}: ${rate}`);
  }
});

test('o escuro acompanha o início do texto', () => {
  assert.ok(alphaAt(scrimStops(0.42), 0.42) >= 0.7);
  assert.equal(alphaAt(scrimStops(), 0.42), 0);
});

test('paradas crescentes e CSS válido', () => {
  for (const stops of [scrimStops(), scrimStops(0.42)]) for (let i = 1; i < stops.length; i++) assert.ok(stops[i][0] > stops[i - 1][0]);
  assert.match(scrimCss(), /^linear-gradient\(180deg,rgba\(0,0,0,0\.9\) 0%,.*rgba\(0,0,0,0\.9\) 100%\)$/);
});

test('templates e layouts não usam as camadas de preto embutido', () => {
  const dark = /frame_1|vignette|poseidon\/frame_2/;
  const {factions} = JSON.parse(readFileSync(new URL('../CARD-TEMPLATE/templates.json', import.meta.url)));
  for (const [name, pack] of Object.entries(factions)) assert.doesNotMatch(pack.frame.join(' '), dark, name);
  assert.doesNotMatch(readFileSync(new URL('../data/card-layouts.json', import.meta.url), 'utf8'), dark);
});
