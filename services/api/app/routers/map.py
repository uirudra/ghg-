from fastapi import APIRouter

from app.data.regions import REGIONS

router = APIRouter(tags=["map"])

LAYER_CATALOG = [
    {"id": "coarse_input", "label": "Coarse Scientific Estimate", "provenance": "Modeled", "source": "downscale/run"},
    {"id": "ml_downscaled", "label": "ML-Downscaled Allocation", "provenance": "ML-downscaled", "source": "downscale/run"},
    {"id": "uncertainty_p10", "label": "Uncertainty — P10 (low bound)", "provenance": "ML-downscaled", "source": "downscale/run"},
    {"id": "uncertainty_p90", "label": "Uncertainty — P90 (high bound)", "provenance": "ML-downscaled", "source": "downscale/run"},
    {"id": "baseline_area_weighted", "label": "Baseline — Area-Weighted", "provenance": "Modeled", "source": "downscale/run"},
    {"id": "baseline_single_predictor", "label": "Baseline — Single Predictor", "provenance": "Modeled", "source": "downscale/run"},
    {"id": "methane_events", "label": "Methane Event Markers", "provenance": "Observed", "source": "events"},
]


@router.get("/map/layers")
async def get_layers():
    return {
        "layers": LAYER_CATALOG,
        "regions": [{"region_id": r.region_id, "name": r.name, "bbox": r.bbox} for r in REGIONS],
        "gases": ["CO2", "CH4"],
    }
