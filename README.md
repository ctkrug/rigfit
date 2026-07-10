# Rig Planner

[![CI](https://github.com/ctkrug/rig-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/rig-planner/actions/workflows/ci.yml)

Tell it your GPU and RAM. It tells you the best local LLM — and the exact
quantization — you can actually run *this week*.

Most "which local model should I run" advice is either a static spec sheet
from six months ago or a forum thread that's already stale by the time you
read it. Rig Planner flips the usual flow (model → does it fit?) around:
you give it your hardware budget, and it solves for the best-fitting model,
ranked by how well it actually fits, with a weekly-refreshed pulse on what's
currently blowing up on Hugging Face and Hacker News layered on top.

## What it does

- **Reverse recommendation.** Enter GPU VRAM + system RAM (and optionally a
  GPU model for more accurate headroom estimates) and get a ranked list of
  local LLMs + quantization levels you can run right now — not a spec sheet
  you have to interpret yourself.
- **Real constraint solving.** Every candidate is scored against VRAM
  headroom, usable context length at that quantization, and RAM offload
  fallback — not a hardcoded lookup table.
- **Green / yellow / red fit badges.** Know at a glance whether a model
  comfortably fits, fits with a tight context window, or needs offloading
  before you download 15GB of weights.
- **Weekly trending refresh.** A scheduled script pulls what's actually
  trending in the local-LLM community (Hugging Face + Hacker News) so the
  top of your results reflects what's good *this week*, not just what's
  biggest.

## Stack

- **TypeScript** throughout — app and data pipeline share the same model
  and hardware types.
- **Vite** for the static frontend build (no server required; deployable to
  any static host or subpath).
- **A scheduled data-refresh script** (`scripts/refresh-trending.ts`), run
  weekly via GitHub Actions, that regenerates `data/trending.json` from
  live signal and commits the update.
- **Vitest** for the solver and data-pipeline test suite.

## Project layout

```
src/            Frontend app (Vite + TS): rig input, solver, results UI
scripts/        Scheduled data-refresh script (Hugging Face / HN trending pull)
data/           Generated data consumed by the app (model catalog, trending)
tests/          Unit tests
docs/           Vision, backlog, and design direction
.github/workflows/  CI (test/build) + weekly trending-refresh cron
```

## Development

```bash
npm install
npm run dev        # local dev server
npm test            # run the test suite
npm run build       # production build to dist/
npm run refresh-data  # run the trending-data refresh script locally
```

## Status

Early scope/scaffold stage — see `docs/VISION.md` for the plan and
`docs/BACKLOG.md` for what's built vs. planned.

## License

MIT — see [LICENSE](LICENSE).
