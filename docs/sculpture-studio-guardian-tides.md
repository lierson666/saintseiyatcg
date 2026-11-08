# Poseidon V13 · Guardian of the Tides — produção da escultura

Data: 08/11/2026. Ambiente: só desenvolvimento. Nada foi publicado.

**Estado:** `STRUCTURE_VALID_ART_REVIEW_PENDING`. A escultura **não está aprovada artisticamente**; a aprovação é do autor.

## Como foi feita

- **Onde:** tudo local, no Blender 4.5.15 LTS (instalado em `~/Applications`, cópia própria), sem interface, por script `bpy` em `arena-forge/sculpture-studio/`.
- **O que não foi usado:** Higgsfield, Tripo ou qualquer API de geração 3D.
- **Conversão de pintura:** nenhuma pintura foi convertida em 3D.

| Parte | Como |
| --- | --- |
| Corpo (`TIDES__BODY`, `TIDES__FACE`, `TIDES__HAND_GRIP`) | Ver abaixo. |
| Tridente (`TIDES__TRIDENT`) | Cabo torneado com anéis e ponteira; colar com bulbo e flor; travessa em quarto de elipse; três pontas sólidas em losango com duas farpas cada. |
| Cabelo e barba (`TIDES__HAIR_BEARD`) | Ver abaixo. |
| Coroa de louros marinha (em `TIDES__DETAILS`) | Aro com folhas em pares, projetado na superfície do cabelo, e uma vieira na frente. |
| Manto (`TIDES__CLOTH`) | Ver abaixo. |
| Pedestal (`TIDES__PEDESTAL`) | Plinto, filete, toro, dado, cornija e laje. Friso de volutas (onda grega) em relevo nas 4 faces. Painéis com filete de ouro e vieira (`TIDES__DETAILS`). |
| Ondas (`TIDES__WAVES`) | Ver abaixo. |

### Corpo

- **Base:** malha anatômica CC0 (Blender Studio, Human Base Meshes v1.4.1), com multires de 3 níveis.
- **Rig:** 47 ossos, criados por script; pesos automáticos mais pesos geométricos por falange.
- **Pose (V11):**
  - peso na perna direita;
  - pé esquerdo na crista;
  - contrapposto;
  - peito girado cerca de 10° para o templo.
- **Punho:** os cinco dedos fecham em volta do cabo. O eixo do cabo é medido nas juntas dos quatro dedos dobrados: (0,02; 0,04; 1,0), quase vertical.

### Cabelo e barba

- **Mechas:** cerca de 80 no couro cabeludo, mais 230 cachos em espiral na barba e o bigode no lábio.
- **Fusão:** as mechas são fundidas a uma casca por remesh de voxel.
- **Sulcos de cinzel:** penteados da testa para trás, em faixas onduladas.

### Manto

- **Peças:** simulação de pano (Blender Cloth) com o himátion no quadril e a aba sobre o ombro esquerdo, que desce pelas costas.
- **Como as dobras se formam:** o corpo anima do repouso até a pose durante a simulação. As dobras vêm da gravidade, do contato e da perna levantada.
- **Acabamento:** espessura e suavização.

### Ondas

- **Crista:** quebra para a frente sob o pé esquerdo, com vão sob o lábio.
- **Onda de trás:** longa e baixa, contorna o guardião por trás.
- **Superfície:** ondulações, espirais de espuma e linhas de fluxo entalhadas.

## Medidas

| | Valor |
| --- | --- |
| Escala | 3,3 × o corpo base. Figura com cerca de 5,6 m. |
| Plinto | 1,94 m de altura; base de 3,0 × 2,6 m. |
| Caixa total | 3,41 × 9,90 × 2,98 m. A ponta do tridente fica a cerca de 10 m (V12). |
| Orientação e pivô | Y para cima, frente +Z, pivô no centro da base do plinto. |
| LOD0 | 28.509 triângulos, 9 malhas, 3 materiais, 10 draw calls. Marfim e mármore em 2048², ouro em 1024². |
| LOD1 | 8.570 triângulos, texturas em 1024². |
| LOD2 | 2.091 triângulos. No LOD distante saem as menores folhas da coroa. |
| Mobile | Geometria do LOD1 com texturas em 512². |
| High poly (para o bake) | Corpo com multires de nível 2; cabelo e ondas com centenas de milhares de triângulos. Fica em `~/worktrees/sstcg-tools/sculpt-work/`, fora do repositório. |

**Materiais:**

| Material | Mapas | Uso |
| --- | --- | --- |
| `STATUE_AGED_IVORY` | cor base, normal, ORM | marfim envelhecido com veios verde-mar finos |
| `STATUE_DEEP_MARBLE` | cor base, normal, ORM | pedra oceânica |
| `STATUE_ANCIENT_GOLD` | cor base, normal, ORM | ouro antigo |

**Acabamento pintado:**

- A oclusão (canal R do ORM) vem da curvatura côncava do mapa de normais. É a cavidade de cinzel, não sombra de contato. O AO assado na malha decimada se ocluía nas cascas finas do pano e na emenda rosto/corpo, e foi descartado.
- As cavidades ganham um leve tom azul-marinho.
- As arestas convexas ganham luz quente, com a curvatura tirada do mapa de normais.
- A cor tem uma leve posterização.

## Onde ver

| O quê | Onde |
| --- | --- |
| Inspetor | STAR HILL → Arena Forge → **Sculpture Studio** (`#arenas/escultura`). É o mesmo Arena Forge, sem editor novo. |
| No mundo | `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV13=1` |

**O que o inspetor faz:**

- Carrega os 4 GLB ou importa um GLB do disco.
- Giro 360°; vistas frente, costas, esquerda, direita e 3/4; ortográfica ou perspectiva.
- Wireframe.
- Modos de material: materiais, argila, normais, só cor base, só AO.
- Artboard do projeto de produção por cima, com opacidade.
- Escala e pivô.
- Tabela dos LODs.
- Métricas: triângulos, draw calls, malhas e materiais, memória de geometria e de textura, tamanho do GLB.
- Miniaturas das texturas e captura PNG.

**No mundo:**

- O guardião fica em `(-10.8, 4.41, -34.8)`, em `WorldRoot / LandmarkArchitecture`, o mesmo mundo da cinemática.
- Fica sobre um bloco de mármore que desce até o chão e entra 1,15 m no canto do pódio.
- **Sem `sculptV13=1` nada é carregado.**

**O que não mudou:** câmera competitiva, HUD, cartas e regras.

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/poseidon-v13-audit-glb.py` nos 4 GLB | `STRUCTURE_VALID_ART_REVIEW_PENDING`, sem avisos |
| `tools/poseidon-v12-import-glb.py --guardian tides --install` | Sem UV faltando, sem skin; `imported_for_review_not_published` em `arena-forge/assets/poseidon-v12/guardian-tides.glb` |
| `tools/test-poseidon-v12-import.py` | `V12_INSPECTOR_TESTS_PASS` |
| `tools/test-sculpture-studio.py` (Playwright, Three.js real) | Ver abaixo. |

**`tools/test-sculpture-studio.py` confere:**

- as 9 partes no GLB;
- o orçamento dos 3 LODs;
- a escala de mundo;
- os draw calls;
- vistas, wireframe, argila, troca de LOD e captura;
- que sem a flag nada carrega;
- que com a flag o GLB carrega;
- as chaves 0, 1 e 2 da cinemática original;
- que a câmera competitiva continua FOV 42 em (0, 13.5, 13).

## Imagens (`docs/img/sculpture-studio/`)

| Imagens | O que mostram |
| --- | --- |
| `clay-frente`, `clay-costas`, `clay-esquerda`, `clay-direita`, `clay-tres-quartos` | High poly em argila, sem material |
| `clay-rosto-frente`, `clay-rosto-tres-quartos` | Rosto |
| `clay-mao-tridente`, `clay-mao-tridente-frente`, `clay-mao-manto` | Mãos |
| `inspector-frente`, `inspector-costas`, `inspector-esquerda`, `inspector-direita`, `inspector-tres-quartos`, `inspector-argila`, `inspector-wireframe`, `inspector-tela` | LOD0 com materiais, no inspetor |
| `mundo-cinematica-chave0`, `mundo-cinematica-chave1`, `mundo-cinematica-chave2`, `mundo-partida` | No mundo: chaves da cinemática e câmera competitiva |

## Comparação com a Bíblia (V11 / V12)

As referências pintadas do V10 citadas nos documentos (`docs/art-bible/references/poseidon-v10-guardian-*.png`) **não existem no disco**. Por isso a comparação é com os critérios escritos.

| Critério | Estado |
| --- | --- |
| Tridente vertical perto do ombro de fora, segurado pela mão direita | Feito (eixo medido no punho) |
| Cinco dedos, fechando no cabo de verdade | Feito. A mão esquerda só encosta na borda do manto e não o segura com firmeza. |
| Pé esquerdo na crista, perna de apoio na base | Feito |
| Manto com volume real e dobras | Feito por simulação. A aba das costas é tubular e precisa de revisão. |
| Rosto com pálpebras, lábios e sobrancelhas | Sim (malha base). **O rosto é jovem; o V12 pede "mais velho, severo".** |
| Barba volumosa e cabelo em mechas com sulcos | Feito por script. Leitura de "mármore entalhado", mas sem a mão de um escultor. |
| Coroa de louros entalhada | Feita (marinha, com vieira) |
| Pedestal com cavalo-marinho e painéis de ouro | Painéis de ouro, vieira e friso de volutas feitos. **Hipocampo não feito.** |
| Ondas como esculturas, não simulação; crista e espaços negativos legíveis | Feitas. A massa ainda é baixa perto do que pede o "contrapeso horizontal". |
| Cinto de escamas e fivelas (`TIDES__DETAILS`) | **Não feito.** `DETAILS` tem só a coroa e os ouros do pedestal. |
| Silhueta nas chaves 0, 1 e 2 da cinemática | Legível. Na escala do palácio a estátua fica pequena perto do templo. |

## Limitações (registradas sem maquiagem)

1. **Anatomia.** É a base CC0 da Blender Studio posada por script. Músculos e proporções são os dela; não há escultura manual de anatomia heroica.
2. **Rosto.** É jovem e neutro. Envelhecer e endurecer a expressão exige escultura manual (rugas, sobrancelha baixa, maçãs marcadas). Não fiz isso por script com qualidade aceitável.
3. **Cabelo e barba.** São procedurais. Leem como massa entalhada, mas há mechas soltas na frente e um redemoinho no alto da nuca (efeito das faixas em volta do eixo).
4. **Manto.**
   - A mão esquerda não "controla" o pano com uma pegada clara.
   - Há um rasgo pequeno no quadril esquerdo, onde o pano encosta no braço.
   - O pano é contínuo, sem barra decorada grega.
5. **Hipocampo e cinto de escamas.** Não foram feitos. Precisam de modelagem manual ou de um novo módulo.
6. **Texturas.**
   - O atlas automático (smart UV) cria muitas ilhas pequenas, sobretudo no cabelo. A densidade de texel é desigual.
   - As normais em que o raio do bake errou o high poly foram trocadas por normal plana. O build imprime a porcentagem: marfim 7–11 %, mármore 8–25 %, ouro cerca de 1 %. No mármore se perde parte do relevo fino do friso e das ondas.
   - Não há AO de contato (o assado falhava). Só a cavidade tirada da curvatura.
7. **No jogo.** O GLB entra só com a flag de desenvolvimento, e o leitor próprio (`arena-forge/poseidon-v13-guardian.js`) cobre só o perfil exportado aqui. O build enxuto do Three.js do jogo não tem GLTFLoader.
8. **Tempo de geração.** A etapa `sculpt` leva cerca de 1 h 45 min (pano). A etapa `game` leva cerca de 5 min.

## Próximos passos sugeridos (precisam da decisão do autor)

1. Revisão artística destas imagens.
2. Decidir se rosto, hipocampo e cinto entram por escultura manual ou se a base fica assim para o primeiro teste em cena.
3. Ajustar a massa das ondas e a aba do manto conforme a revisão.
4. Só depois disso, pensar em ligar o guardião fora da flag de desenvolvimento.
