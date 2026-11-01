// Resolução da tela (autor, 31/10/2026): no desktop, o lobby e o duelo rodam num palco 16:9 do tamanho escolhido
// (Options › Resolution), encaixado na janela com o céu do site nas sobras. A página roda dentro de um iframe do
// tamanho da resolução, então vw/vh/@media valem para ela e nada é cortado. Celular e tablet ficam fora (layout atual).
// Script clássico, o primeiro do <head>: na janela de fora para o carregamento e monta o palco com a mesma URL.
(() => {
  const KEY = 'ssTcgOlympusArena', MIN = [1280, 720];
  const LIST = {auto: 'Auto', '1280x720': '1280 × 720', '1366x768': '1366 × 768', '1600x900': '1600 × 900', '1920x1080': '1920 × 1080', '2560x1440': '2560 × 1440'};
  // Acessibilidade das cartas (autor, 31/10/2026): tamanho do texto (--lc-text, de Large para cima com placa e letra mais
  // grossa: html.lc-a11y) e tamanho da carta na mão e nas prévias (--card-scale). Vale em todo aparelho, lobby e duelo.
  const SIZES = {'0.9': 'Small', '1.0': 'Normal', '1.25': 'Large', '1.5': 'Extra large'};
  const CARD = {'0.9': 'Small', '1.0': 'Normal', '1.15': 'Large', '1.3': 'Extra large'};
  const stored = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const a11y = () => {
    const o = stored(), text = String(o.cardText ?? '1.0') in SIZES ? Number(o.cardText ?? 1) : 1, size = String(o.cardSize ?? '1.0') in CARD ? Number(o.cardSize ?? 1) : 1;
    const html = document.documentElement;
    html.style.setProperty('--lc-text', text); html.style.setProperty('--card-scale', size);
    html.classList.toggle('lc-a11y', text >= 1.25);
  };
  a11y();
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}').resolution; return v in LIST ? v : 'auto'; } catch { return 'auto'; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify({...JSON.parse(localStorage.getItem(KEY) || '{}'), resolution: v})); } catch { /* sem armazenamento */ } };
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Tablet (autor, 01/11/2026): em pé, a página se desenha com 600px de largura e cai no layout de celular, ampliado;
  // deitado, volta à largura real e usa o layout de desktop. A orientação vem da tela porque 600px não muda em pé/deitado da página.
  if (!desktop && self === top && Math.min(screen.width, screen.height) >= 600) {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(Object.assign(document.createElement('meta'), {name: 'viewport'}));
    const real = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const fit = () => {
      const up = screen.orientation?.type ? screen.orientation.type.startsWith('portrait') : matchMedia('(orientation: portrait)').matches;
      meta.content = up ? 'width=600, viewport-fit=cover' : real;
    };
    fit();
    // Chrome em tela cheia ignora a largura do viewport e tiraria o layout de celular. O app instalado já abre em tela cheia pelo manifesto.
    Element.prototype.requestFullscreen = () => Promise.resolve();
    screen.orientation?.addEventListener?.('change', fit);
    addEventListener('orientationchange', fit);
  }
  let outer = null;
  try { outer = self !== top && top.ssStage?.outer ? top : null; } catch { /* outra origem */ }

  if (outer) {
    // Dentro do palco: tela cheia, URL e título são da janela de fora.
    const od = outer.document;
    document.documentElement.requestFullscreen = opts => od.documentElement.requestFullscreen(opts);
    document.exitFullscreen = () => od.exitFullscreen();
    Object.defineProperty(document, 'fullscreenElement', {get: () => od.fullscreenElement});
    od.addEventListener('fullscreenchange', () => document.dispatchEvent(new Event('fullscreenchange')));
    const sync = () => { outer.history.replaceState(null, '', location.href); od.title = document.title; };
    for (const m of ['pushState', 'replaceState']) { const f = history[m].bind(history); history[m] = (...a) => { f(...a); sync(); }; }
    addEventListener('hashchange', sync); addEventListener('popstate', sync); addEventListener('DOMContentLoaded', sync);
    new MutationObserver(sync).observe(document.querySelector('title') || document.head, {childList: true, characterData: true, subtree: true});
    window.ssStage = {LIST, desktop: true, get: read, set: v => { save(v); outer.ssStage.layout(); }, SIZES, CARD, a11y};
    return;
  }
  window.ssStage = {LIST, desktop, get: read, set: save, SIZES, CARD, a11y};
  if (!desktop || self !== top) return;

  window.stop();
  const src = location.href, title = document.title;
  document.documentElement.innerHTML = `<head><meta charset="utf-8"><title></title>
<style>
html, body { margin: 0; height: 100%; overflow: hidden; }
/* Céu do site parado nas sobras (o céu animado do kv-sky já roda dentro do palco; dois custariam o dobro). */
body.ss-stage { background:
  radial-gradient(1px 1px at 12% 18%, #fff9 50%, transparent), radial-gradient(1px 1px at 78% 12%, #cfe0ffaa 50%, transparent),
  radial-gradient(1.5px 1.5px at 34% 72%, #fff3d6aa 50%, transparent), radial-gradient(1px 1px at 88% 64%, #fffa 50%, transparent),
  radial-gradient(1px 1px at 52% 38%, #a9c8ff99 50%, transparent), radial-gradient(1.5px 1.5px at 6% 88%, #fffb 50%, transparent),
  radial-gradient(ellipse 80% 45% at 50% 115%, #ff965052, #7a5ac829 40%, transparent 70%),
  linear-gradient(180deg, #02040c, #071433 45%, #0d2350 82%, #1d2f5e); }
.ss-stage__frame { position: fixed; left: 50%; top: 50%; border: 0; display: block; background: #05060c; transform-origin: center; box-shadow: 0 0 60px #000c; z-index: 2; }
</style></head><body class="ss-stage"><iframe class="ss-stage__frame" allow="fullscreen; autoplay; clipboard-write" title=""></iframe></body>`;
  document.title = title;
  const frame = document.querySelector('iframe');
  frame.title = title;
  // Auto: o maior 16:9 que cabe na janela, sem escala (nítido); abaixo de 1280 × 720, desenha nesse mínimo e reduz.
  const layout = () => {
    const v = read(), W = innerWidth, H = innerHeight;
    let [w, h] = v === 'auto' ? [Math.floor(Math.min(W, H * 16 / 9)), 0] : v.split('x').map(Number);
    if (v === 'auto') { h = Math.floor(w * 9 / 16); if (w < MIN[0]) [w, h] = MIN; }
    // Tela cheia (autor): sem faixas no teto e no rodapé, o palco assume a proporção da tela (ex.: 16:10 do MacBook).
    // Tela cheia nativa do Mac não dá fullscreenElement, e o notch tira uns 40 px da janela: daí a folga de 60 na altura.
    const full = document.fullscreenElement || (W >= screen.width - 1 && H >= screen.height - 60);
    if (full) {
      if (W / H > w / h) w = Math.round(h * W / H); else h = Math.round(w * H / W);
      if (v === 'auto' && W >= MIN[0] && H >= MIN[1]) [w, h] = [W, H];
    }
    const k = full ? Math.max(W / w, H / h) : Math.min(W / w, H / h);
    Object.assign(frame.style, {width: `${w}px`, height: `${h}px`, transform: `translate(-50%, -50%) scale(${v === 'auto' && k >= 1 ? 1 : k})`});
  };
  window.ssStage = {...window.ssStage, outer: true, layout};
  addEventListener('resize', layout);
  document.addEventListener('fullscreenchange', layout);
  layout();
  frame.src = src;
})();
