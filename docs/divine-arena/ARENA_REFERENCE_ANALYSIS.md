# Arena Reference Analysis

## Limite da análise
O pedido citava "REA do MTG Arena". **Não foi feita engenharia reversa de binário, extração de código, assets ou protocolos de nenhum produto.** O próprio pedido restringe a análise a comportamento observável e interfaces públicas. Esta análise usa princípios de UX de TCGs digitais conhecidos publicamente (MTG Arena, Hearthstone, Legends of Runeterra, Marvel Snap) descritos em nível de padrão, sem copiar layout, arte, texto ou marca.

## Padrões observáveis adotados
| Padrão | Por que funciona | Como aplicamos |
| --- | --- | --- |
| Um botão primário contextual | O jogador sempre sabe "o que avança o jogo" | `End turn` / `Pass · resolve` / `Keep hand`, sempre no mesmo lugar, atalho Espaço |
| Indicador explícito de prioridade | Janelas de resposta confundem novatos | Caixa "Priority · Player X" com cor própria quando há janela |
| Auto-pass inteligente | Elimina cliques vazios | Passa sozinho quando não há Moment jogável na mão (desligável) |
| Destaque de jogável | Reduz busca visual | Borda verde = jogável agora; borda dourada = pode virar Base |
| Destaque de alvo legal | Erro de alvo vira impossível | Alvos de `strikeTargets` pulsam em vermelho; o resto escurece |
| Prévia de custo | Liga carta ↔ recurso | Ao passar o mouse, as esferas que seriam gastas piscam |
| Inspeção por hover | Texto completo sem sair do fluxo | 300 ms sobre a carta abre a versão grande com o texto aprovado |
| Fila de animação com skip | Ritmo sem perder controle | Orquestrador sequencial; clique/Espaço pula |
| Banner de turno | Marca transições | "Your turn" / "Player X's turn" |
| Log textual | Auditoria e acessibilidade | Gaveta "Log" (tecla L) |

## Padrões rejeitados
- Timer de turno e "rope": sem regra aprovada.
- Microações alternadas: a 3.0 usa Turno Livre (ALPHA-P02).
- Emotes e cosméticos: fora do slice.
