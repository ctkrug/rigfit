import { describe, expect, it } from "vitest";
import { classifyFit, evaluateFit, recommend } from "../src/lib/solver";
import type { ModelVariant, RigSpec } from "../src/lib/types";

const rig: RigSpec = { vramGb: 12, ramGb: 32 };

const variant = (overrides: Partial<ModelVariant> = {}): ModelVariant => ({
  modelId: "test/model",
  displayName: "Test Model",
  quant: "Q4_K_M",
  sizeGb: 5,
  contextLength: 8192,
  minVramGb: 6,
  ...overrides,
});

describe("classifyFit", () => {
  it("returns green when weights fit with plenty of headroom for full context", () => {
    expect(classifyFit(rig, variant({ minVramGb: 8, sizeGb: 6 }))).toBe("green");
  });

  it("returns yellow when weights just barely fit at full context", () => {
    expect(classifyFit(rig, variant({ minVramGb: 11, sizeGb: 2, contextLength: 2048 }))).toBe("yellow");
  });

  it("returns red when weights alone exceed VRAM and RAM can't offload the rest", () => {
    expect(classifyFit({ vramGb: 12, ramGb: 4 }, variant({ minVramGb: 48, sizeGb: 42 }))).toBe("red");
  });
});

describe("evaluateFit — VRAM-only context truncation", () => {
  it("fits weights but only at a truncated context, not the model's full max", () => {
    const result = evaluateFit(rig, variant({ minVramGb: 10, sizeGb: 10, contextLength: 131072 }));
    expect(result.fit).toBe("yellow");
    expect(result.offloaded).toBe(false);
    expect(result.achievableContext).toBeLessThan(131072);
    expect(result.achievableContext).toBeGreaterThanOrEqual(2048);
  });

  it("marks green only when the full published context also fits comfortably", () => {
    const result = evaluateFit(rig, variant({ minVramGb: 6, sizeGb: 5, contextLength: 4096 }));
    expect(result.fit).toBe("green");
    expect(result.achievableContext).toBe(4096);
  });

  it("is green at exactly the 2GB headroom floor, yellow just below it", () => {
    const atFloor = evaluateFit(rig, variant({ minVramGb: 8, sizeGb: 8, contextLength: 12500 }));
    expect(atFloor.headroomGb).toBe(2);
    expect(atFloor.fit).toBe("green");

    const justBelow = evaluateFit(rig, variant({ minVramGb: 8, sizeGb: 8, contextLength: 12600 }));
    expect(justBelow.headroomGb).toBeLessThan(2);
    expect(justBelow.fit).toBe("yellow");
  });

  it("is red with zero achievable context when weights consume all available VRAM exactly", () => {
    const result = evaluateFit(rig, variant({ minVramGb: rig.vramGb, sizeGb: 10 }));
    expect(result.fit).toBe("red");
    expect(result.achievableContext).toBe(0);
    expect(result.offloaded).toBe(false);
  });

  it("falls to red when even a minimal context can't fit in remaining VRAM", () => {
    const result = evaluateFit(rig, variant({ minVramGb: 11.9, sizeGb: 40, contextLength: 32768 }));
    expect(result.fit).toBe("red");
    expect(result.offloaded).toBe(false);
  });
});

describe("evaluateFit — RAM offload", () => {
  it("includes a model that doesn't fit VRAM alone but fits with a modest RAM offload", () => {
    const big = variant({ minVramGb: 14, sizeGb: 14, contextLength: 8192 });
    const result = evaluateFit({ vramGb: 12, ramGb: 64 }, big);
    expect(result.offloaded).toBe(true);
    expect(result.fit).toBe("yellow");
  });

  it("marks red when the offloaded fraction of the model is too large to be usable", () => {
    const huge = variant({ minVramGb: 48, sizeGb: 48, contextLength: 8192 });
    const result = evaluateFit({ vramGb: 12, ramGb: 64 }, huge);
    expect(result.offloaded).toBe(true);
    expect(result.fit).toBe("red");
  });

  it("is red, not a throw, when RAM can't even hold the offloaded portion", () => {
    const tooBig = variant({ minVramGb: 48, sizeGb: 42, contextLength: 32768 });
    const result = evaluateFit({ vramGb: 12, ramGb: 4 }, tooBig);
    expect(result.fit).toBe("red");
    expect(result.offloaded).toBe(true);
  });

  it("is yellow, not red, when the offloaded fraction sits exactly at the max ratio", () => {
    const atBoundary = variant({ minVramGb: 50, sizeGb: 50, contextLength: 8192 });
    const result = evaluateFit({ vramGb: 30, ramGb: 64 }, atBoundary);
    expect(result.fit).toBe("yellow");
    expect(result.offloaded).toBe(true);
  });

  it("is red when RAM holds the offloaded weights but leaves too little for a minimal KV cache", () => {
    const huge = variant({ minVramGb: 48, sizeGb: 48, contextLength: 32768 });
    const result = evaluateFit({ vramGb: 12, ramGb: 41 }, huge);
    expect(result.fit).toBe("red");
    expect(result.offloaded).toBe(true);
    expect(result.achievableContext).toBeLessThan(2048);
  });
});

describe("recommend", () => {
  it("excludes red-fit variants and sorts by fit quality then VRAM requirement", () => {
    const catalog = [
      variant({ modelId: "a", minVramGb: 48, sizeGb: 42 }),
      variant({ modelId: "b", minVramGb: 6, sizeGb: 5 }),
      variant({ modelId: "c", minVramGb: 11, sizeGb: 2, contextLength: 2048 }),
    ];
    const result = recommend(rig, catalog);
    expect(result.map((r) => r.variant.modelId)).toEqual(["b", "c"]);
  });

  it("returns an empty array, not a throw, when nothing in the catalog fits even with offload", () => {
    const catalog = [
      variant({ modelId: "a", minVramGb: 48, sizeGb: 42 }),
      variant({ modelId: "b", minVramGb: 96, sizeGb: 90 }),
    ];
    expect(recommend({ vramGb: 12, ramGb: 4 }, catalog)).toEqual([]);
  });

  it("breaks ties between equal fits in favor of the trending variant", () => {
    const catalog = [
      variant({ modelId: "a", minVramGb: 6, sizeGb: 5 }),
      variant({ modelId: "b", minVramGb: 6, sizeGb: 5 }),
    ];
    const result = recommend(rig, catalog, new Set(["b"]));
    expect(result.map((r) => r.variant.modelId)).toEqual(["b", "a"]);
  });

  it("keeps a trending variant first regardless of its position in the input catalog", () => {
    const catalog = [
      variant({ modelId: "non-trending", minVramGb: 6, sizeGb: 5 }),
      variant({ modelId: "trending", minVramGb: 6, sizeGb: 5 }),
      variant({ modelId: "also-non-trending", minVramGb: 6, sizeGb: 5 }),
    ];
    const result = recommend(rig, catalog, new Set(["trending"]));
    expect(result[0]?.variant.modelId).toBe("trending");
  });

  it("still ranks a strictly better non-trending fit above a worse trending fit", () => {
    const catalog = [
      variant({ modelId: "trending-but-tight", minVramGb: 11, sizeGb: 2, contextLength: 2048 }),
      variant({ modelId: "better-fit", minVramGb: 6, sizeGb: 5 }),
    ];
    const result = recommend(rig, catalog, new Set(["trending-but-tight"]));
    expect(result.map((r) => r.variant.modelId)).toEqual(["better-fit", "trending-but-tight"]);
  });
});
