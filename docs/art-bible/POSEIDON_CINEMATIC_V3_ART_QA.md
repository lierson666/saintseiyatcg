# Poseidon Cinematic V3 — QA artístico inicial
**Data:** 2026-11-07 · **Base:** commit `dbb479e` (`olympus-arena`) · **Status:** análise visual preliminar, não aprovação.
**Fonte de revisão:** `docs/img/arena-cinematic/v3-chave-0.webp`, `v3-chave-2.webp`, `v3-chave-5.webp`, `v3-partida-mundo.webp`.
**Meta:** SSTCG Visual Universe Bible V2.0 + Master Artboard aprovado.

## Achados por gate
| Gate | Avaliação | Evidência | Ajuste |
|---|---|---|---|
| A · World Art | REPROVAR visualmente | `v3-chave-0.webp`: massa do templo coerente, porém muito geométrica, paredes planas, colunas sem desenho refinado, pouca textura hand-painted, oceano escuro | Asset-by-asset painterly art pass com detalhes arquitetônicos, contraste, acabamento de materiais e luz narrativa |
| B · Transition | PRECISA TESTE INTERATIVO | `v3-chave-2.webp`: vista axial palácio/escadas. `v3-chave-5.webp`: campo ao final. Screenshots estáticos não comprovam continuidade temporal, skip ou ausência de salto | Testar vídeo real, posição da câmera a cada frame, skip, reduced motion, queda de frames e playback |
| C · Battle | REPROVAR visualmente, gameplay não validado aqui | `v3-partida-mundo.webp`: centro amplo e limpo, porém piso escuro quase liso e só anéis simples; borda/colunas parecem uma cerca, não o pátio pictórico do Master Artboard | Piso de mármore pintado, ondas douradas com desenho próprio, bordas recortadas orgânicas e cáusticas suaves; verificar cartas/HUD no jogo |

## Prioridade P0 para Claude (não alterar a câmera oficial)
1. **Manter cinematics e enquadramento** e tornar a fachada reconhecível: escadarias, frisos, colunas encaixadas, frontão, tridente, relevo e materiais.
2. **Teto oceânico**: água suspensa luminosa, profundidade e raios controlados; não pôr palácio inteiro debaixo d'água.
3. **Piso competitivo**: a arte aprovada exige mármore azul pictórico com linhas de ouro, desenho de ondas e cáusticas calibradas na zona das cartas. Não colocar ilustração 2D chapada sobre toda a superfície.
4. **Moldura ambiental orgânica**: aberturas naturais e trechos assimétricos de pedra/balaustrada/colunas; evitar a sensação de cerca circular uniforme. Não tapar HUD/cartas.
5. **Luz e pigmento**: valores azuis e dourados ancorados na Bíblia Visual; sombras de contato, pintura manual perceptível, sem brilho uniforme.
6. **Gate de imagens**: screenshots `cinematic-start`, `landmark`, `arrival`, `battle-with-cards`, `mobile`, com overlay e comparação lado a lado com artboards.
7. **Testes funcionais**: iniciar cinematics, pular em keyframe intermediário, reduced motion, câmeras com mesma pose ao terminar, retorno do input, WebGL context loss e performance.

## Nota de produção
Este QA considera screenshots capturados; **não comprova** FPS, timing, skip, uso de GPU ou legibilidade no jogo sem capturas com todas as cartas e HUD.
Os arquivos de arte finais, texturas hand-painted e GLBs profissionais ainda precisam ser homologados. O próprio editor pode estar funcional mesmo quando a avaliação estética do mundo continua reprovada.

## Validação para nova captura
A próxima versão deve mostrar avanço inequívoco em: (1) forma e detalhe da arquitetura, (2) luz e teto oceânico, (3) piso pintado e moldura natural. Melhorar shaders sem melhorar arte/modelos não basta.
