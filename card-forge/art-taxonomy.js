// Taxonomia visual do gerador de arte: corpo, ordem, quantidade, formação e variedade dos personagens.
// Só decide como a imagem é pedida. Nada aqui lê ou muda tipo, keyword, atributo ou habilidade de carta.

// Anatomia por morfologia. hands: tem mãos humanas (só aí entra a regra dos cinco dedos); ethnicity e hair: campos que fazem sentido;
// humanMood: expressão de rosto ou comportamento de criatura; focus: onde fica o centro de interesse; trait: rótulo do campo que substitui o cabelo.
export const ANATOMY = {
  human: {label: 'Humana: 2 braços, 2 pernas, 5 dedos', text: 'exactly five fingers on each visible hand; no duplicate limbs; coherent joints, hands, feet and neck; the armor follows the body correctly', hands: true, ethnicity: true, hair: true, humanMood: true, focus: 'face', neg: ''},
  divine: {label: 'Humana divina: 5 dedos, presença sobre-humana', text: 'idealized human body with superhuman presence, two arms, two legs, exactly five fingers on each visible hand; coherent joints and neck; the armor follows the body correctly', hands: true, ethnicity: true, hair: true, humanMood: true, focus: 'face', neg: ''},
  winged: {label: 'Humana alada: 5 dedos e par de asas', text: 'human body with one pair of feathered or membranous wings rooted in the upper back, two arms, two legs, exactly five fingers on each visible hand; the wings attach coherently', hands: true, ethnicity: true, hair: true, humanMood: true, focus: 'face', fly: true, neg: ''},
  humanoid: {label: 'Humanoide não humano: traços da espécie', text: 'non-human humanoid body with the features of its species, two arms, two legs, coherent hands with the digits of the species, heavy coherent joints', hands: false, hair: true, humanMood: true, focus: 'face', trait: 'Traços da espécie', traits: ['tusks and a heavy brow', 'long pointed ears', 'rough scarred hide', 'small horns', 'mottled green skin', 'massive stooped shoulders'], neg: ''},
  beastfolk: {label: 'Humanoide bestial: corpo humano, traços animais', text: 'humanoid body with the animal parts of its kind joined coherently where animal and human meet, coherent hands with the digits of the species', hands: false, humanMood: true, focus: 'face', trait: 'Traços da espécie', traits: ['great curved horns', 'goat legs and hooves', 'a crown of living snakes instead of hair', 'a thick fur mane on the shoulders', 'cracked stone-grey skin'], neg: ''},
  demon: {label: 'Demoníaca: chifres, garras, cauda opcional', text: 'demonic body with horns, clawed hands and coherent musculature, optional tail and wings joined coherently to the back', hands: false, hair: true, humanMood: true, focus: 'face', fly: true, trait: 'Traços demoníacos', traits: ['great ram horns', 'burning cracks along the skin', 'tattered bat wings', 'a barbed tail', 'black sclera and ember eyes'], neg: ''},
  bird: {label: 'Ave: asas, bico, penas, garras', text: 'bird anatomy: two wings, a beak, feathers, talons, no hands; the wing joints and feather layers are coherent', focus: 'eyes', fly: true, trait: 'Plumagem e crista', traits: ['iridescent plumage', 'a tall crest of flame-colored feathers', 'storm-grey plumage with white bars', 'golden plumage with long tail feathers', 'black plumage with a metallic sheen'], neg: 'human face, human hair, human skin, human arms'},
  griffon: {label: 'Grifo: cabeça e asas de ave, corpo felino', text: 'griffon anatomy: eagle head, beak and wings joined coherently to a four-legged lion body, talons in front and paws behind, a tail', focus: 'eyes', fly: true, trait: 'Plumagem e pelagem', traits: ['golden feathers over a tawny coat', 'white feathers over a pale coat', 'storm-grey feathers over a dark coat'], neg: 'human face, human hair, human skin, human arms'},
  harpy: {label: 'Harpia: tronco humano, asas e garras de ave', text: 'harpy anatomy: humanoid torso and head, wings instead of arms, feathered legs ending in talons', focus: 'face', humanMood: true, hair: true, fly: true, trait: 'Plumagem', traits: ['dark ragged feathers', 'bronze metallic feathers', 'pale moonlit feathers'], neg: ''},
  beast: {label: 'Quadrúpede: 4 patas, focinho, pelagem', text: 'four-legged animal anatomy with paws or hooves, a muzzle, fur or hide and a tail, no human hands; proportions and joints of a real predator or beast', focus: 'eyes', trait: 'Pelagem e marcas', traits: ['silver fur with dark markings', 'a thick dark mane', 'pale fur marked with glowing lines', 'scarred black hide', 'a coat the color of the faction'], neg: 'human face, human hair, human skin, human arms'},
  reptile: {label: 'Réptil: escamas, cauda, garras', text: 'reptile anatomy: scales, a long tail, clawed limbs, a low heavy body and a lipless jaw, no human hands', focus: 'eyes', trait: 'Escamas e cristas', traits: ['dark green scales with a dorsal crest', 'bronze scales', 'bony plates along the back', 'scales patterned like old stone'], neg: 'human face, human hair, human skin, human arms'},
  serpent: {label: 'Serpente: corpo longo, sem membros', text: 'serpent anatomy: one long limbless body in coherent coils, scales, a hooded or wedge head and fangs; it has no arms and no legs', focus: 'eyes', trait: 'Escamas e capelo', traits: ['black scales with gold bands', 'a wide cobra hood', 'pale scales with violet sheen', 'horns above the eyes'], neg: 'human face, human hair, human skin, arms, legs'},
  dragon: {label: 'Dragão: escamas, cauda, asas, patas coerentes', text: 'dragon anatomy: scales, a long tail, a horned head with a toothed jaw, four coherent legs with claws and a pair of membranous wings joined to the shoulders, no human hands', focus: 'eyes', fly: true, trait: 'Escamas e chifres', traits: ['obsidian scales with burning seams', 'great swept-back horns', 'pale ancient scales and torn wings', 'a spined mane along the neck', 'metallic scales in the colors of the faction'], neg: 'human face, human hair, human skin, human arms'},
  hydra: {label: 'Hidra: vários pescoços e cabeças', text: 'hydra anatomy: several long necks, all rising coherently from one heavy scaled body, each with its own head, a tail and clawed legs. The many heads are intended', focus: 'eyes', trait: 'Escamas e cabeças', traits: ['seven heads of different sizes', 'nine heads with dripping venom', 'dark green scales and pale bellies', 'cauterized scars where heads were severed'], neg: 'human face, human hair, human skin, human arms'},
  chimera: {label: 'Quimera: partes de animais unidas', text: 'chimera anatomy: lion body, a goat head rising from the back, a serpent for a tail, all joined coherently. The extra head is intended', focus: 'eyes', trait: 'Partes da besta', traits: ['a burning mane', 'a venomous serpent tail with open jaws', 'scarred hide and bronze horns'], neg: 'human face, human hair, human skin, human arms'},
  insect: {label: 'Insetoide: 6 patas, carapaça, antenas', text: 'insect anatomy: a segmented body with a hard carapace, six jointed legs, antennae, mandibles and compound eyes, no human hands', focus: 'eyes', fly: true, trait: 'Carapaça e antenas', traits: ['black chitin with a metallic sheen', 'long curved antennae', 'translucent wings', 'great serrated mandibles'], neg: 'human face, human hair, human skin, human arms'},
  arachnid: {label: 'Aracnídeo: 8 patas, vários olhos', text: 'arachnid anatomy: a cephalothorax and abdomen, eight jointed legs, several eyes and fangs, no human hands', focus: 'eyes', trait: 'Carapaça e olhos', traits: ['eight glowing eyes', 'a banded abdomen', 'bristling dark hair on the legs', 'strands of web around the legs'], neg: 'human face, human hair, human skin, human arms'},
  marine: {label: 'Marinha: nadadeiras, guelras, sem mãos', text: 'marine anatomy: a body shaped for water with fins, gills and a tail, no human hands, seen in a coherent swimming posture', focus: 'eyes', swim: true, trait: 'Pele e barbatanas', traits: ['bioluminescent spots along the flanks', 'long trailing fins', 'plated scales', 'a jaw of needle teeth', 'pale translucent skin'], neg: 'human face, human hair, human skin, human arms'},
  aquatic: {label: 'Humanoide aquático: guelras, membranas', text: 'aquatic humanoid anatomy: two arms and two legs with webbed hands and feet, gills, fins on the forearms and smooth or scaled skin', focus: 'face', humanMood: true, swim: true, trait: 'Traços aquáticos', traits: ['fins along the head instead of hair', 'scales on the shoulders', 'large dark eyes', 'bioluminescent lines on the skin'], neg: ''},
  merfolk: {label: 'Sereia ou tritão: tronco humano, cauda de peixe', text: 'merfolk anatomy: human torso, head and two arms, exactly five fingers on each visible hand, joined coherently at the hips to one long fish tail with a fluke; no legs', hands: true, ethnicity: true, hair: true, humanMood: true, focus: 'face', swim: true, neg: 'human legs'},
  abyssal: {label: 'Abissal: tentáculos, olhos, mandíbulas, carapaça', text: 'abyssal monster anatomy, entirely non-human: a massive carapace, tentacles, a mouth of layered jaws and several bioluminescent eyes. The asymmetry and the deformity are intended', focus: 'eyes', swim: true, trait: 'Tentáculos, olhos e carapaça', traits: ['dozens of thick tentacles', 'a ring of bioluminescent eyes', 'layered jaws in the center of the body', 'a cracked barnacle-crusted carapace', 'long pale filaments drifting in the current'], neg: 'human face, human hair, human skin, human warrior in armor, human figure in front of the monster'},
  cephalopod: {label: 'Cefalópode: tentáculos, ventosas, corpo mole', text: 'cephalopod anatomy: a soft mantle, a great eye on each side, a beak and long tentacles with suckers; it has no arms, no legs and no hands', focus: 'eyes', swim: true, trait: 'Tentáculos e ventosas', traits: ['tentacles as thick as towers', 'rows of glowing suckers', 'skin that shifts color in waves', 'scars from ancient battles on the mantle'], neg: 'human face, human hair, human skin, human warrior in armor'},
  coral: {label: 'Coralina: corpo de coral vivo', text: 'living coral anatomy: a body grown from branching coral and shell, inorganic-looking limbs and small drifting fish around it; no human skin', focus: 'center', swim: true, trait: 'Coral e conchas', traits: ['branching red coral', 'fan corals along the shoulders', 'a shell for a head', 'colonies of glowing polyps'], neg: 'human skin, human hair'},
  cosmic: {label: 'Horror cósmico: alienígena e assimétrico', text: 'alien anatomy of no known species, intentionally impossible and asymmetrical: writhing limbs, eyes in the wrong places, a form the mind cannot fully read. The deformity is intended and must stay coherent as one body', focus: 'eyes', fly: true, swim: true, trait: 'Formas alienígenas', traits: ['countless eyes opening along the body', 'a shape folding into itself', 'tendrils fading into the void', 'mouths where there should be none', 'a body lit from inside by dead stars'], neg: 'human face, human hair, human skin, human warrior in armor, human figure in front of the monster'},
  centaur: {label: 'Centauro: tronco humano, corpo equino, 4 patas', text: 'centaur anatomy: human torso, head and two arms with exactly five fingers on each visible hand, joined coherently at the waist to a horse body with four legs and hooves and a tail', hands: true, ethnicity: true, hair: true, humanMood: true, focus: 'face', neg: ''},
  multiarm: {label: 'Hecatônquiro: muitos braços', text: 'giant humanoid anatomy with many arms, all rising coherently from one huge torso, and several heads. The many arms are intended', focus: 'face', humanMood: true, trait: 'Braços e cabeças', traits: ['a hundred arms in a fan', 'fifty heads in tiers', 'arms each holding a boulder', 'skin cracked like a mountain'], neg: 'human figure in front of the monster'},
  spirit: {label: 'Espírito: forma etérea, sem peso', text: 'ethereal body without weight: translucent or smoky form, edges that dissolve into the air, feet that do not need to touch the ground', focus: 'center', fly: true, trait: 'Forma etérea', traits: ['a body of pale mist', 'a trailing shroud', 'glowing hollow eyes', 'ghost lights orbiting the form'], neg: 'opaque solid human skin'},
  undead: {label: 'Morto-vivo: carne seca, ossos à mostra', text: 'undead body: dried flesh over visible bones, sunken face, coherent joints despite the decay. The decay is intended', focus: 'face', trait: 'Decomposição', traits: ['exposed ribs', 'sunken glowing eyes', 'a jaw hanging loose', 'rusted armor grown into the flesh'], neg: 'healthy skin'},
  skeleton: {label: 'Esqueleto: só ossos, sem pele', text: 'skeleton body: bones only, no skin and no muscle, a skull with empty sockets, coherent joints, and bony hands', focus: 'eyes', trait: 'Ossos', traits: ['blackened old bones', 'cracked yellowed skull', 'points of light in the sockets', 'bones bound with rusted wire'], neg: 'skin, muscles, hair'},
  construct: {label: 'Construto: articulações mecânicas, inorgânico', text: 'constructed body of inorganic material: visible mechanical or stone joints, hard plates, no skin and no muscle', focus: 'center', trait: 'Material e juntas', traits: ['carved stone plates', 'bronze gears at the joints', 'empty armor with light inside', 'runes along the seams', 'cracks leaking cosmo'], neg: 'skin, human face'},
  crystal: {label: 'Cristalina: facetas e luz interna', text: 'crystalline body: faceted translucent mineral limbs with light refracting inside, sharp edges and no skin', focus: 'center', trait: 'Cristal', traits: ['violet amethyst facets', 'clear crystal with a core of light', 'dark smoky quartz', 'clusters growing along the shoulders'], neg: 'skin, human hair'},
  elemental: {label: 'Elemental ou de Cosmo: corpo de energia', text: 'body made of pure element or cosmo energy, with a clear silhouette held together by a brighter core and no solid skin', focus: 'center', fly: true, trait: 'Elemento', traits: ['living flame', 'a storm of water', 'whirling stone and dust', 'pure golden cosmo', 'violet cosmic plasma'], neg: 'skin, human hair'},
  shadow: {label: 'Sombra: silhueta sem rosto', text: 'body of living shadow: a solid dark silhouette with edges that bleed into the air and no visible face features except optional faint eyes', focus: 'center', trait: 'Sombra', traits: ['faint red eyes', 'long reaching shadow arms', 'an edge that smokes like ash', 'a cloak that merges with the body'], neg: 'detailed human face, skin'},
  plant: {label: 'Planta: raízes, galhos, vinhas', text: 'plant body: bark, roots, branches and vines in place of muscle, thorns and leaves, a coherent silhouette with no human skin', focus: 'center', trait: 'Galhos e vinhas', traits: ['great thorned vines', 'a crown of dark branches', 'a carnivorous flower for a head', 'glowing sap in the cracks'], neg: 'human skin, human hair'},
  custom: {label: 'Definida pela descrição do tipo personalizado', text: 'anatomy coherent with the description of this being, with hands only if it has them', focus: 'center', hair: true, trait: 'Características', traits: [], neg: ''},
  hybrid: {label: 'Híbrida: humana e animal, união coerente', text: 'hybrid body mixing human and non-human parts, joined coherently where they meet; the mutation is intended', hands: false, ethnicity: true, hair: true, humanMood: true, focus: 'face', trait: 'Traços da mutação', traits: ['one arm turned into a claw', 'scales spreading across the skin', 'extra eyes on the face', 'a tail and digitigrade legs', 'a body caught mid-transformation'], neg: ''},
};

const row = (id, group, label, noun, en, profile, plural) => ({id, group, label, noun, en, profile, plural});
const A = 'Humanos e humanoides', B = 'Animais e criaturas', C = 'Seres marinhos e abissais', D = 'Criaturas mitológicas', E = 'Seres sobrenaturais', F = 'Seres construídos e elementais';
export const CREATURES = [
  row('human', A, 'Humano', 'human warrior', 'a human', 'human'),
  row('humanoid', A, 'Humanoide', 'humanoid', 'a non-human humanoid being', 'humanoid'),
  row('human_giant', A, 'Humano gigante', 'human giant', 'a colossal human giant', 'human'),
  row('dwarf', A, 'Anão', 'dwarf', 'a stout dwarf', 'human', 'dwarves'),
  row('elf', A, 'Elfo', 'elf', 'a slender elf with long pointed ears', 'human', 'elves'),
  row('orc', A, 'Orc', 'orc', 'a brutal orc', 'humanoid'),
  row('goblin', A, 'Goblin', 'goblin', 'a small cunning goblin', 'humanoid'),
  row('troll', A, 'Troll', 'troll', 'a huge rough-skinned troll', 'humanoid'),
  row('ogre', A, 'Ogro', 'ogre', 'a massive brutish ogre', 'humanoid'),
  row('barbarian', A, 'Bárbaro', 'barbarian', 'a fierce human barbarian', 'human'),
  row('bird', B, 'Ave', 'bird', 'a large bird', 'bird'),
  row('raptor', B, 'Ave de rapina', 'bird of prey', 'a fierce bird of prey', 'bird', 'birds of prey'),
  row('mythic_bird', B, 'Ave mítica', 'mythic bird', 'a mythic bird of immense size', 'bird'),
  row('wolf', B, 'Lobo ou canídeo', 'wolf', 'a great wolf-like canine', 'beast', 'wolves'),
  row('feline', B, 'Felino', 'feline', 'a great feline predator', 'beast'),
  row('reptile', B, 'Réptil', 'reptile', 'a large reptilian predator', 'reptile'),
  row('giant_serpent', B, 'Serpente gigante', 'giant serpent', 'a giant serpent', 'serpent'),
  row('insectoid', B, 'Insetoide', 'insectoid', 'a monstrous insectoid', 'insect'),
  row('arachnid', B, 'Aracnídeo', 'arachnid', 'a monstrous arachnid', 'arachnid'),
  row('dragon', B, 'Dragão', 'dragon', 'a dragon', 'dragon'),
  row('sea_creature', C, 'Criatura marinha', 'sea creature', 'a large sea creature', 'marine'),
  row('aquatic_humanoid', C, 'Humanoide aquático', 'aquatic humanoid', 'an aquatic humanoid', 'aquatic'),
  row('merfolk', C, 'Sereia ou tritão', 'merfolk warrior', 'a mermaid or triton', 'merfolk'),
  row('abyssal_monster', C, 'Monstro abissal', 'abyssal monster', 'an ancient abyssal sea monster from the deepest trenches', 'abyssal'),
  row('kraken', C, 'Kraken', 'kraken', 'a colossal kraken', 'cephalopod', 'krakens'),
  row('leviathan', C, 'Leviatã', 'leviathan', 'a world-sized leviathan', 'marine'),
  row('cephalopod', C, 'Cefalópode monstruoso', 'monstrous cephalopod', 'a monstrous cephalopod', 'cephalopod'),
  row('coral_being', C, 'Ser coralino', 'coral being', 'a living being of coral', 'coral'),
  row('biolum_being', C, 'Ser bioluminescente', 'bioluminescent being', 'a deep-sea being that glows with its own light', 'marine'),
  row('cosmic_horror', C, 'Horror cósmico', 'cosmic horror', 'a cosmic horror of unknowable origin', 'cosmic'),
  row('centaur', D, 'Centauro', 'centaur', 'a centaur', 'centaur'),
  row('minotaur', D, 'Minotauro', 'minotaur', 'a bull-headed minotaur', 'beastfolk'),
  row('satyr', D, 'Sátiro', 'satyr', 'a goat-legged satyr', 'beastfolk'),
  row('gorgon', D, 'Górgona', 'gorgon', 'a gorgon with living snakes for hair', 'beastfolk'),
  row('chimera', D, 'Quimera', 'chimera', 'a chimera', 'chimera'),
  row('hydra', D, 'Hidra', 'hydra', 'a many-headed hydra', 'hydra'),
  row('griffon', D, 'Grifo', 'griffon', 'a griffon', 'griffon'),
  row('cyclops', D, 'Ciclope', 'cyclops', 'a one-eyed giant cyclops', 'humanoid', 'cyclopes'),
  row('hecatoncheires', D, 'Hecatônquiro', 'hecatoncheires', 'a hundred-armed hecatoncheires', 'multiarm', 'hecatoncheires'),
  row('harpy', D, 'Harpia', 'harpy', 'a harpy', 'harpy'),
  row('deity', E, 'Divindade', 'deity', 'a divine being', 'divine'),
  row('demigod', E, 'Semideus', 'demigod', 'a demigod', 'divine'),
  row('angel', E, 'Anjo', 'angel', 'an angel', 'winged'),
  row('fallen_angel', E, 'Anjo caído', 'fallen angel', 'a fallen angel with darkened wings', 'winged'),
  row('demon', E, 'Demônio', 'demon', 'a demon', 'demon'),
  row('spirit', E, 'Espírito', 'spirit', 'a spirit', 'spirit'),
  row('ghost', E, 'Fantasma', 'ghost', 'a ghost', 'spirit'),
  row('undead', E, 'Espectro ou morto-vivo', 'undead warrior', 'an undead being', 'undead'),
  row('skeleton_warrior', E, 'Esqueleto guerreiro', 'skeleton warrior', 'a skeleton warrior', 'skeleton'),
  row('titan', E, 'Titã', 'titan', 'a colossal titan', 'divine'),
  row('golem', F, 'Golem', 'golem', 'a golem of stone', 'construct'),
  row('automaton', F, 'Autômato', 'automaton', 'a bronze automaton', 'construct'),
  row('armor_construct', F, 'Construto de armadura', 'living armor', 'an empty suit of armor animated by cosmo', 'construct', 'living armors'),
  row('crystal_being', F, 'Ser cristalino', 'crystal being', 'a crystalline being', 'crystal'),
  row('elemental', F, 'Elemental', 'elemental', 'an elemental being', 'elemental'),
  row('cosmo_entity', F, 'Entidade de Cosmo', 'cosmo entity', 'an entity made of pure cosmo', 'elemental', 'cosmo entities'),
  row('shadow_being', F, 'Ser das sombras', 'shadow being', 'a being of living shadow', 'shadow'),
  row('monster_plant', F, 'Planta monstruosa', 'monstrous plant', 'a monstrous plant', 'plant'),
  row('mutant', F, 'Mutante ou híbrido', 'mutant', 'a mutant hybrid being', 'hybrid'),
  row('shapeshifter', F, 'Metamorfo', 'shapeshifter', 'a shapeshifter caught between forms', 'hybrid'),
];
export const CREATURE_CHOICES = [['auto', 'Automático pela carta'], ['random', 'Aleatório'], ['custom', 'Personalizado']];
export const creatureById = (id) => CREATURES.find((c) => c.id === id);

// O que é coerente com cada deus quando o autor pede tipo aleatório.
const GOD_GROUPS = {Poseidon: [C], Hades: [E], Ares: [A, B], Artemis: [B, D], Athena: [A, D]};
export const creaturePool = (god) => CREATURES.filter((c) => (GOD_GROUPS[god] || [A, B, C, D, E, F]).includes(c.group));

// Subtipo de carta só serve de pista visual aqui: Abyssal vira monstro, Wolf vira lobo. Nunca o contrário.
const SUBTYPE_CREATURES = [[/Abyss/, 'abyssal_monster'], [/Wolf|Hound|Fox/, 'wolf'], [/Serpent/, 'giant_serpent'], [/Treant/, 'monster_plant'], [/Skeleton/, 'skeleton_warrior'], [/Construct/, 'automaton']];
const BEAST = /Beast|Stag|Bear/;
export function creatureFromSubtypes(subtypes = []) {
  for (const [re, id] of SUBTYPE_CREATURES) if (subtypes.some((s) => re.test(s))) return creatureById(id);
  const beast = subtypes.find((s) => BEAST.test(s));
  return beast ? row('beast', B, 'Besta', beast.toLowerCase(), `a ${beast.toLowerCase()}`, 'beast') : null;
}

// source diz de onde vem o nome; o que é original do jogo nunca é apresentado como oficial da obra.
const order = (id, god, label, noun, en, source = 'canon', plural) => ({id, god, label, noun, en, source, plural});
export const ORDERS = [
  order('saint', 'Athena', 'Saint', 'Saint', 'a warrior of Athena in a sacred armor shaped like a constellation'),
  order('bronze_saint', 'Athena', 'Bronze Saint', 'Bronze Saint', 'a warrior of Athena in a bronze-rank sacred armor, young and fierce'),
  order('silver_saint', 'Athena', 'Silver Saint', 'Silver Saint', 'a warrior of Athena in a silver-rank sacred armor, disciplined and proud'),
  order('gold_saint', 'Athena', 'Gold Saint', 'Gold Saint', 'an elite warrior of Athena in a radiant gold-rank sacred armor'),
  order('black_saint', 'Athena', 'Black Saint', 'Black Saint', 'a renegade warrior in a dark sacred armor, a corrupted reflection of the Saints'),
  order('steel_saint', 'Athena', 'Steel Saint', 'Steel Saint', 'a warrior in a mechanical armor of polished steel, built by science rather than the stars'),
  order('ghost_saint', 'Athena', 'Ghost Saint', 'Ghost Saint', 'a ghostly warrior in a dull grey sacred armor, an outcast of the order'),
  order('marina', 'Poseidon', 'Marina', 'Marina', 'a warrior of Poseidon in scale armor of turquoise and gold, carrying marine weapons such as spears and tridents'),
  order('marina_general', 'Poseidon', 'Marina General', 'Marina General', 'a commander of Poseidon in ornate golden scale armor shaped like a sea creature'),
  order('ocean_temple_guard', 'Poseidon', 'Ocean Temple Guard', 'Ocean Temple Guard', 'a soldier sworn to guard the temple of Poseidon, in disciplined turquoise and gold armor with long spears and round shields', 'original'),
  order('abyssal', 'Poseidon', 'Abyssal', 'Abyssal', 'a thing of the deep trenches that serves the sea god without being a soldier', 'original', 'Abyssals'),
  order('aquatic_creature', 'Poseidon', 'Aquatic Creature', 'aquatic creature', 'a wild creature of the sea, loyal to the sea god', 'original'),
  order('specter', 'Hades', 'Specter', 'Specter', 'a warrior of Hades in a dark surplice of black metal with sharp insect-like wings and a sinister silhouette'),
  order('judge_specter', 'Hades', 'Judge Specter', 'Judge Specter', 'a supreme commander of Hades in a towering black surplice with great wings'),
  order('skeleton_order', 'Hades', 'Skeleton', 'skeleton soldier', 'a foot soldier of the underworld, with worn armor over bare bones'),
  order('underworld_guardian', 'Hades', 'Underworld Guardian', 'Underworld Guardian', 'a guardian of a gate of the underworld', 'adaptation'),
  order('undead_order', 'Hades', 'Undead', 'undead soldier', 'a restless dead soldier bound to the underworld', 'adaptation'),
  order('tartarus_creature', 'Hades', 'Tartarus Creature', 'creature of Tartarus', 'a monster that crawled out of Tartarus', 'original', 'creatures of Tartarus'),
  order('berserker', 'Ares', 'Berserker', 'Berserker', 'a warrior of Ares in brutal blood-red war armor, driven by rage'),
  order('red_fire', 'Ares', 'Red Fire Battalion', 'Red Fire soldier', 'a soldier of the Red Fire Battalion in armor of burning red and iron', 'original'),
  order('black_blood', 'Ares', 'Black Blood Battalion', 'Black Blood soldier', 'a soldier of the Black Blood Battalion in blackened armor stained dark', 'original'),
  order('iron_howl', 'Ares', 'Iron Howl Battalion', 'Iron Howl soldier', 'a soldier of the Iron Howl Battalion in heavy iron armor with wolf-like helmets', 'original'),
  order('crimson', 'Ares', 'Crimson Battalion', 'Crimson soldier', 'a soldier of the Crimson Battalion in crimson lacquered armor', 'original'),
  order('satellite', 'Artemis', 'Satellite', 'Satellite', 'a servant of Artemis in silver lunar armor with crescent motifs', 'adaptation'),
  order('huntress', 'Artemis', 'Huntress', 'huntress', 'a huntress of Artemis, light silver armor, bow and hunting spear', 'original', 'huntresses'),
  order('moon_guardian', 'Artemis', 'Moon Guardian', 'Moon Guardian', 'a guardian of the moon sanctuaries in pale silver armor', 'original'),
  order('lunar_creature', 'Artemis', 'Lunar Creature', 'lunar creature', 'a creature blessed by the moon, with a pale silver glow', 'original'),
  order('god_warrior', '', 'God Warrior', 'God Warrior', 'a northern warrior in a sacred armor shaped like a mythic beast', 'canon'),
  order('angel_order', '', 'Angel', 'Angel', 'a winged servant of the Olympian gods in shining armor', 'canon'),
  order('titan_order', '', 'Titan', 'Titan', 'one of the ancient gods who came before Olympus', 'canon'),
  order('dryad', '', 'Dryad', 'Dryad', 'a spirit of the sacred forest', 'adaptation'),
  order('divine_servant', '', 'Divine Servant', 'Divine Servant', 'a servant of the gods in sacred ceremonial robes and armor', 'original'),
  order('mythological_creature', '', 'Mythological Creature', 'mythological creature', 'a creature out of Greek myth', 'adaptation'),
  order('neutral', '', 'Neutral', 'independent warrior', 'an independent warrior who serves no god', 'original'),
];
export const orderById = (id) => ORDERS.find((o) => o.id === id);
const SUBTYPE_ORDERS = {'Judge Specter': 'judge_specter', Specter: 'specter', 'Marina General': 'marina_general', Marina: 'marina', Abyssal: 'abyssal', Skeleton: 'skeleton_order', Berserker: 'berserker', 'Red Fire Legion': 'red_fire', Satellite: 'satellite', 'Lunar Guardian': 'moon_guardian', 'Bronze Saint': 'bronze_saint', 'Silver Saint': 'silver_saint', 'Gold Saint': 'gold_saint', 'Black Saint': 'black_saint', 'Steel Saint': 'steel_saint', 'Ghost Saint': 'ghost_saint', Saint: 'saint'};
export function orderFromCard(name, subtypes = []) {
  if (/TEMPLE GUARD/.test(name)) return orderById('ocean_temple_guard');
  for (const [sub, id] of Object.entries(SUBTYPE_ORDERS)) if (subtypes.includes(sub)) return orderById(id);
  return null;
}

export const COUNTS = [['1', '1: Individual'], ['2', '2: Dupla'], ['3', '3: Trio'], ['4', '4: Quarteto'], ['5', '5: Pequeno grupo'], ['6', '6'], ['8', '8'], ['10', '10: Esquadrão'], ['15', '15: Pelotão (aprox.)'], ['20', '20: Formação (aprox.)'], ['30', '30: Tropa (aprox.)'], ['50', '50: Exército (aprox.)'], ['100', '100+: Grande exército'], ['custom', 'Personalizado']];
// Até 10 dá para pedir número exato; acima disso nenhum gerador conta, então o prompt pede aproximado.
export const EXACT_LIMIT = 10, ARMY_FROM = 15, CROWD_FROM = 100;
export function countOf(p) {
  const n = p.count === 'custom' ? Math.floor(Number(p.countCustom)) : Number(p.count ?? 1);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : 1; // zero só vale nas naturezas que aceitam arte sem personagens
}
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const countWord = (n) => WORDS[n] || String(n);

// {place} é o templo ou lugar do deus escolhido. min, max e needs limitam o que o Randomizar sorteia; na mão, o autor pode tudo.
const f = (id, label, text, min = 2, max = 999, needs) => ({id, label, text, min, max, needs});
export const FORMATIONS = [
  f('single', 'Individual', 'a single figure alone in the frame', 1, 1),
  f('side_by_side', 'Lado a lado', 'side by side at the same depth, shoulder to shoulder', 2, 6),
  f('triangle', 'Trio triangular', 'in a triangle, one figure closer to the camera and two behind on either side', 3, 3),
  f('v', 'Formação em V', 'in a V formation with the point toward the viewer', 3, 30),
  f('line', 'Formação em linha', 'in a single line across the frame', 3, 15),
  f('ranks', 'Formação em fileiras', 'in orderly ranks receding in depth', 4),
  f('squad_moving', 'Esquadrão em movimento', 'as a squad advancing together, the bodies staggered in depth', 3, 20),
  f('battle', 'Formação de batalha', 'in battle formation with weapons ready, front rank and rear rank clearly separated', 3),
  f('defensive', 'Formação defensiva', 'in a tight defensive formation, facing outward, covering each other', 3, 50),
  f('garrison', 'Guarnição militar', 'as a military garrison at attention, evenly spaced', 4),
  f('temple_guard', 'Guarda de templo', 'standing in disciplined defensive formation before the sacred pillars of {place}', 2, 50),
  f('patrol', 'Patrulha', 'as a patrol moving through the scene, alert, watching different directions', 2, 10),
  f('hunting', 'Bando em caça', 'as a hunting party spread in an arc, tracking the same prey', 2, 20),
  f('swimming', 'Nadando juntos', 'swimming together in a hunting formation, bodies angled the same way, trails of bubbles and currents behind them', 2, 50, 'swim'),
  f('flying', 'Voando em formação', 'flying in formation at different heights, wings or energy trails coherent with the direction of flight', 2, 50, 'fly'),
  f('riding', 'Cavalgando', 'riding mounts together at speed, each rider on one coherent mount', 2, 30, 'ride'),
  f('surrounding', 'Cercando inimigo', 'surrounding one enemy in a closing ring, all attention pointing inward', 3, 30),
  f('protecting', 'Protegendo líder', 'closing ranks around the leader at the center, facing outward to protect that figure', 3, 20),
  f('leader_front', 'Líder à frente', 'one leader clearly in front, the others following behind in order', 2),
  f('ceremony', 'Cerimônia', 'in a solemn ceremony, symmetrical, heads bowed before a sacred point', 3),
  f('ritual', 'Ritual', 'performing a ritual together around a source of energy, all bodies turned toward it', 3, 30),
  f('march', 'Marcha militar', 'in a military march, columns in step advancing toward the viewer, a clear hierarchy from officers to ranks', 6),
  f('charge', 'Investida coletiva', 'in a collective charge straight at the viewer, the front figures breaking ahead', 3),
  f('organized_army', 'Exército organizado', 'as an organized army in blocks with visible banners and commanders, silhouettes readable by rank', 15),
  f('chaotic_horde', 'Horda caótica', 'as a chaotic horde pouring forward without order, a mass of bodies with a few readable figures in front', 10),
  f('swarm', 'Enxame', 'as a swarm filling the air or water, many small silhouettes moving as one', 10),
  f('crowd', 'Multidão', 'as a dense crowd receding to the horizon, individual figures only in the foreground', 15),
  f('circular', 'Formação circular', 'in a circle seen so the whole ring reads, all at the same distance from its center', 4),
  f('ambush', 'Emboscada', 'hidden among the terrain in an ambush, half-seen figures about to strike from several sides', 3, 20),
];
export const formationById = (id) => FORMATIONS.find((x) => x.id === id);
export const suggestFormation = (n, profile = {}) => n <= 1 ? 'single' : profile.swim && !profile.hands ? 'swimming' : profile.fly && !profile.hands ? 'flying' : n === 2 ? 'side_by_side' : n === 3 ? 'triangle' : n <= 10 ? 'battle' : n < 50 ? 'garrison' : n < CROWD_FROM ? 'organized_army' : 'crowd';

export const VARIETIES = [
  ['same_class', 'Variações da mesma classe', 'all from the same class and uniform, with visible differences of build, pose, face, weapon and ornaments, so no two look copied'],
  ['identical', 'Todos idênticos', 'all figures are identical in design and uniform on purpose, like a matched unit'],
  ['different', 'Todos diferentes', 'every figure has a distinct design, silhouette and equipment, while still reading as one faction'],
  ['leader_uniform', 'Líder + tropa uniforme', 'one leader with a clearly superior design commands a uniform troop'],
  ['leader_varied', 'Líder + integrantes variados', 'one leader with a clearly superior design commands followers who each look different'],
  ['mixed', 'Mistura de espécies', 'a mixed company of different species; each species keeps its own coherent anatomy, and all share the identity of the faction'],
];
export const LEADS = [
  ['moderate', 'Protagonista moderado', 'one figure stands slightly forward as the protagonist; the others remain clearly readable around that figure'],
  ['dominant', 'Protagonista dominante', 'one protagonist dominates the foreground, larger and better lit; the others support that figure behind'],
  ['balanced', 'Distribuição equilibrada', 'visual weight is shared evenly; no single figure stands out over the others'],
  ['collective', 'Cena coletiva sem protagonista', 'a collective scene with no protagonist; the group itself is the subject'],
];

// Pose e comportamento de criatura: needs filtra pelo corpo (voar, nadar, sem nadar).
export const CREATURE_POSES = [
  ['Rising to full height, looming over the viewer'], ['Crouched low, about to strike'], ['Lunging forward with the mouth or weapon-like limb open'], ['Turning the head slowly toward the viewer'],
  ['Prowling sideways through the scene'], ['Motionless and watching, half hidden'], ['Coiled around the surroundings'], ['Tearing through a structure'],
  ['Roaring toward the sky'], ['Guarding a sacred place'], ['Emerging from darkness, only the front of the body lit'], ['Standing over a defeated enemy'],
  ['Soaring with the wings at full spread', 'fly'], ['Diving from above at speed', 'fly'], ['Hovering in place with the body held still', 'fly'],
  ['Gliding through deep water with the body curved', 'swim'], ['Rising from the abyss toward the light', 'swim'], ['Drifting motionless in the current', 'swim'],
].map(([label, needs]) => ({label, needs}));
export const CREATURE_MOODS = ['Predatory stillness', 'Territorial rage', 'Ancient indifference', 'Curious and intelligent attention', 'Hungry patience', 'Wild terror-inducing fury', 'Sacred, solemn vigilance', 'Silent menace', 'Pain and fury from an old wound', 'Loyal protectiveness toward its master'];

// Pedidos que brigam com a regra técnica do formato: a regra vence e o trecho fica fora do prompt.
const FORBIDDEN = /(?<!\b(?:sem|no|without|nenhum|nenhuma|not|não|nao)\s(?:a\s|an\s|the\s|o\s|um\s|uma\s)?)\b(texto|text|título|titulo|title|logotipo|logo|marca d'água|marca dagua|watermark|moldura|card frame|card border|borda da carta|números da carta|card stats|interface|formato paisagem|formato horizontal|landscape format|horizontal format|16:9)\b/i;
const ALONE = /\b(sozinho|sozinha|apenas um|apenas uma|um só|uma só|alone|only one|single character)\b/i;
const sentences = (notes) => String(notes || '').split(/(?<=[.;!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
export const allowedNotes = (notes) => sentences(notes).filter((s) => !FORBIDDEN.test(s)).join(' ');
export const blockedNotes = (notes) => sentences(notes).filter((s) => FORBIDDEN.test(s));
export const notesAskAlone = (notes) => ALONE.test(String(notes || ''));
