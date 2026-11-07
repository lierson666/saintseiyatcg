# Poseidon — Camera Journey (Storyboarding Brief)
**Estado:** planejamento visual; keyframes numéricos e caminho **não homologados**. Criar e testar no Three.js antes de definir coordenadas.

| Beat | Câmera / conteúdo | Função narrativa | Gate |
|---|---|---|---|
| 1 — Establishing | Plano aberto do oceano suspenso, pilares, abismo | Localizar o reino | World art |
| 2 — Landmark Reveal | Palácio de mármore e Grande Pilar Principal | Revelar divindade / monumento | World art |
| 3 — Travel | Descender e passar pelas colunatas e escadas | Conectar arquitetura e campo | Transition |
| 4 — Approach | Aproximação da plataforma e detalhes de borda | Fazer o campo pertencer ao mundo | Transition |
| 5 — God Reveal | Últimos frames até a câmera competitiva, avatar aparece na UI | Começo do confronto | Battle |
| 6 — Gameplay | Câmera LOCK; gameplay/HUD intactos | Jogabilidade clara | Battle |

## Obrigatório no Arena Forge
- Scene única: cinematic e batalha referenciam mesmo WorldRoot e assets versionados.
- `CinematicCameraRig` editável com posição, lookAt, FOV, duração, easing e markers.
- `CompetitiveCamera` readonly; pose de chegada idêntica bit a bit.
- Skip imediato e reduced motion; não bloquear input quando intro acaba.
- Capturas de cada beat, comparação com artboards e teste do jogo.
- Não usar frustum competitivo para forçar miniaturização do palácio.
