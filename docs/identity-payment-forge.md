# SSTCG Identity & Payment Forge V1.0

Implementado em 11/11/2026, local. **Nada publicado, nenhuma cobrança real, nenhum saldo de jogador tocado, nenhum build Android.** Todas as chaves começam desligadas.

## 1. Auditoria inicial (11/11/2026)

- Branch `olympus-arena`, último commit `76333da`. Outras sessões tinham trabalho sem commit em `playtest/*`, `shared/i18n-pt.js`, `card-forge/achievements_forge.py`, `sanctuary-api/test_server.py` e trechos do `server.py` (cache de conquistas, `decks_hidden`). Nada disso foi tocado nem commitado aqui.
- Cadastro (`login/index.html` → `POST /api/auth/register`): já pedia data de nascimento e CPF, mas o gate 18+ (`SANCTUARY_AGE_GATE_REQUIRED`) fechava o cadastro com 503, porque não havia provedor. `test_age_gate.py` cobria CPF, data e "autodeclaração não prova".
- Termos e Privacidade: versão `2026-11-11-beta-v1`, aceite em `legal_acceptances`, com marcadores de dados da empresa a preencher.
- `docs/economia.md`: só Cosmo Coins; 250 coins = R$1.

## 2. Pesquisa (só documentação oficial)

| Pergunta | Resposta | Fonte |
|---|---|---|
| Checkout Pro | `POST https://api.mercadopago.com/checkout/preferences` com `items`, `external_reference`, `notification_url`, `back_urls`, `auto_return`; devolve `init_point`. Pix e cartão aparecem na página do Mercado Pago. | mercadopago.com.br/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post |
| Consultar pagamento | `GET https://api.mercadopago.com/v1/payments/{id}`: `status`, `status_detail`, `currency_id`, `transaction_amount`, `external_reference`. | …/checkout-pro/get-payment/get |
| Reembolso | `POST https://api.mercadopago.com/v1/payments/{id}/refunds`; `X-Idempotency-Key` obrigatório; sem `amount` = total. | …/checkout-pro/create-refund/post |
| Chargeback | Tópico `topic_chargebacks_wh`; `GET https://api.mercadopago.com/v1/chargebacks/{id}`. | …/docs/your-integrations/notifications/webhooks |
| Webhook | Cabeçalho `x-signature: ts=…,v1=…` e `x-request-id`; HMAC-SHA256 com a chave secreta do painel "Suas integrações"; responder 200/201 em até 22 s, senão reenvia a cada 15 min. | …/notifications/webhooks |
| Mercado Pago verifica idade/identidade para terceiros? | **Não encontrado.** O pagamento traz o CPF do pagador, mas isso não é verificação de maioridade de um jogador. | — |
| Serviço oficial de identidade | Serpro (Consulta CPF, Datavalid com biometria): exige contrato. Empresas privadas de KYC usam o Serpro por trás. | serpro.gov.br |
| Google Play | Moeda virtual vendida dentro de app da Play Store **tem de** usar o Google Play Billing (salvo programas de faturamento alternativo, com inscrição). | support.google.com/googleplay/android-developer/answer/9858738 |

Pendente de conferência com o SDK oficial antes de ligar: o formato exato do manifesto do webhook. Usamos `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (data.id em minúsculas; partes ausentes saem), que é o validado pelos SDKs oficiais.

## 3. Decisões do autor (11/11/2026, /grill)

1. **Maioridade por autodeclaração.** No Brasil: data de nascimento + CPF com dígitos verificadores corretos. Fora do Brasil: data de nascimento + confirmação "não pode menor de idade". O autor achou que o CPF trazia o ano de nascimento; não traz (9º dígito = região fiscal; 2 últimos = verificadores). Explicado, ele aceitou a autodeclaração. Estado `SELF_DECLARED_ADULT`, **nunca** `VERIFIED_ADULT`. O adaptador de provedor real fica pronto e desligado.
2. **Gate 18+ ligado bloqueia o jogo todo** para quem não declarou ou não aceitou os termos atuais. Abre a tela de regularização.
3. **Sem limite de gasto** por conta.
4. **Só navegador** por enquanto. App Store e Play Store ficam para depois. Mercado Pago dentro do app da Play Store viola a política do Google.

## 4. O que foi feito

### Identidade (`sanctuary-api/identity.py`)
- Estados: `UNVERIFIED`, `PENDING_VERIFICATION`, `SELF_DECLARED_ADULT`, `VERIFIED_ADULT`, `REJECTED_UNDERAGE`, `FAILED_VERIFICATION`, `EXPIRED_VERIFICATION`, `MANUAL_REVIEW`. Tabela de transições por autor da ação: jogador, provedor, sistema e admin.
- Tabelas `identity_status`, `identity_events` (só acrescenta; gatilho bloqueia UPDATE) e `provider_results`.
- **Nunca guarda** o CPF completo nem a data de nascimento. Guarda o país, o CPF mascarado (`***.***.***-25`) e, com `SANCTUARY_PII_KEY`, um HMAC do CPF para impedir o mesmo CPF em duas contas. Teste confere o dump do banco.
- Menor de idade no cadastro: a conta não é criada. Menor de idade na regularização: `REJECTED_UNDERAGE`, sem nova tentativa.
- `VERIFIED_ADULT` só nasce de um resultado autenticado de provedor (`POST /api/identity/callback/<provedor>`, com a chave `IDENTITY_VERIFICATION_ENABLED`). O admin só aprova com o id de uma verificação de provedor já recebida para aquela conta.
- `MockProvider` (HMAC) só para teste; recusado com `SANCTUARY_ENV=production` ou `playtest`.
- **Migração:** ao abrir o banco, toda conta sem estado vira `UNVERIFIED`, com evento `migration-v1`. Nada é apagado e ninguém é verificado automaticamente, admins inclusive.

### Termos e Privacidade v2
- `TERMS_VERSION = '2026-11-11-v2'`. Novos textos sobre autodeclaração, venda de coins (quando ligada), Mercado Pago, estorno, chargeback, retenção fiscal e booster só com coins ganhos.
- `POST /api/me/legal` grava o novo aceite. Com o gate ligado, quem aceitou só a v1 passa pela regularização.

### Cadastro e regularização (`login/index.html`, KV atual, EN + PT-BR)
- O campo CPF só aparece para o Brasil. Há checkbox de 18+ e de Termos + Privacidade, e a versão aparece na tela.
- Tela "Só mais um passo": com o gate ligado, quem não declarou ou não aceitou os termos atuais confirma ali, sem perder nada da conta.
- Visto no navegador (local): cadastro BR, regularização PT sem CPF e cadastro em PT/EN. No celular e no TWA não foi testado à parte; o layout é o mesmo formulário responsivo.

### Pagamentos (`sanctuary-api/payments.py`)
- **Pacotes** no Economy Forge (`coin_packs`, versionado, com histórico e rollback): Bronze R$4,99 = 1.250 · Silver R$9,99 = 2.750 · Gold R$19,99 = 6.000 · Saint R$39,99 = 13.000 · Divine R$79,99 = 28.000 · Olympus R$149,99 = 55.000. A versão no ar (v1) ainda não tem esses campos, e o servidor usa os padrões. Publicar uma v2 no Economy Forge grava os pacotes.
- `POST /api/payments/orders {pack}`: o servidor cria o pedido (`ord_…`) e a preferência no Mercado Pago. Preço e coins vêm do pacote publicado; o que o navegador mandar é ignorado. Exige maioridade declarada e termos atuais aceitos. Limite de 10 pedidos por hora por conta (antifraude; não é limite de gasto).
- `POST /api/payments/webhook/mercadopago`: confere a assinatura, ignora reentrega com o mesmo `x-request-id` e **consulta o pagamento no Mercado Pago**. Só credita se valor, moeda (BRL), referência e ambiente (sandbox/produção) baterem.
- Livro-razão: `purchase:<pedido>`, `refund:<pedido>` e `chargeback:<pedido>`, com índice único (crédito uma vez só) e savepoint (atômico).
- Reembolso (admin) e chargeback: tiram os coins (até o saldo; a diferença fica em `shortfall`) e pausam as compras da conta (`payment_holds`).
- Conciliação (admin): relê no Mercado Pago os pedidos dos últimos 30 dias.
- **Booster com coins comprados:** com `RANDOM_BOOSTERS_PURCHASABLE` desligado, booster só sai de coins ganhos jogando (`paid_coins`). Os outros gastos consomem primeiro os coins comprados.
- Excluir a conta mantém o registro do pedido, sem a conta (fiscal).
- Adaptador Google Play: reservado; recusa tudo.
- **Arrependimento** (rodada 2 do /grill, 11/11/2026): o jogador desiste em até 7 dias da confirmação, só se as coins do pacote não tiverem sido usadas (`paid_coins` ≥ coins do pacote e saldo suficiente). Usou qualquer parte, perde o direito. `POST /api/payments/orders/<id>/withdraw` faz o reembolso total no Mercado Pago, tira as coins e não pausa a conta. Histórico: `GET /api/payments/orders`.

### Loja no jogo (`playtest/economy.js`)
- Aba **Cosmo Coins** na Store, ao lado de Boosters e cosméticos. Aparece só com a venda ligada (`coin_store` em `/api/economy`) e nunca dentro do app Android (TWA). O TWA abre em `/login/` com referrer `android-app://`, e o login marca a sessão (`sessionStorage.ssTwa`).
- Mostra os 6 pacotes (preço em R$, bônus sobre 250 coins por R$1) e o motivo quando a compra está bloqueada (menor de idade, termos ou conta pausada). O botão leva ao Mercado Pago.
- Histórico "Suas compras" com a situação de cada pedido e o botão **Desistir da compra** enquanto der.
- Volta do Mercado Pago (`?purchase=<pedido>`): aviso no canto que confere o pedido a cada 3 s (até 1 min) e leva à aba.
- Componente próprio `<ss-coin-shop>` e textos EN + PT-BR em pares `.i18n-en`/`.i18n-pt`, sem tocar no `lobby.js` (só a versão do import).

### Chaves do servidor (`sanctuary-api/flags.py`; `GET /api/flags`)
`AGE_GATE_REQUIRED`, `IDENTITY_VERIFICATION_ENABLED`, `PAYMENTS_ENABLED`, `MERCADO_PAGO_ENABLED`, `GOOGLE_PLAY_BILLING_ENABLED` e `RANDOM_BOOSTERS_PURCHASABLE`. Todas desligadas; cada uma liga com `SANCTUARY_<CHAVE>=1`, conferida a cada pedido.

### STAR HILL → IDENTITY & COMPLIANCE FORGE (`#conformidade`)
- Usa a ponte e a sessão do Nexus (`card-forge/compliance_proxy.py`), apontando para produção ou localhost. Exige conta admin no servidor.
- Mostra:
  - as chaves, a versão dos termos e o ambiente de pagamento;
  - as contas por estado e o histórico de estados;
  - os pacotes (edição no Economy Forge);
  - os pedidos por situação e os pedidos recentes;
  - as contas pausadas;
  - a auditoria de admin.
- Ações: revisão manual, menor de idade, liberar, aprovar (só com prova), reembolsar, conciliar e liberar compras. Cada uma pede confirmação e fica em `admin_audit`.
- Rotas de admin não passam pelo gate 18+, para o admin não se trancar fora do painel. Login e e-mail de admin continuam exigidos.

## 5. Testes

`cd sanctuary-api && uv run --no-project --python 3.12 python -m unittest <arquivo>` (um arquivo por vez):

| Arquivo | Resultado |
|---|---|
| `test_identity_payments` (novo, 21 testes) | OK |
| `test_age_gate` | OK |
| `test_economy_forge` | OK |
| `test_server` | OK |
| `test_achievements` | OK |
| `test_cosmo` | OK |

`card-forge/serve.py --selftest`: ok.

O que `test_identity_payments` cobre:
- **Identidade:**
  - migração idempotente para `UNVERIFIED`, admins inclusive;
  - autodeclaração BR, sem CPF ou data no banco;
  - menor de idade, CPF inválido e falta de confirmação (nenhuma conta criada);
  - estrangeiro sem CPF;
  - menor de idade bloqueado para sempre;
  - o mesmo CPF em duas contas;
  - gate com regularização e novo aceite dos termos;
  - gate exigindo provedor;
  - callback do provedor (assinatura errada, recusado no servidor no ar, replay);
  - admin sem prova recusado;
  - auditoria;
  - eventos só acrescentam;
  - admin em revisão ainda abre o painel.
- **Pagamentos:**
  - chaves desligadas por padrão;
  - compra exige 18+ e termos;
  - preço vem do servidor;
  - assinatura errada;
  - webhook duplicado e reentregue credita uma vez só;
  - pedido de outro jogador invisível;
  - valor, moeda ou ambiente divergentes não creditam;
  - pendente, recusado e provedor fora do ar (500 para reenviar);
  - reembolso com chave de idempotência e pausa da conta;
  - chargeback com saldo gasto (`shortfall`);
  - conciliação;
  - limite de pedidos;
  - booster só com coins ganhos;
  - exclusão de conta mantém o pedido;
  - manifesto da assinatura.

Ao vivo (servidor local `identity-local` com o gate ligado): cadastro, regularização e STAR HILL → conformidade com ação de revisão, histórico e auditoria. Uma vez, o navegador embutido perdeu o cookie de sessão entre um GET e um POST; com requisições diretas não se repetiu, e com login novo o fluxo passou.

## 6. O que está bloqueado e por quê

| Item | Bloqueio |
|---|---|
| Venda real | Conta Mercado Pago da empresa (credenciais de produção, chave do webhook), CNPJ e dados da empresa nos Termos, nota fiscal e tributos (contador), revisão jurídica. |
| `VERIFIED_ADULT` | Contrato com um provedor de identidade (Serpro Datavalid ou KYC privado). O adaptador `Provider` está pronto; falta a classe do provedor escolhido. |
| Play Store / App Store | Google Play Billing (Digital Goods API no TWA, produtos no Play Console e conferência do `purchaseToken` no servidor) e as regras da Apple. O autor deixou para depois. |
| Chargeback sem lista de pagamentos | Se o objeto do chargeback não trouxer `payments`, a conciliação pega pelo status `charged_back` do pagamento. |
| Reembolso parcial | Não tratado: só o reembolso total (status `refunded`) tira os coins. |
| Chamada ao provedor dentro do lock global | Ao criar o pedido, o servidor fica preso cerca de 1 s. Separar quando houver volume. |

## 7. Variáveis de ambiente (sem segredos no repositório)

| Variável | Para quê |
|---|---|
| `SANCTUARY_AGE_GATE_REQUIRED`, `SANCTUARY_IDENTITY_VERIFICATION_ENABLED`, `SANCTUARY_PAYMENTS_ENABLED`, `SANCTUARY_MERCADO_PAGO_ENABLED`, `SANCTUARY_GOOGLE_PLAY_BILLING_ENABLED`, `SANCTUARY_RANDOM_BOOSTERS_PURCHASABLE` | Chaves (`1` liga). |
| `SANCTUARY_PII_KEY` | Chave do HMAC do CPF (anti-duplicata). Sem ela, não há checagem de CPF repetido. **Segredo.** |
| `MP_ACCESS_TOKEN` | Token do Mercado Pago (de teste em sandbox). **Segredo.** |
| `MP_WEBHOOK_SECRET` | Chave da assinatura do webhook. **Segredo.** |
| `SANCTUARY_PAYMENTS_ENV` | `sandbox` (padrão) ou `production`. Só `production` aceita pagamento `live_mode`. |
| `SANCTUARY_PUBLIC_URL` | Endereço público para `notification_url` e `back_urls` (padrão `SANCTUARY_ORIGIN`). |
| `SANCTUARY_MOCK_IDP_SECRET` | Só em teste local (provedor simulado). |

## 8. Deploy e rollback (quando o autor pedir)

**Deploy**
1. Com o gate e as compras desligados, publique a API (`tools/publish-api.sh`) e o site (`tools/publish-game.sh` ou `/deploy-sstcg`). A migração cria as tabelas e marca todos como `UNVERIFIED`; nada muda para o jogador enquanto as chaves estiverem desligadas.
2. No STAR HILL → Economy Forge, publique a v2 (com os pacotes) e reinicie a API.
3. Para ligar o 18+: defina `SANCTUARY_AGE_GATE_REQUIRED=1` e `SANCTUARY_PII_KEY` no servidor e reinicie. Todos, inclusive o autor, passam pela tela de regularização.
4. Sandbox de pagamento: defina `MP_ACCESS_TOKEN` de teste e `MP_WEBHOOK_SECRET`, configure o webhook no painel do Mercado Pago (`/api/payments/webhook/mercadopago`), defina `SANCTUARY_PAYMENTS_ENABLED=1` e `SANCTUARY_MERCADO_PAGO_ENABLED=1`, e compre com um usuário de teste.
5. Produção: só depois do §9. Defina `SANCTUARY_PAYMENTS_ENV=production` e o token de produção.

**Rollback**
- Desligar as chaves basta para parar o gate e as compras, sem perder dados.
- O código antigo ignora as tabelas novas; o histórico de pagamentos fica guardado.

## 8.1 Decisões de lançamento (/grill, 11/11/2026)

- Publicar no próximo deploy, com as chaves desligadas. Ligar o gate 18+ logo depois, com aviso 1 dia antes (Claude redige PT + EN; o autor aprova).
- Claude gera `SANCTUARY_PII_KEY` direto no servidor. O autor cria a aplicação no Mercado Pago e grava `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` no servidor.
- Vendedor: o autor decidiu primeiro por pessoa física e depois trocou (11/11/2026) para a **XEPA ASSESSORIA GASTRONOMICA LTDA**, CNPJ 47.409.135/0001-79, Rua Abagiba 603, e-mail limattenhauer@gmail.com. Esses dados estão nos Termos e na Privacidade **v3** (`TERMS_VERSION = '2026-11-11-v3'`, novo aceite). Faltam cidade/UF e CEP no endereço, e **a venda só liga com o endereço completo**. Pendência para o contador: o CNAE de assessoria gastronômica pode não cobrir a venda de moeda virtual de jogo.
- Contador e advogado: depois, com a venda já rodando (risco assumido pelo autor). Abrir para todos direto, sem piloto.

## 9. Pendências jurídicas e comerciais (advogado e contador)

1. Dados do operador nos Termos e na Privacidade: razão social, CNPJ, endereço, canal de atendimento e encarregado (DPO).
2. Revisar a regra de arrependimento adotada (7 dias, só com o pacote intacto).
3. Se a autodeclaração basta para a Lei 15.211/2025 (ECA Digital) e o Decreto 12.880/2026, ou se é preciso aferição de idade confiável.
4. Booster (conteúdo sorteado) e caixas de recompensa: se pode ser comprado com coins pagos. Hoje é proibido pela chave.
5. Nota fiscal, tributos sobre a venda de moeda virtual e prazo de guarda dos registros de pagamento.
6. Política de reembolso e chargeback no texto final.
7. Base legal LGPD para o HMAC do CPF e prazo de retenção dos eventos de identidade.
8. Licença da marca Saint Seiya para exploração comercial (Termos §3).
9. Regras da Play Store e da App Store antes de publicar app com a loja.
