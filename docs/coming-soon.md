# Home Coming Soon — saintseiyatcg.com

Pedido do autor em 29/10/2026: a home vira "COMING SOON — BURN YOUR COSMO", com cadastro de nome e email para novidades. O `/playtest` passa a pedir login.

Arquivos:
- `index.html` na raiz do projeto: a página. O servidor serve a raiz do projeto em `/srv/saintseiyatcg`.
- `tools/coming-soon-apps-script.gs`: grava os cadastros numa planilha Google do autor.

## 1. Planilha dos cadastros (autor, conta Google)

1. Crie uma planilha nova no Google Sheets (ex.: "Saint Seiya TCG — Cadastros").
2. Abra Extensões > Apps Script. Apague o conteúdo e cole `tools/coming-soon-apps-script.gs`. Salve.
3. Clique em Implantar > Nova implantação > tipo "App da Web".
   - Executar como: **Eu**.
   - Quem pode acessar: **Qualquer pessoa**.
4. Autorize o acesso à planilha e copie a URL que termina em `/exec`.
5. Envie a URL ao Claude. Ela entra em `SIGNUP_URL` no `index.html`, que é publicado de novo.

Sem a URL, o formulário funciona, mas responde "Sign-ups open very soon".

## 2. Caddy (precisa de root no mamaco-dev)

O usuário `dev` não edita `/opt/casamamaco/Caddyfile` nem reinicia o Caddy.

1. Gere o hash da senha do playtest. A senha não deve ir para o chat nem para o Git:

   ```bash
   docker compose -f /opt/casamamaco/docker-compose.yml exec caddy caddy hash-password
   ```

2. Faça um backup do Caddyfile:

   ```bash
   cp /opt/casamamaco/Caddyfile /opt/casamamaco/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
   ```

3. No bloco `saintseiyatcg.com`:
   - apague a linha `redir / /playtest/ 302`;
   - acrescente o login do `/playtest`, trocando `USUARIO` e `HASH`:

   ```caddy
   saintseiyatcg.com {
   	encode zstd gzip
   	header {
   		Strict-Transport-Security "max-age=31536000"
   		-Server
   	}
   	basic_auth /playtest/* {
   		USUARIO HASH
   	}
   	root * /srv/saintseiyatcg
   	file_server
   }
   ```

4. Valide e recarregue o Caddy:

   ```bash
   docker compose -f /opt/casamamaco/docker-compose.yml exec caddy caddy validate --config /etc/caddy/Caddyfile
   docker compose -f /opt/casamamaco/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

Depois disso:
- `https://saintseiyatcg.com/` mostra o Coming Soon;
- `https://www.saintseiyatcg.com/` redireciona para a home;
- `https://saintseiyatcg.com/playtest/` pede usuário e senha.

As pastas de apoio (`shared/`, `data/`, `card-forge/art-web/`, `CARD-TEMPLATE/`, `LOGO/`) continuam públicas, como antes. Proteger só `/playtest/*` esconde o jogo, não os arquivos de dados.
