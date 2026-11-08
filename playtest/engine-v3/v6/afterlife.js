// Afterlife (guia §40, autor 01/11/2026): ativada do Tartarus, com efeito próprio; depois de resolver, a carta vai para o Void.
// Fora de v6/hades.js e v6/ares.js porque a tabela é consultada só com a carta no Tartarus, sem misturar com os ganchos de campo.
import * as k from './kit.js';

const foe = (ability, effect) => ({
  check: (s, c, key) => { if (!k.enemies(s, c, key).length) throw new k.RuleError(ability, 'sem Devotee inimigo'); },
  run: (s, c, key) => { const uid = k.choose(c, key, ability, k.enemies(s, c, key), {text: 'Choose an enemy Devotee.'}); if (uid) effect(s, c, uid); },
});
const entry = (name, cost, body) => ({name, cost, ...body});

export const AFTERLIFE = {
  'hades-v6-220': entry('RESTLESS RETURN', 1, {run: (s, c, key) => k.gainSoul(s, key, 1)}), // Wandering Soul
  'hades-v6-217': entry('LAST MESSAGE', 2, {run: (s, c, key) => k.loseSoulOf(s, k.other(s, key), 1)}), // Dullahan Cube
  'hades-v6-215': entry('WITHERING PETALS', 2, foe('WITHERING PETALS', (s, c, uid) => k.buff(s, uid, -2, 0))), // Alraune Queen
  'hades-v6-216': entry('STONE GLARE', 2, foe('STONE GLARE', (s, c, uid) => k.exhaust(s, uid))), // Gorgon Ox
  'hades-v6-214': entry('FINAL AXE', 3, foe('FINAL AXE', (s, c, uid) => k.damage(s, c, uid, 2))), // Minotaur Gordon
  'hades-v6-221': entry('LAST CROSSING', 3, { // Styx Soul Herder
    check: (s, c, key, self) => { if (!herded(s, c, key, self).length) throw new k.RuleError('LAST CROSSING', 'sem Devotee de custo 2 ou menos no seu Tartarus'); },
    run: (s, c, key, self) => { const uid = k.choose(c, key, 'LAST CROSSING', herded(s, c, key, self), {text: 'Choose a Devotee in your Tartarus to return to your hand.'}); if (uid) k.toHand(s, c, uid, 'tartarus', self); },
  }),
  'ares-v6-330': entry('RAGE RETURNS', 3, {run: (s, c, key) => k.draw(s, key, 1)}), // Fuel the Rage
  // Disaster Legion Berserker (Anger, 08/11/2026): Devotees aliados ganham Impulse até o fim do turno (`impulseAll`, lido em play.js e strike.js).
  'ares-v6-293': entry('EMBERS OF DISASTER', 1, {run: (s, c, key) => {
    (s.impulseAll ||= {})[key] = s.turn;
    for (const u of k.devotees(s, c, key)) if (s.units[u]?.entered === s.turn) k.prepare(s, u);
  }}),
  'ares-v6-301': entry('LAST DESTRUCTION', 2, foe('LAST DESTRUCTION', (s, c, uid) => k.damage(s, c, uid, 2))), // Disaster Legion Destroyer
  'ares-v6-303': entry('BLOOD REMEMBERED', 2, { // Bloodstained Gladiator
    check: (s, c, key) => { if (!k.devotees(s, c, key).length) throw new k.RuleError('BLOOD REMEMBERED', 'sem Devotee aliado'); },
    run: (s, c, key) => { const uid = k.choose(c, key, 'BLOOD REMEMBERED', k.devotees(s, c, key), {text: 'Choose a friendly Devotee.'}); if (uid) k.buff(s, uid, 2, 0); },
  }),
};
const herded = (s, c, key, self) => s.players[key].tartarus.filter(u => u !== self && k.isDevotee(c, u) && k.costOf(c, u) <= 2);
