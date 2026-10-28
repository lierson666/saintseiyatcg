// Loader do catálogo Poseidon V6 a partir do inventário recuperado (data/poseidon-v6/inventario.json).
// Só cartas CANÔNICO entram no pool oficial; PARCIAL, PLANEJADO e AUSENTE ficam bloqueadas com o motivo.
// Deck oficial: D171 (60 cartas, até 3 por identidade mecânica) via validateDeck, e nenhuma carta incompleta.
import {validateDeck} from './deck-v3.js';

export const cardId = number => `poseidon-v6-${number}`;

export function loadPoseidonCatalog(inventory) {
  const official = new Map(), blocked = [];
  for (const c of inventory.cartas) {
    if (c.estado === 'CANÔNICO') official.set(cardId(c.numero), c);
    else blocked.push({card_id: cardId(c.numero), name: c.nome, state: c.estado});
  }
  return {god: inventory.god, official, blocked};
}

// `index`: canonIndex(d268). Cartas Poseidon oficiais entram no índice; as demais viram erro 'incomplete'.
export function officialDeckErrors(deck, index, catalog) {
  const full = new Map([...index, ...[...catalog.official].map(([id, c]) => [id, {id: id.toUpperCase(), type: c.tipo}])]);
  return validateDeck(deck, full).map(e => (e.code === 'unknown' && e.card_id.startsWith('poseidon-v6-') ? {...e, code: 'incomplete'} : e));
}
