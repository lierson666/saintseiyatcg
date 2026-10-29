// Efeitos das cartas V6 (Hades, Poseidon, Ares, Artemis) por id completo de carta (ex.: 'hades-v6-218').
// O número sozinho colide com o D268 ('218' existe nos dois), por isso nada aqui usa `cardId.slice(-3)`.
// Cada facção exporta um objeto {cardId: Entrada} em ./hades.js, ./poseidon.js, ./ares.js e ./artemis.js.
// Texto das cartas: card-forge/art-web/cards.json (habilidades_en). Interpretações e dúvidas de regra:
// docs/v6-efeitos-pendencias.md (o autor confirma antes de virar regra).
//
// Entrada (todas as chaves opcionais; `self` = uid da carta; `key` = controlador da fonte).
// Ganchos de gatilho rodam NO EVENTO (para checar a condição: "friendly Berserker", "once each round"…) e devolvem
// a resolução `st => …` (vai para a cadeia, com janela) ou nada (sem gatilho). Exemplo:
//   defeated: (s, c, key, self) => st => { if (kit.may(…)) … }
//   enter(s, c, key, self)                      "When X enters the battlefield" (gatilho, vai para a cadeia)
//   cast(s, c, key, self)                       "When you cast X" (Equipment/Armor, ao entrar)
//   defeated(s, c, key, self)                   "When X is defeated" (X já está no Tartarus)
//   bearerDefeated(s, c, key, self, bearer)     Equipment: "When equipped Devotee is defeated"
//   watchDefeat(s, c, key, self, dead, owner)   observador em campo/Domain: "Whenever a friendly … is defeated"
//   declare(s, c, key, self, target)            "Whenever X declares a Strike" (`target`: {kind, uid|player})
//   gearDeclare(s, c, key, self, bearer, target) Equipment: "Whenever equipped Devotee declares a Strike"
//   watchDeclare(s, c, key, self, attacker, target) observador: "Whenever a friendly … declares a Strike"
//   combatDamage(s, c, key, self, victim, dealt) X causou dano de Strike a um Devotee inimigo (`victim`)
//   gearCombatDamage(s, c, key, self, bearer, victim, dealt)
//   killInCombat(s, c, key, self, victim)       X derrotou um Devotee inimigo no Strike (atacando ou retaliando)
//   gearKillInCombat(s, c, key, self, bearer, victim)
//   godDamage(s, c, key, self, player, dealt)   X causou dano de Strike a um God
//   startTurn(s, c, key, self) / endTurn(s, c, key, self)   no turno do controlador ("at the beginning/end of your turn")
//   watchEnter(s, c, key, self, entered)        observador: "Whenever another friendly … enters"
//   watchDiscard(s, c, key, self, player, uid)  observador: "Whenever an opponent discards a card"
//   mods(s, c, key, self) -> [{atk, hp, keywords}]          bônus estático do próprio Devotee ("While …", "has Guardian")
//   aura(s, c, key, self, unit) -> {atk, hp, keywords}|null bônus estático que a carta dá a outro Devotee `unit`
//   spell: {check?(s, c, key, choice), run(s, c, key, self, choice)}   Technique/Moment (categoria pelo subtipo)
//   activate: {name, cost, once, tap, check?(s, c, key, self, choice), run(s, c, key, self, choice)}  habilidade ativada
// `watch*` em Domain: `self` = `domain:${key}` (o Domain não é objeto de deck; fica em state.domains[key]).
// Escolhas ("target", "you may", "choose") são perguntas da engine na resolução, pelo kit (./kit.js).

const CARDS = {};
export const V6 = CARDS;
export function register(table) { Object.assign(CARDS, table); }

// ctx da partida por estado: ganchos de turno (core.js) não recebem ctx. O snapshot das decisões restaura o estado
// no mesmo objeto, então a chave do WeakMap continua válida.
const CTX = new WeakMap();
export const bindContext = (state, ctx) => CTX.set(state, ctx);
export const contextOf = state => CTX.get(state);

export const entryOf = (ctx, uid) => CARDS[ctx.objects[uid]?.cardId];
const owner = (state, uid) => state.order.find(k => state.players[k].battlefield.includes(uid));

// Fontes que observam a partida para `key`: cartas no campo (Devotees e Equipment) e o Domain.
export function sources(state, ctx, key) {
  const list = state.players[key].battlefield.filter(uid => entryOf(ctx, uid)).map(uid => ({self: uid, entry: entryOf(ctx, uid)}));
  const domain = CARDS[state.domains?.[key]];
  if (domain) list.push({self: `domain:${key}`, entry: domain});
  return list;
}

// Gatilho na cadeia: o corpo roda na resolução e pode perguntar (kit). `ability` aparece no log e na decisão.
export const trigger = (key, self, ability, run) => ({controller: key, uid: self, ability, run});
const nameOf = (ctx, self, fallback) => (String(self).startsWith('domain:') ? 'Domain' : ctx.cards.get(ctx.objects[self]?.cardId)?.name || fallback);

// Monta gatilhos de um tipo para cada fonte de `keys` (APNAP fica com pushTriggers).
// shortcut: observadores (`watch*`) só são lidos no campo; uma carta que acabou de sair não observa a própria saída
// pelo `watch*` — use `defeated`/`bearerDefeated` para isso.
export function collect(state, ctx, keys, hook, args, label) {
  const out = [];
  for (const key of keys) for (const {self, entry} of sources(state, ctx, key)) {
    const run = entry[hook]?.(state, ctx, key, self, ...args);
    if (run) out.push(trigger(key, self, `${nameOf(ctx, self, label)} · ${label}`, run));
  }
  return out;
}
export { owner as controllerOfV6 };
