// A URL da arte leve leva o hash de light.json: trocar a arte no Forge precisa furar o cache do navegador.
import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.fetch = async () => ({ok: true, json: async () => ({webp: ['a', 'b'], touch: [], thumb: ['a'], zoom: ['a'], rev: {a: 'abc12345'}})});
const {lightArt, upgradeArt} = await import('../shared/light-art.js');

test('arte com hash ganha ?v= e sem hash fica como antes', () => {
  assert.equal(lightArt('/card-forge/art-web/a.jpg'), '/card-forge/art-web/webp/a.webp?v=abc12345');
  assert.equal(lightArt('/card-forge/art-web/a.jpg', 'thumb'), '/card-forge/art-web/thumb/a.webp?v=abc12345');
  assert.equal(lightArt('/card-forge/art-web/b.jpg'), '/card-forge/art-web/webp/b.webp');
});

test('arte sem versão leve segue no JPG', () => {
  assert.equal(lightArt('/card-forge/art-web/z.jpg'), '/card-forge/art-web/z.jpg');
});

test('tela cheia reconhece URL com ?v= e pede o zoom com o mesmo hash', async () => {
  const asked = [];
  globalThis.Image = class { set src(value) { asked.push(value); } decode() { return Promise.resolve(); } };
  upgradeArt({querySelectorAll: () => [{src: 'https://x/card-forge/art-web/webp/a.webp?v=abc12345', isConnected: true}]});
  assert.deepEqual(asked, ['https://x/card-forge/art-web/zoom/a.webp?v=abc12345']);
});
