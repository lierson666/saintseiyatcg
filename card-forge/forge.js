import {mountArtPrompt} from './art-prompt.js?v=20261102-arte7';
import {cardsToXlsx} from './cards-xlsx.js?v=20261102-momento1';
import {AUDIT_STATUS,auditOf,mountCardFinder,reviewQueue} from './card-finder.js?v=20261102-momento1';
import {mountRulesRows} from './rules-rows.js?v=20261102-banco1';
import {createHistory} from '../shared/editor-history.js';
import {compilePlaytest} from '../shared/import-playtest.js';
import {renderLiveCard,illustration,EDITIONS,editionOf} from '../shared/live-card.js?v=20261102-escala1';
import {cardVignette} from '../shared/card-scrim.js?v=20261102-escala1';
import {godFaceLayout,godFaceTexts} from '../shared/god-face.js?v=20261102-escala1';
import {EQUIPMENT_SUBTYPES,ARMOR_FAMILY,PATENTES_ARMADURA,PATENTES_FORA_DA_ESCALA,patentesDe,belongsToEquipmentGroup,formatCardTypeLine,printedSubtypes,subtypesText,toggleSubtype,validateEquipmentSubtypes} from '../shared/equipment-types.js?v=20261102-escala1';
import {textBlocks, blocksMarkup, presentationRules, ruleBlocksWithoutKeywords, KEYWORD_WORDS, KEYWORD_WORDS_PT, STAT_RE, statTrend, statSymbols, costSymbols, keywordLine} from '../shared/card-text.js?v=20261102-eq2';
import {isArmor,isEquipment,validateCard,LINE_KEYWORDS,keywordsOfLine} from '../shared/card-model.js?v=20261102-kw1';
// Card Forge — editor de cartas em vanilla JS. Renderiza no canvas nativo 1488x2091 usando
// as peças de CARD-TEMPLATE/ (extraídas dos PSDs) e o spec CARD-TEMPLATE/templates.json.

import {publishedScene,visualProject} from '../shared/layout-studio/runtime.js';
import {displayCard,forceLang,keywordName,typeWord,lang} from '../shared/card-i18n.js?v=20261102-escala1';
import {sceneCanvas} from '../shared/layout-studio/renderer.js';
import {simulateCard} from './studio-preview.js';
import {printedEquipmentBonuses,signedBonus,armorBonusText} from '../shared/card-visual-values.js?v=20261102-arroba1';

const T = await (await fetch('../CARD-TEMPLATE/templates.json')).json();
const P = (await (await fetch('../CARD-TEMPLATE/pieces.json')).json()).pieces;
document.querySelector('select[name=edicao]').innerHTML = EDITIONS.map((e) => `<option value="${e.code}">${e.name} (${e.code})</option>`).join(''); // lista única em shared/live-card.js
const W = T.canvas.w, H = T.canvas.h;

const $ = (s) => document.querySelector(s);
const form = $('#form');
const canvas = $('#card');
const ctx = canvas.getContext('2d');
const statusEl = $('#status');

const say = (msg, error = false) => { statusEl.textContent = msg; statusEl.classList.toggle('error', error); };

// ---------- imagens ----------
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((ok) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => ok(null);
      im.src = src;
    }));
  }
  return imgCache.get(src);
}
const pieceSrc = (key) => `../CARD-TEMPLATE/${key}.png`;
const symbolKey = (faccao) => `symbols/${String(faccao || '').toLowerCase()}`;

// ---------- estado ----------
let db = null;          // cards.json inteiro
let orig = null;        // carta original (null = nova)
let gen = [];           // [{markup, text}] — habilidades geradas no load, para não reescrever texto intacto
let S = blankState();
let editHistory;
function syncEditHistory(){
  $('#forgeUndo').disabled=!editHistory?.canUndo;$('#forgeRedo').disabled=!editHistory?.canRedo;
  if(parent!==window)parent.postMessage({tipo:'card-forge:history'},location.origin);
}
function resetEditHistory(){editHistory=createHistory(S,{limit:50});syncEditHistory();}
function rememberEdit(key=null){editHistory?.record(S,key);syncEditHistory();}
function travelEdit(direction){
  if(document.querySelector('dialog[open]'))return false;
  if(drag)endDrag();const value=editHistory?.[direction]();if(!value)return false;
  // Preserva a referência de estado usada pela lista de importação em lote.
  for(const key of Object.keys(S))delete S[key];Object.assign(S,value);
  fillForm();render();syncEditHistory();say(direction==='undo'?'Alteração desfeita no rascunho':'Alteração refeita no rascunho');return true;
}
$('#forgeUndo').addEventListener('click',()=>travelEdit('undo'));
$('#forgeRedo').addEventListener('click',()=>travelEdit('redo'));
form.addEventListener('focusout',()=>editHistory?.breakGroup());
// Abas do formulário (autor, 02/11/2026): Informações, Habilidades (Inglês e Português) e Sons. Saem de data-tab e data-sub das seções.
const formSections = [...form.querySelectorAll(':scope > fieldset')];
const unique = (list) => [...new Set(list.filter(Boolean))];
const makeTabs = (className, label, names, onPick) => {
  const nav = document.createElement('nav');
  nav.className = className;
  nav.setAttribute('aria-label', label);
  nav.append(...names.map((name) => {
    const tab = Object.assign(document.createElement('button'), {type: 'button', textContent: name});
    tab.addEventListener('click', () => onPick(name));
    return tab;
  }));
  return nav;
};
const stored = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const tabNames = unique(formSections.map((section) => section.dataset.tab));
let activeTab = tabNames.includes(stored('forge.tab')) ? stored('forge.tab') : tabNames[0];
let activeSub = stored('forge.sub');
const subsOf = (tab) => unique(formSections.filter((section) => section.dataset.tab === tab).map((section) => section.dataset.sub));
const formTabs = makeTabs('forge-tabs', 'Seções da carta', tabNames, (name) => pickTab(name, activeSub));
const formSubTabs = makeTabs('forge-subtabs', 'Idioma das habilidades', unique(formSections.map((section) => section.dataset.sub)), (name) => pickTab(activeTab, name));
form.prepend(formTabs, formSubTabs);
function pickTab(tab, sub) {
  const subs = subsOf(tab);
  activeTab = tab;
  if (subs.length) activeSub = subs.includes(sub) ? sub : subs[0];
  formSections.forEach((section) => section.classList.toggle('section-off', section.dataset.tab !== tab || Boolean(section.dataset.sub && section.dataset.sub !== activeSub)));
  formSubTabs.hidden = !subs.length;
  const mark = (nav, name) => [...nav.children].forEach((b) => { if (b.textContent === name) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  mark(formTabs, activeTab);
  mark(formSubTabs, activeSub);
  form.scrollTop = 0;
  try { localStorage.setItem('forge.tab', activeTab); localStorage.setItem('forge.sub', activeSub || ''); } catch {}
}
pickTab(activeTab, activeSub);
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&!document.querySelector('dialog[open]')&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();travelEdit(e.shiftKey||e.key.toLowerCase()==='y'?'redo':'undo');}});


function blankState() {
  return {
    id: '', nome_exibicao_en: '', title: '', subtitle: '', tipo: 'Devotee', subtipos: '', faccao: 'Athena',
    revisao_regras: '2.1', cosmoble: false, personagem_unico: false, personagem_id: '', origem_personagem: '', referencias_mitologicas_texto: '', slot_equipamento: '', patente_armadura: '', donos: '', estagios: [], resonanceText: '',
    raridade: 'Common', custo: '', unidade_custo: 'base_cosmo', power: '', vida: '', resistance: '', bonusPower: '', bonusResistance: '', auto_equip: '', artista: '', edicao: new URLSearchParams(location.search).get('edicao') || EDITIONS[0].code,
    equipar_custo: '', equipar_custo_ressonante: '', equipar_custo_outros: '', damage_cloth: '', soul: '', attack: '', awaken: '', keywords: '', rules: '',
    habilidade_awaken_en: '', ultimate_en: '', flavour: '', art: null,
    pt_nome: '', pt_subtitulo: '', pt_rules: '', pt_awaken: '', pt_ultimate: '', pt_flavour: '', pt_auto: [], ptFor: '',
  };
}

// ---------- texto de regras: cards.json <-> markup ----------
const COST = { 'Latent Cosmo': '{L}', 'Base Cosmo': '{B}', Cosmo: '{C}' }; // {B} e {C} usam o mesmo ícone
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Símbolos no dado (autor, 31/10/2026): cards.json guarda {N}{C}/{N}{L}/{N}{B}/{N}{S}/{T}; o markup do editor usa "N {C}".
const TOKEN_WORD = { L: 'Latent Cosmo', B: 'Base Cosmo', C: 'Cosmo' };
export function toMarkup(text) {
  text = text.replace(/\{(\d+|X)\}\{([BCL])\}/g, (_, n, k) => `${n} ${TOKEN_WORD[k]}`).replace(/\{(\d+|X)\}\{S\}/g, '$1 {S}');
  if (/^(?:Resonance|Ressonância) — [^.:]+$/.test(text)) return `**${text}**`; // 1ª linha da Armor, inteira (30/10/2026)
  const res = text.match(/^((?:Resonance|Ressonância) — [^.:—]+): (.*)$/) // guia §27: o nome do personagem faz parte do nome da habilidade
    || text.match(/^([^\n—]+ — Divine (?:Power|Command))\s+([\s\S]*)$/); // God: etiqueta na 1ª linha, efeito embaixo
  let m = !res && text.match(/^(.+?) — Cost: (\d+) (Latent Cosmo|Base Cosmo|Cosmo)\. (.*)$/);
  let out = res ? `**${res[1]}:**\n${res[2]}` : m ? `**${m[2]} ${COST[m[3]]} ${m[1].toUpperCase()}:**\n${m[4]}` : text;
  if (res) { /* já resolvido */ }
  else if (!m && (m = text.match(/^([^.—]{2,30}) — ([^.—]{1,25})\. (.*)$/))) out = `**${m[1]} — ${m[2]}:**\n${m[3]}`;
  else if (!m && (m = text.match(/^([^.—]{2,40}) — (.*)$/))) out = `**${m[1]}:**\n${m[2]}`;
  return out
    .replace(/(\d+) (Latent Cosmo|Base Cosmo|Cosmo)\b/g, (_, n, u) => `${n} ${COST[u]}`)
    .replace(/(^|[\s(])([+-]\d+\/[+-]\d+)/g, '$1**$2**');
}

export function fromMarkup(md) {
  let s = md.trim();
  const god = s.match(/^\*\*([^*\n]+ — Divine (?:Power|Command)):?\*\*\s*([\s\S]*)$/); // God guarda quebras de linha
  if (god) return `${god[1]}\n${god[2]}`.replace(/(\d+|X) \{([BCLS])\}/g, '{$1}{$2}').replace(/\*\*/g, '').trim();
  let m = s.match(/^\*\*(\d+) \{([BCL])\} (.+?):\*\*\s*\n?([\s\S]*)$/);
  if (m) s = `${titleCase(m[3])} — Cost: {${m[1]}}{${m[2]}}. ${m[4]}`;
  else if ((m = s.match(/^\*\*((?:Resonance|Ressonância) — [^*:]+):\*\*\s*\n?([\s\S]*)$/))) s = `${m[1]}: ${m[2]}`;
  else if ((m = s.match(/^\*\*([^*—]{2,30}) — ([^*—]{1,25}):\*\*\s*\n?([\s\S]*)$/))) s = `${m[1]} — ${m[2]}. ${m[3]}`;
  else if ((m = s.match(/^\*\*([^*]{2,40}):\*\*\s*\n?([\s\S]*)$/))) s = `${m[1]} — ${m[2]}`;
  return s
    .replace(/(\d+|X) \{([BCLS])\}/g, '{$1}{$2}')
    .replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

const splitParas = (md) => md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// ---------- layout ----------
function layoutKey(s) {
  const subs = list(s.subtipos);
  if(s.tipo==='Support')return 'relic';
  if(isArmor({...s,subtipos:subs}))return 'relic_cloth';
  if(s.tipo==='Equipment')return 'relic_weapon';
  const sub = subs.find((x) => T.typeToLayout[`${s.tipo}:${x}`]);
  return T.typeToLayout[sub ? `${s.tipo}:${sub}` : s.tipo] || 'devotee';
}
const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => x.trim()).filter(Boolean);
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// Spell não aparece na linha de tipo: Technique e Moment já são os Spells (autor, 28/10/2026; Miracle e Event saíram em 31/10/2026).
function typeLine(s, fmt, word = (w) => w) {
  return fmt.replace('{tipo}', s.tipo === 'Spell' ? '' : word(s.tipo)).replace('{faccao}', s.faccao).replace('{subtipos}', subtypesText({tipo: s.tipo, subtipos: list(s.subtipos), patente_armadura: s.patente_armadura}, word))
    .replace(/^\s*[—-]\s*/, '').replace(/\s*[—-]\s*$/, '').replace(/\s*[—-]\s*(?=\s*[—-])/g, '');
}

// ---------- desenho ----------
const font = (style, size) => T.styles[style].font.replace('{s}', size.toFixed(1));
// Neutral tem pacote próprio em templates.json (cinza claro, sem símbolo e sem borda).
const fac = () => T.factions[String(S.faccao).toLowerCase()] || T.factions.athena;
const facKey = () => (T.factions[String(S.faccao).toLowerCase()] ? String(S.faccao).toLowerCase() : 'athena');

// Peça da facção: '<facção>/x' se existir no pacote do Deus; senão a de Athena tingida na cor da facção.
// Devolve { key, tint } ou null (peça omitida pela facção).
function resolvePiece(key) {
  const name = key.split('/').pop(), f = facKey();
  if (P[`${f}/${name}`]) return { key: `${f}/${name}`, tint: false };
  if ((fac().omit || []).includes(name)) return null;
  return { key, tint: !name.startsWith('rarity_') && (f !== 'athena' || !key.startsWith('athena/')) };
}

// Tinge uma peça clara na cor da facção mantendo o sombreado (luminância relativa).
const tintCache = new Map();
async function pieceImage(key, tint, color = fac().color) {
  const im = await loadImg(pieceSrc(key));
  if (!im || !tint) return im;
  const id = `${key}|${color}`;
  if (tintCache.has(id)) return tintCache.get(id);
  const c = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight });
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  const [tr, tg, tb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  let max = 1;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 40) max = Math.max(max, 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  for (let i = 0; i < px.length; i += 4) {
    const k = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / max;
    px[i] = tr * k; px[i + 1] = tg * k; px[i + 2] = tb * k;
  }
  g.putImageData(d, 0, 0);
  tintCache.set(id, c);
  return c;
}

// Aproxima os efeitos de camada dos PSDs: Outer Glow da cor da facção em Screen (35%, 57px) e
// Drop Shadow preto com choke 94 (vira um contorno duro de ~6px). `outline` desenha esse contorno.
function paint(glow, shadowAlpha, draw, outline) {
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = fac().glow;
    ctx.shadowBlur = 57;
    draw();
    ctx.restore();
  }
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur = 16; // sombra de leitura sobre a arte clara (autor, 02/11/2026)
  if (outline) {
    ctx.strokeStyle = `rgba(20,16,8,${shadowAlpha})`; // preto em Multiply sobre o brilho
    ctx.lineJoin = 'round';
    ctx.lineWidth = 11;
    outline();
  } else draw(); // imagem: o halo vem só da sombra, reforçada
  ctx.shadowColor = 'transparent';
  draw();
  ctx.restore();
}

function fitText(text, style, size, maxW) {
  ctx.font = font(style, size);
  const w = ctx.measureText(text).width;
  if (maxW && w > maxW) { size *= maxW / w; ctx.font = font(style, size); }
  return size;
}

// center=true: centra a TINTA do glifo (não a caixa da fonte) em x,y — números sempre no meio exato da gema.
function drawText(text, style, x, y, size, maxW, center = false) {
  if (!text) return;
  const s = fitText(text, style, size, maxW);
  ctx.fillStyle = fac().color;
  if (center) {
    ctx.textAlign = 'left'; // antes de medir: as medidas dependem do alinhamento atual
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(text);
    x -= (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    y += (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }
  paint(T.styles[style].glow, 0.92, () => ctx.fillText(text, x, y),
    () => { ctx.lineWidth = Math.min(11, s * 0.16); ctx.strokeText(text, x, y); });
}

// Retângulo de destino: el.rect, ou a posição da peça de Athena (+dx/dy). Peça de outra facção é
// desenhada nesse mesmo lugar, para todos os layouts continuarem valendo.
function pieceRect(key, el) {
  const p = P[key];
  return el.rect || [p.x + (el.dx || 0), p.y + (el.dy || 0), p.w, p.h];
}

async function drawPiece(key, el = {}, glow = false) {
  const r = resolvePiece(key);
  if (!r || !P[key] && !P[r.key]) return null;
  const im = await pieceImage(r.key, r.tint);
  if (!im) return null;
  const [x, y, w, h] = pieceRect(P[key] ? key : r.key, el);
  if (glow) paint(true, 0.92, () => ctx.drawImage(im, x, y, w, h));
  else ctx.drawImage(im, x, y, w, h);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
const drawGlowPiece = (key, el) => drawPiece(key, el, true);

let godFace = 'front', scrimTop; // face do God na prévia e na exportação (guia §63)
async function drawFrame() {
  const v = cardVignette(scrimTop), scrim = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [at, alpha] of v.stops) scrim.addColorStop(at, `rgba(0,0,0,${alpha})`);
  ctx.save(); ctx.translate(v.cx * 1488, v.cy * 2091); ctx.scale(v.rx * 1488, v.ry * 2091); // elipse: círculo de raio 1 esticado
  ctx.fillStyle = scrim; ctx.fillRect(-20, -20, 40, 40); ctx.restore();
  for (const key of fac().frame) {
    const p = P[key], im = await loadImg(pieceSrc(key));
    if (!p || !im) continue;
    ctx.save();
    ctx.globalCompositeOperation = p.blend || 'source-over';
    ctx.drawImage(im, p.x, p.y, p.w, p.h);
    ctx.restore();
  }
}

// Símbolos de texto: token -> peça. {C}/{B} usam o mesmo ícone de Cosmo.
const ICONS = { '{C}': 'athena/icon_cosmo', '{B}': 'athena/icon_cosmo', '{L}': 'athena/icon_latent', '{S}': 'icons/soul', '{T}': 'icons/tap', '{A}': 'icons/atk-mini', '{H}': 'icons/soul' };
// Keywords (docs/guia-do-jogo.md §24 + ações dos Deuses) saem em NEGRITO MAIÚSCULO no texto de regras, como nos PSDs.
export const KEYWORDS = ['Guardian', 'Pierce', 'Impulse', 'Nimble', 'Long Range', 'Hidden Cosmo', 'Afterlife', 'Immune'];
// As caixas de regras mandam nas keywords da linha (guia Cap. IX); outra entrada antiga de keywords_en fica como está.
const boxKeywords = (rules) => splitParas(rules).flatMap((p) => keywordsOfLine(p) || []);
const cardKeywords = (s) => [...new Set([...list(s.keywords).filter((k) => !LINE_KEYWORDS.includes(k)), ...boxKeywords(s.rules)])];
// Keyword gravada sem caixa ganha uma no fim, para não deslocar as falas ligadas a cada habilidade.
function keywordsWithoutBox(s) {
  const boxed = boxKeywords(s.rules);
  return list(s.keywords).filter((k) => LINE_KEYWORDS.includes(k) && !boxed.includes(k)).join(', ');
}
const KW_RE = new RegExp(`@(${[...KEYWORD_WORDS, ...KEYWORD_WORDS_PT].sort((a, b) => b.length - a.length).join('|')})(?!\\p{L})`, 'giu'); // mesma lista do duelo (shared/card-text.js)
const boldKeywords = (para) => statSymbols(keywordLine(para).split(/(\*\*[^*]*\*\*)/).map((seg, i) => (i % 2 ? seg : seg.replace(KW_RE, (_, k) => `**${k.toUpperCase()}**`).replace(STAT_RE, (m) => `⟪${statTrend(m)}|${m.toUpperCase()}⟫`))).join('').replace(/@(?=\p{L})(?!(?:ATK|ATQ|POWER|PODER|HP|PV|COSMO|BASECOSMO|LATENT|LATENTE|SOUL|ALMA|TAP)(?!\p{L}))/giu, '')).replace(/\{(\d+|X)\}(?=\{[BCLS]\})/g, '$1 ');

function tokenize(para) {
  const toks = [];
  let bold = false, stat = null;
  // ⟪up|…⟫ / ⟪down|…⟫: bônus de atributo, negrito e colorido (verde/vermelho).
  for (const part of boldKeywords(para).split(/(\*\*|⟪(?:up|down|mixed)\||⟫|\{[BCLSTAH]\}|\n|[ \t]+)/)) {
    if (!part) continue;
    if (part === '**') bold = !bold;
    else if (part.startsWith('⟪')) { stat = part.slice(1, -1); bold = true; }
    else if (part === '⟫') { stat = null; bold = false; }
    else if (part === '\n') toks.push({ t: 'br' });
    else if (/^[ \t]+$/.test(part)) toks.push({ t: 'sp' });
    else if (ICONS[part]) toks.push({ t: 'icon', key: ICONS[part], bold, stat });
    else toks.push({ t: 'w', text: part, bold, stat });
  }
  return toks;
}

function layoutRules(paras, size, maxW) {
  const lh = size * 1.13, gap = size * 0.55, iconW = size * 1.05;
  const fNorm = T.styles.rules.font.replace('{s}', size), fBold = T.styles.rules.bold.replace('{s}', size);
  ctx.font = fNorm;
  const spW = ctx.measureText(' ').width;
  const out = [];
  let h = 0;
  paras.forEach((para, pi) => {
    // God (autor, 31/10/2026): ⟦AWAKEN N⟧ é o cabeçalho do PSD; ⟦ETIQUETA⟧ é a etiqueta pequena acima do título.
    const aw = para.match(/^⟦AWAKEN ?([^⟧]*)⟧$/), tag = !aw && para.match(/^⟦([^⟧]+)⟧\n/);
    if (aw) { out.push({ awaken: aw[1], h: size * 3.2 }); h += size * 3.2; }
    if (tag) { out.push({ tag: tag[1], h: size * 0.8 }); h += size * 0.8; para = para.slice(tag[0].length); }
    let line = [], lw = 0, pendingSp = false;
    const flush = () => { out.push({ items: line, w: lw }); h += lh; line = []; lw = 0; pendingSp = false; };
    for (const tk of aw ? [] : tokenize(para)) {
      if (tk.t === 'br') { flush(); continue; }
      if (tk.t === 'sp') { pendingSp = line.length > 0; continue; }
      let w;
      if (tk.t === 'icon') w = iconW;
      else { ctx.font = tk.bold ? fBold : fNorm; w = ctx.measureText(tk.text).width; }
      const add = (pendingSp ? spW : 0) + w;
      if (line.length && lw + add > maxW) flush();
      else if (pendingSp) lw += spW;
      line.push({ ...tk, x: lw, w });
      lw += w;
      pendingSp = false;
    }
    if (line.length) flush();
    if (pi < paras.length - 1) { out.push({ gap }); h += gap; }
  });
  return { lines: out, h, lh, fNorm, fBold, iconW };
}

// God (autor, 31/10/2026): mesmos blocos do duelo (shared/card-text.js): etiqueta pequena, "{custo} NOME:" e o efeito embaixo.
// O bloco do Awaken leva o cabeçalho do PSD no lugar da etiqueta.
function godParas(c, awaken, face) {
  const sym = (t) => t.replace(/\{(\d+|X)\}(?=\{[BCLS]\})/g, '$1 ');
  const raw = godFaceTexts(c, face).filter(has);
  return textBlocks(raw).flatMap((b) => {
    const [tag, title] = b.heading?.includes(' § ') ? b.heading.split(' § ') : ['', b.heading];
    const body = sym([title ? `**${title.toUpperCase()}${b.body ? ':' : ''}**` : '', b.body].filter(Boolean).join('\n'));
    if (/^(Awaken|Despertar)\b/i.test(tag)) return [`⟦AWAKEN ${has(awaken) ? awaken : tag.replace(/\D+/g, '')}⟧`, body];
    return [tag ? `⟦${tag.toUpperCase()}⟧\n${body}` : body];
  });
}

async function drawAwaken(x, y, w, h, n) {
  const f = facKey(), [gem, word, line] = await Promise.all(['gem_awaken', 'awaken_word', 'awaken_line'].map((k) => (P[`${f}/${k}`] ? pieceImage(`${f}/${k}`, false) : null)));
  const cy = y + h / 2;
  if (!gem || !word) { ctx.font = T.styles.rules.bold.replace('{s}', h * 0.45); ctx.textAlign = 'center'; ctx.fillStyle = fac().color; ctx.fillText(`AWAKEN ${n}`, x + w / 2, cy); ctx.textAlign = 'left'; return; }
  const gw = h * gem.width / gem.height, wh = h * 0.62, ww = wh * word.width / word.height, pad = h * 0.12, overlap = h * 0.25;
  const mid = gw + ww - overlap, side = Math.max(0, (w - mid) / 2 - pad), gx = x + (w - mid) / 2;
  if (line) for (const lx of [x, gx + mid + pad]) ctx.drawImage(line, lx, cy - h * 0.012, side, h * 0.024);
  // Leitura sobre arte clara (autor, 31/10/2026): halo escuro atrás do cabeçalho e sombra forte no gem e na palavra.
  const halo = ctx.createRadialGradient(gx + mid / 2, cy, 0, gx + mid / 2, cy, mid * 0.62);
  halo.addColorStop(0, 'rgba(0,0,0,.72)'); halo.addColorStop(0.6, 'rgba(0,0,0,.45)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.fillStyle = halo; ctx.translate(gx + mid / 2, cy); ctx.scale(1, h * 0.75 / mid); ctx.beginPath(); ctx.arc(0, 0, mid * 0.62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const icons = () => { ctx.drawImage(gem, gx, y, gw, h); ctx.drawImage(word, gx + gw - overlap, cy - wh / 2, ww, wh); };
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = h * 0.18; icons(); icons(); ctx.restore();
  paint(false, 0.85, icons);
  ctx.font = `italic 700 ${h * 0.52}px Futura, 'Century Gothic', sans-serif`;
  ctx.textAlign = 'center'; ctx.fillStyle = fac().color;
  paint(true, 0.9, () => ctx.fillText(String(n), gx + gw / 2, cy + h * 0.02), () => { ctx.lineWidth = h * 0.06; ctx.strokeText(String(n), gx + gw / 2, cy + h * 0.02); });
  ctx.textAlign = 'left';
}

async function drawRules(el, s, pt = null) {
  const [rx, ry, rw, rh] = el.rect;
  const paras = [];
  const kws = cardKeywords(s).map(k => (pt ? keywordName(k) : k));
  if (kws.length) paras.push(`**${kws.join(', ').toUpperCase()}.**`);
  // Em PT o texto vem pronto dos campos *_pt (displayCard), já com Equip/Ressonância.
  const text=pt?(pt.habilidades_en||[]).map(toMarkup):s.estagios.length||layoutKey(s)==='relic_cloth'?presentationRules(buildCard()).map(toMarkup):splitParas(s.rules); // Armor: 1ª linha Equip · Resonance
  if (layoutKey(s) === 'god') paras.push(...godParas(pt || buildCard(), s.awaken, godFace));
  else paras.push(...splitParas(blocksMarkup(ruleBlocksWithoutKeywords(text,kws))));
  if (!paras.length) return;
  let size = el.size, L;
  // encolhe até caber na caixa
  for (; size >= 22; size -= 1) { L = layoutRules(paras, size, rw); if (L.h <= rh) break; }
  const icons = {};
  for (const k of new Set(Object.values(ICONS))) icons[k] = await pieceImage(k, facKey() !== 'athena' || !k.startsWith('athena/'));
  for (const k of ['{A}', '{H}']) for (const [stat, ink] of Object.entries(STAT_INK)) icons[`${ICONS[k]}|${stat}`] = await pieceImage(ICONS[k], true, ink); // verde/vermelho como o número
  ctx.fillStyle = fac().color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let y = ry + Math.max(0, (rh - L.h) / 2); // bloco centralizado na vertical da área de texto (autor, 31/10/2026)
  for (const ln of L.lines) {
    if (ln.gap) { y += ln.gap; continue; }
    if (ln.awaken !== undefined) { await drawAwaken(rx, y, rw, ln.h, ln.awaken); ctx.textBaseline = 'middle'; y += ln.h; continue; }
    if (ln.tag) {
      ctx.font = T.styles.rules.bold.replace('{s}', Math.round(size * 0.66));
      ctx.letterSpacing = `${size * 0.08}px`; ctx.textAlign = 'center'; ctx.fillStyle = fac().color;
      paint(false, 0.85, () => ctx.fillText(ln.tag, rx + rw / 2, y + ln.h / 2), () => { ctx.lineWidth = size * 0.12; ctx.strokeText(ln.tag, rx + rw / 2, y + ln.h / 2); });
      ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; y += ln.h; continue;
    }
    const x0 = rx + (rw - ln.w) / 2, cy = y + L.lh / 2;
    const run = (stroke) => {
      for (const it of ln.items) {
        if (it.t === 'icon') {
          const im = icons[`${it.key}|${it.stat}`] || icons[it.key], d = size * 1.0;
          if (im) {
            const iw = d * Math.min(1, im.width / im.height), ih = d * Math.min(1, im.height / im.width);
            ctx.drawImage(im, x0 + it.x + (it.w - iw) / 2, cy - ih / 2, iw, ih);
          }
        } else {
          ctx.font = it.bold ? L.fBold : L.fNorm;
          // Texto em branco; só títulos e keywords (negrito) na cor do tema (autor, 31/10/2026; igual a shared/live-card.css).
          if (!stroke) ctx.fillStyle = STAT_INK[it.stat] || (it.bold ? fac().color : RULES_INK);
          (stroke ? ctx.strokeText : ctx.fillText).call(ctx, it.text, x0 + it.x, cy);
        }
      }
    };
    paint(false, 0.85, () => run(false), () => { ctx.lineWidth = size * 0.17; run(true); });
    y += L.lh;
  }
}

const RULES_INK = '#f4efe6', STAT_INK = {up: '#8dffa6', down: '#ff5a4a'};

async function drawArt(s) {
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, W, H);
  if (!s.art?.src) return;
  const im = await loadImg(s.art.src);
  if (!im) return;
  const w = s.art.w, h = w * im.naturalHeight / im.naturalWidth;
  ctx.drawImage(im, s.art.x, s.art.y, w, h);
}

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  await document.fonts.ready;
  if (db) {
    const illustration = S.art?.src ? await loadImg(S.art.src) : null;
    const art = illustration ? {...S.art,src:new URL(S.art.src,location.href).href,h:S.art.w*illustration.naturalHeight/illustration.naturalWidth} : null;
    const composed = publishedScene(displayCard(buildCard()), {project:S,art,assetRects:P,mode:'print'});
    if (composed) {
      const rendered = await sceneCanvas(composed,{allowOverflow:true});
      if (seq !== renderSeq) return;
      ctx.clearRect(0,0,W,H);ctx.drawImage(rendered,0,0,W,H);updateLivePreview();
      if(composed.warnings.length)say(composed.warnings.map(w=>w.message).join(' '),true);
      return;
    }
  }
  // pré-carrega tudo antes de desenhar, para o frame sair inteiro
  const L = structuredClone(T.layouts[layoutKey(S)]);
  // Desenho antigo em PT: só os textos trocam (nome, subtítulo, flavour, tipo, regras); layout e símbolos seguem S.
  const pt = displayCard(buildCard()), V = pt.__pt ? {...S, title: '', nome_exibicao_en: pt.nome_exibicao_en, subtitle: pt.subtitulo_en || pt.tagline_en || S.subtitle, flavour: pt.flavour_en || S.flavour} : S;
  scrimTop = undefined;
  if (layoutKey(S) === 'god') { const g = godFaceLayout(L, pt, godFace); L.elements = g.layout.elements; scrimTop = g.top; }
  await Promise.all([S.art?.src && loadImg(S.art.src), loadImg(pieceSrc(symbolKey(S.faccao))),
    ...Object.keys(P).map((k) => loadImg(pieceSrc(k)))]);
  if (seq !== renderSeq) return;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  for (const el of L.elements) {
    switch (el.kind) {
      case 'art': await drawArt(S); break;
      case 'frame': await drawFrame(); break;
      case 'piece': await drawPiece(el.piece, el); break;
      case 'symbol': {
        const im = await loadImg(pieceSrc(symbolKey(S.faccao)));
        if (!im) break;
        const [x, y, w, h] = el.rect, k = Math.min(w / im.naturalWidth, h / im.naturalHeight);
        const dw = im.naturalWidth * k, dh = im.naturalHeight * k;
        paint(true, 0.92, () => ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh));
        break;
      }
      case 'cost': {
        if (!has(S.custo) || S.tipo === 'Domain' || S.tipo === 'God') break;
        const key = S.cosmoble ? 'athena/gem_cost' : 'athena/gem_cost_base';
        const p = P[key];
        const g = await drawGlowPiece(key, { dx: el.x - p.w / 2 - p.x, dy: el.y - p.h / 2 - p.y });
        if (g) drawText(String(S.custo), 'number', g.cx, g.cy, el.size, 200, true);
        break;
      }
      case 'band': {
        // Faixa de bônus da Armor (autor, 30/10/2026): "+1 ATK / +5 HP" com as cores dos atributos do Devotee.
        const parts = armorBonusText({ ...buildCard(), bonus_poder: Number(S.bonusPower) || 0, bonus_vida: Number(S.bonusResistance) || 0 })?.split(' / ');
        if (!parts) break;
        ctx.save();
        ctx.font = T.styles.number.font.replace('{s}', el.size);
        const sep = '  /  ', widths = parts.map((p) => ctx.measureText(p).width), sw = ctx.measureText(sep).width;
        const total = widths.reduce((a, b) => a + b, 0) + sw * (parts.length - 1), padX = el.size * 0.9, h = el.size * 1.5;
        ctx.beginPath(); ctx.roundRect(el.x - total / 2 - padX, el.y - h / 2, total + padX * 2, h, h / 2);
        ctx.fillStyle = '#100e16e6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#bfa66e'; ctx.stroke();
        ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        let x = el.x - total / 2;
        parts.forEach((p, i) => {
          if (i) { ctx.fillStyle = '#bfa66e'; ctx.fillText(sep, x, el.y); x += sw; }
          ctx.lineWidth = el.size * 0.12; ctx.strokeStyle = '#141008'; ctx.strokeText(p, x, el.y);
          ctx.fillStyle = /ATK$/.test(p) ? '#7fd8ff' : '#ffb347'; ctx.fillText(p, x, el.y); x += widths[i];
        });
        ctx.restore();
        break;
      }
      case 'gem': {
        const field={equip:'equipar_custo',damage:'damage_cloth'}[el.field]||el.field;
        if(field==='damage_cloth'&&['2.0','2.1'].includes(S.revisao_regras))break;
        const v=field==='resistance'&&has(S.vida)?S.vida:S[field];
        if (!has(v)) break;
        const g = await drawGlowPiece(el.piece, el);
        if (!g) break;
        if (el.label) {
          drawText(el.label, 'label', g.cx, g.cy - 46, 24, 140);
          drawText(String(v), 'number', g.cx, g.cy + 17, el.size, 120, true);
        } else drawText(String(v), 'number', g.cx, g.cy, el.size, 150, true);
        break;
      }
      case 'text': {
        let v = el.value ? el.value : el.field === 'typeLine' ? typeLine(S, L.typeLine, typeWord) : el.field === 'name' ? V.nome_exibicao_en : V[el.field];
        if (!has(v)) break;
        v = String(v).trim();
        drawText(el.upper ? v.toUpperCase() : v, el.style, el.x, el.y, el.size, el.maxW);
        break;
      }
      case 'rules': await drawRules(el, S, pt.__pt ? pt : null); break;
      case 'rarity': {
        // Rodapé de edição (autor, 31/10/2026; igual a shared/live-card.js): raridade • DOC • EN • artista • © ano SSTCG.
        const key = `athena/rarity_${S.raridade.toLowerCase()}`, p = P[key], size = 30, gh = size * 1.35, gw = p ? p.w * gh / p.h : 0;
        const ed = editionOf(S), parts = [ed.code, lang() === 'pt' ? 'PT' : ed.language, (S.artista || '').trim().toUpperCase(), `© ${ed.year} SSTCG`].filter(Boolean), sep = '  •  ';
        ctx.save();
        // Delicado (autor, 31/10/2026): fino, espaçado e translúcido para não brigar com o flavour.
        ctx.font = `400 ${size}px Avenir, 'Avenir Next', sans-serif`;
        ctx.letterSpacing = `${size * 0.14}px`;
        ctx.textAlign = 'left';
        const text = parts.join(sep), tw = ctx.measureText(text).width, gap = p ? ctx.measureText(sep).width : 0;
        let x = el.x - (gw + gap + tw) / 2;
        if (p) { await drawPiece(key, { rect: [x, el.y - gh / 2, gw, gh] }); x += gw; ctx.fillStyle = '#f4efe6b3'; ctx.textBaseline = 'middle'; ctx.fillText(sep, x, el.y); x += gap; }
        ctx.textBaseline = 'middle'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillStyle = '#f4efe6b8'; ctx.fillText(text, x, el.y);
        ctx.restore();
        break;
      }
    }
    if (seq !== renderSeq) { ctx.restore(); return; }
  }
  ctx.restore();
  updateLivePreview();
}

// ---------- formulário ----------
const NUM = ['custo', 'power', 'vida', 'resistance', 'equipar_custo', 'equipar_custo_ressonante', 'equipar_custo_outros', 'damage_cloth', 'soul', 'attack', 'awaken'];

function renderStageEditor(){
  const host=$('#stageEditor');host.replaceChildren();
  S.estagios.forEach((stage,index)=>{
    const row=document.createElement('div');row.className='stage-row';
    for(const [key,label] of [['nome','Estágio'],['custo','Evolve'],['bonus_poder','Bônus Power'],['bonus_vida','Bônus HP']]){
      const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type=key==='nome'?'text':'number';input.value=stage[key]??'';input.disabled=index===0&&['nome','custo'].includes(key);input.setAttribute('aria-label',`${label} ${index+1}`);
      input.addEventListener('input',()=>{stage[key]=key==='nome'?input.value:input.value===''?null:Number(input.value);if(index===0){S.bonusPower=`+${stage.bonus_poder||0}`;S.bonusResistance=`+${stage.bonus_vida||0}`;}rememberEdit('stage:'+index+':'+key);render();});l.append(input);row.append(l);
    }
    if(index){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=Boolean(stage.exige_sequencia);label.append(input,' Exigir estágio anterior');input.addEventListener('change',()=>{stage.exige_sequencia=input.checked;rememberEdit('stage-sequence:'+index);render();});row.append(label);}
    host.append(row);
  });
  $('#previewStage').replaceChildren(...(S.estagios.length?S.estagios:[{nome:'Vanilla'}]).map((s,i)=>new Option(s.nome,String(i))));
}
$('#addStage').addEventListener('click',()=>{if(S.estagios.length>=4)return;S.estagios.push({nome:S.estagios.length?'New stage':'Vanilla',custo:S.estagios.length?1:null,bonus_poder:0,bonus_vida:0,keywords_en:[],habilidades_en:[]});renderStageEditor();rememberEdit();render();});
let livePreviewRevision=0;
async function updateLivePreview(){
  const revision=++livePreviewRevision;
  const live=$('#representation').value==='live';$('#livePreview').hidden=!live;$('#liveControls').hidden=!live;$('#cardWrap').hidden=live;
  const c=buildCard();
  $('#rulesReview').textContent=c.motor_revisao_pendente?'Texto alterado: os efeitos jogáveis precisam de revisão antes de usar esta carta numa partida.':validateCard(c).join(' · ');
  // Aviso de acessibilidade (autor, 31/10/2026): texto que não cabe a 100% ganha rolagem no jogo.
  if(rulesOverflow(renderLiveCard(c,{art:S.art?.src}))||c.tipo==='God'&&rulesOverflow(renderLiveCard(c,{art:S.art?.src,face:'back'})))$('#rulesReview').textContent=[$('#rulesReview').textContent,'Texto de regras não cabe a 100%: no jogo ganha rolagem dentro do frame (encurte o texto para ler sem rolar).'].filter(Boolean).join(' · ');
  if(!live)return;
  const simulationCards=[...db.cartas.filter(card=>card.id!==c.id),c];
  try{
    const result=await simulateCard(simulationCards,c,{mode:'battlefield',damage:Number($('#previewDamage').value)||0,stage:Number($('#previewStage').value)||0,prepared:$('#previewPrepared').checked});
    if(revision!==livePreviewRevision)return;
    $('#livePreview').innerHTML=renderLiveCard(c,{art:S.art?.src,stats:result.stats,instance:result.instance,face:godFace});
  }catch{
    if(revision===livePreviewRevision)$('#livePreview').innerHTML=renderLiveCard(c,{art:S.art?.src,face:godFace});
  }
}
// Mede a carta viva fora da tela: o texto de regras transborda a caixa do layout?
function rulesOverflow(html){
  let box=document.getElementById('overflowProbe');
  if(!box){box=document.body.appendChild(document.createElement('div'));box.id='overflowProbe';box.setAttribute('aria-hidden','true');box.style.cssText='position:absolute;left:-9999px;top:0;width:372px;container-type:inline-size;visibility:hidden';}
  box.innerHTML=html;
  return [...box.querySelectorAll('.lc-rules')].some(r=>r.scrollHeight>r.clientHeight+1);
}
for(const id of ['representation','previewDamage','previewPrepared','previewStage'])$('#'+id).addEventListener('input',updateLivePreview);

let refreshRulesRows = () => {};
function fillForm() {
  for (const [k, v] of Object.entries(S)) {
    const f = form.elements[k];
    if(f){if(f.type==='checkbox')f.checked=Boolean(v);else f.value=v??'';}
  }
  $('#artZoom').value = S.art?.zoom ?? 1;
  refreshRulesRows();syncVisibility();renderStageEditor();
}

// God: Awaken e Ultimate em nome + texto, como as outras habilidades (autor, 02/11/2026). O textarea escondido segue sendo o dado.
function mountGodBlock(sel, field, kind) {
  const box = $(sel), area = form.elements[field], isUlt = kind === 'Ultimate';
  const RE = isUlt ? /^(.+?) — Ultimate\n(?:Cost: \{(\d+|X)\}\{C\}\n)?([\s\S]*)$/ : /^(.+?) — Awaken \d*\n([\s\S]*)$/;
  box.innerHTML = `<h3 class="rr-head">${kind}</h3><div class="god-block__head"><input class="rr-name" placeholder="Nome (${kind})" aria-label="Nome do ${kind}">${isUlt ? '<label class="god-cost">Custo {C} <input class="god-cost__n" inputmode="numeric" aria-label="Custo do Ultimate"></label>' : ''}</div><textarea class="rr-text" rows="4" spellcheck="true" placeholder="Texto" aria-label="Texto do ${kind}"></textarea>`;
  const name = box.querySelector('.rr-name'), text = box.querySelector('.rr-text'), cost = box.querySelector('.god-cost__n');
  const compose = () => {
    const body = text.value.trim().replace(/(\d+|X) \{([BCLS])\}/g, '{$1}{$2}');
    if (!name.value.trim()) return body;
    return isUlt ? `${name.value.trim()} — Ultimate\n${cost.value.trim() ? `Cost: {${cost.value.trim()}}{C}\n` : ''}${body}` : `${name.value.trim()} — Awaken ${S.awaken ?? ''}\n${body}`;
  };
  box.addEventListener('input', () => { area.value = compose(); area.dispatchEvent(new Event('input', {bubbles: true})); });
  form.elements.awaken?.addEventListener('input', () => { if (!isUlt && name.value.trim()) { area.value = compose(); area.dispatchEvent(new Event('input', {bubbles: true})); } });
  return () => {
    if (box.contains(document.activeElement)) return;
    const m = (area.value || '').match(RE);
    name.value = m ? m[1] : '';
    if (cost) cost.value = m ? m[2] || '' : '';
    text.value = m ? m[isUlt ? 3 : 2] : area.value || '';
  };
}

// Equipment System V1: subtipos vêm do registro; marcar traz a dependência e o campo de texto continua sendo o dado.
const esc=(t)=>String(t).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EQ_GROUPS=[['Família',['armor']],['Arma',['weapon','weapon_kind']],['Instrumento',['instrument','instrument_kind']],['Objeto',['object']]];
// Auditoria V2: só propõe. Aceitar preenche a patente como um clique normal; o catálogo só muda pelo diff do Gravar.
let audit={},drawFinder=()=>{};
const EQ_SPECIAL={SKELETON_ARMOR:'Skeleton Armor'};
const EQ_MARKS={CRACKED:['Condição','Cracked','Só identifica a carta; não define a patente.']};
const unsavedRank=()=>orig&&(S.patente_armadura||'')!==(orig.patente_armadura||'');
function goToCard(id){
  if(unsavedRank())return say('Grave a patente ou desfaça antes de trocar de carta.',true);
  $('#cardSelect').value=id;
  return selectCard(id);
}
function auditBox(){
  const a=orig&&auditOf(orig,audit);
  if(!a)return '';
  const queue=reviewQueue(db.cartas,audit),i=queue.findIndex((c)=>c.id===orig.id),go=(c,label,title)=>c?`<button type="button" class="eq-chip" data-eq-go="${esc(c.id)}" title="${title}">${label}</button>`:'';
  const nav=!queue.length?'':i<0?go(queue[0],`Ir para a fila (${queue.length})`,'Primeira armadura da fila de revisão'):`${go(queue[(i-1+queue.length)%queue.length],'‹','Armadura anterior da fila')}<span>${i+1} de ${queue.length}</span>${go(queue[(i+1)%queue.length],'›','Próxima armadura da fila')}`;
  const accept=!orig.patente_armadura&&a.patente&&S.patente_armadura!==a.patente?`<button type="button" class="eq-chip" data-eq-rank="${esc(a.patente)}">Aceitar proposta: ${esc(a.patente)}</button>`:'';
  const save=unsavedRank()?'<button type="button" class="eq-chip primary" data-eq-save>Gravar patente…</button>':'';
  return `<div class="eq-audit" data-status="${esc(a.status)}"><div class="eq-audit-head"><b>Auditoria V2: ${esc(AUDIT_STATUS[a.status]||a.status)}</b><div class="eq-audit-nav">${nav}</div></div><p class="hint">${esc(a.motivo)}</p>${accept||save?`<div class="eq-chips">${accept}${save}</div>`:''}</div>`;
}
function drawEqSubtypes(){
  const box=$('#eqSubtypes'),isEq=S.tipo==='Equipment';
  box.hidden=!isEq;
  form.elements.subtipos.closest('label').hidden=isEq;
  if(!isEq)return;
  const noted=orig&&orig.id===S.id?audit[orig.id]:null,special=EQ_SPECIAL[noted?.especial];
  const card={tipo:'Equipment',subtipos:list(S.subtipos),patente_armadura:S.patente_armadura||undefined},on=printedSubtypes(card.subtipos),{errors,warnings:allWarnings}=validateEquipmentSubtypes(card),ranks=special?[]:patentesDe(card.subtipos);
  const warnings=special?[]:allWarnings; // especial não se converte em família: a sugestão do registro não vale aqui
  const chip=(t)=>`<button type="button" class="eq-chip" data-eq-sub="${esc(t.name)}" aria-pressed="${on.includes(t.name)}"${t.name==='Armor'?' title="Armadura fora das cinco famílias"':''}>${esc(t.name)}</button>`;
  const shown=(t)=>on.includes(t.name)||!t.requires.length||t.requires.every((r)=>on.some((n)=>n.toUpperCase()===r));
  const old=on.filter((n)=>!EQUIPMENT_SUBTYPES.some((t)=>t.name===n&&t.status==='approved')).map((name)=>({name}));
  const row=(label,html)=>`<div class="eq-group"><span>${label}</span><div class="eq-chips" translate="no">${html}</div></div>`;
  const tag=(text,title)=>`<span class="eq-tag"${title?` title="${esc(title)}"`:''}>${esc(text)}</span>`,mark=EQ_MARKS[noted?.condicao||noted?.qualificador];
  box.innerHTML=`<div class="eq-head"><b>Classificação</b><output class="eq-line" translate="no">${esc(formatCardTypeLine(card).toUpperCase())}</output></div>${auditBox()}`
    +EQ_GROUPS.map(([label,kinds])=>row(label,EQUIPMENT_SUBTYPES.filter((t)=>kinds.includes(t.kind)&&shown(t)).map(chip).join(''))
      +(label==='Família'&&ranks.length?row('Patente',['',...ranks].map((p)=>`<button type="button" class="eq-chip" data-eq-rank="${p}" aria-pressed="${(S.patente_armadura||'')===p}">${p||'Nenhuma'}</button>`).join('')):'')+(label==='Família'?(special?row('Especial',(old.some((t)=>t.name===special)?'':tag(special))+old.map(chip).join('')+'<small>Sem patente.</small>'):'')+(mark?row(mark[0],tag(mark[1])+`<small>${mark[2]}</small>`):''):'')).join('')
    +(!special&&old.length?row('Anterior ao V1',old.map(chip).join('')):'')
    +[...errors.map((m)=>`<p class="eq-error" role="alert">${esc(m)}</p>`),...warnings.map((m)=>`<p class="hint">${esc(m)}</p>`)].join('');
}
form.elements.patente_armadura.innerHTML=[...new Set(['',...Object.values(PATENTES_ARMADURA).flat(),...Object.values(PATENTES_FORA_DA_ESCALA).flat()])].map((p)=>`<option value="${p}">${p||'—'}</option>`).join('');
$('#eqSubtypes').addEventListener('click',(e)=>{
  const target=e.target.closest('[data-eq-go]');
  if(target)return void goToCard(target.dataset.eqGo);
  if(e.target.closest('[data-eq-save]'))return void $('#saveCards').click();
  const rank=e.target.closest('[data-eq-rank]');
  if(rank){const f=form.elements.patente_armadura;f.value=rank.dataset.eqRank;f.dispatchEvent(new Event('input',{bubbles:true}));drawEqSubtypes();return;}
  const b=e.target.closest('[data-eq-sub]');if(!b)return;
  const f=form.elements.subtipos;f.value=toggleSubtype(list(f.value),b.dataset.eqSub).join(', ');
  const r=form.elements.patente_armadura;
  if(r.value&&!patentesDe(list(f.value)).includes(r.value)){r.value='';r.dispatchEvent(new Event('input',{bubbles:true}));}
  f.dispatchEvent(new Event('input',{bubbles:true}));
});

function syncVisibility() {
  const lk = layoutKey(S);
  form.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(lk); });
  $('#godFlip').hidden = lk !== 'god';
  $('#rulesV2').hidden=!isEquipment({...S,subtipos:list(S.subtipos)});
  drawEqSubtypes();
  syncPtStatus();
}

form.addEventListener('input', (e) => {
  const f = e.target;
  if (!(f.name in S)) return;
  S[f.name] = f.type==='checkbox'?f.checked:f.value;
  if(S.estagios.length&&['bonusPower','bonusResistance'].includes(f.name))S.estagios[0][f.name==='bonusPower'?'bonus_poder':'bonus_vida']=Number(f.value)||0;
  if(['tipo','subtipos'].includes(f.name)){if(isEquipment({...S,subtipos:list(S.subtipos)})&&!has(S.equipar_custo)){S.equipar_custo='1';form.elements.equipar_custo.value='1';}syncVisibility();}
  rememberEdit('field:'+f.name);render();
});

// ---------- carregar carta ----------
function fromCard(c, proj = {}) {
  const s = blankState();
  for (const k of Object.keys(s)) if (k in c && c[k] !== null) s[k] = c[k];
  s.subtitle=c.tagline_en||c.subtitulo_en||''; // V6 canonical subtitle
  Object.assign(s,{pt_nome:c.nome_exibicao_pt||'',pt_subtitulo:c.subtitulo_pt||c.tagline_pt||'',pt_rules:(c.habilidades_pt||[]).join('\n\n'),pt_awaken:c.habilidade_awaken_pt||'',pt_ultimate:c.ultimate_pt||'',pt_flavour:c.flavour_pt||'',pt_auto:c.auto_equip_pt||[]});
  s.revisao_regras=c.revisao_regras||'1.0';
  s.referencias_mitologicas_texto=(c.referencias_mitologicas||[]).join('\n');
  s.donos=(c.donos||[]).join(', ');s.estagios=structuredClone(c.estagios||[]);s.resonanceText=(c.ressonancias||[]).map(r=>`${r.personagem_id} | ${r.habilidade_en}`).join('\n');
  const stage=c.estagios?.[0],printed=printedEquipmentBonuses(c);if(isEquipment(c)){s.bonusPower=signedBonus(printed.power)??'';s.bonusResistance=signedBonus(printed.hp)??'';}
  s.auto_equip=(c.auto_equip_en||[]).join(' / ');if(c.equipar_custo_outros!=null&&c.equipar_custo==null)s.equipar_custo=c.equipar_custo_outros; // Armor: Equip único
  s.subtipos = (c.subtipos || []).join(', ');
  s.patente_armadura = c.patente_armadura || '';
  s.keywords = (c.keywords_en || []).join(', ');
  gen = (c.habilidades_en || []).map((text) => ({ text, markup: toMarkup(text) }));
  s.rules = gen.map((g) => g.markup).join('\n\n');
  const unboxed = keywordsWithoutBox(s);
  if (unboxed) { gen.push({ text: unboxed, markup: unboxed }); s.rules = gen.map((g) => g.markup).join('\n\n'); }
  const bonus = (c.habilidades_en || []).join(' ').match(/gets ([+-]\d+)\/([+-]\d+)/);
  if (bonus && c.tipo === 'Relic') { s.bonusPower = bonus[1]; s.bonusResistance = bonus[2]; }
  // Armor (30/10/2026): bônus vem de bonus_poder/bonus_vida do cards.json, não do projeto visual antigo.
  const armorBonus = c.bonus_poder != null || c.bonus_vida != null ? { bonusPower: signedBonus(c.bonus_poder || 0), bonusResistance: signedBonus(c.bonus_vida || 0) } : {};
  Object.assign(s, proj, { subtitle: (typeof proj.subtitle==='string' && proj.subtitle.trim())?proj.subtitle:s.subtitle, art: proj.art || null }, armorBonus);
  if(c.habilidades_pt||c.nome_exibicao_pt)s.ptFor=enKey(c,s); // PT atual corresponde a este EN
  return s;
}

let selectionRevision=0;
async function selectCard(id) {
  const revision=++selectionRevision;
  const c = db.cartas.find((x) => x.id === id);
  if (!c) return;
  let proj = {};
  // Read the persisted project directly from disk on every selection. The runtime
  // metadata endpoint may be unavailable on an old server or on static hosting.
  // Bust browser cache so edits are never replaced by an earlier response.
  try {
    const response=await fetch(`projects/${encodeURIComponent(id)}.json?read=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)await response.arrayBuffer();
    if(response.ok){
      proj=await response.json();
      if(proj.art?.src?.startsWith('card-forge/'))proj.art.src='../'+proj.art.src;
    }else proj=structuredClone(visualProject(id));
  }catch{proj=structuredClone(visualProject(id));}
  if(proj.art?.src?.startsWith('card-forge/'))proj.art.src='../'+proj.art.src;
  if(revision!==selectionRevision)return;
  const previousGenerated=gen,next=fromCard(c,proj),generated=gen;gen=previousGenerated;
  if(!next.art&&illustration(c)){const im=await loadImg(illustration(c));if(im){next.art={src:illustration(c)};coverArt(im,next.art);}}
  if (!next.art && c.caminho_imagem) {
    const src = `../ARTS/${c.caminho_imagem.split('/').pop()}`;
    const im = await loadImg(src);
    if (im) { next.art = { src }; coverArt(im,next.art); }
  }
  if(revision!==selectionRevision)return;
  // Publicar seleção e histórico juntos evita apagar uma edição enquanto a arte carrega.
  orig=c;gen=generated;S=next;
  fillForm();resetEditHistory();
  setRef(c.caminho_imagem ? `../${c.caminho_imagem}` : null);
  say(S.art ? `${c.id} carregada` : `${c.id} carregada — sem arte, envie uma imagem`);
  drawFinder();
  render();
}

function newCard() {
  selectionRevision++;
  orig = null;
  gen = [];
  const prefix = S.faccao.toLowerCase();
  const nums = db.cartas.map((c) => c.id.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  S = blankState();
  S.faccao = prefix === 'athena' || !prefix ? 'Athena' : S.faccao;
  S.id = `${S.faccao.toLowerCase()}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
  S.nome_exibicao_en = 'New Card';
  $('#cardSelect').value = '';
  fillForm();resetEditHistory();
  drawFinder();
  setRef(null);
  say(`nova carta ${S.id}`);
  render();
}

// ---------- arte: upload, pan, zoom ----------
function coverArt(im, art = S.art) {
  const k = Math.max(W / im.naturalWidth, H / im.naturalHeight);
  art.w = im.naturalWidth * k;
  art.x = (W - art.w) / 2;
  art.y = (H - im.naturalHeight * k) / 2;
  art.zoom = 1;
  art.baseW = art.w;
  if (art === S.art) $('#artZoom').value = 1;
}

function readArt(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const r = new FileReader();
  r.onload = async () => {
    S.art = { src: r.result, uploaded: true };
    coverArt(await loadImg(r.result));
    rememberEdit();render();
    say(`arte: ${file.name}`);
  };
  r.readAsDataURL(file);
}
$('#artFile').addEventListener('change', (e) => readArt(e.target.files[0]));
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drop'); });
canvas.addEventListener('dragleave', () => canvas.classList.remove('drop'));
canvas.addEventListener('drop', (e) => { e.preventDefault(); canvas.classList.remove('drop'); readArt(e.dataTransfer.files[0]); });

const toCanvas = (e) => {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
};

function zoomArt(factor, cx = W / 2, cy = H / 2) {
  if (!S.art?.w) return;
  const a = S.art, nw = Math.max(200, a.w * factor), f = nw / a.w;
  a.x = cx - (cx - a.x) * f;
  a.y = cy - (cy - a.y) * f;
  a.w = nw;
  a.zoom = a.w / (a.baseW || a.w);
  $('#artZoom').value = a.zoom;
  rememberEdit('art:zoom');render();
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!S.art?.w) return;
  drag = { p: toCanvas(e), x: S.art.x, y: S.art.y };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = toCanvas(e);
  S.art.x = drag.x + x - drag.p[0];
  S.art.y = drag.y + y - drag.p[1];
  render();
});
const endDrag = () => { if(!drag)return;drag = null; canvas.classList.remove('dragging');rememberEdit(); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomArt(Math.exp(-e.deltaY * 0.0015), ...toCanvas(e)); }, { passive: false });
$('#artZoom').addEventListener('input', (e) => {
  if (!S.art?.w) return;
  if (!S.art.baseW) S.art.baseW = S.art.w / (S.art.zoom || 1);
  zoomArt((S.art.baseW * Number(e.target.value)) / S.art.w);
});
$('#artCover').addEventListener('click', async () => { if (S.art?.src) { coverArt(await loadImg(S.art.src));rememberEdit(); render(); } });

// ---------- referência ----------
function setRef(src) {
  const ref = $('#ref');
  if (src) ref.src = src; else ref.removeAttribute('src');
  $('#refToggle').disabled = !src;
  ref.hidden = !src || !$('#refToggle').checked;
}
$('#refToggle').addEventListener('change', () => { $('#ref').hidden = !$('#refToggle').checked || !$('#ref').getAttribute('src'); });
$('#refOpacity').addEventListener('input', (e) => { $('#ref').style.opacity = e.target.value; });
$('#ref').style.opacity = $('#refOpacity').value;
$('#viewSize').addEventListener('change', (e) => { document.body.className = `view-${e.target.value}`; });
document.body.className = `view-${$('#viewSize').value}`;

// ---------- export ----------
const fileBase = () => (S.id || 'card');
async function download(c, name) {
  const composed=db?publishedScene(displayCard(buildCard()),{project:S,mode:'print'}):null;
  if(composed?.warnings.some(w=>w.kind==='overflow'))return say('Texto excede o layout publicado. Ajuste as caixas no Layout Studio antes de exportar.',true);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Idioma da carta na prévia e na exportação (autor, 31/10/2026): EN ou PT (campos *_pt); o arquivo PT ganha -pt.
forceLang('en');
const langSuffix = () => ($('#cardLang').value === 'pt' ? '-pt' : '');
$('#cardLang').addEventListener('change', () => { forceLang($('#cardLang').value); render(); });
// Menus Arte e Salvar do topo: um aberto por vez; fecham ao clicar fora e no Esc. Salvar fecha também ao escolher a ação.
const topMenus = [...document.querySelectorAll('.forge-drop')];
document.addEventListener('click', (e) => topMenus.forEach((m) => { if (m.open && (!m.contains(e.target) || (m.matches('.forge-drop--save') && e.target.closest('button')))) m.open = false; }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') topMenus.forEach((m) => { m.open = false; }); });
const openArtPrompt = mountArtPrompt($('#artPromptDialog'), {getCard: () => buildCard(), getCards: () => db.cartas, say, masterUrl: 'art-master-prompt.md?v=20261102-1'});
$('#artPrompt').addEventListener('click', () => { $('.forge-drop--art').open = false; openArtPrompt(); });
$('#exportXlsx').addEventListener('click', () => { // catálogo gravado: edição ainda não salva fica de fora
  const blob = new Blob([cardsToXlsx(db.cartas)], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: `saint-seiya-cartas-${new Date().toISOString().slice(0, 10)}.xlsx`});
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say(`Excel com ${db.cartas.length} cartas exportado.`);
});
// God exporta as duas faces: a frente com o nome de sempre, o verso com -verso.
async function eachFace(save) {
  const keep = godFace;
  for (const face of layoutKey(S) === 'god' ? ['front', 'back'] : [keep]) { godFace = face; await render(); await save(face === 'back' ? '-verso' : ''); }
  godFace = keep; await render();
}
$('#godFlip').addEventListener('click', () => { godFace = godFace === 'back' ? 'front' : 'back'; $('#godFlip').textContent = godFace === 'back' ? 'Ver a frente do God' : 'Ver o verso do God'; render(); });
$('#exportHi').addEventListener('click', () => eachFace(async (face) => { await download(canvas, `${fileBase()}${face}${langSuffix()}.png`); say('PNG 1488×2091 exportado'); }));
$('#exportWeb').addEventListener('click', () => eachFace(async (face) => {
  const w = 1100, h = Math.round(w * H / W);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, w, h);
  download(c, `${fileBase()}${face}${langSuffix()}-web.png`);
  say(`PNG web ${w}×${h} exportado`);
}));

// ---------- salvar ----------
async function post(url, body, type = 'application/json') {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `HTTP ${r.status} — rode python3 card-forge/serve.py`);
  return j;
}

async function saveVisualProject(){
  if(!S.id)throw new Error('Carta sem ID.');
  const art=S.art?{...S.art}:null;
  if(art?.uploaded){
    const image=await loadImg(art.src);
    if(!image)throw new Error('Não foi possível carregar a arte antes de salvar.');
    const blob=await new Promise(resolve=>{
      const cv=Object.assign(document.createElement('canvas'),{width:image.naturalWidth,height:image.naturalHeight});
      cv.getContext('2d').drawImage(image,0,0);
      cv.toBlob(resolve,'image/png',.95);
    });
    if(!blob)throw new Error('Falha ao converter a imagem.');
    const result=await post(`/api/art/${S.id}`,blob,'image/png');
    art.src=result.path.replace(/^card-forge\//,'');
    delete art.uploaded;
  }
  const proj={title:S.title,subtitle:S.subtitle,flavour:S.flavour,bonusPower:S.bonusPower,bonusResistance:S.bonusResistance,art};
  await post(`/api/project/${S.id}`,JSON.stringify(proj));
  // Persisted data must be confirmed via GET before claiming successful save.
  const readback=await fetch(`projects/${encodeURIComponent(S.id)}.json?verify=${Date.now()}`,{cache:'no-store'});
  if(!readback.ok)throw new Error(`Projeto gravado, mas a leitura falhou (HTTP ${readback.status}).`);
  const persisted=await readback.json();
  if(JSON.stringify(persisted)!==JSON.stringify(proj))throw new Error('O servidor não devolveu o mesmo projeto salvo. Confira a pasta local.');
  S.art=art?{...art}:null;
  return proj;
}

let pendingSaveBoth=false;
$('#saveProject').addEventListener('click',async()=>{
  try{
    if(!S.id)throw new Error('Carta sem ID.');
    const ptNote=await ensurePt();
    const current=buildCard(),changes=diffCards(orig,current);
    const eqErrors=validateEquipmentSubtypes(current).errors;
    if(eqErrors.length)throw new Error(eqErrors.join(' · '));
    if(changes.length){
      pendingSaveBoth=true;pending=current;
      $('#diffTarget').textContent=`${S.id}: salvar dados da carta + visual (confirmação necessária)`+ptNote;
      const body=$('#diffBody');
      body.replaceChildren(...changes.flatMap(({k,x,y})=>{
        const before=Object.assign(document.createElement('div'),{className:'del',textContent:`- ${k}: ${x}`});
        const after=Object.assign(document.createElement('div'),{className:'add',textContent:`+ ${k}: ${y}`});
        return orig?[before,after]:[after];
      }));
      $('#diffDialog').showModal();return;
    }
    await saveVisualProject();
    say(`✓ ${S.id}: salvo no Mac. Publicando no Playtest…`);
    await post('/api/publish-visuals','{}');
    say(`✓ ${S.id}: arte publicada no Playtest, com zoom e posição.`);
  }catch(e){say(`Falha ao salvar: ${e.message}`,true);}
});

function buildCard() {
  const source=S.importBase||orig;
  const base = source ? structuredClone(source) : Object.fromEntries(Object.keys(db.cartas[0] || {}).map((k) => [k, null]));
  const n = (v) => (has(v) ? Number(v) : null);
  const paras = splitParas(S.rules);
  let habilidades = paras.map((md, i) => (gen[i] && gen[i].markup === md ? gen[i].text : fromMarkup(md)));
  let keywords = cardKeywords(S);
  // Só a caixa da keyword mudou de forma ou lugar: mantém os campos da carta como estavam, sem diff à toa.
  const abilities = (texts) => JSON.stringify((texts || []).filter((t) => !keywordsOfLine(t)));
  const sameKeywords = source && [...keywords].sort().join() === [...(source.keywords_en || [])].sort().join();
  if (sameKeywords && abilities(habilidades) === abilities(source.habilidades_en)) {
    habilidades = source.habilidades_en;
    keywords = source.keywords_en || [];
  }
  Object.assign(base, {
    id: S.id, nome_exibicao_en: S.nome_exibicao_en.trim(), faccao: S.faccao, tipo: S.tipo,
    subtipos: list(S.subtipos), raridade: S.raridade, keywords_en: keywords, habilidades_en: habilidades,
  });
  if (!source) Object.assign(base, { nome_interno_pt: '', status: 'needs-review', cosmoble: false, caminho_imagem: null, habilidade_awaken_en: '', ultimate_en: '', notas_pt: '' });
  for(const k of NUM)if(!source||k in source||has(S[k]))base[k]=n(S[k]);
  base.cosmoble=source&&source.cosmoble===null&&!S.cosmoble?null:Boolean(S.cosmoble);
  if(['2.0','2.1'].includes(S.revisao_regras)){
    base.revisao_regras=S.revisao_regras;base.personagem_id=S.personagem_id||null;if(!source||'personagem_unico' in source||S.personagem_unico)base.personagem_unico=Boolean(S.personagem_unico);base.slot_equipamento=S.slot_equipamento||null;base.donos=list(S.donos);base.estagios=structuredClone(S.estagios);
    if(S.origem_personagem||source?.origem_personagem)base.origem_personagem=S.origem_personagem||null;
    if(S.referencias_mitologicas_texto||source?.referencias_mitologicas)base.referencias_mitologicas=S.referencias_mitologicas_texto.split(/\n/).map(t=>t.trim()).filter(Boolean);
    base.ressonancias=S.resonanceText.split(/\n/).map(t=>t.trim()).filter(Boolean).map(t=>{const [id,...parts]=t.split('|'),text=parts.join('|').trim(),old=source?.ressonancias?.find(r=>r.personagem_id===id.trim());return {...(old||{}),personagem_id:id.trim(),habilidade_en:text};});
    if(source&&['estagios','donos'].some(k=>JSON.stringify(base[k])!==JSON.stringify(source[k])))base.habilidades_en=presentationRules(base);
    const mechanicalTextChanged=source&&(JSON.stringify(habilidades)!==JSON.stringify(source.habilidades_en)||JSON.stringify(base.keywords_en)!==JSON.stringify(source.keywords_en)||S.resonanceText!==(source.ressonancias||[]).map(r=>`${r.personagem_id} | ${r.habilidade_en}`).join('\n'));
    if(mechanicalTextChanged||!source)base.motor_revisao_pendente=true;
  }
  // texto com marcação ({L}, **) volta para o formato do cards.json; texto intacto fica como está
  const plain = (v) => costSymbols(/\*\*|(?:\d|X) \{[BCLS]\}/.test(v || '') ? fromMarkup(v) : (v || '').trim()); // texto cru ({5}{C}, quebras de linha) fica como está
  if (S.patente_armadura) base.patente_armadura = S.patente_armadura; else delete base.patente_armadura;
  if (S.tipo === 'God') Object.assign(base, { habilidade_awaken_en: plain(S.habilidade_awaken_en), ultimate_en: plain(S.ultimate_en) });
  // PT-BR (campos *_pt): sai do inglês pelo Claude Code (tools/translate_pt.py); campo vazio sai do cards.json.
  const ptSub=S.pt_subtitulo.trim(),ptVal={nome_exibicao_pt:S.pt_nome.trim(),habilidades_pt:splitParas(S.pt_rules),flavour_pt:S.pt_flavour.trim(),auto_equip_pt:S.pt_auto||[]};
  const subKey=source&&!('subtitulo_pt' in source)&&'tagline_pt' in source?'tagline_pt':'subtitulo_pt'; // carta só com tagline_pt fica assim
  ptVal[subKey]=ptSub;if(subKey==='subtitulo_pt'&&ptSub!==(source?.subtitulo_pt||''))ptVal.tagline_pt=ptSub;
  if(S.tipo==='God')Object.assign(ptVal,{habilidade_awaken_pt:S.pt_awaken.trim(),ultimate_pt:S.pt_ultimate.trim()});
  for(const [k,v] of Object.entries(ptVal)){if(Array.isArray(v)?v.length:has(v))base[k]=v;else delete base[k];}
  if (has(S.artista) || (source && 'artista' in source)) base.artista = (S.artista || '').trim() || null; // rodapé de edição
  if (S.edicao !== EDITIONS[0].code || (source && 'edicao' in source)) base.edicao = S.edicao; // sem campo = DOC
  if (has(base.custo)) base.unidade_custo = S.unidade_custo; else base.unidade_custo = null;
  // Armor (sintaxe de 30/10/2026): bônus em campos, Equip único, Resonance pelos nomes; HP próprio e Equip ressonante não existem.
  if (layoutKey(S) === 'relic_cloth') {
    Object.assign(base, { bonus_poder: Number(S.bonusPower) || 0, bonus_vida: Number(S.bonusResistance) || 0,
      equipar_custo_outros: n(S.equipar_custo), auto_equip_en: (S.auto_equip || '').split('/').map((x) => x.trim()).filter(Boolean) });
    for (const k of ['damage_cloth', 'equipar_auto', 'equipar_custo_ressonante']) delete base[k];
  }
  return base;
}

function diffCards(a, b) {
  const lines = [];
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b)])) {
    const x = JSON.stringify(a?.[k] ?? null), y = JSON.stringify(b[k] ?? null);
    if (x !== y) lines.push({ k, x, y });
  }
  return lines;
}

// Chave do texto EN que gerou o PT: se o EN muda, o PT é regerado ao gravar (autor, 31/10/2026).
function enKey(c,s=S){return JSON.stringify([(c.nome_exibicao_en||'').trim(),s.subtitle||'',c.habilidades_en||[],c.habilidade_awaken_en||'',c.ultimate_en||'',s.flavour||'']);}
async function translatePt(){
  const c=buildCard();
  say('traduzindo do EN…');
  const r=await post('/api/translate',JSON.stringify({...c,tagline_en:S.subtitle,flavour_en:S.flavour})),f=r.campos;
  Object.assign(S,{pt_nome:f.nome_exibicao_pt||'',pt_subtitulo:f.subtitulo_pt||'',pt_rules:(f.habilidades_pt||[]).join('\n\n'),pt_awaken:f.habilidade_awaken_pt||'',pt_ultimate:f.ultimate_pt||'',pt_flavour:f.flavour_pt||'',pt_auto:f.auto_equip_pt||[],ptFor:enKey(c)});
  fillForm();render();
  return r.avisos||[];
}
// Aba Português (autor, 02/11/2026): as habilidades canônicas vêm do inglês, mostrado acima de cada caixa; o texto em PT se corrige à mão.
// Mudou o inglês, o aviso e o botão chamam o Claude Code. Em dia, o botão fica desligado para não apagar a correção manual.
function drawPtRules(){
  const box=$('#ptRules');
  if(box.contains(document.activeElement))return;
  const en=splitParas(S.rules||''),pt=splitParas(S.pt_rules||'');
  box.replaceChildren(...Array.from({length:Math.max(en.length,pt.length)},(_,i)=>{
    const row=document.createElement('div');row.className='pt-rule';
    const base=document.createElement('small');base.textContent=(en[i]||'Sem habilidade correspondente no inglês').replace(/\*\*/g,'');
    const area=Object.assign(document.createElement('textarea'),{value:pt[i]||'',spellcheck:true});
    area.setAttribute('aria-label',`Habilidade ${i+1} em português`);
    row.append(base,area);return row;
  }));
}
$('#ptRules').addEventListener('input',()=>{
  const f=form.elements.pt_rules;
  f.value=[...$('#ptRules').querySelectorAll('textarea')].map(t=>t.value.trim()).filter(Boolean).join('\n\n');
  f.dispatchEvent(new Event('input',{bubbles:true}));
});
function syncPtStatus(){
  const stale=S.ptFor!==enKey(buildCard()),b=$('#translatePt');
  $('#ptStatus').textContent=stale?(S.pt_nome||S.pt_rules?'O inglês mudou: esta tradução está desatualizada.':'Esta carta ainda não tem tradução.'):'Tradução em dia com o inglês.';
  $('#ptStatus').classList.toggle('is-stale',stale);
  b.classList.toggle('primary',stale);
  [...formSubTabs.children].find((t)=>t.textContent==='Português')?.classList.toggle('is-stale',stale); // avisa também de dentro da subaba Inglês
  b.disabled=!stale;
  drawPtRules();
}
form.addEventListener('input',syncPtStatus);
$('#translatePt').addEventListener('click',async(e)=>{
  const b=e.currentTarget,label=b.textContent;
  b.disabled=true;b.textContent='Traduzindo…';
  try{const w=await translatePt();say(w.length?`PT gerado — revise: ${w.join(' ')}`:'PT gerado do EN — grave a carta para salvar.',w.length>0);}
  catch(err){say(err.message,true);}
  finally{b.textContent=label;syncPtStatus();}
});
// Flavour EN → PT ao sair do campo (autor, 02/11/2026), pelo claude do Mac: só esse campo muda e o autor revisa no diff.
let flavourBefore = '';
form.elements.flavour.addEventListener('focus', () => { flavourBefore = S.flavour; });
form.elements.flavour.addEventListener('change', async () => {
  const id = S.id, text = S.flavour.trim(), wasCurrent = S.ptFor === enKey(buildCard(), { ...S, flavour: flavourBefore });
  try {
    if (text) say('traduzindo o flavour…');
    const translated = text ? (await post('/api/translate-flavour', JSON.stringify({ text }))).flavour_pt : '';
    if (S.id !== id || S.flavour.trim() !== text) return; // trocou de carta ou de texto durante a tradução
    form.elements.pt_flavour.value = translated;
    form.elements.pt_flavour.dispatchEvent(new Event('input', { bubbles: true }));
    if (wasCurrent) S.ptFor = enKey(buildCard());
    if (text) say('flavour traduzido — revise antes de gravar.');
  } catch (e) { say(e.message, true); }
});
// Ao gravar: EN mudou desde o PT atual (ou não há PT) → regera e devolve o aviso que vai no diff.
async function ensurePt(){
  if(S.ptFor===enKey(buildCard()))return '';
  try{const w=await translatePt();return w.length?` · PT regerado do EN — revise: ${w.join(' ')}`:' · PT regerado do EN — revise abaixo';}
  catch(e){return ` · PT NÃO regerado (${e.message})`;}
}

let pending = null;
$('#saveCards').addEventListener('click', async () => {
  pendingSaveBoth=false;
  if (!S.id) return say('carta sem id', true);
  const ptNote = await ensurePt();
  pending = buildCard();
  const d = diffCards(orig, pending);
  if (!d.length) return say('nada mudou em relação ao cards.json');
  $('#diffTarget').textContent = (orig ? `Carta ${S.id} (substitui)` : `Carta nova ${S.id} (adiciona ao fim)`) + ptNote;
  const body = $('#diffBody');
  body.replaceChildren(...d.flatMap(({ k, x, y }) => {
    const del = Object.assign(document.createElement('div'), { className: 'del', textContent: `- ${k}: ${x}` });
    const add = Object.assign(document.createElement('div'), { className: 'add', textContent: `+ ${k}: ${y}` });
    return orig ? [del, add] : [add];
  }));
  $('#diffDialog').showModal();
});
$('#diffCancel').addEventListener('click', () => { pendingSaveBoth=false; $('#diffDialog').close(); });
$('#diffConfirm').addEventListener('click', async () => {
  $('#diffDialog').close();
  try {
    await post('/api/card', JSON.stringify(pending));
    if(pendingSaveBoth){
      await saveVisualProject();
      say(`✓ ${pending.id}: salvo no Mac. Publicando arte no Playtest…`);
      await post('/api/publish-visuals','{}');
    }
    const updated=await fetch(`../data/cards.json?verify=${Date.now()}`,{cache:'no-store'});
    if(!updated.ok)throw Error('Não foi possível conferir o catálogo após salvar.');
    db=await updated.json();
    orig=db.cartas.find(c=>c.id===pending.id);
    if(!orig||JSON.stringify(orig)!==JSON.stringify(pending))throw Error('O catálogo não corresponde à versão enviada.');
    gen=(orig.habilidades_en||[]).map(text=>({text,markup:toMarkup(text)}));
    fillCardSelect(orig.id);
    drawFinder();drawEqSubtypes();
    say(pendingSaveBoth?`✓ ${pending.id}: carta + visual gravados e conferidos.`:`✓ ${pending.id}: cards.json gravado e conferido.`);
    pendingSaveBoth=false;
  } catch (e) { say(e.message, true); }
});

// ---------- barra de símbolos e keywords ----------
let lastText = form.elements.rules;
form.addEventListener('focusin', (e) => { if (e.target.tagName === 'TEXTAREA') lastText = e.target; });
const refreshRules = [mountGodBlock('#godAwaken', 'habilidade_awaken_en', 'Awaken'), mountGodBlock('#godUltimate', 'ultimate_en', 'Ultimate'), mountRulesRows(form.elements.rules, {tags: () => (S.tipo === 'God' ? ['Divine Power', 'Divine Command'] : null), getId: () => S.id, sound: $('#soundFields'), resonanceCards: () => {
  const titled = (n) => n.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()), seen = new Set();
  return db.cartas.filter((c) => (c.tipo === 'Devotee' || c.tipo === 'God') && c.nome_exibicao_en)
    .sort((a, b) => (b.faccao === S.faccao) - (a.faccao === S.faccao) || a.nome_exibicao_en.localeCompare(b.nome_exibicao_en))
    .map((c) => ({name: titled(c.nome_exibicao_en), detail: `${c.faccao} · ${c.tipo}`}))
    .filter((o) => !seen.has(o.name) && seen.add(o.name));
}, onResonance: (name) => { // Cada Resonance escolhida entra no campo do Equipment, e o diff mostra antes de gravar
  const f = form.elements.auto_equip, names = f ? f.value.split('/').map((n) => n.trim()).filter(Boolean) : [];
  if (f && !f.closest('[hidden]') && !f.closest('label').hidden && !names.includes(name)) { f.value = [...names, name].join(' / '); f.dispatchEvent(new Event('input', {bubbles: true})); }
}, moments: () => [['cast', 'Ao conjurar'], ['entrada', 'Entrada no campo'], ['declarar', 'Ao declarar ataque'], ['golpe', 'Quando o ataque resolve'], ['strike', 'Ao receber Strike'], ['morte', 'Ao morrer'], ['retorno', 'Volta do Tartarus'], ['carga', 'Barulho: carga do golpe'], ['impacto', 'Barulho: impacto em Devotee'], ['impacto_deus', 'Barulho: impacto no Deus'], ...(layoutKey(S) === 'god' ? [['ultimate', 'Voz da Ultimate'], ['poder_divino', 'Barulho: Poder Divino'], ['poder_dominio', 'Barulho: poder do Domain'], ['awaken', 'Barulho: Awaken']] : [])]})];
refreshRulesRows = () => refreshRules.forEach(r => r());
refreshRulesRows();
function insertAtCursor(text) {
  const t = lastText, a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
  const pre = t.value.slice(0, a), sp = pre && !/\s$/.test(pre) && /^[\w@]/.test(text) ? ' ' : '';
  t.value = pre + sp + text + t.value.slice(b);
  t.focus();
  t.selectionStart = t.selectionEnd = a + sp.length + text.length;
  t.dispatchEvent(new Event('input', { bubbles: true }));
}
// Só @ puxa símbolo (autor, 02/11/2026): a palavra sem @ fica como texto na carta.
for (const [token, label, at] of [['{C}', 'Cosmo', '@COSMO'], ['{B}', 'Base Cosmo', '@BASECOSMO'], ['{L}', 'Latent Cosmo', '@LATENT'], ['{S}', 'Soul', '@SOUL'], ['{T}', 'Tap', '@TAP'], ['{A}', 'ATK', '@ATK'], ['{H}', 'HP', '@HP']]) {
  const b = Object.assign(document.createElement('button'), { type: 'button', title: `${label} ${at}` });
  b.setAttribute('aria-label', `Inserir ${label}`);
  b.append(Object.assign(new Image(), { src: pieceSrc(ICONS[token]), alt: '' }), label);
  b.addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco/cursor do texto
  b.addEventListener('click', () => insertAtCursor(at));
  $('#symbar').append(b);
}
// + Keyword: da linha entra na caixa de keywords (com vírgula); Hidden Cosmo, Afterlife e Imune entram no cursor.
const kwSel = $('#kwSelect');
kwSel.append(...KEYWORDS.map((k) => new Option(k, k)));
$('#symbar').append(kwSel);
function addKeyword(keyword) {
  const boxes = [...form.elements.rules.closest('label').nextElementSibling.querySelectorAll('.rr-text')];
  const focused = boxes.includes(lastText) ? lastText : null;
  if (!LINE_KEYWORDS.includes(keyword) && focused) return insertAtCursor(keyword);
  if (LINE_KEYWORDS.includes(keyword)) {
    if (boxKeywords(form.elements.rules.value).includes(keyword)) return;
    const target = focused && (!focused.value.trim() || keywordsOfLine(focused.value)) ? focused : boxes.find((b) => keywordsOfLine(b.value));
    if (target) {
      target.value = [...(keywordsOfLine(target.value) || []), keyword].join(', ');
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();
      return;
    }
  }
  const area = form.elements.rules;
  area.value = [area.value.trim(), keyword].filter(Boolean).join('\n\n');
  area.dispatchEvent(new Event('input', { bubbles: true }));
  refreshRulesRows();
}
kwSel.addEventListener('change', () => { if (kwSel.value) addKeyword(kwSel.value); kwSel.value = ''; });

// ---------- início ----------
function fillCardSelect(selected) {
  const sel = $('#cardSelect');
  sel.replaceChildren(new Option('— nova carta —', ''), ...db.cartas.map((c) => new Option(`${c.id} · ${c.nome_exibicao_en} (${c.tipo})`, c.id)));
  sel.value = selected || '';
}
$('#cardSelect').addEventListener('change', (e) => (e.target.value ? selectCard(e.target.value) : newCard()));
$('#newCard').addEventListener('click', newCard);
$('#layoutStudioLink').addEventListener('click',e=>{e.currentTarget.href='studio.html?card='+encodeURIComponent(S.id||'');});
window.addEventListener('card-layouts:published',()=>render());

try {
  db = await (await fetch('../data/cards.json')).json();
  try { audit = (await (await fetch('equipment-audit-v2.json?v=20261102-escala1')).json()).cartas; } catch { audit = {}; } // sem a auditoria, a lista funciona sem status
  drawFinder = mountCardFinder($('#cardFinder'), {cards: () => db.cartas, audit, current: () => $('#cardSelect').value, pick: goToCard});
  const query = new URLSearchParams(location.search), requested = query.get('card') || 'athena-002';
  // Edição aberta sem nenhuma carta ainda (STAR HILL): começa em uma carta nova dela.
  const start = query.has('edicao') && !query.has('card') ? null : db.cartas.find(c => c.id === requested)?.id || db.cartas[0]?.id;
  fillCardSelect(start);
  if (start) await selectCard(start); else newCard();
} catch (e) {
  say(`falha ao carregar cards.json: ${e.message}`, true);
}

// Divisória entre o formulário e a prévia: a largura escolhida fica guardada neste navegador.
{
  const bar = document.getElementById('formResizer'), main = bar.parentElement, form = document.getElementById('form'), KEY = 'forge.formWidth';
  let want = 0;
  try { want = Number(localStorage.getItem(KEY)) || 0; } catch {}
  // Painel oculto mede 0: só encaixa a largura quando ele aparece, sem perder a escolha guardada.
  const fit = () => {
    if (!want || !main.clientWidth) return;
    const pad = parseFloat(getComputedStyle(main).paddingLeft) * 2;
    const px = Math.round(Math.max(240, Math.min(want, main.clientWidth - pad - bar.offsetWidth - 240)));
    main.style.setProperty('--form-w', `${px}px`);
    return px;
  };
  const set = w => {
    want = w;
    want = fit() || w;
    try { localStorage.setItem(KEY, want); } catch {}
  };
  new ResizeObserver(fit).observe(main);
  bar.addEventListener('pointerdown', e => {
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('dragging');
    const from = e.clientX, width = form.getBoundingClientRect().width;
    const move = m => set(width + m.clientX - from);
    const up = () => { bar.classList.remove('dragging'); bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });
  bar.addEventListener('keydown', e => {
    const step = { ArrowLeft: -24, ArrowRight: 24 }[e.key];
    if (!step) return;
    e.preventDefault();
    set(form.getBoundingClientRect().width + step);
  });
  bar.addEventListener('dblclick', () => {
    want = 0;
    main.style.removeProperty('--form-w');
    try { localStorage.removeItem(KEY); } catch {}
  });
}

function checkCatalog(){const keep={orig,gen,S};try{return db.cartas.map(c=>{orig=c;S=fromCard(c);return {id:c.id,diff:diffCards(c,buildCard())};}).filter(r=>r.diff.length);}finally{({orig,gen,S}=keep);}}
function layoutReport(){const keep={orig,gen,S};try{return db.cartas.map(c=>{orig=c;S=fromCard(c);const el=T.layouts[layoutKey(S)].elements.find(e=>e.kind==='rules');const paras=[...(cardKeywords(S).length?[`**${cardKeywords(S).join(', ')}.**`]:[]),...splitParas(blocksMarkup(ruleBlocksWithoutKeywords(splitParas(S.rules),list(S.keywords))))];let size=el.size,L;for(;size>=22;size--){L=layoutRules(paras,size,el.rect[2]);if(L.h<=el.rect[3])break;}return{id:c.id,size,overflow:L.h>el.rect[3]};});}finally{({orig,gen,S}=keep);}}
window.forge = { history:{undo:()=>travelEdit('undo'),redo:()=>travelEdit('redo'),get canUndo(){return !!editHistory?.canUndo;},get canRedo(){return !!editHistory?.canRedo;}},checkCatalog,layoutReport,S: () => S, render, toMarkup, fromMarkup, buildCard, selectCard };
