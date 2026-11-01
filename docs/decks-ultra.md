# Decks Ultra: 10 arquétipos competitivos

Status: montados e medidos em 01/11/2026. Arquétipos aprovados pelo autor antes da montagem; as listas ainda não foram jogadas por humanos. Não cria regra. Dados: `data/alpha-0.1/decks-ultra.json`. Fora do lobby e não publicados.

## Como ler os números

- Medição IA × IA, regra vigente: 50 cartas, compra de 2, limite de 9 na mão, só quem começa não compra no 1º turno. Primeiro jogador alternado (a simulação não sorteia a moeda).
- 40 partidas por confronto, 360 por deck em cada nível. Margem de cerca de ±5 pontos no winrate por deck e de ±15 pontos em cada confronto.
- **Os dois níveis medem coisas diferentes.** `hard` só faz a jogada que melhora Soul, mesa ou mão na avaliação da IA. `normal` joga as cartas em ordem de custo. Por isso os decks trocam de posição entre eles.

**Limites da IA (`playtest/divine/ai.js`), que subestimam parte dos decks:**

1. Ataca o God sempre que for legal; subestima controle e combo e não reproduz o jogo humano.
2. Nunca ativa habilidade {T} de Devotee ou Equipment. Sem efeito na medição: Moonlit Initiate, Dryad, Golden Triangle, Stardust Revolution, Freezing Coffin do Camus.
3. No `hard`, Seal e Base extra não contam na avaliação. Essas jogadas só saem se trouxerem outro ganho.
4. No `hard`, Athena Exclamation raramente melhora a avaliação, porque sacrifica 3 Saints.

## Resultado

| Deck | God / Domain | `hard` | `normal` | vs 8 decks antigos (`hard`) | Vence por (`hard`) |
| --- | --- | --- | --- | --- | --- |
| **Aggro**: Crimson Sligh | Ares / THE ARENA OF BLOOD | 47% | 64% | 64% | Soul 169 |
| **Tempo**: Marina Tide | Poseidon / THE NORTH ATLANTIC PILLAR | 59% | 44% | 69% | Soul 109, deck vazio 102 |
| **Midrange**: Judgment of Elysion | Hades / ELYSION | 53% | 54% | 84% | Soul 190 |
| **Control**: Silent Sanctuary | Poseidon / THE UNDERSEA SANCTUARY | 62% | 46% | 63% | deck vazio 182, Soul 40 |
| **Combo**: Twelve Temples Exclamation | Athena / THE SANCTUARY GATES | 21% | 39% | 51% | Soul 76, deck vazio 1 |
| **Reanimator**: Return from the Deep | Hades / THE NORTH ATLANTIC PILLAR | 56% | 47% | 80% | Soul 201 |
| **Mill**: The Abyssal Clock | Poseidon / THE ABYSSAL TRENCH | 70% | 34% | 69% | deck vazio 249, Soul 4 |
| **Stax/Lock**: The First Prison | Hades / THE FIRST PRISON | 44% | 44% | 70% | Soul 157 |
| **Voltron**: The Silver Arrow | Artemis / THE LUNAR HUNTING GROUNDS | 32% | 58% | 61% | Soul 116 |
| **Ramp**: Primordial Moon | Artemis / THE SACRED FOREST | 57% | 71% | 71% | Soul 204 |

Primeiro jogador vence 69% no `hard` e 76% no `normal`. Mediana de 8 e 7 rounds. Rodada mista com os 8 decks antigos: 10 partidas por confronto, primeiro jogador 71%.

Os 8 decks antigos vencem de 15% a 56% contra os ultra; só Marina Tempest fica acima de 50%.

## O que a medição mostra

- **Great Flood parece pesar demais.** Nas partidas em que o Ultimate resolve, Poseidon vence de 92% a 99% (Tempo, Control e Mill, nos dois níveis). É correlação: ele custa 8 e pode sair em mesa já ganha. A IA dispara com 2+ Devotees inimigos, e o texto mila 3 cartas por carta descartada, num deck de 50. Control e Tempo vencem muito por deck vazio sem serem deck de mill; não isolei quanto disso vem do Flood. Vale testar partidas sem o Ultimate.
- **Vantagem de quem começa está alta** (69–76%, meta de `docs/meta-premodern.md`: abaixo de 55%). A medição anterior, com outros decks, deu 74,6%. A simulação alterna quem começa, então a moeda não muda este número.
- **Combo é o mais fraco**: 21% no `hard`, 39% no `normal`. Quando Exclamation resolve, vence 95–100%, mas resolve só em 15% e 29% das partidas: 3 Gold de custo 5–6 em mediana de 7–8 rounds é lento. Com piloto humano deve subir, mas o número medido é fraco.
- **Voltron oscila**: 58% no `normal` e 32% no `hard`. Não investiguei a causa.
- **Metas do meta-premodern não foram atingidas**: há confrontos fora de 40–60% e winrates fora de 45–55%. Estas listas buscam força, não equilíbrio.

## Mudanças em relação à tabela aprovada

| Deck | Aprovado | Final | Motivo medido |
| --- | --- | --- | --- |
| Stax/Lock | Athena + Seal, Domain Arctic Ocean Pillar | **Hades, First Prison** (discard: The Rack/Pox) | Arctic Ocean Pillar não tem efeito na engine. Contra ultra + antigos (`hard` / `normal`): Athena 24% / 39%; Poseidon 46% / 39%; Hades 61% / 52% |
| Reanimator | Gates of the Underworld | **North Atlantic Pillar** com 10 cartas Poseidon | Contra ultra + antigos: splash 67% / 56%; mono 61% / 51%, dentro da margem |
| Combo | Stairway | **Sanctuary Gates** | Contra ultra + antigos: 47% / 53%; Stairway 40% / 55%, dentro da margem |
| Ramp | Devotees de mana | **Sem Devotees de mana**: Initiate, Dryad, Shaman e Amulet saíram | A IA não os ativa. No `hard`, 29% no 1º round-robin e 57% no final (as outras listas também mudaram). Com piloto humano, testar a versão com eles |

Hades ficou com 3 decks, Poseidon com 3, Artemis com 2, Ares e Athena com 1.

## Matchups

`hard` (linha vence coluna):

| vence → | Aggro | Tempo | Midrange | Control | Combo | Reanimator | Mill | Stax | Voltron | Ramp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Aggro** | · | 68% | 33% | 50% | 50% | 20% | 45% | 40% | 58% | 60% |
| **Tempo** | 33% | · | 50% | 50% | 90% | 50% | 43% | 55% | 88% | 70% |
| **Midrange** | 68% | 50% | · | 43% | 63% | 43% | 38% | 68% | 78% | 28% |
| **Control** | 50% | 50% | 58% | · | 95% | 70% | 43% | 68% | 73% | 50% |
| **Combo** | 50% | 10% | 38% | 5% | · | 15% | 10% | 23% | 40% | 3% |
| **Reanimator** | 80% | 50% | 58% | 30% | 85% | · | 18% | 70% | 63% | 50% |
| **Mill** | 55% | 58% | 63% | 58% | 90% | 83% | · | 80% | 80% | 68% |
| **Stax** | 60% | 45% | 33% | 33% | 78% | 30% | 20% | · | 60% | 35% |
| **Voltron** | 43% | 13% | 23% | 28% | 60% | 38% | 20% | 40% | · | 28% |
| **Ramp** | 40% | 30% | 73% | 50% | 98% | 50% | 33% | 65% | 73% | · |

`normal`:

| vence → | Aggro | Tempo | Midrange | Control | Combo | Reanimator | Mill | Stax | Voltron | Ramp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Aggro** | · | 55% | 40% | 80% | 65% | 75% | 93% | 60% | 55% | 53% |
| **Tempo** | 45% | · | 30% | 48% | 65% | 40% | 70% | 40% | 35% | 20% |
| **Midrange** | 60% | 70% | · | 53% | 53% | 50% | 60% | 53% | 58% | 28% |
| **Control** | 20% | 53% | 48% | · | 60% | 65% | 35% | 60% | 33% | 38% |
| **Combo** | 35% | 35% | 48% | 40% | · | 43% | 68% | 33% | 35% | 18% |
| **Reanimator** | 25% | 60% | 50% | 35% | 58% | · | 63% | 63% | 45% | 28% |
| **Mill** | 8% | 30% | 40% | 65% | 33% | 38% | · | 53% | 23% | 15% |
| **Stax** | 40% | 60% | 48% | 40% | 68% | 38% | 48% | · | 43% | 18% |
| **Voltron** | 45% | 65% | 43% | 68% | 65% | 55% | 78% | 58% | · | 45% |
| **Ramp** | 48% | 80% | 73% | 63% | 83% | 73% | 85% | 83% | 55% | · |

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

Athena / THE SANCTUARY GATES. Referência: Trix.

Protege a mesa até ter 3 Gold Saints Prepared; Athena Exclamation tira ATK + 3 por Gold e deixa Divine Judgment.

- **Devotee (31):** 3 SANCTUARY GUARD, 2 TATSUMI, SAORI’S GUARDIAN, 3 STAR HILL ACOLYTE, 3 DRAGON SHIRYU, 2 ANDROMEDA SHUN, 2 EAGLE MARIN, 2 LIZARD MISTY, 2 PERSEUS ALGOL, 3 ARIES MU, 3 LEO AIOLIA, 3 AQUARIUS CAMUS, 3 GEMINI SAGA
- **Equipment (2):** 2 CRACKED BRONZE CLOTH
- **Spell (17):** 3 ATHENA'S AEGIS, 3 OATH OF THE SAINTS, 3 THE GOLDEN ARROW, 3 PROTECT SAORI, 3 SANCTUARY'S JUDGMENT, 2 THE CALL OF ATHENA

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
