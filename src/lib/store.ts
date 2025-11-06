import { create } from "zustand";
import type { BrandConfig } from "./types";
import { setCompatRules, setImpactWeights, setPipelineFlags } from "./logic";

type S = {
  activeBrandId: string | null;
  config: BrandConfig | null;
  setActive: (id: string) => void;
  loadBrand: (id: string) => Promise<void>;
  saveBrand: (cfg: BrandConfig) => Promise<void>;
  applyBrand: (cfg: BrandConfig) => void; // pushes into engine
};

function applyToEngine(cfg: any) {
  if (!cfg) return;
  const impacts = (cfg as any).impactWeights ?? (cfg as any).impacts;
  if (impacts) setImpactWeights(impacts as any);

  const enforceVOFirstSquareDisallow =
    (cfg as any)?.pipelineFlags?.enforceVOFirstSquareDisallow ??
    (cfg as any)?.flags?.disallowVOFirstSquare ??
    false;
  setPipelineFlags({ enforceVOFirstSquareDisallow } as any);

  const rulesContainer = (cfg as any).rules;
  if (rulesContainer) {
    if (Array.isArray(rulesContainer)) {
      // v2 rules array
      window.dispatchEvent(new CustomEvent("engine:set-rules", { detail: rulesContainer }));
    } else if (Array.isArray(rulesContainer?.rules)) {
      // v2 RulePack
      window.dispatchEvent(new CustomEvent("engine:set-rules", { detail: rulesContainer.rules }));
    } else if (rulesContainer.disallow || rulesContainer.allowOnly) {
      // v1 compat rules
      setCompatRules(rulesContainer);
    }
  }

  // Keep bridge-based application too
  window.dispatchEvent(new CustomEvent("engine:set-config", { detail: cfg }));
}

export const useBrand = create<S>((set, get) => ({
  activeBrandId: null,
  config: null,

  setActive: (id) => set({ activeBrandId: id }),

  loadBrand: async (id: string) => {
    const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Brand ${id} not found`);
    const cfg = (await res.json()) as BrandConfig;
    set({ activeBrandId: id, config: cfg });
    applyToEngine(cfg);
  },

  saveBrand: async (cfg: BrandConfig) => {
    const id = cfg.brandId;
    const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error(`Failed to save brand ${id}`);
    set({ config: cfg, activeBrandId: id });
  },

  applyBrand: (cfg: BrandConfig) => {
    applyToEngine(cfg);
    set({ config: cfg, activeBrandId: cfg.brandId || get().activeBrandId });
  },
}));
