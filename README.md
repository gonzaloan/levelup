# levelup — Staff Engineer & AI Architect Field Guide

**Everything a Staff/Principal Software Engineer and AI Architect is expected to know, explained simply.**
A bilingual (ES/EN) study guide you can also keep open as a cheatsheet in an interview.

Live: https://levelup.skillrealm.dev

## What's inside

- **16 topics, ~275 concepts**, in study order: coding interview patterns (20, from hash maps to
  trees, greedy and class design) · distributed systems and building blocks · classic system design
  (feed, chat, payments, KV store, ride hailing, rate limiter, message queue, leaderboard…) ·
  LLM fundamentals · prompting & context engineering · RAG · agents · evals · fine-tuning ·
  inference & cost · security & governance · AI architecture · AI system-design cases · ML
  foundations · MLOps · Staff/Principal leadership and execution.
- **Study path:** one big "next step", three phases, modules folded except the one you are in.
- **Labs you can touch (13), animated:** loops in motion (code running line by line, every step a
  square, the shape is the Big-O), a Big-O race on a log clock, back-of-the-envelope calculator,
  latency ladder you can "feel", sliding window stepper, consistent hashing ring where moved keys
  glide to their new owner, rate limiters with tokens dripping and requests bouncing, quorums with
  messages and acks in flight, cache hit ratio (a live LRU), utilization vs latency (a live M/M/c
  queue), Bloom filter beams, GPU memory (weights + KV cache) and a sampling playground. Each
  concept links its lab; motion respects "reduce motion".
- **Interview practice beyond reading:** 73 Python coding problems you solve and test in the
  browser (Pyodide, no server) with graded hints, a mock coding interview (two problems, 45
  minutes, no hints), a timed 45-minute system design round with a rubric, and a STAR story bank
  with coverage of Amazon's Leadership Principles and Staff themes.
- **Interview plan:** give it your interview date, your role (Staff SWE, AI Architect or both) and
  your minutes per day; it tells you what to study today, when to practice and what to leave out
  if time is short.
- **Phone-first and offline:** a bottom tab bar on phones, link previews when you share a page, and
  a service worker: pages you visited work offline, and "Save for offline" stores the whole guide
  in one language.
- **Knowledge map:** every concept as a territory by topic, with the bridges between ideas.
- **Visual:** a color illustration per concept and the logos of the tools and companies it mentions.
- **Architecture map:** the reference architecture of a production AI system, layer by layer;
  every box opens its concept.
- **Every concept on one page, essentials first:** the one sentence you'd say in an interview, a
  diagram, 3–5 key points, and "check yourself" (its exercises, graded inline). One tap away: the
  full explanation, code, a real example, trade-offs, numbers, pitfalls, interview Q&A, sources.
- **Search everything** with `/` or `⌘K`: titles, acronyms (RAG, HNSW, LoRA, TTFT…), one-liners,
  questions. Accent-insensitive, works offline.
- **Cheatsheet:** every concept as its one-liner plus key numbers. Filter by topic/level, print it.
- **Interview mode:** the 45-minute GenAI system-design framework, worked designs (enterprise RAG,
  support agent, coding assistant, voice agent…), every number worth having at hand, and the full
  question bank.
- **Study path:** every concept once, in 3 phases and 30 modules, from coding patterns and LLM
  basics to Staff level, with "continue where you left off".
- **Practice (the game):** ~2,100 verifiable exercises, no LLM needed to grade them: judgment
  questions, select-all, ordering, matching, back-of-envelope estimates, complete-the-code,
  rebuild-the-diagram and interview flashcards. Spaced repetition (FSRS) brings each one back
  right before you'd forget it; daily session, weak spots, timed mock interviews, XP, career-ladder
  levels, streaks and an activity heatmap.
- **Progress** lives in your browser and can be backed up; optional sign-in (same account as
  get-certified) syncs it across devices.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run verify      # content gate + typecheck + lint + unit tests
npm run build       # static export to out/
npm run e2e         # Playwright smoke tests against out/
```

Adding or editing a concept: see [`docs/AUTHORING.md`](docs/AUTHORING.md). Project conventions:
[`CLAUDE.md`](CLAUDE.md). Deploy: [`deploy/README.md`](deploy/README.md).
