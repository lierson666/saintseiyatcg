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
Barra central com o nome da carta, a pergunta e botões (opções, Sim/Não, Done, Skip, Cancel). Candidatos vêm de `choices-v3.js` (mesma fonte da mesa de depuração) e de `strikeTargets`. Perguntas "you may" da engine durante a resolução usam o diálogo do navegador neste slice (pendente: diálogo próprio).

## Hot-seat
A tela mostra o jogador que precisa agir: mulligan → quem decide; janela → quem tem prioridade; fora disso → jogador ativo. "Hide the other hand" vem ligado.

## Erros
A engine lança `RuleError` com código; a interface traduz para frase curta em inglês (`WHY` em `app.js`).

## Acessibilidade
Teclado completo, foco visível, `aria-label` em cartas, banco e campos, `aria-live` nos avisos, `prefers-reduced-motion` respeitado, opções "Reduce motion", "Reduce flashes", intensidade de tremor 0–1,5, velocidade de animação, pular animações de compra.
