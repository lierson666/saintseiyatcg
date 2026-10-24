> **Nota (24/10/2026):** documento histórico. Engage, ENG, Disengage e Multiguard foram removidos; vale o capítulo IV do `guia-do-jogo.md` (Guarda e Rivalidade) e o `CHANGELOG-regras.md`.

# HUD e cosméticos — diretriz do autor

Pedido de 23/10/2026: a vantagem deve ser reconhecível por um token, e sua aparência poderá ser cosmética, assim como sleeves e emotes do God.

O medalhão **ADVANTAGE** representa a iniciativa da rodada, conforme §55 do guia. Exibe jogador e rodada e alterna com a iniciativa. O indicador de AÇÃO mostra quem age agora; o de prioridade identifica a resposta. Passar prioridade ou jogar uma resposta não transfere o token. Não é um placar de quem está ganhando.

As aparências locais ficam em `playtest/cosmetics.js`, separadas do motor. Há três tokens (Star Hill, Solar seal, Lunar crystal), três sleeves e seis emotes textuais. A escolha fica nas preferências do navegador. Não muda atributos, recursos, custos, ordem de ação ou efeitos.

Os sleeves são usados no verso das cartas ocultas; nunca revelam a identidade da carta. Emotes aparecem junto ao God com seu nome e podem ser silenciados em Options. Não há dublagem nesta etapa. Novos pacotes podem acrescentar arte/animação/som sem duplicar a lógica de iniciativa ou criar bônus de jogo.

A hierarquia de cartas é obrigatória nas duas representações. Nome e custo; tipo; keywords; habilidades separadas; títulos, custos e requisitos; Owners, Resonance e estágios; atributos e EQUIP. O custo de EQUIP deve estar sempre visível nas cartas equipáveis. Os números estruturados alimentam a impressão e a carta viva, inclusive depois de editar os estágios.

A integração atual é local. Loja, inventário remoto, monetização, áudio de personagens e sincronização online são etapas futuras e não foram simulados como funcionalidades prontas.

## Legibilidade por dispositivo

Ajuste solicitado pelo autor em 23/10/2026: no PC, a HUD deve ser maior e mais clara. Na mesa atual, o guia usa texto de 16 px, histórico de 14 px, recursos de 30 px, Soul de 34 px e ação principal de 23 px, antes da escala pessoal. Fundos escuros e contraste preservam a leitura sobre o cenário. O controle de tamanho da HUD continua independente das cartas.

Tablets e celulares usam pontos de adaptação próprios; não recebem a escala completa do desktop. O guia vira um painel aberto pelo botão de histórico. A mesa estreita reserva espaço para os dois campos, recursos, zonas, God e AÇÃO; telas baixas podem rolar verticalmente. Conferido de 375 a 1920 px, incluindo orientação horizontal e HUD de PC em 125%, sem transbordamento horizontal. Capturas atuais ficam em `card-forge/out/qa-arena/` (fora do Git).

## Interação da mesa e guia flutuante

Pedido do autor em 23/10/2026: aproximar a experiência de consulta, mão e disposição da HUD do Magic Arena, mantendo as regras de Saint Seiya. Referência de interação: [State of the Game — January 2021, Wizards](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-state-game-january-2021-01-21). O motor continua sendo `engine-v2.js`; a apresentação é própria, em DOM/CSS e com os assets do projeto.

- A mão forma um leque. Hover ou foco de teclado mostra uma prévia; clicar abre a carta com texto completo e somente as ações permitidas pelo motor. As setas Previous/Next e o botão Your hand permitem consultar cartas sobrepostas.
- Arrastar uma carta jogável da mão para o campo envia o comando normal de jogar. Custos, alvos e prioridade seguem a mesma validação usada nos botões. Clicar para consultar não joga a carta.
- Os Gods ficam junto de seus recursos e zonas. Cartas no campo mostram Power, HP, dano, Prepared, confrontos e equipamentos; linhas conectam os confrontos. Os sleeves ocultam a mão adversária.
- No PC, o box flutuante à direita permanece visível, inclusive ao abrir uma carta ou escolher um alvo. Exibe rodada, jogador ativo, janela atual, instrução contextual, pilha e histórico em ordem cronológica. A oportunidade de ACTION e a prioridade têm contadores de passes separados.
- O guia consulta ações legais e escolhas do estado atual. Ele explica Base gratuita, Engage, Strike, EQUIP, evolução e respostas sem acrescentar fases do Magic ao Rulebook 2.0. Escolhas privadas do adversário não revelam seu conteúdo no guia.
- O histórico completo permanece na memória da partida. A interface começa com as últimas 120 entradas e permite carregar as anteriores; novas jogadas não deslocam a leitura de quem voltou no histórico. Jump to latest action retoma o acompanhamento. Ao terminar o duelo, View battle history mantém a consulta disponível também no celular. Sair do duelo descarta esse histórico local.
- No celular, o guia abre sobre a mesa, com fechamento por botão/Escape e foco contido. Ao mudar entre PC e celular, o acesso à mesa acompanha o layout. Teclado, toque, redução de movimento e escala pessoal continuam disponíveis.

`playtest/battle-guide.js` deriva a orientação e classifica os registros; não decide regras. `playtest/arena.css` contém o layout. A única alteração no armazenamento do motor nesta etapa remove o descarte automático das entradas anteriores a 500.
