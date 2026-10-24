// Motor 2.0 independente do DOM. As escolhas humanas e a apresentação não decidem regras.
import {isArmor,isEquipment,validateDeck} from '../shared/card-model.js?v=20261024-3';
const PLAYERS=['A','B'],other=k=>k==='A'?'B':'A';
const copy=value=>structuredClone(value);
const zones=['deck','hand','battlefield','cosmo_base','tartarus','void','stack'];
const targetId=t=>`${t.kind}:${t.playerKey}:${t.uid||''}`;
const emptyProgram=()=>({efeitos:[],gatilhos:[],passivas:[],habilidades:[]});

export function createGame({cards,beta,settings={},onChange=()=>{},onEvent=()=>{},random=Math.random,initialState=null}){
  // Observadores visuais recebem descritores, sem acesso mutável ao motor.
  function present(type, payload={}){try{onEvent(copy({type,...payload}));}catch{/* FX não interrompe uma regra. */}}
  const library=Array.isArray(cards)?cards:cards.cartas,byId=new Map(library.map(c=>[c.id,c]));
  const options={ai:true,autoPass:true,fullControl:false,aiSpeed:'normal',...settings};
  let state=initialState?copy(initialState):null,revision=0,sequence=0,choice=null,choiceHandler=null;
  let stack=[],triggers=[],rootAction=null,timer=null,disposed=false,resolving=false,afterEffects=null;
  const card=id=>byId.get(id);
  const program=c=>c?.motor||emptyProgram();
  const log=text=>{state.log.push(text);};
  const nextId=prefix=>`${prefix}-${++sequence}`;
  const player=key=>state.players[key];
  const leaders=()=>PLAYERS.flatMap(k=>[{kind:'god',playerKey:k,zone:'god',card:player(k).god,cardData:card(player(k).god.cardId)},{kind:'domain',playerKey:k,zone:'domain',card:player(k).domain,cardData:card(player(k).domainId)}]);
  const all=()=>[...PLAYERS.flatMap(k=>zones.flatMap(z=>player(k).zones[z].map(i=>({kind:'card',playerKey:k,zone:z,card:i,cardData:card(i.cardId)})))),...leaders()];
  const field=()=>PLAYERS.flatMap(k=>player(k).zones.battlefield.map(i=>({kind:'card',playerKey:k,zone:'battlefield',card:i,cardData:card(i.cardId)})));
  const locate=uid=>all().find(l=>l.card.uid===uid);
  const desc=l=>({kind:'card',playerKey:l.playerKey,uid:l.card.uid});
  const actor=()=>choice?.playerKey||state?.priority||state?.currentPlayer;
  // Rivalidade (guia §12): par persistente criado por um Strike entre Devotees em que ambos sobrevivem.
  const relation=uid=>state.rivals.filter(l=>l.a===uid||l.b===uid);
  const peer=(link,uid)=>link.a===uid?link.b:link.a;
  const isRival=(a,b)=>relation(a).some(link=>peer(link,a)===b);
  const godUid=key=>`god-${key}`;
  const attachments=uid=>field().filter(l=>l.card.attachedToUid===uid);
  const armor=uid=>attachments(uid).find(l=>isArmor(l.cardData));
  const named=c=>c?.personagem_unico&&c.personagem_id;
  const selfTarget=(uid,key)=>uid?.startsWith('god-')?{kind:'god',playerKey:uid.slice(4)}:{kind:'card',playerKey:locate(uid)?.playerKey||key,uid};
  function instance(id,key){return{uid:nextId('card'),cardId:id,owner:key,prepared:false,damage:0,stage:0,attachedToUid:null,awakened:false,struckRound:0,evolvedRound:0,returnedRound:0,enteredRound:0,modifiers:[],usedRound:{},usedGame:{}};}
  function shuffle(list){const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  const unlockedStages=l=>(l.cardData.estagios||[]).slice(0,(l.card.stage||0)+1).filter((s,index)=>!s.exclusivo_estagio||index===l.card.stage);
  function abilities(l){
    const list=[...(program(l.cardData).habilidades||[])];
    for(const stage of unlockedStages(l))list.push(...(stage.habilidades||[]));
    for(const resonance of l.cardData.ressonancias||[])if(locate(l.card.attachedToUid)?.cardData.personagem_id===resonance.personagem_id)list.push(...(resonance.habilidades||[]));
    if(l.card.awakened)list.push(...(l.cardData.despertar?.habilidades||[]));
    for(const e of attachments(l.card.uid))list.push(...(program(e.cardData).habilidades_portador||[]));
    return list.filter(a=>(a.zona||'battlefield')===l.zone);
  }
  function stats(uid,combat=null){
    const l=locate(typeof uid==='string'?uid:uid.uid);if(!l)return null;
    const c=l.cardData,i=l.card;let power=Number(c.power||0),maxHP=Number(c.vida??c.resistance??0);
    let keywords=[...(c.keywords_en||[])];
    if(l.zone==='tartarus'&&c.tipo==='Devotee')keywords.push('Afterlife');
    if(l.zone==='battlefield'){
      for(const m of i.modifiers||[]){power+=m.power||0;maxHP+=m.hp||0;if(m.keyword)keywords.push(m.keyword);}
      for(const e of attachments(i.uid)){
        const stage=e.cardData.estagios?.[e.card.stage||0];
        if(stage){power+=stage.bonus_poder||0;maxHP+=stage.bonus_vida||0;keywords.push(...unlockedStages(e).flatMap(s=>s.keywords_en||[]));}
      }
      if(player(l.playerKey).domainId==='athena-051'&&c.tipo==='Devotee')maxHP++;
      for(const source of field())for(const p of program(source.cardData).passivas||[]){
        if(source.playerKey===l.playerKey&&p.tipo==='aura_cloth'&&armor(i.uid)?.cardData.subtipos.includes('Cloth'))maxHP+=p.vida||0;
        if(source.playerKey===l.playerKey&&p.tipo==='aura_strike'&&combat?.uid===i.uid)power+=p.poder||0;
        if(source.playerKey!==l.playerKey&&p.tipo==='reduzir_rivais_marinas'&&relation(i.uid).some(link=>{const v=locate(peer(link,i.uid));return v?.playerKey===source.playerKey&&v.cardData.subtipos?.includes('Marina');}))power+=p.poder||0;
      }
      if(i.awakened){power+=c.despertar?.bonus_poder||0;maxHP+=c.despertar?.bonus_vida||0;keywords.push(...(c.despertar?.keywords_en||[]));}
      keywords=keywords.filter(k=>!i.modifiers.some(m=>m.removeKeyword===k));
    }
    return{power:Math.max(0,power),maxHP,hp:Math.max(0,maxHP-i.damage),damage:i.damage,keywords:[...new Set(keywords)],prepared:i.prepared,stage:i.stage||0};
  }
  const has=(uid,k)=>stats(uid)?.keywords.includes(k)||false;
  // Guarda (guia §§9–12, 19): o God é sempre alvo; um Devotee só quando aberto, Guardian ou Rival do atacante.
  function openTarget(uid,t){
    const l=locate(uid);if(l?.zone!=='battlefield'||l.cardData.tipo!=='Devotee')return false;
    if(t.kind==='god')return t.playerKey!==l.playerKey;
    const tl=locate(t.uid);if(tl?.zone!=='battlefield'||tl.cardData.tipo!=='Devotee'||tl.playerKey===l.playerKey)return false;
    return !tl.card.prepared||has(t.uid,'Guardian')||isRival(uid,t.uid);
  }
  function strikeTargets(uid){
    const l=locate(uid);if(!l)return [];
    const enemy=other(l.playerKey);
    const open=[{kind:'god',playerKey:enemy},...field().filter(v=>v.playerKey===enemy&&v.cardData.tipo==='Devotee').map(desc)].filter(t=>openTarget(uid,t));
    if(has(uid,'Nimble'))return open;
    // Enquanto houver Guardian alvejável, só Guardians e Rivals podem ser escolhidos.
    const guardians=open.filter(t=>t.kind==='card'&&has(t.uid,'Guardian'));
    return guardians.length?open.filter(t=>t.kind==='card'&&(has(t.uid,'Guardian')||isRival(uid,t.uid))):open;
  }
  const justEntered=l=>l.card.enteredRound===state.round&&!has(l.card.uid,'Impulse');
  const canStrike=(key,uid)=>{const l=locate(uid);return ordinary(key)&&l?.playerKey===key&&l.zone==='battlefield'&&l.cardData.tipo==='Devotee'&&l.card.prepared&&!has(uid,'Sealed')&&!justEntered(l)&&strikeTargets(uid).length>0;};
  function addRival(a,b){
    const la=locate(a),lb=locate(b);
    if(la?.zone!=='battlefield'||lb?.zone!=='battlefield'||la.playerKey===lb.playerKey||la.cardData.tipo!=='Devotee'||lb.cardData.tipo!=='Devotee'||isRival(a,b))return false;
    state.rivals.push({id:nextId('rival'),a,b});
    log(`${la.cardData.nome_exibicao_en} and ${lb.cardData.nome_exibicao_en} are now Rivals.`);
    present('combat:rivals',{uid:a,playerKey:la.playerKey,target:desc(lb)});return true;
  }
  function available(key,unit='cosmo'){
    const bases=player(key).zones.cosmo_base.filter(i=>i.prepared).length;
    return unit==='latent_cosmo'?player(key).latent:unit==='base_cosmo'?bases:bases+player(key).latent;
  }
  const matchType=(c,type)=>type==='Afterlife'?false:type==='Retorno'?program(c).efeitos?.some(e=>e.op==='retornar'):c.tipo===type||c.subtipos?.includes(type);
  function discounts(key,c,kind=null){
    const list=[];
    for(const d of player(key).discounts)if((kind&&d.type===kind)||matchType(c,d.type))list.push({n:d.n,discount:d});
    for(const l of field().filter(l=>l.playerKey===key))for(const [index,p] of (program(l.cardData).passivas||[]).entries()){
      if(p.tipo!=='desconto_primeiro'||l.card.usedRound[`discount-${index}`])continue;
      if(!((kind&&p.carta===kind)||(kind==='Afterlife'&&p.carta==='Retorno')||matchType(c,p.carta)))continue;
      if(p.faccao&&p.faccao!==c.faccao)continue;
      if(p.atacando&&!stack.some(s=>s.command?.type==='strike'&&s.playerKey===key))continue;
      list.push({n:p.n,source:l.card,index});
    }
    return list;
  }
  const cost=(key,c,kind=null,baseCost=c.custo||0)=>Math.max(0,baseCost-discounts(key,c,kind).reduce((n,d)=>n+d.n,0));
  function pay(key,amount,unit='cosmo',plan=null){
    if(amount<0||available(key,unit)<amount)return false;
    const latent=unit==='base_cosmo'?0:unit==='latent_cosmo'?amount:plan?.latent??Math.min(player(key).latent,amount);
    const bases=amount-latent,ready=player(key).zones.cosmo_base.filter(i=>i.prepared);
    if(!Number.isInteger(latent)||latent<0||latent>player(key).latent||bases>ready.length||unit==='latent_cosmo'&&bases)return false;
    player(key).latent-=latent;ready.slice(0,bases).forEach(i=>i.prepared=false);return true;
  }
  function consumeDiscounts(key,c,kind=null){
    const ds=discounts(key,c,kind);
    for(const d of ds)if(d.source)d.source.usedRound[`discount-${d.index}`]=1;
    player(key).discounts=player(key).discounts.filter(d=>!ds.some(x=>x.discount===d));
  }
  function ordinary(key){return state&&!state.victory&&!choice&&!resolving&&!stack.length&&!state.priority&&state.phase==='actions'&&state.currentPlayer===key;}
  function canPlay(key,uid){
    const l=locate(uid);if(!l||l.cardData.motor_revisao_pendente||l.playerKey!==key||l.zone!=='hand'||['God','Domain'].includes(l.cardData.tipo))return false;
    const response=state.priority===key&&l.cardData.tipo==='Technique'&&!choice;
    if(!ordinary(key)&&!response)return false;
    if(available(key,l.cardData.unidade_custo)<cost(key,l.cardData))return false;
    if(named(l.cardData)&&field().some(v=>v.playerKey===key&&named(v.cardData)===named(l.cardData)))return false;
    return targetsExist(program(l.cardData).efeitos||[],{playerKey:key,sourceUid:uid});
  }
  function canBase(key,uid){const l=locate(uid);return ordinary(key)&&!player(key).basePlaced&&l?.zone==='hand'&&l.playerKey===key&&l.cardData.cosmoble===true;}
  function targetOptions(selector,ctx){
    if(!selector||typeof selector==='string')return [];
    return all().filter(l=>{
      const i=l.card,c=l.cardData,st=stats(i.uid);
      if(selector.zona&&l.zone!==selector.zona)return false;
      if(selector.tipo&&c.tipo!==selector.tipo)return false;
      if(selector.equipamento&&!isEquipment(c))return false;
      if(selector.subtipo&&!c.subtipos?.includes(selector.subtipo))return false;
      if(selector.lado==='aliado'&&l.playerKey!==ctx.playerKey||selector.lado==='inimigo'&&l.playerKey===ctx.playerKey)return false;
      if(selector.outro&&i.uid===ctx.sourceUid||selector.prepared&&!i.prepared||selector.nao_strike&&i.struckRound===state.round)return false;
      if(selector.sem_portador&&i.attachedToUid||selector.custo_max!==undefined&&(c.custo||0)>selector.custo_max)return false;
      if(selector.dano_portador_min!==undefined&&(!i.attachedToUid||(locate(i.attachedToUid)?.card.damage||0)<selector.dano_portador_min))return false;
      if(selector.rival&&!relation(i.uid).length)return false;
      if(selector.zona==='battlefield'&&ctx.technique&&l.playerKey!==ctx.playerKey&&program(c).passivas?.some(p=>p.tipo==='protecao_technique'))return false;
      if(selector.zona==='cosmo_base'&&selector.preparada!==undefined&&i.prepared!==selector.preparada)return false;
      return Boolean(st);
    }).map(desc);
  }
  function targetsExist(effects,ctx){
    if(effects.some(e=>e.duracao==='strike')&&!stack.some(s=>s.command?.type==='strike'))return false;
    if(effects.some(e=>e.op==='redirecionar_strike')&&!stack.some(s=>s.command?.type==='strike'&&s.playerKey!==ctx.playerKey))return false;
    if(effects.some(e=>e.op==='rivalizar'&&e.com&&typeof e.com==='object'&&!targetOptions(e.com,ctx).length))return false;
    return effects.every(e=>!e.alvo||typeof e.alvo==='string'||e.max>1||effectTargets(e,ctx).length>0);
  }
  function effectTargets(e,ctx){return targetOptions(e.alvo,ctx).filter(t=>e.op!=='retornar'||canReturn(locate(t.uid)));}
  function ask(key,prompt,entries,handler,cancelable=false){
    if(!entries.length){handler(null);return;}
    choice={id:nextId('choice'),playerKey:key,prompt,options:entries,allowCancel:cancelable};choiceHandler=handler;
  }
  const targetLabel=t=>t.kind==='god'?`${card(player(t.playerKey).god.cardId)?.nome_exibicao_en} · ${t.playerKey}`:card(locate(t.uid)?.card.cardId)?.nome_exibicao_en||t.label||t.uid;
  function askTarget(key,prompt,list,handler,cancelable=false){ask(key,prompt,list.map(t=>({id:targetId(t),label:targetLabel(t),target:t})),entry=>handler(entry?.target||null),cancelable);}
  function bindEffects(effects,ctx,done,cancelable=false){
    const bound=copy(effects);let index=0;
    const next=()=>{
      if(index>=bound.length){done(bound);return;}
      const e=bound[index++];
      if(!e.alvo||typeof e.alvo==='string'||['preparar','esgotar'].includes(e.op)&&e.max>1){next();return;}
      const list=effectTargets(e,ctx);
      if(!list.length){e.semAlvo=true;next();return;}
      askTarget(e.escolhe==='oponente'?other(ctx.playerKey):ctx.playerKey,'Choose a target',list,t=>{if(!t){done(null);return;}e.alvoEscolhido=t;e.seletor=e.alvo;next();},cancelable);
    };next();
  }
  function resolveTarget(value,ctx){
    if(value==='self')return selfTarget(ctx.sourceUid,ctx.playerKey);
    if(value==='evento')return ctx.event?.target||selfTarget(ctx.event?.uid,ctx.event?.playerKey);
    if(value==='portador')return selfTarget(ctx.bearerUid||locate(ctx.sourceUid)?.card.attachedToUid,ctx.playerKey);
    if(value==='god_aliado')return{kind:'god',playerKey:ctx.playerKey};
    return value;
  }
  function modify(target,m){if(target?.kind==='card'){const l=locate(target.uid);if(l?.zone==='battlefield')l.card.modifiers.push(m);}}
  function move(uid,destination,ctx={}){
    const l=locate(uid);if(!l||['god','domain'].includes(l.zone))return null;
    const i=l.card,owner=i.owner||l.playerKey;
    if(l.zone==='battlefield'){
      state.rivals=state.rivals.filter(link=>link.a!==uid&&link.b!==uid);
      for(const a of attachments(uid)){a.card.attachedToUid=null;a.card.stage=0;}
      i.attachedToUid=null;i.stage=0;
    }
    player(l.playerKey).zones[l.zone]=player(l.playerKey).zones[l.zone].filter(v=>v.uid!==uid);
    const zone=destination==='deck_bottom'?'deck':destination;
    const newOwner=ctx.controller||owner;
    if(zone==='battlefield'){
      i.damage=0;i.awakened=false;i.modifiers=[];i.stage=0;i.attachedToUid=null;i.usedRound={};
    }
    if(zone==='deck'&&destination!=='deck_bottom')player(newOwner).zones[zone].unshift(i);else player(newOwner).zones[zone].push(i);
    if(zone==='battlefield'){
      // Guia §57: entra em guarda (Prepared), mas só declara Strike na rodada seguinte, salvo Impulse.
      i.prepared=card(i.cardId).tipo==='Devotee'?ctx.prepared!==false:Boolean(ctx.prepared);i.enteredRound=state.round;
      event('entrada',{uid,playerKey:newOwner,from:l.zone,target:selfTarget(uid,newOwner)});
      if(l.zone==='tartarus'){i.returnedRound=state.round;event('retorno',{uid,playerKey:newOwner,target:selfTarget(uid,newOwner)});}
    }
    if(zone==='tartarus'&&card(i.cardId).tipo==='Devotee')event('tartarus',{uid,playerKey:newOwner,target:selfTarget(uid,newOwner)});
    return i;
  }
  function draw(key,n){let missing=false;for(let k=0;k<n;k++){const i=player(key).zones.deck.shift();if(!i){missing=true;break;}player(key).zones.hand.push(i);}if(missing)player(key).deckFailed=true;}
  function settle(){
    let repeat=true,count=0;
    while(repeat&&++count<100){
      repeat=false;
      const deadUnits=field().filter(l=>l.cardData.tipo==='Devotee'&&stats(l.card.uid).maxHP<=l.card.damage);
      const snapshots=deadUnits.map(l=>({...l,card:copy(l.card),attached:attachments(l.card.uid).map(a=>a.card.uid),keywords:stats(l.card.uid).keywords}));
      for(const l of deadUnits)move(l.card.uid,'tartarus');
      for(const l of snapshots){
        log(`${l.cardData.nome_exibicao_en} is destroyed.`);
        event('destruido',{uid:l.card.uid,playerKey:l.playerKey,cardId:l.card.cardId,attached:l.attached,keywords:l.keywords,target:desc(l),deadSource:l});
        if(l.card.lastDamageBy){const killer=locate(l.card.lastDamageBy);if(killer)event('matou',{uid:killer.card.uid,playerKey:killer.playerKey,target:desc(killer),victim:l.card.uid});}
      }
      if(deadUnits.length)repeat=true;
      for(const link of [...state.rivals]){
        const a=locate(link.a),b=locate(link.b);
        if(a?.zone!=='battlefield'||b?.zone!=='battlefield'||a.playerKey===b.playerKey){state.rivals=state.rivals.filter(l=>l.id!==link.id);repeat=true;}
      }
    }
    const losers=PLAYERS.filter(k=>player(k).god.soul<=0||player(k).deckFailed);
    if(losers.length){state.victory={winnerKey:losers.length===2?null:other(losers[0]),loserKey:losers.length===2?null:losers[0],reason:losers.some(k=>player(k).deckFailed)?'deckout':'soul',draw:losers.length===2};stack=[];triggers=[];choice=null;state.priority=null;log(losers.length===2?'The duel is a draw.':`Player ${other(losers[0])} wins.`);}
  }
  function hit(target,n,ctx={},retaliation=false){
    if(!target||n<=0)return 0;
    const l=target.kind==='card'?locate(target.uid):null,i=l?.card;
    if(target.kind==='card'&&l?.zone!=='battlefield')return 0;
    let amount=n;
    if(i)for(const m of i.modifiers){if(!m.prevent||m.retaliation&&!retaliation)continue;const used=Math.min(amount,m.prevent);amount-=used;m.prevent-=used;}
    if(target.kind==='god'){
      const p=player(target.playerKey);const prevent=Math.min(p.god.prevent||0,amount);p.god.prevent=(p.god.prevent||0)-prevent;amount-=prevent;
      for(const source of field().filter(s=>s.playerKey===target.playerKey))for(const [index,passive] of (program(source.cardData).passivas||[]).entries())if(passive.tipo==='prevenir_god'&&!source.card.usedRound[`prevent-${index}`]&&amount>0){amount=Math.max(0,amount-passive.n);source.card.usedRound[`prevent-${index}`]=1;}
      p.god.soul-=amount;
    }else{
      i.damage+=amount;if(amount){i.lastDamageBy=ctx.sourceUid;event('dano_recebido',{uid:i.uid,playerKey:l.playerKey,target:desc(l),amount});}
      if(amount&&rootAction&&rootAction.playerKey!==l.playerKey&&ctx.playerKey!==l.playerKey&&!rootAction.latentRecipients.includes(l.playerKey)){
        player(l.playerKey).latent=Math.min(3,player(l.playerKey).latent+1);rootAction.latentRecipients.push(l.playerKey);
      }
    }
    if(amount)log(`${targetLabel(target)} takes ${amount} damage.`);return amount;
  }
  function event(name,ev){
    present('evento:'+name,{uid:ev.uid,playerKey:ev.playerKey,target:ev.target});
    const sources=[...field(),...leaders()];if(ev.deadSource&&!sources.some(s=>s.card.uid===ev.uid))sources.push(ev.deadSource);
    for(const source of sources){
      if(['inicio_rodada','fim_rodada'].includes(name)&&source.card.uid!==ev.uid)continue;
      const ps=[...(program(source.cardData).gatilhos||[]),...unlockedStages(source).flatMap(s=>s.gatilhos||[])];
      if(source.card.awakened)ps.push(...(source.cardData.despertar?.gatilhos||[]));
      for(const resonance of source.cardData.ressonancias||[]){const bearer=locate(source.card.attachedToUid);if(bearer?.cardData.personagem_id===resonance.personagem_id)ps.push(...(resonance.gatilhos||[]));}
      for(const [index,t] of ps.entries()){
        if(t.evento!==name)continue;
        const scope=t.escopo||'self',bearer=source.card.attachedToUid;
        if(scope==='self'&&source.card.uid!==ev.uid||scope==='aliado'&&source.playerKey!==ev.playerKey||scope==='inimigo'&&source.playerKey===ev.playerKey)continue;
        if(scope==='portador'&&bearer!==ev.uid&&!ev.attached?.includes(source.card.uid))continue;
        if(t.keyword&&!ev.keywords?.includes(t.keyword)||t.iniciador&&!ev.initiator||t.contra_god&&ev.target?.kind!=='god')continue;
        const eventCard=card(ev.cardId||locate(ev.uid)?.card.cardId);
        if(t.tipo&&eventCard?.tipo!==t.tipo||t.faccao&&eventCard?.faccao!==t.faccao)continue;
        const used=`trigger-${index}`;if(t.limite_rodada&&(source.card.usedRound[used]||0)>=t.limite_rodada)continue;
        source.card.usedRound[used]=(source.card.usedRound[used]||0)+1;
        triggers.push({kind:'effect',id:nextId('trigger'),playerKey:t.efeito_controlador_evento?ev.playerKey:source.playerKey,sourceUid:source.card.uid,cardId:source.cardData.id,label:source.cardData.nome_exibicao_en,efeitos:copy(t.efeitos),optional:t.opcional,context:{playerKey:t.efeito_controlador_evento?ev.playerKey:source.playerKey,sourceUid:source.card.uid,bearerUid:bearer||ev.uid,event:copy({...ev,deadSource:undefined}),strikeId:ev.strikeId}});
      }
    }
  }
  function runEffects(effects,ctx,done){
    let index=0;
    const next=()=>{
      if(state.victory||index>=effects.length){done();return;}
      const e=effects[index++],bound=e.alvoEscolhido;
      if(e.semAlvo){next();return;}
      if(bound&&e.seletor&&!targetOptions(e.seletor,ctx).some(t=>targetId(t)===targetId(bound))){next();return;}
      const target=bound||resolveTarget(e.alvo,ctx),l=target?.kind==='card'?locate(target.uid):null;
      present('efeito:'+e.op,{uid:ctx.sourceUid,playerKey:ctx.playerKey,target});
      const forKey=()=>e.alvo==='oponente'?other(ctx.playerKey):ctx.playerKey;
      const change=()=>next();
      if(e.op==='comprar'){for(const k of e.alvo==='ambos'?PLAYERS:[forKey()])draw(k,e.n);change();return;}
      if(e.op==='alma'){player(forKey()).god.soul+=e.n;change();return;}
      if(e.op==='curar'){if(l?.zone==='battlefield')l.card.damage=Math.max(0,l.card.damage-e.n);change();return;}
      if(e.op==='dano'){hit(target,e.n,ctx);change();return;}
      if(e.op==='atributo'){
        const recipients=e.alvo==='aliados'?field().filter(s=>s.playerKey===ctx.playerKey&&s.cardData.tipo==='Devotee').map(desc):[target];
        for(const t of recipients)modify(t,{power:e.poder||0,hp:e.vida||0,duration:e.duracao||'rodada',strikeId:ctx.strikeId||stack.find(s=>s.command?.type==='strike')?.id});
        change();return;
      }
      if(e.op==='keyword'||e.op==='remover_guardian'){
        modify(target,{[e.op==='keyword'?'keyword':'removeKeyword']:e.nome||'Guardian',duration:e.duracao||'rodada',strikeId:ctx.strikeId||stack.find(s=>s.command?.type==='strike')?.id});change();return;
      }
      if(e.op==='prevenir'){
        if(target?.kind==='god')player(target.playerKey).god.prevent=(player(target.playerKey).god.prevent||0)+e.n;
        else modify(target,{prevent:e.n,retaliation:e.retaliacao,duration:e.duracao||'rodada',strikeId:ctx.strikeId||stack.find(s=>s.command?.type==='strike')?.id});
        change();return;
      }
      if(e.op==='preparar'||e.op==='esgotar'){
        const prepare=e.op==='preparar';
        const apply=t=>{const v=locate(t.uid);if(!v)return;const was=v.card.prepared;v.card.prepared=prepare;if(was!==prepare)event(v.zone==='cosmo_base'&&prepare?'base_preparada':prepare?'preparou':'esgotou',{uid:v.card.uid,playerKey:v.playerKey,target:desc(v)});};
        if(bound){apply(bound);change();return;}
        if(target?.kind==='card'){apply(target);change();return;}
        const legal=targetOptions(e.alvo,ctx).filter(t=>locate(t.uid)?.card.prepared!==prepare);
        if(!legal.length){next();return;}
        let remaining=e.max||1;
        const choose=()=>{const candidates=targetOptions(e.alvo,ctx).filter(t=>locate(t.uid)?.card.prepared!==prepare);if(!remaining||!candidates.length){change();return;}ask(ctx.playerKey,'Choose a card to '+(prepare?'prepare':'exhaust'),[...candidates.map(t=>({id:targetId(t),label:targetLabel(t),target:t})),...(e.max>1?[{id:'done',label:'Done'}]:[])],v=>{if(v?.target){apply(v.target);remaining--;choose();}else change();});};choose();return;
      }
      if(e.op==='mover'){
        if(target?.uid){const was=locate(target.uid);if(e.destruicao&&was?.zone==='battlefield'){move(target.uid,e.destino);event('destruido',{uid:target.uid,playerKey:was.playerKey,cardId:was.cardData.id,target});}else move(target.uid,e.destino);}
        change();return;
      }
      if(e.op==='controlar'){
        if(l?.zone==='battlefield'&&l.cardData.tipo==='Devotee'){
          const to=e.controlador==='proprietario'?l.card.owner:ctx.playerKey,attached=attachments(l.card.uid);
          player(l.playerKey).zones.battlefield=player(l.playerKey).zones.battlefield.filter(i=>i.uid!==l.card.uid);player(to).zones.battlefield.push(l.card);l.card.prepared=false;
          for(const a of attached){
            if(e.equipamentos){player(a.playerKey).zones.battlefield=player(a.playerKey).zones.battlefield.filter(i=>i.uid!==a.card.uid);player(to).zones.battlefield.push(a.card);}
            else if(a.playerKey!==to){a.card.attachedToUid=null;a.card.stage=0;}
          }
        }next();return;
      }
      if(e.op==='retornar'){
        if(l?.zone==='tartarus'&&l.cardData.tipo==='Devotee'&&l.card.returnedRound!==state.round)move(l.card.uid,'battlefield');
        change();return;
      }
      if(e.op==='descartar'){
        let remaining=e.n,key=forKey();
        const discard=()=>{if(!remaining||!player(key).zones.hand.length){change();return;}askTarget(key,e.destino==='deck_bottom'?'Choose a card for the bottom of your deck':'Choose a card to discard',player(key).zones.hand.map(i=>selfTarget(i.uid,key)),t=>{if(t)move(t.uid,e.destino||'tartarus');remaining--;discard();});};discard();return;
      }
      if(e.op==='desconto'){player(ctx.playerKey).discounts.push({type:e.tipo,n:e.n});next();return;}
      if(e.op==='opcional'){
        const yes=available(ctx.playerKey)>=e.custo;
        ask(ctx.playerKey,`Pay ${e.custo} Cosmo for ${card(locate(ctx.sourceUid)?.card.cardId)?.nome_exibicao_en||'this ability'}?`,[{id:'no',label:'Decline'},...(yes?[{id:'yes',label:`Pay ${e.custo} Cosmo`}]:[])],answer=>{
          if(answer?.id==='yes'&&pay(ctx.playerKey,e.custo))bindEffects(e.efeitos,ctx,b=>b?runEffects(b,ctx,next):next());else next();
        });return;
      }
      if(e.op==='anular'){const id=ctx.event?.stackId;const canceled=stack.find(s=>s.id===id);if(canceled){canceled.canceled=true;log(`${canceled.label} is canceled.`);}next();return;}
      if(e.op==='olhar'){
        const key=ctx.playerKey,top=player(key).zones.deck.slice(0,e.n);if(!top.length){next();return;}
        const targets=top.map(i=>selfTarget(i.uid,key));
        if(e.modo==='espiar'||!e.modo){ask(key,'Top of your deck',targets.map(t=>({id:t.uid,label:targetLabel(t),target:t})),()=>next());return;}
        if(e.modo==='ordenar'){
          const remaining=[...targets],ordered=[];
          const select=()=>{if(!remaining.length){const ids=new Set(top.map(i=>i.uid));player(key).zones.deck=[...ordered.map(t=>top.find(i=>i.uid===t.uid)),...player(key).zones.deck.filter(i=>!ids.has(i.uid))];next();return;}askTarget(key,'Choose the next card from the top',remaining,t=>{ordered.push(t);remaining.splice(remaining.findIndex(r=>r.uid===t.uid),1);select();});};select();return;
        }
        const candidates=e.modo==='cosmoble'?targets.filter(t=>card(locate(t.uid)?.card.cardId).cosmoble):targets;
        const finish=t=>{
          const ids=new Set(top.map(i=>i.uid));player(key).zones.deck=player(key).zones.deck.filter(i=>!ids.has(i.uid));
          if(t){const selected=top.find(i=>i.uid===t.uid);if(e.modo==='top_bottom')player(key).zones.deck.unshift(selected);else player(key).zones.hand.push(selected);}
          player(key).zones.deck.push(...top.filter(i=>i.uid!==t?.uid));next();
        };
        if(!candidates.length){finish(null);return;}
        askTarget(key,e.modo==='top_bottom'?'Choose the card to keep on top':'Choose a card for your hand',candidates,finish);return;
      }
      if(e.op==='base_extra'){
        const candidates=player(ctx.playerKey).zones.hand.filter(i=>card(i.cardId).cosmoble).map(i=>selfTarget(i.uid,ctx.playerKey));
        if(!candidates.length){next();return;}
        const entries=candidates.map(t=>({id:t.uid,label:targetLabel(t),target:t}));if(e.opcional)entries.push({id:'no',label:'Decline'});
        ask(ctx.playerKey,'Place an additional exhausted Cosmo Base',entries,v=>{if(v?.target){const i=move(v.target.uid,'cosmo_base');i.prepared=false;event('base_colocada',{uid:i.uid,playerKey:ctx.playerKey,target:selfTarget(i.uid,ctx.playerKey)});}next();});return;
      }
      if(e.op==='mover_dano'){
        askTarget(ctx.playerKey,'Choose where to remove 1 damage',targetOptions(e.origem,ctx).filter(t=>locate(t.uid).card.damage>0),from=>{
          if(!from){next();return;}askTarget(ctx.playerKey,'Choose where to move the damage',targetOptions(e.destino,ctx),to=>{if(to){const origin=locate(from.uid);if(origin?.card.damage){origin.card.damage--;hit(to,1,ctx);}}change();});
        });return;
      }
      if(e.op==='rivalizar'){
        // Um Devotee inimigo escolhido e um aliado (a própria carta ou outro escolhido) tornam-se Rivals.
        const enemy=bound||target;if(!enemy?.uid||locate(enemy.uid)?.zone!=='battlefield'){next();return;}
        if(e.com==='self'){addRival(ctx.sourceUid,enemy.uid);change();return;}
        const allies=targetOptions(e.com,ctx).filter(t=>!isRival(t.uid,enemy.uid));
        askTarget(ctx.playerKey,'Choose a friendly Devotee to become its Rival',allies,t=>{if(t)addRival(t.uid,enemy.uid);change();});return;
      }
      if(e.op==='encerrar_rivalidade'){
        const selected=bound||target;if(!selected?.uid){next();return;}
        const links=relation(selected.uid);if(!links.length){next();return;}
        const end=link=>{if(link){state.rivals=state.rivals.filter(v=>v.id!==link.id);log(`The Rivalry between ${targetLabel(selfTarget(link.a))} and ${targetLabel(selfTarget(link.b))} ends.`);}change();};
        if(links.length===1){end(links[0]);return;}
        ask(ctx.playerKey,'Choose a Rivalry to end',links.map(link=>({id:link.id,label:targetLabel(selfTarget(peer(link,selected.uid))),link})),v=>end(v?.link));return;
      }
      if(e.op==='redirecionar_strike'){
        const item=[...stack].reverse().find(s=>s.command?.type==='strike'&&s.playerKey!==ctx.playerKey);
        if(!item){next();return;}
        const current=targetId(item.command.target),options=[{kind:'god',playerKey:other(item.playerKey)},...field().filter(v=>v.playerKey!==item.playerKey&&v.cardData.tipo==='Devotee').map(desc)].filter(t=>targetId(t)!==current&&openTarget(item.command.uid,t));
        askTarget(ctx.playerKey,'Choose the new target of that Strike',options,t=>{if(t){item.command.target=t;log(`The Strike is redirected to ${targetLabel(t)}.`);}change();});return;
      }
      if(e.op==='dano_area'){
        const recipients=field().filter(v=>v.cardData.tipo==='Devotee'&&(e.alvo==='esgotados'?!v.card.prepared:v.playerKey!==ctx.playerKey));
        for(const v of recipients)hit(desc(v),e.n,ctx);change();return;
      }
      if(e.op==='dano_rivais'){
        const selected=bound||target;if(!selected?.uid||locate(selected.uid)?.zone!=='battlefield'){next();return;}
        const recipients=[selected.uid,...relation(selected.uid).map(link=>peer(link,selected.uid))];
        for(const uid of recipients)hit(selfTarget(uid),e.n,ctx);change();return;
      }
      throw new Error(`Unsupported operation: ${e.op}`);
    };next();
  }
  function flushTriggers(done){
    if(state.victory){done();return;}
    const reference=rootAction?.playerKey||state.initiative;
    triggers.sort((a,b)=>(a.playerKey===reference?0:1)-(b.playerKey===reference?0:1));
    const next=()=>{
      if(!triggers.length){done();return;}
      const owner=triggers[0].playerKey,simultaneous=triggers.filter(t=>t.playerKey===owner);
      const put=item=>{
        triggers=triggers.filter(t=>t.id!==item.id);
        const enqueue=()=>bindEffects(item.efeitos,item.context,b=>{if(b){item.efeitos=b;stack.push(item);}next();});
        if(item.optional)ask(item.playerKey,`Use ${item.label}?`,[{id:'yes',label:'Use ability'},{id:'no',label:'Decline'}],v=>v?.id==='yes'?enqueue():next());else enqueue();
      };
      if(simultaneous.length>1)ask(owner,'Choose the next triggered ability to put on the stack',simultaneous.map(t=>({id:t.id,label:t.label})),v=>put(simultaneous.find(t=>t.id===v.id)));
      else put(simultaneous[0]);
    };next();
  }
  function openPriority(first){state.priority=stack.length?first:null;state.priorityPasses=0;}
  function finishAction(){
    if(state.victory)return;
    const action=rootAction;
    if(action){
      for(const l of all())l.card.modifiers=l.card.modifiers.filter(m=>m.duration!=='strike'||m.strikeId!==action.id);
    }
    state.priority=null;resolving=false;settle();
    // Expirar um bônus de HP pode destruir uma unidade e criar novas habilidades.
    enforceUniqueness(()=>flushTriggers(()=>{
      if(state.victory)return;
      if(stack.length){openPriority(action?.playerKey||state.initiative);notify();return;}
      if(action){state.currentPlayer=other(action.playerKey);rootAction=null;state.passes=0;}
    }));
  }
  function afterResolution(){
    settle();enforceUniqueness(()=>flushTriggers(()=>{
      if(stack.length)openPriority(state.currentPlayer);
      else if(afterEffects){const done=afterEffects;afterEffects=null;done();}
      else finishAction();
      notify();
    }));
  }
  function enforceUniqueness(done){
    const duplicate=field().find(l=>named(l.cardData)&&field().filter(v=>v.playerKey===l.playerKey&&named(v.cardData)===named(l.cardData)).length>1);
    if(!duplicate){done();return;}
    const copies=field().filter(v=>v.playerKey===duplicate.playerKey&&named(v.cardData)===named(duplicate.cardData));
    ask(duplicate.playerKey,'Choose which version of this character to keep',copies.map(l=>({id:l.card.uid,label:l.cardData.nome_exibicao_en,uid:l.card.uid})),v=>{
      for(const l of copies)if(l.card.uid!==v.uid)move(l.card.uid,'tartarus');
      enforceUniqueness(done);
    });
  }
  function resolveTop(){
    const item=stack.pop();if(!item)return;
    state.priority=null;resolving=true;
    const done=()=>{resolving=false;afterResolution();};
    if(item.canceled){if(item.command?.type==='play'){const l=locate(item.command.uid);if(l?.zone==='stack')move(l.card.uid,'tartarus');else if(l?.zone==='hand')move(l.card.uid,'tartarus');}done();return;}
    log(`${item.label} resolves.`);
    if(item.kind==='effect')runEffects(item.efeitos,item.context,done);else resolveCommand(item,done);
  }
  function declare(command,label,ctx={}){
    const first=!rootAction;
    const item={id:nextId('action'),kind:'command',command:copy(command),playerKey:command.playerKey,label,cardId:ctx.cardId||locate(command.uid)?.card.cardId,context:ctx};
    if(first){rootAction={id:item.id,playerKey:command.playerKey,latentRecipients:[]};state.passes=0;}
    stack.push(item);
    if(command.type==='strike'){
      const l=locate(command.uid);l.card.prepared=false;l.card.struckRound=state.round;
      event('strike_declarado',{uid:l.card.uid,playerKey:l.playerKey,target:command.target,initiator:true,strikeId:item.id});
      event('esgotou',{uid:l.card.uid,playerKey:l.playerKey,target:desc(l)});
    }
    if(command.type==='play'&&card(item.cardId)?.tipo==='Technique'){
      for(const e of command.effects||[])if(e.alvoEscolhido?.kind==='card')event('alvo_technique',{uid:e.alvoEscolhido.uid,playerKey:e.alvoEscolhido.playerKey,target:e.alvoEscolhido,stackId:item.id});
    }
    log(`Player ${command.playerKey}: ${label}.`);
    flushTriggers(()=>{openPriority(other(command.playerKey));notify();});
  }
  function canReturn(l){return l.zone==='tartarus'&&l.cardData.tipo==='Devotee'&&l.card.returnedRound!==state.round;}
  function choosePayment(key,amount,unit,done){
    if(available(key,unit)<amount){done(false);return;}
    if(!options.fullControl||unit!=='cosmo'){done(pay(key,amount,unit));return;}
    const plans=[];for(let latent=0;latent<=Math.min(player(key).latent,amount);latent++)if(amount-latent<=player(key).zones.cosmo_base.filter(i=>i.prepared).length)plans.push({id:String(latent),label:`${amount-latent} Base + ${latent} Latent`,latent});
    if(plans.length===1){done(pay(key,amount,unit,plans[0]));return;}
    ask(key,'Choose payment',plans,v=>done(Boolean(v)&&pay(key,amount,unit,v)),true);
  }
  function requestCommand(command){
    const key=command.playerKey,l=locate(command.uid),c=l?.cardData;
    if(command.type==='play'){
      if(!canPlay(key,command.uid))return false;
      const ctx={playerKey:key,sourceUid:command.uid,technique:c.tipo==='Technique',cardId:c.id};
      const proceed=()=>bindEffects(program(c).efeitos||[],ctx,effects=>{
        if(!effects){notify();return;}
        const amount=cost(key,c)+(command.equipTo?(c.equipar_custo??1):0);
        choosePayment(key,amount,c.unidade_custo||'cosmo',paid=>{
          if(!paid){notify();return;}consumeDiscounts(key,c);command.effects=effects;
          move(command.uid,'stack');declare(command,`Play ${c.nome_exibicao_en}`,ctx);
        });
      },true);
      if(isEquipment(c)&&!('equipTo'in command)){
        const choices=[{id:'none',label:'Play without bearer'}];
        if(available(key,c.unidade_custo)>=cost(key,c)+(c.equipar_custo??1))for(const bearer of field().filter(v=>v.playerKey===key&&v.cardData.tipo==='Devotee'))choices.push({id:bearer.card.uid,label:`Equip ${bearer.cardData.nome_exibicao_en}`,uid:bearer.card.uid});
        ask(key,'How should this equipment enter?',choices,v=>{if(!v){notify();return;}command.equipTo=v.uid||null;proceed();},true);
      }else proceed();return true;
    }
    if(!ordinary(key)&&!(command.type==='ability'&&state.priority===key))return false;
    if(command.type==='base'){
      if(!canBase(key,command.uid))return false;
      const i=move(command.uid,'cosmo_base');i.prepared=true;player(key).basePlaced=true;state.passes=0;
      log(`Player ${key} places a Cosmo Base.`);event('base_colocada',{uid:i.uid,playerKey:key,target:selfTarget(i.uid,key)});
      flushTriggers(()=>{if(stack.length){afterEffects=()=>{};openPriority(other(key));}notify();});return true;
    }
    if(!l||l.playerKey!==key)return false;
    if(command.type==='strike'){
      // Guia §§11 e 20: Strike escolhe o alvo na declaração; Guardian restringe as escolhas.
      if(!canStrike(key,l.card.uid))return false;
      if(command.target&&!strikeTargets(command.uid).some(v=>targetId(v)===targetId(command.target)))return false;
      const finish=t=>{
        if(!t||!strikeTargets(command.uid).some(v=>targetId(v)===targetId(t))){notify();return;}
        command.target=t.kind==='god'?{kind:'god',playerKey:t.playerKey}:desc(locate(t.uid));
        const go=()=>declare(command,`Strike: ${c.nome_exibicao_en} → ${targetLabel(command.target)}`);
        if(has(command.uid,'Unfaith')&&command.target.kind==='god'&&!command.mode)ask(key,'Choose Strike mode',[{id:'soul',label:'Damage Soul'},{id:'unfaith',label:'Unfaith: remove up to 2 Latent'}],v=>{if(!v){notify();return;}command.mode=v.id;go();},true);else go();
      };
      if(command.target)finish(command.target);else askTarget(key,'Choose a Strike target',strikeTargets(command.uid),finish,true);
      return true;
    }
    if(command.type==='equip'||command.type==='unequip'){
      if(l.zone!=='battlefield'||!isEquipment(c))return false;
      if(command.type==='unequip'){
        if(!l.card.attachedToUid)return false;declare(command,`Unequip ${c.nome_exibicao_en}`);return true;
      }
      const amount=c.equipar_custo??1;if(available(key)<amount)return false;
      const finish=t=>{const bearer=locate(t?.uid);if(!bearer||bearer.playerKey!==key||bearer.zone!=='battlefield'||bearer.cardData.tipo!=='Devotee'||t.uid===l.card.attachedToUid){notify();return;}choosePayment(key,amount,'cosmo',paid=>{if(paid){command.target=t;declare(command,`Equip ${c.nome_exibicao_en}`);}else notify();});};
      if(command.target)finish(command.target);else askTarget(key,'Choose a bearer',field().filter(v=>v.playerKey===key&&v.cardData.tipo==='Devotee'&&v.card.uid!==l.card.attachedToUid).map(desc),finish,true);return true;
    }
    if(command.type==='evolve'){
      const bearer=locate(l.card.attachedToUid),next=c.estagios?.[l.card.stage+1];
      if(l.zone!=='battlefield'||!next||!bearer||!c.donos?.includes(bearer.cardData.personagem_id)||l.card.evolvedRound===state.round||available(key)<(next.custo||0)||next.exige_awaken&&!bearer.card.awakened)return false;
      choosePayment(key,next.custo||0,'cosmo',paid=>{if(paid){command.bearerUid=bearer.card.uid;command.stage=l.card.stage+1;declare(command,`Evolve ${c.nome_exibicao_en}: ${next.nome}`);}else notify();});return true;
    }
    if(command.type==='awaken'){
      const awakening=c.despertar;if(l.zone!=='battlefield'||c.tipo!=='Devotee'||!awakening||l.card.awakened||has(command.uid,'Sealed')||available(key)<(awakening.custo||0))return false;
      choosePayment(key,awakening.custo||0,'cosmo',paid=>{if(paid)declare(command,`Awaken ${c.nome_exibicao_en}`);else notify();});return true;
    }
    if(command.type==='ability'||command.type==='ultimate'){
      const a=command.type==='ultimate'?c.ultimate:abilities(l).find(a=>a.id===command.abilityId);
      if(!ordinary(key)&&!a?.resposta)return false;
      const ultimateId=c.personagem_id||c.identidade_carta||c.id;
      if(!a||l.zone==='battlefield'&&has(command.uid,'Sealed')||a.limite_rodada&&(l.card.usedRound[`ability-${a.id}`]||0)>=a.limite_rodada||a.limite_partida&&(l.card.usedGame[`ability-${a.id}`]||0)>=a.limite_partida||command.type==='ultimate'&&player(key).ultimatesUsed.includes(ultimateId)||a.exige_awaken&&!l.card.awakened)return false;
      if(a.zona==='tartarus'&&a.efeitos.some(e=>e.op==='retornar')&&!canReturn(l))return false;
      const kind=a.zona==='tartarus'?'Afterlife':null,amount=cost(key,c,kind,a.custo||0);
      if(available(key,a.unidade_custo)<amount||a.exige_prepared&&!l.card.prepared)return false;
      const ctx={playerKey:key,sourceUid:command.uid};
      bindEffects(a.efeitos||[],ctx,b=>{
        if(!b){notify();return;}choosePayment(key,amount,a.unidade_custo||'cosmo',paid=>{
          if(!paid){notify();return;}consumeDiscounts(key,c,kind);l.card.usedRound[`ability-${a.id}`]=(l.card.usedRound[`ability-${a.id}`]||0)+1;l.card.usedGame[`ability-${a.id}`]=(l.card.usedGame[`ability-${a.id}`]||0)+1;
          if(a.exige_prepared)l.card.prepared=false;
          if(command.type==='ultimate')player(key).ultimatesUsed.push(ultimateId);
          command.effects=b;declare(command,a.nome_en||command.type,ctx);
        });
      },true);return true;
    }
    return false;
  }
  function attach(equipmentUid,bearerUid){
    const e=locate(equipmentUid),b=locate(bearerUid);if(e?.zone!=='battlefield'||b?.zone!=='battlefield'||e.playerKey!==b.playerKey||b.cardData.tipo!=='Devotee')return false;
    if(isArmor(e.cardData)){const previous=armor(bearerUid);if(previous&&previous.card.uid!==equipmentUid){previous.card.attachedToUid=null;previous.card.stage=0;}}
    if(e.card.attachedToUid!==bearerUid)e.card.stage=0;e.card.attachedToUid=bearerUid;return true;
  }
  function strike(item,done){
    const cmd=item.command,a=locate(cmd.uid),target=cmd.target;
    // Guia §58: o alvo é conferido de novo; Guardian já foi aplicado na declaração.
    if(a?.zone!=='battlefield'||!openTarget(a.card.uid,target)){if(a)log(`${a.cardData.nome_exibicao_en}'s Strike finds no opening.`);done();return;}
    const b=target.kind==='card'?locate(target.uid):null;
    const ac={playerKey:a.playerKey,sourceUid:a.card.uid,strikeId:item.id},bc={playerKey:target.playerKey,sourceUid:b?.card.uid||godUid(target.playerKey),strikeId:item.id};
    const as=stats(a.card.uid,{uid:a.card.uid}),bs=b?stats(b.card.uid):null;
    const offense=()=>{
      if(cmd.mode==='unfaith'&&target.kind==='god'){player(target.playerKey).latent=Math.max(0,player(target.playerKey).latent-2);return;}
      const before=bs?.hp||0,amount=hit(target,as.power,ac);
      if(b&&has(a.card.uid,'Pierce')&&amount>before)hit({kind:'god',playerKey:b.playerKey},amount-before,ac);
    };
    const retaliation=()=>hit(desc(a),b?bs.power:player(target.playerKey).god.attack,bc,true);
    const ranged=as.keywords.includes('Long Range')&&!bs?.keywords.includes('Cheater');
    if(ranged){offense();settle();if(!state.victory&&(!b||locate(b.card.uid)?.zone==='battlefield'))retaliation();}
    else{offense();retaliation();}
    settle();
    if(!state.victory&&b&&locate(a.card.uid)?.zone==='battlefield'&&locate(b.card.uid)?.zone==='battlefield')addRival(a.card.uid,b.card.uid);
    if(!state.victory){
      event('strike_fim',{uid:a.card.uid,playerKey:a.playerKey,target,initiator:true,strikeId:item.id});
      for(const v of [a,b].filter(Boolean))if(locate(v.card.uid)?.zone==='battlefield')event('strike_sobreviveu',{uid:v.card.uid,playerKey:v.playerKey,target:desc(v),strikeId:item.id});
      present('attack',{attacker:desc(a),uid:a.card.uid,target});
    }
    done();
  }
  function resolveCommand(item,done){
    const cmd=item.command,l=locate(cmd.uid),c=l?.cardData;
    present('resolucao:'+cmd.type,{uid:cmd.uid,playerKey:item.playerKey,target:cmd.target||(cmd.bearerUid?selfTarget(cmd.bearerUid,item.playerKey):null)});
    if(cmd.type==='play'){
      if(!l||l.zone!=='stack'){done();return;}
      if(['Devotee','Equipment','Support','Relic'].includes(c.tipo)){
        move(cmd.uid,'battlefield');if(cmd.equipTo)attach(cmd.uid,cmd.equipTo);
        event('jogar',{uid:cmd.uid,playerKey:item.playerKey,cardId:c.id,target:selfTarget(cmd.uid,item.playerKey)});done();
      }else{
        const effects=cmd.effects||[],targets=effects.filter(e=>e.alvoEscolhido);
        const alive=targets.some(e=>!e.seletor||targetOptions(e.seletor,item.context).some(t=>targetId(t)===targetId(e.alvoEscolhido)));
        if(targets.length&&!alive){move(cmd.uid,'tartarus');done();return;}
        runEffects(effects,{...item.context,strikeId:stack.find(s=>s.command?.type==='strike')?.id},()=>{move(cmd.uid,'tartarus');event('jogar',{uid:cmd.uid,playerKey:item.playerKey,cardId:c.id});done();});
      }return;
    }
    if(cmd.type==='strike'){strike(item,done);return;}
    if(cmd.type==='equip'){attach(cmd.uid,cmd.target.uid);done();return;}
    if(cmd.type==='unequip'){if(l?.zone==='battlefield'){l.card.attachedToUid=null;l.card.stage=0;}done();return;}
    if(cmd.type==='evolve'){
      const b=locate(cmd.bearerUid);
      if(l?.zone==='battlefield'&&l.card.attachedToUid===cmd.bearerUid&&b&&c.donos.includes(b.cardData.personagem_id)&&cmd.stage===l.card.stage+1&&l.card.evolvedRound!==state.round){l.card.stage=cmd.stage;l.card.evolvedRound=state.round;event('evoluiu',{uid:cmd.uid,playerKey:l.playerKey,target:desc(l)});}done();return;
    }
    if(cmd.type==='awaken'){if(l?.zone==='battlefield')l.card.awakened=true;done();return;}
    if(cmd.type==='ability'||cmd.type==='ultimate'){runEffects(cmd.effects||[],{...item.context,strikeId:stack.find(s=>s.command?.type==='strike')?.id},done);return;}
    done();
  }
  function beginRound(first=false){
    state.phase='actions';state.currentPhase='actions';state.passes=0;state.currentPlayer=state.initiative;state.turnNumber=state.round;
    for(const key of PLAYERS){
      const p=player(key);p.basePlaced=false;p.discounts=[];
      for(const l of [...Object.values(p.zones).flat(),p.god,p.domain]){l.usedRound={};}
      for(const l of [...p.zones.battlefield,...p.zones.cosmo_base,p.god,p.domain])l.prepared=true;
      if(!first)draw(key,2);
      if(p.domainId==='athena-052')p.latent=Math.min(3,p.latent+1);
    }
    log(`Round ${state.round}. Player ${state.initiative} has initiative.`);settle();
    if(!state.victory){for(const source of [...field(),...leaders()])event('inicio_rodada',{uid:source.card.uid,playerKey:source.playerKey,target:selfTarget(source.card.uid,source.playerKey)});flushTriggers(()=>{if(stack.length){afterEffects=()=>{};openPriority(state.initiative);}notify();});}
  }
  function roundWindow(done){
    settle();enforceUniqueness(()=>flushTriggers(()=>{if(state.victory)return;if(stack.length){afterEffects=done;openPriority(state.initiative);}else done();notify();}));
  }
  function endRound(){
    state.phase='end';state.currentPhase='end';
    for(const source of [...field(),...leaders()])event('fim_rodada',{uid:source.card.uid,playerKey:source.playerKey,target:selfTarget(source.card.uid,source.playerKey)});
    roundWindow(()=>{
      for(const l of all())l.card.modifiers=l.card.modifiers.filter(m=>m.duration!=='rodada'&&m.duration!=='strike');
      roundWindow(()=>{
        for(const key of PLAYERS){player(key).latent=0;player(key).god.prevent=0;}
        state.round++;state.initiative=other(state.initiative);beginRound();
      });
    });
  }
  function start(config){
    const defs={};for(const key of PLAYERS){const id=key==='A'?config.deckAId:config.deckBId;defs[key]=(beta?.decks||[]).find(d=>d.id===id)||config.decks?.[key];if(!defs[key])throw new Error('Deck not found');const errors=validateDeck(defs[key],library);if(errors.length)throw new Error(errors.join('; '));}
    sequence=0;stack=[];triggers=[];rootAction=null;choice=null;resolving=false;afterEffects=null;
    const first=['A','B'].includes(config.startingPlayer)?config.startingPlayer:random()<.5?'A':'B';
    state={rulesVersion:'2.0',round:1,turnNumber:1,phase:'mulligan',currentPhase:'setup',initiative:first,currentPlayer:first,priority:null,priorityPasses:0,passes:0,rivals:[],players:{},log:[],victory:null};
    for(const key of PLAYERS){const d=defs[key],g=card(d.god_id);state.players[key]={key,deckId:d.id,domainId:d.domain_id,god:{...instance(g.id,key),uid:godUid(key),prepared:true,soul:g.soul??30,attack:g.attack??3,prevent:0},domain:{...instance(d.domain_id,key),uid:`domain-${key}`,prepared:true},zones:Object.fromEntries(zones.map(z=>[z,[]])),latent:0,basePlaced:false,discounts:[],ultimatesUsed:[],deckFailed:false};const p=player(key);p.zones.deck=shuffle(d.main_deck.flatMap(e=>Array.from({length:e.quantity},()=>instance(e.card_id,key))));draw(key,7);}
    options.ai=config.ai??options.ai;
    const mulligan=key=>ask(key,'Choose your opening hand', [{id:'keep',label:'Keep hand'},{id:'exchange',label:'Choose cards to exchange'}],v=>{
      const advance=()=>key==='A'?mulligan('B'):(beginRound(true),notify());
      if(v?.id!=='exchange'){advance();return;}
      const selected=[];
      const choose=()=>ask(key,'Select cards to exchange, then confirm',[{id:'done',label:`Exchange ${selected.length} cards`},...player(key).zones.hand.filter(i=>!selected.includes(i.uid)).map(i=>({id:i.uid,label:card(i.cardId).nome_exibicao_en,uid:i.uid}))],answer=>{
        if(answer?.id==='done'){
          const returned=player(key).zones.hand.filter(i=>selected.includes(i.uid));player(key).zones.hand=player(key).zones.hand.filter(i=>!selected.includes(i.uid));draw(key,returned.length);player(key).zones.deck=shuffle([...player(key).zones.deck,...returned]);advance();
        }else if(answer?.uid){selected.push(answer.uid);choose();}
      });choose();
    });
    if(['A','B'].includes(config.startingPlayer))mulligan('A');
    else ask(first,'Choose opening initiative',[{id:'A',label:'Player A begins'},{id:'B',label:'Player B begins'}],v=>{state.initiative=v.id;state.currentPlayer=v.id;mulligan('A');});
    notify();
  }
  function passPriority(key){
    if(state.priority!==key)return false;
    state.priorityPasses++;if(state.priorityPasses>=2)resolveTop();else state.priority=other(key);return true;
  }
  function performCommand(command){
    if(!command||typeof command.type!=='string'||command.expectedRevision!==undefined&&command.expectedRevision!==revision)return false;
    if(command.type==='settings'){Object.assign(options,command.settings);notify();return true;}
    if(command.type==='start'){start(command);return true;}
    if(!state||state.victory||options.paused)return false;
    const key=command.playerKey||actor();if(!PLAYERS.includes(key)||key!==actor())return false;
    command={...command,playerKey:key};
    if(command.type==='concede'){state.victory={winnerKey:other(key),loserKey:key,reason:'concede',draw:false};notify();return true;}
    if(choice){
      if(command.type==='cancel'&&choice.allowCancel){choice=null;choiceHandler=null;notify();return true;}
      if(command.type!=='choose')return false;
      const entry=choice.options.find(v=>v.id===command.optionId);if(!entry)return false;
      const callback=choiceHandler;choice=null;choiceHandler=null;callback(entry);notify();return true;
    }
    if(command.type==='pass-priority'){const result=passPriority(key);if(result)notify();return result;}
    if(command.type==='pass'){
      if(!ordinary(key))return false;state.passes++;log(`Player ${key} passes.`);
      if(state.passes===2)endRound();else state.currentPlayer=other(key);notify();return true;
    }
    const result=requestCommand(command);if(result)notify();return result;
  }
  function perform(command){
    const playerKey=command?.playerKey||actor();
    const result=performCommand(command);
    if(result&&!['settings','start'].includes(command.type))present('acao:'+command.type,{uid:command.uid,playerKey,target:command.target});
    return result;
  }
  function actions(key,uid){
    const l=locate(uid);if(!l||l.playerKey!==key||key!==actor()||choice)return [];
    const result=[];
    if(l.zone==='hand'){
      if(canPlay(key,uid))result.push({type:'play',uid,label:`Play · ${cost(key,l.cardData)}`});
      if(canBase(key,uid))result.push({type:'base',uid,label:'Cosmo Base'});return result;
    }
    const ordinaryAction=ordinary(key);
    if(!ordinaryAction&&state.priority!==key)return result;
    if(ordinaryAction&&l.zone==='battlefield'&&l.cardData.tipo==='Devotee'){
      if(canStrike(key,uid))result.push({type:'strike',uid,label:'Strike'});
      if(l.cardData.despertar&&!l.card.awakened&&!has(uid,'Sealed')&&available(key)>=l.cardData.despertar.custo)result.push({type:'awaken',uid,label:'Awaken'});
    }
    if(ordinaryAction&&l.zone==='battlefield'&&isEquipment(l.cardData)){
      if(available(key)>=(l.cardData.equipar_custo??1)&&field().some(v=>v.playerKey===key&&v.cardData.tipo==='Devotee'&&v.card.uid!==l.card.attachedToUid))result.push({type:'equip',uid,label:`Equip · ${l.cardData.equipar_custo??1}`});
      if(l.card.attachedToUid)result.push({type:'unequip',uid,label:'Unequip'});
      const next=l.cardData.estagios?.[l.card.stage+1],bearer=locate(l.card.attachedToUid);
      if(next&&l.card.evolvedRound!==state.round&&l.cardData.donos.includes(bearer?.cardData.personagem_id)&&available(key)>=(next.custo||0))result.push({type:'evolve',uid,label:`Evolve: ${next.nome} · ${next.custo}`});
    }
    if(!has(uid,'Sealed'))for(const a of abilities(l))if((ordinaryAction||a.resposta)&&(!a.exige_prepared||l.card.prepared)&&targetsExist(a.efeitos||[],{playerKey:key,sourceUid:uid})&&(!a.limite_rodada||(l.card.usedRound[`ability-${a.id}`]||0)<a.limite_rodada)&&(!a.limite_partida||(l.card.usedGame[`ability-${a.id}`]||0)<a.limite_partida)&&available(key,a.unidade_custo)>=cost(key,l.cardData,a.zona==='tartarus'?'Afterlife':null,a.custo||0)&&(!a.efeitos.some(e=>e.op==='retornar')||canReturn(l)))result.push({type:'ability',uid,abilityId:a.id,label:`${a.nome_en} · ${cost(key,l.cardData,a.zona==='tartarus'?'Afterlife':null,a.custo||0)}`});
    if(ordinaryAction&&l.cardData.ultimate&&!player(key).ultimatesUsed.includes(l.cardData.personagem_id||l.cardData.id))result.push({type:'ultimate',uid,label:'Ultimate'});
    return result;
  }
  // A IA escolhe o Strike de maior valor: matar sem morrer, pressionar o God sem suicídio, evitar trocas perdidas.
  function strikeScore(uid,t){
    const me=stats(uid),ranged=me.keywords.includes('Long Range');
    if(t.kind==='god'){
      const p=player(t.playerKey);if(p.god.soul<=me.power)return 1000;
      return p.god.attack>=me.hp?me.power*0.4-2:me.power*1.2;
    }
    const them=stats(t.uid),kill=me.power>=them.hp,ignoresRanged=them.keywords.includes('Cheater');
    const die=!(kill&&ranged&&!ignoresRanged)&&them.power>=me.hp,value=(card(locate(t.uid).card.cardId).custo||0)+them.power;
    if(kill)return die?value*0.6:value*1.5+2;
    return die?-1:me.power*0.8;
  }
  function bestStrike(uid){
    let best=null,score=0;
    for(const t of strikeTargets(uid)){const v=strikeScore(uid,t);if(v>score){score=v;best=t;}}
    return best;
  }
  function aiStep(){
    if(!state||state.victory||options.paused)return false;
    const key=actor();
    if(choice){
      const choices=choice.options;
      let selection=choices.find(v=>v.id==='keep')||choices.find(v=>v.id==='yes')||choices.find(v=>v.target?.kind==='card'&&locate(v.target.uid)?.cardData.tipo==='Devotee')||choices[0];
      if(choice.prompt==='Choose the new target of that Strike')selection=[...choices].sort((x,y)=>(x.target?.kind==='god'?99:stats(x.target.uid)?.hp||0)-(y.target?.kind==='god'?99:stats(y.target.uid)?.hp||0)).reverse().find(v=>v.target?.kind==='card')||choices[0];
      if(choice.prompt.includes('Unfaith')||choice.prompt==='Choose Strike mode')selection=choices.find(v=>v.id==='soul')||choices[0];
      if(choice.prompt==='Choose a target')selection=choices.find(v=>v.target?.playerKey!==key)||choices[0];
      if(choice.prompt==='Choose opening initiative')selection=choices.find(v=>v.id===key)||choices[0];
      return perform({type:'choose',playerKey:key,optionId:selection.id});
    }
    if(state.priority===key)return perform({type:'pass-priority',playerKey:key});
    if(!ordinary(key))return false;
    const hand=player(key).zones.hand;
    if(!player(key).basePlaced){const candidates=hand.filter(i=>canBase(key,i.uid)).sort((a,b)=>(card(b.cardId).custo||0)-(card(a.cardId).custo||0));if(candidates.length)return perform({type:'base',uid:candidates[0].uid,playerKey:key});}
    const legal=all().filter(l=>l.playerKey===key).flatMap(l=>actions(key,l.card.uid));
    for(const type of ['strike','evolve','play','equip','ability']){
      let candidates=legal.filter(a=>a.type===type);
      if(type==='strike')candidates=candidates.flatMap(command=>{const target=bestStrike(command.uid);return target?[{...command,target}]:[];});
      if(type==='equip')candidates=candidates.flatMap(command=>{
        const equipment=locate(command.uid);if(equipment.card.attachedToUid)return[];
        // A IA preenche um portador disponível, sem alternar armaduras já equipadas em ciclo.
        const bearer=field().find(l=>l.playerKey===key&&l.cardData.tipo==='Devotee'&&(!isArmor(equipment.cardData)||!armor(l.card.uid)));
        return bearer?[{...command,target:desc(bearer)}]:[];
      });
      if(!candidates.length)continue;
      if(type==='play')candidates.sort((a,b)=>(card(locate(a.uid).card.cardId).tipo==='Devotee'?-1:1)-(card(locate(b.uid).card.cardId).tipo==='Devotee'?-1:1));
      const result=perform({...candidates[0],playerKey:key});if(result)return true;
    }
    return perform({type:'pass',playerKey:key});
  }
  function schedule(){
    clearTimeout(timer);if(disposed||!state||state.victory||options.paused||resolving)return;
    const key=actor(),ai=options.ai&&key==='B';
    const auto=state.priority&&options.autoPass&&!options.fullControl&&!choice&&!player(key).zones.hand.some(i=>canPlay(key,i.uid))&&!all().some(l=>l.playerKey===key&&actions(key,l.card.uid).some(a=>a.type==='ability'));
    if(ai||auto)timer=setTimeout(()=>{if(ai)aiStep();else perform({type:'pass-priority',playerKey:key});},options.aiSpeed==='fast'?30:options.aiSpeed==='slow'?800:280);
  }
  function notify(){if(disposed)return;revision++;onChange();schedule();}
  const api={dispatch:perform,stepAI:aiStep,card,stats,actions,canPlay,canBase,available,cost,hasKeyword:has,
    locate:(key,uid)=>{const l=locate(uid||key);return l?copy(l):null;},
    rivals:uid=>copy(relation(uid)),strikeTargets:uid=>copy(strikeTargets(uid)),equipment:uid=>copy(attachments(uid)),
    get state(){return state?copy(state):null;},get revision(){return revision;},get actingPlayer(){return actor();},get settings(){return{...options};},
    get choice(){return choice?copy(choice):null;},get stack(){return stack.map(({context,...item})=>copy(item));},
    get resolving(){return resolving;},
    dispose(){disposed=true;clearTimeout(timer);stack=[];triggers=[];choice=null;},
  };
  if(initialState){if(!state.rivals)state.rivals=[];delete state.links;for(const p of Object.values(state.players))delete p.eng;sequence=Math.max(0,...all().map(l=>Number(l.card.uid.split('-').at(-1))||0));settle();}
  return api;
}
