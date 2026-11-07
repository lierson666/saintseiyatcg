# Poseidon — Painterly Material & Battlefield V5
**Data:** 2026-11-07 · **Estado:** implementação testada; aprovação visual final pendente.
**Base:** SSTCG Visual Universe Bible V2.0 · Branch `olympus-arena`.

## Entregas
- Três pinturas originais (768×768 PNG): `temple-marble.png`, `ceremonial-ivory.png`, `seabed-rock.png`.
- Um art atlas original (1536×1536 PNG): `ceremonial-battlefield.png`.
- Fontes de geração determinísticas em `arena-forge/generate-poseidon-painterly.py` e `generate-poseidon-battlefield.py`; futuras versões podem substituí-las por pinturas manuais de artista.
- `poseidon-painted-maps.js`: carrega os PNGs pelo browser usando `CanvasTexture`, porque a distribuição slim do Three.js não inclui `TextureLoader`.
- `poseidon-battlefield-paint.js`: camada pintada na superfície existente, sem colisão, sem mover o campo de jogo.
- Integração em `poseidon-palace.js` apenas no modo painterly; modo classic permanece como fallback.
- Mantidos detalhes V4 e câmera/roteiro da cinemática.

## Revisão visual real
Capturas: `docs/img/arena-cinematic/v5-chave-2.webp`, `v5-partida-mundo.webp` e `v5-painted-floor-world.webp`.
**Melhorias visíveis:** mármore azul-acinzentado no palácio, variação artesanal em pedras/colunas, friso da fachada, ornamento do bordo e novo solo cerimonial.
**Ainda faltam:** esculturas GLB completas, frontão mais detalhado, textura de colunas esculpidas, variação do céu/água, mais elementos arquitetônicos de boa qualidade. A arte ainda não iguala o Master Artboard aprovado.
O piso central permanece deliberadamente pouco contrastado para preservar legibilidade das cartas.

## QA
- Capturador existente `tools/capture-poseidon-cinematic.py v5 8791` (servidor local temporário): executou sem erros de página.
- 6 chaves cinematográficas; skip verdadeiro; reduced motion sem cinemática.
- Câmera ao fim: FOV 42°, (0,13.5,13) → (0,0,-0.6), unchanged.
- `scene.bench(20)` high desktop: world 4.04ms, fx 0.92ms **antes da segunda camada de piso**.
- Depois da camada de piso: página sem erro, 1 mesh `Hand-painted ceremonial battlefield V5`, draw calls 122, 60 geometrias, 6 texturas; FPS reportado pelo loop da cena: 30 FPS em repouso (cap deliberado).
- Estado: sem benchmark GPU pós-piso comparável ao anterior. Não alegar aumento de FPS.
- `node --test tools/test-arena-forge.mjs`: 11/11 (teste na fase inicial V4; executar novamente para release).
- Nenhuma alteração em HUD, cartas ou gameplay. Sem publicação oficial.

## Próximo gate
Comparar screenshots V3 × V5 com cartas realmente em campo; revisar luminosidade, qualidade do mármore, legibilidade e desempenho mobile. Avançar para GLBs pintados de estátuas/capitéis e detalhes únicos do palácio, sem inventar geometria final a partir de primitivas.
