"use client";

import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, DownscaleResult } from "@/lib/api";
import { Button, Card, SectionLabel, Spinner } from "@/components/ui";
import { HeatGrid } from "@/components/HeatGrid";
import { ConservationCard } from "@/components/ConservationCard";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { gasLabel, gasUnit } from "@/lib/format";

const METRIC_LABELS: Record<string, string> = {
  mae: "MAE",
  rmse: "RMSE",
  r2: "R²",
  spatial_correlation: "Spatial corr.",
  conservation_error: "Conservation error",
};

const MODEL_LABELS: Record<string, string> = {
  ml_downscaled: "CC-MRSF-Net-lite (ours)",
  baseline_area_weighted: "Baseline — area-weighted",
  baseline_single_predictor: "Baseline — single predictor",
};

export default function DownscalerLab() {
  const { regionId, gas, setLastDownscaleResult } = useSelection();
  const [variant, setVariant] = useState(0);
  const [holdout, setHoldout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUncertainty, setShowUncertainty] = useState(false);
  const [result, setResult] = useState<DownscaleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.runDownscale(regionId, gas, variant, holdout);
      setResult(r);
      setLastDownscaleResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Downscaling run failed");
    } finally {
      setLoading(false);
    }
  };

  const unit = gasUnit(gas);
  const best = result?.ablation.ml_downscaled;
  const baseline = result?.ablation.baseline_area_weighted;

  return (
    <PageShell
      eyebrow="03 · Hero Workflow"
      title="ML Downscaler Lab"
      description="Run the conservation-constrained downscaler for the selected region and gas. Every fine pixel is rescaled so its coarse block sums exactly to the scientific input — proven live below, not just claimed."
      actions={
        <div className="flex items-center gap-2">
          <select
            value={variant}
            onChange={(e) => setVariant(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] text-ink"
          >
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                Time slice {v}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <input type="checkbox" checked={holdout} onChange={(e) => setHoldout(e.target.checked)} />
            Spatial generalization test
          </label>
          <Button variant="primary" onClick={run} disabled={loading}>
            {loading ? <Spinner /> : null}
            {loading ? (holdout ? "Retraining (holdout)…" : "Running…") : "Run downscaling"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-bad/30 bg-bad/10 p-4 text-[13px] text-bad">{error}</div>
      )}

      {!result && !loading && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="font-display text-lg text-ink">No run yet</div>
          <p className="max-w-md text-[13px] text-muted">
            Pick a region and gas in the top bar, optionally a time slice or spatial-generalization holdout test, then
            run the model. The first run of a session may take longer if the model needs to (re)train.
          </p>
          <Button variant="primary" onClick={run}>
            Run downscaling
          </Button>
        </Card>
      )}

      {loading && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Spinner className="h-6 w-6 text-brand" />
          <div className="text-[13px] text-muted">
            {holdout
              ? "Retraining CC-MRSF-Net-lite with this region held out entirely (Stage F generalization test)…"
              : "Loading the trained model and running conservation-constrained inference…"}
          </div>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-8">
          <div>
            <SectionLabel>Before / After · {result.region.name} · {gasLabel(result.gas)}</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2">
              <div data-reveal>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">Coarse scientific estimate</span>
                  <ProvenanceBadge label={result.provenance.coarse_input} />
                </div>
                <HeatGrid grid={result.maps.coarse_input} gas={result.gas} pixelated unit={unit} className="aspect-square" />
              </div>
              <div data-reveal>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">ML-downscaled allocation</span>
                  <ProvenanceBadge label={result.provenance.ml_downscaled} />
                </div>
                <HeatGrid grid={result.maps.ml_downscaled} gas={result.gas} unit={unit} className="aspect-square" />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={showUncertainty} onChange={(e) => setShowUncertainty(e.target.checked)} />
              Show uncertainty bounds (MC-Dropout, 12 passes)
            </label>
            {showUncertainty && (
              <div className="mt-3 grid gap-4 md:grid-cols-2" data-reveal>
                <div>
                  <div className="mb-2 text-[13px] font-medium text-ink">P10 (low bound)</div>
                  <HeatGrid grid={result.maps.uncertainty_p10} gas="mono" unit={unit} className="aspect-square" />
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-medium text-ink">P90 (high bound)</div>
                  <HeatGrid grid={result.maps.uncertainty_p90} gas="mono" unit={unit} className="aspect-square" />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <ConservationCard
              coarseTotal={result.totals.coarse_total}
              fineTotal={result.totals.ml_fine_total}
              conservationError={best?.conservation_error ?? 0}
              unit={unit}
            />
            <Card>
              <SectionLabel>Ablation — model vs. baselines</SectionLabel>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="text-faint">
                      <th className="pb-2 pr-4 font-medium">Method</th>
                      {Object.keys(METRIC_LABELS).map((k) => (
                        <th key={k} className="pb-2 pr-4 font-medium">
                          {METRIC_LABELS[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.ablation).map(([key, metrics]) => (
                      <tr key={key} className={`border-t border-border ${key === "ml_downscaled" ? "text-ink" : "text-muted"}`}>
                        <td className="py-2 pr-4 font-medium">{MODEL_LABELS[key] ?? key}</td>
                        {Object.keys(METRIC_LABELS).map((m) => (
                          <td key={m} className="py-2 pr-4 font-mono tabular">
                            {m === "conservation_error"
                              ? (metrics as never as Record<string, number>)[m].toExponential(1)
                              : (metrics as never as Record<string, number>)[m].toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {best && baseline && (
                <div className="mt-3 text-[12px] text-good">
                  {((1 - best.mae / baseline.mae) * 100).toFixed(0)}% lower MAE than the naive area-weighted baseline.
                </div>
              )}
            </Card>
          </div>

          <div className="rounded-xl border border-border/60 bg-raised/30 p-4 text-[11px] leading-relaxed text-faint">
            Reference truth used for scoring is a synthetic benchmark (see Model Transparency) — these metrics
            demonstrate the downscaling method faithfully, but are not a validation against real satellite
            observations. Model version: <span className="font-mono text-muted">{result.model_version}</span>
          </div>
        </div>
      )}
    </PageShell>
  );
}
