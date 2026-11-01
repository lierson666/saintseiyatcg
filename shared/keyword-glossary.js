// Lembretes de keyword estilo MTG Arena (autor, 31/10/2026): textos aprovados em docs/keyword-reminders-2026-10-31.md,
// tirados do guia (capítulo IX, §40, §§21–23, §48). Usado pelo inspetor do duelo e pela ficha do lobby.
import {KEYWORD_PT, lang} from './card-i18n.js?v=20261031-kw1';

export const KEYWORD_RULES = {
  'Guardian': 'While an enemy Guardian can be targeted, Strikes must target it, except against a Rival or with Nimble.',
  'Nimble': 'Ignores Guardian when declaring a Strike. It can still be targeted normally.',
  'Cheater': 'Can only be targeted by Strikes from Devotees that also have Cheater. It can Strike any legal target.',
  'Long Range': "When it starts a Strike, its damage resolves before retaliation. If the defender is destroyed, it doesn't retaliate.",
  'Pierce': "When it Strikes a Devotee, excess damage is dealt to that player's God Soul. Doesn't apply to retaliation.",
  'Impulse': 'Can declare a Strike the round it enters the battlefield, against any legal target, including the God.',
  'Seal': 'Whenever this Devotee would become Prepared, remove a Seal counter from it instead.',
  'Sealed': 'Has one or more Seal counters. It can still Strike and use abilities while Prepared.',
  'Unfaith': "When it Strikes a God, you may remove up to 2 of that player's Latent Cosmo instead of dealing Soul damage. The God still retaliates.",
  'Training': 'Each Training counter gives +1 ATK / +1 HP. Counters stack while the Devotee stays on the battlefield.',
  'Afterlife': "Abilities marked Afterlife work only while this card is in its owner's Tartarus. Being in the Tartarus doesn't grant Afterlife.",
  'Hidden Cosmo': 'While this card is one of your Cosmo Bases, you can play it from there by paying X instead of its cost. The top card of your deck replaces it as an Unprepared Base.', // guia §4A
};

// Mesmos lembretes em PT-BR (docs/glossario-pt-br.md), mostrados quando o jogo está em português (shared/card-i18n.js).
export const KEYWORD_RULES_PT = {
  'Guardian': 'Enquanto um Guardião inimigo puder ser alvo, os Golpes precisam mirá-lo, exceto contra um Rival ou com Ágil.',
  'Nimble': 'Ignora Guardião ao declarar um Golpe. Ainda pode ser alvo normalmente.',
  'Cheater': 'Só pode ser alvo de Golpes de Devotos que também tenham Trapaceiro. Pode Golpear qualquer alvo válido.',
  'Long Range': 'Quando começa um Golpe, seu dano resolve antes do revide. Se o defensor for destruído, ele não revida.',
  'Pierce': 'Quando Golpeia um Devoto, o dano excedente vai para a Alma do Deus daquele jogador. Não vale no revide.',
  'Impulse': 'Pode declarar um Golpe na rodada em que entra no campo de batalha, contra qualquer alvo válido, inclusive o Deus.',
  'Seal': 'Sempre que este Devoto ficaria Preparado, remova dele um marcador de Selo em vez disso.',
  'Sealed': 'Tem um ou mais marcadores de Selo. Ainda pode Golpear e usar habilidades enquanto estiver Preparado.',
  'Unfaith': 'Quando Golpeia um Deus, você pode remover até 2 de Cosmo Latente daquele jogador em vez de causar dano na Alma. O Deus ainda revida.',
  'Training': 'Cada marcador de Treinamento dá +1 ATQ / +1 PV. Os marcadores se acumulam enquanto o Devoto estiver no campo de batalha.',
  'Afterlife': 'Habilidades marcadas Além-Túmulo só funcionam enquanto esta carta estiver no Tártaro do dono. Estar no Tártaro não dá Além-Túmulo.',
  'Hidden Cosmo': 'Enquanto esta carta for uma das suas Bases de Cosmo, você pode jogá-la de lá pagando X no lugar do custo. A carta do topo do seu deck entra no lugar como Base Despreparada.', // guia §4A
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

const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Fichas: título em maiúscula e negrito na cor do tema (--psd-ink do contêiner), regra em branco.
export function renderKeywordNotes(card) {
  const list = cardKeywords(card);
  if (!list.length) return '';
  const pt = lang() === 'pt';
  return `<ul class="kw-notes" aria-label="${pt ? 'Regras das palavras-chave' : 'Keyword rules'}">${list.map(k => `<li class="kw-note"><strong>${esc((pt ? KEYWORD_PT[k] : k).toUpperCase())}</strong><span>${esc((pt ? KEYWORD_RULES_PT : KEYWORD_RULES)[k])}</span></li>`).join('')}</ul>`;
}
