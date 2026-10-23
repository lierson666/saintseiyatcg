# STAR HILL — conflitos e lacunas

Diferença encontrada não autoriza correção automática. O catálogo e o manual foram preservados, e versões históricas continuam disponíveis nas fontes. A tabela abaixo consolida os achados; [03-regras.md](03-regras.md) traz as linhas de origem e a análise normativa completa.

| ID | Situação encontrada | Estado / próximo passo |
| --- | --- | --- |
| C01 — Aprovação | 57 cartas usam `art-ready`/`design-ready`; o prompt requer estados editoriais e aprovação explícita. Checkmarks/FINAL do original não demonstram por si cada aprovação. | Não mapear prontidão visual para APPROVED. Recuperar histórico de autorização e separar estados. |
| C02 — Athena | Cosmo of Hope do documento gera por Devotee que sobrevive; catálogo restringe a Athena Devotees, ao turno adversário e a um ou mais sobreviventes do combate. | Versão operacional preservada; falta decisão/cronologia da mudança. |
| C03 — Athena PSD | PSD tem Attack 2, Awaken Ability custo 3 e Ultimate focada em Devotees em combate; catálogo/documento têm Attack 3, custo 5 e texto diferente. | PSD é versão visual histórica; não sincronizar dados antigos sobre o catálogo. |
| C04 — Locais/Domain | Sanctuary, Star Hill e Coliseu eram Local com custo e Cosmoble; guia/beta os tornam Domains fora do deck. | Mudança documentada no guia atual; decidir destino histórico/coexistência de Location e registrar versão. |
| C05 — Coliseum | Guia/catálogo: uma vez por jogo, alvo recebe +1/+0 e Pierce. Proxy e `beta.domains` ainda usam bônus ao entrar em combate. | Fonte superior define a beta atual; preparar diff dos dados inferiores somente em tarefa aprovada. |
| C06 — Seal | Manual define Sealed, mas não procedimento global de Seal counters; código tem virar/remoção/ciclo próprio. Modelo de lote usa redação temporária alternativa. | Canonicalizar texto conforme prompt após definir duração, counters, remoção, preparação e troca de zona. |
| C07 — Prioridade | Manual permite resposta com Technique e resolve-a primeiro. Código/UX acrescentam pilha, passes, timers e prioridade mantida. | Modelo completo depende de decisão; conveniência de UI não cria regra. |
| C08 — Turno/compra | Manual detalha três fases e compra livre na Main; código/resumo distinguem Draw e suprimem primeira compra do iniciante. | Confirmar passos e timing antes de formalizar engine. |
| C09 — Recursos | “Final do seu turno” e “todo Latent no fim do turno” coexistem; pool comum e custo Base Cosmo não têm contrato completo. | Definir expiração por jogador, geração/pagamento e unidade Base. |
| C10 — Unicidade/evolução | Guia cobre Devotees/Relics por nome e desconto de 2; código restringe unicidade a Saints nomeados e usa nome completo. | Definir escopo, duplicata de Relic, piso, identidade entre versões e transferência de estado. |
| C11 — Raridade | Quatro raridades atuais; manual usa Domain Comum/Incomum/Raro. Grade antiga separa estruturas da raridade de booster. | Não converter Raro para Mythic por suposição. |
| C12 — Equip/Resonance | Prompt e textos permitem bônus geral em não ressonantes e equip grátis fora do ETB; manual não formaliza janelas/sujeito do Tap. Código faz matching por substring do nome e registra parte dos efeitos como notas. | Identidade e handlers explícitos; confirmar janelas e semântica antes de executar todas as habilidades. |
| C13 — Scale | Cinco fichas têm Equip 2/Damage 3; regras de limite/dano/recuperação só nomeiam Cloth. Layout não tem mapeamento `Relic:Scale`. | Não herdar regras ou inventar template por analogia. |
| C14 — Saída de Relic | Manual diz que só sai destruída; Krishna/Chrysaor devolvem Relics à mão. | Formalizar hierarquia de exceções e diferença entre destruir, enviar, exilar, sacrificar e devolver. |
| C15 — Nimble | A definição intermediária foi substituída: somente Nimble atravessa Guardian; Nimble é atacado normalmente; Cheater não atravessa Guardian. Manual/changelog atuais registram a decisão. | Decisão documentada no fechamento; não repetir aprovação. A expectativa da falha de Nimble no snapshot antigo ficou superada. Efeito anti-Long Range de Cheater segue apenas proposto. |
| C16 — Prepared e combate | Entrada em combate vira todo Devotee no guia, mas atacante é único explicitado na sequência; Prepare/Unprepared não têm contrato completo. | Definir defensor, estado de entrada e novo ataque após preparar. |
| C17 — Resolução | Simultaneidade, mortes, alvos inválidos, controle/dono e camadas contínuas estão incompletos. | Registrar decisões; não tomar o comportamento atual do código como fonte normativa. |
| C18 — Tokens | Io lista quatro Beasts, habilidade se chama Six Beasts e Scylla Scale cria Beast não especificado. | Preservar quatro definições e lacunas; não criar outros dois nem escolher token padrão. |
| C19 — Deuses PSD | Hades pede Soul Filter com Tap, contra God não poder virar; textos extraídos não carregam todos os símbolos. Ares/Poseidon não têm custo de Ultimate explícito no catálogo. | Notas de revisão já existem; confirmar ícones, custos e exceções. Sem valores fictícios. |
| C20 — Markup | `fromMarkup(toMarkup(...))` altera capitalização no Awaken de Athena. | Reproduzido em 1 de 114 textos; origem/retorno em `verificacao-markup.json`. Nenhuma escrita foi executada. |
| C21 — Nova carta | `newCard()` captura facção, reseta estado para Athena e gera `athena-002` ao partir de Poseidon/Ares/Artemis/Hades. | Reproduzido nas quatro facções; ID colide com Seiya. Corrigir em tarefa posterior, com regressão e sem tocar no catálogo durante o teste. |
| C22 — Cosmoble | Catálogo tem atributo; formulário e importador não oferecem campo Cosmoble; carta nova recebe false. | Atributo existente é preservado ao clonar o original, mas não pode ser editado/importado pelo fluxo atual. |
| C23 — Gravação/versionamento | API valida ID/JSON e usa escrita atômica, mas não guarda aprovação, histórico ou revisão esperada; IDs são calculados no cliente. | Fundação precisa validar contrato e conflitos no servidor; o diff de UI não substitui trilha de revisão. |
| C24 — Escopo do editor | Há TXT em lote e PNG; faltam staging JSON/CSV/XLSX, duplicação explícita, PDF, ZIP e layouts específicos pendentes. | Backlog recuperado, não funcionalidade existente. Preservar direção visual e dados. |
| C25 — README | README declara deuses incompletos e 14 links ausentes; catálogo já tem dados recuperados; `pieces.json` lista 16 nomes únicos/25 ocorrências. | Documentação antiga não deve apagar trabalho recente. Atualizar depois do recorte aprovado. |
| C26 — Fontes gráficas | Cinco PNGs não usados, variantes de Shun/Judgment/Libra Sword e PSDs com nomes de arquivo que não correspondem ao texto interno. | Não contar cada arquivo como nova carta. Relação arquivo→conteúdo e duplicatas no relatório de cartas. |
| C27 — Determinismo | Engine em desenvolvimento usa `Math.random`, timers, closures na pilha e log textual. | Não satisfaz replay completo ainda; proposta separa eventos mecânicos da apresentação e fixa versões/RNG. |
| C28 — História | Drive preserva múltiplas revisões; Git tem apenas criação/atualização de deuses para o catálogo; conversas de aprovação não foram integralmente recuperadas. | Estado de recuperação permanece aberto. Nunca alegar que todas as últimas decisões foram verificadas. |

## Resultados de teste e seu limite

O legado fixado em `6b9b19d` passou em 29 cenários e omitiu sete. A cópia da engine em desenvolvimento com hash registrado em `verificacoes/resultados.json` passou em 34 cenários padrão e deixou dois pendentes; no modo estrito passou em 35 e falhou em um (Nimble). Em execução anterior, Long Range de equipamento também falhava; passou no snapshot posterior por alterações de outra frente. Esta auditoria não corrigiu esses casos.

Os testes atuais exercitam custos, combate, recursos, equipamentos, ETB, zonas, Awaken/Ultimate e vitória, mas não constituem uma prova completa da matriz solicitada nem validação de balanceamento. Um teste aprovado pode refletir uma interpretação de regra ainda pendente; a comparação normativa é indispensável.

## Adendo histórico

As 23 revisões do Drive foram recuperadas. Há dois nomes históricos não presentes na versão atual, Libra Staff e Golden Arrow, que precisam de decisão de equivalência com as fichas atuais. Os Gods também têm versões antigas com números/habilidades diferentes. Todos permanecem arquivados como evidência, sem migração para o catálogo. O estado aberto de recuperação refere-se agora sobretudo a aprovações/conversas, símbolos ausentes e decisões normativas, não a falhas de leitura dessas 23 revisões.
