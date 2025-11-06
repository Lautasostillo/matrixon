'use client'
import React, { useEffect, useRef } from "react";
import { setImpactWeights, setPipelineFlags, setRulesPack, setCompatRules } from "@/lib/logic";
import type { BrandConfig, RulePack, Rule } from "@/lib/types";

/**
 * RuntimeBridge
 * - Loads Global Rules v2 once from /api/rules/global
 * - Listens for:
 *    - 'engine:set-config' CustomEvent<BrandConfig>
 *    - 'engine:set-rules'  CustomEvent<Rule[]>
 * - Applies impacts/flags and merged rules (global + brand) into the engine (logic.ts setters)
 */
export default function RuntimeBridge() {
  const globalRulesRef = useRef<Rule[] | null>(null);
  const brandRulesRef = useRef<Rule[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/rules/global", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as RulePack;
        if (mounted) {
          globalRulesRef.current = Array.isArray(json.rules) ? json.rules : [];
          // Initialize rule pack at boot (even before a brand config arrives)
          setRulesPack(globalRulesRef.current);
          try {
            const runCount = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]").length;
            window.dispatchEvent(
              new CustomEvent("rules:active", {
                detail: {
                  global: (globalRulesRef.current ?? []).length,
                  brand: 0,
                  run: runCount,
                },
              })
            );
          } catch {
            window.dispatchEvent(
              new CustomEvent("rules:active", {
                detail: { global: (globalRulesRef.current ?? []).length, brand: 0, run: 0 },
              })
            );
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Runtime modifiers (persisted in sessionStorage)
    function getSoftScale(): number {
      const s = Number.parseFloat(sessionStorage.getItem("softWeightScale") || "1");
      return Number.isFinite(s) ? s : 1;
    }
    function getDisabledQuotas(): { field: string; values?: string[] }[] {
      try {
        const raw = JSON.parse(sessionStorage.getItem("disabledQuotas") ?? "[]");
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    }
    function intersects(a: string[] = [], b: string[] = []) {
      if (!a.length || !b.length) return false;
      const set = new Set(a);
      return b.some((x) => set.has(x));
    }
    // Apply modifiers to a rule pack: scale soft weights and filter disabled quotas
    function applyModifiers(rules: Rule[]): Rule[] {
      const scale = getSoftScale();
      const disabled = getDisabledQuotas();
      return (rules || []).filter((r) => {
        if (r.type !== "quota") return true;
        const any = disabled.find((d) => {
          if ((r as any).field !== d.field) return false;
          const values: string[] = Array.isArray((r as any).oneOf)
            ? (r as any).oneOf
            : ((r as any).value ? [(r as any).value] : []);
          if (!d.values || d.values.length === 0) return true; // disable by field
          return intersects(values, d.values);
        });
        return !any; // remove quota if matches disabled set
      }).map((r) => {
        if (r.type === "prefer" || r.type === "penalize") {
          const w = (r as any).weight ?? 0;
          return { ...(r as any), weight: Math.max(-1, Math.min(1, Number((w * scale).toFixed(4)))) } as Rule;
        }
        return r;
      });
    }
function handleSetConfig(e: Event) {
  const cfg = (e as CustomEvent).detail as any;
  if (!cfg) return;

  // impacts / flags: accept both v2 (impacts/flags) and v1 (impactWeights/pipelineFlags)
  const impacts = cfg.impacts ?? cfg.impactWeights;
  if (impacts) setImpactWeights(impacts as any);

  const enforceVOFirstSquareDisallow =
    cfg?.flags?.disallowVOFirstSquare ??
    cfg?.pipelineFlags?.enforceVOFirstSquareDisallow ??
    false;
  setPipelineFlags({ enforceVOFirstSquareDisallow } as any);

  // rules:
  // - v2: cfg.rules.rules is an array of Rule
  // - v1: cfg.rules has { disallow, allowOnly } -> keep as compat rules
  let brandV2Rules: Rule[] = [];
  if (cfg.rules) {
    if (Array.isArray(cfg.rules)) {
      // already an array of extended rules
      brandV2Rules = cfg.rules as Rule[];
    } else if (Array.isArray(cfg.rules?.rules)) {
      brandV2Rules = cfg.rules.rules as Rule[];
    } else if (cfg.rules.disallow || cfg.rules.allowOnly) {
      // v1 compat rules
      setCompatRules(cfg.rules);
    }
  }

  // Merge global + brand v2 rules + run overrides into the unified pack
  brandRulesRef.current = brandV2Rules;
  let runOverrides: Rule[] = [];
  try {
    runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]");
  } catch {}
  const merged: Rule[] = [
    ...(globalRulesRef.current ?? []),
    ...brandV2Rules,
    ...runOverrides,
  ];
  setRulesPack(applyModifiers(merged));
          try {
    const runCount = runOverrides.length;
    window.dispatchEvent(
      new CustomEvent("rules:active", {
        detail: {
          global: (globalRulesRef.current ?? []).length,
          brand: brandV2Rules.length,
          run: runCount,
        },
      })
    );
  } catch {
    window.dispatchEvent(
      new CustomEvent("rules:active", {
        detail: {
          global: (globalRulesRef.current ?? []).length,
          brand: brandV2Rules.length,
          run: 0,
        },
      })
    );
  }
}

    function handleSetRules(e: Event) {
      const rules = (e as CustomEvent).detail as Rule[];
      if (Array.isArray(rules)) {
        brandRulesRef.current = rules;
        let runOverrides: Rule[] = [];
        try {
          runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]");
        } catch {}
        const merged = [
          ...(globalRulesRef.current ?? []),
          ...rules,
          ...runOverrides,
        ];
        setRulesPack(applyModifiers(merged));
        try {
          window.dispatchEvent(
            new CustomEvent("rules:active", {
              detail: {
                global: (globalRulesRef.current ?? []).length,
                brand: rules.length,
                run: runOverrides.length,
              },
            })
          );
        } catch {}
      }
    }

    function applyRunOverrides(ros: Rule[]) {
      try {
        sessionStorage.setItem("runOverrides", JSON.stringify(ros || []));
      } catch {}
      const merged = [
        ...(globalRulesRef.current ?? []),
        ...(brandRulesRef.current ?? []),
        ...(ros || []),
      ];
      setRulesPack(applyModifiers(merged));
      window.dispatchEvent(
        new CustomEvent("rules:active", {
          detail: {
            global: (globalRulesRef.current ?? []).length,
            brand: (brandRulesRef.current ?? []).length,
            run: (ros || []).length,
          },
        })
      );
    }

    window.addEventListener("engine:set-config", handleSetConfig as any);
    window.addEventListener("engine:set-rules", handleSetRules as any);
    window.addEventListener(
      "rules:set-run",
      ((e: any) => applyRunOverrides((e?.detail as Rule[]) || [])) as any
    );
    window.addEventListener(
      "rules:clear-run",
      (() => applyRunOverrides([])) as any
    );
    // Relax soft: reduce weights by 0.2 each press (min 0.2x)
    window.addEventListener("rules:relax-soft", () => {
      const cur = Number.parseFloat(sessionStorage.getItem("softWeightScale") || "1");
      const next = Math.max(0.2, Math.round((cur - 0.2) * 100) / 100);
      try { sessionStorage.setItem("softWeightScale", String(next)); } catch {}
      let runOverrides: Rule[] = [];
      try { runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]" ); } catch {}
      const merged = [
        ...(globalRulesRef.current ?? []),
        ...(brandRulesRef.current ?? []),
        ...runOverrides,
      ];
      setRulesPack(applyModifiers(merged));
    });
    // Reset soft scale to 1.0
    window.addEventListener("rules:reset-soft", () => {
      try { sessionStorage.setItem("softWeightScale", "1"); } catch {}
      let runOverrides: Rule[] = [];
      try { runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]" ); } catch {}
      const merged = [
        ...(globalRulesRef.current ?? []),
        ...(brandRulesRef.current ?? []),
        ...runOverrides,
      ];
      setRulesPack(applyModifiers(merged));
    });
    // Disable specific quota(s) by field and optional values[]
    window.addEventListener("rules:disable-quotas", ((e: any) => {
      const items = Array.isArray(e?.detail) ? e.detail : [];
      try { sessionStorage.setItem("disabledQuotas", JSON.stringify(items)); } catch {}
      let runOverrides: Rule[] = [];
      try { runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]"); } catch {}
      const merged = [
        ...(globalRulesRef.current ?? []),
        ...(brandRulesRef.current ?? []),
        ...runOverrides,
      ];
      setRulesPack(applyModifiers(merged));
    }) as any);
    window.addEventListener("rules:clear-disabled-quotas", (() => {
      try { sessionStorage.removeItem("disabledQuotas"); } catch {}
      let runOverrides: Rule[] = [];
      try { runOverrides = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]"); } catch {}
      const merged = [
        ...(globalRulesRef.current ?? []),
        ...(brandRulesRef.current ?? []),
        ...runOverrides,
      ];
      setRulesPack(applyModifiers(merged));
    }) as any);
    return () => {
      window.removeEventListener("engine:set-config", handleSetConfig as any);
      window.removeEventListener("engine:set-rules", handleSetRules as any);
      window.removeEventListener("rules:set-run", ((e: any) => applyRunOverrides((e?.detail as Rule[]) || [])) as any);
      window.removeEventListener("rules:clear-run", (() => applyRunOverrides([])) as any);
      window.removeEventListener("rules:relax-soft", () => {});
      window.removeEventListener("rules:reset-soft", () => {});
      window.removeEventListener("rules:disable-quotas", ((e: any) => {}) as any);
      window.removeEventListener("rules:clear-disabled-quotas", (() => {}) as any);
    };
  }, []);

  return null;
}
