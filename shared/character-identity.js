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
