import {armorCard} from './rules-policy.js';
import {equipmentCostText} from './card-visual-values.js';
// A sintaxe visual é compartilhada entre impressão e jogo; nunca altera as regras salvas.
export const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Keywords sempre em MAIÚSCULA e negrito no texto (autor, 31/10/2026); o Card Forge usa a mesma lista (forge.js).
export const KEYWORD_WORDS=['Long Range','Multiguard(?: \\d+)?','Guardian','Nimble','Cheater','Pierce','Impulse','Sealed','Seal','Unfaith','Afterlife','Unprepared','Prepared','Prepare','Training'];
const words=KEYWORD_WORDS;
const emphasis=new RegExp(`\\b(${words.join('|')})\\b`,'gi');
export function inlineMarkup(text){
  return String(text).split(/(\*\*[^*]+\*\*|\{[BCLST]\})/g).map(s=>{
    if(s.startsWith('**'))return `<strong>${escapeText(s.slice(2,-2))}</strong>`;
    if(/^\{[BCLST]\}$/.test(s)){const names={B:'Base Cosmo',C:'Cosmo',L:'Latent Cosmo',S:'Soul',T:'Tap'};return `<span class="rule-symbol" title="${names[s[1]]}" aria-label="${names[s[1]]}">${s[1]==='T'?'↷':s[1]==='S'?'◇':'✺'}</span>`;}
    return escapeText(s).replace(emphasis,m=>`<strong>${m.toUpperCase()}</strong>`).replace(/([+-]\d+\s*\/\s*[+-]\d+)/g,'<strong>$1</strong>');
  }).join('');
}
export function textBlocks(texts){
  const result=[];
  for(const text of texts||[]){
    // Os marcadores explícitos separam blocos. Não tentamos inferir efeitos executáveis.
    const chunks=String(text).split(/\n\s*\n|(?<=\.)\s+(?=(?:Owner:|Resonance\s*[—-]|7th Sense\s*[—-]|God Cloth\s*[—-]|Activation:))/i);
    for(let chunk of chunks){
      chunk=chunk.trim();if(!chunk)continue;
      let m=chunk.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
      if(m){result.push({heading:m[1].replace(/:$/,''),body:m[2],kind:'ability'});continue;}
      // 1ª linha da Armor (30/10/2026): "Resonance — Aries Mu" fica inteira, em destaque, sem virar título + corpo.
      if(/^Resonance — [^.:]+$/.test(chunk)){result.push({heading:chunk,body:'',kind:'equip'});continue;}
      m=chunk.match(/^(Resonance\s*[—-]\s*[^.:]+)[.:]\s*([\s\S]*)$/i);
      if(m){result.push({heading:m[1],body:m[2],kind:'resonance'});continue;}
      m=chunk.match(/^(7th Sense|God Cloth)\s*[—-]\s*([^:]+):\s*([\s\S]*)$/i);
      if(m){result.push({heading:`${m[1]} — ${m[2]}`,body:m[3],kind:'evolution'});continue;}
      m=chunk.match(/^(Owner|Activation|Equip):\s*([\s\S]*)$/i);
      if(m){result.push({heading:m[1],body:m[2],kind:m[1].toLowerCase()});continue;}
      m=chunk.match(/^([^.—\n]{2,45})\s*—\s*(Cost:[^.]+)\.\s*([\s\S]*)$/);
      if(m){result.push({heading:`${m[1]} — ${m[2]}`,body:m[3],kind:'ability'});continue;}
      m=chunk.match(/^([^.:\n]{2,40}):\s*([\s\S]*)$/);
      if(m&&!/^(When |Whenever |Once |If )/i.test(m[1])){result.push({heading:m[1],body:m[2],kind:'ability'});continue;}
      m=chunk.match(new RegExp(`^((?:(?:${words.slice(0,10).join('|')})[.,]?\\s*)+)$`,'i'));
      result.push({heading:m?chunk.toUpperCase():'',body:m?'':chunk,kind:m?'keywords':/^When .*enters|^When played/i.test(chunk)?'entry':'passive'});
    }
  }
  return result;
}
// O campo próprio já exibe as keywords; só omitimos repetições isoladas na apresentação.
export function ruleBlocksWithoutKeywords(texts,keywords=[]){
  const normalize=value=>String(value).replace(/\*\*/g,'').trim().replace(/[.:;]+$/,'').trim().toLowerCase();
  const selected=new Set(keywords.map(normalize));
  return textBlocks(texts).filter(block=>{
    const tokens=[block.heading,block.body].filter(Boolean).join('\n').split(/[,;\n]|\.\s+/).map(normalize).filter(Boolean);
    return !tokens.length||!tokens.every(token=>selected.has(token));
  });
}
export function blocksMarkup(blocks){return blocks.map(b=>[b.heading?`**${b.heading.replace(/:$/,'')}:**`:'',b.body].filter(Boolean).join('\n')).join('\n\n');}
export function presentationRules(card){
  const raw=card.habilidades_en||[];
  const equipLine=equipmentCostText(card);
  const armorHP=null; // guia §26A: o HP da Armor é bônus do portador, mostrado na faixa da base (bonus_vida)
  if(!card.estagios?.length&&armorCard(card)){
    // Resonance num bloco só (autor, 30/10/2026): título "Resonance — <nome completo>" e o efeito embaixo, sem repetir o nome curto do texto.
    const effects=raw.filter(t=>/^Resonance\s*[—-]\s*[^.:]+:\s*/i.test(t));
    const merged=equipLine&&effects.length?effects.map(t=>`**${equipLine}**\n${t.replace(/^Resonance\s*[—-]\s*[^.:]+:\s*/i,'')}`):[];
    return [...(equipLine&&!merged.length?[equipLine]:[]),...merged,...raw.filter(t=>!effects.includes(t)||!merged.length)];
  }
  if(!card.estagios?.length)return [...raw,...(equipLine?[equipLine]:[])];
  const stages=card.estagios,sign=n=>`${n<0?'':'+'}${n||0}`,bonus=s=>`${sign(s.bonus_poder)} Power / ${sign(s.bonus_vida)} HP`;
  const name=id=>id.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
  // Os números editáveis têm uma única origem. As habilidades livres continuam no texto.
  const free=textBlocks(raw.map(t=>t.replace(/^Equip:[^.]+\.\s*/i,''))).filter(b=>!['owner','evolution','resonance'].includes(b.kind));
  const entries=free.filter(b=>b.kind==='entry'),others=free.filter(b=>b.kind!=='entry');
  const plain=b=>b.heading?`${b.heading}: ${b.body}`:b.body;
  return [...entries.map(plain),...(equipLine?[equipLine]:[]),...(armorHP?[armorHP]:[]),`Equip: ${bonus(stages[0])}.`,...others.map(plain),
    ...(card.donos?.length?[`Owner: ${card.donos.map(name).join(' / ')}.`]:[]),
    ...stages.slice(1).map(s=>`${s.nome} — ACTION, pay ${s.custo??'?'} Cosmo: This equipment grants ${bonus(s)} instead. ${card.donos?.length?'Only its Owner may evolve it.':'Eligible wearers may evolve it.'}${s.exige_awaken?' Requires an Awakened Owner.':''}${s.habilidades_en?.length?' '+s.habilidades_en.join(' '):''}`),
    ...(card.ressonancias||[]).map(r=>`Resonance — ${name(r.personagem_id)}: ${r.habilidade_en}`)];
}
export function renderRules(texts){return textBlocks(texts).map(b=>`<div class="rule-block rule-block--${b.kind}">${b.heading?`<strong class="rule-heading">${inlineMarkup(b.heading)}${b.body?':':''}</strong>`:''}${b.body?`<p>${inlineMarkup(b.body)}</p>`:''}</div>`).join('');}
