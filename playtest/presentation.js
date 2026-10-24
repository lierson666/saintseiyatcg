// Fila visual independente do motor: animações observam revisões sem alterar o resultado.
import {cardImage} from './menu.js?v=20261024-3';
import {sfx,playMusic} from './audio.js?v=20261024-3';
export function createPresentation(){
  let enabled=true,layer=null,loading=null,previous=null,queue=Promise.resolve(),generation=0,noticeTimer=null;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay=document.querySelector('#effects-root');
  const enqueue=task=>{const version=generation;queue=queue.then(()=>version===generation?task():undefined).catch(()=>{});return queue;};
  function warm(){if(!enabled||reduced()||loading)return;loading=import('./fx3d.js?v=20261024-3').then(m=>m.createFx()).then(fx=>{layer=fx;}).catch(()=>{layer=null;});}
  function find(target){return target?.kind==='god'?document.querySelector(`.god-portrait[data-player="${target.playerKey}"]`):document.querySelector(`.game-card[data-uid="${target?.uid}"]`);}
  function burst(rect){const node=document.createElement('i');node.className='cosmo-burst';node.style.left=`${rect.left+rect.width/2}px`;node.style.top=`${rect.top+rect.height/2}px`;overlay.appendChild(node);setTimeout(()=>node.remove(),450);}
  async function cssFlight(from,to,src,attack=false){
    if(!src||reduced())return;
    const ghost=document.createElement('div');ghost.className='css-flight';Object.assign(ghost.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
    const img=document.createElement('img');img.src=src;img.alt='';ghost.append(img);overlay.append(ghost);
    const x=to.left+to.width/2-from.left-from.width/2,y=to.top+to.height/2-from.top-from.height/2;
    const frames=attack?[{transform:'translate(0,0) scale(1)'},{transform:`translate(${x*.8}px,${y*.8}px) scale(1.12)`,offset:.6},{transform:'translate(0,0) scale(1)'}]:[{transform:'translate(0,0) scale(.85)',opacity:.5},{transform:`translate(${x}px,${y}px) scale(${to.width/from.width})`,opacity:1}];
    try{await ghost.animate(frames,{duration:attack?440:340,easing:'cubic-bezier(.2,.8,.2,1)'}).finished;}finally{ghost.remove();}
    burst(to);
  }
  function notice(message){const root=document.querySelector('#notice-root');root.textContent='';const node=document.createElement('p');node.className='notice';node.textContent=message;root.append(node);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>node.remove(),2400);}
  function banner(message){const node=document.createElement('p');node.className='turn-banner';node.textContent=message;overlay.append(node);setTimeout(()=>node.remove(),850);}
  function floating(node,value,heal=false){if(!node)return;const r=node.getBoundingClientRect(),text=document.createElement('span');text.className=`float-damage ${heal?'is-heal':''}`;text.textContent=value;Object.assign(text.style,{left:`${r.left+r.width/2}px`,top:`${r.top}px`});overlay.append(text);setTimeout(()=>text.remove(),950);}
  function capture(game){
    const rects={},cards={};document.querySelectorAll('.game-card[data-uid]').forEach(node=>{rects[node.dataset.uid]=node.getBoundingClientRect();cards[node.dataset.uid]=node.querySelector('img')?.src;});
    return {viewer:document.querySelector('.duel-board')?.dataset.viewer,turn:`${game.state.turnNumber}:${game.state.currentPlayer}`,soul:Object.fromEntries(['A','B'].map(k=>[k,game.state.players[k].god.soul])),awaken:Object.fromEntries(['A','B'].map(k=>[k,game.state.players[k].god.awakened])),units:new Set(['A','B'].flatMap(k=>game.state.players[k].zones.battlefield.map(i=>i.uid))),hands:new Set(['A','B'].flatMap(k=>game.state.players[k].zones.hand.map(i=>i.uid))),rects,cards};
  }
  return {
    settings(settings){enabled=settings.effects!==false;},
    reset(){generation++;previous=null;queue=Promise.resolve();overlay.textContent='';},
    render(game){
      if(!game.state)return;warm();const now=capture(game),before=previous;previous=now;
      if(!before||before.viewer!==now.viewer)return;
      if(before.turn!==now.turn&&!game.pending.mulligan)banner(game.settings.ai?(game.state.currentPlayer==='A'?'Your turn':"Rival’s turn"):`Player ${game.state.currentPlayer}’s turn`);
      for(const key of ['A','B']){const diff=now.soul[key]-before.soul[key];if(diff){floating(document.querySelector(`.god-portrait[data-player="${key}"]`),`${diff>0?'+':''}${diff}`,diff>0);if(diff<0)sfx('hit');}if(!before.awaken[key]&&now.awaken[key]){banner('Seventh sense awakened');sfx('awaken');}}
      if(!enabled||reduced())return;
      for(const uid of now.units){if(before.units.has(uid))continue;const target=document.querySelector(`.game-card[data-uid="${uid}"]`);if(!target)continue;const r=target.getBoundingClientRect(),from=before.rects[uid]||document.querySelector('.resolution-stack')?.getBoundingClientRect()||r;target.classList.add('card-arrival');sfx('play');enqueue(()=>layer?layer.flyCard(from,r,target.querySelector('img')?.src,target.querySelector('img')?.alt):cssFlight(from,r,target.querySelector('img')?.src));}
      for(const uid of before.units){if(now.units.has(uid)||!before.rects[uid])continue;const r=before.rects[uid];if(layer)layer.burst(r.left+r.width/2,r.top+r.height/2,0xb4adf5,35);else burst(r);}
      for(const uid of now.hands){if(before.hands.has(uid)||!now.rects[uid])continue;const node=document.querySelector(`.game-card[data-uid="${uid}"]`);const from=document.querySelector('.seat--local .pile--deck')?.getBoundingClientRect();if(node&&from)enqueue(()=>cssFlight(from,now.rects[uid],node.querySelector('img')?.src));}
    },
    async event(event){
      if(event.type==='sound'){sfx(event.name);return;}
      if(event.type==='music'){playMusic(event.name);return;}
      if(event.type==='notice'){notice(event.message);return;}
      if(event.type==='attack')return enqueue(async()=>{const from=find(event.attacker),to=find(event.target);if(!from||!to)return;const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();if(enabled&&!reduced()){if(layer)await layer.lunge(a,b,from.querySelector('img')?.src,from.querySelector('img')?.alt);else await cssFlight(a,b,from.querySelector('img')?.src,true);}to.classList.add('battle-impact');setTimeout(()=>to.classList.remove('battle-impact'),280);sfx('hit');});
    },
    notice
  };
}
