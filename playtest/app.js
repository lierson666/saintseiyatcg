import { sfx, playMusic } from "./audio.js?v=1";
import { initMenu } from "./menu.js?v=1";

const PLAYER_ORDER = ["A", "B"];
const CARD_ZONES = ["hand", "battlefield", "cosmo_base", "tartarus", "void"];
const DROP_ZONES = new Set(CARD_ZONES);
const ZONE_LABELS = {
  deck: "Deck",
  hand: "Hand",
  battlefield: "Battlefield",
  cosmo_base: "Cosmo Base",
  tartarus: "Tartarus",
  void: "Void"
};
const QUICK_MOVE_ORDER = ["battlefield", "cosmo_base", "hand", "tartarus", "void"];
const LOGO_SRC = "../LOGO/logo-web.webp";
const ATHENA_GOD_ID = "athena-001";
const SANCTUARY_DOMAIN_ID = "athena-051";
const STAR_HILL_DOMAIN_ID = "athena-052";
const COLISEUM_DOMAIN_ID = "athena-053";

let cardsData = null;
let betaData = null;
let cardsById = {};
let decksById = {};
let nextInstanceId = 1;
let gameState = null;
let selectedInspector = null;
let hoverPreview = null;
let floatingInfoState = null;
let dragState = null;
let activeDropTarget = null;
let suppressNextClick = false;
let suppressClickUntil = 0;
let contextMenuState = null;
let dockTab = "log";
let optionsMenuOpen = false;
let targetingState = null;
let aiTurnInProgress = false;
let aiTurnTimer = null;
let priorityTimer = null;
let newGameState = null;
let mulliganState = null;
let paymentState = null;
let spellResolutionState = null;
let equipSelectionState = null;
let heldCardState = null;
let zoneSelectionState = null;
let zoneBrowserState = null;
let combatToastState = null;
let logPopupOpen = false;
let battlefieldSelection = createEmptyBattlefieldSelection();
let battlefieldLayoutSyncFrame = null;
let lastBattlefieldMoveAt = 0;
// Arena-style declare-attackers step: [{ uid, target }] for player A, plus the attacker awaiting a target.
let attackDeclare = null;
let attackQueue = [];
let shiftHeld = false;
let pointerClient = { x: 0, y: 0 };
// Hand card under the pointer; re-renders recreate the card, so it is born lifted instead of re-animating.
let hoveredHandUid = null;
let renderMemory = null;
// Optional Three.js effects layer (fx3d.js); null means the CSS fallback is used.
let fx = null;

const SETTINGS_KEY = "ssTcgSettings";
const AI_SPEED_MULTIPLIERS = { slow: 5, normal: 2.5, fast: 1 };
const uiSettings = loadUiSettings();

let AI_DELAY_MS = 0;
let AI_SHORT_DELAY_MS = 0;
let COMBAT_STEP_DELAY_MS = 0;
applyAiSpeed();

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const BATTLEFIELD_STACK_WIDTH = 196;
const BATTLEFIELD_STACK_HEIGHT = 235;
const BATTLEFIELD_SAFE_SPACING_X_PX = 256;
const BATTLEFIELD_SAFE_SPACING_Y_PX = 272;
const BATTLEFIELD_MIN_ROOT_GAP_PX = 15;

const elements = {
  viewport: document.querySelector(".viewport"),
  shell: document.querySelector(".playtest-shell"),
  stage: document.querySelector(".arena-stage"),
  toggleOptions: document.querySelector("#toggle-options"),
  optionsMenu: document.querySelector("#options-menu"),
  aiPlayerB: document.querySelector("#ai-player-b"),
  deckA: document.querySelector("#deck-a"),
  deckB: document.querySelector("#deck-b"),
  startMatch: document.querySelector("#start-match"),
  swapDecks: document.querySelector("#swap-decks"),
  nextTurn: document.querySelector("#next-turn"),
  resetMatch: document.querySelector("#reset-match"),
  turnIndicator: document.querySelector("#turn-indicator"),
  hoverPreview: document.querySelector("#hover-preview"),
  floatingInfo: document.querySelector("#floating-info"),
  logPopup: document.querySelector("#log-popup"),
  victoryOverlay: document.querySelector("#victory-overlay"),
  newGameOverlay: document.querySelector("#new-game-overlay"),
  mulliganOverlay: document.querySelector("#mulligan-overlay"),
  paymentOverlay: document.querySelector("#payment-overlay"),
  spellOverlay: document.querySelector("#spell-overlay"),
  equipOverlay: document.querySelector("#equip-overlay"),
  zoneBrowserOverlay: document.querySelector("#zone-browser-overlay"),
  combatToast: document.querySelector("#combat-toast"),
  zoneSelectionOverlay: document.querySelector("#zone-selection-overlay"),
  dockTabContent: document.querySelector("#dock-tab-content"),
  actionBar: document.querySelector("#action-bar"),
  bottomLogPanel: document.querySelector("#bottom-log-panel"),
  bottomPhasePanel: document.querySelector("#bottom-phase-panel"),
  contextMenu: document.querySelector("#context-menu"),
  combatOverlay: document.querySelector("#combat-overlay"),
  heroSlots: {
    A: {
      domain: document.querySelector("#player-a-domain-slot"),
      god: document.querySelector("#player-a-god-slot")
    },
    B: {
      god: document.querySelector("#player-b-god-slot"),
      domain: document.querySelector("#player-b-domain-slot")
    }
  },
  boards: {
    A: document.querySelector("#player-a-board"),
    B: document.querySelector("#player-b-board")
  }
};

init().catch((error) => {
  elements.turnIndicator.textContent = "Failed to load the playtest app.";
  if (elements.floatingInfo) {
    elements.floatingInfo.innerHTML = `
      <div class="floating-info__header">
        <div class="floating-info__header-copy">
          <h3 class="floating-info__title">Load Error</h3>
          <p class="floating-info__meta">The playtest app could not start.</p>
        </div>
      </div>
      <div class="floating-info__body">
        <p class="floating-info__owner">${escapeHtml(error.message)}</p>
      </div>
    `;
    elements.floatingInfo.classList.remove("hidden");
    elements.floatingInfo.setAttribute("aria-hidden", "false");
    elements.floatingInfo.style.left = "24px";
    elements.floatingInfo.style.top = "160px";
  }
  console.error(error);
});

async function init() {
  const [cardsResponse, betaResponse] = await Promise.all([
    fetch("../data/cards.json"),
    fetch("../data/beta-athena.json")
  ]);

  if (!cardsResponse.ok || !betaResponse.ok) {
    throw new Error("Could not load playtest data. Serve the project through a local HTTP server.");
  }

  cardsData = await cardsResponse.json();
  betaData = await betaResponse.json();
  cardsById = Object.fromEntries(cardsData.cartas.map((card) => [card.id, card]));
  decksById = Object.fromEntries(betaData.decks.map((deck) => [deck.id, deck]));

  populateDeckSelectors();
  renderCoverage();
  bindStaticControls();
  bindCardTilt();
  bindArenaInput();
  import("./fx3d.js?v=14")
    .then((module) => module.createFx())
    .then((layer) => {
      fx = layer;
    })
    .catch(() => {
      fx = null;
    });
  updateViewportScale();
  newGameState = createNewGameState();
  renderEmptyBoards();
  renderOptionsMenu();
  renderInspector();
  renderDockTabContent();
  renderActionBar();
  renderLog();
  renderNewGameOverlay();
  initMenu({
    cards: cardsData.cartas,
    onStart: (ai) => {
      elements.aiPlayerB.checked = ai;
      handleAiToggleChange();
      openNewGameOverlay();
    }
  });
}

function bindArenaInput() {
  let arrowFrame = 0;
  document.addEventListener("pointermove", (event) => {
    pointerClient = { x: event.clientX, y: event.clientY };
    const aiming = attackDeclare?.focusUid || targetingState?.source || gameState?.combat?.mode === "target";
    if (aiming && !arrowFrame) {
      arrowFrame = window.requestAnimationFrame(() => {
        arrowFrame = 0;
        renderCombatOverlay();
      });
    }
  }, { passive: true });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift") shiftHeld = false;
  });
  document.addEventListener("pointerover", (event) => {
    const card = event.target.closest?.(".seat--bottom .card.zone--hand[data-card-uid]");
    if (card) hoveredHandUid = card.dataset.cardUid;
  });
  document.addEventListener("pointerout", (event) => {
    const card = event.target.closest?.(".seat--bottom .card.zone--hand[data-card-uid]");
    if (!card || card.contains(event.relatedTarget)) return;
    card.classList.remove("is-hovered");
    if (hoveredHandUid === card.dataset.cardUid) hoveredHandUid = null;
  });
  window.addEventListener("blur", () => {
    shiftHeld = false;
  });
  document.addEventListener("pointerdown", (event) => {
    shiftHeld = event.shiftKey;
  }, { capture: true });

  document.addEventListener("change", (event) => {
    const id = event.target?.id;
    if (id === "setting-full-control") uiSettings.fullControl = event.target.checked;
    else if (id === "setting-auto-pass") uiSettings.autoPass = event.target.checked;
    else if (id === "setting-ai-speed") {
      uiSettings.aiSpeed = event.target.value;
      applyAiSpeed();
    } else return;
    saveUiSettings();
    if (gameState) renderGame();
  });
  syncSettingsControls();
}

// Pointer-driven 3D tilt and glare on hovered cards; purely visual, arena.css reads the vars.
function bindCardTilt() {
  let tiltedCard = null;

  const reset = () => {
    if (tiltedCard) {
      tiltedCard.style.removeProperty("--rx");
      tiltedCard.style.removeProperty("--ry");
      tiltedCard.style.removeProperty("--mx");
      tiltedCard.style.removeProperty("--my");
      tiltedCard = null;
    }
  };

  document.addEventListener("pointermove", (event) => {
    if (dragState?.dragging) {
      reset();
      return;
    }

    const card = event.target.closest?.(".card.zone--hand:not(.card--opponent-hand), .card.zone--battlefield, .mulligan-card, .zone-browser-card, .equip-target-card");
    if (card !== tiltedCard) {
      reset();
    }
    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - py) * 16).toFixed(2)}deg`);
    card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    tiltedCard = card;
  }, { passive: true });

  document.addEventListener("pointerleave", reset);
}

// ---------- Arena-style usability layer (interaction only, rules untouched) ----------

function loadUiSettings() {
  const defaults = { fullControl: false, autoPass: true, aiSpeed: "normal" };
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

function saveUiSettings() {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(uiSettings));
  } catch {
    // Private windows can block storage; settings then last for this session only.
  }
}

function applyAiSpeed() {
  const multiplier = AI_SPEED_MULTIPLIERS[uiSettings.aiSpeed] || AI_SPEED_MULTIPLIERS.normal;
  AI_DELAY_MS = 340 * multiplier;
  AI_SHORT_DELAY_MS = 260 * multiplier;
  COMBAT_STEP_DELAY_MS = 460 * multiplier;
}

function syncSettingsControls() {
  const fullControl = document.querySelector("#setting-full-control");
  const autoPass = document.querySelector("#setting-auto-pass");
  const aiSpeed = document.querySelector("#setting-ai-speed");
  if (fullControl) fullControl.checked = uiSettings.fullControl;
  if (autoPass) autoPass.checked = uiSettings.autoPass;
  if (aiSpeed) aiSpeed.value = uiSettings.aiSpeed;
}

function isAutoPassOn() {
  return uiSettings.autoPass && !uiSettings.fullControl;
}

function canPlayFromHandNow(playerKey, located) {
  if (!gameState || gameState.victory || !located || located.zone !== "hand" || attackDeclare) {
    return false;
  }
  if (isOverlayBlockingInput() || targetingState) {
    return false;
  }

  const player = gameState.players[playerKey];
  const card = located.cardData;
  const amount = typeof card.custo === "number" ? card.custo : 0;
  const affordable = getAvailableCosmo(player, card.unidade_custo || "cosmo") >= amount;

  if (card.tipo === "Technique" || card.tipo === "Moment") {
    const timingOk = card.tipo === "Moment" ? canCastMomentNow(playerKey) : canCastTechniqueNow(playerKey);
    return timingOk && affordable && !getSpellAvailabilityError(player, located);
  }

  if (card.tipo !== "Devotee" && card.tipo !== "Relic") {
    return false;
  }

  return gameState.currentPlayer === playerKey && gameState.currentPhase === "main" && !isPriorityWindowOpen() && affordable;
}

function canSetAsBaseNow(playerKey, located) {
  return Boolean(gameState && !attackDeclare && !isOverlayBlockingInput() && !isPriorityWindowOpen() && canRelocateCard(playerKey, located, "cosmo_base"));
}

// Double-click on a hand card: play it if possible, otherwise set it as Cosmo Base.
function playHandCard(playerKey, uid) {
  const located = findCardInstance(playerKey, uid);
  if (!located || located.zone !== "hand") {
    return;
  }

  const playable = canPlayFromHandNow(playerKey, located);
  const target = !playable && canSetAsBaseNow(playerKey, located) ? "cosmo_base" : "battlefield";
  const logLength = gameState.log.length;
  moveCard(playerKey, uid, target);

  const stillInHand = findCardInstance(playerKey, uid)?.zone === "hand";
  if (stillInHand && !paymentState && !spellResolutionState && !targetingState && gameState.log.length > logLength) {
    showCombatToast(gameState.log[gameState.log.length - 1]);
  }
}

// Arena auto-pay: choose the default plan unless the player asked to pick (Shift or Full control).
// Order is Latent -> Pool -> Cosmo Base ("mixed"); identical plans are deduped, so fall back by id.
function maybeAutoPay() {
  if (!paymentState) {
    return { pending: true };
  }
  if ((uiSettings.fullControl || shiftHeld) && paymentState.plans.length > 1) {
    return { pending: true };
  }

  const plan = ["mixed", "latent", "base"].map((id) => paymentState.plans.find((entry) => entry.id === id)).find(Boolean) || paymentState.plans[0];
  resolvePaymentChoice(plan.id);
  return { pending: true };
}

function canDeclareAttacker(playerKey, instance) {
  if (!instance || !isDevoteeCard(instance.cardId)) {
    return false;
  }
  const card = getCard(instance.cardId);
  return (
    !instance.tapped &&
    !instance.enteredCombatThisTurn &&
    !(instance.summoningSick && !hasKeyword(card, "Impulse", instance)) &&
    !hasKeyword(card, "Sealed", instance) &&
    Boolean(gameState.players[playerKey].zones.battlefield.find((entry) => entry.uid === instance.uid))
  );
}

function getEligibleAttackers(playerKey) {
  return gameState.players[playerKey].zones.battlefield.filter((instance) => canDeclareAttacker(playerKey, instance));
}

function getLegalAttackTargets(attacker) {
  const enemyKey = otherPlayerKey(attacker.card.owner);
  const targets = gameState.players[enemyKey].zones.battlefield
    .map((instance) => findCardInstance(enemyKey, instance.uid))
    .filter((located) => located && isAttackableCardTargetForAttacker(attacker, enemyKey, located.zone, located.card, located.cardData))
    .map((located) => ({ kind: "card", playerKey: enemyKey, uid: located.card.uid }));
  if (isAttackableGodTargetForAttacker(attacker, enemyKey)) {
    targets.unshift({ kind: "god", playerKey: enemyKey });
  }
  return targets;
}

// Like Arena, attackers default to the enemy God; with Guardian up, to the only legal Guardian.
function getDefaultAttackTarget(attacker) {
  const targets = getLegalAttackTargets(attacker);
  return targets[0]?.kind === "god" ? targets[0] : targets.length === 1 ? targets[0] : null;
}

function isLegalAttackTarget(attacker, target) {
  return getLegalAttackTargets(attacker).some((entry) => entry.kind === target.kind && entry.playerKey === target.playerKey && entry.uid === target.uid);
}

function getAttackBlockReason(attacker, target) {
  if (!attacker || isLegalAttackTarget(attacker, target)) {
    return "";
  }
  if (defendingPlayerHasGuardian(target.playerKey) && !hasKeyword(attacker.cardData, "Cheater")) {
    return "Guardian: a Guardian Devotee must be attacked first.";
  }
  return "Not a valid attack target.";
}

function getDeclareFocusAttacker() {
  if (!attackDeclare?.focusUid) {
    return null;
  }
  return findCardInstance("A", attackDeclare.focusUid);
}

function startAttackDeclare(preselectUid = null) {
  if (!gameState || gameState.currentPlayer !== "A" || gameState.currentPhase !== "main" || !canPlayerActNow("A")) {
    return;
  }
  attackDeclare = { entries: [], focusUid: null, history: [] };
  if (preselectUid) {
    toggleDeclareAttacker(preselectUid);
  }
}

function toggleDeclareAttacker(uid) {
  const index = attackDeclare.entries.findIndex((entry) => entry.uid === uid);
  if (index >= 0) {
    if (attackDeclare.focusUid !== uid) {
      attackDeclare.focusUid = uid;
      return;
    }
    const [removed] = attackDeclare.entries.splice(index, 1);
    attackDeclare.history.push({ type: "remove", entry: removed, index });
    attackDeclare.focusUid = attackDeclare.entries.find((entry) => !entry.target)?.uid || null;
    return;
  }

  const located = findCardInstance("A", uid);
  if (!located || !canDeclareAttacker("A", located.card)) {
    showCombatToast(`${located?.cardData.nome_exibicao_en || "That card"} cannot attack right now.`);
    return;
  }

  attackDeclare.entries.push({ uid, target: getDefaultAttackTarget(located) });
  attackDeclare.history.push({ type: "add", uid });
  attackDeclare.focusUid = uid;
}

function assignDeclareTarget(target) {
  const attacker = getDeclareFocusAttacker();
  const entry = attackDeclare.entries.find((item) => item.uid === attackDeclare.focusUid);
  if (!attacker || !entry) {
    showCombatToast("Select one of your attacking Devotees first.");
    return;
  }
  const reason = getAttackBlockReason(attacker, target);
  if (reason) {
    showCombatToast(reason);
    return;
  }
  attackDeclare.history.push({ type: "target", uid: entry.uid, previous: entry.target });
  entry.target = target;
  attackDeclare.focusUid = attackDeclare.entries.find((item) => !item.target)?.uid || entry.uid;
}

function declareAllAttackers() {
  getEligibleAttackers("A").forEach((instance) => {
    if (!attackDeclare.entries.some((entry) => entry.uid === instance.uid)) {
      toggleDeclareAttacker(instance.uid);
    }
  });
  attackDeclare.focusUid = attackDeclare.entries.find((entry) => !entry.target)?.uid || attackDeclare.focusUid;
}

function undoDeclareStep() {
  const step = attackDeclare?.history.pop();
  if (!step) {
    return;
  }
  if (step.type === "add") {
    attackDeclare.entries = attackDeclare.entries.filter((entry) => entry.uid !== step.uid);
  } else if (step.type === "remove") {
    attackDeclare.entries.splice(step.index, 0, step.entry);
  } else if (step.type === "target") {
    const entry = attackDeclare.entries.find((item) => item.uid === step.uid);
    if (entry) entry.target = step.previous;
  }
  attackDeclare.focusUid = attackDeclare.entries.find((entry) => !entry.target)?.uid || attackDeclare.entries.at(-1)?.uid || null;
}

function handleDeclareClick(cardElement, inspectElement) {
  if (inspectElement?.dataset.inspectKind === "god" && inspectElement.dataset.player === "B") {
    assignDeclareTarget({ kind: "god", playerKey: "B" });
    return true;
  }
  if (!cardElement) {
    return false;
  }
  const located = findCardInstance(cardElement.dataset.player, cardElement.dataset.cardUid);
  if (!located || located.zone !== "battlefield") {
    return false;
  }
  const rootUid = getBattlefieldRootUid(located.card);
  const root = findCardInstance(located.card.owner, rootUid);
  if (!root || !isDevoteeCard(root.cardId)) {
    return false;
  }
  if (root.card.owner === "A") {
    toggleDeclareAttacker(root.card.uid);
  } else {
    assignDeclareTarget({ kind: "card", playerKey: "B", uid: root.card.uid });
  }
  return true;
}

function confirmAttackDeclare() {
  if (!attackDeclare) {
    return;
  }
  attackQueue = attackDeclare.entries.filter((entry) => entry.target).map((entry) => ({ ...entry }));
  attackDeclare = null;
  if (attackQueue.length) {
    addLog(`Player A declares ${attackQueue.length} attacker${attackQueue.length > 1 ? "s" : ""}.`);
  }
  runNextQueuedAttack();
}

// The rules engine resolves one attack at a time, each with its own response window.
function runNextQueuedAttack() {
  while (attackQueue.length && gameState && !gameState.victory) {
    const next = attackQueue.shift();
    const attacker = findCardInstance("A", next.uid);
    if (!attacker || attacker.zone !== "battlefield" || !canDeclareAttacker("A", attacker.card)) {
      addLog("A declared attacker can no longer attack and is skipped.");
      continue;
    }
    if (!isLegalAttackTarget(attacker, next.target)) {
      addLog(`${attacker.cardData.nome_exibicao_en}'s attack is canceled: its target is no longer valid.`);
      showCombatToast(`${attacker.cardData.nome_exibicao_en}: target no longer valid.`);
      continue;
    }
    resolveEnterCombat("A", next.uid);
    gameState.combat.target = next.target;
    openCombatPriorityWindow();
    return;
  }
  attackQueue = [];
}

function passTurnFromMain() {
  if (gameState.currentPhase === "main") {
    advanceToNextPhase();
  }
  if (gameState.currentPhase === "end") {
    nextTurn();
  }
}

function goToPhase(phase) {
  const order = TURN_PHASES.map(([id]) => id);
  if (!gameState || isAiPlayer(gameState.currentPlayer) || order.indexOf(phase) <= order.indexOf(gameState.currentPhase)) {
    return;
  }
  let guard = 4;
  while (gameState.currentPhase !== phase && guard-- > 0 && advanceToNextPhase()) {
    // advance one phase per step so draw and triggers still happen in order
  }
}

// Contextual main button, like Arena's bottom-right button.
function getPrimaryAction() {
  if (!gameState || gameState.victory) {
    return { label: "Waiting", disabled: true, tone: "idle" };
  }
  if (newGameState?.open || mulliganState || paymentState || spellResolutionState || equipSelectionState || zoneBrowserState) {
    return { label: "Waiting", disabled: true, tone: "idle" };
  }
  if (isPriorityWindowOpen()) {
    const defenderIsLocal = !isAiPlayer(gameState.combat.priorityPlayerKey);
    return defenderIsLocal && !gameState.combat.resolving
      ? { label: "OK", sub: "Pass priority • combat resolves", action: "combat-priority-ok", tone: "blue" }
      : { label: "Resolving", sub: "Combat in progress", disabled: true, tone: "idle" };
  }
  if (targetingState) {
    return { label: "Cancel", sub: targetingState.prompt, action: "clear-targeting", tone: "grey" };
  }
  if (gameState.combat.attacker) {
    return { label: "Cancel", sub: "Cancel the attack", action: "clear-combat", tone: "grey" };
  }
  if (isAiPlayer(gameState.currentPlayer)) {
    return { label: "Opponent's Turn", sub: "Techniques glow when you can respond", disabled: true, tone: "idle" };
  }
  if (attackDeclare) {
    const ready = attackDeclare.entries.filter((entry) => entry.target).length;
    if (!attackDeclare.entries.length) {
      return { label: "No Attacks", sub: "Back to Main", action: "declare-cancel", tone: "grey" };
    }
    if (ready < attackDeclare.entries.length) {
      return { label: "Choose Target", sub: "Click the enemy God or a Devotee", disabled: true, tone: "idle" };
    }
    return { label: `Confirm Attack (${ready})`, sub: "Enter to confirm • Z to undo", action: "declare-confirm", tone: "orange" };
  }
  if (gameState.currentPhase === "upkeep" || gameState.currentPhase === "draw") {
    const next = gameState.currentPhase === "upkeep" ? "Draw" : "Main";
    return { label: "Next", sub: `To ${next}`, action: "next-phase", tone: "orange" };
  }
  if (gameState.currentPhase === "main") {
    if (gameState.currentPlayer === "A" && !attackQueue.length && getEligibleAttackers("A").length) {
      return { label: "Attack", sub: "Declare attackers", action: "declare-start", tone: "orange", secondary: [["End Turn", "pass-turn"]] };
    }
    return { label: "End Turn", sub: "Pass to the opponent", action: "pass-turn", tone: "orange" };
  }
  return { label: "End Turn", sub: "Pass to the opponent", action: "end-turn", tone: "orange" };
}

function triggerPrimaryAction() {
  const primary = getPrimaryAction();
  if (!primary.disabled && primary.action) {
    handleAction({ dataset: { action: primary.action } });
  }
}

// Auto-pass: skip your Upkeep/Draw and pass priority when no Technique is playable.
let autoPassTimer = null;
function scheduleAutoPassIfNeeded() {
  window.clearTimeout(autoPassTimer);
  autoPassTimer = null;
  if (!gameState || gameState.victory || !isAutoPassOn() || isAiPlayer("A")) {
    return;
  }

  if (isPriorityWindowOpen() && gameState.combat.priorityPlayerKey === "A" && !gameState.combat.resolving) {
    const canRespond = gameState.players.A.zones.hand.some((instance) => {
      const located = findCardInstance("A", instance.uid);
      return located?.cardData.tipo === "Technique" && canPlayFromHandNow("A", located);
    });
    if (!canRespond) {
      autoPassTimer = window.setTimeout(() => {
        if (isPriorityWindowOpen() && gameState.combat.priorityPlayerKey === "A") {
          resolveCombatFromPriority();
        }
      }, 700);
    }
    return;
  }

  const getsAutoAdvance =
    gameState.currentPlayer === "A" &&
    (gameState.currentPhase === "upkeep" || gameState.currentPhase === "draw") &&
    getPrimaryAction().action === "next-phase";
  if (getsAutoAdvance) {
    autoPassTimer = window.setTimeout(() => {
      if (gameState?.currentPlayer === "A" && getPrimaryAction().action === "next-phase") {
        advanceToNextPhase();
        renderGame();
      }
    }, 650);
  }
}

// Turn banner, floating damage numbers and enter-the-battlefield flights, driven by state diffs.
function renderFeedback() {
  if (!gameState) {
    renderMemory = null;
    return;
  }

  const snapshot = {
    turnKey: `${gameState.turnNumber}:${gameState.currentPlayer}`,
    soul: { A: gameState.players.A.god.soul, B: gameState.players.B.god.soul },
    damage: {},
    battlefield: new Set(),
    // Last on-screen rects, so the 3D layer can fly cards from the hand and burst where cards died.
    rects: {}
  };
  PLAYER_ORDER.forEach((playerKey) => {
    gameState.players[playerKey].zones.battlefield.forEach((instance) => {
      snapshot.battlefield.add(instance.uid);
      snapshot.damage[instance.uid] = instance.damageCounters;
    });
  });
  document.querySelectorAll(".seat--bottom .card.zone--hand[data-card-uid], .battlefield-stack[data-battlefield-root]").forEach((node) => {
    snapshot.rects[node.dataset.cardUid || node.dataset.battlefieldRoot] = node.getBoundingClientRect();
  });

  const previous = renderMemory;
  renderMemory = snapshot;
  if (!previous || mulliganState) {
    return;
  }

  if (previous.turnKey !== snapshot.turnKey) {
    showTurnBanner(gameState.currentPlayer === "A" ? "Your Turn" : "Opponent's Turn", gameState.currentPlayer === "A");
  }

  PLAYER_ORDER.forEach((playerKey) => {
    const delta = snapshot.soul[playerKey] - previous.soul[playerKey];
    if (delta !== 0) {
      spawnFloatText(document.querySelector(`.arena-avatar[data-player="${playerKey}"] .arena-avatar__portrait`), delta > 0 ? `+${delta}` : `${delta}`, delta > 0 ? "heal" : "damage");
    }
  });

  Object.entries(snapshot.damage).forEach(([uid, damage]) => {
    const before = previous.damage[uid] ?? 0;
    if (damage > before) {
      spawnFloatText(document.querySelector(`.card[data-card-uid="${uid}"]`), `-${damage - before}`, "damage");
    }
  });

  snapshot.battlefield.forEach((uid) => {
    if (previous.battlefield.has(uid)) {
      return;
    }
    const stack = document.querySelector(`.battlefield-stack[data-battlefield-root="${uid}"]`);
    if (!stack) {
      return;
    }
    if (!fx) {
      sfx("play");
      stack.classList.add("is-entering");
      return;
    }
    const owner = stack.querySelector("[data-player]")?.dataset.player;
    const from = previous.rects[uid] || document.querySelector(`.seat--${owner === "A" ? "bottom" : "top"} .seat__hand`)?.getBoundingClientRect();
    if (!from) {
      return;
    }
    stack.style.visibility = "hidden";
    sfx("play");
    fx.flyCard(from, stack.getBoundingClientRect(), stack.querySelector("img")?.src, stack.querySelector("img")?.alt).then(() => {
      document.querySelector(`.battlefield-stack[data-battlefield-root="${uid}"]`)?.style.removeProperty("visibility");
    });
  });

  previous.battlefield.forEach((uid) => {
    const rect = previous.rects[uid];
    if (fx && rect && !snapshot.battlefield.has(uid)) {
      fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 0xb9a6ff, 90);
    }
  });
}

async function playAttackLunge(combat) {
  if (!fx || !combat?.attacker || !combat.target) {
    return;
  }
  const attacker = document.querySelector(`.card[data-card-uid="${combat.attacker.uid}"]`);
  const anchor = getCombatAnchor(combat.target, { left: 0, top: 0 });
  if (!attacker || !anchor) {
    return;
  }
  const size = 60;
  attacker.style.visibility = "hidden";
  await fx.lunge(attacker.getBoundingClientRect(), { left: anchor.x - size / 2, top: anchor.y - size / 2, width: size, height: size }, attacker.querySelector("img")?.src, attacker.querySelector("img")?.alt);
  attacker.style.removeProperty("visibility");
}

function spawnFloatText(anchor, text, kind) {
  if (!anchor) {
    return;
  }
  const rect = anchor.getBoundingClientRect();
  const node = document.createElement("div");
  node.className = `float-text float-text--${kind}`;
  node.textContent = text;
  node.style.left = `${rect.left + rect.width / 2}px`;
  node.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 1300);
  sfx(kind === "heal" ? "cosmo" : "impact");
  fx?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, kind === "heal" ? 0x7dffb0 : 0xff5a4e, 40);
}

function showTurnBanner(text, local) {
  const banner = document.querySelector("#turn-banner");
  if (!banner) {
    return;
  }
  // Span so the gradient lettering can sit on top of the banner's dark band.
  banner.replaceChildren(Object.assign(document.createElement("span"), { textContent: text }));
  banner.className = `turn-banner ${local ? "is-local" : "is-opponent"} is-visible`;
  sfx("turn");
  window.clearTimeout(showTurnBanner.timeoutId);
  showTurnBanner.timeoutId = window.setTimeout(() => {
    banner.className = "turn-banner hidden";
  }, 1500);
}

// Respond prompt plus a small stack panel describing what is resolving.
function renderPriorityAndStack() {
  const prompt = document.querySelector("#respond-prompt");
  const stack = document.querySelector("#stack-panel");
  if (!prompt || !stack) {
    return;
  }

  const combat = gameState?.combat;
  const describe = (entity) => {
    if (!entity) return "";
    if (entity.kind === "god") return `${playerLabel(entity.playerKey)}'s God`;
    return findCardInstance(entity.playerKey, entity.uid)?.cardData.nome_exibicao_en || "a card";
  };

  const localMustAnswer = isPriorityWindowOpen() && !isAiPlayer(combat.priorityPlayerKey) && !combat.resolving;
  if (localMustAnswer) {
    const responder = combat.priorityPlayerKey;
    const playable = gameState.players[responder].zones.hand.filter((instance) => {
      const located = findCardInstance(responder, instance.uid);
      return located?.cardData.tipo === "Technique" && canPlayFromHandNow(responder, located);
    }).length;
    prompt.innerHTML = `
      <span class="respond-prompt__title">Respond?</span>
      <span class="respond-prompt__copy">${escapeHtml(describe(combat.attacker))} attacks ${escapeHtml(describe(combat.target))}. ${playable ? `${playable} Technique${playable > 1 ? "s" : ""} can respond.` : "No Technique can respond."}</span>
      <button class="primary" data-action="combat-priority-ok">OK</button>
    `;
    prompt.classList.remove("hidden");
  } else {
    prompt.classList.add("hidden");
    prompt.innerHTML = "";
  }

  const items = [];
  if (combat?.attacker && combat.target) {
    const attacker = findCardInstance(combat.attacker.playerKey, combat.attacker.uid);
    items.push({
      image: attacker?.cardData.caminho_imagem,
      title: attacker?.cardData.nome_exibicao_en || "Attack",
      detail: `Attacks ${describe(combat.target)}${combat.resolving ? " • resolving" : ""}`
    });
  }
  if (spellResolutionState) {
    items.push({ image: null, title: spellResolutionState.cardName || "Spell", detail: spellResolutionState.stageLabel || "Resolving" });
  }
  attackQueue.forEach((entry) => {
    const attacker = findCardInstance("A", entry.uid);
    items.push({ image: attacker?.cardData.caminho_imagem, title: attacker?.cardData.nome_exibicao_en || "Attacker", detail: `Queued • ${describe(entry.target)}` });
  });

  if (!items.length) {
    stack.classList.add("hidden");
    stack.innerHTML = "";
    return;
  }
  stack.innerHTML = `
    <div class="stack-panel__title">Stack</div>
    ${items.map((item) => `
      <div class="stack-panel__item">
        ${item.image ? `<img src="../${escapeHtml(item.image)}" alt="">` : '<span class="stack-panel__blank"></span>'}
        <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>
      </div>`).join("")}
  `;
  stack.classList.remove("hidden");
}

function populateDeckSelectors() {
  const options = betaData.decks
    .map((deck) => {
      const domain = getCard(deck.domain_id);
      return `<option value="${deck.id}">${escapeHtml(deck.nome)} (${escapeHtml(domain.nome_exibicao_en)})</option>`;
    })
    .join("");

  elements.deckA.innerHTML = options;
  elements.deckB.innerHTML = options;
  elements.deckA.value = "athena-beta-seiya";
  elements.deckB.value = "athena-beta-hyoga";
}

function createNewGameState(overrides = {}) {
  return {
    open: true,
    deckAId: overrides.deckAId || elements.deckA?.value || "athena-beta-seiya",
    deckBId: overrides.deckBId || elements.deckB?.value || "athena-beta-hyoga",
    startingPlayer: overrides.startingPlayer || "random"
  };
}

function createEmptyBattlefieldSelection() {
  return {
    A: new Set(),
    B: new Set()
  };
}

function bindStaticControls() {
  elements.toggleOptions.addEventListener("click", toggleOptionsMenu);
  if (elements.aiPlayerB) {
    elements.aiPlayerB.addEventListener("change", handleAiToggleChange);
  }
  elements.startMatch.addEventListener("click", openNewGameOverlay);
  elements.swapDecks.addEventListener("click", swapDecks);
  elements.nextTurn.addEventListener("click", nextTurn);
  elements.resetMatch.addEventListener("click", resetMatch);
  document.addEventListener("change", handleGlobalChange);
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("dblclick", handleDoubleClick);
  document.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mouseover", handleHoverPreview);
  document.addEventListener("mouseout", handleHoverOut);
  document.addEventListener("wheel", handleHoverPreviewWheel, { passive: false });
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("pointermove", handlePointerMove, { passive: false });
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("resize", handleViewportResize);
}

function openNewGameOverlay() {
  newGameState = createNewGameState({
    deckAId: elements.deckA?.value,
    deckBId: elements.deckB?.value,
    startingPlayer: gameState?.startingPlayerChoice || "random"
  });
  renderNewGameOverlay();
}

function handleGlobalChange(event) {
  if (!newGameState) {
    return;
  }

  if (event.target.id === "new-game-deck-a") {
    newGameState.deckAId = event.target.value;
  } else if (event.target.id === "new-game-deck-b") {
    newGameState.deckBId = event.target.value;
  } else if (event.target.id === "new-game-starting-player") {
    newGameState.startingPlayer = event.target.value;
  }
}

function startMatch(config = {}) {
  clearAiTurnTimer();
  clearPriorityTimer();
  aiTurnInProgress = false;
  nextInstanceId = 1;
  selectedInspector = null;
  hoverPreview = null;
  floatingInfoState = null;
  targetingState = null;
  mulliganState = null;
  paymentState = null;
  spellResolutionState = null;
  equipSelectionState = null;
  heldCardState = null;
  zoneSelectionState = null;
  zoneBrowserState = null;
  combatToastState = null;
  logPopupOpen = false;
  battlefieldSelection = createEmptyBattlefieldSelection();
  closeContextMenu();
  playMusic("battle");

  const deckAId = config.deckAId || elements.deckA.value;
  const deckBId = config.deckBId || elements.deckB.value;
  const startingPlayerChoice = config.startingPlayer || "A";
  const startingPlayer = startingPlayerChoice === "random"
    ? (Math.random() < 0.5 ? "A" : "B")
    : startingPlayerChoice;
  elements.deckA.value = deckAId;
  elements.deckB.value = deckBId;

  const deckA = decksById[deckAId];
  const deckB = decksById[deckBId];

  gameState = {
    turnNumber: 1,
    currentPlayer: startingPlayer,
    startingPlayer,
    startingPlayerChoice,
    openingDrawSkipped: false,
    currentPhase: "main",
    victory: null,
    combat: createEmptyCombatState(),
    aiResume: null,
    log: [],
    players: {
      A: createPlayerState("A", deckA),
      B: createPlayerState("B", deckB)
    }
  };

  addLog(`Match started: ${deckA.nome} vs ${deckB.nome}.`);
  addLog("Each player shuffles and draws 7 cards.");
  addLog(`${playerLabel(startingPlayer)} will take the first turn${startingPlayerChoice === "random" ? " (random choice)." : "."}`);
  addLog("Player A reviews the opening hand and may take a mulligan.");
  mulliganState = createMulliganState("A");
  optionsMenuOpen = false;
  newGameState = null;
  renderGame();
}

function swapDecks() {
  const currentA = elements.deckA.value;
  elements.deckA.value = elements.deckB.value;
  elements.deckB.value = currentA;
}

function toggleOptionsMenu() {
  optionsMenuOpen = !optionsMenuOpen;
  renderOptionsMenu();
}

function resetMatch() {
  clearAiTurnTimer();
  clearPriorityTimer();
  aiTurnInProgress = false;
  cleanupDrag();
  gameState = null;
  selectedInspector = null;
  hoverPreview = null;
  floatingInfoState = null;
  targetingState = null;
  mulliganState = null;
  paymentState = null;
  spellResolutionState = null;
  equipSelectionState = null;
  heldCardState = null;
  zoneSelectionState = null;
  zoneBrowserState = null;
  combatToastState = null;
  logPopupOpen = false;
  battlefieldSelection = createEmptyBattlefieldSelection();
  newGameState = createNewGameState();
  closeContextMenu();
  optionsMenuOpen = false;
  elements.turnIndicator.textContent = "Load a match to begin.";
  renderEmptyBoards();
  renderInspector();
  renderDockTabContent();
  renderActionBar();
  renderCombatOverlay();
  renderZoneSelectionOverlay();
  renderLog();
  renderMulliganOverlay();
  renderPaymentOverlay();
  renderSpellResolutionOverlay();
  renderEquipOverlay();
  renderZoneBrowserOverlay();
  renderCombatToast();
  renderVictoryOverlay();
  renderNewGameOverlay();
}

function handleAiToggleChange() {
  clearAiTurnTimer();
  if (!elements.aiPlayerB?.checked) {
    aiTurnInProgress = false;
    return;
  }
  scheduleAiTurnIfNeeded();
}

function createPlayerState(playerKey, deckDefinition) {
  const godCard = clone(getCard(betaData.god_id));
  const deckInstances = [];

  deckDefinition.main_deck.forEach((entry) => {
    for (let copyIndex = 0; copyIndex < entry.quantity; copyIndex += 1) {
      deckInstances.push(createCardInstance(playerKey, deckDefinition.id, entry.card_id));
    }
  });

  shuffle(deckInstances);

  const player = {
    key: playerKey,
    label: `Player ${playerKey}`,
    deckId: deckDefinition.id,
    deckName: deckDefinition.nome,
    archetype: deckDefinition.arquetipo,
    notesPt: deckDefinition.notas_pt,
    validationFocus: deckDefinition.foco_validacao_pt,
    lostByDeckOut: false,
    god: {
      cardId: godCard.id,
      soul: godCard.soul,
      attack: godCard.attack,
      awaken: godCard.awaken,
      awakened: false,
      preventDamageUntilEnd: false
    },
    domainId: deckDefinition.domain_id,
    domainUsed: false,
    cosmo: 0,
    latentCosmo: 0,
    playedBaseThisTurn: false,
    freeEquipTargetUid: null,
    zones: {
      deck: deckInstances,
      hand: [],
      battlefield: [],
      cosmo_base: [],
      tartarus: [],
      void: []
    }
  };

  drawCards(player, 7, false);
  return player;
}

function createCardInstance(playerKey, deckId, cardId) {
  return {
    uid: `card-${nextInstanceId++}`,
    owner: playerKey,
    sourceDeckId: deckId,
    cardId,
    tapped: false,
    plusOneCounters: 0,
    minusOneCounters: 0,
    sealCounters: 0,
    damageCounters: 0,
    turnPowerBonus: 0,
    turnResistanceBonus: 0,
    tempKeywords: [],
    generatedCosmoWhenTapped: false,
    preventDamageShield: 0,
    cannotBeDestroyedUntilEnd: false,
    enteredCombatThisTurn: false,
    summoningSick: false,
    sealLocked: false,
    attachedToUid: null,
    battlefieldPositionX: null,
    battlefieldPositionY: null,
    battlefieldPositionPinned: false
  };
}

function createEmptyCombatState() {
  return {
    attacker: null,
    target: null,
    mode: null,
    priorityPlayerKey: null,
    responseActive: false,
    resolving: false,
    resumeAiAfterResolution: false,
    cosmoOfHopeTriggeredFor: {
      A: false,
      B: false
    }
  };
}

function createMulliganState(playerKey) {
  return {
    playerKey,
    selectedUids: []
  };
}

function drawCards(player, count, writeLog = true) {
  let drawn = 0;

  while (drawn < count && player.zones.deck.length > 0) {
    const nextCard = player.zones.deck.shift();
    player.zones.hand.push(nextCard);
    drawn += 1;
  }

  if (writeLog && drawn > 0) {
    addLog(`${player.label} draws ${drawn} card${drawn > 1 ? "s" : ""}.`);
  }

  if (drawn < count) {
    addLog(`${player.label} cannot draw enough cards. Deck is empty.`);
    player.lostByDeckOut = true;
  }
}

function toggleMulliganSelection(uid) {
  if (!mulliganState) {
    return;
  }

  const selected = new Set(mulliganState.selectedUids);
  if (selected.has(uid)) {
    selected.delete(uid);
  } else {
    selected.add(uid);
  }
  mulliganState.selectedUids = [...selected];
}

function keepOpeningHand() {
  if (!mulliganState || !gameState) {
    return;
  }

  const player = gameState.players[mulliganState.playerKey];
  addLog(`${player.label} keeps the opening hand.`);
  addLog(`${playerLabel(gameState.startingPlayer || "A")} begins the match.`);
  mulliganState = null;
  beginTurn(gameState.players[gameState.currentPlayer]);
}

function resolveOpeningMulligan() {
  if (!mulliganState || !gameState) {
    return;
  }

  const player = gameState.players[mulliganState.playerKey];
  const opponent = gameState.players[otherPlayerKey(mulliganState.playerKey)];
  const selected = player.zones.hand.filter((instance) => mulliganState.selectedUids.includes(instance.uid));

  if (selected.length === 0) {
    addLog("Select at least one card to mulligan.");
    return;
  }

  player.zones.hand = player.zones.hand.filter((instance) => !mulliganState.selectedUids.includes(instance.uid));
  player.zones.deck.push(...selected.map((instance) => {
    instance.tapped = false;
    return instance;
  }));
  shuffle(player.zones.deck);
  drawCards(player, selected.length, false);

  opponent.latentCosmo = Math.max(opponent.latentCosmo, 1);
  addLog(`${player.label} mulligans ${selected.length} card${selected.length > 1 ? "s" : ""}.`);
  addLog(`${opponent.label} starts the game with 1 Latent Cosmo because the opponent took a mulligan.`);
  addLog(`${playerLabel(gameState.startingPlayer || "A")} begins the match.`);
  mulliganState = null;
  beginTurn(gameState.players[gameState.currentPlayer]);
}

function nextTurn(force = false) {
  if (!gameState || gameState.victory) {
    return;
  }

  if (!force && gameState.currentPhase !== "end") {
    addLog("Use Next Phase until End Step before passing the turn.");
    return;
  }

  clearCombatState();
  const previousPlayerKey = gameState.currentPlayer;
  const previousPlayer = gameState.players[previousPlayerKey];
  if (previousPlayer.cosmo > 0) {
    addLog(`${previousPlayer.label} loses ${previousPlayer.cosmo} unspent Cosmo at end of turn.`);
    previousPlayer.cosmo = 0;
  }
  if (previousPlayer.latentCosmo > 0) {
    previousPlayer.latentCosmo = 0;
    addLog(`${previousPlayer.label} loses all Latent Cosmo at end of turn.`);
  }

  [previousPlayerKey, otherPlayerKey(previousPlayerKey)].forEach((playerKey) => {
    clearEndOfTurn(gameState.players[playerKey]);
  });

  const nextPlayerKey = otherPlayerKey(previousPlayerKey);
  if (nextPlayerKey === "A") {
    gameState.turnNumber += 1;
  }

  gameState.currentPlayer = nextPlayerKey;
  beginTurn(gameState.players[nextPlayerKey]);
  renderGame();
}

function beginTurn(player) {
  untapPlayer(player);
  const healed = healCloths(player);
  resolveStartOfTurnTriggers(player);
  syncAwakenState(player);
  player.playedBaseThisTurn = false;
  gameState.currentPhase = "upkeep";
  addLog(`Turn ${gameState.turnNumber} begins for ${player.label}. Entering Upkeep.`);
  showCombatToast(`TURN ${gameState.turnNumber} • ${player.label} • UPKEEP`);
  if (healed > 0) {
    addLog(`${player.label} restores 1 Damage from ${healed} Cloth${healed > 1 ? "s" : ""}.`);
  }
}

function advanceToNextPhase(fromAi = false) {
  if (!gameState || gameState.victory) {
    return false;
  }

  if (!fromAi && isAiPlayer(gameState.currentPlayer)) {
    addLog("Only the active local player can advance the phase manually.");
    return false;
  }

  if (gameState.currentPhase === "upkeep") {
    setPhase("draw");
    const activePlayer = gameState.players[gameState.currentPlayer];
    const skipOpeningDraw =
      !gameState.openingDrawSkipped &&
      gameState.turnNumber === 1 &&
      gameState.currentPlayer === gameState.startingPlayer;

    if (skipOpeningDraw) {
      gameState.openingDrawSkipped = true;
      addLog(`${activePlayer.label} skips the first Draw Step for starting the game.`);
    } else {
      drawCards(activePlayer, 1);
      syncAwakenState(activePlayer);
    }
    showCombatToast("DRAW STEP");
    return true;
  }

  if (gameState.currentPhase === "draw") {
    setPhase("main");
    showCombatToast("MAIN PHASE");
    return true;
  }

  if (gameState.currentPhase === "main") {
    setPhase("end");
    showCombatToast("END STEP");
    return true;
  }

  addLog("You are already in End Step. Use End Turn to pass the turn.");
  return false;
}

function untapPlayer(player) {
  let untapped = 0;
  const sealedHeld = [];
  player.cosmo = 0;

  ["battlefield", "cosmo_base"].forEach((zoneId) => {
    player.zones[zoneId].forEach((instance) => {
      if (zoneId === "battlefield" && isDevoteeCard(instance.cardId) && instance.sealCounters > 0) {
        instance.sealCounters = Math.max(0, instance.sealCounters - 1);
        instance.tapped = true;
        instance.sealLocked = true;
        instance.generatedCosmoWhenTapped = false;
        sealedHeld.push(getCard(instance.cardId).nome_exibicao_en);
        return;
      }

      if (zoneId === "battlefield" && isDevoteeCard(instance.cardId) && instance.sealLocked) {
        instance.sealLocked = false;
      }

      if (instance.tapped) {
        instance.tapped = false;
        instance.generatedCosmoWhenTapped = false;
        untapped += 1;
      }
    });
  });

  if (untapped > 0) {
    addLog(`${player.label} untaps ${untapped} card${untapped > 1 ? "s" : ""}.`);
  }

  sealedHeld.forEach((cardName) => {
    addLog(`${player.label} removes 1 Seal counter from ${cardName} during Upkeep. It stays tapped until the next Upkeep.`);
  });
}

function healCloths(player) {
  let healed = 0;

  player.zones.battlefield.forEach((instance) => {
    if (isClothCard(instance.cardId) && instance.damageCounters > 0) {
      instance.damageCounters -= 1;
      healed += 1;
    }
  });

  return healed;
}

function resolveStartOfTurnTriggers(player) {
  const sources = [
    { kind: "domain", cardData: getCard(player.domainId), instance: null },
    ...player.zones.battlefield.map((instance) => ({
      kind: "battlefield",
      cardData: getCard(instance.cardId),
      instance
    }))
  ];

  sources.forEach((source) => {
    const rules = getCardRulesLines(source.cardData).filter((line) => /at the beginning of your turn/i.test(line));
    rules.forEach((line) => {
      resolveStartOfTurnRule(player, source, line);
    });
  });
}

function resolveStartOfTurnRule(player, source, line) {
  if (/at the beginning of your turn,\s*generate 1 latent cosmo/i.test(line)) {
    player.latentCosmo += 1;
    addLog(`${player.label} gains 1 Latent Cosmo from ${source.cardData.nome_exibicao_en}.`);
    return;
  }

  addLog(`${source.cardData.nome_exibicao_en} has a start-of-turn trigger that still needs automation.`);
}

function clearEndOfTurn(player) {
  let cleared = 0;
  let recoveredDevotees = 0;
  player.god.preventDamageUntilEnd = false;
  player.freeEquipTargetUid = null;

  for (const zoneId of CARD_ZONES) {
    player.zones[zoneId].forEach((instance) => {
      const hadTemporaryState =
        instance.turnPowerBonus !== 0 ||
        instance.turnResistanceBonus !== 0 ||
        instance.enteredCombatThisTurn ||
        instance.summoningSick ||
        instance.preventDamageShield > 0 ||
        instance.tempKeywords.length > 0 ||
        instance.cannotBeDestroyedUntilEnd ||
        (!isClothCard(instance.cardId) && instance.damageCounters > 0);

      if (!isClothCard(instance.cardId) && isDevoteeCard(instance.cardId) && instance.damageCounters > 0) {
        recoveredDevotees += 1;
      }

      instance.turnPowerBonus = 0;
      instance.turnResistanceBonus = 0;
      instance.enteredCombatThisTurn = false;
      instance.summoningSick = false;
      instance.preventDamageShield = 0;
      instance.tempKeywords = [];
      instance.cannotBeDestroyedUntilEnd = false;
      if (!isClothCard(instance.cardId)) {
        instance.damageCounters = 0;
      }

      if (hadTemporaryState) {
        cleared += 1;
      }
    });
  }

  if (cleared > 0) {
    addLog(`${player.label} clears ${cleared} temporary combat effect${cleared > 1 ? "s" : ""}.`);
  }

  if (recoveredDevotees > 0) {
    addLog(`${player.label} removes all marked damage from ${recoveredDevotees} Devotee${recoveredDevotees > 1 ? "s" : ""} at end of turn.`);
  }
}

function syncAwakenState(player) {
  if (!player.god.awakened && player.god.soul <= player.god.awaken) {
    player.god.awakened = true;
    addLog(`${player.label} enters Awaken.`);
  }
}

function declareVictory(winnerKey, loserKey, reason) {
  if (!gameState || gameState.victory) {
    return;
  }

  clearAiTurnTimer();
  clearPriorityTimer();
  aiTurnInProgress = false;
  clearCombatState();
  gameState.victory = {
    winnerKey,
    loserKey,
    reason,
    message: `PLAYER ${winnerKey} WINS!`
  };
  // Against the AI, Player B winning is a defeat for the human.
  sfx(winnerKey === "B" && elements.aiPlayerB?.checked ? "defeat" : "victory");
  playMusic("menu");

  const loser = gameState.players[loserKey];
  const reasonText = reason === "deckout"
    ? `${loser.label} loses by trying to draw from an empty Deck.`
    : `${loser.label}'s God reaches 0 Soul.`;
  addLog(`${gameState.players[winnerKey].label} wins the match. ${reasonText}`);
}

function evaluateVictoryState() {
  if (!gameState || gameState.victory) {
    return gameState?.victory || null;
  }

  const soulLoser = PLAYER_ORDER.find((playerKey) => gameState.players[playerKey].god.soul <= 0);
  if (soulLoser) {
    declareVictory(otherPlayerKey(soulLoser), soulLoser, "soul");
    return gameState.victory;
  }

  const deckLoser = PLAYER_ORDER.find((playerKey) => gameState.players[playerKey].lostByDeckOut);
  if (deckLoser) {
    declareVictory(otherPlayerKey(deckLoser), deckLoser, "deckout");
    return gameState.victory;
  }

  return null;
}

function isOverlayBlockingInput() {
  return Boolean(newGameState?.open || mulliganState || paymentState || spellResolutionState || equipSelectionState || zoneBrowserState || gameState?.combat?.resolving || gameState?.victory);
}

function isPriorityWindowOpen() {
  return Boolean(gameState?.combat?.mode === "priority" && gameState?.combat?.attacker && gameState?.combat?.target);
}

function isPriorityPlayer(playerKey) {
  return Boolean(isPriorityWindowOpen() && gameState.combat.priorityPlayerKey === playerKey);
}

function canPlayerActNow(playerKey) {
  if (!gameState || playerKey !== gameState.currentPlayer) {
    return false;
  }

  return !isOverlayBlockingInput() && !isPriorityWindowOpen();
}

function canPlayerUsePriorityActions(playerKey) {
  if (!gameState || !isPriorityWindowOpen()) {
    return false;
  }

  return gameState.combat.priorityPlayerKey === playerKey && gameState.combat.responseActive;
}

function handleGlobalClick(event) {
  if (Date.now() < suppressClickUntil && !event.target.closest("#context-menu, #floating-info, #hover-preview")) {
    return;
  }

  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  if (optionsMenuOpen && !event.target.closest("#options-menu, #toggle-options")) {
    optionsMenuOpen = false;
    renderOptionsMenu();
  }

  if (!event.target.closest("#context-menu")) {
    closeContextMenu();
  }

  if (!event.target.closest("#floating-info")) {
    closeFloatingInfo();
  }

  if (!event.target.closest("#log-popup, [data-action=\"toggle-log-popup\"]")) {
    closeLogPopup();
  }

  const actionElement = event.target.closest("[data-action]");
  if (actionElement) {
    handleAction(actionElement);
    return;
  }

  if (paymentState || zoneBrowserState) {
    return;
  }

  const inspectElement = event.target.closest("[data-inspect-kind]");
  const cardElement = event.target.closest("[data-card-uid]");

  if (!cardElement && !inspectElement && !event.target.closest("#hover-preview, #floating-info, #context-menu, #log-popup") && event.target.closest(".arena-stage")) {
    hoverPreview = null;
    clearBattlefieldSelection();
    renderGame();
    return;
  }

  if (attackDeclare && handleDeclareClick(cardElement, inspectElement)) {
    renderGame();
    return;
  }

  if (gameState?.combat?.mode && tryHandleCombatSelection(cardElement, inspectElement)) {
    renderGame();
    return;
  }

  if (targetingState && tryHandleTargetingSelection(cardElement, inspectElement)) {
    renderGame();
    return;
  }

  if (inspectElement && gameState) {
    selectedInspector = {
      kind: inspectElement.dataset.inspectKind,
      playerKey: inspectElement.dataset.player
    };
    renderInspector();
    return;
  }

  if (cardElement && gameState) {
    selectedInspector = {
      kind: "card",
      playerKey: cardElement.dataset.player,
      uid: cardElement.dataset.cardUid
    };
    renderGame();
  }
}

function handleHoverPreview(event) {
  if (!gameState || isOverlayBlockingInput() || dragState || event.target.closest("#context-menu, #floating-info")) {
    return;
  }

  const previewable = event.target.closest("[data-card-uid], [data-inspect-kind]");
  if (!previewable) {
    return;
  }

  const nextPreview = getPreviewDescriptor(previewable);
  if (samePreviewState(hoverPreview, nextPreview)) {
    return;
  }

  hoverPreview = nextPreview;
  renderInspector();
}

function handleHoverOut(event) {
  if (!gameState || isOverlayBlockingInput() || dragState) {
    return;
  }

  const leavingPreviewable = event.target.closest("[data-card-uid], [data-inspect-kind]");
  if (!leavingPreviewable) {
    return;
  }

  const enteringPreviewable = event.relatedTarget?.closest?.("[data-card-uid], [data-inspect-kind]");
  if (enteringPreviewable) {
    return;
  }

  hoverPreview = null;
  renderInspector();
}

function handleHoverPreviewWheel(event) {
  if (!gameState || isOverlayBlockingInput() || dragState?.dragging || !hoverPreview || !elements.hoverPreview) {
    return;
  }

  const previewable = event.target.closest("[data-card-uid], [data-inspect-kind]");
  if (!previewable) {
    return;
  }

  const descriptor = getPreviewDescriptor(previewable);
  if (!samePreviewState(hoverPreview, descriptor)) {
    return;
  }

  const scrollPanel = elements.hoverPreview.querySelector(".floating-card-preview__info");
  if (!scrollPanel || scrollPanel.scrollHeight <= scrollPanel.clientHeight) {
    return;
  }

  event.preventDefault();
  scrollPanel.scrollTop += event.deltaY;
}

function handleDoubleClick(event) {
  if (!gameState || isOverlayBlockingInput() || dragState?.dragging || event.target.closest("#context-menu, #floating-info")) {
    return;
  }

  if (Date.now() - lastBattlefieldMoveAt < 350) {
    return;
  }

  const cardElement = event.target.closest("[data-card-uid]");
  if (!cardElement) {
    return;
  }

  const located = findCardInstance(cardElement.dataset.player, cardElement.dataset.cardUid);
  if (located?.zone === "hand" && located.card.owner === "A" && !isAiPlayer("A")) {
    event.preventDefault();
    playHandCard("A", located.card.uid);
    renderGame();
    return;
  }
  if (!located || (located.zone !== "battlefield" && located.zone !== "cosmo_base")) {
    return;
  }

  event.preventDefault();
  selectedInspector = {
    kind: "card",
    playerKey: cardElement.dataset.player,
    uid: cardElement.dataset.cardUid
  };
  toggleTap(cardElement.dataset.player, cardElement.dataset.cardUid);
  renderGame();
}

function handleContextMenu(event) {
  if (event.target.closest("#context-menu")) {
    event.preventDefault();
    return;
  }

  if (!gameState || isOverlayBlockingInput()) {
    return;
  }

  const cardElement = event.target.closest("[data-card-uid]");
  const inspectElement = event.target.closest("[data-inspect-kind]");

  if (!cardElement && !inspectElement) {
    closeContextMenu();
    return;
  }

  event.preventDefault();
  suppressClickUntil = Date.now() + 180;

  if (cardElement) {
    selectedInspector = {
      kind: "card",
      playerKey: cardElement.dataset.player,
      uid: cardElement.dataset.cardUid
    };
    contextMenuState = {
      kind: "card",
      playerKey: cardElement.dataset.player,
      uid: cardElement.dataset.cardUid,
      x: event.clientX,
      y: event.clientY
    };
  } else {
    const inspectKind = inspectElement.dataset.inspectKind;
    if (inspectKind !== "god" && inspectKind !== "domain") {
      closeContextMenu();
      return;
    }

    selectedInspector = {
      kind: inspectKind,
      playerKey: inspectElement.dataset.player
    };
    contextMenuState = {
      kind: inspectKind,
      playerKey: inspectElement.dataset.player,
      x: event.clientX,
      y: event.clientY
    };
  }

  renderGame();
}

function handleKeyDown(event) {
  if (event.key === "Shift") {
    shiftHeld = true;
    return;
  }

  if (event.key === "Escape") {
    attackDeclare = null;
    hoverPreview = null;
    clearPaymentState(true);
    clearEquipSelection(true);
    closeZoneBrowser(true);
    clearZoneSelection();
    closeContextMenu();
    closeFloatingInfo();
    clearTargetingState();
    if (!targetingState && !zoneBrowserState) {
      clearSpellResolution(true);
    }
    if (optionsMenuOpen) {
      optionsMenuOpen = false;
      renderOptionsMenu();
    }
    if (gameState) {
      renderGame();
    }
    return;
  }

  const isSpaceKey = event.key === " " || event.code === "Space" || event.key === "Spacebar";
  const key = event.key.toLowerCase();
  if (!isSpaceKey && key !== "enter" && key !== "z") {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.closest("input, textarea, select, button, [contenteditable='true']") || target.isContentEditable)
  ) {
    return;
  }

  if (!gameState || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (key === "z") {
    if (attackDeclare) {
      event.preventDefault();
      undoDeclareStep();
      renderGame();
    }
    return;
  }

  if (key === "enter" && attackDeclare && getPrimaryAction().action !== "declare-confirm") {
    return;
  }

  event.preventDefault();
  triggerPrimaryAction();
}

function handleViewportResize() {
  updateViewportScale();
  renderCombatOverlay();
  renderOptionsMenu();
  scheduleBattlefieldLayoutSync();
}

function updateViewportScale() {
  if (!elements.shell) {
    return;
  }

  const rawScale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  const safeScale = Math.max(0.1, Math.min(1, rawScale));
  const offsetX = (window.innerWidth - DESIGN_WIDTH * safeScale) / 2;
  const offsetY = (window.innerHeight - DESIGN_HEIGHT * safeScale) / 2;

  document.documentElement.style.setProperty("--ui-scale", String(safeScale));
  document.documentElement.style.setProperty("--ui-offset-x", `${offsetX}px`);
  document.documentElement.style.setProperty("--ui-offset-y", `${offsetY}px`);
}

function handleAction(element) {
  if (!gameState) {
    const action = element.dataset.action;
    if (action === "new-game-start") {
      startMatch({
        deckAId: newGameState?.deckAId || "athena-beta-seiya",
        deckBId: newGameState?.deckBId || "athena-beta-hyoga",
        startingPlayer: newGameState?.startingPlayer || "random"
      });
      return;
    }
    if (action === "new-game-swap" && newGameState) {
      const currentA = newGameState.deckAId;
      newGameState.deckAId = newGameState.deckBId;
      newGameState.deckBId = currentA;
      renderNewGameOverlay();
      return;
    }
    return;
  }

  const action = element.dataset.action;
  if (newGameState?.open && !action.startsWith("new-game")) {
    return;
  }
  if (action === "new-game-start") {
    startMatch({
      deckAId: newGameState?.deckAId || elements.deckA.value,
      deckBId: newGameState?.deckBId || elements.deckB.value,
      startingPlayer: newGameState?.startingPlayer || "random"
    });
    return;
  }
  if (action === "new-game-cancel") {
    if (gameState) {
      newGameState = null;
      renderNewGameOverlay();
    }
    return;
  }
  if (action === "new-game-swap") {
    if (newGameState) {
      const currentA = newGameState.deckAId;
      newGameState.deckAId = newGameState.deckBId;
      newGameState.deckBId = currentA;
      renderNewGameOverlay();
    }
    return;
  }
  if (mulliganState && !action.startsWith("mulligan")) {
    return;
  }
  if (paymentState && !action.startsWith("payment")) {
    return;
  }
  if (spellResolutionState && !action.startsWith("spell") && !action.startsWith("zone-browser")) {
    return;
  }
  if (equipSelectionState && !action.startsWith("equip")) {
    return;
  }
  if (zoneBrowserState && !action.startsWith("zone-browser")) {
    return;
  }
  const playerKey = element.dataset.player;

  if (action === "mulligan-toggle") {
    toggleMulliganSelection(element.dataset.uid);
  } else if (action === "mulligan-keep") {
    keepOpeningHand();
  } else if (action === "mulligan-confirm") {
    resolveOpeningMulligan();
  } else if (action === "payment-select") {
    resolvePaymentChoice(element.dataset.planId);
  } else if (action === "payment-back") {
    clearPaymentState(true);
  } else if (action === "payment-cancel") {
    clearPaymentState(true);
  } else if (action === "spell-cancel") {
    cancelSpellResolution();
  } else if (action === "spell-target-select") {
    resolveSpellTargetSelection(element.dataset.kind, element.dataset.player, element.dataset.uid || "");
  } else if (action === "equip-select") {
    resolveEquipSelection(element.dataset.uid);
  } else if (action === "equip-back" || action === "equip-cancel") {
    clearEquipSelection(true);
  } else if (action === "zone-browser-select") {
    selectZoneBrowserEntry(element.dataset.uid);
  } else if (action === "zone-browser-confirm") {
    resolveZoneBrowserSelection();
  } else if (action === "zone-browser-cancel") {
    closeZoneBrowser(true);
  } else if (action === "draw") {
    drawCards(gameState.players[playerKey], Number(element.dataset.amount));
  } else if (action === "shuffle") {
    shuffle(gameState.players[playerKey].zones.deck);
    addLog(`${playerLabel(playerKey)} shuffles their deck.`);
  } else if (action === "player-counter") {
    adjustPlayerCounter(playerKey, element.dataset.metric, Number(element.dataset.delta));
  } else if (action === "toggle-awaken") {
    toggleAwaken(playerKey);
  } else if (action === "move-card") {
    moveCard(playerKey, element.dataset.uid, element.dataset.targetZone);
  } else if (action === "toggle-tap") {
    toggleTap(playerKey, element.dataset.uid);
  } else if (action === "card-counter") {
    adjustCardCounter(playerKey, element.dataset.uid, element.dataset.counter, Number(element.dataset.delta));
  } else if (action === "attack") {
    resolveEnterCombat(playerKey, element.dataset.uid);
  } else if (action === "equip-card") {
    startEquipSelection(playerKey, element.dataset.uid, Boolean(element.dataset.free === "true"));
  } else if (action === "survived-combat") {
    resolveSurvivedCombat(playerKey, element.dataset.uid);
  } else if (action === "god-ability") {
    resolveGodAbility(playerKey, element.dataset.ability);
  } else if (action === "domain-ability") {
    resolveDomainAbility(playerKey, element.dataset.ability);
  } else if (action === "open-card-abilities") {
    const rect = element.getBoundingClientRect();
    selectedInspector = {
      kind: "card",
      playerKey,
      uid: element.dataset.uid
    };
    contextMenuState = {
      kind: "card",
      playerKey,
      uid: element.dataset.uid,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    renderGame();
    return;
  } else if (action === "resolve-card-ability") {
    resolveCardAbility(playerKey, element.dataset.uid, Number(element.dataset.lineIndex || 0));
  } else if (action === "resolve-card-text") {
    resolveCardText(playerKey, element.dataset.uid);
  } else if (action === "set-phase") {
    setPhase(element.dataset.phase);
  } else if (action === "next-phase") {
    advanceToNextPhase();
  } else if (action === "end-turn") {
    nextTurn();
  } else if (action === "toggle-log-popup") {
    toggleLogPopup();
  } else if (action === "close-log-popup") {
    closeLogPopup();
  } else if (action === "dock-tab") {
    dockTab = element.dataset.tab;
  } else if (action === "open-full-info") {
    openFloatingInfo({
      kind: element.dataset.kind || "card",
      playerKey,
      uid: element.dataset.uid || null,
      x: Number(element.dataset.x || 0),
      y: Number(element.dataset.y || 0)
    });
  } else if (action === "close-full-info") {
    closeFloatingInfo();
  } else if (action === "clear-targeting") {
    clearTargetingState(true);
  } else if (action === "combat-priority-respond") {
    enterCombatResponseWindow();
  } else if (action === "combat-priority-ok") {
    resolveCombatFromPriority();
  } else if (action === "clear-combat") {
    clearCombatState(true);
    attackQueue = [];
  } else if (action === "declare-start") {
    startAttackDeclare();
  } else if (action === "declare-all") {
    if (!attackDeclare) startAttackDeclare();
    if (attackDeclare) declareAllAttackers();
  } else if (action === "declare-confirm") {
    confirmAttackDeclare();
  } else if (action === "declare-cancel") {
    attackDeclare = null;
  } else if (action === "declare-undo") {
    if (attackDeclare) undoDeclareStep();
  } else if (action === "pass-turn") {
    attackDeclare = null;
    passTurnFromMain();
  } else if (action === "goto-phase") {
    goToPhase(element.dataset.phase);
  }

  closeContextMenu();
  renderGame();
}

function handlePointerDown(event) {
  if (!gameState || isOverlayBlockingInput()) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  const cardElement = event.target.closest("[data-card-uid]");
  const battlefieldRootElement = event.target.closest("[data-battlefield-root]");
  const cosmoZoneElement = event.target.closest('[data-drop-zone="cosmo_base"]');
  const battlefieldZoneElement = event.target.closest('[data-drop-zone="battlefield"]');
  const rootLocated = battlefieldRootElement
    ? findCardInstance(battlefieldRootElement.dataset.player, battlefieldRootElement.dataset.battlefieldRoot)
    : null;
  const cardLocated = cardElement
    ? findCardInstance(cardElement.dataset.player, cardElement.dataset.cardUid)
    : rootLocated;
  const interactiveTarget = event.target.closest("[data-action], button, select, option");

  if (interactiveTarget) {
    return;
  }

  closeContextMenu();

  if (!isSelectionModeActive() && cosmoZoneElement && (!cardElement || cardLocated?.zone === "cosmo_base")) {
    startZoneSelection(event, cosmoZoneElement);
    return;
  }

  if (!isSelectionModeActive() && battlefieldZoneElement && !cardElement && !battlefieldRootElement) {
    startZoneSelection(event, battlefieldZoneElement);
    return;
  }

  if (!cardElement && !battlefieldRootElement) {
    return;
  }

  if (cardLocated?.zone === "battlefield") {
    event.preventDefault();
    const rootUid = battlefieldRootElement?.dataset.battlefieldRoot || getBattlefieldRootUid(cardLocated.card);
    const selected = getBattlefieldSelectionSet(cardLocated.card.owner);
    const rootUids = selected.has(rootUid) && selected.size > 0 ? [...selected] : [rootUid];
    const laneElement = (battlefieldRootElement || cardElement).closest('.board-zone--battlefield .card-lane');
    const anchorRootElement =
      laneElement?.querySelector(`[data-battlefield-root="${rootUid}"][data-player="${cardLocated.card.owner}"]`) ||
      battlefieldRootElement ||
      cardElement;
    const anchorRect = anchorRootElement?.getBoundingClientRect();
    hoverPreview = null;
    renderInspector();

    dragState = {
      mode: "battlefield-move",
      pointerId: event.pointerId,
      playerKey: cardLocated.card.owner,
      uid: rootUid,
      rootUids,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      sourceElement: anchorRootElement,
      laneElement,
      anchorRootUid: rootUid,
      anchorOffsetX: anchorRect ? event.clientX - anchorRect.left : getBattlefieldRootStackWidth(cardLocated.card.owner) / 2,
      rootElements: Object.fromEntries(
        rootUids.map((uid) => [
          uid,
          laneElement?.querySelector(`[data-battlefield-root="${uid}"][data-player="${cardLocated.card.owner}"]`) || null
        ])
      ),
      initialPositions: Object.fromEntries(
        rootUids
          .map((uid) => findCardInstance(cardLocated.card.owner, uid))
          .filter(Boolean)
          .map((located) => {
            ensureBattlefieldPosition(cardLocated.card.owner, located.card);
            return [uid, {
              x: located.card.battlefieldPositionX,
              y: located.card.battlefieldPositionY
            }];
          })
      )
    };
    return;
  }

  dragState = {
    mode: "zone-move",
    pointerId: event.pointerId,
    playerKey: cardElement.dataset.player,
    uid: cardElement.dataset.cardUid,
    startX: event.clientX,
    startY: event.clientY,
    ghost: null,
    dragging: false,
    sourceElement: cardElement
  };
}

function handlePointerMove(event) {
  if (zoneSelectionState && zoneSelectionState.pointerId === event.pointerId) {
    const deltaX = event.clientX - zoneSelectionState.startX;
    const deltaY = event.clientY - zoneSelectionState.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!zoneSelectionState.selecting && distance < 8) {
      return;
    }

    zoneSelectionState.selecting = true;
    zoneSelectionState.currentX = event.clientX;
    zoneSelectionState.currentY = event.clientY;
    event.preventDefault();
    renderZoneSelectionOverlay();
    return;
  }

  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;
  const distance = Math.hypot(deltaX, deltaY);

  if (!dragState.dragging && distance < 8) {
    return;
  }

  if (!dragState.dragging) {
    startDragging(event);
  }

  if (dragState.mode === "battlefield-move") {
    event.preventDefault();
    updateBattlefieldDragPositions(event.clientX, event.clientY);
    return;
  }

  event.preventDefault();
  updateDragGhost(event.clientX, event.clientY);
  updateDropTarget(findDropTarget(event.clientX, event.clientY, dragState.playerKey));
}

function handlePointerUp(event) {
  if (zoneSelectionState && zoneSelectionState.pointerId === event.pointerId) {
    if (zoneSelectionState.selecting) {
      finalizeZoneSelection();
    }
    clearZoneSelection();
    if (gameState) {
      renderGame();
    }
    return;
  }

  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  if (dragState.mode === "battlefield-move") {
    if (dragState.dragging) {
      lastBattlefieldMoveAt = Date.now();
      dragState.rootUids.forEach((uid) => {
        const located = findCardInstance(dragState.playerKey, uid);
        if (located) {
          located.card.battlefieldPositionPinned = true;
        }
      });
      resolveBattlefieldRootSpacing(dragState.playerKey);
      setBattlefieldSelection(dragState.playerKey, dragState.rootUids);
      suppressNextClick = true;
    }
    cleanupDrag();
    if (gameState) {
      renderGame();
    }
    return;
  }

  if (dragState.dragging && activeDropTarget) {
    const extraOptions = activeDropTarget.dataset.dropZone === "battlefield"
      ? { battlefieldPosition: getBattlefieldDropPosition(activeDropTarget, event.clientX, event.clientY) }
      : {};
    moveCard(dragState.playerKey, dragState.uid, activeDropTarget.dataset.dropZone, extraOptions);
    suppressNextClick = true;
  }

  cleanupDrag();
  if (gameState) {
    renderGame();
  }
}

function closeContextMenu() {
  contextMenuState = null;
  renderContextMenu();
}

function startDragging(event) {
  dragState.dragging = true;
  dragState.sourceElement.classList.add("drag-origin");

  if (dragState.mode === "battlefield-move") {
    hoverPreview = null;
    renderInspector();
    setBattlefieldSelection(dragState.playerKey, dragState.rootUids);
    document.body.classList.add("is-dragging");
    return;
  }

  const sourceRect = dragState.sourceElement.getBoundingClientRect();
  const ghost = dragState.sourceElement.cloneNode(true);
  heldCardState = {
    playerKey: dragState.playerKey,
    uid: dragState.uid
  };
  hoverPreview = null;
  renderGame();

  ghost.classList.add("drag-ghost");
  ghost.style.width = `${sourceRect.width}px`;
  document.body.appendChild(ghost);
  dragState.ghost = ghost;
  updateDragGhost(event.clientX, event.clientY);
  document.body.classList.add("is-dragging");
}

function updateDragGhost(clientX, clientY) {
  if (!dragState?.ghost) {
    return;
  }

  dragState.ghost.style.left = `${clientX + 18}px`;
  dragState.ghost.style.top = `${clientY + 18}px`;
}

function findDropTarget(clientX, clientY, playerKey) {
  const located = dragState ? findCardInstance(dragState.playerKey, dragState.uid) : null;
  const candidates = [...document.querySelectorAll(`[data-drop-zone][data-player="${playerKey}"]`)]
    .filter((target) => DROP_ZONES.has(target.dataset.dropZone))
    .filter((target) => !located || canRelocateCard(dragState.playerKey, located, target.dataset.dropZone))
    .filter((target) => {
      const rect = target.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    })
    .sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.width * leftRect.height - rightRect.width * rightRect.height;
    });

  return candidates[0] || null;
}

function updateDropTarget(target) {
  if (activeDropTarget === target) {
    return;
  }

  if (activeDropTarget) {
    activeDropTarget.classList.remove("drop-target-hover");
  }

  activeDropTarget = target;

  if (activeDropTarget) {
    activeDropTarget.classList.add("drop-target-hover");
  }
}

function cleanupDrag() {
  if (dragState?.sourceElement) {
    dragState.sourceElement.classList.remove("drag-origin");
  }

  if (dragState?.ghost) {
    dragState.ghost.remove();
  }

  if (activeDropTarget) {
    activeDropTarget.classList.remove("drop-target-hover");
  }

  document.body.classList.remove("is-dragging");
  activeDropTarget = null;
  dragState = null;
  heldCardState = null;
}

function startZoneSelection(event, zoneElement) {
  zoneSelectionState = {
    pointerId: event.pointerId,
    playerKey: zoneElement.dataset.player,
    zone: zoneElement.dataset.dropZone,
    zoneElement,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    selecting: false
  };
  document.body.classList.add("is-zone-selecting");
  renderZoneSelectionOverlay();
}

function clearZoneSelection() {
  zoneSelectionState = null;
  document.body.classList.remove("is-zone-selecting");
  renderZoneSelectionOverlay();
}

function finalizeZoneSelection() {
  if (!zoneSelectionState?.zoneElement) {
    return;
  }

  const selectionRect = getSelectionRect(
    zoneSelectionState.startX,
    zoneSelectionState.startY,
    zoneSelectionState.currentX,
    zoneSelectionState.currentY
  );

  if (zoneSelectionState.zone === "battlefield") {
    const selectedRoots = [...zoneSelectionState.zoneElement.querySelectorAll(`[data-battlefield-root][data-player="${zoneSelectionState.playerKey}"]`)]
      .filter((element) => rectsIntersect(selectionRect, element.getBoundingClientRect()))
      .map((element) => element.dataset.battlefieldRoot)
      .filter(Boolean);

    setBattlefieldSelection(zoneSelectionState.playerKey, selectedRoots);
    return;
  }

  const selectedCards = [...zoneSelectionState.zoneElement.querySelectorAll(`[data-card-uid][data-player="${zoneSelectionState.playerKey}"]`)]
    .map((element) => ({
      element,
      located: findCardInstance(zoneSelectionState.playerKey, element.dataset.cardUid)
    }))
    .filter(({ located }) => located?.zone === "cosmo_base")
    .filter(({ element }) => rectsIntersect(selectionRect, element.getBoundingClientRect()))
    .map(({ located }) => located);

  if (!selectedCards.length) {
    return;
  }

  toggleTapMultiple(zoneSelectionState.playerKey, selectedCards);
}

function updateBattlefieldDragPositions(clientX, clientY) {
  if (!dragState?.laneElement) {
    return;
  }

  const laneRect = dragState.laneElement.getBoundingClientRect();
  const anchorUid = dragState.anchorRootUid || dragState.rootUids[0];
  const anchorStart = dragState.initialPositions?.[anchorUid];
  if (!anchorStart) {
    return;
  }

  const anchorStartXPx = (anchorStart.x / 100) * laneRect.width;
  const rootWidth = getBattlefieldRootStackWidth(dragState.playerKey);
  const desiredAnchorCenterPx = clientX - laneRect.left - (dragState.anchorOffsetX ?? rootWidth / 2) + rootWidth / 2;
  const deltaXPx = desiredAnchorCenterPx - anchorStartXPx;

  dragState.rootUids.forEach((uid) => {
    const located = findCardInstance(dragState.playerKey, uid);
    const startPosition = dragState.initialPositions?.[uid];
    if (!located || !startPosition) {
      return;
    }

    const startXPx = (startPosition.x / 100) * laneRect.width;
    const next = clampBattlefieldPosition(startXPx + deltaXPx, laneRect.height / 2, laneRect, dragState.playerKey);
    located.card.battlefieldPositionX = next.x;
    located.card.battlefieldPositionY = next.y;

    const element = dragState.rootElements?.[uid] || dragState.laneElement.querySelector(`[data-battlefield-root="${uid}"][data-player="${dragState.playerKey}"]`);
    if (element) {
      applyBattlefieldRootPosition(element, located.card);
    }
  });
}

function toggleTapMultiple(playerKey, locatedCards) {
  const player = gameState.players[playerKey];
  const untapped = locatedCards.filter(({ card }) => !card.tapped);

  if (untapped.length > 0) {
    untapped.forEach(({ card }) => {
      card.tapped = true;
      card.generatedCosmoWhenTapped = true;
      player.cosmo += 1;
    });
    addLog(`${playerLabel(playerKey)} taps ${untapped.length} Cosmo Base card${untapped.length === 1 ? "" : "s"} and generates ${untapped.length} Cosmo.`);
    return;
  }

  const tapped = locatedCards.filter(({ card }) => card.tapped);
  if (tapped.length > 0) {
    tapped.forEach(({ card }) => {
      if (card.generatedCosmoWhenTapped && player.cosmo > 0) {
        player.cosmo = Math.max(0, player.cosmo - 1);
      }
      card.generatedCosmoWhenTapped = false;
      card.tapped = false;
    });
    addLog(`${playerLabel(playerKey)} untaps ${tapped.length} Cosmo Base card${tapped.length === 1 ? "" : "s"}.`);
  }
}

function getSelectionRect(startX, startY, currentX, currentY) {
  return {
    left: Math.min(startX, currentX),
    right: Math.max(startX, currentX),
    top: Math.min(startY, currentY),
    bottom: Math.max(startY, currentY)
  };
}

function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getBattlefieldSelectionSet(playerKey) {
  return battlefieldSelection[playerKey] || new Set();
}

function setBattlefieldSelection(playerKey, uids) {
  battlefieldSelection[playerKey] = new Set(uids);
}

function clearBattlefieldSelection(playerKey = null) {
  if (playerKey) {
    battlefieldSelection[playerKey] = new Set();
    return;
  }
  battlefieldSelection = createEmptyBattlefieldSelection();
}

function getBattlefieldRootUid(instance) {
  return instance?.attachedToUid || instance?.uid || null;
}

function isBattlefieldRootInstance(instance) {
  return Boolean(instance && !instance.attachedToUid);
}

function getBattlefieldDisplayCount(playerKey) {
  const player = gameState?.players?.[playerKey];
  if (!player) {
    return 0;
  }
  return player.zones.battlefield.filter((instance) => !instance.attachedToUid).length;
}

function getBattlefieldLaneMetrics(playerKey) {
  const lane = document.querySelector(`.board-zone--battlefield[data-player="${playerKey}"] .card-lane`);
  const rect = lane?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height
  };
}

// Must match .battlefield-stack sizes in arena.css.
function getBattlefieldRootStackWidth(playerKey) {
  return playerKey === "B" ? 146 : 160;
}

function getBattlefieldRootStackHeight(playerKey) {
  return playerKey === "B" ? 184 : 200;
}

function getBattlefieldRootSpacing(playerKey) {
  return getBattlefieldRootStackWidth(playerKey) + BATTLEFIELD_MIN_ROOT_GAP_PX;
}

function normalizeBattlefieldRootPosition(playerKey, instance) {
  if (!instance) {
    return;
  }

  const metrics = getBattlefieldLaneMetrics(playerKey);
  if (!metrics) {
    instance.battlefieldPositionY = 50;
    return;
  }

  const currentXPx = ((instance.battlefieldPositionX ?? 50) / 100) * metrics.width;
  const next = clampBattlefieldPosition(currentXPx, metrics.height / 2, metrics, playerKey);
  instance.battlefieldPositionX = next.x;
  instance.battlefieldPositionY = 50;
}

function getDefaultBattlefieldPosition(playerKey, uid) {
  const displayCards = gameState?.players?.[playerKey]?.zones?.battlefield?.filter((instance) => !instance.attachedToUid) || [];
  const index = Math.max(0, displayCards.findIndex((instance) => instance.uid === uid));
  const count = Math.max(1, displayCards.length);
  const metrics = getBattlefieldLaneMetrics(playerKey);

  if (metrics) {
    const rootWidth = getBattlefieldRootStackWidth(playerKey);
    const rootSpacing = getBattlefieldRootSpacing(playerKey);
    const maxColumns = Math.max(1, Math.floor(Math.max(0, metrics.width - rootWidth) / rootSpacing) + 1);
    const columns = Math.max(1, Math.min(count, maxColumns));
    const rows = Math.max(1, Math.ceil(count / columns));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowStart = row * columns;
    const rowCount = Math.min(columns, count - rowStart);
    const centeredColumn = column - Math.max(0, (rowCount - 1) / 2);
    const centeredRow = row - Math.max(0, (rows - 1) / 2);
    const xPx = metrics.width / 2 + centeredColumn * rootSpacing;
    const yPx = metrics.height / 2 + centeredRow * BATTLEFIELD_SAFE_SPACING_Y_PX;
    return clampBattlefieldPosition(xPx, yPx, metrics, playerKey);
  }

  const fallbackColumns = Math.max(1, Math.min(count, 4));
  const row = Math.floor(index / fallbackColumns);
  const column = index % fallbackColumns;
  const rows = Math.max(1, Math.ceil(count / fallbackColumns));
  const rowCount = Math.min(fallbackColumns, count - row * fallbackColumns);
  const x = 50 + (column - Math.max(0, (rowCount - 1) / 2)) * 14;
  const y = 50 + (row - Math.max(0, (rows - 1) / 2)) * 18;
  return {
    x: Math.max(12, Math.min(88, x)),
    y: Math.max(22, Math.min(78, y))
  };
}

function clampBattlefieldPosition(x, y, laneRect, playerKey = "A") {
  if (!laneRect || laneRect.width <= 0 || laneRect.height <= 0) {
    return { x: 50, y: 50 };
  }

  const stackWidth = getBattlefieldRootStackWidth(playerKey);
  const stackHeight = getBattlefieldRootStackHeight(playerKey);
  const minXPx = stackWidth / 2;
  const maxXPx = laneRect.width - stackWidth / 2;
  const minYPx = stackHeight / 2;
  const maxYPx = laneRect.height - stackHeight / 2;
  const clampedXPx = Math.max(minXPx, Math.min(maxXPx, x));
  const clampedYPx = Math.max(minYPx, Math.min(maxYPx, y));

  return {
    x: (clampedXPx / laneRect.width) * 100,
    y: (clampedYPx / laneRect.height) * 100
  };
}

function getBattlefieldDropPosition(zoneElement, clientX, clientY) {
  const lane = zoneElement?.querySelector(".card-lane");
  const rect = (lane || zoneElement)?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  const playerKey = zoneElement?.dataset?.player || "A";
  return clampBattlefieldPosition(clientX - rect.left, rect.height / 2, rect, playerKey);
}

function ensureBattlefieldPosition(playerKey, instance) {
  if (!instance) {
    return;
  }

  if (instance.battlefieldPositionX !== null && instance.battlefieldPositionY !== null) {
    normalizeBattlefieldRootPosition(playerKey, instance);
    return;
  }

  const fallback = getDefaultBattlefieldPosition(playerKey, instance.uid);
  instance.battlefieldPositionX = fallback.x;
  instance.battlefieldPositionY = fallback.y;
  normalizeBattlefieldRootPosition(playerKey, instance);
}

function resolveBattlefieldRootSpacing(playerKey) {
  const player = gameState?.players?.[playerKey];
  const metrics = getBattlefieldLaneMetrics(playerKey);
  if (!player || !metrics) {
    return;
  }

  const roots = player.zones.battlefield
    .filter((instance) => isBattlefieldRootInstance(instance))
    .sort((left, right) => {
      ensureBattlefieldPosition(playerKey, left);
      ensureBattlefieldPosition(playerKey, right);
      return (left.battlefieldPositionX ?? 50) - (right.battlefieldPositionX ?? 50);
    });

  if (!roots.length) {
    return;
  }

  const rootWidth = getBattlefieldRootStackWidth(playerKey);
  const minCenter = rootWidth / 2;
  const maxCenter = metrics.width - rootWidth / 2;
  const minGap = getBattlefieldRootSpacing(playerKey);
  const centers = roots.map((instance) => ((instance.battlefieldPositionX ?? 50) / 100) * metrics.width);

  centers[0] = Math.max(minCenter, Math.min(maxCenter, centers[0]));
  for (let index = 1; index < centers.length; index += 1) {
    centers[index] = Math.max(centers[index], centers[index - 1] + minGap);
  }

  if (centers[centers.length - 1] > maxCenter) {
    const shiftLeft = centers[centers.length - 1] - maxCenter;
    for (let index = 0; index < centers.length; index += 1) {
      centers[index] -= shiftLeft;
    }
  }

  if (centers[0] < minCenter) {
    const shiftRight = minCenter - centers[0];
    for (let index = 0; index < centers.length; index += 1) {
      centers[index] += shiftRight;
    }
  }

  roots.forEach((instance, index) => {
    const next = clampBattlefieldPosition(centers[index], metrics.height / 2, metrics, playerKey);
    instance.battlefieldPositionX = next.x;
    instance.battlefieldPositionY = next.y;
  });
}

function syncRenderedBattlefieldLayout(playerKey) {
  if (!gameState?.players?.[playerKey]) {
    return;
  }

  resolveBattlefieldRootSpacing(playerKey);
  gameState.players[playerKey].zones.battlefield
    .filter((instance) => isBattlefieldRootInstance(instance))
    .forEach((instance) => {
      const element = document.querySelector(`.battlefield-stack[data-battlefield-root="${instance.uid}"][data-player="${playerKey}"]`);
      applyBattlefieldRootPosition(element, instance);
    });
}

function scheduleBattlefieldLayoutSync() {
  if (battlefieldLayoutSyncFrame !== null) {
    cancelAnimationFrame(battlefieldLayoutSyncFrame);
  }

  battlefieldLayoutSyncFrame = requestAnimationFrame(() => {
    battlefieldLayoutSyncFrame = null;
    if (!gameState) {
      return;
    }
    PLAYER_ORDER.forEach((playerKey) => {
      syncRenderedBattlefieldLayout(playerKey);
    });
  });
}

function applyBattlefieldRootPosition(element, instance) {
  if (!element || !instance) {
    return;
  }
  ensureBattlefieldPosition(instance.owner, instance);
  element.style.left = `${instance.battlefieldPositionX}%`;
  element.style.top = "50%";
}

function adjustPlayerCounter(playerKey, metric, delta) {
  const player = gameState.players[playerKey];

  if (metric === "soul") {
    player.god.soul = Math.max(0, player.god.soul + delta);
    syncAwakenState(player);
    addLog(`${playerLabel(playerKey)} Soul is now ${player.god.soul}.`);
  } else if (metric === "latent") {
    player.latentCosmo = Math.max(0, player.latentCosmo + delta);
    addLog(`${playerLabel(playerKey)} Latent Cosmo is now ${player.latentCosmo}.`);
  }
}

function toggleAwaken(playerKey) {
  const player = gameState.players[playerKey];
  player.god.awakened = !player.god.awakened;
  addLog(`${playerLabel(playerKey)} manually toggles Awaken ${player.god.awakened ? "on" : "off"}.`);
}

function toggleTap(playerKey, uid) {
  const located = findCardInstance(playerKey, uid);
  if (!located) {
    return;
  }

  if (located.zone === "battlefield" && isDevoteeCard(located.cardId) && located.card.tapped && (located.card.sealCounters > 0 || located.card.sealLocked)) {
    addLog(`${located.cardData.nome_exibicao_en} is sealed and cannot untap until a future Upkeep.`);
    return;
  }

  const player = gameState.players[playerKey];
  const wasTapped = located.card.tapped;
  located.card.tapped = !located.card.tapped;

  if (located.zone === "cosmo_base") {
    if (!wasTapped && located.card.tapped) {
      located.card.generatedCosmoWhenTapped = true;
      player.cosmo += 1;
      addLog(`${playerLabel(playerKey)} taps ${located.cardData.nome_exibicao_en} in Cosmo Base and generates 1 Cosmo.`);
      return;
    }

    if (wasTapped && !located.card.tapped) {
      if (located.card.generatedCosmoWhenTapped && player.cosmo > 0) {
        player.cosmo = Math.max(0, player.cosmo - 1);
      }
      located.card.generatedCosmoWhenTapped = false;
      addLog(`${playerLabel(playerKey)} untaps ${located.cardData.nome_exibicao_en} in Cosmo Base.`);
      return;
    }
  }

  addLog(`${playerLabel(playerKey)} ${located.cardData.nome_exibicao_en} is ${located.card.tapped ? "tapped" : "untapped"}.`);
}

function adjustCardCounter(playerKey, uid, counter, delta) {
  const located = findCardInstance(playerKey, uid);
  if (!located) {
    return;
  }

  if (counter === "sealCounters" && delta > 0) {
    applySealCounter(located, playerLabel(playerKey));
    return;
  }

  located.card[counter] = Math.max(0, located.card[counter] + delta);
  addLog(
    `${playerLabel(playerKey)} updates ${located.cardData.nome_exibicao_en}: ${humanCounterLabel(counter)} is now ${located.card[counter]}.`
  );
}

function applySealCounter(located, sourceLabel = null) {
  if (!located || located.zone !== "battlefield" || !isDevoteeCard(located.cardId)) {
    return false;
  }

  located.card.sealCounters += 1;
  located.card.tapped = true;
  located.card.generatedCosmoWhenTapped = false;
  const sourcePrefix = sourceLabel ? `${sourceLabel} ` : "";
  addLog(`${sourcePrefix}puts a Seal counter on ${located.cardData.nome_exibicao_en}. ${located.cardData.nome_exibicao_en} is tapped immediately.`);
  showCombatToast(`${located.cardData.nome_exibicao_en} is sealed and tapped.`);
  return true;
}

function moveCard(playerKey, uid, targetZone, options = {}) {
  const located = findCardInstance(playerKey, uid);
  if (!located) {
    return;
  }

  if (!options.skipPaymentPrompt) {
    const handPlayResult = maybeStartHandPlay(playerKey, located, targetZone, options);
    if (handPlayResult?.pending || handPlayResult?.blocked) {
      return;
    }
  }

  const moved = relocateCard(playerKey, uid, targetZone, options);
  if (!moved) {
    return;
  }

  addLog(
    `${playerLabel(playerKey)} moves ${moved.cardData.nome_exibicao_en} from ${zoneLabel(moved.fromZone)} to ${zoneLabel(moved.toZone)}.`
  );
}

function relocateCard(playerKey, uid, targetZone, options = {}) {
  const player = gameState.players[playerKey];
  const located = findCardInstance(playerKey, uid);
  const {
    force = false,
    tapped = null,
    skipEnterBattlefieldTriggers = false,
    skipSummoningSickness = false,
    battlefieldPosition = null
  } = options;

  if (!located || located.zone === targetZone || !DROP_ZONES.has(targetZone)) {
    return null;
  }

  if (!force && !canRelocateCard(playerKey, located, targetZone, { writeLog: true })) {
    return null;
  }

  const fromZone = located.zone;
  player.zones[located.zone] = player.zones[located.zone].filter((card) => card.uid !== uid);
  if (fromZone === "battlefield" && isBattlefieldRootInstance(located.card)) {
    const selection = getBattlefieldSelectionSet(playerKey);
    if (selection.has(located.card.uid)) {
      selection.delete(located.card.uid);
    }
  }
  normalizeCardStateForZone(located.card, targetZone);
  player.zones[targetZone].push(located.card);

  if (targetZone === "cosmo_base" && fromZone === "hand") {
    player.playedBaseThisTurn = true;
  }

  if (targetZone === "battlefield" && fromZone !== "battlefield") {
    if (battlefieldPosition) {
      located.card.battlefieldPositionX = battlefieldPosition.x;
      located.card.battlefieldPositionY = battlefieldPosition.y;
    } else {
      ensureBattlefieldPosition(playerKey, located.card);
    }
    resolveBattlefieldRootSpacing(playerKey);
    if (isDevoteeCard(located.cardId) && !skipSummoningSickness && !hasKeyword(located.cardData, "Impulse", located.card)) {
      located.card.summoningSick = true;
    }
    if (typeof tapped === "boolean") {
      located.card.tapped = tapped;
    }
    if (!skipEnterBattlefieldTriggers) {
      resolveEnterBattlefieldTriggers(playerKey, located.card);
    }
    enforceNamedSaintLegendaryRule(playerKey, located.card.uid);
  } else if (typeof tapped === "boolean") {
    located.card.tapped = tapped;
  }

  if (fromZone === "battlefield" && targetZone !== "battlefield" && isBattlefieldRootInstance(located.card)) {
    resolveBattlefieldRootSpacing(playerKey);
  }

  return {
    ...located,
    fromZone,
    toZone: targetZone
  };
}

function canRelocateCard(playerKey, located, targetZone, options = {}) {
  if (!located || !DROP_ZONES.has(targetZone) || located.zone === targetZone) {
    return false;
  }

  if (targetZone !== "cosmo_base") {
    return true;
  }

  const { writeLog = false } = options;
  const player = gameState?.players?.[playerKey];
  const fail = (message) => {
    if (writeLog) {
      addLog(message);
    }
    return false;
  };

  if (!located.cardData.cosmoble) {
    return fail(`${located.cardData.nome_exibicao_en} is not Cosmoble and cannot be moved to Cosmo Base.`);
  }

  if (located.zone !== "hand") {
    return fail("Only cards in hand can be moved to Cosmo Base.");
  }

  if (!gameState || gameState.currentPlayer !== playerKey) {
    return fail("You can only play a Cosmo Base during your own turn.");
  }

  if (gameState.currentPhase !== "main") {
    return fail("Cosmo Base can only be played during Main Phase.");
  }

  if (player?.playedBaseThisTurn) {
    return fail(`${playerLabel(playerKey)} has already played a Cosmo Base this turn.`);
  }

  return true;
}

function openZoneBrowser(config) {
  if (!gameState) {
    return false;
  }

  const {
    playerKey,
    zone,
    title,
    prompt,
    filter,
    cancelMessage = "Zone browsing canceled.",
    allowCancel = true,
    onCancel = null,
    onSelect
  } = config;
  const player = gameState.players[playerKey];
  if (!player) {
    return false;
  }

  const predicate = typeof filter === "function" ? filter : () => true;
  const entries = player.zones[zone]
    .filter((instance) => predicate({
      playerKey,
      uid: instance.uid,
      zone,
      card: instance,
      cardId: instance.cardId,
      cardData: getCard(instance.cardId)
    }))
    .map((instance) => instance.uid);

  if (!entries.length) {
    addLog(`${player.label} has no valid cards in ${zoneLabel(zone)} for ${title}.`);
    return false;
  }

  if (isAiPlayer(playerKey)) {
    onSelect(entries[0]);
    return true;
  }

  zoneBrowserState = {
    playerKey,
    zone,
    title,
    prompt,
    entries,
    selectedUid: null,
    cancelMessage,
    allowCancel,
    onCancel,
    onSelect
  };
  return true;
}

function selectZoneBrowserEntry(uid) {
  if (!zoneBrowserState) {
    return;
  }

  zoneBrowserState.selectedUid = uid || null;
}

function resolveZoneBrowserSelection() {
  if (!zoneBrowserState?.onSelect) {
    return;
  }

  const selectedUid = zoneBrowserState.selectedUid;
  if (!selectedUid) {
    addLog("Choose a card before confirming.");
    return;
  }
  const callback = zoneBrowserState.onSelect;
  zoneBrowserState = null;
  callback(selectedUid);
}

function closeZoneBrowser(writeLog = false) {
  if (!zoneBrowserState) {
    return;
  }

  if (writeLog && zoneBrowserState.allowCancel === false) {
    return;
  }

  if (writeLog && zoneBrowserState.cancelMessage) {
    addLog(zoneBrowserState.cancelMessage);
  }

  if (typeof zoneBrowserState.onCancel === "function") {
    zoneBrowserState.onCancel();
  }

  zoneBrowserState = null;
}

function moveCardByEffect(playerKey, uid, targetZone, options = {}) {
  const {
    tapped = null,
    skipSummoningSickness = false
  } = options;
  if (targetZone === "deck") {
    const player = gameState.players[playerKey];
    const located = findCardInstance(playerKey, uid);
    if (!player || !located) {
      return null;
    }
    player.zones[located.zone] = player.zones[located.zone].filter((card) => card.uid !== uid);
    normalizeCardStateForZone(located.card, "deck");
    if (typeof tapped === "boolean") {
      located.card.tapped = tapped;
    }
    player.zones.deck.unshift(located.card);
    return {
      ...located,
      fromZone: located.zone,
      toZone: "deck"
    };
  }

  return relocateCard(playerKey, uid, targetZone, {
    force: true,
    tapped,
    skipSummoningSickness
  });
}

function inferDestinationZoneFromText(text, fallback = "hand") {
  if (/into your hand|to its owner's hand/i.test(text)) {
    return "hand";
  }
  if (/to the battlefield|onto the battlefield/i.test(text)) {
    return "battlefield";
  }
  if (/into your cosmo base|to your cosmo base|into cosmo base/i.test(text)) {
    return "cosmo_base";
  }
  if (/into your deck|on top of your deck|to your deck/i.test(text)) {
    return "deck";
  }
  return fallback;
}

function getZoneBrowserEntry(playerKey, uid) {
  return uid ? findCardInstance(playerKey, uid) : null;
}

function openSpellResolution(config) {
  spellResolutionState = {
    playerKey: config.playerKey,
    uid: config.uid,
    title: config.title,
    prompt: config.prompt,
    stageLabel: config.stageLabel || "Resolve Spell",
    cardType: config.cardType || "Spell",
    unit: config.unit || "cosmo",
    amount: typeof config.amount === "number" ? config.amount : 0,
    allowCancel: config.allowCancel !== false,
    cancelMessage: config.cancelMessage || `${config.title} resolution canceled.`,
    targetValidator: typeof config.targetValidator === "function" ? config.targetValidator : null,
    targetEffect: typeof config.targetEffect === "function" ? config.targetEffect : null
  };
}

function clearSpellResolution(writeLog = false) {
  if (!spellResolutionState) {
    return;
  }

  if (writeLog && spellResolutionState.allowCancel && spellResolutionState.cancelMessage) {
    addLog(spellResolutionState.cancelMessage);
  }

  spellResolutionState = null;
}

function getSpellTargetDescriptors(validator) {
  if (!gameState || typeof validator !== "function") {
    return [];
  }

  const descriptors = [];
  PLAYER_ORDER.forEach((playerKey) => {
    const player = gameState.players[playerKey];
    if (!player) {
      return;
    }

    const godDescriptor = {
      kind: "god",
      playerKey
    };
    if (validator(godDescriptor)) {
      descriptors.push(godDescriptor);
    }

    player.zones.battlefield.forEach((instance) => {
      const descriptor = {
        kind: "card",
        playerKey,
        uid: instance.uid,
        zone: "battlefield",
        card: instance,
        cardId: instance.cardId,
        cardData: getCard(instance.cardId)
      };
      if (validator(descriptor)) {
        descriptors.push(descriptor);
      }
    });
  });

  return descriptors;
}

function resolveSpellTargetSelection(kind, playerKey, uid = "") {
  if (!spellResolutionState || typeof spellResolutionState.targetValidator !== "function" || typeof spellResolutionState.targetEffect !== "function") {
    return;
  }

  const descriptor = kind === "god"
    ? { kind: "god", playerKey }
    : (() => {
      const located = findCardInstance(playerKey, uid);
      if (!located) {
        return null;
      }
      return {
        kind: "card",
        playerKey,
        uid: located.card.uid,
        zone: located.zone,
        card: located.card,
        cardId: located.cardId,
        cardData: located.cardData
      };
    })();

  if (!descriptor || !spellResolutionState.targetValidator(descriptor)) {
    addLog("That target is no longer valid for this spell.");
    return;
  }

  const player = gameState.players[spellResolutionState.playerKey];
  const located = findCardInstance(spellResolutionState.playerKey, spellResolutionState.uid);
  if (!player || !located || located.zone !== "hand") {
    clearSpellResolution(false);
    addLog("The spell is no longer available in hand.");
    return;
  }

  const fresh = ensureSpellCostPaid(player, located, { costAlreadyPaid: true, allowCancel: spellResolutionState.allowCancel });
  if (!fresh) {
    clearSpellResolution(false);
    return;
  }

  const targetLocated = descriptor.kind === "god" ? null : findCardInstance(descriptor.playerKey, descriptor.uid);
  // Effects read target.playerKey / target.uid, which findCardInstance does not carry.
  const target = descriptor.kind === "god" ? descriptor : targetLocated && { ...targetLocated, playerKey: descriptor.playerKey, uid: descriptor.uid };
  if (!target) {
    clearSpellResolution(false);
    addLog("The chosen target is no longer available.");
    return;
  }

  spellResolutionState.targetEffect(target);
  finalizeSpellCard(player, fresh, `${player.label} resolves ${fresh.cardData.nome_exibicao_en}.`);
}

function cancelSpellResolution() {
  if (targetingState) {
    clearTargetingState(true);
    return;
  }

  if (zoneBrowserState) {
    closeZoneBrowser(true);
    return;
  }

  clearSpellResolution(true);
}

function ensureSpellCostPaid(player, located, options = {}) {
  const fresh = findCardInstance(player.key, located.card.uid);
  if (!fresh) {
    return null;
  }

  if (options.costAlreadyPaid) {
    return fresh;
  }

  if (!spendCosmo(player, fresh.cardData.custo, fresh.cardData.nome_exibicao_en, { unit: fresh.cardData.unidade_custo || "cosmo" })) {
    return null;
  }

  return fresh;
}

function anyZoneCardMatches(playerKey, zone, predicate) {
  const player = gameState?.players?.[playerKey];
  if (!player) {
    return false;
  }

  return player.zones[zone].some((instance) => predicate({
    kind: "card",
    playerKey,
    uid: instance.uid,
    zone,
    card: instance,
    cardId: instance.cardId,
    cardData: getCard(instance.cardId)
  }));
}

function hasAnyBattlefieldMatch(predicate) {
  return PLAYER_ORDER.some((playerKey) => anyZoneCardMatches(playerKey, "battlefield", predicate));
}

function getSpellAvailabilityError(player, located) {
  const lines = getCardRulesLines(located.cardData);

  if (lines.some((line) => /Target Devotee cannot be destroyed this turn\./i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldDevoteeTarget)) {
    return "There is no Devotee on the battlefield for that spell.";
  }

  if (lines.some((line) => /Put a Seal counter on target Devotee\./i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldDevoteeTarget)) {
    return "There is no Devotee on the battlefield for that spell.";
  }

  if (lines.some((line) => /Destroy target Relic\./i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldRelicTarget)) {
    return "There is no Relic on the battlefield for that spell.";
  }

  if (lines.some((line) => /Target Relic cannot be destroyed this turn\./i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldRelicTarget)) {
    return "There is no Relic on the battlefield for that spell.";
  }

  if (lines.some((line) => /Destroy target Devotee that attacked this turn\./i.test(line)) && !hasAnyBattlefieldMatch((descriptor) => isBattlefieldDevoteeTarget(descriptor) && descriptor.card.enteredCombatThisTurn)) {
    return "No Devotee that attacked this turn is available.";
  }

  if (lines.some((line) => /Target Devotee gets \+2\/\+2/i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldDevoteeTarget)) {
    return "There is no Devotee on the battlefield for that spell.";
  }

  if (lines.some((line) => /Exile target Devotee with cost 4 or greater\./i.test(line)) && !hasAnyBattlefieldMatch((descriptor) => isBattlefieldDevoteeTarget(descriptor) && getCard(descriptor.cardId).custo >= 4)) {
    return "There is no Devotee with cost 4 or greater to exile.";
  }

  if (lines.some((line) => /Restore 3 Damage from target Cloth\./i.test(line)) && !hasAnyBattlefieldMatch((descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isClothCard(descriptor.cardId))) {
    return "There is no Cloth on the battlefield for that spell.";
  }

  if (lines.some((line) => /Target Devotee gains Guardian until end of turn\./i.test(line)) && !hasAnyBattlefieldMatch(isBattlefieldDevoteeTarget)) {
    return "There is no Devotee on the battlefield for that spell.";
  }

  if (lines.some((line) => /Search your deck for a Cloth Relic/i.test(line)) && !anyZoneCardMatches(player.key, "deck", (descriptor) => isClothCard(descriptor.cardId))) {
    return "There is no Cloth Relic left in your deck.";
  }

  if (lines.some((line) => /Return .* from Tartarus/i.test(line)) && !anyZoneCardMatches(player.key, "tartarus", (descriptor) => isDevoteeCard(descriptor.cardId))) {
    return "There is no Devotee in Tartarus for that spell.";
  }

  return "";
}

function startSpellCastFromHand(playerKey, located) {
  if (!gameState || !located || located.zone !== "hand") {
    return null;
  }

  const player = gameState.players[playerKey];
  const card = located.cardData;
  const fail = (message) => {
    addLog(message);
    return { blocked: true };
  };

  if (card.tipo !== "Technique" && card.tipo !== "Moment") {
    return null;
  }

  if (card.tipo === "Moment" && !canCastMomentNow(playerKey)) {
    return fail(`${card.nome_exibicao_en} can only be played during your Main Phase.`);
  }

  if (card.tipo === "Technique" && !canCastTechniqueNow(playerKey)) {
    return fail(`${card.nome_exibicao_en} can only be played while you have priority to respond.`);
  }

  const availabilityError = getSpellAvailabilityError(player, located);
  if (availabilityError) {
    return fail(`${card.nome_exibicao_en} cannot be cast right now. ${availabilityError}`);
  }

  const amount = typeof card.custo === "number" ? card.custo : 0;
  const unit = card.unidade_custo || "cosmo";
  if (getAvailableCosmo(player, unit) < amount) {
    return fail(`${player.label} does not have enough ${unit === "base_cosmo" ? "Base Cosmo" : "Cosmo"} to cast ${card.nome_exibicao_en}.`);
  }

  if (amount <= 0) {
    beginSpellResolution(playerKey, located.card.uid, { costAlreadyPaid: true, allowCancel: false });
    return { pending: true };
  }

  const plans = buildCostPaymentPlans(playerKey, amount, unit);
  if (!plans.length) {
    return fail(`${player.label} cannot assemble the required payment for ${card.nome_exibicao_en}.`);
  }

  paymentState = {
    mode: "spell",
    playerKey,
    uid: located.card.uid,
    targetZone: "battlefield",
    cardName: card.nome_exibicao_en,
    amount,
    unit,
    plans
  };
  hoverPreview = null;
  closeContextMenu();
  closeFloatingInfo();
  return maybeAutoPay();
}

function beginSpellResolution(playerKey, uid, options = {}) {
  const located = findCardInstance(playerKey, uid);
  if (!located || located.zone !== "hand") {
    clearSpellResolution(false);
    addLog("The selected spell is no longer in hand.");
    return false;
  }

  const player = gameState.players[playerKey];
  const lines = getCardRulesLines(located.cardData);
  return resolveSpellCard(player, located, lines, options);
}

function maybeStartHandPlay(playerKey, located, targetZone, relocateOptions = {}) {
  if (!located || located.zone !== "hand" || targetZone !== "battlefield") {
    return null;
  }

  const player = gameState.players[playerKey];
  const card = located.cardData;
  const fail = (message) => {
    addLog(message);
    return { blocked: true };
  };

  if (card.tipo === "Technique" || card.tipo === "Moment") {
    return startSpellCastFromHand(playerKey, located);
  }

  if (gameState.currentPlayer !== playerKey) {
    return fail("You can only play cards from your hand during your own turn.");
  }

  if (gameState.currentPhase !== "main") {
    return fail("Cards can only be played from your hand during Main Phase.");
  }

  if (card.tipo !== "Devotee" && card.tipo !== "Relic") {
    return fail(`${card.nome_exibicao_en} cannot be played onto the battlefield from hand.`);
  }

  const amount = typeof card.custo === "number" ? card.custo : 0;
  const unit = card.unidade_custo || "cosmo";

  if (getAvailableCosmo(player, unit) < amount) {
    return fail(`${player.label} does not have enough ${unit === "base_cosmo" ? "Base Cosmo" : "Cosmo"} to play ${card.nome_exibicao_en}.`);
  }

  if (amount <= 0) {
    return null;
  }

  const plans = buildCostPaymentPlans(playerKey, amount, unit);
  if (!plans.length) {
    return fail(`${player.label} cannot assemble the required payment for ${card.nome_exibicao_en}.`);
  }

  paymentState = {
    playerKey,
    uid: located.card.uid,
    targetZone,
    relocateOptions,
    cardName: card.nome_exibicao_en,
    amount,
    unit,
    plans
  };
  hoverPreview = null;
  closeContextMenu();
  closeFloatingInfo();

  return maybeAutoPay();
}

function buildCostPaymentPlans(playerKey, amount, unit = "cosmo") {
  const player = gameState.players[playerKey];
  if (!player) {
    return [];
  }

  const plans = [];
  const seen = new Set();
  const pushPlan = (id, title, emphasis, breakdown) => {
    if (!breakdown) {
      return;
    }
    const signature = `${breakdown.latent}:${breakdown.pooled}:${breakdown.tappedBase}:${breakdown.unit}`;
    if (seen.has(signature)) {
      return;
    }
    seen.add(signature);
    plans.push({
      id,
      title,
      emphasis,
      detail: describeCostPlan(breakdown),
      breakdown
    });
  };

  pushPlan("base", "Pay with Cosmo Base", "Tap Cosmo Base cards to cover the cost.", createCostPaymentPlan(player, amount, "base", unit));

  if (unit !== "base_cosmo") {
    pushPlan("latent", "Pay with Latent Cosmo", "Spend only temporary Latent Cosmo.", createCostPaymentPlan(player, amount, "latent", unit));
    const mixed = createCostPaymentPlan(player, amount, "mixed", unit);
    const mixedUsesMultipleSources = mixed && [mixed.latent > 0, mixed.pooled > 0, mixed.tappedBase > 0].filter(Boolean).length > 1;
    if (mixedUsesMultipleSources) {
      pushPlan("mixed", "Mixed Payment", "Combine pool, Latent Cosmo, and Cosmo Base.", mixed);
    }
  }

  return plans;
}

function createCostPaymentPlan(player, amount, strategy = "auto", unit = "cosmo") {
  const pool = Math.max(0, player.cosmo);
  const latent = Math.max(0, player.latentCosmo);
  const untappedBase = countUntappedBase(player);
  const plan = {
    amount,
    unit,
    strategy,
    latent: 0,
    pooled: 0,
    tappedBase: 0
  };

  let remaining = amount;

  if (strategy === "latent") {
    if (unit === "base_cosmo" || latent < amount) {
      return null;
    }
    plan.latent = amount;
    return plan;
  }

  if (strategy === "base" || unit === "base_cosmo") {
    plan.pooled = Math.min(pool, remaining);
    remaining -= plan.pooled;
    plan.tappedBase = Math.min(untappedBase, remaining);
    remaining -= plan.tappedBase;
    return remaining === 0 ? plan : null;
  }

  if (strategy === "mixed" || strategy === "auto") {
    plan.latent = Math.min(latent, remaining);
    remaining -= plan.latent;
    plan.pooled = Math.min(pool, remaining);
    remaining -= plan.pooled;
    plan.tappedBase = Math.min(untappedBase, remaining);
    remaining -= plan.tappedBase;
    return remaining === 0 ? plan : null;
  }

  return null;
}

function describeCostPlan(plan) {
  if (!plan) {
    return "";
  }

  const parts = [];
  if (plan.latent > 0) {
    parts.push(`${plan.latent} Latent`);
  }
  if (plan.pooled > 0) {
    parts.push(`${plan.pooled} stored Cosmo`);
  }
  if (plan.tappedBase > 0) {
    parts.push(`tap ${plan.tappedBase} Cosmo Base`);
  }

  if (!parts.length) {
    return "No resource payment is needed.";
  }

  return parts.join(" • ");
}

function resolvePaymentChoice(planId) {
  if (!paymentState || !gameState) {
    return;
  }

  const plan = paymentState.plans.find((entry) => entry.id === planId);
  if (!plan) {
    return;
  }

  const located = findCardInstance(paymentState.playerKey, paymentState.uid);
  if (!located || located.zone !== "hand") {
    clearPaymentState(false);
    addLog("The selected card is no longer in hand.");
    return;
  }

  const player = gameState.players[paymentState.playerKey];
  if (!applyCostPaymentPlan(paymentState.playerKey, plan.breakdown, paymentState.cardName)) {
    return;
  }

  if (paymentState.mode === "spell") {
    const playerKey = paymentState.playerKey;
    const uid = paymentState.uid;
    clearPaymentState(false);
    beginSpellResolution(playerKey, uid, { costAlreadyPaid: true, allowCancel: false });
    return;
  }

  const moved = relocateCard(paymentState.playerKey, paymentState.uid, paymentState.targetZone, paymentState.relocateOptions || {});
  if (!moved) {
    addLog(`${paymentState.cardName} could not be moved after the payment was chosen.`);
    clearPaymentState(false);
    return;
  }

  addLog(`${playerLabel(paymentState.playerKey)} plays ${moved.cardData.nome_exibicao_en} onto the battlefield.`);
  clearPaymentState(false);
}

function clearPaymentState(writeLog = false) {
  if (!paymentState) {
    return;
  }

  if (writeLog) {
    addLog(`Payment canceled for ${paymentState.cardName}.`);
  }

  paymentState = null;
}

function applyCostPaymentPlan(playerKey, plan, label) {
  const player = gameState.players[playerKey];
  if (!player || !plan) {
    return false;
  }

  const resolvedPlan = createCostPaymentPlan(player, plan.amount, plan.strategy, plan.unit);
  if (!resolvedPlan) {
    addLog(`${player.label} no longer has the resources to pay for ${label}.`);
    return false;
  }

  if (resolvedPlan.latent > 0) {
    player.latentCosmo = Math.max(0, player.latentCosmo - resolvedPlan.latent);
  }

  if (resolvedPlan.pooled > 0) {
    player.cosmo = Math.max(0, player.cosmo - resolvedPlan.pooled);
  }

  if (resolvedPlan.tappedBase > 0) {
    tapUntappedBaseCardsForPayment(playerKey, resolvedPlan.tappedBase);
  }

  const parts = [];
  if (resolvedPlan.latent > 0) parts.push(`${resolvedPlan.latent} Latent`);
  if (resolvedPlan.pooled > 0) parts.push(`${resolvedPlan.pooled} stored Cosmo`);
  if (resolvedPlan.tappedBase > 0) parts.push(`${resolvedPlan.tappedBase} Cosmo Base`);
  addLog(`${player.label} pays ${formatValue(resolvedPlan.amount, resolvedPlan.unit) || resolvedPlan.amount} for ${label}${parts.length ? ` (${parts.join(", ")})` : ""}.`);
  return true;
}

function tapUntappedBaseCardsForPayment(playerKey, amount) {
  const player = gameState.players[playerKey];
  player.zones.cosmo_base
    .filter((instance) => !instance.tapped)
    .slice(0, amount)
    .forEach((instance) => {
      instance.tapped = true;
      instance.generatedCosmoWhenTapped = false;
    });
}

function normalizeCardStateForZone(instance, zoneId) {
  if (zoneId !== "battlefield") {
    instance.turnPowerBonus = 0;
    instance.turnResistanceBonus = 0;
    instance.enteredCombatThisTurn = false;
    instance.summoningSick = false;
    instance.sealLocked = false;
    instance.attachedToUid = null;
    instance.battlefieldPositionX = null;
    instance.battlefieldPositionY = null;
  }

  if (zoneId === "cosmo_base") {
    instance.tapped = false;
    instance.generatedCosmoWhenTapped = false;
    instance.sealLocked = false;
    instance.attachedToUid = null;
  }

  if (zoneId !== "battlefield" && zoneId !== "cosmo_base") {
    instance.tapped = false;
    instance.generatedCosmoWhenTapped = false;
    instance.sealLocked = false;
    instance.attachedToUid = null;
  }
}

function resolveEnterBattlefieldTriggers(playerKey, instance) {
  const player = gameState.players[playerKey];
  const enemy = gameState.players[otherPlayerKey(playerKey)];
  const card = getCard(instance.cardId);
  const lines = getCardRulesLines(card);

  if (lines.some((line) => /When Marin enters the battlefield, another target Devotee you control gets \+1\/\+1 until end of turn\./i.test(line))) {
    const target = player.zones.battlefield.find((entry) => entry.uid !== instance.uid && isDevoteeCard(entry.cardId));
    if (target) {
      target.turnPowerBonus += 1;
      target.turnResistanceBonus += 1;
      addLog(`${card.nome_exibicao_en} gives ${getCard(target.cardId).nome_exibicao_en} +1/+1 until end of turn.`);
    }
  }

  if (lines.some((line) => /When Sanctuary Soldier enters the battlefield, another target Devotee gets \+0\/\+1 until end of turn\./i.test(line))) {
    const target = player.zones.battlefield.find((entry) => entry.uid !== instance.uid && isDevoteeCard(entry.cardId));
    if (target) {
      target.turnResistanceBonus += 1;
      addLog(`${card.nome_exibicao_en} gives ${getCard(target.cardId).nome_exibicao_en} +0/+1 until end of turn.`);
    }
  }

  if (lines.some((line) => /When Shun enters the battlefield, return target enemy Devotee with cost 1 or less to its owner's hand\./i.test(line))) {
    const target = enemy.zones.battlefield.find((entry) => isDevoteeCard(entry.cardId) && getCard(entry.cardId).custo <= 1);
    if (target) {
      relocateCard(enemy.key, target.uid, "hand");
      addLog(`${card.nome_exibicao_en} returns ${getCard(target.cardId).nome_exibicao_en} to its owner's hand.`);
    }
  }

  if (lines.some((line) => /When Sagittarius Cloth enters the battlefield, it deals 3 damage to target Devotee\./i.test(line))) {
    const target = enemy.zones.battlefield.find((entry) => isDevoteeCard(entry.cardId));
    if (target) {
      const located = findCardInstance(enemy.key, target.uid);
      if (located) {
        applyDamageToDevotee(located, 3);
      }
    }
  }

  if (lines.some((line) => /When Libra Cloth enters the battlefield, search your deck for a Weapon Relic, reveal it, and put it into your hand\./i.test(line))) {
    openZoneBrowser({
      playerKey,
      zone: "deck",
      title: card.nome_exibicao_en,
      prompt: "Choose a Weapon Relic in your library to reveal and put into your hand.",
      cancelMessage: `${card.nome_exibicao_en} search canceled.`,
      filter: (descriptor) => descriptor.cardData.subtipos.includes("Weapon"),
      onSelect: (selectedUid) => {
        const chosen = getZoneBrowserEntry(playerKey, selectedUid);
        if (!chosen || chosen.zone !== "deck") {
          return;
        }
        const moved = moveCardByEffect(playerKey, selectedUid, "hand");
        if (!moved) {
          return;
        }
        addLog(`${player.label} reveals ${moved.cardData.nome_exibicao_en} and puts it into their hand.`);
        shuffle(player.zones.deck);
        addLog(`${player.label} shuffles their deck.`);
      }
    });
  }

  if (lines.some((line) => /When Aquarius Cloth enters the battlefield, put a Seal counter on target Devotee\./i.test(line))) {
    const target = enemy.zones.battlefield.find((entry) => isDevoteeCard(entry.cardId)) || player.zones.battlefield.find((entry) => entry.uid !== instance.uid && isDevoteeCard(entry.cardId));
    if (target) {
      applySealCounter(findCardInstance(target.owner || player.key, target.uid) || {
        card: target,
        zone: "battlefield",
        cardId: target.cardId,
        cardData: getCard(target.cardId)
      }, card.nome_exibicao_en);
    }
  }

  if (lines.some((line) => /When Leo Cloth enters the battlefield, deal 1 damage to all enemy Devotees\./i.test(line))) {
    enemy.zones.battlefield
      .filter((entry) => isDevoteeCard(entry.cardId))
      .forEach((entry) => {
        const located = findCardInstance(enemy.key, entry.uid);
        if (located) {
          applyDamageToDevotee(located, 1);
        }
      });
  }

  if (lines.some((line) => /When Virgo Cloth enters the battlefield, remove all Latent Cosmo from target opponent\./i.test(line))) {
    enemy.latentCosmo = 0;
    addLog(`${card.nome_exibicao_en} removes all Latent Cosmo from ${enemy.label}.`);
  }
}

function isNamedSaintLegendaryCard(card) {
  if (!card || card.tipo !== "Devotee") {
    return false;
  }

  const saintRanks = new Set(["Bronze Saint", "Silver Saint", "Gold Saint"]);
  const hasSaintRank = (card.subtipos || []).some((subtype) => saintRanks.has(subtype));
  const hasProperName = /,/.test(card.nome_exibicao_en || "");

  return hasSaintRank && hasProperName;
}

function getNamedSaintLegendaryGroup(playerKey, name) {
  const player = gameState?.players?.[playerKey];
  if (!player || !name) {
    return [];
  }

  return player.zones.battlefield
    .map((instance) => findCardInstance(playerKey, instance.uid))
    .filter(Boolean)
    .filter((located) => {
      const card = located.cardData;
      return isNamedSaintLegendaryCard(card) && card.nome_exibicao_en === name;
    });
}

function chooseLegendarySaintKeepTarget(playerKey, duplicates, preferredUid) {
  const player = gameState.players[playerKey];
  if (!duplicates.length) {
    return null;
  }

  if (!isAiPlayer(playerKey)) {
    return preferredUid || duplicates[0].card.uid;
  }

  const sorted = [...duplicates].sort((left, right) => {
    const leftStats = getComputedStats(player, left.card, left.cardData, left.zone);
    const rightStats = getComputedStats(player, right.card, right.cardData, right.zone);
    const leftScore = (leftStats.power ?? 0) + (leftStats.resistance ?? 0) + left.card.plusOneCounters;
    const rightScore = (rightStats.power ?? 0) + (rightStats.resistance ?? 0) + right.card.plusOneCounters;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    if (right.card.uid === preferredUid) return 1;
    if (left.card.uid === preferredUid) return -1;
    return 0;
  });

  return sorted[0]?.card.uid || preferredUid || duplicates[0].card.uid;
}

function resolveNamedSaintLegendaryChoice(playerKey, cardName, keepUid) {
  const duplicates = getNamedSaintLegendaryGroup(playerKey, cardName);
  if (duplicates.length <= 1) {
    return;
  }

  duplicates
    .filter((located) => located.card.uid !== keepUid)
    .forEach((located) => {
      addLog(`${located.cardData.nome_exibicao_en} is put into Tartarus by the legendary rule.`);
      const moved = relocateCard(located.card.owner, located.card.uid, "tartarus", { force: true });
      if (moved) {
        handleDevoteeDestroyed(moved);
      }
    });

  const kept = findCardInstance(playerKey, keepUid);
  if (kept) {
    addLog(`${gameState.players[playerKey].label} keeps ${kept.cardData.nome_exibicao_en} on the battlefield under the legendary rule.`);
  }
}

function enforceNamedSaintLegendaryRule(playerKey, enteredUid) {
  const entered = findCardInstance(playerKey, enteredUid);
  if (!entered || entered.zone !== "battlefield" || !isNamedSaintLegendaryCard(entered.cardData)) {
    return;
  }

  const duplicates = getNamedSaintLegendaryGroup(playerKey, entered.cardData.nome_exibicao_en);
  if (duplicates.length <= 1) {
    return;
  }

  if (isAiPlayer(playerKey)) {
    const keepUid = chooseLegendarySaintKeepTarget(playerKey, duplicates, enteredUid);
    resolveNamedSaintLegendaryChoice(playerKey, entered.cardData.nome_exibicao_en, keepUid);
    return;
  }

  openZoneBrowser({
    playerKey,
    zone: "battlefield",
    title: "Legendary Rule",
    prompt: `Choose which copy of ${entered.cardData.nome_exibicao_en} stays on the battlefield.`,
    cancelMessage: "Legendary choice canceled.",
    allowCancel: false,
    filter: (descriptor) =>
      descriptor.zone === "battlefield" &&
      descriptor.cardData.nome_exibicao_en === entered.cardData.nome_exibicao_en &&
      isNamedSaintLegendaryCard(descriptor.cardData),
    onSelect: (selectedUid) => {
      resolveNamedSaintLegendaryChoice(playerKey, entered.cardData.nome_exibicao_en, selectedUid);
    }
  });
}

function resolveEnterCombat(playerKey, uid) {
  const player = gameState.players[playerKey];
  const located = findCardInstance(playerKey, uid);

  if (!located || located.zone !== "battlefield" || !isDevoteeCard(located.cardId)) {
    addLog("Select one of your Devotees on the battlefield to attack.");
    return;
  }

  if (playerKey !== gameState.currentPlayer) {
    addLog("Only the active player can attack.");
    return;
  }

  if (gameState.currentPhase !== "main") {
    addLog("Attacks can only be declared during Main Phase.");
    return;
  }

  if (located.card.summoningSick && !hasKeyword(located.cardData, "Impulse", located.card)) {
    addLog(`${located.cardData.nome_exibicao_en} has summoning sickness and cannot attack this turn.`);
    return;
  }

  if (hasKeyword(located.cardData, "Sealed", located.card)) {
    addLog(`${located.cardData.nome_exibicao_en} is Sealed and cannot attack.`);
    return;
  }

  if (located.card.tapped || located.card.enteredCombatThisTurn) {
    addLog(`${located.cardData.nome_exibicao_en} cannot attack again this turn.`);
    return;
  }

  clearCombatState();
  gameState.combat.attacker = {
    playerKey,
    uid
  };
  gameState.combat.mode = "target";
  addLog(`${player.label} prepares ${located.cardData.nome_exibicao_en} to attack. Select an enemy Devotee or the enemy God.`);
}

function resolveSurvivedCombat(playerKey, uid) {
  const located = findCardInstance(playerKey, uid);

  if (!located || located.zone !== "battlefield" || !isDevoteeCard(located.cardId)) {
    addLog("Select a Devotee on the battlefield to mark survived combat.");
    return;
  }

  markSurvivedCombat(playerKey, uid);
}

function setPhase(phase) {
  if (!gameState) {
    return;
  }

  gameState.currentPhase = phase;
  if (phase !== "main") {
    clearCombatState(false, true);
  }
  addLog(`Phase set to ${phaseLabel(phase)}.`);
}

function clearCombatState(writeLog = false, revertAttack = false) {
  if (!gameState) {
    return;
  }

  clearPriorityTimer();
  const combat = gameState.combat;
  const hadCombat = combat?.attacker || combat?.target;

  if (revertAttack && combat?.attacker && combat.mode === "target") {
    addLog("Attack selection canceled.");
  }

  gameState.combat = createEmptyCombatState();
  if (writeLog && hadCombat) {
    addLog("Combat selection cleared.");
  }
}

function startTargetingState(config) {
  targetingState = config;
}

function clearTargetingState(writeLog = false) {
  if (writeLog && targetingState?.allowCancel === false) {
    return;
  }
  if (writeLog && targetingState?.cancelMessage) {
    addLog(targetingState.cancelMessage);
  }
  if (typeof targetingState?.onCancel === "function") {
    targetingState.onCancel();
  }
  targetingState = null;
}

function tryHandleTargetingSelection(cardElement, inspectElement) {
  if (!targetingState) {
    return false;
  }

  if (inspectElement?.dataset.inspectKind === "god") {
    const descriptor = {
      kind: "god",
      playerKey: inspectElement.dataset.player
    };
    if (targetingState.isValidTarget(descriptor)) {
      targetingState.resolve(descriptor);
      clearTargetingState();
      return true;
    }
  }

  if (!cardElement) {
    return false;
  }

  const located = findCardInstance(cardElement.dataset.player, cardElement.dataset.cardUid);
  if (!located) {
    return false;
  }

  const descriptor = {
    kind: "card",
    playerKey: cardElement.dataset.player,
    uid: located.card.uid,
    zone: located.zone,
    card: located.card,
    cardId: located.cardId,
    cardData: located.cardData
  };

  if (!targetingState.isValidTarget(descriptor)) {
    return false;
  }

  targetingState.resolve(descriptor);
  clearTargetingState();
  return true;
}

function tryHandleCombatSelection(cardElement, inspectElement) {
  const combat = gameState?.combat;
  if (!combat?.mode || !combat.attacker) {
    return false;
  }

  if (combat.mode === "target") {
    if (
      inspectElement?.dataset.inspectKind === "god" &&
      inspectElement.dataset.player !== combat.attacker.playerKey &&
      isAttackableGodTarget(inspectElement.dataset.player)
    ) {
      gameState.combat.target = {
        kind: "god",
        playerKey: inspectElement.dataset.player
      };
      openCombatPriorityWindow();
      return true;
    }

    if (!cardElement) {
      return false;
    }

    const enemyPlayerKey = otherPlayerKey(combat.attacker.playerKey);
    if (cardElement.dataset.player !== enemyPlayerKey) {
      return false;
    }

    const located = findCardInstance(cardElement.dataset.player, cardElement.dataset.cardUid);
    if (!located || !isAttackableCardTarget(cardElement.dataset.player, located.zone, located.card, located.cardData)) {
      return false;
    }

    gameState.combat.target = {
      kind: "card",
      playerKey: enemyPlayerKey,
      uid: located.card.uid
    };
    openCombatPriorityWindow();
    return true;
  }

  return false;
}

function openCombatPriorityWindow() {
  const combat = gameState?.combat;
  if (!combat?.attacker || !combat?.target) {
    return;
  }

  const attacker = findCardInstance(combat.attacker.playerKey, combat.attacker.uid);
  if (!attacker || attacker.zone !== "battlefield") {
    addLog("The attacking Devotee is no longer on the battlefield.");
    clearCombatState();
    return;
  }

  finalizeAttackDeclaration(attacker);
  combat.mode = "priority";
  combat.priorityPlayerKey = combat.target.playerKey;
  combat.responseActive = !isAiPlayer(combat.priorityPlayerKey);
  combat.resolving = false;
  if (combat.responseActive) {
    addLog(`${gameState.players[combat.priorityPlayerKey].label} may respond to the attack now.`);
  } else {
    addLog(`${gameState.players[combat.priorityPlayerKey].label} has priority to respond to the attack.`);
  }
  renderGame();
  maybeHandleAiCombatPriority();
}

function enterCombatResponseWindow() {
  if (!isPriorityWindowOpen()) {
    return;
  }

  const combat = gameState.combat;
  if (isAiPlayer(combat.priorityPlayerKey)) {
    return;
  }

  combat.responseActive = true;
  addLog(`${gameState.players[combat.priorityPlayerKey].label} chooses to respond before combat damage.`);
}

async function resolveCombatFromPriority(fromAi = false) {
  if (!isPriorityWindowOpen() || gameState.combat.resolving) {
    return;
  }

  const combat = gameState.combat;
  const defender = gameState.players[combat.priorityPlayerKey];
  if (fromAi) {
    addLog(`${defender.label} chooses OK.`);
  } else if (!combat.responseActive) {
    addLog(`${defender.label} chooses OK.`);
  } else {
    addLog(`${defender.label} passes priority. Combat damage resolves.`);
  }

  combat.resolving = true;
  combat.responseActive = false;
  renderGame();
  await waitCombatBeat();
  await playAttackLunge(combat);
  resolveCombatSequence();
  const shouldResumeAi = Boolean(gameState?.combat?.resumeAiAfterResolution);
  clearCombatState();
  renderGame();

  if (shouldResumeAi && gameState?.currentPlayer && isAiPlayer(gameState.currentPlayer)) {
    scheduleAiTurnIfNeeded();
  }

  if (attackQueue.length && gameState?.currentPlayer === "A") {
    await waitCombatBeat();
    runNextQueuedAttack();
    renderGame();
  }
}

function maybeHandleAiCombatPriority() {
  if (!isPriorityWindowOpen() || !isAiPlayer(gameState.combat.priorityPlayerKey)) {
    return;
  }

  clearPriorityTimer();
  priorityTimer = window.setTimeout(() => {
    priorityTimer = null;
    resolveCombatFromPriority(true);
  }, AI_DELAY_MS + AI_SHORT_DELAY_MS);
}

function waitCombatBeat(multiplier = 1) {
  return new Promise((resolve) => window.setTimeout(resolve, COMBAT_STEP_DELAY_MS * multiplier));
}

function resolveCombatSequence() {
  const combat = gameState?.combat;
  if (!combat?.attacker || !combat?.target) {
    addLog("Attack needs an attacker and a target.");
    return;
  }

  const attacker = findCardInstance(combat.attacker.playerKey, combat.attacker.uid);
  if (!attacker || attacker.zone !== "battlefield") {
    addLog("The attacking Devotee is no longer on the battlefield.");
    return;
  }

  if (combat.target.kind === "god") {
    resolveAttackAgainstGod(attacker, combat.target.playerKey);
    return;
  }

  const defender = findCardInstance(combat.target.playerKey, combat.target.uid);
  if (!defender || defender.zone !== "battlefield") {
    addLog("The selected target is no longer on the battlefield.");
    return;
  }

  resolveAttackAgainstDevotee(attacker, defender);
}

function finalizeAttackDeclaration(attacker) {
  const player = gameState.players[attacker.card.owner];
  const attachedEquipment = getAttachedEquipment(player, attacker.card.uid);

  attacker.card.tapped = true;
  if (!attacker.card.enteredCombatThisTurn) {
    attacker.card.enteredCombatThisTurn = true;
  }

  if (attacker.cardData.nome_exibicao_en === "Seiya, Pegasus Saint" && player.latentCosmo >= 1) {
    player.latentCosmo -= 1;
    attacker.card.turnPowerBonus += 1;
    addLog(`${player.label} pays 1 Latent Cosmo for Seiya and ${attacker.cardData.nome_exibicao_en} gets +1/+0 until end of turn.`);
  }

  attachedEquipment.forEach(({ cardData }) => {
    if (cardData.nome_exibicao_en === "Libra Sword" && !attacker.card.tempKeywords.includes("Pierce")) {
      attacker.card.tempKeywords.push("Pierce");
      addLog(`${cardData.nome_exibicao_en} gives Pierce to ${attacker.cardData.nome_exibicao_en} for this combat.`);
    }

    if (cardData.nome_exibicao_en === "Leo Cloth" && attacker.cardData.nome_exibicao_en === "Aiolia, Leo Gold Saint") {
      attacker.card.turnPowerBonus += 1;
      addLog(`${cardData.nome_exibicao_en} gives ${attacker.cardData.nome_exibicao_en} +1/+0 when attacking.`);
    }
  });
}

function resolveAttackAgainstGod(attacker, defenderPlayerKey) {
  const attackingPlayer = gameState.players[attacker.card.owner];
  const defendingPlayer = gameState.players[defenderPlayerKey];
  const attackerStats = getComputedStats(attackingPlayer, attacker.card, attacker.cardData, attacker.zone);
  const attackPower = Math.max(0, attackerStats.power ?? 0);
  const attackerHasUnfaith = hasKeyword(attacker.cardData, "Unfaith", attacker.card);

  if (defendingPlayer.god.preventDamageUntilEnd) {
    addLog(`${defendingPlayer.label} prevents all damage to their God this turn.`);
    showCombatToast(`${defendingPlayer.label}'s God prevents all damage.`);
  } else {
    if (attackerHasUnfaith) {
      const removed = Math.min(defendingPlayer.latentCosmo, attackPower);
      defendingPlayer.latentCosmo = Math.max(0, defendingPlayer.latentCosmo - attackPower);
      addLog(`${attackingPlayer.label} attacks ${defendingPlayer.label}'s God with ${attacker.cardData.nome_exibicao_en} and removes ${removed} Latent Cosmo thanks to Unfaith.`);
      showCombatToast(`${attacker.cardData.nome_exibicao_en} removes ${removed} Latent Cosmo from ${defendingPlayer.label}.`);
    } else {
      defendingPlayer.god.soul = Math.max(0, defendingPlayer.god.soul - attackPower);
      syncAwakenState(defendingPlayer);
      addLog(`${attackingPlayer.label} attacks ${defendingPlayer.label}'s God with ${attacker.cardData.nome_exibicao_en} for ${attackPower} damage.`);
      showCombatToast(`${attacker.cardData.nome_exibicao_en} dealt ${attackPower} damage to ${defendingPlayer.label}'s God.`);
      if (hasAttachedCardByName(attackingPlayer, attacker.card.uid, "Pope Dagger") && attackPower > 0) {
        defendingPlayer.god.soul = Math.max(0, defendingPlayer.god.soul - 1);
        syncAwakenState(defendingPlayer);
        addLog(`${attacker.cardData.nome_exibicao_en} deals 1 additional Soul damage to ${defendingPlayer.label}'s God because of Pope Dagger.`);
      }
    }
  }

  resolveGodCounterattackAgainstDevotee(attacker, defendingPlayer);

  if (findCardInstance(attacker.card.owner, attacker.card.uid)?.zone === "battlefield") {
    markSurvivedCombat(attacker.card.owner, attacker.card.uid);
  }
}

function getCurrentResistanceForLocated(located) {
  if (!located) {
    return null;
  }

  const player = gameState.players[located.card.owner];
  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  return computed.resistance;
}

function resolveGodCounterattackAgainstDevotee(attacker, defendingPlayer) {
  const godAttack = Math.max(0, defendingPlayer.god.attack ?? 0);
  if (godAttack <= 0) {
    return;
  }

  const resistanceBefore = Math.max(0, getCurrentResistanceForLocated(attacker) ?? 0);
  addLog(`${defendingPlayer.label}'s God counterattacks ${attacker.cardData.nome_exibicao_en} for ${godAttack} damage.`);
  showCombatToast(`${defendingPlayer.label}'s God dealt ${godAttack} damage to ${attacker.cardData.nome_exibicao_en}.`);

  const destroyed = applyDamageToDevotee(attacker, godAttack);
  if (destroyed || resistanceBefore <= godAttack) {
    addLog(`${attacker.cardData.nome_exibicao_en} is destroyed by the God's counterattack.`);
    return;
  }

  const refreshed = findCardInstance(attacker.card.owner, attacker.card.uid);
  const remainingResistance = Math.max(0, getCurrentResistanceForLocated(refreshed) ?? 0);
  addLog(`${attacker.cardData.nome_exibicao_en} survives the God's counterattack and stays with ${remainingResistance} Resistance until end of turn.`);
}

function resolveAttackAgainstDevotee(attacker, defender) {
  const attackingPlayer = gameState.players[attacker.card.owner];
  const defendingPlayer = gameState.players[defender.card.owner];
  const attackerStats = getComputedStats(attackingPlayer, attacker.card, attacker.cardData, attacker.zone);
  const defenderStats = getComputedStats(defendingPlayer, defender.card, defender.cardData, defender.zone);
  const attackerPower = Math.max(0, attackerStats.power ?? 0);
  const defenderPower = Math.max(0, defenderStats.power ?? 0);
  const attackerLongRange = hasKeyword(attacker.cardData, "Long Range");
  const defenderLongRange = hasKeyword(defender.cardData, "Long Range");
  let attackerDealtCombatDamage = false;

  addLog(`${attackingPlayer.label} attacks ${defender.cardData.nome_exibicao_en} with ${attacker.cardData.nome_exibicao_en}.`);
  showCombatToast(`${attacker.cardData.nome_exibicao_en} attacks ${defender.cardData.nome_exibicao_en}.`);

  const defenderStartingResistance = Math.max(0, defenderStats.resistance ?? 0);

  if (attackerLongRange && !defenderLongRange) {
    addLog(`${attacker.cardData.nome_exibicao_en} has Long Range and strikes first.`);
    const defenderDestroyed = applyDamageToDevotee(defender, attackerPower);
    attackerDealtCombatDamage = attackerPower > 0;
    handleCombatDamageTriggers(attacker, defender, attackerPower);
    if (!defenderDestroyed) {
      applyDamageToDevotee(attacker, defenderPower);
      handleCombatDamageTriggers(defender, attacker, defenderPower);
    }
  } else if (defenderLongRange && !attackerLongRange) {
    addLog(`${defender.cardData.nome_exibicao_en} has Long Range and strikes first.`);
    const attackerDestroyed = applyDamageToDevotee(attacker, defenderPower);
    handleCombatDamageTriggers(defender, attacker, defenderPower);
    if (!attackerDestroyed) {
      applyDamageToDevotee(defender, attackerPower);
      attackerDealtCombatDamage = attackerPower > 0;
      handleCombatDamageTriggers(attacker, defender, attackerPower);
    }
  } else {
    applySimultaneousCombatDamage(attacker, attackerPower, defender, defenderPower);
    attackerDealtCombatDamage = attackerPower > 0;
  }

  const defenderStillThere = findCardInstance(defender.card.owner, defender.card.uid)?.zone === "battlefield";
  if (
    attackerDealtCombatDamage &&
    hasKeyword(attacker.cardData, "Pierce", attacker.card) &&
    attackerPower > defenderStartingResistance &&
    !defendingPlayer.god.preventDamageUntilEnd
  ) {
    const excess = attackerPower - defenderStartingResistance;
    defendingPlayer.god.soul = Math.max(0, defendingPlayer.god.soul - excess);
    syncAwakenState(defendingPlayer);
    addLog(`${attacker.cardData.nome_exibicao_en} deals ${excess} Pierce damage to ${defendingPlayer.label}'s God.`);
    showCombatToast(`${attacker.cardData.nome_exibicao_en} pierced ${excess} damage to ${defendingPlayer.label}'s God.`);
  }

  if (findCardInstance(attacker.card.owner, attacker.card.uid)?.zone === "battlefield") {
    markSurvivedCombat(attacker.card.owner, attacker.card.uid);
  }

  if (findCardInstance(defender.card.owner, defender.card.uid)?.zone === "battlefield") {
    markSurvivedCombat(defender.card.owner, defender.card.uid);
  }

  handlePostCombatTriggers(attacker, defender, defenderStillThere);
}

function applySimultaneousCombatDamage(attacker, attackerPower, defender, defenderPower) {
  if (attackerPower > 0) {
    defender.card.damageCounters += attackerPower;
    maybeGainLatentCosmoFromDamage(defender.card.owner);
    addLog(`${attacker.cardData.nome_exibicao_en} deals ${attackerPower} damage to ${defender.cardData.nome_exibicao_en}.`);
    showCombatToast(`${attacker.cardData.nome_exibicao_en} dealt ${attackerPower} damage to ${defender.cardData.nome_exibicao_en}.`);
    handleCombatDamageTriggers(attacker, defender, attackerPower);
  }

  if (defenderPower > 0) {
    attacker.card.damageCounters += defenderPower;
    maybeGainLatentCosmoFromDamage(attacker.card.owner);
    addLog(`${defender.cardData.nome_exibicao_en} deals ${defenderPower} damage to ${attacker.cardData.nome_exibicao_en}.`);
    showCombatToast(`${defender.cardData.nome_exibicao_en} dealt ${defenderPower} damage to ${attacker.cardData.nome_exibicao_en}.`);
    handleCombatDamageTriggers(defender, attacker, defenderPower);
  }

  checkDevoteeDestroyed(defender);
  checkDevoteeDestroyed(attacker);
}

function handleCombatDamageTriggers(source, target, amount) {
  if (!source || !target || amount <= 0) {
    return;
  }

  if (source.cardData.nome_exibicao_en === "Hyoga, Cygnus Saint") {
    applySealCounter(target, source.cardData.nome_exibicao_en);
  }

  const sourcePlayer = gameState.players[source.card.owner];
  if (hasAttachedCardByName(sourcePlayer, source.card.uid, "Aquarius Cloth")) {
    if (source.cardData.nome_exibicao_en === "Camus, Aquarius Gold Saint") {
      applySealCounter(target, "Aquarius Cloth");
    }
    if (source.cardData.nome_exibicao_en === "Hyoga, Cygnus Saint") {
      sourcePlayer.latentCosmo += 1;
      addLog(`Aquarius Cloth generates 1 Latent Cosmo for ${sourcePlayer.label}.`);
    }
  }
}

function handlePostCombatTriggers(attacker, defender, defenderStillThere) {
  const attackerLive = findCardInstance(attacker.card.owner, attacker.card.uid);
  const defenderLive = findCardInstance(defender.card.owner, defender.card.uid);

  if (defender.cardData.nome_exibicao_en === "Shun, Andromeda Saint" && attackerLive?.zone === "battlefield") {
    relocateCard(attacker.card.owner, attacker.card.uid, "hand");
    addLog(`${defender.cardData.nome_exibicao_en} returns ${attacker.cardData.nome_exibicao_en} to its owner's hand after combat.`);
  }

  if (attacker.cardData.nome_exibicao_en === "Aldebaran, Taurus Gold Saint" && attackerLive?.zone === "battlefield") {
    triggerAldebaranSurvivalDamage(attackerLive, defender.card.owner);
  }

  if (defender.cardData.nome_exibicao_en === "Aldebaran, Taurus Gold Saint" && defenderLive?.zone === "battlefield") {
    triggerAldebaranSurvivalDamage(defenderLive, attacker.card.owner);
  }

  if (attackerLive?.zone === "battlefield" && hasAttachedCardByName(gameState.players[attacker.card.owner], attacker.card.uid, "Virgo Cloth") && attacker.cardData.nome_exibicao_en === "Shaka, Virgo Gold Saint") {
    const enemyGod = gameState.players[defender.card.owner].god;
    enemyGod.soul = Math.max(0, enemyGod.soul - 1);
    addLog(`Virgo Cloth makes ${gameState.players[defender.card.owner].label} lose 1 Soul.`);
  }
}

function triggerAldebaranSurvivalDamage(aldebaran, enemyPlayerKey) {
  if (!aldebaran || aldebaran.zone !== "battlefield") {
    return;
  }

  const enemy = gameState.players[enemyPlayerKey];
  const validTargets = enemy.zones.battlefield.filter((instance) => isDevoteeCard(instance.cardId));
  if (validTargets.length === 0) {
    addLog(`${aldebaran.cardData.nome_exibicao_en} survived combat, but there is no enemy Devotee to take 1 damage.`);
    return;
  }

  const resolveAldebaranDamage = (targetDescriptor) => {
    const target = findCardInstance(targetDescriptor.playerKey, targetDescriptor.uid);
    if (!target || target.zone !== "battlefield") {
      return;
    }

    addLog(`${aldebaran.cardData.nome_exibicao_en} survived combat and deals 1 damage to ${target.cardData.nome_exibicao_en}.`);
    showCombatToast(`${aldebaran.cardData.nome_exibicao_en} deals 1 damage to ${target.cardData.nome_exibicao_en}.`);
    applyDamageToDevotee(target, 1);
  };

  if (isAiPlayer(aldebaran.card.owner)) {
    const preferredTarget = validTargets
      .map((instance) => findCardInstance(enemyPlayerKey, instance.uid))
      .filter(Boolean)
      .sort((left, right) => (getCurrentResistanceForLocated(left) ?? 99) - (getCurrentResistanceForLocated(right) ?? 99))[0];

    if (preferredTarget) {
      resolveAldebaranDamage({
        kind: "card",
        playerKey: enemyPlayerKey,
        uid: preferredTarget.card.uid
      });
    }
    return;
  }

  startTargetingState({
    source: { kind: "card", playerKey: aldebaran.card.owner, uid: aldebaran.card.uid },
    prompt: "Aldebaran survived combat. Choose an enemy Devotee to take 1 damage.",
    statusLabel: "Choose Devotee for Aldebaran",
    allowCancel: false,
    isValidTarget: (descriptor) =>
      isBattlefieldDevoteeTarget(descriptor) &&
      descriptor.playerKey === enemyPlayerKey,
    resolve: resolveAldebaranDamage
  });
}

function applyDamageToDevotee(located, amount) {
  if (!located || amount <= 0) {
    return false;
  }

  if (located.card.preventDamageShield > 0) {
    const prevented = Math.min(located.card.preventDamageShield, amount);
    located.card.preventDamageShield -= prevented;
    amount -= prevented;
    addLog(`${located.cardData.nome_exibicao_en} prevents ${prevented} damage.`);
  }

  if (amount <= 0) {
    return false;
  }

  located.card.damageCounters += amount;
  maybeGainLatentCosmoFromDamage(located.card.owner);
  addLog(`${located.cardData.nome_exibicao_en} takes ${amount} damage.`);
  showCombatToast(`${located.cardData.nome_exibicao_en} takes ${amount} damage.`);
  return checkDevoteeDestroyed(located);
}

function checkDevoteeDestroyed(located) {
  const refreshed = findCardInstance(located.card.owner, located.card.uid);
  if (!refreshed || refreshed.zone !== "battlefield") {
    return true;
  }

  const player = gameState.players[refreshed.card.owner];
  const computed = getComputedStats(player, refreshed.card, refreshed.cardData, refreshed.zone);
  if (computed.resistance !== null && computed.resistance <= 0) {
    if (refreshed.card.cannotBeDestroyedUntilEnd) {
      addLog(`${refreshed.cardData.nome_exibicao_en} would be destroyed, but survives because it cannot be destroyed this turn.`);
      return false;
    }
    relocateCard(refreshed.card.owner, refreshed.card.uid, "tartarus");
    addLog(`${refreshed.cardData.nome_exibicao_en} is destroyed and sent to Tartarus.`);
    handleDevoteeDestroyed(refreshed);
    return true;
  }

  return false;
}

function maybeGainLatentCosmoFromDamage(playerKey) {
  if (gameState.currentPlayer === playerKey) {
    return;
  }

  const player = gameState.players[playerKey];
  player.latentCosmo += 1;
  addLog(`${player.label} gains 1 Latent Cosmo because one of their Devotees took damage during the opponent's turn.`);
}

function handleDevoteeDestroyed(located) {
  detachEquipmentFromDevotee(located.card.owner, located.card.uid);

  PLAYER_ORDER.forEach((playerKey) => {
    const controller = gameState.players[playerKey];
    const deathmaskCount = controller.zones.battlefield.filter(
      (instance) => getCard(instance.cardId).nome_exibicao_en === "Deathmask, Cancer Gold Saint"
    ).length;

    if (deathmaskCount > 0) {
      const owner = gameState.players[located.card.owner];
      owner.god.soul = Math.max(0, owner.god.soul - deathmaskCount);
      syncAwakenState(owner);
      addLog(`${owner.label} loses ${deathmaskCount} Soul because a Devotee was destroyed while Deathmask is on the battlefield.`);
    }
  });
}

function markSurvivedCombat(playerKey, uid) {
  const player = gameState.players[playerKey];
  const located = findCardInstance(playerKey, uid);

  if (!located || located.zone !== "battlefield" || !isDevoteeCard(located.cardId)) {
    return;
  }

  if (
    player.god.cardId === ATHENA_GOD_ID &&
    isAthenaCard(located.cardData) &&
    gameState.currentPlayer !== playerKey &&
    !gameState.combat.cosmoOfHopeTriggeredFor[playerKey]
  ) {
    player.latentCosmo += 1;
    gameState.combat.cosmoOfHopeTriggeredFor[playerKey] = true;
    addLog(`${player.label} triggers Cosmo of Hope because ${located.cardData.nome_exibicao_en} survived combat during the opponent's turn and gains 1 Latent Cosmo.`);
    return;
  }

  addLog(`${player.label} marks ${located.cardData.nome_exibicao_en} as having survived combat.`);
}

function resolveGodAbility(playerKey, abilityId) {
  const player = gameState.players[playerKey];
  const godCard = getCard(player.god.cardId);

  if (godCard.id !== ATHENA_GOD_ID) {
    addLog(`${player.label}'s God automation is not implemented yet.`);
    return;
  }

  if (abilityId === "hope") {
    addLog("Cosmo of Hope is now a passive ability and triggers automatically only when one or more Athena Devotees survive combat during the opponent's turn.");
    return;
  }

  if (abilityId === "prayer") {
    openZoneBrowser({
      playerKey,
      zone: "tartarus",
      title: "Athena's Prayer",
      prompt: "Choose one of your Athena Devotees in Tartarus to return to the battlefield Unprepared.",
      cancelMessage: "Athena's Prayer canceled.",
      filter: (descriptor) => isDevoteeCard(descriptor.cardId) && isAthenaCard(descriptor.cardData),
      onSelect: (selectedUid) => {
        const target = getZoneBrowserEntry(playerKey, selectedUid);
        if (!target || target.zone !== "tartarus") {
          return;
        }
        if (!spendCosmo(player, 5, "Athena's Prayer")) {
          return;
        }

        const moved = moveCardByEffect(playerKey, target.card.uid, "battlefield", { tapped: true });
        if (!moved) {
          addLog("Athena's Prayer could not move the selected Devotee.");
          return;
        }

        moved.card.plusOneCounters += 1;
        player.freeEquipTargetUid = moved.card.uid;
        addLog(`${player.label} returns ${moved.cardData.nome_exibicao_en} from Tartarus to the battlefield Unprepared with a +1/+1 counter.`);
        addLog("You may equip a Cloth to that Devotee ignoring equip cost this turn.");
        selectedInspector = { kind: "card", playerKey, uid: moved.card.uid };
        renderGame();
      }
    });
    return;
  }

  if (abilityId === "awaken-save") {
    if (!player.god.awakened) {
      addLog("Awaken Save can only be used while Athena is awakened.");
      return;
    }

    startTargetingState({
      source: { kind: "god", playerKey },
      prompt: "Select one of your Devotees to survive and set its Resistance to 1.",
      statusLabel: "Choose Devotee for Awaken Save",
      cancelMessage: "Awaken Save canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.playerKey === playerKey && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
      resolve: (descriptor) => {
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target || !spendCosmo(player, 5, "Athena Awaken Ability")) {
          return;
        }
        const computed = getComputedStats(player, target.card, target.cardData, target.zone);
        const effectiveResistance = Math.max(1, computed.resistance ?? 1);
        target.card.damageCounters = Math.max(0, effectiveResistance - 1);
        addLog(`${player.label} prevents ${target.cardData.nome_exibicao_en} from being destroyed and sets its Resistance to 1.`);
      }
    });
    return;
  }

  if (abilityId === "ultimate") {
    if (!spendCosmo(player, 15, "Athena Exclamation")) {
      return;
    }

    const enemy = gameState.players[otherPlayerKey(playerKey)];
    const enemyDevotees = enemy.zones.battlefield.filter((instance) => isDevoteeCard(instance.cardId));

    enemyDevotees.forEach((instance) => {
      relocateCard(enemy.key, instance.uid, "tartarus");
    });

    enemy.god.soul = Math.max(0, enemy.god.soul - enemyDevotees.length);
    syncAwakenState(enemy);
    addLog(`${player.label} resolves Athena Exclamation and destroys ${enemyDevotees.length} enemy Devotee${enemyDevotees.length === 1 ? "" : "s"}.`);
    if (enemyDevotees.length > 0) {
      addLog(`${enemy.label} loses ${enemyDevotees.length} Soul from Athena Exclamation.`);
    }
  }
}

function resolveDomainAbility(playerKey, abilityId) {
  const player = gameState.players[playerKey];
  const domainCard = getCard(player.domainId);
  if (!player || !domainCard) {
    return;
  }

  if (!(canPlayerActNow(playerKey) || canPlayerUsePriorityActions(playerKey))) {
    addLog("You cannot use a Domain ability right now.");
    return;
  }

  if (abilityId === "coliseum-burst") {
    if (player.domainId !== COLISEUM_DOMAIN_ID) {
      addLog(`${player.label}'s Domain does not support that ability.`);
      return;
    }

    if (player.domainUsed) {
      addLog("Coliseum has already been used this game.");
      return;
    }

    startTargetingState({
      source: { kind: "domain", playerKey },
      prompt: "Choose one of your Devotees to get +1/+0 and Pierce until end of turn.",
      statusLabel: "Choose Devotee for Coliseum",
      cancelMessage: "Coliseum ability canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.playerKey === playerKey && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
      resolve: (descriptor) => {
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target || target.zone !== "battlefield") {
          return;
        }

        player.domainUsed = true;
        target.card.turnPowerBonus += 1;
        if (!target.card.tempKeywords.includes("Pierce")) {
          target.card.tempKeywords.push("Pierce");
        }
        addLog(`${player.label} uses Coliseum on ${target.cardData.nome_exibicao_en}. It gets +1/+0 and Pierce until end of turn.`);
      }
    });
    return;
  }

  addLog(`${domainCard.nome_exibicao_en} has no supported activated ability.`);
}

function resolveCardText(playerKey, uid) {
  const located = findCardInstance(playerKey, uid);
  if (!located) {
    return;
  }

  const player = gameState.players[playerKey];
  const card = located.cardData;
  const lines = getCardRulesLines(card);

  if (located.zone === "hand" && (card.tipo === "Technique" || card.tipo === "Moment")) {
    startSpellCastFromHand(playerKey, located);
    return;
  }

  if (located.zone === "battlefield") {
    if (isClothCard(located.cardId) && located.card.damageCounters > 0) {
      addLog(`${card.nome_exibicao_en} is damaged and its abilities are inactive until repaired.`);
      return;
    }

    if (!(canPlayerActNow(playerKey) || canPlayerUsePriorityActions(playerKey))) {
      addLog(`${card.nome_exibicao_en} cannot be activated right now.`);
      return;
    }

    if (
      located.card.summoningSick &&
      !hasKeyword(card, "Impulse", located.card) &&
      lines.some((line) => /^Tap:/i.test(line))
    ) {
      addLog(`${card.nome_exibicao_en} has summoning sickness and cannot use Tap abilities this turn.`);
      return;
    }

    if (located.card.tapped && lines.some((line) => /^Tap:/i.test(line))) {
      addLog(`${card.nome_exibicao_en} is tapped and cannot use its tap ability.`);
      return;
    }

    if (lines.some((line) => /^Tap:\s*Generate 1 Latent Cosmo/i.test(line))) {
      located.card.tapped = true;
      player.latentCosmo += 1;
      addLog(`${player.label} taps ${card.nome_exibicao_en} and generates 1 Latent Cosmo.`);
      return;
    }

    if (lines.some((line) => /^Tap:\s*Prevent the next 2 damage that would be dealt to target Devotee this turn\./i.test(line))) {
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Devotee to receive a 2 damage shield.",
        statusLabel: "Choose protected Devotee",
        cancelMessage: "Protection ability canceled.",
        isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!source || !target) {
            return;
          }
          source.card.tapped = true;
          target.card.preventDamageShield += 2;
          addLog(`${player.label} uses ${source.cardData.nome_exibicao_en} to shield ${target.cardData.nome_exibicao_en} for 2 damage this turn.`);
        }
      });
      return;
    }

    if (lines.some((line) => /^Tap:\s*Restore 2 Damage from target Cloth\./i.test(line))) {
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Cloth to restore 2 Damage.",
        statusLabel: "Choose Cloth",
        cancelMessage: "Cloth repair canceled.",
        isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isClothCard(descriptor.cardId),
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!source || !target) {
            return;
          }
          source.card.tapped = true;
          target.card.damageCounters = Math.max(0, target.card.damageCounters - 2);
          addLog(`${player.label} restores 2 Damage from ${target.cardData.nome_exibicao_en}.`);
        }
      });
      return;
    }

    if (lines.some((line) => /^Tap:\s*Put a Seal counter on target Devotee\./i.test(line))) {
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Devotee to receive a Seal counter.",
        statusLabel: "Choose Devotee",
        cancelMessage: "Seal ability canceled.",
        isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!source || !target) {
            return;
          }
          source.card.tapped = true;
          applySealCounter(target, source.cardData.nome_exibicao_en);
        }
      });
      return;
    }

    if (lines.some((line) => /^Tap:\s*Equipped Devotee deals 1 damage to target Devotee\./i.test(line))) {
      if (!located.card.attachedToUid) {
        addLog(`${card.nome_exibicao_en} needs to be equipped to a Devotee first.`);
        return;
      }
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Devotee to take 1 damage from the equipped bearer.",
        statusLabel: "Choose damaged Devotee",
        cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
        isValidTarget: isBattlefieldDevoteeTarget,
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!source || !target) {
            return;
          }
          source.card.tapped = true;
          applyDamageToDevotee(target, 1);
          addLog(`${source.cardData.nome_exibicao_en} makes its equipped Devotee deal 1 damage to ${target.cardData.nome_exibicao_en}.`);
        }
      });
      return;
    }

    if (lines.some((line) => /^Tap:\s*Put a Seal counter on target Devotee that was dealt damage this turn\./i.test(line))) {
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Devotee that was dealt damage this turn.",
        statusLabel: "Choose damaged Devotee",
        cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
        isValidTarget: (descriptor) => isBattlefieldDevoteeTarget(descriptor) && descriptor.card.damageCounters > 0,
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!source || !target) {
            return;
          }
          source.card.tapped = true;
          applySealCounter(target, source.cardData.nome_exibicao_en);
        }
      });
      return;
    }

    if (lines.some((line) => /^Tap:\s*Equipped Devotee deals 4 damage to target Devotee or God\./i.test(line))) {
      if (!located.card.attachedToUid) {
        addLog(`${card.nome_exibicao_en} needs to be equipped to a Devotee first.`);
        return;
      }
      startTargetingState({
        source: { kind: "card", playerKey, uid },
        prompt: "Select a Devotee or God to take 4 damage.",
        statusLabel: "Choose target",
        cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
        isValidTarget: (descriptor) => descriptor.kind === "god" || isBattlefieldDevoteeTarget(descriptor),
        resolve: (descriptor) => {
          const source = findCardInstance(playerKey, uid);
          if (!source) {
            return;
          }
          source.card.tapped = true;
          if (descriptor.kind === "god") {
            const godOwner = gameState.players[descriptor.playerKey];
            godOwner.god.soul = Math.max(0, godOwner.god.soul - 4);
            syncAwakenState(godOwner);
            addLog(`${source.cardData.nome_exibicao_en} deals 4 damage to ${godOwner.label}'s God.`);
            return;
          }
          const target = findCardInstance(descriptor.playerKey, descriptor.uid);
          if (!target) {
            return;
          }
          applyDamageToDevotee(target, 4);
          addLog(`${source.cardData.nome_exibicao_en} deals 4 damage to ${target.cardData.nome_exibicao_en}.`);
        }
      });
      return;
    }
  }

  addLog(`No supported text automation is available yet for ${card.nome_exibicao_en}.`);
}

function resolveCardAbility(playerKey, uid, lineIndex = 0) {
  const located = findCardInstance(playerKey, uid);
  if (!located || located.zone !== "battlefield") {
    return;
  }

  const abilityLines = getActivatedBattlefieldAbilityLines(located.cardData);
  const line = abilityLines[lineIndex] || abilityLines[0];
  if (!line) {
    addLog(`No activated ability is available on ${located.cardData.nome_exibicao_en}.`);
    return;
  }

  const player = gameState.players[playerKey];
  const card = located.cardData;
  const requiresTap = abilityLineRequiresTap(line);

  if (isClothCard(located.cardId) && located.card.damageCounters > 0) {
    addLog(`${card.nome_exibicao_en} is damaged and its abilities are inactive until repaired.`);
    return;
  }

  if (!(canPlayerActNow(playerKey) || canPlayerUsePriorityActions(playerKey))) {
    addLog(`${card.nome_exibicao_en} cannot be activated right now.`);
    return;
  }

  if (requiresTap && located.card.summoningSick && !hasKeyword(card, "Impulse", located.card)) {
    addLog(`${card.nome_exibicao_en} has summoning sickness and cannot use Tap abilities this turn.`);
    return;
  }

  if (requiresTap && located.card.tapped) {
    addLog(`${card.nome_exibicao_en} is tapped and cannot use its tap ability.`);
    return;
  }

  if (/^Tap:\s*Generate 1 Latent Cosmo/i.test(line)) {
    located.card.tapped = true;
    player.latentCosmo += 1;
    addLog(`${player.label} taps ${card.nome_exibicao_en} and generates 1 Latent Cosmo.`);
    return;
  }

  if (/^Tap:\s*Prevent the next 2 damage that would be dealt to target Devotee this turn\./i.test(line)) {
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee to receive a 2 damage shield.",
      statusLabel: "Choose protected Devotee",
      cancelMessage: "Protection ability canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!source || !target) {
          return;
        }
        source.card.tapped = true;
        target.card.preventDamageShield += 2;
        addLog(`${player.label} uses ${source.cardData.nome_exibicao_en} to shield ${target.cardData.nome_exibicao_en} for 2 damage this turn.`);
      }
    });
    return;
  }

  if (/^Tap:\s*Restore 2 Damage from target Cloth\./i.test(line)) {
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Cloth to restore 2 Damage.",
      statusLabel: "Choose Cloth",
      cancelMessage: "Cloth repair canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isClothCard(descriptor.cardId),
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!source || !target) {
          return;
        }
        source.card.tapped = true;
        target.card.damageCounters = Math.max(0, target.card.damageCounters - 2);
        addLog(`${player.label} restores 2 Damage from ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/^Tap:\s*Put a Seal counter on target Devotee\./i.test(line)) {
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee to receive a Seal counter.",
      statusLabel: "Choose Devotee",
      cancelMessage: "Seal ability canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId),
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!source || !target) {
          return;
        }
        source.card.tapped = true;
        applySealCounter(target, source.cardData.nome_exibicao_en);
      }
    });
    return;
  }

  if (/^Tap:\s*Equipped Devotee deals 1 damage to target Devotee\./i.test(line)) {
    if (!located.card.attachedToUid) {
      addLog(`${card.nome_exibicao_en} needs to be equipped to a Devotee first.`);
      return;
    }
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee to take 1 damage from the equipped bearer.",
      statusLabel: "Choose damaged Devotee",
      cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
      isValidTarget: isBattlefieldDevoteeTarget,
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!source || !target) {
          return;
        }
        source.card.tapped = true;
        applyDamageToDevotee(target, 1);
        addLog(`${source.cardData.nome_exibicao_en} makes its equipped Devotee deal 1 damage to ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/^Tap:\s*Put a Seal counter on target Devotee that was dealt damage this turn\./i.test(line)) {
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee that was dealt damage this turn.",
      statusLabel: "Choose damaged Devotee",
      cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
      isValidTarget: (descriptor) => isBattlefieldDevoteeTarget(descriptor) && descriptor.card.damageCounters > 0,
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!source || !target) {
          return;
        }
        source.card.tapped = true;
        applySealCounter(target, source.cardData.nome_exibicao_en);
      }
    });
    return;
  }

  if (/^Tap:\s*Equipped Devotee deals 4 damage to target Devotee or God\./i.test(line)) {
    if (!located.card.attachedToUid) {
      addLog(`${card.nome_exibicao_en} needs to be equipped to a Devotee first.`);
      return;
    }
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee or God to take 4 damage.",
      statusLabel: "Choose target",
      cancelMessage: `${card.nome_exibicao_en} ability canceled.`,
      isValidTarget: (descriptor) => descriptor.kind === "god" || isBattlefieldDevoteeTarget(descriptor),
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        if (!source) {
          return;
        }
        source.card.tapped = true;
        if (descriptor.kind === "god") {
          const godOwner = gameState.players[descriptor.playerKey];
          godOwner.god.soul = Math.max(0, godOwner.god.soul - 4);
          syncAwakenState(godOwner);
          addLog(`${source.cardData.nome_exibicao_en} deals 4 damage to ${godOwner.label}'s God.`);
          return;
        }
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target) {
          return;
        }
        applyDamageToDevotee(target, 4);
        addLog(`${source.cardData.nome_exibicao_en} deals 4 damage to ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/Pegasus Ryuseiken/i.test(line)) {
    if (!spendCosmo(player, 5, "Pegasus Ryuseiken", { unit: "base_cosmo" })) {
      return;
    }
    located.card.turnPowerBonus += 3;
    located.card.turnResistanceBonus += 2;
    if (getAttachedEquipment(player, uid).some(({ cardData }) => isClothCard(cardData.id)) && !located.card.tempKeywords.includes("Pierce")) {
      located.card.tempKeywords.push("Pierce");
    }
    addLog(`${player.label} uses Pegasus Ryuseiken on ${card.nome_exibicao_en}.`);
    return;
  }

  if (/Rozan Shoryuha/i.test(line)) {
    if (!spendCosmo(player, 6, "Rozan Shoryuha", { unit: "base_cosmo" })) {
      return;
    }
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee to take 4 damage.",
      statusLabel: "Choose Devotee",
      cancelMessage: "Rozan Shoryuha canceled.",
      isValidTarget: isBattlefieldDevoteeTarget,
      resolve: (descriptor) => {
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target) {
          return;
        }
        applyDamageToDevotee(target, 4);
        addLog(`${card.nome_exibicao_en} uses Rozan Shoryuha on ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/Diamond Dust/i.test(line)) {
    if (!spendCosmo(player, 4, "Diamond Dust", { unit: "base_cosmo" })) {
      return;
    }
    const enemy = gameState.players[otherPlayerKey(playerKey)];
    enemy.zones.battlefield
      .filter((instance) => isDevoteeCard(instance.cardId))
      .forEach((instance) => {
        const fresh = findCardInstance(enemy.key, instance.uid);
        if (!fresh) {
          return;
        }
        applyDamageToDevotee(fresh, 1);
        const afterDamage = findCardInstance(enemy.key, instance.uid);
        if (afterDamage?.zone === "battlefield") {
          applySealCounter(afterDamage, card.nome_exibicao_en);
        }
      });
    addLog(`${player.label} resolves Diamond Dust.`);
    return;
  }

  if (/Hoyoku Tensho/i.test(line)) {
    if (!spendCosmo(player, 5, "Hoyoku Tensho")) {
      return;
    }
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: "Select a Devotee or God to take 3 damage.",
      statusLabel: "Choose target",
      cancelMessage: "Hoyoku Tensho canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "god" || isBattlefieldDevoteeTarget(descriptor),
      resolve: (descriptor) => {
        const source = findCardInstance(playerKey, uid);
        if (!source) {
          return;
        }
        source.card.tapped = true;
        if (descriptor.kind === "god") {
          const godOwner = gameState.players[descriptor.playerKey];
          godOwner.god.soul = Math.max(0, godOwner.god.soul - 3);
          syncAwakenState(godOwner);
          addLog(`${card.nome_exibicao_en} deals 3 damage to ${godOwner.label}'s God.`);
          return;
        }
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target) {
          return;
        }
        applyDamageToDevotee(target, 3);
        addLog(`${card.nome_exibicao_en} deals 3 damage to ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/Great Horn/i.test(line)) {
    if (!spendCosmo(player, 4, "Great Horn", { unit: "base_cosmo" })) {
      return;
    }
    located.card.turnPowerBonus += 3;
    if (!located.card.tempKeywords.includes("Pierce")) {
      located.card.tempKeywords.push("Pierce");
    }
    addLog(`${player.label} uses Great Horn on ${card.nome_exibicao_en}.`);
    return;
  }

  if (/Aurora Execution/i.test(line)) {
    if (!spendCosmo(player, 6, "Aurora Execution", { unit: "base_cosmo" })) {
      return;
    }
    const enemy = gameState.players[otherPlayerKey(playerKey)];
    enemy.zones.battlefield
      .filter((instance) => isDevoteeCard(instance.cardId))
      .forEach((instance) => {
        const fresh = findCardInstance(enemy.key, instance.uid);
        if (fresh) {
          applyDamageToDevotee(fresh, 1);
        }
      });

    enemy.zones.battlefield
      .filter((instance) => isDevoteeCard(instance.cardId) && instance.sealCounters > 0)
      .slice()
      .forEach((instance) => relocateCard(enemy.key, instance.uid, "tartarus"));

    addLog(`${player.label} resolves Aurora Execution.`);
    return;
  }

  if (/Sagittarius Arrow/i.test(line)) {
    if (!player.god.awakened) {
      addLog(`${card.nome_exibicao_en} can only use Sagittarius Arrow while awakened.`);
      return;
    }
    const amount = Math.max(0, player.god.soul);
    if (!spendCosmo(player, amount, "Sagittarius Arrow", { unit: "base_cosmo" })) {
      return;
    }
    startTargetingState({
      source: { kind: "card", playerKey, uid },
      prompt: `Select a Devotee or God to take ${amount} damage.`,
      statusLabel: "Choose target",
      cancelMessage: "Sagittarius Arrow canceled.",
      isValidTarget: (descriptor) => descriptor.kind === "god" || isBattlefieldDevoteeTarget(descriptor),
      resolve: (descriptor) => {
        if (descriptor.kind === "god") {
          const godOwner = gameState.players[descriptor.playerKey];
          godOwner.god.soul = Math.max(0, godOwner.god.soul - amount);
          syncAwakenState(godOwner);
          addLog(`${card.nome_exibicao_en} deals ${amount} damage to ${godOwner.label}'s God.`);
          return;
        }
        const target = findCardInstance(descriptor.playerKey, descriptor.uid);
        if (!target) {
          return;
        }
        applyDamageToDevotee(target, amount);
        addLog(`${card.nome_exibicao_en} deals ${amount} damage to ${target.cardData.nome_exibicao_en}.`);
      }
    });
    return;
  }

  if (/Underworld Waves/i.test(line)) {
    if (!spendCosmo(player, 5, "Underworld Waves", { unit: "base_cosmo" })) {
      return;
    }
    let exiled = 0;
    PLAYER_ORDER.forEach((key) => {
      const owner = gameState.players[key];
      owner.zones.tartarus
        .filter((instance) => isDevoteeCard(instance.cardId))
        .slice()
        .forEach((instance) => {
          relocateCard(key, instance.uid, "void");
          exiled += 1;
        });
    });
    player.latentCosmo += exiled;
    addLog(`${player.label} exiles ${exiled} Devotee${exiled === 1 ? "" : "s"} from Tartarus and gains ${exiled} Latent Cosmo.`);
    return;
  }

  addLog(`No supported activated ability automation is available yet for ${card.nome_exibicao_en}.`);
}

function canEquipToTarget(playerKey, equipmentLocated, descriptor) {
  if (!equipmentLocated || descriptor.kind !== "card" || descriptor.playerKey !== playerKey || descriptor.zone !== "battlefield" || !isDevoteeCard(descriptor.cardId)) {
    return false;
  }

  if (isClothCard(equipmentLocated.cardId) && equipmentLocated.card.damageCounters > 0) {
    return false;
  }

  if (isClothCard(equipmentLocated.cardId)) {
    const alreadyEquippedCloth = getAttachedEquipment(gameState.players[playerKey], descriptor.uid).some(({ cardData }) => isClothCard(cardData.id));
    if (alreadyEquippedCloth && equipmentLocated.card.attachedToUid !== descriptor.uid) {
      return false;
    }
  }

  return true;
}

function startEquipSelection(playerKey, uid, ignoreCost = false) {
  const player = gameState.players[playerKey];
  const equipment = findCardInstance(playerKey, uid);
  if (!equipment || equipment.zone !== "battlefield" || !isEquipCard(equipment.cardId)) {
    addLog("Select an equipment card on the battlefield to equip.");
    return;
  }

  if (!(canPlayerActNow(playerKey) || canPlayerUsePriorityActions(playerKey))) {
    addLog("You cannot equip cards right now.");
    return;
  }

  if (isClothCard(equipment.cardId) && equipment.card.damageCounters > 0) {
    addLog(`${equipment.cardData.nome_exibicao_en} is damaged and cannot be equipped yet.`);
    return;
  }

  const targets = getEquipTargetOptions(playerKey, uid, ignoreCost);
  if (!targets.length) {
    addLog(`${equipment.cardData.nome_exibicao_en} has no valid Devotee to equip right now.`);
    return;
  }

  hoverPreview = null;
  closeContextMenu();
  closeFloatingInfo();
  equipSelectionState = {
    playerKey,
    uid,
    ignoreCost,
    cardName: equipment.cardData.nome_exibicao_en
  };

  renderGame();
}

function getEquipTargetOptions(playerKey, uid, ignoreCost = false) {
  const player = gameState.players[playerKey];
  const equipment = findCardInstance(playerKey, uid);
  if (!player || !equipment) {
    return [];
  }

  return player.zones.battlefield
    .map((instance) => ({
      kind: "card",
      playerKey,
      uid: instance.uid,
      zone: "battlefield",
      card: instance,
      cardId: instance.cardId,
      cardData: getCard(instance.cardId)
    }))
    .filter((descriptor) => canEquipToTarget(playerKey, equipment, descriptor))
    .map((descriptor) => {
      const freeEquip = ignoreCost || (player.freeEquipTargetUid === descriptor.uid && isClothCard(equipment.cardId));
      const equipCost = freeEquip ? 0 : (equipment.cardData.equipar_custo || 0);
      return {
        uid: descriptor.uid,
        freeEquip,
        equipCost,
        payable: equipCost === 0 || getAvailableCosmo(player, "cosmo") >= equipCost
      };
    });
}

function clearEquipSelection(writeLog = false) {
  if (!equipSelectionState) {
    return;
  }

  if (writeLog) {
    addLog(`${equipSelectionState.cardName} equip canceled.`);
  }

  equipSelectionState = null;
}

function resolveEquipSelection(targetUid) {
  if (!equipSelectionState || !gameState) {
    return;
  }

  const { playerKey, uid, ignoreCost } = equipSelectionState;
  const player = gameState.players[playerKey];
  const freshEquipment = findCardInstance(playerKey, uid);
  const target = findCardInstance(playerKey, targetUid);
  if (!freshEquipment || !target) {
    clearEquipSelection(true);
    return;
  }

  if (!canEquipToTarget(playerKey, freshEquipment, {
    kind: "card",
    playerKey,
    uid: target.card.uid,
    zone: target.zone,
    card: target.card,
    cardId: target.cardId,
    cardData: target.cardData
  })) {
    addLog("That Devotee is no longer a valid equip target.");
    return;
  }

  const freeEquip = ignoreCost || (player.freeEquipTargetUid === target.card.uid && isClothCard(freshEquipment.cardId));
  const equipCost = freeEquip ? 0 : (freshEquipment.cardData.equipar_custo || 0);

  if (equipCost > 0 && !spendCosmo(player, equipCost, `${freshEquipment.cardData.nome_exibicao_en} equip cost`)) {
    return;
  }

  freshEquipment.card.attachedToUid = target.card.uid;
  if (freeEquip && player.freeEquipTargetUid === target.card.uid) {
    player.freeEquipTargetUid = null;
  }

  addLog(`${freshEquipment.cardData.nome_exibicao_en} equips ${target.cardData.nome_exibicao_en}${freeEquip ? " without paying equip cost" : ""}.`);
  selectedInspector = { kind: "card", playerKey, uid: target.card.uid };
  equipSelectionState = null;
}

function getCardTextActionLabel(located) {
  if (!located) {
    return "";
  }

  const lines = getCardRulesLines(located.cardData);
  if (located.zone === "hand" && (located.cardData.tipo === "Technique" || located.cardData.tipo === "Moment")) {
    return lines[0] || "";
  }

  if (located.zone === "battlefield") {
    const abilityLine = getActivatedBattlefieldAbilityLines(located.cardData)[0];
    if (abilityLine) {
      return abilityLine;
    }
  }

  if (located.zone === "battlefield" && isEquipCard(located.cardId)) {
    return `Equip ${located.cardData.equipar_custo}`;
  }

  return "";
}

function getActivatedBattlefieldAbilityLines(cardData) {
  return getCardRulesLines(cardData).filter((line) => /^Tap:/i.test(line) || /—\s*(Awakened\s*—\s*)?Cost:/i.test(line));
}

function abilityLineRequiresTap(line) {
  return /^Tap:/i.test(line) || /,\s*Tap\b/i.test(line);
}

function getCardContextMenuTextActions(player, located) {
  if (!located) {
    return [];
  }

  const actions = [];
  const lines = getCardRulesLines(located.cardData);

  if (located.zone === "hand" && (located.cardData.tipo === "Technique" || located.cardData.tipo === "Moment")) {
    const abilityState = getCardAbilityState(player.key, located.zone, located.card, located.cardData);
    if (abilityState) {
      actions.push({
        label: lines[0] || `Cast ${located.cardData.nome_exibicao_en}`,
        payload: {
          action: "resolve-card-text",
          player: player.key,
          uid: located.card.uid
        }
      });
    }
  }

  if (located.zone === "battlefield") {
    const abilityState = getCardAbilityState(player.key, located.zone, located.card, located.cardData);
    if (abilityState) {
      const abilityLines = getActivatedBattlefieldAbilityLines(located.cardData);
      abilityLines.forEach((line, lineIndex) => {
        actions.push({
          label: line,
          payload: {
            action: "resolve-card-ability",
            player: player.key,
            uid: located.card.uid,
            lineIndex: String(lineIndex)
          }
        });
      });
    }

    if (isEquipCard(located.cardId) && (canPlayerActNow(player.key) || canPlayerUsePriorityActions(player.key))) {
      const freeEquip = player.freeEquipTargetUid && isClothCard(located.cardId);
      actions.push({
        label: freeEquip ? `Equip ${located.cardData.nome_exibicao_en} (free)` : `Equip ${located.cardData.equipar_custo}`,
        payload: {
          action: "equip-card",
          player: player.key,
          uid: located.card.uid,
          free: String(Boolean(freeEquip))
        }
      });
    }
  }

  return actions;
}

function getCardAbilityState(playerKey, zoneId, instance, cardData) {
  if (!gameState || targetingState || isAiPlayer(playerKey) || zoneBrowserState) {
    return null;
  }

  const located = {
    card: instance,
    zone: zoneId,
    cardId: instance.cardId,
    cardData
  };

  const label = getCardTextActionLabel(located);
  if (!label) {
    return null;
  }

  const player = gameState.players[playerKey];
  if (!player) {
    return null;
  }

  if (zoneId === "hand") {
    if (cardData.tipo === "Moment" && !canCastMomentNow(playerKey)) {
      return null;
    }

    if (cardData.tipo === "Technique" && !canCastTechniqueNow(playerKey)) {
      return null;
    }

    if (typeof cardData.custo === "number" && getAvailableCosmo(player, cardData.unidade_custo || "cosmo") < cardData.custo) {
      return null;
    }

    return {
      label: cardData.tipo === "Moment" ? "Cast Moment" : cardData.tipo === "Technique" ? "Use Technique" : label
    };
  }

  if (zoneId === "battlefield") {
    const abilityLines = getActivatedBattlefieldAbilityLines(cardData);
    const hasTapAbility = abilityLines.some((line) => abilityLineRequiresTap(line));
    const isEquipAction = isEquipCard(instance.cardId);
    if (isClothCard(instance.cardId) && instance.damageCounters > 0) {
      return null;
    }
    if (
      (!abilityLines.length && !isEquipAction) ||
      (instance.tapped && hasTapAbility) ||
      !(canPlayerActNow(playerKey) || canPlayerUsePriorityActions(playerKey)) ||
      (hasTapAbility && instance.summoningSick && !hasKeyword(cardData, "Impulse", instance))
    ) {
      return null;
    }

    if (isEquipAction) {
      return {
        label: `Equip ${cardData.equipar_custo}`,
        mode: "equip"
      };
    }

    return {
      label: abilityLines.length > 1 ? `Abilities ${abilityLines.length}` : "Activate",
      mode: abilityLines.length > 1 ? "menu" : "ability",
      lineIndex: 0
    };
  }

  return null;
}

function canCastMomentNow(playerKey) {
  return gameState.currentPlayer === playerKey && gameState.currentPhase === "main" && !isPriorityWindowOpen();
}

function canCastTechniqueNow(playerKey) {
  if (isPriorityWindowOpen()) {
    return canPlayerUsePriorityActions(playerKey);
  }
  return gameState.currentPlayer === playerKey;
}

function parseLibrarySearchInstruction(line) {
  if (!/search your (deck|library)/i.test(line)) {
    return null;
  }

  let filter = null;
  let label = "matching card";
  if (/a Cloth Relic/i.test(line)) {
    filter = (descriptor) => isClothCard(descriptor.cardId);
    label = "Cloth Relic";
  } else if (/a Weapon Relic/i.test(line)) {
    filter = (descriptor) => descriptor.cardData.subtipos?.includes("Weapon");
    label = "Weapon Relic";
  } else if (/a Devotee/i.test(line)) {
    filter = (descriptor) => isDevoteeCard(descriptor.cardId);
    label = "Devotee";
  }

  if (!filter) {
    return null;
  }

  return {
    label,
    filter,
    destination: inferDestinationZoneFromText(line, "hand"),
    shuffleAfter: /shuffle/i.test(line),
    tapped: /unprepared/i.test(line)
  };
}

function parseTartarusReturnInstruction(line) {
  if (!/return .* from tartarus/i.test(line)) {
    return null;
  }

  let filter = null;
  let label = "card";
  if (/Devotee/i.test(line)) {
    filter = (descriptor) => isDevoteeCard(descriptor.cardId);
    label = "Devotee";
  }

  return {
    label,
    filter: filter || (() => true),
    destination: inferDestinationZoneFromText(line, "battlefield"),
    tapped: /unprepared/i.test(line)
  };
}

function startLibrarySearchForSpell(player, located, line, options = {}) {
  const spec = parseLibrarySearchInstruction(line);
  if (!spec) {
    return false;
  }

  openSpellResolution({
    playerKey: player.key,
    uid: located.card.uid,
    title: located.cardData.nome_exibicao_en,
    prompt: `Search your library for a ${spec.label}, then move it to ${zoneLabel(spec.destination)}.`,
    stageLabel: "Search Library",
    cardType: located.cardData.tipo,
    unit: located.cardData.unidade_custo || "cosmo",
    amount: located.cardData.custo || 0,
    allowCancel: options.allowCancel !== false,
    cancelMessage: `${located.cardData.nome_exibicao_en} search canceled.`
  });

  const opened = openZoneBrowser({
    playerKey: player.key,
    zone: "deck",
    title: located.cardData.nome_exibicao_en,
    prompt: `Search your library for a ${spec.label}. Choose the card to reveal and resolve.`,
    cancelMessage: `${located.cardData.nome_exibicao_en} search canceled.`,
    allowCancel: options.allowCancel !== false,
    onCancel: () => clearSpellResolution(false),
    filter: spec.filter,
    onSelect: (selectedUid) => {
      const fresh = ensureSpellCostPaid(player, located, options);
      const chosen = getZoneBrowserEntry(player.key, selectedUid);
      if (!fresh || !chosen || chosen.zone !== "deck") {
        return;
      }
      const moved = moveCardByEffect(player.key, selectedUid, spec.destination, { tapped: spec.tapped });
      if (!moved) {
        addLog(`${fresh.cardData.nome_exibicao_en} could not move the chosen ${spec.label}.`);
        return;
      }
      addLog(`${player.label} reveals ${moved.cardData.nome_exibicao_en} and moves it to ${zoneLabel(spec.destination)}.`);
      if (spec.shuffleAfter) {
        shuffle(player.zones.deck);
        addLog(`${player.label} shuffles their deck.`);
      }
      finalizeSpellCard(player, fresh, `${player.label} resolves ${fresh.cardData.nome_exibicao_en}.`);
    }
  });

  if (!opened) {
    clearSpellResolution(false);
    return false;
  }

  return true;
}

function startTartarusReturnForSpell(player, located, line, options = {}) {
  const spec = parseTartarusReturnInstruction(line);
  if (!spec) {
    return false;
  }

  openSpellResolution({
    playerKey: player.key,
    uid: located.card.uid,
    title: located.cardData.nome_exibicao_en,
    prompt: `Choose a ${spec.label} in Tartarus and move it to ${zoneLabel(spec.destination)}.`,
    stageLabel: "Choose from Tartarus",
    cardType: located.cardData.tipo,
    unit: located.cardData.unidade_custo || "cosmo",
    amount: located.cardData.custo || 0,
    allowCancel: options.allowCancel !== false,
    cancelMessage: `${located.cardData.nome_exibicao_en} return canceled.`
  });

  const opened = openZoneBrowser({
    playerKey: player.key,
    zone: "tartarus",
    title: located.cardData.nome_exibicao_en,
    prompt: `Choose a ${spec.label} in Tartarus and resolve the return effect.`,
    cancelMessage: `${located.cardData.nome_exibicao_en} return canceled.`,
    allowCancel: options.allowCancel !== false,
    onCancel: () => clearSpellResolution(false),
    filter: spec.filter,
    onSelect: (selectedUid) => {
      const fresh = ensureSpellCostPaid(player, located, options);
      const chosen = getZoneBrowserEntry(player.key, selectedUid);
      if (!fresh || !chosen || chosen.zone !== "tartarus") {
        return;
      }
      const moved = moveCardByEffect(player.key, selectedUid, spec.destination, { tapped: spec.tapped });
      if (!moved) {
        addLog(`${fresh.cardData.nome_exibicao_en} could not move the chosen ${spec.label}.`);
        return;
      }
      addLog(`${player.label} returns ${moved.cardData.nome_exibicao_en} from Tartarus to ${zoneLabel(spec.destination)}.`);
      finalizeSpellCard(player, fresh, `${player.label} resolves ${fresh.cardData.nome_exibicao_en}.`);
    }
  });

  if (!opened) {
    clearSpellResolution(false);
    return false;
  }

  return true;
}

function resolveSpellCard(player, located, lines, options = {}) {
  const card = located.cardData;

  if (card.tipo === "Moment" && !canCastMomentNow(player.key)) {
    addLog(`${card.nome_exibicao_en} can only be played during your Main Phase.`);
    return;
  }

  if (card.tipo === "Technique" && !canCastTechniqueNow(player.key)) {
    addLog(`${card.nome_exibicao_en} can only be played while you have priority to respond.`);
    return;
  }

  const searchLine = lines.find((line) => /search your (deck|library)/i.test(line));
  if (searchLine && startLibrarySearchForSpell(player, located, searchLine, options)) {
    return;
  }

  const tartarusLine = lines.find((line) => /return .* from tartarus/i.test(line));
  if (tartarusLine && startTartarusReturnForSpell(player, located, tartarusLine, options)) {
    return;
  }

  if (lines.some((line) => /Target Devotee cannot be destroyed this turn\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Devotee to make indestructible this turn.", "Choose Devotee", isBattlefieldDevoteeTarget, (target) => {
      target.card.cannotBeDestroyedUntilEnd = true;
      addLog(`${target.cardData.nome_exibicao_en} cannot be destroyed this turn.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Put a Seal counter on target Devotee\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Devotee to receive a Seal counter.", "Choose Devotee", isBattlefieldDevoteeTarget, (target) => {
      applySealCounter(target, located.cardData.nome_exibicao_en);
    }, options);
    return;
  }

  if (lines.some((line) => /Destroy target Relic\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Relic to destroy.", "Choose Relic", isBattlefieldRelicTarget, (target) => {
      if (target.card.cannotBeDestroyedUntilEnd) {
        addLog(`${target.cardData.nome_exibicao_en} cannot be destroyed this turn.`);
        return;
      }
      relocateCard(target.playerKey, target.uid, "void");
      addLog(`${target.cardData.nome_exibicao_en} is destroyed and sent to Void.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Prevent all damage that would be dealt to your God this turn\./i.test(line))) {
    const fresh = ensureSpellCostPaid(player, located, options);
    if (!fresh) {
      return;
    }
    player.god.preventDamageUntilEnd = true;
    finalizeSpellCard(player, fresh, `${player.label} casts ${card.nome_exibicao_en} and protects their God from all damage this turn.`);
    return;
  }

  if (lines.some((line) => /Target Relic cannot be destroyed this turn\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Relic to protect this turn.", "Choose Relic", isBattlefieldRelicTarget, (target) => {
      target.card.cannotBeDestroyedUntilEnd = true;
      addLog(`${target.cardData.nome_exibicao_en} cannot be destroyed this turn.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Destroy target Devotee that attacked this turn\./i.test(line))) {
    startSpellTargeting(
      player,
      located,
      "Select a Devotee that attacked this turn.",
      "Choose attacking Devotee",
      (descriptor) => isBattlefieldDevoteeTarget(descriptor) && descriptor.card.enteredCombatThisTurn,
      (target) => {
        if (target.card.cannotBeDestroyedUntilEnd) {
          addLog(`${target.cardData.nome_exibicao_en} cannot be destroyed this turn.`);
          return;
        }
        relocateCard(target.playerKey, target.uid, "tartarus");
        addLog(`${target.cardData.nome_exibicao_en} is destroyed and sent to Tartarus.`);
        handleDevoteeDestroyed(target);
      },
      options
    );
    return;
  }

  if (lines.some((line) => /Destroy all Devotees\. Gold Saints you control are not destroyed\./i.test(line))) {
    const fresh = ensureSpellCostPaid(player, located, options);
    if (!fresh) {
      return;
    }
    PLAYER_ORDER.forEach((playerKey) => {
      const owner = gameState.players[playerKey];
      [...owner.zones.battlefield].forEach((instance) => {
        const entryCard = getCard(instance.cardId);
        const isProtectedGold = playerKey === player.key && entryCard.subtipos.includes("Gold Saint");
        if (isDevoteeCard(instance.cardId) && !isProtectedGold) {
          relocateCard(playerKey, instance.uid, "tartarus");
          addLog(`${entryCard.nome_exibicao_en} is destroyed by ${card.nome_exibicao_en}.`);
          handleDevoteeDestroyed({ card: instance, cardData: entryCard });
        }
      });
    });
    finalizeSpellCard(player, fresh, `${player.label} resolves ${card.nome_exibicao_en}.`);
    return;
  }

  if (lines.some((line) => /Target Devotee gets \+2\/\+2\. If it is equipped with a Cloth, it gets \+4\/\+4 instead\./i.test(line))) {
    startSpellTargeting(
      player,
      located,
      "Select a Devotee. If it is equipped with a Cloth, it gets +4/+4 instead of +2/+2.",
      "Choose Devotee",
      isBattlefieldDevoteeTarget,
      (target) => {
        const owner = gameState.players[target.playerKey];
        const hasCloth = getAttachedEquipment(owner, target.uid).some((entry) => isClothCard(entry.cardId));
        const bonus = hasCloth ? 4 : 2;
        target.card.turnPowerBonus += bonus;
        target.card.turnResistanceBonus += bonus;
        addLog(`${target.cardData.nome_exibicao_en} gets +${bonus}/+${bonus} until end of turn${hasCloth ? " because it is equipped with a Cloth" : ""}.`);
      },
      options
    );
    return;
  }

  if (lines.some((line) => /Target Devotee gets \+2\/\+2 until end of turn\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Devotee to get +2/+2.", "Choose Devotee", isBattlefieldDevoteeTarget, (target) => {
      target.card.turnPowerBonus += 2;
      target.card.turnResistanceBonus += 2;
      addLog(`${target.cardData.nome_exibicao_en} gets +2/+2 until end of turn.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Devotees you control get \+1\/\+1 until end of turn\./i.test(line))) {
    const fresh = ensureSpellCostPaid(player, located, options);
    if (!fresh) {
      return;
    }
    player.zones.battlefield.forEach((instance) => {
      if (isDevoteeCard(instance.cardId)) {
        instance.turnPowerBonus += 1;
        instance.turnResistanceBonus += 1;
      }
    });
    finalizeSpellCard(player, fresh, `${player.label} gives all their Devotees +1/+1 until end of turn.`);
    return;
  }

  if (lines.some((line) => /Exile target Devotee with cost 4 or greater\./i.test(line))) {
    startSpellTargeting(
      player,
      located,
      "Select a Devotee with cost 4 or greater to exile.",
      "Choose Devotee to exile",
      (descriptor) => isBattlefieldDevoteeTarget(descriptor) && getCard(descriptor.cardId).custo >= 4,
      (target) => {
        relocateCard(target.playerKey, target.uid, "void");
        addLog(`${target.cardData.nome_exibicao_en} is exiled.`);
      },
      options
    );
    return;
  }

  if (lines.some((line) => /Restore 3 Damage from target Cloth\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Cloth to restore 3 Damage.", "Choose Cloth", (descriptor) => descriptor.kind === "card" && descriptor.zone === "battlefield" && isClothCard(descriptor.cardId), (target) => {
      target.card.damageCounters = Math.max(0, target.card.damageCounters - 3);
      addLog(`${target.cardData.nome_exibicao_en} restores 3 Damage.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Target Devotee gains Guardian until end of turn\./i.test(line))) {
    startSpellTargeting(player, located, "Select a Devotee to gain Guardian until end of turn.", "Choose Devotee", isBattlefieldDevoteeTarget, (target) => {
      if (!target.card.tempKeywords.includes("Guardian")) {
        target.card.tempKeywords.push("Guardian");
      }
      addLog(`${target.cardData.nome_exibicao_en} gains Guardian until end of turn.`);
    }, options);
    return;
  }

  if (lines.some((line) => /Remove all Latent Cosmo from target opponent\./i.test(line))) {
    const fresh = ensureSpellCostPaid(player, located, options);
    if (!fresh) {
      return;
    }
    const opponent = gameState.players[otherPlayerKey(player.key)];
    opponent.latentCosmo = 0;
    finalizeSpellCard(player, fresh, `${player.label} removes all Latent Cosmo from ${opponent.label}.`);
    return;
  }

  clearSpellResolution(false);
  addLog(`No supported spell automation is available yet for ${card.nome_exibicao_en}.`);
}

function startSpellTargeting(player, located, prompt, statusLabel, validator, effect, options = {}) {
  const legalTargets = getSpellTargetDescriptors(validator);
  if (!legalTargets.length) {
    addLog(`${located.cardData.nome_exibicao_en} has no legal targets right now.`);
    clearSpellResolution(false);
    return;
  }

  openSpellResolution({
    playerKey: player.key,
    uid: located.card.uid,
    title: located.cardData.nome_exibicao_en,
    prompt,
    stageLabel: statusLabel,
    cardType: located.cardData.tipo,
    unit: located.cardData.unidade_custo || "cosmo",
    amount: located.cardData.custo || 0,
    allowCancel: options.allowCancel !== false,
    cancelMessage: `${located.cardData.nome_exibicao_en} targeting canceled.`,
    targetValidator: validator,
    targetEffect: effect
  });
}

function finalizeSpellCard(player, located, logMessage) {
  clearSpellResolution(false);
  relocateCard(player.key, located.card.uid, "tartarus");
  addLog(logMessage);
}

function isBattlefieldDevoteeTarget(descriptor) {
  return descriptor.kind === "card" && descriptor.zone === "battlefield" && isDevoteeCard(descriptor.cardId);
}

function isBattlefieldRelicTarget(descriptor) {
  return descriptor.kind === "card" && descriptor.zone === "battlefield" && isRelicCard(descriptor.cardId);
}

function spendCosmo(player, amount, label, options = {}) {
  const unit = options.unit || "cosmo";
  if (getAvailableCosmo(player, unit) < amount) {
    addLog(`${player.label} does not have enough ${unit === "base_cosmo" ? "Base Cosmo" : "Cosmo"} for ${label}.`);
    return false;
  }

  const plan = createCostPaymentPlan(player, amount, options.strategy || "auto", unit);
  if (!plan) {
    addLog(`${player.label} cannot assemble the required payment for ${label}.`);
    return false;
  }

  return applyCostPaymentPlan(player.key, plan, label);
}

function getAvailableCosmo(player, unit = "cosmo") {
  const pool = player.latentCosmo + player.cosmo + countUntappedBase(player);
  if (unit === "base_cosmo") {
    return player.cosmo + countUntappedBase(player);
  }
  return pool;
}

function countUntappedBase(player) {
  return player.zones.cosmo_base.filter((instance) => !instance.tapped).length;
}

function getSelectedOwnedCard(playerKey) {
  if (!selectedInspector || selectedInspector.kind !== "card" || selectedInspector.playerKey !== playerKey) {
    return null;
  }
  return findCardInstance(selectedInspector.playerKey, selectedInspector.uid);
}

function findCardInstance(playerKey, uid) {
  const player = gameState.players[playerKey];

  for (const zoneId of ["deck", ...CARD_ZONES]) {
    const card = player.zones[zoneId].find((entry) => entry.uid === uid);
    if (card) {
      return {
        card,
        zone: zoneId,
        cardId: card.cardId,
        cardData: getCard(card.cardId)
      };
    }
  }

  return null;
}

function renderGame() {
  evaluateVictoryState();
  renderStageState();
  renderTurnIndicator();
  renderOptionsMenu();
  renderBoards();
  renderInspector();
  renderDockTabContent();
  renderActionBar();
  renderContextMenu();
  renderCombatOverlay();
  renderZoneSelectionOverlay();
  renderLog();
  renderMulliganOverlay();
  renderNewGameOverlay();
  renderPaymentOverlay();
  renderSpellResolutionOverlay();
  renderEquipOverlay();
  renderZoneBrowserOverlay();
  renderCombatToast();
  renderLogPopup();
  renderVictoryOverlay();
  renderPriorityAndStack();
  renderFeedback();
  scheduleAutoPassIfNeeded();
  scheduleAiTurnIfNeeded();
}

function renderStageState() {
  if (!elements.stage) {
    return;
  }

  elements.stage.classList.toggle("selection-active", isSelectionModeActive());
  elements.stage.classList.toggle("new-game-active", Boolean(newGameState?.open));
  elements.stage.classList.toggle("mulligan-active", Boolean(mulliganState));
  elements.stage.classList.toggle("payment-active", Boolean(paymentState));
  elements.stage.classList.toggle("spell-active", Boolean(spellResolutionState));
  elements.stage.classList.toggle("equip-active", Boolean(equipSelectionState));
  elements.stage.classList.toggle("zone-browser-active", Boolean(zoneBrowserState));
  elements.stage.classList.toggle("victory-active", Boolean(gameState?.victory));
}

function renderZoneSelectionOverlay() {
  if (!elements.zoneSelectionOverlay) {
    return;
  }

  if (!zoneSelectionState?.selecting) {
    elements.zoneSelectionOverlay.classList.add("hidden");
    elements.zoneSelectionOverlay.setAttribute("aria-hidden", "true");
    elements.zoneSelectionOverlay.style.left = "";
    elements.zoneSelectionOverlay.style.top = "";
    elements.zoneSelectionOverlay.style.width = "";
    elements.zoneSelectionOverlay.style.height = "";
    return;
  }

  const rect = getSelectionRect(
    zoneSelectionState.startX,
    zoneSelectionState.startY,
    zoneSelectionState.currentX,
    zoneSelectionState.currentY
  );

  elements.zoneSelectionOverlay.classList.remove("hidden");
  elements.zoneSelectionOverlay.setAttribute("aria-hidden", "false");
  elements.zoneSelectionOverlay.style.left = `${rect.left}px`;
  elements.zoneSelectionOverlay.style.top = `${rect.top}px`;
  elements.zoneSelectionOverlay.style.width = `${rect.right - rect.left}px`;
  elements.zoneSelectionOverlay.style.height = `${rect.bottom - rect.top}px`;
}

function renderOptionsMenu() {
  if (!elements.optionsMenu || !elements.toggleOptions) {
    return;
  }

  elements.optionsMenu.classList.toggle("hidden", !optionsMenuOpen);
  elements.optionsMenu.setAttribute("aria-hidden", optionsMenuOpen ? "false" : "true");
  elements.toggleOptions.setAttribute("aria-expanded", optionsMenuOpen ? "true" : "false");
}

function renderTurnIndicator() {
  if (!gameState) {
    elements.turnIndicator.textContent = newGameState?.open ? "Choose decks and who starts in the New Match modal." : "Load a match to begin.";
    return;
  }

  if (gameState.victory) {
    elements.turnIndicator.textContent = gameState.victory.message;
    return;
  }

  if (mulliganState) {
    elements.turnIndicator.textContent = "Opening Hand • Choose Keep or select any number of cards to mulligan.";
    return;
  }

  if (paymentState) {
    elements.turnIndicator.textContent = `Choose how to pay ${formatValue(paymentState.amount, paymentState.unit) || paymentState.amount} for ${paymentState.cardName}.`;
    return;
  }

  if (spellResolutionState) {
    elements.turnIndicator.textContent = `${spellResolutionState.title} • ${spellResolutionState.prompt}`;
    return;
  }

  if (zoneBrowserState) {
    elements.turnIndicator.textContent = `${zoneBrowserState.title} • ${zoneBrowserState.prompt}`;
    return;
  }

  if (isPriorityWindowOpen()) {
    elements.turnIndicator.textContent = `Combat Priority • ${playerLabel(gameState.combat.priorityPlayerKey)} may respond before damage resolves.`;
    return;
  }

  const playerADeck = gameState.players.A.deckName;
  const playerBDeck = gameState.players.B.deckName;
  const aiBadge = isAiPlayer("B") ? " • Player B AI" : "";
  elements.turnIndicator.textContent = `Turn ${gameState.turnNumber} • ${phaseLabel(gameState.currentPhase)} • Player ${gameState.currentPlayer} active${aiBadge} • ${playerADeck} vs ${playerBDeck}`;
}

function isAiPlayer(playerKey) {
  return playerKey === "B" && Boolean(elements.aiPlayerB?.checked);
}

function clearAiTurnTimer() {
  if (aiTurnTimer) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }
}

function clearPriorityTimer() {
  if (priorityTimer) {
    clearTimeout(priorityTimer);
    priorityTimer = null;
  }
}

function scheduleAiTurnIfNeeded() {
  clearAiTurnTimer();

  if (!gameState || gameState.victory || newGameState?.open || mulliganState || paymentState || equipSelectionState || zoneBrowserState || aiTurnInProgress || targetingState || gameState.combat.mode) {
    return;
  }

  if (!isAiPlayer(gameState.currentPlayer)) {
    return;
  }

  aiTurnTimer = window.setTimeout(() => {
    aiTurnTimer = null;
    runAiTurn();
  }, 420);
}

async function runAiTurn() {
  if (!gameState || aiTurnInProgress || !isAiPlayer(gameState.currentPlayer)) {
    return;
  }

  aiTurnInProgress = true;
  const playerKey = gameState.currentPlayer;
  const player = gameState.players[playerKey];
  const resumingAttackStep = gameState.aiResume?.playerKey === playerKey && gameState.aiResume?.step === "attacks";

  try {
    if (!resumingAttackStep) {
      addLog(`${player.label} AI starts planning the turn.`);
      renderGame();
      await aiPause(AI_SHORT_DELAY_MS);

      if (gameState.currentPhase === "upkeep") {
        advanceToNextPhase(true);
        renderGame();
        await aiPause(AI_SHORT_DELAY_MS);
      }

      if (gameState.currentPhase === "draw") {
        advanceToNextPhase(true);
        renderGame();
        await aiPause(AI_SHORT_DELAY_MS);
      }

      aiPlaceCosmoBase(playerKey);
      renderGame();
      await aiPause();

      aiUseLatentSources(playerKey);
      aiTapAllCosmoBase(playerKey);
      renderGame();
      await aiPause();

      let plays = 0;
      while (plays < 8 && aiPlayBestPermanent(playerKey)) {
        plays += 1;
        aiTapAllCosmoBase(playerKey);
        renderGame();
        await aiPause();
      }
    }

    const attackResult = await aiAttackStep(playerKey);
    if (attackResult === "paused") {
      gameState.aiResume = { playerKey, step: "attacks" };
      return;
    }

    gameState.aiResume = null;
    if (gameState && gameState.currentPlayer === playerKey) {
      if (gameState.currentPhase !== "end") {
        advanceToNextPhase(true);
        renderGame();
        await aiPause(AI_SHORT_DELAY_MS);
      }
      nextTurn(true);
    }
  } finally {
    aiTurnInProgress = false;
  }
}

function aiPause(duration = AI_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function aiPlaceCosmoBase(playerKey) {
  const player = gameState.players[playerKey];
  if (player.playedBaseThisTurn) {
    return false;
  }

  const candidate = [...player.zones.hand]
    .filter((instance) => getCard(instance.cardId).cosmoble)
    .sort((left, right) => (getCard(right.cardId).custo ?? 0) - (getCard(left.cardId).custo ?? 0))[0];

  if (!candidate) {
    return false;
  }

  moveCard(playerKey, candidate.uid, "cosmo_base");
  return true;
}

function aiUseLatentSources(playerKey) {
  const player = gameState.players[playerKey];
  player.zones.battlefield.forEach((instance) => {
    if (instance.tapped) {
      return;
    }
    const card = getCard(instance.cardId);
    if (instance.summoningSick && !hasKeyword(card, "Impulse", instance)) {
      return;
    }
    const lines = getCardRulesLines(card);
    if (lines.some((line) => /^Tap:\s*Generate 1 Latent Cosmo/i.test(line))) {
      instance.tapped = true;
      player.latentCosmo += 1;
      addLog(`${player.label} AI taps ${card.nome_exibicao_en} to generate 1 Latent Cosmo.`);
    }
  });
}

function aiTapAllCosmoBase(playerKey) {
  const player = gameState.players[playerKey];
  player.zones.cosmo_base
    .filter((instance) => !instance.tapped)
    .forEach((instance) => toggleTap(playerKey, instance.uid));
}

function aiPlayBestPermanent(playerKey) {
  const player = gameState.players[playerKey];
  const affordable = player.zones.hand
    .map((instance) => ({ instance, card: getCard(instance.cardId) }))
    .filter(({ card }) => (card.tipo === "Devotee" || card.tipo === "Relic") && typeof card.custo === "number" && card.custo <= getAvailableCosmo(player, card.unidade_custo || "cosmo"))
    .sort((left, right) => {
      const priority = aiCardPriority(right.card) - aiCardPriority(left.card);
      if (priority !== 0) return priority;
      return (right.card.custo ?? 0) - (left.card.custo ?? 0);
    });

  const best = affordable[0];
  if (!best) {
    return false;
  }

  if (!spendCosmo(player, best.card.custo, best.card.nome_exibicao_en, { unit: best.card.unidade_custo || "cosmo" })) {
    return false;
  }

  moveCard(playerKey, best.instance.uid, "battlefield", { skipPaymentPrompt: true });
  addLog(`${player.label} AI plays ${best.card.nome_exibicao_en}.`);
  return true;
}

function aiCardPriority(card) {
  if (card.tipo === "Devotee") return 3;
  if (card.subtipos.includes("Cloth")) return 2;
  return 1;
}

async function aiAttackStep(playerKey) {
  const player = gameState.players[playerKey];
  const attackers = [...player.zones.battlefield]
    .filter((instance) => {
      const card = getCard(instance.cardId);
      return (
        isDevoteeCard(instance.cardId) &&
        !instance.tapped &&
        !instance.enteredCombatThisTurn &&
        !instance.summoningSick &&
        !hasKeyword(card, "Sealed", instance)
      );
    })
    .sort((left, right) => {
      const leftStats = getComputedStats(player, left, getCard(left.cardId), "battlefield");
      const rightStats = getComputedStats(player, right, getCard(right.cardId), "battlefield");
      return (rightStats.power ?? 0) - (leftStats.power ?? 0);
    });

  for (const attacker of attackers) {
    if (!gameState || gameState.currentPlayer !== playerKey) {
      return;
    }

    const fresh = findCardInstance(playerKey, attacker.uid);
    if (!fresh || fresh.zone !== "battlefield" || fresh.card.tapped || fresh.card.enteredCombatThisTurn) {
      continue;
    }

    const target = pickAiAttackTarget(fresh);
    if (!target) {
      continue;
    }

    resolveEnterCombat(playerKey, fresh.card.uid);
    gameState.combat.target = target;
    openCombatPriorityWindow();
    if (isPriorityWindowOpen()) {
      if (isAiPlayer(gameState.combat.priorityPlayerKey)) {
        gameState.combat.responseActive = true;
        await resolveCombatFromPriority(true);
      } else {
        gameState.combat.resumeAiAfterResolution = true;
        return "paused";
      }
    }
    renderGame();
    await aiPause(AI_SHORT_DELAY_MS);
  }

  return "done";
}

function pickAiAttackTarget(attacker) {
  const enemyPlayerKey = otherPlayerKey(attacker.card.owner);
  const enemy = gameState.players[enemyPlayerKey];
  const enemyDevotees = enemy.zones.battlefield
    .map((instance) => findCardInstance(enemyPlayerKey, instance.uid))
    .filter(Boolean)
    .filter((located) =>
      isAttackableCardTargetForAttacker(attacker, enemyPlayerKey, located.zone, located.card, located.cardData)
    );

  if (enemyDevotees.length > 0) {
    enemyDevotees.sort((left, right) => {
      const leftStats = getComputedStats(enemy, left.card, left.cardData, left.zone);
      const rightStats = getComputedStats(enemy, right.card, right.cardData, right.zone);
      return (leftStats.resistance ?? 0) - (rightStats.resistance ?? 0);
    });
    return {
      kind: "card",
      playerKey: enemyPlayerKey,
      uid: enemyDevotees[0].card.uid
    };
  }

  if (isAttackableGodTargetForAttacker(attacker, enemyPlayerKey)) {
    return {
      kind: "god",
      playerKey: enemyPlayerKey
    };
  }

  return null;
}

function renderBoards() {
  if (!gameState) {
    renderEmptyBoards();
    return;
  }

  elements.boards.A.innerHTML = renderPlayerBoard(gameState.players.B, "top");
  elements.boards.B.innerHTML = renderPlayerBoard(gameState.players.A, "bottom");
  elements.heroSlots.A.domain.innerHTML = "";
  elements.heroSlots.A.god.innerHTML = "";
  elements.heroSlots.B.god.innerHTML = "";
  elements.heroSlots.B.domain.innerHTML = "";
  syncBoardScopedElements();
  scheduleBattlefieldLayoutSync();
}

function renderEmptyBoards() {
  elements.boards.A.innerHTML = `
    <section class="seat"></section>
  `;

  elements.boards.B.innerHTML = `
    <section class="seat"></section>
  `;

  elements.heroSlots.A.domain.innerHTML = "";
  elements.heroSlots.A.god.innerHTML = "";
  elements.heroSlots.B.god.innerHTML = "";
  elements.heroSlots.B.domain.innerHTML = "";
  syncBoardScopedElements();
  if (battlefieldLayoutSyncFrame !== null) {
    cancelAnimationFrame(battlefieldLayoutSyncFrame);
    battlefieldLayoutSyncFrame = null;
  }
}

function syncBoardScopedElements() {
  elements.actionBar = document.querySelector("#action-bar");
  elements.bottomLogPanel = null;
  elements.bottomPhasePanel = null;
}

// Arena-style seat: every block is absolutely placed by arena.css inside the seat.
function renderPlayerBoard(player, orientation) {
  const active = player.key === gameState.currentPlayer;

  return `
    <section class="seat seat--${orientation} ${active ? "is-active" : ""}">
      <div class="seat__battlefield">
        ${renderArenaZone(player, "battlefield", "Battlefield", "Drag Devotees, Cloths and Relics here.", "board-zone board-zone--battlefield")}
      </div>
      <div class="seat__base">${renderCosmoBaseZone(player)}</div>
      <div class="seat__hand">${renderHandRibbon(player, orientation, "Hand")}</div>
      <div class="seat__avatar">${renderArenaAvatar(player)}</div>
      <div class="seat__domain">${renderArenaDomain(player)}</div>
      <div class="seat__piles">${renderArenaPiles(player)}</div>
    </section>
  `;
}

function renderArenaAvatar(player) {
  const god = getCard(player.god.cardId);
  const targetable = isAttackableGodTarget(player.key);
  const targeted = gameState?.combat?.target?.kind === "god" && gameState.combat.target.playerKey === player.key;
  const selectionTargetable = isEffectTargetableGod(player.key);
  const arena = getArenaGodState(player.key);
  const soulRatio = Math.max(0, Math.min(1, player.god.soul / Math.max(1, god.soul || player.god.soul)));
  const portrait = god.caminho_imagem
    ? `<img src="../${escapeHtml(god.caminho_imagem)}" alt="${escapeHtml(god.nome_exibicao_en)}">`
    : `<span>${escapeHtml(god.nome_exibicao_en.slice(0, 1))}</span>`;

  return `
    <article class="arena-avatar ${player.god.awakened ? "is-awakened" : ""} ${targetable ? "attack-targetable" : ""} ${targeted ? "attack-targeted" : ""} ${selectionTargetable ? "selection-targetable" : ""} ${arena.cls}" data-inspect-kind="god" data-player="${player.key}"${arena.title ? ` title="${escapeHtml(arena.title)}"` : ""} style="--soul-ratio:${soulRatio.toFixed(3)}">
      <div class="arena-avatar__halo" aria-hidden="true"></div>
      <div class="arena-avatar__portrait">${portrait}</div>
      <div class="arena-avatar__soul" title="Soul">
        <span class="arena-avatar__soul-value">${player.god.soul}</span>
      </div>
      <div class="arena-avatar__plate">
        <strong class="arena-avatar__name">${escapeHtml(player.label || god.nome_exibicao_en)}</strong>
        <span class="arena-avatar__stat" title="Attack">ATK ${player.god.attack}</span>
        <span class="arena-avatar__stat" title="Awaken">AWK ${player.god.awaken}</span>
      </div>
    </article>
  `;
}

function renderArenaDomain(player) {
  const domain = getCard(player.domainId);

  return `
    <article class="arena-domain ${player.domainUsed ? "is-used" : ""}" data-inspect-kind="domain" data-player="${player.key}">
      <span class="arena-domain__label">Domain</span>
      <strong class="arena-domain__name">${escapeHtml(domain.nome_exibicao_en)}</strong>
      <span class="arena-domain__state">${player.domainUsed ? "Used" : "Ready"}</span>
    </article>
  `;
}

function renderArenaPiles(player) {
  const deckCount = player.zones.deck.length;
  const pileFace = (zoneId) => {
    const cards = player.zones[zoneId];
    const latest = cards[cards.length - 1];
    const latestCard = latest ? getCard(latest.cardId) : null;
    const face = latestCard?.caminho_imagem
      ? `<img src="../${escapeHtml(latestCard.caminho_imagem)}" alt="${escapeHtml(latestCard.nome_exibicao_en)}">`
      : latestCard
        ? `<span class="arena-pile__proxy">${escapeHtml(latestCard.nome_exibicao_en)}</span>`
        : "";

    return `
      <section class="arena-pile arena-pile--${zoneId} drop-zone ${cards.length ? "" : "is-empty"}" data-drop-zone="${zoneId}" data-player="${player.key}">
        <div class="arena-pile__card" ${latest ? `data-card-uid="${latest.uid}" data-player="${player.key}"` : ""}>${face}</div>
        <span class="arena-pile__label">${escapeHtml(zoneLabel(zoneId))}</span>
        <span class="arena-pile__count">${cards.length}</span>
      </section>
    `;
  };

  return `
    <div class="arena-piles">
      <section class="arena-pile arena-pile--deck ${deckCount ? "" : "is-empty"}" style="--depth:${Math.min(8, Math.ceil(deckCount / 8))}">
        <div class="arena-pile__card arena-pile__card--back"></div>
        <span class="arena-pile__label">Deck</span>
        <span class="arena-pile__count">${deckCount}</span>
      </section>
      ${pileFace("tartarus")}
      ${pileFace("void")}
    </div>
  `;
}

function renderArenaZone(player, zoneId, title, subtitle, extraClass = "") {
  const cards = zoneId === "battlefield" ? getBattlefieldDisplayCards(player) : player.zones[zoneId];

  return `
    <section class="zone-panel ${extraClass} drop-zone" data-drop-zone="${zoneId}" data-player="${player.key}">
      <div class="zone-watermark" aria-hidden="true">${escapeHtml(title)}</div>
      <span class="count-pill zone-count-pill">${player.zones[zoneId].length}</span>
      <div class="card-lane ${getLaneDensityClass(zoneId, cards.length)}">
        ${
          cards.length === 0
            ? `<div class="empty-zone">${escapeHtml(subtitle)}</div>`
            : cards.map((instance) => zoneId === "battlefield" ? renderBattlefieldStack(player, instance) : renderFullCard(player.key, zoneId, instance)).join("")
        }
      </div>
    </section>
  `;
}

function getBattlefieldDisplayCards(player) {
  return player.zones.battlefield.filter((instance) => !instance.attachedToUid);
}

function renderBattlefieldStack(player, instance) {
  ensureBattlefieldPosition(player.key, instance);
  const rootSelected = getBattlefieldSelectionSet(player.key).has(instance.uid);
  const rootCardClasses = rootSelected ? "card--battlefield-selected card--stacked-root" : "card--stacked-root";

  const attachments = isDevoteeCard(instance.cardId)
    ? getAttachedEquipment(player, instance.uid).sort((left, right) => {
      const leftCloth = isClothCard(left.instance.cardId);
      const rightCloth = isClothCard(right.instance.cardId);
      if (leftCloth === rightCloth) {
        return 0;
      }
      return leftCloth ? 1 : -1;
    })
    : [];

  const attachmentMarkup = attachments
    .map(({ instance: attachedInstance, cardData }, index) => {
      const typeClass = isClothCard(attachedInstance.cardId) ? "card--attached-cloth" : "card--attached-relic";
      return renderFullCard(player.key, "battlefield", attachedInstance, {
        extraClasses: `card--attached ${typeClass}`,
        attachmentIndex: index,
        attachmentTotal: attachments.length
      });
    })
    .join("");

  return `
    <div class="battlefield-stack ${rootSelected ? "is-selected" : ""}" data-battlefield-root="${instance.uid}" data-player="${player.key}" style="left:${instance.battlefieldPositionX}%;top:${instance.battlefieldPositionY}%;">
      ${attachmentMarkup}
      ${renderFullCard(player.key, "battlefield", instance, { extraClasses: rootCardClasses })}
    </div>
  `;
}

function renderCosmoBaseZone(player) {
  const cards = player.zones.cosmo_base;
  const focusedCard = getResourceFocusCard(player.key);
  const focusCost = typeof focusedCard?.cardData?.custo === "number" ? focusedCard.cardData.custo : null;
  const focusUnit = focusedCard?.cardData?.unidade_custo || "cosmo";
  const baseCanPay = focusCost !== null && Boolean(createCostPaymentPlan(player, focusCost, "base", focusUnit));
  const latentCanPay = focusCost !== null && Boolean(createCostPaymentPlan(player, focusCost, "latent", focusUnit));
  const mixedCanPay = focusCost !== null && Boolean(createCostPaymentPlan(player, focusCost, "mixed", focusUnit));

  return `
    <section class="zone-panel board-zone board-zone--base drop-zone ${focusedCard ? "resource-zone--focused" : ""}" data-drop-zone="cosmo_base" data-player="${player.key}" data-resource-panel="base">
      <div class="zone-watermark zone-watermark--base" aria-hidden="true">Cosmo Base</div>
      <span class="count-pill zone-count-pill">${cards.length}</span>
      <div class="board-zone__resource-layout">
        <div class="board-zone__resource-main ${focusedCard ? (baseCanPay ? "is-payable" : "is-insufficient") : ""}">
          <div class="card-lane ${getLaneDensityClass("cosmo_base", cards.length)}">
            ${
              cards.length === 0
                ? '<div class="empty-zone">Drag Cosmoble cards here to set resources.</div>'
                : cards.map((instance) => renderFullCard(player.key, "cosmo_base", instance)).join("")
            }
          </div>
        </div>
        <aside class="latent-cosmo-box ${player.latentCosmo > 0 ? "is-charged" : ""} ${focusedCard ? (latentCanPay ? "is-payable" : "is-insufficient") : ""}" data-resource-panel="latent" data-player="${player.key}">
          <div class="latent-cosmo-box__label">Latent</div>
          <div class="latent-cosmo-box__value">${player.latentCosmo}</div>
          <div class="latent-cosmo-box__pool">Pool ${player.cosmo}</div>
          ${
            focusedCard
              ? `<div class="latent-cosmo-box__focus">${escapeHtml(focusedCard.cardData.nome_exibicao_en)} • Cost ${escapeHtml(formatValue(focusCost, focusUnit) || String(focusCost))}${mixedCanPay && !baseCanPay && !latentCanPay ? " • Mixed available" : ""}</div>`
              : '<div class="latent-cosmo-box__focus">Temporary resource for explosive turns.</div>'
          }
        </aside>
      </div>
    </section>
  `;
}

function getResourceFocusCard(playerKey) {
  const focusDescriptor = paymentState && paymentState.playerKey === playerKey
    ? { playerKey, uid: paymentState.uid }
    : heldCardState && heldCardState.playerKey === playerKey
      ? heldCardState
      : null;

  if (!focusDescriptor) {
    return null;
  }

  const located = findCardInstance(focusDescriptor.playerKey, focusDescriptor.uid);
  if (!located || located.zone !== "hand" || typeof located.cardData.custo !== "number") {
    return null;
  }

  return located;
}

function renderHandRibbon(player, orientation, title = "Hand") {
  const cards = player.zones.hand;
  const hiddenOpponentHand = orientation === "top";

  return `
    <section class="hand-ribbon hand-ribbon--${orientation} ${hiddenOpponentHand ? "hand-ribbon--hidden" : "drop-zone"}" ${hiddenOpponentHand ? "" : `data-drop-zone="hand" data-player="${player.key}"`}>
      <div class="zone-watermark zone-watermark--hand" aria-hidden="true">${escapeHtml(title)}</div>
      <span class="count-pill zone-count-pill">${cards.length}</span>
      <div class="card-lane ${getLaneDensityClass("hand", cards.length)}">
        ${
          cards.length === 0
            ? '<div class="empty-zone">Drop cards here.</div>'
            : hiddenOpponentHand
              ? cards.map((instance, index) => renderOpponentHandCard(getFanStyle(index, cards.length))).join("")
              : cards.map((instance, index) => renderFullCard(player.key, "hand", instance, { style: getFanStyle(index, cards.length) })).join("")
        }
      </div>
    </section>
  `;
}

// Fan offset from the hand's centre: arena.css turns --fan into rotation and arc lift.
function getFanStyle(index, total) {
  return `--fan:${(index - (total - 1) / 2).toFixed(2)};--fan-n:${total};`;
}

function renderOpponentHandCard(style = "") {
  return `
    <article class="card zone--hand card--opponent-hand" aria-hidden="true" style="${style}">
      <div class="card-frame">
        <div class="card-art card-art--opponent-back">
          <div class="opponent-hand-back">
            <span class="opponent-hand-back__title">Saint Seiya</span>
            <span class="opponent-hand-back__subtitle">TCG</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderGodAbilityButtons(player) {
  if (player.god.cardId !== ATHENA_GOD_ID) {
    return "";
  }

  const availableCosmo = getAvailableCosmo(player);
  const canUsePrayer = availableCosmo >= 5;
  const canUseSave = player.god.awakened && availableCosmo >= 5;

  return `
    <button class="ghost" data-action="god-ability" data-player="${player.key}" data-ability="prayer" ${canUsePrayer ? "" : "disabled"}>Athena's Prayer</button>
    <button class="ghost" data-action="god-ability" data-player="${player.key}" data-ability="awaken-save" ${canUseSave ? "" : "disabled"}>Awaken Save</button>
    <button class="ghost" data-action="god-ability" data-player="${player.key}" data-ability="ultimate" ${availableCosmo >= 15 ? "" : "disabled"}>Athena Exclamation</button>
  `;
}

// Arena cues: playable glow in hand, declared attackers, and valid/invalid targets while declaring.
function getArenaCardState(playerKey, zoneId, instance) {
  if (!gameState) {
    return { cls: "", title: "" };
  }

  if (zoneId === "hand" && playerKey === "A" && !isAiPlayer("A")) {
    const located = findCardInstance("A", instance.uid);
    const hovered = instance.uid === hoveredHandUid && !dragState ? " is-hovered" : "";
    if (canPlayFromHandNow("A", located)) return { cls: `is-playable${hovered}`, title: "" };
    if (canSetAsBaseNow("A", located)) return { cls: `is-base-ok${hovered}`, title: "Double-click to set as Cosmo Base" };
    return { cls: `is-unplayable${hovered}`, title: "" };
  }

  if (zoneId !== "battlefield" || !attackDeclare || !isDevoteeCard(instance.cardId)) {
    return { cls: "", title: "" };
  }

  if (playerKey === "A") {
    const entry = attackDeclare.entries.find((item) => item.uid === instance.uid);
    if (entry) return { cls: `is-declared-attacker ${entry.uid === attackDeclare.focusUid ? "is-declare-focus" : ""}`, title: "Click again to remove" };
    return canDeclareAttacker("A", instance) ? { cls: "is-attack-eligible", title: "Click to attack with this Devotee" } : { cls: "", title: "" };
  }

  const attacker = getDeclareFocusAttacker();
  if (!attacker) {
    return { cls: "", title: "" };
  }
  const reason = getAttackBlockReason(attacker, { kind: "card", playerKey, uid: instance.uid });
  return reason ? { cls: "is-invalid-target", title: reason } : { cls: "is-valid-target", title: "" };
}

function getArenaGodState(playerKey) {
  const attacker = playerKey === "B" ? getDeclareFocusAttacker() : null;
  if (!attacker) {
    return { cls: "", title: "" };
  }
  const reason = getAttackBlockReason(attacker, { kind: "god", playerKey });
  return reason ? { cls: "is-invalid-target", title: reason } : { cls: "is-valid-target", title: "" };
}

function renderFullCard(playerKey, zoneId, instance, options = {}) {
  const player = gameState.players[playerKey];
  const card = getCard(instance.cardId);
  const { attachmentIndex = 0, style = "" } = options;
  const arena = getArenaCardState(playerKey, zoneId, instance);
  const extraClasses = `${options.extraClasses || ""} ${arena.cls}`;
  const selected = selectedInspector?.kind === "card" && selectedInspector.uid === instance.uid;
  const snippet = getCardSnippet(card);
  const showCosmoBack = zoneId === "cosmo_base";
  const artMarkup = showCosmoBack
    ? '<div class="cosmo-card-back"><span class="cosmo-card-back__label">Cosmo</span></div>'
    : card.caminho_imagem
      ? `<img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(card.nome_exibicao_en)}">`
      : renderProxyFace(card);
  const computed = getComputedStats(player, instance, card, zoneId);
  const targetable = isAttackableCardTarget(playerKey, zoneId, instance, card);
  const guardianForcedTarget = isForcedGuardianTarget(playerKey, zoneId, instance, card);
  const targeted = gameState?.combat?.target?.kind === "card" && gameState.combat.target.uid === instance.uid;
  const selectionTargetable = isEffectTargetableCard(playerKey, zoneId, instance, card);
  const attackSource = gameState?.combat?.attacker?.uid === instance.uid && gameState?.combat?.attacker?.playerKey === playerKey;
  const selectionSource = targetingState?.source?.uid === instance.uid && targetingState?.source?.playerKey === playerKey;
  const abilityState = getCardAbilityState(playerKey, zoneId, instance, card);
  const summoningSick = zoneId === "battlefield" && isDevoteeCard(instance.cardId) && instance.summoningSick;
  const battlefieldDevotee = zoneId === "battlefield" && isDevoteeCard(instance.cardId);
  const costFocus = zoneId === "hand" && isCostFocusCard(playerKey, instance.uid);
  const handCostGem =
    zoneId === "hand" && card.custo !== null
      ? `
        <div class="card-cost-gem ${costFocus ? "is-glowing" : ""}">
          <span class="card-cost-gem__value">${escapeHtml(String(card.custo))}</span>
          <span class="card-cost-gem__unit">${escapeHtml(card.unidade_custo === "base_cosmo" ? "Base" : "Cosmo")}</span>
        </div>
      `
      : "";
  const contentMarkup =
    zoneId === "battlefield" || zoneId === "cosmo_base"
      ? ""
      : `
        <div class="card-content">
          <div>
            <h3 class="card-title">${escapeHtml(card.nome_exibicao_en)}</h3>
            <p class="card-meta">${escapeHtml(card.tipo)}${card.subtipos.length ? ` - ${escapeHtml(card.subtipos.join(", "))}` : ""}</p>
          </div>
          <div class="card-badges">
            ${renderBadge("Cost", formatValue(card.custo, card.unidade_custo))}
            ${renderBadge("Power", formatValue(computed.power))}
            ${renderBadge("Resistance", formatValue(computed.resistance))}
            ${renderBadge("Equip", formatValue(card.equipar_custo))}
            ${renderBadge("Damage", formatValue(card.damage_cloth))}
            ${card.status === "design-ready" ? '<span class="badge proxy">Proxy</span>' : ""}
            ${instance.plusOneCounters ? `<span class="badge stat">+1/+1 x${instance.plusOneCounters}</span>` : ""}
            ${instance.sealCounters ? `<span class="badge stat">⛓ x${instance.sealCounters}</span>` : ""}
            ${instance.damageCounters ? `<span class="badge stat">Damage x${instance.damageCounters}</span>` : ""}
            ${instance.tapped ? '<span class="badge stat">Tapped</span>' : ""}
          </div>
          <div class="card-snippet">${escapeHtml(snippet)}</div>
          ${computed.activeNotes.length ? `<div class="effect-strip">${computed.activeNotes.map((note) => `<span class="token">${escapeHtml(note)}</span>`).join("")}</div>` : ""}
          <div class="card-hint">Drag to another zone or click to inspect.</div>
        </div>
      `;

  return `
    <article class="card zone--${zoneId} ${selected ? "selected" : ""} ${instance.tapped ? "tapped" : ""} ${targetable ? "attack-targetable" : ""} ${guardianForcedTarget ? "guardian-forced-target" : ""} ${targeted ? "attack-targeted" : ""} ${selectionTargetable ? "selection-targetable" : ""} ${attackSource || selectionSource ? "selection-source" : ""} ${abilityState ? "card--activatable" : ""} ${summoningSick ? "card--summoning-sick" : ""} ${costFocus ? "card--cost-focus" : ""} ${extraClasses}" data-card-uid="${instance.uid}" data-player="${playerKey}" data-attachment-index="${attachmentIndex}"${arena.title ? ` title="${escapeHtml(arena.title)}"` : ""}${style ? ` style="${style}"` : ""}>
      <div class="card-frame">
        <div class="card-art ${showCosmoBack ? "card-art--cosmo-back" : ""} ${!showCosmoBack && !card.caminho_imagem ? "proxy" : ""}">
          ${artMarkup}
        </div>
        ${handCostGem}
        ${guardianForcedTarget ? renderGuardianForcedOverlay() : ""}
        ${instance.sealCounters ? renderSealOverlay(instance.sealCounters) : ""}
        ${summoningSick ? renderSummoningSicknessOverlay() : ""}
        ${battlefieldDevotee ? renderBattlefieldStatsOverlay(computed.power, computed.resistance) : ""}
        ${battlefieldDevotee && instance.damageCounters > 0 ? renderDamageOverlay(instance.damageCounters) : ""}
        ${renderCardAbilityOverlay(playerKey, instance, abilityState)}
        ${contentMarkup}
      </div>
    </article>
  `;
}

// Printed-looking face for design-ready cards that have no exported PNG yet.
function renderProxyFace(card) {
  if (!card) {
    return "";
  }

  const typeLine = `${card.tipo}${card.subtipos.length ? ` — ${card.subtipos.join(", ")}` : ""}`;
  const hasStats = card.power !== null && card.power !== undefined;

  return `
    <div class="proxy-face proxy-face--${escapeHtml(String(card.tipo).toLowerCase())}">
      <div class="proxy-face__head">
        <span class="proxy-face__name">${escapeHtml(card.nome_exibicao_en)}</span>
        ${card.custo !== null ? `<span class="proxy-face__cost">${escapeHtml(String(card.custo))}</span>` : ""}
      </div>
      <div class="proxy-face__art" aria-hidden="true"></div>
      <div class="proxy-face__type">${escapeHtml(typeLine)}</div>
      <div class="proxy-face__text">${escapeHtml(getCardSnippet(card))}</div>
      ${hasStats ? `<div class="proxy-face__stats">${escapeHtml(String(card.power))}/${escapeHtml(String(card.resistance))}</div>` : ""}
    </div>
  `;
}

function renderBattlefieldStatsOverlay(power, resistance) {
  return `
    <div class="card-battlefield-stats">
      <span class="card-battlefield-stat card-battlefield-stat--power">${escapeHtml(String(power ?? "-"))}</span>
      <span class="card-battlefield-stat card-battlefield-stat--resistance">${escapeHtml(String(resistance ?? "-"))}</span>
    </div>
  `;
}

function renderSummoningSicknessOverlay() {
  return `
    <div class="card-sickness-mask">
      <span class="card-sickness-badge">ZZZ</span>
    </div>
  `;
}

function renderGuardianForcedOverlay() {
  return `
    <div class="card-guardian-mask">
      <span class="card-guardian-badge">Guardian</span>
    </div>
  `;
}

function renderSealOverlay(count) {
  return `
    <div class="card-seal-mask">
      <span class="card-seal-badge">⛓ ${count}</span>
    </div>
  `;
}

function renderDamageOverlay(count) {
  return `
    <div class="card-damage-mask">
      <span class="card-damage-badge">-${escapeHtml(String(count))}</span>
    </div>
  `;
}

function renderCardAbilityOverlay(playerKey, instance, abilityState) {
  if (!abilityState) {
    return "";
  }

  const action = abilityState.mode === "menu"
    ? "open-card-abilities"
    : isEquipCard(instance.cardId)
      ? "equip-card"
      : "resolve-card-ability";

  return `
    <div class="card-ability-mask">
      <button class="card-ability-trigger" data-action="${action}" data-player="${playerKey}" data-uid="${instance.uid}" ${typeof abilityState.lineIndex === "number" ? `data-line-index="${abilityState.lineIndex}"` : ""}>
        ${escapeHtml(abilityState.label)}
      </button>
    </div>
  `;
}

function isCostFocusCard(playerKey, uid) {
  if (paymentState && paymentState.playerKey === playerKey && paymentState.uid === uid) {
    return true;
  }

  return Boolean(heldCardState && heldCardState.playerKey === playerKey && heldCardState.uid === uid);
}

function getLaneDensityClass(zoneId, count) {
  if (zoneId === "hand") {
    if (count > 8) return "is-packed";
    if (count > 5) return "is-crowded";
    return "";
  }

  if (zoneId === "battlefield") {
    if (count > 7) return "is-packed";
    if (count > 5) return "is-crowded";
    return "";
  }

  if (zoneId === "cosmo_base") {
    if (count > 8) return "is-packed";
    if (count > 6) return "is-crowded";
  }

  return "";
}

function renderBadge(label, value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return `<span class="badge stat">${escapeHtml(label)} ${escapeHtml(String(value))}</span>`;
}

function renderCoverage() {
  return renderCoverageMarkup();
}

function renderCoverageGroup(title, items) {
  return `
    <div class="coverage-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="token-list">
        ${items.map((item) => `<span class="token">${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderCoverageMarkup() {
  if (!betaData) {
    return '<div class="log-item">Coverage data unavailable.</div>';
  }

  const coverage = betaData.mechanic_coverage;
  return `
    ${renderCoverageGroup("Active Types", coverage.tipos_ativos)}
    ${renderCoverageGroup("Keywords", coverage.keywords_ativas)}
    ${renderCoverageGroup("Required Rules", coverage.regras_obrigatorias)}
  `;
}

function renderDockTabContent() {
  if (!elements.dockTabContent) {
    return;
  }

  document.querySelectorAll(".dock-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dockTab === dockTab);
  });

  if (dockTab === "help") {
    elements.dockTabContent.innerHTML = `
      <div class="dock-mini-title">Quick Help</div>
      <ul class="compact-list compact-list--tight">
        <li>Hover shows a floating art preview. Right-click opens card actions.</li>
        <li>Use Full Info in the right-click menu to open the readable text box.</li>
        <li>Right-click your Devotee and choose Attack, then click an enemy Devotee or God.</li>
        <li>Drag cards between Hand, Battlefield, Cosmo Base, Tartarus, and Void.</li>
        <li>Upkeep and Draw resolve automatically at the start of each turn.</li>
      </ul>
    `;
    return;
  }

  if (dockTab === "coverage") {
    elements.dockTabContent.innerHTML = renderCoverageMarkup();
    return;
  }

  elements.dockTabContent.innerHTML = renderLogMarkup();
}

function renderActionBar() {
  if (!elements.actionBar) {
    return;
  }

  const infoLine = elements.turnIndicator?.textContent || "Load a match to begin.";
  const renderStatusMarkup = (content) => {
    elements.actionBar.innerHTML = content;
  };

  if (!gameState) {
    renderStatusMarkup(`
      <div class="center-hud">
        <div class="center-hud__info">
          <div class="center-hud__status-row">
            <span class="action-bar__label">Status</span>
            <span class="action-chip">${escapeHtml(infoLine)}</span>
          </div>
          <div class="center-hud__context-row">
            <span class="action-hint">Open a match to begin the duel.</span>
          </div>
        </div>
      </div>
      ${renderTurnControls(null)}
    `);
    return;
  }

  const previewTarget = hoverPreview || selectedInspector;
  const activePlayer = gameState.players[gameState.currentPlayer];
  const localPlayer = activePlayer;
  const latestLog = gameState.log?.[gameState.log.length - 1] || "Ready for the next action.";
  const canControlPhaseFlow =
    !isAiPlayer(gameState.currentPlayer) &&
    !gameState.victory &&
    !mulliganState &&
    !paymentState &&
    !spellResolutionState &&
    !equipSelectionState &&
    !zoneBrowserState &&
    !targetingState &&
    !gameState.combat.attacker &&
    !isPriorityWindowOpen();
  const modalStateText = mulliganState
    ? "Opening hand review in progress."
    : paymentState
      ? `Payment choice in progress for ${paymentState.cardName}.`
      : spellResolutionState
        ? `${spellResolutionState.stageLabel} in progress.`
        : infoLine;
  const contextMarkup = renderActionBarContext(previewTarget);

  const localTurn = !isAiPlayer(gameState.currentPlayer);

  renderStatusMarkup(`
    <div class="center-hud ${localTurn ? "is-local-turn" : "is-opponent-turn"}">
      <div class="center-hud__info">
        <div class="center-hud__status-row">
          <span class="center-hud__turn">${localTurn ? "Your Turn" : `${escapeHtml(activePlayer.label)}'s Turn`}</span>
          <span class="action-chip">${escapeHtml(phaseLabel(gameState.currentPhase))}</span>
          <span class="action-chip">${escapeHtml(renderCombatStatus())}</span>
          <span class="center-hud__focus">${escapeHtml(modalStateText)}</span>
        </div>
        <div class="center-hud__context-row">
          <span class="center-hud__feed">${escapeHtml(latestLog)}</span>
          <div class="center-hud__actions">${contextMarkup}</div>
        </div>
      </div>
    </div>
    ${renderTurnControls({ canControlPhaseFlow, localTurn, localPlayer })}
  `);
}

const TURN_PHASES = [
  ["upkeep", "Upkeep"],
  ["draw", "Draw"],
  ["main", "Main"],
  ["end", "End"]
];

// Arena-style phase ladder plus the single big pass button in the bottom-right corner.
function renderTurnControls(flow) {
  const phase = gameState?.currentPhase || null;
  const order = TURN_PHASES.map(([id]) => id);
  const canJump = Boolean(flow?.localTurn && flow.canControlPhaseFlow && !attackDeclare);
  const ladder = TURN_PHASES.map(([id, label]) => {
    const ahead = canJump && order.indexOf(id) > order.indexOf(phase);
    return ahead
      ? `<button class="phase-pip is-jump" data-action="goto-phase" data-phase="${id}" title="Skip to ${label}">${label}</button>`
      : `<span class="phase-pip ${phase === id ? "is-active" : ""}">${label}</span>`;
  }).join("");

  const primary = getPrimaryAction();
  const secondary = [...(primary.secondary || [])];
  if (attackDeclare) {
    secondary.unshift(["All Attack", "declare-all"]);
    if (attackDeclare.history.length) secondary.push(["Undo (Z)", "declare-undo"]);
    if (attackDeclare.entries.length) secondary.push(["Cancel", "declare-cancel"]);
  } else if (primary.action === "declare-start") {
    secondary.unshift(["All Attack", "declare-all"]);
  }

  const sub = primary.sub || (flow?.localTurn ? `Pool ${flow.localPlayer.cosmo} • Latent ${flow.localPlayer.latentCosmo}` : "");
  return `
    <div class="turn-controls">
      <div class="phase-ladder">${ladder}</div>
      ${secondary.length ? `<div class="pass-secondary">${secondary.map(([label, action]) => `<button class="pass-secondary__button" data-action="${action}">${escapeHtml(label)}</button>`).join("")}</div>` : ""}
      <button class="pass-button pass-button--${primary.tone} ${primary.disabled ? "" : "is-ready"}" ${primary.action ? `data-action="${primary.action}"` : ""} ${primary.disabled ? "disabled" : ""} title="Space">
        <span class="pass-button__label">${escapeHtml(primary.label)}</span>
        ${sub ? `<span class="pass-button__sub">${escapeHtml(sub)}</span>` : ""}
      </button>
      <button class="log-button ${logPopupOpen ? "is-active" : ""}" data-action="toggle-log-popup" ${gameState ? "" : "disabled"} aria-label="Open log">Log</button>
    </div>
  `;
}

function renderActionBarContext(previewTarget) {
  const combat = gameState.combat;
  const buttons = [];

  if (combat.attacker && combat.mode === "target") {
    const forcedGuardians = getForcedGuardianTargets(otherPlayerKey(combat.attacker.playerKey));
    if (forcedGuardians.length) {
      buttons.push(`<span class="action-hint">Guardian active. You must attack a Guardian defender${forcedGuardians.length > 1 ? " of your choice" : ""}.</span>`);
    } else {
      buttons.push('<span class="action-hint">Attack mode active. Click an enemy Devotee or the enemy God to resolve combat automatically.</span>');
    }
    buttons.push('<button class="phase-button" data-action="clear-combat">Clear Combat</button>');
  }

  if (combat.attacker && combat.mode === "priority") {
    const defender = gameState.players[combat.priorityPlayerKey];
    const responseCopy = combat.responseActive
      ? `${defender.label} may use Techniques, Relics, Domains, or Devotee abilities now.`
      : `${defender.label} may choose Respond or OK before combat damage happens.`;
    buttons.push(`<span class="action-hint">${escapeHtml(responseCopy)}</span>`);
    if (!isAiPlayer(combat.priorityPlayerKey)) {
      if (!combat.responseActive) {
        buttons.push('<button class="phase-button" data-action="combat-priority-respond">Respond</button>');
      }
      buttons.push('<button class="phase-button phase-button--primary" data-action="combat-priority-ok">OK</button>');
    }
  }

  if (targetingState) {
    buttons.push(`<span class="action-hint">${escapeHtml(targetingState.prompt)}</span>`);
    buttons.push('<button class="phase-button" data-action="clear-targeting">Clear Target</button>');
  }

  if (previewTarget?.kind === "card") {
    const located = findCardInstance(previewTarget.playerKey, previewTarget.uid);
    if (located && located.zone === "battlefield" && isDevoteeCard(located.cardId) && canPlayerActNow(previewTarget.playerKey)) {
      buttons.push(
        `<button class="phase-button" data-action="attack" data-player="${previewTarget.playerKey}" data-uid="${previewTarget.uid}">Attack</button>`
      );
    }
  }

  if (previewTarget?.kind === "god" && previewTarget.playerKey === gameState.currentPlayer) {
    buttons.push(renderGodAbilityButtons(gameState.players[previewTarget.playerKey]));
  }

  if (!buttons.length) {
    return '<span class="action-hint">Hover or select a card to expose contextual actions here.</span>';
  }

  return buttons.join("");
}

function renderCombatStatus() {
  if (targetingState) {
    return targetingState.statusLabel || "Choosing target";
  }

  if (!gameState?.combat?.attacker) {
    return "No attack selected";
  }

  const combat = gameState.combat;
  const attacker = findCardInstance(combat.attacker.playerKey, combat.attacker.uid);
  const attackerName = attacker?.cardData.nome_exibicao_en || "Attacker";

  if (combat.mode === "target") {
    return `${attackerName} choosing attack target`;
  }

  if (combat.mode === "priority") {
    const targetName =
      combat.target.kind === "god"
        ? `${playerLabel(combat.target.playerKey)} God`
        : findCardInstance(combat.target.playerKey, combat.target.uid)?.cardData.nome_exibicao_en || "Target";
    return `${attackerName} -> ${targetName} • priority to ${playerLabel(combat.priorityPlayerKey)}`;
  }

  if (combat.target) {
    const targetName =
      combat.target.kind === "god"
        ? `${playerLabel(combat.target.playerKey)} God`
        : findCardInstance(combat.target.playerKey, combat.target.uid)?.cardData.nome_exibicao_en || "Target";
    return `${attackerName} -> ${targetName}`;
  }

  return `${attackerName} ready`;
}

function renderCombatOverlay() {
  if (!elements.combatOverlay || !elements.combatOverlay.parentElement) {
    return;
  }

  const playmatRect = elements.combatOverlay.parentElement.getBoundingClientRect();
  const combat = gameState?.combat;
  const lines = [];
  // The playmat is scaled with --ui-scale; convert client pixels into its unscaled viewBox units.
  const scale = playmatRect.width / Math.max(1, elements.combatOverlay.parentElement.offsetWidth || playmatRect.width);
  const pointer = { x: (pointerClient.x - playmatRect.left) / scale, y: (pointerClient.y - playmatRect.top) / scale };
  const toView = (point) => point && { x: point.x / scale, y: point.y / scale };
  elements.combatOverlay.setAttribute("viewBox", `0 0 ${playmatRect.width / scale} ${playmatRect.height / scale}`);

  if (combat?.attacker) {
    const attackerPoint = toView(getCombatAnchor(combat.attacker, playmatRect));
    const targetPoint = combat.target ? toView(getCombatAnchor(combat.target, playmatRect)) : null;
    if (attackerPoint && (targetPoint || combat.mode === "target")) {
      lines.push(renderCombatLine(attackerPoint, targetPoint || pointer, targetPoint ? "attack" : "aim"));
    }
  }

  attackDeclare?.entries.forEach((entry) => {
    const from = toView(getCombatAnchor({ kind: "card", playerKey: "A", uid: entry.uid }, playmatRect));
    const to = entry.target ? toView(getCombatAnchor(entry.target, playmatRect)) : entry.uid === attackDeclare.focusUid ? pointer : null;
    if (from && to) {
      lines.push(renderCombatLine(from, to, entry.target ? "declare" : "aim"));
    }
  });

  if (targetingState?.source) {
    const from = toView(getCombatAnchor(targetingState.source, playmatRect));
    if (from) {
      lines.push(renderCombatLine(from, pointer, "target"));
    }
  }

  elements.combatOverlay.innerHTML = lines.length
    ? `
    <defs>
      <marker id="attack-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"></path>
      </marker>
    </defs>
    ${lines.join("")}
  `
    : "";
}

function getCombatAnchor(entity, playmatRect) {
  let targetElement = null;

  if (!entity.uid) {
    targetElement = document.querySelector(`[data-inspect-kind="${entity.kind}"][data-player="${entity.playerKey}"]`);
  } else {
    targetElement = document.querySelector(`[data-card-uid="${entity.uid}"][data-player="${entity.playerKey}"]`);
  }

  if (!targetElement) {
    return null;
  }

  const rect = targetElement.getBoundingClientRect();
  return {
    x: rect.left - playmatRect.left + rect.width / 2,
    y: rect.top - playmatRect.top + rect.height / 2
  };
}

function renderCombatLine(from, to, type) {
  const stroke = { attack: "#ff5a3c", declare: "#ff5a3c", aim: "#ff8a5c", target: "#6cc3ff" }[type] || "#d4b15a";
  return `<line class="combat-line combat-line--${type}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="5" stroke-linecap="round" marker-end="url(#attack-arrow)"></line>`;
}

function renderInspector() {
  renderFloatingPreview();
  renderFloatingInfo();
}

function renderNewGameOverlay() {
  if (!elements.newGameOverlay) {
    return;
  }

  if (!newGameState?.open || !betaData) {
    elements.newGameOverlay.innerHTML = "";
    elements.newGameOverlay.classList.add("hidden");
    elements.newGameOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const optionsMarkup = betaData.decks
    .map((deck) => {
      const domain = getCard(deck.domain_id);
      return `<option value="${deck.id}">${escapeHtml(deck.nome)} (${escapeHtml(domain.nome_exibicao_en)})</option>`;
    })
    .join("");

  elements.newGameOverlay.innerHTML = `
    <div class="new-game-modal">
      <img class="brand-logo brand-logo--hero" src="${LOGO_SRC}" alt="Saint Seiya TCG">
      <div class="new-game-modal__header">
        <div>
          <p class="eyebrow">New Match</p>
          <h2>Start Athena Playtest</h2>
          <p class="mulligan-modal__copy">Choose the deck for Player A, the deck for Player B (AI), and who starts the first turn.</p>
        </div>
        ${
          gameState
            ? '<button class="ghost" data-action="new-game-cancel">Cancel</button>'
            : '<span class="action-chip">Setup required</span>'
        }
      </div>
      <div class="new-game-modal__grid">
        <label class="field new-game-field">
          <span>Player A Deck</span>
          <select id="new-game-deck-a">${optionsMarkup}</select>
        </label>
        <label class="field new-game-field">
          <span>Player B Deck (AI)</span>
          <select id="new-game-deck-b">${optionsMarkup}</select>
        </label>
        <label class="field new-game-field">
          <span>First Turn</span>
          <select id="new-game-starting-player">
            <option value="random">Random</option>
            <option value="A">Player A</option>
            <option value="B">Player B</option>
          </select>
        </label>
      </div>
      <div class="new-game-modal__status">
        <span class="action-chip">Player B is controlled by AI</span>
        <span class="action-chip">Opening hand mulligan remains with Player A</span>
      </div>
      <div class="new-game-modal__actions">
        <button class="ghost" data-action="new-game-swap">Swap Decks</button>
        <button class="primary" data-action="new-game-start">Start Match</button>
      </div>
    </div>
  `;

  const deckASelect = elements.newGameOverlay.querySelector("#new-game-deck-a");
  const deckBSelect = elements.newGameOverlay.querySelector("#new-game-deck-b");
  const startingSelect = elements.newGameOverlay.querySelector("#new-game-starting-player");
  if (deckASelect) {
    deckASelect.value = newGameState.deckAId;
  }
  if (deckBSelect) {
    deckBSelect.value = newGameState.deckBId;
  }
  if (startingSelect) {
    startingSelect.value = newGameState.startingPlayer;
  }

  elements.newGameOverlay.classList.remove("hidden");
  elements.newGameOverlay.setAttribute("aria-hidden", "false");
}

function renderMulliganOverlay() {
  if (!elements.mulliganOverlay) {
    return;
  }

  if (!gameState || !mulliganState) {
    elements.mulliganOverlay.innerHTML = "";
    elements.mulliganOverlay.classList.add("hidden");
    elements.mulliganOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const player = gameState.players[mulliganState.playerKey];
  const opponent = gameState.players[otherPlayerKey(player.key)];
  const selectedSet = new Set(mulliganState.selectedUids);
  const selectedCount = selectedSet.size;

  elements.mulliganOverlay.innerHTML = `
    <div class="mulligan-modal">
      <div class="mulligan-modal__header">
        <p class="eyebrow">Opening Hand</p>
        <h2>Mulligan</h2>
        <p class="mulligan-modal__copy">
          Select any number of cards to swap. If you take a mulligan, the opponent starts the game with 1 Latent Cosmo, regardless of how many cards you trade.
        </p>
      </div>
      <div class="mulligan-modal__cards">
        ${player.zones.hand.map((instance) => renderMulliganCard(instance, selectedSet.has(instance.uid))).join("")}
      </div>
      <div class="mulligan-modal__footer">
        <div class="mulligan-modal__status">
          <span class="action-chip">${escapeHtml(player.label)}</span>
          <span class="action-chip">${selectedCount} selected</span>
          <span class="action-chip">Penalty: 1 Latent Cosmo to ${escapeHtml(opponent.label)}</span>
        </div>
        <div class="mulligan-modal__actions">
          <button class="ghost" data-action="mulligan-keep">Keep</button>
          <button class="primary" data-action="mulligan-confirm" ${selectedCount ? "" : "disabled"}>Mulligan</button>
        </div>
      </div>
    </div>
  `;

  elements.mulliganOverlay.classList.remove("hidden");
  elements.mulliganOverlay.setAttribute("aria-hidden", "false");
}

function renderPaymentOverlay() {
  if (!elements.paymentOverlay) {
    return;
  }

  if (!gameState || !paymentState) {
    elements.paymentOverlay.innerHTML = "";
    elements.paymentOverlay.classList.add("hidden");
    elements.paymentOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const player = gameState.players[paymentState.playerKey];
  const card = getCard(findCardInstance(paymentState.playerKey, paymentState.uid)?.cardId || "");
  const isSpellPayment = paymentState.mode === "spell";
  const artMarkup = card?.caminho_imagem
    ? `<img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(paymentState.cardName)}">`
    : renderProxyFace(card);

  elements.paymentOverlay.innerHTML = `
    <div class="payment-modal">
      <div class="payment-modal__header">
        <div class="payment-modal__header-row">
          <div>
            <p class="eyebrow">${isSpellPayment ? "Cast Spell" : "Pay Cost"}</p>
            <h2>${escapeHtml(paymentState.cardName)}</h2>
            <p class="mulligan-modal__copy">
              Choose how to pay ${escapeHtml(formatValue(paymentState.amount, paymentState.unit) || String(paymentState.amount))}. Cosmo Base will tap cards on the board. Latent Cosmo will be consumed directly.${isSpellPayment ? " After payment, the playtest will open the targeting or resolution step required by the card text." : ""}
            </p>
          </div>
          <button class="ghost payment-modal__back" data-action="payment-back">Back</button>
        </div>
      </div>
      <div class="payment-modal__body">
        <div class="payment-card-preview">
          <div class="mulligan-card payment-card-preview__card">
            <div class="mulligan-card__art ${card?.caminho_imagem ? "" : "is-proxy"}">
              ${artMarkup}
            </div>
            <div class="mulligan-card__meta">
              <strong>${escapeHtml(paymentState.cardName)}</strong>
              <span>${escapeHtml(card?.tipo || "Card")} • Cost ${escapeHtml(formatValue(paymentState.amount, paymentState.unit) || String(paymentState.amount))}</span>
            </div>
          </div>
          <div class="payment-resource-summary">
            <span class="action-chip">Pool ${player.cosmo}</span>
            <span class="action-chip">Latent ${player.latentCosmo}</span>
            <span class="action-chip">Untapped Base ${countUntappedBase(player)}</span>
          </div>
        </div>
        <div class="payment-plan-list">
          ${paymentState.plans.map((plan) => `
            <button class="payment-plan" data-action="payment-select" data-plan-id="${escapeHtml(plan.id)}">
              <span class="payment-plan__title">${escapeHtml(plan.title)}</span>
              <span class="payment-plan__emphasis">${escapeHtml(plan.emphasis)}</span>
              <span class="payment-plan__detail">${escapeHtml(plan.detail)}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="mulligan-modal__footer">
        <div class="mulligan-modal__status">
          <span class="action-chip">${escapeHtml(player.label)}</span>
          <span class="action-chip">Spendable ${escapeHtml(String(getAvailableCosmo(player, paymentState.unit)))}</span>
        </div>
        <div class="mulligan-modal__actions">
          <button class="ghost" data-action="payment-back">Back</button>
          <button class="ghost" data-action="payment-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  elements.paymentOverlay.classList.remove("hidden");
  elements.paymentOverlay.setAttribute("aria-hidden", "false");
}

function renderSpellResolutionOverlay() {
  if (!elements.spellOverlay) {
    return;
  }

  if (!gameState || !spellResolutionState) {
    elements.spellOverlay.innerHTML = "";
    elements.spellOverlay.classList.add("hidden");
    elements.spellOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const located = findCardInstance(spellResolutionState.playerKey, spellResolutionState.uid);
  if (!located) {
    clearSpellResolution(false);
    elements.spellOverlay.innerHTML = "";
    elements.spellOverlay.classList.add("hidden");
    elements.spellOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const card = located.cardData;
  const player = gameState.players[spellResolutionState.playerKey];
  const artMarkup = card?.caminho_imagem
    ? `<img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(card.nome_exibicao_en)}">`
    : renderProxyFace(card);
  const showCancelButton = spellResolutionState.allowCancel && !zoneBrowserState;
  const targetOptions = getSpellTargetDescriptors(spellResolutionState.targetValidator);
  const targetSelectionActive = Boolean(spellResolutionState.targetValidator);

  elements.spellOverlay.innerHTML = `
    <div class="spell-resolution-modal">
      <div class="payment-modal__header">
        <div class="payment-modal__header-row">
          <div>
            <p class="eyebrow">${escapeHtml(spellResolutionState.stageLabel)}</p>
            <h2>${escapeHtml(spellResolutionState.title)}</h2>
            <p class="mulligan-modal__copy">${escapeHtml(spellResolutionState.prompt)}</p>
          </div>
          ${showCancelButton ? '<button class="ghost payment-modal__back" data-action="spell-cancel">Cancel</button>' : '<span class="action-chip">Committed</span>'}
        </div>
      </div>
      <div class="spell-resolution-modal__body">
        <div class="payment-card-preview">
          <div class="mulligan-card payment-card-preview__card">
            <div class="mulligan-card__art ${card?.caminho_imagem ? "" : "is-proxy"}">
              ${artMarkup}
            </div>
            <div class="mulligan-card__meta">
              <strong>${escapeHtml(spellResolutionState.title)}</strong>
              <span>${escapeHtml(spellResolutionState.cardType)} • Cost ${escapeHtml(formatValue(spellResolutionState.amount, spellResolutionState.unit) || String(spellResolutionState.amount))}</span>
              <span>${escapeHtml(targetSelectionActive ? "Choose one legal target below." : zoneBrowserState ? "Use the zone chooser to continue." : "Resolving spell effect.")}</span>
            </div>
          </div>
          <div class="payment-resource-summary">
            <span class="action-chip">${escapeHtml(player.label)}</span>
            <span class="action-chip">${escapeHtml(spellResolutionState.cardType)}</span>
            <span class="action-chip">Pool ${player.cosmo}</span>
            <span class="action-chip">Latent ${player.latentCosmo}</span>
            <span class="action-chip">Untapped Base ${countUntappedBase(player)}</span>
          </div>
        </div>
        <div class="spell-target-list">
          ${
            targetSelectionActive
              ? targetOptions.length
                ? targetOptions.map((descriptor) => renderSpellTargetCard(descriptor)).join("")
                : '<div class="empty-zone zone-browser-empty">No legal targets are available.</div>'
              : `<div class="spell-resolution-panel">
                  <div class="spell-resolution-panel__body">
                    <div class="spell-resolution-panel__chips">
                      <span class="action-chip">${zoneBrowserState ? "Choose from zone list" : "Resolving"}</span>
                    </div>
                  </div>
                </div>`
          }
        </div>
      </div>
      <div class="mulligan-modal__footer">
        <div class="mulligan-modal__status">
          <span class="action-chip">${targetSelectionActive ? `${targetOptions.length} legal target${targetOptions.length === 1 ? "" : "s"}` : "No direct target selection"}</span>
          <span class="action-chip">${escapeHtml(spellResolutionState.stageLabel)}</span>
        </div>
        <div class="mulligan-modal__actions">
          ${showCancelButton ? '<button class="ghost" data-action="spell-cancel">Cancel</button>' : ""}
        </div>
      </div>
    </div>
  `;

  elements.spellOverlay.classList.remove("hidden");
  elements.spellOverlay.setAttribute("aria-hidden", "false");
}

function renderSpellTargetCard(descriptor) {
  if (descriptor.kind === "god") {
    const player = gameState.players[descriptor.playerKey];
    return `
      <button class="equip-target-card spell-target-card spell-target-card--god" data-action="spell-target-select" data-kind="god" data-player="${descriptor.playerKey}">
        <div class="equip-target-card__art is-proxy">
          <div class="spell-target-god-art">${escapeHtml(player.god.name)}</div>
        </div>
        <div class="equip-target-card__meta">
          <strong>${escapeHtml(player.label)} God</strong>
          <span>${escapeHtml(player.god.name)}</span>
          <span>${escapeHtml(`Soul ${player.god.soul} • Attack ${player.god.attack} • Awaken ${player.god.awaken}`)}</span>
        </div>
      </button>
    `;
  }

  const player = gameState.players[descriptor.playerKey];
  const located = findCardInstance(descriptor.playerKey, descriptor.uid);
  if (!located) {
    return "";
  }

  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  const artMarkup = located.cardData.caminho_imagem
    ? `<img src="../${escapeHtml(located.cardData.caminho_imagem)}" alt="${escapeHtml(located.cardData.nome_exibicao_en)}">`
    : renderProxyFace(located.cardData);

  return `
    <button class="equip-target-card spell-target-card" data-action="spell-target-select" data-kind="card" data-player="${descriptor.playerKey}" data-uid="${located.card.uid}">
      <div class="equip-target-card__art ${located.cardData.caminho_imagem ? "" : "is-proxy"}">
        ${artMarkup}
      </div>
      <div class="equip-target-card__meta">
        <strong>${escapeHtml(located.cardData.nome_exibicao_en)}</strong>
        <span>${escapeHtml(located.cardData.tipo)}${located.cardData.subtipos.length ? ` • ${escapeHtml(located.cardData.subtipos.join(", "))}` : ""}</span>
        <span>${escapeHtml(`${computed.power ?? "-"} / ${computed.resistance ?? "-"}`)}</span>
      </div>
    </button>
  `;
}

function renderEquipOverlay() {
  if (!elements.equipOverlay) {
    return;
  }

  if (!gameState || !equipSelectionState) {
    elements.equipOverlay.innerHTML = "";
    elements.equipOverlay.classList.add("hidden");
    elements.equipOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const player = gameState.players[equipSelectionState.playerKey];
  const equipment = findCardInstance(equipSelectionState.playerKey, equipSelectionState.uid);
  if (!player || !equipment) {
    clearEquipSelection(false);
    elements.equipOverlay.innerHTML = "";
    elements.equipOverlay.classList.add("hidden");
    elements.equipOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const options = getEquipTargetOptions(equipSelectionState.playerKey, equipSelectionState.uid, equipSelectionState.ignoreCost);
  const artMarkup = equipment.cardData.caminho_imagem
    ? `<img src="../${escapeHtml(equipment.cardData.caminho_imagem)}" alt="${escapeHtml(equipment.cardData.nome_exibicao_en)}">`
    : renderProxyFace(equipment.cardData);

  elements.equipOverlay.innerHTML = `
    <div class="equip-modal">
      <div class="payment-modal__header">
        <div class="payment-modal__header-row">
          <div>
            <p class="eyebrow">Equip Relic</p>
            <h2>${escapeHtml(equipment.cardData.nome_exibicao_en)}</h2>
            <p class="mulligan-modal__copy">
              Choose one of your valid Devotees. Equip rules and Cloth restrictions are already being checked before the target is shown.
            </p>
          </div>
          <button class="ghost payment-modal__back" data-action="equip-back">Back</button>
        </div>
      </div>
      <div class="equip-modal__body">
        <div class="payment-card-preview">
          <div class="mulligan-card payment-card-preview__card">
            <div class="mulligan-card__art ${equipment.cardData.caminho_imagem ? "" : "is-proxy"}">
              ${artMarkup}
            </div>
            <div class="mulligan-card__meta">
              <strong>${escapeHtml(equipment.cardData.nome_exibicao_en)}</strong>
              <span>${escapeHtml(equipment.cardData.tipo)}${equipment.cardData.subtipos.length ? ` • ${escapeHtml(equipment.cardData.subtipos.join(", "))}` : ""}</span>
              <span>${escapeHtml(isClothCard(equipment.cardId) ? "Cloth rules: only 1 Cloth per Devotee." : "Relic equipment ready.")}</span>
            </div>
          </div>
          <div class="payment-resource-summary">
            <span class="action-chip">${escapeHtml(player.label)}</span>
            <span class="action-chip">Pool ${player.cosmo}</span>
            <span class="action-chip">Latent ${player.latentCosmo}</span>
            <span class="action-chip">Untapped Base ${countUntappedBase(player)}</span>
            <span class="action-chip">Equip ${equipment.cardData.equipar_custo ?? 0}</span>
          </div>
        </div>
        <div class="equip-target-list">
          ${
            options.length
              ? options.map((option) => renderEquipTargetCard(player, equipment, option)).join("")
              : '<div class="empty-zone zone-browser-empty">No valid equip targets are available.</div>'
          }
        </div>
      </div>
      <div class="mulligan-modal__footer">
        <div class="mulligan-modal__status">
          <span class="action-chip">${options.filter((entry) => entry.payable).length} payable target${options.filter((entry) => entry.payable).length === 1 ? "" : "s"}</span>
          <span class="action-chip">${options.length} legal target${options.length === 1 ? "" : "s"}</span>
        </div>
        <div class="mulligan-modal__actions">
          <button class="ghost" data-action="equip-back">Back</button>
          <button class="ghost" data-action="equip-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  elements.equipOverlay.classList.remove("hidden");
  elements.equipOverlay.setAttribute("aria-hidden", "false");
}

function renderEquipTargetCard(player, equipment, option) {
  const located = findCardInstance(player.key, option.uid);
  if (!located) {
    return "";
  }

  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  const artMarkup = located.cardData.caminho_imagem
    ? `<img src="../${escapeHtml(located.cardData.caminho_imagem)}" alt="${escapeHtml(located.cardData.nome_exibicao_en)}">`
    : renderProxyFace(located.cardData);

  return `
    <button class="equip-target-card" data-action="equip-select" data-player="${player.key}" data-uid="${located.card.uid}" ${option.payable ? "" : "disabled"}>
      <div class="equip-target-card__art ${located.cardData.caminho_imagem ? "" : "is-proxy"}">
        ${artMarkup}
      </div>
      <div class="equip-target-card__meta">
        <strong>${escapeHtml(located.cardData.nome_exibicao_en)}</strong>
        <span>${escapeHtml(located.cardData.tipo)}${located.cardData.subtipos.length ? ` • ${escapeHtml(located.cardData.subtipos.join(", "))}` : ""}</span>
        <span>${escapeHtml(`${computed.power ?? "-"} / ${computed.resistance ?? "-"}`)}</span>
        <span>${escapeHtml(option.freeEquip ? "Equip Cost: Free" : `Equip Cost: ${option.equipCost}`)}</span>
      </div>
    </button>
  `;
}

function renderZoneBrowserOverlay() {
  if (!elements.zoneBrowserOverlay) {
    return;
  }

  if (!gameState || !zoneBrowserState) {
    elements.zoneBrowserOverlay.innerHTML = "";
    elements.zoneBrowserOverlay.classList.add("hidden");
    elements.zoneBrowserOverlay.setAttribute("aria-hidden", "true");
    return;
  }

  const player = gameState.players[zoneBrowserState.playerKey];
  const sourceLabel = zoneBrowserState.zone === "deck" ? "Library" : zoneLabel(zoneBrowserState.zone);
  const cards = zoneBrowserState.entries
    .map((uid) => findCardInstance(zoneBrowserState.playerKey, uid))
    .filter(Boolean);
  const selectedUid = zoneBrowserState.selectedUid;
  const selectedCard = selectedUid ? findCardInstance(zoneBrowserState.playerKey, selectedUid) : null;

  elements.zoneBrowserOverlay.innerHTML = `
    <div class="zone-browser-modal">
      <div class="zone-browser-modal__header">
        <div>
          <p class="eyebrow">${escapeHtml(sourceLabel)}</p>
          <h2>${escapeHtml(zoneBrowserState.title)}</h2>
          <p class="mulligan-modal__copy">${escapeHtml(zoneBrowserState.prompt)}</p>
        </div>
        ${
          zoneBrowserState.allowCancel === false
            ? '<span class="action-chip">Choose a legal card</span>'
            : '<button class="ghost" data-action="zone-browser-cancel">Cancel</button>'
        }
      </div>
      <div class="zone-browser-modal__status">
        <span class="action-chip">${escapeHtml(player.label)}</span>
        <span class="action-chip">${cards.length} option${cards.length === 1 ? "" : "s"}</span>
        <span class="action-chip">${selectedCard ? `Selected: ${escapeHtml(selectedCard.cardData.nome_exibicao_en)}` : "Select one card"}</span>
      </div>
      <div class="zone-browser-modal__cards">
        ${
          cards.length
            ? cards.map((located) => renderZoneBrowserCard(zoneBrowserState.playerKey, located, selectedUid)).join("")
            : '<div class="empty-zone zone-browser-empty">No matching cards found.</div>'
        }
      </div>
      <div class="zone-browser-modal__footer">
        ${
          zoneBrowserState.allowCancel === false
            ? ""
            : '<button class="ghost" data-action="zone-browser-cancel">Cancel</button>'
        }
        <button class="primary" data-action="zone-browser-confirm" ${selectedUid ? "" : "disabled"}>OK</button>
      </div>
    </div>
  `;

  elements.zoneBrowserOverlay.classList.remove("hidden");
  elements.zoneBrowserOverlay.setAttribute("aria-hidden", "false");
}

function renderZoneBrowserCard(playerKey, located, selectedUid = null) {
  const card = located.cardData;
  const artMarkup = card.caminho_imagem
    ? `<img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(card.nome_exibicao_en)}">`
    : renderProxyFace(card);
  const rules = getCardRulesLines(card).slice(0, 2);
  const isSelected = selectedUid === located.card.uid;

  return `
    <button class="zone-browser-card ${isSelected ? "is-selected" : ""}" data-action="zone-browser-select" data-player="${playerKey}" data-uid="${located.card.uid}">
      <div class="zone-browser-card__art ${card.caminho_imagem ? "" : "is-proxy"}">${artMarkup}</div>
      <div class="zone-browser-card__meta">
        <strong>${escapeHtml(card.nome_exibicao_en)}</strong>
        <span>${escapeHtml(card.tipo)}${card.subtipos.length ? ` • ${escapeHtml(card.subtipos.join(", "))}` : ""}</span>
        ${
          rules.length
            ? `<p>${escapeHtml(rules.join(" ")).slice(0, 180)}</p>`
            : '<p>No rules text.</p>'
        }
      </div>
    </button>
  `;
}

function renderCombatToast() {
  if (!elements.combatToast) {
    return;
  }

  if (!combatToastState?.message) {
    elements.combatToast.innerHTML = "";
    elements.combatToast.classList.add("hidden");
    elements.combatToast.setAttribute("aria-hidden", "true");
    return;
  }

  elements.combatToast.innerHTML = `<div class="combat-toast__label">${escapeHtml(combatToastState.message)}</div>`;
  elements.combatToast.classList.remove("hidden");
  elements.combatToast.setAttribute("aria-hidden", "false");
}

function showCombatToast(message) {
  combatToastState = { message };
  renderCombatToast();
  window.clearTimeout(showCombatToast.timeoutId);
  showCombatToast.timeoutId = window.setTimeout(() => {
    combatToastState = null;
    renderCombatToast();
  }, 1600);
}

function renderVictoryOverlay() {
  if (!elements.victoryOverlay) {
    return;
  }

  if (!gameState?.victory) {
    hideFloatingPanel(elements.victoryOverlay);
    return;
  }

  const winner = gameState.players[gameState.victory.winnerKey];
  const loser = gameState.players[gameState.victory.loserKey];
  const reasonCopy = gameState.victory.reason === "deckout"
    ? `${loser.label} tried to draw from an empty Deck.`
    : `${loser.label}'s God reached 0 Soul.`;

  elements.victoryOverlay.innerHTML = `
    <div class="victory-overlay__content">
      <img class="brand-logo brand-logo--victory" src="${LOGO_SRC}" alt="Saint Seiya TCG">
      <p class="victory-overlay__eyebrow">Game Over</p>
      <h1 class="victory-overlay__title">${escapeHtml(gameState.victory.message)}</h1>
      <p class="victory-overlay__subtitle">${escapeHtml(winner.label)} wins the duel.</p>
      <p class="victory-overlay__reason">${escapeHtml(reasonCopy)}</p>
    </div>
  `;
  showFloatingPanel(elements.victoryOverlay);
}

function renderMulliganCard(instance, selected) {
  const card = getCard(instance.cardId);
  const artMarkup = card.caminho_imagem
    ? `<img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(card.nome_exibicao_en)}">`
    : renderProxyFace(card);

  return `
    <button class="mulligan-card ${selected ? "is-selected" : ""}" data-action="mulligan-toggle" data-uid="${instance.uid}">
      <div class="mulligan-card__art ${card.caminho_imagem ? "" : "is-proxy"}">
        ${artMarkup}
      </div>
      <div class="mulligan-card__meta">
        <strong>${escapeHtml(card.nome_exibicao_en)}</strong>
        <span>${escapeHtml(card.tipo)}${card.custo !== null ? ` • Cost ${escapeHtml(String(card.custo))}` : ""}</span>
      </div>
    </button>
  `;
}

function renderFloatingPreview() {
  if (!elements.hoverPreview) {
    return;
  }

  if (!gameState || !hoverPreview) {
    hideFloatingPanel(elements.hoverPreview);
    return;
  }

  const preview = resolvePreviewTarget(hoverPreview);
  if (!preview) {
    hideFloatingPanel(elements.hoverPreview);
    return;
  }

  elements.hoverPreview.innerHTML = renderFloatingPreviewMarkup(preview);
  showFloatingPanel(elements.hoverPreview);
  positionFloatingPreview(preview.descriptor);
}

function renderFloatingInfo() {
  if (!elements.floatingInfo) {
    return;
  }

  if (!gameState || !floatingInfoState) {
    hideFloatingPanel(elements.floatingInfo);
    return;
  }

  const preview = resolvePreviewTarget(floatingInfoState);
  if (!preview) {
    hideFloatingPanel(elements.floatingInfo);
    floatingInfoState = null;
    return;
  }

  elements.floatingInfo.innerHTML = renderFloatingInfoMarkup(preview);
  showFloatingPanel(elements.floatingInfo);
  positionFloatingInfo(preview.descriptor);
}

function renderFloatingPreviewMarkup(preview) {
  const typeLine = buildCardTypeLine(preview.card);
  const detailChips = renderFloatingPreviewChips(preview);
  const notesMarkup = preview.computed?.activeNotes?.length
    ? `
      <div class="floating-card-preview__section">
        <div class="floating-card-preview__section-label">Active Notes</div>
        <div class="floating-card-preview__tag-cloud floating-card-preview__tag-cloud--notes">
          ${preview.computed.activeNotes.map((note) => `<span class="floating-card-preview__tag floating-card-preview__tag--note">${escapeHtml(note)}</span>`).join("")}
        </div>
      </div>
    `
    : "";
  return `
    <div class="floating-card-preview__layout ${preview.card.caminho_imagem ? "" : "floating-card-preview__layout--text-only"}">
      ${
        preview.card.caminho_imagem
          ? `
            <div class="floating-card-preview__art">
              <img src="../${escapeHtml(preview.card.caminho_imagem)}" alt="${escapeHtml(preview.card.nome_exibicao_en)}">
            </div>
          `
          : `
            <div class="floating-card-preview__art floating-card-preview__art--fallback">
              <div class="floating-card-preview__fallback-copy">
                <span>Saint Seiya TCG</span>
                <strong>${escapeHtml(preview.card.nome_exibicao_en)}</strong>
              </div>
            </div>
          `
      }
      <div class="floating-card-preview__info">
        <div class="floating-card-preview__header">
          <p class="floating-card-preview__eyebrow">GET INFO</p>
          <h3 class="floating-card-preview__title">${escapeHtml(preview.card.nome_exibicao_en)}</h3>
          <p class="floating-card-preview__meta">${escapeHtml(typeLine)}</p>
        </div>
        <div class="floating-card-preview__section">
          <div class="floating-card-preview__section-label">Card Data</div>
          <div class="floating-card-preview__tag-cloud">
            ${detailChips}
          </div>
        </div>
        ${notesMarkup}
        <div class="floating-card-preview__section">
          <div class="floating-card-preview__section-label">Rules</div>
          ${renderRules(preview.card)}
        </div>
      </div>
    </div>
  `;
}

function renderFloatingPreviewChips(preview) {
  return collectFloatingInfoDetails(preview)
    .map(
      ([label, value]) => `
        <span class="floating-card-preview__tag">
          <span class="floating-card-preview__tag-label">${escapeHtml(label)}</span>
          <span class="floating-card-preview__tag-value">${escapeHtml(String(value))}</span>
        </span>
      `
    )
    .join("");
}

function renderFloatingInfoMarkup(preview) {
  const typeLine = buildCardTypeLine(preview.card);
  return `
    <div class="floating-info__header">
      <div class="floating-info__header-copy">
        <h3 class="floating-info__title">${escapeHtml(preview.card.nome_exibicao_en)}</h3>
        <p class="floating-info__meta">${escapeHtml(typeLine)}</p>
      </div>
      <button class="floating-info__close" data-action="close-full-info" aria-label="Close full info">×</button>
    </div>
    <div class="floating-info__body">
      <div class="floating-info__section">
        <div class="floating-info__section-label">Card Data</div>
        <div class="floating-info__tag-cloud">
          ${renderFloatingInfoChips(preview)}
        </div>
      </div>
      ${
        preview.computed?.activeNotes?.length
          ? `<div class="floating-info__section">
              <div class="floating-info__section-label">Active Notes</div>
              <div class="floating-info__notes">${preview.computed.activeNotes
                .map((note) => `<span class="token">${escapeHtml(note)}</span>`)
                .join("")}</div>
            </div>`
          : ""
      }
      <div class="floating-info__section">
        <div class="floating-info__section-label">Rules</div>
        ${renderRules(preview.card)}
      </div>
    </div>
  `;
}

function collectFloatingInfoDetails(preview) {
  const details = [];
  const { card, computed } = preview;

  if (card.custo !== null) {
    details.push(["Cost", formatValue(card.custo, card.unidade_custo)]);
  }
  if ((computed?.power ?? card.power) !== null) {
    details.push(["Power", computed?.power ?? card.power]);
  }
  if ((computed?.resistance ?? card.resistance) !== null) {
    details.push(["Resistance", computed?.resistance ?? card.resistance]);
  }
  if (card.equipar_custo !== null) {
    details.push(["Equip", card.equipar_custo]);
  }
  if (card.damage_cloth !== null) {
    details.push(["Damage", card.damage_cloth]);
  }

  return details;
}

function buildCardTypeLine(card) {
  const parts = [card.tipo];
  if (card.subtipos?.length) {
    parts.push(...card.subtipos);
  }
  if (card.faccao) {
    parts.push(card.faccao);
  }
  return parts.filter(Boolean).join(" - ");
}

function renderFloatingInfoChips(preview) {
  return collectFloatingInfoDetails(preview)
    .map(
      ([label, value]) => `
        <span class="floating-info__chip">
          <span class="floating-info__chip-label">${escapeHtml(label)}</span>
          <span class="floating-info__chip-value">${escapeHtml(String(value))}</span>
        </span>
      `
    )
    .join("");
}

function renderInfoBadges(preview) {
  return collectInfoBadgeValues(preview)
    .map((badge) => `<span class="badge stat">${escapeHtml(badge)}</span>`)
    .join("");
}

function collectInfoBadgeValues(preview) {
  const badges = [];
  const { card, instance, computed } = preview;

  if (card.custo !== null) badges.push(`Cost ${formatValue(card.custo, card.unidade_custo)}`);
  if ((computed?.power ?? card.power) !== null) badges.push(`Power ${computed?.power ?? card.power}`);
  if ((computed?.resistance ?? card.resistance) !== null) badges.push(`Resistance ${computed?.resistance ?? card.resistance}`);
  if (card.equipar_custo !== null) badges.push(`Equip ${card.equipar_custo}`);
  if (card.damage_cloth !== null) badges.push(`Damage ${card.damage_cloth}`);
  if (card.soul !== null || instance?.soul !== undefined) badges.push(`Soul ${instance?.soul ?? card.soul}`);
  if (card.attack !== null || instance?.attack !== undefined) badges.push(`Attack ${instance?.attack ?? card.attack}`);
  if (card.awaken !== null || instance?.awaken !== undefined) badges.push(`Awaken ${instance?.awaken ?? card.awaken}`);
  if (instance?.plusOneCounters) badges.push(`+1/+1 x${instance.plusOneCounters}`);
  if (instance?.sealCounters) badges.push(`⛓ x${instance.sealCounters}`);
  if (instance?.damageCounters) badges.push(`Damage x${instance.damageCounters}`);
  if (instance?.tapped) badges.push("Tapped");
  if (instance?.summoningSick) badges.push("Summoning Sickness");
  if (instance?.awakened) badges.push("Awakened");
  if (preview.kind === "domain" && instance?.used) badges.push("Used Once");
  if (card.status === "design-ready") badges.push("Proxy");

  return badges;
}

function resolvePreviewTarget(descriptor) {
  if (!gameState || !descriptor) {
    return null;
  }

  const player = gameState.players[descriptor.playerKey];
  if (!player) {
    return null;
  }

  if (descriptor.kind === "god") {
    const card = getCard(player.god.cardId);
    return {
      descriptor,
      kind: "god",
      player,
      card,
      instance: player.god,
      zone: "god",
      ownerLabel: `${player.label} - God`,
      computed: null
    };
  }

  if (descriptor.kind === "domain") {
    const card = getCard(player.domainId);
    return {
      descriptor,
      kind: "domain",
      player,
      card,
      instance: { cardId: card.id, used: player.domainUsed },
      zone: "domain",
      ownerLabel: `${player.label} - Domain`,
      computed: null
    };
  }

  if (descriptor.kind === "card") {
    const located = findCardInstance(descriptor.playerKey, descriptor.uid);
    if (!located) {
      return null;
    }

    return {
      descriptor,
      kind: "card",
      player,
      card: located.cardData,
      instance: located.card,
      zone: located.zone,
      ownerLabel: `${player.label} - ${zoneLabel(located.zone)}`,
      computed: getComputedStats(player, located.card, located.cardData, located.zone)
    };
  }

  return null;
}

function positionFloatingPreview(descriptor) {
  positionFloatingPanel(elements.hoverPreview, descriptor, 18);
}

function positionFloatingInfo(descriptor) {
  positionFloatingPanel(elements.floatingInfo, descriptor, 24, floatingInfoState, { mode: "browser-top-left" });
}

function positionFloatingPanel(panel, descriptor, gap = 18, explicitState = null, options = {}) {
  if (!panel) {
    return;
  }

  const rect = panel.getBoundingClientRect();
  const { mode = "anchored" } = options;
  const padding = mode === "browser-top-left" || mode === "browser-top-right" ? 3 : 18;
  let left = padding;
  let top = padding;

  if (mode === "browser-top-left") {
    left = 3;
    top = 3;
  } else if (mode === "browser-top-right") {
    left = window.innerWidth - rect.width - 3;
    top = 3;
  } else if (mode === "stage-left") {
    const stageRect = elements.stage?.getBoundingClientRect();
    if (stageRect) {
      left = Math.max(padding, stageRect.left + 24);
      top = stageRect.top + stageRect.height / 2 - rect.height / 2;
    }
  } else if (mode === "stage-center") {
    const stageRect = elements.stage?.getBoundingClientRect();
    if (stageRect) {
      left = stageRect.left + stageRect.width / 2 - rect.width / 2;
      top = stageRect.top + stageRect.height / 2 - rect.height / 2;
    }
  } else if (explicitState?.x || explicitState?.y) {
    left = explicitState.x + gap;
    top = explicitState.y - rect.height * 0.16;
  } else {
    const origin = getPreviewOriginElement(descriptor);
    if (origin) {
      const originRect = origin.getBoundingClientRect();
      const fitsRight = originRect.right + gap + rect.width <= window.innerWidth - padding;
      left = fitsRight ? originRect.right + gap : originRect.left - rect.width - gap;
      top = originRect.top + originRect.height / 2 - rect.height / 2;
    }
  }

  const maxLeft = window.innerWidth - rect.width - padding;
  const maxTop = window.innerHeight - rect.height - padding;
  panel.style.left = `${Math.max(padding, Math.min(left, maxLeft))}px`;
  panel.style.top = `${Math.max(padding, Math.min(top, maxTop))}px`;
}

function toggleLogPopup() {
  logPopupOpen = !logPopupOpen;
}

function closeLogPopup() {
  if (!logPopupOpen) {
    return;
  }

  logPopupOpen = false;
}

function renderLogPopup() {
  if (!elements.logPopup) {
    return;
  }

  if (!logPopupOpen) {
    hideFloatingPanel(elements.logPopup);
    return;
  }

  elements.logPopup.innerHTML = `
    <div class="log-popup__header">
      <div class="log-popup__title-wrap">
        <span class="log-popup__eyebrow">Log</span>
        <strong class="log-popup__title">Match Feed</strong>
      </div>
      <button class="log-popup__close" data-action="close-log-popup" aria-label="Close log">×</button>
    </div>
    <div class="log-popup__body">
      ${renderLogMarkup()}
    </div>
  `;
  showFloatingPanel(elements.logPopup);
  elements.logPopup.style.left = "3px";
  elements.logPopup.style.top = "3px";
}

function getPreviewOriginElement(descriptor) {
  if (!descriptor) {
    return null;
  }

  if (descriptor.kind === "card") {
    return document.querySelector(`[data-card-uid="${descriptor.uid}"][data-player="${descriptor.playerKey}"]`);
  }

  return document.querySelector(`[data-inspect-kind="${descriptor.kind}"][data-player="${descriptor.playerKey}"]`);
}

function openFloatingInfo(descriptor) {
  floatingInfoState = descriptor;
}

function closeFloatingInfo() {
  if (!floatingInfoState) {
    return;
  }

  floatingInfoState = null;
  renderFloatingInfo();
}

function showFloatingPanel(panel) {
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

function hideFloatingPanel(panel) {
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = "";
}

function renderContextMenu() {
  if (!elements.contextMenu) {
    return;
  }

  if (!contextMenuState || !gameState) {
    elements.contextMenu.innerHTML = "";
    elements.contextMenu.classList.add("hidden");
    elements.contextMenu.setAttribute("aria-hidden", "true");
    return;
  }

  if (contextMenuState.kind === "god") {
    renderGodContextMenuMarkup(contextMenuState.playerKey);
    return;
  }

  if (contextMenuState.kind === "domain") {
    renderDomainContextMenuMarkup(contextMenuState.playerKey);
    return;
  }

  const located = findCardInstance(contextMenuState.playerKey, contextMenuState.uid);
  if (!located) {
    contextMenuState = null;
    renderContextMenu();
    return;
  }

  const player = gameState.players[contextMenuState.playerKey];
  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  const infoActions = [
    renderContextMenuAction("Full Info", {
      action: "open-full-info",
      player: player.key,
      uid: located.card.uid,
      kind: "card",
      x: String(contextMenuState.x),
      y: String(contextMenuState.y)
    })
  ].join("");
  const textActions = getCardContextMenuTextActions(player, located)
    .map((entry) => renderContextMenuAction(entry.label, entry.payload))
    .join("");
  const extraActions = [];

  if (located.zone === "battlefield" || located.zone === "cosmo_base") {
    extraActions.push(
      renderContextMenuAction(located.card.tapped ? "Untap" : "Tap", {
        action: "toggle-tap",
        player: player.key,
        uid: located.card.uid
      })
    );
  }

  if (located.zone === "battlefield" && isDevoteeCard(located.cardId) && player.key === gameState.currentPlayer && gameState.currentPhase === "main" && !isPriorityWindowOpen()) {
    extraActions.push(
      renderContextMenuAction("Attack", {
        action: "attack",
        player: player.key,
        uid: located.card.uid
      })
    );
  }

  elements.contextMenu.innerHTML = `
    <div class="context-menu__header">
      <h3 class="context-menu__title">${escapeHtml(located.cardData.nome_exibicao_en)}</h3>
      <p class="context-menu__meta">${escapeHtml(player.label)} • ${escapeHtml(zoneLabel(located.zone))}</p>
      <div class="context-menu__stats">
        ${(computed.power !== null || computed.resistance !== null) ? `<span>${escapeHtml(`${computed.power ?? "-"} / ${computed.resistance ?? "-"}`)}</span>` : ""}
        ${located.card.tapped ? "<span>Tapped</span>" : ""}
      </div>
    </div>
    <div class="context-menu__section"><div class="context-menu__label">Info</div>${infoActions}</div>
    ${
      textActions
        ? `<div class="context-menu__section"><div class="context-menu__label">Card Text</div>${textActions}</div>`
        : ""
    }
    ${
      extraActions.length
        ? `<div class="context-menu__section"><div class="context-menu__label">Extras</div>${extraActions.join("")}</div>`
        : ""
    }
  `;

  elements.contextMenu.classList.remove("hidden");
  elements.contextMenu.setAttribute("aria-hidden", "false");
  positionContextMenu();
}

function renderContextMenuAction(label, payload) {
  const disabled = Boolean(payload.disabled);
  const attributes = Object.entries(payload)
    .filter(([key]) => key !== "disabled")
    .map(([key, value]) => `data-${camelToKebab(key)}="${escapeHtml(value)}"`)
    .join(" ");
  return `<button class="context-menu__item" ${attributes} ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
}

function renderGodContextMenuMarkup(playerKey) {
  const player = gameState.players[playerKey];
  const godCard = getCard(player.god.cardId);
  const availableCosmo = getAvailableCosmo(player);
  const canUsePrayer = availableCosmo >= 5;
  const canUseSave = player.god.awakened && availableCosmo >= 5;

  const abilityActions = [
    renderContextMenuAction("Full Info", {
      action: "open-full-info",
      player: player.key,
      kind: "god",
      x: String(contextMenuState?.x || 0),
      y: String(contextMenuState?.y || 0)
    }),
    renderContextMenuAction("Athena's Prayer — Cost: 5 Cosmo", {
      action: "god-ability",
      player: player.key,
      ability: "prayer",
      disabled: !canUsePrayer
    }),
    renderContextMenuAction("Awaken Ability — Cost: 5 Cosmo", {
      action: "god-ability",
      player: player.key,
      ability: "awaken-save",
      disabled: !canUseSave
    }),
    renderContextMenuAction("Ultimate — Athena Exclamation — Cost: 15 Cosmo", {
      action: "god-ability",
      player: player.key,
      ability: "ultimate",
      disabled: availableCosmo < 15
    })
  ].join("");

  elements.contextMenu.innerHTML = `
    <div class="context-menu__header">
      <h3 class="context-menu__title">${escapeHtml(godCard.nome_exibicao_en)}</h3>
      <p class="context-menu__meta">${escapeHtml(player.label)} • God</p>
      <div class="context-menu__stats">
        <span>Soul ${player.god.soul}</span>
        <span>Attack ${player.god.attack}</span>
        <span>Cosmo ${availableCosmo}</span>
        ${player.god.awakened ? "<span>Awakened</span>" : ""}
      </div>
    </div>
    <div class="context-menu__section">
      <div class="context-menu__label">Actions</div>
      ${abilityActions}
    </div>
  `;

  elements.contextMenu.classList.remove("hidden");
  elements.contextMenu.setAttribute("aria-hidden", "false");
  positionContextMenu();
}

function renderDomainContextMenuMarkup(playerKey) {
  const player = gameState.players[playerKey];
  const domain = getCard(player.domainId);
  const domainActions = [];

  if (player.domainId === COLISEUM_DOMAIN_ID) {
    domainActions.push(
      renderContextMenuAction("Coliseum Burst — +1/+0 and Pierce", {
        action: "domain-ability",
        player: player.key,
        ability: "coliseum-burst",
        disabled: player.domainUsed || !(canPlayerActNow(player.key) || canPlayerUsePriorityActions(player.key))
      })
    );
  }

  elements.contextMenu.innerHTML = `
    <div class="context-menu__header">
      <h3 class="context-menu__title">${escapeHtml(domain.nome_exibicao_en)}</h3>
      <p class="context-menu__meta">${escapeHtml(player.label)} • Domain</p>
      <div class="context-menu__stats">
        <span>${escapeHtml(domain.raridade)}</span>
        ${player.domainId === COLISEUM_DOMAIN_ID ? `<span>${escapeHtml(player.domainUsed ? "Used" : "Ready")}</span>` : ""}
      </div>
    </div>
    <div class="context-menu__section">
      <div class="context-menu__label">Info</div>
      ${renderContextMenuAction("Full Info", {
        action: "open-full-info",
        player: player.key,
        kind: "domain",
        x: String(contextMenuState?.x || 0),
        y: String(contextMenuState?.y || 0)
      })}
    </div>
    ${
      domainActions.length
        ? `<div class="context-menu__section"><div class="context-menu__label">Actions</div>${domainActions.join("")}</div>`
        : ""
    }
    <div class="context-menu__section">
      <div class="context-menu__label">Card Text</div>
      <div class="context-menu__item context-menu__item--static">${escapeHtml(domain.habilidades_en?.[0] || "No activatable abilities.")}</div>
    </div>
  `;

  elements.contextMenu.classList.remove("hidden");
  elements.contextMenu.setAttribute("aria-hidden", "false");
  positionContextMenu();
}

function positionContextMenu() {
  if (!contextMenuState || !elements.contextMenu) {
    return;
  }

  const padding = 12;
  const menu = elements.contextMenu;
  const rect = menu.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - padding;
  const maxTop = window.innerHeight - rect.height - padding;
  const left = Math.max(padding, Math.min(contextMenuState.x, maxLeft));
  const top = Math.max(padding, Math.min(contextMenuState.y, maxTop));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function renderGodInspector(player) {
  const god = getCard(player.god.cardId);
  const summary = {
    soul: player.god.soul,
    attack: player.god.attack,
    awaken: player.god.awaken,
    awakened: player.god.awakened
  };

  return `
    ${renderInspectorCard(god, summary, `${player.label} - God`)}
    <div class="inspector-actions">
      <h3 class="mini-title">God Actions</h3>
      <p class="inspector-note">Available Cosmo ${getAvailableCosmo(player)} • Untapped Base ${countUntappedBase(player)} • Latent ${player.latentCosmo}</p>
      <div class="action-group">
        <button class="ghost" data-action="toggle-awaken" data-player="${player.key}">${player.god.awakened ? "Awaken On" : "Awaken Off"}</button>
        ${renderGodAbilityButtons(player)}
      </div>
      <div class="action-group">
        <button class="ghost" data-action="player-counter" data-player="${player.key}" data-metric="soul" data-delta="-1">Soul -1</button>
        <button class="ghost" data-action="player-counter" data-player="${player.key}" data-metric="soul" data-delta="1">Soul +1</button>
        <button class="ghost" data-action="player-counter" data-player="${player.key}" data-metric="latent" data-delta="1">Latent +1</button>
        <button class="ghost" data-action="player-counter" data-player="${player.key}" data-metric="latent" data-delta="-1">Latent -1</button>
      </div>
    </div>
  `;
}

function renderGodPreview(player) {
  const god = getCard(player.god.cardId);
  const summary = {
    soul: player.god.soul,
    attack: player.god.attack,
    awaken: player.god.awaken,
    awakened: player.god.awakened
  };

  return `
    ${renderPreviewModeBanner("Hover Preview")}
    ${renderInspectorCard(god, summary, `${player.label} - God`)}
  `;
}

function renderDomainInspector(player) {
  const domain = getCard(player.domainId);
  const notes = [];

  if (player.domainId === SANCTUARY_DOMAIN_ID) {
    notes.push("Sanctuary is already boosting your battlefield Devotees by +0/+1.");
  }
  if (player.domainId === STAR_HILL_DOMAIN_ID) {
    notes.push("Star Hill is automatically adding 1 Latent Cosmo at the start of your turn.");
  }
  if (player.domainId === COLISEUM_DOMAIN_ID) {
    notes.push("Once per game, Coliseum can give one of your Devotees +1/+0 and Pierce until end of turn.");
    notes.push(player.domainUsed ? "Coliseum has already been consumed this game." : "Coliseum is still ready to use.");
  }

  return `
    ${renderInspectorCard(domain, {}, `${player.label} - Domain`)}
    <div class="inspector-actions">
      <h3 class="mini-title">Domain Notes</h3>
      <ul class="rules-list">
        ${notes.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderDomainPreview(player) {
  const domain = getCard(player.domainId);
  return `
    ${renderPreviewModeBanner("Hover Preview")}
    ${renderInspectorCard(domain, {}, `${player.label} - Domain`)}
  `;
}

function renderCardInspector(player, located) {
  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  const card = located.cardData;
  const moveButtons = QUICK_MOVE_ORDER
    .filter((zoneId) => zoneId !== located.zone)
    .map(
      (zoneId) =>
        `<button class="ghost" data-action="move-card" data-player="${player.key}" data-uid="${located.card.uid}" data-target-zone="${zoneId}">${escapeHtml(
          moveLabel(zoneId)
        )}</button>`
    )
    .join("");
  const battlefieldDevotee = located.zone === "battlefield" && isDevoteeCard(located.cardId);

  return `
    ${renderPreviewModeBanner("Pinned Preview")}
    ${renderInspectorCard(card, located.card, `${player.label} - ${zoneLabel(located.zone)}`, computed)}
    <div class="inspector-actions">
      <h3 class="mini-title">Card Actions</h3>
      <p class="inspector-note">Drag and drop works on the board, but you can also use the controls here for precision.</p>
      <div class="action-group">
        ${moveButtons}
      </div>
      <div class="action-group">
        <button class="ghost" data-action="toggle-tap" data-player="${player.key}" data-uid="${located.card.uid}">${located.card.tapped ? "Untap" : "Tap"}</button>
        ${battlefieldDevotee ? `<button class="ghost" data-action="attack" data-player="${player.key}" data-uid="${located.card.uid}">Attack</button>` : ""}
        ${battlefieldDevotee ? `<button class="ghost" data-action="survived-combat" data-player="${player.key}" data-uid="${located.card.uid}">Survived Combat</button>` : ""}
      </div>
      <div class="action-group">
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="plusOneCounters" data-delta="-1">-1/+1</button>
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="plusOneCounters" data-delta="1">+1/+1</button>
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="sealCounters" data-delta="-1">-Seal</button>
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="sealCounters" data-delta="1">+Seal</button>
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="damageCounters" data-delta="-1">-Damage</button>
        <button class="ghost" data-action="card-counter" data-player="${player.key}" data-uid="${located.card.uid}" data-counter="damageCounters" data-delta="1">+Damage</button>
      </div>
    </div>
  `;
}

function renderCardPreview(player, located) {
  const computed = getComputedStats(player, located.card, located.cardData, located.zone);
  return `
    ${renderPreviewModeBanner("Hover Preview")}
    ${renderInspectorCard(located.cardData, located.card, `${player.label} - ${zoneLabel(located.zone)}`, computed)}
    <p class="inspector-note">Left-click pins this card. Right-click opens its action menu.</p>
  `;
}

function renderInspectorCard(card, instanceOrState, ownerLabel, computed = null) {
  const extraBadges = [];

  if (card.custo !== null) extraBadges.push(`Cost ${formatValue(card.custo, card.unidade_custo)}`);
  if ((computed?.power ?? card.power) !== null) extraBadges.push(`Power ${computed?.power ?? card.power}`);
  if ((computed?.resistance ?? card.resistance) !== null) extraBadges.push(`Resistance ${computed?.resistance ?? card.resistance}`);
  if (card.soul !== null || instanceOrState.soul !== undefined) extraBadges.push(`Soul ${instanceOrState.soul ?? card.soul}`);
  if (card.attack !== null || instanceOrState.attack !== undefined) extraBadges.push(`Attack ${instanceOrState.attack ?? card.attack}`);
  if (card.awaken !== null || instanceOrState.awaken !== undefined) extraBadges.push(`Awaken ${instanceOrState.awaken ?? card.awaken}`);
  if (instanceOrState.plusOneCounters) extraBadges.push(`+1/+1 x${instanceOrState.plusOneCounters}`);
  if (instanceOrState.sealCounters) extraBadges.push(`⛓ x${instanceOrState.sealCounters}`);
  if (instanceOrState.damageCounters) extraBadges.push(`Damage x${instanceOrState.damageCounters}`);
  if (instanceOrState.tapped) extraBadges.push("Tapped");
  if (instanceOrState.awakened) extraBadges.push("Awakened");

  return `
    <div class="inspector-card ${card.caminho_imagem ? "" : "inspector-card--text-only"}">
      ${
        card.caminho_imagem
          ? `<div class="card-art"><img src="../${escapeHtml(card.caminho_imagem)}" alt="${escapeHtml(card.nome_exibicao_en)}"></div>`
          : ""
      }
      <div>
        <h3 class="card-title">${escapeHtml(card.nome_exibicao_en)}</h3>
        <p class="card-meta">${escapeHtml(card.tipo)}${card.subtipos.length ? ` - ${escapeHtml(card.subtipos.join(", "))}` : ""}</p>
        <p class="card-meta">${escapeHtml(ownerLabel)}</p>
        <div class="card-badges">
          ${extraBadges.map((badge) => `<span class="badge stat">${escapeHtml(badge)}</span>`).join("")}
          ${card.status === "design-ready" ? '<span class="badge proxy">Proxy</span>' : ""}
        </div>
      </div>
      ${
        computed?.activeNotes?.length
          ? `<div class="effect-strip">${computed.activeNotes.map((note) => `<span class="token">${escapeHtml(note)}</span>`).join("")}</div>`
          : ""
      }
      ${renderRules(card)}
    </div>
  `;
}

function renderRules(card) {
  const lines = getCardRulesLines(card);

  if (lines.length === 0) {
    return '<div class="empty-zone">No rules text.</div>';
  }

  return `<ul class="rules-list">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

function renderPreviewModeBanner(label) {
  return `<div class="preview-banner">${escapeHtml(label)}</div>`;
}

function getCardRulesLines(card) {
  const lines = [];
  if (card.keywords_en?.length) {
    lines.push(`Keywords: ${card.keywords_en.join(", ")}`);
  }
  if (card.habilidades_en?.length) {
    lines.push(...card.habilidades_en);
  }
  if (card.habilidade_awaken_en) {
    lines.push(card.habilidade_awaken_en);
  }
  if (card.ultimate_en) {
    lines.push(card.ultimate_en);
  }
  return lines;
}

function renderLog() {
  renderDockTabContent();
}

function renderLogMarkup() {
  if (!gameState || gameState.log.length === 0) {
    return '<div class="log-item">Actions will appear here after the match starts.</div>';
  }

  return gameState.log
    .slice(-5)
    .reverse()
    .map((entry) => `<div class="log-item">${escapeHtml(entry)}</div>`)
    .join("");
}

function addLog(message) {
  if (!gameState) {
    return;
  }
  gameState.log.push(message);
}

function getCard(cardId) {
  return cardsById[cardId];
}

function getPreviewDescriptor(element) {
  if (element.dataset.cardUid) {
    return {
      kind: "card",
      playerKey: element.dataset.player,
      uid: element.dataset.cardUid
    };
  }

  return {
    kind: element.dataset.inspectKind,
    playerKey: element.dataset.player
  };
}

function samePreviewState(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.kind === right.kind && left.playerKey === right.playerKey && left.uid === right.uid;
}

function getCardSnippet(card) {
  if (card.keywords_en?.length) {
    return `Keywords: ${card.keywords_en.join(", ")}`;
  }
  if (card.habilidades_en?.length) {
    return card.habilidades_en[0];
  }
  if (card.habilidade_awaken_en) {
    return card.habilidade_awaken_en;
  }
  if (card.ultimate_en) {
    return card.ultimate_en;
  }
  return "No rules text.";
}

function isEquipCard(cardId) {
  const card = getCard(cardId);
  return isRelicCard(cardId) && typeof card.equipar_custo === "number";
}

function getAttachedEquipment(player, devoteeUid) {
  if (!player || !devoteeUid) {
    return [];
  }

  return player.zones.battlefield
    .filter((instance) => instance.attachedToUid === devoteeUid && isRelicCard(instance.cardId))
    .map((instance) => ({
      instance,
      cardData: getCard(instance.cardId)
    }));
}

function hasAttachedCardByName(player, devoteeUid, cardName) {
  return getAttachedEquipment(player, devoteeUid).some(({ cardData, instance }) => {
    if (isClothCard(cardData.id) && instance.damageCounters > 0) {
      return false;
    }
    return cardData.nome_exibicao_en === cardName;
  });
}

function detachEquipmentFromDevotee(playerKey, devoteeUid) {
  const player = gameState.players[playerKey];
  if (!player) {
    return;
  }

  player.zones.battlefield.forEach((instance) => {
    if (instance.attachedToUid !== devoteeUid || !isRelicCard(instance.cardId)) {
      return;
    }

    const cardData = getCard(instance.cardId);
    instance.attachedToUid = null;
    if (isClothCard(instance.cardId) && typeof cardData.damage_cloth === "number" && cardData.damage_cloth > 0) {
      instance.damageCounters += cardData.damage_cloth;
      addLog(`${cardData.nome_exibicao_en} gains ${cardData.damage_cloth} Cloth Damage because its bearer was destroyed.`);
    } else {
      addLog(`${cardData.nome_exibicao_en} remains on the battlefield after its bearer is destroyed.`);
    }
  });
}

function collectEquipmentKeywords(text, keywords) {
  ["Guardian", "Nimble", "Cheater", "Long Range", "Pierce", "Impulse", "Sealed", "Unfaith"].forEach((keyword) => {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(text)) {
      keywords.add(keyword);
    }
  });
}

function bearerMatchesResonance(bearerName, resonanceName) {
  if (!bearerName || !resonanceName) {
    return false;
  }

  const normalizedBearer = bearerName.toLowerCase();
  const normalizedResonance = resonanceName.toLowerCase();
  return normalizedBearer.includes(normalizedResonance);
}

function applyEquipmentStaticLine(line, effects, cardData) {
  const statMatch = line.match(/([+-]\d+)\/([+-]\d+)/);
  if (statMatch) {
    effects.power += Number(statMatch[1]);
    effects.resistance += Number(statMatch[2]);
  }

  collectEquipmentKeywords(line, effects.keywordSet);

  if (/can block Nimble/i.test(line)) {
    effects.notes.push(`${cardData.nome_exibicao_en}: can block Nimble`);
  }
}

function getRelevantEquipmentLines(cardData, bearerName) {
  const relevant = [];
  let currentResonance = null;

  getCardRulesLines(cardData).forEach((line) => {
    const resonanceMatch = line.match(/^Resonance\s+[—-]\s+(.+)$/i);
    if (resonanceMatch) {
      currentResonance = resonanceMatch[1].trim();
      return;
    }

    if (/^When .* enters the battlefield/i.test(line) || /^You may equip /i.test(line)) {
      return;
    }

    if (currentResonance) {
      if (bearerMatchesResonance(bearerName, currentResonance)) {
        relevant.push({ line, resonance: currentResonance });
      }
      return;
    }

    relevant.push({ line, resonance: null });
  });

  return relevant;
}

function getEquipmentEffectsForDevotee(player, devoteeInstance, devoteeCardData) {
  const effects = {
    power: 0,
    resistance: 0,
    keywords: [],
    notes: [],
    keywordSet: new Set()
  };
  const attachments = getAttachedEquipment(player, devoteeInstance.uid);
  const bearer = devoteeCardData.nome_exibicao_en;

  attachments.forEach(({ instance, cardData }) => {
    if (isClothCard(cardData.id) && instance.damageCounters > 0) {
      effects.notes.push(`${cardData.nome_exibicao_en} is damaged and inactive`);
      return;
    }

    getRelevantEquipmentLines(cardData, bearer).forEach(({ line, resonance }) => {
      if (/^Equipped Devotee (gets|gains)/i.test(line)) {
        applyEquipmentStaticLine(line, effects, cardData);
      } else if (resonance) {
        effects.notes.push(`${cardData.nome_exibicao_en}: ${line}`);
      }
    });
  });

  effects.keywords = [...effects.keywordSet];
  delete effects.keywordSet;
  if (attachments.length) {
    effects.notes.push(`Equipped with ${attachments.map(({ cardData }) => cardData.nome_exibicao_en).join(", ")}`);
  }
  return effects;
}

function getComputedStats(player, instance, cardData, zoneId) {
  const card = cardData || getCard(instance.cardId);
  const activeNotes = [];
  let power = card.power;
  let resistance = card.resistance;

  if (power !== null && instance.plusOneCounters) {
    power += instance.plusOneCounters;
  }

  if (resistance !== null && instance.plusOneCounters) {
    resistance += instance.plusOneCounters;
  }

  if (instance.plusOneCounters) {
    activeNotes.push(`+1/+1 counters x${instance.plusOneCounters}`);
  }

  if (power !== null && instance.minusOneCounters) {
    power -= instance.minusOneCounters;
  }

  if (resistance !== null && instance.minusOneCounters) {
    resistance -= instance.minusOneCounters;
  }

  if (instance.minusOneCounters) {
    activeNotes.push(`-1/-1 counters x${instance.minusOneCounters}`);
  }

  if (zoneId === "battlefield" && isDevoteeCard(card.id || instance.cardId) && player.domainId === SANCTUARY_DOMAIN_ID) {
    if (resistance !== null) {
      resistance += 1;
    }
    activeNotes.push("Sanctuary +0/+1");
  }

  if (
    zoneId === "battlefield" &&
    isDevoteeCard(card.id || instance.cardId) &&
    isAthenaCard(card) &&
    player.god.cardId === ATHENA_GOD_ID &&
    player.god.awakened
  ) {
    if (power !== null) {
      power += 1;
    }
    if (resistance !== null) {
      resistance += 1;
    }
    activeNotes.push("Seventh Sense +1/+1");
  }

  if (zoneId === "battlefield" && isDevoteeCard(card.id || instance.cardId)) {
    const equipmentEffects = getEquipmentEffectsForDevotee(player, instance, card);
    if (power !== null) {
      power += equipmentEffects.power;
    }
    if (resistance !== null) {
      resistance += equipmentEffects.resistance;
    }
    activeNotes.push(...equipmentEffects.notes);
  }

  if (instance.turnPowerBonus || instance.turnResistanceBonus) {
    if (power !== null) {
      power += instance.turnPowerBonus;
    }
    if (resistance !== null) {
      resistance += instance.turnResistanceBonus;
    }
    activeNotes.push(`Temporary ${formatBonus(instance.turnPowerBonus, instance.turnResistanceBonus)}`);
  }

  if (instance.sealCounters) {
    activeNotes.push(`Sealed ⛓ x${instance.sealCounters}`);
  }

  if (instance.sealLocked) {
    activeNotes.push("Seal lock until next Upkeep");
  }

  if (instance.tempKeywords.length) {
    activeNotes.push(`Temporary keywords: ${instance.tempKeywords.join(", ")}`);
  }

  if (instance.preventDamageShield) {
    activeNotes.push(`Prevent next ${instance.preventDamageShield} damage`);
  }

  if (instance.cannotBeDestroyedUntilEnd) {
    activeNotes.push("Cannot be destroyed this turn");
  }

  if (instance.summoningSick) {
    activeNotes.push("Summoning sickness");
  }

  if (instance.sealCounters && zoneId === "battlefield" && isDevoteeCard(card.id || instance.cardId)) {
    const hyogaPrepared = player.zones.battlefield.some((entry) => {
      const entryCard = getCard(entry.cardId);
      return entryCard.nome_exibicao_en === "Hyoga, Cygnus Saint" && !entry.tapped;
    });

    if (hyogaPrepared && power !== null) {
      power -= 1;
      activeNotes.push("Hyoga -1/-0");
    }

    const camusPresent = PLAYER_ORDER.some((playerKey) =>
      gameState.players[playerKey].zones.battlefield.some((entry) => getCard(entry.cardId).nome_exibicao_en === "Camus, Aquarius Gold Saint")
    );

    if (camusPresent) {
      if (power !== null) {
        power -= 1;
      }
      if (resistance !== null) {
        resistance -= 1;
      }
      activeNotes.push("Camus -1/-1");
    }
  }

  if (instance.damageCounters && isClothCard(card.id || instance.cardId)) {
    activeNotes.push(`Cloth damage x${instance.damageCounters}`);
  } else if (instance.damageCounters && isDevoteeCard(card.id || instance.cardId)) {
    if (resistance !== null) {
      resistance -= instance.damageCounters;
    }
    activeNotes.push(`Damage x${instance.damageCounters}`);
  }

  return { power, resistance, activeNotes };
}

function formatBonus(power, resistance) {
  const powerText = power >= 0 ? `+${power}` : `${power}`;
  const resistanceText = resistance >= 0 ? `+${resistance}` : `${resistance}`;
  return `${powerText}/${resistanceText}`;
}

function isClothCard(cardId) {
  const card = getCard(cardId);
  return card.subtipos?.includes("Cloth");
}

function isRelicCard(cardId) {
  const card = getCard(cardId);
  return card.tipo === "Relic";
}

function isDevoteeCard(cardId) {
  const card = getCard(cardId);
  return card.tipo === "Devotee";
}

function isAthenaCard(card) {
  return card.faccao === "Athena";
}

function hasKeyword(card, keyword, instance = null) {
  const baseKeywords = card?.keywords_en || [];
  const tempKeywords = instance?.tempKeywords || [];
  const attachedKeywords =
    instance?.owner && instance?.uid && isDevoteeCard(card?.id || instance.cardId)
      ? getEquipmentEffectsForDevotee(gameState?.players?.[instance.owner], instance, card || getCard(instance.cardId)).keywords
      : [];
  return [...baseKeywords, ...tempKeywords, ...attachedKeywords].some((entry) => entry.toLowerCase() === keyword.toLowerCase());
}

function getCombatAttacker() {
  if (!gameState?.combat?.attacker) {
    return null;
  }

  return findCardInstance(gameState.combat.attacker.playerKey, gameState.combat.attacker.uid);
}

function isSelectionModeActive() {
  return Boolean(gameState?.combat?.mode === "target" || targetingState);
}

function defendingPlayerHasGuardian(playerKey) {
  const player = gameState?.players?.[playerKey];
  if (!player) {
    return false;
  }

  return player.zones.battlefield.some((instance) => {
    const card = getCard(instance.cardId);
    return isDevoteeCard(instance.cardId) && hasKeyword(card, "Guardian", instance);
  });
}

function getForcedGuardianTargets(playerKey) {
  const player = gameState?.players?.[playerKey];
  const attacker = getCombatAttacker();
  if (!player || !attacker || hasKeyword(attacker.cardData, "Cheater")) {
    return [];
  }

  return player.zones.battlefield.filter((instance) => {
    const card = getCard(instance.cardId);
    return isDevoteeCard(instance.cardId) && hasKeyword(card, "Guardian", instance);
  });
}

function isForcedGuardianTarget(playerKey, zoneId, instance, cardData) {
  const attacker = getCombatAttacker();
  if (!attacker || gameState?.combat?.mode !== "target") {
    return false;
  }

  if (playerKey === attacker.card.owner || zoneId !== "battlefield" || !isDevoteeCard(cardData.id || instance.cardId)) {
    return false;
  }

  const forcedGuardians = getForcedGuardianTargets(playerKey);
  if (!forcedGuardians.length) {
    return false;
  }

  return forcedGuardians.some((entry) => entry.uid === instance.uid);
}

function isAttackableGodTarget(playerKey) {
  const attacker = getCombatAttacker();
  if (!attacker || gameState.combat.mode !== "target") {
    return false;
  }

  return isAttackableGodTargetForAttacker(attacker, playerKey);
}

function isAttackableCardTarget(playerKey, zoneId, instance, cardData) {
  const attacker = getCombatAttacker();
  if (!attacker || gameState?.combat?.mode !== "target") {
    return false;
  }

  return isAttackableCardTargetForAttacker(attacker, playerKey, zoneId, instance, cardData);
}

function isAttackableGodTargetForAttacker(attacker, playerKey) {
  if (!attacker || attacker.card.owner === playerKey) {
    return false;
  }

  if (defendingPlayerHasGuardian(playerKey) && !hasKeyword(attacker.cardData, "Cheater")) {
    return false;
  }

  return true;
}

function isAttackableCardTargetForAttacker(attacker, playerKey, zoneId, instance, cardData) {
  if (!attacker) {
    return false;
  }

  if (zoneId !== "battlefield" || playerKey === attacker.card.owner || !isDevoteeCard(cardData.id || instance.cardId)) {
    return false;
  }

  if (defendingPlayerHasGuardian(playerKey) && !hasKeyword(attacker.cardData, "Cheater") && !hasKeyword(cardData, "Guardian")) {
    return false;
  }

  return true;
}

function isEffectTargetableGod(playerKey) {
  if (!targetingState) {
    return false;
  }

  return targetingState.isValidTarget({
    kind: "god",
    playerKey
  });
}

function isEffectTargetableCard(playerKey, zoneId, instance, cardData) {
  if (!targetingState) {
    return false;
  }

  return targetingState.isValidTarget({
    kind: "card",
    playerKey,
    uid: instance.uid,
    zone: zoneId,
    card: instance,
    cardId: instance.cardId,
    cardData
  });
}

function prettyDeckName(deckId) {
  return decksById[deckId]?.nome || deckId;
}

function playerLabel(playerKey) {
  return `Player ${playerKey}`;
}

function otherPlayerKey(playerKey) {
  return playerKey === "A" ? "B" : "A";
}

function zoneLabel(zoneId) {
  return ZONE_LABELS[zoneId] || zoneId;
}

function moveLabel(zoneId) {
  if (zoneId === "battlefield") return "Move to Battlefield";
  if (zoneId === "cosmo_base") return "Move to Base";
  if (zoneId === "tartarus") return "Send to Tartarus";
  if (zoneId === "void") return "Send to Void";
  return "Move to Hand";
}

function phaseLabel(phase) {
  if (phase === "upkeep") return "Upkeep";
  if (phase === "draw") return "Draw";
  if (phase === "main") return "Main Phase";
  if (phase === "end") return "End Step";
  return phase;
}

function humanCounterLabel(counter) {
  if (counter === "plusOneCounters") return "+1/+1";
  if (counter === "sealCounters") return "Chain";
  if (counter === "damageCounters") return "Damage";
  return counter;
}

function formatValue(value, unit = null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (unit === "base_cosmo") {
    return `${value} Base`;
  }

  return String(value);
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function camelToKebab(value) {
  return String(value).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
