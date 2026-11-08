# Proposta: staples do top 100 do EDHREC que faltam

Status: **aprovada e gravada em 08/11/2026** (`docs/proposta-staples-top100.diff`); motor e testes feitos.
Data: 08/11/2026. Base: `docs/analise-staples-top100.md`.

## Decisões do autor (08/11/2026)

- **Pedras de Cosmo neutras:** entram, com custo 2 e geração de {1}{L} uma vez por rodada. Não entra Sol Ring.
- **Botas neutras:** @Impulse e "não pode ser alvo de Moments e Techniques inimigos" (regra nova no §58).
- **Por facção:**
  - Teferi's Protection em Athena.
  - Deadly Rollick e Black Market Connections em Hades.
  - Ímpeto para todos em Ares.
- **Poseidon:** o autor citou o Rhystic Study. Ele já está no jogo como **120 The Drowned Prophet** ("Prophecy of the Abyss", proposta do azul). Então não entra o Mystic Remora, nem um segundo imposto que compra.

## Cartas (7 trocas, ids mantidos)

O custo, a raridade e o nome continuam, salvo quando a tabela indica outra coisa. Cada carta que sai é a mais fraca ou a mais repetida do seu tema.

| Id | Hoje | Proposta | Staple |
| --- | --- | --- | --- |
| neutral 478 | Universal Cosmo Crystal, Equipment 4 (Artifact): {1}{L} por rodada; sacrifica por {2}{L} | **Custo 2.** Cosmo Amplification — Uma vez por rodada, durante a sua rodada, gere {1}{L}. (Sai o sacrifício.) | Arcane Signet / Talismans |
| neutral 494 | Sanctuary Supply Chest, Equipment 3 (Artifact): loot ao entrar; {3}{C} e sacrifica para comprar 2 | **Custo 2.** Emergency Supplies — Uma vez por rodada, durante a sua rodada, gere {1}{L}. Last Reserves — Pague {1}{C} e sacrifique o Sanctuary Supply Chest: compre uma carta. | Mind Stone |
| neutral 469 | Steel Armor Prototype, Armor 1: +1/+0 ao golpear pagando {1} | **Vira Equipment de acessório, custo 2, Equip {1}{C}.** O Devotee equipado tem @Impulse e não pode ser alvo de Moments e Techniques inimigos. | Swiftfoot Boots / Lightning Greaves |
| athena 087 | Seiya Raises Athena's Shield, Technique 5 L: previne todo dano ao God até a sua próxima rodada | **Vira Moment 4.** Divine Salvation — Até o início da sua próxima rodada, o Soul do seu God não pode ser reduzido e os Devotees aliados não podem ser derrotados nem ser alvo de Moments e Techniques inimigos. (Sai a parte do Seiya.) | Teferi's Protection |
| hades 262 | The Destruction of the Gold Cloths, Moment 4 U: derrota e destrói os Equipment dele | Mande o Devotee inimigo alvo ao Void. Se você controla um Judge Specter, este Moment custa {0}. | Deadly Rollick |
| hades 256 | The Betrayal of the Gold Saints, Moment 4 U: devolve 2 Gold Saints do Tartarus | **Vira Equipment 3 (Artifact).** Black Market of the Underworld — No início da sua rodada, você pode pagar até {3}{S}. Para cada {1}{S} pago, escolha um, diferente a cada vez: gere {1}{L}; crie um token Specter Spirit 1/1; compre uma carta. | Black Market Connections |
| ares 319 | War Drums, Equipment 3 (Artifact): +0/+1 e busca Berserker | **Sem portador (global).** War Drums — Os Devotees aliados têm @Impulse. | Rhythm of the Wild (parte vermelha) |

## Regra nova (§58)

**Não pode ser alvo de Moments e Techniques inimigos:** a Spell inimiga não pode escolher o objeto como alvo, nem ao conjurar nem por troca de alvo. Strike e efeitos sem alvo, como "cada Devotee inimigo", continuam pegando.

Usam a regra o 469 (botas) e a 087 (Divine Salvation).

## Pontos para o autor

1. **Duas pedras (478 e 494) com o mesmo efeito base.** A 494 se diferencia por virar compra, como o Mind Stone. Se preferir uma pedra só, a 494 pode ficar como está.
2. **087 perde a parte do Seiya.** Teferi's Protection é a carta inteira. Para manter o Seiya, a proteção do time teria que custar mais.
3. **262 cobra a condição de Judge Specter.** No Commander, o Deadly Rollick sai de graça com o comandante em campo; aqui o Judge faz esse papel, como o Marina General no 136.
4. **256 vira Equipment.** Muda de tipo, então muda a arte e o layout da carta.
5. **319 perde a busca de Berserker.** Ares tem outras buscas (ver 341 e 343).

## Impacto

Depois do diff aprovado:

- `data/cards.json` (EN e PT).
- Motor: neutral.js, athena-spells.js, hades.js e ares.js, mais o gancho "não pode ser alvo" em `targets.js` e `play.js`.
- Testes.
- Guia §58 e CHANGELOG.
