// Decklist em texto (estilo AetherHub / MTGGoldfish): copiar no deckbuilder, colar no jogo.
// Formato (uma carta por linha; o id entre parênteses é opcional e, quando existe, manda):
//   Name: Athena Aggro
//   God
//   1 Athena (god-athena)
//   Domain
//   1 Galaxian Wars Arena (athena-v6-062)
//   Deck (50)
//   3 Gemini Saga (athena-v6-013)
// Na importação valem nome EN ou PT, com ou sem id, "3x", seções em EN ou PT (Deus, Domínio).
// God e Domain são reconhecidos pelo tipo da carta, então a seção é só para leitura.
// Linha não reconhecida vira erro {line, text, reason}; o resto da lista entra mesmo assim.

const fold = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const SECTION = /^(god|gods|deus|deuses|domain|dominio|deck|main|main deck|baralho|cards|cartas)\s*(\(\d+\))?:?$/;

// cards: [{id, kind, names: [nomeEN, nomePT, ...]}]; byName guarda a lista de cartas com aquele nome.
export function decklistIndex(cards) {
  const byId = new Map(), byName = new Map();
  for (const c of cards) {
    byId.set(fold(c.id), c);
    for (const n of new Set((c.names || []).filter(Boolean).map(fold))) byName.set(n, [...(byName.get(n) || []), c]);
  }
  return {byId, byName};
}

// deck: {nome, god, domain_id, main_deck: [{card_id, quantity}]}; nameOf(id) devolve o nome que o jogador vê.
export function deckToText(deck, nameOf = id => id) {
  const line = (n, id) => `${n} ${nameOf(id) || id} (${id})`;
  return [
    `Name: ${deck.alpha_nome || deck.nome || 'Deck'}`, '',
    'God', line(1, deck.god || 'god-athena'), '',
    ...(deck.domain_id ? ['Domain', line(1, deck.domain_id), ''] : []),
    `Deck (${deck.main_deck.reduce((s, e) => s + e.quantity, 0)})`,
    ...deck.main_deck.map(e => line(e.quantity, e.card_id)),
  ].join('\n') + '\n';
}

export function textToDeck(text, index) {
  const deck = {nome: '', god: null, domain_id: null, main_deck: []}, errors = [];
  String(text ?? '').split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim();
    if (!t || t.startsWith('//') || t.startsWith('#') || SECTION.test(fold(t))) return;
    const title = /^(?:name|nome|deck name)\s*:\s*(.+)$/i.exec(t);
    if (title) { deck.nome = title[1].trim(); return; }
    // "3 Nome (id)", "3x Nome", "Nome (id)", "God: Athena"
    const m = /^(?:(?:god|deus|domain|dom[ií]nio)\s*:\s*)?(?:(\d+)\s*x?\s+)?(.+?)(?:\s*\(([^()]+)\))?$/i.exec(t);
    const qty = Number(m?.[1] || 1), id = m?.[3], name = m?.[2];
    // Nome repetido entre facções (Gemini Saga de Athena e de Hades): vale o do Deus já lido, senão o primeiro.
    const named = list => list && (list.find(c => deck.god && c.id.startsWith(`${deck.god.slice(4)}-`)) || list[0]);
    const card = (id && index.byId.get(fold(id))) || named(index.byName.get(fold(name))) || (!id && index.byId.get(fold(name)))
      || (id && named(index.byName.get(fold(`${name} (${id})`)))); // nome que termina em parênteses, sem id
    if (!card) return errors.push({line: i + 1, text: t, reason: 'Unknown card'});
    if (!(qty > 0)) return errors.push({line: i + 1, text: t, reason: 'Invalid quantity'});
    if (card.kind === 'God') deck.god = card.id;
    else if (card.kind === 'Domain') deck.domain_id = card.id;
    else {
      const entry = deck.main_deck.find(e => e.card_id === card.id);
      if (entry) entry.quantity += qty; else deck.main_deck.push({card_id: card.id, quantity: qty});
    }
  });
  return {deck, errors};
}
