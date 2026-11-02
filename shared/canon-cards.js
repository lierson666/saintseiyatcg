// Leitura dos 95 registros do snapshot D268 para a engine 3.0.
// Só lê `approved_current_text_as_of_d268`; nunca altera nem reescreve o texto.

const UNITS = {B: 'base', L: 'latent'};
const number = (text, pattern) => { const m = text.match(pattern); return m ? Number(m[1]) : null; };

// G3-042 (autor, 28/10/2026): Soul dos Gods na Alpha entre 15 e 22, por cima do SOUL impresso no D268 (o snapshot não muda).
const ALPHA_SOUL = {'god-athena': 20, 'god-poseidon': 18, 'god-hades': 22, 'god-artemis': 15, 'god-ares': 20};
// Tipo vigente (autor, 31/10/2026; cards.json) por cima do D268: ex-Miracles são Technique pagas com Base (lá eram "Moment {L}");
// ex-Events são Moment (lá eram "Event"; o custo impresso continua {B} e, como resposta, paga Latent).
const EX_MIRACLE = new Set(['athena-v6-054', 'athena-v6-056', 'athena-v6-058', 'athena-v6-061', 'athena-v6-076', 'athena-v6-079']);
const EX_EVENT = new Set(['athena-v6-052', 'athena-v6-055', 'athena-v6-083']);

// Divine Command (autor, 01/11/2026; guia §63; texto de cards.json): entra no fim do texto do God. Gods não retaliam (§24): sem ATTACK.
const GOD_COMMAND = {
  'god-athena': "HEALING LIGHT — Divine Command\nCost: {1}{C}. Activate only during your turn, once each turn.\nRemove 1 damage from target friendly Devotee.\nAwakened: remove 2 damage instead and gain {1}{S}.",
  'god-poseidon': "BINDING TIDE — Divine Command\nCost: {1}{C}. Activate only during your turn, once each turn.\nPut a Seal counter on target enemy Devotee with cost 2 or less.\nAwakened: that Devotee can have any cost.",
  'god-hades': "DARK TOUCH — Divine Command\nCost: {1}{C}. Activate only during your turn, once each turn.\nTarget enemy Devotee gets -1 ATK / -1 HP until the end of the round.\nAwakened: -2 ATK / -2 HP instead.",
  'god-artemis': "HUNTRESS TRAINING — Divine Command\nCost: {1}{C}. Activate only during your turn, once each turn.\nPut a Training counter on target friendly Devotee.\nAwakened: put two instead.",
  'god-ares': "BLOOD TOLL — Divine Command\nCost: {1}{C}. Activate only during your turn, once each turn.\nDeal 1 damage to target enemy Devotee. Ares loses {1}{S}.",
};

export function parseCard(record) {
  const command = GOD_COMMAND[record.id.toLowerCase()];
  const text = record.approved_current_text_as_of_d268 + (command ? `\n${command}` : '');
  const exMiracle = EX_MIRACLE.has(record.id.toLowerCase());
  const type = exMiracle ? 'Spell — Technique' : EX_EVENT.has(record.id.toLowerCase()) ? 'Spell — Moment' : record.type;
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
    // Guia §26: Warplate (Ares) e Moonplate (Artemis) são Armor mesmo sem "Armor" no subtipo do Forge.
    armor: typeTextIsArmor(type),
    rarity: text.match(/Rarity: (\w+)/)?.[1] ?? null,
    // D196: Domains sem custo e sem Cosmoble no texto exibido.
    cost: cost ? {amount: Number(cost[1]), unit: exMiracle ? 'base' : UNITS[cost[2]]} : null,
    cosmoble: cosmoble ? cosmoble[1] === 'Yes' : null,
    // Guia §4A (autor, 31/10/2026): "Hidden Cosmo {X}" em linha própria; joga da Cosmo Base pagando X.
    hiddenCosmo: number(text, /^\s*Hidden Cosmo \{(\d+)\}\s*$/m),
    atk: command ? null : number(text, /ATK: (\d+)/) ?? number(text, /ATTACK (\d+)/),
    hp: number(text, /HP: (\d+)/),
    soul: ALPHA_SOUL[record.id.toLowerCase()] ?? number(text, /SOUL (\d+)/),
    awaken: number(text, /AWAKEN (\d+)/),
    autoEquip: auto && auto[1].trim() !== 'None' ? auto[1].split(' and/or ').map(n => n.trim()) : [],
    equip: equip ? {amount: Number(equip[1]), who: /^Other/.test(equip[2]) ? 'other' : 'any'} : null,
    // "Equip: None — Global" (020 e itens globais): fica no campo sem portador (guia §33).
    global: /Equip: None — Global/.test(text),
    // D268 é congelado; Cheater foi absorvida por Nimble (guia §44, 01/11/2026).
    equipped: bonus ? {atk: Number(bonus[1]), hp: Number(bonus[2] ?? 0), keywords: bonus[3] ? [bonus[3] === 'Cheater' ? 'Nimble' : bonus[3]] : []} : null,
    keywords: ['Guardian', 'Nimble', 'Pierce', 'Impulse', 'Long Range']
      .filter(k => new RegExp(`^\\s*${k}\\s*$`, 'm').test(text)),
    text,
  };
}

export const loadCanon = canon => new Map([...canon.cards, ...canon.gods].map(r => {
  const card = parseCard(r);
  return [card.id, card];
}));

// Guia §27 (identidade estável do personagem): Resonance pela identidade do personagem, não pela ordem do título: "Alcmenes of Ethon" = "Ethon Alcmenes"
// (Devotees de Ares renomeados no Forge em 30/10/2026; o texto da Resonance manteve o nome antigo).
const characterWords = name => String(name).toUpperCase().split(/\s+/).filter(w => w && w !== 'OF').sort().join(' ');
// Resonance por classe (autor, 02/11/2026): "Gold Saint" vale para qualquer Devotee dessa classe.
const RESONANCE_CLASSES = new Set(['Gold Saint']);
export const resonates = (armor, devotee) => armor.autoEquip.some(n => (RESONANCE_CLASSES.has(n) ? String(devotee.type).includes(n) : characterWords(n) === characterWords(devotee.name)));import {typeTextIsArmor} from './equipment-types.js';

