# Prompt de continuação (Codex)

Cole o bloco abaixo no Codex, aberto na pasta do projeto.

---

Você vai continuar o desenvolvimento do **Saint Seiya TCG**, um card game de fã jogável no navegador. Responda em português, de forma curta.

## Onde estão as coisas
- **Pasta do projeto:** `~/Library/CloudStorage/GoogleDrive-limattenhauer@gmail.com/Meu Drive/Lierson Jr/SAINT SEIYA TCG`. É o Google Drive.
- **Git:** o diretório `.git` fica fora do Drive, em `~/git/saintseiya-tcg.git`. O remoto é o GitHub privado `lierson666/saintseiyatcg`, acessado por SSH pelo alias `github-lierson`. A branch é `main`.
- **Site no ar:** https://saintseiyatcg.com, onde `/` redireciona para `/playtest/`.
- **Rodar local:** `python3 -m http.server 8000` na raiz do projeto, depois abrir http://localhost:8000/playtest/.

## Arquitetura do playtest (`playtest/`)
JS puro, sem build. O estado do jogo é do `app.js`, e o resto é visual.

| Arquivo | O que faz |
|---|---|
| `app.js` | Motor, regras, IA e render HTML por strings (~9k linhas). Canvas de design 1920x1080 escalado por `updateViewportScale`. |
| `fx3d.js` | Efeitos em Three.js 0.160 vindo da CDN: carta voando, investida de ataque, partículas, toon shading com `gradientMap` de 3 faixas, matcaps procedurais dourado/azul/prata e estilhaços. `metalFor(nome)` escolhe o metal. Se não houver WebGL, `createFx()` devolve `null` e o CSS faz o fallback. |
| `audio.js` | Música e efeitos sintetizados em WebAudio, sem arquivos de áudio: `sfx(nome)`, `playMusic("menu" \| "battle")`, `unlock()` após um gesto do usuário, `setVolume`. |
| `menu.js` | Tela título, menu principal (Battle vs AI, Local Battle, Online "Coming soon", Collection, Options) e coleção. Chama `onStart(ai)` no `app.js`. |
| `styles.css` | Estilos legados. |
| `arena.css` | Layout estilo MTG Arena, com escopo em `#playmat`. |
| `soldiers.css` | Skin "port de console": moldura dourada com arabescos via `border-image` SVG, letreiros em gradiente quente e o menu. |

- **Dados:** `data/cards.json` (campo `cartas`) e `data/beta-athena.json` (decks).
- **Regras:** `docs/guia-do-jogo.md`.
- **UX:** a especificação de UX está em `docs/ux-arena-rea.md`.
- **Estudo visual:** o estudo do jogo do PS3 está em `docs/rea-soldiers-soul.md`.
- **Editor de cartas:** `card-forge/`.

## Regras do projeto
1. Texto visível ao jogador fica em **inglês**. Código interno e anotações ficam em português.
2. **Nunca** use arte, som, música ou modelos extraídos de jogos da Bandai ou da Toei. Só recrie o estilo com material original.
3. Toda mudança em JS ou CSS do playtest exige **subir o `?v=N`** em `index.html` (`app.js?v=`, `soldiers.css?v=` etc.), e `app.js` importa `fx3d.js?v=` com o mesmo cuidado. Hoje está em `app.js?v=16`.
4. `.gitignore` já ignora `MOBILE GAMES/`, `*.iso`, `*.apk`, `*.psd`, `FRAMES/`, `ARTS/*` (menos `BOARD.png`), `.omc/` e `graphify-out/`. Não commite arte pesada.
5. Faça commit só dos arquivos da tarefa. Antes de dar push ou publicar, peça o OK do usuário.

## Publicar no site (VPS Hostinger, Caddy em Docker)
O alias SSH `mamaco-dev` já está configurado neste Mac. A raiz do site é `/home/dev/saintseiyatcg/`. Para publicar:

```bash
cd playtest
rsync -az -e "ssh -o BatchMode=yes" index.html app.js fx3d.js audio.js menu.js soldiers.css arena.css styles.css mamaco-dev:/home/dev/saintseiyatcg/playtest/
ssh mamaco-dev 'chmod -R a+rX /home/dev/saintseiyatcg/playtest'
```

- **Sem `--delete`:** não use essa opção, porque apagaria `manifest.webmanifest` e os ícones em `LOGO/`.
- **Conferir depois:** compare `sha1sum` no servidor com `shasum` local e abra o site para checar o console.

## Último estado
O último commit é `cc06a24` (front end estilo console, skin dourada e áudio procedural). Já está publicado e funcionando, sem erros no console.

## Pendências (em ordem sugerida)
1. **Bug:** na Local Battle (hotseat, IA desligada), o Player B não avança de fase pelo botão principal, porque `advanceToNextPhase` no `app.js` só aceita o Player A. A correção é deixar o jogador da vez (`gameState.currentPlayer`) avançar quando a IA estiver desligada (`#ai-player-b` desmarcado). Teste uma partida inteira em hotseat.
2. **Áudio:** ouvir de verdade e ajustar timbre e volume em `audio.js`. Ninguém ouviu ainda, só foi testado que roda sem erros.
3. **Resto da especificação de UX** em `docs/ux-arena-rea.md`: *phase stops* e as UIs próprias da seção 4.
4. **Skin dourada no HUD da partida:** levar a skin para os retratos (estilo quadrado com fundo de cor por personagem), as barras de Soul e os botões. Hoje ela cobre principalmente os modais e o menu.
5. **Online Battle:** precisa de backend (por exemplo, WebSocket com o estado do jogo no servidor). Por enquanto fica como "Coming soon".

Comece lendo `playtest/app.js` perto de `advanceToNextPhase` e corrija a pendência 1.

---
