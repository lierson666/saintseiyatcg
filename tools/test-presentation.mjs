// Contratos de apresentação: precedência e observadores sem alterar a partida.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {interactionBinding} from '../shared/presentation.js';
import {createGame} from '../playtest/engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
const cards=JSON.parse(fs.readFileSync(new URL('../data/cards.json',import.meta.url))).cartas,beta=createStarterDecks(cards);
test('par de cartas prevalece sobre origem e padrão, inclusive silêncio e desativação',()=>{
 const p={interacoes:{'efeito:dano':{som:'a.wav',animacao:'pulse',volume:.4}},cartas:{a:{'efeito:dano':{som:'b.wav'}}},pares:{'a>b':{'efeito:dano':{som:null,ativo:false}}}};
 assert.deepEqual(interactionBinding(p,'efeito:dano','a','b'),{som:null,animacao:'pulse',volume:.4,ativo:false});
 assert.equal(interactionBinding(p,'efeito:dano','a','c').som,'b.wav');
 assert.equal(interactionBinding(p,'efeito:dano',null,null).som,'a.wav');
 assert.deepEqual(interactionBinding(p,'inexistente','a','b'),{});
});
test('erro ou mutação de observador não afeta resultado mecânico, incluindo IA',()=>{
 const make=onEvent=>createGame({cards,beta,onEvent,settings:{ai:false,autoPass:false},random:()=>.1});
 const observed=[];const normal=make(()=>{}),withFx=make(e=>{observed.push(structuredClone(e));e.type='adulterado';e.uid='adulterado';throw Error('FX indisponível');});
 for(const g of [normal,withFx]){
  g.dispatch({type:'start',ai:false,deckAId:beta.decks[0].id,deckBId:beta.decks[1].id,startingPlayer:'A'});
  g.dispatch({type:'choose',optionId:'keep'});g.dispatch({type:'choose',optionId:'keep'});
  const i=g.state.players.A.zones.hand.find(i=>g.canBase('A',i.uid));
  assert.ok(g.dispatch({type:'base',uid:i.uid}));
  assert.equal(g.dispatch({type:'base',uid:i.uid}),false);
  g.dispatch({type:'pass'});g.stepAI();g.stepAI();
 }
 assert.deepEqual(withFx.state,normal.state);
 assert.equal(observed.filter(e=>e.type==='acao:base'&&e.playerKey==='A').length,1);
 assert.ok(observed.some(e=>e.type==='evento:base_colocada'));
 assert.ok(observed.every(e=>!e.cardId&&!e.cardData&&!e.state&&!e.effects));
 normal.dispose();withFx.dispose();
});
