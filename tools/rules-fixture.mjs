import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame} from '../playtest/engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
export const catalog=JSON.parse(fs.readFileSync(new URL('../data/cards.json',import.meta.url))).cartas;
export const beta=createStarterDecks(catalog),settings={ai:false,autoPass:false};
let serial=2000;
export const unit=(id,power,hp,keywords=[],extra={})=>({id,nome_exibicao_en:id,tipo:'Devotee',faccao:'Athena',custo:0,cosmoble:true,power,vida:hp,keywords_en:keywords,subtipos:[],...extra});
export const equipment=(id,bonus=2,extra={})=>({id,nome_exibicao_en:id,tipo:'Equipment',faccao:'Athena',custo:0,equipar_custo:0,equipar_custo_outros:0,slot_equipamento:'armadura',subtipos:['Cloth'],keywords_en:[],donos:['hero'],estagios:[{nome:'Vanilla',bonus_poder:0,bonus_vida:bonus},{nome:'7th Sense',bonus_poder:2,bonus_vida:bonus+2,custo:0}],...extra});
export function fixture(extra=[],prepare=()=>{}){
  const cards=[...catalog,...extra],seed=createGame({cards,beta,settings,random:()=>.1});
  seed.dispatch({type:'start',ai:false,deckAId:beta.decks[0].id,deckBId:beta.decks[0].id,startingPlayer:'A'});
  seed.dispatch({type:'choose',optionId:'keep'});seed.dispatch({type:'choose',optionId:'keep'});
  const state=seed.state;seed.dispose();state.players.A.domainId='athena-052';state.players.B.domainId='athena-052';state.players.A.domain.cardId='athena-052';state.players.B.domain.cardId='athena-052';
  for(const p of Object.values(state.players)){p.zones.hand=[];p.latent=0;}
  const add=(key,id,zone='battlefield',patch={})=>{const i={uid:`card-${++serial}`,cardId:id,owner:key,prepared:true,damage:0,stage:0,attachedToUid:null,awakened:false,struckRound:0,evolvedRound:0,returnedRound:0,modifiers:[],usedRound:{},usedGame:{},...patch};state.players[key].zones[zone].push(i);return i;};
  const rival=(a,b)=>{const v={id:`rival-${++serial}`,a:a.uid||a,b:b.uid||b};state.rivals.push(v);return v;};
  const refs=prepare({state,add,rival})||{};
  const game=createGame({cards,beta,settings,initialState:state});
  return{game,...refs};
}
export function drain(game,choose=null){let count=0;while((game.choice||game.stack.length)&&!game.state.victory){assert.ok(++count<100,'Resolução não terminou');if(game.choice){const c=game.choice;const option=choose?.(c)||c.options.find(v=>v.id==='no')||c.options[0];assert.ok(game.dispatch({type:'choose',optionId:option.id}));}else assert.ok(game.dispatch({type:'pass-priority'}));}}
export const command=(g,type,uid,rest={})=>{assert.ok(g.dispatch({type,uid,...rest}),`Comando recusado: ${type}`);drain(g);};
const pos=(g,uid)=>g.locate(uid);
const at=(key,uid)=>({target:{kind:'card',playerKey:key,uid:uid.uid||uid}}),god=key=>({target:{kind:'god',playerKey:key}});
