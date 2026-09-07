import logging

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger("ghg.ai.gemini")

_configured = False


def _ensure_configured():
    global _configured
    if not _configured:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


def complete(system_prompt: str, user_prompt: str, max_tokens: int = 900) -> str:
    _ensure_configured()
    settings = get_settings()
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system_prompt,
        generation_config={"temperature": 0.25, "max_output_tokens": max_tokens},
    )
    response = model.generate_content(user_prompt)
    return response.text or ""
