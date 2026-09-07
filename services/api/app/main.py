import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import cached_status
from app.db.mongo import close as close_mongo
from app.db.mongo import ping as ping_mongo
from app.routers import copilot, datasets, decision_brief, downscale, events, map as map_router, model_card

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ghg.main")

app = FastAPI(
    title="GHG Intelligence Nexus API",
    description="Conservation-constrained ML downscaling, methane event intelligence, and grounded AI copilot "
    "for the NASA Space Apps GHG Intelligence Nexus project.",
    version="0.1.0",
)

settings = get_settings()
_cors_origins = settings.cors_origins
# No cookies/auth are used anywhere in this API, so a wildcard is safe here
# (the browser spec forbids "*" together with allow_credentials=True, which
# is why credentials stays off). Set API_CORS_ORIGINS to a comma-separated
# list of real origins in production if you want to lock this down.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(map_router.router)
app.include_router(downscale.router)
app.include_router(events.router)
app.include_router(copilot.router)
app.include_router(decision_brief.router)
app.include_router(model_card.router)


async def _mongo_watchdog():
    """Re-checks MongoDB connectivity every 30s in the background so
    `/health` (and the cached status generally) recovers automatically after
    a transient outage — e.g. an IP falling off Atlas's Network Access list —
    without needing a process restart."""
    while True:
        await asyncio.sleep(30)
        try:
            await ping_mongo()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Mongo watchdog check failed: %s", exc)


@app.on_event("startup")
async def on_startup():
    mongo_ok = await ping_mongo()
    if mongo_ok:
        await ensure_indexes()
        logger.info("MongoDB Atlas connected and indexes ensured.")
    else:
        logger.warning(
            "MongoDB Atlas is unreachable at startup — the API will still serve requests, but "
            "persistence (grid_products/events/copilot_sessions/etc) will be skipped until it recovers. "
            "Check Atlas Network Access (IP allow-list) and the credentials in .env."
        )
    asyncio.create_task(_mongo_watchdog())


@app.on_event("shutdown")
async def on_shutdown():
    await close_mongo()


@app.get("/health")
async def health():
    # Non-blocking: reports the watchdog's last-known status instantly rather
    # than awaiting a fresh server-selection round trip on every call, so
    # platform health checks (Render, etc.) never time out because of Mongo.
    return {"status": "ok", **cached_status()}
