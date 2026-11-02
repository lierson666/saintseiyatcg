// Gerador de prompt de arte para o ChatGPT (autor, 02/11/2026), sobre o Master Art Prompt System V1.0 (art-master-prompt.md).
// Duas saídas: o sistema completo com o pedido da carta, para o GPT agir como diretor de arte, ou o prompt direto de imagem.
// No prompt direto o traço vem descrito, sem nome de ilustrador: o gerador de imagem costuma recusar nome de artista vivo.
import {printedKind} from '../shared/rules-policy.js';
import {formatCardTypeLine} from '../shared/equipment-types.js';

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
  pair('Pulling themselves up, hand gripping a broken column', 'se erguendo, mão numa coluna quebrada'), pair('Meditating cross-legged in the air, eyes closed, cosmo swirling', 'meditando no ar, Cosmo girando'),
];
// A pose inicial varia por carta (autor, 02/11/2026): com uma só, todas as artes saíam iguais, com a mão vindo para a câmera.
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
  Artemis: {title: 'nature and lunar power', setting: 'sacred forests, the moon, bows and arrows, vegetation, ancient temples', palette: 'green, silver, lunar white and natural tones', mood: 'precision, serenity, divine superiority, dangerous harmony', style: 'CLAMP', light: 5},
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
const START_ANGLES = ['Eye-level shot', 'Low-angle shot', 'High-angle shot', 'Dutch angle', 'Over-the-shoulder shot', 'Three-quarter front view', 'Profile view', 'Rear three-quarter view', 'Slight low angle', 'Slight high angle', 'Telephoto side view, flat perspective'];
const START_SHOTS = ['Medium Shot (MS)', 'Medium Full Shot (MFS)', 'Three-Quarter Shot', 'Full Body Shot (FBS)', 'Bust Shot', 'Waist-Up Portrait, centered', 'Cowboy Shot', 'Profile Medium Shot', 'Off-Center Medium Shot, figure on one third of the frame', 'Diagonal Full Body, figure along the diagonal of the frame', 'Long Shot (LS)'];
const pickBy = (seed, list) => list[[...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) % list.length]; // mesma carta, mesmo início
// O gerador puxa o braço para a câmera sozinho, ainda mais em ângulo baixo e com técnica: só proibir resolve.
const HANDS_RULE = 'HANDS AND ARMS: keep them in the plane of the figure, close to the body or out to the side. No arm reaching or fist punching toward the camera, no oversized foreshortened hand in the foreground.';
const NEGATIVE_HANDS = 'hand reaching toward the camera, fist punching toward the viewer, oversized foreshortened hand';
const NEGATIVE_GENERIC = 'existing anime characters, recognizable named characters, canon armor designs, extra characters, crowd, giant faces or ghostly figures in the background';
// Carta genérica (autor, 02/11/2026): sem história no cânone não há referência, então o prompt pede personagem original e não cita regras, que trazem outros personagens.
// O que está aqui é do cânone; o resto começa como genérico, e o autor troca na caixa do popup.
const CANON = new RegExp(`(^|[^A-Z])(${[
  'SEIYA', 'SHIRYU', 'HYOGA', 'SHUN', 'IKKI', 'MU', 'SAGA', 'AIOLIA', 'AIOLOS', 'CAMUS', 'MARIN', 'SHAINA', 'MISTY', 'ALGOL', 'ORPHEE', 'KIKI', 'CASSIOS', 'JABU', 'GEKI', 'ICHI', 'NACHI', 'BAN', 'JUNE', 'TATSUMI', 'MIHO', 'SEIKA', 'SHUNREI', 'ESMERALDA', 'GUILTY', 'BABEL', 'MOSES', 'ASTERION', 'JAMIAN', 'DANTE', 'SAORI', 'ATHENA',
  'PEGASUS', 'DRAGON', 'CYGNUS', 'ANDROMEDA', 'PHOENIX', 'ARIES', 'GEMINI', 'LEO', 'CANCER', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES', 'EAGLE', 'OPHIUCHUS', 'LIZARD', 'PERSEUS', 'LYRA', 'UNICORN', 'KAMUI',
  'KANON', 'SORRENTO', 'BAIAN', 'ISAAC', 'THETIS', 'JULIAN', 'SIREN', 'SEAHORSE', 'KRAKEN', 'MERMAID', 'POSEIDON', 'GALACTIC ILLUSION', 'DEAD END', 'RISING BILLOWS', 'VIKING TIGER', 'GOLDEN TRIANGLE', 'AURORA BOREALIS', 'GOD BREATH', 'PILLAR', 'UNDERSEA SANCTUARY',
  'RHADAMANTHYS', 'MINOS', 'AIACOS', 'WYVERN', 'GRIFFON', 'GARUDA', 'SPHINX', 'PHARAOH', 'ACHERON', 'CHARON', 'HYPNOS', 'THANATOS', 'PANDORA', 'SHION', 'HARPY', 'VALENTINE', 'BALRON', 'LUNE', 'PAPILLON', 'MYU', 'NIOBE', 'BASILISK', 'SYLPHID', 'MARKINO', 'FROG ZEROS', 'GIGANTO', 'RAIMI', 'GOLEM ROCK', 'TROLL IWAN', 'DEADLY BEETLE', 'PHLEGYAS', 'MINOTAUR GORDON', 'ALRAUNE', 'GORGON OX', 'DULLAHAN CUBE', 'DEATHMASK', 'APHRODITE', 'SHURA', 'SURPLICE', 'HADES', 'COCYTUS', 'ELYSION', 'FIRST PRISON',
  'BLACK SWAN', 'JANGO', 'SHO', 'DAICHI', 'USHIO', 'ASAMORI', 'GEIST', 'GHOST SAINT', 'CRYSTAL SAINT', 'OHKO', 'LEDA', 'SPICA', 'SHIVA', 'AGORA', 'ARACHNE', 'GIGAS', 'PHAETON', 'GALAXIAN', 'JAMIR', 'FIVE OLD PEAKS', 'TWELVE', 'SANCTUARY GATES', 'GRAAD', 'DEATH QUEEN', 'STEEL CLOTH',
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
    people: [...new Set([...(wearer ? [wearer] : []), ...faction])], person: isSelf ? name : isSpell ? caster || '' : '', // Equipment e Domain: só com personagem se o autor pedir (seção 10)
    techniques: [...new Set([...(isSpell ? [name] : []), ...powers.map((p) => p.name).filter((n) => n && !/^resonance\b/i.test(n))])],
  };
}

export function defaultParams(f) {
  const god = GODS[f.faction], scene = f.kind === 'Domain', object = f.kind === 'Equipment';
  return {
    mode: f.generic ? 'image' : 'director', generic: f.generic, version: '', god: god ? f.faction : '', person: f.person, armor: f.armors[0]?.name || '', technique: f.isSpell ? f.name : '', arc: '', theme: '',
    epic: f.kind === 'God' ? '5' : EPIC_BY_RARITY[f.rarity] || '3',
    shot: scene ? 'Wide Environmental Shot' : object ? SHOTS[6][0] : pickBy(`${f.name} shot`, START_SHOTS), angle: pickBy(`${f.name} angle`, START_ANGLES), pose: pickBy(`${f.name} pose`, START_POSES), motion: f.isSelf || f.isSpell ? MOTIONS[1][0] : '',
    expression: EXPRESSIONS[0][0], style: styleWith(god?.style || 'Araki'), accent: '', light: LIGHTS[god?.light ?? 0][0], before: '', now: '', next: '', viewer: '', usePowers: true, notes: '',
  };
}

// Sorteia a direção de arte. Personagem, armadura, deus e técnica de Moment/Technique vêm da carta e ficam como estão.
const RANDOM_LISTS = {version: VERSIONS, epic: EPIC_LEVELS, shot: SHOTS, angle: ANGLES, pose: POSES, motion: MOTIONS, expression: EXPRESSIONS, style: STYLES, accent: STYLES, light: LIGHTS, theme: THEMES, arc: ARCS, before: BEFORE, now: NOW, next: NEXT, viewer: VIEWER};
export function randomParams(f, p, rand = Math.random) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const out = {...p};
  for (const [key, list] of Object.entries(RANDOM_LISTS)) out[key] = pick(list)[0];
  if (out.accent === out.style) out.accent = '';
  if (p.generic) out.theme = pick(GENERIC_THEMES)[0];
  if (!f.isSpell) out.technique = pick(['', ...f.techniques]);
  return out;
}

function genericSubject(f, p, army) {
  const original = 'Invent the design from the card name and the faction; it is not based on any existing character or armor.';
  if (f.kind === 'Equipment') return `${f.name} (${f.typeLine}), an original sacred object alone, with no wearer. ${original} Show its structure and materials clearly.`;
  if (f.kind === 'Domain') return `${f.name}, an original place, with no characters. ${original}`;
  if (f.isSelf) return `${f.name}, an original ${f.creature ? 'creature' : 'character'} created for this card, ${army}. ${original} Exactly one figure in the image: no other characters, no faces or giant figures in the background.`;
  return `${f.name}, an original scene created for this card, told by the environment and the energy, with at most one anonymous figure. ${original}`;
}

export function buildImagePrompt(f, p) {
  const generic = p.generic, god = GODS[p.god], person = p.person, figure = person && !(generic && (f.creature || !f.isSelf)), isEquipment = f.kind === 'Equipment', power = f.powers.find((x) => x.name === p.technique), epic = EPIC_LEVELS.find(([v]) => v === p.epic);
  const subject = generic ? genericSubject(f, p, god ? `serving ${p.god}` : 'an independent warrior') : person
    ? `${person}${isEquipment ? `, wearing ${f.name} (${f.typeLine})` : p.armor ? `, wearing ${p.armor}` : ''}. Match the attached reference images: face, hair, eyes, armor, ornaments, helmet and characteristic colors. Do not invent armor changes.`
    : isEquipment ? `${f.name} (${f.typeLine}) alone as a sacred object, with no wearer; show its structure and materials clearly and preserve the symbols, colors and geometry of the attached reference images.`
      : f.kind === 'Domain' ? `${f.name}, as a place, with no characters.` : `${f.name}, as an event, with no main character.`;
  const story = [p.before && `Just happened: ${p.before}.`, p.now && `Happening now: ${p.now}.`, p.next && `About to happen: ${p.next}.`, p.viewer && `The viewer must feel: ${p.viewer}.`].filter(Boolean).join(' ');
  const body = [
    `Vertical 3:4 high-resolution illustration for ${generic ? 'a mythological anime trading card, in a world of sacred armors and Greek gods' : 'a Saint Seiya trading card'}. Illustration only: no card frame, no text, no names, no logos, no numbers, no stats, no interface symbols, no watermarks.`,
    `CARD: ${f.name}${f.subtitle ? ` — "${f.subtitle}"` : ''} (${f.typeLine || f.kind}, ${f.rarity || 'Common'}).`,
    `CARD TYPE DIRECTION: ${f.creature ? 'The creature is the main focal point, with a clear readable silhouette.' : (generic && GENERIC_RULES[f.kind]) || TYPE_RULES[f.kind] || TYPE_RULES.Devotee}`,
    `SUBJECT: ${subject}`,
    `ART STYLE (top priority for the whole image: line, shading, color treatment and rendering): ${p.style}.${p.accent ? ` Complementary finish: ${p.accent}.` : ''}`,
    !generic && p.version && `DESIGN CANON: costume and armor shapes follow ${p.version}, only as design. Draw them in the ART STYLE above, not in the look of that version.`,
    !generic && 'REFERENCES: reference images are attached to this prompt. Use them only for character identity and armor design (face, hair, silhouette, parts, colors); follow them over any written description of those. Do not copy their drawing style, line or shading: redraw everything in the ART STYLE.',
    god && `FACTION IDENTITY: ${p.god}, ${god.title}. Palette identity, not monochrome: ${god.palette}. Feeling: ${god.mood}.`,
    `SETTING: ${p.theme || (god ? god.setting : generic ? 'an epic mythological setting' : 'an epic mythological setting from the Saint Seiya universe')}.${p.arc && !generic ? ` Inspired by: ${p.arc}.` : ''}`,
    story && `STORY: ${story}`,
    `FRAMING: ${p.shot}. CAMERA: ${p.angle}.${figure ? ` POSE: ${p.pose}.` : ''}${p.motion ? ` MOTION: ${p.motion}.` : ''}`,
    figure && 'FACE PLACEMENT, 7/10 RULE (mandatory): place the eyes at about 7/10 of the image height measured from the bottom, never above that line, in the central part of the image and away from the edges. Keep the top free for card interface without hiding the face.',
    figure && `EXPRESSION: ${p.expression}.`,
    figure && HANDS_RULE,
    'COMPOSITION: card interface may cover parts of the image, so concentrate the most important elements in the central region and keep a silhouette readable at small size.',
    figure && 'ANATOMY: exactly five fingers on each visible hand; no duplicate limbs; coherent joints, hands, feet and neck; the armor follows the body correctly.',
    p.technique && `TECHNIQUE IN USE: ${p.technique}${power && !generic ? ` — ${power.text}` : ''}. Show its origin, trajectory and consequence visually with cosmo energy; no written effects.`,
    `LIGHTING: ${p.light}.`,
    epic && `EPIC LEVEL ${epic[0]} OF 5: ${epic[2]}, without hurting character fidelity or card legibility.`,
    !generic && p.usePowers && f.powers.length ? `POWERS TO EVOKE (visual inspiration, do not write them): ${f.powers.slice(0, 4).map((x) => x.name ? `${x.name}: ${x.text}` : x.text).join(' | ')}` : '',
    !generic && p.usePowers && f.keywords.length ? `KEYWORDS: ${f.keywords.join(', ')}.` : '',
    f.flavour && `MOOD LINE: ${f.flavour}`,
    clean(p.notes) && `NOTES: ${clean(p.notes)}`,
  ].filter(Boolean).join('\n');
  return `${body}\n\nNEGATIVE PROMPT: ${figure ? `${(generic ? NEGATIVE_FIGURE.replace(', incorrect character design', '') : NEGATIVE_FIGURE)}, ${NEGATIVE_HANDS}, ` : ''}${generic ? `${NEGATIVE_GENERIC}, ${NEGATIVE_ALWAYS.replace('inaccurate armor, ', '')}` : NEGATIVE_ALWAYS}.`;
}

// Sistema completo: o GPT recebe o Master, trata o que veio escolhido como decisão do autor e responde no formato da seção 12.
export const buildDirectorPrompt = (master, f, p) => `${master.trim()}\n\n---\nSOLICITAÇÃO DE ARTE\nExecute o processo da seção 11 para a carta abaixo e responda no formato obrigatório da seção 12. Não gere a imagem. Os parâmetros são decisões do autor; desenvolva-os com especificidade. Onde a narrativa estiver em branco, proponha a cena. ${p.generic ? 'Esta carta é genérica e não tem imagens de referência: crie um design original, sem usar personagens, armaduras ou fatos do cânone.' : 'As imagens de referência vão anexadas a esta mensagem: analise-as na Etapa 2.'}\n\n${buildImagePrompt(f, p)}`;

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const select = (name, label, opts, value) => `<label>${label}<select name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t ?? v)}</option>`).join('')}</select></label>`;
const groupedSelect = (name, label, first, value) => `<label>${label}<select name="${name}">${first.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}${Object.entries(STYLE_GROUPS).map(([group, opts]) => `<optgroup label="${esc(group)}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
const input = (name, label, value, placeholder = '') => `<label>${label}<input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
const GPT_URL = 'https://chatgpt.com/';
const URL_LIMIT = 7000; // acima disso o link pode falhar: o GPT abre vazio e o prompt fica copiado

export function mountArtPrompt(dialog, {getCard, getCards, say, masterUrl}) {
  let facts, params, master = '';
  const output = () => dialog.querySelector('textarea[name=prompt]');
  const text = () => (params.mode === 'director' && master ? buildDirectorPrompt(master, facts, params) : buildImagePrompt(facts, params));
  const refresh = () => { output().value = text(); };
  async function copy() {
    const value = output().value;
    try { await navigator.clipboard.writeText(value); return true; } catch {}
    output().select(); // dentro do iframe do Star Hill a área de transferência pode ser negada
    try { return document.execCommand('copy'); } catch { return false; }
  }
  function draw() {
    const f = facts, p = params, none = (t) => [['', t]];
    dialog.innerHTML = `<form method="dialog" class="ap"><h2>Gerar arte: <span translate="no">${esc(f.name)}</span></h2><div class="ap-grid"><div class="ap-fields">
      <label class="ap-check ap-wide"><input type="checkbox" name="generic"${p.generic ? ' checked' : ''}> Carta genérica: sem história no cânone, personagem original e sem referências</label>
      <div class="ap-wide">${select('mode', 'Saída', [['director', 'Diretor de arte: Master completo + pedido da carta'], ['image', 'Prompt direto de imagem']], p.mode)}</div>
      ${f.isSelf || p.generic ? '' : select('person', 'Personagem', [...none('Sem personagem'), ...f.people.map((n) => [n])], p.person)}
      ${f.armors.length ? select('armor', 'Armadura', [...none('Sem armadura'), ...f.armors.map((a) => [a.name, `${a.name} (${a.line})`])], p.armor) : ''}
      ${select('god', 'Deus', [...none('Nenhum'), ...Object.keys(GODS).map((g) => [g])], p.god)}${p.generic ? '' : select('version', 'Base do design', VERSIONS, p.version)}
      ${select('epic', 'Grandiosidade', EPIC_LEVELS, p.epic)}${select('technique', 'Técnica em uso', [...none('Nenhuma'), ...f.techniques.map((t) => [t])], p.technique)}
      ${select('shot', 'Plano', SHOTS, p.shot)}${select('angle', 'Ângulo', ANGLES, p.angle)}
      ${select('pose', 'Pose', POSES, p.pose)}${select('expression', 'Expressão', EXPRESSIONS, p.expression)}
      ${select('motion', 'Movimento', MOTIONS, p.motion)}${select('light', 'Luz', LIGHTS, p.light)}
      ${groupedSelect('style', 'Traço dominante', [], p.style)}${groupedSelect('accent', 'Traço complementar', none('Nenhum'), p.accent)}
      ${select('theme', 'Tema e cenário', THEMES, p.theme)}${p.generic ? '' : select('arc', 'Arco ou acontecimento', ARCS, p.arc)}
      ${select('before', 'Acabou de acontecer', BEFORE, p.before)}${select('now', 'Está acontecendo', NOW, p.now)}${select('next', 'Vai acontecer', NEXT, p.next)}${select('viewer', 'O observador sente', VIEWER, p.viewer)}
      <div class="ap-wide">${input('notes', 'Observações', p.notes, 'Algo mais para a imagem')}</div>
      ${p.generic ? '' : `<label class="ap-check ap-wide"><input type="checkbox" name="usePowers"${p.usePowers ? ' checked' : ''}> Incluir poderes e keywords da carta</label>`}
    </div><label class="ap-out">Prompt (pode editar)<textarea name="prompt" rows="20" spellcheck="false" translate="no"></textarea></label></div>
    <p class="hint">${p.generic ? 'Sem referência: é só colar o prompt direto no ChatGPT e pedir a imagem.' : 'Anexe as imagens de referência junto do prompt.'} O Master completo não cabe no link: o ChatGPT abre vazio e você cola o prompt, que já fica copiado.</p>
    <div class="row"><button type="button" data-ap="copy" class="primary">Copiar prompt</button><button type="button" data-ap="gpt">Abrir no ChatGPT</button><button type="button" data-ap="random">Randomizar</button><button type="button" data-ap="reset">Restaurar</button><button value="close">Fechar</button></div></form>`;
    refresh();
  }
  dialog.addEventListener('input', (e) => {
    const {name, type, value, checked} = e.target;
    if (name === 'prompt' || !(name in params)) return;
    params[name] = type === 'checkbox' ? checked : value;
    if (name === 'generic') { params.mode = checked ? 'image' : 'director'; if (checked && !facts.isSelf) params.person = ''; return draw(); }
    refresh();
  });
  dialog.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-ap]')?.dataset.ap;
    if (!action) return;
    if (action === 'reset') { params = defaultParams(facts); draw(); return; }
    if (action === 'random') { params = randomParams(facts, params); draw(); return; }
    const copied = await copy();
    if (action === 'copy') return void say(copied ? 'Prompt copiado.' : 'Não consegui copiar: selecione o texto do prompt.', !copied);
    const url = `${GPT_URL}?q=${encodeURIComponent(output().value)}`, fits = url.length <= URL_LIMIT;
    window.open(fits ? url : GPT_URL, '_blank', 'noopener');
    say(fits ? 'ChatGPT aberto com o prompt.' : copied ? 'Prompt copiado: cole no ChatGPT.' : 'Copie o prompt e cole no ChatGPT.', !fits && !copied);
  });
  return async () => {
    if (!master) {
      try { const r = await fetch(masterUrl); if (r.ok) master = await r.text(); } catch {}
      if (!master) say('Master Art Prompt não carregou: usando só o prompt direto.', true);
    }
    facts = cardFacts(getCard(), getCards());
    params = defaultParams(facts);
    if (!master) params.mode = 'image';
    draw();
    dialog.showModal();
  };
}
