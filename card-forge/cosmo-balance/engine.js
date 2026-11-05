// CosmoBalanceEngine 1.0: pontuação experimental de cartas, só para o ambiente Developer. Não grava nada.
// PowerScore = Body + Keyword + Effect + Synergy + Timing + Interaction - Restriction (pedido do autor).
// ConsistencyScore fica fora da soma: é a chance ponderada de os efeitos acontecerem e alimenta a incerteza.
// Raridade é lida e nunca pontua. Soul usa o valor real da carta de cada God em data/cards.json.
import {DEFAULT_CONFIG, ENGINE_VERSION, mergeConfig, stableHash} from './config.js';
import {normalizeCard, UNRESOLVED, PARTIAL, KEYWORDS, clean} from './normalize.js';
import {engineCallsOf} from './effect-library.js';

export const CLASSES = {
  WEAK: 'Muito fraca', BELOW: 'Abaixo da curva', OK: 'Balanceada', ABOVE: 'Acima da curva', BROKEN: 'Potencialmente quebrada', UNKNOWN: 'Análise inconclusiva',
};
export const CLASS_ORDER = [CLASSES.WEAK, CLASSES.BELOW, CLASSES.OK, CLASSES.ABOVE, CLASSES.BROKEN, CLASSES.UNKNOWN];

const TRIGGER_HOOK = {
  leaves: ['leaves', 'bearerDefeated', 'defeated'], etb: ['enter'], cast: ['cast', 'enter', 'attach'], defeated: ['defeated'], bearerDefeated: ['bearerDefeated'], watchDefeat: ['watchDefeat', 'tartarus', 'watchKill'], declare: ['declare', 'gearDeclare'], watchDeclare: ['watchDeclare'], enemyDeclare: ['watchDeclare'],
  combatDamage: ['combatDamage', 'gearCombatDamage', 'prevent', 'gearPrevent', 'tookDamage', 'gearTookDamage', 'watchTookDamage', 'damagePrevented', 'watchDamagePrevented', 'declare', 'gearDeclare'], kill: ['killInCombat', 'gearKillInCombat', 'watchKill'], survive: ['survive', 'gearSurvive', 'watchSurvive'], godDamage: ['godDamage', 'gearGodDamage'], startRound: ['startTurn'], endRound: ['endTurn'],
  spellWatch: ['watchSpell'], discardWatch: ['watchDiscard'], sealWatch: ['watchSealed', 'watchSealRemoved'], millWatch: ['watchMill'], attachWatch: ['attach', 'watchAttach', 'watchEquipCast'], sacrificeWatch: ['watchDefeat'], watchEnter: ['watchEnter'],
};
const ANSWERS = new Set(['counterSpell', 'removal', 'exile', 'bounce', 'seal', 'silence', 'forbid', 'exhaust', 'discard', 'latentEnemy']);
const LEGAL_TARGET = new Set(['removal', 'damage', 'bounce', 'seal', 'exhaust', 'exile', 'forbid', 'reanimate', 'recurHand']);
const WARRIOR = /Saint|Marina|Marine|Satellite|Specter|Berserker/;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const round3 = x => (x == null ? null : Math.round(x * 1000) / 1000);
const median = list => { if (!list.length) return null; const s = [...list].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export class CosmoBalanceEngine {
  constructor({config = {}, engineIndex = null, seed = 1} = {}) {
    this.config = mergeConfig(config);
    this.engineIndex = engineIndex || {cards: {}, decks: {}, sourceHash: null};
    this.seed = seed; // sem sorteio hoje; registrado para a futura simulação usar a mesma origem.
  }

  // Contexto vindo do catálogo inteiro: Soul real por God e contagens de subtipo por facção.
  context(rawCards) {
    const norm = rawCards.map(normalizeCard);
    const souls = {};
    for (const c of norm) if (c.type === 'God' && c.soul != null) souls[c.faction] = c.soul;
    const values = Object.values(souls);
    const meanSoul = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const tribes = {}, mechanics = {}, names = new Set(), etb = {};
    const live = norm.filter(c => c.type === 'Devotee' && c.status !== 'cortado' && c.attack != null && c.hp != null);
    for (const c of norm) {
      names.add(clean(c.name).toLowerCase());
      for (const s of c.subtypes) { const k = `${c.faction}|${s.toLowerCase()}`; tribes[k] = (tribes[k] || 0) + 1; }
      for (const a of c.abilities) for (const f of a.effects) { const k = `${c.faction}|${f.kind}`; mechanics[k] = (mechanics[k] || 0) + 1; }
      if (c.type === 'Devotee' && c.abilities.some(a => a.trigger === 'etb')) etb[c.faction] = (etb[c.faction] || 0) + 1;
    }
    const devotees = {costs: live.map(c => c.cost ?? 0), atks: live.map(c => c.attack), hps: live.map(c => c.hp)};
    return {souls, meanSoul, tribes, mechanics, names, etb, devotees, medianHp: median(devotees.hps) ?? 4};
  }

  soulValue(ctx, faction, enemy) {
    const {effects} = this.config;
    const k = enemy ? effects.damageGodKFactor : effects.soulSelfKFactor;
    let soul;
    if (enemy) { // média dos adversários possíveis: 1 de Soul pesa mais contra quem tem menos.
      const list = Object.entries(ctx.souls).filter(([f]) => f !== faction).map(([, v]) => v);
      soul = list.length ? list.reduce((a, b) => a + b, 0) / list.length : ctx.meanSoul;
    } else soul = ctx.souls[faction] ?? ctx.meanSoul;
    return soul ? k / soul : null;
  }

  // Valor em contexto: Impulse e Long Range sobem com o Attack; Pierce, com o excesso possível sobre o HP mediano do catálogo.
  keywordValue(name, body = {atk: 3, hp: 4}, ctx = null) {
    const k = this.config.keywords[name];
    if (!k) return 0;
    const excess = Math.max(0, (body.atk ?? 0) - (ctx?.medianHp ?? 4));
    return k.base + (k.perAtk || 0) * (body.atk ?? 0) + (k.perHp || 0) * (body.hp ?? 0) + (k.perExcess || 0) * excess;
  }

  // Parte do catálogo que o texto permite mirar ("with cost 2 or less", "ATK 4 or more"). Sem filtro: 1.
  legalShare(sentence, ctx) {
    const d = ctx.devotees;
    if (!d?.atks.length) return 1;
    const rules = [[/(?:casting )?cost (\d+) or less/i, d.costs, (v, n) => v <= n], [/(?:casting )?cost (\d+) or (?:more|greater)/i, d.costs, (v, n) => v >= n], [/ATK (\d+) or less/i, d.atks, (v, n) => v <= n], [/ATK (\d+) or (?:more|greater)/i, d.atks, (v, n) => v >= n], [/HP (\d+) or less/i, d.hps, (v, n) => v <= n], [/HP (\d+) or (?:more|greater)/i, d.hps, (v, n) => v >= n]];
    let share = 1;
    for (const [re, list, test] of rules) { const m = re.exec(sentence); if (m) share *= list.filter(v => test(v, Number(m[1]))).length / list.length; }
    return share;
  }

  // Valor por uso de um efeito, sem frequência. null = desconhecido (nunca chutado).
  effectBase(fx, ability, card, ctx) {
    const E = this.config.effects, K = this.config.keywords, amt = fx.amount ?? 1, faction = card.faction;
    const soulE = this.soulValue(ctx, faction, true), soulS = this.soulValue(ctx, faction, false);
    let estimated = false;
    const v = (() => {
      switch (fx.kind) {
        case 'draw': return amt * E.draw;
        case 'discard': return amt * (fx.side === 'enemy' ? E.discardEnemy : E.discardSelf);
        case 'mill': return amt * (fx.side === 'self' ? E.millSelf : E.millEnemy);
        case 'seal': return amt * E.seal;
        case 'sealRemove': return E.sealRemove;
        case 'damage': {
          let a = fx.amount; if (a == null) { a = K.unknownAmount; estimated = true; }
          if (/\byour god\b/i.test(fx.target || '')) return -a * soulS;
          const toGod = /\bgod\b/i.test(fx.target || '') && !/devotee/i.test(fx.target || '');
          return a * (toGod ? soulE : E.damageDevotee);
        }
        case 'soulEnemy': return amt * soulE;
        case 'soulSelf': return -amt * soulS;
        case 'soulGain': return amt * soulS;
        case 'latent': return amt * E.latent;
        case 'latentEnemy': return amt * E.latent * 0.7;
        case 'buff': {
          const perm = fx.duration === 'permanent' || (!fx.duration && ability.kind !== 'oneShot');
          const val = Math.abs(fx.atk || 0) * (perm ? E.buffAtkPerm : E.buffAtkTemp) + Math.abs(fx.hp || 0) * (perm ? E.buffHpPerm : E.buffHpTemp);
          const negative = (fx.atk || 0) < 0 || (fx.hp || 0) < 0;
          // Redutor sem "friendly" no texto mira o inimigo; aumento sem lado é do próprio time.
          const onEnemy = fx.side === 'enemy' || (negative && fx.side !== 'own');
          return negative === onEnemy ? val : -val;
        }
        case 'counter': { const val = amt * (Math.abs(fx.atk) * E.buffAtkPerm + Math.abs(fx.hp) * E.buffHpPerm); return fx.atk < 0 ? (fx.side === 'own' ? -val : val) : (fx.side === 'enemy' ? -val : val); }
        case 'training': return amt * E.training;
        case 'trainingRemove': return -0.2;
        case 'heal': return amt * E.heal;
        case 'shield': return fx.amount == null ? E.shieldAll : fx.amount * E.shieldPoint;
        case 'reanimate': return E.reanimate;
        case 'recurHand': return /cosmo base/i.test(fx.sentence) ? E.baseToHand : E.recurHand;
        case 'latentSelf': return E.latentSelf;
        case 'bounce': return fx.side === 'own' ? 0.3 : E.bounce;
        case 'removal': {
          let val = /equipment|armor/i.test(fx.text || fx.sentence) ? E.equipRemoval : E.removal;
          if (/all devotees|each devotee/i.test(fx.sentence)) val *= this.config.condition.symmetric;
          if (/friendly|you control/i.test(fx.text || '') || fx.side === 'own') val = -val * 0.6;
          return val;
        }
        case 'sacrifice': return fx.side === 'enemy' ? amt * E.removal * 0.6 : amt * E.sacrificeSelf;
        case 'selfDefeat': return E.sacrificeSelf;
        case 'exile': return /your hand/i.test(fx.sentence) ? E.discardSelf : /your tartarus|friendly|you control/i.test(fx.sentence) ? -E.exileGrave : /tartarus/i.test(fx.sentence) ? E.exileGrave : E.exileField;
        case 'prepare': return E.prepare;
        case 'exhaust': return fx.side === 'own' || fx.side === 'unspecified' ? -0.2 : E.exhaust;
        case 'forbid': return fx.side === 'enemy' || (fx.side !== 'own' && /that devotee|those devotees|\bthey\b/i.test(fx.sentence)) ? E.forbidEnemy : -this.config.restriction.selfForbid;
        case 'counterSpell': return E.counterSpell * (/\bunless\b/i.test(fx.sentence) ? 0.55 : 1);
        case 'silence': return E.silence;
        case 'fight': return E.fight;
        case 'extraStrike': return E.extraStrike;
        case 'ignoreGuardian': return 0.4;
        case 'noRetaliation': return E.noRetaliation;
        case 'control': return E.control;
        case 'costReduce': return E.costReduce;
        case 'tax': return E.taxEnemy;
        case 'equipFree': return E.equipFree;
        case 'extraBase': return E.extraBase;
        case 'ramp': return E.ramp;
        case 'search': return E.search;
        case 'scry': return amt * E.scry;
        case 'putBack': return amt * E.putBack;
        case 'reveal': return E.reveal;
        case 'copy': return E.copy;
        case 'immune': return K.immune;
        case 'loseKeyword': return 0.3;
        case 'drawback': return -0.6;
        case 'token': return this.config.body.attack * fx.atk + this.config.body.hp * fx.hp;
        case 'grant': {
          const body = card.attack != null ? {atk: card.attack, hp: card.hp} : undefined;
          const factor = fx.duration === 'temporary' ? K.grantedFactor.temporary : card.type === 'Equipment' ? K.grantedFactor.equipment : K.grantedFactor.permanent;
          return (fx.keywords || []).reduce((sum, name) => sum + this.keywordValue(KEYWORDS.find(k => k.toLowerCase() === name) || name, body, ctx), 0) * factor;
        }
        default: return null;
      }
    })();
    return {value: v, estimated};
  }

  // Multiplicadores de alvo, condição e duração. Devolve probabilidade (consistência) e amplitude.
  effectFactors(fx, ability, ctx) {
    const C = this.config.condition;
    const mass = fx.scope === 'all' ? C.massAll : fx.scope === 'three' ? C.upToThree : fx.scope === 'two' ? C.upToTwo : 1;
    const applyMass = !['draw', 'mill', 'latent', 'soulEnemy', 'soulSelf', 'soulGain', 'discard', 'search', 'ramp'].includes(fx.kind);
    let p = 1;
    if (fx.condition === 'if') p *= C.if;
    if (fx.condition === 'while') p *= C.while;
    if (fx.condition === 'awakened') p *= C.awakened;
    if (fx.tribe && !/^(Equipment|Armor)$/.test(fx.tribe) && fx.side !== 'enemy') p *= C.tribal;
    if (fx.replacement) p *= C.instead;
    if (LEGAL_TARGET.has(fx.kind)) p *= Math.pow(this.legalShare(fx.sentence, ctx), C.legalExponent);
    const scale = fx.cap ? fx.cap * C.capUse : fx.scaled ? C.forEach : 1; // "up to +3/+3": o teto manda, não o "for each".
    return {p, amplitude: (applyMass ? mass : 1) * scale};
  }

  // Usos esperados de uma habilidade. Soma por carta, com vida esperada por tipo.
  usesOf(ability, card) {
    const F = this.config.frequency, T = this.config.triggers, G = this.config.god, L = this.config.lifetimeCycles;
    const life = L[card.type] ?? L.Spell;
    let p = 1, uses;
    if (ability.section === 'ultimate') {
      const cost = ability.cost?.cosmo ?? G.ultimateFreeCost;
      return {uses: 1, p: clamp(1 - (cost - G.ultimateFreeCost) * G.ultimatePerCost, 0.05, 1)};
    }
    if (ability.section === 'awaken') p = clamp(G.awakenBase + G.awakenPerSoulShare * ((card.awaken ?? 0) / (card.soul || 25)), 0, 0.9);
    if (ability.kind === 'oneShot' || card.type === 'Spell') return {uses: F.oneShot, p}; // Spell resolve uma vez, mesmo com gatilho no texto.
    if (ability.frequency === 'game') return {uses: F.oncePerGame, p};
    if (ability.cost?.selfSpend) return {uses: 1, p};
    if (ability.kind === 'afterlife') return {uses: 1, p: this.config.keywords.afterlife.probInTartarus};
    if (ability.kind === 'continuous' || ability.kind === 'static') return {uses: F.continuous * (card.type === 'God' || card.type === 'Domain' ? 1.5 : 1), p};
    // "Activate only during your round" limita a um uso por ciclo mesmo escrito "once each round" (§64).
    const onlyOwnRound = /only during your round/i.test(ability.raw);
    const perFreq = ability.frequency === 'cycle' || (ability.frequency === 'round' && onlyOwnRound) ? F.perCycleUse : ability.frequency === 'round' ? F.perRoundUse : ability.kind === 'activated' ? F.activatedUse : F.freeTriggerUse;
    if (ability.kind === 'activated') return {uses: life * perFreq, p};
    const t = ability.trigger || 'generic';
    if (t === 'etb' || t === 'cast') return {uses: 1, p: p * T[t]};
    if (t === 'defeated' || t === 'bearerDefeated' || t === 'leaves') return {uses: 1, p: p * T[t]};
    if (t === 'startRound' || t === 'endRound') return {uses: life * perFreq, p: p * T[t]};
    return {uses: life * perFreq, p: p * (T[t] ?? T.generic)};
  }

  costValue(cost, card, ctx) {
    if (!cost) return 0;
    const E = this.config.effects;
    return (cost.cosmo || 0) + (cost.latent || 0) + (cost.soul || 0) * (this.soulValue(ctx, card.faction, false) ?? 0.5) + (cost.tap ? 0.25 : 0) + ((cost.sacrifice || 0) + (cost.selfSpend && card.type === 'Devotee' ? 1 : 0)) * Math.abs(E.sacrificeSelf) + (cost.discard || 0) * Math.abs(E.discardSelf);
  }

  scoreAbility(ability, card, ctx) {
    const C = this.config, index = this.engineIndex.cards?.[card.id];
    const out = {positive: 0, negative: 0, weightedP: 0, weight: 0, estimated: 0, lines: [], unresolved: [], partial: []};
    const {uses, p: usesP} = this.usesOf(ability, card);
    const resonance = ability.resonance ? (card.type === 'Domain' ? 0.75 : C.condition.resonance) : 1;
    const perUseCost = ability.kind === 'activated' || ability.kind === 'afterlife' || ability.kind === 'ultimate' ? this.costValue(ability.cost, card, ctx) * (ability.section === 'ultimate' ? 0 : C.activatedCostWeight) : ability.optionalCost ? this.costValue(ability.optionalCost, card, ctx) * C.activatedCostWeight : 0;
    let perUseGain = 0, perUseLoss = 0, onceLoss = 0, consistencyNum = 0, consistencyDen = 0;
    const effects = [];
    for (const sentence of ability.sentences) {
      if (sentence.status === UNRESOLVED) out.unresolved.push(sentence.text);
      if (sentence.status === PARTIAL) out.partial.push({text: sentence.text, missing: sentence.missing});
    }
    for (const fx of ability.effects) {
      const base = this.effectBase(fx, ability, card, ctx);
      if (base.value == null) { out.unresolved.push(fx.sentence); continue; }
      if (base.estimated) out.estimated++;
      const {p, amplitude} = this.effectFactors(fx, ability, ctx);
      const per = base.value * amplitude * p;
      if (per >= 0) perUseGain += per;
      else if (fx.kind === 'selfDefeat') onceLoss += -per; // a carta só morre uma vez, por mais usos que o gatilho tenha.
      else perUseLoss += -per;
      consistencyNum += Math.abs(per) * p; consistencyDen += Math.abs(per);
      const evidence = index ? this.evidenceFor(fx.kind, index) : 'sem_engine';
      effects.push({kind: fx.kind, amount: fx.amount ?? null, scope: fx.scope, side: fx.side, condition: fx.condition, tribe: fx.tribe, perUse: round3(per), estimated: base.estimated, evidence});
    }
    // Custo opcional: o jogador só paga se compensa; custo de ativada idem, sem ficar negativo.
    const optional = ability.kind === 'activated' || ability.kind === 'afterlife' || !!ability.optionalCost || ability.optional;
    let net = perUseGain - perUseCost - (optional ? perUseLoss : 0);
    if (optional) net = Math.max(net, perUseGain * C.minNetFraction);
    const total = uses * usesP * resonance;
    out.positive = net > 0 ? net * total : 0;
    out.negative = (net < 0 ? -net * total : 0) + (optional ? 0 : perUseLoss * total) + onceLoss * usesP * resonance;
    out.weightedP = consistencyDen ? (consistencyNum / consistencyDen) * usesP * resonance : usesP * resonance;
    out.weight = Math.abs(out.positive) + out.negative;
    out.lines = effects;
    out.summary = {name: ability.name, section: ability.section, kind: ability.kind, frequency: ability.frequency, trigger: ability.trigger, resonance: ability.resonance, cost: ability.cost, optionalCost: ability.optionalCost || null, uses: round3(uses), probability: round3(usesP * resonance), value: round3(out.positive), penalty: round3(out.negative), effects, unresolved: out.unresolved, partial: out.partial, raw: ability.raw};
    out.triggerConfirmed = ability.trigger && TRIGGER_HOOK[ability.trigger] && index?.hooks ? TRIGGER_HOOK[ability.trigger].some(h => index.hooks.includes(h)) : null;
    return out;
  }

  evidenceFor(kind, index) {
    if (index.source !== 'v6') return index.source; // tabela numérica ou God: implementada, sem introspecção de efeito.
    const wanted = engineCallsOf(kind);
    if (!wanted?.length) return 'nao_confirmado';
    return wanted.some(name => index.calls?.includes(name) || index.hooks?.includes(name)) ? 'confirmado' : 'nao_confirmado';
  }

  body(card) {
    const B = this.config.body;
    if (card.type === 'Devotee') return card.attack == null || card.hp == null ? null : B.attack * card.attack + B.hp * card.hp;
    if (card.type === 'Equipment') return (B.attack * (card.equip?.bonusAtk || 0) + B.hp * (card.equip?.bonusHp || 0)) * this.config.equipment.bearerFactor;
    return 0;
  }

  keywordScore(card, ctx) {
    const K = this.config.keywords;
    const body = {atk: card.attack ?? 0, hp: card.hp ?? 0};
    let score = 0;
    for (const k of card.keywords) score += this.keywordValue(k, card.type === 'Devotee' ? body : undefined, ctx);
    score += card.immune.length * K.immune;
    if (card.hiddenCosmo != null) score += K.hiddenCosmo.base + Math.max(0, (card.cost ?? card.hiddenCosmo) - card.hiddenCosmo) * K.hiddenCosmo.perDiscount;
    return score;
  }

  synergy(card, ctx) {
    const S = this.config.synergy, seen = new Set();
    let score = 0;
    for (const a of card.abilities) {
      if (a.resonance && card.type === 'Equipment' && !seen.has(a.resonance)) { seen.add(a.resonance); score += S.namedPair; }
      for (const f of a.effects) {
        if (!f.tribe || f.side === 'enemy') continue;
        const tribe = f.tribe.toLowerCase();
        if (seen.has(tribe)) continue;
        seen.add(tribe);
        const hits = Object.keys(ctx.tribes).filter(k => (k.startsWith(`${card.faction}|`) || k.startsWith('Neutral|')) && k.includes(tribe)).reduce((n, k) => n + ctx.tribes[k], 0);
        if (hits >= S.minCards) score += S.perLogCard * Math.log2(1 + hits);
      }
      const mech = /\bSeal/.test(a.raw) ? 'seal' : /\bTraining/.test(a.raw) ? 'training' : null;
      if (mech && !seen.has(mech)) { seen.add(mech); const hits = ctx.mechanics[`${card.faction}|${mech}`] || 0; if (hits >= S.minCards) score += S.perLogCard * Math.log2(1 + hits) * 0.5; }
    }
    // Interações não somam direto: cada uma preenche parte do que falta até o teto.
    const interactions = this.interactions(card, ctx);
    const rest = interactions.reduce((left, i) => left * (1 - Math.min(i.value, S.cap) / S.cap), 1 - Math.min(S.cap, score) / S.cap);
    return {score: S.cap * (1 - rest), interactions};
  }

  // Combinações pedidas pelo autor. Cada uma registra quanto estima somar, antes da saturação.
  interactions(card, ctx) {
    const V = this.config.synergy.interactions, out = [];
    const kinds = new Set(card.abilities.flatMap(a => a.effects.map(f => f.kind)));
    const text = card.abilities.map(a => a.raw).join(' ');
    const has = k => card.keywords.includes(k) || card.abilities.some(a => a.effects.some(f => f.kind === 'grant' && (f.keywords || []).includes(k.toLowerCase())));
    const add = (id, label, value) => { if (value > 0) out.push({id, label, value: round3(value)}); };
    if (has('Impulse') && has('Pierce')) add('impulse_pierce', 'Impulse + Pierce', V.impulsePierce * (card.attack ?? 3));
    if (has('Guardian') && (kinds.has('shield') || kinds.has('heal') || card.abilities.some(a => a.effects.some(f => f.kind === 'buff' && f.hp > 0)))) add('guardian_defense', 'Guardian + buffs defensivos', V.guardianDefense);
    if (kinds.has('training') && (/with (?:a |an )?@?Training/i.test(text) || card.abilities.some(a => a.effects.some(f => f.kind === 'buff' && f.scope === 'all')))) add('training_global', 'Training + bônus globais', V.trainingGlobal);
    if (kinds.has('training') && (kinds.has('ramp') || kinds.has('extraBase'))) add('training_ramp', 'Training + Cosmo Base', V.trainingRamp);
    if (kinds.has('reanimate')) add('reanimate_etb', 'Reanimação + ETB', V.reanimateEtb * Math.log2(1 + (ctx.etb?.[card.faction] || 0)));
    if (/\bSeal/.test(text) && card.abilities.some(a => ['declare', 'combatDamage', 'enemyDeclare', 'kill'].includes(a.trigger))) add('seal_combat', 'Seal + controle de combate', V.sealCombat);
    if (card.type === 'Equipment' && (card.equip?.bonusAtk || 0) > 0 && (card.equip?.bonusHp || 0) > 0 && (kinds.has('grant') || kinds.has('buff'))) add('equip_stack', 'Equipment + múltiplos bônus', V.equipStack);
    if ((kinds.has('sacrifice') || kinds.has('selfDefeat')) && (kinds.has('reanimate') || kinds.has('recurHand'))) add('sacrifice_return', 'Sacrifício + retorno do Tartarus', V.sacrificeReturn);
    return out;
  }

  restriction(card) {
    const R = this.config.restriction;
    let score = 0;
    if (!card.cosmoble && card.type !== 'God' && card.type !== 'Domain' && card.hiddenCosmo == null) score += R.notCosmoble;
    if (card.type === 'Devotee' && card.subtypes.some(s => WARRIOR.test(s)) && !card.abilities.some(a => /is not legendary/i.test(a.raw))) score += R.legendRule;
    return score;
  }

  timing(card, abilities) {
    const T = this.config.timing;
    let score = 0;
    if (card.class === 'Moment' && (card.cost ?? 99) <= T.momentLatentMax) score += T.momentResponse; // §56: no turno adversário só Latent, limite 3 (§5).
    for (const a of abilities) {
      if (['enemyDeclare', 'spellWatch', 'discardWatch', 'millWatch'].includes(a.trigger)) score += T.enemyRoundTrigger;
      if (a.kind === 'activated' && /respon|any time|moment speed|opponent's round/i.test(a.raw)) score += T.responseAbility;
    }
    return Math.min(T.cap, score);
  }

  interaction(abilities) {
    const I = this.config.interaction;
    const kinds = new Set();
    for (const a of abilities) for (const f of a.effects) if (ANSWERS.has(f.kind) && f.side !== 'own' && f.side !== 'self') kinds.add(f.kind);
    return Math.min(I.cap, kinds.size * I.answer);
  }

  effectiveCost(card, ctx) {
    const O = this.config.cardOpportunity, Q = this.config.equipment;
    if (card.type === 'God') return null; // Sem custo: God é medido por perfil, comparado aos outros quatro.
    let additional = 0;
    for (const a of card.abilities) if (a.additionalCost) additional += this.costValue(a.additionalCost, card, ctx);
    if (card.type === 'Domain') { // Oportunidade do slot único vem depois, em withBaseline: depende dos outros Domains da facção.
      const entry = this.config.domain.entryCostSource === 'printed' ? card.cost ?? 0 : 0;
      return {printed: card.cost ?? null, entry, additional: round3(additional), slotOpportunity: null, total: entry + additional};
    }
    if (card.cost == null) return null;
    let equip = 0;
    if (card.type === 'Equipment' && card.equip?.cost != null) {
      const resonant = card.equip.owners.length > 0 || card.equip.resonantNames.length > 0;
      equip = card.equip.cost * (resonant ? Q.equipWeightResonant : Q.equipWeightOther);
    }
    return {printed: card.cost, opportunity: O, additional: round3(additional), equip: round3(equip), total: card.cost + O + additional + equip};
  }

  // Pontuação isolada da carta, sem grupo. Pura: a mesma carta e o mesmo contexto dão o mesmo resultado.
  scoreCard(raw, ctx) {
    const C = this.config, card = normalizeCard(raw);
    const scored = card.abilities.map(a => this.scoreAbility(a, card, ctx));
    const synergy = this.synergy(card, ctx);
    const scale = C.effectScale[card.class] ?? 1;
    // "Equipped Devotee gets +X/+Y" impresso no texto é o mesmo bônus das gemas (§64): conta como corpo, não como efeito.
    let textBonus = 0;
    if (card.type === 'Equipment') for (const a of scored) if (a.summary.kind === 'continuous' && !a.summary.resonance && a.lines.length && a.lines.every(l => l.kind === 'buff')) { textBonus += a.positive; a.positive = 0; }
    const bodyContext = this.bodyContext(card, ctx);
    const scores = {
      BodyScore: card.type === 'Equipment' ? this.body(card) + textBonus * C.equipment.bearerFactor : this.body(card),
      KeywordScore: this.keywordScore(card, ctx),
      EffectScore: scale * scored.reduce((s, a) => s + a.positive, 0),
      SynergyScore: synergy.score,
      TimingScore: this.timing(card, card.abilities),
      InteractionScore: this.interaction(card.abilities),
      RestrictionScore: this.restriction(card) + scale * scored.reduce((s, a) => s + a.negative, 0), // mesma escala do efeito: custo e ganho na mesma unidade.
    };
    if (bodyContext && scores.BodyScore != null) for (const [k, w] of Object.entries(C.body.contextWeights)) scores.BodyScore += (w || 0) * (bodyContext[k] || 0);
    if (card.type === 'God') scores.BodyScore = card.soul == null || ctx.meanSoul == null ? null : (card.soul - ctx.meanSoul) * C.god.referenceSoulPoint;
    const weight = scored.reduce((s, a) => s + a.weight, 0);
    scores.ConsistencyScore = weight ? scored.reduce((s, a) => s + a.weightedP * a.weight, 0) / weight : 1;
    const power = scores.BodyScore == null ? null : scores.BodyScore + scores.KeywordScore + scores.EffectScore + scores.SynergyScore + scores.TimingScore + scores.InteractionScore - scores.RestrictionScore;

    // Confiança: frases lidas × prova na Engine × maturidade do avaliador × estimativas.
    const sentences = card.abilities.flatMap(a => a.sentences);
    const resolved = sentences.filter(s => s.status !== UNRESOLVED).length;
    const partialCount = sentences.filter(s => s.status === PARTIAL).length;
    const coverage = sentences.length ? resolved / sentences.length : 1;
    const allEffects = scored.flatMap(a => a.lines);
    const confirmed = allEffects.filter(e => e.evidence === 'confirmado').length;
    const index = this.engineIndex.cards?.[card.id];
    const CF = C.confidence;
    const hasText = card.abilities.length > 0;
    const engineFactor = !hasText ? 1 : !index ? CF.engineMissing : index.source !== 'v6' ? CF.engineNumericTable : allEffects.length ? CF.engineUnconfirmedFloor + (1 - CF.engineUnconfirmedFloor) * confirmed / allEffects.length : 1;
    const estimated = scored.reduce((s, a) => s + a.estimated, 0);
    const maturity = CF.maturity[card.class] ?? 0.6;
    const confidence = coverage * engineFactor * maturity * Math.pow(CF.estimatedPenalty, estimated) * Math.pow(CF.partialPenalty, partialCount) * (0.7 + 0.3 * scores.ConsistencyScore);
    const unresolved = scored.flatMap(a => a.unresolved);
    const partial = scored.flatMap(a => a.partial);
    const state = unresolved.length ? UNRESOLVED : partial.length ? PARTIAL : 'RESOLVED';
    const reasons = [];
    if (card.type === 'God') reasons.push('God: sem custo; avaliado por perfil e por matchups, não por curva');
    if (unresolved.length) reasons.push(`${unresolved.length} frase(s) UNRESOLVED`);
    if (partial.length && CF.partialInconclusive) reasons.push(`${partial.length} frase(s) com leitura parcial`);
    if (card.status === 'cortado') reasons.push('carta cortada do set (status cortado)');
    if (power == null) reasons.push('faltam atributos canônicos');
    if (coverage < CF.minCoverage) reasons.push(`${Math.round(coverage * 100)}% das frases lidas`);
    if (confidence < CF.inconclusiveBelow) reasons.push('confiança abaixo do mínimo');
    const eff = this.effectiveCost(card, ctx);
    if (!eff && card.type !== 'God') reasons.push('sem custo canônico');
    const band = (1 - confidence) * (0.5 + 0.5 * Math.abs(scores.EffectScore));
    return {
      id: card.id, name: card.name, namePt: card.namePt, faction: card.faction, type: card.type, class: card.class, subtypes: card.subtypes, rarity: card.rarity, status: card.status, cost: card.cost, attack: card.attack, hp: card.hp,
      soul: card.soul, awaken: card.awaken, equip: card.equip, keywords: card.keywords, cosmoble: card.cosmoble, set: card.set, number: card.number, rank: card.rank, immune: card.immune, hiddenCosmo: card.hiddenCosmo, version: card.version, anomalies: card.anomalies,
      scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, round3(v)])), power: round3(power), effectiveCost: eff,
      coverage: round3(coverage), engine: {source: index?.source ?? null, factor: round3(engineFactor), confirmed, effects: allEffects.length}, confidence: round3(confidence),
      confidenceLevel: confidence >= CF.high ? 'alta' : confidence >= CF.medium ? 'média' : 'baixa', uncertainty: round3(band), unresolved, abilities: scored.map(a => a.summary), reasons,
      kinds: [...new Set(allEffects.map(e => e.kind))], state, partial, interactions: synergy.interactions, bodyContext, cardVersion: raw._patchVersion || `${card.id}@canon`,
      godProfile: card.type === 'God' ? this.godProfile(card, scored) : null, domainProfile: card.type === 'Domain' ? this.domainProfile(scored) : null,
    };
  }

  // Métricas de combate contra o catálogo: mostradas sempre; só entram no corpo com peso em config.body.contextWeights.
  bodyContext(card, ctx) {
    if (card.type !== 'Devotee' || card.attack == null || card.hp == null || !ctx.devotees?.atks.length) return null;
    const {atks, hps} = ctx.devotees;
    return {killShare: round3(hps.filter(h => h <= card.attack).length / hps.length), surviveShare: round3(atks.filter(a => a < card.hp).length / atks.length), soulPressure: round3(ctx.meanSoul ? card.attack / ctx.meanSoul : 0)};
  }

  // Perfil do God: Soul, Awaken e o que as habilidades produzem. Attack fica nulo: Gods não têm Attack (§24).
  godProfile(card, scored) {
    const AXES = {recursos: ['draw', 'latent', 'ramp', 'search', 'extraBase'], controle: ['seal', 'removal', 'bounce', 'exhaust', 'forbid', 'damage', 'silence', 'mill'], ofensiva: ['soulEnemy', 'buff', 'prepare', 'training', 'grant'], defesa: ['shield', 'heal', 'soulGain', 'reanimate', 'recurHand']};
    const axes = Object.fromEntries(Object.keys(AXES).map(k => [k, 0]));
    const uses = {cosmo: 0, activated: 0, passive: 0};
    for (const a of scored) {
      const s = a.summary;
      if (s.kind === 'activated' || s.kind === 'ultimate') { uses.activated++; uses.cosmo += s.cost?.cosmo || 0; } else uses.passive++;
      for (const f of s.effects) for (const [axis, kinds] of Object.entries(AXES)) if (kinds.includes(f.kind)) axes[axis] += Math.max(0, f.perUse) * s.uses * s.probability;
    }
    return {soul: card.soul, attack: null, awakenAtSoul: card.awaken, awakenShare: round3(card.soul ? card.awaken / card.soul : 0), ...uses, axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, round3(v)])), matchups: 'pendente de simulação', proposalsBlocked: true};
  }

  // Domain por natureza do efeito e por linha: geral (vale com qualquer God) × Ressonância (só com God da facção, §63).
  domainProfile(scored) {
    const out = {general: 0, resonance: 0, continuous: 0, triggered: 0, activated: 0};
    for (const a of scored) {
      const s = a.summary, v = a.positive;
      out[s.resonance ? 'resonance' : 'general'] += v;
      out[s.kind === 'continuous' || s.kind === 'static' ? 'continuous' : s.kind === 'activated' ? 'activated' : 'triggered'] += v;
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, round3(v)]));
  }

  groupKey(card) {
    const {costBuckets} = this.config.grouping;
    if (card.type === 'God' || card.type === 'Domain') return card.type;
    const b = card.cost == null ? null : costBuckets.find(([a, z]) => card.cost >= a && card.cost <= z);
    return `${card.class}|${b ? `${b[0]}-${b[1]}` : '?'}`;
  }

  classify(deviation, bands = this.config.bands) {
    const {near, relevant} = bands;
    if (deviation > relevant) return CLASSES.BROKEN;
    if (deviation > near) return CLASSES.ABOVE;
    if (deviation < -relevant) return CLASSES.WEAK;
    if (deviation < -near) return CLASSES.BELOW;
    return CLASSES.OK;
  }

  // Desvio com sinal, só de Power e custo efetivo. Custo zero não tem razão: usa faixas absolutas.
  deviationOf(power, eff) {
    const {epsilon} = this.config.bands;
    if (power == null || eff == null) return {absolute: null, relative: null, zeroCost: false};
    const absolute = power - eff;
    return {absolute, relative: absolute / Math.max(eff, epsilon), zeroCost: eff <= 0};
  }

  // Liga carta ao seu grupo: desvio absoluto, % contra o custo e % relativo à mediana do grupo.
  withBaseline(s, baselines) {
    let effectiveCost = s.effectiveCost;
    if (s.type === 'Domain' && effectiveCost) {
      const others = (baselines.domainPowers?.[s.faction] || []).filter(d => d.id !== s.id).map(d => d.power);
      const slot = Math.max(0, (median(others) ?? 0) * this.config.domain.slotShare);
      effectiveCost = {...effectiveCost, slotOpportunity: round3(slot), total: effectiveCost.entry + effectiveCost.additional + slot};
    }
    const eff = effectiveCost?.total ?? null;
    const {absolute, relative, zeroCost} = this.deviationOf(s.power, eff);
    const {near, minAbsolute, epsilon, zeroCost: zeroBands} = this.config.bands;
    const key = this.groupKey(s), base = s.type === 'Domain' ? 0 : baselines.groups[key] ?? baselines.classes[s.class] ?? 0;
    // Contexto: posição na mediana do grupo. Não decide classe; um desvio negativo não vira excesso por causa do grupo.
    const groupRelative = absolute == null ? null : (absolute - base) / Math.max(eff, epsilon);
    const reasons = [...s.reasons];
    const classification = reasons.length || relative == null ? CLASSES.UNKNOWN : Math.abs(absolute) < minAbsolute ? CLASSES.OK : zeroCost ? this.classify(absolute, zeroBands) : this.classify(relative);
    return {
      ...s, effectiveCost, group: key, groupBaseline: round3(base), effectiveTotal: round3(eff), peerCompared: s.type === 'God',
      absoluteDeviation: round3(absolute), relativeDeviation: round3(relative), zeroCost,
      deviation: round3(absolute), deviationPct: round3(relative), normalizedDeviation: round3(groupRelative),
      classification, reasons,
      bandCrossesCurve: relative != null && Math.abs(relative) > near && Math.abs(relative) - s.uncertainty / Math.max(eff, epsilon) <= near,
    };
  }

  // Nova nota de uma cópia da carta contra a linha de base de uma análise já feita: propostas não movem a curva.
  rescore(raw, result) { return this.withBaseline(this.scoreCard(raw, result.ctx), result.baselines); }

  computeBaselines(scored) {
    const ok = scored.filter(s => s.status !== 'cortado' && s.power != null && !s.reasons.length);
    const peerPower = {God: median(scored.filter(s => s.type === 'God' && s.power != null).map(s => s.power)), Domain: median(ok.filter(s => s.type === 'Domain').map(s => s.power))};
    const domainPowers = {};
    for (const s of ok) if (s.type === 'Domain') (domainPowers[s.faction] ||= []).push({id: s.id, power: s.power});
    const devs = {}, classes = {};
    for (const s of ok) {
      if (s.type === 'God' || s.type === 'Domain' || !s.effectiveCost) continue;
      const d = s.power - s.effectiveCost.total;
      (devs[this.groupKey(s)] ||= []).push(d);
      (classes[s.class] ||= []).push(d);
    }
    const classMedian = Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, median(v)]));
    const groups = {}, sizes = {};
    for (const [k, v] of Object.entries(devs)) {
      sizes[k] = v.length;
      groups[k] = v.length >= this.config.grouping.minGroupSize ? median(v) : classMedian[k.split('|')[0]];
    }
    return {peerPower, domainPowers, groups, classes: classMedian, sizes};
  }

  // Catálogo inteiro. `catalogMeta`: versão de data/cards.json. Sem Date: a mesma entrada produz o mesmo JSON.
  analyze(rawCards, catalogMeta = {}) {
    const ctx = this.context(rawCards);
    const first = rawCards.map(c => this.scoreCard(c, ctx));
    const baselines = this.computeBaselines(first);
    const cards = first.map(s => this.withBaseline(s, baselines));
    return {meta: this.meta(rawCards, catalogMeta, ctx), baselines: {peerPower: mapRound(baselines.peerPower), domainPowers: baselines.domainPowers, groups: mapRound(baselines.groups), classes: mapRound(baselines.classes), sizes: baselines.sizes}, cards, summary: this.summary(cards), ctx};
  }

  meta(rawCards, catalogMeta, ctx) {
    return {
      engine: 'CosmoBalanceEngine', engineVersion: ENGINE_VERSION, seed: this.seed,
      catalogVersion: catalogMeta.versao_catalogo ?? null, catalogHash: stableHash(rawCards), configHash: stableHash(this.config), engineIndexHash: this.engineIndex.sourceHash ?? null,
      souls: ctx.souls, meanSoul: round3(ctx.meanSoul), canonical: false, note: 'Classificação preliminar, sem calibragem por partidas. Nada foi gravado no catálogo.',
    };
  }

  summary(cards) {
    const by = (list, key) => list.reduce((m, c) => { const k = key(c); m[k] = (m[k] || 0) + 1; return m; }, {});
    const live = cards.filter(c => c.status !== 'cortado');
    const factions = {};
    for (const c of live) if (c.relativeDeviation != null && c.type !== 'God') (factions[c.faction] ||= []).push(c.relativeDeviation);
    return {
      total: cards.length, cut: cards.length - live.length,
      partialCards: cards.filter(c => c.partial.length).length, partialSentences: cards.reduce((n, c) => n + c.partial.length, 0),
      signConflicts: cards.filter(c => (c.absoluteDeviation < 0 && [CLASSES.ABOVE, CLASSES.BROKEN].includes(c.classification)) || (c.absoluteDeviation > 0 && [CLASSES.BELOW, CLASSES.WEAK].includes(c.classification))).length,
      unresolvedCards: cards.filter(c => c.unresolved.length).length, unresolvedSentences: cards.reduce((n, c) => n + c.unresolved.length, 0),
      noEngineCards: cards.filter(c => c.abilities.length && !c.engine.source).length,
      numericEngineCards: cards.filter(c => c.engine.source && c.engine.source !== 'v6').length,
      classes: Object.fromEntries(CLASS_ORDER.map(k => [k, cards.filter(c => c.classification === k).length])),
      confidence: by(cards, c => c.confidenceLevel), byType: by(cards, c => c.class),
      factionMedian: Object.fromEntries(Object.entries(factions).sort().map(([k, v]) => [k, round3(median(v))])),
    };
  }
}

// Fila de revisão: toda frase que o motor não entendeu, com a referência na Engine. Nada aqui recebe valor definitivo.
export function unresolvedLedger(cards, engineIndex = {}) {
  const ref = id => { const i = engineIndex.cards?.[id]; return !i ? 'sem entrada na Engine 3.0' : i.source === 'v6' ? `playtest/engine-v3/v6: ${(i.hooks || []).join(', ')}` : `playtest/engine-v3: ${i.source}`; };
  return cards.flatMap(c => [
    ...c.unresolved.map(text => ({id: c.id, name: c.name, state: UNRESOLVED, text, engine: ref(c.id), reason: 'nenhum padrão reconhece a frase', evaluation: 'PENDENTE'})),
    ...c.partial.map(p => ({id: c.id, name: c.name, state: PARTIAL, text: p.text, engine: ref(c.id), reason: `verbo sem efeito lido: ${p.missing.join(', ')}`, evaluation: 'PENDENTE'})),
  ]);
}
const mapRound = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round3(v)]));
