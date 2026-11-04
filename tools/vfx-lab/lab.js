// Tela local para ver cada efeito do jogo (playtest/divine/pixel-vfx.js) sobre a arena real.
// Fica em tools/: o deploy não publica esta pasta. Abrir em http://127.0.0.1:8765/tools/vfx-lab/
import {createScene} from '../../playtest/divine/scene.js';
import {createPixelFx, RECIPES, ELEMENT_COLOR} from '../../playtest/divine/pixel-vfx.js';

const $ = s => document.querySelector(s);
const pixel = createPixelFx($('#stage'));
const center = el => { const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; };
const play = name => {
  const target = $('#target'), from = center($('#attacker'));
  pixel.play(name, target.getBoundingClientRect(), {from, color: ELEMENT_COLOR[name] || '#ffcd64', power: .4, strength: 1.2});
};
$('#bar').innerHTML = Object.keys(RECIPES).map(n => `<button data-play="${n}">${n}</button>`).join('');
$('#bar').addEventListener('click', e => { const n = e.target.closest('[data-play]')?.dataset.play; if (n) play(n); });
await createScene($('#arena'), {quality: matchMedia('(pointer: coarse)').matches ? 'phone' : 'high', theme: 'olympus'});
window.__lab = {play, pixel};
