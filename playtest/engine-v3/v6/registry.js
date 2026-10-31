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
//   Ganchos novos (29/10/2026):
//   survive(s, c, key, self, role, foe)          X continuou em campo depois de um Strike (`role`: 'attacker'|'defender';
//                                                `foe`: o outro Devotee, ou null se o alvo era o God). Também gearSurvive(s, c, key,
//                                                self, bearer, role, foe) e watchSurvive(s, c, key, self, unit, role, foe).
//   damagePrevented(s, c, key, self, info)       parte do dano de Strike a X foi prevenida. info = {prevented, incoming, absorbed,
//                                                dealt, full (tudo prevenido), role, foe}. gearDamagePrevented(…, self, bearer, info),
//                                                watchDamagePrevented(…, self, unit, info); contra o God, unit = 'god:X' e info.god = true.
//   wouldBeDefeated(s, c, key, self)             SUBSTITUIÇÃO síncrona antes de X ser destruído (checkDefeats). Devolve true se tomou
//                                                o lugar da derrota e já corrigiu o dano (ou tirou X do campo); pode perguntar (kit.may).
//                                                gearWouldBeDefeated(…, self, bearer); watchWouldBeDefeated(…, self, victim, owner).
//                                                Alternativa de Spell: effects.save(state, uid, onSave, {anyDamage: true}).
//   tookDamage(s, c, key, self, info)            X foi atingido por dano que chegou a ele (Strike ou efeito). info = {dealt, foe (Devotee
//                                                que causou ou null), combat (true se foi dano de Strike)}. gearTookDamage(…, self, bearer,
//                                                info), watchTookDamage(…, self, unit, info). Gancho extra (não pedido), destrava o Ares.
//   leaves(s, c, key, self, where)               X (Devotee ou Equipment) saiu do campo por qualquer via; `where`: 'tartarus'|'hand'|'void'.
//                                                Armor conta ao ir com o portador derrotado ou quebrada por dano. Gatilho.
//   watchLeaves(s, c, key, self, left, where, ctrl)  observador: outro Devotee saiu do campo.
//   prevent(s, c, key, self, amount, strike)     PREVENÇÃO obrigatória ("prevent N of that damage") do dano que X receberia; devolve quanto
//                                                previne (<= amount). Roda antes dos escudos de Spell. gearPrevent(…, self, bearer, amount, strike).
//                                                Gancho extra (não pedido): era a única forma exata de "whenever X is dealt damage, prevent 1".
//   attach(s, c, key, self, bearer)              Equipment ficou preso a `bearer` (jogado já equipado ou equipado depois).
//   watchAttach(s, c, key, self, gear, bearer)   observador: um Equipment ficou preso a `bearer` (ex.: "whenever an Equipment becomes attached to X").
//   watchEquipCast(s, c, key, self, gear)        observador: o jogador `key` conjurou o Equipment `gear` (preso, global ou Armor sem portador).
//   costLess(s, c, key, self, uid) -> {n, min, tag}|null   redução do custo de conjurar `uid` (play.js); `tag` = uso "first … each round".
//   watchSpell(s, c, key, self, caster, spellUid, targets)   uma Spell foi posta na cadeia (observador); `targets`: os alvos que ela
//                                                escolheu ao ser conjurada (uids, 'god:X'). A Spell espera na cadeia (janela aberta) e
//                                                kit.counterSpell(s, c, spellUid) a contraria. kit.targetsMine/stillTarget leem os alvos.
//   Marcas de efeito: effects.forbidStrike(s, uid) ("cannot declare a Strike this round"), effects.forbidPrepare(s, uid)
//   ("cannot be Prepared this round"). Domain: activate em `domain:${key}` via play.activate.
//   mods(s, c, key, self) -> [{atk, hp, keywords}]          bônus estático do próprio Devotee ("While …", "has Guardian")
//   aura(s, c, key, self, unit) -> {atk, hp, keywords}|null bônus estático que a carta dá a outro Devotee `unit`
//   spell: {check?(s, c, key, choice), targets?(s, c, key, self), run(s, c, key, self, choice, targets)}   Technique/Moment (categoria pelo subtipo)
//       ALVOS NA CONJURAÇÃO (guia §54, autor 29/10/2026): os alvos (e os modos, que decidem os alvos) são escolhidos ao jogar a Spell,
//       antes de pagar e de abrir a janela, para as respostas os verem (item da cadeia `targets`, evento `spell_targets`, 6º argumento
//       de `watchSpell`). Sem `targets`, o motor ensaia `run` numa cópia do estado (v6/targets.js): as perguntas de alvo/modo do
//       conjurador (kit.choose, kit.chooseUpTo, modo) vão ao jogador na conjuração e são repetidas na resolução; o resto ("you may",
//       descarte, busca) fica para a resolução. Na resolução, alvo que já não é opção legal vira null: a parte dele não acontece.
//       Por isso `run` deve ser puro sobre (s, c): efeito fora do estado roda também no ensaio. `targets` explícito (devolve a lista
//       de alvos, perguntando pelo kit; o motor não ensaia) serve para alvo sem pergunta ("target enemy God") ou efeito externo.
//   activate: {name, cost, once, tap, check?(s, c, key, self, choice), run(s, c, key, self, choice)}  habilidade ativada
// `watch*` em Domain: `self` = `domain:${key}` (o Domain não é objeto de deck; fica em state.domains[key]).
// Escolhas de alvo e de modo: perguntas da engine na CONJURAÇÃO (ver `spell` acima); "you may" e demais: na resolução, pelo kit (./kit.js).

import {loseSoul} from '../core.js';

const CARDS = {};
export const V6 = CARDS;
export function register(table) { Object.assign(CARDS, table); }

// Domain fora da cor (guia §63, autor 31/10/2026): facção do Domain diferente da do God.
const factionOf = id => String(id || '').replace(/^god-/, '').split('-')[0];
export const offColor = (state, key) => Boolean(state.gods?.[key]) && factionOf(state.gods?.[key]) !== factionOf(state.domains?.[key]);
// Ganchos estáticos (desligados fora da cor). Os demais ganchos de Domain são gatilhos.
const STATIC = new Set(['aura', 'mods', 'costLess']);
// Custo adicional {1}{S} do Domain fora da cor: opcional; sem pagar, a habilidade não é usada.
export function payOffColor(state, ctx, key, ability) {
  const p = state.players[key];
  if (p.soul < 1 || !ctx.decide?.(key, {ability, uid: `domain:${key}`, cost: '1 Soul', text: "Domain outside your God's faction: pay {1}{S} to use this ability?"})) return false;
  loseSoul(state, {[key]: 1}, 'payment');
  return true;
}
// Domain efetivo de `key`. Entrada de Domain: ganchos da linha 1 + `opg` (linha 2, Once per game, só via play.activate).
// Fora da cor: estáticas e `opg` somem; `activate` leva `offColor`; cada gatilho paga {1}{S} antes de resolver.
// shortcut: o "once each round" do gatilho é gasto ao disparar, mesmo se o jogador recusar o {1}{S}.
export function domainEntry(state, key) {
  const entry = CARDS[state.domains?.[key]];
  if (!entry || !offColor(state, key)) return entry;
  const out = {};
  for (const [hook, fn] of Object.entries(entry)) {
    if (STATIC.has(hook) || hook === 'opg') continue;
    if (hook === 'activate') { out.activate = {...fn, offColor: true}; continue; }
    out[hook] = (s, c, ...rest) => { const run = fn(s, c, ...rest); return run && (st => { if (payOffColor(st, c, key, 'DOMAIN')) run(st); }); };
  }
  return out;
}

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
  const domain = domainEntry(state, key);
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
