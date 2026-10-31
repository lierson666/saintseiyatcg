# Ares → Sligh — diff proposto

Status: **aprovado e gravado em 31/10/2026.** Desvio: 277 e 294 usam "loses {1}{L}" no lugar da keyword Unfaith, que o `engine-v3` não implementa. Base: o guia vigente, `docs/meta-premodern.md` e os textos atuais, que já incluem o rebalanceamento de 30/10/2026.

## 1. Direção e réguas

Ares já foi enfraquecido em 30/10 (Berserker Blitz estava com 73%). Este diff **alinha Ares ao Sligh sem aumentar o poder total**. O que entra de alcance e de Impulse é compensado pelos cortes de remoção, de wrath e de ping.

- **Burn em Devotee:** custo + 2 de dano (custo 1 = 3).
- **Burn no God por Spell:** cerca de 1 de dano por Cosmo. Gatilhos continuam com a taxa de Soul de 30/10 (pagar N Soul para causar N).
- **Burn como Moment:** é instant (§56), pode responder com Latent.
- **Varreduras:** até três, leves (1–2 de dano). Ares fica sem wrath barato; só sobra o 360, de custo 9.
- **Discard → negação de Latent:** o discard é papel de Hades. A Fear Legion passa a remover Latent, que é o *land destruction* do Sligh, e usa Unfaith (§49).
- **Mantidos:** Gods, Domains (reescritos em 31/10), as taxas de Soul e o −1 ATK de 30/10.

## 2. Cartas alteradas (24)

| ID | Carta | Atual | Proposto | Motivo |
| --- | --- | --- | --- | --- |
| 271 | Ethon Alcmenes | c6 7/5; ETB 3 em Devotee; Promethean Fire (paga 2 Soul: 2 no God); Prepare ao destruir | **c5 5/4, Impulse.** Crimson Arrival igual. Unrelenting Inferno igual. **Promethean Fire removida** | Topo de curva do Sligh, não bomba de 6 |
| 273 | Ouroboros Ofir | c5 4/5; Mind Reading (+2 ATK quando o inimigo ataca) | **c4 3/4.** Mind Reading **removida** | Filtragem; bônus defensivo não é do Sligh |
| 277 | Lamia Lotis | ETB: oponente descarta; Torment: descarta ao causar dano ao God | **Unfaith.** *Nightmare Manifestation — When Lotis enters the battlefield, target opponent loses {1}{L}.* **Torment removida.** Illusory Escape igual | Discard → Latent |
| 278 | Lamia Warplate | Haunting Presence: descarta; Resonance: discard → 1 no God | *Haunting Presence — Whenever equipped Devotee deals combat damage to a God, that God's controller loses {1}{L}.* *Resonance — Lotis of Lamia: Whenever an opponent loses Latent Cosmo, you may pay {1}{S}. If you do, deal 1 damage to that opponent's God. This ability triggers only once per turn.* | Idem |
| 281 | Catreu of Akephalos | ETB 1 dano + Headless Fury + Death Without Fear | **Merciless Arrival removida** | Excesso de ping de entrada |
| 283 | Alceu of Lamassu | c3 4/3 | **c3 3/2** | Dois alvos no ETB pedem corpo menor |
| 285 | Arionte of Anfista | c3 3/2 | **+ Impulse** | Impulse é primário do Sligh |
| 287 | Basil of Manticore | ETB 1 dano + −1 ATK + ping | **Venomous Arrival removida** | Excesso de ping |
| 289 | Enyo, Spear of Destruction | c6; +4 ATK; 3 dano a cada Strike; taxa 3 Soul → 3 no God; Pierce | **c5; +3 ATK. Flame of Annihilation removida.** O resto igual | Arma mítica sem remoção repetida |
| 294 | Fear Legion Berserker | 2/2; discard ao causar dano ao God | **2/2, Unfaith.** Psychological Warfare **removida** | Discard → Latent |
| 296 | Ares' War Herald | ETB: +1 ATK | *War Cry — When Ares' War Herald enters the battlefield, target friendly Berserker gains +1 ATK and Impulse until end of round.* | Habilita Impulse |
| 300 | Fear Legion Tormentor | Lingering Nightmare: descarta e compra | *Lingering Nightmare — Whenever Fear Legion Tormentor deals combat damage to a God, that God's controller loses {1}{L}.* | Discard → Latent |
| 321 | Chains of Fury | +2 ATK fixo e +2 a cada Strike | **+1 ATK fixo**; o resto igual | +4 por 2 Cosmo era forte demais |
| 322 | First Blood | Moment c1: 2 dano (3 se intacto) | Moment c1: *Deal 3 damage to target enemy Devotee or 1 damage to target enemy God.* | Lightning Bolt, a régua do burn |
| 327 | Rain of Spears | c3: 2 em até três | **c2.** *Distribute 3 damage among one or two target enemy Devotees.* | Sai de varredura, vira remoção dividida (§64) |
| 328 | Burn It All | c3: 2 em cada inimigo, 1 no seu God | **c2.** *Deal 2 damage to each Devotee.* | Varredura simétrica (Pyroclasm); pune o próprio Ares |
| 339 | Fear Legion Warplate | Nightmare Strike: descarta e compra; Fear Resonance: discard → +1 ATK | *Nightmare Strike — Whenever equipped Devotee deals combat damage to a God, that God's controller loses {1}{L}.* *Fear Resonance — … whenever an opponent loses Latent Cosmo, equipped Devotee gains +1 ATK until end of round. This ability triggers only once per turn.* | Discard → Latent |
| 343 | Disaster Wing Assassin | Impulse; 1 dano a cada Strike; ping ao morrer | **Razorwind Assault removida** | Excesso de ping |
| 344 | Nightmare Weaver | ETB: descarta e compra; +1 ATK por discard | *Whispers of Terror — When Nightmare Weaver enters the battlefield, target opponent loses {1}{L}.* *Feast on Fear — Whenever an opponent loses Latent Cosmo, Nightmare Weaver gains +1 ATK until end of round. This ability triggers only once per turn.* Illusory Torment igual | Discard → Latent |
| 348 | Nightmare Manifestation | Technique c3: descarta 2, 1 no God por carta | Technique c3: *Target opponent loses up to {2}{L}. Deal 1 damage to that opponent's God for each Latent Cosmo lost this way.* | Stone Rain do Sligh |
| 351 | Azure, the Blue Death | c5: 2 em cada inimigo; 1 no God por destruído | **c3.** *Deal 1 damage to each enemy Devotee. For each enemy Devotee defeated by this Moment, deal 1 damage to the opposing God.* | Varredura leve |
| 352 | The Bloody Rain | c6: 3 em cada Devotee; 1 no God por destruído | **c4.** *Deal 4 damage to target enemy God. Deal 1 damage to your God.* | Fim do wrath; finalizador (1 por Cosmo) |
| 358 | The God of War Awakens | c7: 4 em cada inimigo; +3 ATK e Pierce | **c5.** *Friendly Berserkers gain +2 ATK and Pierce until end of round. Deal 2 damage to each enemy Devotee with Guardian.* | Último ataque que fura Guardian, sem wrath |
| 359 | The Apocalypse of Ares | c8: 5 em cada Devotee + dano por destruído | **c5.** *Deal damage to target enemy God equal to the number of Devotee cards in your Tartarus, up to 5.* | Alcance estilo Fireblast; os Berserkers mortos viram dano |

Mantidas sem mudança: as 68 restantes, inclusive 360 The Endless Holy War (wrath de 9, peça do Rakdos), 357 The Lost Staff of Nike e os Domains 332–335 e 503.

## 3. Efeito no total (estimativa)

| Papel | Atual | Proposto |
| --- | --- | --- |
| Discard no oponente | 8 cartas | 0 (vira perda de Latent) |
| Pings de entrada | 9 | 6 |
| Remoção repetida por Strike | 289, 343, 276, 284, 320 | 276, 284, 320 |
| Wraths (custo ≤ 8) | 327, 328, 351, 352, 358, 359 | 328 e 351 (leves) + 345 |
| Burn direto no God por Spell | 347, 348, 350, 357 | 322, 347, 348, 350, 352, 357, 359 |
| Impulse | 5 | 7 (+ 296 e 310 condicionais) |
| Devotee mais caro | 6 | 5 |

## 4. Lista de referência — Ares Sligh (máx. 3 cópias)

God **ARES** · Domain **THE BURNING BATTLEFIELD** (333)

| Grupo | Cartas | Qtd |
| --- | --- | --- |
| Custo 1 | 293 Disaster Legion Berserker ×3 · 313 Suicidal Berserker ×3 · 308 Frenzied Swordsman ×3 · 310 Warbound Soldier ×2 · 307 Divine Flame Disciple ×2 | 13 |
| Custo 2 | 291 Red Fire Legion Berserker ×3 · 295 Bloodthirsty Berserker ×3 · 343 Disaster Wing Assassin ×3 | 9 |
| Custo 3+ | 299 Red Fire Legion Raider ×3 · 285 Arionte of Anfista ×2 · 271 Ethon Alcmenes ×1 | 6 |
| Equipment | 320 Burning Javelin ×2 · 317 Spear of the Fallen ×2 | 4 |
| Burn | 322 First Blood ×3 · 327 Rain of Spears ×3 · 326 Blood for Blood ×2 · 354 The Fall of Ikki ×2 · 350 The Crimson Fire ×2 | 12 |
| Alcance | 357 The Lost Staff of Nike ×3 · 352 The Bloody Rain ×2 · 359 The Apocalypse of Ares ×2 · 347 Suicide Orders ×2 | 9 |
| Tempo e filtragem | 323 Charge into Battle ×3 · 330 Fuel the Rage ×3 · 325 No Mercy ×1 | 7 |
| **Total** | | **60** |

## 5. Depois da aprovação

1. Gravar as 24 cartas em `data/cards.json` (com `notas_pt`) e espelhar em `card-forge/art-web/cards.json`.
2. Atualizar `playtest/engine-v3/v6/ares.js` e `tools/test-engine-v3-v6-ares.mjs` com os textos novos; perda de Latent usa o mesmo caminho do Unfaith.
3. Salvar a lista em `data/alpha-0.1/decks-competitivos.json` como “Ares Sligh”.
4. Round-robin de bots contra os outros decks; meta: 45–55%.
5. Registrar no `docs/CHANGELOG-regras.md` (cartas de Ares, 2ª passada).
