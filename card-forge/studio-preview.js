// Instâncias descartáveis: nenhum acesso à partida aberta, ao armazenamento ou a comandos de rede.
export async function simulateCard(cards,card,options={}){
  if(options.mode==='normal')return{card,mode:'print',stats:null,instance:null,equipment:[],report:'Valores impressos · sem simulação de partida.'};
  // Engine-v3 (autor, 30/10/2026): mesma conta de ATK/HP/keywords do duelo (playtest/engine-v3/effects.js).
  const [{forgeCard},{atkOf,hpOf,keywordsOf,modify}]=await Promise.all([import('../shared/preview-cards.js'),import('../playtest/engine-v3/effects.js')]);
  if(card.tipo==='God'||card.tipo==='Domain')return{card,mode:'print',stats:null,instance:null,equipment:[],report:'God e Domain · valores impressos (a engine-v3 não simula a carta isolada).'};
  const uid='card-90001',map=new Map([[uid,card]]),objects={[uid]:{cardId:card.id,owner:'A'}},attached={};
  const gear=card.tipo==='Devotee'&&options.mode==='battlefield'?(options.equipmentIds||[]).map(id=>cards.find(c=>c.id===id&&c.tipo==='Equipment')).filter(Boolean):[];
  gear.forEach((eq,i)=>{const e=`card-${90010+i}`;map.set(e,eq);objects[e]={cardId:eq.id,owner:'A'};attached[e]=uid;});
  const engineCards=new Map([...map.values()].map(c=>[c.id,forgeCard(c)]));
  const ctx={cards:engineCards,objects,attached},hand=options.mode==='hand';
  const instance={uid,prepared:options.prepared!==false,awakened:Boolean(options.awakened),damage:Math.max(0,Number(options.damage)||0),stage:Math.max(0,Number(options.stage)||0),attachedToUid:null};
  const player=()=>({battlefield:[],hand:[],bases:[],tartarus:[],void:[],deck:[],stack:[],soul:20,latent:0});
  const state={order:['A','B'],turn:1,round:1,active:'A',players:{A:player(),B:player()},units:{},effects:[],chain:[],domains:{}};
  state.players.A[hand?'hand':'battlefield'].push(uid,...Object.keys(attached));
  state.units[uid]={prepared:instance.prepared,damage:instance.damage,seal:Math.max(0,Number(options.seal)||0)};
  if(Number(options.powerBonus)||Number(options.hpBonus)||options.keywords?.length)modify(state,uid,{atk:Number(options.powerBonus)||0,hp:Number(options.hpBonus)||0,keywords:options.keywords||[]});
  if(card.tipo!=='Devotee')return{card,mode:hand?'hand':'playtest',stats:null,instance,equipment:[],report:'Engine-v3 · sem ATK/HP para este tipo de carta.'};
  const maxHP=hpOf(state,ctx,uid),stats={power:atkOf(state,ctx,uid),hp:Math.max(0,maxHP-instance.damage),maxHP,damage:instance.damage,keywords:keywordsOf(state,ctx,uid)};
  const equipment=Object.keys(attached).map(e=>({playerKey:'A',card:{uid:e,cardId:map.get(e).id,attachedToUid:uid},cardData:map.get(e)}));
  return{card,mode:hand?'hand':'playtest',stats,instance,equipment,report:`Engine-v3 · ${hand?'hand':'battlefield'} · ${stats.power} ATK · ${stats.hp}/${maxHP} HP · ${instance.damage} damage`};
}
