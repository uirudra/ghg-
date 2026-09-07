"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { DownscaleResult, Gas } from "@/lib/api";

interface SelectionState {
  regionId: string;
  gas: Gas;
  setRegionId: (id: string) => void;
  setGas: (g: Gas) => void;
  lastDownscaleResult: DownscaleResult | null;
  setLastDownscaleResult: (r: DownscaleResult | null) => void;
}

const SelectionContext = createContext<SelectionState | null>(null);

const DEFAULT_REGION = "kolkata-metro";
const DEFAULT_GAS: Gas = "CH4";

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [regionId, setRegionIdState] = useState(DEFAULT_REGION);
  const [gas, setGasState] = useState<Gas>(DEFAULT_GAS);
  const [lastDownscaleResult, setLastDownscaleResult] = useState<DownscaleResult | null>(null);

  useEffect(() => {
    try {
      const storedRegion = localStorage.getItem("ghg.regionId");
      const storedGas = localStorage.getItem("ghg.gas") as Gas | null;
      if (storedRegion) setRegionIdState(storedRegion);
      if (storedGas === "CO2" || storedGas === "CH4") setGasState(storedGas);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  const setRegionId = (id: string) => {
    setRegionIdState(id);
    try {
      localStorage.setItem("ghg.regionId", id);
    } catch {}
  };
  const setGas = (g: Gas) => {
    setGasState(g);
    try {
      localStorage.setItem("ghg.gas", g);
    } catch {}
  };

  const value = useMemo(
    () => ({ regionId, gas, setRegionId, setGas, lastDownscaleResult, setLastDownscaleResult }),
    [regionId, gas, lastDownscaleResult]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
