# Artemis V2.0 — migração das cartas 431–436

Aprovada pelo autor em 06/11/2026 (master prompt Artemis V2.0). Regra: guia §26; registro: `docs/CHANGELOG-regras.md` (2026-11-06).

Seis cartas existentes foram reaproveitadas. O catálogo continua com 529 cartas e Artemis com 96 registros. Ids, números, posições, custos, ATK/HP, raridade, Cosmoble, Equip e bônus das armaduras não mudaram. Todas as mudanças foram feitas pelo id estável.

## Cartas

| Id | Nome anterior | Nome novo | Tipo novo | Custo | ATK/HP | Raridade |
| --- | --- | --- | --- | ---: | --- | --- |
| artemis-v6-431 | MOONLIGHT HUNTRESS CAPTAIN | THESEUS, CELESTIAL ANGEL | Devotee — Angel — Celestial Warrior | 4 | 4/4 | Uncommon |
| artemis-v6-432 | MOONLIGHT HUNTRESS ARMOR (Half Moonplate) | THESEUS' GLORY | Equipment — Glory | 3, Equip 2 | +2/+2 | Uncommon |
| artemis-v6-433 | PRIMAL FOREST CHAMPION | ICARUS (TOUMA), CELESTIAL ANGEL | Devotee — Angel — Celestial Warrior | 6 | 6/6 | Legendary |
| artemis-v6-434 | PRIMAL GUARDIAN ARMOR (Full Moonplate) | ICARUS' GLORY | Equipment — Glory | 4, Equip 2 | +3/+3 | Uncommon |
| artemis-v6-435 | SILVER ARROW COMMANDER | ODYSSEUS, CELESTIAL ANGEL | Devotee — Angel — Celestial Warrior | 5 | 5/4 | Divine |
| artemis-v6-436 | SILVER ARROW ARMOR (Half Moonplate) | ODYSSEUS' GLORY | Equipment — Glory | 3, Equip 2 | +2/+1 | Uncommon |

Nomes em português: TESEU, ANJO CELESTE; GLÓRIA DE TESEU; ÍCARO (TOMA), ANJO CELESTE; GLÓRIA DE ÍCARO; ODISSEU, ANJO CELESTE; GLÓRIA DE ODISSEU.

**Continuidade:** Theseus, Icarus (Touma) e Odysseus seguem o filme *Saint Seiya Tenkai-hen Josō Overture* (2004), o "Prólogo do Céu". O Touma de Next Dimension não se mistura com o do filme. A continuidade está em `notas_pt` da carta e em `identidade.continuidade` do projeto do Forge.

## Habilidades

| Carta | Antes | Depois |
| --- | --- | --- |
| 431 | Lunar Leadership: outros **Satellites** +1/+1. Moonlit Ambush: **Satellite** aliado causa dano igual ao ATK | **Celestial Vanguard:** outros **Angels** aliados +1/+1. **Divine Judgment:** ao entrar, **Angel** aliado alvo causa dano igual ao ATK a um Devotee inimigo alvo |
| 432 | Moonlight Supremacy | **Heavenly Ascendancy**: mesmo efeito (ao derrotar em combate, Training counter em até dois outros Devotees aliados) |
| 433 | Pierce; Primal Arrival; Verdant Dominion | Pierce; **Celestial Descent** (ao entrar, dano igual ao ATK); **Unbound Resolve** (+1/+1 a cada 3 cartas na Cosmo Bank) |
| 434 | Ancient Protection; Rooted Growth | **Heavenly Guard** (ganha Guardian); **Celestial Awakening** (com 6+ na Cosmo Bank, Training counter no início do seu Round) |
| 435 | Long Range; Precise Execution; Hunter's Mastery (**Satellite**); Lunar Precision | Long Range; **Celestial Reversal** (fight opcional ao entrar); **Angel Vanguard** (**Angel** aliado que declara Strike contra Devotee: +1/+0); **Heavenly Precision** (compra 1 ao derrotar) |
| 436 | Hunter's Precision; Divine Accuracy | **Celestial Strike** (+2/+0 ao declarar Strike contra Devotee); Divine Accuracy (compra 1, uma vez por ciclo) |

Mudança de comportamento só em 431 e 435: a sinergia saiu de Satellite e foi para Angel. As outras quatro cartas trocaram nome e identidade, com o mesmo efeito.

## Engine 3.0

Arquivo: `playtest/engine-v3/v6/artemis.js`.

- **431:** a aura e o alvo de entrada usam `hasType(…, 'Angel')`. Os nomes das escolhas passaram a DIVINE JUDGMENT.
- **432:** a escolha passou a HEAVENLY ASCENDANCY. Training counters, `gearKillInCombat` e até dois alvos continuam iguais.
- **433:** a escolha passou a CELESTIAL DESCENT. Pierce vem do texto e `perBank` continua igual.
- **434:** sem mudança de código (Guardian por aura do equipamento e marcador no início do Round).
- **435:** a escolha passou a CELESTIAL REVERSAL. `watchDeclare` usa Angel. O fight simultâneo, `killInCombat` e Long Range continuam iguais.
- **436:** sem mudança de código.

Nenhum gatilho usa o nome antigo. O texto das cartas para a engine vem de `card-forge/art-web/cards.json`. As seis entradas foram atualizadas a partir de `data/cards.json`, mantendo arte e enquadramento. O export completo (`tools/forge-art-web.sh`) não foi rodado.

## Dados atualizados

- `data/cards.json`: as seis cartas, gravadas com `upsert_card` do `card-forge/serve.py` (só o bloco de cada carta muda). As Glories perderam `patente_armadura`. `notas_pt` registra o nome anterior e a continuidade.
- `docs/traducao-pt/artemis.json`: rascunho PT das seis, para `tools/apply-pt.py` não desfazer a tradução.
- `card-forge/projects/artemis-v6-43[1-6].json`: subtítulo e flavour novos, mais o bloco `identidade` (versão, nome anterior, continuidade, perfil de arte e `arte_representa_personagem: false`).
- `card-forge/armor-forge/store.json`: projetos `theseus-glory`, `icarus-glory` e `odysseus-glory` em DRAFT, ligados às cartas.

## Artes

As seis artes continuam **provisórias**: as artes `-ref` das cartas anteriores. Nenhum arquivo de arte foi apagado ou substituído. Os projetos têm `art.provisoria: true` e uma `nota_provisoria` dizendo que a imagem não representa o novo personagem. A arte nova sai pelo gerador com os perfis `celestial_angel` e `celestial_glory` (`docs/artemis-v2-art-direction.md`), passa pela revisão visual e então pelo export oficial (`tools/forge-art-web.sh` e `tools/light-assets.py`: jpg, webp, zoom, thumb e touch). As artes `-ref` nunca vão ao ar.

## Inventário inicial (antes da migração)

| Id | Nº | Nome | Tipo | Subtipos | Custo | Atributos | Projeto Forge | Arte | Engine |
| --- | ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| artemis-v6-431 | 431 | MOONLIGHT HUNTRESS CAPTAIN | Devotee | Satellite, Lunar Commander | 4 | 4/4 | sim | `art/artemis-v6-431-ref.jpg`, provisória | aura e enter (Satellite) |
| artemis-v6-432 | 432 | MOONLIGHT HUNTRESS ARMOR | Equipment | Moonplate (Half) | 3 | +2/+2, Equip 2 | sim | `-ref`, provisória | gearKillInCombat |
| artemis-v6-433 | 433 | PRIMAL FOREST CHAMPION | Devotee | Forest Guardian, Champion | 6 | 6/6 | sim | `-ref`, provisória | enter e mods |
| artemis-v6-434 | 434 | PRIMAL GUARDIAN ARMOR | Equipment | Moonplate (Full) | 4 | +3/+3, Equip 2 | sim | `-ref`, provisória | aura e startTurn |
| artemis-v6-435 | 435 | SILVER ARROW COMMANDER | Devotee | Satellite, Archer Commander | 5 | 5/4 | sim | `-ref`, provisória | enter, watchDeclare (Satellite) e killInCombat |
| artemis-v6-436 | 436 | SILVER ARROW ARMOR | Equipment | Moonplate (Half) | 3 | +2/+1, Equip 2 | sim | `-ref`, provisória | gearDeclare e gearKillInCombat |

## Pendências

- **Resonance** das Glories com seus Anjos: não ligada (`docs/glory-equipment-system.md`).
- **Decks:** listas que usavam 431 e 435 como lorde de Satellites perderam esse bônus. Em `tools/fixtures/decks-competitivos.json` estão Silver Arrow Huntresses e a lista Elves do meta Premodern. Rever as listas e medir de novo.
- **Balanceamento:** não medido. Os números não mudaram, mas os Anjos agora só se ajudam entre si (são três).
- **Arte:** as seis artes novas e os três Design Locks das Glories.
- **Moon Guardians 437–440:** proposta separada.
- **How to Play** (`how-to-play/index.html`) e `shared/i18n-pt-site.js` ainda listam cinco famílias de Armor.
- **Snapshot D268** (`data/canon/d268.json`): não foi alterado, como manda a regra.
