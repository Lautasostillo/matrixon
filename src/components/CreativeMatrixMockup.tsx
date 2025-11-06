'use client'
import React, { useMemo, useState, useEffect } from "react";
import {
  MAIN_DIMENSIONS,
  DEFAULT_VERTICAL_VALUES,
  FORMATS,
  PATTERNS,
  VISUAL_STYLES,
  OPENINGS,
  TONES,
  TALENTS,
  CTAS,
  PROOFS,
  SPECS,
  IMPACT_WEIGHTS,
} from "@/lib/config";
import { generateCombos, sliderToCount, deriveCountsWithBudget, rowsToCsv, splitRails } from "@/lib/logic";
import { useBrand } from "@/lib/store";
import Link from "next/link";

export default function CreativeMatrixMockup() {
  const { activeBrandId, loadBrand, config } = useBrand() as any;
  const [mainDim, setMainDim] = useState<string>("Pain Point");
  const [verticalValues, setVerticalValues] = useState<string[]>(
    DEFAULT_VERTICAL_VALUES["Pain Point"]
  );
  const [weights, setWeights] = useState<number[]>([5, 3, 2]);
  const [adsTotal, setAdsTotal] = useState<number>(12);
  const [diversityTarget, setDiversityTarget] = useState<number>(2.2);
  const [distribution, setDistribution] =
    useState<"pareto" | "even" | "stage">("pareto");
  const [stageTop, setStageTop] = useState<number>(3);
  const [stageMid, setStageMid] = useState<number>(2);
  const [stageBot, setStageBot] = useState<number>(3);

  // Variety sliders (0–3)
  const [varPattern, setVarPattern] = useState(2);
  const [varFormat, setVarFormat] = useState(2);
  const [varVisual, setVarVisual] = useState(2);
  const [varOpening, setVarOpening] = useState(2);
  const [varTone, setVarTone] = useState(2);
  const [varTalent, setVarTalent] = useState(1);
  const [varCTA, setVarCTA] = useState(1);

  const [varProof, setVarProof] = useState(1);
  const [varSpec, setVarSpec] = useState(1);

  const [totalBudget, setTotalBudget] = useState<number>(80000);
  const [targetCPA, setTargetCPA] = useState<number>(50);
  const [minSpendFactor, setMinSpendFactor] = useState<number>(40);
  const [readDays, setReadDays] = useState<number>(10);
  const [dailyBudget, setDailyBudget] = useState<number>(0);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [learnRatio, setLearnRatio] = useState<number>(0.7);
  const [maxHeroes, setMaxHeroes] = useState<number>(2);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [lastMsv, setLastMsv] = useState<number | undefined>(undefined);

  const [rows, setRows] = useState<any[]>([]);
  const [rulesActive, setRulesActive] = useState<{ global: number; brand: number; run: number }>({
    global: 0,
    brand: 0,
    run: 0,
  });
  useEffect(() => {
    function onRulesActive(e: Event) {
      const d = (e as CustomEvent).detail as any;
      if (d && typeof d === "object") setRulesActive({ global: d.global ?? 0, brand: d.brand ?? 0, run: d.run ?? 0 });
    }
    window.addEventListener("rules:active", onRulesActive as any);
    return () => window.removeEventListener("rules:active", onRulesActive as any);
  }, []);
  
  // Autofix / infeasibility modal state
  const [fixOpen, setFixOpen] = useState(false);
  const [fixSummary, setFixSummary] = useState<any>(null);

  function lowerD() {
    setDiversityTarget((d) => Math.max(0, Number((d - 0.2).toFixed(2))));
    setTimeout(() => generate(), 0);
  }
  function raiseVarAuto() {
    const candidates = [
      { key: "Pattern", val: varPattern, set: setVarPattern, max: activePools.PATTERNS.length, w: (IMPACT_WEIGHTS as any)?.Pattern ?? 1 },
      { key: "Format", val: varFormat, set: setVarFormat, max: activePools.FORMATS.length, w: (IMPACT_WEIGHTS as any)?.Format ?? 1 },
      { key: "VisualStyle", val: varVisual, set: setVarVisual, max: activePools.VISUAL_STYLES.length, w: (IMPACT_WEIGHTS as any)?.VisualStyle ?? 1 },
      { key: "Opening", val: varOpening, set: setVarOpening, max: activePools.OPENINGS.length, w: (IMPACT_WEIGHTS as any)?.Opening ?? 1 },
      { key: "Tone", val: varTone, set: setVarTone, max: activePools.TONES.length, w: (IMPACT_WEIGHTS as any)?.Tone ?? 1 },
      { key: "Talent", val: varTalent, set: setVarTalent, max: activePools.TALENTS.length, w: (IMPACT_WEIGHTS as any)?.Talent ?? 1 },
      { key: "CTA", val: varCTA, set: setVarCTA, max: activePools.CTAS.length, w: (IMPACT_WEIGHTS as any)?.CTA ?? 1 },
    ];
    const viable = candidates
      .filter((c) => c.max > 0 && c.val < 3 && sliderToCount(c.val, c.max) < c.max)
      .sort((a, b) => b.w - a.w);
    if (viable.length) {
      const c = viable[0];
      (c.set as any)(Math.min(3, c.val + 1));
      setTimeout(() => generate(), 0);
    } else {
      alert("No higher variety available to increase automatically.");
    }
  }
  function clearRunOverrides() {
    try {
      window.dispatchEvent(new CustomEvent("rules:clear-run"));
      setTimeout(() => generate(), 0);
    } catch {}
  }
  function relaxSoft() {
    try {
      window.dispatchEvent(new CustomEvent("rules:relax-soft"));
      setTimeout(() => generate(), 0);
    } catch {}
  }
  function ignoreQuota() {
    try {
      const payload =
        fixSummary && fixSummary.field
          ? [{ field: String(fixSummary.field), values: Array.isArray(fixSummary.values) ? fixSummary.values : undefined }]
          : [];
      window.dispatchEvent(new CustomEvent("rules:disable-quotas", { detail: payload }));
      setTimeout(() => generate(), 0);
    } catch {}
  }
  function resetSoft() {
    try {
      window.dispatchEvent(new CustomEvent("rules:reset-soft"));
      setTimeout(() => generate(), 0);
    } catch {}
  }
  function clearIgnoredQuotas() {
    try {
      window.dispatchEvent(new CustomEvent("rules:clear-disabled-quotas"));
      setTimeout(() => generate(), 0);
    } catch {}
  }

  // Auto-load DEMO brand once on startup so the engine has sensible defaults
  useEffect(() => {
    if (!activeBrandId && !config) {
      loadBrand("acme-demo").catch(() => {});
    }
  }, [activeBrandId, config, loadBrand]);

  // Auto-audit on first render
  useEffect(() => {
    const checklist = [
      "[ ] All UI/labels/CSV/README in ENGLISH",
      "[ ] Select Main Dimension; edit vertical values & weights; preview 'ads: N' per vertical value",
      "[ ] Distribution: Pareto live; Even & Stage-Weighted prepared (Stage works with Messaging Angle: Top/Mid/Bottom)",
      "[ ] Variety sliders (0–3) per horizontal dimension working",
      "[ ] Generator enforces compatibility, uniqueness (SIMILARITY_KEY), and min diversity D",
      "[ ] Editable table; 'Copy CSV' exports with ENGLISH headers",
      "[ ] Format→Cluster mapping applied automatically",
      "[ ] Print auto-audit log on first page render (console)",
    ];
    console.log("[AUTO-AUDIT] Acceptance checklist (initial):");
    checklist.forEach((c) => console.log(" -", c));
  }, []);
  
  // Sync builder from active brand config (vertical values and weights)
  useEffect(() => {
    if (!config) return;
    const md = (config as any).mainDimension || "Pain Point";
    const vv = (config as any).verticalValues;
    if (vv && typeof vv === "object" && !Array.isArray(vv)) {
      const keys = Object.keys(vv);
      if (keys.length) {
        setMainDim(md);
        setVerticalValues(keys);
        setWeights(keys.map((k) => Number((vv as any)[k]) || 1));
      }
    }
  }, [config]);

  // Build pools from brand config if present; otherwise defaults
  const activePools = useMemo(() => {
    const p = (config as any)?.pools || {};

    type Def = { id: string; name: string; cluster?: string };
    const build = (defs: Def[], brandArr: any[] | undefined): Def[] => {
      if (!brandArr || brandArr.length === 0) return defs;

      // Maps for fast match
      const byId = new Map(defs.map((d) => [d.id, d]));
      const byName = new Map(defs.map((d) => [d.name, d]));

      const out: Def[] = [];
      for (const it of brandArr) {
        if (typeof it === "string") {
          // Try exact name/id match with defaults
          const d = byName.get(it) || byId.get(it);
          if (d) out.push(d);
          else {
            // Accept custom string item
            const id = it.replace(/[^A-Za-z0-9]+/g, "_");
            out.push({ id, name: it });
          }
        } else if (it && typeof it === "object") {
          const id = it.id ?? it.name;
          const name = it.name ?? it.id ?? "Custom";
          const d = (id && (byId.get(id) || byName.get(id))) || byName.get(name);
          if (d) out.push(d);
          else out.push({ id: String(id).replace(/[^A-Za-z0-9]+/g, "_"), name, cluster: it.cluster });
        }
      }
      // If everything failed to match and we built nothing, fall back to defs
      return out.length ? out : defs;
    };

    return {
      PATTERNS: build(PATTERNS, p.PATTERNS),
      FORMATS: build(FORMATS, p.FORMATS),
      VISUAL_STYLES: build(VISUAL_STYLES, p.VISUAL_STYLES),
      OPENINGS: build(OPENINGS, p.OPENINGS),
      TONES: build(TONES, p.TONES),
      TALENTS: build(TALENTS, p.TALENTS),
      CTAS: build(CTAS, p.CTAS),
      PROOFS: build(PROOFS, p.PROOFS),
      SPECS: build(SPECS, p.SPECS),
    };
  }, [config]);

  // Sync global defaults (budget knobs) from brand config.globals
  useEffect(() => {
    const g = (config as any)?.globals;
    if (!g) return;
    if (typeof g.defaultTargetCPA === "number") setTargetCPA(g.defaultTargetCPA);
    if (typeof g.defaultMinSpendFactor === "number") setMinSpendFactor(g.defaultMinSpendFactor);
    if (typeof g.defaultReadDays === "number") setReadDays(g.defaultReadDays);
  }, [config]);
  
  function onChangeMainDim(next: string) {
    setMainDim(next);
    let def: string[] = DEFAULT_VERTICAL_VALUES[next] || ["A", "B", "C"];
    if (config?.mainDimension === next && config?.verticalValues) {
      const keys = Object.keys(config.verticalValues);
      if (keys.length) def = keys;
    }
    setVerticalValues(def);
    setWeights(Array(def.length).fill(1));
    if (next !== "Messaging Angle" && distribution === "stage")
      setDistribution("pareto");
  }
  function updateVerticalValue(i: number, v: string) {
    const next = [...verticalValues];
    next[i] = v;
    setVerticalValues(next);
  }
  function addVerticalValue() {
    setVerticalValues([...verticalValues, `V${verticalValues.length + 1}`]);
    setWeights([...weights, 1]);
  }
  function removeVerticalValue(i: number) {
    setVerticalValues(verticalValues.filter((_, idx) => idx !== i));
    setWeights(weights.filter((_, idx) => idx !== i));
  }
  function updateWeight(i: number, w: number) {
    const next = [...weights];
    next[i] = w;
    setWeights(next);
  }

  const countsPreview = useMemo(() => {
    const stageWeights = {
      Top: stageTop,
      Mid: stageMid,
      Bottom: stageBot,
    } as Record<string, number>;
    // If brand has a mainDimension suggestion, keep UI in sync on first run
    // (do not override user choice once set)
    if (config?.mainDimension && mainDim !== config.mainDimension) {
      // no-op auto-sync to avoid surprising changes; you can enable this if desired:
      // setMainDim(applied.mainDimension);
    }
    const args = {
      totalBudget,
      targetCPA,
      minSpendFactor,
      readDays,
      dailyBudget,
      verticalValues,
      distribution,
      weights,
      stageWeights,
    };
    const derived = deriveCountsWithBudget(args);
    return derived.counts;
  }, [
    totalBudget,
    targetCPA,
    minSpendFactor,
    readDays,
    dailyBudget,
    distribution,
    weights,
    verticalValues,
    stageTop,
    stageMid,
    stageBot,
    mainDim,
  ]);

  function generate() {
    const pools = activePools;
    const variety = {
      Pattern: sliderToCount(varPattern, activePools.PATTERNS.length),
      Format: sliderToCount(varFormat, activePools.FORMATS.length),
      VisualStyle: sliderToCount(varVisual, activePools.VISUAL_STYLES.length),
      Opening: sliderToCount(varOpening, activePools.OPENINGS.length),
      Tone: sliderToCount(varTone, activePools.TONES.length),
      Talent: sliderToCount(varTalent, activePools.TALENTS.length),
      CTA: sliderToCount(varCTA, activePools.CTAS.length),
      ProofDevice: sliderToCount(varProof, activePools.PROOFS.length),
      Spec: sliderToCount(varSpec, activePools.SPECS.length),
    };
    const stageWeights = {
      Top: stageTop,
      Mid: stageMid,
      Bottom: stageBot,
    } as Record<string, number>;

    const derived = deriveCountsWithBudget({
      totalBudget,
      targetCPA,
      minSpendFactor,
      readDays,
      dailyBudget,
      verticalValues,
      distribution,
      weights,
      stageWeights,
    });
    setWarnings(derived.warnings);
    setDropped(derived.droppedVerticals);
    setLastMsv(derived.minSpendPerVariant);

    const usedVerticals = derived.usedVerticals;
    const weightMap = new Map<string, number>();
    verticalValues.forEach((v, i) => weightMap.set(v, weights[i] ?? 1));
    const weightsFiltered = usedVerticals.map((v) => weightMap.get(v) ?? 1);

    const stageMapFiltered: Record<string, number> = {
      Top: stageTop,
      Mid: stageMid,
      Bottom: stageBot,
    };
    const stageWeightsUsed: Record<string, number> = {};
    usedVerticals.forEach((v) => {
      stageWeightsUsed[v] = stageMapFiltered[v] ?? 1;
    });

    const lockedRows = rows.filter((r) => r.Locked);
    const remainingTotal = Math.max(0, derived.adsTotal - lockedRows.length);

    const { learn, scale } = splitRails(remainingTotal, learnRatio);

    const learnRows = generateCombos({
      mainDim,
      verticalValues: usedVerticals,
      distribution,
      weights: weightsFiltered,
      stageWeights: stageWeightsUsed,
      adsTotal: learn,
      variety,
      diversityTarget,
      pools,
      seed: seed,
      rail: "Learn",
    });
    const scaleRows = generateCombos({
      mainDim,
      verticalValues: usedVerticals,
      distribution,
      weights: weightsFiltered,
      stageWeights: stageWeightsUsed,
      adsTotal: scale,
      variety,
      diversityTarget,
      pools,
      seed: seed !== undefined ? seed + 1 : undefined,
      rail: "Scale",
    });
    const result = [...lockedRows, ...learnRows, ...scaleRows];

    // Hero cap warnings
    const heroCapWarnings: string[] = [];
    const heroCounts: Record<string, number> = {};
    result.forEach((r) => {
      if (r.Hero) heroCounts[r.VerticalValue] = (heroCounts[r.VerticalValue] || 0) + 1;
    });
    Object.entries(heroCounts).forEach(([vv, count]) => {
      if (count > maxHeroes) heroCapWarnings.push(`Hero cap exceeded in ${vv}: ${count} > ${maxHeroes}`);
    });

    setWarnings([...derived.warnings, ...heroCapWarnings]);
    setRows(result);

    // Detect infeasibility hints (quota needs or related)
    try {
      const needs = result
        .map((r) => (r as any).__trace?.quotaNeed)
        .filter(Boolean);
      if (needs.length) {
        setFixSummary(needs[0]);
        setFixOpen(true);
      } else {
        setFixOpen(false);
        setFixSummary(null);
      }
    } catch {}

    // quick validations
    const byVertical: Record<string, any[]> = {};
    result.forEach((r) => {
      byVertical[r.VerticalValue] ||= [];
      byVertical[r.VerticalValue].push(r);
    });
    const uniqueOK = Object.values(byVertical).every((arr) => {
      const set = new Set(
        arr.map((r: any) => `${r.VerticalValue}|${r.Pattern}|${r.Format}|${r.VisualStyle}`)
      );
      return set.size === arr.length;
    });

    const diversityOK = Object.values(byVertical).every((arr) => {
      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1];
        const cur = arr[i];
        const diff =
          (prev.Pattern !== cur.Pattern ? 1 : 0) +
          (prev.Format !== cur.Format ? 1 : 0) +
          (prev.VisualStyle !== cur.VisualStyle ? 1 : 0);
        if (diff === 0) return false;
      }
      return true;
    });

    console.log(
      "[AUTO-AUDIT] rows:",
      result.length,
      "distribution:",
      distribution,
      "D-target:",
      diversityTarget,
      "| unique(similarity-key) per vertical:",
      uniqueOK,
      "| basic diversity check:",
      diversityOK,
      "| warnings:",
      derived.warnings
    );
  }

  function updateRow(idx: number, field: string, value: any) {
    const next = [...rows];
    // If Format changes, infer Cluster from active brand pools
    if (field === "Format") {
      const f = activePools.FORMATS.find((x) => x.id === value);
      next[idx]["Cluster"] = f ? f.cluster : null;
    }
    next[idx][field] = value;
    setRows(next);
  }
  function copyCSV() {
    const csv = rowsToCsv(rows, {
      budgetPerVariant: lastMsv,
      minSpend: lastMsv,
    });
    navigator.clipboard.writeText(csv);
    alert("CSV copied to clipboard");
  }

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">1) Main Dimension</h2>
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <span>Brand: {activeBrandId ?? "—"}</span>
                <button
                  onClick={() => loadBrand("acme-demo")}
                  className="rounded-lg bg-neutral-800 px-2 py-1 hover:bg-neutral-700"
                >
                  Load sample
                </button>
                <Link
                  href="/panel"
                  className="rounded-lg bg-indigo-600 px-2 py-1 hover:bg-indigo-500 text-white"
                >
                  Open Config Panel
                </Link>
              </div>
            </div>
            <select
              className="w-full bg-neutral-800 rounded-xl p-3"
              value={mainDim}
              onChange={(e) => onChangeMainDim(e.target.value)}
            >
              {MAIN_DIMENSIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800">
            <h2 className="text-xl font-semibold mb-4">
              2) Vertical values & weights
            </h2>
            <div className="space-y-3">
              {verticalValues.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-6 bg-neutral-800 rounded-xl p-2"
                    value={v}
                    onChange={(e) => updateVerticalValue(i, e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-3 bg-neutral-800 rounded-xl p-2"
                    value={weights[i] ?? 1}
                    onChange={(e) => updateWeight(i, Number(e.target.value))}
                    min={0}
                  />
                  <div className="col-span-2 text-sm text-neutral-300">
                    ads: {countsPreview[i] ?? 0}
                  </div>
                  <button
                    className="col-span-1 text-red-400 hover:text-red-300"
                    onClick={() => removeVerticalValue(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addVerticalValue}
                className="w-full rounded-xl bg-neutral-800 py-2 hover:bg-neutral-700"
              >
                + Add value
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 items-center">
              <label className="text-sm text-neutral-300">Total Budget</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Target CPA</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={targetCPA}
                onChange={(e) => setTargetCPA(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Min Spend Factor</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={minSpendFactor}
                onChange={(e) => setMinSpendFactor(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Read Days</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={readDays}
                onChange={(e) => setReadDays(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Daily Budget (optional)</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Deterministic Seed (optional)</label>
              <input
                type="number"
                className="bg-neutral-800 rounded-xl p-2"
                value={seed ?? ""}
                onChange={(e) => setSeed(e.target.value === "" ? undefined : Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Learn/Scale Split</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                className="bg-neutral-800 rounded-xl p-2"
                value={learnRatio}
                onChange={(e) => setLearnRatio(Number(e.target.value))}
              />
              <label className="text-sm text-neutral-300">Max heroes/vertical</label>
              <input
                type="number"
                min={0}
                className="bg-neutral-800 rounded-xl p-2"
                value={maxHeroes}
                onChange={(e) => setMaxHeroes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800 space-y-3">
            <h2 className="text-xl font-semibold">3) Distribution & Variety</h2>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-sm text-neutral-300">Distribution model</label>
              <select
                className="bg-neutral-800 rounded-xl p-2"
                value={distribution}
                onChange={(e) => setDistribution(e.target.value as any)}
              >
                <option value="pareto">Pareto Split (weights)</option>
                <option value="even">Even Split</option>
                <option value="stage">Stage-Weighted (Top/Mid/Bottom)</option>
              </select>
            </div>
            {distribution === "stage" && mainDim === "Messaging Angle" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs mb-1">Weight: Top</div>
                  <input
                    type="number"
                    className="w-full bg-neutral-800 rounded-xl p-2"
                    value={stageTop}
                    onChange={(e) => setStageTop(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="text-xs mb-1">Weight: Mid</div>
                  <input
                    type="number"
                    className="w-full bg-neutral-800 rounded-xl p-2"
                    value={stageMid}
                    onChange={(e) => setStageMid(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="text-xs mb-1">Weight: Bottom</div>
                  <input
                    type="number"
                    className="w-full bg-neutral-800 rounded-xl p-2"
                    value={stageBot}
                    onChange={(e) => setStageBot(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-neutral-400">
              Variety sliders: 0=off, 1=low, 2=medium, 3=high
            </p>
            {[
              { label: "Narrative Pattern", val: varPattern, set: setVarPattern },
              { label: "Format", val: varFormat, set: setVarFormat },
              { label: "Visual Style", val: varVisual, set: setVarVisual },
              { label: "Opening Type", val: varOpening, set: setVarOpening },
              { label: "Tone/Emotion", val: varTone, set: setVarTone },
              { label: "Talent", val: varTalent, set: setVarTalent },
              { label: "CTA", val: varCTA, set: setVarCTA },
              { label: "Proof Device", val: varProof, set: setVarProof },
              { label: "Spec", val: varSpec, set: setVarSpec },
            ].map((r) => (
              <div key={r.label} className="grid grid-cols-3 gap-3 items-center">
                <div className="col-span-2 text-sm">{r.label}</div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  value={r.val}
                  onChange={(e) => r.set(Number(e.target.value))}
                />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="col-span-2 text-sm">Diversity target (D)</div>
              <input
                type="number"
                step={0.1}
                className="bg-neutral-800 rounded-xl p-2"
                value={diversityTarget}
                onChange={(e) => setDiversityTarget(Number(e.target.value))}
              />
            </div>
            <button
              onClick={generate}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-2 hover:bg-indigo-500 font-medium"
            >
              Generate combinations
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/60 ring-1 ring-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">4) Suggestions / Edit</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800">
                Rules: G {rulesActive.global} · B {rulesActive.brand} · R {rulesActive.run}
              </span>
              <button
                onClick={copyCSV}
                className="rounded-xl bg-neutral-800 px-3 py-2 hover:bg-neutral-700"
              >
                Copy CSV
              </button>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="text-neutral-400 text-sm">
              Generate combinations to see results…
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr className="text-neutral-300">
                    <th className="text-left p-2">Main</th>
                    <th className="text-left p-2">Vertical Value</th>
                    <th className="text-left p-2">Pattern</th>
                    <th className="text-left p-2">Format</th>
                    <th className="text-left p-2">Visual</th>
                    <th className="text-left p-2">Opening</th>
                    <th className="text-left p-2">Tone</th>
                    <th className="text-left p-2">Talent</th>
                    <th className="text-left p-2">CTA</th>
                    <th className="text-left p-2">Proof</th>
                    <th className="text-left p-2">Spec</th>
                    <th className="text-left p-2">Cluster</th>
                    <th className="text-left p-2">Lock</th>
                    <th className="text-left p-2">Hero</th>
                    <th className="text-left p-2">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t border-neutral-800">
                      <td className="p-2 whitespace-nowrap">
                        {r.MainDimension}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {r.VerticalValue}
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Pattern || ""}
                          onChange={(e) => updateRow(idx, "Pattern", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.PATTERNS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Format || ""}
                          onChange={(e) => updateRow(idx, "Format", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.FORMATS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.VisualStyle || ""}
                          onChange={(e) => updateRow(idx, "VisualStyle", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.VISUAL_STYLES.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Opening || ""}
                          onChange={(e) => updateRow(idx, "Opening", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.OPENINGS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Tone || ""}
                          onChange={(e) => updateRow(idx, "Tone", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.TONES.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Talent || ""}
                          onChange={(e) => updateRow(idx, "Talent", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.TALENTS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.CTA || ""}
                          onChange={(e) => updateRow(idx, "CTA", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.CTAS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.ProofDevice || ""}
                          onChange={(e) => updateRow(idx, "ProofDevice", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.PROOFS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className="bg-neutral-800 rounded-lg p-1"
                          value={r.Spec || ""}
                          onChange={(e) => updateRow(idx, "Spec", e.target.value)}
                        >
                          <option value="">—</option>
                          {activePools.SPECS.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {r.Cluster || "—"}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!r.Locked}
                          onChange={(e) => updateRow(idx, "Locked", e.target.checked)}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!r.Hero}
                          onChange={(e) => updateRow(idx, "Hero", e.target.checked)}
                        />
                      </td>
                      <td className="p-2">
                        <button
                          className="text-xs rounded bg-neutral-800 px-2 py-1 hover:bg-neutral-700"
                          onClick={() => {
                            const t = (r as any).__trace;
                            try {
                              const msg = JSON.stringify(
                                {
                                  rulesHit: t?.rulesHit ?? [],
                                  diversityDelta: t?.diversityDelta ?? 0,
                                  simKey: t?.simKey ?? "",
                                  quota: t?.quota ?? null,
                                },
                                null,
                                2
                              );
                              alert(msg);
                            } catch {
                              alert("No trace available for this row.");
                            }
                          }}
                        >
                          ℹ︎
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-xs text-neutral-400">
            Notes: unique key Vertical|Pattern|Format|Visual; min diversity target D={diversityTarget} between consecutive ads.
          </div>
          {warnings.length > 0 && (
            <div className="mt-2 text-xs text-yellow-400">
              Warnings:
              <ul className="list-disc ml-5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              {dropped.length > 0 && (
                <div className="mt-1">Dropped verticals: {dropped.join(", ")}</div>
              )}
            </div>
          )}

          {/* Infeasibility / Autofix modal */}
          {fixOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-[520px] rounded-xl bg-neutral-900 ring-1 ring-neutral-800 p-4 space-y-3">
                <div className="text-lg font-semibold">Set looks infeasible</div>
                <div className="text-sm text-neutral-300">
                  {fixSummary?.minRequired !== undefined ? (
                    <div>
                      Needs at least {fixSummary.minRequired} items of [{(fixSummary.values || []).join(", ")}] in scope {fixSummary.scope} but current is {fixSummary.current}.
                    </div>
                  ) : fixSummary?.perVerticalMinDistinct ? (
                    <div>
                      Needs ≥{fixSummary.perVerticalMinDistinct} distinct values of {String(fixSummary.field)} per vertical; current distinct is {fixSummary.currentDistinct}.
                    </div>
                  ) : (
                    <div>Some quotas/diversity constraints could not be satisfied with current pools/variety.</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={lowerD}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Autofix: Lower D -0.2
                  </button>
                  <button
                    onClick={raiseVarAuto}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Autofix: Raise Variety (auto)
                  </button>
                  <button
                    onClick={relaxSoft}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Relax soft (-20%)
                  </button>
                  <button
                    onClick={ignoreQuota}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Ignore quota
                  </button>
                  <button
                    onClick={clearRunOverrides}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Clear Run Overrides
                  </button>
                  <button
                    onClick={resetSoft}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Reset soft scale
                  </button>
                  <button
                    onClick={clearIgnoredQuotas}
                    className="rounded-lg bg-neutral-800 px-3 py-2 hover:bg-neutral-700 text-sm"
                  >
                    Clear ignored quotas
                  </button>
                  <button
                    onClick={() => setFixOpen(false)}
                    className="rounded-lg bg-indigo-600 px-3 py-2 hover:bg-indigo-500 text-sm text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
