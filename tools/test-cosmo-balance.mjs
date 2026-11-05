// Testes do CosmoBalanceEngine. Usa cartas sintéticas e, só para leitura, o catálogo real.
// node --test tools/test-cosmo-balance.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CosmoBalanceEngine, CLASSES} from '../card-forge/cosmo-balance/engine.js';
import {normalizeCard, parseAbility, UNRESOLVED} from '../card-forge/cosmo-balance/normalize.js';
import {proposalsFor} from '../card-forge/cosmo-balance/proposals.js';
import {balanceToXlsx} from '../card-forge/cosmo-balance/export.js';
import {DEFAULT_CONFIG, stableHash, stableStringify} from '../card-forge/cosmo-balance/config.js';

const CATALOG = new URL('../data/cards.json', import.meta.url);
const INDEX = new URL('../card-forge/cosmo-balance/engine-index.json', import.meta.url);
const catalogText = readFileSync(CATALOG, 'utf8');
const catalog = JSON.parse(catalogText), index = JSON.parse(readFileSync(INDEX, 'utf8'));

let seq = 0;
const raw = (over = {}) => ({id: `t-${++seq}`, nome_exibicao_en: over.nome_exibicao_en || `CARD ${seq}`, faccao: 'Athena', tipo: 'Devotee', subtipos: ['Warrior'], raridade: 'Common', status: 'design-ready', cosmoble: true, custo: 3, unidade_custo: 'base_cosmo', soul: null, attack: null, awaken: null, power: 3, vida: 4, keywords_en: [], habilidades_en: [], habilidade_awaken_en: '', ultimate_en: '', ...over});
const god = (faccao, soul) => raw({id: `${faccao}-god`, tipo: 'God', faccao, custo: null, power: null, vida: null, soul, awaken: 5, subtipos: ['Olympian'], cosmoble: false});
const GODS = [god('Athena', 25), god('Poseidon', 26), god('Hades', 24), god('Artemis', 25), god('Ares', 21)];
const engine = (config = {}) => new CosmoBalanceEngine({config, engineIndex: {cards: {}, decks: {}}});
const ctxOf = (e, extra = []) => e.context([...GODS, ...extra]);
const score = (card, e = engine()) => e.scoreCard(card, ctxOf(e, [card]));
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('régua do §65: vanilla custo N, Power N, HP N+1 tem desvio zero', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const s = score(raw({custo: n, power: n, vida: n + 1}));
    near(s.scores.BodyScore, 0.6 * n + 0.4 * (n + 1));
    near(s.power - s.effectiveCost.total, 0); // RestrictionScore é zero em Warrior.
    assert.equal(s.confidenceLevel, 'alta');
    assert.equal(s.unresolved.length, 0);
  }
});

test('carta sem habilidade só pontua o corpo', () => {
  const s = score(raw({power: 2, vida: 5}));
  near(s.power, 0.6 * 2 + 0.4 * 5);
  assert.equal(s.scores.EffectScore, 0);
  assert.equal(s.scores.KeywordScore, 0);
  assert.equal(s.coverage, 1);
});

test('fórmula do corpo é configurável e vale só para Devotee', () => {
  const custom = engine({body: {attack: 0.5, hp: 0.5}});
  near(score(raw({power: 2, vida: 4}), custom).scores.BodyScore, 3);
  assert.equal(score(raw({tipo: 'Spell', subtipos: ['Moment'], power: null, vida: null}), custom).scores.BodyScore, 0);
});

test('múltiplas keywords somam, inclusive escritas no texto e no campo', () => {
  const one = score(raw({keywords_en: ['Guardian']})), two = score(raw({keywords_en: ['Guardian'], habilidades_en: ['Pierce, Long Range.']}));
  assert.ok(two.scores.KeywordScore > one.scores.KeywordScore);
  assert.deepEqual(new Set(two.keywords), new Set(['Guardian', 'Pierce', 'Long Range']));
  assert.equal(two.unresolved.length, 0);
});

test('Long Range vale mais em Attack alto (§25, §65)', () => {
  assert.ok(score(raw({power: 6, vida: 2, keywords_en: ['Long Range']})).scores.KeywordScore > score(raw({power: 1, vida: 7, keywords_en: ['Long Range']})).scores.KeywordScore);
});

test('ETB conta uma vez; contínuo não é multiplicado pela vida', () => {
  const a = parseAbility('When X enters the Battlefield, draw a card.', 'ability', {tipo: 'Devotee'});
  assert.equal(a.trigger, 'etb');
  const etb = score(raw({habilidades_en: ['When X enters the Battlefield, draw a card.']}));
  near(etb.scores.EffectScore, DEFAULT_CONFIG.effects.draw);
  const cont = score(raw({habilidades_en: ['Other friendly Warriors get +1 @ATK.']}));
  assert.equal(cont.abilities[0].kind, 'continuous');
  assert.equal(cont.abilities[0].uses, 1);
  assert.ok(cont.scores.EffectScore > 0);
});

test('condicional vale menos que o mesmo efeito incondicional', () => {
  const free = score(raw({habilidades_en: ['When X enters the Battlefield, draw a card.']})).scores.EffectScore;
  const cond = score(raw({habilidades_en: ['When X enters the Battlefield, if you control a Saint, draw a card.']}));
  assert.ok(cond.scores.EffectScore < free);
  assert.ok(cond.scores.ConsistencyScore < 1);
});

test('recorrência: once each round (§64) rende mais que once each cycle', () => {
  const round = score(raw({habilidades_en: ['Once each round, when X declares a Strike, draw a card.']})).scores.EffectScore;
  const cycle = score(raw({habilidades_en: ['Once each cycle, when X declares a Strike, draw a card.']})).scores.EffectScore;
  assert.ok(round > cycle && cycle > 0);
  assert.equal(parseAbility('Once each cycle, when X dies, draw a card.', 'ability', {tipo: 'Devotee'}).frequency, 'cycle');
});

test('ativada desconta o custo e nunca fica negativa por ser opcional', () => {
  const cheap = score(raw({habilidades_en: ['{1}{C}: Draw a card.']})).scores.EffectScore;
  const dear = score(raw({habilidades_en: ['{5}{C}: Draw a card.']}));
  assert.ok(cheap > dear.scores.EffectScore);
  assert.ok(dear.scores.EffectScore > 0);
  assert.equal(dear.scores.RestrictionScore, 0);
});

test('custo alternativo: Hidden Cosmo pontua pelo desconto e é tirado do texto', () => {
  const s = score(raw({custo: 6, power: 6, vida: 7, habilidades_en: ['Hidden Cosmo {3}']}));
  near(s.scores.KeywordScore, DEFAULT_CONFIG.keywords.hiddenCosmo.base + 3 * DEFAULT_CONFIG.keywords.hiddenCosmo.perDiscount);
  assert.equal(s.hiddenCosmo, 3);
  assert.equal(s.abilities.length, 0);
});

test('Afterlife: habilidade do Tartarus com chance e sem penalidade (§40)', () => {
  const a = score(raw({habilidades_en: ['Afterlife {2}{C}: Deal 2 damage to target enemy Devotee.']}));
  assert.equal(a.abilities[0].kind, 'afterlife');
  assert.equal(a.abilities[0].probability, DEFAULT_CONFIG.keywords.afterlife.probInTartarus);
  assert.equal(a.scores.RestrictionScore, 0);
});

test('custo adicional e sacrifício entram no custo efetivo', () => {
  const plain = score(raw({tipo: 'Spell', subtipos: ['Technique'], power: null, vida: null, habilidades_en: ['Draw two cards.']}));
  const extra = score(raw({tipo: 'Spell', subtipos: ['Technique'], power: null, vida: null, habilidades_en: ['As an additional cost, sacrifice a Devotee.', 'Draw two cards.']}));
  assert.ok(extra.effectiveCost.total > plain.effectiveCost.total);
  assert.equal(extra.effectiveCost.additional, Math.abs(DEFAULT_CONFIG.effects.sacrificeSelf));
});

test('sacrifício obrigatório só penaliza uma vez, mesmo em gatilho recorrente', () => {
  const s = score(raw({habilidades_en: ['Whenever X declares a Strike, defeat X.']}));
  assert.ok(s.scores.RestrictionScore <= Math.abs(DEFAULT_CONFIG.effects.sacrificeSelf));
  assert.ok(s.scores.RestrictionScore > 0);
});

test('sinergia cresce com o catálogo real da tribo e combo nomeado pontua', () => {
  const e = engine();
  const member = i => raw({id: `m${i}`, subtipos: ['Bronze Saint']});
  const anthem = raw({habilidades_en: ['Friendly Bronze Saints get +1 @ATK.']});
  const none = e.scoreCard(anthem, ctxOf(e, [anthem]));
  const many = e.scoreCard(anthem, ctxOf(e, [anthem, ...Array.from({length: 8}, (_, i) => member(i))]));
  assert.ok(many.scores.SynergyScore > none.scores.SynergyScore);
  const cloth = raw({tipo: 'Equipment', subtipos: ['Cloth'], power: null, vida: null, categoria_equipamento: 'Armor', bonus_poder: 1, bonus_vida: 2, equipar_custo_outros: 3, donos: ['x'], habilidades_en: ['Resonance — Pegasus Seiya: When Pegasus Seiya declares a Strike, draw a card.']});
  assert.equal(score(cloth).scores.SynergyScore, DEFAULT_CONFIG.synergy.namedPair);
});

test('raridade não pontua', () => {
  const s = {};
  for (const r of ['Common', 'Uncommon', 'Legendary', 'Divine']) s[r] = score(raw({raridade: r, id: 'same'}));
  assert.equal(s.Common.power, s.Legendary.power);
  assert.equal(s.Common.power, s.Divine.power);
});

test('neutra compara Soul contra a média dos Gods e pagar Soul pesa conforme o God', () => {
  const e = engine(), ctx = ctxOf(e);
  assert.ok(e.soulValue(ctx, 'Neutral', true) != null);
  const pay = f => e.scoreCard(raw({faccao: f, habilidades_en: ['When X enters the Battlefield, your God loses {3}{S}.']}), ctx).scores.RestrictionScore;
  assert.ok(pay('Ares') > pay('Poseidon'), 'Ares tem 21 de Soul; Poseidon, 26');
});

test('Soul real de cada God: God não recebe valor igual para todos e dano à Soul varia pelo alvo', () => {
  const e = engine(), ctx = ctxOf(e);
  assert.notEqual(e.scoreCard(GODS[4], ctx).scores.BodyScore, e.scoreCard(GODS[1], ctx).scores.BodyScore);
  assert.notEqual(e.soulValue(ctx, 'Ares', true), e.soulValue(ctx, 'Poseidon', true));
  const real = new CosmoBalanceEngine({engineIndex: index}).context(catalog.cartas);
  assert.deepEqual(real.souls, {Athena: 25, Poseidon: 26, Hades: 24, Artemis: 25, Ares: 21});
});

test('dano à Soul e dano ao próprio God têm sinais opostos (letal e custo)', () => {
  const hit = score(raw({habilidades_en: ['When X enters the Battlefield, deal 3 damage to target enemy God.']}));
  assert.ok(hit.scores.EffectScore > 0);
  const self = score(raw({habilidades_en: ['When X enters the Battlefield, deal 3 damage to your God.']}));
  assert.ok(self.scores.RestrictionScore > 0);
  assert.equal(self.scores.EffectScore, 0);
});

test('Equipment soma bônus e cobra Equip conforme haja Resonance (§28, §33)', () => {
  const free = score(raw({tipo: 'Equipment', subtipos: ['Weapon'], power: null, vida: null, bonus_poder: 2, bonus_vida: 0, equipar_custo_outros: 2}));
  const owned = score(raw({tipo: 'Equipment', subtipos: ['Cloth'], power: null, vida: null, bonus_poder: 2, bonus_vida: 0, equipar_custo_outros: 2, donos: ['seiya']}));
  near(free.scores.BodyScore, 1.2 * DEFAULT_CONFIG.equipment.bearerFactor);
  assert.ok(free.effectiveCost.total > owned.effectiveCost.total);
});

test('Domain não tem custo de entrada e é comparado aos pares (§63); Moment ganha timing até 3 de custo (§5, §56)', () => {
  const e = engine();
  const domains = [1, 2, 3].map(i => raw({id: `d${i}`, tipo: 'Domain', custo: 3, power: null, vida: null, subtipos: ['Arena'], habilidades_en: [`Once each round, {${i}}{C}: Draw a card.`]}));
  const result = e.analyze([...GODS, ...domains]);
  const d = result.cards.find(c => c.id === 'd1');
  assert.equal(d.effectiveCost, null);
  assert.equal(d.peerCompared, true);
  assert.ok(result.cards.find(c => c.id === 'd1').power > result.cards.find(c => c.id === 'd3').power);
  const spell = c => score(raw({tipo: 'Spell', subtipos: ['Moment'], power: null, vida: null, custo: c, habilidades_en: ['Draw a card.']})).scores.TimingScore;
  assert.ok(spell(3) > 0);
  assert.equal(spell(4), 0);
});

test('informação insuficiente: nada de valor inventado', () => {
  const e = engine();
  const noStats = raw({id: 'sem-corpo', power: null, vida: null});
  const gibberish = raw({id: 'sem-leitura', habilidades_en: ['Blorbo the quantum wibble of Gemini.', 'Another unknown clause applies here.']});
  const noCost = raw({id: 'sem-custo', custo: null});
  const r = e.analyze([...GODS, noStats, gibberish, noCost]);
  const by = id => r.cards.find(c => c.id === id);
  assert.equal(by('sem-corpo').power, null);
  assert.equal(by('sem-corpo').classification, CLASSES.UNKNOWN);
  assert.equal(by('sem-leitura').classification, CLASSES.UNKNOWN);
  assert.equal(by('sem-leitura').scores.EffectScore, 0, 'frase UNRESOLVED não recebe valor');
  assert.equal(by('sem-leitura').unresolved.length, 2);
  assert.equal(by('sem-custo').classification, CLASSES.UNKNOWN);
  const parsed = parseAbility('Blorbo the quantum wibble.', 'ability', {tipo: 'Devotee'});
  assert.equal(parsed.sentences[0].status, UNRESOLVED);
  assert.equal(parsed.effects.length, 0);
});

test('faixas configuráveis: ±10% e ±25% classificam e podem mudar', () => {
  const e = engine();
  assert.equal(e.classify(0.05), CLASSES.OK);
  assert.equal(e.classify(0.2), CLASSES.ABOVE);
  assert.equal(e.classify(0.5), CLASSES.BROKEN);
  assert.equal(e.classify(-0.2), CLASSES.BELOW);
  assert.equal(e.classify(-0.5), CLASSES.WEAK);
  assert.equal(engine({bands: {near: 0.3, relevant: 0.6}}).classify(0.2), CLASSES.OK);
});

test('normalização não muda ids nem campos da carta bruta', () => {
  const before = stableStringify(catalog.cartas);
  const inventory = catalog.cartas.map(normalizeCard);
  assert.equal(stableStringify(catalog.cartas), before);
  assert.deepEqual(inventory.map(c => c.id), catalog.cartas.map(c => c.id));
  assert.equal(new Set(inventory.map(c => c.id)).size, catalog.cartas.length);
});

test('catálogo real: todas as cartas analisadas, determinismo e versões registradas', () => {
  const run = () => new CosmoBalanceEngine({engineIndex: index, seed: 7}).analyze(catalog.cartas, catalog);
  const a = run(), b = run();
  assert.equal(stableStringify(a.cards), stableStringify(b.cards));
  assert.equal(stableHash(a.cards), stableHash(b.cards));
  assert.equal(a.cards.length, catalog.cartas.length);
  assert.equal(a.summary.total, catalog.total_cartas);
  assert.equal(a.meta.seed, 7);
  assert.equal(a.meta.catalogVersion, catalog.versao_catalogo);
  for (const key of ['engineVersion', 'catalogHash', 'configHash', 'engineIndexHash']) assert.ok(a.meta[key], key);
  assert.equal(a.meta.canonical, false);
  const sum = Object.values(a.summary.classes).reduce((x, y) => x + y, 0);
  assert.equal(sum, a.cards.length);
  for (const c of a.cards) {
    if (c.status === 'cortado') assert.equal(c.classification, CLASSES.UNKNOWN);
    if (c.classification !== CLASSES.UNKNOWN) assert.ok(Number.isFinite(c.power) && Number.isFinite(c.normalizedDeviation), c.id);
    for (const v of Object.values(c.scores)) assert.ok(v === null || Number.isFinite(v), c.id);
  }
});

test('propostas: não alteram a carta, comparam com a mesma base e trazem até 3 correções', () => {
  const e = new CosmoBalanceEngine({engineIndex: index});
  const before = JSON.stringify(catalog.cartas);
  const r = e.analyze(catalog.cartas, catalog);
  const flagged = r.cards.filter(c => c.classification === CLASSES.BROKEN || c.classification === CLASSES.WEAK).slice(0, 25);
  assert.ok(flagged.length);
  for (const c of flagged) {
    const p = proposalsFor(e, c, catalog.cartas, r);
    assert.ok(p.corrections.length <= 3);
    assert.ok(p.diagnosis && p.strategicImpact && p.confidence);
    assert.ok(p.similar.every(s => s.id !== c.id));
    for (const fix of p.corrections) {
      assert.equal(fix.hypothetical, true);
      assert.ok(Math.abs(fix.deviationAfter) < Math.abs(fix.deviationBefore));
    }
  }
  assert.equal(JSON.stringify(catalog.cartas), before);
});

test('o motor não grava no catálogo nem importa escrita de arquivo', () => {
  assert.equal(readFileSync(CATALOG, 'utf8'), catalogText);
  for (const f of ['engine.js', 'normalize.js', 'proposals.js', 'config.js', 'dashboard.js']) {
    const text = readFileSync(new URL(`../card-forge/cosmo-balance/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /node:fs|writeFile|localStorage|method:\s*['"]POST/, f);
  }
});

test('Excel: uma linha por carta da tela, com nota, proposta e sem tocar no catálogo', () => {
  const e = new CosmoBalanceEngine({engineIndex: index});
  const before = JSON.stringify(catalog.cartas);
  const result = e.analyze(catalog.cartas, catalog);
  const forte = result.cards.find(c => c.classification === 'Potencialmente quebrada');
  const text = new TextDecoder().decode(balanceToXlsx(e, [forte, result.cards[0]], catalog.cartas, result));
  assert.equal((text.match(/<row /g) || []).length, 3);
  for (const t of ['Desvio %', 'Correções (não aplicadas)', forte.id, 'Potencialmente quebrada']) assert.ok(text.includes(t), t);
  assert.ok(text.includes(`<v>${Math.round(forte.normalizedDeviation * 100)}</v>`));
  assert.equal(JSON.stringify(catalog.cartas), before);
});
