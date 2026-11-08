# Proposta: cartas de Artemis com as staples do verde (EDH)

Status: **aprovada pelo autor em 08/11/2026** e gravada em `data/cards.json`.
Data: 08/11/2026. Fonte: EDHREC, top cards de verde (json.edhrec.com/pages/top/green.json).

Artemis tem 96 cartas: 44 Devotees, 26 Spells, 19 Equipment, 6 Domains e o God.

## 1. Diagnóstico

Artemis já é verde: tem ramp (carta do topo vira Cosmo Base), Devotees de mana, Training counter (+1/+1), fight e bite, além de Devotees grandes de custo 6 e 7. O problema é a repetição dentro desses temas:

| Efeito repetido | Cartas |
| --- | --- |
| "Ao entrar, Training counter em outro aliado" | Lunar Nymph 398, Moon Temple Acolyte 390, Sacred Stag 381, Chandra 371, Silver Arrow Huntress 388 (5) |
| "Derrota em combate → Training counter em si" | Silver Moon Bear 383, Satyr 369, Sacred Hunting Knife 413, Black Satellite Armor 364, Divine Bow 379, Silver Fang Wolf 404 (6) |
| "+ATK ao declarar Strike" | Satellite Bow 409, Odysseus' Glory, Silver Arrow of the Moon, Divine Bow, Royal Huntress, Fourth Moon, Wildwood Stalker 389 (7) |
| Fight/bite (Devotee aliado causa dano igual ao ATK) | 443, 422 (idênticas), 424, 418, Theseus (5) |
| Buscar Devotee no deck | 446, 372, 442 (3) |
| Olhar o topo e pegar Devotee | Celestial Stag 402, Lunar Vision 519, Return of the Goddess 441 (3) |

## 2. Staples do verde e o que falta

| Arquétipo | Staples (EDHREC) | Em Artemis hoje |
| --- | --- | --- |
| Ramp por terreno | Cultivate, Farseek, Rampant Growth, Three Visits | Sim (417, 420, 421, 423) |
| Mana dork | Birds, Llanowar Elves, Elvish Mystic | Sim (386, 397) |
| Base extra por rodada | Exploration, Burgeoning, Azusa | **Não** |
| Mana ao pôr terreno | Lotus Cobra, Tireless Provisioner | Só Domain 524 (ATK) |
| Dobrar marcadores | Hardened Scales, Doubling Season, Ozolith | **Não** |
| Recompra do cemitério | Eternal Witness, Noxious Revival | Só Chloris Armor |
| Terreno do cemitério | Splendid Reclamation, Life from the Loam | **Não** |
| Remoção flexível | Beast Within | **Não** |
| Destruir artefato | Reclamation Sage, Nature's Claim, Krosan Grip | Só modo da 418 |
| Proteção do time | Heroic Intervention, Tyvar's Stand | Só alvo único (445) |
| Fichas | Scute Swarm, Avenger of Zendikar | Só 444 |
| Criatura direto do deck | Green Sun's Zenith, Natural Order, Chord of Calling | **Não** |
| Compra por criatura | Beast Whisperer, Guardian Project | Sim (401, 407, 416) |
| Fight/bite | Ram Through | Sim, demais |
| Pump final | Craterhoof | Sim (449 Wrath of Artemis) |

## 3. Proposta carta a carta (10)

Curva de poder:

- **1–2:** peça de motor.
- **3–4:** motor.
- **5+:** bomba.

Linhas com ⚠️ dependem de uma regra sua (§4).

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 398 Lunar Nymph (1/2) | Training counter em outro | **Moonlit Blessing** — Quando entra, devolva do seu Tartarus para a mão uma carta alvo de custo 3 ou menos. | Eternal Witness |
| 2 | 381 Sacred Stag (1/2) | Training counter em outro | **Forest Blessing** — Você pode pôr uma Cosmo Base adicional em cada rodada sua. | Exploration ⚠️ |
| 2 | 389 Wildwood Stalker (3/2) | +1 ATK ao golpear com marcador | **Ferocious Instinct** — Uma vez por rodada, quando você põe uma Cosmo Base, ganhe {1}{L}. | Lotus Cobra |
| 2 | 388 Silver Arrow Huntress (2/2, Long Range) | Paga {1}{C}: Training counter | **Precise Hunt** — Quando entra, você pode destruir o Equipment alvo. | Reclamation Sage |
| 3 | 390 Moon Temple Acolyte (1/3) | Training counter + mover marcador | **Celestial Cultivation** — Uma vez por rodada, quando um ou mais Training counters seriam postos num Devotee aliado, ponha essa quantidade mais 1. | Hardened Scales ⚠️ |
| 3 | 404 Silver Fang Wolf (3/3) | Lorde de Sacred Beast + marcador | Fica o Pack Leadership. **Call the Pack** — Quando entra, crie um token Wolf Sacred Beast 1/1 para cada outro Sacred Beast seu (máximo 3). | Scute Swarm |
| 3 | 422 The Hunter's Instinct (Technique, era 2) | Fight (igual à 443) | **Predator's Challenge** — Destrua o Devotee ou Equipment alvo. O controlador dele cria um token Forest Guardian 3/3. Vira Moment de custo 3. | Beast Within |
| 3 | 418 The Forest Answers (Technique) | Bite ou destruir Equipment | **Call of the Forest** — Procure no seu deck um Devotee de custo 3 ou menos e ponha-o no Campo de Batalha Unprepared. Embaralhe. | Green Sun's Zenith |
| 3 | 441 The Return of the Goddess (Moment) | Olha 4 e escolhe 1, mais marcador | **Divine Return** — Ponha até 2 cartas do seu Tartarus no seu Cosmo Bank como Cosmo Base Unprepared. | Splendid Reclamation |
| 4 | 372 The Goddess Awakens (Moment) | Busca, mais marcadores | **Divine Emergence** — Até o fim desta rodada, os Devotees aliados ganham @Immune à facção do God inimigo e não podem ser derrotados por dano. | Heroic Intervention ⚠️ |

### Ficam como estão (86)

Ficam o God, os 6 Domains, 38 Devotees, 22 Spells e 19 Equipment. A identidade de Artemis continua a mesma: Satellites, Lunar Guardians, Sacred Beasts, ramp e Training counter.

### Resultado

| Efeito | Antes | Depois |
| --- | --- | --- |
| Marcador ao entrar | 5 | 2 |
| Fight/bite | 5 | 4 |
| Busca/olhar o topo | 6 | 4 |

Entram 10 arquétipos de verde que Artemis não tinha: Exploration, Lotus Cobra, Hardened Scales, Eternal Witness, Splendid Reclamation, Beast Within, Reclamation Sage, Heroic Intervention, Scute Swarm e Green Sun's Zenith.

## 4. Regras que o autor precisa definir

1. **Base adicional (Sacred Stag):** o limite de uma Cosmo Base por rodada (D4) pode ser aumentado por efeito? Proposta: sim, +1 por Stag, e várias cópias não se somam.
2. **Marcador extra (Acolyte):** "seriam postos… ponha mais 1" é substituição, aplicada na hora. Proposta: uma vez por rodada por Acolyte, e várias cópias se somam.
3. **Imune a todos os inimigos (Goddess Awakens):** o @Immune é por facção (§43A). Proposta: "Immune à facção do God inimigo" já cobre o oponente. Cartas neutras não são barradas.
4. **Não ser derrotado por dano:** é a mesma ideia de "indestrutível" do Magic. Proposta: o dano continua marcado, mas não derrota até o fim da rodada; quando a rodada acaba, o dano marcado é verificado de novo.

## 5. Impacto

- Depois do diff aprovado: `data/cards.json` (EN e PT), `playtest/engine-v3/v6/artemis.js` e os testes.
