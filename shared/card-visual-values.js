import {isEquipment} from './card-model.js';

// Somente leitura e formatação dos bônus impressos. Nunca soma nem aplica efeitos.
export function printedEquipmentBonuses(card,stageIndex=0){
  if(!isEquipment(card))return{power:null,hp:null};
  const stage=card.estagios?.[stageIndex];
  if(stage)return{power:stage.bonus_poder??null,hp:stage.bonus_vida??null};
  for(const line of card.habilidades_en||[]){
    let match=String(line).match(/^Equipped Devotee gets ([+-]\d+) (?:ATK|Power)(?: \/ ([+-]\d+) HP)?(?: and [A-Za-z][A-Za-z ,'-]*)?\.$/i);
    if(match)return{power:Number(match[1]),hp:match[2]===undefined?null:Number(match[2])};
    match=String(line).match(/^Equipped Devotee gets ([+-]\d+)\/([+-]\d+)\.$/i);
    if(match)return{power:Number(match[1]),hp:Number(match[2])};
  }
  return{power:null,hp:null};
}
export const signedBonus=value=>value==null?null:Number.isFinite(Number(value))?`${Number(value)>=0?'+':''}${Number(value)}`:null;
export function equipmentCostText(card){
  if(!isEquipment(card))return null;
  const auto=Array.isArray(card.auto_equip_en)?card.auto_equip_en.join(' / '):card.auto_equip_en||'';
  const owner=(card.donos||[]).map(id=>id.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')).join(' / ');
  const result=[];
  if(card.equipar_auto&&auto)result.push(`Auto-Equip — ${auto}.`);
  if(card.equipar_custo_ressonante!=null&&!card.equipar_auto)result.push(`Equip ${card.equipar_custo_ressonante} — ${owner||'Resonant Wearer'}.`);
  const other=card.equipar_custo_outros??card.equipar_custo;
  if(other!=null)result.push(`Equip ${other} — ${card.equipar_auto||owner?'Other Devotees':'Any friendly Devotee'}.`);
  return result.join('\n')||null;
}
