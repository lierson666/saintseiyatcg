// Rosto do God no HUD do Olympus Arena (autor, 28/10/2026). Só aparece em cartas de God: escolhe a imagem (a arte da
// carta ou outra), ajusta zoom e posição no círculo do HUD e grava à parte em projects/<id>-hud.json (+ art/<id>-hud.png),
// para o "salvar" do Forge, que regrava projects/<id>.json inteiro, não apagar a escolha. tools/forge-art-web.sh exporta.
const DEFAULT = {image: null, zoom: 260, x: 50, y: 16};
let current = null, hud = {...DEFAULT}, upload = null, cardArt = '';

const box = document.createElement('section');
box.id = 'godHud';
box.hidden = true;
box.innerHTML = `
  <style>
    #godHud { margin: 12px 0; padding: 12px; border: 1px solid var(--line, #34323f); border-radius: 10px; background: var(--panel, #1c1b23); }
    #godHud h3 { margin: 0 0 4px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--gold, #f2d27a); }
    #godHud p { margin: 0 0 10px; font-size: 12px; opacity: .7; }
    #godHud .gh-row { display: flex; gap: 14px; align-items: center; }
    #godHud .gh-face { flex: none; width: 150px; aspect-ratio: 1; border-radius: 50%; cursor: grab; touch-action: none;
      background-color: #0b0e22; background-repeat: no-repeat; box-shadow: 0 0 0 4px #d9a43e, 0 0 0 6px #2a1c06, 0 0 22px rgba(255, 210, 120, .45); }
    #godHud .gh-face:active { cursor: grabbing; }
    #godHud .gh-ctl { flex: 1; display: grid; gap: 6px; font-size: 12px; }
    #godHud .gh-ctl label { display: grid; grid-template-columns: 54px 1fr 38px; align-items: center; gap: 6px; }
    #godHud .gh-ctl output { text-align: right; opacity: .8; }
    #godHud .gh-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    #godHud .gh-say { min-height: 1.2em; margin-top: 6px; font-size: 12px; }
  </style>
  <h3>God face in the game HUD</h3>
  <p>Arraste para mover, use a roda do mouse para o zoom. O círculo é o mesmo do HUD.</p>
  <div class="gh-row">
    <div class="gh-face" title="Arraste para posicionar; roda do mouse para zoom"></div>
    <div class="gh-ctl">
      <label>Zoom <input type="range" name="zoom" min="60" max="500" step="1"><output data-for="zoom"></output></label>
      <label>Horizontal <input type="range" name="x" min="0" max="100" step="0.5"><output data-for="x"></output></label>
      <label>Vertical <input type="range" name="y" min="0" max="100" step="0.5"><output data-for="y"></output></label>
    </div>
  </div>
  <div class="gh-btns">
    <button type="button" data-act="pick">Escolher imagem…</button>
    <button type="button" data-act="card">Usar arte da carta</button>
    <button type="button" data-act="reset">Reajustar</button>
    <button type="button" data-act="save">Salvar rosto</button>
    <input type="file" accept="image/png,image/jpeg" hidden>
  </div>
  <div class="gh-say" role="status"></div>`;
const face = box.querySelector('.gh-face'), file = box.querySelector('input[type=file]'), say = t => { box.querySelector('.gh-say').textContent = t; };

// Mesma conta do HUD do jogo: largura da imagem em % do círculo e posição em %.
function paint() {
  const src = upload || (hud.image ? `${hud.image}?v=${Date.now() % 1e6}` : cardArt);
  face.style.backgroundImage = src ? `url("${src}")` : 'none';
  face.style.backgroundSize = `${hud.zoom}% auto`;
  face.style.backgroundPosition = `${hud.x}% ${hud.y}%`;
  for (const k of ['zoom', 'x', 'y']) {
    box.querySelector(`[name=${k}]`).value = hud[k];
    box.querySelector(`output[data-for=${k}]`).textContent = k === 'zoom' ? `${Math.round(hud[k])}%` : `${Math.round(hud[k])}`;
  }
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

async function load(S) {
  current = S.id; upload = null; hud = {...DEFAULT};
  cardArt = S.art?.src ? (S.art.src.startsWith('card-forge/') ? '../' + S.art.src : S.art.src) : '';
  try {
    const r = await fetch(`projects/${encodeURIComponent(S.id)}-hud.json?read=${Date.now()}`, {cache: 'no-store'});
    if (r.ok) hud = {...DEFAULT, ...(await r.json())};
  } catch { /* sem rosto salvo: usa a arte da carta */ }
  if (hud.image?.startsWith('card-forge/')) hud.image = '../' + hud.image;
  say(hud.image ? 'Rosto salvo carregado.' : 'Usando a arte da carta.');
  paint();
}

// O Forge não emite evento de troca de carta; acompanha a carta selecionada.
setInterval(() => {
  const S = window.forge?.S?.();
  if (!S) return;
  // logo abaixo do bloco "Identidade", onde o tipo God é escolhido
  if (!box.isConnected) [...document.querySelectorAll('fieldset > legend')].find(l => /Identidade/.test(l.textContent))?.parentElement.after(box);
  box.hidden = S.tipo !== 'God';
  if (!box.hidden && S.id && S.id !== current) load(S);
}, 400);

box.addEventListener('input', e => { if (e.target.name in DEFAULT) { hud[e.target.name] = +e.target.value; paint(); } });
face.addEventListener('wheel', e => { e.preventDefault(); hud.zoom = clamp(hud.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06), 60, 500); paint(); }, {passive: false});
face.addEventListener('pointerdown', e => {
  face.setPointerCapture(e.pointerId);
  const start = {x: e.clientX, y: e.clientY, hx: hud.x, hy: hud.y}, w = face.clientWidth;
  // Arrastar para a direita mostra mais da esquerda da imagem: a posição em % anda ao contrário do mouse.
  const move = ev => { hud.x = clamp(start.hx - (ev.clientX - start.x) / w * 100, 0, 100); hud.y = clamp(start.hy - (ev.clientY - start.y) / w * 100, 0, 100); paint(); };
  face.addEventListener('pointermove', move);
  face.addEventListener('pointerup', () => face.removeEventListener('pointermove', move), {once: true});
});
file.addEventListener('change', () => {
  const f = file.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { upload = reader.result; hud = {...hud, zoom: 140, x: 50, y: 30}; say(`Imagem nova: ${f.name}. Ajuste e salve.`); paint(); };
  reader.readAsDataURL(f);
  file.value = '';
});
box.addEventListener('click', async e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'pick') file.click();
  if (act === 'card') { upload = null; hud.image = null; say('Usando a arte da carta. Salve para confirmar.'); paint(); }
  if (act === 'reset') { hud = {...hud, zoom: DEFAULT.zoom, x: DEFAULT.x, y: DEFAULT.y}; paint(); }
  if (act !== 'save' || !current) return;
  try {
    say('Salvando…');
    const post = async (url, body, type) => {
      const r = await fetch(url, {method: 'POST', headers: {'Content-Type': type}, body});
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || `HTTP ${r.status}`);
      return j;
    };
    if (upload) {
      const blob = await (await fetch(upload)).blob();
      hud.image = (await post(`/api/art/${current}-hud`, blob, blob.type)).path;
      upload = null;
    }
    const data = {image: hud.image?.replace(/^\.\.\//, '') || null, zoom: Math.round(hud.zoom), x: +hud.x.toFixed(1), y: +hud.y.toFixed(1)};
    await post(`/api/project/${current}-hud`, JSON.stringify(data), 'application/json');
    hud = {...data, image: data.image ? '../' + data.image : null};
    say('Rosto salvo. Rode tools/forge-art-web.sh para levar ao jogo.');
    paint();
  } catch (err) { say(`Erro: ${err.message}`); }
});
