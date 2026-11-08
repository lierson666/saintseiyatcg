# Cosmo Hub 2.0 — auditoria (08/11/2026)

Estado verificado em produção (https://saintseiyatcg.com/cosmohub/) e no código (`cosmohub/`, `sanctuary-api/cosmo.py`, `sanctuary-api/server.py`).
Testes feitos: chamadas anônimas a todos os GET/POST de `/api/platform/*`; navegador isolado sem login em desktop e 375×812; fluxo logado em servidor local (sanctuary-api + serve-dev); `test_cosmo` 33/33.

## 1. Inventário

| Parte | Onde | Estado |
| --- | --- | --- |
| Front | `cosmohub/platform.js` (441 linhas, SPA por hash), `platform.css` (125), `i18n-hub.js` | Operacional; uma página só, sem build |
| API | `sanctuary-api/cosmo.py` (1259 linhas), 50 rotas em `/api/platform/*` | Operacional; banco próprio `platform-playtest.db`; lê o banco de contas só para leitura |
| Login | `sanctuary-api/server.py` (`/api/auth/*`, cookie de sessão) | O Hub já usa o mesmo login do jogo |
| Catálogo | `data/registry/` gerado por `tools/build-registry.py` a partir de `data/cards.json` + guia | Em dia (`--check` ok); 610 cartas, 5 Deuses, 56 neutras |
| Arte | `card-forge/art-web/` (publicado sem `-ref` referenciado) | Pública desde 08/11; `-ref` continua atrás do login |
| Testes | `sanctuary-api/test_cosmo.py` (33), `test_server.py` (10), `tools/test-decklist-text.mjs` (4) | Passam; 2 de `test_server` falham só quando rodam junto com `test_cosmo` (estado global compartilhado; já era assim) |

| Seção | Anônimo | Logado | Situação real |
| --- | --- | --- | --- |
| Home | ok | ok | Notícias, balance e torneios vazios (nenhum conteúdo publicado) |
| Codex — cartas | ok | ok | **Mostra só as 120 primeiras de 607**; o resto só aparece pela busca. Filtros não ficam na URL |
| Codex — regras, glossário | ok | ok | Funcionam |
| Codex — rulings, academy | ok | ok | Funcionam, mas vazios |
| Página de carta | ok | ok | Carta viva com arte; sem artes alternativas nem decks que usam a carta |
| Nexus | ok | ok | Funciona, vazio; publicar só pelo Console |
| Decks | ok | ok | Público automático pelo jogo, winrate online, versões, comentários, nota, favorito, copiar, importar. Sem paginação (limite 100), sem filtros, sem curva |
| Meta | ok | ok | Agregado por Deus (7 duelos online até hoje; taxa só a partir de 30) |
| Guilds | ok (lista) | ok | API completa (convite, papéis, times, XP) e testada; nenhuma guilda criada |
| Tournaments | ok (lista) | ok | Suíço e eliminação (`cosmo_pairing.py`), check-in, staff e resultado; nenhum torneio criado; partidas não ligadas ao duelo online |
| Notifications | escondido | ok | Funciona (comentários, guildas, torneios) |
| Console | escondido, API 401/403 | só dev | Permissão decidida no servidor (`is_dev`) |
| Profiles | — | — | **Não existe no Hub.** O jogo tem `/api/profile/<user>` só para logados |
| Collection | — | — | **Não existe no Hub.** Coleção e boosters vivem só no jogo |

Segurança: todo POST anônimo devolve 401; `/content?all=1` 403; `/console`, `/audit`, `/reports` 401. Deck privado devolve 404 para quem não é dono. Caddy libera ao público só `/cosmohub`, `/data/registry`, `/CARD-TEMPLATE` e a arte sem `-ref`.

## 2. Problemas encontrados

1. **Codex corta em 120 cartas** (`filterCards`, `found.slice(0, 120)`), sem "carregar mais".
2. Filtros e busca se perdem ao navegar (não vão para a URL).
3. Sem skeleton: a tela mostra "Loading…" e depois troca tudo de uma vez; erros aparecem só como texto.
4. Mobile: o menu quebra em duas linhas e empurra o conteúdo; o selo "PLAYTEST · BUILD UNKNOWN" aparece para anônimos porque `/playtest/build.json` está atrás do login.
5. `data/registry/index.json` ainda diz "ATHENA + POSEIDON — VANILLA SET V6", mas o catálogo tem as 5 facções.
6. Decks: sem filtro por Deus, ordenação por winrate e paginação; a página do deck não mostra curva de Cosmo nem as artes.
7. Perfil e coleção ausentes no Hub; o jogador não tem página pública.
8. Torneios do Hub não usam o duelo online: o resultado é reportado à mão.
9. Partes de texto ainda sem PT (algumas mensagens dinâmicas novas).

## 3. Arquitetura proposta (sem reconstruir)

- Continua uma SPA sem build em `cosmohub/`, com `platform.js` dividido por seção em módulos ES (`codex.js`, `decks.js`, `profiles.js`…), carregados sob demanda pela rota. Isso diminui o peso inicial e não toca a Arena.
- Catálogo: só `data/registry` (fonte: `data/cards.json`). Nada de base paralela. Artes alternativas vêm do Card Forge (`art-web/cards.json`).
- API: segue em `cosmo.py`. Rotas novas só de leitura pública com paginação (`?page=&limit=`) e `Cache-Control` curto. Perfil público reaproveita `rank_of` e a tabela `duels` do `server.py` (leitura).
- Winrate: só `duels` (online, resultado válido, sem "gone"), já ligado ao deck por `a_hash`/`b_hash`.
- Visual: KV oficial (`shared/kv.css`) + camada Hub com mármore escuro, metal e os 5 símbolos de facção já existentes em `CARD-TEMPLATE/symbols/`.

## 4. Plano por prioridade

| # | Entrega | Mexe em |
| --- | --- | --- |
| P1 | Codex: lista completa com "carregar mais"/rolagem, filtros na URL (persistentes), filtro por keyword e facção com símbolo, skeleton dos cards, estados vazio/erro | `cosmohub/` |
| P1 | UX geral: menu mobile em uma linha com rolagem horizontal, foco visível, alvos de toque ≥ 44 px, sem "build unknown" para anônimo | `cosmohub/`, `shared/env-badge.js` |
| P1 | Decks: filtros (Deus, ordenação por recentes/winrate/nota), paginação na API, curva de Cosmo e tipos na página do deck, link curto de compartilhamento | `cosmohub/`, `cosmo.py` |
| P2 | Profiles: página pública `#/player/<user>` com avatar, Deus favorito, rank, conquistas, decks públicos e histórico online | `cosmo.py` (leitura), `cosmohub/` |
| P2 | Página de carta: artes alternativas, decks públicos que usam a carta, comentários da carta | idem |
| P3 | Nexus: editor no Console com prévia, comentários moderados em notícias | idem |
| P3 | Torneios ligados ao duelo online (resultado automático do `arena-server`) | `server.py`, `cosmo.py` |
| P4 | Coleção no Hub (leitura da coleção do jogo, variantes cosméticas) | `server.py` (leitura), `cosmohub/` |

Cada item: teste automatizado (`test_cosmo.py` para API, `node --test` para lógica do front), validação local com `cosmohub-local` (`.claude/launch.json`), commit pequeno, publicação só depois.

## 5. Riscos e dependências

- **Árvore compartilhada**: `playtest/lobby.js`, `server.py`, `shared/i18n-pt.js` têm mudanças não commitadas de outras sessões. Commits pequenos precisam separar só os trechos do Hub.
- **Banco de produção**: só colunas novas (`alter table … add column`) e tabelas novas; backup antes (`/data/sanctuary-pre-*.db`), rollback = imagem anterior + backup.
- **Rebuild da API**: `docker compose -f /etc/sanctuary/compose.yml --env-file /home/dev/sanctuary-api/.env -p sanctuary up -d --build` (sempre com `-p sanctuary`).
- **Caddy**: só root (terminal web da Hostinger); script com validação e backup.
- **Arte `-ref`**: nunca listar nem linkar no Hub público.
- **Volume de dados**: hoje há 7 duelos online; winrate e meta vão demorar a ter amostra.
