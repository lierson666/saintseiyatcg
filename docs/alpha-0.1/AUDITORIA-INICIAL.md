# Alpha 0.1 — auditoria inicial (28/10/2026)

Rascunho de trabalho. Nada aqui cria regra.

## Fonte canônica lida

- Pasta MASTER D268 no Drive. O índice e o documento 04, com JSON estruturado, foram lidos.
- O JSON é válido: 90 cartas Athena V6 + 5 Gods = 95 registros, mais 77 decisões (D192–D268). D269 consta apenas como proposta.
- `original_sha256` confere com o `original_text` em todos os 95 registros.
- Em 40 registros, `approved_current_text_as_of_d268` difere do original: 007, 009, 011, 020, 023, 024, 025, 037, 042, 045, 046, 050, 052, 054, 055, 056, 058, 059, 061, 062, 063, 064, 065, 068, 073, 076, 077, 079, 080, 081, 083, 086, 087, 088, 089, 090, além dos Gods Athena, Poseidon, Hades e Ares.
- 019 Pegasus God Cloth (Kamui) existe e está marcada como congelada.
- O hash SHA-256 do arquivo fonte original (`0a7efc12…21c7`) não pode ser verificado com o documento 04, que é uma projeção, não o arquivo fonte.

## Lacuna bloqueante

- A D204 depende de D52, D60–D63, D186, D187 e D191, que não estão no pacote.
- O Handbook 3.0 (`docs/handbook-3.0/HANDBOOK-3.0.md`) ainda lista como pendentes: mão inicial, compras, preparação, limite de Cosmo Base por turno, Latent, restrições de Strike e efeitos de início e fim.
- O autor vai enviar D1–D191 (resposta de 28/10/2026). A engine 3.0 só começa depois disso.

## Repositório

- O branch atual é `codex/arena-experience-v3`, com muitas mudanças não commitadas de outras sessões.
- `data/cards.json` na árvore de trabalho já tem 95 cartas V6, sem commit. No `HEAD`, são as 357 antigas.
- A engine é `playtest/engine-v2.js`, versão `rulesVersion: '2.2'`: rodadas com ações alternadas e prioridade. Não existe turno completo nem END TURN da 3.0.
- Testes Node (`tools/test-*.mjs`): a maioria falha na árvore atual, porque as fixtures usam IDs do catálogo antigo de 357 cartas.

## Decks escolhidos (aprovado pelo autor em 28/10/2026)

As duas listas abaixo são experimentais, não decks aprovados.

- Pegasus Rush = `rulebook2-athena` "PEGASUS SEIYA — Never Surrender": 60 cartas, Domain 062 fora do deck, inclui 1× 019 e 1× 087 (Sacred).
- Dragon Fortress = `rulebook2-shiryu` "DRAGON SHIRYU — The Unbreakable Shield": 60 cartas, Domain 064 fora do deck.
- Os IDs dos dois decks existem no D268, nenhuma carta passa de 4 cópias e nenhum Domain está dentro do deck.
