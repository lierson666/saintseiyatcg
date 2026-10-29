// Política 2.1: custos e afinidades compartilhados. A UI apenas apresenta estes resultados.
export const LATENT_CAP=3;
export const ARMOR_SUBTYPES=['Armor','Cloth','Scale','Surplice','Warplate','Moonplate'];
export const CHARACTER_ORIGINS=['CANON — KURUMADA','SAINT SEIYA — OUTRAS OBRAS','MITOLOGIA ADAPTADA','ORIGINAL TCG'];
export const armorCard=c=>c?.tipo!=='Devotee'&&(c?.slot_equipamento==='armadura'||(c?.subtipos||[]).some(s=>ARMOR_SUBTYPES.includes(s)));
export const techniqueCard=c=>c?.tipo==='Technique'||c?.tipo==='Spell'&&c.subtipos?.includes('Technique');
export function paymentUnit(type,c={},response=false,printed='cosmo'){
  if(type==='ultimate'||type==='play'&&(c.tipo==='Devotee'||armorCard(c)))return 'base_cosmo';
  if(type==='play'&&techniqueCard(c)&&response)return 'latent_cosmo';
  return printed||'cosmo';
}
export const unitLabel=unit=>unit==='base_cosmo'?'Base Cosmo only':unit==='latent_cosmo'?'Latent Cosmo only':'Base / Latent Cosmo';
export function resonantWearer(armor,bearer){
  const id=bearer?.personagem_id;if(!id)return false;
  return [...(armor.donos||[]),...(armor.portadores_ressonantes||[]),...(armor.ressonancias||[]).map(r=>r.personagem_id)].includes(id);
}
export function equipCost(c,bearer){
  if(!armorCard(c))return c.equipar_custo??1;
  return resonantWearer(c,bearer)?c.equipar_custo_ressonante??c.equipar_custo??1:c.equipar_custo_outros??5;
}
// Uma escolha única paga todos os custos, inclusive jogar Armor + Equip, sem gastar parcialmente.
export function paymentPlans(resources,items){
  if(items.some(i=>!Number.isInteger(i.amount)||i.amount<0))return [];
  let baseOnly=0,latentOnly=0,total=0;
  for(const {amount,unit='cosmo'} of items){total+=amount;if(unit==='base_cosmo')baseOnly+=amount;else if(unit==='latent_cosmo')latentOnly+=amount;else if(unit!=='cosmo')return [];}
  const plans=[];
  for(let temporary=Math.min(resources.temporary||0,total-baseOnly-latentOnly);temporary>=0;temporary--)for(let latent=Math.min(resources.latent,total-baseOnly-temporary);latent>=latentOnly;latent--){
    const base=total-latent-temporary;
    if(base>=baseOnly&&base<=resources.base)plans.push({base,latent,temporary});
  }
  return plans;
}
export const bankable=(bases,latent)=>Math.max(0,Math.min(LATENT_CAP-latent,bases.filter(i=>i.prepared&&!i.temporary&&!i.temporaria).length));
