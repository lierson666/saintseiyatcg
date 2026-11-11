# STAR HILL · Nexus (blog do Cosmo Hub)

Criado em 11/11/2026. Área `#nexus` do STAR HILL para escrever, editar, publicar e despublicar os posts do blog Nexus do Cosmo Hub.

## O que faz

- Lista todos os posts do destino: rascunhos e publicados, em PT e EN. Há filtro por idioma e por situação.
- Cria um post novo. O endereço (slug) sai do título, e você pode trocar antes de salvar. Tipo, slug e idioma não mudam depois de criado, porque a API do Hub não aceita.
- Edita título, selo (categoria), capa (id da carta, com sugestões), destaque, texto e meta avançado (JSON para ruling e balanceamento).
- Mostra uma prévia ao vivo de duas coisas:
  - o slide do banner da home;
  - a página da matéria no Cosmo Hub.
- **Home do jogo:** o botão **Home** em cada post (e a caixa "Home do jogo" no editor) escolhe o que vai ao banner da home. O limite é 5 por idioma, e o contador fica no topo da lista. Fica gravado no campo `placement = "home"`, que a API já aceita. A regra está em `playtest/lobby.js` (`loadNews`):
  - entram só posts publicados de Notícia, Guia e Lição;
  - valem os do idioma do jogador; se não houver nenhum nesse idioma, entram os do outro;
  - entre eles, só os marcados para a home, do mais novo para o mais antigo;
  - se nenhum estiver marcado no idioma, o banner mostra os 5 mais recentes.
- Mostra a posição que o post ocupa no banner, ou a que ocuparia se fosse publicado agora.
- **Apagar…:** apaga o post de vez, com as revisões e os comentários dele. A rota é `DELETE /api/platform/content/<id>`. Não dá para desfazer; o audit guarda o título e o slug.
- Sem login, mostra só os posts no ar, para leitura.
- Botões: **Salvar rascunho**, **Publicar…**, **Despublicar**, **Salvar e atualizar no ar** (para post já publicado), **Apagar…**, **Home** e **Abrir no Hub ↗**.

## Como o Star Hill local fala com a produção

O navegador não consegue chamar a API de `saintseiyatcg.com` direto do Star Hill. O cookie de sessão é `SameSite=Lax`, e toda gravação na API exige `Origin: https://saintseiyatcg.com`. Por isso o servidor local do Star Hill faz a ponte: `card-forge/nexus_proxy.py`, nas rotas `/api/star-hill/nexus/*`.

Regras de segurança:

1. **Sem senha guardada.** O login é feito no próprio Nexus. A senha vai uma vez para `/api/auth/login` do destino e não é gravada em lugar nenhum. O cookie de sessão que volta fica só na memória do processo do Star Hill. Fechar o app apaga a sessão. **Sair** também encerra a sessão no servidor.
2. **Destinos fixos.** São aceitos só dois destinos: `https://saintseiyatcg.com` e `http://localhost:<porta>` ou `http://127.0.0.1:<porta>` (teste no próprio Mac). Qualquer outro é recusado.
3. **Confirmação no botão.** Três ações mexem no site no ar:
   - **Publicar**, **Despublicar** e **Apagar**: a ponte exige o campo `confirmar` igual ao endereço do destino.
   - **Salvar** um post que já está publicado: a ponte confere na API se o post está no ar e exige o mesmo `confirmar`.

   A interface só envia esse campo depois que você confirma na caixa de diálogo. Sem ele, o pedido é recusado no Mac e não chega ao site.
4. **Só a interface local grava.** As gravações (POST) passam pela checagem de origem do `serve.py`. Uma página de outro site aberta no navegador não consegue usar a ponte.
5. **A permissão fica no servidor do Hub.** Quem decide é o papel `publisher` ou `developer` (`SANCTUARY_ADMINS`). Uma conta sem papel consegue entrar, mas não cria nem publica.
6. Rascunhos salvos na produção ficam no banco da produção, mas não aparecem para os jogadores.

Quando o destino é a produção, a barra fica dourada e mostra **AO VIVO**. Quando é teste local, mostra **TESTE**.

## Ativar no app do Mac

A ponte é código de servidor. O app STAR HILL que já está aberto (porta 8765) só passa a ter o Nexus depois de fechado e aberto de novo. Antes disso, a área mostra o aviso "Feche e abra o app STAR HILL para ativar".

## Testar sem tocar na produção

Teste automático. Ele sobe um sanctuary-api com banco temporário em portas livres:

```bash
python3 tools/test-star-hill-nexus.py
```

Teste manual: suba um Hub local, por exemplo a configuração `cosmohub-local` (site na porta 8031). No Nexus, escolha **Teste local** e digite a porta do **site**, não a da API. A API local só aceita gravação com `Origin` igual a `SANCTUARY_ORIGIN`, que é o endereço do site.

## O que depende de publicar no site

- **Apagar** e a lista com até 1000 posts para a equipe estão em `sanctuary-api/cosmo.py`. Só funcionam na produção depois que a API for publicada; até lá, o público e a equipe veem no máximo 50 posts.
- O botão **Home** já grava na produção. Mas a home do jogo só respeita essa escolha depois que o `playtest/lobby.js` novo for publicado.

## Limites conhecidos

- O texto é mostrado como texto simples, igual ao Hub: não há Markdown.
