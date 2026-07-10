import { describe, expect, it } from "vitest";
import { GPU_PRESETS, usableVramGb } from "../src/ui/gpu-presets";

describe("GPU_PRESETS", () => {
  it("has at least one preset", () => {
    expect(GPU_PRESETS.length).toBeGreaterThan(0);
  });

  it("gives every preset a unique id", () => {
    const ids = new Set(GPU_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(GPU_PRESETS.length);
  });

  it("reserves a plausible, positive slice of VRAM for every real preset", () => {
    for (const preset of GPU_PRESETS) {
      expect(preset.reservedGb).toBeGreaterThan(0);
      expect(usableVramGb(preset)).toBeGreaterThan(0);
      expect(usableVramGb(preset)).toBeLessThan(preset.vramGb);
    }
  });
});

describe("usableVramGb", () => {
  it("subtracts the OS/driver reservation from rated VRAM", () => {
    expect(usableVramGb({ id: "x", label: "x", vramGb: 12, reservedGb: 0.75 })).toBe(11.25);
  });

  it("never returns a negative value", () => {
    expect(usableVramGb({ id: "x", label: "x", vramGb: 1, reservedGb: 2 })).toBe(0);
  });
});
