# STAR HILL — inventário do projeto

Auditoria de 22/10/2026. Commit de referência inicial: `6b9b19d`, branch `main`. A árvore já continha trabalho de outra frente. O arquivo [inventario-arquivos.json](inventario-arquivos.json) enumera **502 arquivos** no momento da coleta, incluindo metadados de ferramentas e assets ignorados pelo Git. Exclui esta pasta de auditoria, `.git` e `graphify-out/`. O total pode mudar pelo trabalho concorrente e pela sincronização do Drive.

## Componentes existentes

| Local | O que existe | Tratamento na auditoria |
| --- | --- | --- |
| `CLAUDE.md` | Hierarquia manual > catálogo > beta > código; protocolo para mudar regra | Lido; regra de autoridade preservada. |
| `docs/guia-do-jogo.md` | Manual oficial Vanilla 1.0, 32 seções | Recuperado em 81 enunciados; snapshots do commit e da árvore local. |
| `docs/CHANGELOG-regras.md` | Um registro de adoção da Vanilla 1.0 | Lido; não é histórico completo de cada alteração de carta/regra. |
| `data/cards.json` | 57 cartas; IDs, textos, números, Cosmoble, raridade, imagem e estado visual | Snapshot e validação sem gravação na fonte. |
| `data/beta-athena.json` | Cinco decks, três Domains e 17 proxies de cartas | Referências, totais, cópias e divergências comparados. |
| `card-forge/` | 14 arquivos no inventário; editor vanilla JS, CSS/HTML, servidor Python, importador e cinco projetos auxiliares | AGENTS/README lidos antes do trabalho; modelo, render, gravação e importação inspecionados. |
| `CARD-TEMPLATE/` | 57 PNGs de peças, templates, posições e metadados | Cinco facções; cinco layouts; oito mapeamentos de tipo/layout. |
| `FRAMES/` | 48 PSDs, 54 arquivos, aproximadamente 2,47 GB | Todos os PSDs lidos; 630 camadas de texto extraídas para evidência. Nenhum original alterado. |
| `ARTS/` | 73 ilustrações/arquivos, aproximadamente 559 MB | Inventário, caminhos e hashes de fontes relevantes. Nenhuma criação/renomeação. |
| `CARDS/` | 45 PNGs de cartas; 90 arquivos incluindo materiais de bancos de imagem | 40 imagens referenciadas e cinco variantes sem referência; licenças/pacotes não são fichas de regras. |
| `playtest/` | Jogo publicado e refatoração local concorrente | Somente leitura; versões e testes separados entre commit e working tree. |
| `tools/test-rules.mjs` | Suíte de contratos de regras não rastreada no início | Executada e copiada como evidência; não foi escrita nem alterada por esta tarefa. |
| `tools/rea-ps3/` | Três extratores de formatos de jogo de referência | Inventariados como ferramentas de referência, não engine do SSTCG. |
| `docs/ux-arena-rea.md`, `rea-soldiers-soul.md`, `rea-arena-engine.md` | Estudos de UX/arquitetura e referência visual | Lidos; propostas não promovidas a regras do jogo. |
| `LOGO/`, `MUSIC/`, `TEST/`, `MOBILE GAMES/`, packs de geometria/molduras | Identidade e material de referência, inclusive pacotes grandes de terceiros | Inventariados; sem execução ou incorporação de código/assets de jogos de referência. |
| `.omc/`, `.claude/` | Estado de ferramentas, sessões, checkpoints e inicialização | Inventariados como metadados operacionais; memória do projeto não contém decisões normativas adicionais. |

O material pesado permanece no Drive; Git não contém todos os originais. Há 16 nomes únicos de smart objects ausentes em `pieces.json` (25 ocorrências), contra a contagem antiga de 14 no README do editor. O render existente usa as prévias raster preservadas.

## Fontes documentais recuperadas

O documento nativo [[SAINT SEIYA TCG] RULES](https://docs.google.com/document/d/12EQXIps8ZUHxonsY2wl4NBnixXt8nKcpQuxAR9FEL4s/edit) foi localizado por buscas específicas no Drive. Contém manual, grade de set, 53 fichas Athena, cinco precons, dez fichas Poseidon e estudos de personagens de Ares sem fichas. A grade de 400 cartas contém propostas e não comprova a existência de 400 cartas desenvolvidas.

Foram listadas 23 revisões do documento, de `1` até `1192`, atribuídas pelo provedor ao criador. Snapshots e cobertura de leitura ficam em `fontes/`. A versão `1191` tem as mesmas 63 fichas da versão atual; `1192` acrescenta organização/títulos, sem alteração dessas fichas. Metadados de data do Drive não são prova suficiente de aprovação de texto.

Buscas “Saint Seiya”, “Poseidon” e “TCG” também localizaram cópias dos arquivos do projeto e resultados de outros assuntos, que não foram incorporados. Um PDF homônimo de 2014, fora da pasta do projeto, forneceu somente a identificação `saintseiya.indd`; ele não foi reconhecido como fonte deste TCG. Sua inspeção visual/relação com o projeto permanece desconhecida e não foi usada para preencher regras.

Conversas anteriores e aprovações individuais não estão integralmente disponíveis. Não foi encontrado arquivo local DOCX/XLSX/CSV com catálogo adicional; os PDFs locais inventariados são licenças de assets. O prompt mestre foi preservado em `fontes/prompt-mestre.txt` para distinguir requisitos atuais de conteúdo histórico.

## Linguagens, dependências e execução

- Aplicações: HTML/CSS e módulos JS, sem bundler, framework ou manifesto de pacote no projeto.
- Servidor do editor: Python stdlib, escuta em `127.0.0.1:8765`; `python3 card-forge/serve.py`.
- Jogo: arquivos estáticos; pode ser servido localmente. O jogo publicado não foi modificado ou usado para validar a árvore de outra frente.
- Testes encontrados: Node/assert/vm em `tools/test-rules.mjs` e selftest do formatador em `serve.py`.
- Extração de PSD: ferramenta `psd-tools` com Pillow/SciPy na ferramenta de extração; não é dependência para abrir o editor.
- Estudos/legado referenciam Three.js 0.160 e áudio WebAudio. Esses recursos de apresentação não são requisitos da engine independente proposta.
- Ambientes observados nos testes: Python 3.9.6, Node v24.14.1. Não há banco relacional, autenticação, RBAC, revisão esperada em escrita ou aprovação persistida no código atual do editor.

## Concorrência e preservação

No início havia alteração em `playtest/menu.js` e arquivos novos de engine/view/assets/testes/estudo REA. Durante a auditoria, outra frente alterou app/index, adicionou CSS/apresentação e editou o guia/UX para Nimble. Não atribuir essas alterações à STAR HILL nem incluí-las no commit desta auditoria.

SHA-256 do catálogo recuperado: `349c8c88d8dae9d77cad331adcfd648c123fa1d01e3eeb9edffa5e6990d8afa0`. O snapshot de engine testado e a suíte têm hashes em [verificacoes/resultados.json](verificacoes/resultados.json). O inventário registra hashes de fontes relevantes; não tentou validar integralmente arquivos ZIP/ISO/APK de referência como se fossem dados de regras.

## Grafo auxiliar

O mapa Graphify cobre código e documentação selecionados e a fonte original recuperada, não todos os assets e arquivos operacionais. `graphify-out/` já era ignorado pelo Git. O grafo é auxiliar e corresponde às leituras durante esta auditoria; não substitui fontes ou versões e precisa atualização para refletir mudanças concorrentes. O diagnóstico completo, incluindo endpoints pendentes e relações colapsadas, fica em `verificacoes/grafo-diagnostico.json`. A ferramenta não expôs consumo real de tokens dos agentes; nenhum custo zero medido é alegado.

## Fontes concorrentes adicionadas no fechamento

Outra frente acrescentou `docs/keyword-matchups.md`, `docs/rebuild-sanctuary.md` e `tools/test-playtest.py`, e atualizou README/changelog. Os documentos foram lidos para registrar o estado mais recente, mas não foram incorporados ao commit desta auditoria. O inventário de 502 é o retrato anterior à criação desses arquivos. Eles documentam implementação/checagens posteriores ao snapshot de engine testado aqui. A STAR HILL e seus números de teste continuam identificados como snapshot; não alegam ser a versão final da reconstrução concorrente.

O trabalho concorrente foi consolidado separadamente no commit `e016827` antes do commit destes relatórios. O catálogo preservado pela auditoria permanece idêntico ao snapshot.
