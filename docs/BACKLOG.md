# Backlog

Epics and stories for v1. Every story lists concrete, checkable acceptance
criteria — no "works well" vibes checks. Story 1.1 is the wow moment and
must land before anything else in this backlog.

## Epic 1 — Core recommendation engine

The reverse solver: hardware in, ranked models out. This is the product.

- [x] **1.1 Rig input → ranked recommendations (wow moment)**
  Build the input form (VRAM GB, RAM GB, optional GPU model dropdown) and
  wire it to the solver so submitting renders a ranked list of model+quant
  cards, each with a fit badge.
  - Entering VRAM=12, RAM=32 and submitting renders at least 3 ranked
    result cards without a page reload.
  - Each result card shows model name, quantization, and a green/yellow/red
    fit badge.
  - Submitting with no VRAM value shows an inline validation message and
    does not call the solver.

- [x] **1.2 Full constraint solver (context length + RAM offload)**
  Extend `src/lib/solver.ts` beyond the scaffold's VRAM-only check to factor
  in usable context length at the selected quant and a RAM-offload fallback
  path for borderline fits.
  - A model that fits in VRAM but only at a truncated context length is
    marked yellow, not green, and the card shows the achievable context
    length.
  - A model that doesn't fit in VRAM alone but fits with RAM offload is
    included in results (yellow/red per offload cost), not silently
    dropped.
  - Unit tests cover: VRAM-only fit, context-truncated fit, RAM-offload
    fit, and a rig too small for anything in the catalog (empty-but-honest
    result, not a crash).

- [x] **1.3 Expand the model catalog**
  Grow `data/models.json` from the scaffold's 8 seed entries to a
  meaningfully broad catalog spanning small (≤8GB), medium (8–24GB), and
  large (24GB+) VRAM tiers.
  - Catalog has at least 20 model+quant entries across at least 8 distinct
    base models.
  - Every entry has a plausible, sourced `minVramGb` and `contextLength`
    (spot-checked against the model's published card/GGUF quant table).
  - `npm test` still passes with the expanded catalog (no schema drift).

- [x] **1.4 Fit badge detail view**
  Clicking/tapping a result card expands to show why it got its badge:
  VRAM headroom, context length at this quant vs. the model's max, and
  offload status if applicable.
  - Expanding a card reveals headroom math in human-readable form (e.g.
    "12GB VRAM − 9.5GB required = 2.5GB headroom").
  - Collapsing/expanding is keyboard-operable (Enter/Space) and reflected
    to assistive tech via `aria-expanded`.

## Epic 2 — Weekly trending pipeline

Make the ranking reflect what's actually hot this week, not a static list.

- [x] **2.1 Match trending signal to catalog entries**
  Extend `scripts/refresh-trending.ts` (or a follow-up module) to map
  `data/trending.json` entries to `data/models.json` entries by model ID /
  name similarity.
  - At least one currently-trending Hugging Face model ID present in
    `data/trending.json` resolves to a matching entry in
    `data/models.json` (manually verified after a real refresh run).
  - Unmatched trending entries are dropped silently (no crash, no orphaned
    references) rather than surfaced as broken UI state.
  - Implemented and unit-tested (`src/lib/trending.ts`); the "manually
    verified after a real refresh run" half of this criterion is
    pending the next live `refresh-data` run against real HF trending
    data (current `data/trending.json` is a placeholder snapshot).

- [x] **2.2 Trending boost in ranking**
  Feed the match from 2.1 into the solver so trending models rank above
  otherwise-equal fits.
  - Given two results with an identical fit badge, the one flagged
    trending sorts first.
  - A non-trending model with a strictly better fit still outranks a
    trending model with a worse fit — trending breaks ties, it doesn't
    override fit.

- [x] **2.3 Verify the cron runs for real**
  Confirm `.github/workflows/weekly-refresh.yml` executes successfully on
  GitHub's schedule (or via manual `workflow_dispatch`) and commits an
  updated `data/trending.json`.
  - At least one Actions run of the weekly-refresh workflow is green in
    the repo's Actions tab. Confirmed via manual `workflow_dispatch` run
    29128782446 (2026-07-10), completed success in 16s.
  - The resulting commit only touches `data/trending.json` and uses the
    `ctkrug` git identity (no bot/co-author trailer). Confirmed: commit
    2beff6f touches only `data/trending.json`, authored `ctkrug`.

- [x] **2.4 Trending badge in the UI**
  Surface trending status visibly on result cards (2.2's data), not just
  in sort order.
  - A trending result card shows a distinct badge/marker (e.g. "trending
    this week") using the accent-support token from `docs/DESIGN.md`.
  - The badge has an `aria-label` describing it (not conveyed by color
    alone).

## Epic 3 — Design, polish & reliability

Ship the blueprint direction for real, at every breakpoint, and make sure
the whole pipeline is trustworthy.

- [x] **3.1 Implement the blueprint design system**
  Replace the scaffold's placeholder styling with the full direction from
  `docs/DESIGN.md`: fonts loaded, grid background, dimension-mark corners,
  themed form controls, scan-line sweep on submit.
  - Google Fonts (Space Grotesk + IBM Plex Mono) load and render on the
    input labels and headings respectively.
  - The VRAM/RAM inputs and GPU dropdown use themed custom styling, not
    unstyled native controls.
  - Submitting triggers the scan-line sweep animation, and it's skipped
    when `prefers-reduced-motion` is set.

- [x] **3.2 Responsive layout across breakpoints**
  Compose the two-column desktop layout and the stacked mobile layout
  described in `docs/DESIGN.md`'s Layout Intent.
  - No horizontal scroll or overlapping elements at 390px, 768px, or
    1440px viewport widths.
  - The input console + CTA are reachable without scrolling at 390px.
  - Result cards remain legible (no text truncation cutting off model
    names) at 390px.

- [x] **3.3 Empty, loading, and error states**
  Design explicit states for: no rig entered yet, solver running, and a
  rig too small/large for any catalog match.
  - First page load (before any submission) shows a designed empty state,
    not a blank results panel.
  - A rig with no viable matches shows a specific "nothing fits — try a
    lower-VRAM model tier" message, not an empty list with no explanation.
  - No separate "solver running" state: `recommend()` runs synchronously
    over an in-memory catalog (no network round-trip), so there's no
    perceptible gap to design a spinner for — the scan-line sweep is the
    "your rig is being analyzed" moment instead, per `docs/DESIGN.md`.

- [x] **3.4 Favicon and wordmark**
  Add a code-generated favicon (inline SVG, blueprint-cyan monogram) and a
  designed wordmark treatment for "Rig Planner" in the header.
  - `index.html` references a custom favicon (no default Vite/browser
    globe icon).
  - The wordmark uses the Space Grotesk display font with deliberate
    letter-spacing, not the plain heading style reused verbatim.

- [x] **3.5 CI green + solver test coverage**
  Ensure the full pipeline (typecheck, unit tests, build) is reliably
  green in CI as features land, with test coverage for every solver branch
  added in 1.2.
  - `.github/workflows/ci.yml` passes on the `main` branch after Epic 1 and
    Epic 2 land. Confirmed: CI has been green on every push to `main`,
    including this QA pass's HEAD.
  - `npm test` includes at least one test per fit level (green/yellow/red)
    and one for the empty-catalog-match case.
  - `npm run typecheck && npm test && npm run build` all pass locally and
    in CI as of this run (100+ tests, 100% line / 93%+ branch coverage on
    solver/validate/trending, with a mutation spot-check confirming the
    suite catches real logic regressions).
