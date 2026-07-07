# level-up — Novel Knowledge-Check Mechanics

**Date:** 2026-07-07
**Branch:** `redesign-learn-hub-themes` (no push — deploy is Gonzalo's, per personal-brand-deploy-safety)
**Status:** Approved design → implementation

## Goal

Verify knowledge with more than multiple-choice. Add four novel, engaging, game-like check
mechanics that work as low-stakes formative practice inside lessons AND as graded items inside
checkpoint "boss battles" — without touching the honest scoring engine. Bilingual EN/ES, both
themes (studio + pixel), keyboard-and-drag accessible, reduced-motion safe.

## Decisions (locked with Gonzalo)

- **Mechanics (build all four now):**
  1. **Cloze** — complete-the-sentence / complete-the-code: text with ordered blanks, a word bank,
     drag or tap words into slots.
  2. **Order** — sequence tiles into the correct order (RAG stages, incident flow, deploy steps).
  3. **Match** — connect pairs across two columns (term↔definition, pattern↔use, threat↔mitigation).
  4. **Categorize** — drag items into the correct buckets (CAP C-vs-A, deterministic-vs-model,
     reversible-vs-irreversible).
- **Grading & placement:** dual-mode. Formative (in lessons, instant feedback, free retry, not
  scored) AND graded (mixed into checkpoints as boolean items alongside MCQ, feeding the boss HP
  bar and the existing "miss at most one" gate). The scoring engine is NOT modified.
- **Content authoring:** bespoke, fleet-authored per concept, gated by **3 PASS/FAIL reviewers**
  (like the enrichment fleet). Flagship 55 concepts first; breadth is a follow-up run.

## Architecture — one engine, four mechanics, two modes

### A. Data schema (`src/lib/types.ts`, additive; `src/content/data/checks.json` new)
A discriminated union keyed by `kind`. All learner-facing strings are `I18nText`.

```ts
interface CheckBase { id: string; concept: string; kind: CheckKind;
  prompt: I18nText; explain: I18nText; track: Track; }   // explain shown on reveal

type CheckKind = "cloze" | "order" | "match" | "categorize";

interface ClozeCheck extends CheckBase { kind: "cloze";
  segments: I18nText[];          // n+1 text segments around n blanks
  bank: I18nText[];              // draggable tokens (superset of answers)
  answers: number[];            // bank index per blank, in order
}
interface OrderCheck extends CheckBase { kind: "order";
  items: I18nText[];             // shown shuffled; correct order is the array order
}
interface MatchCheck extends CheckBase { kind: "match";
  left: I18nText[]; right: I18nText[];
  pairs: [number, number][];     // [leftIndex, rightIndex]
}
interface CategorizeCheck extends CheckBase { kind: "categorize";
  buckets: I18nText[];
  items: { label: I18nText; bucket: number }[];   // bucket index
}
type CheckItem = ClozeCheck | OrderCheck | MatchCheck | CategorizeCheck;
```
`src/lib/checks.ts` loads `checks.json`, exposes `CHECKS`, `checksForConcept(slug)`,
`checksForLesson(lessonId)`, and a pure `gradeCheck(item, response): boolean` used by both modes.

### B. Player components (`src/components/checks/`)
`ClozePlayer`, `OrderPlayer`, `MatchPlayer`, `CategorizePlayer`, and a `CheckHost` that dispatches
on `kind`. Each player:
- Operates by **drag AND keyboard/tap** (select-source-then-target fallback; ARIA on every control) —
  a11y-first, matching the existing viz kit.
- Themed for studio + pixel via CSS vars (zero-radius hard-frame pixel skin).
- Reduced-motion safe (no essential info conveyed only by motion).
- Bilingual via `t(...)`.
- Emits an `onResult(correct: boolean, detail)` callback and renders its own reveal state.

### C. Two modes (a `mode: "formative" | "graded"` prop on `CheckHost`)
- **formative** — instant per-action feedback, partial-credit shown ("3/4 slots right"), free
  **Retry**, no persistence, no score. Slots into `LessonView`'s mid-lesson check flow as an extra
  step type alongside the existing MCQ quick-check.
- **graded** — one **Commit**, all-or-nothing boolean via `gradeCheck`, no retry within the attempt.
  Used inside `CheckpointPlayer`: checkpoint items become a union `{kind:"mcq"} | {kind:"check", ref}`.
  A graded check counts toward `correctCount`, drains the boss HP bar, and feeds the existing
  `clearThreshold` gate exactly like an MCQ. **`src/lib/scoring.ts` is untouched.**

### D. Lesson + checkpoint integration
- `LessonView`: after the prose quick-check, optionally show 1–2 formative checks for the lesson's
  concepts (pulled via `checksForLesson`). Purely additive; lessons with no checks are unchanged.
- `CheckpointPlayer`: item list may interleave `check` items; the player renders `CheckHost` in
  graded mode for those and its existing MCQ UI otherwise. HP/gate logic is shared.

## The fleet (PASS/FAIL-gated, guardrails from the enrichment run)
Authoring is bespoke and review-gated:
1. **Author (per lesson, ≤4 concepts/agent, write-to-file):** for each flagship concept, author
   2–3 `CheckItem`s spread across the four kinds, drawing on the concept's existing
   keywords/architecture/keyPoints/example. Skills + web tools explicitly forbidden; exact slugs
   pinned; small batches to avoid the connection-size limit.
2. **Repair:** fact-check the keyed answers (must be correct AND unambiguous — a cloze blank must
   have exactly one right bank token in context) + de-slop EN + fix ES calques/orthography.
3. **Review (3 PASS/FAIL reviewers, loop to unanimous):** Correctness (keyed answer right +
   single unambiguous solution), Pedagogy (mechanic fits the concept; not trivial/not tricksy),
   Voice/i18n (sharp EN, authored ES).
4. **Merge:** deterministic, additive into `checks.json`, validating every index is in range,
   every `answers`/`pairs`/`bucket` points inside its arrays, and every `concept` slug exists.

**Follow-up run (separate):** author checks for the remaining ~97 non-flagship concepts.

## Guardrails
- Additive schema; new `checks.json`; no existing content changed.
- Scoring engine (`scoring.ts`) untouched — graded checks are boolean, like MCQ.
- Branch `redesign-learn-hub-themes`; no `git push`.
- Both themes + both locales first-class; drag + keyboard on every mechanic; reduced-motion safe.
- Fleet: forbid Skill/web, pin slugs, ≤4-concept batches, resumable, log any coverage cap.

## Success criteria
- Four mechanics playable by drag AND keyboard, in both themes, EN + ES.
- Formative checks appear in flagship lessons; graded checks mix into flagship checkpoints and
  feed the boss HP + gate correctly.
- `gradeCheck` unit-tested for each kind; tsc/lint/vitest green; Playwright drives each mechanic in
  both themes; 176+ page build clean.
- 3 reviewers unanimously PASS the authored check set.
