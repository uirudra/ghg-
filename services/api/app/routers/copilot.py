import logging
import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.grounding import build_evidence_bundle, complete_with_fallback
from app.ai.prompts import COPILOT_SYSTEM_PROMPT
from app.db.mongo import get_db
from app.ml.events import generate_events_for_region

logger = logging.getLogger("ghg.routers.copilot")
router = APIRouter(tags=["copilot"])


class CopilotQuery(BaseModel):
    query: str
    region_id: str | None = None
    gas: str | None = None
    downscale_result: dict | None = None
    prefer_provider: str = "groq"


@router.get("/copilot/guide")
async def copilot_guide():
    """Static onboarding content the frontend renders as a 'how to use this' panel."""
    return {
        "title": "How to use the GHG Copilot",
        "summary": (
            "The Copilot only answers from a structured evidence bundle — dataset metadata, the region you've "
            "selected, and (if you've run one) your last ML Downscaler Lab result or the region's methane events. "
            "It never invents a number that isn't already in that evidence."
        ),
        "steps": [
            "Pick a region and gas in the sidebar (or in the ML Downscaler Lab / Methane Event Radar first).",
            "If you want the Copilot to talk about a specific downscaling run, run it in the Downscaler Lab first — "
            "its result is attached automatically as evidence for your next question here.",
            "Ask your question in plain language. Good questions reference the region, the gas, or a number you saw "
            "on another page.",
            "Every answer is labeled Observed / Modeled / ML-downscaled / AI-explained so you know what kind of "
            "claim you're reading, and which dataset it traces back to.",
            "If the Copilot says it doesn't have grounded evidence for something, that's the guardrail working as "
            "intended — open the relevant page (Explorer, Downscaler Lab, Event Radar) to generate that evidence "
            "first, then ask again.",
        ],
        "example_questions": [
            "What does the conservation error on my last downscaling run tell me?",
            "Which methane events in this region have the highest anomaly score, and why?",
            "Is the fine-resolution CO2 map a real satellite measurement?",
            "How does the ML-downscaled allocation compare to the area-weighted baseline here?",
            "What dataset is the coarse CH4 estimate for this region based on?",
        ],
        "guardrails": [
            "Numbers are only ever taken verbatim from evidence — never computed on the fly by the AI.",
            "Every claim is tagged with its provenance label.",
            "Fine-resolution outputs are always called ML-downscaled estimates, never measurements.",
            "If evidence is missing, the Copilot says so instead of guessing.",
        ],
        "providers": "Answers come from GroqCloud (fast) with automatic fallback to Gemini if Groq is unavailable.",
    }


@router.post("/copilot/query")
async def copilot_query(req: CopilotQuery):
    computed = {}
    if req.downscale_result:
        computed["last_downscale_run"] = {
            "region": req.downscale_result.get("region", {}).get("name"),
            "gas": req.downscale_result.get("gas"),
            "totals": req.downscale_result.get("totals"),
            "ablation": req.downscale_result.get("ablation"),
            "model_version": req.downscale_result.get("model_version"),
        }
    if req.region_id:
        computed["top_methane_events"] = generate_events_for_region(req.region_id, n_events=5)

    evidence = build_evidence_bundle(req.region_id, req.gas, computed)
    result = complete_with_fallback(COPILOT_SYSTEM_PROMPT, evidence, req.query, prefer=req.prefer_provider)  # type: ignore[arg-type]

    session_id = str(uuid.uuid4())
    session_doc = {
        "session_id": session_id,
        "query": req.query,
        "provider": result["provider"],
        "retrieved_facts": [evidence],
        "response": result["response"],
        "citations": [d["dataset_id"] for d in evidence.get("datasets", [])][:5],
        "created_at": datetime.utcnow(),
    }
    try:
        db = get_db()
        await db.copilot_sessions.insert_one(session_doc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mongo persistence skipped (copilot_sessions): %s", exc)

    return {
        "session_id": session_id,
        "provider": result["provider"],
        "fallback_used": result["fallback_used"],
        "response": result["response"],
        "citations": session_doc["citations"],
        "evidence": evidence,
    }
