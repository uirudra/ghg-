import logging

from fastapi import APIRouter

from app.db.mongo import get_db
from app.ml.events import generate_all_events, generate_events_for_region

logger = logging.getLogger("ghg.routers.events")
router = APIRouter(tags=["events"])


@router.get("/events")
async def list_events(region_id: str | None = None, limit: int = 40):
    events = generate_events_for_region(region_id) if region_id else generate_all_events()
    events = events[:limit]

    try:
        db = get_db()
        for e in events:
            await db.events.update_one({"event_id": e["event_id"]}, {"$set": e}, upsert=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mongo persistence skipped (events): %s", exc)

    return {"count": len(events), "events": events}
