# Artemis → Verde (Elves: ramp + tribal) — diff proposto

Status: **aprovado pelo autor e gravado** (31/10/2026) em `data/cards.json`, `card-forge/art-web/cards.json` e no `engine-v3`. Base: o guia vigente, `docs/meta-premodern.md` e as decisões do autor de 31/10/2026 descritas abaixo.

## 1. Decisões do autor (31/10/2026)

- **Fight e bite ficam:** são a remoção do Verde e dependem de corpo grande (418, 422, 424, 443, 431, 433, 440). O **dano fixo sai**, por ser papel de Ares: 435 vira fight, 388 dá Training counter e 379 dá +2 ATK.
- **Ramp de Elves:** 397 Sacred Grove Dryad desce para c1. Com o 386, são dois Devotees de mana de custo 1.
- **Topo mais barato:** 449 c5 (Overrun) e 450 c6.
- **Termos do guia em todas as cartas de Artemis:** "+1/+1 counter" vira **Training counter** (§48A); "Once per round" e "once per turn" viram **once each round** (§64). Muda só o texto; o efeito é o mesmo.

## 2. Cartas alteradas

### Regras (6 cartas)

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 388 | Silver Arrow Huntress | Precise Hunt: {1}{C}, 1 de dano em Devotee inimigo | *Precise Hunt — When Silver Arrow Huntress enters the battlefield, you may pay {1}{C}. If you do, put a Training counter on target friendly Devotee.* | Dano fixo é de Ares |
| 435 | Silver Arrow Commander | Precise Execution: 3 de dano no ETB | *Precise Execution — When Silver Arrow Commander enters the battlefield, you may have it fight target enemy Devotee. Each deals damage equal to its ATK to the other.* Os outros textos iguais | Fight no lugar de dano fixo |
| 379 | Artemis' Divine Bow | Celestial Arrow: 2 de dano em Devotee inimigo a cada Strike | *Celestial Arrow — Whenever equipped Devotee declares a Strike against an enemy Devotee, it gets +2 ATK until the end of the round.* | Idem |
| 397 | Sacred Grove Dryad | c2 1/2 | **c1** 1/2; texto igual | Fyndhorn Elves |
| 449 | The Wrath of Artemis | c7 | **c5**; texto igual | Overrun |
| 450 | The World Reclaimed | c8 | **c6**; texto igual | Custo no padrão |

### Termos (texto, sem mudar efeito)

| Troca | Cartas |
| --- | --- |
| "+1/+1 counter(s)" → "Training counter(s)" | as 53 cartas de Artemis que citam o marcador |
| "Once per round" / "once per turn" → "Once each round" / "once each round" | as 12 cartas de Artemis que usam essas formas |

Os textos de pergunta do motor que dizem "+1/+1 counter" (`v6/artemis.js`) passam a dizer "Training counter".

## 3. Lista de referência — Artemis Hunt (Elves, máx. 3 cópias)

God **ARTEMIS** · Domain **THE SACRED FOREST** (428)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Mana (c1) | 386 Moonlit Initiate ×3 · 397 Sacred Grove Dryad ×3 · 396 Forest Spirit ×2 | 8 |
| Custo 2 | 407 Wilderness Shaman ×3 · 381 Sacred Stag ×2 · 393 Satellite Archer ×2 · 388 Silver Arrow Huntress ×2 · 398 Lunar Nymph ×2 | 11 |
| Custo 3 | 402 Celestial Stag ×3 · 404 Silver Fang Wolf ×2 · 406 Artemis' Royal Huntress ×2 · 392 Lunar Beast ×2 | 9 |
| Custo 4 | 431 Moonlight Huntress Captain ×3 · 383 Silver Moon Bear ×2 · 437 The Second Moon Guardian ×2 | 7 |
| Custo 5+ | 435 Silver Arrow Commander ×2 · 385 The Great Lunar Hound ×2 · 361 Calisto ×1 · 433 Primal Forest Champion ×1 | 6 |
| Ramp | 417 Nature's Awakening ×3 · 420 Blessing of the Moon ×2 · 423 Roots of the Ancient World ×2 | 7 |
| Fight e bite | 422 The Hunter's Instinct ×3 · 424 The Silver Arrow ×3 | 6 |
| Tutor e topo | 446 The Awakening of Chandra ×2 · 449 The Wrath of Artemis ×2 · 372 The Goddess Awakens ×1 · 450 The World Reclaimed ×1 | 6 |
| **Total** | | **60** |

A lista Enchantress (God Athena + Domain Artemis) fica para a etapa das duplas.

## 4. Depois da aprovação

1. Gravar as cartas em `data/cards.json` e em `card-forge/art-web/cards.json` (6 de regra + troca de termos).
2. Motor (`playtest/engine-v3/v6/artemis.js`): 388 (Training counter), 435 (fight), 379 (+2 ATK); textos de pergunta com "Training counter". Testes em `tools/test-engine-v3-v6-artemis*.mjs`.
3. Deck "Artemis Hunt" em `data/alpha-0.1/decks-competitivos.json`.
4. Changelog e commit.
