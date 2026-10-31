# Auditoria de performance e acabamento — 31/10/2026

Pedido do autor: "auditoria de three.js e react no jogo todo, pra deixar o jogo mais leve e com aspecto profissional (triple A, estilo MTG Arena)".

## Decisões do autor (grill de 31/10/2026)

| Tema | Decisão |
| --- | --- |
| React | Não migrar. O jogo é JS puro (módulos ES), sem React em lugar nenhum; a auditoria só aponta peso e bagunça. |
| Three.js | Polir o 3D atual do duelo: self-host, só o necessário, FPS estável, modo leve automático. |
| Prioridade | 1º peso e carregamento, 2º fluidez do duelo, 3º acabamento visual. |
| Alvo mínimo | Notebook comum (vídeo integrado) + celular médio. Meta: 60 FPS no PC, 30+ no celular, lobby em < 3 s em 4G. |
| Artes | Gerar AVIF/WebP em 3 tamanhos no deploy, a partir de `card-forge/art-web`. Originais intactas. |
| Entrega | Este relatório primeiro; correções por fase, medindo antes e depois, com aprovação. |

## Medições (local, 127.0.0.1:8037, tamanho descomprimido)

**Lobby (Home):** 65 requisições, 3,5 MB.
- 1,7 MB de JPG em tamanho cheio usados como fundo pequeno (blocos da Home, dock do deck, carrossel). Ex.: `athena-v6-001.jpg` 311 KB para um ícone de 48 px.
- 1,3 MB de JSON: `card-forge/art-web/cards.json` 597 KB, `data/canon/d268.json` 343 KB, `data/card-projects.json` 182 KB, `card-layouts.json` 55 KB.
- 252 KB de JS em 27 módulos (ok).

**Duelo (`/playtest/divine/`):** 8,8 MB.
- `three.module.js` completo pela CDN jsdelivr: 1,24 MB (r160, sem tree-shaking). Se a CDN falhar, o duelo fica sem 3D.
- PNG/JPG pesados de moldura e HUD: `CARD-TEMPLATE/hades/frame_1.png` 1,24 MB, `frame_2.png` 783 KB, `athena-001-hud.jpg` 1,23 MB, `hades-001-hud.jpg` 1,04 MB, `divine/assets/god-frames/*.png` ~300 KB cada. Total de imagens: 5,4 MB.
- Os mesmos 1,3 MB de JSON do lobby são baixados de novo.
- `divine/app.js` 160 KB; `olympus.css` 117 KB.
- Dois `WebGLRenderer` (arena atrás das cartas, VFX na frente). As duas camadas são necessárias para o sanduíche com o DOM. Cada canvas tem 1792×1344 em tela retina.
- DOM: 907 nós, 147 `<img>`, heap de 10 MB. Ok.

**Servidor (produção):** gzip ligado, mas `cache-control: no-cache` em tudo (`apply-caddy-nocache.py`). Todo carregamento revalida cada arquivo, mesmo com `?v=` nas URLs.

**FPS:** não medido. O painel do navegador estava oculto e o `requestAnimationFrame` fica pausado. Medir na fase 2 com um trace de performance.

## Achados no código do duelo (`playtest/divine/scene.js`)

- A qualidade padrão é `high` (pixelRatio 1,75, 1.400 partículas, antialias), igual para todos os aparelhos. Existe contador de FPS no loop, mas ninguém usa para ajustar a qualidade.
- O loop desenha as duas cenas a 60 FPS o tempo todo, mesmo parado esperando jogada. Isso gasta bateria e esquenta notebook e celular.
- Boas práticas já presentes: pausa com aba oculta, tratamento de perda de contexto, `dispose`, presets low/medium/high/ultra.

## Plano por impacto

### Fase 1 — peso e carregamento (prioridade do autor)
1. **Artes em 3 tamanhos**: script de deploy gera `thumb` (~240 px), `card` (~512 px) e `zoom` (~1024 px) em AVIF/WebP a partir de `art-web`, mais um helper `artOf(id, size)`. Blocos, dock e listas usam `thumb`. Ganho esperado no lobby: −1,5 MB.
2. **Molduras e HUD em WebP**: `frame_*.png`, `*-hud.jpg` e `god-frames/*.png` de 5,4 MB para menos de 1 MB.
3. **Three.js próprio e enxuto**: build único (esbuild) só com as classes usadas, servido de `/playtest/vendor/`. 1,24 MB vira cerca de 300–400 KB, sem depender da CDN.
4. **Cache de verdade**: no Caddy, `immutable, max-age=1 ano` para JS/CSS/imagens com `?v=` e `no-cache` só no HTML. Visitas seguintes quase não baixam nada. Mexe no servidor, então precisa do sim do autor e do rebuild como root.
5. **JSON sob demanda**: checar se o duelo precisa de `card-projects.json` e `d268.json` inteiros. Carregar só na Coleção/Forge ou gerar um índice enxuto.

### Fase 2 — fluidez do duelo
6. **Qualidade automática**: começar em `medium` em celular ou aparelho com pouca memória e cair um nível se o FPS ficar abaixo de 50 por 3 s. A opção manual continua.
7. **Ócio a 30 FPS**: sem VFX nem tremor ativo, desenhar a 30 FPS. Volta a 60 no primeiro efeito.
8. Trace de performance numa partida inteira: travadas ao jogar carta, layout thrashing, picos de GC.

### Fase 3 — acabamento AAA (grill próprio depois das fases 1–2)
Tokens de movimento únicos, hover e zoom de carta consistentes, transições de tela, tipografia e estados vazios no padrão MTG Arena.

## Fase 1 — feito em 31/10/2026

| Página | Antes | Depois |
| --- | --- | --- |
| Lobby (Home) | 3,5 MB | 2,8 MB (imagens 2,0 → 1,2 MB) |
| Duelo | 8,8 MB | 4,3 MB (imagens 5,4 → 1,6 MB; Three.js 1,24 MB → 466 KB, 121 KB com gzip) |

- `tools/light-assets.py` gera as versões WebP. Rodar antes de cada deploy; é incremental.
  - `art-web/webp/` tem o lado maior até 1024 px. Os HUD de 2048 px viraram ~180 KB.
  - `art-web/thumb/` tem até 320 px.
  - `art-web/light.json` lista o que existe.
  - `.webp` ao lado de cada PNG do `CARD-TEMPLATE` e de `god-frames`.
  - Total: 86,5 MB → 34,8 MB.
- `shared/light-art.js`: `lightArt(url, size)` só troca a URL quando a versão leve existe. Arte nova ainda não convertida continua no JPG.
- O lobby usa `thumb` em avatares e listas do deck e `webp` no resto. O duelo usa `webp` em todas as artes do Forge.
- `shared/live-card.js` monta as peças da carta em `.webp`. Card Forge e Layout Studio continuam nos PNG originais.
- Three.js servido do próprio site (`playtest/divine/vendor/three-0.160.0-slim.js`), sem a CDN. Ao usar uma classe nova, recriar pela entrada `tools/three-slim.entry.js`.
- JSON: sem mudança. São ~194 KB com gzip e o jogo precisa de tudo. O ganho real vem do cache (item 4), que ainda espera o sim do autor para mexer no Caddy.

## Já corrigido nesta rodada
- A coluna implícita da `.lobby` crescia até a largura do carrossel (~1.470 px) e empurrava o PLAY para fora da tela em janelas menores. Corrigido em `playtest/home.css` com `.lobby { grid-template-columns: minmax(0, 1fr); }`.
