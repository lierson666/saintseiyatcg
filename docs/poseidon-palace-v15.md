# Palácio de Poseidon V15: passada de arte do ambiente cinematográfico

Data: 08/11/2026. Branch `olympus-arena`, base `c06f945`. Só desenvolvimento: nada foi enviado ao remoto nem publicado.

**Estado:** `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING`. A V15 **não está aprovada artisticamente**: ela espera a revisão do autor nas comparações abaixo.

**Onde ver:** `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV141=1&sculptDepthsV11=1&palaceV15=1`. Sem `?palaceV15=1`, o palácio é exatamente o da V1.1.

## O que foi preservado

| Item | Situação |
| --- | --- |
| Guardião das Marés V14.1 e Guardião das Profundezas V1.1 | Intactos: GLBs, LODs e SHA-256 conferidos pelo teste |
| Câmera competitiva | Intacta: FOV 42 em (0; 13,5; 13), com e sem a V15 |
| HUD, cartas e jogo | Sem alteração |
| Cinematic Sequence Editor e chaves (`arena-forge/cinematics/poseidon.json`) | Sem alteração |
| Vendor do Three.js | Sem alteração. A geometria nova é feita com `BufferGeometry` porque o build enxuto não tem Lathe, Extrude nem Icosaedro |
| Fachada | Não há fachada nova na frente da antiga. As peças da V15 trocam as primitivas no mesmo `WorldRoot`, nas mesmas coordenadas |

## 1. Auditoria visual: problemas por impacto visual

Capturas da V1.1: `docs/img/poseidon-v15/base-*.jpg` (3 chaves, 8 câmeras de auditoria e a partida).

Os Master Artboards **continuam ausentes do Mac**: `docs/art-bible/references/` está vazia. Por isso, a comparação usa o texto da Art Bible V2, §6.

| # | Área | Problema na V1.1 | Impacto | V15 |
| --- | --- | --- | --- | --- |
| 1 | Rochas e borda | Esferas lisas e claras: liam como neve. Usavam 66 malhas | Muito alto | Rochas facetadas por ruído, cor de leito marinho e 8 malhas instanciadas |
| 2 | Colunas e capitéis | Pilha de 5 primitivas (caixa, 2 cilindros, cilindro e caixa), com degrau entre base, fuste e capitel | Muito alto | Base ática torneada, fuste com êntase e 20 caneluras de verdade e equino com astrágalo, em perfil contínuo |
| 3 | Frontão | Prisma liso, cornijas de caixa, tímpano vazio e tridente de 5 caixas | Alto | Cornijas molduradas (geison e sima), dentículos, palmetas de ouro, tridente extrudado com chanfro e 6 ondas em relevo |
| 4 | Materiais | Mármore chapado e muito claro, com luz plana | Alto | Arte de material: pigmento, pátina teal, cavidade, desgaste de quina e relevo suave, mais luz rasante |
| 5 | Portal da cela | Retângulo escuro chapado na parede | Médio | Três molduras encaixadas com embrasadura (profundidade real) |
| 6 | Pedestais dos guardiões | Blocos de caixa sem moldura | Médio | Cornija de coroamento, moldura de base, faixa de ouro e painel rebaixado com moldura dourada |
| 7 | Grande Pilar | Cilindro liso | Médio | Fuste com 24 caneluras e base ática; os pilares distantes também |
| 8 | Oceano suspenso | Plano único com borda visível no horizonte | Médio | Refração estilizada (ondulação deslocada por ruído) e segunda camada alta e escura que cobre o horizonte |
| 9 | Balaustrada e braseiros do campo | Cilindros de 8 lados | Médio-baixo | Balaústres em vaso e braseiros torneados |
| 10 | Chamas dos braseiros | Cones translúcidos que leem como cristal | Baixo | **Não tratado** (pendente) |
| 11 | Piso cerimonial | Já pintado. Bom | — | Mantido: a legibilidade das cartas é a mesma |

## 2. Benchmark reproduzível

Ferramenta: `tools/bench-poseidon-palace.py`.

**Condições:** Chrome com `--use-angle=metal`. Os ms de GPU vêm de `scene.bench`, que espera a GPU com readPixels. São 10 quadros por amostra, com 10 a 12 amostras por rodada e 2 a 3 rodadas. As versões rodam intercaladas dentro de cada rodada.

**Perfis:**

| Perfil | Viewport | DPR | Gráfico |
| --- | --- | --- | --- |
| Alto | 1600 × 900 | 2 | High |
| Médio | 1600 × 900 | 2 | Medium |
| Celular | 390 × 844 | 3, com toque | phone |

Cada perfil mede as chaves 0, 1 e 2 da cinemática e a partida com as cartas da demo. Draw calls e triângulos são contados no próprio contexto WebGL.

Resultados:

| Arquivo | Conteúdo |
| --- | --- |
| `docs/perf/poseidon-palace-bench-v11-base.json` | Sem esculturas × V1.1, 3 rodadas |
| `docs/perf/poseidon-palace-bench-v15.json` | V1.1 × V15, 2 rodadas, desktop |
| `docs/perf/poseidon-palace-bench-v15-celular.json` | Celular final, depois do corte de custo no perfil phone |

### A oscilação de 5,46 → 8,33 ms (V1.1)

**Não é regressão.** No benchmark intercalado, a rodada 3 subiu 3 a 4 ms nas duas versões ao mesmo tempo. Exemplo: Médio, chave 1, sem esculturas, foi de 6,13 para 8,3 ms; a V1.1 foi de 6,49 para 10,82 ms. Outra sessão mediu tudo de 9 a 15 ms mais caro, de novo nas duas versões.

A causa é o estado da GPU do Mac (clock e temperatura) entre sessões, e não o asset. Uma medida isolada de uma sessão só não serve para comparar versões. Por isso o benchmark novo intercala as versões e informa a mediana e o p95.

Na mesma sessão, a V1.1 contra a cena sem esculturas fica dentro do ruído: Alto, chave 1, mediana de 9,18 contra 8,9 ms.

### V1.1 × V15 (mesmas condições, medianas em ms de GPU)

| Perfil · vista | V1.1 | V15 | Draw calls | Triângulos |
| --- | --- | --- | --- | --- |
| Alto · chave 0 | 10,20 | 13,25 | 261 → 277 | 140,7 mil → 194,3 mil |
| Alto · chave 1 | 10,41 | 11,36 | 223 → 254 | 136,3 mil → 189,7 mil |
| Alto · chave 2 | 10,63 | 11,25 | 281 → 302 | 141,5 mil → 197,4 mil |
| Alto · partida | 5,58 | 4,79 | 123 → 119 | 75,3 mil → 123,0 mil |
| Médio · chaves 0 a 2 | 7,3 a 7,9 | 9,64 | +16 a +31 | +53 mil |
| Médio · partida | 4,38 | 5,13 | 120 → 116 | 74,4 mil → 122,2 mil |
| Celular · chaves 0 a 2 | 3,0 a 3,6 | 4,1 a 4,2 | +32 a +35 | +22 mil |
| Celular · partida | 2,17 | 1,79 | 68 → 82 | 14,7 mil → 32,2 mil |

Memória aproximada do grupo do palácio: geometria de 3,8 para 4,2 MB. A textura não muda: são 313 MB, quase tudo das texturas 2048 dos guardiões.

**Leitura:**

1. **Partida:** fica dentro do ruído nos três perfis, com draw calls iguais ou menores. As rochas instanciadas tiram 58 draw calls.
2. **Cinemática:** fica cerca de 1 a 3 ms mais cara, porque tem mais triângulos e mais shader de material. Continua abaixo de 16,7 ms no Alto (60 fps) em todas as medianas.
3. **Desvio do mesmo dia:** o p95 do Alto, chave 0, chegou a 13,9 ms.

**Dois cortes de custo foram feitos depois da primeira medida, que tinha ficado 2× mais cara:**

1. **Ruído:** a arte de material e o oceano usam ruído de uma oitava (`msN`), e não o fBm de 4 oitavas. A segunda camada do oceano, com fBm e cáusticas em tela cheia, custava ~4 ms sozinha.
2. **Malha:** o fuste caiu para 40 lados e as peças torneadas para 16 lados. No perfil phone/low, o relevo por derivada fica desligado.

**Achados de desempenho que não foram tratados:**

- O celular carrega o LOD0 dos guardiões, com 300 MB de textura. Já existe GLB `mobile`, mas o leitor não o usa.
- No celular, a partida tem +14 draw calls. Vêm dos pedestais da V15, que são malhas separadas e podem ser fundidas.

## 3. Controles no Arena Forge

**Caminho:** STAR HILL → Arena Forge → Material Studio · Palácio de Poseidon → painel **Material Art · Palácio V15**.

A caixa de seleção liga a V15 no estúdio e mostra 8 controles ao vivo:

1. pigmentação;
2. pátina marinha;
3. veios;
4. rugosidade;
5. intensidade do relevo;
6. contraste de cavidade;
7. intensidade do ouro;
8. desgaste de quina.

Os controles valem para todos os mármores e para o ouro. Os valores ficam salvos no projeto `poseidon-palace-pbr-v1`, em `arteV15`, e entram no desfazer e no refazer. **Limite:** o jogo usa os valores padrão do código (`ART_DEFAULTS`); levar o projeto salvo para o jogo é passo posterior.

## 4. Quality gate (antes e depois, câmeras idênticas)

As capturas foram feitas na mesma página, com a mesma resolução e as mesmas câmeras. Os arquivos ficam em `docs/img/poseidon-v15/`:

| Arquivo | Conteúdo |
| --- | --- |
| `compare-<vista>.jpg` | V1.1 à esquerda, V15 à direita |
| `folha-v11-x-v15.jpg` | Todas as comparações numa folha |
| `base-partida-cartas.jpg` e `v15-partida-cartas.jpg` | A partida com a HUD |

As vistas são as 3 chaves da cinemática, as 8 câmeras de auditoria (fachada, colunas, escadaria, pedestais, pilar, oceano, rochas e piso) e a partida. A promoção artística cabe ao autor.

## 5. Testes

| Teste | Resultado |
| --- | --- |
| `tools/test-poseidon-palace-v15.py 8770 8765` (novo) | 11 ok |
| `tools/test-sculpture-depths-v1-1.py`, `tools/test-sculpture-v14-1.py` | Regressão: 12 ok e 8 ok, sem erros de página. As capturas que esses testes regeram foram restauradas |

O teste novo cobre:

- sem a flag, nada muda;
- a câmera competitiva;
- os hashes dos guardiões;
- as peças da V15;
- a ausência de erro de shader e de página;
- `setArt` e `readArt`;
- a legibilidade sob as cartas (luma 0,20 → 0,20, variação 0,015 → 0,014, nada por cima do campo);
- as draw calls da partida;
- o celular;
- o painel do Material Studio.

O Material Studio precisa do servidor com API, `card-forge/serve.py` na porta 8765.

## 6. Limitações

1. **Relevo do tímpano:** as ondas são poucas e pequenas. Leem como volutas, não como um mar esculpido.
2. **Acrotério central:** a palmeta tem pontas demais e lê como sol.
3. **Chamas dos braseiros:** continuam cones translúcidos.
4. **Escadaria:** os degraus continuam caixas. O desgaste vem só do material.
5. **Cinemática:** as chaves não foram mexidas. A melhora vem da luz rasante, do mar e da arquitetura. Não foram feitos ajustes de enquadramento nem de revelação dos guardiões.
6. **Master Artboards:** sem eles no Mac, a comparação usa só o texto da Art Bible.

## Arquivos

| Tipo | Arquivos |
| --- | --- |
| Novos | `arena-forge/poseidon-v15-architecture.js`, `tools/bench-poseidon-palace.py`, `tools/capture-poseidon-v15.py`, `tools/test-poseidon-palace-v15.py`, `docs/poseidon-palace-v15.md`, `docs/perf/*.json`, `docs/img/poseidon-v15/*` |
| Alterados | `arena-forge/poseidon-palace.js` (tudo atrás de `v15`), `star-hill/material-studio.js` (painel Material Art), `star-hill/arena-forge.js` (só a versão do import do Material Studio) |
