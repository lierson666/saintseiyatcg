# Proposta: Devotos de Hades com as staples do preto (EDH)

Status: **proposta, aguarda o autor**. Nada foi gravado em `data/cards.json`.
Data: 08/11/2026. Fonte: EDHREC, top cards de preto (json.edhrec.com/pages/top/black.json).

## 1. O problema

Hades tem 37 Devotos. **17 deles** têm efeito de entrada que mata ou encolhe um Devoto inimigo:

- dão -X/-X: Worm Raimi, Deep Niobe, Lycaon, Deathmask, Aphrodite, Minos e Troll;
- derrotam: Alraune, Golem, Executioner, Rhadamanthys, Shura e Thanatos;
- impedem o Strike: Gorgon e Camus;
- removem de outro jeito: Saga e Hypnos.

**Sete** têm o mesmo gatilho: "quando um Devoto inimigo é derrotado, o dono dele perde Soul e você ganha". São Alraune, Rhadamanthys, Minos, Aphrodite, Camus, Thanatos e, de forma parecida, Lycaon.

Golem Rock e Underworld Executioner são a mesma carta.

## 2. O que o preto faz no Commander (staples por arquétipo)

| Arquétipo | Staples no EDHREC | Já existe em Hades? |
| --- | --- | --- |
| Remoção pontual | Infernal Grasp, Go for the Throat, Snuff Out | Sim, até demais |
| Varredura que custa vida | Toxic Deluge, Damnation, Massacre Wurm, Meathook Massacre | Não (só Hypnos) |
| Edito (o oponente escolhe) | Fleshbag Marauder, Plaguecrafter, Grave Pact | Não |
| Aristocratas (drenar quando o seu morre) | Blood Artist, Zulaport Cutthroat, Bastion | Pouco (Frog, Saga) |
| Saída de sacrifício | Viscera Seer, Carrion Feeder | Sim (Wandering Soul, Cyclops) |
| Comprar pagando vida | Phyrexian Arena, Night's Whisper, Necropotence | Pouco (Pandora, Papillon) |
| Compra por morte | Midnight Reaper, Morbid Opportunist | Não |
| Tutor | Demonic Tutor, Vampiric Tutor | Sim (Charon, Pandora) |
| Reanimar, inclusive do oponente | Reanimate, Animate Dead, Victimize | Só do próprio Tartarus |
| Ódio a cemitério | Bojuka Bog, Dauthi Voidwalker | Não |
| Drenar por devoção | Gray Merchant of Asphodel | Não |
| Punir compra | Sheoldred the Apocalypse, Orcish Bowmasters | Não |
| Descarte | Opposition Agent, Tergrid, Hymn | Só Balron |
| Toque mortal | Basilisk (deathtouch) | Não |
| Criatura que volta sozinha | Reassembling Skeleton, Gravecrawler | Sim (Skeleton, Beetle) |

Não entram aqui as fichas (Bitterblossom, Ophiomancer), porque não há regra de ficha no guia. Rituais de mana (Dark Ritual, Cabal Coffers) também ficam de fora, porque mexeriam no limite de Cosmo (§6).

## 3. Proposta carta a carta

A curva segue o custo:

- **1–2:** peça de motor, 1 ponto de efeito.
- **3:** efeito pequeno com custo de Soul.
- **4:** um motor ou uma ameaça.
- **5:** Legendary com efeito forte.
- **6–7:** bomba.

Linhas marcadas com ⚠️ dependem de uma definição de regra (ver §4).

### Mudam (14)

| Custo | Carta | Hoje | Proposta | Staple de origem |
| --- | --- | --- | --- | --- |
| 2 | 217 Dullahan Cube | ETB: drena 1 | **Death Messenger** — Uma vez por rodada, quando Dullahan Cube ou outro Devoto aliado é derrotado, o God inimigo alvo perde {1}{S} e o seu ganha {1}{S}. (O Last Breath e o Afterlife ficam.) | Blood Artist |
| 3 | 209 Worm Raimi | ETB: pague 1, -1/-1 | **Worm's Bind** — Quando entra, você pode pagar {1}{S}. Se fizer, o oponente alvo descarta 1 carta à escolha dele. (O Underground Ambush fica.) | Mind Rot / Opposition Agent |
| 4 | 187 Sphinx Pharaoh | ETB: drena 2, mais compra | **Balance of Curse** — No início da sua rodada, você pode perder {1}{S}. Se fizer, compre 1 carta. (Sai o Dead End Symphony.) | Phyrexian Arena |
| 4 | 201 Harpy Valentine | ETB: pague 1, drena 2 | **Greed the Life** — Quando entra, o God inimigo alvo perde X {S} e o seu ganha X {S}. X é o número de Specters que você controla (máximo 4). (O Loyal Servant fica.) | Gray Merchant |
| 4 | 204 Deep Niobe | ETB: pague 2, -3/-3 | **Deep Fragrance** — Quando entra, você pode pagar X {S} (X até 3). Se fizer, **cada outro Devoto** (os seus também) recebe -X/-X até o fim da sua rodada. (O Poisonous Death fica.) | Toxic Deluge |
| 4 | 205 Basilisk Sylphid | Dano: -2/-2 | **Annihilation Flap** — Quando Basilisk Sylphid causa dano de combate a um Devoto inimigo, derrote esse Devoto. (O Deadly Pursuit fica.) | Toque mortal |
| 4 | 210 Golem Rock | Sacrifica: derrota um Devoto de HP ≤3 | **Rolling Bomber Stone** — Quando entra, você pode sacrificar outro Devoto aliado. Se fizer, o oponente alvo sacrifica um Devoto **à escolha dele**. | Fleshbag Marauder ⚠️ |
| 4 | 213 Lycaon Phlegyas | ETB: pague 1, -2/-2 | **Howling Inferno** — Quando entra, envie até 3 cartas alvo do Tartarus inimigo ao Void. Enquanto Lycaon estiver no campo, Devotos inimigos derrotados vão para o Void em vez do Tartarus. (O Savage Predator fica.) | Bojuka Bog / Dauthi Voidwalker ⚠️ |
| 4 | 251 Cancer Deathmask | ETB: pague 2, -3/-3 | **Seki Shiki Meikai Ha** — Quando entra, você pode sacrificar outro Devoto aliado. Se fizer, ponha no campo, sob o seu controle e Unprepared, um Devoto de custo 4 ou menos de **qualquer** Tartarus. (O Gateway to Yomotsu fica.) | Reanimate / Victimize ⚠️ |
| 4 | 252 Pisces Aphrodite | ETB: -2/-2, mais drenar por morte | **Bloody Rose** — Cada vez que um oponente compra uma carta além da primeira da rodada dele, o God desse oponente perde {1}{S}. (Sai o Royal Demon Rose.) | Sheoldred / Bowmasters |
| 5 | 183 Griffon Minos | ETB: pague 1, -2/-2 em um alvo | **Cosmic Marionation** — Quando entra, você pode pagar {2}{S}. Se fizer, **cada** Devoto inimigo recebe -1/-1 até o fim da sua rodada. (O Puppet Master fica.) | Massacre Wurm |
| 5 | 211 Troll Iwan | Sacrifica: -3/-3, mais Bloodthirst temporário | Sobe para 4/4. **Bloodthirst** — Cada vez que outro Devoto aliado é derrotado, ponha 1 Training counter em Troll Iwan. | Crescer com as mortes (Yawgmoth) |
| 5 | 254 Aquarius Camus | Drena por morte | **Aurora Execution** — Uma vez por rodada, quando um Devoto inimigo é derrotado, você pode perder {1}{S}. Se fizer, compre 1 carta. (O Diamond Dust fica.) | Midnight Reaper |
| 7 | 193 Thanatos | Drena 2 por morte | **Divine Execution** — Uma vez por rodada, quando outro Devoto aliado é derrotado, o oponente alvo sacrifica um Devoto. (O Terrible Providence fica.) | Grave Pact ⚠️ |

Executioner aparece na tabela só para registrar que deixa de ser idêntico ao Golem; o texto dele não muda.

### Ficam como estão (23; Executioner deixa de ser gêmeo do Golem)

218, 220, 206, 207, 221, 189, 215, 216, 219, 223, 202, 208, 212, 214, 222, 181, 185, 195, 203, 253, 197, 255 e 191.

### Resultado

- Remoção de entrada cai de 17 para 9, e passa a ter formas diferentes: pontual, varredura simétrica, varredura pequena, edito, Void e Seal.
- O gatilho "drena quando um inimigo morre" cai de 7 para 3 (Alraune, Rhadamanthys e Minos).
- Entram 12 arquétipos novos de preto. Hoje cada um aparece no máximo uma vez.

## 4. Regras que o autor precisa definir

1. **Edito (Golem e Thanatos):** "o oponente sacrifica um Devoto à escolha dele" é permitido? Hoje o guia só mostra sacrifício do próprio jogador.
2. **Reanimar do oponente (Deathmask):** quando o Devoto sai do campo, ele vai para o Tartarus do dono? A §41 (Retorno do Tartarus) não trata de controle.
3. **Substituir o Tartarus pelo Void (Lycaon):** isso conta como "derrotado" para gatilhos de derrota? Proposta: conta, mas a carta vai para o Void.
4. **Niobe simétrico:** pode atingir os seus próprios Devotos? É proposital: é o custo da varredura, como no Toxic Deluge.

## 5. Impacto

- Depois do diff aprovado: `data/cards.json`, textos `_pt`/`_en` e `playtest/engine-v3/v6/hades.js`, com testes em `tools/test-engine-v3-v6-hades.mjs`.
- Pode haver conflito com a sessão "rebalanceamento-de-hades": é preciso conferir antes de gravar.
