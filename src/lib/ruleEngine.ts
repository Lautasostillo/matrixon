import type { Field, IfClause, Rule, ThenClause } from "./types";

/**
 * Rule Engine Notes (design contract)
 *
 * Precedence (fixed):
 * 1) Hard constraints: Disallow → AllowOnly → MustInclude (row-level filters)
 * 2) Uniqueness per-vertical: SIMILARITY_KEY (Vertical|Pattern|Format|Visual)
 * 3) Diversity per-vertical: enforce min D using IMPACT_WEIGHTS (pairwise delta)
 * 4) Soft preferences: Prefer/Penalize (row-level score; non-binary)
 * 5) Quotas/Ranges: post-process over the full set (drop lowest-score rows that exceed caps)
 * 6) Repair strategy (when infeasible after quotas/diversity):
 *    - Prefer substitution from candidate pool; if pool exhausted,
 *      relax the least-priority constraint first (Prefer/Penalize), then Quota,
 *      then suggest lowering D or increasing Variety. If still infeasible, surface modal.
 *
 * Quotas semantics:
 * - Current implementation supports simple caps (maxShare) for a given field=value.
 * - Scope: global; per-vertical can be added by segmenting rows by VerticalValue before applyQuotas.
 * - Tolerance: use floor(total * maxShare); with integer rounding this naturally yields ±1 tolerance.
 *
 * D vs Quotas:
 * - If enforcing quotas removes too many rows and breaks diversity (or <3 per vertical),
 *   annotate and recommend auto-fix (lower D slightly or increase Variety for the most impactful lever).
 *
 * Trace:
 * - traceHits(row, rules) returns lightweight hits for surviving rows (omit disallow).
 * - applyQuotas annotates kept rows with __quota meta; logic.ts attaches __trace for UI/CSV.
 */

function getFieldValue(row: any, field: Field): string | null {
  return (row?.[field] ?? null) as string | null;
}

function matchesOp(actual: string | null, op: "equals" | "oneOf" | "startsWith", value: string | string[]): boolean {
  if (!actual) return false;
  if (op === "equals") return actual === (value as string);
  if (op === "oneOf") {
    const arr = Array.isArray(value) ? value : [value];
    return arr.includes(actual);
  }
  if (op === "startsWith") return actual.startsWith(value as string);
  return false;
}

export function match(row: any, ifc: IfClause): boolean {
  const fields = Object.keys(ifc || {}) as Field[];
  for (const f of fields) {
    const clause = (ifc as any)[f] as { op: "equals" | "oneOf" | "startsWith"; value: string | string[] };
    const actual = getFieldValue(row, f);
    if (!matchesOp(actual, clause.op, clause.value)) return false;
  }
  return true;
}

// For disallow: if IF matches and THEN also matches (or THEN empty → treat as hard block), it's a violation to keep the row.
export function violatesDisallow(row: any, r: Rule): boolean {
  if (r.type !== "disallow") return false;
  if (!match(row, r.if)) return false;
  const then = (r.then || {}) as ThenClause;
  const thenKeys = Object.keys(then) as Field[];
  if (thenKeys.length === 0) return true;
  for (const f of thenKeys) {
    const cfg = (then as any)[f] as any;
    const actual = getFieldValue(row, f);
    if (!actual) continue;
    if (cfg.startsWith && actual.startsWith(cfg.startsWith)) return true;
    if (cfg.oneOf && Array.isArray(cfg.oneOf) && cfg.oneOf.includes(actual)) return true;
    if (cfg.op && cfg.value && matchesOp(actual, cfg.op, cfg.value)) return true;
  }
  return false;
}

// For allowOnly: if IF matches then row must satisfy THEN restriction; if not, violation.
export function violatesAllowOnly(row: any, r: Rule): boolean {
  if (r.type !== "allowOnly") return false;
  if (!match(row, r.if)) return false;
  const then = (r.then || {}) as ThenClause;
  const thenKeys = Object.keys(then) as Field[];
  for (const f of thenKeys) {
    const cfg = (then as any)[f] as any;
    const actual = getFieldValue(row, f);
    if (!actual) return true;
    let allowed = true;
    if (cfg.oneOf && Array.isArray(cfg.oneOf)) allowed = cfg.oneOf.includes(actual);
    else if (cfg.startsWith) allowed = actual.startsWith(cfg.startsWith);
    else if (cfg.op && cfg.value) allowed = matchesOp(actual, cfg.op, cfg.value);
    if (!allowed) return true;
  }
  return false;
}

// For mustInclude: if IF matches then row must satisfy THEN (like allowOnly but purely affirmative).
export function violatesMustInclude(row: any, r: Rule): boolean {
  if (r.type !== "mustInclude") return false;
  if (!match(row, r.if)) return false;
  const then = (r.then || {}) as ThenClause;
  const thenKeys = Object.keys(then) as Field[];
  for (const f of thenKeys) {
    const cfg = (then as any)[f] as any;
    const actual = getFieldValue(row, f);
    if (!actual) return true;
    let ok = true;
    if (cfg.oneOf && Array.isArray(cfg.oneOf)) ok = cfg.oneOf.includes(actual);
    else if (cfg.startsWith) ok = actual.startsWith(cfg.startsWith);
    else if (cfg.op && cfg.value) ok = matchesOp(actual, cfg.op, cfg.value);
    if (!ok) return true;
  }
  return false;
}

export function scoreSoft(row: any, r: Rule): number {
  if (r.type !== "prefer" && r.type !== "penalize") return 0;
  if (!match(row, r.if)) return 0;
  const then = (r.then || {}) as ThenClause;
  const thenKeys = Object.keys(then) as Field[];
  let satisfied = false;
  for (const f of thenKeys) {
    const cfg = (then as any)[f] as any;
    const actual = getFieldValue(row, f);
    if (!actual) continue;
    if (cfg.oneOf && Array.isArray(cfg.oneOf) && cfg.oneOf.includes(actual)) satisfied = true;
    else if (cfg.startsWith && actual.startsWith(cfg.startsWith)) satisfied = true;
    else if (cfg.op && cfg.value && matchesOp(actual, cfg.op, cfg.value)) satisfied = true;
  }
  if (!satisfied) return 0;
  const w = (r as any).weight ?? 0;
  return r.type === "prefer" ? w : -w;
}

// Quotas applied after ranking; trim groups over maxShare by dropping lowest-score rows first.
/** Check if a row satisfies a THEN clause (all specified constraints must be true) */
function satisfiesThen(row: any, then: ThenClause): boolean {
  const thenKeys = Object.keys(then || {}) as Field[];
  if (thenKeys.length === 0) return true;
  for (const f of thenKeys) {
    const cfg = (then as any)[f] as any;
    const actual = getFieldValue(row, f);
    if (!actual) return false;
    if (cfg.oneOf && Array.isArray(cfg.oneOf)) {
      if (!cfg.oneOf.includes(actual)) return false;
    } else if (cfg.startsWith) {
      if (!actual.startsWith(cfg.startsWith)) return false;
    } else if (cfg.op && cfg.value) {
      if (!matchesOp(actual, cfg.op, cfg.value)) return false;
    }
  }
  return true;
}

/** Return lightweight per-row rule hits for trace: which rules matched/satisfied */
export function traceHits(row: any, rules: Rule[]) {
  const hits: { type: Rule["type"]; weight?: number }[] = [];
  for (const r of rules || []) {
    if (r.type === "prefer" || r.type === "penalize") {
      if (match(row, r.if) && satisfiesThen(row, r.then || ({} as ThenClause))) {
        hits.push({ type: r.type, weight: (r as any).weight ?? 0 });
      }
    } else if (r.type === "allowOnly" || r.type === "mustInclude") {
      if (match(row, r.if) && satisfiesThen(row, r.then || ({} as ThenClause))) {
        hits.push({ type: r.type });
      }
    }
    // note: disallow is intentionally omitted from "hits" for surviving rows
    // quota is applied at set-level; we annotate in applyQuotas.
  }
  return hits;
}

export function applyQuotas(rows: any[], quotas: Rule[]): any[] {
  if (!quotas.length) return rows;

  const out = [...rows];

  const valuesForRule = (q: any): string[] => {
    if (Array.isArray(q.oneOf) && q.oneOf.length) return q.oneOf.slice();
    if (typeof q.value === "string" && q.value) return [q.value];
    return [];
  };

  const matchesValue = (actual: string | null, q: any): boolean => {
    if (!actual) return false;
    const vals = valuesForRule(q);
    if (vals.length) return vals.includes(actual);
    // if neither value nor oneOf provided, treat as non-matchable (no-op)
    return false;
  };

  const annotateBucketNeed = (bucketIdxs: number[], info: any) => {
    bucketIdxs.forEach((i) => {
      try {
        (out[i] as any).__quotaNeed = info;
      } catch {}
    });
  };

  const enforceCap = (bucketIdxs: number[], groupIdxs: number[], cap: number, metaBase: any, tolerance = 1) => {
    // sort target group by score ascending (drop lowest-score first)
    const group = groupIdxs.map((i) => ({ i, s: (out[i] as any)?.__score ?? 0 }));
    group.sort((a, b) => a.s - b.s);

    // Allow slight tolerance above cap
    const allowed = Math.max(0, cap + (Number.isFinite(tolerance) ? (tolerance as number) : 1));

    const kept = group.slice(0, Math.min(allowed, group.length));
    kept.forEach((g) => {
      try {
        (out[g.i] as any).__quota = { ...metaBase, kept: true };
      } catch {}
    });

    if (group.length > allowed) {
      const toDrop = group.slice(allowed);
      const dropSet = new Set(toDrop.map((g) => g.i));
      for (let j = bucketIdxs.length - 1; j >= 0; j--) {
        const idx = bucketIdxs[j];
        if (dropSet.has(idx)) bucketIdxs.splice(j, 1); // keep indices list in sync
      }
      // Remove from out (by marking and filtering once at the end)
      for (const g of toDrop) {
        (out[g.i] as any).__drop = true;
      }
    }
  };

  // Process each quota rule
  for (const q of quotas) {
    if (q.type !== "quota") continue;
    const field = (q as any).field as Field;
    const scope = (q as any).scope ?? "global";
    const tolerance = Number.isFinite((q as any).tolerance) ? Math.max(0, (q as any).tolerance) : 1;

    // Build buckets by scope
    let buckets: number[][];
    if (scope === "perVertical") {
      const byV: Record<string, number[]> = {};
      out.forEach((r, i) => {
        const v = (r as any)?.VerticalValue ?? "__na__";
        (byV[v] ||= []).push(i);
      });
      buckets = Object.values(byV);
    } else {
      buckets = [out.map((_, i) => i)];
    }

    // Apply per bucket
    for (const bucket of buckets) {
      const bucketSize = bucket.length;
      if (bucketSize === 0) continue;

      // Determine target group (rows matching value/oneOf for field)
      const groupIdxs = bucket.filter((i) => matchesValue(getFieldValue(out[i], field), q));
      const metaBase: any = {
        type: "quota",
        field,
        values: valuesForRule(q),
        scope,
        bucketSize,
      };

      // Legacy maxShare (fraction), new minPct/maxPct (%)
      const hasLegacyMax = Number.isFinite((q as any).maxShare);
      const maxShare = hasLegacyMax ? Math.max(0, Math.min(1, (q as any).maxShare)) : undefined;
      const maxPct = Number.isFinite((q as any).maxPct) ? Math.max(0, Math.min(100, (q as any).maxPct)) : undefined;
      const minPct = Number.isFinite((q as any).minPct) ? Math.max(0, Math.min(100, (q as any).minPct)) : undefined;

      const cap =
        maxShare !== undefined
          ? Math.floor(bucketSize * (maxShare as number))
          : maxPct !== undefined
          ? Math.floor((bucketSize * (maxPct as number)) / 100)
          : undefined;

      // Enforce cap first (trim overflows)
      if (cap !== undefined && groupIdxs.length > cap + tolerance) {
        enforceCap(bucket, groupIdxs, cap, { ...metaBase, cap, tolerance }, tolerance);
      } else {
        // Annotate kept when under cap
        groupIdxs.forEach((i) => {
          try {
            (out[i] as any).__quota = { ...metaBase, cap, tolerance, kept: true };
          } catch {}
        });
      }

      // Check min requirement (only annotate; autofix happens in UI/next pass)
      if (minPct !== undefined) {
        const req = Math.floor((bucketSize * (minPct as number)) / 100) - tolerance;
        const countNow = bucket.filter((i) => matchesValue(getFieldValue(out[i], field), q)).length;
        if (countNow < req) {
          annotateBucketNeed(bucket, {
            ...metaBase,
            minRequired: req,
            current: countNow,
            tolerance,
            need: Math.max(0, req - countNow),
          });
        }
      }

      // perVerticalMinDistinct (e.g., ≥2 Openings distintos por vertical)
      if (scope === "perVertical" && Number.isFinite((q as any).perVerticalMinDistinct)) {
        const needDistinct = Math.max(1, (q as any).perVerticalMinDistinct as number);
        const distinct = new Set<string>();
        bucket.forEach((i) => {
          const v = getFieldValue(out[i], field);
          if (v) distinct.add(v);
        });
        if (distinct.size < needDistinct) {
          annotateBucketNeed(bucket, {
            ...metaBase,
            perVerticalMinDistinct: needDistinct,
            currentDistinct: distinct.size,
            need: Math.max(0, needDistinct - distinct.size),
          });
        }
      }
    }
  }

  // Finalize removal of marked rows
  const finalOut = out.filter((r: any) => !(r as any).__drop);
  return finalOut;
}

export function filterAndRank(rows: any[], rules: Rule[]) {
  const dis = rules.filter((r) => r.type === "disallow");
  const alo = rules.filter((r) => r.type === "allowOnly");
  const mus = rules.filter((r) => r.type === "mustInclude");
  const pre = rules.filter((r) => r.type === "prefer");
  const pen = rules.filter((r) => r.type === "penalize");
  const quo = rules.filter((r) => r.type === "quota");

  let candidates = rows.filter(
    (row) =>
      !dis.some((r) => violatesDisallow(row, r)) &&
      !alo.some((r) => violatesAllowOnly(row, r)) &&
      !mus.some((r) => violatesMustInclude(row, r))
  );

  candidates.forEach((row) => {
    let score = 0;
    pre.forEach((r) => (score += scoreSoft(row, r)));
    pen.forEach((r) => (score += scoreSoft(row, r))); // scoreSoft returns negative for penalize
    (row as any).__score = score;
  });

  candidates.sort((a, b) => ((b as any).__score ?? 0) - ((a as any).__score ?? 0));

  candidates = applyQuotas(candidates, quo);
  return candidates;
}
