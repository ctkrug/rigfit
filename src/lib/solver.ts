import type { FitLevel, FitResult, ModelVariant, Recommendation, RigSpec } from "./types";

/** Headroom (GB) at full context above which a fit is "comfortable" rather than "tight". */
const GREEN_HEADROOM_GB = 2;

/**
 * KV cache scales with context length and roughly with model size (more layers/heads to
 * cache per token). Calibrated against GQA models like Llama 3: an ~5GB Q4 weight file needs
 * roughly ~1GB of KV cache at an 8K context, which this factor reproduces.
 */
const KV_CACHE_GB_PER_1K_TOKENS_PER_MODEL_GB = 0.02;

/** Below this, a context window is too short to be a usable chat/agent session. */
const MIN_USABLE_CONTEXT_TOKENS = 2048;

/** Reserved for OS + KV cache headroom when the rest of the model is offloaded to RAM. */
const RAM_OFFLOAD_OVERHEAD_GB = 4;

/** Above this fraction of the model living in system RAM, offloaded inference is too slow to call a fit. */
const RAM_OFFLOAD_MAX_RATIO = 0.4;

function kvCacheGb(sizeGb: number, contextTokens: number): number {
  return sizeGb * KV_CACHE_GB_PER_1K_TOKENS_PER_MODEL_GB * (contextTokens / 1000);
}

/** The longest context that fits a KV cache into `availableGb`, capped at the model's max. */
function maxContextForBudget(sizeGb: number, availableGb: number, maxContext: number): number {
  if (availableGb <= 0) return 0;
  const perTokenGb = (sizeGb * KV_CACHE_GB_PER_1K_TOKENS_PER_MODEL_GB) / 1000;
  return Math.min(maxContext, Math.floor(availableGb / perTokenGb));
}

/**
 * Full constraint solve for one variant against one rig: does it fit purely in VRAM (at what
 * context), does it need RAM offload, and how much headroom is left either way. This is the
 * kernel the recommend() ranking is built on.
 */
export function evaluateFit(spec: RigSpec, variant: ModelVariant): FitResult {
  const weightDeficitGb = variant.minVramGb - spec.vramGb;

  if (weightDeficitGb <= 0) {
    const availableForKvGb = spec.vramGb - variant.minVramGb;
    const achievableContext = maxContextForBudget(variant.sizeGb, availableForKvGb, variant.contextLength);

    if (achievableContext < MIN_USABLE_CONTEXT_TOKENS) {
      return { fit: "red", achievableContext, offloaded: false, headroomGb: availableForKvGb };
    }

    const fullContextVramGb = variant.minVramGb + kvCacheGb(variant.sizeGb, variant.contextLength);
    const headroomGb = spec.vramGb - fullContextVramGb;
    const fit: FitLevel =
      achievableContext >= variant.contextLength && headroomGb >= GREEN_HEADROOM_GB ? "green" : "yellow";

    return { fit, achievableContext, offloaded: false, headroomGb };
  }

  // Weights alone exceed VRAM: the excess must live in system RAM as offloaded layers.
  const ramNeededForOffloadGb = variant.sizeGb - spec.vramGb;
  const headroomGb = spec.ramGb - ramNeededForOffloadGb;
  const ramForKvGb = headroomGb - RAM_OFFLOAD_OVERHEAD_GB;

  if (headroomGb <= 0 || ramForKvGb <= 0) {
    return { fit: "red", achievableContext: 0, offloaded: true, headroomGb };
  }

  const achievableContext = maxContextForBudget(variant.sizeGb, ramForKvGb, variant.contextLength);
  if (achievableContext < MIN_USABLE_CONTEXT_TOKENS) {
    return { fit: "red", achievableContext, offloaded: true, headroomGb };
  }

  const offloadRatio = ramNeededForOffloadGb / variant.sizeGb;
  const fit: FitLevel = offloadRatio <= RAM_OFFLOAD_MAX_RATIO ? "yellow" : "red";
  return { fit, achievableContext, offloaded: true, headroomGb };
}

/** Convenience wrapper for call sites that only need the badge, not the full detail. */
export function classifyFit(spec: RigSpec, variant: ModelVariant): FitLevel {
  return evaluateFit(spec, variant).fit;
}

const FIT_RANK: Record<FitLevel, number> = { green: 0, yellow: 1, red: 2 };

/**
 * Ranks the catalog against a rig: fit quality first, trending as a tie-breaker within an
 * equal fit level, then VRAM requirement ascending. Red fits are excluded from the list but
 * never crash the solve — a rig too small for anything just yields an empty array.
 */
export function recommend(
  spec: RigSpec,
  catalog: ModelVariant[],
  trendingIds: ReadonlySet<string> = new Set(),
): Recommendation[] {
  return catalog
    .map((variant) => ({ variant, ...evaluateFit(spec, variant), trending: trendingIds.has(variant.modelId) }))
    .filter((rec) => rec.fit !== "red")
    .sort((a, b) => {
      if (FIT_RANK[a.fit] !== FIT_RANK[b.fit]) return FIT_RANK[a.fit] - FIT_RANK[b.fit];
      if (a.trending !== b.trending) return a.trending ? -1 : 1;
      return a.variant.minVramGb - b.variant.minVramGb;
    });
}
