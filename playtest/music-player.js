// Player de música da partida (autor, 07/11/2026): uma linha discreta embaixo do nome do oponente.
// Anterior, pausa, próxima e sortear; a playlist é a mesma de ../audio.js.
import {musicControl} from './audio.js?v=20261107-player3';

const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICONS = {
  prev: icon('M6 5h2v14H6zM20 5v14L9 12z'),
  play: icon('M7 5v14l12-7z'),
  pause: icon('M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'),
  next: icon('M16 5h2v14h-2zM4 5v14l11-7z'),
  shuffle: icon('M15 4h5v5h-2V7.4l-4.3 4.3-1.4-1.4L16.6 6H15zM4 6.4 5.4 5 19 18.6V17h2v5h-5v-2h1.6zM4 17.6l4.6-4.6 1.4 1.4L5.4 19z')
};

// Box próprio, logo abaixo da placa do oponente (autor: dois boxes separados, o da música bem fino).
export function mountMusicPlayer(anchor = document.querySelector('.rk-plate--foe')) {
  if (!anchor || document.querySelector('.mx-player')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="mx-player" role="group" aria-label="Music" hidden>
    <button type="button" data-mx="prev" aria-label="Previous track">${ICONS.prev}</button>
    <button type="button" data-mx="toggle" aria-label="Pause music">${ICONS.pause}</button>
    <button type="button" data-mx="next" aria-label="Next track">${ICONS.next}</button>
    <button type="button" data-mx="shuffle" aria-label="Random track">${ICONS.shuffle}</button>
    <span class="mx-player__bar" role="progressbar" aria-label="Track progress" aria-valuemin="0" aria-valuemax="100"><i></i></span>
  </div>`);
  const box = document.querySelector('.mx-player'), toggle = box.querySelector('[data-mx="toggle"]'), bar = box.querySelector('.mx-player__bar');
  const paint = () => {
    const info = musicControl.info();
    box.hidden = !info;
    if (!info) return;
    bar.firstChild.style.transform = `scaleX(${info.progress})`;
    bar.setAttribute('aria-valuenow', Math.round(info.progress * 100));
    toggle.innerHTML = info.paused ? ICONS.play : ICONS.pause;
    toggle.setAttribute('aria-label', info.paused ? 'Resume music' : 'Pause music');
  };
  box.addEventListener('click', e => {
    const act = e.target.closest('[data-mx]')?.dataset.mx;
    if (act) { e.stopPropagation(); musicControl[act](); paint(); }
  });
  // A placa muda de lugar conforme a tela (e fica presa ao HUD do God em telas largas): o box segue.
  const place = () => {
    const r = anchor.getBoundingClientRect();
    if (!r.width) return;
    box.style.left = `${Math.round(r.left)}px`;
    box.style.top = `${Math.round(r.bottom + 4)}px`;
    box.style.width = `${Math.round(r.width)}px`;
  };
  addEventListener('ss-music', paint);
  addEventListener('resize', place);
  setInterval(() => { place(); paint(); }, 500);
  paint(); place();
}
