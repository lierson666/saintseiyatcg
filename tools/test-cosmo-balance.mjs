// Testes do CosmoBalanceEngine. Usa cartas sintéticas e, só para leitura, o catálogo real.
// node --test tools/test-cosmo-balance.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CosmoBalanceEngine, CLASSES} from '../card-forge/cosmo-balance/engine.js';
import {normalizeCard, parseAbility, UNRESOLVED} from '../card-forge/cosmo-balance/normalize.js';
import {proposalsFor} from '../card-forge/cosmo-balance/proposals.js';
import {balanceToXlsx} from '../card-forge/cosmo-balance/export.js';
import {DEFAULT_CONFIG, ENGINE_VERSION, stableHash, stableStringify} from '../card-forge/cosmo-balance/config.js';
import {unresolvedLedger} from '../card-forge/cosmo-balance/engine.js';
import {EFFECT_LIBRARY, KIT_NOT_EFFECTS} from '../card-forge/cosmo-balance/effect-library.js';
import {applyPatch, revertPatch, validatePatch, validateProposal, compareProposal, transition, NEEDS_REVIEW, VALIDATED, SCENARIOS} from '../card-forge/cosmo-balance/patches.js';
import {applyCostOverlay, applyEngineOverrides, OVERRIDE_KEYS} from './cosmo-balance-overrides.mjs';
import {plan, wilson, scenarioKeys} from './cosmo-balance-sim.mjs';

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
  near(etb.scores.EffectScore, DEFAULT_CONFIG.effects.draw * DEFAULT_CONFIG.effectScale.Devotee);
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
  assert.equal(d.effectiveCost.entry, 0, 'Sem custo de entrada (§63)');
  assert.equal(d.relativeDeviation != null, true);
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

// ---------- 1.1: matemática, Domains, Gods, leitura pendente, patches, isolamento ----------
const PATCH = JSON.parse(readFileSync(new URL('../card-forge/cosmo-balance/patches/balance-patch-001.json', import.meta.url), 'utf8'));
const realEngine = () => new CosmoBalanceEngine({engineIndex: index});
const analyzeReal = () => realEngine().analyze(catalog.cartas, catalog);

test('desvio: fórmula do autor, sinal e epsilon', () => {
  const e = engine();
  const pos = e.deviationOf(3, 2), neg = e.deviationOf(0.4, 1.4), small = e.deviationOf(1, 0.1);
  near(pos.absolute, 1); near(pos.relative, 0.5);
  near(neg.absolute, -1); near(neg.relative, -1 / 1.4);
  near(small.relative, 0.9 / DEFAULT_CONFIG.bands.epsilon, 1e-6);
  assert.equal(e.classify(neg.relative), CLASSES.WEAK);
  assert.notEqual(e.classify(neg.relative), CLASSES.BROKEN);
  near(engine({bands: {epsilon: 2}}).deviationOf(1, 0.1).relative, 0.45);
});

test('custo zero: tratado à parte, com faixas absolutas', () => {
  const e = engine();
  const free = c => e.analyze([...GODS, raw({id: 'zero', tipo: 'Spell', subtipos: ['Technique'], power: null, vida: null, custo: 0, cosmoble: true, ...c})]).cards.find(x => x.id === 'zero');
  const zeroEngine = engine({cardOpportunity: 0});
  const a = zeroEngine.analyze([...GODS, raw({id: 'z', tipo: 'Spell', subtipos: ['Technique'], power: null, vida: null, custo: 0, habilidades_en: ['Draw two cards.']})]).cards.find(x => x.id === 'z');
  assert.equal(a.zeroCost, true);
  assert.equal(a.classification, CLASSES.BROKEN);
  assert.equal(free({}).effectiveTotal, DEFAULT_CONFIG.cardOpportunity);
});

test('catálogo real: nenhum desvio negativo vira excesso; A Coin for the Ferryman deixa de ser quebrada', () => {
  const r = analyzeReal();
  assert.equal(r.summary.signConflicts, 0);
  for (const c of r.cards) {
    if (c.absoluteDeviation < 0) assert.ok(![CLASSES.ABOVE, CLASSES.BROKEN].includes(c.classification), c.id);
    if (c.absoluteDeviation > 0) assert.ok(![CLASSES.BELOW, CLASSES.WEAK].includes(c.classification), c.id);
    if (c.absoluteDeviation != null && c.effectiveTotal != null) near(c.absoluteDeviation, c.power - c.effectiveTotal, 0.002);
  }
  const coin = r.cards.find(c => c.id === 'hades-v6-227');
  assert.ok(coin.absoluteDeviation < 0);
  assert.notEqual(coin.classification, CLASSES.BROKEN);
  assert.equal(coin.abilities[0].uses, 1, 'sacrifica a si mesma: um uso');
});

test('Domains: avaliador próprio, sem custo fixo, slot por facção e custo de entrada configurável', () => {
  const r = analyzeReal();
  const domains = r.cards.filter(c => c.type === 'Domain' && c.status !== 'cortado');
  assert.equal(r.cards.filter(c => c.type === 'Domain').length, 33);
  assert.ok(new Set(domains.map(c => c.effectiveTotal)).size > 5, 'custo efetivo varia');
  for (const d of domains) {
    assert.ok(d.domainProfile && d.effectiveCost.slotOpportunity != null, d.id);
    assert.equal(d.effectiveCost.entry, 0);
    near(d.domainProfile.general + d.domainProfile.resonance, d.domainProfile.continuous + d.domainProfile.triggered + d.domainProfile.activated, 0.01);
  }
  const printed = new CosmoBalanceEngine({engineIndex: index, config: {domain: {entryCostSource: 'printed'}}}).analyze(catalog.cartas, catalog).cards.find(c => c.id === 'hades-v6-245');
  assert.equal(printed.effectiveCost.entry, catalog.cartas.find(c => c.id === 'hades-v6-245').custo);
});

test('Gods: sem custo artificial, perfil com Soul real, sem Attack e sem proposta', () => {
  const r = analyzeReal(), gods = r.cards.filter(c => c.type === 'God');
  assert.equal(gods.length, 5);
  for (const g of gods) {
    assert.equal(g.effectiveCost, null);
    assert.equal(g.relativeDeviation, null);
    assert.equal(g.classification, CLASSES.UNKNOWN);
    assert.equal(g.godProfile.attack, null);
    assert.equal(g.godProfile.soul, g.soul);
    assert.ok(g.godProfile.proposalsBlocked);
  }
  assert.ok(new Set(gods.map(g => JSON.stringify(g.godProfile.axes))).size === 5);
});

test('efeitos não resolvidos: estado, INCONCLUSIVE e ledger completo', () => {
  const r = analyzeReal();
  const ledger = unresolvedLedger(r.cards, index);
  const pending = r.cards.filter(c => c.unresolved.length);
  assert.ok(pending.length);
  for (const c of pending) { assert.equal(c.state, 'UNRESOLVED'); assert.equal(c.classification, CLASSES.UNKNOWN, c.id); }
  for (const l of ledger) for (const f of ['id', 'text', 'engine', 'reason', 'evaluation']) assert.ok(l[f], f);
  assert.equal(ledger.filter(l => l.state === 'UNRESOLVED').length, r.summary.unresolvedSentences);
  const verb = parseAbility('Target friendly Saint gets +1 @ATK, then draw from the well.', 'ability', {tipo: 'Devotee'});
  assert.equal(verb.sentences[0].status, 'PARTIAL');
});

test('contexto: Impulse e Pierce valem pelo corpo, Training supera bônus temporário, alvos restritos valem menos', () => {
  const kw = (k, atk, hp) => score(raw({power: atk, vida: hp, keywords_en: [k]})).scores.KeywordScore;
  assert.ok(kw('Impulse', 6, 3) > kw('Impulse', 1, 3) * 2);
  assert.ok(kw('Pierce', 7, 3) > kw('Pierce', 2, 3) * 2);
  const e = engine();
  const realCtx = new CosmoBalanceEngine({engineIndex: index}).context(catalog.cartas);
  const fx = t => e.scoreCard(raw({habilidades_en: [t]}), realCtx).scores.EffectScore;
  assert.ok(fx('When X enters the Battlefield, put a @Training counter on target friendly Devotee.') > fx('When X enters the Battlefield, target friendly Devotee gets +1 @ATK / +1 @HP until the end of your round.'));
  assert.ok(fx('When X enters the Battlefield, defeat target enemy Devotee.') > fx('When X enters the Battlefield, defeat target enemy Devotee with cost 1 or less.'));
  assert.ok(realCtx.devotees.atks.length > 100);
});

test('custos alternativos, keywords combinadas e buff recorrente seguem medidos', () => {
  const hidden = score(raw({custo: 5, power: 5, vida: 6, keywords_en: ['Pierce', 'Impulse'], habilidades_en: ['Hidden Cosmo {2}']}));
  assert.ok(hidden.scores.KeywordScore > DEFAULT_CONFIG.keywords.hiddenCosmo.base);
  assert.deepEqual(hidden.interactions.map(i => i.id), ['impulse_pierce']);
  const every = score(raw({habilidades_en: ['At the beginning of your round, X gets +1 @ATK until the end of your round.']})).scores.EffectScore;
  const once = score(raw({habilidades_en: ['When X enters the Battlefield, X gets +1 @ATK until the end of your round.']})).scores.EffectScore;
  assert.ok(every > once);
});

test('interações não são soma simples e registram contribuição', () => {
  const c = score(raw({habilidades_en: ['Put a @Training counter on target friendly Devotee.', 'Put the top card of your deck into your Cosmo Bank as a Cosmo Base.', 'Friendly Warriors with a @Training counter get +1 @ATK.'], tipo: 'Spell', subtipos: ['Technique'], power: null, vida: null}));
  const ids = c.interactions.map(i => i.id);
  assert.ok(ids.includes('training_ramp') && ids.includes('training_global'));
  const sum = c.interactions.reduce((n, i) => n + i.value, 0);
  assert.ok(c.scores.SynergyScore < sum + 1e-9, 'saturação');
  assert.ok(c.scores.SynergyScore > Math.max(...c.interactions.map(i => i.value)));
  assert.ok(c.scores.SynergyScore <= DEFAULT_CONFIG.synergy.cap);
});

test('biblioteca cobre todo efeito lido e toda ação de kit.js', () => {
  const r = analyzeReal();
  for (const c of r.cards) for (const k of c.kinds) assert.ok(EFFECT_LIBRARY[k], k);
  const kit = readFileSync(new URL('../playtest/engine-v3/v6/kit.js', import.meta.url), 'utf8');
  const exported = [...kit.matchAll(/^export (?:const|function) (\w+)/gm)].map(m => m[1]);
  const mapped = new Set(Object.values(EFFECT_LIBRARY).flatMap(e => e.engine));
  const orphan = exported.filter(n => !mapped.has(n) && !KIT_NOT_EFFECTS.has(n));
  assert.deepEqual(orphan, []);
});

test('patch: as 11 propostas validam contra o catálogo e divergência vira NEEDS_REVIEW', () => {
  const v = validatePatch(PATCH, catalog.cartas, index);
  assert.equal(v.length, 11);
  assert.deepEqual(v.filter(x => x.status !== VALIDATED).map(x => x.key), []);
  assert.equal(PATCH.proposals.filter(p => p.group === 'A').length, 8);
  assert.equal(PATCH.proposals.filter(p => p.group === 'B').length, 3);
  const wrongCost = {...PATCH.proposals[0], changes: [{field: 'custo', from: 9, to: 2}]};
  assert.equal(validateProposal(wrongCost, catalog.cartas, index).status, NEEDS_REVIEW);
  const wrongText = {...PATCH.proposals[2], changes: [{field: 'habilidades_en', match: 'up to +9/+9', replace: 'x'}]};
  assert.equal(validateProposal(wrongText, catalog.cartas, index).status, NEEDS_REVIEW);
  assert.equal(validateProposal({...PATCH.proposals[0], cardId: 'nao-existe'}, catalog.cartas, index).status, NEEDS_REVIEW);
  const bad = {...PATCH, proposals: [wrongCost]};
  const applied = applyPatch(catalog.cartas, bad, {env: 'developer', engineIndex: index});
  assert.deepEqual(applied.active, []);
  assert.deepEqual(applied.skipped, ['001']);
});

test('patch: versiona, preserva o original e reverte exatamente; só Developer carrega', () => {
  const before = stableStringify(catalog.cartas);
  assert.throws(() => applyPatch(catalog.cartas, PATCH, {env: 'official'}), /Developer/);
  assert.throws(() => applyPatch(catalog.cartas, PATCH, {}), /Developer/);
  const {cards, active, versions} = applyPatch(catalog.cartas, PATCH, {env: 'developer', engineIndex: index});
  assert.equal(active.length, 11);
  assert.equal(versions.length, 11);
  assert.equal(stableStringify(catalog.cartas), before);
  const spearman = cards.find(c => c.id === 'poseidon-v6-107');
  assert.equal(spearman.custo, 2);
  assert.equal(spearman.power, catalog.cartas.find(c => c.id === 'poseidon-v6-107').power);
  assert.match(new CosmoBalanceEngine({engineIndex: index}).analyze(cards, catalog).cards.find(c => c.id === spearman.id).cardVersion, /BALANCE-PATCH-001-EXPERIMENTAL#006/);
  assert.equal(new CosmoBalanceEngine({engineIndex: index}).analyze(catalog.cartas, catalog).cards.find(c => c.id === spearman.id).cardVersion, `${spearman.id}@canon`);
  assert.ok(cards.find(c => c.id === 'artemis-v6-405').habilidades_en.some(t => t.includes('up to +2/+2')));
  assert.ok(cards.find(c => c.id === 'artemis-v6-405').habilidades_pt.some(t => t.includes('até +2 @ATQ / +2 @PV')));
  assert.equal(stableStringify(revertPatch(cards, PATCH)), before);
  assert.deepEqual(applyPatch(catalog.cartas, PATCH, {env: 'developer', groups: ['A'], engineIndex: index}).active, ['001', '002', '003', '004', '005', '006', '007', '008']);
});

test('patch: toda proposta muda a nota na direção pedida, sem mover a curva', () => {
  const e = realEngine(), r = e.analyze(catalog.cartas, catalog);
  for (const p of PATCH.proposals) {
    const c = compareProposal(e, p, catalog.cartas, r);
    assert.ok(c, p.key);
    assert.notEqual(`${c.after.power}|${c.after.effective}`, `${c.before.power}|${c.before.effective}`, `${p.key} não mexe no modelo`);
    const nerfGroup = ['001', '002', '003', '004', '005', '006', '007', '008'];
    if (nerfGroup.includes(p.key)) assert.ok(c.after.relative < c.before.relative, p.key);
    else assert.ok(c.after.relative > c.before.relative, p.key);
  }
});

test('patch: fluxo de status, sem pular, sem publicar, aprovação humana', () => {
  const v = validatePatch(PATCH, catalog.cartas, index), who = {by: 'Lierson', date: '2026-11-04'};
  assert.throws(() => transition(PATCH, 'APPROVED', who), /só se vai/);
  assert.throws(() => transition(PATCH, 'READY_FOR_TEST', {date: '2026-11-04', validations: v}), /quem e quando/);
  assert.throws(() => transition(PATCH, 'READY_FOR_TEST', who), /validar/);
  const ready = transition(PATCH, 'READY_FOR_TEST', {...who, validations: v});
  assert.equal(ready.history.length, PATCH.history.length + 1);
  assert.equal(PATCH.status, 'DRAFT');
  assert.throws(() => transition(ready, 'TESTED', who), /simulação/);
  const tested = transition({...ready, simulation: {runs: [{}]}}, 'TESTED', who);
  assert.throws(() => transition(tested, 'APPROVED', {by: 'Claude', date: 'x'}), /humana/);
  const approved = transition(tested, 'APPROVED', who);
  assert.equal(approved.approval.by, 'Lierson');
  assert.throws(() => transition(approved, 'PUBLISHED', who), /não existe/);
  assert.equal(transition(approved, 'DRAFT', who).approval, null);
  assert.equal(PATCH.status, 'DRAFT', 'o patch registrado começa em DRAFT');
});

test('isolamento: nada oficial importa o Cosmo Balance e a simulação restaura a memória', async () => {
  const {execFileSync} = await import('node:child_process');
  const root = new URL('..', import.meta.url).pathname;
  // grep sai com 1 quando não acha nada: é o resultado esperado.
  const hits = execFileSync('sh', ['-c', "grep -rlE 'cosmo-balance|BALANCE-PATCH' playtest shared data sanctuary-api arena-server tools/publish-game.sh tools/simulate-v3.mjs --include='*.js' --include='*.mjs' --include='*.json' --include='*.sh' || true"], {cwd: root, encoding: 'utf8'}).trim();
  assert.equal(hits, '');
  assert.equal(stableStringify(catalog.cartas), stableStringify(JSON.parse(readFileSync(CATALOG, 'utf8')).cartas));
});

test('simulação: cenários, overlay e overrides com o motor real, reversíveis', async () => {
  await import('../playtest/engine-v3/v6/hooks.js');
  const {V6} = await import('../playtest/engine-v3/v6/registry.js');
  assert.deepEqual(scenarioKeys(PATCH, 'A'), []);
  assert.equal(scenarioKeys(PATCH, 'B').length, 8);
  assert.equal(scenarioKeys(PATCH, 'C').length, 11);
  assert.deepEqual(scenarioKeys(PATCH, 'A+006'), ['006']);
  assert.equal(scenarioKeys(PATCH, 'C-006').length, 10);
  assert.deepEqual(Object.keys(SCENARIOS), ['A', 'B', 'C']);
  assert.deepEqual([...OVERRIDE_KEYS].sort(), PATCH.proposals.filter(p => p.engine === 'override').map(p => p.key));
  assert.deepEqual(plan([{}, {}], 2, 1).map(j => j.first), ['A', 'B', 'A', 'B']);
  assert.equal(plan([{}, {}], 1, 1)[0].seed, plan([{}, {}], 1, 1)[1].seed, 'iniciativa espelhada com a mesma semente');
  const [lo, hi] = wilson(5, 10);
  assert.ok(lo < 0.5 && hi > 0.5);
  const originals = {mods: V6['artemis-v6-405'].mods};
  const undo = applyEngineOverrides(V6, OVERRIDE_KEYS);
  assert.notEqual(V6['artemis-v6-405'].mods, originals.mods);
  undo();
  assert.equal(V6['artemis-v6-405'].mods, originals.mods);
  const stub = {'artemis-v6-405': {mods: () => [{atk: 3, hp: 3}]}, 'artemis-v6-384': {mods: () => [{atk: 1, hp: 1}]}};
  applyEngineOverrides(stub, ['003', '005']);
  assert.deepEqual(stub['artemis-v6-405'].mods(), [{atk: 2, hp: 2}], 'teto novo');
  assert.deepEqual(stub['artemis-v6-384'].mods(), [{atk: 1, hp: 1}], 'abaixo do teto fica igual');
  const cards = new Map([['poseidon-v6-107', {cost: {amount: 1, unit: 'base'}}]]);
  const uncost = applyCostOverlay(cards, {proposals: [PATCH.proposals.find(p => p.key === '006')]}, ['006']);
  assert.equal(cards.get('poseidon-v6-107').cost.amount, 2);
  uncost();
  assert.equal(cards.get('poseidon-v6-107').cost.amount, 1);
  assert.throws(() => applyCostOverlay(new Map([['poseidon-v6-107', {cost: {amount: 3}}]]), {proposals: [PATCH.proposals.find(p => p.key === '006')]}, ['006']), /NEEDS_REVIEW/);
});

test('versão registrada é a 1.1', () => { assert.equal(ENGINE_VERSION, '1.1.0'); assert.equal(analyzeReal().meta.engineVersion, '1.1.0'); });
