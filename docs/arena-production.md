# Arena Forge · Produção de arena (Palácio de Poseidon)

Data: 07/11/2026. Primeiro marco do "Art Direction, Artboard & 3D Production Pipeline". Tudo é local (STAR HILL). Nada foi publicado.

## Onde fica

Fica no mesmo Arena Forge, sem editor paralelo. São quatro abas:

| Aba | Rota | Arquivo |
| --- | --- | --- |
| Arenas | `#arenas` | `star-hill/arena-forge.js` |
| Texture Library | `#arenas/materiais` | `star-hill/material-studio.js` |
| Material Studio · Palácio de Poseidon | `#arenas/estudio` | `star-hill/material-studio.js`, que inclui o Painterly Material Inspector |
| Produção · Artboard | `#arenas/producao` | `star-hill/arena-production.js` (novo) |

- **Backend:** `card-forge/arena_production.py` (novo), com as rotas `/api/star-hill/producao*` em `card-forge/star_hill.py`.
- **Projeto:** `data/arena-production/poseidon-palace.json`.
- **Arquivos enviados:** `playtest/assets/arena-production/poseidon-palace/<pasta>/`. Essa pasta fica no `.gitignore`.
- **Nomes dos arquivos:** levam o sha256 do conteúdo, então uma nova versão nunca sobrescreve a anterior.

## O que funciona (testado)

### Pipeline de 12 etapas
- Etapas: Concept → Art Direction → Master Artboard → Asset Breakdown → Asset Production → Material Production → Scene Assembly → Visual Matching → Gameplay Preview → Validation → Approval → Publication.
- Cada etapa tem status, versão e histórico (data, de → para).
- Publication não aceita "concluída" nem "aprovada", nem na tela nem no servidor. O deploy é separado e depende do autor.

### Camera Composition Template
- É medido no jogo real. Um iframe da partida a 1600×900 lê a câmera de `scene.composition()`: FOV 42, posição (0, 13.5, 13), lookAt (0, 0, −0.6), somente leitura.
- **O que o template mede:**
  - a faixa do cenário de fundo;
  - o horizonte;
  - a silhueta do campo de 16 m e do piso opaco, projetadas com a mesma câmera;
  - os retângulos reais do HUD.
- **Zonas do HUD:**
  - Protegidas: campo, deuses, mãos.
  - HUD: barra lateral, relógio, turno, botão de ação.
- Gera um PNG 3840×2160 (`docs/img/arena-production/camera-composition-template.png`) e o JSON. Os dois ficam no projeto e podem ser baixados.
- **O que a medição mostrou:**
  - A arquitetura ocupa de −0,01 a 0,27 da altura da tela.
  - Essa faixa cruza a mão e o retrato do deus do oponente. Por isso o frontão fica coberto na partida.
  - O horizonte fica fora da tela (y = −0,79), porque a câmera olha para baixo, a cerca de 45°.

### Master Artboard Studio
- Importa PNG, JPG ou WEBP. O servidor valida pela assinatura do arquivo, não pela extensão.
- Cada importação cria uma versão nova (V1, V2…). Avisa se a imagem não é 16:9.
- **Aprovar e congelar:** depois de aprovado, o servidor recusa mudar o arquivo, mudar as anotações ou apagar o artboard. Uma correção vira uma nova versão.
- Anotações por clique.
- Overlay do template, com opacidade ajustável.
- Referências importadas.

### Artboard Match
- Modos: Artboard, Jogo (iframe real com o template por cima), Lado a lado (divisor), Sobrepor (opacidade) e Diferença (`mix-blend-mode: difference`).
- O render 3D vem de `scene.snapshot()`, na câmera competitiva e sem HUD. Pode ser guardado como referência.
- Checklist de fidelidade com 12 itens por artboard.

### Asset Breakdown
- 33 assets reais do palácio, nas 6 categorias, com as coordenadas de `arena-forge/poseidon-palace.js`.
- Campos de cada asset: id, nome, categoria, região no artboard, dimensões, posição, escala, material, LOD, estado (reference → approval), dependências, GLB, miniatura, versão e nota.
- **Na tela:**
  - Marcar uma região arrastando sobre o artboard.
  - Recortar a miniatura da região.
  - Importar um GLB. O servidor exige glTF binário 2.0 com o tamanho declarado igual ao do arquivo.
  - Criar um asset novo.
  - Apagar um asset. A tela bloqueia se outro asset depender dele.
- Cada asset marca se usa GLB ou geometria procedural.

### Materiais da arena
POSEIDON_WHITE_MARBLE, BLUE_MARBLE, ANCIENT_GOLD, LIMESTONE, SEABED_ROCK, OCEAN_CEILING e CEREMONIAL_FLOOR.
- Cada um tem cor base, roughness e metalness editáveis.
- Cada um aponta para o PBR de origem na Texture Library.

### Painterly Material Inspector (no Material Studio)
- Liga e desliga o estilo pintado.
- Presets PAINTERLY ATHENA, POSEIDON, HADES, ARES e ARTEMIS.
- 9 sliders e 3 cores.
- Salva em `projetos['poseidon-palace-pbr-v1'].painterly` e volta ao reabrir. Entra no desfazer.

### Scene Manifest
Fica em `/api/star-hill/producao/manifesto`. Inclui:
- a câmera (somente leitura);
- o módulo da cena e o estilo;
- o artboard aprovado;
- os assets por categoria;
- materiais, luzes e efeitos;
- perfis phone, low, medium, high e ultra (feixes e cáusticas);
- zonas protegidas e dependências.

### Pacote ZIP
- **Exportar:** `/api/star-hill/producao/exportar`. O pacote leva:
  - as pastas `artboards/`, `references/`, `assets/`, `materials/`, `textures/`, `shaders/`, `animations/`, `thumbnails/`, `manifests/` e `reports/`;
  - `project.json`;
  - o relatório de exportação.
- **Reimportar:** pela tela. Mantém os ids e devolve os arquivos ao lugar.
- **Proteções na reimportação:** recusa path traversal, ZIP corrompido, arquivo que não é imagem nem GLB e pacote acima de 200 MB descompactado.

## Testes

| Arquivo | O que cobre | Resultado |
| --- | --- | --- |
| `tools/test-arena-production.py` | Backend, numa pasta temporária | 29 ok |
| `tools/test-arena-production-ui.py` | Fluxo real na tela, com Playwright: template, artboard, anotação, região, miniatura, aprovar e congelar, render, comparação, manifesto, ZIP. Desfaz o que fez. | 13 ok |
| `tools/test-painterly-inspector.py` | Preset, slider, liga e desliga, salvar, reabrir | 6 ok |
| `tools/test-material-studio.py` | Texture Library, sem regressão | 26 ok |

- **Console:** só aparecem `404 /api/presence` e `404 /api/friends`. São recursos online do jogo que o servidor local não tem, e não vêm deste trabalho.
- **Screenshots:** ficam em `docs/img/arena-production/`.

## Limitações reais

- O artboard usado no teste é um render do próprio palácio. Ainda não existe concept art aprovado pelo autor. A etapa Concept está "pendente".
- Nada converte pintura em 3D. O artboard é referência, e o cenário jogável continua sendo `arena-forge/poseidon-palace.js`, procedural.
- **GLB importado:** fica registrado e validado, mas a cena ainda não carrega GLB. O build enxuto do Three.js no jogo não tem GLTFLoader.
- **Scene Manifest:** o jogo ainda não lê o manifesto. Ele lê o módulo da cena direto. Ligar os dois exige publicar o manifesto como arquivo estático junto do jogo.
- Não há gizmos de posicionamento (Scene Builder). Posição e escala são editadas por número.
- Não há bloom nem pós-processamento: o build enxuto não tem EffectComposer. O grading é feito nos materiais e nas luzes.
- **No Material Studio:** os materiais PBR aplicados substituem os do palácio e não recebem o tratamento pintado.
- **Asset "Statues":** escultura humana precisa de um GLB modelado fora. Não será feita com primitivas.
- **Na partida:** o frontão fica coberto pela mão e pelo deus do oponente. O template agora mede isso. A solução é de composição (escala ou altura do fundo) e precisa da decisão do autor.

## Próximos passos

1. Importar o concept aprovado do autor como Master Artboard V1. Depois, marcar as regiões e aprovar.
2. Decidir a composição do fundo com o template: tirar o frontão da zona do oponente.
3. Carregar GLB na cena (GLTFLoader só no modo de produção) e trocar Rocks e Statues.
4. Publicar o manifesto como arquivo estático e fazer o jogo ler `painterly` e os perfis dele.

## Immersive World & Cinematic Transition V1 (07/11/2026)

Esta seção atualiza as limitações acima sobre o frontão coberto: o palácio deixou de ser fundo da câmera competitiva. A regra completa está em `docs/art-bible/SSTCG_VISUAL_UNIVERSE_BIBLE_V1.md`, seção 12.

### Mundo
- Ambiente e campo ficam numa cena só, nas mesmas coordenadas. Saíram a câmera de fundo e a camada separada.
- O palácio fica em grupos: `DistantEnvironment`, `LandmarkArchitecture`, `BattlefieldEnvironment`, `EnvironmentalProps`, `LightingRig` e `AtmosphericFX`.
- O leito marinho é um anel em volta do campo, e o céu é um domo 3D.

### Moldura do campo
Fica em `BattlefieldEnvironment`:
- balaustrada em r = 17,3 m, com vão no eixo da escadaria;
- colunata em r = 19,4 m, com colunas partidas e lintéis;
- quatro braseiros de ouro;
- caminho processional até o primeiro degrau.

No preview, o piso tem anéis de ouro antigo.

### Câmera cinematográfica
- É uma `cineCam` separada. A câmera competitiva não é tocada.
- As chaves ficam em `arena-forge/cinematics/poseidon.json`.
- A abertura padrão tem 6 chaves e dura 9,4 s.
- **API:** `scene.cinematic(keys)`, `skipCinematic()`, `poseCinematic(key|null)` e `cinematicKeys`.
- **Editor:** Produção → **Cinemática**. Permite:
  - ver cada chave no jogo real;
  - editar posição, ponto focal, FOV, roll, duração, easing, luz, VFX e som;
  - reordenar, duplicar e remover chaves;
  - tocar e pular;
  - salvar, com validação no servidor;
  - gerar o storyboard da câmera real como artboard do tipo Storyboard.
- Os artboards agora têm tipo: Battlefield, Cinematic ou Storyboard.

### Testes
| Teste | Resultado |
| --- | --- |
| `tools/test-arena-production.py` | 39 ok, 10 deles da cinemática |
| `tools/test-cinematic-editor.py` | 7 ok |
| `tools/capture-poseidon-cinematic.py` | Abertura real, pular, reduzir movimento, partida, celular e bench. Capturas em `docs/img/arena-cinematic/`. |

### Limites
- A chave GOD REVEAL só mexe na câmera. Os retratos dos deuses são HUD e aparecem com a mesa, depois do cara ou coroa.
- O campo "som" é guardado, mas a abertura ainda não toca áudio.
- A moldura é procedural: primitivas com material pintado. Estátuas e rochas finais ainda dependem de GLB.
