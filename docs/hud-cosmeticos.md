# HUD e cosméticos — diretriz do autor

Pedido de 23/10/2026: a vantagem deve ser reconhecível por um token, e sua aparência poderá ser cosmética, assim como sleeves e emotes do God.

O medalhão **ADVANTAGE** representa a iniciativa da rodada, conforme §55 do guia. Exibe jogador e rodada e alterna com a iniciativa. O indicador de AÇÃO mostra quem age agora; o de prioridade identifica a resposta. Passar prioridade ou jogar uma resposta não transfere o token. Não é um placar de quem está ganhando.

As aparências locais ficam em `playtest/cosmetics.js`, separadas do motor. Há três tokens (Star Hill, Solar seal, Lunar crystal), três sleeves e seis emotes textuais. A escolha fica nas preferências do navegador. Não muda atributos, recursos, custos, ordem de ação ou efeitos.

Os sleeves são usados no verso das cartas ocultas; nunca revelam a identidade da carta. Emotes aparecem junto ao God com seu nome e podem ser silenciados em Options. Não há dublagem nesta etapa. Novos pacotes podem acrescentar arte/animação/som sem duplicar a lógica de iniciativa ou criar bônus de jogo.

A hierarquia de cartas é obrigatória nas duas representações. Nome e custo; tipo; keywords; habilidades separadas; títulos, custos e requisitos; Owners, Resonance e estágios; atributos e EQUIP. O custo de EQUIP deve estar sempre visível nas cartas equipáveis. Os números estruturados alimentam a impressão e a carta viva, inclusive depois de editar os estágios.

A integração atual é local. Loja, inventário remoto, monetização, áudio de personagens e sincronização online são etapas futuras e não foram simulados como funcionalidades prontas.

## Legibilidade por dispositivo

Ajuste solicitado pelo autor em 23/10/2026: no PC, a HUD deve ser maior e mais clara. A escala padrão de desktop usa textos de 16 px, rótulos de recursos de 13 px, Soul de 46 px e ação principal de 24 px. O painel lateral ganhou largura e acompanha a rolagem. Os fundos dos indicadores têm mais opacidade e os textos secundários, mais contraste. O controle pessoal de tamanho da HUD continua disponível e independente das cartas.

Tablets e celulares usam pontos de adaptação próprios; não recebem a escala completa do desktop. A versão móvel também ganhou rótulos mais legíveis e botões de ferramentas com área de 44 px. Conferido de 375 a 1920 px, em orientação horizontal e com HUD em 125%, sem transbordamento horizontal nem indicadores cortados. Capturas comparativas ficam em `card-forge/out/qa-hud/` (fora do Git).
