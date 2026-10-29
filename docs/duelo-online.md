# Duelo online — plano da etapa 4

Status: **plano aprovado em direção, aguardando execução** (29/10/2026).
Decisões do autor (29/10/2026):
- o desafio sai do próprio chat;
- o duelo já nasce completo: o servidor arbitra e esconde a informação oculta, sem versão intermediária.

## O que o jogador vê

1. No chat com um amigo online, aparece o botão **Challenge**. O jogador escolhe o deck e envia.
2. O desafio entra na conversa como uma mensagem especial: "⚔ Seiya challenged you to a duel".
   - Para o desafiado, a mensagem tem os botões **Accept** (com escolha de deck) e **Decline**.
   - Fora do chat, o desafiado recebe um aviso no topo do lobby com os mesmos botões.
   - O desafio expira em 60 s; a mensagem passa a mostrar "Expired".
3. Aceito o desafio, os dois vão para a mesma partida (`/playtest/divine/?match=<id>`).
4. **Queda de conexão:** o jogador tem 90 s para reconectar e recebe só o que perdeu. Depois disso, perde por abandono.
5. Ao fim, o resultado aparece no chat: "Seiya won the duel".

## Arquitetura

| Parte | Como |
|---|---|
| Desafio | `sanctuary-api`: tabela `challenges`; rotas `POST /api/challenges`, `/accept`, `/decline` e `GET /api/challenges/pending` (o lobby consulta junto com o status). A mensagem do desafio é uma linha em `messages` com `kind = 'challenge'`. |
| Partida | Serviço novo **`arena-server`** em Node 22 (container próprio, rede do Caddy, rota `/arena/*` com WebSocket). Importa a engine v3 sem cópia (`playtest/engine-v3`, `shared/`). |
| Login | O WebSocket envia o cookie `sst_session`; o `arena-server` confere com o `sanctuary-api` (`GET /api/me`) e só aceita os dois jogadores da partida. |
| Autoridade | O servidor cria a partida (`createMatch` com seed secreta) e aplica as ações. Cada cliente recebe só `resumeFor(state, viewer)` e os eventos de `eventsFor` filtrados por quem vê. A mão e o deck do adversário nunca saem do servidor. |
| Ações | Viram mensagens serializáveis no lugar das funções que a arena executa hoje: `play`, `equip`, `spell`, `activate`, `reequip`, `strike`, `base`, `pass`, `endTurn`, `mulligan`, `answer` (resposta a decisão pendente) e `concede`. O servidor roda a mesma função da engine que a tela usa hoje e devolve `RuleError` como aviso. |
| Relógio | O relógio 3.0 (`clock.js`) roda no servidor. O tempo esgotado aplica `applyTimeout` lá. |

## Mudança grande na tela da partida

`playtest/divine/app.js` hoje lê o estado completo (`match.state`, `objects`) e executa a engine local. O modo online exige:

1. **Camada de ações:** cada clique gera a ação serializável. No modo local, a ação vai para a engine local, e o jogo contra a IA continua igual. No modo online, vai para o servidor.
2. **Desenho a partir da visão do servidor:** um adaptador monta, a partir de `resumeFor`, o mesmo formato que o `render()` usa. A mão e o deck do adversário viram contagens, e as cartas ocultas aparecem com o verso.
3. **Decisões pendentes** (`PendingDecision`): o servidor pergunta só para quem decide, e o cliente responde com `answer`.
4. **Animações e log:** passam a usar os eventos que chegam do servidor (`sync.js` já trata ordem e duplicados).

## Ordem de execução

1. Ações serializáveis e o modo local usando-as, com a IA e os testes atuais passando.
2. `arena-server`: criar a partida, ações, visão por jogador, relógio, reconexão e abandono. Testes com dois clientes simulados, incluindo verificar que a mão do adversário nunca vaza.
3. Adaptador de visão na tela e o modo online.
4. Desafio no chat e no lobby (`sanctuary-api` + `social.js`).
5. Container, rota no Caddy (precisa de root) e teste ponta a ponta com duas contas reais.

## Riscos

- A engine tem efeitos que leem `ctx` e funções; tudo que a tela passa como closure precisa virar dado. O passo 1 revela o tamanho real.
- O WebSocket precisa de rota no Caddy: um comando root, como no `forward_auth`.
