# Poseidon V14 · Guardian of the Tides — polimento da escultura

Data: 08/11/2026. Ambiente: só desenvolvimento. Nada foi publicado.

**Estado:** `STRUCTURE_VALID_ART_REVIEW_PENDING`. A escultura **não está aprovada artisticamente**; a aprovação é do autor.

## O que foi preservado

- A V13 fica intacta:
  - GLBs em `arena-forge/assets/poseidon-v13/`, com hashes conferidos depois do build da V14;
  - `.blend` de origem em `guardian-tides-v13-sculpt.blend` e `guardian-tides-v13-game.blend`;
  - simulação do manto;
  - `?sculptV13=1`.
- A V14 é uma revisão separada:
  - script `arena-forge/sculpture-studio/guardian_tides_v14.py`, que lê a V13 e grava `guardian-tides-v14-sculpt.blend`;
  - GLBs em `arena-forge/assets/poseidon-v14/`.
- A simulação de pano de 1 h 45 **não foi refeita**: a V14 edita a malha já simulada. A etapa de polimento leva cerca de 8 s.
- Não foram usados Higgsfield, Tripo nem APIs de geração 3D.

## Mudanças geométricas (V13 → V14)

| Parte | Mudança |
| --- | --- |
| Corpo | Multires nível 2 aplicado; a malha fica com 169 mil vértices e continua presa ao rig. Edições suaves (gaussianas) na pose de repouso: ombros mais largos, deltoide, peitoral, dorsal (tronco em V), trapézio, pescoço e volume nos braços. Deslocamento máximo de 59 mm no mundo. |
| Rosto | Arco da sobrancelha mais baixo e projetado, ponta interna da sobrancelha baixa, sulcos entre as sobrancelhas, pálpebra funda, maçãs marcadas, face encovada, sulco nasolabial, queixo mais forte e linhas suaves de tensão na testa. Deslocamento máximo de 21 mm no mundo, só na frente do rosto. |
| Cabelo e barba | Gerados na cabeça em repouso; a V13 os gerava na cabeça já posada, o que somava a pose duas vezes. Mechas mais longas e contínuas. Couro cabeludo com espessura de 6 mm: sem ela, o remesh apagava a casca e o topo ficava liso. Linha do cabelo mais baixa e suavizada. Sulcos de cinzel em volta de um eixo baixo, para o redemoinho sair do alto da cabeça. Barba com costeletas, 280 cachos. Nenhuma mecha do couro desce até o ombro. |
| Mão esquerda | Cada falange gira 1,7× o ângulo da V13 em volta do mesmo eixo local. As pontas dos dedos ficam a 6–8 cm da palma; na V13, a cerca de 10 cm. |
| Manto | A ponta do manto é recolhida dentro do punho esquerdo (22 vértices), e o pano dentro da mão não é empurrado para fora. A aba das costas foi aplainada e a barra cai a prumo (a bolsa sumiu). O pano empurrado para fora do corpo novo ganhou suavização local. O solidify foi trocado para espessura simples: o modo uniforme estourava em vincos. |
| Cinto | `TIDES__BELT`: escamas em fileiras desencontradas sobre a borda do himátion. No GLB entra em `TIDES__DETAILS` (ouro). |
| Ondas | Crista principal maior sob o pé (1,3×), uma onda alta atrás da perna esquerda e uma terceira que envolve a base pelos lados e por trás, com espaços negativos. |
| Hipocampo | Modelado (`hippocampus()`), mas **fica desligado** (`HIPPO_ON = False`). Na argila ele lia como lagarto. A vieira da V13 volta ao painel da frente. |

## Quality gate de argila

Fica em `docs/img/sculpture-studio/v14/`. Mesma câmera, escala e luz para V13 e V14 (`gate_compare.py`).

| Imagens | O que mostram |
| --- | --- |
| `compare-frente`, `compare-costas`, `compare-esquerda`, `compare-direita`, `compare-tres-quartos` | V13 e V14 lado a lado, corpo inteiro |
| `compare-folha-corpo` | As 5 vistas inteiras: V13 em cima, V14 embaixo |
| `compare-torso-frente` | Torso |
| `compare-rosto-frente`, `compare-rosto-tres-quartos`, `compare-rosto-perfil` | Rosto |
| `compare-mao-direita`, `compare-mao-esquerda` | Mãos |
| `compare-pedestal`, `compare-pedestal-frente` | Pedestal |
| `compare/` | Os quadros soltos de cada versão |

## Materiais e LODs

O build é `guardian_tides_build.py -- --stage game-v14`. Usa os mesmos materiais e o mesmo acabamento pintado da V13, com atlas em uma camada UV.

| | V13 | V14 |
| --- | --- | --- |
| LOD0 | 28.509 tri | 29.182 tri (GLB) |
| LOD1 | 8.570 tri | 8.742 tri |
| LOD2 | 2.091 tri | 2.566 tri |
| Mobile | LOD1 + 512² | LOD1 + 512² |
| Caixa | 3,41 × 9,90 × 2,98 m | 3,37 × 9,90 × 3,34 m (a onda que envolve a base alarga a profundidade) |
| Malhas, materiais | 9, 3 | 9, 3 |

**Hashes (SHA-256, `arena-forge/assets/poseidon-v14/SHA256SUMS`):**

| GLB | SHA-256 |
| --- | --- |
| `guardian-tides-lod0.glb` | `4c154e0f941686e33e8fd13765254277ceee0a569737074d3fa7c587ad78cb2e` |
| `guardian-tides-lod1.glb` | `a490efe6d32e0847c2f27d2a912c8f3e0e1f4d8bc3a810e9346f3f56d85e6ad8` |
| `guardian-tides-lod2.glb` | `1c059e5e779e7b7c6981f0442d62c012d32d06bb8f4195d8e20999c4d8020b9b` |
| `guardian-tides-mobile.glb` | `6527cb3c489a241b32eb9cbad0e99e76d796115409c66a0279c964168324ac5f` |

**Normais corrigidas no bake** (raio que errou o high poly, trocado por normal plana):

| Material | V14 | V13 |
| --- | --- | --- |
| Marfim | 6–11 % | 7–11 % |
| Mármore | 8–26 % | 8–25 % |
| Ouro | 1,5–1,8 % | cerca de 1 % |

**Correções no build** (a V13 gera o mesmo resultado):

- O corpo sem multires é aceito.
- O cinto e o hipocampo entram nas partes.
- A decimação repete até 4 passadas, e a maior ilha nunca é descartada.
- Com cinto, cada peça de `DETAILS` tem a sua cota (coroa 45 %, cinto 35 %, ouros 20 %). Antes, o corte de ilhas jogava fora a coroa e os ouros.
- O cinto passa por remesh antes de decimar, porque não era manifold.

**Capturas com material:** `material-frente`, `-costas`, `-esquerda`, `-direita`, `-tres-quartos` (inspetor, LOD0 da V14).

## No mundo e no inspetor

| Onde | Como |
| --- | --- |
| Mundo | `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV14=1`. Usa o mesmo leitor e a mesma posição da V13. `?sculptV13=1` continua carregando a V13. Sem flag, nada carrega. |
| Inspetor | STAR HILL → Arena Forge → Sculpture Studio. O seletor de GLB tem `V14 · LOD0/LOD1/LOD2/Mobile`, e a tabela de LODs lê os 8 arquivos. |
| Capturas da cinemática | `mundo-cinematica-chave0/1/2.png` e `mundo-partida.png` em `docs/img/sculpture-studio/v14/` |

A câmera competitiva não mudou (FOV 42, (0, 13.5, 13)). HUD, cartas e lógica não foram tocados.

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/poseidon-v13-audit-glb.py` nos 4 GLB da V14 | `STRUCTURE_VALID_ART_REVIEW_PENDING`, sem avisos, sem extensões obrigatórias |
| `tools/test-sculpture-v14.py` (Playwright, Three.js real) | 8 ok, sem erros de página. Confere: 9 partes, orçamento, escala, 5 vistas com material, tabela com os 4 GLB, carga com `?sculptV14=1`, chaves 0–2 e partida, câmera competitiva. |
| `tools/test-sculpture-studio.py` (regressão V13) | 15 ok, sem erros de página |
| Hashes dos GLBs da V13 depois do build da V14 | Iguais |

## Limitações (registradas sem maquiagem)

1. **Anatomia e rosto.** São edições paramétricas sobre a base CC0, não escultura manual. O rosto lê mais velho e severo, mas a expressão ainda é de malha base.
2. **Cabelo.**
   - O topo lê como massa entalhada em placas, não como mechas penteadas.
   - Na vista 3/4 aparece uma fresta escura sob a borda da linha do cabelo (a casca fica alguns milímetros acima da pele).
   - Uma tira estreita da borda desce pela têmpora.
3. **Mão esquerda.** Fecha e prende a ponta do manto, mas a pegada ainda é leve. O tecido não forma um feixe torcido saindo do punho.
4. **Hipocampo.** Desligado por falta de qualidade. O cavalo-marinho exige modelagem manual.
5. **Onda alta atrás da perna.** Pode ler como concha ou barbatana. Precisa do olhar do autor.
6. **Cinemática.** Nas chaves 0–2 o guardião é legível, mas pequeno perto do templo. **Não há luz local.**
   - O Three.js enxuto do jogo (`playtest/divine/vendor/three-0.160.0-slim.js`) não tem SpotLight nem PointLight, e uma DirectionalLight acenderia o palácio inteiro.
   - Testei um contorno de fresnel só no material da estátua, primeiro frio e depois quente. Os dois tiravam contraste contra o mármore claro do templo e acendiam a barra do pano. Foi revertido.
   - Luz local de verdade exige pôr SpotLight no build enxuto (`tools/three-slim.entry.js`). É um arquivo compartilhado por todo o jogo, então fica para a decisão do autor.
   - A composição e a escala não mudaram.
7. **Texturas.** Valem as mesmas limitações da V13: atlas automático com ilhas pequenas, parte do relevo fino do mármore perdida nas normais corrigidas e AO só de cavidade.

## Próximos passos (decisão do autor)

1. Revisão artística das folhas de argila e das capturas com material.
2. Decidir sobre a luz local da cinemática, o hipocampo manual e a onda alta.
3. Só depois disso, pensar em ligar o guardião fora da flag de desenvolvimento.
