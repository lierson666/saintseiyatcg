# Rebalanceamento de Hades (V6) — diff para aprovação

Decisões do autor (grilling de 30/10/2026):

- Alavanca: "ambos, leve" (stats + ETB), mesmo caminho do Ares.
- Stats: meio-termo entre Athena e Ares. −1 (de preferência HP) nos Devotees de custo 3 a 6 com ATK+HP ≥ 2×custo+1.
- ETB: "you may pay N Soul. If you do, …". Remoção (defeat/exile) custa 2 Soul; −X/−X, Seal e dreno de Soul custam 1 Soul.
- ETB que já tem custo (Soul ou sacrifício) fica como está.
- Medição: round-robin de bots (meta: Hades < 60%), retuno dos 3 decks de Hades, depois playtest do autor.

Antes → depois da média de ATK+HP por custo: 3: 6.4 → 6.0 · 4: 8.2 → 7.8 · 5: 9.3 → 9.1 · 6: 11.5 (sem mudança).

## Stats (−1)

| Carta | Custo | Antes | Depois |
| --- | --- | --- | --- |
| hades-v6-211 Troll Iwan | 3 | 4/3 | **3/3** |
| hades-v6-216 Gorgon Ox | 3 | 3/4 | **3/3** |
| hades-v6-219 Hades' Royal Guard | 3 | 2/5 | **2/4** |
| hades-v6-208 Cyclops Giganto | 4 | 5/4 | **4/4** |
| hades-v6-210 Golem Rock | 4 | 4/5 | **4/4** |
| hades-v6-212 Deadly Beetle Stand | 4 | 4/5 | **4/4** |
| hades-v6-214 Minotaur Gordon | 4 | 5/4 | **4/4** |
| hades-v6-181 Wyvern Rhadamanthys | 5 | 5/6 | **5/5** |

## ETB com taxa de Soul

| Carta | Habilidade | Taxa | Depois |
| --- | --- | --- | --- |
| hades-v6-181 Wyvern Rhadamanthys | Greatest Caution | 2 | When Wyvern Rhadamanthys enters the battlefield, **you may pay 2 Soul. If you do,** defeat target Devotee. |
| hades-v6-193 Thanatos | Terrible Providence | 2 | …enters the battlefield, **you may pay 2 Soul. If you do,** defeat target enemy Devotee. |
| hades-v6-253 Capricorn Shura | Excalibur | 2 | …enters the battlefield, **you may pay 2 Soul. If you do,** defeat target enemy Devotee with 3 HP or less. |
| hades-v6-255 Gemini Saga | Another Dimension | 2 | …enters the battlefield, **you may pay 2 Soul. If you do,** exile target enemy Devotee until Gemini Saga leaves the battlefield. |
| hades-v6-191 Hypnos | Eternal Drowsiness | 2 (\*) | …enters the battlefield, **you may pay 2 Soul. If you do,** put 2 Seal counters on each enemy Devotee. |
| hades-v6-204 Deep Niobe | Deep Fragrance | 1 | …enters the battlefield, **you may pay 1 Soul. If you do,** target enemy Devotee gets -3 ATK / -3 HP until the end of the round. |
| hades-v6-251 Cancer Deathmask | Seki Shiki Meikai Ha | 1 | idem, -3/-3 |
| hades-v6-213 Lycaon Phlegyas | Howling Inferno | 1 | idem, -2/-2 |
| hades-v6-252 Pisces Aphrodite | Bloody Rose | 1 | idem, -2/-2 |
| hades-v6-183 Griffon Minos | Cosmic Marionation | 1 | …**you may pay 1 Soul. If you do,** put 2 Seal counters on target enemy Devotee. |
| hades-v6-254 Aquarius Camus | Diamond Dust | 1 | idem, 2 Seal |
| hades-v6-209 Worm Raimi | Worm's Bind | 1 | idem, 1 Seal |
| hades-v6-216 Gorgon Ox | Petrifying Gaze | 1 | idem, 1 Seal |
| hades-v6-187 Sphinx Pharaoh | Balance of Curse | 1 | …**you may pay 1 Soul. If you do,** target enemy God loses 2 Soul and your God gains 2 Soul. |
| hades-v6-201 Harpy Valentine | Greed the Life | 1 | idem |

(\*) Hypnos é efeito em massa: proposta de 2 Soul, não 1.

## Ficam como estão

- Já têm custo: 189 Acheron Charon, 195 Pandora, 203 Papillon Myu, 215 Alraune Queen, 221 River Styx Ferryman (Soul); 210 Golem Rock, 211 Troll Iwan, 222 Underworld Executioner (sacrifício).
- Sem remoção: 185 Garuda Aiacos, 197 Aries Shion (volta do Tartarus ao campo), 202 Balron Lune (descarte), 206, 220, 223 Elysium Servant (+2 Soul).
- 217 Dullahan Cube (custo 2, dreno 1/1): sem taxa, por ser barato.

## Segunda leva (aprovada em 30/10/2026)

- Remoção total sobe para 3 Soul: 181 Greatest Caution, 193 Terrible Providence, 253 Excalibur, 255 Another Dimension.
- −3/−3 sobe para 2 Soul: 204 Deep Fragrance, 251 Seki Shiki Meikai Ha.

## Medição (round-robin de bots, 1 compra por turno)

| Arquivo | Cenário | Hades specter | carnage | aristocrats | black saints | reanimator |
| --- | --- | --- | --- | --- | --- | --- |
| rr-hades-base.txt | Hades antigo (4 jogos/par) | 93% | 77% | 73% | 63% | 61% |
| rr-hades-nerf.txt | 1ª leva (4/par) | 91% | 79% | 68% | 55% | 48% |
| rr-hades-leva2.txt | 2ª leva (8/par) | 90% | 77% | 72% | 52% | 50% |
| rr-e1.txt | 1ª leva sem Offering of Life (4/par) | 86% | 59% | 89% | 68% | 66% |
| rr-e2.txt | 1ª leva com Soul 27 (4/par) | 88% | 82% | 70% | 70% | 68% |

Conclusão: a taxa nos ETB e o −1 de stats quase não mexem; o Offering of Life e a Soul inicial também não explicam. O motor do Hades está em outro lugar (Spells, Equipment/Surplice, Domain ou a composição dos decks) — falta diagnosticar.
