// Validação de deck para a engine 3.0 (Alpha 0.1), a partir do snapshot canônico D268.
// Regras: 60 cartas, com God e Domain fora dos 60 (D196: "outside 60 main cards"),
// limite de cópias por identidade mecânica (D171, confirmado pelo autor em 28/10/2026: 3).

export const DECK_SIZE = 60;
export const COPY_LIMIT = 3;

const kind = card => card.type.split(' — ')[0];

// Índice por ID em minúsculas, como os decks gravam (`athena-v6-001`).
export function canonIndex(canon) {
  return new Map([...canon.cards, ...canon.gods].map(card => [card.id.toLowerCase(), card]));
}

// Devolve a lista de erros; lista vazia = deck válido.
export function validateDeck(deck, index, {copyLimit = COPY_LIMIT, size = DECK_SIZE} = {}) {
  const errors = [];
  const domain = index.get(deck.domain_id);
  if (!domain || kind(domain) !== 'Domain') errors.push({code: 'domain', card_id: deck.domain_id});
  // shortcut: identidade mecânica = ID do D268, que não tem reimpressões; usar campo de identidade quando houver.
  const copies = new Map();
  let total = 0;
  for (const {card_id, quantity} of deck.main_deck) {
    const card = index.get(card_id);
    if (!card) { errors.push({code: 'unknown', card_id}); continue; }
    if (!Number.isInteger(quantity) || quantity < 1) errors.push({code: 'quantity', card_id});
    if (['Domain', 'God'].includes(kind(card)) || card.id.startsWith('GOD-')) errors.push({code: 'outside', card_id});
    copies.set(card_id, (copies.get(card_id) || 0) + quantity);
    total += quantity;
  }
  for (const [card_id, count] of copies) if (count > copyLimit) errors.push({code: 'copies', card_id, count});
  if (total !== size) errors.push({code: 'size', total});
  return errors;
}
