# Poseidon — Production Breakdown V2

Referência: `references/poseidon-master-artboard.jpg` (instalação binária pendente).

| ID | Elemento | Camada | Prioridade | Produção |
|---|---|---|---|---|
| `POS-FLR-001` | Campo circular | battlefield | P0 | three-mesh |
| `POS-FLR-002` | Anéis dourados | battlefield | P0 | decal-or-geometry |
| `POS-ARC-001` | Palácio central | architecture | P0 | modular-glb |
| `POS-ARC-002` | Escadaria monumental | architecture | P0 | procedural-mesh |
| `POS-ARC-003` | Colunatas e capitéis | architecture | P0 | instanced-glb |
| `POS-ARC-004` | Frontão e frisos | architecture | P0 | glb |
| `POS-MON-001` | Grande Pilar Principal | monument | P0 | mesh-and-shader |
| `POS-ENV-001` | Oceano suspenso | environment | P0 | layered-shader |
| `POS-MON-002` | Estátuas de Poseidon | monument | P1 | custom-glb |
| `POS-ENV-002` | Pilares e montanhas distantes | environment | P1 | 2.5d-matte |
| `POS-ENV-003` | Rochas laterais | environment | P1 | low-poly-painted-glb |
| `POS-FX-001` | Cáusticas | fx | P1 | shader-projection |
| `POS-FX-002` | Raios e partículas | fx | P1 | vfx-forge |
| `POS-DEC-001` | Estandartes tridente | decor | P2 | plane-and-paint |

## Procedimento para o Claude
1. Abrir a Bíblia Visual e conferir a referência instalada/hash.
2. Capturar imagem da partida com câmera oficial e máscaras do HUD.
3. Gerar crops anotados do Master Artboard para cada asset com as coordenadas de referência.
4. Modelar por partes; substituir placeholders somente após aprovação visual.
5. Comparar screenshot real e artboard lado a lado, com câmera idêntica.
6. Registrar GLB, texturas, proveniência/licença, performance e versão de cada asset.
7. Nunca publicar no jogo oficial automaticamente.

## Estado
Breakdown técnico preparado. Nenhum GLB novo ou asset pintado foi gerado nesta fase.

## Nova regra de cena — V2
O palácio, Grande Pilar e oceano suspenso são revelados pela **cinemática**. O campo fica imerso no mesmo mundo através de piso, colunas/rochas e efeitos nas bordas. O palácio inteiro **não precisa aparecer no frame competitivo**.
A planilha técnica precisa registrar `visibilityUsage`: `cinematic`, `battle` ou `both`. A câmera de combate não muda; câmera cinematográfica tem percurso editável e finaliza no lock competitivo.
**Regra de produção:** primeiro artboard panorâmico, depois artboard de batalha com masks reais de UI, depois storyboard de transição. Critérios e detalhes em [Bíblia Visual V2](SSTCG_VISUAL_UNIVERSE_BIBLE_V2.md).
