// Identidade de personagem (G3-029): o personagem canônico da carta, separado do ID da carta.
// Arte, subtítulo, Cloth, versão (V1/V2) ou reimpressão não criam identidade nova; cartas de personagens
// diferentes nunca se fundem. A tabela é explícita, conferida registro a registro no snapshot D268
// (nome impresso + tipo); não é derivada removendo palavras do título.
// `null`: Devotee genérico, sem personagem canônico confirmado (lacuna sinalizada, não um palpite).
// Cartas fora da tabela também são lacuna: `characterOf` lança, não inventa.

export const CHARACTER_IDENTITY = Object.freeze({
  'athena-v6-001': 'seiya', // PEGASUS SEIYA
  'athena-v6-003': 'shiryu', // DRAGON SHIRYU
  'athena-v6-005': 'hyoga', // CYGNUS HYOGA
  'athena-v6-007': 'shun', // ANDROMEDA SHUN
  'athena-v6-009': 'ikki', // PHOENIX IKKI
  'athena-v6-011': 'mu', // ARIES MU
  'athena-v6-013': 'saga', // GEMINI SAGA
  'athena-v6-015': 'aiolia', // LEO AIOLIA
  'athena-v6-017': 'camus', // AQUARIUS CAMUS
  'athena-v6-021': 'marin', // EAGLE MARIN
  'athena-v6-022': 'shaina', // OPHIUCHUS SHAINA
  'athena-v6-023': 'misty', // LIZARD MISTY
  'athena-v6-024': 'algol', // PERSEUS ALGOL
  'athena-v6-025': 'orphee', // LYRA ORPHEE
  'athena-v6-026': 'kiki', // KIKI, APPRENTICE OF JAMIR
  'athena-v6-027': 'cassios', // CASSIOS, THE FALLEN RIVAL
  'athena-v6-028': 'jabu', // UNICORN JABU
  'athena-v6-029': 'geki', // BEAR GEKI
  'athena-v6-030': 'ichi', // HYDRA ICHI
  'athena-v6-031': 'nachi', // WOLF NACHI
  'athena-v6-032': 'ban', // LIONET BAN
  'athena-v6-033': 'june', // CHAMELEON JUNE
  'athena-v6-034': 'tatsumi', // TATSUMI, SAORI’S GUARDIAN
  'athena-v6-035': 'miho', // MIHO, THE ORPHANAGE CARETAKER
  'athena-v6-036': 'seika', // SEIKA, THE LOST SISTER
  'athena-v6-037': 'shunrei', // SHUNREI, THE PRAYER OF ROZAN
  'athena-v6-038': 'esmeralda', // ESMERALDA, THE FORGOTTEN LOVE
  'athena-v6-039': 'guilty', // GUILTY, MASTER OF DEATH QUEEN ISLAND
  'athena-v6-040': null, // SANCTUARY GUARD (genérico)
  'athena-v6-041': null, // SANCTUARY HEALER (genérico)
  'athena-v6-042': null, // JAMIR CLOTH REPAIRER (genérico)
  'athena-v6-043': null, // STAR HILL ACOLYTE (genérico)
  'athena-v6-071': 'babel', // CENTAUR BABEL
  'athena-v6-072': 'moses', // WHALE MOSES
  'athena-v6-073': 'asterion', // HOUND ASTERION
  'athena-v6-074': 'jamian', // CROW JAMIAN
  'athena-v6-075': 'dante', // CERBERUS DANTE
  // Cartas da etapa 1 (shared/preview-cards.js), 01/11/2026: só personagens nomeados das classes lendárias
  // (Marinas, Specters, Saints, Berserkers, Satellites). Soldados genéricos ficam fora e podem repetir (guia §63).
  'poseidon-v6-091': 'kanon', // SEA DRAGON KANON
  'poseidon-v6-093': 'sorrento', // SIREN SORRENTO
  'poseidon-v6-095': 'baian', // SEAHORSE BAIAN
  'poseidon-v6-097': 'isaac', // KRAKEN ISAAC
  'poseidon-v6-099': 'thetis', // MERMAID THETIS
  'hades-v6-181': 'rhadamanthys', // WYVERN RHADAMANTHYS
  'hades-v6-183': 'minos', // GRIFFON MINOS
  'hades-v6-185': 'aiacos', // GARUDA AIACOS
  'hades-v6-187': 'pharaoh', // SPHINX PHARAOH
  'hades-v6-189': 'charon', // ACHERON CHARON
  'hades-v6-197': 'shion', // ARIES SHION, THE RESURRECTED SAINT
  'hades-v6-201': 'valentine', // HARPY VALENTINE
  'hades-v6-202': 'lune', // BALRON LUNE
  'hades-v6-203': 'myu', // PAPILLON MYU
  'hades-v6-204': 'niobe', // DEEP NIOBE
  'hades-v6-205': 'sylphid', // BASILISK SYLPHID
  'hades-v6-207': 'zeros', // FROG ZEROS
  'hades-v6-208': 'giganto', // CYCLOPS GIGANTO
  'hades-v6-209': 'raimi', // WORM RAIMI
  'hades-v6-210': 'rock', // GOLEM ROCK
  'hades-v6-211': 'iwan', // TROLL IWAN
  'hades-v6-212': 'stand', // DEADLY BEETLE STAND
  'hades-v6-213': 'phlegyas', // LYCAON PHLEGYAS
  'hades-v6-214': 'gordon', // MINOTAUR GORDON
  'hades-v6-215': 'queen', // ALRAUNE QUEEN
  'hades-v6-216': 'ox', // GORGON OX
  'hades-v6-217': 'cube', // DULLAHAN CUBE
  'hades-v6-251': 'deathmask', // CANCER DEATHMASK
  'hades-v6-252': 'aphrodite', // PISCES APHRODITE, THE RESURRECTED SAINT
  'hades-v6-253': 'shura', // CAPRICORN SHURA, THE RESURRECTED SAINT
  'hades-v6-254': 'camus', // AQUARIUS CAMUS
  'hades-v6-255': 'saga', // GEMINI SAGA, THE RESURRECTED SAINT
  'ares-v6-271': 'alcmenes', // ETHON ALCMENES
  'ares-v6-273': 'ofir', // OUROBOROS OFIR
  'ares-v6-275': 'lior', // LAMASSU LIOR
  'ares-v6-277': 'lotis', // LAMIA LOTIS
  'ares-v6-279': 'iseu', // ISEU OF PYTHON
  'ares-v6-281': 'catreu', // CATREU OF AKEPHALOS
  'ares-v6-283': 'alceu', // ALCEU OF LAMASSU
  'ares-v6-285': 'arionte', // ARIONTE OF ANFISTA
  'ares-v6-287': 'basil', // BASIL OF MANTICORE
  'artemis-v6-361': 'calisto', // CALISTO
  'artemis-v6-363': 'la-scoumoune', // LA SCOUMOUNE
  'artemis-v6-375': 'first-moon-guardian', // THE FIRST MOON GUARDIAN
  // Anjos Celestes (Artemis V2.0): lendários desde 06/11/2026 (guia §63).
  'artemis-v6-431': 'theseus', // THESEUS, CELESTIAL ANGEL
  'artemis-v6-433': 'touma', // ICARUS (TOUMA), CELESTIAL ANGEL
  'artemis-v6-435': 'odysseus', // ODYSSEUS, CELESTIAL ANGEL
  'artemis-v6-437': 'second-moon-guardian', // THE SECOND MOON GUARDIAN
  'artemis-v6-438': 'third-moon-guardian', // THE THIRD MOON GUARDIAN
  'artemis-v6-439': 'fourth-moon-guardian', // THE FOURTH MOON GUARDIAN
  'artemis-v6-440': 'fifth-moon-guardian', // THE FIFTH MOON GUARDIAN
  'neutral-v6-451': 'black-pegasus', // BLACK PEGASUS
  'neutral-v6-452': 'black-dragon', // BLACK DRAGON
  'neutral-v6-453': 'black-swan', // BLACK SWAN
  'neutral-v6-454': 'black-andromeda', // BLACK ANDROMEDA
  'neutral-v6-455': 'black-phoenix', // BLACK PHOENIX
  'neutral-v6-456': 'jango', // JANGO
  'neutral-v6-461': 'sho', // SHO, SKY STEEL SAINT
  'neutral-v6-462': 'daichi', // DAICHI, LAND STEEL SAINT
  'neutral-v6-463': 'ushio', // USHIO, MARINE STEEL SAINT
  'neutral-v6-471': 'geist', // GEIST, PHANTOM QUEEN
  'neutral-v6-472': 'dolphin-ghost', // DOLPHIN GHOST SAINT
  'neutral-v6-473': 'sea-serpent-ghost', // SEA SERPENT GHOST SAINT
  'neutral-v6-474': 'jellyfish-ghost', // JELLYFISH GHOST SAINT
  'neutral-v6-481': 'crystal-saint', // CRYSTAL SAINT
  'neutral-v6-483': 'leda', // LEDA, CHAIN WARRIOR
  'neutral-v6-484': 'spica', // SPICA, CHAIN WARRIOR
  'neutral-v6-485': 'shiva', // SHIVA, PEACOCK SAINT
  'neutral-v6-486': 'agora', // AGORA, LOTUS SAINT
  'neutral-v6-487': 'arachne', // ARACHNE, TARANTULA SAINT
});

export class IdentityGap extends Error {
  constructor(cardId) { super(`G3-029: identidade de personagem não confirmada para ${cardId}`); this.cardId = cardId; }
}

// `table`: tabela extra (ex.: reimpressão aprovada, ou fixture de teste rotulada) por cima da canônica.
export function characterOf(cardId, table = null) {
  const id = cardId.toLowerCase();
  const found = table && Object.hasOwn(table, id) ? table[id] : CHARACTER_IDENTITY[id];
  if (found == null) throw new IdentityGap(id);
  return found;
}
