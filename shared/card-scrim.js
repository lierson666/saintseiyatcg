// Escuro das cartas (autor, 02/11/2026): só no topo e no rodapé, para dar leitura; a arte fica limpa no meio e nas laterais.
// Substitui o preto embutido nas camadas de moldura dos PSDs (frame_1, vignette). Forge, carta ao vivo e Layout Studio usam estas paradas.
const TEXT_TOP = 0.63; // no catálogo, o texto de regras não sobe além de 62,7% em nenhum tipo além de God: caixa cheia ganha rolagem
const MAX = 0.9, TOP_END = 0.2, FADE = 0.16, STEPS = 10; // entre TOP_END e o início do fade a arte fica 100% visível: é a área do personagem (autor, 02/11/2026)
const ease = (x) => x * x * (3 - 2 * x); // some aos poucos nas duas pontas, sem degrau visível (autor, 02/11/2026)
const round = (n) => Math.round(n * 1000) / 1000;

// textTop: onde o texto começa, de 0 a 1. O God informa o da face (shared/god-face.js).
export function scrimStops(textTop = TEXT_TOP) {
  const end = textTop + 0.04, start = Math.max(end - FADE, TOP_END);
  const stops = [];
  for (let i = 0; i <= STEPS; i++) stops.push([round(TOP_END * i / STEPS), round(MAX * ease(1 - i / STEPS))]);
  if (start > TOP_END) stops.push([round(start), 0]);
  for (let i = 1; i <= STEPS; i++) stops.push([round(start + (end - start) * i / STEPS), round(MAX * ease(i / STEPS))]);
  stops.push([1, MAX]);
  return stops;
}

export const scrimCss = (textTop = TEXT_TOP) => `linear-gradient(180deg,${scrimStops(textTop).map(([at, alpha]) => `rgba(0,0,0,${alpha}) ${Math.round(at * 1000) / 10}%`).join(',')})`;
