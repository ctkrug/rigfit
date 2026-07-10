// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderEmptyState, renderResultCard, renderResultsList } from "../src/ui/render";
import type { ModelVariant, Recommendation, RigSpec } from "../src/lib/types";

const spec: RigSpec = { vramGb: 12, ramGb: 32 };

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

describe("renderResultCard", () => {
  it("shows the model name, quant, and fit badge collapsed by default", () => {
    const card = renderResultCard(rec(), spec);
    expect(card.querySelector(".result-card__name")?.textContent).toBe("Test Model");
    expect(card.querySelector(".result-card__quant")?.textContent).toBe("Q4_K_M");
    expect(card.querySelector(".badge--green")).not.toBeNull();
    const header = card.querySelector("button.result-card__header") as HTMLButtonElement;
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect((card.querySelector(".result-card__detail") as HTMLElement).hidden).toBe(true);
  });

  it("shows a trending badge with an aria-label only when trending", () => {
    const trendingCard = renderResultCard(rec({ trending: true }), spec);
    const badge = trendingCard.querySelector(".badge--trending");
    expect(badge?.getAttribute("aria-label")).toBe("Trending this week");
    expect(renderResultCard(rec({ trending: false }), spec).querySelector(".badge--trending")).toBeNull();
  });

  it("toggles aria-expanded and reveals the detail panel on click", () => {
    const card = renderResultCard(rec(), spec);
    const header = card.querySelector("button.result-card__header") as HTMLButtonElement;
    const detail = card.querySelector(".result-card__detail") as HTMLElement;

    header.click();
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(detail.hidden).toBe(false);

    header.click();
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(detail.hidden).toBe(true);
  });

  it("links the header to the detail panel via aria-controls", () => {
    const card = renderResultCard(rec(), spec);
    const header = card.querySelector("button.result-card__header") as HTMLButtonElement;
    const detail = card.querySelector(".result-card__detail") as HTMLElement;
    expect(header.getAttribute("aria-controls")).toBe(detail.id);
  });

  it("notes RAM offload only when the fit required it", () => {
    const offloaded = renderResultCard(rec({ offloaded: true }), spec);
    expect(offloaded.querySelector(".result-card__offload-note")).not.toBeNull();
    const notOffloaded = renderResultCard(rec({ offloaded: false }), spec);
    expect(notOffloaded.querySelector(".result-card__offload-note")).toBeNull();
  });
});

describe("renderResultsList", () => {
  it("renders one card per recommendation", () => {
    const container = document.createElement("div");
    renderResultsList(container, [rec(), rec({ variant: { ...variant, modelId: "test/model-2" } })], spec);
    expect(container.querySelectorAll(".result-card").length).toBe(2);
  });

  it("renders a designed empty state, not a blank container, when nothing fits", () => {
    const container = document.createElement("div");
    renderResultsList(container, [], spec);
    expect(container.querySelector(".results-empty")?.textContent).toMatch(/nothing/i);
    expect(container.querySelectorAll(".result-card").length).toBe(0);
  });

  it("clears prior results before rendering a new list", () => {
    const container = document.createElement("div");
    renderResultsList(container, [rec()], spec);
    renderResultsList(container, [], spec);
    expect(container.querySelectorAll(".result-card").length).toBe(0);
    expect(container.querySelector(".results-empty")).not.toBeNull();
  });
});

describe("renderEmptyState", () => {
  it("renders the given message", () => {
    const el = renderEmptyState("try again");
    expect(el.textContent).toBe("try again");
  });
});
