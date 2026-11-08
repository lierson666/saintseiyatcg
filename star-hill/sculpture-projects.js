// ARENA FORGE · Sculpture Studio — projetos e homologação (genéricos: tudo sai de arena-forge/sculpture-studio/projects).
// Projetos: um quadro por escultura com as 10 etapas (referências → versionamento) e o estágio de produção.
// Homologação: giro 360° no mesmo palco do inspetor, comparação com a versão anterior, capturas por grupo,
// LODs medidos, verificações técnicas, testes e critérios de arte. A aprovação artística é do autor: esta página
// só mostra o que tools/sculpture-homologate.py mediu e nunca marca um asset como aprovado.
const ROOT = '../arena-forge/sculpture-studio/projects/';
const STAGES = ['CONCEPT', 'MODELING', 'TECHNICAL_QA', 'ART_REVIEW', 'APPROVED', 'PUBLISHED'];
const STEPS = [['referencias', 'Referências'], ['modelagem', 'Modelagem'], ['rig_pose', 'Rig e pose'], ['materiais', 'Materiais'], ['escultura', 'Escultura'],
  ['lods', 'LODs'], ['exportacao', 'Exportação'], ['comparacao', 'Comparação visual'], ['validacao', 'Validação'], ['versionamento', 'Versionamento']];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const get = async url => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
export const css = `
.ss-tabs { display: flex; gap: 6px; margin: 0 0 10px; } .ss-tabs button[aria-pressed="true"] { border-color: #d6b574; color: #d6b574; }
.ss.hom { grid-template-columns: minmax(0, 1fr) minmax(420px, 1.15fr); } .ss.hom > .ss-col { display: none; } .ss:not(.hom) > .ss-hom { display: none; }
.ss-hom { display: grid; gap: 10px; max-height: 84vh; overflow: auto; align-content: start; }
.ss-badges { display: flex; gap: 8px; flex-wrap: wrap; } .ss-badge { border-radius: 99px; padding: 3px 10px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
.ss-badge.ok { color: #7fd6a0; } .ss-badge.bad { color: #ff8f8f; } .ss-badge.wait { color: #f1c56b; }
.ss-pipe { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; } .ss-pipe span { padding: 2px 8px; border-radius: 6px; border: 1px solid #ffffff22; color: #ffffff80; }
.ss-pipe span.done { color: #9fb7a8; text-decoration: line-through; } .ss-pipe span.now { color: #111; background: #d6b574; border-color: #d6b574; font-weight: 700; }
.ss-gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; } .ss-gal a { display: block; } .ss-gal img { width: 100%; border-radius: 6px; background: #000; display: block; }
.ss-gal figcaption { font-size: 10px; color: #ffffffa0; overflow-wrap: anywhere; }
.ss-proj[hidden], section.ss[hidden] { display: none; }
.ss-proj { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
.ss-card { border: 1px solid #ffffff22; border-radius: 12px; padding: 12px; display: grid; gap: 8px; align-content: start; } .ss-card h3 { margin: 0; font-size: 16px; }
.ss-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px 10px; font-size: 12px; } .ss-steps .feito::before { content: '● '; color: #7fd6a0; }
.ss-steps .andamento::before { content: '◐ '; color: #f1c56b; } .ss-steps .pendente::before { content: '○ '; color: #ffffff60; }
.ss-ok { color: #7fd6a0; } .ss-bad { color: #ff8f8f; }
`;

const pipe = stage => `<div class="ss-pipe" aria-label="Estágio de produção">${STAGES.map((s, i) => {
  const k = STAGES.indexOf(stage); return `<span class="${i < k ? 'done' : i === k ? 'now' : ''}">${s}</span>`; }).join('')}</div>`;

export async function projectList() {
  const idx = await get(ROOT + 'index.json');
  return Promise.all(idx.projetos.map(id => get(`${ROOT}${id}.json`)));
}

export async function renderProjects(panel, onOpen) {
  panel.innerHTML = '<p class="hint">Carregando projetos…</p>';
  let list;
  try { list = await projectList(); } catch (e) { panel.innerHTML = `<p class="ss-note">Sem projetos: ${esc(e.message)}</p>`; return; }
  panel.innerHTML = list.map(p => `<article class="ss-card" data-proj="${esc(p.id)}">
    <h3>${esc(p.nome)} <small class="hint">${esc(p.nome_en || '')} · ${esc(p.assetId)}</small></h3>
    ${pipe(p.estagio)}
    <small>${esc(p.arena)} · lado ${esc(p.posicao?.lado)} · versão atual ${esc(p.atual || '—')}${p.proximo ? ` · próximo: ${esc(p.proximo)}` : ''}</small>
    ${Object.entries(p.aprovacoes || {}).map(([k, a]) => `<small data-aprov="${esc(k)}"><b class="${a.status === 'APPROVED' ? 'ss-ok' : ''}">${esc(k)}: ${esc(a.status)}</b> · ${esc(a.revisor)} em ${esc(a.data)}<br><span class="hint">${esc(a.escopo)}</span></small>`).join('')}
    <div class="ss-steps">${STEPS.map(([k, l]) => { const e = p.etapas?.[k]?.estado || 'pendente'; return `<span class="${esc(e)}" title="${esc((p.etapas?.[k]?.artefatos || []).join('\n'))}">${l}</span>`; }).join('')}</div>
    <small class="hint">Versões: ${(p.versoes || []).map(v => esc(v.nome)).join(' · ') || 'nenhuma'}</small>
    ${p.atual ? `<button class="secondary" data-open="${esc(p.id)}">Abrir homologação</button>` : `<small class="hint">${esc(p.nota || '')}</small>`}
    ${(p.previas || []).length ? `<div class="ss-gal">${p.previas.map(f => `<a href="../${esc(f)}" target="_blank" rel="noopener"><img loading="lazy" src="../${esc(f)}" alt=""><figcaption>${esc(f.split('/').pop())}</figcaption></a>`).join('')}</div>` : ''}
  </article>`).join('');
  panel.onclick = e => { const b = e.target.closest('[data-open]'); if (b) onOpen(b.dataset.open); };
}

export async function renderHomologation(panel, id, inspector) {
  panel.innerHTML = '<p class="hint">Carregando homologação…</p>';
  const p = await get(`${ROOT}${id}.json`);
  const v = p.versoes.find(x => x.id === p.atual), prev = p.versoes.find(x => x.id === p.anterior);
  let h;
  try { h = await get(`${ROOT}${id}/homologacao-${p.atual}.json`); }
  catch { panel.innerHTML = `<p class="ss-note">Sem homologação gravada. Rode <code>python3 tools/sculpture-homologate.py ${esc(id)} --testes 8770</code>.</p>`; return; }
  const tec = h.tecnico.status, art = h.artistico.status;
  const glb = (ver, lod) => `../${ver.pasta}/${p.glb.replace('{lod}', lod)}`;
  const prevTri = Object.fromEntries((h.comparacao?.lods || []).map(x => [x.lod, x.tri]));
  const fails = h.tecnico.checks.filter(c => !c.ok);
  panel.innerHTML = `
    <fieldset><legend>${esc(p.nome)} · ${esc(v.nome)} <small class="hint">${esc(p.assetId)}</small></legend>
      <div class="ss-badges" data-ss="hom-status">
        <span class="ss-badge ${tec === 'TECHNICALLY_VALIDATED' ? 'ok' : 'bad'}">Técnico: ${esc(tec)}</span>
        <span class="ss-badge ${art === 'APPROVED' ? 'ok' : 'wait'}">Arte: ${esc(art)}</span></div>
      ${pipe(p.estagio)}
      <small class="hint">Medido em ${esc(h.data)} por <code>tools/sculpture-homologate.py</code>. A aprovação artística é separada e só o autor a registra.</small>
    </fieldset>
    <fieldset><legend>Preview 360° e comparação</legend>
      <div class="ss-row">${['lod0', 'lod1', 'lod2', 'mobile'].map(l => `<button class="secondary" data-hom-glb="${esc(glb(v, l))}">${esc(v.nome)} ${l.toUpperCase()}</button>`).join('')}</div>
      ${prev ? `<div class="ss-row"><button class="secondary" data-hom-glb="${esc(glb(prev, 'lod0'))}">Comparar: ${esc(prev.nome)} LOD0</button>
        <button class="secondary" data-hom-glb="${esc(glb(v, 'lod0'))}">Voltar: ${esc(v.nome)} LOD0</button></div>` : ''}
      <small class="hint" data-ss="hom-src"></small>
    </fieldset>
    <fieldset><legend>LODs</legend><table><tr><th>LOD</th><th>Tri</th>${prev ? `<th>${esc(prev.nome)}</th>` : ''}<th>Malhas</th><th>Mat.</th><th>Tex. máx.</th><th>Caixa (m)</th><th>MB</th></tr>
      ${h.lods.map(l => `<tr><td>${l.lod}</td><td class="n">${l.tri.toLocaleString('pt-BR')}</td>${prev ? `<td class="n">${(prevTri[l.lod] ?? 0).toLocaleString('pt-BR')}</td>` : ''}<td class="n">${l.malhas}</td><td class="n">${l.materiais}</td><td class="n">${l.texturaMax}</td>
        <td class="n">${l.largura} × ${l.altura} × ${l.profundidade}</td><td class="n">${(l.bytes / 1048576).toFixed(1)}</td></tr>`).join('')}</table></fieldset>
    <fieldset><legend>Verificações técnicas (${h.tecnico.checks.length - fails.length}/${h.tecnico.checks.length})</legend>
      <table data-ss="hom-checks">${h.tecnico.checks.map(c => `<tr><td class="${c.ok ? 'ss-ok' : 'ss-bad'}">${c.ok ? 'ok' : 'falhou'}</td><td>${esc(c.nome)}</td><td><small>${esc(c.detalhe)}</small></td></tr>`).join('')}</table></fieldset>
    <fieldset><legend>Testes</legend>${h.testes.length ? `<table data-ss="hom-tests">${h.testes.map(t => `<tr><td class="${t.ok ? 'ss-ok' : 'ss-bad'}">${t.ok ? 'ok' : 'falhou'}</td><td>${esc(t.nome)}</td><td class="n">${t.passou}/${t.esperado}</td><td><small>erros de página: ${esc(t.errosDePagina)}</small></td></tr>`).join('')}</table>`
      : '<small class="ss-bad">Testes não executados nesta homologação.</small>'}</fieldset>
    <fieldset><legend>Revisão artística (autor)</legend>
      <small>Estado: <b>${esc(art)}</b>${h.artistico.revisor ? ` · ${esc(h.artistico.revisor)} em ${esc(h.artistico.data)}` : ''}</small>
      <ul style="margin:0;padding-left:18px;font-size:12px">${h.criteriosArte.map(c => `<li>${esc(c.criterio)} <small class="hint">(${esc(c.estado)})</small></li>`).join('')}</ul></fieldset>
    ${Object.entries(h.capturas.grupos).map(([g, fs]) => `<fieldset><legend>${esc(g)}</legend><div class="ss-gal">${fs.map(f => `<a href="../${esc(h.capturas.pasta)}/${esc(f)}" target="_blank" rel="noopener">
      <img loading="lazy" src="../${esc(h.capturas.pasta)}/${esc(f)}" alt="${esc(g)}: ${esc(f)}"><figcaption>${esc(f)}</figcaption></a>`).join('')}</div></fieldset>`).join('')}`;
  const load = url => { panel.querySelector('[data-ss="hom-src"]').textContent = url.split('/').slice(-2).join('/'); return inspector.load(url, url.split('/').pop()); };
  panel.onclick = e => { const b = e.target.closest('[data-hom-glb]'); if (b) load(b.dataset.homGlb); };
  await load(glb(v, 'lod0'));
  inspector.setSpin(true);
  return h;
}
