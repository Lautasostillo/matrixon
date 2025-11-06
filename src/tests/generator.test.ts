/* If using vitest:
   npm i -D vitest @types/node
   add to package.json: "test": "vitest"
*/
import { describe, it, expect } from "vitest";
import { generateCombos, sliderToCount } from "../lib/logic";
import { PATTERNS, FORMATS, VISUAL_STYLES, OPENINGS, TONES, TALENTS, CTAS } from "../lib/config";

describe("generator", () => {
  const pools = { PATTERNS, FORMATS, VISUAL_STYLES, OPENINGS, TONES, TALENTS, CTAS };

  it("produces at least 3 different patterns when variety allows", () => {
    const rows = generateCombos({
      mainDim: "Pain Point",
      verticalValues: ["A"],
      distribution: "pareto",
      weights: [1],
      adsTotal: 6,
      variety: {
        Pattern: sliderToCount(3, PATTERNS.length),
        Format:  sliderToCount(2, FORMATS.length),
        VisualStyle: sliderToCount(2, VISUAL_STYLES.length),
        Opening: sliderToCount(2, OPENINGS.length),
        Tone: sliderToCount(2, TONES.length),
        Talent: sliderToCount(1, TALENTS.length),
        CTA: sliderToCount(1, CTAS.length),
      },
      pools,
      diversityTarget: 1.0,
    });
    const patterns = new Set(rows.map(r=>r.Pattern).filter(Boolean));
    expect(patterns.size).toBeGreaterThanOrEqual(3);
  });
});
