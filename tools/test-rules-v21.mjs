// Critérios 2.1 por comandos públicos; o catálogo real nunca é escrito nos cenários.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,unit,equipment,command,drain,catalog,beta} from './rules-fixture.mjs';
import {createGame} from '../playtest/engine-v2.js';
import {isArmor,validateCard,validateVanillaSet,validateDeck} from '../shared/card-model.js';
import {paymentPlans,paymentUnit,resonantWearer} from '../shared/rules-policy.js';
const spell=(id,type='Moment',cost=1)=>({id,nome_exibicao_en:id,tipo:type,faccao:'Athena',custo:cost,motor:{efeitos:[]}});
const base=(add,key,n)=>{for(let i=0;i<n;i++)add(key,'sst-01-001','cosmo_base');};
const target=(key,i)=>({kind:'card',playerKey:key,uid:i.uid});
for(const type of ['Devotee','Armor','Ultimate','TechniqueAction','TechniqueResponse','Moment','Weapon','Equip','Transfer','Evolve','Ability'])test(`matriz central: ${type}`,()=>{
 const c=type==='Devotee'?unit('u',1,3):type==='Armor'?equipment('e'):type==='TechniqueResponse'||type==='TechniqueAction'?spell('s','Technique'):spell('s');
 const commandType={Ultimate:'ultimate',Equip:'equip',Transfer:'equip',Evolve:'evolve',Ability:'ability'}[type]||'play';
 const u=paymentUnit(commandType,c,type==='TechniqueResponse');
 const expected=['Devotee','Armor','Ultimate'].includes(type)?'base_cosmo':type==='TechniqueResponse'?'latent_cosmo':'cosmo';assert.equal(u,expected);
 assert.equal(paymentPlans({base:0,latent:3,temporary:0},[{amount:1,unit:u}]).length>0,expected!=='base_cosmo');
 assert.equal(paymentPlans({base:3,latent:0,temporary:0},[{amount:1,unit:u}]).length>0,expected!=='latent_cosmo');
});
for(const c of [unit('u',1,4,[],{custo:2}),equipment('e',1,{custo:2})])test(`engine recusa Latent ao jogar ${c.tipo} sem Base e aceita Base`,()=>{
 for(const bases of [0,2]){const {game:g,s}=fixture([c],({state,add})=>{state.players.A.latent=3;base(add,'A',bases);return{s:add('A',c.id,'hand')};});try{const before=g.state;assert.equal(g.canPlay('A',s.uid),bases===2);assert.equal(g.dispatch({type:'play',uid:s.uid,equipTo:null}),bases===2);if(bases){drain(g);assert.equal(g.state.players.A.latent,3);assert.equal(g.available('A','base_cosmo'),0);}else assert.deepEqual(g.state,before);}finally{g.dispose();}}
});
test('Ultimate preserva Base-only, requisitos e gasto único',()=>{
 const hero=unit('hero',1,8,[],{ultimate:{custo:2,efeitos:[]}});
 for(const n of [0,2]){const {game:g,a}=fixture([hero],({state,add})=>{state.players.A.latent=3;base(add,'A',n);return{a:add('A','hero')};});assert.equal(g.actions('A',a.uid).some(a=>a.type==='ultimate'),n===2);assert.equal(g.dispatch({type:'ultimate',uid:a.uid}),n===2);if(n){drain(g);assert.equal(g.state.players.A.latent,3);assert.equal(g.available('A','base_cosmo'),0);}g.dispose();}
});
test('Technique resposta usa apenas Latent; Action admite mistura',()=>{
 const t=spell('tech','Technique',2);
 for(const response of [false,true])for(const latent of [0,1,2]){const {game:g,s,a}=fixture([t,unit('u',1,10)],({state,add})=>{const key=response?'B':'A';base(add,key,2);state.players[key].latent=latent;return{s:add(key,'tech','hand'),a:add('A','u')};});if(response)g.dispatch({type:'strike',uid:a.uid,target:{kind:'god',playerKey:'B'}});const key=response?'B':'A';assert.equal(g.dispatch({type:'play',uid:s.uid,playerKey:key}),!response||latent===2);if(!response||latent===2){drain(g);assert.equal(g.available(key,'base_cosmo'),response?2:latent===0?0:latent===1?1:2);assert.equal(g.state.players[key].latent,response?0:Math.max(0,latent-2));}g.dispose();}
});
test('jogar Armor + Equip valida os dois custos atomicamente e não lava Latent no custo Base',()=>{
 const c=equipment('gear',1,{custo:2,equipar_custo:1,equipar_custo_outros:5,donos:['hero']});
 for(const bases of [1,2]){const {game:g,s,a}=fixture([c,unit('hero',1,10,[],{personagem_id:'hero'})],({state,add})=>{base(add,'A',bases);state.players.A.latent=2;return{s:add('A','gear','hand'),a:add('A','hero')};});const before=g.state;assert.equal(g.dispatch({type:'play',uid:s.uid,equipTo:a.uid}),bases===2);if(bases===1)assert.deepEqual(g.state,before);else{drain(g);assert.equal(g.state.players.A.latent,1);assert.equal(g.locate(s.uid).card.attachedToUid,a.uid);}g.dispose();}
});
test('Pass fecha Actions, adversário continua, ambos passam; prioridade é distinta',()=>{
 const {game:g,a,b,b2}=fixture([unit('u',1,10)],({add})=>({a:add('A','u'),b:add('B','u'),b2:add('B','u')}));
 assert.ok(g.dispatch({type:'pass',playerKey:'A'}));assert.equal(g.state.players.A.passed,true);
 assert.equal(g.actions('A',a.uid).length,0);assert.equal(g.dispatch({type:'strike',playerKey:'A',uid:a.uid,target:{kind:'god',playerKey:'B'}}),false);
 for(const bcard of [b,b2]){assert.ok(g.dispatch({type:'strike',uid:bcard.uid,target:{kind:'god',playerKey:'A'}}));assert.equal(g.state.players.A.passed,true);assert.ok(g.dispatch({type:'pass-priority'}));assert.equal(g.state.passes,1);drain(g);assert.equal(g.actingPlayer,'B');assert.equal(g.state.round,1);}
 assert.ok(g.dispatch({type:'pass'}));assert.equal(g.state.round,2);assert.equal(g.state.players.A.passed,false);g.dispose();
});
test('jogador que passou ainda responde com Technique e continua passado',()=>{
 const t=spell('answer','Technique',1);const {game:g,a,s}=fixture([t,unit('u',1,9)],({state,add})=>{state.players.A.latent=1;return{a:add('B','u'),s:add('A',t.id,'hand')};});
 g.dispatch({type:'pass'});g.dispatch({type:'strike',uid:a.uid,target:{kind:'god',playerKey:'A'}});assert.equal(g.actingPlayer,'A');assert.ok(g.canPlay('A',s.uid));command(g,'play',s.uid);assert.equal(g.actingPlayer,'B');assert.equal(g.state.players.A.passed,true);assert.equal(g.state.players.A.latent,0);g.dispose();
});
test('Latent persiste, conversão é opcional, limitada a 3 e Bases renovam sem perda',()=>{
 for(const bank of [0,1,2]){const {game:g}=fixture([],({state,add})=>{state.players.A.domainId='athena-051';state.players.A.latent=1;base(add,'A',4);state.players.B.latent=3;});g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.state.phase,'end');assert.equal(g.choice.options.length,3);g.dispatch({type:'choose',optionId:String(bank)});assert.equal(g.state.round,2);assert.equal(g.state.players.A.latent,1+bank);assert.equal(g.state.players.B.latent,3);assert.equal(g.available('A','base_cosmo'),4);assert.equal(g.state.players.A.zones.cosmo_base.length,4);g.dispose();}
});
test('Cosmo temporário paga genérico, não Base-only, não converte e expira',()=>{
 const s=spell('temporary','Moment',0);s.motor.efeitos=[{op:'cosmo_temporario',n:4}];const {game:g,c,u}=fixture([s,unit('u',1,4,[],{custo:1})],({state,add})=>{state.players.A.domainId='athena-051';return{c:add('A',s.id,'hand'),u:add('A','u','hand')};});command(g,'play',c.uid);assert.equal(g.available('A'),4);assert.equal(g.available('A','base_cosmo'),0);assert.equal(g.canPlay('A',u.uid),false);g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.state.round,2);assert.equal(g.state.players.A.latent,0);assert.equal(g.available('A'),0);g.dispose();
});
test('Bases temporárias não entram na conversão',()=>{const {game:g}=fixture([],({state,add})=>{state.players.A.domainId='athena-051';add('A','sst-01-001','cosmo_base',{temporary:true});});g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.choice,null);assert.equal(g.state.players.A.latent,0);g.dispose();});
test('ganho por dano continua limitado e prevenção total não produz Latent',()=>{
 const hit=spell('hit','Moment',0);hit.motor.efeitos=[{op:'dano_area',n:1}];const {game:g,s}=fixture([hit,unit('u',1,10)],({state,add})=>{state.players.B.latent=3;add('B','u');return{s:add('A','hit','hand')};});command(g,'play',s.uid);assert.equal(g.state.players.B.latent,3);g.dispose();
});
test('sorteado escolhe iniciativa; perdedor ganha 1 Latent independente de quem começa',()=>{
 for(const roll of [.1,.9])for(const first of ['A','B']){const g=createGame({cards:catalog,beta,settings:{ai:false,autoPass:false},random:()=>roll});g.dispatch({type:'start',deckAId:beta.decks[0].id,deckBId:beta.decks[0].id,ai:false});const winner=roll<.5?'A':'B',loser=winner==='A'?'B':'A';assert.equal(g.choice.playerKey,winner);assert.equal(g.state.players[loser].latent,1);assert.equal(g.state.players[winner].latent,0);g.dispatch({type:'choose',optionId:first});g.dispatch({type:'choose',optionId:'keep'});g.dispatch({type:'choose',optionId:'keep'});assert.equal(g.actingPlayer,first);g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.notEqual(g.actingPlayer,first);g.dispose();}
});
for(const subtype of ['Cloth','Scale','Surplice','Warplate','Moonplate'])test(`${subtype}: Armor, qualquer patente, múltiplos portadores exatos e Equip 1/5`,()=>{
 const gear=equipment('armor',2,{subtipos:[subtype],equipar_custo:1,equipar_custo_outros:5,donos:['hero','second'],ressonancias:[{personagem_id:'hero',habilidades:[{id:'res',custo:0,efeitos:[]}]}]});
 for(const id of ['hero','second','wrong']){const c=unit(id,1,8,[],{personagem_id:id,subtipos:['Bronze Saint']});const {game:g,e,a}=fixture([gear,c],({state,add})=>{base(add,'A',2);state.players.A.latent=3;return{e:add('A','armor'),a:add('A',id)};});assert.equal(isArmor(gear),true);assert.equal(g.equipCost(e.uid,a.uid),id==='wrong'?5:1);command(g,'equip',e.uid,{target:target('A',a)});assert.equal(g.locate(e.uid).card.attachedToUid,a.uid);g.dispatch({type:'pass'});assert.equal(g.actions('A',e.uid).some(a=>a.abilityId==='res'),id==='hero');assert.equal(g.stats(a.uid).maxHP,10);g.dispose();}
});
test('V1 no Devotee não ocupa slot; V2 substitui só Armor preservando arma/acessório',()=>{
 const u=unit('hero',1,10,[],{versao_armadura:1,subtipos:['Cloth']}),v2=equipment('v2',2,{versao_armadura:2}),v3=equipment('v3',3),weapon=equipment('weapon',0,{slot_equipamento:'arma',subtipos:['Weapon']}),accessory=equipment('accessory',0,{slot_equipamento:'acessorio',subtipos:['Equipment']});
 const {game:g,a,e,newE}=fixture([u,v2,v3,weapon,accessory],({add})=>{const a=add('A','hero'),e=add('A','v2');add('A','weapon','battlefield',{attachedToUid:a.uid});add('A','accessory','battlefield',{attachedToUid:a.uid});return{a,e,newE:add('A','v3')};});assert.equal(isArmor(u),false);command(g,'equip',e.uid,{target:target('A',a)});g.dispatch({type:'pass'});command(g,'equip',newE.uid,{target:target('A',a)});assert.equal(g.equipment(a.uid).length,3);assert.equal(g.locate(e.uid).card.attachedToUid,null);assert.equal(g.locate(a.uid).cardData.versao_armadura,1);assert.ok(validateCard({...v2,versao_armadura:1}).length);g.dispose();
});
for(const faction of ['Athena','Poseidon','Hades','Ares','Artemis'])test(`${faction}: quatro estágios, salto permitido ou sequência explícita`,()=>{
 for(const sequential of [false,true]){const c=equipment('progress',1,{faccao:faction,donos:[],estagios:[{nome:'Vanilla',bonus_poder:0,bonus_vida:1},{nome:'II',custo:1},{nome:'III',custo:2},{nome:'IV',custo:3,exige_sequencia:sequential,bonus_poder:4,bonus_vida:5}]});const {game:g,e,a}=fixture([c,unit('u',1,10)],({state,add})=>{state.players.A.latent=3;const a=add('A','u');return{a,e:add('A','progress','battlefield',{attachedToUid:a.uid})};});assert.equal(g.dispatch({type:'evolve',uid:e.uid,stage:3}),!sequential);if(!sequential){drain(g);assert.equal(g.locate(e.uid).card.stage,3);assert.equal(g.stats(a.uid).power,5);assert.equal(g.stats(a.uid).maxHP,15);}g.dispose();}
});
test('composição Vanilla e origem têm validação, sem inventar cartas ou restringir decks',()=>{
 assert.equal(validateVanillaSet(catalog).pending.length,10);assert.equal(validateVanillaSet(catalog).complete,false);
 const c={...equipment('divine'),conjunto:'vanilla',categoria_conjunto:'god_armor'};assert.equal(validateVanillaSet([c,{...c,id:'other'}]).errors.length,1);assert.deepEqual(validateDeck(beta.decks[0],catalog),[]);
 assert.ok(validateCard({...unit('source',1,3),origem_personagem:'MITOLOGIA ADAPTADA'}).length);assert.deepEqual(validateCard({...unit('source',1,3),origem_personagem:'MITOLOGIA ADAPTADA',referencias_mitologicas:['referência documentada']}),[]);
 assert.equal(resonantWearer({donos:['pegasus-seiya']},{personagem_id:'seiya'}),false);
});
test('resposta a gatilho de fim não deixa AÇÃO antiga presa na rodada seguinte',()=>{
 const support={...spell('end-trigger','Support',0),motor:{gatilhos:[{evento:'fim_rodada',efeitos:[{op:'alma',n:1,alvo:'jogador'}]}]}};
 const technique=spell('end-response','Technique',1);
 const {game:g,s,a}=fixture([support,technique,unit('round-unit',1,9)],({state,add})=>{state.players.B.latent=1;add('A',support.id);return{s:add('B',technique.id,'hand'),a:add('A','round-unit')};});
 g.dispatch({type:'pass'});g.dispatch({type:'pass'});assert.equal(g.state.phase,'end');assert.ok(g.stack.length);
 while(g.actingPlayer!=='B')g.dispatch({type:'pass-priority'});
 assert.ok(g.dispatch({type:'play',playerKey:'B',uid:s.uid}));drain(g);assert.equal(g.state.round,2);
 assert.equal(g.actingPlayer,'B');g.dispatch({type:'pass'});command(g,'strike',a.uid,{target:{kind:'god',playerKey:'B'}});assert.equal(g.actingPlayer,'A');assert.equal(g.state.players.B.passed,true);g.dispose();
});
test('pagamento misto consome Cosmo temporário antes de Base/Latent, sem armazená-lo',()=>{
 const {game:g,s}=fixture([spell('generic','Moment',2)],({state,add})=>{state.players.A.temporaryCosmo=2;state.players.A.latent=1;base(add,'A',1);return{s:add('A','generic','hand')};});command(g,'play',s.uid);assert.equal(g.state.players.A.temporaryCosmo,0);assert.equal(g.state.players.A.latent,1);assert.equal(g.available('A','base_cosmo'),1);g.dispose();
});
test('prevenção total não gera Latent por dano; dano efetivo respeita o limite',()=>{
 const damage=spell('prevented','Moment',0);damage.motor.efeitos=[{op:'dano_area',n:1}];
 const {game:g,s}=fixture([damage,unit('protected',1,8)],({add})=>{add('B','protected','battlefield',{modifiers:[{prevent:2}]});return{s:add('A','prevented','hand')};});command(g,'play',s.uid);assert.equal(g.state.players.B.latent,0);assert.equal(g.state.players.B.zones.battlefield[0].damage,0);g.dispose();
});
for(const subtype of ['Cloth','Scale','Surplice','Warplate','Moonplate'])test(`Living Armor ${subtype}: HP separado, Broken permanece e Repair restaura`,()=>{
 const gear=equipment('living',2,{vida:3,subtipos:[subtype],motor:{habilidades_portador:[{id:'granted',custo:0,efeitos:[]}]}});
 const damage=spell('armor-hit','Moment',0);damage.motor.efeitos=[{op:'dano',n:3,alvo:{zona:'battlefield',armadura:true,lado:'aliado'}}];
 const repair=spell('repair','Moment',0);repair.motor.efeitos=[{op:'reparar',n:2,alvo:{zona:'battlefield',armadura:true,lado:'aliado'}}];
 const {game:g,a,e,d,r}=fixture([gear,damage,repair,unit('wearer',1,10)],({add})=>{const a=add('A','wearer');return{a,e:add('A','living','battlefield',{attachedToUid:a.uid}),d:add('A','armor-hit','hand'),r:add('A','repair','hand')};});
 assert.equal(g.stats(a.uid).maxHP,12);command(g,'play',d.uid);assert.equal(g.stats(e.uid).broken,true);assert.equal(g.locate(e.uid).zone,'battlefield');assert.equal(g.locate(a.uid).card.damage,0);assert.equal(g.stats(a.uid).maxHP,10);
 g.dispatch({type:'pass'});assert.equal(g.actions('A',a.uid).some(a=>a.abilityId==='granted'),false);command(g,'play',r.uid);assert.equal(g.stats(e.uid).hp,2);assert.equal(g.stats(e.uid).broken,false);assert.equal(g.stats(a.uid).maxHP,12);g.dispose();
});
test('morte do portador, herança, Vanilla e rodadas preservam dano próprio de Armor',()=>{
 const armor=equipment('inherit',2,{vida:6});const {game:g,a,b,e}=fixture([armor,unit('wearer',1,4),spell('unused')],({add})=>{const a=add('A','wearer','battlefield',{damage:1}),b=add('A','wearer');return{a,b,e:add('A','inherit','battlefield',{attachedToUid:a.uid,damage:4,stage:1})};});
 command(g,'unequip',e.uid);assert.equal(g.stats(e.uid).damage,4);assert.equal(g.locate(e.uid).card.stage,0);g.dispatch({type:'pass'});command(g,'equip',e.uid,{target:target('A',b)});assert.equal(g.stats(e.uid).damage,4);assert.equal(g.stats(e.uid).hp,2);
 g.dispatch({type:'pass'});drain(g);assert.equal(g.stats(e.uid).damage,4);g.dispose();
});
test('Broken não destrói Armor, suspende bônus de HP e pode derrubar portador já ferido',()=>{
 const armor=equipment('broken',3,{vida:2});const d=spell('break-armor','Moment',0);d.motor.efeitos=[{op:'dano',n:9,alvo:{zona:'battlefield',armadura:true}}];
 const {game:g,a,e,s}=fixture([armor,d,unit('fragile',1,2)],({add})=>{const a=add('A','fragile','battlefield',{damage:4});return{a,e:add('A','broken','battlefield',{attachedToUid:a.uid,stage:1}),s:add('A',d.id,'hand')};});
 command(g,'play',s.uid);assert.equal(g.locate(a.uid).zone,'tartarus');assert.equal(g.locate(e.uid).zone,'battlefield');assert.equal(g.locate(e.uid).card.attachedToUid,null);assert.equal(g.stats(e.uid).damage,2);assert.equal(g.stats(e.uid).broken,true);assert.equal(g.locate(e.uid).card.stage,0);g.dispose();
});
test('cura de Devotee não repara Armor; reparar não cura Devotee',()=>{
 const gear=equipment('hurt-armor',2,{vida:5}),heal=spell('heal-bearer','Moment',0),repair=spell('repair-only','Moment',0);
 heal.motor.efeitos=[{op:'curar',n:9,alvo:{zona:'battlefield',tipo:'Devotee',lado:'aliado'}}];repair.motor.efeitos=[{op:'reparar',n:9,alvo:{zona:'battlefield',armadura:true,lado:'aliado'}}];
 const {game:g,a,e,h,r}=fixture([gear,heal,repair,unit('hurt-wearer',1,10)],({add})=>{const a=add('A','hurt-wearer','battlefield',{damage:3});return{a,e:add('A','hurt-armor','battlefield',{attachedToUid:a.uid,damage:4}),h:add('A',heal.id,'hand'),r:add('A',repair.id,'hand')};});
 command(g,'play',r.uid);assert.equal(g.stats(e.uid).hp,5);assert.equal(g.stats(a.uid).damage,3);g.dispatch({type:'pass'});command(g,'play',h.uid);assert.equal(g.stats(a.uid).damage,0);assert.equal(g.stats(e.uid).damage,0);g.dispose();
 const {game:pending,e:pe}=fixture([equipment('unreviewed')],({add})=>({e:add('A','unreviewed','battlefield',{damage:2})}));assert.equal(pending.stats(pe.uid).maxHP,null);assert.equal(pending.stats(pe.uid).broken,false);assert.equal(pending.stats(pe.uid).damage,2);pending.dispose();
});
