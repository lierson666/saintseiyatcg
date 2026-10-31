// Lembretes de keyword estilo MTG Arena (autor, 31/10/2026): textos aprovados em docs/keyword-reminders-2026-10-31.md,
// tirados do guia (capítulo IX, §40, §§21–23, §48). Usado pelo inspetor do duelo e pela ficha do lobby.
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
  'Prepared': 'On guard: can declare a Strike and protects itself and its God.',
  'Unprepared': 'Open: can be chosen as a Strike target.',
  'Prepare': 'Make it Prepared.',
};

const NAMES = Object.keys(KEYWORD_RULES).sort((a, b) => b.length - a.length);
const FIND = new RegExp(`\\b(${NAMES.join('|')})\\b`, 'gi');

// Keywords da carta (impressas primeiro, depois as citadas no texto), cada uma uma vez, na ordem em que aparecem.
export function cardKeywords(card) {
  const out = [];
  const add = name => { const k = NAMES.find(n => n.toLowerCase() === name.toLowerCase()); if (k && !out.includes(k)) out.push(k); };
  for (const k of card.keywords_en || []) add(k);
  const text = [...(card.habilidades_en || []), card.habilidade_awaken_en || '', card.ultimate_en || ''].join('\n');
  for (const m of text.matchAll(FIND)) add(m[1]);
  return out;
}

const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Fichas: título em maiúscula e negrito na cor do tema (--psd-ink do contêiner), regra em branco.
export function renderKeywordNotes(card) {
  const list = cardKeywords(card);
  if (!list.length) return '';
  return `<ul class="kw-notes" aria-label="Keyword rules">${list.map(k => `<li class="kw-note"><strong>${esc(k.toUpperCase())}</strong><span>${esc(KEYWORD_RULES[k])}</span></li>`).join('')}</ul>`;
}
