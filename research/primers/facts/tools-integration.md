# Cluster: tools-integration — "Tools and integration"

Current tagline (EN): A tool the model cannot use correctly is a tool you do not have. The description is the interface.
Current tagline (ES): Una herramienta que el modelo no puede usar bien es una herramienta que no tienes. La descripción es la interfaz.

## The 8 entry slugs — your families MUST partition exactly these

- `tool-use-function-calling`
- `tool-description-as-prompt`
- `tool-error-as-prompt`
- `token-efficient-tool-returns`
- `mcp-protocol-scope`
- `mcp-primitives`
- `progressive-tool-disclosure`
- `code-execution-as-a-tool`

## Each entry, so your primer sits ABOVE them and never restates one

### `tool-use-function-calling` — Tool use (function calling)
- **is:** A request where the model may answer with a structured call to a named function you defined, which your code executes and returns as a result block.
- **when:** The answer depends on live state the prompt cannot hold (a current balance, a row in your database), or the turn has to produce an effect outside the conversation.
- **costs:** 286 extra input tokens on Opus 5 for the tool-use system prompt (406 with forced tool choice), plus the tool definitions themselves and one extra inference pass per call round trip.
- **cheaper first:** Put the data in the prompt and define no tool. That wins when the data fits the window, changes slowly enough to sit behind a cache breakpoint, and the turn causes no side effect.
- **figures you may cite:**
  - Tool-use system prompt: Opus 5 costs 286 tokens (auto/none) and 406 (any/tool), Opus 4
  - 5 and Sonnet 4
  - 5 cost 496 and 588, Haiku 3
  - 5 costs 264 and 355
  - Tool selection accuracy degrades past 30 to 50 tools
  - Five MCP servers (GitHub, Slack, Sentry, Grafana, Splunk) reach 58 tools and about 55k tokens of definitions before any work starts

### `tool-description-as-prompt` — The tool description is a prompt
- **is:** The plaintext `description` field on a tool definition, which is the only text the model reads when deciding whether that tool applies to a request.
- **when:** The model picks the wrong tool, calls none at all, or fills a parameter oddly. Read the description before touching the system prompt or the model choice.
- **costs:** A 3-to-4-sentence description runs roughly 60 to 100 tokens per tool on every request until a cache breakpoint covers the prefix. Each `input_examples` entry adds 20 to 50 tokens, or 100 to 200 for complex nested objects.
- **cheaper first:** Rename before you rewrite: `user_id` over `user`, `github_list_prs` over `list_prs`. If two similar tools are being confused, merging them into one with an `action` parameter beats lengthening both descriptions.
- **needs first:** tool-use-function-calling
- **figures you may cite:**
  - Anthropic asks for at least 3 to 4 sentences per description
  - `input_examples` raised accuracy from 72% to 90% on complex parameter handling in an internal eval, with 1 to 5 examples per tool recommended
  - Tool names must match `^[a-zA-Z0-9_-]{1,64}$`
  - Invalid examples return HTTP 400.
  - Anthropic's guidance asks for at least 3 to 4 sentences per tool, covering what the tool does, when it should and should not be used, what each parameter means, and what the tool does not return
  - A 3-to-4-sentence description runs roughly 60 to 100 tokens per tool on every request until a cache breakpoint covers the prefix

### `tool-error-as-prompt` — Error messages as prompts
- **is:** The text a tool returns on failure, read by the model as an instruction for its next attempt rather than logged for a human to inspect later.
- **when:** The tool can fail for a reason the model could act on: a malformed argument, a rate limit, a result set too large, or a resource that must be created first.
- **costs:** One extra inference pass and one full reprocessing of history per retry, bounded by the 2 to 3 corrections Claude attempts before giving up on that call.
- **cheaper first:** Remove the failure class instead of describing it: `strict: true` on the definition guarantees inputs match your schema, which kills the missing-parameter and type-mismatch errors outright.
- **needs first:** tool-use-function-calling
- **figures you may cite:**
  - Claude retries 2 to 3 times with corrections after an invalid tool call, then apologises
  - Retry after 60 seconds
  - After an invalid or incomplete call Claude retries 2 to 3 times with corrections before apologising to the user
  - One extra inference pass and one full reprocessing of history per retry, bounded by the 2 to 3 corrections Claude attempts before giving up on that call

### `token-efficient-tool-returns` — Token-efficient tool returns
- **is:** Shaping what a tool returns so the model gets the fields it needs for its next step and nothing else, measured in tokens per call.
- **when:** A tool can return an unbounded set (log lines, search hits, table rows), or one agent run makes dozens of calls whose results all remain in context afterwards.
- **costs:** The concise Slack format costs 72 tokens against 206 detailed, about one third, and it drops the `thread_ts` and `channel_id` the model would need to chain a reply.
- **cheaper first:** Filter on the server inside one consolidated tool, so `search_logs` returns matching lines with surrounding context instead of `read_logs` returning the file. That wins whenever the model discards most of a raw read.
- **needs first:** tool-use-function-calling, context-window-as-budget
- **figures you may cite:**
  - Claude Code truncates tool responses at 25,000 tokens by default
  - Slack thread: 206 tokens detailed against 72 concise, about one third
  - Programmatic tool calling cut average usage from 43,588 to 27,297 tokens, a 37% reduction on complex research tasks, and one expense workflow fell from 200KB of raw line items to 1KB of results
  - Claude Code caps a tool response at 25,000 tokens by default and truncates beyond it, so an unbounded return is silently cut rather than rejected
  - Replacing opaque UUIDs with names, or with a 0-indexed scheme, improved retrieval precision by cutting hallucinated identifiers
  - The concise Slack format costs 72 tokens against 206 detailed, about one third, and it drops the `thread_ts` and `channel_id` the model would need to chain a reply

### `mcp-protocol-scope` — MCP: what it standardizes
- **is:** An open protocol over JSON-RPC 2.0 that standardizes how a host application connects clients to servers exposing context and tools to language models.
- **when:** Reach for MCP when the same tool or data source must be reachable from more than one host application, so a bespoke per-host integration would get written twice.
- **costs:** Every request carries `_meta` with its protocol version and client capabilities, you run one client per server, and you may need to speak several revisions at once: every revision before 2026-07-28 uses an initialization handshake, including 2025-06-18 and 2025-11-25.
- **cheaper first:** A plain function-calling tool wired straight into your one application. It wins whenever there is exactly one host and no third party will ever run your server.
- **figures you may cite:**
  - JSON-RPC 2.0 messages, UTF-8, two standard transports (stdio and Streamable HTTP), tool names SHOULD be 1 to 128 characters, current revision 2026-07-28 with 2025-06-18 and 2025-11-25 as prior handshake-based revisions
  - The host process creates one client per server, and each client keeps a 1:1 relationship with that server
  - Revision 2026-07-28 made every request stateless and self-contained, carrying its protocol version inside `_meta`

### `mcp-primitives` — MCP primitives: tools, resources, prompts
- **is:** The three features an MCP server exposes: tools the model calls, resources the application reads by URI, and prompt templates the user picks.
- **when:** Choose a tool when the model must decide to act, a resource when the host or user picks what enters context, and a prompt when a person triggers a named workflow.
- **costs:** Three separate list calls, each with its own pagination cursor and cache TTL (the spec examples use ttlMs of 300000 for a tool list and 60000 for a read), so a cold client spends three or more round trips before the first model turn.
- **cheaper first:** Expose one tool that takes a path or query argument. A separate resource surface only wins when the host has a picker UI or needs update notifications when the data changes.
- **needs first:** mcp-protocol-scope
- **figures you may cite:**
  - Errors split into JSON-RPC protocol codes (-32602 invalid params, -32603 internal) and result-level `isError: true`
  - Resource annotations carry `priority` from 0.0 to 1
  - 0 and an `audience` of user or assistant
  - Resources are application-driven, named by URI (`file://`, `git://`, `https://`), fetched with `resources/read`, and parameterized through RFC 6570 URI templates

### `progressive-tool-disclosure` — Progressive tool disclosure
- **is:** Keeping most tool definitions out of the context window and loading only the few a request needs, discovered on demand through a search tool.
- **when:** Turn it on when tool definitions pass roughly 10k tokens or 10 tools, and above all past 30 to 50 tools, where selection accuracy starts to degrade.
- **costs:** One extra inference pass and a search round trip before the first real tool call, with searches returning 5 matches by default, regex patterns capped at 200 characters, and 10,000 deferred tools per request.
- **cheaper first:** Delete tools. Under 10 tools, or under 100 tokens of definitions in total, standard tool calling wins and the search hop is pure added latency.
- **figures you may cite:**
  - Five MCP servers (GitHub 35 tools, Slack 11, Sentry 5, Grafana 5, Splunk 2) come to about 55k tokens of definitions, which tool search cuts by over 85 percent to roughly 8
  - On Anthropic's internal MCP evaluations Opus 4.5 went from 79
  - You still send every definition to the API, but mark them `defer_loading: true`, so the model's context starts with only the search tool plus the 3 to 5 favorites you left loaded
  - One extra inference pass and a search round trip before the first real tool call, with searches returning 5 matches by default, regex patterns capped at 200 characters, and 10,000 deferred tools per request

### `code-execution-as-a-tool` — Code execution as a tool
- **is:** Giving the model one sandbox tool that runs code, and presenting the other tools as importable functions it calls from inside that code rather than through the model.
- **when:** Use it when a step's output is large and its only consumer is the next tool call, such as piping a meeting transcript out of Drive into a Salesforce record.
- **costs:** You now own a sandbox: CPU and wall-clock limits, egress rules, and monitoring, plus engineer-time to regenerate one wrapper file per tool on every server version bump.
- **cheaper first:** One server-side tool that performs the whole join, so nothing large crosses the model at all. That wins whenever the pairing is fixed and you control both endpoints.
- **needs first:** progressive-tool-disclosure
- **figures you may cite:**
  - Anthropic reports tool-definition load dropping from 150,000 tokens to 2,000, a 98
  - 7% saving, and a two-hour meeting transcript passing through the model twice adding about 50,000 tokens
  - Large payloads never enter context: filtering a 10,000-row sheet in code and logging 5 rows means the model sees 5 rows
