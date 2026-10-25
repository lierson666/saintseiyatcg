import {bindingValue,evaluateLayer,assetURL,esc} from './model.js';

// Uma cena vetorial serve ao editor, à arena e às exportações. Não calcula bônus.
let measureContext;
const flowCache=new Map();
const symbols={B:'✺',C:'✺',L:'✺',S:'◇',T:'↷'};
const plain=value=>String(value??'').replace(/\*\*/g,'').replace(/\{([BCLST])\}/g,(_,k)=>symbols[k]);
export function valueText(value){
  if(value==null)return '';
  if(Array.isArray(value))return value.map(v=>typeof v==='object'?(v.cardData?`${v.cardData.nome_exibicao_en}\n${(v.cardData.habilidades_en||[]).join('\n')}`:v.heading?[v.heading,v.body].filter(Boolean).join('\n'):valueText(v)):String(v)).join('\n');
  if(typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}: ${valueText(v)}`).join(' · ');
  return plain(value);
}
function measure(text,size,font,weight,spacing=0){
  if(typeof document!=='undefined'){measureContext??=document.createElement('canvas').getContext('2d');measureContext.font=`${weight} ${size}px "${font}"`;return measureContext.measureText(text).width+Math.max(0,[...text].length-1)*spacing;}
  return [...text].reduce((n,c)=>n+(/[il.,' :]/.test(c)?.26:/[MW@]/.test(c)?.88:.54)*size,0)+Math.max(0,[...text].length-1)*spacing;
}
function wrap(text,width,size,style,weight){
  const lines=[];let current='';
  for(const word of plain(text).split(/(\s+)/)){
    if(word.includes('\n')){for(const [i,part]of word.split('\n').entries()){if(i){lines.push(current.trimEnd());current='';}current+=part;}continue;}
    if(measure(current+word,size,style.fontFamily,weight,style.letterSpacing)<=width){current+=word;continue;}
    if(current.trim()){lines.push(current.trimEnd());current='';}
    if(!word.trim())continue;
    for(const c of word){if(current&&measure(current+c,size,style.fontFamily,weight,style.letterSpacing)>width){lines.push(current);current='';}current+=c;}
  }
  if(current.trim())lines.push(current.trimEnd());return lines;
}
export function textFlow(value,layer){
  const cacheKey=JSON.stringify([value,layer.width,layer.height,layer.style]);if(flowCache.has(cacheKey))return flowCache.get(cacheKey);
  const s={fontFamily:'Avenir',fontSize:42,fontWeight:400,lineHeight:1.2,letterSpacing:0,padding:8,minFontSize:23,align:'center',...layer.style};
  const blocks=Array.isArray(value)&&value.every(v=>v&&typeof v==='object'&&'heading'in v)?value.map(v=>[{text:v.heading,weight:700},{text:v.body,weight:s.fontWeight}]):[{text:valueText(value),weight:s.fontWeight}];
  const sections=blocks.flatMap(v=>Array.isArray(v)?[...v,{gap:true}]:[v]);
  function at(size){let y=0,lines=[];for(const section of sections){if(section.gap){y+=size*.35;continue;}if(!section.text)continue;for(const str of wrap(s.uppercase?plain(section.text).toUpperCase():section.text,Math.max(1,layer.width-2*s.padding),size,s,section.weight)){y+=size*s.lineHeight;lines.push({text:str,weight:section.weight,y:y-size*.2});}}return{size,lines,height:y};}
  let result=at(s.fontSize);if(s.autoFit)while(result.height>layer.height-2*s.padding&&result.size>s.minFontSize)result=at(Math.max(s.minFontSize,result.size-1));
  const output={...result,style:s,overflow:result.height>layer.height-2*s.padding+.5};flowCache.set(cacheKey,output);if(flowCache.size>500)flowCache.delete(flowCache.keys().next().value);return output;
}
export function makeScene(layout,context,{transparent=false,omitFrame=false,selection=false,nestedCard=null,key='card'}={}){
  const ctx={...context,theme:layout.theme},warnings=[],commands=[];
  for(const layer of layout.elements){
    if(transparent&&layer.id==='background')continue;
    if(!evaluateLayer(layer,ctx)||omitFrame&&['Frame','DecorativeLayer','GlowEffect'].includes(layer.component))continue;
    const value=layer.binding?bindingValue(layer.binding,ctx):layer.text||'',shape=['Frame','ArtworkFrame','FactionIcon','DecorativeLayer','GlowEffect','Divider','CardPreview'].includes(layer.component);
    if(layer.component==='ArmorHPBadge'&&!(Number(bindingValue('card.armorHP',ctx))>0)){warnings.push({layer:layer.id,kind:'missing',message:'Armor sem HP próprio válido no catálogo.'});continue;}
    if(!shape&&!valueText(value).trim())continue;
    const badge=['CastingCost','StatBadge','ArmorHPBadge','SoulBadge','AwakenBadge'].includes(layer.component),label=layer.component==='ArmorHPBadge'&&ctx.stats?.protectionActive===false?'BROKEN · ARMOR HP':layer.label;
    const bodyLayer=badge&&label?{...layer,height:layer.height*.74,y:layer.y+layer.height*.26}:layer;
    const flow=shape?null:textFlow(value,bodyLayer);
    if(flow?.overflow)warnings.push({layer:layer.id,kind:'overflow',message:`${layer.name}: texto excede a caixa (${Math.ceil(flow.height)} / ${Math.round(bodyLayer.height)} px).`});
    commands.push({layer,value,flow,label,badge,bodyLayer,nestedCard:layer.component==='CardPreview'?nestedCard:null});
  }
  if(context.card&&bindingValue('card.isArmor',ctx)&&!(Number(bindingValue('card.armorHP',ctx))>0)&&!warnings.some(w=>w.kind==='missing'))warnings.push({layer:'armor-hp',kind:'missing',message:'Armor sem HP próprio válido no catálogo; indicador omitido da arte final.'});
  return{canvas:layout.canvas,theme:layout.theme,commands,warnings,transparent,selection,key,art:context.art,assetRects:context.assetRects||{},cardId:context.card?.id};
}
const safeKey=value=>String(value).replace(/[^a-zA-Z0-9-]/g,'-');
function renderCommand(command,scene){
  const {layer:l,value,flow,label,badge,bodyLayer,nestedCard}=command,s={padding:8,...l.style},ink=s.color||scene.theme.ink,id=`ls-${safeKey(scene.key)}-${l.id}`;
  const common=`data-layer="${l.id}" data-x="${l.x}" data-y="${l.y}" data-width="${l.width}" data-height="${l.height}" data-component="${l.component}" data-binding="${esc(l.binding||'')}"${flow?.overflow?' data-overflow="true"':''} opacity="${l.opacity??1}" transform="rotate(${l.rotation||0} ${l.x+l.width/2} ${l.y+l.height/2})"`;
  const fx=s.shadow||s.glow?`<defs><filter id="${id}-fx" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="${s.shadow?3:0}" stdDeviation="${s.glow||s.shadow}" flood-color="${s.glow?scene.theme.accent:'#000000'}" flood-opacity="0.65"/></filter></defs>`:'';
  const rect=(fill=s.background||'transparent')=>`<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" rx="${s.borderRadius||0}" fill="${fill}" stroke="${s.borderColor||'transparent'}" stroke-width="${s.borderWidth||0}"/>`;
  let body=rect();
  if(['ArtworkFrame','FactionIcon','Frame','DecorativeLayer'].includes(l.component)){
    const paths=l.asset?[l.asset]:l.component==='Frame'?value:l.component==='ArtworkFrame'||l.component==='FactionIcon'?[value]:[];
    for(const path of Array.isArray(paths)?paths:[]){const url=assetURL(path),r=l.component==='Frame'?scene.assetRects[String(path).replace(/^CARD-TEMPLATE\//,'').replace(/\.png$/,'')]:null,art=l.component==='ArtworkFrame'&&typeof scene.art==='object'&&scene.art?.w&&scene.art?.h?scene.art:null;const imageRect=r?{x:r.x/1488*l.width,y:r.y/2091*l.height,width:r.w/1488*l.width,height:r.h/2091*l.height}:art?{x:art.x/1488*l.width,y:art.y/2091*l.height,width:art.w/1488*l.width,height:art.h/2091*l.height}:{x:0,y:0,width:l.width,height:l.height};if(url)body+=`<svg x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" overflow="hidden"><image href="${esc(url)}" x="${imageRect.x}" y="${imageRect.y}" width="${imageRect.width}" height="${imageRect.height}" preserveAspectRatio="${art?'none':s.imageFit==='contain'||l.component==='FactionIcon'?'xMidYMid meet':'xMidYMid slice'}"/></svg>`;}
  }
  if(l.component==='CardPreview'&&nestedCard)body+=`<svg pointer-events="none" x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" viewBox="0 0 ${nestedCard.canvas.width} ${nestedCard.canvas.height}">${svgBody(nestedCard)}</svg>`;
  if(flow){
    const font=esc(flow.style.fontFamily),anchor=flow.style.align==='left'?'start':flow.style.align==='right'?'end':'middle',x=flow.style.align==='left'?l.x+flow.style.padding:flow.style.align==='right'?l.x+l.width-flow.style.padding:l.x+l.width/2;
    const y=bodyLayer.y+flow.style.padding+(badge?Math.max(0,(bodyLayer.height-2*flow.style.padding-flow.height)/2):0);
    const stat=l.binding==='runtime.currentPower'?' data-stat="power"':l.binding==='runtime.currentHP'?' data-stat="hp"':'';
    let text=`<text font-family="${font}" font-size="${flow.size}" letter-spacing="${flow.style.letterSpacing}" fill="${ink}" text-anchor="${anchor}"${stat}${s.stroke?` stroke="${s.stroke}" stroke-width="${s.strokeWidth||0}" paint-order="stroke fill"`:''}>${flow.lines.map(line=>`<tspan x="${x}" y="${y+line.y}" font-weight="${line.weight}">${esc(line.text)}</tspan>`).join('')}</text>`;
    if(s.overflow==='clip'){body+=`<defs><clipPath id="${id}-clip"><rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}"/></clipPath></defs>`;text=`<g clip-path="url(#${id}-clip)">${text}</g>`;}
    if(badge&&label)text+=`<text x="${l.x+l.width/2}" y="${l.y+Math.min(l.height*.26,36)}" fill="${ink}" text-anchor="middle" font-family="Avenir" font-size="${Math.min(30,l.height*.22)}" font-weight="700">${esc(label)}</text>`;
    body+=text;
  }
  return `<g ${common} aria-label="${esc(l.name)}">${fx}<g${fx?` filter="url(#${id}-fx)"`:''}>${body}</g></g>`;
}
function svgBody(scene){return`${scene.transparent?'':`<rect width="${scene.canvas.width}" height="${scene.canvas.height}" fill="${scene.theme.background}"/>`}${scene.commands.map(c=>renderCommand(c,scene)).join('')}`;}
export function sceneSVG(scene){return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.canvas.width}" height="${scene.canvas.height}" viewBox="0 0 ${scene.canvas.width} ${scene.canvas.height}" role="img" aria-label="${esc(scene.cardId||'Card layout')}" data-layout-scene="${esc(scene.key)}">${svgBody(scene)}</svg>`;}
export function renderScene(scene){return `<div class="live-card studio-live-card" data-live-card="${esc(scene.cardId)}" style="position:relative;display:block;width:100%;aspect-ratio:${scene.canvas.width}/${scene.canvas.height};overflow:visible;background:transparent;border:0"><div style="width:100%;height:100%">${sceneSVG(scene)}</div></div>`;}
export function patchScene(root,scene){
  const markup=sceneSVG(scene),current=root.firstElementChild;
  if(!current||current.getAttribute('viewBox')!==`0 0 ${scene.canvas.width} ${scene.canvas.height}`){root.innerHTML=markup;return;}
  const next=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement;
  const previous=new Map([...current.children].filter(e=>e.hasAttribute('data-layer')).map(e=>[e.getAttribute('data-layer'),e]));
  for(const child of [...next.children]){const id=child.getAttribute('data-layer');if(!id){const bg=current.querySelector(':scope > rect');if(bg)bg.replaceWith(document.importNode(child,true));else current.prepend(document.importNode(child,true));continue;}const old=previous.get(id);previous.delete(id);if(old?.outerHTML===child.outerHTML)current.append(old);else{const node=document.importNode(child,true);if(old)old.replaceWith(node);current.append(node);}}
  for(const old of previous.values())old.remove();
}
async function inlineImages(svg){
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  await Promise.all([...doc.querySelectorAll('image')].map(async node=>{const url=node.getAttribute('href');if(!url||url.startsWith('data:'))return;const parsed=new URL(url);if(parsed.origin!==location.origin)throw Error('Exportação permite apenas imagens locais.');const response=await fetch(url);if(!response.ok)throw Error('Imagem não encontrada: '+parsed.pathname);const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('Asset não é imagem.');const data=await new Promise((ok,fail)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result);reader.onerror=fail;reader.readAsDataURL(blob);});node.setAttribute('href',data);}));
  return new XMLSerializer().serializeToString(doc);
}
export async function sceneCanvas(scene,{scale=1,allowOverflow=false}={}){
  if(!allowOverflow&&scene.warnings.some(w=>w.kind==='overflow'))throw Error('Texto excede a caixa. Redimensione ou ajuste a tipografia antes de exportar.');
  await document.fonts.ready;
  const svg=await inlineImages(sceneSVG(scene)),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const image=await new Promise((ok,fail)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>fail(Error('Falha na imagem vetorial.'));im.src=url;});const canvas=document.createElement('canvas');canvas.width=Math.round(scene.canvas.width*scale);canvas.height=Math.round(scene.canvas.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;}finally{URL.revokeObjectURL(url);}
}
function pdfBlob(canvas){
  const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.98).split(',')[1]),c=>c.charCodeAt(0)),encode=s=>new TextEncoder().encode(s),width=180,height=180*canvas.height/canvas.width,chunks=[encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;
  const add=(n,parts)=>{offsets[n]=length;for(const part of [encode(`${n} 0 obj\n`),...parts,encode('\nendobj\n')]){chunks.push(part);length+=part.length;}};
  add(1,[encode('<< /Type /Catalog /Pages 2 0 R >>')]);add(2,[encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')]);add(3,[encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Card 4 0 R >> >> /Contents 5 0 R >>`)]);
  add(4,[encode(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,encode('\nendstream')]);const content=`q ${width} 0 0 ${height} 0 0 cm /Card Do Q`;add(5,[encode(`<< /Length ${encode(content).length} >>\nstream\n${content}\nendstream`)]);const start=length;chunks.push(encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`));return new Blob(chunks,{type:'application/pdf'});
}
export async function exportScene(scene,format='png'){
  if(scene.warnings.some(w=>w.kind==='overflow'))throw Error('Há texto excedendo caixas; corrija os avisos antes da exportação.');
  if(format==='svg')return new Blob([await inlineImages(sceneSVG(scene))],{type:'image/svg+xml'});
  const canvas=await sceneCanvas(scene);if(format==='pdf')return pdfBlob(canvas);
  return new Promise(ok=>canvas.toBlob(ok,'image/png'));
}
