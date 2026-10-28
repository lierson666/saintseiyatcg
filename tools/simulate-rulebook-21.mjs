// Simulações reproduzíveis de partidas completas pelo mesmo motor e comandos públicos da arena.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGame} from '../playtest/engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
const cards=JSON.parse(fs.readFileSync(new URL('../data/cards.json',import.meta.url))).cartas,beta=createStarterDecks(cards);
const strategies=['voltron','anthem','control','aggro','resource','response'],results=[];
const totals={responses:0,evolutions:0,equips:0,strikes:0,banked:0,anthemPlays:0};
for(let index=0;index<strategies.length;index++)for(const first of ['A','B'])for(let seed=1;seed<=2;seed++){
 let rng=seed*179+index;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 const strategiesByPlayer={A:strategies[index],B:strategies[(index+1)%strategies.length]};
 const g=createGame({cards,beta,random,settings:{ai:false,autoPass:false,strategies:strategiesByPlayer},onEvent:event=>{
  if(event.type==='acao:play'&&g.state.priority&&g.stack.length>1)totals.responses++;
  if(event.type==='acao:evolve')totals.evolutions++;
  if(event.type==='acao:equip')totals.equips++;
  if(event.type==='acao:strike')totals.strikes++;
 }});
 g.dispatch({type:'start',deckAId:beta.decks[index].id,deckBId:beta.decks[(index+1)%6].id,startingPlayer:first,ai:false});
 let steps=0;for(;steps<5000&&!g.state.victory;steps++){
  const revision=g.revision;assert.ok(g.stepAI(),`Ação inválida: ${JSON.stringify({index,first,seed,actor:g.actingPlayer,choice:g.choice,round:g.state.round})}`);assert.ok(g.revision>revision);
  for(const p of Object.values(g.state.players)){assert.ok(p.latent>=0&&p.latent<=3);assert.ok(p.temporaryCosmo>=0);}
 }
 assert.ok(g.state.victory,`Partida parada após ${steps} comandos`);
 totals.banked+=g.state.log.filter(l=>/banks [1-3] unused/.test(l)).length;
 totals.anthemPlays+=g.state.log.filter(l=>/Play (Sanctuary|Brother|Athena|Pillar|War Banner)/.test(l)).length;
 results.push({estrategias:strategiesByPlayer,iniciativa:first,semente:seed,rodadas:g.state.round,comandos:steps,vitoria:g.state.victory});g.dispose();
}
assert.ok(totals.responses>0,'Nenhuma resposta Latent exercitada');assert.ok(totals.strikes>0);assert.ok(totals.equips>0);assert.ok(totals.banked>0);
const report={versao:'2.1',partidas:results.length,totais:totals,resultados:results,limite:'Perfis heurísticos e catálogo provisório: regressão de fluxo, não prova de balanceamento competitivo.'};
fs.writeFileSync(new URL('../docs/rulebook-2.1/simulacoes.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({partidas:results.length,totais:totals,rodadas:[Math.min(...results.map(r=>r.rodadas)),Math.max(...results.map(r=>r.rodadas))]}));
