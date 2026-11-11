# ACHIEVEMENTS FORGE V1.0

Implementado em 11/11/2026, a partir do prompt mestre do autor (resumo em `side-session-notes/.../achievements-forge-prompt.md`). Tudo é local: nada foi publicado no servidor do jogo.

## A. Resumo

- **STAR HILL → Achievements Forge** (`#conquistas`): edita o catálogo, mostra a validação e o diff contra a versão no ar, publica versões e faz rollback. Tem o Title Designer.
- **Catálogo:** 50 títulos em 6 raridades: Common, Uncommon, Rare, Epic e Divine com 10 cada exceto Legendary (4) e Divine (6). As variantes TOP vão de 100 a 1º lugar. Cada título tem nome e condição em EN e PT.
- **Servidor (`sanctuary-api`):** mede só o que ele mesmo guarda. O desbloqueio é idempotente e as Cosmo Coins são pagas na mesma transação, uma vez só. Faz a migração retroativa com datas reais e equipa títulos. A Season Awards fica certificada e imutável.
- **Jogo:** a placa do título aparece na barra do lobby (telas ≥ 1600 px), no perfil próprio (onde se escolhe o título), no modal de perfil do jogador e no perfil público do Cosmo Hub.

## B. Arquivos

| Arquivo | O quê |
|---|---|
| `sanctuary-api/achievements.py` | **novo.** Registro de métricas, validação, diff, motor e ordem da Season Awards. A mesma regra serve ao servidor e ao STAR HILL. |
| `sanctuary-api/achievements.json` | **novo.** Catálogo publicado (v1), que o servidor usa. |
| `sanctuary-api/server.py` | Tabelas `achievement_unlocks`, `achievement_counters` e `season_awards` (com gatilhos de imutabilidade). Coluna `users.title_equipped`. Funções `measure`, `sync_achievements` e `certify_season`. Rotas `/api/achievements`, `/api/me/title`, `/api/admin/season-awards` e `/api/admin/achievements`. As 17 conquistas antigas saíram. |
| `sanctuary-api/Dockerfile` | Copia `achievements.py` e `achievements.json`. |
| `sanctuary-api/test_achievements.py` | **novo.** 31 testes. |
| `sanctuary-api/test_server.py` | `test_rank_api` passa a esperar `ach-003` no lugar de `ai-1`/`ai-10`. |
| `data/achievements.json` | Rascunho (Draft) revisado, schema 2. |
| `card-forge/achievements_forge.py` | **novo.** Ler, salvar com revisão, publicar e fazer rollback. Histórico em `star-hill/historico/achievements/v<N>.json`. |
| `card-forge/star_hill.py` | Rotas `GET/POST /api/star-hill/achievements`, `…/publicar` e `…/rollback`. |
| `star-hill/achievements-forge.js` e `.css` | Tela do Forge, reescrita sobre o rascunho preliminar. |
| `star-hill/olympus.js`, `star-hill/index.html` | Item de menu e rota `#conquistas`. |
| `shared/title-art/ach-001…050.webp` | **novo.** As 50 artes do autor em inglês (CONQUISTAS/*.zip mais as correções `english_fix_batch_01/02`), em WebP, sem a margem transparente, 3,1 MB no total. Com o jogo em EN a placa mostra a arte; em PT, a placa desenhada até chegarem as artes PT. |
| `shared/title-plate.js` e `.css` | **novos.** Placa única usada no STAR HILL, no lobby e no Hub. Exporta PNG/WebP. As cores dos efeitos vêm de `shared/vfx/presets.js`. |
| `playtest/lobby.js`, `playtest/lobby.css` | Placa na barra, escolha do título no perfil, conquistas com progresso e "Em breve". A home nova continua intacta. |
| `cosmohub/platform.js` | Placa no perfil público. |
| `shared/i18n-pt.js` | Textos da interface. Nome e condição de cada título vêm do catálogo (`title_pt` e `description_pt`) via `ssI18n.add`. |

## C. Testes

- `cd sanctuary-api && python3.12 -m unittest test_achievements`: **31 ok**. Cobre o catálogo, a validação, o diff, as datas, a desativação e o desempate, além do Forge (publicar, revisão velha, rascunho inválido, rollback com histórico imutável) e do servidor. Do lado do servidor, os testes cobrem migração, idempotência, pagamento único, catálogo inválido ignorado, anti-farm, sequência de vitórias, os 5 Deuses, decks vencedores, cartas novas, Ouro I e Kamui, conta fixada, API com login, equipar e desativar título, boosters, IA sem moedas, Season Awards, exclusão de conta e analytics.
- `python3.12 -m unittest test_server`: 10 ok e 1 falha. `test_economia` já falhava antes desta mudança: a wildcard é sorteada e o teste supõe zero. O mesmo teste foi conferido com o `server.py` anterior.
- `python3.12 -m unittest test_cosmo`: 36 ok e 1 falha. `test_registro_em_dia_com_as_fontes` vem de `data/registry`, que está fora de sincronia com `cards.json` e o guia. Não é desta mudança.
- Rodar `test_cosmo` e `test_server` juntos falha por conflito de ambiente que já existia. Rode cada arquivo sozinho, como diz o docstring.
- Node: `test-i18n`, `test-card-terms-i18n` e `test-home-guide` passam. `test-star-hill-editors` tem 2 falhas nos decks iniciais (cartas ausentes), sem relação com esta mudança. `card-forge/serve.py --selftest` ok.
- Navegador, conferido em servidores próprios:
  - O STAR HILL abre o Forge e muda para DRAFT ao editar. O servidor recusa título vazio sem gravar. O PNG/WebP é gerado.
  - No lobby em PT aparece "Títulos · 4/50". Equipar grava `ach-008`. A placa aparece na barra, no modal e no Cosmo Hub, sem estouro no celular (375 px).

## D. Os 50 títulos

Revisões feitas na auditoria:

- `ach-001` repetia a métrica de `ach-005`. Agora usa *Descubra seu Cosmo* (`cosmo_discovered`).
- `ach-009` (`unique_cards` 25) saía na hora, porque a coleção inicial já tem 122 cartas. Agora usa `new_cards`: cartas além da coleção inicial.
- `ach-010`, `017`, `020`, `025`, `029`, `031`, `034`, `043`, `044` e `045`–`050` deixaram de ser pendentes, porque o servidor já tem os dados.

| ID | Raridade | Título (EN) | Título (PT) | Condição | Métrica | Rastreio |
|---|---|---|---|---|---|---|
| ach-001 | Common | The Awakening | O Despertar | Conclua Descubra seu Cosmo. | `cosmo_discovered` 1 | navegador |
| ach-002 | Common | First Cosmo | Primeiro Cosmo | Jogue 1 duelo online. | `played` 1 | servidor |
| ach-003 | Common | Saint Aspirant | Aspirante a Cavaleiro | Vença a IA. | `ai_wins` 1 | navegador |
| ach-004 | Common | First Blood | Primeiro Sangue | Vença 1 duelo online. | `wins` 1 | servidor |
| ach-005 | Common | Marin's Disciple | Discípulo de Marin | Conclua o tutorial da Marin. | `tutorial` 1 | **pendente** |
| ach-006 | Common | Forger of Destinies | Forjador de Destinos | Salve 1 deck na sua conta. | `decks_created` 1 | servidor |
| ach-007 | Common | Under the Stars | Sob as Estrelas | Jogue 10 duelos online. | `played` 10 | servidor |
| ach-008 | Common | Cosmo Guardian | Guardião do Cosmo | Vença 5 duelos online. | `wins` 5 | servidor |
| ach-009 | Common | Novice Collector | Colecionador Iniciante | Colecione 25 cartas diferentes além da coleção inicial. | `new_cards` 25 | servidor |
| ach-010 | Common | The Chosen One | O Escolhido | Abra 1 booster. | `boosters_opened` 1 | servidor |
| ach-011 | Uncommon | Bronze Saint | Cavaleiro de Bronze | Vença 25 duelos online. | `wins` 25 | servidor |
| ach-012 | Uncommon | Pegasus Fist | Punho de Pégaso | Declare 100 Golpes. | `strikes` 100 | **pendente** |
| ach-013 | Uncommon | Burning Cosmo | Cosmo Ardente | Gaste 1000 de Cosmo. | `cosmo_spent` 1000 | **pendente** |
| ach-014 | Uncommon | Unbreakable Will | Vontade Inabalável | Vença 1 duelo com exatamente 1 de Alma. | `wins_soul_1` 1 | **pendente** |
| ach-015 | Uncommon | Beyond the Limits | Além dos Limites | Vença 3 duelos online seguidos. | `win_streak` 3 | servidor |
| ach-016 | Uncommon | Master of Cloths | Mestre das Armaduras | Jogue 100 Equipamentos. | `equipments_played` 100 | **pendente** |
| ach-017 | Uncommon | Sanctuary Strategist | Estrategista do Santuário | Vença duelos online com 3 listas de deck diferentes. | `winning_decks` 3 | servidor |
| ach-018 | Uncommon | Survivor of the Twelve Houses | Sobrevivente das Doze Casas | Vença 100 duelos online. | `wins` 100 | servidor |
| ach-019 | Uncommon | Breaker of Destinies | Destruidor de Destinos | Derrote 250 Devotos inimigos. | `devotees_defeated` 250 | **pendente** |
| ach-020 | Uncommon | Cosmos in Harmony | Cosmos em Harmonia | Vença 10 duelos online com cada um dos cinco Deuses. | `faction_wins_each` 10 | servidor |
| ach-021 | Rare | Silver Saint | Cavaleiro de Prata | Vença 250 duelos online. | `wins` 250 | servidor |
| ach-022 | Rare | Seventh Sense | Sétimo Sentido | Vença 7 duelos online seguidos. | `win_streak` 7 | servidor |
| ach-023 | Rare | Fist of a Hundred Dragons | Punho dos Cem Dragões | Declare 1000 Golpes. | `strikes` 1000 | **pendente** |
| ach-024 | Rare | Immortal of the Sanctuary | Imortal do Santuário | Vença 50 duelos com pouca Alma. | `low_soul_wins` 50 | **pendente** |
| ach-025 | Rare | Master of Five Constellations | Mestre das Cinco Constelações | Vença 100 duelos online com cada um dos cinco Deuses. | `faction_wins_each` 100 | servidor |
| ach-026 | Rare | The Great Strategist | O Grande Estrategista | Vença 100 duelos contra jogadores do seu rank. | `equal_rank_wins` 100 | **pendente** |
| ach-027 | Rare | Executioner of the Gods | Executor dos Deuses | Vença 500 duelos online. | `wins` 500 | servidor |
| ach-028 | Rare | Beyond Infinity | Além do Infinito | Jogue 1000 duelos online. | `played` 1000 | servidor |
| ach-029 | Rare | Guardian of the Twelve Houses | Guardião das Doze Casas | Chegue a Ouro I em uma temporada. | `gold_i` 1 | servidor |
| ach-030 | Rare | Inevitable Fate | Destino Inevitável | Vença 25 duelos esvaziando o deck rival. | `mill_wins` 25 | **pendente** |
| ach-031 | Epic | Gold Saint | Cavaleiro de Ouro | Chegue a Ouro I em 1 temporada. | `season_gold_i` 1 | servidor |
| ach-032 | Epic | Eighth Sense | Oitavo Sentido | Vença 12 duelos online seguidos. | `win_streak` 12 | servidor |
| ach-033 | Epic | Defier of the Gods | Aquele que Desafia os Deuses | Vença 1000 duelos online. | `wins` 1000 | servidor |
| ach-034 | Epic | Legend of the Twelve Houses | Lenda das Doze Casas | Chegue a Ouro I em 3 temporadas. | `season_gold_i` 3 | servidor |
| ach-035 | Epic | The Last Survivor | O Último Sobrevivente | Vença 25 duelos com exatamente 1 de Alma. | `wins_soul_1` 25 | **pendente** |
| ach-036 | Epic | Master of the Cosmo | Mestre do Cosmo | Gaste 10000 de Cosmo em duelos ranqueados. | `ranked_cosmo_spent` 10000 | **pendente** |
| ach-037 | Epic | Wrath of Athena | A Ira de Athena | Vença 500 duelos online com Athena. | `athena_wins` 500 | servidor |
| ach-038 | Epic | Lord of the Seven Seas | Senhor dos Sete Mares | Vença 500 duelos online com Poseidon. | `poseidon_wins` 500 | servidor |
| ach-039 | Epic | Emperor of the Underworld | Imperador do Submundo | Vença 500 duelos online com Hades. | `hades_wins` 500 | servidor |
| ach-040 | Epic | God of War | Deus da Guerra | Vença 500 duelos online com Ares. | `ares_wins` 500 | servidor |
| ach-041 | Legendary | Moon Hunter | Caçador da Lua | Vença 500 duelos online com Ártemis. | `artemis_wins` 500 | servidor |
| ach-042 | Legendary | Ninth Sense | Nono Sentido | Vença 20 duelos online seguidos. | `win_streak` 20 | servidor |
| ach-043 | Legendary | Divine Ascension | Ascensão Divina | Chegue a Kamui. | `kamui` 1 | servidor |
| ach-044 | Legendary | Eternal Legend | Lenda Eterna | Chegue a Kamui em 5 temporadas. | `season_kamui` 5 | servidor |
| ach-045 | Divine | TOP 100 | TOP 100 | Termine uma temporada no TOP 100. | `season_top` 100 | servidor |
| ach-046 | Divine | TOP 50 | TOP 50 | Termine uma temporada no TOP 50. | `season_top` 50 | servidor |
| ach-047 | Divine | TOP 20 | TOP 20 | Termine uma temporada no TOP 20. | `season_top` 20 | servidor |
| ach-048 | Divine | TOP 10 | TOP 10 | Termine uma temporada no TOP 10. | `season_top` 10 | servidor |
| ach-049 | Divine | TOP 3 | TOP 3 | Termine uma temporada no TOP 3. | `season_top` 3 | servidor |
| ach-050 | Divine | God of the Cosmo | O Deus do Cosmo | Termine uma temporada em 1º lugar. | `season_top` 1 | servidor |

Totais: 36 do servidor, 2 do navegador (desbloqueiam sem moedas) e 12 pendentes (nunca desbloqueiam).

## E. Editor (STAR HILL → Achievements Forge)

1. A lista à esquerda tem busca e filtro de raridade. Pendentes e desativadas ficam marcadas. **+ Nova conquista** cria uma conquista com o próximo ID, já desativada.
2. Editor:
   - Campos: título e condição em EN e PT, raridade, categoria, métrica (com o rastreio ao lado), objetivo, Cosmo Coins, efeito e a opção *Ativa*.
   - Cosmo Coins só ficam liberadas em métrica do servidor.
   - Uma conquista publicada não pode ser apagada; desative-a.
3. **Title Designer:**
   - Prévia grande, média e pequena, em PT ou EN, com fundo escuro ou claro.
   - Movimento normal ou reduzido. O jogo também respeita `prefers-reduced-motion`.
   - *Preset* da raridade e exportação em PNG ou WebP.
   - Os efeitos usam os ids e as cores dos shaders do VFX Forge.
4. **Salvar rascunho** confere a revisão e valida com a mesma regra do servidor. **Publicar versão** grava `sanctuary-api/achievements.json` como versão nova e copia em `star-hill/historico/achievements/`. **Voltar para esta** republica uma versão antiga como versão nova.

## F. Perfil do jogador

- **Perfil → Títulos · N/50:** mostra os títulos conquistados como placas e a opção *Sem título*. Em *Todas as conquistas* aparece o progresso (`3 / 5`), *Conquistado em …* ou *Em breve* para as pendentes.
- O servidor só aceita equipar um título publicado, ativo e desbloqueado. Fora disso responde 403 (*Earn this title first.*) ou 400.
- Se um título for desativado depois, ele some da placa sem erro.
- O modal de outro jogador e o perfil público do Hub mostram a placa e as conquistas, sem as contagens (tamanho da coleção, decks).

## G. Segurança

- **Servidor autoritativo:** a métrica vem do registro (`achievements.METRICS`), nunca do campo `tracking` do catálogo.
  - Pendente nunca desbloqueia.
  - O que vem do navegador (IA, Descubra seu Cosmo, Chronicles) não paga moedas, e a validação impede configurar isso.
- **Idempotência:** a chave `(user_id, ach_id)` e o `insert or ignore`, com a moeda na mesma savepoint. Os testes repetem a sincronização e conferem uma linha e um pagamento só.
- **Catálogo inválido** no servidor é ignorado; vale o último catálogo bom.
- **Anti-farm:** contra o mesmo adversário, só 3 vitórias por dia contam para conquistas. O valor fica em `anti_farm.max_wins_per_opponent_day` no catálogo. O rank não muda.
- **Season Awards:**
  - Vale só para temporada encerrada, só uma vez, e só por admin.
  - Desempate: rank, depois vitórias na temporada, depois a conta mais antiga.
  - Leva hash SHA-256 da foto. Os gatilhos SQL proíbem alterar ou apagar.
  - Contas fixadas em Kamui (`KAMUI_FIXED`) ficam de fora, e também não ganham Ouro I nem Kamui.
- **Exclusão de conta (LGPD):** apaga desbloqueios e contadores. Na premiação, o lugar fica e a conta vira nula.
- **Migração retroativa:** na primeira sincronização de cada jogador, `source = migration`. A data vem do N-ésimo evento real; sem evento datado (decks, cartas, boosters), a data fica vazia.

## H. Pendências e decisões para o autor

1. **12 métricas pendentes** precisam de telemetria de partida no arena-server (Golpes, Cosmo gasto, Alma no fim, Equipamentos, Devotos derrotados, motivo da vitória, rank no momento do duelo). A Marin também precisa gravar no servidor a conclusão do tutorial.
2. **Raridade de `ach-041` (Caçador da Lua):** é Legendary com a mesma meta dos outros Deuses (500 vitórias), que são Epic. O ID manda pelo prompt (041–044 = Legendary). Manter ou ajustar?
3. **"Seventh Sense"** é título de conquista (`ach-022`) e também título de nível 50 (`TITLES`). Renomear um dos dois?
4. **Rare de título ≠ raridade de carta:** nas cartas, Rare = Legendary. Nos títulos, Rare existe por pedido do prompt.
5. **Moedas:** o catálogo está todo com 0 Cosmo Coins (economia fora do escopo). O motor já paga quando o autor definir.
6. **Boosters abertos** só contam daqui para frente: antes o servidor não guardava esse dado.
7. **A placa ainda não aparece** na tela de VS, no HUD compacto nem na vitória. São arquivos da partida mexidos por outras sessões; ficou para uma próxima etapa.
8. **Analytics** existe só no servidor (`GET /api/admin/achievements`: desbloqueios e títulos equipados reais). O painel /admin ainda não mostra.
9. **Season Awards** ainda é disparada à mão (`POST /api/admin/season-awards {"season":"2026-10"}`). Não há agendamento.

## I. Como testar

```bash
cd ~/worktrees/sstcg-olympus/sanctuary-api && python3.12 -m unittest test_achievements
```

- STAR HILL: `python3 card-forge/serve.py` e depois `http://localhost:8765/star-hill/#conquistas`.
- Jogo local com servidor: a config `achievements-local` no `.claude/launch.json` (porta 8033, banco em `/tmp/sstcg-ach-local`). Cadastre `dev@example.com`. Para desbloquear títulos, ponha duelos na tabela `duels` e abra Perfil.

## J. Checklist de produção (não feito; deploy só com pedido)

- [ ] Revisar e aprovar o catálogo v1 e as decisões H.2–H.5.
- [ ] Publicar o `sanctuary-api` com `achievements.py` e `achievements.json` (o Dockerfile já copia os dois) via `tools/publish-api.sh`.
- [ ] Fazer backup do banco antes (`sanctuary-api/backup.sh`). As tabelas novas são criadas sozinhas e a coluna `title_equipped` entra por migração.
- [ ] Publicar o site (lobby, Hub, `shared/title-plate.*`, i18n).
- [ ] Depois do deploy: abrir o perfil de uma conta real e conferir que os desbloqueios retroativos têm datas coerentes.
- [ ] No início de cada mês: certificar a temporada anterior (admin).
