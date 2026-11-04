// Golpes em pixel art (Sprite Fusion, MIT: vendor/sprite-fusion). Só apresentação, como scene.js: nunca muda estado nem
// segura a fila do director. Dois canvas sobre os VFX WebGL: cor e luz (somada à tela). Sem efeito vivo, ficam ocultos e nada roda.
const load = name => import(`./vendor/sprite-fusion/${name}.js`);
const WORLD_PX = 2; // nos efeitos, 1 pixel de arte = 2 unidades de mundo
export const MAX_LIFE = 3; // efeito que passar disso sai da tela: a mesa não pode ficar coberta
const FADE = .6; // os de clima (chuva, neve...) nunca terminam sozinhos: saem aos poucos no fim do tempo

// Efeitos à escolha no Star Hill e no Card Forge (data/card-animations.json).
export const EFFECTS = [['slash', 'Corte'], ['impact', 'Impacto'], ['ice', 'Gelo'], ['fire', 'Fogo'], ['lightning', 'Raio'], ['poison', 'Veneno'], ['light', 'Luz'], ['dark', 'Trevas'], ['explosion', 'Explosão'], ['energy', 'Energia'], ['shield', 'Escudo'], ['heal', 'Cura'], ['power', 'Aura'],
  ['muzzle', 'Disparo'], ['blood', 'Sangue'], ['pickup', 'Coleta'], ['dash', 'Investida'], ['blink', 'Teleporte'], ['sparkle', 'Brilho'], ['rain', 'Chuva'], ['snow', 'Neve'], ['fog', 'Névoa'], ['embers', 'Brasas'], ['fireflies', 'Vaga-lumes'], ['leaves', 'Folhas'], ['bubbles', 'Bolhas']];
// Momentos da carta, com as mesmas chaves dos sons quando existem. O texto vai no Star Hill e no Card Forge.
export const ANIM_MOMENTS = [['golpe', 'Golpe do Strike', 'O Strike resolveu'], ['impacto', 'Impacto em Devotee', 'Strike acertou um Devotee'], ['impacto_deus', 'Impacto no Deus', 'Strike acertou o Deus'], ['strike', 'Ao receber Strike', 'Foi atingido por um Strike'],
  ['carga', 'Carga do golpe', 'Cosmo sobe antes do impacto'], ['declarar', 'Ao declarar ataque', 'Devotee declarou o Strike'], ['cast', 'Ao conjurar', 'A carta foi jogada'], ['entrada', 'Entrada no campo', 'Devotee ou Equipment entrou no campo'], ['retorno', 'Volta do Tartarus', 'Voltou ao campo ou à mão'],
  ['morte', 'Ao morrer', 'Foi derrotado'], ['dano', 'Dano em Devotee', 'Devotee perdeu HP'], ['soul', 'Dano no Soul', 'O Deus perdeu Soul'], ['escudo', 'Dano prevenido', 'Dano foi prevenido'], ['cura', 'Ganho de Soul', 'O Deus ganhou Soul'],
  ['habilidade', 'Habilidade', 'Gatilho ou habilidade resolveu'], ['ultimate', 'Ultimate', 'A Ultimate resolveu'], ['poder_divino', 'Poder Divino', 'God usou o Poder Divino'], ['poder_dominio', 'Poder do Domain', 'Domain usou o poder'], ['awaken', 'Awaken', 'God despertou']];
// Quem manda: linha da habilidade, carta, facção e o padrão do jogo; false é "sem animação" de propósito. `own`: ignora o padrão do jogo.
export function animFor(data, kind, {id, faction, line = null, own = false} = {}) {
  const layers = [data?.[id], faction && data?.[`faccao-${faction}`], !own && data?.padrao];
  if (kind === 'habilidade' && line != null) { const v = layers[0]?.linhas?.[line]; if (v != null) return v; }
  for (const layer of layers) { const v = layer?.[kind]; if (v != null) return v; }
  return null;
}
export const ELEMENT_COLOR = {ice: '#a6ecff', fire: '#ff8a2a', lightning: '#ffe26b', poison: '#9be36b', light: '#ffe7a3', dark: '#a064ff', explosion: '#ffb15a', pickup: '#8cff7a', dash: '#5eb0ff', blink: '#a064ff'};

// Cor do tema ('#rrggbb' ou 'rgb(r, g, b)') → tons do mais claro ao mais escuro, no formato dos efeitos (RGBA em Uint32).
const channels = color => {
  const m = /^#([\da-f]{6})$/i.exec(color), parts = m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : String(color).match(/\d+/g)?.slice(0, 3).map(Number);
  return parts?.length === 3 ? parts : [255, 224, 160];
};
const TONES = [1, .7, .4, 0, -.3, -.55, -.75, -.88];
const toned = (color, k) => channels(color).map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
export const rampOf = (color, n = 7) => TONES.slice(0, n).map(k => { const [r, g, b] = toned(color, k); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; });
const paletteOf = (color, n = 8) => TONES.slice(0, n).map(k => `#${toned(color, k).map(v => v.toString(16).padStart(2, '0')).join('')}`);

const around = g => ({x: g.x - g.w * .9, y: g.top - g.h * .2, w: g.w * 1.8, h: g.h * 1.2}); // clima: em volta da carta, nunca a mesa inteira
// Efeito + opções, em coordenadas de mundo. `g`: {x, y, top, bottom, w, h, from: [x, y], s (escala), color, power, seed}. Puro, para o teste rodar sem navegador.
export const RECIPES = {
  slash: g => ['slash', {x: g.x, y: g.y, facing: g.from && g.from[0] > g.x ? -1 : 1, size: g.s * 1.1 * (1 + g.power * .5), sparks: 10 + Math.round(g.power * 14), ramp: rampOf(g.color), sparkRamp: rampOf(g.color).slice(1, 5)}],
  impact: g => ['impact', {x: g.x, y: g.y, angle: g.from ? Math.atan2(g.y - g.from[1], g.x - g.from[0]) : -Math.PI / 2, size: g.s * 1.2 * (g.strength ?? 1), ramp: rampOf(g.color, 6)}],
  ice: g => ['ice', {kind: 'nova', x: g.x, ground: g.bottom, size: g.s * .7, reach: 150 * g.s, charge: .08, hold: .12}],
  // As chamas sobem da borda de cima da silhueta: usar a metade de baixo da carta faz o fogo passar por cima da arte.
  fire: g => { const w = Math.round(g.w / WORLD_PX), h = Math.round(g.h / 2 / WORLD_PX), data = new Uint32Array(w * h).fill(0xffffffff), x = Math.round((g.x - g.w / 2) / WORLD_PX), y = Math.round(g.y / WORLD_PX);
    return ['fire', {actor: {feet: () => [g.x, g.bottom], silhouette: () => ({x, y, w, h, data})}, size: g.s, duration: .8}]; },
  lightning: g => ['lightning', {kind: 'impact', x: g.x, y: g.y, size: g.s * .9}],
  poison: g => ['poison', {kind: 'cloud', x: g.x, ground: g.bottom, from: g.from || undefined, size: g.s * .7}], // o frasco voa do atacante
  light: g => ['holy-light', {x: g.x, ground: g.bottom, hold: .25, width: 13 * g.s * .8}],
  dark: g => ['black-hole', {x: g.x, y: g.y, radius: 20 * g.s, life: .45, pull: .4}],
  explosion: g => ['explosion', {x: g.x, ground: g.bottom, size: g.s * .55, chunks: 6}],
  energy: g => ['energy', {kind: 'beam', x: g.from?.[0] ?? g.x, y: g.from?.[1] ?? g.y, to: [g.x, g.y], charge: .02, hold: .22, width: 5 * g.s * (1 + g.power * .8), colors: rampOf(g.color, 7)}],
  shield: g => ['shield', {x: g.x, y: g.bottom, radius: 38 * g.s, hold: .7, colors: paletteOf(g.color, 7)}],
  heal: g => ['heal', {x: g.x, y: g.bottom, count: 8}],
  power: g => ['power-up', {x: g.x, y: g.bottom, size: g.s * .8, palette: paletteOf(g.color, 7)}],
  muzzle: g => { const [x, y] = g.from || [g.x - g.w, g.y]; return ['muzzle-flash', {x, y, angle: Math.atan2(g.y - y, g.x - x), size: g.s, casing: false, ground: g.bottom}]; },
  blood: g => ['blood', {x: g.x, y: g.y, angle: g.from ? Math.atan2(g.y - g.from[1], g.x - g.from[0]) : undefined, size: g.s * .8, stainLife: .6, ground: g.bottom}],
  pickup: g => ['pickup', {x: g.x, y: g.y, item: 'orb', palette: paletteOf(g.color, 6), wait: .7, ground: g.bottom}],
  dash: g => { const x = g.from?.[0] ?? g.x - g.w; return ['movement', {kind: 'dash', x, y: g.bottom, ground: g.bottom, facing: g.x < x ? -1 : 1, distance: Math.max(g.w, Math.abs(g.x - x)), colors: rampOf(g.color, 7)}]; },
  blink: g => ['movement', {kind: 'blink', x: g.from?.[0] ?? g.x - g.w, y: g.bottom, to: g.x, ground: g.bottom, colors: rampOf(g.color, 7)}],
  sparkle: g => ['sparkle', {x: g.x, y: g.y, size: g.s * .9}],
  rain: g => ['rain', {area: around(g), ground: g.bottom}],
  snow: g => ['snow', {area: around(g), ground: g.bottom}],
  fog: g => ['fog', {area: around(g), density: 2}],
  embers: g => ['embers', {area: around(g), density: 6, heat: false}],
  fireflies: g => ['fireflies', {area: around(g), ground: g.bottom, density: 3, grass: false}],
  leaves: g => ['falling-leaves', {area: around(g), ground: g.bottom, leaves: 20, litter: false}],
  bubbles: g => ['bubbles', {area: around(g), ground: g.bottom, density: 3, surface: false, caustics: false, tint: false}],
};
const FILES = [...new Set(Object.values(RECIPES).map(r => r({x: 0, y: 0, top: 0, bottom: 0, w: 1, h: 1, s: 1, power: 0, color: '#fff'})[0]))];
export const effectFiles = () => FILES;

export function createPixelFx(stage, {flashes = () => true, tuning = () => ({})} = {}) {
  let cColor, cLight, color, light, art = 0, frame, imgColor, imgLight, live = [], raf = 0, last = 0;

  function mount() {
    const layer = z => { const c = document.createElement('canvas'); c.className = 'pixel-fx'; c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;visibility:hidden;z-index:${z}`; c.setAttribute('aria-hidden', 'true'); stage.append(c); return c; };
    color = layer(41); light = layer(42); light.style.mixBlendMode = 'plus-lighter';
    cColor = color.getContext('2d'); cLight = light.getContext('2d');
  }
  function size() {
    if (!color) mount();
    const r = stage.getBoundingClientRect();
    art = r.width < 900 ? 2 : 3; // tela pequena: pixel menor, para o golpe caber na carta
    const w = Math.max(1, Math.ceil(r.width / art)), h = Math.max(1, Math.ceil(r.height / art));
    if (frame?.w === w && frame?.h === h) return;
    for (const c of [color, light]) { c.width = w; c.height = h; }
    imgColor = cColor.createImageData(w, h); imgLight = cLight.createImageData(w, h);
    frame = {w, h, ox: 0, oy: 0, color: new Uint32Array(imgColor.data.buffer), light: new Uint32Array(imgLight.data.buffer)};
  }
  const show = on => { for (const c of [color, light]) c.style.visibility = on ? 'visible' : 'hidden'; };
  // Celular e Low (is-calm) e "reduzir clarões" ficam sem a camada de luz: somar uma tela inteira é o que mais pesa.
  const glow = () => flashes() && !stage.classList.contains('is-calm');

  function tick(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    frame.color.fill(0);
    const lit = glow();
    if (lit) frame.light.fill(0);
    for (const item of live) { const step = dt * item.speed; item.age += step; item.fx.update(step); item.fx.draw(frame, 'back'); item.fx.draw(frame, 'front'); }
    cColor.putImageData(imgColor, 0, 0);
    if (lit) cLight.putImageData(imgLight, 0, 0); else cLight.clearRect(0, 0, frame.w, frame.h);
    live = live.filter(item => item.age < MAX_LIFE && !item.fx.done());
    if (live.length) {
      color.style.opacity = light.style.opacity = Math.min(1, Math.max(...live.map(item => MAX_LIFE - item.age)) / FADE);
      raf = requestAnimationFrame(tick);
    } else show(false);
  }
  // Retângulo do DOM → geometria em mundo. O tamanho acompanha a carta: 190 px de largura = 1,5 no pixel 3.
  function geometry(rect, {from, color: c = '#ffe0a0', power = 0, strength, size: k0 = 1} = {}) {
    size();
    const s = stage.getBoundingClientRect(), k = WORLD_PX / art, w = rect.width || 110, h = rect.height || 150;
    const left = (rect.left ?? rect.x - w / 2) - s.left, top = (rect.top ?? rect.y - h / 2) - s.top;
    return {x: (left + w / 2) * k, y: (top + h / 2) * k, top: top * k, bottom: (top + h) * k, w: w * k, h: h * k,
      from: from ? [(from.x - s.left) * k, (from.y - s.top) * k] : null, s: Math.max(.55, w / 190 * 1.5 * 3 / art) * k0, color: c, power, strength};
  }
  // Ajustes do gestor (Star Hill): ligado, tamanho, velocidade e cor de cada efeito.
  function play(recipe, rect, opts = {}) {
    const tune = tuning()?.[recipe] || {};
    if (!RECIPES[recipe] || tune.ligado === false) return Promise.resolve();
    const [file, options] = RECIPES[recipe](geometry(rect, {...opts, color: tune.cor || opts.color || ELEMENT_COLOR[recipe], size: tune.tamanho || 1}));
    return load(file).then(m => {
      live.push({fx: m.default({...options, seed: 1 + Math.floor(Math.random() * 1e6)}), age: 0, speed: tune.velocidade || 1});
      show(true);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }).catch(err => console.debug(err)); // efeito que não carrega não pode travar a partida
  }
  return {
    play,
    preload() { for (const f of FILES) load(f).catch(() => {}); }, // o primeiro golpe não espera a rede
    clear() { live = []; },
    live: () => live.length,
  };
}
