// Gerador de prompt de arte para o ChatGPT (autor, 02/11/2026), sobre o Master Art Prompt System V1.0 (art-master-prompt.md).
// Duas saídas: o sistema completo com o pedido da carta, para o GPT agir como diretor de arte, ou o prompt direto de imagem.
// No prompt direto o traço vem descrito, sem nome de ilustrador: o gerador de imagem costuma recusar nome de artista vivo.
import {printedKind} from '../shared/rules-policy.js';
import {ANATOMY, ARMY_FROM, CREATURES, CREATURE_CHOICES, CREATURE_MOODS, CREATURE_POSES, COUNTS, CROWD_FROM, EXACT_LIMIT, FORMATIONS, LEADS, ORDERS, VARIETIES, allowedNotes, blockedNotes, countOf, countWord, creatureById, creatureFromSubtypes, creaturePool, formationById, notesAskAlone, orderById, orderFromCard, suggestFormation} from './art-taxonomy.js?v=20261102-arte16';
import {BEARERS, BODY_BEARERS, DAMAGED_STATES, DIVINE_LANGUAGE, DIVINE_SCALES, EFFECTS, ENV_EXTRAS, ENV_SCALES, ENV_STATES, ENV_TYPES, EQUIP_STATES, FACELESS_ROLES, FIGURE_FOCI, FORMS, INTENSITIES, MANIFESTATIONS, NATURES, OBJECT_KINDS, ORIGINS, PHASES, PRESENTATIONS, PROMPT_VERSION, ROLES, SCENE_FOCI, SCENE_MOMENTS, SCENE_TYPES, SUPPORTS, VARIANTS, VISIBLE, classifyFacts, textOf} from './art-natures.js?v=20261102-arte16';
import {formatCardTypeLine} from '../shared/equipment-types.js';
import {ARTEMIS_PROFILES, artemisDirectionLines, artemisNegative, artemisProfile, artemisProfileOf} from './art-direction/artemis-v2.js';
import {FACE_ZONE, FACE_ZONE_BAN, FAMILIES, GAUNTLET_BAN, HAND_FINISHES, STATE_LABELS, armorForArt, consistencySummary, faceZoneRule, gauntletApplies, gauntletRule, imageUrl, latestVersions, lockLines, lockNegative} from './armor-model.js';

const pair = (code, pt) => [code, `${code}: ${pt}`];
export const SHOTS = [
  pair('Extreme Close-Up (ECU)', 'parte específica, como olhos ou boca'), pair('Close-Up (CU)', 'rosto e ombros'), pair('Medium Close-Up', 'peito para cima'),
  pair('Medium Shot (MS)', 'corta na cintura'), pair('Medium Full Shot (MFS)', 'plano americano, corta nos joelhos'), pair('Three-Quarter Shot', 'três quartos do corpo'),
  pair('Full Body Shot (FBS)', 'corpo inteiro'), pair('Wide Shot (WS)', 'personagem menor, cenário em destaque'), pair('Wide Environmental Shot', 'o ambiente é o assunto'),
  pair('Tight Close-Up', 'da testa ao queixo'), pair('Bust Shot', 'busto e ombros'), pair('Waist-Up Portrait, centered', 'retrato da cintura para cima, centrado'),
  pair('Cowboy Shot', 'corta no meio da coxa'), pair('Profile Medium Shot', 'da cintura para cima, de perfil'), pair('Off-Center Medium Shot, figure on one third of the frame', 'figura num terço do quadro'),
  pair('Upper Body with Cape Filling the Frame', 'tronco, capa ocupando o quadro'), pair('Full Body, Tight Margins', 'corpo inteiro, quase tocando as bordas'), pair('Diagonal Full Body, figure along the diagonal of the frame', 'corpo inteiro na diagonal'),
  pair('Full Body Silhouette against a bright background', 'silhueta contra o fundo claro'), pair('Long Shot (LS)', 'corpo inteiro com chão e cenário'), pair('Extreme Wide Shot (EWS)', 'figura minúscula, cenário imenso'),
  pair('Foreground Framing, figure seen through columns or debris', 'figura vista entre colunas ou destroços'), pair('Reflection Shot, figure and its reflection in water', 'figura e reflexo na água'), pair('Deep Focus Shot, figure in the middle ground, foreground and background sharp', 'figura no meio, tudo em foco'),
  pair('Vertical Tower Shot, figure small at the base of tall architecture', 'figura pequena sob arquitetura alta'),
  pair('Wide Group Shot', 'grupo inteiro em cena'), pair('Extreme Wide Shot', 'figuras pequenas, escala enorme'), pair('Army Shot', 'tropa inteira em cena'), pair('Massive Army Shot', 'exército até o horizonte'), pair('Massive Crowd Shot', 'multidão'), pair('Aerial Formation Shot', 'formação vista de cima, no ar'), pair('Underwater Formation Shot', 'formação submersa'),
  pair('Battlefield Panorama', 'panorama do campo de batalha'), pair('Establishing Shot', 'apresenta o lugar e o grupo'), pair('Creature Scale Shot', 'mostra o tamanho da criatura'), pair('Silhouette Army Shot', 'exército em silhuetas'), pair('Temple Defense Shot', 'defensores diante do templo'),
  pair('Object Hero Shot', 'objeto inteiro em destaque'), pair('Macro Detail Shot', 'detalhe do objeto'), pair('Architectural Perspective Shot', 'perspectiva da arquitetura'), pair('Energy Impact Shot', 'origem, trajetória e impacto do poder'), pair('Divine Scale Shot', 'mostra a escala do divino'),
];
export const POSES = [
  pair('Standing straight', 'em pé, postura reta'), pair('Casual lean against a wall', 'encostado na parede'), pair('Sitting cross-legged', 'sentado de pernas cruzadas'),
  pair('Looking over the shoulder', 'olhando por cima do ombro'), pair('Hands in pockets', 'mãos nos bolsos'), pair('Crossing arms', 'braços cruzados'),
  pair('Dynamic action pose', 'ação em movimento, corpo inclinado'), pair('Mid-air jump', 'no meio de um salto'), pair('Running sprint', 'correndo em velocidade máxima'),
  pair('Combat stance', 'postura de luta, punhos erguidos'), pair('Crouching low', 'agachado, pronto para saltar'),
  pair('Standing still, arms lowered at the sides, cosmo rising around the body', 'parado, braços baixos, Cosmo subindo'), pair('Kneeling on one knee, head lowered', 'ajoelhado, cabeça baixa'),
  pair('Walking forward unhurried', 'andando devagar para a frente'), pair('Weapon planted on the ground, both hands resting on it', 'arma fincada no chão, mãos sobre ela'),
  pair('Mid-strike seen in profile, side-on to the camera', 'golpe visto de perfil'), pair('Both arms raised overhead, gathering energy', 'braços erguidos, juntando energia'),
  pair('Back to the viewer, head turned in profile', 'de costas, rosto de perfil'), pair('Seen from behind, cape and hair blown sideways', 'de costas, capa e cabelo ao vento'),
  pair('Half-turned in three-quarter view, chin raised', 'meio de lado, queixo erguido'), pair('Leaning forward, one foot on a broken stone', 'inclinado, pé sobre uma pedra'),
  pair('Seated on a throne or fallen column, elbow on the knee', 'sentado em trono ou coluna, cotovelo no joelho'), pair('Kneeling in prayer, hands joined at the chest', 'ajoelhado em prece, mãos no peito'),
  pair('Bowing low in salute, one fist over the heart', 'curvado em saudação, punho no coração'), pair('Head thrown back, shouting at the sky, arms out to the sides', 'cabeça para trás, gritando para o céu'),
  pair('One arm raised straight up, palm to the sky', 'um braço erguido, palma para o céu'), pair('Leaping sideways across the frame, body stretched', 'saltando de lado, corpo esticado'),
  pair('Falling backward through the air, limbs loose', 'caindo de costas no ar'), pair('Hovering above the ground, feet together, arms relaxed', 'flutuando, pés juntos, braços soltos'),
  pair('Sliding to a stop, one knee and one hand on the ground', 'freando no chão, joelho e mão apoiados'), pair('Low wide stance, weight on the back leg, arms drawn back', 'base baixa, peso atrás, braços recuados'),
  pair('Spinning mid-attack, hair and cape following the turn', 'girando no ataque, cabelo e capa seguindo'), pair('High kick seen from the side', 'chute alto visto de lado'),
  pair('Sidestepping an attack, torso twisted away', 'esquivando, tronco torcido'), pair('Blocking with both forearms crossed in front of the chest', 'defesa, antebraços cruzados no peito'),
  pair('Bracing against a great force, leaning into it, feet dug in', 'resistindo a uma força, pés fincados'), pair('Holding a weapon overhead with both hands, ready to bring it down', 'arma erguida com as duas mãos'),
  pair('Wielding a weapon low and behind the body, ready to swing', 'arma baixa atrás do corpo'), pair('Wounded, on one knee, one hand on the ribs, still looking up', 'ferido, um joelho no chão, mão nas costelas'),
  pair('Pulling themselves up, hand gripping a broken column', 'se erguendo, mão numa coluna quebrada'), pair('Meditating cross-legged in the air, eyes closed, cosmo swirling', 'meditando no ar, Cosmo girando'), pair('One hand reaching toward the camera', 'mão vindo para a câmera'),
];
// A pose inicial varia por carta (autor, 02/11/2026): com uma só, todas as artes saíam iguais. A mão para a câmera existe, mas não é pose inicial: o gerador já cai nela sozinho.
const START_POSES = ['Standing straight', 'Looking over the shoulder', 'Crossing arms', 'Dynamic action pose', 'Combat stance', 'Crouching low', 'Standing still, arms lowered at the sides, cosmo rising around the body', 'Kneeling on one knee, head lowered', 'Walking forward unhurried', 'Mid-strike seen in profile, side-on to the camera', 'Both arms raised overhead, gathering energy', 'Back to the viewer, head turned in profile', 'Seen from behind, cape and hair blown sideways', 'Half-turned in three-quarter view, chin raised', 'Leaning forward, one foot on a broken stone', 'Seated on a throne or fallen column, elbow on the knee', 'Kneeling in prayer, hands joined at the chest', 'Bowing low in salute, one fist over the heart', 'Head thrown back, shouting at the sky, arms out to the sides', 'One arm raised straight up, palm to the sky', 'Leaping sideways across the frame, body stretched', 'Falling backward through the air, limbs loose', 'Hovering above the ground, feet together, arms relaxed', 'Sliding to a stop, one knee and one hand on the ground', 'Low wide stance, weight on the back leg, arms drawn back', 'Spinning mid-attack, hair and cape following the turn', 'High kick seen from the side', 'Sidestepping an attack, torso twisted away', 'Blocking with both forearms crossed in front of the chest', 'Bracing against a great force, leaning into it, feet dug in', 'Holding a weapon overhead with both hands, ready to bring it down', 'Wielding a weapon low and behind the body, ready to swing', 'Wounded, on one knee, one hand on the ribs, still looking up', 'Pulling themselves up, hand gripping a broken column', 'Meditating cross-legged in the air, eyes closed, cosmo swirling'];
export const ANGLES = [
  pair('Eye-level shot', 'nível dos olhos, confronto direto'), pair('Low-angle shot', 'de baixo para cima, dominante'), pair('Extreme low-angle shot', 'figura colossal ou aterrorizante'),
  pair('High-angle shot', 'de cima para baixo, vulnerável'), pair("Bird's-eye view", 'visão aérea total'), pair('Dutch angle', 'inclinada, instabilidade e violência'), pair('Over-the-shoulder shot', 'confronto narrativo'),
  pair('Three-quarter front view', 'três quartos de frente'), pair('Profile view', 'de perfil'), pair('Rear three-quarter view', 'três quartos de costas'),
  pair('Slight low angle', 'levemente de baixo'), pair('Slight high angle', 'levemente de cima'), pair("Worm's-eye view from ground level", 'do chão, olhando para cima'),
  pair('Telephoto side view, flat perspective', 'lateral com teleobjetiva, perspectiva plana'), pair('Tilted high angle', 'de cima e inclinada'),
];
export const MOTIONS = [
  ['', 'Nenhum'], ['Motion frozen at the decisive instant', 'Congelado no instante decisivo'], ['Hair and cloth reacting to the energy', 'Cabelos e tecidos reagindo à energia'], ['Debris thrown outward by the force', 'Detritos projetados pela força'],
  ['Dynamic perspective', 'Perspectiva dinâmica'], ['Strong action lines through the whole figure', 'Linhas de ação'], ['Motionless figure against a moving environment', 'Figura imóvel, ambiente em movimento'],
];
// Tudo aqui é escolha em lista (autor, 02/11/2026): só Observações é texto livre. Vazio deixa a cena para o diretor de arte propor.
export const THEMES = [
  ['', 'Cenário da facção'], ['ruined battlefield after a clash of cosmos', 'Campo de batalha em ruínas'], ['the stairway and temples of the Twelve Houses', 'Doze Casas'], ['the Sanctuary at dawn', 'Santuário ao amanhecer'],
  ['a colosseum arena', 'Coliseu'], ['open starry cosmos with constellations', 'Cosmo estrelado'], ['the undersea temple and the pillars of Poseidon', 'Templo submarino'], ['the Underworld and its prisons', 'Mundo dos Mortos'],
  ['the fields of Elysion', 'Elísios'], ['a sacred moonlit forest', 'Floresta sagrada ao luar'], ['a bare mountain training ground', 'Montanha de treinamento'], ['a neutral void of pure energy', 'Vazio de energia pura'],
  ["the Grand Pope's Chamber at the top of the Twelve Houses", 'Santuário: Câmara do Mestre'], ['Star Hill, a cathedral on an isolated steep peak of the Sanctuary', 'Santuário: Star Hill'],
  ['Rodorio, the village at the foot of the Sanctuary', 'Santuário: Vila de Rodorio'], ['the colossal statue of Athena above the Sanctuary', 'Santuário: Estátua de Atena'],
  ['the Fire Clock of the Twelve Houses, zodiac flames burning at night', 'Santuário: Relógio de Fogo'], ['the garden of the twin sala trees in the House of Virgo', 'Santuário: Jardim das Salas Gêmeas'],
  ['the tower of Jamir among the Himalayan peaks', 'Jamir: Torre'], ['the Cloth Graveyard on the way to Jamir, ruined armors among the rocks', 'Jamir: Cemitério de Armaduras'],
  ['the great waterfall of Rozan at the Five Old Peaks', 'China: Cachoeira de Rozan'], ['Death Queen Island, black volcanic rock and burning sky', 'Ilha da Rainha da Morte'],
  ['the frozen sea of Eastern Siberia, a sunken ship under the ice', 'Sibéria: Mar congelado'], ['Andromeda Island, barren rocks and chained cliffs', 'Ilha de Andrômeda'],
  ['the Galaxian Wars colosseum of the Graad Foundation in Tokyo', 'Tóquio: Coliseu da Graad'], ['the Kido mansion and its gardens', 'Tóquio: Mansão Kido'],
  ['the Valhalla Palace in snow-covered Asgard', 'Asgard: Palácio de Valhalla'], ['the giant statue of Odin in the snows of Asgard', 'Asgard: Estátua de Odin'],
  ['the Main Temple of Poseidon under the sea, a sky of water above it', 'Atlântida: Templo Principal'], ['the Central Pillar that holds up the ocean, the Mammoth Pillar', 'Atlântida: Pilar Central'],
  ['the North Atlantic Pillar of the undersea kingdom', 'Atlântida: Pilar do Atlântico Norte'], ['the South Atlantic Pillar of the undersea kingdom', 'Atlântida: Pilar do Atlântico Sul'],
  ['the North Pacific Pillar of the undersea kingdom', 'Atlântida: Pilar do Pacífico Norte'], ['the South Pacific Pillar of the undersea kingdom', 'Atlântida: Pilar do Pacífico Sul'],
  ['the Indian Ocean Pillar of the undersea kingdom', 'Atlântida: Pilar do Índico'], ['the Arctic Ocean Pillar of the undersea kingdom, ice in the walls', 'Atlântida: Pilar do Ártico'],
  ['the Antarctic Ocean Pillar of the undersea kingdom, ice in the walls', 'Atlântida: Pilar da Antártida'], ['the great stairway of the Undersea Sanctuary', 'Atlântida: Escadaria do Santuário'],
  ['the throne room of Poseidon in the Main Temple', 'Atlântida: Sala do Trono'], ['the inside of the Central Pillar, water pouring down its walls', 'Atlântida: Dentro do Pilar Central'],
  ['ruined colonnades of the Undersea Sanctuary under a sky of ocean', 'Atlântida: Colunatas sob o céu de água'], ['the shrine of the amphora that seals the soul of Poseidon', 'Atlântida: Santuário da Ânfora'],
  ['the Solo family mansion overlooking the Mediterranean', 'Grécia: Mansão Solo'], ['the temple of Poseidon on the cliff of Cape Sounion at dusk', 'Grécia: Templo de Cabo Sounion'],
  ["a coastal city flooded by Poseidon's endless rain", 'Dilúvio: Cidade inundada'],
  ['the Coral Labyrinth, walls of living coral and blue shadow', 'Poseidon: Labirinto de Coral'], ['a sunken temple half buried in sand, shafts of light through the water', 'Poseidon: Templo Afundado'],
  ['the Abyssal Trench, black depths lit by pale glowing creatures', 'Poseidon: Fossa Abissal'], ['the Tidal Archive, stone tablets among drifting currents', 'Poseidon: Arquivo das Marés'],
  ['a pearl sanctuary inside a giant open shell', 'Poseidon: Santuário da Pérola'], ['a drowned city of marble towers overgrown with kelp', 'Poseidon: Cidade Afogada'],
  ['a cathedral built from the bones of a colossal whale', 'Poseidon: Catedral de Ossos'],
  ['one of the seven Mammoth Pillars rising through the undersea kingdom', 'Atlântida: Pilares dos Mares'], ['the watery prison in the cliff of Cape Sounion, the tide rising', 'Grécia: Prisão de Cabo Sounion'],
  ['Hades Castle at Heinstein, dark gothic towers', 'Hades: Castelo de Heinstein'], ['Yomotsu Hirasaka, the hill of the dead and its endless line of souls', 'Hades: Yomotsu Hirasaka'],
  ["the River Acheron, a black river with the ferryman's boat", 'Hades: Rio Aqueronte'], ['the Hall of Judgment of the First Prison', 'Hades: Tribunal'],
  ['the Blood Pond of the Underworld prisons', 'Hades: Lago de Sangue'], ['the burning coffins of the Underworld prisons', 'Hades: Túmulos em chamas'],
  ['Cocytus, the frozen Eighth Prison, bodies trapped in the ice', 'Hades: Cócito'], ["Giudecca, Pandora's cold palace in the Underworld", 'Hades: Giudecca'],
  ['the Wailing Wall at the end of the Underworld', 'Hades: Muro das Lamentações'], ['the Hyperdimension between the Underworld and Elysion', 'Hades: Hiperdimensão'],
  ['the temples of Hypnos and Thanatos in the fields of Elysion', 'Elísios: Templos dos Gêmeos'], ['the peak of Mount Olympus above the clouds', 'Monte Olimpo'],
  ['the Lost Canvas, an immense painting floating in the sky', 'Lost Canvas: Tela no céu'], ['Bluegrad, a frozen citadel in the far north', 'Lost Canvas: Bluegrad'],
];
// Só estes não são lugares do cânone: o Randomizar de carta genérica não sorteia os outros, que puxam personagens de Saint Seiya.
const OCEAN_THEMES = THEMES.filter(([, label]) => label.startsWith('Poseidon: ')); // criados para o jogo: Randomizar de genérica só em carta de Poseidon
const GENERIC_THEMES = THEMES.filter(([, label]) => ['Cenário da facção', 'Campo de batalha em ruínas', 'Coliseu', 'Cosmo estrelado', 'Floresta sagrada ao luar', 'Montanha de treinamento', 'Vazio de energia pura'].includes(label));
export const ARCS = [
  ['', 'Sem arco específico'], ['Galaxian Wars', 'Guerra Galáctica'], ['Silver Saints', 'Cavaleiros de Prata'], ['Battle of the Twelve Houses', 'Doze Casas'], ['Poseidon chapter', 'Saga de Poseidon'],
  ['Hades Sanctuary chapter', 'Hades: Santuário'], ['Hades Inferno chapter', 'Hades: Inferno'], ['Hades Elysion chapter', 'Hades: Elísios'], ['original scene created for this card, not canon', 'Cena original da carta'],
];
export const BEFORE = [
  ['', 'Deixar para o diretor'], ['a blow has just been exchanged', 'Golpe trocado'], ['survived a fatal attack', 'Sobreviveu a um golpe fatal'], ['arrived on the battlefield', 'Chegou à batalha'],
  ['an ally has just fallen', 'Um aliado caiu'], ['cosmo has just awakened', 'O Cosmo despertou'], ['the armor has just been shattered', 'A armadura se partiu'], ['the enemy has just revealed their full power', 'O inimigo revelou o poder'],
  ['a wave of cosmo has just flung them against the rocks', 'Arremessado pela onda de Cosmo'], ['a technique has just been deflected', 'Desviou uma técnica'],
  ['one of their senses has just been lost', 'Perdeu um dos sentidos'], ['their cosmo has just reached its limit', 'Cosmo no limite'],
  ['a sacred threshold has just been crossed', 'Cruzou um limiar sagrado'], ['an oath has just been sworn', 'Fez um juramento'],
  ['a comrade has just sacrificed themselves', 'Um aliado se sacrificou'], ['they have just been betrayed', 'Foi traído'],
  ['they have just returned from death', 'Voltou da morte'], ['a powerful enemy has just been defeated', 'Venceu um inimigo poderoso'],
  ['a sacred seal has just been broken', 'Um selo sagrado se rompeu'], ['a temple has just collapsed', 'O templo desabou'],
  ['they have just woken from a long sleep', 'Despertou de um longo sono'], ['a divine voice has just spoken', 'Uma voz divina falou'],
  ['the armor has just answered their call', 'A armadura atendeu ao chamado'], ['an illusion has just been shattered', 'Quebrou uma ilusão'],
];
export const NOW = [
  ['', 'Deixar para o diretor'], ['unleashing the finishing technique', 'Solta o golpe final'], ['charging cosmo before the attack', 'Concentra o Cosmo'], ['locked in direct combat', 'Combate direto'],
  ['standing over a defeated enemy', 'De pé sobre o inimigo'], ['protecting someone behind them', 'Protege alguém'], ['rising back to their feet', 'Levanta de novo'], ['receiving a divine order', 'Recebe uma ordem divina'],
  ['dodging at the speed of light', 'Desvia na velocidade da luz'], ['breaking through a defense', 'Rompe uma defesa'],
  ['crossing weapons with an unseen enemy', 'Cruza armas'], ['holding back a massive force', 'Segura uma força imensa'],
  ['resisting an illusion', 'Resiste a uma ilusão'], ['praying for a lost comrade', 'Reza por um aliado'],
  ['kneeling before their god', 'Ajoelha diante do deus'], ['swearing an oath', 'Faz um juramento'],
  ['receiving the armor as it assembles around the body', 'A armadura se monta no corpo'], ['walking alone through ruins', 'Anda sozinho nas ruínas'],
  ['climbing toward the next temple', 'Sobe para o próximo templo'], ['watching the enemy from the shadows', 'Observa das sombras'],
  ['burning cosmo to its limit', 'Queima o Cosmo ao limite'], ['guarding a sacred gate', 'Guarda um portão sagrado'],
  ['training alone', 'Treina sozinho'], ['absorbing an enemy technique', 'Absorve uma técnica inimiga'],
  ['calling on their guardian constellation', 'Invoca a constelação'], ['challenging a far stronger enemy', 'Desafia alguém mais forte'],
  ['meditating before the battle', 'Medita antes da batalha'], ['shattering the ground with a single blow', 'Parte o chão com um golpe'],
];
export const NEXT = [
  ['', 'Deixar para o diretor'], ['the decisive blow will land', 'O golpe decisivo acerta'], ['the enemy will be destroyed', 'O inimigo cai'], ['they will collapse, spent', 'Desaba sem forças'],
  ['they will rise stronger', 'Volta mais forte'], ['they will sacrifice themselves', 'Vai se sacrificar'], ['the battle will turn', 'A batalha vira'],
  ['the ground itself will give way', 'O chão vai ceder'], ['a new cosmo will awaken', 'Um novo Cosmo desperta'],
  ['the armor will shatter', 'A armadura vai se partir'], ['a god will intervene', 'Um deus vai intervir'],
  ['the sky will tear open', 'O céu vai se abrir'], ['they will fall in silence', 'Cai em silêncio'],
  ['help will arrive too late', 'A ajuda chega tarde'], ['the enemy will strike back', 'O inimigo contra-ataca'],
  ['the seal will break', 'O selo se rompe'], ['they will pass on their will', 'Passa o legado adiante'],
  ['they will be dragged into the dark', 'Arrastado para as trevas'], ['the temple will collapse', 'O templo desaba'],
  ['a betrayal will be revealed', 'Uma traição é revelada'], ['they will reach the seventh sense', 'Chega ao Sétimo Sentido'],
  ['they will leave without looking back', 'Vai embora sem olhar para trás'], ['everything will be swallowed', 'Tudo será engolido'],
];
export const VIEWER = [
  ['', 'Deixar para o diretor'], ['awe', 'Assombro'], ['terror', 'Terror'], ['hope', 'Esperança'], ['sorrow', 'Tristeza'], ['menace', 'Ameaça'], ['reverence', 'Reverência'], ['tension', 'Tensão'],
  ['despair', 'Desespero'], ['wonder', 'Encanto'], ['rage', 'Fúria'], ['courage', 'Coragem'],
  ['loneliness', 'Solidão'], ['mercy', 'Compaixão'], ['dread', 'Pavor'], ['triumph', 'Triunfo'],
  ['nostalgia', 'Nostalgia'], ['pride', 'Orgulho'], ['melancholy', 'Melancolia'], ['mystery', 'Mistério'],
  ['serenity', 'Serenidade'], ['loss', 'Perda'], ['inevitability', 'Inevitabilidade'], ['devotion', 'Devoção'],
];
export const EXPRESSIONS = [
  ['Fierce, unbreakable determination', 'Determinação feroz'], ['Cold, contemptuous stare', 'Frieza e desprezo'], ['Serene and compassionate', 'Serenidade compassiva'],
  ['Battle fury, teeth clenched, shouting', 'Fúria de batalha, gritando'], ['Wounded but refusing to fall', 'Ferido, sem cair'], ['Grief and tears held back', 'Dor e lágrimas contidas'],
  ['Confident, faint smile', 'Sorriso confiante'], ['Cruel, sadistic grin', 'Sorriso cruel'], ['Eyes closed in concentration', 'Olhos fechados, concentração'], ['Divine, unreadable calm', 'Calma divina'],
];
// Personagem original de carta genérica (autor, 02/11/2026: saía sempre branco e de cabelo loiro). Personagem do cânone mantém o design dele.
export const ETHNICITIES = [
  ['West African heritage, deep dark brown skin', 'África Ocidental'], ['East African heritage, Ethiopian or Somali, dark brown skin', 'África Oriental'],
  ['Southern African heritage, Zulu or Xhosa, dark brown skin', 'África Austral'], ['North African heritage, Amazigh or Egyptian, warm olive-brown skin', 'Norte da África'],
  ['Afro-Caribbean heritage, rich brown skin', 'Afro-caribenha'], ['Afro-Brazilian heritage, brown skin', 'Afro-brasileira'],
  ['Arab heritage, warm olive skin', 'Árabe'], ['Persian heritage, light olive skin', 'Persa'],
  ['Turkish heritage, light olive skin', 'Turca'], ['South Indian heritage, deep brown skin', 'Sul da Índia'],
  ['North Indian heritage, medium brown skin', 'Norte da Índia'], ['Southeast Asian heritage, Thai or Filipino, golden-brown skin', 'Sudeste Asiático'],
  ['Japanese heritage, light skin', 'Japonesa'], ['Korean heritage, light skin', 'Coreana'],
  ['Chinese heritage, light skin', 'Chinesa'], ['Central Asian heritage, Mongolian or Kazakh, tan skin', 'Ásia Central'],
  ['Andean Indigenous heritage, Quechua, copper-brown skin', 'Indígena andina'], ['Amazonian Indigenous heritage, reddish-brown skin', 'Indígena amazônica'],
  ['Native North American heritage, copper-brown skin', 'Indígena norte-americana'], ['Mestizo Latin American heritage, tan skin', 'Latino-americana mestiça'],
  ['Polynesian heritage, Samoan or Maori, warm brown skin', 'Polinésia'], ['Aboriginal Australian heritage, deep brown skin', 'Aborígine australiana'],
  ['Mediterranean Greek heritage, olive skin', 'Mediterrânea grega'], ['Northern European heritage, fair skin', 'Norte da Europa'],
  ['Eastern European Slavic heritage, fair skin', 'Leste Europeu'],
];
export const HAIRSTYLES = [
  ['short coily black afro', 'Afro curto preto'], ['big rounded black afro', 'Afro volumoso preto'],
  ['tight black cornrows', 'Tranças nagô pretas'], ['long black box braids', 'Box braids longas pretas'],
  ['shoulder-length black locs', 'Dreads pretos médios'], ['long auburn locs tied back', 'Dreads ruivo-escuros presos'],
  ['bantu knots', 'Bantu knots'], ['shaved head', 'Cabeça raspada'],
  ['buzz cut, dark brown', 'Raspado rente castanho'], ['clean bald head with a faded line pattern', 'Careca com desenho'],
  ['high-top fade, black', 'High-top fade preto'], ['short curly dark brown hair', 'Curto cacheado castanho'],
  ['medium curly copper-red hair', 'Médio cacheado ruivo'], ['long loose curly black hair', 'Longo cacheado preto'],
  ['short wavy chestnut hair', 'Curto ondulado castanho-claro'], ['shoulder-length wavy black hair', 'Médio ondulado preto'],
  ['long wavy silver-grey hair', 'Longo ondulado grisalho'], ['straight black bowl cut', 'Tigela preta lisa'],
  ['straight jet-black hair, chin length', 'Liso preto até o queixo'], ['long straight black hair, center part', 'Longo liso preto'],
  ['long straight dark brown hair in a low ponytail', 'Rabo baixo castanho'], ['high black ponytail', 'Rabo alto preto'],
  ['topknot, black', 'Coque no topo preto'], ['samurai-style half-up knot, dark brown', 'Meio coque castanho'],
  ['low bun, dark brown', 'Coque baixo castanho'], ['double buns, black', 'Dois coques pretos'],
  ['a single thick black braid', 'Trança única grossa preta'], ['twin dark brown braids', 'Duas tranças castanhas'],
  ['a warrior braid crown, auburn', 'Coroa de tranças ruiva'], ['side-shaved black undercut', 'Undercut preto'],
  ['mohawk, dark red', 'Moicano vermelho-escuro'], ['slicked-back black hair', 'Penteado para trás preto'],
  ['short spiky dark brown hair', 'Curto espetado castanho'], ['messy shaggy brown hair', 'Bagunçado castanho'],
  ['pixie cut, black', 'Pixie preto'], ['blunt bob, dark brown', 'Chanel castanho'],
  ['short white-grey hair', 'Curto grisalho'], ['long snow-white hair', 'Longo branco'],
  ['deep blue-black hair, wavy', 'Preto-azulado ondulado'], ['sea-green dyed locs', 'Dreads verde-mar'],
  ['long platinum blond hair', 'Longo loiro platinado'], ['short golden blond hair', 'Curto loiro dourado'],
];
export const VERSIONS = [
  ['', 'Livre, só pelas referências'], ['classic 1980s anime', 'Anime clássico'], ['original manga', 'Mangá original'], ['Hades chapter OVAs', 'OVAs de Hades'],
  ['The Lost Canvas', 'Lost Canvas'], ['Episode.G', 'Episode.G'], ['Next Dimension', 'Next Dimension'], ['Soul of Gold', 'Soul of Gold'], ['Saint Seiya Omega', 'Omega'], ['Legend of Sanctuary CGI film', 'Legend of Sanctuary'],
];
export const EPIC_LEVELS = [
  ['1', '1 Contido', 'clean, small scale, simple lighting'], ['2', '2 Heroico', 'striking pose, recognizable setting, moderate effects'], ['3', '3 Épico', 'dramatic composition, elaborate energy and lighting'],
  ['4', '4 Lendário', 'monumental scale, intense atmosphere, extraordinary composition'], ['5', '5 Divino', 'exceptional impact, supernatural scale, sense of absolute power'],
];
// Agrupados no popup (autor, 02/11/2026): anime, mangá e HQ, para as artes não saírem todas iguais.
export const STYLE_GROUPS = {
  'Anime': [
    ['elegant anatomy, dramatic flowing hair, expressive faces, ornate armor, classic heroism, 1980s anime cel shadows', 'Anime clássico (Shingo Araki, Michi Himeno)'],
    ['organic anatomy, expressive faces, traditional hand-drawn composition', 'Anime tradicional (Yoshikazu Yasuhiko)'],
    ['cinematic digital compositing, glowing energy effects, dynamic camera, volumetric light', 'Animação atual (Ufotable)'],
    ['aggressive action, expressive motion, dramatic hard shadows', 'Ação agressiva (MAPPA)'],
    ['visual exaggeration, radical perspective, explosive motion, bold shapes', 'Exagero explosivo (Studio Trigger, Hiroyuki Imaishi)'],
    ['theatrical sculptural poses, bold unexpected color, graphic contour', 'Poses teatrais (Hirohiko Araki)'],
    ['atmospheric light, vibrant luminous skies and environments', 'Luz atmosférica (Makoto Shinkai)'],
    ['thin hand-painted 1990s cels, saturated flat colors, bold ink outlines, film grain', 'Shonen anos 90 (Noriyuki Abe, Studio Pierrot)'],
    ['long limbs, sharp jawlines, moody low-key shadows, noir atmosphere, lush 1990s theatrical animation', 'Anime noir (Yoshiaki Kawajiri, Madhouse)'],
    ['hard-edged armor panels, technical plating, weathered metal, cockpit-grade mechanical logic', 'Metal de mecha (Kunio Okawara, Sunrise)'],
    ['restrained realistic proportions, understated detail, precise grounded animation drawing, cool natural color', 'Realismo contido (Hiroyuki Okiura, Production I.G)'],
    ['soft refined shading, delicate eyes, gentle luminous color, polished modern finish', 'Anime refinado (Naoko Yamada, Kyoto Animation)'],
    ['painted watercolor environments, warm natural light, gentle rounded character drawing', 'Aquarela de cenário (Kazuo Oga, Studio Ghibli)'],
    ['neon rim light, glossy airbrushed highlights, 1980s video-tape colors, cyberpunk night', 'OVA cyberpunk (Kenichi Sonoda, Artmic)'],
    ['toon-rendered 3D look, crisp hard shadows, stylized action frames, flat color with sharp specular', 'Cel-shading de luta (Arc System Works)'],
    ['romantic 1970s shoujo, large sparkling eyes, flowing ribbons of hair, rose and lace ornament', 'Shoujo clássico (Riyoko Ikeda)'],
  ],
  'Mangá': [
    ['vigorous ink line, intense movement, dramatic energy bursts, original 1980s shonen manga language', 'Mangá original (Masami Kurumada)'],
    ['striking silhouettes, clean economical drawing, highly readable movement', 'Silhueta limpa (Akira Toriyama)'],
    ['complex armor, dense crosshatching, heavy blacks, dark fantasy, monumental scale', 'Fantasia sombria (Kentaro Miura)'],
    ['powerful muscular anatomy, intimidating expressions, stark contrast and drama', 'Anatomia poderosa (Tetsuo Hara)'],
    ['realistic anatomy, expressive brushwork, sumi ink washes, emotional realism', 'Pincel realista (Takehiko Inoue)'],
    ['monumental architecture, oppressive atmosphere, dark science-fiction scale', 'Arquitetura opressiva (Tsutomu Nihei)'],
    ['organic textures, gestural ink, visceral movement', 'Tinta gestual (Hiroaki Samura)'],
    ['extreme anatomical detail, intense metallic reflections, dynamic action', 'Detalhe e reflexo (Boichi)'],
    ['extreme perspective, action anatomy, spectacular destruction', 'Ação extrema (Yusuke Murata)'],
    ['elongated silhouettes, ornamental composition, elegant fantasy', 'Fantasia ornamental (CLAMP)'],
    ['realism and highly detailed environments, precise mechanical drawing', 'Realismo de cenário (Katsuhiro Otomo)'],
    ['elegance, stark black and white contrasts, clean striking silhouettes', 'Contraste elegante (Tite Kubo)'],
    ['experimental painted textures, melancholic atmosphere', 'Pintura melancólica (Sui Ishida)'],
    ['horror, creeping tension, fine unsettling line detail', 'Horror (Junji Ito)'],
    ['cinematic realism, heavy brush inking, adult weathered faces, stark dramatic gekiga shadows', 'Gekiga (Ryoichi Ikegami, Goseki Kojima)'],
    ['demonic bold contours, screaming energy, raw 1970s screen tone, aggressive graphic power', 'Demônios setentistas (Go Nagai)'],
    ['hyper-detailed armor engraving, burning energy, muscular crosshatching, flames filling the page', 'Armadura flamejante (Megumu Okada)'],
    ['slender graceful figures, thin precise line, soft gray tones, melancholic tragic beauty', 'Traço delicado (Shiori Teshirogi)'],
    ['sparkling magical motifs, slender elegant poses, flowing lines, ornamental shoujo heroism', 'Heroína ornamental (Naoko Takeuchi)'],
    ['angular dynamic poses, bold clean ink, speed lines, sharp shonen energy', 'Shonen angular (Masashi Kishimoto)'],
    ['rubber cartoon exaggeration, huge expressive faces, bursting adventure, thick playful contour', 'Cartum épico (Eiichiro Oda)'],
    ['loose raw ink, scratchy unfinished energy, off-kilter cinematic framing', 'Tinta crua (Tatsuki Fujimoto, Yoshihiro Togashi)'],
  ],
  'HQ ocidental': [
    ['cosmic crackling dots of energy, blocky powerful figures, colossal alien machinery, primary colors', 'Cósmico dos anos 60 (Jack Kirby)'],
    ['1990s superhero rendering, dense crosshatching, heroic musculature, splash-page dynamism', 'Super-herói anos 90 (Jim Lee)'],
    ['solid pure black and white, one violent spot color, brutal noir silhouettes', 'Noir preto e branco (Frank Miller)'],
    ['massive angular blocks of shadow, minimal detail, gothic folklore, limited palette', 'Sombra gótica (Mike Mignola)'],
    ['photorealistic gouache, reverent monumental heroes, painted cover lighting', 'Realismo em guache (Alex Ross)'],
    ['clear even line, flat pastel color, vast surreal landscapes, serene alien calm', 'Linha clara (Moebius)'],
    ['obsessive pen feathering, decaying textures, classic horror comics inking', 'Horror a bico de pena (Bernie Wrightson)'],
    ['savage painted heavy metal, brutal flesh and steel, smeared grimy color', 'Heavy metal pintado (Simon Bisley)'],
    ['simple geometric shapes, art deco elegance, minimal line, dark flat backgrounds', 'Deco animado (Bruce Timm)'],
    ['gritty kinetic ink, scratchy mechanical detail, wet nocturnal city grime', 'Tinta suja (Sean Gordon Murphy)'],
    ['ultra-fine meticulous line, baroque costume detail, clean modern coloring', 'Linha milimétrica (Travis Charest)'],
    ['spectral thin figures emerging from black, sparse elegant ink, haunting negative space', 'Espectral (Jae Lee)'],
  ],
  'Pintura e fantasia': [
    ['ethereal elegance, delicate painting, divine figures, sophisticated ornament', 'Pintura etérea (Yoshitaka Amano)'],
    ['gothic fantasy, aristocratic costume, dark romantic atmosphere, fine painted rendering', 'Gótico romântico (Ayami Kojima)'],
    ['rich traditional oil look, painterly chiaroscuro, grand heroic realism for an epic fantasy card', 'Pintura épica de Magic (Greg Staples, Chris Rahn)'],
    ['flowing organic linework, jewel-like glazes, decorative halos and patterned robes', 'Art nouveau de Magic (Terese Nielsen, Rebecca Guay)'],
    ['haunting symbolic imagery, muted palette, surreal dreamlike painting', 'Surreal de Magic (Seb McKinnon)'],
    ['oil-painted barbarian fantasy, muscular motion, dark earthy tones, raw primal drama', 'Óleo bárbaro (Frank Frazetta)'],
  ],
};
export const STYLES = Object.values(STYLE_GROUPS).flat();
const styleWith = (name) => STYLES.find(([, label]) => label.includes(name))[0];
export const LIGHTS = [
  ['Cosmo aura erupting behind the figure as key light, warm rim on hair and armor edges, soft reflected fill keeping the face readable', 'Aura de Cosmo atrás'],
  ['Single volumetric shaft of white divine light from directly above, hot highlights on shoulders and head, soft bounce on the face', 'Feixe divino de cima'],
  ['Teal underwater caustics falling from above and rippling over the armor, cool blue ambient, gold speculars', 'Luz subaquática'],
  ['Dim spectral violet glow from below and behind, cold grey fill, thin cold rim separating the silhouette from the fog', 'Brilho espectral'],
  ['Orange firelight and embers from below right, warm uplight on jaw and breastplate, black smoke behind', 'Fogo de baixo'],
  ['Cold moonlight from upper left, silver speculars on armor ridges, long soft shadows, low contrast', 'Luar frio'],
  ['Golden sunset from the right, warm raking side light, long shadows', 'Pôr do sol'],
];
// Identidade das facções (seção 5). Paleta é identidade, não obrigação de carta monocromática.
const GODS = {
  Athena: {title: 'celestial heroism', setting: 'marble temples of the Sanctuary under celestial light', palette: 'white, gold, blue and silver', mood: 'honor, sacrifice, courage, hope', style: 'Araki', light: 0},
  Poseidon: {title: 'oceanic majesty', setting: 'monumental oceans, water currents, submerged temples, pressure and depth', palette: 'deep blue, turquoise, gold and sea green', mood: 'majesty, ancestral power, superiority, inevitable force', style: 'Amano', light: 2},
  Hades: {title: 'dark fantasy', setting: 'the World of the Dead, ruins, mist, spectral flames, funerary architecture', palette: 'black, deep purple, wine and metallic grey', mood: 'terror, death, despair, supernatural authority', style: 'Miura', light: 3},
  Ares: {title: 'war and brutality', setting: 'battlefields, fire, stylized blood, metal, destruction', palette: 'red, black, bronze and incandescent orange', mood: 'fury, violence, impulse, chaos', style: 'Hara', light: 4},
  // Artemis V2.0 (autor, 06/11/2026): Lua, caça e autoridade divina, não só floresta. Verde é acento de identidade (art-direction/artemis-v2.js).
  Artemis: {title: 'lunar authority and the divine hunt', setting: 'moonlit Greek temples, monumental lunar architecture, night skies, sacred hunting grounds', palette: 'silver, lunar white and celestial gold, with green as a faction accent', mood: 'precision, serenity, divine superiority, dangerous harmony', style: 'CLAMP', light: 5},
};
const TYPE_RULES = {
  Devotee: 'The character is the main focal point, with a recognizable face, faithful armor, and a pose coherent with personality and ability. Show action or dramatic presence.',
  Equipment: 'The equipment is the protagonist. Show structure and materials clearly and preserve symbols, colors and geometry, in a collectible art composition.',
  Technique: 'Show the execution or impact of the technique, with the origin, trajectory and consequence of the power, preserving the identity of who performs it.',
  Moment: 'Show one specific narrative instant, prioritizing emotion and action with cinematic framing. Avoid a generic poster composition.',
  Domain: 'The environment is the protagonist: architecture, atmosphere, scale and faction identity.',
  God: 'Recognizable divine presence, carefully handled scale, imposing composition, perceptible supernatural power. Never hide the face with effects.',
};
const GENERIC_RULES = {
  Devotee: 'The character is the main focal point, with a clear readable face and a pose coherent with the card name. Show action or dramatic presence.',
  Equipment: 'The equipment is the protagonist. Show structure and materials clearly, in a collectible art composition.',
  Technique: 'Show the execution or impact of the power, with its origin, trajectory and consequence.',
};
const NEGATIVE_FIGURE = 'extra fingers, missing fingers, fused fingers, extra limbs, duplicate arms, malformed hands, broken anatomy, distorted face, incorrect character design, cropped face';
const NEGATIVE_ALWAYS = 'inaccurate armor, inconsistent lighting, unreadable silhouette, excessive visual clutter, text, typography, card borders, watermarks, logos, UI elements, low resolution';
const EPIC_BY_RARITY = {Common: '2', Uncommon: '3', Legendary: '4', Divine: '5'};
// O gerador de imagem tende ao herói visto de baixo (autor, 02/11/2026: pode sair, só não sempre): o ponto de vista escolhido vem descrito em termos físicos, sem proibir nenhum.
const START_ANGLES = ['Eye-level shot', 'Low-angle shot', 'High-angle shot', 'Dutch angle', 'Over-the-shoulder shot', 'Three-quarter front view', 'Profile view', 'Rear three-quarter view', 'Slight low angle', 'Slight high angle', 'Telephoto side view, flat perspective'];
const ANGLE_VIEW = {
  'Eye-level shot': 'camera at the height of the eyes, level horizon behind the head, head and feet in natural proportion, the underside of the chin not visible',
  'Low-angle shot': 'camera below the waist looking up',
  'Extreme low-angle shot': 'camera on the ground looking steeply up, colossal figure',
  'High-angle shot': 'camera well above the head looking down, top of the head and shoulders visible, the ground fills the background, no sky',
  "Bird's-eye view": 'camera directly overhead looking straight down, the figure seen from the top against the ground',
  'Dutch angle': 'camera at chest height with the horizon tilted about 20 degrees, not looking up',
  'Over-the-shoulder shot': 'camera at head height behind one shoulder of an out-of-focus foreground shape, looking level at the subject',
  'Three-quarter front view': 'camera at chest height, level, the body turned about 45 degrees from the camera',
  'Profile view': 'camera at chest height, level, the body seen exactly from the side',
  'Rear three-quarter view': 'camera at chest height, level, behind the figure and to one side, the back and the side of the face visible',
  'Slight low angle': 'camera at hip height looking slightly up',
  'Slight high angle': 'camera just above head height looking slightly down, the top of the shoulders visible, more ground than sky',
  "Worm's-eye view from ground level": 'camera on the ground looking straight up',
  'Telephoto side view, flat perspective': 'distant camera at chest height with a long lens, level, flat perspective, no foreshortening',
  'Tilted high angle': 'camera above the head looking down with the horizon tilted, the ground fills the background',
};
const START_SHOTS = ['Medium Shot (MS)', 'Medium Full Shot (MFS)', 'Three-Quarter Shot', 'Full Body Shot (FBS)', 'Bust Shot', 'Waist-Up Portrait, centered', 'Cowboy Shot', 'Profile Medium Shot', 'Off-Center Medium Shot, figure on one third of the frame', 'Diagonal Full Body, figure along the diagonal of the frame', 'Long Shot (LS)'];
const pickBy = (seed, list) => list[[...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) % list.length]; // mesma carta, mesmo início
const NEGATIVE_GENERIC = 'existing anime characters, recognizable named characters, canon armor designs, extra characters, crowd, giant faces or ghostly figures in the background';
// Carta genérica (autor, 02/11/2026): sem história no cânone não há referência, então o prompt pede personagem original e não cita regras, que trazem outros personagens.
// O que está aqui é do cânone; o resto começa como genérico, e o autor troca na caixa do popup.
const CANON = new RegExp(`(^|[^A-Z])(${[
  'SEIYA', 'SHIRYU', 'HYOGA', 'SHUN', 'IKKI', 'MU', 'SAGA', 'AIOLIA', 'AIOLOS', 'CAMUS', 'MARIN', 'SHAINA', 'MISTY', 'ALGOL', 'ORPHEE', 'KIKI', 'CASSIOS', 'JABU', 'GEKI', 'ICHI', 'NACHI', 'BAN', 'JUNE', 'TATSUMI', 'MIHO', 'SEIKA', 'SHUNREI', 'ESMERALDA', 'GUILTY', 'BABEL', 'MOSES', 'ASTERION', 'JAMIAN', 'DANTE', 'SAORI', 'ATHENA',
  'PEGASUS', 'DRAGON', 'CYGNUS', 'ANDROMEDA', 'PHOENIX', 'ARIES', 'GEMINI', 'LEO', 'CANCER', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES', 'EAGLE', 'OPHIUCHUS', 'LIZARD', 'PERSEUS', 'LYRA', 'UNICORN', 'KAMUI',
  'KANON', 'SORRENTO', 'BAIAN', 'ISAAC', 'THETIS', 'JULIAN', 'SIREN', 'SEAHORSE', 'KRAKEN', 'MERMAID', 'POSEIDON', 'GALACTIC ILLUSION', 'DEAD END', 'RISING BILLOWS', 'VIKING TIGER', 'GOLDEN TRIANGLE', 'AURORA BOREALIS', 'GOD BREATH', 'PILLAR', 'UNDERSEA SANCTUARY',
  'RHADAMANTHYS', 'MINOS', 'AIACOS', 'WYVERN', 'GRIFFON', 'GARUDA', 'SPHINX', 'PHARAOH', 'ACHERON', 'CHARON', 'HYPNOS', 'THANATOS', 'PANDORA', 'SHION', 'HARPY', 'VALENTINE', 'BALRON', 'LUNE', 'PAPILLON', 'MYU', 'NIOBE', 'BASILISK', 'SYLPHID', 'MARKINO', 'FROG ZEROS', 'GIGANTO', 'RAIMI', 'GOLEM ROCK', 'TROLL IWAN', 'DEADLY BEETLE', 'PHLEGYAS', 'MINOTAUR GORDON', 'ALRAUNE', 'GORGON OX', 'DULLAHAN CUBE', 'DEATHMASK', 'APHRODITE', 'SHURA', 'SURPLICE', 'HADES', 'COCYTUS', 'ELYSION', 'FIRST PRISON',
  'BLACK SWAN', 'JANGO', 'SHO', 'DAICHI', 'USHIO', 'ASAMORI', 'GEIST', 'GHOST SAINT', 'CRYSTAL SAINT', 'OHKO', 'LEDA', 'SPICA', 'SHIVA', 'AGORA', 'ARACHNE', 'GIGAS', 'PHAETON', 'GALAXIAN', 'JAMIR', 'FIVE OLD PEAKS', 'TWELVE', 'SANCTUARY GATES', 'GRAAD', 'DEATH QUEEN', 'STEEL CLOTH',
  'ARTEMIS', 'CALLISTO', 'CALISTO', 'SCOUMOUNE', 'THESEUS', 'ICARUS', 'TOUMA', 'ODYSSEUS', 'GLORY', // Artemis V2.0 (06/11/2026)
  'GOLD SAINTS', 'GOLD CLOTHS', 'SPECTERS', 'THREE JUDGES', '108 STARS', 'FREEZING COFFIN', 'GOLDEN ARROW', 'EIGHTH SENSE', 'WALL OF LAMENTATION', 'DEPRIVED OF SENSES', 'MASKED SAINT',
].join('|')})($|[^A-Z])`);
const CREATURE = /Beast|Wolf|Stag|Bear|Fox|Hound|Serpent|Treant|Construct|Skeleton/;

const clean = (t) => String(t || '').replace(/[@{}]/g, '').replace(/\s+/g, ' ').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();
const named = (lines) => (lines || []).map((l) => clean(l)).filter(Boolean).map((l) => { const [name, ...rest] = l.split(' — '); return rest.length ? {name, text: rest.join(' — ')} : {name: '', text: l}; });

// Tudo que dá para saber da carta, inclusive armaduras ligadas ao personagem e quem veste a armadura.
export function cardFacts(card, cards = []) {
  const kind = printedKind(card), name = clean(card.nome_exibicao_en), powers = named(card.habilidades_en);
  const faction = cards.filter((c) => c.tipo === 'Devotee' && c.faccao === card.faccao).map((c) => clean(c.nome_exibicao_en));
  const armors = cards.filter((c) => c.tipo === 'Equipment' && c.slot_equipamento === 'armadura' && (c.auto_equip_en || []).some((o) => same(o, name))).map((c) => ({name: clean(c.nome_exibicao_en), line: formatCardTypeLine(c)}));
  powers.push(...named([card.habilidade_awaken_en, card.ultimate_en]));
  const owner = name.match(/^(.+?)[’']S\b/)?.[1];
  const caster = owner ? faction.find((n) => n.split(' ').includes(owner)) : null;
  const wearer = (card.auto_equip_en || [])[0] ? clean(card.auto_equip_en[0]).toUpperCase() : null;
  const isSelf = card.tipo === 'Devotee' || card.tipo === 'God', isSpell = card.tipo === 'Spell';
  const generic = card.tipo !== 'God' && !CANON.test(caster || '') && !CANON.test(name) && !CANON.test(wearer || '') && !CANON.test(clean(card.habilidades_en?.join(' ')).match(/Resonance: ([^:]+):/)?.[1]?.toUpperCase() || '');
  return {
    generic, creature: generic && isSelf && (card.subtipos || []).some((s) => CREATURE.test(s)), name, kind, typeLine: formatCardTypeLine(card), faction: card.faccao, isSelf, isSpell, armors, powers,
    subtitle: clean(card.tagline_en || card.subtitulo_en), flavour: clean(card.flavour_en || card.flavour_pt), keywords: card.keywords_en || [], rarity: card.raridade,
    id: card.id, subtypes: card.subtipos || [], people: [...new Set([...(wearer ? [wearer] : []), ...faction])], person: isSelf ? name : isSpell ? caster || '' : '', // Equipment e Domain: só com personagem se o autor pedir (seção 10)
    techniques: [...new Set([...(isSpell ? [name] : []), ...powers.map((p) => p.name).filter((n) => n && !/^resonance\b/i.test(n))])],
  };
}

export function defaultParams(f) {
  const god = GODS[f.faction], cl = classifyFacts(f), byNature = {domain: 'Wide Environmental Shot', equipment: 'Object Hero Shot', divine: 'Divine Scale Shot'}[cl.nature];
  return {
    mode: f.generic ? 'image' : 'director', generic: f.generic, ethnicity: pickBy(`${f.name} ethnicity`, ETHNICITIES)[0], hair: pickBy(`${f.name} hair`, HAIRSTYLES)[0], version: '', god: god ? f.faction : '', person: f.person, armor: f.armors[0]?.name || '', technique: f.isSpell ? f.name : '', arc: '', theme: '',
    epic: f.kind === 'God' ? '5' : EPIC_BY_RARITY[f.rarity] || '3',
    shot: byNature || (cl.nature === 'technique' ? pickBy(`${f.name} shot`, EFFECT_SHOTS) : pickBy(`${f.name} shot`, START_SHOTS)), angle: pickBy(`${f.name} angle`, START_ANGLES), pose: pickBy(`${f.name} pose`, START_POSES), motion: f.isSelf || f.isSpell ? MOTIONS[1][0] : '',
    expression: EXPRESSIONS[0][0], style: styleWith(god?.style || 'Araki'), accent: '', light: LIGHTS[god?.light ?? 0][0], before: '', now: '', next: '', viewer: '', usePowers: true, notes: '',
    creature: 'auto', creatureCustom: '', species: '', order: '', orderCustom: '', count: cl.count, countCustom: '', formation: '', formationCustom: '', variety: 'same_class', lead: '', traits: '', special: '', creaturePose: pickBy(`${f.name} stance`, CREATURE_POSES.filter((x) => !x.needs)).label, creatureMood: pickBy(`${f.name} mood`, CREATURE_MOODS), shotManual: false, scope: 'all',
    nature: 'auto', focus: '', role: '', sceneType: cl.sceneType, sceneCustom: '', sceneMoment: 'decisive', sceneFocus: cl.sceneFocus,
    effect: cl.effect, effectCustom: '', visible: 'none', phase: 'release', origin: 'unseen', form: cl.form, intensity: f.kind === 'Technique' ? EPIC_BY_RARITY[f.rarity] || '3' : '3',
    objectKind: cl.objectKind, objectCustom: '', presentation: cl.presentation, equipState: cl.equipState, support: cl.support, supportCustom: '', bearer: 'auto',
    envType: cl.envType, envCustom: '', envState: cl.envState, envScale: cl.envScale, hour: '', weather: '', fog: '', depth: '', visibility: '', sky: '', lightSource: '', perspective: '', focal: '', phenomena: '',
    manifestation: cl.manifestation, divineScale: cl.divineScale,
    armorSource: 'auto', armorType: '', armorProject: '', armorVersion: '', armorUse: true, armorAdjust: '', handFinish: 'skin', lycraColor: '',
    artemisProfile: 'auto', // 'auto' = perfil pela carta; o autor pode trocar no editor
  };
}

const WIDE_SHOTS = ['Wide Shot (WS)', 'Wide Group Shot', 'Long Shot (LS)', 'Establishing Shot', 'Battlefield Panorama', 'Temple Defense Shot', 'Underwater Formation Shot', 'Aerial Formation Shot', 'Wide Environmental Shot'];
const ARMY_SHOTS = ['Extreme Wide Shot', 'Army Shot', 'Massive Army Shot', 'Massive Crowd Shot', 'Battlefield Panorama', 'Silhouette Army Shot', 'Aerial Formation Shot', 'Underwater Formation Shot', 'Establishing Shot'];
const GROUP_ONLY_SHOTS = new Set(['Wide Group Shot', 'Army Shot', 'Massive Army Shot', 'Massive Crowd Shot', 'Aerial Formation Shot', 'Underwater Formation Shot', 'Silhouette Army Shot', 'Temple Defense Shot']);
const NATURE_ONLY_SHOTS = new Set(['Object Hero Shot', 'Macro Detail Shot', 'Architectural Perspective Shot', 'Energy Impact Shot', 'Divine Scale Shot']);
const OBJECT_SHOTS = ['Object Hero Shot', 'Macro Detail Shot', 'Medium Shot (MS)', 'Wide Shot (WS)'];
const ENV_SHOTS = ['Wide Environmental Shot', 'Architectural Perspective Shot', 'Establishing Shot', 'Extreme Wide Shot', 'Long Shot (LS)', 'Battlefield Panorama'];
const EFFECT_SHOTS = ['Energy Impact Shot', 'Wide Shot (WS)', 'Medium Shot (MS)', 'Extreme Wide Shot', 'Long Shot (LS)'];
const SCENE_SHOTS = ['Wide Shot (WS)', 'Medium Shot (MS)', 'Long Shot (LS)', 'Establishing Shot', 'Wide Environmental Shot', 'Extreme Wide Shot', 'Over-the-Shoulder Shot'];
const DIVINE_SHOTS = ['Divine Scale Shot', 'Extreme Wide Shot', 'Creature Scale Shot', 'Establishing Shot', 'Long Shot (LS)'];
const shotPool = (n) => (n >= ARMY_FROM ? ARMY_SHOTS : n > 1 ? WIDE_SHOTS : SHOTS.map(([en]) => en).filter((en) => !GROUP_ONLY_SHOTS.has(en) && !NATURE_ONLY_SHOTS.has(en)));
// Só sugere: quem chama respeita a escolha manual do autor.
export function suggestShot(n, formation, nature = 'character') {
  if (n <= 1 && nature !== 'character') return {domain: 'Wide Environmental Shot', equipment: 'Object Hero Shot', technique: 'Energy Impact Shot', divine: 'Divine Scale Shot', scene: 'Wide Shot (WS)'}[nature] || 'Medium Full Shot (MFS)';
  if (n <= 1) return 'Medium Full Shot (MFS)';
  if (n >= 4 && formation === 'swimming') return 'Underwater Formation Shot';
  if (n >= 4 && formation === 'flying') return 'Aerial Formation Shot';
  if (n > EXACT_LIMIT && formation === 'temple_guard') return 'Temple Defense Shot';
  return n <= 3 ? 'Wide Shot (WS)' : n <= EXACT_LIMIT ? 'Wide Group Shot' : n < 50 ? 'Army Shot' : n < CROWD_FROM ? 'Extreme Wide Shot' : 'Massive Army Shot';
}

const pluralOf = (noun) => noun.replace(/(y)$/, 'ie').replace(/(s|x|ch|sh)$/, '$1e') + 's';
const originalOrder = (o) => (o.source === 'original' ? ' It is an original order created for this game, not part of any existing canon: invent its design.' : ' Its members here are anonymous and designed originally, not any named character.');

// Preset sem natureza gravada segue o caminho antigo, palavra por palavra. Automático usa a sugestão da carta, que o autor sobrescreve.
export const natureOf = (f, p) => (!p.nature ? 'legacy' : p.nature === 'auto' ? classifyFacts(f).nature : p.nature);
const manifestationOf = (p) => MANIFESTATIONS.find(([id]) => id === p.manifestation) || MANIFESTATIONS[0];
const presentationOf = (p) => PRESENTATIONS.find(([id]) => id === p.presentation) || PRESENTATIONS[0];
export function bearerOf(p) {
  if (p.bearer && p.bearer !== 'auto') return p.bearer;
  return presentationOf(p)[3] || (p.person ? 'equipped' : 'none');
}
const visibleOf = (p) => VISIBLE.find(([id]) => id === p.visible) || VISIBLE[0];

// Junta o que foi escolhido com o que a carta sugere. O elenco depende da natureza: Character sempre tem, os outros modos podem ter zero.
export function resolveCast(f, p) {
  const nature = natureOf(f, p), legacy = nature === 'legacy';
  const object = legacy ? f.kind === 'Equipment' || f.kind === 'Domain' : nature === 'equipment' || nature === 'divine', customCreature = clean(p.creatureCustom);
  const wanted = countOf(p);
  const n = object ? 1 : legacy || nature === 'character' ? Math.max(1, wanted) : nature === 'technique' ? Math.max(visibleOf(p)[2], visibleOf(p)[2] > 1 ? wanted : 0) : wanted;
  const picked = !object && (p.creature === 'custom' ? Boolean(customCreature) : Boolean(creatureById(p.creature)));
  const creature = (picked && (p.creature === 'custom' ? {id: 'custom', noun: customCreature, en: customCreature, profile: 'custom'} : creatureById(p.creature)))
    || (!object && p.generic && f.isSelf && creatureFromSubtypes(f.subtypes)) || creatureById('human');
  const profile = ANATOMY[creature.profile];
  const legacyFigure = Boolean(p.person) && !(p.generic && !f.isSelf);
  const active = nature === 'character' ? true : nature === 'equipment' ? BODY_BEARERS.has(bearerOf(p)) : nature === 'divine' ? ['full', 'face'].includes(manifestationOf(p)[3]) : !legacy ? n > 0 : object ? legacyFigure : f.isSelf || picked || n > 1 || legacyFigure;
  const humanBody = creature.profile === 'human' || creature.profile === 'divine';
  const order = !active ? null : p.order === 'custom' ? (clean(p.orderCustom) ? {label: clean(p.orderCustom), noun: clean(p.orderCustom), en: clean(p.orderCustom), source: 'original'} : null)
    : orderById(p.order) || (p.generic && orderFromCard(f.name, f.subtypes)) || null;
  const variety = VARIETIES.find(([id]) => id === p.variety) || VARIETIES[0];
  const nounOne = clean(p.species) || (order && humanBody ? order.noun : creature.noun);
  const plain = clean(p.species) ? pluralOf(nounOne) : order && humanBody ? order.plural || pluralOf(nounOne) : creature.plural || pluralOf(nounOne);
  const mixed = variety[0] === 'mixed';
  const plural = mixed ? `figures of mixed species: ${order?.plural || (order ? pluralOf(order.noun) : creature.plural || pluralOf(creature.noun))} and ${clean(p.species) || 'mythological creatures'}` : plain;
  const formationId = n > 1 ? p.formation || suggestFormation(n, profile) : 'single';
  const lead = LEADS.find(([id]) => id === p.lead) || (variety[0].startsWith('leader') ? LEADS[1] : n >= ARMY_FROM ? LEADS[3] : LEADS[0]);
  return {nature, active, picked, object, n, group: active && n > 1, army: active && n >= ARMY_FROM, crowd: active && n >= CROWD_FROM, exact: n <= EXACT_LIMIT, creature, profile, nonHuman: !profile.humanMood, mixed, order, variety, lead, formationId, noun: nounOne, plural};
}

// Sorteia a direção de arte. Personagem, armadura, deus, ordem, tipo, quantidade e técnica de Moment/Technique ficam como estão.
const RANDOM_LISTS = {ethnicity: ETHNICITIES, hair: HAIRSTYLES, version: VERSIONS, epic: EPIC_LEVELS, shot: SHOTS, angle: ANGLES, pose: POSES, motion: MOTIONS, expression: EXPRESSIONS, style: STYLES, accent: STYLES, light: LIGHTS, theme: THEMES, arc: ARCS, before: BEFORE, now: NOW, next: NEXT, viewer: VIEWER};
export const RANDOM_SCOPES = [['all', 'Tudo'], ['appearance', 'Só aparência'], ['composition', 'Só composição'], ['camera', 'Só câmera e iluminação'], ['group', 'Só personagens do grupo']];
const SCOPE_KEYS = {appearance: ['ethnicity', 'hair', 'expression'], composition: ['shot', 'angle', 'pose', 'motion'], camera: ['shot', 'angle', 'light'], group: []};
function randomByNature(f, p, nature, rand) {
  const pick = (list) => list[Math.floor(rand() * list.length)], out = {...p}, cl = classifyFacts(f);
  const id = (list) => pick(list)[0];
  out.angle = id(ANGLES); out.light = id(LIGHTS); out.style = id(STYLES); out.accent = ''; out.shotManual = false;
  if (nature === 'equipment') {
    const free = bearerOf(p) !== 'none' || (p.bearer && p.bearer !== 'auto' && p.bearer !== 'none');
    out.presentation = id(PRESENTATIONS.filter((x) => free ? !x[4] : !x[3]));
    out.support = id(SUPPORTS.filter(([k]) => k !== 'custom'));
    out.shot = pick(OBJECT_SHOTS);
  } else if (nature === 'technique') {
    if (!cl.effectMatched && p.effect !== 'custom') out.effect = id(EFFECTS.filter(([k]) => k !== 'custom'));
    out.phase = id(PHASES);
    out.form = id(FORMS);
    out.origin = id(ORIGINS.filter((x) => visibleOf(p)[2] > 0 || !x[3]));
    out.shot = pick(EFFECT_SHOTS);
  } else if (nature === 'scene') {
    out.sceneMoment = id(SCENE_MOMENTS);
    out.sceneFocus = id(SCENE_FOCI.filter(([k]) => countOf(p) > 0 || !FIGURE_FOCI.has(k)));
    out.shot = pick(SCENE_SHOTS);
    out.viewer = id(VIEWER);
  } else if (nature === 'domain') {
    for (const key of ['hour', 'weather', 'sky', 'perspective', 'lightSource']) out[key] = id(ENV_EXTRAS[key][1].slice(1));
    out.envState = id(ENV_STATES);
    out.shot = pick(ENV_SHOTS);
  } else {
    out.manifestation = id(MANIFESTATIONS);
    out.divineScale = id(DIVINE_SCALES);
    out.shot = pick(DIVINE_SHOTS);
  }
  return out;
}
export function randomParams(f, p, rand = Math.random, scope = 'all') {
  const nature = natureOf(f, p);
  if (nature !== 'legacy' && nature !== 'character') return randomByNature(f, p, nature, rand);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const out = {...p}, all = scope === 'all', c = resolveCast(f, p), body = c.profile;
  for (const [key, list] of Object.entries(RANDOM_LISTS)) if (all || SCOPE_KEYS[scope].includes(key)) out[key] = pick(list)[0];
  if (out.shot !== p.shot) { out.shot = pick(shotPool(c.n)); out.shotManual = false; }
  // Campo que não existe neste corpo fica guardado como estava.
  if (!body.ethnicity) out.ethnicity = p.ethnicity;
  if (!body.hair) out.hair = p.hair;
  if (!body.humanMood) { out.expression = p.expression; out.pose = p.pose; }
  if (all && out.accent === out.style) out.accent = '';
  if (all && p.generic) out.theme = pick(body.swim && !body.hands ? OCEAN_THEMES : p.god === 'Poseidon' ? [...GENERIC_THEMES, ...OCEAN_THEMES] : GENERIC_THEMES)[0];
  if (all && !f.isSpell) out.technique = pick(['', ...f.techniques]);
  if (all && p.creature === 'random') out.creature = pick(creaturePool(p.god)).id;
  if ((all || scope === 'appearance') && body.traits?.length) out.traits = pick(body.traits);
  if ((all || scope === 'appearance') && !body.humanMood) out.creatureMood = pick(CREATURE_MOODS);
  if ((all || scope === 'composition') && !body.humanMood) out.creaturePose = pick(CREATURE_POSES.filter((x) => !x.needs || body[x.needs])).label;
  if (c.group && (all || scope === 'group')) {
    const underwater = body.swim || p.god === 'Poseidon';
    out.formation = pick(FORMATIONS.filter((x) => x.id !== 'single' && c.n >= x.min && c.n <= x.max && (!x.needs || (x.needs === 'swim' ? underwater : x.needs === 'fly' ? body.fly : body.humanMood)))).id;
    if (!c.mixed) out.variety = pick(VARIETIES.filter(([id]) => id !== 'mixed'))[0];
    out.lead = pick(LEADS)[0];
  }
  return out;
}

// Com quantidade zero, pedir gente nas observações contradiz o prompt: o trecho fica de fora até o autor escolher.
const PEOPLE_NOTE = /(?<!\b(?:sem|no|without|nenhum|nenhuma)\s)\b(personagem|personagens|guerreiro|guerreira|soldado|soldados|pessoa|pessoas|rosto|warrior|soldier|people|person|character|face)\b/i;
const noteSentences = (notes) => String(notes || '').split(/(?<=[.;!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const finalNotes = (notes, c) => noteSentences(allowedNotes(notes)).filter((s) => c.active || !PEOPLE_NOTE.test(s)).join(' ');

// Pedidos das observações e combinações que brigam entre si: o popup avisa e oferece a saída.
export function promptWarnings(f, p) {
  const c = resolveCast(f, p), out = [];
  for (const note of blockedNotes(p.notes)) out.push({text: `Regra técnica do formato vence: "${note}" ficou fora do prompt.`, action: 'fixnotes', button: 'Tirar das observações'});
  if (c.group && notesAskAlone(p.notes)) out.push({text: `As observações pedem personagem sozinho, mas a quantidade é ${c.n}. A observação vence no prompt.`, action: 'solo', button: 'Voltar para 1 personagem'});
  if (c.army && /Close-Up|Bust|Portrait|Tight/.test(p.shot)) out.push({text: 'Plano fechado não mostra um exército: o grupo não vai aparecer inteiro.', action: 'shot', button: 'Usar plano sugerido'});
  if (!c.active && noteSentences(allowedNotes(p.notes)).some((s) => PEOPLE_NOTE.test(s))) out.push({text: 'As observações pedem personagem, mas esta arte não tem nenhum: o trecho ficou fora do prompt.', action: c.nature === 'technique' ? 'addcaster' : c.nature === 'equipment' ? 'addbearer' : 'addfigure', button: 'Incluir personagem'});
  if (c.nature === 'scene' && FIGURE_FOCI.has(p.sceneFocus) && c.n === 0) out.push({text: 'O foco da cena é um personagem, mas a quantidade é zero: o foco passou para o acontecimento.', action: 'addfigure', button: 'Incluir personagem'});
  if (c.nature === 'scene' && p.sceneFocus === 'interaction' && c.n === 1) out.push({text: 'Interação pede pelo menos dois personagens, e a quantidade é 1.', action: 'addsecond', button: 'Usar 2 personagens'});
  if (c.nature === 'equipment') {
    const [, , , needs, alone] = presentationOf(p), bearer = bearerOf(p);
    if (needs && bearer === 'none') out.push({text: 'Esta apresentação pede alguém segurando ou vestindo o objeto, mas o portador é Nenhum: o prompt mostra o objeto flutuando.', action: 'addbearer', button: 'Incluir portador'});
    if (alone && bearer !== 'none') out.push({text: 'Objeto isolado e portador visível não combinam: o portador vence, e o objeto continua o sujeito principal.', action: 'nobearer', button: 'Tirar o portador'});
  }
  if (c.nature === 'technique' && c.n === 0 && ORIGINS.find(([id]) => id === p.origin)?.[3]) out.push({text: 'A origem do efeito é um corpo, mas nenhum personagem aparece: o prompt usa uma fonte invisível.', action: 'addcaster', button: 'Mostrar o conjurador'});
  return out;
}

function genericSubject(f, p, army, c) {
  const original = 'Invent the design from the card name and the faction; it is not based on any existing character or armor.';
  if (c.object && f.kind === 'Equipment') return `${f.name} (${f.typeLine}), an original sacred object alone, with no wearer. ${original} Show its structure and materials clearly.`;
  if (c.object && f.kind === 'Domain') return `${f.name}, an original place, with no characters. ${original}`;
  if (c.group) return `${f.name}, an original ${c.army ? 'force' : 'group'} created for this card, ${army}: ${castPhrase(c)}. ${original}${c.exact ? ` There are ${c.n} figures in the image, all of them clearly visible.` : ''}`;
  if (f.isSelf || c.picked || c.nature === 'character') return `${f.name}, an original ${c.nonHuman ? 'creature' : 'character'} created for this card, ${army}. ${original} Exactly one figure in the image: no other characters, no faces or giant figures in the background.`;
  return `${f.name}, an original scene created for this card, told by the environment and the energy, with at most one anonymous figure. ${original}`;
}
function castPhrase(c) {
  if (c.crowd) return `a vast army of more than a hundred ${c.plural}, seen as a mass, with no attempt at a precise count`;
  if (!c.exact) return `about ${c.n} ${c.plural}`;
  if (c.n === 1) return `one ${c.noun}`;
  return `exactly ${countWord(c.n)} ${c.mixed ? '' : c.variety[0] === 'identical' ? 'matching ' : 'distinct '}${c.plural}`;
}
const castShort = (c) => (c.crowd ? `More than a hundred ${c.plural}` : c.exact ? `${countWord(c.n)[0].toUpperCase()}${countWord(c.n).slice(1)} ${c.plural}` : `About ${c.n} ${c.plural}`);
const placeOf = (god) => (god === 'Poseidon' ? "Poseidon's underwater temple" : god ? `the temple of ${god}` : 'the temple');
const formationLine = (c, p) => { const text = c.formationId === 'custom' ? clean(p.formationCustom) : formationById(c.formationId)?.text; return text ? `FORMATION: ${castShort(c)} ${text.replace('{place}', placeOf(p.god))}.` : ''; };
const anatomyLine = (c) => {
  if (c.mixed) return `ANATOMY: each species keeps its own coherent anatomy; none is a copy of another.${c.profile.hands ? ` Human figures: ${c.profile.text}.` : ''}`;
  return `ANATOMY${c.group ? ' (every figure)' : ''}: ${c.profile.text}.`;
};
// Regra dos 7/10 do Master, estendida pelo autor (02/11/2026) ao ponto de maior atenção de toda natureza de arte, não só ao rosto.
const ATTENTION = `at about 7/10 of the image height measured from the bottom, inside the zone ${FACE_ZONE}`;
function focusLine(c, figure, faceless) {
  if (!figure) return '';
  if (faceless) return `FOCAL POINT: this figure is read by silhouette and placement, with no face to carry the image; build a clear visual center of interest ${ATTENTION}.`;
  if (c.army) return `SCALE AND READING: the force reads through silhouettes, scale and collective organization; a few foreground figures are large enough to read, the rest resolve into ranks. No single face has to carry the image: its point of greatest attention sits ${ATTENTION}.`;
  if (c.group) return c.lead[0] === 'collective' || c.lead[0] === 'balanced' ? `GROUP READING: the faces or heads of the front figures sit ${ATTENTION}; no figure may hide another one's face. Keep the top free for card interface.` : `${faceZoneRule('the entire head of the protagonist or main face, with helmet, crest and hair,')} The other figures do not need to follow it and never cover that face.`;
  if (c.profile.focus === 'face') return faceZoneRule();
  if (c.profile.focus === 'eyes') return faceZoneRule('the entire head of the creature, with its eyes and its jaw or beak');
  return `FOCAL POINT: this being has no face to rely on; build a clear visual center of interest ${ATTENTION}.`;
}
function negativeLine(generic, c, figure) {
  const genericBase = 'existing anime characters, recognizable named characters, canon armor designs', backdrop = 'giant faces or ghostly figures in the background';
  const always = !generic && !c.nonHuman ? NEGATIVE_ALWAYS : NEGATIVE_ALWAYS.replace('inaccurate armor, ', '');
  const figureBan = c.profile.hands ? (generic ? NEGATIVE_FIGURE.replace(', incorrect character design', '') : NEGATIVE_FIGURE) : c.profile.humanMood ? 'broken anatomy, distorted face, cropped face, incoherent joints' : 'incoherent anatomy, muddled silhouette';
  const own = c.mixed ? '' : c.profile.neg;
  if (!c.group) return [figure && figureBan, figure && own, generic && `${genericBase}, ${c.nature === 'legacy' || c.nature === 'character' || figure ? 'extra characters, crowd, ' : ''}${backdrop}`, always].filter(Boolean).join(', ');
  const repeated = c.variety[0] !== 'identical' && 'repeated identical faces when variation is requested';
  const groupBan = c.army ? ['incoherent armor', 'merged silhouettes', 'visual noise', 'unreadable foreground', repeated] : ['unintended additional characters beyond the requested count', 'duplicate body parts', 'merged figures', 'incoherent anatomy', 'unreadable group composition', repeated, c.profile.hands && 'malformed hands, extra fingers, fused fingers'];
  return [...groupBan, own, generic && `${genericBase}, ${backdrop}`, always].filter(Boolean).join(', ');
}

// O que cada natureza muda no prompt: direção, sujeito, linhas próprias, foco visual e negative. Character usa o sistema V2 sem mudança.
const NO_PEOPLE = 'people, human figures, faces, characters in the background';
function modeOf(f, p, c, personSubject) {
  const generic = p.generic, name = f.name, zero = !c.active, invent = generic ? ' Invent the design from the card name and the faction; it is not based on any existing character or armor.' : '';
  const present = !zero ? (personSubject || `${name}: ${castPhrase(c)}.`) : '';
  if (c.nature === 'scene') {
    const focusId = zero && FIGURE_FOCI.has(p.sceneFocus) ? 'event' : p.sceneFocus;
    const kind = textOf(SCENE_TYPES, p.sceneType, p.sceneCustom), moment = textOf(SCENE_MOMENTS, p.sceneMoment), focus = textOf(SCENE_FOCI, focusId);
    const figureFocus = !zero && FIGURE_FOCI.has(focusId);
    return {
      direction: 'Show one specific event, its emotion and its weight, with cinematic framing. The event is the subject, not the appearance of an individual. Avoid a generic poster composition.',
      subject: zero ? `${name}, ${generic ? 'an original scene created for this card' : 'as an event'}. No people appear in the image: it is told only by objects, the environment and energy.${invent}` : `${present}${invent}`,
      lines: [`SCENE: ${kind || 'a symbolic scene'}, ${moment || 'the decisive instant'}. MAIN VISUAL ELEMENT: ${focus}.`],
      focus: figureFocus ? null : `FOCAL POINT: ${focus}, ${ATTENTION}.`,
      faceless: !figureFocus,
      negative: [zero && NO_PEOPLE, 'generic poster composition, static posing with no event'],
      references: !zero,
    };
  }
  if (c.nature === 'technique') {
    const visible = visibleOf(p), noBody = c.n === 0;
    const originRow = ORIGINS.find(([id]) => id === p.origin) || ORIGINS[10], origin = noBody && originRow[3] ? 'an unseen source' : originRow[2];
    const level = INTENSITIES.find(([id]) => id === p.intensity) || INTENSITIES[2];
    return {
      direction: 'The power itself is the subject: its origin, its trajectory and its consequence must read at a glance.',
      subject: noBody ? `${name}, shown as a pure manifestation of power. No caster, no target and no people appear in the image.${invent}` : `${personSubject || name}${invent}`,
      lines: [`EFFECT: ${textOf(EFFECTS, p.effect, p.effectCustom) || 'pure cosmo'}, taking the visual form of ${textOf(FORMS, p.form) || 'an abstract form'}. ORIGIN: ${origin}. PHASE: ${textOf(PHASES, p.phase) || 'the release at full power'}.`, `VISUAL INTENSITY ${level[0]} OF 5: ${level[2]}.`, !noBody && `VISIBLE FIGURES: ${visible[3]}; they stay secondary to the effect.`],
      focus: `FOCAL POINT: the heart of the energy manifestation, ${ATTENTION}; no face has to carry the image.`,
      faceless: true,
      negative: [noBody && NO_PEOPLE, 'muddled energy with no readable origin or direction, written effects'],
      references: !noBody,
    };
  }
  if (c.nature === 'equipment') {
    const bearer = bearerOf(p), needs = presentationOf(p)[3], kindId = p.objectKind === 'auto' || !p.objectKind ? classifyFacts(f).objectKind : p.objectKind;
    const presentation = needs && bearer === 'none' ? 'the object floating in the air' : presentationOf(p)[2];
    const state = textOf(EQUIP_STATES, p.equipState), kind = textOf(OBJECT_KINDS, kindId, p.objectCustom);
    const support = textOf(SUPPORTS, p.support, p.supportCustom), bearerText = textOf(BEARERS, bearer);
    const canonLook = generic ? '' : ' Preserve the symbols, colors and geometry of the attached reference images.';
    const damaged = DAMAGED_STATES.has(p.equipState) || p.presentation === 'broken';
    return {
      direction: 'The equipment is the protagonist. Show structure and materials clearly, in a collectible art composition; it stays recognizable as the main subject.',
      subject: bearer === 'none' ? (generic ? `${name} (${f.typeLine}), an original sacred object alone, with no wearer.${invent} Show its structure and materials clearly.` : `${name} (${f.typeLine}) alone as a sacred object, with no wearer; show its structure and materials clearly and preserve the symbols, colors and geometry of the attached reference images.`) : personSubject && BODY_BEARERS.has(bearer) ? personSubject : `${name} (${f.typeLine}), the main subject of the image.${invent}${canonLook}`,
      lines: [`OBJECT: ${kind ? `${kind}, ` : ''}${state || 'intact'}. PRESENTATION: ${presentation}.`, bearer !== 'none' && `BEARER: ${bearerText}; the object stays the main subject.`, bearer === 'hands' && 'HANDS: exactly five fingers on each visible hand.'],
      setting: support,
      focus: p.presentation === 'mounted' ? faceZoneRule('the entire helmet of the empty armor') : `FOCAL POINT: the most important part of the object, ${ATTENTION}, with its full shape readable around that point.`,
      faceless: !BODY_BEARERS.has(bearer),
      keepFace: BODY_BEARERS.has(bearer),
      negative: [bearer === 'none' && `${NO_PEOPLE}, wearer, mannequin, hands`, damaged ? 'object hidden by effects, unreadable shape' : 'unintended damage, broken geometry, object hidden by effects', 'cropped object'],
      references: true,
    };
  }
  if (c.nature === 'domain') {
    const extras = Object.keys(ENV_EXTRAS).map((key) => textOf(ENV_EXTRAS[key][1], p[key])).filter(Boolean);
    return {
      direction: 'The place is the protagonist: architecture, depth, atmosphere, scale and faction identity.',
      subject: `${name}, ${generic ? 'an original place' : 'as a place'}${zero ? ', with no characters' : ''}.${invent}${zero ? '' : ` Present in the place: ${castPhrase(c)}, small against it.`}`,
      lines: [`ENVIRONMENT: ${textOf(ENV_TYPES, p.envType, p.envCustom) || 'an epic place'}, ${textOf(ENV_STATES, p.envState) || 'intact'}. SCALE: ${textOf(ENV_SCALES, p.envScale) || 'monumental'}.`, extras.length && `ATMOSPHERE: ${extras.join('; ')}.`],
      focus: `FOCAL POINT: the main structure or landscape feature, ${ATTENTION}; depth and perspective lead the eye to it.${zero ? '' : ' The figures give it scale and never cover it.'}`,
      faceless: true,
      negative: [zero && NO_PEOPLE, 'flat perspective, incoherent architecture'],
      references: false,
    };
  }
  const man = manifestationOf(p), body = man[3], language = DIVINE_LANGUAGE[p.god];
  const bodied = body === 'full' || body === 'face';
  return {
    direction: 'Show divine presence: scale, impact and perceptible supernatural power. Never hide a divine face with effects when one is shown.',
    subject: bodied && personSubject ? personSubject : `${name}, manifested ${man[2]}.${invent}`,
    lines: [`DIVINE MANIFESTATION: ${man[2]}, at ${textOf(DIVINE_SCALES, p.divineScale) || 'heroic scale'}.`, language && `DIVINE LANGUAGE: ${language}. This guides the identity, it is not monochrome. Do not present any invented symbol as an official emblem.`],
    focus: bodied ? null : `FOCAL POINT: the heart of the manifestation, ${ATTENTION}; its presence and scale carry the image, and no face or human body is required.`,
    faceless: !bodied,
    negative: [!bodied && 'human body, human face, anatomy', 'small unimpressive presence'],
    references: bodied,
  };
}

// Armadura decidida antes do personagem (Armor Forge). Em Automático, o prompt sai palavra por palavra como sempre saiu.
const INVENTED = 'Invent the design from the card name and the faction; it is not based on any existing character or armor.';
export function armorChoice(p) {
  if (p.armorSource === 'none') return {kind: 'none', name: ''};
  if (p.armorSource === 'existing' && p.armor) return {kind: 'existing', name: p.armor};
  if (p.armorSource === 'original' && p.armorUse && p.armorDesign) return {kind: 'locked', ...p.armorDesign};
  return null;
}
function armorPromptLines(choice, generic, c, figure, handRule) {
  if (!choice || (!figure && c.nature !== 'equipment')) return [];
  if (choice.kind === 'none') return figure ? ['ARMOR: this figure wears no armor at all; clothing and body only.'] : [];
  if (choice.kind === 'existing') return generic ? [`ARMOR: ${choice.name}, an existing armor of this game. Match its attached reference images: plates, ornaments and colors. Do not invent armor changes.`] : [];
  return lockLines(choice.lock, {adjustments: choice.adjustments, referenceCount: choice.references.length, group: c.group, noWearer: !figure, handRule});
}

export function buildImagePrompt(f, p) {
  const artemis = f.faction === 'Artemis' && p.god === 'Artemis' ? (p.artemisProfile && p.artemisProfile !== 'auto' ? artemisProfile(p.artemisProfile) : artemisProfileOf(f)) : null;
  const choice = armorChoice(p), generic = p.generic, god = GODS[p.god], c = resolveCast(f, p), figure = c.active, isEquipment = f.kind === 'Equipment', power = f.powers.find((x) => x.name === p.technique), epic = EPIC_LEVELS.find(([v]) => v === p.epic);
  const modal = c.nature !== 'legacy' && c.nature !== 'character';
  const divine = c.nature === 'divine' || (c.nature === 'legacy' && classifyFacts(f).nature === 'divine');
  const handRule = (c.nature === 'equipment' && bearerOf(p) === 'hands' || (figure && c.profile.hands)) && !divine && choice?.kind !== 'none' && (choice?.kind !== 'locked' || gauntletApplies(choice.lock));
  const castingCaster = c.nature !== 'technique' || ['caster', 'both', 'casters'].includes(p.visible);
  const person = figure && castingCaster ? p.person : c.nature === 'legacy' ? p.person : '';
  const companions = c.group && person ? ` ${person} is the protagonist, with ${c.crowd ? 'a vast army' : c.exact ? countWord(c.n - 1) : `about ${c.n - 1}`} of anonymous ${c.plural} around.` : '';
  const armorWorn = choice ? choice.name : p.armor;
  const personSubject = person && !generic ? `${person}${isEquipment ? `, wearing ${f.name} (${f.typeLine})` : armorWorn ? `, wearing ${armorWorn}` : ''}. Match the attached reference images: face, hair, eyes, armor, ornaments, helmet and characteristic colors. Do not invent armor changes.${companions}` : '';
  const mode = modal ? modeOf(f, p, c, personSubject) : null;
  const baseSubject = mode ? mode.subject : generic ? genericSubject(f, p, god ? `serving ${p.god}` : 'an independent warrior', c) : person
    ? personSubject
    : isEquipment ? `${f.name} (${f.typeLine}) alone as a sacred object, with no wearer; show its structure and materials clearly and preserve the symbols, colors and geometry of the attached reference images.`
      : f.kind === 'Domain' ? `${f.name}, as a place, with no characters.` : figure ? `${f.name}: ${c.group ? castPhrase(c) : c.creature.en}.` : `${f.name}, as an event, with no main character.`;
  const subject = choice ? baseSubject.replace(INVENTED, `Invent the character from the card name and the faction, not the armor: ${choice.kind === 'none' ? 'there is none' : 'it is defined below'}.`) : baseSubject;
  const story = [p.before && `Just happened: ${p.before}.`, p.now && `Happening now: ${p.now}.`, p.next && `About to happen: ${p.next}.`, p.viewer && `The viewer must feel: ${p.viewer}.`].filter(Boolean).join(' ');
  const direction = mode ? mode.direction : c.group ? (c.army ? 'The collective force is the subject: mass, order and scale, with the card name as its identity.' : 'The group is the main focal point, composed as one readable image and not as separate portraits.') : c.nonHuman && figure ? 'The creature is the main focal point, with a clear readable silhouette.' : (generic && GENERIC_RULES[c.nature === 'character' ? 'Devotee' : f.kind]) || TYPE_RULES[c.nature === 'character' ? 'Devotee' : f.kind] || TYPE_RULES.Devotee;
  const morphology = figure && !c.mixed && c.creature.id !== 'human' && `CREATURE MORPHOLOGY: ${c.group ? `every figure is ${c.creature.en}` : c.creature.en}${clean(p.species) ? `, of the kind: ${clean(p.species)}` : ''}.${c.nonHuman ? ` ${c.group ? 'They are' : 'It is'} not ${c.group ? 'humans' : 'a human'} in armor, and no human warrior stands in front of ${c.group ? 'them' : 'it'}.` : ''}`;
  const skin = generic && figure && !c.army && !c.mixed && (f.isSelf || c.group || c.picked || modal || c.nature === 'character');
  const appearance = skin && [c.profile.ethnicity && `APPEARANCE (mandatory, clearly visible in the face and skin): ${c.group ? 'main figure: ' : ''}${p.ethnicity}.`, c.profile.hair && `HAIR, visible and not hidden by a helmet: ${p.hair}.`].filter(Boolean).join(' ');
  const traits = figure && [c.profile.trait && clean(p.traits), clean(p.special)].filter(Boolean).join('; ');
  const role = figure && p.role && (ROLES.find(([id]) => id === p.role) || [])[2];
  const faceless = FACELESS_ROLES.has(p.role) && figure;
  const humanoid = figure && c.profile.humanMood;
  const showPose = humanoid && !faceless && !mode?.faceless && !c.army && c.lead[0] !== 'collective' && c.lead[0] !== 'balanced';
  const notes = clean(finalNotes(p.notes, c));
  const viewpoint = modal && !figure ? 'the viewpoint on the main subject, which stays fully readable' : ANGLE_VIEW[p.angle] || p.angle;
  const focal = mode ? [mode.focus, (mode.focus === null || mode.keepFace) && focusLine(c, figure, faceless)].filter(Boolean).join(' ') : focusLine(c, figure, faceless);
  const setting = mode?.setting || (c.nature === 'domain' && !p.theme ? '' : p.theme || (god ? god.setting : generic ? 'an epic mythological setting' : 'an epic mythological setting from the Saint Seiya universe'));
  const refs = !generic && (!mode || mode.references);
  const showTechnique = p.technique && !(c.nature === 'scene' && p.technique === f.name) && c.nature !== 'domain' && c.nature !== 'equipment';
  const body = [
    `Vertical 3:4 high-resolution illustration for ${generic ? 'a mythological anime trading card, in a world of sacred armors and Greek gods' : 'a Saint Seiya trading card'}. Illustration only: no card frame, no text, no names, no logos, no numbers, no stats, no interface symbols, no watermarks.`,
    focal,
    `CARD: ${f.name}${f.subtitle ? ` — "${f.subtitle}"` : ''} (${f.typeLine || f.kind}, ${f.rarity || 'Common'}).`,
    `CARD TYPE DIRECTION: ${direction}`,
    `SUBJECT: ${subject}`,
    clean(p.focus) && `MAIN FOCUS: ${clean(p.focus)}.`,
    ...(mode ? mode.lines : []),
    role && `CHARACTER ROLE (visual only): ${role}.`,
    morphology,
    c.order && `ARCHETYPE (visual only): ${c.order.label}${choice ? '' : `: ${c.order.en}`}.${originalOrder(c.order)}`,
    ...armorPromptLines(choice, generic, c, figure, handRule),
    handRule && gauntletRule({finish: p.handFinish, lycra: p.lycraColor}),
    c.group && `GROUP VARIATION: ${c.variety[2]}.`,
    c.group && !(c.variety[0].startsWith('leader') && c.lead[0] === 'collective') && `GROUP FOCUS: ${c.lead[2]}.`,
    c.group && formationLine(c, p),
    appearance,
    traits && `SPECIAL FEATURES: ${traits}.`,
    `CAMERA VIEWPOINT (mandatory, overrides any other hint about viewpoint): ${p.angle}: ${viewpoint}.`,
    `ART STYLE (top priority for the whole image: line, shading, color treatment and rendering): ${p.style}.${p.accent ? ` Complementary finish: ${p.accent}.` : ''}`,
    !generic && p.version && choice?.kind !== 'locked' && `DESIGN CANON: costume and armor shapes follow ${p.version}, only as design. Draw them in the ART STYLE above, not in the look of that version.`,
    refs && 'REFERENCES: reference images are attached to this prompt. Use them only for character identity and armor design (face, hair, silhouette, parts, colors); follow them over any written description of those. Do not copy their drawing style, line or shading: redraw everything in the ART STYLE.',
    god && `FACTION IDENTITY: ${p.god}, ${god.title}. Palette identity, not monochrome: ${god.palette}. Feeling: ${god.mood}.`,
    ...artemisDirectionLines(artemis),
    setting && `SETTING: ${setting}.${p.arc && !generic ? ` Inspired by: ${p.arc}.` : ''}`,
    story && `STORY: ${story}`,
    `FRAMING: ${p.shot}.${showPose ? ` ${c.group ? 'PROTAGONIST POSE' : 'POSE'}: ${p.pose}.` : ''}${figure && !humanoid && !c.group && p.creaturePose ? ` STANCE: ${p.creaturePose}.` : ''}${p.motion ? ` MOTION: ${p.motion}.` : ''}`,
    humanoid && !c.army && !faceless && !mode?.faceless && `EXPRESSION${c.group ? ' OF THE MAIN FACE' : ''}: ${p.expression}.`,
    figure && !humanoid && p.creatureMood && `BEHAVIOR: ${p.creatureMood}.`,
    'COMPOSITION: card interface may cover parts of the image, so build around that point of greatest attention and keep a silhouette readable at small size.',
    figure && anatomyLine(c),
    showTechnique && `TECHNIQUE IN USE: ${p.technique}${power && !generic ? ` — ${power.text}` : ''}. Show its origin, trajectory and consequence visually with cosmo energy; no written effects.`,
    `LIGHTING: ${p.light}.`,
    epic && `EPIC LEVEL ${epic[0]} OF 5: ${epic[2]}, without hurting ${figure ? 'character fidelity' : 'subject fidelity'} or card legibility.`,
    !generic && p.usePowers && f.powers.length ? `POWERS TO EVOKE (visual inspiration, do not write them): ${f.powers.slice(0, 4).map((x) => x.name ? `${x.name}: ${x.text}` : x.text).join(' | ')}` : '',
    !generic && p.usePowers && f.keywords.length ? `KEYWORDS: ${f.keywords.join(', ')}.` : '',
    f.flavour && `MOOD LINE: ${f.flavour}`,
    notes && `NOTES (author's direction, overrides the fields above, never the format rules): ${notes}`,
  ].filter(Boolean).join('\n');
  const own = [artemisNegative(artemis), mode ? mode.negative.filter(Boolean).join(', ') : '', choice?.kind === 'locked' && lockNegative(choice.lock), choice?.kind === 'none' && figure && 'armor, armor plates, pauldrons', handRule && GAUNTLET_BAN, focal.includes('FACE ZONE') && FACE_ZONE_BAN].filter(Boolean).join(', ');
  return `${body}\n\nNEGATIVE PROMPT: ${own ? `${own}, ` : ''}${negativeLine(generic, c, figure)}.`;
}

// O que vai para a camada local de direção de arte. Nada de arte, custo ou texto da carta.
export const savedEntry = (f, p, prompt) => ({params: Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'scope' && key !== 'armorDesign')), prompt, prompt_version: PROMPT_VERSION, nature: natureOf(f, p)});
export const restoreEntry = (f, entry) => ({...defaultParams(f), ...(entry?.params || {})});

// Sistema completo: o GPT recebe o Master, trata o que veio escolhido como decisão do autor e responde no formato da seção 12.
export const buildDirectorPrompt = (master, f, p) => `${master.trim()}\n\n---\nSOLICITAÇÃO DE ARTE\nExecute o processo da seção 11 para a carta abaixo e responda no formato obrigatório da seção 12. Não gere a imagem. Os parâmetros são decisões do autor; desenvolva-os com especificidade. Onde a narrativa estiver em branco, proponha a cena. ${armorChoice(p)?.kind === 'locked' ? 'A armadura desta carta já está definida: siga o ARMOR DESIGN LOCK e as referências dela anexadas, sem redesenhar. ' : ''}${p.generic ? 'Esta carta é genérica e não tem imagens de referência: crie um design original, sem usar personagens, armaduras ou fatos do cânone.' : 'As imagens de referência vão anexadas a esta mensagem: analise-as na Etapa 2.'}\n\n${buildImagePrompt(f, p)}`;

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const select = (name, label, opts, value) => `<label>${label}<select name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t ?? v)}</option>`).join('')}</select></label>`;
const groupedSelect = (name, label, first, value, groups = STYLE_GROUPS) => `<label>${label}<select name="${name}">${first.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}${Object.entries(groups).map(([group, opts]) => `<optgroup label="${esc(group)}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
const input = (name, label, value, placeholder = '') => `<label>${label}<input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
const warningHtml = (f, p) => promptWarnings(f, p).map((w) => `<p class="ap-warn">${esc(w.text)}<button type="button" data-ap="${w.action}">${esc(w.button)}</button></p>`).join('');
const GPT_URL = 'https://chatgpt.com/';
const URL_LIMIT = 7000; // acima disso o link pode falhar: o GPT abre vazio e o prompt fica copiado

export function mountArtPrompt(dialog, {getCard, getCards, say, masterUrl, openArmor}) {
  let facts, params, master = '', decisions = null, variant = 'default', savedPrompt = '', armorStore = null;
  const cardId = () => getCard().id;
  const output = () => dialog.querySelector('textarea[name=prompt]');
  const text = () => (params.mode === 'director' && master ? buildDirectorPrompt(master, facts, params) : buildImagePrompt(facts, params));
  const refresh = () => { output().value = text(); };
  async function copy() {
    const value = output().value;
    try { await navigator.clipboard.writeText(value); return true; } catch {}
    output().select(); // dentro do iframe do Star Hill a área de transferência pode ser negada
    try { return document.execCommand('copy'); } catch { return false; }
  }
  const suggest = () => {
    if (params.shotManual) return;
    const c = resolveCast(facts, params);
    params.shot = suggestShot(c.n, c.formationId, c.nature);
  };
  const entryOf = () => decisions?.variants?.[variant];
  // Seção Armadura / Equipamento: a loja vem do Armor Forge; o vínculo por carta e variante fica lá, nunca em cards.json.
  const armorProjects = () => Object.values(armorStore?.projects || {});
  const armorVersions = (id) => (armorStore && id ? latestVersions(armorStore, id) : []);
  const armorBinding = () => Object.values(armorStore?.bindings || {}).find((b) => b.card_id === cardId() && b.variant === variant);
  const bestVersion = (id) => { const list = armorVersions(id), project = armorStore?.projects?.[id]; return project?.canonical_version_id || [...list].reverse().find((v) => v.lock && v.status !== 'ARCHIVED')?.id || project?.head_version_id || ''; };
  function syncArmor() { params.armorDesign = armorForArt(armorStore, params.armorProject, params.armorVersion, params.armorAdjust); }
  function adoptBinding() {
    const bound = armorBinding();
    if (bound && (params.armorSource === 'auto' || params.armorSource === 'original')) Object.assign(params, {armorSource: 'original', armorProject: bound.project_id, armorVersion: bound.version_id, armorUse: bound.use, armorAdjust: bound.adjustments || '', armorType: bound.armor_type || params.armorType});
    syncArmor();
  }
  async function armorPost(op, payload) {
    try {
      const r = await fetch(`/api/armor-forge/${op}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      const data = await r.json();
      if (!r.ok) { say(data.erro || 'Não consegui gravar a armadura.', true); return null; }
      armorStore = data.store;
      return data;
    } catch { say('Não consegui gravar: abra o Card Forge pelo servidor local.', true); return null; }
  }
  const saveArmorBinding = () => { if (params.armorVersion && cardId()) return armorPost('binding', {card_id: cardId(), card_name: facts.name, variant, version_id: params.armorVersion, armor_type: params.armorType, adjustments: params.armorAdjust, use: params.armorUse}); return null; };
  async function loadArmorStore() {
    try { const r = await fetch('/api/armor-forge'); armorStore = r.ok ? await r.json() : null; } catch { armorStore = null; }
  }
  function armorRecord() {
    const choice = armorChoice(params);
    if (choice?.kind !== 'locked') return null;
    const same = Object.values(armorStore.generations).find((g) => g.version_id === params.armorVersion && g.mode === 'card_art' && g.card_id === cardId() && g.variant === variant && g.prompt === output().value);
    if (same) return Promise.resolve(same.id);
    return armorPost('generation', {version_id: params.armorVersion, mode: 'card_art', prompt: output().value, card_id: cardId(), card_name: facts.name, variant}).then((made) => made?.generation_id);
  }
  function armorSection(f, p, c, fold) {
    if (!c.active && c.nature !== 'equipment') return '';
    const source = p.armorSource || 'auto', family = (x) => armorStore.versions[x.head_version_id]?.lock?.family || armorStore.versions[x.head_version_id]?.spec?.fields?.family?.value || '';
    const usesArmor = p.generic && c.active && c.nature === 'character' && /armor|surplice/i.test(c.order?.en || '');
    const offer = usesArmor && (source === 'auto' || (source === 'original' && !p.armorProject)) ? `<p class="ap-warn ap-wide">Carta genérica de arquétipo que usa armadura: desenvolva a armadura antes do personagem. É opcional.<button type="button" data-armor="new">Desenvolver armadura original</button></p>` : '';
    const sourceField = select('armorSource', 'Armadura existente ou original', [['auto', 'Automático (como hoje)'], ['existing', 'Existente do catálogo'], ['original', 'Original (Armor Forge)'], ['none', 'Sem armadura']], source);
    if (source === 'existing') {
      const all = getCards().filter((x) => x.tipo === 'Equipment' && x.slot_equipamento === 'armadura').sort((a, b) => Number(b.faccao === f.faction) - Number(a.faccao === f.faction));
      return `<h3 class="ap-section">Armadura / Equipamento</h3>${offer}${sourceField}${select('armor', 'Armadura do catálogo', [['', 'Escolha'], ...all.map((x) => [clean(x.nome_exibicao_en), `${clean(x.nome_exibicao_en)} (${x.faccao})`])], p.armor)}`;
    }
    if (source !== 'original') return `<h3 class="ap-section">Armadura / Equipamento</h3>${offer}${sourceField}`;
    if (!armorStore) return `<h3 class="ap-section">Armadura / Equipamento</h3>${sourceField}<p class="ap-warn ap-wide">Armor Forge indisponível: reinicie o servidor do Card Forge.</p>`;
    const list = armorProjects().filter((x) => x.id === p.armorProject || ((!p.armorType || family(x) === p.armorType) && armorStore.versions[x.head_version_id]?.status !== 'ARCHIVED')).sort((a, b) => Number(b.faction === f.faction) - Number(a.faction === f.faction) || a.name.localeCompare(b.name));
    const versions = armorVersions(p.armorProject), v = armorStore.versions[p.armorVersion], ready = Boolean(p.armorDesign);
    const refs = ready ? p.armorDesign.references : [];
    const shots = v ? Object.values(armorStore.generations).filter((g) => g.version_id === v.id && g.image) : [], diverging = shots.filter((g) => consistencySummary(g).state === 'DIVERGENT').length, unchecked = shots.filter((g) => g.mode === 'card_art' && consistencySummary(g).state === 'UNCHECKED').length;
    const newer = versions.filter((x) => x.lock && x.status !== 'ARCHIVED' && v && x.number > v.number).pop();
    const statusText = !v ? 'Nenhuma armadura escolhida.' : `Status: ${v.status} (${STATE_LABELS[v.status]}), versão ${v.number}. ${!ready ? 'Arquivada: o prompt não usa esta armadura.' : !p.armorUse ? 'Marque abaixo para usar no prompt.' : p.armorDesign.draft ? 'O prompt usa o estado atual, sem aprovação: se a armadura mudar, o próximo prompt muda junto.' : 'O prompt incorpora o Design Lock.'}`;
    return `<h3 class="ap-section">Armadura / Equipamento</h3>${offer}${sourceField}
      ${select('armorType', 'Tipo de armadura', [['', 'Todos'], ...FAMILIES], p.armorType || '')}
      ${select('armorProject', 'Armadura vinculada', [['', 'Nenhuma'], ...list.map((x) => { const s = armorStore.versions[x.head_version_id]?.status; return [x.id, `${x.name} · ${x.faction} · ${s}`]; })], p.armorProject || '')}
      ${p.armorProject ? select('armorVersion', 'Versão da armadura', versions.map((x) => [x.id, `v${x.number} · ${x.status}`]), p.armorVersion) : ''}
      <p class="ap-note">${esc(statusText)}</p>
      ${newer ? `<p class="ap-note">Existe versão travada mais nova: v${newer.number}. A carta continua na versão escolhida até você trocar.</p>` : ''}
      ${diverging ? `<p class="ap-warn ap-wide">${diverging} imagem(ns) desta versão com divergência do lock: revise no Armor Forge.</p>` : ''}
      ${p.armorProject ? `<label class="ap-check ap-wide"><input type="checkbox" name="armorUse"${p.armorUse ? ' checked' : ''}${ready ? '' : ' disabled'}> Usar esta armadura na geração</label>
      <div class="ap-wide">${input('armorAdjust', 'Ajuste ao personagem (proporção, encaixe, articulação)', p.armorAdjust, 'Taller and leaner; same plates')}</div>` : ''}
      <div class="ap-wide ap-armor-actions"><button type="button" data-armor="new">Criar nova armadura</button>${p.armorProject ? '<button type="button" data-armor="edit">Editar projeto</button>' : ''}${ready && p.armorUse ? `<label>Registrar arte gerada no projeto<input type="file" data-armor-image accept="image/png,image/jpeg,image/webp"></label>` : ''}</div>
      ${p.armorProject ? fold('armor-refs', `Visualizar referências (${refs.length})`, refs.length ? `<div class="ap-wide ap-armor-refs">${refs.map((name) => `<a href="${imageUrl(name)}" target="_blank" rel="noopener" download><img src="${imageUrl(name)}" alt="Referência da armadura" loading="lazy"></a>`).join('')}</div><p class="ap-note">${ready && refs.length ? 'Anexe as referências junto do prompt, quando o gerador aceitar imagens.' : 'Sem referência aprovada: nada a anexar.'}${unchecked ? ` ${unchecked} arte(s) registrada(s) sem verificação visual.` : ''}</p>` : '<p class="ap-note">Sem imagens registradas.</p>') : ''}`;
  }
  function draw() {
    syncArmor();
    const f = facts, p = params, none = (t) => [['', t]], c = resolveCast(f, p), body = c.profile, nature = c.nature;
    const cast = nature === 'character' || nature === 'scene' || nature === 'domain', hasCount = nature === 'scene' || nature === 'domain';
    const groupBy = (list) => list.reduce((all, x) => ({...all, [x[0]]: [...(all[x[0]] || []), x.slice(1)]}), {});
    const creatures = groupBy(CREATURES.map((x) => [x.group, x.id, x.label]));
    const sourceTag = {original: ' (original do jogo)', adaptation: ' (adaptação)', canon: ''};
    const orders = groupBy(ORDERS.map((o) => [o.god || 'Outros', o.id, `${o.label}${sourceTag[o.source]}`]));
    const formations = FORMATIONS.filter((x) => x.id !== 'single' && ((c.n >= x.min && c.n <= x.max) || x.id === p.formation)).map((x) => [x.id, x.label]);
    const stances = CREATURE_POSES.filter((x) => !x.needs || body[x.needs]).map((x) => [x.label]);
    const scroll = dialog.scrollTop, focused = dialog.querySelector(':focus')?.name;
    const open = new Set([...dialog.querySelectorAll('details[open]')].map((d) => d.dataset.key));
    const fold = (key, title, content) => `<details class="ap-wide ap-fold" data-key="${key}"${open.has(key) ? ' open' : ''}><summary>${title}</summary><div class="ap-fields">${content}</div></details>`;
    const cl = classifyFacts(f), reviewed = decisions?.review?.status || 'pendente', entry = entryOf();
    const figureFields = c.active ? `<h3 class="ap-section">Personagens</h3>
      ${cast && hasCount ? select('count', 'Quantidade', [['0', '0: Nenhum'], ...COUNTS], p.count ?? '1') : nature === 'character' ? select('count', 'Quantidade', COUNTS, String(p.count ?? '1') === '0' ? '1' : p.count ?? '1') : ''}
      ${p.count === 'custom' && cast ? input('countCustom', 'Número exato', p.countCustom, 'Ex.: 12') : ''}
      ${select('role', 'Papel na arte', ROLES, p.role || '')}
      ${c.group ? `${select('formation', 'Formação', [['', `Automática: ${formationById(c.formationId)?.label || ''}`], ...formations, ['custom', 'Personalizada']], p.formation || '')}
      ${p.formation === 'custom' ? input('formationCustom', 'Formação personalizada', p.formationCustom, 'in a line along the cliff') : ''}
      ${select('variety', 'Variedade', VARIETIES, p.variety || 'same_class')}${select('lead', 'Protagonista ou liderança', [...none('Automático'), ...LEADS], p.lead || '')}` : ''}
      <p class="ap-note">Anatomia: ${esc(body.label)}</p>
      ${p.generic && body.ethnicity && !c.army && !c.mixed ? select('ethnicity', 'Etnia', ETHNICITIES, p.ethnicity) : ''}
      ${p.generic && body.hair && !c.army && !c.mixed ? select('hair', 'Cabelo', HAIRSTYLES, p.hair) : ''}
      ${body.trait && body.traits?.length ? select('traits', body.trait, [...none('Automático'), ...body.traits.map((t) => [t])], p.traits || '') : ''}
      ${body.humanMood ? select('expression', 'Expressão', EXPRESSIONS, p.expression) : select('creatureMood', 'Comportamento', CREATURE_MOODS.map((m) => [m]), p.creatureMood)}
      ${body.hands && nature !== 'divine' && p.armorSource !== 'none' ? `${select('handFinish', 'Partes livres dos dedos', HAND_FINISHES, p.handFinish || 'skin')}${input('lycraColor', 'Cor da lycra (vazio: automática)', p.lycraColor, 'Ex.: azul-marinho')}` : ''}
      ${input('special', 'Características especiais', p.special, 'Ex.: cicatriz no olho')}`
      : hasCount ? `<h3 class="ap-section">Personagens</h3>${select('count', 'Quantidade', [['0', '0: Nenhum'], ...COUNTS], p.count ?? '0')}` : '';
    const subject = `<h3 class="ap-section">Sujeito</h3>
      ${input('focus', 'Foco principal', p.focus, 'O que a imagem não pode perder')}
      ${c.active ? `${groupedSelect('order', 'Ordem ou arquétipo', [['', 'Automático pela carta'], ['custom', 'Personalizado']], p.order || '', orders)}
      ${nature === 'equipment' || nature === 'divine' ? '' : groupedSelect('creature', 'Tipo de personagem', CREATURE_CHOICES, p.creature || 'auto', creatures)}
      ${p.order === 'custom' ? input('orderCustom', 'Ordem personalizada', p.orderCustom, 'Ex.: Guarda do Farol') : ''}
      ${p.creature === 'custom' ? input('creatureCustom', 'Tipo personalizado', p.creatureCustom, 'Ex.: caranguejo colossal') : ''}
      ${nature === 'equipment' || nature === 'divine' ? '' : input('species', 'Subtipo ou espécie', p.species, 'Ex.: lobo das neves')}` : ''}
      ${f.isSelf || p.generic ? '' : select('person', 'Personagem', [...none('Sem personagem'), ...f.people.map((n) => [n])], p.person)}
      ${f.armors.length && (p.armorSource || 'auto') === 'auto' ? select('armor', 'Armadura', [...none('Sem armadura'), ...f.armors.map((a) => [a.name, `${a.name} (${a.line})`])], p.armor) : ''}
      ${p.generic ? '' : select('version', 'Base do design', VERSIONS, p.version)}
      ${f.faction === 'Artemis' ? select('artemisProfile', 'Perfil Artemis V2', [['auto', `Automático (${artemisProfileOf(f)?.label || 'só a facção'})`], ...ARTEMIS_PROFILES.map((x) => [x.id, x.label])], p.artemisProfile || 'auto') : ''}`;
    const modeFields = {
      scene: `<h3 class="ap-section">Cena</h3>${select('sceneType', 'Tipo de cena', SCENE_TYPES, p.sceneType)}${p.sceneType === 'custom' ? input('sceneCustom', 'Cena personalizada', p.sceneCustom, 'a coronation at sea') : ''}${select('sceneMoment', 'Momento cinematográfico', SCENE_MOMENTS, p.sceneMoment)}${select('sceneFocus', 'Foco da cena', SCENE_FOCI, p.sceneFocus)}`,
      technique: `<h3 class="ap-section">Técnica</h3>${select('effect', 'Tipo de efeito', EFFECTS, p.effect)}${p.effect === 'custom' ? input('effectCustom', 'Efeito personalizado', p.effectCustom, 'a rain of black feathers') : ''}${select('visible', 'Personagens visíveis', VISIBLE, p.visible)}${select('phase', 'Fase da técnica', PHASES, p.phase)}${select('origin', 'Origem do efeito', ORIGINS, p.origin)}${select('form', 'Forma visual', FORMS, p.form)}${select('intensity', 'Intensidade visual', INTENSITIES, p.intensity)}${['casters', 'targets', 'crowd'].includes(p.visible) ? select('count', 'Quantidade', COUNTS, p.count === '0' ? '3' : p.count) : ''}`,
      equipment: `<h3 class="ap-section">Objeto</h3>${select('objectKind', 'Tipo de objeto', OBJECT_KINDS, p.objectKind || 'auto')}${p.objectKind === 'custom' ? input('objectCustom', 'Objeto personalizado', p.objectCustom, 'a horn of hammered bronze') : ''}${select('presentation', 'Modo de apresentação', PRESENTATIONS, p.presentation)}${select('equipState', 'Estado do equipamento', EQUIP_STATES, p.equipState)}${select('support', 'Suporte ou ambientação', SUPPORTS, p.support)}${p.support === 'custom' ? input('supportCustom', 'Ambientação personalizada', p.supportCustom, 'a shrine under a waterfall') : ''}${select('bearer', 'Portador visível', BEARERS, p.bearer || 'auto')}`,
      domain: `<h3 class="ap-section">Ambiente</h3>${select('envType', 'Tipo de ambiente', ENV_TYPES, p.envType)}${p.envType === 'custom' ? input('envCustom', 'Ambiente personalizado', p.envCustom, 'a city on the back of a whale') : ''}${select('envState', 'Estado do ambiente', ENV_STATES, p.envState)}${select('envScale', 'Escala', ENV_SCALES, p.envScale)}${fold('env', 'Controles avançados do ambiente', Object.entries(ENV_EXTRAS).map(([key, [label, list]]) => select(key, label, list, p[key] || '')).join(''))}`,
      divine: `<h3 class="ap-section">Manifestação divina</h3>${select('manifestation', 'Manifestação', MANIFESTATIONS, p.manifestation)}${select('divineScale', 'Escala da manifestação', DIVINE_SCALES, p.divineScale)}`,
    }[nature] || '';
    dialog.innerHTML = `<form method="dialog" class="ap"><h2>Gerar arte: <span translate="no">${esc(f.name)}</span></h2>
    <p class="ap-suggest"><span>Sugestão: <strong>${esc(NATURES.find(([id]) => id === cl.nature)[1])}</strong>, confiança ${esc(cl.confidence)}. ${esc(cl.reason)} <em>Revisão: ${esc(reviewed)}.</em></span>
      <button type="button" data-review="aceita">Aceitar</button><button type="button" data-review="rejeitada">Rejeitar</button><button type="button" data-review="revisar-depois">Revisar depois</button></p>
    <div class="ap-grid"><div class="ap-fields">
      <label class="ap-check ap-wide"><input type="checkbox" name="generic"${p.generic ? ' checked' : ''}> Carta genérica: sem história no cânone, personagem original e sem referências</label>
      <div class="ap-wide">${select('nature', 'Natureza da arte', NATURES, p.nature || 'auto')}</div>
      ${select('god', 'Deus', [...none('Nenhum'), ...Object.keys(GODS).map((g) => [g])], p.god)}${select('epic', 'Grandiosidade', EPIC_LEVELS, p.epic)}${select('mode', 'Saída', [['director', 'Diretor de arte: Master + pedido'], ['image', 'Prompt direto de imagem']], p.mode)}
      ${subject}
      ${armorSection(f, p, c, fold)}
      ${modeFields}
      ${figureFields}
      <h3 class="ap-section">Composição</h3>
      ${select('shot', 'Plano', SHOTS, p.shot)}${select('angle', 'Ângulo', ANGLES, p.angle)}
      ${!c.active ? '' : !body.humanMood ? select('creaturePose', 'Postura da criatura', stances, p.creaturePose) : select('pose', c.group ? 'Pose do protagonista' : 'Pose', POSES, p.pose)}
      ${select('motion', 'Movimento', MOTIONS, p.motion)}
      <h3 class="ap-section">Estilo</h3>
      ${groupedSelect('style', 'Traço dominante', [], p.style)}${groupedSelect('accent', 'Traço complementar', none('Nenhum'), p.accent)}
      ${select('light', 'Luz', LIGHTS, p.light)}
      ${nature === 'equipment' ? '' : select('theme', 'Tema e cenário', THEMES, p.theme)}${p.generic ? '' : select('arc', 'Arco ou acontecimento', ARCS, p.arc)}
      ${nature === 'equipment' || nature === 'domain' ? '' : select('technique', 'Técnica em uso', [...none('Nenhuma'), ...f.techniques.map((t) => [t])], p.technique)}
      <h3 class="ap-section">Narrativa</h3>
      ${select('before', 'Acabou de acontecer', BEFORE, p.before)}${select('now', 'Está acontecendo', NOW, p.now)}${select('next', 'Vai acontecer', NEXT, p.next)}${select('viewer', 'O observador sente', VIEWER, p.viewer)}
      <div class="ap-wide">${input('notes', 'Observações', p.notes, 'Algo mais para a imagem')}</div>
      ${p.generic ? '' : `<label class="ap-check ap-wide"><input type="checkbox" name="usePowers"${p.usePowers ? ' checked' : ''}> Incluir poderes e keywords da carta</label>`}
    </div><div class="ap-side"><label class="ap-out">Prompt (pode editar)<textarea name="prompt" rows="20" spellcheck="false" translate="no"></textarea></label>
      <div class="ap-warnings">${warningHtml(f, p)}</div>
      <div class="ap-variant"><label>Variante de arte<select data-variant>${VARIANTS.map(([id, label]) => `<option value="${id}"${id === variant ? ' selected' : ''}>${esc(label)}${decisions?.variants?.[id] ? (decisions.variants[id].approved ? ' (aprovada)' : ' (salva)') : ''}</option>`).join('')}</select></label>
        <button type="button" data-ap="save">Salvar direção</button><button type="button" data-ap="approve">${entry?.approved ? 'Aprovada' : 'Aprovar direção'}</button></div>
    </div></div>
    <p class="hint">${armorChoice(p)?.references?.length ? `Anexe as ${armorChoice(p).references.length} referências aprovadas da armadura junto do prompt.` : p.generic ? 'Sem referência: é só colar o prompt direto no ChatGPT e pedir a imagem.' : 'Anexe as imagens de referência junto do prompt.'} O Master completo não cabe no link: o ChatGPT abre vazio e você cola o prompt, que já fica copiado.</p>
    <div class="row"><button type="button" data-ap="copy" class="primary">Copiar prompt</button><button type="button" data-ap="gpt">Abrir no ChatGPT</button>${nature === 'character' ? select('scope', 'Sortear', RANDOM_SCOPES, p.scope || 'all') : ''}<button type="button" data-ap="random">Randomizar</button><button type="button" data-ap="reset">Restaurar</button><button value="close">Fechar</button></div></form>`;
    refresh();
    if (savedPrompt) { output().value = savedPrompt; savedPrompt = ''; }
    dialog.scrollTop = scroll;
    if (focused) dialog.querySelector(`[name="${focused}"]`)?.focus();
  }
  let adjustTimer = null;
  const REDRAW = new Set(['nature', 'creature', 'order', 'count', 'formation', 'variety', 'shot', 'role', 'sceneType', 'sceneFocus', 'effect', 'visible', 'origin', 'objectKind', 'presentation', 'support', 'bearer', 'envType', 'manifestation', 'person']);
  dialog.addEventListener('input', (e) => {
    const {name, type, value, checked} = e.target;
    if (name === 'prompt' || !(name in params)) return;
    params[name] = type === 'checkbox' ? checked : value;
    if (name === 'generic') { params.mode = checked ? 'image' : 'director'; if (checked && !facts.isSelf) params.person = ''; return draw(); }
    if (name === 'creature' && value === 'random') params.creature = creaturePool(params.god)[Math.floor(Math.random() * creaturePool(params.god).length)].id;
    if (name === 'shot') params.shotManual = true;
    if (name === 'count' || name === 'formation' || name === 'countCustom' || name === 'nature' || name === 'visible') suggest();
    if (name === 'countCustom') { const shot = dialog.querySelector('[name=shot]'); if (shot) shot.value = params.shot; }
    if (name === 'scope') return;
    if (name === 'armorSource') { if (value !== 'original') { const bound = armorBinding(); if (bound) armorPost('binding-delete', {id: bound.id}).then(draw); } else if (params.armorProject) saveArmorBinding(); return draw(); }
    if (name === 'armorProject') { params.armorVersion = value ? bestVersion(value) : ''; params.armorUse = true; if (value) { saveArmorBinding()?.then?.(draw); } else { const bound = armorBinding(); if (bound) armorPost('binding-delete', {id: bound.id}).then(draw); } return draw(); }
    if (name === 'armorVersion' || name === 'armorUse') { saveArmorBinding(); return draw(); }
    if (name === 'armorType') return draw();
    if (name === 'armorAdjust') { syncArmor(); clearTimeout(adjustTimer); adjustTimer = setTimeout(saveArmorBinding, 500); return refresh(); }
    if (REDRAW.has(name)) return draw();
    if (name === 'notes') dialog.querySelector('.ap-warnings').innerHTML = warningHtml(facts, params);
    refresh();
  });
  dialog.addEventListener('change', async (e) => {
    if (e.target.matches('[data-armor-image]')) {
      const file = e.target.files[0], id = file && await armorRecord();
      if (!id) return;
      try {
        const r = await fetch(`/api/armor-forge/image/${encodeURIComponent(id)}`, {method: 'POST', body: file}), data = await r.json();
        if (!r.ok) return void say(data.erro || 'Imagem recusada.', true);
        armorStore = data.store;
        say('Arte registrada no projeto da armadura. A arte da carta não muda.');
        const shown = output().value; draw(); output().value = shown;
      } catch { say('Não consegui registrar a imagem.', true); }
      return;
    }
    if (!e.target.matches('[data-variant]')) return;
    variant = e.target.value;
    const entry = entryOf();
    params = entry ? restoreEntry(facts, entry) : params;
    adoptBinding();
    savedPrompt = entry?.prompt || '';
    draw();
  });
  async function saveEntry(extra = {}) {
    const id = cardId();
    try {
      const r = await fetch('/api/art-direction', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({card_id: id, variant, entry: savedEntry(facts, params, output().value), ...extra})});
      const data = await r.json();
      if (r.status === 409) return data;
      if (!r.ok) { say(data.erro || 'Não consegui salvar a direção de arte.', true); return null; }
      decisions = data.card;
      return data;
    } catch { say('Não consegui salvar: abra o Card Forge pelo servidor local.', true); return null; }
  }
  dialog.addEventListener('click', async (e) => {
    const review = e.target.closest('[data-review]')?.dataset.review;
    if (review) {
      try {
        const r = await fetch('/api/art-direction', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({card_id: cardId(), review: {status: review}})});
        const data = await r.json();
        if (!r.ok) return void say(data.erro || 'Não consegui gravar a revisão.', true);
        decisions = data.card;
        const shown = output().value;
        draw();
        output().value = shown;
        say(`Revisão gravada: ${review}.`);
      } catch { say('Não consegui gravar: abra o Card Forge pelo servidor local.', true); }
      return;
    }
    const armorAction = e.target.closest('[data-armor]')?.dataset.armor;
    // Ao voltar do editor, aprovação ou vínculo novo já aparecem no popup.
    const armorBack = async () => { await loadArmorStore(); adoptBinding(); draw(); };
    if (armorAction === 'new') return void openArmor(new URLSearchParams({new: '1', card: cardId() || '', name: facts.name, faction: facts.faction || ''}).toString(), armorBack);
    if (armorAction === 'edit') return void openArmor(new URLSearchParams({project: params.armorProject, version: params.armorVersion}).toString(), armorBack);
    const action = e.target.closest('[data-ap]')?.dataset.ap;
    if (!action) return;
    if (action === 'save' || action === 'approve') {
      const extra = action === 'approve' ? {approve: true} : {};
      let done = await saveEntry(extra);
      if (done?.conflict) {
        if (!window.confirm('Esta variante está aprovada. Substituir a direção aprovada?')) return void say('A direção aprovada ficou como estava.');
        done = await saveEntry({...extra, replace_approved: true});
      }
      if (!done || done.conflict) return;
      const shown = output().value;
      draw();
      output().value = shown;
      return void say(action === 'approve' ? 'Direção aprovada. A arte da carta não muda.' : 'Direção de arte salva.');
    }
    if (action === 'addfigure') { params.count = '1'; suggest(); draw(); return; }
    if (action === 'addsecond') { params.count = '2'; suggest(); draw(); return; }
    if (action === 'addcaster') { params.visible = 'caster'; draw(); return; }
    if (action === 'addbearer') { params.bearer = 'hands'; draw(); return; }
    if (action === 'nobearer') { params.bearer = 'none'; draw(); return; }
    if (action === 'reset') { params = defaultParams(facts); savedPrompt = ''; adoptBinding(); draw(); return; }
    if (action === 'random') { params = randomParams(facts, params, Math.random, params.scope || 'all'); draw(); return; }
    if (action === 'fixnotes') { params.notes = allowedNotes(params.notes); draw(); return; }
    if (action === 'solo') { params.count = '1'; suggest(); draw(); return; }
    if (action === 'shot') { params.shotManual = false; suggest(); draw(); return; }
    const copied = await copy();
    armorRecord();
    if (action === 'copy') return void say(copied ? 'Prompt copiado.' : 'Não consegui copiar: selecione o texto do prompt.', !copied);
    const url = `${GPT_URL}?q=${encodeURIComponent(output().value)}`, fits = url.length <= URL_LIMIT;
    window.open(fits ? url : GPT_URL, '_blank', 'noopener');
    say(fits ? 'ChatGPT aberto com o prompt.' : copied ? 'Prompt copiado: cole no ChatGPT.' : 'Copie o prompt e cole no ChatGPT.', !fits && !copied);
  });
  // O Armor Forge também pode estar aberto em outra aba: ao voltar, só redesenha se algo mudou.
  window.addEventListener('focus', async () => {
    if (!dialog.open) return;
    const before = JSON.stringify(armorStore);
    await loadArmorStore();
    if (JSON.stringify(armorStore) !== before) { adoptBinding(); draw(); }
  });
  return async () => {
    if (!master) {
      try { const r = await fetch(masterUrl); if (r.ok) master = await r.text(); } catch {}
      if (!master) say('Master Art Prompt não carregou: usando só o prompt direto.', true);
    }
    facts = cardFacts(getCard(), getCards());
    variant = 'default';
    decisions = null;
    try { const r = await fetch(`/api/art-direction?card=${encodeURIComponent(cardId())}`); if (r.ok) decisions = await r.json(); } catch {}
    const saved = decisions?.variants?.default;
    params = saved ? restoreEntry(facts, saved) : defaultParams(facts);
    savedPrompt = saved?.prompt || '';
    if (!master) params.mode = 'image';
    await loadArmorStore();
    adoptBinding();
    draw();
    dialog.showModal();
  };
}
