# Poseidon V15.1: memória do celular e LOD das esculturas

Data: 08/11/2026. Branch `olympus-arena`, base `9de4c17`. Só desenvolvimento: nada foi enviado ao remoto nem publicado.

**Critério principal cumprido:** o celular não baixa mais a textura de alta resolução dos guardiões. Agora ele baixa o GLB próprio com texturas 512².

## 1. Diagnóstico

Os 300 MB do relatório da V15 foram **reproduzidos**. A tabela mede a textura dos dois guardiões ao mesmo tempo, com mipmaps, no celular emulado (390 × 844, perfil phone):

| | V15 | V15.1 |
| --- | --- | --- |
| GLB baixado (Marés + Profundezas) | `lod0` + `lod0` | `mobile-r2` + `mobile-r2` |
| Bytes transferidos | 5,47 MB + 3,49 MB = **8,96 MB** | 1,01 MB + 0,91 MB = **1,91 MB** |
| Texturas de cada guardião | 9 imagens JPEG, de 2048² e 1024² | 9 imagens JPEG de 512² |
| Memória das texturas dos guardiões depois de decodificadas | **287 MB** | **24 MB** |
| Textura de todo o palácio | 300 MB | 37 MB |
| Geometria do palácio | 3,8 MB | 2,2 MB |
| Heap de JS | 29 MB | 24 MB |

**Como a memória foi calculada:** soma de largura × altura × 4 × 1,33 (mipmaps) de cada imagem de textura viva no grupo. Fonte: `memTexMB` e `memTexGuardioesMB` em `docs/perf/poseidon-palace-bench-v15-1*.json`. É uma estimativa: o navegador não expõe a memória de GPU real. O heap de JS vem de `performance.memory`, e os bytes transferidos vêm das entradas `resource` da página.

O palácio mantém dois modelos ao mesmo tempo, um por guardião. Cada um é baixado uma vez só: o teste confere que há uma requisição por guardião e nenhuma duplicata.

**As causas foram duas:**

1. **Seleção de LOD.** `guardianUrl()` e `depthsUrl()` em `arena-forge/poseidon-v13-guardian.js` devolviam sempre o `-lod0.glb`, sem olhar o perfil gráfico. Por isso o perfil phone também baixava o LOD0.
2. **Os GLBs `-mobile.glb` estavam quebrados.** Nos cinco conjuntos (V13, V14, V14.1, Profundezas V1 e V1.1), as 6 texturas reduzidas a 512² (marfim e mármore) saíram **todas pretas**. O build usava `image.copy()` numa imagem assada só em memória, e o Blender recria a cópia vazia. O ouro já tinha 512² e não foi copiado, por isso estava certo. Ligar o `-mobile.glb` ao celular deixava as estátuas pretas: veja `v151m` na primeira captura de teste. Isso nunca tinha aparecido porque o mundo nunca usou esse arquivo.

## 2. Correção

**Seleção central do LOD:** `SCULPT_LOD` e `sculptLodUrl()` em `poseidon-v13-guardian.js`.

| Perfil gráfico | GLB baixado |
| --- | --- |
| High e Ultra | `lod0` |
| Medium | `lod1` |
| Low | `lod2` |
| phone (toque) | `mobile-r2` |

- **Download direto:** o arquivo do perfil é baixado direto, e o LOD0 nunca é baixado antes.
- **O que não muda:** sem perfil, a escolha continua `lod0` (editor e chamadas antigas). As flags `sculptV13`, `sculptV14`, `sculptV141`, `sculptDepthsV1` e `sculptDepthsV11` continuam valendo, e a argila continua com arquivo único.
- **Override de QA:** `?sculptLod=lod0|lod1|lod2|mobile|mobile-r2` força um LOD. Com `lod0`, reproduz a V15 no mesmo código.
- **Arquivo no `userData`:** o palácio guarda a URL carregada em `group.userData.guardianV13Url` e `guardianBUrl`.

**GLB `-mobile-r2.glb`, novo nos 5 conjuntos:** gerado por `tools/fix-mobile-glb-textures.py`.

- **Conteúdo:** é o próprio `-mobile.glb`, com a mesma malha, os mesmos UVs e os mesmos materiais. Cada imagem preta foi trocada pela imagem equivalente do `-lod1.glb`, que tem a mesma malha e os mesmos UVs, reduzida a 512² (Lanczos, JPEG 90).
- **Reprodutível:** rodar o script de novo gera os mesmos bytes.
- **Hashes:** o hash de cada arquivo novo foi acrescentado ao `SHA256SUMS` de cada pasta. **Nenhum GLB antigo mudou**: as linhas antigas dos `SHA256SUMS` continuam iguais, e o `-mobile.glb` quebrado fica no disco com o hash original.

**Build corrigido:** `export_lod` em `guardian_tides_build.py` agora copia os pixels de verdade (`pixels.foreach_get` e `foreach_set`) e mantém o espaço de cor da imagem original. Os próximos `-mobile.glb` já saem certos. Nenhum GLB foi refeito pelo Blender nesta etapa.

**Descarte:**

- **ORM compartilhado:** é usado em 3 mapas (rugosidade, metal e AO) e era solto 3 vezes. Agora cada textura é solta uma vez só.
- **Geometrias vazias:** as 4 geometrias vazias dos nós sem malha (a raiz e os pais) nunca eram soltas. Agora entram no descarte.
- **Conferência:** o teste confere 18/18 texturas e 22/22 geometrias soltas no `dispose`.
- **Isolamento entre as estátuas:** cada guardião tem o seu próprio GLB, as suas texturas e o seu próprio `dispose`. Descartar um não toca o outro.

## 3. Medições, V15 × V15.1 nas mesmas condições

As duas versões foram medidas intercaladas, 2 rodadas de 10 amostras. Arquivos: `docs/perf/poseidon-palace-bench-v15-1.json` (os 4 perfis) e `docs/perf/poseidon-palace-bench-v15-1-celular.json` (o celular com o `mobile-r2` final).

| Perfil | GLB | Textura dos guardiões | Triângulos na chave 1 | GPU na chave 1 (mediana / p95) | GPU na partida (mediana / p95) |
| --- | --- | --- | --- | --- | --- |
| Alto | lod0 → lod0 | 287 → 287 MB | 193 mil → 193 mil | 11,7 / 15,4 → 13,2 / 14,6 ms (ruído) | 6,0 / 6,9 → 4,9 / 7,2 ms |
| Médio | lod0 → **lod1** | 287 → **72 MB** | 193 mil → 152 mil | 10,2 / 14,0 → 8,9 / 11,6 ms | 5,4 / 6,5 → 4,4 / 4,7 ms |
| Baixo | lod0 → **lod2** | 287 → **72 MB** | 104 mil → 52 mil | 4,9 / 5,9 → 4,7 / 5,1 ms | 2,9 / 3,8 → 2,9 / 3,4 ms |
| Celular | lod0 → **mobile-r2** | 287 → **24 MB** | 60 mil → 48 mil | 3,65 / 4,0 → 3,62 / 3,9 ms | 1,83 / 2,0 → 1,88 / 2,2 ms |

- **Draw calls:** iguais em todos os perfis. A V15.1 não muda o número de peças, só o arquivo de cada guardião.
- **Carregamento local:** os GLBs pequenos chegam em 4 a 9 ms, contra 24 a 49 ms do LOD0. O servidor é local; numa rede de celular, a diferença é a dos bytes (8,96 → 1,91 MB).
- **Tempo de quadro:** fica igual dentro do ruído. O ganho da V15.1 é de memória e de download.

## 4. Capturas

Os arquivos ficam em `docs/img/poseidon-v15/`:

| Arquivo | Conteúdo |
| --- | --- |
| `compare-celular-v15-x-v15-1.jpg` | Celular: chave 1, close do pedestal e partida. V15 com LOD0 à esquerda, V15.1 com `mobile-r2` à direita |
| `v15m-*.jpg` e `v151m-*.jpg` | As capturas do celular |
| `v151-chave1.jpg`, `v151-pedestais.jpg`, `v151-partida.jpg` e `v151-partida-cartas.jpg` | Desktop |

No desktop Alto, a imagem é a mesma da V15. A diferença média entre as capturas é de 1,2 a 1,5 em 255, que vem da animação do mar e das chamas.

## 5. Testes

| Teste | Resultado |
| --- | --- |
| `tools/test-poseidon-v15-1-lod.py 8770` (novo) | 18 ok |
| `tools/test-poseidon-palace-v15.py 8770 8765` | 11 ok |
| `tools/test-sculpture-depths-v1-1.py` | 12 ok |
| `tools/test-sculpture-v14-1.py` e `test-sculpture-v14.py` | 8 ok e 8 ok |
| `tools/test-sculpture-studio.py` | 15 ok |
| `tools/test-sculpture-homologacao.py` | 15 ok |

O teste novo cobre os quatro perfis. Em cada um, as requisições reais confirmam o GLB baixado, e ele confere também:

- o tamanho da textura;
- a textura de marfim, que não pode estar preta;
- a câmera competitiva;
- a ausência de erros de página.

Ele confere ainda o descarte e o override `?sculptLod=lod0`.

As capturas que as regressões regeram foram restauradas.

## 6. Limitações

1. **Malha do LOD1 e do celular:** o Medium e o celular usam a malha do LOD1, com cerca de 8,7 mil triângulos por guardião. No close, a coroa dourada do Guardião das Marés fica menos legível do que no LOD0. É a decimação do LOD1, não a textura.
2. **Troca de perfil durante a partida:** o ajuste automático de qualidade (`shedLoad`) e a troca de perfil nas configurações não recarregam os guardiões. O LOD fica o da abertura da cena, para não baixar duas versões.
3. **Guardiões vivos depois da cinemática:** os guardiões continuam carregados durante a partida, mesmo fora do quadro da câmera competitiva. A Art Bible permite descarregar depois da chegada, mas isso fica para outra etapa.
4. **`ImageBitmap` em memória:** as imagens decodificadas ficam vivas até o `dispose`. Fechar antes impediria a reenvio de textura depois de uma perda de contexto WebGL.
5. **Sculpture Studio:** o inspetor ainda lista o `-mobile.glb` antigo, com texturas pretas. Ele não lista o `-mobile-r2.glb`.
6. **`-mobile.glb` quebrado:** continua no disco, para preservar os hashes, e o jogo não usa mais esse arquivo.

## Arquivos

| Tipo | Arquivos |
| --- | --- |
| Novos | `tools/fix-mobile-glb-textures.py`, `tools/test-poseidon-v15-1-lod.py`, `arena-forge/assets/{poseidon-v13,poseidon-v14,poseidon-v14-1,poseidon-depths-v1,poseidon-depths-v1-1}/guardian-*-mobile-r2.glb`, `docs/poseidon-palace-v15-1.md`, `docs/perf/poseidon-palace-bench-v15-1*.json` e as capturas `v151*` e `v15m*` |
| Alterados | `arena-forge/poseidon-v13-guardian.js` (seleção de LOD e descarte), `arena-forge/poseidon-palace.js` (passa o perfil e guarda a URL), `arena-forge/sculpture-studio/guardian_tides_build.py` (cópia de imagem no estágio mobile), `tools/bench-poseidon-palace.py` (perfil Baixo, versões `v151`, memória e bytes dos guardiões), `tools/capture-poseidon-v15.py` (`--mobile`) e os 5 `SHA256SUMS` (uma linha nova cada) |
