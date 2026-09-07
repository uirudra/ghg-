from fastapi import APIRouter

from app.data.registry import DATASETS
from app.data.regions import REGIONS

router = APIRouter(tags=["datasets"])


@router.get("/datasets")
async def list_datasets(gas: str | None = None):
    items = [d for d in DATASETS if gas is None or d.variable == gas]
    return {"count": len(items), "datasets": [d.model_dump() for d in items]}


@router.get("/regions")
async def list_regions():
    return {"count": len(REGIONS), "regions": [r.model_dump() for r in REGIONS]}
