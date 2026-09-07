"use client";

import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSelection } from "@/components/SelectionContext";
import { api, DecisionBrief } from "@/lib/api";
import { Card, SectionLabel, Spinner, Button } from "@/components/ui";
import { EventCard } from "@/components/EventCard";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { renderMarkdown } from "@/lib/markdown";

export default function DecisionStudio() {
  const { regionId, gas, lastDownscaleResult } = useSelection();
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.decisionBrief({ region_id: regionId, gas, downscale_result: lastDownscaleResult });
      setBrief(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      eyebrow="08 · Decision Studio"
      title="Evidence-Backed Intervention Brief"
      description="One click turns the region's evidence bundle — datasets, your last downscaling run, and top methane events — into a structured brief with every figure traced to its source."
      actions={
        <Button variant="primary" onClick={generate} disabled={loading}>
          {loading ? <Spinner /> : null}
          {loading ? "Drafting…" : brief ? "Regenerate brief" : "Generate brief"}
        </Button>
      }
    >
      {error && <div className="mb-6 rounded-xl border border-bad/30 bg-bad/10 p-4 text-[13px] text-bad">{error}</div>}

      {!brief && !loading && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="font-display text-lg text-ink">No brief yet</div>
          <p className="max-w-md text-[13px] text-muted">
            For the richest brief, run a downscaling pass in the ML Downscaler Lab first — its totals and ablation
            metrics get attached automatically as evidence.
          </p>
          <Button variant="primary" onClick={generate}>
            Generate brief
          </Button>
        </Card>
      )}

      {loading && (
        <Card className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </Card>
      )}

      {brief && !loading && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>Intervention Brief — {brief.region.name}</SectionLabel>
              <div className="flex items-center gap-2">
                <ProvenanceBadge label="AI-explained" />
                {brief.provider && <span className="text-[10px] uppercase tracking-wide text-faint">via {brief.provider}</span>}
              </div>
            </div>
            <div className="prose-brief" dangerouslySetInnerHTML={{ __html: renderMarkdown(brief.brief) }} />
          </Card>

          <div className="space-y-3">
            <SectionLabel>Priority hotspots referenced</SectionLabel>
            {brief.top_events.map((e, i) => (
              <EventCard key={e.event_id} event={e} rank={i} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
