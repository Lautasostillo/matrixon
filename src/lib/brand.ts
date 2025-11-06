import { setCompatRules, setImpactWeights, setPipelineFlags } from "./logic";
import {
  PATTERNS,
  FORMATS,
  VISUAL_STYLES,
  OPENINGS,
  TONES,
  TALENTS,
  CTAS,
  PROOFS,
  SPECS,
  DEFAULT_VERTICAL_VALUES,
} from "./config";

export type PoolItem = { id: string; name: string; cluster?: string };
export type BrandPools = {
  PATTERNS?: PoolItem[];
  FORMATS?: PoolItem[];
  VISUAL_STYLES?: PoolItem[];
  OPENINGS?: PoolItem[];
  TONES?: PoolItem[];
  TALENTS?: PoolItem[];
  CTAS?: PoolItem[];
  PROOFS?: PoolItem[];
  SPECS?: PoolItem[];
};

export type BrandRules = {
  disallow: any[];
  allowOnly: any[];
};

export type BrandImpactWeights = Partial<{
  Pattern: number;
  Format: number;
  VisualStyle: number;
  Opening: number;
  Tone: number;
  Talent: number;
  CTA: number;
}>;

export type BrandPipelineFlags = Partial<{
  enforceVOFirstSquareDisallow: boolean;
}>;

export type BrandConfig = {
  brandId: string;
  globals?: {
    defaultTargetCPA?: number;
    defaultMinSpendFactor?: number;
    defaultReadDays?: number;
  };
  mainDimension?: string;
  verticalValues?: Record<string, string[]>;
  pools?: BrandPools;
  rules?: BrandRules;
  impactWeights?: BrandImpactWeights;
  pipelineFlags?: BrandPipelineFlags;
  presets?: Record<string, string>;
};

// Merge helper that keeps defaults for missing fields
function mergePools(p: BrandPools | undefined) {
  return {
    PATTERNS: p?.PATTERNS ?? PATTERNS,
    FORMATS: p?.FORMATS ?? FORMATS,
    VISUAL_STYLES: p?.VISUAL_STYLES ?? VISUAL_STYLES,
    OPENINGS: p?.OPENINGS ?? OPENINGS,
    TONES: p?.TONES ?? TONES,
    TALENTS: p?.TALENTS ?? TALENTS,
    CTAS: p?.CTAS ?? CTAS,
    PROOFS: p?.PROOFS ?? PROOFS,
    SPECS: p?.SPECS ?? SPECS,
  };
}

export function applyBrandConfig(cfg: BrandConfig) {
  // Apply runtime rules/weights/flags to the engine
  if (cfg.rules) setCompatRules(cfg.rules);
  if (cfg.impactWeights) setImpactWeights(cfg.impactWeights as any);
  if (cfg.pipelineFlags) setPipelineFlags(cfg.pipelineFlags as any);

  // Pools and verticals mapping for UI
  const activePools = mergePools(cfg.pools);
  const activeVerticalValues = cfg.verticalValues ?? DEFAULT_VERTICAL_VALUES;

  // Provide some suggested defaults for globals if present
  const globals = {
    defaultTargetCPA: cfg.globals?.defaultTargetCPA,
    defaultMinSpendFactor: cfg.globals?.defaultMinSpendFactor,
    defaultReadDays: cfg.globals?.defaultReadDays,
  };

  const mainDimension = cfg.mainDimension;

  return { activePools, activeVerticalValues, globals, mainDimension };
}

export type AppliedBrand = ReturnType<typeof applyBrandConfig>;
