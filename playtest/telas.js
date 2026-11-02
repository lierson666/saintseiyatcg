// Telas, sons, músicas e animações editados no Star Hill (data/olympus-telas.json). O lobby e o duelo leem daqui;
// sem o arquivo valem os padrões abaixo. Imagem: "card:<id>" usa a arte atual da carta no Card Forge; senão é um caminho do projeto.
import {configureAudio, playFxFile, playVoice} from './audio.js?v=20261102-voz4';

const ROOT = new URL('../', import.meta.url);
export const ANIM_GROUPS = ['compra', 'conjurar', 'cosmo', 'gatilho', 'ataque', 'dano', 'morte', 'turno', 'ultimate'];
export const SOUND_EVENTS = ['ultimate', 'clique', 'play', 'voltar', 'turno', 'compra', 'conjurar', 'equipar_armadura', 'equipar_arma', 'cosmo', 'gatilho', 'ataque', 'dano', 'morte', 'vitoria', 'derrota', 'hover', 'hover_mao', 'hover_base', 'passar_turno', 'receber_turno'];
// Evento da engine → grupo de animação (director.js).
export const ANIM_OF = {draw: 'compra', fatigue: 'compra', base_placed: 'conjurar', card_played: 'conjurar', equipped: 'conjurar', cosmo_spent: 'cosmo',
  latent_gained: 'cosmo', spell_resolved: 'gatilho', ability: 'gatilho', divine_power: 'gatilho', domain_power: 'gatilho', strike_declared: 'ataque',
  strike_resolve: 'ataque', damage: 'dano', god_damage: 'dano', soul_lost: 'dano', destroyed: 'morte', turn_start: 'turno', round_end: 'turno',
  ultimate_announced: 'ultimate', ultimate_resolved: 'ultimate', ultimate_failed: 'ultimate'};

let telas = {versao: 1, home: null, fundos: {}, cores: {}, textos: {}, animacoes: {}, audio: null};
try {
  const r = await fetch(new URL('data/olympus-telas.json', ROOT), {cache: 'no-cache'});
  if (r.ok) telas = {...telas, ...(await r.json())};
} catch { /* sem arquivo: padrões do jogo */ }
if (telas.audio) configureAudio({...telas.audio, efeitos: {}});
let cardVoices = {};
try {
  const r = await fetch(new URL('data/card-voices.json', ROOT), {cache: 'no-cache'});
  if (r.ok) cardVoices = await r.json();
} catch { /* sem falas por carta */ }
export {telas, cardVoices};

export const mediaUrl = path => path ? new URL(path.split('/').map(encodeURIComponent).join('/'), ROOT).href : '';
// `artOf(id)` vem de quem chama (lobby ou duelo), que já conhece as artes do Forge.
export const imageUrl = (value, artOf) => !value ? '' : value.startsWith('card:') ? artOf(value.slice(5)) || '' : mediaUrl(value);
export const anim = group => ({ligada: telas.animacoes[group]?.ligada !== false, velocidade: telas.animacoes[group]?.velocidade || 1});

export function sound(evento) {
  const path = telas.audio?.efeitos?.[evento];
  // Som extraído do jogo fica atrás do login (tools/rea-ps3/sons-aprovados.py); MUSIC/ é público.
  if (path) playFxFile(path.replace(/^MUSIC\/fx\/(ps3-[^/]+|soldiers-soul)\//, 'playtest/divine/assets/sons/$1/'));
}
// Fala aprovada no Star Hill para o personagem do nome; sem fala, fica só o som de impacto.
// A fala escolhida na própria carta vem antes da fala padrão do personagem.
export function voice(kind, name, lang, own = null) {
  const v = (telas.audio?.vozes || []).find(x => new RegExp(`\\b${x.nome}\\b`, 'i').test(name)), ids = v?.[kind] || [];
  const line = own || (ids.length && `${v.codigo}/${ids[Math.floor(Math.random() * ids.length)]}`);
  if (line) playVoice(`playtest/divine/assets/vozes/${lang}/${line}.mp3`, kind === 'strike');
}

// Cores: variáveis CSS da tela (lobby: --kv-*, duelo: --gold, --panel...).
export function applyColors(scope) {
  for (const [name, value] of Object.entries(telas.cores[scope] || {})) document.documentElement.style.setProperty(name, value);
}

// Textos: troca exata do texto visível (original → novo), em qualquer tela, inclusive no que for desenhado depois.
export function applyTexts(rootEl = document.body) {
  const map = new Map(Object.entries(telas.textos || {}).filter(([a, b]) => a && b && a !== b));
  if (!map.size) return;
  const swap = node => {
    const key = node.nodeValue.trim();
    if (map.has(key)) node.nodeValue = node.nodeValue.replace(key, map.get(key));
  };
  const walk = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) swap(n); };
  walk(rootEl);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') swap(m.target);
      else for (const n of m.addedNodes) n.nodeType === 3 ? swap(n) : n.nodeType === 1 && walk(n);
    }
  }).observe(rootEl, {childList: true, subtree: true, characterData: true});
}
