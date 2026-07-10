import { describe, expect, it } from "vitest";
import { classifyFit, recommend } from "../src/lib/solver";
import type { ModelVariant, RigSpec } from "../src/lib/types";

const rig: RigSpec = { vramGb: 12, ramGb: 32 };

const variant = (minVramGb: number): ModelVariant => ({
  modelId: "test/model",
  displayName: "Test Model",
  quant: "Q4_K_M",
  sizeGb: minVramGb,
  contextLength: 8192,
  minVramGb,
});

describe("classifyFit", () => {
  it("returns green when headroom is at least 2GB", () => {
    expect(classifyFit(rig, variant(8))).toBe("green");
  });

  it("returns yellow when the variant just barely fits", () => {
    expect(classifyFit(rig, variant(11))).toBe("yellow");
  });

  it("returns red when the variant exceeds available VRAM", () => {
    expect(classifyFit(rig, variant(24))).toBe("red");
  });
});

describe("recommend", () => {
  it("excludes red-fit variants and sorts by VRAM requirement", () => {
    const catalog = [variant(24), variant(6), variant(11)];
    const result = recommend(rig, catalog);
    expect(result.map((v) => v.minVramGb)).toEqual([6, 11]);
  });

  it("returns an empty array, not a throw, when nothing in the catalog fits", () => {
    const catalog = [variant(24), variant(48)];
    expect(recommend(rig, catalog)).toEqual([]);
  });
});
