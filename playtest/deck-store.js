// Decks do jogador, guardados no navegador (localStorage). Os presets D171 vêm de data/alpha-0.1/decks-proposta-d171.json.
// Formato igual ao dos presets: {id, nome, god, domain_id, main_deck: [{card_id, quantity}]}.
const KEY = 'sstcg.decks.v1';

export function loadMyDecks() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function saveMyDecks(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* navegador sem armazenamento: o deck vale só nesta aba */ }
}
export const findDeck = (id, presets) => presets.find(d => d.id === id) || loadMyDecks().find(d => d.id === id) || null;
