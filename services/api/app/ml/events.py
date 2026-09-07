"""
Methane Event Intelligence (Sec. 4 "Event model": anomaly detector +
classifier). EMIT plume observations are not fetchable in this environment,
so plume candidates are generated from the same land-use proxy fields used by
the downscaler — hotspots correlate with high fossil-activity or wetland
cells, which is where real EMIT/GHGSat detections concentrate. Every event
returned is labeled synthetic (see docs/limitations.md); the ranking/scoring
logic itself (anomaly score = normalized strength x persistence x confidence)
is real and would apply unchanged to ingested EMIT granules.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

import numpy as np

from app.data.regions import REGIONS, get_region
from app.data.synthetic import build_scene

SOURCE_CATEGORIES = ["oil_gas_infrastructure", "wetland_natural", "landfill", "agriculture_livestock", "coal_mining"]


def _region_seed(region_id: str) -> int:
    return int(hashlib.sha256(f"events:{region_id}".encode()).hexdigest()[:8], 16)


def _classify_source(fossil: float, wetland: float, population: float) -> str:
    if wetland > 0.6:
        return "wetland_natural"
    if fossil > 0.65:
        return "oil_gas_infrastructure"
    if population > 0.55 and fossil > 0.3:
        return "landfill"
    if fossil > 0.4:
        return "coal_mining"
    return "agriculture_livestock"


def generate_events_for_region(region_id: str, n_events: int = 6) -> list[dict]:
    region = get_region(region_id)
    if region is None:
        return []
    scene = build_scene(region, "CH4", variant=0)
    rng = np.random.default_rng(_region_seed(region_id))

    combined_hotspot = 0.6 * scene.fossil_activity + 0.4 * scene.wetland
    flat_idx = np.argsort(combined_hotspot.ravel())[::-1][: n_events * 4]
    chosen = rng.choice(flat_idx, size=min(n_events, len(flat_idx)), replace=False)

    lon_grid, lat_grid = scene.lat_lon_grids()
    events = []
    now = datetime.utcnow()
    for i, idx in enumerate(chosen):
        r, c = np.unravel_index(idx, combined_hotspot.shape)
        strength = float(50 + 900 * combined_hotspot[r, c] * (0.6 + 0.8 * rng.random()))
        persistence = int(1 + 40 * combined_hotspot[r, c] * rng.random())
        confidence = float(np.clip(0.55 + 0.4 * combined_hotspot[r, c] + 0.1 * rng.random(), 0, 0.99))
        source = _classify_source(scene.fossil_activity[r, c], scene.wetland[r, c], scene.population[r, c])
        anomaly_score = strength * (1 + persistence / 30) * confidence

        events.append(
            {
                "event_id": f"{region_id}-ch4-{i:03d}",
                "region_id": region_id,
                "gas": "CH4",
                "lon": round(float(lon_grid[r, c]), 4),
                "lat": round(float(lat_grid[r, c]), 4),
                "source_category": source,
                "strength_kg_hr": round(strength, 1),
                "persistence_days": persistence,
                "confidence": round(confidence, 3),
                "anomaly_score": round(anomaly_score, 1),
                "status": "active" if persistence > 10 else ("investigating" if persistence > 3 else "resolved"),
                "observed_at": (now - timedelta(days=int(rng.integers(0, 14)))).isoformat() + "Z",
                "provenance": "Observed (synthetic proxy standing in for EMIT plume complexes)",
            }
        )
    events.sort(key=lambda e: e["anomaly_score"], reverse=True)
    return events


def generate_all_events(n_per_region: int = 5) -> list[dict]:
    out = []
    for region in REGIONS:
        out.extend(generate_events_for_region(region.region_id, n_per_region))
    out.sort(key=lambda e: e["anomaly_score"], reverse=True)
    return out
