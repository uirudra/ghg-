export function formatNumber(n: number, digits = 1): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(digits)}k`;
  return n.toFixed(digits);
}

export function formatPercent(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function gasLabel(gas: "CO2" | "CH4"): string {
  return gas === "CO2" ? "CO₂" : "CH₄";
}

export function gasUnit(gas: "CO2" | "CH4"): string {
  return gas === "CO2" ? "t CO₂/day" : "kg CH₄/hr";
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffH = Math.max(0, Math.round((now - then) / 36e5));
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}
