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

export interface Recommendation {
  variant: ModelVariant;
  fit: FitLevel;
  trending: boolean;
}
