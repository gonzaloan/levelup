# levelup — Staff Engineer & AI Architect Field Guide

**Everything a Staff/Principal Software Engineer and AI Architect is expected to know, explained simply.**
A bilingual (ES/EN) study guide you can also keep open as a cheatsheet in an interview.

Live: https://levelup.skillrealm.dev

## What's inside

- **16 topics, ~260 concepts**, in study order: coding interview patterns · distributed systems
  and building blocks · classic system design (feed, chat, payments, KV store, ride hailing…) ·
  LLM fundamentals · prompting & context engineering · RAG · agents · evals · fine-tuning ·
  inference & cost · security & governance · AI architecture · AI system-design cases · ML
  foundations · MLOps · Staff/Principal leadership and execution.
- **Study path:** one big "next step", three phases, modules folded except the one you are in.
- **Labs you can touch:** back-of-the-envelope calculator, latency ladder, Big-O growth, sliding
  window stepper, consistent hashing ring, rate limiters, quorums (N/R/W), GPU memory (weights + KV
  cache) and a sampling playground. Each concept links its lab.
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
- **Study path:** every concept once, in 3 phases and 23 modules, from LLM basics to Staff level,
  with "continue where you left off".
- **Practice (the game):** ~1,500 verifiable exercises, no LLM needed to grade them: judgment
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
