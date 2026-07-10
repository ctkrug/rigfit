import type { RigSpec } from "../lib/types";

export interface RigInputRaw {
  vramGb: string;
  ramGb: string;
  gpuModel?: string;
}

export type RigValidationResult = { ok: true; spec: RigSpec } | { ok: false; error: string };

const MAX_PLAUSIBLE_GB = 512;

function parsePositiveNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Validates raw form input into a RigSpec. Returns a designed error state (never throws) so
 * the UI can render an inline message instead of silently failing or calling the solver with
 * garbage input.
 */
export function validateRigInput(raw: RigInputRaw): RigValidationResult {
  const vramGb = parsePositiveNumber(raw.vramGb);
  if (vramGb === null) {
    return { ok: false, error: "Enter your GPU's VRAM in GB (a positive number)." };
  }
  if (vramGb > MAX_PLAUSIBLE_GB) {
    return { ok: false, error: `VRAM over ${MAX_PLAUSIBLE_GB}GB isn't a plausible consumer/workstation GPU — check the value.` };
  }

  const ramGb = parsePositiveNumber(raw.ramGb);
  if (ramGb === null) {
    return { ok: false, error: "Enter your system RAM in GB (a positive number)." };
  }
  if (ramGb > MAX_PLAUSIBLE_GB) {
    return { ok: false, error: `RAM over ${MAX_PLAUSIBLE_GB}GB isn't a plausible value — check it.` };
  }

  const gpuModel = raw.gpuModel?.trim();
  return { ok: true, spec: { vramGb, ramGb, ...(gpuModel ? { gpuModel } : {}) } };
}
