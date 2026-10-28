// Monta uma partida 3.0 a partir de dois decks validados e do catálogo D268.
// God e Domain ficam fora do deck (D196); a mão inicial depende da ALPHA-P01 e não é distribuída aqui.
import {createCore} from './core.js';
import {validateDeck} from '../../shared/deck-v3.js';

// Embaralhamento reproduzível (mulberry32 + Fisher–Yates): mesma seed, mesma partida.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (list, random) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };

export function createMatch({cards, canonIndex, decks, gods = {A: 'god-athena', B: 'god-athena'}, first = 'A', seed = 1}) {
  const random = seeded(seed), objects = {}, piles = {};
  for (const key of ['A', 'B']) {
    const errors = validateDeck(decks[key], canonIndex);
    if (errors.length) throw new Error(`Deck ${key} inválido: ${JSON.stringify(errors.slice(0, 3))}`);
    piles[key] = shuffle(decks[key].main_deck.flatMap(({card_id, quantity}) => Array.from({length: quantity}, (_, i) => {
      const uid = `${key}:${card_id.slice(-3)}:${i + 1}`;
      objects[uid] = {owner: key, cardId: card_id, armor: cards.get(card_id).armor};
      return uid;
    })), random);
  }
  const soul = {A: cards.get(gods.A).soul, B: cards.get(gods.B).soul};
  const state = createCore({first, second: first === 'A' ? 'B' : 'A', soul, decks: piles});
  state.gods = gods;
  state.units = {}; // uid -> {prepared, damage} dos Devotees no campo
  state.domains = {A: decks.A.domain_id, B: decks.B.domain_id};
  return {state, objects, attached: {}};
}
