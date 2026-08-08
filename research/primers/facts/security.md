# Cluster: security — "Security and guardrails"

Current tagline (EN): Prompt injection is not a prompting problem. What actually contains it is the shape of your permissions.
Current tagline (ES): La inyección de prompts no es un problema de prompting. Lo que de verdad la contiene es la forma de tus permisos.

## The 9 entry slugs — your families MUST partition exactly these

- `owasp-llm-top-10`
- `direct-prompt-injection`
- `indirect-prompt-injection`
- `injection-not-solvable-by-prompting`
- `lethal-trifecta`
- `exfiltration-channels`
- `output-side-validation`
- `agent-sandboxing-least-privilege`
- `human-in-the-loop-placement`

## Each entry, so your primer sits ABOVE them and never restates one

### `owasp-llm-top-10` — OWASP Top 10 for LLM Applications (2025)
- **is:** The OWASP GenAI Security Project's ranked list of the ten most consequential risks in applications built on large language models, current edition dated 2025.
- **when:** Reach for it when you scope a threat model for any system where model output can reach a tool call, a database, or another user, and give every one of the ten entries a named owner.
- **costs:** Engineer-time to review ten risk classes on every surface, and the list names risks without thresholds, so the severity ranking and the acceptance criteria are still yours to write.
- **cheaper first:** Review the four entries with no non-AI analogue first (LLM01, LLM06, LLM07, LLM08) and route the rest through the application security review you already run. That ordering loses only if you have no such review.
- **figures you may cite:**
  - Ten risk classes, identified LLM01:2025 through LLM10:2025
  - LLM01 lists 7 prevention strategies
  - LLM06 lists 8 plus 2 damage-limiting measures (logging and rate limiting)
  - It supersedes the 2023/24 list, and each entry has its own page with root causes, prevention strategies, and example attack scenarios

### `direct-prompt-injection` — Direct prompt injection
- **is:** Prompt injection where the input a user types is itself what alters the model's behavior or output, in OWASP's LLM01:2025 wording.
- **when:** Assume it whenever an untrusted person can reach the prompt field and that same session holds something they should not have: another tenant's rows, the system prompt text, or a tool credential.
- **costs:** You cannot price it away with wording. OWASP lists 7 mitigations for LLM01 and still states it is unclear whether fool-proof prevention exists, so the real budget goes to least-privilege tokens and human approval on high-risk actions.
- **cheaper first:** If the only asset behind the wall is the system prompt text, accepting that it leaks is cheaper than defending it. Defending wins only when the prompt encodes a rule you cannot move into code, such as a discount ceiling.
- **figures you may cite:**
  - OWASP lists 7 mitigations for LLM01 and still states it is unclear whether fool-proof prevention exists, so the real budget goes to least-privilege tokens and human approval on high-risk actions

### `indirect-prompt-injection` — Indirect prompt injection
- **is:** Prompt injection carried by content the model reads rather than by the user's turn: a web page, a document, an email, or a tool result, per OWASP LLM01:2025.
- **when:** Assume it the moment a retrieved chunk, a fetched page, or a tool result the user did not author enters a context that can also call a tool with a side effect.
- **costs:** On AgentDojo an undefended GPT-4o agent reached 57.7% targeted attack success; the BERT injection detector cut that to 7.95% but dropped benign utility from 69.0% to 41.49%.
- **cheaper first:** Keeping untrusted text and privileged tools out of the same context beats any filter: fetch it, summarize it in a call with no tools, and pass forward only a typed field. A filter earns its cost only when the agent must act on the fetched prose itself.
- **needs first:** direct-prompt-injection
- **figures you may cite:**
  - AgentDojo: 97 user tasks, 27 injection tasks, 629 security cases across 4 suites
  - Important-message attack 57.7% targeted attack success on undefended GPT-4o, 33
  - 86% on Claude 3
  - 5 Sonnet, up to 92% in the Slack suite
  - named it in 2023, observing that LLM-integrated applications blur the line between data and instructions, so an attacker can plant prompts in data likely to be retrieved and never touch the chat box
  - On AgentDojo an undefended GPT-4o agent reached 57

### `injection-not-solvable-by-prompting` — Why prompt injection resists prompt-level defense
- **is:** The structural reason no wording closes injection: instructions and data share one channel, so any defense written in that channel is itself attacker-reachable input.
- **when:** Bring this out when someone proposes to close an injection finding by editing the system prompt, or when a red-team report shows 0% attack success against a fixed file of attack strings.
- **costs:** Provable containment costs utility and design work: CaMeL solves 77% of AgentDojo tasks with provable security against 84% undefended, about 7 points, and requires expressing the task as a program over capability-tagged data.
- **cheaper first:** Cut the agent's authority before you buy a defense: read-only scopes, per-user credentials instead of one high-privilege identity, human approval on the send step. Prompt-level mitigation is worth adding on top, at roughly the Warning defense's 10.8% residual attack success, never underneath.
- **needs first:** indirect-prompt-injection
- **figures you may cite:**
  - Undefended Gemini 2.0 Flash: TAP near 100% attack success, trigger built for under US$10
  - Warning defense 10.8% under adaptive TAP, 6
  - 2% combined with adversarially fine-tuned Gemini 2
  - 5, against 94
  - 6% with no external defense
  - Adaptive beat or matched non-adaptive in 16 of 24 defense-attack pairs

### `lethal-trifecta` — The lethal trifecta
- **is:** The dangerous combination Simon Willison named: an agent with access to private data, exposure to untrusted content, and some way to communicate externally.
- **when:** Run the three-way check on every agent configuration before it ships: list the tools that read private data, the tools that ingest text an outsider can write, and the tools that emit bytes to a destination an outsider picks.
- **costs:** Removing any 1 of the 3 legs costs a capability the user asked for. With no egress the GitHub agent cannot open the pull request, so every result it produces becomes engineer-time spent copy-pasting.
- **cheaper first:** Split the run across two agents with different privileges before buying an injection detector. The detector only wins if one context genuinely must both read attacker-controlled prose and hold the private-data tool, which is rarely a hard requirement.
- **needs first:** indirect-prompt-injection
- **figures you may cite:**
  - Willison's answer to guardrail vendors advertising 95% detection: in web application security "95% is very much a failing grade"
  - His incident list runs from ChatGPT in April 2023 to ChatGPT Operator in February 2025
  - Removing any 1 of the 3 legs costs a capability the user asked for

### `exfiltration-channels` — Exfiltration channels
- **is:** Any path by which an injected agent moves data to a destination the attacker chose: a rendered markdown image, a link query parameter, or an outbound tool call.
- **when:** Enumerate the channels before shipping any surface that renders model output: markdown images, autolinked URLs, reference-style link definitions, link unfurling, iframes, and every tool that performs a write or a send.
- **costs:** Closing a channel costs the rendering feature that rode on it, for 100% of legitimate content too. Mistral LeChat locked down markdown images outright, and a Slack app that sets "unfurl_links": false loses inline previews on every link.
- **cheaper first:** Refuse to render remote images at all before you design a CSP allowlist. The allowlist only wins if you can promise every listed domain has no open redirect, no endpoint that persists GET parameters, and no chance of lapsing out of your control.
- **needs first:** lethal-trifecta
- **figures you may cite:**
  - EchoLeak is CVE-2025-32711, reported to Microsoft in January 2025 and published 11 June 2025
  - Salesforce ForcedLeak was published 26 September 2025
  - Superhuman AI (12 January 2026) leaked dozens of emails through a CSP rule permitting markdown images from docs
  - In GitLab Duo (May 2025) an injection hidden in public repo source pulled a private merge request, base64-encoded the diff into a URL and shipped it through an img src
  - Slack AI (August 2024) needed one click instead: it rendered a "click here to reauthenticate" link carrying a private API key in the query string
  - Closing a channel costs the rendering feature that rode on it, for 100% of legitimate content too

### `output-side-validation` — Output-side validation
- **is:** Treating model output as untrusted input to whatever consumes it, and validating or encoding it at that consumer's boundary. OWASP files it as LLM05:2025, Improper Output Handling.
- **when:** Whenever model output reaches something that interprets it: a browser DOM, a shell, a SQL driver, an email template, or a downstream extension holding privileges above the end user's.
- **costs:** One encoder per consumer, not one per application. The same string needs HTML encoding for the DOM and parameter binding for SQL, so a single shared sanitize() is itself the defect, and tag allowlisting is the price of keeping markdown rendering alive.
- **cheaper first:** Take the privilege away from the consumer first. A report generator with a read-only credential needs no SQL validation because it cannot drop a table; validation earns its cost only when that consumer must keep the ability to mutate state.
- **needs first:** indirect-prompt-injection

### `agent-sandboxing-least-privilege` — Agent sandboxing and least-privilege tool permissions
- **is:** Two layers: permission rules decide whether a tool call runs, and an OS-enforced sandbox bounds what the running process can read, write and reach.
- **when:** When the agent runs code you did not read line by line, and you can name the directories and the domain list the task genuinely needs. If you cannot name them, you are not ready to auto-allow anything.
- **costs:** Real tools break inside it: docker and watchman do not run sandboxed at all, jest needs --no-watchman, and Go-based CLIs such as gh, gcloud and terraform can fail TLS verification under Seatbelt. Native Windows is unsupported, so a Windows fleet needs WSL2.
- **cheaper first:** Write deny rules for the specific paths and domains you care about first. They cost minutes, apply to every tool rather than only Bash, and are the cheaper answer whenever you can still enumerate what the agent should touch.
- **needs first:** lethal-trifecta

### `human-in-the-loop-placement` — Where the human belongs in the loop
- **is:** The choice of which agent action a person must approve, made so the approval is legible to that person and rare enough that they still read it.
- **when:** Put the gate on the last step that crosses a trust boundary, where the reviewer can still see the payload: the outbound send, the write to a shared system, the merge. Read-only steps do not earn a prompt.
- **costs:** Each prompt spends reviewer attention, a budget that runs out. The design-patterns paper calls per-step approval impractical for a SQL agent because requests scale with queries and iterations, and burdensome for a coding agent.
- **cheaper first:** Cut the tool surface before improving the approval dialog. If a normal run raises forty confirmations the reviewer will click through all of them, and a smaller tool list gets you to a handful of prompts that stay legible.
- **needs first:** lethal-trifecta
