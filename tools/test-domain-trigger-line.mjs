// node --test tools/test-domain-trigger-line.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {triggerLine} from '../shared/card-i18n.js';

const {cards} = (d => ({cards: Array.isArray(d) ? d : d.cards || Object.values(d).flat()}))(JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url))));
const byId = id => cards.find(c => c.id === id);

test('gatilho de Domain acha a linha que cita o evento', () => {
  const grove = byId('artemis-v6-429');
  assert.match(grove.habilidades_en[triggerLine(grove, 'a Devotee survives a Strike')], /survives a Strike/);
  const forest = byId('artemis-v6-428');
  assert.match(forest.habilidades_en[triggerLine(forest, 'enters')], /^Forest Blessing/);
});

test('ativada acha a linha pelo nome; sem linha de gatilho devolve -1', () => {
  const forest = byId('artemis-v6-428');
  assert.match(forest.habilidades_en[triggerLine(forest, 'RESONANCE')], /^Resonance/);
  assert.equal(triggerLine({habilidades_en: ['Aura — Friendly Devotees get +1 HP.']}, 'enters'), -1);
});
