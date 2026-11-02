# Equipment System V1

Taxonomia de Equipment aprovada pelo autor em 02/11/2026. Muda classificação e leitura da carta; não muda regra de jogo.

## Fonte única

`shared/equipment-types.js` (versão `1.0.0`) guarda subtipos, ordem, grupo, dependências e estado. Engine, Card Forge, Deck Builder, HUD e Layout Studio consultam esse módulo.

- Carta do catálogo: `subtipos` e, nas armaduras com patente, `patente_armadura` (`Bronze`, `Silver`, `Gold`).
- Carta da Engine: lida pelo texto `type`, com os mesmos predicados.
- Funções: `getCardTypes`, `hasSubtype`, `hasAnySubtype`, `belongsToEquipmentGroup`, `formatCardTypeLine`, `validateEquipmentSubtypes`, `normalizeSubtypes`, `toggleSubtype`.

## Contrato

- Linha de tipo: `EQUIPMENT — BRONZE CLOTH`, `EQUIPMENT — WEAPON SWORD`. Equipment junta subtipos com espaço; os outros tipos seguem com `—`.
- `ARMOR_FAMILY`: Cloth, Scale, Surplice, Warplate, Moonplate. É grupo de consulta, nunca impresso. Armor genérica fica fora do grupo e não acompanha uma família.
- Patente fica em `patente_armadura`, não é subtipo e é impressa junto dos subtipos, antes deles em inglês (autor, 02/11/2026). Progressão do nível I (família sem patente) ao V: Cloth — Bronze, Silver, Gold, God; Scale — Marine, Captain, General, Divine; Surplice — Terrestrial, Celestial, Judge, Divine; Warplate — Berserker, Elite, Warlord, Divine; Moonplate — Crescent, Half, Full, Divine. Raridade e facção não são subtipos e não determinam subtipo.
- Sword, Spear, Trident, Bow, Dagger, Axe e Whip exigem Weapon. Chain, Shield e Staff não exigem. Lyre, Flute, Harp e Horn exigem Instrument.
- Subtipo fora do registro é erro e impede salvar no Forge. Subtipo anterior ao V1 é aviso até a migração.
- O slot de Armor da Engine continua igual em todas as cartas: teste em `tools/test-equipment-types.mjs`.

## Migração

`tools/migrate-equipment-v1.py` lê `tools/equipment-migration-v1.json`, uma tabela explícita por carta. Sem `--apply` só mostra o diff. Só mexe em `subtipos` e `patente_armadura`, repete sem efeito e volta com `--reverter`.

Catálogo: 116 Equipment. 55 migrados, 27 em revisão, 34 sem alteração.

## Pendências de decisão do autor

### Mudam regra se aplicadas; não entram na tabela

Hoje a Engine não trata estas cartas como Armor (`armor: false`), embora `slot_equipamento` diga armadura. Virar família ou Armor faria a carta ocupar o slot.

- `artemis-v6-362` Callisto's Lunar Vestment (`Lunar Vestment`)
- `neutral-v6-465`, `466`, `467` Steel Cloth (`Steel Cloth`)
- `neutral-v6-469` Steel Armor Prototype (`Prototype`)

### Classificação em revisão

| Carta | Nome | Hoje | Proposta | Dúvida |
|---|---|---|---|---|
| `ares-v6-290` | SHIELD OF THE WAR GOD | Divine Relic | Shield Relic | Divine Relic hoje; escudo sagrado. |
| `ares-v6-315` | BERSERKER HELMET | War Gear | Artifact | War Gear hoje: vira só Artifact? |
| `ares-v6-319` | WAR DRUMS | War Artifact | Instrument | War Drums: instrumento sem subtipo Drum no registro. |
| `ares-v6-320` | BURNING JAVELIN | Weapon | Weapon Spear | Burning Javelin: dardo como lança? |
| `ares-v6-321` | CHAINS OF FURY | War Gear | Weapon Chain | War Gear hoje; corrente: arma? |
| `artemis-v6-380` | THE SILVER ARROW OF THE MOON | Divine Relic, Arrow | Weapon Relic | Arrow não está no registro: novo subtipo ou só Weapon? |
| `artemis-v6-410` | HUNTER'S QUIVER | Quiver | Artifact | Quiver hoje: vira só Artifact? |
| `artemis-v6-412` | LUNAR PROTECTIVE CLOAK | Cloak | Artifact | Cloak hoje: vira só Artifact? |
| `artemis-v6-414` | MOONSTONE AMULET | Artifact, Amulet | Artifact | Artifact + Amulet hoje: vira só Artifact? |
| `artemis-v6-415` | FOREST GUARDIAN'S SHIELD | Shield | Shield | Shield sem Weapon: proteção. |
| `artemis-v6-416` | ANCIENT ROOT ARMOR | Living Armor | Moonplate | Living Armor (Ancient Root Armor) é de Artemis, mas tem identidade própria: confirmar se é Moonplate. |
| `athena-v6-020` | ATHENA’S SHIELD | Divine Artifact | Shield Relic | Divine Artifact hoje; o spec cita Relic para objetos divinos. |
| `athena-v6-045` | DRAGON SHIELD | Artifact | Shield | Shield sem Weapon: proteção. Spec manda não forçar pelo nome. |
| `athena-v6-046` | ANDROMEDA CHAIN | Artifact | Weapon Chain | Corrente: arma? |
| `athena-v6-049` | LIBRA SHIELD | Divine Weapon | Weapon Shield | Divine Weapon hoje; escudo: arma ou proteção? |
| `hades-v6-196` | PANDORA'S TRIDENT | Relic | Weapon Trident Relic | Relic hoje; o Tridente de Pandora também é arma? |
| `hades-v6-226` | CHAIN OF THE DAMNED | Relic | Weapon Chain Relic | Corrente e Relic hoje. |
| `hades-v6-228` | PANDORA'S HARP | Relic | Instrument Harp Relic | Relic hoje; instrumento também? |
| `neutral-v6-470` | GRAAD FOUNDATION LABORATORY | Facility | Artifact | Facility hoje; não anexável?: vira só Artifact? |
| `neutral-v6-492` | DEATH QUEEN MASK | Mask | Artifact | Mask hoje: vira só Artifact? |
| `neutral-v6-493` | COSMO CONVERTER | Device | Artifact | Device hoje: vira só Artifact? |
| `neutral-v6-494` | SANCTUARY SUPPLY CHEST | Supply | Artifact | Supply hoje; não anexável?: vira só Artifact? |
| `poseidon-v6-126` | ABYSSAL CHAINS | Artifact | Weapon Chain | Corrente: arma? |
| `poseidon-v6-129` | SEA SERPENT FANG | Weapon | Weapon Dagger | Sea Serpent Fang: presa como adaga? |
| `poseidon-v6-131` | TEMPLE GUARD SHIELD | Artifact | Shield | Shield sem Weapon: proteção. |
| `poseidon-v6-170` | ATLANTEAN ROYAL SCEPTER | Artifact | Staff | Scepter como Staff, sem Weapon? |
| `poseidon-v6-178` | POSEIDON'S TRIDENT | Divine Artifact | Weapon Trident | Exemplo do spec; hoje Divine Artifact. Confirmar se também é Relic. |

### Objetos sem portador (candidatos, sem tipo novo)

Sem Resonance e sem Equip impresso: ficam em campo como item global.

`athena-v6-020`, `poseidon-v6-170`, `poseidon-v6-178`, `hades-v6-200`, `hades-v6-227`, `neutral-v6-470`, `neutral-v6-478`, `neutral-v6-491`, `neutral-v6-493`, `neutral-v6-494`

## Fora do repositório

COSMO CODEX e COSMO NEXUS não existem neste repositório: só há menções em documentos. Quando existirem, devem consumir `shared/equipment-types.js`.
