// Ajuste das partículas da partida pelo editor (Star Hill): quantidade, tamanho, duração, cor e ligar/desligar por grupo.
// Sem ajuste salvo, o jogo chama o fx direto e nada muda. Só apresentação: a engine não vê nada disto.
export const PARTICLE_GROUPS = [
  ['strikeVfx', 'Golpe: carga e disparo', 'O Strike sai do atacante'],
  ['impact', 'Golpe: impacto', 'O golpe chega ao alvo'],
  ['assinatura-meteor', 'Pegasus Ryuseiken', 'Golpe com assinatura da carta 001'],
  ['assinatura-dragon', 'Rozan Shoryuha', 'Golpe com assinatura da carta 003'],
  ['recuo', 'Recuo da carta', 'A carta pisca e recua ao levar o golpe. Tamanho é a distância; duração é o tempo'],
  ['base_placed', 'Base colocada', 'Uma carta vira Base'],
  ['cosmo_spent', 'Cosmo gasto', 'O jogador paga Cosmo'],
  ['latent_gained', 'Cosmo Latente ganho', 'Ganha Latent'],
  ['card_played', 'Carta jogada', 'A carta sai da mão'],
  ['spell_resolved', 'Magia resolvida', 'O efeito da carta resolve'],
  ['destroyed', 'Carta destruída', 'Uma carta vai para o Tartarus'],
  ['awaken_changed', 'Awaken', 'O God entra em Awaken'],
  ['divine_power', 'Poder Divino', 'O God usa o poder'],
  ['domain_power', 'Poder de Domínio', 'O Domínio é usado'],
  ['seal_added', 'Seal', 'Uma carta recebe Seal'],
  ['defeat_prevented', 'Derrota evitada', 'Um efeito impede a derrota'],
  ['ultimate_announced', 'Ultimate anunciada', 'O God anuncia a Ultimate'],
  ['ultimate_resolved', 'Ultimate resolvida', 'A Ultimate acontece'],
  ['resolved', 'Efeito resolvido', 'A habilidade resolve'],
  ['morte-athena', 'Morte de Athena', 'O God cai'],
  ['morte-poseidon', 'Morte de Poseidon', 'O God cai'],
  ['morte-hades', 'Morte de Hades', 'O God cai'],
  ['morte-ares', 'Morte de Ares', 'O God cai'],
  ['morte-artemis', 'Morte de Artemis', 'O God cai'],
];

// Quando o chamador não informa o valor, vale o mesmo padrão de scene.js.
export function tunedFx(f, tune) {
  if (!tune) return f;
  const count = tune.quantidade ?? 1, size = tune.tamanho ?? 1, time = tune.duracao ?? 1, color = tune.cor || null;
  const paint = o => (color ? {...o, color} : o);
  if (tune.ligado === false) {
    const quiet = async () => {};
    return {burst: quiet, charge: quiet, shockwave: quiet, flash: quiet, beam: quiet, projectile: quiet, shake: quiet, punch: quiet};
  }
  return {
    burst: (x, y, o = {}) => f.burst(x, y, paint({...o, count: Math.round((o.count ?? 60) * count), size: (o.size ?? 12) * size, life: (o.life ?? .7) * time})),
    charge: (x, y, o = {}) => f.charge(x, y, paint({...o, count: Math.round((o.count ?? 50) * count), radius: (o.radius ?? 140) * size, life: (o.life ?? .45) * time})),
    shockwave: (x, y, o = {}) => f.shockwave(x, y, paint({...o, size: (o.size ?? 220) * size, duration: (o.duration ?? .45) * time})),
    flash: (intensity = .35) => f.flash(Math.min(1, intensity * size)),
    beam: (from, to, o = {}) => f.beam(from, to, paint({...o, width: (o.width ?? 18) * size, duration: (o.duration ?? .28) * time})),
    projectile: (from, to, o = {}) => f.projectile(from, to, paint({...o, size: (o.size ?? 16) * size, duration: (o.duration ?? .3) * time, trail: (o.trail ?? 3) * count})),
    shake: amp => f.shake(amp * size),
    punch: amount => f.punch(amount * size),
  };
}
