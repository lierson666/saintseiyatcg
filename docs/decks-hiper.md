# Decks Hiper: 10 temas novos

Status: montados e publicados em 01/11/2026 (commit e44a308); Freeze, Spellslinger e Aristocrats reforçados em 02/11/2026. Pedido do autor; as listas ainda não foram jogadas por humanos e não foram aprovadas como lista oficial. Não muda carta nem regra. Dados: `data/alpha-0.1/decks-hiper.json`.

Temas que ainda não existiam: Burn, Aristocrats, Drain, Afterlife, Freeze, Spellslinger, Fortress, Artifacts, Training e Beasts.

## Como ler os números

- Medição IA × IA de 02/11/2026, com as regras vigentes: compra de 1 por turno, limite de 7 na mão, draw engines e nerfs de Artemis. Inclui edições ainda sem commit de outra sessão em `data/cards.json`. Os 10 hiper contra si e contra os 10 ultra.
- 40 partidas por confronto, 760 por deck em cada nível. Margem de cerca de ±4 pontos no winrate por deck e de ±15 pontos em cada confronto.
- `hard` só faz a jogada que melhora a avaliação da IA. `normal` joga as cartas em ordem de custo.
- Quem começa venceu 63% no `hard` e 67% no `normal`. Essa vantagem pesa em todo número abaixo.

**Limites da IA (`playtest/divine/ai.js`), que distorcem parte dos decks:**

1. Quase não equipa. Artifacts é o mais subestimado, e o plano de vestir Libra Sword e Shield quase não aparece na medição.
2. Nunca ativa habilidade {T}. Sem efeito na medição: as habilidades {T} de Atlantean Acolyte, Temple of the Sea Priestess, Sea Dragon Kanon, Aries Mu, Aquarius Camus, Gemini Saga, Jamir Cloth Repairer e Chloris.
3. Ataca o God sempre que for legal; não segura a mesa como um humano faria em Fortress e Freeze.
4. No `hard`, Seal não conta na avaliação. Freeze só joga Seal quando a jogada traz outro ganho.
5. Com as mesmas seeds, trocar o Domain de Hades do Freeze (244, 242 ou 522) deu o mesmo winrate. Na medição, Domain fora da cor não mudou partida; a causa não foi isolada.

## Resultado

| Deck | God / Domain | `hard` | `normal` | Vence por (`hard`) |
| --- | --- | --- | --- | --- |
| **Burn**: Red Line | Ares / THE BURNING BATTLEFIELD | 46% | 56% | Soul 346 |
| **Aristocrats**: Fields of Carnage | Ares / THE FIELDS OF CARNAGE | 46% | 47% | Soul 349 |
| **Drain**: Toll of Souls | Hades / HADES CASTLE | 62% | 53% | Soul 471 |
| **Afterlife**: The Restless Dead | Hades / THE GATES OF THE UNDERWORLD | 53% | 48% | Soul 399 |
| **Freeze**: Eternal Winter | Poseidon / ELYSION | 43% | 49% | Soul 308, deck vazio 17 |
| **Spellslinger**: Pearl Tides | Poseidon / THE NORTH ATLANTIC PILLAR | 49% | 47% | Soul 323, deck vazio 51 |
| **Fortress**: Sanctuary Walls | Athena / THE SANCTUARY GATES | 52% | 56% | Soul 356, Divine Judgment 35, deck vazio 1 |
| **Artifacts**: Forge of Jamir | Athena / JAMIR TOWER | 44% | 39% | Soul 300, Divine Judgment 32 |
| **Training**: Rite of the Grove | Artemis / THE ANCIENT GROVE | 44% | 52% | Soul 334 |
| **Beasts**: Moonlit Pack | Artemis / THE LUNAR HUNTING GROUNDS | 43% | 56% | Soul 330 |

**O que estes números dizem:** os 10 ainda não são todos hiper competitivos. Só Drain e Fortress passam de 50% nos dois níveis. Artifacts virou o mais fraco, e nenhum hiper alcança Midrange e Stax. O reforço de 02/11/2026 subiu Freeze (38/44 para 43/49), Spellslinger (35/36 para 49/47) e Aristocrats (45/42 para 46/47), com margem de ±4 pontos. Training e Beasts caíram sem mudar de lista: a medição já inclui os nerfs de Artemis de 02/11/2026.

Referência, os ultra na mesma medição:

| Ultra | `hard` | `normal` |
| --- | --- | --- |
| aggro | 51% | 60% |
| tempo | 49% | 48% |
| midrange | 81% | 72% |
| control | 44% | 40% |
| combo | 46% | 41% |
| reanimator | 61% | 48% |
| mill | 51% | 40% |
| stax | 71% | 63% |
| voltron | 19% | 31% |
| ramp | 47% | 55% |

## Listas e confrontos

Confrontos no `hard`; cada um tem margem de ±15 pontos.

### Burn: Red Line

Referência: Sligh Burn. Berserkers baratos abrem o dano e a queima direta fecha: First Blood, Crimson Fire, Lost Staff, Bloody Rain e Apocalypse.

Melhores: voltron 93%, beasts 75%, mill 75%. Piores: afterlife 3%, midrange 5%, stax 10%.

3x FRENZIED SWORDSMAN, 3x WARBOUND SOLDIER, 3x DISASTER LEGION BERSERKER, 3x SUICIDAL BERSERKER, 3x RED FIRE LEGION BERSERKER, 3x DISASTER WING ASSASSIN, 3x RED FIRE LEGION RAIDER, 3x DISASTER LEGION DESTROYER, 3x FIRST BLOOD, 3x SPARK OF WAR, 3x THE CRIMSON FIRE, 3x THE BLOODY RAIN, 3x THE LOST STAFF OF NIKE, 2x NIGHTMARE MANIFESTATION, 2x THE APOCALYPSE OF ARES, 2x SUICIDE ORDERS, 2x AZURE, THE BLUE DEATH, 3x RAIN OF SPEARS.

### Aristocrats: Fields of Carnage

Referência: Goblin Sac. Berserkers que rendem ao morrer e sacrifício (Blood for Blood, Suicide Orders); Scavenger compra, Catreu e Champion crescem, Apocalypse of Berserker e Blood Oath mantêm a pressão.

Melhores: voltron 85%, ramp 73%, beasts 65%. Piores: midrange 13%, stax 20%, reanimator 23%.

3x BATTLEFIELD SCAVENGER, 3x DISASTER LEGION BERSERKER, 3x SUICIDAL BERSERKER, 3x DISASTER LEGION DESTROYER, 3x DISASTER WING ASSASSIN, 3x BLOODTHIRSTY BERSERKER, 3x FLAME LEGION BERSERKER, 2x RED FIRE LEGION RAIDER, 3x ISEU OF PYTHON, 3x CATREU OF AKEPHALOS, 2x BLOOD OATH WARRIOR, 3x BERSERKER CHAMPION, 2x BERSERKER OF THE APOCALYPSE, 2x SUICIDE ORDERS, 3x BLOOD FOR BLOOD, 3x FIRST BLOOD, 3x SPARK OF WAR, 3x FURY OF ARES.

### Drain: Toll of Souls

Referência: Pox / Vampiros. Cada entrada tira Soul do inimigo e devolve ao seu God; Souls of the Damned e The Sword That Pierced fecham à distância.

Melhores: burn 85%, freeze 80%, afterlife 78%. Piores: fortress 40%, combo 48%, training 48%.

3x WANDERING SOUL, 3x UNDERWORLD SKELETON, 3x DULLAHAN CUBE, 3x FROG ZEROS, 3x HADES' ROYAL GUARD, 3x ELYSIUM SERVANT, 3x ALRAUNE QUEEN, 3x HARPY VALENTINE, 3x LYCAON PHLEGYAS, 2x SPHINX PHARAOH, 2x PISCES APHRODITE, THE RESURRECTED SAINT, 2x GRIFFON MINOS, 3x SOULS OF THE DAMNED, 2x THE WHISPERS OF PANDORA, 3x THE TRIAL OF THE DEAD, 3x PACT OF THE UNDERWORLD, 2x DIVINE TOUCH OF DEATH, 2x THE SWORD THAT PIERCES ATHENA, 2x THE CURSE OF THE UNDERWORLD.

### Afterlife: The Restless Dead

Referência: Dredge lento. As cartas seguem valendo no Tartarus: Afterlife de Dullahan, Alraune, Gorgon, Gordon e Styx, mais recursão barata e corpos que trocam bem. Vence pela troca de cartas.

Melhores: burn 98%, freeze 78%, spells 73%. Piores: midrange 13%, drain 23%, reanimator 33%.

3x UNDERWORLD SKELETON, 3x WANDERING SOUL, 3x SKELETON MARKINO, 3x STYX SOUL HERDER, 3x DULLAHAN CUBE, 3x ALRAUNE QUEEN, 3x GORGON OX, 3x MINOTAUR GORDON, 3x DEADLY BEETLE STAND, 3x HARPY VALENTINE, 2x LYCAON PHLEGYAS, 3x THE OATH OF THE 108 STARS, 3x RETURN FROM THE DARKNESS, 2x GARUDA AIACOS, 2x ARIES SHION, THE RESURRECTED SAINT, 3x THE AWAKENING OF THE SPECTERS, 3x THE WILL OF HADES, 2x TOUCH OF DEATH.

### Freeze: Eternal Winter

Referência: Frozen Shade / Icy. Seal segura o inimigo enquanto Marinas batem; o Domain de Hades traz 15 cartas de remoção e pressão (Touch of Death, Divine Touch, Harpy, Dullahan).

Melhores: voltron 93%, beasts 65%, artifacts 60%. Piores: midrange 3%, stax 10%, drain 20%.

3x MARINA SPEARMAN, 3x ATLANTEAN ACOLYTE, 3x OCEAN CURRENT SCOUT, 3x MARINA VANGUARD, 1x JULIAN SOLO, THE CHOSEN VESSEL, 2x KRAKEN ISAAC, 2x SEA DRAGON KANON, 3x CRUSHING WATER PRESSURE, 3x VIKING TIGER CLAW, 3x AURORA BOREALIS, 2x THE FROZEN DEPTHS, 3x THE RISING TIDE, 2x BENEATH THE SURFACE, 2x ATLANTEAN SENTINEL, 3x DULLAHAN CUBE, 3x ALRAUNE QUEEN, 3x HARPY VALENTINE, 3x TOUCH OF DEATH, 3x DIVINE TOUCH OF DEATH.

### Spellslinger: Pearl Tides

Referência: Spiral Tide. 20 feitiços e 30 corpos: Pearl Keeper, Scout e Acolyte compram, bounce barato atrasa a mesa, Marinas batem e Kanon fecha.

Melhores: voltron 93%, training 70%, fortress 65%. Piores: midrange 10%, stax 15%, afterlife 28%.

3x PEARL SANCTUARY KEEPER, 3x OCEAN CURRENT SCOUT, 3x ATLANTEAN ACOLYTE, 3x MARINA SPEARMAN, 3x MARINA VANGUARD, 3x HERALD OF THE SEVEN SEAS, 3x TIDAL ASSAILANT, 3x MARINA STANDARD BEARER, 2x ATLANTEAN SENTINEL, 3x SEA DRAGON KANON, 1x SEAHORSE BAIAN, 3x WAVES OF DESTRUCTION, 3x BENEATH THE SURFACE, 3x UNDERTOW, 2x TIDAL VETO, 3x THE RISING TIDE, 2x MARINE WHIRLWIND, 2x THE SEA DRAGON'S COMMAND, 1x GALACTIC ILLUSION, 1x THE FIRST GREAT STORM.

### Fortress: Sanctuary Walls

Referência: Soul Sisters / Wall. Guardians e prevenção seguram a mesa; Golden Arrow e Judgment respondem; Golds e Silvers de corpo grande fecham quando o inimigo cansa.

Melhores: burn 88%, aristocrats 78%, voltron 78%. Piores: midrange 20%, ramp 25%, control 33%.

3x SANCTUARY GUARD, 3x TATSUMI, SAORI’S GUARDIAN, 3x DRAGON SHIRYU, 3x ARIES MU, 3x WHALE MOSES, 2x LEO AIOLIA, 2x AQUARIUS CAMUS, 2x GEMINI SAGA, 3x BEAR GEKI, 3x CENTAUR BABEL, 2x CERBERUS DANTE, 2x PERSEUS ALGOL, 2x MIHO, THE ORPHANAGE CARETAKER, 3x SHUNREI, THE PRAYER OF ROZAN, 3x ATHENA'S AEGIS, 3x PROTECT SAORI, 3x THE GOLDEN ARROW, 3x SANCTUARY'S JUDGMENT, 2x SHUN’S EMBRACE.

### Artifacts: Forge of Jamir

Referência: Stoneblade. Kiki busca, Repairer e Acolyte compram por Equipment jogado; Saints de corpo grande vestem Libra Sword e Shield e fecham o jogo.

Melhores: voltron 85%, burn 65%, aristocrats 63%. Piores: mill 23%, midrange 23%, tempo 28%.

3x KIKI, APPRENTICE OF JAMIR, 3x JAMIR CLOTH REPAIRER, 3x STAR HILL ACOLYTE, 2x PHOENIX FEATHER, 3x LIBRA SWORD, 2x LIBRA SHIELD, 3x SANCTUARY TORCH, 1x ATHENA’S SHIELD, 3x PEGASUS SEIYA, 3x DRAGON SHIRYU, 2x CYGNUS HYOGA, 3x BEAR GEKI, 3x CENTAUR BABEL, 3x OPHIUCHUS SHAINA, 2x LEO AIOLIA, 2x AQUARIUS CAMUS, 2x GEMINI SAGA, 3x ATHENA'S AEGIS, 3x THE GOLDEN ARROW, 1x SANCTUARY'S JUDGMENT.

### Training: Rite of the Grove

Referência: Hardened Scales. Marcadores de Training em todo corpo: Stag, Nymph e Primal Growth abastecem Hermia, Stalker e Primal Forest Guardian.

Melhores: voltron 70%, afterlife 60%, artifacts 58%. Piores: midrange 18%, stax 23%, tempo 23%.

3x SACRED STAG, 3x LUNAR NYMPH, 3x WILDWOOD STALKER, 3x MOON TEMPLE SENTINEL, 3x MOON TEMPLE ACOLYTE, 3x HERMIA, 3x LUNAR BEAST, 3x PRIMAL GROWTH, 3x SILVER LIGHT OF SELENE, 3x OATH OF THE SEVEN HUNTRESSES, 3x LA SCOUMOUNE, 2x CHLORIS, SPIRIT OF BLOSSOMS, 2x CALISTO, 2x PRIMAL FOREST GUARDIAN, 3x SILVER MOON BEAR, 2x CHANDRA, 3x ANCIENT GROVE TREANT, 3x DAPHNE.

### Beasts: Moonlit Pack

Referência: Tribal Beasts. Sacred Beasts: Wolf e Silver Fang crescem em grupo, Huntress Apprentice compra por Beast que entra, Bear e Serpent fecham.

Melhores: voltron 73%, artifacts 65%, ramp 65%. Piores: midrange 10%, stax 15%, burn 25%.

3x MOONLIT WOLF, 3x MOONBOUND FOX, 3x SACRED STAG, 3x HUNTRESS APPRENTICE, 3x LUNAR BEAST, 3x CELESTIAL STAG, 3x SILVER FANG WOLF, 3x SILVER MOON BEAR, 3x ANCIENT FOREST SERPENT, 2x THE GREAT LUNAR HOUND, 3x NATURE'S AWAKENING, 3x THE FOREST INVADES SANCTUARY, 3x WILD VIGOR, 3x PRIMAL GROWTH, 3x SILVERWOOD SPEAR, 3x ANCIENT GROVE TREANT, 3x WILDWOOD STALKER.
