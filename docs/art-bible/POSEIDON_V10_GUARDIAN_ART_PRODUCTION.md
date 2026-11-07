# SSTCG · ARENA FORGE — POSEIDON V10 GUARDIAN STATUES
## Art Bible production brief · 2026-11-07
**Status: PREPRODUCTION. No statue GLBs have been approved or installed.**
**Canonical:** `docs/art-bible/SSTCG_VISUAL_UNIVERSE_BIBLE_V2.md`.
**Proposal:** two original, mythological stone guardians flanking the great staircase at the Poseidon Palace; richly sculpted, polished but weathered, with gold tridents. These are architecture, not playable devotees.

### Goal
Make the temple *feel inhabited by myth and history* without shrinking it to fit the battle camera. Show the monuments in **CINEMATIC KEY 0 / 1 / 2**. The gameplay camera remains fixed and does not need to show these objects.
The art must have hand-painted sculptural shading, readable anatomy, elegant facial planes, complex wave pedestals, folds, patina and marine iconography. Do not use cylinders/boxes/spheres as final statues.

### Visual reference / installation state
The concept image was generated in the ChatGPT design session and has **NOT been copied** into this Mac repo yet. Its local user-download package includes:
- `POSEIDON_V10_GUARDIAN_ARTBOARD.png` — annotated palace composition
- `POSEIDON_V10_GUARDIAN_LEFT.png` — left statue crop
- `POSEIDON_V10_GUARDIAN_RIGHT.png` — right statue crop
Asset paths once installed:
- `docs/art-bible/references/poseidon-v10-guardian-artboard.png`
- `docs/art-bible/references/poseidon-v10-guardian-left.png`
- `docs/art-bible/references/poseidon-v10-guardian-right.png`
**Do not say these exist without verifying hashes.** Treat concept illustrations as *mood/composition studies*, not accurate orthographic sheets, depth maps, or production meshes. Some generated details (fish/coral inside breathable environment, extra architecture) are artistic approximations and must not redefine canon.

### Statue A — Guardian of the Tides (left)
- Asset ID `POS-MON-V10-001`.
- Large mythic bearded sea sentinel, stern expression, flowing stone hair and beard.
- Upright and outward-facing shielded posture, staff/trident held high, classic Greek drapery.
- Carved curved waves under feet; pedestal visually continuous with temple podium.
- Distinct silhouette readable in 5-second establishing shot.

### Statue B — Guardian of the Depths (right)
- Asset ID `POS-MON-V10-002`.
- Related cultural style, distinct posture/head and arm movement, gold trident in opposite hand.
- Drapery folds and marine motifs not a mirrored duplicate of Statue A.
- Matching monumental material quality and stone aging, but different wave base.
- Neither statue is Poseidon himself; do not invent official Saint Seiya characters.

### Dimensions / staging (WORLD SPACE PROPOSAL, NOT AUTHOR-APPROVED)
- Existing palace podium top `P = 0.35 + 14 × .29 = 4.41`.
- Proposed sculpture anchor at `(-10.8, 4.41, -34.8)` and `(+10.8, 4.41, -34.8)`.
- Proposed sculpture height about 7.5 world units incl. wave plinth; trident reaches ~10.
- Maintain clear central corridor: stair half-width 6.0, railing approx 6.6; left and right should not block stairs.
- **Support must be physically plausible:** the podium main plate spans only ±9.2 near center, so add integrated projecting plinth/side support geometry before putting 10.8-x statues above it.
- Plan local model origin at pedestal base, Y-up, forward toward +Z (cinematic entrance), units calibrated to world.
- Keep textures readable from the primary establishing/reveal paths; no interactive collision or VFX obstruction.

### Camera projection check (1600×900, aspect 16:9; rough anchor validation, not final occlusion)
From CURRENT `arena-forge/cinematics/poseidon.json`, positions of A/B torso center and head marker:
- ESTABLISHING SHOT base-ish y=8: (~450,641) / (~720,731), y=14.4: (~444,541) / (~719,605).
- ENVIRONMENT REVEAL y=8: (~429,612) / (~1069,661), y=14.4: (~422,430) / (~1075,445).
- CAMERA TRAVEL y=8: (~519,363) / (~1081,363), y=14.4: (~513,193) / (~1087,193).
- GAMEPLAY START projected far above viewport (y negative), as intended.
**This does not prove unobstructed statues.** Require actual screenshot after importing GLBs, accurate bounding boxes and non-intersection tests.

### Production Gate A — asset concepts
1. Cinematic artboard with two guardians, establishing, close-up, transition.
2. Individual technical sheets (front, back, right side, left side, back, close-up head/trident/wave base), must be consistent and scale annotated.
3. Two separate original 3D assets, not two instances of one pose.
4. Materials: `poseidon_statue_aged_ivory`, `poseidon_statue_carved_slate`, `poseidon_statue_ancient_gold`.
5. Keep exact concept/technical-art version and source provenance for every mesh and material.
6. No approval based on 2D painting alone.

### Production Gate B — Three.js GLB
- Author mesh in modeling software or specialized asset workflow, with deliberate anatomy, hands, beard, cloth, face, pleats, foot support.
- Set pivot, UVs and painted color maps correctly.
- A reasonable **initial target**: ≤25k triangles each for high, lower LOD 5–10k (budget must be measured, not enforced blindly).
- Use GLTFLoader if required for multiple meshes/materials or write a versioned importer test; current slim loader only handles simple single-mesh binary glTF with embedded PNG.
- Save `assets/poseidon-v10/guardian-tides.glb` and `guardian-depths.glb` after actual authoring. Filenames are RESERVED and do not currently exist.
- Stage in `LandmarkArchitecture`, NOT in locked gameplay. Keep material and download fallbacks explicitly identified as temporary.
- Do not silently swap a humanoid sculpt with rough spheres/cylinders and claim production complete.

### Production Gate C — world and cinematic QA
- Compare 4 screenshots at fixed keyframes + at least one dedicated camera close-up.
- Check silhouette, anatomically plausible hands (five fingers), structure attached to temple, proper shadows, coherent light and accent colors.
- Verify minimal occlusion of entry stairs and trident doorway; adjust decorative world placement, **not competitive camera**.
- Skip and reduced-motion behavior unchanged; same world root for cinematics and play.
- Mobile memory, draw calls, texture sizes and LOD measured.
- Publish **developer only**; await explicit visual approval.

### Work division with Claude
The Claude implementation session owns editor/backend and runtime integration. The design session owns this brief and artboards. Do not overwrite concurrently changed `arena-forge/forge.js`, `arena-forge/index.html` or `playtest/divine/app.js`.
Next action for Claude after approved technical sheet: implement asset-import preview/LOD and place guardians in the existing landmark group via the scene manifest, not via an unrelated second scene.

### Critical consistency rule
The early cinematics reveal the palace and stone guardians. The final battle viewport shows the **ambient frame of the same location** (architectural floor, nearby column bases, rock edges, caustics). Do not move the palace or guardian statues into the locked battlefield camera just to show off the assets.
