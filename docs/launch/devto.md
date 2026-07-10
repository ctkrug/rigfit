---
title: "I built a reverse recommender for local LLMs: hardware in, models out"
published: false
tags: localllm, typescript, webdev, sideproject
---

Every "which local model should I run" guide has the same shape: a table of
models, and somewhere in a footnote, the VRAM each one needs. So you pick a
model, hunt down its GGUF quant sizes, do the arithmetic in your head, decide it
doesn't fit, and start over. I did this enough times that I built the inverse:
you give it your GPU and RAM, it gives you the models. I called it Rigfit.

**Live:** https://apps.charliekrug.com/rig-planner/
**Code:** https://github.com/ctkrug/rig-planner

## The fit is arithmetic, not a lookup table

The tempting shortcut is a static map from "GPU" to "models that fit." It goes
stale the moment a new quant format lands, and it can't answer "what context
length can I actually get?" So the core of Rigfit is a small solver that runs
the same calculation you would do by hand.

Two things compete for your VRAM: the model weights and the KV cache. Weights
are fixed per quantization. The KV cache grows with context length and roughly
with model size, because there are more layers and heads to cache per token. I
calibrated a single factor against GQA models like Llama 3, where a ~5&nbsp;GB
Q4 weight file needs roughly 1&nbsp;GB of KV cache at 8K context:

```ts
const KV_CACHE_GB_PER_1K_TOKENS_PER_MODEL_GB = 0.02;

function kvCacheGb(sizeGb: number, contextTokens: number): number {
  return sizeGb * KV_CACHE_GB_PER_1K_TOKENS_PER_MODEL_GB * (contextTokens / 1000);
}
```

From there the solve is: do the weights fit VRAM? If yes, how much context fits
in what's left? A model that runs at its full window with headroom to spare is
green; one that has to truncate its context is yellow. If the weights alone
overflow VRAM, can the excess run from system RAM without more than a set
fraction of the model going off-GPU? A modest offload is still yellow; too much
is red and drops out of the list. The output is a ranked list with a
green/yellow/red badge and the headroom math behind each one.

## Freshness without a backend

I wanted the ranking to reflect what's good this week, not whenever I last
edited a JSON file. But I also wanted a static site with no server and no API
keys in the browser. The compromise: a scheduled script.

A GitHub Actions cron runs weekly, pulls trending text-generation models from
Hugging Face and recent local-LLM discussion from Hacker News, and commits the
merged snapshot to `data/trending.json`. The deployed site just imports that
JSON at build time. No runtime fetches, no rate limits, no cost, and the data is
never more than a week old.

Matching those trending IDs back to catalog entries turned out to be the fiddly
part. A Hugging Face ID like `meta-llama/Llama-3.1-8B-Instruct` has to match a
catalog entry that might carry a different org prefix or a quant suffix. I
compare the name component after the last slash, tolerate one being a prefix of
the other, and enforce a four-character floor so short generic names don't
false-match. Trending only breaks ties between equal fits; it never promotes a
worse-fitting model over a better one, so the list stays honest.

## What I would do differently

The catalog is hand-maintained JSON. That was the right call for a first version
(I control accuracy, and quant tables do not change often), but the natural next
step is to generate catalog entries from the same Hugging Face data the trending
script already pulls, so new models appear without me editing a file.

The other thing I underinvested in early and then fixed: tests. The solver has a
lot of boundaries (the context floor, the headroom threshold, the offload
ratio), and every one of them is exactly the kind of off-by-a-little bug that
ships silently. Pinning each boundary with a test, and enforcing a coverage
floor in CI, is what let me refactor the ranking without fear.

If you run models locally, try it with your actual rig and tell me where the fit
estimate is off. The KV-cache factor is a calibrated approximation, and real
numbers from real hardware are the best way to sharpen it.
</content>
