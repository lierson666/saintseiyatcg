# Hades → Preto (Midrange + Reanimator) — diff proposto

Status: **aprovado pelo autor e gravado** (31/10/2026) em `data/cards.json`, `card-forge/art-web/cards.json` e no `engine-v3`. Base: o guia vigente, `docs/meta-premodern.md`, o rebalanceamento de Hades de 30/10/2026 (`docs/rebalanceamento-hades-2026-10-30/`) e as decisões do autor de 31/10/2026 descritas abaixo.

## 1. Decisões do autor (31/10/2026)

- **O Seal fica só em Hypnos** (191, 192, 268), como os Saints do gelo em Athena. Nas outras 7 cartas, o Seal vira efeito de Preto: −X/−X ou "can't declare a Strike".
- **240 vira o Animate Dead.** Devolve qualquer Devotee do seu Tartarus, sem teto de custo, por c3 e {3}{S}. O 260 continua como a reanimação grande com bônus; o 232 mantém o teto dos Specters.
- **Remoção dura mais barata:** 194 c3 (Technique) e 262 c4.
- **Discard cedo:** 239 c1 (Duress) e 257 c2 (Thoughtseize). Os dois mantêm o custo de Soul.
- **265 deixa de ser o Threaten** (papel de Ares) e vira reanimação do Tartarus do oponente.
- **Topo mais barato:** 269 c6, 270 c7 (sem o sacrifício final) e 199 c5. O 266 (wrath simétrico, c7) fica.

As taxas de Soul e os cortes da curva de 30/10/2026 ficam como estão.

## 2. Cartas alteradas (16)

### Seal → Preto

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 183 | Griffon Minos | Cosmic Marionation: {1}{S}, 2 Seal; Puppet Master: Seal removido tira {1}{S} | *Cosmic Marionation — When Griffon Minos enters the battlefield, you may pay {1}{S}. If you do, target enemy Devotee gets -2 ATK / -2 HP until the end of the round.* *Puppet Master — Whenever an enemy Devotee is defeated during your turn, its controller loses {1}{S}.* | Seal só em Hypnos |
| 184 | Griffon Surplice | Resonance: 1 Seal ao declarar Strike | *Resonance — Minos: Once each round, when Griffon Minos declares a Strike, target enemy Devotee gets -1 ATK / -1 HP until the end of the round.* | Idem |
| 209 | Worm Raimi | Worm's Bind: {1}{S}, 1 Seal; +2 ATK contra Sealed | *Worm's Bind — When Worm Raimi enters the battlefield, you may pay {1}{S}. If you do, target enemy Devotee gets -1 ATK / -1 HP until the end of the round.* *Underground Ambush — Whenever Worm Raimi Strikes a damaged Devotee, Worm Raimi gets +2 ATK until the end of the round.* | Idem |
| 216 | Gorgon Ox | Petrifying Gaze: {1}{S}, 1 Seal; Stone Curse: −2 ATK em Sealed | *Petrifying Gaze — When Gorgon Ox enters the battlefield, you may pay {1}{S}. If you do, target enemy Devotee can't declare a Strike during its controller's next turn.* *Stone Curse — Once each round, whenever Gorgon Ox Strikes, the defending Devotee gets -2 ATK during that Strike.* | Idem (Pacifism, como o Dante de Athena) |
| 229 | Underworld Shackles | ETB: 1 Seal; Cursed Chains: 1 Seal | *Eternal Binding — When Underworld Shackles enters the battlefield, target enemy Devotee gets -1 ATK / -1 HP until the end of the round.* *Cursed Chains — Whenever equipped Devotee defeats an enemy Devotee in combat, another target enemy Devotee gets -1 ATK / -1 HP until the end of the round.* | Idem |
| 254 | Aquarius Camus | Diamond Dust: {1}{S}, 2 Seal; Aurora Execution: último Seal tira {2}{S} | *Diamond Dust — When Aquarius Camus enters the battlefield, you may pay {1}{S}. If you do, target enemy Devotee can't declare a Strike during its controller's next turn.* *Aurora Execution — Once each round, whenever an enemy Devotee is defeated, its controller loses {1}{S} and your God gains {1}{S}.* | Idem |
| 258 | The Judgment of Minos | c4; 2 Seal; −2/−2 com Judge; compra 1 | c4; *Target enemy Devotee gets -2 ATK / -2 HP until the end of the round. If you control a Judge Specter, it gets -4 ATK / -4 HP instead. Draw 1 card.* | Idem |

### Reanimate

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 240 | The Return from Death | Moment c4; Devotee de custo ≤4; {2}{S} | **Technique c3**; *Return target Devotee from your Tartarus to the battlefield Unprepared. It cannot declare a Strike this round. Your God loses {3}{S}.* | Animate Dead: o Reanimator traz Hypnos e Thanatos cedo |
| 265 | The Possession of Shun | Moment c6; rouba e prepara até o fim do Round | **Technique c5**; *Return target Devotee from an opponent's Tartarus to the battlefield under your control Unprepared. Your God loses {3}{S}.* | Threaten é de Ares; reanimar do inimigo é Preto |

### Remoção e discard

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 194 | Divine Touch of Death | Technique c5 | **c3**; texto igual | Dark Banishing |
| 262 | The Destruction of the Gold Cloths | Moment c5 | **c4**; texto igual | Remoção dura no padrão |
| 239 | The Whispers of Pandora | c2 | **c1**; texto igual | Duress |
| 257 | The Trial of the Dead | c3 | **c2**; texto igual | Thoughtseize |

### Topo

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 269 | The Death of Thanatos | c8 | **c6**; texto igual (inclui o {4}{S}) | Custo no padrão |
| 270 | The Greatest Eclipse | c9; termina com "each opponent sacrifices 2 Devotees" | **c7**; o sacrifício final sai; o resto igual | Idem |
| 199 | Hades' Sword | c7 | **c5**; texto igual | Idem |

## 3. Lista de referência — Hades Midrange (Mono-Black, máx. 3 cópias)

God **HADES** · Domain **HADES CASTLE** (242)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Custo 1–2 | 218 Underworld Skeleton ×3 · 220 Wandering Soul ×2 · 217 Dullahan Cube ×3 · 206 Skeleton Markino ×2 · 221 Styx Soul Herder ×2 | 12 |
| Custo 3 | 215 Alraune Queen ×3 · 209 Worm Raimi ×2 · 216 Gorgon Ox ×2 · 219 Hades' Royal Guard ×2 | 9 |
| Custo 4 | 201 Harpy Valentine ×2 · 202 Balron Lune ×2 · 213 Lycaon Phlegyas ×2 · 252 Pisces Aphrodite ×2 · 251 Cancer Deathmask ×2 | 10 |
| Custo 5+ | 181 Wyvern Rhadamanthys ×2 · 193 Thanatos ×1 | 3 |
| Remoção | 194 Divine Touch of Death ×3 · 237 The Ferryman's Price ×3 · 241 The Will of Hades ×3 · 262 The Destruction of the Gold Cloths ×2 | 11 |
| Discard | 239 The Whispers of Pandora ×3 · 257 The Trial of the Dead ×3 | 6 |
| Valor | 238 Souls of the Damned ×2 · 240 The Return from Death ×2 · 234 Death Is Only the Beginning ×2 · 226 Chain of the Damned ×2 · 269 The Death of Thanatos ×1 | 9 |
| **Total** | | **60** |

A lista Reanimator (God Hades + Domain Poseidon) fica para a etapa das duplas.

## 4. Depois da aprovação

1. Gravar as 16 cartas em `data/cards.json` e em `card-forge/art-web/cards.json`.
2. Motor (`playtest/engine-v3/v6/hades.js`): Seal → −X/−X ou "can't declare a Strike" (183, 184, 209, 216, 229, 254, 258); 240 sem teto de custo; 265 reanima do Tartarus do oponente; 270 sem o sacrifício. Testes em `tools/test-engine-v3-v6-hades*.mjs`.
3. Deck "Hades Midrange" em `data/alpha-0.1/decks-competitivos.json`.
4. Changelog e commit.
