# Saint Seiya TCG — regras do projeto

## Repositório de regras (fonte da verdade)

Tudo que for criado neste projeto (cartas, decks, engine do playtest, IA, UI, Card Forge, textos) segue as regras abaixo. Leia a fonte antes de criar ou mudar algo que dependa de regra.

| O quê | Fonte oficial |
| --- | --- |
| Regras do jogo | `docs/guia-do-jogo.md` (regra vigente: turnos dentro do Round, 31/10/2026). Única fonte de regra; versões e propostas antigas foram apagadas em 31/10/2026 |
| Mudanças de regra | `docs/CHANGELOG-regras.md` |
| Cartas (dados, custos, textos) | `data/cards.json` |
| Beta Athena (decks, domains, proxies) | `docs/beta-athena.md` + `data/beta-athena.json` |
| Representações de carta para impressão e jogo | `docs/cartas-print-e-interativas.md` |

Ordem de precedência quando houver conflito: `guia-do-jogo.md` > `cards.json` > `beta-athena` > código (`playtest/`, `card-forge/`). O código implementa a regra; não define regra.

Regras de versões anteriores (Vanilla 1.0, Rulebook 2.0/2.1, AÇÕES alternadas) não valem e não preenchem lacunas. A migração de código está autorizada, inclusive em `playtest/`, sem publicação remota. `data/cards.json` continua exigindo aprovação de um diff antes da gravação.

## Como mudar uma regra

1. Confirme a mudança com o usuário (autor do jogo). Não invente regra.
2. Edite `docs/guia-do-jogo.md` na seção certa.
3. Registre em `docs/CHANGELOG-regras.md`: data, seção, antes → depois, motivo.
4. Só depois ajuste cartas, engine e UI. Se algo ficar pendente, anote no changelog.

Encontrou código ou carta que contradiz o guia? Aponte ao usuário; não corrija o guia para bater com o código.

## Convenção de idioma

- Desenvolvimento, campos internos e anotações: português.
- Texto visível ao jogador (interface, cartas, keywords, site): PT-BR e EN (autor, 31/10/2026). O código escreve em inglês; `shared/i18n.js` traduz na tela pelos dicionários `shared/i18n-pt.js` (jogo) e `shared/i18n-pt-site.js` (site). Texto novo na interface entra também no dicionário.
- Termos de jogo em PT seguem `docs/glossario-pt-br.md` (aprovado). Texto de carta em PT fica em campos `*_pt` ao lado dos `*_en` em `cards.json` (diff aprovado antes de gravar); campo vazio cai no inglês.
