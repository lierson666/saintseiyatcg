// Leva um efeito do PixelFX (MIT) ao Criador de animações como rascunho. O jogo recebe só o PNG, sem o PixelFX.
// Efeito da biblioteca: node tools/vfx-criar.mjs melee/double-slash --nome "Corte duplo" --tipo golpe
// Efeito novo: escreva tools/vfx-criador/fx/<nome>.js e rode node tools/vfx-criar.mjs sstcg/<nome> --nome "..." --tipo ...
// Opções: --opts '{"palette":[...]}'  --gatilhos golpe,impacto  --loop. Rodar de novo com o mesmo nome troca a versão anterior.
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), LIB = join(homedir(), '.local/share/pixelfx');
const [id, ...rest] = process.argv.slice(2), flags = {};
for (let i = 0; i < rest.length; i += 2) flags[rest[i].replace(/^--/, '')] = rest[i + 1];
if (!id || !flags.nome) throw Error('Uso: node tools/vfx-criar.mjs <categoria/efeito> --nome "Nome" [--tipo golpe] [--opts JSON] [--gatilhos a,b]');
if (!existsSync(join(LIB, 'tools/render.mjs'))) throw Error(`PixelFX não encontrado em ${LIB}. Clone github.com/patch-gg/pixelfx lá.`);

// Os efeitos do projeto ficam no repositório; o PixelFX só os enxerga copiados para dentro dele (os imports são relativos).
const own = join(ROOT, 'tools/vfx-criador/fx'), target = join(LIB, 'src/fx/sstcg');
if (existsSync(own)) {
  mkdirSync(target, {recursive: true});
  for (const file of readdirSync(own)) if (file.endsWith('.js')) copyFileSync(join(own, file), join(target, file));
}
const isOwn = id.startsWith('sstcg/'), node = (...args) => execFileSync('node', args, {cwd: LIB, encoding: 'utf8'});
const work = mkdtempSync(join(tmpdir(), 'vfx-criar-'));
node('tools/render.mjs', id, '--sheet', '--no-actor', '--bg', 'none', '--out', work, ...(flags.opts ? ['--opts', flags.opts] : []));
if (isOwn) console.log(node('tools/check.mjs', id).trim());
const name = id.split('/')[1], dir = join(work, id);
const commit = execFileSync('git', ['-C', LIB, 'rev-parse', '--short', 'HEAD'], {encoding: 'utf8'}).trim();
const slug = flags.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const meta = JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8')).meta.pixelfx;
const done = JSON.parse(execFileSync('/usr/bin/python3', ['card-forge/vfx_import.py', join(dir, `${name}.png`), '--json', join(dir, `${name}.json`), '--nome', flags.nome,
  '--fonte', isOwn ? 'criador' : 'pixelfx', '--licenca', isOwn ? 'Projeto; feito com PixelFX (MIT)' : 'MIT', '--autor', isOwn ? 'Saint Seiya TCG' : 'Patch',
  '--origem', isOwn ? `criador:${slug}` : `https://github.com/patch-gg/pixelfx/tree/${commit}#${id}/${slug}`, '--tipo', flags.tipo || 'outro', '--aparar', '--rascunho',
  ...(meta.loop || 'loop' in flags ? ['--loop'] : []), ...(flags.gatilhos ? ['--gatilhos', flags.gatilhos] : [])], {cwd: ROOT, encoding: 'utf8'}));

const path = join(ROOT, 'data/vfx-catalog.json'), catalog = JSON.parse(readFileSync(path, 'utf8'));
catalog.fontes.pixelfx = {nome: 'PixelFX', acesso: 'gratis', licenca: 'MIT', url: 'https://github.com/patch-gg/pixelfx', estado: `Ligada: skill e biblioteca local (commit ${commit}), levadas ao Criador em sprite sheet.`};
catalog.fontes.criador = {nome: 'Criador', acesso: 'gratis', licenca: 'Projeto; feito com PixelFX (MIT)', url: '', estado: 'Efeitos feitos para o jogo na conversa com o Claude.'};
writeFileSync(path, `${JSON.stringify(catalog, null, 1)}\n`);
for (const [file, as] of [['LICENSE', 'LICENSE-pixelfx.txt'], ['NOTICE.md', 'NOTICE-pixelfx.md']]) copyFileSync(join(LIB, file), join(ROOT, 'playtest/divine/vfx', as));
console.log(JSON.stringify({...done, contato: join(dir, 'contact.png')}, null, 1));
