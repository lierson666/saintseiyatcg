// Carta de God com duas faces (guia §63, autor 02/11/2026): frente com Divine Power e Command, verso com Awaken e Ultimate.
// A linha de tipo, a gema de Soul e as regras descem juntas, para o personagem ficar à vista; Forge e carta ao vivo usam a mesma conta.
import {lang} from './card-i18n.js?v=20261102-escala1';

const LAYOUT_RULES_Y = 670, FRONT_TOP = 0.58, FRONT_FIT = 0.62, BACK_FIT = 0.95;
const words = (texts) => texts.filter(Boolean).join(' ').split(/\s+/).length;
const abilityName = (text) => String(text).split('\n')[0].split(' — ')[0].trim();

// No verso o texto varia muito (Athena tem o dobro de Poseidon): quanto mais palavras, mais alto ele começa.
export function godTextTop(card, face) {
  if (face !== 'back') return FRONT_TOP;
  return Math.min(0.52, Math.max(0.4, 0.62 - words([card.habilidade_awaken_en, card.ultimate_en]) * 0.0015));
}

export function godFaceLayout(layout, card, face) {
  const top = godTextTop(card, face), dy = Math.round(top * 2091) - LAYOUT_RULES_Y;
  const elements = layout.elements.flatMap((el) => {
    if (el.kind === 'rules') { const [x, y, w, h] = el.rect; return [{...el, rect: [x, y + dy, w, h - dy], fit: face === 'back' ? BACK_FIT : FRONT_FIT}]; }
    if (el.piece === 'athena/box_type' || el.piece === 'athena/gem_soul') return [{...el, dy: (el.dy || 0) + dy}];
    if (el.field !== 'typeLine') return [el];
    const type = {...el, y: el.y + dy};
    if (face !== 'back') return [type];
    const names = (card.habilidades_en || []).map(abilityName).filter(Boolean).join(' · ');
    return names ? [type, {kind: 'text', value: `${lang() === 'pt' ? 'Ativos' : 'Still active'}: ${names}`, style: 'subtitle', x: el.x, y: type.y + 56, size: 28, maxW: 1100, upper: true}] : [type];
  });
  return {layout: {...layout, elements}, top};
}

// Parte o texto do God entre as faces; os outros campos da carta ficam iguais nas duas.
export const godFaceTexts = (card, face) => (face === 'back' ? [card.habilidade_awaken_en, card.ultimate_en] : card.habilidades_en || []).filter(Boolean);
