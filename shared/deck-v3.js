// Validação de deck para a engine 3.0 (Alpha 0.1), a partir do snapshot canônico D268.
// Regras: 50 cartas (autor, 01/11/2026; eram 60), com God e Domain fora delas (D196),
// limite de cópias por identidade mecânica (D171, confirmado pelo autor em 28/10/2026: 3).

export const DECK_SIZE = 50;
export const COPY_LIMIT = 3;
export const SPLASH_LIMIT = 15;

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

// Cores (guia §63): facção do God, neutras e até SPLASH_LIMIT cartas da facção de um Domain de outra cor.
// `factionOf(id)` devolve a facção em minúsculas ('neutral' para neutras) ou undefined para carta desconhecida.
export function splashCount(deck, factionOf) {
  const god = factionOf(deck.god || 'god-athena');
  return deck.main_deck.reduce((n, {card_id, quantity}) => {
    const f = factionOf(card_id);
    return f && f !== god && f !== 'neutral' ? n + quantity : n;
  }, 0);
}

export function colorErrors(deck, factionOf, limit = SPLASH_LIMIT) {
  const ok = new Set([factionOf(deck.god || 'god-athena'), factionOf(deck.domain_id), 'neutral']);
  const errors = deck.main_deck.filter(e => factionOf(e.card_id) && !ok.has(factionOf(e.card_id))).map(e => ({code: 'identity', card_id: e.card_id}));
  const count = splashCount(deck, factionOf);
  if (count > limit) errors.push({code: 'splash', count});
  return errors;
}
