# QA Report — Divine Arena (28/10/2026)

Ambiente: servidor local `python3 -m http.server` em `localhost:8020`, painel de navegador do Claude Desktop (Chromium). Rota testada: `/playtest/divine/index.html?seed=7`. O painel ficou **oculto** em parte dos testes, o que limita rAF e fps.

## Testes automatizados
`node --test tools/test-*.mjs`: **166/166** passando (163 da engine e decks + 3 novos em `tools/test-divine-director.mjs`):
- fila completa sem WebGL; Soul e dano exibidos iguais aos eventos;
- assinatura 001 mostra o callout com o nome do golpe, sem esperar VFX;
- skip termina a fila e libera a entrada.

## Testes no navegador
| Caso | Resultado |
| --- | --- |
| Carregar, console sem erro | OK (nenhuma mensagem de erro) |
| Mulligan dos dois jogadores (Keep) | OK |
| Base pela mão (menu rápido) | OK |
| 7 turnos automatizados: Base, Devotee, End turn, janelas, auto-pass | OK, chegou ao Round 4 |
| Strike: alvos legais pulsando (God + 2 Devotees), barra de escolha | OK |
| Janela de resposta após declarar: prioridade passa para B, botão vira "Pass · resolve" | OK |
| Resolução: Seika (ATK 0) no God B → 0 dano, retaliação 3, Seika destruída, Soul 30/30 | OK, bate com a engine |
| Tema Poseidon (céu, piso, colunas, cáusticas) | OK |
| Perfis LOW e ULTRA trocados em execução | OK; 1 draw call de mundo, 0 texturas |
| 1440×900 e 375×812 sem rolagem horizontal | OK (`scrollWidth` = largura) |
| Inspeção por hover com texto aprovado | OK |

## Defeitos achados e corrigidos
1. Poeira de Cosmo gigante (pontos de 100–240 px) cobria a arena → tamanho recalibrado.
2. Fila do orquestrador travava com aba oculta (WAAPI e rAF congelados) → todo `await` de animação tem teto de tempo de parede.
3. Mão cobria a barra inferior no celular → altura da mão ajustada.
4. Cache do navegador servia `scene.js` antigo → imports versionados (`?v=`).

## Não verificado / limitações
- **FPS real**: medido 33–54 com o painel oculto/estrangulado; não é medida válida de desempenho. Medir com o painel visível e numa máquina-alvo.
- Fallback 2D sem WebGL: caminho de código revisado, não executado no navegador.
- Assinatura 003 e cadeia com Moment de resposta: não exercitados no navegador (001 coberto por teste).
- Equipment, Technique e habilidades {T} pela interface: engine coberta por testes; na interface só o caminho Devotee/Base/Strike foi clicado.
- Arrastar e soltar: implementado, não testado com mouse real.
- Perguntas "you may" usam `confirm()` do navegador (provisório).
- O contador `particles` em `stats()` é a marca d'água do pool, não as partículas vivas.
- Num screenshot após recarregar no celular a arena saiu preta (provável rAF pausado com o painel oculto); não reproduzido com o painel visível.
