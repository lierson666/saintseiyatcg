// Apresentação editável; não escreve no estado mecânico nem executa código enviado.
export function interactionBinding(config,event,source,target){
  return {...config?.interacoes?.[event],...config?.cartas?.[source]?.[event],...config?.pares?.[`${source}>${target}`]?.[event]};
}
const previous=new WeakMap();
export function applyPresentation(config,schema,doc=document){
  const profile=doc.defaultView.innerWidth<=700?'mobile':'desktop';
  const apply=(node,style={})=>{
    if(!node)return;
    const old=previous.get(node);
    if(old){for(const [key,value] of Object.entries(old.css))node.style[key]=value;if(old.children)node.replaceChildren(...old.children.map(x=>x.cloneNode(true)));}
    const saved={css:{}};
    const put=(key,value)=>{saved.css[key]=node.style[key];node.style[key]=value;};
    if(style.posicionado){put('position','absolute');put('inset','auto');put('left',`${style.x??0}%`);put('top',`${style.y??0}%`);put('margin','0');put('transform','none');}
    if(style.largura!==undefined)put('width',style.largura+'%');
    if(style.altura!==undefined)put('height',style.altura+'%');
    if(style.escala!==undefined){put('scale',String(style.escala));put('transformOrigin','top left');}
    if(style.visivel===false)put('visibility','hidden');
    for(const [key,css] of Object.entries({opacidade:'opacity',camada:'zIndex',cor:'color',fundo:'backgroundColor',borda:'borderColor',fonte:'fontFamily'}))if(style[key]!==undefined)put(css,String(style[key]));
    if(style.tamanho!==undefined)put('fontSize',style.tamanho+'px');
    if(style.imagem){put('backgroundImage','url("/'+style.imagem.split('/').map(encodeURIComponent).join('/')+'")');put('backgroundSize','cover');put('backgroundPosition','center');}
    if(style.texto!==undefined){saved.children=[...node.childNodes].map(x=>x.cloneNode(true));node.textContent=style.texto;}
    previous.set(node,saved);
  };
  for(const [id,item] of Object.entries(schema.hud))for(const node of doc.querySelectorAll(item.seletor))apply(node,config?.hud?.[profile]?.[id]);
  for(const [id,item] of Object.entries(schema.telas))for(const screen of doc.querySelectorAll(item.seletor)){
    const styles=config?.telas?.[id]?.[profile]||{};apply(screen,styles.tela);
    for(const [part,entry] of Object.entries(item.elementos))for(const node of screen.querySelectorAll(entry.seletor))apply(node,styles[part]);
  }
}
export function presentationBounds(schema,scene,doc=document){
  const entries=scene==='hud'?schema.hud:{tela:{nome:'Tela completa',seletor:schema.telas[scene].seletor},...Object.fromEntries(Object.entries(schema.telas[scene].elementos).map(([id,item])=>[id,{...item,seletor:schema.telas[scene].seletor+' '+item.seletor}]))};
  return Object.entries(entries).flatMap(([id,item])=>{
    const node=doc.querySelector(item.seletor);if(!node)return[];
    const r=node.getBoundingClientRect(),p=(node.offsetParent||doc.documentElement).getBoundingClientRect();
    if(r.width<1||r.height<1)return[];
    return [{id,nome:item.nome,x:r.left,y:r.top,w:r.width,h:r.height,parent:{x:p.left,y:p.top,w:p.width,h:p.height},hidden:getComputedStyle(node).visibility==='hidden'}];
  });
}
export function animateInteraction(node,binding,{enabled=true}={}){
  if(!node||binding.ativo===false||!enabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const n=binding.intensidade??1,duration=binding.duracao??650;
  const frames={
    pulse:[{scale:1},{scale:1+.08*n},{scale:1}],
    glow:[{filter:'brightness(1)'},{filter:`brightness(${1+.7*n}) drop-shadow(0 0 22px #efc96c)`},{filter:'brightness(1)'}],
    shake:[{translate:'0 0'},{translate:`${-8*n}px 0`},{translate:`${8*n}px 0`},{translate:'0 0'}],
    lift:[{translate:'0 0'},{translate:`0 ${-25*n}px`},{translate:'0 0'}],
    flip:[{rotate:'y 0deg'},{rotate:'y 180deg'},{rotate:'y 360deg'}],
    flash:[{opacity:1},{opacity:.15},{opacity:1}],
    sweep:[{translate:`${-80*n}px 0`,opacity:0},{translate:'0 0',opacity:1}],
    fade:[{opacity:0},{opacity:1}],zoom:[{scale:.6},{scale:1+.1*n},{scale:1}],
    spin:[{rotate:'0deg'},{rotate:'360deg'}],
    ripple:[{boxShadow:'0 0 0 0 #f1d57a'},{boxShadow:`0 0 0 ${45*n}px #f1d57a00`}]
  };
  if(frames[binding.animacao])node.animate(frames[binding.animacao],{duration,easing:'ease-out'});
  if(binding.visual){
    const video=/\.(mp4|webm)$/i.test(binding.visual),fx=document.createElement(video?'video':'img'),r=node.getBoundingClientRect();
    fx.className='star-hill-fx';fx.src='/'+binding.visual.split('/').map(encodeURIComponent).join('/');fx.alt='';
    Object.assign(fx.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',objectFit:'contain',pointerEvents:'none',zIndex:90});
    if(video){fx.muted=true;fx.playsInline=true;fx.play().catch(()=>{});}document.body.append(fx);setTimeout(()=>fx.remove(),duration);
  }
}
