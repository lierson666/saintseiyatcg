// Rosto do avatar (autor, 31/10/2026: "os avatares não estão focando nos rostos"): por personagem, zoom e posição
// do fundo para o rosto ficar no centro do círculo. Valores tirados da arte de cada carta (card-forge/art-web).
// [zoom em % da largura, posição x %, posição y %]; personagem novo sem entrada usa o recorte padrão.
const FACE = {
  'god-athena': [450, 54, 34], 'god-poseidon': [300, 50, 21], 'god-hades': [320, 53, 15], 'god-ares': [300, 52, 13], 'god-artemis': [300, 55, 13],
  'athena-v6-001': [300, 52, 23], 'athena-v6-003': [320, 59, 25], 'athena-v6-005': [300, 53, 32], 'athena-v6-007': [300, 53, 20], 'athena-v6-009': [200, 64, 44],
  'athena-v6-011': [320, 47, 10], 'athena-v6-013': [200, 50, 21], 'athena-v6-015': [200, 58, 33], 'athena-v6-017': [320, 50, 8],
  'hades-v6-197': [200, 30, 33], 'hades-v6-253': [340, 53, 14], 'hades-v6-181': [300, 55, 13], 'hades-v6-183': [350, 53, 31], 'hades-v6-185': [350, 50, 28],
};
export const faceStyle = id => { const f = FACE[id]; return f ? `background-size:${f[0]}% auto;background-position:${f[1]}% ${f[2]}%;` : ''; };
