# Proposta de raridade por power level (07/11/2026)

Proposta, não decisão. O ranking abaixo não foi gravado em `data/cards.json`: o autor aprova o diff antes.

**Já aplicado (07/11/2026, aprovado pelo autor):** em `data/cards.json`, as 6 cartas que estavam como Rare viraram Legendary: athena-v6-049, athena-v6-084, poseidon-v6-123, hades-v6-196, ares-v6-318, artemis-v6-411. A coluna "atual" da tabela é anterior a essa troca.

Fonte do power level: Cosmo Balance 1.1.0 (`node tools/cosmo-balance-report.mjs`), catálogo hash `bbc2dc2d`, lido da árvore de trabalho de `~/worktrees/sstcg-olympus` (branch `olympus-arena`) em 07/11/2026. Para refazer o ranking (em JSON): `node tools/raridade-proposta.mjs . saida.json`, depois do relatório.

Raridades válidas: Common, Uncommon, Legendary, Divine. **"Rare" não existe; quando aparecer, leia Legendary** (autor, 07/11/2026).

## Método

1. **Índice de power level**, por facção: média de dois percentis dentro da facção.
   - Power (`PowerScore` do motor): o impacto bruto da carta na mesa.
   - Desvio relativo (`(Power − custo efetivo) / custo efetivo`): quanto a carta entrega acima do custo.
2. **Cotas** da decisão de 31/10/2026, mantidas: por facção 3 Divine, 12 Legendary, 30 Uncommon, resto Common. Neutral: 7 Legendary, 17 Uncommon, resto Common, sem Divine. Maior índice leva a raridade mais alta.
3. **Fora do ranking:**
   - Gods ficam Common (decisão de 31/10/2026). O motor não dá curva a God.
   - As 5 armas do ciclo Legendary (athena-v6-049, poseidon-v6-123, hades-v6-196, ares-v6-318, artemis-v6-411) viram **Legendary** e ocupam 1 das 12 vagas de Legendary da facção.
   - ATHENA’S FINAL DECREE (athena-v6-084) é **Legendary** por decisão do autor (07/11/2026) e ocupa outra vaga de Legendary de Athena. No catálogo ela ainda está gravada como Rare: corrigir no diff.
   - Carta que o motor não mediu (`UNRESOLVED`, `PARTIAL` ou Análise inconclusiva) mantém a raridade atual e ocupa a vaga dela. Revisar à mão.
4. Cartas cortadas não entram.
5. A raridade nunca pontua no motor, então não há circularidade.

## Pontos para o autor decidir

- **A proposta mede o catálogo de hoje, antes do balanceamento.** Carta marcada Potencialmente quebrada sobe de raridade (ex.: PYTHON WARPLATE, custo 2, vira Divine). Se o balanceamento corrigir essas cartas, rode de novo: o ranking muda.
- **Raridade por power ignora o peso de história.** Cartas-ícone caem: THE WALL OF LAMENTATION (Divine para Common, motor dá Muito fraca), THE MAIN BREADWINNER e THE GREAT FLOOD (Divine para Uncommon), os Divine Devotees de Ares e Artemis. Se o autor quiser proteger ícones, basta fixar esses ids antes do ranking, como foi feito com ATHENA’S FINAL DECREE.
- **Rotatividade alta:** 248 de 521 cartas mudam. O motor tem 107 cartas cuja incerteza cruza a curva; nelas a posição é frágil.

## Resumo

| Atual → proposta | Cartas |
| --- | --- |
| Common → Common | 182 |
| Uncommon → Uncommon | 71 |
| Common → Uncommon | 70 |
| Uncommon → Common | 65 |
| Uncommon → Legendary | 25 |
| Legendary → Common | 24 |
| Legendary → Uncommon | 20 |
| Common → Legendary | 19 |
| Legendary → Legendary | 17 |
| Uncommon → Divine | 6 |
| Legendary → Divine | 6 |
| Divine → Uncommon | 6 |
| Divine → Legendary | 5 |
| Divine → Divine | 3 |
| Rare → Legendary | 1 |
| Divine → Common | 1 |

## Tabela completa (521 cartas)

Motivo: Power e percentil na facção, desvio relativo, classe do motor e percentil, índice final e posição no ranking da facção.

### Athena

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| athena-v6-001 | PEGASUS SEIYA | Devotee | 3 | Uncommon | **Common** | Power 3.14 (p43%), desvio -8% Balanceada (p33%); índice 0.38, 56º de 88 na facção |
| athena-v6-002 | PEGASUS CLOTH V2 | Equipment | 3 | Common | **Legendary** | Power 6.63 (p90%), desvio +51% Potencialmente quebrada (p87%); índice 0.89, 7º de 88 na facção |
| athena-v6-003 | DRAGON SHIRYU | Devotee | 3 | Uncommon | Uncommon | Power 3.86 (p60%), desvio +14% Acima da curva (p66%); índice 0.63, 33º de 88 na facção |
| athena-v6-004 | DRAGON CLOTH V2 | Equipment | 3 | Uncommon | Uncommon | Power 4.52 (p69%), desvio +3% Balanceada (p49%); índice 0.59, 35º de 88 na facção |
| athena-v6-005 | CYGNUS HYOGA | Devotee | 3 | Uncommon | Uncommon | Power 3.98 (p63%), desvio +17% Acima da curva (p70%); índice 0.67, 29º de 88 na facção |
| athena-v6-006 | CYGNUS CLOTH V2 | Equipment | 3 | Uncommon | **Divine** | Power 9.74 (p98%), desvio +121% Potencialmente quebrada (p98%); índice 0.98, 1º de 88 na facção |
| athena-v6-007 | ANDROMEDA SHUN | Devotee | 3 | Uncommon | Uncommon | Power 4.31 (p67%), desvio +27% Potencialmente quebrada (p78%); índice 0.72, 25º de 88 na facção |
| athena-v6-008 | ANDROMEDA CLOTH V2 | Equipment | 3 | Uncommon | Uncommon | Power 4.69 (p74%), desvio +7% Balanceada (p59%); índice 0.66, 30º de 88 na facção |
| athena-v6-009 | PHOENIX IKKI | Devotee | 4 | Uncommon | Uncommon | Power 5.51 (p82%), desvio +25% Potencialmente quebrada (p77%); índice 0.79, 14º de 88 na facção |
| athena-v6-010 | PHOENIX CLOTH V2 | Equipment | 3 | Uncommon | Uncommon | Power 4.66 (p71%), desvio +6% Balanceada (p57%); índice 0.64, 31º de 88 na facção |
| athena-v6-011 | ARIES MU | Devotee | 4 | Legendary | **Common** | Power 4.20 (p64%), desvio -5% Balanceada (p38%); índice 0.51, 42º de 88 na facção |
| athena-v6-012 | ARIES GOLD CLOTH | Equipment | 4 | Uncommon | Uncommon | Power 6.32 (p86%), desvio +17% Acima da curva (p71%); índice 0.79, 15º de 88 na facção |
| athena-v6-013 | GEMINI SAGA | Devotee | 5 | Legendary | **Uncommon** | Power 5.94 (p83%), desvio +10% Acima da curva (p61%); índice 0.72, 26º de 88 na facção |
| athena-v6-014 | GEMINI GOLD CLOTH | Equipment | 4 | Uncommon | **Legendary** | Power 8.51 (p97%), desvio +58% Potencialmente quebrada (p91%); índice 0.94, 5º de 88 na facção |
| athena-v6-015 | LEO AIOLIA | Devotee | 4 | Legendary | Legendary | Power 6.16 (p84%), desvio +40% Potencialmente quebrada (p83%); índice 0.83, 12º de 88 na facção |
| athena-v6-016 | LEO GOLD CLOTH | Equipment | 4 | Uncommon | Uncommon | Power 6.26 (p85%), desvio +16% Acima da curva (p68%); índice 0.76, 19º de 88 na facção |
| athena-v6-017 | AQUARIUS CAMUS | Devotee | 4 | Legendary | **Uncommon** | Power 5.10 (p78%), desvio +16% Acima da curva (p69%); índice 0.74, 22º de 88 na facção |
| athena-v6-018 | AQUARIUS GOLD CLOTH | Equipment | 4 | Uncommon | **Legendary** | Power 7.33 (p94%), desvio +36% Potencialmente quebrada (p80%); índice 0.87, 8º de 88 na facção |
| athena-v6-019 | PEGASUS GOD CLOTH (KAMUI) | Equipment | 6 | Legendary | **Divine** | Power 14.59 (p100%), desvio +92% Potencialmente quebrada (p94%); índice 0.97, 2º de 88 na facção |
| athena-v6-020 | ATHENA’S SHIELD | Equipment | 4 | Divine | **Legendary** | Power 6.44 (p87%), desvio +46% Potencialmente quebrada (p84%); índice 0.86, 10º de 88 na facção |
| athena-v6-021 | EAGLE MARIN | Devotee | 3 | Uncommon | Uncommon | Power 5.07 (p77%), desvio +49% Potencialmente quebrada (p85%); índice 0.81, 13º de 88 na facção |
| athena-v6-022 | OPHIUCHUS SHAINA | Devotee | 3 | Uncommon | Uncommon | Power 3.58 (p56%), desvio +5% Balanceada (p55%); índice 0.56, 38º de 88 na facção |
| athena-v6-023 | LIZARD MISTY | Devotee | 4 | Uncommon | Uncommon | Power 5.17 (p79%), desvio +18% Acima da curva (p72%); índice 0.76, 21º de 88 na facção |
| athena-v6-024 | PERSEUS ALGOL | Devotee | 4 | Uncommon | **Common** | Power 3.88 (p62%), desvio -12% Abaixo da curva (p31%); índice 0.47, 50º de 88 na facção |
| athena-v6-025 | LYRA ORPHEE | Devotee | 5 | Uncommon | **Common** | Power 2.94 (p40%), desvio -46% Muito fraca (p11%); índice 0.26, 67º de 88 na facção |
| athena-v6-026 | KIKI, APPRENTICE OF JAMIR | Devotee | 2 | Common | Common | Power 1.96 (p20%), desvio -18% Abaixo da curva (p26%); índice 0.23, 71º de 88 na facção |
| athena-v6-027 | CASSIOS, THE FALLEN RIVAL | Devotee | 2 | Common | Common | Power 2.40 (p31%), desvio -0% Balanceada (p45%); índice 0.38, 57º de 88 na facção |
| athena-v6-028 | UNICORN JABU | Devotee | 2 | Common | Common | Power 2.37 (p29%), desvio -1% Balanceada (p43%); índice 0.36, 59º de 88 na facção |
| athena-v6-029 | BEAR GEKI | Devotee | 3 | Common | **Uncommon** | Power 4.75 (p75%), desvio +40% Potencialmente quebrada (p82%); índice 0.78, 16º de 88 na facção |
| athena-v6-030 | HYDRA ICHI | Devotee | 2 | Common | Common | Power 1.88 (p17%), desvio -22% Abaixo da curva (p23%); índice 0.20, 74º de 88 na facção |
| athena-v6-031 | WOLF NACHI | Devotee | 2 | Common | Common | Power 2.18 (p24%), desvio -9% Balanceada (p32%); índice 0.28, 66º de 88 na facção |
| athena-v6-032 | LIONET BAN | Devotee | 2 | Common | Common | Power 2.77 (p37%), desvio +16% Acima da curva (p67%); índice 0.52, 41º de 88 na facção |
| athena-v6-033 | CHAMELEON JUNE | Devotee | 3 | Common | Common | Power 2.33 (p28%), desvio -31% Muito fraca (p17%); índice 0.22, 72º de 88 na facção |
| athena-v6-034 | TATSUMI, SAORI’S GUARDIAN | Devotee | 2 | Common | Common | Power 2.58 (p34%), desvio +7% Balanceada (p60%); índice 0.47, 49º de 88 na facção |
| athena-v6-035 | MIHO, THE ORPHANAGE CARETAKER | Devotee | 2 | Common | Common | Power 1.67 (p14%), desvio -30% Muito fraca (p20%); índice 0.17, 77º de 88 na facção |
| athena-v6-036 | SEIKA, THE LOST SISTER | Devotee | 2 | Common | Common | Power 1.14 (p3%), desvio -53% Muito fraca (p8%); índice 0.06, 84º de 88 na facção |
| athena-v6-037 | SHUNREI, THE PRAYER OF ROZAN | Devotee | 2 | Common | Common | Power 1.32 (p6%), desvio -45% Muito fraca (p13%); índice 0.09, 81º de 88 na facção |
| athena-v6-038 | ESMERALDA, THE FORGOTTEN LOVE | Devotee | 2 | Common | Common | Power 1.48 (p11%), desvio -38% Muito fraca (p14%); índice 0.13, 79º de 88 na facção |
| athena-v6-039 | GUILTY, MASTER OF DEATH QUEEN ISLAND | Devotee | 3 | Common | **Uncommon** | Power 3.85 (p59%), desvio +13% Acima da curva (p63%); índice 0.61, 34º de 88 na facção |
| athena-v6-040 | SANCTUARY GUARD | Devotee | 2 | Common | Common | Power 2.10 (p22%), desvio -13% Abaixo da curva (p30%); índice 0.26, 68º de 88 na facção |
| athena-v6-041 | SANCTUARY HEALER | Devotee | 3 | Common | Common | Power 1.47 (p10%), desvio -57% Muito fraca (p5%); índice 0.07, 82º de 88 na facção |
| athena-v6-042 | JAMIR CLOTH REPAIRER | Devotee | 2 | Common | Common | Power 1.72 (p15%), desvio -28% Muito fraca (p21%); índice 0.18, 75º de 88 na facção |
| athena-v6-043 | STAR HILL ACOLYTE | Devotee | 2 | Common | Common | Power 2.31 (p26%), desvio -4% Balanceada (p40%); índice 0.33, 61º de 88 na facção |
| athena-v6-044 | CRACKED BRONZE CLOTH | Equipment | 2 | Common | Common | Power 2.93 (p39%), desvio -19% Abaixo da curva (p25%); índice 0.32, 62º de 88 na facção |
| athena-v6-045 | DRAGON SHIELD | Equipment | 2 | Common | Common | Power 1.95 (p18%), desvio -35% Muito fraca (p16%); índice 0.17, 76º de 88 na facção |
| athena-v6-046 | ANDROMEDA CHAIN | Equipment | 2 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| athena-v6-047 | PHOENIX FEATHER | Equipment | 2 | Common | Common | Power 1.37 (p8%), desvio -54% Muito fraca (p6%); índice 0.07, 83º de 88 na facção |
| athena-v6-048 | LIBRA SWORD | Equipment | 3 | Common | **Uncommon** | Power 5.18 (p80%), desvio +18% Acima da curva (p74%); índice 0.77, 17º de 88 na facção |
| athena-v6-049 | LIBRA SHIELD | Equipment | 3 | Common | **Legendary** | Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary |
| athena-v6-050 | JAMIR REPAIR TOOLS | Equipment | 2 | Common | Common | Power 0.81 (p2%), desvio -73% Muito fraca (p0%); índice 0.01, 87º de 88 na facção |
| athena-v6-051 | SANCTUARY TORCH | Equipment | 2 | Common | Common | Power 2.50 (p33%), desvio -31% Muito fraca (p18%); índice 0.26, 69º de 88 na facção |
| athena-v6-052 | THE GALAXIAN WARS | Spell | 3 | Common | Common | Power 3.24 (p46%), desvio -5% Balanceada (p36%); índice 0.41, 54º de 88 na facção |
| athena-v6-053 | THE FIRST BURN OF COSMO | Spell | 2 | Common | Common | Power 2.04 (p21%), desvio -15% Abaixo da curva (p28%); índice 0.24, 70º de 88 na facção |
| athena-v6-054 | A SAINT NEVER SURRENDERS | Spell | 3 | Common | Common | Power 1.20 (p5%), desvio -65% Muito fraca (p2%); índice 0.03, 86º de 88 na facção |
| athena-v6-055 | THE MASKED SAINT’S OATH | Spell | 2 | Common | Common | Power 2.48 (p32%), desvio +3% Balanceada (p51%); índice 0.41, 53º de 88 na facção |
| athena-v6-056 | PROTECT SAORI | Spell | 2 | Common | Common | Power 2.71 (p36%), desvio +13% Acima da curva (p62%); índice 0.49, 46º de 88 na facção |
| athena-v6-057 | KIKI’S TELEKINESIS | Spell | 2 | Common | **Legendary** | Power 6.92 (p93%), desvio +188% Potencialmente quebrada (p100%); índice 0.97, 4º de 88 na facção |
| athena-v6-058 | BLOOD OF THE DRAGON | Spell | 2 | Common | Common | Power 2.39 (p30%), desvio -0% Balanceada (p44%); índice 0.37, 58º de 88 na facção |
| athena-v6-059 | A PROMISE TO SHUNREI | Spell | 2 | Common | **Uncommon** | Power 3.71 (p57%), desvio +55% Potencialmente quebrada (p90%); índice 0.74, 23º de 88 na facção |
| athena-v6-060 | THE TRAINING OF PEGASUS | Spell | 2 | Common | **Uncommon** | Power 3.87 (p61%), desvio +61% Potencialmente quebrada (p92%); índice 0.76, 20º de 88 na facção |
| athena-v6-061 | THE CALL OF ATHENA | Spell | 3 | Common | Common | Power 3.26 (p47%), desvio -4% Balanceada (p39%); índice 0.43, 52º de 88 na facção |
| athena-v6-062 | GALAXIAN WARS ARENA | Domain | 3 | Common | Common | Power 1.79 (p16%), desvio +34% Potencialmente quebrada (p79%); índice 0.48, 48º de 88 na facção |
| athena-v6-063 | JAMIR TOWER | Domain | 3 | Common | Common | Power 0.73 (p1%), desvio -47% Muito fraca (p10%); índice 0.06, 85º de 88 na facção |
| athena-v6-064 | THE FIVE OLD PEAKS | Domain | 3 | Common | **Uncommon** | Power 2.18 (p23%), desvio +64% Potencialmente quebrada (p93%); índice 0.58, 36º de 88 na facção |
| athena-v6-065 | THE STAIRWAY TO THE TWELVE TEMPLES | Domain | 4 | Common | Common | Power 1.33 (p7%), desvio -5% Balanceada (p37%); índice 0.22, 73º de 88 na facção |
| athena-v6-066 | EAGLE SILVER CLOTH | Equipment | 3 | Common | **Legendary** | Power 6.64 (p91%), desvio +51% Potencialmente quebrada (p89%); índice 0.90, 6º de 88 na facção |
| athena-v6-067 | OPHIUCHUS SILVER CLOTH | Equipment | 3 | Uncommon | Uncommon | Power 4.98 (p76%), desvio +13% Acima da curva (p64%); índice 0.70, 27º de 88 na facção |
| athena-v6-068 | LIZARD SILVER CLOTH | Equipment | 3 | Uncommon | **Common** | Power 3.21 (p45%), desvio -27% Muito fraca (p22%); índice 0.33, 60º de 88 na facção |
| athena-v6-069 | PERSEUS SILVER CLOTH | Equipment | 4 | Uncommon | **Common** | Power 4.67 (p72%), desvio -14% Abaixo da curva (p29%); índice 0.51, 43º de 88 na facção |
| athena-v6-070 | LYRA SILVER CLOTH | Equipment | 4 | Uncommon | Uncommon | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| athena-v6-071 | CENTAUR BABEL | Devotee | 3 | Common | Common | Power 3.20 (p44%), desvio -6% Balanceada (p34%); índice 0.39, 55º de 88 na facção |
| athena-v6-072 | WHALE MOSES | Devotee | 4 | Uncommon | Uncommon | Power 4.32 (p68%), desvio -2% Balanceada (p41%); índice 0.55, 39º de 88 na facção |
| athena-v6-073 | HOUND ASTERION | Devotee | 3 | Uncommon | **Common** | Power 3.40 (p52%), desvio +0% Balanceada (p47%); índice 0.49, 45º de 88 na facção |
| athena-v6-074 | CROW JAMIAN | Devotee | 3 | Uncommon | **Common** | Power 3.39 (p51%), desvio -0% Balanceada (p46%); índice 0.48, 47º de 88 na facção |
| athena-v6-075 | CERBERUS DANTE | Devotee | 4 | Uncommon | Uncommon | Power 4.64 (p70%), desvio +5% Balanceada (p56%); índice 0.63, 32º de 88 na facção |
| athena-v6-076 | CASSIOS’S SACRIFICE | Spell | 3 | Common | Common | Power 3.46 (p53%), desvio +2% Balanceada (p48%); índice 0.51, 44º de 88 na facção |
| athena-v6-077 | SHIRYU’S SACRIFICED SIGHT | Spell | 3 | Uncommon | **Common** | Power 1.59 (p13%), desvio -53% Muito fraca (p7%); índice 0.10, 80º de 88 na facção |
| athena-v6-078 | FREEZING COFFIN | Spell | 4 | Uncommon | **Legendary** | Power 6.56 (p89%), desvio +49% Potencialmente quebrada (p86%); índice 0.87, 9º de 88 na facção |
| athena-v6-079 | SHUN’S EMBRACE | Spell | 3 | Common | Common | Power 3.54 (p54%), desvio +4% Balanceada (p52%); índice 0.53, 40º de 88 na facção |
| athena-v6-080 | THE RETURN OF THE PHOENIX | Spell | 5 | Legendary | **Divine** | Power 10.44 (p99%), desvio +93% Potencialmente quebrada (p95%); índice 0.97, 3º de 88 na facção |
| athena-v6-081 | THE TESTAMENT OF AIOLOS | Spell | 3 | Uncommon | Uncommon | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| athena-v6-082 | THE GOLDEN ARROW | Spell | 1 | Legendary | Legendary | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| athena-v6-083 | THE TWELVE FLAMES | Spell | 4 | Uncommon | Uncommon | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| athena-v6-084 | ATHENA’S FINAL DECREE | Spell | 5 | Rare | **Legendary** | Legendary por decisão do autor (07/11/2026); ocupa 1 vaga de Legendary |
| athena-v6-085 | SHIRYU’S LAST DRAGON | Spell | 6 | Legendary | **Common** | Power 2.26 (p25%), desvio -65% Muito fraca (p3%); índice 0.14, 78º de 88 na facção |
| athena-v6-086 | DEPRIVED OF SENSES | Spell | 6 | Legendary | **Uncommon** | Power 6.71 (p92%), desvio +5% Balanceada (p54%); índice 0.73, 24º de 88 na facção |
| athena-v6-087 | SEIYA RAISES ATHENA’S SHIELD | Spell | 5 | Legendary | **Common** | Power 4.24 (p66%), desvio -22% Abaixo da curva (p24%); índice 0.45, 51º de 88 na facção |
| athena-v6-088 | THE EIGHTH SENSE | Spell | 5 | Legendary | **Common** | Power 3.35 (p49%), desvio -38% Muito fraca (p15%); índice 0.32, 63º de 88 na facção |
| athena-v6-089 | THE WALL OF LAMENTATION | Spell | 6 | Divine | **Common** | Power 3.26 (p48%), desvio -49% Muito fraca (p9%); índice 0.29, 65º de 88 na facção |
| athena-v6-090 | THE WILL OF ATHENA | Spell | 6 | Divine | **Legendary** | Power 7.88 (p95%), desvio +23% Acima da curva (p76%); índice 0.86, 11º de 88 na facção |
| athena-v6-501 | ATHENA'S STATUE | Domain |  | Common | Common | Power 0.47 (p0%), desvio -66% Muito fraca (p1%); índice 0.01, 88º de 88 na facção |
| athena-v6-505 | ATHENA'S AEGIS | Spell | 1 | Common | **Uncommon** | Power 3.07 (p41%), desvio +119% Potencialmente quebrada (p97%); índice 0.69, 28º de 88 na facção |
| athena-v6-506 | SANCTUARY'S JUDGMENT | Spell | 2 | Common | **Uncommon** | Power 2.90 (p38%), desvio +21% Acima da curva (p75%); índice 0.56, 37º de 88 na facção |
| athena-v6-507 | OATH OF THE SAINTS | Spell | 1 | Common | **Uncommon** | Power 3.55 (p55%), desvio +154% Potencialmente quebrada (p99%); índice 0.77, 18º de 88 na facção |
| athena-v6-520 | THE SANCTUARY GATES | Domain | 3 | Common | Common | Power 1.40 (p9%), desvio +5% Balanceada (p53%); índice 0.31, 64º de 88 na facção |

### Poseidon

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| poseidon-v6-091 | SEA DRAGON KANON | Devotee | 6 | Legendary | **Uncommon** | Power 6.43 (p92%), desvio +0% Balanceada (p61%); índice 0.76, 15º de 86 na facção |
| poseidon-v6-092 | SEA DRAGON SCALE | Equipment | 4 | Uncommon | **Legendary** | Power 7.07 (p96%), desvio +31% Potencialmente quebrada (p84%); índice 0.90, 4º de 86 na facção |
| poseidon-v6-093 | SIREN SORRENTO | Devotee | 5 | Legendary | **Uncommon** | Power 4.75 (p81%), desvio -12% Abaixo da curva (p41%); índice 0.61, 29º de 86 na facção |
| poseidon-v6-094 | SIREN SCALE | Equipment | 4 | Uncommon | **Legendary** | Power 6.76 (p95%), desvio +25% Potencialmente quebrada (p81%); índice 0.88, 5º de 86 na facção |
| poseidon-v6-095 | SEAHORSE BAIAN | Devotee | 5 | Legendary | **Uncommon** | Power 4.89 (p84%), desvio -10% Balanceada (p45%); índice 0.64, 24º de 86 na facção |
| poseidon-v6-096 | SEAHORSE SCALE | Equipment | 4 | Uncommon | **Legendary** | Power 6.65 (p94%), desvio +23% Acima da curva (p80%); índice 0.87, 6º de 86 na facção |
| poseidon-v6-097 | KRAKEN ISAAC | Devotee | 5 | Legendary | Legendary | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| poseidon-v6-098 | KRAKEN SCALE | Equipment | 4 | Uncommon | **Legendary** | Power 6.58 (p93%), desvio +22% Acima da curva (p79%); índice 0.86, 7º de 86 na facção |
| poseidon-v6-099 | MERMAID THETIS | Devotee | 3 | Uncommon | Uncommon | Power 3.58 (p53%), desvio +5% Balanceada (p65%); índice 0.59, 32º de 86 na facção |
| poseidon-v6-100 | MERMAID SCALE | Equipment | 3 | Uncommon | **Common** | Power 3.61 (p55%), desvio -18% Abaixo da curva (p34%); índice 0.45, 57º de 86 na facção |
| poseidon-v6-101 | JULIAN SOLO, THE CHOSEN VESSEL | Devotee | 3 | Uncommon | Uncommon | Power 3.46 (p52%), desvio +2% Balanceada (p64%); índice 0.58, 35º de 86 na facção |
| poseidon-v6-102 | PRIEST OF THE ABYSS | Devotee | 3 | Common | Common | Power 2.68 (p32%), desvio -21% Abaixo da curva (p29%); índice 0.31, 66º de 86 na facção |
| poseidon-v6-103 | HERALD OF THE SEVEN SEAS | Devotee | 3 | Uncommon | Uncommon | Power 3.81 (p60%), desvio +12% Acima da curva (p73%); índice 0.66, 21º de 86 na facção |
| poseidon-v6-104 | ROYAL TRIDENT GUARD | Devotee | 4 | Uncommon | Uncommon | Power 4.04 (p65%), desvio -8% Balanceada (p46%); índice 0.55, 39º de 86 na facção |
| poseidon-v6-105 | ATLANTEAN SENTINEL | Devotee | 3 | Common | **Uncommon** | Power 3.75 (p58%), desvio +10% Acima da curva (p69%); índice 0.64, 26º de 86 na facção |
| poseidon-v6-106 | OCEAN TEMPLE GUARD | Devotee | 2 | Common | Common | Power 2.36 (p22%), desvio -2% Balanceada (p56%); índice 0.39, 60º de 86 na facção |
| poseidon-v6-107 | MARINA SPEARMAN | Devotee | 1 | Common | **Uncommon** | Power 2.75 (p34%), desvio +97% Potencialmente quebrada (p98%); índice 0.66, 22º de 86 na facção |
| poseidon-v6-108 | MARINA VANGUARD | Devotee | 3 | Common | **Uncommon** | Power 4.34 (p74%), desvio +28% Potencialmente quebrada (p82%); índice 0.78, 14º de 86 na facção |
| poseidon-v6-109 | ABYSSAL WATCHER | Devotee | 2 | Common | Common | Power 1.94 (p15%), desvio -19% Abaixo da curva (p31%); índice 0.23, 73º de 86 na facção |
| poseidon-v6-110 | CORAL REEF DEFENDER | Devotee | 3 | Common | **Uncommon** | Power 3.43 (p48%), desvio +1% Balanceada (p62%); índice 0.55, 40º de 86 na facção |
| poseidon-v6-111 | TIDAL ASSAILANT | Devotee | 3 | Common | Common | Power 2.53 (p25%), desvio -26% Muito fraca (p22%); índice 0.24, 71º de 86 na facção |
| poseidon-v6-112 | DEEP SEA HUNTER | Devotee | 3 | Common | **Uncommon** | Power 3.62 (p56%), desvio +7% Balanceada (p68%); índice 0.62, 28º de 86 na facção |
| poseidon-v6-113 | ATLANTEAN ACOLYTE | Devotee | 2 | Common | Common | Power 1.95 (p16%), desvio -19% Abaixo da curva (p32%); índice 0.24, 70º de 86 na facção |
| poseidon-v6-114 | TEMPLE OF THE SEA PRIESTESS | Devotee | 3 | Common | Common | Power 1.65 (p13%), desvio -51% Muito fraca (p8%); índice 0.11, 78º de 86 na facção |
| poseidon-v6-115 | OCEAN CURRENT SCOUT | Devotee | 2 | Common | Common | Power 2.77 (p35%), desvio +15% Acima da curva (p74%); índice 0.55, 43º de 86 na facção |
| poseidon-v6-116 | PEARL SANCTUARY KEEPER | Devotee | 3 | Common | Common | Power 2.52 (p24%), desvio -26% Muito fraca (p21%); índice 0.22, 74º de 86 na facção |
| poseidon-v6-117 | ANCIENT SEA GUARDIAN | Devotee | 4 | Common | Common | Power 3.94 (p62%), desvio -10% Abaixo da curva (p44%); índice 0.53, 45º de 86 na facção |
| poseidon-v6-118 | MARINA STANDARD BEARER | Devotee | 3 | Common | Common | Power 3.25 (p44%), desvio -4% Balanceada (p51%); índice 0.47, 53º de 86 na facção |
| poseidon-v6-119 | TRIDENT TEMPLE WARDEN | Devotee | 4 | Common | Common | Power 3.02 (p41%), desvio -31% Muito fraca (p18%); índice 0.29, 67º de 86 na facção |
| poseidon-v6-120 | THE DROWNED PROPHET | Devotee | 4 | Common | Common | Power 2.10 (p18%), desvio -52% Muito fraca (p7%); índice 0.12, 77º de 86 na facção |
| poseidon-v6-121 | ATLANTEAN TRIDENT MASTER | Devotee | 4 | Common | **Uncommon** | Power 4.65 (p79%), desvio +6% Balanceada (p66%); índice 0.72, 17º de 86 na facção |
| poseidon-v6-122 | CRACKED MARINA SCALE | Equipment | 2 | Common | Common | Power 2.93 (p40%), desvio -19% Abaixo da curva (p33%); índice 0.36, 62º de 86 na facção |
| poseidon-v6-123 | ATLANTEAN TRIDENT | Equipment | 3 | Common | **Legendary** | Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary |
| poseidon-v6-124 | CORAL CROWN | Equipment | 2 | Common | Common | Power 1.03 (p4%), desvio -71% Muito fraca (p2%); índice 0.03, 85º de 86 na facção |
| poseidon-v6-125 | OCEANIC SPEAR | Equipment | 2 | Common | Common | Power 3.59 (p54%), desvio -14% Abaixo da curva (p40%); índice 0.47, 52º de 86 na facção |
| poseidon-v6-126 | ABYSSAL CHAINS | Equipment | 3 | Common | Common | Power 2.77 (p38%), desvio -47% Muito fraca (p11%); índice 0.24, 69º de 86 na facção |
| poseidon-v6-127 | PEARL OF THE DEEP | Equipment | 2 | Common | Common | Power 1.40 (p8%), desvio -61% Muito fraca (p5%); índice 0.06, 81º de 86 na facção |
| poseidon-v6-128 | SCALE REPAIR TOOLS | Equipment | 2 | Common | Common | Power 1.28 (p7%), desvio -70% Muito fraca (p4%); índice 0.05, 82º de 86 na facção |
| poseidon-v6-129 | SEA SERPENT FANG | Equipment | 2 | Common | Common | Power 1.93 (p14%), desvio -54% Muito fraca (p6%); índice 0.10, 79º de 86 na facção |
| poseidon-v6-130 | ATLANTEAN WAR HELM | Equipment | 2 | Common | Common | Power 0.94 (p2%), desvio -74% Muito fraca (p1%); índice 0.02, 86º de 86 na facção |
| poseidon-v6-131 | TEMPLE GUARD SHIELD | Equipment | 3 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| poseidon-v6-132 | THE RISING TIDE | Spell | 3 | Common | Common | Power 3.34 (p46%), desvio -2% Balanceada (p54%); índice 0.50, 48º de 86 na facção |
| poseidon-v6-133 | CALL OF THE OCEAN | Spell | 2 | Common | Common | Power 2.56 (p26%), desvio +7% Balanceada (p67%); índice 0.46, 54º de 86 na facção |
| poseidon-v6-134 | WAVES OF DESTRUCTION | Spell | 3 | Common | Common | Power 2.25 (p20%), desvio -34% Muito fraca (p15%); índice 0.18, 76º de 86 na facção |
| poseidon-v6-135 | BENEATH THE SURFACE | Spell | 1 | Common | **Uncommon** | Power 2.31 (p21%), desvio +65% Potencialmente quebrada (p89%); índice 0.55, 41º de 86 na facção |
| poseidon-v6-136 | THE SEA NEVER FORGIVES | Spell | 2 | Common | **Legendary** | Power 4.24 (p69%), desvio +77% Potencialmente quebrada (p91%); índice 0.80, 11º de 86 na facção |
| poseidon-v6-137 | CRUSHING WATER PRESSURE | Spell | 3 | Common | Common | Power 3.40 (p47%), desvio +0% Balanceada (p59%); índice 0.53, 46º de 86 na facção |
| poseidon-v6-138 | THE OCEAN'S EMBRACE | Spell | 1 | Common | **Uncommon** | Power 2.73 (p33%), desvio +95% Potencialmente quebrada (p96%); índice 0.65, 23º de 86 na facção |
| poseidon-v6-139 | WHISPERS FROM THE ABYSS | Spell | 1 | Common | **Uncommon** | Power 2.77 (p36%), desvio +98% Potencialmente quebrada (p99%); índice 0.68, 19º de 86 na facção |
| poseidon-v6-140 | MARINA'S OATH | Spell | 2 | Common | Common | Power 2.20 (p19%), desvio -8% Balanceada (p47%); índice 0.33, 63º de 86 na facção |
| poseidon-v6-141 | THE FIRST GREAT STORM | Spell | 5 | Common | Common | Power 3.94 (p61%), desvio -27% Muito fraca (p19%); índice 0.40, 59º de 86 na facção |
| poseidon-v6-142 | THE UNDERSEA SANCTUARY | Domain | 4 | Uncommon | Uncommon | Power 3.80 (p59%), desvio +249% Potencialmente quebrada (p100%); índice 0.79, 12º de 86 na facção |
| poseidon-v6-143 | THE NORTH ATLANTIC PILLAR | Domain | 4 | Uncommon | **Common** | Power 1.09 (p5%), desvio -11% Balanceada (p42%); índice 0.24, 72º de 86 na facção |
| poseidon-v6-144 | THE SOUTH ATLANTIC PILLAR | Domain | 4 | Uncommon | **Common** | Power 1.57 (p12%), desvio +45% Potencialmente quebrada (p86%); índice 0.49, 49º de 86 na facção |
| poseidon-v6-145 | THE NORTH PACIFIC PILLAR | Domain | 4 | Uncommon | **Common** | Power 0.64 (p0%), desvio -48% Muito fraca (p9%); índice 0.05, 84º de 86 na facção |
| poseidon-v6-149 | THE ABYSSAL TRENCH | Domain | 4 | Common | Common | Power 1.22 (p6%), desvio +12% Balanceada (p72%); índice 0.39, 61º de 86 na facção |
| poseidon-v6-150 | GOD BREATH | Spell | 4 | Uncommon | Uncommon | Power 4.16 (p67%), desvio -6% Balanceada (p48%); índice 0.58, 34º de 86 na facção |
| poseidon-v6-151 | DEAD END SYMPHONY | Spell | 4 | Uncommon | Uncommon | Power 4.27 (p73%), desvio -3% Balanceada (p53%); índice 0.63, 27º de 86 na facção |
| poseidon-v6-152 | MARINE WHIRLWIND | Spell | 3 | Common | Common | Power 3.24 (p42%), desvio -5% Balanceada (p49%); índice 0.46, 55º de 86 na facção |
| poseidon-v6-153 | AURORA BOREALIS | Spell | 4 | Uncommon | **Legendary** | Power 5.17 (p87%), desvio +18% Acima da curva (p76%); índice 0.82, 9º de 86 na facção |
| poseidon-v6-154 | THE SEA DRAGON'S COMMAND | Spell | 3 | Uncommon | **Legendary** | Power 4.93 (p85%), desvio +45% Potencialmente quebrada (p87%); índice 0.86, 8º de 86 na facção |
| poseidon-v6-155 | THE SIREN'S LAMENT | Spell | 3 | Common | Common | Power 2.67 (p31%), desvio -21% Abaixo da curva (p28%); índice 0.29, 68º de 86 na facção |
| poseidon-v6-156 | WALL OF OCEAN CURRENTS | Spell | 2 | Common | **Legendary** | Power 4.24 (p71%), desvio +77% Potencialmente quebrada (p92%); índice 0.81, 10º de 86 na facção |
| poseidon-v6-157 | THE FROZEN DEPTHS | Spell | 4 | Uncommon | Uncommon | Power 4.36 (p75%), desvio -1% Balanceada (p58%); índice 0.66, 20º de 86 na facção |
| poseidon-v6-158 | THE AWAKENING OF ATLANTIS | Spell | 2 | Uncommon | Uncommon | Power 2.90 (p39%), desvio +21% Acima da curva (p78%); índice 0.58, 33º de 86 na facção |
| poseidon-v6-159 | THE SEVEN SEAS ANSWER | Spell | 3 | Uncommon | **Divine** | Power 6.26 (p89%), desvio +84% Potencialmente quebrada (p95%); índice 0.92, 2º de 86 na facção |
| poseidon-v6-160 | THE SILENCE BELOW | Spell | 3 | Common | Common | Power 3.29 (p45%), desvio -3% Balanceada (p52%); índice 0.48, 50º de 86 na facção |
| poseidon-v6-161 | THE UNBROKEN TIDE | Spell | 4 | Uncommon | **Common** | Power 2.56 (p29%), desvio -42% Muito fraca (p13%); índice 0.21, 75º de 86 na facção |
| poseidon-v6-162 | GALACTIC ILLUSION | Spell | 5 | Uncommon | **Common** | Power 4.15 (p66%), desvio -23% Abaixo da curva (p25%); índice 0.45, 56º de 86 na facção |
| poseidon-v6-163 | DEAD END CLIMAX | Spell | 5 | Uncommon | **Common** | Power 3.43 (p49%), desvio -36% Muito fraca (p14%); índice 0.32, 64º de 86 na facção |
| poseidon-v6-164 | RISING BILLOWS | Spell | 5 | Uncommon | Uncommon | Power 4.50 (p78%), desvio -17% Abaixo da curva (p36%); índice 0.57, 36º de 86 na facção |
| poseidon-v6-165 | VIKING TIGER CLAW | Spell | 3 | Uncommon | Uncommon | Power 3.99 (p64%), desvio +17% Acima da curva (p75%); índice 0.69, 18º de 86 na facção |
| poseidon-v6-166 | THE GOLDEN TRIANGLE | Spell | 5 | Uncommon | Uncommon | Power 4.43 (p76%), desvio -18% Abaixo da curva (p35%); índice 0.56, 38º de 86 na facção |
| poseidon-v6-167 | SONG OF THE LAST SIREN | Spell | 3 | Uncommon | **Common** | Power 4.24 (p72%), desvio -16% Abaixo da curva (p38%); índice 0.55, 42º de 86 na facção |
| poseidon-v6-168 | THE NORTHERN STORM | Spell | 5 | Uncommon | **Common** | Power 4.19 (p68%), desvio -22% Abaixo da curva (p27%); índice 0.48, 51º de 86 na facção |
| poseidon-v6-169 | THE ETERNAL ICEBERG | Spell | 6 | Legendary | Legendary | Power 9.21 (p99%), desvio +44% Potencialmente quebrada (p85%); índice 0.92, 3º de 86 na facção |
| poseidon-v6-170 | ATLANTEAN ROYAL SCEPTER | Equipment | 5 | Uncommon | **Common** | Power 1.41 (p9%), desvio -74% Muito fraca (p0%); índice 0.05, 83º de 86 na facção |
| poseidon-v6-171 | THE EMPEROR'S DECREE | Spell | 6 | Legendary | **Divine** | Power 9.28 (p100%), desvio +45% Potencialmente quebrada (p88%); índice 0.94, 1º de 86 na facção |
| poseidon-v6-172 | POSEIDON'S AWAKENING | Spell | 6 | Legendary | **Common** | Power 4.69 (p80%), desvio -27% Muito fraca (p20%); índice 0.50, 47º de 86 na facção |
| poseidon-v6-173 | THE FALL OF ATLANTIS | Spell | 6 | Legendary | **Common** | Power 4.81 (p82%), desvio -25% Abaixo da curva (p24%); índice 0.53, 44º de 86 na facção |
| poseidon-v6-174 | THE WRATH OF THE SEVEN SEAS | Spell | 6 | Legendary | **Uncommon** | Power 5.39 (p88%), desvio -16% Abaixo da curva (p39%); índice 0.64, 25º de 86 na facção |
| poseidon-v6-175 | THE UNENDING DELUGE | Spell | 6 | Legendary | **Common** | Power 3.45 (p51%), desvio -46% Muito fraca (p12%); índice 0.31, 65º de 86 na facção |
| poseidon-v6-176 | THE WILL OF THE OCEAN | Spell | 6 | Legendary | Legendary | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| poseidon-v6-177 | THE EMPEROR'S RETURN | Spell | 6 | Legendary | **Uncommon** | Power 4.95 (p86%), desvio -23% Abaixo da curva (p26%); índice 0.56, 37º de 86 na facção |
| poseidon-v6-178 | POSEIDON'S TRIDENT | Equipment | 6 | Divine | Divine | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| poseidon-v6-179 | THE MAIN BREADWINNER | Spell | 6 | Divine | **Uncommon** | Power 6.30 (p91%), desvio -2% Balanceada (p55%); índice 0.73, 16º de 86 na facção |
| poseidon-v6-180 | THE GREAT FLOOD | Spell | 7 | Divine | **Uncommon** | Power 7.42 (p98%), desvio +0% Balanceada (p60%); índice 0.79, 13º de 86 na facção |
| poseidon-v6-502 | THE TIDAL ARCHIVE | Domain |  | Common | Common | Power 0.82 (p1%), desvio -33% Muito fraca (p16%); índice 0.09, 80º de 86 na facção |
| poseidon-v6-508 | UNDERTOW | Spell | 1 | Common | Common | Power 1.55 (p11%), desvio +11% Balanceada (p71%); índice 0.41, 58º de 86 na facção |
| poseidon-v6-509 | TIDAL VETO | Spell | 1 | Common | **Uncommon** | Power 2.56 (p27%), desvio +83% Potencialmente quebrada (p93%); índice 0.60, 31º de 86 na facção |
| poseidon-v6-510 | MIST OF THE DEEP | Spell | 1 | Common | **Uncommon** | Power 2.56 (p28%), desvio +83% Potencialmente quebrada (p94%); índice 0.61, 30º de 86 na facção |

### Hades

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| hades-v6-181 | WYVERN RHADAMANTHYS | Devotee | 5 | Legendary | **Uncommon** | Power 5.30 (p83%), desvio -2% Balanceada (p60%); índice 0.72, 22º de 94 na facção |
| hades-v6-182 | WYVERN SURPLICE | Equipment | 3 | Common | **Uncommon** | Power 4.94 (p80%), desvio +12% Acima da curva (p75%); índice 0.77, 17º de 94 na facção |
| hades-v6-183 | GRIFFON MINOS | Devotee | 5 | Legendary | **Common** | Power 4.31 (p70%), desvio -20% Abaixo da curva (p31%); índice 0.51, 51º de 94 na facção |
| hades-v6-184 | GRIFFON SURPLICE | Equipment | 3 | Common | Common | Power 3.83 (p59%), desvio -13% Abaixo da curva (p45%); índice 0.52, 48º de 94 na facção |
| hades-v6-185 | GARUDA AIACOS | Devotee | 5 | Legendary | **Uncommon** | Power 5.74 (p84%), desvio +6% Balanceada (p72%); índice 0.78, 16º de 94 na facção |
| hades-v6-186 | GARUDA SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 2.99 (p44%), desvio -32% Muito fraca (p26%); índice 0.35, 66º de 94 na facção |
| hades-v6-187 | SPHINX PHARAOH | Devotee | 4 | Uncommon | **Common** | Power 3.82 (p56%), desvio -13% Abaixo da curva (p43%); índice 0.49, 53º de 94 na facção |
| hades-v6-188 | SPHINX SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 2.07 (p24%), desvio -53% Muito fraca (p9%); índice 0.16, 83º de 94 na facção |
| hades-v6-189 | ACHERON CHARON | Devotee | 3 | Uncommon | **Common** | Power 2.17 (p27%), desvio -36% Muito fraca (p22%); índice 0.24, 73º de 94 na facção |
| hades-v6-190 | ACHERON SURPLICE | Equipment | 2 | Common | Common | Power 2.83 (p41%), desvio -17% Abaixo da curva (p34%); índice 0.38, 63º de 94 na facção |
| hades-v6-191 | HYPNOS, GOD OF SLEEP | Devotee | 7 | Legendary | **Uncommon** | Power 7.26 (p90%), desvio -2% Balanceada (p61%); índice 0.76, 18º de 94 na facção |
| hades-v6-192 | ETERNAL SLUMBER | Spell | 5 | Uncommon | **Legendary** | Power 7.20 (p89%), desvio +33% Potencialmente quebrada (p86%); índice 0.88, 9º de 94 na facção |
| hades-v6-193 | THANATOS, GOD OF DEATH | Devotee | 7 | Legendary | **Uncommon** | Power 7.49 (p91%), desvio +1% Balanceada (p67%); índice 0.79, 15º de 94 na facção |
| hades-v6-194 | DIVINE TOUCH OF DEATH | Spell | 3 | Uncommon | **Legendary** | Power 7.84 (p94%), desvio +131% Potencialmente quebrada (p99%); índice 0.96, 6º de 94 na facção |
| hades-v6-195 | PANDORA | Devotee | 5 | Legendary | **Common** | Power 4.10 (p66%), desvio -24% Abaixo da curva (p27%); índice 0.46, 56º de 94 na facção |
| hades-v6-196 | PANDORA'S TRIDENT | Equipment | 3 | Uncommon | **Legendary** | Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary |
| hades-v6-197 | ARIES SHION, THE RESURRECTED SAINT | Devotee | 6 | Legendary | Legendary | Power 7.19 (p88%), desvio +12% Acima da curva (p76%); índice 0.82, 13º de 94 na facção |
| hades-v6-198 | ARIES SURPLICE | Equipment | 4 | Uncommon | Uncommon | Power 4.66 (p75%), desvio -14% Abaixo da curva (p42%); índice 0.59, 36º de 94 na facção |
| hades-v6-199 | HADES' SWORD | Equipment | 5 | Divine | Divine | Power 14.97 (p99%), desvio +108% Potencialmente quebrada (p98%); índice 0.98, 2º de 94 na facção |
| hades-v6-200 | PANDORA'S BOX | Equipment | 6 | Divine | **Legendary** | Power 7.86 (p95%), desvio +23% Acima da curva (p83%); índice 0.89, 8º de 94 na facção |
| hades-v6-201 | HARPY VALENTINE | Devotee | 4 | Uncommon | Uncommon | Power 4.75 (p77%), desvio +8% Balanceada (p73%); índice 0.75, 20º de 94 na facção |
| hades-v6-202 | BALRON LUNE | Devotee | 4 | Uncommon | Uncommon | Power 4.27 (p69%), desvio -3% Balanceada (p59%); índice 0.64, 30º de 94 na facção |
| hades-v6-203 | PAPILLON MYU | Devotee | 5 | Uncommon | Uncommon | Power 4.52 (p71%), desvio -16% Abaixo da curva (p35%); índice 0.53, 44º de 94 na facção |
| hades-v6-204 | DEEP NIOBE | Devotee | 4 | Uncommon | **Common** | Power 2.69 (p37%), desvio -39% Muito fraca (p19%); índice 0.28, 70º de 94 na facção |
| hades-v6-205 | BASILISK SYLPHID | Devotee | 4 | Uncommon | Uncommon | Power 4.00 (p63%), desvio -9% Balanceada (p49%); índice 0.56, 39º de 94 na facção |
| hades-v6-206 | SKELETON MARKINO | Devotee | 2 | Common | Common | Power 2.06 (p23%), desvio -14% Abaixo da curva (p39%); índice 0.31, 68º de 94 na facção |
| hades-v6-207 | FROG ZEROS | Devotee | 2 | Common | **Uncommon** | Power 2.85 (p42%), desvio +19% Acima da curva (p82%); índice 0.62, 31º de 94 na facção |
| hades-v6-208 | CYCLOPS GIGANTO | Devotee | 4 | Common | Common | Power 3.64 (p55%), desvio -17% Abaixo da curva (p33%); índice 0.44, 57º de 94 na facção |
| hades-v6-209 | WORM RAIMI | Devotee | 3 | Common | Common | Power 3.11 (p45%), desvio -9% Balanceada (p51%); índice 0.48, 54º de 94 na facção |
| hades-v6-210 | GOLEM ROCK | Devotee | 4 | Common | **Uncommon** | Power 4.16 (p68%), desvio -6% Balanceada (p54%); índice 0.61, 32º de 94 na facção |
| hades-v6-211 | TROLL IWAN | Devotee | 5 | Common | Common | Power 2.71 (p38%), desvio -50% Muito fraca (p11%); índice 0.24, 72º de 94 na facção |
| hades-v6-212 | DEADLY BEETLE STAND | Devotee | 4 | Common | Common | Power 3.82 (p57%), desvio -13% Abaixo da curva (p44%); índice 0.51, 52º de 94 na facção |
| hades-v6-213 | LYCAON PHLEGYAS | Devotee | 4 | Common | **Uncommon** | Power 4.13 (p67%), desvio -6% Balanceada (p53%); índice 0.60, 33º de 94 na facção |
| hades-v6-214 | MINOTAUR GORDON | Devotee | 4 | Common | Common | Power 3.89 (p60%), desvio -12% Abaixo da curva (p46%); índice 0.53, 45º de 94 na facção |
| hades-v6-215 | ALRAUNE QUEEN | Devotee | 3 | Common | **Uncommon** | Power 3.40 (p49%), desvio +0% Balanceada (p62%); índice 0.56, 40º de 94 na facção |
| hades-v6-216 | GORGON OX | Devotee | 3 | Common | **Uncommon** | Power 3.83 (p58%), desvio +13% Acima da curva (p77%); índice 0.68, 27º de 94 na facção |
| hades-v6-217 | DULLAHAN CUBE | Devotee | 2 | Common | Common | Power 2.51 (p34%), desvio +5% Balanceada (p70%); índice 0.52, 49º de 94 na facção |
| hades-v6-218 | UNDERWORLD SKELETON | Devotee | 1 | Common | Common | Power 1.10 (p4%), desvio -21% Abaixo da curva (p29%); índice 0.17, 82º de 94 na facção |
| hades-v6-219 | HADES' ROYAL GUARD | Devotee | 3 | Common | Common | Power 3.30 (p48%), desvio -3% Balanceada (p58%); índice 0.53, 47º de 94 na facção |
| hades-v6-220 | WANDERING SOUL | Devotee | 1 | Common | Common | Power 1.41 (p11%), desvio +1% Balanceada (p63%); índice 0.37, 65º de 94 na facção |
| hades-v6-221 | STYX SOUL HERDER | Devotee | 2 | Common | Common | Power 2.01 (p22%), desvio -16% Abaixo da curva (p37%); índice 0.29, 69º de 94 na facção |
| hades-v6-222 | UNDERWORLD EXECUTIONER | Devotee | 4 | Common | **Uncommon** | Power 3.91 (p61%), desvio -11% Abaixo da curva (p47%); índice 0.54, 43º de 94 na facção |
| hades-v6-223 | ELYSIUM SERVANT | Devotee | 3 | Common | Common | Power 1.84 (p16%), desvio -46% Muito fraca (p14%); índice 0.15, 84º de 94 na facção |
| hades-v6-224 | CRACKED SURPLICE | Equipment | 1 | Common | Common | Power 1.28 (p8%), desvio -36% Muito fraca (p20%); índice 0.14, 85º de 94 na facção |
| hades-v6-225 | SKELETON ARMOR | Equipment | 2 | Common | Common | Power 2.21 (p28%), desvio -47% Muito fraca (p12%); índice 0.20, 77º de 94 na facção |
| hades-v6-226 | CHAIN OF THE DAMNED | Equipment | 2 | Common | **Uncommon** | Power 4.07 (p65%), desvio +13% Acima da curva (p78%); índice 0.72, 23º de 94 na facção |
| hades-v6-227 | A COIN FOR THE FERRYMAN | Equipment | 1 | Common | Common | Power 0.52 (p0%), desvio -63% Muito fraca (p4%); índice 0.02, 93º de 94 na facção |
| hades-v6-228 | PANDORA'S HARP | Equipment | 2 | Common | Common | Power 1.97 (p20%), desvio -34% Muito fraca (p24%); índice 0.22, 75º de 94 na facção |
| hades-v6-229 | UNDERWORLD SHACKLES | Equipment | 2 | Common | Common | Power 3.46 (p51%), desvio -4% Balanceada (p56%); índice 0.53, 46º de 94 na facção |
| hades-v6-230 | FUNERAL SHROUD | Equipment | 1 | Common | Common | Power 1.09 (p3%), desvio -46% Muito fraca (p15%); índice 0.09, 89º de 94 na facção |
| hades-v6-231 | TORCH OF THE UNDERWORLD | Equipment | 2 | Common | Common | Power 2.58 (p35%), desvio -14% Abaixo da curva (p40%); índice 0.38, 64º de 94 na facção |
| hades-v6-232 | THE AWAKENING OF THE SPECTERS | Spell | 3 | Common | **Legendary** | Power 4.93 (p78%), desvio +45% Potencialmente quebrada (p89%); índice 0.84, 11º de 94 na facção |
| hades-v6-233 | THE CALL OF THE UNDERWORLD | Spell | 2 | Common | Common | Power 1.28 (p9%), desvio -47% Muito fraca (p13%); índice 0.11, 88º de 94 na facção |
| hades-v6-234 | DEATH IS ONLY THE BEGINNING | Spell | 2 | Common | **Uncommon** | Power 2.73 (p39%), desvio +14% Acima da curva (p80%); índice 0.59, 35º de 94 na facção |
| hades-v6-235 | THE OATH OF THE 108 STARS | Spell | 2 | Common | Common | Power 1.38 (p10%), desvio -43% Muito fraca (p17%); índice 0.13, 86º de 94 na facção |
| hades-v6-236 | SERVE THE LORD OF DARKNESS | Spell | 1 | Common | Common | Power 1.64 (p14%), desvio +17% Balanceada (p81%); índice 0.47, 55º de 94 na facção |
| hades-v6-237 | THE FERRYMAN'S PRICE | Spell | 2 | Common | **Uncommon** | Power 3.11 (p46%), desvio +30% Potencialmente quebrada (p84%); índice 0.65, 29º de 94 na facção |
| hades-v6-238 | SOULS OF THE DAMNED | Spell | 3 | Common | **Legendary** | Power 5.00 (p81%), desvio +47% Potencialmente quebrada (p91%); índice 0.86, 10º de 94 na facção |
| hades-v6-239 | THE WHISPERS OF PANDORA | Spell | 1 | Common | Common | Power 1.41 (p12%), desvio +1% Balanceada (p65%); índice 0.38, 62º de 94 na facção |
| hades-v6-240 | THE RETURN FROM DEATH | Spell | 3 | Common | Common | Power 2.07 (p25%), desvio -39% Muito fraca (p18%); índice 0.22, 76º de 94 na facção |
| hades-v6-241 | THE WILL OF HADES | Spell | 3 | Common | **Uncommon** | Power 3.47 (p52%), desvio +2% Balanceada (p68%); índice 0.60, 34º de 94 na facção |
| hades-v6-242 | HADES CASTLE | Domain | 3 | Common | **Uncommon** | Power 3.13 (p47%), desvio +65% Potencialmente quebrada (p94%); índice 0.70, 25º de 94 na facção |
| hades-v6-243 | THE RIVER ACHERON | Domain | 2 | Common | Common | Power 0.52 (p1%), desvio -79% Muito fraca (p1%); índice 0.01, 94º de 94 na facção |
| hades-v6-244 | THE FIRST PRISON | Domain | 3 | Common | Common | Power 1.65 (p15%), desvio -33% Muito fraca (p25%); índice 0.20, 78º de 94 na facção |
| hades-v6-245 | THE GATES OF THE UNDERWORLD | Domain | 4 | Common | Common | Power 1.89 (p19%), desvio -23% Abaixo da curva (p28%); índice 0.24, 74º de 94 na facção |
| hades-v6-246 | HARPY SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 2.87 (p43%), desvio -35% Muito fraca (p23%); índice 0.33, 67º de 94 na facção |
| hades-v6-247 | BALRON SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 2.49 (p33%), desvio -43% Muito fraca (p16%); índice 0.25, 71º de 94 na facção |
| hades-v6-248 | PAPILLON SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 2.10 (p26%), desvio -52% Muito fraca (p10%); índice 0.18, 81º de 94 na facção |
| hades-v6-249 | DEEP SURPLICE | Equipment | 2 | Common | **Legendary** | Power 4.69 (p76%), desvio +47% Potencialmente quebrada (p90%); índice 0.83, 12º de 94 na facção |
| hades-v6-250 | BASILISK SURPLICE | Equipment | 3 | Uncommon | **Common** | Power 3.51 (p53%), desvio -20% Abaixo da curva (p30%); índice 0.41, 60º de 94 na facção |
| hades-v6-251 | CANCER DEATHMASK | Devotee | 4 | Uncommon | **Common** | Power 3.62 (p54%), desvio -18% Abaixo da curva (p32%); índice 0.43, 58º de 94 na facção |
| hades-v6-252 | PISCES APHRODITE | Devotee | 4 | Uncommon | Uncommon | Power 3.92 (p62%), desvio -11% Abaixo da curva (p48%); índice 0.55, 42º de 94 na facção |
| hades-v6-253 | CAPRICORN SHURA | Devotee | 5 | Uncommon | Uncommon | Power 5.18 (p82%), desvio -4% Balanceada (p55%); índice 0.68, 26º de 94 na facção |
| hades-v6-254 | AQUARIUS CAMUS | Devotee | 5 | Uncommon | Uncommon | Power 4.61 (p73%), desvio -15% Abaixo da curva (p38%); índice 0.55, 41º de 94 na facção |
| hades-v6-255 | GEMINI SAGA | Devotee | 6 | Uncommon | Uncommon | Power 6.46 (p85%), desvio +1% Balanceada (p66%); índice 0.75, 19º de 94 na facção |
| hades-v6-256 | THE BETRAYAL OF THE GOLD SAINTS | Spell | 4 | Uncommon | **Common** | Power 1.16 (p6%), desvio -74% Muito fraca (p2%); índice 0.04, 90º de 94 na facção |
| hades-v6-257 | THE TRIAL OF THE DEAD | Spell | 2 | Common | Common | Power 0.70 (p2%), desvio -71% Muito fraca (p3%); índice 0.03, 92º de 94 na facção |
| hades-v6-258 | THE JUDGMENT OF MINOS | Spell | 4 | Uncommon | Uncommon | Power 4.55 (p72%), desvio +3% Balanceada (p69%); índice 0.70, 24º de 94 na facção |
| hades-v6-259 | THE SPECTERS INVADE SANCTUARY | Spell | 5 | Uncommon | **Common** | Power 2.45 (p31%), desvio -55% Muito fraca (p8%); índice 0.19, 79º de 94 na facção |
| hades-v6-260 | THE RESURRECTION OF THE FALLEN | Spell | 5 | Uncommon | Uncommon | Power 4.65 (p74%), desvio -14% Abaixo da curva (p41%); índice 0.58, 38º de 94 na facção |
| hades-v6-261 | PANDORA’s goodbye | Spell | 4 | Uncommon | **Common** | Power 1.89 (p18%), desvio -57% Muito fraca (p5%); índice 0.12, 87º de 94 na facção |
| hades-v6-262 | THE DESTRUCTION OF THE GOLD CLOTHS | Spell | 4 | Uncommon | **Legendary** | Power 9.10 (p96%), desvio +107% Potencialmente quebrada (p97%); índice 0.96, 5º de 94 na facção |
| hades-v6-263 | THE THREE JUDGES OF HELL | Spell | 5 | Uncommon | **Common** | Power 1.12 (p5%), desvio -79% Muito fraca (p0%); índice 0.03, 91º de 94 na facção |
| hades-v6-264 | THE CURSE OF THE UNDERWORLD | Spell | 5 | Uncommon | **Legendary** | Power 7.63 (p92%), desvio +41% Potencialmente quebrada (p88%); índice 0.90, 7º de 94 na facção |
| hades-v6-265 | THE POSSESSION OF SHUN | Spell | 5 | Legendary | **Common** | Power 2.39 (p30%), desvio -56% Muito fraca (p6%); índice 0.18, 80º de 94 na facção |
| hades-v6-266 | THE FALL OF THE SANCTUARY | Spell | 7 | Legendary | **Uncommon** | Power 7.14 (p87%), desvio -4% Balanceada (p57%); índice 0.72, 21º de 94 na facção |
| hades-v6-267 | THE SWORD THAT PIERCES ATHENA | Spell | 6 | Legendary | Legendary | Power 7.06 (p86%), desvio +10% Acima da curva (p74%); índice 0.80, 14º de 94 na facção |
| hades-v6-268 | THE ETERNAL SLEEP | Spell | 7 | Legendary | **Divine** | Power 18.67 (p100%), desvio +152% Potencialmente quebrada (p100%); índice 1.00, 1º de 94 na facção |
| hades-v6-269 | THE DEATH OF THANATOS | Spell | 6 | Legendary | Legendary | Power 11.49 (p97%), desvio +80% Potencialmente quebrada (p96%); índice 0.96, 4º de 94 na facção |
| hades-v6-270 | THE GREATEST ECLIPSE | Spell | 7 | Divine | Divine | Power 12.59 (p98%), desvio +70% Potencialmente quebrada (p95%); índice 0.96, 3º de 94 na facção |
| hades-v6-511 | TOUCH OF DEATH | Spell | 1 | Common | Common | Power 1.88 (p17%), desvio +34% Potencialmente quebrada (p87%); índice 0.52, 50º de 94 na facção |
| hades-v6-512 | PACT OF THE UNDERWORLD | Spell | 2 | Common | Common | Power 2.23 (p29%), desvio -7% Balanceada (p52%); índice 0.40, 61º de 94 na facção |
| hades-v6-513 | RETURN FROM THE DARKNESS | Spell | 1 | Common | Common | Power 1.47 (p13%), desvio +5% Balanceada (p71%); índice 0.42, 59º de 94 na facção |
| hades-v6-521 | COCYTUS | Domain | 3 | Common | **Uncommon** | Power 2.46 (p32%), desvio +30% Potencialmente quebrada (p85%); índice 0.59, 37º de 94 na facção |
| hades-v6-522 | ELYSION | Domain | 3 | Common | **Uncommon** | Power 2.79 (p40%), desvio +48% Potencialmente quebrada (p92%); índice 0.66, 28º de 94 na facção |

### Ares

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| ares-v6-271 | ETHON ALCMENES | Devotee | 5 | Divine | **Legendary** | Power 6.63 (p97%), desvio +23% Acima da curva (p70%); índice 0.83, 9º de 91 na facção |
| ares-v6-272 | ETHON WARPLATE | Equipment | 4 | Uncommon | **Common** | Power 3.52 (p63%), desvio -35% Muito fraca (p18%); índice 0.41, 59º de 91 na facção |
| ares-v6-273 | OUROBOROS OFIR | Devotee | 4 | Divine | **Uncommon** | Power 4.89 (p83%), desvio +11% Acima da curva (p59%); índice 0.71, 25º de 91 na facção |
| ares-v6-274 | OUROBOROS WARPLATE | Equipment | 3 | Uncommon | **Legendary** | Power 5.83 (p93%), desvio +39% Potencialmente quebrada (p83%); índice 0.88, 4º de 91 na facção |
| ares-v6-275 | LAMASSU LIOR | Devotee | 5 | Divine | **Uncommon** | Power 5.32 (p89%), desvio -2% Balanceada (p39%); índice 0.64, 33º de 91 na facção |
| ares-v6-276 | LAMASSU WARPLATE | Equipment | 3 | Uncommon | **Divine** | Power 6.74 (p98%), desvio +60% Potencialmente quebrada (p87%); índice 0.92, 2º de 91 na facção |
| ares-v6-277 | LAMIA LOTIS | Devotee | 4 | Legendary | Legendary | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| ares-v6-278 | LAMIA WARPLATE | Equipment | 2 | Uncommon | Uncommon | Power 3.71 (p69%), desvio +24% Acima da curva (p77%); índice 0.73, 23º de 91 na facção |
| ares-v6-279 | ISEU OF PYTHON | Devotee | 3 | Uncommon | Uncommon | Power 3.48 (p61%), desvio +2% Balanceada (p46%); índice 0.53, 43º de 91 na facção |
| ares-v6-280 | PYTHON WARPLATE | Equipment | 2 | Uncommon | **Divine** | Power 5.73 (p92%), desvio +91% Potencialmente quebrada (p93%); índice 0.93, 1º de 91 na facção |
| ares-v6-281 | CATREU OF AKEPHALOS | Devotee | 3 | Uncommon | **Common** | Power 3.08 (p51%), desvio -9% Balanceada (p33%); índice 0.42, 55º de 91 na facção |
| ares-v6-282 | AKEPHALOS WARPLATE | Equipment | 2 | Uncommon | **Common** | Power 2.38 (p33%), desvio -21% Abaixo da curva (p24%); índice 0.29, 70º de 91 na facção |
| ares-v6-283 | ANZU ALCEU | Devotee | 3 | Uncommon | Uncommon | Power 4.24 (p78%), desvio +25% Acima da curva (p78%); índice 0.78, 15º de 91 na facção |
| ares-v6-284 | ANZU'S WARPLATE | Equipment | 2 | Common | **Legendary** | Power 4.97 (p86%), desvio +66% Potencialmente quebrada (p88%); índice 0.87, 5º de 91 na facção |
| ares-v6-285 | ANFISTA ARIONTE | Devotee | 3 | Uncommon | Uncommon | Power 3.80 (p71%), desvio +12% Acima da curva (p60%); índice 0.66, 31º de 91 na facção |
| ares-v6-286 | ANFISTA WARPLATE | Equipment | 2 | Uncommon | Uncommon | Power 3.29 (p57%), desvio +10% Balanceada (p57%); índice 0.57, 41º de 91 na facção |
| ares-v6-287 | BASIL OF MANTICORE | Devotee | 3 | Uncommon | **Common** | Power 3.17 (p56%), desvio -7% Balanceada (p36%); índice 0.46, 50º de 91 na facção |
| ares-v6-288 | MANTICORE WARPLATE | Equipment | 3 | Uncommon | Uncommon | Power 4.58 (p81%), desvio +9% Balanceada (p54%); índice 0.68, 30º de 91 na facção |
| ares-v6-289 | ENYO, SPEAR OF DESTRUCTION | Equipment | 5 | Legendary | **Common** | Power 2.58 (p41%), desvio -67% Muito fraca (p7%); índice 0.24, 74º de 91 na facção |
| ares-v6-290 | SHIELD OF THE WAR GOD | Equipment | 4 | Legendary | Legendary | Power 7.62 (p99%), desvio +23% Acima da curva (p71%); índice 0.85, 8º de 91 na facção |
| ares-v6-291 | RED FIRE LEGION BERSERKER | Devotee | 2 | Common | Common | Power 1.93 (p27%), desvio -20% Abaixo da curva (p27%); índice 0.27, 73º de 91 na facção |
| ares-v6-292 | FLAME LEGION BERSERKER | Devotee | 2 | Common | Common | Power 2.52 (p40%), desvio +5% Balanceada (p48%); índice 0.44, 52º de 91 na facção |
| ares-v6-293 | DISASTER LEGION BERSERKER | Devotee | 1 | Common | Common | Power 1.52 (p18%), desvio +9% Balanceada (p53%); índice 0.36, 62º de 91 na facção |
| ares-v6-294 | FEAR LEGION BERSERKER | Devotee | 2 | Common | Common | Power 2.28 (p32%), desvio -5% Balanceada (p37%); índice 0.34, 65º de 91 na facção |
| ares-v6-295 | BLOODTHIRSTY BERSERKER | Devotee | 2 | Common | Common | Power 2.07 (p29%), desvio -14% Abaixo da curva (p29%); índice 0.29, 71º de 91 na facção |
| ares-v6-296 | ARES' WAR HERALD | Devotee | 1 | Common | **Uncommon** | Power 1.95 (p28%), desvio +39% Potencialmente quebrada (p84%); índice 0.56, 42º de 91 na facção |
| ares-v6-297 | CRIMSON FIRE EXECUTIONER | Devotee | 2 | Common | Common | Power 2.13 (p30%), desvio -11% Abaixo da curva (p32%); índice 0.31, 68º de 91 na facção |
| ares-v6-298 | FLAME LEGION VANGUARD | Devotee | 2 | Common | **Uncommon** | Power 2.95 (p47%), desvio +23% Acima da curva (p72%); índice 0.59, 38º de 91 na facção |
| ares-v6-299 | RED FIRE LEGION RAIDER | Devotee | 3 | Common | **Uncommon** | Power 4.20 (p77%), desvio +24% Acima da curva (p76%); índice 0.76, 17º de 91 na facção |
| ares-v6-300 | FEAR LEGION TORMENTOR | Devotee | 2 | Common | Common | Power 2.42 (p38%), desvio +1% Balanceada (p44%); índice 0.41, 58º de 91 na facção |
| ares-v6-301 | DISASTER LEGION DESTROYER | Devotee | 2 | Common | Common | Power 1.68 (p21%), desvio -30% Muito fraca (p20%); índice 0.21, 77º de 91 na facção |
| ares-v6-302 | BERSERKER CHAMPION | Devotee | 4 | Uncommon | **Legendary** | Power 5.43 (p90%), desvio +23% Acima da curva (p73%); índice 0.82, 12º de 91 na facção |
| ares-v6-303 | BLOODSTAINED GLADIATOR | Devotee | 1 | Common | Common | Power 1.22 (p12%), desvio -13% Balanceada (p30%); índice 0.21, 76º de 91 na facção |
| ares-v6-304 | RAGING HOPLITE | Devotee | 2 | Common | Common | Power 2.40 (p34%), desvio -0% Balanceada (p41%); índice 0.38, 60º de 91 na facção |
| ares-v6-305 | MERCILESS SPEARMAN | Devotee | 3 | Common | Common | Power 3.15 (p52%), desvio -8% Balanceada (p34%); índice 0.43, 53º de 91 na facção |
| ares-v6-306 | WAR DRUMMER | Devotee | 1 | Common | **Uncommon** | Power 2.40 (p36%), desvio +71% Potencialmente quebrada (p89%); índice 0.62, 35º de 91 na facção |
| ares-v6-307 | DIVINE FLAME DISCIPLE | Devotee | 3 | Common | **Uncommon** | Power 3.92 (p73%), desvio +15% Acima da curva (p63%); índice 0.68, 29º de 91 na facção |
| ares-v6-308 | FRENZIED SWORDSMAN | Devotee | 1 | Common | Common | Power 1.69 (p22%), desvio +21% Acima da curva (p69%); índice 0.46, 51º de 91 na facção |
| ares-v6-309 | ARES' ROYAL GUARD | Devotee | 4 | Uncommon | **Legendary** | Power 5.70 (p91%), desvio +30% Potencialmente quebrada (p81%); índice 0.86, 6º de 91 na facção |
| ares-v6-310 | WARBOUND SOLDIER | Devotee | 1 | Common | Common | Power 1.51 (p17%), desvio +8% Balanceada (p52%); índice 0.34, 66º de 91 na facção |
| ares-v6-311 | BLOOD OATH WARRIOR | Devotee | 1 | Common | Common | Power 1.53 (p19%), desvio +9% Balanceada (p56%); índice 0.37, 61º de 91 na facção |
| ares-v6-312 | BATTLEFIELD SCAVENGER | Devotee | 1 | Common | Common | Power 1.44 (p14%), desvio +3% Balanceada (p47%); índice 0.31, 69º de 91 na facção |
| ares-v6-313 | SUICIDAL BERSERKER | Devotee | 1 | Common | **Uncommon** | Power 2.51 (p39%), desvio +79% Potencialmente quebrada (p91%); índice 0.65, 32º de 91 na facção |
| ares-v6-314 | CRACKED WARPLATE | Equipment | 1 | Common | Common | Power 1.29 (p13%), desvio -35% Muito fraca (p17%); índice 0.15, 80º de 91 na facção |
| ares-v6-315 | BERSERKER HELMET | Equipment | 1 | Common | Common | Power 2.40 (p37%), desvio +20% Acima da curva (p67%); índice 0.52, 45º de 91 na facção |
| ares-v6-316 | BLOODSTAINED BLADE | Equipment | 2 | Common | Common | Power 1.57 (p20%), desvio -56% Muito fraca (p9%); índice 0.14, 81º de 91 na facção |
| ares-v6-317 | SPEAR OF THE FALLEN | Equipment | 2 | Common | Common | Power 1.76 (p23%), desvio -51% Muito fraca (p12%); índice 0.18, 78º de 91 na facção |
| ares-v6-318 | BATTLEFIELD AXE | Equipment | 3 | Common | **Legendary** | Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary |
| ares-v6-319 | WAR DRUMS | Equipment | 3 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| ares-v6-320 | BURNING JAVELIN | Equipment | 2 | Common | Common | Power 3.50 (p62%), desvio -3% Balanceada (p38%); índice 0.50, 47º de 91 na facção |
| ares-v6-321 | CHAINS OF FURY | Equipment | 2 | Common | **Uncommon** | Power 3.84 (p72%), desvio +7% Balanceada (p50%); índice 0.61, 36º de 91 na facção |
| ares-v6-322 | FIRST BLOOD | Spell | 1 | Common | **Uncommon** | Power 2.90 (p44%), desvio +107% Potencialmente quebrada (p94%); índice 0.69, 28º de 91 na facção |
| ares-v6-323 | CHARGE INTO BATTLE | Spell | 1 | Common | Common | Power 1.80 (p24%), desvio +29% Potencialmente quebrada (p80%); índice 0.52, 44º de 91 na facção |
| ares-v6-324 | UNLEASH THE FURY | Spell | 2 | Common | **Uncommon** | Power 3.59 (p64%), desvio +50% Potencialmente quebrada (p86%); índice 0.75, 20º de 91 na facção |
| ares-v6-325 | NO MERCY | Spell | 2 | Common | Common | Power 1.07 (p10%), desvio -55% Muito fraca (p10%); índice 0.10, 85º de 91 na facção |
| ares-v6-326 | BLOOD FOR BLOOD | Spell | 2 | Common | Common | Power 0.41 (p2%), desvio -83% Muito fraca (p2%); índice 0.02, 89º de 91 na facção |
| ares-v6-327 | RAIN OF SPEARS | Spell | 2 | Common | **Legendary** | Power 4.43 (p80%), desvio +85% Potencialmente quebrada (p92%); índice 0.86, 7º de 91 na facção |
| ares-v6-328 | BURN IT ALL | Spell | 3 | Common | **Uncommon** | Power 4.09 (p74%), desvio +20% Acima da curva (p68%); índice 0.71, 26º de 91 na facção |
| ares-v6-329 | RECKLESS ASSAULT | Spell | 1 | Common | Common | Power 0.49 (p3%), desvio -65% Muito fraca (p8%); índice 0.06, 87º de 91 na facção |
| ares-v6-330 | FUEL THE RAGE | Spell | 2 | Common | Common | Mantida: Cosmo Balance não mediu (PARTIAL, Análise inconclusiva); revisar à mão |
| ares-v6-331 | THE WILL OF ARES | Spell | 3 | Common | Common | Power 0.97 (p9%), desvio -71% Muito fraca (p6%); índice 0.07, 86º de 91 na facção |
| ares-v6-332 | ARES' WAR TEMPLE | Domain | 5 | Legendary | **Uncommon** | Power 1.89 (p26%), desvio +112% Potencialmente quebrada (p97%); índice 0.61, 37º de 91 na facção |
| ares-v6-333 | THE BURNING BATTLEFIELD | Domain | 4 | Uncommon | **Common** | Power 0.77 (p7%), desvio -30% Muito fraca (p21%); índice 0.14, 82º de 91 na facção |
| ares-v6-334 | THE ARENA OF BLOOD | Domain | 4 | Legendary | **Common** | Power 1.10 (p11%), desvio +24% Balanceada (p74%); índice 0.43, 54º de 91 na facção |
| ares-v6-335 | THE FIELDS OF CARNAGE | Domain | 3 | Uncommon | **Common** | Power 0.68 (p6%), desvio -39% Muito fraca (p16%); índice 0.11, 83º de 91 na facção |
| ares-v6-336 | RED FIRE LEGION WARPLATE | Equipment | 3 | Common | Common | Power 2.67 (p43%), desvio -54% Muito fraca (p11%); índice 0.27, 72º de 91 na facção |
| ares-v6-337 | FLAME LEGION WARPLATE | Equipment | 2 | Common | **Uncommon** | Power 4.19 (p76%), desvio -0% Balanceada (p40%); índice 0.58, 39º de 91 na facção |
| ares-v6-338 | DISASTER LEGION WARPLATE | Equipment | 2 | Common | Common | Power 2.95 (p48%), desvio -30% Muito fraca (p22%); índice 0.35, 63º de 91 na facção |
| ares-v6-339 | FEAR LEGION WARPLATE | Equipment | 2 | Common | Common | Power 3.36 (p58%), desvio -20% Abaixo da curva (p26%); índice 0.42, 57º de 91 na facção |
| ares-v6-340 | BERSERKER CHAMPION WARPLATE | Equipment | 3 | Uncommon | **Common** | Power 3.70 (p68%), desvio -12% Abaixo da curva (p31%); índice 0.49, 48º de 91 na facção |
| ares-v6-341 | CRIMSON FIRE GUARDIAN | Devotee | 4 | Uncommon | Uncommon | Power 4.94 (p84%), desvio +12% Acima da curva (p61%); índice 0.73, 22º de 91 na facção |
| ares-v6-342 | DIVINE FLAME TACTICIAN | Devotee | 3 | Uncommon | Uncommon | Power 4.35 (p79%), desvio +28% Potencialmente quebrada (p79%); índice 0.79, 14º de 91 na facção |
| ares-v6-343 | DISASTER WING ASSASSIN | Devotee | 2 | Uncommon | **Common** | Power 2.58 (p42%), desvio +8% Balanceada (p51%); índice 0.47, 49º de 91 na facção |
| ares-v6-344 | NIGHTMARE WEAVER | Devotee | 3 | Uncommon | Uncommon | Power 3.61 (p66%), desvio +6% Balanceada (p49%); índice 0.57, 40º de 91 na facção |
| ares-v6-345 | BERSERKER OF THE APOCALYPSE | Devotee | 4 | Legendary | **Uncommon** | Power 5.24 (p88%), desvio +19% Acima da curva (p66%); índice 0.77, 16º de 91 na facção |
| ares-v6-346 | THE BERSERKERS MARCH | Spell | 4 | Uncommon | **Common** | Power -1.75 (p0%), desvio -140% Muito fraca (p0%); índice 0.00, 91º de 91 na facção |
| ares-v6-347 | SUICIDE ORDERS | Spell | 2 | Common | Common | Power 0.66 (p4%), desvio -72% Muito fraca (p3%); índice 0.04, 88º de 91 na facção |
| ares-v6-348 | NIGHTMARE MANIFESTATION | Spell | 3 | Uncommon | **Common** | Power 3.40 (p59%), desvio -0% Balanceada (p42%); índice 0.51, 46º de 91 na facção |
| ares-v6-349 | DIVINE FLAMES OF WAR | Spell | 3 | Uncommon | **Divine** | Power 5.89 (p94%), desvio +73% Potencialmente quebrada (p90%); índice 0.92, 3º de 91 na facção |
| ares-v6-350 | THE CRIMSON FIRE | Spell | 4 | Uncommon | **Common** | Power 3.40 (p60%), desvio -23% Abaixo da curva (p23%); índice 0.42, 56º de 91 na facção |
| ares-v6-351 | AZURE, THE BLUE DEATH | Spell | 3 | Legendary | Legendary | Power 4.71 (p82%), desvio +39% Potencialmente quebrada (p82%); índice 0.82, 11º de 91 na facção |
| ares-v6-352 | THE BLOODY RAIN | Spell | 4 | Legendary | **Common** | Power 2.25 (p31%), desvio -49% Muito fraca (p13%); índice 0.22, 75º de 91 na facção |
| ares-v6-353 | THE FOUR LEGIONS OF WAR | Spell | 5 | Legendary | **Common** | Power 3.16 (p54%), desvio -41% Muito fraca (p14%); índice 0.34, 64º de 91 na facção |
| ares-v6-354 | THE FALL OF IKKI | Spell | 4 | Uncommon | Uncommon | Power 5.11 (p87%), desvio +16% Acima da curva (p64%); índice 0.76, 19º de 91 na facção |
| ares-v6-355 | THE FURY OF THE WAR GOD | Spell | 4 | Uncommon | **Common** | Power 0.17 (p1%), desvio -96% Muito fraca (p1%); índice 0.01, 90º de 91 na facção |
| ares-v6-356 | ATHENA'S DESPERATE DEFENSE | Spell | 3 | Uncommon | Uncommon | Power 3.76 (p70%), desvio +11% Acima da curva (p58%); índice 0.64, 34º de 91 na facção |
| ares-v6-357 | THE LOST STAFF OF NIKE | Spell | 4 | Uncommon | **Common** | Power 3.00 (p49%), desvio -32% Muito fraca (p19%); índice 0.34, 67º de 91 na facção |
| ares-v6-358 | THE GOD OF WAR AWAKENS | Spell | 5 | Legendary | Legendary | Power 6.17 (p96%), desvio +14% Acima da curva (p62%); índice 0.79, 13º de 91 na facção |
| ares-v6-359 | THE APOCALYPSE OF ARES | Spell | 5 | Legendary | **Common** | Power 1.50 (p16%), desvio -72% Muito fraca (p4%); índice 0.10, 84º de 91 na facção |
| ares-v6-360 | THE ENDLESS HOLY WAR | Spell | 9 | Legendary | **Uncommon** | Power 9.44 (p100%), desvio +0% Balanceada (p43%); índice 0.72, 24º de 91 na facção |
| ares-v6-503 | THE ALTAR OF SLAUGHTER | Domain |  | Common | Common | Power 0.89 (p8%), desvio -19% Balanceada (p28%); índice 0.18, 79º de 91 na facção |
| ares-v6-514 | SPARK OF WAR | Spell | 1 | Common | **Uncommon** | Power 2.90 (p46%), desvio +107% Potencialmente quebrada (p96%); índice 0.71, 27º de 91 na facção |
| ares-v6-515 | RECKLESS INSIGHT | Spell | 1 | Common | **Uncommon** | Power 3.15 (p53%), desvio +125% Potencialmente quebrada (p99%); índice 0.76, 18º de 91 na facção |
| ares-v6-516 | FURY OF ARES | Spell | 1 | Common | **Uncommon** | Power 3.07 (p50%), desvio +119% Potencialmente quebrada (p98%); índice 0.74, 21º de 91 na facção |
| ares-v6-523 | THE FORGE OF WAR | Domain | 5 | Legendary | Legendary | Power 3.64 (p67%), desvio +307% Potencialmente quebrada (p100%); índice 0.83, 10º de 91 na facção |

### Artemis

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| artemis-v6-361 | CALISTO | Devotee | 5 | Legendary | **Common** | Power 5.93 (p72%), desvio +10% Balanceada (p34%); índice 0.53, 46º de 91 na facção |
| artemis-v6-362 | CALLISTO'S LUNAR VESTMENT | Equipment | 3 | Uncommon | Uncommon | Power 6.71 (p79%), desvio +46% Potencialmente quebrada (p74%); índice 0.77, 16º de 91 na facção |
| artemis-v6-363 | LA SCOUMOUNE | Devotee | 4 | Uncommon | **Common** | Power 4.99 (p62%), desvio +14% Acima da curva (p38%); índice 0.50, 48º de 91 na facção |
| artemis-v6-364 | BLACK SATELLITE ARMOR | Equipment | 2 | Common | **Uncommon** | Power 4.63 (p56%), desvio +55% Potencialmente quebrada (p80%); índice 0.68, 26º de 91 na facção |
| artemis-v6-365 | DAPHNE | Devotee | 4 | Uncommon | Uncommon | Power 5.97 (p73%), desvio +36% Potencialmente quebrada (p66%); índice 0.69, 23º de 91 na facção |
| artemis-v6-366 | DAPHNE'S SACRED ARMOR | Equipment | 3 | Uncommon | **Legendary** | Power 7.20 (p84%), desvio +56% Potencialmente quebrada (p83%); índice 0.84, 8º de 91 na facção |
| artemis-v6-367 | HERMIA | Devotee | 3 | Uncommon | **Common** | Power 4.07 (p44%), desvio +20% Acima da curva (p43%); índice 0.44, 56º de 91 na facção |
| artemis-v6-368 | HERMIA'S SACRED ARMOR | Equipment | 2 | Uncommon | Uncommon | Power 4.19 (p46%), desvio +40% Potencialmente quebrada (p70%); índice 0.58, 40º de 91 na facção |
| artemis-v6-369 | SATYR | Devotee | 6 | Divine | **Uncommon** | Power 8.59 (p89%), desvio +34% Potencialmente quebrada (p61%); índice 0.75, 20º de 91 na facção |
| artemis-v6-370 | SATYR SACRED ARMOR | Equipment | 5 | Uncommon | Uncommon | Power 8.93 (p90%), desvio +24% Acima da curva (p48%); índice 0.69, 24º de 91 na facção |
| artemis-v6-371 | CHANDRA | Devotee | 3 | Legendary | **Common** | Power 3.37 (p38%), desvio -1% Balanceada (p24%); índice 0.31, 66º de 91 na facção |
| artemis-v6-372 | THE GODDESS AWAKENS | Spell | 4 | Uncommon | **Common** | Power 5.24 (p66%), desvio +19% Acima da curva (p42%); índice 0.54, 45º de 91 na facção |
| artemis-v6-373 | SELENE, TITANESS OF THE MOON | Devotee | 7 | Legendary | Legendary | Power 10.15 (p96%), desvio +37% Potencialmente quebrada (p68%); índice 0.82, 12º de 91 na facção |
| artemis-v6-374 | SILVER LIGHT OF SELENE | Spell | 3 | Uncommon | **Legendary** | Power 5.83 (p70%), desvio +71% Potencialmente quebrada (p89%); índice 0.79, 14º de 91 na facção |
| artemis-v6-375 | THE FIRST MOON GUARDIAN | Devotee | 5 | Legendary | **Uncommon** | Power 6.88 (p81%), desvio +27% Potencialmente quebrada (p53%); índice 0.67, 27º de 91 na facção |
| artemis-v6-376 | OATH OF THE SEVEN HUNTRESSES | Spell | 4 | Uncommon | **Common** | Power 4.98 (p61%), desvio +13% Acima da curva (p37%); índice 0.49, 51º de 91 na facção |
| artemis-v6-377 | CHLORIS, SPIRIT OF BLOSSOMS | Devotee | 4 | Legendary | **Common** | Power 4.75 (p59%), desvio +8% Balanceada (p32%); índice 0.46, 52º de 91 na facção |
| artemis-v6-378 | CHLORIS SACRED ARMOR | Equipment | 3 | Uncommon | **Divine** | Power 9.88 (p94%), desvio +115% Potencialmente quebrada (p97%); índice 0.96, 2º de 91 na facção |
| artemis-v6-379 | ARTEMIS' DIVINE BOW | Equipment | 5 | Legendary | **Divine** | Power 12.83 (p99%), desvio +78% Potencialmente quebrada (p91%); índice 0.95, 3º de 91 na facção |
| artemis-v6-380 | THE SILVER ARROW OF THE MOON | Equipment | 4 | Legendary | Legendary | Power 9.21 (p92%), desvio +64% Potencialmente quebrada (p87%); índice 0.89, 6º de 91 na facção |
| artemis-v6-381 | SACRED STAG | Devotee | 2 | Common | Common | Power 2.35 (p14%), desvio -2% Balanceada (p21%); índice 0.18, 80º de 91 na facção |
| artemis-v6-382 | MOONLIT WOLF | Devotee | 1 | Common | Common | Power 1.81 (p9%), desvio +29% Potencialmente quebrada (p57%); índice 0.33, 63º de 91 na facção |
| artemis-v6-383 | SILVER MOON BEAR | Devotee | 4 | Common | **Uncommon** | Power 6.50 (p78%), desvio +48% Potencialmente quebrada (p76%); índice 0.77, 17º de 91 na facção |
| artemis-v6-384 | ANCIENT FOREST SERPENT | Devotee | 5 | Uncommon | **Legendary** | Power 8.15 (p88%), desvio +51% Potencialmente quebrada (p79%); índice 0.83, 9º de 91 na facção |
| artemis-v6-385 | THE GREAT LUNAR HOUND | Devotee | 6 | Legendary | Legendary | Power 9.17 (p91%), desvio +43% Potencialmente quebrada (p73%); índice 0.82, 11º de 91 na facção |
| artemis-v6-386 | MOONLIT INITIATE | Devotee | 1 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| artemis-v6-387 | SACRED GROVE KEEPER | Devotee | 2 | Common | Common | Power 2.42 (p19%), desvio +1% Balanceada (p26%); índice 0.22, 74º de 91 na facção |
| artemis-v6-388 | SILVER ARROW HUNTRESS | Devotee | 2 | Common | Common | Power 2.99 (p30%), desvio +25% Acima da curva (p49%); índice 0.39, 59º de 91 na facção |
| artemis-v6-389 | WILDWOOD STALKER | Devotee | 2 | Common | Common | Power 3.24 (p36%), desvio +35% Potencialmente quebrada (p64%); índice 0.50, 50º de 91 na facção |
| artemis-v6-390 | MOON TEMPLE ACOLYTE | Devotee | 3 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| artemis-v6-391 | ANCIENT FOREST GUARDIAN | Devotee | 4 | Uncommon | Uncommon | Power 5.60 (p69%), desvio +27% Potencialmente quebrada (p52%); índice 0.61, 37º de 91 na facção |
| artemis-v6-392 | LUNAR BEAST | Devotee | 3 | Common | Common | Power 4.29 (p49%), desvio +26% Potencialmente quebrada (p51%); índice 0.50, 49º de 91 na facção |
| artemis-v6-393 | SATELLITE ARCHER | Devotee | 2 | Common | **Uncommon** | Power 3.41 (p39%), desvio +42% Potencialmente quebrada (p72%); índice 0.56, 43º de 91 na facção |
| artemis-v6-394 | BLACK SATELLITE SOLDIER | Devotee | 2 | Common | Common | Power 2.54 (p24%), desvio +6% Balanceada (p29%); índice 0.27, 69º de 91 na facção |
| artemis-v6-395 | MOON TEMPLE SENTINEL | Devotee | 2 | Common | Common | Power 3.12 (p33%), desvio +30% Potencialmente quebrada (p58%); índice 0.46, 53º de 91 na facção |
| artemis-v6-396 | FOREST SPIRIT | Devotee | 1 | Common | Common | Power 1.01 (p1%), desvio -28% Muito fraca (p3%); índice 0.02, 90º de 91 na facção |
| artemis-v6-397 | SACRED GROVE DRYAD | Devotee | 1 | Common | Common | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| artemis-v6-398 | LUNAR NYMPH | Devotee | 2 | Common | Common | Power 2.35 (p16%), desvio -2% Balanceada (p22%); índice 0.19, 79º de 91 na facção |
| artemis-v6-399 | WILDWOOD PROTECTOR | Devotee | 3 | Common | **Uncommon** | Power 4.70 (p57%), desvio +38% Potencialmente quebrada (p69%); índice 0.63, 34º de 91 na facção |
| artemis-v6-400 | PRIMAL FOREST GUARDIAN | Devotee | 5 | Uncommon | Uncommon | Power 7.35 (p86%), desvio +36% Potencialmente quebrada (p67%); índice 0.76, 19º de 91 na facção |
| artemis-v6-401 | HUNTRESS APPRENTICE | Devotee | 2 | Common | Common | Power 1.77 (p8%), desvio -26% Muito fraca (p7%); índice 0.07, 85º de 91 na facção |
| artemis-v6-402 | CELESTIAL STAG | Devotee | 3 | Common | Common | Power 3.75 (p43%), desvio +10% Acima da curva (p36%); índice 0.39, 58º de 91 na facção |
| artemis-v6-403 | MOONBOUND FOX | Devotee | 1 | Common | Common | Power 1.07 (p2%), desvio -24% Abaixo da curva (p8%); índice 0.05, 88º de 91 na facção |
| artemis-v6-404 | SILVER FANG WOLF | Devotee | 3 | Common | **Uncommon** | Power 4.83 (p60%), desvio +42% Potencialmente quebrada (p71%); índice 0.66, 31º de 91 na facção |
| artemis-v6-405 | ANCIENT GROVE TREANT | Devotee | 6 | Uncommon | **Legendary** | Power 10.24 (p97%), desvio +60% Potencialmente quebrada (p84%); índice 0.91, 4º de 91 na facção |
| artemis-v6-406 | ARTEMIS' ROYAL HUNTRESS | Devotee | 3 | Common | **Uncommon** | Power 4.38 (p52%), desvio +29% Potencialmente quebrada (p56%); índice 0.54, 44º de 91 na facção |
| artemis-v6-407 | WILDERNESS SHAMAN | Devotee | 2 | Common | Common | Power 2.35 (p17%), desvio -2% Balanceada (p23%); índice 0.20, 77º de 91 na facção |
| artemis-v6-408 | GUARDIAN OF THE SACRED SPRING | Devotee | 2 | Common | Common | Power 2.58 (p26%), desvio +7% Balanceada (p30%); índice 0.28, 68º de 91 na facção |
| artemis-v6-409 | SATELLITE BOW | Equipment | 1 | Common | Common | Power 2.40 (p18%), desvio +20% Acima da curva (p46%); índice 0.32, 65º de 91 na facção |
| artemis-v6-410 | HUNTER'S QUIVER | Equipment | 1 | Common | Common | Power 1.57 (p6%), desvio -22% Abaixo da curva (p9%); índice 0.07, 86º de 91 na facção |
| artemis-v6-411 | SILVERWOOD SPEAR | Equipment | 2 | Common | **Legendary** | Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary |
| artemis-v6-412 | LUNAR PROTECTIVE CLOAK | Equipment | 2 | Common | Common | Power 2.48 (p22%), desvio -17% Abaixo da curva (p10%); índice 0.16, 81º de 91 na facção |
| artemis-v6-413 | SACRED HUNTING KNIFE | Equipment | 1 | Common | **Uncommon** | Power 3.63 (p40%), desvio +82% Potencialmente quebrada (p92%); índice 0.66, 30º de 91 na facção |
| artemis-v6-414 | MOONSTONE AMULET | Equipment | 2 | Common | Common | Power 1.98 (p11%), desvio -34% Muito fraca (p2%); índice 0.07, 87º de 91 na facção |
| artemis-v6-415 | FOREST GUARDIAN'S SHIELD | Equipment | 2 | Common | Common | Power 2.72 (p27%), desvio -9% Balanceada (p16%); índice 0.21, 76º de 91 na facção |
| artemis-v6-416 | ANCIENT ROOT ARMOR | Equipment | 3 | Common | Common | Power 4.25 (p48%), desvio -8% Balanceada (p17%); índice 0.32, 64º de 91 na facção |
| artemis-v6-417 | NATURE'S AWAKENING | Spell | 2 | Common | Common | Power 2.47 (p20%), desvio +3% Balanceada (p27%); índice 0.23, 72º de 91 na facção |
| artemis-v6-418 | THE FOREST ANSWERS | Spell | 3 | Common | **Uncommon** | Power 4.54 (p53%), desvio +34% Potencialmente quebrada (p60%); índice 0.57, 42º de 91 na facção |
| artemis-v6-419 | CALL OF THE WILD | Spell | 2 | Common | Common | Power 2.75 (p28%), desvio +14% Acima da curva (p39%); índice 0.33, 61º de 91 na facção |
| artemis-v6-420 | BLESSING OF THE MOON | Spell | 3 | Common | Common | Power 3.29 (p37%), desvio -3% Balanceada (p20%); índice 0.28, 67º de 91 na facção |
| artemis-v6-421 | PRIMAL GROWTH | Spell | 1 | Common | **Uncommon** | Power 4.32 (p50%), desvio +209% Potencialmente quebrada (p100%); índice 0.75, 21º de 91 na facção |
| artemis-v6-422 | THE HUNTER'S INSTINCT | Spell | 2 | Common | **Uncommon** | Power 4.20 (p47%), desvio +75% Potencialmente quebrada (p90%); índice 0.68, 25º de 91 na facção |
| artemis-v6-423 | ROOTS OF THE ANCIENT WORLD | Spell | 3 | Common | Common | Power 2.47 (p21%), desvio -27% Muito fraca (p4%); índice 0.13, 82º de 91 na facção |
| artemis-v6-424 | THE SILVER ARROW | Spell | 2 | Common | Common | Power 2.53 (p23%), desvio +6% Balanceada (p28%); índice 0.26, 71º de 91 na facção |
| artemis-v6-425 | WILDERNESS REBORN | Spell | 2 | Common | Common | Power 2.05 (p12%), desvio -15% Abaixo da curva (p13%); índice 0.13, 83º de 91 na facção |
| artemis-v6-426 | THE WILL OF ARTEMIS | Spell | 5 | Uncommon | **Common** | Power 4.59 (p54%), desvio -15% Abaixo da curva (p12%); índice 0.33, 62º de 91 na facção |
| artemis-v6-427 | TEMPLE OF THE MOON | Domain | 4 | Uncommon | Uncommon | Power 2.90 (p29%), desvio +95% Potencialmente quebrada (p93%); índice 0.61, 35º de 91 na facção |
| artemis-v6-428 | THE SACRED FOREST | Domain | 3 | Common | Common | Power 1.17 (p3%), desvio -27% Muito fraca (p6%); índice 0.04, 89º de 91 na facção |
| artemis-v6-429 | THE ANCIENT GROVE | Domain | 3 | Uncommon | **Common** | Power 1.60 (p7%), desvio +8% Balanceada (p33%); índice 0.20, 78º de 91 na facção |
| artemis-v6-430 | THE LUNAR HUNTING GROUNDS | Domain | 4 | Uncommon | Uncommon | Power 3.14 (p34%), desvio +111% Potencialmente quebrada (p96%); índice 0.65, 33º de 91 na facção |
| artemis-v6-431 | THESEUS, CELESTIAL ANGEL | Devotee | 4 | Uncommon | Uncommon | Power 5.50 (p67%), desvio +25% Potencialmente quebrada (p50%); índice 0.58, 39º de 91 na facção |
| artemis-v6-432 | THESEUS' GLORY | Equipment | 3 | Uncommon | Uncommon | Power 6.83 (p80%), desvio +49% Potencialmente quebrada (p78%); índice 0.79, 15º de 91 na facção |
| artemis-v6-433 | ICARUS (TOUMA), CELESTIAL ANGEL | Devotee | 6 | Legendary | **Uncommon** | Power 7.86 (p87%), desvio +23% Acima da curva (p47%); índice 0.67, 29º de 91 na facção |
| artemis-v6-434 | ICARUS' GLORY | Equipment | 4 | Uncommon | **Legendary** | Power 9.55 (p93%), desvio +71% Potencialmente quebrada (p88%); índice 0.91, 5º de 91 na facção |
| artemis-v6-435 | ODYSSEUS, CELESTIAL ANGEL | Devotee | 5 | Divine | **Uncommon** | Power 7.01 (p82%), desvio +30% Potencialmente quebrada (p59%); índice 0.71, 22º de 91 na facção |
| artemis-v6-436 | ODYSSEUS' GLORY | Equipment | 3 | Uncommon | **Legendary** | Power 7.14 (p83%), desvio +55% Potencialmente quebrada (p82%); índice 0.83, 10º de 91 na facção |
| artemis-v6-437 | THE SECOND MOON GUARDIAN | Devotee | 4 | Uncommon | **Common** | Power 4.72 (p58%), desvio +7% Balanceada (p31%); índice 0.44, 55º de 91 na facção |
| artemis-v6-438 | THE THIRD MOON GUARDIAN | Devotee | 5 | Uncommon | Uncommon | Power 6.20 (p74%), desvio +15% Acima da curva (p40%); índice 0.57, 41º de 91 na facção |
| artemis-v6-439 | THE FOURTH MOON GUARDIAN | Devotee | 5 | Legendary | **Uncommon** | Power 6.36 (p76%), desvio +18% Acima da curva (p41%); índice 0.58, 38º de 91 na facção |
| artemis-v6-440 | THE FIFTH MOON GUARDIAN | Devotee | 7 | Divine | **Legendary** | Power 11.47 (p98%), desvio +55% Potencialmente quebrada (p81%); índice 0.89, 7º de 91 na facção |
| artemis-v6-441 | THE RETURN OF THE GODDESS | Spell | 3 | Common | **Uncommon** | Power 5.50 (p68%), desvio +62% Potencialmente quebrada (p86%); índice 0.77, 18º de 91 na facção |
| artemis-v6-442 | THE SEVEN GUARDIANS ASSEMBLE | Spell | 4 | Uncommon | **Common** | Power 3.63 (p41%), desvio -17% Abaixo da curva (p11%); índice 0.26, 70º de 91 na facção |
| artemis-v6-443 | THE FIRST SACRED HUNT | Spell | 2 | Common | **Legendary** | Power 5.20 (p64%), desvio +117% Potencialmente quebrada (p98%); índice 0.81, 13º de 91 na facção |
| artemis-v6-444 | THE FOREST INVADES SANCTUARY | Spell | 5 | Uncommon | Uncommon | Power 6.47 (p77%), desvio +20% Acima da curva (p44%); índice 0.61, 36º de 91 na facção |
| artemis-v6-445 | THE SISTERS' DISAGREEMENT | Spell | 3 | Common | Common | Power 4.34 (p51%), desvio +28% Potencialmente quebrada (p54%); índice 0.53, 47º de 91 na facção |
| artemis-v6-446 | THE AWAKENING OF CHANDRA | Spell | 4 | Uncommon | Uncommon | Power 5.92 (p71%), desvio +35% Potencialmente quebrada (p63%); índice 0.67, 28º de 91 na facção |
| artemis-v6-447 | THE FALL OF DAPHNE AND HERMIA | Spell | 3 | Uncommon | **Common** | Power 3.05 (p31%), desvio -10% Abaixo da curva (p14%); índice 0.23, 73º de 91 na facção |
| artemis-v6-448 | THE JUDGMENT OF HUMANITY | Spell | 6 | Uncommon | **Common** | Power 3.74 (p42%), desvio -42% Muito fraca (p0%); índice 0.21, 75º de 91 na facção |
| artemis-v6-449 | THE WRATH OF ARTEMIS | Spell | 5 | Legendary | **Common** | Power 5.18 (p63%), desvio -4% Balanceada (p19%); índice 0.41, 57º de 91 na facção |
| artemis-v6-450 | THE WORLD RECLAIMED | Spell | 6 | Legendary | **Divine** | Power 12.90 (p100%), desvio +101% Potencialmente quebrada (p94%); índice 0.97, 1º de 91 na facção |
| artemis-v6-504 | THE HUNTER'S MOON | Domain |  | Common | Common | Power 1.00 (p0%), desvio -38% Muito fraca (p1%); índice 0.01, 91º de 91 na facção |
| artemis-v6-517 | HUNTRESS'S NET | Spell | 1 | Common | Common | Power 2.07 (p13%), desvio +48% Potencialmente quebrada (p77%); índice 0.45, 54º de 91 na facção |
| artemis-v6-518 | WILD VIGOR | Spell | 1 | Common | Common | Power 1.88 (p10%), desvio +34% Potencialmente quebrada (p62%); índice 0.36, 60º de 91 na facção |
| artemis-v6-519 | LUNAR VISION | Spell | 1 | Common | **Uncommon** | Power 3.06 (p32%), desvio +118% Potencialmente quebrada (p99%); índice 0.66, 32º de 91 na facção |
| artemis-v6-524 | THE NIGHT VALE | Domain | 4 | Uncommon | **Common** | Power 1.49 (p4%), desvio -7% Balanceada (p18%); índice 0.11, 84º de 91 na facção |

### Neutral

| id | carta | tipo | custo | atual | proposta | motivo |
| --- | --- | --- | --- | --- | --- | --- |
| neutral-v6-451 | BLACK PEGASUS | Devotee | 2 | Common | Common | Power 2.07 (p17%), desvio -14% Abaixo da curva (p62%); índice 0.39, 34º de 48 na facção |
| neutral-v6-452 | BLACK DRAGON | Devotee | 5 | Uncommon | Uncommon | Power 4.20 (p83%), desvio -22% Abaixo da curva (p40%); índice 0.62, 16º de 48 na facção |
| neutral-v6-453 | BLACK SWAN | Devotee | 4 | Common | Common | Power 2.77 (p38%), desvio -37% Muito fraca (p28%); índice 0.33, 37º de 48 na facção |
| neutral-v6-454 | BLACK ANDROMEDA | Devotee | 3 | Common | **Uncommon** | Power 3.10 (p49%), desvio -9% Balanceada (p68%); índice 0.59, 19º de 48 na facção |
| neutral-v6-455 | BLACK PHOENIX | Devotee | 6 | Uncommon | **Common** | Power 3.49 (p64%), desvio -45% Muito fraca (p19%); índice 0.41, 33º de 48 na facção |
| neutral-v6-456 | JANGO | Devotee | 6 | Legendary | **Common** | Power 3.81 (p79%), desvio -41% Muito fraca (p21%); índice 0.50, 27º de 48 na facção |
| neutral-v6-457 | SANCTUARY SENTRY | Devotee | 3 | Common | Common | Power 2.10 (p21%), desvio -38% Muito fraca (p26%); índice 0.23, 38º de 48 na facção |
| neutral-v6-458 | MERCENARY SCOUT | Devotee | 1 | Common | Common | Power 1.91 (p15%), desvio +36% Potencialmente quebrada (p91%); índice 0.53, 25º de 48 na facção |
| neutral-v6-459 | STONE COLOSSUS | Devotee | 5 | Uncommon | **Legendary** | Power 5.05 (p91%), desvio -7% Balanceada (p74%); índice 0.83, 5º de 48 na facção |
| neutral-v6-460 | WAR CHARGER | Devotee | 4 | Common | **Legendary** | Power 4.54 (p87%), desvio +3% Balanceada (p83%); índice 0.85, 4º de 48 na facção |
| neutral-v6-461 | SHO, SKY STEEL SAINT | Devotee | 3 | Uncommon | Uncommon | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| neutral-v6-462 | DAICHI, LAND STEEL SAINT | Devotee | 3 | Common | **Uncommon** | Power 3.70 (p72%), desvio +9% Balanceada (p85%); índice 0.79, 8º de 48 na facção |
| neutral-v6-463 | USHIO, MARINE STEEL SAINT | Devotee | 3 | Common | Common | Power 2.70 (p32%), desvio -21% Abaixo da curva (p43%); índice 0.37, 36º de 48 na facção |
| neutral-v6-464 | DR. ASAMORI | Devotee | 3 | Uncommon | Uncommon | Mantida: Cosmo Balance não mediu (UNRESOLVED, Análise inconclusiva); revisar à mão |
| neutral-v6-465 | SKY STEEL CLOTH | Equipment | 3 | Uncommon | **Common** | Power 3.22 (p55%), desvio -30% Muito fraca (p30%); índice 0.43, 32º de 48 na facção |
| neutral-v6-466 | LAND STEEL CLOTH | Equipment | 2 | Common | Common | Power 3.06 (p47%), desvio -15% Abaixo da curva (p57%); índice 0.52, 26º de 48 na facção |
| neutral-v6-467 | MARINE STEEL CLOTH | Equipment | 2 | Common | **Legendary** | Power 9.11 (p100%), desvio +153% Potencialmente quebrada (p100%); índice 1.00, 1º de 48 na facção |
| neutral-v6-468 | STEEL SAINT RECRUIT | Devotee | 1 | Common | **Uncommon** | Power 2.07 (p19%), desvio +48% Potencialmente quebrada (p94%); índice 0.56, 21º de 48 na facção |
| neutral-v6-469 | STEEL ARMOR PROTOTYPE | Equipment | 1 | Common | Common | Power 1.56 (p11%), desvio -40% Muito fraca (p23%); índice 0.17, 42º de 48 na facção |
| neutral-v6-470 | GRAAD FOUNDATION LABORATORY | Equipment | 4 | Uncommon | Uncommon | Power 3.49 (p66%), desvio -21% Abaixo da curva (p45%); índice 0.55, 22º de 48 na facção |
| neutral-v6-471 | GEIST, PHANTOM QUEEN | Devotee | 6 | Legendary | Legendary | Power 5.89 (p94%), desvio -8% Balanceada (p70%); índice 0.82, 6º de 48 na facção |
| neutral-v6-472 | DOLPHIN GHOST SAINT | Devotee | 2 | Common | **Legendary** | Power 3.78 (p74%), desvio +57% Potencialmente quebrada (p98%); índice 0.86, 3º de 48 na facção |
| neutral-v6-473 | SEA SERPENT GHOST SAINT | Devotee | 3 | Common | **Uncommon** | Power 3.20 (p51%), desvio -6% Balanceada (p77%); índice 0.64, 14º de 48 na facção |
| neutral-v6-474 | JELLYFISH GHOST SAINT | Devotee | 4 | Common | **Uncommon** | Power 3.61 (p70%), desvio -18% Abaixo da curva (p51%); índice 0.61, 17º de 48 na facção |
| neutral-v6-475 | PHANTOM SEA AMBUSH | Spell | 4 | Common | **Uncommon** | Power 3.79 (p77%), desvio -14% Abaixo da curva (p60%); índice 0.68, 11º de 48 na facção |
| neutral-v6-476 | COSMO DISRUPTION | Spell | 3 | Uncommon | **Common** | Power 2.83 (p43%), desvio -27% Muito fraca (p32%); índice 0.37, 35º de 48 na facção |
| neutral-v6-477 | DESPERATE RESURRECTION | Spell | 7 | Legendary | **Common** | Power 2.31 (p23%), desvio -69% Muito fraca (p13%); índice 0.18, 41º de 48 na facção |
| neutral-v6-478 | UNIVERSAL COSMO CRYSTAL | Equipment | 4 | Common | **Legendary** | Power 6.58 (p98%), desvio +50% Potencialmente quebrada (p96%); índice 0.97, 2º de 48 na facção |
| neutral-v6-479 | FORBIDDEN KNOWLEDGE | Spell | 5 | Uncommon | **Common** | Power 2.65 (p30%), desvio -51% Muito fraca (p15%); índice 0.22, 39º de 48 na facção |
| neutral-v6-480 | DIVINE JUDGMENT | Spell | 7 | Legendary | **Common** | Power 0.38 (p6%), desvio -95% Muito fraca (p6%); índice 0.06, 45º de 48 na facção |
| neutral-v6-481 | CRYSTAL SAINT | Devotee | 5 | Uncommon | **Legendary** | Power 4.97 (p89%), desvio -8% Balanceada (p72%); índice 0.81, 7º de 48 na facção |
| neutral-v6-482 | OHKO, THE FALLEN DRAGON | Devotee | 4 | Uncommon | **Common** | Power 3.27 (p60%), desvio -26% Muito fraca (p36%); índice 0.48, 29º de 48 na facção |
| neutral-v6-483 | LEDA, CHAIN WARRIOR | Devotee | 2 | Common | Common | Power 2.35 (p26%), desvio -2% Balanceada (p81%); índice 0.53, 24º de 48 na facção |
| neutral-v6-484 | SPICA, CHAIN WARRIOR | Devotee | 3 | Common | Common | Power 2.79 (p40%), desvio -18% Abaixo da curva (p53%); índice 0.47, 30º de 48 na facção |
| neutral-v6-485 | SHIVA, PEACOCK SAINT | Devotee | 4 | Common | Common | Power 3.24 (p57%), desvio -26% Muito fraca (p34%); índice 0.46, 31º de 48 na facção |
| neutral-v6-486 | AGORA, LOTUS SAINT | Devotee | 5 | Uncommon | Uncommon | Power 4.40 (p85%), desvio -18% Abaixo da curva (p49%); índice 0.67, 12º de 48 na facção |
| neutral-v6-487 | ARACHNE, TARANTULA SAINT | Devotee | 4 | Common | **Uncommon** | Power 3.56 (p68%), desvio -19% Abaixo da curva (p47%); índice 0.57, 20º de 48 na facção |
| neutral-v6-488 | GIGAS, SANCTUARY COMMANDER | Devotee | 4 | Uncommon | **Common** | Power 3.40 (p62%), desvio -23% Abaixo da curva (p38%); índice 0.50, 28º de 48 na facção |
| neutral-v6-489 | PHAETON, SANCTUARY OFFICER | Devotee | 3 | Common | Common | Power 3.05 (p45%), desvio -10% Abaixo da curva (p66%); índice 0.55, 23º de 48 na facção |
| neutral-v6-490 | SANCTUARY MERCENARY | Devotee | 2 | Common | **Uncommon** | Power 2.75 (p36%), desvio +15% Acima da curva (p89%); índice 0.63, 15º de 48 na facção |
| neutral-v6-491 | CLOTH REPAIR TOOLS | Equipment | 2 | Common | **Uncommon** | Power 2.71 (p34%), desvio +13% Acima da curva (p87%); índice 0.61, 18º de 48 na facção |
| neutral-v6-492 | DEATH QUEEN MASK | Equipment | 3 | Uncommon | Uncommon | Power 3.99 (p81%), desvio -13% Abaixo da curva (p64%); índice 0.72, 10º de 48 na facção |
| neutral-v6-493 | COSMO CONVERTER | Equipment | 4 | Uncommon | **Common** | Power 0.76 (p9%), desvio -83% Muito fraca (p9%); índice 0.09, 44º de 48 na facção |
| neutral-v6-494 | SANCTUARY SUPPLY CHEST | Equipment | 3 | Common | Common | Power 1.75 (p13%), desvio -49% Muito fraca (p17%); índice 0.15, 43º de 48 na facção |
| neutral-v6-495 | FORCED EXILE | Spell | 7 | Legendary | **Uncommon** | Power 6.25 (p96%), desvio -16% Abaixo da curva (p55%); índice 0.76, 9º de 48 na facção |
| neutral-v6-496 | COSMO EXTRACTION | Spell | 5 | Uncommon | **Common** | Power -0.06 (p2%), desvio -101% Muito fraca (p2%); índice 0.02, 47º de 48 na facção |
| neutral-v6-497 | LAST MOMENT DEFENSE | Spell | 3 | Common | **Uncommon** | Power 3.21 (p53%), desvio -6% Balanceada (p79%); índice 0.66, 13º de 48 na facção |
| neutral-v6-498 | THE BATTLE OF DEATH QUEEN ISLAND | Spell | 5 | Uncommon | **Common** | Power -0.55 (p0%), desvio -110% Muito fraca (p0%); índice 0.00, 48º de 48 na facção |
| neutral-v6-499 | HUMANITY'S DEFIANCE | Spell | 6 | Legendary | **Common** | Power 0.16 (p4%), desvio -98% Muito fraca (p4%); índice 0.04, 46º de 48 na facção |
| neutral-v6-500 | THE EIGHTH SENSE | Spell | 8 | Legendary | **Common** | Power 2.36 (p28%), desvio -72% Muito fraca (p11%); índice 0.19, 40º de 48 na facção |
