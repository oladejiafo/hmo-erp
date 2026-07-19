"""
routers/ocr.py
───────────────
POST /ocr

Extracts structured fields from a claim document image or PDF.
Uses Claude's vision capabilities (primary) or GPT-4o (fallback if configured).

Input:
    filename      Original filename
    content_type  application/pdf | image/jpeg | image/png
    content       Base64-encoded file content
    claim_id      Optional - for context in the prompt

Output:
    patient_name      str
    service_date      str  (ISO date YYYY-MM-DD if parseable)
    diagnosis         str
    items             list of { service, quantity, price }
    total_amount      float
    provider_name     str
    provider_code     str
    provider_address  str
    raw_text          str  (best-effort full text extraction)
    confidence_scores dict (per-field confidence 0-100)
"""

import base64
import logging
import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from routers._client import call_vision

logger = logging.getLogger("ai-microservice.ocr")
router = APIRouter()


class OcrRequest(BaseModel):
    filename:     str
    content_type: str
    content:      str  # base64-encoded
    claim_id:     Optional[int] = None


class OcrItem(BaseModel):
    service:  str
    quantity: Optional[int] = 1
    price:    Optional[float] = None


class OcrResponse(BaseModel):
    patient_name:      Optional[str] = None
    service_date:      Optional[str] = None
    diagnosis:         Optional[str] = None
    items:             list[OcrItem] = []
    total_amount:      Optional[float] = None
    provider_name:     Optional[str] = None
    provider_code:     Optional[str] = None
    provider_address:  Optional[str] = None
    raw_text:          Optional[str] = None
    confidence_scores: dict = {}


SYSTEM_PROMPT = """
You are an OCR extraction engine for a Nigerian HMO claims department.
Extract all structured data from this medical bill or claim document.

Return ONLY a JSON object with these fields (use null if not found):
{
  "patient_name":      "full name of patient",
  "service_date":      "date of service in YYYY-MM-DD format",
  "diagnosis":         "primary diagnosis or presenting complaint",
  "provider_name":     "name of hospital/clinic/pharmacy",
  "provider_code":     "HCP code or provider ID if visible",
  "provider_address":  "address of provider",
  "total_amount":      numeric total amount in naira (no currency symbol, no commas),
  "items": [
    { "service": "item/service name", "quantity": integer, "price": numeric }
  ],
  "raw_text": "complete extracted text from the document",
  "confidence_scores": {
    "patient_name": 0-100,
    "total_amount": 0-100,
    "service_date": 0-100,
    "provider_name": 0-100,
    "items": 0-100
  }
}

Important:
- Amounts should be plain numbers (e.g. 45000, not ₦45,000)
- Dates must be YYYY-MM-DD (convert DD/MM/YYYY as needed)
- Include ALL line items from the bill
- Return ONLY valid JSON - no preamble, no markdown fences
"""


@router.post("/ocr", response_model=OcrResponse)
async def ocr_document(req: OcrRequest):
    """
    Run OCR on a claim document using Claude Vision.
    Falls back to GPT-4o Vision if Claude is unavailable.
    """
    # Validate base64 and size
    try:
        raw_bytes = base64.b64decode(req.content)
        if len(raw_bytes) > 20 * 1024 * 1024:  # 20MB limit
            return OcrResponse(
                raw_text="Document too large (max 20MB)",
                confidence_scores={},
            )
    except Exception as e:
        logger.error(f"Base64 decode failed: {e}")
        return OcrResponse(
            raw_text="Invalid base64 encoding",
            confidence_scores={},
        )

    # Determine media type for vision API
    media_type = req.content_type
    if media_type not in ("image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"):
        media_type = "image/jpeg"  # fallback

    # Add claim_id context if provided
    user_message = "Extract all data from this claim document."
    if req.claim_id:
        user_message = f"Extract all data from claim document #{req.claim_id}."

    result = await call_vision(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        image_base64=req.content,
        media_type=media_type,
        max_tokens=1500,
    )

    if not result:
        return OcrResponse(
            raw_text="OCR service unavailable. Please process this document manually.",
            confidence_scores={},
        )

    # Parse items
    items = []
    for i in result.get("items", []):
        items.append(OcrItem(
            service=i.get("service", ""),
            quantity=i.get("quantity", 1),
            price=_parse_float(i.get("price")),
        ))

    return OcrResponse(
        patient_name=result.get("patient_name"),
        service_date=result.get("service_date"),
        diagnosis=result.get("diagnosis"),
        items=items,
        total_amount=_parse_float(result.get("total_amount")),
        provider_name=result.get("provider_name"),
        provider_code=result.get("provider_code"),
        provider_address=result.get("provider_address"),
        raw_text=result.get("raw_text"),
        confidence_scores=result.get("confidence_scores", {}),
    )


def _parse_float(val) -> float | None:
    """Safely parse a value to float, handling string amounts."""
    if val is None:
        return None
    try:
        cleaned = re.sub(r"[^\d.]", "", str(val))
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None