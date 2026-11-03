// Natureza da arte: o que a imagem mostra, separado do tipo mecânico da carta.
// Cada opção é [id, rótulo no popup, texto em inglês do prompt]. O classificador só sugere; quem decide é o autor.
import {creatureFromSubtypes, orderFromCard} from './art-taxonomy.js?v=20261102-arte16';

export const PROMPT_VERSION = 'v3';
export const NATURES = [
  ['auto', 'Automático pela carta'], ['character', 'Character Art: personagens e criaturas'], ['scene', 'Narrative Scene Art: acontecimento'], ['technique', 'Technique & Effect Art: poder e efeito'],
  ['equipment', 'Equipment & Artifact Art: objeto'], ['domain', 'Domain & Environment Art: lugar'], ['divine', 'Divine & Conceptual Art: manifestação'],
];
export const ROLES = [
  ['', 'Automático', ''], ['protagonist', 'Protagonista', 'the protagonist of the image'], ['antagonist', 'Antagonista', 'an antagonist, threatening and dominant'], ['supporting', 'Coadjuvante', 'a supporting figure, not the center of attention'],
  ['leader', 'Líder do grupo', 'the leader of the group'], ['member', 'Integrante do grupo', 'one member among equals in a group'], ['guardian', 'Guardião', 'a guardian protecting a place or a person'], ['summoned', 'Criatura invocada', 'a summoned being, called into the scene by a power'],
  ['victim', 'Vítima', 'a victim, overwhelmed by what is happening'], ['witness', 'Testemunha', 'a witness watching the event, not acting in it'], ['distant', 'Silhueta distante', 'a distant silhouette, small in the frame, with no readable face'], ['crowd', 'Multidão', 'part of an anonymous crowd, with no individual focus'], ['symbolic', 'Presença simbólica', 'a symbolic presence, suggested more than shown'],
];
export const FACELESS_ROLES = new Set(['distant', 'crowd', 'symbolic']);

const custom = (label = 'Personalizado') => ['custom', label, ''];
export const SCENE_TYPES = [
  ['sacrifice', 'Sacrifício', 'a sacrifice'], ['oath', 'Juramento', 'a solemn oath'], ['revelation', 'Revelação', 'a revelation'], ['awakening', 'Despertar', 'an awakening'], ['betrayal', 'Traição', 'a betrayal'], ['meeting', 'Encontro', 'a fateful meeting'],
  ['farewell', 'Despedida', 'a farewell'], ['mourning', 'Morte ou luto', 'death and mourning'], ['rescue', 'Resgate', 'a rescue'], ['protection', 'Proteção', 'an act of protection'], ['victory', 'Vitória', 'a victory'], ['defeat', 'Derrota', 'a defeat'],
  ['duel', 'Duelo', 'a duel'], ['battle', 'Batalha coletiva', 'a collective battle'], ['ritual', 'Ritual', 'a ritual'], ['transformation', 'Transformação', 'a transformation'], ['resurrection', 'Ressurreição', 'a resurrection'], ['memory', 'Memória', 'a memory'],
  ['prophecy', 'Profecia', 'a prophecy'], ['catastrophe', 'Catástrofe', 'a catastrophe'], ['discovery', 'Descoberta', 'a discovery'], ['preparation', 'Preparação', 'the preparation for what is coming'], ['training', 'Treinamento', 'a training'], ['divine', 'Manifestação divina', 'a divine manifestation'],
  ['aftermath', 'Consequência de batalha', 'the aftermath of a battle'], ['celebration', 'Celebração', 'a celebration'], ['judgment', 'Julgamento', 'a judgment'], ['prison', 'Prisão', 'an imprisonment'], ['liberation', 'Libertação', 'a liberation'], ['destruction', 'Destruição', 'a destruction'],
  ['rebuilding', 'Reconstrução', 'a rebuilding'], ['ceremony', 'Cerimônia', 'a ceremony'], ['crossing', 'Travessia', 'a crossing'], ['last_farewell', 'Despedida final', 'a final farewell'], ['symbolic', 'Cena simbólica', 'a symbolic scene'], custom(),
];
export const SCENE_MOMENTS = [
  ['before', 'Antes do evento', 'just before the event, tension building'], ['during', 'Durante o evento', 'while the event unfolds'], ['decisive', 'Instante decisivo', 'the decisive instant'], ['after', 'Imediatamente depois', 'immediately after the event'],
  ['later', 'Consequência distante', 'long after the event, only its consequence remains'], ['flashback', 'Flashback', 'as a flashback, a remembered image'], ['future', 'Visão do futuro', 'as a vision of the future'], ['symbolic', 'Representação simbólica', 'as a symbolic representation, not a literal one'],
];
export const SCENE_FOCI = [
  ['event', 'Acontecimento', 'the event itself'], ['character', 'Personagem', 'one character'], ['interaction', 'Interação entre personagens', 'the interaction between the characters'], ['object', 'Objeto', 'the object named by the card, as the central narrative element'],
  ['consequence', 'Consequência', 'what the event left behind'], ['environment', 'Ambiente', 'the environment transformed by the event'], ['emotion', 'Emoção', 'the emotion of the moment'], ['silhouettes', 'Silhuetas', 'silhouettes against the light'], ['abstract', 'Composição abstrata', 'an abstract composition of shapes and energy'],
];
export const FIGURE_FOCI = new Set(['character', 'interaction']);

export const EFFECTS = [
  ['cosmo', 'Cosmo puro', 'pure cosmo'], ['focused', 'Energia concentrada', 'focused energy'], ['explosion', 'Explosão', 'an explosion'], ['shockwave', 'Onda de choque', 'a shockwave'], ['blast', 'Rajada', 'an energy blast'], ['projectile', 'Projétil', 'an energy projectile'],
  ['ice', 'Gelo', 'ice'], ['freeze', 'Congelamento', 'absolute freezing, crystals spreading through everything'], ['fire', 'Fogo', 'fire'], ['plasma', 'Plasma', 'plasma'], ['lightning', 'Eletricidade', 'lightning'], ['water', 'Água', 'water'],
  ['tsunami', 'Maremoto', 'a tidal wave'], ['pressure', 'Pressão oceânica', 'crushing ocean pressure'], ['wind', 'Vento', 'wind'], ['sound', 'Som', 'visible sound waves'], ['vibration', 'Vibração', 'vibration distorting the air'], ['telekinesis', 'Telecinese', 'telekinesis, objects floating in a field of energy'],
  ['telepathy', 'Telepatia', 'telepathy, thought made visible'], ['illusion', 'Ilusão', 'an illusion bending reality'], ['gravity', 'Gravidade', 'gravity crushing or lifting everything'], ['light', 'Luz divina', 'divine light'], ['shadows', 'Sombras', 'living shadows'], ['souls', 'Almas', 'ghostly souls'],
  ['seal', 'Selamento', 'a sealing'], ['barrier', 'Barreira', 'a barrier'], ['healing', 'Cura', 'healing light'], ['regeneration', 'Regeneração', 'regeneration'], ['transformation', 'Transformação', 'a transformation of matter'], ['nature', 'Natureza', 'wild nature growing at impossible speed'],
  ['roots', 'Raízes', 'great roots'], ['disintegration', 'Desintegração', 'disintegration'], ['portal', 'Portal', 'a portal'], ['dimension', 'Dimensão', 'a tear between dimensions'], ['drain', 'Dreno de energia', 'an energy drain'], ['absorption', 'Absorção', 'energy being absorbed'],
  ['stellar', 'Explosão estelar', 'a stellar explosion'], ['constellations', 'Constelações', 'constellations drawn in light'], ['chains', 'Correntes cósmicas', 'cosmic chains'], ['summon', 'Invocação', 'a summoning'], custom(),
];
export const VISIBLE = [
  ['none', 'Nenhum', 0, 'no people at all'], ['caster', 'Conjurador', 1, 'only the caster'], ['target', 'Alvo', 1, 'only the target of the power'], ['both', 'Conjurador e alvo', 2, 'the caster and the target'],
  ['casters', 'Grupo de conjuradores', 3, 'a group of casters'], ['targets', 'Grupo de alvos', 3, 'a group of targets'], ['crowd', 'Multidão', 20, 'a crowd caught by the power'], ['silhouettes', 'Apenas silhuetas', 1, 'only silhouettes, with no readable faces'],
];
export const PHASES = [
  ['prepare', 'Preparação', 'the preparation, the air still calm'], ['focus', 'Concentração', 'the concentration, the energy gathering'], ['charge', 'Carregamento', 'the charging, the energy growing'], ['activate', 'Ativação', 'the activation, the first release'], ['release', 'Disparo', 'the release at full power'],
  ['path', 'Trajetória', 'the trajectory, the energy crossing the frame'], ['impact', 'Impacto', 'the impact'], ['expand', 'Expansão', 'the expansion after the impact'], ['aftermath', 'Consequência', 'the consequence, what the power left'], ['fade', 'Dissipação', 'the dissipation, the last traces of energy'],
];
export const ORIGINS = [
  ['body', 'Corpo', 'the body', true], ['hands', 'Mãos', 'the hands', true], ['eyes', 'Olhos', 'the eyes', true], ['weapon', 'Arma', 'a weapon'], ['armor', 'Armadura', 'an armor'], ['ground', 'Solo', 'the ground'], ['sky', 'Céu', 'the sky'],
  ['water', 'Água', 'the water'], ['portal', 'Portal', 'a portal'], ['sacred', 'Objeto sagrado', 'a sacred object'], ['unseen', 'Fonte invisível', 'an unseen source'], ['many', 'Múltiplas origens', 'several points at once'],
];
export const FORMS = [
  ['beam', 'Feixe', 'a beam'], ['sphere', 'Esfera', 'a sphere'], ['burst', 'Explosão', 'a burst'], ['spiral', 'Espiral', 'a spiral'], ['column', 'Coluna', 'a column'], ['wave', 'Onda', 'a wave'], ['chain', 'Corrente', 'a chain'], ['rain', 'Chuva', 'a rain of energy'],
  ['field', 'Campo de força', 'a force field'], ['storm', 'Tempestade', 'a storm'], ['shards', 'Fragmentação', 'flying shards'], ['vortex', 'Vórtice', 'a vortex'], ['constellation', 'Constelação', 'a constellation'], ['creature', 'Criatura de energia', 'a creature made of energy'], ['pattern', 'Padrão geométrico', 'a geometric pattern'], ['abstract', 'Forma abstrata', 'an abstract form'],
];
export const INTENSITIES = [['1', '1: Sutil', 'subtle'], ['2', '2: Moderada', 'moderate'], ['3', '3: Poderosa', 'powerful'], ['4', '4: Devastadora', 'devastating'], ['5', '5: Divina ou cósmica', 'divine and cosmic']];

export const OBJECT_KINDS = [
  ['auto', 'Automático pela carta', ''], ['cloth', 'Cloth', 'a sacred Cloth armor'], ['scale', 'Scale', 'a Scale armor of the sea god'], ['surplice', 'Surplice', 'a dark Surplice armor of the underworld'], ['warplate', 'Warplate', 'a Warplate armor of war'], ['moonplate', 'Moonplate', 'a Moonplate armor of the moon'],
  ['steel', 'Steel Armor', 'a mechanical armor of steel'], ['renegade', 'Renegade Surplice', 'a corrupted renegade Surplice'], ['weapon', 'Weapon', 'a weapon'], ['sword', 'Sword', 'a sword'], ['spear', 'Spear', 'a spear'], ['trident', 'Trident', 'a trident'], ['bow', 'Bow', 'a bow'],
  ['shield', 'Shield', 'a shield'], ['staff', 'Staff', 'a staff'], ['relic', 'Relic', 'a relic'], ['artifact', 'Artifact', 'an artifact'], ['divine_artifact', 'Divine Artifact', 'a divine artifact'], ['sacred_instrument', 'Sacred Instrument', 'a sacred instrument'], ['musical', 'Musical Instrument', 'a musical instrument'],
  ['mask', 'Mask', 'a mask'], ['cloak', 'Cloak', 'a cloak'], ['box', 'Box', 'a box'], ['device', 'Device', 'a device'], ['facility', 'Facility', 'a facility'], ['living_armor', 'Living Armor', 'a living armor'], custom('Custom Equipment'),
];
// bearer: o que a apresentação pede de quem carrega o objeto; object: só faz sentido sem ninguém em cena.
export const PRESENTATIONS = [
  ['alone', 'Objeto isolado', 'the object alone', '', true], ['pedestal', 'Objeto sobre pedestal', 'the object on a pedestal'], ['mounted', 'Armadura vazia montada', 'the empty armor assembled and standing by itself, no one inside it'], ['worn', 'Armadura equipada', 'the armor worn by its bearer', 'equipped'],
  ['object_form', 'Armadura na forma de objeto', 'the armor assembled in its object form, the totem shape it takes when no one wears it'], ['box_closed', 'Cloth Box fechado', 'the closed Cloth Box, its engraved surface clearly visible'], ['box_open', 'Cloth Box aberto', 'the open Cloth Box with the armor visible inside it'], ['floating', 'Objeto flutuando', 'the object floating in the air'],
  ['held', 'Objeto sendo empunhado', 'the object being held', 'hands'], ['activating', 'Objeto em ativação', 'the object activating, its power waking up'], ['resting', 'Objeto em repouso', 'the object at rest'], ['found', 'Objeto sendo encontrado', 'the object just found, revealed where it was hidden'],
  ['forged', 'Objeto sendo forjado', 'the object being forged, sparks and molten metal around it'], ['repair', 'Objeto em reparo', 'the object under repair, tools and loose parts around it'], ['broken', 'Objeto quebrado', 'the object broken'], ['sealed', 'Objeto selado', 'the object sealed, bound by seals'],
  ['abandoned', 'Objeto abandonado', 'the object abandoned, left behind'], ['buried', 'Objeto enterrado', 'the object half buried'], ['transforming', 'Objeto em transformação', 'the object transforming'], ['summoned', 'Objeto sendo invocado', 'the object being summoned, assembling out of light'],
  ['narrative', 'Objeto em cena narrativa', 'the object inside a narrative scene, still the main subject'], ['macro', 'Detalhe macro do objeto', 'a macro detail of the object, showing its surface and craft'],
];
export const EQUIP_STATES = [
  ['new', 'Novo', 'brand new'], ['intact', 'Intacto', 'intact'], ['old', 'Antigo', 'ancient'], ['used', 'Usado', 'worn by use'], ['damaged', 'Danificado', 'damaged'], ['cracked', 'Rachado', 'cracked, the cracks clearly visible'], ['broken', 'Quebrado', 'broken'],
  ['fragmented', 'Fragmentado', 'fragmented into pieces'], ['repairing', 'Em reparação', 'being repaired'], ['restored', 'Restaurado', 'restored'], ['corrupted', 'Corrompido', 'corrupted'], ['purified', 'Purificado', 'purified'], ['awakening', 'Despertando', 'awakening, its power stirring'], ['divine', 'Divinizado', 'divinized, radiating divine power'],
];
export const DAMAGED_STATES = new Set(['damaged', 'cracked', 'broken', 'fragmented', 'repairing', 'corrupted']);
export const SUPPORTS = [
  ['neutral', 'Fundo neutro', 'a neutral dark backdrop'], ['pedestal', 'Pedestal', 'a stone pedestal in a dim hall'], ['altar', 'Altar', 'a sacred altar'], ['armory', 'Sala de armaduras', 'a hall of armors'], ['temple', 'Templo', 'an ancient temple'], ['ruins', 'Ruínas', 'old ruins'], ['battlefield', 'Campo de batalha', 'a battlefield'],
  ['box', 'Cloth Box', 'beside its Cloth Box'], ['workshop', 'Oficina', 'a workshop'], ['forge', 'Forja', 'a forge'], ['underworld', 'Submundo', 'the underworld'], ['cosmic', 'Fundo cósmico', 'a cosmic background of stars'], ['undersea', 'Fundo submarino', 'an undersea background'], custom(),
];
export const BEARERS = [
  ['auto', 'Automático', ''], ['none', 'Nenhum', ''], ['equipped', 'Personagem equipado', 'a character wearing or carrying it'], ['hands', 'Mãos segurando o objeto', 'only the hands holding it, with no face'], ['silhouette', 'Silhueta', 'a silhouette behind it'], ['partial', 'Portador parcial', 'a partly visible bearer, cropped by the frame'], ['full', 'Portador completo', 'a complete bearer'],
];
export const BODY_BEARERS = new Set(['equipped', 'partial', 'full']);

export const ENV_TYPES = [
  ['temple', 'Templo', 'a temple'], ['sanctuary', 'Santuário', 'a sanctuary'], ['palace', 'Palácio', 'a palace'], ['castle', 'Castelo', 'a castle'], ['fortress', 'Fortaleza', 'a fortress'], ['arena', 'Arena', 'an arena'], ['colosseum', 'Coliseu', 'a colosseum'], ['battlefield', 'Campo de batalha', 'a battlefield'],
  ['ruins', 'Ruínas', 'ruins'], ['city', 'Cidade', 'a city'], ['sunken_city', 'Cidade submersa', 'a sunken city'], ['deep_ocean', 'Oceano profundo', 'the deep ocean'], ['trench', 'Fossa abissal', 'an abyssal trench'], ['river', 'Rio', 'a river'], ['lake', 'Lago', 'a lake'], ['waterfall', 'Cachoeira', 'a waterfall'],
  ['forest', 'Floresta', 'a forest'], ['mountain', 'Montanha', 'a mountain'], ['cave', 'Caverna', 'a cave'], ['desert', 'Deserto', 'a desert'], ['glacier', 'Geleira', 'a glacier'], ['volcano', 'Vulcão', 'a volcano'], ['garden', 'Jardim sagrado', 'a sacred garden'], ['graveyard', 'Cemitério', 'a graveyard'],
  ['necropolis', 'Necrópole', 'a necropolis'], ['prison', 'Prisão', 'a prison'], ['labyrinth', 'Labirinto', 'a labyrinth'], ['bridge', 'Ponte', 'a bridge'], ['gate', 'Portão dimensional', 'a dimensional gate'], ['spirit_world', 'Mundo espiritual', 'the spirit world'], ['underworld', 'Submundo', 'the underworld'], ['cosmic', 'Dimensão cósmica', 'a cosmic dimension'],
  ['void', 'Vazio', 'the void'], ['space', 'Espaço sideral', 'outer space'], ['moon', 'Lua', 'the moon'], ['fractured', 'Realidade fragmentada', 'a fractured reality'], ['abstract', 'Cenário abstrato', 'an abstract setting'], custom(),
];
export const ENV_STATES = [
  ['intact', 'Intacto', 'intact'], ['abandoned', 'Abandonado', 'abandoned'], ['ruined', 'Em ruínas', 'in ruins'], ['building', 'Em construção', 'under construction'], ['falling', 'Sendo destruído', 'being destroyed right now'], ['frozen', 'Congelado', 'frozen'],
  ['flooded', 'Inundado', 'flooded'], ['burning', 'Incendiado', 'on fire'], ['corrupted', 'Corrompido', 'corrupted'], ['restored', 'Restaurado', 'restored'], ['consecrated', 'Consagrado', 'consecrated'], ['changing', 'Em transformação', 'transforming'],
];
export const ENV_SCALES = [
  ['small', 'Pequeno ambiente', 'an intimate small place'], ['room', 'Sala', 'a single room'], ['structure', 'Estrutura', 'one structure'], ['complex', 'Complexo arquitetônico', 'an architectural complex'], ['city', 'Cidade', 'the scale of a city'], ['region', 'Região', 'the scale of a region'], ['landscape', 'Paisagem gigantesca', 'a gigantic landscape'], ['divine', 'Escala divina', 'a scale beyond mortal measure'],
];
const opts = (...rows) => [['', 'Automático', ''], ...rows];
export const ENV_EXTRAS = {
  hour: ['Hora', opts(['dawn', 'Amanhecer', 'at dawn'], ['day', 'Dia', 'in full daylight'], ['dusk', 'Entardecer', 'at dusk'], ['night', 'Noite', 'at night'], ['timeless', 'Sem tempo', 'in a place where time has no meaning'])],
  weather: ['Clima', opts(['clear', 'Limpo', 'clear weather'], ['rain', 'Chuva', 'heavy rain'], ['storm', 'Tempestade', 'a violent storm'], ['snow', 'Neve', 'falling snow'], ['ash', 'Cinzas', 'falling ash'], ['current', 'Correntes', 'strong water currents'])],
  fog: ['Neblina', opts(['none', 'Sem neblina', 'no fog'], ['light', 'Leve', 'light fog'], ['thick', 'Densa', 'thick fog hiding the distance'])],
  depth: ['Profundidade', opts(['shallow', 'Rasa', 'shallow depth of field'], ['layers', 'Em camadas', 'clear foreground, middle ground and background'], ['deep', 'Enorme', 'an enormous depth, layers fading into the distance'])],
  visibility: ['Visibilidade', opts(['full', 'Total', 'everything clearly visible'], ['partial', 'Parcial', 'parts of the place hidden'], ['low', 'Baixa', 'barely visible shapes in the distance'])],
  sky: ['Estado do céu', opts(['clear', 'Limpo', 'a clear sky'], ['clouds', 'Nublado', 'a heavy clouded sky'], ['stars', 'Estrelado', 'a starry sky'], ['moon', 'Lua cheia', 'a full moon in the sky'], ['eclipse', 'Eclipse', 'an eclipse'], ['none', 'Sem céu', 'no sky visible'])],
  lightSource: ['Fonte de iluminação', opts(['sun', 'Sol', 'lit by the sun'], ['moon', 'Lua', 'lit by the moon'], ['fire', 'Fogo', 'lit by fire'], ['cosmo', 'Cosmo', 'lit by glowing cosmo'], ['bio', 'Bioluminescência', 'lit by bioluminescence'], ['surface', 'Luz vinda da superfície', 'lit by shafts of light from far above'])],
  perspective: ['Perspectiva arquitetônica', opts(['one', 'Um ponto de fuga', 'one-point perspective, all lines meeting at the center'], ['two', 'Dois pontos de fuga', 'two-point perspective from a corner'], ['up', 'De baixo para cima', 'looking up at the towering structure'], ['down', 'De cima', 'seen from above, the layout readable'])],
  focal: ['Ponto focal', opts(['center', 'Estrutura central', 'one central structure'], ['path', 'Caminho', 'a path leading the eye inward'], ['gate', 'Portal ou entrada', 'a gate or entrance'], ['horizon', 'Horizonte', 'the far horizon'])],
  phenomena: ['Fenômenos sobrenaturais', opts(['none', 'Nenhum', 'no supernatural phenomena'], ['cosmo', 'Cosmo no ar', 'cosmo drifting in the air'], ['souls', 'Almas vagando', 'souls drifting through the place'], ['floating', 'Rochas flutuando', 'rocks floating in the air'], ['rift', 'Fenda no céu', 'a rift torn in the sky'])],
};

// body: 'full' e 'face' têm rosto e anatomia; o resto não tem corpo a acertar.
export const MANIFESTATIONS = [
  ['physical', 'Deus em forma física', 'in physical form', 'full'], ['throne', 'Deus entronizado', 'seated on a throne', 'full'], ['distant', 'Presença divina distante', 'as a distant divine presence, far away and immense', 'silhouette'], ['silhouette', 'Silhueta divina', 'as a divine silhouette against the light', 'silhouette'],
  ['avatar', 'Avatar', 'through a mortal avatar possessed by the divine', 'full'], ['partial', 'Manifestação parcial', 'partly manifested, the rest dissolving into energy', 'silhouette'], ['face', 'Rosto divino', 'as one immense divine face', 'face'], ['hands', 'Mãos divinas', 'as immense divine hands reaching into the scene', 'hands'],
  ['energy', 'Energia sem corpo', 'as energy without a body', ''], ['symbol', 'Símbolo formado por energia', 'as a sign made of energy, an original shape that is not an official emblem', ''], ['vision', 'Visão', 'as a vision seen by no one in the frame', ''], ['prophecy', 'Profecia', 'as a prophecy written in the sky through images', ''],
  ['entity', 'Entidade cósmica', 'as a cosmic entity beyond human shape', ''], ['concept', 'Conceito abstrato', 'as an abstract concept made visible', ''], ['transformation', 'Transformação divina', 'in the middle of a divine transformation', 'full'],
];
export const DIVINE_SCALES = [['human', 'Humana', 'human scale'], ['heroic', 'Heroica', 'heroic scale'], ['colossal', 'Colossal', 'colossal scale, mountains at the feet'], ['cosmic', 'Cósmica', 'cosmic scale, planets at hand'], ['infinite', 'Infinita ou simbólica', 'infinite and symbolic scale, with nothing to measure it against']];
export const DIVINE_LANGUAGE = {
  Athena: 'gold, white and blue; sacred, protection and hope',
  Poseidon: 'deep blue, turquoise, sea green and gold; oceanic majesty',
  Hades: 'black, violet and bone; shadows, the underworld and souls',
  Ares: 'red, iron and fire; war, destruction and violence',
  Artemis: 'green and silver; nature, the moon, the hunt and ancestral purity',
};
export const VARIANTS = [['default', 'Arte padrão'], ['manga', 'Alternativa de mangá'], ['anime', 'Alternativa de anime'], ['narrative', 'Arte narrativa'], ['symbolic', 'Arte simbólica'], ['character', 'Arte de personagem'], ['effect', 'Arte de efeito'], ['equipment', 'Arte de equipamento'], ['promo', 'Arte promocional']];
export const textOf = (list, id, customText = '') => (id === 'custom' ? String(customText || '').trim() : (list.find((x) => x[0] === id) || [])[2] || '');

const first = (rules, text, fallback) => { for (const [re, id] of rules) if (re.test(text)) return {id, matched: true}; return {id: fallback, matched: false}; };
const SCENE_RULES = [[/SACRIFIC/, 'sacrifice'], [/OATH|PACT|PROMISE|ORDERS?\b|DECREE/, 'oath'], [/BETRAY|DISAGREEMENT/, 'betrayal'], [/GOODBYE|LAMENT|TESTAMENT|FAREWELL|EMBRACE/, 'farewell'], [/DEATH OF|FALL OF IKKI|FALL OF DAPHNE|FALLEN\b|LAST SIREN/, 'mourning'], [/RESURRECT|RETURN FROM|RETURN OF|REBORN/, 'resurrection'], [/AWAKEN|EIGHTH SENSE|FIRST BURN/, 'awakening'], [/PROTECT|DEFENSE|AEGIS|SHIELD|WALL OF|NEVER SURRENDERS|DEFIANCE|UNBROKEN/, 'protection'], [/TRAINING/, 'training'], [/JUDGMENT|JUDGES|TRIAL|VETO/, 'judgment'], [/WARS?\b|BATTLE|INVADE|HOLY WAR|LEGIONS|MARCH|AMBUSH|BLOOD FOR BLOOD|FIRST BLOOD/, 'battle'], [/FALL OF|DESTRUCTION|APOCALYPSE|FLOOD|DELUGE|STORM|ECLIPSE|WRATH/, 'catastrophe'], [/GODDESS|WILL OF|CALL OF|EMPEROR|BLESSING/, 'divine'], [/SACRED HUNT|ASSEMBLE|COMMAND/, 'preparation'], [/CURSE|POSSESSION/, 'ritual'], [/KNOWLEDGE|BENEATH|WHISPERS/, 'discovery']];
const OBJECT_MOMENT = /\bARROW\b|\bSTAFF\b|\bSHIELD\b(?! OF THE)|\bSWORD\b|\bCOIN\b/;
const NARRATIVE_TECHNIQUE = /PROMISE|TRAINING|OATH|PACT|POSSESSION|SACRIFICED|RAISES|SWORD THAT PIERCES/;
const EFFECT_RULES = [[/FREEZ|ABSOLUTE ZERO|FROZEN|ICEBERG|AURORA|COFFIN/, 'freeze'], [/\bICE\b|FROST|SNOW/, 'ice'], [/FLAME|BURN|FIRE|PHOENIX|CRIMSON/, 'fire'], [/PRESSURE/, 'pressure'], [/WAVE|BILLOW|TIDE|SEVEN SEAS/, 'tsunami'], [/WHIRLWIND|WIND/, 'wind'], [/SYMPHONY|WHISPERS|LAMENT/, 'sound'], [/TELEKINESIS/, 'telekinesis'], [/ILLUSION|SENSES|NIGHTMARE|VISION/, 'illusion'], [/LIGHT|DIVINE TOUCH|JUDGMENT/, 'light'], [/SLUMBER|SLEEP|DEATH|DARKNESS/, 'souls'], [/WALL|DEFENSE|SHIELD/, 'barrier'], [/ROOTS/, 'roots'], [/NATURE|FOREST|WILD|GROWTH/, 'nature'], [/RESURRECTION|RETURN/, 'regeneration'], [/EXILE/, 'portal'], [/EXTRACTION/, 'drain'], [/DRAGON|TIGER|BREATH|GALACTIC/, 'stellar'], [/ARROW/, 'projectile'], [/SENSE|WILL OF|BURN OF COSMO/, 'cosmo']];
const FORM_BY_EFFECT = {freeze: 'shards', ice: 'shards', fire: 'column', pressure: 'field', tsunami: 'wave', wind: 'vortex', sound: 'wave', telekinesis: 'field', illusion: 'abstract', light: 'column', souls: 'storm', barrier: 'field', roots: 'chain', nature: 'spiral', regeneration: 'spiral', portal: 'vortex', drain: 'vortex', stellar: 'creature', projectile: 'beam', cosmo: 'sphere'};
const ENV_RULES = [[/TRENCH/, 'trench'], [/UNDERSEA|PILLAR|TIDAL|SUNKEN/, 'sunken_city'], [/LABYRINTH/, 'labyrinth'], [/RIVER/, 'river'], [/PRISON/, 'prison'], [/GATES?\b/, 'gate'], [/CASTLE/, 'castle'], [/ARENA/, 'arena'], [/BATTLEFIELD|FIELDS OF/, 'battlefield'], [/TEMPLE|ALTAR|STATUE|STAIRWAY/, 'temple'], [/FOREST|GROVE|HUNTING GROUNDS|VALE/, 'forest'], [/MOON/, 'moon'], [/PEAKS|TOWER/, 'mountain'], [/COCYTUS/, 'glacier'], [/ELYSION/, 'garden'], [/FORGE/, 'fortress']];
const ENV_STATE_RULES = [[/BURNING/, 'burning'], [/SUNKEN/, 'flooded'], [/COCYTUS/, 'frozen'], [/CARNAGE|SLAUGHTER/, 'ruined']];
const KIND_BY_SUBTYPE = [[/^Cloth$/, 'cloth'], [/^Scale$/, 'scale'], [/^Surplice$/, 'surplice'], [/^Warplate$/, 'warplate'], [/^Moonplate$/, 'moonplate'], [/Sword|Dagger|Axe/, 'sword'], [/Spear/, 'spear'], [/Trident/, 'trident'], [/Bow|Arrow|Quiver/, 'bow'], [/Shield/, 'shield'], [/Mask/, 'mask'], [/Cloak/, 'cloak'], [/Device/, 'device'], [/Facility/, 'facility'], [/Divine (Artifact|Relic)/, 'divine_artifact'], [/Weapon/, 'weapon'], [/Relic/, 'relic'], [/Artifact|Amulet|Supply/, 'artifact']];
const GROUP_NAME = /\b(GUARDS|SOLDIERS|WARRIORS|SPECTERS|SAINTS|BERSERKERS|HUNTRESSES|MARINAS|SKELETONS|WOLVES|PATROL|SQUAD|PACK)\b/;
const ARMOR_KINDS = new Set(['cloth', 'scale', 'surplice', 'warplate', 'moonplate']);
const CONFIDENCE = (matched) => (matched ? 'alta' : 'media');

// Sugestão visual de uma carta, a partir do nome, do subtítulo e dos subtipos. Não lê nem muda nada mecânico.
export function classifyFacts(f) {
  const subtypes = f.subtypes || [], name = f.name || '', text = `${name} ${f.subtitle || ''}`.toUpperCase();
  const base = {nature: 'character', count: '1', confidence: 'media', reason: '', sceneType: 'symbolic', sceneFocus: 'event', effect: 'cosmo', effectMatched: false, sceneMatched: false, form: 'sphere', objectKind: 'auto', presentation: 'alone', equipState: 'intact', support: 'neutral', envType: 'temple', envState: 'intact', envScale: 'complex', manifestation: 'physical', divineScale: 'heroic', archetype: '', focusLabel: 'o personagem'};
  if (f.kind === 'God') return {...base, nature: 'divine', confidence: 'alta', reason: 'Carta de deus: manifestação em forma física como ponto de partida; pode virar forma abstrata.', focusLabel: 'a presença divina', divineScale: 'colossal', archetype: 'Divindade'};
  if (f.kind === 'Domain') {
    const env = first(ENV_RULES, text, 'temple'), state = first(ENV_STATE_RULES, text, 'intact');
    return {...base, nature: 'domain', count: '0', confidence: CONFIDENCE(env.matched), reason: env.matched ? 'Domain com lugar explícito no nome.' : 'Domain sem lugar explícito no nome: tipo de ambiente é um palpite.', envType: env.id, envState: state.id, envScale: /PILLAR|TOWER|STATUE|ALTAR|GATES?\b/.test(text) ? 'structure' : /SANCTUARY|FOREST|FIELDS|PEAKS|BATTLEFIELD|TRENCH|RIVER|ELYSION|GROUNDS|VALE/.test(text) ? 'landscape' : 'complex', focusLabel: 'o lugar', archetype: 'Ambiente'};
  }
  if (f.kind === 'Equipment') {
    const kind = first(KIND_BY_SUBTYPE.map(([re, id]) => [{test: () => subtypes.some((s) => re.test(s))}, id]), text, 'artifact');
    const cracked = /CRACKED/.test(text), repair = /REPAIR/.test(text), box = /\bBOX\b/.test(text);
    return {...base, nature: 'equipment', confidence: CONFIDENCE(kind.matched), reason: kind.matched ? `Equipment com subtipo que define o objeto (${subtypes[0]}).` : 'Equipment sem subtipo claro de objeto.', objectKind: kind.id, presentation: repair ? 'repair' : ARMOR_KINDS.has(kind.id) ? 'mounted' : 'alone', equipState: cracked ? 'cracked' : 'intact', support: repair ? 'workshop' : box ? 'altar' : 'neutral', focusLabel: 'o objeto', archetype: kind.id};
  }
  if (f.kind === 'Technique' && !NARRATIVE_TECHNIQUE.test(text)) {
    const effect = first(EFFECT_RULES, text, 'cosmo');
    return {...base, nature: 'technique', count: '0', confidence: CONFIDENCE(effect.matched), reason: effect.matched ? 'Technique com efeito reconhecido no nome.' : 'Technique sem efeito claro no nome: revise o tipo de efeito.', effect: effect.id, effectMatched: effect.matched, form: FORM_BY_EFFECT[effect.id] || 'sphere', focusLabel: 'o efeito', archetype: 'Efeito'};
  }
  if (f.isSpell) {
    const scene = first(SCENE_RULES, text, 'symbolic'), object = OBJECT_MOMENT.test(text), withPerson = Boolean(f.person);
    const why = f.kind === 'Technique' ? 'Technique cujo nome descreve um acontecimento, não um efeito.' : scene.matched ? 'Moment com acontecimento reconhecido no nome.' : 'Moment sem acontecimento claro no nome: tipo de cena é um palpite.';
    return {...base, nature: 'scene', count: withPerson && !object ? '1' : '0', confidence: scene.matched || object ? CONFIDENCE(true) : 'baixa', reason: why, sceneType: scene.id, sceneMatched: scene.matched, sceneFocus: object ? 'object' : withPerson ? 'character' : 'event', focusLabel: object ? 'o objeto da carta' : 'o acontecimento', archetype: 'Cena'};
  }
  const creature = creatureFromSubtypes(subtypes), order = orderFromCard(name, subtypes), plural = GROUP_NAME.test(name.toUpperCase());
  return {...base, count: plural ? '5' : '1', confidence: creature || order ? 'alta' : 'media', reason: creature ? `Subtipo indica criatura (${creature.label}).` : order ? `Subtipo indica a ordem ${order.label}.` : 'Devotee: personagem individual, sem ordem reconhecida.', archetype: creature?.label || order?.label || 'Personagem', focusLabel: creature ? 'a criatura' : 'o personagem'};
}

// Linha do catálogo de classificação. Fica fora de cards.json: sugestão não é decisão.
export const classificationRow = (id, f, tipo) => {
  const c = classifyFacts(f);
  return {id, nome: f.name, deus: f.faction || '', tipo_mecanico: tipo, subtipos: f.subtypes || [], natureza_sugerida: c.nature, arquetipo_sugerido: c.archetype, personagens_sugeridos: Number(c.count), foco_sugerido: c.focusLabel, cenario_sugerido: c.nature === 'domain' ? c.envType : c.nature === 'equipment' ? c.support : 'cenário da facção', confianca: c.confidence, justificativa: c.reason, status_revisao: 'pendente'};
};
