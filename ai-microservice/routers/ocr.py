"""
routers/ocr.py
───────────────
POST /ocr

Extracts structured fields from a claim document image or PDF.
Uses Claude's vision capabilities (primary) or GPT-4o (fallback if configured).

Input:
    file_base64  Base64-encoded file content
    mime_type    application/pdf | image/jpeg | image/png
    claim_id     Optional — for context in the prompt

Output:
    patient_name     str
    date_of_service  str  (ISO date YYYY-MM-DD if parseable)
    diagnosis        str
    procedures       list of { code, name, amount }
    total_amount     float
    provider_name    str
    provider_code    str
    raw_text         str  (best-effort full text extraction)
    confidence       int  (0-100)
    fields_found     list of field names successfully extracted
"""

import base64
import logging
import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

# from routers._client import call_claude, claude_client, claude_model, openai_client
from routers._client import claude_client, claude_model, openai_client
logger = logging.getLogger("ai-microservice.ocr")
router = APIRouter()


class OcrRequest(BaseModel):
    file_base64:  str
    mime_type:    Optional[str] = "application/pdf"
    claim_id:     Optional[int] = None


class ProcedureItem(BaseModel):
    code:   Optional[str] = None
    name:   Optional[str] = None
    amount: Optional[float] = None


class OcrResponse(BaseModel):
    patient_name:    Optional[str] = None
    date_of_service: Optional[str] = None
    diagnosis:       Optional[str] = None
    procedures:      list = []
    total_amount:    Optional[float] = None
    provider_name:   Optional[str] = None
    provider_code:   Optional[str] = None
    raw_text:        str = ""
    confidence:      int = 0
    fields_found:    list = []


OCR_SYSTEM = """
You are a medical document OCR specialist for a Nigerian HMO.

Extract structured information from the claim document and return a JSON object:
{
  "patient_name":    "Full name as it appears on the document",
  "date_of_service": "YYYY-MM-DD format if possible, else as written",
  "diagnosis":       "Primary diagnosis or chief complaint",
  "procedures":      [{"code": "SVC code or null", "name": "procedure name", "amount": numeric or null}],
  "total_amount":    numeric value in Naira (no commas or currency symbols),
  "provider_name":   "Hospital/clinic name",
  "provider_code":   "NHIA code or HCP code if visible",
  "raw_text":        "Complete extracted text from the document",
  "confidence":      integer 0-100 (how confident you are in the extraction)
}

Extraction tips:
- Nigerian hospital receipts often list drug names, consultation fees, lab costs separately
- Dates may be written as DD/MM/YYYY — convert to YYYY-MM-DD
- Amounts are in Naira (₦) — extract as plain numbers
- If a field is not present, set it to null
- Return ONLY valid JSON — no preamble, no markdown fences
"""


@router.post("/ocr", response_model=OcrResponse)
async def ocr(req: OcrRequest):
    """
    Run OCR on a claim document using Claude Vision.
    Falls back to GPT-4o Vision if Claude is unavailable.
    """
    # Validate and decode base64
    try:
        raw_bytes = base64.b64decode(req.file_base64)
        if len(raw_bytes) > 20 * 1024 * 1024:  # 20MB limit
            return OcrResponse(
                raw_text="",
                confidence=0,
                fields_found=[],
            )
    except Exception as e:
        logger.error(f"Base64 decode failed: {e}")
        return OcrResponse(raw_text="", confidence=0, fields_found=[])

    # Determine media type for vision API
    media_type = req.mime_type or "application/pdf"
    if media_type not in ("image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"):
        media_type = "image/jpeg"  # fallback

    result = await _ocr_with_claude(req.file_base64, media_type, req.claim_id)

    if not result and openai_client:
        logger.info("Claude OCR failed — trying GPT-4o fallback")
        result = await _ocr_with_openai(req.file_base64, media_type)

    if not result:
        return OcrResponse(raw_text="", confidence=0, fields_found=[])

    # Determine which fields were successfully extracted
    fields_found = [
        key for key in ("patient_name", "date_of_service", "diagnosis",
                        "total_amount", "provider_name", "provider_code")
        if result.get(key) is not None
    ]

    return OcrResponse(
        patient_name=result.get("patient_name"),
        date_of_service=result.get("date_of_service"),
        diagnosis=result.get("diagnosis"),
        procedures=result.get("procedures") or [],
        total_amount=_parse_float(result.get("total_amount")),
        provider_name=result.get("provider_name"),
        provider_code=result.get("provider_code"),
        raw_text=result.get("raw_text") or "",
        confidence=int(result.get("confidence") or 0),
        fields_found=fields_found,
    )


async def _ocr_with_claude(file_b64: str, media_type: str, claim_id: int | None) -> dict | None:
    """Use Claude Vision for OCR."""
    if not claude_client:
        return None

    import anthropic

    try:
        # For PDFs, Claude supports document blocks; for images, image blocks
        if media_type == "application/pdf":
            content_block = {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": file_b64,
                },
            }
        else:
            content_block = {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": file_b64,
                },
            }

        response = await claude_client.messages.create(
            model=claude_model,
            max_tokens=1500,
            system=OCR_SYSTEM,
            messages=[{
                "role": "user",
                "content": [
                    content_block,
                    {
                        "type": "text",
                        "text": f"Extract all structured fields from this claim document.{' (Claim ID: ' + str(claim_id) + ')' if claim_id else ''}",
                    },
                ],
            }],
        )

        text = response.content[0].text if response.content else ""
        return _parse_json_response(text)

    except Exception as e:
        logger.error(f"Claude Vision OCR error: {e}", exc_info=True)
        return None


async def _ocr_with_openai(file_b64: str, media_type: str) -> dict | None:
    """GPT-4o Vision fallback for OCR."""
    if not openai_client:
        return None

    try:
        # GPT-4o only supports image types, not PDF directly
        if media_type == "application/pdf":
            logger.info("PDF OCR via OpenAI not supported — skipping")
            return None

        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{file_b64}"},
                    },
                    {
                        "type": "text",
                        "text": OCR_SYSTEM + "\n\nExtract all structured fields from this claim document.",
                    },
                ],
            }],
        )

        text = response.choices[0].message.content if response.choices else ""
        return _parse_json_response(text)

    except Exception as e:
        logger.error(f"OpenAI Vision OCR error: {e}", exc_info=True)
        return None


def _parse_json_response(text: str) -> dict | None:
    """Parse JSON from AI response, stripping markdown fences."""
    import json
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines   = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error(f"OCR JSON parse failed. Raw: {text[:300]}")
        return None


def _parse_float(val) -> float | None:
    """Safely parse a value to float, handling string amounts."""
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None