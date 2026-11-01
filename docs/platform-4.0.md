# Plataforma 4.0: auditoria e plano

Branch `platform-4.0`, worktree `~/worktrees/sstcg-platform`. Nada aqui foi publicado.

## Auditoria (01/11/2026)

| Item | Estado real |
| --- | --- |
| `/alpha` | Não existe: HTTP 404 e nenhuma pasta no servidor. O autor decidiu criar depois, a partir de um snapshot aprovado. |
| Playtest | `https://saintseiyatcg.com/playtest/`, atrás do login, servido de `/home/dev/saintseiyatcg` no `mamaco-dev`. |
| Rótulo no jogo | O lobby do `/playtest` diz "Alpha 0.1 · Engine 3.0". O rótulo não muda nesta fase; o selo de ambiente fica ao lado. |
| Contas e dados | `sanctuary-api` (Python stdlib + SQLite, volume `sanctuary_sanctuary-data`). São dados reais de jogadores. |
| Duelo online | `arena-server`; monta `playtest`, `shared`, `data` e `art-web` do site, só leitura. |
| Caddy | `/opt/casamamaco/Caddyfile`, só root altera. `/playtest`, `/data`, `/card-forge` e `/CARD-TEMPLATE` exigem sessão. |
| Deploy | `tools/publish-game.sh` e `tools/publish-site.sh` (rsync sem `--delete`). `publish-game.sh` não está versionado no `olympus-arena`. |
| Backup | `sanctuary-api/backup.sh`, cron diário como root, 14 dias. |
| Desvio de versão | O guia diz "VERSION 2.1" e `shared/card-model.js` tem `RULES_VERSION = '2.1'`, mas a regra vigente é a de 31/10/2026. O registro identifica a regra pelo hash. |

### Consequência para criar `/alpha`

Uma pasta `alpha/` sob o site seria servida sem login e os caminhos absolutos do jogo (`/data`, `/shared`) continuariam apontando para o Playtest. Para isolar de verdade é preciso um site root próprio ou caminhos relativos, regra no Caddy (root) e banco e arena-server próprios. Exige aprovação do autor e não foi feito.

## Isolamento

- `deploy/environments.json` declara os alvos; `tools/deploy-guard.py` recusa qualquer outro e sempre recusa Official.
- Módulos novos gravam só em `platform-playtest.db`. O banco de contas abre com `mode=ro`, então a plataforma não consegue alterar conta, rank, moedas nem deck real.
- A identidade é a mesma (cookie `sst_session`, tabela `users`). Fora de `SANCTUARY_ENV=playtest`, `/api/platform/*` responde 503.
- `tools/release.py promote` sempre recusa. Candidato a release nasce com aprovação `pending`.

## Registro canônico

`tools/build-registry.py` deriva `data/registry/` de `data/cards.json` e `docs/guia-do-jogo.md`. É derivado, não fonte: a precedência continua guia > cards.json > código, e o motor continua executando a regra. Versões são imutáveis e endereçadas por hash. Regerar é obrigatório depois de mudar carta ou regra; `publish-game.sh` recusa publicar registro fora de sincronia.

## Arquivos

| Marco | Arquivos |
| --- | --- |
| M0 | `deploy/environments.json`, `deploy/known-failures.txt`, `tools/deploy-guard.py`, `tools/publish-game.sh`, `tools/publish-site.sh`, `shared/env-badge.js` |
| M1 | `tools/build-registry.py`, `data/registry/*` |
| M2 | `tools/release.py`, `sanctuary-api/cosmo.py` (console, auditoria, papéis), `playtest/platform/` (rota `#/console`) |
| M3–M8 | `sanctuary-api/cosmo.py`, `sanctuary-api/cosmo_pairing.py`, `playtest/platform/*`, `playtest/lobby.js` (link), `shared/i18n-pt.js` |
| Testes | `sanctuary-api/test_cosmo.py` |

## Para publicar no Playtest (não executado)

1. Autor aprova; commit e merge em `olympus-arena`.
2. Código da API em `/home/dev/sanctuary-api` e, como root, `docker compose -p sanctuary up -d --build` (o compose agora monta `data/registry` só leitura). Sempre com `-p sanctuary`.
3. `tools/publish-game.sh`, que valida o alvo, confere o registro e carimba o build.

## Decisões pendentes do autor

- Política de pareamento e desempate: `proposal-v1` em `cosmo_pairing.py` é proposta; a API informa `awaiting-author-approval`.
- Quais cartas estão publicadas fora do Playtest: `legality` fica `null` e nenhuma carta é exposta fora do login.
- Seções em revisão no guia (status `review` no registro): R-13, R-14-18 e R-50.
- Critério de Guild XP (missões, valores): só o livro-razão existe; só developer lança, e nenhuma recompensa está ligada.
- Marin e COSMO CHRONICLES: a Academy só lista lições publicadas; nada da narrativa foi criado.
