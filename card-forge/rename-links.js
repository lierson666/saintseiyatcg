// Renomear um personagem leva o nome novo às cartas que o citam, como Armors com Resonance (autor, 04/11/2026). Só propõe: o diff do Gravar mostra tudo antes de escrever.
const SMALL_WORDS = /\s(Of|De|Da|Do|The)(?=\s)/g;
const titled = (name) => name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(SMALL_WORDS, (m) => m.toLowerCase());
const slug = (name) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const swapText = (text, olds, name) => olds.reduce((t, old) => t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped(old)}(?![\\p{L}\\p{N}])`, 'giu'), name), text);
const swapList = (list, olds, name) => list.map((item) => (olds.some((old) => old.toLowerCase() === item.toLowerCase()) ? name : item));

export function renameLinks(cards, before, after) {
  if (!['Devotee', 'God'].includes(after.tipo)) return [];
  const oldEn = before.nome_exibicao_en?.trim(), newEn = after.nome_exibicao_en?.trim(), oldPt = before.nome_exibicao_pt?.trim(), newPt = after.nome_exibicao_pt?.trim();
  if (!oldEn || !newEn || (oldEn === newEn && oldPt === newPt)) return [];
  const namePt = titled(newPt || newEn), nameEn = titled(newEn), olds = [oldEn, oldPt].filter(Boolean), oldSlugs = olds.map(slug);
  const texts = (list, name) => list?.map((text) => swapText(text, olds, name));
  return cards.filter((card) => card.id !== after.id).flatMap((card) => {
    const next = structuredClone(card);
    if (card.habilidades_en) next.habilidades_en = texts(card.habilidades_en, nameEn);
    if (card.habilidades_pt) next.habilidades_pt = texts(card.habilidades_pt, namePt);
    if (card.auto_equip_en) next.auto_equip_en = swapList(card.auto_equip_en, olds, nameEn);
    if (card.auto_equip_pt) next.auto_equip_pt = swapList(card.auto_equip_pt, olds, namePt);
    if (card.donos) next.donos = card.donos.map((id) => (oldSlugs.includes(id) ? slug(newEn) : id));
    if (card.ressonancias) next.ressonancias = card.ressonancias.map((r) => (oldSlugs.includes(r.personagem_id) ? {...r, personagem_id: slug(newEn)} : r));
    return JSON.stringify(next) === JSON.stringify(card) ? [] : [next];
  });
}
