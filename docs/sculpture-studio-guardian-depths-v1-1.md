# Poseidon · Guardião das Profundezas V1.1 — passada escultórica e integração no palácio

Data: 08/11/2026. Só desenvolvimento. Nada foi enviado ao remoto nem publicado.

**Estado:** `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING`. A V1.1 **não está aprovada artisticamente** e aguarda a revisão do autor. Ela parte da V1; o personagem não foi refeito. Pose, silhueta aprovada, tridente, capa e pedestal continuam os mesmos.

**Preservado, com os hashes conferidos depois do trabalho:**

| Versão | GLBs | Conferência |
| --- | --- | --- |
| Guardião das Marés V13, V14 e V14.1 | 4 cada | Hashes iguais. A V14.1 foi refeita com o build novo e saiu idêntica, porque o build compartilhado mudou. |
| Guardião das Profundezas: argila e V1 | os da pasta | Hashes iguais. Os `.blend` de origem também ficaram: `guardian-depths-clay.blend` e `guardian-depths-v1-sculpt.blend`. |

## Quality gate de argila (V1 × V1.1)

Os 15 quadros usam a mesma câmera, a mesma escala e a mesma luz nas duas versões. A câmera é fixa e os focos vêm do rig:

| Grupo | Quadros |
| --- | --- |
| Corpo inteiro | frente, costas, as duas laterais, três quartos |
| Cabeça | rosto, perfil, cabelo |
| Mãos | mão de comando, mão do tridente |
| Roupa | cinto, saia, capa |
| Base | pedestal, ondas |
| Silhueta | silhueta em preto |

Folha consolidada: `docs/img/sculpture-studio/guardian-depths/gate/folha-v1-x-v1-1.png`. Cada quadro também tem a sua folha, `gate/compare-<quadro>.png`.

Geradores:

```bash
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_depths.py -- v1-1
"$B" -b --factory-startup --python arena-forge/sculpture-studio/guardian_depths.py -- gate <arquivo.blend> <tag>
python3 arena-forge/sculpture-studio/sheet_ab.py --gate docs/img/sculpture-studio/guardian-depths/gate v1 v1-1
```

O primeiro comando gera a V1.1 e o gate dela. O segundo gera o gate de qualquer versão. O terceiro monta as folhas.

O gate rodou cinco vezes antes do bake. Problemas que apareceram no caminho e foram corrigidos antes dos materiais:

| Rodada | O que estava errado | Correção |
| --- | --- | --- |
| 1 | As ondas viraram colunas caneladas. | Subida em arco inclinado. |
| 2 | As ondas viraram espirais em camadas, que liam como pergaminho. | Crista que tomba, sem espiral completa. |
| 3 | O lábio da onda rasgava no remesh. | Espessura mínima de 3 voxels. |
| 4 | As pontas das ondas dobravam sobre si. | Só as pontas baixam. |
| Faixa | Saía em zigue-zague. | A tangente passou a vir da linha suave. |
| Cabelo | Havia uma mecha solta na orelha e o coque tinha uma haste. | Filtro de mechas e coque sem haste. |

## O que mudou (V1 → V1.1)

| Parte | V1.1 |
| --- | --- |
| **Rosto (P0)** | **15 planos escultóricos na malha base, sem textura:** arco da sobrancelha forte e baixo; cabeça da sobrancelha descendo (expressão severa); vinco entre as sobrancelhas; pálpebra funda; maçã do rosto alta com cavidade abaixo; dorso do nariz reto, grego; asas do nariz; sulco nasolabial; lábio de cima fino; cantos da boca para baixo; queixo quadrado e à frente; ângulo da mandíbula marcado; testa cheia; têmpora funda. **Deslocamento máximo:** 31,5 mm na escala do mundo. **Leitura:** vigilância e autoridade, sem caricatura, de frente, de perfil e de três quartos. |
| **Cabelo** | **Mechas:** 84, mais grossas e penteadas para trás, com sulco raso; antes eram 90 finas com 22 sulcos fundos, que liam como trança ou capacete. **Mecha na orelha:** nenhuma mecha passa à frente da orelha abaixo da linha do cabelo. **Coque:** liso, uma mecha enrolada em espiral e subdividida; o anterior era um bloco facetado. |
| **Ondas** | **Saíram** a serpente d'água e as duas volutas tubulares. **Entraram** duas ondas de crista larga: cada uma nasce de dentro do topo, sobe em arco inclinado, tomba com lábio fino e deixa um vão embaixo. **Seção da onda:** levemente côncava na subida, com sulcos rasos no sentido do movimento. **Forma da crista:** mais alta no meio. **Ligação ao pedestal:** atrás há uma ondulação baixa com perfil próprio, que liga as duas massas. A onda grande, do lado do tridente, quebra para fora; a pequena quebra para o lado de dentro. |
| **Pedestal** | **Friso entalhado:** ondas vitruvianas em volta do tambor, logo abaixo da cornija. **Como chega ao jogo:** o friso fica só no high poly e entra nos LODs pelo bake de normais (`somenteAlta`); a malha do tambor no jogo não cresce. **Contato:** a água baixa continua presa dentro da laje. |
| **Saia** | **Pregas** de profundidade variada e assimétricas, em três frequências. **Pano esticado** sobre a coxa da frente. **Cintura** comprimida. **Abertura** sobre o joelho dobrado e barra irregular controlada. **Cone:** a abertura da saia caiu de 7 para 5 cm, para não ler como cone. |
| **Capa** | **Espessura:** 2 cm, antes 1,1 cm. **Dobras:** grandes, com duas frequências, e mudam de direção para baixo. **Fixação:** franzido curto nos pontos de fixação. **Barra:** gira para fora. Sem simulação longa: a capa é editada sobre a folha paramétrica. |
| **Cinto** | **Pregas:** passa por cima delas, sem serrilha na borda. **Medidas:** um pouco mais largo e mais grosso. **Fivela:** concha maior e entrando no cinto. |
| **Faixa a tiracolo** | Faixa chata e larga, assentada na pele inclusive nas bordas; antes lia como mangueira. |
| **Mão de comando** | Dedos juntos e um pouco curvados, polegar solto: gesto de autoridade, não garra. A mão do tridente continua fechada no cabo. |

## Build e Sculpture Studio

O build continua genérico, e tudo o que é das Profundezas está no JSON do projeto. Duas melhorias genéricas, testadas também nas Marés, cuja V14.1 saiu idêntica:

- **`somenteAlta`:** objetos do high poly que só entram no bake, como relevo fino. Sem isso, o friso denso travava a decimação e o tambor do LOD sumia, ficando com 122 triângulos.
- **Opções novas no `sculpt_kit`, com padrões que não mudam a V1:**
  - `envelope_skirt` e `sheet`: `fold_fn`;
  - `strap`: `envelope`;
  - `ribbon`: `smooth` e `conform`.

| | V1 | V1.1 |
| --- | --- | --- |
| LOD0 | 28.993 | 28.994 |
| LOD1 | 8.692 | 8.696 |
| LOD2 | 2.679 | 2.584 |
| Mobile | LOD1 + 512² | LOD1 + 512² |
| Tamanho do LOD0 | 3,48 MB | 3,49 MB |

**Normais corrigidas no bake do marfim:** de 9,1 % na V1 para 8,2 % na V1.1.

**Hashes (`arena-forge/assets/poseidon-depths-v1-1/SHA256SUMS`):** 

| GLB | SHA-256 |
| --- | --- |
| `guardian-depths-lod0.glb` | `47791460ee7281cd2c26594b36fe9a82c16aa283e032821a3c38041b4f07de14` |
| `guardian-depths-lod1.glb` | `499f63abcb4075634c030e70dbeb41e7ea6df67ae35ebc841df9451eabb25835` |
| `guardian-depths-lod2.glb` | `907670d4dcb78c609d4a8351490dc49002eb1f37a40abe5deaab75867c4ef9bb` |
| `guardian-depths-mobile.glb` | `44de9eff8a98e23fe9cc494522006031da73c19c62872a50d772847f298071c2` |

**No Sculpture Studio:**

- **Inspetor:** as opções `Profundezas V1.1 · LOD0/LOD1/LOD2/Mobile`, com giro 360°, argila, material e wireframe.
- **Homologação:** compara com a V1 e mostra o histórico de versões (argila, V1, V1.1).

## No palácio

- **Flag:** `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV141=1&sculptDepthsV11=1`.
- **Grupo:** as duas esculturas entram no mesmo grupo do palácio, e o teste confere isso.
- **Câmera competitiva:** não mudou. As esculturas não foram levadas para o battlefield.
- **Outras flags:** `?sculptDepthsV1=1` continua carregando a V1, e `?sculptDepthsClay=1` a argila. Sem flags, nada carrega.

**Capturas em `docs/img/sculpture-studio/guardian-depths/`:**

| O que mostra | Arquivos |
| --- | --- |
| Cinemática | `v1-1-mundo-chave0/1/2.png` |
| Close de cada guardião | `v1-1-mundo-close-profundezas.png`, `v1-1-mundo-close-mares.png` |
| As duas esculturas | `v1-1-mundo-duas.png` |
| Partida | `v1-1-mundo-partida.png`, `v1-1-partida-cartas.png` |
| Celular | `v1-1-celular.png` |

**Métricas reais** (`v1-1-metricas.json`). Ms de GPU por quadro medidos com `scene.bench(30)`, mediana de 3 rodadas, em 1600 × 900, no Mac de desenvolvimento:

| Cenário | GPU, chave 1 | GPU, partida | Draw calls (chave 1 / partida) | Texturas (chave 1) |
| --- | --- | --- | --- | --- |
| Sem esculturas | 5,66 ms | 3,44 ms | 199 / 125 | 9 |
| V14.1 + V1 | 5,46 ms | 3,30 ms | 223 / 125 | 27 |
| V14.1 + V1.1 | 8,33 ms | 3,73 ms | 223 / 125 | 27 |

- **As duas esculturas:** somam 24 draw calls e 18 texturas na cinemática.
- **Na partida:** elas ficam fora do quadro e não mudam os draw calls.
- **Variação:** a medida oscila entre rodadas. A V1 saiu mais barata que "sem esculturas", o que é ruído. O 8,33 ms da V1.1 na chave 1 é uma só sessão e precisa ser medido de novo antes de qualquer conclusão: a geometria e as texturas da V1.1 têm o mesmo tamanho das da V1.
- **Carga do GLB local:** de 28 a 95 ms.
- **Celular:** o teste confere que as duas carregam e captura a partida. Não houve medida de FPS em aparelho real.

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/test-sculpture-depths-v1-1.py` (novo) | 12 ok, sem erros de página. Cobre os 4 LODs, a escala, os modos argila, material e wireframe, as duas esculturas no mesmo grupo, as capturas, a câmera, o celular, as métricas, a regressão da flag V1 e o caso sem flags. |
| `tools/sculpture-homologate.py guardian-depths --testes 8770` | `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING`: 28 verificações e 3 suítes (V1.1 12, V1 9, homologação 15), sem falhas |
| Regressão: Profundezas V1, homologação, Marés V14.1, V14 e V13 | V1 9 ok · homologação 15 ok · V14.1 8 ok · V14 8 ok · V13 15 ok, sem erros de página |
| Hashes da V13, V14, V14.1, argila e V1 | Iguais |

## Limitações (sem maquiagem)

1. **Rosto.** Melhorou muito, mas é edição paramétrica sobre o corpo base CC0, não escultura à mão. Os olhos são esferas lisas, sem íris entalhada. O vinco entre as sobrancelhas pode ler como uma pequena saliência.
2. **Cabelo.** Lê como mechas penteadas pelo vento, mas a superfície do alto ainda é irregular, com caroços. Sobreposição e direção de mecha feitas à mão melhorariam a leitura.
3. **Ondas.** Leem como água que quebra, de perfil e de três quartos. Mesmo assim:
   - de frente, a onda grande atrás da perna tapa parte dela;
   - não há espuma nem relevo fino de fluxo além dos sulcos rasos.
4. **Serpente d'água.** Foi removida, como a direção pediu, porque continuava lendo como tubo. Uma criatura esculpida pode vir depois, como peça própria.
5. **Mão de comando.** Os dedos curvam juntos, mas ainda são finos e um pouco abertos; o corpo base já é assim. Não há ajuste por dedo.
6. **Capa.** A capa tem dobras e espessura, mas é paramétrica, sem simulação. De trás ainda lê como um plano largo com dobras.
7. **Materiais.** São os mesmos shaders e a mesma pintura procedural da V14.1. Não há pintura à mão nas texturas. A bíblia pede textura pintada à mão para o final; isso continua pendente.
8. **Performance.** Veja a nota sobre a variação das medidas acima. Não houve medida em celular real.

## Próximo passo

A revisão artística da V1.1 cabe ao autor, na aba Homologação, com a folha `gate/folha-v1-x-v1-1.png` e as capturas `v1-1-*`. A fase "Poseidon Palace — Final Environment Art Pass" não começou.
