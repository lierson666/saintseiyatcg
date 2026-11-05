// Edição do Composer, sem tela: camadas, tempos, velocidade da prévia e id de composição nova. Nada aqui grava arquivo.
export const MAX_MS = 6000, MAX_LAYERS = 24, SNAP_MS = 50;
export const PICO_PADRAO = {carta: .5, camera: .5, ui: .3}; // onde cada motor põe o auge; só estes tipos têm ponto editável

export const snap = ms => Math.round(ms / SNAP_MS) * SNAP_MS;
// Início e duração sempre cabem na linha do tempo; o motor corta o que passar de 6 s.
export function fitTiming(inicio, duracao) {
  const start = Math.min(MAX_MS - SNAP_MS, Math.max(0, snap(inicio)));
  return {inicio: start, duracao: Math.max(SNAP_MS, Math.min(MAX_MS - start, snap(duracao)))};
}
export function addLayer(comp, layer) {
  if (comp.camadas.length >= MAX_LAYERS) return -1;
  comp.camadas.push(layer);
  return comp.camadas.length - 1;
}
export function duplicateLayer(comp, i) {
  const layer = comp.camadas[i];
  if (!layer || comp.camadas.length >= MAX_LAYERS) return -1;
  comp.camadas.splice(i + 1, 0, structuredClone(layer));
  return i + 1;
}
export function removeLayer(comp, i) {
  if (!comp.camadas[i]) return -1;
  comp.camadas.splice(i, 1);
  return comp.camadas.length ? Math.min(i, comp.camadas.length - 1) : -1;
}
// Ordem só decide o que começa junto: quem desenha por cima e qual shader entra quando o perfil limita a quantidade.
export function moveLayer(comp, i, delta) {
  const to = i + delta;
  if (!comp.camadas[i] || to < 0 || to >= comp.camadas.length) return i;
  const [layer] = comp.camadas.splice(i, 1);
  comp.camadas.splice(to, 0, layer);
  return to;
}
export function slug(name) {
  return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'composicao';
}
// Nome repetido ganha sufixo: antes, a composição nova sobrescrevia a antiga sem aviso.
export function uniqueId(name, existing) {
  const base = slug(name), used = new Set(existing);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
// Cópia para a prévia em outra velocidade. O original nunca muda, então a velocidade da prévia não vai para o arquivo.
export function atRate(comp, rate) {
  if (rate === 1) return comp;
  return {...comp, camadas: comp.camadas.map(l => ({...l, inicio: Math.round(l.inicio / rate), duracao: Math.max(1, Math.round(l.duracao / rate)), velocidade: Math.min(4, Math.max(.1, (l.velocidade ?? 1) * rate))}))};
}
export const totalMs = comp => (comp?.camadas || []).filter(l => l.ativa !== false).reduce((max, l) => Math.max(max, l.inicio + l.duracao), 0);
export const sameComp = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
