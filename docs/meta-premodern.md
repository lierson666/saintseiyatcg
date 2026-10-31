# Meta Premodern — arquétipos, papéis e plano de rebalanceamento

Status: decisões do grill aprovadas pelo autor em 31/10/2026; documento reescrito sobre o guia vigente (turnos dentro do Round) em 31/10/2026. Não cria regra. Regras: só `docs/guia-do-jogo.md`. Cartas: `data/cards.json`, gravado só após diff aprovado, uma facção por vez.

## 1. Objetivo

Usar os arquétipos do Magic Premodern como base do meta. Cada facção cobre as ferramentas de uma cor clássica, dentro das nossas regras. Meta saudável = vários arquétipos viáveis, vantagem moderada nos confrontos, nenhum deck dominante.

Referências do autor (lidas em 31/10/2026): Mono-Black Midrange, Mono-Red Sligh, Selesnya Enchantress, Elves e metagame (MTGGoldfish). Merfolk, Mono-U Control e Reanimator (mtgdecks.net) recusaram leitura automática (HTTP 403); usadas as listas conhecidas do formato.

## 2. Decisões do grill (31/10/2026)

| Tema | Decisão |
| --- | --- |
| Mapeamento | Ares = Vermelho; Poseidon = Azul; Hades = Preto; Artemis = Verde; Athena = Branco/Enchantress |
| Duplas | Enchantress, Reanimator, Rakdos e Azorius, com God = motor (seção 4). Pelo guia §63, Domain fora da cor dá só a 1ª habilidade e até 15 cartas da facção dele: a dupla é um *splash*, não meio a meio |
| Escopo | Núcleo de cada facção (cartas que formam o deck do arquétipo). Domains e Gods ficam fora desta passada, salvo se quebrarem o pie: os 28 Domains foram reescritos em 31/10/2026 e o Soul dos Gods segue a tabela do §65 |
| Neutral | Só as que dão papel primário de outra facção a qualquer deck |
| Edição | Reescrever no lugar: mantém ID, personagem e arte |
| Ordem | Ares → Athena → Poseidon → Hades → Artemis → duplas |
| Medição | Round-robin de bots + playtest do autor |
| Listas | 10 listas de referência (6 mono + 4 duplas), máximo 3 cópias (§2) |
| IA | Plano por arquétipo definido aqui; ajuste da IA é etapa separada |
| Detalhe | Plano por grupo; diff carta a carta na execução de cada facção |

## 3. Color pie

Cada papel primário tem um dono e no máximo um secundário, mais fraco ou mais caro.

| Facção (cor) | Primário | Secundário | Fraco ou ausente |
| --- | --- | --- | --- |
| **Ares** (Vermelho) | Curva baixa 1–2, Impulse, burn em Devotee e God | Filtragem (loot), negação de Latent | Compra, cura, counter, discard |
| **Poseidon** (Azul) | Counter (Moment de resposta), compra, bounce, Seal | Mill, lordes Marina (tempo) | Destruição direta, ganho de Soul |
| **Hades** (Preto) | Remoção dura, discard, recursão do Tartarus | Compra pagando Soul, sacrifício | Counter, Seal |
| **Artemis** (Verde) | Ramp (Base extra), corpos grandes, tribal | Tutor de Devotee, Training counters, Pierce | Remoção (só contra alvo grande), counter |
| **Athena** (Branco) | Anthem Saint, valor de Equipment/Support, Guardian, Soul, cura | Remoção condicional (contra atacante), prevenção | Compra (só via motor), mill |

## 4. Arquétipos

Os 15 decks de `data/alpha-0.1/decks-competitivos.json` já cobrem boa parte. A coluna “Deck atual” indica o ponto de partida.

| # | Arquétipo | God | Domain | Modelo | Deck atual | Plano da IA |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Ares Sligh | Ares | Ares | Mono-Red Sligh | Berserker Blitz | Curva 1-2-3; Strike todo turno; burn limpa Guardian; burn no God fecha |
| 2 | Poseidon Control | Poseidon | Poseidon | Mono-U Control | Tides of Denial | Guarda Latent para Moments de resposta; compra; poucos finalizadores |
| 3 | Poseidon Marina | Poseidon | Poseidon | Merfolk | Marina Tempest | Marinas baratas + lordes; bounce/Seal no turno do ataque |
| 4 | Hades Midrange | Hades | Hades | Mono-Black | The Surplice Legion | Discard cedo; remoção dura; Specters eficientes; recursão |
| 5 | Artemis Hunt | Artemis | Artemis | Elves | Forest of Growth | Ramp; tribal; tutor; corpo grande cedo |
| 6 | Athena Saints | Athena | Athena | White Weenie + Voltron | Bronze Brotherhood / Armed with the Cloth | Saints com anthem; Guardian; Armor; Soul contra aggro |
| 7 | Enchantress | Athena | Artemis | Selesnya Enchantress | — | Equipment não-Armor e Support compram; Artemis acelera |
| 8 | Reanimator | Hades | Poseidon | Reanimator | Return from Tartarus | Mill próprio enche o Tartarus; Hades devolve Devotee grande cedo |
| 9 | Rakdos | Ares | Hades | Suicide/Rakdos | (inverso de Carnage of the Underworld) | Berserkers descartáveis; Hades transforma morte em valor |
| 10 | Azorius | Poseidon | Athena | UW Control | — | Counter e bounce + Guardian, cura e Soul |

## 5. Tradução das mecânicas do Magic (guia vigente)

| Magic | Saint Seiya TCG | Base no guia |
| --- | --- | --- |
| Turno | Turno do jogador; dois turnos = Round | §7 |
| Instant | **Moment**: no próprio turno ou como resposta; como resposta, paga só com Latent | §5, §56 |
| Sorcery | **Technique**: só no próprio turno, salvo texto | §56 |
| Tudo na pilha | Devotee, Equipment, habilidades e Spells vão à pilha; só Moment responde | §56 |
| Mana / terreno | Cosmo Base: 1 por turno, entra Prepared e paga no mesmo turno | §4 |
| Mana guardada | Latent (teto 3): Bases Prepared viram Latent na End Phase | §5 |
| Counterspell | Moment de Poseidon que contraria uma Spell ou carta na pilha; a carta contrariada vai ao Tartarus | §56 |
| Lightning Bolt / burn | Moment de Ares: dano a Devotee ou ao God. No God custa mais por ponto (régua do diff de Ares) | — |
| Haste | Impulse (pode mirar o God) | §47 |
| Tap-down | Seal (marcador; impede preparar) | §48 |
| +1/+1 counter | Training counter | §48A |
| Trample | Pierce | §46, §46A |
| Bounce | Retornar Devotee à mão | — |
| Mill / self-mill | Mill N | §66 |
| Graveyard / exílio | Tartarus / Void | §39–41, §63 |
| Reanimate | Moment ou Technique de Hades, custo fixo, devolve Devotee do Tartarus ao campo Unprepared | §41 (1 retorno por carta física por rodada) |
| Pay life | Pagar Soul ({N}{S}) | — |
| Land destruction | Remover Latent do adversário (Unfaith e efeitos de Ares) | §49 |
| Mana elf | Colocar Cosmo Base adicional no turno | §6 |
| Enchantment / Aura | Support / Equipment que não seja Armor | §3 |
| Lord tribal | Anthem por subtipo (Saint, Marina, Berserker, Satellite) | §54 |

## 6. Plano por facção

Contagens por busca no texto de `data/cards.json` em 31/10/2026 (estimativa).

- **Ares (1º)**: removal ~65, discard ~15, Impulse 5, curva 1:9 / 2:11 / 3:9 / 4:5 / 5:2 / 6:1. Já recebeu a taxa de Soul nos pings ao God e −1 ATK nos baratos em 30/10/2026 (Berserker Blitz estava em 73%). Direção: alinhar ao Sligh **sem voltar a fortalecer**. Tirar discard (vira negação de Latent), trocar wraths caros por alcance e cortar pings de entrada em excesso. Diff: `docs/rebalance-ares-premodern.md`.
- **Athena (2º)**: Techniques 22, Armor 16, Guardian 4, anthem ~6. Falta o motor Enchantress (Equipment não-Armor/Support que compram).
- **Poseidon (3º)**: Moments 26, compra ~38, Seal ~34, discard ~32, bounce ~22, counter ~8. Discard em excesso (papel de Hades) vira loot; counters padronizados como Moment de resposta; curva Marina baixa; self-mill para o Reanimator.
- **Hades (4º)**: recursão ~29, bounce ~20, remoção ~6, discard ~5, curva pesada (4:13, 5:8). Já rebalanceado em 30/10/2026. Bounce sai (papel de Poseidon); entram remoção dura, discard e Reanimate de custo fixo.
- **Artemis (5º)**: ramp ~12, tutor 3. Textos com “+1/+1 counter” passam a Training counter; ramp como Base extra.
- **Duplas (6º)**: só cartas-ponte se faltar papel, respeitando o limite de 15 cartas do Domain.

## 7. Medição

- Round-robin de bots com os decks de referência, iniciativa espelhada.
- Metas: cada arquétipo com 45–55% de vitórias; nenhum confronto fora de 40–60%; 8–10 Rounds; vantagem de quem começa abaixo de 55%.
- Toda mudança de texto exige também a tradução executável em `playtest/engine-v3/v6/<facção>.js` e o teste `tools/test-engine-v3-v6-<facção>.mjs`.
- Depois de cada rodada de medição, playtest do autor.

## 8. Pendências

- O §65 diz que o Soul dos Gods fica entre 15 e 22, mas as cartas têm Athena 25, Poseidon 26, Hades 24, Artemis 25 e Ares 21. O autor decide qual vale.
- Rivalidade está suspensa (§13); cartas que citam Rival aguardam.
