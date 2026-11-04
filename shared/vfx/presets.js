// VFX Forge V3: dados e regras puras dos novos tipos de animação. Sem GPU e sem biblioteca: o jogo lê isto sem baixar o Pixi.
// Só apresentação: nada aqui muda estado de partida, regra, custo ou atributo de carta.

// Categorias do catálogo. `disponivel: false` = tipo reconhecido, ainda sem runtime no projeto (motivo em docs/vfx-forge-v3.md).
export const CATEGORIES = [
  {id: 'sprite', nome: 'Sprite Animation'}, {id: 'particle', nome: 'Particle Animation'},
  {id: 'skeletal', nome: 'Skeletal Animation', disponivel: false}, {id: 'vector', nome: 'Vector Animation'},
  {id: 'shader', nome: 'Shader Animation'}, {id: 'motion', nome: 'Card Motion'},
  {id: 'cinematic', nome: 'Cinematic Composition'}, {id: 'living', nome: 'Living Card'}, {id: 'holo', nome: 'Holographic Card'},
];

// Modos do shader único (uMode em shader-fx.js). `pixi`: filtro de pixi-filters usado só em HIGH; os outros perfis ficam no modo.
export const SHADERS = [
  {id: 'glow', nome: 'Glow', modo: 0, cor: '#ffe7a3'},
  {id: 'bloom', nome: 'Bloom', modo: 0, cor: '#ffffff', pixi: 'bloom'},
  {id: 'holo-foil', nome: 'Holographic Foil', modo: 1, cor: '#ffffff'},
  {id: 'rainbow-prism', nome: 'Rainbow Prism', modo: 2, cor: '#ffffff'},
  {id: 'water', nome: 'Water Distortion', modo: 3, cor: '#6fc8ff'},
  {id: 'heat', nome: 'Heat Distortion', modo: 4, cor: '#ff8a2b'},
  {id: 'cosmic-aura', nome: 'Cosmic Aura', modo: 5, cor: '#b98cff'},
  {id: 'energy-pulse', nome: 'Energy Pulse', modo: 6, cor: '#ffd36e'},
  {id: 'chromatic', nome: 'Chromatic Aberration', modo: 7, cor: '#ffffff'},
  {id: 'dissolve', nome: 'Dissolve', modo: 8, cor: '#ff8a2b'},
  {id: 'lightning', nome: 'Lightning', modo: 9, cor: '#bfe3ff'},
  {id: 'divine-light', nome: 'Divine Light', modo: 10, cor: '#fff1c4', pixi: 'godray'},
  {id: 'shadow-corruption', nome: 'Shadow Corruption', modo: 11, cor: '#7a3cff'},
  {id: 'refraction', nome: 'Refraction', modo: 12, cor: '#9fdcff'},
  {id: 'animated-noise', nome: 'Animated Noise', modo: 13, cor: '#ffffff'},
  {id: 'starfield', nome: 'Starfield', modo: 14, cor: '#ffffff'},
  // Filtros prontos da página do Pixi: cor por matriz, desfoque, ruído e os da comunidade. Em LOW viram um quadro parado.
  {id: 'sepia', nome: 'Sépia', pixi: 'sepia'}, {id: 'vintage', nome: 'Vintage', pixi: 'vintage'},
  {id: 'kodachrome', nome: 'Kodachrome', pixi: 'kodachrome'}, {id: 'night', nome: 'Noite', pixi: 'night'},
  {id: 'greyscale', nome: 'Preto e branco', pixi: 'greyscale'}, {id: 'blur', nome: 'Desfoque', pixi: 'blur'},
  {id: 'noise', nome: 'Ruído', pixi: 'noise'}, {id: 'glitch', nome: 'Glitch', pixi: 'glitch'},
  {id: 'old-film', nome: 'Filme antigo', pixi: 'oldfilm'}, {id: 'crt', nome: 'CRT', pixi: 'crt'},
  {id: 'reflection', nome: 'Reflexo na água', pixi: 'reflection'}, {id: 'shockwave', nome: 'Onda de choque', pixi: 'shockwave'},
];

// Presets por facção: combinação pronta de shader, cor e intensidade.
export const FACTION_PRESETS = {
  athena: {shader: 'divine-light', cor: '#ffe7a3', forca: .6, nome: 'Athena: luz divina'},
  poseidon: {shader: 'refraction', cor: '#6fc8ff', forca: .6, nome: 'Poseidon: água e refração'},
  hades: {shader: 'shadow-corruption', cor: '#8b5cff', forca: .6, nome: 'Hades: sombras e almas'},
  ares: {shader: 'heat', cor: '#ff5a2b', forca: .65, nome: 'Ares: fogo e impacto'},
  artemis: {shader: 'cosmic-aura', cor: '#8cffb0', forca: .55, nome: 'Artemis: energia natural e luar'},
};

// Identificadores visuais; a raridade real vem de data/vfx-studio.json (raridades). Nenhuma raridade nova nasce daqui.
export const HOLO = [
  {id: 'common-shine', nome: 'Common Shine', shader: 'glow', forca: .25, cor: '#ffffff'},
  {id: 'rare-foil', nome: 'Rare Foil', shader: 'holo-foil', forca: .35, cor: '#ffffff'},
  {id: 'epic-prism', nome: 'Epic Prism', shader: 'rainbow-prism', forca: .5, cor: '#ffffff'},
  {id: 'mythic-cosmic', nome: 'Mythic Cosmic', shader: 'cosmic-aura', forca: .6, cor: '#b98cff'},
  {id: 'divine-holo', nome: 'Divine Holographic', shader: 'holo-foil', forca: .8, cor: '#ffe7a3'},
  {id: 'alternate-art', nome: 'Alternate Art Special', shader: 'rainbow-prism', forca: .7, cor: '#ffe7a3'},
];

// Vetor: arquivos em data/vfx-lottie/ (autoria do projeto, sem licença de terceiros).
export const LOTTIES = [
  {id: 'cosmo-pulse', nome: 'Pulso de Cosmo', arquivo: 'data/vfx-lottie/cosmo-pulse.json', aplicacao: 'Indicadores de Cosmo e Soul'},
  {id: 'reward-burst', nome: 'Explosão de recompensa', arquivo: 'data/vfx-lottie/reward-burst.json', aplicacao: 'Recompensas e conquistas'},
];

export const LAYER_TYPES = [
  {id: 'carta', nome: 'Movimento da carta'}, {id: 'camera', nome: 'Câmera'}, {id: 'shader', nome: 'Shader'},
  {id: 'particulas', nome: 'Partículas ou sprite'}, {id: 'lottie', nome: 'Lottie'}, {id: 'audio', nome: 'Áudio'}, {id: 'ui', nome: 'Interface'},
];
export const MAX_COMPOSITION_MS = 6000; // a composição não pode cobrir a mesa por muito tempo; a fila do jogo nunca espera por ela

// Perfis pedidos: máximo de cartas vivas ao mesmo tempo, quadros por segundo, teto de pixels e o que entra numa composição.
export const PROFILES = {
  low: {id: 'low', vivas: 0, fps: 0, largura: 360, pixi: false, particulas: .4, shaders: 1, camada: new Set(['carta', 'particulas', 'audio', 'ui'])},
  medium: {id: 'medium', vivas: 2, fps: 24, largura: 480, pixi: false, particulas: .7, shaders: 1, camada: new Set(['carta', 'camera', 'shader', 'particulas', 'lottie', 'audio', 'ui'])},
  high: {id: 'high', vivas: 6, fps: 30, largura: 640, pixi: true, particulas: 1, shaders: 2, camada: new Set(['carta', 'camera', 'shader', 'particulas', 'lottie', 'audio', 'ui'])},
};
// Mesmos nomes do ajuste Graphics do jogo (phone, low, medium, high, ultra). Movimento reduzido sempre cai no LOW, que não anima.
export function profileFor(quality, {reduced = false} = {}) {
  if (reduced || quality === 'phone' || quality === 'low') return PROFILES.low;
  return quality === 'medium' ? PROFILES.medium : PROFILES.high;
}
const ORDER = ['low', 'medium', 'high'];
export const stepDown = profile => PROFILES[ORDER[Math.max(0, ORDER.indexOf(profile.id) - 1)]];

export const shaderOf = id => SHADERS.find(s => s.id === id);
export const holoOf = id => HOLO.find(h => h.id === id);

// Valor guardado num momento (data/card-animations.json): 'shader:x', 'lottie:x' ou 'comp:x'; o resto é efeito de sprite.
export const isNewFx = value => typeof value === 'string' && /^(shader|lottie|comp):[a-z0-9-]{1,60}$/.test(value);

// Normaliza qualquer valor em composição: o Composer só sabe tocar uma coisa.
export function asComposition(value, studio) {
  const [kind, id] = String(value).split(':');
  if (kind === 'comp') return studio?.composicoes?.[id] || null;
  if (kind === 'shader' && shaderOf(id)) return {nome: shaderOf(id).nome, camadas: [{tipo: 'shader', inicio: 0, duracao: 1400, shader: id, alvo: 'carta', forca: .8}]};
  if (kind === 'lottie' && LOTTIES.some(l => l.id === id)) return {nome: id, camadas: [{tipo: 'lottie', inicio: 0, duracao: 1400, lottie: id, alvo: 'carta'}]};
  return null;
}

// O que tocar neste perfil, em ordem. Puro para o teste rodar sem navegador. Sem camada possível: nada toca e a partida segue.
export function planLayers(comp, profile, {reduced = false} = {}) {
  let shaders = 0;
  return (comp?.camadas || []).filter(l => {
    if (!profile.camada.has(l.tipo) || l.ativa === false) return false;
    if (reduced && l.tipo !== 'audio') return false; // só o som: a partida continua clara sem movimento
    if (l.tipo === 'shader' && ++shaders > profile.shaders) return false;
    return l.inicio < MAX_COMPOSITION_MS;
  }).map(l => ({...l, inicio: Math.max(0, l.inicio), duracao: Math.min(l.duracao, MAX_COMPOSITION_MS - Math.max(0, l.inicio)), ...(l.tipo === 'particulas' ? {escala: (l.escala ?? 1) * profile.particulas} : {})}))
    .sort((a, b) => a.inicio - b.inicio);
}

// Qual efeito uma carta usa onde. Carta sem escolha: nenhum. Coleção: holográfico da raridade (data/vfx-studio.json), a menos que a carta escolha outro.
export function cardFxFor(studio, card, context) {
  const own = studio?.cartas?.[card?.id];
  if (context === 'colecao') {
    const holo = holoOf(own?.holo || studio?.raridades?.[card?.raridade]);
    if (holo) return {shader: holo.shader, forca: holo.forca, cor: holo.cor, velocidade: 1, reage: true};
    context = 'inspecao'; // sem holográfico: mostra o da inspeção
  }
  const shader = own?.[context];
  return shaderOf(shader) ? {shader, forca: own.forca ?? .6, velocidade: own.velocidade ?? 1, cor: own.cor || shaderOf(shader).cor, reage: false} : null;
}
