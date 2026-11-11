# SSTCG · POSEIDON V14 — ART DIRECTION REVIEW
**Date:** 2026-11-08. **Review:** visual comparison V13/V14 via existing Sculpture Studio captures. **Approval:** V14 as technical/sculpt baseline; FINAL ART pending.
This review is **not** a commit or authorization to publish.

## Decisions
1. **Hippocampus:** keep disabled. Current generated version reads as a lizard. Do not enable or replace with generic procedural animal. Create separate artisanal sheet/model when appropriate.
2. **Rear high wave:** preserve the visual concept but reshape it. Current crest resembles a shell/fin. Create flowing, asymmetrical carved-water mass, attached to front wave and base, with a clear negative space. No free-floating spike, no impact on foot support.
3. **Local cinematic light:** defer. Do NOT modify shared Three.js slim vendor simply to add SpotLight. The attempted cold/warm Fresnel decreased contrast; keep it reverted. Make a small opt-in isolated technical/light sandbox first, measure before considering changes to shared engine.
4. **Hairline:** correct dark seam at scalp/temple, rigid crown-like top plates and stray strand at temple. Preserve beard volume and improved stern facial features.
5. **Left hand and cloth:** make fingers firmly compress and visibly pinch the folded mantle. Correct fabric contact, avoid intersections and cloth tube. Fix locally using cached cloth; avoid full 1h45 simulation.
6. **Cinematic readability:** preserve competitive camera and existing keyframes. Improve readability through environment composition/silhouette/contrast, not fake emission halos. Do not globally enlarge statue or illuminate palace indiscriminately.

## Priority sequence
P0: Hairline, hand-to-fabric grip, clipping.
P1: Rear wave shape and integration; inspect 3/4 and back.
P2: Three matching renders V14 vs proposed V14.1, same cameras and lights; facial and pedestal details.
P3: Rebuild only necessary game exports, run V14 8/8 and V13 regression 15/15, GLB hash and performance.

## Evidence actually reviewed
- `docs/img/sculpture-studio/v14/compare-rosto-tres-quartos.png`: stronger forehead and facial form, but scalp seam remains.
- `docs/img/sculpture-studio/v14/compare-pedestal.png`: tall rear feature reads like shell/fin.
- `docs/img/sculpture-studio/v14/material-tres-quartos.png`: strong working silhouette, but light ivory lacks material contrast.
- `docs/img/sculpture-studio/v14/mundo-cinematica-chave1.png`: temple dominates composition; local statue remains secondary.
- `docs/sculpture-studio-guardian-tides-v14.md`: tests and known limitations.
**Limits:** screenshots do not establish runtime FPS or anatomy in all angles. No new test or GLB changed by this review.

## Shipping gate
- No official publication; keep `sculptV13=1` and `sculptV14=1` separate.
- Do not commit unrelated worktree changes. Claude should identify specific changed paths/hunks from this implementation session before a commit.
- Request author visual review after P0/P1 comparisons, then a narrowly scoped commit.
