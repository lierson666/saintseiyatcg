// ARMOR FORGE V1 (autor, 04/11/2026): a armadura é recurso próprio, versionado e reutilizável, desenhado antes do personagem.
// Só lógica pura: especificação, resolução dos campos, Design Lock e prompts. A tela fica em armor.js e a gravação em armor_forge.py.

export const STATES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'CANONICAL', 'ARCHIVED'];
export const STATE_LABELS = {DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovada', CANONICAL: 'Canônica', ARCHIVED: 'Arquivada'};
export const FIELD_MODES = [['auto', 'Automático'], ['manual', 'Manual'], ['absent', 'Ausente']];
export const FACTIONS = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
export const FAMILIES = [['Cloth', 'Cloth'], ['Scale', 'Scale'], ['Surplice', 'Surplice'], ['Warplate', 'Warplate'], ['Moonplate', 'Moonplate'], ['God Robe', 'God Robe'], ['Sacred Armor', 'Outra armadura sagrada']];
const FAMILY_BY_FACTION = {Athena: 'Cloth', Poseidon: 'Scale', Hades: 'Surplice', Ares: 'Warplate', Artemis: 'Moonplate', Neutral: 'Sacred Armor'};
export const GRANDEUR = [['1', '1 Contida', 'restrained: few ornaments, functional armor of a common soldier'], ['2', '2 Heroica', 'heroic: clean lines with one striking emblem'], ['3', '3 Épica', 'epic: layered plates, deliberate ornament, strong silhouette'], ['4', '4 Lendária', 'legendary: monumental shapes and elaborate engraving, still wearable'], ['5', '5 Divina', 'divine: exceptional, sacred, near-architectural presence, still wearable']];

export const IDENTITY_FIELDS = [
  ['family', 'Família de armadura', 'Warplate'], ['legion', 'Legião ou ordem', 'Disaster Legion'], ['bearer', 'Portador original', 'ISEU OF PYTHON'],
  ['mythology', 'Inspiração mitológica', 'Python, the monstrous serpent tied to Delphi'], ['entity', 'Criatura, constelação ou entidade', 'Python, the serpent of Delphi'],
  ['symbolism', 'Significados simbólicos', 'poison, prophecy, ambush'], ['grandeur', 'Grandiosidade', ''],
];
export const DESIGN_FIELDS = [
  ['silhouette', 'Silhueta geral', 'tall narrow profile with a serpentine crest and hooked shoulders'], ['coverage', 'Grau de cobertura', 'full plate over the torso, segmented over the limbs'],
  ['materials', 'Materiais', 'lacquered steel plate over blackened bronze'], ['primary', 'Cor primária', 'oxblood red'], ['secondary', 'Cor secundária', 'blackened bronze'], ['details', 'Cor dos detalhes', 'dull gold rivets'],
  ['finish', 'Acabamento, textura e ornamentação', 'satin lacquer, hammered edges, engraved scale lines'], ['condition', 'Estado de conservação', 'battle-worn, intact'], ['symmetry', 'Simetria ou assimetria', 'symmetrical except for the left pauldron'],
  ['proportions', 'Proporções e articulações', 'head-to-shoulder ratio, joints that can really move'],
];
export const ANATOMY = [['helmet', 'Elmo', 'Helmet'], ['mask', 'Máscara', 'Mask'], ['neck', 'Pescoço', 'Neck guard'], ['pauldrons', 'Ombreiras', 'Pauldrons'], ['chest', 'Peitoral', 'Chest plate'], ['back', 'Costas', 'Back plate'], ['abdomen', 'Abdômen', 'Abdomen'], ['waist', 'Cintura', 'Waist'], ['arms', 'Braços', 'Upper arms'], ['elbows', 'Cotovelos', 'Elbows'], ['forearms', 'Antebraços', 'Forearms'], ['gauntlets', 'Manoplas', 'Gauntlets'], ['hips', 'Quadril', 'Hips'], ['thighs', 'Coxas', 'Thighs'], ['knees', 'Joelhos', 'Knees'], ['greaves', 'Grevas', 'Greaves'], ['boots', 'Botas', 'Boots'], ['special', 'Componentes especiais', 'Special components']];
export const MYTHIC = [['horns', 'Chifres', 'Horns'], ['fangs', 'Presas', 'Fangs'], ['wings', 'Asas', 'Wings'], ['tails', 'Caudas', 'Tails'], ['scales', 'Escamas', 'Scales'], ['claws', 'Garras', 'Claws'], ['spikes', 'Espinhos', 'Spikes'], ['gems', 'Gemas', 'Gems'], ['symbols', 'Símbolos', 'Symbols'], ['ornaments', 'Ornamentos', 'Ornaments'], ['weapons', 'Armas', 'Weapons'], ['accessories', 'Acessórios', 'Accessories']];
export const ALL_COMPONENTS = [...ANATOMY.map((x) => [...x, 'anatomy']), ...MYTHIC.map((x) => [...x, 'mythic'])];

// Cinco modos da seção 4. Equipped é o único que admite gente; Totem existe só quando o projeto pede.
export const MODES = [['concept', 'A. Armor Concept'], ['blueprint', 'B. Armor Blueprint'], ['totem', 'C. Armor Object / Totem'], ['equipped', 'D. Armor Equipped'], ['detail', 'E. Armor Detail']];
export const ISOLATED_MODES = new Set(['concept', 'blueprint', 'totem', 'detail']);
// A verificação de consistência é feita pelo autor olhando a imagem: o sistema nunca afirma correspondência sozinho.
export const LOCK_CHECKS = [['silhouette', 'Silhueta'], ['helmet', 'Desenho do elmo'], ['pauldrons', 'Formato das ombreiras'], ['chest', 'Geometria do peitoral'], ['palette', 'Paleta'], ['materials', 'Materiais'], ['ornaments', 'Ornamentos identificadores'], ['proportions', 'Proporções e articulações']];
export const CHECK_VALUES = [['', 'Não conferido'], ['ok', 'Confere'], ['diverge', 'Diverge']];

const FACTION_LOOK = {
  Athena: {primary: 'white enamel over polished silver', secondary: 'burnished gold trim', details: 'sapphire-blue inlays', materials: 'star-forged orichalcum plate with gold-dust alloy'},
  Poseidon: {primary: 'orichalcum gold', secondary: 'deep turquoise enamel', details: 'pearl and sea-green coral inlays', materials: 'orichalcum plate with enamel and nacre'},
  Hades: {primary: 'black obsidian-like metal', secondary: 'deep purple sheen', details: 'tarnished silver and wine-red gems', materials: 'obsidian-dark forged metal with tarnished silver'},
  Ares: {primary: 'oxblood red lacquer', secondary: 'blackened bronze', details: 'dull incandescent orange at the seams', materials: 'lacquered steel plate over blackened bronze, with visible rivets'},
  Artemis: {primary: 'pale moon-silver', secondary: 'forest green enamel', details: 'lunar white pearl', materials: 'moonsilver plate with lacquered horn and pale enamel'},
  Neutral: {primary: 'weathered steel', secondary: 'aged bronze', details: 'dull gold rivets', materials: 'forged steel and bronze with worn leather straps'},
};
const clean = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const dot = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
const FAMILY_WORDS = /\b(CLOTH|SCALE|SURPLICE|WARPLATE|MOONPLATE|ROBE|ARMOR|ARMOUR|PLATE|OF|THE)\b/gi;

export const blankField = () => ({mode: 'auto', value: ''});
export function newSpec({name = '', faction = 'Neutral', fields = {}} = {}) {
  const all = {};
  for (const [key] of [...IDENTITY_FIELDS, ...DESIGN_FIELDS, ['totem']]) all[key] = {...blankField(), ...(fields[key] || {})};
  return {name: clean(name), faction: FACTIONS.includes(faction) ? faction : 'Neutral', fields: all};
}
export const newComponents = (values = {}) => ALL_COMPONENTS.map(([key, , , group]) => ({key, group, mode: 'auto', value: '', required: false, ...(values[key] || {})}));

// Dá para ler o motivo da armadura mesmo sem nada preenchido: vem da criatura, da mitologia ou do nome.
export function motifOf(spec) {
  const f = spec.fields || {};
  const manual = (key) => (f[key]?.mode === 'manual' ? clean(f[key].value) : '');
  return manual('entity') || manual('mythology') || clean(String(spec.name || '').replace(FAMILY_WORDS, ' ')).toLowerCase() || 'the patron creature of this armor';
}

export function autoField(key, spec, ctx = {}) {
  const look = FACTION_LOOK[spec.faction] || FACTION_LOOK.Neutral, motif = motifOf(spec);
  const family = spec.fields?.family?.mode === 'manual' && clean(spec.fields.family.value) || FAMILY_BY_FACTION[spec.faction] || 'Sacred Armor';
  return {
    family, legion: '', bearer: clean(ctx.originName), mythology: `the myth of ${motif}`, entity: motif, symbolism: `the threat and the bearing of ${motif}`, grandeur: '3',
    silhouette: `a broad-shouldered wearable outline whose top contour abstracts ${motif}, recognizable from its shadow alone`,
    coverage: 'closed plate over torso and shins, segmented plate over joints, cloth-free', materials: look.materials, primary: look.primary, secondary: look.secondary, details: look.details,
    finish: 'satin metal with hammered edges and fine engraved lines following each plate', condition: 'intact, freshly forged', symmetry: 'bilaterally symmetrical', proportions: 'human proportions, seven and a half heads tall, every joint leaves a real gap to bend',
    totem: `all the armor pieces reassembled, without adding or inventing any part, into the standing symbolic form of ${motif}`,
  }[key] ?? '';
}
export function autoComponent(key, spec) {
  const motif = motifOf(spec), family = spec.fields?.family?.mode === 'manual' && clean(spec.fields.family.value) || 'armor';
  return {
    helmet: `open-faced helmet with a raised crest abstracting ${motif} and cheek guards that frame the face`, mask: 'no separate mask; the face stays clear', neck: 'articulated gorget of two overlapping rings',
    pauldrons: `layered pauldrons of three lames, the outer edge cut to abstract ${motif}`, chest: `sculpted cuirass with a central keel and plate lines that echo ${motif}`, back: 'back plate continuing the chest lines with a raised central spine ridge',
    abdomen: 'three overlapping horizontal lames that flex with the torso', waist: `segmented belt with a central buckle plate bearing a sign of ${motif}`, arms: 'upper arm tubes open on the inner side to allow movement', elbows: 'pointed couters over a flexible joint',
    forearms: 'closed vambraces tapering toward the wrist', gauntlets: 'plated gauntlets with five separately articulated fingers', hips: 'overlapping tassets hanging from the belt on the sides and back', thighs: 'thigh plates open at the back of the leg',
    knees: 'ridged poleyns that overlap the thigh and the greave', greaves: 'closed shin greaves with a central ridge', boots: `armored sabatons with segmented toes, matching the ${family}`, special: 'none beyond the parts listed here',
  }[key] ?? '';
}

export function fieldText(spec, key, ctx) {
  const field = spec.fields?.[key] || blankField();
  if (field.mode === 'absent') return '';
  return field.mode === 'manual' ? clean(field.value) || clean(autoField(key, spec, ctx)) : clean(autoField(key, spec, ctx));
}
export function componentText(component, spec) {
  if (component.mode === 'absent') return '';
  // Elemento mítico em automático não é inventado peça a peça: vira uma permissão só no prompt.
  if (component.group === 'mythic') return component.mode === 'manual' ? clean(component.value) : '';
  return component.mode === 'manual' ? clean(component.value) || clean(autoComponent(component.key, spec)) : clean(autoComponent(component.key, spec));
}

const labelOf = (key) => ALL_COMPONENTS.find(([k]) => k === key) || [key, key, key, 'anatomy'];
// O desenho resolvido, sem campo vazio ambíguo. É o que os prompts leem e o que o lock congela.
export function computeDesign(spec, components, ctx = {}) {
  const list = ALL_COMPONENTS.map(([key]) => components.find((c) => c.key === key)).filter(Boolean);
  const part = (c) => ({key: c.key, label: labelOf(c.key)[2], text: componentText(c, spec), required: Boolean(c.required)});
  const present = list.filter((c) => c.mode !== 'absent' && componentText(c, spec));
  const motif = motifOf(spec), value = (key) => fieldText(spec, key, ctx);
  const grandeurId = value('grandeur'), grandeur = GRANDEUR.find(([id]) => id === grandeurId);
  return {
    name: clean(spec.name), faction: spec.faction, motif, family: value('family'), legion: value('legion'), bearer: value('bearer'), mythology: value('mythology'), entity: value('entity'), symbolism: value('symbolism'), grandeur: grandeur ? grandeur[2] : grandeurId,
    silhouette: value('silhouette'), coverage: value('coverage'), materials: value('materials'), palette: {primary: value('primary'), secondary: value('secondary'), details: value('details')}, finish: value('finish'), condition: value('condition'), symmetry: value('symmetry'), proportions: value('proportions'),
    anatomy: present.filter((c) => c.group === 'anatomy').map(part), mythic: present.filter((c) => c.group === 'mythic').map(part),
    absent: list.filter((c) => c.mode === 'absent').map((c) => labelOf(c.key)[2]), openMythic: list.filter((c) => c.group === 'mythic' && c.mode === 'auto').map((c) => labelOf(c.key)[2].toLowerCase()),
    totem: spec.fields?.totem?.mode === 'absent' ? '' : value('totem'),
  };
}

const paletteText = (d) => [d.palette.primary && `primary ${d.palette.primary}`, d.palette.secondary && `secondary ${d.palette.secondary}`, d.palette.details && `details ${d.palette.details}`].filter(Boolean).join('; ');
const lineOf = (label, text) => (text ? `${label}: ${dot(text)}` : '');
const partLines = (parts) => parts.map((x) => `- ${x.label}${x.required ? ' (mandatory)' : ''}: ${dot(x.text)}`);
function designLines(d) {
  return [
    `ARMOR: ${d.name}${d.family ? `, a ${d.family}` : ''}${d.faction && d.faction !== 'Neutral' ? ` of ${d.faction}` : ''}${d.legion ? `, ${d.legion}` : ''}. Preserve this official name as its identity; do not write it in the image.`,
    lineOf('MYTHOLOGY', d.mythology), lineOf('ASSOCIATED ENTITY', d.entity), lineOf('SYMBOLIC MEANING', d.symbolism), lineOf('GRANDEUR', d.grandeur),
    lineOf('SILHOUETTE', d.silhouette), lineOf('COVERAGE', d.coverage), lineOf('MATERIALS', d.materials), lineOf('PALETTE', paletteText(d)), lineOf('FINISH, TEXTURE AND ORNAMENT', d.finish), lineOf('CONDITION', d.condition), lineOf('SYMMETRY', d.symmetry), lineOf('PROPORTIONS AND ARTICULATION', d.proportions),
    d.anatomy.length && `COMPONENTS (each one is a separate, visibly built part):\n${partLines(d.anatomy).join('\n')}`,
    d.mythic.length && `MYTHOLOGICAL ELEMENTS (forged into the armor):\n${partLines(d.mythic).join('\n')}`,
    d.openMythic.length && `OTHER MYTHOLOGICAL ELEMENTS (${d.openMythic.join(', ')}): add one only if it derives directly from ${d.motif}; keep it restrained.`,
    d.absent.length && `EXPLICITLY ABSENT: ${d.absent.join(', ')}. These parts do not exist on this armor.`,
  ].filter(Boolean);
}
const NO_TEXT = 'Illustration only: no card frame, no text, no names, no logos, no numbers, no stats, no interface symbols, no watermarks.';
const NO_WEARER = 'person, human, human body, face, eyes or skin inside the armor, hands inside the gauntlets, mannequin with a face, model wearing the armor, character, crowd';
// Traço fixo do criador de armadura: sempre Shingo Araki (autor, 04/11/2026). Descrito sem o nome, como no resto do gerador, que pode recusar nome de ilustrador.
export const ARAKI_STYLE = 'elegant anatomy, dramatic flowing hair, expressive faces, ornate armor, classic heroism, 1980s anime cel shadows';
const STYLE_LINE = `ART STYLE (mandatory, top priority for line, shading and color): ${ARAKI_STYLE}. Hand-drawn 1980s anime cel look with clean ink lines, flat cel colors and hard-edged shadows on the metal.`;
const STYLE_BAN = 'photorealistic render, 3D render, modern digital anime look';
const negative = (list, d) => `NEGATIVE PROMPT: ${[...list, d.absent.length && d.absent.map((x) => x.toLowerCase()).join(', '), STYLE_BAN, 'generic fantasy armor, merged plates, incoherent joints, unreadable silhouette, existing anime armor designs, text, watermark'].filter(Boolean).join(', ')}.`;

const compose = (lines, neg) => `${lines.filter(Boolean).join('\n')}\n\n${neg}`;
export function modePrompt(mode, d, {version = 1, focus = '', card = null, adjustments = '', referenceCount = 0} = {}) {
  const head = `${d.name}, version ${version}.`, spec = designLines(d).join('\n');
  const refs = referenceCount ? `REFERENCES: ${referenceCount} approved reference image${referenceCount > 1 ? 's are' : ' is'} attached. Follow them for the armor design over any written description; do not copy their drawing style.` : '';
  if (mode === 'concept') return compose([`Vertical 3:4 high-resolution armor concept art for a mythological anime trading card universe of sacred armors and Greek gods: ${head} ${NO_TEXT}`, 'DIRECTION: the complete armor is the only subject, shown assembled and whole, three-quarter view, with every part readable. This is the first design pass of an original armor.', spec, refs, 'PRESENTATION: the armor stands empty on a neutral matte armature of thin dark metal, or as a self-supporting construction. Visible empty space inside the helmet and at the neck and wrist openings: nobody is wearing it. Plain neutral background.', STYLE_LINE], negative([NO_WEARER], d));
  if (mode === 'blueprint') return compose([`Landscape 16:9 high-resolution technical design sheet of one sacred armor: ${head} No readable text, no labels, no names, no numbers: use only blank leader lines and blank callout boxes.`, 'DIRECTION: orthographic turnaround on one sheet, on the same scale and aligned horizontally: FRONT view, BACK view, LEFT side view, RIGHT side view. Below them, an exploded row of the separate COMPONENTS and close-ups of the ARTICULATIONS of shoulder, elbow, hip and knee. The design must be identical in all views: same plates, same crest, same ornaments, same colors.', spec, refs, 'PRESENTATION: empty armor on a thin neutral armature, flat even light, plain light-grey sheet background.', STYLE_LINE], negative([NO_WEARER, 'different designs between views, perspective distortion, garbled lettering'], d));
  if (mode === 'totem') return compose([`Vertical 3:4 high-resolution illustration of one sacred armor in its symbolic stored form: ${head} ${NO_TEXT}`, `DIRECTION: ${dot(d.totem || `the armor pieces reassembled into the symbolic form of ${d.motif}`)} The form is built only from the same plates listed below; each plate stays recognizable as a piece of the armor. It stands by itself as a self-sustaining metal construction.`, spec, refs, 'PRESENTATION: centered on a plain neutral plinth, dark background, one clear light.', STYLE_LINE], negative([NO_WEARER, 'living animal, organic flesh, extra parts not in the armor'], d));
  if (mode === 'detail') return compose([`Vertical 3:4 high-resolution macro detail study of one sacred armor: ${head} ${NO_TEXT}`, `DIRECTION: close study of ${focus || 'the most identifying component'}: construction, overlapping plates, materials, gems, engravings and mechanisms. Show how it is fastened and how it moves, on the empty armor.`, spec, refs, 'PRESENTATION: shallow depth of field on a neutral background; the piece rests on a thin armature.', STYLE_LINE], negative([NO_WEARER, 'cropped mechanism, blurry engraving'], d));
  if (mode === 'equipped') return compose([`Vertical 3:4 high-resolution full-body fitting study for a mythological anime trading card: ${card?.name || 'the bound character'} wearing the canonical armor ${head} ${NO_TEXT}`, 'DIRECTION: this checks the fit of an approved armor on a character. The armor geometry does not change: it only adjusts to the body through its joints and straps. Standing pose, full body, plain neutral background. Character appearance is decided later in the card art step.', ...lockLines(d, {adjustments, referenceCount}), STYLE_LINE], `NEGATIVE PROMPT: ${lockNegative(d)}, ${STYLE_BAN}, extra characters, text, watermark.`);
  return '';
}

// O lock é o desenho resolvido, congelado com as referências que o autor aprovou. O gravador recusa qualquer mudança depois disso.
export function buildLock(design, referenceIds, now = new Date().toISOString()) {
  const find = (key) => design.anatomy.find((x) => x.key === key)?.text || 'explicitly absent';
  return {
    ...design, locked_at: now, helmet: find('helmet'), pauldrons: find('pauldrons'), chest: find('chest'),
    required_components: [...design.anatomy, ...design.mythic].filter((x) => x.required).map((x) => x.key),
    identifying_ornaments: design.mythic.map((x) => `${x.label}: ${x.text}`), reference_ids: referenceIds,
  };
}
export function lockLines(lock, {adjustments = '', referenceCount = 0, group = false, noWearer = false} = {}) {
  const required = [...lock.anatomy, ...lock.mythic];
  return [
    `ARMOR DESIGN LOCK (mandatory: overrides every other description of armor in this prompt, including archetype, faction palette and card name): ${lock.name}${lock.family ? `, a ${lock.family}` : ''}. Do not redesign, simplify or reinterpret it; do not add parts.${group ? ' Only the main figure wears it.' : ''}`,
    lineOf('LOCKED SILHOUETTE', lock.silhouette), lineOf('LOCKED HELMET', lock.helmet), lineOf('LOCKED PAULDRONS', lock.pauldrons), lineOf('LOCKED CHEST GEOMETRY', lock.chest),
    lineOf('LOCKED PALETTE', paletteText(lock)), lineOf('LOCKED MATERIALS', lock.materials), lineOf('LOCKED FINISH', lock.finish), lineOf('LOCKED CONDITION', lock.condition), lineOf('LOCKED SYMMETRY', lock.symmetry), lineOf('LOCKED PROPORTIONS AND ARTICULATION', lock.proportions),
    required.length && `LOCKED COMPONENTS:\n${partLines(required).join('\n')}`,
    lock.absent?.length && `EXPLICITLY ABSENT FROM THIS ARMOR: ${lock.absent.join(', ')}.`,
    `Do not add ${lock.openMythic?.length ? `${lock.openMythic.join(', ')} or any other element` : 'any element'} that the locked design does not list.`,
    !noWearer && 'FIT: the armor adjusts to this body only through its joints and straps; plate shapes and ornaments stay the same. Show hair and face only through the openings the locked helmet leaves; never redesign the helmet to reveal them.',
    clean(adjustments) && `CHARACTER FIT NOTES: ${dot(clean(adjustments))}`,
    referenceCount ? `ARMOR REFERENCES: ${referenceCount} approved image${referenceCount > 1 ? 's of this armor are' : ' of this armor is'} attached. Follow them for the armor design only, over any written description; do not copy their drawing style.` : 'ARMOR REFERENCES: none attached; follow the locked text above exactly.',
  ].filter(Boolean);
}
export const lockNegative = (lock) => [`redesigned armor, altered armor silhouette, armor with different plates or colors than ${lock.name}, missing mandatory armor parts`, lock.absent?.length && lock.absent.map((x) => `armor ${x.toLowerCase()}`).join(', ')].filter(Boolean).join(', ');

// O que falta para aprovar. Bloqueio trava o botão; aviso só informa.
export function approvalIssues(version, components, references, generations) {
  const spec = version.spec, blocks = [], warnings = [];
  if (!clean(spec.name)) blocks.push('Defina o nome oficial.');
  const silhouette = spec.fields?.silhouette;
  if (silhouette?.mode !== 'manual' || !clean(silhouette.value)) blocks.push('Descreva a silhueta geral em modo manual: ela fica imutável no lock.');
  for (const c of components) if (c.required && !componentText(c, spec)) blocks.push(`Componente obrigatório sem descrição: ${labelOf(c.key)[1]}.`);
  const own = references.filter((r) => r.version_id === version.id && r.approved && r.image);
  if (!own.length) blocks.push('Marque ao menos uma imagem como referência aprovada.');
  const modes = new Set(generations.filter((g) => g.version_id === version.id && g.image).map((g) => g.mode));
  if (!modes.has('blueprint')) warnings.push('Ainda não há imagem de ficha técnica: ela será exigida para tornar a armadura canônica.');
  for (const key of ['helmet', 'pauldrons', 'chest']) if (components.find((c) => c.key === key)?.mode === 'auto') warnings.push(`${labelOf(key)[1]} em automático: o texto padrão será congelado no lock.`);
  return {blocks, warnings};
}

// Soma da verificação feita pelo autor. Nunca diz "idêntico": só conta o que foi conferido a olho.
export function consistencySummary(generation) {
  const checks = generation.consistency?.checks || {}, values = LOCK_CHECKS.map(([key]) => checks[key] || '');
  const diverge = LOCK_CHECKS.filter(([key]) => checks[key] === 'diverge').map(([, label]) => label), done = values.filter(Boolean).length;
  if (diverge.length) return {state: 'DIVERGENT', text: `Diverge: ${diverge.join(', ')}. Precisa de revisão.`, diverge};
  if (!done) return {state: 'UNCHECKED', text: 'Não conferida. Sem validação visual, nada garante que siga o lock.', diverge};
  if (done < LOCK_CHECKS.length) return {state: 'PARTIAL', text: `Conferida em parte: ${done} de ${LOCK_CHECKS.length} itens.`, diverge};
  return {state: 'REVIEWED', text: 'Todos os itens conferidos pelo autor, sem divergência apontada.', diverge};
}

export const latestVersions = (store, projectId) => Object.values(store.versions).filter((v) => v.project_id === projectId).sort((a, b) => a.number - b.number);
export const versionComponents = (store, versionId) => Object.values(store.components).filter((c) => c.version_id === versionId);
export const versionReferences = (store, versionId) => Object.values(store.references).filter((r) => r.version_id === versionId);
export const imageUrl = (name) => `/api/armor-forge/image/${encodeURIComponent(name)}`;

// O que a arte de carta recebe. Sem aprovação também vale (autor, 04/11/2026): usa o estado atual do rascunho, que ainda pode mudar. Arquivada não entra.
export function armorForArt(store, projectId, versionId, adjustments = '') {
  const project = store?.projects?.[projectId], version = store?.versions?.[versionId];
  if (!project || !version || version.project_id !== projectId || version.status === 'ARCHIVED') return null;
  const lock = version.lock || buildLock(computeDesign(version.spec, versionComponents(store, versionId), {originName: project.origin_card_name}), versionReferences(store, versionId).filter((r) => r.approved && r.image).map((r) => r.id));
  const references = lock.reference_ids.map((id) => store.references[id]).filter((r) => r?.image);
  return {name: lock.name, version: version.number, status: version.status, lock, draft: !version.lock, adjustments, references: references.map((r) => r.image)};
}

// Projeto de exemplo da seção 8. Só entra na loja quando o autor pede: nada aqui é aprovado de antemão.
export const PYTHON_WARPLATE = {
  id: 'python-warplate',
  origin: {card_id: 'ares-v6-279', card_name: 'ISEU OF PYTHON'},
  spec: newSpec({name: 'PYTHON WARPLATE', faction: 'Ares', fields: {
    family: {mode: 'manual', value: 'Warplate'}, legion: {mode: 'manual', value: 'Disaster Legion'}, bearer: {mode: 'manual', value: 'ISEU OF PYTHON'},
    mythology: {mode: 'manual', value: 'Python, the monstrous serpent tied to Delphi, slain at the sacred spring and remembered in the oracle'}, entity: {mode: 'manual', value: 'Python, the serpent of Delphi'}, symbolism: {mode: 'manual', value: 'patient ambush, venom, the prophecy that bites back'}, grandeur: {mode: 'manual', value: '3'},
    silhouette: {mode: 'manual', value: 'a threatening narrow-waisted outline: tall serpentine crest rising behind the head, shoulders flared into open jaws, a long tapered segmented torso, curved spines breaking the outline at shoulders and forearms'},
    coverage: {mode: 'manual', value: 'near-full coverage: closed plate on head sides, chest and shins; segmented plate everywhere the body bends; the face stays open'},
    materials: {mode: 'manual', value: 'lacquered red steel plates mounted over darkened bronze understructure, with visible bronze rivets'}, primary: {mode: 'manual', value: 'deep war red lacquer'}, secondary: {mode: 'manual', value: 'darkened bronze'}, details: {mode: 'manual', value: 'dull ember orange in the recesses between scales'},
    finish: {mode: 'manual', value: 'satin lacquer chipped at the edges to reveal bronze, scale outlines engraved into every plate'}, condition: {mode: 'manual', value: 'battle-worn and scratched, structurally intact'}, symmetry: {mode: 'manual', value: 'bilaterally symmetrical, broken only by the serpentine crest that curves slightly to the left'},
    proportions: {mode: 'manual', value: 'human proportions with shoulders one and a half times the waist width; visible sliding lames at elbows, waist and knees allow real movement'},
    totem: {mode: 'manual', value: 'all plates reassembled into a coiled serpent rearing to strike: pauldrons become the open jaws, cuirass segments become the coils, the crest becomes the hood'},
  }}),
  components: newComponents({
    helmet: {mode: 'manual', required: true, value: 'open-faced helmet with a tall serpentine crest running from brow to nape, scale-engraved cheek guards curving forward like closed fangs'},
    mask: {mode: 'absent'}, neck: {mode: 'manual', value: 'three overlapping scale-edged rings forming a gorget, like the throat of a snake'},
    pauldrons: {mode: 'manual', required: true, value: 'each pauldron shaped as an open serpent jaw seen from the side: upper plate with two hooked fangs, lower plate as the mandible, ember recess inside the mouth'},
    chest: {mode: 'manual', required: true, value: 'segmented cuirass of overlapping diamond scale-plates descending in a chevron from a central bronze keel; each row overlaps the row beneath'},
    back: {mode: 'manual', value: 'a single central spine of curved bronze plates running from nape to waist, flanked by smaller overlapping scale rows'}, abdomen: {mode: 'manual', value: 'five narrow lames that slide over one another, each edge notched like a belly scale'},
    waist: {mode: 'manual', value: 'narrow bronze belt whose buckle is a coiled serpent knot'}, arms: {mode: 'manual', value: 'upper arm bands of overlapping scales, open on the inner side'}, elbows: {mode: 'manual', value: 'articulated couters ending in one short backward-curving spine'},
    forearms: {mode: 'manual', value: 'closed red vambraces with three curved spines along the outer edge'}, gauntlets: {mode: 'manual', value: 'articulated bronze-and-red gauntlets with five separate plated fingers, knuckle plates cut as small scales'},
    hips: {mode: 'manual', value: 'overlapping scale tassets hanging lower at the back, suggesting a tail base'}, thighs: {mode: 'manual', value: 'front thigh plates with engraved scale lines, open behind the leg'}, knees: {mode: 'manual', value: 'poleyns with a single forward-curving spine over a sliding lame'},
    greaves: {mode: 'manual', value: 'closed greaves with a raised central ridge of small overlapping scales'}, boots: {mode: 'manual', value: 'segmented bronze sabatons with a pointed toe plate'}, special: {mode: 'absent'},
    fangs: {mode: 'manual', required: true, value: 'hooked fangs on the pauldron jaws and cheek guards, in polished dark bronze'}, wings: {mode: 'absent'}, horns: {mode: 'absent'}, tails: {mode: 'absent'},
    scales: {mode: 'manual', required: true, value: 'overlapping diamond scale geometry as the base pattern of every red plate'}, spikes: {mode: 'manual', required: true, value: 'curved spines at shoulders, forearms and knees, always curving backward'},
    symbols: {mode: 'manual', value: 'small engraved omphalos stone of Delphi at the center of the chest keel'}, gems: {mode: 'absent'}, ornaments: {mode: 'manual', required: true, value: 'serpentine crest with a sawtooth edge, the single most identifying ornament'}, weapons: {mode: 'absent'}, accessories: {mode: 'absent'},
  }),
};
