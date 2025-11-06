'use client'
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { BrandConfig, AppliedBrand } from "./brand";
import { applyBrandConfig } from "./brand";

type BrandContextValue = {
  activeBrandId: string | null;
  applied: AppliedBrand | null;
  loading: boolean;
  // Loads a brand from filesystem via API, applies it to the engine and UI
  loadBrand: (id: string) => Promise<void>;
  // Applies a local config (does not persist to file unless saveBrand is called)
  applyConfig: (cfg: BrandConfig) => void;
  // Persists a brand config to filesystem via API and (optionally) applies it
  saveBrand: (id: string, cfg: BrandConfig, applyAfter?: boolean) => Promise<void>;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedBrand | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBrand = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load brand ${id}`);
      const cfg: BrandConfig = await res.json();
      const app = applyBrandConfig(cfg);
      setApplied(app);
      setActiveBrandId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyConfig = useCallback((cfg: BrandConfig) => {
    const app = applyBrandConfig(cfg);
    setApplied(app);
    if (cfg.brandId) setActiveBrandId(cfg.brandId);
  }, []);

  const saveBrand = useCallback(async (id: string, cfg: BrandConfig, applyAfter = true) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error(`Failed to save brand ${id}`);
      if (applyAfter) {
        const app = applyBrandConfig(cfg);
        setApplied(app);
        setActiveBrandId(id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({ activeBrandId, applied, loading, loadBrand, applyConfig, saveBrand }),
    [activeBrandId, applied, loading, loadBrand, applyConfig, saveBrand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
