# Cluster: model-strategy — "Model strategy"

Current tagline (EN): Prompt, retrieve, fine-tune or distil — the decision has a checkable rule, not a preference.
Current tagline (ES): Prompt, recuperar, ajustar o destilar: la decisión tiene una regla verificable, no una preferencia.

## The 9 entry slugs — your families MUST partition exactly these

- `prompt-rag-finetune-distill-rule`
- `lora`
- `qlora`
- `full-fine-tuning`
- `preference-tuning-dpo`
- `finetuning-dataset-curation`
- `model-tier-routing`
- `build-buy-open-weights`
- `cost-per-resolved-task`

## Each entry, so your primer sits ABOVE them and never restates one

### `prompt-rag-finetune-distill-rule` — The prompt, RAG, fine-tune, distill decision rule
- **is:** A routing rule: label each failing eval item as missing knowledge or wrong behavior, then send knowledge gaps to retrieval and behavior gaps to training.
- **when:** You have 20 or more labeled failures and can sort each one into 'the answer was never in the context' versus 'the context was right there and the output was still wrong'.
- **costs:** Prompt iteration costs minutes. RAG adds retrieval quality as a third axis you now have to evaluate. Fine-tuning starts at 50 or more curated examples plus a hold-out set, and every base-model upgrade re-runs the job.
- **cheaper first:** Prompt engineering wins whenever the failures vanish once you paste the right document in by hand. That single test proves the gap is context, and a retrieval step is cheaper than any training run.
- **figures you may cite:**
  - Icelandic grammar correction, BLEU: zero-shot GPT-4 62, three few-shot examples 70, fine-tuned GPT-3
  - 5 78, fine-tuned GPT-4 87, and 83 once retrieval was added on top
  - Fine-tuning guidance: start at 50 or more examples
  - Get a prompt working first, build an eval set of 20 or more items with ground-truth answers, then classify every failure
  - Fine-tuning starts at 50 or more curated examples plus a hold-out set, and every base-model upgrade re-runs the job

### `lora` — LoRA (low-rank adaptation)
- **is:** Fine-tuning that freezes the pre-trained weights and trains two small matrices per adapted layer, whose product is the weight update.
- **when:** You need several task-specific variants of one base model, and paying full checkpoint size per variant does not fit your storage or your swap latency.
- **costs:** GPT-3 175B at r=4 on Wq and Wv: 4.7M trainable parameters instead of 175,255.8M, a 35MB checkpoint instead of 350GB, and 350GB of training VRAM instead of 1.2TB. The frozen 350GB base still ships at deploy.
- **cheaper first:** A better prompt with few-shot examples. It wins if the failures are format or tone on a task the base model already solved once, because LoRA still costs a curated dataset and a learning-rate sweep whose optimum sits about an order of magnitude above full fine-tuning's.
- **needs first:** prompt-rag-finetune-distill-rule
- **figures you may cite:**
  - GPT-3 175B: 10,000x fewer trainable parameters, 3x lower GPU memory, and 25% higher throughput (43
  - 5 tokens per second per V100)
  - Rank sweep r = 1, 2, 4, 8, 64
  - Serving 100 task adapters costs 354GB total rather than 35TB
  - GPT-3 175B at r=4 on Wq and Wv: 4
  - 7M trainable parameters instead of 175,255

### `qlora` — QLoRA (4-bit quantized LoRA)
- **is:** LoRA over a base model stored in 4 bits, with gradients flowing through the frozen quantized weights into 16-bit adapters.
- **when:** The model you want to adapt does not fit your GPUs at 16 bits: a 65B model needs over 780GB for regular fine-tuning and under 48GB with QLoRA.
- **costs:** One 48GB GPU and 24 hours for a 65B model, or a 24GB consumer GPU and under 12 hours for 33B. Adapter weights are about 0.2% of the base, and the memory you save is paid back as a dequantization step on every matmul.
- **cheaper first:** Plain LoRA on a smaller base. If a 13B model already clears your eval bar it fine-tunes at 16 bits with no quantization step at all, though the gap is real: Guanaco 13B reached 90.4% of ChatGPT on Vicuna against 99.3% for 65B.
- **needs first:** lora
- **figures you may cite:**
  - 65B LLaMA: over 780GB of GPU memory down to under 48GB
  - Guanaco 65B: 41GB, 99
  - 3% of ChatGPT on Vicuna (plus or minus 4
  - 4%), Elo 1022
  - Guanaco 33B: 21GB, 97
  - Double quantization saves 0.373 bits per parameter, roughly 3GB at 65B

### `full-fine-tuning` — Full fine-tuning
- **is:** Training every weight of a pre-trained model on your data, producing a new complete checkpoint rather than a small adapter.
- **when:** Continued pretraining on 10B or more tokens of a domain the base model barely saw, and only after a rank-256 adapter has been swept and still trails on your eval.
- **costs:** 18 bytes per parameter for weights, Adam state and gradients before activations, plus one full-size checkpoint per task instead of a 35MB adapter. The learning rate must also be re-swept about an order of magnitude below LoRA's: 5e-5 on code against 5e-4.
- **cheaper first:** LoRA at r=256 with alpha=512 on all modules. It wins on instruction fine-tuning: on Magicoder code data it reached 0.498 pass@1 on HumanEval against 0.497 for full fine-tuning, while holding more of the base model's out-of-domain scores.
- **needs first:** prompt-rag-finetune-distill-rule
- **figures you may cite:**
  - Llama-2 7B, 20B tokens of StarCoder-Python: full fine-tuning 0
  - 263 HumanEval pass@1 against 0
  - 224 for LoRA r=256, with forgetting averages 0
  - 545 against 0
  - 617. Math continued pretraining: 0
  - 293 GSM8K at 20B tokens against 0

### `preference-tuning-dpo` — Preference tuning with DPO
- **is:** Training on pairs of one preferred and one rejected answer, where the loss raises the preferred one relative to a frozen copy of the same model.
- **when:** You already have thousands of pairwise judgements on your own traffic, and supervised fine-tuning plateaued on a preference nobody can write down as a single target answer, such as tone or refusal style.
- **costs:** Two model copies in memory during training, the policy and the frozen reference, plus one preference pair per training example. The paper's sentiment run swept beta over {0.05, 0.1, 1, 5}, 22 runs in total.
- **cheaper first:** Supervised fine-tuning on demonstrations of the answer you want. LIMA reached parity or better against GPT-4 in 43% of human comparisons using 1,000 curated pairs and no preference modelling at all, so if you can write the good answer you do not need a rejected one.
- **needs first:** finetuning-dataset-curation
- **figures you may cite:**
  - DR summarization judged by GPT-4 against reference summaries: DPO 61% win rate at temperature 0
  - 0, PPO about 57% at its best temperature
  - Head to head, humans preferred DPO at temperature 0.25 over PPO at 0
  - 0 in 58% of cases
  - Models studied up to 6B parameters, Anthropic HH set of 170k dialogues
  - The paper's sentiment run swept beta over {0.05, 0

### `finetuning-dataset-curation` — Curating the fine-tune and eval sets
- **is:** Choosing, labelling and pruning the examples a fine-tune or an eval set is built from: how many, which edge cases, and what has to be removed.
- **when:** You can name the failing cases out loud, and you have fewer than 50 labelled examples of each one, so the next hour of work is collecting them rather than changing the model.
- **costs:** 10 examples is the hard floor for an OpenAI fine-tuning job and 50 the recommended start. Every eval case also needs a label, and the worked eval sets in Anthropic's guide run from 50 groups up to 1,000 labelled items per dimension.
- **cheaper first:** Put 20 of those examples in the prompt as few-shot instead of training on them. If few-shot closes the gap, what you collected is an eval set and the fine-tuning job never needs to run.
- **figures you may cite:**
  - OpenAI supervised fine-tuning: minimum 10 training examples, 50 recommended to start, improvements reported from 50 to 100 examples, one checkpoint per epoch with only the last three epochs kept
  - OpenAI accepts a fine-tuning file with 10 lines of JSONL, recommends starting at 50 well-crafted demonstrations, and reports gains from 50 to 100 examples
  - Its stated rule is that if 50 solid examples move nothing, rethink the task or the prompt before adding data
  - 10 examples is the hard floor for an OpenAI fine-tuning job and 50 the recommended start
  - Every eval case also needs a label, and the worked eval sets in Anthropic's guide run from 50 groups up to 1,000 labelled items per dimension

### `model-tier-routing` — Routing between model tiers
- **is:** Deciding per request whether a cheap model or an expensive one answers it, using a score predicted before the answer exists.
- **when:** Two tiers you would actually deploy differ by more than an order of magnitude in price, and you can measure a quality gap between them on your own set. The paper's pair was Mixtral 8x7B at about $0.24 against gpt-4-1106-preview at about $24.7 per million tokens.
- **costs:** One extra scoring step per request, which the paper measures at no more than 0.4% of GPT-4 generation cost for its most expensive router, plus a labelled preference set: the GPT-4 judge augmentation was about 120K samples for roughly $700.
- **cheaper first:** A static rule over a field you already have, such as input length, account tier, or whether tools are needed. If a hand-written condition captures the easy half of traffic you train nothing, and the routing decision stays readable in a log line.
- **figures you may cite:**
  - Cost saving against always calling GPT-4, at CPT(50%): MT Bench 3
  - 66x while scoring 95% of GPT-4 quality, MMLU 1
  - 41x at 92%, GSM8K 1
  - Against a random baseline the augmented routers cut cost by up to 75% on MT Bench
  - Router overhead at most 0.4%
  - RouteLLM trains a small router on roughly 80k Chatbot Arena battles, 65k after pruning, optionally augmented with MMLU golden labels or GPT-4 judge labels

### `build-buy-open-weights` — Build, buy, open or closed
- **is:** The choice between paying per token for a hosted model, reserving capacity to run open weights yourself, and training your own, priced by utilisation and license.
- **when:** Your traffic is high and steady enough that reserved hours beat per-token billing, or a data-residency or latency requirement rules the hosted endpoint out before cost is even discussed.
- **costs:** A 6-month Provisioned Throughput commitment for Llama 2 70B is $13.08 per model unit per hour, about $9,400 a month per unit and billed at zero traffic. Custom Model Import is $0.05718 per Custom Model Unit per minute in us-east-1, and a Llama 3.1 70B 128k model needs 8 units.
- **cheaper first:** The batch and cache discounts on the hosted model you already call. Anthropic's Batch API takes 50% off input and output, and a cache read is 0.1x base input price, so an asynchronous workload has to beat that floor before any reservation makes sense.
- **figures you may cite:**
  - Bedrock Custom Model Import: $0.05718 per Custom Model Unit per minute in us-east-1 and us-west-2, $0
  - 07144 in eu-central-1, $1
  - 95 monthly storage per unit, billed in 5-minute windows
  - Llama 3.1 8B 128K needs 2 units, 70B 128k needs 8
  - Llama 2 70B Provisioned Throughput: $21
  - 18 per model unit hour at 1 month, $13

### `cost-per-resolved-task` — Cost per resolved task
- **is:** Total spend divided by the number of tasks that ended correct, with retries, failed runs and judge calls all counted in the numerator.
- **when:** The system can retry. Any loop with a verifier, a judge, or a tool-calling agent, where the per-request price understates spend because failed attempts bill exactly like successful ones.
- **costs:** You need token cost logged per attempt and a resolution boolean per task, which means owning an eval that decides 'resolved' at all. HAL paid for this by running and pricing 26,597 rollouts across 9 benchmarks.
- **cheaper first:** Divide last month's provider invoice by last month's resolved tickets. Two numbers you already have beat a per-span instrumentation project, and the invoice already includes every retry you were not counting.
- **figures you may cite:**
  - HAL: 26,597 rollouts over 9 benchmarks
  - Two Scicode agents both score 9.2% at $1
  - 11. SWE-bench Verified Mini: 72
  - 90 with Sonnet 4
  - 35 with Opus 4
  - 1. Online Mind2Web: 40
