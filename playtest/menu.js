// Console-style front end: title screen ("press any key"), main menu, collection and
// sound options. It sits above the match and hands control back through onStart(ai).

import { unlock, sfx, playMusic, volume, setVolume } from "./audio.js?v=1";

const ITEMS = [
  { id: "ai", label: "Battle vs AI", hint: "Duel the machine's Cosmo. You command Player A; the AI plays Player B." },
  { id: "local", label: "Local Battle", hint: "Two players on the same screen, taking turns as Player A and Player B." },
  { id: "online", label: "Online Battle", hint: "Duel other Saints over the internet.", soon: true },
  { id: "collection", label: "Collection", hint: "Browse every card in the Athena set." },
  { id: "options", label: "Options", hint: "Music and sound effect volume." }
];

const LOGO = "../LOGO/logo-web.webp";
const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

let root;
let screen = "title";
let index = 0;
let config;

export function initMenu(options) {
  config = options;
  root = document.createElement("div");
  root.id = "front-end";
  root.className = "front-end";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Main menu");
  document.body.appendChild(root);

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  // pointermove, not pointerover: re-rendering under a resting pointer must not steal keyboard selection.
  root.addEventListener("pointermove", onHover);
  // Capture phase so the match's own shortcuts (Space, Esc, Z) never fire behind the menu.
  window.addEventListener("keydown", onKey, true);
  bindUiSounds();
  document.querySelector("#main-menu")?.addEventListener("click", () => showMenu());
  render();
}

export function showMenu() {
  screen = "menu";
  root.hidden = false;
  playMusic("menu");
  render();
}

function hide() {
  root.hidden = true;
  root.innerHTML = "";
}

function go(next) {
  screen = next;
  render();
}

function choose(item) {
  if (item.soon) {
    sfx("back");
    return;
  }
  sfx("confirm");
  if (item.id === "ai" || item.id === "local") {
    hide();
    config.onStart(item.id === "ai");
    return;
  }
  go(item.id);
}

function onClick(event) {
  if (screen === "title") {
    enter();
    return;
  }
  const target = event.target.closest("[data-menu]");
  if (!target) return;
  const action = target.dataset.menu;
  if (action === "item") {
    index = Number(target.dataset.index);
    choose(ITEMS[index]);
  } else if (action === "back") {
    sfx("back");
    go("menu");
  } else if (action === "zoom") {
    root.querySelector(".fe-zoom").innerHTML = `<img src="${escape(target.dataset.src)}" alt="${escape(target.dataset.name)}">`;
    root.querySelector(".fe-zoom").hidden = false;
    sfx("click");
  } else if (action === "unzoom") {
    root.querySelector(".fe-zoom").hidden = true;
  }
}

function onInput(event) {
  const kind = event.target.dataset.volume;
  if (!kind) return;
  setVolume(kind, Number(event.target.value) / 100);
  if (kind === "sfx") sfx("click");
}

function onHover(event) {
  const item = event.target.closest("[data-menu='item']");
  if (!item || Number(item.dataset.index) === index) return;
  index = Number(item.dataset.index);
  sfx("hover");
  render();
}

function enter() {
  unlock();
  sfx("confirm");
  showMenu();
}

function onKey(event) {
  if (root.hidden) return;
  event.stopImmediatePropagation();
  if (screen === "title") {
    if (!event.repeat) enter();
    event.preventDefault();
    return;
  }
  if (event.key === "Escape" || event.key === "Backspace") {
    if (screen !== "menu") {
      sfx("back");
      go("menu");
    }
  } else if (screen === "menu" && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    index = (index + (event.key === "ArrowDown" ? 1 : ITEMS.length - 1)) % ITEMS.length;
    sfx("hover");
    render();
  } else if (screen === "menu" && (event.key === "Enter" || event.key === " ")) {
    choose(ITEMS[index]);
  } else {
    return;
  }
  event.preventDefault();
}

// Hover and click sounds for every button and hand card in the match, not only the menu.
function bindUiSounds() {
  let lastHover = null;
  document.addEventListener("pointerover", (event) => {
    if (!root.hidden) return;
    const target = event.target.closest?.("button, .card.zone--hand");
    if (target && target !== lastHover) sfx("hover");
    lastHover = target;
  });
  document.addEventListener("click", (event) => {
    if (root.hidden || !event.target.closest) return;
    if (event.target.closest("button")) sfx("click");
  });
}

function render() {
  if (root.hidden) return;
  root.dataset.screen = screen;
  if (screen === "title") {
    root.innerHTML = `
      <div class="fe-title">
        <img class="fe-title__logo" src="${LOGO}" alt="Saint Seiya TCG">
        <p class="fe-title__press">Press any key</p>
        <p class="fe-title__legal">Fan-made playtest · Athena Beta</p>
      </div>`;
    return;
  }
  if (screen === "menu") {
    const item = ITEMS[index];
    root.innerHTML = `
      <div class="fe-menu">
        <img class="fe-menu__logo" src="${LOGO}" alt="Saint Seiya TCG">
        <nav class="fe-menu__list" aria-label="Game modes">
          ${ITEMS.map((entry, i) => `
            <button type="button" class="fe-item${i === index ? " is-active" : ""}${entry.soon ? " is-soon" : ""}" data-menu="item" data-index="${i}" ${entry.soon ? 'aria-disabled="true"' : ""}>
              <span class="fe-item__label">${escape(entry.label)}</span>
              ${entry.soon ? '<span class="fe-item__soon">Coming soon</span>' : ""}
            </button>`).join("")}
        </nav>
        <aside class="fe-hint ss-frame">
          <p class="fe-hint__title">${escape(item.label)}</p>
          <p class="fe-hint__text">${escape(item.hint)}</p>
        </aside>
        <p class="fe-keys">↑ ↓ Select · Enter Confirm · Esc Back</p>
      </div>`;
    root.querySelector(".fe-item.is-active")?.focus({ preventScroll: true });
    return;
  }
  if (screen === "collection") {
    const cards = config.cards.filter((card) => card.caminho_imagem);
    root.innerHTML = `
      <div class="fe-panel ss-frame">
        <header class="fe-panel__header">
          <h2>Collection</h2>
          <span class="fe-panel__count">${cards.length} cards</span>
          <button type="button" class="ghost" data-menu="back">Back</button>
        </header>
        <div class="fe-collection">
          ${cards.map((card) => `
            <button type="button" class="fe-card" data-menu="zoom" data-src="../${escape(card.caminho_imagem)}" data-name="${escape(card.nome_exibicao_en)}">
              <img src="../${escape(card.caminho_imagem)}" alt="${escape(card.nome_exibicao_en)}" loading="lazy">
            </button>`).join("")}
        </div>
      </div>
      <div class="fe-zoom" data-menu="unzoom" hidden></div>`;
    return;
  }
  if (screen === "options") {
    root.innerHTML = `
      <div class="fe-panel fe-panel--small ss-frame">
        <header class="fe-panel__header">
          <h2>Options</h2>
          <button type="button" class="ghost" data-menu="back">Back</button>
        </header>
        <label class="fe-slider">
          <span>Music</span>
          <input type="range" min="0" max="100" value="${Math.round(volume.music * 100)}" data-volume="music">
        </label>
        <label class="fe-slider">
          <span>Sound effects</span>
          <input type="range" min="0" max="100" value="${Math.round(volume.sfx * 100)}" data-volume="sfx">
        </label>
        <p class="fe-panel__note">Gameplay settings (Full Control, auto-pass, AI speed) are in the ⚙ menu during a match.</p>
      </div>`;
  }
}
