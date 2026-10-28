import {renderRules,inlineMarkup,presentationRules,ruleBlocksWithoutKeywords,blocksMarkup} from './card-text.js?v=20261028-1';
import {isArmor,isEquipment} from './card-model.js?v=20261024-4';
import {renderPublishedCard} from './layout-studio/runtime.js';
import {printedEquipmentBonuses,signedBonus} from './card-visual-values.js';
// A ilustração é apenas fundo. Letras, números e estados são dados independentes no DOM.
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portraits={'athena-001':'athena-001','athena-002':'athena-002','athena-003':'athena-003','athena-004':'athena-004','athena-005':'athena-005','athena-006':'athena-006','sst-01-001':'athena-002','sst-01-002':'athena-003','sst-01-003':'athena-004','sst-01-004':'athena-005','sst-01-005':'athena-006'};
export function illustration(card){
  if(card?.ilustracao)return card.ilustracao;
  const id=portraits[card?.id];return id?new URL(`../playtest/assets/portraits/${id}.webp`,import.meta.url).href:null;
}
// Layout do PSD (mesmo spec e peças do Card Forge). Sem eles (Node, testes) a carta usa o layout simples.
let PSD=null;
try{
  const url=p=>new URL(`../CARD-TEMPLATE/${p}`,import.meta.url);
  const [T,pieces]=await Promise.all(['templates.json','pieces.json'].map(f=>fetch(url(f)).then(r=>{if(!r.ok)throw r.status;return r.json();})));
  PSD={T,P:pieces.pieces,src:k=>url(`${k}.png`).href};
}catch{/* sem spec: layout simples */}
const NEUTRAL={color:'#ECE7DA',glow:'rgba(255,255,255,0.35)',frame:['athena/vignette','athena/frame']};
// Mesmo mapeamento do layoutKey() do card-forge/forge.js.
function psdLayoutKey(card){
  const subs=card.subtipos||[];
  if(card.tipo==='Support')return 'relic';
  if(isArmor(card))return 'relic_cloth';
  if(card.tipo==='Equipment')return subs.includes('Weapon')?'relic_weapon':'relic';
  const sub=subs.find(x=>PSD.T.typeToLayout[`${card.tipo}:${x}`]);
  return PSD.T.typeToLayout[sub?`${card.tipo}:${sub}`:card.tipo]||'devotee';
}
const pct=(x,y,w,h)=>`left:${x/14.88}%;top:${y/20.91}%;width:${w/14.88}%;height:${h/20.91}%`;
const cqw=px=>`${(px/14.88).toFixed(3)}cqw`;
// Encolhe o texto de regras até caber na caixa (estimativa: Avenir ≈ 0,5em por caractere).
function rulesSize(texts,base,w,h){
  for(let s=base;s>22;s--){const per=w/(s*.5);let lines=0;for(const t of texts)lines+=Math.max(1,Math.ceil(t.length/per));if(lines*s*1.18+(texts.length-1)*s*.5<=h)return s;}
  return 22;
}
function renderPsdCard(card,{src,stage,hp,power,keywords,damage,rules,equipment,equip,ownerLine,instance,compact}){
  const {T,P}=PSD,f=String(card.faccao||'').toLowerCase(),pack=T.factions[f]||NEUTRAL,L=T.layouts[psdLayoutKey(card)];
  // Enquadramento salvo no projeto do Card Forge (x, y, largura em px da carta 1488×2091), igual ao Forge.
  const fr=card.ilustracao_enquadramento,frame=fr?.w?` style="position:absolute;max-width:none;left:${fr.x/14.88}%;top:${fr.y/20.91}%;width:${fr.w/14.88}%;height:auto;object-fit:fill"`:'';
  // Peça da facção quando o Deus dela tem; senão a de Athena tingida pela máscara na cor da facção.
  const piece=(key,rect,cls='')=>{
    const name=key.split('/').pop(),own=P[`${f}/${name}`],base=P[key];
    if(!own&&(pack.omit||[]).includes(name))return '';
    const k=own?`${f}/${name}`:key,r=rect||(base?[base.x,base.y,base.w,base.h]:null);
    if(!r||!P[k])return '';
    return own||f==='athena'||name.startsWith('rarity_')?`<img class="lc-piece ${cls}" src="${escape(PSD.src(k))}" alt="" style="${pct(...r)}">`:`<i class="lc-piece lc-piece--tint ${cls}" style="${pct(...r)};--m:url('${escape(PSD.src(k))}')"></i>`;
  };
  const at=(key,el)=>{const p=P[key];return p?[p.x+(el.dx||0),p.y+(el.dy||0),p.w,p.h]:null;};
  const gem=(key,rect,value,label,cls='',size=label?80:99,stat='')=>`<span class="lc-gem ${cls}" style="${pct(...rect)}">${piece(key,[0,0,1488,2091])}${label?`<small style="font-size:${cqw(24)}">${label}</small>`:''}<b style="font-size:${cqw(size)}"${stat}>${escape(value)}</b></span>`;
  const text=(v,el,cls='')=>{const t=el.upper?String(v).toUpperCase():String(v),fs=Math.min(el.size,(el.maxW||1400)/(t.length*.62));return `<span class="lc-text lc-text--${el.style} ${cls}" style="left:${el.x/14.88}%;top:${el.y/20.91}%;font-size:${cqw(fs)}">${escape(t)}</span>`;};
  const values={power,resistance:hp,attack:card.attack,soul:instance?.soul??card.soul,equip,damage:card.damage_cloth,
    bonusPower:signedBonus(printedEquipmentBonuses(card,instance?.stage||0).power),bonusResistance:signedBonus(printedEquipmentBonuses(card,instance?.stage||0).hp)};
  const has=v=>v!==null&&v!==undefined&&v!=='';
  const elements=[...L.elements];
  let out='';
  for(const el of elements){
    if(el.kind==='frame')out+=pack.frame.map(k=>P[k]?`<img class="lc-piece" src="${escape(PSD.src(k))}" alt="" style="${pct(P[k].x,P[k].y,P[k].w,P[k].h)}${P[k].blend?`;mix-blend-mode:${P[k].blend}`:''}">`:'').join('');
    else if(el.kind==='piece')out+=piece(el.piece,el.rect||at(el.piece,el));
    else if(el.kind==='cost'&&has(card.custo)&&!['God','Domain'].includes(card.tipo)){
      const key=card.cosmoble?'athena/gem_cost':'athena/gem_cost_base',p=P[key];
      out+=gem(key,[el.x-p.w/2,el.y-p.h/2,p.w,p.h],card.custo,'','live-card__cost',el.size);
    }
    else if(el.kind==='symbol'&&P[`symbols/${f}`])out+=`<img class="lc-piece lc-symbol" src="${escape(PSD.src(`symbols/${f}`))}" alt="${escape(card.faccao)}" style="${pct(...el.rect)}">`;
    else if(el.kind==='gem'&&(el.field==='equip'?equipment:has(values[el.field]))){
      const v=el.field==='equip'?(equip??'?'):values[el.field];
      const stat=el.field==='power'?' data-stat="power"':el.field==='resistance'?` data-stat="hp"${damage?' class="is-wounded"':''}`:'';
      out+=gem(el.piece,at(el.piece,el),v,el.label,el.field==='equip'?'live-card__equip':`lc-gem--${el.field}`,undefined,stat);
    }
    else if(el.kind==='text'){
      const v=el.field==='name'?card.nome_exibicao_en:el.field==='typeLine'?L.typeLine.replace('{tipo}',card.tipo==='Spell'?'':card.tipo).replace('{faccao}',card.faccao||'').replace('{subtipos}',(card.subtipos||[]).join(' — ')).replace(/^(\s*[—-]\s*)+/,'').replace(/(\s*[—-]\s*)+$/,'').replace(/\s*[—-]\s*(?=[—-])/g,''):el.field==='flavour'?(card.flavour_en||card.flavour):el.field==='subtitle'?card.subtitulo_en:null;
      if(has(v))out+=text(v,el,el.field==='name'?'live-card__heading':el.field==='typeLine'?'live-card__type':'');
    }
    else if(el.kind==='rules'){
      const [x,y,w,h]=el.rect,kw=keywords.length?`${keywords.join(', ').toUpperCase()}.`:'';
      const fs=rulesSize([kw,...rules,ownerLine].filter(Boolean),el.size,w,h);
      out+=`<div class="lc-rules live-card__rules" style="${pct(x,y,w,h)};font-size:${cqw(fs)}">${kw?`<p class="live-card__keywords">${keywords.map(k=>inlineMarkup(k)).join(', ')}</p>`:''}${renderRules(rules)}${ownerLine?`<p class="live-card__owners">${ownerLine}</p>`:''}</div>`;
    }
    else if(el.kind==='rarity'){const p=P[`athena/rarity_${String(card.raridade||'').toLowerCase()}`];if(p){const hh=el.h||p.h,ww=p.w*hh/p.h;out+=piece(`athena/rarity_${card.raridade.toLowerCase()}`,[el.x-ww/2,el.y-hh/2,ww,hh],'lc-rarity');}}
  }
  return `<div class="live-card live-card--psd live-card--${escape(f||'neutral')} ${compact?'live-card--compact':''} ${instance&&!instance.prepared&&card.tipo==='Devotee'?'live-card--unprepared':''}" data-live-card="${escape(card.id)}" style="--psd-ink:${pack.color};--psd-glow:${pack.glow}">
    <div class="live-card__illustration" aria-hidden="true">${src?`<img src="${escape(src)}" alt="" draggable="false" loading="lazy"${frame}>`:'<span class="live-card__placeholder">✧<small>Illustration pending</small></span>'}</div>
    <div class="lc-psd">${out}</div>${damage?`<span class="live-card__damage">${damage} damage · ${escape(hp)} HP left</span>`:''}${instance&&card.tipo==='Devotee'?`<span class="live-card__state">${instance.prepared?'Prepared':'Unprepared'}${instance.awakened?' · Awakened':''}</span>`:''}
  </div>`;
}
function armorStatus(card,hp,damage){
  if(!isArmor(card))return '';
  const max=Number.isFinite(card.vida)&&card.vida>0?card.vida:null,broken=max!==null&&damage>=max;
  return `<span class="live-card__armor-status ${broken?'is-broken':''}" data-armor-state="${broken?'broken':max===null?'pending':'active'}">${max===null?'ARMOR HP · review pending':`${broken?'BROKEN · ':''}ARMOR HP ${Math.max(0,max-damage)} / ${max}`}</span>`;
}
export function renderLiveCard(card,{stats=null,instance=null,art=null,compact=false,equipment:attachedEquipment=[],mode=null}={}){
  if(!card)return '<div class="live-card live-card--missing">Unknown card</div>';
  const studio=renderPublishedCard(card,{stats,instance,art:art||illustration(card),equipment:attachedEquipment,mode:mode||(instance?'playtest':'print'),assetRects:PSD?.P});
  if(studio)return studio;
  const src=art||illustration(card),stage=card.estagios?.[instance?.stage||0],hp=stats?.hp??card.vida??card.resistance;
  const power=stats?.power??card.power,keywords=stats?.keywords??card.keywords_en??[],damage=stats?.damage??instance?.damage??0;
  const ownerName=id=>id.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const rules=ruleBlocksWithoutKeywords(presentationRules(card).map(t=>{for(const k of keywords){const prefix=k+'.';if(t.toLowerCase().startsWith(prefix.toLowerCase()))t=t.slice(prefix.length).trim();}return t;}).filter(Boolean),keywords).map(block=>blocksMarkup([block])),equipment=isEquipment(card),equip=card.equipar_custo;
  // God: Awaken e Ultimate vêm de campos próprios, com os mesmos títulos do Card Forge (drawRules).
  if(card.tipo==='God'){
    if(card.habilidade_awaken_en)rules.push(`**AWAKEN${card.awaken?` ${card.awaken}`:''}**`,...card.habilidade_awaken_en.split('\n'));
    if(card.ultimate_en)rules.push('**ULTIMATE:**',...card.ultimate_en.split('\n'));
  }
  const ownerAlready=rules.some(t=>/Owner:/i.test(t)),resonanceAlready=rules.some(t=>/Resonance\s*[—-]/i.test(t));
  if(PSD){
    const ownerLine=[card.donos?.length&&!ownerAlready?`Owner: ${card.donos.map(ownerName).map(escape).join(' / ')}`:'',card.ressonancias?.length&&!resonanceAlready?`Resonance: ${card.ressonancias.map(r=>escape(ownerName(r.personagem_id))).join(' / ')}`:''].filter(Boolean).join('<br>');
    return renderPsdCard(card,{src,stage,hp,power,keywords,damage,rules,equipment,equip,ownerLine,instance,compact});
  }
  return `<div class="live-card live-card--${escape(card.faccao?.toLowerCase()||'neutral')} ${compact?'live-card--compact':''} ${instance&&!instance.prepared&&card.tipo==='Devotee'?'live-card--unprepared':''}" data-live-card="${escape(card.id)}">
    <div class="live-card__illustration" aria-hidden="true">${src?`<img src="${escape(src)}" alt="" draggable="false" loading="lazy">`:'<span class="live-card__placeholder">✧<small>Illustration pending</small></span>'}</div>
    <div class="live-card__surface"></div><header class="live-card__heading"><strong>${escape(card.nome_exibicao_en)}</strong>${card.custo!==null&&card.custo!==undefined?`<b class="live-card__cost" title="Cosmo cost">${escape(card.custo)}</b>`:''}</header>
    <div class="live-card__body"><p class="live-card__type">${escape([card.tipo,...(card.subtipos||[])].join(' · '))}${card.cosmoble?' · Cosmoble':''}</p>
    ${keywords.length?`<p class="live-card__keywords">${keywords.map(k=>inlineMarkup(k)).join(' · ')}</p>`:''}
    <div class="live-card__rules">${renderRules(rules)}</div>
    ${card.donos?.length&&!ownerAlready?`<p class="live-card__owners">Owner: ${card.donos.map(ownerName).map(escape).join(' / ')}</p>`:''}
    ${card.ressonancias?.length&&!resonanceAlready?`<p class="live-card__owners">Resonance: ${card.ressonancias.map(r=>escape(ownerName(r.personagem_id))).join(' / ')}</p>`:''}
    </div><footer class="live-card__footer"><small>${escape(stage?.nome||card.faccao||'')}</small>
    ${card.tipo==='Devotee'?`<div class="live-card__stats" title="Power / remaining HP"><b data-stat="power">${escape(power)}</b><span>/</span><b data-stat="hp" class="${damage?'is-wounded':''}">${escape(hp)}</b></div>`:card.tipo==='God'?`<div class="live-card__stats"><b>${escape(card.attack)}</b><span>ATK</span><b>${escape(instance?.soul??card.soul)}</b><span>Soul</span></div>`:stage?`<div class="live-card__stats"><b>+${stage.bonus_poder}</b><span>/</span><b>+${stage.bonus_vida}</b></div>`:''}
    </footer>${damage?`<span class="live-card__damage">${damage} damage · ${stats?.maxHP??card.vida} max HP</span>`:''}${instance&&card.tipo==='Devotee'?`<span class="live-card__state">${instance.prepared?'Prepared':'Unprepared'}${instance.awakened?' · Awakened':''}</span>`:''}
  </div>`;
}
