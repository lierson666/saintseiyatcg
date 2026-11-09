# Poseidon V15.2: ciclo de vida das esculturas, LOD dinâmico e portão de qualidade do celular

Data: 08/11/2026. Branch `olympus-arena`, base `09341d7`. Só desenvolvimento: nada foi enviado ao remoto nem publicado.

**Estado:** V15.2 TECHNICALLY_VALIDATED. A arte continua ART_REVIEW_PENDING, inclusive a revisão r2 da coroa (nada foi promovido a ART_APPROVED).

## 1. Auditoria (ponto de partida, V15.1)

| Ponto | Encontrado |
| --- | --- |
| Seleção de LOD | `sculptLodUrl()` escolhia o arquivo uma vez, na abertura da cena. Trocar o perfil depois não trocava o GLB |
| Ciclo de vida | Cada guardião era um `loadGuardianTides` solto, sem estado, sem contagem de referência e sem política de residência. Os dois ficavam carregados a partida toda |
| Catálogo | Não existia. O Sculpture Studio listava o `-mobile.glb` antigo (texturas pretas) como variante normal e não listava o `-mobile-r2.glb` |
| Homologação | Não olhava o conteúdo dos mapas: o `-mobile.glb` preto passava |
| Coroa do Guardião das Marés | No LOD1 (Medium e celular) a decimação proporcional deixava a peça DETAILS (coroa de louros) com 642 triângulos: a coroa virava fragmentos soltos |

## 2. Catálogo de variantes

**Fonte da verdade:** o campo `variantes` de cada versão em `arena-forge/sculpture-studio/projects/*.json` (lod0, lod1, lod2, mobile → arquivo). Arquivos preservados só por histórico ficam em `legado`, com estado e motivo, e nunca são elegíveis.

`tools/sculpture_catalog.py` mede tudo no próprio GLB e grava `arena-forge/assets/sculpture-catalog.json`:

- projeto, versão, LOD, arquivo, triângulos, número de texturas e maior resolução;
- memória estimada das texturas (largura × altura × 4 × 1,33 de mipmaps; estimativa, não memória de GPU real);
- SHA-256, conferido com o `SHA256SUMS` da pasta do arquivo;
- orçamento de triângulos e de textura do projeto;
- integridade de cada mapa;
- estado técnico (TECHNICALLY_VALIDATED, REJECTED, LEGACY_DEFECTIVE ou LEGACY), `elegivel` e estado artístico.

`--check` só confere e sai com erro se uma variante elegível tiver problema.

**Verificação de textura preta (`map_integrity`):** separa o mapa escuro de propósito do mapa vazio ou quebrado.

| Caso | Resultado |
| --- | --- |
| Imagem constante com cor de normal plano (128, 128, 255) | ok: normal plano é válido |
| Imagem constante preta | PRETO |
| Qualquer outra imagem constante | VAZIO |
| Média de todos os canais abaixo de 8 | PRETO |
| Mesma imagem existe no LOD0 com luminância acima de 25 e esta tem menos de 30 % dela | DIVERGENTE |
| Mapa declarado em `build.pretoIntencional` do projeto | ignorado (preto de propósito) |

Um mapa escuro com textura passa: escuro de propósito tem variação, defeito não tem.

**Resultado:** todas as variantes elegíveis estão ok. Os 5 `-mobile.glb` antigos (V13, V14, V14.1, Profundezas V1 e V1.1) aparecem como LEGACY_DEFECTIVE, com 6 mapas PRETO cada, e não são elegíveis. A variante `mobile` de cada versão aponta para o `-mobile-r2.glb` (ou, na V14.1 das Marés, para a revisão r2 abaixo).

| Escultura | Versão | lod0 | lod1 | lod2 | mobile |
| --- | --- | --- | --- | --- | --- |
| Marés | v14-1 | 29 203 tri · 2048 px · 143,6 MB | **9 115** · 1024 · 35,9 | 2 933 · 1024 · 35,9 | **9 115** · 512 · 12,0 |
| Profundezas | v1-1 | 28 966 · 2048 · 143,6 | 8 668 · 1024 · 35,9 | 2 556 · 1024 · 35,9 | 8 668 · 512 · 12,0 |

## 3. Sculpture Manager

`arena-forge/sculpture-manager.js`, reutilizável por qualquer arena. `createSculptureManager(THREE, {parent, baseUrl, profile, lodOverride})`.

**Por escultura:** id estável, projeto, versão, variantes, estado, motivos de residência, nó na cena, URL e LOD pedido e carregado, geração, última carga, último descarte e erro.

| Estado | Quando |
| --- | --- |
| UNLOADED | Registrada, nada carregado |
| LOADING | Primeira carga em voo |
| READY | Uma variante na cena |
| SWAPPING | Variante nova carregando com a antiga visível |
| ERROR | Nada carregado e a última carga falhou |
| DISPOSING | Soltando os recursos (síncrono) |

**Regras:**

- **Perfil → variante:** Ultra e High = `lod0`, Medium = `lod1`, Low = `lod2`, phone = `mobile` (o `-mobile-r2`). Sem a variante, cai para a próxima (`mobile → lod1 → lod0`, `lod2 → lod1 → lod0`).
- **Troca atômica:** a variante nova carrega com a antiga visível. Pronta, entra na mesma posição, rotação e visibilidade, e a antiga sai no mesmo quadro.
- **Falha:** a variante anterior continua na cena e o erro fica em `error` e no histórico. Sem variante anterior, o estado vira ERROR.
- **Concorrência:** cada pedido leva uma geração. Resposta de geração velha é descartada e solta o recurso. High → Low → High → phone termina em phone, com no máximo 2 modelos vivos durante a troca.
- **Recursos:** um GLB por URL, contado por referência. Duas esculturas na mesma URL compartilham geometria, material e textura (cada uma recebe um clone dos nós). A URL só é solta quando a última referência sai. Não há carga duplicada nem descarte duplo: o `dispose` do GLB solta cada textura uma vez.
- **Diagnóstico:** `diagnostics()` devolve perfil, recursos vivos (URL, referências, bytes, ms, MB de textura) e cada escultura (estado, pedido, carregado, motivos, última carga, último descarte, erro, geração) e os últimos eventos.

## 4. LOD dinâmico e política de residência

`scene.setQuality(name)` agora chama `environment.setQuality`, que troca as variantes em tempo real. O ajuste automático de qualidade passa pelo mesmo caminho.

| Momento | O que acontece |
| --- | --- |
| Abertura do palácio | Registra os dois guardiões e pede o motivo `cinematic`: carrega só a variante do perfil |
| `scene.cinematic()` | Espera `prepareCinematic()` (guardiões prontos) antes do primeiro quadro: nada aparece do nada |
| Durante a cinemática | Os dois guardiões ficam residentes |
| Fim da cinemática | Modo partida. Perfil diferente de phone: pede `battle`, os guardiões ficam (estão no fundo da câmera competitiva). Solta `cinematic` depois de 1,5 s de folga |
| Celular na partida | Sem `battle`: depois da folga os guardiões são descarregados (geometria, material, textura, ImageBitmap) |
| Reentrada (`poseCinematic(chave)` ou nova cinemática) | `prepareCinematic()` pede `cinematic` de novo e recarrega antes de revelar |
| `noIntro` | Começa sem transição: os guardiões continuam residentes |
| Troca de perfil | `setProfile` troca as residentes e refaz a residência da partida (ex. High → phone na partida descarrega) |

O descarte é síncrono e curto (abaixo de 5 ms, medido abaixo) e acontece fora da câmera, depois da folga: não há travada visível.

## 5. Coroa do Guardião das Marés (revisão r2)

**Causa:** o LOD1 decima cada peça na mesma proporção. A coroa de louros (peça DETAILS) é fina e caiu para 642 triângulos, e os louros se separaram.

**Correção:** orçamento protegido para peças de identidade. `guardian_tides_build.py` ganhou `PROTECT` (cota mínima por peça e LOD) e o estágio `game-v14-1-r2`, que protege `LAUREL` no LOD1 com 60 % da cota do LOD0. DETAILS foi de 642 para 1 046 triângulos. O total do LOD1 sobe de 8 791 para 9 115 (+3,7 %), dentro do orçamento do projeto. O LOD0 e o LOD2 não mudam.

**Nenhum GLB histórico mudou.** A revisão r2 é uma pasta nova com nome e hash próprios:

| Arquivo | Bytes | SHA-256 |
| --- | --- | --- |
| `arena-forge/assets/poseidon-v14-1-r2/guardian-tides-lod1.glb` | 1 627 312 | `0548b90a3b87ce86b7b70d90a9891efe52782f38108662bbdb15c794b9bb2548` |
| `arena-forge/assets/poseidon-v14-1-r2/guardian-tides-mobile.glb` | 832 316 | `70d776a6e134980f51b2feec3b2fc8e87296aa572688195b68dd254ff9e7f5cd` |

O mobile r2 saiu do build corrigido na V15.1 (cópia real de pixels): texturas certas, sem passar pelo script de conserto. Ele é 17 % menor que o `-mobile-r2.glb` da V15.1 (832 316 contra 1 005 228 bytes), porque o build grava as imagens de 512² direto.

No celular a memória não sobe: as texturas continuam 512² (12,0 MB estimados por guardião); só a malha ganha 324 triângulos.

Comparação: `docs/img/poseidon-v15/v15-2-coroa-lods.jpg`. Colunas: LOD0, LOD1 V14.1 antigo, LOD1 r2, LOD2, `mobile-r2` V15.1, mobile r2. Cada coluna mostra o close da cabeça e a distância de jogo. No LOD1 r2 e no mobile r2 a coroa volta a ler como um anel contínuo de louros, perto do LOD0. Estado artístico: ART_REVIEW_PENDING.

## 6. Homologação ampliada

`tools/sculpture-homologate.py`:

- usa as `variantes` do projeto (podem vir de outra pasta, como a r2);
- confere o `SHA256SUMS` de cada pasta envolvida;
- novo item por LOD: `{lod}-mapas`, nenhum mapa vazio, preto ou divergente do LOD0.

O resto continua: integridade do GLB, malhas, materiais, UVs, normais, limites de triângulos, orçamento de textura e silhueta. Os testes de troca dinâmica, recuperação de erro, descarte seguro, memória depois do descarte e ausência de duplicatas estão em `tools/test-poseidon-v15-2-lifecycle.py`.

| Projeto | Resultado |
| --- | --- |
| guardian-tides v14-1 | TECHNICALLY_VALIDATED / ART_REVIEW_PENDING · 33 verificações, 3 testes, 0 falhas |
| guardian-depths v1-1 | TECHNICALLY_VALIDATED / ART_REVIEW_PENDING · 32 verificações, 3 testes, 0 falhas |

Estados possíveis: TECHNICALLY_VALIDATED, ART_REVIEW_PENDING, ART_APPROVED, REJECTED, PUBLISHED. ART_APPROVED só pelo autor.

## 7. Sculpture Studio

`star-hill/sculpture-inspector.js`:

- **Seleção:** o `-mobile.glb` antigo aparece como "legado: texturas pretas, não elegível"; o r2 e o `-mobile-r2` entram na lista.
- **Painel "Catálogo da variante":** projeto, versão, LOD, triângulos, textura, memória estimada, mapas, SHA-256 e homologação da variante aberta.
- **Painel "Runtime · Sculpture Manager":** escolhe o projeto e troca o perfil (Ultra, High, Medium, Low, phone, desligado) sem recarregar a página. A tabela mostra variante pedida e carregada, estado, memória, referências, última carga, último descarte, erro e homologação.

## 8. Testes

| Teste | Resultado |
| --- | --- |
| `tools/test-poseidon-v15-2-lifecycle.py 8770` (novo) | 16 ok |
| `tools/test-poseidon-v15-1-lod.py 8770` (expectativa da Marés atualizada para a r2) | 18 ok |
| `tools/test-poseidon-palace-v15.py 8770 8765` | 11 ok |
| `tools/test-sculpture-depths-v1-1.py` | 12 ok |
| `tools/test-sculpture-v14-1.py` e `test-sculpture-v14.py` | 8 ok e 8 ok |
| `tools/test-sculpture-studio.py` | 15 ok |
| `tools/test-sculpture-homologacao.py` | 15 ok |

O teste novo, com Three.js real no Chrome:

- **A, carga inicial:** catálogo carregado; os dois guardiões READY na variante do perfil; uma referência por URL.
- **B, trocas:** High → Medium (baixa o LOD1 r2), Medium → phone, phone → High, sequência rápida Low/High/phone (termina em mobile, no máximo 2 modelos vivos), falha de rede no `guardian-tides-lod2.glb` (fica no mobile, erro registrado) e recuperação.
- **C, memória:** as 6 texturas do LOD0 soltas depois da troca; zero recursos depois do descarte.
- **D, cinemática:** chaves 0 a 2; no celular o fim da cinemática descarrega depois da folga; na reentrada os guardiões estão READY no primeiro quadro da cinemática (13 a 26 ms medidos).
- **E, partida:** câmera competitiva igual (FOV 42 em 0, 13,5, 13), 40 cartas, nenhum erro de página.
- **F, Sculpture Studio:** o mobile antigo aparece LEGACY_DEFECTIVE com os mapas PRETO; o painel runtime troca lod0 → mobile sem recarregar, com um recurso vivo e a homologação na tabela.

As capturas que as regressões regeram foram restauradas.

## 9. Benchmark V15.1 × V15.2

**Condições.** As duas versões rodam de árvores isoladas, servidas cada uma na sua porta:

- V15.1: `git archive 09341d7`;
- V15.2: a mesma árvore com só os arquivos e trechos deste commit.

Assim, nenhuma alteração de outra sessão que esteja na árvore de trabalho entra na medida. Os perfis são Alto, Médio, Baixo e celular emulado. As vistas são a chave 1 e a partida. Foram 2 rodadas de 10 amostras, intercaladas, rodadas duas vezes: V15.1 primeiro e depois V15.2 primeiro. Na primeira tentativa a ordem fixa criou uma diferença de 1,6 ms que sumiu ao inverter a ordem; por isso as duas ordens ficam registradas.

Arquivos: `docs/perf/poseidon-palace-bench-v15-2.json` (V15.1 primeiro) e `docs/perf/poseidon-palace-bench-v15-2-ordem-inversa.json`. Comando:

```bash
uv run -q --with playwright python tools/bench-poseidon-palace.py 8770 --porta-v151 8771 --porta-v152 8772 --versoes v151,v152 --perfis alto,medio,baixo,celular --vistas chave1,partida --rodadas 2 --amostras 10 --ciclo
```

**Tempo de GPU do mundo (medido, mediana em ms; V15.1 → V15.2):**

| Perfil | Chave 1, V15.1 primeiro | Chave 1, V15.2 primeiro | Partida, V15.1 primeiro | Partida, V15.2 primeiro |
| --- | --- | --- | --- | --- |
| Alto | 13,74 → 13,50 | 10,91 → 10,78 | 4,77 → 4,89 | 5,09 → 5,08 |
| Médio | 8,04 → 7,90 | 7,24 → 7,67 | 3,26 → 3,76 | 3,97 → 4,80 |
| Baixo | 5,02 → 5,12 | 5,06 → 5,35 | 2,50 → 2,59 | 2,96 → 3,20 |
| Celular | 3,44 → 3,46 | 3,85 → 3,95 | 1,98 → 1,85 | 1,81 → 1,87 |

A diferença entre as duas ordens (ex. Alto chave 1: 13,7 contra 10,9 ms) é maior que a diferença entre as versões: é o ruído da máquina. A V15.2 não tem ganho nem perda de tempo de quadro que se sustente nas duas ordens.

A única diferença que aparece nas duas ordens é a partida no Médio, de +0,5 e +0,8 ms. Draw calls e triângulos são idênticos nas duas versões (92 e 122 354): os guardiões ficam fora do quadro da câmera competitiva e o manager não roda nada por quadro. As faixas mínimo–máximo se sobrepõem (2,7–3,7 contra 2,8–4,2; 2,7–5,5 contra 3,8–6,3). Fica registrada como ruído não explicado, não como ganho nem perda. **Não há afirmação de ganho de FPS.**

**Contagens no quadro (medidas no contexto WebGL, iguais nas duas ordens):**

| Perfil | Draw calls (chave 1 / partida) | Triângulos na chave 1 | Textura dos guardiões (estimada) | Textura do palácio (estimada) | Geometria |
| --- | --- | --- | --- | --- | --- |
| Alto | 227 / 95 → igual | 192 886 → igual | 287 MB → igual | 313,5 MB → igual | 4,5 MB → igual |
| Médio | 225 / 92 → igual | 152 104 → **152 428** (coroa r2) | 71,8 MB → igual | 89,1 MB → igual | 2,8 → 2,9 MB |
| Baixo | 206 / 86 → igual | 51 520 → igual | 71,8 MB → igual | 84,8 MB → igual | 1,6 MB → igual |
| Celular | 129 / 56 → igual | 47 512 → igual | 23,9 MB → igual | 36,9 MB → igual | 2,2 MB → igual |

No celular os triângulos na chave 1 ficam iguais: o enquadramento corta parte dos guardiões.

**Download do Guardião das Marés (medido no arquivo):**

| Perfil | V15.1 | V15.2 |
| --- | --- | --- |
| Médio | 1 599 072 bytes | 1 627 312 bytes (+1,8 %) |
| Celular | 1 005 228 bytes | 832 316 bytes (−17 %) |

O total do celular (os dois guardiões) cai de cerca de 1,91 para 1,74 MB.

**Carga da página até os guardiões prontos (servidor local, segundos):** 0,5 a 1,3 nas duas versões, sem diferença.

**Ciclo de vida, só V15.2 (medido; 4 ciclos por perfil, mínimo–máximo em ms):**

| Perfil | Troca para outro perfil | Troca de volta | Descarte dos dois guardiões | Reentrada (pronto para a cinemática) |
| --- | --- | --- | --- | --- |
| Alto | High → Medium: 31–59 | Medium → High: 64–81 | 4,5–7,3 | 57–87 |
| Médio | Medium → High: 85–115 | High → Medium: 29–43 | 1,4–2,7 | 21–30 |
| Baixo | Low → High: 80–148 | High → Low: 24–34 | 1,8–2,4 | 18–24 |
| Celular | phone → Low: 19–43 | Low → phone: 14–19 | 0,6–0,9 | 12–17 |

Depois de cada descarte ficam 0 recursos vivos. Depois da reentrada ficam 2, um por guardião, na variante do perfil.

Sobre os tempos:

- **Troca:** inclui baixar e decodificar o GLB novo num servidor local. Durante a troca a variante antiga continua visível.
- **Descarte:** é síncrono, e o pior caso é 7,3 ms com os dois LOD0 de 2048².
- **Reentrada:** é o tempo de `prepareCinematic()` até os dois guardiões ficarem READY. A cinemática só começa depois dele.

A V15.1 não tem troca, descarte nem reentrada para comparar: ela carregava uma vez e mantinha tudo até sair da cena.

## 10. Limitações

1. **Tempo de troca medido em servidor local.** Numa rede de celular a troca leva o tempo do download do GLB novo; enquanto isso a variante antiga continua na cena.
2. **Celular sem guardiões na partida.** É o comportamento pedido para economizar memória. Se a câmera competitiva do celular vier a mostrar os guardiões, basta pedir `battle` também no phone.
3. **Memória de GPU é estimativa.** O navegador não expõe a memória real; os números são largura × altura × 4 × 1,33.
4. **Coroa r2 só na V14.1 das Marés.** As versões V13 e V14 e as Profundezas não mudaram (as Profundezas não têm peça de identidade fina perdida no LOD1).
5. **`-mobile.glb` antigos ficam no disco** com o hash original, marcados LEGACY_DEFECTIVE no catálogo.

## Arquivos

| Tipo | Arquivos |
| --- | --- |
| Novos | `arena-forge/sculpture-manager.js`, `tools/sculpture_catalog.py`, `arena-forge/assets/sculpture-catalog.json`, `arena-forge/assets/poseidon-v14-1-r2/` (LOD1, mobile, `guardian-tides-build.json`, `SHA256SUMS`), `tools/test-poseidon-v15-2-lifecycle.py`, `docs/poseidon-palace-v15-2.md`, `docs/perf/poseidon-palace-bench-v15-2*.json`, `docs/img/poseidon-v15/v15-2-coroa-lods.jpg` |
| Alterados | `arena-forge/poseidon-palace.js` (manager e residência), `arena-forge/poseidon-v13-guardian.js` (versão e override exportados), `playtest/divine/scene.js` (ganchos de cinemática e qualidade), `star-hill/sculpture-inspector.js` (catálogo e runtime), `star-hill/arena-forge.js` (versão do import), `arena-forge/sculpture-studio/guardian_tides_build.py` (`PROTECT` e estágio r2), `arena-forge/sculpture-studio/projects/guardian-tides.json` e `guardian-depths.json` (variantes, legado, revisão r2), as homologações dos dois projetos, `tools/sculpture-homologate.py` (variantes e mapas), `tools/test-poseidon-v15-1-lod.py` (expectativa r2), `tools/bench-poseidon-palace.py` (`v152`, `--porta-v151`, `--ciclo`) |
