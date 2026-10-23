# Importação das 300 cartas — diff para aprovação

Catálogo: **57 → 357 cartas**. Adicionadas: 300; alteradas: 0; removidas: 0.

Os 57 registros antigos permanecem intactos. Os novos usam IDs `sst-XX-XXX`, preservando o ID original `SST-XX-XXX` em `id_fonte`, o texto literal e a localização da célula na proveniência.

- [Diff completo](cards.diff)
- [Catálogo candidato completo](catalogo-candidato.json)
- [Resumo estruturado e hashes](resumo.json)

## Normalizações e decisões

- HP vira `vida`; custos e atributos mantêm os números da planilha.
- Equipment e Support recebem suporte próprio; os tipos da fonte são preservados.
- Equipment usa Equip padrão de 1 Cosmo, conforme regra aprovada. A lista explícita de slots está abaixo.
- Owners e Resonance usam identidade estável do personagem; as 10 Cloths de Athena possuem apenas Vanilla e 7th Sense, como na fonte.
- As habilidades recebem operações estruturadas para o motor. O texto de apresentação é preservado, com a correção aprovada de SST-03-010 identificada separadamente.
- Todas recebem status `needs-review` e raridade visual `Playtest`; nenhum balanceamento é apresentado como validado.
- O texto e status originais da planilha ficam em `origem`; a planilha original não é modificada.

## Slots de equipamento

| ID | Equipamento | Slot |
| --- | --- | --- |
| SST-01-011 | Pegasus Cloth | armadura |
| SST-01-012 | Dragon Cloth | armadura |
| SST-01-013 | Cygnus Cloth | armadura |
| SST-01-014 | Andromeda Cloth | armadura |
| SST-01-015 | Phoenix Cloth | armadura |
| SST-01-016 | Virgo Gold Cloth | armadura |
| SST-01-017 | Libra Gold Cloth | armadura |
| SST-01-018 | Aries Gold Cloth | armadura |
| SST-01-019 | Leo Gold Cloth | armadura |
| SST-01-020 | Sagittarius Gold Cloth | armadura |
| SST-02-011 | Sea Dragon Scale | armadura |
| SST-02-012 | Siren Scale | armadura |
| SST-02-013 | Seahorse Scale | armadura |
| SST-02-014 | Scylla Scale | armadura |
| SST-02-015 | Chrysaor Scale | armadura |
| SST-02-016 | Kraken Scale | armadura |
| SST-02-017 | Lymnades Scale | armadura |
| SST-02-018 | Mermaid Scale | armadura |
| SST-02-019 | Oceanic Armor | armadura |
| SST-02-020 | Trident Guard | arma |
| SST-03-011 | Wyvern Surplice | armadura |
| SST-03-012 | Griffon Surplice | armadura |
| SST-03-013 | Garuda Surplice | armadura |
| SST-03-014 | Gemini Surplice | armadura |
| SST-03-015 | Aquarius Surplice | armadura |
| SST-03-016 | Capricorn Surplice | armadura |
| SST-03-017 | Aries Surplice | armadura |
| SST-03-018 | Deep Fragrance Mantle | acessorio |
| SST-03-019 | Papillon Surplice | armadura |
| SST-03-020 | Sphinx Surplice | armadura |
| SST-04-011 | Flame Warplate | armadura |
| SST-04-012 | Steel Warplate | armadura |
| SST-04-013 | Blood Warplate | armadura |
| SST-04-014 | Ash Warplate | armadura |
| SST-04-015 | Fury Warplate | armadura |
| SST-04-016 | Discord Blade | arma |
| SST-04-017 | Ruin Shield | arma |
| SST-04-018 | Carnage Helm | acessorio |
| SST-04-019 | Vengeance Spear | arma |
| SST-04-020 | War Champion Armor | armadura |
| SST-05-011 | Lunar Bow | arma |
| SST-05-012 | Moonlit Quiver | acessorio |
| SST-05-013 | Silver Mantle | acessorio |
| SST-05-014 | Huntress Guard | acessorio |
| SST-05-015 | Sacred Crescent | acessorio |
| SST-05-016 | Moon Priestess Robe | acessorio |
| SST-05-017 | Forest Ward | acessorio |
| SST-05-018 | Starlight Cloak | acessorio |
| SST-05-019 | Nightwatch Armor | armadura |
| SST-05-020 | Chosen Moonplate | armadura |
| SST-06-011 | Traveler Cloak | acessorio |
| SST-06-012 | Training Bracers | acessorio |
| SST-06-013 | Bronze Buckler | arma |
| SST-06-014 | Cosmo Pendant | acessorio |
| SST-06-015 | Meditation Beads | acessorio |
| SST-06-016 | Worn Greaves | acessorio |
| SST-06-017 | Temple Shield | arma |
| SST-06-018 | Pilgrim Mantle | acessorio |
| SST-06-019 | Sparring Gloves | arma |
| SST-06-020 | Ancient Charm | acessorio |

## Integridade

SHA-256 anterior: `349c8c88d8dae9d77cad331adcfd648c123fa1d01e3eeb9edffa5e6990d8afa0`

SHA-256 candidato: `ece32b3638eed797624104fe57c193a56c2adb3e5aef082c9e1b9c0de908a625`

Esta ferramenta somente prepara arquivos de revisão; `data/cards.json` aguarda a aprovação do diff.
