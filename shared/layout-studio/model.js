import {printedEquipmentBonuses,signedBonus,equipmentCostText} from '../card-visual-values.js';
import {isArmor,isEquipment} from '../card-model.js';
import {textBlocks} from '../card-text.js';

// Contrato visual puro: lê o catálogo e o resultado da engine, sem executar regras.
export const SCHEMA_VERSION=1;
export const COMPONENTS=['TextBlock','ArtworkFrame','FactionIcon','CastingCost','StatBadge','ArmorHPBadge','SoulBadge','AwakenBadge','EquipCostBlock','TypeLine','RulesBox','FlavorText','KeywordList','RarityMark','Frame','DecorativeLayer','GlowEffect','Divider','StatusBadge','CounterBadge','CardPreview'];
export const FONTS=['Avenir','Avenir Next','Futura','Century Gothic','Georgia','Times New Roman','Arial','Verdana','serif','sans-serif','monospace','system-ui'];
export const LEVELS=['global','type','faction','rarity','card'];
export const STYLE_KEYS=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','align','color','background','borderColor','borderWidth','borderRadius','shadow','glow','stroke','strokeWidth','overflow','padding','autoFit','minFontSize','uppercase','imageFit'];
export const LAYER_KEYS=['id','name','component','binding','label','text','asset','x','y','width','height','rotation','zIndex','opacity','visible','locked','removed','style','conditions'];
export const clone=value=>structuredClone(value);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
export const color=value=>typeof value==='string'&&/^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/.test(value);
const present=value=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);
const owner=id=>String(id).split('-').map(v=>v.charAt(0).toUpperCase()+v.slice(1)).join(' ');
const pendingDesign=body=>/^Pending design and approval\.?$/i.test(String(body).trim());
function namedRule(text,fallback){
  if(!text)return [];
  const [first,...rest]=String(text).split('\n');
  return rest.length&&/ — /.test(first)?[{heading:first,body:rest.join('\n')}]:[{heading:fallback,body:text}];
}
export function ruleParts(card){
  const blocks=textBlocks(card.habilidades_en||[]).filter(b=>!pendingDesign(b.body)).map(block=>{if(block.heading)return block;const lines=block.body.split('\n');if(lines.length>1&&/ — (?:Divine Power|Awaken \d+|Ultimate)$/.test(lines[0]))return {...block,heading:lines[0],body:lines.slice(1).join('\n')};const m=block.body.match(/^([^—.\n]{2,60})\s*—\s*([\s\S]+)$/);return m&&!/^(Once|When|Whenever|If|At)\b/i.test(m[1])?{...block,heading:m[1],body:m[2]}:block;});
  const equip=equipmentCostText(card),divinePower=blocks.filter(b=>!['resonance','owner','keywords'].includes(b.kind)),awakenRules=namedRule(card.habilidade_awaken_en,'AWAKEN'),ultimateRules=namedRule(card.ultimate_en,'ULTIMATE');
  return {rules:[...divinePower,...(equip&&!blocks.some(b=>/Equip \d|Equip cost:/i.test(b.body))?[{heading:'EQUIP',body:equip}]:[]),...awakenRules,...ultimateRules],divinePower,awakenRules,ultimateRules,resonance:[...blocks.filter(b=>b.kind==='resonance'),...(card.ressonancias||[]).filter(r=>!pendingDesign(r.habilidade_en)).map(r=>({heading:`RESONANCE — ${owner(r.personagem_id)}`,body:r.habilidade_en}))],owners:blocks.filter(b=>b.kind==='owner').map(b=>b.body).join(' / ')||(card.donos||[]).map(owner).join(' / ')};
}
export function editorialWarnings(card){
  return textBlocks(card.habilidades_en||[]).filter(b=>pendingDesign(b.body)).map(b=>({layer:'resonance',kind:'pending',message:`${b.heading}: design pendente no catálogo; bloco sem efeito aprovado omitido da arte.`}));
}
export const BINDINGS={
  'card.name':{label:'Nome',read:c=>c.project?.title||c.card.nome_exibicao_en},
  'card.tagline':{label:'Tagline',read:c=>c.project?.subtitle?.trim()||c.card.tagline_en||c.card.subtitulo_en},
  'card.faction':{label:'Facção',read:c=>c.card.faccao},
  'card.rarity':{label:'Raridade',read:c=>c.card.raridade},
  'card.type':{label:'Tipo',read:c=>c.card.tipo},
  'card.subtypes':{label:'Subtipos',read:c=>c.card.subtipos||[]},
  'card.typeLine':{label:'Linha de tipo',read:c=>[c.card.tipo,...(c.card.subtipos||[]),c.card.faccao].filter(Boolean).join(' — ')},
  'card.cost':{label:'Custo impresso',read:c=>c.card.custo},
  'card.cosmoble':{label:'Cosmoble',read:c=>c.card.cosmoble},
  'card.rules':{label:'Habilidades aprovadas',read:c=>ruleParts(c.card).rules},
  'card.divinePower':{label:'God — Divine Power',read:c=>ruleParts(c.card).divinePower},
  'card.awakenRules':{label:'God — Awaken',read:c=>ruleParts(c.card).awakenRules},
  'card.ultimateRules':{label:'God — Ultimate',read:c=>ruleParts(c.card).ultimateRules},
  'card.resonance':{label:'Resonance',read:c=>ruleParts(c.card).resonance},
  'card.owner':{label:'Owner',read:c=>ruleParts(c.card).owners},
  'card.flavor':{label:'Flavour',read:c=>c.project?.flavour||c.card.flavour_en||c.card.flavour},
  'card.reminder':{label:'Reminder aprovado',read:c=>c.card.reminder_en},
  'card.equipCost':{label:'Equip / Auto-Equip',read:c=>equipmentCostText(c.card)},
  'card.equippedPowerBonus':{label:'Bônus impresso de ATK do portador',read:c=>signedBonus(printedEquipmentBonuses(c.card,c.instance?.stage||0).power)},
  'card.equippedHPBonus':{label:'Bônus impresso de HP do portador',read:c=>signedBonus(printedEquipmentBonuses(c.card,c.instance?.stage||0).hp)},
  'card.armorHP':{label:'HP próprio da Armor',read:c=>isArmor(c.card)?c.card.damage_cloth??c.card.vida:null},
  'card.isArmor':{label:'Reconhecida como Armor',read:c=>isArmor(c.card)},
  'card.isEquipment':{label:'Reconhecida como Equipment',read:c=>isEquipment(c.card)},
  'card.power':{label:'Power impresso',read:c=>c.card.power},
  'card.hp':{label:'HP impresso',read:c=>c.card.vida??c.card.resistance},
  'card.soul':{label:'Soul impresso',read:c=>c.card.soul},
  'card.attack':{label:'Attack impresso',read:c=>c.card.attack},
  'card.awaken':{label:'Awaken impresso',read:c=>c.card.awaken},
  'card.artwork':{label:'Ilustração',read:c=>c.art?.src||c.art||c.card.ilustracao},
  'runtime.currentPower':{label:'Power da engine',read:c=>c.card.tipo==='God'?c.instance?.attack??c.card.attack:c.stats?.power??c.card.power},
  'runtime.currentHP':{label:'HP da engine',read:c=>c.stats?.hp??(isArmor(c.card)?c.card.damage_cloth??c.card.vida:c.card.vida??c.card.resistance)},
  'runtime.maxHP':{label:'HP máximo da engine',read:c=>c.stats?.maxHP??(isArmor(c.card)?c.card.damage_cloth??c.card.vida:c.card.vida??c.card.resistance)},
  'runtime.markedDamage':{label:'Dano marcado',read:c=>c.stats?.damage??c.instance?.damage??0},
  'runtime.keywords':{label:'Keywords atuais',read:c=>c.stats?.keywords??c.card.keywords_en??[]},
  'runtime.equipment':{label:'Equipamentos anexados',read:c=>c.equipment||[]},
  'runtime.counters':{label:'Counters atuais',read:c=>c.counters??Object.fromEntries(Object.entries(c.instance||{}).filter(([k,v])=>/counter/i.test(k)&&typeof v==='number'&&v>0))},
  'runtime.prepared':{label:'Prepared',read:c=>c.instance?.prepared??true},
  'runtime.awakened':{label:'Awakened',read:c=>c.instance?.awakened??false},
  'runtime.equipped':{label:'Equipada',read:c=>Boolean(c.instance?.attachedToUid||c.equipment?.length)},
  'runtime.status':{label:'Estado atual',read:c=>c.instance?[c.instance.prepared?'Prepared':'Unprepared',c.instance.awakened?'Awakened':''].filter(Boolean).join(' · '):''},
  'runtime.soul':{label:'Soul atual',read:c=>c.instance?.soul??c.card.soul},
  'runtime.modifiers':{label:'Modificadores da engine',read:c=>c.instance?.modifiers||[]},
  'inspector.original':{label:'Valores originais',read:c=>c.card.tipo==='God'?`Printed: ${c.card.soul} SOUL / ${c.card.attack} ATTACK / ${c.card.awaken} AWAKEN`:`Printed: ${c.card.power??'—'} ATK / ${c.card.damage_cloth??c.card.vida??c.card.resistance??'—'} HP`},
  'inspector.current':{label:'Valores atuais',read:c=>c.card.tipo==='God'?`Current: ${c.instance?.soul??c.card.soul} SOUL / ${c.instance?.attack??c.card.attack} ATTACK`:c.stats?`Current: ${c.stats.power??'—'} ATK / ${c.stats.hp??'—'} HP (${c.stats.maxHP??'—'} max)\nMarked damage: ${c.stats.damage??0}`:''},
  'inspector.modifiers':{label:'Relatório de modificadores',read:c=>(c.instance?.modifiers||[]).map(m=>Object.entries(m).map(([k,v])=>`${k}: ${v}`).join(' · ')).join('\n')},
  'context.mode':{label:'Contexto de visualização',read:c=>c.mode||'print'},
  'theme.frames':{label:'Molduras do tema',read:c=>c.theme?.frames||[]},
  'theme.symbol':{label:'Símbolo da facção',read:c=>c.theme?.symbol},
};
export const bindingValue=(name,context)=>BINDINGS[name]?.read(context)??null;
export function conditionMatches(condition,context){
  if(!condition)return true;
  if(condition.all)return condition.all.every(c=>conditionMatches(c,context));
  if(condition.any)return condition.any.some(c=>conditionMatches(c,context));
  const value=bindingValue(condition.binding,context),right=condition.value;
  switch(condition.op){case 'exists':return present(value);case 'eq':return value===right;case 'neq':return value!==right;case 'gt':return Number(value)>Number(right);case 'includes':return Array.isArray(value)?value.includes(right):String(value??'').includes(String(right));case 'truthy':return Boolean(value);case 'falsy':return !value;default:return false;}
}
export function validateCondition(condition,depth=0){
  if(!condition||typeof condition!=='object'||Array.isArray(condition)||depth>4)throw Error('Condição inválida.');
  if('all'in condition||'any'in condition){const k='all'in condition?'all':'any';if(Object.keys(condition).length!==1||!Array.isArray(condition[k])||condition[k].length>20)throw Error('Grupo de condições inválido.');condition[k].forEach(c=>validateCondition(c,depth+1));return;}
  if(Object.keys(condition).some(k=>!['binding','op','value'].includes(k))||!BINDINGS[condition.binding]||!['exists','eq','neq','gt','includes','truthy','falsy'].includes(condition.op)||condition.value!==undefined&&!['string','number','boolean'].includes(typeof condition.value))throw Error('Binding ou operador de condição inválido.');
}
export function validateTemplate(template){
  if(!template||typeof template!=='object'||Array.isArray(template)||!validId(template.id)||template.schemaVersion!==1||typeof template.name!=='string'||!template.name.trim()||template.name.length>120)throw Error('Identidade do template inválida.');
  if(Object.keys(template).some(k=>!['id','schemaVersion','name','scope','canvas','extends','elements','theme','revision','updatedAt','revisionNote'].includes(k)))throw Error('Propriedade de template desconhecida.');
  const scope=template.scope;
  if(!scope||!LEVELS.includes(scope.level)||!['card','inspector'].includes(scope.surface)||Object.keys(scope).some(k=>!['level','value','subtype','surface'].includes(k))||typeof scope.value!=='string'||scope.value.length>120||scope.subtype!=null&&typeof scope.subtype!=='string')throw Error('Escopo inválido.');
  if(template.extends!=null&&!validId(template.extends))throw Error('Herança inválida.');
  if(template.canvas){if(Object.keys(template.canvas).some(k=>!['width','height','safe','bleed'].includes(k)))throw Error('Canvas inválido.');for(const [k,v]of Object.entries(template.canvas))if(!Number.isFinite(v)||v<0||v>5000||['width','height'].includes(k)&&v<100)throw Error('Medida do canvas inválida.');}
  const theme=template.theme||{};if(Object.keys(theme).some(k=>!['ink','accent','background','frames','symbol'].includes(k)))throw Error('Tema inválido.');
  for(const k of ['ink','accent','background'])if(k in theme&&!color(theme[k]))throw Error('Cor de tema inválida.');
  if(theme.frames&&(!Array.isArray(theme.frames)||theme.frames.length>12||theme.frames.some(a=>!safeAsset(a))))throw Error('Moldura inválida.');if(theme.symbol&&!safeAsset(theme.symbol))throw Error('Símbolo inválido.');
  if(!Array.isArray(template.elements)||template.elements.length>100)throw Error('Limite de 100 layers.');
  const ids=new Set();
  for(const layer of template.elements){
    if(!layer||typeof layer!=='object'||!validId(layer.id)||ids.has(layer.id)||Object.keys(layer).some(k=>!LAYER_KEYS.includes(k)))throw Error('Layer inválida ou repetida.');ids.add(layer.id);
    if(layer.component&&!COMPONENTS.includes(layer.component)||layer.binding&&!BINDINGS[layer.binding])throw Error('Componente ou binding desconhecido.');
    for(const k of ['name','text','label'])if(k in layer&&(typeof layer[k]!=='string'||layer[k].length>(k==='text'?2000:150)))throw Error('Texto visual inválido.');
    for(const k of ['x','y','width','height','rotation','zIndex','opacity'])if(k in layer&&(!Number.isFinite(layer[k])||Math.abs(layer[k])>10000||['width','height'].includes(k)&&layer[k]<=0||k==='opacity'&&(layer[k]<0||layer[k]>1)))throw Error('Coordenada inválida.');
    for(const k of ['visible','locked','removed'])if(k in layer&&typeof layer[k]!=='boolean')throw Error('Estado da layer inválido.');
    if(layer.asset&&!safeAsset(layer.asset))throw Error('Asset inválido.');
    const s=layer.style||{};if(Object.keys(s).some(k=>!STYLE_KEYS.includes(k)))throw Error('Estilo desconhecido.');
    for(const k of ['color','background','borderColor','stroke'])if(k in s&&!color(s[k]))throw Error('Use cor hexadecimal ou transparent.');
    for(const k of ['fontSize','fontWeight','lineHeight','letterSpacing','borderWidth','borderRadius','shadow','glow','strokeWidth','padding','minFontSize'])if(k in s&&(!Number.isFinite(s[k])||s[k]<0||s[k]>1000))throw Error('Medida de estilo inválida.');
    if(s.fontFamily&&!FONTS.includes(s.fontFamily)||s.align&&!['left','center','right'].includes(s.align)||s.overflow&&!['visible','clip'].includes(s.overflow)||s.imageFit&&!['cover','contain'].includes(s.imageFit))throw Error('Opção de estilo inválida.');
    for(const k of ['autoFit','uppercase'])if(k in s&&typeof s[k]!=='boolean')throw Error('Opção de texto inválida.');
    if(layer.conditions)validateCondition(layer.conditions);
  }
  return template;
}
export function safeAsset(value){return typeof value==='string'&&value.length<=240&&!/[\\<>"'\x00-\x1f]/.test(value)&&!value.includes('..')&&/^(?:CARD-TEMPLATE|card-forge\/art|playtest\/assets|star-hill\/assets)\/[a-zA-Z0-9_ /().@+-]+\.(?:png|jpg|jpeg|webp|gif)$/i.test(value);}
export function assetURL(value){
  if(!value)return null;
  const base=new URL('../../',import.meta.url);
  try{const url=new URL(value,base);if(url.origin!==base.origin||!['http:','https:','file:'].includes(url.protocol))return null;return url.href;}catch{return null;}
}
function matches(template,card,surface){const s=template.scope;if(s.surface!==surface)return false;return(s.level==='global'||s.level==='type'&&s.value===card.tipo||s.level==='faction'&&s.value===card.faccao||s.level==='rarity'&&s.value===card.raridade||s.level==='card'&&s.value===card.id)&&(!s.subtype||card.subtipos?.includes(s.subtype));}
export function resolveLayout(templates,card,{surface='card',through=4,previewId=null}={}){
  const byId=new Map(templates.map(t=>[t.id,t])),active=templates.filter(t=>matches(t,card,surface)&&LEVELS.indexOf(t.scope.level)<=through).sort((a,b)=>LEVELS.indexOf(a.scope.level)-LEVELS.indexOf(b.scope.level)||Number(Boolean(a.scope.subtype))-Number(Boolean(b.scope.subtype))||Number(a.id===previewId)-Number(b.id===previewId)||(a.revision||0)-(b.revision||0)||a.id.localeCompare(b.id));
  const out={canvas:{width:1488,height:2091,safe:72,bleed:36},theme:{ink:'#fff0bf',accent:'#d5b665',background:'#111019',frames:[],symbol:null},elements:[],sources:{},chain:[]},layers=new Map(),applied=new Set();
  function apply(t,trail=[]){if(trail.includes(t.id))throw Error('Ciclo de herança.');if(applied.has(t.id))return;if(t.extends){const parent=byId.get(t.extends);if(!parent)throw Error('Template pai ausente.');if(LEVELS.indexOf(parent.scope.level)>LEVELS.indexOf(t.scope.level)||parent.scope.surface!==surface)throw Error('Herança fora da hierarquia.');apply(parent,[...trail,t.id]);}applied.add(t.id);out.chain.push({id:t.id,name:t.name,level:t.scope.level,revision:t.revision});Object.assign(out.canvas,t.canvas);Object.assign(out.theme,t.theme);for(const k of Object.keys(t.canvas||{}))out.sources['canvas.'+k]=t.id;for(const k of Object.keys(t.theme||{}))out.sources['theme.'+k]=t.id;for(const patch of t.elements){const existing=layers.get(patch.id)||{id:patch.id,component:'TextBlock',name:patch.id,x:0,y:0,width:300,height:100,zIndex:0,rotation:0,opacity:1,visible:true,locked:false,style:{}};const next={...existing,...clone(patch),style:{...existing.style,...clone(patch.style||{})}};layers.set(patch.id,next);for(const k of Object.keys(patch)){if(k==='style'){for(const sk of Object.keys(patch.style))out.sources[`${patch.id}.style.${sk}`]=t.id;}else out.sources[`${patch.id}.${k}`]=t.id;}}}
  active.forEach(t=>apply(t));out.elements=[...layers.values()].filter(l=>!l.removed).sort((a,b)=>a.zIndex-b.zIndex||a.id.localeCompare(b.id));return out;
}
export function evaluateLayer(layer,context){return layer.visible!==false&&conditionMatches(layer.conditions,context);}
export function discoverOptions(cards,templates=[]){return{types:[...new Set([...cards.map(c=>c.tipo),...templates.filter(t=>t.scope.level==='type').map(t=>t.scope.value)])].sort(),factions:[...new Set([...cards.map(c=>c.faccao),...templates.filter(t=>t.scope.level==='faction').map(t=>t.scope.value)])].filter(Boolean).sort(),rarities:[...new Set([...cards.map(c=>c.raridade),...templates.filter(t=>t.scope.level==='rarity').map(t=>t.scope.value)])].filter(Boolean).sort(),subtypes:[...new Set(cards.flatMap(c=>c.subtipos||[]))].sort()};}
