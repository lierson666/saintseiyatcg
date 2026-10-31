# Athena → Branco (Saints + Enchantress) — diff proposto

Status: **aprovado pelo autor e gravado** (31/10/2026) em `data/cards.json`, `card-forge/art-web/cards.json` e no `engine-v3`. Base: o guia vigente, `docs/meta-premodern.md` e as decisões do autor de 31/10/2026 descritas abaixo.

## 1. Decisões do autor (31/10/2026)

- Os 7 truques defensivos viram **Moment** (instant, pagos com Latent) e custam no máximo 3. A regra de 31/10 continua valendo para as cartas que eram Miracle.
- O Seal fica como papel secundário, **só nos Saints do gelo** (Hyoga, Camus e Freezing Coffin). Em Shaina, Dante e Perseus Silver Cloth, o Seal vira efeito de Branco.
- O motor Enchantress fica nos **Devotees Support** (Star Hill Acolyte e Jamir Cloth Repairer).
- As Spells caras descem para custo 5–6, e Athena's Shield vira o anthem do deck (c4).

Mais duas propostas minhas, inclusas neste diff para você aprovar:
- **The Golden Arrow vira o Swords to Plowshares de Athena.** É a remoção condicional contra atacante prevista no pie.
- **Dois Supports ganham Soul**, como resposta ao aggro.

## 2. Cartas alteradas (20)

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 054 | A Saint Never Surrenders | Technique c3 | **Moment** c3; texto igual | Truque como instant |
| 056 | Protect Saori | Technique c2 | **Moment** c2; texto igual | Idem |
| 058 | Blood of the Dragon | Technique c2 | **Moment** c2; texto igual | Idem |
| 061 | The Call of Athena | Technique c3 | **Moment** c3; texto igual | Idem |
| 076 | Cassios's Sacrifice | Technique c3 | **Moment** c3; texto igual | Idem |
| 079 | Shun's Embrace | Technique c3 | **Moment** c3; texto igual | Idem |
| 081 | The Testament of Aiolos | Technique c4 | **Moment c3**; texto igual | Idem; c3 cabe no teto de Latent |
| 022 | Ophiuchus Shaina | Serpent Constriction: põe Seal | *Serpent Constriction — Once each round, when Ophiuchus Shaina deals Strike damage to an enemy Devotee, that Devotee gets -1 ATK until the end of the round.* Thunder Claw igual | Seal só no gelo |
| 075 | Cerberus Dante | Cerberus Chains: põe Seal | *Cerberus Chains — Once each round, when Cerberus Dante deals Strike damage to an enemy Devotee, that Devotee can't declare a Strike during its controller's next turn.* Three-Headed Assault igual | Seal → Pacifism |
| 069 | Perseus Silver Cloth | Medusa's Curse: põe Seal no atacante | *Medusa's Curse — Once each round, when equipped Devotee survives a Strike as a defender, the Striking Devotee gets -1 ATK until the end of the round.* Resonance igual | Seal só no gelo |
| 043 | Star Hill Acolyte | c2 1/2; ETB olha 2 do topo | Sacred Knowledge igual + *Enchanted Wisdom — Whenever you play a non-Armor Equipment, draw a card. This ability triggers only once per turn.* | Motor Enchantress (Argothian Enchantress) |
| 042 | Jamir Cloth Repairer | c3 1/2; Armor Repair | **c2 1/2**; Armor Repair igual + *Craftsman's Insight — Whenever you play a non-Armor Equipment, draw a card. This ability triggers only once per turn.* | Segundo motor, barato |
| 082 | The Golden Arrow | Technique c5: 4 dano (6 com Seiya); cura 1 | **Moment c1.** *Send target enemy Devotee that declared a Strike this turn to the Void. Its controller's God gains Soul equal to that Devotee's ATK.* | Swords to Plowshares: remoção condicional do Branco |
| 035 | Miho, the Orphanage Caretaker | Kindness: {1}{C}, {T}: remove 1 dano | *Kindness — {1}{C}, {T}: Choose one: Remove 1 damage from target friendly Devotee; or your God gains {1}{S}.* | Soul contra aggro |
| 041 | Sanctuary Healer | Sacred Recovery: remove até 2 | *Sacred Recovery — {1}{C}, {T}: Choose one: Remove up to 2 damage from target friendly Devotee; or your God gains {2}{S}.* | Idem |
| 020 | Athena's Shield | c9; Divine Aegis +0/+1; The Last Miracle; Divine Sanctuary; Miracle | **c4.** Divine Aegis, Divine Sanctuary e Miracle iguais; **The Last Miracle removida** | Anthem jogável; também ativa o motor Enchantress |
| 087 | Seiya Raises Athena's Shield | c7 | **c5**; The Last Hope **removida**; o resto igual | Fim de jogo jogável |
| 088 | The Eighth Sense | c6 | **c5**; The Path to the Underworld **removida**; o resto igual | Idem |
| 089 | The Wall of Lamentation | c9; sacrifica até três | **c6**; *defeat up to **two** friendly Saints*; o resto igual | Idem |
| 090 | The Will of Athena | c10; três Saints +3/+3 | **c6**; *Each gets **+2 ATK / +2 HP***; o resto igual | Idem |

Mantidas sem mudança: as outras 72 (Hyoga, Camus e Freezing Coffin continuam com Seal), o God e os Domains.

## 3. Efeito no total (estimativa)

| Papel | Atual | Proposto |
| --- | --- | --- |
| Moments (instant) | 3 | 11 (7 truques + 082) |
| Seal | 6 cartas | 3 (gelo) + 4 que leem Seal |
| Motor de compra por Equipment | 0 | 2 |
| Remoção barata contra atacante | 0 | 1 (082, c1) |
| Ganho de Soul em Devotee | 0 | 2 |
| Spells de custo ≥ 7 | 4 | 0 |

## 4. Lista de referência — Athena Saints (máx. 3 cópias)

God **ATHENA** · Domain **GALAXIAN WARS ARENA** (062)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Custo 2 | 028 Unicorn Jabu ×3 · 031 Wolf Nachi ×3 · 032 Lionet Ban ×3 · 030 Hydra Ichi ×2 · 034 Tatsumi ×2 · 040 Sanctuary Guard ×2 | 15 |
| Custo 3+ | 029 Bear Geki ×3 · 001 Pegasus Seiya ×2 · 003 Dragon Shiryu ×2 · 007 Andromeda Shun ×2 · 021 Eagle Marin ×2 · 041 Sanctuary Healer ×2 · 015 Leo Aiolia ×1 | 14 |
| Equipment | 020 Athena's Shield ×2 · 048 Libra Sword ×2 · 051 Sanctuary Torch ×2 | 6 |
| Remoção e proteção (Moment) | 082 The Golden Arrow ×3 · 056 Protect Saori ×3 · 079 Shun's Embrace ×2 · 076 Cassios's Sacrifice ×2 · 061 The Call of Athena ×2 · 058 Blood of the Dragon ×2 · 081 The Testament of Aiolos ×2 | 16 |
| Pump e valor | 053 The First Burn of Cosmo ×3 · 052 The Galaxian Wars ×3 · 060 The Training of Pegasus ×2 · 083 The Twelve Flames ×1 | 9 |
| **Total** | | **60** |

A lista Enchantress (God Athena + Domain Artemis) fica para a etapa das duplas.

## 5. Depois da aprovação

1. Gravar as 20 cartas em `data/cards.json` e em `card-forge/art-web/cards.json`.
2. Motor: `athena-spells.js` (082 novo, 089/090), `athena-devotees.js` (022, 035, 041, 042, 043, 075) e `athena-gear.js` (020, 069). Testes em `tools/test-engine-v3-v6-athena-*.mjs`.
3. Deck “Athena Saints” em `data/alpha-0.1/decks-competitivos.json`.
4. Changelog e commit.
