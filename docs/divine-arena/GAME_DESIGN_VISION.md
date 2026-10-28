# Game Design Vision — Divine Arena

## Fantasia
O jogador é um God que comanda Devotees numa arena sagrada. Cada carta jogada é um Cavaleiro entrando no campo; cada Strike é um golpe com Cosmo visível; a Soul do God é a vida que treme a cada impacto.

## Pilares
1. **Clareza antes do espetáculo.** Todo efeito visual corresponde a um evento real da engine (`state.events`). Nenhum número exibido é calculado pela apresentação.
2. **Cosmo que se vê.** Base (dourado) e Latent (violeta) são esferas que acendem, piscam na prévia de custo e se consomem ao pagar.
3. **Hierarquia de poder.** Comum < Saint < assinatura < divino < Ultimate. Quanto mais alto, mais tempo de tela, mais partículas, mais câmera.
4. **Controle do jogador.** Toda animação pode ser pulada (Espaço/clique). Velocidade, tremor, flashes e movimento são ajustáveis.
5. **Acessível por padrão.** Respeita `prefers-reduced-motion`, teclado completo, texto legível, fallback 2D sem WebGL.

## Escopo do slice
Partida local hot-seat com os dois decks D171 (Pegasus Rush × Dragon Fortress), God Athena para os dois lados. Arena Athena e arena Poseidon como **temas visuais**. Ver [VERTICAL_SLICE_PLAN.md](VERTICAL_SLICE_PLAN.md) para o que ficou bloqueado.

## Fora do slice
Online, IA adversária, coleção, loja, Ultimate e Divine Power (sem regra aprovada), cartas de Poseidon (sem catálogo).
