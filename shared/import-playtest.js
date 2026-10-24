// Compilação explícita do primeiro conjunto. A engine consome operações estruturadas, não inglês.
import {slug,validateCard} from './card-model.js?v=20261024-3';
import {PLAYTEST_SIGNATURES} from './playtest-signatures.js?v=20261024-3';
import {reviseCard} from './card-revisions.js?v=20261024-3';
const unit=(lado='qualquer',extra={})=>({zona:'battlefield',tipo:'Devotee',lado,...extra});
const equip=(lado='qualquer',extra={})=>({zona:'battlefield',equipamento:true,lado,...extra});
const base=(lado='aliado',extra={})=>({zona:'cosmo_base',lado,...extra});
const dead=(lado='aliado',extra={})=>({zona:'tartarus',tipo:'Devotee',lado,...extra});
const effect=(op,n,alvo,extra={})=>({op,...(n!==null?{n}:{}),...(alvo?{alvo}:{}),...extra});
const buff=(p=0,h=0,alvo=unit('aliado'),duracao='rodada')=>effect('atributo',null,alvo,{poder:p,vida:h,duracao});
const draw=n=>effect('comprar',n,'jogador');
const loot=(n=1,destino='tartarus')=>[draw(n),effect('descartar',1,'jogador',{destino})];
const discount=(tipo,n,extra={})=>effect('desconto',n,'jogador',{tipo,...extra});
const trigger=(evento,efeitos,extra={})=>({evento,efeitos,...extra});
const optional=(custo,efeitos)=>({op:'opcional',custo,efeitos});
const spy=(n,modo='espiar')=>effect('olhar',n,'jogador',{modo});
// Posições que mexiam em Engage: o programa final vem de card-revisions.js (24/10/2026).
const revised=[];
const keyword=(nome,alvo,duracao='strike')=>effect('keyword',null,alvo,{nome,duracao});
const damage=(n,alvo,extra={})=>effect('dano',n,alvo,extra);
const ready=(alvo,extra={})=>effect('preparar',null,alvo,extra);
const armorNames=new Set(['Pegasus Cloth','Dragon Cloth','Cygnus Cloth','Andromeda Cloth','Phoenix Cloth','Virgo Gold Cloth','Libra Gold Cloth','Aries Gold Cloth','Leo Gold Cloth','Sagittarius Gold Cloth','Sea Dragon Scale','Siren Scale','Seahorse Scale','Scylla Scale','Chrysaor Scale','Kraken Scale','Lymnades Scale','Mermaid Scale','Oceanic Armor','Wyvern Surplice','Griffon Surplice','Garuda Surplice','Gemini Surplice','Aquarius Surplice','Capricorn Surplice','Aries Surplice','Papillon Surplice','Sphinx Surplice','Flame Warplate','Steel Warplate','Blood Warplate','Ash Warplate','Fury Warplate','War Champion Armor','Nightwatch Armor','Chosen Moonplate']);
const weapons=new Set(['Trident Guard','Discord Blade','Ruin Shield','Vengeance Spear','Lunar Bow','Bronze Buckler','Temple Shield','Sparring Gloves']);
const spells={
  Athena:{Technique:[ [effect('prevenir',2,unit(),{duracao:'strike'})],[buff(2,0,unit('aliado'),'strike')],[effect('curar',2,unit('aliado'))],[keyword('Guardian',unit('aliado'),'rodada')],[ready(unit('aliado',{nao_strike:true}))] ],Moment:[[effect('alma',2,'jogador')],loot(2),[effect('mover',null,{zona:'tartarus',equipamento:true,subtipo:'Cloth',lado:'aliado'},{destino:'hand'})],[buff(0,2)],[discount('Cloth',2)]]},
  Poseidon:{Technique:[revised,[buff(-2,0,unit('inimigo'),'strike')],[effect('esgotar',null,unit('inimigo'))],[damage(2,unit())],[effect('mover',null,equip('qualquer',{sem_portador:true}),{destino:'hand'})]],Moment:[[effect('esgotar',null,base('inimigo'))],[draw(1),effect('descartar',1,'oponente')],revised,[buff(-2,0,unit('inimigo'))],[damage(2,unit('inimigo'))]]},
  Hades:{Technique:[[effect('retornar',null,dead('aliado',{custo_max:2}))],[damage(2,unit()),effect('alma',-1,'jogador')],[buff(-2,0,unit('inimigo'),'strike')],[effect('mover',null,dead(),{destino:'deck_bottom'}),draw(1)],[effect('mover',null,equip('qualquer',{dano_portador_min:3}),{destino:'tartarus',destruicao:true})]],Moment:[[effect('mover',null,dead('aliado',{custo_max:2}),{destino:'hand'})],loot(2),[effect('mover',null,dead('qualquer'),{destino:'deck_bottom'})],[discount('Afterlife',1)],revised]},
  Ares:{Technique:[[buff(3,0,unit('aliado'),'strike')],[damage(2,unit()),effect('alma',-1,'jogador')],[ready(unit('aliado',{nao_strike:true}))],[effect('remover_guardian',null,unit('inimigo'),{duracao:'rodada'})],[keyword('Pierce',unit('aliado'))]],Moment:[[damage(2,unit('inimigo'))],[buff(1,0,'aliados')],[draw(2),effect('alma',-2,'jogador')],[discount('Devotee',2)],revised]},
  Artemis:{Technique:[[spy(3,'cosmoble')],[keyword('Long Range',unit('aliado'))],[ready(base())],[effect('prevenir',2,unit('aliado'),{duracao:'strike'})],[effect('mover',null,unit('aliado'),{destino:'hand'})]],Moment:[[effect('base_extra',null)],[draw(2),effect('descartar',1,'jogador',{destino:'deck_bottom'})],[ready(base(),{max:2})],[spy(4,'escolher_mao')],[effect('prevenir',3,'god_aliado',{duracao:'rodada'})]]},
  Neutral:{Technique:[[buff(1,0,unit(),'strike')],[effect('prevenir',1,unit(),{duracao:'strike'})],loot(1),[effect('curar',1,unit())],[buff(0,2,unit())]],Moment:[[draw(1)],[effect('alma',1,'jogador')],[effect('curar',1,unit())],[ready(base())],[effect('comprar',1,'ambos')]]},
};
function unitProgram(faction,n) {
  const m={efeitos:[],gatilhos:[],passivas:[],habilidades:[],keywords:[]};
  const entry=effects=>m.gatilhos.push(trigger('entrada',effects,{escopo:'self'}));
  const death=effects=>m.gatilhos.push(trigger('destruido',effects,{escopo:'self'}));
  const own=(event,effects,extra={})=>m.gatilhos.push(trigger(event,effects,{escopo:'self',...extra}));
  const kw=k=>m.keywords.push(k);
  if(faction==='Athena'){
    if(n===1)entry([effect('curar',1,unit('qualquer',{outro:true}))]);
    if(n===2)kw('Guardian');
    if(n===3)entry([ready(unit('qualquer',{outro:true,nao_strike:true}))]);
    if(n===4)own('strike_sobreviveu',[effect('curar',1,'self')]);
    if(n===5)death([buff(1,0,unit('aliado',{outro:true}))]);
    if(n===6){kw('Guardian');entry([effect('alma',2,'jogador')]);}
    if(n===7)entry([effect('mover',null,equip('aliado',{subtipo:'Cloth'}),{destino:'hand'})]);
    if(n===8)entry([discount('Cloth',1)]);
    if(n===9)own('strike_declarado',[effect('prevenir',2,'self',{duracao:'strike',retaliacao:true})],{contra_god:true});
    if(n===10){kw('Guardian');death([draw(1)]);}
  }else if(faction==='Poseidon'){
    ({1:()=>kw('Pierce'),2:()=>kw('Nimble'),3:()=>kw('Long Range'),4:()=>kw('Impulse'),5:()=>m.passivas.push({tipo:'protecao_technique'}),6:()=>entry([effect('esgotar',null,unit('inimigo'))]),7:()=>entry([{op:'mover_dano',n:1,origem:unit('aliado'),destino:unit('inimigo')}]),8:()=>kw('Guardian'),9:()=>entry([effect('esgotar',null,base('inimigo'),{escolhe:'oponente'})]),10:()=>entry(revised)})[n]?.();
  }else if(faction==='Hades'){
    if([1,4,7].includes(n))m.habilidades.push({id:'afterlife',nome_en:'Afterlife',zona:'tartarus',custo:({1:2,4:3,7:4})[n],limite_partida:1,efeitos:[effect('retornar',null,'self')]});
    if(n===2)entry([buff(-1,0,unit('inimigo'))]);
    if(n===3)death(loot());
    if(n===5)entry([damage(1,unit())]);
    if(n===6)death([discount('Devotee',1)]);
    if(n===8)entry([damage(1,unit('qualquer',{prepared:true}))]);
    if(n===9)death([spy(2,'top_bottom')]);
    if(n===10)m.habilidades.push({id:'afterlife',nome_en:'Afterlife',zona:'tartarus',custo:2,limite_partida:1,efeitos:[draw(1),effect('mover',null,'self',{destino:'void'})]});
  }else if(faction==='Ares'){
    if([1,9].includes(n))kw('Impulse');
    if(n===2)own('strike_declarado',[buff(1,0,'self','strike')]);
    if(n===3)kw('Pierce');
    if(n===4)entry([damage(1,'self'),damage(1,unit('inimigo'))]);
    if(n===5)own('dano_recebido',[buff(1,0,'self')]);
    if(n===6)entry([buff(2,0,unit('aliado',{outro:true}))]);
    if(n===7)death([damage(1,unit('inimigo'))]);
    if(n===8)own('matou',[ready('self')],{limite_rodada:1});
    if(n===9)own('strike_fim',[damage(1,'self')],{iniciador:true});
    if(n===10)entry([buff(1,0,'aliados')]);
  }else if(faction==='Artemis'){
    if(n===1)entry([spy(2,'top_bottom')]);
    if(n===2)kw('Long Range');
    if(n===3)kw('Guardian');
    if(n===4)entry([discount('Technique',1)]);
    if(n===5)own('strike_declarado',[optional(1,[buff(2,0,'self','strike')])]);
    if(n===6)entry([ready(base())]);
    if(n===7)entry([spy(3,'ordenar')]);
    if(n===8)kw('Nimble');
    if(n===9)own('alvo_technique',[optional(1,[effect('anular',null,'evento')])]);
    if(n===10)entry([effect('base_extra',null,null,{opcional:true})]);
  }else{
    if(n===1)entry(loot());
    if(n===2)entry([effect('curar',2,unit())]);
    if(n===3)own('strike_declarado',[buff(1,0,'self','strike')]);
    if(n===4)entry([spy(1)]);
    if(n===5)entry([ready(base())]);
    if(n===6)kw('Guardian');
    if(n===7)entry([buff(0,1)]);
    if(n===8)entry([effect('comprar',1,'ambos')]);
    if(n===9)death(loot());
    if(n===10){kw('Guardian');entry([effect('alma',1,'jogador')]);}
  }
  return m;
}
function supportProgram(faction,n,cost) {
  const k=(n-41)%5,m={efeitos:[],passivas:[],gatilhos:[],habilidades:[{id:'support',nome_en:'Support',zona:'battlefield',custo:cost,limite_rodada:1,efeitos:[buff(0,1)]}]};
  const trig=(evento,efeitos,extra={})=>m.gatilhos.push(trigger(evento,efeitos,{escopo:'aliado',...extra}));
  const pass=(tipo,extra={})=>m.passivas.push({tipo,...extra});
  if(faction==='Athena'){
    if(k===0)trig('strike_sobreviveu',[effect('curar',1,'evento')],{limite_rodada:1});
    if(k===1)pass('desconto_primeiro',{carta:'Cloth',n:1});
    if(k===2)trig('destruido',[draw(1)],{keyword:'Guardian'});
    if(k===3)trig('evoluiu',[effect('alma',1,'jogador')],{limite_rodada:1});
    if(k===4)pass('aura_cloth',{vida:1});
  }else if(faction==='Poseidon'){
    if(k===0)pass('troca_gratis',{limite_rodada:1}); // substituída em card-revisions.js
    if(k===1)pass('reduzir_engajados_marinas',{poder:-1});
    if(k===2)pass('desconto_primeiro',{carta:'Scale',n:1});
    if(k===3)trig('esgotou',loot(),{escopo:'inimigo',limite_rodada:1});
    if(k===4)pass('desconto_primeiro',{carta:'Technique',n:1});
  }else if(faction==='Hades'){
    if(k===0||k===4)pass('desconto_primeiro',{carta:k===0?'Afterlife':'Retorno',n:1});
    if(k===1)trig('tartarus',loot(),{limite_rodada:1});
    if(k===2)trig('retorno',[buff(0,1,'evento')]);
    if(k===3)m.habilidades.push({id:'look',nome_en:'Look at the top card',zona:'battlefield',custo:0,limite_rodada:1,efeitos:[spy(1)]});
  }else if(faction==='Ares'){
    if(k===0)pass('aura_strike',{poder:1});
    if(k===1)trig('destruido',[damage(1,unit('inimigo'))],{limite_rodada:1});
    if(k===2)pass('desconto_primeiro',{carta:'Technique',n:1,atacando:true});
    if(k===3)trig('matou',[effect('alma',1,'jogador')],{limite_rodada:1});
    if(k===4)pass('desconto_primeiro',{carta:'Devotee',n:1});
  }else if(faction==='Artemis'){
    if(k===0)pass('desconto_primeiro',{carta:'Technique',n:1});
    if(k===1)trig('base_colocada',[spy(1)],{limite_rodada:1});
    if(k===2)trig('entrada',[buff(0,1,'evento')],{limite_rodada:1});
    if(k===3)trig('base_preparada',loot(),{limite_rodada:1});
    if(k===4)pass('prevenir_god',{n:1,limite_rodada:1});
  }else{
    if(k===0)trig('jogar',[spy(1)],{tipo:'Devotee',limite_rodada:1,opcional:true});
    if(k===1)trig('destruido',loot(),{escopo:'qualquer',efeito_controlador_evento:true,opcional:true,limite_rodada:1});
    if(k===2)pass('desconto_primeiro',{carta:'Equipment',faccao:'Neutral',n:1});
    if(k===3)m.habilidades.push({id:'heal',nome_en:'Remove 1 damage',zona:'battlefield',custo:1,limite_rodada:1,efeitos:[effect('curar',1,unit())]});
    if(k===4)trig('jogar',[effect('alma',1,'jogador')],{faccao:'Neutral',limite_rodada:1});
  }
  return m;
}
export async function compilePlaytestRow(row,source={}) {
  const raw=row['Rules Text (EN draft)'],name=row.Name,f=row.Faction,n=Number(row.ID.split('-')[2]);
  const fingerprint=[row.Faction,row.Type,row.Name,raw].join('\n');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint))),n=>n.toString(16).padStart(2,'0')).join('');
  if(PLAYTEST_SIGNATURES[row.ID]!==digest)throw new Error(`${row.ID}: texto, nome ou tipo diferente do conjunto revisado; requer revisão do mapeamento mecânico`);
  const c={id:row.ID.toLowerCase(),id_fonte:row.ID,conjunto:'sstcg-playtest-300',revisao_regras:'2.0',revisao:1,nome_interno_pt:'',nome_exibicao_en:name,faccao:f,tipo:row.Type,subtipos:[],raridade:'Playtest',status:'needs-review',cosmoble:row.Cosmoble==='Yes',caminho_imagem:null,custo:row['Cosmo Cost'],unidade_custo:'cosmo',power:row.Power,vida:row.HP,soul:null,attack:null,equipar_custo:null,keywords_en:[],habilidades_en:[raw],habilidade_awaken_en:'',ultimate_en:'',personagem_id:null,donos:[],ressonancias:[],estagios:[],slot_equipamento:null,origem:{arquivo:source.arquivo_fonte,sha256:source.sha256_fonte,...row.origem,texto_en:raw,status_design:row['Design Status']},notas_pt:'Conceito de playtest fornecido pelo autor; balanceamento não testado.'};
  if(c.tipo==='Devotee'){
    c.motor=unitProgram(f,n);c.keywords_en=c.motor.keywords||[];delete c.motor.keywords;
    c.personagem_id=slug(name);c.personagem_unico=f==='Athena'||f==='Hades'||(f==='Poseidon'&&n<10);
    if(f==='Poseidon'&&n!==9)c.subtipos.push('Marina');
    if(f==='Hades')c.subtipos.push('Specter');
    if(f==='Athena')c.subtipos.push(n<6?'Bronze Saint':'Gold Saint');
    if(c.id==='sst-03-010'){c.habilidades_en=['Afterlife — ACTION, pay 2 Cosmo: Draw 1 card, then exile this card from Tartarus to the Void. Once per game.'];c.notas_pt+=' Destino corrigido para Void por aprovação expressa do autor em 23/10/2026.';}
  }else if(c.tipo==='Equipment'){
    const b=raw.match(/Equip: \+(\d+) Power \/ \+(\d+) HP/);if(!b)throw new Error(`Bônus de equipamento ausente: ${row.ID}`);
    c.slot_equipamento=armorNames.has(name)?'armadura':weapons.has(name)?'arma':'acessorio';
    c.subtipos=[name.includes('Cloth')?'Cloth':name.includes('Scale')?'Scale':name.includes('Surplice')?'Surplice':name.includes('Warplate')?'Warplate':c.slot_equipamento==='arma'?'Weapon':'Equipment'];
    c.equipar_custo=1;c.estagios=[{nome:'Vanilla',bonus_poder:Number(b[1]),bonus_vida:Number(b[2]),custo:null,keywords_en:[],habilidades_en:[]}];
    c.motor={efeitos:[],gatilhos:[],passivas:[],habilidades:[]};
    const owner=raw.match(/Owner: ([^.]+)\./);if(owner)c.donos=[slug(owner[1])];
    const evolve=raw.match(/7th Sense — ACTION, pay (\d+) Cosmo: This equipment grants \+(\d+) Power \/ \+(\d+) HP/);
    if(evolve)c.estagios.push({nome:'7th Sense',custo:Number(evolve[1]),bonus_poder:Number(evolve[2]),bonus_vida:Number(evolve[3]),keywords_en:[],habilidades_en:[]});
    const resonance=raw.match(/Resonance — ([^:]+):/);
    if(resonance)c.ressonancias=[{personagem_id:slug(resonance[1]),habilidade_en:'When this Devotee initiates Strike, it gets +1 Power this Strike.',gatilhos:[trigger('strike_declarado',[buff(1,0,'portador','strike')],{escopo:'portador'})]}];
    if(f==='Hades')c.motor.gatilhos.push(trigger('destruido',[effect('mover',null,'self',{destino:'hand'})],{escopo:'portador'}));
    if(f==='Ares')c.motor.gatilhos.push(trigger('strike_declarado',[buff(1,0,'portador','strike')],{escopo:'portador'}),trigger('strike_fim',[damage(1,'portador')],{escopo:'portador',iniciador:true}));
    if(f==='Artemis')c.motor.gatilhos.push(trigger('strike_declarado',[optional(1,[effect('prevenir',1,'portador',{duracao:'strike',retaliacao:true})])],{escopo:'portador'}));
  }else if(c.tipo==='Support'){
    const activation=raw.match(/Activation: Pay (\d+) Cosmo/);if(!activation)throw new Error(`Custo de Support ausente: ${row.ID}`);
    c.motor=supportProgram(f,n,Number(activation[1]));
  }else{
    const index=c.tipo==='Technique'?(n-21)%5:(n-31)%5;
    c.motor={efeitos:structuredClone(spells[f][c.tipo][index]),gatilhos:[],passivas:[],habilidades:[]};
  }
  const revisedCard=reviseCard(c);
  const errors=validateCard(revisedCard);if(errors.length)throw new Error(`${row.ID}: ${errors.join('; ')}`);
  return revisedCard;
}
export async function compilePlaytest(source){
  const cards=await Promise.all(source.cartas.map(row=>compilePlaytestRow(row,source)));
  const ids=new Set(cards.map(c=>c.id));if(ids.size!==cards.length)throw new Error('IDs duplicados');
  const characters=new Set(cards.map(c=>c.personagem_id).filter(Boolean));
  for(const c of cards)for(const id of [...c.donos,...c.ressonancias.map(r=>r.personagem_id)])if(!characters.has(id))throw new Error(`${c.id}: personagem não encontrado: ${id}`);
  return cards;
}
