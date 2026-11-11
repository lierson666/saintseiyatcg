// IDENTITY & COMPLIANCE FORGE (Identity & Payment Forge V1.0, autor 11/11/2026).
// Lê o painel /api/admin/compliance do servidor do jogo pela mesma ponte e sessão do Nexus (card-forge/compliance_proxy.py).
// Mostra contagens de identidade, histórico de estados, versão dos termos, chaves e pedidos. Nunca há CPF completo aqui.
// Ações (revisão manual, reembolso, conciliação, liberar pausa) pedem confirmação com o host do destino e ficam no admin_audit.
// Pacotes e preços: Economy Forge (versionado). Chaves: variáveis de ambiente do servidor (SANCTUARY_<CHAVE>=1).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const brl = c => (c / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const when = t => t ? new Date(t * 1000).toLocaleString('pt-BR') : '—';
const STATE_PT = {UNVERIFIED: 'Sem declaração', PENDING_VERIFICATION: 'Aguardando provedor', SELF_DECLARED_ADULT: '18+ autodeclarado',
  VERIFIED_ADULT: '18+ verificado (provedor)', REJECTED_UNDERAGE: 'Menor de idade', FAILED_VERIFICATION: 'Verificação falhou',
  EXPIRED_VERIFICATION: 'Verificação expirada', MANUAL_REVIEW: 'Revisão manual'};

async function call(path, body) {
  const r = await fetch('/api/star-hill/' + path, body === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.erro || data.error || 'Não foi possível concluir a operação.');
  return data;
}

function loginForm(est) {
  return `<section class="panel"><h2>IDENTITY &amp; COMPLIANCE FORGE</h2>
    <p class="hint">Destino: <b>${esc(est.host)}</b>${est.producao ? ' (produção)' : ''}. Entre com uma conta <b>admin</b> do jogo. A senha não é guardada; a sessão é a mesma do Nexus e some ao fechar o app.</p>
    <form id="cf-login" class="ach-fields"><label class="field"><span>E-mail</span><input name="email" type="email" required autocomplete="username"></label>
      <label class="field"><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"></label>
      <div class="actions"><button class="primary">Entrar</button></div></form></section>`;
}

function page(d, est) {
  const id = d.identity, pay = d.payments, flagRows = Object.entries(d.flags);
  return `<section class="panel"><h2>IDENTITY &amp; COMPLIANCE FORGE <span class="tag">${esc(est.host)}</span></h2>
    <p class="hint">Maioridade por autodeclaração (data de nascimento; no Brasil, CPF com dígitos válidos). VERIFIED_ADULT só com resultado autenticado de provedor; o admin não aprova sem essa prova. CPF completo e data de nascimento não são guardados.</p>
    <div class="cf-grid">
      <div><h3>Chaves do servidor</h3><table class="ach-diff"><tbody>${flagRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v ? '<b>ligada</b>' : 'desligada'}</td></tr>`).join('')}</tbody></table>
        <p class="hint">Mudam por variável de ambiente no servidor (SANCTUARY_&lt;CHAVE&gt;=1) e reinício. Ambiente de pagamento: <b>${esc(d.payments_env)}</b>. Termos e Privacidade em vigor: <b>${esc(d.terms_version)}</b>.</p></div>
      <div><h3>Identidade · contas por estado</h3><table class="ach-diff"><tbody>${Object.entries(id.counts).map(([k, n]) => `<tr><td>${esc(STATE_PT[k] || k)}<br><small>${esc(k)}</small></td><td>${n}</td></tr>`).join('')}</tbody></table></div>
      <div><h3>Pacotes de Cosmo Coins</h3><table class="ach-diff"><tbody>${d.packs.map(p => `<tr><td>${esc(p.name)}</td><td>${brl(p.price_cents)}</td><td>${p.coins.toLocaleString('pt-BR')} coins</td></tr>`).join('')}</tbody></table>
        <p class="hint">Editar em <a href="#economia">Economy Forge</a> (com versões). O servidor lê ao reiniciar.</p></div>
    </div>
    <h3>Ação de identidade</h3>
    <form id="cf-identity" class="ach-fields"><label class="field"><span>Jogador (username)</span><input name="usuario" required pattern="[A-Za-z0-9_]{3,20}"></label>
      <label class="field"><span>Ação</span><select name="acao"><option value="review">Pôr em revisão manual</option><option value="reject">Marcar menor de idade</option><option value="release">Liberar (volta a sem declaração)</option><option value="approve">Aprovar (exige id de verificação do provedor)</option></select></label>
      <label class="field"><span>Id da verificação do provedor (só para aprovar)</span><input name="evidencia"></label>
      <div class="actions"><button class="primary">Aplicar</button></div></form>
    <h3>Histórico de estados (últimos 50)</h3>
    <table class="ach-diff"><thead><tr><th>Quando</th><th>Jogador</th><th>De</th><th>Para</th><th>Quem</th><th>Motivo</th></tr></thead><tbody>
      ${id.events.map(e => `<tr><td>${when(e.at)}</td><td>${esc(e.username || '—')}</td><td>${esc(e.from_state || '—')}</td><td>${esc(e.to_state)}</td><td>${esc(e.actor)}</td><td>${esc(e.reason)}</td></tr>`).join('') || '<tr><td colspan="6">Nada ainda.</td></tr>'}</tbody></table>
    <h3>Pagamentos <small>(${pay.holds} conta(s) com compras pausadas)</small></h3>
    <p>${Object.entries(pay.by_status).map(([k, v]) => `<span class="tag">${esc(k)} ${v.orders} · ${brl(v.cents)}</span>`).join(' ') || '<span class="hint">Nenhum pedido.</span>'}</p>
    <div class="actions"><button data-cf="conciliar">Conciliar com o Mercado Pago</button></div>
    <form id="cf-hold" class="ach-fields"><label class="field"><span>Liberar compras de (username)</span><input name="usuario" required pattern="[A-Za-z0-9_]{3,20}"></label><div class="actions"><button>Liberar</button></div></form>
    <table class="ach-diff"><thead><tr><th>Pedido</th><th>Jogador</th><th>Pacote</th><th>Valor</th><th>Situação</th><th>Data</th><th></th></tr></thead><tbody>
      ${pay.recent.map(o => `<tr><td><small>${esc(o.id)}</small></td><td>${esc(o.username || '(conta apagada)')}</td><td>${esc(o.pack_id)} · ${o.coins}</td><td>${brl(o.price_cents)}</td><td>${esc(o.status)}</td><td>${when(o.created_at)}</td><td>${o.status === 'APPROVED' ? `<button data-refund="${esc(o.id)}">Reembolsar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum pedido.</td></tr>'}</tbody></table>
    <h3>Auditoria de admin (últimas 50)</h3>
    <table class="ach-diff"><tbody>${d.audit.map(a => `<tr><td>${when(a.at)}</td><td>${esc(a.admin)}</td><td>${esc(a.action)}</td><td>${esc(a.target || '')}</td></tr>`).join('') || '<tr><td>Nada ainda.</td></tr>'}</tbody></table>
  </section>`;
}

export async function mountCompliance(root, {notice}) {
  const css = './achievements-forge.css?v=20261111-ach1';
  if (!document.querySelector('link[href*="achievements-forge.css"]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: css}));
  if (!document.getElementById('cf-style')) document.head.append(Object.assign(document.createElement('style'), {id: 'cf-style',
    textContent: '.cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.cf-grid h3{margin-top:0}'}));
  const est = await call('nexus/estado');
  if (!est.conectado) {
    root.innerHTML = loginForm(est);
    root.querySelector('#cf-login').onsubmit = async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try { await call('nexus/entrar', f); await mountCompliance(root, {notice}); } catch (err) { notice(err.message); }
    };
    return;
  }
  let data;
  try { data = await call('compliance'); } catch (err) { root.innerHTML = `<section class="panel"><p class="hint">${esc(err.message)} (a conta precisa ser admin no servidor ${esc(est.host)}).</p></section>`; return; }
  root.innerHTML = page(data, est);
  const act = async (path, body, ok) => {
    if (!confirm(`Aplicar em ${est.host}? Fica registrado na auditoria do servidor.`)) return;
    try { await call('compliance/' + path, {...body, confirmar: est.host}); notice(ok, true); await mountCompliance(root, {notice}); } catch (err) { notice(err.message); }
  };
  root.querySelector('#cf-identity').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); act('identidade', f, 'Estado atualizado.'); };
  root.querySelector('#cf-hold').onsubmit = e => { e.preventDefault(); act('liberar', Object.fromEntries(new FormData(e.target)), 'Compras liberadas.'); };
  root.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cf === 'conciliar') act('conciliar', {}, 'Conciliação feita.');
    if (b.dataset.refund) act('reembolso', {pedido: b.dataset.refund}, 'Reembolso pedido ao Mercado Pago.');
  };
}
