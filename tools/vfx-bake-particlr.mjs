// Converte os presets CC0 do Particlr em sprite sheets do catálogo (data/vfx-catalog.json), pelo próprio servidor MCP.
// O jogo não recebe o runtime do Particlr (PixiJS): toca só o PNG. Roda local, sem conta e sem custo.
// Uso: node tools/vfx-bake-particlr.mjs <pasta temporária vazia>
import {spawn, execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const VERSION = '0.2.1', FRAMES = 16, SIZE = 160, MIN_FPS = 6, MAX_FPS = 30;
const SKIP = new Set(['ember-field', 'firefly-field', 'fireworks', 'starfield']); // feitos para a tela toda: em volta da carta quase não aparecem
const work = process.argv[2];
if (!work) throw Error('Informe uma pasta temporária.');

const TYPE = [[/slash/, 'golpe'], [/hit|impact|spark|slam|debris|weld/, 'impacto'], [/explosion|blast|shockwave|fireworks|shatter(?<!ice-shatter)/, 'explosao'], [/ice|snow|blizzard/, 'gelo'], [/fire|torch|ember|cinder|comet|rocket/, 'fogo'],
  [/lightning|plasma/, 'raio'], [/poison|goo/, 'veneno'], [/heal|heart/, 'cura'], [/shield/, 'escudo'], [/black-hole|vortex|portal|dissolving/, 'trevas'], [/level-up|star-rating|pickup|coin|confetti/, 'luz'], [/magic|rune|mana|teleport|silk/, 'magia'], [/laser|muzzle|shell/, 'projetil'],
  [/rain|fog|leaves|foliage|cherry|firefly|starfield|bubbles|soda|dust|smoke|mist|geyser|water|autumn/, 'clima']];
const typeOf = name => TYPE.find(([re]) => re.test(name))?.[1] || 'outro';

const server = spawn('npx', ['-y', `@particlr/mcp@${VERSION}`], {cwd: work, stdio: ['pipe', 'pipe', 'ignore']});
const waiting = new Map();
let buffer = '', next = 0;
server.stdout.on('data', chunk => {
  buffer += chunk;
  for (let i; (i = buffer.indexOf('\n')) >= 0; buffer = buffer.slice(i + 1)) {
    const line = buffer.slice(0, i);
    if (line.trim()) { const message = JSON.parse(line); waiting.get(message.id)?.(message); waiting.delete(message.id); }
  }
});
const send = message => server.stdin.write(`${JSON.stringify({jsonrpc: '2.0', ...message})}\n`);
const call = (method, params) => new Promise(resolve => { const id = ++next; waiting.set(id, resolve); send({id, method, params}); });
const tool = (name, args) => call('tools/call', {name, arguments: args}).then(m => m.result);

await call('initialize', {protocolVersion: '2025-03-26', capabilities: {}, clientInfo: {name: 'sstcg-vfx-bake', version: '1'}});
send({method: 'notifications/initialized'});
const {presets} = JSON.parse((await tool('list_presets', {})).content[0].text);
const result = {novos: 0, repetidos: 0, falhas: []};
for (const {name} of presets) {
  if (SKIP.has(name)) continue;
  const {doc} = JSON.parse((await tool('get_preset', {name})).content[0].text), parsed = JSON.parse(doc);
  const out = await tool('render_effect', {doc, frames: FRAMES, width: SIZE, height: SIZE, background: 'transparent', layout: 'separate'});
  const images = out.content.filter(c => c.type === 'image');
  if (images.length !== FRAMES) { result.falhas.push(`${name}: ${out.content.find(c => c.text)?.text.match(/"message":\s*"([^"]{0,90})/)?.[1] || 'sem quadros'}`); continue; }
  const dir = join(work, name);
  mkdirSync(dir, {recursive: true});
  images.forEach((image, i) => writeFileSync(join(dir, `f${String(i).padStart(2, '0')}.png`), Buffer.from(image.data, 'base64')));
  const span = Number(out.content.find(c => c.text)?.text.match(/"completion(?:Time)?":\s*([\d.]+)/)?.[1]) || parsed.duration || 1;
  const fps = Math.max(MIN_FPS, Math.min(MAX_FPS, Math.round(FRAMES / span)));
  const args = ['card-forge/vfx_import.py', dir, '--nome', parsed.meta?.name || name, '--fonte', 'particlr', '--licenca', 'CC0-1.0', '--acesso', 'gratis', '--origem', `https://www.npmjs.com/package/@particlr/mcp/v/${VERSION}#preset-${name}`, '--autor', 'particlr', '--tipo', typeOf(name), '--fps', String(fps), '--aparar'];
  if (parsed.looping) args.push('--loop');
  const done = JSON.parse(execFileSync('/usr/bin/python3', args, {encoding: 'utf8'}));
  done.duplicado ? result.repetidos++ : result.novos++;
}
server.kill();
console.log(JSON.stringify({presets: presets.length, ...result}, null, 1));
