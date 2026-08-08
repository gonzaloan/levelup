# Cluster: context-engineering — "Context engineering"

Current tagline (EN): The context window is a budget, not storage. Everything here is a way to spend it deliberately.
Current tagline (ES): La ventana de contexto es un presupuesto, no almacenamiento. Todo aquí es una forma de gastarlo a propósito.

## The 8 entry slugs — your families MUST partition exactly these

- `context-window-as-budget`
- `lost-in-the-middle-context-rot`
- `prompt-caching`
- `compaction-and-summarization`
- `external-memory-notes`
- `subagent-context-isolation`
- `just-in-time-context-retrieval`
- `long-context-vs-retrieval`

## Each entry, so your primer sits ABOVE them and never restates one

### `context-window-as-budget` — The context window as a budget
- **is:** The token capacity of a single request, spent on system prompt, tools, history and output, where every token added draws down the model's attention.
- **when:** Before adding a tool, a document or a retrieval step, compute what fraction of the window it consumes at steady state across all turns of a run.
- **costs:** 1M tokens on Claude Opus 5 and Sonnet 5, 200k on Sonnet 4.5, and at most 128k output tokens per request. Input alone above the window returns HTTP 400 `invalid_request_error`.
- **cheaper first:** Cutting tokens beats buying window. If the smallest high-signal prompt already fits in 200k, a 1M model adds recall risk and per-turn cost without adding accuracy.
- **figures you may cite:**
  - 1M-token window on Claude Opus 5, Opus 4
  - 8, Sonnet 5 and Sonnet 4
  - 6. 200k on Sonnet 4
  - 5. Up to 128k output tokens per request, and up to 600 images or PDF pages per request (100 on 200k-window models)
  - Claude Opus 5 and Sonnet 5 hold 1M tokens, Sonnet 4
  - 5 holds 200k, and each response reports the split in its `usage` field

### `lost-in-the-middle-context-rot` — Lost in the middle (context rot)
- **is:** The measured drop in a model's ability to use information placed in the middle of a long input, rather than at its start or end.
- **when:** Whenever a prompt places retrieved chunks or long history between the instruction and the question, and exact recall matters more than fluency.
- **costs:** Over 20 percentage points of accuracy separate the best and worst gold-document positions at 20 documents, and mid-context accuracy can fall below the closed-book baseline of 56.1%.
- **cheaper first:** Rerank and truncate to the top few chunks before reaching for a longer-context model. Going from 20 to 50 retrieved documents bought GPT-3.5-Turbo roughly 1.5% more accuracy.
- **needs first:** context-window-as-budget
- **figures you may cite:**
  - GPT-3.5-Turbo at 20 documents: 75
  - 8% gold-first, 53
  - 8% at index 9, 63
  - Closed-book 56.1%, single-gold-document oracle 88
  - Key-value retrieval over 140 to 300 pairs bottomed at 45
  - 6% worst-case accuracy without repeating the query after the pairs

### `prompt-caching` — Prompt caching
- **is:** Paying once to store a request prefix on the server so later requests that repeat it byte for byte read those tokens at a tenth of the input price.
- **when:** When a prefix of at least 1,024 tokens (512 on Opus 5, 4,096 on Haiku 4.5) is resent inside 5 minutes and everything that varies sits after it.
- **costs:** Writes cost 1.25x the base input price at the 5-minute TTL and 2x at the 1-hour TTL, reads cost 0.1x. On Claude Opus 5 that is $6.25, $10 and $0.50 per MTok against a $5 base.
- **cheaper first:** Shortening the prompt. A prefix you can delete costs nothing at all, and reordering so the volatile part sits last often removes the need for a breakpoint.
- **needs first:** context-window-as-budget
- **figures you may cite:**
  - Cache write 1.25x base input at 5-minute TTL, 2x at 1-hour TTL, cache read 0
  - Claude Opus 5: $5/MTok base input, $6
  - 25 5m write, $10 1h write, $0
  - 50 cache read, $25 output
  - Minimum cacheable prefix 512 tokens on Opus 5, 1,024 on Sonnet 5, 4,096 on Haiku 4
  - 5. Maximum 4 breakpoints with a 20-block lookback

### `compaction-and-summarization` — Compaction and summarization
- **is:** Replacing the older part of a conversation with a generated summary, so the run continues past the window limit with a shorter prompt.
- **when:** When a single run's input tokens regularly reach the 50,000-plus range and the early turns are stale tool output rather than decisions you still need verbatim.
- **costs:** One extra sampling iteration per compaction event, billed on top of the turn: the documented example pays 180,000 input and 3,500 output tokens to compact, and the summary is always a fresh cache write.
- **cheaper first:** Clearing old tool results with context editing instead of summarizing anything. Its `clear_at_least` parameter refuses to run unless it frees a minimum token count, so you only pay the cache invalidation when it pays back.
- **needs first:** context-window-as-budget, prompt-caching
- **figures you may cite:**
  - Default compaction trigger 150,000 input tokens, minimum allowed value 50,000
  - The documented compaction iteration consumes 180,000 input and 3,500 output tokens
  - Server-side compaction (beta header `compact-2026-01-12`, edit type `compact_20260112`) fires when input tokens reach a trigger that defaults to 150,000 and cannot be set below 50,000
  - It supports Claude 4.6 and later models, including Opus 5 and Sonnet 5
  - One extra sampling iteration per compaction event, billed on top of the turn: the documented example pays 180,000 input and 3,500 output tokens to compact, and the summary is always a fresh cache write

### `external-memory-notes` — Structured note-taking as external memory
- **is:** The agent writes its own state to files outside the context window and reads them back later, so progress survives a context reset.
- **when:** When the work will outlive one context window, or when an interruption would force the agent to re-derive what it already learned.
- **costs:** You implement and secure 6 file commands client-side, reject every path that escapes `/memories`, and pay input tokens again on each re-read. The view command truncates text past 16,000 characters, so large notes come back in pages.
- **cheaper first:** Server-side compaction, which summarizes the conversation as it approaches the window limit and needs no storage of yours. It wins when nothing has to survive past the current session.
- **figures you may cite:**
  - Memory tool `memory_20250818`: 6 commands, all confined to `/memories`
  - The view command truncates text files past 16,000 characters and returns an error above 999,999 lines
  - You implement and secure 6 file commands client-side, reject every path that escapes `/memories`, and pay input tokens again on each re-read
  - The view command truncates text past 16,000 characters, so large notes come back in pages

### `subagent-context-isolation` — Sub-agent context isolation
- **is:** Delegating a side task to a separate agent that works in its own context window and returns only a short summary to the caller.
- **when:** When a side task would fill the main window with search results, logs or file contents that the main agent will never read again.
- **costs:** Anthropic measured multi-agent setups at roughly 15x the token use of a chat interaction, and single agents at 4x. The lead also loses auditability, because it sees a 1,000 to 2,000 token summary rather than what the subagent actually read.
- **cheaper first:** One agent with a narrower prompt so the large read never happens. Anthropic's own scaling rule keeps simple fact-finding at 1 agent and 3 to 10 tool calls, and only reaches for 10 or more subagents on genuinely divided research.
- **figures you may cite:**
  - An Opus 4 lead with Sonnet 4 subagents outperformed a single Opus 4 by 90
  - 2% on Anthropic's internal research eval
  - Multi-agent used about 15x chat tokens, single agents about 4x
  - Parallelization cut research time by up to 90% on complex queries
  - Anthropic's research system spins up 3 to 5 subagents in parallel, each calling 3 or more tools at once, and each returns a distilled summary of 1,000 to 2,000 tokens after spending tens of thousands internally
  - Anthropic measured multi-agent setups at roughly 15x the token use of a chat interaction, and single agents at 4x

### `just-in-time-context-retrieval` — Just-in-time context loading
- **is:** Keeping identifiers such as paths, queries or tool names in context and fetching the full content only at the moment the model needs it.
- **when:** When you have 10 or more tools available, or when the definitions alone already consume more than 10k tokens before the model does any work.
- **costs:** One extra model turn per search before the real call, and each search returns at most 5 matches, so a query that misses costs another turn. Regex patterns are capped at 200 characters and BM25 queries at 500.
- **cheaper first:** Plain tool calling with everything loaded. It wins with fewer than 10 tools, or when every tool is used in every request, or when the definitions total under 100 tokens.
- **figures you may cite:**
  - A five-server setup (GitHub, Slack, Sentry, Grafana, Splunk) consumes about 55k tokens in tool definitions before any work
  - Deferring typically cuts that by over 85%, loading the 3 to 5 tools actually needed
  - Tool selection accuracy degrades past 30 to 50 tools, and up to 10,000 tools can be deferred per request
  - You send every definition in the request but mark the rare ones `defer_loading: true`, so the context window starts with only the search tool and your 3 to 5 hot tools
  - One extra model turn per search before the real call, and each search returns at most 5 matches, so a query that misses costs another turn
  - Regex patterns are capped at 200 characters and BM25 queries at 500

### `long-context-vs-retrieval` — Long context versus retrieval
- **is:** The choice between placing a whole corpus in one prompt and fetching only the relevant slice for each query.
- **when:** Cross to retrieval once the answer-bearing slice is a tiny fraction of the corpus. Chroma's focused condition averaged about 300 tokens against a full input of about 113k, and every model scored higher on the focused one.
- **costs:** Recall is what the long version pays: across 18 models the full 113k-token input scored lower than the 300-token focused input on the same questions. Retrieval instead costs an index you must rebuild whenever the corpus changes.
- **cheaper first:** One call with the handful of documents you can already name from paths, titles or timestamps, and no index at all. It wins whenever metadata identifies the right documents without a retriever.
- **needs first:** just-in-time-context-retrieval
- **figures you may cite:**
  - 18 models tested
  - 306 LongMemEval prompts averaging about 113k tokens, versus a focused condition averaging about 300 tokens
  - Refusals were 69 of 194,480 calls, or 0
  - Needle-question cosine similarity ranged 0.445 to 0
  - 775 on the essay haystack
  - Chroma's context rot study measured 18 models on needle-in-a-haystack variants and on a rebuilt LongMemEval
