// Equipment System V1 (autor, 02/11/2026): fonte única de tipos e subtipos de Equipment, versionada.
// Engine, Card Forge, Deck Builder, HUD e Layout Studio consultam daqui; docs/equipment-system-v1.md explica o contrato.
// A carta guarda `name` em `subtipos`; `id` é estável e não depende do idioma.
export const EQUIPMENT_TYPES_VERSION = '1.0.0';
export const ARMOR_FAMILY = 'ARMOR_FAMILY';

const s = (name, kind, order, extra = {}) => ({id: name.toUpperCase(), name, kind, order, status: 'approved', since: '1.0.0', group: null, requires: [], ...extra});
const family = {group: ARMOR_FAMILY};
const weapon = {requires: ['WEAPON']};
const instrument = {requires: ['INSTRUMENT']};
const old = (name, replacedBy) => ({id: name.toUpperCase().replace(/ /g, '_'), name, kind: 'deprecated', order: 900, status: 'deprecated', since: '0', group: null, requires: [], replacedBy});

export const EQUIPMENT_SUBTYPES = [
  s('Cloth', 'armor', 10, family), s('Scale', 'armor', 11, family), s('Surplice', 'armor', 12, family),
  s('Warplate', 'armor', 13, family), s('Moonplate', 'armor', 14, family),
  s('Armor', 'armor', 20), // armadura fora das cinco famílias; nunca junto de uma delas
  s('Weapon', 'weapon', 30),
  s('Sword', 'weapon_kind', 31, weapon), s('Spear', 'weapon_kind', 32, weapon), s('Trident', 'weapon_kind', 33, weapon),
  s('Bow', 'weapon_kind', 34, weapon), s('Chain', 'weapon_kind', 35), s('Shield', 'weapon_kind', 36),
  s('Dagger', 'weapon_kind', 37, weapon), s('Staff', 'weapon_kind', 38), s('Axe', 'weapon_kind', 39, weapon), s('Whip', 'weapon_kind', 40, weapon),
  s('Instrument', 'instrument', 50),
  s('Lyre', 'instrument_kind', 51, instrument), s('Flute', 'instrument_kind', 52, instrument), s('Harp', 'instrument_kind', 53, instrument), s('Horn', 'instrument_kind', 54, instrument),
  s('Relic', 'object', 60), s('Artifact', 'object', 61),
  // Subtipos anteriores ao V1, aceitos com aviso até a migração do catálogo: tools/migrate-equipment-v1.py.
  old('God Armor'), old('Divine Artifact'), old('Divine Weapon', 'Weapon'), old('Divine Relic', 'Relic'), old('War Gear'), old('War Artifact'),
  old('Sacred Armor', 'Moonplate'), old('Satellite Armor', 'Moonplate'), old('Living Armor', 'Moonplate'), old('Lunar Vestment', 'Moonplate'), old('Steel Cloth', 'Cloth'), old('Prototype', 'Cloth'),
  old('Arrow'), old('Quiver'), old('Cloak'), old('Amulet'), old('Mask'), old('Device'), old('Supply'), old('Facility'),
];

const byName = new Map(EQUIPMENT_SUBTYPES.map(t => [t.name.toLowerCase(), t]));
const byId = new Map(EQUIPMENT_SUBTYPES.map(t => [t.id, t]));
const lookup = v => byName.get(String(v).toLowerCase()) || byId.get(String(v).toUpperCase());
const nameOf = v => lookup(v)?.name ?? v;

export const ARMOR_FAMILY_NAMES = EQUIPMENT_SUBTYPES.filter(t => t.group === ARMOR_FAMILY).map(t => t.name);
// Subtipos que tornam uma carta Armor no slot (guia §26): as cinco famílias e a Armor genérica.
export const ARMOR_SUBTYPE_NAMES = [...ARMOR_FAMILY_NAMES, 'Armor'];
// Progressão das armaduras (autor, 02/11/2026): nível I é a família sem patente; a lista traz os níveis II a V, em ordem.
export const PATENTES_ARMADURA = {
  Cloth: ['Bronze', 'Silver', 'Gold', 'God'],
  Scale: ['Marine', 'Captain', 'General', 'Divine'],
  Surplice: ['Terrestrial', 'Celestial', 'Judge', 'Divine'],
  Warplate: ['Berserker', 'Elite', 'Warlord', 'Divine'],
  Moonplate: ['Crescent', 'Half', 'Full', 'Divine'],
};
// Steel (autor, 02/11/2026): patente de Cloth fora da progressão, sem nível acima ou abaixo de outra.
export const PATENTES_FORA_DA_ESCALA = {Cloth: ['Steel']};
export const patentesDe = list => normalizeSubtypes(list).flatMap(n => [...(PATENTES_ARMADURA[n] || []), ...(PATENTES_FORA_DA_ESCALA[n] || [])]);

const isEquipmentCard = c => c?.tipo === 'Equipment' || c?.kind === 'Equipment' || /^Equipment\b/.test(c?.type || '');
// Carta do catálogo traz `subtipos`; carta da Engine traz o texto `type` ("Equipment — Weapon Sword").
function rawSubtypes(c) {
  if (Array.isArray(c?.subtipos)) return c.subtipos;
  const text = String(c?.type || '').split(/\s+—\s+/).slice(1).join(' ');
  const out = [];
  let rest = text;
  for (const t of [...EQUIPMENT_SUBTYPES].sort((a, b) => b.name.length - a.name.length)) {
    const re = new RegExp(`\\b${t.name}\\b`, 'i');
    if (re.test(rest)) { out.push(t.name); rest = rest.replace(re, ' '); }
  }
  return out;
}

// Ordem canônica, sem duplicatas e sem o "Armor" antigo ao lado de uma família. Não grava nada na carta.
export function normalizeSubtypes(list = []) {
  const names = [...new Set(list.map(nameOf))];
  const kept = names.some(n => ARMOR_FAMILY_NAMES.includes(n)) ? names.filter(n => n !== 'Armor') : names;
  const rank = n => lookup(n)?.order ?? 1000;
  return kept.map((n, i) => [n, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([n]) => n);
}

export const getCardTypes = c => ({cardType: isEquipmentCard(c) ? 'EQUIPMENT' : c?.tipo ?? c?.kind ?? null, subtypes: normalizeSubtypes(rawSubtypes(c))});
export const hasSubtype = (c, subtype) => isEquipmentCard(c) && normalizeSubtypes(rawSubtypes(c)).includes(nameOf(subtype));
export const hasAnySubtype = (c, subtypes) => subtypes.some(t => hasSubtype(c, t));
export const belongsToEquipmentGroup = (c, group) => isEquipmentCard(c) && normalizeSubtypes(rawSubtypes(c)).some(n => lookup(n)?.group === group);

// Linha de tipo: Equipment junta os subtipos com espaço ("EQUIPMENT — WEAPON SWORD"); os outros tipos seguem com "—".
export function printedSubtypes(card) {
  const list = Array.isArray(card) ? card : rawSubtypes(card);
  return card?.tipo === 'Equipment' || Array.isArray(card) ? normalizeSubtypes(list) : list;
}
// Patente vem só de patente_armadura e abre o nome (autor, 02/11/2026): "EQUIPMENT — BRONZE CLOTH". Em PT o substantivo vem antes: "ARMADURA BRONZE".
export function subtypesText(card, word = w => w) {
  const subs = printedSubtypes(Array.isArray(card?.subtipos) ? card.subtipos : card).map(word);
  if (!isEquipmentCard(card)) return subs.join(' — ');
  const rank = card?.patente_armadura ? [word(card.patente_armadura)] : [];
  return (word('Equipment') === 'Equipment' ? [...rank, ...subs] : [...subs, ...rank]).join(' ');
}
export function formatCardTypeLine(card, word = w => w) {
  const head = (card?.tipo ?? card?.kind) === 'Spell' ? null : card?.tipo ?? card?.kind;
  const tail = subtypesText(card, word);
  return [head && word(head), tail].filter(Boolean).join(' — ');
}

// Só lê: devolve erros (impedem salvar) e avisos (legado a migrar). Nunca corrige o dado por conta própria.
export function validateEquipmentSubtypes(card) {
  const errors = [], warnings = [];
  if (!isEquipmentCard(card)) return {errors, warnings};
  const list = rawSubtypes(card), names = list.map(nameOf);
  if (new Set(names).size !== names.length) errors.push(`Subtipo repetido: ${names.filter((n, i) => names.indexOf(n) !== i).join(', ')}`);
  for (const v of list) {
    const t = lookup(v);
    if (!t) { errors.push(`Subtipo desconhecido no registro ${EQUIPMENT_TYPES_VERSION}: ${v}`); continue; }
    if (t.status === 'deprecated') warnings.push(`Subtipo anterior ao V1: ${t.name}${t.replacedBy ? ` (proposta: ${t.replacedBy})` : ''}`);
    for (const r of t.requires) if (!names.includes(byId.get(r).name)) errors.push(`${t.name} exige ${byId.get(r).name}`);
  }
  if (names.includes('Armor') && names.some(n => ARMOR_FAMILY_NAMES.includes(n))) warnings.push('Armor não acompanha Cloth, Scale, Surplice, Warplate ou Moonplate');
  if (card?.patente_armadura && !patentesDe(names).includes(card.patente_armadura)) errors.push(`Patente inválida para ${names.join(' ') || 'esta carta'}: ${card.patente_armadura}`);
  return {errors, warnings};
}

// Marcar um subtipo traz o que ele exige; desmarcar leva o que dependia dele. Usado pelo editor de cartas.
export function toggleSubtype(list, subtype) {
  const name = nameOf(subtype), current = normalizeSubtypes(list);
  if (current.includes(name)) return current.filter(n => n !== name && !lookup(n)?.requires.includes(lookup(name)?.id));
  return normalizeSubtypes([...current, ...(lookup(name)?.requires || []).map(r => byId.get(r).name), name]);
}

// Escopo de layout por subtipo. "God Armor" virou patente de nível V (autor, 02/11/2026) e segue valendo para os layouts já salvos.
export const matchesLayoutSubtype = (card, subtype) => Boolean(card?.subtipos?.includes(subtype) || (subtype === 'God Armor' && ['God', 'Divine'].includes(card?.patente_armadura)));

// Texto `type` da Engine: é o que decide o slot de Armor (guia §26).
export const typeTextIsArmor = type => /Armor|Warplate|Moonplate|\bScale\b|\bSurplice\b|\bCloth\b/.test(type);
