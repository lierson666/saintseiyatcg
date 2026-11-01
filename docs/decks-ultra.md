# Decks Ultra: 10 arquétipos competitivos

Status: montados e medidos em 01/11/2026. Arquétipos aprovados pelo autor antes da montagem; as listas ainda não foram jogadas por humanos. Não cria regra. Dados: `data/alpha-0.1/decks-ultra.json`. Fora do lobby e não publicados.

## Como ler os números

- **Listas de Aggro, Combo, Ramp e Voltron mudaram depois desta medição (draw engines, 01/11/2026); os números abaixo são das listas e cartas antigas.**
- Medição IA × IA, regra anterior à compra de 1 (changelog, 01/11/2026): 50 cartas, compra de 2, limite de 7 na mão, só quem começa não compra no 1º turno. Primeiro jogador alternado (a simulação não sorteia a moeda).
- 40 partidas por confronto, 360 por deck em cada nível. Margem de cerca de ±5 pontos no winrate por deck e de ±15 pontos em cada confronto.
- **Os dois níveis medem coisas diferentes.** `hard` só faz a jogada que melhora Soul, mesa ou mão na avaliação da IA. `normal` joga as cartas em ordem de custo. Por isso os decks trocam de posição entre eles.

**Limites da IA (`playtest/divine/ai.js`), que subestimam parte dos decks:**

1. Ataca o God sempre que for legal; subestima controle e combo e não reproduz o jogo humano.
2. Nunca ativa habilidade {T} de Devotee ou Equipment. Sem efeito na medição: Moonlit Initiate, Dryad, Golden Triangle, Stardust Revolution, Freezing Coffin do Camus.
3. No `hard`, Seal e Base extra não contam na avaliação. Essas jogadas só saem se trouxerem outro ganho.
4. Athena Exclamation e o pagamento do Divine Judgment seguem regra fixa, fora da avaliação do `hard`. Essa regra é simples e não planeja o trio com antecedência.

## Resultado

| Deck | God / Domain | `hard` | `normal` | vs 8 decks antigos (`hard`) | Vence por (`hard`) |
| --- | --- | --- | --- | --- | --- |
| **Aggro**: Crimson Sligh | Ares / THE ARENA OF BLOOD | 52% | 66% | 63% | Soul 186 |
| **Tempo**: Marina Tide | Poseidon / THE NORTH ATLANTIC PILLAR | 56% | 45% | 66% | Soul 118, deck vazio 82 |
| **Midrange**: Judgment of Elysion | Hades / ELYSION | 53% | 56% | 83% | Soul 189 |
| **Control**: Silent Sanctuary | Poseidon / THE UNDERSEA SANCTUARY | 60% | 44% | 61% | deck vazio 158, Soul 58 |
| **Combo**: Twelve Temples Exclamation | Athena / THE NIGHT VALE | 43% | 49% | 61% | Soul 155 |
| **Reanimator**: Return from the Deep | Hades / THE NORTH ATLANTIC PILLAR | 52% | 49% | 76% | Soul 187 |
| **Mill**: The Abyssal Clock | Poseidon / THE ABYSSAL TRENCH | 70% | 35% | 68% | deck vazio 245, Soul 7 |
| **Stax/Lock**: The First Prison | Hades / THE FIRST PRISON | 49% | 49% | 71% | Soul 175 |
| **Voltron**: The Silver Arrow | Artemis / THE LUNAR HUNTING GROUNDS | 24% | 49% | 43% | Soul 86 |
| **Ramp**: Primordial Moon | Artemis / THE SACRED FOREST | 43% | 58% | 63% | Soul 154 |

Primeiro jogador vence 74% no `hard` e 79% no `normal`. Mediana de 8 e 7 rounds. Rodada mista com os 8 decks antigos: 10 partidas por confronto, primeiro jogador 75%.

Os 8 decks antigos vencem de 24% a 52% contra os ultra; só Marina Tempest fica acima de 50%.

Medição feita depois dos nerfs de Artemis e da mudança de custo do Moment (commit 2978ff2, de outra sessão), que derrubaram Voltron e Ramp, do limite de mão 7 e do custo novo de quatro Golds (`docs/custo-golds-2026-11-01/cards.diff.md`).

## O que a medição mostra

- **Great Flood parece pesar demais.** Nas partidas em que o Ultimate resolve, Poseidon vence de 90% a 100% (Tempo, Control e Mill, nos dois níveis). É correlação: ele custa 8 e pode sair em mesa já ganha. A IA dispara com 2+ Devotees inimigos, e o texto mila 3 cartas por carta descartada, num deck de 50. Control e Tempo vencem muito por deck vazio sem serem deck de mill; não isolei quanto disso vem do Flood. Vale testar partidas sem o Ultimate.
- **Vantagem de quem começa está alta** (74–79%, meta de `docs/meta-premodern.md`: abaixo de 55%). A medição anterior, com outros decks, deu 74,6%. A simulação alterna quem começa, então a moeda não muda este número.
- **Combo passou da meta de 45% no `normal` e ficou 2 pontos abaixo no `hard`**, dentro da margem (seção seguinte). Na maioria das vitórias a Exclamation nem dispara; o deck vence como midrange.
- **Voltron oscila**: 49% no `normal` e 24% no `hard`, o pior número do relatório. Não investiguei a causa.
- **Metas do meta-premodern não foram atingidas**: há confrontos fora de 40–60% e winrates fora de 45–55%. Estas listas buscam força, não equilíbrio.

## Combo: o que foi testado

Sabatina com o autor em 01/11/2026. Meta: 45% nos dois níveis. Resultado: 43% no `hard` e 49% no `normal`, partindo de 21% e 39%. A Exclamation dispara em 9% e 23% das partidas.

| Teste | Resultado (`hard` / `normal`) | Decisão |
| --- | --- | --- |
| IA dispara se for letal, se o adversário tiver menos de 3 Devotees, ou no Round 6+; e paga o Judgment no último Round do prazo | 21% / 35%. Vitórias por Judgment no `normal`: de 24 para 1 | Fica: número honesto |
| Splash de ramp Artemis e trio Gold + Silver | Cerca de 34% / 38% | Fica, com o ajuste abaixo |
| Regra: Latent também paga a Exclamation | Sem ganho: 32% / 39% com ela, 34% / 43% sem | **Descartada. A regra não muda** |
| IA dispara a partir do Round 4 | Sem diferença mensurável | Descartada |
| IA guarda Saints: não vira Base e não entra em Strike que o mata | 34% / 39%: sem efeito | Revertida |
| Mais cartas baratas com Cosmoble que não são Saint | 41% / 39% contra 32% / 39%, na mesma rodada | Fica: é a lista atual |
| Diff de cartas: Aiolia, Camus e Mu 5 → 4, Saga 6 → 5 | 43% / 49% contra 40% / 42% na rodada anterior | **Aprovado pelo autor e gravado** |

**Causa medida:** em 7 rounds, a lista anterior punha cerca de 3 Saints como Base, porque quase todo o Cosmoble dela era Silver. Com 2 Golds e Silvers de custo 3–4, o trio raramente fica junto e Prepared.

**Efeito do diff em outros decks de Athena:** vale para todos. Contra os ultra no `hard`, Cloth Voltron foi de 27% para 30% e Bronze Brotherhood de 23% para 24%, dentro da margem. Falta playtest humano.

## Mudanças em relação à tabela aprovada

| Deck | Aprovado | Final | Motivo medido |
| --- | --- | --- | --- |
| Stax/Lock | Athena + Seal, Domain Arctic Ocean Pillar | **Hades, First Prison** (discard: The Rack/Pox) | Arctic Ocean Pillar não tem efeito na engine. Contra ultra + antigos (`hard` / `normal`): Athena 24% / 39%; Poseidon 46% / 39%; Hades 61% / 52% |
| Reanimator | Gates of the Underworld | **North Atlantic Pillar** com 10 cartas Poseidon | Contra ultra + antigos: splash 67% / 56%; mono 61% / 51%, dentro da margem |
| Combo | Stairway, mono Athena, 3 Golds | **The Night Vale** com 12 cartas Artemis, trio Gold + Silver | Ver "Combo: o que foi testado" |
| Ramp | Devotees de mana | **Sem Devotees de mana**: Initiate, Dryad, Shaman e Amulet saíram | A IA não os ativa. No `hard`, 29% no 1º round-robin e 57% depois da troca; 43% após os nerfs de Artemis (as outras listas também mudaram). Com piloto humano, testar a versão com eles |

Hades ficou com 3 decks, Poseidon com 3, Artemis com 2, Ares e Athena com 1.

## Matchups

`hard` (linha vence coluna):

| vence → | Aggro | Tempo | Midrange | Control | Combo | Reanimator | Mill | Stax | Voltron | Ramp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Aggro** | · | 65% | 38% | 48% | 55% | 28% | 45% | 38% | 83% | 68% |
| **Tempo** | 35% | · | 43% | 65% | 63% | 53% | 40% | 50% | 90% | 63% |
| **Midrange** | 63% | 58% | · | 40% | 43% | 50% | 33% | 60% | 80% | 48% |
| **Control** | 53% | 35% | 60% | · | 68% | 73% | 50% | 55% | 80% | 68% |
| **Combo** | 45% | 38% | 58% | 33% | · | 30% | 23% | 48% | 70% | 45% |
| **Reanimator** | 73% | 48% | 50% | 28% | 70% | · | 23% | 50% | 68% | 60% |
| **Mill** | 55% | 60% | 68% | 50% | 78% | 78% | · | 83% | 85% | 75% |
| **Stax** | 63% | 50% | 40% | 45% | 53% | 50% | 18% | · | 65% | 55% |
| **Voltron** | 18% | 10% | 20% | 20% | 30% | 33% | 15% | 35% | · | 35% |
| **Ramp** | 33% | 38% | 53% | 33% | 55% | 40% | 25% | 45% | 65% | · |

`normal`:

| vence → | Aggro | Tempo | Midrange | Control | Combo | Reanimator | Mill | Stax | Voltron | Ramp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Aggro** | · | 53% | 45% | 80% | 55% | 75% | 90% | 58% | 68% | 68% |
| **Tempo** | 48% | · | 33% | 48% | 53% | 38% | 65% | 43% | 48% | 33% |
| **Midrange** | 55% | 68% | · | 53% | 50% | 58% | 55% | 58% | 60% | 45% |
| **Control** | 20% | 53% | 48% | · | 50% | 65% | 35% | 53% | 38% | 40% |
| **Combo** | 45% | 48% | 50% | 50% | · | 43% | 63% | 43% | 60% | 43% |
| **Reanimator** | 25% | 63% | 43% | 35% | 58% | · | 65% | 53% | 45% | 53% |
| **Mill** | 10% | 35% | 45% | 65% | 38% | 35% | · | 48% | 20% | 23% |
| **Stax** | 43% | 58% | 43% | 48% | 58% | 48% | 53% | · | 53% | 43% |
| **Voltron** | 33% | 53% | 40% | 63% | 40% | 55% | 80% | 48% | · | 35% |
| **Ramp** | 33% | 68% | 55% | 60% | 58% | 48% | 78% | 58% | 65% | · |

## Planos e listas

### Aggro: Crimson Sligh

Ares / THE ARENA OF BLOOD. Referência: Sligh.

Curva 1-2-3 com Impulse; burn abre caminho e Bloody Rain fecha.

- **Devotee (34):** 3 FRENZIED SWORDSMAN, 3 WARBOUND SOLDIER, 2 BLOOD OATH WARRIOR, 3 DISASTER LEGION BERSERKER, 3 BLOODTHIRSTY BERSERKER, 2 RED FIRE LEGION BERSERKER, 3 FLAME LEGION BERSERKER, 3 DISASTER WING ASSASSIN, 3 RED FIRE LEGION RAIDER, 2 ARIONTE OF ANFISTA, 2 ISEU OF PYTHON, 2 MERCILESS SPEARMAN, 2 BERSERKER CHAMPION, 1 ETHON ALCMENES
- **Equipment (2):** 2 SPEAR OF THE FALLEN
- **Spell (14):** 3 FIRST BLOOD, 3 SPARK OF WAR, 3 FURY OF ARES, 2 RAIN OF SPEARS, 3 THE BLOODY RAIN

### Tempo: Marina Tide

Poseidon / THE NORTH ATLANTIC PILLAR. Referência: Merfolk.

Marinas baratas e lordes (Herald, Standard Bearer); bounce no turno do ataque tira o bloqueador e ganha o turno.

- **Devotee (33):** 3 MARINA SPEARMAN, 3 OCEAN CURRENT SCOUT, 3 ATLANTEAN ACOLYTE, 2 OCEAN TEMPLE GUARD, 3 MARINA VANGUARD, 3 TIDAL ASSAILANT, 3 HERALD OF THE SEVEN SEAS, 3 MARINA STANDARD BEARER, 2 DEEP SEA HUNTER, 2 ROYAL TRIDENT GUARD, 1 ATLANTEAN TRIDENT MASTER, 1 SIREN SORRENTO, 2 SEAHORSE BAIAN, 2 SEA DRAGON KANON
- **Equipment (2):** 2 CRACKED MARINA SCALE
- **Spell (15):** 3 UNDERTOW, 3 TIDAL VETO, 3 BENEATH THE SURFACE, 3 THE RISING TIDE, 3 MARINE WHIRLWIND

### Midrange: Judgment of Elysion

Hades / ELYSION. Referência: Mono-Black.

Discard cedo, remoção dura e Specters com valor na entrada; Elysion encolhe o bloqueador todo turno.

- **Devotee (29):** 3 DULLAHAN CUBE, 2 STYX SOUL HERDER, 3 ALRAUNE QUEEN, 2 GORGON OX, 2 HADES' ROYAL GUARD, 3 HARPY VALENTINE, 3 BALRON LUNE, 3 LYCAON PHLEGYAS, 2 CANCER DEATHMASK, 2 PISCES APHRODITE, THE RESURRECTED SAINT, 2 WYVERN RHADAMANTHYS, 1 CAPRICORN SHURA, THE RESURRECTED SAINT, 1 AQUARIUS CAMUS
- **Spell (21):** 3 TOUCH OF DEATH, 3 THE WHISPERS OF PANDORA, 2 RETURN FROM THE DARKNESS, 2 THE TRIAL OF THE DEAD, 2 THE FERRYMAN'S PRICE, 3 PACT OF THE UNDERWORLD, 3 DIVINE TOUCH OF DEATH, 2 SOULS OF THE DAMNED, 1 THE DESTRUCTION OF THE GOLD CLOTHS

### Control: Silent Sanctuary

Poseidon / THE UNDERSEA SANCTUARY. Referência: Mono-U Draw-Go.

Guarda Latent para counters, compra no turno dele e fecha com Kanon e Great Flood.

- **Devotee (24):** 3 ATLANTEAN ACOLYTE, 3 OCEAN CURRENT SCOUT, 3 OCEAN TEMPLE GUARD, 3 ATLANTEAN SENTINEL, 2 CORAL REEF DEFENDER, 1 DEEP SEA HUNTER, 3 ROYAL TRIDENT GUARD, 2 ANCIENT SEA GUARDIAN, 2 SEAHORSE BAIAN, 2 SEA DRAGON KANON
- **Spell (26):** 3 TIDAL VETO, 3 BENEATH THE SURFACE, 3 UNDERTOW, 3 CALL OF THE OCEAN, 3 THE SEA NEVER FORGIVES, 3 THE AWAKENING OF ATLANTIS, 3 THE SEA DRAGON'S COMMAND, 2 THE RISING TIDE, 2 THE FIRST GREAT STORM, 1 THE GREAT FLOOD

### Combo: Twelve Temples Exclamation

Athena / THE NIGHT VALE. Referência: Trix.

Cartas baratas com Cosmoble viram Base para os Saints ficarem na mão; Forest Invades e Nature's Awakening aceleram, First Sacred Hunt e Golden Arrow limpam a mesa. Com 3 Saints Prepared, Athena Exclamation tira ATK + 3 por Gold e deixa Divine Judgment. Domain Artemis só pelo splash, sem Ressonância.

- **Devotee (26):** 3 SANCTUARY GUARD, 2 TATSUMI, SAORI’S GUARDIAN, 3 STAR HILL ACOLYTE, 3 CENTAUR BABEL, 3 OPHIUCHUS SHAINA, 2 LEO AIOLIA, 2 AQUARIUS CAMUS, 1 ARIES MU, 2 CERBERUS DANTE, 2 PERSEUS ALGOL, 2 WHALE MOSES, 1 GEMINI SAGA
- **Spell (24):** 3 ATHENA'S AEGIS, 3 THE GOLDEN ARROW, 3 WILD VIGOR, 3 SANCTUARY'S JUDGMENT, 3 PROTECT SAORI, 3 NATURE'S AWAKENING, 3 THE FIRST SACRED HUNT, 3 THE FOREST INVADES SANCTUARY

### Reanimator: Return from the Deep

Hades / THE NORTH ATLANTIC PILLAR. Referência: Reanimator.

Markino, Wandering Soul, Styx e Abyssal Watcher enchem o Tartarus; Return from Death e Resurrection trazem Thanatos, Hypnos e Wyvern cedo; Undertow compra o tempo. Domain Poseidon só pelo splash, sem Ressonância.

- **Devotee (32):** 3 WANDERING SOUL, 3 SKELETON MARKINO, 3 STYX SOUL HERDER, 3 DULLAHAN CUBE, 3 ABYSSAL WATCHER, 3 ATLANTEAN ACOLYTE, 2 ACHERON CHARON, 2 HADES' ROYAL GUARD, 2 ALRAUNE QUEEN, 2 WYVERN RHADAMANTHYS, 3 ARIES SHION, THE RESURRECTED SAINT, 2 THANATOS, GOD OF DEATH, 1 HYPNOS, GOD OF SLEEP
- **Spell (18):** 2 RETURN FROM THE DARKNESS, 3 TOUCH OF DEATH, 1 BENEATH THE SURFACE, 3 UNDERTOW, 2 THE FERRYMAN'S PRICE, 2 THE RETURN FROM DEATH, 2 THE AWAKENING OF THE SPECTERS, 3 THE RESURRECTION OF THE FALLEN

### Mill: The Abyssal Clock

Poseidon / THE ABYSSAL TRENCH. Referência: Turbo Mill.

Cada Seal mila 2 pela Trench; a Ressonância mila 3 por turno; Deluge e Fall of Atlantis fecham por deck vazio.

- **Devotee (28):** 3 ABYSSAL WATCHER, 3 OCEAN TEMPLE GUARD, 3 ATLANTEAN ACOLYTE, 3 OCEAN CURRENT SCOUT, 3 JULIAN SOLO, THE CHOSEN VESSEL, 3 ATLANTEAN SENTINEL, 2 CORAL REEF DEFENDER, 3 THE DROWNED PROPHET, 3 ROYAL TRIDENT GUARD, 2 SIREN SORRENTO
- **Spell (22):** 3 UNDERTOW, 2 TIDAL VETO, 3 BENEATH THE SURFACE, 3 CRUSHING WATER PRESSURE, 3 VIKING TIGER CLAW, 2 THE FROZEN DEPTHS, 3 THE UNENDING DELUGE, 2 THE FALL OF ATLANTIS, 1 THE GREAT FLOOD

### Stax/Lock: The First Prison

Hades / THE FIRST PRISON. Referência: The Rack / Pox.

Tira a mão (Lune, Whispers, Trial, Ressonância da First Prison) e cada discard custa Soul; Gorgon e Camus impedem Strike; Hypnos e The Eternal Sleep travam a mesa com Seal.

- **Devotee (27):** 3 DULLAHAN CUBE, 2 STYX SOUL HERDER, 3 GORGON OX, 2 ALRAUNE QUEEN, 3 HADES' ROYAL GUARD, 3 BALRON LUNE, 2 DEEP NIOBE, 2 DEADLY BEETLE STAND, 1 PISCES APHRODITE, THE RESURRECTED SAINT, 2 AQUARIUS CAMUS, 2 WYVERN RHADAMANTHYS, 2 HYPNOS, GOD OF SLEEP
- **Spell (23):** 3 THE WHISPERS OF PANDORA, 3 TOUCH OF DEATH, 3 RETURN FROM THE DARKNESS, 3 THE TRIAL OF THE DEAD, 3 THE FERRYMAN'S PRICE, 2 PACT OF THE UNDERWORLD, 2 DIVINE TOUCH OF DEATH, 2 ETERNAL SLUMBER, 1 THE CURSE OF THE UNDERWORLD, 1 THE ETERNAL SLEEP

### Voltron: The Silver Arrow

Artemis / THE LUNAR HUNTING GROUNDS. Referência: Stompy + Armadillo Cloak.

Um corpo grande com Training, Silver Arrow, Divine Bow e Pierce ataca todo turno; Vigor protege a aposta.

- **Devotee (27):** 3 SACRED STAG, 3 WILDWOOD STALKER, 2 BLACK SATELLITE SOLDIER, 2 LUNAR NYMPH, 3 LUNAR BEAST, 2 HERMIA, 3 LA SCOUMOUNE, 3 SILVER MOON BEAR, 3 DAPHNE, 1 PRIMAL FOREST GUARDIAN, 2 SATYR
- **Equipment (18):** 2 HUNTER'S QUIVER, 2 HERMIA'S SACRED ARMOR, 3 SILVERWOOD SPEAR, 2 CALLISTO'S LUNAR VESTMENT, 2 SILVER ARROW ARMOR, 3 THE SILVER ARROW OF THE MOON, 2 ARTEMIS' DIVINE BOW, 2 SATYR SACRED ARMOR
- **Spell (5):** 3 WILD VIGOR, 1 THE FIRST SACRED HUNT, 1 THE SISTERS' DISAGREEMENT

### Ramp: Primordial Moon

Artemis / THE SACRED FOREST. Referência: Elves / Ramp verde.

Bases extras (Nature's Awakening, Roots, Dryad, Forest) e, antes do round 5, Selene, Fifth Moon Guardian e Champion.

- **Devotee (30):** 3 MOON TEMPLE SENTINEL, 3 GUARDIAN OF THE SACRED SPRING, 3 SACRED STAG, 3 CELESTIAL STAG, 2 THE SECOND MOON GUARDIAN, 2 ANCIENT FOREST SERPENT, 2 SILVER ARROW COMMANDER, 3 PRIMAL FOREST CHAMPION, 2 THE GREAT LUNAR HOUND, 3 ANCIENT GROVE TREANT, 2 SELENE, TITANESS OF THE MOON, 2 THE FIFTH MOON GUARDIAN
- **Spell (20):** 3 HUNTRESS'S NET, 3 NATURE'S AWAKENING, 3 THE FIRST SACRED HUNT, 3 THE SILVER ARROW, 3 ROOTS OF THE ANCIENT WORLD, 2 BLESSING OF THE MOON, 3 THE FOREST INVADES SANCTUARY

## Pendências

- Playtest humano: Combo, Stax, Voltron e Ramp são os mais afetados pelos limites da IA.
