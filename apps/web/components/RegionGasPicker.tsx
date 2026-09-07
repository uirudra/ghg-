"use client";

import { useEffect, useState } from "react";
import { api, Region } from "@/lib/api";
import { useSelection } from "@/components/SelectionContext";
import { gasLabel } from "@/lib/format";

export function RegionGasPicker({ compact = false }: { compact?: boolean }) {
  const { regionId, gas, setRegionId, setGas } = useSelection();
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    api
      .regions()
      .then((r) => setRegions(r.regions))
      .catch(() => setRegions([]));
  }, []);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <select
        value={regionId}
        onChange={(e) => setRegionId(e.target.value)}
        className={`truncate rounded-lg border border-border bg-surface text-ink outline-none transition-colors duration-150 hover:border-border-strong focus:border-brand ${
          compact ? "w-[168px] px-2.5 py-1.5 text-[12px]" : "px-3 py-2 text-sm"
        }`}
      >
        {regions.map((r) => (
          <option key={r.region_id} value={r.region_id}>
            {r.name}
          </option>
        ))}
      </select>

      <div className={`flex rounded-lg border border-border bg-surface p-0.5 ${compact ? "text-[12px]" : "text-sm"}`}>
        {(["CO2", "CH4"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGas(g)}
            className={`rounded-md px-2.5 py-1 font-medium transition-all duration-150 ${
              gas === g ? (g === "CO2" ? "bg-co2/20 text-co2" : "bg-ch4/20 text-ch4") : "text-muted hover:text-ink"
            }`}
          >
            {gasLabel(g)}
          </button>
        ))}
      </div>
    </div>
  );
}
