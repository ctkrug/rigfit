import { describe, expect, it } from "vitest";

/**
 * Design tokens from docs/DESIGN.md. Duplicated here (not imported) because they're CSS custom
 * properties, not TS values — this is the guard against a future palette edit silently dropping
 * below WCAG AA, which a visual review alone can miss on an unfamiliar monitor.
 */
const TOKENS = {
  bg: "#0a1929",
  surface1: "#0f2439",
  surface2: "#15304a",
  text: "#e8f1f8",
  textMuted: "#7fa8c9",
  accent: "#4fd1ff",
  accentSupport: "#ff8a4f",
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG 2.x contrast ratio, 1:1 (no contrast) to 21:1 (black on white). */
function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

const WCAG_AA_TEXT = 4.5;

describe("design token contrast (WCAG AA)", () => {
  it.each([
    ["text on bg", TOKENS.text, TOKENS.bg],
    ["text on surface-1", TOKENS.text, TOKENS.surface1],
    ["text on surface-2", TOKENS.text, TOKENS.surface2],
    ["text-muted on bg", TOKENS.textMuted, TOKENS.bg],
    ["text-muted on surface-1", TOKENS.textMuted, TOKENS.surface1],
    ["text-muted on surface-2", TOKENS.textMuted, TOKENS.surface2],
    ["accent on bg", TOKENS.accent, TOKENS.bg],
    ["accent on surface-1", TOKENS.accent, TOKENS.surface1],
    ["accent-support on bg", TOKENS.accentSupport, TOKENS.bg],
    ["accent-support on surface-1", TOKENS.accentSupport, TOKENS.surface1],
    ["success badge on surface-1", TOKENS.success, TOKENS.surface1],
    ["warning badge on surface-1", TOKENS.warning, TOKENS.surface1],
    ["danger badge on surface-1", TOKENS.danger, TOKENS.surface1],
  ])("%s meets 4.5:1", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});
