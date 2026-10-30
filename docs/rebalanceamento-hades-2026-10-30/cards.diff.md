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

## Terceira leva — diagnóstico e proposta (30/10/2026, aguardando OK do diff)

Diagnóstico (round-robin de bots, 8 jogos por par; experimentos em cópia):

- Todos os efeitos de carta de Hades desligados (só stats + God): specter 66%, carnage 59%, aristocrats 52%. O corpo já ganha.
- −1 HP nos Devotees de custo ≥ 3: specter 90 → 84%, aristocrats 72 → 63%; sem efeitos, specter 43%.
- Gatilhos de morte: individualmente (181, 201, 205, 215) não mexem; o Domain Hades Castle (Dark Authority) sim. Com −1 HP: intacto 84%, só o inimigo perde 75%, só você ganha 77%, desligado 66%.
- ETB, Spells e Offering of Life pesam pouco.

Decisões do autor: −1 HP em todos os Devotees de Hades de custo ≥ 3 (inclui os já cortados); Hades Castle — só o inimigo perde 1 Soul; retunar os decks de Hades (carnage incluído) até < 60%.

### HP (−1)

| Carta | Custo | Antes | Depois |
| --- | --- | --- | --- |
| hades-v6-189 Acheron Charon | 3 | 2/4 | **2/3** |
| hades-v6-209 Worm Raimi | 3 | 2/4 | **2/3** |
| hades-v6-215 Alraune Queen | 3 | 3/3 | **3/2** |
| hades-v6-216 Gorgon Ox | 3 | 3/3 | **3/2** |
| hades-v6-219 Hades' Royal Guard | 3 | 2/4 | **2/3** |
| hades-v6-223 Elysium Servant | 3 | 2/4 | **2/3** |
| hades-v6-187 Sphinx Pharaoh | 4 | 3/5 | **3/4** |
| hades-v6-201 Harpy Valentine | 4 | 4/4 | **4/3** |
| hades-v6-202 Balron Lune | 4 | 3/5 | **3/4** |
| hades-v6-204 Deep Niobe | 4 | 2/4 | **2/3** |
| hades-v6-205 Basilisk Sylphid | 4 | 4/3 | **4/2** |
| hades-v6-208 Cyclops Giganto | 4 | 4/4 | **4/3** |
| hades-v6-210 Golem Rock | 4 | 4/4 | **4/3** |
| hades-v6-212 Deadly Beetle Stand | 4 | 4/4 | **4/3** |
| hades-v6-213 Lycaon Phlegyas | 4 | 5/3 | **5/2** |
| hades-v6-214 Minotaur Gordon | 4 | 4/4 | **4/3** |
| hades-v6-222 Underworld Executioner | 4 | 4/3 | **4/2** |
| hades-v6-251 Cancer Deathmask | 4 | 4/4 | **4/3** |
| hades-v6-252 Pisces Aphrodite | 4 | 3/5 | **3/4** |
| hades-v6-181 Wyvern Rhadamanthys | 5 | 5/5 | **5/4** |
| hades-v6-183 Griffon Minos | 5 | 3/7 | **3/6** |
| hades-v6-185 Garuda Aiacos | 5 | 6/4 | **6/3** |
| hades-v6-195 Pandora | 5 | 2/6 | **2/5** |
| hades-v6-203 Papillon Myu | 5 | 3/5 | **3/4** |
| hades-v6-211 Troll Iwan | 5 | 3/3 | **3/2** |
| hades-v6-253 Capricorn Shura | 5 | 5/4 | **5/3** |
| hades-v6-254 Aquarius Camus | 5 | 4/5 | **4/4** |
| hades-v6-197 Aries Shion | 6 | 5/6 | **5/5** |
| hades-v6-255 Gemini Saga | 6 | 6/6 | **6/5** |
| hades-v6-191 Hypnos | 7 | 5/8 | **5/7** |
| hades-v6-193 Thanatos | 7 | 7/6 | **7/5** |

### Domain

| Carta | Antes | Depois |
| --- | --- | --- |
| hades-v6-242 Hades Castle — Dark Authority | Once each round, whenever a friendly Specter is defeated, target enemy God loses 1 Soul and your God gains 1 Soul. | Once each round, whenever a friendly Specter is defeated, target enemy God loses 1 Soul. |

## Terceira leva — aplicada e medida (30/10/2026)

Gravado: −1 HP nos 31 Devotees de custo ≥ 3; Hades Castle (Dark Authority) só tira 1 Soul do God inimigo. Bots, round-robin completo, 8 partidas por par.

| Deck | Antes da 3ª leva | 3ª leva, decks antigos | 3ª leva + retuno |
| --- | --- | --- | --- |
| Hades Specter Midrange | 84% | 75% | 67% |
| Underworld Carnage | 74% | 78% | 57% |
| Hades Aristocrats | 62% | 58% | 61% |
| Hades Reanimator | — | 57% | 55% |
| Hades Black Saints | — | 46% | 45% |

Retuno dos decks (`data/alpha-0.1/decks-competitivos.json`):

- **Underworld Carnage:** sai The Will of Hades ×2, The Crimson Fire ×2, Burn It All ×1, Basilisk Sylphid ×2, Underworld Executioner ×2, Harpy Valentine ×2, Deadly Beetle Stand ×2, Minotaur Gordon ×2; entram Underworld Skeleton ×2, Skeleton Markino ×2, Frog Zeros ×3, River Styx Ferryman ×2, +1 Disaster Legion Berserker, +1 Disaster Legion Destroyer, +1 Suicidal Berserker, +1 Raging Hoplite, +1 Wandering Soul, +1 Catreu of Akephalos.
- **Hades Specter Midrange:** mantém Hades Castle; sai The Will of Hades ×3, The Judgment of Minos ×2, The Destruction of the G… ×2, The Sword That Pierces… ×1, Hades' Sword ×1, Wyvern Rhadamanthys ×2, Garuda Aiacos ×2, Papillon Myu ×2, Balron Lune ×2; entram Skeleton Markino ×3, Frog Zeros ×3, Underworld Skeleton ×3, Wandering Soul ×3, River Styx Ferryman ×3, Golem Rock ×2.

Specter segue acima de 60%. Só com deck, o melhor foi 60% trocando o domain para The First Prison, o que tira a identidade do deck. Decisão do autor (30/10/2026): aceitar ~65% por ora; Specter volta numa próxima leva de cartas. Aristocrats oscila entre 58% e 61% (ruído de 112 partidas, ±5 p.p.).
