// Arena de testes, sem tela: o que cada cenário toca para um par de cartas, em cada versão. Só lê; nada aqui grava arquivo.
import {animFor} from '../playtest/divine/pixel-vfx.js';
import {cardFxFor} from '../shared/vfx/presets.js';
import {triggerLine} from '../shared/card-i18n.js';

// `quem`: A age e B recebe. `ver` indica a carta dona de cada momento, porque o motor resolve pelo id dela. `mesa: false` não usa a mesa.
export const CENARIOS = [
  {id: 'repouso', nome: 'Carta em repouso', grupo: 'Fora do combate', contexto: 'idle', ajuda: 'A carta parada na mesa.'},
  {id: 'inspecao', nome: 'Inspeção', grupo: 'Fora do combate', contexto: 'inspecao', ajuda: 'A carta aberta em tamanho grande.'},
  {id: 'colecao', nome: 'Coleção', grupo: 'Fora do combate', contexto: 'colecao', mesa: false, ajuda: 'Passe o mouse sobre a carta: o holográfico reage ao cursor.'},
  {id: 'entrada', nome: 'Entrada no campo', grupo: 'Combate', momentos: [['entrada', 'A']], ajuda: 'A carta entra no campo.'},
  {id: 'ataque', nome: 'Ataque', grupo: 'Combate', momentos: [['declarar', 'A'], ['carga', 'A'], ['golpe', 'A'], ['impacto', 'A'], ['strike', 'B']], ajuda: 'Strike completo, sem o dano.'},
  {id: 'dano', nome: 'Dano', grupo: 'Combate', momentos: [['dano', 'B']], ajuda: 'O alvo perde HP.'},
  {id: 'defesa', nome: 'Defesa (dano prevenido)', grupo: 'Combate', momentos: [['escudo', 'B']], ajuda: 'O jogo não tem evento de defesa próprio: este é o dano prevenido.'},
  {id: 'deus', nome: 'Golpe no Deus', grupo: 'Combate', momentos: [['golpe', 'A'], ['impacto_deus', 'A']], ajuda: 'Strike que acerta o Deus adversário.'},
  {id: 'habilidade', nome: 'Habilidade', grupo: 'Combate', momentos: [['habilidade', 'A']], ajuda: 'A linha escolhida resolve na própria carta.'},
  {id: 'morte', nome: 'Morte ou remoção', grupo: 'Combate', momentos: [['morte', 'B']], ajuda: 'O alvo é derrotado. Só apresentação: a mesa volta ao normal depois.'},
];
export const abilityNames = card => (card?.habilidades_en || []).map(l => String(l).split(' — ')[0].trim()).filter(Boolean);

// De onde veio o valor: mesma ordem de animFor, que é a do jogo.
function originOf(anims, kind, card, line) {
  const faction = card?.faccao?.toLowerCase();
  if (kind === 'habilidade' && line != null && anims?.[card?.id]?.linhas?.[line] != null) return 'Linha da carta';
  if (anims?.[card?.id]?.[kind] != null) return 'Carta';
  if (faction && anims?.[`faccao-${faction}`]?.[kind] != null) return 'Facção';
  return anims?.padrao?.[kind] != null ? 'Padrão' : '';
}
// O que o cenário toca nesta versão: [{momento, valor, origem}]. valor null: nenhum vínculo; false: desligado de propósito.
export function resolveCenario(id, {anims, studio, a, b, ability = ''}) {
  const c = CENARIOS.find(x => x.id === id);
  if (c.contexto) {
    const fx = cardFxFor(studio, a, c.contexto), own = studio?.cartas?.[a?.id];
    return [{momento: c.contexto, valor: fx?.shader ?? null, origem: !fx ? '' : c.contexto === 'colecao' && !own?.holo && studio?.raridades?.[a?.raridade] ? 'Raridade' : 'Carta'}];
  }
  return c.momentos.map(([kind, who]) => {
    const card = who === 'A' ? a : b, line = kind === 'habilidade' && ability && card ? triggerLine(card, ability) : null;
    return {momento: kind, valor: animFor(anims, kind, {id: card?.id, faction: card?.faccao?.toLowerCase(), line}), origem: originOf(anims, kind, card, line)};
  });
}
export const differs = (draft, published) => JSON.stringify(draft.map(r => r.valor)) !== JSON.stringify(published.map(r => r.valor));
