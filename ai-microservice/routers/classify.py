"""
routers/classify.py
────────────────────
POST /classify

Classifies a claim document: determines claim type, suggests ICD-10 codes,
flags PA requirement, and provides confidence score + reasoning.

Input:  { document_text: str, claim_id?: str }
Output: { claim_type, icd_codes, pa_required, confidence, reasoning }
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from routers._client import call_ai

logger = logging.getLogger("ai-microservice.classify")
router = APIRouter()


class ClassifyRequest(BaseModel):
    document_text: str
    claim_id: Optional[str] = None


class ClassifyResponse(BaseModel):
    claim_type:  str
    icd_codes:   list[str]
    pa_required: bool
    confidence:  int          # 0–100
    reasoning:   str


SYSTEM_PROMPT = """
You are a medical coding expert for a Nigerian HMO operating under NHIA regulations.
Classify the provided claim document and return ONLY a JSON object:

{
  "claim_type":  "one of: outpatient | inpatient | maternity | surgery | dental | optical | emergency | pharmacy | investigation",
  "icd_codes":   ["ICD-10 codes suggested, max 5"],
  "pa_required": true or false,
  "confidence":  integer 0-100,
  "reasoning":   "brief explanation of classification and PA decision"
}

PA (Pre-Authorization) is required for:
- Any inpatient admission
- Surgery of any kind
- High-cost investigations (CT scan, MRI, endoscopy)
- Maternity (elective procedures)
- Any claim likely to exceed ₦150,000

Use Nigerian medical terminology and NHIA claim categories.
Return ONLY valid JSON — no preamble, no markdown fences.
"""


@router.post("/classify", response_model=ClassifyResponse)
async def classify_document(req: ClassifyRequest):
    result = await call_ai(
        system=SYSTEM_PROMPT,
        user_message=f"Classify this claim document:\n\n{req.document_text[:4000]}",
        max_tokens=512,
        expect_json=True,
    )

    if not result:
        return ClassifyResponse(
            claim_type="unknown",
            icd_codes=[],
            pa_required=False,
            confidence=0,
            reasoning="AI service unavailable. Manual classification required.",
        )

    return ClassifyResponse(
        claim_type=result.get("claim_type", "unknown"),
        icd_codes=result.get("icd_codes", []),
        pa_required=bool(result.get("pa_required", False)),
        confidence=int(result.get("confidence", 0)),
        reasoning=result.get("reasoning", ""),
    )