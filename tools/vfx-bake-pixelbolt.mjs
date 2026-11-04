// Converte os presets de efeito do Pixelbolt (MIT) em sprite sheets do catálogo (data/vfx-catalog.json).
// O jogo recebe só o PNG, sem o Pixelbolt. Roda local, sem conta e sem custo.
// Uso: node tools/vfx-bake-pixelbolt.mjs <clone do Pixelbolt> <pasta temporária vazia>
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const [repo, work] = process.argv.slice(2);
if (!repo || !work) throw Error('Informe o clone do Pixelbolt e uma pasta temporária.');
const URL_REPO = 'https://github.com/skulitom/Pixelbolt';
const pixelbolt = (...args) => execFileSync('node', [join(repo, 'bin/pixelbolt.js'), ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28});
const commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {encoding: 'utf8'}).trim();

// Só o que serve para golpe e magia: líquidos de cenário (mel, aquário, cascata) e personagens ficam de fora.
const PRESETS = {'slash-hit': 'golpe', 'swing-trail': 'golpe', 'fire-spells': 'fogo', 'ice-spells': 'gelo', 'lightning-spells': 'raio', 'poison-spells': 'veneno', 'holy-spells': 'luz', 'shadow-spells': 'trevas', 'water-spells': 'magia',
  'fire-explosion': 'explosao', 'fluid-blast': 'explosao', explosion: 'explosao', meteor: 'explosao', 'lightning-strike': 'raio', lightning: 'raio', 'tesla-coil': 'raio', 'jacobs-ladder': 'raio', 'plasma-globe': 'raio',
  'healing-circle': 'cura', shield: 'escudo', 'hero-magic': 'aura', 'magic-swirl': 'magia', vortex: 'trevas', portal: 'magia', water: 'magia', splash: 'magia', 'slime-burst': 'veneno', 'smoke-puff': 'impacto', 'dust-wave': 'impacto', effects: 'impacto', fireball: 'projetil'};
const skipAnimation = name => /^projectile-(?!0$)/.test(name) || /-(45|90|135|180|225|270|315)$/.test(name); // o efeito toca centrado na carta: uma direção basta
const STRIKE = ['golpe', 'impacto', 'explosao', 'projetil', 'fogo', 'gelo', 'raio', 'veneno', 'luz', 'trevas'];

const result = {novos: 0, repetidos: 0, falhas: []};
for (const [preset, tipo] of Object.entries(PRESETS)) {
  try {
    const recipePath = join(work, `${preset}.json`), out = join(work, preset);
    pixelbolt('compile', '--preset', preset, '--out', recipePath);
    pixelbolt('render', recipePath, '--out', out);
    const recipe = JSON.parse(readFileSync(recipePath, 'utf8')), byName = new Map(recipe.frames.map(f => [f.name, f]));
    for (const [animation, info] of Object.entries(recipe.animations || {})) {
      if (skipAnimation(animation)) continue;
      const names = (info.frames || []).map(f => (typeof f === 'string' ? f : f.frame || f.name));
      const dir = join(work, 'frames', `${preset}--${animation}`);
      mkdirSync(dir, {recursive: true});
      names.forEach((frame, i) => copyFileSync(join(out, 'frames', `${frame}.png`), join(dir, `f${String(i).padStart(3, '0')}.png`)));
      const total = names.reduce((sum, frame) => sum + (byName.get(frame)?.duration || 100), 0);
      const loop = info.loop !== false;
      const args = ['card-forge/vfx_import.py', dir, '--nome', `${preset} · ${animation}`.replaceAll('-', ' ').slice(0, 60), '--fonte', 'pixelbolt', '--licenca', 'MIT', '--acesso', 'gratis', '--autor', 'PixelForge contributors', '--origem', `${URL_REPO}/tree/${commit}#preset-${preset}/${animation}`, '--tipo', tipo, '--fps', String(Math.max(4, Math.min(30, Math.round(1000 * names.length / total)))), '--aparar'];
      if (loop) args.push('--loop');
      else if (STRIKE.includes(tipo)) args.push('--gatilhos', 'golpe,impacto,impacto_deus');
      const done = JSON.parse(execFileSync('/usr/bin/python3', args, {encoding: 'utf8'}));
      done.duplicado ? result.repetidos++ : result.novos++;
    }
  } catch (error) { result.falhas.push(`${preset}: ${String(error.message).split('\n')[0].slice(0, 120)}`); }
}
const catalogPath = 'data/vfx-catalog.json', catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
catalog.fontes.pixelbolt = {nome: 'Pixelbolt', acesso: 'gratis', licenca: 'MIT', url: URL_REPO, estado: `Ligada: MCP local e presets de golpe e magia em sprite sheet (commit ${commit}).`};
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 1)}\n`);
copyFileSync(join(repo, 'LICENSE'), 'playtest/divine/vfx/LICENSE-pixelbolt.txt');
console.log(JSON.stringify({commit, ...result}, null, 1));
