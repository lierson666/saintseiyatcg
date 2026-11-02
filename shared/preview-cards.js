// Cartas além do D268 (Poseidon, Hades, Ares, Artemis e neutras; autor, 28–29/10/2026), lidas do export do Card Forge
// (card-forge/art-web/cards.json) e montadas no formato de texto do D268 para o mesmo parseCard da engine 3.0.
// Etapa 1 (autor, 29/10/2026): entram em partida com custo, ATK/HP, keywords e bônus fixo de Equipment;
// habilidades escritas só valem depois de implementadas em engine-v3/effects.js.
import {parseCard} from './canon-cards.js';
import {registerCardTerms} from './card-i18n.js';
import {KEYWORDS} from './card-model.js';

export const PREVIEW = /^(poseidon|hades|ares|artemis|neutral)-v6-/;

export function previewRecord(f) {
  const type = [f.tipo, (f.subtipos || []).join(' ')].filter(Boolean).join(' — ');
  const text = [`${String(f.numero_carta).padStart(3, '0')} — ${f.nome_exibicao_en}`, f.subtitulo_en, `Rarity: ${f.raridade}`, `Type: ${type}`,
    f.custo != null && `Casting Cost: ${f.custo} {${f.unidade_custo === 'latent_cosmo' ? 'L' : 'B'}}`,
    f.power != null && `ATK: ${f.power} | HP: ${f.vida}`, f.cosmoble != null && f.tipo !== 'Domain' && `Cosmoble: ${f.cosmoble ? 'Yes' : 'No'}`,
    // Sem Auto-Equip e sem Equip impresso: item global (autor, 29/10/2026), como o "Equip: None — Global Anthem" da 020.
    f.tipo === 'Equipment' && (f.auto_equip_en?.length || f.equipar_custo_outros != null
      ? `Auto-Equip — ${f.auto_equip_en?.length ? f.auto_equip_en.join(' and/or ') : 'None'}` : 'Equip: None — Global'),
    f.equipar_custo_outros != null && `Equip {${f.equipar_custo_outros}} — ${f.auto_equip_en?.length ? 'Other Devotees' : 'Any friendly Devotee'}`,
    armorBonusLine(f),
    // Keywords impressas (Guardian, Pierce…) em linha própria, como no D268, para o parseCard reconhecer (autor, 31/10/2026).
    ...(f.tipo === 'Devotee' ? f.keywords_en || [] : []),
    ...(f.habilidades_en || [])].filter(Boolean).join('\n').replace(/@/g, ''); // @ só marca keyword e símbolo na carta
  return {id: f.id, name: f.nome_exibicao_en, type, approved_current_text_as_of_d268: text};
}

// Armor (sintaxe de 30/10/2026): bonus_poder/bonus_vida e "Equipped Devotee has X." viram a linha de bônus que parseCard lê.
function armorBonusLine(f) {
  if (f.bonus_poder == null && f.bonus_vida == null) return null;
  const kw = (f.habilidades_en || []).map(h => h.replace(/@/g, '').match(/^Equipped Devotee has ([A-Z][\w ]*)\.$/)?.[1]).find(Boolean);
  return `Equipped Devotee gets +${f.bonus_poder || 0} ATK / +${f.bonus_vida || 0} HP${kw ? ` and ${kw}` : ''}.`;
}
// Bônus, Equip e Resonance da Armor vindos do Forge por cima do texto congelado do D268 (Athena V6).
function armorFromForge(card, f) {
  if (!card?.armor || (f.bonus_poder == null && f.bonus_vida == null)) return card;
  const kw = (f.habilidades_en || []).map(h => h.replace(/@/g, '').match(/^Equipped Devotee has ([A-Z][\w ]*)\.$/)?.[1]).filter(Boolean);
  return {...card, hp: null, equipped: {atk: f.bonus_poder || 0, hp: f.bonus_vida || 0, keywords: kw},
    autoEquip: f.auto_equip_en || [], equip: f.equipar_custo_outros != null ? {amount: f.equipar_custo_outros, who: 'any'} : card.equip};
}

// Carta da engine-v3 a partir do registro do Forge (também usada pela prévia do Forge, card-forge/studio-preview.js).
export function forgeCard(f, r = previewRecord(f)) {
  const card = armorFromForge({...parseCard(r), preview: true}, f);
  // Artemis e neutras escrevem o bônus como "+2/+1" dentro de uma habilidade nomeada.
  const short = !card.equipped && r.approved_current_text_as_of_d268.match(/Equipped Devotee gets \+(\d+)\/\+(\d+)[ .]/);
  if (short) card.equipped = {atk: Number(short[1]), hp: Number(short[2]), keywords: []};
  return card;
}

// Soma as cartas novas ao mapa de cartas (loadCanon) e, se vier, ao índice de validação (canonIndex).
export function addPreviewCards(cards, index, forgeCards) {
  registerCardTerms(forgeCards); // nomes de carta e de habilidade em PT na tela (shared/i18n.js)
  for (const f of forgeCards.filter(c => PREVIEW.test(c.id))) {
    const r = previewRecord(f);
    cards.set(r.id, forgeCard(f, r));
    index?.set(r.id, r);
  }
  for (const f of forgeCards.filter(c => !PREVIEW.test(c.id) && cards.get(c.id)?.armor)) cards.set(f.id, armorFromForge(cards.get(f.id), f));
  // Arma e acessório de Athena: Resonance do Forge por cima do D268 congelado (Armas de Libra, autor, 02/11/2026).
  for (const f of forgeCards.filter(c => !PREVIEW.test(c.id) && c.auto_equip_en?.length && cards.get(c.id)?.kind === 'Equipment' && !cards.get(c.id).armor)) cards.set(f.id, {...cards.get(f.id), autoEquip: f.auto_equip_en});
  // Athena → Branco (autor, 31/10/2026): custo e Moment/Technique do Forge por cima do D268; os efeitos ficam no código da engine.
  for (const f of forgeCards.filter(c => /^athena-v6-/.test(c.id) && (!cards.has(c.id) || cards.get(c.id).kind === 'Domain'))) {
    // Domains de Athena (forma do §63, 31/10/2026): texto inteiro do Forge, porque o D268 tem o texto antigo; cartas de
    // Athena fora do D268 (ex.: 501 Athena's Statue) entram como as das outras facções.
    const r = previewRecord(f);
    cards.set(r.id, forgeCard(f, r));
    index?.set(r.id, r);
  }
  for (const f of forgeCards.filter(c => !PREVIEW.test(c.id) && cards.has(c.id))) {
    const card = cards.get(f.id), sub = (f.subtipos || []).find(t => t === 'Moment' || t === 'Technique');
    const cost = f.custo != null && card.cost && card.cost.amount !== f.custo ? {...card.cost, amount: f.custo} : card.cost;
    const type = card.kind === 'Spell' && sub ? `Spell — ${sub}` : card.type;
    // Cosmoble do Forge (rebalanceamento de 31/10/2026): o D268 diz "Cosmoble: Yes" em quase todas.
    const cosmoble = f.cosmoble != null && card.cosmoble != null ? Boolean(f.cosmoble) : card.cosmoble;
    // Hidden Cosmo (§4A, 31/10/2026) só existe no Forge para as cartas do D268.
    const hidden = Number((f.habilidades_en || []).map(h => h.match(/^Hidden Cosmo \{(\d+)\}$/)?.[1]).find(Boolean)) || card.hiddenCosmo;
    // Devotee: ATK/HP do Forge (cards.json vence o D268) e keywords válidas do Forge somadas às do D268 (ex.: Ikki 3/2 com
    // Impulse, redesenho de 31/10/2026). Entrada que não é keyword (texto de habilidade no campo) é ignorada.
    const dev = card.kind === 'Devotee' && f.tipo === 'Devotee';
    const atk = dev && f.power != null ? f.power : card.atk, hp = dev && f.vida != null ? f.vida : card.hp;
    const extra = dev ? (f.keywords_en || []).filter(w => KEYWORDS.includes(w) && !(card.keywords || []).includes(w)) : [];
    const keywords = extra.length ? [...(card.keywords || []), ...extra] : card.keywords;
    if (cost !== card.cost || type !== card.type || cosmoble !== card.cosmoble || hidden !== card.hiddenCosmo || atk !== card.atk || hp !== card.hp || keywords !== card.keywords)
      cards.set(f.id, {...card, cost, type, cosmoble, hiddenCosmo: hidden, atk, hp, keywords});
  }
  // Gods: Soul, Attack e Awaken vêm da carta do God no Forge (<facção>-001), por cima do D268 e da G3-042 (autor, 29/10/2026).
  for (const f of forgeCards.filter(c => /^(athena|poseidon|hades|ares|artemis)-001$/.test(c.id))) {
    const god = cards.get(`god-${f.id.slice(0, -4)}`);
    if (!god) continue;
    const n = v => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : undefined);
    cards.set(`god-${f.id.slice(0, -4)}`, {...god, soul: n(f.soul) ?? god.soul, atk: n(f.attack) ?? god.atk, awaken: n(f.awaken) ?? god.awaken});
  }
  return cards;
}
