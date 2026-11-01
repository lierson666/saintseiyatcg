# Atividade do adversário (estilo MTG Arena)

Decidido com o autor em 01/11/2026 (grill-me). Mostra que o adversário está fazendo algo enquanto o jogo espera por ele.

## Sinais

- **Mão se mexendo:** a carta virada da mão do adversário sobe quando ele passa o mouse sobre ela. Online só a posição na mão é enviada, nunca qual carta é.
- **Mira:** ao escolher alvo de Strike ou Spell, aparece a seta dele apontando para o alvo antes de confirmar.
- **Avatar pensando:** brilho animado no God dele sempre que o jogo espera por ele (turno dele, resposta na pilha, escolha de alvo, mulligan).
- **Carta em foco:** a carta da mesa que ele inspeciona ganha contorno.

## Regras

- Vale contra a IA e no duelo online. Contra a IA o jogo encena os mesmos sinais: pausa de 0,5 a 1,5 s antes de cada jogada, com a mão se mexendo. Com "Skip animations" ligado, sem pausa.
- Os dois lados se veem; não há opção de esconder os próprios movimentos.
- Configuração "Show opponent activity", ligada por padrão, desliga só a exibição na tela de quem escolheu. "Reduzir movimento" troca animação por destaque estático.
- Online: o cliente envia hover/mira com limite de frequência; o arena-server só repassa ao outro jogador, sem guardar e sem passar pela engine. Mudança no arena-server exige reinício do container como root.
