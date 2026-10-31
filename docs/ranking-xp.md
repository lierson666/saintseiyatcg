# Ranking e XP do Olympus Arena

Status: **desenho aprovado pelo autor em 31/10/2026** (/grill-me). Implementação mínima no `sanctuary-api` e no lobby; ainda não publicada.

## Decisões

| Ponto | Decisão |
| --- | --- |
| O que conta | Rank só no duelo online entre contas. Contra a IA: só XP. Hot-seat: nada. |
| Onde fica | No `sanctuary-api`. O rank é recalculado a partir da tabela `duels` (já gravada pelo servidor); o XP da IA fica em `ai_xp`. |
| Tiers | Steel → Iron → Bronze → Silver → Gold → Kamui. Steel a Gold têm 4 divisões (IV → I). |
| Pips | 6 pips por divisão. Steel: vitória +2, derrota 0. Iron a Gold: vitória +1, derrota −1. Empate: 0. |
| Proteção | Derrota com 0 pip volta uma divisão com 5 pips; nunca cai de tier (IV com 0 pip fica). |
| Kamui | Sem divisões. Pontos: vitória +1, derrota −1, mínimo 0. Ranking Kamui (top 20) por pontos. |
| Temporada | Mês do calendário (UTC). Na virada: um tier abaixo, divisão IV, 0 pip (Kamui → Gold IV; Steel fica). O painel mostra o melhor rank da temporada e o da anterior. |
| XP por partida | Online: vitória 100, derrota ou empate 50. IA: vitória 50, derrota ou empate 25. |
| Teto da IA | 500 XP por dia (UTC) contra a IA; o resultado vem do navegador. Online não tem teto. |
| Níveis | 1000 XP por nível, sem teto. |
| Recompensas | Só cosméticas. Agora: títulos por nível (5 Trainee, 10 Saint, 20 Cloth Bearer, 30 Cosmo Awakened, 50 Seventh Sense; nomes provisórios). Sleeves e emotes por nível ficam para quando o Olympus Arena tiver seletor de cosméticos. |
| Lobby | Selo (emblema, tier, divisão, nível) na barra superior; abre o painel de rank. O perfil do jogador mostra tier e nível. |
| Fim da partida | Cartão na base da tela: pips antes → depois, aviso de promoção, barra de XP e "Level up". |

## Implementação

- `sanctuary-api/server.py`: `climb()` (escalada pura), `level_of()`, `rank_of()`, `kamui_board()`; rotas `GET /api/rank` (também fecha duelos pendentes do jogador) e `POST /api/xp/ai` `{result}`; `rank` no `GET /api/profile/<username>`. Testes em `test_server.py` (`test_climb`, `test_rank_api`, rank no `test_desafio`).
- `playtest/rank.js` + `rank.css`: selo, painel e resumo de fim de partida. `playtest/divine/app.js` chama `rankAfterMatch` quando chega o evento `victory`.
- Dev local com API: `SANCTUARY_URL=http://127.0.0.1:8091 python3 tools/serve-dev.py 8030` repassa `/api/*` a um `sanctuary-api` local.

## Pendências

- Deploy do `sanctuary-api` e do site no mamaco-dev (precisa do "sim" do autor).
- Nomes dos títulos e cores dos emblemas: provisórios, aguardando o autor.
- O rank conta duelos online antigos (retroativo): o histórico de outubro forma a temporada 2026-10 e cai um tier em novembro.
- `kamui_board` refaz a escalada de todos a cada pedido; trocar por tabela quando houver centenas de jogadores.
