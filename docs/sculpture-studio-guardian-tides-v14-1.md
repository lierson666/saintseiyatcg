# Poseidon V14.1 · Guardian of the Tides — polimento final da escultura

Data: 08/11/2026. Ambiente: só desenvolvimento. Nada foi publicado nem commitado.

**Estado:** `STRUCTURE_VALID_ART_REVIEW_PENDING`. A V14.1 **não está aprovada artisticamente** e aguarda a revisão do autor antes de ser promovida.

**Base:** `docs/art-bible/POSEIDON_V14_ART_REVIEW_DECISIONS.md`.

## O que foi preservado

- **V13 e V14 ficam intactas.** Os hashes dos 8 GLBs foram conferidos antes e depois do build e são os mesmos. Os `.blend` de origem e as flags `?sculptV13=1` e `?sculptV14=1` não mudaram.
- **A V14.1 é uma revisão separada:**
  - script `arena-forge/sculpture-studio/guardian_tides_v14_1.py`, que lê `guardian-tides-v14-sculpt.blend` e grava `guardian-tides-v14-1-sculpt.blend`;
  - GLBs em `arena-forge/assets/poseidon-v14-1/`;
  - flag `?sculptV141=1`.
- **Simulação do pano:** não foi refeita. A V14.1 edita a malha já simulada, e a etapa leva cerca de 5 s.
- **O que não mudou:**
  - corpo, rosto, barba, bigode, cinto, pedestal, tridente e o resto do manto;
  - o hipocampo continua desligado;
  - a câmera competitiva, o HUD, as cartas e a lógica;
  - o Three.js compartilhado, e nenhum Fresnel foi acrescentado.
- **Não foram usados** Higgsfield, Tripo nem APIs de geração 3D.

## Mudanças (V14 → V14.1)

| Parte | Mudança |
| --- | --- |
| Cabelo: linha do cabelo | A casca era um degrau de cerca de 1 cm acima da pele, o que deixava uma fresta escura e uma tira na têmpora. Agora a espessura cai em rampa de 3 cm até zero, e a borda entra 0,8 mm na pele. A rampa vale na testa e nas têmporas; a nuca e a barba não mudam. |
| Cabelo: têmpora | Nenhuma mecha passa à frente da orelha abaixo da linha do cabelo, o que remove a mecha solta. As mechas de trás da orelha ficam. |
| Cabelo: topo | Os sulcos ficaram mais finos e rasos: 28 sulcos de 5 mm, contra 18 de 7,5 mm na V14. A massa acima da coroa foi alisada, o que tira a leitura de placas. |
| Barba | Igual à V14. O cabelo é gerado de novo com a mesma semente e com os mesmos parâmetros que consomem o gerador aleatório, então os 280 cachos e o bigode saem idênticos. |
| Mão esquerda e manto | As 6 primeiras fileiras da borda do manto foram enroladas dentro do punho. **Contato:** o raio de cada ponto é medido por um raio lançado do eixo do punho até a pele dos dedos, menos meia espessura do pano; houve 54 pontos de contato. **Compressão:** onde o raio escapa entre os dedos, o pano estufa, em 69 pontos. **Ponta:** cerca de 40 % da borda sai pelo lado do mindinho como uma ponta pregueada que pende. **Transição:** as 5 fileiras seguintes fazem a passagem, com suavização local, e o pano é empurrado para fora do corpo. |
| Onda traseira | Foi refeita. Ela corre da borda (+X) para o centro, atrás do pé esquerdo. **Perfil:** rampa longa nas costas, crista que tomba para a frente, lábio caído sobre o vão (o tubo da onda) e base que se funde na crista principal. **Altura:** assimétrica; fecha rápido na borda, culmina a 25 % do caminho e desce devagar até se fundir na crista. **Superfície:** acima de 8 cm saíram as linhas horizontais entalhadas, que liam como costelas de concha. **Pé de apoio:** a crista sob o pé é a mesma da V14. |

## Quality gate de argila (V14 × V14.1)

As imagens ficam em `docs/img/sculpture-studio/v14-1/`. As duas versões foram renderizadas com a mesma câmera, escala e luz (`gate_compare.py -- <blend> <tag> <pasta>`).

| O que mostra | Imagens |
| --- | --- |
| Cabelo | `compare-rosto-tres-quartos`, `compare-rosto-perfil`, `compare-rosto-frente`, `compare-rosto-costas` |
| Mão | `compare-mao-esquerda`, `compare-mao-esquerda-frente` |
| Onda | `compare-onda-lado`, `compare-onda-costas`, `compare-pedestal`, `compare-pedestal-frente` |
| Silhueta geral | `compare-folha-corpo` (V14 em cima, V14.1 embaixo), `compare-frente`, `compare-costas`, `compare-esquerda`, `compare-direita`, `compare-tres-quartos` |

`gate_compare.py` ganhou quatro quadros novos (`rosto-costas`, `mao-esquerda-frente`, `onda-lado`, `onda-costas`), além de pasta e versões opcionais. Sem argumentos, continua gerando as folhas V13 × V14 como antes.

## Materiais e LODs

O build é `guardian_tides_build.py -- --stage game-v14-1`, com os mesmos materiais e o mesmo acabamento da V14.

| | V14 | V14.1 |
| --- | --- | --- |
| LOD0 | 29.182 tri | 29.594 tri |
| LOD1 | 8.742 tri | 8.896 tri |
| LOD2 | 2.566 tri | 2.576 tri |
| Mobile | LOD1 + 512² | LOD1 + 512² |
| Malhas, materiais | 9, 3 | 9, 3 |

**Normais corrigidas no bake** (ficaram na mesma faixa da V14):

| Material | Faixa |
| --- | --- |
| Marfim | 6–11 % |
| Mármore | 8–24 % |
| Ouro | 1,1–1,6 % |

**Hashes (SHA-256, `arena-forge/assets/poseidon-v14-1/SHA256SUMS`):**

| GLB | SHA-256 |
| --- | --- |
| `guardian-tides-lod0.glb` | `878d7bedf5940f51bc6a36824cd6f37eb3f8519e679606617ab908e273d56009` |
| `guardian-tides-lod1.glb` | `851f1d0e58af42f23e6ebd97f33bbdea7756f795d57a95355c6f8b1a915c4d7d` |
| `guardian-tides-lod2.glb` | `583c685c1a1b46251ece49286a20378aa67548da6de2c2d59e57ddfdc269dce9` |
| `guardian-tides-mobile.glb` | `0280a5ef3cee970b2df4b8c4a916f9469949065f57d06b87f9ec55ef60b4068c` |

## No mundo e no inspetor

| Onde | Como |
| --- | --- |
| Mundo | `playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV141=1`. Usa o mesmo leitor e a mesma posição da V13 e da V14. |
| Inspetor | STAR HILL → Arena Forge → Sculpture Studio. O seletor de GLB ganhou as opções `V14.1 · LOD0`, `LOD1`, `LOD2` e `Mobile`. |
| Capturas | `material-*.png`, `mundo-cinematica-chave0/1/2.png` e `mundo-partida.png` em `docs/img/sculpture-studio/v14-1/` |

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/poseidon-v13-audit-glb.py` nos 4 GLBs da V14.1 | `STRUCTURE_VALID_ART_REVIEW_PENDING`, sem avisos e sem extensões obrigatórias |
| `tools/test-sculpture-v14-1.py` (novo) | 8 ok, sem erros de página |
| `tools/test-sculpture-v14.py` | 8 ok, sem erros de página |
| `tools/test-sculpture-studio.py` (regressão da V13) | 15 ok, sem erros de página |
| Hashes dos GLBs da V13 e da V14 depois do build | Iguais |

O `test-sculpture-v14.py` grava de novo as capturas em `docs/img/sculpture-studio/v14/`. Como os GLBs da V14 são os mesmos, as capturas não mudam de conteúdo.

## Limitações (sem maquiagem)

1. **Nuca.** A parte de baixo do cabelo, atrás, ficou mais lisa que na V14, porque os sulcos estão mais rasos. As pontas das mechas ainda formam pequenos caroços na borda.
2. **Perfil do cabelo.** Atrás da orelha ainda aparece a borda da casca como uma linha diagonal suave. A fresta escura da frente sumiu.
3. **Ponta do manto.** A ponta que sai do punho lê como uma fita estreita. O enrolar é paramétrico e não vem de simulação de pano, então as dobras no punho são feitas por regra e não por física.
4. **Onda traseira.** Ela não lê mais como concha nem como barbatana. De lado, porém, lê como uma massa arredondada, e o vão sob o lábio é pequeno. Pode pedir uma última passada manual.
5. **Herdadas da V14 e não tocadas nesta etapa:**
   - o rosto continua sendo edição paramétrica;
   - não há luz local na cinemática, por decisão do autor;
   - as texturas têm as mesmas limitações do atlas automático.
6. **Nota sobre a V14.** No `guardian_tides_v14.py`, o parâmetro `beard_test=in_beard_v14` ficou dentro de um comentário. Por isso a barba da V14 usa a área padrão da V13, sem costeletas, embora o relatório da V14 diga que as costeletas existem. A V14.1 mantém a mesma barba de propósito. A V14 não foi alterada.

## Próximo passo

A revisão artística das folhas `compare-*` e das capturas com material cabe ao autor. Só depois dela entram a promoção do modelo e um commit restrito aos arquivos desta sessão.
