// ARENA FORGE 5.0: serialização, migração, pipeline, manifesto, dependências e escolha de arena.
// node --test tools/test-arena-forge.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_THEMES} from '../playtest/divine/scene.js';
import * as M from '../shared/arena-model.js';
import {build, META} from './arena-seed.mjs';

const BASES = Object.keys(DEFAULT_THEMES);
const ok = (lib, id) => { const l = structuredClone(lib), a = l.arenas.find(x => x.id === id); a.validacao = {ok: true, versao: a.versao, itens: []}; return l; };
const ship = (lib, id, defaults = DEFAULT_THEMES) => M.publish(M.move(ok(M.move(lib, id, 'validation'), id), id, 'approved'), id, defaults, {em: 't'});

test('semente: todas as arenas do código publicadas em v1, biblioteca válida', () => {
  const lib = build(null);
  assert.deepEqual(M.libraryErrors(lib, BASES), []);
  const man = M.buildManifest(lib);
  assert.equal(man.arenas.length, BASES.length);
  assert.ok(man.arenas.every(a => a.versao === 1 && a.variantes[0].id === 'standard' && a.requer === M.SCENE_LEVEL));
});

test('serialização: JSON ida e volta mantém biblioteca e manifesto idênticos', () => {
  const lib = build(null), back = JSON.parse(JSON.stringify(lib));
  assert.deepEqual(back, lib);
  assert.deepEqual(M.buildManifest(back, 'x'), M.buildManifest(lib, 'x'));
});

test('migração: ajustes do arenas.json v1 viram params da arena; schema atual passa intacto', () => {
  const lib = M.migrate({versao: 1, temas: {hades: {pulse: 2}}}, DEFAULT_THEMES, META);
  assert.equal(lib.arenas.find(a => a.id === 'hades').params.pulse, 2);
  assert.equal(M.buildManifest(lib).arenas.find(a => a.id === 'hades').variantes[0].params.pulse, 2);
  assert.equal(M.migrate(lib, DEFAULT_THEMES, META), lib);
  assert.throws(() => M.migrate({foo: 1}, DEFAULT_THEMES, META));
});

test('schema: rejeita cor, faixa, campo, base, facção, id e variante inválidos', () => {
  const a = structuredClone(build(null).arenas[0]);
  const bad = patch => M.arenaErrors({...a, ...patch}, BASES).length > 0;
  for (const p of [{params: {glow: 'red'}}, {params: {pulse: 9}}, {params: {evil: 1}}, {base: 'nowhere'}, {faccao: 'Zeus'}, {id: 'Bad Id'},
    {variantes: [{id: 'night', nome: 'N', tipo: 'night', params: {}}]}, {variantes: [...a.variantes, {id: 'x1', nome: 'X', tipo: 'winter', params: {}}]}])
    assert.ok(bad(p), JSON.stringify(p));
  assert.deepEqual(M.arenaErrors(a, BASES), []);
});

test('pipeline: só aprovada e validada publica; editar publicada abre nova versão sem tirar a antiga do jogo', () => {
  let lib = build(null);
  assert.throws(() => M.publish(lib, 'athena', DEFAULT_THEMES), /aprovada/);
  assert.throws(() => M.move(lib, 'athena', 'approved'));
  lib = M.move(lib, 'athena', 'validation');
  assert.throws(() => M.move(lib, 'athena', 'approved'), /validação/);
  lib = M.publish(M.move(ok(lib, 'athena'), 'athena', 'approved'), 'athena', DEFAULT_THEMES, {nota: 'variantes'});
  const a = M.buildManifest(lib).arenas.find(x => x.id === 'athena');
  assert.equal(a.versao, 2);
  assert.deepEqual(a.variantes.map(v => v.id), ['standard', 'golden-hour', 'twelve-houses']);
  lib = M.startEdit(lib, 'athena');
  const w = lib.arenas.find(x => x.id === 'athena');
  assert.deepEqual([w.status, w.versao, w.publicado], ['development', 3, 2]);
  assert.equal(M.buildManifest(lib).arenas.find(x => x.id === 'athena').versao, 2);
});

test('dependências: versão publicada congela parâmetros completos; mudança no código não altera o manifesto', () => {
  const lib = build(null), before = JSON.stringify(M.buildManifest(lib, 't'));
  const changed = structuredClone(DEFAULT_THEMES); changed.hades.skyTop = '#ffffff';
  const later = ship(lib, 'hades', changed); // código mudou depois da v1
  const man = M.buildManifest(lib, 't');
  assert.equal(JSON.stringify(man), before);
  assert.equal(man.arenas.find(a => a.id === 'hades').variantes[0].params.skyTop, DEFAULT_THEMES.hades.skyTop);
  assert.equal(later.arenas.find(a => a.id === 'hades').historico[0].snapshot.variantes[0].params.skyTop, DEFAULT_THEMES.hades.skyTop);
});

test('rollback: manifesto volta a apontar para versão antiga; versão nunca publicada é recusada', () => {
  let lib = ship(build(null), 'hades');
  assert.equal(M.buildManifest(lib).arenas.find(a => a.id === 'hades').versao, 2);
  lib = M.rollback(lib, 'hades', 1);
  assert.equal(M.buildManifest(lib).arenas.find(a => a.id === 'hades').versao, 1);
  assert.throws(() => M.rollback(lib, 'hades', 9));
});

test('arquivar tira do manifesto; duplicar cria rascunho sem histórico', () => {
  let lib = M.move(build(null), 'ares', 'archived');
  assert.ok(!M.buildManifest(lib).arenas.some(a => a.id === 'ares'));
  lib = M.duplicate(lib, 'artemis', 'artemis-inverno', 'Inverno');
  const c = lib.arenas.find(a => a.id === 'artemis-inverno');
  assert.deepEqual([c.status, c.publicado, c.historico], ['draft', null, []]);
  assert.throws(() => M.duplicate(lib, 'artemis', 'artemis-inverno', 'x'));
});

test('troca de arena: prioridade partida > deck > perfil > padrão, só publicada e possuída', () => {
  const man = M.buildManifest(ship(build(null), 'athena'));
  assert.deepEqual(M.chooseArena({forced: 'hades', deck: 'ares', profile: 'elysion'}, man), {key: 'hades', origem: 'partida'});
  assert.deepEqual(M.chooseArena({deck: 'athena~golden-hour', profile: 'elysion'}, man), {key: 'athena~golden-hour', origem: 'deck'});
  assert.deepEqual(M.chooseArena({profile: 'elysion'}, man), {key: 'elysion', origem: 'perfil'});
  assert.deepEqual(M.chooseArena({profile: 'hades~eclipse'}, man), {key: 'olympus', origem: 'padrão'}); // variante não publicada
  assert.deepEqual(M.chooseArena({profile: 'elysion'}, null), {key: 'olympus', origem: 'padrão'}); // manifesto não carregou
  assert.deepEqual(M.chooseArena({profile: 'elysion'}, man, k => k !== 'elysion'), {key: 'olympus', origem: 'padrão'}); // não possui
});

test('fallback visual: manifesto de cena futura ou parâmetro corrompido cai no tema do código', () => {
  const man = M.buildManifest(build(null));
  man.arenas[1].requer = M.SCENE_LEVEL + 1;
  man.arenas[2].variantes[0].params.glow = 'not-a-color';
  const t = M.themesFromManifest(man, DEFAULT_THEMES);
  assert.equal(t.athena.fallback, true); assert.equal(t.athena.skyTop, DEFAULT_THEMES.athena.skyTop);
  assert.equal(t.poseidon.fallback, true);
  assert.equal(t.hades.fallback, undefined); assert.equal(t.hades.base, 'hades');
});

test('gate: bloqueia draw calls, zona invadida, brilho alto, memória, shader e movimento que não para', () => {
  const good = {schema: [], loaded: true, shaderErrors: 0, calls: 10, callsPhone: 6, worldMs: 2, textures: 2, geometries: 12, zoneHits: [], luma: .5, busy: .1, stillOk: true};
  assert.equal(M.gate(good).ok, true);
  for (const bad of [{calls: 40}, {callsPhone: 12}, {zoneHits: ['astro']}, {luma: .9}, {stillOk: false}, {loaded: false}, {shaderErrors: 1}, {schema: ['x']}, {textures: 30}])
    assert.equal(M.gate({...good, ...bad}).ok, false, JSON.stringify(bad));
  const warn = M.gate({...good, luma: .75, worldMs: 20, busy: .5});
  assert.equal(warn.ok, true);
  assert.equal(warn.itens.filter(i => i.nivel === 'aviso').length, 3);
});
