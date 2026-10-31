# Poseidon → Azul (Control + Marina) — diff proposto

Status: **aprovado pelo autor e gravado** (31/10/2026) em `data/cards.json`, `card-forge/art-web/cards.json` e no `engine-v3`. Base: o guia vigente, `docs/meta-premodern.md` e as decisões do autor de 31/10/2026 descritas abaixo.

## 1. Decisões do autor (31/10/2026)

- **Counters de resposta custam no máximo 3.** A resposta só pode ser paga com Latent, e o teto de Latent é 3. Um counter de custo 4 ou mais nunca anula nada no turno do oponente.
- **Cada counter diz o que anula.** Tudo vai à pilha (§56), então o counter cancela a jogada: Devotee, Equipment, Moment/Technique ou qualquer coisa. Quanto mais amplo o alcance, maior o custo adicional. O counter que anula qualquer coisa é o Force of Will: 3 de Latent, mais o God perde {3}{S} e você descarta uma carta da mão.
- **O discard do oponente sai de Poseidon** (é papel de Hades). Vira loot ("draw, then discard") ou mill.
- **Quebras do pie:** 165 e 174 deixam de causar dano; 101 Julian deixa de curar o God. O Domain 142 fica como foi rebalanceado em 31/10.
- **Marina (Merfolk):** dois lordes (103 e 118) e um Devotee de custo 1 (107).
- **Self-mill para o Reanimator:** 109 e 120 passam a dizer "target player" (você pode moer a si mesmo).

Mais duas propostas minhas, inclusas neste diff para você aprovar:
- **Spells caras descem**, como em Athena: 177 c6, 178 c6, 179 c6, 180 c7, 158 c4, 135 c2.
- **"discard pile" vira Tartarus** (158 e 177), que é o termo do guia.

## 2. Escada de counters

| Alcance | Carta | Custo | Custo adicional |
| --- | --- | --- | --- |
| Moment/Technique, "unless pays {2}" | 133 Call of the Ocean (Mana Leak) | c2 | — |
| Moment/Technique que mira coisa sua | 136 The Sea Never Forgives | c2 | — |
| Equipment | 156 Wall of Ocean Currents | c2 | — |
| Devotee | 159 The Seven Seas Answer | c3 | — |
| Moment/Technique, "unless pays {3}", ou bounce | 154 The Sea Dragon's Command | c3 | — |
| **Qualquer carta ou habilidade na pilha** | 167 Song of the Last Siren (Force of Will) | c3 | God perde {3}{S} e você descarta 1 carta |

Os counters de Devotee (117, 119, 121, 124) e o 171 (c6, só no próprio turno) ficam como estão.

## 3. Cartas alteradas (26)

### Counters

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 136 | The Sea Never Forgives | c3 | **c2**; texto igual | Counter condicional fica barato |
| 156 | Wall of Ocean Currents | c3; counter de Moment/Technique que mira coisa sua + bounce | **c2**; *Counter target enemy Equipment on the stack.* (Receding Wave sai) | Duplicava o 136; vira o counter de Equipment |
| 159 | The Seven Seas Answer | c4; Denial (counter Moment/Technique) ou Reversal (bounce Equipment) | **c3**; *Choose one: Denial — Counter target enemy Devotee on the stack. Reversal — Return target enemy Equipment to its owner's hand.* | Counter de Devotee (Essence Scatter); cabe no teto de Latent |
| 154 | The Sea Dragon's Command | c4 | **c3**; texto igual | Cabe no teto de Latent |
| 167 | Song of the Last Siren | c4; counter Moment/Technique + discard + Resonance | **c3**; *As an additional cost to cast this Moment, your God loses {3}{S} and you discard a card. Counter target enemy card or ability on the stack.* | Force of Will: anula qualquer coisa, com drawback forte |

### Discard → loot ou mill

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 093 | Siren Sorrento | Dead End Climax: o God atingido descarta | *Dead End Climax — Whenever Siren Sorrento deals Strike damage to an enemy God, that God's controller mills two cards.* | Discard é de Hades |
| 094 | Siren Scale | Resonance: descarta mais uma | *Resonance — Siren Sorrento: Whenever Siren Sorrento deals Strike damage to an enemy God, that God's controller mills two additional cards.* | Idem |
| 155 | The Siren's Lament | Enchanted Melody: descarta se Sealed | *Enchanted Melody — If that Devotee has a Seal counter, its controller mills two cards.* | Idem |
| 162 | Galactic Illusion | c5; Illusionary Control: revela a mão e descarta | c5; *Illusionary Control — Draw a card.* Bounce e Resonance iguais | Idem |
| 163 | Dead End Climax | Siren's Requiem: cada oponente descarta | *Siren's Requiem — Each opponent mills two cards.* | Idem |
| 173 | The Fall of Atlantis | Lost Beneath the Waves: cada oponente descarta | *Lost Beneath the Waves — If you control a Domain, draw a card.* | Idem |
| 175 | The Unending Deluge | Rising Pressure: descarta; The Deep Remembers: compra se descartou | *Rising Pressure — Each opponent who controls at least two Devotees with Seal counters mills two additional cards. The Deep Remembers — Draw a card.* | Idem |
| 180 | The Great Flood | c10; The Emperor's Wrath: cada oponente descarta dois | **c7**; *The Emperor's Wrath — If your God is Poseidon and is Awakened, draw two cards.* | Idem; custo no padrão |

### Quebras do pie

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 165 | Viking Tiger Claw | c5; 4 de dano, Seal se sobreviver, +2 com Isaac | **c3**; *Put 1 Seal counter on target enemy Devotee. It gets -2 ATK until the end of the round. Resonance — Kraken Isaac: If you control Kraken Isaac, put 1 additional Seal counter on it.* | Azul não destrói direto |
| 174 | The Wrath of the Seven Seas | c7; 5 de dano dividido | **c6**; *Oceanic Fury — Put 1 Seal counter on each enemy Devotee. Divine Retribution — If you control at least two Marina Generals, draw a card.* | Sleep: Seal em massa, sem dano |
| 101 | Julian Solo | The Emperor's Will: tira 1 de dano do God | *The Emperor's Will — Once each round, whenever an enemy Devotee becomes Sealed, you may pay {1}{C}. If you do, draw a card, then discard a card.* | Ganho de Soul não é Azul |

### Marina (Merfolk)

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 103 | Herald of the Seven Seas | c3 2/3; Royal Summons (busca Marina) + outras Marinas +0/+1 | c3 2/3; *Emperor's Authority — Other friendly Marina Devotees get +1 ATK / +1 HP.* (Royal Summons sai) | Lord of Atlantis |
| 118 | Marina Standard Bearer | Banner: outras Marinas +1 ATK ao defender | *Banner of the Emperor — Other friendly Marina Devotees get +1 ATK.* Rally the Marines igual | Segundo lorde, para atacar |
| 107 | Marina Spearman | c2 2/2 | **c1 2/1**; Tidal Thrust igual | Curva baixa (Devotee de custo 1, como os de Ares) |

### Self-mill

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 109 | Abyssal Watcher | ETB: target opponent mills two | *Eyes of the Abyss — When Abyssal Watcher enters the Battlefield, target player mills two cards.* | Enche o próprio Tartarus para o Reanimator |
| 120 | The Drowned Prophet | ETB: each opponent mills two | *Dark Revelation — When The Drowned Prophet enters the Battlefield, target player mills two cards.* Prophecy of the Abyss igual | Idem |

### Custo e termos

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 135 | Beneath the Surface | c3 | **c2**; texto igual | Impulse |
| 158 | The Awakening of Atlantis | c5; "from your discard pile" | **c4**; "from your **Tartarus**" | Custo no padrão; termo do guia |
| 177 | The Emperor's Return | c7; "from your discard pile" (duas vezes) | **c6**; "from your **Tartarus**" | Idem |
| 178 | Poseidon's Trident | c9 | **c6**; texto igual | Custo no padrão |
| 179 | The Main Breadwinner | c8 | **c6**; texto igual | Idem |

## 4. Listas de referência (máx. 3 cópias)

### Poseidon Control (Mono-U) — God **POSEIDON** · Domain **THE UNDERSEA SANCTUARY** (142)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Counters | 167 Song of the Last Siren ×3 · 159 The Seven Seas Answer ×3 · 133 Call of the Ocean ×3 · 154 The Sea Dragon's Command ×3 · 136 The Sea Never Forgives ×2 | 14 |
| Compra e filtro | 135 Beneath the Surface ×3 · 139 Whispers from the Abyss ×3 · 113 Atlantean Acolyte ×3 · 116 Pearl Sanctuary Keeper ×2 | 11 |
| Bounce e Seal | 132 The Rising Tide ×2 · 152 Marine Whirlwind ×2 · 137 Crushing Water Pressure ×2 · 174 The Wrath of the Seven Seas ×2 | 8 |
| Defesa | 105 Atlantean Sentinel ×3 · 110 Coral Reef Defender ×3 · 117 Ancient Sea Guardian ×2 · 119 Trident Temple Warden ×2 | 10 |
| Finalizadores | 091 Sea Dragon Kanon ×3 · 093 Siren Sorrento ×2 · 097 Kraken Isaac ×2 | 7 |
| Valor | 101 Julian Solo ×2 · 099 Mermaid Thetis ×2 · 171 The Emperor's Decree ×2 · 170 Atlantean Royal Scepter ×1 · 178 Poseidon's Trident ×1 · 179 The Main Breadwinner ×1 · 180 The Great Flood ×1 | 10 |
| **Total** | | **60** |

### Poseidon Marina (Merfolk) — God **POSEIDON** · Domain **THE NORTH ATLANTIC PILLAR** (143)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Custo 1–2 | 107 Marina Spearman ×3 · 106 Ocean Temple Guard ×3 · 115 Ocean Current Scout ×3 | 9 |
| Lordes | 103 Herald of the Seven Seas ×3 · 118 Marina Standard Bearer ×3 | 6 |
| Custo 3–4 | 108 Marina Vanguard ×3 · 111 Tidal Assailant ×3 · 112 Deep Sea Hunter ×3 · 099 Mermaid Thetis ×2 · 104 Royal Trident Guard ×2 · 121 Atlantean Trident Master ×2 | 15 |
| Generals | 095 Seahorse Baian ×2 · 093 Siren Sorrento ×2 | 4 |
| Equipment | 125 Oceanic Spear ×3 · 123 Atlantean Trident ×2 · 122 Cracked Marina Scale ×2 | 7 |
| Tempo | 132 The Rising Tide ×3 · 152 Marine Whirlwind ×3 · 133 Call of the Ocean ×3 · 159 The Seven Seas Answer ×2 · 167 Song of the Last Siren ×2 · 135 Beneath the Surface ×2 · 140 Marina's Oath ×2 · 136 The Sea Never Forgives ×2 | 19 |
| **Total** | | **60** |

## 5. Depois da aprovação

1. Gravar as 26 cartas em `data/cards.json` e em `card-forge/art-web/cards.json`.
2. Motor (`playtest/engine-v3/v6/poseidon.js`):
   - counter por alcance (Devotee e Equipment na pilha; 167 também habilidade), com `kit.counterSpell` aceitando habilidade;
   - custo adicional do 167 (perde {3}{S} e descarta);
   - discard → mill/loot, Seal em massa (174), lordes (103, 118), "target player" (109, 120).
   Testes em `tools/test-engine-v3-v6-poseidon*.mjs`.
3. Decks "Poseidon Control" e "Poseidon Marina" em `data/alpha-0.1/decks-competitivos.json`.
4. Changelog e commit.
