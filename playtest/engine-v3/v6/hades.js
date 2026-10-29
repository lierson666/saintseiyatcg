// Efeitos V6 de Hades, por id de carta (contrato em ./registry.js; kit em ./kit.js).
import * as k from './kit.js';

// "When X is defeated, you may pay N Soul. If you do, return it from your Tartarus to your hand."
const riseFromTartarus = (soul, ability) => ({
  defeated: (s, c, key, self) => st => {
    if (st.players[key].tartarus.includes(self) && st.players[key].soul >= soul
      && k.may(c, key, ability, {uid: self, cost: `${soul} Soul`}) && k.paySoul(st, key, soul)) k.toHand(st, c, self, 'tartarus');
  },
});

export default {
  'hades-v6-212': riseFromTartarus(2, 'ETERNAL DEFENDER'),
  'hades-v6-218': riseFromTartarus(1, 'RISE AGAIN'),
  // Bone Reclamation: volta à mão de onde estiver (campo sem portador ou Tartarus).
  'hades-v6-225': {
    bearerDefeated: (s, c, key, self) => st => {
      const p = st.players[c.objects[self].owner], zone = ['battlefield', 'tartarus'].find(z => p[z].includes(self));
      if (!zone || (zone === 'battlefield' && c.attached[self])) return;
      if (k.may(c, key, 'BONE RECLAMATION', {uid: self, cost: '1 Soul'}) && k.paySoul(st, key, 1)) k.toHand(st, c, self, zone);
    },
  },
};
