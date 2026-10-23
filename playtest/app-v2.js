import {applyPresentation,presentationBounds,interactionBinding,animateInteraction} from '../shared/presentation.js';
// Coordena a arena 2.0. Cosméticos e emotes ficam fora do estado mecânico.
import {renderLiveCard} from '../shared/live-card.js';
import {createGame} from './engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
import {renderMenu,renderAudioControls,escape,icon,cardFace,registerDeckIdentities,DECK_IDENTITIES} from './menu.js';
import {renderDuel,renderChoice,renderInspector,renderPause,renderVictory,dialog} from './view-v2.js';
import {EMOTES,renderEmotePicker} from './cosmetics.js';
import {unlock,sfx,playMusic,setVolume,configureAudio,stopEffects,playFxFile} from './audio.js';
const root=document.querySelector('#game-root'),modalRoot=document.querySelector('#modal-root'),notice=document.querySelector('#notice-root');
const editorMode=new URLSearchParams(location.search).get('editor')==='1'&&window.parent!==window;
let presentation={},presentationSchema,eventQueue=[];
const storageKey='ssTcgSanctuary';
let settings={autoPass:true,fullControl:false,aiSpeed:'normal',effects:true,hotseatPrivacy:true,music:.28,sfx:.58,hudScale:100,cardScale:100,tokenSkin:'constellation',sleeveSkin:'sanctuary',emotes:true};
try{settings={...settings,...JSON.parse(localStorage.getItem(storageKey)||'{}')};}catch{/* Navegação privada. */}
let cards=[],beta,game=null,screen='title',viewer='A',selected=null,modal=null,privacy=null,lastModal='',lastFocus,emoteTimer,searchTimer,noticeTimer;
let collectionQuery='',collectionType='All',collectionPage=0;
const setup={ai:true,deckAId:'rulebook2-athena',deckBId:'rulebook2-poseidon',first:'random'};
const ui={journalOpen:false,reviewVictory:false,logLimit:120,logPinned:true,logScroll:0,logHeight:0,lastLogCount:0,earlier:false};
let renderFrame=0,restoringLog=false,hoverTimer=0,dragUid=null,suppressClickUntil=0,audioRound=0,audioVictory=false;
const previewRoot=document.querySelector('#preview-root'),audioRoot=document.querySelector('#audio-root');
const byId=id=>cards.find(c=>c.id===id);
const engineSettings=()=>Object.fromEntries(['autoPass','fullControl','aiSpeed'].map(k=>[k,settings[k]]));
function save(){if(editorMode)return;try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch{/* Sem persistência disponível. */}}
function scale(){for(const key of ['hudScale','cardScale']){settings[key]=Math.max(75,Math.min(125,Number(settings[key])||100));document.documentElement.style.setProperty(key==='hudScale'?'--hud-scale':'--card-scale',settings[key]/100);}document.documentElement.classList.toggle('reduce-effects',!settings.effects);}
function message(text){notice.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.textContent='',3500);}
async function init(){const [r,configResponse]=await Promise.all([fetch('../data/cards.json'),fetch('../data/game-settings.json').catch(()=>null)]);const config=configResponse?.ok?await configResponse.json():null;configureAudio(config?.audio);presentation=config?.apresentacao||{};presentationSchema=await fetch('../data/presentation-schema.json').then(r=>r.json());if(config){let personal={};try{personal=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}const defaults={music:config.audio.volume_musica,sfx:config.audio.volume_fx,hudScale:config.visual.hud,cardScale:config.visual.cartas,tokenSkin:config.visual.token,sleeveSkin:config.visual.sleeve,effects:config.visual.efeitos};for(const [key,value] of Object.entries(defaults))if(!(key in personal))settings[key]=value;}if(!r.ok)throw Error('The card library is unavailable.');cards=(await r.json()).cartas;beta=createStarterDecks(cards,config?.baralhos||[]);registerDeckIdentities(beta.decks);scale();setVolume('music',settings.music);setVolume('sfx',settings.sfx);audioRoot.innerHTML=`<button class="icon-button quick-audio-trigger" popovertarget="audio-panel" aria-label="Audio controls">${icon('sound')}</button><section id="audio-panel" popover="auto" role="dialog" aria-label="Audio controls"><header><h2>Audio</h2><button class="icon-button" popovertarget="audio-panel" popovertargetaction="hide" aria-label="Close audio controls">${icon('close')}</button></header>${renderAudioControls(settings)}</section>`;if(!editorMode)playMusic('menu');render();if(editorMode)setupEditor();}
function render(){
  dismissPreview();
  const oldLog=root.querySelector('.arena-log'),logHadFocus=oldLog===document.activeElement;const logCount=game?.state?.log.length||0;if(!ui.logPinned&&logCount>ui.lastLogCount)ui.logLimit+=logCount-ui.lastLogCount;ui.lastLogCount=logCount;if(oldLog&&!restoringLog){ui.logScroll=oldLog.scrollTop;ui.logHeight=oldLog.scrollHeight;}
  document.body.classList.toggle('battle-v2',screen==='duel');
  if(game&&screen==='duel'){
    const soundState=game.state;if(soundState.round>audioRound){if(audioRound)presentationEvent('ui:turn',{},'turn');audioRound=soundState.round;}if(soundState.victory&&!audioVictory){audioVictory=true;presentationEvent(soundState.victory.draw?'ui:back':soundState.victory.winnerKey===viewer?'ui:victory':'ui:defeat',{},soundState.victory.draw?'back':soundState.victory.winnerKey===viewer?'victory':'defeat');}
    const next=game.settings.ai?'A':game.actingPlayer;
    if(next!==viewer&&!game.state.victory){if(settings.hotseatPrivacy)privacy=next;else{viewer=next;selected=null;}}
    root.innerHTML=renderDuel(game,viewer,selected,settings,ui);
  }else if(beta)root.innerHTML=renderMenu({screen,cards,beta,settings,collectionQuery,collectionType,collectionPage,setup});
  syncAudioControls();renderModal();const guideModal=ui.journalOpen&&innerWidth<=1000;const table=root.querySelector('.arena-table');if(table)table.inert=guideModal||Boolean(modalRoot.innerHTML);const journal=root.querySelector('.arena-journal');if(journal){journal.setAttribute('role',guideModal?'dialog':'complementary');if(guideModal)journal.setAttribute('aria-modal','true');}restoringLog=true;cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>{layoutHand();applyLayout();drawLinks();flushEvents();const log=root.querySelector('.arena-log');if(log)log.scrollTop=ui.logPinned?log.scrollHeight:ui.logScroll+(ui.earlier?log.scrollHeight-ui.logHeight:0);if(logHadFocus)log?.focus({preventScroll:true});ui.earlier=false;restoringLog=false;});
}
function close(){presentationEvent('ui:back',{},'back');modal=null;if(game?.settings.paused)game.dispatch({type:'settings',settings:{paused:false}});else renderModal();}
function show(next){modal=next;renderModal();}
function renderModal(){
  let html='',kind='';
  if(privacy&&game&&!game.state.victory){kind='privacy';html=dialog(`<span class="section-label">Local battle</span><h1>Player ${privacy}, your opportunity</h1><p>Pass the device before revealing the hand.</p><button class="gold-button" data-action="privacy-ready">I’m ready</button>`,'privacy-dialog');}
  else if(game?.state.victory&&!ui.reviewVictory){kind='victory';html=renderVictory(game);}
  else if(modal){
    kind=modal.type;
    const x='<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close">'+icon('close')+'</button>';
    if(kind==='inspect'){const l=modal.uid?game?.locate(modal.uid):null,c=l?.cardData||byId(modal.cardId);if(c)html=renderInspector(c,game,modal.uid,viewer);}
    if(kind==='pause')html=renderPause(settings);
    if(kind==='help')html=dialog(`${x}<h1>Rulebook 2.0</h1><div class="help-columns"><section><h2>Round and advantage</h2><p>The advantage token shows who acts first this round. Initiative alternates each round. The action indicator shows who acts now; response priority is separate.</p><p>Both players draw 2 cards from round 2 onward. Bases refresh and ENG returns to 3. Marked damage remains until healed.</p><h2>Alternating actions</h2><p>Play, Engage, Strike, equip, evolve or activate an ability as one ACTION. Before your ACTION, you may place one Cosmoble card as a Base. Two consecutive opportunity passes end the round.</p></section><section><h2>Engage and Strike</h2><p>Engage creates a lasting confrontation without damage. A Prepared Devotee may Strike an engaged target, then becomes Unprepared. Both deal damage; the defender retaliates even when Unprepared. Changing a confrontation or Disengaging costs 1 ENG and an ACTION.</p><h2>Responses and equipment</h2><p>Techniques may respond on priority. Two priority passes resolve the top item. Moments use an ACTION. One armor per Devotee; weapons and accessories use separate slots. EQUIP is paid separately from the play cost. Only an Owner can evolve its armor.</p><p>Latent Cosmo is capped at 3 and expires at round end. Reduce the enemy God’s Soul to zero to win.</p></section></div><a class="text-button" href="../docs/guia-do-jogo.md" target="_blank" rel="noopener">Complete rulebook</a>`,'help-dialog');
    if(kind==='emotes')html=dialog(`${x}<h1>Your God speaks</h1>${settings.emotes?renderEmotePicker():'<p>God emotes are muted in Options.</p>'}`,'emotes-dialog');
    if(kind==='deck'){const d=beta.decks.find(d=>d.id===modal.deckId);html=dialog(`${x}<h1>${escape(d.nome)}</h1><p>${escape(DECK_IDENTITIES[d.id].description)}</p><div class="deck-list">${d.main_deck.map(e=>`<button data-action="inspect-card" data-card-id="${e.card_id}"><b>${e.quantity}</b><span>${escape(byId(e.card_id).nome_exibicao_en)}</span><small>${byId(e.card_id).custo}</small></button>`).join('')}</div>`,'deck-dialog');}
    if(kind==='hand')html=dialog(`${x}<h1>Your hand</h1><p>Select a card to read it and choose an action.</p><div class="arena-hand-grid">${game.state.players[viewer].zones.hand.map(i=>`<button data-action="select" data-uid="${i.uid}">${cardFace(byId(i.cardId))}<b>${escape(byId(i.cardId).nome_exibicao_en)}</b></button>`).join('')||'<p>Your hand is empty.</p>'}</div>`,'hand-dialog');
    if(kind==='pile'){const list=game.state.players[modal.player].zones[modal.zone];html=dialog(`${x}<h1>Player ${modal.player} · ${escape(modal.zone)}</h1><div class="zone-choice-grid">${list.map(i=>`<button class="zone-choice" data-action="inspect" data-uid="${i.uid}">${cardFace(byId(i.cardId))}<span>${escape(byId(i.cardId).nome_exibicao_en)}</span></button>`).join('')||'<p>No cards here yet.</p>'}</div>`,'zone-dialog');}
  }else if(game&&screen==='duel'){html=renderChoice(game,viewer);kind=html?game.choice?.id:'';}
  const active=document.activeElement,setting=active?.dataset?.setting,focusedAction=active?.dataset?.action;
  if(html)dismissPreview();
  modalRoot.innerHTML=html;const battle=Boolean(game&&screen==='duel');root.inert=Boolean(html)&&!battle;const table=root.querySelector('.arena-table');if(table)table.inert=Boolean(html)||(ui.journalOpen&&innerWidth<=1000);
  if(html&&kind!==lastModal){if(!lastModal)lastFocus=active;requestAnimationFrame(()=>modalRoot.querySelector('button:not(:disabled),input,select,[tabindex]')?.focus({preventScroll:true}));}
  else if(html&&setting)modalRoot.querySelector(`[data-setting="${setting}"]`)?.focus();
  else if(html&&focusedAction)modalRoot.querySelector(`[data-action="${focusedAction}"]`)?.focus({preventScroll:true});
  else if(!html&&lastModal){if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else (root.querySelector(`.arena-card[data-uid="${selected}"]`)||root.querySelector('.primary-action'))?.focus({preventScroll:true});}
  lastModal=kind;requestAnimationFrame(applyLayout);
}
function send(command){if(!game)return;modal=null;dragUid=null;dismissPreview();try{if(!game.dispatch({playerKey:viewer,expectedRevision:game.revision,...command}))message('That action is unavailable now.');}catch(e){console.error(e);message(e.message);}render();}
function clearVisualFx(){for(const node of document.querySelectorAll('.star-hill-fx')){node.pause?.();node.remove();}}
function start(){clearVisualFx();audioRound=0;audioVictory=false;Object.assign(ui,{journalOpen:false,reviewVictory:false,logLimit:120,logPinned:true,logScroll:0,logHeight:0,lastLogCount:0});stopEffects();game?.dispose();modal=privacy=selected=null;viewer='A';screen='duel';game=createGame({cards,beta,settings:{...engineSettings(),ai:setup.ai},onChange:render,onEvent:enginePresentation});game.dispatch({type:'start',ai:setup.ai,deckAId:setup.deckAId,deckBId:setup.deckBId,startingPlayer:setup.first});if(!editorMode)playMusic('battle',{restart:true});}
function exit(){clearVisualFx();stopEffects();game?.dispose();game=null;modal=privacy=selected=null;screen='home';playMusic('menu');render();}
function change(patch){Object.assign(settings,patch);scale();save();if(game)game.dispatch({type:'settings',settings:engineSettings()});else render();}
function emote(id){const e=EMOTES.find(e=>e.id===id);if(!e||!settings.emotes)return;close();const node=document.createElement('div');node.className='god-emote';node.role='status';node.innerHTML=`<small>${escape(byId(game.state.players[viewer].god.cardId).nome_exibicao_en)}</small><p>${escape(e.text)}</p>`;root.querySelector('.arena-player--local .arena-god')?.append(node);clearTimeout(emoteTimer);emoteTimer=setTimeout(()=>node.remove(),4000);}
function handle(node){const d=node.dataset;
  if(d.command){send(JSON.parse(d.command));return;}
  switch(d.action){
    case 'menu':screen=d.screen;setup.ai=screen==='setup-ai';modal=null;playMusic('menu');render();break;
    case 'start-match':start();break;
    case 'privacy-ready':viewer=privacy;privacy=null;selected=null;render();break;
    case 'select':selected=d.uid;modal={type:'inspect',uid:d.uid};render();break;
    case 'view-hand':show({type:'hand'});break;
    case 'cycle-card':{const hand=game.state.players[viewer].zones.hand,index=hand.findIndex(i=>i.uid===selected);if(hand.length){selected=hand[(index+Number(d.direction)+hand.length)%hand.length].uid;modal={type:'inspect',uid:selected};render();}break;}
    case 'toggle-guide':ui.journalOpen=!ui.journalOpen;render();requestAnimationFrame(()=>root.querySelector(ui.journalOpen?'.arena-journal-close':'.arena-guide-toggle')?.focus({preventScroll:true}));break;
    case 'earlier-log':ui.logPinned=false;ui.earlier=true;ui.logLimit+=120;render();break;
    case 'latest-log':ui.logPinned=true;{const log=root.querySelector('.arena-log');if(log)log.scrollTop=log.scrollHeight;root.querySelector('.arena-latest')?.setAttribute('hidden','');}break;
    case 'review-duel':ui.reviewVictory=true;ui.journalOpen=innerWidth<=1000;modal=null;render();requestAnimationFrame(()=>root.querySelector(ui.journalOpen?'.arena-journal-close':'.arena-log')?.focus({preventScroll:true}));break;
    case 'inspect':show({type:'inspect',uid:d.uid});break;
    case 'inspect-card':show({type:'inspect',cardId:d.cardId});break;
    case 'leader':{const p=game.state.players[d.player];show({type:'inspect',cardId:d.kind==='god'?p.god.cardId:p.domainId,uid:d.kind==='god'?`god-${d.player}`:null});break;}
    case 'deck-details':show({type:'deck',deckId:d.deck});break;
    case 'pile':if(d.zone==='deck')show({type:'deck',deckId:game.state.players[d.player].deckId});else show({type:'pile',zone:d.zone,player:d.player});break;
    case 'help':show({type:'help'});break;
    case 'log':ui.journalOpen=true;render();break;
    case 'mute-music':setPlayerVolume('music',settings.music===0?(settings.musicBeforeMute||.28):0);break;
    case 'pause':modal={type:'pause'};game.dispatch({type:'settings',settings:{paused:true}});break;
    case 'close-modal':close();break;
    case 'emote-menu':show({type:'emotes'});break;
    case 'emote':emote(d.emote);break;
    case 'leave':exit();break;
    case 'concede':modal=null;game.dispatch({type:'settings',settings:{paused:false}});send({type:'concede'});break;
    case 'collection-page':collectionPage=Math.max(0,collectionPage+Number(d.delta));render();break;
    case 'reload':location.reload();break;
  }
}
document.addEventListener('pointerdown',()=>unlock(),{once:true});
document.addEventListener('keydown',()=>unlock(),{once:true});
document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil&&e.target.closest('.arena-card'))return;if(e.target.classList.contains('modal-backdrop')&&modal){close();return;}const n=e.target.closest('[data-command],[data-action]');if(n&&!n.disabled){presentationEvent('ui:click',{uid:n.dataset.uid},'click');handle(n);}});
document.addEventListener('contextmenu',e=>{const n=e.target.closest('.arena-card');if(n){e.preventDefault();show({type:'inspect',uid:n.dataset.uid});}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.setting){change({[t.dataset.setting]:t.type==='checkbox'?t.checked:t.value});return;}if(t.id==='setup-first')setup.first=t.value;if(t.id.startsWith('setup-deck-')){setup[t.id.endsWith('A')?'deckAId':'deckBId']=t.value;render();}if(t.id==='collection-type'){collectionType=t.value;collectionPage=0;render();}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.displayScale){settings[t.dataset.displayScale]=Number(t.value);scale();save();document.querySelector(`#scale-${t.dataset.displayScale}`).textContent=`${t.value}%`;requestAnimationFrame(drawLinks);}if(t.dataset.volume)setPlayerVolume(t.dataset.volume,Number(t.value)/100);if(t.id==='collection-search'){collectionQuery=t.value;collectionPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{render();document.querySelector('#collection-search')?.focus();},180);}});
document.addEventListener('keydown',e=>{
  if(document.querySelector('#audio-panel:popover-open'))return;
  const box=modalRoot.querySelector('[role="dialog"]')||(ui.journalOpen&&innerWidth<=1000?root.querySelector('.arena-journal'):null);
  if(e.key==='Tab'&&box){const nodes=[...box.querySelectorAll('button:not(:disabled):not([hidden]),input,select,a[href],[tabindex="0"]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(e.key==='Escape'){dismissPreview();if(modal)close();else if(ui.journalOpen){ui.journalOpen=false;render();}else if(game?.choice?.allowCancel)send({type:'cancel'});return;}
  if(e.target.matches('input,textarea,select,button,a'))return;
  if(e.key==='Enter'&&e.target.matches('[data-action="select"]')){e.preventDefault();handle(e.target);return;}
  if(screen==='title'&&(e.key==='Enter'||e.code==='Space')){screen='home';render();return;}
  if(e.target.closest('.arena-journal')||(ui.journalOpen&&innerWidth<=1000))return;
  if(game&&!modal&&!privacy&&!game.choice){if(e.code==='Space'){e.preventDefault();send({type:game.state.priority?'pass-priority':'pass'});}if(e.key.toLowerCase()==='f')change({fullControl:!settings.fullControl});}
});
function drawLinks(){const svg=document.querySelector('#target-lines');if(!svg||!game)return;const board=svg.parentElement,r=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);svg.innerHTML=game.state.links.map(l=>{const a=board.querySelector(`[data-uid="${l.a}"]`),b=board.querySelector(`[data-uid="${l.b}"]`);if(!a||!b)return '';const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),x1=x.left+x.width/2-r.left,y1=x.top+x.height/2-r.top,x2=y.left+y.width/2-r.left,y2=y.top+y.height/2-r.top;return `<path d="M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}"/>`;}).join('');}
window.addEventListener('resize',()=>{dismissPreview();layoutHand();applyLayout();drawLinks();});matchMedia('(max-width:1000px)').addEventListener('change',()=>render());document.addEventListener('scroll',e=>{drawLinks();if(e.target.matches?.('.arena-log')&&!restoringLog){const el=e.target;ui.logPinned=el.scrollHeight-el.clientHeight-el.scrollTop<28;root.querySelector('.arena-latest').hidden=ui.logPinned;}},true);
function layoutHand(){const host=root.querySelector('.arena-hand');if(!host)return;const slots=host.querySelectorAll('.arena-hand-slot'),card=host.querySelector('.arena-card');if(!card)return;const width=card.getBoundingClientRect().width;host.style.setProperty('--hand-step',`${Math.min(70,Math.max(0,(host.clientWidth-width)/Math.max(1,slots.length-1)))}px`);}
function dismissPreview(){clearTimeout(hoverTimer);previewRoot.replaceChildren();}
function hoverCard(node){
  if(!game||modal||privacy||dragUid||game.choice||previewRoot.firstElementChild?.dataset.uid===node.dataset.uid)return;presentationEvent('ui:hover',{uid:node.dataset.uid},'hover');const l=game.locate(node.dataset.uid);if(!l)return;
  const rect=node.getBoundingClientRect(),width=Math.min(300,innerWidth-32),height=Math.min(570,innerHeight-32);let left=rect.right+16;if(left+width>innerWidth-16)left=rect.left-width-16;
  previewRoot.innerHTML=`<aside class="arena-card-preview" data-uid="${node.dataset.uid}" style="left:${Math.max(16,left)}px;top:${Math.max(16,Math.min(rect.top,innerHeight-height-16))}px;width:${width}px;max-height:${height}px">${renderLiveCard(l.cardData,{stats:l.zone==='battlefield'?game.stats(l.card.uid):null,instance:l.zone==='battlefield'?l.card:null})}<p>Click to open and choose an action</p></aside>`;
}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const card=e.target.closest('.arena-card');if(!card||card.contains(e.relatedTarget))return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>hoverCard(card),180);});
document.addEventListener('pointerout',e=>{const card=e.target.closest('.arena-card');if(card&&!card.contains(e.relatedTarget))dismissPreview();});
document.addEventListener('focusin',e=>{if(e.target.matches('.arena-card')&&!modal)hoverCard(e.target);});
document.addEventListener('focusout',e=>{if(e.target.matches('.arena-card'))dismissPreview();});
document.addEventListener('dragstart',e=>{const card=e.target.closest('.arena-card[data-zone="hand"]');if(!card||!game.canPlay(viewer,card.dataset.uid)){e.preventDefault();return;}dragUid=card.dataset.uid;dismissPreview();e.dataTransfer.setData('text/plain',dragUid);e.dataTransfer.effectAllowed='move';root.querySelector('.arena-board').classList.add('is-dragging');});
document.addEventListener('dragover',e=>{if(dragUid&&e.target.closest('.arena-combat')){e.preventDefault();e.dataTransfer.dropEffect='move';}});
document.addEventListener('drop',e=>{if(!dragUid||!e.target.closest('.arena-combat'))return;e.preventDefault();const uid=dragUid;dragUid=null;suppressClickUntil=Date.now()+250;send({type:'play',uid});});
document.addEventListener('dragend',()=>{dragUid=null;suppressClickUntil=Date.now()+250;root.querySelector('.arena-board')?.classList.remove('is-dragging');});
// API somente por comandos; snapshots retornados pelo motor são cópias.
window.sstcg={get game(){return game;},get cards(){return structuredClone(cards);},get settings(){return {...settings};}};
init().catch(e=>{console.error(e);root.innerHTML=`<section class="loading-screen"><h1>The sanctuary is out of reach</h1><p>${escape(e.message)}</p><button data-action="reload">Try again</button></section>`;});

function syncAudioControls(){for(const e of document.querySelectorAll('[data-volume]'))if(e!==document.activeElement)e.value=Math.round(settings[e.dataset.volume]*100);for(const e of document.querySelectorAll('[data-volume-output]'))e.textContent=`${Math.round(settings[e.dataset.volumeOutput]*100)}%`;for(const e of document.querySelectorAll('[data-music-mute]')){e.setAttribute('aria-pressed',settings.music===0);e.textContent=settings.music===0?'Restore music':'Mute music';}}
function setPlayerVolume(kind,value){value=Math.max(0,Math.min(1,value));if(kind==='music'){if(value===0&&settings.music>0)settings.musicBeforeMute=settings.music;if(value>0)settings.musicBeforeMute=value;}settings[kind]=value;setVolume(kind,value);save();syncAudioControls();}

function applyLayout(){if(presentationSchema)applyPresentation(presentation,presentationSchema);}
function enginePresentation(event){
  const type=event.type==='attack'?'combat:attack':event.type;
  const fallback={'combat:attack':'impact','acao:play':'play','acao:base':'cosmo','acao:choose':'confirm'}[type];
  presentationEvent(type,event,fallback);
}
function publicCard(uid){
  if(!uid||!game)return null;const l=game.locate(uid);
  if(!l||['deck','hand','bases'].includes(l.zone)&&!(l.zone==='hand'&&l.playerKey===viewer))return null;
  return l.cardData?.id;
}
function presentationEvent(type,event={},fallback){
  if(editorMode)return;
  eventQueue.push({type,event,fallback});requestAnimationFrame(flushEvents);
}
function flushEvents(){
  for(const {type,event,fallback} of eventQueue.splice(0)){
    const uid=event.uid||event.attacker?.uid,target=event.target?.uid||(event.target?.kind==='god'?'god-'+event.target.playerKey:null);
    const binding=interactionBinding(presentation,type,publicCard(uid),publicCard(target));
    if(binding.ativo===false)continue;
    if(binding.som)playFxFile(binding.som,binding.volume??1);else if(fallback&&binding.som===undefined)sfx(fallback);
    const node=(target||uid)&&document.querySelector(`[data-uid="${CSS.escape(target||uid)}"]`)||root.querySelector('.arena-combat')||root.firstElementChild;
    animateInteraction(node,binding,{enabled:settings.effects});
  }
}
function setupEditor(){
  window.starHillPreview={
    apply(value){presentation=structuredClone(value);applyLayout();},
    bounds(scene){return presentationBounds(presentationSchema,scene);},
    journal(open){ui.journalOpen=open;render();},
    effect(binding){animateInteraction(root.querySelector('.arena-player--local .arena-god')||root.firstElementChild,binding);},
    scene(name){
      game?.dispose();game=null;modal=privacy=selected=null;eventQueue=[];settings.hotseatPrivacy=false;
      const menus=['title','home','decks','collection','options','setup'];
      if(menus.includes(name)){screen=name==='setup'?'setup-ai':name;render();return;}
      screen='duel';game=createGame({cards,beta,settings:{ai:false,autoPass:false,paused:false},onChange:()=>{}});
      game.dispatch({type:'start',ai:false,deckAId:setup.deckAId,deckBId:setup.deckBId,startingPlayer:'A'});
      if(name!=='opening')while(game.choice?.prompt==='Choose your opening hand')game.dispatch({type:'choose',playerKey:game.actingPlayer,optionId:'keep'});
      game.dispatch({type:'settings',settings:{paused:true}});viewer='A';
      if(name==='inspector')modal={type:'inspect',uid:game.state.players.A.zones.hand[0].uid};
      else if(['pause','help','hand','emotes'].includes(name))modal={type:name};
      else if(name==='pile')modal={type:'pile',player:'A',zone:'tartarus'};
      else if(name==='privacy')privacy='B';
      render();
      if(name==='victory'){modalRoot.innerHTML=dialog('<h1>Victory</h1><p>Your rival has conceded.</p><div class="dialog-actions"><button>Duel again</button><button>Main menu</button></div>','victory-dialog');applyLayout();}
    }
  };
  window.starHillPreview.scene('hud');
  window.parent.postMessage({type:'star-hill-ready'},location.origin);
}
