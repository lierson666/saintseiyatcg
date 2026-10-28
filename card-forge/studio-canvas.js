import {patchScene} from '../shared/layout-studio/renderer.js';

// Interações geométricas em coordenadas nativas; histórico é registrado só ao terminar o gesto.
export function createStudioCanvas({selection,onSelect,onPatch,onCommit,onDelete}){
  const $=s=>document.querySelector(s),viewport=$('#canvasViewport'),paper=$('#canvasPaper'),root=$('#sceneRoot'),overlay=$('#selectionOverlay'),guides=$('#guidesOverlay');
  let layout=null,scene=null,zoom=.28,pan={x:0,y:0},gesture=null,space=false,fitted=true,smart=[];
  const selectedLayers=()=>layout?.elements.filter(l=>selection.has(l.id))||[];
  const bounds=layers=>layers.length?{x:Math.min(...layers.map(l=>l.x)),y:Math.min(...layers.map(l=>l.y)),width:Math.max(...layers.map(l=>l.x+l.width))-Math.min(...layers.map(l=>l.x)),height:Math.max(...layers.map(l=>l.y+l.height))-Math.min(...layers.map(l=>l.y))}:null;
  const point=e=>{const r=paper.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*layout.canvas.width,y:(e.clientY-r.top)/r.height*layout.canvas.height};};
  function geometry(){if(!layout)return;paper.style.width=layout.canvas.width*zoom+'px';paper.style.height=layout.canvas.height*zoom+'px';paper.style.transform=`translate(${pan.x}px,${pan.y}px)`;$('#paperHost').style.minWidth=(layout.canvas.width*zoom+100)+'px';$('#paperHost').style.minHeight=(layout.canvas.height*zoom+100)+'px';$('#zoom').value=zoom*100;$('#zoomValue').textContent=Math.round(zoom*100)+'%';}
  const styleRect=b=>`left:${b.x/layout.canvas.width*100}%;top:${b.y/layout.canvas.height*100}%;width:${b.width/layout.canvas.width*100}%;height:${b.height/layout.canvas.height*100}%`;
  function drawSelection(){
    if(!layout)return;const layers=selectedLayers(),box=bounds(layers),movable=layers.some(l=>!l.locked);
    overlay.innerHTML=box?`<div class="selection-box ${movable?'':'is-locked'}" style="${styleRect(box)}">${movable?Object.entries({nw:[0,0],n:[50,0],ne:[100,0],e:[100,50],se:[100,100],s:[50,100],sw:[0,100],w:[0,50]}).map(([key,[x,y]])=>`<span class="resize-handle" data-handle="${key}" style="left:${x}%;top:${y}%"></span>`).join(''):''}</div>`:'';
    const safe=layout.canvas.safe||0,bleed=layout.canvas.bleed||0;
    guides.innerHTML=($('#showSafe').checked?`<div class="safe-guide" style="${styleRect({x:safe,y:safe,width:layout.canvas.width-2*safe,height:layout.canvas.height-2*safe})}"></div>`:'')+($('#showBleed').checked?`<div class="bleed-guide" style="${styleRect({x:-bleed,y:-bleed,width:layout.canvas.width+2*bleed,height:layout.canvas.height+2*bleed})}"></div>`:'')+smart.map(g=>`<div class="smart-guide-${g.axis}" style="${g.axis==='x'?'left':'top'}:${g.value/layout.canvas[g.axis==='x'?'width':'height']*100}%"></div>`).join('');
    root.querySelectorAll('[data-layer]').forEach(node=>{const l=layout.elements.find(l=>l.id===node.dataset.layer);if(l)node.dataset.locked=String(Boolean(l.locked));});
  }
  function fit(){if(!layout)return;zoom=Math.max(.08,Math.min(1.5,(viewport.clientWidth-110)/layout.canvas.width,(viewport.clientHeight-110)/layout.canvas.height));pan={x:0,y:0};fitted=true;geometry();drawSelection();}
  function update(nextScene,nextLayout){scene=nextScene;layout=nextLayout;patchScene(root,scene);geometry();drawSelection();}
  function snap(value){const grid=Math.max(1,Number($('#gridSize').value)||16);return $('#snapGrid').checked?Math.round(value/grid)*grid:value;}
  function aligned(box,dx,dy){
    smart=[];let x=snap(box.x+dx),y=snap(box.y+dy);if(!$('#smartGuides').checked)return{x,y};
    const others=layout.elements.filter(l=>!selection.has(l.id)&&l.visible!==false),safe=layout.canvas.safe||0;
    for(const [axis,size,limit]of [['x','width',layout.canvas.width],['y','height',layout.canvas.height]]){
      const targets=[0,safe,limit/2,limit-safe,limit,...others.flatMap(l=>[l[axis],l[axis]+l[size]/2,l[axis]+l[size]])];
      const origin=axis==='x'?x:y;let best=null;
      for(const edge of [0,box[size]/2,box[size]])for(const target of targets){const distance=Math.abs(origin+edge-target);if(distance<6/zoom&&(!best||distance<best.distance))best={value:target,origin:target-edge,distance};}
      if(best){if(axis==='x')x=best.origin;else y=best.origin;smart.push({axis,value:best.value});}
    }
    return{x,y};
  }
  viewport.addEventListener('pointerdown',e=>{
    if(!layout||e.button>1)return;
    if(space||e.button===1){gesture={kind:'pan',x:e.clientX,y:e.clientY,pan:{...pan}};viewport.classList.add('is-panning');viewport.setPointerCapture(e.pointerId);e.preventDefault();return;}
    const handle=e.target.closest('[data-handle]')?.dataset.handle,id=e.target.closest('[data-layer]')?.dataset.layer;
    if(!handle){if(!id){onSelect(null,e.shiftKey);return;}if(e.shiftKey||e.metaKey||e.ctrlKey)onSelect(id,true);else if(!selection.has(id))onSelect(id,false);}
    const layers=selectedLayers().filter(l=>!l.locked);if(!layers.length)return;
    gesture={kind:handle?'resize':'move',handle,start:point(e),box:bounds(layers),layers:structuredClone(layers),changed:false};viewport.setPointerCapture(e.pointerId);viewport.focus({preventScroll:true});e.preventDefault();
  });
  viewport.addEventListener('pointermove',e=>{
    if(!gesture)return;if(gesture.kind==='pan'){pan={x:gesture.pan.x+e.clientX-gesture.x,y:gesture.pan.y+e.clientY-gesture.y};geometry();return;}
    const p=point(e),dx=p.x-gesture.start.x,dy=p.y-gesture.start.y,{box,layers}=gesture;
    if(gesture.kind==='move'){const target=aligned(box,dx,dy);for(const l of layers)onPatch(l.id,{x:l.x+target.x-box.x,y:l.y+target.y-box.y});}
    else{
      const h=gesture.handle;let x=box.x,y=box.y,w=box.width,height=box.height;
      if(h.includes('e'))w=Math.max(16,snap(box.width+dx));if(h.includes('s'))height=Math.max(16,snap(box.height+dy));
      if(h.includes('w')){x=Math.min(box.x+box.width-16,snap(box.x+dx));w=box.width-(x-box.x);}if(h.includes('n')){y=Math.min(box.y+box.height-16,snap(box.y+dy));height=box.height-(y-box.y);}
      for(const l of layers)onPatch(l.id,{x:x+(l.x-box.x)*w/box.width,y:y+(l.y-box.y)*height/box.height,width:Math.max(1,l.width*w/box.width),height:Math.max(1,l.height*height/box.height)});
    }
    gesture.changed=true;
  });
  function finish(e){if(!gesture)return;const commit=gesture.changed;gesture=null;smart=[];viewport.classList.remove('is-panning');if(e&&viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(commit)onCommit();drawSelection();}
  viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);
  viewport.addEventListener('keydown',e=>{
    if(e.code==='Space'){space=true;viewport.style.cursor='grab';e.preventDefault();return;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const amount=e.shiftKey?10:1;for(const l of selectedLayers().filter(l=>!l.locked))onPatch(l.id,{x:l.x+(e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0),y:l.y+(e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0)});onCommit();e.preventDefault();}
    if(['Delete','Backspace'].includes(e.key)){onDelete();e.preventDefault();}
    if(e.key==='Escape'){onSelect(null);e.preventDefault();}
  });
  window.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;viewport.style.cursor='';}});
  window.addEventListener('blur',()=>{space=false;finish();});
  viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();fitted=false;zoom=Math.max(.08,Math.min(1.5,zoom*(e.deltaY<0?1.08:.92)));geometry();drawSelection();}},{passive:false});
  $('#zoom').addEventListener('input',e=>{zoom=Number(e.target.value)/100;fitted=false;geometry();drawSelection();});
  $('#fitCanvas').addEventListener('click',fit);$('#realSize').addEventListener('click',()=>{zoom=240/layout.canvas.width;fitted=false;geometry();drawSelection();});
  for(const id of ['showSafe','showBleed','snapGrid','gridSize','smartGuides'])$('#'+id).addEventListener('change',drawSelection);
  new ResizeObserver(()=>{if(fitted)fit();}).observe(viewport);
  return{update,fit,drawSelection,get zoom(){return zoom;}};
}
