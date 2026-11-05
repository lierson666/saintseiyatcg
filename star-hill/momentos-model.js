// Momentos do jogo, sem tela: cada coisa que acontece na partida, em palavras de jogador, e o que a controla.
// `fx`: momento em data/card-animations.json (padrao). `som`: chave em audio.efeitos. `grupo`: ligar e velocidade em animacoes. `cena`: cenário da mesa de teste.
export const MOMENTOS_JOGO = [
  {titulo: 'Cartas', linhas: [
    {nome: 'Devotee entra em campo', quando: 'Devotee ou Equipment chega ao campo. O som toca quando a carta é jogada.', fx: 'entrada', som: 'conjurar', cena: 'entrada'},
    {nome: 'Conjurar uma carta', quando: 'A carta sai da mão e vai para a pilha', fx: 'cast', som: 'conjurar', grupo: 'conjurar'},
    {nome: 'Comprar carta', quando: 'Comprou do deck', som: 'compra', grupo: 'compra'},
    {nome: 'Equipar armadura', quando: 'Armadura presa no Devotee', som: 'equipar_armadura'},
    {nome: 'Equipar arma', quando: 'Arma ou item preso no Devotee', som: 'equipar_arma'},
    {nome: 'Voltar do Tartarus', quando: 'Voltou ao campo ou à mão', fx: 'retorno'},
    {nome: 'Pagar Cosmo', quando: 'Pagou Cosmo ou ganhou Latent', som: 'cosmo', grupo: 'cosmo'},
  ]},
  {titulo: 'Ataque', linhas: [
    {nome: 'Declarar ataque', quando: 'Devotee declarou o Strike', fx: 'declarar', som: 'declarar_ataque', cena: 'ataque'},
    {nome: 'Carga do golpe', quando: 'Cosmo sobe antes do impacto', fx: 'carga', som: 'carga', cena: 'ataque'},
    {nome: 'Golpe', quando: 'O Strike resolveu', fx: 'golpe', som: 'ataque', grupo: 'ataque', cena: 'ataque'},
    {nome: 'Impacto em Devotee', quando: 'O Strike acertou um Devotee', fx: 'impacto', som: 'impacto', cena: 'ataque'},
    {nome: 'Ser atingido', quando: 'O alvo recebeu o Strike', fx: 'strike', cena: 'ataque'},
    {nome: 'Impacto no Deus', quando: 'O Strike acertou o Deus', fx: 'impacto_deus', som: 'impacto_deus', cena: 'deus'},
  ]},
  {titulo: 'Dano e morte', linhas: [
    {nome: 'Dano em Devotee', quando: 'Devotee perdeu HP', fx: 'dano', som: 'dano', grupo: 'dano', cena: 'dano'},
    {nome: 'Dano prevenido', quando: 'O dano foi prevenido', fx: 'escudo', cena: 'defesa'},
    {nome: 'Devotee derrotado', quando: 'Foi derrotado', fx: 'morte', som: 'morte', grupo: 'morte', cena: 'morte'},
    {nome: 'Dano no Soul', quando: 'O Deus perdeu Soul', fx: 'soul', som: 'dano_deus'},
    {nome: 'Ganho de Soul', quando: 'O Deus ganhou Soul', fx: 'cura'},
  ]},
  {titulo: 'Poderes', linhas: [
    {nome: 'Habilidade ou gatilho', quando: 'Resolveu uma habilidade', fx: 'habilidade', som: 'gatilho', grupo: 'gatilho', cena: 'habilidade'},
    {nome: 'Ultimate', quando: 'A Ultimate resolveu', fx: 'ultimate', som: 'ultimate', grupo: 'ultimate'},
    {nome: 'Poder Divino', quando: 'O God usou o Poder Divino', fx: 'poder_divino', som: 'poder_divino'},
    {nome: 'Poder do Domain', quando: 'O Domain usou o poder', fx: 'poder_dominio', som: 'poder_dominio'},
    {nome: 'Awaken', quando: 'O God despertou', fx: 'awaken', som: 'awaken'},
  ]},
  {titulo: 'Partida', linhas: [
    {nome: 'Início de turno', quando: 'Novo turno ou nova rodada', som: 'turno', grupo: 'turno'},
    {nome: 'Passar o turno', quando: 'Clicou em End Turn ou passou a prioridade', som: 'passar_turno'},
    {nome: 'Receber o turno', quando: 'Começou o seu turno', som: 'receber_turno'},
  ]},
  {titulo: 'Mouse', linhas: [
    {nome: 'Passar o mouse', quando: 'Botão ou carta na mesa', som: 'hover'},
    {nome: 'Carta na mão', quando: 'Mouse sobre uma carta da mão', som: 'hover_mao'},
    {nome: 'Base de Cosmo', quando: 'Mouse sobre uma Base ou o Cosmo', som: 'hover_base'},
  ]},
];
const plain = t => String(t).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
// Busca sem acento e sem caixa, em nome e descrição: "entra", "devotee" e "TÁRTARUS" acham a linha.
export const casaBusca = (linha, q) => plain(`${linha.nome} ${linha.quando}`).includes(plain(q).trim());
export const filtraMomentos = (q = '', grupos = MOMENTOS_JOGO) => grupos.map(g => ({...g, linhas: g.linhas.filter(l => casaBusca(l, q))})).filter(g => g.linhas.length);
