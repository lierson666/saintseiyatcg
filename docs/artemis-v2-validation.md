# Artemis V2.0 — validação (06/11/2026)

## Testes da expansão

```bash
node --test tools/test-artemis-v2.mjs            # 8 pass, 0 fail
node --test tools/test-engine-v3-v6-artemis.mjs  # 27 pass, 0 fail (5 novos da V2.0)
node --test tools/test-equipment-types.mjs       # 14 pass, 0 fail (seis famílias)
```

**`tools/test-artemis-v2.mjs` cobre:**

- 529 cartas, ids únicos e mesma ordem do commit `61db6e8`; Artemis com 96.
- Nomes, subtipo Angel, atributos e keywords dos três Anjos; nenhuma menção a Satellite.
- Glories com subtipo Glory, custos 3/4/3, Equip 2, sem patente e sem erro de subtipo; linha `EQUIPMENT — GLORY`.
- Glory como família de Armor sem patentes: Divine é recusada e `typeTextIsArmor` reconhece Glory.
- Tradução: Glória, Anjo e Guerreiro Celestial; `EQUIPAMENTO — GLÓRIA` e `DEVOTO — ANJO — GUERREIRO CELESTIAL`.
- Perfil de arte escolhido pela carta: Anjo, Glory, La Scoumoune, Calisto, o God; Athena não recebe perfil.
- Prompt sem asas obrigatórias (asas por padrão vão ao negativo), Glory fora da Moonplate e sem o verde da Moonplate no Armor Forge.
- Projetos das três Glories no Armor Forge em DRAFT e ligados às cartas.

**Engine (`tools/test-engine-v3-v6-artemis.mjs`):**

- **431:** buff só em outros Angels; Satellite fora do bônus e do alvo.
- **433:** Pierce, dano de entrada e crescimento pela Cosmo Bank.
- **435:** +1/+0 só para Angel e compra ao derrotar.
- **Glory:** é Armor e ocupa o slot. A segunda Glory no mesmo portador tira a primeira. A Glory fica sem portador quando ele cai.
- **436:** +2/+0 e compra.
- **Teste 435 antigo (fight):** só mudou de nome.

## Regressão (todos os `tools/test-*.mjs`)

70 arquivos: 63 sem falha, 7 com falha. Nenhuma das 7 vem desta mudança. As mensagens citam cartas e telas fora de Artemis e Glory, e não houve mudança nos arquivos que elas leem.

| Arquivo | Falha | Causa |
| --- | --- | --- |
| `test-presentation`, `test-rules-v2`, `test-rules-v21`, `test-star-hill-editors` (2) | `rulebook2-athena: Escolha um Domain; Carta ausente: sst-01-001…` | Os decks do Rulebook 2 citam cartas `sst-01-*`, que não estão no catálogo de 529 |
| `test-card-presentation` (2) | `/7th Sense/`; blocos de Owner/Evolve | Texto de apresentação de cartas de Athena |
| `test-divine-director` (3) | `P06: ação comum só com a janela fechada e a cadeia vazia` | Diretor de animação (Pegasus 001) |
| `test-layout-studio` (2) | `sceneSVG(scene).includes('Gemini Saga')`; contexto de mão | Layout Studio com cartas de Athena |

Os testes de navegador em Python (Playwright) não foram rodados.

## Não verificado

- O campo **Perfil Artemis V2** no diálogo do gerador de arte, aberto no navegador. O Card Forge e o Armor Forge abrem sem erro no console; o Armor Forge lista os três projetos Glory e a família Glory no seletor.
- Uma partida completa com os Anjos na arena.
- Winrate e balanceamento.
