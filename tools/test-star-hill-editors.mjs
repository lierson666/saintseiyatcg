import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHistory} from '../shared/editor-history.js';
import {changeCopies,copiesOf,exportDeck,importDeck,deckCount} from '../star-hill/deck-builder.js';
import {createStarterDecks} from '../shared/starter-decks.js';
import {validateDeck} from '../shared/card-model.js';
const cards=JSON.parse(readFileSync(new URL('../data/cards.json',import.meta.url))).cartas;
const deck=()=>structuredClone(createStarterDecks(cards).decks[0]);
test('histórico isola snapshots, desfaz e refaz sem compartilhar referências',()=>{
  const start={a:[1]},h=createHistory(start);start.a.push(9);
  h.record({a:[2]});const undone=h.undo();assert.deepEqual(undone,{a:[1]});undone.a.push(10);
  assert.deepEqual(h.redo(),{a:[2]});assert.deepEqual(h.undo(),{a:[1]});assert.equal(h.undo(),null);
});
test('digitação agrupa por campo e gesto; nova edição invalida refazer',()=>{
  let time=10;const h=createHistory({a:''},{now:()=>time});
  h.record({a:'o'},'a');time+=100;h.record({a:'oi'},'a');h.breakGroup();h.record({a:'ola'},'a');
  assert.deepEqual(h.undo(),{a:'oi'});assert.deepEqual(h.undo(),{a:''});
  h.record({a:'novo'});assert.equal(h.canRedo,false);assert.equal(h.redo(),null);
});
test('limite do histórico mantém os últimos estados e ignora alteração nula',()=>{
  const h=createHistory(0,{limit:2});for(const n of [1,2,3])h.record(n);
  assert.equal(h.record(3),false);assert.equal(h.undo(),2);assert.equal(h.undo(),1);assert.equal(h.undo(),null);
});
test('deck respeita limite por identidade, facção e liderança',()=>{
  const d=deck(),card=cards.find(c=>c.id==='sst-01-001');assert.equal(deckCount(d),60);
  assert.equal(changeCopies(d,card,1,cards),null);assert.equal(copiesOf(d,card,cards),4);
  const before=JSON.stringify(d);assert.match(changeCopies(d,card,1,cards),/4 cópias/);assert.equal(JSON.stringify(d),before);
  assert.match(changeCopies(d,cards.find(c=>c.id==='sst-03-001'),1,cards),/facção/);
  assert.match(changeCopies(d,cards.find(c=>c.id==='athena-001'),1,cards),/liderança/);
  const variant={...card,id:'variante-de-teste',identidade_carta:card.identidade_carta||card.id};assert.match(changeCopies(d,variant,1,[...cards,variant]),/4 cópias/);
  assert.equal(changeCopies(d,card,-1,cards),null);assert.deepEqual(validateDeck(d,cards),[]);
});
test('importação retorna deck validado; entrada inválida não modifica o original',()=>{
  const d=deck(),text=exportDeck(d),before=JSON.stringify(d);
  assert.deepEqual(importDeck(text,d,cards),d);
  for(const bad of [text+'\n<script>alert(1)</script>',text.replace('3 sst-01-001','7 sst-01-001'),text.replace('God: athena-001','God: sst-01-001'),text.replace('3 sst-01-001','0 sst-01-001')])assert.throws(()=>importDeck(bad,d,cards));
  assert.equal(JSON.stringify(d),before);
});
