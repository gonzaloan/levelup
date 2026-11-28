# Simplify: one next step, four places (spec, 2026-11)

## Problem
levelup grew feature by feature. The phone shows 12 destinations (6 tabs + a "More" sheet of 7),
the home page is 4,300 px with 42 links, Practice offers 9 ways to practice under 3 stat cards,
and Interview is a 122,000 px page. A new reader can't tell what to do first; a returning reader
has no single "today" to come back to. That kills engagement.

## Principles
1. **One next step.** Every screen answers "what do I do now?" with one primary button.
2. **Four places.** Hoy · Ruta · Practicar · Tú. Nothing else in the navigation.
3. **Delete before adding** (Musk's order: question the requirement, delete, simplify, then
   automate). An element stays only if it moves the reader forward or shows their progress.
   Everything removed from the nav stays reachable by search, by links from concept pages, or
   from the Library in Tú — no content is deleted.
4. **Progress you can see.** A daily mission of three tasks, a streak, a level, the path with a
   clear "you are here".
5. **Apple-style clarity.** Big targets, one accent action per screen, short labels, no walls of
   links, the same card shape everywhere.

## Information architecture
| Place | Route | What it holds |
|---|---|---|
| **Hoy** | `/` | Streak and level in one line; **today's mission** (Learn 1 concept → Review → Gym) with one big button for the next unfinished task; your place on the path. First visit: a two-line pitch above the same mission. |
| **Ruta** | `/path` | The path as units: done ✓, next ▶ (one), the rest quiet. Unchanged content, less chrome. |
| **Practicar** | `/practice` | Four cards, each with its due count: Repaso (spaced review), Coding (problems + re-solve due), Gimnasio, Simulacros (coding mock, design round, STAR stories). |
| **Tú** | `/me` | Level, XP, streak, activity; your interview date (plan); account and sync; language, theme, offline; the Library (topics, map, cheatsheet, question bank, labs, knowledge graph); Pro. |

Removed from the navigation (still reachable): Temas, Mapa, Cheatsheet, Plan, Grafo, Preguntas,
Labs, Entrevista, Pro, the theme toggle and the account button in the header. Practice loses its
stat cards, mode list (mock quiz, weak points, flashcards fold into Repaso), continue card,
heatmap and per-module progress (Ruta and Tú have them). Interview becomes the Simulacros page:
three cards, no 120k-px reference wall (that content lives in its concepts and the question bank).

## Daily mission (gamified, pure logic in `src/lib/today.ts`, unit-tested)
| Task | Done when | Locked when |
|---|---|---|
| Aprende 1 concepto (the next on the path) | a concept was marked read today | never |
| Repasa | reviewed today, and no cards due or one full session (15) done | no cards yet ("after your first concept") |
| Gimnasio | today's workout is finished | never |

The big button goes to the first unfinished, unlocked task. All three done: "Día completo 🔥".
Every due count reads the same cards: orphans (items content removed) are pruned when the bank loads.

## Concept page (the learn task)
Essentials, then the check that completes the task, then everything else folded: TL;DR → diagram →
how it works → **Pruébate** → Profundiza (labs, design round, problems, then the reading folds) →
related, stack, sources → **one primary button**: "Siguiente en tu ruta: X", or, once learned today,
"Seguir con tu día" (back to Hoy) with the next concept as a quiet link. "Marcar como leído" is the
only secondary. Prev/next and the rail follow the path module, not the topic.

## Acceptance (two independent reviewers must approve)
Each reviewer gets screenshots at 390 px (and 1280 px) of Hoy (new and returning reader), Ruta,
Practicar, Tú, a concept page and Simulacros, plus this spec, and answers:
1. On every screen, is it obvious within 5 seconds what to do next? (one primary action)
2. Does every visible button/link earn its place? List anything to delete.
3. Can a first-time reader find their way with no explanation? (4 places, clear names)
4. Is progress/gamification visible and motivating without clutter?
5. Is it consistent (same card shapes, spacing, one accent per screen) and phone-first?
Verdict: APPROVE or CHANGES (with a concrete list). Iterate until both APPROVE.
