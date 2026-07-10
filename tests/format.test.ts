import { describe, expect, it } from "vitest";
import { fitBadgeCopy, formatContext, formatContextDetail, formatHeadroom } from "../src/ui/format";
import type { ModelVariant, Recommendation } from "../src/lib/types";

const variant: ModelVariant = {
  modelId: "test/model",
  displayName: "Test Model",
  quant: "Q4_K_M",
  sizeGb: 5,
  contextLength: 32768,
  minVramGb: 6,
};

const rec = (overrides: Partial<Recommendation> = {}): Recommendation => ({
  variant,
  fit: "green",
  achievableContext: 32768,
  offloaded: false,
  headroomGb: 2.5,
  trending: false,
  ...overrides,
});

describe("formatContext", () => {
  it("formats thousands with a K suffix", () => {
    expect(formatContext(32768)).toBe("32.8K tokens");
    expect(formatContext(4096)).toBe("4.1K tokens");
    expect(formatContext(8000)).toBe("8K tokens");
  });

  it("formats sub-1000 values plainly", () => {
    expect(formatContext(500)).toBe("500 tokens");
  });

  it("formats exactly 1000 as a whole thousand, and 0 as plain tokens", () => {
    expect(formatContext(1000)).toBe("1K tokens");
    expect(formatContext(0)).toBe("0 tokens");
  });
});

describe("formatHeadroom", () => {
  it("explains VRAM headroom in human-readable form", () => {
    const result = formatHeadroom(rec({ headroomGb: 2.5 }), { vramGb: 12, ramGb: 32 });
    expect(result).toBe("12GB VRAM − 9.5GB required = 2.5GB headroom");
  });

  it("explains a shortfall when headroom is negative", () => {
    const result = formatHeadroom(rec({ headroomGb: -1.2 }), { vramGb: 12, ramGb: 32 });
    expect(result).toContain("short");
  });

  it("labels exactly-zero headroom as headroom, not a shortfall", () => {
    const result = formatHeadroom(rec({ headroomGb: 0 }), { vramGb: 12, ramGb: 32 });
    expect(result).toContain("headroom");
    expect(result).not.toContain("short");
  });

  it("reports against RAM, not VRAM, when the fit required offload", () => {
    const result = formatHeadroom(rec({ offloaded: true, headroomGb: 10 }), { vramGb: 12, ramGb: 32 });
    expect(result).toContain("RAM");
    expect(result).not.toContain("VRAM");
  });
});

describe("formatContextDetail", () => {
  it("reports full context when achievable meets the model max", () => {
    expect(formatContextDetail(rec({ achievableContext: 32768 }))).toBe("Full 32.8K tokens context");
  });

  it("reports truncated context against the model's max", () => {
    expect(formatContextDetail(rec({ achievableContext: 4096 }))).toBe("4.1K tokens of 32.8K tokens max context");
  });
});

describe("fitBadgeCopy", () => {
  it("gives every fit level a label and a non-color-dependent aria label", () => {
    for (const fit of ["green", "yellow", "red"] as const) {
      const copy = fitBadgeCopy(fit);
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.ariaLabel.length).toBeGreaterThan(copy.label.length);
    }
  });
});
