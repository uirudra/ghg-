const STYLES: Record<string, string> = {
  Observed: "bg-good/10 text-good border-good/30",
  Modeled: "bg-brand/10 text-brand border-brand/30",
  "ML-downscaled": "bg-ch4/10 text-ch4 border-ch4/30",
  "AI-explained": "bg-co2/10 text-co2 border-co2/30",
};

export function ProvenanceBadge({ label }: { label: string }) {
  const key = Object.keys(STYLES).find((k) => label.includes(k)) ?? "Modeled";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STYLES[key]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {key}
    </span>
  );
}
