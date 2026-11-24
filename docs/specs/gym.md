# Spec: the Gym — daily reps without AI

Status: accepted 2026-11-24 · Owner: levelup · Route: `/gym` (ES "Gimnasio", EN "Gym")

## Problem
levelup trains **knowledge** (concepts, spaced retrieval) and **guided practice** (problems with
hints and a solution one tap away). Neither trains the skills an AI assistant now does for you:
estimating without a calculator, reading code without running it, spotting a bug by eye, writing a
known algorithm from a blank page, explaining an idea in your own words. Those are exactly what an
interview tests, live, with no assistant.

Evidence it matters: in Anthropic's randomized controlled trial (published 2026-01-29; 52 engineers
learning a new Python library), the group that used AI scored ~50% on the follow-up quiz against
~67% for the group that coded by hand, with the largest gap on **debugging** questions and no
significant speed gain. It measured comprehension right after the task, not long-term retention.
Sources: anthropic.com/research/AI-assistance-coding-skills, arXiv 2601.20245.

## Principles
1. **Manual by design.** No hints, no solutions until you commit an answer, paste is blocked in
   answer fields, and the page asks you not to use a calculator, an AI or a Python shell.
2. **Skills, not trivia.** Every rep makes you *produce* something (a number, an output, a line, a
   paragraph, a function), then shows the truth. Generation beats recognition.
3. **Short and daily.** One workout a day, ~12–15 minutes, the same for everyone on that date
   (seeded by date), so it is a habit, not a project.
4. **Infinite, verified reps.** Estimation, tracing, debugging and Big-O reps are generated from
   templates with fresh numbers, so they cannot be memorised. Every generated answer is checked
   by the build (Python answers by Pyodide), so a rep is never wrong.
5. **Show the trend.** A fitness score per skill (moving average) and a 14-day trend: you see a
   skill getting sharper, or going rusty.
6. Local-first, $0: everything runs in the browser; state in localStorage; no AWS.

## The six skills
| id | ES / EN | What you do | Graded by |
|---|---|---|---|
| `estimate` | Estimar sin calculadora / Estimate by hand | Back-of-envelope: QPS, storage, bandwidth, servers from a scenario | log distance: ≤1.25× → 1, ≤2× → 0.6, ≤10× → 0.2 |
| `trace` | Leer código sin correrlo / Trace code | Predict the exact output of a 4–8 line Python snippet | exact match |
| `debug` | Encontrar el bug / Spot the bug | Tap the line with the bug in a short function, given an input whose output is wrong | 1st try 1, 2nd try 0.5 |
| `bigo` | Big-O a ojo / Big-O by eye | Pick the time complexity of a snippet | exact |
| `explain` | Explícalo sin mirar / Explain it cold | Write 2–4 sentences on a concept you studied; then tick which of its key points you covered | covered ÷ total key points (self-check) |
| `blank` | Código desde cero / From a blank page | Re-solve a coding problem with only the signature: no hint comment, no hints, no paste | tests passed ÷ total (Pyodide) |

## The daily workout
- Seed = local date. Sets: estimate ×2, trace ×2, debug ×1, bigo ×2, explain ×1 (8 reps), then an
  optional **bonus**: one `blank` problem (prefer one you solved before: re-solving from memory is
  the retention test).
- `explain` picks a concept you have studied (read or practiced), else the first of the path.
- A run can be left and resumed the same day. Finishing it counts as a gym day (its own streak)
  and adds XP to the site's activity (so the study streak moves too).

## Free drills
Each skill has "10 reps" (`/gym/drill?skill=…`): an endless session seeded by time.

## Data (localStorage `fg.gym.v1`, try/catch everywhere)
`{ v: 1, days: { "YYYY-MM-DD": { score, reps, ms, done } }, skills: { [id]: { ema, n, hist: [{ d, s }] } }, run?: { date, i, results[] } }`
`ema` uses α = 0.3. `hist` keeps one entry per day (the day's mean), last 60 days.

## UI
- `/gym`: today's workout card (start / resume / done ✓ with score), the six skill meters with a
  sparkline and a "10 reps" button each, the gym streak, and the rules in one line.
- Workout player: one rep at a time, a progress bar of 8 dots, elapsed time, a single input per
  rep, "Check" → truth + one-line why → "Next". Phones first; Enter submits.
- Entry points: home hero ("Today's workout"), the practice hub (first card), the More sheet.

## Integrity
- Generators are pure and seeded (`src/lib/gym/`), unit-tested.
- `tests/gym.test.ts` (part of `npm run verify`): for 120 seeds per template, runs every `trace`
  snippet and every `debug` pair in Pyodide, each in a fresh namespace, and checks that the shown
  answer equals Python's, that the correct `debug` function returns the expected output, the buggy
  one returns the shown wrong output, and exactly one line differs.
- Facts in `estimate` come from the `back-of-envelope` concept (86,400 s/day; 1 year ≈ 3.15×10⁷ s).

## Acceptance
1. A first-time visitor finishes today's workout on a phone in ≤ 15 minutes without hints.
2. Paste into a gym answer field does nothing and says why.
3. Reloading mid-workout resumes at the same rep; the next day brings a new workout.
4. Skill meters move after a workout; the trend shows one point per day.
5. `npm run verify` fails if a generated trace/debug answer disagrees with Python.
6. e2e: open /gym, answer every rep, see the summary and a finished day.

## Out of scope (now)
Syncing gym state across devices; voice; timed "speed rounds"; leaderboards.
