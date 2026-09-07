"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, DownscaleResult } from "@/lib/api";
import { HeatGrid } from "@/components/HeatGrid";
import { Card, SectionLabel, Spinner } from "@/components/ui";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";

export default function NaturalCarbonObservatory() {
  const { regionId, gas } = useSelection();
  const [result, setResult] = useState<DownscaleResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .runDownscale(regionId, gas)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [regionId, gas]);

  const vulnerability = useMemo(() => {
    if (!result) return null;
    const pop = result.predictors.population;
    const em = result.maps.ml_downscaled;
    const emMax = Math.max(...em.flat());
    return pop.map((row, y) => row.map((p, x) => p * (em[y][x] / (emMax || 1))));
  }, [result]);

  return (
    <PageShell
      eyebrow="05 · Natural Carbon Observatory"
      title="Wetlands, Vegetation & Exposure"
      description="Land-cover proxy layers behind the downscaling model — wetland extent (CH₄ source/sink context, e.g. LPJ-EOSIM), vegetation density (CO₂ sink context, e.g. MiCASA), and a population-weighted exposure composite."
    >
      {loading || !result || !vulnerability ? (
        <Card className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <LayerCard
            title="Wetland probability"
            subtitle="Proxy for LPJ-EOSIM wetland CH₄ source/sink extent"
            grid={result.predictors.wetland}
            gas="mono"
            provenance="Modeled (synthetic proxy for LPJ-EOSIM wetland CH4)"
          />
          <LayerCard
            title="Vegetation density"
            subtitle="Proxy for MiCASA land carbon flux / NDVI"
            grid={result.predictors.vegetation}
            gas="mono"
            provenance="Modeled (synthetic proxy for MiCASA land carbon flux)"
          />
          <LayerCard
            title="Population-weighted exposure"
            subtitle="Population density × ML-downscaled emission intensity"
            grid={vulnerability}
            gas={gas}
            provenance="AI-explained (derived composite, not a source dataset)"
          />
        </div>
      )}

      <Card className="mt-6">
        <SectionLabel>Why this matters</SectionLabel>
        <p className="text-[13px] leading-relaxed text-muted">
          Wetlands and vegetation aren&apos;t just backdrop — they&apos;re active participants in the carbon cycle: wetlands
          are a major natural CH₄ source (and, when drained, a CO₂ source too), while dense vegetation is a CO₂ sink.
          The downscaling model conditions on both, which is why regions like {result?.region.name} — where wetland
          and urban/industrial land uses sit side by side — show sharp, physically plausible sub-grid detail rather
          than a smooth blur of the coarse estimate.
        </p>
      </Card>
    </PageShell>
  );
}

function LayerCard({
  title,
  subtitle,
  grid,
  gas,
  provenance,
}: {
  title: string;
  subtitle: string;
  grid: number[][];
  gas: "CO2" | "CH4" | "mono";
  provenance: string;
}) {
  return (
    <div data-reveal>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium text-ink">{title}</div>
          <div className="text-[11px] text-faint">{subtitle}</div>
        </div>
      </div>
      <HeatGrid grid={grid} gas={gas} unit="" className="aspect-square" />
      <div className="mt-2">
        <ProvenanceBadge label={provenance} />
      </div>
    </div>
  );
}
