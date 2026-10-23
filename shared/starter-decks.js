// Decks iniciais do conjunto novo. A fonte original da beta permanece histórica.
import {validateDeck} from './card-model.js';
export function createStarterDecks(cards,overrides=[]){
  const factions=['Athena','Poseidon','Hades','Ares','Artemis','Neutral'];
  const gods={Athena:'athena-001',Poseidon:'poseidon-001',Hades:'hades-001',Ares:'ares-001',Artemis:'artemis-001',Neutral:'athena-001'};
  const colors={Athena:'#c9ab64',Poseidon:'#68bad1',Hades:'#b19adf',Ares:'#dd847c',Artemis:'#a9c9b3',Neutral:'#bcb7ac'};
  const decks=factions.map((f,index)=>{
    const prefix=`sst-${String(index+1).padStart(2,'0')}-`,entries=[];
    for(let n=1;n<=10;n++)entries.push({card_id:prefix+String(n).padStart(3,'0'),quantity:3});
    for(const [start,count,quantity] of [[11,5,2],[21,5,2],[31,3,2],[41,4,1]])for(let n=start;n<start+count;n++)entries.push({card_id:prefix+String(n).padStart(3,'0'),quantity});
    return{id:`rulebook2-${f.toLowerCase()}`,nome:`${f} · First constellation`,faccao:f,god_id:gods[f],domain_id:'athena-051',main_deck_total:60,main_deck:entries,identity:{card:f==='Neutral'?'sst-06-001':gods[f],title:f,role:'Rulebook 2.0',description:`${f} playtest · 60 cards · alternating actions`,color:colors[f]}};
  });
  for(const override of overrides){const index=decks.findIndex(d=>d.id===override.id);if(index<0)throw new Error('Deck STAR HILL desconhecido.');const original=decks[index];decks[index]={...original,...structuredClone(override),main_deck_total:override.main_deck.reduce((n,e)=>n+e.quantity,0),identity:{...original.identity,title:override.nome}};}
  for(const d of decks){const errors=validateDeck(d,cards);if(errors.length)throw new Error(`${d.id}: ${errors.join('; ')}`);}
  return{beta_version:'rulebook-2.0-first-set',god_id:'athena-001',decks};
}
