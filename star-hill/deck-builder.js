import {renderLiveCard,illustration} from '../shared/live-card.js';
import {FACTIONS,TYPES,validateDeck} from '../shared/card-model.js';

// A coleção usa as mesmas cartas vivas da arena. Filtros não alteram o rascunho.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=c=>c?.nome_exibicao_en||c?.id||'Carta ausente';
const identity=c=>c.identidade_carta||c.id;
let ctx,view='vertical',mobile='collection',page=0;
const filters={search:'',faction:'',type:'',cost:'',cosmoble:false,all:false,sort:'cost'};
const pageSize=24;
export function deckCount(deck){return deck.main_deck.reduce((n,e)=>n+e.quantity,0);}
export function allowedFactions(deck,cards){const byId=new Map(cards.map(c=>[c.id,c]));return new Set([byId.get(deck.god_id)?.faccao,byId.get(deck.domain_id)?.faccao,'Neutral']);}
export function copiesOf(deck,card,cards){const byId=new Map(cards.map(c=>[c.id,c]));return deck.main_deck.reduce((n,e)=>n+(identity(byId.get(e.card_id)||{})===identity(card)?e.quantity:0),0);}
export function changeCopies(deck,card,delta,cards){
  if(!card||['God','Domain'].includes(card.tipo))return 'God e Domain ficam na liderança do deck.';
  if(delta>0&&!allowedFactions(deck,cards).has(card.faccao))return 'Esta facção não é permitida pelo God e Domain atuais.';
  if(delta>0&&copiesOf(deck,card,cards)>=4)return 'Limite de 4 cópias da mesma identidade.';
  const entry=deck.main_deck.find(e=>e.card_id===card.id);
  if(!entry&&delta<0)return null;
  if(entry)entry.quantity+=delta;else deck.main_deck.push({card_id:card.id,quantity:delta});
  deck.main_deck=deck.main_deck.filter(e=>e.quantity>0);return null;
}
export function exportDeck(deck){return `# ${deck.nome}\nGod: ${deck.god_id}\nDomain: ${deck.domain_id}\n\n${deck.main_deck.map(e=>`${e.quantity} ${e.card_id}`).join('\n')}\n`;}
export function importDeck(text,deck,cards){
  const next=structuredClone(deck),byId=new Map(cards.map(c=>[c.id,c]));next.main_deck=[];
  for(const [i,raw] of text.split(/\r?\n/).entries()){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const leader=/^(God|Domain):\s*([a-z0-9-]+)$/i.exec(line);
    if(leader){next[leader[1].toLowerCase()+'_id']=leader[2];continue;}
    const match=/^(\d+)\s+([a-z0-9-]+)(?:\s+#.*)?$/.exec(line);
    if(!match||!byId.has(match[2]))throw Error(`Linha ${i+1}: use quantidade e ID de uma carta do catálogo.`);
    const quantity=Number(match[1]),entry=next.main_deck.find(e=>e.card_id===match[2]);
    if(entry)entry.quantity+=quantity;else next.main_deck.push({card_id:match[2],quantity});
  }
  const errors=validateDeck(next,cards);if(errors.length)throw Error(errors.join(' · '));return next;
}
function listCards(){
  const allowed=allowedFactions(ctx.currentDeck(),ctx.cards),q=filters.search.trim().toLocaleLowerCase();
  return ctx.cards.filter(c=>!['God','Domain'].includes(c.tipo)&&c.revisao_regras==='2.0'&&
    (filters.all||allowed.has(c.faccao))&&(!filters.faction||c.faccao===filters.faction)&&(!filters.type||c.tipo===filters.type)&&
    (!filters.cost||(filters.cost==='7+'?Number(c.custo)>=7:Number(c.custo)===Number(filters.cost)))&&(!filters.cosmoble||c.cosmoble)&&
    (!q||[name(c),c.id,c.faccao,...(c.keywords_en||[]),...(c.habilidades_en||[]),...(c.subtipos||[])].join(' ').toLocaleLowerCase().includes(q)))
    .sort((a,b)=>(filters.sort==='type'?a.tipo.localeCompare(b.tipo):filters.sort==='cost'?Number(a.custo)-Number(b.custo):0)||name(a).localeCompare(name(b)));
}
function collection(){
  const list=listCards(),deck=ctx.currentDeck();page=Math.min(page,Math.max(0,Math.ceil(list.length/pageSize)-1));
  return `<div class="collection-caption"><span><b>${list.length}</b> cartas${filters.all?' · todas as facções':' · facções permitidas'}</span><small>Clique para adicionar · botão direito para ampliar</small></div><div class="collection-grid" aria-label="Coleção de cartas">${list.slice(page*pageSize,(page+1)*pageSize).map(c=>{
    const n=copiesOf(deck,c,ctx.cards),legal=allowedFactions(deck,ctx.cards).has(c.faccao),full=n>=4;
    return `<article class="collection-card ${!legal?'is-illegal':''}" draggable="${legal&&!full}" data-drag-card="${esc(c.id)}" data-drag-source="collection"><div class="copy-pips" aria-label="${n} de 4 cópias no deck">${[1,2,3,4].map(i=>`<i class="${i<=n?'filled':''}"></i>`).join('')}</div><button class="collection-add" data-db="add" data-card="${esc(c.id)}" aria-label="Adicionar ${esc(name(c))}" aria-disabled="${!legal||full}" title="${!legal?'Facção não permitida':full?'4 cópias no deck':'Adicionar uma cópia'}">${renderLiveCard(c,{compact:true})}</button><div class="collection-card-actions"><button data-db="remove" data-card="${esc(c.id)}" aria-label="Remover ${esc(name(c))}" ${deck.main_deck.some(e=>e.card_id===c.id)?'':'disabled'}>−</button><span>${n} / 4</span><button data-db="inspect" data-card="${esc(c.id)}" aria-label="Ampliar ${esc(name(c))}">Ampliar</button></div></article>`;
  }).join('')||'<p class="empty">Nenhuma carta com esses filtros. Experimente limpar a busca.</p>'}</div><div class="collection-pagination"><button data-db="prev" ${page===0?'disabled':''} aria-label="Página anterior">←</button><span>${page+1} / ${Math.max(1,Math.ceil(list.length/pageSize))}</span><button data-db="next" ${(page+1)*pageSize>=list.length?'disabled':''} aria-label="Próxima página">→</button></div>`;
}
function row(entry,byId){const c=byId.get(entry.card_id),art=illustration(c),legal=c&&allowedFactions(ctx.currentDeck(),ctx.cards).has(c.faccao);return `<div class="deck-row ${legal?'':'is-illegal'}" draggable="true" data-drag-card="${esc(entry.card_id)}" data-drag-source="deck" ${art?`style="--row-art:url('${esc(encodeURI(art).replace(/'/g,'%27'))}')"`:''}><b class="deck-quantity">${entry.quantity}</b><button class="deck-row-name" data-db="remove" data-card="${esc(entry.card_id)}" title="Remover uma cópia">${esc(name(c))}</button><span class="deck-cost" title="Custo em Cosmo">${c?.custo??'–'}</span><button data-db="inspect" data-card="${esc(entry.card_id)}" aria-label="Ampliar ${esc(name(c))}">↗</button><button data-db="add" data-card="${esc(entry.card_id)}" aria-label="Adicionar ${esc(name(c))}" ${c&&legal&&copiesOf(ctx.currentDeck(),c,ctx.cards)<4?'':'disabled'}>+</button></div>`;}
function deckRows(){
  const deck=ctx.currentDeck(),byId=new Map(ctx.cards.map(c=>[c.id,c])),entries=[...deck.main_deck].sort((a,b)=>Number(byId.get(a.card_id)?.custo)-Number(byId.get(b.card_id)?.custo)||name(byId.get(a.card_id)).localeCompare(name(byId.get(b.card_id))));
  if(!entries.length)return '<p class="empty">Seu deck começa aqui. Clique nas cartas da coleção ou arraste para esta área.</p>';
  if(view==='vertical')return entries.map(e=>row(e,byId)).join('');
  const groups=new Map();for(const e of entries){const cost=Math.min(7,Number(byId.get(e.card_id)?.custo)||0);if(!groups.has(cost))groups.set(cost,[]);groups.get(cost).push(e);}
  return [...groups].map(([cost,items])=>`<section class="deck-cost-column"><h3>Cosmo ${cost===7?'7+':cost}<small>${items.reduce((n,e)=>n+e.quantity,0)} cartas</small></h3>${items.map(e=>row(e,byId)).join('')}</section>`).join('');
}
function analysis(){
  const deck=ctx.currentDeck(),byId=new Map(ctx.cards.map(c=>[c.id,c])),curve=Array(8).fill(0),types=new Map();let total=0,cosmoble=0;
  for(const e of deck.main_deck){const c=byId.get(e.card_id);if(!c)continue;curve[Math.min(7,c.custo||0)]+=e.quantity;total+=(c.custo||0)*e.quantity;if(c.cosmoble)cosmoble+=e.quantity;types.set(c.tipo,(types.get(c.tipo)||0)+e.quantity);}
  const max=Math.max(1,...curve),errors=validateDeck(deck,ctx.cards);
  return `<details class="deck-analysis"><summary>Curva de Cosmo e composição</summary><div class="cosmo-curve" role="img" aria-label="Curva de Cosmo: ${curve.map((n,i)=>`${i===7?'7+':i}: ${n}`).join(', ')}">${curve.map((n,i)=>`<div><b>${n}</b><i style="height:${Math.round(n/max*70)+2}px"></i><span>${i===7?'7+':i}</span></div>`).join('')}</div><p class="deck-analysis-line">Média <b>${(total/Math.max(1,deckCount(deck))).toFixed(1)}</b> · Cosmoble <b>${cosmoble}</b></p><p class="deck-analysis-line">${[...types].map(([t,n])=>`${t} ${n}`).join(' · ')}</p></details><div class="deck-validation ${errors.length?'has-errors':''}" role="status">${errors.length?`<b>Deck em edição</b><ul>${errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'<b>Deck válido · Rulebook 2.0</b><span>60 cartas · até 4 por identidade</span>'}</div>`;
}
function leaders(){const d=ctx.currentDeck();return `<div class="deck-leaders">${[['God','god_id'],['Domain','domain_id']].map(([type,key])=>`<label><span>${type}</span><select data-db-leader="${key}" aria-label="${type} do deck">${ctx.cards.filter(c=>c.tipo===type).map(c=>`<option value="${esc(c.id)}" ${c.id===d[key]?'selected':''}>${esc(name(c))}</option>`).join('')}</select></label>`).join('')}</div>`;}
export function deckBuilder(context){
  ctx=context;const d=ctx.currentDeck(),count=deckCount(d);
  return `<section class="deck-builder is-${view}" data-mobile="${mobile}"><div class="deck-toolbar"><label><span class="sr-only">Escolher deck inicial</span><select id="deck-select">${ctx.decks.map(x=>`<option value="${esc(x.id)}" ${x.id===ctx.selectedDeck?'selected':''}>${esc(ctx.currentDeck(false,x.id)?.nome||x.nome)}</option>`).join('')}</select></label><div class="deck-toolbar-actions"><button data-db="import">Importar lista</button><button data-db="export">Exportar lista</button><div class="deck-view-switch" role="group" aria-label="Disposição do deck"><button data-db="vertical" aria-pressed="${view==='vertical'}" title="Deck na lateral">Lateral</button><button data-db="horizontal" aria-pressed="${view==='horizontal'}" title="Deck abaixo da coleção">Horizontal</button></div></div></div><div class="deck-mobile-tabs" role="group" aria-label="Área do editor"><button data-db="collection" aria-pressed="${mobile==='collection'}">Coleção</button><button data-db="deck" aria-pressed="${mobile==='deck'}">Deck · ${count}/60</button></div><div class="deck-workspace"><section class="deck-collection" aria-label="Coleção"><div class="collection-tools"><input id="deck-search" class="search" type="search" placeholder="Buscar nome, texto, keyword ou ID…" aria-label="Buscar na coleção" value="${esc(filters.search)}"><div class="collection-factions" role="group" aria-label="Filtrar facção">${['',...FACTIONS].map(f=>`<button data-db-faction="${f}" aria-pressed="${filters.faction===f}" class="faction-${f.toLowerCase()}">${f||'Todas'}</button>`).join('')}</div><div class="collection-filters"><select id="deck-filter-type" aria-label="Filtrar tipo"><option value="">Todos os tipos</option>${TYPES.filter(t=>!['God','Domain'].includes(t)).map(t=>`<option ${filters.type===t?'selected':''}>${t}</option>`).join('')}</select><select id="deck-filter-cost" aria-label="Filtrar custo"><option value="">Cosmo: todos</option>${[0,1,2,3,4,5,6,'7+'].map(n=>`<option value="${n}" ${String(n)===filters.cost?'selected':''}>Cosmo ${n}</option>`).join('')}</select><select id="deck-sort" aria-label="Ordenar coleção">${[['cost','Por custo'],['name','Por nome'],['type','Por tipo']].map(([id,label])=>`<option value="${id}" ${filters.sort===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="collection-toggles"><label><input id="deck-filter-cosmoble" type="checkbox" ${filters.cosmoble?'checked':''}> Cosmoble</label><label><input id="deck-filter-all" type="checkbox" ${filters.all?'checked':''}> Mostrar facções não permitidas</label><button data-db="clear" class="text-button">Limpar filtros</button></div></div><div id="deck-collection-body">${collection()}</div></section><aside class="deck-panel" aria-label="Deck em construção"><div class="deck-panel-heading"><label><span class="sr-only">Nome do deck</span><input id="deck-name" data-deck-field="nome" value="${esc(d.nome)}" maxlength="100" aria-label="Nome do deck"></label><strong class="deck-total ${count!==60?'is-incomplete':''}">${count}<small> / 60</small></strong></div>${leaders()}<div class="deck-list-caption"><span>Clique no nome para remover</span><small>Arraste cartas entre as áreas</small></div><div id="deck-rows" class="deck-rows" aria-label="Cartas do deck">${deckRows()}</div>${analysis()}</aside></div><dialog id="deck-preview" aria-label="Carta ampliada"></dialog><dialog id="deck-import"><header><h2>Importar lista de deck</h2><button data-db="close-import" aria-label="Fechar importação">×</button></header><p class="hint">Use a lista exportada pelo STAR HILL: quantidade e ID por linha. God e Domain ficam em linhas próprias. A lista substitui o rascunho deste deck.</p><textarea id="deck-import-text" aria-label="Lista de cartas" placeholder="God: athena-001&#10;Domain: athena-051&#10;&#10;3 sst-01-001"></textarea><p id="deck-import-error" role="alert"></p><footer><button data-db="close-import">Cancelar</button><button data-db="apply-import" class="primary">Importar para o rascunho</button></footer></dialog></section>`;
}
function refresh(){
  const root=document.querySelector('.deck-builder');if(!root)return;
  const scroll=document.querySelector('#deck-rows')?.scrollTop||0,collectionScroll=document.querySelector('#deck-collection-body')?.scrollTop||0,active=document.activeElement;
  const selector=active?.dataset.db?`[data-db="${CSS.escape(active.dataset.db)}"]${active.dataset.card?`[data-card="${CSS.escape(active.dataset.card)}"]`:''}`:active?.hasAttribute('data-db-faction')?`[data-db-faction="${CSS.escape(active.dataset.dbFaction)}"]`:null;
  root.outerHTML=deckBuilder(ctx);document.querySelector('#deck-rows').scrollTop=scroll;document.querySelector('#deck-collection-body').scrollTop=collectionScroll;
  if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
function filterCollection(){page=0;document.querySelector('#deck-collection-body').innerHTML=collection();}
function modify(id,delta){const card=ctx.cards.find(c=>c.id===id);if(delta<0&&!ctx.currentDeck().main_deck.some(e=>e.card_id===id))return;const error=changeCopies(structuredClone(ctx.currentDeck()),card,delta,ctx.cards);if(error){ctx.notice(error);return;}changeCopies(ctx.currentDeck(true),card,delta,ctx.cards);ctx.changed();refresh();}
function inspect(id){const c=ctx.cards.find(c=>c.id===id);if(!c)return;const modal=document.querySelector('#deck-preview'),deck=ctx.currentDeck(),n=copiesOf(deck,c,ctx.cards),legal=allowedFactions(deck,ctx.cards).has(c.faccao);modal.innerHTML=`<header><small>${esc(c.id)} · ${esc(c.faccao)} · ${n}/4 no deck</small><button data-db="close-preview" aria-label="Fechar carta ampliada">×</button></header><div class="deck-preview-card">${renderLiveCard(c)}</div><footer><button data-db="remove" data-card="${esc(c.id)}" ${deck.main_deck.some(e=>e.card_id===id)?'':'disabled'}>Remover uma cópia</button><button data-db="add" data-card="${esc(c.id)}" class="primary" ${legal&&n<4?'':'disabled'}>Adicionar ao deck</button></footer>`;modal.showModal();}
if(typeof document!=='undefined'){
document.addEventListener('input',e=>{if(!document.querySelector('.deck-builder'))return;if(e.target.id==='deck-search'){filters.search=e.target.value;filterCollection();}});
document.addEventListener('change',e=>{
  if(!document.querySelector('.deck-builder'))return;const t=e.target;
  if(t.id==='deck-select'){ctx.selectDeck(t.value);page=0;filters.faction='';return;}
  if(t.dataset.dbLeader){ctx.currentDeck(true)[t.dataset.dbLeader]=t.value;ctx.changed();refresh();}
  const map={'deck-filter-type':'type','deck-filter-cost':'cost','deck-filter-cosmoble':'cosmoble','deck-filter-all':'all','deck-sort':'sort'};
  if(map[t.id]){filters[map[t.id]]=t.type==='checkbox'?t.checked:t.value;filterCollection();}
});
document.addEventListener('click',e=>{
  if(!document.querySelector('.deck-builder'))return;const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-db-faction')){filters.faction=b.dataset.dbFaction;page=0;refresh();return;}
  const action=b.dataset.db;if(!action)return;
  if(action==='add'||action==='remove'){const open=document.querySelector('#deck-preview').open;modify(b.dataset.card,action==='add'?1:-1);if(open)inspect(b.dataset.card);}
  if(action==='inspect')inspect(b.dataset.card);
  if(action==='close-preview')document.querySelector('#deck-preview').close();
  if(action==='close-import')document.querySelector('#deck-import').close();
  if(action==='prev'||action==='next'){page+=action==='next'?1:-1;document.querySelector('#deck-collection-body').innerHTML=collection();}
  if(action==='vertical'||action==='horizontal'){view=action;refresh();}
  if(action==='collection'||action==='deck'){mobile=action;refresh();}
  if(action==='clear'){Object.assign(filters,{search:'',faction:'',type:'',cost:'',cosmoble:false,all:false,sort:'cost'});page=0;refresh();}
  if(action==='export'){const url=URL.createObjectURL(new Blob([exportDeck(ctx.currentDeck())],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=ctx.selectedDeck+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  if(action==='import')document.querySelector('#deck-import').showModal();
  if(action==='apply-import'){try{const deck=importDeck(document.querySelector('#deck-import-text').value,ctx.currentDeck(),ctx.cards);Object.assign(ctx.currentDeck(true),deck);ctx.changed();refresh();ctx.notice('Lista importada no rascunho. Revise o diff para gravar.');}catch(error){document.querySelector('#deck-import-error').textContent=error.message;}}
});
document.addEventListener('contextmenu',e=>{const card=e.target.closest('[data-drag-card]');if(card&&document.querySelector('.deck-builder')){e.preventDefault();inspect(card.dataset.dragCard);}});
document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-drag-card]');if(c){e.dataTransfer.setData('application/x-star-hill-card',JSON.stringify({id:c.dataset.dragCard,source:c.dataset.dragSource}));e.dataTransfer.effectAllowed='copyMove';}});
document.addEventListener('dragover',e=>{if(e.target.closest('.deck-panel,.deck-collection')&&e.dataTransfer.types.includes('application/x-star-hill-card'))e.preventDefault();});
document.addEventListener('drop',e=>{const target=e.target.closest('.deck-panel,.deck-collection'),raw=e.dataTransfer.getData('application/x-star-hill-card');if(!target||!raw)return;e.preventDefault();try{const {id,source}=JSON.parse(raw);if(target.matches('.deck-panel')&&source==='collection')modify(id,1);if(target.matches('.deck-collection')&&source==='deck')modify(id,-1);}catch{ctx.notice('Não foi possível mover a carta.');}});

}
