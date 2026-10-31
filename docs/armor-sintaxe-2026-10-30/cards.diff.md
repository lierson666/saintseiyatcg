# Sintaxe das Armors — diff de data/cards.json (30/10/2026)

Proposta gerada por script; **não gravada**. Regra: guia §26A–§28 e entrada do CHANGELOG de 30/10/2026.

- Campos novos: `bonus_poder`, `bonus_vida` (faixa na base da carta). `bonus_vida` = `damage_cloth` + o +HP do texto.
- Saem: `damage_cloth`, `equipar_auto`, `equipar_custo_ressonante`. `equipar_custo_outros` = Equip; `auto_equip_en` = Resonance.
- A 1ª linha do texto (“Equip N · Resonance — Nome”) é gerada pelos campos, não fica em `habilidades_en`.
- Linhas “Equipped Devotee gets …” saem do texto (viram a faixa); keyword concedida fica como “Equipped Devotee has X.”

Cartas alteradas: 67.

## athena-v6-002 — PEGASUS CLOTH V2

- **1ª linha:** Equip 5 · Resonance — Pegasus Seiya
- **Faixa:** +1 ATK / +4 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-004 — DRAGON CLOTH V2

- **1ª linha:** Equip 5 · Resonance — Dragon Shiryu
- **Faixa:** +5 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

## athena-v6-006 — CYGNUS CLOTH V2

- **1ª linha:** Equip 5 · Resonance — Cygnus Hyoga
- **Faixa:** +1 ATK / +4 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-008 — ANDROMEDA CLOTH V2

- **1ª linha:** Equip 5 · Resonance — Andromeda Shun
- **Faixa:** +1 ATK / +4 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-010 — PHOENIX CLOTH V2

- **1ª linha:** Equip 5 · Resonance — Phoenix Ikki
- **Faixa:** +2 ATK / +3 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 3
- `damage_cloth`: 3 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +2 ATK.
```

## athena-v6-012 — ARIES GOLD CLOTH

- **1ª linha:** Equip 5 · Resonance — Aries Mu
- **Faixa:** +1 ATK / +5 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-014 — GEMINI GOLD CLOTH

- **1ª linha:** Equip 5 · Resonance — Gemini Saga / Dragon Shiryu
- **Faixa:** +2 ATK / +5 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +2 ATK.
```

## athena-v6-016 — LEO GOLD CLOTH

- **1ª linha:** Equip 5 · Resonance — Leo Aiolia / Phoenix Ikki
- **Faixa:** +2 ATK / +4 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +2 ATK.
```

## athena-v6-018 — AQUARIUS GOLD CLOTH

- **1ª linha:** Equip 5 · Resonance — Aquarius Camus / Cygnus Hyoga
- **Faixa:** +1 ATK / +5 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-019 — PEGASUS GOD CLOTH (KAMUI)

- **1ª linha:** Equip 6 · Resonance — Pegasus Seiya
- **Faixa:** +3 ATK / +7 HP
- `bonus_poder`: null → 3
- `bonus_vida`: null → 7
- `damage_cloth`: 7 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +3 ATK and Cheater.
+ Equipped Devotee has Cheater.
```

## athena-v6-042 — JAMIR CLOTH REPAIRER


```diff
- Armor Repair — {1}{C}, {T}: Remove 1 damage from target friendly Armor.
+ Armor Repair — {1}{C}, {T}: Remove 1 damage from target friendly Devotee equipped with an Armor.
```

## athena-v6-044 — CRACKED BRONZE CLOTH

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `damage_cloth`: 2 → null
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-050 — JAMIR REPAIR TOOLS


```diff
- Repair Tools — {1}{C}, {T}: Remove 1 damage from target friendly Armor.
+ Repair Tools — {1}{C}, {T}: Remove 1 damage from target friendly Devotee equipped with an Armor.
```

## athena-v6-066 — EAGLE SILVER CLOTH

- **1ª linha:** Equip 5 · Resonance — Eagle Marin
- **Faixa:** +1 ATK / +4 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-067 — OPHIUCHUS SILVER CLOTH

- **1ª linha:** Equip 5 · Resonance — Ophiuchus Shaina
- **Faixa:** +1 ATK / +3 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 3
- `damage_cloth`: 3 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## athena-v6-068 — LIZARD SILVER CLOTH

- **1ª linha:** Equip 5 · Resonance — Lizard Misty
- **Faixa:** +5 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 5
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +0 ATK / +1 HP.
```

## athena-v6-069 — PERSEUS SILVER CLOTH

- **1ª linha:** Equip 5 · Resonance — Perseus Algol
- **Faixa:** +5 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 5
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +0 ATK / +1 HP.
```

## athena-v6-070 — LYRA SILVER CLOTH

- **1ª linha:** Equip 5 · Resonance — Lyra Orphee
- **Faixa:** +4 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 4
- `damage_cloth`: 3 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +0 ATK / +1 HP.
```

## poseidon-v6-092 — SEA DRAGON SCALE

- **1ª linha:** Equip 5 · Resonance — Sea Dragon Kanon
- **Faixa:** +2 ATK / +5 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +2 ATK.
```

## poseidon-v6-094 — SIREN SCALE

- **1ª linha:** Equip 5 · Resonance — Siren Sorrento
- **Faixa:** +1 ATK / +4 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 4
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## poseidon-v6-096 — SEAHORSE SCALE

- **1ª linha:** Equip 5 · Resonance — Seahorse Baian
- **Faixa:** +1 ATK / +5 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## poseidon-v6-098 — KRAKEN SCALE

- **1ª linha:** Equip 5 · Resonance — Kraken Isaac
- **Faixa:** +1 ATK / +5 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 5
- `damage_cloth`: 5 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +1 ATK.
```

## poseidon-v6-100 — MERMAID SCALE

- **1ª linha:** Equip 5 · Resonance — Mermaid Thetis
- **Faixa:** +5 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 5
- `damage_cloth`: 4 → null
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 0 → null

```diff
- Equipped Devotee gets +0 ATK / +1 HP.
```

## poseidon-v6-122 — CRACKED MARINA SCALE

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `damage_cloth`: 2 → null
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK.
```

## poseidon-v6-128 — SCALE REPAIR TOOLS


```diff
- Scale Restoration — {1}{C}, {T}: Remove 1 damage from target friendly Scale.
+ Scale Restoration — {1}{C}, {T}: Remove 1 damage from target friendly Devotee equipped with a Scale.
```

## hades-v6-182 — WYVERN SURPLICE

- **1ª linha:** Equip 5 · Resonance — Wyvern Rhadamanthys
- **Faixa:** +2 ATK / +2 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +2 ATK / +2 HP.
```

## hades-v6-184 — GRIFFON SURPLICE

- **1ª linha:** Equip 5 · Resonance — Griffon Minos
- **Faixa:** +1 ATK / +3 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 3
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +3 HP.
```

## hades-v6-186 — GARUDA SURPLICE

- **1ª linha:** Equip 5 · Resonance — Garuda Aiacos
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
```

## hades-v6-188 — SPHINX SURPLICE

- **1ª linha:** Equip 5 · Resonance — Sphinx Pharaoh
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-190 — ACHERON SURPLICE

- **1ª linha:** Equip 5 · Resonance — Acheron Charon
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-198 — ARIES SURPLICE

- **1ª linha:** Equip 5 · Resonance — Aries Shion, the Resurrected Saint
- **Faixa:** +2 ATK / +3 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 3
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +2 ATK / +3 HP.
```

## hades-v6-224 — CRACKED SURPLICE

- **1ª linha:** Equip 1
- **Faixa:** +1 ATK / +1 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +1 HP.
```

## hades-v6-225 — SKELETON ARMOR

- **1ª linha:** Equip 3
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-246 — HARPY SURPLICE

- **1ª linha:** Equip 5 · Resonance — Harpy Valentine
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
```

## hades-v6-247 — BALRON SURPLICE

- **1ª linha:** Equip 5 · Resonance — Balron Lune
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-248 — PAPILLON SURPLICE

- **1ª linha:** Equip 5 · Resonance — Papillon Myu
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-249 — DEEP SURPLICE

- **1ª linha:** Equip 4 · Resonance — Deep Niobe
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## hades-v6-250 — BASILISK SURPLICE

- **1ª linha:** Equip 5 · Resonance — Basilisk Sylphid
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: true → null
- `equipar_custo_ressonante`: 1 → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
```

## ares-v6-272 — ETHON WARPLATE

- **1ª linha:** Equip 5 · Resonance — Alcmenes of Ethon
- **Faixa:** +3 ATK / +1 HP
- `auto_equip_en`: [] → ["Alcmenes of Ethon"]
- `bonus_poder`: null → 3
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +3 ATK / +1 HP.
- Ethon Resonance — If equipped Devotee is Alcmenes of Ethon, it gains Pierce.
+ Resonance — Alcmenes of Ethon: Equipped Devotee gains Pierce.
```

## ares-v6-274 — OUROBOROS WARPLATE

- **1ª linha:** Equip 4 · Resonance — Ofir of Ouroboros
- **Faixa:** +1 ATK / +2 HP
- `auto_equip_en`: [] → ["Ofir of Ouroboros"]
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
- Ouroboros Resonance — If equipped Devotee is Ofir of Ouroboros, whenever a friendly Berserker defeats an enemy Devotee during combat, draw a card, then discard a card.
+ Resonance — Ofir of Ouroboros: Whenever a friendly Berserker defeats an enemy Devotee during combat, draw a card, then discard a card.
```

## ares-v6-276 — LAMASSU WARPLATE

- **1ª linha:** Equip 4 · Resonance — Lior of Lamassu
- **Faixa:** +2 ATK / +1 HP
- `auto_equip_en`: [] → ["Lior of Lamassu"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
- Lamassu Resonance — If equipped Devotee is Lior of Lamassu, whenever another friendly Berserker is defeated, you may Prepare Lior.
+ Resonance — Lior of Lamassu: Whenever another friendly Berserker is defeated, you may Prepare Lior.
```

## ares-v6-278 — LAMIA WARPLATE

- **1ª linha:** Equip 3 · Resonance — Lotis of Lamia
- **Faixa:** +1 ATK / +2 HP
- `auto_equip_en`: [] → ["Lotis of Lamia"]
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
- Lamia Resonance — If equipped Devotee is Lotis of Lamia, whenever an opponent discards a card, you may pay 1 Soul. If you do, deal 1 damage to that opponent's God. This ability triggers only once per turn.
+ Resonance — Lotis of Lamia: Whenever an opponent discards a card, you may pay 1 Soul. If you do, deal 1 damage to that opponent's God. This ability triggers only once per turn.
```

## ares-v6-280 — PYTHON WARPLATE

- **1ª linha:** Equip 3 · Resonance — Iseu of Python
- **Faixa:** +2 ATK
- `auto_equip_en`: [] → ["Iseu of Python"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 0
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK.
- Python Resonance — If equipped Devotee is Iseu of Python, whenever another friendly Berserker is defeated, deal 1 damage to target enemy Devotee.
+ Resonance — Iseu of Python: Whenever another friendly Berserker is defeated, deal 1 damage to target enemy Devotee.
```

## ares-v6-282 — AKEPHALOS WARPLATE

- **1ª linha:** Equip 3 · Resonance — Catreu of Akephalos
- **Faixa:** +2 ATK / +1 HP
- `auto_equip_en`: [] → ["Catreu of Akephalos"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
- Akephalos Resonance — If equipped Devotee is Catreu of Akephalos, when that Devotee is defeated, you may pay 2 Soul. If you do, deal 2 damage to target enemy Devotee or God.
+ Resonance — Catreu of Akephalos: When that Devotee is defeated, you may pay 2 Soul. If you do, deal 2 damage to target enemy Devotee or God.
```

## ares-v6-284 — ALCEU'S WARPLATE

- **1ª linha:** Equip 3 · Resonance — Alceu of Lamassu
- **Faixa:** +1 ATK / +1 HP
- `auto_equip_en`: [] → ["Alceu of Lamassu"]
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +1 HP.
- Alceu Resonance — If equipped Devotee is Alceu of Lamassu, whenever another friendly Berserker is defeated, equipped Devotee gains +1 ATTACK until end of turn.
+ Resonance — Alceu of Lamassu: Whenever another friendly Berserker is defeated, equipped Devotee gains +1 ATTACK until end of turn.
```

## ares-v6-286 — ANFISTA WARPLATE

- **1ª linha:** Equip 3 · Resonance — Arionte of Anfista
- **Faixa:** +2 ATK
- `auto_equip_en`: [] → ["Arionte of Anfista"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 0
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK.
- Anfista Resonance — If equipped Devotee is Arionte of Anfista, whenever Arionte defeats an enemy Devotee during combat, you may pay 1 Soul. If you do, deal 1 damage to the opposing God.
+ Resonance — Arionte of Anfista: Whenever Arionte defeats an enemy Devotee during combat, you may pay 1 Soul. If you do, deal 1 damage to the opposing God.
```

## ares-v6-288 — MANTICORE WARPLATE

- **1ª linha:** Equip 4 · Resonance — Basil of Manticore
- **Faixa:** +2 ATK / +1 HP
- `auto_equip_en`: [] → ["Basil of Manticore"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
- Manticore Resonance — If equipped Devotee is Basil of Manticore, whenever an enemy Devotee damaged by Basil this turn is defeated, draw a card, then discard a card.
+ Resonance — Basil of Manticore: Whenever an enemy Devotee damaged by Basil this turn is defeated, draw a card, then discard a card.
```

## ares-v6-314 — CRACKED WARPLATE

- **1ª linha:** Equip 1
- **Faixa:** +1 ATK / +1 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +1 HP.
```

## ares-v6-336 — RED FIRE LEGION WARPLATE

- **1ª linha:** Equip 4
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK / +1 HP.
```

## ares-v6-337 — FLAME LEGION WARPLATE

- **1ª linha:** Equip 3
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +2 HP.
```

## ares-v6-338 — DISASTER LEGION WARPLATE

- **1ª linha:** Equip 3
- **Faixa:** +2 ATK
- `bonus_poder`: null → 2
- `bonus_vida`: null → 0
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK.
```

## ares-v6-339 — FEAR LEGION WARPLATE

- **1ª linha:** Equip 3
- **Faixa:** +1 ATK / +1 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +1 ATK / +1 HP.
```

## ares-v6-340 — BERSERKER CHAMPION WARPLATE

- **1ª linha:** Equip 4 · Resonance — Berserker Champion
- **Faixa:** +2 ATK / +2 HP
- `auto_equip_en`: [] → ["Berserker Champion"]
- `bonus_poder`: null → 2
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Equipped Devotee gets +2 ATK / +2 HP.
- Champion Resonance — If equipped Devotee is Berserker Champion, whenever another friendly Berserker declares a Strike, equipped Devotee gains +1 ATTACK until end of turn.
+ Resonance — Berserker Champion: Whenever another friendly Berserker declares a Strike, equipped Devotee gains +1 ATTACK until end of turn.
```

## artemis-v6-362 — CALLISTO'S LUNAR VESTMENT

- **1ª linha:** Equip 2
- **Faixa:** +2 ATK / +2 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Lunar Protection — Equipped Devotee gets +2/+2.
```

## artemis-v6-364 — BLACK SATELLITE ARMOR

- **1ª linha:** Equip 1
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Lunar Protection — Equipped Devotee gets +1/+2.
```

## artemis-v6-366 — DAPHNE'S SACRED ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +3 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 3
- `equipar_auto`: false → null

```diff
- Ancient Protection — Equipped Devotee gets +1/+3.
```

## artemis-v6-368 — HERMIA'S SACRED ARMOR

- **1ª linha:** Equip 1
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Lunar Protection — Equipped Devotee gets +2/+1.
```

## artemis-v6-370 — SATYR SACRED ARMOR

- **1ª linha:** Equip 3
- **Faixa:** +3 ATK / +3 HP
- `bonus_poder`: null → 3
- `bonus_vida`: null → 3
- `equipar_auto`: false → null

```diff
- Primordial Power — Equipped Devotee gets +3/+3 and gains Pierce.
+ Equipped Devotee has Pierce.
```

## artemis-v6-378 — CHLORIS SACRED ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Verdant Protection — Equipped Devotee gets +1/+2.
```

## artemis-v6-416 — ANCIENT ROOT ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Living Protection — Equipped Devotee gets +1/+2.
```

## artemis-v6-432 — MOONLIGHT HUNTRESS ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +2 ATK / +2 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Silver Protection — Equipped Devotee gets +2/+2.
```

## artemis-v6-434 — PRIMAL GUARDIAN ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +3 ATK / +3 HP
- `bonus_poder`: null → 3
- `bonus_vida`: null → 3
- `equipar_auto`: false → null

```diff
- Living Fortress — Equipped Devotee gets +3/+3.
```

## artemis-v6-436 — SILVER ARROW ARMOR

- **1ª linha:** Equip 2
- **Faixa:** +2 ATK / +1 HP
- `bonus_poder`: null → 2
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Silver Empowerment — Equipped Devotee gets +2/+1.
```

## neutral-v6-465 — SKY STEEL CLOTH

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +2 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 2
- `equipar_auto`: false → null

```diff
- Sky Armor — Equipped Devotee gets +1/+2.
```

## neutral-v6-466 — LAND STEEL CLOTH

- **1ª linha:** Equip 2
- **Faixa:** +3 HP
- `bonus_poder`: null → 0
- `bonus_vida`: null → 3
- `equipar_auto`: false → null

```diff
- Fortified Armor — Equipped Devotee gets +0/+3.
```

## neutral-v6-467 — MARINE STEEL CLOTH

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +1 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Marine Armor — Equipped Devotee gets +1/+1.
```

## neutral-v6-469 — STEEL ARMOR PROTOTYPE

- **1ª linha:** Equip 2
- **Faixa:** +1 ATK / +1 HP
- `bonus_poder`: null → 1
- `bonus_vida`: null → 1
- `equipar_auto`: false → null

```diff
- Experimental Plating — Equipped Devotee gets +1/+1.
```
