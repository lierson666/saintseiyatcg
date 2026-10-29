// Monta uma partida 3.0 a partir de dois decks validados e do catálogo D268.
// God e Domain ficam fora do deck (D196). Setup da ALPHA-P01 opção A (aprovada em 28/10/2026):
// quem começa é sorteado, cada um compra 7 e faz um mulligan parcial, começando pelo jogador inicial.
import {createCore, draw, RuleError, emit} from './core.js';
import {validateDeck} from '../../shared/deck-v3.js';
import {initGods} from './gods.js';

// Embaralhamento reproduzível (mulberry32 + Fisher–Yates): mesma seed, mesma partida.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (list, random) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };

export const OPENING_HAND = 7;

// `first` omitido: sorteado pela seed. `uidFor(key, cardId, n)`: ids das cartas; o duelo online passa ids opacos
// (sem o número da carta) para o uid não revelar uma carta escondida.
const readableUid = (key, cardId, n) => `${key}:${cardId.slice(-3)}:${n}`;
export function createMatch({cards, canonIndex, decks, gods = {A: 'god-athena', B: 'god-athena'}, first, seed = 1, uidFor = readableUid}) {
  const random = seeded(seed), objects = {}, piles = {};
  for (const key of ['A', 'B']) {
    const errors = validateDeck(decks[key], canonIndex);
    if (errors.length) throw new Error(`Deck ${key} inválido: ${JSON.stringify(errors.slice(0, 3))}`);
    piles[key] = shuffle(decks[key].main_deck.flatMap(({card_id, quantity}) => Array.from({length: quantity}, (_, i) => {
      const uid = uidFor(key, card_id, i + 1);
      objects[uid] = {owner: key, cardId: card_id, armor: cards.get(card_id).armor};
      return uid;
    })), random);
  }
  first ??= random() < 0.5 ? 'A' : 'B';
  const soul = {A: cards.get(gods.A).soul, B: cards.get(gods.B).soul};
  const state = createCore({first, second: first === 'A' ? 'B' : 'A', soul, decks: piles});
  state.gods = gods;
  initGods(state, {cards}); // Soul máximo, Awaken e Ultimate de cada God (gods.js)
  state.domains = {A: decks.A.domain_id, B: decks.B.domain_id};
  for (const key of state.order) draw(state, key, OPENING_HAND);
  state.setup = [...state.order]; // ordem do mulligan; vazio = pronto para o 1º turno
  return {state, objects, attached: {}, random};
}

// Mulligan único e gratuito: devolve `uids` da mão ao deck, embaralha e compra o mesmo número. [] = manter.
export function mulligan(match, key, uids) {
  const {state, random} = match, p = state.players[key];
  if (state.setup?.[0] !== key) throw new RuleError('P01', `não é a vez de ${key} no mulligan`);
  if (new Set(uids).size !== uids.length || uids.some(uid => !p.hand.includes(uid))) throw new RuleError('P01', 'cartas fora da mão');
  p.hand = p.hand.filter(uid => !uids.includes(uid));
  p.deck.push(...uids);
  shuffle(p.deck, random);
  draw(state, key, uids.length);
  emit(state, 'mulligan', {player: key, count: uids.length});
  state.setup.shift();
  if (!state.setup.length) state.setup = null;
}
