import { describe, expect, it } from "vitest";
import { isSameModel, matchTrending } from "../src/lib/trending";
import type { ModelVariant, TrendingSnapshot } from "../src/lib/types";

const variant = (modelId: string): ModelVariant => ({
  modelId,
  displayName: modelId,
  quant: "Q4_K_M",
  sizeGb: 5,
  contextLength: 8192,
  minVramGb: 6,
});

describe("isSameModel", () => {
  it("matches identical IDs case-insensitively", () => {
    expect(isSameModel("Qwen/Qwen2.5-7B-Instruct", "qwen/qwen2.5-7b-instruct")).toBe(true);
  });

  it("matches when one ID's name is a prefix of the other (suffix drift)", () => {
    expect(isSameModel("meta-llama/Llama-3.1-8B-Instruct", "meta-llama/Llama-3.1-8B")).toBe(true);
  });

  it("does not match unrelated models", () => {
    expect(isSameModel("mistralai/Mistral-7B-Instruct-v0.3", "Qwen/Qwen2.5-7B-Instruct")).toBe(false);
  });

  it("does not match on short, generic name components", () => {
    expect(isSameModel("org/a1", "other/a1")).toBe(false);
  });

  it("matches at exactly the 4-char floor but not just below it", () => {
    expect(isSameModel("org/abcd", "other/abcd")).toBe(true);
    expect(isSameModel("org/abc", "other/abc")).toBe(false);
  });

  it("handles an id with no org prefix (no slash) instead of throwing", () => {
    expect(() => isSameModel("llama-3.1-8b", "llama-3.1-8b")).not.toThrow();
    expect(isSameModel("llama-3.1-8b", "llama-3.1-8b")).toBe(true);
  });

  it("handles an empty string id instead of throwing", () => {
    expect(() => isSameModel("", "org/model")).not.toThrow();
    expect(isSameModel("", "org/model")).toBe(false);
  });
});

describe("matchTrending", () => {
  it("resolves a trending Hugging Face entry to its catalog variant", () => {
    const catalog = [variant("Qwen/Qwen2.5-7B-Instruct"), variant("mistralai/Mistral-7B-Instruct-v0.3")];
    const trending: TrendingSnapshot = {
      fetchedAt: "2026-07-10T00:00:00.000Z",
      entries: [
        { source: "huggingface", id: "Qwen/Qwen2.5-7B-Instruct", title: "Qwen2.5 7B", url: "", score: 100 },
      ],
    };
    expect(matchTrending(catalog, trending)).toEqual(new Set(["Qwen/Qwen2.5-7B-Instruct"]));
  });

  it("drops unmatched trending entries silently instead of surfacing an orphaned reference", () => {
    const catalog = [variant("Qwen/Qwen2.5-7B-Instruct")];
    const trending: TrendingSnapshot = {
      fetchedAt: "2026-07-10T00:00:00.000Z",
      entries: [{ source: "huggingface", id: "some-org/totally-unrelated-model", title: "x", url: "", score: 1 }],
    };
    expect(matchTrending(catalog, trending)).toEqual(new Set());
  });

  it("ignores Hacker News entries, which reference tools rather than model IDs", () => {
    const catalog = [variant("Qwen/Qwen2.5-7B-Instruct")];
    const trending: TrendingSnapshot = {
      fetchedAt: "2026-07-10T00:00:00.000Z",
      entries: [{ source: "hackernews", id: "12345", title: "Show HN: Qwen2.5-7B-Instruct runner", url: "", score: 50 }],
    };
    expect(matchTrending(catalog, trending)).toEqual(new Set());
  });

  it("returns an empty set, not a throw, for an empty trending snapshot", () => {
    const catalog = [variant("Qwen/Qwen2.5-7B-Instruct")];
    const trending: TrendingSnapshot = { fetchedAt: "2026-07-10T00:00:00.000Z", entries: [] };
    expect(matchTrending(catalog, trending)).toEqual(new Set());
  });

  it("returns an empty set, not a throw, for an empty catalog", () => {
    const trending: TrendingSnapshot = {
      fetchedAt: "2026-07-10T00:00:00.000Z",
      entries: [{ source: "huggingface", id: "Qwen/Qwen2.5-7B-Instruct", title: "x", url: "", score: 1 }],
    };
    expect(matchTrending([], trending)).toEqual(new Set());
  });
});
