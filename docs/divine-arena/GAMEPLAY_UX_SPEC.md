# Gameplay UX Spec

## Layout (desktop)
Topo: God, banco e pilhas do oponente; mão do oponente (verso). Centro: campo do oponente, linha de fase, seu campo. Base: seu God, banco, pilhas e sua mão em leque. Direita: painel de ações (prioridade, cadeia, botão primário, ferramentas). Abaixo de 760 px o painel vira barra inferior.

## Ações
| Ação | Como |
| --- | --- |
| Jogar carta | Clique → menu rápido, ou arrastar para o campo / sobre um Devotee |
| Virar Base | Clique → "Place as Cosmo Base" |
| Strike | Clique no Devotee → "Strike" → clique no alvo pulsante |
| Habilidade {T} | Clique no Devotee → nome da habilidade |
| Re-equipar | Clique no Equipment solto |
| Passar / encerrar | Botão primário ou Espaço |
| Cancelar escolha | Esc |
| Log | Botão ou L |

## Escolhas
Barra central com o nome da carta, a pergunta e botões (opções, Sim/Não, Done, Skip, Cancel). Candidatos vêm de `choices-v3.js` (mesma fonte da mesa de depuração) e de `strikeTargets`. Perguntas da engine durante a resolução (Water Prison, "you may", Base e descarte do Great Flood, Sacred Knowledge) usam o modal de decisão do Olympus Arena (`decisionModal` em `app.js`), alimentado pelo protocolo de decisão pendente (`engine-v3/decision.js`): a ação suspende na pergunta, a tela mostra quem decide e só as opções legais, e a resposta continua do snapshot sem repetir custo nem gatilho. Teclado: 1–9 marcam opções, setas andam, Tab fica preso no modal, Esc alterna "View board" (esconder o modal não é timeout). Com timeouts ligados: opcional → `TIMEOUT_DECLINED`; obrigatória → `TIMEOUT_AUTO_CHOICE` (G3-030). A cadeia no painel de prioridade numera os itens e o topo resolve primeiro; a ordem entre gatilhos simultâneos do mesmo jogador ainda não é escolha dele (pendência 5 do suplemento).

## Hot-seat
A tela mostra o jogador que precisa agir: mulligan → quem decide; janela → quem tem prioridade; fora disso → jogador ativo. "Hide the other hand" vem ligado.

## Erros
A engine lança `RuleError` com código; a interface traduz para frase curta em inglês (`WHY` em `app.js`).

## Acessibilidade
Teclado completo, foco visível, `aria-label` em cartas, banco e campos, `aria-live` nos avisos, `prefers-reduced-motion` respeitado, opções "Reduce motion", "Reduce flashes", intensidade de tremor 0–1,5, velocidade de animação, pular animações de compra.
