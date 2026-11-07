# Poseidon V9 — Portal Relief GLB · Art and Runtime Report

**Date:** 2026-11-07 · **Stage:** Development V9, NOT official release, NOT art-approved.

## Implemented
- One original painted-marble 3D low-relief panel generated reproducibly in `arena-forge/build-poseidon-v9-portal.py`.
- Model: `arena-forge/assets/poseidon-v9/poseidon-portal-relief.glb`, single glTF 2.0 mesh with embedded painted PNG. 399 triangles.
- Motifs: central trident of Poseidon, gold sea-wave patterns, spiral nautilus and shell-crest detail; relief on stone plaque.
- `poseidon-palace.js` imports asset using existing restricted GLB loader, creates two mirrored instances on inner temple portal sides, keeps plain stone as fallback.
- Small original PNG texture and hash manifest; game camera and interaction positions unchanged.
- Existing V7 sacred trident and V8 marine capitals untouched.

## Art QA
- The first preview lacked contrast; the ornamental relief blended into its backing marble and was rejected internally.
- The revised version uses a baked aged-gold color swatch for raised ornamental geometry, with separate ivory base pigment and increased relief offset.
- **Isolated visual preview:** `docs/img/arena-cinematic/v9-relief-asset-preview.png`.
- **Cinematic preview:** `docs/img/arena-cinematic/v9-portal-cinematic.webp`.
- **Limitation:** elements remain subtle / partly screened behind colonnade from cinematic key 2. Need stronger scene composition and a professional architectural sculpture pass. Current look is graphic relief, **not final Arcane-level asset**.
- Do not move competitive camera or replace it with a facade framing shot: cinematic camera alone can reveal the detail.

## Tests
- `node --check arena-forge/poseidon-palace.js` passed.
- `node --test tools/test-arena-forge.mjs` **11/11** passed.
- `uv run -q --with playwright python tools/test-poseidon-v9-portal.py` passed with real browser:
  - success: status ready, one instanced mesh, 2 reliefs
  - blocked GLB request: status fallback, zero imported reliefs, rest of temple still loads
  - competitive camera remains FOV=42, position [0,13.5,13], lookAt [0,0,-0.6]; no JS page errors.
- Browser high snapshot observed around 124 draw calls / 60 FPS; a sample, **not full performance certification**.

## Next gate
- Review portal and columns with controlled cinematic camera, excluding visual occlusion.
- Design two full sculptural guardian statues with painterly surfaces, dimensions and hero artboards BEFORE modeling.
- Establish GLB asset preview within Arena Forge when Claude's concurrent editor changes are consolidated.
- Art gate remains **pending**. No deploy.
