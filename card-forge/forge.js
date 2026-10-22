// Card Forge — editor de cartas em vanilla JS. Renderiza no canvas nativo 1488x2091 usando
// as peças de CARD-TEMPLATE/ (extraídas dos PSDs) e o spec CARD-TEMPLATE/templates.json.

const T = await (await fetch('../CARD-TEMPLATE/templates.json')).json();
const P = (await (await fetch('../CARD-TEMPLATE/pieces.json')).json()).pieces;
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

function blankState() {
  return {
    id: '', nome_exibicao_en: '', title: '', subtitle: '', tipo: 'Devotee', subtipos: '', faccao: 'Athena',
    raridade: 'Common', custo: '', unidade_custo: 'cosmo', power: '', resistance: '', bonusPower: '', bonusResistance: '',
    equipar_custo: '', damage_cloth: '', soul: '', attack: '', awaken: '', keywords: '', rules: '',
    habilidade_awaken_en: '', flavour: '', art: null,
  };
}

// ---------- texto de regras: cards.json <-> markup ----------
const COST = { 'Latent Cosmo': '{L}', 'Base Cosmo': '{B}', Cosmo: '{C}' }; // {B} e {C} usam o mesmo ícone
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

export function toMarkup(text) {
  let m = text.match(/^(.+?) — Cost: (\d+) (Latent Cosmo|Base Cosmo|Cosmo)\. (.*)$/);
  let out = m ? `**${m[2]} ${COST[m[3]]} ${m[1].toUpperCase()}:**\n${m[4]}` : text;
  if (!m && (m = text.match(/^([^.—]{2,30}) — ([^.—]{1,25})\. (.*)$/))) out = `**${m[1]} — ${m[2]}:**\n${m[3]}`;
  else if (!m && (m = text.match(/^([^.—]{2,40}) — (.*)$/))) out = `**${m[1]}:**\n${m[2]}`;
  return out
    .replace(/(\d+) (Latent Cosmo|Base Cosmo|Cosmo)\b/g, (_, n, u) => `${n} ${COST[u]}`)
    .replace(/(^|[\s(])([+-]\d+\/[+-]\d+)/g, '$1**$2**');
}

export function fromMarkup(md) {
  let s = md.trim();
  const UNIT = { L: 'Latent Cosmo', B: 'Base Cosmo', C: 'Cosmo' };
  let m = s.match(/^\*\*(\d+) \{([BCL])\} (.+?):\*\*\s*\n?([\s\S]*)$/);
  if (m) s = `${titleCase(m[3])} — Cost: ${m[1]} ${UNIT[m[2]]}. ${m[4]}`;
  else if ((m = s.match(/^\*\*([^*—]{2,30}) — ([^*—]{1,25}):\*\*\s*\n?([\s\S]*)$/))) s = `${m[1]} — ${m[2]}. ${m[3]}`;
  else if ((m = s.match(/^\*\*([^*]{2,40}):\*\*\s*\n?([\s\S]*)$/))) s = `${m[1]} — ${m[2]}`;
  return s
    .replace(/\{([BCL])\}/g, (_, k) => UNIT[k])
    .replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

const splitParas = (md) => md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// ---------- layout ----------
function layoutKey(s) {
  const subs = list(s.subtipos);
  const sub = subs.find((x) => T.typeToLayout[`${s.tipo}:${x}`]);
  return T.typeToLayout[sub ? `${s.tipo}:${sub}` : s.tipo] || 'devotee';
}
const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => x.trim()).filter(Boolean);
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

function typeLine(s, fmt) {
  return fmt.replace('{tipo}', s.tipo).replace('{faccao}', s.faccao).replace('{subtipos}', list(s.subtipos).join(' — '))
    .replace(/\s*[—-]\s*$/, '').replace(/\s*[—-]\s*(?=\s*[—-])/g, '');
}

// ---------- desenho ----------
const font = (style, size) => T.styles[style].font.replace('{s}', size.toFixed(1));

// Aproxima os efeitos de camada dos PSDs: Outer Glow amarelo em Screen (35%, 57px) e
// Drop Shadow preto com choke 94 (vira um contorno duro de ~6px). `outline` desenha esse contorno.
function paint(glow, shadowAlpha, draw, outline) {
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = 'rgba(255,252,0,0.55)';
    ctx.shadowBlur = 57;
    draw();
    ctx.restore();
  }
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur = 6;
  if (outline) {
    ctx.strokeStyle = `rgba(42,36,6,${shadowAlpha})`; // preto em Multiply sobre o brilho = oliva
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

function drawText(text, style, x, y, size, maxW) {
  if (!text) return;
  const s = fitText(text, style, size, maxW);
  ctx.fillStyle = T.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  paint(T.styles[style].glow, 0.92, () => ctx.fillText(text, x, y),
    () => { ctx.lineWidth = Math.min(11, s * 0.16); ctx.strokeText(text, x, y); });
}

async function drawPiece(key, el = {}) {
  const p = P[key];
  const im = await loadImg(pieceSrc(key));
  if (!p || !im) return null;
  const [x, y, w, h] = el.rect || [p.x + (el.dx || 0), p.y + (el.dy || 0), p.w, p.h];
  ctx.drawImage(im, x, y, w, h);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

async function drawGlowPiece(key, el = {}) {
  const p = P[key];
  const im = await loadImg(pieceSrc(key));
  if (!p || !im) return null;
  const x = p.x + (el.dx || 0), y = p.y + (el.dy || 0);
  paint(true, 0.92, () => ctx.drawImage(im, x, y));
  return { cx: x + p.w / 2, cy: y + p.h / 2 };
}

function tokenize(para) {
  const toks = [];
  let bold = false;
  for (const part of para.split(/(\*\*|\{[BCL]\}|\n|[ \t]+)/)) {
    if (!part) continue;
    if (part === '**') bold = !bold;
    else if (part === '\n') toks.push({ t: 'br' });
    else if (/^[ \t]+$/.test(part)) toks.push({ t: 'sp' });
    else if (/^\{[BCL]\}$/.test(part)) toks.push({ t: 'icon', key: part === '{L}' ? 'athena/icon_latent' : 'athena/icon_cosmo', bold });
    else if (KEYWORDS.has(part.replace(/[^A-Za-z]/g, '').toLowerCase())) toks.push({ t: 'w', text: part.toUpperCase(), bold: true });
    else toks.push({ t: 'w', text: part, bold });
  }
  return toks;
}
// keywords de uma palavra (docs/guia-do-jogo.md §24) saem em NEGRITO MAIÚSCULO no texto de regras, como nos PSDs
const KEYWORDS = new Set(['guardian', 'nimble', 'cheater', 'pierce', 'impulse', 'sealed', 'unfaith']);

function layoutRules(paras, size, maxW) {
  const lh = size * 1.13, gap = size * 0.55, iconW = size * 1.05;
  const fNorm = T.styles.rules.font.replace('{s}', size), fBold = T.styles.rules.bold.replace('{s}', size);
  ctx.font = fNorm;
  const spW = ctx.measureText(' ').width;
  const out = [];
  let h = 0;
  paras.forEach((para, pi) => {
    let line = [], lw = 0, pendingSp = false;
    const flush = () => { out.push({ items: line, w: lw }); h += lh; line = []; lw = 0; pendingSp = false; };
    for (const tk of tokenize(para)) {
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

async function drawRules(el, s) {
  const [rx, ry, rw, rh] = el.rect;
  const paras = [];
  if (has(s.keywords)) paras.push(`**${list(s.keywords).join(', ').toUpperCase()}.**`);
  paras.push(...splitParas(s.rules));
  if (layoutKey(s) === 'god' && has(s.habilidade_awaken_en)) {
    paras.push(`**AWAKEN${has(s.awaken) ? ` ${s.awaken} {L}` : ''}:**\n${s.habilidade_awaken_en}`);
  }
  if (!paras.length) return;
  let size = el.size, L;
  // encolhe até caber na caixa
  for (; size >= 22; size -= 1) { L = layoutRules(paras, size, rw); if (L.h <= rh) break; }
  const icons = { 'athena/icon_cosmo': await loadImg(pieceSrc('athena/icon_cosmo')), 'athena/icon_latent': await loadImg(pieceSrc('athena/icon_latent')) };
  ctx.fillStyle = T.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let y = ry;
  for (const ln of L.lines) {
    if (ln.gap) { y += ln.gap; continue; }
    const x0 = rx + (rw - ln.w) / 2, cy = y + L.lh / 2;
    const run = (stroke) => {
      for (const it of ln.items) {
        if (it.t === 'icon') {
          const im = icons[it.key], d = size * 1.0;
          if (im) ctx.drawImage(im, x0 + it.x + (it.w - d) / 2, cy - d / 2, d, d);
        } else {
          ctx.font = it.bold ? L.fBold : L.fNorm;
          (stroke ? ctx.strokeText : ctx.fillText).call(ctx, it.text, x0 + it.x, cy);
        }
      }
    };
    paint(false, 0.5, () => run(false), () => { ctx.lineWidth = size * 0.17; run(true); });
    y += L.lh;
  }
}

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
  // pré-carrega tudo antes de desenhar, para o frame sair inteiro
  const L = T.layouts[layoutKey(S)];
  await Promise.all([S.art?.src && loadImg(S.art.src), loadImg(pieceSrc(symbolKey(S.faccao))),
    ...Object.keys(P).map((k) => loadImg(pieceSrc(k)))]);
  if (seq !== renderSeq) return;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  for (const el of L.elements) {
    switch (el.kind) {
      case 'art': await drawArt(S); break;
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
        const key = S.unidade_custo === 'base_cosmo' ? 'athena/gem_cost_base' : 'athena/gem_cost';
        const p = P[key];
        await drawGlowPiece(key, { dx: el.x - p.w / 2 - p.x, dy: el.y - p.h / 2 - p.y });
        drawText(String(S.custo), 'number', el.x - 3, el.y + 4, el.size, 200);
        break;
      }
      case 'gem': {
        const v = S[{ equip: 'equipar_custo', damage: 'damage_cloth' }[el.field] || el.field];
        if (!has(v)) break;
        const g = await drawGlowPiece(el.piece, el);
        if (!g) break;
        if (el.label) {
          drawText(el.label, 'label', g.cx, g.cy - 46, 24, 140);
          drawText(String(v), 'number', g.cx - 2, g.cy + 17, el.size, 120);
        } else drawText(String(v), 'number', g.cx - 3, g.cy, el.size, 150);
        break;
      }
      case 'text': {
        let v = el.field === 'typeLine' ? typeLine(S, L.typeLine) : el.field === 'name' ? (S.title || S.nome_exibicao_en) : S[el.field];
        if (!has(v)) break;
        v = String(v).trim();
        drawText(el.upper ? v.toUpperCase() : v, el.style, el.x, el.y, el.size, el.maxW);
        break;
      }
      case 'rules': await drawRules(el, S); break;
      case 'rarity': {
        const key = `athena/rarity_${S.raridade.toLowerCase()}`;
        const p = P[key];
        const h = el.h || p?.h, w = p ? p.w * h / p.h : 0;
        if (p) await drawPiece(key, { rect: [el.x - w / 2, el.y - h / 2, w, h] });
        break;
      }
    }
    if (seq !== renderSeq) { ctx.restore(); return; }
  }
  ctx.restore();
}

// ---------- formulário ----------
const NUM = ['custo', 'power', 'resistance', 'equipar_custo', 'damage_cloth', 'soul', 'attack', 'awaken'];

function fillForm() {
  for (const [k, v] of Object.entries(S)) {
    const f = form.elements[k];
    if (f) f.value = v ?? '';
  }
  $('#artZoom').value = S.art?.zoom ?? 1;
  syncVisibility();
}

function syncVisibility() {
  const lk = layoutKey(S);
  form.querySelectorAll('[data-for]').forEach((el) => { el.hidden = !el.dataset.for.split(' ').includes(lk); });
}

form.addEventListener('input', (e) => {
  const f = e.target;
  if (!(f.name in S)) return;
  S[f.name] = f.value;
  if (f.name === 'tipo' || f.name === 'subtipos') syncVisibility();
  render();
});

// ---------- carregar carta ----------
function fromCard(c, proj = {}) {
  const s = blankState();
  for (const k of Object.keys(s)) if (k in c && c[k] !== null) s[k] = c[k];
  s.subtipos = (c.subtipos || []).join(', ');
  s.keywords = (c.keywords_en || []).join(', ');
  gen = (c.habilidades_en || []).map((text) => ({ text, markup: toMarkup(text) }));
  s.rules = gen.map((g) => g.markup).join('\n\n');
  const bonus = (c.habilidades_en || []).join(' ').match(/gets ([+-]\d+)\/([+-]\d+)/);
  if (bonus && c.tipo === 'Relic') { s.bonusPower = bonus[1]; s.bonusResistance = bonus[2]; }
  return Object.assign(s, proj, { art: proj.art || null });
}

async function selectCard(id) {
  const c = db.cartas.find((x) => x.id === id);
  if (!c) return;
  orig = c;
  let proj = {};
  try { const r = await fetch(`projects/${id}.json`); if (r.ok) proj = await r.json(); } catch { /* sem projeto */ }
  S = fromCard(c, proj);
  if (!S.art && c.caminho_imagem) {
    const src = `../ARTS/${c.caminho_imagem.split('/').pop()}`;
    const im = await loadImg(src);
    if (im) { S.art = { src }; coverArt(im); }
  }
  fillForm();
  setRef(c.caminho_imagem ? `../${c.caminho_imagem}` : null);
  say(S.art ? `${c.id} carregada` : `${c.id} carregada — sem arte, envie uma imagem`);
  render();
}

function newCard() {
  orig = null;
  gen = [];
  const prefix = S.faccao.toLowerCase();
  const nums = db.cartas.map((c) => c.id.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1]).filter(Boolean).map(Number);
  S = blankState();
  S.faccao = prefix === 'athena' || !prefix ? 'Athena' : S.faccao;
  S.id = `${S.faccao.toLowerCase()}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
  S.nome_exibicao_en = 'New Card';
  $('#cardSelect').value = '';
  fillForm();
  setRef(null);
  say(`nova carta ${S.id}`);
  render();
}

// ---------- arte: upload, pan, zoom ----------
function coverArt(im) {
  const k = Math.max(W / im.naturalWidth, H / im.naturalHeight);
  S.art.w = im.naturalWidth * k;
  S.art.x = (W - S.art.w) / 2;
  S.art.y = (H - im.naturalHeight * k) / 2;
  S.art.zoom = 1;
  S.art.baseW = S.art.w;
  $('#artZoom').value = 1;
}

function readArt(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const r = new FileReader();
  r.onload = async () => {
    S.art = { src: r.result, uploaded: true };
    coverArt(await loadImg(r.result));
    render();
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
  render();
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
const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomArt(Math.exp(-e.deltaY * 0.0015), ...toCanvas(e)); }, { passive: false });
$('#artZoom').addEventListener('input', (e) => {
  if (!S.art?.w) return;
  if (!S.art.baseW) S.art.baseW = S.art.w / (S.art.zoom || 1);
  zoomArt((S.art.baseW * Number(e.target.value)) / S.art.w);
});
$('#artCover').addEventListener('click', async () => { if (S.art?.src) { coverArt(await loadImg(S.art.src)); render(); } });

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
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('#exportHi').addEventListener('click', async () => { await render(); download(canvas, `${fileBase()}.png`); say('PNG 1488×2091 exportado'); });
$('#exportWeb').addEventListener('click', async () => {
  await render();
  const w = 1100, h = Math.round(w * H / W);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, w, h);
  download(c, `${fileBase()}-web.png`);
  say(`PNG web ${w}×${h} exportado`);
});

// ---------- salvar ----------
async function post(url, body, type = 'application/json') {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `HTTP ${r.status} — rode python3 card-forge/serve.py`);
  return j;
}

$('#saveProject').addEventListener('click', async () => {
  try {
    if (!S.id) throw new Error('carta sem id');
    const art = S.art ? { ...S.art } : null;
    if (art?.uploaded) {
      const blob = await (await fetch(art.src)).blob();
      const png = await new Promise(async (ok) => {
        const im = await loadImg(art.src);
        const c = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight });
        c.getContext('2d').drawImage(im, 0, 0);
        c.toBlob(ok, blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.95);
      });
      const res = await post(`/api/art/${S.id}`, png, png.type);
      art.src = res.path.replace(/^card-forge\//, '');
      delete art.uploaded;
      S.art = { ...art };
    }
    const proj = { title: S.title, subtitle: S.subtitle, flavour: S.flavour, bonusPower: S.bonusPower, bonusResistance: S.bonusResistance, art };
    await post(`/api/project/${S.id}`, JSON.stringify(proj));
    say(`projeto salvo em card-forge/projects/${S.id}.json`);
  } catch (e) { say(e.message, true); }
});

function buildCard() {
  const base = orig ? structuredClone(orig) : Object.fromEntries(Object.keys(db.cartas[0]).map((k) => [k, null]));
  const n = (v) => (has(v) ? Number(v) : null);
  const paras = splitParas(S.rules);
  const habilidades = paras.map((md, i) => (gen[i] && gen[i].markup === md ? gen[i].text : fromMarkup(md)));
  Object.assign(base, {
    id: S.id, nome_exibicao_en: S.nome_exibicao_en.trim(), faccao: S.faccao, tipo: S.tipo,
    subtipos: list(S.subtipos), raridade: S.raridade, keywords_en: list(S.keywords), habilidades_en: habilidades,
  });
  if (!orig) Object.assign(base, { nome_interno_pt: '', status: 'needs-review', cosmoble: false, caminho_imagem: null, habilidade_awaken_en: '', ultimate_en: '', notas_pt: '' });
  for (const k of NUM) base[k] = n(S[k]);
  if (S.tipo === 'God') base.habilidade_awaken_en = S.habilidade_awaken_en;
  if (has(base.custo)) base.unidade_custo = S.unidade_custo; else base.unidade_custo = null;
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

let pending = null;
$('#saveCards').addEventListener('click', () => {
  if (!S.id) return say('carta sem id', true);
  pending = buildCard();
  const d = diffCards(orig, pending);
  if (!d.length) return say('nada mudou em relação ao cards.json');
  $('#diffTarget').textContent = orig ? `Carta ${S.id} (substitui)` : `Carta nova ${S.id} (adiciona ao fim)`;
  const body = $('#diffBody');
  body.replaceChildren(...d.flatMap(({ k, x, y }) => {
    const del = Object.assign(document.createElement('div'), { className: 'del', textContent: `- ${k}: ${x}` });
    const add = Object.assign(document.createElement('div'), { className: 'add', textContent: `+ ${k}: ${y}` });
    return orig ? [del, add] : [add];
  }));
  $('#diffDialog').showModal();
});
$('#diffCancel').addEventListener('click', () => $('#diffDialog').close());
$('#diffConfirm').addEventListener('click', async () => {
  $('#diffDialog').close();
  try {
    await post('/api/card', JSON.stringify(pending));
    db = await (await fetch('../data/cards.json')).json();
    orig = db.cartas.find((c) => c.id === pending.id);
    gen = (orig.habilidades_en || []).map((text) => ({ text, markup: toMarkup(text) }));
    fillCardSelect(orig.id);
    say(`cards.json gravado (${pending.id})`);
  } catch (e) { say(e.message, true); }
});

// ---------- início ----------
function fillCardSelect(selected) {
  const sel = $('#cardSelect');
  sel.replaceChildren(new Option('— nova carta —', ''), ...db.cartas.map((c) => new Option(`${c.id} · ${c.nome_exibicao_en} (${c.tipo})`, c.id)));
  sel.value = selected || '';
}
$('#cardSelect').addEventListener('change', (e) => (e.target.value ? selectCard(e.target.value) : newCard()));
$('#newCard').addEventListener('click', newCard);

try {
  db = await (await fetch('../data/cards.json')).json();
  const start = new URLSearchParams(location.search).get('card') || 'athena-002';
  fillCardSelect(start);
  await selectCard(start);
} catch (e) {
  say(`falha ao carregar cards.json: ${e.message}`, true);
}

window.forge = { S: () => S, render, toMarkup, fromMarkup, buildCard };
