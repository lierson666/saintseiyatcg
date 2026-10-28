// Instâncias descartáveis: nenhum acesso à partida aberta, ao armazenamento ou a comandos de rede.
export async function simulateCard(cards,card,options={}){
  if(options.mode==='normal')return{card,mode:'print',stats:null,instance:null,equipment:[],report:'Valores impressos · sem simulação de partida.'};
  const {createGame}=await import('../playtest/engine-v2.js');
  const gods=cards.filter(c=>c.tipo==='God'),domain=cards.find(c=>c.tipo==='Domain');
  if(!gods.length||!domain)throw Error('A prévia da engine precisa de pelo menos um God e um Domain no catálogo.');
  const unit=(c,uid,key='A',patch={})=>({uid,cardId:c.id,owner:key,prepared:true,damage:0,stage:0,attachedToUid:null,awakened:false,struckRound:0,evolvedRound:0,returnedRound:0,enteredRound:0,modifiers:[],usedRound:{},usedGame:{},...patch});
  const player=(key,god)=>({god:unit(god,`god-${key}`,key,{soul:god.soul,attack:god.attack}),domainId:domain.id,domain:unit(domain,`domain-${key}`,key),zones:Object.fromEntries(['deck','hand','battlefield','cosmo_base','tartarus','void','stack'].map(z=>[z,[]])),latent:0,temporaryCosmo:0,passed:false,basePlaced:false,deckFailed:false});
  const godA=card.tipo==='God'?card:gods.find(c=>c.faccao===card.faccao)||gods[0],state={rulesVersion:'2.2',round:1,initiative:'A',currentPlayer:'A',priority:null,passes:0,priorityPasses:0,rivals:[],log:[],victory:null,players:{A:player('A',godA),B:player('B',gods.find(c=>c.id!==godA.id)||gods[0])}};
  const modifiers=[{power:Number(options.powerBonus)||0,hp:Number(options.hpBonus)||0,duration:'rodada'},...(options.keywords||[]).map(keyword=>({keyword,duration:'rodada'}))];
  const patch={stage:Math.max(0,Number(options.stage)||0),prepared:options.prepared!==false,awakened:Boolean(options.awakened),damage:Math.max(0,Number(options.damage)||0),sealCounters:Math.max(0,Number(options.seal)||0),modifiers};
  if(options.counterName&&/^[a-zA-Z][a-zA-Z0-9]*Counters$/.test(options.counterName))patch[options.counterName]=Math.max(0,Number(options.counterValue)||0);
  let uid='card-90001';
  if(card.tipo==='God'){uid='god-A';Object.assign(state.players.A.god,patch);}else if(card.tipo==='Domain'){uid='domain-A';state.players.A.domain=unit(card,uid,'A',patch);state.players.A.domainId=card.id;}else state.players.A.zones[options.mode==='hand'?'hand':'battlefield'].push(unit(card,uid,'A',patch));
  if(card.tipo==='Devotee'&&options.mode==='battlefield')for(const [index,id]of (options.equipmentIds||[]).entries()){const eq=cards.find(c=>c.id===id&&c.tipo==='Equipment');if(eq)state.players.A.zones.battlefield.push(unit(eq,`card-${90010+index}`,'A',{attachedToUid:uid}));}
  const game=createGame({cards,beta:{decks:[]},initialState:state,settings:{ai:false,autoPass:false,paused:true}});
  try{const location=game.locate(uid),stats=game.stats(uid),equipment=game.equipment(uid);return{card,mode:options.mode==='hand'?'hand':'playtest',stats,instance:location?.card||null,equipment,report:`Engine · ${location?.zone||'God'} · ${stats?.power??'—'} ATK · ${stats?.hp??'—'}/${stats?.maxHP??'—'} HP · ${stats?.damage??0} damage`};}finally{game.dispose();}
}
