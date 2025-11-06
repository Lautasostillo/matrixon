# Andromeda in The Ready Set Way — Deck Summary (EN)

Status: Summary based on provided context and screenshots. Full deck access not available. 
TODO: Replace inferred points with authoritative quotes/citations once the deck is accessible.

## Executive Summary
- Meta’s ads delivery evolved from a simpler retrieval + ranking pipeline to a far more powerful, hierarchical retrieval system (“Andromeda”-era).
- Creative diversity matters more: unique ads expand reach and qualify to even enter the auction; overly similar ads cluster and limit reach.
- The “Human Algorithm” idea: when retrieval starts working (creative quality and variety are sufficient), human feedback loops (engagement, conversions) reinforce the scoring model, improving delivery.
- Strategic implication: plan creative tests that balance vertical learning (what we test) with horizontal variety (how we present it), to both pass retrieval and learn efficiently.

## Before Andromeda (from screenshots/context)
- Retrieval often relied on linear matching with limited processing power.
- One model analyzed Ads and another Users; the matching could be brittle.
- Manual segmentation was more necessary; a single strong ad could dominate delivery (less robust portfolio).
- Then the ecosystem changed: more ads, less user info (e.g., iOS14); the system needed smarter retrieval.

## Andromeda Era — What Changed
- One large deep-learning model organizes and processes ads hierarchically for retrieval.
- Significantly higher processing capacity (10,000× was mentioned in the slides), enabling broader and smarter matching.
- Reduced need for manual segmentation; better use of Meta’s own user data.
- Creative diversity is now critical: similar ads cluster, unique ads expand reach.
- Ads must “pass retrieval” to even enter the auction (ranking + final scoring + auction still follow).

## Implications for Creative Strategy
1) Pass Retrieval:
   - Increase diversity across multiple creative axes—format, narrative pattern, visual style, opening type, tone/emotion, talent, CTA.
   - Avoid near-duplicates; push for meaningful differences (structure and presentation).
2) Build a Portfolio:
   - Don’t let one ad dominate; maintain a spread so the system can explore widely.
3) Learning Velocity:
   - Tie vertical learning (e.g., Persona, Pain Point, Messaging Angle) to horizontal variety (executional options) to discover scalable patterns.

## How the Mockup Aligns
- Main Dimension (vertical): select what you want to learn (Target Persona, Pain Point, Messaging Angle, Core Insight, Product).
- Horizontal variety: set 0–3 sliders for Format, Pattern, Visual, Opening, Tone/Emotion, Talent, CTA.
- Distribution models: 
  - Pareto (live) for weighted focus,
  - Even (prepared) for equal split,
  - Stage-Weighted (prepared) for funnel stages (Top/Mid/Bottom) when Main=Messaging Angle.
- Compatibility and Diversity:
  - Enforces simple compatibility rules (e.g., VO-first opening vs. Static formats).
  - Uniqueness by Similarity Key (VerticalValue|Pattern|Format|VisualStyle).
  - Minimum diversity score D between consecutive ads per vertical value.
- Output:
  - Editable table and Copy CSV (ENGLISH headers).
  - Format → Cluster mapping (UGC → ScriptShootEdit; Static/Anim → DANDA; Video → Airpost) for production planning.

## Key Terms (as used in mockup)
- Main Dimension (vertical): the primary structuring axis for a test (e.g., Pain Point).
- Horizontal Dimensions: executional variables (Format, Pattern, Visual Style, Opening Type, Tone/Emotion, Talent, CTA).
- Similarity Key: VerticalValue|Pattern|Format|VisualStyle — used to prevent duplicates.
- Diversity Target (D): minimum difference between consecutive ads per vertical value.

## Next Steps (once deck is accessible)
- Validate compatibility rules and impact weights against deck references.
- Expand catalogs and patterns with deck-specific terms and examples.
- Add more nuanced constraints (e.g., platform-specific guidelines) if present in the deck.
