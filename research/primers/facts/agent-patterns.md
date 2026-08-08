# Cluster: agent-patterns — "Agent patterns"

Current tagline (EN): Start with the simplest shape that works. Each step up in autonomy buys capability and costs predictability.
Current tagline (ES): Empieza con la forma más simple que funcione. Cada paso hacia más autonomía compra capacidad y cuesta previsibilidad.

## The 10 entry slugs — your families MUST partition exactly these

- `workflow-vs-agent`
- `prompt-chaining`
- `routing`
- `parallelization-sectioning`
- `parallelization-voting`
- `orchestrator-worker`
- `evaluator-optimizer`
- `autonomous-tool-use-loop`
- `parallel-agent-read-write-asymmetry`
- `no-agent-yet`

## Each entry, so your primer sits ABOVE them and never restates one

### `workflow-vs-agent` — Workflow vs. agent
- **is:** Anthropic's line between two agentic systems: workflows orchestrate LLMs through predefined code paths, agents let the model direct its own process and tool use.
- **when:** Pick a workflow when you can enumerate the subtasks before the first request; pick an agent only when the number of steps depends on input you have not seen yet.
- **costs:** About 4x the tokens of a chat exchange for a single agent and about 15x for a multi-agent system, so the task has to be worth that multiple before autonomy pays.
- **cheaper first:** One augmented LLM call with retrieval and a few in-context examples is usually enough; it wins unless you can name a step whose very existence depends on an earlier step's output.
- **figures you may cite:**
  - Agents use about 4x the tokens of a chat exchange, and multi-agent systems about 15x
  - On the BrowseComp eval, token usage alone explained 80% of the performance variance
  - token usage, the number of tool calls and the model choice together explained 95%
  - About 4x the tokens of a chat exchange for a single agent and about 15x for a multi-agent system, so the task has to be worth that multiple before autonomy pays

### `prompt-chaining` — Prompt chaining
- **is:** A workflow that splits a task into fixed sequential LLM calls, each one reading the previous call's output, with optional code gates checking the handoff between steps.
- **when:** When the task decomposes cleanly into subtasks you can name in advance, and one call already returns output that is right in parts and wrong in others.
- **costs:** You trade latency for accuracy: N steps are N round trips, and every later step re-reads the earlier output, so tokens grow faster than linearly in chain length.
- **cheaper first:** One call with the steps written as numbered instructions in a single prompt. It wins unless you need to inspect or gate an intermediate output, which a single call gives you nowhere to do.
- **needs first:** workflow-vs-agent

### `routing` — Routing
- **is:** A workflow that classifies each input and sends it to a specialized followup prompt, model or tool, so tuning one path cannot degrade another.
- **when:** When your traffic has categories that measurably want different prompts, and you can classify them accurately enough that a misroute is rarer than the error you are removing.
- **costs:** One extra classification call on every request, plus a misroute rate you have to measure. The price gap it buys on the Claude API is $1 versus $3 per million input tokens, Haiku 4.5 against Sonnet 4.5.
- **cheaper first:** Send everything to the cheaper model and measure where it fails. Routing only wins if the expensive path is needed by a minority of traffic you can identify before answering.
- **needs first:** workflow-vs-agent
- **figures you may cite:**
  - RouteLLM (arXiv:2406.18665) reports 3
  - 66x cost savings on MT Bench at half the performance gap recovered, scoring 8
  - 8 against GPT-4's 9
  - 41x on MMLU (75 vs 81) and 1
  - 49x on GSM8K (75 vs 86)
  - Anthropic's examples are splitting general questions, refunds and tech support into separate paths, and sending easy queries to Claude Haiku 4.5 while hard ones go to Claude Sonnet 4

### `parallelization-sectioning` — Parallelization: sectioning
- **is:** Splitting a task into independent subtasks that run as simultaneous LLM calls, with the outputs combined by code rather than by another model.
- **when:** When the subtasks genuinely never read each other's output, and either wall-clock latency matters or a single call is visibly dropping one of the considerations you asked for.
- **costs:** Total tokens rise roughly with the branch count, since each branch re-sends the shared context, and you burn your per-minute token quota N times faster, so the rate limit becomes the real ceiling.
- **cheaper first:** One call asked to emit all the sections as structured output. It wins while the sections stay short and the model drops none; verify that by scoring each section separately before you fan out.
- **needs first:** workflow-vs-agent
- **figures you may cite:**
  - Anthropic's parallel research system reports cutting research time by up to 90% on complex queries, with the lead agent spinning up 3-5 workers at a time and each worker using 3 or more tools in parallel

### `parallelization-voting` — Parallelization: voting
- **is:** Running the same task several times at nonzero temperature and aggregating the answers by majority, or by a vote threshold you choose.
- **when:** When the task has one right answer that different reasoning paths can reach independently, and you can afford several samples per response.
- **costs:** K samples cost K times the tokens and the request waits for the slowest one; the self-consistency authors name extra computation as its main limitation and suggest 5 to 10 paths to recover most of the gain.
- **cheaper first:** Extended thinking on a single call, or one call plus a self-check against stated criteria. Voting only wins when independent samples actually disagree, so measure the disagreement rate at 5 samples first.
- **needs first:** workflow-vs-agent
- **figures you may cite:**
  - Self-consistency with 40 sampled paths improved chain-of-thought prompting by 17
  - 9% on GSM8K, 12
  - 2% on AQuA, 11
  - 0% on SVAMP, 6
  - 4% on StrategyQA and 3
  - 9% on ARC-challenge, with performance saturating quickly past a few paths

### `orchestrator-worker` — Orchestrator-worker
- **is:** One lead LLM decomposes a task at runtime, spawns worker agents that each hold their own context window, and synthesizes the summaries they return.
- **when:** The subtasks cannot be listed before the request arrives, and the query is breadth-first: several independent directions, each worth its own 10-15 tool calls.
- **costs:** About 15x the tokens of one chat exchange, and a latency floor set by the slowest subagent, since the lead cannot steer a subagent once it is running.
- **cheaper first:** Sectioned parallelization runs a fixed list of subtasks with no planner call at all, and it wins whenever you can write that list down before seeing the input.
- **needs first:** workflow-vs-agent, parallelization-sectioning
- **figures you may cite:**
  - An Opus 4 lead with Sonnet 4 subagents beat single-agent Opus 4 by 90
  - 2% on Anthropic's internal research eval, cut research time up to 90% on complex queries, and used about 15x chat tokens
  - Simple fact-finding stays at 1 agent and 3-10 tool calls
  - In Anthropic's Research system the lead agent receives the query, plans, and spawns 3-5 subagents in parallel, each handed an objective, an output format, tool guidance and explicit task boundaries
  - Each subagent runs its own search loop, calling 3 or more tools in parallel, and returns condensed findings rather than the pages it read, so the lead's context grows by summaries
  - The LeadResearcher writes its plan to memory because context beyond 200,000 tokens gets truncated

### `evaluator-optimizer` — Evaluator-optimizer
- **is:** A loop in which one LLM call produces a candidate and a second grades it against stated criteria, feeding the critique back until the grade passes.
- **when:** You can write the grading criteria before generating anything, and a human articulating that same feedback would measurably improve the draft.
- **costs:** Two model calls per round instead of one, so a 3-round loop is 6 calls and roughly 3x the p95 latency of a single generation.
- **cheaper first:** Put the rubric in the generator's own prompt and ask for one self-check pass. That wins when failures are format or omission rather than judgments needing a reader who did not write the draft.
- **needs first:** workflow-vs-agent, llm-judge-human-agreement
- **figures you may cite:**
  - Anthropic's Research post reports a tool-testing agent that rewrote tool descriptions and produced a 40% decrease in task completion time for later agents
  - One judge call scoring 0.0-1
  - 0 with a pass-fail grade aligned with human judgement better than multiple specialized judges
  - Anthropic's research judge uses a single prompt that scores 0.0-1
  - 0 across factual accuracy, citation accuracy, completeness, source quality and tool efficiency, and also returns pass or fail
  - Two model calls per round instead of one, so a 3-round loop is 6 calls and roughly 3x the p95 latency of a single generation

### `autonomous-tool-use-loop` — The autonomous tool-use loop
- **is:** The runtime cycle under every agent: send the state to the model, execute the tool calls it returns, append the results, repeat until it replies with no tool call.
- **when:** The number of steps depends on what the environment returns, and every step yields ground truth you can check, such as an exit code or a test result.
- **costs:** Turn N re-sends the tokens of all N-1 prior tool outputs, and maxTurns and maxBudgetUsd both default to no limit, so spend has no ceiling until you set one.
- **cheaper first:** Prompt chaining with a fixed call count gives you the same tool access at a known price. It wins unless you can point at a step whose existence depends on an earlier step's output.
- **needs first:** tool-use-function-calling, workflow-vs-agent
- **figures you may cite:**
  - Turn N re-sends the tokens of all N-1 prior tool outputs, and maxTurns and maxBudgetUsd both default to no limit, so spend has no ceiling until you set one

### `parallel-agent-read-write-asymmetry` — Read/write asymmetry in parallel agents
- **is:** Parallel agents that only read can run at once because the state they observe does not move; agents that write must serialize, since each edit changes the next one's input.
- **when:** Before you fan work out, ask whether two agents could touch the same file, row or branch. If they could, fan out the reads and keep the write on one path.
- **costs:** The write phase costs the sum of its steps instead of the maximum, and the isolated-copy alternative costs one working copy per agent plus a merge and verify step.
- **cheaper first:** Let parallel readers return findings and give a single writer the job of applying them. That loses only when the write itself is the slow part, measured in minutes rather than seconds.
- **needs first:** orchestrator-worker, subagent-context-isolation
- **figures you may cite:**
  - Claude Code's workflow runtime allows up to 16 concurrent agents, fewer on machines with limited CPU cores, and 1,000 agents total per run
  - It flags a run that schedules more than 25 agents or projects past 1
  - 5 million tokens

### `no-agent-yet` — You have not earned an agent yet
- **is:** A gate on autonomy: you may not add an agent until a simpler build has been measured and found failing on a written set of inputs.
- **when:** You cannot state today's pass rate on a fixed set of inputs. Then the next thing you build is the eval set, not the agent.
- **costs:** One augmented call and one place to look when it is wrong, against roughly 15x the tokens for a multi-agent build plus a non-reproducible run.
- **cheaper first:** Pull 20 real queries from production logs instead of authoring an eval set, since large effects show up in small samples. That wins whenever your traffic already contains the failures you are guessing at.
- **needs first:** workflow-vs-agent
- **figures you may cite:**
  - Anthropic's multi-agent Research post reports an eval set of about 20 queries, chosen because large effects are visible with few cases, and early prompt-only work moving success rates from 30% to 80%
  - Write roughly 20 eval queries first, measure one augmented call with retrieval and in-context examples, then a workflow, then an agent, and carry each earlier score forward as the bar the next design has to clear
  - Anthropic reports early prompt-only changes moving success rates from 30% to 80%, which is exactly the size of effect an architecture change gets credited for when nobody measured first
  - One augmented call and one place to look when it is wrong, against roughly 15x the tokens for a multi-agent build plus a non-reproducible run
