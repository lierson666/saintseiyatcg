// Mission Director (Cosmo Chronicles): só observa eventos da engine e diz qual dica da missão aparece e como ela terminou.
// Sem DOM e sem regra própria. Dicas e gatilhos ficam em data/chronicles/<missão>.json.
import {matches} from './tutorial-director.js?v=20261111-cc2';

const ME = 'A';
// `when`: um gatilho ou uma lista (vale qualquer um). Gatilho de evento: campos iguais ao evento, mais `card` (carta do uid),
// `cards` (carta de outro campo do evento, ex.: {bearer: id}), `atLeast` e `atMost` (limites numéricos).
// `{stall: n}`: o jogador fechou n turnos seguidos sem jogar carta.
const hit = (e, {card, cards = {}, atLeast = {}, atMost = {}, stall, none_before, ...want}, cardOf) => stall == null
  && matches(e, want) && (!card || cardOf(e.uid) === card) && Object.entries(cards).every(([k, v]) => cardOf(e[k]) === v)
  && Object.entries(atLeast).every(([k, v]) => e[k] >= v) && Object.entries(atMost).every(([k, v]) => e[k] <= v);

export function createMissionDirector({hints = [], S, cardOf = () => null, victory = {}}) {
  const said = new Set();
  let seen = 0, idle = 0, played = false;
  const stalled = when => [when].flat().some(w => w.stall != null && idle >= w.stall);
  // `victory.survive_turns`: a missão acaba ao fim do n-ésimo turno próprio sem a engine ter decidido (vitória de missão, não da partida).
  const survived = () => !!victory.survive_turns && !S().victory
    && S().events.filter(e => e.type === 'end_phase' && e.player === ME).length >= victory.survive_turns;
  // Devotos do rival destruídos: só objetos que entraram como Devoto (card_played kind 'Devotee').
  const knocked = () => { const ev = S().events, dev = new Set(ev.filter(e => e.type === 'card_played' && e.player !== ME && e.kind === 'Devotee').map(e => e.uid));
    return ev.filter(e => e.type === 'destroyed' && e.owner !== ME && dev.has(e.uid)).length; };
  // `victory.destroy_devotees`: a missão acaba ao destruir n Devotos do rival, também sem a engine ter decidido.
  const reached = () => !!victory.destroy_devotees && !S().victory && knocked() >= victory.destroy_devotees;
  // Fim de missão antes da engine: 'survived', 'objective' ou null.
  const ended = () => survived() ? 'survived' : reached() ? 'objective' : null;
  return {
    survived, knocked, ended,
    said,
    // Dicas novas desde a última chamada, cada uma uma vez só. Fim de partida não dispara dica.
    observe() {
      const s = S(), ev = s.events, out = [];
      if (s.victory || ended()) { seen = ev.length; return out; }
      for (; seen < ev.length; seen++) {
        const e = ev[seen];
        if (e.player === ME && e.type === 'card_played') played = true;
        if (e.player === ME && e.type === 'end_phase') { idle = played ? 0 : idle + 1; played = false; }
        for (const h of hints) if (!said.has(h.id) && ([h.when].flat().some(w => hit(e, w, cardOf)) || stalled(h.when))) { said.add(h.id); out.push(h); }
      }
      return out;
    },
    strikes: () => S().events.filter(e => e.type === 'strike_resolve' && e.player === ME).length,
    // `victory.requires`: gatilhos que precisam ter acontecido na partida (ex.: Pegasus Cloth V2 vestida em Seiya).
    // `none_before`: nada parecido antes, com o mesmo objeto (ex.: Devoto destruído antes de declarar Strike).
    done: () => { const ev = S().events; return (victory.requires || []).every(w => ev.some((e, i) => hit(e, w, cardOf)
      && (!w.none_before || !ev.slice(0, i).some(p => p.type === w.none_before.event && p[w.none_before.key] === e.uid)))); },
    // `victory.bonus.none`: desafio extra que não muda o resultado (ex.: Shun nunca destruído). null quando a missão não tem desafio.
    bonus: () => victory.bonus ? !S().events.some(e => victory.bonus.none.some(w => hit(e, w, cardOf))) : null,
    // 'win' só com vitória do jogador confirmada pela engine e objetivo cumprido; vitória sem o objetivo é 'objective'; empate conta como derrota.
    outcome() {
      const v = S().victory;
      if (!v) return ended() ? 'win' : null;
      if (v.draw || v.winner !== ME) return 'lose';
      return this.strikes() >= (victory.min_strikes || 0) && this.done() ? 'win' : 'objective';
    },
  };
}
