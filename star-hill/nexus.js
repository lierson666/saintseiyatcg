// NEXUS (autor, 11/11/2026): o blog do Cosmo Hub dentro do STAR HILL. Lista todos os posts (rascunhos e publicados, PT e EN),
// cria e edita com prévia, publica e despublica, e mostra como a matéria entra no banner da home (playtest/lobby.js, loadNews).
// Fala com a API do Hub pela ponte local card-forge/nexus_proxy.py (sessão só na memória do app; docs/star-hill-nexus.md).
import {lightArt} from '../shared/light-art.js?v=20261102-art1';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const css = href => document.querySelector(`link[href*="${href.split('?')[0].split('/').pop()}"]`) || document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href}));
const KINDS = {news: 'Notícia', guide: 'Guia', lesson: 'Lição', ruling: 'Ruling', balance: 'Balanceamento'};
const BANNER_KINDS = ['news', 'guide', 'lesson']; // as mesmas do lobby: /api/platform/content?kind=news,guide,lesson
const HOME_MAX = 5; // placement 'home': o autor escolhe o que vai à home do jogo, até 5 por idioma (autor, 11/11/2026)
const isHome = a => a.placement === 'home';
const homeCount = lang => posts.filter(a => isHome(a) && a.lang === lang).length;
const NEWS_GODS = ['god-athena', 'god-poseidon', 'god-hades', 'god-ares', 'god-artemis'];
const ART = '../card-forge/art-web/';
const BLANK = {kind: 'news', slug: '', title: '', body: '', category: '', lang: 'pt', featured: false, meta: {}};
let st = null, posts = [], art = null, cur = null, dirty = false, slugTouched = false, filtro = {lang: '', status: ''};
let ctx;

async function nx(path, body) {
  const r = await fetch('/api/star-hill/nexus/' + path, body === undefined ? {cache: 'no-store'} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (r.status === 404 && !data.erro?.includes('Nexus')) throw Error('O servidor do STAR HILL ainda não tem o Nexus. Feche e abra o app STAR HILL para ativar.');
  if (!r.ok) throw Object.assign(Error(data.erro || 'Não foi possível concluir.'), {status: r.status});
  return data;
}

// Capa: mesma regra do lobby e do Hub (meta.cover, senão a 1ª carta citada, senão um God pelo slug).
const forgeOf = id => art?.get(id.startsWith('god-') ? `${id.slice(4)}-001` : id);
const artOf = id => { const f = id && forgeOf(id); return f?.ilustracao ? lightArt(ART + f.ilustracao) : ''; };
const coverId = a => { const id = a.meta?.cover || a.meta?.card_refs?.[0]; return id && artOf(id) ? id : NEWS_GODS[[...String(a.slug || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0) % NEWS_GODS.length]; };
const newsText = (t, n = 150) => { t = String(t || '').replace(/[#*_>`[\]]/g, '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t; };
const when = t => t ? new Date(t * 1000).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'}) : '—';
const slugify = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const live = a => a.status === 'published' && (a.publish_at || 0) <= Date.now() / 1000;

// Banner da home, mesma regra de playtest/lobby.js (loadNews): publicadas do idioma do jogador (sem nenhuma, as do outro);
// entre elas, só as marcadas para a home; sem marcada, as 5 mais recentes.
function banner(lang, list = posts) {
  const pub = list.filter(a => live(a) && BANNER_KINDS.includes(a.kind)), mine = pub.filter(a => a.lang === lang);
  const pool = mine.length ? mine : pub, home = pool.filter(isHome);
  return {fallback: !mine.length && !!pub.length, auto: !home.length, items: (home.length ? home : pool).sort((a, b) => (b.publish_at || 0) - (a.publish_at || 0)).slice(0, HOME_MAX)};
}
// Onde o post aberto ficaria no banner se fosse publicado agora (ou onde já está).
function bannerSpot(a) {
  if (!BANNER_KINDS.includes(a.kind)) return `${KINDS[a.kind]} não entra no banner da home (só Notícia, Guia e Lição).`;
  if (!isHome(a) && posts.some(p => isHome(p) && p.lang === a.lang && live(p))) return `Fora da home do jogo: marque "Home do jogo" para ele entrar no banner ${a.lang.toUpperCase()}.`;
  const sim = live(a) ? posts : [...posts.filter(p => p.id !== a.id), {...a, status: 'published', publish_at: Date.now() / 1000}];
  const pos = banner(a.lang, sim).items.findIndex(p => p.id === a.id || (!a.id && p.slug === a.slug));
  const where = `banner ${a.lang.toUpperCase()}`;
  if (live(a)) return pos >= 0 ? `No ar: posição ${pos + 1} de 5 no ${where}.` : `No ar, mas fora do ${where} (há 5 matérias mais novas).`;
  return pos >= 0 ? `Ao publicar, entra na posição ${pos + 1} do ${where}.` : `Ao publicar, não entra no ${where}.`;
}

function bar() {
  const local = st.producao ? '' : st.alvo.split(':').pop();
  const who = st.conectado ? `<span class="nx-ok">Conectado como <b>${esc(st.usuario)}</b>${st.papeis.length ? ` · ${esc(st.papeis.join(', '))}` : ' · sem papel de publisher'}</span><button data-nx="sair">Sair</button>`
    : `<form class="nx-login" data-nx="entrar"><input name="email" type="email" autocomplete="username" placeholder="E-mail da conta" required aria-label="E-mail"><input name="senha" type="password" autocomplete="current-password" placeholder="Senha" required aria-label="Senha"><button class="primary">Entrar em ${esc(st.host)}</button></form>`;
  return `<section class="panel nx-bar${st.producao ? ' is-prod' : ''}"><div class="nx-target"><label><small>Destino</small><select id="nx-alvo">
      <option value="prod" ${st.producao ? 'selected' : ''}>Produção · saintseiyatcg.com</option><option value="local" ${st.producao ? '' : 'selected'}>Teste local (este Mac)</option></select></label>
      <label class="nx-port" ${st.producao ? 'hidden' : ''}><small>Porta</small><input id="nx-porta" inputmode="numeric" value="${esc(local || '8031')}" aria-label="Porta do teste local"></label>
      ${st.producao ? '<span class="tag nx-live">AO VIVO</span>' : '<span class="tag">TESTE</span>'}</div>
    <div class="nx-who">${who}</div>
    <p class="hint nx-safe">A senha vai direto para ${esc(st.host)} e não é guardada. A sessão fica só na memória do STAR HILL e some ao fechar o app. Publicar, despublicar, apagar e editar post no ar pedem confirmação.</p></section>`;
}

function listHtml() {
  const items = posts.filter(a => (!filtro.lang || a.lang === filtro.lang) && (!filtro.status || a.status === filtro.status));
  const n = s => posts.filter(a => a.status === s).length;
  const chip = (key, v, label) => `<button class="nx-chip" data-nx="filtro" data-key="${key}" data-v="${v}" aria-pressed="${filtro[key] === v}">${label}</button>`;
  return `<div class="nx-filters">${chip('lang', '', 'PT + EN')}${chip('lang', 'pt', 'PT')}${chip('lang', 'en', 'EN')}<span></span>${chip('status', '', `Todos ${posts.length}`)}${chip('status', 'published', `No ar ${n('published')}`)}${chip('status', 'draft', `Rascunhos ${n('draft')}`)}</div>
    <button class="primary nx-new" data-nx="novo">+ Novo post</button>
    <p class="nx-homecount" title="Posts marcados para o banner da home do jogo, por idioma (máximo ${HOME_MAX})">Home do jogo · PT <b>${homeCount('pt')}/${HOME_MAX}</b> · EN <b>${homeCount('en')}/${HOME_MAX}</b></p>
    <div class="nx-list">${items.map(a => `<div class="nx-item"><button class="nx-row" data-nx="abrir" data-id="${a.id}" aria-current="${cur?.id === a.id}">
      <i style="background-image:url('${artOf(coverId(a))}')"></i><span><b>${esc(a.title)}</b><small>${esc(KINDS[a.kind] || a.kind)} · ${a.lang.toUpperCase()} · ${when(a.publish_at || a.updated_at)}</small></span>
      <em class="${a.status === 'published' ? 'is-live' : ''}">${a.status === 'published' ? 'No ar' : 'Rascunho'}</em></button>
      ${BANNER_KINDS.includes(a.kind) ? `<button class="nx-home" data-nx="home" data-id="${a.id}" aria-pressed="${isHome(a)}" title="${isHome(a) ? 'Tirar da home do jogo' : 'Colocar na home do jogo'}">Home</button>` : ''}</div>`).join('') || '<p class="hint">Nenhum post com este filtro.</p>'}</div>
    ${posts.length >= 50 ? '<p class="hint">A API devolve no máximo 50 posts; os mais antigos podem não aparecer.</p>' : ''}`;
}

function editorHtml() {
  const a = cur, saved = !!a.id, isLive = a.status === 'published';
  const opt = (v, label, on) => `<option value="${v}" ${v === on ? 'selected' : ''}>${label}</option>`;
  const {cover, ...rest} = a.meta || {};
  return `<form class="nx-form" id="nx-form" autocomplete="off">
    <div class="nx-row2"><label class="field"><span>Tipo</span><select name="kind" ${saved ? 'disabled' : ''}>${Object.entries(KINDS).map(([k, l]) => opt(k, l, a.kind)).join('')}</select></label>
      <label class="field"><span>Idioma</span><select name="lang" ${saved ? 'disabled' : ''}>${opt('pt', 'Português (PT)', a.lang)}${opt('en', 'English (EN)', a.lang)}</select></label></div>
    <label class="field"><span>Título <output>${a.title.length}/120</output></span><input name="title" maxlength="120" required value="${esc(a.title)}"></label>
    <label class="field"><span>Endereço (slug)${saved ? ' · não muda depois de criado' : ''}</span><input name="slug" pattern="[a-z0-9][a-z0-9\\-]{1,79}" required value="${esc(a.slug)}" ${saved ? 'readonly' : ''}></label>
    <div class="nx-row2"><label class="field"><span>Selo (categoria)</span><input name="category" maxlength="40" value="${esc(a.category || '')}" placeholder="${esc(KINDS[a.kind])}"></label>
      <label class="field"><span>Capa (id da carta)</span><input name="cover" list="nx-cards" value="${esc(cover || '')}" placeholder="automática"></label></div>
    ${BANNER_KINDS.includes(a.kind) ? `<label class="check-field"><input type="checkbox" name="placement" value="home" ${isHome(a) ? 'checked' : ''}> Home do jogo (banner da home, até ${HOME_MAX} por idioma)</label>` : ''}
    <label class="check-field"><input type="checkbox" name="featured" ${a.featured ? 'checked' : ''}> Destaque no Cosmo Hub (aparece primeiro na lista do Hub)</label>
    <label class="field"><span>Texto</span><textarea name="body" rows="14" required>${esc(a.body)}</textarea></label>
    <details class="nx-meta"><summary>Meta avançado (JSON: rule_refs, card_refs, campos de balanceamento)</summary><textarea name="meta" rows="4">${esc(Object.keys(rest).length ? JSON.stringify(rest, null, 1) : '')}</textarea></details>
    <div class="nx-actions"><button class="primary" data-nx="salvar">${isLive ? 'Salvar e atualizar no ar' : 'Salvar rascunho'}</button>
      ${saved ? (isLive ? '<button data-nx="despublicar">Despublicar</button>' : '<button data-nx="publicar" class="nx-publish">Publicar…</button>') : ''}
      ${saved ? '<button data-nx="apagar" class="nx-delete">Apagar…</button>' : ''}
      ${saved && isLive ? `<a href="${esc(st.alvo)}/cosmohub/#/article/${encodeURIComponent(a.slug)}" target="_blank" rel="noopener">Abrir no Hub ↗</a>` : ''}
      <small>${saved ? `${isLive ? 'No ar' : 'Rascunho'} · revisão ${a.revision || 1} · ${esc(a.author || '')} · atualizado ${when(a.updated_at)}` : 'Novo · ainda não salvo'}${dirty ? ' · <b>alterações não salvas</b>' : ''}</small></div>
  </form><datalist id="nx-cards">${art ? [...art.values()].filter(c => c.ilustracao).map(c => `<option value="${esc(c.id)}">${esc(c.nome_exibicao_en || c.nome || '')}</option>`).join('') : ''}</datalist>`;
}

function previewHtml() {
  const a = cur, img = artOf(coverId(a));
  const lang = a.lang || 'pt', b = banner(lang, live(a) ? posts : [...posts.filter(p => p.id !== a.id), ...(BANNER_KINDS.includes(a.kind) ? [{...a, id: a.id || -1, status: 'published', publish_at: Date.now() / 1000}] : [])]);
  const slide = s => `<div class="nx-hero" style="--hero:url('${artOf(coverId(s))}')"><div><p class="nx-stamp">${esc(s.category || s.kind)}</p><h3>${esc(s.title || 'Sem título')}</h3><span>${esc(newsText(s.body))}</span><em>Read on the Cosmo Hub</em></div></div>`;
  return `<p class="nx-label">Banner da home · ${lang.toUpperCase()}</p>${slide(a)}<p class="hint nx-spot">${esc(bannerSpot(a))}</p>
    <ol class="nx-strip" aria-label="As 5 do banner ${lang.toUpperCase()}">${b.items.map(s => `<li class="${s.id === a.id || s.id === -1 ? 'is-me' : ''}" style="--hero:url('${artOf(coverId(s))}')" title="${esc(s.title)}"><span>${esc(s.title)}</span></li>`).join('')}</ol>
    ${b.fallback ? `<p class="hint">Nenhuma matéria em ${lang.toUpperCase()} no ar: o lobby mostra as do outro idioma.</p>` : ''}
    ${b.auto && b.items.length ? `<p class="hint">Nenhum post marcado para a home em ${lang.toUpperCase()}: o banner usa as ${HOME_MAX} mais recentes.</p>` : ''}
    <p class="nx-label">Página no Cosmo Hub</p><article class="nx-article">${img ? `<img src="${img}" alt="">` : ''}<p class="nx-stamp">${esc(a.category || KINDS[a.kind] || a.kind)}</p>
      <h2>${esc(a.title || 'Sem título')}</h2><p class="hint">${esc(a.author || st.usuario || 'Você')} · ${when(a.publish_at || Date.now() / 1000)}</p><div class="nx-body">${esc(a.body)}</div></article>`;
}

function paint() {
  const root = ctx.root;
  if (!st.conectado) {
    root.innerHTML = `${bar()}<section class="panel"><p class="hint">Estes são os posts no ar em ${esc(st.host)}. Entre com a conta de publisher para editar, apagar e ver os rascunhos.</p>
      <div class="nx-list nx-list--open">${posts.map(a => `<div class="nx-row"><i style="background-image:url('${artOf(coverId(a))}')"></i><span><b>${esc(a.title)}</b><small>${esc(KINDS[a.kind] || a.kind)} · ${a.lang.toUpperCase()} · ${when(a.publish_at)}</small></span><em class="is-live">${isHome(a) ? 'Home · ' : ''}No ar</em></div>`).join('') || '<p class="hint">Nenhum post no ar.</p>'}</div></section>`;
    return;
  }
  root.innerHTML = `${bar()}<div class="nx-work"><aside class="panel nx-side">${listHtml()}</aside>
    ${cur ? `<section class="panel nx-edit">${editorHtml()}</section><section class="panel nx-preview" id="nx-preview">${previewHtml()}</section>` : '<section class="panel nx-edit"><p class="hint">Escolha um post ou crie um novo.</p></section>'}</div>`;
}

function readForm() {
  const f = ctx.root.querySelector('#nx-form');
  if (!f) return;
  const d = Object.fromEntries(new FormData(f));
  let meta = {};
  try { meta = d.meta?.trim() ? JSON.parse(d.meta) : {}; } catch { meta = cur.meta || {}; }
  if (d.cover?.trim()) meta.cover = d.cover.trim(); else delete meta.cover;
  cur = {...cur, title: d.title, body: d.body, category: d.category, featured: !!d.featured, placement: d.placement === 'home' ? 'home' : null, meta,
    ...(cur.id ? {} : {kind: d.kind, lang: d.lang, slug: slugTouched ? d.slug : slugify(d.title)})};
  if (!cur.id && !slugTouched) f.slug.value = cur.slug;
}

async function loadPosts() {
  posts = (await nx(st.conectado ? 'posts' : 'publicos')).items || [];
  if (cur?.id) cur = posts.find(p => p.id === cur.id) || null;
}
async function refreshAll() {
  st = await nx('estado');
  await loadPosts().catch(e => { if (e.status === 401) st.conectado = false; else throw e; });
}

const confirmHost = (verb, a) => confirm(`${verb} "${a.title}" em ${st.host}?\n\n${st.producao ? 'É o site AO VIVO: jogadores veem na hora no Cosmo Hub e no banner da home.' : 'Servidor de teste local.'}`);

async function save(extra = {}) {
  readForm();
  const {meta} = cur;
  const metaText = ctx.root.querySelector('[name=meta]')?.value.trim();
  if (metaText) { try { JSON.parse(metaText); } catch { throw Error('Meta avançado não é um JSON válido.'); } }
  const body = {id: cur.id, kind: cur.kind, slug: cur.slug, title: cur.title, body: cur.body, category: cur.category || '', lang: cur.lang, featured: cur.featured, placement: cur.placement || null, meta, ...extra};
  const r = await nx('salvar', body);
  dirty = false; slugTouched = false;
  const id = r.id;
  await loadPosts();
  cur = posts.find(p => p.id === id) || cur;
}

async function act(b) {
  const what = b.dataset.nx;
  if (what === 'filtro') { filtro[b.dataset.key] = b.dataset.v; return paint(); }
  if (what === 'novo') { if (dirty && !confirm('Descartar as alterações não salvas?')) return; cur = {...BLANK, meta: {}}; dirty = false; slugTouched = false; return paint(); }
  if (what === 'abrir') { if (dirty && !confirm('Descartar as alterações não salvas?')) return; cur = posts.find(p => p.id === Number(b.dataset.id)); dirty = false; return paint(); }
  if (what === 'sair') { st = await nx('sair', {}); posts = []; cur = null; return paint(); }
  if (what === 'salvar') {
    if (!ctx.root.querySelector('#nx-form').reportValidity()) return;
    const isLive = cur.status === 'published';
    if (isLive && !confirmHost('Atualizar no ar', cur)) return;
    await save(isLive ? {confirmar: st.host} : {});
    ctx.notice(isLive ? `Atualizado no ar em ${st.host}.` : 'Rascunho salvo.', true);
    return paint();
  }
  if (what === 'home') {
    const a = posts.find(p => p.id === Number(b.dataset.id)), on = !isHome(a);
    if (on && homeCount(a.lang) >= HOME_MAX) throw Error(`A home do jogo já tem ${HOME_MAX} posts em ${a.lang.toUpperCase()}. Tire um antes de colocar outro.`);
    if (a.status === 'published' && !confirm(`${on ? 'Colocar' : 'Tirar'} "${a.title}" ${on ? 'na' : 'da'} home do jogo em ${st.host}?${st.producao ? '\n\nÉ o site AO VIVO: muda o banner da home na hora.' : ''}`)) return;
    await nx('salvar', {id: a.id, slug: a.slug, placement: on ? 'home' : null, ...(a.status === 'published' ? {confirmar: st.host} : {})});
    await loadPosts();
    ctx.notice(on ? `"${a.title}" vai para a home do jogo.` : `"${a.title}" saiu da home do jogo.`, true);
    return paint();
  }
  if (what === 'apagar') {
    if (!confirm(`Apagar "${cur.title}" de ${st.host}?\n\nIsto NÃO pode ser desfeito: o post, as revisões e os comentários dele somem${cur.status === 'published' ? ', e ele sai do Cosmo Hub e do banner da home' : ''}.`)) return;
    await nx('apagar', {id: cur.id, confirmar: st.host});
    const title = cur.title;
    cur = null; dirty = false;
    await loadPosts();
    ctx.notice(`"${title}" apagado de ${st.host}.`, true);
    return paint();
  }
  if (what === 'publicar' || what === 'despublicar') {
    if (what === 'publicar' && !ctx.root.querySelector('#nx-form').reportValidity()) return;
    if (!confirmHost(what === 'publicar' ? 'Publicar' : 'Despublicar', cur)) return;
    if (what === 'publicar' && dirty) await save();
    await nx(what, {id: cur.id, confirmar: st.host});
    await loadPosts();
    ctx.notice(what === 'publicar' ? `Publicado em ${st.host}.` : `Voltou a rascunho em ${st.host}.`, true);
    return paint();
  }
}

export async function mountNexus(root, {notice}) {
  css('./nexus.css?v=20261111-nx3');
  ctx = {root, notice};
  root.innerHTML = '<p>Conectando ao Cosmo Hub…</p>';
  if (!art) art = await fetch(`${ART}cards.json`, {cache: 'no-cache'}).then(r => r.json()).then(d => new Map(d.cartas.map(c => [c.id, c]))).catch(() => new Map());
  try { await refreshAll(); } catch (e) { root.innerHTML = `<section class="panel"><h2>Nexus</h2><p class="hint">${esc(e.message)}</p></section>`; return; }
  paint();
  if (root.dataset.nxBound) return;
  root.dataset.nxBound = '1';
  const run = fn => fn().catch(e => { notice(e.message); if (e.status === 401) refreshAll().then(paint).catch(() => {}); });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-nx]');
    if (!b || b.tagName === 'FORM') return;
    if (b.tagName === 'BUTTON') e.preventDefault();
    run(() => act(b));
  });
  root.addEventListener('submit', e => {
    if (e.target.dataset.nx !== 'entrar') return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    e.target.senha.value = '';
    run(async () => { st = await nx('entrar', d); await loadPosts(); cur = null; paint(); ctx.notice(`Conectado a ${st.host}.`, true); });
  });
  root.addEventListener('input', e => {
    if (!e.target.closest('#nx-form')) return;
    if (e.target.name === 'slug') slugTouched = true;
    dirty = true; readForm();
    const out = root.querySelector('#nx-form output'); if (out) out.textContent = `${cur.title.length}/120`;
    const pv = root.querySelector('#nx-preview'); if (pv) pv.innerHTML = previewHtml();
  });
  root.addEventListener('change', e => {
    if (e.target.id === 'nx-alvo' || e.target.id === 'nx-porta') {
      const prod = root.querySelector('#nx-alvo').value === 'prod';
      const port = (root.querySelector('#nx-porta')?.value || '8031').replace(/\D/g, '');
      run(async () => { st = await nx('alvo', {alvo: prod ? 'https://saintseiyatcg.com' : `http://localhost:${port}`}); posts = []; cur = null; await loadPosts().catch(() => {}); paint(); });
    } else if (e.target.closest('#nx-form') && e.target.tagName === 'SELECT') { dirty = true; readForm(); paint(); }
  });
}
