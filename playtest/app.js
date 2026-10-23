// Coordena navegação, comandos e projeções; o motor é independente do DOM.
import {createGame} from './engine.js?v=1';
import {renderMenu,escape,cardFace,shortName,icon,DECK_IDENTITIES} from './menu.js?v=2';
import {renderDuel,renderChoice,renderInspector,renderPause,renderVictory,dialog} from './view.js?v=1';
import {createPresentation} from './presentation.js?v=1';
import {unlock,sfx,playMusic,setVolume,volume} from './audio.js?v=1';
const root=document.querySelector('#game-root'),modalRoot=document.querySelector('#modal-root'),previewRoot=document.querySelector('#preview-root');
const presentation=createPresentation(),STORAGE_KEY='ssTcgSanctuary';
let settings={autoPass:true,fullControl:false,aiSpeed:'normal',phaseStops:['main','combat'],effects:true,hotseatPrivacy:true,music:.28,sfx:.58};
try{settings={...settings,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')};}catch{}
let cards=[],beta=null,game=null,screen='title',viewer='A',selection=null,modal=null,privacy=null,lastFocus=null,lastModalKind=null;
let collectionQuery='',collectionType='All',collectionPage=0,hoverTimer=null,searchTimer=null,drag=null,suppressClickUntil=0;
let setup={ai:true,deckAId:'athena-beta-seiya',deckBId:'athena-beta-hyoga',first:'random'};
const byId=id=>cards.find(c=>c.id===id);
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}}
function changeSettings(patch){settings={...settings,...patch};save();presentation.settings(settings);if(game)game.dispatch({type:'settings',settings:patch});else render();}
async function init(){
  const [a,b]=await Promise.all([fetch('../data/cards.json'),fetch('../data/beta-athena.json')]);
  if(!a.ok||!b.ok)throw new Error('The card library could not be loaded. Reload to try again.');
  cards=(await a.json()).cartas;beta=await b.json();
  setVolume('music',settings.music);setVolume('sfx',settings.sfx);presentation.settings(settings);render();
}
init().catch(error=>{root.innerHTML=`<section class="loading-screen"><div class="loading-error"><h1>The sanctuary is out of reach</h1><p>${escape(error.message)}</p><button class="gold-button" data-action="reload">Try again</button></div></section>`;console.error(error);});
function dismissPreview(){clearTimeout(hoverTimer);previewRoot.textContent='';}
function render(){
  dismissPreview();
  if(game&&screen==='duel'){
    const next=game.settings.ai?'A':game.actingPlayer||game.state.currentPlayer;
    if(privacy&&privacy.player!==next)privacy=null;
    if(next!==viewer&&!game.state.victory){
      if(settings.hotseatPrivacy&&!game.settings.ai){if(!privacy||privacy.player!==next)privacy={player:next};}
      else viewer=next;
    }
    root.innerHTML=renderDuel(game,viewer,selection);
    presentation.render(game);
  }else if(beta)root.innerHTML=renderMenu({screen,cards,beta,settings,collectionQuery,collectionType,collectionPage,setup});
  renderModal();requestAnimationFrame(drawTargets);
}
function renderModal(){
  let content='',kind='';
  if(privacy&&game&&!game.state.victory){kind=`privacy-${privacy.player}`;content=dialog(`<div class="privacy-symbol">✧</div><p class="section-label">Local battle</p><h1>Player ${privacy.player}, your turn</h1><p>Pass the device before revealing the next hand.</p><button class="gold-button" data-action="privacy-ready">I’m ready</button>`,'privacy-dialog');}
  else if(game?.state.victory){kind='victory';content=renderVictory(game);}
  else if(modal){
    kind=modal.type;
    if(modal.type==='inspect'){const location=modal.uid?game?.locate(modal.player,modal.uid):modal.location;const card=location?.cardData||byId(modal.cardId);if(card)content=renderInspector(card,game,location);}
    if(modal.type==='pause')content=renderPause(settings);
    if(modal.type==='log')content=dialog(`<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close log">${icon('close')}</button><div class="dialog-heading"><h1>Battle log</h1><p>Every action, in the order it happened.</p></div><div class="log-list">${game.state.log.slice(-150).reverse().map(line=>`<p>${escape(line)}</p>`).join('')}</div>`,'log-dialog');
    if(modal.type==='help')content=dialog(`<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close rules">${icon('close')}</button><div class="dialog-heading"><h1>Burn your Cosmo</h1><p>Vanilla 1.0 · The rules of the sanctuary</p></div><div class="help-columns"><section><h2>Your turn</h2><p>Ready your cards and restore 1 Cloth Damage during <strong>Upkeep</strong>. Draw one card, then enter <strong>Main</strong>. The first player skips their opening draw.</p><p>Set one <strong>Cosmoble</strong> card from your hand as a Cosmo Base each turn. Tap each Base for 1 Cosmo. Payment uses Latent first, then stored Cosmo and ready Bases.</p><h2>Victory</h2><p>Reduce the enemy God to <strong>0 Soul</strong>, or make your opponent draw from an empty deck.</p></section><section><h2>Combat and responses</h2><p>Select your attackers, then choose their targets. <strong>Guardian</strong> must be attacked first. Only <strong>Nimble</strong> can ignore Guardian and choose the God or another Devotee. Nimble can be attacked normally. A God strikes back for its Attack. Devotees recover marked damage at the end of each turn.</p><p><strong>Techniques</strong> can respond to attacks, cards and abilities. The top action on the stack resolves first. <strong>Moments</strong> are played only during your own Main.</p><h2>Cloths and Cosmo</h2><p>Only one Cloth per Devotee. Equipment stays when its bearer dies; Cloths gain Damage and must recover before equipping again. <strong>Latent Cosmo</strong> expires at the end of your turn. Athena awakens at 5 Soul; her Ultimate is once per game.</p></section></div>`,'help-dialog');
    if(modal.type==='confirm')content=dialog(`<div class="dialog-heading"><h1>${modal.concede?'Concede this duel?':'Return to the main menu?'}</h1><p>${modal.concede?'Your opponent will win this duel.':'The current duel will end.'}</p></div><footer class="dialog-actions"><button class="quiet-button" data-action="close-modal">Keep playing</button><button class="gold-button" data-action="${modal.concede?'concede':'exit-duel'}">${modal.concede?'Concede':'Main menu'}</button></footer>`,'confirm-dialog');
    if(modal.type==='pile')content=renderPile(modal);
    if(modal.type==='deck')content=renderDeckList(modal.deckId);
    if(modal.type==='abilities'){const l=game.locate(modal.player,modal.uid);content=dialog(`<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close abilities">${icon('close')}</button><div class="dialog-heading"><h1>${escape(shortName(l.cardData))}</h1><p>Choose an ability.</p></div><div class="payment-plans">${game.abilityLines(l.cardData).map((line,index)=>`<button class="payment-plan" data-action="activate-card" data-player="${modal.player}" data-uid="${modal.uid}" data-line="${index}">${escape(line)}</button>`).join('')}</div>`,'payment-dialog');}
  }else if(game&&screen==='duel'){content=renderChoice(game);kind=game.pending.mulligan?`mulligan-${game.pending.mulligan.playerKey}`:game.pending.payment?'payment':game.pending.zone?'zone':'';}
  const focused=modalRoot.contains(document.activeElement)?document.activeElement:null;
  const focusSelector=focused?.dataset.setting?`[data-setting="${focused.dataset.setting}"]`:focused?.dataset.action?`[data-action="${focused.dataset.action}"]${focused.dataset.uid?`[data-uid="${focused.dataset.uid}"]`:''}`:null;
  modalRoot.innerHTML=content;
  root.inert=Boolean(content);
  if(content){
    if(kind!==lastModalKind){if(!lastModalKind)lastFocus=document.activeElement;requestAnimationFrame(()=>modalRoot.querySelector('button:not(:disabled),input,select,[tabindex]')?.focus({preventScroll:true}));}
    else if(focusSelector)modalRoot.querySelector(focusSelector)?.focus({preventScroll:true});
  }else if(lastModalKind){const old=lastFocus;if(old?.isConnected)old.focus({preventScroll:true});else root.querySelector('.primary-action,[data-action="start-match"]')?.focus({preventScroll:true});}
  lastModalKind=kind;
}
function renderDeckList(id){const d=beta.decks.find(d=>d.id===id),identity=DECK_IDENTITIES[id];return dialog(`<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close deck">${icon('close')}</button><div class="dialog-heading"><span class="section-label">${identity.role}</span><h1>${escape(d.nome)}</h1><p>${identity.description}</p></div><div class="deck-list">${d.main_deck.map(entry=>{const c=byId(entry.card_id);return `<button data-action="inspect-card" data-card-id="${c.id}"><b>${entry.quantity}</b><span>${escape(c.nome_exibicao_en)}</span><small>${c.custo??'—'}</small></button>`;}).join('')}</div>`,'deck-dialog');}
function renderPile({player,zone}){
  const p=game.state.players[player];
  if(zone==='deck')return renderDeckList(p.deckId);
  const list=p.zones[zone];return dialog(`<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close zone">${icon('close')}</button><div class="dialog-heading"><h1>Player ${player} · ${zone==='void'?'Void':'Tartarus'}</h1><p>${list.length} cards</p></div><div class="zone-choice-grid">${list.map(i=>`<button class="zone-choice" data-action="inspect-instance" data-player="${player}" data-uid="${i.uid}">${cardFace(byId(i.cardId))}<span>${escape(shortName(byId(i.cardId)))}</span></button>`).join('')||'<p class="empty-message">No cards here yet.</p>'}</div>`,'zone-dialog');
}
function send(type,payload={}){if(!game)return;modal=null;selection=null;dismissPreview();game.dispatch({type,playerKey:payload.playerKey||game.actingPlayer,expectedRevision:game.revision,...payload});}
function showModal(next){dismissPreview();modal=next;renderModal();}
function start(){game?.dispose();presentation.reset();modal=privacy=selection=null;viewer='A';screen='duel';game=createGame({cards,beta,settings:{...settings,ai:setup.ai},onChange:render,onEvent:e=>presentation.event(e)});game.dispatch({type:'start',ai:setup.ai,deckAId:setup.deckAId,deckBId:setup.deckBId,startingPlayer:setup.first});}
function exit(){game?.dispose();game=null;presentation.reset();modal=privacy=selection=null;screen='home';playMusic('menu');render();}
function toggleStop(phase){const stops=new Set(settings.phaseStops);if(stops.has(phase))stops.delete(phase);else stops.add(phase);changeSettings({phaseStops:[...stops]});}
function handleAction(button,event={}){
  const d=button.dataset,action=d.action,payload={uid:d.uid,playerKey:d.player,manualPayment:Boolean(event.shiftKey),holdPriority:Boolean(event.ctrlKey)};
  if(action==='reload'){location.reload();return;}
  if(action==='menu'){screen=d.screen;if(screen.startsWith('setup'))setup.ai=screen==='setup-ai';modal=null;playMusic('menu');render();return;}
  if(action==='start-match'){start();return;}
  if(action==='privacy-ready'){viewer=privacy.player;privacy=null;render();return;}
  if(action==='close-modal'){modal=null;if(game?.settings.paused)game.dispatch({type:'settings',settings:{paused:false}});else renderModal();return;}
  if(action==='toggle-stop'){toggleStop(d.phase);return;}
  if(action==='toggle-full-control'){changeSettings({fullControl:!settings.fullControl});return;}
  if(action==='collection-page'){collectionPage=Math.max(0,collectionPage+Number(d.delta));render();return;}
  if(action==='inspect-card'){showModal({type:'inspect',cardId:d.cardId});return;}
  if(action==='deck-details'){showModal({type:'deck',deckId:d.deck});return;}
  if(action==='help'){showModal({type:'help'});return;}
  if(action==='pause'){modal={type:'pause'};game.dispatch({type:'settings',settings:{paused:true}});return;}
  if(action==='duel-log'){showModal({type:'log'});return;}
  if(action==='leave-duel'){if(game?.state.victory)exit();else showModal({type:'confirm'});return;}
  if(action==='exit-duel'){exit();return;}
  if(action==='rematch'){start();return;}
  if(action==='concede-confirm'){showModal({type:'confirm',concede:true});return;}
  if(action==='concede'){send('concede',{playerKey:game.settings.ai?'A':viewer});return;}
  if(!game)return;
  if(action==='inspect-instance'){const l=game.locate(d.player,d.uid);if(l)showModal({type:'inspect',player:d.player,uid:d.uid});return;}
  if(action==='pile'){showModal({type:'pile',player:d.player,zone:d.zone});return;}
  if(action==='god'||action==='domain'){
    const p=game.state.players[d.player];
    if(action==='god'&&game.targets().some(t=>t.kind==='god'&&t.playerKey===d.player)){send('target',{target:{kind:'god',playerKey:d.player}});return;}
    const id=action==='god'?p.god.cardId:p.domainId;showModal({type:'inspect',cardId:id,location:{card:{owner:d.player},cardData:byId(id),zone:action==='god'?'god':'domain'}});return;
  }
  if(action==='phase'){if(button.getAttribute('aria-disabled')!=='true')send(d.phase==='combat'?'declare':'goto-phase',{phase:d.phase});return;}
  if(action==='play-card'){send('play',payload);return;}
  if(action==='set-base'){send('base',payload);return;}
  if(action==='tap-base'){send('tap',payload);return;}
  if(action==='payment'){send('payment',{planId:d.planId});return;}
  if(action==='card-ability'){
    const l=game.locate(d.player,d.uid),ability=l&&game.ability(d.player,l.card);
    if(ability?.mode==='menu'){showModal({type:'abilities',player:d.player,uid:d.uid});return;}
    send('ability',payload);return;
  }
  if(action==='activate-card'){send('ability',{...payload,lineIndex:Number(d.line)});return;}
  if(action==='god-ability'){send('god-ability',{...payload,abilityId:d.ability});return;}
  if(action==='domain-ability'){send('domain-ability',{...payload,abilityId:'coliseum-burst'});return;}
  send(action,payload);
}
document.addEventListener('pointerdown',()=>unlock(),{once:true});document.addEventListener('keydown',()=>unlock(),{once:true});
document.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil)return;
  const button=event.target.closest('[data-action]');
  if(button&&!button.disabled){sfx('click');handleAction(button,event);return;}
  const card=event.target.closest('.game-card');if(!card||!game)return;
  const d=card.dataset,p=game.pending;
  if(p.declare||p.target||p.spell||p.equip||game.state.combat.mode==='target'){send('target',{target:{kind:'card',playerKey:d.player,uid:d.uid}});return;}
  selection={player:d.player,uid:d.uid};
  if(matchMedia('(pointer:coarse)').matches)showModal({type:'inspect',player:d.player,uid:d.uid});else render();
});
document.addEventListener('dblclick',event=>{if(event.target.closest('[data-action]')||!game)return;const card=event.target.closest('.game-card[data-zone="hand"]');if(!card)return;const {player,uid}=card.dataset;if(game.canPlay(player,uid))send('play',{playerKey:player,uid,manualPayment:event.shiftKey,holdPriority:event.ctrlKey});else if(game.canBase(player,uid))send('base',{playerKey:player,uid});});
document.addEventListener('change',event=>{
  const t=event.target;if(t.id==='setup-first'){setup.first=t.value;return;}
  if(t.id==='setup-deck-A'||t.id==='setup-deck-B'){setup[t.id.endsWith('A')?'deckAId':'deckBId']=t.value;render();return;}
  if(t.id==='collection-type'){collectionType=t.value;collectionPage=0;render();return;}
  if(t.dataset.setting){changeSettings({[t.dataset.setting]:t.type==='checkbox'?t.checked:t.value});}
});
document.addEventListener('input',event=>{
  const t=event.target;
  if(t.dataset.volume){const value=Number(t.value)/100;settings[t.dataset.volume]=value;setVolume(t.dataset.volume,value);save();const output=document.querySelector(`#volume-${t.dataset.volume}`);if(output)output.textContent=`${t.value}%`;return;}
  if(t.id==='collection-search'){collectionQuery=t.value;collectionPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const caret=t.selectionStart;render();const field=document.querySelector('#collection-search');field?.focus();if(field&&field.type!=='search')field.setSelectionRange(caret,caret);},180);}
});
document.addEventListener('contextmenu',event=>{const phase=event.target.closest('[data-phase]');if(phase){event.preventDefault();toggleStop(phase.dataset.phase);return;}const card=event.target.closest('.game-card');if(card){event.preventDefault();showModal({type:'inspect',player:card.dataset.player,uid:card.dataset.uid});}});
document.addEventListener('keydown',event=>{
  const controls=modalRoot.querySelector('[role=dialog]');
  if(event.key==='Tab'&&controls){const nodes=[...controls.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
  if(event.key==='Escape'){event.preventDefault();if(modal){modal=null;if(game?.settings.paused)game.dispatch({type:'settings',settings:{paused:false}});else renderModal();}else if(game&&!privacy)send('cancel');return;}
  if(event.target.matches('input,select,textarea'))return;
  if(screen==='title'&&(event.key==='Enter'||event.code==='Space')){event.preventDefault();screen='home';playMusic('menu');render();return;}
  if(screen==='home'&&['ArrowUp','ArrowDown'].includes(event.key)){const choices=[...root.querySelectorAll('.console-nav button')];const current=choices.indexOf(document.activeElement);event.preventDefault();choices[(current+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();sfx('hover');return;}
  if(screen!=='duel'||modal||privacy)return;
  if(event.key==='Enter'&&event.target.matches('.game-card')){event.preventDefault();const d=event.target.dataset;if(game.targets().length||game.pending.declare)send('target',{target:{kind:'card',playerKey:d.player,uid:d.uid}});else showModal({type:'inspect',player:d.player,uid:d.uid});return;}
  if(event.key.toLowerCase()==='f'){changeSettings({fullControl:!settings.fullControl});return;}
  if(event.key.toLowerCase()==='z'){send('undo');return;}
  if((event.code==='Space'||event.key==='Enter')&&!game.pending.mulligan&&!game.pending.payment&&!game.pending.zone){event.preventDefault();send('primary');}
});
function previewCard(node){
  if(modal||privacy||drag)return;const card=byId(node.dataset.cardId);if(!card)return;
  const r=node.getBoundingClientRect(),width=innerWidth<=800?180:235,height=width*1.4+50;
  let x=r.right+20;if(x+width>innerWidth-16)x=r.left-width-20;
  const y=Math.min(innerHeight-height-14,Math.max(14,r.top-30));
  previewRoot.innerHTML=`<aside class="hover-card" style="left:${Math.max(12,x)}px;top:${Math.max(12,y)}px">${cardFace(card)}<p>${escape(card.keywords_en.join(' · ')||card.tipo)}${node.dataset.zone==='hand'?' · Double-click to play':''}</p></aside>`;
}
document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const node=event.target.closest('.game-card');if(!node||node.contains(event.relatedTarget))return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>previewCard(node),420);});
document.addEventListener('pointerout',event=>{const node=event.target.closest('.game-card');if(node&&!node.contains(event.relatedTarget))dismissPreview();});
function drawTargets(){
  const svg=document.querySelector('#target-lines');if(!svg||!game)return;
  const board=svg.getBoundingClientRect(),p=game.pending,lines=[];
  const point=target=>{const n=target?.kind==='god'?document.querySelector(`.god-portrait[data-player="${target.playerKey}"]`):document.querySelector(`.game-card[data-uid="${target?.uid}"]`);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.left+r.width/2-board.left,y:r.top+r.height/2-board.top};};
  if(p.declare)for(const e of p.declare.entries)if(e.target)lines.push([point({kind:'card',uid:e.uid}),point(e.target)]);
  const combat=game.state.combat;if(combat.attacker&&combat.target)lines.push([point(combat.attacker),point(combat.target)]);
  svg.setAttribute('viewBox',`0 0 ${board.width} ${board.height}`);
  svg.innerHTML=`<defs><marker id="cosmo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6Z" fill="#efaa6a"/></marker></defs>${lines.filter(([a,b])=>a&&b).map(([a,b])=>`<path d="M${a.x},${a.y} Q${(a.x+b.x)/2+30},${(a.y+b.y)/2} ${b.x},${b.y}" fill="none" stroke="#efaa6a" stroke-width="3" stroke-linecap="round" marker-end="url(#cosmo-arrow)"/>`).join('')}`;
}
window.addEventListener('resize',()=>{dismissPreview();drawTargets();});
// Arrasto por ponteiro funciona também em telas de toque; queda inválida volta à origem.
document.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button')||modal||privacy)return;
  const node=event.target.closest('.game-card[data-zone="hand"]');if(!node||!game||node.dataset.player!==viewer)return;
  drag={node,uid:node.dataset.uid,player:node.dataset.player,x:event.clientX,y:event.clientY,rect:node.getBoundingClientRect(),active:false,ghost:null};
});
document.addEventListener('pointermove',event=>{
  if(!drag)return;
  if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>9){
    drag.active=true;dismissPreview();const ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=cardFace(byId(drag.node.dataset.cardId));document.body.append(ghost);drag.ghost=ghost;drag.node.classList.add('drag-source');document.body.classList.add('is-dragging');
  }
  if(!drag.active)return;event.preventDefault();Object.assign(drag.ghost.style,{left:`${event.clientX-55}px`,top:`${event.clientY-75}px`});
  document.querySelectorAll('.drop-is-valid').forEach(n=>n.classList.remove('drop-is-valid'));
  const drop=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop-zone]');
  if(drop&&drop.dataset.player===drag.player&&((drop.dataset.dropZone==='cosmo_base'&&game.canBase(drag.player,drag.uid))||(drop.dataset.dropZone==='battlefield'&&game.canPlay(drag.player,drag.uid))))drop.classList.add('drop-is-valid');
},{passive:false});
document.addEventListener('pointerup',event=>{
  if(!drag)return;const current=drag;drag=null;
  document.body.classList.remove('is-dragging');current.node.classList.remove('drag-source');document.querySelectorAll('.drop-is-valid').forEach(n=>n.classList.remove('drop-is-valid'));
  if(!current.active)return;suppressClickUntil=Date.now()+350;
  const drop=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop-zone]');
  const valid=drop?.dataset.player===current.player&&(drop.dataset.dropZone==='cosmo_base'?game.canBase(current.player,current.uid):game.canPlay(current.player,current.uid));
  if(valid){current.ghost.remove();send(drop.dataset.dropZone==='cosmo_base'?'base':'play',{playerKey:current.player,uid:current.uid,manualPayment:event.shiftKey,holdPriority:event.ctrlKey});}
  else{const rect=current.ghost.getBoundingClientRect();current.ghost.animate([{transform:'translate(0,0) rotate(5deg)'},{transform:`translate(${current.rect.left-rect.left}px,${current.rect.top-rect.top}px) rotate(0deg)`,opacity:0}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'}).finished.finally(()=>current.ghost.remove());}
});
document.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag?.node.classList.remove('drag-source');drag=null;document.body.classList.remove('is-dragging');});
