// Regressões de hierarquia e do contrato cosmético, sem gravar o catálogo.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {renderLiveCard} from '../shared/live-card.js';import {textBlocks,renderRules,ruleBlocksWithoutKeywords} from '../shared/card-text.js';import {isEquipment} from '../shared/card-model.js';import {equipmentCostText} from '../shared/card-visual-values.js';
const cards=JSON.parse(fs.readFileSync(new URL('../data/cards.json',import.meta.url))).cartas;
test('Equip permanece nas regras sem badge no rodapé padrão',()=>{for(const card of cards.filter(isEquipment)){const html=renderLiveCard(card);assert.doesNotMatch(html,/live-card__equip/);const line=equipmentCostText(card);if(line)assert.match(html,/Equip/);}});
const stagedArmor={id:'fixture-cloth',tipo:'Equipment',subtipos:['Armor','Cloth'],donos:['pegasus-seiya'],habilidades_en:['Equip: +1 Power / +1 HP.','Owner: Pegasus Seiya.','7th Sense — ACTION, pay 2 Cosmo: Evolve.'],estagios:[{nome:'Vanilla',bonus_poder:1,bonus_vida:1},{nome:'7th Sense',custo:2,bonus_poder:2,bonus_vida:2}]};
test('Owner, bônus Vanilla e Evolve têm blocos distintos',()=>{const c=stagedArmor;assert.deepEqual(textBlocks(c.habilidades_en).map(b=>b.kind),['equip','owner','evolution']);const html=renderRules(c.habilidades_en);assert.match(html,/rule-heading/);assert.match(html,/7th Sense/);});
test('Resonance mantém as duas identidades e os efeitos sem juntá-los',()=>{const c=cards.find(c=>c.id==='athena-v6-014');assert.equal(textBlocks(c.habilidades_en).filter(b=>b.kind==='resonance').length,2);});
test('cartas vivas não usam o PNG completo de impressão',()=>{for(const card of cards){const html=renderLiveCard(card);assert.doesNotMatch(html,/<img[^>]+CARDS\//);assert.match(html,/live-card__heading/);}});
test('texto importado é escapado e não vira HTML executável',()=>{const html=renderRules(['<img src=x onerror=alert(1)>']);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);});
test('mudar estágio atualiza o texto exibido sem usar valores antigos',async()=>{const {presentationRules}=await import('../shared/card-text.js');const c=structuredClone(stagedArmor);c.estagios[1].custo=7;c.estagios[1].bonus_vida=8;const rules=presentationRules(c).join(' ');assert.match(rules,/pay 7 Cosmo/);assert.match(rules,/\+2 Power \/ \+8 HP/);assert.doesNotMatch(rules,/pay 2 Cosmo/);});
test('normalizar bônus não apaga as passivas dos equipamentos',async()=>{const {presentationRules}=await import('../shared/card-text.js');for(const faction of ['Hades','Ares','Artemis']){const c={...stagedArmor,faccao:faction,habilidades_en:['Equip: +1 Power / +1 HP. While equipped, retain this approved passive.']};const free=c.habilidades_en[0].replace(/^Equip:[^.]+\.\s*/,'');assert.ok(presentationRules(c).join(' ').includes(free));}});

test('keywords selecionadas não se repetem nas regras, sem apagar usos em habilidades',()=>{
  const raw=['Guardian.','**GUARDIAN**','Long Range, Pierce.','Dragon Shield: Guardian does not prevent this ability.','Equipped Devotee gains Pierce.'];
  const before=JSON.stringify(raw),blocks=ruleBlocksWithoutKeywords(raw,['Guardian','Long Range','Pierce']);
  assert.equal(blocks.length,2);assert.match(blocks[0].body,/Guardian/);assert.match(blocks[1].body,/gains Pierce/);assert.equal(JSON.stringify(raw),before);
  assert.equal(ruleBlocksWithoutKeywords(['Guardian.'],[]).length,1);
});
test('carta viva mostra uma única keyword e preserva a habilidade que a menciona',()=>{
  const card={id:'fixture-keywords',tipo:'Devotee',faccao:'Athena',power:2,vida:4,keywords_en:['Guardian'],habilidades_en:['Guardian.','Guardian.','Shield: This Guardian prevents damage.']};
  const html=renderLiveCard(card);assert.match(html,/<p class="live-card__keywords"><strong>GUARDIAN<\/strong><\/p>/);assert.equal((html.match(/>GUARDIAN</g)||[]).length,2);assert.match(html,/prevents damage/);assert.doesNotMatch(html,/Shield::/);assert.equal(card.habilidades_en.length,3);
});
