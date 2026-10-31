// Rosto do avatar (autor, 31/10/2026: "os avatares não estão focando nos rostos"): por personagem, zoom e posição
// do fundo para o rosto ficar no centro do círculo. Valores tirados da arte de cada carta (card-forge/art-web).
// [zoom em % da largura, posição x %, posição y %]; personagem novo sem entrada usa o recorte padrão.
import {lightArt} from '../shared/light-art.js';

const FACE = {
  'god-athena': [450, 54, 34], 'god-poseidon': [300, 50, 21], 'god-hades': [320, 53, 15], 'god-ares': [300, 52, 13], 'god-artemis': [300, 55, 13],
  'athena-v6-001': [300, 52, 23], 'athena-v6-003': [320, 59, 25], 'athena-v6-005': [300, 53, 32], 'athena-v6-007': [300, 53, 20], 'athena-v6-009': [200, 64, 44],
  'athena-v6-011': [320, 47, 10], 'athena-v6-013': [200, 50, 21], 'athena-v6-015': [200, 58, 33], 'athena-v6-017': [320, 50, 8],
  'hades-v6-197': [200, 30, 33], 'hades-v6-253': [340, 53, 14], 'hades-v6-181': [300, 55, 13], 'hades-v6-183': [350, 53, 31], 'hades-v6-185': [350, 50, 28],
};
// Deuses (autor, 31/10/2026: "os deuses podem puxar do avatar dos deuses mesmo"): o rosto escolhido no Card Forge para a
// placa do God na mesa (`hud_rosto` em art-web/cards.json), igual ao godHud do duelo. Chame com as cartas do Forge ao carregar.
const HUD = {};
export function useGodPortraits(forgeCards) {
  for (const f of forgeCards) { const m = /^(athena|poseidon|hades|ares|artemis)-001$/.exec(f.id); if (m && f.hud_rosto) HUD[`god-${m[1]}`] = f.hud_rosto; }
}
export const faceStyle = id => {
  const h = HUD[id], f = FACE[id];
  if (h) return `background-image:url('${lightArt(new URL(`../card-forge/art-web/${h.imagem}`, import.meta.url).href)}');background-size:${h.zoom}% auto;background-position:${h.x}% ${h.y}%;`;
  return f ? `background-size:${f[0]}% auto;background-position:${f[1]}% ${f[2]}%;` : '';
};
