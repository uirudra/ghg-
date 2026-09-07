"use client";

import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, Dataset, DownscaleResult } from "@/lib/api";
import { HeatGrid } from "@/components/HeatGrid";
import { Card, SectionLabel, Spinner, Button } from "@/components/ui";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { gasUnit } from "@/lib/format";

const LAYERS: { id: keyof DownscaleResult["maps"]; label: string; pixelated?: boolean; mono?: boolean }[] = [
  { id: "coarse_input", label: "Coarse Scientific Estimate", pixelated: true },
  { id: "ml_downscaled", label: "ML-Downscaled Allocation" },
  { id: "baseline_area_weighted", label: "Baseline — Area-Weighted", pixelated: true },
  { id: "baseline_single_predictor", label: "Baseline — Single Predictor" },
  { id: "uncertainty_p10", label: "Uncertainty — P10", mono: true },
  { id: "uncertainty_p90", label: "Uncertainty — P90", mono: true },
];

export default function Explorer() {
  const { regionId, gas } = useSelection();
  const [layer, setLayer] = useState<keyof DownscaleResult["maps"]>("ml_downscaled");
  const [variant, setVariant] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<DownscaleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.datasets(gas).then((d) => setDatasets(d.datasets));
  }, [gas]);

  useEffect(() => {
    setLoading(true);
    api
      .runDownscale(regionId, gas, variant)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [regionId, gas, variant]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => setVariant((v) => (v + 1) % 6), 1800);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing]);

  const activeLayer = LAYERS.find((l) => l.id === layer)!;
  const unit = gasUnit(gas);

  return (
    <PageShell
      eyebrow="02 · GHG Explorer"
      title="Layer & Timeline Explorer"
      description="Toggle between the coarse input, the ML-downscaled allocation, both baselines, and the uncertainty bounds — then scrub across synthetic time slices to see how the pattern shifts."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayer(l.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
                    layer === l.id
                      ? "border-brand/50 bg-brand/15 text-brand"
                      : "border-border bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {result && <ProvenanceBadge label={result.provenance[layer] ?? "Modeled"} />}
          </div>

          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border">
            {result && !loading ? (
              <HeatGrid
                grid={result.maps[layer]}
                gas={activeLayer.mono ? "mono" : gas}
                pixelated={activeLayer.pixelated}
                unit={unit}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-black/40">
                <Spinner className="h-6 w-6 text-brand" />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-raised/40 p-3">
            <Button variant="secondary" onClick={() => setPlaying((p) => !p)} className="!px-3">
              {playing ? "Pause" : "Play"}
            </Button>
            <input
              type="range"
              min={0}
              max={5}
              value={variant}
              onChange={(e) => {
                setPlaying(false);
                setVariant(Number(e.target.value));
              }}
              className="flex-1 accent-brand"
            />
            <span className="w-24 shrink-0 text-right font-mono text-[12px] text-muted">Slice {variant} / 5</span>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionLabel>Datasets feeding this gas</SectionLabel>
            <div className="space-y-3">
              {datasets.map((d) => (
                <div key={d.dataset_id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink">{d.name}</span>
                    <ProvenanceBadge label={d.provenance} />
                  </div>
                  <div className="mt-1 text-[11px] text-faint">
                    {d.provider} · {d.resolution}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          {result && (
            <Card>
              <SectionLabel>Region</SectionLabel>
              <div className="text-[14px] font-medium text-ink">{result.region.name}</div>
              <div className="mt-1 text-[12px] text-muted">
                Population ≈ {result.region.population?.toLocaleString()}
              </div>
              <div className="mt-3 font-mono text-[11px] text-faint">
                bbox [{result.region.bbox.map((n) => n.toFixed(2)).join(", ")}]
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
