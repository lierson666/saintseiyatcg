// ARENA FORGE 5.0 (autor, 07/11/2026): biblioteca de arenas, variantes, pipeline de publicação e manifesto publicado.
// Sem DOM: usado pelo STAR HILL (star-hill/arena-forge.js), pelo jogo (playtest/divine/scene.js) e pelos testes (tools/test-arena-model.mjs).
// Fonte única do que está publicado: data/arenas-published.json (manifesto). A biblioteca de trabalho fica em data/arena-library.json.
// Arenas são cosméticas: não mudam regra, custo, ordem nem dado competitivo. Sem preço, drop ou venda até aprovação do autor.

export const SCHEMA = 2;
export const SCENE_LEVEL = 1; // recursos que a cena entende hoje (mask 0..4, astro, árvores, colunas quebradas, poeira que cai/pisca)
export const STATUS = ['draft', 'development', 'validation', 'approved', 'published', 'archived'];
export const STATUS_PT = {draft: 'Rascunho', development: 'Desenvolvimento', validation: 'Validação', approved: 'Aprovada', published: 'Publicada', archived: 'Arquivada'};
const NEXT = {
  draft: ['development', 'archived'], development: ['validation', 'draft', 'archived'], validation: ['approved', 'development'],
  approved: ['published', 'development'], published: ['development', 'archived'], archived: ['draft'],
};
export const canMove = (from, to) => !!NEXT[from]?.includes(to);
export const VARIANTS = ['standard', 'day', 'night', 'sunset', 'storm', 'ruined', 'divine', 'legendary', 'seasonal'];
export const FACTIONS = ['Neutral', 'Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis'];
export const DEFAULT_ARENA = 'olympus';

// Campos visuais que a cena aceita (mesma lista de card-forge/arena_forge.py).
export const COLORS = ['skyTop', 'skyBottom', 'floorA', 'floorB', 'line', 'column', 'cap', 'light', 'dust', 'fog', 'glow'];
export const NUMBERS = {mask: [0, 4], pulse: [0, 4], metal: [0, 1], dustSize: [.3, 4]};
export const FLAGS = ['caustics', 'zodiac', 'broken', 'trees', 'fall', 'blink'];
export const ORB = {size: [2, 30], x: [-30, 30]};
const HEX = /^#[0-9a-f]{6}$/i, SLUG = /^[a-z][a-z0-9-]{1,39}$/;
const num = v => typeof v === 'number' && Number.isFinite(v);

export function paramErrors(p, where = 'params') {
  const e = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return [`${where}: objeto esperado`];
  for (const [k, v] of Object.entries(p)) {
    const at = `${where}.${k}`;
    if (COLORS.includes(k)) { if (typeof v !== 'string' || !HEX.test(v)) e.push(`${at}: cor #rrggbb`); }
    else if (k in NUMBERS) { const [lo, hi] = NUMBERS[k]; if (!num(v) || v < lo || v > hi) e.push(`${at}: número entre ${lo} e ${hi}`); }
    else if (FLAGS.includes(k)) { if (v !== 0 && v !== 1) e.push(`${at}: 0 ou 1`); }
    else if (k === 'orb') {
      if (v === null) continue;
      if (!v || typeof v !== 'object' || typeof v.color !== 'string' || !HEX.test(v.color)) { e.push(`${at}: astro com cor #rrggbb`); continue; }
      for (const [f, [lo, hi]] of Object.entries(ORB)) if (!num(v[f]) || v[f] < lo || v[f] > hi) e.push(`${at}.${f}: número entre ${lo} e ${hi}`);
    } else e.push(`${at}: campo desconhecido`);
  }
  return e;
}

// Erros de schema e de referência de uma arena da biblioteca. `bases`: chaves de tema que o código conhece.
export function arenaErrors(a, bases) {
  const e = [];
  if (!a || typeof a !== 'object') return ['arena: objeto esperado'];
  if (!SLUG.test(a.id || '')) e.push('id: minúsculas, números e hífen (2 a 40)');
  if (!String(a.nome || '').trim()) e.push('nome: obrigatório');
  if (!FACTIONS.includes(a.faccao)) e.push(`faccao: uma de ${FACTIONS.join(', ')}`);
  if (!bases.includes(a.base)) e.push(`base: tema do código inexistente (${a.base})`);
  if (!Number.isInteger(a.versao) || a.versao < 1) e.push('versao: inteiro >= 1');
  if (!STATUS.includes(a.status)) e.push('status: inválido');
  e.push(...paramErrors(a.params || {}, 'params'));
  const vs = a.variantes || [];
  if (!vs.some(v => v.id === 'standard')) e.push('variantes: precisa da variante standard');
  const seen = new Set();
  for (const v of vs) {
    if (!VARIANTS.includes(v.tipo)) e.push(`variante ${v.id}: tipo ${v.tipo} inválido`);
    if (!SLUG.test(v.id || '') || seen.has(v.id)) e.push(`variante ${v.id}: id inválido ou repetido`);
    seen.add(v.id);
    if (!String(v.nome || '').trim()) e.push(`variante ${v.id}: nome obrigatório`);
    e.push(...paramErrors(v.params || {}, `variante ${v.id}`));
  }
  return e;
}

export function libraryErrors(lib, bases) {
  if (!lib || lib.schema !== SCHEMA || !Array.isArray(lib.arenas)) return [`biblioteca: schema ${SCHEMA} com lista de arenas`];
  const ids = new Set(), e = [];
  for (const a of lib.arenas) { if (ids.has(a.id)) e.push(`id repetido: ${a.id}`); ids.add(a.id); e.push(...arenaErrors(a, bases).map(x => `${a.id}: ${x}`)); }
  return e;
}

// Parâmetros completos de uma variante: tema-base do código < arena < variante. Resultado congelado no manifesto.
export function resolveParams(defaults, arena, variantId = 'standard') {
  const v = arena.variantes.find(x => x.id === variantId) || arena.variantes.find(x => x.id === 'standard');
  const out = {...structuredClone(defaults[arena.base] || defaults[DEFAULT_ARENA]), ...structuredClone(arena.params || {}), ...structuredClone(v?.params || {})};
  delete out.label;
  return out;
}

export const themeKey = (id, variant = 'standard') => (variant === 'standard' ? id : `${id}~${variant}`);
export const splitKey = key => { const [id, variant = 'standard'] = String(key || '').split('~'); return {id, variant}; };

// Gate final da validação: métricas medidas no navegador -> itens {regra, nivel: ok|aviso|erro, detalhe}.
export const BUDGET = {calls: 16, callsPhone: 8, worldMs: 8, textures: 6, geometries: 20, lumaMax: .7, lumaFail: .8, busy: .2};
export function gate(m) {
  const it = (regra, ok, detalhe, warnOnly = false) => ({regra, nivel: ok ? 'ok' : warnOnly ? 'aviso' : 'erro', detalhe});
  const r = [
    it('Schema e referências', !m.schema?.length, m.schema?.length ? m.schema.join('; ') : 'ok'),
    it('Carregamento', m.loaded && !m.shaderErrors, m.loaded ? (m.shaderErrors ? `${m.shaderErrors} erro(s) de shader` : 'cena criada') : 'cena não abriu (sem WebGL ou erro)'),
    it('Draw calls (desktop)', m.calls <= BUDGET.calls, `${m.calls} de ${BUDGET.calls}`),
    it('Draw calls (celular)', m.callsPhone <= BUDGET.callsPhone, `${m.callsPhone} de ${BUDGET.callsPhone}`),
    it('Tempo de GPU da arena', m.worldMs <= BUDGET.worldMs, `${m.worldMs} ms por quadro (teto ${BUDGET.worldMs})`, true),
    it('Memória (texturas e malhas)', m.textures <= BUDGET.textures && m.geometries <= BUDGET.geometries, `${m.textures} texturas, ${m.geometries} malhas`),
    it('Zonas protegidas do jogo', !m.zoneHits?.length, m.zoneHits?.length ? `invadem o campo: ${m.zoneHits.join(', ')}` : 'nada da arena sobre o campo'),
    {regra: 'Legibilidade do HUD', nivel: m.luma > BUDGET.lumaFail ? 'erro' : m.luma > BUDGET.lumaMax ? 'aviso' : 'ok', detalhe: `brilho médio no campo ${m.luma} (aviso acima de ${BUDGET.lumaMax})`},
    it('Fundo calmo sob as cartas', m.busy <= BUDGET.busy, `variação ${m.busy}`, true),
    it('Reduzir movimento', m.stillOk, m.stillOk ? 'arena para' : 'arena continua animando'),
  ];
  return {ok: r.every(x => x.nivel !== 'erro'), itens: r};
}

// Publicar: só arena aprovada com validação sem erro. Congela a versão (parâmetros completos por variante) no histórico e no manifesto.
export function publish(lib, id, defaults, {autor = 'autor', nota = '', em = new Date().toISOString()} = {}) {
  const lib2 = structuredClone(lib), a = lib2.arenas.find(x => x.id === id);
  if (!a) throw Error(`Arena ${id} não existe.`);
  if (a.status !== 'approved') throw Error('Só uma arena aprovada pode ser publicada.');
  if (!a.validacao?.ok || a.validacao.versao !== a.versao) throw Error('Valide esta versão antes de publicar.');
  const snap = {id: a.id, versao: a.versao, nome: a.nome, faccao: a.faccao, base: a.base, descricao: a.descricao || '', autor: a.autor || autor, requer: SCENE_LEVEL,
    cosmetico: {tipo: 'arena', aquisicao: 'livre'}, publicado_em: em, publicado_por: autor, nota,
    variantes: a.variantes.filter(v => !v.arquivada).map(v => ({id: v.id, nome: v.nome, tipo: v.tipo, thumb: v.thumb || null, params: resolveParams(defaults, a, v.id)}))};
  a.historico = [...(a.historico || []).filter(h => h.versao !== a.versao), {versao: a.versao, em, por: autor, nota, validacao: {ok: true, em: a.validacao.em || em, itens: a.validacao.itens}, snapshot: snap}];
  a.publicado = a.versao;
  a.status = 'published';
  return lib2;
}

// Voltar a uma versão publicada antes: o manifesto passa a apontar para ela. A edição de trabalho não muda.
export function rollback(lib, id, versao) {
  const lib2 = structuredClone(lib), a = lib2.arenas.find(x => x.id === id);
  if (!a?.historico?.some(h => h.versao === versao)) throw Error(`Versão ${versao} de ${id} nunca foi publicada.`);
  a.publicado = versao;
  return lib2;
}

// Editar uma arena publicada abre a próxima versão em desenvolvimento; a publicada continua no manifesto até nova publicação.
export function startEdit(lib, id) {
  const lib2 = structuredClone(lib), a = lib2.arenas.find(x => x.id === id);
  if (a.status === 'published') { a.status = 'development'; a.versao = Math.max(a.versao, ...(a.historico || []).map(h => h.versao)) + 1; delete a.validacao; }
  return lib2;
}

export function duplicate(lib, id, novoId, nome) {
  const lib2 = structuredClone(lib), a = lib2.arenas.find(x => x.id === id);
  if (lib2.arenas.some(x => x.id === novoId)) throw Error(`Já existe ${novoId}.`);
  const c = structuredClone(a);
  Object.assign(c, {id: novoId, nome, versao: 1, status: 'draft', historico: [], publicado: null});
  delete c.validacao;
  lib2.arenas.push(c);
  return lib2;
}

export function move(lib, id, to) {
  const lib2 = structuredClone(lib), a = lib2.arenas.find(x => x.id === id);
  if (!canMove(a.status, to)) throw Error(`${STATUS_PT[a.status]} não vai para ${STATUS_PT[to]}.`);
  if (to === 'approved' && (!a.validacao?.ok || a.validacao.versao !== a.versao)) throw Error('A validação desta versão precisa passar sem erro.');
  if (to === 'published') throw Error('Use publish(): publicar congela a versão.');
  a.status = to;
  return lib2;
}

export function buildManifest(lib, em = new Date().toISOString()) {
  const arenas = lib.arenas.filter(a => a.publicado && a.status !== 'archived')
    .map(a => a.historico.find(h => h.versao === a.publicado).snapshot);
  return {schema: SCHEMA, gerado_em: em, arenas};
}

// Biblioteca inicial: os temas do código viram arenas v1 publicadas (já estão no ar). `overrides`: data/arenas.json v1, se existir.
export function seed(defaults, meta, overrides = {}, em = new Date().toISOString()) {
  let lib = {schema: SCHEMA, arenas: Object.keys(defaults).map(k => ({id: k, nome: meta[k]?.nome || defaults[k].label || k, faccao: meta[k]?.faccao || 'Neutral',
    descricao: meta[k]?.descricao || '', autor: 'Saint Seiya TCG', base: k, versao: 1, status: 'approved', params: overrides.temas?.[k] || {},
    variantes: [{id: 'standard', nome: 'Standard', tipo: 'standard', params: {}}], historico: [], publicado: null,
    validacao: {ok: true, versao: 1, em, itens: [{regra: 'Migração', nivel: 'ok', detalhe: 'tema já publicado antes do Arena Forge 5.0'}]}}))};
  for (const a of lib.arenas) lib = publish(lib, a.id, defaults, {autor: 'migração', nota: 'Arena do código (antes do Arena Forge 5.0)', em});
  return lib;
}

// Migração de dados antigos: arenas.json v1 (só ajustes por tema) ou biblioteca já no schema atual.
export function migrate(data, defaults, meta) {
  if (data?.schema === SCHEMA) return data;
  if (data?.versao === 1 && data.temas) return seed(defaults, meta, data);
  throw Error('Formato de biblioteca desconhecido.');
}

// Arena que a mesa usa. Prioridade: arena imposta pela partida (evento/torneio) > arena do deck > arena do perfil > padrão.
// Só o que está publicado e que o jogador possui (`owns`; hoje toda arena é livre). A escolha é local e não entra no estado sincronizado.
export function chooseArena({forced, deck, profile} = {}, manifest, owns = () => true) {
  const ok = key => { const {id, variant} = splitKey(key); const a = manifest?.arenas?.find(x => x.id === id); return !!a?.variantes.some(v => v.id === variant) && owns(key); };
  for (const [origem, key] of [['partida', forced], ['deck', deck], ['perfil', profile]]) if (key && ok(key)) return {key, origem};
  return {key: DEFAULT_ARENA, origem: 'padrão'};
}

// Manifesto -> temas da cena. Versão que a cena não entende cai no tema-base do código (fallback visual), nunca em tela preta.
export function themesFromManifest(manifest, defaults) {
  const out = {};
  for (const a of manifest?.arenas || []) for (const v of a.variantes) {
    const key = themeKey(a.id, v.id), label = v.id === 'standard' ? a.nome : `${a.nome} — ${v.nome}`;
    const bad = a.requer > SCENE_LEVEL || paramErrors(v.params).length;
    out[key] = bad ? {...structuredClone(defaults[a.id] || defaults[DEFAULT_ARENA]), label, fallback: true} : {...structuredClone(v.params), label, arena: a.id, versao: a.versao, base: a.base || a.id};
  }
  return out;
}
