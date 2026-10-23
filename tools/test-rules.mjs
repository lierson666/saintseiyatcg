#!/usr/bin/env node
// Contrato das regras, executado contra as funções reais e os dados oficiais.
// node tools/test-rules.mjs [--runtime=playtest/engine.js] [--strict-rules]
// O modo estrito ativa também regras documentadas ausentes no legado.
// Nimble, confirmado pelo autor: ignora Guardian; pode ser atacado normalmente.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const runtime = path.resolve(root, option('runtime') || (fs.existsSync(path.join(root, 'playtest/engine.js')) ? 'playtest/engine.js' : 'playtest/app.js'));
const fixtureDir = path.resolve(root, option('fixtures') || 'data');
const cards = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'cards.json'), 'utf8'));
const beta = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'beta-athena.json'), 'utf8'));
const strict = process.argv.includes('--strict-rules');
let source = fs.readFileSync(runtime, 'utf8');
const factory = /(?:export\s+)?function createGame\s*\(/.test(source);

// A única adaptação do código é retirar bootstrap, imports e apresentação.
// Nenhuma função de custo, turno, habilidade ou combate é substituída.
source = source.replace(/^import\s+[^;]+;\s*$/gm, '').replace(/^export\s+(?=(?:async\s+)?function|const|let|class)/gm, '');
if (factory) {
  const marker = source.lastIndexOf('return api;');
  assert.ok(marker >= 0, 'Factory precisa manter o marcador final `return api;`.');
  source = `${source.slice(0, marker)}globalThis.__rulesEvaluate = (code) => eval(code);\n${source.slice(marker)}`;
  source += '\ncreateGame({ cards: __cards, beta: __beta, settings: { ai: false, aiPlayerB: false, autoPass: false }, onChange() {}, onEvent() {} });';
} else {
  const bootstrapStart = source.indexOf('\ninit().catch(');
  const bootstrapEnd = source.indexOf('\nasync function init()', bootstrapStart);
  assert.ok(bootstrapStart >= 0 && bootstrapEnd > bootstrapStart, 'Bootstrap legado não encontrado.');
  source = source.slice(0, bootstrapStart) + source.slice(bootstrapEnd);
  source += `
    cardsData = __cards;
    betaData = __beta;
    cardsById = Object.fromEntries(cardsData.cartas.map(card => [card.id, card]));
    decksById = Object.fromEntries(betaData.decks.map(deck => [deck.id, deck]));
    renderGame = () => {};
    showCombatToast = () => {};
    ensureBattlefieldPosition = () => {};
    resolveBattlefieldRootSpacing = () => {};
    scheduleBattlefieldLayoutSync = () => {};
    closeContextMenu = () => { contextMenuState = null; };
    closeFloatingInfo = () => { floatingInfoState = null; };
    globalThis.__rulesEvaluate = (code) => eval(code);
  `;
}
const compiledRuntime = new vm.Script(source, { filename: runtime });

function createHarness() {
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      checked: false, value: '', textContent: '', innerHTML: '', style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 1920, height: 1080 }; },
      querySelector: () => null, querySelectorAll: () => []
    });
    return nodes.get(selector);
  };
  const sandbox = {
    __cards: structuredClone(cards), __beta: structuredClone(beta), __assert: assert,
    console, structuredClone, performance, URL, URLSearchParams,
    document: { querySelector: node, querySelectorAll: () => [], createElement: () => node('scratch') },
    // Timers não disparam: IA e transições visuais não devem avançar cenários.
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    localStorage: { getItem: () => null, setItem() {} },
    sfx() {}, playMusic() {}, initMenu() {},
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  compiledRuntime.runInContext(context, { timeout: 3000 });
  assert.equal(typeof context.__rulesEvaluate, 'function');
  return (code) => context.__rulesEvaluate(`(() => { ${helpers}\n${code}\n})()`);
}

const helpers = `
  const assert = __assert;
  function setup(startingPlayer = 'A') {
    startMatch({ deckAId: 'athena-beta-seiya', deckBId: 'athena-beta-hyoga', startingPlayer });
    return gameState;
  }
  function finishOpening() {
    let remaining = 3;
    while (mulliganState && remaining-- > 0) keepOpeningHand();
    assert.equal(mulliganState, null, 'Revisão das mãos iniciais concluída');
  }
  function main(startingPlayer = 'A') {
    setup(startingPlayer);
    finishOpening();
    gameState.currentPhase = 'main';
    for (const player of Object.values(gameState.players)) {
      player.domainId = 'athena-053';
      player.latentCosmo = 0;
      player.cosmo = 0;
    }
    return gameState;
  }
  function player(key = 'A') { return gameState.players[key]; }
  function put(key, name, zone = 'battlefield', state = {}) {
    const data = Object.values(cardsById).find(card => card.nome_exibicao_en === name || card.id === name);
    assert.ok(data, 'Carta encontrada: ' + name);
    const instance = Object.assign(createCardInstance(key, player(key).deckId, data.id), state);
    player(key).zones[zone].push(instance);
    return findCardInstance(key, instance.uid);
  }
  function unit(key, power, resistance, keywords = [], state = {}) {
    const id = 'test-unit-' + key + '-' + nextInstanceId;
    cardsById[id] = {
      ...getCard('athena-020'), id, nome_exibicao_en: id,
      power, resistance, keywords_en: keywords, habilidades_en: [], subtipos: []
    };
    return put(key, id, 'battlefield', state);
  }
  function descriptor(located) {
    return { kind: 'card', playerKey: located.card.owner, uid: located.card.uid, ...located };
  }
  function stats(located) {
    return getComputedStats(player(located.card.owner), located.card, located.cardData, located.zone);
  }
  function zone(located) { return findCardInstance(located.card.owner, located.card.uid)?.zone; }
  function snapshot() {
    return JSON.stringify({ state:api.state, stack:api.stack, pending:api.pending, revision:api.revision });
  }
`;

const cases = [];
function test(name, code, gap = false, factoryOnly = false) { cases.push({ name, code, gap, factoryOnly }); }

test('Setup: 7 cartas, 53 no baralho, Deus e Domain separados', `
  setup();
  for (const p of Object.values(gameState.players)) {
    assert.equal(p.zones.hand.length, 7);
    assert.equal(p.zones.deck.length, 53);
    assert.equal(p.god.soul, 30);
    assert.ok(p.domainId);
    assert.ok(p.zones.deck.every(card => !['God', 'Domain'].includes(getCard(card.cardId).tipo)));
    assert.equal(new Set([...p.zones.hand, ...p.zones.deck].map(card => card.uid)).size, 60);
  }
`);

test('Fases: A e B avançam em hotseat; primeiro jogador pula só a primeira compra', `
  for (const starter of ['A', 'B']) {
    setup(starter);
    finishOpening();
    assert.equal(gameState.currentPhase, 'upkeep');
    assert.equal(advanceToNextPhase(), true);
    assert.equal(gameState.currentPhase, 'draw');
    assert.equal(player(starter).zones.hand.length, 7);
    assert.equal(advanceToNextPhase(), true);
    assert.equal(gameState.currentPhase, 'main');
    assert.equal(advanceToNextPhase(), true);
    assert.equal(gameState.currentPhase, 'end');
    nextTurn();
    const opponent = otherPlayerKey(starter);
    assert.equal(gameState.currentPlayer, opponent);
    assert.equal(advanceToNextPhase(), true);
    assert.equal(player(opponent).zones.hand.length, 8);
    assert.equal(advanceToNextPhase(), true);
    assert.equal(gameState.currentPhase, 'main');
  }
`);

test('Mulligan: trocar uma ou sete preserva tamanho e dá só 1 Latent ao oponente', `
  for (const count of [1, 7]) {
    setup();
    const chosen = player().zones.hand.slice(0, count).map(card => card.uid);
    mulliganState.selectedUids = chosen;
    resolveOpeningMulligan();
    assert.equal(player().zones.hand.length, 7);
    assert.equal(player().zones.deck.length, 53);
    assert.equal(player('B').latentCosmo, 1);
    assert.equal(new Set([...player().zones.hand, ...player().zones.deck].map(card => card.uid)).size, 60);
  }
`);

test('Hotseat: A e B podem manter ou trocar a mão antes do início', `
  setup('B');
  player().domainId = 'athena-053';
  player('B').domainId = 'athena-053';
  assert.equal(mulliganState.playerKey, 'A');
  assert.equal(api.dispatch({type:'next-phase', playerKey:'B'}), false);
  keepOpeningHand();
  assert.equal(mulliganState.playerKey, 'B');
  keepOpeningHand();
  assert.equal(mulliganState, null);
  assert.equal(gameState.currentPlayer, 'B');
  assert.equal(gameState.currentPhase, 'upkeep');
  assert.equal(player().latentCosmo, 0);
  assert.equal(player('B').latentCosmo, 0);

  setup();
  mulliganState.selectedUids = player().zones.hand.slice(0, 1).map(card => card.uid);
  resolveOpeningMulligan();
  assert.equal(mulliganState.playerKey, 'B');
  assert.equal(player('B').latentCosmo, 1);
  assert.equal(player().latentCosmo, 0);
  mulliganState.selectedUids = player('B').zones.hand.slice(0, 3).map(card => card.uid);
  resolveOpeningMulligan();
  assert.equal(mulliganState, null);
  assert.equal(player().latentCosmo, 1);
  assert.equal(player('B').latentCosmo, 1);
  for (const p of Object.values(gameState.players)) {
    assert.equal(p.zones.hand.length, 7);
    assert.equal(p.zones.deck.length, 53);
    assert.equal(new Set([...p.zones.hand, ...p.zones.deck].map(card => card.uid)).size, 60);
  }
`, false, true);

test('Deckout exige tentativa de compra; esvaziar baralho por si só não perde', `
  main();
  player('B').zones.deck = [player('B').zones.deck[0]];
  drawCards(player('B'), 1);
  assert.equal(player('B').lostByDeckOut, false);
  assert.equal(evaluateVictoryState(), null);
  drawCards(player('B'), 1);
  assert.equal(evaluateVictoryState().winnerKey, 'A');
  assert.equal(gameState.victory.reason, 'deckout');
`);

test('Uma única Cosmo Base Cosmoble da mão, durante Main do dono', `
  main();
  const base = put('A', 'Sanctuary Soldier', 'hand');
  const second = put('A', 'Sanctuary Guard', 'hand');
  const invalid = put('A', 'Seiya, Pegasus Saint', 'hand');
  assert.equal(canRelocateCard('A', invalid, 'cosmo_base'), false);
  gameState.currentPhase = 'upkeep';
  assert.equal(canRelocateCard('A', base, 'cosmo_base'), false);
  gameState.currentPhase = 'main';
  assert.equal(canRelocateCard('A', base, 'cosmo_base'), true);
  assert.ok(relocateCard('A', base.card.uid, 'cosmo_base'));
  assert.equal(player().playedBaseThisTurn, true);
  assert.equal(canRelocateCard('A', second, 'cosmo_base'), false);
  gameState.currentPlayer = 'B';
  player().playedBaseThisTurn = false;
  assert.equal(canRelocateCard('A', second, 'cosmo_base'), false);
`);

test('Custo: Latent, pool e Bases pagam sem duplicar recurso', `
  main();
  player().latentCosmo = 2;
  player().cosmo = 1;
  put('A', 'Sanctuary Soldier', 'cosmo_base');
  put('A', 'Sanctuary Guard', 'cosmo_base');
  assert.equal(getAvailableCosmo(player()), 5);
  assert.equal(spendCosmo(player(), 4, 'teste'), true);
  assert.equal(player().latentCosmo, 0);
  assert.equal(player().cosmo, 0);
  assert.equal(countUntappedBase(player()), 1);
  assert.equal(spendCosmo(player(), 2, 'teste impossível'), false);
  assert.equal(countUntappedBase(player()), 1);
`);

test('Base Cosmo não aceita Latent; pagamento insuficiente não consome recursos', `
  main();
  player().latentCosmo = 10;
  player().cosmo = 1;
  put('A', 'Sanctuary Soldier', 'cosmo_base');
  assert.equal(getAvailableCosmo(player(), 'base_cosmo'), 2);
  assert.equal(spendCosmo(player(), 3, 'Base', { unit: 'base_cosmo' }), false);
  assert.equal(player().latentCosmo, 10);
  assert.equal(player().cosmo, 1);
  assert.equal(spendCosmo(player(), 2, 'Base', { unit: 'base_cosmo' }), true);
  assert.equal(player().latentCosmo, 10);
  assert.equal(countUntappedBase(player()), 0);
`);

test('Guardian obriga atacar Guardian; evasão segue a regra vigente', `
  main();
  const attacker = unit('A', 2, 3);
  const guard = unit('B', 1, 3, ['Guardian']);
  const other = unit('B', 1, 3);
  assert.equal(isAttackableGodTargetForAttacker(attacker, 'B'), false);
  assert.equal(isAttackableCardTargetForAttacker(attacker, 'B', guard.zone, guard.card, guard.cardData), true);
  assert.equal(isAttackableCardTargetForAttacker(attacker, 'B', other.zone, other.card, other.cardData), false);
  attacker.cardData.keywords_en.push('${factory ? 'Nimble' : 'Cheater'}');
  assert.equal(isAttackableGodTargetForAttacker(attacker, 'B'), true);
  assert.equal(isAttackableCardTargetForAttacker(attacker, 'B', other.zone, other.card, other.cardData), true);
`);

test('Impulso, invocação, Sealed e Unprepared restringem novo ataque', `
  main();
  const normal = unit('A', 2, 3, [], { summoningSick: true });
  const impulse = unit('A', 2, 3, ['Impulse'], { summoningSick: true });
  assert.equal(canDeclareAttacker('A', normal.card), false);
  assert.equal(canDeclareAttacker('A', impulse.card), true);
  impulse.card.tempKeywords.push('Sealed');
  assert.equal(canDeclareAttacker('A', impulse.card), false);
  normal.card.summoningSick = false;
  assert.equal(canDeclareAttacker('A', normal.card), true);
  finalizeAttackDeclaration(normal);
  assert.equal(normal.card.tapped, true);
  assert.equal(normal.card.enteredCombatThisTurn, true);
  normal.card.tapped = false;
  assert.equal(canDeclareAttacker('A', normal.card), false);
`);

test('Combate comum é simultâneo, inclusive quando ambos morrem', `
  main();
  const a = unit('A', 3, 2);
  const b = unit('B', 2, 3);
  resolveAttackAgainstDevotee(a, b);
  assert.equal(zone(a), 'tartarus');
  assert.equal(zone(b), 'tartarus');
  assert.equal(player('B').latentCosmo, 1);
  assert.equal(player('A').latentCosmo, 0);
`);

test('Long Range mata antes do contra-ataque; dos dois lados é simultâneo', `
  main();
  const a = unit('A', 3, 2, ['Long Range']);
  const b = unit('B', 2, 3);
  resolveAttackAgainstDevotee(a, b);
  assert.equal(zone(a), 'battlefield');
  assert.equal(a.card.damageCounters, 0);
  assert.equal(zone(b), 'tartarus');
  main();
  const c = unit('A', 3, 2, ['Long Range']);
  const d = unit('B', 2, 3, ['Long Range']);
  resolveAttackAgainstDevotee(c, d);
  assert.equal(zone(c), 'tartarus');
  assert.equal(zone(d), 'tartarus');
`);

test('Pierce envia só o excesso à Soul; proteção do Deus impede excesso', `
  for (const protectedGod of [false, true]) {
    main();
    const a = unit('A', 5, 6, ['Pierce']);
    const b = unit('B', 0, 2);
    player('B').god.preventDamageUntilEnd = protectedGod;
    resolveAttackAgainstDevotee(a, b);
    assert.equal(player('B').god.soul, protectedGod ? 30 : 27);
  }
`);

test('Deus perde Soul e contra-ataca com Attack, podendo destruir atacante', `
  main();
  const a = unit('A', 4, 3);
  resolveAttackAgainstGod(a, 'B');
  assert.equal(player('B').god.soul, 26);
  assert.equal(zone(a), 'tartarus');
  assert.equal(player().latentCosmo, 0);
`);

test('Unfaith remove Latent em vez de Soul e ainda recebe contra-ataque', `
  main();
  const a = unit('A', 4, 8, ['Unfaith']);
  player('B').latentCosmo = 6;
  resolveAttackAgainstGod(a, 'B');
  assert.equal(player('B').latentCosmo, 2);
  assert.equal(player('B').god.soul, 30);
  assert.equal(a.card.damageCounters, 3);
`);

test('Latent por evento de dano no turno adversário; dano prevenido não gera', `
  main();
  const a = unit('A', 0, 20);
  const b = unit('B', 0, 20);
  applyDamageToDevotee(a, 2);
  applyDamageToDevotee(b, 2);
  applyDamageToDevotee(b, 3);
  assert.equal(player().latentCosmo, 0);
  assert.equal(player('B').latentCosmo, 2);
  b.card.preventDamageShield = 3;
  applyDamageToDevotee(b, 3);
  assert.equal(player('B').latentCosmo, 2);
`);

test('Cosmo of Hope gera 1 Latent por combate sobrevivido, não por Devotee', `
  main();
  const b = unit('B', 1, 8);
  markSurvivedCombat('B', b.card.uid);
  markSurvivedCombat('B', b.card.uid);
  assert.equal(player('B').latentCosmo, 1);
  gameState.combat = createEmptyCombatState();
  markSurvivedCombat('B', b.card.uid);
  assert.equal(player('B').latentCosmo, 2);
`);

test('Awaken automático no limiar, permanente e Seventh Sense +1/+1', `
  main();
  const a = unit('A', 2, 3);
  player().god.soul = player().god.awaken + 1;
  syncAwakenState(player());
  assert.equal(player().god.awakened, false);
  player().god.soul -= 1;
  syncAwakenState(player());
  assert.equal(player().god.awakened, true);
  assert.equal(stats(a).power, 3);
  assert.equal(stats(a).resistance, 4);
  player().god.soul = 30;
  syncAwakenState(player());
  assert.equal(player().god.awakened, true);
`);

test('Manutenção desvira Base, cura 1 Cloth e mantém Seal pelo ciclo correto', `
  main();
  const base = put('A', 'Sanctuary Soldier', 'cosmo_base', { tapped: true });
  const cloth = put('A', 'Sagittarius Cloth', 'battlefield', { damageCounters: 3 });
  const sealed = unit('A', 2, 4, [], { tapped: true, sealCounters: 1 });
  beginTurn(player());
  assert.equal(base.card.tapped, false);
  assert.equal(cloth.card.damageCounters, 2);
  assert.equal(sealed.card.sealCounters, 0);
  assert.equal(sealed.card.tapped, true);
  assert.equal(sealed.card.sealLocked, true);
  beginTurn(player());
  assert.equal(sealed.card.sealLocked, false);
  assert.equal(sealed.card.tapped, false);
`);

test('Fim limpa dano das unidades e bônus de ambos; Cloth conserva dano', `
  main();
  const a = unit('A', 2, 8, [], { damageCounters: 2, turnPowerBonus: 3 });
  const b = unit('B', 2, 8, [], { damageCounters: 3, tempKeywords: ['Pierce'] });
  const cloth = put('A', 'Sagittarius Cloth', 'battlefield', { damageCounters: 3 });
  player().latentCosmo = 3;
  player('B').latentCosmo = 2;
  player().cosmo = 2;
  gameState.currentPhase = 'end';
  nextTurn();
  assert.equal(a.card.damageCounters, 0);
  assert.equal(a.card.turnPowerBonus, 0);
  assert.equal(b.card.damageCounters, 0);
  assert.equal(b.card.tempKeywords.length, 0);
  assert.equal(cloth.card.damageCounters, 3);
  assert.equal(player().latentCosmo, 0);
  assert.equal(player().cosmo, 0);
  assert.equal(player('B').latentCosmo, 2);
`);

test('Domains: Sanctuary +0/+1, Star Hill gera 1 Latent no início', `
  main();
  player().domainId = 'athena-051';
  const a = unit('A', 2, 3);
  assert.equal(stats(a).power, 2);
  assert.equal(stats(a).resistance, 4);
  player().domainId = 'athena-052';
  beginTurn(player());
  assert.equal(player().latentCosmo, 1);
`);

test('Coliseum concede +1/+0 e Pierce temporários, só uma vez por partida', `
  main();
  const a = unit('A', 2, 3);
  resolveDomainAbility('A', 'coliseum-burst');
  assert.ok(targetingState);
  targetingState.resolve(descriptor(a));
  clearTargetingState();
  assert.equal(player().domainUsed, true);
  assert.equal(stats(a).power, 3);
  assert.equal(hasKeyword(a.cardData, 'Pierce', a.card), true);
  clearEndOfTurn(player());
  assert.equal(stats(a).power, 2);
  assert.equal(hasKeyword(a.cardData, 'Pierce', a.card), false);
  resolveDomainAbility('A', 'coliseum-burst');
  assert.equal(targetingState, null);
`);

test('Equipar só Devotee aliado; uma Cloth e várias Relics', `
  main();
  const a = unit('A', 2, 3);
  const b = unit('B', 2, 3);
  const cloth = put('A', 'Sagittarius Cloth');
  const second = put('A', 'Libra Cloth');
  const sword = put('A', 'Libra Sword');
  assert.equal(canEquipToTarget('A', cloth, {kind:'god', playerKey:'A'}), false);
  assert.equal(canEquipToTarget('A', cloth, descriptor(b)), false);
  assert.equal(canEquipToTarget('A', cloth, descriptor(a)), true);
  cloth.card.attachedToUid = a.card.uid;
  assert.equal(canEquipToTarget('A', second, descriptor(a)), false);
  assert.equal(canEquipToTarget('A', sword, descriptor(a)), true);
  sword.card.attachedToUid = a.card.uid;
  const anotherSword = put('A', 'Libra Sword');
  assert.equal(canEquipToTarget('A', anotherSword, descriptor(a)), true);
`);

test('Morte conserva equipamentos; Cloth recebe Damage e fica inativa até curar', `
  main();
  const a = unit('A', 2, 3);
  const cloth = put('A', 'Sagittarius Cloth', 'battlefield', { attachedToUid: a.card.uid });
  const sword = put('A', 'Libra Sword', 'battlefield', { attachedToUid: a.card.uid });
  assert.equal(stats(a).power, 6);
  applyDamageToDevotee(a, 99);
  assert.equal(zone(a), 'tartarus');
  assert.equal(zone(cloth), 'battlefield');
  assert.equal(zone(sword), 'battlefield');
  assert.equal(cloth.card.attachedToUid, null);
  assert.equal(sword.card.attachedToUid, null);
  assert.equal(cloth.card.damageCounters, 3);
  const b = unit('A', 2, 3);
  assert.equal(canEquipToTarget('A', cloth, descriptor(b)), false);
  cloth.card.attachedToUid = b.card.uid;
  assert.equal(stats(b).power, 2);
  cloth.card.attachedToUid = null;
  healCloths(player()); healCloths(player()); healCloths(player());
  assert.equal(canEquipToTarget('A', cloth, descriptor(b)), true);
`);

test('Equipar paga custo sem mover da battlefield; duas Relics podem coexistir', `
  main();
  const a = unit('A', 2, 3);
  const first = put('A', 'Libra Sword');
  const second = put('A', 'Libra Sword');
  player().cosmo = 4;
  startEquipSelection('A', first.card.uid);
  resolveEquipSelection(a.card.uid);
  startEquipSelection('A', second.card.uid);
  resolveEquipSelection(a.card.uid);
  assert.equal(player().cosmo, 0);
  assert.equal(first.card.attachedToUid, a.card.uid);
  assert.equal(second.card.attachedToUid, a.card.uid);
  assert.equal(stats(a).power, 6);
  assert.equal(zone(first), 'battlefield');
`);

test('Shatter Faith destrói Relic para Void, paga uma vez e resolve para Tartarus', `
  main();
  const target = put('B', 'Libra Sword');
  const spell = put('A', 'Shatter Faith', 'hand');
  player().cosmo = spell.cardData.custo;
  startSpellCastFromHand('A', spell);
  assert.ok(spellResolutionState);
  assert.equal(player().cosmo, 0);
  resolveSpellTargetSelection('card', 'B', target.card.uid);
  assert.equal(zone(target), 'void');
  assert.equal(zone(spell), 'tartarus');
  assert.equal(spellResolutionState, null);
`);

test('Legendary conserva cópia escolhida e envia a outra ao Tartarus', `
  main();
  const oldSaint = put('A', 'Seiya, Pegasus Saint');
  const newSaint = put('A', 'Seiya, Pegasus Saint');
  resolveNamedSaintLegendaryChoice('A', 'Seiya, Pegasus Saint', oldSaint.card.uid);
  assert.equal(zone(oldSaint), 'battlefield');
  assert.equal(zone(newSaint), 'tartarus');
`);

test('Moment só em Main próprio; Technique responde com prioridade do defensor', `
  main();
  const a = unit('A', 2, 4);
  assert.equal(canCastMomentNow('A'), true);
  assert.equal(canCastMomentNow('B'), false);
  gameState.combat.attacker = {playerKey:'A', uid:a.card.uid};
  gameState.combat.target = {kind:'god', playerKey:'B'};
  openCombatPriorityWindow();
  assert.equal(a.card.tapped, true);
  assert.equal(canCastMomentNow('A'), false);
  assert.equal(canCastTechniqueNow('B'), true);
  assert.equal(canCastTechniqueNow('A'), false);
`);

test('Comandos: Technique responde à carta, resolve primeiro e paga só uma vez', `
  main();
  const relic = put('A', 'Libra Sword');
  const permanent = put('A', 'Sanctuary Soldier', 'hand');
  const response = put('B', 'Shatter Faith', 'hand');
  player().cosmo = permanent.cardData.custo;
  player('B').cosmo = response.cardData.custo;
  api.dispatch({ type:'play', playerKey:'A', uid:permanent.card.uid });
  assert.equal(api.stack.length, 1);
  assert.equal(api.stack[0].priorityPlayer, 'B');
  assert.equal(zone(permanent), 'hand');
  assert.equal(player().cosmo, 0);
  api.dispatch({ type:'play', playerKey:'B', uid:response.card.uid });
  assert.equal(api.stack.length, 2);
  assert.equal(api.stack[1].priorityPlayer, 'A');
  assert.equal(player('B').cosmo, 0);
  api.dispatch({ type:'pass-priority', playerKey:'A' });
  assert.equal(api.stack.length, 1);
  assert.ok(spellResolutionState);
  api.dispatch({ type:'target', playerKey:'B', target:{kind:'card', playerKey:'A', uid:relic.card.uid} });
  assert.equal(zone(relic), 'void');
  assert.equal(zone(response), 'tartarus');
  assert.equal(zone(permanent), 'hand');
  api.dispatch({ type:'pass-priority', playerKey:'B' });
  assert.equal(zone(permanent), 'battlefield');
  assert.equal(permanent.card.summoningSick, true);
  assert.equal(player().cosmo, 0);
  assert.equal(player('B').cosmo, 0);
  assert.equal(api.stack.length, 0);
`, false, true);

test('Comandos: manter prioridade exige passes dos dois lados antes da resolução', `
  main();
  const permanent = put('A', 'Sanctuary Soldier', 'hand');
  player().cosmo = permanent.cardData.custo;
  api.dispatch({ type:'play', playerKey:'A', uid:permanent.card.uid, holdPriority:true });
  assert.equal(api.stack[0].priorityPlayer, 'A');
  api.dispatch({ type:'pass-priority', playerKey:'A' });
  assert.equal(api.stack.length, 1);
  assert.equal(api.stack[0].priorityPlayer, 'B');
  assert.equal(zone(permanent), 'hand');
  api.dispatch({ type:'pass-priority', playerKey:'B' });
  assert.equal(api.stack.length, 0);
  assert.equal(zone(permanent), 'battlefield');
`, false, true);

test('Comandos: ator errado não avança fases nem passa prioridade alheia', `
  main();
  let before = snapshot();
  for (const key of ['B', 'invalid-player']) {
    assert.equal(api.dispatch({type:'next-phase', playerKey:key}), false);
    assert.equal(snapshot(), before);
  }
  const permanent = put('A', 'Sanctuary Soldier', 'hand');
  player().cosmo = permanent.cardData.custo;
  api.dispatch({type:'play', playerKey:'A', uid:permanent.card.uid});
  before = snapshot();
  assert.equal(api.actingPlayer, 'B');
  assert.equal(api.dispatch({type:'pass-priority', playerKey:'A'}), false);
  assert.equal(snapshot(), before);
  assert.equal(api.dispatch({type:'pass-priority', playerKey:'B'}), true);
  assert.equal(zone(permanent), 'battlefield');
`, false, true);

test('Comandos: revisão antiga é rejeitada sem alterar estado ou revisão', `
  main();
  const oldRevision = api.revision;
  assert.equal(api.dispatch({type:'next-phase', playerKey:'A', expectedRevision:oldRevision}), true);
  assert.equal(gameState.currentPhase, 'end');
  assert.ok(api.revision > oldRevision);
  const before = snapshot();
  assert.equal(api.dispatch({type:'end-turn', playerKey:'A', expectedRevision:oldRevision}), false);
  assert.equal(snapshot(), before);
  assert.equal(api.dispatch({type:'end-turn', playerKey:'A', expectedRevision:api.revision}), true);
  assert.equal(gameState.currentPlayer, 'B');
`, false, true);

test('Comandos: mulligan só aceita o jogador que está revisando a própria mão', `
  setup();
  let before = snapshot();
  assert.equal(api.dispatch({type:'mulligan-keep', playerKey:'B'}), false);
  assert.equal(snapshot(), before);
  assert.equal(api.dispatch({type:'mulligan-keep', playerKey:'A'}), true);
  assert.equal(mulliganState.playerKey, 'B');
  before = snapshot();
  assert.equal(api.dispatch({type:'mulligan-keep', playerKey:'A'}), false);
  assert.equal(snapshot(), before);
  assert.equal(api.dispatch({type:'mulligan-keep', playerKey:'B'}), true);
  assert.equal(mulliganState, null);
`, false, true);

test('Comandos: escolha de zona exige ator e UID presentes nas opções permitidas', `
  main();
  const allowed = put('A', 'Seiya, Pegasus Saint', 'tartarus');
  const excluded = put('A', 'Sanctuary Soldier', 'tartarus');
  const wrongZone = put('A', 'Seiya, Pegasus Saint', 'hand');
  let selected = null;
  openZoneBrowser({playerKey:'A', zone:'tartarus', title:'Contrato de escolha', prompt:'Choose',
    filter: d => d.cardId === 'athena-002', onSelect: uid => { selected = uid; }});
  assert.equal(zoneBrowserState.entries.length, 1);
  for (const uid of [excluded.card.uid, wrongZone.card.uid, 'missing-card']) {
    const before = snapshot();
    assert.equal(api.dispatch({type:'zone-select', playerKey:'A', uid}), false);
    assert.equal(snapshot(), before);
    assert.equal(selected, null);
  }
  const before = snapshot();
  assert.equal(api.dispatch({type:'zone-select', playerKey:'B', uid:allowed.card.uid}), false);
  assert.equal(snapshot(), before);
  assert.equal(api.dispatch({type:'zone-select', playerKey:'A', uid:allowed.card.uid}), true);
  assert.equal(zoneBrowserState.selectedUid, allowed.card.uid);
  assert.equal(api.dispatch({type:'zone-confirm', playerKey:'A'}), true);
  assert.equal(selected, allowed.card.uid);
  assert.equal(zoneBrowserState, null);
`, false, true);

test('Comandos: confirmação de zona revalida localização e filtro do alvo', `
  for (const change of ['zone', 'filter']) {
    main();
    const allowed = put('A', 'Seiya, Pegasus Saint', 'tartarus');
    let eligible = true;
    let selected = null;
    openZoneBrowser({playerKey:'A', zone:'tartarus', title:'Contrato de escolha', prompt:'Choose',
      filter:d => d.cardId === 'athena-002' && eligible, onSelect:uid => {selected = uid;}});
    assert.equal(api.dispatch({type:'zone-select', playerKey:'A', uid:allowed.card.uid}), true);
    if (change === 'zone') moveCardByEffect('A', allowed.card.uid, 'hand');
    else eligible = false;
    assert.equal(api.dispatch({type:'zone-confirm', playerKey:'A'}), false);
    assert.equal(selected, null);
  }
`, false, true);

test('Soul zero encerra e bloqueia avanço de fase', `
  main();
  player('B').god.soul = 0;
  assert.equal(evaluateVictoryState().winnerKey, 'A');
  assert.equal(gameState.victory.reason, 'soul');
  assert.equal(advanceToNextPhase(), false);
`);

test('Partida hotseat completa até deckout, com ambos os jogadores iniciando', `
  for (const starter of ['A', 'B']) {
    setup(starter);
    finishOpening();
    let turns = 0;
    while (!gameState.victory && turns++ < 120) {
      assert.equal(advanceToNextPhase(), true);
      evaluateVictoryState();
      if (gameState.victory) break;
      assert.equal(advanceToNextPhase(), true);
      assert.equal(advanceToNextPhase(), true);
      nextTurn();
    }
    assert.ok(turns < 120);
    assert.equal(gameState.victory?.reason, 'deckout');
    assert.equal(gameState.victory?.winnerKey, starter);
  }
`);

// Estes cenários representam regras do manual, e falhavam no baseline.
// --strict-rules permite exigir os mesmos contratos assim que implementados.
test('Nimble é a única keyword que ignora Guardian, para A e B', `
  for (const key of ['A','B']) {
    main(key); const enemy=otherPlayerKey(key);
    const attacker=unit(key,2,3),guardian=unit(enemy,1,4,['Guardian']),other=unit(enemy,1,4);
    for (const keywords of [[],['Guardian'],['Cheater']]) {
      attacker.cardData.keywords_en=keywords;
      assert.equal(isAttackableGodTargetForAttacker(attacker,enemy),false);
      assert.equal(isAttackableCardTargetForAttacker(attacker,enemy,other.zone,other.card,other.cardData),false);
      assert.equal(isAttackableCardTargetForAttacker(attacker,enemy,guardian.zone,guardian.card,guardian.cardData),true);
    }
    attacker.cardData.keywords_en=['Nimble'];
    assert.equal(isAttackableGodTargetForAttacker(attacker,enemy),true);
    assert.equal(isAttackableCardTargetForAttacker(attacker,enemy,other.zone,other.card,other.cardData),true);
  }
`, false, true);

test('Nimble temporário ou de equipamento também atravessa Guardian', `
  main(); const attacker=unit('A',2,3),guardian=unit('B',1,4,['Guardian']);
  assert.equal(isAttackableGodTargetForAttacker(attacker,'B'),false);
  attacker.card.tempKeywords=['Nimble'];
  assert.equal(isAttackableGodTargetForAttacker(attacker,'B'),true);
  attacker.card.tempKeywords=[];
  const equipment=put('A','Libra Sword','battlefield',{attachedToUid:attacker.card.uid});
  equipment.cardData.habilidades_en=['Equipped Devotee gains Nimble.'];
  assert.equal(isAttackableGodTargetForAttacker(attacker,'B'),true);
  equipment.cardData.habilidades_en=['Equipped Devotee gains Cheater.'];
  assert.equal(isAttackableGodTargetForAttacker(attacker,'B'),false);
`, false, true);

test('Nimble pode ser atacado normalmente; vários Guardians protegem até o último sair', `
  main();const attacker=unit('A',2,3),nimble=unit('B',1,4,['Nimble']);
  const canHit=()=>isAttackableCardTargetForAttacker(attacker,'B',nimble.zone,nimble.card,nimble.cardData);
  assert.equal(canHit(),true);
  const first=unit('B',1,4,['Guardian']),second=unit('B',1,4,['Guardian']);
  assert.equal(canHit(),false);
  relocateCard('B',first.card.uid,'tartarus',{force:true});assert.equal(canHit(),false);
  relocateCard('B',second.card.uid,'tartarus',{force:true});assert.equal(canHit(),true);
  assert.equal(isAttackableGodTargetForAttacker(attacker,'B'),true);
`, false, true);

test('Long Range concedido por equipamento também antecipa o dano', `
  main();
  const a = put('A', 'Shiryu, Dragon Saint');
  const cloth = put('A', 'Libra Cloth', 'battlefield', { attachedToUid: a.card.uid });
  cloth.cardData.habilidades_en = ['Equipped Devotee gains Long Range.'];
  const b = unit('B', 20, 1);
  assert.equal(hasKeyword(a.cardData, 'Long Range', a.card), true);
  resolveAttackAgainstDevotee(a, b);
  assert.equal(zone(a), 'battlefield');
  assert.equal(a.card.damageCounters, 0);
`, 'legacy');

test('Resonance na mesma linha soma só os bônus do portador correspondente', `
  main();
  const shiryu = put('A', 'Shiryu, Dragon Saint');
  put('A', 'Libra Cloth', 'battlefield', { attachedToUid: shiryu.card.uid });
  const resonant = getEquipmentEffectsForDevotee(player(), shiryu.card, shiryu.cardData);
  assert.equal(resonant.power, 2);
  assert.equal(resonant.resistance, 4);
  assert.equal(resonant.keywords.includes('Long Range'), true);
  const hyoga = put('A', 'Hyoga, Cygnus Saint');
  put('A', 'Libra Cloth', 'battlefield', { attachedToUid: hyoga.card.uid });
  const ordinary = getEquipmentEffectsForDevotee(player(), hyoga.card, hyoga.cardData);
  assert.equal(ordinary.power, 2);
  assert.equal(ordinary.resistance, 2);
  assert.equal(ordinary.keywords.includes('Long Range'), false);
`, 'legacy');

test('Ultimate só uma vez por partida', `
  main();
  player().cosmo = 30;
  const first = unit('B', 1, 1);
  resolveGodAbility('A', 'ultimate');
  assert.equal(zone(first), 'tartarus');
  const later = unit('B', 1, 1);
  resolveGodAbility('A', 'ultimate');
  assert.equal(zone(later), 'battlefield');
  assert.equal(player().cosmo, 15);
`, 'legacy');

test('Evolution reduz em 2 o custo de Devotee com mesmo nome em campo', `
  main();
  put('A', 'Seiya, Pegasus Saint');
  const evolved = put('A', 'Seiya, Pegasus Saint', 'hand');
  player().cosmo = 1;
  moveCard('A', evolved.card.uid, 'battlefield');
  assert.equal(zone(evolved), 'battlefield');
  assert.equal(player().cosmo, 0);
`, 'legacy');

test('Legendary inclui Devotees comuns e Relics da facção; cartas cinza ficam de fora', `
  for (const name of ['Sanctuary Guard','Libra Sword']) {
    main();const first=put('A',name),second=put('A',name);
    enforceNamedSaintLegendaryRule('A',second.card.uid);
    assert.ok(zoneBrowserState);
    assert.equal(api.dispatch({type:'zone-select',playerKey:'A',uid:first.card.uid}),true);
    assert.equal(api.dispatch({type:'zone-confirm',playerKey:'A'}),true);
    assert.equal(zone(first),'battlefield');assert.equal(zone(second),'tartarus');
  }
  main();const first=put('A','Sanctuary Guard'),second=put('A','Sanctuary Guard');
  first.cardData.faccao='Gray';
  enforceNamedSaintLegendaryRule('A',second.card.uid);
  assert.equal(zoneBrowserState,null);assert.equal(zone(first),'battlefield');assert.equal(zone(second),'battlefield');
`, false, true);

test('Conceder contra a IA perde o humano mesmo durante o turno da IA', `
  main();uiSettings.ai=true;gameState.currentPlayer='B';
  assert.equal(api.dispatch({type:'concede',playerKey:'B'}),false);
  assert.equal(gameState.victory,null);
  assert.equal(api.dispatch({type:'concede',playerKey:'A'}),true);
  assert.equal(gameState.victory.winnerKey,'B');assert.equal(gameState.victory.loserKey,'A');
`, false, true);

test('A UI não controla a IA por comandos públicos', `
  main();uiSettings.ai=true;gameState.currentPlayer='B';
  const before=api.revision;
  assert.equal(api.dispatch({type:'next-phase',playerKey:'B'}),false);
  assert.equal(api.revision,before);assert.equal(gameState.currentPhase,'main');
`, false, true);

test('Todas as 16 Techniques/Moments da beta completam a resolução pela API', `
  const spells=Object.values(cardsById).filter(c=>['Moment','Technique'].includes(c.tipo));
  assert.equal(spells.length,16);
  for (const card of spells) {
    main();player().cosmo=40;player().latentCosmo=5;
    const devotee=put('A','Seiya, Pegasus Saint','battlefield',{enteredCombatThisTurn:true});
    put('B','Saga, Gemini Gold Saint','battlefield',{enteredCombatThisTurn:true});
    put('A','Libra Sword');
    put('A','Sagittarius Cloth','battlefield',{attachedToUid:devotee.card.uid,damageCounters:3});
    put('A','Marin, Silver Saint','tartarus');
    const source=put('A',card.id,'hand');
    assert.equal(api.dispatch({type:'play',playerKey:'A',uid:source.card.uid}),true,card.nome_exibicao_en);
    assert.equal(api.dispatch({type:'pass-priority',playerKey:'B'}),true,card.nome_exibicao_en);
    if(zoneBrowserState){api.dispatch({type:'zone-select',uid:zoneBrowserState.entries[0]});api.dispatch({type:'zone-confirm'});}
    if(spellResolutionState){const target=api.targets()[0];assert.ok(target,card.nome_exibicao_en);api.dispatch({type:'target',target});}
    assert.equal(zone(source),'tartarus',card.nome_exibicao_en);
    assert.equal(actionStack.length,0,card.nome_exibicao_en);
  }
`, false, true);

test('Spell sem alvos após resposta deixa a pilha sem devolver custo ou travar a mão', `
  main();player().cosmo=10;
  const relic=put('B','Libra Sword'),spell=put('A','Shatter Faith','hand');
  api.dispatch({type:'play',playerKey:'A',uid:spell.card.uid});
  const paid=player().cosmo;relocateCard('B',relic.card.uid,'void',{force:true});
  api.dispatch({type:'pass-priority',playerKey:'B'});
  assert.equal(zone(spell),'tartarus');assert.equal(player().cosmo,paid);
  assert.equal(spellResolutionState,null);assert.equal(actionStack.length,0);
`, false, true);

test('Libra Cloth equipa Shiryu sem custo conforme seu texto; outro portador paga', `
  main();const shiryu=put('A','Shiryu, Dragon Saint'),hyoga=put('A','Hyoga, Cygnus Saint'),cloth=put('A','Libra Cloth');
  player().cosmo=10;
  const options=getEquipTargetOptions('A',cloth.card.uid);
  assert.equal(options.find(t=>t.uid===shiryu.card.uid).equipCost,0);
  assert.equal(options.find(t=>t.uid===hyoga.card.uid).equipCost,cloth.cardData.equipar_custo);
  startEquipSelection('A',cloth.card.uid);resolveEquipSelection(shiryu.card.uid);
  assert.equal(cloth.card.attachedToUid,shiryu.card.uid);assert.equal(player().cosmo,10);
`, false, true);

let passed = 0;
let failed = 0;
let skipped = 0;
console.log(`Regras: ${path.relative(root, runtime)}${strict ? ' (contrato estrito)' : ''}`);
for (const scenario of cases) {
  if (scenario.factoryOnly && !factory) {
    skipped += 1;
    console.log(`OMITIDO ${scenario.name} (engine modular)`);
    continue;
  }
  if (scenario.gap && !strict && !(scenario.gap === 'legacy' && factory)) {
    skipped += 1;
    console.log(`PENDENTE ${scenario.name}`);
    continue;
  }
  try {
    const run = createHarness();
    run(scenario.code);
    passed += 1;
    console.log(`OK ${scenario.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FALHOU ${scenario.name}\n  ${String(error.stack || error).split('\n').slice(0, 5).join('\n  ')}`);
  }
}
console.log(`${passed} passaram; ${failed} falharam; ${skipped} cenários omitidos ou pendentes do legado.`);
if (failed) process.exitCode = 1;
