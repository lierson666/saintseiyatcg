# SSTCG — POSEIDON V13 · GUARDIAN OF TIDES / PROFESSIONAL GLB GATE
**Art Bible V2 · 2026-11-08 · status: developer production pipeline, no finished statue.**

## Artistic objective
Guardian of Tides sculpt `POS-MON-V10-001`: one real, anatomically coherent, non-mirrored, authorial stone statue with curling wave base and ceremonial gold trident, as specified in V11/V12. Must enter only `WorldRoot/LandmarkArchitecture`; preserve competitive camera, HUD, cards, input and cinematic skip.

## New work in this version
1. **Original art reference bundle (in ChatGPT artifact)**: `SSTCG_POSEIDON_V13_TIDES_REFERENCE_TRANSFER.zip`, including five approved-for-study references with SHA-256 manifest. This ZIP has not been copied to the Mac; install manually under `docs/art-bible/references/poseidon-v13/`. Images are concept / painterly styling studies only; NOT true 3D geometry or true orthographic geometry sheets.
2. **Structural professional GLB audit**: `tools/poseidon-v13-audit-glb.py` validates GLB v2 chunk boundaries, BIN views, typed accessor ranges, indices, material references, image embedding, required extensions, and reports node/material/image/triangle counts and SHA-256. Status never becomes art-approved automatically.
3. **Staging** continues to use `tools/poseidon-v12-import-glb.py` with `--guardian tides --install`, copy-only; does not change the production scene.

## Verified with current assets
- V7 Trident: 1732 triangles, one node, one material, embedded image, pass.
- V8 Capital: 3136 triangles, one node, one material, embedded image, pass.
- V9 Portal: 399 triangles, one node, one material, embedded image, pass.
The current 3D statues remain **NOT CREATED**.

## Generation route and cost
Higgsfield Tripo H3.1 Image-to-3D reported a preflight cost of **18 credits** for detailed mesh and detailed PBR texture. This request did **not submit a generation** and no credits were spent. Starting the paid model generation requires an explicit user authorization for the charge. If approved: use the full isolated Guardian of Tides reference image, inspect generated mesh and texture, and stage resulting GLB via V12+V13 inspection. A single-view image-to-3D service cannot guarantee back-side anatomy or authentic orthographic consistency: inspect/edit accordingly.

## Export/acceptance constraints
- Model origin: bottom-center of wave pedestal; Y up; +Z forward, world anchor (-10.8,4.41,-34.8), approximate height 7.5, trident up to 10.
- High detail art target 15–30k triangles with LOD1 ~5–10k, subject to measured quality/performance; exact count not a substitute for sculptural quality.
- Multiple named nodes and at least ivory, oceanic stone and ancient gold material slots; embedded texture maps and authored UV/normal maps.
- Must support loader broader than slim single-mesh V7 loader; do not degrade professional sculpture to fit old loader.
- True 3D review: front/side/back, silhouette, five fingers, grip, cloth, wave base, material response, clipping, shadow, support geometry.
- First integrate to developer preview only, skip/reduced motion and mobile QA. Do not publish without explicit artistic approval.

## Next actual gate
Obtain a true quality GLB (from a professional sculptor/Blender or approved image-to-3D generation), audit it, produce a three-angle studio render and a cinematic comparison, then art-approve before gameplay integration. No false claims of art-ready geometry.
