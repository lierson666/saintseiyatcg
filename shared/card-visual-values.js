import {isEquipment} from './card-model.js';
import {lang} from './card-i18n.js?v=20261031-kw1';
const pt=()=>lang()==='pt'; // texto gerado em PT quando o jogo está em PT-BR (docs/glossario-pt-br.md)

// Somente leitura e formatação dos bônus impressos. Nunca soma nem aplica efeitos.
export function printedEquipmentBonuses(card,stageIndex=0){
  if(!isEquipment(card))return{power:null,hp:null};
  const stage=card.estagios?.[stageIndex];
  if(stage)return{power:stage.bonus_poder??null,hp:stage.bonus_vida??null};
  // Armor (sintaxe de 30/10/2026): bônus nos campos bonus_poder/bonus_vida, mostrados na faixa da base; 0 não aparece.
  if(card.bonus_poder!=null||card.bonus_vida!=null)return{power:card.bonus_poder||null,hp:card.bonus_vida||null};
  for(const line of card.habilidades_en||[]){
    let match=String(line).match(/^Equipped Devotee gets ([+-]\d+) (?:ATK|Power)(?: \/ ([+-]\d+) HP)?(?: and [A-Za-z][A-Za-z ,'-]*)?\.$/i);
    if(match)return{power:Number(match[1]),hp:match[2]===undefined?null:Number(match[2])};
    match=String(line).match(/^Equipped Devotee gets ([+-]\d+)\/([+-]\d+)\.$/i);
    if(match)return{power:Number(match[1]),hp:Number(match[2])};
    // Mesma linha no texto em PT (campos *_pt): "O Devoto equipado recebe +2 ATQ / +2 PV."
    match=String(line).match(/^(?:O )?Devoto equipado recebe ([+-]\d+) (?:ATQ|Poder)(?: \/ ([+-]\d+) PV)?(?: e [\p{L} ,'-]*)?\.$/iu);
    if(match)return{power:Number(match[1]),hp:match[2]===undefined?null:Number(match[2])};
  }
  return{power:null,hp:null};
}
// Faixa de bônus da Armor: "+1 ATK / +5 HP" (zeros omitidos).
export function armorBonusText(card){
  const {power,hp}=printedEquipmentBonuses(card);
  return [power?`${signedBonus(power)} ${pt()?'ATQ':'ATK'}`:'',hp?`${signedBonus(hp)} ${pt()?'PV':'HP'}`:''].filter(Boolean).join(' / ')||null;
}
export const signedBonus=value=>value==null?null:Number.isFinite(Number(value))?`${Number(value)>=0?'+':''}${Number(value)}`:null;
export function equipmentCostText(card){
  if(!isEquipment(card))return null;
  const autoNames=pt()&&card.auto_equip_pt?.length?card.auto_equip_pt:card.auto_equip_en; // nomes PT da dublagem, se houver
  const owner=(card.donos||[]).map(id=>id.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')).join(' / ');
  const result=[];
  // Armor, arma e acessório (guia §27/§28/§33): Resonance equipa sozinho ao conjurar; Equip N vale para qualquer portador em campo.
  if(card.equipar_auto||/armor/i.test([card.categoria_equipamento,...(card.subtipos||[])].join(' '))){
    // 1ª linha do texto (autor, 30/10/2026): "Resonance — Aries Mu". O Equip fica no selo EQUIP do canto inferior esquerdo.
    const named=(Array.isArray(autoNames)?autoNames:[autoNames]).filter(Boolean);
    return named.length?`${pt()?'Ressonância':'Resonance'} — ${named.join(' / ')}`:null;
  }
  if(card.equipar_custo_ressonante!=null)result.push(`${pt()?'Equipar':'Equip'} ${card.equipar_custo_ressonante} — ${owner||(pt()?'Portador Ressonante':'Resonant Wearer')}.`);
  const other=card.equipar_custo_outros??card.equipar_custo;
  // Equip para qualquer Devotee seu: só no selo EQUIP do canto inferior esquerdo (autor, 31/10/2026), sem repetir no texto.
  if(other!=null&&owner)result.push(pt()?`Equipar ${other} — Outros Devotos.`:`Equip ${other} — Other Devotees.`);
  return result.join('\n')||null;
}
