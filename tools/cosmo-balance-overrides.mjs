// Mudanças de valor do BALANCE-PATCH-001 que vivem no código das cartas, só neste processo de simulação.
// Não altera arquivo nenhum de playtest/engine-v3: troca a entrada em memória e devolve como desfazer.
// Não é motor paralelo: são três trechos curtos (a 009 saiu em 08/11/2026: a carta 262 virou Deadly Rollick), cópia do efeito oficial com o número proposto.
import '../playtest/engine-v3/v6/hooks.js'; // carrega antes do kit: os módulos V6 têm dependência circular.
import * as k from '../playtest/engine-v3/v6/kit.js';

const capMods = n => orig => (s, c, key, self) => (orig(s, c, key, self) || []).map(m => ({...m, atk: Math.min(n, m.atk), hp: Math.min(n, m.hp)}));

const OVERRIDES = {
  // 003 e 005: teto de +3/+3 para +2/+2.
  '003': V6 => [[V6['artemis-v6-405'], 'mods', capMods(2)(V6['artemis-v6-405'].mods)]],
  '005': V6 => [[V6['artemis-v6-384'], 'mods', capMods(2)(V6['artemis-v6-384'].mods)]],
  // 004: Eternal Moonlight com até 1 Training, no lugar de até 2 (cópia de grow/growEach de artemis.js).
  '004': V6 => [[V6['artemis-v6-373'], 'startTurn', (s, c, key) => st => {
    for (const uid of k.chooseUpTo(c, key, 'ETERNAL MOONLIGHT', k.devotees(st, c, key), 1)) {
      if (!st.units[uid]) continue;
      k.addCounter(st, uid, 1);
      k.watchers(st, c, 'watchCounter', [uid, 1, key], 'Training counter');
    }
  }]],
};
export const OVERRIDE_KEYS = Object.keys(OVERRIDES);

// Aplica as mudanças ativas e devolve a função que restaura as entradas originais.
export function applyEngineOverrides(V6, keys) {
  const undo = [];
  for (const key of keys) for (const [obj, field, value] of OVERRIDES[key]?.(V6) || []) {
    undo.push([obj, field, obj[field]]);
    obj[field] = value;
  }
  return () => { for (const [obj, field, old] of undo.reverse()) obj[field] = old; };
}

// Custo: a cópia do catálogo da simulação recebe o custo proposto. O Map é da própria simulação.
export function applyCostOverlay(cards, patch, keys) {
  const undo = [];
  for (const p of patch.proposals) {
    if (!keys.includes(p.key)) continue;
    for (const c of p.changes) if (c.field === 'custo') {
      const card = cards.get(p.cardId);
      if (!card?.cost) throw new Error(`Simulação sem custo para ${p.cardId}`);
      if (card.cost.amount !== c.from) throw new Error(`Custo de ${p.cardId} na simulação é ${card.cost.amount}, proposta espera ${c.from}: NEEDS_REVIEW`);
      undo.push([card, card.cost]);
      card.cost = {...card.cost, amount: c.to};
    }
  }
  return () => { for (const [card, cost] of undo) card.cost = cost; };
}
