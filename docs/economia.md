# Economia do Olympus Arena: Cosmo Coins, coleção, boosters e loja

Status: **desenho aprovado pelo autor em 31/10/2026** (/grill-me). Referência: MTG Arena. Nada implementado ainda.

## Decisões

| Ponto | Decisão |
| --- | --- |
| Moeda | Só **Cosmo Coins**, ganhas jogando. Sem dinheiro real no beta; moeda premium pode vir depois. |
| Onde fica | `sanctuary-api`, só no servidor (sqlite). Saldo, coleção e abertura de pacote decididos no servidor; toda mudança de saldo vai para um livro-razão (quem, quanto, motivo, quando). O navegador nunca decide o conteúdo de um pacote. |
| Início | Deck inicial de cada God (os 5 de `data/alpha-0.1/decks-starters.json`) + alguns boosters de boas-vindas. O resto vem de booster. |
| Booster | Um pacote geral ("Olympus") com as 509 cartas. Sempre 15 cartas: 9 Common, 5 Uncommon, 1 Legendary (vira Divine em 1 de 8 pacotes). Em 1 de 10 pacotes uma segunda Legendary toma o lugar de uma Uncommon (07/11/2026). Coleções futuras ganham pacote próprio. |
| Cópias extras | Acima de 3 cópias por identidade (guia §44 / §692), a cópia vira Cosmo Coins na hora; valor maior para raridade maior. |
| Como ganhar | Conquistas (XP + coins uma vez), missão diária (uma por dia, acumula até 3), vitórias do dia (online ou IA), subir de nível. |
| Números | Escala MTGA: booster 1000; 1ª vitória do dia 250, as 4 seguintes 100 cada; missão diária 500 ou 750; nível 250; conquistas 250–2000; sleeves 1500–3000; avatar de usuário 2000; arte de God 3000–5000. Tudo num arquivo de configuração, editável pelo Star Hill. |
| Loja | Boosters sempre à venda; alguns cosméticos giram por dia (ofertas diárias). Itens: booster, sleeves, avatar de usuário, avatar de God, moeda do cara ou coroa (01/11/2026; preço 1000, Deuses 2000, fora do set). |
| Pacotes (31/10/2026) | Estilo MTG Arena: 1, 3, 10 e 25 boosters com desconto escalonado de 0%, 5%, 10% e 20% (1000, 2850, 9000, 20000 coins). Preço cheio riscado e selo do desconto. Tabela `BUNDLES` no `server.py`; edição pelo Star Hill junto com os outros preços. |
| Abrir vários (31/10/2026) | "Open 1" ou "Open 10" (com menos de 10: "Open all (N)"). Vários abrem numa tela só: cartas agrupadas, Divine e Legendary primeiro, repetidas com ×N, total de coins das cópias extras. Servidor abre até 10 por pedido. |
| Cardback vanilla (02/11/2026) | Verso padrão do jogo: `LOGO/cardback-vanilla.webp`, grátis para todos. O tile Vanilla fica sempre na aba Sleeves da loja, para voltar a ele de qualquer sleeve. Equipar é deixar `sleeve` vazio; o sleeve comprado continua na conta. |
| Cosméticos (31/10/2026) | Avatar (rosto: recorte por personagem em `playtest/avatar-face.js`) e Sleeve (verso das cartas, visto pelos dois jogadores) para Deuses, Bronze Saints, Gold Saints e Juízes — só personagens com arte final; arte `-ref` nunca entra. Avatar 500, Sleeve 1500; Deuses o dobro; avatar de Deus grátis. Set (avatar + sleeve) com -20%, só para quem tem os dois pagos. Deck box saiu no mesmo dia: a capa do deck já faz isso. Marinas, Berserkers e Satélites entram quando tiverem arte final. Tabela `COSMETIC_GROUPS` no `server.py`. Loja em abas (Boosters, Avatars, Sleeves, Sets) com confirmação de compra. |
| Avatar de God | Arte alternativa do retrato do God na mesa (mesma carta, outra arte e moldura). |
| Lobby | Abas novas: Collection, Store, Achievements (além de Home, Decks, Profile, Options). Saldo de Cosmo Coins ao lado do selo de rank. |
| Curingas (07/11/2026) | Estilo MTGA: às vezes um Curinga ocupa a vaga de uma carta da mesma raridade. Chance por pacote: Common 1 em 3, Uncommon 1 em 5, Legendary 1 em 24, Divine 1 em 60. Na Coleção, o botão "Criar" troca 1 Curinga por qualquer carta daquela raridade, até 3 cópias. Guardados no `inventory` como `wildcard-<raridade>`. |
| Criar com coins (11/11/2026) | Câmbio de referência: booster (1000 coins) ≈ R$4, logo **250 coins = R$1**. Criar uma carta direto custa: Common **15** (≈ R$0,06), Uncommon **250** (R$1), Legendary **1750** (R$7), Divine **2500** (R$10). Convive com os Curingas: o botão "Criar" usa o Curinga da raridade se houver; sem Curinga, mostra o preço em coins. Mesmo limite de 3 cópias. A cópia extra continua pagando 25/50/200/500 (autor manteve, mesmo a Common repetida valendo mais que criar uma; o limite de 3 cópias impede o ciclo). Implementado em 11/11/2026: `CRAFT_COINS` no `server.py` (rota `/api/wildcards/redeem`, motivo `craft:<carta>` no livro-razão); na Coleção o botão mostra "Craft" com Curinga ou "Craft ◉ preço" sem ele, apagado quando falta saldo. |
| Abrir booster | Estilo MTGA: pacote rasga, 15 cartas caem viradas, clique ou "Reveal all"; Legendary/Divine brilham antes de virar; repetidas mostram "+coins". |
| Controle do autor | Tudo pelo **Star Hill** (admin): acesso total à coleção por usuário, dar/tirar coins com motivo, dar boosters e itens, editar preços e recompensas. Contas de teste e contas antigas: o autor decide no Star Hill quem tem acesso a tudo ou quantos coins recebe. |
| Limite de coleção | Vale para quem não tem acesso total; o acesso total é ligado por usuário no Star Hill. |

## Ordem de construção

1. Coins + coleção + boosters: livro-razão e saldo, coleção inicial, comprar e abrir booster (servidor), construtor de deck respeitando a coleção, Star Hill com acesso total e coins.
2. Recompensas: conquistas pagando XP e coins, vitórias do dia, missões diárias, nível.
3. Loja de cosméticos: sleeves, avatar de usuário, arte de God, ofertas diárias.

## Respostas às pendências (autor aceitou as propostas, 31/10/2026)

- Gods e Domains não vêm no booster: só nos decks iniciais.
- 3 boosters de boas-vindas.
- Cópia extra vira: Common 25, Uncommon 50, Legendary 200, Divine 500 Cosmo Coins.
- Hot-seat (dois jogadores na mesma tela) continua com todas as cartas, para teste.
- Nomes e artes de sleeves, avatares e artes de God: o autor manda depois (etapa 3).

## Etapa 1: implementada (31/10/2026, local; não publicada)

- `tools/economy-catalog.py` gera `sanctuary-api/catalog.json` (cartas do booster por raridade + coleção dos 5 decks iniciais). Rodar de novo quando cartas ou decks iniciais mudarem. O `Dockerfile` copia o catálogo.
- `sanctuary-api/server.py`: tabelas `coin_ledger` (livro-razão), `collection`, `inventory`; coluna `users.full_access`. Rotas `GET /api/economy` (preços com `bundles`), `POST /api/store/buy` (`qty` 1/3/10/25), `POST /api/boosters/open` (`count` 1–10; resposta com `packs`), `POST /api/wildcards/redeem` (`card`), `POST /api/admin/users/<username>/economy` (`coins` + `reason`, `boosters`, `full_access`, `wildcards`). Duelo online recusa deck com carta que o jogador não tem. Testes em `test_economia`.
- Lobby: abas Collection e Store, saldo ao lado do selo de rank, abertura do booster (`playtest/economy.js` + `economy.css`). O construtor de deck só deixa pôr as cópias que o jogador tem; contra a IA o deck precisa estar completo na coleção; hot-seat usa todas as cartas.
- Star Hill (`admin/index.html`, aba Players): coluna Economy com Coins, Boosters e Full access.
- Arte do booster: `playtest/assets/boosters/olympus.webp` (provisória, recorte do santuário); o logo entra por cima automaticamente.

### Falta

- Editar preços e recompensas pelo Star Hill (hoje são constantes no `server.py`).
- Lugar no Card Forge para subir a arte de fundo dos boosters (pedido do autor, 31/10/2026).
- Contas existentes recebem a coleção inicial e os 3 boosters na primeira visita à economia.

## Prêmio por vitória online (autor, 10/11/2026)

- Só duelo online paga, porque só ele é confirmado pelo arena-server. O desenho de 31/10 previa "online ou IA", mas o resultado contra a IA vem do navegador e pode ser forjado.
- Valores do desenho aprovado: 1ª vitória do dia 250, as 4 seguintes 100 cada, 650 por dia no máximo. Dia em UTC.
- Código: `WIN_COINS` e `pay_duel_win` em `sanctuary-api/server.py`; livro-razão com motivo `duel-win:<id do desafio>`.

## Prêmio do Cosmo Chronicles (autor, 11/11/2026)

- Cada missão vencida paga **250 Cosmo Coins + 1 booster**. Missão de chefe paga **250 coins + 3 boosters**: 1.2 (Cassios), 2.3 (Shiryu) e 4.5 (Ikki).
- Só na **primeira vitória** de cada missão; jogar de novo não paga. Marca `chronicle:<missão>` no livro-razão, então nem zerar o progresso paga de novo.
- Saga 01 inteira: 3.250 coins e 19 boosters.
- Risco aceito pelo autor: o resultado contra a IA vem do navegador e pode ser forjado; o teto é o prêmio da saga, uma vez por conta.
- Quem venceu missões antes desta mudança não recebe retroativo: o prêmio sai quando a missão entra no progresso.
- Código: `CHRONICLE_COINS`, `CHRONICLE_BOSSES` e `chronicle_reward()` em `sanctuary-api/server.py`; `reward` de cada `data/chronicles/<missão>.json` repete os valores para a tela.
