> **HISTÓRICO V1:** guia substituído por [SSTCG_VISUAL_UNIVERSE_BIBLE_V2.md](SSTCG_VISUAL_UNIVERSE_BIBLE_V2.md). A V2 rege cinematics, battlefield e composição.

# SSTCG — VISUAL UNIVERSE BIBLE V1.0
## Painterly Cinematic 3D · Canonical Art Direction · 2026-11-07
**Status:** direção artística aprovada; guia de produção. **Piloto:** Poseidon — Fortaleza Submarina.
**Escopo imediato:** Arena Forge e arenas de combate. HUD, molduras, menus e demais interfaces devem futuramente herdar a linguagem, mas não são redesenhados nesta etapa.

### 0. Princípio obrigatório
**O jogo deve parecer uma ilustração épica viva, não um protótipo Three.js nem uma fotografia 3D.**
A identidade combina volumes e profundidade 3D, textura hand-painted, luzes dirigidas como numa animação, silhuetas clássicas de Saint Seiya e composição competitiva rigorosamente legível.
Arcane/Fortiche é referência de técnica pictórica, **não licença para copiar personagens, ambientes ou assets**. A identidade do SSTCG deve permanecer própria.

### 1. Arquivo de referência e autoridade
Arte piloto aprovada na conversa: **POSEIDON_MASTER_ARTBOARD**, render horizontal de **1656 × 950**.
Arquivo esperado no projeto: `docs/art-bible/references/poseidon-master-artboard.jpg`.
A cópia só deve ser considerada instalada depois de sua existência e hash serem verificados no repositório.
A versão original aprovada nunca deve ser sobrescrita. Criar `revision-02`, `revision-03` etc.
**A referência é o objetivo visual**, não um GLB, não é um diffuse único para o piso, não contém profundidade real.
Uma única pintura não permite reconstrução 3D exata sob todos os ângulos. A câmera fixa do jogo é a meta de matching.

### 2. A composição da partida é a fonte da verdade
Câmera competitiva atual (confirmar no código antes de trabalhar): PerspectiveCamera 42°, `position(0,13.5,13)`, `lookAt(0,0,-0.6)`, plataforma circular raio ~16.
**PROIBIDO:** mexer na câmera para fazer o cenário encaixar; modificar posições de cartas, áreas clicáveis, lógica ou HUD.
**OBRIGATÓRIO:** renderizar um screenshot real do jogo e extrair por projeção as zonas em pixels antes de criar o concept. Usar projeção real de `THREE.Vector3.project(camera)`.
A arte principal deve ser desenhada sobre template `camera-lock` (mesma razão de aspecto e FOV do jogo); nunca usar a vista frontal do templo como Master Artboard.
Camadas de composição em tela:
- Primeiríssimo plano e laterais: ornamentação, colunas recortadas pela moldura, rochas, sem tapar UI.
- Centro inferior / intermediário: pista oval/circular em perspectiva, calma sob cartas, de preferência a maior área aberta.
- ~~Topo central: escadaria reduzida pela perspectiva e palácio reconhecível, entre as áreas dos elementos de HUD.~~ **Substituído pela seção 12 (07/11/2026):** a câmera competitiva não enquadra o templo; ele aparece na cinemática.
- Muito ao fundo: grande Pilar Principal, colunas distantes, abismo e o teto oceânico.
Não colocar fachadas inteiras em 3D fora do frustum; validar cada `boundingBox` com frustum + sobreposição de tela.

### 3. Linguagem pictórica (obrigatória)
1. **Silhueta:** arquitetura monumental, formas reconhecíveis, frontões simétricos, escalas heróicas.
2. **Cor:** temperatura fria dominante + pontos de luz quente com intenção; nunca overlay azul global.
3. **Materiais:** hand-painted albedo de verdade, pequenas variações de pigmento, direcionalidade de pincel, bordas com desgaste intencional; PBR usado para volume, não para substituição estética.
4. **Luz:** key, fill e rim artísticos; volumes legíveis; sombras de contato onde a pedra toca pedra; não inundar tudo de bloom.
5. **Atmosfera:** primeiro, segundo e terceiro planos separados por contraste, saturação, nitidez e haze, com partículas controladas.
6. **Detalhe:** maior nas silhuetas e peças principais; progressivamente menor na zona de cartas.
7. **Movimento:** aquático lento, luz filtrada, partículas discretas. Nada de vibração incessante, flashes ou repetição visível.

### 4. Material Bible
Em cada material, registrar: `id`, `source`, `license`, `version`, `handPaintedMap`, `normal`, `roughness`, `metalness`, `brushScale`, `brushIntensity`, `pigmentVariation`, `causticStrength`, `LOD`, `colorSpace`.
Materiais marcantes por facção:
- Athena: marfim, ouro solar, azul-celeste, rocha sagrada; luz limpa heroica.
- Poseidon: mármore branco frio, azul-petróleo profundo, turquesa cintilante, ouro antigo; cáusticas suaves.
- Hades: basalto, preto-violeta, bronze escurecido, brilho espectral desaturado; névoa pesada.
- Ares: ferro gasto, bronze queimado, vermelho de brasa, pedra vulcânica; sombras afiadas.
- Artemis: prata pálida, verde pinheiro, azul-luar, pedra lunar; neblina fina e recortes de lua.
Evitar reaproveitar o mesmo ruído procedural como substituto universal de todas as texturas.

### 5. Poseidon — cena piloto oficial
**Tema:** Fortaleza Submarina original de Saint Seiya, em reino respirável sob oceano suspenso.
- Piso: campo circular de mármore azul-claro com textura pintada e anéis dourados, discreto tridente no centro, reflexos aquáticos controlados.
- Borda: padrão de ondas grego-marinhas douradas de boa leitura e escala.
- Fachada: templo de mármore branco, duas alas simétricas de colunas, escadaria larga, frontão triangular nivelado, brasão/tridente dourado.
- Pórtico: colunas encostadas estruturalmente no entablamento, sombra entre aberturas, porta recuada escura.
- Ornamentação: duas esculturas divinas ou guardiões marinhos sob direção aprovada; GLB de qualidade, não bonecos com esferas e cilindros.
- Grande Pilar: colossal e imediatamente reconhecível, mais desaturado pela distância.
- Teto: superfície oceânica suspensa com luz de cima e deformações azuis desenhadas em faixas; não inundar o palácio.
- Laterais: rochedos e colunas em recorte pictórico.
- Paleta: navy `#092236`, teal `#0f526b`, turquesa `#5ac8dd`, marfim `#e8e7df`, ouro antigo `#d7ac63` (valores iniciais; calibrar pelo Master Artboard).
**Negativos:** Atlântida genérica, corais em todas as paredes, azul saturado uniforme, templo minúsculo perdido, piso completamente vazio sem acabamento, ornamentos embaixo de cartas dominantes, HDR fotográfico, plástico.

### 6. Pipeline de construção — o que pode ou não ser automatizado
**Fase A — Camera lock:** capturar screenshot do jogo sem HUD e com overlays das zonas protegidas; produzir `camera-manifest.json` com frustum, projeções e máscaras.
**Fase B — Master Artboard:** imagem de referência aprovada (imutável, com dimensões originais) + versão no enquadramento exato do jogo. Conferir enquadramento antes da produção.
**Fase C — Breakdown:** dividir em regiões sem confundir pintura e malha. Planejar uma camada para fundo 2.5D, outra de arquitetura 3D, outra do piso e outra de FX.
**Fase D — Asset Sheet:** cada elemento terá ID, miniatura/crop de referência, vista frontal/lateral/superior quando necessária, scale, pivô, material e arquivo GLB.
**Fase E — Build:** produzir geometria paramétrica onde apropriado; importar modelagem GLB para detalhes complexos; criar texturas hand-painted realmente diferentes e UVs corretas.
**Fase F — Scene match:** sobrepor render real e master artboard; corrigir transforms, luz, composição e cores. Não inventar “97% de fidelidade” sem métricas.
**Fase G — Integration:** manifest único; jogo e Arena Forge renderizam o MESMO asset pack; teste em partida completa; developer-only até aprovado.
**Fase H — Performance:** mobile/low/medium/high/ultra, LOD, instancing, compressed textures, reduced motion, caches e benchmarks.
Se o artboard for só um JPEG com a cena inteira, o primeiro protótipo pode usar matte painting 2.5D ao fundo e geometria real por cima, mas NÃO fingir que toda a imagem se tornou 3D.

### 7. Inventory inicial de Poseidon
| Asset ID | Elemento | Tecnologia | Prioridade |
|---|---|---|---|
| POS-FLR-001 | Piso oval/circular | geometry + painted PBR | P0 |
| POS-FLR-002 | Anéis e ondas douradas | geometry/decal atlas | P0 |
| POS-ARC-001 | Palácio central | modular GLB | P0 |
| POS-ARC-002 | Escadaria | parametric mesh + painted material | P0 |
| POS-ARC-003 | Colunas e capitéis | GLB + instancing | P0 |
| POS-ARC-004 | Frontão e frisos | GLB | P0 |
| POS-MON-001 | Grande Pilar Principal | mesh + painterly shader | P0 |
| POS-ENV-001 | Teto oceânico | layered shader | P0 |
| POS-ENV-002 | Abismo e pilares longínquos | matte-painting 2.5D | P1 |
| POS-MON-002 | Guardiões / esculturas | custom GLB | P1 |
| POS-FX-001 | Cáusticas aquáticas | projected/shader | P1 |
| POS-FX-002 | Raios e partículas | VFX Forge | P1 |
| POS-ENV-003 | Rochas de enquadramento | low-poly painterly GLB | P1 |
| POS-DEC-001 | Estandartes tridente | optional painterly mesh | P2 |

### 8. Mundo inteiro coerente
Cada facção varia **arquitetura, materiais, clima, símbolos e luz**; todas compartilham:
- mesmo sistema de câmera e zonas,
- mesma gramática de brushwork e detalhe,
- proporções de ornamentação e legibilidade,
- mesmo pipeline e qualidade de assets,
- mesmo formato de manifest e validação.
Nada de uma facção superrealista, outra cartoon e outra com assets genéricos de Marketplace sem adaptação.
A arte original de Saint Seiya governa iconografia e reconhecibilidade de cada cenário.

### 9. Critérios visuais de aprovação
- ~~A screenshot da partida apresenta o templo identificado em poucos segundos.~~ **Seção 12:** a cinemática apresenta o templo; a partida mostra o campo emoldurado pelo ambiente da facção.
- A câmera NÃO mudou e nenhuma carta/HUD foi reposicionada.
- A arquitetura tem encaixes corretos e silhueta limpa.
- O material parece pintado à mão, não só um shader de ruído.
- A cena mantém atenção na jogabilidade, não concorre com as cartas.
- Artboard e captura do jogo têm composição compatível (comparação lado-a-lado).
- Testes de desktop/mobile e redução de movimento documentados.
- Nenhuma publicação no jogo oficial sem aprovação.

### 10. Entregáveis exigidos ao Claude
1. `POSEIDON_MASTER_ARTBOARD` fixado em references, com hash e provenance.
2. `camera-manifest.json` capturado da engine.
3. `poseidon-breakdown.json` + contact sheet com crops e classificações.
4. `poseidon-scene-manifest.json` com assets referenciados e status real.
5. `materials/`, `models/`, `fx/`, `previews/` separados.
6. Capturas `artboard`, `game-render`, `overlay`, `mobile`.
7. Benchmark e relatório de diferenças visuais.
8. URL de preview de desenvolvimento; **sem deploy oficial**.

### 11. Regra de honestidade de produção
Nunca chamar um placeholder de asset final. Nunca dizer que modelos 3D surgiram de um único JPEG sem pipeline real. Nunca chamar “aprovado” sem aprovação do autor. Nunca afirmar que um arquivo foi copiado para a pasta se ele não existir lá. A qualidade final será aprovada pelo usuário comparando imagem e jogo.

### 12. Immersive World & Cinematic Transition (regra canônica, 07/11/2026)
Toda arena é um **mundo 3D contínuo**: cenário monumental + campo de batalha integrado ao ambiente, nas mesmas coordenadas. **Não tentar enquadrar o templo inteiro na câmera competitiva.**

**Duas câmeras, uma cena** (`playtest/divine/scene.js`):
- **Competitive Camera** — PerspectiveCamera 42°, `(0,13.5,13)` → `(0,0,-0.6)`. Bloqueada no gameplay; cartas e HUD não mudam.
- **Cinematic Camera** — câmera própria (`cineCam`) da abertura, por keyframes: posição, ponto focal (rotação), roll, FOV, duração, easing (linear, easeIn, easeOut, easeInOut), luz, VFX (dust, shockwave, flash) e som ambiente (campo existe; tocar depende de arquivo de áudio). Caminho Catmull-Rom entre chaves. A **última chave é a câmera competitiva exata** (o servidor recusa outra), então a volta ao jogo não tem salto nem mudança de escala. Pular (toque/tecla) termina na competitiva; reduzir movimento = corte direto, sem cinemática.

**Sequência de abertura:** ESTABLISHING SHOT → ENVIRONMENT REVEAL → CAMERA TRAVEL → BATTLEFIELD ARRIVAL → GOD REVEAL → GAMEPLAY START. Na partida: cinemática → tela escurece → cara ou coroa → mesa.

**Grupos da cena** (todo ambiente segue esta estrutura): `WorldRoot` › `DistantEnvironment` (leito, céu, pilares distantes) · `LandmarkArchitecture` (templo, escadaria, alas) · `BattlefieldEnvironment` (moldura do campo) · `EnvironmentalProps` (rochas) · `LightingRig` · `AtmosphericFX` (oceano, feixes, sombras de contato); `CinematicCameraRig` (cineCam) e `GameplayScene` (campo protegido) ficam no `scene.js`. Sem fundo 2.5D: céu é domo 3D; matte painting distante só com parallax correto.

**Environment Framing:** a área jogável (r = 16) é fixa. Em volta, cada facção monta sua moldura 3D coerente (colunas, árvores, rochas, ruínas, balaustradas, muros, estátuas, raízes, fragmentos, construções, luz, atmosfera) — moldura natural, nunca barreira uniforme. Na câmera competitiva ela aparece nas laterais e cantos superiores; não cobre cartas.

**Poseidon (piloto):** A. PALACE REVEAL (palácio, Grande Pilar, oceano suspenso, escadaria) → B. TRANSITION (a câmera desce pelo eixo da escadaria até a plataforma) → C. BATTLEFIELD (competitiva). Moldura: balaustrada de mármore em r = 17,3 com vão no eixo da escadaria, colunata em r = 19,4 com colunas partidas e lintéis caídos, braseiros de ouro com chama turquesa, rochas submarinas, luz oceânica. Piso pictórico com anéis de ouro antigo e cáusticas suaves.

**Pipeline de artboards (Arena Forge → Produção):** cada arena exige, com referência aprovada por etapa:
1. **Cinematic Artboard** — o mundo na câmera de apresentação.
2. **Battlefield Artboard** — o campo emoldurado, desenhado sobre o Camera Composition Template da câmera competitiva.
3. **Camera Transition Storyboard** — quadros da câmera real por chave (botão "Gerar storyboard").
4. **Asset Breakdown** · 5. **Scene Manifest** · 6. **Visual Matching** (artboard × render).

Arquivos: chaves em `arena-forge/cinematics/<arena>.json` (editadas na aba Cinemática; o jogo lê o mesmo arquivo); projeto em `data/arena-production/<arena>.json`.
