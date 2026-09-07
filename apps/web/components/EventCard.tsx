import type { MethaneEvent } from "@/lib/api";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { timeAgo } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-bad/15 text-bad",
  investigating: "bg-warn/15 text-warn",
  resolved: "bg-good/15 text-good",
};

const SOURCE_LABEL: Record<string, string> = {
  oil_gas_infrastructure: "Oil & Gas Infrastructure",
  wetland_natural: "Natural Wetland",
  landfill: "Landfill",
  agriculture_livestock: "Agriculture / Livestock",
  coal_mining: "Coal Mining",
};

export function EventCard({ event, rank }: { event: MethaneEvent; rank?: number }) {
  return (
    <div
      data-reveal
      className="group flex items-start gap-4 rounded-xl border border-border bg-raised/50 p-4 transition-colors duration-150 hover:border-border-strong"
    >
      {rank !== undefined && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-overlay font-mono text-[12px] text-muted">
          {rank + 1}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{SOURCE_LABEL[event.source_category] ?? event.source_category}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLE[event.status]}`}>
            {event.status}
          </span>
        </div>
        <div className="mt-1 font-mono text-[11px] text-faint">
          {event.lat.toFixed(3)}, {event.lon.toFixed(3)} &middot; observed {timeAgo(event.observed_at)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          <span>
            Strength <b className="font-mono text-ink">{event.strength_kg_hr.toFixed(0)}</b> kg/hr
          </span>
          <span>
            Persistence <b className="font-mono text-ink">{event.persistence_days}</b> days
          </span>
          <span>
            Confidence <b className="font-mono text-ink">{(event.confidence * 100).toFixed(0)}%</b>
          </span>
          <span>
            Anomaly score <b className="font-mono text-ch4">{event.anomaly_score.toFixed(0)}</b>
          </span>
        </div>
      </div>
      <div className="shrink-0">
        <ProvenanceBadge label={event.provenance} />
      </div>
    </div>
  );
}
