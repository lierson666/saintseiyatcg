# Saint Seiya TCG — regras do projeto

## Repositório de regras (fonte da verdade)

Tudo que for criado neste projeto (cartas, decks, engine do playtest, IA, UI, Card Forge, textos) segue as regras abaixo. Leia a fonte antes de criar ou mudar algo que dependa de regra.

| O quê | Fonte oficial |
| --- | --- |
| Regras do jogo | `docs/guia-do-jogo.md` (manual Vanilla 1.0) |
| Mudanças de regra | `docs/CHANGELOG-regras.md` |
| Cartas (dados, custos, textos) | `data/cards.json` |
| Beta Athena (decks, domains, proxies) | `docs/beta-athena.md` + `data/beta-athena.json` |
| Representações de carta para impressão e jogo | `docs/cartas-print-e-interativas.md` |

Ordem de precedência quando houver conflito: `guia-do-jogo.md` > `cards.json` > `beta-athena` > código (`playtest/`, `card-forge/`). O código implementa a regra; não define regra.

## Como mudar uma regra

1. Confirme a mudança com o usuário (autor do jogo). Não invente regra.
2. Edite `docs/guia-do-jogo.md` na seção certa.
3. Registre em `docs/CHANGELOG-regras.md`: data, seção, antes → depois, motivo.
4. Só depois ajuste cartas, engine e UI. Se algo ficar pendente, anote no changelog.

Encontrou código ou carta que contradiz o guia? Aponte ao usuário; não corrija o guia para bater com o código.

## Convenção de idioma

- Desenvolvimento, campos internos e anotações: português.
- Nomes de cartas, keywords e texto visível ao jogador: inglês.
