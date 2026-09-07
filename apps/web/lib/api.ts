const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type Gas = "CO2" | "CH4";

export interface Dataset {
  dataset_id: string;
  name: string;
  provider: string;
  role: string;
  variable: Gas;
  resolution: string;
  time_range: string;
  provenance: "Observed" | "Modeled" | "ML-downscaled" | "AI-explained";
  version: string;
  url: string | null;
}

export interface Region {
  region_id: string;
  name: string;
  country_code: string;
  bbox: [number, number, number, number];
  population: number | null;
}

export interface DownscaleResult {
  run_id: string;
  region: Region;
  gas: Gas;
  variant: number;
  model_version: string;
  grid: { fine_size: number; coarse_size: number; factor: number };
  maps: {
    ml_downscaled: number[][];
    uncertainty_p10: number[][];
    uncertainty_p90: number[][];
    coarse_input: number[][];
    baseline_area_weighted: number[][];
    baseline_single_predictor: number[][];
    synthetic_reference_truth: number[][];
  };
  predictors: {
    population: number[][];
    vegetation: number[][];
    wetland: number[][];
    fossil_activity: number[][];
  };
  totals: { coarse_total: number; ml_fine_total: number };
  ablation: Record<string, { mae: number; rmse: number; r2: number; spatial_correlation: number; conservation_error: number }>;
  provenance: Record<string, string>;
  created_at?: string;
  train_metadata?: Record<string, unknown>;
}

export interface MethaneEvent {
  event_id: string;
  region_id: string;
  gas: "CH4";
  lon: number;
  lat: number;
  source_category: string;
  strength_kg_hr: number;
  persistence_days: number;
  confidence: number;
  anomaly_score: number;
  status: "active" | "investigating" | "resolved";
  observed_at: string;
  provenance: string;
}

export interface CopilotResponse {
  session_id: string;
  provider: string | null;
  fallback_used: boolean;
  response: string;
  citations: string[];
  evidence: Record<string, unknown>;
}

export interface CopilotGuide {
  title: string;
  summary: string;
  steps: string[];
  example_questions: string[];
  guardrails: string[];
  providers: string;
}

export interface DecisionBrief {
  brief_id: string;
  region: Region;
  gas: Gas;
  provider: string | null;
  fallback_used: boolean;
  brief: string;
  top_events: MethaneEvent[];
  evidence: Record<string, unknown>;
}

export const api = {
  health: () => request<{ status: string; mongodb_connected: boolean }>("/health"),
  datasets: (gas?: Gas) => request<{ count: number; datasets: Dataset[] }>(`/datasets${gas ? `?gas=${gas}` : ""}`),
  regions: () => request<{ count: number; regions: Region[] }>("/regions"),
  mapLayers: () => request<{ layers: unknown[]; regions: unknown[]; gases: Gas[] }>("/map/layers"),
  runDownscale: (region_id: string, gas: Gas, variant = 0, holdout_test = false) =>
    request<DownscaleResult>("/downscale/run", {
      method: "POST",
      body: JSON.stringify({ region_id, gas, variant, holdout_test }),
    }),
  events: (region_id?: string, limit = 40) =>
    request<{ count: number; events: MethaneEvent[] }>(
      `/events?${region_id ? `region_id=${region_id}&` : ""}limit=${limit}`
    ),
  copilotGuide: () => request<CopilotGuide>("/copilot/guide"),
  copilotQuery: (payload: {
    query: string;
    region_id?: string;
    gas?: Gas;
    downscale_result?: DownscaleResult | null;
    prefer_provider?: "groq" | "gemini";
  }) => request<CopilotResponse>("/copilot/query", { method: "POST", body: JSON.stringify(payload) }),
  decisionBrief: (payload: {
    region_id: string;
    gas: Gas;
    downscale_result?: DownscaleResult | null;
    prefer_provider?: "groq" | "gemini";
  }) => request<DecisionBrief>("/decision-brief", { method: "POST", body: JSON.stringify(payload) }),
  modelCard: () => request<Record<string, unknown>>("/model-card"),
};
