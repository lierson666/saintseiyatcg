// Normalização do catálogo: carta bruta → carta canônica para o CosmoBalanceEngine, sem alterar ids nem versões.
// O texto impresso (cards.json) define a intenção; o índice da Engine (engine-index.json) diz o que está implementado.
// Frase sem padrão conhecido vira UNRESOLVED e não recebe valor: nada é inventado.
export const UNRESOLVED = 'UNRESOLVED';
export const KEYWORDS = ['Guardian', 'Nimble', 'Long Range', 'Pierce', 'Impulse'];

const WORDS = {a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10};
const n = s => { if (s == null) return 1; const t = String(s).toLowerCase().replace(/[{}]/g, ''); return WORDS[t] ?? (Number.isFinite(Number(t)) ? Number(t) : 1); };
export const clean = t => String(t || '').replace(/@Power\b/g, 'ATK').replace(/([+-]\d+) Power\b/g, '$1 ATK').replace(/@/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[ \t]+/g, ' ').trim();
const NUM = '(\\{?\\d+\\}?|a|an|one|two|three|four|five|six|seven|eight|nine|ten)';

// Cada padrão gera {kind, amount?, …}. Ordem irrelevante: os padrões rodam todos sobre a frase, e os spans cobertos são marcados.
const P = (kind, re, make = () => ({})) => ({kind, re: new RegExp(re.source ?? re, 'gi'), make});
const enemyish = t => /enem|opponent|opposing|defending|target player|that player|each player|their|its controller/i.test(t);
const PATTERNS = [
  P('draw', `\\bdraws? ${NUM} (?:additional )?cards?`, m => ({amount: n(m[1])})),
  P('draw', /\bdraws? that card|\bput (?:one|it|that card) (?:of them )?into your hand|add (?:it|one) to your hand/, () => ({amount: 1, viaSelection: true})),
  P('discard', `\\bdiscards? (?:${NUM} )?(?:random )?(?:cards?|that card|it)?`, (m, s) => ({amount: n(m[1]), side: /opponent|that player|target player|each player|enemy|its controller/i.test(s.slice(0, m.index + m[0].length)) ? 'enemy' : 'self'})),
  P('mill', `\\bmills? ${NUM} (?:additional )?cards?|\\bmills? (?:that many|cards)`, (m, s) => ({amount: n(m[1]), side: /\byou mill|\bmill \w+ cards?, you|^mill/i.test(s.slice(Math.max(0, m.index - 4))) && !/opponent|player|controller/i.test(s.slice(0, m.index)) ? 'self' : 'enemy'})),
  P('mill', `(?:put|puts) the top (?:${NUM} )?cards? .*tartarus`, (m, s) => ({amount: n(m[1]), side: /opponent|enemy/i.test(s) ? 'enemy' : 'self'})),
  P('seal', `\\bput ${NUM} (?:additional )?seal counters?|\\bseal (?:target|that|it|an?|each|all|up to)|\\b(?:is|are|becomes?) sealed (?:until|by)|\\bgets? a seal`, m => ({amount: m[1] ? n(m[1]) : 1})),
  P('sealRemove', /\bremove (?:a |an |one |up to \w+ |all )?seal counters?/),
  P('damage', /\bdeals? (\d+|that much|damage equal|x) (?:additional |extra )?damage(?: to ([^.,]*))?/, m => ({amount: /^\d+$/.test(m[1]) ? Number(m[1]) : null, target: m[2] || ''})),
  P('damage', /\bdistribute (\d+) damage(?: among ([^.,]*))?/, m => ({amount: Number(m[1]), target: m[2] || 'enemy'})),
  P('damage', /\beach deals damage|\bdeals? damage (?:to [^.]*? )?equal[^.,]*/, () => ({amount: null, target: 'enemy'})),
  P('soulEnemy', `(?:enemy god|opposing god|defending god|target enemy god|target opponent|each opponent|opponent|its controller|their god|that god|that god's controller|that devotee's controller) loses? (?:an additional )?\\{?(\\d+)\\}?(?:\\{S\\}| soul)`, m => ({amount: Number(m[1])})),
  P('soulSelf', `(?:your god loses?|you lose|lose|pay|pays?|ares loses|hades loses|athena loses|poseidon loses|artemis loses) (?:an additional )?\\{?(\\d+)\\}?(?:\\{S\\}| soul)`, m => ({amount: Number(m[1])})),
  P('soulGain', `(?:your god gains?|you gain|gain|gains?) (?:an additional )?\\{?(\\d+)\\}?(?:\\{S\\}| soul)`, m => ({amount: Number(m[1])})),
  P('soulGain', /\bremove \d+ damage from your god/, () => ({amount: 1})),
  P('latent', `\\b(?:gain|generate|gains?|generates?) (?:an additional )?\\{?(\\d+)\\}? ?\\{(?:L|C)\\}`, m => ({amount: Number(m[1])})),
  P('latent', `\\b(?:gain|generate) ${NUM} latent cosmo`, m => ({amount: n(m[1])})),
  P('putBack', `\\bput ${NUM} cards? from your hand (?:on top|on the bottom|back)`, m => ({amount: n(m[1])})),
  P('latentEnemy', /\bloses? (?:up to )?\{?(\d+)\}?\{L\}/, m => ({amount: Number(m[1])})),
  P('buff', /(?:\b(?:gets?|gains?|has|get|enters with) (?:an additional )?|^)([+-]\d+) ATK(?: ?\/ ?([+-]\d+) HP)?/, m => ({atk: Number(m[1]), hp: Number(m[2] || 0)})),
  P('buff', /\b(?:gets?|gains?|has) ([+-]\d+) HP/, m => ({atk: 0, hp: Number(m[1])})),
  P('buff', /\b(?:gets?|gains?) ([+-]\d+)\/([+-]\d+)/, m => ({atk: Number(m[1]), hp: Number(m[2])})),
  P('counter', `\\bput ${NUM} ([+-]\\d+)\\/([+-]\\d+) counters?`, m => ({amount: n(m[1]), atk: Number(m[2]), hp: Number(m[3])})),
  P('training', `\\bput ${NUM} training counters?`, m => ({amount: n(m[1])})),
  P('trainingRemove', /\bremove (?:a |an |one |up to \w+ |\w+ )?training counters?/),
  P('heal', /\bremove (\d+|up to \d+|all)(?: of the)? damage/, m => ({amount: /all/i.test(m[1]) ? 3 : Number(m[1].replace(/\D/g, ''))})),
  P('reanimate', /(?<!you |when |whenever )\b(?:return|put|bring)s? [^.]*?from (?:your|a|any|an opponent's|their|the) tartarus (?:to|onto|on) the battlefield/),
  P('reanimate', /(?<!you |when |whenever )\breturn [^.]*?to the battlefield[^.]*/),
  P('recurHand', /(?<!you |when |whenever )\breturn [^.]*?from (?:your|the) tartarus to (?:your|their|its owner's) hand/),
  P('recurHand', /\breturn [^.]*?to your hand/),
  P('bounce', /\breturn [^.]*?to (?:its|their) owners?'?s? hands?|\breturn (?:that|target|it|each)[^.]*?hand/),
  P('removal', /\b(?:defeat|destroy)s? (target|that|all|each|up to \w+|an?|another)[^.,]*/, m => ({text: m[0]})),
  P('sacrifice', `\\bsacrifices? (\\d+|a|an|another|one|two|three|that|target|this|it)\\b`, (m, s) => ({amount: n(m[1]), side: /opponent|that player/i.test(s.slice(0, m.index)) ? 'enemy' : 'self'})),
  P('selfDefeat', /\b(?:defeat|destroy) (?!target|that\b|all|each|up to|an?\b|another|enemy)[a-z' ]+/),
  P('drawback', /\bskip your next draw|\bmust strike\b|\bis not prepared during/),
  P('exile', /\bexiles? [^.]*|\b(?:into|to) the void\b/, m => ({text: m[0]})),
  P('prepare', /(?<!cannot |not )\bprepares? (?!step|phase|during)[a-z]+|\bbecomes? prepared/),
  P('exhaust', /\b(?:make|makes|becomes?|become) [^.]*?unprepared|\bbecomes? unprepared|\bexhausts?\b/),
  P('forbid', /\bcannot (?:declare|strike|be prepared|prepare|attack|target)|\bcan't (?:declare|strike|be prepared|attack)/),
  P('shield', /\bprevent (?:the next |up to |the first )?(\d+|all)[^.]*/, m => ({amount: /all/i.test(m[1]) ? null : Number(m[1])})),
  P('shield', /\bredirect up to (\d+)/, m => ({amount: Number(m[1])})),
  P('shield', /\bstrike deals no damage|\bcannot be defeated/, () => ({amount: null})),
  P('shield', /\bprevent (?:that|this|it)[^.]*/, () => ({amount: null})),
  P('counterSpell', /\bcounter (?:target|that|a|the|it)\b|\bis countered\b/),
  P('search', /\bsearch your (?:deck|tartarus)/),
  P('scry', `\\blook at the top (?:${NUM} )?cards?`, m => ({amount: n(m[1])})),
  P('reveal', /\breveals?\b/),
  P('ramp', /\b(?:put|place|puts)s? [^.]*?(?:as|into)[^.]*?cosmo (?:base|bank)/),
  P('extraBase', /\badditional cosmo base|\banother cosmo base/),
  P('token', /\bcreate (?:a |an |two |three )?(\d+)\/(\d+)/, m => ({atk: Number(m[1]), hp: Number(m[2]), amount: 1})),
  P('costReduce', /\bcosts? (?:\{?\d+\}?(?:\{C\})? )?less|\breduce [^.]*cost/),
  P('tax', /\bcosts? (?:\{?\d+\}?(?:\{C\})? )?more/),
  P('grant', /\b(?:gains?|has|have|get|gets) ((?:guardian|nimble|impulse|long range|pierce)(?:(?:,| and| or) (?:guardian|nimble|impulse|long range|pierce))*)/, m => ({keywords: m[1].split(/,| and | or /).map(x => x.trim()).filter(Boolean)})),
  P('loseKeyword', /\bloses? (?:guardian|nimble|impulse|long range|pierce)/),
  P('immune', /\bimmune to [^.]*/),
  P('fight', /\bfights?\b|\bhave it strike\b/),
  P('ignoreGuardian', /\bignor(?:es|ing) guardian/),
  P('discard', /\bputs? a card from their hand on top/, () => ({amount: 1, side: 'enemy'})),
  P('silence', /\bloses? all (?:activated )?abilities|\bcannot (?:use|activate)[^.]*abilit|\bhas no abilities|\bcan't use/),
  P('extraStrike', /\b(?:declare|declares) (?:another|an additional|a second) strike/),
  P('noRetaliation', /\bdoes(?:n't| not) (?:deal retaliation|retaliate)|\bwithout retaliation|\bno retaliation|\bcannot retaliate/),
  P('control', /\bgain control\b/),
  P('equipFree', /\b(?:attach|equip)(?:ped)? [^.]*?(?:free|without paying|at no cost|to (?:target|another|a))|\bfrom your [^.]* attached/),
  P('copy', /\bcopy\b|\bbecomes? a copy/),
];
// Frases sem valor próprio: lembretes, ligação e organização do deck.
const STRUCTURAL = [
  /^choose\b/i, /do not stack/i, /is not legendary/i, /^(?:you may )?put (?:that card|it|them|one)\b[^.]*(?:bottom|top|any order)/i,
  /^then shuffle/i, /^shuffle/i, /^put the (?:remaining|rest|others?)/i, /^(?:then )?put the rest/i, /^reveal it/i, /^activate only/i, /^use this ability/i, /^this ability triggers/i,
  /^each player may/i, /^\(/, /^cost:?$/i, /^tokens don't count/i, /^this destruction can't be prevented/i, /^this can't/i, /^activate this/i,
  /^they (?:enter|return)/i, /^once per game\.?$/i, /^once each (?:round|cycle)\.?$/i, /^gold saints require no additional soul/i, /^choose (?:one|two):?\.?$/i,
];
const TRIGGERS = [
  [/\benters? (?:the )?battlefield|\bis played\b|\bwhen .* enters/i, 'etb'],
  [/leaves? the battlefield/i, 'leaves'],
  [/equipped devotee is defeated|equipped devotee dies/i, 'bearerDefeated'],
  [/(?:another|friendly|a|an|enemy|other) [^,]*(?:is|are) (?:defeated|destroyed)|defeats? |whenever a devotee is/i, 'watchOrKill'],
  [/\bis defeated|\bare defeated|\bdies\b/i, 'defeated'],
  [/destroys? [^,]*(?:combat|strike)/i, 'kill'], [/\bactivates\b/i, 'activation'], [/\bprevents\b/i, 'combatDamage'], [/\breturns?\b/i, 'watchEnter'],
  [/enemy [^,]*declares? a strike|opponent[^,]*declares? a strike/i, 'enemyDeclare'],
  [/friendly [^,]*declares? a strike|another [^,]*declares? a strike|equipped devotee declares?/i, 'declareWatchEquip'],
  [/declares? a strike|strikes? or is struck|\bstrikes\b/i, 'declare'],
  [/(?:deals?|dealt) [^,]*damage to (?:an? |the |target )?(?:enemy )?god|damages? (?:a|the|an enemy) god/i, 'godDamage'],
  [/deals? [^,]*(?:strike )?damage|is dealt|takes? [^,]*damage|would take|would be dealt/i, 'combatDamage'],
  [/survives?/i, 'survive'],
  [/beginning of|start of/i, 'startRound'], [/end of/i, 'endRound'],
  [/casts? a|plays? a (?:moment|technique)|casts? an|(?:moment|technique)/i, 'spellWatch'],
  [/discard/i, 'discardWatch'], [/sealed|seal /i, 'sealWatch'], [/mill/i, 'millWatch'], [/attached|equip/i, 'attachWatch'], [/sacrific/i, 'sacrificeWatch'],
  [/another [^,]* enters|enters/i, 'watchEnter'],
];
const COST_RE = /\{(\d+)\}\{([CLS])\}|\{T\}/g;
export function parseCost(text) {
  const out = {cosmo: 0, latent: 0, soul: 0, tap: false};
  for (const m of String(text).matchAll(COST_RE)) {
    if (m[0] === '{T}') out.tap = true;
    else if (m[2] === 'C') out.cosmo += Number(m[1]);
    else if (m[2] === 'L') out.latent += Number(m[1]);
    else out.soul += Number(m[1]);
  }
  return out;
}

const splitSentences = text => clean(text).split(/\n+/).flatMap(line => {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '(') depth++; else if (c === ')') depth--;
    cur += c;
    if (c === '.' && depth <= 0 && (line[i + 1] === ' ' || i === line.length - 1)) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
});

const durationOf = s => {
  if (/permanently|for the rest of the (?:game|match)/i.test(s)) return 'permanent';
  if (/until the (?:end|start) of (?:your|its|their|this|the)|this round|this strike|until /i.test(s)) return 'temporary';
  return null;
};
const scopeOf = s => {
  if (/\ball (?:enemy|friendly|other|devotees)|\beach (?:enemy|friendly|other|devotee)|\bother friendly|\bfriendly [a-z ]+? (?:get|gain|have)\b|\bdevotees you control\b/i.test(s)) return 'all';
  if (/\bup to three\b|\bthree (?:target|enemy|friendly)/i.test(s)) return 'three';
  if (/\bup to two\b|\btwo (?:target|enemy|friendly)/i.test(s)) return 'two';
  return 'one';
};
const sideOf = text => {
  const s = text.replace(/until the (?:end|start) of (?:your|its|their)[^.,]*/gi, '').replace(/against your god[^,.]*/gi, '');
  const enemy = /\benemy\b|\bopponent|\bopposing\b|\btarget devotee\b|defending/i.test(s), own = /\bfriendly\b|\byour\b|\byou control\b|\bequipped devotee\b|\bit\b.*\bgets? \+/i.test(s);
  return enemy && !own ? 'enemy' : own && !enemy ? 'own' : enemy ? 'mixed' : 'unspecified';
};
const tribeOf = s => /\b(Bronze|Silver|Gold|Black|Steel|Ghost)? ?(Saint|Marina|Marine|Specter|Berserker|Satellite|Skeleton|Legion|Sacred Beast|Forest Guardian|Lunar Guardian|Nature Spirit|Warrior|Support|Atlantean|Hunter|Equipment|Armor|Cloth|Scale|Surplice|Warplate|Moonplate|Weapon)s?\b/.exec(s)?.[0]?.replace(/s$/, '').trim() || null;

function classifyTrigger(head, card) {
  if (/\byou (?:cast|play)\b/i.test(head)) {
    const own = clean(card.nome_exibicao_en || '').toLowerCase();
    if (/\byou (?:cast|play) this\b/i.test(head) || (own && head.toLowerCase().includes(own))) return 'cast';
    return /moment|technique/i.test(head) ? 'spellWatch' : /equipment|armor|cloth/i.test(head) ? 'attachWatch' : 'costWatch';
  }
  for (const [re, kind] of TRIGGERS) if (re.test(head)) {
    if (kind === 'watchOrKill') return /\byou control|friendly|another|other/i.test(head) && !/defeats?\b/i.test(head) ? 'watchDefeat' : /defeats?\b/i.test(head) ? 'kill' : 'watchDefeat';
    if (kind === 'declareWatchEquip') return /equipped/i.test(head) ? 'declare' : 'watchDeclare';
    return kind;
  }
  return 'generic';
}

// Uma linha de habilidade → {name, kind, frequency, trigger, cost, effects[], sentences[]}.
export function parseAbility(raw, section = 'ability', card = {}) {
  const out = {raw, section, optional: /\byou may\b/i.test(raw), name: null, resonance: null, kind: 'static', frequency: null, trigger: null, cost: null, effects: [], sentences: [], awakened: false};
  let text = clean(raw);
  const header = /^([^—\n]{2,60}?) — ([^\n]*?)(?:\n|$)/.exec(text);
  const resonance = /^Resonance — ([^:\n]+):\s*/.exec(text);
  if (resonance) { out.resonance = resonance[1].trim(); text = text.slice(resonance[0].length); }
  else if (header && /^(Divine Power|Divine Command|Ultimate|Awaken \d+)$/i.test(header[2].trim())) { out.name = header[1].trim(); out.section = /Divine Power/i.test(header[2]) ? 'divinePower' : /Divine Command/i.test(header[2]) ? 'divineCommand' : /Ultimate/i.test(header[2]) ? 'ultimate' : 'awaken'; text = text.slice(header[0].length); }
  else if (header) { out.name = header[1].trim(); text = text.slice(header[1].length + 3); }
  const named = /^([A-Z][A-Za-z' ]{2,40}): (?=[A-Z{])/.exec(text); // "Cygnus Hyoga: …", "Marina: …": ressonância de lista
  if (named && !/^(Cost|Awakened|Afterlife|Choose|Sacrifice|Pay|Discard|Exile)/.test(named[1])) { out.resonance = named[1].trim(); text = text.slice(named[0].length); }
  if (/^Afterlife\b/i.test(text)) { out.kind = 'afterlife'; }

  let pending = null, pendingScope = null, carriedCondition = null, carriedSide = null;
  for (let sentence of splitSentences(text)) {
    const rec = {text: sentence, status: 'resolved', effects: []};
    let s = sentence, condition = pending; pending = null;
    const carriedScope = pendingScope; pendingScope = null;
    if (condition === 'carried') condition = null;
    if (/^\(.*\)\.?$/.test(s)) { rec.status = 'structural'; out.sentences.push(rec); continue; }
    s = s.replace(/\([^)]*\)/g, '').trim();
    const costLine = /^Cost:\s*(.*)$/i.exec(s);
    if (costLine) { out.cost = parseCost(costLine[1]); out.kind = out.section === 'ultimate' ? 'ultimate' : 'activated'; const rest = costLine[1].replace(/(\{\d+\}\{[CLS]\}|\{T\})[,. ]*/g, '').trim(); if (!rest) { rec.status = 'structural'; out.sentences.push(rec); continue; } s = rest; }
    for (const [re, f] of [[/once each cycle,?\s*/i, 'cycle'], [/once each (?:round|turn),?\s*/i, 'round'], [/once per (?:game|match),?\s*/i, 'game'], [/once per (?:round|turn),?\s*/i, 'round'], [/once during your[^,]*,\s*/i, 'round'], [/the first time[^,]*(?:each|per) (?:round|turn)[^,]*,\s*/i, 'round']]) {
      if (re.test(s)) { out.frequency = out.frequency || f; s = s.replace(re, ' ').trim(); }
    }
    if (/^this ability triggers only once each round/i.test(s)) { out.frequency = 'round'; rec.status = 'structural'; out.sentences.push(rec); continue; }
    s = s.replace(/^[,.\s]+/, '');
    const activation = /^(Afterlife\s+)?(?!when|whenever|if |while|resonance)([^.:]*(?:\{\d+\}\{[CLS]\}|\{T\}|sacrifice|discard)[^.:]*):\s*/i.exec(s);
    if (activation) {
      out.cost = parseCost(activation[0]);
      if (/sacrifice/i.test(activation[0])) out.cost.sacrifice = 1;
      if (/discard/i.test(activation[0])) out.cost.discard = 1;
      out.kind = activation[1] ? 'afterlife' : 'activated';
      s = s.slice(activation[0].length);
    }
    if (/^Awakened:/i.test(s)) { out.awakened = true; condition = 'awakened'; s = s.replace(/^Awakened:\s*/i, ''); }
    const trig = /^(?:when|whenever|at the (?:beginning|end|start) of|the first (?:time|enemy))\b[^,]*,\s*/i.exec(s);
    if (trig) {
      out.trigger = out.trigger || classifyTrigger(trig[0], card);
      if (out.kind === 'static') out.kind = 'triggered';
      s = s.slice(trig[0].length);
      const pay = /^you may (?:pay|lose|discard|sacrifice)\b[^.]*\.?\s*$/i.exec(s);
      if (pay) { out.optionalCost = {...parseCost(s), sacrifice: /sacrifice/i.test(s) ? 1 : 0, discard: /discard/i.test(s) ? 1 : 0}; rec.status = 'structural'; out.sentences.push(rec); pending = 'if'; continue; }
    } else if (/^(?:when|whenever)\b/i.test(s)) { // gatilho sem vírgula: o resto da frase é o efeito
      out.trigger = out.trigger || classifyTrigger(s, card);
      if (out.kind === 'static') out.kind = 'triggered';
    }
    if (out.kind === 'static' && /^you may (?:pay|lose)\b[^.]*\{/i.test(s)) { out.kind = 'activated'; out.cost = parseCost(s); rec.status = 'structural'; out.sentences.push(rec); pending = 'carried'; continue; }
    if (carriedCondition && !condition && /^(?:you may|put|then)\b/i.test(s)) condition = carriedCondition;
    if (/^(?:if you do|if so|then),?\s*/i.test(s)) { condition = condition || 'if'; s = s.replace(/^(?:if you do|if so|then),?\s*/i, ''); }
    const cond = /^(if|while|as long as|during)\b[^,]*,\s*/i.exec(s);
    if (cond) { condition = condition || (/^if/i.test(cond[0]) ? 'if' : 'while'); rec.condition = cond[0].trim(); s = s.slice(cond[0].length); if (out.kind === 'static' && condition === 'while') out.kind = 'continuous'; }
    const trailingCond = /\b(?:if|while|as long as) [^.]*$/i.exec(s);
    if (trailingCond && !condition) { condition = /^if/i.test(trailingCond[0]) ? 'if' : 'while'; rec.condition = trailingCond[0]; }
    if (/\binstead\b/i.test(sentence)) rec.replacement = true;
    const scaled = /\bfor (?:each|every)\b/i.test(s);

    for (const pattern of PATTERNS) {
      pattern.re.lastIndex = 0;
      for (const m of s.matchAll(pattern.re)) {
        const scope = scopeOf(s);
        const fx = {kind: pattern.kind, condition: condition || null, scope: scope === 'one' && carriedScope ? carriedScope : scope, side: sideOf(s), tribe: tribeOf(s), duration: durationOf(s), scaled, replacement: !!rec.replacement, sentence: s, ...pattern.make(m, s)};
        if (fx.side === 'unspecified' && carriedSide && /\bthat (?:devotee|saint)\b|\bit\b|\bthem\b|\bthose\b/i.test(s)) fx.side = carriedSide;
        rec.effects.push(fx);
      }
    }
    // padrões concorrentes na mesma frase: reanimar cobre devolver; defeat/seal etc. não se duplicam.
    rec.effects = dedupe(rec.effects);
    if (!rec.effects.length && /^choose\b/i.test(s)) pendingScope = scopeOf(s);
    if (!rec.effects.length) {
      if (STRUCTURAL.some(re => re.test(s.trim())) || !s.trim() || /^(?:you may pay|you may|may pay)\b[^.]*\{/i.test(s)) rec.status = 'structural';
      else if (/^you may (?:pay|lose|discard|sacrifice)/i.test(s) || /^as an additional cost/i.test(s)) { rec.status = 'structural'; pending = 'if'; }
      else if (/^(guardian|nimble|impulse|long range|pierce)(?:,? (?:and )?(?:guardian|nimble|impulse|long range|pierce))*\.?$/i.test(s)) rec.status = 'structural';
      else rec.status = UNRESOLVED;
    }
    if (/^as an additional cost/i.test(s) || /\bas an additional cost\b/i.test(s)) { out.additionalCost = {...parseCost(s), sacrifice: /sacrifice/i.test(s) ? 1 : 0, discard: /discard/i.test(s) ? 1 : 0}; rec.effects = rec.effects.filter(f => !['sacrifice', 'discard', 'soulSelf'].includes(f.kind)); if (!rec.effects.length) rec.status = 'structural'; }
    const sided = rec.effects.find(f => f.side === 'own' || f.side === 'enemy');
    if (sided) carriedSide = sided.side;
    if (rec.effects.some(f => f.condition)) carriedCondition = rec.effects.find(f => f.condition).condition;
    out.effects.push(...rec.effects);
    out.sentences.push(rec);
  }
  if (out.frequency && !out.trigger && (out.kind === 'static' || out.kind === 'continuous') && card.tipo !== 'Spell' && /\byou may\b/i.test(out.raw)) out.kind = 'activated';
  if (out.kind === 'static' && out.effects.length && card.tipo && !['Spell'].includes(card.tipo)) out.kind = 'continuous';
  if (card.tipo === 'Spell' && out.kind === 'static') out.kind = 'oneShot';
  return out;
}

function dedupe(list) {
  const kinds = new Set(list.map(f => f.kind));
  let out = list;
  if (kinds.has('search')) out = out.filter(f => !f.viaSelection && f.kind !== 'reveal');
  if (kinds.has('reanimate')) out = out.filter(f => f.kind !== 'recurHand' && f.kind !== 'bounce');
  if (kinds.has('recurHand')) out = out.filter(f => f.kind !== 'bounce');
  if (kinds.has('counter') || kinds.has('training')) out = out.filter(f => f.kind !== 'buff' || !/counter/i.test(f.sentence));
  if (kinds.has('silence')) out = out.filter(f => f.kind !== 'forbid');
  if (kinds.has('soulEnemy')) out = out.filter(f => f.kind !== 'soulSelf');
  const seen = new Set();
  return out.filter(f => { const k = `${f.kind}:${f.amount ?? ''}:${f.atk ?? ''}:${f.hp ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

const classOf = c => {
  if (c.tipo === 'Spell') return (c.subtipos || []).includes('Moment') ? 'Moment' : (c.subtipos || []).includes('Technique') ? 'Technique' : 'SpellOther';
  return c.tipo;
};

// Carta canônica: propriedades do catálogo (cópia, ids intactos) mais a leitura estruturada dos textos.
export function normalizeCard(raw) {
  const keywords = new Set(), anomalies = [];
  const abilityLines = [];
  for (const k of raw.keywords_en || []) {
    if (KEYWORDS.includes(k)) keywords.add(k);
    else { anomalies.push(`keywords_en com texto de habilidade: "${k.slice(0, 40)}…"`); abilityLines.push(k); }
  }
  let hiddenCosmo = null;
  const afterlife = [];
  const immune = [];
  for (const line of raw.habilidades_en || []) {
    const t = clean(line);
    if (new RegExp(`^(${KEYWORDS.join('|')})(?:(?:,| and) (?:${KEYWORDS.join('|')}))*\\.?$`, 'i').test(t)) {
      for (const k of t.replace(/\.$/, '').split(/,| and /)) { const hit = KEYWORDS.find(x => x.toLowerCase() === k.trim().toLowerCase()); if (hit) keywords.add(hit); }
      continue;
    }
    const hc = /^Hidden Cosmo \{(\d+)\}/i.exec(t);
    if (hc) { hiddenCosmo = Number(hc[1]); continue; }
    if (/^Afterlife\b/i.test(t)) afterlife.push(line);
    if (/^Immune to /i.test(t)) { immune.push(t); continue; }
    abilityLines.push(line);
  }
  const card = {
    id: raw.id, sourceId: raw.id_fonte ?? null, set: raw.conjunto ?? null, number: raw.numero_carta ?? null, version: /\bV\d\b/.exec(raw.nome_exibicao_en || '')?.[0] ?? null,
    name: raw.nome_exibicao_en, namePt: raw.nome_exibicao_pt ?? null, faction: raw.faccao, type: raw.tipo, class: classOf(raw), subtypes: raw.subtipos || [], rank: raw.patente_armadura ?? null,
    rarity: raw.raridade, status: raw.status, cosmoble: raw.cosmoble !== false, cost: raw.custo, costUnit: raw.unidade_custo,
    attack: raw.power, hp: raw.vida, soul: raw.soul, awaken: raw.awaken,
    equip: raw.tipo === 'Equipment' ? {category: raw.categoria_equipamento ?? null, slot: raw.slot_equipamento ?? null, cost: raw.equipar_custo_outros ?? raw.equipar_custo ?? null, resonantCost: raw.equipar_custo_ressonante ?? null, auto: !!raw.equipar_auto, owners: raw.donos || [], bonusAtk: raw.bonus_poder ?? 0, bonusHp: raw.bonus_vida ?? 0, resonantNames: raw.auto_equip_en || []} : null,
    keywords: [...keywords], hiddenCosmo, immune, anomalies, tipo: raw.tipo,
    abilities: [
      ...abilityLines.map(l => parseAbility(l, 'ability', raw)),
      ...(raw.habilidade_awaken_en ? [parseAbility(raw.habilidade_awaken_en, 'awaken', raw)] : []),
      ...(raw.ultimate_en ? [parseAbility(raw.ultimate_en, 'ultimate', raw)] : []),
    ],
  };
  // Conflito texto × estrutura (§64: o editor deve sinalizar): Equipment com bônus nos campos e sem texto não é conflito.
  if (raw.tipo === 'Devotee' && (raw.power == null || raw.vida == null)) anomalies.push('Devotee sem Power ou HP');
  if (raw.tipo !== 'God' && raw.tipo !== 'Domain' && raw.custo == null) anomalies.push('sem custo');
  return card;
}
export const inventory = cards => cards.map(normalizeCard);
