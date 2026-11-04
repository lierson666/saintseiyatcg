// Golpes em pixel art: cada receita desenha algo e termina sozinha; os dados do gestor só apontam para efeitos que existem.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PARTICLE_GROUPS, tunedFx} from '../playtest/divine/particle-tune.js';
import {COMBAT, combatLayers, RECIPES, EFFECTS, ANIM_MOMENTS, MAX_LIFE, animFor, rampOf, effectFiles, sheetFx} from '../playtest/divine/pixel-vfx.js';

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

test('versão publicada íntegra: trava o deploy se houver referência quebrada', () => {
  execFileSync('/usr/bin/python3', ['tools/vfx-publicacao.py'], {encoding: 'utf8'});
});
test('online o jogo só lê o publicado', async () => {
  const {animFile} = await import('../shared/anim-data.js');
  assert.equal(animFile('data/card-animations.json', {hostname: 'saintseiyatcg.example', search: ''}), 'data/card-animations.publicado.json');
  assert.equal(animFile('data/vfx-studio.json', {hostname: '127.0.0.1', search: ''}), 'data/vfx-studio.json');
  assert.equal(animFile('data/vfx-studio.json', {hostname: 'localhost', search: '?publicado=1'}), 'data/vfx-studio.publicado.json');
});
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
    if (id === 'particulas') { for (const k of Object.keys(entry)) assert.ok(PARTICLE_GROUPS.some(g => g[0] === k), k); continue; }
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

test('efeito importado sai do atacante ou viaja até o alvo sem sair da mesa', () => {
  const s = {w: 2, h: 2, sw: 2, cols: 1, quadros: 1, fps: 10, loop: false, px: new Uint32Array(4).fill(0xff00ff00)};
  const frame = () => ({w: 40, h: 40, ox: 0, oy: 0, color: new Uint32Array(1600), light: new Uint32Array(1600)});
  const lit = f => f.color.findIndex(v => v);
  const g = {x: 30 * 3, y: 30 * 3, h: 12 * 3, from: [10 * 3, 10 * 3]};
  const alvo = frame(), origem = frame(), viagem = frame();
  sheetFx(s, g).draw(alvo, 'front');
  sheetFx(s, {...g, ancora: 'origem'}).draw(origem, 'front');
  const fx = sheetFx(s, {...g, ancora: 'viagem'});
  fx.draw(viagem, 'front'); // começa no atacante
  assert.ok(lit(origem) < lit(alvo), 'origem desenha perto do atacante');
  assert.ok(lit(viagem) < lit(alvo), 'viagem começa no atacante');
  const fim = frame();
  fx.update(.09); fx.draw(fim, 'front');
  assert.ok(lit(fim) > lit(viagem), 'viagem avança para o alvo');
  assert.ok(lit(fim) >= 0);
});

test('os 14 tipos do gerador usam só receitas reais e respeitam camada e posição', () => {
  assert.equal(Object.keys(COMBAT).length, 14);
  const at = k => ({x: 300, y: 300, top: 200, bottom: 400, w: 200, h: 200, from: [100, 100], s: k, size: k, color: '#ff0000', power: 0});
  for (const [tipo, kind] of Object.entries(COMBAT)) {
    for (const c of kind.camadas) assert.ok(RECIPES[c.base], `${tipo}: ${c.base}`);
    const layers = combatLayers({tipo}, at);
    assert.equal(layers.length, kind.camadas.length, tipo);
    for (const l of layers) assert.ok(effectFiles().includes(l.file), l.file);
  }
  const noOff = combatLayers({tipo: 'block', camadas: [{ligada: false, atraso: 0}, {ligada: true, atraso: 90}]}, at);
  assert.equal(noOff.length, 1);
  assert.equal(noOff[0].atraso, 90);
  assert.equal(combatLayers({tipo: 'slash', ancora: 'origem'}, at)[0].options.x, 100);
});
test('relógio do preview pausa, desacelera e avança quadro a quadro', async () => {
  const {installClock} = await import('../playtest/divine/preview-clock.js');
  let realNow = 1000; const pumps = [], nap = [];
  const win = {setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: fn => { nap.push(fn); return nap.length; }, cancelAnimationFrame() {}, setInterval: fn => { pumps.push(fn); return 1; }, performance: {now: () => realNow}};
  const clock = installClock(win), pump = pumps[0], log = [];
  const pass = ms => { realNow += ms; pump(); };
  win.setTimeout(() => log.push('b'), 200); win.setTimeout(() => log.push('a'), 100); const gone = win.setTimeout(() => log.push('x'), 50); win.clearTimeout(gone);
  pass(150);
  assert.deepEqual(log, ['a']);
  clock.setRate(.5); pass(60);
  assert.deepEqual(log, ['a'], '60 ms reais a 0,5× ainda não chegam a 200');
  pass(40);
  assert.deepEqual(log, ['a', 'b']);
  clock.pause(); const frozen = win.performance.now(); pass(5000);
  assert.equal(win.performance.now(), frozen);
  let frame = null; win.requestAnimationFrame(at => { frame = at; });
  pass(500); assert.equal(frame, null, 'pausado, o quadro não anda');
  clock.step(); assert.ok(frame > frozen && frame < frozen + 20);
  clock.pause(false); pass(10); assert.ok(win.performance.now() > frame);
});
test('fases do Combat Composer batem com o servidor e o pedido', async () => {
  const {COMBAT_TRACKS} = await import('../playtest/divine/combat-tracks.js');
  assert.deepEqual(COMBAT_TRACKS.map(t => t[1]), ['Anticipation', 'Charge', 'Movement', 'Projectile', 'Contact', 'Impact', 'Hit Stop', 'Knockback', 'Sound', 'Aftermath']);
  const py = readFileSync(new URL('../card-forge/vfx_import.py', import.meta.url), 'utf8');
  for (const [key, , tipo] of COMBAT_TRACKS) if (tipo === 'efeito') assert.ok(py.match(/COMBAT_EFFECT_TRACKS = \(([^)]*)\)/)[1].includes(`'${key}'`), key);
});
test('tipos do gerador batem com o servidor', () => {
  const py = readFileSync(new URL('../card-forge/vfx_import.py', import.meta.url), 'utf8');
  for (const [tipo, kind] of Object.entries(COMBAT)) assert.ok(py.includes(`'${tipo}': ('${kind.tipo}', ${kind.camadas.length})`), tipo);
});
test('adapter de CSS desliga sem travar e muda a velocidade', async () => {
  const {applyTune} = await import('../shared/anim-css-adapter.js');
  const log = [];
  const finita = {finish: () => log.push('finish'), cancel: () => log.push('cancel')};
  applyTune(finita, {ligado: false});
  const infinita = {finish() { throw new Error('infinita'); }, cancel: () => log.push('cancel')};
  applyTune(infinita, {ligado: false});
  assert.deepEqual(log, ['finish', 'cancel']);
  const a = {playbackRate: 1};
  applyTune(a, {ligado: true, velocidade: .5});
  assert.equal(a.playbackRate, .5);
  applyTune(a, undefined);
  assert.equal(a.playbackRate, 1);
});
test('laços do céu e da moeda têm controle; exceção sempre tem motivo', () => {
  const {animacoes} = JSON.parse(readFileSync(new URL('../data/vfx-inventario.json', import.meta.url)));
  const by = id => animacoes.find(a => a.id === id);
  assert.ok(by('raf:shared-kv-sky-js').parametros.includes('estrelas'));
  assert.ok(by('raf:playtest-divine-coin3d-js').parametros.includes('giros'));
  assert.ok(!animacoes.some(a => a.tecnologia.startsWith('JavaScript (request') && a.estado === 'legado'), 'laço sem dono');
  assert.ok(!animacoes.some(a => a.tecnologia === 'Canvas 2D' && a.estado === 'legado'), 'canvas sem dono');
  assert.ok(!animacoes.some(a => a.nome === 'real'), 'comentário contado como @keyframes');
  for (const a of animacoes) if (a.estado === 'excecao') assert.ok(a.limite && !a.migrada, a.id);
});
test('registro só oferece o adapter a animações CSS das páginas que o carregam', () => {
  const {animacoes} = JSON.parse(readFileSync(new URL('../data/vfx-inventario.json', import.meta.url)));
  const css = animacoes.filter(a => a.aba === 'interface');
  assert.ok(css.length > 80);
  for (const a of css) {
    assert.ok(a.id.startsWith('css:') && ['mesa', 'lobby'].includes(a.pagina) && a.parametros.includes('velocidade'), a.id);
    assert.equal(a.migrada, false, `${a.id}: amostra na carta não conta como teste na mesa`);
  }
});
test('registro de animações cobre o repositório e não inventa migração', () => {
  execFileSync('/usr/bin/python3', ['tools/test-vfx-inventario.py'], {encoding: 'utf8'});
  execFileSync('/usr/bin/python3', ['tools/vfx-inventario.py', '--check'], {encoding: 'utf8'});
  const {animacoes} = JSON.parse(readFileSync(new URL('../data/vfx-inventario.json', import.meta.url)));
  assert.equal(new Set(animacoes.map(a => a.id)).size, animacoes.length);
  for (const a of animacoes) {
    assert.ok(a.nome && a.categoria && a.tecnologia && a.origem && a.arquivos.length, a.id);
    assert.equal(a.migrada, Object.values(a.criterios).every(Boolean), a.id);
    assert.equal(a.criterios.forge, Boolean(a.aba), a.id);
    if (a.estado === 'legado') assert.ok(!a.migrada && a.limite, `${a.id}: legado precisa dizer o limite`);
  }
});

test('pedido de animação não exige carta nem momento', async () => {
  const {buildRequest, defaultRequest} = await import('../shared/anim-request.js');
  const text = buildRequest(null, defaultRequest(null));
  assert.match(text, /banco de efeitos/);
  assert.doesNotMatch(text, /CARTA|Uso sugerido/);
  const withCard = buildRequest({id: 'athena-v6-001', nome_exibicao_pt: 'SEIYA', faccao: 'Athena'}, {...defaultRequest(null), momento: 'golpe'});
  assert.match(withCard, /athena-v6-001/);
  assert.match(withCard, /Uso sugerido: Golpe do Strike/);
});

test('ajuste de partículas: sem ajuste nada muda; com ajuste multiplica e colore; desligado não toca', async () => {
  const calls = [], f = Object.fromEntries(['burst', 'charge', 'shockwave', 'flash', 'beam', 'projectile', 'shake', 'punch'].map(m => [m, (...a) => { calls.push([m, ...a]); return 'feito'; }]));
  assert.equal(tunedFx(f, undefined), f);
  tunedFx(f, {quantidade: 2, tamanho: 2, duracao: .5, cor: '#123456'}).burst(1, 2, {count: 10, color: '#fff'});
  assert.deepEqual(calls[0], ['burst', 1, 2, {count: 20, color: '#123456', size: 24, life: .35}]);
  assert.equal(tunedFx(f, {duracao: 2}).beam({}, {}), 'feito', 'beam devolve a promessa do impacto');
  calls.length = 0;
  await tunedFx(f, {ligado: false}).projectile({}, {});
  assert.equal(calls.length, 0);
});

test('todo grupo de partículas que o director usa tem nome no editor', () => {
  const text = readFileSync(new URL('../playtest/divine/director.js', import.meta.url), 'utf8'), named = new Set(PARTICLE_GROUPS.map(g => g[0]));
  for (const [, key] of text.matchAll(/fx\('([\w-]+)'\)/g)) assert.ok(named.has(key), key);
  for (const god of ['athena', 'poseidon', 'hades', 'ares', 'artemis']) assert.ok(named.has(`morte-${god}`), god);
});
