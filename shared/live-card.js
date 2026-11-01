import {renderRules,inlineMarkup,presentationRules,ruleBlocksWithoutKeywords,blocksMarkup} from './card-text.js?v=20261031-kw1';
import {isArmor,isEquipment} from './card-model.js?v=20261024-4';
import {renderPublishedCard,visualProject} from './layout-studio/runtime.js?v=20261101-rules1';
import {printedEquipmentBonuses,signedBonus,armorBonusText} from './card-visual-values.js?v=20261031-kw1';
import {renderKeywordNotes} from './keyword-glossary.js?v=20261101-kw7';
import {displayCard,keywordName,typeWord,lang} from './card-i18n.js?v=20261101-tr1';
// A ilustração é apenas fundo. Letras, números e estados são dados independentes no DOM.
globalThis.document?.addEventListener('load', e => { if (e.target.matches?.('.live-card__illustration img')) e.target.classList.add('is-in'); }, true); // ver .is-in em live-card.css
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portraits={'athena-001':'athena-001','athena-002':'athena-002','athena-003':'athena-003','athena-004':'athena-004','athena-005':'athena-005','athena-006':'athena-006','sst-01-001':'athena-002','sst-01-002':'athena-003','sst-01-003':'athena-004','sst-01-004':'athena-005','sst-01-005':'athena-006'};
export function illustration(card){
  const saved=visualProject(card?.id)?.art?.src;
  if(saved)return new URL('../'+saved,import.meta.url).href;
  if(card?.ilustracao)return card.ilustracao;
  const id=portraits[card?.id];return id?new URL(`../playtest/assets/portraits/${id}.webp`,import.meta.url).href:null;
}
// Layout do PSD (mesmo spec e peças do Card Forge). Sem eles (Node, testes) a carta usa o layout simples.
let PSD=null;
try{
  const url=p=>new URL(`../CARD-TEMPLATE/${p}`,import.meta.url);
  const [T,pieces]=await Promise.all(['templates.json','pieces.json'].map(f=>fetch(url(f)).then(r=>{if(!r.ok)throw r.status;return r.json();})));
  const ext=globalThis.matchMedia?.('(pointer: coarse)').matches?'sm.webp':'webp'; // toque: metade do tamanho (a 1488 px, a mão trava num tablet)
  PSD={T,P:pieces.pieces,src:k=>url(`${k}.${ext}`).href}; // gerados por tools/light-assets.py
}catch{/* sem spec: layout simples */}
const NEUTRAL={color:'#ECE7DA',glow:'rgba(255,255,255,0.35)',frame:['athena/vignette','athena/frame']};
// Mesmo mapeamento do layoutKey() do card-forge/forge.js.
function psdLayoutKey(card){
  const subs=card.subtipos||[];
  if(card.tipo==='Support')return 'relic';
  if(isArmor(card))return 'relic_cloth';
  if(card.tipo==='Equipment')return 'relic_weapon';
  const sub=subs.find(x=>PSD.T.typeToLayout[`${card.tipo}:${x}`]);
  return PSD.T.typeToLayout[sub?`${card.tipo}:${sub}`:card.tipo]||'devotee';
}
const pct=(x,y,w,h)=>`left:${x/14.88}%;top:${y/20.91}%;width:${w/14.88}%;height:${h/20.91}%`;
const cqw=px=>`${(px/14.88).toFixed(3)}cqw`;
// Encolhe o texto de regras até caber na caixa (estimativa: Avenir ≈ 0,5em por caractere).
// Acessibilidade (autor, 31/10/2026): o texto encolhe no máximo até 85% do tamanho do layout; se ainda não couber,
// a caixa de regras ganha rolagem (live-card.css) em vez de cortar o texto.
function rulesSize(texts,base,w,h,min){
  const floor=min||Math.round(base*.85);
  for(let s=base;s>floor;s--){const per=w/(s*.5);let lines=0;for(const t of texts)lines+=Math.max(1,Math.ceil(t.length/per));if(lines*s*1.18+(texts.length-1)*s*.5<=h)return s;}
  return floor;
}
// Edições (autor, 31/10/2026): a 1ª é Dawn of Cosmo. Carta sem `edicao` é DOC. O artista vem do campo `artista`.
export const EDITIONS=[{name:'Dawn of Cosmo',code:'DOC',language:'EN',year:2026}];
export const editionOf=card=>EDITIONS.find(e=>e.code===card?.edicao)||EDITIONS[0];
function renderPsdCard(card,{src,stage,hp,power,keywords,damage,rules,equipment,equip,ownerLine,instance,compact}){
  const savedArt=visualProject(card.id)?.art;
  const artworkStyle=savedArt?.w&&savedArt?.h?`position:absolute;max-width:none;width:${savedArt.w/14.88}%;height:${savedArt.h/20.91}%;left:${savedArt.x/14.88}%;top:${savedArt.y/20.91}%;object-fit:fill`:'';
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
  const values={power,resistance:hp,attack:card.attack,soul:instance?.soul??card.soul,equip,damage:null,armorBonus:armorBonusText(card),
    bonusPower:signedBonus(printedEquipmentBonuses(card,instance?.stage||0).power),bonusResistance:signedBonus(printedEquipmentBonuses(card,instance?.stage||0).hp)};
  const has=v=>v!==null&&v!==undefined&&v!=='';
  const elements=[...L.elements];
  let out='';
  for(const el of elements){
    // Athena (autor, 31/10/2026): degradê escuro da linha de Power/HP até o rodapé, para o texto ler sobre a arte.
    if(el.kind==='frame'&&f==='athena'){const y=statLine(L,P);if(y)out+=`<i class="lc-piece" style="${pct(0,y-160,1488,2091-y+160)};background:linear-gradient(transparent,rgba(0,0,0,.62) 32%,rgba(0,0,0,.8))"></i>`;}
    if(el.kind==='frame')out+=pack.frame.map(k=>P[k]?`<img class="lc-piece" src="${escape(PSD.src(k))}" alt="" style="${pct(P[k].x,P[k].y,P[k].w,P[k].h)}${P[k].blend?`;mix-blend-mode:${P[k].blend}`:''}">`:'').join('');
    else if(el.kind==='piece')out+=piece(el.piece,el.rect||at(el.piece,el));
    else if(el.kind==='cost'&&has(card.custo)&&!['God','Domain'].includes(card.tipo)){
      const key=card.cosmoble?'athena/gem_cost':'athena/gem_cost_base',p=P[key];
      out+=gem(key,[el.x-p.w/2,el.y-p.h/2,p.w,p.h],card.custo,'','live-card__cost',el.size);
    }
    else if(el.kind==='symbol'&&P[`symbols/${f}`])out+=`<img class="lc-piece lc-symbol" src="${escape(PSD.src(`symbols/${f}`))}" alt="${escape(card.faccao)}" style="${pct(...el.rect)}">`;
    else if(el.kind==='gem'&&(el.field==='equip'?equipment&&has(equip):has(values[el.field]))){
      const v=el.field==='equip'?(equip??'?'):values[el.field];
      const stat=el.field==='power'?' data-stat="power"':el.field==='resistance'?` data-stat="hp"${damage?' class="is-wounded"':''}`:'';
      out+=gem(el.piece,at(el.piece,el),v,el.label,el.field==='equip'?'live-card__equip':`lc-gem--${el.field}`,undefined,stat);
    }
    else if(el.kind==='band'&&has(values[el.field])){
      // Faixa de bônus da Armor (autor, 30/10/2026): "+1 ATK / +5 HP", cores dos atributos do Devotee.
      const parts=String(values[el.field]).split(' / ').map(p=>`<b class="${/(ATK|ATQ)$/.test(p)?'is-atk':'is-hp'}">${escape(p)}</b>`).join('<i>/</i>');
      out+=`<span class="lc-band" style="left:${el.x/14.88}%;top:${el.y/20.91}%;font-size:${cqw(el.size)}">${parts}</span>`;
    }
    else if(el.kind==='text'){
      const v=el.field==='name'?card.nome_exibicao_en:el.field==='typeLine'?L.typeLine.replace('{tipo}',card.tipo==='Spell'?'':typeWord(card.tipo)).replace('{faccao}',typeWord(card.faccao||'')).replace('{subtipos}',(card.subtipos||[]).map(typeWord).join(' — ')).replace(/^(\s*[—-]\s*)+/,'').replace(/(\s*[—-]\s*)+$/,'').replace(/\s*[—-]\s*(?=[—-])/g,''):el.field==='flavour'?(card.flavour_en||card.flavour):el.field==='subtitle'?(card.tagline_en||card.subtitulo_en):null;
      if(has(v))out+=text(v,el,el.field==='name'?'live-card__heading':el.field==='typeLine'?'live-card__type':'');
    }
    else if(el.kind==='rules'){
      const [x,y,w,h]=el.rect,kw=keywords.length?`${keywords.join(', ').toUpperCase()}.`:'';
      // God: o marcador **AWAKEN N** vira o cabeçalho do PSD do Deus (linha, gema com o número, "Awaken", linha; autor, 31/10/2026).
      const cut=card.tipo==='God'&&P[`${f}/gem_awaken`]?rules.findIndex(t=>/^\*\*AWAKEN\b/.test(t)):-1,head=cut<0?'':awakenHead(f,card.awaken);
      const body=cut<0?renderRules(rules):`${renderRules(rules.slice(0,cut))}${head}${renderRules(rules.slice(cut+1))}`;
      const fs=rulesSize([kw,...rules,ownerLine].filter(Boolean),el.size,w,(cut<0?h:h-280)*(el.fit||1),el.minSize);
      // Caixa do layout (--lc-rules-h = altura máxima, com rolagem); --lc-text = tamanho do texto (Options › Accessibility).
      const box=`left:${x/14.88}%;bottom:${(2091-y-h)/20.91}%;width:${w/14.88}%;min-height:${h/20.91}%;--lc-rules-h:${cqw(h)}`;
      out+=`<div class="lc-rules live-card__rules" style="${box};font-size:calc(${cqw(fs)} * var(--lc-text, 1))">${kw?`<p class="live-card__keywords">${keywords.map(k=>inlineMarkup(keywordName(k))).join(', ')}</p>`:''}${body}${ownerLine?`<p class="live-card__owners">${ownerLine}</p>`:''}</div>`;
    }
    // Rodapé de edição (autor, 31/10/2026): símbolo da raridade • edição • idioma • artista • ano. A gema sai do centro.
    else if(el.kind==='rarity'){
      const key=`athena/rarity_${String(card.raridade||'').toLowerCase()}`,gemImg=P[key]?`<img class="lc-footer__rarity" src="${escape(PSD.src(key))}" alt="${escape(card.raridade)}">`:'';
      const ed=editionOf(card),parts=[gemImg,ed.code,lang()==='pt'?'PT':ed.language,card.artista,`© ${ed.year} SSTCG`].filter(Boolean);
      out+=`<div class="lc-footer" style="top:${el.y/20.91}%;font-size:${cqw(30)}" title="${escape(ed.name)}">${parts.map(x=>`<span>${x.startsWith('<img')?x:escape(x)}</span>`).join('<i>•</i>')}</div>`;
    }
  }
  return `<div class="live-card live-card--psd live-card--${escape(f||'neutral')} ${compact?'live-card--compact':''} ${instance&&!instance.prepared&&card.tipo==='Devotee'?'live-card--unprepared':''}" data-live-card="${escape(card.id)}" style="--psd-ink:${pack.color};--psd-glow:${pack.glow}">
    <div class="live-card__illustration" aria-hidden="true">${src?`<img src="${escape(src)}" alt="" draggable="false" loading="lazy"${frame||(artworkStyle?` style="${artworkStyle}"`:'')}>`:'<span class="live-card__placeholder">✧<small>Illustration pending</small></span>'}</div>
    <div class="lc-psd">${out}</div>${damage?`<span class="live-card__damage">${damage} damage · ${escape(hp)} HP left</span>`:''}${instance&&card.tipo==='Devotee'?`<span class="live-card__state">${instance.prepared?'Prepared':'Unprepared'}${instance.awakened?' · Awakened':''}</span>`:''}
  </div>`;
}
// Cabeçalho do Awaken da carta de God, peças extraídas do PSD de cada Deus (card-forge/tools/extract_template.py).
// Centro da linha de Power/HP (ou da faixa de tipo) no layout, em px do PSD 1488×2091.
export function statLine(L,P){const e=L.elements.find(e=>e.piece==='athena/gem_power')||L.elements.find(e=>e.piece==='athena/box_type'),p=e&&P[e.piece];return p?p.y+(e.dy||0)+p.h/2:0;}
function awakenHead(f,n){
  const img=(name,cls)=>`<img class="${cls}" src="${escape(PSD.src(`${f}/${name}`))}" alt="">`;
  return `<div class="lc-awaken" aria-label="Awaken ${escape(n??'')}">${img('awaken_line','lc-awaken__line')}<span class="lc-awaken__gem">${img('gem_awaken','')}<b>${escape(n??'')}</b></span>${img('awaken_word','lc-awaken__word')}${img('awaken_line','lc-awaken__line')}</div>`;
}
function armorStatus(card,hp,damage){
  if(!isArmor(card))return '';
  return ''; // guia §26A (30/10/2026): Armor sem HP próprio, sem Broken
}
// Texto da carta fora da arte (inspetor do duelo, ficha do lobby): mesmas regras do texto impresso
// (autor, 31/10/2026): corpo branco; títulos, keywords e bônus em MAIÚSCULA e negrito; cor do tema da facção.
export function renderCardText(card){
  card=displayCard(card); // texto em PT quando houver (shared/card-i18n.js)
  const f=String(card.faccao||'').toLowerCase(),ink=(PSD?.T.factions[f]||NEUTRAL).color;
  const kws=card.keywords_en||[],rules=ruleBlocksWithoutKeywords(presentationRules(card),kws).map(block=>blocksMarkup([block]));
  return `<div class="card-text" style="--psd-ink:${escape(ink)}">${kws.length?`<p class="live-card__keywords">${kws.map(k=>inlineMarkup(keywordName(k))).join(', ')}</p>`:''}${renderRules(rules)}${renderKeywordNotes(card)}</div>`;
}
export function renderLiveCard(card,{stats=null,instance=null,art=null,compact=false,equipment:attachedEquipment=[],mode=null}={}){
  if(!card)return '<div class="live-card live-card--missing">Unknown card</div>';
  card=displayCard(card); // texto em PT quando houver (shared/card-i18n.js)
  // Enquadramento do export do Card Forge (com altura) vale mais que o manifesto do layout, que pode estar velho.
  const fr=card.ilustracao_enquadramento,src0=art||illustration(card),studioArt=fr?.w&&fr?.h&&typeof src0==='string'?{src:src0,x:fr.x,y:fr.y,w:fr.w,h:fr.h}:src0;
  const studio=renderPublishedCard(card,{stats,instance,art:studioArt,equipment:attachedEquipment,mode:mode||(instance?'playtest':'print'),assetRects:PSD?.P});
  if(studio)return studio;
  const src=art||illustration(card),stage=card.estagios?.[instance?.stage||0],hp=stats?.hp??card.vida??card.resistance;
  const power=stats?.power??card.power,keywords=stats?.keywords??card.keywords_en??[],damage=stats?.damage??instance?.damage??0;
  const ownerName=id=>id.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const rules=ruleBlocksWithoutKeywords(presentationRules(card).map(t=>{for(const k of keywords){const prefix=k+'.';if(t.toLowerCase().startsWith(prefix.toLowerCase()))t=t.slice(prefix.length).trim();}return t;}).filter(Boolean),keywords).map(block=>blocksMarkup([block])),equipment=isEquipment(card),equip=card.equipar_custo_outros??card.equipar_custo; // Armor: Equip universal no selo
  // God: Awaken e Ultimate vêm de campos próprios, com os mesmos títulos do Card Forge (drawRules).
  // **AWAKEN N** vira o cabeçalho do PSD do Deus no renderPsdCard (autor, 31/10/2026).
  if(card.tipo==='God'){
    // Blocos inteiros: textBlocks lê "NOME — Awaken N" / "NOME — Ultimate" + "Cost: {N}{C}" (etiqueta + custo antes do nome).
    if(card.habilidade_awaken_en)rules.push(`**AWAKEN${card.awaken?` ${card.awaken}`:''}**`,card.habilidade_awaken_en);
    if(card.ultimate_en)rules.push(card.ultimate_en);
  }
  const ownerAlready=rules.some(t=>/Owner:/i.test(t)),resonanceAlready=rules.some(t=>/(?:Resonance|Ressonância)\s*[—-]/i.test(t));
  if(PSD){
    const ownerLine=['',card.ressonancias?.length&&!resonanceAlready?`Resonance: ${card.ressonancias.map(r=>escape(ownerName(r.personagem_id))).join(' / ')}`:''].filter(Boolean).join('<br>');
    return renderPsdCard(card,{src,stage,hp,power,keywords,damage,rules,equipment,equip,ownerLine,instance,compact});
  }
  return `<div class="live-card live-card--${escape(card.faccao?.toLowerCase()||'neutral')} ${compact?'live-card--compact':''} ${instance&&!instance.prepared&&card.tipo==='Devotee'?'live-card--unprepared':''}" data-live-card="${escape(card.id)}">
    <div class="live-card__illustration" aria-hidden="true">${src?`<img src="${escape(src)}" alt="" draggable="false" loading="lazy">`:'<span class="live-card__placeholder">✧<small>Illustration pending</small></span>'}</div>
    <div class="live-card__surface"></div><header class="live-card__heading"><strong>${escape(card.nome_exibicao_en)}</strong>${card.custo!==null&&card.custo!==undefined?`<b class="live-card__cost" title="Cosmo cost">${escape(card.custo)}</b>`:''}</header>
    <div class="live-card__body"><p class="live-card__type">${escape([card.tipo,...(card.subtipos||[])].join(' · '))}${card.cosmoble?' · Cosmoble':''}</p>
    ${keywords.length?`<p class="live-card__keywords">${keywords.map(k=>inlineMarkup(keywordName(k))).join(' · ')}</p>`:''}
    <div class="live-card__rules">${renderRules(rules)}</div>
    ${card.ressonancias?.length&&!resonanceAlready?`<p class="live-card__owners">Resonance: ${card.ressonancias.map(r=>escape(ownerName(r.personagem_id))).join(' / ')}</p>`:''}
    </div><footer class="live-card__footer"><small>${escape(stage?.nome||card.faccao||'')}</small>
    ${card.tipo==='Devotee'?`<div class="live-card__stats" title="Power / remaining HP"><b data-stat="power">${escape(power)}</b><span>/</span><b data-stat="hp" class="${damage?'is-wounded':''}">${escape(hp)}</b></div>`:card.tipo==='God'?`<div class="live-card__stats"><b>${escape(card.attack)}</b><span>ATK</span><b>${escape(instance?.soul??card.soul)}</b><span>Soul</span></div>`:stage?`<div class="live-card__stats"><b>+${stage.bonus_poder}</b><span>/</span><b>+${stage.bonus_vida}</b></div>`:''}
    </footer>${damage?`<span class="live-card__damage">${damage} damage · ${stats?.maxHP??card.vida} max HP</span>`:''}${instance&&card.tipo==='Devotee'?`<span class="live-card__state">${instance.prepared?'Prepared':'Unprepared'}${instance.awakened?' · Awakened':''}</span>`:''}
  </div>`;
}
