# Poseidon · Production Milestone 01 — do Sculpture Studio ao primeiro mundo completo

Data: 08/11/2026. Só desenvolvimento: nada foi enviado ao remoto nem publicado.

## Quadro de produção

Gerado de `arena-forge/sculpture-studio/projects/*.json` em [docs/art-bible/SCULPTURE_PRODUCTION_BOARD.md](art-bible/SCULPTURE_PRODUCTION_BOARD.md). Os estágios são CONCEPT → MODELING → TECHNICAL_QA → ART_REVIEW → APPROVED → PUBLISHED.

| Asset | Versão | Estágio | Homologação |
| --- | --- | --- | --- |
| Guardião das Marés (`POS-MON-V10-001`) | V14.1 | ART_REVIEW | `TECHNICALLY_VALIDATED / ART_REVIEW_PENDING` |
| Guardião das Profundezas (`POS-MON-V10-002`) | prévia em argila | CONCEPT | sem homologação; aguarda revisão de silhueta |

**APPROVED** só existe com a revisão do autor registrada no projeto. **PUBLISHED** só existe com publicação oficial. Nenhum dos dois está nesses estágios.

## Missão 1 · Asset master da V14.1

- **Ferramenta:** `tools/sculpture-homologate.py guardian-tides --testes 8770`. Ela lê o projeto e grava `projects/guardian-tides/homologacao-v14-1.json`.
- **Resultado:** 29 verificações e 3 testes, sem falhas. A V14.1 tem 8/8, a V14 8/8 e a V13 15/15, sem erros de página.
- **O que a ferramenta verifica:**
  - 4 GLBs e SHA-256;
  - auditoria estrutural;
  - orçamento por LOD;
  - as 9 partes e os 3 materiais;
  - escala e pivô;
  - silhueta por LOD (caixa de cada peça contra a do LOD0);
  - texturas do mobile;
  - capturas presentes;
  - preservação da V13 e da V14.
- **Defeito encontrado e corrigido:** no LOD2, desde a V13, a base flutuava 8 cm, a ponta do tridente perdia 0,77 m e o alto do cabelo 0,5 m. O build agora preserva os extremos de cada peça. Os GLBs da V14.1 foram refeitos com LOD2 de 2.956 triângulos. A V13 e a V14 mantêm os hashes. Detalhes e hashes novos em [sculpture-studio-guardian-tides-v14-1.md](sculpture-studio-guardian-tides-v14-1.md).
- **Página:** STAR HILL → Arena Forge → Sculpture Studio → **Homologação**. A página mostra:
  - giro 360° no mesmo palco do inspetor, com os 4 LODs;
  - o botão "Comparar: V14";
  - a tabela de LODs contra a V14;
  - as verificações e os testes;
  - os critérios de arte da bíblia, todos pendentes;
  - as capturas de silhueta, rosto, cabelo, mãos, manto, ondas, materiais e mundo.

  O estado técnico e o artístico aparecem separados. A página nunca marca o asset como aprovado. Captura da tela: `docs/img/sculpture-studio/v14-1/homologacao-tela.png`.

## Missão 2 · Reusabilidade

| Peça | O que é |
| --- | --- |
| `arena-forge/sculpture-studio/projects/<id>.json` | Projeto independente com fontes e as 10 etapas: referências, modelagem, rig e pose, materiais, escultura, LODs, exportação, comparação, validação e versionamento. Também traz versões, orçamento, capturas, testes e critérios de arte. |
| `sculpt_kit.py` | Kit genérico de figura: corpo com rig, pose como dados, escultura em repouso, punho, apoio no chão, saia por envelope, folha de pano, calota de concha e vistas de argila e de silhueta. |
| `tools/sculpture-homologate.py` | Homologação de qualquer projeto. Também refaz o índice e o quadro de produção. |
| `sheet_ab.py`, `gate_compare.py` | Comparação visual com a mesma câmera, entre versões ou entre esculturas. |
| `guardian_tides_build.py` | Decimação que preserva a silhueta. Vale para qualquer escultura exportada pelo build. |
| Aba **Projetos** e aba **Homologação** | Leem só os JSON. Não há nada específico de Poseidon na interface. |

**Ainda falta, e ficou registrado:**
- O build de materiais, LODs e GLB continua com nomes `TIDES__*`. Generalizar é o próximo passo, antes do Guardião das Profundezas passar de CONCEPT para MODELING.
- A revisão artística ainda é registrada à mão no campo `artistico` do projeto. Não há botão para isso.

## Missão 3 · Guardião das Profundezas

- **Projeto separado:**
  - `guardian_depths.py`;
  - `projects/guardian-depths.json`;
  - `arena-forge/assets/poseidon-depths-clay/`;
  - `docs/img/sculpture-studio/guardian-depths/`.

  Nenhum arquivo do Guardião das Marés foi alterado por este projeto. O bigode, que o módulo de cabelo sempre gera, é desligado só durante a execução do script.
- **Fonte:** a Art Bible V10/V11 em texto. Os artboards citados (`POSEIDON_V10_GUARDIAN_RIGHT.png` e os outros) **não estão no Mac**: `docs/art-bible/references/` está vazio e nada foi achado no disco. A prévia segue o texto aprovado. Se houver artboard, ele deve ser instalado antes da modelagem detalhada.
- **Prévia em argila:** só forma, para revisar a silhueta. A cena é gerada em cerca de 30 s e não usa simulação de pano. Elementos:
  - joelho da frente dobrado e perna de trás estendida, formando uma base larga;
  - tronco em contrarrotação: quadril para fora e peito para a escadaria;
  - tridente na diagonal do lado de fora, com a ponteira no pedestal;
  - mão de comando aberta e estendida;
  - mandíbula mais larga, cabelo curto preso por faixa e nó, sem barba;
  - saia curta, capa que abre para fora e para trás, faixa na cintura e ombreira de concha;
  - pedestal elíptico com molduras, concha na frente, náutilos nos lados, volutas de onda e dorso d'água em volta dos pés.
- **Imagens para revisão** (`docs/img/sculpture-studio/guardian-depths/`):
  - `depths-argila-*.png` e `depths-silhueta-*.png`, nas 5 vistas;
  - `folha-ab-silhueta-*.png` e `folha-ab-argila-*.png`, com a V14.1 das Marés à esquerda e as Profundezas à direita, na mesma câmera e escala;
  - `mundo-ab-chave0/1/2.png` e `mundo-ab-partida.png`, com as duas no palácio.

## Missão 4 · Integração

- **Posição B:** usa o mesmo leitor e o mesmo apoio arquitetônico da A, em (10,8; 4,41; −34,8). Só carrega com `?sculptDepthsClay=1`, e o GLB é marcado `GUARDIAN_DEPTHS_CLAY_DEV`.
- **Para ver as duas juntas:**

```text
playtest/divine/?arena=poseidon&arenaPreview=poseidon-palace&sculptV141=1&sculptDepthsClay=1
```

- **Sem flags:** nenhuma das duas carrega, e o teste confere isso.
- **O que não mudou:** a câmera competitiva (FOV 42, (0, 13.5, 13)), o HUD, as cartas, o gameplay, a cinemática atual e o Three.js compartilhado.

## Testes

| Teste | Resultado |
| --- | --- |
| `tools/test-sculpture-studio.py` (V13) | 15 ok |
| `tools/test-sculpture-v14.py` | 8 ok |
| `tools/test-sculpture-v14-1.py` | 8 ok |
| `tools/test-sculpture-homologacao.py` (projetos, homologação, posição B, sem flags) | 14 ok, sem erros de página |

## Decisões que cabem ao autor

1. A revisão artística da V14.1, na aba Homologação.
2. A revisão da silhueta do Guardião das Profundezas: pose, tridente, capa e pedestal.
3. Instalar os artboards V10, se existirem, antes da modelagem detalhada.
