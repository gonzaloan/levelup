# levelup — AI Architect Field Guide

**Everything a Staff/Principal AI Architect is expected to know, explained simply.**
A bilingual (ES/EN) study guide you can also keep open as a cheatsheet in an interview.

Live: https://levelup.skillrealm.dev

## What's inside

- **12 topics, ~180 concepts**, in study order: LLM fundamentals · prompting & context
  engineering · RAG · agents · evals · fine-tuning · inference & cost · security & governance ·
  MLOps · distributed systems · AI system-design cases · Staff/Principal leadership.
- **Every concept on one page, same shape every time:** the one sentence you'd say in an interview,
  how it works, a diagram, runnable-ish code, a real example with numbers, what you gain / what you
  pay, when (not) to use it, numbers to remember, common pitfalls, interview questions with model
  answers, related concepts and sources.
- **Search everything** with `/` or `⌘K`: titles, acronyms (RAG, HNSW, LoRA, TTFT…), one-liners,
  questions. Accent-insensitive, works offline.
- **Cheatsheet:** every concept as its one-liner plus key numbers. Filter by topic/level, print it.
- **Interview mode:** the 45-minute GenAI system-design framework, worked designs (enterprise RAG,
  support agent, coding assistant, voice agent…), every number worth having at hand, and the full
  question bank.
- **Practice:** flashcards from every interview question with a simple spaced-repetition loop.
- Progress ("mastered", practice boxes) lives only in your browser.

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
