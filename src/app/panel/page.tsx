'use client'
import React, { useEffect, useMemo, useState } from "react";
import { useBrand } from "@/lib/store";
import Link from "next/link";
import type { BrandConfig, BrandPools, BrandRules } from "@/lib/brand";
import type { Rule, Field } from "@/lib/types";
import {
  PATTERNS as DEF_PATTERNS,
  FORMATS as DEF_FORMATS,
  VISUAL_STYLES as DEF_VISUAL_STYLES,
  OPENINGS as DEF_OPENINGS,
  TONES as DEF_TONES,
  TALENTS as DEF_TALENTS,
  CTAS as DEF_CTAS,
  PROOFS as DEF_PROOFS,
  SPECS as DEF_SPECS,
  DEFAULT_VERTICAL_VALUES as DEF_DEFAULT_VERTICAL_VALUES,
  IMPACT_WEIGHTS as DEF_IMPACT_WEIGHTS,
  COMPAT_RULES as DEF_COMPAT_RULES,
} from "@/lib/config";

type Tab = "Brand" | "Dimensions" | "Pools" | "Rules" | "Weights & Flags" | "Presets" | "Export";

const EMPTY_CONFIG: BrandConfig = {
  brandId: "",
  mainDimension: "Pain Point",
  verticalValues: {},
  pools: {},
  rules: { disallow: [], allowOnly: [] },
  impactWeights: {},
  pipelineFlags: { enforceVOFirstSquareDisallow: false },
  presets: {},
  globals: { defaultTargetCPA: 50, defaultMinSpendFactor: 40, defaultReadDays: 10 },
};

export default function BrandConfigPanel() {
  const { activeBrandId, loadBrand, saveBrand, applyBrand, config } = useBrand() as any;
  const loading = false;

  // Server brand list
  const [brands, setBrands] = useState<string[]>([]);
  const [brandId, setBrandId] = useState<string>(activeBrandId ?? "");
  const [cfg, setCfg] = useState<BrandConfig>(EMPTY_CONFIG);
  const [tab, setTab] = useState<Tab>("Brand");
  const [message, setMessage] = useState<string>("");

  // Brand v2 Rules (session, no save yet)
  const [v2Rules, setV2Rules] = useState<Rule[]>([]);
  const [wizOpen, setWizOpen] = useState(false);
  const [wizType, setWizType] = useState<Rule["type"]>("disallow");
  const [wizIfField, setWizIfField] = useState<Field>("Opening");
  const [wizIfOp, setWizIfOp] = useState<"equals" | "oneOf" | "startsWith">("equals");
  const [wizIfValue, setWizIfValue] = useState<string>("");

  const [wizThenField, setWizThenField] = useState<Field>("Format");
  const [wizThenOp, setWizThenOp] = useState<"equals" | "oneOf" | "startsWith">("equals");
  const [wizThenValue, setWizThenValue] = useState<string>("");
  const [wizWeight, setWizWeight] = useState<number>(0.3);

  // Quota wizard state
  const [wizQuotaField, setWizQuotaField] = useState<Field>("Opening");
  const [wizQuotaScope, setWizQuotaScope] = useState<"global" | "perVertical">("global");
  const [wizQuotaOneOf, setWizQuotaOneOf] = useState<string>("");
  const [wizQuotaMinPct, setWizQuotaMinPct] = useState<string>("");
  const [wizQuotaMaxPct, setWizQuotaMaxPct] = useState<string>("");
  const [wizQuotaMaxShare, setWizQuotaMaxShare] = useState<string>("");
  const [wizQuotaMinDistinct, setWizQuotaMinDistinct] = useState<string>("");
  const [wizQuotaTolerance, setWizQuotaTolerance] = useState<number>(1);

  function fieldsAll(): Field[] {
    return ["Pattern","Format","VisualStyle","Opening","Tone","Talent","CTA","ProofDevice","Spec"];
  }
  function makeClause(op: "equals" | "oneOf" | "startsWith", raw: string) {
    if (op === "oneOf") {
      const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return { op, value: arr };
    }
    return { op, value: raw };
  }
  function addV2Rule() {
    // Helper: split comma-separated list
    const splitVals = (raw: string) =>
      raw.split(",").map((s) => s.trim()).filter(Boolean);

    if (wizType === "quota") {
      const errs: string[] = [];

      const vals = splitVals(wizQuotaOneOf);
      const hasOneOf = vals.length > 0;
      const hasMinPct = wizQuotaMinPct !== "";
      const hasMaxPct = wizQuotaMaxPct !== "";
      const hasMaxShare = wizQuotaMaxShare !== "";
      const hasMinDistinct = wizQuotaScope === "perVertical" && wizQuotaMinDistinct !== "";

      // at least one constraint present
      if (!hasOneOf && !hasMinPct && !hasMaxPct && !hasMaxShare && !hasMinDistinct) {
        errs.push("Define at least one of oneOf / min% / max% / maxShare / minDistinct for quota.");
      }

      // numeric validations
      const nMinPct = hasMinPct ? Number(wizQuotaMinPct) : undefined;
      const nMaxPct = hasMaxPct ? Number(wizQuotaMaxPct) : undefined;
      const nMaxShare = hasMaxShare ? Number(wizQuotaMaxShare) : undefined;
      const nTol = Number.isFinite(wizQuotaTolerance) ? wizQuotaTolerance : 1;
      const nMinDistinct = hasMinDistinct ? Number(wizQuotaMinDistinct) : undefined;

      if (hasMinPct && (!(Number.isFinite(nMinPct)) || nMinPct! < 0 || nMinPct! > 100)) errs.push("min% must be between 0 and 100.");
      if (hasMaxPct && (!(Number.isFinite(nMaxPct)) || nMaxPct! < 0 || nMaxPct! > 100)) errs.push("max% must be between 0 and 100.");
      if (hasMinPct && hasMaxPct && nMinPct! > nMaxPct!) errs.push("min% cannot be greater than max%.");
      if (hasMaxShare && (!(Number.isFinite(nMaxShare)) || nMaxShare! < 0 || nMaxShare! > 1)) errs.push("maxShare must be between 0 and 1.");
      if (!(Number.isFinite(nTol)) || nTol < 0) errs.push("tolerance must be ≥ 0.");
      if (hasMinDistinct && (!(Number.isFinite(nMinDistinct)) || nMinDistinct! < 1)) errs.push("minDistinct must be ≥ 1.");

      if (errs.length) {
        setMessage(errs.join(" | "));
        return;
      }

      const rule: any = {
        type: "quota",
        field: wizQuotaField,
        scope: wizQuotaScope,
        tolerance: nTol,
      };
      if (vals.length) rule.oneOf = vals;
      if (hasMinPct) rule.minPct = nMinPct;
      if (hasMaxPct) rule.maxPct = nMaxPct;
      if (hasMaxShare) rule.maxShare = nMaxShare;
      if (hasMinDistinct) rule.perVerticalMinDistinct = nMinDistinct;

      setV2Rules((r) => [...r, rule as Rule]);
      setWizOpen(false);
      return;
    }

    // Non-quota validations
    const ifVals = wizIfOp === "oneOf" ? splitVals(wizIfValue) : (wizIfValue ? [wizIfValue] : []);
    const thenVals = wizThenOp === "oneOf" ? splitVals(wizThenValue) : (wizThenValue ? [wizThenValue] : []);
    const errs: string[] = [];
    if (ifVals.length === 0) errs.push("IF value(s) cannot be empty.");
    if (thenVals.length === 0) errs.push("THEN value(s) cannot be empty.");
    if ((wizType === "prefer" || wizType === "penalize")) {
      if (!(Number.isFinite(wizWeight)) || wizWeight < 0 || wizWeight > 1) {
        errs.push("Weight must be between 0 and 1.");
      }
    }
    if (errs.length) {
      setMessage(errs.join(" | "));
      return;
    }

    const ifc: any = { [wizIfField]: makeClause(wizIfOp, wizIfValue) };
    if (wizType === "disallow") {
      const then: any = { [wizThenField]: makeClause(wizThenOp, wizThenValue) };
      setV2Rules((r) => [...r, { type: "disallow", if: ifc, then } as Rule]);
    } else if (wizType === "allowOnly") {
      const then: any = { [wizThenField]: makeClause(wizThenOp, wizThenValue) };
      setV2Rules((r) => [...r, { type: "allowOnly", if: ifc, then } as Rule]);
    } else if (wizType === "mustInclude") {
      const then: any = { [wizThenField]: makeClause(wizThenOp, wizThenValue) };
      setV2Rules((r) => [...r, { type: "mustInclude", if: ifc, then } as Rule]);
    } else if (wizType === "prefer") {
      const then: any = { [wizThenField]: makeClause(wizThenOp, wizThenValue) };
      setV2Rules((r) => [...r, { type: "prefer", if: ifc, then, weight: wizWeight } as Rule]);
    } else if (wizType === "penalize") {
      const then: any = { [wizThenField]: makeClause(wizThenOp, wizThenValue) };
      setV2Rules((r) => [...r, { type: "penalize", if: ifc, then, weight: wizWeight } as Rule]);
    }
    setWizOpen(false);
  }
  function applyV2BrandRules() {
    try {
      window.dispatchEvent(new CustomEvent("engine:set-rules", { detail: v2Rules }));
      setMessage(`Applied ${v2Rules.length} brand v2 rule(s) (no save).`);
    } catch {}
  }

  // Filters for v2 rule list
  const [v2TypeFilter, setV2TypeFilter] = useState<Record<Rule["type"], boolean>>({
    disallow: true,
    allowOnly: true,
    mustInclude: true,
    prefer: true,
    penalize: true,
    quota: true,
  });
  function toggleType(t: Rule["type"]) {
    setV2TypeFilter((prev) => ({ ...prev, [t]: !prev[t] }));
  }
  const v2Filtered = useMemo(() => v2Rules.filter((r) => v2TypeFilter[r.type]), [v2Rules, v2TypeFilter]);

  // Import global rules (docs/rules/global.v2.json) into brand session
  async function copyGlobalToBrand() {
    try {
      const res = await fetch("/api/rules/global", { cache: "no-store" });
      if (!res.ok) {
        setMessage("Global rules not found.");
        return;
      }
      const json = await res.json();
      const list = Array.isArray((json as any)?.rules)
        ? (json as any).rules
        : Array.isArray(json)
        ? (json as any)
        : [];
      if (!Array.isArray(list)) {
        setMessage("Global rules format invalid.");
        return;
      }
      setV2Rules(list as Rule[]);
      setMessage(`Imported ${list.length} global rule(s) into brand session.`);
    } catch (e: any) {
      setMessage(String(e));
    }
  }

  async function saveV2ToBrand() {
    try {
      const id = (cfg as any).brandId || brandId;
      if (!id) {
        setMessage("Please set a Brand ID before saving v2 rules.");
        return;
      }
      // Merge v1 lists (if present) plus v2 array into a single rules object
      const mergedRules: any = {
        ...(cfg as any).rules ?? { disallow: [], allowOnly: [] },
        rules: v2Rules,
      };
      const newCfg: any = { ...(cfg as any), brandId: id, rules: mergedRules };
      await (saveBrand as any)(newCfg);
      await (applyBrand as any)(newCfg);
      setCfg(newCfg);
      setMessage(`Saved ${v2Rules.length} v2 rule(s) to brand "${id}" and applied.`);
    } catch (e: any) {
      setMessage(String(e));
    }
  }

  // Run overrides (session) state
  const [runOverrides, setRunOverrides] = useState<any[]>([]);
  useEffect(() => {
    try {
      const ros = JSON.parse(sessionStorage.getItem("runOverrides") ?? "[]");
      if (Array.isArray(ros)) setRunOverrides(ros);
    } catch {}
  }, []);
  function applyRunOverrides(ros: any[]) {
    try {
      sessionStorage.setItem("runOverrides", JSON.stringify(ros));
    } catch {}
    setRunOverrides(ros);
    try {
      window.dispatchEvent(new CustomEvent("rules:set-run", { detail: ros }));
    } catch {}
  }
  function clearRunOverrides() {
    try {
      sessionStorage.removeItem("runOverrides");
      setRunOverrides([]);
      window.dispatchEvent(new CustomEvent("rules:clear-run"));
    } catch {}
  }

  useEffect(() => {
    // Load brand list
    (async () => {
      try {
        const res = await fetch("/api/brands", { cache: "no-store" });
        const json = await res.json();
        setBrands(json.brands ?? []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // If we already have an active brand, reflect its id in header
    if (activeBrandId && !brandId) setBrandId(activeBrandId);
  }, [activeBrandId, brandId]);

  // Keep panel form synchronized with the ACTIVE brand on disk (normalize v1/v2 → panel shape)
  useEffect(() => {
    (async () => {
      try {
        if (!activeBrandId) return;
        const res = await fetch(`/api/brands/${encodeURIComponent(activeBrandId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const raw = await res.json();
        const normalized = normalizeBrandJsonToPanel(raw, activeBrandId);
        setCfg(normalized);
      } catch {
        // ignore
      }
    })();
  }, [activeBrandId]);

  // Helpers to normalize any brand JSON (v1/v2) into the panel's editable shape
  function toObj(it: any) {
    return typeof it === "string" ? { id: it.replace(/[^A-Za-z0-9]+/g, "_"), name: it } : it;
  }
  function normalizeBrandJsonToPanel(src: any, targetBrandId: string): BrandConfig {
    // Pools: accept string[] or {id,name}[]
    const pools: any = {};
    for (const key of ["PATTERNS","FORMATS","VISUAL_STYLES","OPENINGS","TONES","TALENTS","CTAS","PROOFS","SPECS"] as const) {
      const arr = src?.pools?.[key];
      if (Array.isArray(arr)) pools[key] = arr.map(toObj);
    }
    // Fallback to global defaults if brand omitted pools (ensures the panel never shows empty lists)
    const defaults: any = {
      PATTERNS: DEF_PATTERNS,
      FORMATS: DEF_FORMATS,
      VISUAL_STYLES: DEF_VISUAL_STYLES,
      OPENINGS: DEF_OPENINGS,
      TONES: DEF_TONES,
      TALENTS: DEF_TALENTS,
      CTAS: DEF_CTAS,
      PROOFS: DEF_PROOFS,
      SPECS: DEF_SPECS,
    };
    for (const k of Object.keys(defaults)) {
      const cur = (pools as any)[k];
      if (!cur || !Array.isArray(cur) || cur.length === 0) {
        (pools as any)[k] = (defaults as any)[k].map((x: any) => ({
          id: x.id,
          name: x.name,
          ...(x.cluster ? { cluster: x.cluster } : {}),
        }));
      }
    }

    // Rules: keep v1 lists in the editor; v2 rules are applied at runtime via store/bridge
    let rules: any = { disallow: [], allowOnly: [] };
    if (src?.rules?.disallow || src?.rules?.allowOnly) rules = src.rules;

    // Impacts/flags mapping
    let impactWeights: any = src?.impactWeights ?? src?.impacts ?? {};
    const pipelineFlags =
      src?.pipelineFlags ??
      (src?.flags ? { enforceVOFirstSquareDisallow: !!src.flags.disallowVOFirstSquare } : {});

    // Globals mapping
    const globals = src?.globals
      ? {
          defaultTargetCPA: src.globals.defaultTargetCPA ?? src.globals.targetCPA ?? 50,
          defaultMinSpendFactor: src.globals.defaultMinSpendFactor ?? src.globals.minSpendFactor ?? 40,
          defaultReadDays: src.globals.defaultReadDays ?? src.globals.readDays ?? 10,
        }
      : { defaultTargetCPA: 50, defaultMinSpendFactor: 40, defaultReadDays: 10 };

    // Dimensions: if src.verticalValues es mapa {value:weight} (demo), llevarlo a listas bajo mainDimension
    const mainDimension = src?.mainDimension ?? "Pain Point";
    const verticalValues: Record<string, string[]> = {};
    if (src?.verticalValues && typeof src.verticalValues === "object" && !Array.isArray(src.verticalValues)) {
      const vals = Object.keys(src.verticalValues);
      verticalValues[mainDimension] = vals;
    }
    // Fallback to global defaults if no list detected for the main dimension
    if (!verticalValues[mainDimension] || verticalValues[mainDimension].length === 0) {
      verticalValues[mainDimension] = [...(DEF_DEFAULT_VERTICAL_VALUES as any)[mainDimension]];
    }

    if (!impactWeights || Object.keys(impactWeights).length === 0) {
      impactWeights = { ...DEF_IMPACT_WEIGHTS } as any;
    }
    return {
      brandId: targetBrandId || src?.brandId || "",
      mainDimension,
      verticalValues,
      pools,
      rules,
      impactWeights,
      pipelineFlags,
      presets: src?.presets ?? {},
      globals,
    } as BrandConfig;
  }

  // Actions
  async function handleLoad() {
    if (!brandId) return;
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandId)}`, { cache: "no-store" });
      if (!res.ok) {
        setMessage(`Brand "${brandId}" not found. You can create it and Save.`);
        setCfg({ ...EMPTY_CONFIG, brandId });
        return;
      }
      const raw = await res.json();
      const normalized = normalizeBrandJsonToPanel(raw, brandId);
      setCfg(normalized);
      await loadBrand(brandId); // apply to engine/UI (runtime will handle v1/v2)
      setMessage(`Loaded brand "${brandId}".`);
    } catch (e: any) {
      setMessage(String(e));
    }
  }

  // Initialize new config using DEMO (acme-demo) or fallback to sample, normalizing shapes (v2→v1) for this panel
  async function handleNewFromDemo() {
    try {
      let demo: any | null = null;
      try {
        const r = await fetch("/api/brands/acme-demo", { cache: "no-store" });
        if (r.ok) demo = await r.json();
      } catch {}
      if (!demo) {
        try {
          const r2 = await fetch("/api/brands/sample", { cache: "no-store" });
          if (r2.ok) demo = await r2.json();
        } catch {}
      }

      // Start from empty template and keep current typed brandId (if any)
      let next: any = { ...EMPTY_CONFIG, brandId: brandId || "" };

      if (demo && typeof demo === "object") {
        // Pools: if strings → map to {id,name}; otherwise keep as-is
        const srcPools = demo.pools ?? {};
        const pools: any = {};
        for (const key of ["PATTERNS","FORMATS","VISUAL_STYLES","OPENINGS","TONES","TALENTS","CTAS","PROOFS","SPECS"] as const) {
          const arr = (srcPools as any)[key];
          if (Array.isArray(arr)) {
            (pools as any)[key] = arr.map((it: any) =>
              typeof it === "string"
                ? { id: it.replace(/[^A-Za-z0-9]+/g, "_"), name: it }
                : it
            );
          }
        }

        // Rules: accept v1 {disallow, allowOnly} or v2 {rules: []}
        let rules: any = { disallow: [], allowOnly: [] };
        if (demo.rules?.disallow || demo.rules?.allowOnly) {
          rules = demo.rules;
        } else if (Array.isArray(demo.rules?.rules)) {
          // panel shows only compat lists; keep empty here (RuntimeBridge will ingest v2 via store)
          rules = { disallow: [], allowOnly: [] };
        }

        const impactWeights = demo.impactWeights ?? demo.impacts ?? {};
        const pipelineFlags =
          demo.pipelineFlags ??
          (demo.flags ? { enforceVOFirstSquareDisallow: !!demo.flags.disallowVOFirstSquare } : {});

        const globals = demo.globals
          ? {
              defaultTargetCPA:
                demo.globals.defaultTargetCPA ?? demo.globals.targetCPA ?? 50,
              defaultMinSpendFactor:
                demo.globals.defaultMinSpendFactor ?? demo.globals.minSpendFactor ?? 40,
              defaultReadDays:
                demo.globals.defaultReadDays ?? demo.globals.readDays ?? 10,
            }
          : next.globals;

        next = {
          ...next,
          mainDimension: demo.mainDimension ?? next.mainDimension,
          // Keep panel-friendly verticals (lists); if DEMO has numeric weights, we ignore and let user edit
          verticalValues: next.verticalValues,
          pools,
          rules,
          impactWeights,
          pipelineFlags,
          presets: demo.presets ?? {},
          globals,
        };
      }

      setCfg(next);
      setMessage("New brand config initialized from DEMO (edit then Save).");
    } catch {
      setCfg({ ...EMPTY_CONFIG, brandId: brandId || "" });
      setMessage("New brand config initialized (fallback).");
    }
  }

  async function handleSave(applyAfter = true) {
    if (!cfg.brandId && brandId) {
      setCfg((prev) => ({ ...prev, brandId }));
    }
    const id = cfg.brandId || brandId;
    if (!id) {
      setMessage("Please set a Brand ID before saving.");
      return;
    }
    try {
      await saveBrand({ ...cfg, brandId: id } as any);
      if (applyAfter) {
        await applyBrand({ ...cfg, brandId: id } as any);
      }
      if (!brands.includes(id)) setBrands((b) => [...b, id]);
      setMessage(`Saved brand "${id}"${applyAfter ? " and applied" : ""}.`);
    } catch (e: any) {
      setMessage(String(e));
    }
  }

  function handleApplyLocal() {
    if (!cfg.brandId && brandId) {
      setCfg((prev) => ({ ...prev, brandId }));
    }
    const id = cfg.brandId || brandId || "local";
    applyBrand({ ...cfg, brandId: id } as any);
    setMessage(`Applied config for "${id}" (not persisted).`);
  }

  // Helpers
  function updateVerticalValue(dim: string, idx: number, value: string) {
    setCfg((prev) => {
      const vv = { ...(prev.verticalValues ?? {}) };
      const list = [...(vv[dim] ?? [])];
      list[idx] = value;
      vv[dim] = list;
      return { ...prev, verticalValues: vv };
    });
  }
  function addVerticalValue(dim: string) {
    setCfg((prev) => {
      const vv = { ...(prev.verticalValues ?? {}) };
      const list = [...(vv[dim] ?? [])];
      list.push(`V${list.length + 1}`);
      vv[dim] = list;
      return { ...prev, verticalValues: vv };
    });
  }
  function removeVerticalValue(dim: string, idx: number) {
    setCfg((prev) => {
      const vv = { ...(prev.verticalValues ?? {}) };
      const list = [...(vv[dim] ?? [])];
      list.splice(idx, 1);
      vv[dim] = list;
      return { ...prev, verticalValues: vv };
    });
  }

  function updatePoolItem(poolKey: keyof BrandPools, idx: number, field: "id" | "name" | "cluster", value: string) {
    setCfg((prev) => {
      const pools: BrandPools = { ...(prev.pools ?? {}) };
      const arr = [...(pools[poolKey] ?? [])];
      const item = { ...(arr[idx] ?? {}) } as any;
      item[field] = value || undefined;
      arr[idx] = item;
      (pools as any)[poolKey] = arr;
      return { ...prev, pools };
    });
  }
  function addPoolItem(poolKey: keyof BrandPools) {
    setCfg((prev) => {
      const pools: BrandPools = { ...(prev.pools ?? {}) };
      const arr = [...(pools[poolKey] ?? [])];
      arr.push({ id: `X${arr.length + 1}`, name: "New Item" } as any);
      (pools as any)[poolKey] = arr;
      return { ...prev, pools };
    });
  }
  function removePoolItem(poolKey: keyof BrandPools, idx: number) {
    setCfg((prev) => {
      const pools: BrandPools = { ...(prev.pools ?? {}) };
      const arr = [...(pools[poolKey] ?? [])];
      arr.splice(idx, 1);
      (pools as any)[poolKey] = arr;
      return { ...prev, pools };
    });
  }

  function updateRule(ruleType: keyof BrandRules, idx: number, field: "when" | "thenNot" | "thenOnly", jsonText: string) {
    setCfg((prev) => {
      const rules: BrandRules = { ...(prev.rules ?? { disallow: [], allowOnly: [] }) };
      const arr = [...(rules[ruleType] ?? [])];
      let parsed: any = undefined;
      try {
        parsed = jsonText ? JSON.parse(jsonText) : undefined;
      } catch {
        // keep string to show user invalid JSON, but do not break
        parsed = jsonText;
      }
      const obj = { ...(arr[idx] ?? {}) } as any;
      obj[field] = parsed;
      arr[idx] = obj;
      (rules as any)[ruleType] = arr;
      return { ...prev, rules };
    });
  }
  function addRule(ruleType: keyof BrandRules) {
    setCfg((prev) => {
      const rules: BrandRules = { ...(prev.rules ?? { disallow: [], allowOnly: [] }) };
      const arr = [...(rules[ruleType] ?? [])];
      arr.push(ruleType === "disallow" ? { when: {}, thenNot: {} } : { when: {}, thenOnly: {} });
      (rules as any)[ruleType] = arr;
      return { ...prev, rules };
    });
  }
  function removeRule(ruleType: keyof BrandRules, idx: number) {
    setCfg((prev) => {
      const rules: BrandRules = { ...(prev.rules ?? { disallow: [], allowOnly: [] }) };
      const arr = [...(rules[ruleType] ?? [])];
      arr.splice(idx, 1);
      (rules as any)[ruleType] = arr;
      return { ...prev, rules };
    });
  }

  // Presets: Load & Apply into builder (updates sliders + D in the Matrix page)
  async function loadPreset(kind: "discover" | "refine" | "scale") {
    try {
      const res = await fetch(`/api/presets/${encodeURIComponent(kind)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Preset not found");
      const json = await res.json();
      // Notify builder to apply variety+D without reload
      window.dispatchEvent(new CustomEvent("builder:apply-preset", { detail: json }));
      setMessage(`Applied preset "${kind}" to builder (not saved).`);
      // Optionally persist path reference
      setCfg((prev) => ({
        ...prev,
        presets: { ...(prev.presets ?? {}), [kind]: `../presets/${kind}.json` },
      }));
    } catch (e: any) {
      setMessage(String(e));
    }
  }

  // Export / Import JSON
  const exportJson = useMemo(() => JSON.stringify(cfg, null, 2), [cfg]);
  function importJson(text: string) {
    try {
      const obj = JSON.parse(text) as BrandConfig;
      setCfg(obj);
      setMessage("Imported JSON (not saved yet).");
    } catch (e: any) {
      setMessage("Invalid JSON.");
    }
  }

  const poolKeys: (keyof BrandPools)[] = [
    "PATTERNS",
    "FORMATS",
    "VISUAL_STYLES",
    "OPENINGS",
    "TONES",
    "TALENTS",
    "CTAS",
    "PROOFS",
    "SPECS",
  ];
  const dimensions = ["Target Persona", "Pain Point", "Messaging Angle", "Core Insight", "Product"];

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg bg-neutral-800 px-3 py-1 hover:bg-neutral-700">{`← Back to Matrix`}</Link>
            <h1 className="text-2xl font-semibold">Diversity matrix — Brand Config</h1>
          </div>
          <div className="text-sm text-neutral-300">
            Active: {activeBrandId ?? "—"} {loading ? "(loading…)" : ""}
          </div>
        </div>

        {/* Brand tab */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800">
          <div className="flex flex-wrap items-center gap-2">
            {(["Brand","Dimensions","Pools","Rules","Weights & Flags","Presets","Export"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-lg ${tab === t ? "bg-indigo-600" : "bg-neutral-800 hover:bg-neutral-700"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === "Brand" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm mb-1">Brand ID</div>
                <input
                  className="w-full bg-neutral-800 rounded-xl p-2"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  placeholder="e.g., sesame"
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
                  onClick={handleLoad}
                  disabled={!brandId}
                >
                  Load Brand
                </button>
                <button
                  className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
                  onClick={handleNewFromDemo}
                >
                  New Config
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm mb-1">Globals: Default Target CPA</div>
                <input
                  type="number"
                  className="w-full bg-neutral-800 rounded-xl p-2"
                  value={cfg.globals?.defaultTargetCPA ?? 50}
                  onChange={(e) =>
                    setCfg((prev) => ({ ...prev, globals: { ...(prev.globals ?? {}), defaultTargetCPA: Number(e.target.value) } }))
                  }
                />
              </div>
              <div>
                <div className="text-sm mb-1">Globals: Min Spend Factor</div>
                <input
                  type="number"
                  className="w-full bg-neutral-800 rounded-xl p-2"
                  value={cfg.globals?.defaultMinSpendFactor ?? 40}
                  onChange={(e) =>
                    setCfg((prev) => ({ ...prev, globals: { ...(prev.globals ?? {}), defaultMinSpendFactor: Number(e.target.value) } }))
                  }
                />
              </div>
              <div>
                <div className="text-sm mb-1">Globals: Read Days</div>
                <input
                  type="number"
                  className="w-full bg-neutral-800 rounded-xl p-2"
                  value={cfg.globals?.defaultReadDays ?? 10}
                  onChange={(e) =>
                    setCfg((prev) => ({ ...prev, globals: { ...(prev.globals ?? {}), defaultReadDays: Number(e.target.value) } }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-lg bg-indigo-600 px-3 py-2 hover:bg-indigo-500" onClick={() => handleSave(true)}>
                Save & Apply
              </button>
              <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={() => handleSave(false)}>
                Save (no apply)
              </button>
              <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={handleApplyLocal}>
                Apply Local (no save)
              </button>
            </div>
          </div>
        )}

        {tab === "Dimensions" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dimensions.map((dim) => {
                const list = cfg.verticalValues?.[dim] ?? [];
                return (
                  <div key={dim}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{dim}</div>
                      <button className="rounded-lg bg-neutral-800 px-2 py-1 hover:bg-neutral-700" onClick={() => addVerticalValue(dim)}>
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {list.map((v, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            className="flex-1 bg-neutral-800 rounded-xl p-2"
                            value={v}
                            onChange={(e) => updateVerticalValue(dim, i, e.target.value)}
                          />
                          <button className="rounded-lg bg-red-500/80 px-2 hover:bg-red-500" onClick={() => removeVerticalValue(dim, i)}>
                            ✕
                          </button>
                        </div>
                      ))}
                      {list.length === 0 && <div className="text-sm text-neutral-400">No values yet.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "Pools" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-6">
            {poolKeys.map((k) => {
              const arr = (cfg.pools?.[k] ?? []) as any[];
              const isFormat = k === "FORMATS";
              return (
                <div key={k}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{k}</div>
                    <button className="rounded-lg bg-neutral-800 px-2 py-1 hover:bg-neutral-700" onClick={() => addPoolItem(k)}>
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {arr.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <input
                          className="col-span-3 bg-neutral-800 rounded-xl p-2"
                          placeholder="id"
                          value={item.id ?? ""}
                          onChange={(e) => updatePoolItem(k, i, "id", e.target.value)}
                        />
                        <input
                          className="col-span-7 bg-neutral-800 rounded-xl p-2"
                          placeholder="name"
                          value={item.name ?? ""}
                          onChange={(e) => updatePoolItem(k, i, "name", e.target.value)}
                        />
                        {isFormat ? (
                          <input
                            className="col-span-1 bg-neutral-800 rounded-xl p-2"
                            placeholder="cluster"
                            value={item.cluster ?? ""}
                            onChange={(e) => updatePoolItem(k, i, "cluster", e.target.value)}
                          />
                        ) : (
                          <div />
                        )}
                        <button className="col-span-1 rounded-lg bg-red-500/80 hover:bg-red-500" onClick={() => removePoolItem(k, i)}>
                          ✕
                        </button>
                      </div>
                    ))}
                    {arr.length === 0 && <div className="text-sm text-neutral-400">No items yet.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "Rules" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-6">
            {/* System defaults (read-only): legacy v1 rules to avoid "reglas fantasma" */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">System defaults (read-only)</div>
              </div>
              <div className="space-y-3">
                {(DEF_COMPAT_RULES?.disallow ?? []).map((r: any, i: number) => (
                  <div key={`sys-dis-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">when (JSON)</div>
                      <textarea className="w-full bg-neutral-900 rounded-xl p-2 min-h-[70px]" readOnly value={tryStringify(r.when)} />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">thenNot (JSON)</div>
                      <textarea className="w-full bg-neutral-900 rounded-xl p-2 min-h-[70px]" readOnly value={tryStringify(r.thenNot)} />
                    </div>
                  </div>
                ))}
                {(DEF_COMPAT_RULES?.allowOnly ?? []).map((r: any, i: number) => (
                  <div key={`sys-allo-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">when (JSON)</div>
                      <textarea className="w-full bg-neutral-900 rounded-xl p-2 min-h-[70px]" readOnly value={tryStringify(r.when)} />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">thenOnly (JSON)</div>
                      <textarea className="w-full bg-neutral-900 rounded-xl p-2 min-h-[70px]" readOnly value={tryStringify(r.thenOnly)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand rules (v2) wizard (session) */}
            <div className="p-3 rounded-xl bg-neutral-900/50 ring-1 ring-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Brand rules (v2) — session (no save)</div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-neutral-800 px-3 py-1 hover:bg-neutral-700 text-sm" onClick={() => setWizOpen(true)}>
                    + Add rule (Wizard)
                  </button>
                  <button
                    className="rounded-lg bg-neutral-800 px-3 py-1 hover:bg-neutral-700 text-sm"
                    onClick={copyGlobalToBrand}
                  >
                    Copy Global → Brand
                  </button>
                  <button
                    className="rounded-lg bg-neutral-800 px-3 py-1 hover:bg-neutral-700 text-sm"
                    onClick={applyV2BrandRules}
                    disabled={v2Rules.length === 0}
                  >
                    Apply Brand v2 (no save)
                  </button>
                  <button
                    className="rounded-lg bg-indigo-600 px-3 py-1 hover:bg-indigo-500 text-sm text-white"
                    onClick={saveV2ToBrand}
                    disabled={v2Rules.length === 0}
                  >
                    Save v2 to brand
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(["disallow","allowOnly","mustInclude","prefer","penalize","quota"] as any[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleType(t as any)}
                    className={`text-xs px-2 py-1 rounded ${v2TypeFilter[t as keyof typeof v2TypeFilter] ? "bg-neutral-800" : "bg-neutral-900 line-through"}`}
                  >
                    {String(t)}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {v2Rules.length === 0 ? (
                  <div className="text-sm text-neutral-400">No v2 rules yet.</div>
                ) : (
                  v2Filtered.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800">
                      <div className="text-xs text-neutral-300 truncate">{summarizeRule(r as any)}</div>
                      <button
                        className="text-xs rounded bg-red-500/80 hover:bg-red-500 px-2 py-1"
                        onClick={() => {
                          const next = v2Rules.slice();
                          next.splice(i, 1);
                          setV2Rules(next);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {(["disallow", "allowOnly"] as (keyof BrandRules)[]).map((rt) => {
              const arr = (cfg.rules?.[rt] ?? []) as any[];
              return (
                <div key={rt}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{rt}</div>
                    <button className="rounded-lg bg-neutral-800 px-2 py-1 hover:bg-neutral-700" onClick={() => addRule(rt)}>
                      + Add rule
                    </button>
                  </div>
                  <div className="space-y-3">
                    {arr.map((r, i) => {
                      const whenText = tryStringify(r.when);
                      const thenKey = rt === "disallow" ? "thenNot" : "thenOnly";
                      const thenText = tryStringify(r[thenKey]);
                      return (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-neutral-400 mb-1">when (JSON)</div>
                            <textarea
                              className="w-full bg-neutral-800 rounded-xl p-2 min-h-[90px]"
                              value={whenText}
                              onChange={(e) => updateRule(rt, i, "when", e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="text-xs text-neutral-400 mb-1">{thenKey} (JSON)</div>
                            <textarea
                              className="w-full bg-neutral-800 rounded-xl p-2 min-h-[90px]"
                              value={thenText}
                              onChange={(e) => updateRule(rt, i, thenKey as any, e.target.value)}
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button className="rounded-lg bg-red-500/80 hover:bg-red-500 px-2 py-1" onClick={() => removeRule(rt, i)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {arr.length === 0 && <div className="text-sm text-neutral-400">No rules yet.</div>}
                  </div>
                </div>
              );
            })}

            {/* Run Overrides (sessionStorage) */}
            <div className="p-3 rounded-xl bg-neutral-900/50 ring-1 ring-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Run overrides (session)</div>
                <div className="text-xs text-neutral-400">Not persisted to brand; survives refresh</div>
              </div>

              {/* Quick Add: Quota */}
              <RunQuotaQuickAdd
                onAdd={(rule) => applyRunOverrides([...runOverrides, rule])}
              />

              {/* List current overrides */}
              <div className="space-y-2">
                {runOverrides.length === 0 ? (
                  <div className="text-sm text-neutral-400">No overrides yet.</div>
                ) : (
                  runOverrides.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800">
                      <div className="text-xs text-neutral-300 truncate">
                        {summarizeRule(r)}
                      </div>
                      <button
                        className="text-xs rounded bg-red-500/80 hover:bg-red-500 px-2 py-1"
                        onClick={() => {
                          const next = runOverrides.slice();
                          next.splice(i, 1);
                          applyRunOverrides(next);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={() => applyRunOverrides(runOverrides)}>
                  Apply overrides
                </button>
                <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={clearRunOverrides}>
                  Clear overrides
                </button>
              </div>
            </div>

            {/* Wizard modal */}
            {wizOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-[680px] rounded-xl bg-neutral-900 ring-1 ring-neutral-800 p-4 space-y-3">
                  <div className="text-lg font-semibold">Add Rule (Wizard)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">Type</div>
                      <select
                        className="w-full bg-neutral-800 rounded-xl p-2"
                        value={wizType}
                        onChange={(e) => setWizType(e.target.value as any)}
                      >
                        <option value="disallow">Disallow</option>
                        <option value="allowOnly">AllowOnly</option>
                        <option value="mustInclude">MustInclude</option>
                        <option value="prefer">Prefer</option>
                        <option value="penalize">Penalize</option>
                        <option value="quota">Quota / Range</option>
                      </select>
                    </div>
                    {wizType !== "quota" ? (
                      <div className="md:col-span-2 text-xs text-neutral-400 flex items-end">IF</div>
                    ) : (
                      <div className="md:col-span-2 text-xs text-neutral-400 flex items-end">Quota config</div>
                    )}
                  </div>

                  {wizType !== "quota" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">IF: Field</div>
                        <select
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          value={wizIfField}
                          onChange={(e) => setWizIfField(e.target.value as Field)}
                        >
                          {fieldsAll().map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">IF: Operator</div>
                        <select
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          value={wizIfOp}
                          onChange={(e) => setWizIfOp(e.target.value as any)}
                        >
                          <option value="equals">equals</option>
                          <option value="oneOf">oneOf</option>
                          <option value="startsWith">startsWith</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">IF: Value(s)</div>
                        <input
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          placeholder={wizIfOp === "oneOf" ? "comma,separated,values" : "Value"}
                          value={wizIfValue}
                          onChange={(e) => setWizIfValue(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">Field</div>
                        <select
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          value={wizQuotaField}
                          onChange={(e) => setWizQuotaField(e.target.value as Field)}
                        >
                          {fieldsAll().map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">Scope</div>
                        <select
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          value={wizQuotaScope}
                          onChange={(e) => setWizQuotaScope(e.target.value as any)}
                        >
                          <option value="global">global</option>
                          <option value="perVertical">perVertical</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">oneOf (comma)</div>
                        <input
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          placeholder="Value A, Value B"
                          value={wizQuotaOneOf}
                          onChange={(e) => setWizQuotaOneOf(e.target.value)}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">min% / max%</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-full bg-neutral-800 rounded-xl p-2"
                            placeholder="min"
                            value={wizQuotaMinPct}
                            onChange={(e) => setWizQuotaMinPct(e.target.value)}
                          />
                          <input
                            type="number"
                            className="w-full bg-neutral-800 rounded-xl p-2"
                            placeholder="max"
                            value={wizQuotaMaxPct}
                            onChange={(e) => setWizQuotaMaxPct(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">maxShare / tol / minDistinct</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-neutral-800 rounded-xl p-2"
                            placeholder="share"
                            value={wizQuotaMaxShare}
                            onChange={(e) => setWizQuotaMaxShare(e.target.value)}
                          />
                          <input
                            type="number"
                            className="w-full bg-neutral-800 rounded-xl p-2"
                            placeholder="tol"
                            value={wizQuotaTolerance}
                            onChange={(e) => setWizQuotaTolerance(Number(e.target.value))}
                          />
                          <input
                            type="number"
                            className="w-full bg-neutral-800 rounded-xl p-2"
                            placeholder="minDistinct"
                            value={wizQuotaMinDistinct}
                            onChange={(e) => setWizQuotaMinDistinct(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-3 text-xs text-neutral-400">THEN</div>
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">THEN: Field</div>
                      <select
                        className="w-full bg-neutral-800 rounded-xl p-2"
                        value={wizThenField}
                        onChange={(e) => setWizThenField(e.target.value as Field)}
                      >
                        {fieldsAll().map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">THEN: Operator</div>
                      <select
                        className="w-full bg-neutral-800 rounded-xl p-2"
                        value={wizThenOp}
                        onChange={(e) => setWizThenOp(e.target.value as any)}
                      >
                        <option value="equals">equals</option>
                        <option value="oneOf">oneOf</option>
                        <option value="startsWith">startsWith</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400 mb-1">THEN: Value(s)</div>
                      <input
                        className="w-full bg-neutral-800 rounded-xl p-2"
                        placeholder={wizThenOp === "oneOf" ? "comma,separated,values" : "Value"}
                        value={wizThenValue}
                        onChange={(e) => setWizThenValue(e.target.value)}
                      />
                    </div>
                  </div>

                  {(wizType === "prefer" || wizType === "penalize") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">Weight (0..1)</div>
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          max={1}
                          className="w-full bg-neutral-800 rounded-xl p-2"
                          value={wizWeight}
                          onChange={(e) => setWizWeight(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm" onClick={() => setWizOpen(false)}>
                      Cancel
                    </button>
                    <button className="rounded-lg bg-indigo-600 px-3 py-2 hover:bg-indigo-500 text-sm text-white" onClick={addV2Rule}>
                      Add rule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "Weights & Flags" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["Pattern","Format","VisualStyle","Opening","Tone","Talent","CTA"] as const).map((k) => (
                <div key={k}>
                  <div className="text-xs text-neutral-400 mb-1">Impact: {k}</div>
                  <input
                    type="number"
                    step={0.05}
                    className="w-full bg-neutral-800 rounded-xl p-2"
                    value={(cfg.impactWeights as any)?.[k] ?? ""}
                    onChange={(e) =>
                      setCfg((prev) => ({
                        ...prev,
                        impactWeights: { ...(prev.impactWeights ?? {}), [k]: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!cfg.pipelineFlags?.enforceVOFirstSquareDisallow}
                  onChange={(e) =>
                    setCfg((prev) => ({
                      ...prev,
                      pipelineFlags: { ...(prev.pipelineFlags ?? {}), enforceVOFirstSquareDisallow: e.target.checked },
                    }))
                  }
                />
                <span className="text-sm">Pipeline: Disallow VOFirst × 1:1 square</span>
              </label>
            </div>
          </div>
        )}

        {tab === "Presets" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-3">
            <div className="text-sm text-neutral-300">You can reference preset files under docs/presets (discover/refine/scale) in brand config.</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["discover","refine","scale"] as const).map((k) => (
                <div key={k}>
                  <div className="text-xs text-neutral-400 mb-1">{k} preset path</div>
                  <input
                    className="w-full bg-neutral-800 rounded-xl p-2"
                    value={cfg.presets?.[k] ?? ""}
                    onChange={(e) => setCfg((prev) => ({ ...prev, presets: { ...(prev.presets ?? {}), [k]: e.target.value } }))}
                    placeholder="../presets/discover.json"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={() => loadPreset("discover")}>
                Load & Apply Discover
              </button>
              <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={() => loadPreset("refine")}>
                Load & Apply Refine
              </button>
              <button className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={() => loadPreset("scale")}>
                Load & Apply Scale
              </button>
            </div>
          </div>
        )}

        {tab === "Export" && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-3">
            <div className="text-sm text-neutral-300">Export / Import brand config JSON</div>
            <textarea className="w-full min-h-[220px] bg-neutral-800 rounded-xl p-3" readOnly value={exportJson} />
            <textarea
              className="w-full min-h-[140px] bg-neutral-800 rounded-xl p-3"
              placeholder="Paste JSON here to import (not saved automatically)"
              onChange={(e) => importJson(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            Tip: Save & Apply persists to docs/brands/{`{brandId}`}/config.json and updates the engine in real-time.
          </div>
          <div className="text-xs text-emerald-400">{message}</div>
        </div>
      </div>
    </div>
  );
}

function RunQuotaQuickAdd({ onAdd }: { onAdd: (rule: any) => void }) {
  const [field, setField] = useState<
    "Pattern" | "Format" | "VisualStyle" | "Opening" | "Tone" | "Talent" | "CTA" | "ProofDevice" | "Spec"
  >("Opening");
  const [scope, setScope] = useState<"global" | "perVertical">("global");
  const [oneOf, setOneOf] = useState<string>("");
  const [minPct, setMinPct] = useState<string>("");
  const [maxPct, setMaxPct] = useState<string>("");
  const [maxShare, setMaxShare] = useState<string>("");
  const [minDistinct, setMinDistinct] = useState<string>("");
  const [tolerance, setTolerance] = useState<number>(1);

  function add() {
    const rule: any = { type: "quota", field, scope, tolerance: Number.isFinite(tolerance) ? tolerance : 1 };
    const vals = oneOf
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (vals.length) rule.oneOf = vals;
    if (minPct !== "") rule.minPct = Number(minPct);
    if (maxPct !== "") rule.maxPct = Number(maxPct);
    if (maxShare !== "") rule.maxShare = Number(maxShare);
    if (scope === "perVertical" && minDistinct !== "") rule.perVerticalMinDistinct = Number(minDistinct);
    onAdd(rule);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
      <div>
        <div className="text-xs text-neutral-400 mb-1">Field</div>
        <select
          className="w-full bg-neutral-800 rounded-xl p-2"
          value={field}
          onChange={(e) => setField(e.target.value as any)}
        >
          {["Pattern","Format","VisualStyle","Opening","Tone","Talent","CTA","ProofDevice","Spec"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">Scope</div>
        <select
          className="w-full bg-neutral-800 rounded-xl p-2"
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
        >
          <option value="global">global</option>
          <option value="perVertical">perVertical</option>
        </select>
      </div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">oneOf (comma)</div>
        <input
          className="w-full bg-neutral-800 rounded-xl p-2"
          placeholder="Value A, Value B"
          value={oneOf}
          onChange={(e) => setOneOf(e.target.value)}
        />
      </div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">min% / max%</div>
        <div className="flex gap-2">
          <input
            type="number"
            className="w-full bg-neutral-800 rounded-xl p-2"
            placeholder="min"
            value={minPct}
            onChange={(e) => setMinPct(e.target.value)}
          />
          <input
            type="number"
            className="w-full bg-neutral-800 rounded-xl p-2"
            placeholder="max"
            value={maxPct}
            onChange={(e) => setMaxPct(e.target.value)}
          />
        </div>
      </div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">share / tol / minDistinct</div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            className="w-full bg-neutral-800 rounded-xl p-2"
            placeholder="share"
            value={maxShare}
            onChange={(e) => setMaxShare(e.target.value)}
          />
          <input
            type="number"
            className="w-full bg-neutral-800 rounded-xl p-2"
            placeholder="tol"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
          <input
            type="number"
            className="w-full bg-neutral-800 rounded-xl p-2"
            placeholder="minDistinct"
            value={minDistinct}
            onChange={(e) => setMinDistinct(e.target.value)}
          />
        </div>
      </div>
      <div className="flex">
        <button className="w-full rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700" onClick={add}>
          + Add quota override
        </button>
      </div>
    </div>
  );
}

function summarizeRule(r: any): string {
  if (!r || typeof r !== "object") return "Unknown rule";
  if (r.type === "quota") {
    const vals = (r.oneOf && r.oneOf.length ? r.oneOf : (r.value ? [r.value] : [])).join(", ");
    const parts = [
      `quota ${r.scope ?? "global"}`,
      r.field ? `field=${r.field}` : "",
      vals ? `oneOf=[${vals}]` : "",
      Number.isFinite(r.minPct) ? `min=${r.minPct}%` : "",
      Number.isFinite(r.maxPct) ? `max=${r.maxPct}%` : "",
      Number.isFinite(r.maxShare) ? `maxShare=${r.maxShare}` : "",
      Number.isFinite(r.perVerticalMinDistinct) ? `minDistinct=${r.perVerticalMinDistinct}` : "",
      Number.isFinite(r.tolerance) ? `tol=±${r.tolerance}` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  }
  if (r.type === "prefer" || r.type === "penalize") {
    return `${r.type} (w=${r.weight ?? 0})`;
  }
  if (r.type === "disallow" || r.type === "allowOnly" || r.type === "mustInclude") {
    return r.type;
  }
  return String(r.type ?? "rule");
}

function tryStringify(obj: any) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return String(obj ?? "");
  }
}
