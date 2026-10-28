# Canonical Rules Matrix — apresentação × regra

Fonte de verdade das regras: `docs/guia-do-jogo.md`, D1–D268 e `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`. A matriz de bloqueios da engine está em `docs/alpha-0.1/MATRIZ-BLOQUEIOS-ENGINE-3.0.md`. Este documento só liga cada regra implementada ao evento que a apresentação lê.

## Regra → engine → evento → apresentação
| Regra (fonte) | Engine 3.0 | Evento | Apresentação |
| --- | --- | --- | --- |
| Mão 7 e mulligan único (P01) | `createMatch`, `mulligan` | `draw`, `mulligan` | Tela de mulligan |
| Preparação e compra (P02, D3, D170) | `startTurn`, `draw` | `turn_start`, `draw` | Banner de turno, carta voando do deck |
| Fatigue (P07) | `draw` | `fatigue` | Explosão violeta no deck |
| Cosmo Base 1/turno (D4) | `placeBase` | `base_placed` | Carta voa para o banco, esfera acende |
| Pagamento (D194) | `payCost` | `cosmo_spent` | Esferas consomem |
| Conversão em Latent, limite 3 (D5, D198) | `endTurn` | `latent_gained` | Carga violeta, "+N Latent" |
| Devotee entra Unprepared (P02) | `playDevotee` | `card_played` | Carta cai no campo, inclinada |
| Equipment custo alternativo | `playEquipment`, `reequip` | `card_played`, `equipped` | Aba de equipamento sob o portador |
| Technique (Sorcery) / Moment (Instant) (D194) | `playSpell`, `respond` | `card_played`, `chain_add`, `spell_resolved` | Carga dourada / violeta; cadeia no painel |
| Janela e cadeia LIFO (P06, D186) | `openWindow`, `pass` | `window_open`, `pass`, `resolve`, `window_close` | Indicador de prioridade, lista da cadeia |
| Strike: legalidade, Guardian (P04, P05, D22) | `checkStrike`, `strikeTargets` | — | Alvos legais pulsam |
| Strike: declaração e resolução | `declareStrike`, `resolveStrike` | `strike_declared`, `strike_resolve` | Mira, investida, golpe, impacto, retaliação |
| Prevenção, Armor absorve primeiro | `damageDevotee`, `preventGod` | `damage`, `god_damage` | "N prevented", "N to Armor", "-N" |
| Soul e vitória (D52) | `loseSoul` | `soul_lost`, `victory` | Soul pisca, tela de vitória |
| Defeat = Destroy | `checkDefeats`, `destroyDevotee` | `destroyed` | Carta estilhaça |
| End Phase e Round (P03, D191) | `endTurn` | `end_phase`, `round_end` | Texto do meio de campo |

## BLOCKED_BY_RULES
| Item pedido | Motivo | O que a tela mostra |
| --- | --- | --- |
| Partida Athena × **Poseidon** | Não existe catálogo de cartas de Poseidon; só o registro do God | Os dois lados usam God Athena com os decks D171; a arena Poseidon é só tema visual |
| Awaken, Divine Power, Ultimate do God | Sem procedimento aprovado na 3.0 | "Awaken N · locked" na placa do God |
| Long Range | `NotSpecified` na engine | Strike recusado com aviso "Not in Alpha 0.1" |
| Cartas 057, 078, 084 | Sem categoria aprovada (fora dos decks) | Não aparecem |
| Engage / Disengage | Não existem na 3.0 | — |
| Cinemática de God especial | Depende de Divine Power | Assinaturas de Devotee (visual) no lugar |

As assinaturas visuais (Pegasus Ryuseiken, Rozan Shoryuha) **não criam regra**: o dano exibido é o do evento.
