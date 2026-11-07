# SSTCG — Poseidon V7 · First Production GLB Pipeline
**2026-11-07** · `olympus-arena` · **Development only; no official publication**

## Asset produzido
- `POS-MON-V7-001`: Sacred Trident of Poseidon, original binary glTF 2.0 (.glb), painted gold texture embedded.
- Modelo: 5,196 vertices, 1,732 triangles; dimensões 2.02 × 3.95 × 0.42 (unidades locais).
- Material pictórico: `sacred-trident-painted.png`, 512×512, ouro envelhecido pintado por traços e oxidação.
- Geometria gerada deterministicamente por `arena-forge/build-poseidon-v7-glb.py`; não é escultura manual profissional, GLB externo ou arte automaticamente extraída de um JPEG.
- Manifest versionável: `arena-forge/assets/poseidon-v7/manifest.json` com hash SHA-256 e proveniência.
- Asset posicionado no nicho do templo, diante do fundo escuro. É visto na câmera cinematográfica, não precisa aparecer na câmera competitiva.

## Suporte runtime
O build slim de Three.js SSTCG não disponibiliza GLTFLoader. Criado `arena-forge/poseidon-v7-glb-loader.js`, importador binário mínimo e restrito ao perfil aprovado: exatamente um mesh, POSITION/NORMAL/TEXCOORD_0 Float32, índices Uint32, imagem PNG embutida, PBR e triangles.
**Não é loader glTF genérico**: animações, skins, extensões, morphs e hierarquias complexas ainda precisam de carregador mantido completo.
No `poseidon-palace.js`, o GLB substitui o tridente procedural somente após o `fetch`, parse e decode de PNG concluírem. Qualquer falha preserva o fallback. Sem interferência em HUD/cartas/câmera.

## Validação
1. Cabeçalho GLB v2, JSON/BIN chunks, integridade de buffers, PNG e hash: passou.
2. `node --check` para importador e cena: passou.
3. `node --test tools/test-arena-forge.mjs`: 11/11.
4. `uv run -q --with playwright python tools/test-poseidon-v7-glb.py 8791`: passou em dois casos:
   - GLB presente: `ready`, 1 mesh, 1,732 triângulos.
   - Rede bloqueada para o GLB: `fallback`, 0 mesh importada, jogo continua.
   - Ambos FOV 42°, camera (0,13.5,13), lookAt (0,0,-0.6), sem page error.
5. Captura de cenário real: `docs/img/arena-cinematic/v7-cinematic-trident.webp`.
6. Observação de performance inicial durante captura: 257 draw calls e frame rate momentâneo 24 FPS em high, sem comparação controlada com V6 e sujeito a variabilidade do navegador. **Não aprovado como meta de performance; requer profiling.**

## Art QA
O tridente apresenta uma silhueta mitológica mais diferenciada, curvaturas nos braços, ornamentação no cabo e textura de ouro pintado; substitui o improviso anterior. O palácio ainda parece geometricamente simples em comparação com a referência cinematográfica escolhida. O asset é uma **prova funcional de pipeline**; não deve receber status `art-approved` sem aprovação visual.
Mais alto impacto artístico: capitéis esculpidos como GLB, porta/trono, estátuas, frontão, pavimento lateral e relevo de fachada. Separar acabamento manual das texturas de detalhes procedurais.

## Próximos passos
- V8: Asset sheet de capitéis e estátuas, GLBs próprios e integração em lotes com instancing/LOD.
- Adaptar/estender o importador para múltiplos nodes/materials apenas com casos de uso e testes.
- Perfil de performance comparativo V6/V7 no mesmo navegador/resolução e quadro. Investigar draw calls altos antes de colocar múltiplos GLBs.
- Acompanhar as modificações de outras sessões em `arena-forge/index.html` e `forge.js` sem sobrescrevê-las.
