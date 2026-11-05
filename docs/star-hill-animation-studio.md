# STAR HILL: Animation Studio

Pedido do autor em 05/11/2026. Reorganiza a área de Animações sem remover função nem mudar dado, ID ou motor.

## Inventário técnico

### Dados

| Arquivo | Conteúdo | Quem lê na partida |
| --- | --- | --- |
| `data/card-animations.json` | Momentos e linhas por carta, facção e `padrao`, mais `efeitos`, `particulas`, `css`, `moeda` e `ceu` | Local lê este; online lê `card-animations.publicado.json` |
| `data/vfx-studio.json` | Living Card por carta, holográfico por raridade e composições | Local lê este; online lê `vfx-studio.publicado.json` |
| `data/vfx-catalog.json` | Fontes e efeitos importados, com receita e coreografia em rascunho | Mesmo arquivo nos dois: não tem cópia publicada |
| `data/vfx-inventario.json` | 239 animações registradas, gerado por `tools/vfx-inventario.py` | Só o painel |
| `data/vfx-historico/` | Uma cópia por versão publicada | Restauração |

Cascata de momento: linha da habilidade, carta, facção, padrão. `false` desliga de propósito.

### Motores reais

| Motor | Renderiza | Pausa | Velocidade | Seek | Loop |
| --- | --- | --- | --- | --- | --- |
| `playtest/divine/pixel-vfx.js` | Sprite Fusion, sprite sheets e receitas em canvas | Só global | Por item | Não | Sim, limitado a 3 s |
| `shared/vfx/composer.js` | Camadas no palco | Não, só parar | Shader e Lottie | Não | Só Lottie |
| `playtest/divine/director.js` | Sequência dos eventos e coreografia | Não | Sim | Não | Não |
| `playtest/divine/scene.js` | Arena WebGL | Não encontrada | Não encontrada | Não | Laço próprio |
| `shared/anim-css-adapter.js` | `@keyframes` legados | Não | `playbackRate` | Não | O do CSS |
| `shared/vfx/shader-fx.js`, `card-mount.js` | Shader e holográfico sobre a carta | Só fora da tela | Sim | Não | Contínuo |
| `playtest/divine/preview-clock.js` | Relógio da mesa do Criador | Sim, global | Sim | Só avança | Não |

### Campos que o Composer honra

- **carta:** duração, x, y, escala, rotação, opacidade, easing
- **camera:** duração, x, y, escala, easing
- **shader:** duração, shader, alvo, força, velocidade, cor
- **particulas:** efeito, cor, escala. Duração não corta o efeito.
- **lottie:** duração, lottie, alvo, velocidade, loop
- **audio:** som, volume. Duração não corta o som.
- **ui:** duração, alvo, cor, opacidade

### VFX Forge e Sprite Fusion

- **VFX Forge:** `shared/anim-request.js` pede a geração, `card-forge/vfx_generate.py` roda o gerador local, `tools/vfx-criar.mjs` entrega e `card-forge/vfx_import.py` grava como rascunho. O ciclo é testado, aprovado e publicado.
- **Sprite Fusion:** código ao vivo em `playtest/divine/vendor/sprite-fusion`. A receita salva não gera arquivo.

## Navegação

Toda aba antiga continua com o mesmo id.

| Espaço | Seções |
| --- | --- |
| Visão geral | Resumo (novo), Publicação |
| Biblioteca | Catálogo (novo), Inventário, Importar e ajustar, Partículas, Interface, Céu e moeda |
| Por carta | Por carta, Por facção, Padrões |
| Composer | Composer, Sprite Fusion, Combate, Holográficos |
| Arena de testes | Mesa real (o antigo Criador) |

## Situação das etapas

| Etapa | Situação |
| --- | --- |
| 1. Auditoria e inventário | Feita |
| 2. Navegação e biblioteca | Feita |
| 3. Painéis de seleção, propriedades e preview | Parcial: Por carta tem dois painéis, sem redimensionar |
| 4. Composer e timeline | Feita |
| 5. Arena de testes e publicação | Feita |
| 6. Migração e validação | Parcial |

## O que o renderer ainda não suporta

Estes itens do pedido exigem mudar o motor antes de aparecer na interface, para não haver controle sem efeito:

| Item | Hoje |
| --- | --- |
| Keyframes | Não: três pontos fixos |
| Scrub (pular para um ponto) no Composer | Não: os motores só tocam do início. Há pausa real |
| Easing em toda camada | Só carta e camera |
| Posição em toda camada | Só carta e camera |
| Opacidade em toda camada | Só carta e ui |
| Duração em partículas e áudio | Não corta: o efeito dura o que a folha de sprites dura e o som vai até o fim. O painel avisa |
| Reordenar camadas | Só decide quem desenha por cima e qual shader entra quando o perfil limita; o tempo vem de Início |
| Última edição por efeito | Não há data salva, então a Biblioteca não ordena por ela |

## Riscos conhecidos

- O catálogo não tem versão: restaurar uma publicação não o reverte.
- Os avisos dizem que "Publicar no site" leva as animações ao jogo online, mas `tools/publish-site.sh` não cita esses arquivos. Falta confirmar qual deploy leva os `*.publicado.json`.

## Arena de testes (05/11/2026)

Em Arena de testes > Cenários, cada cenário toca na mesa real do jogo (`?demo=criador`) com os vínculos reais da carta. Nada é gravado: os eventos são só de apresentação e a mesa volta ao estado real.

| Cenário | Como toca |
| --- | --- |
| Carta em repouso e Inspeção | Mesa real, com o shader da carta |
| Coleção | Mesmo montador e cálculo da coleção; só o holográfico reage ao cursor. Não abre a tela de coleção do jogo |
| Entrada, Ataque, Dano, Golpe no Deus, Habilidade, Morte ou remoção | Eventos reais do director |
| Defesa | Dano prevenido: o jogo não tem evento de defesa próprio |

Rascunho e Publicada usam a mesa com ou sem `?publicado=1`, e a tabela de cada cenário mostra os dois lado a lado, com a origem do efeito: carta, linha, facção, padrão ou raridade. Limite: `data/vfx-catalog.json` não tem cópia publicada, então a Publicada usa o catálogo atual.



Quatro painéis redimensionáveis: camadas à esquerda, palco no centro, propriedades à direita e linha do tempo embaixo. Abaixo de 1000 px eles empilham.

- **Rascunho:** tudo fica em memória até Salvar. Prévia, velocidade e zoom nunca entram no arquivo.
- **Linha do tempo:** arrastar move, a alça muda a duração e a marca escura muda o auge. Setas movem 50 ms, Shift 250 ms e Alt muda a duração.
- **Transporte:** tocar do início, pausar e retomar de verdade em cada motor (timers, animações, Lottie, áudio, shader e sprites), loop, velocidade de 0,25× a 2× e prévia ao editar.
- **Desfazer e refazer:** Cmd+Z, Cmd+Shift+Z, os botões e o menu do app valem para o rascunho aberto.
- **Versões:** cada Salvar ou Excluir guarda o que estava antes em `data/vfx-composicoes-versoes.json`, até 20 por composição. Abrir uma versão cria um rascunho; só Salvar a torna atual. Esse arquivo não é lido pela partida.
- **Receitas:** Flash, Tremor e Recuo adicionam camadas comuns já preenchidas, editáveis como as outras.
- **Id:** composição nova com nome repetido ganha sufixo e não sobrescreve a antiga.
- **Confirmações:** `star-hill/confirmar.js` substitui `confirm()`, que o app do macOS responde com "não" sem mostrar nada. A Publicação também usa. Card Forge ainda tem `confirm` e `alert` nessa situação.

## Correção de 05/11/2026: menus sem resposta

Ao abrir uma carta em Por carta, a página inteira parava de responder no app. `shared/live-card.css` não era carregado, e a imagem da carta de prévia ficava solta por cima da página, recebendo todos os cliques. Só acontecia no WebKit do macOS. A prévia agora carrega o CSS, usa a arte de `card-forge/art-web` e fica contida em `.cx-live`.
