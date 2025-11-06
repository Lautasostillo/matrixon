# Variable Creative Diversity Matrix — Mockup (Stage 2)

A Next.js mockup to design structured creative tests:
- Pick one Main Dimension (vertical) per test (Target Persona, Pain Point, Messaging Angle, Core Insight, Product).
- Allocate ads/budget per vertical value (live preview of “ads: N”).
- Set variety per horizontal dimension (Format, Narrative Pattern, Visual Style, Opening Type, Tone/Emotion, Talent, CTA).
- Auto-generate valid combinations with compatibility rules, unique similarity key, and minimum diversity score D between consecutive ads per vertical value.
- Edit in place and Copy CSV (headers in ENGLISH).
- Format → Production Cluster mapping for cross-planning (UGC → ScriptShootEdit; Static/Anim → DANDA; Video → Airpost).

All UI, labels, CSV headers, and this README are in ENGLISH.

## Tech
- Next.js (App Router) + TypeScript + Tailwind (no extra libs).
- Single client component controlling the generator UI and CSV export.
- Pure generator logic in `src/lib/logic.ts` for testability.

## Run locally
```bash
cd creative-matrix
npm run dev
# open http://localhost:3000
```

## Tests (generator)
- Unit tests are placed in `src/tests/generator.test.ts` (Vitest).
- If you don’t have Vitest installed yet, run:
```bash
npm i -D vitest
npm pkg set scripts.test="vitest"
npm run test
```
Note: If you see an ENOSPC (no space left on device) error while installing dependencies, free some disk space and re-run the install.

## How to use
1) Choose the Main Dimension.
2) Edit vertical values and weights. The UI previews “ads: N” for each value based on the selected distribution.
3) Choose a Distribution model:
   - Pareto Split (weights) — live.
   - Even Split — prepared.
   - Stage-Weighted — prepared; activates when Main Dimension is “Messaging Angle” and values are Top/Mid/Bottom.
4) Adjust Variety sliders per horizontal dimension (0=off, 1=low, 2=medium, 3=high).
5) Set Diversity target (D). The generator enforces minimum D between consecutive ads per vertical value.
6) Click “Generate combinations”.
7) Edit suggestions inline. Changing Format updates Cluster automatically.
8) Click “Copy CSV” to copy data with ENGLISH headers.

## Acceptance Checklist (Stage 2)
- [x] All UI/labels/CSV/README in ENGLISH.
- [x] Select Main Dimension; edit vertical values & weights; preview “ads: N” per vertical value.
- [x] Distribution: Pareto live; Even & Stage-Weighted prepared (Stage works when Main=Messaging Angle and values are Top/Mid/Bottom).
- [x] Variety sliders (0–3) per horizontal dimension working.
- [x] Generator enforces compatibility, uniqueness (SIMILARITY_KEY), and min diversity D between consecutive ads per vertical value.
- [x] Editable table; “Copy CSV” exports with ENGLISH headers.
- [x] Format→Cluster mapping applied automatically.
- [x] Print auto-audit log on first page render (console).

## Files of interest
- `src/lib/config.ts` — catalogs (EN), rules, weights, mappings, constants.
- `src/lib/logic.ts` — distribution, compatibility, diversity score, generator.
- `components/CreativeMatrixMockup.tsx` — client component (UI + CSV).
- `app/page.tsx` — renders the mockup.
- `src/tests/generator.test.ts` — generator unit test (Vitest).

## Notes
- Main Dimensions: Target Persona, Pain Point, Messaging Angle, Core Insight, Product.
- Similarity Key: VerticalValue|Pattern|Format|VisualStyle.
- Default Diversity target: 2.2.
- Format → Cluster mapping:
  - UGC_* → ScriptShootEdit
  - Static_*/Anim_* → DANDA
  - Video_* → Airpost
