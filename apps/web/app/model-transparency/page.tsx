"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { api, Dataset } from "@/lib/api";
import { Card, SectionLabel, Spinner } from "@/components/ui";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";

interface ModelCard {
  model_version: string;
  architecture: string;
  simplifications_vs_blueprint: string[];
  not_simplified: string;
  grid: { fine_size: number; coarse_size: number; factor: number };
  uncertainty_method: string;
  training: Record<string, unknown>;
  data_realism: string;
  evaluation_metrics: string[];
  ablation_baselines: string[];
}

export default function ModelTransparency() {
  const [card, setCard] = useState<ModelCard | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.modelCard(), api.datasets()]).then(([c, d]) => {
      setCard(c as unknown as ModelCard);
      setDatasets(d.datasets);
      setLoading(false);
    });
  }, []);

  return (
    <PageShell
      eyebrow="09 · Model Transparency"
      title="Architecture, Training & Limitations"
      description="Full disclosure: what CC-MRSF-Net-lite actually is, how it was trained, and — most importantly — exactly where this build's data comes from."
    >
      {loading || !card ? (
        <Card className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-warn/30 bg-warn/[0.04]">
            <SectionLabel>Data realism — read this first</SectionLabel>
            <p className="text-[13px] leading-relaxed text-ink">{card.data_realism}</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionLabel>Architecture — {card.model_version}</SectionLabel>
              <p className="text-[13px] leading-relaxed text-muted">{card.architecture}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Fine grid" value={`${card.grid.fine_size}×${card.grid.fine_size}`} />
                <Stat label="Coarse grid" value={`${card.grid.coarse_size}×${card.grid.coarse_size}`} />
                <Stat label="Factor" value={`${card.grid.factor}×`} />
              </div>
            </Card>
            <Card>
              <SectionLabel>What is NOT simplified</SectionLabel>
              <p className="text-[13px] leading-relaxed text-good">{card.not_simplified}</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionLabel>Simplifications vs. the full blueprint</SectionLabel>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted">
                {card.simplifications_vs_blueprint.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionLabel>Uncertainty & evaluation</SectionLabel>
              <p className="text-[13px] text-muted">{card.uncertainty_method}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.evaluation_metrics.map((m) => (
                  <span key={m} className="rounded-full bg-overlay px-2.5 py-1 font-mono text-[11px] text-muted">
                    {m}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-[12px] text-faint">
                Ablation baselines: {card.ablation_baselines.join(" · ")}
              </div>
            </Card>
          </div>

          <Card>
            <SectionLabel>Last training run (this server process)</SectionLabel>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-muted">
              {JSON.stringify(card.training, null, 2)}
            </pre>
          </Card>

          <Card>
            <SectionLabel>Full dataset registry ({datasets.length})</SectionLabel>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="text-faint">
                    <th className="pb-2 pr-4 font-medium">Dataset</th>
                    <th className="pb-2 pr-4 font-medium">Provider</th>
                    <th className="pb-2 pr-4 font-medium">Resolution</th>
                    <th className="pb-2 pr-4 font-medium">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => (
                    <tr key={d.dataset_id} className="border-t border-border text-muted">
                      <td className="py-2 pr-4 text-ink">{d.name}</td>
                      <td className="py-2 pr-4">{d.provider}</td>
                      <td className="py-2 pr-4 font-mono">{d.resolution}</td>
                      <td className="py-2 pr-4">
                        <ProvenanceBadge label={d.provenance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="font-mono text-[15px] text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-faint">{label}</div>
    </div>
  );
}
