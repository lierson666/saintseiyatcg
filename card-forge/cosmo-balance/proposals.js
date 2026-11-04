// Propostas não destrutivas: cada correção é testada numa CÓPIA da carta e nunca volta ao catálogo.
// Compara a carta contra a mesma linha de base do grupo; o restante do catálogo fica parado.
import {CLASSES} from './engine.js';
import {clean} from './normalize.js';

const STRATEGY = {
  draw: 'vantagem de cartas', search: 'consistência de deck', seal: 'controle por Seal', mill: 'relógio de Mill', damage: 'pressão sobre Devotees', soulEnemy: 'relógio de Soul', removal: 'remoção', exile: 'remoção permanente (Void)',
  bounce: 'tempo por Bounce', reanimate: 'retorno do Tartarus', recurHand: 'recursão', buff: 'modificadores de combate', training: 'crescimento por Training', shield: 'prevenção de dano', counterSpell: 'resposta a Spells', ramp: 'aceleração de Bases', latent: 'Latent para respostas', sacrifice: 'sacrifício', grant: 'keywords concedidas',
};
const clone = o => JSON.parse(JSON.stringify(o));
const mutateText = (raw, re, to) => {
  let changed = false;
  const fix = t => { if (changed || !re.test(t)) return t; changed = true; return t.replace(re, to); };
  raw.habilidades_en = (raw.habilidades_en || []).map(fix);
  return changed;
};

// Mudanças pequenas por tipo. `up`: a carta está forte (tira poder); `!up`: está fraca.
function candidates(raw, up) {
  const out = [], dir = up ? 1 : -1;
  const add = (label, change) => { const copy = clone(raw); if (change(copy) !== false) out.push({label, copy}); };
  if (raw.custo != null && raw.tipo !== 'Domain') {
    const to = raw.custo + dir;
    if (to >= 0) add(`Custo ${raw.custo} → ${to}`, c => { c.custo = to; });
  }
  if (raw.tipo === 'Devotee') {
    if (raw.power != null && raw.power - dir >= 0) add(`Attack ${raw.power} → ${raw.power - dir}`, c => { c.power -= dir; });
    if (raw.vida != null && raw.vida - dir >= 1) add(`HP ${raw.vida} → ${raw.vida - dir}`, c => { c.vida -= dir; });
  }
  if (raw.tipo === 'Equipment' && raw.bonus_vida != null && raw.bonus_vida - dir >= 0) add(`Bônus de HP ${raw.bonus_vida} → ${raw.bonus_vida - dir}`, c => { c.bonus_vida -= dir; });
  if (raw.tipo === 'Equipment' && raw.bonus_poder != null && raw.bonus_poder - dir >= 0) add(`Bônus de ATK ${raw.bonus_poder} → ${raw.bonus_poder - dir}`, c => { c.bonus_poder -= dir; });
  if (raw.tipo === 'Equipment' && raw.equipar_custo_outros != null && raw.equipar_custo_outros + dir >= 0) add(`Equip ${raw.equipar_custo_outros} → ${raw.equipar_custo_outros + dir}`, c => { c.equipar_custo_outros += dir; });
  if (up) add('Frequência: once each round → once each cycle', c => mutateText(c, /once each round/i, 'Once each cycle'));
  else add('Frequência: once each cycle → once each round', c => mutateText(c, /once each cycle/i, 'Once each round'));
  const amount = up ? -1 : 1;
  add(`${up ? 'Reduz' : 'Aumenta'} em 1 o primeiro dano do texto`, c => mutateText(c, /\b([Dd]eal )(\d+)( damage)/, (_, a, n, z) => `${a}${Number(n) + amount}${z}`) && !/deal 0 damage/i.test(JSON.stringify(c.habilidades_en)));
  return out;
}

export function proposalsFor(engine, card, rawCards, result) {
  const raw = rawCards.find(c => c.id === card.id);
  const up = card.normalizedDeviation > 0;
  const baselines = result.baselines;
  const decks = engine.engineIndex.decks?.[card.id] || [];
  const tested = candidates(raw, up).map(({label, copy}) => {
    const after = engine.withBaseline(engine.scoreCard(copy, result.ctx), baselines);
    return {
      change: label, hypothetical: true, deviationBefore: card.normalizedDeviation, deviationAfter: after.normalizedDeviation, powerBefore: card.power, powerAfter: after.power, effectiveBefore: card.effectiveTotal, effectiveAfter: after.effectiveTotal, classificationAfter: after.classification,
      otherDecks: decks.length ? `Muda ${decks.length} deck(s) de teste que usam a carta: ${decks.slice(0, 4).join(', ')}${decks.length > 4 ? '…' : ''}.` : 'Nenhum deck de teste em data/alpha-0.1 usa a carta.',
    };
  }).filter(p => p.deviationAfter != null && Math.abs(p.deviationAfter) < Math.abs(p.deviationBefore)).sort((a, b) => Math.abs(a.deviationAfter) - Math.abs(b.deviationAfter));
  const similar = similarCards(card, result.cards);
  const dominant = [...card.abilities.flatMap(a => a.effects)].sort((a, b) => Math.abs(b.perUse ?? 0) - Math.abs(a.perUse ?? 0))[0];
  const parts = [['Corpo', card.scores.BodyScore], ['Keywords', card.scores.KeywordScore], ['Efeitos', card.scores.EffectScore], ['Sinergia', card.scores.SynergyScore], ['Timing', card.scores.TimingScore], ['Interação', card.scores.InteractionScore], ['Restrições', -card.scores.RestrictionScore]].filter(([, v]) => v).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return {
    diagnosis: `${card.classification} em ${card.group}: Power ${card.power} contra custo efetivo ${card.effectiveTotal}, ${Math.round((card.normalizedDeviation || 0) * 100)}% em relação à mediana do grupo.`,
    components: parts.slice(0, 3).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`), confidence: {level: card.confidenceLevel, value: card.confidence, coverage: card.coverage, engine: card.engine.source ?? 'sem Engine'},
    similar, strategicImpact: dominant ? `Peso principal em ${STRATEGY[dominant.kind] || dominant.kind}. ${up ? 'Reduzir tira força dessa linha.' : 'Aumentar pode empurrar essa linha.'}` : 'Peso principal nos atributos; sem efeito dominante.',
    corrections: tested.slice(0, 3), note: 'Proposta para o autor. Não altera carta, custo, atributo, habilidade nem regra.',
  };
}

export function similarCards(card, cards, limit = 3) {
  const kinds = new Set(card.kinds);
  return cards
    .filter(o => o.id !== card.id && o.class === card.class && o.status !== 'cortado' && o.power != null && (o.cost == null || card.cost == null || Math.abs(o.cost - card.cost) <= 1))
    .map(o => ({o, shared: o.kinds.filter(k => kinds.has(k)).length, gap: Math.abs((o.cost ?? 0) - (card.cost ?? 0))}))
    .sort((a, b) => b.shared - a.shared || a.gap - b.gap || a.o.id.localeCompare(b.o.id))
    .slice(0, limit)
    .map(({o, shared}) => ({id: o.id, name: clean(o.name), faction: o.faction, cost: o.cost, power: o.power, deviation: o.normalizedDeviation, classification: o.classification, sharedEffects: shared}));
}
export {CLASSES};
