"""
Procedural, physically-structured proxy data generator.

This module stands in for the real NASA/US GHG Center raster pipeline
(xarray + rioxarray ingestion of OCO-2/ODIAC/LPJ-EOSIM/etc granules), which
this environment cannot download (multi-GB, auth-gated archives). Instead it
synthesizes a fine-resolution "ground truth" emission field from multi-octave
value noise shaped by a per-region land-use profile (population density,
vegetation/NDVI proxy, wetland probability, nightlights/fossil-activity
proxy), then block-aggregates it to produce the coarse "scientific estimate"
that the rest of the pipeline treats as ground truth input.

Because the fine-resolution truth is known here (it generated the coarse
value), the downscaler's reconstruction can be scored against it — giving
honest MAE/RMSE/R2 numbers for a *synthetic* benchmark. This is documented
everywhere as a proxy benchmark, not a validation against real satellite
observations. See docs/limitations.md and docs/methodology.md.
"""

from __future__ import annotations

import hashlib

import numpy as np

from app.db.schemas import Gas, Region

FINE_SIZE = 64
COARSE_FACTOR = 8
COARSE_SIZE = FINE_SIZE // COARSE_FACTOR

# Per-region land-use bias: (population, vegetation, wetland, fossil_activity)
# weights sum loosely to 1; these drive which noise channel dominates.
REGION_PROFILES: dict[str, dict[str, float]] = {
    "permian-basin": {"population": 0.10, "vegetation": 0.10, "wetland": 0.02, "fossil": 0.78},
    "sundarbans-delta": {"population": 0.25, "vegetation": 0.20, "wetland": 0.50, "fossil": 0.05},
    "central-valley": {"population": 0.35, "vegetation": 0.30, "wetland": 0.05, "fossil": 0.30},
    "congo-basin": {"population": 0.10, "vegetation": 0.55, "wetland": 0.30, "fossil": 0.05},
    "west-siberian-lowland": {"population": 0.05, "vegetation": 0.20, "wetland": 0.65, "fossil": 0.10},
    "ruhr-valley": {"population": 0.40, "vegetation": 0.10, "wetland": 0.02, "fossil": 0.48},
    # Kolkata metro: dense urban/industrial core to the west, the East Kolkata
    # Wetlands (a real Ramsar site, sewage-fed and biologically active for CH4)
    # to the east — a genuine urban-wetland contrast in one bounding box.
    "kolkata-metro": {"population": 0.45, "vegetation": 0.10, "wetland": 0.30, "fossil": 0.15},
}

# Gas-specific magnitude scaling (illustrative units): CO2 in tCO2/cell/day,
# CH4 in kgCH4/hr/cell. Orders of magnitude are representative of published
# ODIAC/LPJ-EOSIM ranges, not exact figures.
GAS_SCALE: dict[Gas, float] = {"CO2": 4200.0, "CH4": 380.0}


def _seed_from(region_id: str, gas: str) -> int:
    digest = hashlib.sha256(f"{region_id}:{gas}".encode()).hexdigest()
    return int(digest[:8], 16)


def _value_noise(rng: np.random.Generator, size: int, octaves: tuple[int, ...] = (2, 4, 8, 16)) -> np.ndarray:
    """Multi-octave smooth noise via bilinear-upsampled random grids."""
    field = np.zeros((size, size), dtype=np.float64)
    amplitude = 1.0
    total_amp = 0.0
    for res in octaves:
        coarse = rng.random((res, res))
        upsampled = _bilinear_resize(coarse, size)
        field += amplitude * upsampled
        total_amp += amplitude
        amplitude *= 0.55
    field /= total_amp
    return field


def _bilinear_resize(grid: np.ndarray, size: int) -> np.ndarray:
    src = grid.shape[0]
    xs = np.linspace(0, src - 1, size)
    ys = np.linspace(0, src - 1, size)
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    x1 = np.clip(x0 + 1, 0, src - 1)
    y1 = np.clip(y0 + 1, 0, src - 1)
    wx = (xs - x0).reshape(1, -1)
    wy = (ys - y0).reshape(-1, 1)

    top = grid[np.ix_(y0, x0)] * (1 - wx) + grid[np.ix_(y0, x1)] * wx
    bottom = grid[np.ix_(y1, x0)] * (1 - wx) + grid[np.ix_(y1, x1)] * wx
    return top * (1 - wy) + bottom * wy


def _normalize01(arr: np.ndarray) -> np.ndarray:
    lo, hi = arr.min(), arr.max()
    if hi - lo < 1e-9:
        return np.zeros_like(arr)
    return (arr - lo) / (hi - lo)


class SyntheticScene:
    def __init__(self, region: Region, gas: Gas, variant: int = 0):
        self.region = region
        self.gas = gas
        self.variant = variant

        # Land-cover predictors are static geography: fixed per region regardless
        # of gas or time slice (variant), matching real static/slow-changing
        # layers like population density and wetland extent.
        geo_seed = _seed_from(region.region_id, "geo")
        geo_rng = np.random.default_rng(geo_seed)
        profile = REGION_PROFILES.get(region.region_id, {"population": 0.25, "vegetation": 0.25, "wetland": 0.25, "fossil": 0.25})

        self.population = _normalize01(_value_noise(geo_rng, FINE_SIZE, (2, 5, 11)))
        self.vegetation = _normalize01(_value_noise(geo_rng, FINE_SIZE, (3, 6, 13)))
        self.wetland = _normalize01(_value_noise(geo_rng, FINE_SIZE, (2, 4, 9)))
        self.fossil_activity = _normalize01(_value_noise(geo_rng, FINE_SIZE, (4, 9, 20)))

        # Wetland/vegetation are anti-correlated with fossil/population in reality
        # (undeveloped land vs. built/industrial land) — enforce that lightly.
        self.fossil_activity = _normalize01(self.fossil_activity * (1 - 0.3 * self.wetland))

        weighted = (
            profile["population"] * self.population
            + profile["vegetation"] * self.vegetation
            + profile["wetland"] * self.wetland
            + profile["fossil"] * self.fossil_activity
        )
        # Emissions concentrate non-linearly (hotspots), not spread evenly.
        hotspot = weighted**1.8

        # Activity noise (day-to-day/seasonal variation) is variant- and
        # gas-specific — this is what changes between "time slices" of the
        # same region/geography.
        activity_seed = _seed_from(f"{region.region_id}:{variant}", gas)
        activity_rng = np.random.default_rng(activity_seed)
        activity_wobble = 1.0 + 0.12 * (_value_noise(activity_rng, FINE_SIZE, (3, 7)) - 0.5)
        noise_floor = 0.03 * activity_rng.random((FINE_SIZE, FINE_SIZE))
        self.fine_truth = (hotspot * activity_wobble + noise_floor) * GAS_SCALE[gas]

        self.land_cover_class = np.select(
            [self.wetland > 0.6, self.vegetation > 0.55, self.fossil_activity > 0.55, self.population > 0.55],
            ["wetland", "vegetation", "industrial", "urban"],
            default="mixed",
        )

    def coarse_grid(self) -> np.ndarray:
        return self.fine_truth.reshape(COARSE_SIZE, COARSE_FACTOR, COARSE_SIZE, COARSE_FACTOR).sum(axis=(1, 3))

    def predictor_stack(self) -> np.ndarray:
        """Shape (4, FINE_SIZE, FINE_SIZE): population, vegetation, wetland, fossil."""
        return np.stack([self.population, self.vegetation, self.wetland, self.fossil_activity])

    def lat_lon_grids(self) -> tuple[np.ndarray, np.ndarray]:
        min_lon, min_lat, max_lon, max_lat = self.region.bbox
        lons = np.linspace(min_lon, max_lon, FINE_SIZE)
        lats = np.linspace(max_lat, min_lat, FINE_SIZE)  # north to south
        return np.meshgrid(lons, lats)


def build_scene(region: Region, gas: Gas, variant: int = 0) -> SyntheticScene:
    return SyntheticScene(region, gas, variant)
