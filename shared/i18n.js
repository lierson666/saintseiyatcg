// Idiomas do jogo (autor, 31/10/2026): PT-BR e EN, uma opção só para site, lobby, duelo e Forge (Options › Language e
// chave PT/EN no cabeçalho do site). Sem escolha salva: navegador em português abre em PT-BR; qualquer outro, em inglês.
// O código continua escrevendo em inglês; este script traduz o texto na hora em que entra na página (MutationObserver,
// antes do paint), pelo dicionário de shared/i18n-pt.js. Texto de carta fica de fora até o glossário (fase 3: campos *_pt).
// Script clássico, logo depois do stage-fit.js e do i18n-pt.js, no <head>.
(() => {
  const KEY = 'ssTcgOlympusArena', LANGS = {pt: 'Português (Brasil)', en: 'English'};
  const stored = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const browser = () => ((navigator.languages || [navigator.language]).find(l => /^(pt|en)/i.test(l)) || 'en').slice(0, 2).toLowerCase();
  let lang = stored().lang in LANGS ? stored().lang : browser() === 'pt' ? 'pt' : 'en';
  const html = document.documentElement;
  html.lang = lang === 'pt' ? 'pt-BR' : 'en';
  // Estilo próprio (vale em toda página sem tocar nas folhas): blocos de idioma e a chave PT/EN do cabeçalho.
  const css = document.createElement('style');
  css.textContent = `html:not([lang="pt-BR"]) .i18n-pt, html[lang="pt-BR"] .i18n-en { display: none !important; }
.ss-lang { display: inline-flex; gap: 2px; margin-left: 12px; padding: 2px; border: 1px solid #e6c36a55; border-radius: 999px; background: #02040ccc; vertical-align: middle; }
.ss-lang button { all: unset; cursor: pointer; padding: 4px 9px; border-radius: 999px; font: 700 11px/1 system-ui, sans-serif; letter-spacing: .08em; color: #cfd8e6; }
.ss-lang button[aria-pressed="true"] { background: #e6c36a; color: #02040c; }
.ss-lang button:focus-visible { outline: 2px solid #e6c36a; outline-offset: 2px; }
@media (pointer: coarse) { .ss-lang { margin-left: 4px; } .ss-lang button { padding: 12px; } }`;
  document.head.append(css);

  const D = self.ssI18nPT || {strings: {}, patterns: []};
  const strings = new Map(Object.entries(D.strings).map(([k, v]) => [norm(k), v]));
  const outputs = new Set(strings.values());
  // Padrões: "Round {0} · {1}" vira regex; o que cai em cada {n} também passa pelo dicionário ("Main" → "Principal").
  // {0} = qualquer trecho (traduzido se houver); {w0} = uma palavra só, mantida como está ("Player {w0}" não engole frases);
  // {t0} = trecho que também precisa ter tradução.
  const patterns = (D.patterns || []).map(([en, pt]) => {
    const must = [...en.matchAll(/\{t(\d)\}/g)].map(m => m[1]), word = [...en.matchAll(/\{w(\d)\}/g)].map(m => m[1]);
    const src = norm(en).replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{([wt]?)(\d)\}/g, (_, k, n) => k === 'w' ? `(?<g${n}>\\S+)` : `(?<g${n}>.+?)`);
    return [new RegExp(`^${src}$`, 's'), pt.replace(/\{[wt](\d)\}/g, '{$1}'), must, word];
  });
  const cache = new Map(), missing = new Set();
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  // Tradução de um trecho já normalizado, ou null. Capturas de padrão passam por aqui de novo ("Player A · Main").
  function find(key) {
    let out = cache.get(key);
    if (out !== undefined) return out;
    out = strings.get(key) ?? null;
    for (let i = 0; out === null && i < patterns.length; i++) {
      const [re, pt, must, word] = patterns[i], m = key.match(re);
      if (!m || must.some(n => find(norm(m.groups[`g${n}`])) === null)) continue;
      out = pt.replace(/\{(\d)\}/g, (_, n) => { const v = norm(m.groups[`g${n}`]); return word.includes(n) ? v : find(v) ?? v; }); // {w}: letra/número, fica como está
    }
    if (out !== null) outputs.add(out);
    cache.set(key, out);
    return out;
  }
  function tr(text) {
    if (lang !== 'pt') return text;
    const key = norm(text);
    if (!key || !/[A-Za-z]/.test(key) || outputs.has(key)) return text;
    const out = find(key);
    if (out === null) { missing.add(key); return text; }
    const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
    return lead + out + tail;
  }

  // Texto de jogador (nomes, decks, chat) e face de carta não se traduzem: [translate=no] marca o que é conteúdo.
  // Páginas de texto longo trazem os dois idiomas prontos (.i18n-pt / .i18n-en) e o CSS mostra um só.
  const SKIP = '[translate="no"], [contenteditable], .i18n-pt, .i18n-en, .lc-psd, .card-text, script, style, textarea, code';
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-tip']; // data-tip: tooltip "Título|texto" do duelo
  const orig = new WeakMap(); // nó/atributo → texto original em inglês, para voltar ou trocar de idioma sem recarregar
  const skip = el => el && el.closest?.(SKIP);
  function text(node) {
    const p = node.parentElement;
    // <option> sem value: o texto É o valor do formulário (Forge: Tipo, Facção); traduzir mudaria o dado salvo.
    if (skip(p) || (p?.tagName === 'OPTION' && !p.hasAttribute('value'))) return;
    const o = orig.get(node), cur = node.data;
    const source = o && (cur === o.en || cur === o.out) ? o.en : cur;
    const out = tr(source);
    orig.set(node, {en: source, out});
    if (out !== cur) node.data = out;
  }
  function attrs(el) {
    if (skip(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const store = orig.get(el) || {}, o = store[a], cur = el.getAttribute(a);
      const source = o && (cur === o.en || cur === o.out) ? o.en : cur, out = tr(source);
      store[a] = {en: source, out}; orig.set(el, store);
      if (out !== cur) el.setAttribute(a, out);
    }
    if (el.tagName === 'INPUT' && /^(button|submit)$/.test(el.type) && el.value) {
      const store = orig.get(el) || {}, o = store.value, cur = el.value;
      const source = o && (cur === o.en || cur === o.out) ? o.en : cur, out = tr(source);
      store.value = {en: source, out}; orig.set(el, store);
      if (out !== cur) el.value = out;
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || root.matches(SKIP)) return;
    attrs(root);
    for (const el of root.querySelectorAll('*')) attrs(el);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) text(n);
  }
  const mo = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') text(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  mo.observe(html, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, 'value']});

  // Caixas nativas (confirm/alert/prompt) também passam pelo dicionário.
  for (const k of ['alert', 'confirm', 'prompt']) { const f = window[k].bind(window); window[k] = (msg, ...r) => f(tr(String(msg ?? '')), ...r); }

  // Troca na hora: volta cada nó ao original e retraduz; avisa a página (lobby/duelo redesenham o que for canvas).
  function set(v) {
    if (!(v in LANGS) || v === lang) return;
    lang = v; html.lang = v === 'pt' ? 'pt-BR' : 'en';
    try { localStorage.setItem(KEY, JSON.stringify({...stored(), lang: v})); } catch { /* sem armazenamento */ }
    walk(html);
    dispatchEvent(new CustomEvent('ss-lang', {detail: v}));
  }
  // Chave PT/EN do cabeçalho do site: entra sozinha onde houver .site-top ou .kv-nav (páginas públicas e login).
  function toggle() {
    const host = document.querySelector('.site-top, .kv-nav');
    if (!host || host.querySelector('.ss-lang')) return;
    const b = document.createElement('div');
    b.className = 'ss-lang'; b.setAttribute('translate', 'no'); b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'Language');
    b.innerHTML = Object.keys(LANGS).map(k => `<button type="button" data-lang="${k}" aria-pressed="${k === lang}" title="${LANGS[k]}">${k.toUpperCase()}</button>`).join('');
    b.addEventListener('click', e => { const k = e.target.closest('[data-lang]')?.dataset.lang; if (k) { set(k); b.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.lang === k)); } });
    host.append(b);
  }
  addEventListener('DOMContentLoaded', toggle);
  // Nomes de carta e de habilidade (shared/card-i18n.js, cardTerms): vêm dos campos *_pt, somados quando as cartas carregam.
  function add(map) {
    for (const [k, v] of Object.entries(map)) { const key = norm(k); if (!strings.has(key)) { strings.set(key, v); outputs.add(v); } }
    cache.clear();
    if (lang === 'pt' && document.body) walk(document.body);
  }
  window.ssI18n = {LANGS, get lang() { return lang; }, set, t: tr, missing, add};
})();
