# Cluster: serving — "Serving and performance"

Current tagline (EN): Time-to-first-token, tokens-per-second and cost pull in different directions. You choose two.
Current tagline (ES): El tiempo al primer token, los tokens por segundo y el costo tiran en direcciones distintas. Eliges dos.

## The 9 entry slugs — your families MUST partition exactly these

- `prefill-vs-decode`
- `kv-cache-memory-cost`
- `continuous-batching`
- `paged-attention`
- `speculative-decoding`
- `weight-quantization-vs-kv-cache-quantization`
- `ttft-vs-itl-vs-throughput`
- `batch-size-as-the-latency-cost-lever`
- `streaming-responses`

## Each entry, so your primer sits ABOVE them and never restates one

### `prefill-vs-decode` — Prefill vs decode
- **is:** The two phases of one LLM request: prefill reads the whole prompt in a single parallel pass, decode then produces one token per forward pass.
- **when:** When TTFT and inter-token latency do not tell the same story. Raise batch size: if throughput climbs while inter-token latency barely moves you are decode-bound, and if TTFT tracks prompt length you are prefill-bound.
- **costs:** Decode wastes most of the chip. Its arithmetic intensity is low enough that on one A100 a Mistral-7B batch pays for 1 decode token what it pays for 128 prefill tokens, so decode throughput is set by memory bandwidth and not by FLOPs.
- **cheaper first:** Raising batch size before adding a second GPU. Decode is bandwidth-bound, so extra sequences ride along nearly free, and this wins as long as KV cache memory still has room for them.
- **figures you may cite:**
  - 1 decode token costs roughly what 128 prefill tokens cost in the linear layers of Mistral-7B on one A100
  - DistServe reports a 13B model becoming compute-bound at a 512-token prefill on an A100
  - Naive hybrid batching raised P99 time-between-tokens up to 28.3x
  - Sarathi-Serve used token budgets of 2048 (relaxed SLO) and 512 (strict), and reported up to 2
  - 6x throughput within SLO for Mistral-7B on one A100
  - Sarathi-Serve measured on Mistral-7B on one A100 that the linear layers cost about the same for 1 decode token as for 128 prefill tokens

### `kv-cache-memory-cost` — KV cache and its memory bill
- **is:** The keys and values of every token already processed, kept in GPU memory so each new token can attend to the past without recomputing it.
- **when:** Before picking a GPU or fixing a max context length. Compute bytes per token from the model config, multiply by max_model_len times target concurrency, and check it fits in what is left after the weights.
- **costs:** On a 40 GB A100 serving a 13B model, 26 GB goes to weights and about 12 GB is left for KV cache, which is 15.7K token slots in total. At a 1.5K-token context that is roughly ten concurrent sequences, however many FLOPs sit idle.
- **cheaper first:** Cutting the served context length. Bytes scale linearly with tokens held, so halving max_model_len roughly doubles concurrency through a config change, and it only loses if real prompts need the range.
- **needs first:** prefill-vs-decode
- **figures you may cite:**
  - OPT-13B in FP16 needs 800 KB of KV cache per token (2 x 5120 hidden x 40 layers x 2 bytes) and up to 1
  - 6 GB per request
  - On a 40 GB A100 that model takes 26 GB of weights, about 65% of memory, against close to 30% for request state, leaving 12 GB and 15
  - A 66B model needs 21 GB of KV cache on 4 A100s, and a 175B model 264 GB on 8 A100-80GB
  - Every layer stores one key vector and one value vector per token, so bytes per token are 2 times hidden size times layers times bytes per element
  - For OPT-13B in FP16 that is 2 x 5120 x 40 x 2, which the PagedAttention paper puts at 800 KB per token and up to 1

### `continuous-batching` — Continuous batching
- **is:** Batch scheduling decided once per model iteration, so a finished sequence releases its slot immediately and a queued request takes it without waiting for the rest of the batch.
- **when:** When generated lengths vary across requests. Divide the longest generation in your traffic by the mean: that ratio approximates the fraction of GPU time static batching throws away.
- **costs:** CPU scheduling work before every forward pass. A Llama-8B pass on an H100 can take about 5 ms, so per-step Python bookkeeping becomes the bottleneck, and vLLM rebuilt its loop in V1 for up to 1.7x throughput over V0 with near-identical kernels.
- **cheaper first:** Fixing the output length. With a capped max_tokens and uniform prompts, static batching wastes almost nothing, which is why a classification job with 512-token inputs gains nothing from a scheduler.
- **needs first:** prefill-vs-decode, kv-cache-memory-cost
- **figures you may cite:**
  - Worst-case static batching fell to 81 token/s
  - vLLM V1 reports up to 1.7x over V0 and under 1% throughput loss from prefix caching at a 0% hit rate
  - Iteration-level scheduling, introduced by the Orca paper at OSDI 2022, re-forms the batch before every pass instead
  - A Llama-8B pass on an H100 can take about 5 ms, so per-step Python bookkeeping becomes the bottleneck, and vLLM rebuilt its loop in V1 for up to 1
  - 7x throughput over V0 with near-identical kernels

### `paged-attention` — PagedAttention
- **is:** An attention implementation that stores the KV cache in fixed-size blocks placed anywhere in GPU memory, with a per-request table mapping logical token positions to physical blocks.
- **when:** When memory profiling shows large reserved-but-unused KV space, or when several requests share a long prefix, which is the case for a fixed system prompt, parallel sampling and beam search.
- **costs:** The kernel pays for indirection: the PagedAttention paper measured 20% to 26% higher attention kernel latency than FasterTransformer's contiguous implementation, bought back by keeping 2.2x more requests resident than Orca (Oracle).
- **cheaper first:** Trimming the reservation instead. If max_model_len sits far above real prompt lengths, lowering it recovers much of the same memory with no kernel change, and that wins when requests never share prefixes.
- **needs first:** kv-cache-memory-cost, continuous-batching
- **figures you may cite:**
  - Existing systems used only 20.4% to 38
  - 2% of KV cache memory for real token state, against under 4% waste with paged blocks
  - Default block size is 16 tokens, with 16 to 128 measured as best on ShareGPT
  - Throughput improves 2x to 4x at equal latency, sustaining 1
  - 7x higher request rates than Orca (Oracle) and up to 22x than FasterTransformer, at 20% to 26% higher attention kernel latency
  - Sharing saved 6.1% to 9

### `speculative-decoding` — Speculative decoding
- **is:** A cheap proposer guesses several tokens per step and the target model verifies them in one forward pass, keeping the target model's output distribution.
- **when:** Reach for it when inter-token latency is the complaint and the GPU sits memory-bound at low concurrency. vLLM names the target workload explicitly: "medium-to-low QPS (query per second), memory-bound workloads".
- **costs:** Extra draft FLOPs on every step, spent on tokens that may be rejected. Pipeline parallelism is not composable with it as of `vllm<=0.15.0`, and vLLM "does not currently guarantee stable token log probabilities (logprobs)" once it is on.
- **cheaper first:** Raise the batch bound first. If the GPU already runs at high concurrency, speculation steals the compute that batching was turning into throughput, and only a proposer with a high acceptance rate still wins.
- **figures you may cite:**
  - report 2X-3X acceleration on T5-XXL with identical outputs
  - vLLM's n-gram proposer defaults to a lookup window of 5 when both `prompt_lookup_min` and `prompt_lookup_max` are omitted
  - Suffix decoding defaults to `suffix_decoding_max_tree_depth` 24, `suffix_decoding_max_cached_requests` 10000, and `suffix_decoding_min_token_prob` 0
  - demonstrated 2X-3X acceleration on T5-XXL with identical outputs
  - Pipeline parallelism is not composable with it as of `vllm<=0.15.0`, and vLLM "does not currently guarantee stable token log probabilities (logprobs)" once it is on

### `weight-quantization-vs-kv-cache-quantization` — Weight quantization vs KV-cache quantization
- **is:** Weight quantization shrinks the stored parameters, a fixed amount of memory. KV-cache quantization shrinks the per-token attention state, an amount that grows with traffic.
- **when:** Quantize weights when the model barely fits on the card or when decode is bandwidth-bound in the weights. Quantize the KV cache when the scheduler is preempting and recomputing requests because KV blocks ran out.
- **costs:** FP8 weights measured 0.768 +/- 0.0268 exact_match on gsm8k 5-shot over 250 samples, and W8A8 acceleration requires compute capability 8.9 or higher — Ada Lovelace and newer; Turing falls back to weight-only W8A16 via FP8 Marlin. FP8 KV cache with `calculate_kv_scales=False` sets "All quantization scales are set to `1.0`", and sliding-window attention layers are "more sensitive to KV-cache quantization".
- **cheaper first:** Try a smaller model at full precision first. A 7B at FP16 that passes your eval beats a quantized 70B whose accuracy on your own task you never measured, and it costs zero calibration engineer-time.
- **figures you may cite:**
  - FP8 W8A8: 2x weight-memory reduction, up to 1
  - 6x throughput, gsm8k exact_match 0
  - 0268. Llama 2 7B holds about 14 GB of FP16 weights against about 2 GB of KV cache at 4096 tokens and batch size 1
  - E4M3 has 1 sign bit, 4 exponent bits, 3 mantissa bits and a range to +/-448
  - E5M2 reaches +/-57344 with "lower precision of the stored values"
  - Recommended KV calibration uses 512 samples at sequence length 2048

### `ttft-vs-itl-vs-throughput` — TTFT, inter-token latency and throughput as three separate goals
- **is:** Three serving targets measured differently: time to the first token, average time between later tokens, and total output tokens per second across all requests in flight.
- **when:** Name the one your product is judged on before tuning anything. A chat surface is judged on TTFT and inter-token latency, a nightly extraction job only on tokens per second and dollars.
- **costs:** You cannot hold all three at once. In vLLM, `max_num_batched_tokens` at 2048 "achieve better ITL because there are fewer prefills slowing down decodes", higher values "achieve better time to first token", and throughput wants it above 8192.
- **cheaper first:** Measure the three on your own traffic before changing a single flag. Definitions differ across tools and NVIDIA AIPerf excludes TTFT from inter-token latency, so a vendor number and yours may not name the same quantity.
- **figures you may cite:**
  - Inter-token latency is `(e2e_latency - TTFT) / (Total_output_tokens - 1)`
  - Per-user tokens per second "asymptotically approaches 1/ITL as the output sequence length increases"
  - In vLLM, `max_num_batched_tokens` 2048 favours inter-token latency and above 8192 favours throughput
  - Inter-token latency, also called time per output token, is `(e2e_latency - TTFT) / (Total_output_tokens - 1)`, which isolates the decode phase
  - In vLLM, `max_num_batched_tokens` at 2048 "achieve better ITL because there are fewer prefills slowing down decodes", higher values "achieve better time to first token", and throughput wants it above 8192

### `batch-size-as-the-latency-cost-lever` — Batch size as the latency/cost lever
- **is:** How many sequences the GPU decodes in one step. Raising it spreads each weight read across more requests, so cost per token falls and per-request latency rises.
- **when:** Raise the batch bound while p99 TTFT still clears your target and preemptions stay at zero. Lower it the moment the scheduler starts recomputing preempted requests, which is the vLLM V1 default mode.
- **costs:** The ceiling is arithmetic: free HBM after weights divided by KV bytes per sequence. A Llama 2 7B at 4096 tokens is about 2 GB per sequence against about 14 GB of weights, so an 80 GB card holds roughly 30 sequences before vLLM preempts with RECOMPUTE. Static batching also makes every request wait for the longest one in its batch.
- **cheaper first:** Cap concurrency at the door with a queue and an admission limit before buying a second GPU. If p99 already fits at the batch size that holds in memory, more hardware buys headroom you are not using.
- **figures you may cite:**
  - KV cache per token is `2 * num_layers * (num_heads * dim_head) * precision_in_bytes`
  - Llama 2 7B at 4096 tokens, batch size 1, 16-bit is about 2 GB against about 14 GB of weights
  - The vLLM paper reports 2-4x throughput at the same latency versus FasterTransformer and Orca, from "near-zero waste in KV cache memory"
  - 6.0 post measured 2
  - 7x throughput on Llama 8B on 1xH100 and 1
  - 8x on 70B on 4xH100

### `streaming-responses` — Streaming responses
- **is:** Sending the answer incrementally over server-sent events as tokens are produced, rather than one HTTP body delivered after the final token.
- **when:** Stream whenever a human waits on the output, and whenever `max_tokens` is large enough that a single body would risk an HTTP timeout. The SDKs require streaming for large `max_tokens` for that reason.
- **costs:** Total generation time does not drop by one millisecond, and the server pays for the chunking: vLLM's own profile puts the HTTP API server at 33% of total execution time, against 1 token every 13 ms under light load. You also take on partial-output state, retry semantics on a stream that breaks mid-message, and the loss of any chance to validate the whole answer before the user reads its first tokens.
- **cheaper first:** If nothing renders the partial output, do not stream. The Message Batches API charges 50% of standard prices for the same work, at the price of up to 24 hours of latency and a chance the request expires.
- **figures you may cite:**
  - The Message Batches alternative is charged "at 50% of the standard API prices", most batches finish in under 1 hour, requests expire at 24 hours, and results stay available 29 days
  - Streaming is not free on the server: vLLM measured an 8B model emitting "1 token every 13 ms under light load" and found "The HTTP API server takes 33% of the total execution time"
  - Total generation time does not drop by one millisecond, and the server pays for the chunking: vLLM's own profile puts the HTTP API server at 33% of total execution time, against 1 token every 13 ms under light load
