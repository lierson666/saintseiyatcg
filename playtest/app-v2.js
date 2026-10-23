// Coordena a arena 2.0. Cosméticos e emotes ficam fora do estado mecânico.
import {createGame} from './engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
import {renderMenu,escape,icon,cardFace,registerDeckIdentities,DECK_IDENTITIES} from './menu.js';
import {renderDuel,renderChoice,renderInspector,renderPause,renderVictory,dialog} from './view-v2.js';
import {EMOTES,renderEmotePicker} from './cosmetics.js';
import {unlock,sfx,playMusic,setVolume} from './audio.js';
const root=document.querySelector('#game-root'),modalRoot=document.querySelector('#modal-root'),notice=document.querySelector('#notice-root');
const storageKey='ssTcgSanctuary';
let settings={autoPass:true,fullControl:false,aiSpeed:'normal',effects:true,hotseatPrivacy:true,music:.28,sfx:.58,hudScale:100,cardScale:100,tokenSkin:'constellation',sleeveSkin:'sanctuary',emotes:true};
try{settings={...settings,...JSON.parse(localStorage.getItem(storageKey)||'{}')};}catch{/* Navegação privada. */}
let cards=[],beta,game=null,screen='title',viewer='A',selected=null,modal=null,privacy=null,lastModal='',lastFocus,emoteTimer,searchTimer,noticeTimer;
let collectionQuery='',collectionType='All',collectionPage=0;
const setup={ai:true,deckAId:'rulebook2-athena',deckBId:'rulebook2-poseidon',first:'random'};
const byId=id=>cards.find(c=>c.id===id);
const engineSettings=()=>Object.fromEntries(['autoPass','fullControl','aiSpeed'].map(k=>[k,settings[k]]));
function save(){try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch{/* Sem persistência disponível. */}}
function scale(){for(const key of ['hudScale','cardScale']){settings[key]=Math.max(75,Math.min(125,Number(settings[key])||100));document.documentElement.style.setProperty(key==='hudScale'?'--hud-scale':'--card-scale',settings[key]/100);}document.documentElement.classList.toggle('reduce-effects',!settings.effects);}
function message(text){notice.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.textContent='',3500);}
async function init(){const r=await fetch('../data/cards.json');if(!r.ok)throw Error('The card library is unavailable.');cards=(await r.json()).cartas;beta=createStarterDecks(cards);registerDeckIdentities(beta.decks);scale();setVolume('music',settings.music);setVolume('sfx',settings.sfx);render();}
function render(){
  document.body.classList.toggle('battle-v2',screen==='duel');
  if(game&&screen==='duel'){
    const next=game.settings.ai?'A':game.actingPlayer;
    if(next!==viewer&&!game.state.victory){if(settings.hotseatPrivacy)privacy=next;else{viewer=next;selected=null;}}
    root.innerHTML=renderDuel(game,viewer,selected,settings);
  }else if(beta)root.innerHTML=renderMenu({screen,cards,beta,settings,collectionQuery,collectionType,collectionPage,setup});
  renderModal();requestAnimationFrame(drawLinks);
}
function close(){modal=null;if(game?.settings.paused)game.dispatch({type:'settings',settings:{paused:false}});else renderModal();}
function show(next){modal=next;renderModal();}
function renderModal(){
  let html='',kind='';
  if(privacy&&game&&!game.state.victory){kind='privacy';html=dialog(`<span class="section-label">Local battle</span><h1>Player ${privacy}, your opportunity</h1><p>Pass the device before revealing the hand.</p><button class="gold-button" data-action="privacy-ready">I’m ready</button>`,'privacy-dialog');}
  else if(game?.state.victory){kind='victory';html=renderVictory(game);}
  else if(modal){
    kind=modal.type;
    const x='<button class="dialog-close icon-button" data-action="close-modal" aria-label="Close">'+icon('close')+'</button>';
    if(kind==='inspect'){const l=modal.uid?game?.locate(modal.uid):null,c=l?.cardData||byId(modal.cardId);if(c)html=renderInspector(c,game,modal.uid,viewer);}
    if(kind==='pause')html=renderPause(settings);
    if(kind==='help')html=dialog(`${x}<h1>Rulebook 2.0</h1><div class="help-columns"><section><h2>Round and advantage</h2><p>The advantage token shows who acts first this round. Initiative alternates each round. The action indicator shows who acts now; response priority is separate.</p><p>Both players draw 2 cards from round 2 onward. Bases refresh and ENG returns to 3. Marked damage remains until healed.</p><h2>Alternating actions</h2><p>Play, Engage, Strike, equip, evolve or activate an ability as one ACTION. Before your ACTION, you may place one Cosmoble card as a Base. Two consecutive opportunity passes end the round.</p></section><section><h2>Engage and Strike</h2><p>Engage creates a lasting confrontation without damage. A Prepared Devotee may Strike an engaged target, then becomes Unprepared. Both deal damage; the defender retaliates even when Unprepared. Changing a confrontation or Disengaging costs 1 ENG and an ACTION.</p><h2>Responses and equipment</h2><p>Techniques may respond on priority. Two priority passes resolve the top item. Moments use an ACTION. One armor per Devotee; weapons and accessories use separate slots. EQUIP is paid separately from the play cost. Only an Owner can evolve its armor.</p><p>Latent Cosmo is capped at 3 and expires at round end. Reduce the enemy God’s Soul to zero to win.</p></section></div><a class="text-button" href="../docs/guia-do-jogo.md" target="_blank" rel="noopener">Complete rulebook</a>`,'help-dialog');
    if(kind==='log')html=dialog(`${x}<h1>Battle log</h1><div class="log-list">${game.state.log.slice(-150).reverse().map(t=>`<p>${escape(t)}</p>`).join('')}</div>`,'log-dialog');
    if(kind==='emotes')html=dialog(`${x}<h1>Your God speaks</h1>${settings.emotes?renderEmotePicker():'<p>God emotes are muted in Options.</p>'}`,'emotes-dialog');
    if(kind==='deck'){const d=beta.decks.find(d=>d.id===modal.deckId);html=dialog(`${x}<h1>${escape(d.nome)}</h1><p>${escape(DECK_IDENTITIES[d.id].description)}</p><div class="deck-list">${d.main_deck.map(e=>`<button data-action="inspect-card" data-card-id="${e.card_id}"><b>${e.quantity}</b><span>${escape(byId(e.card_id).nome_exibicao_en)}</span><small>${byId(e.card_id).custo}</small></button>`).join('')}</div>`,'deck-dialog');}
    if(kind==='pile'){const list=game.state.players[modal.player].zones[modal.zone];html=dialog(`${x}<h1>Player ${modal.player} · ${escape(modal.zone)}</h1><div class="zone-choice-grid">${list.map(i=>`<button class="zone-choice" data-action="inspect" data-uid="${i.uid}">${cardFace(byId(i.cardId))}<span>${escape(byId(i.cardId).nome_exibicao_en)}</span></button>`).join('')||'<p>No cards here yet.</p>'}</div>`,'zone-dialog');}
  }else if(game&&screen==='duel'){html=renderChoice(game,viewer);kind=html?game.choice?.id:'';}
  const active=document.activeElement,setting=active?.dataset?.setting;
  modalRoot.innerHTML=html;root.inert=!!html;
  if(html&&kind!==lastModal){if(!lastModal)lastFocus=active;requestAnimationFrame(()=>modalRoot.querySelector('button:not(:disabled),input,select,[tabindex]')?.focus({preventScroll:true}));}
  else if(html&&setting)modalRoot.querySelector(`[data-setting="${setting}"]`)?.focus();
  else if(!html&&lastModal){if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else root.querySelector('.primary-action')?.focus({preventScroll:true});}
  lastModal=kind;
}
function send(command){if(!game)return;modal=null;try{if(!game.dispatch({playerKey:viewer,expectedRevision:game.revision,...command}))message('That action is unavailable now.');}catch(e){console.error(e);message(e.message);}render();}
function start(){game?.dispose();modal=privacy=selected=null;viewer='A';screen='duel';game=createGame({cards,beta,settings:{...engineSettings(),ai:setup.ai},onChange:render,onEvent:()=>{}});game.dispatch({type:'start',ai:setup.ai,deckAId:setup.deckAId,deckBId:setup.deckBId,startingPlayer:setup.first});playMusic('battle');}
function exit(){game?.dispose();game=null;modal=privacy=selected=null;screen='home';playMusic('menu');render();}
function change(patch){Object.assign(settings,patch);scale();save();if(game)game.dispatch({type:'settings',settings:engineSettings()});else render();}
function emote(id){const e=EMOTES.find(e=>e.id===id);if(!e||!settings.emotes)return;close();const node=document.createElement('div');node.className='god-emote';node.role='status';node.innerHTML=`<small>${escape(byId(game.state.players[viewer].god.cardId).nome_exibicao_en)}</small><p>${escape(e.text)}</p>`;root.querySelector('.v2-seat--local .v2-god')?.append(node);clearTimeout(emoteTimer);emoteTimer=setTimeout(()=>node.remove(),4000);}
function handle(node){const d=node.dataset;
  if(d.command){send(JSON.parse(d.command));return;}
  switch(d.action){
    case 'menu':screen=d.screen;setup.ai=screen==='setup-ai';modal=null;playMusic('menu');render();break;
    case 'start-match':start();break;
    case 'privacy-ready':viewer=privacy;privacy=null;selected=null;render();break;
    case 'select':selected=d.uid;render();break;
    case 'inspect':show({type:'inspect',uid:d.uid});break;
    case 'inspect-card':show({type:'inspect',cardId:d.cardId});break;
    case 'leader':{const p=game.state.players[d.player];show({type:'inspect',cardId:d.kind==='god'?p.god.cardId:p.domainId,uid:d.kind==='god'?`god-${d.player}`:null});break;}
    case 'deck-details':show({type:'deck',deckId:d.deck});break;
    case 'pile':if(d.zone==='deck')show({type:'deck',deckId:game.state.players[d.player].deckId});else show({type:'pile',zone:d.zone,player:d.player});break;
    case 'help':case 'log':show({type:d.action});break;
    case 'pause':modal={type:'pause'};game.dispatch({type:'settings',settings:{paused:true}});break;
    case 'close-modal':close();break;
    case 'emote-menu':show({type:'emotes'});break;
    case 'emote':emote(d.emote);break;
    case 'leave':exit();break;
    case 'concede':send({type:'concede'});break;
    case 'collection-page':collectionPage=Math.max(0,collectionPage+Number(d.delta));render();break;
    case 'reload':location.reload();break;
  }
}
document.addEventListener('pointerdown',()=>unlock(),{once:true});
document.addEventListener('click',e=>{const n=e.target.closest('[data-command],[data-action]');if(n&&!n.disabled){sfx('click');handle(n);}});
document.addEventListener('contextmenu',e=>{const n=e.target.closest('.v2-game-card');if(n){e.preventDefault();show({type:'inspect',uid:n.dataset.uid});}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.setting){change({[t.dataset.setting]:t.type==='checkbox'?t.checked:t.value});return;}if(t.id==='setup-first')setup.first=t.value;if(t.id.startsWith('setup-deck-')){setup[t.id.endsWith('A')?'deckAId':'deckBId']=t.value;render();}if(t.id==='collection-type'){collectionType=t.value;collectionPage=0;render();}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.displayScale){settings[t.dataset.displayScale]=Number(t.value);scale();save();document.querySelector(`#scale-${t.dataset.displayScale}`).textContent=`${t.value}%`;requestAnimationFrame(drawLinks);}if(t.dataset.volume){settings[t.dataset.volume]=Number(t.value)/100;setVolume(t.dataset.volume,settings[t.dataset.volume]);save();document.querySelector(`#volume-${t.dataset.volume}`).textContent=`${t.value}%`;}if(t.id==='collection-search'){collectionQuery=t.value;collectionPage=0;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{render();document.querySelector('#collection-search')?.focus();},180);}});
document.addEventListener('keydown',e=>{
  const box=modalRoot.querySelector('[role="dialog"]');
  if(e.key==='Tab'&&box){const nodes=[...box.querySelectorAll('button:not(:disabled),input,select,a[href]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(e.key==='Escape'){if(modal)close();else if(game?.choice?.allowCancel)send({type:'cancel'});return;}
  if(e.target.matches('input,textarea,select,button,a'))return;
  if(e.key==='Enter'&&e.target.matches('[data-action="select"]')){e.preventDefault();handle(e.target);return;}
  if(screen==='title'&&(e.key==='Enter'||e.code==='Space')){screen='home';render();return;}
  if(game&&!modal&&!privacy&&!game.choice){if(e.code==='Space'){e.preventDefault();send({type:game.state.priority?'pass-priority':'pass'});}if(e.key.toLowerCase()==='f')change({fullControl:!settings.fullControl});}
});
function drawLinks(){const svg=document.querySelector('#target-lines');if(!svg||!game)return;const board=svg.parentElement,r=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);svg.innerHTML=game.state.links.map(l=>{const a=board.querySelector(`[data-uid="${l.a}"]`),b=board.querySelector(`[data-uid="${l.b}"]`);if(!a||!b)return '';const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),x1=x.left+x.width/2-r.left,y1=x.top+x.height/2-r.top,x2=y.left+y.width/2-r.left,y2=y.top+y.height/2-r.top;return `<path d="M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}"/>`;}).join('');}
window.addEventListener('resize',drawLinks);document.addEventListener('scroll',drawLinks,true);
// API somente por comandos; snapshots retornados pelo motor são cópias.
window.sstcg={get game(){return game;},get cards(){return structuredClone(cards);},get settings(){return {...settings};}};
init().catch(e=>{console.error(e);root.innerHTML=`<section class="loading-screen"><h1>The sanctuary is out of reach</h1><p>${escape(e.message)}</p><button data-action="reload">Try again</button></section>`;});
