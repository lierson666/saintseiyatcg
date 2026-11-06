# Glory — sexta família de Armor

Aprovada pelo autor em 06/11/2026 (Artemis V2.0). Regra: guia §26 e §61. Código: `shared/equipment-types.js`, versão 1.1.0.

## O que é

Glory é a armadura dos Anjos Celestes, os guerreiros dos deuses do Olimpo. No jogo eles pertencem à facção Artemis. Glory fica ao lado de Cloth (Athena), Scale (Poseidon), Surplice (Hades), Warplate (Ares) e Moonplate (Artemis).

| Ponto | Glory | Moonplate |
| --- | --- | --- |
| Grupo `ARMOR_FAMILY` | sim | sim |
| Slot de Armor | um, como as outras famílias | um |
| Patentes | **nenhuma** | Crescent, Half, Full, Divine |
| Linha de tipo | `EQUIPMENT — GLORY` / `EQUIPAMENTO — GLÓRIA` | `EQUIPMENT — HALF MOONPLATE` |
| Portadores | os Anjos Celestes | Satélites e guardiões |

## Onde o sistema reconhece Glory

- **Registro** (`shared/equipment-types.js`): `Glory` em `EQUIPMENT_SUBTYPES` com o grupo `ARMOR_FAMILY`. Está em `ARMOR_FAMILY_NAMES` e `ARMOR_SUBTYPE_NAMES`, mas não em `PATENTES_ARMADURA`. Por isso, qualquer `patente_armadura` numa Glory é erro de validação.
- **Engine** (`typeTextIsArmor`): o texto `Equipment — Glory` decide o slot de Armor. A partir daí, jogar, equipar, trocar de portador, não acumular duas armaduras e sair do portador derrotado seguem o mesmo caminho das outras Armors (`shared/canon-cards.js` → `armor`).
- **Regras de custo** (`shared/rules-policy.js`): `ARMOR_SUBTYPES` vem do registro. Glory paga o Casting Cost em Base e o Equip impresso, como as outras Armors (guia §28).
- **Tradução** (`shared/card-i18n.js`, `docs/glossario-pt-br.md`): Glory → Glória, Angel → Anjo, Celestial Warrior → Guerreiro Celestial.
- **Card Forge:** o editor de subtipos lê o registro, e a dica do campo Armor cita Glory. No gerador de arte, Glory é o tipo de objeto `glory` (`art-natures.js`) e tem o perfil `celestial_glory` (`art-direction/artemis-v2.js`). O localizador de cartas tem o filtro Glory.
- **Armor Forge** (`card-forge/armor-model.js`): Glory está na lista de famílias e tem paleta própria, sem o verde da Moonplate.

## Resonance

Cada Glory tem um portador original: Theseus' Glory → Theseus, Icarus' Glory → Icarus (Touma), Odysseus' Glory → Odysseus. O vínculo está registrado no Armor Forge (vínculos com as duas cartas) e no projeto de cada carta.

**Nenhuma Resonance mecânica foi ligada.** Pelo guia §27 e §28, Resonance equipa sem pagar Equip. Isso seria um buff grátis, que o master prompt deixa para uma proposta separada e para o balanceamento. Quando for aprovada, o caminho é preencher `donos` ou `ressonancias` com o `personagem_id` do Anjo (`shared/rules-policy.js` → `resonantWearer`). A comparação é por identidade, não pelo nome exibido, e continua valendo se o Forge mudar legenda, tradução ou título.

## Armor Forge: projetos das três Glories

Ficam em `card-forge/armor-forge/store.json`. Os três estão em **DRAFT**, versão 1, e cada um está ligado à carta da Glory e à do Anjo.

| Projeto | Carta | Portador |
| --- | --- | --- |
| `theseus-glory` | artemis-v6-432 | artemis-v6-431 |
| `icarus-glory` | artemis-v6-434 | artemis-v6-433 |
| `odysseus-glory` | artemis-v6-436 | artemis-v6-435 |

Preenchidos à mão: família Glory, portador, mitologia, entidade, simbolismo e grandeza 4. Asas e armas estão **ausentes** por padrão e só entram depois de conferidas na referência do filme. O resto fica automático até o design ser travado.

Passos para cada Glory, nesta ordem:

1. Registrar a referência canônica (Tenkai-hen Josō Overture).
2. Montar o esquema da armadura.
3. Gerar a ilustração isolada, sem ninguém dentro.
4. Gerar a ficha técnica: vistas frontal, traseira e lateral, detalhes anatômicos, explodida quando couber, materiais, símbolos, cores, regras do elmo, das manoplas, da fixação das placas e das articulações.
5. Gerar a arte do portador vestindo a Glory.
6. Validar o Design Lock.

A regra das manoplas vale para elas como para as outras armaduras: armadura só na base dos dedos e falanges de fora descobertas. Nenhum projeto vira APPROVED ou CANONICAL sem revisão visual do autor.
