# level-up — Experience Iteration (badges, share, game-feel, content, UX)

**Date:** 2026-07-07
**Branch:** `redesign-learn-hub-themes` (no push)
**Status:** Approved goal (autonomous) → implementation
**Research:** `research/ux-findings-raw.json` (real official docs fetched: WCAG 2.2, Open Badges 3.0 /
1EdTech, LinkedIn share URLs, SDT + gamification meta-analyses, instructional-design sources).

## Goal
Make level-up feel like the definitive, special learning game: polished UX in both themes (no
overlap, best styles), sharper content (clear/concise + real examples, architectures, code,
diagrams), a **badge/achievement system** with **locally-SD-generated art**, and **LinkedIn
sharing** of what was learned. Verified with Playwright; gated by **4 PASS/FAIL reviewers** to
unanimous PASS.

## Grounding decisions (from fetched research)
- **Gamification (SDT):** rewards must be *informational, not controlling*. Badges tie to real
  skill milestones; framing is competence ("you cleared…"), never a quota. Streaks (if any) are
  forgiving/consistency-framed, never punitive. NO public leaderboards. Reward "juice" fades as
  mastery grows. All motion gated on `prefers-reduced-motion`.
- **Badges:** adopt the **Open Badges 3.0 *shape*** (VC 2.0 envelope + `OpenBadgeCredential`,
  `Achievement` def separate from the award) but ship **unsigned/local** (no client key; we don't
  claim cryptographic verifiability). Achievement ⇄ a real milestone (checkpoint/track/gauntlet).
- **LinkedIn share (no backend/OAuth):** two client GET links —
  `https://www.linkedin.com/sharing/share-offsite/?url=<ENCODED>` (feed) and
  `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=…&organizationName=…&certUrl=…`
  (add-to-profile, best-effort). Each shareable achievement is a **statically-exported page** with
  its own OG tags + a **1200×627 (1.91:1) OG image** (LinkedIn needs server-visible OG, cannot read
  localStorage). QA via Post Inspector later.
- **Content clarity:** worked-example-first (concrete real case → then generalize); dual coding
  (every concept has a matching diagram); annotate code/diagrams inline (spatial contiguity);
  conversational 2nd-person voice; cut decorative noise (coherence). Flagship is already enriched —
  this pass is a *verification + gap-fill*, not a rewrite.
- **Dual-theme UX (WCAG 2.2 AA):** text ≥4.5:1 (large ≥3:1), non-text ≥3:1, targets ≥24px, focus
  visible; responsive grids use `repeat(auto-fit, minmax(min(100%, N), 1fr))`; fluid type via
  `clamp()`; prose capped `min(72ch,100%)`; never pure black/white; keep body copy legible (pixel
  font only for headings/labels/HUD).

## Scope — five workstreams

### A. Badge / achievement system (`src/lib/badges.ts`, `BadgeShelf`, `/me` trophy room)
- `Achievement` catalog (id, name{en,es}, description, criteria, tier, domain, art path). Earned by
  evaluating existing `Progress` (checkpointsCleared, mastered, gauntlets, conceptsRead, signal) —
  pure function `earnedBadges(progress): EarnedBadge[]`. No new persistence needed (derive on read);
  optionally record `earnedAt` in the store when first crossed (informational toast, reuses Reward).
- `badgeCredential(achievement, progress)` returns an **OB-3.0-shaped unsigned JSON** for export.
- **Art:** generate a badge icon per achievement with local SD (dreamshaperXL lightning), 512²→WebP
  in `public/badges/`. Emblem/insignia style, per-domain accent. License = project-owned local gen.
- **/me becomes a trophy room:** stat tiles + a **Badge shelf** (earned bright, locked as dimmed
  silhouettes with unlock criteria) + placement + "share" entries. Fills the empty page.

### B. LinkedIn share (`src/lib/share.ts`, `ShareButton`, `/[locale]/achievement/[id]` pages)
- Statically export one page per achievement (`generateStaticParams`), each with OG meta
  (title/desc/image/url/type) via Next `generateMetadata`, and an on-page human view + copyable
  credential fields + the two LinkedIn links.
- OG images: pre-render 1200×627 cards (authored SVG→PNG at build, or an SD-composited card) per
  achievement into `public/og/`.
- A `ShareButton` on /me and on cleared checkpoints → opens `share-offsite` popup.

### C. Game-feel polish (tasteful, SDT-safe)
- Level-up / badge-unlock toast (reuse `Reward`, competence-framed, reduced-motion gated).
- A compact **HUD/progress** on /me: current level, signal, streak (consistency-framed, opt-in),
  next-milestone nudge. No leaderboard.
- Pixel theme: badges get chunky frames; studio gets instrument medallions.

### D. Content-quality verification pass (fleet)
- Audit the 55 flagship concepts against the clarity rubric (worked-example-first? diagram matches?
  code where it helps? concise? real architecture/case?). Fix gaps only (don't rewrite good
  content). Bilingual, de-slopped. Skills-forbidden + small-batch fleet (per hard-won ops rules).

### E. UX/UI polish both themes (`styles/*`, components)
- From the audit: fill the sparse /me; verify no overlap at 320/390/1280; enforce WCAG AA tokens
  (audit pixel palette contrast); `clamp()` fluid headings; `min(72ch)` prose; 24px targets.
- Playwright audit spec (both themes × desktop/mobile) must stay overflow-free + screenshot-clean.

## Verification
Every step: `tsc`+`lint`+`vitest`+`build`+Playwright (`--workers=1/2`) green. SD art generated
locally, WebP-optimized, project-owned in `public/badges/` + `public/og/`. Full-res in
`research/` (gitignored).

## Gate — 4 PASS/FAIL reviewers (loop to unanimous)
1. **UX/UI + a11y** — no overlap both themes/sizes; WCAG AA contrast + target sizes; focus visible.
2. **Content/pedagogy** — clarity, worked-example-first, diagrams match, real examples/code.
3. **Game-feel/engagement** — SDT-safe (informational not controlling), badges meaningful, no dark patterns.
4. **Correctness/build** — badge logic correct, share URLs/OG valid, tsc/lint/tests/build green, no dead code.

## Out of scope
- No backend/accounts/OAuth (share is client links + static OG pages).
- No cryptographically-signed badges (unsigned OB-3.0 shape only).
- No public leaderboards / punitive streaks.
