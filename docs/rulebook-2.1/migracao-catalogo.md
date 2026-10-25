# Migração do catálogo — Rulebook 2.1

Catálogo auditado: 357 cartas; SHA-256 `a0279e75cb844ad8a77a36e9e1c42d3644f80d6659494949aee6aa3bdc08ea90`. Diff das 41 armaduras aprovado explicitamente pelo autor neste chat e aplicado em 24/10/2026.

## Proposta pronta para aprovação

[Diff integral](catalogo.diff): adiciona categoria Armor e custos explícitos de Equip ressonante (valor impresso atual, padrão 1) / outros (5) em 41 cartas. Preserva IDs, nomes, arte, textos, custos de jogar, programas e demais registros. A engine já aplica a política aprovada sem precisar regravar as 357 cartas. A proposta aprovada tornou os padrões explícitos para futuras revisões.

| ID | Carta | Facção | Owners atuais | Estágios atuais |
| --- | --- | --- | --- | --- |
| athena-021 | Sagittarius Cloth | Athena | não definido | 0 |
| athena-022 | Libra Cloth | Athena | não definido | 0 |
| athena-023 | Aquarius Cloth | Athena | não definido | 0 |
| athena-024 | Leo Cloth | Athena | não definido | 0 |
| athena-025 | Virgo Cloth | Athena | não definido | 0 |
| sst-01-011 | Pegasus Cloth | Athena | pegasus-seiya | 2 |
| sst-01-012 | Dragon Cloth | Athena | dragon-shiryu | 2 |
| sst-01-013 | Cygnus Cloth | Athena | cygnus-hyoga | 2 |
| sst-01-014 | Andromeda Cloth | Athena | andromeda-shun | 2 |
| sst-01-015 | Phoenix Cloth | Athena | phoenix-ikki | 2 |
| sst-01-016 | Virgo Gold Cloth | Athena | virgo-shaka | 2 |
| sst-01-017 | Libra Gold Cloth | Athena | libra-dohko | 2 |
| sst-01-018 | Aries Gold Cloth | Athena | aries-mu | 2 |
| sst-01-019 | Leo Gold Cloth | Athena | leo-aiolia | 2 |
| sst-01-020 | Sagittarius Gold Cloth | Athena | sagittarius-aiolos | 2 |
| sst-02-011 | Sea Dragon Scale | Poseidon | não definido | 1 |
| sst-02-012 | Siren Scale | Poseidon | não definido | 1 |
| sst-02-013 | Seahorse Scale | Poseidon | não definido | 1 |
| sst-02-014 | Scylla Scale | Poseidon | não definido | 1 |
| sst-02-015 | Chrysaor Scale | Poseidon | não definido | 1 |
| sst-02-016 | Kraken Scale | Poseidon | não definido | 1 |
| sst-02-017 | Lymnades Scale | Poseidon | não definido | 1 |
| sst-02-018 | Mermaid Scale | Poseidon | não definido | 1 |
| sst-02-019 | Oceanic Armor | Poseidon | não definido | 1 |
| sst-03-011 | Wyvern Surplice | Hades | não definido | 1 |
| sst-03-012 | Griffon Surplice | Hades | não definido | 1 |
| sst-03-013 | Garuda Surplice | Hades | não definido | 1 |
| sst-03-014 | Gemini Surplice | Hades | não definido | 1 |
| sst-03-015 | Aquarius Surplice | Hades | não definido | 1 |
| sst-03-016 | Capricorn Surplice | Hades | não definido | 1 |
| sst-03-017 | Aries Surplice | Hades | não definido | 1 |
| sst-03-019 | Papillon Surplice | Hades | não definido | 1 |
| sst-03-020 | Sphinx Surplice | Hades | não definido | 1 |
| sst-04-011 | Flame Warplate | Ares | não definido | 1 |
| sst-04-012 | Steel Warplate | Ares | não definido | 1 |
| sst-04-013 | Blood Warplate | Ares | não definido | 1 |
| sst-04-014 | Ash Warplate | Ares | não definido | 1 |
| sst-04-015 | Fury Warplate | Ares | não definido | 1 |
| sst-04-020 | War Champion Armor | Ares | não definido | 1 |
| sst-05-019 | Nightwatch Armor | Artemis | não definido | 1 |
| sst-05-020 | Chosen Moonplate | Artemis | não definido | 1 |

## Living Armor — aprovação adicional em 24/10/2026

HP próprio, dano persistente, Broken sem destruição e Repair aprovados. O autor confirmou suspender **todos os bônus e habilidades concedidos pela Armor** enquanto Broken. Nenhum HP numérico foi gravado: as 41 armaduras continuam com revisão de HP/resistência pendente. Distribuição de dano de combate ainda precisa ser formalizada. Aries Mu terá Repair após revisão de custo/valor, sem remover habilidades existentes. Para V1, a revisão precisa separar a contribuição da armadura na identidade do Devotee.

## Revisões de design que exigem Card Craft

- As armaduras acima não distinguem V1/V2 no nome: revisar individualmente antes de marcar versões. V1 é identidade do Devotee e não será criada como Equipment. Nenhuma carta é removida ou renomeada automaticamente.
- Athena: definir as cinco afinidades Bronze → Gold aprovadas e múltiplos portadores, sem inferir identidades de cartas genéricas. Dados estruturados já aceitam `portadores_ressonantes`, `donos` e `ressonancias` com personagem exato.
- Hades e Ares têm armaduras sem portador designado; enquanto não aprovado, qualquer portador paga o custo alternativo. Não se deduz identidade pelo nome.
- Artemis: Chosen Moonplate já ocupa o slot de armadura, mas ainda usa o subtipo genérico Equipment no catálogo. A engine e o editor reconhecem Armor pelo slot; a reclassificação editorial do subtipo aguarda diff próprio. Moonplate já é suportado como subtipo para novas definições; Silver Mantle e acessórios não são convertidos automaticamente em Armor. Revisar o elenco Satellites sem reclassificar personagens pelo título.
- Até quatro estágios podem ser definidos por carta, com custos e requisitos; não criar automaticamente estágios inexistentes ou todas as versões.
- God Armor / Divine Artifact: categorias editoriais `categoria_conjunto: god_armor | divine_artifact`, `conjunto: vanilla`. Validação conta exatamente uma de cada por facção quando o Card Craft fornecer os dados; dados ausentes são pendências, não cartas inventadas ou limite de deck.
- Origem: `origem_personagem` aceita CANON — KURUMADA, SAINT SEIYA — OUTRAS OBRAS, MITOLOGIA ADAPTADA, ORIGINAL TCG. `referencias_mitologicas` documenta adaptações. Nenhuma atribuição automática a personagens existentes.
- Manter textos legados e arquivos de origem até revisão do autor. Identidades preliminares das outras quatro facções não constituem fechamento do design.

## Aprovação e escrita

A proposta em `catalogo-proposta.json` inclui o hash da fonte; qualquer mudança concorrente exige novo diff. Após aprovação explícita, usar `serve.upsert_card` para gravar somente os registros aprovados. Nunca aplicar esta proposta sobre outra revisão silenciosamente.
