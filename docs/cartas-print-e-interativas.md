# STAR HILL / Card Forge — impressão e cartas interativas

**Decisão de produto confirmada pelo autor em 23/10/2026.** Origem: pedido neste chat para separar a arte final de impressão da carta interativa dentro do jogo, tendo o Arena como referência de comportamento. Não é uma alteração das mecânicas do SSTCG.

## Uma carta, duas representações

O Card Forge deve preparar a mesma carta para impressão e para uso interativo no jogo. As representações compartilham identidade, revisão, dados, texto e ilustração. O jogo mantém seus dados de instância e atributos atuais sobre essa definição comum.

| Aspecto | Impressão | Jogo |
| --- | --- | --- |
| Resultado | Composição final estática, exportável | Composição interativa em tempo real |
| Ilustração | Parte da composição final | Fundo visual da carta |
| Nome, tipo, custo e habilidades | Texto composto na exportação | Camadas de texto e dados renderizadas pela interface |
| Números | Valores da revisão impressa | Valores atuais fornecidos pela engine |
| Moldura e símbolos | Peças do template | Peças visuais reutilizáveis, com posicionamento próprio da interface |
| Interação | Consulta, impressão e compartilhamento | Seleção, inspeção, ações legais e feedback de estado |

Uma imagem de ilustração não contém nome, texto de regras, custo ou atributos impressos. O PNG completo exportado da carta não substitui esse arquivo de ilustração.

## Contrato dos dados e assets

- A definição da carta e a engine compartilham o mesmo ID e a mesma revisão. Texto inglês não é copiado para um segundo catálogo do renderizador.
- A ilustração e o enquadramento ficam disponíveis separadamente da arte final de impressão. Um mesmo arquivo pode ser reutilizado com enquadramentos próprios das duas representações.
- Os templates existentes continuam definindo a identidade visual. Molduras, gemas, símbolos e ornamentos podem ser imagens; letras e números permanecem camadas próprias na carta interativa.
- O renderizador recebe a definição da carta e uma projeção do estado atual da instância. A engine fornece atributos calculados, dano, marcadores, estados e ações legais.
- A interface não deduz efeitos executáveis lendo o texto da habilidade e não cria regras para uma animação. O resultado mecânico existe independentemente da apresentação.
- Arquivo de ilustração ausente deve aparecer como pendência explícita. Não usar silenciosamente a imagem completa de impressão como fundo da carta jogável.

## Comportamento esperado no jogo

A carta possui composição e áreas de interação próprias. Seleção, alvo válido, disponibilidade de ação e inspeção são feedbacks da interface sobre os dados recebidos. A mão, o campo e a inspeção ampliada podem ajustar densidade, enquadramento e distribuição do texto, mantendo a identidade e o conteúdo da revisão.

Quando um efeito válido altera um atributo, o numeral exibido acompanha o valor atual. Dano, marcadores, equipamentos e estados também se atualizam sem reexportar a ilustração ou a arte final. Texto e efeitos permanecem legíveis; animações e movimento reduzido não alteram o resultado da partida.

“Carta viva” significa composição orientada pelos dados e interação com o estado da partida. Animação contínua da ilustração não é necessária para atender esta decisão.

## Estado existente e evolução necessária

O Card Forge já usa canvas para compor a exportação estática. `card-forge/projects/<id>.json` já pode guardar uma referência de ilustração e seu enquadramento em `art`. `caminho_imagem` no catálogo atual aponta para a imagem final da carta; não deve ser reinterpretado como ilustração sem uma migração explícita.

A evolução deverá disponibilizar as duas prévias e preservar os dados necessários aos dois renderizadores. A definição de eventuais novos campos e sua migração fica para a implementação revisável. Nenhum novo campo foi gravado no catálogo por esta decisão.

## Critérios de aceitação

1. A mesma revisão pode ser composta para impressão e para o jogo, com os mesmos textos e valores de origem.
2. A carta jogável continua mostrando nome, custo, tipo, regras e atributos quando a ilustração é ocultada, pois esses elementos são renderizados separadamente.
3. Trocar a ilustração altera o fundo/enquadramento e preserva os dados e as áreas de interação.
4. Um atributo ou estado atualizado pela engine aparece na carta sem novo PNG ou recarregamento da ilustração.
5. Os valores de uma instância durante a partida não sobrescrevem a definição do catálogo nem sua versão de impressão.
6. Seleção, inspeção e ações legais usam a instância correta, com feedback legível e interação por teclado quando aplicável.
7. Nenhum PNG completo de impressão é usado silenciosamente como corpo ou fundo da carta jogável.

## Limites desta decisão

Esta documentação registra o requisito. Não implementa o renderizador interativo, não modifica regras do manual e não aprova mudanças de balanceamento. Permanecem as restrições sobre `FRAMES/`, `ARTS/`, `CARDS/` e `playtest/`, além do diff aprovado antes de qualquer gravação em `data/cards.json`.
