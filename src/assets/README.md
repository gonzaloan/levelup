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
