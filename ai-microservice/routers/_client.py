"""
routers/_client.py
──────────────────
Shared AI client supporting both Anthropic and OpenAI with fallback.
"""

import json
import logging
import os
from typing import Any, Optional, Dict
import anthropic
import openai

logger = logging.getLogger("ai-microservice.client")


# ── Configuration ─────────────────────────────────────────────────────────
_anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
_openai_key = os.getenv("OPENAI_API_KEY", "")

# Default model selection (can be overridden per call)
DEFAULT_PROVIDER = os.getenv("AI_DEFAULT_PROVIDER", "anthropic")  # or "openai"

# ── Initialize Clients ───────────────────────────────────────────────────

# ── Initialize Clients ───────────────────────────────────────────────────
print("=== DEBUG: Initializing clients ===")
print(f"ANTHROPIC_API_KEY exists: {bool(_anthropic_key)}")
print(f"OPENAI_API_KEY exists: {bool(_openai_key)}")

# OpenAI client
if _openai_key:
    try:
        openai_client = openai.AsyncOpenAI(api_key=_openai_key)
        print("✅ OpenAI client created successfully")
    except Exception as e:
        print(f"❌ Failed to create OpenAI client: {e}")
        openai_client = None
else:
    print("⚠️ No OpenAI key, client set to None")
    openai_client = None

print("================================")

# Anthropic client
claude_client = anthropic.AsyncAnthropic(api_key=_anthropic_key) if _anthropic_key else None
claude_model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

# OpenAI client
openai_client = openai.AsyncOpenAI(api_key=_openai_key) if _openai_key else None
openai_model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

# ── Main AI call function with provider selection ────────────────────────

async def call_ai(
    system: str,
    user_message: str,
    max_tokens: int = None,
    expect_json: bool = False,
    provider: str = None,  # "anthropic", "openai", or None for default
    temperature: float = 0.3,
) -> str | dict | None:
    """
    Call AI (Anthropic or OpenAI) and return response.
    
    Args:
        system: System prompt
        user_message: User message
        max_tokens: Max tokens to generate
        expect_json: Whether to parse response as JSON
        provider: Which provider to use ("anthropic", "openai")
        temperature: Temperature for generation
    
    Returns:
        Response text or parsed JSON, or None on failure
    """
    max_tokens = max_tokens or int(os.getenv("AI_MAX_TOKENS", "1024"))
    
    # Determine which provider to use
    provider = provider or DEFAULT_PROVIDER
    
    # Try primary provider
    if provider == "anthropic" and claude_client:
        logger.info("Attempting Anthropic call")
        result = await _call_anthropic(system, user_message, max_tokens, expect_json, temperature)
        if result:
            return result
        # Fallback to OpenAI if available
        if openai_client:
            logger.info("Anthropic failed, falling back to OpenAI")
            return await _call_openai(system, user_message, max_tokens, expect_json, temperature)
    
    elif provider == "openai" and openai_client:
        logger.info("Attempting OpenAI call")
        result = await _call_openai(system, user_message, max_tokens, expect_json, temperature)
        if result:
            return result
        # Fallback to Anthropic if available
        if claude_client:
            logger.info("OpenAI failed, falling back to Anthropic")
            return await _call_anthropic(system, user_message, max_tokens, expect_json, temperature)
    
    # If we get here, primary provider wasn't available or both failed
    # Try any available provider as last resort
    if claude_client:
        logger.info("Trying Claude as last resort")
        return await _call_anthropic(system, user_message, max_tokens, expect_json, temperature)
    
    if openai_client:
        logger.info("Trying OpenAI as last resort")
        return await _call_openai(system, user_message, max_tokens, expect_json, temperature)
    
    logger.error("No AI providers available")
    return None
# ── Provider-specific implementations ─────────────────────────────────────
async def _call_anthropic(
    system: str,
    user_message: str,
    max_tokens: int,
    expect_json: bool,
    temperature: float,
) -> str | dict | None:
    """Call Anthropic Claude"""
    try:
        response = await claude_client.messages.create(
            model=claude_model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )

        text = response.content[0].text if response.content else ""

        if expect_json:
            # Strip markdown code fences if present
            cleaned = text.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse failed: {e}\nRaw: {text[:200]}")
                return None

        return text

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected Anthropic error: {e}", exc_info=True)
        return None

async def _call_openai(
    system: str,
    user_message: str,
    max_tokens: int,
    expect_json: bool,
    temperature: float,
) -> str | dict | None:
    """Call OpenAI GPT"""
    try:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_message}
        ]
        
        response = await openai_client.chat.completions.create(
            model=openai_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            # removed response_format parameter
        )

        text = response.choices[0].message.content

        if expect_json:
            try:
                return json.loads(text)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse failed: {e}\nRaw: {text[:200]}")
                return None

        return text

    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected OpenAI error: {e}", exc_info=True)
        return None