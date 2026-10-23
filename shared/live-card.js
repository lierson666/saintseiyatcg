import {renderRules,inlineMarkup,presentationRules} from './card-text.js';
import {isEquipment} from './card-model.js';
// A ilustração é apenas fundo. Letras, números e estados são dados independentes no DOM.
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portraits={'athena-001':'athena-001','athena-002':'athena-002','athena-003':'athena-003','athena-004':'athena-004','athena-005':'athena-005','athena-006':'athena-006','sst-01-001':'athena-002','sst-01-002':'athena-003','sst-01-003':'athena-004','sst-01-004':'athena-005','sst-01-005':'athena-006'};
export function illustration(card){
  if(card?.ilustracao)return card.ilustracao;
  const id=portraits[card?.id];return id?new URL(`../playtest/assets/portraits/${id}.webp`,import.meta.url).href:null;
}
export function renderLiveCard(card,{stats=null,instance=null,art=null,compact=false}={}){
  if(!card)return '<div class="live-card live-card--missing">Unknown card</div>';
  const src=art||illustration(card),stage=card.estagios?.[instance?.stage||0],hp=stats?.hp??card.vida??card.resistance;
  const power=stats?.power??card.power,keywords=stats?.keywords??card.keywords_en??[],damage=stats?.damage??instance?.damage??0;
  const ownerName=id=>id.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const rules=presentationRules(card).map(t=>{for(const k of keywords){const prefix=k+'.';if(t.toLowerCase().startsWith(prefix.toLowerCase()))t=t.slice(prefix.length).trim();}return t;}).filter(Boolean),equipment=isEquipment(card),equip=card.equipar_custo;
  const ownerAlready=rules.some(t=>/Owner:/i.test(t)),resonanceAlready=rules.some(t=>/Resonance\s*[—-]/i.test(t));
  return `<div class="live-card live-card--${escape(card.faccao?.toLowerCase()||'neutral')} ${compact?'live-card--compact':''} ${instance&&!instance.prepared&&card.tipo==='Devotee'?'live-card--unprepared':''}" data-live-card="${escape(card.id)}">
    <div class="live-card__illustration" aria-hidden="true">${src?`<img src="${escape(src)}" alt="" draggable="false" loading="lazy">`:'<span class="live-card__placeholder">✧<small>Illustration pending</small></span>'}</div>
    <div class="live-card__surface"></div><header class="live-card__heading"><strong>${escape(card.nome_exibicao_en)}</strong>${card.custo!==null&&card.custo!==undefined?`<b class="live-card__cost" title="Cosmo cost">${escape(card.custo)}</b>`:''}</header>
    <div class="live-card__body"><p class="live-card__type">${escape([card.tipo,...(card.subtipos||[])].join(' · '))}${card.cosmoble?' · Cosmoble':''}</p>
    ${keywords.length?`<p class="live-card__keywords">${keywords.map(k=>inlineMarkup(k)).join(' · ')}</p>`:''}
    <div class="live-card__rules">${renderRules(rules)}</div>
    ${card.donos?.length&&!ownerAlready?`<p class="live-card__owners">Owner: ${card.donos.map(ownerName).map(escape).join(' / ')}</p>`:''}
    ${card.ressonancias?.length&&!resonanceAlready?`<p class="live-card__owners">Resonance: ${card.ressonancias.map(r=>escape(ownerName(r.personagem_id))).join(' / ')}</p>`:''}
    </div><footer class="live-card__footer">${equipment?`<span class="live-card__equip"><small>EQUIP</small><b>${equip??'?'}</b></span>`:''}<small>${escape(stage?.nome||card.faccao||'')}</small>
    ${card.tipo==='Devotee'?`<div class="live-card__stats" title="Power / remaining HP"><b data-stat="power">${escape(power)}</b><span>/</span><b data-stat="hp" class="${damage?'is-wounded':''}">${escape(hp)}</b></div>`:card.tipo==='God'?`<div class="live-card__stats"><b>${escape(card.attack)}</b><span>ATK</span><b>${escape(instance?.soul??card.soul)}</b><span>Soul</span></div>`:stage?`<div class="live-card__stats"><b>+${stage.bonus_poder}</b><span>/</span><b>+${stage.bonus_vida}</b></div>`:''}
    </footer>${damage?`<span class="live-card__damage">${damage} damage · ${stats?.maxHP??card.vida} max HP</span>`:''}${instance&&card.tipo==='Devotee'?`<span class="live-card__state">${instance.prepared?'Prepared':'Unprepared'}${instance.awakened?' · Awakened':''}</span>`:''}
  </div>`;
}
