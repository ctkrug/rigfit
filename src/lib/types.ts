/** The hardware budget a user is planning around. */
export interface RigSpec {
  vramGb: number;
  ramGb: number;
  gpuModel?: string;
}

export type Quantization = "Q2_K" | "Q4_K_M" | "Q5_K_M" | "Q6_K" | "Q8_0" | "FP16";

/** One quantized build of a model, as it appears in the catalog. */
export interface ModelVariant {
  modelId: string;
  displayName: string;
  quant: Quantization;
  sizeGb: number;
  contextLength: number;
  minVramGb: number;
}

export type FitLevel = "green" | "yellow" | "red";

/** The outcome of evaluating one variant against a rig, before ranking. */
export interface FitResult {
  fit: FitLevel;
  /** Context length (tokens) actually achievable within the available budget. */
  achievableContext: number;
  /** Whether reaching this fit required offloading layers to system RAM. */
  offloaded: boolean;
  /** VRAM (or, when offloaded, RAM) headroom in GB at the achievable context. Can be negative. */
  headroomGb: number;
}

export interface Recommendation extends FitResult {
  variant: ModelVariant;
  trending: boolean;
}
