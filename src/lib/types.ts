export type MainDim =
  | "Target Persona"
  | "Pain Point"
  | "Messaging Angle"
  | "Core Insight"
  | "Product";

export interface Pools {
  PATTERNS: string[];
  FORMATS: string[];
  VISUAL_STYLES: string[];
  OPENINGS: string[];
  TONES: string[];
  TALENTS: string[];
  CTAS: string[];
  PROOFS?: string[];
  SPECS?: string[];
}

export type Field =
  | "Pattern"
  | "Format"
  | "VisualStyle"
  | "Opening"
  | "Tone"
  | "Talent"
  | "CTA"
  | "ProofDevice"
  | "Spec";

export type Op = "equals" | "oneOf" | "startsWith";

export type IfClause = {
  [K in Field]?: {
    op: Op;
    value: string | string[];
  };
};

export type ThenClause = {
  [K in Field]?: {
    op?: Op;
    value: string | string[];
  };
} & {
  oneOf?: string[];
  startsWith?: string;
  maxShare?: number;
};

export type QuotaScope = "global" | "perVertical";

export type Rule =
  | { type: "disallow"; if: IfClause; then: ThenClause }
  | { type: "allowOnly"; if: IfClause; then: ThenClause }
  | { type: "mustInclude"; if: IfClause; then: ThenClause }
  | { type: "prefer"; if: IfClause; then: ThenClause; weight: number }
  | { type: "penalize"; if: IfClause; then: ThenClause; weight: number }
  // Quota: enhanced but backward compatible
  // - legacy: { value, maxShare: 0..1 }
  // - new: { oneOf, minPct/maxPct (0..100), scope, tolerance (units), perVerticalMinDistinct }
  | {
      type: "quota";
      field: Field;
      value?: string;
      oneOf?: string[];
      maxShare?: number;     // legacy 0..1 fraction
      minPct?: number;       // 0..100
      maxPct?: number;       // 0..100
      scope?: QuotaScope;    // default: "global"
      tolerance?: number;    // ±units tolerated when rounding to integers (default 1)
      perVerticalMinDistinct?: number; // e.g., ≥2 distinct values of field per vertical
    };

export interface RulePack {
  name: string;
  scope: "global" | "brand";
  rules: Rule[];
}

export interface ImpactWeights {
  Pattern: number;
  Format: number;
  VisualStyle: number;
  Opening: number;
  Tone: number;
  Talent: number;
  CTA: number;
}

export interface Globals {
  defaultTargetCPA: number;
  minSpendFactor: number;
  readDays: number;
}

export interface PresetPaths {
  discover?: string;
  refine?: string;
  scale?: string;
}

export interface BrandConfig {
  brandId: string;
  mainDimension: MainDim;
  // weights by vertical value (Pareto sizing)
  verticalValues: Record<string, number>;
  pools: Pools;
  rules: RulePack | { rules: Rule[] }; // allow pack or plain rules container
  impacts: ImpactWeights;
  flags?: { disallowVOFirstSquare?: boolean };
  presets?: PresetPaths;
  globals: Globals;
}
