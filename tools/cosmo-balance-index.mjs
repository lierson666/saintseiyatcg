// Gera card-forge/cosmo-balance/engine-index.json: o que a Engine de partida implementa para cada carta.
// Fonte estruturada para o CosmoBalanceEngine não depender só do texto. Lê a Engine; não altera nada dela.
// node tools/cosmo-balance-index.mjs
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {stableHash} from '../card-forge/cosmo-balance/config.js';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
await import('../playtest/engine-v3/v6/hooks.js');
const {V6} = await import('../playtest/engine-v3/v6/registry.js');

const V6_DIR = 'playtest/engine-v3/v6/';
const files = readdirSync(new URL(V6_DIR, root)).filter(f => f.endsWith('.js')).sort();
const CALL = /\b([A-Za-z_]\w*)\(/g;
const callsIn = text => [...new Set([...text.matchAll(CALL)].map(m => m[1]))];

// Ajudantes de topo de cada arquivo (`const hit = …`, `function x(…)`): os efeitos costumam passar por eles.
// shortcut: nomes iguais em arquivos diferentes se misturam; pode confirmar a mais, nunca negar. Trocar por escopo por arquivo se isso enganar.
const helpers = {};
for (const f of files.filter(f => !['registry.js', 'hooks.js', 'kit.js', 'targets.js'].includes(f))) {
  const lines = read(V6_DIR + f).split('\n');
  let name = null, body = [];
  const flush = () => { if (name) helpers[name] = [...new Set([...(helpers[name] || []), ...callsIn(body.join('\n'))])]; };
  for (const line of lines) {
    const start = /^(?:export\s+)?(?:const|function)\s+([A-Za-z_]\w*)/.exec(line);
    if (start || /^(?:export default|import)/.test(line)) { flush(); name = start?.[1] ?? null; body = []; }
    if (name) body.push(line);
  }
  flush();
}
const expand = (calls, seen = new Set()) => {
  for (const c of calls) if (!seen.has(c)) { seen.add(c); if (helpers[c]) expand(helpers[c], seen); }
  return seen;
};
const source = v => (typeof v === 'function' ? v.toString() : v && typeof v === 'object' ? Object.values(v).map(source).join('\n') : '');
const hooksOf = entry => Object.keys(entry).flatMap(k => (k === 'resonance' || k === 'tartarus' ? [k, ...Object.keys(entry[k])] : [k])).sort();

const raw = JSON.parse(read('data/cards.json'));
const cards = {};
for (const [id, entry] of Object.entries(V6).sort(([a], [b]) => a.localeCompare(b))) {
  cards[id] = {source: 'v6', hooks: hooksOf(entry), calls: [...expand(callsIn(source(entry)))].sort()};
}
// Athena tem cartas na tabela por número (effects.js e vizinhos); Gods em gods.js. Sem introspecção de efeito: só a prova de que existe.
const numericSources = ['effects.js', 'play.js', 'strike.js', 'gods.js', 'match.js'].map(f => read(`playtest/engine-v3/${f}`)).join('\n');
const godSource = read('playtest/engine-v3/gods.js');
for (const c of raw.cartas) {
  if (cards[c.id]) continue;
  if (c.tipo === 'God') { if (godSource.includes(`god-${c.faccao.toLowerCase()}`)) cards[c.id] = {source: 'god'}; continue; }
  const number = String(c.numero_carta ?? '').padStart(3, '0');
  if (c.conjunto === 'athena-vanilla-v6' && new RegExp(`['"]${number}['"]`).test(numericSources)) cards[c.id] = {source: 'tabela_numerica'};
}

// Decks de teste que usam cada carta, para o "efeito em outros decks" das propostas.
const decks = {}, known = new Set(raw.cartas.map(c => c.id));
const DECK_DIR = 'data/alpha-0.1/';
for (const f of readdirSync(new URL(DECK_DIR, root)).filter(f => /^decks-.*\.json$/.test(f)).sort()) {
  for (const deck of JSON.parse(read(DECK_DIR + f)).decks || []) {
    const ids = new Set();
    JSON.stringify(deck).replace(/"([a-z]+-v6-\d+)"/g, (_, id) => { if (known.has(id)) ids.add(id); return ''; });
    for (const id of ids) (decks[id] ||= []).push(deck.nome || deck.id);
  }
}
for (const k of Object.keys(decks)) decks[k] = [...new Set(decks[k])].sort();

const sources = [...files.map(f => V6_DIR + f), ...['core', 'effects', 'play', 'strike', 'gods', 'match'].map(f => `playtest/engine-v3/${f}.js`)];
const index = {
  note: 'Gerado por tools/cosmo-balance-index.mjs. Não editar à mão.',
  sourceHash: stableHash(sources.map(read).join('\n')), cards, decks,
};
writeFileSync(new URL('card-forge/cosmo-balance/engine-index.json', root), `${JSON.stringify(index)}\n`);
const count = s => Object.values(cards).filter(c => c.source === s).length;
console.log(`engine-index: v6 ${count('v6')}, tabela numérica ${count('tabela_numerica')}, god ${count('god')}, sem Engine ${raw.cartas.filter(c => !cards[c.id]).length}, cartas em decks ${Object.keys(decks).length}`);
