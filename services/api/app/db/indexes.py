import logging

from app.db.mongo import get_db

logger = logging.getLogger("ghg.db")


async def ensure_indexes():
    """Create indexes idempotently. Safe to call on every startup."""
    db = get_db()
    try:
        await db.datasets.create_index("dataset_id", unique=True)
        await db.regions.create_index("region_id", unique=True)
        await db.regions.create_index([("boundary", "2dsphere")])
        await db.grid_products.create_index("run_id", unique=True)
        await db.grid_products.create_index([("region_id", 1), ("gas", 1), ("created_at", -1)])
        await db.events.create_index([("location", "2dsphere")])
        await db.events.create_index([("gas", 1), ("observed_at", -1)])
        await db.model_runs.create_index("run_id", unique=True)
        await db.copilot_sessions.create_index([("created_at", -1)])
        await db.alerts.create_index([("region_id", 1), ("gas", 1), ("created_at", -1)])
    except Exception as exc:  # noqa: BLE001
        logger.warning("Index creation skipped/failed (DB may be unreachable): %s", exc)
