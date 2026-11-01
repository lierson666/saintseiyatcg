// Tradutor PT-BR (shared/i18n.js + dicionários): padrões, marcadores {w}/{t}, espaços e fallback em inglês.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const store = {ssTcgOlympusArena: JSON.stringify({lang: 'pt'})};
const el = () => ({setAttribute() {}, append() {}, style: {}, addEventListener() {}});
const ctx = {
  localStorage: {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }},
  navigator: {languages: ['en-US']},
  document: {documentElement: {lang: ''}, head: {append() {}}, createElement: el, querySelector: () => null},
  MutationObserver: class { observe() {} }, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {},
  alert() {}, confirm() {}, prompt() {},
};
ctx.self = ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['shared/i18n-pt.js', 'shared/i18n-pt-site.js', 'shared/i18n.js']) vm.runInContext(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), ctx);
const {t} = ctx.ssI18n;

assert.equal(ctx.ssI18n.lang, 'pt'); // escolha salva vence o navegador
assert.equal(ctx.document.documentElement.lang, 'pt-BR');
assert.equal(t('Player A begins a turn.'), 'Jogador A começa um turno.'); // {w} não deixa "Player {0}" engolir a frase
assert.equal(t('Player B'), 'Jogador B');
assert.equal(t('Round 3 · Player A'), 'Rodada 3 · Jogador A');
assert.equal(t('Hand|7 cards.'), 'Mão|7 cartas.'); // captura traduzida por outro padrão
assert.equal(t('  End Turn '), '  Encerrar turno '); // espaços das pontas preservados
assert.equal(t('Pegasus Seiya enters the battlefield.'), 'Pegasus Seiya entra no campo de batalha.'); // nome de carta fica (fase 3)
assert.equal(t('Seiya · Ikki'), 'Seiya · Ikki'); // {t}: genérico só vale com um lado traduzido
assert.equal(t('Bronze · Lv 3'), 'Bronze · Nv 3');
assert.equal(t('Saint Seiya TCG — How to Play'), 'Saint Seiya TCG — Como Jogar');
assert.equal(t('Some new sentence.'), 'Some new sentence.'); // sem tradução: inglês
assert.ok(ctx.ssI18n.missing.has('Some new sentence.'));
assert.equal(t('Jogador A'), 'Jogador A'); // já traduzido não volta a passar
ctx.ssI18n.set('en');
assert.equal(t('End Turn'), 'End Turn');
assert.equal(JSON.parse(store.ssTcgOlympusArena).lang, 'en');
console.log('i18n ok');
