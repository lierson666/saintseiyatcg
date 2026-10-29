# Contas, amigos, chat e duelo online — proposta

Status: **proposta, aguardando aprovação do autor** (29/10/2026).
Decisões do autor (29/10/2026):
- sem CPF;
- cadastro só por convite durante o beta;
- amizade por código de amigo;
- duelo online de verdade.

Base: `sanctuary-api` (já no ar) e `docs/arquitetura-area-do-usuario.md`.

## 1. Cadastro

| Campo | Obrigatório | Regra |
|---|---|---|
| Email | sim | único; só emails convidados no beta |
| Nome completo | sim | 2 a 80 caracteres |
| Nome de usuário | sim | 3 a 20 caracteres: letras, números e `_`. Único, sem diferenciar maiúsculas (`Seiya` = `seiya`). O formulário confere na hora se está livre. |
| País | sim | lista ISO (BR, PT, US…), com Brasil pré-selecionado |
| Telefone | não | formato internacional (`+55 11 91234-5678`) |
| Senha | sim | mínimo de 10 caracteres |
| Aceite dos termos e da privacidade | sim | caixa de seleção com links |

Ao criar a conta, a pessoa recebe um **código de amigo** fixo: `NomeDeUsuario#4821` (4 dígitos aleatórios).

**Privacidade (LGPD):**
- Email, nome completo e telefone são privados; nenhum outro jogador vê.
- Amigos veem só: nome de usuário, código, avatar e status.
- A conta pode ser apagada pelo próprio jogador.

## 2. Área do usuário (Profile)

- Nova aba **Profile** no topo do lobby.
- Mostra avatar (carta escolhida, como a capa do deck), nome de usuário, código de amigo com botão "Copy" e país.
- Permite editar nome completo, telefone e país, e trocar a senha.
- Tem a ação "Delete account".

## 3. Amigos (Social)

Painel lateral **Friends**, que abre por um ícone no topo, como no Arena.

- **Adicionar:** digitar o código `Nome#1234`. O outro recebe um pedido e só vira amigo se aceitar.
- **Lista:** amigos agrupados por status, cada um com avatar, nome e ponto de status:
  - **Online:** dourado;
  - **In a match:** brasa;
  - **Offline:** apagado.
- **Ações por amigo:** Challenge, Chat, Remove, Block.
- **Pedidos:** recebidos (Accept / Decline) e enviados (Cancel).
- **Bloquear:** some da lista. O bloqueado não consegue mandar pedido, mensagem nem desafio.

## 4. Chat

- Conversa um a um, só entre amigos, numa janela dentro do painel.
- Mostra quem enviou, a hora e "Seen".
- Máximo de 500 caracteres por mensagem e limite de 20 mensagens por minuto.
- O histórico fica guardado por 90 dias.
- O botão "Report" denuncia a conversa ao autor.

## 5. Duelo online

- O jogador clica em **Challenge**, escolhe o deck, e o amigo recebe o convite com Accept / Decline (expira em 60 s).
- Aceito, os dois entram na mesma partida, cada um no seu aparelho.
- **O servidor arbitra:** a engine v3 roda no servidor. Cada jogador envia só a ação escolhida, e o servidor valida, aplica e devolve o estado. Cada um vê só a própria mão; nada de confiar no navegador.
- **Queda de conexão:** 90 s para reconectar; depois disso, derrota por abandono.

## Arquitetura

| Parte | Como |
|---|---|
| Contas, amigos, chat | `sanctuary-api` + SQLite (o que já existe) |
| Status online e chat | O navegador pergunta ao servidor a cada 15 s (status) e a cada 3 s com o chat aberto. Simples e suficiente para o beta; WebSocket entra junto com o duelo. |
| Duelo | Serviço novo `arena-server` em Node (a engine v3 já é JavaScript), com WebSocket, atrás do Caddy em `/arena/*`. Ele confere a sessão no `sanctuary-api`. |

### Banco (tabelas novas ou alteradas)

| Tabela | Campos |
|---|---|
| `users` | + `username` (único, minúsculo para comparar), `username_display`, `full_name`, `country`, `phone`, `friend_code` (único), `avatar_card`, `accepted_terms_at`, `last_seen`, `status` |
| `friend_requests` | `from_id`, `to_id`, `created_at` |
| `friendships` | `user_a`, `user_b`, `created_at` |
| `blocks` | `user_id`, `blocked_id` |
| `messages` | `id`, `from_id`, `to_id`, `body`, `created_at`, `seen_at` |
| `challenges` | `id`, `from_id`, `to_id`, `deck`, `status`, `expires_at`, `match_id` |

### API nova

| Rota | O que faz |
|---|---|
| `GET /api/username-available?u=` | confere se o nome de usuário está livre |
| `PATCH /api/me` | edita o perfil |
| `GET /api/friends` | amigos com status, mais os pedidos |
| `POST /api/friends/requests` | `{code}`: manda pedido pelo código |
| `POST /api/friends/requests/{id}/accept`, `/decline` | responde ao pedido |
| `DELETE /api/friends/{username}` | remove |
| `POST /api/blocks` | `{username}`: bloqueia |
| `POST /api/presence` | batimento: "estou online" ou "estou em partida" |
| `GET /api/chat/{username}?after=` | mensagens novas |
| `POST /api/chat/{username}` | envia mensagem |
| `POST /api/challenges` | desafia um amigo |
| `POST /api/challenges/{id}/accept`, `/decline` | responde ao desafio |

## Etapas

1. **Cadastro completo e Profile:** campos novos, checagem do nome de usuário, código de amigo e aba Profile.
2. **Amigos e status online:** painel Friends, pedidos, bloqueio e status.
3. **Chat entre amigos.**
4. **Desafio e duelo online:** `arena-server`, engine no servidor e reconexão. É a maior etapa.

Cada etapa sai testada e publicada antes da próxima.

## Decisões pendentes

1. Aprovar esta proposta e a ordem das etapas.
2. Texto dos Termos de Uso e da Política de Privacidade: posso redigir um rascunho para revisão.
