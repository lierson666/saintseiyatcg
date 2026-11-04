// COSMO BALANCE ENGINE: parâmetros experimentais. Nada aqui é regra do jogo nem foi calibrado com partidas:
// são hipóteses em unidades de Cosmo, à espera da calibragem estatística (docs/cosmo-balance-engine.md).
// Regras citadas: docs/guia-do-jogo.md (§ = seção). Só a régua do §65 ancora o corpo; o resto é chute documentado.
export const ENGINE_VERSION = '1.0.0-inicial';

export const DEFAULT_CONFIG = {
  // Pedido do autor: referência experimental, só para Devotees.
  body: {attack: 0.6, hp: 0.4},
  // §65: um vanilla custo N / Power N / HP N+1 vale N+0.4 pelo corpo. A carta paga esse 0.4 como oportunidade
  // (é uma carta da mão e, se Cosmoble, uma Base a menos, §4), e assim a régua do guia fica com desvio zero.
  cardOpportunity: 0.4,
  // Faixas pedidas pelo autor, sobre o desvio normalizado no grupo.
  bands: {near: 0.10, relevant: 0.25, minAbsolute: 0.25, peerMinDenominator: 3}, // minAbsolute: diferença menor que isso é ruído do modelo.
  grouping: {minGroupSize: 8, costBuckets: [[0, 2], [3, 3], [4, 4], [5, 6], [7, 99]]},
  confidence: {
    high: 0.6, medium: 0.4, inconclusiveBelow: 0.25, minCoverage: 0.6,
    maturity: {Devotee: 0.9, Moment: 0.8, Technique: 0.8, SpellOther: 0.7, Equipment: 0.75, Domain: 0.6, God: 0.5},
    engineMissing: 0.7, engineNumericTable: 0.85, engineUnconfirmedFloor: 0.75, estimatedPenalty: 0.93,
  },
  // Keywords (§42-§47, §43A, §4A, §40). Valor = base + por ponto de ATK/HP do corpo.
  keywords: {
    Guardian: {base: 0.15, perHp: 0.05},      // §12: redireciona Strikes, Prepared ou não.
    Nimble: {base: 0.6, perAtk: 0.08},        // §43: "voar"; só Nimble bloqueia e ignora Guardian sem Nimble.
    'Long Range': {base: 0.3, perAtk: 0.14},  // §25/§65: sem retaliação se matar; o guia pede cuidado com esta.
    Pierce: {base: 0.1, perAtk: 0.1},         // §46: só ao iniciar Strike contra Devotee.
    Impulse: {base: 0.15, perAtk: 0.18},      // §47: Strike no turno de entrada, inclusive no God.
    grantedFactor: {temporary: 0.4, permanent: 1, equipment: 0.85},
    immune: 0.7,                              // §43A: por atributo X; varia muito com X.
    hiddenCosmo: {base: 0.3, perDiscount: 0.15}, // §4A: joga da Base; não reduz Bases.
    afterlife: {probInTartarus: 0.55},        // §40: do Tartarus e depois vai ao Void.
    unknownAmount: 2,                         // valor provisório quando o texto diz "equal to …"; marca a carta como estimada.
  },
  // Efeitos, em Cosmo por unidade, sem frequência nem condição.
  effects: {
    draw: 1.0, discardEnemy: 0.8, discardSelf: -0.5, millEnemy: 0.15, millSelf: -0.05, // §55: Mill é condição de vitória, mas lenta.
    scry: 0.15, search: 1.2, reveal: 0.15, putBack: -0.8,
    seal: 0.9, sealRemove: 0.35,                 // §48: cada marcador é um turno do dono sem preparar.
    damageDevotee: 0.5, damageGodKFactor: 12,    // Soul: k / Soul real do God (ver soulValue).
    soulSelfKFactor: 10,
    heal: 0.25, shieldPoint: 0.3, shieldAll: 1.0,
    bounce: 1.1, recurHand: 1.0, reanimate: 2.4, // §62: retorno Prepared e sem dano, salvo texto.
    removal: 2.6, exileField: 3.0, exileGrave: 0.4, equipRemoval: 1.3,
    sacrificeSelf: -1.3,
    prepare: 0.8, exhaust: 0.5, forbidEnemy: 0.7,
    latent: 0.7, ramp: 1.4, extraBase: 1.0,      // §5: Latent limitado a 3; §4: Base é uma por turno.
    buffAtkTemp: 0.3, buffHpTemp: 0.15, buffAtkPerm: 0.6, buffHpPerm: 0.4,
    training: 1.0,                               // §48A: +1/+1 permanente.
    counterSpell: 2.2, silence: 1.2, fight: 1.2, extraStrike: 1.5, damageUp: 0.4, control: 3.5,
    costReduce: 0.45, taxEnemy: 0.5, equipFree: 0.8, noRetaliation: 0.5, copy: 1.5, tokenAttached: 0,
  },
  // Quantos usos esperados por frequência; §64: "once each round" renova nos dois Rounds do ciclo, "once each cycle" uma vez.
  // Vida esperada em ciclos (2 Rounds = 1 ciclo). Partida desejada de 8-10 Rounds antigos (§65, §64: contagens dobraram).
  lifetimeCycles: {Devotee: 2, Equipment: 2.5, Domain: 7, God: 8, Spell: 1},
  frequency: {oneShot: 1, oncePerGame: 1, perCycleUse: 0.75, perRoundUse: 1.05, freeTriggerUse: 1.1, activatedUse: 0.8, continuous: 1},
  // Chance de o gatilho acontecer num ciclo. Sem dado de partida.
  triggers: {
    etb: 1, cast: 1, leaves: 0.6, activation: 0.5, defeated: 0.65, bearerDefeated: 0.55, watchDefeat: 0.55, watchEnter: 0.6, declare: 0.8, watchDeclare: 0.7,
    enemyDeclare: 0.65, combatDamage: 0.6, kill: 0.35, survive: 0.45, godDamage: 0.45, startRound: 1, endRound: 1, spellWatch: 0.45,
    discardWatch: 0.25, sealWatch: 0.35, millWatch: 0.3, attachWatch: 0.3, tookDamage: 0.5, sacrificeWatch: 0.25, costWatch: 0.5, generic: 0.45,
  },
  condition: {if: 0.65, while: 0.6, tribal: 0.75, resonance: 0.5, awakened: 0.5, afterlife: 0.55, instead: 0.5, forEach: 1.5, upToTwo: 1.6, upToThree: 2.0, massAll: 2.2, symmetric: 0.5},
  activatedCostWeight: 0.75, minNetFraction: 0.1,
  equipment: {bearerFactor: 0.9, equipWeightResonant: 0.4, equipWeightOther: 0.85},
  god: {referenceSoulPoint: 0.5, awakenBase: 0.2, awakenPerSoulShare: 2, ultimateFreeCost: 5, ultimatePerCost: 0.125},
  timing: {momentResponse: 0.35, momentLatentMax: 3, responseAbility: 0.25, enemyRoundTrigger: 0.15, cap: 0.8},
  interaction: {answer: 0.15, cap: 0.6},
  synergy: {perLogCard: 0.18, cap: 0.7, minCards: 3, namedPair: 0.25},
  restriction: {notCosmoble: 0.2, legendRule: 0.1, selfForbid: 0.35, offColorOnly: 0.15},
};

export function mergeConfig(over = {}, base = DEFAULT_CONFIG) {
  const out = Array.isArray(base) ? [...base] : {...base};
  for (const [k, v] of Object.entries(over)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] ? mergeConfig(v, base[k]) : v;
  return out;
}

// Hash estável (FNV-1a) para registrar catálogo, config e índice; serve no navegador e no Node sem crypto.
export function stableHash(value) {
  const text = typeof value === 'string' ? value : stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}
