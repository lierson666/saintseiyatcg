# Poseidon V8 — Marine Capital GLB & Instanced Architecture
**2026-11-07 · branch olympus-arena · Developer preview only**

## Scope
A new original sculptural capital study with painterly-marble PNG, exported as embedded-texture GLB 2.0 (reproducible generator).
- Asset: `POS-ARC-V8-001`, `arena-forge/assets/poseidon-v8/poseidon-marine-capital.glb`
- Generation source: `arena-forge/build-poseidon-v8-capital.py`
- Painted texture: `marine-capital-painted.png` (512²). Geometry: 3,136 tris / 9,408 non-index-shared authored vertices.
- One GLB downloaded once and rendered across **18 columns using a single InstancedMesh**.
- After successful load, V6 collar and bead instances hidden; on fetch/parse/image error V6 remains visible.
- Mobile/low retains existing lightweight V6 geometry rather than loading V8.
- Does not change gameplay camera or positions; cinematic/Battlefield still share a WorldRoot.

## Visual Art QA
Screenshots:
- `docs/img/arena-cinematic/v8-capitals-cinematic.webp` — fixed cinematic temple approach
- `docs/img/arena-cinematic/v8-capital-asset-preview.png` — isolated native Three.js asset
- `docs/img/arena-cinematic/v8-capital-closeup.webp` — earlier camera exploration, **not a valid asset-quality closeup** (columns obscure the subject).
Version 1 of the generated capital looked overly spiky; rejected internally and reshaped into 16 wider acanthus leaves, with coils and softer silhouette.
The revised model is a **procedural sculptural study**, not hand sculpting by a specialist and not yet painterly-cinematic art-approved. It remains too faceted in macro closeup to meet the final quality benchmark. Next phase: authored normal maps, sculpted GLBs from a modeler, subtle aging and hand-painted ornaments; capture approved closeups.

## Automated validation
- `node --check arena-forge/poseidon-palace.js`: passed
- `node --test tools/test-arena-forge.mjs`: 11/11 passed
- `uv run -q --with playwright python tools/test-poseidon-v8-capital.py 8791`: passed, actual Chrome:
  - GLB available: status `ready`, 1 draw instance source, 18 instances, hidden V6 fallback
  - network failure: status `fallback`, 0 V8 instances, V6 remains visible
  - camera both cases FOV=42; (0,13.5,13); lookAt(0,0,-0.6)
  - no reported page exceptions
- Tested *single samples*: GLB available: 124 draw calls, 60 FPS; GLB missing: 125 draw calls, 60 FPS. These are local snapshots, **not comparable statistically rigorous performance benchmarks**. GLB geometry adds triangles while avoiding one extra draw call.
- Original V7 trident still loads in the scene; no official deployment.

## Pipeline constraints
The small GLB loader is intentionally restrictive, not a full GLTFLoader: single mesh, float32 positions/normals/UV, Uint32 indices, embedded PNG and PBR. Extend only after testing a real asset requiring extensions. Preserve source hash and texture provenance.

## Next steps
1. Art-directed sculpture pass on full capital asset in Blender/Maya or professional modeling workflow; replace same asset ID with approval/versioning and preserved fallback.
2. Produce symmetrical Poseidon statues and full door reliefs with separate storyboarding/camera captures. These require human/art-directed 3D modeling, not primitive cubes.
3. Add preproduction asset viewer/camera turntable to Arena Forge without interfering with ongoing editor changes by Claude.
4. Profile actual cinematic and battle FPS at consistent capture conditions before expanding other facade pieces.
