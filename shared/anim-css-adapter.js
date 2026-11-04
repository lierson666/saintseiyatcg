// Adapter das animações CSS antigas: liga, desliga e muda a velocidade pelo nome do @keyframes, sem reescrever o CSS.
// Ajuste em data/card-animations.json ("css"), editado no Star Hill. Sem ajuste salvo, nem o listener existe. Só apresentação.
// shortcut: o atraso (animation-delay) não escala, porque o evento só chega depois dele; para escalar, seria preciso reescrever a regra.
import {animFile} from './anim-data.js?v=1';

let tunes = {}, listening = false;
const offInTest = new Set(); // só no teste: guarda as infinitas desligadas para poder religar sem recarregar

// finish() em vez de cancel(): vale o estado final do fill e animationend continua saindo. Infinita não tem fim e lança erro.
export function applyTune(a, t, test = false) {
  if (t?.ligado === false) {
    try { a.finish(); } catch { a.cancel(); if (test) offInTest.add(a); }
  } else a.playbackRate = t?.velocidade ?? 1;
}

function onStart(e) {
  const t = tunes[e.animationName];
  if (!t) return;
  for (const a of e.target.getAnimations({subtree: !!e.pseudoElement})) if (a.animationName === e.animationName) applyTune(a, t);
}

export function tuneCssAnimations(map = {}, test = false) {
  tunes = map;
  if (!Object.keys(tunes).length && !listening) return;
  if (!listening) { document.addEventListener('animationstart', onStart, true); listening = true; }
  for (const a of offInTest) if (tunes[a.animationName]?.ligado !== false) { offInTest.delete(a); a.play(); }
  for (const a of document.getAnimations()) if (a.animationName) applyTune(a, tunes[a.animationName], test);
}

export const loadCssTune = url => fetch(animFile(url), {cache: 'no-cache'}).then(r => (r.ok ? r.json() : {})).then(d => tuneCssAnimations(d.css)).catch(() => {});

const seconds = text => (/ms$/.test(text) ? parseFloat(text) / 1000 : parseFloat(text));
// Duração escrita na regra que usa o @keyframes; com var() ou regra em outro domínio, cai no padrão de 1 s.
function ruleDuration(name, rules) {
  for (const r of rules) {
    const names = r.style?.animationName?.split(',').map(n => n.trim()) ?? [], at = names.indexOf(name);
    if (at >= 0) { const list = r.style.animationDuration.split(','), s = seconds(list[at] ?? list[0]); if (s > 0) return s; }
    if (r.cssRules) { const inner = ruleDuration(name, r.cssRules); if (inner) return inner; }
  }
  return 0;
}
function durationOf(name) {
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // folha de outro domínio (fontes): sem leitura
    const s = ruleDuration(name, rules);
    if (s) return s;
  }
  return 1;
}

// Teste no editor: toca a animação real em el, pelo mesmo caminho do jogo. Diz quantos elementos já rodam essa animação.
export async function sampleCssAnimation(el, name) {
  const rodando = document.getAnimations().filter(a => a.animationName === name).length, before = el.style.animation;
  el.style.animation = `${name} ${durationOf(name)}s`;
  const a = el.getAnimations().find(x => x.animationName === name);
  if (a) { applyTune(a, tunes[name], true); await a.finished.catch(() => {}); }
  el.style.animation = before;
  return {rodando, tocou: !!a};
}
