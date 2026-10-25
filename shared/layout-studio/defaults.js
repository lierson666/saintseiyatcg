// Bases visuais independentes dos dados mecânicos. Nenhuma base é um novo tipo de carta.
const exists=binding=>({binding,op:'exists'}),eq=(binding,value)=>({binding,op:'eq',value}),all=(...rules)=>({all:rules});
export function makeDefaults(legacy,cards=[]){
  const layer=(id,name,component,binding,x,y,width,height,extra={})=>({id,name,component,binding,x,y,width,height,zIndex:10,rotation:0,opacity:1,visible:true,locked:false,style:{fontFamily:'Avenir',fontSize:42,fontWeight:400,lineHeight:1.2,letterSpacing:0,align:'center',background:'transparent',borderWidth:0,borderRadius:0,padding:8,autoFit:true,minFontSize:24,overflow:'visible',...extra.style},...extra});
  const template=(id,name,level,value,elements=[],extra={})=>({id,schemaVersion:1,name,scope:{level,value,surface:'card'},elements,revision:0,...extra});
  const textStyle={background:'#100e16e8',borderRadius:8,padding:18,fontSize:38,align:'left',autoFit:true,minFontSize:23,lineHeight:1.18};
  const common=[
    layer('background','Background','DecorativeLayer','',0,0,1488,2091,{zIndex:0,locked:true,style:{background:'#111019'}}),
    layer('artwork','Artwork','ArtworkFrame','card.artwork',70,60,1348,1970,{zIndex:1,locked:true,style:{imageFit:'cover'}}),
    layer('frame','Frame','Frame','theme.frames',0,0,1488,2091,{zIndex:2,locked:true}),
    layer('name','Card Name','TextBlock','card.name',320,130,810,126,{style:{fontFamily:'Futura',fontSize:76,fontWeight:700,uppercase:true,stroke:'#151018',strokeWidth:2,align:'center'}}),
    layer('tagline','Tagline','TextBlock','card.tagline',320,260,810,80,{conditions:exists('card.tagline'),style:{fontSize:36,align:'center'}}),
    layer('cost','Casting Cost','CastingCost','card.cost',96,98,232,235,{conditions:exists('card.cost'),style:{fontFamily:'Futura',fontWeight:700,fontSize:145,background:'#15111de8',borderColor:'#bfa66e',borderWidth:4,borderRadius:115,align:'center'}}),
    layer('faction','Faction Symbol','FactionIcon','theme.symbol',1155,80,265,265),
    layer('type','Type Line','TypeLine','card.typeLine',250,1165,985,100,{style:{fontFamily:'Futura',fontSize:40,fontWeight:700,background:'#100e16de',align:'center'}}),
    layer('keywords','Keywords','KeywordList','runtime.keywords',240,1270,1000,62,{conditions:exists('runtime.keywords'),style:{fontSize:34,fontWeight:700,align:'center'}}),
    layer('rules','Rules Text','RulesBox','card.rules',205,1345,1078,400,{style:textStyle}),
    layer('resonance','Resonance','RulesBox','card.resonance',205,1755,1078,150,{conditions:exists('card.resonance'),style:{...textStyle,fontSize:34,minFontSize:23}}),
    layer('owner','Owner','TextBlock','card.owner',340,1920,800,50,{label:'OWNER',conditions:exists('card.owner'),style:{fontSize:26,align:'center'}}),
    layer('flavor','Flavor Text','FlavorText','card.flavor',340,1970,800,55,{conditions:exists('card.flavor'),style:{fontSize:28,align:'center'}}),
    layer('power','Attack','StatBadge','runtime.currentPower',72,1168,165,140,{label:'ATK',conditions:all(eq('card.type','Devotee'),exists('runtime.currentPower')),style:{fontSize:90,fontWeight:700,background:'#100e16ee',borderColor:'#bfa66e',borderWidth:2,borderRadius:30,align:'center'}}),
    layer('hp','HP','StatBadge','runtime.currentHP',1250,1168,165,140,{label:'HP',conditions:all(eq('card.type','Devotee'),exists('runtime.currentHP')),style:{fontSize:90,fontWeight:700,background:'#100e16ee',borderColor:'#bfa66e',borderWidth:2,borderRadius:30,align:'center'}}),
    layer('armor-hp','Armor HP','ArmorHPBadge','runtime.currentHP',1155,1880,245,140,{label:'ARMOR HP',conditions:all(eq('card.isArmor',true),{binding:'card.armorHP',op:'gt',value:0}),style:{fontSize:78,fontWeight:700,background:'#100e16ee',borderColor:'#bfa66e',borderWidth:2,borderRadius:30,align:'center'}}),
    layer('equip','Equip Cost','EquipCostBlock','card.equipCost',80,1880,240,140,{conditions:eq('card.isEquipment',true),style:{fontSize:30,fontWeight:700,background:'#100e16ee',borderColor:'#bfa66e',borderWidth:2,borderRadius:12,align:'center'}}),
    layer('soul','Soul','SoulBadge','runtime.soul',90,1880,230,140,{label:'SOUL',conditions:eq('card.type','God'),style:{fontSize:86,fontWeight:700,align:'center'}}),
    layer('attack','God Attack','StatBadge','card.attack',625,1880,230,140,{label:'ATTACK',conditions:eq('card.type','God'),style:{fontSize:86,fontWeight:700,align:'center'}}),
    layer('awaken','Awaken','AwakenBadge','card.awaken',1165,1880,230,140,{label:'AWAKEN',conditions:eq('card.type','God'),style:{fontSize:86,fontWeight:700,align:'center'}}),
    layer('rarity','Rarity','RarityMark','card.rarity',530,2030,430,46,{style:{fontSize:26,fontWeight:700,align:'center'}}),
    layer('counters','Counters','CounterBadge','runtime.counters',230,360,1030,70,{conditions:all({binding:'runtime.counters',op:'exists'},{binding:'context.mode',op:'neq',value:'print'}),style:{fontSize:30,background:'#100e16e8',align:'center'}}),
    layer('status','Status','StatusBadge','runtime.status',450,480,590,65,{conditions:exists('runtime.status'),style:{fontSize:30,fontWeight:700,background:'#100e16ee',align:'center'}}),
    layer('divider','Divider','Divider','',230,1328,1030,2,{zIndex:9,style:{background:'#bfa66e'}}),
    layer('ornaments','Ornaments','DecorativeLayer','',60,60,1368,1971,{zIndex:3,locked:true,style:{borderColor:'#bfa66e',borderWidth:2,borderRadius:12}}),
    layer('glow','Glow','GlowEffect','',60,60,1368,1971,{zIndex:4,locked:true,visible:false,style:{borderColor:'#e6cc84',borderWidth:2,glow:18,borderRadius:12}}),
    layer('reminder','Reminder Text','TextBlock','card.reminder',340,1960,800,55,{visible:false,conditions:exists('card.reminder'),style:{fontSize:25,align:'center'}}),
  ];
  const bases=[template('base-global','Base · composição de carta','global','',common,{canvas:{width:1488,height:2091,safe:72,bleed:36},theme:{ink:'#fff0bf',accent:'#d5b665',background:'#111019',frames:[]}})];
  const types=[...new Set([...Object.keys(legacy.typeToLayout).filter(t=>!t.includes(':')),...cards.map(c=>c.tipo)])];
  for(const type of types){const id=type.toLowerCase().replace(/[^a-z0-9]+/g,'-');let elements=[];if(type==='God')elements=[{id:'type',y:395},{id:'rules',y:530,height:1250,style:{fontSize:39,minFontSize:24}},{id:'resonance',visible:false},{id:'divider',y:510},{id:'flavor',visible:false}];if(['Spell','Domain','Moment','Technique','Support'].includes(type))elements=[{id:'rules',height:540},{id:'resonance',visible:false}];bases.push(template(`base-type-${id}`,`Base · ${type}`,'type',type,elements));}
  for(const [f,pack]of Object.entries(legacy.factions)){const name=cards.find(c=>c.faccao?.toLowerCase()===f)?.faccao||f.charAt(0).toUpperCase()+f.slice(1);bases.push(template(`base-faction-${f}`,`Tema · ${name}`,'faction',name,[],{theme:{ink:pack.color,accent:pack.color,frames:pack.frame.map(k=>`CARD-TEMPLATE/${k}.png`),symbol:`CARD-TEMPLATE/symbols/${f}.png`}}));}
  for(const rarity of [...new Set(cards.map(c=>c.raridade))].sort())bases.push(template(`base-rarity-${rarity.toLowerCase()}`,`Base · ${rarity}`,'rarity',rarity,[]));
  const inspector=[layer('card-preview','Carta principal','CardPreview','',80,70,950,1335),layer('name','Nome','TextBlock','card.name',1120,80,1120,130,{style:{fontFamily:'Futura',fontSize:62,fontWeight:700,align:'left'}}),layer('type','Tipo','TypeLine','card.typeLine',1120,220,1120,90,{style:{fontSize:32,align:'left'}}),layer('printed','Valores originais','TextBlock','inspector.original',1120,330,1120,90,{style:{fontSize:35,align:'left'}}),layer('current','Valores da engine','TextBlock','inspector.current',1120,430,1120,145,{style:{fontSize:44,fontWeight:700,align:'left'}}),layer('keywords','Keywords','KeywordList','runtime.keywords',1120,585,1120,80,{style:{fontSize:31,align:'left'}}),layer('counters','Counters','CounterBadge','runtime.counters',1120,670,1120,80,{style:{fontSize:29,align:'left'}}),layer('status','Estado','StatusBadge','runtime.status',1120,755,1120,60,{style:{fontSize:30,align:'left'}}),layer('modifiers','Modificadores','TextBlock','inspector.modifiers',1120,830,1120,120,{style:{fontSize:28,align:'left'}}),layer('rules','Habilidades','RulesBox','card.rules',1120,965,1120,425,{style:{fontSize:30,minFontSize:22,align:'left'}}),layer('equipment','Equipamentos anexados','TextBlock','runtime.equipment',80,1430,2160,130,{style:{fontSize:30,align:'left'}})];
  bases.push(template('base-inspector','Base · Inspector','global','',inspector,{scope:{level:'global',value:'',surface:'inspector'},canvas:{width:2400,height:1600,safe:40,bleed:0},theme:{ink:'#fff0bf',background:'#14121c'}}));
  const drafts=bases.map(b=>({...template(b.id.replace('base-','layout-'),b.name.replace('Base · ','').replace('Tema · ','Tema de '),b.scope.level,b.scope.value,[]),scope:{...b.scope},extends:b.id,revision:0}));
  return{schemaVersion:1,revision:0,bases,drafts,published:[],history:[]};
}
