# Cosmoble — rebalanceamento

Status: **aprovado pelo autor e gravado** (31/10/2026) em `data/cards.json`, `card-forge/art-web/cards.json`, nas listas competitivas, no construtor de deck, na IA e no How to Play.

## 1. Problema e decisões do autor (31/10/2026)

Antes, 499 das 509 cartas eram Cosmoble (98%): toda carta virava mana, e o deckbuild não tinha a troca "poder × mana" do Lorcana.

- **Alvo:** cerca de 70% de cartas Cosmoble em cada facção e nas neutras.
- **Critério:** perde Cosmoble a carta com poder acima da curva (raridade, ATK/HP acima do custo, keywords, remoção, compra, Awaken/Ultimate, custo 5+). Cartas de enchimento e as comuns de custo 1 ficam Cosmoble. Armors seguem o mesmo critério; no empate, Devotee e Spell saem antes de Equipment.
- **Ramp:** carta que gera Cosmo ou põe Bases perde Cosmoble.
- **Construtor:** só aviso, sem regra no guia. Mostra "Cosmoble X / 60" e avisa abaixo de 60% do deck.
- **Moon Harvest (Artemis):** fica como está; medir no round-robin.
- **IA:** põe como Base a cópia repetida, depois a carta que não cabe no próximo turno.
- Domains e Gods não entram (não vão à mão).

## 2. Resumo

```
ares: 86 cartas, 26 sem Cosmoble (0 ramp), ficam 60 (70%)
artemis: 86 cartas, 26 sem Cosmoble (14 ramp), ficam 60 (70%)
athena: 86 cartas, 26 sem Cosmoble (0 ramp), ficam 60 (70%)
hades: 86 cartas, 26 sem Cosmoble (0 ramp), ficam 60 (70%)
neutral: 50 cartas, 15 sem Cosmoble (3 ramp), ficam 35 (70%)
poseidon: 82 cartas, 25 sem Cosmoble (0 ramp), ficam 57 (70%)
```

## 3. Listas competitivas (Cosmoble de 60)

| Lista | Cosmoble |
| --- | --- |
| comp-athena-cloth-voltron | 45 |
| comp-athena-bronze-brotherhood | 48 |
| comp-athena-seal-control | 41 |
| comp-poseidon-counter-control | 50 |
| comp-poseidon-marina-tempo | 49 |
| comp-hades-aristocrats | 57 |
| comp-hades-reanimator | 43 |
| comp-hades-specter-midrange | 60 |
| comp-ares-berserker-rush | 44 |
| comp-ares-glorious-demise | 40 |
| comp-artemis-counter-ramp | 44 |
| comp-artemis-huntress-precision | 50 |
| comp-neutral-steel-armory | 47 |
| comp-hades-black-saints | 53 |
| comp-underworld-carnage | 60 |
| comp-ares-sligh | 48 |
| comp-athena-saints | 52 |
| comp-poseidon-control | 41 |
| comp-poseidon-marina | 54 |
| comp-hades-midrange | 51 |
| comp-artemis-hunt | 40 |
| comp-enchantress | 48 |
| comp-reanimator | 45 |
| comp-rakdos | 54 |
| comp-azorius | 43 |

Reajustadas para ~40 (trocas por cartas Cosmoble da mesma facção, tipo e custo):

- **Athena Seal Control** (33 → 41): −3 Ophiuchus Shaina, −2 Ophiuchus Silver Cloth, −3 Dragon Shiryu; +3 Eagle Marin, +2 Hound Asterion, +1 Pegasus Cloth V2, +1 Phoenix Cloth V2, +1 Perseus Silver Cloth. Hyoga e a Cygnus Cloth V2 ficam.
- **Ares Glorious Demise** (33 → 40): −3 Alceu of Lamassu, −2 Iseu of Python, −2 Catreu of Akephalos; +3 Red Fire Legion Raider, +3 Merciless Spearman, +1 Divine Flame Tactician.
- **Artemis Hunt** (34 → 40): −2 The Great Lunar Hound, −2 The Wrath of Artemis, −1 Calisto, −1 Primal Forest Champion; +3 Ancient Grove Treant, +2 Oath of the Seven Huntresses, +1 Primal Forest Guardian.

## 4. Cartas que perdem Cosmoble

Pontuação do critério acima (maior = mais forte); "ramp" = perde por gerar mana. A 019 Pegasus God Cloth já não era Cosmoble.

### Athena (26)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 089 | The Wall Of Lamentation | Spell | 6 | Divine | 11.9 |
| 017 | Aquarius Camus | Devotee | 5 | Legendary | 9.9 |
| 090 | The Will Of Athena | Spell | 6 | Divine | 9.1 |
| 084 | Hyoga’S Absolute Zero | Spell | 5 | Legendary | 9.1 |
| 019 | Pegasus God Cloth (Kamui) | Equipment | 6 | Legendary | 8.5 |
| 086 | Deprived Of Senses | Spell | 6 | Legendary | 8.1 |
| 020 | Athena’S Shield | Equipment | 4 | Divine | 8.1 |
| 015 | Leo Aiolia | Devotee | 5 | Legendary | 7.9 |
| 085 | Shiryu’S Last Dragon | Spell | 6 | Legendary | 7.8 |
| 088 | The Eighth Sense | Spell | 5 | Legendary | 7.4 |
| 011 | Aries Mu | Devotee | 5 | Legendary | 7.2 |
| 080 | The Return Of The Phoenix | Spell | 5 | Legendary | 7.1 |
| 013 | Gemini Saga | Devotee | 6 | Legendary | 6.4 |
| 087 | Seiya Raises Athena’S Shield | Spell | 5 | Legendary | 6.4 |
| 006 | Cygnus Cloth V2 | Equipment | 3 | Uncommon | 6.4 |
| 078 | Freezing Coffin | Spell | 4 | Uncommon | 5.6 |
| 016 | Leo Gold Cloth | Equipment | 4 | Uncommon | 5.6 |
| 018 | Aquarius Gold Cloth | Equipment | 4 | Uncommon | 5.6 |
| 075 | Cerberus Dante | Devotee | 4 | Uncommon | 4.9 |
| 005 | Cygnus Hyoga | Devotee | 3 | Uncommon | 4.9 |
| 022 | Ophiuchus Shaina | Devotee | 3 | Uncommon | 4.9 |
| 057 | Kiki’S Telekinesis | Spell | 2 | Common | 4.9 |
| 012 | Aries Gold Cloth | Equipment | 4 | Uncommon | 4.9 |
| 067 | Ophiuchus Silver Cloth | Equipment | 3 | Uncommon | 4.9 |
| 082 | The Golden Arrow | Spell | 1 | Legendary | 4.7 |
| 003 | Dragon Shiryu | Devotee | 3 | Uncommon | 4.4 |

### Poseidon (25)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 178 | Poseidon'S Trident | Equipment | 6 | Divine | 13.6 |
| 171 | The Emperor'S Decree | Spell | 6 | Legendary | 12.0 |
| 180 | The Great Flood | Spell | 7 | Divine | 11.6 |
| 091 | Sea Dragon Kanon | Devotee | 6 | Legendary | 10.6 |
| 169 | The Eternal Iceberg | Spell | 6 | Legendary | 10.6 |
| 172 | Poseidon'S Awakening | Spell | 6 | Legendary | 10.6 |
| 175 | The Unending Deluge | Spell | 6 | Legendary | 10.6 |
| 179 | The Main Breadwinner | Spell | 6 | Divine | 10.6 |
| 174 | The Wrath Of The Seven Seas | Spell | 6 | Legendary | 9.9 |
| 095 | Seahorse Baian | Devotee | 5 | Legendary | 9.9 |
| 097 | Kraken Isaac | Devotee | 5 | Legendary | 9.1 |
| 173 | The Fall Of Atlantis | Spell | 6 | Legendary | 8.6 |
| 162 | Galactic Illusion | Spell | 5 | Uncommon | 8.1 |
| 166 | The Golden Triangle | Spell | 5 | Uncommon | 8.1 |
| 101 | Julian Solo, The Chosen Vessel | Devotee | 3 | Uncommon | 8.1 |
| 093 | Siren Sorrento | Devotee | 5 | Legendary | 7.9 |
| 154 | The Sea Dragon'S Command | Spell | 3 | Uncommon | 7.8 |
| 176 | The Will Of The Ocean | Spell | 6 | Legendary | 7.1 |
| 177 | The Emperor'S Return | Spell | 6 | Legendary | 7.1 |
| 151 | Dead End Symphony | Spell | 4 | Uncommon | 7.1 |
| 153 | Aurora Borealis | Spell | 4 | Uncommon | 7.1 |
| 161 | The Unbroken Tide | Spell | 4 | Uncommon | 7.1 |
| 140 | Marina'S Oath | Spell | 2 | Common | 6.3 |
| 163 | Dead End Climax | Spell | 5 | Uncommon | 6.1 |
| 168 | The Northern Storm | Spell | 5 | Uncommon | 5.9 |

### Hades (26)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 268 | The Eternal Sleep | Spell | 7 | Legendary | 10.6 |
| 200 | Pandora'S Box | Equipment | 6 | Divine | 10.6 |
| 270 | The Greatest Eclipse | Spell | 7 | Divine | 9.1 |
| 199 | Hades' Sword | Equipment | 5 | Divine | 9.1 |
| 267 | The Sword That Pierces Athena | Spell | 6 | Legendary | 8.6 |
| 191 | Hypnos, God Of Sleep | Devotee | 7 | Legendary | 8.4 |
| 193 | Thanatos, God Of Death | Devotee | 7 | Legendary | 8.4 |
| 181 | Wyvern Rhadamanthys | Devotee | 5 | Legendary | 8.4 |
| 185 | Garuda Aiacos | Devotee | 5 | Legendary | 8.4 |
| 195 | Pandora | Devotee | 5 | Legendary | 7.9 |
| 192 | Eternal Slumber | Spell | 5 | Uncommon | 7.4 |
| 253 | Capricorn Shura, The Resurrected Saint | Devotee | 5 | Uncommon | 7.4 |
| 266 | The Fall Of The Sanctuary | Spell | 7 | Legendary | 7.1 |
| 269 | The Death Of Thanatos | Spell | 6 | Legendary | 7.1 |
| 197 | Aries Shion, The Resurrected Saint | Devotee | 6 | Legendary | 6.4 |
| 183 | Griffon Minos | Devotee | 5 | Legendary | 6.4 |
| 265 | The Possession Of Shun | Spell | 5 | Legendary | 6.4 |
| 263 | The Three Judges Of Hell | Spell | 5 | Uncommon | 6.1 |
| 255 | Gemini Saga, The Resurrected Saint | Devotee | 6 | Uncommon | 5.9 |
| 261 | Pandora’S Goodbye | Spell | 4 | Uncommon | 5.8 |
| 262 | The Destruction Of The Gold Cloths | Spell | 4 | Uncommon | 5.6 |
| 194 | Divine Touch Of Death | Spell | 3 | Uncommon | 5.6 |
| 203 | Papillon Myu | Devotee | 5 | Uncommon | 5.4 |
| 256 | The Betrayal Of The Gold Saints | Spell | 4 | Uncommon | 5.1 |
| 258 | The Judgment Of Minos | Spell | 4 | Uncommon | 5.1 |
| 189 | Acheron Charon | Devotee | 3 | Uncommon | 4.9 |

### Ares (26)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 271 | Ethon Alcmenes | Devotee | 5 | Divine | 11.9 |
| 360 | The Endless Holy War | Spell | 9 | Legendary | 10.6 |
| 275 | Lamassu Lior | Devotee | 5 | Divine | 10.4 |
| 358 | The God Of War Awakens | Spell | 5 | Legendary | 9.4 |
| 289 | Enyo, Spear Of Destruction | Equipment | 5 | Legendary | 9.1 |
| 290 | Shield Of The War God | Equipment | 4 | Legendary | 8.1 |
| 273 | Ouroboros Ofir | Devotee | 4 | Divine | 7.4 |
| 345 | Berserker Of The Apocalypse | Devotee | 4 | Legendary | 7.4 |
| 351 | Azure, The Blue Death | Spell | 3 | Legendary | 7.4 |
| 352 | The Bloody Rain | Spell | 4 | Legendary | 6.7 |
| 353 | The Four Legions Of War | Spell | 5 | Legendary | 6.4 |
| 285 | Arionte Of Anfista | Devotee | 3 | Uncommon | 6.4 |
| 277 | Lamia Lotis | Devotee | 4 | Legendary | 6.1 |
| 359 | The Apocalypse Of Ares | Spell | 5 | Legendary | 5.7 |
| 343 | Disaster Wing Assassin | Devotee | 2 | Uncommon | 5.7 |
| 344 | Nightmare Weaver | Devotee | 3 | Uncommon | 5.6 |
| 302 | Berserker Champion | Devotee | 4 | Uncommon | 4.9 |
| 309 | Ares' Royal Guard | Devotee | 4 | Uncommon | 4.9 |
| 341 | Crimson Fire Guardian | Devotee | 4 | Uncommon | 4.9 |
| 354 | The Fall Of Ikki | Spell | 4 | Uncommon | 4.9 |
| 355 | The Fury Of The War God | Spell | 4 | Uncommon | 4.9 |
| 279 | Iseu Of Python | Devotee | 3 | Uncommon | 4.9 |
| 281 | Catreu Of Akephalos | Devotee | 3 | Uncommon | 4.9 |
| 283 | Alceu Of Lamassu | Devotee | 3 | Uncommon | 4.9 |
| 287 | Basil Of Manticore | Devotee | 3 | Uncommon | 4.9 |
| 356 | Athena'S Desperate Defense | Spell | 3 | Uncommon | 4.9 |

### Artemis (26)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 371 | Chandra | Devotee | 3 | Legendary | ramp |
| 386 | Moonlit Initiate | Devotee | 1 | Common | ramp |
| 396 | Forest Spirit | Devotee | 1 | Common | ramp |
| 397 | Sacred Grove Dryad | Devotee | 1 | Common | ramp |
| 414 | Moonstone Amulet | Equipment | 2 | Common | ramp |
| 417 | Nature'S Awakening | Spell | 2 | Common | ramp |
| 420 | Blessing Of The Moon | Spell | 3 | Common | ramp |
| 421 | Primal Growth | Spell | 1 | Common | ramp |
| 423 | Roots Of The Ancient World | Spell | 3 | Common | ramp |
| 437 | The Second Moon Guardian | Devotee | 4 | Uncommon | ramp |
| 439 | The Fourth Moon Guardian | Devotee | 5 | Legendary | ramp |
| 444 | The Forest Invades Sanctuary | Spell | 5 | Uncommon | ramp |
| 447 | The Fall Of Daphne And Hermia | Spell | 3 | Uncommon | ramp |
| 450 | The World Reclaimed | Spell | 6 | Legendary | ramp |
| 435 | Silver Arrow Commander | Devotee | 5 | Divine | 12.6 |
| 440 | The Fifth Moon Guardian | Devotee | 7 | Divine | 11.6 |
| 369 | Satyr | Devotee | 6 | Divine | 9.9 |
| 385 | The Great Lunar Hound | Devotee | 6 | Legendary | 9.4 |
| 433 | Primal Forest Champion | Devotee | 6 | Legendary | 7.9 |
| 361 | Calisto | Devotee | 5 | Legendary | 7.9 |
| 375 | The First Moon Guardian | Devotee | 5 | Legendary | 7.9 |
| 380 | The Silver Arrow Of The Moon | Equipment | 4 | Legendary | 7.6 |
| 373 | Selene, Titaness Of The Moon | Devotee | 7 | Legendary | 7.1 |
| 379 | Artemis' Divine Bow | Equipment | 5 | Legendary | 7.1 |
| 377 | Chloris, Spirit Of Blossoms | Devotee | 4 | Legendary | 6.9 |
| 449 | The Wrath Of Artemis | Spell | 5 | Legendary | 5.7 |

### Neutral (15)

| # | Carta | Tipo | Custo | Raridade | Motivo |
| --- | --- | --- | --- | --- | --- |
| 478 | Universal Cosmo Crystal | Equipment | 4 | Common | ramp |
| 493 | Cosmo Converter | Equipment | 4 | Uncommon | ramp |
| 496 | Cosmo Extraction | Spell | 5 | Uncommon | ramp |
| 456 | Jango | Devotee | 6 | Legendary | 9.1 |
| 471 | Geist, Phantom Queen | Devotee | 6 | Legendary | 9.1 |
| 480 | Divine Judgment | Spell | 7 | Legendary | 8.4 |
| 495 | Forced Exile | Spell | 7 | Legendary | 8.4 |
| 500 | The Eighth Sense | Spell | 8 | Legendary | 8.1 |
| 499 | Humanity'S Defiance | Spell | 6 | Legendary | 8.1 |
| 477 | Desperate Resurrection | Spell | 7 | Legendary | 6.4 |
| 455 | Black Phoenix | Devotee | 6 | Uncommon | 5.9 |
| 452 | Black Dragon | Devotee | 5 | Uncommon | 5.9 |
| 482 | Ohko, The Fallen Dragon | Devotee | 4 | Uncommon | 5.6 |
| 479 | Forbidden Knowledge | Spell | 5 | Uncommon | 5.4 |
| 486 | Agora, Lotus Saint | Devotee | 5 | Uncommon | 5.4 |
