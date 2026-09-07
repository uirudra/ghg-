"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, MethaneEvent, Region } from "@/lib/api";
import { Card, SectionLabel, Spinner, Button } from "@/components/ui";
import { gasLabel } from "@/lib/format";

export default function RegionIntelligence() {
  const { gas, setRegionId, regionId } = useSelection();
  const [regions, setRegions] = useState<Region[]>([]);
  const [events, setEvents] = useState<MethaneEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Record<string, { coarse: number; fine: number }>>({});
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.regions(), api.events(undefined, 200)]).then(([r, e]) => {
      setRegions(r.regions);
      setEvents(e.events);
      setLoading(false);
    });
  }, []);

  const byRegion = useMemo(() => {
    const map: Record<string, MethaneEvent[]> = {};
    for (const r of regions) map[r.region_id] = [];
    for (const e of events) (map[e.region_id] ??= []).push(e);
    return map;
  }, [regions, events]);

  const compareAll = async () => {
    setComparing(true);
    const next: Record<string, { coarse: number; fine: number }> = {};
    for (const r of regions) {
      try {
        const res = await api.runDownscale(r.region_id, gas);
        next[r.region_id] = { coarse: res.totals.coarse_total, fine: res.totals.ml_fine_total };
        setTotals({ ...next });
      } catch {
        /* skip region on failure */
      }
    }
    setComparing(false);
  };

  const maxTotal = Math.max(1, ...Object.values(totals).map((t) => t.fine));

  return (
    <PageShell
      eyebrow="06 · Region Intelligence"
      title="Country / Region Comparison"
      description="Population, methane event activity, and (on demand) full ML-downscaled totals across every monitored region."
      actions={
        <Button variant="secondary" onClick={compareAll} disabled={comparing}>
          {comparing ? <Spinner /> : null}
          {comparing ? "Running downscaling for all regions…" : `Compare ${gasLabel(gas)} totals across regions`}
        </Button>
      }
    >
      {loading ? (
        <Card className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </Card>
      ) : (
        <div className="space-y-3">
          {regions.map((r) => {
            const regionEvents = byRegion[r.region_id] ?? [];
            const active = regionEvents.filter((e) => e.status === "active").length;
            const avgConf = regionEvents.length
              ? regionEvents.reduce((s, e) => s + e.confidence, 0) / regionEvents.length
              : 0;
            const t = totals[r.region_id];
            return (
              <div
                key={r.region_id}
                data-reveal
                onClick={() => setRegionId(r.region_id)}
                className={`cursor-pointer rounded-2xl border p-5 transition-colors duration-150 ${
                  r.region_id === regionId ? "border-brand/50 bg-brand/[0.04]" : "border-border bg-raised/40 hover:border-border-strong"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-[16px] font-medium text-ink">{r.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-faint">
                      {r.country_code} &middot; pop ≈ {r.population?.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-6 text-right text-[12px]">
                    <div>
                      <div className="font-mono text-ink tabular">{regionEvents.length}</div>
                      <div className="text-faint">CH₄ events</div>
                    </div>
                    <div>
                      <div className="font-mono text-bad tabular">{active}</div>
                      <div className="text-faint">active</div>
                    </div>
                    <div>
                      <div className="font-mono text-ink tabular">{(avgConf * 100).toFixed(0)}%</div>
                      <div className="text-faint">avg confidence</div>
                    </div>
                  </div>
                </div>

                {t && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between font-mono text-[11px] text-muted">
                      <span>ML-downscaled total ({gasLabel(gas)})</span>
                      <span>{t.fine.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-overlay">
                      <div
                        className={`h-full rounded-full ${gas === "CO2" ? "bg-co2" : "bg-ch4"} transition-[width] duration-500 ease-out-strong`}
                        style={{ width: `${(t.fine / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
