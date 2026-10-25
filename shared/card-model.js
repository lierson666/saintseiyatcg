// Contrato comum entre importador, editor e motor. Texto de carta não executa código.
import {armorCard,ARMOR_SUBTYPES,CHARACTER_ORIGINS} from './rules-policy.js';
export const RULES_VERSION = '2.1';
export const TYPES = ['God','Domain','Devotee','Equipment','Support','Relic','Spell','Technique','Moment'];
export const FACTIONS = ['Athena','Poseidon','Hades','Ares','Artemis','Neutral'];
export const KEYWORDS = ['Guardian','Nimble','Cheater','Long Range','Pierce','Impulse','Sealed','Unfaith','Afterlife'];
export const OPERATIONS = new Set(['curar','alma','comprar','descartar','atributo','keyword','prevenir','preparar','esgotar','mover','dano','dano_area','mover_dano','rivalizar','encerrar_rivalidade','redirecionar_strike','desconto','olhar','base_extra','anular','opcional','retornar','remover_guardian','dano_rivais','controlar','cosmo_temporario','reparar']);
export const slug = value => String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const isArmor = armorCard;
export const isEquipment = card => card?.tipo === 'Equipment' || (card?.tipo === 'Relic' && (card?.subtipos||[]).some(s=>[...ARMOR_SUBTYPES,'Weapon','Equipment'].includes(s)));
export function validateCard(card) {
  const errors=[];
  if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(card.id||'')) errors.push('ID inválido');
  if(!card.nome_exibicao_en?.trim()) errors.push('Nome obrigatório');
  if(!TYPES.includes(card.tipo)) errors.push('Tipo inválido');
  if(!FACTIONS.includes(card.faccao)) errors.push('Facção inválida');
  for(const k of ['custo','power','vida','soul','attack','equipar_custo','equipar_custo_ressonante','equipar_custo_outros']) if(card[k]!==null&&card[k]!==undefined&&(!Number.isInteger(card[k])||card[k]<0)) errors.push(`${k}: use inteiro não negativo`);
  if(['2.0','2.1'].includes(card.revisao_regras)&&card.tipo==='Devotee'&&!(card.vida>0)) errors.push('Devotee precisa de HP positivo');
  if(isEquipment(card)&&['2.0','2.1'].includes(card.revisao_regras)&&!['armadura','arma','acessorio'].includes(card.slot_equipamento)) errors.push('Defina o slot do equipamento');
  if((card.estagios||[]).length&&card.estagios[0].nome!=='Vanilla') errors.push('O primeiro estágio deve ser Vanilla');
  if(card.origem_personagem&&!CHARACTER_ORIGINS.includes(card.origem_personagem))errors.push('Origem de personagem inválida');
  if(card.origem_personagem==='MITOLOGIA ADAPTADA'&&!card.referencias_mitologicas?.length)errors.push('Documente referências mitológicas');
  if(card.versao_armadura===1&&isEquipment(card))errors.push('V1 pertence à identidade do Devotee, não é Equipment');
  if((card.estagios||[]).length>4)errors.push('Armor suporta até quatro estágios de poder');
  const visit=value=>{
    if(!value||typeof value!=='object')return;
    if(value.op&&!OPERATIONS.has(value.op))errors.push(`Operação não suportada: ${value.op}`);
    Object.values(value).forEach(v=>{if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);});
  };
  visit(card.motor);
  return [...new Set(errors)];
}
export function validateDeck(deck,cards) {
  const byId=new Map(cards.map(c=>[c.id,c])),errors=[],god=byId.get(deck.god_id),domain=byId.get(deck.domain_id);
  if(god?.tipo!=='God')errors.push('Escolha um God');
  if(domain?.tipo!=='Domain')errors.push('Escolha um Domain');
  const allowed=new Set([god?.faccao,domain?.faccao,'Neutral']),counts=new Map();let total=0;
  for(const e of deck.main_deck||[]){
    const c=byId.get(e.card_id);
    if(!c){errors.push(`Carta ausente: ${e.card_id}`);continue;}
    if(!Number.isInteger(e.quantity)||e.quantity<1){errors.push(`Quantidade inválida: ${c.nome_exibicao_en}`);continue;}
    total+=e.quantity;const id=c.identidade_carta||c.id;counts.set(id,(counts.get(id)||0)+e.quantity);
    if(['God','Domain'].includes(c.tipo))errors.push('God e Domain ficam fora do deck principal');
    if(!allowed.has(c.faccao))errors.push(`Facção não permitida: ${c.nome_exibicao_en}`);
  }
  if(total!==60)errors.push(`Deck deve ter 60 cartas; possui ${total}`);
  for(const [id,n] of counts)if(n>4)errors.push(`Mais de 4 cópias: ${id}`);
  return errors;
}

// Composição editorial do conjunto; nunca aplica estes limites a decks.
export function validateVanillaSet(cards){
  const tagged=cards.filter(c=>c.conjunto==='vanilla'&&c.categoria_conjunto);
  const pending=FACTIONS.filter(f=>f!=='Neutral').flatMap(f=>['god_armor','divine_artifact'].filter(category=>!tagged.some(c=>c.faccao===f&&c.categoria_conjunto===category)).map(category=>`${f}: ${category}`));
  const errors=[];
  for(const f of FACTIONS.filter(f=>f!=='Neutral'))for(const category of ['god_armor','divine_artifact'])if(tagged.filter(c=>c.faccao===f&&c.categoria_conjunto===category).length>1)errors.push(`${f}: apenas uma ${category} no Vanilla Set`);
  return {errors,pending,complete:!errors.length&&!pending.length};
}
