// Golpes em pixel art: cada receita desenha algo e termina sozinha; os dados do gestor só apontam para efeitos que existem.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES, EFFECTS, ANIM_MOMENTS, MAX_LIFE, animFor, rampOf, effectFiles, sheetFx} from '../playtest/divine/pixel-vfx.js';

const geo = {x: 640, y: 300, top: 180, bottom: 420, w: 170, h: 240, from: [200, 500], s: 1, color: '#ffcd64', power: .5, strength: 1};
const W = 640, H = 360;

for (const [name, recipe] of Object.entries(RECIPES)) {
  test(`receita ${name}: desenha e termina`, async () => {
    const [file, options] = recipe(geo);
    const {default: make} = await import(`../playtest/divine/vendor/sprite-fusion/${file}.js`);
    const fx = make({...options, seed: 7}), frame = {w: W, h: H, ox: 0, oy: 0, color: new Uint32Array(W * H), light: new Uint32Array(W * H)};
    const weather = typeof fx.stop === 'function'; // clima não termina sozinho: pixel-vfx.js tira da tela em MAX_LIFE
    let painted = false, t = 0;
    for (; t < (weather ? MAX_LIFE : 12) && !fx.done(); t += 1 / 30) {
      fx.update(1 / 30);
      frame.color.fill(0); frame.light.fill(0);
      fx.draw(frame, 'back'); fx.draw(frame, 'front');
      painted ||= frame.color.some(Boolean) || frame.light.some(Boolean);
    }
    assert.ok(painted, 'nada na tela');
    assert.ok(weather || fx.done(), `não terminou em ${t.toFixed(1)} s`);
  });
}

test('quem manda: linha, carta, facção, padrão; false desliga', () => {
  const data = {padrao: {golpe: 'slash', habilidade: 'heal'}, 'faccao-ares': {golpe: 'fire'}, c1: {golpe: 'ice', linhas: ['poison', null, false]}, c2: {golpe: false, linhas: []}};
  assert.equal(animFor(data, 'golpe', {id: 'c1', faction: 'ares'}), 'ice');
  assert.equal(animFor(data, 'golpe', {id: 'x', faction: 'ares'}), 'fire');
  assert.equal(animFor(data, 'golpe', {id: 'x', faction: 'hades'}), 'slash');
  assert.equal(animFor(data, 'golpe', {id: 'x', faction: 'hades', own: true}), null);
  assert.equal(animFor(data, 'golpe', {id: 'c2', faction: 'ares'}), false);
  assert.equal(animFor(data, 'habilidade', {id: 'c1', line: 0}), 'poison');
  assert.equal(animFor(data, 'habilidade', {id: 'c1', line: 1}), 'heal');
  assert.equal(animFor(data, 'habilidade', {id: 'c1', line: 2}), false);
  assert.equal(animFor(null, 'golpe', {id: 'c1'}), null);
});

test('data/card-animations.json: cada escolha é um efeito e um momento conhecidos', () => {
  const data = JSON.parse(readFileSync(new URL('../data/card-animations.json', import.meta.url))), builtIn = EFFECTS.map(([id]) => id), catalog = JSON.parse(readFileSync(new URL('../data/vfx-catalog.json', import.meta.url))), known = new Set([...builtIn, ...catalog.efeitos.map(e => e.id)]), ids = {has: v => known.has(v) || /^(shader|lottie|comp):/.test(v)}, keys = new Set(ANIM_MOMENTS.map(([k]) => k));
  assert.deepEqual([...builtIn].sort(), Object.keys(RECIPES).sort());
  for (const [id, entry] of Object.entries(data)) {
    if (id === 'efeitos') { for (const k of Object.keys(entry)) assert.ok(ids.has(k), k); continue; }
    for (const [k, v] of Object.entries(entry)) {
      if (k === 'linhas') { for (const l of v) assert.ok(l == null || l === false || ids.has(l), `${id} ${l}`); continue; }
      assert.ok(keys.has(k), `${id}.${k}`);
      assert.ok(v == null || v === false || ids.has(v), `${id}.${k}=${v}`);
    }
  }
});

test('sprite sheet do catálogo: troca de quadro, recorta na tela e termina; em loop segue até o limite do jogo', () => {
  const red = 0xff0000ff, blue = 0xffff0000, s = {px: new Uint32Array([red, red, blue, blue]), sw: 4, w: 2, h: 1, cols: 2, quadros: 2, fps: 10, loop: false};
  const g = {x: 8, y: 8, h: 4}, frame = {w: 8, h: 8, ox: 0, oy: 0, color: new Uint32Array(64), light: new Uint32Array(64)}, fx = sheetFx(s, g);
  const color = () => { frame.color.fill(0); fx.draw(frame, 'back'); assert.ok(frame.color.every(v => !v), 'só desenha na frente'); fx.draw(frame, 'front'); return new Set(frame.color); };
  assert.ok(color().has(red));
  fx.update(.11);
  assert.ok(color().has(blue));
  fx.update(.11);
  assert.ok(fx.done());
  const big = sheetFx({...s, loop: true}, {x: 0, y: 0, h: 400});
  big.update(99);
  big.draw(frame, 'front'); // maior que a tela e fora dela: não pode escrever fora do buffer
  assert.equal(frame.color.length, 64);
  assert.ok(!big.done());
});

test('rampOf aceita hex e rgb(), do claro ao escuro', () => {
  assert.equal(rampOf('#ffcd64').length, 7);
  assert.deepEqual(rampOf('rgb(255, 205, 100)'), rampOf('#ffcd64'));
  assert.equal(rampOf('#000000')[0], 0xffffffff);
  assert.ok(effectFiles().includes('holy-light'));
});
