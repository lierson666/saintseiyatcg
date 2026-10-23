# STAR HILL — auditoria e recuperação do Saint Seiya TCG

**Data:** 22/10/2026, America/Sao_Paulo. **Etapa:** Fase 0. **Estado:** relatório de auditoria disponível; recuperação histórica e decisões de regras ainda abertas. Nenhuma implementação da plataforma foi iniciada nesta tarefa.

STAR HILL é o nome da ferramenta de controle e desenvolvimento, confirmado pelo criador neste chat. O jogo continua Saint Seiya TCG. Card Forge é o editor existente e será o ponto de partida do módulo Card Craft; o nome da carta Star Hill não muda.

## Entregáveis

1. [Inventário do projeto](01-inventario.md).
2. [Card Recovery Report — cartas e versões](02-cartas.md).
3. [Rulebook Recovery Report — 81 enunciados e 32 seções](03-regras.md).
4. [Conflict Report — divergências e evidências](04-conflitos.md).
5. [Architecture Proposal — STAR HILL](05-arquitetura.md).
6. [Implementation Roadmap — fases e critérios de saída](06-roadmap.md).
7. [Open Questions — decisões do criador](07-perguntas.md).

## Resultado verificado

- Catálogo atual: **57 IDs únicos**, 53 Athena e um God de cada outra facção. `art-ready`/`design-ready` registram prontidão visual, não aprovação.
- Fonte original do Drive: **63 fichas**, 53 Athena e **10 Poseidon** ainda ausentes do catálogo: cinco Generals e cinco Scales. União das fontes atuais: **67 cartas identificadas**, mais dois nomes históricos a reconciliar (Libra Staff e Golden Arrow), sem contar variantes, tokens ou estudos sem ficha.
- Assets: **48 PSDs / 630 camadas de texto**, 45 PNGs de cartas; os 40 caminhos usados pelo catálogo existem. Textos extraídos de PSD podem omitir símbolos desenhados em outras camadas.
- Beta: cinco decks de 60 cartas, até quatro cópias, sem referências ausentes. Há divergência de habilidade de Coliseum entre catálogo/manual e proxies da beta.
- Editor: gravador passa no selftest; conversão de marcação preserva 113 de 114 textos testados. O Awaken de Athena muda capitalização na ida e volta.
- Engine de outra frente: snapshot preservado com **35 testes estritos aprovados e uma falha de Nimble**. O legado no commit de referência tem 29 aprovados e sete pendentes. A expectativa antiga de Nimble foi depois substituída no manual; não é um diagnóstico da engine final. Estes resultados não certificam balanceamento.

Os arquivos do jogo e do editor foram apenas lidos. Fontes, evidências e relatórios desta tarefa ficam nesta pasta; o grafo auxiliar fica em `graphify-out/`, já ignorado pelo Git. Não houve gravação no catálogo, deploy, push ou merge por esta auditoria.

## Limites de conclusão

O documento original e seu histórico acessível foram procurados pelo Google Drive. As **23 revisões listadas foram recuperadas**; a cobertura e os hashes estão em [cobertura-revisoes.json](fontes/cobertura-revisoes.json). Conversas antigas e registros de aprovação individual não foram fornecidos integralmente. Assets vinculados ausentes e textos com símbolos incompletos também permanecem pendentes. Portanto, **a recuperação integral não está declarada concluída**.

Outra frente alterou `playtest/`, o guia e a especificação de UX durante a inspeção. Esta auditoria preserva snapshots e distingue o estado observado de alterações posteriores; não incorpora nem aprova esse trabalho. Consulte o adendo de concorrência do relatório de regras.

Para continuar: revisar as perguntas prioritárias, confirmar as fontes pendentes e aprovar o recorte da Fase 1. A implementação da engine depende da aprovação expressa pedida no prompt mestre. Qualquer mudança futura em `data/cards.json` continuará exigindo diff e aprovação antes da gravação.

O artefato navegável STAR HILL foi criado para esta conversa: consulta de 67 cartas, 81 enunciados com adendo final das keywords, 28 achados, cinco decks, arquitetura, fontes e nove fases. Metadados em `artefato.json`; 17 verificações de interação e um adendo de keywords em `verificacoes/artefato-qa.json`. É uma visualização de revisão, sem gravação nas fontes ou execução de partidas.
