// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/main";
import { validateRigInput } from "../src/ui/validate";

vi.mock("../src/ui/validate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/ui/validate")>();
  return { ...actual, validateRigInput: vi.fn(actual.validateRigInput) };
});

function submit(): void {
  const form = document.querySelector<HTMLFormElement>("#rig-form")!;
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

describe("mountApp on a host page missing #app", () => {
  it("is a no-op instead of throwing", () => {
    document.body.innerHTML = "<div>no app mount point here</div>";
    expect(() => mountApp()).not.toThrow();
    expect(document.querySelector(".results-empty")).toBeNull();
  });
});

describe("app", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mountApp();
  });

  it("shows a designed empty state before any submission", () => {
    expect(document.querySelector(".results-empty")).not.toBeNull();
    expect(document.querySelectorAll(".result-card").length).toBe(0);
  });

  it("marks the results region as a live region so updates are announced", () => {
    expect(document.querySelector("#results")?.getAttribute("aria-live")).toBe("polite");
  });

  it("gives the input and results sections accessible landmark labels", () => {
    expect(document.querySelector('section[aria-label="Rig input"]')).not.toBeNull();
    expect(document.querySelector('section[aria-label="Recommendations"]')).not.toBeNull();
  });

  it("marks the validation error as an alert region for assistive tech", () => {
    expect(document.querySelector("#form-error")?.getAttribute("role")).toBe("alert");
  });

  it("renders at least 3 ranked result cards without a page reload after a valid submission", () => {
    (document.querySelector("#vram") as HTMLInputElement).value = "12";
    (document.querySelector("#ram") as HTMLInputElement).value = "32";
    submit();

    const cards = document.querySelectorAll(".result-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("every result card shows a model name, quant, and a fit badge", () => {
    (document.querySelector("#vram") as HTMLInputElement).value = "12";
    (document.querySelector("#ram") as HTMLInputElement).value = "32";
    submit();

    document.querySelectorAll(".result-card").forEach((card) => {
      expect(card.querySelector(".result-card__name")?.textContent).toBeTruthy();
      expect(card.querySelector(".result-card__quant")?.textContent).toBeTruthy();
      expect(card.querySelector('[class*="badge--"]')).not.toBeNull();
    });
  });

  it("shows an inline validation message and does not touch the solver when VRAM is missing", () => {
    (document.querySelector("#vram") as HTMLInputElement).value = "";
    (document.querySelector("#ram") as HTMLInputElement).value = "32";
    submit();

    const error = document.querySelector<HTMLParagraphElement>("#form-error")!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/VRAM/);
    expect(document.querySelectorAll(".result-card").length).toBe(0);
  });

  it("selecting a GPU preset auto-fills a usable VRAM value", () => {
    const gpuSelect = document.querySelector<HTMLSelectElement>("#gpu-preset")!;
    const vramInput = document.querySelector<HTMLInputElement>("#vram")!;

    gpuSelect.value = "rtx-4070-ti";
    gpuSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(Number(vramInput.value)).toBeGreaterThan(0);
    expect(Number(vramInput.value)).toBeLessThan(12);
  });

  it("does not leak the placeholder option text as gpuModel when no preset is selected", () => {
    const vramInput = document.querySelector<HTMLInputElement>("#vram")!;
    const ramInput = document.querySelector<HTMLInputElement>("#ram")!;
    vramInput.value = "12";
    ramInput.value = "32";

    submit();

    const raw = vi.mocked(validateRigInput).mock.calls[0]![0];
    expect(raw.gpuModel).toBeUndefined();
  });

  it("shows the honest empty-results message for a rig too small for the catalog", () => {
    (document.querySelector("#vram") as HTMLInputElement).value = "1";
    (document.querySelector("#ram") as HTMLInputElement).value = "1";
    submit();

    expect(document.querySelectorAll(".result-card").length).toBe(0);
    expect(document.querySelector(".results-empty")?.textContent).toMatch(/nothing/i);
  });

  it("replaces the prior result set cleanly on a second submission with different values", () => {
    const vramInput = document.querySelector<HTMLInputElement>("#vram") as HTMLInputElement;
    const ramInput = document.querySelector<HTMLInputElement>("#ram") as HTMLInputElement;

    vramInput.value = "12";
    ramInput.value = "32";
    submit();
    const firstCount = document.querySelectorAll(".result-card").length;
    expect(firstCount).toBeGreaterThan(0);

    vramInput.value = "1";
    ramInput.value = "1";
    submit();

    expect(document.querySelectorAll(".result-card").length).toBe(0);
    expect(document.querySelector(".results-empty")).not.toBeNull();
  });

  it("recovers from an invalid submission and succeeds once the input is corrected", () => {
    const vramInput = document.querySelector<HTMLInputElement>("#vram") as HTMLInputElement;
    const ramInput = document.querySelector<HTMLInputElement>("#ram") as HTMLInputElement;

    vramInput.value = "-5";
    ramInput.value = "32";
    submit();
    expect(document.querySelector<HTMLParagraphElement>("#form-error")!.hidden).toBe(false);

    vramInput.value = "12";
    submit();

    expect(document.querySelector<HTMLParagraphElement>("#form-error")!.hidden).toBe(true);
    expect(document.querySelectorAll(".result-card").length).toBeGreaterThan(0);
  });

  it("does not crash when the GPU preset select holds a value with no matching preset", () => {
    const gpuSelect = document.querySelector<HTMLSelectElement>("#gpu-preset") as HTMLSelectElement;
    const vramInput = document.querySelector<HTMLInputElement>("#vram") as HTMLInputElement;

    const stray = document.createElement("option");
    stray.value = "stale-preset-id";
    stray.textContent = "Stale preset";
    gpuSelect.append(stray);
    gpuSelect.value = "stale-preset-id";

    expect(() => gpuSelect.dispatchEvent(new Event("change", { bubbles: true }))).not.toThrow();
    expect(vramInput.value).toBe("");
  });
});
