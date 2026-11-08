# Poseidon · Guardião das Profundezas V1 — modelagem detalhada, materiais e LODs

Data: 08/11/2026. Só desenvolvimento. Nada foi enviado ao remoto nem publicado.

**Estado:** `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING`. A V1 **não está aprovada artisticamente**. A aprovação do autor vale só para a silhueta da prévia em argila (pose, tridente na diagonal, capa, ombreira e pedestal). Ela não cobre rosto, dobras, materiais nem o asset final.

## O que foi feito

### 1. Build generalizado

`guardian_tides_build.py` lê a seção `build` do projeto e não depende mais de nomes `TIDES__*`. A seção define:

- prefixo e raiz do GLB;
- objetos do high poly de cada parte;
- partes separadas do corpo: rosto e mão do tridente;
- materiais e orçamento do LOD0;
- pivô e arquivos.

Comando: `-- --stage none --projeto guardian-depths --versao v1`.

Sem `--projeto`, o build usa os valores do Guardião das Marés. A V14.1 foi refeita com o build novo, e os 4 GLBs saíram com os mesmos SHA-256.

### 2. Modelagem V1 (`guardian_depths.py -- v1`)

A V1 parte da silhueta aprovada. Pose, proporções, tridente, capa, ombreira e pedestal são os mesmos.

| Parte | V1 |
| --- | --- |
| Pano | Saia com 56 fileiras e 19 pregas, contra 36 fileiras e 13 pregas na argila. Capa com 90 fileiras, 11 dobras e casca mais grossa. |
| Faixa a tiracolo | Faixa chata que corre sobre a pele, do ombro do tridente até o quadril oposto (`sculpt_kit.ribbon`). Na argila, a faixa era uma folha curta que saía em cacos no peito. |
| Cinto | Tira sobre a saia, com fivela de concha na frente do quadril (`sculpt_kit.strap`). |
| Sandálias | Duas tiras em cada tornozelo. A tira do peito do pé saía em laço e foi tirada. |
| Braceletes | Punho largo na mão de comando e bracelete no braço do mesmo lado. |
| Topo do pedestal | A água baixa (até 6 cm) não passa mais da borda da laje. Na argila, o degrau e a ondulação saíam como chapas finas para fora do tambor. As volutas não mudaram. |
| Corpo | Grupos de rosto (3.261 vértices) e de mão do tridente (787), como no Guardião das Marés, para cada um ter orçamento próprio. |

`sculpt_kit.py` ganhou duas peças genéricas:

- **`strap`:** tira em volta de um membro. Um raio que erra ou acerta longe demais fica no raio mediano.
- **`ribbon`:** faixa sobre a pele.

### 3. LODs, materiais e GLB

Os materiais são os mesmos três da V14.1: marfim envelhecido, mármore profundo e ouro antigo.

| Material | Partes |
| --- | --- |
| Marfim | corpo, rosto, mão, cabelo e pano |
| Mármore | pedestal e ondas |
| Ouro | tridente e detalhes: ombreira, cinto, fivela, sandálias, braceletes e ornamentos do pedestal |

| | Triângulos | Texturas | Tamanho |
| --- | --- | --- | --- |
| LOD0 | 28.993 | 2048 | 3,5 MB |
| LOD1 | 8.692 | 1024 | 1,3 MB |
| LOD2 | 2.679 | 1024 | 1,0 MB |
| Mobile | 8.692 | 512 | 0,5 MB |

- **Escala:** 5,29 × 8,97 × 3,83 m, com o pivô no chão.
- **Largura:** é a da silhueta aprovada, com o tridente na diagonal e o braço de comando estendido. O projeto tem limite próprio de largura, 5,6 m. A profundidade continua com o limite de 4 m da base.
- **Silhueta por LOD:** a pior peça é o pedestal no LOD2, a 8 cm da caixa do LOD0. O limite é 10 cm.

**Dois defeitos achados no build e corrigidos para qualquer projeto.** A correção vale para as partes listadas em `fechar` no projeto; no Guardião das Marés, essa lista é vazia.

1. **O pano não decimava abaixo de cerca de 2.300 triângulos.** A causa eram os vértices duplicados da casca, que travavam o colapso. O build agora funde os duplicados antes de decimar. Um remesh de voxel foi testado antes e apagava a capa, porque uma casca fina não é volume.
2. **Retalhos no bake do pano.** Depois da decimação, a casca ficava com faces viradas para dentro. O build agora recalcula as normais. As normais corrigidas no marfim caíram de 12,5 % para 9,1 %.

**Hashes (SHA-256, `arena-forge/assets/poseidon-depths-v1/SHA256SUMS`):**

| GLB | SHA-256 |
| --- | --- |
| `guardian-depths-lod0.glb` | `94480011ec70e41eb2ba7e151107237703fc8d70e58ecea55f04a2846c6462f0` |
| `guardian-depths-lod1.glb` | `2533361023f1ead2e6a0a435b9f98c5f889a19bd4ca40f3dc06a1166106a923e` |
| `guardian-depths-lod2.glb` | `34202b8003cc73f964bdbaf881a3c1d5816d04551347922d7a1ecec562f9e1d5` |
| `guardian-depths-mobile.glb` | `9cabcbc2994ae5c4e6adc83b016397f8b0f76189bf0d27a5e86d1b482fa40052` |

## No mundo e no inspetor

| Onde | Como |
| --- | --- |
| Mundo | `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV141=1&sculptDepthsV1=1`. Carrega o GLB na posição B, com o mesmo leitor e o mesmo apoio da prévia em argila. O nó raiz é `GUARDIAN_DEPTHS_V1_DEV`. `?sculptDepthsClay=1` continua carregando a argila. |
| Inspetor | STAR HILL → Arena Forge → Sculpture Studio. O seletor de GLB tem `Profundezas V1 · LOD0`, `LOD1`, `LOD2` e `Mobile`. |
| Homologação | Aba **Homologação**. O arquivo é `projects/guardian-depths/homologacao-v1.json`. |
| Capturas | Em `docs/img/sculpture-studio/guardian-depths/`: `v1-argila-*` e `v1-silhueta-*` (5 vistas), `v1-material-*` (5 vistas), `v1-mundo-chave0/1/2.png` e `v1-mundo-partida.png`. |

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/sculpture-homologate.py guardian-depths --testes 8770` | `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING`: 27 verificações e 2 testes, sem falhas |
| `tools/test-sculpture-depths-v1.py` (novo) | 9 ok, sem erros de página |
| `tools/test-sculpture-homologacao.py` | 15 ok |
| `tools/test-sculpture-v14-1.py`, `test-sculpture-v14.py`, `test-sculpture-studio.py` | 8, 8 e 15 ok |
| Hashes da V13, V14 e V14.1 | Iguais |

O `test-sculpture-depths-v1.py` também confere três coisas:

- sem flags, nenhuma escultura de desenvolvimento carrega;
- a câmera competitiva continua FOV 42 em (0; 13,5; 13);
- a posição B usa o GLB da V1, e não a argila.

## Limitações (sem maquiagem)

1. **Rosto e cabelo.** São os mesmos da prévia em argila: edição paramétrica do corpo base e cabelo gerado. Ainda não houve passada manual de rosto.
2. **Volutas e serpente d'água.** Continuam tubos lisos e ainda leem como cano. Precisam de perfil de crista e de sulcos de fluxo, como a onda da V14.1.
3. **Cinto.** A borda de baixo do cinto sai serrilhada no LOD0, porque segue as pregas da saia.
4. **Capa e saia.** As dobras são paramétricas, sem simulação de pano.
5. **Mão de comando.** Está aberta e com os dedos pouco curvados. Não foi revisada de perto.
6. **Artboards V10.** Continuam ausentes do Mac. A V1 segue o texto da bíblia e a silhueta aprovada.

## Próximo passo

A revisão artística da V1 cabe ao autor, na aba Homologação, com as capturas `v1-*`. As passadas manuais das limitações 1 e 2 dependem dessa revisão.
