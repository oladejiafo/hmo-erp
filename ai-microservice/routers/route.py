"""
routers/route.py
─────────────────
POST /route

Recommends a processing queue for a claim based on risk score, amount,
PA status, fraud flags, and HCP tier.

Input:  { claim_amount, claim_type, risk_score, pa_status,
          fraud_flags, hcp_tier, thresholds }
Output: { queue, priority, eta, reasoning, flags }
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from routers._client import call_ai

logger = logging.getLogger("ai-microservice.route")
router = APIRouter()

router = APIRouter()


class ThresholdsModel(BaseModel):
    high_value:  float = 500_000
    quarantine:  float = 70


class RouteRequest(BaseModel):
    claim_amount: float
    claim_type:   str
    risk_score:   float = 0
    pa_status:    Optional[str] = None
    fraud_flags:  int = 0
    hcp_tier:     Optional[str] = None
    thresholds:   Optional[ThresholdsModel] = None


class RouteResponse(BaseModel):
    queue:     str   # standard | medical_review | supervisor | finance | auto_approve
    priority:  str   # low | normal | high | urgent
    eta:       str
    reasoning: str
    flags:     list[str] = []


SYSTEM_PROMPT = """
You are a claims routing engine for a Nigerian HMO. Based on the provided claim data,
recommend the appropriate processing queue and priority level.

Queue definitions:
- auto_approve:   Low-value, low-risk, clean claim - approve without human review
- standard:       Normal claims officer queue (24-48 hour SLA)
- medical_review: Requires medical director sign-off (PA issues, complex diagnosis)
- supervisor:     Elevated risk score or fraud flags - supervisor must review
- finance:        High-value claims exceeding major financial thresholds

Priority levels: low | normal | high | urgent

Return ONLY a JSON object:
{
  "queue":     "queue name from above",
  "priority":  "priority level",
  "eta":       "human-readable processing time e.g. '24-48 hours' or 'Same day'",
  "reasoning": "brief explanation of routing decision",
  "flags":     ["list any risk factors that influenced routing"]
}

Return ONLY valid JSON - no preamble, no markdown.
"""


@router.post("/route", response_model=RouteResponse)
async def smart_route(req: RouteRequest):
    thresholds = req.thresholds or ThresholdsModel()

    user_message = f"""
Route this claim:
- Amount: ₦{req.claim_amount:,.0f}
- Type: {req.claim_type}
- Risk Score: {req.risk_score}/100
- PA Status: {req.pa_status or 'none'}
- Fraud Flags: {req.fraud_flags}
- HCP Tier: {req.hcp_tier or 'unknown'}
- High-value threshold: ₦{thresholds.high_value:,.0f}
- Auto-quarantine threshold: {thresholds.quarantine} risk score
"""

    result = await call_ai(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=384,
        expect_json=True,
    )

    if not result:
        # Rule-based fallback
        queue = _rule_based_queue(req, thresholds)
        return RouteResponse(
            queue=queue,
            priority="normal",
            eta="24-48 hours",
            reasoning="AI unavailable - rule-based routing applied.",
            flags=["ai_fallback"],
        )

    return RouteResponse(
        queue=result.get("queue", "standard"),
        priority=result.get("priority", "normal"),
        eta=result.get("eta", "24-48 hours"),
        reasoning=result.get("reasoning", ""),
        flags=result.get("flags", []),
    )


def _rule_based_queue(req: RouteRequest, t: ThresholdsModel) -> str:
    if req.risk_score >= t.quarantine:
        return "supervisor"
    if req.claim_amount > 2_000_000:
        return "finance"
    if req.claim_amount > t.high_value or req.fraud_flags > 0:
        return "medical_review"
    if req.claim_amount < 15_000 and req.risk_score < 20 and req.fraud_flags == 0:
        return "auto_approve"
    return "standard"