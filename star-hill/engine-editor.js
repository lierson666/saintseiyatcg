// O texto da proposta é exibido como dado; a gravação depende do diff e dos testes.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const running=j=>['gerando','validando'].includes(j?.estado);
const titles={gerando:'Gerando proposta',proposta:'Proposta pronta',validando:'Testando a proposta',validado:'Pronto para aprovação',bloqueado:'Decisão de regra pendente',testes_falharam:'Testes precisam de correção',aplicado:'Atualização aplicada',cancelado:'Cancelado',interrompido:'Trabalho interrompido',erro:'Não foi possível concluir',sem_alteracoes:'Sem alterações propostas'};
let context,info,job,timer,error='',busy=false,reviewed=null,requestVersion=0;
export function engineEditor(){return '<section class="panel engine-editor" id="engine-editor" aria-label="Atualização do motor"><p class="hint">Conferindo o motor do jogo…</p></section>';}
export async function mountEngineEditor(ctx){
  context=ctx;clearTimeout(timer);const version=++requestVersion;
  try{
    info=await context.api('motor');error='';if(version!==requestVersion||!document.querySelector('#engine-editor'))return;
    if(!job){let id;try{id=localStorage.getItem('starHillEngineJob');}catch{}if(id)try{job=await context.api('motor/trabalhos/'+encodeURIComponent(id));}catch{/* Um trabalho antigo pode pertencer a outra instalação. */}}
    paint();poll();
  }catch(e){if(version===requestVersion){error=e.message;paint();}}
}
function paint(){
  const host=document.querySelector('#engine-editor');if(!host)return;
  const synced=info?.aplicado?.sincronizado,active=running(job),available=info?.disponivel;
  host.innerHTML=`<div class="engine-heading"><div><p class="eyebrow">TEXTO → MOTOR</p><h2>Atualizar o jogo pelas regras</h2><p class="hint">O Claude Code prepara alterações no código a partir do Livro aprovado. Você confere o diff, valida os testes e aprova a aplicação.</p></div><span class="tag ${synced?'engine-ok':''}">${synced?'Texto e motor sincronizados':'Motor sem validação deste texto'}</span></div><ol class="engine-steps" aria-label="Etapas da atualização"><li>1. Texto aprovado</li><li>2. Proposta de código</li><li>3. Testes isolados</li><li>4. Sua aprovação</li></ol><div class="engine-provider"><span>Claude Code · Sonnet</span><small>${available?'Usa sua conta do Claude no Mac. Ao gerar, o texto e os arquivos de código necessários são enviados ao Claude.':'Claude Code não encontrado neste Mac.'}</small></div>${error?`<p class="engine-error" role="alert">${esc(error)}</p>`:''}${job?`<div class="engine-job" aria-live="polite" aria-busy="${active}"><h3>${esc(titles[job.estado]||job.estado)}</h3><p>${esc(job.mensagem)}</p>${job.resumo?`<p class="hint">${esc(job.resumo)}</p>`:''}${job.arquivos?.length?`<small>${job.arquivos.length} arquivos na proposta · ${job.testes?.filter(t=>t.ok).length||0} verificações aprovadas</small>`:''}</div>`:''}<div class="actions"><button data-motor="generate" class="primary" ${busy||active||!available?'disabled':''}>${job?'Gerar nova proposta':'Gerar atualização pelo texto'}</button>${job?.diff?`<button data-motor="review" ${busy||active?'disabled':''}>Revisar proposta e testes</button>`:''}${active?'<button data-motor="cancel" class="secondary">Cancelar trabalho</button>':''}${job?.estado==='aplicado'?'<a href="../playtest/" target="_blank" rel="noopener">Abrir jogo atualizado ↗</a>':''}</div><p class="hint engine-footnote">A geração usa o Livro já gravado. Cartas e ilustrações mantêm sua revisão própria. Partidas abertas continuam com o motor carregado; a atualização entra em uma nova abertura do jogo.</p><dialog id="engine-review" aria-label="Revisão da atualização do motor"></dialog>`;
}
function poll(){
  clearTimeout(timer);if(!running(job)||!document.querySelector('#engine-editor'))return;
  timer=setTimeout(async()=>{
    try{job=await context.api('motor/trabalhos/'+job.id);error='';paint();poll();}
    catch(e){error=e.message;paint();}
  },1800);
}
function openReview(){
  const modal=document.querySelector('#engine-review');if(!modal||!job)return;
  const passed=job.estado==='validado',blocked=job.pendencias?.some(p=>p.bloqueante);
  modal.innerHTML=`<header><div><small>ATUALIZAÇÃO DO MOTOR · ${esc(job.id.slice(0,8))}</small><h2>Confira o que será alterado</h2></div><button data-motor="close" aria-label="Fechar proposta">×</button></header><p>${esc(job.resumo)}</p>${job.cobertura?.length?`<h3>Regras cobertas</h3><ul class="engine-coverage">${job.cobertura.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}${job.pendencias?.length?`<h3>Pendências</h3><ul class="engine-pending">${job.pendencias.map(p=>`<li><b>${p.bloqueante?'Bloqueia a aplicação':'Revisão separada'}</b> · ${esc(p.descricao)}</li>`).join('')}</ul>`:''}<h3>Diff da proposta</h3><pre id="engine-diff">${esc(job.diff)}</pre><h3>Resultado dos testes</h3>${job.testes?.length?job.testes.map(t=>`<details class="engine-test ${t.ok?'is-ok':'is-failed'}"><summary>${t.ok?'Aprovado':'Falhou'} · ${esc(t.nome)}</summary><pre>${esc(t.log||'Verificação concluída sem mensagens.')}</pre></details>`).join(''):'<p class="hint">Os testes ainda não foram executados. A validação usa uma cópia do projeto, sem acesso de rede nem gravação no projeto original.</p>'}${passed?`<label class="check-field"><input id="engine-confirm" type="checkbox" ${reviewed===job.id?'checked':''}> Revisei o diff e os testes. Aprovo esta atualização do motor.</label>`:''}<footer><button data-motor="close" class="secondary">Voltar</button>${['proposta','testes_falharam'].includes(job.estado)?'<button data-motor="validate" class="primary">Validar proposta</button>':''}${passed&&!blocked?`<button data-motor="apply" class="primary" ${reviewed===job.id?'':'disabled'}>Aprovar e atualizar motor</button>`:''}</footer>`;
  modal.showModal();
}
async function action(type){
  if(type==='close'){document.querySelector('#engine-review')?.close();return;}
  if(type==='review'){openReview();return;}
  if(busy)return;busy=true;error='';
  try{
    const source=context.source();
    if(['generate','apply'].includes(type)&&source.conteudo!==source.aprovado)throw Error('Revise e grave o Livro de regras antes de atualizar o motor.');
    if(type==='generate'){
      reviewed=null;job=await context.api('motor/gerar',{revisao:source.revisao,conteudo:source.conteudo});
      try{localStorage.setItem('starHillEngineJob',job.id);}catch{}
    }
    if(type==='validate'){document.querySelector('#engine-review')?.close();job=await context.api('motor/validar',{trabalho:job.id});}
    if(type==='cancel')job=await context.api('motor/cancelar',{trabalho:job.id});
    if(type==='apply'){
      if(reviewed!==job.id)throw Error('Confirme que revisou o diff e os testes.');
      job=await context.api('motor/aplicar',{trabalho:job.id,confirmar:true});info=await context.api('motor');
      document.querySelector('#engine-review')?.close();
    }
  }catch(e){error=e.message;}
  finally{busy=false;paint();poll();}
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-motor]');if(button&&!button.disabled)action(button.dataset.motor);});
document.addEventListener('change',e=>{if(e.target.id==='engine-confirm'){reviewed=e.target.checked?job.id:null;document.querySelector('[data-motor="apply"]').disabled=reviewed!==job.id;}});
window.addEventListener('hashchange',()=>{if(location.hash!=='#regras'){clearTimeout(timer);requestVersion++;}});
