# Proposta: cartas de Ares com as staples do vermelho (EDH)

Status: **proposta, aguarda o autor**. Nada foi gravado em `data/cards.json`.
Data: 08/11/2026. Fonte: EDHREC, top cards de vermelho (json.edhrec.com/pages/top/red.json).

Ares tem 96 cartas: 37 Devotees, 28 Spells, 24 Equipment, 6 Domains e o God.

## 1. O problema

Três efeitos se repetem em quase metade da facção:

| Efeito repetido | Cartas |
| --- | --- |
| "Outro Berserker declara Strike: +1 ATK" (bônus de time) | War Drummer, Flame Legion Berserker, Berserker Champion, Royal Guard, Ofir, Flame/Ouroboros/Champion Warplate, War Temple (9) |
| "Ao ser derrotado, pague {1}{S}: 1 de dano" | Suicidal, Disaster Legion Berserker, Disaster Wing, Catreu, Spear of the Fallen, Cracked Warplate, Disaster Warplate, Akephalos (8) |
| "Derrota em combate, pague {S}: dano ao God" | Crimson Fire Guardian, Berserker Champion, Bloodstained Blade, Champion/Akephalos/Anfista Warplate, Enyo (7) |
| Spell de +X ATK | Fury of Ares, Charge, No Mercy, Reckless Assault, Will of Ares, Berserkers March, Fury of the War God, God of War Awakens, Four Legions, Divine Flames (10) |

Outros pontos fracos:

- A carta mais cara de Ares custa 5. Não existe finalizador grande, papel que no vermelho fica com os dragões.
- Ares não tem ramp (Tesouro), "impulse draw", cópia de feitiço, recursão de feitiço nem efeito do tipo Impact Tremors.

## 2. O que o vermelho faz no Commander

| Arquétipo | Staples no EDHREC | Já existe em Ares? |
| --- | --- | --- |
| Tesouro e ritual (mana extra) | Big Score, Jeska's Will, Storm-Kiln Artist, Professional Face-Breaker, Reaver Cleaver, Ragavan | Não |
| Impulse draw (exila e joga) | Light Up the Stage, Jeska's Will, Valakut Exploration, Chandra | Não |
| Looting e wheel | Faithless Looting, Thrill, Wheel of Fortune | Sim (Berserker of the Apocalypse, Fuel the Rage, Disciple) |
| Dano por entrada ou por feitiço | Impact Tremors, Guttersnipe, Terror of the Peaks | Não |
| Saída de sacrifício que causa dano | Goblin Bombardment, Fling | Sim (Altar of Slaughter, Lior, Blood for Blood) |
| Copiar e redirecionar feitiço | Dualcaster Mage, Reverberate, Deflecting Swat, Bolt Bend | Não |
| Conjurar do cemitério | Underworld Breach, Past in Flames | Não |
| Varredura que barateia | Blasphemous Act | Endless Holy War custa 9 |
| Remoção flexível | Chaos Warp, Abrade | Pouco |
| Destruir artefato | Vandalblast | Sim (Unleash the Fury) |
| Combate extra / desvirar | Relentless Assault, Aggravated Assault | Sim (Arionte, Alcmenes, Reckless Assault) |
| Ímpeto para todos | Anger, Hammer of Purphoros, Lightning Greaves | Só por carta |
| Punir dano recebido | Brash Taunter | Não |
| Equipamento que barateia | Embercleave | Não |

Na tradução para o jogo, **Tesouro vira Latent**: é Cosmo guardado para depois, com limite de 3 (§60). O guia já prevê "cartas que criem Latent", então não precisa de regra nova.

## 3. Proposta carta a carta

Os custos seguem a curva:

- **1–2:** peça de motor.
- **3–4:** motor ou ameaça.
- **5:** Legendary.

Linhas marcadas com ⚠️ dependem de regra nova (§4).

### Devotees (8)

| Custo | Carta | Hoje | Proposta | Staple de origem |
| --- | --- | --- | --- | --- |
| 1 | 306 War Drummer | Bônus de time | **Drums of War** — Uma vez por rodada, quando outro Devotee aliado entra no Campo de Batalha, cause 1 de dano ao God inimigo alvo. | Impact Tremors |
| 1 | 293 Disaster Legion Berserker | Morre e dá 1 de dano | Sai o Glorious Demise. **Afterlife {1}{C}:** os Devotees aliados ganham @Impulse até o fim da sua rodada. | Anger |
| 2 | 292 Flame Legion Berserker | Bônus de time | **Coordinated Assault** — Sempre que você conjura um Moment ou Technique, cause 1 de dano ao God inimigo alvo. | Guttersnipe |
| 2 | 298 Flame Legion Vanguard | +1 ATK em outro Devotee | **Tactical Opening** — Uma vez por rodada, quando você conjura um Moment ou Technique, ganhe {1}{L}. | Storm-Kiln Artist |
| 3 | 342 Divine Flame Tactician | Olha 3 do topo e escolhe 1 | **Strategic Deployment** — Quando entra, mande as 2 cartas do topo do seu deck ao Void. Até o fim da sua próxima rodada, você pode jogá-las. (O Calculated Assault fica.) | Light Up the Stage ⚠️ |
| 4 | 302 Berserker Champion | Bônus de time e dano ao God por morte | **Blood Champion** — Sempre que Berserker Champion causa dano de Strike a um God, ganhe {1}{L}. (O Unquenchable Fury fica.) | Professional Face-Breaker |
| 4 | 341 Crimson Fire Guardian | Revida o dano e causa dano ao God por morte | Ganha @Guardian. **Burning Pride** — Uma vez por rodada, quando Crimson Fire Guardian recebe dano, cause a mesma quantidade de dano ao God inimigo alvo. (Sai o Crimson Retaliation.) | Brash Taunter |
| 4 | 273 Ouroboros Ofir | Olha 3 do topo e dá bônus de time | **Divine War Flames** — Uma vez por rodada, você pode conjurar um Moment ou Technique do seu Tartarus pagando o custo dele mais {1}{S}. Depois ele vai para o Void. (O Battlefield Insight fica.) | Underworld Breach ⚠️ |

### Spells (6)

| Custo | Carta | Hoje | Proposta | Staple de origem |
| --- | --- | --- | --- | --- |
| 2 | 325 No Mercy | +2 ATK e Pierce | **Merciless Strike** — Escolha novos alvos para o Moment, Technique ou habilidade alvo. Se você controla um Berserker, custa {0}. | Deflecting Swat ⚠️ |
| 3 | 331 The Will of Ares | +2 ATK no time | **Divine Command** — Como custo adicional, descarte 1 carta. Compre 2 cartas e ganhe {2}{L}. | Big Score |
| 3 | 349 Divine Flames of War | Olha o topo e dá +2 ATK em dois | **Flame Coordination** — Copie o Moment ou Technique alvo que você controla. Você pode escolher novos alvos para a cópia. | Reverberate ⚠️ |
| 4 | 346 The Berserkers March | +2 ATK e Pierce no time, que depois morre | **Relentless Advance** — Prepare cada Devotee aliado que declarou Strike nesta rodada. (Com marcador @Seal, tire um em vez de preparar.) | Relentless Assault |
| 4 | 355 The Fury of the War God | +5 ATK e Pierce | **Divine Rage** — Embaralhe o Devotee ou Equipment inimigo alvo no deck do dono. Esse jogador compra 1 carta. | Chaos Warp |
| 9 | 360 The Endless Holy War | Derrota todos os Devotees | Mesmo efeito, e mais: "Este Spell custa {1}{C} a menos para cada Devotee no Campo de Batalha." | Blasphemous Act |

### Equipment (3)

| Custo | Carta | Hoje | Proposta | Staple de origem |
| --- | --- | --- | --- | --- |
| 1 | 314 Cracked Warplate | Morre e dá 1 de dano | O Devotee equipado tem @Impulse. | Lightning Greaves / Hammer of Purphoros |
| 2 | 316 Bloodstained Blade | +2 ATK, mais dano ao God por morte | +2 ATK. **Blood Hunger** — Sempre que o Devotee equipado causa dano de Strike a um God, ganhe {1}{L}. | The Reaver Cleaver |
| 5 | 289 Enyo, Spear of Destruction | +3 ATK, mais dano ao God por morte | +3 ATK; com Berserker equipado, ganha Pierce (fica como está). **Divine Destruction** — Custa {1}{C} a menos para cada Devotee aliado que declarou Strike nesta rodada. Quando entra, prenda-a a um Devotee aliado sem pagar Equip. | Embercleave |

### Ficam como estão (79)

Ficam o God, os 6 Domains, 29 Devotees, 22 Spells e 21 Equipment. A identidade de Ares continua a mesma: Legiões, Latent do Medo, sacrifício e Pierce.

### Resultado

| Efeito | Hoje | Depois |
| --- | --- | --- |
| Bônus de time ao declarar Strike | 9 | 5 |
| Morre e causa dano | 8 | 6 |
| Dano ao God por derrotar em combate | 7 | 4 |
| Spells de +ATK | 10 | 6 |

Entram 12 arquétipos novos de vermelho: Tesouro/Latent, impulse draw, Guttersnipe, Impact Tremors, cópia, redirecionamento, recursão, Chaos Warp, Embercleave, Brash Taunter, Anger e combate extra.

## 4. Regras que o autor precisa definir

1. **Jogar do Void** (Tactician): "até o fim da sua próxima rodada, você pode jogá-las". O custo é pago normalmente? Uma carta não jogada fica no Void.
2. **Conjurar do Tartarus** (Ofir): o efeito é diferente do Afterlife. Depois de resolver, o Moment vai para o Void.
3. **Copiar Moment/Technique** (Divine Flames): a cópia não é carta, não foi "conjurada" e some ao resolver?
4. **Escolher novos alvos** (No Mercy): só alvos legais. Se não houver alvo legal novo, o alvo continua o mesmo?

## 5. Lacuna que fica fora desta proposta

Ares não tem Devotee de custo 6 ou 7. No vermelho, quem fecha o jogo são dragões como Terror of the Peaks e Hellkite Tyrant. Sugestão: criar uma carta nova, que não mexe nas atuais.

## 6. Impacto

- Depois do diff aprovado: `data/cards.json` (EN e PT), `playtest/engine-v3/v6/ares.js` e os testes.
- 302 Berserker Champion e 340 Champion Warplate têm Ressonância entre si. A Warplate continua funcionando.
