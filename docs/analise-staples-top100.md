# Análise: as 100 maiores staples do EDHREC contra as nossas cartas

Data: 08/11/2026. Fonte: EDHREC, top dos últimos 2 anos (json.edhrec.com/pages/top/year.json).
Cartas comparadas: as 610 de `data/cards.json`, as propostas `docs/proposta-*.md` e o motor (`playtest/engine-v3/v6/`).
Status: **análise**. Nada foi mudado em `data/cards.json`; cada troca precisa de um diff aprovado.

## 1. Resumo

| Situação | Staples | Exemplos |
| --- | --- | --- |
| Já no jogo ou numa proposta gravada | 45 | Swords, Path, Counterspell, Cultivate, Beast Within, Rhystic Study, Cyclonic Rift, Demonic Tutor, Jeska's Will, Smothering Tithe |
| Pedras de Cosmo incolores | 21 | Sol Ring (nº 1), Arcane Signet (nº 2), 9 Talismans, 7 Signets, Fellwar Stone, Mind Stone, Thought Vessel |
| Equipment de Impulse com proteção | 1 (+1) | Swiftfoot Boots; Lightning Greaves só virou Impulse (Ares 314) |
| Multicoloridas | 20 | Assassin's Trophy, Anguished Unmaking, Boros Charm, Terminate, Putrefy, Despark, Growth Spiral |
| De uma cor, ainda fora do jogo | 13 | Teferi's Protection, Mystic Remora, Mana Drain, Deadly Rollick, Black Market Connections |

As cinco facções já cobrem quase toda a parte de uma cor. **O maior buraco está nas cartas neutras:** 22 das 100 staples são pedras de mana e botas incolores, e as neutras não têm nada equivalente.

## 2. Pedras de Cosmo (neutras)

Hoje as neutras têm só duas fontes de Cosmo:

- 478 Universal Cosmo Crystal: Equipment 4, gera {1}{L} uma vez por rodada.
- 493 Cosmo Converter: Equipment 4, paga {1}{S} para gerar {2}{L}.

As duas custam 4. No Commander, a pedra boa custa 1 ou 2 e se paga na rodada seguinte.

| Staple | O que faz | Versão possível |
| --- | --- | --- |
| Sol Ring | custo 1, dá 2 de mana | Divine neutro: Equipment 1, "uma vez por rodada, gere {2}{L}". Forte demais em Common. |
| Arcane Signet, Talismans, Signets, Fellwar, Mind Stone | custo 2, dá 1 | Equipment 2: "uma vez por rodada, gere {1}{L}". |
| Thought Vessel | pedra + mão sem limite | Equipment 2: gera {1}{L} e você não descarta por mão cheia. |

**Regra a decidir:** o guia (§6) limita o Cosmo, e por isso o Dark Ritual ficou fora das propostas do preto. O Latent tem teto (`LATENT_CAP`), então uma pedra que gera Latent não passa desse teto. Falta o autor dizer se pedra de Cosmo neutra entra e com qual curva.

## 3. Botas: Impulse com proteção (neutras)

Swiftfoot Boots (2,8 milhões de decks) e Lightning Greaves (2,6 milhões) são o Equipment mais jogado do formato. O Devotee equipado ganha ímpeto e não pode ser alvo do oponente. O 314 Cracked Warplate de Ares só dá @Impulse.

- **Versão possível:** Equipment neutro 2, "o Devotee equipado tem @Impulse e não pode ser alvo de Moments e Techniques inimigos".
- **Regra a decidir:** o @Immune é por facção (§43A). "Não pode ser alvo de Spell inimiga" seria uma regra nova no §58.

## 4. De uma cor, ainda fora do jogo

| Facção | Staple | O que faz | Observação |
| --- | --- | --- | --- |
| Athena | Teferi's Protection | nada muda no seu lado até a sua próxima rodada | A proposta do branco marcou "time indestrutível" como **Não**; a 535 cobre só em parte. |
| Athena | Generous Gift | destrói qualquer permanente e dá um 3/3 | Igual ao Beast Within de Artemis (422). Não vale repetir. |
| Poseidon | Mystic Remora | imposto que compra carta | A proposta do azul marcou **Não**. Poseidon já tem o Rhystic Study. |
| Poseidon | Mana Drain / An Offer You Can't Refuse | counter que devolve mana / dá recurso ao oponente | Poseidon já tem 9 counters; seria troca, não acréscimo. |
| Poseidon | Frantic Search | compra 2, descarta 2, desvira Bases | Choca com o §6 (Bases já pagas). |
| Hades | Deadly Rollick | remoção grátis com o seu Commander em campo | "Custa {0} se você controla um Specter General." O Fierce Guardianship do azul usa o mesmo molde. |
| Hades | Black Market Connections | paga Soul: carta, Cosmo ou ficha | Encaixa no Hades, que paga Soul (ver 562 e 569). |
| Hades | Deadly Dispute | sacrifica, compra 2 e dá mana | 234 e 561 já fazem quase isso. |
| Ares | Rhythm of the Wild | criaturas com ímpeto e que não podem ser anuladas | Vermelho e verde; a parte vermelha (ímpeto para todos) falta em Ares. |
| Artemis | Nature's Lore, Kodama's Reach, Birds, Sakura-Tribe Elder, Avacyn's Pilgrim, Delighted Halfling | ramp | Artemis já tem ramp demais (417, 420, 421, 423, 386, 397). Não precisa. |

## 5. Multicoloridas

As facções são de uma cor só e não existem cartas de duas facções. As 20 multicoloridas viram, no máximo, uma ideia na cor dominante, e quase todas já têm parente:

- **Remoção:** Assassin's Trophy, Anguished Unmaking, Terminate, Putrefy e Despark já têm as remoções de cada facção.
- **Ramp e compra:** Growth Spiral, Kodama's Reach e Faeburrow Elder já estão em Artemis.
- **Charms (Boros, Rakdos):** são "escolha um" e já existem nos comandos de Poseidon e Ares.

## 6. Prioridade sugerida

1. **Pedras de Cosmo neutras**, a maior lacuna. Depende da regra do §6.
2. **Botas neutras** (Impulse com proteção). Depende de uma regra de "não pode ser alvo".
3. **Teferi's Protection** em Athena.
4. **Deadly Rollick e Black Market Connections** em Hades.
5. **Ímpeto para todos** (a parte vermelha do Rhythm of the Wild) em Ares.
6. **Mystic Remora** em Poseidon, só se o autor quiser outro imposto que compra.

Cada item que o autor aprovar vira uma proposta carta a carta, do mesmo jeito que as das cores: qual carta sai, texto EN e PT, e diff de `data/cards.json`.
