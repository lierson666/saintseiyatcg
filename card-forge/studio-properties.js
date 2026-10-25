import {BINDINGS,COMPONENTS,FONTS,esc,color,clone} from '../shared/layout-studio/model.js';

const numeric=[['x','X',1],['y','Y',1],['width','Width',1],['height','Height',1],['rotation','Rotation',1],['zIndex','Z-index',1],['opacity','Opacity',.05]];
const typography=[['fontFamily','Font family',FONTS],['fontSize','Font size',1],['fontWeight','Font weight',[300,400,500,600,700,800,900]],['lineHeight','Line height',.05],['letterSpacing','Letter spacing',.1],['align','Text alignment',['left','center','right']],['autoFit','Autoajuste','bool'],['minFontSize','Tamanho mínimo',1],['uppercase','Maiúsculas','bool']];
const appearance=[['color','Color','color'],['background','Background','color'],['borderColor','Border color','color'],['borderWidth','Border width',1],['borderRadius','Border radius',1],['shadow','Shadow',1],['glow','Glow',1],['stroke','Stroke','color'],['strokeWidth','Stroke width',.5],['overflow','Overflow',['visible','clip']],['padding','Padding',1],['imageFit','Imagem',['cover','contain']]];
const defaults={x:0,y:0,width:300,height:100,rotation:0,zIndex:0,opacity:1,visible:true,locked:false,fontFamily:'Avenir',fontSize:42,fontWeight:400,lineHeight:1.2,letterSpacing:0,align:'center',autoFit:true,minFontSize:23,uppercase:false,color:'#fff0bf',background:'transparent',borderColor:'transparent',borderWidth:0,borderRadius:0,shadow:0,glow:0,stroke:'transparent',strokeWidth:0,overflow:'visible',padding:8,imageFit:'cover'};
const read=(value,path)=>path.reduce((v,k)=>v?.[k],value);
const options=(values,value)=>values.map(v=>{const [id,label]=Array.isArray(v)?v:[v,v];return `<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`;}).join('');
function field(path,label,kind,value,source,own){
  const encoded=esc(JSON.stringify(path)),key=path.at(-1),v=value??defaults[key]??'';
  const input=Array.isArray(kind)?`<select data-prop="${encoded}">${options(kind,v)}</select>`:kind==='bool'?`<input type="checkbox" data-prop="${encoded}" ${v?'checked':''}>`:`<input data-prop="${encoded}" type="${typeof kind==='number'?'number':'text'}" ${typeof kind==='number'?`step="${kind}"`:''} value="${esc(typeof v==='number'?Math.round(v*100)/100:v)}" ${kind==='color'?'data-color="true"':''}>`;
  return `<div class="property-field ${kind==='bool'?'property-boolean':''}"><label><span>${esc(label)}</span>${input}</label><small class="property-source ${own?'is-own':''}" title="${esc(source||'Padrão do componente')}">${own?'Override · ':''}${esc(source||'Padrão do componente')}</small>${own?`<button class="property-reset" data-reset="${encoded}" aria-label="Restaurar ${esc(label)} herdado" title="Restaurar valor herdado">↶</button>`:''}</div>`;
}
function conditionNode(c,path=[]){
  const encoded=esc(JSON.stringify(path)),group=c.all?'all':c.any?'any':null;
  if(group)return `<div class="property-condition"><div class="row"><select data-cond-group="${encoded}">${options([['all','Todas as condições'],['any','Qualquer condição']],group)}</select><button data-cond-action="remove" data-path="${encoded}" aria-label="Remover grupo">×</button></div>${c[group].map((child,i)=>conditionNode(child,[...path,group,i])).join('')}<div class="row"><button data-cond-action="add" data-path="${encoded}">+ Condição</button><button data-cond-action="group" data-path="${encoded}">+ Grupo</button></div></div>`;
  return `<div class="property-condition"><select data-cond-field="binding" data-path="${encoded}" aria-label="Binding da condição">${options(Object.entries(BINDINGS).map(([k,v])=>[k,v.label]),c.binding)}</select><div class="row"><select data-cond-field="op" data-path="${encoded}" aria-label="Operador da condição">${options([['exists','Existe'],['eq','Igual a'],['neq','Diferente'],['gt','Maior que'],['includes','Contém'],['truthy','Verdadeiro'],['falsy','Falso']],c.op)}</select><button data-cond-action="remove" data-path="${encoded}" aria-label="Remover condição">×</button></div>${['eq','neq','gt','includes'].includes(c.op)?`<input data-cond-field="value" data-path="${encoded}" aria-label="Valor da condição" value="${esc(c.value??'')}">`:''}</div>`;
}
export function createPropertyInspector({root,getState,onPatch,onReset,onCommit,onError}){
  function render(){
    const {layout,draft,selected,assets=[]}=getState(),layer=layout?.elements.find(l=>l.id===selected[0]);
    if(!layer){root.innerHTML='<p class="empty-hint">Selecione uma layer no Canvas ou na lista.</p>';return;}
    const patch=draft.elements.find(l=>l.id===layer.id)||{};
    const input=(path,label,kind)=>field(path,label,kind,read(layer,path),layout.sources[`${layer.id}.${path.join('.')}`],read(patch,path)!==undefined);
    root.innerHTML=`<details class="property-group" open><summary>${esc(layer.name)} ${selected.length>1?`· ${selected.length} selecionadas`:''}</summary><div class="property-grid"><div class="full">${input(['name'],'Nome da layer','text')}</div><div class="full">${input(['component'],'Componente',COMPONENTS)}</div>${numeric.map(([k,label,step])=>input([k],label,step)).join('')}${input(['visible'],'Visibility','bool')}${input(['locked'],'Bloqueada','bool')}</div></details>
      <details class="property-group" open><summary>Texto e tipografia</summary><div class="property-grid">${typography.map(([k,label,kind])=>input(['style',k],label,kind)).join('')}</div></details>
      <details class="property-group"><summary>Aparência</summary><div class="property-grid">${appearance.map(([k,label,kind])=>input(['style',k],label,kind)).join('')}</div></details>
      <details class="property-group" open><summary>Binding</summary><div class="property-grid"><div class="full">${input(['binding'],'Dado dinâmico',[['','Texto decorativo'],...Object.entries(BINDINGS).map(([k,v])=>[k,`${v.label} · ${k}`])])}</div><div class="full">${input(['label'],'Rótulo visual','text')}</div>${!layer.binding?`<div class="full">${input(['text'],'Texto decorativo','text')}</div>`:''}<div class="full">${input(['asset'],'Imagem local',[['','Do binding / tema'],...assets.map(a=>[a.path,a.path])])}</div></div><p class="hint">Nome, habilidades e números vêm do catálogo ou da engine. Editar o layout não grava esses dados.</p></details>
      <details class="property-group"><summary>Visibilidade condicional</summary><div id="conditionsEditor">${layer.conditions?conditionNode(layer.conditions):'<button data-cond-action="start">+ Adicionar condição</button>'}</div></details>`;
  }
  function sync(){
    const {layout,selected,draft}=getState(),layer=layout?.elements.find(l=>l.id===selected[0]);if(!layer)return;
    const patch=draft.elements.find(l=>l.id===layer.id)||{};
    for(const el of root.querySelectorAll('[data-prop]')){
      const path=JSON.parse(el.dataset.prop),value=read(layer,path)??defaults[path.at(-1)]??'';
      if(document.activeElement!==el){if(el.type==='checkbox')el.checked=Boolean(value);else el.value=typeof value==='number'?Math.round(value*100)/100:value;}
      const box=el.closest('.property-field'),source=box.querySelector('.property-source'),own=read(patch,path)!==undefined,name=layout.sources[`${layer.id}.${path.join('.')}`]||'Padrão do componente';
      source.textContent=(own?'Override · ':'')+name;source.classList.toggle('is-own',own);source.title=name;
      let reset=box.querySelector('.property-reset');
      if(own&&!reset){reset=document.createElement('button');reset.className='property-reset';reset.textContent='↶';reset.dataset.reset=JSON.stringify(path);const label=box.querySelector('label > span').textContent;reset.setAttribute('aria-label',`Restaurar ${label} herdado`);reset.title='Restaurar valor herdado';box.append(reset);}else if(!own)reset?.remove();
    }
  }
  root.addEventListener('input',e=>{
    const el=e.target;if(!el.dataset.prop)return;const path=JSON.parse(el.dataset.prop);let value=el.type==='checkbox'?el.checked:el.type==='number'||path.at(-1)==='fontWeight'?Number(el.value):el.value;
    if(el.type==='number'&&(!Number.isFinite(value)||el.value===''))return;
    if(el.dataset.color&&!color(value)){el.setAttribute('aria-invalid','true');return;}
    el.removeAttribute('aria-invalid');
    try{const patch=path.length===1?{[path[0]]:value}:{style:{[path[1]]:value}};for(const id of getState().selected)onPatch(id,patch);onCommit('property:'+path.join('.'));if(path[0]==='binding')render();}catch(error){onError(error);}
  });
  root.addEventListener('change',e=>{
    const el=e.target,pathText=el.dataset.path||el.dataset.condGroup;if(!pathText)return;
    const state=getState(),layer=state.layout.elements.find(l=>l.id===state.selected[0]),condition=clone(layer.conditions),path=JSON.parse(pathText),node=read(condition,path);
    if(el.dataset.condGroup){const old=node.all||node.any;delete node.all;delete node.any;node[el.value]=old;}
    else{const key=el.dataset.condField;node[key]=key==='value'?(el.value==='true'?true:el.value==='false'?false:node.op==='gt'?Number(el.value):el.value):el.value;}
    for(const id of state.selected)onPatch(id,{conditions:condition});onCommit();render();
  });
  root.addEventListener('click',e=>{
    const reset=e.target.closest('[data-reset]');if(reset){for(const id of getState().selected)onReset(id,JSON.parse(reset.dataset.reset));onCommit();render();return;}
    const button=e.target.closest('[data-cond-action]');if(!button)return;
    const state=getState(),layer=state.layout.elements.find(l=>l.id===state.selected[0]),path=JSON.parse(button.dataset.path||'[]'),action=button.dataset.condAction;let condition=clone(layer.conditions||{all:[]});
    if(action==='start')condition={all:[{binding:'context.mode',op:'exists'}]};
    else if(action==='remove'){if(!path.length){for(const id of state.selected)onPatch(id,{conditions:{all:[]}});onCommit();render();return;}const parent=read(condition,path.slice(0,-1));parent.splice(path.at(-1),1);}
    else{const node=read(condition,path),k=node.all?'all':'any';node[k].push(action==='group'?{all:[]}:{binding:'context.mode',op:'exists'});}
    for(const id of state.selected)onPatch(id,{conditions:condition});onCommit();render();
  });
  return{render,sync};
}
