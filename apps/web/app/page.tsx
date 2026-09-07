"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, Region, MethaneEvent } from "@/lib/api";
import { useSelection } from "@/components/SelectionContext";
import { MapView, MapMarker } from "@/components/MapView";
import { KpiCard } from "@/components/KpiCard";
import { Card, Button, SectionLabel } from "@/components/ui";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    href: "/downscaler",
    n: "03",
    title: "ML Downscaler Lab",
    body: "Run the conservation-constrained model, compare it against two baselines, and watch the mass-balance proof pass in real time.",
  },
  {
    href: "/events",
    n: "04",
    title: "Methane Event Radar",
    body: "Rank plume-like methane anomalies by strength, persistence, and confidence — classified by source category.",
  },
  {
    href: "/copilot",
    n: "07",
    title: "AI GHG Copilot",
    body: "Ask questions grounded strictly in retrieved evidence — Groq for speed, Gemini as an automatic fallback.",
  },
  {
    href: "/decision-studio",
    n: "08",
    title: "Decision Studio",
    body: "Turn a region's evidence bundle into a structured, citation-backed intervention brief in one click.",
  },
];

export default function CommandCenter() {
  const { regionId, gas, setRegionId } = useSelection();
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [events, setEvents] = useState<MethaneEvent[]>([]);
  const [datasetCount, setDatasetCount] = useState(0);

  useEffect(() => {
    api.regions().then((r) => setRegions(r.regions)).catch(() => {});
    api.datasets().then((d) => setDatasetCount(d.count)).catch(() => {});
    api.events(undefined, 60).then((e) => setEvents(e.events)).catch(() => {});
  }, []);

  const activeCount = useMemo(() => events.filter((e) => e.status === "active").length, [events]);
  const avgConfidence = useMemo(
    () => (events.length ? events.reduce((s, e) => s + e.confidence, 0) / events.length : 0),
    [events]
  );

  const markers: MapMarker[] = useMemo(
    () =>
      regions.map((r) => ({
        id: r.region_id,
        lon: (r.bbox[0] + r.bbox[2]) / 2,
        lat: (r.bbox[1] + r.bbox[3]) / 2,
        color: r.region_id === regionId ? "#5b7cfa" : "#3bc7f4",
        size: r.region_id === regionId ? 16 : 10,
        label: r.name,
        onClick: () => {
          setRegionId(r.region_id);
          router.push("/downscaler");
        },
      })),
    [regions, regionId, setRegionId, router]
  );

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-14">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div data-hero className="inline-flex items-center gap-2 rounded-full border border-border bg-raised/60 px-3 py-1 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse-soft" />
            NASA Space Apps &middot; GHG Intelligence Nexus
          </div>
          <h1 data-hero className="mt-5 max-w-xl font-display text-[44px] font-medium leading-[1.05] tracking-tight text-ink md:text-[56px]">
            See where emissions <span className="text-brand">actually are</span> — not just where the coarse grid says.
          </h1>
          <p data-hero className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
            A conservation-constrained ML downscaling engine turns coarse CO₂/CH₄ estimates into fine-resolution,
            physically-honest maps — every fine pixel sums back to the scientific total, exactly. Paired with methane
            event intelligence and a grounded AI copilot.
          </p>
          <div data-hero className="mt-7 flex flex-wrap gap-3">
            <Link href="/downscaler">
              <Button variant="primary">Run the hero workflow →</Button>
            </Link>
            <Link href="/model-transparency">
              <Button variant="secondary">How this works</Button>
            </Link>
          </div>

          <div data-hero className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Datasets tracked" value={datasetCount} accent="brand" />
            <KpiCard label="Regions monitored" value={regions.length} accent="co2" />
            <KpiCard label="Active CH₄ events" value={activeCount} accent="ch4" />
            <KpiCard label="Avg. event confidence" value={avgConfidence * 100} decimals={0} suffix="%" accent="good" />
          </div>
        </div>

        <div data-hero className="relative h-[420px] overflow-hidden rounded-2xl border border-border shadow-card lg:h-full">
          <MapView markers={markers} className="h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-base/90 to-transparent p-4">
            <div className="text-[11px] text-muted">
              Click a region to jump straight into the ML Downscaler Lab for that geography.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <SectionLabel>Platform</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href}>
              <Card className="group h-full transition-colors duration-150 hover:border-brand/50">
                <div className="font-mono text-[11px] text-faint">{f.n}</div>
                <div className="mt-2 font-display text-[16px] font-medium text-ink">{f.title}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.body}</p>
                <div className="mt-4 text-[12px] font-medium text-brand opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  Open →
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 rounded-2xl border border-border/60 bg-raised/30 p-5 text-[12px] leading-relaxed text-faint">
        <b className="text-muted">Data realism note:</b> this deployment has no live connectivity to the NASA
        Earthdata / US GHG Center archives. Every grid, event, and metric is produced by a procedural generator that
        is physically structured (land-cover, wetland, and population proxies with realistic magnitudes) but is not
        an ingestion of real satellite granules. Fine-resolution outputs are always ML-downscaled estimates, never
        measurements. See the Model Transparency page for full details.
      </div>
    </div>
  );
}
