# Proposta: cartas de Athena com as staples do branco (EDH)

Status: **aprovada pelo autor em 08/11/2026** e gravada em `data/cards.json`.
Data: 08/11/2026. Fonte: EDHREC, top cards de branco (json.edhrec.com/pages/top/white.json).

Athena tem 96 cartas: 37 Devotees, 28 Spells, 24 Equipment, 6 Domains e o God.

## 1. Diagnóstico

Athena já é branca: tem prevenção de dano, cura, Guardian, buff de time e o Golden Arrow (que faz o papel do Swords to Plowshares). O problema é a repetição:

| Efeito repetido | Cartas |
| --- | --- |
| Prevenir dano de Strike | 003, 004, 011, 023, 027, 037, 044, 045, 056, 058, 068, 072, 079, 520 (14) |
| +ATK por Spell | 052, 053, 055, 058, 061, 077, 081, 083, 086, 088, 090, 507 (12) |
| −ATK no Strike | 022, 030, 033, 046, 067, 069, 073, 074 (8) |
| Tirar dano (cura) | 011, 041, 042, 050, 059, 063, 070 (7) |
| "Se seria derrotado por dano de Strike, previna" | 054 e 076 (iguais) |

## 2. Staples do branco e o que falta

| Arquétipo | Staples (EDHREC) | Em Athena hoje |
| --- | --- | --- |
| Remoção barata com troco | Swords to Plowshares, Path to Exile | Sim (082 Golden Arrow) |
| Varredura modal | Austere Command, Farewell, Wrath of God | Só "derrote tudo" (084) |
| Time indestrutível | Flawless Maneuver, Selfless Spirit, Teferi's Protection | **Não** |
| Proteção de um Devotee | Mother of Runes | **Não** |
| Imposto de ataque | Ghostly Prison, Sphere of Safety | Só −1 ATK (520) |
| Travar o oponente | Grand Abolisher, Drannith Magistrate | **Não** |
| Ganho por entrada | Soul Warden | **Não** |
| Compra por Devotee pequeno | Mentor of the Meek | **Não** |
| Recursão para o campo | Sun Titan, Sevinne's Reclamation | Só Phoenix (080) |
| Catch-up de Base | Land Tax, Knight of the White Orchid | **Não** |
| Imposto que dá recurso | Smothering Tithe | **Não** |
| Blink | Ephemerate, Cloudshift | **Não** |
| Fichas | Elspeth, Adeline | **Não** |
| Buff de time final | Akroma's Will | Só +ATK em 1–3 Saints |
| Devolver Spell à mão | Reprieve | **Não** |
| Tutor de Equipment | Enlightened Tutor, Open the Armory | Sim (026 Kiki) |
| Compra por Spell inimiga | Esper Sentinel | Sim (051 Sanctuary Torch) |

## 3. Proposta carta a carta (15)

Linhas com ⚠️ dependem de uma regra sua (§4).

### Devotees (8)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 030 Hydra Ichi (1/3) | −1 ATK | **Hydra's Vitality** — Sempre que outro Devotee aliado entra no Campo de Batalha, seu God ganha {1}{S}. | Soul Warden |
| 2 | 027 Cassios (2/3) | Se sacrifica e previne 3 | **Final Sacrifice** — Derrote Cassios: até o fim do Round, os Devotees aliados não podem ser derrotados por dano. | Selfless Spirit |
| 2 | 034 Tatsumi (1/3, Guardian) | +2 HP com pouca Soul | Fica Guardian. **Loyal Servant** — Seus oponentes só podem jogar cartas da mão. | Drannith Magistrate ⚠️ |
| 2 | 040 Sanctuary Guard (1/3, Guardian) | Só Guardian | Fica Guardian. **Watchful Eye** — Sempre que outro Devotee aliado com ATK 2 ou menos entra, você pode pagar {1}{C} para comprar 1 carta. | Mentor of the Meek |
| 3 | 033 Chameleon June (1/4) | −1 ATK (fica a Ressonância com Shun) | **Chameleon Whip** — {T}: o Devotee aliado alvo ganha @Immune à facção do God inimigo até o fim do Round. | Mother of Runes |
| 3 | 039 Guilty (3/2) | Dano no aliado e +1 ATK | **Master's Silence** — Durante a sua rodada, seus oponentes não podem conjurar Moments nem Techniques. | Grand Abolisher ⚠️ |
| 3 | 041 Sanctuary Healer (0/3) | Cura 2 ou Soul | **Sanctuary Supplies** — Quando entra, se um oponente tem mais Cosmo Bases que você, ponha a carta do topo do seu deck no Cosmo Bank como Base Unprepared. | Knight of the White Orchid |
| 5 | 025 Lyra Orphee (2/4) | Escudo de HP; Death Trip (sai) | Fica String Nocturne. **Death Trip Serenade** — Quando entra e sempre que declara Strike, devolva do seu Tartarus ao Campo de Batalha o Devotee ou Equipment alvo de custo 3 ou menos. | Sun Titan |

### Equipment (1)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 045 Dragon Shield (Artifact) | Previne 1 | **Dragon's Tithe** — Sempre que um oponente compra uma carta, ganhe {1}{L}, a menos que ele pague {1}{C}. | Smothering Tithe |

### Spells (5)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 058 Blood of the Dragon (Moment) | +2 HP | Devolva à mão do dono o Moment ou Technique inimigo alvo na pilha. Compre 1 carta. | Reprieve |
| 3 | 052 The Galaxian Wars (Moment) | +1 ATK em 2 Bronze | Crie 2 tokens Sanctuary Soldier 1/1. Se você controla 3 ou mais Bronze Saints, compre 1 carta. | Elspeth / Adeline |
| 3 | 076 Cassios's Sacrifice (Moment) | Igual à 054 | O Devotee aliado alvo sai e volta ao Campo de Batalha (blink, §58). | Ephemerate |
| 4 | 061 The Call of Athena (Moment, era 3) | +2 ATK ou prevenção | Os Devotees aliados ganham +2 ATK e @Nimble até o fim do Round. Se você controla um Gold Saint, eles também ganham @Immune à facção do God inimigo. | Akroma's Will |
| 6 | 084 Athena's Final Decree (era 5) | Derrota todos os Devotees | Escolha dois: derrote todos os Devotees de custo 3 ou menos; derrote todos os de custo 4 ou mais; destrua todos os Equipment. | Austere Command |

### Domain (1)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 3 | 520 The Sanctuary Gates | −1 ATK no primeiro Strike | **Sacred Threshold** — Devotees inimigos só declaram Strike contra o seu God se o controlador pagar {1}{C} por Devotee. (Fica a Ressonância.) | Ghostly Prison ⚠️ |

### Resultado

| Efeito | Antes | Depois |
| --- | --- | --- |
| Prevenir dano de Strike | 14 | 12 |
| +ATK por Spell | 12 | 10 (1 vira buff de time) |
| −ATK no Strike | 8 | 6 |
| Cura | 7 | 6 |

Entram 13 arquétipos de branco que Athena não tinha.

## 4. Regras que o autor precisa definir

1. **Só jogar da mão (Tatsumi 034):** o que conta como "fora da mão"? Proposta: Void, Tartarus e Hidden Cosmo (jogar da própria Base). Afterlife não é jogar carta, então continua.
2. **Travar Spells na sua rodada (Guilty 039):** proposta: trava só Moments e Techniques. Habilidades ativadas, Divine Powers e Commands continuam.
3. **Ghostly Prison (520):** é o mesmo imposto do Coral Reef Defender de Poseidon (Propaganda). Proposta: deixar nos dois. No Magic, Propaganda é azul e Ghostly Prison é branco. Os impostos se somam.
4. **Sun Titan (025):** um Equipment devolvido entra solto. Proposta: entra sem portador; depois paga Equip normal.

## 5. Impacto

- Depois do diff aprovado: `data/cards.json` (EN e PT), `playtest/engine-v3/v6/athena-*.js` e os testes.
- Cassios e Selfless Spirit usam a regra "não pode ser derrotado por dano" (§58), e Mother of Runes usa "@Immune à facção do God inimigo", as duas já aprovadas para Artemis.
