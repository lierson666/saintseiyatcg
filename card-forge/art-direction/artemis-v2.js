// Direção de arte Artemis V2.0 (autor, 06/11/2026). Documento: docs/artemis-v2-art-direction.md.
// Perfis visuais da facção Artemis para o gerador de prompts (art-prompt.js). O perfil sai da carta (artemisProfileOf);
// o autor pode trocar no editor (campo "Perfil Artemis"), e as notas do autor continuam acima de tudo.
// Textos dos perfis em inglês: vão direto para o prompt da imagem.
export const ARTEMIS_DIRECTION_VERSION = 'artemis-v2.0';

const profile = (id, label, fields) => ({id, label, ...fields});

export const ARTEMIS_PROFILES = [
  profile('artemis_divine', 'Artemis — corte lunar divina', {
    hierarchy: 'the goddess Artemis herself, supreme authority of the moon and the hunt, above every warrior',
    reference: 'Saint Seiya canon depictions of Artemis; Next Dimension majesty', continuity: 'Next Dimension and Tenkai-hen Overture, never mixed in one design',
    palette: 'celestial gold, silver, pure white and the character colors; green only as a faction accent', materials: 'divine metal, jewels, fine silk',
    silhouette: 'tall, elegant and imposing, clearly above any warrior', anatomy: 'graceful, regal posture, calm authority',
    armor: 'divine armor of the gods, never confused with a Cloth or a Glory', clothing: 'flowing Greek divine robes', ornaments: 'diadem, lunar jewels, scepter',
    weapons: 'sacred bow, scepter', symbols: 'full moon, crescent, divine light', environments: 'monumental Greek temples, the lunar palace of Olympus',
    lighting: 'cold moonlight with divine gold rim light', composition: 'centered, monumental, the goddess dominates the frame',
    restrictions: 'divine presence before action; the face is never hidden by effects', forbidden: 'forest goddess, druid, leaves and roots as costume, generic fantasy queen', freedom: 'low',
  }),
  profile('lunar_priestess', 'Sacerdotisa lunar', {
    hierarchy: 'priestess and divine vessel of the Lunar Court, serves Artemis in rites, not in the front line',
    reference: 'Next Dimension Satellites in ceremonial dress', continuity: 'Next Dimension',
    palette: 'silver, lunar white, pale gold; character colors', materials: 'light silver plates over ceremonial cloth',
    silhouette: 'slender, upright, ritual poise', anatomy: 'elegant feminine figure, serene face',
    armor: 'minimal lunar plates, ceremonial', clothing: 'long Greek priestess robes', ornaments: 'crescent diadem, veils, ritual jewels',
    weapons: 'ritual staff or bow, rarely raised', symbols: 'crescent moon, lunar disc', environments: 'lunar temple interiors, altars under the moon',
    lighting: 'soft moonlight, candle glow', composition: 'calm, symmetrical, ritual framing',
    restrictions: 'serenity over aggression', forbidden: 'battle rage, heavy armor, forest shaman look', freedom: 'medium',
  }),
  profile('temple_satellite', 'Satélite — guarda do templo', {
    hierarchy: 'traditional Satellite of Artemis: disciplined temple guard and huntress of an organized army',
    reference: 'Callisto and the Satellites of Saint Seiya: Next Dimension', continuity: 'Next Dimension',
    palette: 'black, silver or the colors verified in the references; lunar white accents', materials: 'light lunar armor, functional plates',
    silhouette: 'elegant feminine silhouette, light and agile', anatomy: 'identifiable face and hair, athletic huntress build',
    armor: 'light lunar armor with crescent shapes, functional protection', clothing: 'Greek-inspired tunics and skirts', ornaments: 'half-moon motifs, discreet',
    weapons: 'bow and arrows', symbols: 'crescent moon', environments: 'moonlit temples, sacred hunting grounds at night',
    lighting: 'cool moonlight', composition: 'disciplined stance, readable bow and silhouette',
    restrictions: 'must look like a Satellite, part of an organized army', forbidden: 'Bronze Saint with green armor, forest ranger, elf', freedom: 'medium',
  }),
  profile('black_satellite', 'Black Satellite — esquadrão de ataque', {
    hierarchy: 'offensive Satellite of the pursuit and attack squads',
    reference: 'La Scoumoune (Next Dimension) as the canonical model of this family', continuity: 'Next Dimension',
    palette: 'black, gunmetal, cold silver, a single accent color', materials: 'black overlapping plates',
    silhouette: 'aggressive huntress silhouette built for movement', anatomy: 'lean, coiled, ready to strike',
    armor: 'black armor with overlapping, more aggressive plates', clothing: 'close-fitting dark garments', ornaments: 'few, sharp',
    weapons: 'bow, blades or gear coherent with the references', symbols: 'black crescent', environments: 'night pursuit, rooftops of temples, shadowed forests edges',
    lighting: 'low-key moonlight, hard rim light', composition: 'motion, stealth, diagonal energy',
    restrictions: 'less priestly ornament, more military discipline and stealth', forbidden: 'ceremonial robes, bright ornate jewels, generic ninja', freedom: 'medium',
  }),
  profile('celestial_angel', 'Anjo Celeste — guerreiro do Olimpo', {
    hierarchy: 'Celestial Angel, a warrior of the Olympian gods serving under the authority of Artemis',
    reference: 'Saint Seiya Tenkai-hen Josō Overture (2004); Next Dimension only when that character version is used', continuity: 'one continuity per card, recorded in the Forge project',
    palette: 'the canonical colors of each Angel and of their Glory', materials: 'Glory armor: light celestial plates',
    silhouette: 'supernatural, mobile, individual to each Angel', anatomy: 'athletic, high mobility, sense of superhuman strength',
    armor: 'the Glory of that Angel, refined geometric forms, light or partly organic plates', clothing: 'minimal under the Glory', ornaments: 'only what the canon design has',
    weapons: 'only canonical ones', symbols: 'the personal emblem of each Angel', environments: 'the heavens of Olympus, celestial temples, sky above the clouds',
    lighting: 'radiant celestial light, gold and pale blue', composition: 'heroic, airborne or descending energy',
    restrictions: 'a Saint Seiya Angel, not a religious angel; wings only if the canonical design or an approved original design has them', forbidden: 'halo, feathered wings by default, white robes of a religious angel, Moonplate armor, Athena Cloth look', freedom: 'low',
  }),
  profile('celestial_glory', 'Glory — armadura celeste', {
    hierarchy: 'Glory, the celestial armor of an Olympian Angel; not a Moonplate and not a Cloth',
    reference: 'the Glory of the bearer in Tenkai-hen Josō Overture (2004)', continuity: 'the same continuity as its bearer',
    palette: 'the canonical colors of that Glory; no mandatory green', materials: 'light celestial alloy, refined geometric plates',
    silhouette: 'recognizable from its shadow, matching the canonical geometry', anatomy: 'shaped close to human anatomy, real joints',
    armor: 'the canonical geometry of the Glory first; no invented helmets or ornaments', clothing: 'none', ornaments: 'only those of the reference',
    weapons: 'none unless canonical', symbols: 'the emblem of its Angel', environments: 'neutral celestial background for the isolated armor',
    lighting: 'clean studio-like celestial light that shows the materials', composition: 'the armor alone, structure and materials readable',
    restrictions: 'isolated armor art has no person inside; do not mix film and manga designs without explicit direction', forbidden: 'wings by default, person inside the armor, Moonplate design, Athena Cloth look, forest motifs', freedom: 'low',
  }),
  profile('lunar_guardian', 'Guardião lunar', {
    hierarchy: 'guardian of the lunar sanctuaries, a sworn sentinel of Artemis',
    reference: 'Saint Seiya armor language; original designs of this game', continuity: 'original to this game',
    palette: 'pale silver, lunar white, deep night blue', materials: 'heavier lunar plates',
    silhouette: 'solid, protective, a wall before the temple', anatomy: 'strong, grounded stance',
    armor: 'Moonplate of a guardian, heavier than a Satellite', clothing: 'Greek tunic under the plates', ornaments: 'lunar seals',
    weapons: 'spear, shield or bow', symbols: 'moon phases', environments: 'gates and stairways of lunar temples',
    lighting: 'moonlight from above', composition: 'guarding stance, frontal or three-quarter',
    restrictions: 'keep the identity already approved for each guardian', forbidden: 'tree bark armor, roots as armor', freedom: 'medium',
  }),
  profile('lunar_divinity', 'Divindade lunar', {
    hierarchy: 'lunar divinity or titan allied to Artemis, divine but not the goddess herself',
    reference: 'Greek myth of Selene and lunar deities, in Saint Seiya language', continuity: 'original to this game',
    palette: 'silver, pearl white, pale gold, the character colors', materials: 'divine metal and light fabric',
    silhouette: 'ethereal and noble', anatomy: 'graceful, otherworldly calm',
    armor: 'divine raiment, never a Satellite armor', clothing: 'flowing divine robes', ornaments: 'lunar crown, pearls',
    weapons: 'rarely, ritual', symbols: 'lunar disc, night sky', environments: 'night sky, lunar palace, silver clouds',
    lighting: 'glowing moonlight from the figure itself', composition: 'floating or enthroned presence',
    restrictions: 'divine presence, not a soldier', forbidden: 'forest spirit costume, warrior gear', freedom: 'medium',
  }),
  profile('sacred_beast', 'Fera sagrada', {
    hierarchy: 'sacred beast of the hunt blessed by Artemis',
    reference: 'Greek myth; original designs of this game', continuity: 'original to this game',
    palette: 'natural fur tones with silver lunar glow', materials: 'fur, horn, faint lunar light',
    silhouette: 'readable animal silhouette', anatomy: 'real animal anatomy, larger and nobler',
    armor: 'none or light lunar ornaments only', clothing: 'none', ornaments: 'crescent marks, silver glow',
    weapons: 'none', symbols: 'crescent', environments: 'moonlit hunting grounds',
    lighting: 'moonlight', composition: 'the beast is the subject',
    restrictions: 'keep approved creatures as they are', forbidden: 'humanoid features, armor as clothing', freedom: 'high',
  }),
];
export const artemisProfile = id => ARTEMIS_PROFILES.find(p => p.id === id) || null;

// Perfil pela carta. null = a carta segue só a identidade da facção (natureza, técnicas, Domains já aprovados).
export function artemisProfileOf(card) {
  const faction = card?.faccao ?? card?.faction, kind = card?.tipo ?? card?.kind;
  if (faction !== 'Artemis') return null;
  const subs = card.subtipos ?? card.subtypes ?? [], has = s => subs.includes(s);
  if (kind === 'God') return artemisProfile('artemis_divine');
  if (has('Glory')) return artemisProfile('celestial_glory');
  if (has('Angel')) return artemisProfile('celestial_angel');
  if (kind !== 'Devotee') return null;
  if (has('Black Moon') || has('Black Moon Huntress') || has('Black Satellite')) return artemisProfile('black_satellite');
  if (has('Lunar Divinity') || has('Titan')) return artemisProfile('lunar_divinity');
  if (has('Divine Vessel') || has('Acolyte')) return artemisProfile('lunar_priestess');
  if (has('Lunar Guardian')) return artemisProfile('lunar_guardian');
  if (has('Satellite')) return artemisProfile('temple_satellite');
  if (has('Sacred Beast')) return artemisProfile('sacred_beast');
  return null;
}

// Linhas do prompt da imagem. A paleta verde da facção é identidade de jogo, não obrigação.
export function artemisDirectionLines(p) {
  if (!p) return [];
  return [
    `ARTEMIS V2 DIRECTION — ${p.id}: ${p.hierarchy}. Canonical reference: ${p.reference} (continuity: ${p.continuity}).`,
    `LOOK: palette ${p.palette}; materials ${p.materials}; silhouette ${p.silhouette}; anatomy ${p.anatomy}.`,
    `ARMOR AND COSTUME: ${p.armor}; clothing ${p.clothing}; ornaments ${p.ornaments}; weapons ${p.weapons}; symbols ${p.symbols}.`,
    `PLACE AND LIGHT: ${p.environments}; ${p.lighting}. Composition: ${p.composition}.`,
    `RESTRICTIONS: ${p.restrictions}. The Saint Seiya universe is the dominant visual reference, not generic medieval fantasy. Creative freedom: ${p.freedom}.`,
  ];
}
export const artemisNegative = p => (p ? p.forbidden : '');
