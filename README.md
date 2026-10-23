# Saint Seiya TCG

Projeto de trading card game inspirado em Saint Seiya, com foco em conflitos entre faccoes, armaduras, tecnicas e reliquias sagradas.

## O que ja existe

- Artes base em `/ARTS`
- Frames editaveis em `/FRAMES`
- Cartas exportadas em `/CARDS`
- Um conjunto inicial visual ja montado com 45 cartas em PNG

## Estado atual

O projeto agora ja possui uma base visual forte e um documento de regras oficial. A parte mais importante daqui para frente e transformar essas regras em cartas balanceadas e decks testaveis.

Athena agora ja esta catalogada de forma muito mais completa no banco de dados, incluindo God, Domains, Bronze Saints, Silver Saints, Gold Saints, Cloths, Weapons, Relics, Techniques e Moments. A gauntlet `Athena Beta v0.1` tambem ja esta documentada.

Em 23/10/2026, o **Rulebook 2.0** foi consolidado e integrado à arena local e ao Card Forge. O catálogo tem 357 cartas (57 históricas + 300 novas aprovadas), seis decks iniciais e cartas interativas. A HUD distingue o token de vantagem/iniciativa da oportunidade de AÇÃO e da prioridade. Veja [a implementação](docs/implementacao-rulebook-2.0.md) e [a validação](docs/validacao-rulebook-2.0.md).

## Documentacao principal

- `/docs/guia-do-jogo.md`: manual oficial `Rulebook 2.0`, base para playtest
- `/docs/migracao-rulebook-2.0.md`: mudanças, pendências e preparação das novas cartas
- `/docs/CHANGELOG-regras.md`: historico de mudancas de regra
- `/CLAUDE.md`: repositorio de regras (fontes oficiais e como mudar uma regra)
- `/data/cards.json`: banco inicial das cartas ja exportadas
- `/docs/beta-athena.md`: gauntlet oficial da beta Athena
- `/data/beta-athena.json`: decks, domains, proxies e cobertura da beta
- `/playtest/index.html`: arena local do Rulebook 2.0
- `/playtest/engine.js`: motor independente, comandos validados, prioridade, pilha e IA
- `/playtest/game.css`: arena responsiva e visual de console inspirado no PS3
- `/docs/rebuild-sanctuary.md`: arquitetura e verificação da reconstrução
- `/docs/keyword-matchups.md`: proposta de contrajogo das keywords
- `/docs/asset-map.md`: mapa das pastas de arte, arquivos nao usados e reorganizacao proposta

## Como abrir a versao jogavel

No terminal, a partir da raiz do projeto:

```bash
python3 card-forge/serve.py
```

Depois abra:

- `http://localhost:8765/playtest/`

## Testes da versão jogável

Contrato de regras e comandos, sem instalar dependências:

```bash
node --test tools/test-rules-v2.mjs tools/test-card-presentation.mjs
```

Regressão de navegador (requer Playwright no ambiente de desenvolvimento e o servidor HTTP acima):

```bash
python3 tools/test-ui-v2.py
```

As capturas ficam em `card-forge/out/qa-v2/` (fora do Git). O teste de regras inclui seis partidas completas entre facções. O script de navegador da antiga beta é histórico; a validação vigente é `test-ui-v2.py`.

## Convencao de idioma

O projeto segue uma regra simples:

- Desenvolvimento, campos internos e anotacoes: portugues
- Nomes de cartas, keywords e texto visivel ao jogador: ingles

No banco de cartas, isso foi separado para evitar confusao entre implementacao e apresentacao.

O modelo atual tambem registra:

- tipo e subtipos
- custo e unidade de custo
- cosmoble
- power, resistance, soul, attack e awaken
- equipar_custo e damage_cloth quando aplicavel
- habilidades em ingles
- status de implementacao visual (`art-ready` ou `design-ready`)

## O que esta organizado

Com a documentacao atual, o projeto ja cobre:

- documentar as regras
- registrar categorias de carta
- mapear faccoes e identidade de jogo
- catalogar o set inicial
- preparar o balanceamento e o playtest

## Estrutura do projeto

- `/README.md`: visao geral do projeto
- `/docs/guia-do-jogo.md`: regras oficiais
- `/data/cards.json`: banco inicial das cartas exportadas

## Set inicial encontrado

- Athena: nucleo principal do set
- Poseidon: lider/faccao em construcao
- Hades: lider/faccao em construcao
- Artemis: lider/faccao em construcao
- Ares: lider/faccao em construcao

### Categorias atuais identificadas

- Bronze
- Silver
- Gold
- Common
- Uncommon
- Cloth
- Relics
- Techniques
- Moment
- Divine Leaders

## Fluxo de producao recomendado

1. Consolidar aqui as regras oficiais em `docs/guia-do-jogo.md`
2. Completar o `data/cards.json` com custo, atributos, texto e raridade final
3. Definir o tamanho do deck, zonas de jogo e condicao de vitoria
4. Balancear por faccao e por curva de custo
5. Montar decks de teste e registrar resultados de playtest

## Proxima etapa mais valiosa

Preencher o texto real dos efeitos, custos, atributos e keywords de cada carta no `data/cards.json`. A base do jogo ja existe; agora o ganho vem do balanceamento.
