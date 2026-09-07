"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, MethaneEvent, Region } from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import { MapView, MapMarker } from "@/components/MapView";
import { Card, SectionLabel, Spinner, Button } from "@/components/ui";

const STATUS_COLOR: Record<string, string> = { active: "#f76a6a", investigating: "#f5a623", resolved: "#34d399" };

export default function EventRadar() {
  const { regionId } = useSelection();
  const [scope, setScope] = useState<"region" | "global">("region");
  const [events, setEvents] = useState<MethaneEvent[]>([]);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.events(scope === "region" ? regionId : undefined, 60),
      api.regions(),
    ]).then(([e, r]) => {
      setEvents(e.events);
      setRegion(r.regions.find((x) => x.region_id === regionId) ?? null);
      setLoading(false);
    });
  }, [regionId, scope]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? events : events.filter((e) => e.status === statusFilter)),
    [events, statusFilter]
  );

  const markers: MapMarker[] = useMemo(
    () =>
      filtered.map((e) => ({
        id: e.event_id,
        lon: e.lon,
        lat: e.lat,
        color: STATUS_COLOR[e.status],
        size: 6 + Math.min(14, e.anomaly_score / 120),
        label: `${e.source_category.replace(/_/g, " ")} · ${e.strength_kg_hr.toFixed(0)} kg/hr`,
      })),
    [filtered]
  );

  return (
    <PageShell
      eyebrow="04 · Event Intelligence"
      title="Methane Event Radar"
      description="Plume-like CH₄ anomalies ranked by strength × persistence × confidence, classified by likely source. Standing in for EMIT plume-complex ingestion (see Model Transparency)."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-[12px]">
            {(["region", "global"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors duration-150 ${
                  scope === s ? "bg-brand/20 text-brand" : "text-muted hover:text-ink"
                }`}
              >
                {s === "region" ? "This region" : "Global"}
              </button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] text-ink"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      }
    >
      {loading ? (
        <Card className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="h-[460px] overflow-hidden rounded-2xl border border-border shadow-card" data-reveal>
            <MapView bbox={scope === "region" ? region?.bbox : undefined} markers={markers} className="h-full w-full" />
          </div>
          <div className="space-y-3">
            <SectionLabel>{filtered.length} events, ranked by anomaly score</SectionLabel>
            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {filtered.map((e, i) => (
                <EventCard key={e.event_id} event={e} rank={i} />
              ))}
              {filtered.length === 0 && <div className="py-10 text-center text-sm text-muted">No events match this filter.</div>}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
