import logging
import time

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger("ghg.db")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None

# Cached connectivity state so /health (hit frequently by load balancers /
# platform health checks) never blocks on a live server-selection round trip
# — it just reports the most recent known status instantly.
_last_ok: bool = False
_last_checked_at: float = 0.0


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(
            settings.mongodb_uri, serverSelectionTimeoutMS=3000, tlsCAFile=certifi.where()
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        settings = get_settings()
        _db = get_client()[settings.mongodb_db_name]
    return _db


async def ping() -> bool:
    """A real (blocking, up to serverSelectionTimeoutMS) connectivity check.
    Call this at startup and after config changes — not from hot paths."""
    global _last_ok, _last_checked_at
    try:
        await get_client().admin.command("ping")
        _last_ok = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("MongoDB ping failed: %s", exc)
        _last_ok = False
    _last_checked_at = time.time()
    return _last_ok


def cached_status() -> dict:
    """Non-blocking status for health checks — never awaits I/O."""
    return {"mongodb_connected": _last_ok, "last_checked_seconds_ago": round(time.time() - _last_checked_at, 1) if _last_checked_at else None}


async def close():
    global _client
    if _client is not None:
        _client.close()
        _client = None
