// Vinheta das cartas (autor, 02/11/2026): elipse limpa em volta do personagem, escurecendo aos poucos até as bordas, para dar leitura.
// Substitui o preto embutido nas camadas de moldura dos PSDs (frame_1, vignette). Forge, carta ao vivo e Layout Studio usam a mesma conta.
const TEXT_TOP = 0.63; // no catálogo, o texto de regras não sobe além de 62,7% em nenhum tipo além de God: caixa cheia ganha rolagem
const MAX = 0.9, CLEAR_TOP = 0.18, FADE = 0.11, CLEAR_WIDTH = 0.38, STEPS = 12;
const ease = (x) => x * x * (3 - 2 * x); // sem degrau visível nas duas pontas
const round = (n) => Math.round(n * 1000) / 1000;

// textTop: onde o texto começa, de 0 a 1 (o God informa o da face, em shared/god-face.js).
// Medidas em fração da carta; stops: [posição de 0 a 1 no raio da elipse, opacidade do preto].
export function cardVignette(textTop = TEXT_TOP) {
  const clearBottom = textTop - FADE, cy = (CLEAR_TOP + clearBottom) / 2, ry = textTop + 0.03 - cy, start = (clearBottom - cy) / ry;
  const stops = [[0, 0]];
  for (let i = 0; i <= STEPS; i++) stops.push([round(start + (1 - start) * i / STEPS), round(MAX * ease(i / STEPS))]);
  return {cx: 0.5, cy: round(cy), rx: round(CLEAR_WIDTH / start), ry: round(ry), stops};
}

export function scrimCss(textTop = TEXT_TOP) {
  const v = cardVignette(textTop), pct = (n) => Math.round(n * 1000) / 10;
  return `radial-gradient(ellipse ${pct(v.rx)}% ${pct(v.ry)}% at ${pct(v.cx)}% ${pct(v.cy)}%,${v.stops.map(([at, alpha]) => `rgba(0,0,0,${alpha}) ${pct(at)}%`).join(',')})`;
}
