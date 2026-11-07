// ARENA FORGE 5.0: cria data/arena-library.json e data/arenas-published.json a partir dos temas do código (migração).
// Uso: node tools/arena-seed.mjs   (não sobrescreve uma biblioteca que já existe; --force recria)
// Lê data/arenas.json (formato v1 do Arena Forge 1) se existir e aplica os ajustes como params das arenas.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {DEFAULT_THEMES} from '../playtest/divine/scene.js';
import {migrate, startEdit, buildManifest, libraryErrors} from '../shared/arena-model.js';

const ROOT = new URL('../', import.meta.url), at = p => new URL(p, ROOT);
const LIB = at('data/arena-library.json'), PUB = at('data/arenas-published.json'), OLD = at('data/arenas.json');
export const META = {
  olympus: {nome: 'Cosmo Arena', faccao: 'Neutral', descricao: 'Cosmic night over a golden zodiac dial.'},
  athena: {nome: "Athena's Sanctuary", faccao: 'Athena', descricao: 'White marble and warm light of the Sanctuary.'},
  poseidon: {nome: "Poseidon's Undersea Temple", faccao: 'Poseidon', descricao: 'Sunken temple under moving caustics.'},
  hades: {nome: "Hades' Underworld", faccao: 'Hades', descricao: 'Black stone, lava fissures and broken columns.'},
  elysion: {nome: 'Elysion', faccao: 'Hades', descricao: 'Garden of the gods: flowers, falling petals, soft sun.'},
  ares: {nome: "Ares' War Temple", faccao: 'Ares', descricao: 'Bronze plates glowing like a forge under a red sun.'},
  artemis: {nome: "Artemis' Moonlit Grove", faccao: 'Artemis', descricao: 'Pines, moonlight and fireflies.'},
};
// Variantes de exemplo (Arena Forge 5.0): ficam em desenvolvimento até o autor validar, aprovar e publicar.
const VARIANTS = {
  athena: [{id: 'golden-hour', nome: 'Golden Hour', tipo: 'sunset', params: {skyBottom: '#ff9a3c', light: '#ffc070', fog: '#3a1e20', orb: {color: '#ffb050', size: 12, x: -12}}},
    {id: 'twelve-houses', nome: 'Twelve Houses Battle', tipo: 'legendary', params: {zodiac: 1, skyTop: '#060a20', line: '#ffd36a', dust: '#ffe08a', light: '#ffe7b0'}}],
  poseidon: [{id: 'great-flood', nome: 'Great Flood', tipo: 'storm', params: {skyBottom: '#08384e', fog: '#021824', light: '#5fd0ff', dust: '#d8fbff', dustSize: 1.4, fall: 1}}],
  hades: [{id: 'eclipse', nome: 'Eclipse', tipo: 'divine', params: {skyBottom: '#1a0010', light: '#b02a4a', glow: '#ff2050', orb: {color: '#ff2a2a', size: 14, x: 0}}}],
};

export function build(old) {
  let lib = migrate(old || {versao: 1, temas: {}}, DEFAULT_THEMES, META);
  for (const [id, vs] of Object.entries(VARIANTS)) {
    lib = startEdit(lib, id);
    lib.arenas.find(a => a.id === id).variantes.push(...vs);
  }
  return lib;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (existsSync(LIB) && !process.argv.includes('--force')) { console.log('data/arena-library.json já existe; nada feito (use --force).'); process.exit(0); }
  const lib = build(existsSync(OLD) ? JSON.parse(readFileSync(OLD, 'utf8')) : null);
  const errs = libraryErrors(lib, Object.keys(DEFAULT_THEMES));
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  writeFileSync(LIB, JSON.stringify(lib, null, 2) + '\n');
  writeFileSync(PUB, JSON.stringify(buildManifest(lib), null, 2) + '\n');
  console.log(`biblioteca: ${lib.arenas.length} arenas; publicadas: ${buildManifest(lib).arenas.length}`);
}
