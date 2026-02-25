"""
routers/classify.py
────────────────────
POST /classify

Classifies a claim document from extracted text.
Returns claim_type, ICD-10 suggestions, PA requirement, specialties, confidence.

Called by Laravel's AIController::classify() when a claims officer pastes
document text or triggers classification from a claim record.
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

# from routers._client import call_claude
from routers._client import call_ai

logger = logging.getLogger("ai-microservice.classify")
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    text:            Optional[str]  = Field(None, description="Extracted document text")
    diagnosis_codes: Optional[list] = Field(None, description="Existing ICD codes on the claim")
    hcp_type:        Optional[str]  = Field(None, description="HCP type: hospital/clinic/pharmacy…")
    amount_claimed:  Optional[float]= Field(None)
    user_id:         Optional[int]  = None


class ClassifyResponse(BaseModel):
    claim_type:  str
    specialties: list
    icd_codes:   list
    pa_required: bool
    confidence:  int
    reasoning:   str


# ── Endpoint ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are a medical claims classification expert for a Nigerian HMO operating under NHIA regulations.

Analyse the provided claim document text and return a JSON object with these fields:
{
  "claim_type": one of ["outpatient", "inpatient", "dental", "optical", "maternity",
                        "surgical", "emergency", "chronic_care", "physiotherapy",
                        "laboratory", "radiology", "pharmacy"],
  "specialties": list of relevant medical specialties (e.g. ["cardiology", "internal medicine"]),
  "icd_codes":   list of suggested ICD-10 codes that match the document (max 5),
  "pa_required": true if this claim type/amount typically requires Pre-Authorisation under NHIA rules,
  "confidence":  integer 0-100 representing classification confidence,
  "reasoning":   brief 1-2 sentence explanation of your classification
}

Rules:
- pa_required = true for: inpatient, surgical, maternity, emergency, high-cost outpatient (>₦100k)
- Use official ICD-10 codes (e.g. J06.9 for URTI)
- If text is very short/ambiguous, set confidence < 50
- Return ONLY valid JSON — no preamble, no markdown code fences
"""


@router.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    """
    Classify a claim document.

    Accepts extracted text from a claim document and optional context fields.
    Returns structured classification result.
    """
    # Build user message
    parts = []

    if req.text:
        parts.append(f"DOCUMENT TEXT:\n{req.text[:10000]}")

    if req.hcp_type:
        parts.append(f"HCP TYPE: {req.hcp_type}")

    if req.amount_claimed:
        parts.append(f"AMOUNT CLAIMED: ₦{req.amount_claimed:,.2f}")

    if req.diagnosis_codes:
        parts.append(f"EXISTING ICD CODES: {', '.join(str(c) for c in req.diagnosis_codes)}")

    if not parts:
        # Nothing to classify — return low-confidence default
        return ClassifyResponse(
            claim_type="outpatient",
            specialties=[],
            icd_codes=[],
            pa_required=False,
            confidence=0,
            reasoning="No document text provided for classification.",
        )

    user_message = "\n\n".join(parts)

    result = await call_ai(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=512,
        expect_json=True,
    )

    if not result:
        # Rule-based fallback
        logger.warning("Claude unavailable — using rule-based classification fallback")
        pa_required = bool(req.amount_claimed and req.amount_claimed > 100_000)
        return ClassifyResponse(
            claim_type="outpatient",
            specialties=[],
            icd_codes=req.diagnosis_codes or [],
            pa_required=pa_required,
            confidence=20,
            reasoning="AI unavailable — rule-based fallback applied.",
        )

    return ClassifyResponse(
        claim_type=result.get("claim_type", "outpatient"),
        specialties=result.get("specialties", []),
        icd_codes=result.get("icd_codes", []),
        pa_required=bool(result.get("pa_required", False)),
        confidence=int(result.get("confidence", 50)),
        reasoning=result.get("reasoning", ""),
    )