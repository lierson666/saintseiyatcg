# Reconstrução Sanctuary — arquitetura e critérios

## Fontes e limites

- Regras: `guia-do-jogo.md` e `CHANGELOG-regras.md`.
- Contratos e projeções do Arena: `rea-arena-engine.md`; evidência estática de metadados, sem importar a engine proprietária.
- Experiência de partida: `ux-arena-rea.md`.
- Direção visual: `rea-soldiers-soul.md`; materiais e assets do projeto, sem arte, áudio ou modelos extraídos do PS3.
- Balanceamento proposto, ainda sujeito ao autor: `keyword-matchups.md`.

## Implementação

- `playtest/engine.js`: factory independente de DOM. Regras, estado, revisão monotônica, comandos, prioridades, pilha LIFO, escolhas, pagamento, fases, IA e combate.
- `playtest/app.js`: navegação, persistência local de preferências, entrada por ponteiro/teclado, privacidade hotseat e coordenação das projeções.
- `playtest/view.js`: projeção da arena e escolhas a partir do estado. Não calcula custos ou resultados de combate.
- `playtest/menu.js`: título, menu, seleção de decks, coleção, configurações e componentes de carta.
- `playtest/presentation.js`: fila de efeitos, comparação visual de revisões, transições de turno e fallback CSS.
- `playtest/fx3d.js`: efeitos procedurais próprios de toon/matcap; opcional, com fallback sem WebGL/CDN.
- `playtest/audio.js`: áudio procedural próprio, iniciado por gesto do jogador.
- `playtest/game.css`: sistema visual novo, responsivo, com HUD, retratos quadrados, barras e controles de console.
- `playtest/assets/`: versões WebP menores da arte já existente no projeto.

O jogo continua sem build: basta um servidor HTTP na raiz. Nenhum backend online novo foi publicado.

## Garantias

- A interface envia intenção; o motor confere ator, fase, prioridade, custo e alvos.
- Confirmação com `expectedRevision` antigo é rejeitada. Escolha de zona é revalidada na confirmação.
- Custos são pagos uma vez ao comprometer a carta; respostas resolvem primeiro e os alvos são revalidados na resolução.
- A fila visual observa o resultado. Preferência de movimento reduzido e fallback não alteram regras.
- Trocar partida ou descartar o motor invalida continuações assíncronas antigas.
- Hotseat usa o jogador da vez, inclusive na declaração de atacantes e nas respostas, e oferece uma tela de passagem do dispositivo.
- Mulligan pertence a ambos no hotseat; contra IA a revisão interativa pertence a A.
- Ultimate, Evolution, Long Range de equipamento, Resonance e custos de equipar gratuitos previstos nas cartas seguem o manual/dados; discrepâncias antigas foram corrigidas na implementação.
- Guardian e Nimble seguem a última decisão explícita do autor; Cheater não ignora Guardian. Seu efeito anti-Long Range é somente proposta.

## Verificação

`node tools/test-rules.mjs --runtime=playtest/engine.js` executa os contratos de regras e da API sem dependências externas. O harness instrumenta apenas o código carregado pelo teste e não adiciona uma ponte de depuração ao produto.

A verificação de navegador cobre menu, hotseat, alvos Guardian/Nimble, combate real, pagamento, pilha, equipamentos, configurações, coleção e layouts de desktop, 800×600 e retrato. Partidas completas contra a IA foram verificadas em 1600×900 e 800×600, com vitória por Soul e sem erros no console. As duas condições de início no hotseat também são percorridas até deckout no contrato de regras.

## Limites explícitos

- Cartas sem arte final usam uma face tipográfica própria. As regras e a identidade dessas cartas continuam disponíveis na coleção e na inspeção.
- Online permanece Coming soon; não há alegação de multiplayer sem backend.
- Balanço entre keywords exige playtests com custos e atributos. Não existe vitória automática de keyword sobre keyword.

## Publicação — somente após OK do autor

A lista antiga de arquivos de deploy não cobre a nova arquitetura. A partir de `playtest/`, a publicação deve incluir módulos e assets:

```bash
rsync -az -e "ssh -o BatchMode=yes" index.html app.js engine.js view.js menu.js presentation.js fx3d.js audio.js game.css manifest.webmanifest assets mamaco-dev:/home/dev/saintseiyatcg/playtest/
ssh mamaco-dev 'chmod -R a+rX /home/dev/saintseiyatcg/playtest'
```

Sem `--delete`. Conferir hashes locais/remotos e o console do site depois. Commit local não autoriza push nem publicação.
