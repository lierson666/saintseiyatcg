// VFX Forge V3: regras puras (perfis, fallback, vínculos) e dados. O quadro em si é conferido no navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {SHADERS, HOLO, LOTTIES, FACTION_PRESETS, CATEGORIES, LAYER_TYPES, PROFILES, MAX_COMPOSITION_MS, profileFor, stepDown, shaderOf, holoOf, isNewFx, asComposition, planLayers, cardFxFor} from '../shared/vfx/presets.js';

const studio = JSON.parse(readFileSync(new URL('../data/vfx-studio.json', import.meta.url)));
const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url))).cartas;

test('os 16 efeitos pedidos existem, com modo de baixo custo', () => {
  for (const id of ['glow', 'bloom', 'holo-foil', 'rainbow-prism', 'water', 'heat', 'cosmic-aura', 'energy-pulse', 'chromatic', 'dissolve', 'lightning', 'divine-light', 'shadow-corruption', 'refraction', 'animated-noise', 'starfield'])
    assert.equal(typeof shaderOf(id)?.modo, 'number', id);
});
test('todo shader tem identidade única e tem como desenhar', () => {
  assert.equal(new Set(SHADERS.map(s => s.id)).size, SHADERS.length);
  for (const s of SHADERS) assert.ok(s.modo != null || s.pixi, s.id);
});
test('presets por facção e holográficos apontam para shaders que existem', () => {
  assert.deepEqual(Object.keys(FACTION_PRESETS).sort(), ['ares', 'artemis', 'athena', 'hades', 'poseidon']);
  for (const p of [...Object.values(FACTION_PRESETS), ...HOLO]) assert.ok(shaderOf(p.shader), p.shader);
});
test('raridades do vínculo são as reais do jogo; nenhuma raridade nova', () => {
  const real = new Set(cards.map(c => c.raridade));
  for (const [rarity, holo] of Object.entries(studio.raridades)) { assert.ok(real.has(rarity), rarity); assert.ok(holoOf(holo), holo); }
});
test('composições: dados válidos e pelo menos três tipos no mesmo preset', () => {
  const kinds = new Set(LAYER_TYPES.map(t => t.id));
  for (const [id, comp] of Object.entries(studio.composicoes)) {
    if (!comp.camadas.every(l => l.tipo === 'carta')) assert.ok(new Set(comp.camadas.map(l => l.tipo)).size >= 3, id); // Card Motion tem um tipo só
    for (const l of comp.camadas) {
      assert.ok(kinds.has(l.tipo), l.tipo);
      assert.ok(l.inicio + l.duracao <= MAX_COMPOSITION_MS, `${id}: passa do tempo`);
      if (l.tipo === 'shader') assert.ok(shaderOf(l.shader), l.shader);
      if (l.tipo === 'lottie') assert.ok(LOTTIES.some(x => x.id === l.lottie), l.lottie);
    }
  }
});
test('arquivos Lottie existem e são JSON Lottie', () => {
  for (const l of LOTTIES) {
    const path = new URL(`../${l.arquivo}`, import.meta.url);
    assert.ok(existsSync(path), l.arquivo);
    const data = JSON.parse(readFileSync(path));
    assert.ok(data.layers.length && data.op > data.ip, l.arquivo);
  }
});
test('catálogo tem os nove filtros pedidos', () => assert.equal(CATEGORIES.length, 9));
test('perfil: Graphics do jogo e movimento reduzido', () => {
  assert.equal(profileFor('phone').id, 'low');
  assert.equal(profileFor('low').id, 'low');
  assert.equal(profileFor('medium').id, 'medium');
  assert.equal(profileFor('ultra').id, 'high');
  assert.equal(profileFor('ultra', {reduced: true}).id, 'low');
  assert.equal(stepDown(PROFILES.high).id, 'medium');
  assert.equal(stepDown(PROFILES.low).id, 'low');
  assert.equal(PROFILES.low.vivas, 0, 'LOW não anima carta nenhuma');
});
test('plano do LOW corta shader, câmera e Lottie, e mantém o essencial', () => {
  const plan = planLayers(studio.composicoes['great-flood'], PROFILES.low);
  assert.ok(plan.length);
  assert.ok(plan.every(l => !['shader', 'camera', 'lottie'].includes(l.tipo)));
  assert.ok(planLayers(studio.composicoes['great-flood'], PROFILES.high).filter(l => l.tipo === 'shader').length <= PROFILES.high.shaders);
});
test('movimento reduzido: nada se move', () => {
  const comp = {camadas: [{tipo: 'carta', inicio: 0, duracao: 100}, {tipo: 'audio', inicio: 0, duracao: 100, som: 'x.ogg'}]};
  assert.deepEqual(planLayers(comp, PROFILES.low, {reduced: true}).map(l => l.tipo), ['audio']);
});
test('plano respeita o teto de tempo e fica em ordem', () => {
  const plan = planLayers({camadas: [{tipo: 'ui', inicio: 5900, duracao: 900}, {tipo: 'carta', inicio: 10, duracao: 10}, {tipo: 'ui', inicio: 9000, duracao: 10}]}, PROFILES.high);
  assert.deepEqual(plan.map(l => l.inicio), [10, 5900]);
  assert.equal(plan[1].duracao, 100);
});
test('valor novo não confunde efeito antigo', () => {
  for (const v of ['shader:water', 'comp:great-flood', 'lottie:cosmo-pulse']) assert.ok(isNewFx(v), v);
  for (const v of ['fire', 'vx-f93c891e6289', false, null, 'shader:', 'comp:A B']) assert.ok(!isNewFx(v), String(v));
  assert.equal(asComposition('comp:nao-existe', studio), null);
  assert.equal(asComposition('shader:nao-existe', studio), null);
  assert.equal(asComposition('comp:great-flood', studio).nome, 'Great Flood');
  assert.equal(asComposition('shader:water', studio).camadas[0].shader, 'water');
});
test('carta sem escolha funciona sem efeito; escolha vale pelo id, não pelo nome', () => {
  const card = {id: 'athena-v6-001', nome_exibicao_en: 'PEGASUS SEIYA', raridade: 'Common'};
  assert.equal(cardFxFor({}, card, 'idle'), null);
  assert.equal(cardFxFor({cartas: {'athena-v6-001': {inspecao: 'water'}}}, card, 'idle'), null);
  assert.equal(cardFxFor({cartas: {'athena-v6-001': {inspecao: 'water'}}}, {...card, nome_exibicao_en: 'OUTRO'}, 'inspecao').shader, 'water');
  assert.equal(cardFxFor({cartas: {'athena-v6-001': {idle: 'nao-existe'}}}, card, 'idle'), null);
});
test('coleção: holográfico pela raridade, reage ao cursor; a carta pode trocar', () => {
  const card = {id: 'x', raridade: 'Divine'};
  const fx = cardFxFor(studio, card, 'colecao');
  assert.equal(fx.shader, 'holo-foil');
  assert.equal(fx.reage, true);
  assert.equal(cardFxFor({...studio, cartas: {x: {holo: 'epic-prism'}}}, card, 'colecao').shader, 'rainbow-prism');
  assert.equal(cardFxFor({}, card, 'colecao'), null);
});
