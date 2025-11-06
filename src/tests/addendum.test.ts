import { describe, it, expect } from "vitest";
import {
  generateCombos,
  sliderToCount,
  deriveCountsWithBudget,
} from "../lib/logic";
import {
  PATTERNS,
  FORMATS,
  VISUAL_STYLES,
  OPENINGS,
  TONES,
  TALENTS,
  CTAS,
} from "../lib/config";

describe("engine addendum", () => {
  it("is deterministic with a fixed seed", () => {
    const pools = { PATTERNS, FORMATS, VISUAL_STYLES, OPENINGS, TONES, TALENTS, CTAS };
    const params = {
      mainDim: "Pain Point",
      verticalValues: ["A", "B"],
      distribution: "pareto" as const,
      weights: [3, 2],
      adsTotal: 10,
      variety: {
        Pattern: sliderToCount(3, PATTERNS.length),
        Format: sliderToCount(2, FORMATS.length),
        VisualStyle: sliderToCount(2, VISUAL_STYLES.length),
        Opening: sliderToCount(2, OPENINGS.length),
        Tone: sliderToCount(1, TONES.length),
        Talent: sliderToCount(1, TALENTS.length),
        CTA: sliderToCount(1, CTAS.length),
      },
      pools,
      diversityTarget: 2.0,
      seed: 123,
    };
    const a = generateCombos(params);
    const b = generateCombos(params);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("emits budget warning when floor cannot support ≥3 variants per vertical", () => {
    const derived = deriveCountsWithBudget({
      totalBudget: 22000, // 11 variants budget
      targetCPA: 50,      // MSV = 50 * 40 = 2000
      minSpendFactor: 40,
      readDays: 10,
      verticalValues: ["A", "B", "C", "D"], // need 12 to hit floor (4*3)
      distribution: "even",
      weights: [1, 1, 1, 1],
      stageWeights: { A: 1, B: 1, C: 1, D: 1 },
    });
    const hasWarn = derived.warnings.some((w) =>
      /Insufficient budget for 3 variations per vertical/i.test(w)
    );
    expect(hasWarn).toBe(true);
  });

  it("respects ProofDevice × Format disallow rule (ScreenCapture ✖ Static_SP)", () => {
    const pools = {
      PATTERNS: [{ id: "ProblemSolution", name: "Problem → Solution" }],
      FORMATS: [
        { id: "Static_SP", name: "Static — Social Proof", cluster: "DANDA" as const },
        { id: "Video_PS", name: "Video — Problem/Solution", cluster: "Airpost" as const },
      ],
      VISUAL_STYLES: [{ id: "TalkingHead", name: "Talking Head" }],
      OPENINGS: [{ id: "VisualFirst", name: "Opening: Visual First" }],
      TONES: [],
      TALENTS: [],
      CTAS: [],
      PROOFS: [{ id: "ScreenCapture", name: "Proof: Screen Capture" }],
      SPECS: [],
    };
    const rows = generateCombos({
      mainDim: "Pain Point",
      verticalValues: ["A"],
      distribution: "even",
      weights: [1],
      adsTotal: 4,
      variety: {
        Pattern: 1,
        Format: 2, // could try to pick Static_SP, but should be filtered when Proof=ScreenCapture
        VisualStyle: 1,
        Opening: 1,
        Tone: 0,
        Talent: 0,
        CTA: 0,
        ProofDevice: 1, // always ScreenCapture
        Spec: 0,
      },
      pools,
      diversityTarget: 0.0,
      seed: 42,
    });
    // Ensure generator didn't output any row with Static_SP when Proof=ScreenCapture
    const bad = rows.some((r) => r.ProofDevice === "ScreenCapture" && r.Format === "Static_SP");
    expect(bad).toBe(false);
  });
});
