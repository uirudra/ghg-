import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.grounding import build_evidence_bundle, complete_with_fallback
from app.ai.prompts import DECISION_BRIEF_SYSTEM_PROMPT
from app.data.regions import get_region
from app.db.mongo import get_db
from app.ml.events import generate_events_for_region

logger = logging.getLogger("ghg.routers.decision_brief")
router = APIRouter(tags=["decision-brief"])


class DecisionBriefRequest(BaseModel):
    region_id: str
    gas: str
    downscale_result: dict | None = None
    prefer_provider: str = "groq"


@router.post("/decision-brief")
async def generate_decision_brief(req: DecisionBriefRequest):
    region = get_region(req.region_id)
    if region is None:
        raise HTTPException(404, f"Unknown region_id: {req.region_id}")

    top_events = generate_events_for_region(req.region_id, n_events=5)
    computed = {"top_methane_events": top_events}
    if req.downscale_result:
        computed["downscale_summary"] = {
            "totals": req.downscale_result.get("totals"),
            "ablation": req.downscale_result.get("ablation"),
            "model_version": req.downscale_result.get("model_version"),
            "provenance": req.downscale_result.get("provenance"),
        }

    evidence = build_evidence_bundle(req.region_id, req.gas, computed)
    question = (
        f"Draft an intervention brief for {region.name} covering {req.gas}. "
        "Use only the evidence provided."
    )
    result = complete_with_fallback(
        DECISION_BRIEF_SYSTEM_PROMPT, evidence, question, prefer=req.prefer_provider, max_tokens=2200  # type: ignore[arg-type]
    )

    brief_id = str(uuid.uuid4())
    doc = {
        "brief_id": brief_id,
        "region_id": req.region_id,
        "gas": req.gas,
        "provider": result["provider"],
        "brief": result["response"],
        "top_events": top_events,
        "created_at": datetime.utcnow(),
    }
    try:
        db = get_db()
        await db.copilot_sessions.insert_one({**doc, "session_id": brief_id, "query": question, "response": result["response"], "retrieved_facts": [evidence], "citations": []})
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mongo persistence skipped (decision brief): %s", exc)

    return {
        "brief_id": brief_id,
        "region": region.model_dump(),
        "gas": req.gas,
        "provider": result["provider"],
        "fallback_used": result["fallback_used"],
        "brief": result["response"],
        "top_events": top_events,
        "evidence": evidence,
    }
