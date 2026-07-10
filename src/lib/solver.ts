import type { FitLevel, ModelVariant, RigSpec } from "./types";

/**
 * Classifies how comfortably a variant fits a rig's VRAM budget.
 * Full solve (context-length tradeoffs, RAM offload, trending boost) lands in BUILD;
 * this is the scaffold's minimal working kernel.
 */
export function classifyFit(spec: RigSpec, variant: ModelVariant): FitLevel {
  const headroomGb = spec.vramGb - variant.minVramGb;
  if (headroomGb >= 2) return "green";
  if (headroomGb >= 0) return "yellow";
  return "red";
}

export function recommend(spec: RigSpec, catalog: ModelVariant[]): ModelVariant[] {
  return catalog
    .filter((variant) => classifyFit(spec, variant) !== "red")
    .sort((a, b) => a.minVramGb - b.minVramGb);
}
