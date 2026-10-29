// Efeitos V6 de Athena que a tabela por número (effects.js) não cobre. Ids sem colisão com effects.js.
// Texto: card-forge/art-web/cards.json (habilidades_en).
import * as k from './kit.js';
import {addSeal} from '../core.js';
import {shield} from '../effects.js';

const sealed = (s, uid) => (s.units[uid]?.seal || 0) > 0;

export default {
  // Cygnus Hyoga
  'athena-v6-005': {
    // Diamond Dust: uma vez por rodada, dano de Strike a Devotee inimigo põe 1 Seal nele.
    combatDamage: (s, c, key, self, victim) => !s.roundUses.has(`${self}:diamond-dust`) && (st => {
      if (st.units[victim] && k.once(st, `${self}:diamond-dust`)) addSeal(st, c, [victim], 1, 'DIAMOND DUST');
    }),
    // Absolute Zero: Strike contra Devotee já Sealed não recebe retaliação dele.
    declare: (s, c, key, self, target) => target.kind === 'devotee' && sealed(s, target.uid) &&
      (st => shield(st, self, Infinity, {duration: 'this_strike'})),
  },
  // Aquarius Camus
  'athena-v6-017': {
    // Freezing Coffin — {2}{C}, {T}: 2 Seal no Devotee inimigo alvo.
    activate: {
      name: 'FREEZING COFFIN', cost: 2,
      check: (s, c, key) => { if (!k.enemies(s, c, key).length) throw new k.RuleError('alvo', 'sem Devotee inimigo'); },
      run: (s, c, key) => {
        const t = k.choose(c, key, 'FREEZING COFFIN', k.enemies(s, c, key), {text: 'Choose target enemy Devotee.'});
        if (t) addSeal(s, c, [t], 2, 'FREEZING COFFIN');
      },
    },
    // Absolute Zero: dano de Strike a Devotee inimigo que já tem Seal causa 2 a mais.
    combatDamage: (s, c, key, self, victim) => sealed(s, victim) && (st => k.damage(st, c, victim, 2)),
  },
};
