// Lembretes de keyword estilo MTG Arena (autor, 31/10/2026): textos aprovados em docs/keyword-reminders-2026-10-31.md,
// tirados do guia (capítulo IX, §40, §§21–23, §48). Usado pelo inspetor do duelo e pela ficha do lobby.
import {KEYWORD_PT, lang} from './card-i18n.js?v=20261031-kw1';

export const KEYWORD_RULES = {
  'Guardian': 'While an enemy Guardian can be targeted, Strikes must target it. Nimble ignores Guardians without Nimble.',
  'Nimble': 'Can only be targeted by Strikes from Devotees with Nimble. Ignores Guardians without Nimble when declaring a Strike.',
  'Long Range': "When it starts a Strike, its damage resolves before retaliation. If the defender is destroyed, it doesn't retaliate.",
  'Pierce': "When it Strikes a Devotee, excess damage is dealt to that player's God Soul. Doesn't apply to retaliation.",
  'Impulse': 'Can declare a Strike the round it enters the battlefield, against any legal target, including the God.',
  'Seal': 'This Devotee becomes Unprepared and gets a Seal counter. At the start of its owner\'s turn, it removes one Seal counter and does not Prepare.',
  'Sealed': 'Has one or more Seal counters. It stays Unprepared until it starts a turn with none.',
  'Training': 'Each Training counter gives +1 ATK / +1 HP. Counters stack while the Devotee stays on the battlefield.',
  'Afterlife': 'Activate from your Tartarus by paying its Afterlife cost, on your turn or in response. After it resolves, this card goes to the Void.',
  'Hidden Cosmo': 'While this card is one of your Cosmo Bases, you can play it from there by paying X instead of its cost. The top card of your deck replaces it as an Unprepared Base.', // guia §4A
};

// Mesmos lembretes em PT-BR (docs/glossario-pt-br.md), mostrados quando o jogo está em português (shared/card-i18n.js).
export const KEYWORD_RULES_PT = {
  'Guardian': 'Enquanto um Guardião inimigo puder ser alvo, os Golpes precisam mirá-lo. Ágil ignora Guardiões sem Ágil.',
  'Nimble': 'Só pode ser alvo de Golpes de Devotos com Ágil. Ignora Guardiões sem Ágil ao declarar um Golpe.',
  'Long Range': 'Quando começa um Golpe, seu dano resolve antes do revide. Se o defensor for destruído, ele não revida.',
  'Pierce': 'Quando Golpeia um Devoto, o dano excedente vai para a Alma do Deus daquele jogador. Não vale no revide.',
  'Impulse': 'Pode declarar um Golpe na rodada em que entra no campo de batalha, contra qualquer alvo válido, inclusive o Deus.',
  'Seal': 'Este Devoto fica Despreparado e ganha um marcador de Selo. No início do turno do dono, ele tira um marcador de Selo e não prepara.',
  'Sealed': 'Tem um ou mais marcadores de Selo. Fica Despreparado até começar um turno sem nenhum.',
  'Training': 'Cada marcador de Treinamento dá +1 ATQ / +1 PV. Os marcadores se acumulam enquanto o Devoto estiver no campo de batalha.',
  'Afterlife': 'Ative do seu Tártaro pagando o custo de Além-Túmulo, no seu turno ou como resposta. Depois de resolver, esta carta vai para o Vazio.',
  'Hidden Cosmo': 'Enquanto esta carta for uma das suas Cosmo Bases, você pode jogá-la de lá pagando X no lugar do custo. A carta do topo do seu deck entra no lugar como Base Despreparada.', // guia §4A
};

const NAMES = Object.keys(KEYWORD_RULES).sort((a, b) => b.length - a.length);
const FIND = new RegExp(`\\b(${NAMES.join('|')})\\b`, 'gi');
// Texto em PT (campos *_pt): o nome em português aponta para a mesma keyword (chave em inglês).
const FROM_PT = Object.fromEntries(Object.keys(KEYWORD_RULES_PT).map(k => [KEYWORD_PT[k].toLowerCase(), k]));
const FIND_PT = new RegExp(`(?<!\\p{L})(${Object.keys(FROM_PT).sort((a, b) => b.length - a.length).join('|')})(?!\\p{L})`, 'giu');

// Keywords da carta (impressas primeiro, depois as citadas no texto), cada uma uma vez, na ordem em que aparecem.
export function cardKeywords(card) {
  const out = [];
  const add = name => { const k = NAMES.find(n => n.toLowerCase() === name.toLowerCase()); if (k && !out.includes(k)) out.push(k); };
  for (const k of card.keywords_en || []) add(k);
  const text = [...(card.habilidades_en || []), card.habilidade_awaken_en || '', card.ultimate_en || ''].join('\n');
  for (const m of text.matchAll(FIND)) add(m[1]);
  for (const m of text.matchAll(FIND_PT)) add(FROM_PT[m[1].toLowerCase()]);
  return out;
}

// Moedas de keyword (autor, 01/11/2026). Seal e Sealed dividem o cadeado. Mestres em LOGO/keyword-icons/.
const ICONS = {'Guardian': 'guardian', 'Nimble': 'nimble', 'Long Range': 'long-range', 'Pierce': 'pierce', 'Impulse': 'impulse', 'Seal': 'seal', 'Sealed': 'seal', 'Training': 'training', 'Afterlife': 'afterlife', 'Hidden Cosmo': 'hidden-cosmo'};
export const keywordIconUrl = k => (ICONS[k] ? new URL(`./keyword-icons/${ICONS[k]}.webp`, import.meta.url).href : null);

const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Atributo data-tip da palavra-chave no texto da carta (a dica é do duelo); "Hidden Cosmo {3}" vale como Hidden Cosmo.
export function keywordTipAttr(name) {
  const k = NAMES.find(n => String(name).toLowerCase().startsWith(n.toLowerCase()));
  if (!k) return '';
  const pt = lang() === 'pt';
  return ` data-tip="${esc(`${pt ? KEYWORD_PT[k] : k}|${(pt ? KEYWORD_RULES_PT : KEYWORD_RULES)[k]}`)}"`;
}

// Fichas: título em maiúscula e negrito na cor do tema (--psd-ink do contêiner), regra em branco.
export function renderKeywordNotes(card) {
  const list = cardKeywords(card);
  if (!list.length) return '';
  const pt = lang() === 'pt';
  return `<ul class="kw-notes" aria-label="${pt ? 'Regras das palavras-chave' : 'Keyword rules'}">${list.map(k => `<li class="kw-note"><img src="${esc(keywordIconUrl(k))}" alt="" draggable="false"><strong>${esc((pt ? KEYWORD_PT[k] : k).toUpperCase())}</strong><span>${esc((pt ? KEYWORD_RULES_PT : KEYWORD_RULES)[k])}</span></li>`).join('')}</ul>`;
}

// Fileira de moedas na carta: data-tip é a dica do duelo (mouse, foco; toque em playtest/divine/app.js). Keyword sem moeda fica de fora.
export function renderKeywordIcons(list) {
  const pt = lang() === 'pt', seen = new Set();
  const coins = list.map(n => NAMES.find(k => k.toLowerCase() === String(n).toLowerCase())).filter(k => k && ICONS[k] && !seen.has(ICONS[k]) && seen.add(ICONS[k]));
  if (!coins.length) return '';
  return `<span class="kw-icons">${coins.map(k => {
    const name = pt ? KEYWORD_PT[k] : k, rule = (pt ? KEYWORD_RULES_PT : KEYWORD_RULES)[k];
    return `<span class="kw-icon" role="button" tabindex="0" aria-label="${esc(`${name}: ${rule}`)}" data-tip="${esc(`${name}|${rule}`)}"><img src="${esc(keywordIconUrl(k))}" alt="" draggable="false"></span>`;
  }).join('')}</span>`;
}
