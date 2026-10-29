# Área do usuário — proposta de arquitetura

Status: **proposta, aguardando aprovação do autor** (29/10/2026). Nada implementado.
Fonte: pedido do autor ("login e senha, salvar os decks de cada usuário"), revisado com `renaissance-architecture` e `ui-ux-pro-max`.

## O que existe hoje

- **Hospedagem:**
  - Caddy (container do stack `/opt/casamamaco`) serve `/home/dev/saintseiyatcg` como arquivos estáticos, somente leitura.
  - Não existe backend do jogo.
  - O usuário `dev` não tem root nem acesso ao Docker.
- **Decks:**
  - `playtest/deck-store.js` guarda os decks no `localStorage` (`sstcg.decks.v1`).
  - Formato: `{id, nome, god, domain_id, thumb?, main_deck: [{card_id, quantity}]}`.
  - Os decks valem só naquele navegador.
- **Cadastro de novidades:** planilha Google via Apps Script (`docs/coming-soon.md`).

## O que a área do usuário cria

O jogador entra com a conta em qualquer aparelho e encontra os mesmos decks. Jogar sem conta continua possível; a conta só leva os decks junto.

## Princípios

1. **Local primeiro.**
   - Sem conta, tudo funciona como hoje (`localStorage`).
   - A conta sincroniza os decks.
   - Se a sincronização falhar, o jogo continua funcionando.
2. **O mais simples que resolve.**
   - Um serviço pequeno com um arquivo SQLite.
   - Sem Postgres, sem OAuth e sem serviço de terceiros.
   - Subir de nível só se houver dor medida (ver "Quando crescer").
3. **Estado visível.** O jogador sempre vê onde cada deck está salvo: "On this device" ou "Saved to your account".
4. **Nada se perde.**
   - Apagar um deck é exclusão lógica (`deleted_at`), com 30 dias para desfazer.
   - Conflito entre aparelhos nunca sobrescreve em silêncio.

## Arquitetura

```
navegador (playtest/lobby.js)
  ├─ deck-store.js   localStorage (convidado e cache offline)
  └─ account.js      fetch /api/*  (cookie de sessão)
        │
Caddy saintseiyatcg.com
  ├─ /api/*   → reverse_proxy sanctuary-api:8080
  └─ resto    → file_server /srv/saintseiyatcg
        │
sanctuary-api  (container novo no stack casamamaco)
  Python 3 + FastAPI (já usado no servidor pelo lierson-app)
  SQLite em volume: /data/sanctuary.db (backup diário em /home/dev/backups)
```

### Banco (SQLite)

| Tabela | Campos |
|---|---|
| `users` | `id`, `email` (único, minúsculo), `display_name`, `password_hash`, `created_at` |
| `sessions` | `token_hash`, `user_id`, `created_at`, `expires_at` (30 dias), `last_seen` |
| `decks` | `user_id`, `deck_id`, `data` (JSON do deck), `revision` (inteiro), `updated_at`, `deleted_at` |
| `login_attempts` | `email`, `ip`, `at` (limite de tentativas) |

### API

| Método e rota | O que faz |
|---|---|
| `POST /api/auth/register` | `{email, name, password}`; cria a conta e já entra |
| `POST /api/auth/login` | `{email, password}`; devolve o cookie de sessão |
| `POST /api/auth/logout` | apaga a sessão |
| `GET /api/me` | usuário atual ou 401 |
| `GET /api/decks` | decks do usuário, com `revision` |
| `PUT /api/decks/{id}` | `{data, revision}`; grava se a `revision` bater, senão devolve **409** com a versão do servidor |
| `DELETE /api/decks/{id}` | exclusão lógica |
| `POST /api/decks/{id}/restore` | desfaz a exclusão (até 30 dias) |

### Segurança

- **Senha:**
  - `hashlib.scrypt`, da biblioteca padrão, com sal por usuário.
  - Mínimo de 10 caracteres.
  - Nunca vai para log.
- **Sessão:**
  - Cookie `HttpOnly; Secure; SameSite=Lax`.
  - O token é aleatório (`secrets`), e só o hash dele fica no banco.
- **CSRF:** toda gravação exige `Origin` igual ao site, como o `serve.py` já faz.
- **Força bruta:** 5 tentativas erradas por email/IP em 15 minutos bloqueiam por 15 minutos.
- **Mensagens:**
  - O login sempre responde "Email or password is incorrect.".
  - Não revelamos se o email existe.
- **Validação:**
  - O deck é validado no servidor com as mesmas regras do jogo: 60 cartas, até 3 cópias, cores do God e do Domain.
  - O JSON é limitado a 64 KB por deck.
- **Lacuna da primeira versão:** sem envio de email, não há "esqueci a senha". O autor redefine a senha manualmente por um script de administração. O envio de email (Brevo ou SES) entra numa segunda etapa.

### Sincronização dos decks

- **Ao entrar:** o jogo lê `/api/decks`. Decks que só existem no aparelho aparecem com a ação "Save to account". A importação nunca é automática; o jogador escolhe.
- **Ao salvar logado:** o jogo grava no `localStorage` primeiro (resposta imediata) e depois chama `PUT`.
  - Sem rede, o deck fica marcado "Waiting to sync" e tenta de novo.
  - Com 409 (o deck mudou em outro aparelho), o jogador escolhe entre "Keep this version" e "Use the other one".

## Interface (ui-ux-pro-max)

- **Botão no lobby:** "Sign in" no canto superior direito. Logado, mostra o nome e um menu com Decks e Sign out.
- **Telas de entrar e de criar conta:** no mesmo modal, com duas abas.
  - Rótulos sempre visíveis, nunca só placeholder.
  - Erro escrito logo abaixo do campo.
  - Botão "Show password".
  - `autocomplete` certo: `email`, `current-password` e `new-password`, para o gerenciador de senhas do navegador funcionar.
- **Lista de decks:** cada deck mostra um selo — "On this device", "Saved to your account" ou "Waiting to sync".
- **Exclusão:** apagar mostra um aviso "Deck deleted · Undo" por 10 segundos. A lixeira guarda o deck por 30 dias.
- **Visual:** a mesma direção brutal da home — bordas retas de 2 px, Cinzel e Jost, dourado e brasa.
- **Acessibilidade:**
  - Foco visível e o modal navegável pelo teclado.
  - Contraste mínimo de 4,5:1.
  - Animações respeitam `prefers-reduced-motion`.

## Relação com o login do /playtest

O `basic_auth` proposto em `docs/coming-soon.md` é uma tranca provisória. Com as contas prontas, podem seguir dois caminhos:

- trocar a tranca por uma lista de contas autorizadas no beta (`users.beta = 1`);
- ou manter as duas coisas durante o alpha.

## Quem faz o quê

| Etapa | Quem |
|---|---|
| Código do `sanctuary-api` com testes, `account.js` e telas no lobby | Claude, na branch `olympus-arena` |
| Adicionar o container ao `docker-compose.yml`, a rota `/api/*` no Caddy e o volume do SQLite | Alguém com root no `mamaco-dev` (passo a passo pronto) |
| Backup diário do `sanctuary.db` | cron com `sqlite3 .backup`, também com root |

## Quando crescer

| De | Para | Quando |
|---|---|---|
| SQLite | Postgres | mais de 10 escritas simultâneas ou necessidade de ranking e partidas online |
| Senha | Login social (Google, Discord) | pedido real dos jogadores |
| Sem email | Envio de email | ao abrir o cadastro público, para recuperar a senha e confirmar o email |

## Decisões pendentes do autor

1. Aprovar esta arquitetura (FastAPI + SQLite num container novo).
2. Quem aplica a parte que exige root no `mamaco-dev`.
3. Se o cadastro de novidades migra da planilha para o `sanctuary-api` (opcional; a planilha funciona).
