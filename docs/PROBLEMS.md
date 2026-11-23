# Authoring coding problems

One file per problem: `content/problems/<id>.json`. The learner writes a Python function in the
browser and it runs against the tests with Pyodide (no server). Gold example:
`content/problems/longest-run-without-repeats.json` — **read it first and match its quality.**
Validate: `node tools/check-problems.mjs [files]` — it checks the schema, runs your `solution`
(must pass every test) and your `starter` (must fail at least one) with the exact browser harness.

## Rules
- **Original wording.** Classic interview problems are fine, but write the statement in your own
  words with a generic name ("Longest run without repeats"), never copy a LeetCode/HackerRank text
  or title. Short, concrete, one paragraph + constraints.
- **Teaches its pattern.** `concept` is the coding pattern id (e.g. `sliding-window`); the intended
  solution uses that pattern, and `explain` (≤ 90 words) says why it works and the trap to avoid.
- **Function only, JSON in/out.** `fn` is the function name; `args` are JSON values (ints, strings,
  lists, nested lists, null). Graphs as `n` + edge list; grids as lists of strings or lists of lists.
  No classes, no I/O, no randomness, no imports beyond the standard library.
- **Tests.** 6–20 cases; 2–4 marked `"visible": true` (shown as examples), the rest hidden. Cover
  edge cases (empty, single element, duplicates, negatives, all-equal, disconnected…). Keep inputs
  small enough to read (no huge generated arrays). `compare`: `exact` (default), `unordered` (list
  order doesn't matter), `unordered-nested` (lists of lists, both levels unordered), `float`.
- **Starter.** A stub with the right signature (type hints), a one-line comment hinting the
  approach, and a placeholder return that fails the tests.
- **Solution.** Clean, idiomatic, optimal for the pattern, ≤ 25 lines, standard library only.
- **Hints.** 1–3, each ≤ 40 words, progressive: first the pattern, then the key move.
- **Complexity.** `{ "time": "O(…)", "space": "O(…)" }` of the reference solution.
- **Difficulty.** `easy` | `medium` | `hard`, honest.
- **Spanish** authored, neutral LatAm, `tú`; code identifiers stay in English.

## Linked lists, trees and class design
The harness passes JSON, so problems about node structures use a **provided wrapper**: the starter
defines the node class and a driver (`fn`) that builds the structure from JSON, calls the function
or class the learner writes, and converts the result back. Mark the two parts with comments
(`# --- provided: do not edit ---` / `# --- your code ---`); the learner's part comes first.
- Linked list: values as a list (`[1, 2, 3]`); cycles as a list plus the index the tail points to.
- Binary tree: level-order list with `null` for a missing child (`[3, 9, 20, null, null, 15, 7]`).
- Class design: a list of operations (`[["put", 1, 1], ["get", 1]]`); the driver returns the list
  of results (`null` for operations that return nothing).
The 25-line limit applies to the learner's part of the solution.
