import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.regions import get_region
from app.db.mongo import get_db
from app.ml.downscaler import get_train_metadata, run_downscale

logger = logging.getLogger("ghg.routers.downscale")
router = APIRouter(tags=["downscale"])

# In-memory fallback cache so the demo stays functional even if MongoDB Atlas
# is unreachable (e.g. IP not yet allow-listed) — Mongo writes are best-effort.
_run_cache: dict[str, dict] = {}


class DownscaleRequest(BaseModel):
    region_id: str
    gas: str
    variant: int = 0
    holdout_test: bool = False


@router.post("/downscale/run")
async def start_downscale(req: DownscaleRequest):
    if get_region(req.region_id) is None:
        raise HTTPException(404, f"Unknown region_id: {req.region_id}")
    if req.gas not in ("CO2", "CH4"):
        raise HTTPException(400, "gas must be CO2 or CH4")

    result = run_downscale(req.region_id, req.gas, req.variant, req.holdout_test)  # type: ignore[arg-type]
    run_id = str(uuid.uuid4())
    result["run_id"] = run_id
    result["created_at"] = datetime.utcnow().isoformat() + "Z"
    result["train_metadata"] = get_train_metadata()

    _run_cache[run_id] = result

    try:
        db = get_db()
        await db.grid_products.insert_one(
            {
                "run_id": run_id,
                "region_id": req.region_id,
                "gas": req.gas,
                "resolution_fine_km": None,
                "coarse_total": result["totals"]["coarse_total"],
                "fine_total": result["totals"]["ml_fine_total"],
                "conservation_error": result["ablation"]["ml_downscaled"]["conservation_error"],
                "model_version": result["model_version"],
                "stats": result["ablation"],
                "created_at": datetime.utcnow(),
            }
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mongo persistence skipped (grid_products): %s", exc)

    return result


@router.get("/downscale/{run_id}")
async def get_downscale(run_id: str):
    if run_id in _run_cache:
        return _run_cache[run_id]

    try:
        db = get_db()
        doc = await db.grid_products.find_one({"run_id": run_id}, {"_id": 0})
        if doc:
            return doc
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mongo lookup failed: %s", exc)

    raise HTTPException(404, "Run not found (not in memory cache or MongoDB)")
