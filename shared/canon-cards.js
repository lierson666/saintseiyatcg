// Leitura dos 95 registros do snapshot D268 para a engine 3.0.
// Só lê `approved_current_text_as_of_d268`; nunca altera nem reescreve o texto.

const UNITS = {B: 'base', L: 'latent'};
const number = (text, pattern) => { const m = text.match(pattern); return m ? Number(m[1]) : null; };

// G3-042 (autor, 28/10/2026): Soul dos Gods na Alpha entre 15 e 22, por cima do SOUL impresso no D268 (o snapshot não muda).
const ALPHA_SOUL = {'god-athena': 20, 'god-poseidon': 18, 'god-hades': 22, 'god-artemis': 15, 'god-ares': 20};

export function parseCard(record) {
  const text = record.approved_current_text_as_of_d268;
  const type = record.type;
  const kind = type.startsWith('God') ? 'God' : type.startsWith('Domain') ? 'Domain'
    : type.includes('Equipment') ? 'Equipment' : type.split(' — ')[0];
  const cost = text.match(/Casting Cost: (\d+) \{([BL])\}/);
  const cosmoble = text.match(/Cosmoble: (Yes|No)/);
  // Equipment: "Auto-Equip — <nome>" ou "Auto-Equip: None"; "Equip {N} — Other Devotees" ou "— Any friendly Devotee".
  // Bônus fixo impresso: "Equipped Devotee gets +A ATK[ / +H HP][ and <Keyword>]." (linhas condicionais ficam fora).
  const bonus = text.match(/^Equipped Devotee gets \+(\d+) ATK(?: \/ \+(\d+) HP)?(?: and ([A-Z][\w ]*))?\.$/m);
  const auto = text.match(/Auto-Equip(?: — |: )(.+)/), equip = text.match(/Equip \{(\d+)\} — (.+)/);
  return {
    id: record.id.toLowerCase(),
    name: record.name,
    type,
    kind,
    armor: type.includes('Armor'),
    rarity: text.match(/Rarity: (\w+)/)?.[1] ?? null,
    // D196: Domains sem custo e sem Cosmoble no texto exibido.
    cost: cost ? {amount: Number(cost[1]), unit: UNITS[cost[2]]} : null,
    cosmoble: cosmoble ? cosmoble[1] === 'Yes' : null,
    atk: number(text, /ATK: (\d+)/) ?? number(text, /ATTACK (\d+)/),
    hp: number(text, /HP: (\d+)/),
    soul: ALPHA_SOUL[record.id.toLowerCase()] ?? number(text, /SOUL (\d+)/),
    awaken: number(text, /AWAKEN (\d+)/),
    autoEquip: auto && auto[1].trim() !== 'None' ? auto[1].split(' and/or ').map(n => n.trim()) : [],
    equip: equip ? {amount: Number(equip[1]), who: /^Other/.test(equip[2]) ? 'other' : 'any'} : null,
    equipped: bonus ? {atk: Number(bonus[1]), hp: Number(bonus[2] ?? 0), keywords: bonus[3] ? [bonus[3]] : []} : null,
    keywords: ['Guardian', 'Cheater', 'Nimble', 'Pierce', 'Impulse', 'Long Range']
      .filter(k => new RegExp(`^\\s*${k}\\s*$`, 'm').test(text)),
    text,
  };
}

export const loadCanon = canon => new Map([...canon.cards, ...canon.gods].map(r => {
  const card = parseCard(r);
  return [card.id, card];
}));
