export const MAIN_DIMENSIONS = [
  "Target Persona", "Pain Point", "Messaging Angle", "Core Insight", "Product",
] as const;
export type MainDimension = typeof MAIN_DIMENSIONS[number];

export const DEFAULT_VERTICAL_VALUES: Record<string, string[]> = {
  "Target Persona": ["YoungMale", "BusyMom", "SilverFox"],
  "Pain Point": ["SafetyConcern", "TimeSaving", "CostSaving"],
  "Messaging Angle": ["Top", "Mid", "Bottom"],
  "Core Insight": ["Trust", "FOMO", "Hope"],
  "Product": ["FeatureA", "FeatureB", "FeatureC"],
};

export type Cluster = "ScriptShootEdit" | "DANDA" | "Airpost";
export interface FormatDef { id: string; name: string; cluster: Cluster; }
export const FORMATS: FormatDef[] = [
  { id: "UGC_3ReasonsWhy",  name: "UGC — 3 Reasons Why",   cluster: "ScriptShootEdit" },
  { id: "UGC_FlipTheScript",name: "UGC — Flip the Script", cluster: "ScriptShootEdit" },
  { id: "Static_SP",        name: "Static — Social Proof", cluster: "DANDA" },
  { id: "Static_MR",        name: "Static — Myth vs Reality", cluster: "DANDA" },
  { id: "Anim_List",        name: "Animated — Listicle",   cluster: "DANDA" },
  { id: "Video_PS",         name: "Video — Problem/Solution", cluster: "Airpost" },
];

export const PATTERNS = [
  { id: "ThreeReasonsWhy",  name: "3 Reasons Why" },
  { id: "FlipTheScript",    name: "Flip the Script" },
  { id: "ProblemSolution",  name: "Problem → Solution" },
  { id: "TestimonialStory", name: "Testimonial / Story" },
  { id: "MythVsReality",    name: "Myth vs Reality" },
  { id: "FAQObjections",    name: "FAQ / Objections" },
  { id: "BeforeAfter",      name: "Before / After" },
  { id: "Comparison",       name: "Comparison" },
];

export const VISUAL_STYLES = [
  { id: "TalkingHead", name: "Talking Head" },
  { id: "Lifestyle",   name: "Lifestyle" },
  { id: "MacroProduct",name: "Macro Product" },
  { id: "ScreenCap",   name: "Screen Capture" },
  { id: "PackKinetic", name: "Pack + Kinetic Type" },
];

export const OPENINGS = [
  { id: "VisualFirst",   name: "Opening: Visual First" },
  { id: "CopyFirst",     name: "Opening: Copy First" },
  { id: "VOFirst",       name: "Opening: VO First" },
  { id: "SFXFirst",      name: "Opening: SFX First" },
  { id: "LocationFirst", name: "Opening: Location First" },
  { id: "AppHUD",        name: "Opening: App / HUD" },
];

export const TONES = [
  { id: "Rational",  name: "Tone: Rational" },
  { id: "Emotional", name: "Tone: Emotional" },
  { id: "Urgent",    name: "Tone: Urgent" },
  { id: "Humorous",  name: "Tone: Humorous" },
  { id: "Hope",      name: "Emotion: Hope" },
  { id: "FOMO",      name: "Emotion: FOMO" },
  { id: "Trust",     name: "Emotion: Trust" },
];

export const TALENTS = [
  { id: "T1", name: "Talent 1" }, { id: "T2", name: "Talent 2" }, { id: "T3", name: "Talent 3" },
];

export const CTAS = [
  { id: "ShopNow", name: "CTA: Shop Now" },
  { id: "LearnMore", name: "CTA: Learn More" },
  { id: "GetStarted", name: "CTA: Get Started" },
  { id: "ClaimOffer", name: "CTA: Claim Offer" },
];

export const PROOFS = [
  { id: "Receipts",       name: "Proof: Receipts" },
  { id: "MetricsOverlay", name: "Proof: Metrics Overlay" },
  { id: "UGCMontage",     name: "Proof: UGC Montage" },
  { id: "ScreenCapture",  name: "Proof: Screen Capture" },
  { id: "Unboxing",       name: "Proof: Unboxing" },
  { id: "SideBySide",     name: "Proof: Side-by-Side" },
];

export const SPECS = [
  { id: "9:16", name: "Spec: 9:16" },
  { id: "1:1",  name: "Spec: 1:1" },
  { id: "4:5",  name: "Spec: 4:5" },
];

export const IMPACT_WEIGHTS = {
  Pattern: 0.9, Format: 0.85, VisualStyle: 0.7, Opening: 0.6, Tone: 0.6, Talent: 0.4, CTA: 0.2,
} as const;

export const COMPAT_RULES = {
  disallow: [
    { when: { Opening: "VOFirst" }, thenNot: { Format: ["Static_SP","Static_MR"] } },
    { when: { Opening: "AppHUD" },  thenNot: { VisualStyle: ["MacroProduct"] } },
    { when: { ProofDevice: "ScreenCapture" }, thenNot: { Format: ["Static_SP","Static_MR"] } },
  ],
  allowOnly: [
    { when: { Pattern: "TestimonialStory" }, thenOnly: { Format: ["UGC_3ReasonsWhy","UGC_FlipTheScript","Video_PS"] } },
  ],
};

export const SIMILARITY_KEY = ["VerticalValue","Pattern","Format","VisualStyle"] as const;
export const DIVERSITY_TARGET_DEFAULT = 2.2;

export const PIPELINE_FLAGS = {
  // If true, disallow VOFirst with 1:1 square spec (pipeline constraint)
  enforceVOFirstSquareDisallow: false,
} as const;
