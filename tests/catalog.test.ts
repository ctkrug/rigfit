import { describe, expect, it } from "vitest";
import catalog from "../data/models.json";
import type { ModelVariant, Quantization } from "../src/lib/types";

const VALID_QUANTS: Quantization[] = ["Q2_K", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0", "FP16"];

describe("model catalog", () => {
  const entries = catalog as ModelVariant[];

  it("has at least 20 entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
  });

  it("spans at least 8 distinct base models", () => {
    const baseModels = new Set(entries.map((entry) => entry.modelId));
    expect(baseModels.size).toBeGreaterThanOrEqual(8);
  });

  it("has no duplicate modelId + quant pairs", () => {
    const keys = entries.map((e) => `${e.modelId}::${e.quant}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("spans small, medium, and large VRAM tiers", () => {
    const small = entries.some((e) => e.minVramGb <= 8);
    const medium = entries.some((e) => e.minVramGb > 8 && e.minVramGb <= 24);
    const large = entries.some((e) => e.minVramGb > 24);
    expect({ small, medium, large }).toEqual({ small: true, medium: true, large: true });
  });

  it.each(catalog as ModelVariant[])("$displayName ($quant) has a plausible, well-typed schema", (entry) => {
    expect(entry.modelId).toMatch(/^[\w.-]+\/[\w.-]+$/);
    expect(entry.displayName.length).toBeGreaterThan(0);
    expect(VALID_QUANTS).toContain(entry.quant);
    expect(entry.sizeGb).toBeGreaterThan(0);
    expect(entry.contextLength).toBeGreaterThanOrEqual(2048);
    expect(entry.minVramGb).toBeGreaterThanOrEqual(entry.sizeGb);
  });
});
