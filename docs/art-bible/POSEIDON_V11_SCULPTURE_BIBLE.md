# SSTCG — POSEIDON V11
## SCULPTURE BIBLE · TWO MONUMENTAL SEA GUARDIANS
**2026-11-07 · status: concept / preproduction, not art-approved or installed GLB**

**Canonic sources:** `SSTCG_VISUAL_UNIVERSE_BIBLE_V2.md`, `POSEIDON_V10_GUARDIAN_ART_PRODUCTION.md`, current `arena-forge/cinematics/poseidon.json`.

### Art direction — sculptural identity
These are *architectural mythic guardians*, not living Saints and not representations of Poseidon. They must visually belong to the same painterly world as the marble palace and ocean ceiling. **No generic characters, no mirrored clones, no humanoid sphere/cylinder proxies claimed as final.**

Both guardians share a production family: hand-carved ivory stone with sea-green marble veins, carefully placed gold inlays, voluminous hair and Greek drapery, monumental anatomical proportions, carved wave pedestals and golden ceremonial tridents. They differ in pose, gesture, face, costume silhouette, plinth and narrative.

#### Guardian A — Guardian of the Tides `POS-MON-V10-001`
- **World left**, imposing upright figure; weight on back leg, near leg elevated on a sculpted curling wave; chest rotated subtly toward the central staircase.
- **Gesture:** trident held vertically near outer shoulder; opposite hand controls a billowing cloak. Hands five fingers, physically gripping shaft.
- **Face:** stern but serene; sea-swept long hair, layered bearded strands; crown of carved laurel, no eye glow.
- **Garment:** asymmetric drapery over one shoulder; patterned scale-segment hip guard; gold trim only at accents.
- **Base:** two curling waves intertwine with hippocampus silhouettes; flat carved bottom connects cleanly to architectural plinth; not real liquid.
- **Look:** older, guardian of measured power; monumental but not aggressive.

#### Guardian B — Guardian of the Depths `POS-MON-V10-002`
- **World right**, grounded defensive figure with one knee bent and torso counter-rotated. Must not simply mirror A.
- **Gesture:** trident on outer side but held on diagonal or resting in wave plinth; other hand extends outward in commanding calm.
- **Face:** distinct wider jaw and tightly bound/wind-blown hair; subtly younger, no duplication of facial mesh.
- **Garment:** folded marine cloak over back and waist; shoulder armor with carved shell motif; different cloth flow to A.
- **Base:** deep-rising nautilus/serpent-like wave curls with shell ornament; stable sculptural mass, no loose ends.
- **Look:** vigilant and immovable; broad triangle silhouette, differentiated from vertical form of A.

### Overall silhouette gate
Both statues need a readable silhouette at cinematic-key 0, 1 and 2 on 1600×900 and 1920×1080. Review black silhouettes without material first. Crown/hair and trident must not collide with temple entablature or ocean ceiling. Fine facial detailing matters in the asset viewer and optional cinematic close-up but should not force camera repositioning.

### Technical modeling constraints
- Coordinate system: glTF Y-up, forward +Z, pivot at bottom-center of stone plinth.
- Separate modeling elements while authoring: base, torso/head, arm/hand, drapery, ornaments, trident. Export as one GLB with node hierarchy, preserved names and materials.
- Expected eventual files (not yet present): `arena-forge/assets/poseidon-v11/guardian-tides.glb`, `guardian-depths.glb`.
- No physical combat collider. A and B live in `LandmarkArchitecture`; cinematic visual only.
- Proposed position anchors from V10: A(-10.8,4.41,-34.8), B(10.8,4.41,-34.8). Support geometry must connect side plinths to podium because the current central top slab does not extend under x±10.8.
- Proposed total world height **7.5 for figures/plinth; ~10 including trident**, pending visual approval and collision test.
- Art-facing mesh target: approx 15k–30k triangles each high, ~5k–10k medium, lower LOD for mobile. Measure silhouette loss; do not reduce blindly.
- UV atlas by material family or split textures: stone diffuse hand-painted, stone normal and roughness, gold color/roughness/metalness; aim 2k on hero/high if budget allows, 1k medium; texel density calibrated to real frame.
- Normal/AO baking from high-poly sculpt into optimized game mesh, then manual pigment and edge accents. No purely procedural noise claiming hand-painted final.
- Baked AO complements but does not replace actual contact shadows in Three.js.

### Paint/material bible
- STATUE_AGED_IVORY: base marbled cold ivory; less bright than temple; warm sunlit edges and restrained cool patina, carved recesses.
- STATUE_DEEP_MARBLE: teal gray thin veins, light erosion, semi-matte roughness; not photoreal random wear.
- STATUE_ANCIENT_GOLD: selectively aged gilding on trident, belt and base carvings; not metallic yellow on every surface.
- Engrave story motifs (wave/hippocampus/nautilus) in actual geometry or normal maps, not floating overlays.
- Painterly look is achieved by authored pigment maps, controlled lighting, and artistic silhouette, rather than applying a global Arcane-like filter.

### Production views mandatory **before GLB promotion**
1. **A and B separate:** orthographic front, back, left, right — same scale, exact same design across 4 views.
2. Three-quarter hero render with full silhouette, never cropped.
3. Head/hands close-ups (five fingers), trident grip, folds, sea-creature base.
4. Exploded materials: material slots, palette, UV, normal, seams, gold.
5. In-scene actual screenshots: establishing, environment reveal, approach, battlefield. The gameplay camera is locked; absence of monuments there is intentional.

### Distinguishing concept from finished technical art
Generated image references are mood / costume / lighting explorations. They are NOT orthographic blueprint data and may contain inconsistent hidden sides or anatomy. A modeler must lock the design in a true technical turnaround, and art direction must approve it before high-detail sculpting.

### Loading/integration
The existing SSTCG `poseidon-v7-glb-loader.js` accepts only single mesh and one embedded PNG; **it cannot load a professional multi-node, multi-material sculpt**. Claude must add or reuse a maintained full GLTFLoader-compatible import path with tests, or explicitly bake/export each statue into a verified compatible format without losing artistic materials.
Never downgrade statue complexity merely to fit the restricted loader. New loader must respect async cancellation/disposal, render memory budget, asset provenance, and fail-safe fallback.
**Fallback:** suppress statues entirely or display an explicitly tagged DEV proxy; do not claim a boxy substitute as an actual statue.

### Performance gates
- Capture baseline V9 and new V11 at the same render conditions, camera, viewport, browser, time and graphics preset.
- Separate cinematic FPS from combat idle FPS; no extra detailed guardian geometry should remain GPU-expensive when off frustum or after transition.
- LODs and occlusion or unload where appropriate, preserving continuity during camera travel.
- Test intro playback, skip at every segment, reduced motion, mobile high/low, reload and WebGL context loss.

### Review status
**Gate A (concept):** visual concepts produced. **Not yet author-approved**.
**Gate B (orthographics):** not produced / not approved. **Blocking**.
**Gate C (final GLB assets):** not produced. **Blocking**.
**Gate D (cinematic runtime):** not implemented. **Blocking**.
**Gate E (official):** not published.
