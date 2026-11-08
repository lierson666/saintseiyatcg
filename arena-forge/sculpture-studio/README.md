# Sculpture Studio (Arena Forge)

Pipeline local para gerar, revisar e exportar as esculturas do Palácio de Poseidon. Tudo roda nesta máquina com o Blender 4.5 LTS, sem interface e por script (`bpy`).

Não usa Higgsfield, Tripo nem nenhuma API externa de geração 3D. Nada converte pintura em 3D: o artboard só serve de referência.

## Requisitos

| O quê | Onde |
| --- | --- |
| Blender 4.5.15 LTS (macOS arm64) | `~/Applications/Blender 4.5 LTS.app`. Cópia própria; não toca no `/Applications`. |
| Base anatômica CC0 | Blender Studio, "Human Base Meshes" v1.4.1. Fica fora do repositório. Para baixar e conferir o SHA-256: `python3 arena-forge/sculpture-studio/fetch_assets.py` |
| Pasta de trabalho (`.blend` high poly) | `$SSTCG_SCULPT_WORK`, padrão `~/worktrees/sstcg-tools/sculpt-work`. Também fica fora do repositório. |

## Gerar o Guardian of the Tides

Defina o atalho:

```bash
B="$HOME/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender"
```

**Escultura.** Leva cerca de 1 h 45 min; quase todo o tempo vai na simulação do manto.

```bash
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_tides_build.py -- --stage sculpt
```

**LODs, bake e GLB.**

```bash
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_tides_build.py -- --stage game
```

**Build genérico de outro projeto.** Lê a seção `build` de `projects/<id>.json`: prefixo e nomes das partes, objetos do high poly por parte, materiais, orçamento do LOD0, pivô, partes de casca (`fechar`), relevo só do high poly (`somenteAlta`, entra pelo bake de normais) e arquivos. Sem `--projeto`, o build usa os valores do Guardião das Marés, e a V14.1 sai com os mesmos hashes.

```bash
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_depths.py -- v1
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_tides_build.py -- --stage none --projeto guardian-depths --versao v1
```

**Renders de argila do quality gate.**

```bash
"$B" -b --factory-startup --python arena-forge/sculpture-studio/gate_renders.py
```

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `common.py` | Caminhos e utilidades. Rotação de osso em volta de eixo do mundo, aplicar modificadores. |
| `render.py` | Renders de revisão. Argila (Workbench com cavidade) ou EEVEE. Turnaround ortográfico. |
| `guardian_tides_body.py` | Corpo e pose. Detalhes abaixo. |
| `guardian_tides_trident.py` | Tridente. Cabo torneado com anéis, colar, travessa em quarto de elipse e três pontas em losango com farpas. Alinhado ao eixo medido no punho. |
| `guardian_tides_hair.py` | Cabelo, barba e coroa. Detalhes abaixo. |
| `guardian_tides_drapery.py` | Manto por simulação de pano (Blender Cloth). Detalhes abaixo. |
| `guardian_tides_pedestal.py` | Pedestal e ondas. Detalhes abaixo. |
| `guardian_tides_build.py` | Montagem, LOD0/1/2, atlas UV por material, bake, acabamento pintado e exportação GLB. |
| `gate_renders.py` | Imagens de argila do quality gate em `docs/img/sculpture-studio/`. |
| `fetch_assets.py` | Baixa a base CC0 e confere o SHA-256. |
| `sculpt_kit.py` | Kit genérico para qualquer escultura: figura com rig, pose descrita como dados, escultura em repouso, punho, apoio no chão, saia por envelope, folha de pano, calota de concha, tira em volta de membro (`strap`), faixa sobre a pele (`ribbon`) e vistas de silhueta. |
| `sheet_ab.py` | Folha lado a lado de duas esculturas, com a mesma câmera e a mesma escala. Com `--gate`, monta a folha V × V dos 15 quadros do quality gate. Roda fora do Blender. |
| `guardian_depths.py` | Guardião das Profundezas: prévia em argila (`-- clay`, `-- shots`), GLB de argila para composição (`-- glb`), vistas da V14.1 das Marés com a mesma câmera (`-- tides`) a V1 detalhada (`-- v1`), a V1.1 (`-- v1-1`, passada escultórica) e o quality gate de argila de 15 quadros (`-- gate <arquivo.blend> <tag>`). |
| `projects/*.json` | Um projeto por escultura, com fontes, as 10 etapas, versões, orçamento, capturas, testes e critérios de arte. `index.json` e as homologações são gerados. |

### `guardian_tides_body.py`

- Parte da base CC0.
- O rig é criado por script, com pesos automáticos.
- Cada falange recebe pesos geométricos.
- Pose do guardião:
  - peso na perna direita;
  - pé esquerdo na crista;
  - peito girado cerca de 10°.
- O punho fecha em volta do cabo. O eixo do cabo é medido nas juntas dos dedos (`grip_axis`).

### `guardian_tides_hair.py`

- As mechas e os cachos são tubos que seguem a cabeça.
- Uma casca e as mechas são fundidas por remesh de voxel.
- Os sulcos de cinzel são penteados da testa para trás.
- A coroa de louros é projetada na superfície do cabelo e tem uma vieira na frente.

### `guardian_tides_drapery.py`

- O manto tem duas peças: o himátion no quadril e a aba sobre o ombro esquerdo.
- O corpo anima do repouso até a pose durante a simulação, então o pano nunca nasce dentro do corpo.

### `guardian_tides_pedestal.py`

- Plinto clássico com friso de volutas em relevo, filete de ouro e vieira.
- Ondas petrificadas:
  - crista sob o pé, com vão sob o lábio;
  - onda longa atrás do guardião;
  - ondulações e espirais de espuma;
  - linhas de fluxo entalhadas.

## Saída (`arena-forge/assets/poseidon-v13/`)

| Arquivo | Conteúdo |
| --- | --- |
| `guardian-tides-lod0.glb` | LOD0 (cerca de 29k triângulos). Texturas desktop: marfim e mármore 2048², ouro 1024². |
| `guardian-tides-lod1.glb` | LOD1, com 30% dos triângulos. |
| `guardian-tides-lod2.glb` | LOD2, até 3k triângulos. |
| `guardian-tides-mobile.glb` | Geometria do LOD1 com texturas de 512². |
| `guardian-tides-build.json` | Triângulos por parte e por LOD, escala e eixo do punho. |

**Formato dos GLB:**

- Escala de mundo: 1 unidade = 1 m.
- Y para cima, frente +Z.
- Pivô no centro da base do plinto.
- Hierarquia: `GUARDIAN_TIDES` com os nós `TIDES__PEDESTAL`, `TIDES__WAVES`, `TIDES__BODY`, `TIDES__FACE`, `TIDES__HAIR_BEARD`, `TIDES__CLOTH`, `TIDES__HAND_GRIP`, `TIDES__TRIDENT` e `TIDES__DETAILS`.

**Materiais:**

| Material | Mapas |
| --- | --- |
| `STATUE_AGED_IVORY` | cor base, normal, ORM |
| `STATUE_DEEP_MARBLE` | cor base, normal, ORM |
| `STATUE_ANCIENT_GOLD` | cor base, normal, ORM |

No ORM, R = oclusão de cavidade (curvatura do mapa de normais), G = roughness e B = metal.

## Projetos, homologação e quadro de produção

| Comando | O que faz |
| --- | --- |
| `python3 tools/sculpture-homologate.py guardian-tides --testes 8770` | Mede a versão atual: 4 GLBs, hashes, auditoria, orçamento, partes, materiais, escala, silhueta por LOD, capturas, preservação das outras versões e testes. Grava `projects/guardian-tides/homologacao-<versão>.json`. |
| `python3 tools/sculpture-homologate.py --quadro` | Refaz `projects/index.json` e `docs/art-bible/SCULPTURE_PRODUCTION_BOARD.md`. |

O estado técnico (`TECHNICALLY_VALIDATED`) sai das medições. O estado artístico nunca sai da ferramenta: continua `ART_REVIEW_PENDING` até o autor registrar a revisão no projeto.

## Revisar

| Onde | Como |
| --- | --- |
| No STAR HILL | Arena Forge → **Sculpture Studio** (`#arenas/escultura`). Tem três abas. **Inspetor:** GLB com giro 360°, vistas, wireframe, modos de material, artboard, escala e pivô, LODs, métricas e captura. **Projetos:** quadro por escultura, com estágio e etapas. **Homologação:** 360°, comparação com a versão anterior, LODs, verificações, testes, critérios de arte e capturas. |
| Posição B no palácio | `?sculptDepthsClay=1` carrega a prévia em argila do Guardião das Profundezas (DEV) em (10,8; 4,41; −34,8). `?sculptDepthsV1=1` carrega a V1 com materiais e `?sculptDepthsV11=1` a V1.1. As duas podem ser combinadas com `?sculptV141=1`. |
| No mundo, só em desenvolvimento | `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV13=1`. Sem `sculptV13=1`, nada é carregado. |
| Teste automático | `uv run -q --with playwright python tools/test-sculpture-studio.py 8770` |
