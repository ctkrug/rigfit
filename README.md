# Rigfit

**▶ Live demo: [apps.charliekrug.com/rig-planner](https://apps.charliekrug.com/rig-planner/)**

The best local LLM your GPU can run, with the exact quantization, refreshed weekly.

[![CI](https://github.com/ctkrug/rig-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/rig-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Tell Rigfit your GPU VRAM and system RAM. It gives you back a ranked list of
local LLMs and the exact quantization to run, each with a green/yellow/red fit
badge, so you stop downloading 15&nbsp;GB of weights just to find out they page
straight into RAM.

Most "which local model should I run" advice is a static spec sheet from six
months ago or a forum thread that went stale before you read it. Rigfit flips
the usual flow (model → does it fit?) around: you give it the hardware you
actually have, and it solves for the best-fitting model, ranked by how well it
fits, with a weekly pulse on what's currently trending on Hugging Face and
Hacker News layered on top.

## Who it's for

People running local LLMs on a gaming or workstation GPU who don't want to do
GGUF quantization math by hand or spend an evening cross-referencing model
cards. If you use Ollama or llama.cpp and just want to know what's worth
downloading tonight, this is for you.

## What it does

- **Reverse recommendation.** Enter GPU VRAM + system RAM (and optionally a GPU
  model for a realistic usable-VRAM estimate) and get a ranked list of local
  LLMs and quantization levels you can run right now, not a spec sheet you have
  to interpret yourself.
- **Real constraint solving.** Every candidate is scored on VRAM headroom,
  usable context length at that quantization, and a RAM-offload fallback for
  borderline fits. It is arithmetic on your numbers, not a hardcoded lookup.
- **Green / yellow / red fit badges.** See at a glance whether a model fits
  comfortably, fits with a truncated context, or needs offloading before you
  commit to the download.
- **Weekly trending refresh.** A scheduled script pulls what's actually hot in
  the local-LLM community (Hugging Face trending + Hacker News) so trending
  models break ties toward the top, reflecting this week and not a snapshot
  from whenever the catalog was last edited.

## Sample output

Pick an RTX 4070 (12&nbsp;GB VRAM, 0.75&nbsp;GB reserved for the driver) with
32&nbsp;GB of system RAM and the top of the ranked list reads:

```
Llama 3.2 3B Instruct   Q4_K_M   Comfortable fit
  Full 131.1K tokens context · 11.25GB VRAM − 8.2GB required = 3.0GB headroom

Qwen2.5 3B Instruct     Q4_K_M   Comfortable fit
  Full 32.8K tokens context · 11.25GB VRAM − 4.2GB required = 7.0GB headroom

Gemma 2 2B Instruct     Q4_K_M   Comfortable fit
  Full 8.2K tokens context · 11.25GB VRAM − 3.3GB required = 8.0GB headroom
```

Comfortable fits come first, most headroom first, so the top rows are the
safest picks that run at their full context window. Larger 7B and 8B options
that also fit this rig follow below, and each row expands to show the headroom
math and achievable context that earned its badge.

## How the fit math works

- **Weights first.** Each quantization has a different file size; Rigfit checks
  the weights against your VRAM before anything else.
- **Context in the leftover.** Whatever VRAM remains holds the KV cache, which
  grows with context length. Rigfit computes the longest context you can
  actually reach and marks a fit yellow when it has to truncate the model's
  full window.
- **RAM offload as a fallback.** When the weights are slightly too big for VRAM,
  part of the model can run from system RAM. Rigfit includes those fits and
  flags the offload rather than pretending they run at full speed.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the module breakdown and
[`docs/VISION.md`](docs/VISION.md) for the design rationale.

## Stack

- **TypeScript** throughout: the app and the data pipeline share the same model
  and hardware types.
- **Vite** for the static frontend build. No server, so it deploys to any
  static host or subpath.
- **A scheduled data-refresh script** ([`scripts/refresh-trending.ts`](scripts/refresh-trending.ts)),
  run weekly via GitHub Actions, that regenerates `data/trending.json` from live
  Hugging Face and Hacker News signal and commits the update.
- **Vitest** for the solver and data-pipeline test suite, with a CI-enforced
  coverage floor.

## Develop

```bash
npm install
npm run dev            # local dev server at http://localhost:5173
npm test               # run the test suite
npm run test:coverage  # tests with a v8 coverage report
npm run build          # production build to dist/
npm run refresh-data   # regenerate data/trending.json from live HF/HN signal
```

## Project layout

```
src/                Frontend app (Vite + TS): rig input, solver, results UI
scripts/            Scheduled data-refresh script (Hugging Face / HN trending pull)
data/               Data consumed by the app (model catalog, trending snapshot)
tests/              Unit tests (solver, trending, validate, render, full flow)
docs/               Vision, architecture, backlog, and design direction
.github/workflows/  CI (typecheck/test/build) + weekly trending-refresh cron
```

## License

MIT, see [LICENSE](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)
</content>
</invoke>
