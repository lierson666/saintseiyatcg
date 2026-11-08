# SSTCG — POSEIDON V12 · FIRST TRUE SCULPT PRODUCTION
## Asset intake and sculpture handoff — Guardian of the Tides
**Status:** artist-ready specification and GLB inspection tool, NO finished statue claimed.
**Relationship to V11:** V11 concept art remains visual inspiration; this specification locks model dimensions, export naming and acceptance criteria. Companion Guardian of the Depths remains concept-only until Tides passes art QA.

## 1. Why this gate exists
V7–V9 proved binary GLB and painterly materials, but they were decorative procedural studies. The V10–V11 statues require convincing anatomy and cloth sculpture. A generated 2D image is not a sculpt and must not be passed off as a 3D object. The present workstation has no Blender/bpy, trimesh, Open3D or other available professional sculpting environment; an external 3D conversion provider failed cost preflight with HTTP 503. Do not fake the completed mesh.

## 2. Approved intent (awaiting final user art signoff)
**Asset ID** `POS-MON-V10-001` · `Guardian of the Tides`.
Mythic **architectural** sea sentinel. Not Poseidon himself. Older, stern face. Dark grooves in sculpted beard and hair; open forehead with chiseled laurel crown. Strong proportions and classical marble anatomy; natural hand holding straight golden trident (five sculpted fingers). Left foot on wave crest, opposite supporting base; layered billowing drape that forms actual 3D volume. Counterbalance between vertical trident and sweeping horizontal wave mass. Garment and waves should read from a distance as two separate silhouettes.

### Coordinate / size specification — all provisional
- Local object Y-up; base pivot at (0,0,0), forward +Z; mirrored UVs are allowed *within the same statue* but **not as a substitute for the other guardian**.
- Geometry dimensions target: base ~3.0m width × 2.6m depth; overall statuary height ~7.5m including plinth; trident tip ~10.0m (projected).
- Place in shared `WorldRoot/LandmarkArchitecture` at world `(-10.8, 4.41, -34.8)`, scale 1 at intended world units.
- Establish support under pedestal extending from palatial stage; current central podium is only ±9.2 wide and cannot simply suspend the guardian at x=-10.8. *No deployment before pedestal support exists.*
- Forward direction faces +Z, chest turned ~10° toward temple entry. Test silhouette in original cinematic keys 0, 1, 2 (not gameplay).

## 3. Art-directed sculpt parts (named in Blender scene)
- `TIDES__PEDESTAL` — architectural marble rectangular plinth, flat bottom, carved hippocampus/gold panels.
- `TIDES__WAVES` — swirling sculptural stone waves, not water simulation; readable crest and negative spaces.
- `TIDES__BODY` — physically convincing stylized Greek muscular anatomy, weight-bearing posture.
- `TIDES__FACE` — recognizable features, eyelids/lips/eyebrows, not a faceless mask.
- `TIDES__HAIR_BEARD` — separately sculpted directional locks and recesses.
- `TIDES__CLOTH` — weighted folds with thickness, flowing mantle, Greek decorative trim.
- `TIDES__HAND_GRIP` — fingers around actual trident, no intersections, five fingers.
- `TIDES__TRIDENT` — bronze-gold shaft, three barbed ceremonial tips, hand contact.
- `TIDES__DETAILS` — clasps, shells, scaled belt and gold trims.
Sculpt first, then retopology and paint. Do not build the body from separate visible spheres or cylinders.

## 4. Paint and topology
- High poly sculpt for appearance; retopo LOD0 target ~15–30k triangles; LOD1 ~6–10k, LOD2 ≤3k depending on silhouette; not automatic cutoffs.
- Mesh names, transforms, orientation and pivot stable across LODs.
- Materials: `STATUE_AGED_IVORY`, `STATUE_DEEP_MARBLE`, `STATUE_ANCIENT_GOLD`.
- Textures PBR plus handmade pigment texture: albedo/baseColor, normal, roughness, metallic, AO. Texture family 2048² for hero if performance allows, 1024² medium, 512² mobile.
- Bake high-poly detail into normal/AO. No universal perlin-only texture; warm gold accents placed intentionally and underpainted blue-gray in recessed marble.
- Export as GLB 2.0 with node hierarchy and material slots, correctly packaged images, no external URLs. Provide optional Blender source `guardian-tides.blend`.
- Existing V7 loader handles **one mesh / one embedded PNG only**, therefore the final multi-mesh sculpt needs a full glTF loader integration by Claude or a deliberately reviewed composite material pipeline. Do not simplify the statue merely to satisfy the current loader.

## 5. Artist handoff / import command
When there is an actual sculpted GLB in a staging directory:
```bash
python3 tools/poseidon-v12-import-glb.py /path/to/guardian-tides.glb --guardian tides --install
```
This copies only into **staging** `arena-forge/assets/poseidon-v12/guardian-tides.glb` and writes a JSON inspection report. It does NOT register the GLB for in-game use or approve the statue. Inspect SHA-256, mesh/node counts, material slots, image embeddings, extensions, UVs and triangle budget. The same staging command works with `--guardian depths` when that sculpture exists.

## 6. Gate A — technical turnaround
Before high-poly sculpt: orthographic FRONT, BACK, LEFT, RIGHT in constant scale and camera; closed silhouette, no cut-off trident/feet; 3/4 hero render; close-up hands, head, material slots. *Concept collages are not true orthographic sheets.* Sign off on anatomy and silhouette.

## 7. Gate B — geometry acceptance
- Detect GLB corruption and malformed chunk lengths.
- Inspect named nodes/meshes, UVs and PBR materials. Verify limb intersections and supporting geometry via 3D viewer, not automatically from 2D images.
- No unbounded triangle count, excessive texture memory or missing LOD without explicit exception.
- Review normal maps, UV seams and facial expression at near/far distances.

## 8. Gate C — cinema/game acceptance
- Full 3D model loaded in real Three.js scene, 4 cinematic key snapshots, optionally one cinematic close-up; evaluate hands, weight, silhouette, pedestal contact and trident clipping.
- A separate battlefield camera screenshot confirms camera and HUD unchanged.
- No blocking 3D props in central staircase sightline; no accidental visibility under gameplay UI.
- Skip, reduced motion, fallback to *absence* with warning rather than mannequin; validate performance profiles desktop/mobile.
- Explicit user aesthetic approval before marking asset `approved`.

## 9. Current factual status
- Concept references: existing in ChatGPT; not yet verified copied to this Mac's repo.
- True orthographic sheets: not authored/approved.
- Professional GLB: **missing**.
- New GLB inspector: implemented, tested against V7/V8/V9 GLBs and malformed data.
- Runtime integration: **not started**; do not edit Claude's active arena code without coordination.
- Official publish: **none**.
