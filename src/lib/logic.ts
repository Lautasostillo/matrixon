import { IMPACT_WEIGHTS, COMPAT_RULES, FORMATS, DIVERSITY_TARGET_DEFAULT, SIMILARITY_KEY, PIPELINE_FLAGS } from "./config";
import type { Rule } from "./types";
import { filterAndRank, violatesDisallow, violatesAllowOnly, violatesMustInclude, traceHits } from "./ruleEngine";

// Runtime overrides (brand-level)
let RUNTIME_COMPAT_RULES: any = COMPAT_RULES as any;
let RUNTIME_IMPACT_WEIGHTS: any = IMPACT_WEIGHTS as any;
let RUNTIME_PIPELINE_FLAGS: any = PIPELINE_FLAGS as any;
// Unified rules (global + brand) with extended types
let RUNTIME_RULES: Rule[] = [];

export function setCompatRules(rules: any) {
  RUNTIME_COMPAT_RULES = rules || COMPAT_RULES;
}
export function setImpactWeights(weights: Partial<typeof IMPACT_WEIGHTS>) {
  RUNTIME_IMPACT_WEIGHTS = { ...IMPACT_WEIGHTS, ...(weights || {}) };
}
export function setPipelineFlags(flags: Partial<typeof PIPELINE_FLAGS>) {
  RUNTIME_PIPELINE_FLAGS = { ...PIPELINE_FLAGS, ...(flags || {}) };
}
export function setRulesPack(rules: Rule[]) {
  RUNTIME_RULES = Array.isArray(rules) ? rules : [];
}

export type Row = {
  MainDimension: string;
  VerticalValue: string;
  Pattern: string | null;
  Format: string | null;
  VisualStyle: string | null;
  Opening: string | null;
  Tone: string | null;
  Talent: string | null;
  CTA: string | null;
  ProofDevice: string | null;
  Spec: string | null;
  Cluster: string | null;
  Rail?: "Learn" | "Scale";
};

export function pickN<T>(arr: T[], n: number, rng?: () => number): T[] {
  const a = [...arr];
  const out: T[] = [];
  const random = rng ?? Math.random;
  while (a.length && out.length < n) {
    out.push(a.splice(Math.floor(random() * a.length), 1)[0]);
  }
  return out;
}
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function makeRng(seed: number) {
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function getId(val: any): string | null {
  if (val && typeof val === "object" && "id" in val) return (val as any).id ?? null;
  return null;
}

export function sliderToCount(level: number, max: number) {
  if (level <= 0) return 0;
  if (level === 1) return clamp(2, 1, max);
  if (level === 2) return clamp(3, 1, max);
  return clamp(5, 1, max);
}
export function evenSplitCounts(total: number, n: number) {
  const base = Math.floor(total / n),
    rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
export function paretoSplitCounts(total: number, ws: number[]) {
  const sum = ws.reduce((a, b) => a + b, 0) || 1;
  let counts = ws.map((w) => Math.round((w / sum) * total));
  let diff = total - counts.reduce((a, b) => a + b, 0),
    i = 0;
  while (diff !== 0) {
    counts[i % counts.length] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    i++;
  }
  return counts;
}
export function stageWeightedCounts(total: number, verticalValues: string[], weightsMap: Record<string, number>) {
  const ws = verticalValues.map((v) => weightsMap[v] ?? 1);
  return paretoSplitCounts(total, ws);
}

export function isComboAllowed(row: Row): boolean {
  // Pipeline-dependent rule: VOFirst with 1:1 can be disallowed if pipeline can't support it
  if (RUNTIME_PIPELINE_FLAGS?.enforceVOFirstSquareDisallow) {
    if (row.Spec === "1:1" && row.Opening === "VOFirst") return false;
  }
  // Legacy compat rules (backward compatibility)
  if (RUNTIME_COMPAT_RULES) {
    for (const rule of (RUNTIME_COMPAT_RULES as any).disallow) {
      const w = rule.when as any;
      const dis = rule.thenNot as any;
      const whenOK =
        (w.Opening ? row.Opening === w.Opening : true) &&
        (w.Pattern ? row.Pattern === w.Pattern : true) &&
        (w.ProofDevice ? row.ProofDevice === w.ProofDevice : true) &&
        (w.Spec ? row.Spec === w.Spec : true);
      if (whenOK) {
        if (dis.Format && dis.Format.includes(row.Format)) return false;
        if (dis.VisualStyle && dis.VisualStyle.includes(row.VisualStyle)) return false;
        if (dis.ProofDevice && dis.ProofDevice.includes(row.ProofDevice)) return false;
        if (dis.Spec && dis.Spec.includes(row.Spec)) return false;
      }
    }
    for (const rule of (RUNTIME_COMPAT_RULES as any).allowOnly) {
      const w = rule.when as any;
      const only = rule.thenOnly as any;
      const whenOK =
        (w.Pattern ? row.Pattern === w.Pattern : true) &&
        (w.Opening ? row.Opening === w.Opening : true) &&
        (w.ProofDevice ? row.ProofDevice === w.ProofDevice : true) &&
        (w.Spec ? row.Spec === w.Spec : true);
      if (whenOK) {
        if (only.Format && !only.Format.includes(row.Format)) return false;
        if (only.ProofDevice && !only.ProofDevice.includes(row.ProofDevice)) return false;
        if (only.Spec && !only.Spec.includes(row.Spec)) return false;
      }
    }
  }
  // New rule engine enforcement for hard constraints
  if (RUNTIME_RULES?.length) {
    const hard = RUNTIME_RULES.filter(
      (r) => r.type === "disallow" || r.type === "allowOnly" || r.type === "mustInclude"
    );
    if (
      hard.some((r) => {
        if (r.type === "disallow") return violatesDisallow(row, r);
        if (r.type === "allowOnly") return violatesAllowOnly(row, r);
        if (r.type === "mustInclude") return violatesMustInclude(row, r);
        return false;
      })
    ) {
      return false;
    }
  }
  return true;
}

export function diversityDelta(a: Row | null, b: Row | null) {
  if (!a || !b) return 0;
  let d = 0;
  if (a.Pattern !== b.Pattern) d += RUNTIME_IMPACT_WEIGHTS.Pattern;
  if (a.Format !== b.Format) d += RUNTIME_IMPACT_WEIGHTS.Format;
  if (a.VisualStyle !== b.VisualStyle) d += RUNTIME_IMPACT_WEIGHTS.VisualStyle;
  if (a.Opening !== b.Opening) d += RUNTIME_IMPACT_WEIGHTS.Opening;
  if (a.Tone !== b.Tone) d += RUNTIME_IMPACT_WEIGHTS.Tone;
  if (a.Talent !== b.Talent) d += RUNTIME_IMPACT_WEIGHTS.Talent;
  if (a.CTA !== b.CTA) d += RUNTIME_IMPACT_WEIGHTS.CTA;
  return d;
}

export type Variety = {
  Pattern: number;
  Format: number;
  VisualStyle: number;
  Opening: number;
  Tone: number;
  Talent: number;
  CTA: number;
  ProofDevice?: number;
  Spec?: number;
};
export type Pools = {
  PATTERNS: any[];
  FORMATS: any[];
  VISUAL_STYLES: any[];
  OPENINGS: any[];
  TONES: any[];
  TALENTS: any[];
  CTAS: any[];
  PROOFS?: any[];
  SPECS?: any[];
};

export function generateCombos(params: {
  mainDim: string;
  verticalValues: string[];
  distribution: "pareto" | "even" | "stage";
  weights: number[]; // for pareto/even
  stageWeights?: Record<string, number>;
  adsTotal: number;
  variety: Variety;
  diversityTarget?: number;
  pools: Pools;
  seed?: number;
  rail?: "Learn" | "Scale";
}): Row[] {
  const { verticalValues, distribution, weights, stageWeights, adsTotal, variety, pools } = params;
  const Dtarget = params.diversityTarget ?? DIVERSITY_TARGET_DEFAULT;
  const rng = params.seed !== undefined ? makeRng(params.seed) : undefined;
  const random = rng ?? Math.random;

  // Decide counts per vertical
  let counts: number[] = [];
  if (distribution === "even") counts = evenSplitCounts(adsTotal, verticalValues.length);
  else if (distribution === "stage" && stageWeights) counts = stageWeightedCounts(adsTotal, verticalValues, stageWeights);
  else counts = paretoSplitCounts(adsTotal, weights);

  const {
    PATTERNS,
    FORMATS: FMT,
    VISUAL_STYLES: VIS,
    OPENINGS: OPN,
    TONES: TON,
    TALENTS: TAL,
    CTAS: CTA,
  } = pools;
  const PRF_POOL = (pools as any).PROOFS ?? [];
  const SPC_POOL = (pools as any).SPECS ?? [];

  const pat = pickN(PATTERNS, variety.Pattern, rng);
  const fmt = pickN(FMT, variety.Format, rng);
  const vis = pickN(VIS, variety.VisualStyle, rng);
  const opn = pickN(OPN, variety.Opening, rng);
  const ton = pickN(TON, variety.Tone, rng);
  const tal = pickN(TAL, variety.Talent, rng);
  const cta = pickN(CTA, variety.CTA, rng);
  const prf = pickN(PRF_POOL, variety.ProofDevice ?? 0, rng);
  const spc = pickN(SPC_POOL, variety.Spec ?? 0, rng);

  const out: Row[] = [];

  for (let vi = 0; vi < verticalValues.length; vi++) {
    const vVal = verticalValues[vi];
    const need = counts[vi] || 0;
    let tries = 0;
    const used = new Set<string>();
    let last: Row | null = null;

    // generate raw candidates up to a multiple of need to give room for ranking/quotas later
    const target = Math.max(need * 3, need);
    const bucket: Row[] = [];

    while (bucket.length < target && tries < Math.max(need * 500, 1500)) {
      tries++;
      const P = pat.length ? pat[Math.floor(random() * pat.length)] : null;
      const F = fmt.length ? fmt[Math.floor(random() * fmt.length)] : null;
      const V = vis.length ? vis[Math.floor(random() * vis.length)] : null;
      const O = opn.length ? opn[Math.floor(random() * opn.length)] : null;
      const T = ton.length ? ton[Math.floor(random() * ton.length)] : null;
      const L = tal.length ? tal[Math.floor(random() * tal.length)] : null;
      const C = cta.length ? cta[Math.floor(random() * cta.length)] : null;
      const R = prf.length ? prf[Math.floor(random() * prf.length)] : null;
      const S = spc.length ? spc[Math.floor(random() * spc.length)] : null;

      const row: Row = {
        MainDimension: params.mainDim,
        VerticalValue: vVal,
        Pattern: P?.id ?? null,
        Format: F?.id ?? null,
        VisualStyle: V?.id ?? null,
        Opening: O?.id ?? null,
        Tone: T?.id ?? null,
        Talent: L?.id ?? null,
        CTA: C?.id ?? null,
        ProofDevice: getId(R),
        Spec: getId(S),
        Cluster: F?.cluster ?? null,
        Rail: params.rail,
      };

      if (!isComboAllowed(row)) continue;

      const simKey = `${row.VerticalValue}|${row.Pattern}|${row.Format}|${row.VisualStyle}`;
      (row as any).__simKey = simKey;
      if (used.has(simKey)) continue;

      // Temporarily accept; diversity will be enforced after ranking within vertical
      used.add(simKey);
      bucket.push(row);
      last = row;
    }

    // Rank within vertical using soft rules; quotas apply across whole set later, but we apply locally too
    const ranked = RUNTIME_RULES?.length ? filterAndRank(bucket, RUNTIME_RULES) : bucket;

    // Enforce diversity within vertical after ranking
    const chosen: Row[] = [];
    let lastRow: Row | null = null;
    for (const r of ranked) {
      if (chosen.length >= need) break;
      const d = diversityDelta(lastRow, r);
      if (lastRow && d < Dtarget) continue;
      (r as any).__d = d;
      chosen.push(r);
      lastRow = r;
    }

    out.push(...chosen);
  }

  // Apply global quotas/soft-ranking across the whole set as a final pass (non-destructive if no quotas defined)
  const finalOut = RUNTIME_RULES?.length ? filterAndRank(out, RUNTIME_RULES) : out;

  // Attach lightweight policy trace per row (rules that matched), diversity delta reached and similarity key
  try {
    if (RUNTIME_RULES?.length) {
      finalOut.forEach((r) => {
        (r as any).__trace = {
          rulesHit: traceHits(r, RUNTIME_RULES),
          diversityDelta: (r as any).__d ?? 0,
          simKey: (r as any).__simKey ?? "",
          quota: (r as any).__quota,
          quotaNeed: (r as any).__quotaNeed,
        };
      });
    }
  } catch {
    // ignore trace errors
  }

  return finalOut;
}

/**
 * Budget helpers and guardrails
 */
export function computeMinSpendPerVariant(targetCPA: number, factor = 40) {
  return targetCPA * factor;
}

export function computeMaxVariants(totalBudget: number, minSpendPerVariant: number) {
  if (minSpendPerVariant <= 0) return 0;
  return Math.floor(totalBudget / minSpendPerVariant);
}

export function computeMaxConcurrent(dailyBudget: number, minSpendPerVariant: number, readDays: number) {
  if (dailyBudget <= 0 || minSpendPerVariant <= 0 || readDays <= 0) return 0;
  return Math.floor(dailyBudget / (minSpendPerVariant / readDays));
}

export function deriveCountsWithBudget(args: {
  totalBudget: number;
  targetCPA: number;
  minSpendFactor: number;
  readDays?: number;
  dailyBudget?: number;
  verticalValues: string[];
  distribution: "pareto" | "even" | "stage";
  weights: number[];
  stageWeights?: Record<string, number>;
}): {
  minSpendPerVariant: number;
  maxVariants: number;
  maxConcurrent?: number;
  adsTotal: number;
  counts: number[];
  usedVerticals: string[];
  droppedVerticals: string[];
  warnings: string[];
} {
  const {
    totalBudget,
    targetCPA,
    minSpendFactor,
    readDays,
    dailyBudget,
    verticalValues,
    distribution,
    weights,
    stageWeights,
  } = args;
  const warnings: string[] = [];
  const msv = computeMinSpendPerVariant(targetCPA, minSpendFactor);
  const maxVariants = computeMaxVariants(totalBudget, msv);
  const maxConcurrent =
    dailyBudget && readDays ? computeMaxConcurrent(dailyBudget, msv, readDays) : undefined;

  let adsTotal = maxVariants;

  // Guardrail: if budget cannot support ≥3 variants per vertical, warn early
  if (maxVariants < verticalValues.length * 3) {
    warnings.push("Insufficient budget for 3 variations per vertical.");
  }

  // initial counts
  let counts: number[] = [];
  if (distribution === "even") counts = evenSplitCounts(adsTotal, verticalValues.length);
  else if (distribution === "stage" && stageWeights) counts = stageWeightedCounts(adsTotal, verticalValues, stageWeights);
  else counts = paretoSplitCounts(adsTotal, weights);

  // Drop verticals with less than 3 variants
  let usedVerticals = verticalValues.slice();
  let droppedVerticals: string[] = [];
  const dropAndRecalc = () => {
    const keepMask = counts.map((c) => c >= 3);
    if (keepMask.every(Boolean)) return false;
    droppedVerticals = usedVerticals.filter((_, i) => !keepMask[i]).concat(droppedVerticals);
    usedVerticals = usedVerticals.filter((_, i) => keepMask[i]);
    if (usedVerticals.length === 0) {
      warnings.push("Insufficient budget for 3 variations per vertical.");
      counts = [];
      adsTotal = 0;
      return false;
    }
    // Recompute counts across remaining verticals
    if (distribution === "even") counts = evenSplitCounts(adsTotal, usedVerticals.length);
    else if (distribution === "stage" && stageWeights) {
      const filteredMap: Record<string, number> = {};
      for (const v of usedVerticals) filteredMap[v] = stageWeights[v] ?? 1;
      counts = stageWeightedCounts(adsTotal, usedVerticals, filteredMap);
    } else {
      const filteredWeights: number[] = [];
      for (const v of usedVerticals) {
        const idx = verticalValues.indexOf(v);
        filteredWeights.push(weights[idx] ?? 1);
      }
      counts = paretoSplitCounts(adsTotal, filteredWeights);
    }
    return true;
  };

  while (dropAndRecalc()) {
    // repeat until all remaining verticals have at least 3
  }

  if (droppedVerticals.length) {
    warnings.push("Some verticals were dropped due to < 3 variations under floor.");
  }

  return {
    minSpendPerVariant: msv,
    maxVariants,
    maxConcurrent,
    adsTotal,
    counts,
    usedVerticals,
    droppedVerticals,
    warnings,
  };
}

/**
 * Dual-rail split helper
 */
export function splitRails(adsTotal: number, learnRatio = 0.7) {
  const learn = Math.floor(adsTotal * learnRatio);
  const scale = Math.max(0, adsTotal - learn);
  return { learn, scale };
}

/**
 * CSV export
 */
function csvEscape(val: any) {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(
  rows: Row[],
  opts?: {
    rail?: "Learn" | "Scale";
    budgetPerVariant?: number;
    minSpend?: number;
    hypotheses?: Record<string, string>; // by VerticalValue
    notes?: Record<number, string>; // by row index
  }
): string {
  const headers = [
    "Rail",
    "MainDimension",
    "VerticalValue",
    "Hypothesis",
    "Pattern",
    "Format",
    "VisualStyle",
    "Opening",
    "Tone",
    "Talent",
    "ProofDevice",
    "CTA",
    "Spec",
    "Cluster",
    "BudgetPerVariant",
    "MinSpend",
    "Notes",
    "RulesHit",
    "DiversityDelta",
  ];
  const lines = [headers.join(",")];
  rows.forEach((r, i) => {
    const rail = r.Rail ?? opts?.rail ?? "";
    const hyp = opts?.hypotheses?.[r.VerticalValue] ?? "";
    const bpv = opts?.budgetPerVariant ?? "";
    const ms = opts?.minSpend ?? "";
    const notes = opts?.notes?.[i] ?? "";
    const trace = (r as any).__trace || {};
    const rulesHit = Array.isArray(trace.rulesHit)
      ? trace.rulesHit
          .map((h: any) => (h && typeof h === "object" && "weight" in h ? `${h.type}:${h.weight}` : h?.type ?? ""))
          .filter(Boolean)
          .join("|")
      : "";
    const divDelta = trace?.diversityDelta ?? "";

    const cols = [
      rail,
      r.MainDimension,
      r.VerticalValue,
      hyp,
      r.Pattern,
      r.Format,
      r.VisualStyle,
      r.Opening,
      r.Tone,
      r.Talent,
      r.ProofDevice,
      r.CTA,
      r.Spec,
      r.Cluster,
      bpv,
      ms,
      notes,
      rulesHit,
      divDelta,
    ];
    lines.push(cols.map(csvEscape).join(","));
  });
  return lines.join("\n");
}
