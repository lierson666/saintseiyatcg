// Testes do contrato 2.0, por cenários e comandos públicos, sem navegador ou dependências.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame} from '../playtest/engine-v2.js';
import {createStarterDecks} from '../shared/starter-decks.js';
import {compilePlaytest} from '../shared/import-playtest.js';
import {validateDeck} from '../shared/card-model.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/cards.json',import.meta.url))).cartas;
const beta=createStarterDecks(catalog),settings={ai:false,autoPass:false};
let serial=2000;
const unit=(id,power,hp,keywords=[],extra={})=>({id,nome_exibicao_en:id,tipo:'Devotee',faccao:'Athena',custo:0,cosmoble:true,power,vida:hp,keywords_en:keywords,subtipos:[],...extra});
const equipment=(id,bonus=2,extra={})=>({id,nome_exibicao_en:id,tipo:'Equipment',faccao:'Athena',custo:0,equipar_custo:0,slot_equipamento:'armadura',subtipos:['Cloth'],keywords_en:[],donos:['hero'],estagios:[{nome:'Vanilla',bonus_poder:0,bonus_vida:bonus},{nome:'7th Sense',bonus_poder:2,bonus_vida:bonus+2,custo:0}],...extra});
function fixture(extra=[],prepare=()=>{}){
  const cards=[...catalog,...extra],seed=createGame({cards,beta,settings,random:()=>.1});
  seed.dispatch({type:'start',ai:false,deckAId:beta.decks[0].id,deckBId:beta.decks[0].id,startingPlayer:'A'});
  seed.dispatch({type:'choose',optionId:'keep'});seed.dispatch({type:'choose',optionId:'keep'});
  const state=seed.state;seed.dispose();state.players.A.domainId='athena-052';state.players.B.domainId='athena-052';state.players.A.domain.cardId='athena-052';state.players.B.domain.cardId='athena-052';
  for(const p of Object.values(state.players)){p.zones.hand=[];p.latent=0;}
  const add=(key,id,zone='battlefield',patch={})=>{const i={uid:`card-${++serial}`,cardId:id,owner:key,prepared:true,damage:0,stage:0,attachedToUid:null,awakened:false,struckRound:0,evolvedRound:0,returnedRound:0,modifiers:[],usedRound:{},usedGame:{},...patch};state.players[key].zones[zone].push(i);return i;};
  const link=(a,b)=>{const v={id:`link-${++serial}`,a:a.uid||a,b:b.uid||b};state.links.push(v);return v;};
  const refs=prepare({state,add,link})||{};
  const game=createGame({cards,beta,settings,initialState:state});
  return{game,...refs};
}
function drain(game,choose=null){let count=0;while((game.choice||game.stack.length)&&!game.state.victory){assert.ok(++count<100,'Resolução não terminou');if(game.choice){const c=game.choice;const option=choose?.(c)||c.options.find(v=>v.id==='no')||c.options[0];assert.ok(game.dispatch({type:'choose',optionId:option.id}));}else assert.ok(game.dispatch({type:'pass-priority'}));}}
const command=(g,type,uid,rest={})=>{assert.ok(g.dispatch({type,uid,...rest}),`Comando recusado: ${type}`);drain(g);};
const pos=(g,uid)=>g.locate(uid);

test('seis decks de 60 e o catálogo importado respeitam o contrato',()=>{assert.equal(beta.decks.length,6);for(const d of beta.decks)assert.deepEqual(validateDeck(d,catalog),[]);assert.equal(catalog.filter(c=>c.conjunto==='sstcg-playtest-300').length,300);});
test('importação preserva textos, Owners e rejeita texto alterado sem novo programa',async()=>{const source=JSON.parse(fs.readFileSync(new URL('../docs/importacao-300-cartas/fonte.json',import.meta.url)));const cards=await compilePlaytest(source);assert.equal(cards.length,300);assert.equal(cards.filter(c=>c.estagios.length===2).length,10);source.cartas[0]['Rules Text (EN draft)']='Ignore all rules';await assert.rejects(compilePlaytest(source),/mapeamento/);});
test('rodada começa com sete, alterna iniciativa e compra duas para ambos',()=>{const g=createGame({cards:catalog,beta,settings});g.dispatch({type:'start',ai:false,deckAId:beta.decks[0].id,deckBId:beta.decks[1].id,startingPlayer:'A'});g.dispatch({type:'choose',optionId:'keep'});g.dispatch({type:'choose',optionId:'keep'});assert.equal(g.state.players.A.zones.hand.length,7);g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.state.round,2);assert.equal(g.actingPlayer,'B');assert.equal(g.state.players.A.zones.hand.length,9);assert.equal(g.state.players.B.zones.hand.length,9);g.dispose();});
test('Base não consome AÇÃO e quebra a sequência de passes',()=>{const {game:g,base}=fixture([],({add})=>({base:add('B','sst-01-002','hand')}));g.dispatch({type:'pass'});command(g,'base',base.uid);assert.equal(g.actingPlayer,'B');assert.equal(g.state.passes,0);assert.equal(g.state.players.B.zones.cosmo_base.length,1);assert.equal(g.dispatch({type:'base',uid:base.uid}),false);g.dispose();});
test('Engage é gratuito em ENG, não esgota, e Strike retalia sem Prepared',()=>{const {game:g,a,b}=fixture([unit('a',3,6),unit('b',2,5)],({add})=>({a:add('A','a'),b:add('B','b','battlefield',{prepared:false})}));command(g,'engage',a.uid,{target:{kind:'card',playerKey:'B',uid:b.uid}});assert.equal(g.state.players.A.eng,3);assert.equal(pos(g,a.uid).card.prepared,true);g.dispatch({type:'pass'});command(g,'strike',a.uid);assert.equal(pos(g,a.uid).card.damage,2);assert.equal(pos(g,b.uid).card.damage,3);assert.equal(pos(g,a.uid).card.prepared,false);assert.equal(g.links(a.uid).length,1);g.dispose();});
test('Prepared não restringe quem inicia ou recebe Engage livre, inclusive na escolha de alvo',()=>{
  for(const preparedA of [true,false])for(const preparedB of [true,false]){
    const {game:g,a,b}=fixture([unit('initiator',2,5),unit('recipient',2,5)],({add})=>({a:add('A','initiator','battlefield',{prepared:preparedA}),b:add('B','recipient','battlefield',{prepared:preparedB})}));
    assert.ok(g.actions('A',a.uid).some(action=>action.type==='engage'));
    assert.ok(g.dispatch({type:'engage',uid:a.uid}));
    const target=g.choice.options.find(option=>option.target?.uid===b.uid);
    assert.ok(target,'O seletor deve incluir o Devotee livre mesmo Unprepared.');
    assert.ok(g.dispatch({type:'choose',optionId:target.id}));drain(g);
    assert.ok(g.links(a.uid).some(link=>[link.a,link.b].includes(b.uid)));
    assert.equal(pos(g,a.uid).card.prepared,preparedA);
    assert.equal(pos(g,b.uid).card.prepared,preparedB);
    g.dispose();
  }
});
test('dano e Engage persistem entre rodadas',()=>{const {game:g,a,b}=fixture([unit('a',2,6),unit('b',1,6)],({add,link})=>{const a=add('A','a','battlefield',{damage:2}),b=add('B','b');link(a,b);return{a,b};});g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(pos(g,a.uid).card.damage,2);assert.equal(g.links(a.uid).length,1);assert.equal(pos(g,a.uid).card.prepared,true);g.dispose();});
test('Guardian Unprepared intercepta e fica ocupado',()=>{const {game:g,a,b,guard}=fixture([unit('a',2,5),unit('b',2,5),unit('guard',1,5,['Guardian'])],({add})=>({a:add('A','a'),b:add('A','b'),guard:add('B','guard','battlefield',{prepared:false})}));assert.ok(g.dispatch({type:'engage',uid:a.uid,target:{kind:'god',playerKey:'B'}}));assert.equal(g.choice.playerKey,'B');g.dispatch({type:'choose',optionId:guard.uid});drain(g);assert.equal(g.links(a.uid)[0].b,guard.uid);g.dispatch({type:'pass'});command(g,'engage',b.uid,{target:{kind:'god',playerKey:'B'}});assert.equal(g.links(b.uid)[0].b,'god-B');g.dispose();});
test('Nimble ignora intervenção de Guardian e continua alvo normal',()=>{const {game:g,a,b}=fixture([unit('a',2,5,['Nimble','Multiguard 2']),unit('b',2,5,['Guardian'])],({add})=>({a:add('A','a'),b:add('B','b')}));command(g,'engage',a.uid,{target:{kind:'god',playerKey:'B'}});assert.equal(g.links(a.uid)[0].b,'god-B');command(g,'engage',b.uid,{target:{kind:'card',playerKey:'A',uid:a.uid}});assert.equal(g.links(a.uid).length,1);assert.equal(g.links('god-B').length,0);assert.ok(g.links(a.uid).some(l=>l.a===b.uid&&l.b===a.uid));g.dispose();});
test('troca e Disengage custam ENG sem usar Prepared',()=>{const {game:g,a,b}=fixture([unit('a',2,5),unit('b',2,5)],({add,link})=>{const a=add('A','a','battlefield',{prepared:false}),b=add('B','b');link(a,b);return{a,b};});command(g,'change-engage',a.uid,{target:{kind:'god',playerKey:'B'}});assert.equal(g.state.players.A.eng,2);assert.equal(pos(g,a.uid).card.prepared,false);g.dispatch({type:'pass'});command(g,'disengage',a.uid);assert.equal(g.state.players.A.eng,1);assert.equal(g.links(a.uid).length,0);g.dispose();});
test('Long Range ofensivo evita retaliação letal; Cheater devolve simultaneidade',()=>{for(const cheat of [false,true]){const {game:g,a,b}=fixture([unit('a',4,5,['Long Range']),unit('b',3,4,cheat?['Cheater']:[])],({add,link})=>{const a=add('A','a','battlefield',{damage:2}),b=add('B','b','battlefield',{damage:1});link(a,b);return{a,b};});command(g,'strike',a.uid);assert.equal(pos(g,b.uid).zone,'tartarus');assert.equal(pos(g,a.uid).zone,cheat?'tartarus':'battlefield');g.dispose();}});
test('Long Range no defensor não antecipa a retaliação',()=>{const {game:g,a,b}=fixture([unit('a',4,3),unit('b',3,4,['Long Range'])],({add,link})=>{const a=add('A','a'),b=add('B','b');link(a,b);return{a,b};});command(g,'strike',a.uid);assert.equal(pos(g,a.uid).zone,'tartarus');assert.equal(pos(g,b.uid).zone,'tartarus');g.dispose();});
test('Pierce conta apenas excesso sobre HP restante',()=>{const {game:g,a,b}=fixture([unit('a',4,8,['Pierce']),unit('b',1,5)],({add,link})=>{const a=add('A','a'),b=add('B','b','battlefield',{damage:3});link(a,b);return{a,b};});command(g,'strike',a.uid);assert.equal(g.state.players.B.god.soul,28);g.dispose();});
test('God retalia com Attack; Unfaith remove Latent em vez de Soul',()=>{const {game:g,a}=fixture([unit('a',5,9,['Unfaith'])],({state,add,link})=>{const a=add('A','a');link(a,'god-B');state.players.B.latent=3;return{a};});command(g,'strike',a.uid,{mode:'unfaith'});assert.equal(g.state.players.B.latent,1);assert.equal(g.state.players.B.god.soul,30);assert.equal(pos(g,a.uid).card.damage,3);g.dispose();});
test('duas mortes e Soul zero simultâneos encerram em empate',()=>{const spell={id:'tie',nome_exibicao_en:'Tie',tipo:'Moment',faccao:'Athena',custo:0,motor:{efeitos:[{op:'alma',n:-30,alvo:'jogador'},{op:'alma',n:-30,alvo:'oponente'}]}};const {game:g,s}=fixture([spell],({add})=>({s:add('A','tie','hand')}));command(g,'play',s.uid);assert.equal(g.state.victory.draw,true);g.dispose();});
test('evolução exige Owner, preserva dano/Prepared e substitui bônus',()=>{const {game:g,a,e}=fixture([unit('hero',2,4,[],{personagem_id:'hero'}),equipment('cloth')],({add})=>{const a=add('A','hero','battlefield',{damage:3,prepared:false}),e=add('A','cloth','battlefield',{attachedToUid:a.uid});return{a,e};});command(g,'evolve',e.uid);assert.equal(pos(g,e.uid).card.stage,1);assert.equal(g.stats(a.uid).maxHP,8);assert.equal(pos(g,a.uid).card.damage,3);assert.equal(pos(g,a.uid).card.prepared,false);g.dispatch({type:'pass'});assert.equal(g.dispatch({type:'evolve',uid:e.uid}),false);g.dispose();});
test('transferência reseta evolução e perda de HP pode destruir o antigo Owner',()=>{const {game:g,a,b,e}=fixture([unit('hero',2,4,[],{personagem_id:'hero'}),unit('other',1,4),equipment('cloth')],({add})=>{const a=add('A','hero','battlefield',{damage:5}),b=add('A','other'),e=add('A','cloth','battlefield',{attachedToUid:a.uid,stage:1});return{a,b,e};});command(g,'equip',e.uid,{target:{kind:'card',playerKey:'A',uid:b.uid}});assert.equal(pos(g,a.uid).zone,'tartarus');assert.equal(pos(g,e.uid).card.stage,0);assert.equal(pos(g,e.uid).card.attachedToUid,b.uid);g.dispose();});
test('morte mantém Cloth no campo, sem portador e em Vanilla',()=>{const {game:g,a,b,e}=fixture([unit('hero',1,1,[],{personagem_id:'hero'}),unit('enemy',8,9),equipment('cloth')],({add,link})=>{const a=add('A','hero'),e=add('A','cloth','battlefield',{attachedToUid:a.uid,stage:1}),b=add('B','enemy');link(a,b);return{a,b,e};});command(g,'strike',a.uid);assert.equal(pos(g,e.uid).zone,'battlefield');assert.equal(pos(g,e.uid).card.attachedToUid,null);assert.equal(pos(g,e.uid).card.stage,0);g.dispose();});
test('uma armadura e várias armas; troca não verifica HP no estado intermediário',()=>{const {game:g,a,e,newE}=fixture([unit('hero',2,4),equipment('cloth',3),equipment('second',4)],({add})=>{const a=add('A','hero','battlefield',{damage:6}),e=add('A','cloth','battlefield',{attachedToUid:a.uid}),newE=add('A','second');return{a,e,newE};});command(g,'equip',newE.uid,{target:{kind:'card',playerKey:'A',uid:a.uid}});assert.equal(pos(g,a.uid).zone,'battlefield');assert.equal(pos(g,e.uid).card.attachedToUid,null);assert.equal(g.stats(a.uid).maxHP,8);g.dispose();});
test('Afterlife é derivado da zona e não oferece retorno gratuito',()=>{const {game:g,a}=fixture([unit('a',2,3)],({add})=>({a:add('A','a','tartarus')}));assert.ok(g.stats(a.uid).keywords.includes('Afterlife'));assert.equal(g.actions('A',a.uid).length,0);g.dispose();});
test('custo insuficiente e revisão antiga não gastam recursos nem AÇÃO',()=>{const {game:g,a}=fixture([],({add})=>({a:add('A','sst-01-002','hand')}));const before=g.state;assert.equal(g.dispatch({type:'play',uid:a.uid}),false);assert.deepEqual(g.state,before);assert.equal(g.dispatch({type:'pass',expectedRevision:1000}),false);assert.equal(g.actingPlayer,'A');g.dispose();});
test('projeções não deixam a UI modificar o estado canônico',()=>{const {game:g}=fixture();const s=g.state;s.players.A.god.soul=1;assert.equal(g.state.players.A.god.soul,30);g.dispose();});

test('seis confrontos automáticos terminam sem laço de ações inválidas',()=>{for(let n=0;n<6;n++){const g=createGame({cards:catalog,beta,settings,random:()=>.41});g.dispatch({type:'start',deckAId:beta.decks[n].id,deckBId:beta.decks[(n+1)%6].id,startingPlayer:'A',ai:false});let steps=0;for(;steps<1800&&!g.state.victory;steps++)assert.ok(g.stepAI());assert.ok(g.state.victory,`Confronto ${n} não terminou em ${steps} comandos`);assert.ok(g.state.round>1);g.dispose();}});
test('uma unidade sem destino de troca não oferece Change Engage',()=>{const {game:g,a}=fixture([unit('a',1,3)],({add,link})=>{const a=add('A','a','battlefield',{prepared:false});link(a,'god-B');return{a};});assert.equal(g.actions('A',a.uid).some(a=>a.type==='change-engage'),false);g.dispose();});
test('Latent é concedido uma vez por AÇÃO inimiga mesmo com dano em área',()=>{const spell={id:'area',nome_exibicao_en:'Area',tipo:'Moment',faccao:'Athena',custo:0,motor:{efeitos:[{op:'dano_area',n:1},{op:'dano_area',n:1}]}};const {game:g}=fixture([spell,unit('a',1,6)],({add})=>{add('B','a');add('B','a');return{s:add('A','area','hand')};});const s=g.state.players.A.zones.hand[0];command(g,'play',s.uid);assert.equal(g.state.players.B.latent,1);assert.equal(g.state.players.B.zones.battlefield[0].damage,2);g.dispose();});
test('preparar até duas Bases funciona e não consome o estado da terceira',()=>{const spell={id:'two',nome_exibicao_en:'Two',tipo:'Moment',faccao:'Athena',custo:0,motor:{efeitos:[{op:'preparar',alvo:{zona:'cosmo_base',lado:'aliado'},max:2}]}};const {game:g,s}=fixture([spell],({add})=>{for(let n=0;n<3;n++)add('A','sst-01-002','cosmo_base',{prepared:false});return{s:add('A','two','hand')};});command(g,'play',s.uid);assert.equal(g.state.players.A.zones.cosmo_base.filter(i=>i.prepared).length,2);g.dispose();});
test('Sealed impede Strike e ativação, mas não impede retaliação',()=>{const {game:g,a,b}=fixture([unit('a',1,8,['Sealed'],{motor:{habilidades:[{id:'x',custo:0,efeitos:[]}]}}),unit('b',2,8)],({add,link})=>{const a=add('A','a'),b=add('B','b');link(a,b);return{a,b};});assert.equal(g.dispatch({type:'strike',uid:a.uid}),false);assert.equal(g.dispatch({type:'ability',uid:a.uid,abilityId:'x'}),false);g.dispatch({type:'pass'});command(g,'strike',b.uid);assert.equal(pos(g,b.uid).card.damage,1);g.dispose();});
test('uma resposta paga seu custo e preserva a próxima AÇÃO do respondente',()=>{const spell={id:'answer',nome_exibicao_en:'Answer',tipo:'Technique',faccao:'Athena',custo:1,motor:{efeitos:[{op:'alma',n:1,alvo:'jogador'}]}};const {game:g,a,s}=fixture([unit('a',1,5),spell],({add})=>{add('B','sst-01-002','cosmo_base');return{a:add('A','a'),s:add('B','answer','hand')};});g.dispatch({type:'engage',uid:a.uid,target:{kind:'god',playerKey:'B'}});assert.equal(g.actingPlayer,'B');assert.ok(g.dispatch({type:'play',uid:s.uid}));drain(g);assert.equal(g.state.players.B.zones.cosmo_base[0].prepared,false);assert.equal(g.actingPlayer,'B');g.dispose();});
test('armas múltiplas ficam anexadas junto com uma armadura',()=>{const weapon=equipment('weapon',0,{slot_equipamento:'arma',subtipos:['Weapon']});const {game:g,a,w1,w2}=fixture([unit('a',1,5),equipment('armor'),weapon],({add})=>{const a=add('A','a');add('A','armor','battlefield',{attachedToUid:a.uid});return{a,w1:add('A','weapon'),w2:add('A','weapon')};});command(g,'equip',w1.uid,{target:{kind:'card',playerKey:'A',uid:a.uid}});g.dispatch({type:'pass'});command(g,'equip',w2.uid,{target:{kind:'card',playerKey:'A',uid:a.uid}});assert.equal(g.equipment(a.uid).length,3);g.dispose();});
test('texto em revisão não pode ser jogado usando efeitos antigos',()=>{const {game:g,a}=fixture([unit('a',1,2,[],{motor_revisao_pendente:true})],({add})=>({a:add('A','a','hand')}));assert.equal(g.canPlay('A',a.uid),false);assert.equal(g.dispatch({type:'play',uid:a.uid}),false);g.dispose();});
test('Awaken é independente e Ultimate não recarrega em outra cópia do personagem',()=>{const hero=unit('hero',1,8,[],{personagem_id:'hero',despertar:{custo:0,bonus_poder:1},ultimate:{nome_en:'Ultimate',custo:0,exige_awaken:true,efeitos:[{op:'alma',n:-1,alvo:'oponente'}]}});const {game:g,a,b}=fixture([hero],({add})=>({a:add('A','hero'),b:add('A','hero','battlefield',{awakened:true})}));command(g,'awaken',a.uid);assert.ok(pos(g,a.uid).card.awakened);assert.equal(g.stats(a.uid).power,2);g.dispatch({type:'pass'});command(g,'ultimate',a.uid);g.dispatch({type:'pass'});assert.equal(g.dispatch({type:'ultimate',uid:b.uid}),false);g.dispose();});
test('Hades SST-03-010 compra e se exila do Tartarus para Void',()=>{const c=catalog.find(c=>c.id==='sst-03-010'),a=c.motor.habilidades[0];const {game:g,s}=fixture([],({state,add})=>{state.players.A.latent=3;return{s:add('A',c.id,'tartarus')};});const before=g.state.players.A.zones.hand.length;command(g,'ability',s.uid,{abilityId:a.id});assert.equal(pos(g,s.uid).zone,'void');assert.equal(g.state.players.A.zones.hand.length,before+1);g.dispose();});
test('reduzir Multiguard pede ao controlador qual confronto encerrar',()=>{const {game:g,a}=fixture([unit('a',1,9),unit('b',1,5)],({add,link})=>{const a=add('A','a'),b=add('B','b'),c=add('B','b');a.modifiers.push({keyword:'Multiguard 2',duration:'rodada'});link(a,b);link(a,c);return{a};});g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.choice.playerKey,'A');assert.match(g.choice.prompt,/Capacity reduced/);g.dispatch({type:'choose',playerKey:'A',optionId:g.choice.options[0].id});drain(g);assert.equal(g.links(a.uid).length,1);assert.equal(g.state.round,2);g.dispose();});
test('habilidade desbloqueada num estágio anterior permanece após outra evolução',()=>{const gear=equipment('cloth',2);gear.estagios[0].habilidades=[{id:'star',nome_en:'Star',custo:0,zona:'battlefield',efeitos:[]}];const {game:g,e}=fixture([unit('hero',1,6,[],{personagem_id:'hero'}),gear],({add})=>{const a=add('A','hero');return{e:add('A','cloth','battlefield',{attachedToUid:a.uid,stage:1})};});assert.ok(g.actions('A',e.uid).some(a=>a.abilityId==='star'));g.dispose();});
test('retorno que produz duplicidade deixa escolher e preserva gatilho de entrada',()=>{const hero=unit('hero',1,8,[],{personagem_id:'hero',personagem_unico:true,motor:{gatilhos:[{evento:'entrada',efeitos:[{op:'comprar',n:1,alvo:'jogador'}]}]}}),spell={id:'revive',nome_exibicao_en:'Revive',tipo:'Moment',faccao:'Athena',custo:0,motor:{efeitos:[{op:'retornar',alvo:{zona:'tartarus',tipo:'Devotee',lado:'aliado'}}]}};const {game:g,old,dead,s}=fixture([hero,spell],({add})=>({old:add('A','hero'),dead:add('A','hero','tartarus'),s:add('A','revive','hand')}));assert.ok(g.dispatch({type:'play',uid:s.uid}));drain(g,c=>c.prompt.includes('version')?c.options.find(o=>o.uid===old.uid):null);assert.equal(pos(g,old.uid).zone,'battlefield');assert.equal(pos(g,dead.uid).zone,'tartarus');assert.equal(g.state.players.A.zones.hand.length,1);assert.equal(g.state.players.A.zones.battlefield.length,1);g.dispose();});
test('as 300 definições resolvem entrada ou resposta sem operações desconhecidas',()=>{for(const c of catalog.filter(c=>c.conjunto==='sstcg-playtest-300')){
 const generic=unit('scenario-unit',2,50,[],{personagem_id:c.donos?.[0]||c.ressonancias?.[0]?.personagem_id||'scenario'}),gear=equipment('scenario-gear',2,{equipar_custo:0,subtipos:['Cloth']});
 const {game:g,s,a}=fixture([generic,gear],({add,link})=>{
   const a=add('A','scenario-unit','battlefield',{damage:3}),b=add('B','scenario-unit','battlefield',{damage:3});link(a,b);
   add('A','scenario-gear','battlefield',{attachedToUid:a.uid});add('B','scenario-gear');
   for(const key of ['A','B']){add(key,'scenario-gear','tartarus');add(key,'scenario-unit','tartarus');add(key,'scenario-unit','hand');for(let n=0;n<10;n++)add(key,'sst-01-002','cosmo_base');}
   return{a,s:add(c.tipo==='Technique'?'B':'A',c.id,'hand')};
 });
 try{
   if(c.tipo==='Technique')assert.ok(g.dispatch({type:'strike',uid:a.uid}));
   assert.ok(g.dispatch({type:'play',playerKey:c.tipo==='Technique'?'B':'A',uid:s.uid,...(c.tipo==='Equipment'?{equipTo:a.uid}:{})}),c.id);
   drain(g);assert.equal(g.stack.length,0,c.id);
 }finally{g.dispose();}
}});

test('tankar substitui o vínculo com God, dos dois lados e em todos os estados Prepared',()=>{
  for(const owner of ['A','B'])for(const preparedA of [true,false])for(const preparedB of [true,false]){
    const enemy=owner==='A'?'B':'A';
    const {game:g,a,b,third}=fixture([unit('a',2,7),unit('b',3,7)],({state,add,link})=>{
      state.currentPlayer=owner;const a=add(owner,'a','battlefield',{prepared:preparedA}),third=add(owner,'a'),b=add(enemy,'b','battlefield',{prepared:preparedB});link(b,`god-${owner}`);return{a,b,third};
    });
    assert.ok(g.dispatch({type:'engage',uid:a.uid}));
    const target=g.choice.options.find(v=>v.target?.uid===b.uid);assert.ok(target);
    g.dispatch({type:'choose',optionId:target.id});drain(g);
    assert.equal(g.links(b.uid).length,1);assert.equal(g.links(`god-${owner}`).length,0);
    assert.ok(g.links(b.uid).some(link=>[link.a,link.b].includes(a.uid)));
    assert.equal(pos(g,a.uid).card.prepared,preparedA);assert.equal(pos(g,b.uid).card.prepared,preparedB);
    assert.equal(g.state.players[owner].eng,3);assert.equal(g.state.players[owner].god.soul,30);
    g.dispatch({type:'pass'});g.dispatch({type:'engage',uid:third.uid});
    assert.ok(!g.choice.options.some(v=>v.target?.uid===b.uid),'O confronto com Devotee ocupa a capacidade normal.');g.dispose();
  }
});
test('com três inimigos no God, tankar um deixa os outros dois vínculos intactos',()=>{
  const {game:g,a,b,c,d}=fixture([unit('a',2,8),unit('b',2,8)],({add,link})=>{
    const a=add('A','a'),b=add('B','b','battlefield',{prepared:false}),c=add('B','b','battlefield',{prepared:false}),d=add('B','b');
    for(const enemy of [b,c,d])link(enemy,'god-A');return{a,b,c,d};
  });
  command(g,'engage',a.uid,{target:{kind:'card',playerKey:'B',uid:b.uid}});
  assert.equal(g.links('god-A').length,2);assert.equal(g.links(b.uid).length,1);
  assert.ok(g.links(c.uid).some(l=>l.b==='god-A'));assert.ok(g.links(d.uid).some(l=>l.b==='god-A'));
  assert.ok(g.state.log.some(line=>line.includes('takes over the Engage')));g.dispose();
});
test('depois de tankar, Strike do inimigo atinge apenas o protetor e não volta ao God na rodada seguinte',()=>{
  const {game:g,a,b}=fixture([unit('a',2,8),unit('b',3,8)],({add,link})=>{const a=add('A','a','battlefield',{prepared:false}),b=add('B','b');link(b,'god-A');return{a,b};});
  command(g,'engage',a.uid,{target:{kind:'card',playerKey:'B',uid:b.uid}});
  command(g,'strike',b.uid);
  assert.equal(pos(g,a.uid).card.damage,3);assert.equal(pos(g,b.uid).card.damage,2);assert.equal(g.state.players.A.god.soul,30);
  g.dispatch({type:'pass'});g.dispatch({type:'pass'});
  assert.equal(g.state.round,2);assert.equal(g.links('god-A').length,0);assert.equal(g.links(b.uid).length,1);g.dispose();
});
test('inimigo ocupado apenas com outro Devotee continua bloqueado sem capacidade livre',()=>{
  for(const prepared of [true,false]){
    const {game:g,a,b}=fixture([unit('a',1,7),unit('b',1,7)],({add,link})=>{const a=add('A','a'),other=add('A','a'),b=add('B','b','battlefield',{prepared});link(other,b);return{a,b};});
    g.dispatch({type:'engage',uid:a.uid});assert.ok(!g.choice.options.some(v=>v.target?.uid===b.uid));g.dispose();
  }
});
test('preparar o inimigo em resposta não impede assumir o confronto com God',()=>{
  const ready={motor:{habilidades:[{id:'ready',nome_en:'Ready',custo:0,resposta:true,efeitos:[{op:'preparar',alvo:'self'}]}]}};
  const {game:g,a,b}=fixture([unit('a',1,7),unit('b',1,7,[],ready)],({add,link})=>{const a=add('A','a'),b=add('B','b','battlefield',{prepared:false});link(b,'god-A');return{a,b};});
  g.dispatch({type:'engage',uid:a.uid,target:{kind:'card',playerKey:'B',uid:b.uid}});
  assert.ok(g.dispatch({type:'ability',uid:b.uid,abilityId:'ready'}));drain(g);
  assert.equal(pos(g,b.uid).card.prepared,true);assert.equal(g.links('god-A').length,0);assert.equal(g.links(a.uid).length,1);g.dispose();
});
test('Guardian ocupado com God não ganha capacidade para interceptar outras declarações',()=>{
  const {game:g,a,b}=fixture([unit('a',1,7),unit('b',1,7,['Guardian'])],({add,link})=>{const a=add('A','a'),b=add('B','b','battlefield',{prepared:false});link(b,'god-A');return{a,b};});
  g.dispatch({type:'engage',uid:a.uid,target:{kind:'god',playerKey:'B'}});
  assert.equal(g.choice,null);drain(g);assert.equal(g.links('god-B').length,1);assert.equal(g.links(b.uid).length,1);g.dispose();
});
test('tankar preserva outros vínculos de Multiguard e não aumenta sua capacidade',()=>{
  const {game:g,a,b,third,old}=fixture([unit('a',1,8),unit('b',1,8,['Multiguard 2'])],({add,link})=>{
    const a=add('A','a'),old=add('A','a'),third=add('A','a'),b=add('B','b');link(b,'god-A');link(old,b);return{a,b,third,old};
  });
  command(g,'engage',a.uid,{target:{kind:'card',playerKey:'B',uid:b.uid}});
  assert.equal(g.links(b.uid).length,2);assert.equal(g.links('god-A').length,0);assert.equal(g.links(old.uid).length,1);
  g.dispatch({type:'pass'});g.dispatch({type:'engage',uid:third.uid});assert.ok(!g.choice.options.some(v=>v.target?.uid===b.uid));g.dispose();
});
test('Devotee já engajado pode trocar para tankar, pagando 1 ENG e encerrando seu vínculo anterior',()=>{
  const {game:g,a,b,c,old}=fixture([unit('a',1,8),unit('b',1,8)],({add,link})=>{
    const a=add('A','a','battlefield',{prepared:false}),b=add('B','b'),c=add('B','b'),old=link(a,c);link(b,'god-A');return{a,b,c,old};
  });
  command(g,'change-engage',a.uid,{linkId:old.id,target:{kind:'card',playerKey:'B',uid:b.uid}});
  assert.equal(g.state.players.A.eng,2);assert.equal(g.links(c.uid).length,0);assert.equal(g.links('god-A').length,0);
  assert.equal(g.links(a.uid).length,1);assert.equal(pos(g,a.uid).card.prepared,false);g.dispose();
});
test('efeito que troca Engage também substitui o vínculo do inimigo com God',()=>{
  const swap={motor:{habilidades:[{id:'swap',nome_en:'Swap',custo:0,efeitos:[{op:'trocar_engage',alvo:'self'}]}]}};
  const {game:g,a,b,c}=fixture([unit('a',1,8,[],swap),unit('b',1,8)],({add,link})=>{const a=add('A','a'),b=add('B','b'),c=add('B','b');link(a,c);link(b,'god-A');return{a,b,c};});
  assert.ok(g.dispatch({type:'ability',uid:a.uid,abilityId:'swap'}));
  drain(g,choice=>choice.options.find(v=>v.target?.uid===b.uid));
  assert.equal(g.links('god-A').length,0);assert.equal(g.links(c.uid).length,0);assert.equal(g.links(a.uid).length,1);g.dispose();
});
test('troca que perde a elegibilidade na resposta falha sem apagar o vínculo anterior do protetor',()=>{
  const swap={motor:{habilidades:[{id:'swap',nome_en:'Swap',custo:0,resposta:true,efeitos:[{op:'trocar_engage',alvo:'self'}]}]}};
  const {game:g,a,b,c,d,old}=fixture([unit('a',1,8),unit('b',1,8,[],swap)],({add,link})=>{
    const a=add('A','a'),d=add('A','a'),b=add('B','b'),c=add('B','b'),old=link(a,c);link(b,'god-A');return{a,b,c,d,old};
  });
  g.dispatch({type:'change-engage',uid:a.uid,linkId:old.id,target:{kind:'card',playerKey:'B',uid:b.uid}});
  assert.ok(g.dispatch({type:'ability',uid:b.uid,abilityId:'swap'}));
  drain(g,choice=>choice.options.find(v=>v.target?.uid===d.uid));
  assert.ok(g.links(a.uid).some(l=>l.id===old.id));assert.ok(g.links(b.uid).some(l=>[l.a,l.b].includes(d.uid)));
  assert.equal(g.state.players.A.eng,2);g.dispose();
});
test('IA escolhe um alvo legal que ameaça seu God para assumir o confronto',()=>{
  const {game:g,a,b}=fixture([unit('a',1,8),unit('b',1,8)],({add,link})=>{const a=add('A','a'),b=add('B','b');link(b,'god-A');return{a,b};});
  assert.ok(g.stepAI());assert.match(g.choice.prompt,/Engage target/);assert.ok(g.stepAI());drain(g);
  assert.equal(g.links('god-A').length,0);assert.ok(g.links(a.uid).some(l=>[l.a,l.b].includes(b.uid)));g.dispose();
});
test('IA equipa um portador sem armadura e não alterna equipamentos já anexados em ciclo',()=>{
  const {game:g,a,b,e1,e2}=fixture([unit('a',1,8),equipment('one'),equipment('two')],({state,add,link})=>{
    state.players.A.eng=0;const a=add('A','a','battlefield',{prepared:false}),b=add('A','a','battlefield',{prepared:false});link(a,'god-B');link(b,'god-B');
    return{a,b,e1:add('A','one','battlefield',{attachedToUid:a.uid}),e2:add('A','two')};
  });
  assert.ok(g.stepAI());drain(g);assert.equal(pos(g,e1.uid).card.attachedToUid,a.uid);assert.equal(pos(g,e2.uid).card.attachedToUid,b.uid);
  g.dispatch({type:'pass'});assert.ok(g.stepAI());assert.equal(g.state.round,2);assert.equal(g.stack.length,0);g.dispose();
});
