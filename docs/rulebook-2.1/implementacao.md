# Rulebook 2.1 — implementação e validação

## Arquitetura e auditoria

A engine existente foi preservada: `playtest/engine-v2.js` mantém estado, comandos, pilha, prioridade, escolhas assíncronas, gatilhos, IA e projeções públicas sem DOM. `app-v2.js` coordena a apresentação e `view-v2.js`/`battle-guide.js` apresentam ações legais. `shared/card-model.js` define o contrato do catálogo; `rules-policy.js` concentra matriz de pagamentos, planos atômicos, afinidade de portadores e conversão elegível de Bases. A engine continua sendo a fonte do resultado mecânico.

STAR HILL usa o mesmo servidor stdlib local (`card-forge/serve.py`), delegando administração a `star_hill.py`. Seus editores e o aplicativo Mac carregam a mesma arena em prévias, sem outra engine. O atualizador por texto fica em `engine_updates.py` + `engine-editor.js`; não executa texto de regra como código.

Auditoria inicial: `main` em `c093980`, um commit local à frente de `origin/main` (`9628b53`). O commit anterior de atualização de módulos foi preservado. Após `git fetch origin --prune`, não havia branch `codex/engine-rulebook-2-1`; `git ls-remote --heads` confirmou sua ausência. `69469ec` não estava no histórico disponível. Trabalho feito em `codex/rulebook-2-1-engine`, sem reconstruir a engine ou reintroduzir Engage.

Lista integral de arquivos em `arquivos.json`. Commits de implementação: `3da3ef4` (motor/catálogo/guia) e `01aeeec` (atualizador STAR HILL).

## Comportamento implementado

- Devotee, qualquer Armor e Ultimate exigem Base; Technique resposta exige Latent; demais custos seguem a matriz e restrições expressas. Jogar Armor + Equip paga os dois custos atomicamente, impedindo que Latent substitua o custo de entrada Base-only. Controle completo permite escolher planos legais antes de gastar.
- Latent persiste, limitado a 3. Conversão opcional de Bases não usadas acontece após efeitos de fim, de zero até o espaço livre. Bases renovam normalmente; Cosmo temporário expira e não é convertido. Ganho por dano adversário efetivo continua uma vez por AÇÃO e respeita prevenção/cap.
- Pass encerra ações comuns até a próxima rodada. O adversário continua agindo; respostas permanecem legais; passes de prioridade continuam independentes. Resposta a gatilho de fim não deixa uma AÇÃO antiga presa na rodada seguinte.
- Vencedor do sorteio escolhe quem começa e perdedor ganha 1 Latent, independentemente da escolha. Iniciativa alterna; mulligan, compras e preparação preservados. Seleção explícita de primeiro jogador continua disponível para testes locais.
- Armor inclui Cloth, Scale, Surplice, Warplate e Moonplate; um slot, separado de armas/acessórios. V1 não é Equipment independente. V2+ podem ocupar o slot. Equip usa identidade exata, múltiplos portadores e custos configuráveis (padrão 1/5). Quatro estágios são suportados por todas as facções; sequência apenas quando expressa; requisitos impressos de Owner e Awaken continuam válidos.
- Living Armor: HP próprio quando definido, dano separado, Broken permanece no Battlefield; bônus numéricos, keywords, habilidades concedidas, passivas e novos gatilhos ficam suspensos até Repair. Morte do portador mantém Armor/dano, desfaz vínculo e retorna a Vanilla. Troca, desequipamento e rodada não reparam. Cura e Repair são operações distintas; reparação não ultrapassa HP máximo.
- Dados sem HP aprovado mostram pendência. A engine não inventa números, absorção ou divisão automática do dano de combate. A contribuição numérica da V1 incorporada ainda depende de revisão de sua identidade-base.
- Guarda, Rivalidade, Guardian, Nimble, Long Range, Pierce, God, Soul, Domain, Sealed, retaliação e vitória preservados. Sealed foi conferido nas seções canônicas 48/59 e não mudou.
- Catálogo aceita origem documentada de personagens e valida composição de God Armor/Divine Artifact quando definida. Ausências são pendências editoriais; os limites não afetam decks.

## Compatibilidade com o STAR HILL e Card Forge

Ações, custo/recursos permitidos, Pass, prioridades, banco e Equip são obtidos da engine. O jogo inclui ajuda, log e instruções 2.1; Armor mostra HP próprio/Broken ou revisão pendente. Card Forge oferece HP, custos ressonante/outros, até quatro estágios, sequência explícita, origem e referências. Impressão e carta interativa compartilham dados; nenhuma mudança exige editar PNGs.

Reimportar planilha preserva metadados do catálogo ausentes na fonte. A publicação da seleção de carta e de seu histórico ocorre junta, evitando que o carregamento de arte apague uma edição/desfazer. O painel de decks aceita revisões 2.0 e 2.1 sem invalidar IDs dos decks existentes.

Atualização por texto: gerar proposta pelo Claude Code autenticado, revisar diff, testar em cópia protegida pelo sandbox do macOS, aprovar/aplicar. Testes falhando, pendência bloqueante, texto não gravado ou mudanças concorrentes impedem aplicação. Cancelamento, limite de saída/tempo, histórico e restauração após falha de gravação são cobertos. A geração foi simulada nos testes; nenhum pedido real ao modelo foi feito durante este desenvolvimento. Não existe publicação automática.

## Verificações

- **124 testes Node aprovados**, sem falhas: regras anteriores, cenários 2.1/Living Armor, apresentação de cartas, guia, apresentação/FX e histórico/decks dos editores.
- Backend administrativo: 17 testes; atualizador por texto: 11 testes, incluindo execução real de Node no sandbox, canários de acesso ao projeto original e restauração após falha no recibo final.
- `python3 card-forge/serve.py --selftest`: 357 cartas preservadas; edição/append em memória; Host/Origin externos recusados.
- Navegador: arena/drag/inspeção/log, Card Forge, roundtrip das 357 cartas e tipografia; Guarda/Rivalidade; STAR HILL; atualização por texto com provedor simulado; histórico/decks; 15 telas, 44 alvos de HUD, efeitos, mobile e movimento reduzido.
- Regressão com relógio real da IA: rodada 8, 27 observações de escolhas da IA durante resolução, zero erros JS. O cenário injeta efeitos apenas na cópia HTTP de teste; não altera cartas reais.
- Simulações: 24 partidas completas, perfis Voltron/Anthem/controle/aggro/recursos/respostas, duas sementes e iniciativa invertida. Todas terminaram em 7–13 rodadas: 404 Strikes, 135 Equips, 7 evoluções, 124 conversões de banco e 1 resposta exercitada. Detalhes em `simulacoes.json`. São heurísticas e cartas provisórias: evidência de fluxo, não balanceamento competitivo.

Comandos reproduzíveis:

```sh
node --test tools/test-rules-v2.mjs tools/test-rules-v21.mjs tools/test-card-presentation.mjs tools/test-battle-guide.mjs tools/test-presentation.mjs tools/test-star-hill-editors.mjs
node tools/simulate-rulebook-21.mjs
python3 tools/test-star-hill.py
python3 tools/test-engine-updates.py
python3 card-forge/serve.py --selftest
python3 tools/test-living-armor-ui.py
python3 tools/test-ui-v2.py
python3 tools/test-ai-progress-ui.py
python3 tools/test-engine-updates-ui.py
python3 tools/test-arena-ui.py
python3 tools/test-guard-rivalry-ui.py
python3 tools/test-star-hill-ui.py
python3 tools/test-star-hill-editors-ui.py
python3 tools/test-designers-ui.py
```

Testes de navegador requerem Playwright + Chrome e a biblioteca local de áudio; não são dependências da aplicação. Capturas ficam em `card-forge/out/`, fora do Git. O teste do atualizador usa projeto temporário; o teste de simulação gera somente seu relatório.

## Catálogo, pendências e limites

O autor aprovou explicitamente `catalogo.diff`: apenas 41 registros receberam `categoria_equipamento`, `equipar_custo_ressonante` e `equipar_custo_outros`. Os 357 IDs e todos os nomes, textos, programas, referências e artes foram preservados; nenhum HP ou efeito Repair foi atribuído sem revisão. Veja `migracao-catalogo.md`.

Pendências deliberadas de Card Craft: HP/resistência das Armor; distribuição de dano de combate; contribuição da Armor V1 nos atributos do Devotee; custos/valores de Repair de Aries Mu; revisão de nomes/versões e afinidades faltantes; subtipo de Chosen Moonplate; estágios adicionais; definição final de God Armor/Divine Artifact e das outras quatro facções. Nenhum personagem ou item divino foi gerado automaticamente.

`FRAMES/`, `ARTS/`, `CARDS/`, planilha original, configurações pessoais e projetos de arte do usuário foram preservados. O servidor local do Mac foi atualizado; o aplicativo usa esses arquivos sem recompilação. Reabrir/recarregar o jogo para carregar módulos novos e iniciar uma nova partida. O envio solicitado é branch + PR para `main`, sem merge nem deploy.
