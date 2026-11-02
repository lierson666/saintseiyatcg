# Decks Hiper: 10 temas novos

Status: montados, medidos e publicados em 01/11/2026 (commit e44a308). Pedido do autor; as listas ainda não foram jogadas por humanos e não foram aprovadas como lista oficial. Não muda carta nem regra. Dados: `data/alpha-0.1/decks-hiper.json`.

Temas que ainda não existiam: Burn, Aristocrats, Drain, Afterlife, Freeze, Spellslinger, Fortress, Artifacts, Training e Beasts.

## Como ler os números

- Medição IA × IA com as regras vigentes: compra de 1 por turno, limite de 7 na mão e draw engines. Os 10 hiper contra si e contra os 10 ultra.
- 40 partidas por confronto, 760 por deck em cada nível. Margem de cerca de ±4 pontos no winrate por deck e de ±15 pontos em cada confronto.
- `hard` só faz a jogada que melhora a avaliação da IA. `normal` joga as cartas em ordem de custo.
- Quem começa venceu 64% no `hard` e 67% no `normal`. Essa vantagem pesa em todo número abaixo.

**Limites da IA (`playtest/divine/ai.js`), que distorcem parte dos decks:**

1. Quase não equipa. Artifacts é o mais subestimado, e o plano de vestir Libra Sword e Shield quase não aparece na medição.
2. Nunca ativa habilidade {T}. Sem efeito na medição: as habilidades {T} de Atlantean Acolyte, Temple of the Sea Priestess, Sea Dragon Kanon, Aries Mu, Aquarius Camus, Gemini Saga, Jamir Cloth Repairer e Chloris.
3. Ataca o God sempre que for legal; não segura a mesa como um humano faria em Fortress e Freeze.
4. No `hard`, Seal não conta na avaliação. Freeze só joga Seal quando a jogada traz outro ganho.
5. Spellslinger e Freeze perdem cerca de 1 partida em 9 por deck vazio (`hard`). A causa provável é a IA comprar sem medir o deck; não foi isolada.

## Resultado

| Deck | God / Domain | `hard` | `normal` | Vence por (`hard`) |
| --- | --- | --- | --- | --- |
| **Burn**: Red Line | Ares / THE BURNING BATTLEFIELD | 46% | 55% | Soul 350 |
| **Aristocrats**: Fields of Carnage | Ares / THE FIELDS OF CARNAGE | 45% | 42% | Soul 339 |
| **Drain**: Toll of Souls | Hades / HADES CASTLE | 62% | 53% | Soul 471 |
| **Afterlife**: The Restless Dead | Hades / THE GATES OF THE UNDERWORLD | 49% | 46% | Soul 373 |
| **Freeze**: Eternal Winter | Poseidon / THE TIDAL ARCHIVE | 38% | 44% | Soul 261, deck vazio 26 |
| **Spellslinger**: Pearl Tides | Poseidon / THE UNDERSEA SANCTUARY | 35% | 36% | Soul 246, deck vazio 20 |
| **Fortress**: Sanctuary Walls | Athena / THE SANCTUARY GATES | 51% | 57% | Soul 387, Divine Judgment 3, deck vazio 1 |
| **Artifacts**: Forge of Jamir | Athena / JAMIR TOWER | 50% | 40% | Soul 376, Divine Judgment 3 |
| **Training**: Rite of the Grove | Artemis / THE ANCIENT GROVE | 61% | 62% | Soul 467 |
| **Beasts**: Moonlit Pack | Artemis / THE LUNAR HUNTING GROUNDS | 47% | 62% | Soul 356 |

**O que estes números dizem:** os 10 não são todos hiper competitivos. Só Drain, Training, Fortress e Beasts/Burn (no `normal`) ficam claramente acima de 50%. Freeze e Spellslinger são os fracos, e nenhum hiper alcança Midrange e Stax.

Referência, os ultra na mesma medição:

| Ultra | `hard` | `normal` |
| --- | --- | --- |
| aggro | 51% | 60% |
| tempo | 50% | 47% |
| midrange | 79% | 74% |
| control | 44% | 42% |
| combo | 44% | 42% |
| reanimator | 59% | 46% |
| mill | 49% | 39% |
| stax | 70% | 63% |
| voltron | 20% | 33% |
| ramp | 48% | 56% |

## Listas e confrontos

Confrontos no `hard`; cada um tem margem de ±15 pontos.

### Burn: Red Line

Referência: Sligh Burn. Berserkers baratos abrem o dano e a queima direta fecha: First Blood, Crimson Fire, Lost Staff, Bloody Rain e Apocalypse.

Melhores: voltron 93%, freeze 83%, spells 83%. Piores: afterlife 3%, midrange 5%, stax 10%.

3x FRENZIED SWORDSMAN, 3x WARBOUND SOLDIER, 3x DISASTER LEGION BERSERKER, 3x SUICIDAL BERSERKER, 3x RED FIRE LEGION BERSERKER, 3x DISASTER WING ASSASSIN, 3x RED FIRE LEGION RAIDER, 3x DISASTER LEGION DESTROYER, 3x FIRST BLOOD, 3x SPARK OF WAR, 3x THE CRIMSON FIRE, 3x THE BLOODY RAIN, 3x THE LOST STAFF OF NIKE, 2x NIGHTMARE MANIFESTATION, 2x THE APOCALYPSE OF ARES, 2x SUICIDE ORDERS, 2x AZURE, THE BLUE DEATH, 3x RAIN OF SPEARS.

### Aristocrats: Fields of Carnage

Referência: Goblin Sac. Berserkers que rendem ao morrer e sacrifício (Blood for Blood, Suicide Orders); Scavenger compra, Catreu e Champion crescem, Apocalypse fecha pelo Tartarus.

Melhores: voltron 83%, freeze 75%, mill 68%. Piores: stax 8%, midrange 13%, reanimator 15%.

3x BATTLEFIELD SCAVENGER, 3x DISASTER LEGION BERSERKER, 3x SUICIDAL BERSERKER, 3x DISASTER LEGION DESTROYER, 3x DISASTER WING ASSASSIN, 3x BLOODTHIRSTY BERSERKER, 3x FLAME LEGION BERSERKER, 2x RED FIRE LEGION RAIDER, 3x ISEU OF PYTHON, 3x CATREU OF AKEPHALOS, 2x LAMASSU LIOR, 2x BERSERKER CHAMPION, 3x BLOOD FOR BLOOD, 3x SUICIDE ORDERS, 2x THE APOCALYPSE OF ARES, 3x FIRST BLOOD, 3x SPARK OF WAR, 3x FURY OF ARES.

### Drain: Toll of Souls

Referência: Pox / Vampiros. Cada entrada tira Soul do inimigo e devolve ao seu God; Souls of the Damned e The Sword That Pierced fecham à distância.

Melhores: burn 85%, afterlife 78%, aggro 75%. Piores: fortress 40%, beasts 48%, tempo 50%.

3x WANDERING SOUL, 3x UNDERWORLD SKELETON, 3x DULLAHAN CUBE, 3x FROG ZEROS, 3x HADES' ROYAL GUARD, 3x ELYSIUM SERVANT, 3x ALRAUNE QUEEN, 3x HARPY VALENTINE, 3x LYCAON PHLEGYAS, 2x SPHINX PHARAOH, 2x PISCES APHRODITE, THE RESURRECTED SAINT, 2x GRIFFON MINOS, 3x SOULS OF THE DAMNED, 2x THE WHISPERS OF PANDORA, 3x THE TRIAL OF THE DEAD, 3x PACT OF THE UNDERWORLD, 2x DIVINE TOUCH OF DEATH, 2x THE SWORD THAT PIERCES ATHENA, 2x THE CURSE OF THE UNDERWORLD.

### Afterlife: The Restless Dead

Referência: Dredge lento. As cartas seguem valendo no Tartarus: Afterlife de Dullahan, Alraune, Gorgon, Gordon e Styx, mais recursão barata e corpos que trocam bem. Vence pela troca de cartas.

Melhores: burn 98%, spells 78%, voltron 70%. Piores: midrange 13%, training 18%, fortress 23%.

3x UNDERWORLD SKELETON, 3x WANDERING SOUL, 3x SKELETON MARKINO, 3x STYX SOUL HERDER, 3x DULLAHAN CUBE, 3x ALRAUNE QUEEN, 3x GORGON OX, 3x MINOTAUR GORDON, 3x DEADLY BEETLE STAND, 3x HARPY VALENTINE, 2x LYCAON PHLEGYAS, 3x THE OATH OF THE 108 STARS, 3x RETURN FROM THE DARKNESS, 2x GARUDA AIACOS, 2x ARIES SHION, THE RESURRECTED SAINT, 3x THE AWAKENING OF THE SPECTERS, 3x THE WILL OF HADES, 2x TOUCH OF DEATH.

### Freeze: Eternal Winter

Referência: Frozen Shade / Icy. Seal mantém o inimigo parado enquanto Marinas batem: Spearman e Vanguard rendem contra Seal, Herald sobe a tropa e Rising Tide compra.

Melhores: voltron 83%, fortress 63%, artifacts 50%. Piores: stax 10%, midrange 15%, burn 18%.

3x MARINA SPEARMAN, 2x OCEAN TEMPLE GUARD, 3x ATLANTEAN ACOLYTE, 3x OCEAN CURRENT SCOUT, 3x MARINA VANGUARD, 3x HERALD OF THE SEVEN SEAS, 3x TIDAL ASSAILANT, 2x ATLANTEAN SENTINEL, 1x JULIAN SOLO, THE CHOSEN VESSEL, 2x TEMPLE OF THE SEA PRIESTESS, 2x KRAKEN ISAAC, 2x SEA DRAGON KANON, 3x CRUSHING WATER PRESSURE, 3x VIKING TIGER CLAW, 3x AURORA BOREALIS, 2x THE FROZEN DEPTHS, 2x THE NORTHERN STORM, 3x THE RISING TIDE, 3x BENEATH THE SURFACE, 2x UNDERTOW.

### Spellslinger: Pearl Tides

Referência: Spiral Tide. Pearl Keeper, Scout, Acolyte e feitiços baratos enchem a mão; Marinas batem, bounce atrasa a mesa até Kanon e Great Flood fecharem.

Melhores: voltron 75%, control 58%, freeze 55%. Piores: midrange 3%, stax 10%, burn 18%.

3x PEARL SANCTUARY KEEPER, 3x OCEAN CURRENT SCOUT, 3x ATLANTEAN ACOLYTE, 3x MARINA SPEARMAN, 3x MARINA VANGUARD, 3x HERALD OF THE SEVEN SEAS, 3x TIDAL ASSAILANT, 3x MARINA STANDARD BEARER, 2x ATLANTEAN SENTINEL, 3x SEA DRAGON KANON, 1x SEAHORSE BAIAN, 3x BENEATH THE SURFACE, 2x MIST OF THE DEEP, 3x UNDERTOW, 2x TIDAL VETO, 3x THE RISING TIDE, 2x MARINE WHIRLWIND, 2x THE SEA DRAGON'S COMMAND, 1x GALACTIC ILLUSION, 1x POSEIDON'S TRIDENT, 1x THE FIRST GREAT STORM.

### Fortress: Sanctuary Walls

Referência: Soul Sisters / Wall. Guardians e prevenção seguram a mesa; Golden Arrow e Judgment respondem; Golds e Silvers de corpo grande fecham quando o inimigo cansa.

Melhores: burn 88%, voltron 83%, afterlife 78%. Piores: midrange 23%, training 23%, ramp 25%.

3x SANCTUARY GUARD, 3x TATSUMI, SAORI’S GUARDIAN, 3x DRAGON SHIRYU, 3x ARIES MU, 3x WHALE MOSES, 2x LEO AIOLIA, 2x AQUARIUS CAMUS, 2x GEMINI SAGA, 3x BEAR GEKI, 3x CENTAUR BABEL, 2x CERBERUS DANTE, 2x PERSEUS ALGOL, 2x MIHO, THE ORPHANAGE CARETAKER, 3x SHUNREI, THE PRAYER OF ROZAN, 3x ATHENA'S AEGIS, 3x PROTECT SAORI, 3x THE GOLDEN ARROW, 3x SANCTUARY'S JUDGMENT, 2x SHUN’S EMBRACE.

### Artifacts: Forge of Jamir

Referência: Stoneblade. Kiki busca, Repairer e Acolyte compram por Equipment jogado; Saints de corpo grande vestem Libra Sword e Shield e fecham o jogo.

Melhores: voltron 85%, aristocrats 75%, burn 65%. Piores: mill 30%, midrange 30%, stax 33%.

3x KIKI, APPRENTICE OF JAMIR, 3x JAMIR CLOTH REPAIRER, 3x STAR HILL ACOLYTE, 2x PHOENIX FEATHER, 3x LIBRA SWORD, 2x LIBRA SHIELD, 3x SANCTUARY TORCH, 1x ATHENA’S SHIELD, 3x PEGASUS SEIYA, 3x DRAGON SHIRYU, 2x CYGNUS HYOGA, 3x BEAR GEKI, 3x CENTAUR BABEL, 3x OPHIUCHUS SHAINA, 2x LEO AIOLIA, 2x AQUARIUS CAMUS, 2x GEMINI SAGA, 3x ATHENA'S AEGIS, 3x THE GOLDEN ARROW, 1x SANCTUARY'S JUDGMENT.

### Training: Rite of the Grove

Referência: Hardened Scales. Marcadores de Training em todo corpo: Stag, Nymph e Primal Growth abastecem Hermia, Stalker e Primal Forest Guardian.

Melhores: afterlife 83%, fortress 78%, voltron 75%. Piores: tempo 35%, midrange 43%, drain 50%.

3x SACRED STAG, 3x LUNAR NYMPH, 3x WILDWOOD STALKER, 3x MOON TEMPLE SENTINEL, 3x MOON TEMPLE ACOLYTE, 3x HERMIA, 3x LUNAR BEAST, 3x PRIMAL GROWTH, 3x SILVER LIGHT OF SELENE, 3x OATH OF THE SEVEN HUNTRESSES, 3x LA SCOUMOUNE, 2x CHLORIS, SPIRIT OF BLOSSOMS, 2x CALISTO, 2x PRIMAL FOREST GUARDIAN, 3x SILVER MOON BEAR, 2x CHANDRA, 3x ANCIENT GROVE TREANT, 3x DAPHNE.

### Beasts: Moonlit Pack

Referência: Tribal Beasts. Sacred Beasts: Wolf e Silver Fang crescem em grupo, Huntress Apprentice compra por Beast que entra, Bear e Serpent fecham.

Melhores: voltron 78%, ramp 75%, freeze 65%. Piores: midrange 10%, stax 18%, burn 20%.

3x MOONLIT WOLF, 3x MOONBOUND FOX, 3x SACRED STAG, 3x HUNTRESS APPRENTICE, 3x LUNAR BEAST, 3x CELESTIAL STAG, 3x SILVER FANG WOLF, 3x SILVER MOON BEAR, 3x ANCIENT FOREST SERPENT, 2x THE GREAT LUNAR HOUND, 3x NATURE'S AWAKENING, 3x THE FOREST INVADES SANCTUARY, 3x WILD VIGOR, 3x PRIMAL GROWTH, 3x SILVERWOOD SPEAR, 3x ANCIENT GROVE TREANT, 3x WILDWOOD STALKER.
