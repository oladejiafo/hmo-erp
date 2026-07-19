"""
routers/_client.py
──────────────────
Shared async wrapper around Anthropic Claude (primary) with OpenAI fallback.
All routers import call_ai() - they never touch the SDK directly.
"""

import json
import logging
import os
import re
import sys

import anthropic
import openai

# Configure logging to actually show
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("ai-microservice.client")
logger.setLevel(logging.INFO)

# Force log to show immediately
logger.info("=" * 50)
logger.info("CLIENT.PY IS LOADING")
logger.info("=" * 50)

# Get API keys from environment
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Log key presence (but not the actual keys)
logger.info(f"ANTHROPIC_API_KEY present: {bool(ANTHROPIC_API_KEY)}")
if ANTHROPIC_API_KEY:
    logger.info(f"ANTHROPIC_API_KEY length: {len(ANTHROPIC_API_KEY)}")
    logger.info(f"ANTHROPIC_API_KEY prefix: {ANTHROPIC_API_KEY[:10]}...")
    
logger.info(f"OPENAI_API_KEY present: {bool(OPENAI_API_KEY)}")
if OPENAI_API_KEY:
    logger.info(f"OPENAI_API_KEY length: {len(OPENAI_API_KEY)}")
    logger.info(f"OPENAI_API_KEY prefix: {OPENAI_API_KEY[:10]}...")

# Log current working directory
logger.info(f"Current working directory: {os.getcwd()}")

# Check if .env file exists
env_path = os.path.join(os.getcwd(), '.env')
logger.info(f".env file exists at {env_path}: {os.path.exists(env_path)}")

# Initialize clients safely
_anthropic = None
_openai = None

if ANTHROPIC_API_KEY:
    try:
        logger.info("Attempting to initialize Anthropic client...")
        _anthropic = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        logger.info("✅ Anthropic client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Anthropic client: {e}", exc_info=True)
else:
    logger.warning("⚠️ ANTHROPIC_API_KEY not set - Claude features will fall back to OpenAI")

if OPENAI_API_KEY:
    try:
        logger.info("Attempting to initialize OpenAI client...")
        _openai = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        logger.info("✅ OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize OpenAI client: {e}", exc_info=True)
else:
    logger.warning("⚠️ OPENAI_API_KEY not set - some features may be limited")

AI_MODEL = os.getenv("AI_MODEL", "claude-3-5-sonnet-20241022")
MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", 1024))

logger.info(f"AI_MODEL: {AI_MODEL}")
logger.info(f"MAX_TOKENS: {MAX_TOKENS}")
logger.info("=" * 50)


async def call_ai(
    system: str,
    user_message: str,
    max_tokens: int = MAX_TOKENS,
    expect_json: bool = False,
    model: str = AI_MODEL,
) -> dict | str | None:
    """
    Call AI service with graceful fallback:
    1. Try Claude first if available
    2. Fall back to OpenAI if Claude fails
    3. Return None only if both fail
    """
    logger.info(f"call_ai called with model: {model}, expect_json: {expect_json}")
    logger.info(f"system prompt length: {len(system)}, user message length: {len(user_message)}")
    
    errors = []
    
    # Try Claude first
    if _anthropic:
        logger.info("Attempting Claude call...")
        try:
            response = await _anthropic.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_message}],
            )
            text = response.content[0].text.strip()
            logger.info(f"✅ Claude call successful, response length: {len(text)}")
            
            if expect_json:
                parsed = _parse_json(text)
                logger.info(f"JSON parsed: {parsed is not None}")
                return parsed
            return text
        except Exception as e:
            error_msg = f"Claude call failed: {type(e).__name__}: {e}"
            logger.warning(error_msg)
            logger.warning("Exception details:", exc_info=True)
            errors.append(error_msg)
    else:
        errors.append("Anthropic client not initialized")
        logger.warning("Skipping Claude - client not initialized")
    
    # Fall back to OpenAI
    if _openai:
        logger.info("Attempting OpenAI fallback...")
        try:
            resp = await _openai.chat.completions.create(
                model="gpt-4o",
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_message},
                ],
            )
            text = resp.choices[0].message.content.strip()
            logger.info(f"✅ OpenAI fallback successful, response length: {len(text)}")
            
            if expect_json:
                parsed = _parse_json(text)
                logger.info(f"JSON parsed: {parsed is not None}")
                return parsed
            return text
        except Exception as e:
            error_msg = f"OpenAI fallback also failed: {type(e).__name__}: {e}"
            logger.error(error_msg)
            logger.error("Exception details:", exc_info=True)
            errors.append(error_msg)
    else:
        errors.append("OpenAI client not initialized")
        logger.warning("Skipping OpenAI - client not initialized")
    
    # Both failed
    logger.error(f"❌ All AI providers failed: {'; '.join(errors)}")
    return None


async def call_vision(
    system: str,
    user_message: str,
    image_base64: str,
    media_type: str = "image/jpeg",
    max_tokens: int = 1024,
) -> dict | None:
    """
    Call Claude vision with OpenAI fallback.
    Returns None only if both fail.
    """
    logger.info(f"call_vision called with media_type: {media_type}")
    logger.info(f"image_base64 length: {len(image_base64)}")
    
    errors = []
    
    # Try Claude vision first
    if _anthropic:
        logger.info("Attempting Claude vision...")
        try:
            response = await _anthropic.messages.create(
                model=AI_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": user_message},
                    ],
                }],
            )
            logger.info("✅ Claude vision successful")
            return _parse_json(response.content[0].text.strip())
        except Exception as e:
            error_msg = f"Claude vision failed: {type(e).__name__}: {e}"
            logger.warning(error_msg)
            logger.warning("Exception details:", exc_info=True)
            errors.append(error_msg)
    else:
        errors.append("Anthropic client not initialized")
    
    # Try OpenAI vision as fallback
    if _openai and media_type != "application/pdf":  # OpenAI doesn't support PDF directly
        logger.info("Attempting OpenAI vision fallback...")
        try:
            resp = await _openai.chat.completions.create(
                model="gpt-4o",
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{image_base64}"
                                },
                            },
                            {"type": "text", "text": user_message},
                        ],
                    },
                ],
            )
            logger.info("✅ OpenAI vision fallback successful")
            return _parse_json(resp.choices[0].message.content.strip())
        except Exception as e:
            error_msg = f"OpenAI vision fallback failed: {type(e).__name__}: {e}"
            logger.error(error_msg)
            logger.error("Exception details:", exc_info=True)
            errors.append(error_msg)
    elif media_type == "application/pdf":
        errors.append("OpenAI doesn't support PDF vision")
        logger.warning("OpenAI doesn't support PDF vision - skipping")
    else:
        errors.append("OpenAI client not initialized")
    
    logger.error(f"❌ All vision providers failed: {'; '.join(errors)}")
    return None


def _parse_json(text: str) -> dict | None:
    """Strip markdown fences and parse JSON. Returns None on failure."""
    # Remove ```json ... ``` or ``` ... ```
    original = text
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    
    if original != text:
        logger.info("Removed markdown fences from response")
    
    try:
        parsed = json.loads(text.strip())
        logger.info("JSON parsed successfully")
        return parsed
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed: {e}")
        logger.warning(f"Raw text preview: {text[:200]}")
        return None