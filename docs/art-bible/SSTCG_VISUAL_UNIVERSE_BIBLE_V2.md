# SSTCG — VISUAL UNIVERSE BIBLE V2.0
## Painterly Cinematic 3D · Immersive Worlds · Canonical Art Direction
**Data:** 2026-11-07 · **Direção aprovada:** mundo tridimensional contínuo + apresentação cinematográfica + combate imersivo · **Piloto:** Poseidon.
**Fonte de verdade:** este arquivo substitui as exigências de composição da V1. A V1 permanece como histórico, não como instrução vigente.
**Escopo agora:** Arena Forge, cinematics e environments. O mesmo estilo orientará HUD, frames, menus, loja e Codex em fases posteriores, sem redesenhá-los nesta entrega.

## 0. A regra central do universo
**Não são tabuleiros tematizados. São locais mitológicos reais nos quais a batalha acontece.**
Uma partida tem dois momentos: a **cinemática apresenta o lugar** (templo, reino, monumento ou cenário), e a **câmera competitiva entra no campo**. Durante a batalha, a imersão vem da moldura ambiental, dos materiais, da arquitetura próxima, dos sons e dos efeitos — não de tentar espremer o templo inteiro no topo da tela.
Todo o mundo existe em uma cena Three.js coordenada e pode ser visitado por câmeras diferentes. Composição 2.5D é permitida exclusivamente em elementos distantes que não denunciem parallax durante as trajetórias cinematicamente aprovadas.

## 1. Direção artística canônica — Painterly Cinematic 3D
- Geometria 3D sólida com silhuetas heroicas e proporções mitológicas.
- Texturas **realmente pintadas à mão**; pinceladas direcionais, pigmento e arestas artisticamente tratadas; shaders procedurais são complementos, não substitutos de produção de textura.
- Iluminação narrativa em chave, preenchimento, recorte, zonas quentes e frias; sombra de contato; profundidade atmosférica.
- Materiais PBR estilizados, não fotografia hiperrealista nem plástico/low-poly genérico.
- Movimento ambiental sutil, com versões sem animação e sem flashes.
- Arcane/Fortiche como referência de técnica visual híbrida, sem copiar cenários, personagens ou propriedade intelectual alheia.
- Cada facção tem identidade própria, mas todas compartilham qualidade de acabamento, tratamento pictórico, escala e legibilidade.

## 2. Gramática cinematográfica — um mundo, duas câmeras
### 2.1 Cinematic Camera — livre e roteirizada
Câmera independente da competição, que revela o local: establishing shot → landmark reveal → travelling/descida → chegada ao campo → revelação dos Deuses → começo da partida.
A câmera usa keyframes editáveis: posição, lookAt/rotação, FOV, easing, duração, foco e eventos ambientais.
Movimento deve ser contínuo e espacialmente coerente no MESMO WorldRoot; proibir teleportes visuais não intencionais. Nunca mexer na matriz canônica da câmera competitiva.
### 2.2 Competitive Camera — LOCK
Referência atual a confirmar no runtime: `PerspectiveCamera(42°)`, posição `(0,13.5,13)`, alvo `(0,0,-0.6)`, raio jogável ~16.
Durante combate, câmera e posições de cartas, HUD, zonas de clique e mecânicas permanecem invariáveis.
A câmera cinematográfica termina **exatamente** na pose competitiva, sem salto de perspectiva.
### 2.3 Skip, mobile e acessibilidade
Pular deve levar imediatamente à câmera competitiva, limpar estados transitórios e liberar o jogo sem duplicar callbacks, músicas ou VFX.
Reduced motion deve usar sequência encurtada ou corte com fade não piscante; modo mobile pode usar roteiro mais leve. O controle da partida nunca depende da cinemática.
### 2.4 Transição no mesmo cenário
Os mesmos assets devem existir durante a abertura e durante a partida. Para arquitetura só vista no establishing shot, permitir LOD e descarregamento após a chegada, sem popping visível no campo.
Áudio espacial, quando implementado, deve descrever o lugar; música e som não são condição para jogar.

## 3. O Battlefield — moldura ambiental, nunca barreira genérica
O centro precisa permanecer claro e pouco detalhado para cartas e efeitos. A área jogável é protegida.
Ao redor, compor **recortes naturais do local**: colunas ou colunatas reais, bases, ruínas, raízes, árvores, rochas, penhascos, escadarias, arcos, balaustradas ou estátuas, conforme a geografia.
Não repetir uma parede circular de primitivas em todas as facções. A moldura deve ter continuidade física e plausibilidade arquitetônica.
Planejar quatro zonas:
1. `LockedGameplay` — cartas, posições, interação; intocável.
2. `NearFrame` — elementos que recortam as bordas, sem tapar HUD/cartas.
3. `AmbientMiddle` — piso, terraços, estruturas e luz que definem o lugar.
4. `DistantWorld` — monumentos, montanhas, céu, templos, horizonte e atmósfera; pode estar fora do frustum competitivo.
**Novo critério:** o landmark NÃO precisa estar visível na captura de combate. Precisa ser mostrado na abertura, e o campo precisa continuar reconhecível como parte do mesmo mundo.

## 4. Artboards necessários por arena
### 4.1 Cinematic Master Artboard
Vista panorâmica autoral que mostra a grandeza do templo/local e a identidade mitológica. Pode usar câmera cinematográfica própria; não é obrigado a reproduzir a vista competitiva.
### 4.2 Battlefield Master Artboard
Composição exata da câmera de gameplay, sem HUD/cartas na arte final; acompanhada de overlay transparente mostrando zonas e limites reais obtidos do DOM e da projeção Three.js.
Somente este artboard é referência para o matching do campo durante o duelo.
### 4.3 Transition Storyboard
No mínimo quatro frames: establishing, aproximação, aproximação final e campo. Para cada frame: tempo, câmera, foco, assets visíveis, VFX, áudio opcional e transição.
### 4.4 Production Artboard
Breakdown da arquitetura e assets, vistas técnicas, materiais, escala, pivô, LOD, variantes. Arte aprovada é imutável e versionada.

## 5. Scene Graph e single source of truth
```
WorldRoot
  ├── DistantEnvironment
  ├── LandmarkArchitecture
  ├── TerrainAndLandscape
  ├── BattlefieldEnvironment
  │   ├── FloorDecorative (malla separada, não gameplay)
  │   ├── NearFrameProps
  │   └── AmbientMiddle
  ├── LightingRig
  ├── AtmosphericFX
  ├── CinematicRig (camera, spline, keyframes)
  └── GameplayAnchor (referência protegida, não é transformado pelo Forge)
```
Um Scene Manifest versionado alimenta Forge e jogo. Sem duplicação de cenário entre editor e runtime. Transform do WorldRoot não deve mudar o GameplayAnchor. Eventos de batalha afetam somente visual.
Carregamento assíncrono de assets com fallback, manutenção de cache, dispose e perfil de performance. Cinemática com assets preparados antes da reprodução; atraso não pode congelar partida.

## 6. Poseidon — Fortaleza Submarina (modelo de excelência)
### Cinematic
Abertura revela o teto oceânico suspenso, mar filtrando luz azul, sete pilares ao longe e o Grande Pilar Principal. Câmera encontra o palácio branco em sua escala monumental, percorre alas simétricas e escadaria e desce até o pátio cerimonial.
O templo **não precisa caber no frame da partida**. Não reduzir o templo a uma miniatura apenas para aparecer no topo do tabuleiro.
### Battlefield
Um grande piso circular/oval em perspectiva com mármore pintado azul-marinho e marfim, anéis e padrões de ondas dourados, cáusticas lentas e discretas.
Enquadramento lateral: colunas sólidas com capitéis, pedestais, trechos de balaustrada, rochas e escadarias ligadas ao pátio, como um ambiente habitável e contínuo; sem cerca circular artificial uniforme.
Fundo compatível com vista real; apenas partes da arquitetura aparecem quando a perspectiva permite.
### Direção artística
Paleta inicial: `#092236` azul profundo, `#0f526b` teal, `#5ac8dd` turquesa, `#e8e7df` marfim pintado, `#d7ac63` ouro antigo.
Geometria: frontão simétrico de verdade, colunas encostadas no entablamento, tridente detalhado, estátuas com GLB e texturas pictóricas, não bonecos de primitivas.
Mar suspenso acima de um **reino respirável**, não templo afogado. Oceano visto de baixo, light shafts cinematográficos e monumentos desvanecendo na névoa.
**Proibido:** preencher indiscriminadamente com corais, usar cilindros genéricos como asset final, templo encolhido ou água cobrindo as cartas.
### Referências
Arquivo esperado: `docs/art-bible/references/poseidon-master-artboard.jpg` (cópia binária pendente de instalação verificada). A ilustração pode apoiar o Battlefield Master Artboard, mas a aprovação definitiva exige comparar com screenshot real do jogo. A referência cinematográfica e o storyboard são artefatos distintos, ainda a produzir.

## 7. Identidade das facções / gramática ambiental
| Facção | Cinematic Reveal | Battlefield Frame | Paleta e material | Atmosfera |
|---|---|---|---|---|
| Athena | Doze Templos / santuário | mármore, colunas, bases douradas | marfim, ouro solar, azul celeste | luz sagrada |
| Poseidon | palácio, pilares e oceano suspenso | pedras oceânicas, colunas, balaustradas | marfim frio, teal, ouro antigo | cáusticas |
| Hades | Submundo, rios e monumentos | arcos arruinados, rochas, obeliscos | basalto, violeta, metal morto | névoa espectral |
| Ares | fortaleza, muralhas e exércitos | rocha vulcânica, ferro, correntes | ferro escuro, vermelho queimado | brasas |
| Artemis | bosque sagrado, templo lunar | árvores, raízes, pedras, pilares lunares | prata, azul lunar, verde frio | pólen e luar |
Cada cenário tem sua **geografia** própria, não troca apenas de cor do mesmo anel de colunas. Compartilhar qualidade artística e tecnologia, não necessariamente as mesmas peças.

## 8. Produção de assets e materiais
Etapas: reference → concept → artboard → breakdown → model → UV → texture → material → LOD → cinematic match → battle match → aprovação.
Assets distantes podem usar matte painting 2.5D se a trajetória cinematográfica não revelar o truque. Próximos ao campo exigem 3D real.
Materiais registram: id, licença, autoria, versão, textureSet (albedo painted, normals, roughness, metalness, AO), brush orientation/scale, pintura de bordas, resposta luminosa, LOD.
PBR de Poly Haven/ambientCG pode sustentar estrutura; não substitui hand painting. Modelos não homologados permanecem `placeholder`.

## 9. Sistema de cinemática no Arena Forge
Ferramentas obrigatórias: Camera Path Editor, keyframe timeline, spline, preview com scrub, easing, lookAt target, marcadores de eventos, transição ao gameplay, botão skip, redução de movimento e gerenciamento de assets.
Transição no gameplay sem reparenting/deslocamento de cartas. Testar iniciar, terminar, pular em qualquer ponto, alternar qualidade, perder contexto WebGL, minimizar e reconectar.

## 10. Qualidade & performance
Preservar FPS e legibilidade. Preferir instancing, LOD, texturas comprimidas quando disponível, poucos draw calls, luz assada onde apropriado, partículas com limite. HUD/carta nunca são encobertos por props.
Testar desktop/mobile, baixo/alto perfil, reduced motion, reduced flashes, navegação por teclado e continuidade audiovisual. Medir custo da abertura separadamente do custo da arena em repouso.
Não afirmar fidelidade exata por cálculo inventado; apresentar screenshots A/B reais e diferenças de composição, cor, forma e performance.

## 11. Pipeline de aprovação — três gates
- **Gate A — World Art:** landmark, arquitetura, materiais e paleta aprovados no Cinematic Artboard.
- **Gate B — Transition:** storyboard e percurso cine aprobados; entrar e pular funciona sem saltos, clipping ou perder controle.
- **Gate C — Battle:** câmera lock, environment frame, legibilidade e desempenho com cartas reais aprovados.
Só depois publicar versão no manifesto oficial; manter developer/official separados, com rollback.

## 12. Entregáveis mínimos de Poseidon
1. Cinematic Master Artboard.
2. Battlefield Master Artboard com overlay do jogo.
3. Storyboard de 4+ keyframes reais.
4. Dois registros de câmera: competitivo (somente leitura) e cinematográfico (editável).
5. `poseidon-asset-breakdown.json` com uso `cinematic/battle/both`.
6. Modelos/prefabs/materiais com proveniência e estados honestos.
7. Scene Manifest único, sem duplicar montagem entre editor e jogo.
8. Vídeo ou sequência de screenshots da cinemática e captura da partida com HUD/cartas.
9. Teste skip, reduced motion, performance mobile e desktop.
10. Aprovação explícita do autor antes de publicar.

## 13. Estado atual e limites
A direção de arte e a arquitetura conceitual estão aprovadas. A implementação da cinemática, do storyboard e dos assets finais ainda requer desenvolvimento e validação real.
O manifesto de câmera existente cobre apenas a câmera competitiva. As poses cinematográficas serão escolhidas durante o storyboard e nunca podem ser inventadas como valores homologados.
Não declarar exportação GLB, instalação da imagem, vídeos renderizados ou publicação oficial sem verificar seus artefatos.

**Mandamento:** PRIMEIRO REVELAMOS O MUNDO. DEPOIS ENTRAMOS NELE PARA LUTAR. O CAMPO PRECISA PERTENCER AO MUNDO — NÃO CONTÊ-LO INTEIRO.
