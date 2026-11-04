// Renomear personagem no Card Forge: as cartas ligadas recebem o nome novo.
import test from 'node:test';
import assert from 'node:assert/strict';
import {renameLinks} from '../card-forge/rename-links.js';

const devotee = {id: 'd', tipo: 'Devotee', nome_exibicao_en: 'ALCEU OF LAMASSU', nome_exibicao_pt: 'ALCEU DE LAMASSU'};
const renamed = {...devotee, nome_exibicao_en: 'ANZU ALCEU', nome_exibicao_pt: 'ANZU ALCEU'};
const armor = {id: 'a', tipo: 'Equipment', habilidades_en: ['Gale — Deal 1.', 'Resonance — Alceu of Lamassu: Gain +1 @ATK.'], habilidades_pt: ['Ressonância — Alceu de Lamassu: Ganha +1 @ATQ.'], auto_equip_en: ['Alceu of Lamassu', 'Mu'], auto_equip_pt: ['Alceu de Lamassu'], donos: ['alceu-of-lamassu']};
const other = {id: 'o', tipo: 'Equipment', habilidades_en: ['Resonance — Mu: Draw.'], auto_equip_en: ['Mu'], donos: ['mu']};

test('a Armor ligada recebe o nome novo em texto, Resonance e dono; a outra não muda', () => {
  const [hit, ...rest] = renameLinks([devotee, armor, other], devotee, renamed);
  assert.equal(rest.length, 0);
  assert.deepEqual(hit.habilidades_en, ['Gale — Deal 1.', 'Resonance — Anzu Alceu: Gain +1 @ATK.']);
  assert.deepEqual(hit.habilidades_pt, ['Ressonância — Anzu Alceu: Ganha +1 @ATQ.']);
  assert.deepEqual(hit.auto_equip_en, ['Anzu Alceu', 'Mu']);
  assert.deepEqual(hit.auto_equip_pt, ['Anzu Alceu']);
  assert.deepEqual(hit.donos, ['anzu-alceu']);
});
test('nome igual, nome parcial e carta que não é personagem não geram mudança', () => {
  assert.deepEqual(renameLinks([armor], devotee, {...devotee}), []);
  assert.deepEqual(renameLinks([{...other, habilidades_en: ['Resonance — Alceu of Lamassus: Draw.']}], devotee, renamed), []);
  assert.deepEqual(renameLinks([armor], {...armor, nome_exibicao_en: 'X'}, {...armor, nome_exibicao_en: 'Y'}), []);
});
test('mantém "of" minúsculo e aceita ID especial de personagem', () => {
  const [hit] = renameLinks([{id: 'r', ressonancias: [{personagem_id: 'alceu-of-lamassu', habilidade_en: 'x'}]}, armor], devotee, {...devotee, nome_exibicao_en: 'LIOR OF ETHON'});
  assert.equal(hit.ressonancias[0].personagem_id, 'lior-of-ethon');
  const [named] = renameLinks([armor], devotee, {...devotee, nome_exibicao_en: 'LIOR OF ETHON'});
  assert.equal(named.auto_equip_en[0], 'Lior of Ethon');
});
