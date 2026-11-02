// Carta de God com duas faces: texto certo em cada uma, sem perder nada, e layout que acompanha o texto.
// node --test tools/test-god-face.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {godFaceLayout, godFaceTexts, godTextTop} from '../shared/god-face.js';

const {cartas} = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url)));
const {layouts} = JSON.parse(readFileSync(new URL('../CARD-TEMPLATE/templates.json', import.meta.url)));
const gods = cartas.filter((c) => c.tipo === 'God');
const rules = (L) => L.elements.find((e) => e.kind === 'rules');

test('as duas faces juntas têm todo o texto do God, sem repetir', () => {
  assert.equal(gods.length, 5);
  for (const c of gods) {
    assert.deepEqual([...godFaceTexts(c, 'front'), ...godFaceTexts(c, 'back')], [...c.habilidades_en, c.habilidade_awaken_en, c.ultimate_en].filter(Boolean), c.id);
    assert.ok(godFaceTexts(c, 'back').every((t) => !c.habilidades_en.includes(t)), c.id);
  }
});

test('verso com mais texto começa mais alto, sem subir além do rosto', () => {
  const top = (id) => godTextTop(gods.find((c) => c.id === id), 'back');
  assert.ok(top('athena-001') < top('poseidon-001'));
  for (const c of gods) for (const face of ['front', 'back']) {
    const at = godTextTop(c, face);
    assert.ok(at >= 0.4 && at <= 0.6, `${c.id} ${face} ${at}`);
  }
});

test('regras, tipo e Soul descem juntos, e a caixa termina no mesmo lugar', () => {
  const base = layouts.god, [, y, , h] = rules(base).rect;
  for (const c of gods) for (const face of ['front', 'back']) {
    const {layout, top} = godFaceLayout(base, c, face), [, ny, , nh] = rules(layout).rect, dy = ny - y;
    assert.equal(ny, Math.round(top * 2091));
    assert.equal(ny + nh, y + h);
    assert.equal(layout.elements.find((e) => e.field === 'typeLine').y, base.elements.find((e) => e.field === 'typeLine').y + dy);
    assert.equal(layout.elements.find((e) => e.piece === 'athena/gem_soul').dy, base.elements.find((e) => e.piece === 'athena/gem_soul').dy + dy);
  }
  assert.equal(rules(base).rect[1], y, 'o layout original não muda');
});

test('só o verso lista os poderes da frente que seguem ativos', () => {
  const po = gods.find((c) => c.id === 'poseidon-001'), value = (face) => godFaceLayout(layouts.god, po, face).layout.elements.find((e) => e.value)?.value;
  assert.equal(value('front'), undefined);
  assert.equal(value('back'), 'Still active: WATER PRISON · BINDING TIDE');
});
