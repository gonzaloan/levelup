# Assets — license ledger

**Hard rule:** every raster / third-party art asset in this project is **CC0 / public-domain**
(Kenney.nl or OpenGameArt CC0). No other license. Authored SVG (our own `pixels.js` engine and
inline components) is preferred; third-party art is reserved for **boss battles and hero moments**.

Every asset must have a row here before it is committed: file · what · source URL · license · notes.

## Boss art (per domain)

Boss key-art was **generated locally** with Stable Diffusion (Forge / dreamshaperXL Lightning) on
the project owner's machine, then downscaled to 512×512 and compressed to WebP. It is treated as
**project-owned local art** (not distributed as CC0 — diffusion-model output has unsettled copyright
status, so we neither claim CC0 nor redistribute it as such). Files live in `public/bosses/<domain>.webp`.
The authored inline-SVG `BossGlyph` in `BossIntro.tsx` remains as the fallback when a file is absent.

| file (`public/bosses/…`) | domain | source | license |
|------|--------|--------|---------|
| technical-depth.webp | technical-depth | SD dreamshaperXL Lightning (local) | project-owned local generation |
| systems-architecture.webp | systems-architecture | SD dreamshaperXL Lightning (local) | project-owned local generation |
| execution-delivery.webp | execution-delivery | SD dreamshaperXL Lightning (local) | project-owned local generation |
| direction-influence.webp | direction-influence | SD dreamshaperXL Lightning (local) | project-owned local generation |
| leveling-scope.webp | leveling-scope | SD dreamshaperXL Lightning (local) | project-owned local generation |
| ai-engineering.webp | ai-engineering | SD dreamshaperXL Lightning (local) | project-owned local generation |

> Source prompts + full-res PNGs are kept under `research/sd-experiment/` (git-ignored working area).
> Any THIRD-PARTY raster added later must still be CC0 / public domain with its row recorded here.

## Hero / world / brand art

Decorative landing/world/brand key-art, **generated locally** with Stable Diffusion
(dreamshaperXL Lightning) on the project owner's machine, then downscaled and compressed to WebP
(hero 1024w, worlds 640×640, emblem 512×512). Treated as **project-owned local art** on the same
terms as the boss art above (neither claimed as CC0 nor redistributed as such). Full-res source PNGs
+ the generation spec live under `research/sd-gen/` (git-ignored working area).

| file (`public/…`) | what | source | license |
|------|------|--------|---------|
| hero/ascent.webp | landing hero — climber ascending a star-chart mountain | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/technical-depth.webp | world splash — crystalline data-strata cavern | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/systems-architecture.webp | world splash — blueprint bridge/aqueduct of light | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/execution-delivery.webp | world splash — launch gantry / shipping port at dawn | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/direction-influence.webp | world splash — lighthouse guiding distant ships | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/leveling-scope.webp | world splash — ascending trail with milestone cairns | SD dreamshaperXL Lightning (local) | project-owned local generation |
| worlds/ai-engineering.webp | world splash — clay-orange neural cathedral, cyan signal | SD dreamshaperXL Lightning (local) | project-owned local generation |
| brand/emblem.webp | brand emblem — abstract sextant + chevron + star | SD dreamshaperXL Lightning (local) | project-owned local generation |
