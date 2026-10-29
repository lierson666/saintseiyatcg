// Cartas além do D268 (Poseidon, Hades, Ares, Artemis e neutras; autor, 28–29/10/2026), lidas do export do Card Forge
// (card-forge/art-web/cards.json) e montadas no formato de texto do D268 para o mesmo parseCard da engine 3.0.
// Etapa 1 (autor, 29/10/2026): entram em partida com custo, ATK/HP, keywords e bônus fixo de Equipment;
// habilidades escritas só valem depois de implementadas em engine-v3/effects.js.
import {parseCard} from './canon-cards.js';

export const PREVIEW = /^(poseidon|hades|ares|artemis|neutral)-v6-/;

export function previewRecord(f) {
  const type = [f.tipo, (f.subtipos || []).join(' ')].filter(Boolean).join(' — ');
  const text = [`${String(f.numero_carta).padStart(3, '0')} — ${f.nome_exibicao_en}`, f.subtitulo_en, `Rarity: ${f.raridade}`, `Type: ${type}`,
    f.custo != null && `Casting Cost: ${f.custo} {${f.unidade_custo === 'latent_cosmo' ? 'L' : 'B'}}`,
    f.power != null && `ATK: ${f.power} | HP: ${f.vida}`, f.cosmoble != null && f.tipo !== 'Domain' && `Cosmoble: ${f.cosmoble ? 'Yes' : 'No'}`,
    f.tipo === 'Equipment' && `Auto-Equip — ${f.auto_equip_en?.length ? f.auto_equip_en.join(' and/or ') : 'None'}`,
    f.equipar_custo_outros != null && `Equip {${f.equipar_custo_outros}} — ${f.auto_equip_en?.length ? 'Other Devotees' : 'Any friendly Devotee'}`,
    ...(f.habilidades_en || [])].filter(Boolean).join('\n');
  return {id: f.id, name: f.nome_exibicao_en, type, approved_current_text_as_of_d268: text};
}

// Soma as cartas novas ao mapa de cartas (loadCanon) e, se vier, ao índice de validação (canonIndex).
export function addPreviewCards(cards, index, forgeCards) {
  for (const f of forgeCards.filter(c => PREVIEW.test(c.id))) {
    const r = previewRecord(f), card = {...parseCard(r), preview: true};
    // Artemis e neutras escrevem o bônus como "+2/+1" dentro de uma habilidade nomeada.
    const short = !card.equipped && r.approved_current_text_as_of_d268.match(/Equipped Devotee gets \+(\d+)\/\+(\d+)[ .]/);
    if (short) card.equipped = {atk: Number(short[1]), hp: Number(short[2]), keywords: []};
    cards.set(r.id, card);
    index?.set(r.id, r);
  }
  return cards;
}
