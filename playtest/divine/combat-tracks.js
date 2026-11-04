// Combat Composer: fases de uma coreografia. Só apresentação de um Strike que a engine já confirmou.
// [chave, nome, tipo]: efeito (pixel-vfx), hitstop (congela), knockback (recuo da carta) ou som. HIT é quando o golpe chega ao alvo.
export const COMBAT_TRACKS = [
  ['anticipation', 'Anticipation', 'efeito'], ['charge', 'Charge', 'efeito'], ['movement', 'Movement', 'efeito'], ['projectile', 'Projectile', 'efeito'], ['contact', 'Contact', 'efeito'],
  ['impact', 'Impact', 'efeito'], ['hitstop', 'Hit Stop', 'hitstop'], ['knockback', 'Knockback', 'knockback'], ['sound', 'Sound', 'som'], ['aftermath', 'Aftermath', 'efeito'],
];
export const ON_ATTACKER = ['anticipation', 'charge', 'movement'];
