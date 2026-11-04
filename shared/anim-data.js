// Onde o jogo lê as animações: no Mac do autor, a edição em andamento; online, só a versão publicada no Star Hill (card-forge/vfx_publish.py).
// ?publicado=1 mostra a publicada também no Mac, para conferir antes do deploy.
const LOCAL = ['localhost', '127.0.0.1', '[::1]'];
export const usesPublished = (where = location) => !LOCAL.includes(where.hostname) || new URLSearchParams(where.search).has('publicado');
export const animFile = (name, where = location) => (usesPublished(where) ? name.replace(/\.json$/, '.publicado.json') : name);
