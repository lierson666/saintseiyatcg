# Proposta: cartas de Poseidon com as staples do azul (EDH)

Status: **aprovada pelo autor em 08/11/2026** e gravada em `data/cards.json`.
Data: 08/11/2026. Fonte: EDHREC, top cards de azul (json.edhrec.com/pages/top/blue.json).

Poseidon tem 95 cartas: 26 Devotees, 42 Spells, 17 Equipment, 9 Domains e o God.

## 1. Diagnóstico

Poseidon já faz o básico do azul: counter, bounce, Seal (o "tap down"), mill e looting. O problema é a repetição:

| Efeito repetido | Cartas |
| --- | --- |
| Devolver Devotee inimigo à mão | Kanon 091, 132, 134, 141, 150, 152, 154, 162, 164, 166, 173, 179, 180, 508, Pillar 143, Labyrinth 147 (16) |
| Seal counter | 097, 098, 101, 126, 137, 144, 153, 157, 165, 168, 169, 172, 174 (13) |
| −ATK durante o Strike | 093, 094, 095, 111, 129, 144, 147, 151, 155, 163 (10) |
| Prevenir dano de Strike | 096, 100, 104, 110, 122, 131, 145 (7) |
| Lorde de Marina | Herald 103, Standard Bearer 118 (2 quase iguais) |
| Olhar o topo e comprar | 135, 139, 115, 127 (4) |

## 2. Staples do azul e o que falta

| Arquétipo | Staples (EDHREC) | Em Poseidon hoje |
| --- | --- | --- |
| Counter | Counterspell, Arcane Denial, Swan Song, Negate | Sim (133, 136, 509, 154, 167, 171) |
| Counter de graça | Fierce Guardianship, Force of Will, Pact of Negation | Só 167 (paga vida) |
| Imposto que compra | Rhystic Study, Mystic Remora | **Não** |
| Imposto de ataque | Propaganda | Só −1 ATK (147) |
| Compra por feitiço | Archmage Emeritus | Só looting pago |
| Fichas por feitiço | Talrand, Sky Summoner | **Não** |
| Tutor | Mystical Tutor, Spellseeker | **Não** |
| Bounce em massa | Cyclonic Rift, Aetherize | Só 180 (custo 7) |
| Bounce que dá mana | Snap | **Não** |
| Clone | Phyrexian Metamorph, Spark Double | **Não** |
| Blink | Ghostly Flicker, Displacer Kitten | **Não** |
| Compra grande | Fact or Fiction, Treasure Cruise, Dig Through Time | **Não** |
| Wheel | Windfall | **Não** |
| Compra ao causar dano | Curiosity, Bident of Thassa | **Não** |
| Brainstorm/Ponder | Brainstorm, Ponder, Preordain | Sim (138, 139, 135) |

## 3. Proposta carta a carta (16)

Linhas com ⚠️ dependem de uma regra sua (§4).

### Devotees (7)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 109 Abyssal Watcher (1/3) | Mill 2 ao entrar | **Eyes of the Abyss** — Quando entra, procure no deck um Moment ou Technique de custo 2 ou menos, revele e ponha na mão. Embaralhe. | Spellseeker |
| 3 | 102 Priest of the Abyss (1/4) | Mill em cada feitiço | **Abyssal Tide** — Uma vez por rodada, quando você conjura um Moment ou Technique, compre 1 carta. | Archmage Emeritus |
| 3 | 103 Herald of the Seven Seas (2/3) | Lorde de Marina (igual à 118) | **Emperor's Authority** — Uma vez por rodada, quando você conjura um Moment ou Technique, crie um token Marina Soldier 1/1. | Talrand |
| 3 | 110 Coral Reef Defender (1/5, Guardian) | Previne 1 | Fica Guardian. **Coral Maze** — Devotees inimigos só declaram Strike contra o seu God se o controlador pagar {1}{C} por Devotee. | Propaganda |
| 3 | 116 Pearl Sanctuary Keeper (1/4) | Looting e prevenção | **Pearl Tide** — Uma vez por rodada, quando você conjura um Moment ou Technique, você pode tirar outro Devotee aliado alvo do Campo de Batalha e devolvê-lo em seguida, Unprepared. | Displacer Kitten ⚠️ |
| 4 | 104 Royal Trident Guard (2/5, Guardian) | Previne 1 | **Mirror of the Sea** — Você pode fazer o Royal Trident Guard entrar como cópia de outro Devotee no Campo de Batalha, mas ele continua Marina. | Phyrexian Metamorph ⚠️ |
| 4 | 120 The Drowned Prophet (1/3) | Compra quando o oponente faz mill | **Prophecy of the Abyss** — Sempre que um oponente conjura um Moment ou Technique, compre 1 carta, a menos que ele pague {1}{C}. | Rhystic Study |

### Equipment (1)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 2 | 129 Sea Serpent Fang | +1 ATK e −1 ATK | +1 ATK. **Serpent's Wisdom** — Sempre que o Devotee equipado causa dano de Strike a um God inimigo, compre 1 carta. | Curiosity |

### Spells (8)

| Custo | Carta | Hoje | Proposta | Staple |
| --- | --- | --- | --- | --- |
| 1 | 135 Beneath the Surface | Olha 1 e compra | **Beneath the Surface** — Procure no deck um Moment ou Technique, revele, embaralhe e ponha-o no topo. | Mystical Tutor |
| 2 | 136 The Sea Never Forgives | Counter só se mirar você | Counter o Moment ou Technique inimigo alvo. Se você controla um Marina General, custa {0}. | Fierce Guardianship |
| 2 | 134 Waves of Destruction (Technique 3 → Moment 2) | Bounce de ATK ≤ 3 | Devolva o Devotee ou Equipment inimigo alvo. Se pagar {5}{C} a mais, devolva todos os Devotees e Equipment inimigos. | Cyclonic Rift |
| 3 | 152 Marine Whirlwind | Bounce e auto-bounce | Devolva o Devotee alvo à mão do dono. Prepare até 2 Cosmo Bases suas. | Snap |
| 4 | 162 Galactic Illusion (era 5) | Bounce e compra | Revele as 5 do topo. Um oponente separa em 2 pilhas. Ponha uma na mão e a outra no seu Tartarus. | Fact or Fiction |
| 4 | 175 The Unending Deluge (era 6) | Mill 4 | Cada jogador descarta a mão e compra o número de cartas igual ao maior descarte. | Windfall |
| 5 | 141 The First Great Storm (era 5, fica Moment) | Bounce 2 | Devolva à mão do dono cada Devotee inimigo que declarou Strike nesta rodada. | Aetherize |
| 6 | 173 The Fall of Atlantis | Bounce 2 e mill | Custa {1}{C} a menos para cada carta que você manda do seu Tartarus ao Void ao conjurá-la. Compre 3 cartas. | Treasure Cruise ⚠️ |

### Resultado

| Efeito | Antes | Depois |
| --- | --- | --- |
| Bounce de Devotee inimigo | 16 | 12 (2 viram bounce em massa) |
| −ATK no Strike | 10 | 9 |
| Prevenir dano | 7 | 5 |
| Lorde de Marina | 2 | 1 |

Entram 14 arquétipos de azul que Poseidon não tinha.

## 4. Regras que o autor precisa definir

1. **Blink (116):** sair e voltar cria um Devotee novo? Proposta: volta Unprepared, sem marcadores e sem dano; os Equipment caem; o efeito "quando entra" dispara de novo.
2. **Clone (104):** o que a cópia copia? Proposta: nome, ATK, HP, keywords e habilidades impressas. Não copia marcadores, dano, Equipment nem bônus.
3. **Delve (173):** mandar cartas do Tartarus ao Void reduz custo. Proposta: só reduz o genérico, o custo mínimo é {0}, e essas cartas contam como "no Void".
4. **Imposto (Rhystic, Propaganda):** quem decide pagar é o oponente, na hora. Proposta: se ele não tem Cosmo livre, não paga.

## 5. Impacto

- Depois do diff aprovado: `data/cards.json` (EN e PT), `playtest/engine-v3/v6/poseidon.js` e os testes.
- A IA precisa decidir os impostos (Rhystic, Propaganda) e as pilhas do Fact or Fiction.
