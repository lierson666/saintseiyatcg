import {armorCard} from './rules-policy.js';
import {equipmentCostText} from './card-visual-values.js?v=20261031-pt4';
import {KEYWORD_PT} from './card-i18n.js?v=20261031-pt4';
// A sintaxe visual é compartilhada entre impressão e jogo; nunca altera as regras salvas.
export const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Keywords sempre em MAIÚSCULA e negrito no texto (autor, 31/10/2026); o Card Forge usa a mesma lista (forge.js).
export const KEYWORD_WORDS=['Long Range','Multiguard(?: \\d+)?','Guardian','Nimble','Cheater','Pierce','Impulse','Hidden Cosmo','Sealed','Seal','Unfaith','Afterlife','Unprepared','Prepared','Prepare','Training'];
const words=KEYWORD_WORDS;
// Mesmas keywords em PT (docs/glossario-pt-br.md), para o texto das cartas em português (campos *_pt).
export const KEYWORD_WORDS_PT=['Longo Alcance','Multiguarda(?: \\d+)?','Guardião','Ágil','Trapaceiro','Perfurar','Impulso','Cosmo Oculto','Selado','Selo','Infiel','Além-Túmulo','Despreparado','Preparado','Preparar','Treinamento'];
// Bônus de atributo ("+1 ATK / +1 HP", "+2/+2", "-1 ATK") sempre em negrito e maiúscula (autor, 31/10/2026).
// Só "+": verde (como bônus no duelo); só "-": vermelho; misto: cor do tema.
export const statTrend=m=>/-\d/.test(m)?(/\+\d/.test(m)?'mixed':'down'):'up';
export const STAT_RE=/(?<![\w])[+-]\d+(?:\s*(?:ATK|ATTACK|HP|Power|ATQ|PV|Poder))?(?:\s*\/\s*[+-]\d+(?:\s*(?:ATK|ATTACK|HP|Power|ATQ|PV|Poder))?)?/gi;
// Borda por letra (\p{L}), não \b: \b não enxerga letra acentuada ("Ágil", "Além-Túmulo").
const emphasis=new RegExp(`(?<!\\p{L})(${[...words,...KEYWORD_WORDS_PT].join('|')})(?!\\p{L})`,'giu');
// Símbolos do texto (autor, 31/10/2026): {N}{C} Cosmo (ícone de Base), {N}{L} Latent, {N}{B} Base, {N}{S} Soul, {T} Tap.
// Ícones dos PSDs (CARD-TEMPLATE), pintados com a cor do texto; Soul verde ao ganhar e vermelho ao perder ou pagar.
const SYMBOLS={B:['athena/icon_cosmo','Base Cosmo'],C:['athena/icon_cosmo','Cosmo'],L:['athena/icon_latent','Latent Cosmo'],S:['icons/soul','Soul'],T:['icons/tap','Tap']};
const symbolUrl=k=>new URL(`../CARD-TEMPLATE/${k}.png`,import.meta.url).href;
const SYMBOL_RE=/(?:\{(?:\d+|X)\})?\{[BCLST]\}/;
function symbolMarkup(token,before=''){
  const [,n,k]=token.match(/^(?:\{(\d+|X)\})?\{([BCLST])\}$/),[icon,name]=SYMBOLS[k];
  const trend=k!=='S'?'':/\b(gains?|gained|restores?|ganha|ganham|ganhar|recupera)\s+(?:up to\s+|an additional\s+|até\s+)?$/i.test(before)?' rule-sym--up':/\b(lose|loses|lost|pay|pays|paid|perde|perdem|perder|paga|pague|pagar)\s+(?:up to\s+|an additional\s+|até\s+|mais\s+)?$/i.test(before)?' rule-sym--down':'';
  return `<span class="rule-sym rule-sym--${k}${trend}" title="${n?`${n} `:''}${name}" aria-label="${n?`${n} `:''}${name}">${n?`<b>${n}</b>`:''}<i style="--m:url('${symbolUrl(icon)}')"></i></span>`;
}
export function inlineMarkup(text){
  let before='';
  return String(text).split(new RegExp(`(\\*\\*[^*]+\\*\\*|${SYMBOL_RE.source})`,'g')).filter(s=>s!==undefined).map(s=>{
    if(s.startsWith('**'))return `<strong>${inlineMarkup(s.slice(2,-2))}</strong>`;
    if(new RegExp(`^${SYMBOL_RE.source}$`).test(s)){const out=symbolMarkup(s,before);before='';return out;}
    before=s;
    return escapeText(s).replace(emphasis,m=>`<strong>${m.toUpperCase()}</strong>`).replace(STAT_RE,m=>`<strong class="rule-stat rule-stat--${statTrend(m)}">${m.toUpperCase()}</strong>`);
  }).join('');
}
export function textBlocks(texts){
  const result=[];
  for(const text of texts||[]){
    // Os marcadores explícitos separam blocos. Não tentamos inferir efeitos executáveis.
    const chunks=String(text).split(/\n\s*\n|(?<=\.)\s+(?=(?:Owner:|Dono:|Resonance\s*[—-]|Ressonância\s*[—-]|7th Sense\s*[—-]|God Cloth\s*[—-]|Activation:))/i);
    for(let chunk of chunks){
      chunk=chunk.trim();if(!chunk)continue;
      // Poder de God (autor, 31/10/2026): "NOME — Ultimate\nCost: {7}{C}\n…" vira etiqueta ULTIMATE + título "{7}{C} NOME".
      // Etiqueta e título viajam juntos no título, separados por " § " (sobrevive ao blocksMarkup).
      let m=chunk.match(/^([^—\n*]{2,45}?)\s+—\s+(Divine Power|Ultimate|Awaken \d+|Poder Divino|Supremo|Despertar \d+)(?![\p{L}])[ \t]*\n?(?:(?:Cost|Custo):\s*((?:\{[^}]+\})+)\.?[ \t]*\n?)?([\s\S]*)$/u);
      if(m){result.push({heading:`${m[2]} § ${m[3]?`${m[3]} `:''}${m[1]}`,body:m[4],kind:'ability'});continue;}
      m=chunk.match(/^\*\*([^*]+)\*\*\s*\n?([\s\S]*)$/);
      if(m){result.push({heading:m[1].replace(/:$/,''),body:m[2],kind:'ability'});continue;}
      // 1ª linha da Armor (30/10/2026): "Resonance — Aries Mu" fica inteira, em destaque, sem virar título + corpo.
      if(/^(?:Resonance|Ressonância) — [^.:]+$/.test(chunk)){result.push({heading:chunk,body:'',kind:'equip'});continue;}
      m=chunk.match(/^((?:Resonance|Ressonância)\s*[—-]\s*[^.:]+)[.:]\s*([\s\S]*)$/i);
      if(m){result.push({heading:m[1],body:m[2],kind:'resonance'});continue;}
      m=chunk.match(/^(7th Sense|God Cloth)\s*[—-]\s*([^:]+):\s*([\s\S]*)$/i);
      if(m){result.push({heading:`${m[1]} — ${m[2]}`,body:m[3],kind:'evolution'});continue;}
      m=chunk.match(/^(Owner|Activation|Equip|Dono|Ativação|Equipar):\s*([\s\S]*)$/i);
      if(m){result.push({heading:m[1],body:m[2],kind:{dono:'owner','ativação':'activation',equipar:'equip'}[m[1].toLowerCase()]||m[1].toLowerCase()});continue;}
      // Custo antes do nome (autor, 31/10/2026): "Nome — Cost: {5}{C}. …" e "Nome — {2}{C}, {T}: …" viram "{5}{C} NOME".
      m=chunk.match(/^([^.—\n]{2,45})\s*—\s*(?:Cost|Custo):\s*((?:\{[^}]+\})+)\.\s*([\s\S]*)$/);
      if(m){result.push({heading:`${m[2]} ${m[1].trim()}`,body:m[3],kind:'ability'});continue;}
      m=chunk.match(/^([A-Z][^.:—\n]{1,44}?)\s+—\s+((?:\{[^}]+\}[,\s]*)+)([^:\n]{0,40}?):\s*([\s\S]*)$/);
      if(m){const extra=m[3].replace(/^[,\s]+/,'').trim();result.push({heading:`${m[2].replace(/[,\s]+/g,'')} ${m[1]}`,body:extra?`${extra}: ${m[4]}`:m[4],kind:'ability'});continue;}
      m=chunk.match(/^([^.—\n]{2,45})\s*—\s*((?:Cost|Custo):[^.]+)\.\s*([\s\S]*)$/);
      if(m){result.push({heading:`${m[1]} — ${m[2]}`,body:m[3],kind:'ability'});continue;}
      // Nome de golpe/habilidade com travessão (autor, 31/10/2026): "Garuda Flap — When …" vira título + corpo.
      // Custo ativado ("Name — {4}{C}, {T}: …") segue a regra de dois-pontos abaixo, com o custo no título.
      m=chunk.match(/^([A-ZÀ-Ý0-9][^.:—\n]{1,44}?)\s+—\s+(?![{]|Cost:|Custo:)([\s\S]+)$/);
      if(m&&!/^(When|Whenever|If|Once|At|As|While|Each|Until|This|Target|Choose|Put|You|Your|Quando|Sempre|Se|Uma vez|No|Na|Enquanto|Cada|Até|Este|Esta|Escolha|Coloque|Você|Seu|Sua)(?![\p{L}])/u.test(m[1])&&!/^(Resonance|Ressonância)$/i.test(m[1])){result.push({heading:m[1],body:m[2],kind:'ability'});continue;}
      m=chunk.match(/^([^.:\n]{2,40}):\s*([\s\S]*)$/);
      if(m&&!/^(When |Whenever |Once |If |Quando |Sempre que |Uma vez |Se )/i.test(m[1])){result.push({heading:m[1],body:m[2],kind:'ability'});continue;}
      m=chunk.match(new RegExp(`^((?:(?:${[...words.slice(0,10),...KEYWORD_WORDS_PT.slice(0,10)].join('|')})[.,]?\\s*)+)$`,'iu'));
      result.push({heading:m?chunk.toUpperCase():'',body:m?'':chunk,kind:m?'keywords':/^When .*enters|^When played|^Quando .*entra|^Quando (?:for )?jogad/i.test(chunk)?'entry':'passive'});
    }
  }
  return result;
}
// O campo próprio já exibe as keywords; só omitimos repetições isoladas na apresentação.
export function ruleBlocksWithoutKeywords(texts,keywords=[]){
  const normalize=value=>String(value).replace(/\*\*/g,'').trim().replace(/[.:;]+$/,'').trim().toLowerCase();
  const selected=new Set(keywords.flatMap(k=>[k,KEYWORD_PT[k]].filter(Boolean)).map(normalize)); // inglês e PT
  return textBlocks(texts).filter(block=>{
    const tokens=[block.heading,block.body].filter(Boolean).join('\n').split(/[,;\n]|\.\s+/).map(normalize).filter(Boolean);
    return !tokens.length||!tokens.every(token=>selected.has(token));
  });
}
export function blocksMarkup(blocks){return blocks.map(b=>[b.heading?`**${b.heading.replace(/:$/,'').toUpperCase()}:**`:'',b.body].filter(Boolean).join('\n')).join('\n\n');}
export function presentationRules(card){
  const raw=card.habilidades_en||[];
  const equipLine=equipmentCostText(card);
  const armorHP=null; // guia §26A: o HP da Armor é bônus do portador, mostrado na faixa da base (bonus_vida)
  if(!card.estagios?.length&&armorCard(card)){
    // Resonance num bloco só (autor, 30/10/2026): título "Resonance — <nome completo>" e o efeito embaixo, sem repetir o nome curto do texto.
    const effects=raw.filter(t=>/^(?:Resonance|Ressonância)\s*[—-]\s*[^.:]+:\s*/i.test(t));
    const merged=equipLine&&effects.length?effects.map(t=>`**${equipLine}**\n${t.replace(/^(?:Resonance|Ressonância)\s*[—-]\s*[^.:]+:\s*/i,'')}`):[];
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
// Título com etiqueta ("ULTIMATE § {7}{C} NOME") ou começando por símbolo: etiqueta pequena acima e sem dois-pontos.
// Corpo em várias linhas: um parágrafo por linha.
export function renderRules(texts){return textBlocks(texts).map(b=>{
  const [tag,title]=b.heading?.includes(' § ')?b.heading.split(' § '):['',b.heading],colon=b.body?':':'';
  return `<div class="rule-block rule-block--${b.kind}">${tag?`<small class="rule-tag">${escapeText(tag.toUpperCase())}</small>`:''}${title?`<strong class="rule-heading">${inlineMarkup(title.toUpperCase())}${colon}</strong>`:''}${b.body?String(b.body).split('\n').filter(l=>l.trim()).map(l=>`<p>${inlineMarkup(l)}</p>`).join(''):''}</div>`;
}).join('');}
