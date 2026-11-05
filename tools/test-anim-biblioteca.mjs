// Biblioteca do Star Hill: uso real de cada efeito, busca por carta e habilidade, filtros e números da Visão geral.
import assert from 'node:assert/strict';
import test from 'node:test';
import {usageMap, filterEffects, overview, libraryRows, visaoSection} from '../star-hill/animacoes-biblioteca.js';

const effects = [
  {id: 'slash', nome: 'Corte', fonte: 'sprite-fusion', categoria: 'particle'},
  {id: 'vx-1', nome: 'Arco', fonte: 'particlr', categoria: 'sprite', arquivo: 'playtest/divine/vfx/vx-1.png', cols: 4, quadros: 16, faccoes: ['hades'], gatilhos: ['golpe']},
  {id: 'vx-2', nome: 'Brasa', fonte: 'autor', categoria: 'sprite', estado: 'rascunho'},
];
const cards = [
  {id: 'c1', nome_exibicao_en: 'HYPNOS', nome_exibicao_pt: 'HIPNOS', faccao: 'Hades', habilidades_pt: ['Letargia Eterna — texto']},
  {id: 'c2', nome_exibicao_en: 'SEIYA', faccao: 'Athena'},
];
const anims = {
  padrao: {golpe: 'slash', linhas: []},
  'faccao-athena': {impacto: 'slash', ultimate: null},
  c1: {golpe: 'vx-1', dano: false, linhas: ['vx-2', null]},
  efeitos: {slash: {ligado: true}},
  css: {x: 'nao-e-efeito'},
};

test('uso conta cada vínculo e ignora false, null e ajustes do jogo', () => {
  const uso = usageMap(anims);
  assert.deepEqual(uso.slash.map(u => u.dono), ['padrao', 'faccao-athena']);
  assert.deepEqual(uso['vx-2'], [{dono: 'c1', chave: 'linha:0'}]);
  assert.equal(uso['nao-e-efeito'], undefined);
  assert.equal(Object.values(uso).flat().some(u => u.chave === 'dano' || u.chave === 'ultimate'), false);
});

test('busca acha o efeito pelo código, pela carta e pela habilidade', () => {
  const uso = usageMap(anims), ids = q => filterEffects(effects, {q}, uso, cards).map(e => e.id);
  assert.deepEqual(ids('vx-1'), ['vx-1']);
  assert.deepEqual(ids('hipnos').sort(), ['vx-1', 'vx-2']);
  assert.deepEqual(ids('letargia'), ['vx-2']);
  assert.deepEqual(ids('nada-disso'), []);
});

test('filtros e ordem', () => {
  const uso = usageMap(anims), ids = f => filterEffects(effects, f, uso, cards).map(e => e.id);
  assert.deepEqual(ids({faccao: 'athena'}), ['slash']);
  assert.deepEqual(ids({gatilho: 'golpe'}).sort(), ['slash', 'vx-1']);
  assert.deepEqual(ids({estado: 'rascunho'}), ['vx-2']);
  assert.deepEqual(ids({estado: 'ativo'}).sort(), ['slash', 'vx-1']);
  assert.deepEqual(ids({vinculo: 'sem'}), []);
  assert.deepEqual(filterEffects([...effects, {id: 'z', nome: 'Zero'}], {vinculo: 'sem'}, uso, cards).map(e => e.id), ['z']);
  assert.equal(ids({ordem: 'uso'})[0], 'slash');
});

test('visão geral conta dos dados e aponta vínculo quebrado', () => {
  const n = overview({effects, anims: {...anims, c2: {golpe: 'sumiu'}}, cards});
  assert.equal(n.efeitos, 3);
  assert.equal(n.semVinculo, 0);
  assert.equal(n.cartasCom, 2);
  assert.deepEqual(n.quebrados, ['sumiu']);
  assert.deepEqual(n.rascunhos.map(e => e.id), ['vx-2']);
  assert.deepEqual(n.porFaccao.Hades, {total: 1, com: 1});
  const html = visaoSection({numeros: n, pub: {versao: 3, mudou: {animacoes: ['a'], estudio: []}, problemas: []}});
  assert.match(html, /sumiu/);
  assert.match(html, /Versão publicada: 3/);
});

test('lista escapa texto, mostra miniatura real e oferece limpar quando vazia', () => {
  const html = libraryRows({effects: [{id: 'a"b', nome: '<x>', fonte: 'f'}, effects[1]], anims, cards, filtro: {}});
  assert.ok(!html.includes('<x>') && html.includes('&lt;x&gt;'));
  assert.match(html, /background-image:url\('\/playtest\/divine\/vfx\/vx-1\.png'\)/);
  assert.match(libraryRows({effects, anims, cards, filtro: {q: 'nada-disso'}}), /data-bib-limpar/);
});

test('paginação só aparece quando sobra efeito', () => {
  const many = Array.from({length: 70}, (_, i) => ({id: `e${i}`, nome: `E${i}`}));
  assert.match(libraryRows({effects: many, anims: {}, cards: [], filtro: {}}), /Mostrar mais 10/);
  assert.doesNotMatch(libraryRows({effects: many, anims: {}, cards: [], filtro: {}, limit: 70}), /data-bib-mais/);
});
