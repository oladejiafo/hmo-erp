"""
routers/route.py
─────────────────
POST /route

Suggests which processing queue a claim should be routed to.
Considers claim type, risk score, amount, PA status, and HCP type.

Queues:
    standard        Normal claims officer review
    medical_review  Requires a medical officer sign-off
    supervisor      High-risk / disputed claims
    finance         Finance-only approvals (large but clean claims)
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

# from routers._client import call_claude
from routers._client import call_ai

logger = logging.getLogger("ai-microservice.route")
router = APIRouter()


class RouteRequest(BaseModel):
    claim_id:    int
    claim_type:  Optional[str]  = None
    amount:      Optional[float]= None
    risk_score:  Optional[float]= None
    hcp_type:    Optional[str]  = None
    plan_tier:   Optional[str]  = None
    fraud_flags: Optional[int]  = 0
    has_pa:      Optional[bool] = False


class RouteResponse(BaseModel):
    suggested_queue: str
    reason:          str
    urgency:         str   # low | normal | high | critical
    pa_required:     bool
    estimated_tat:   int   # business days


SYSTEM_PROMPT = """
You are a claims routing expert for a Nigerian HMO.

Given claim metadata, determine the optimal processing queue and return a JSON object:
{
  "suggested_queue": one of ["standard", "medical_review", "supervisor", "finance"],
  "reason":          clear 1-sentence explanation for the routing decision,
  "urgency":         one of ["low", "normal", "high", "critical"],
  "pa_required":     true if PA is needed but not yet obtained,
  "estimated_tat":   integer — estimated turnaround in business days
}

Routing rules:
- supervisor:     risk_score >= 70, OR fraud_flags >= 3, OR amount > ₦500k without PA
- medical_review: claim_type in [inpatient, surgical, maternity, emergency, chronic_care]
                  OR amount > ₦200k
- finance:        amount > ₦300k AND risk_score < 40 AND no fraud flags
- standard:       everything else

Urgency rules:
- critical: emergency claim type OR risk_score >= 90
- high:     risk_score >= 70 OR amount > ₦500k
- normal:   most claims
- low:      amount < ₦5k AND risk_score < 30

Return ONLY valid JSON — no preamble, no markdown.
"""


@router.post("/route", response_model=RouteResponse)
async def smart_route(req: RouteRequest):
    user_message = f"""
Claim ID:     {req.claim_id}
Claim Type:   {req.claim_type or 'unknown'}
Amount:       ₦{req.amount:,.2f if req.amount else '—'}
Risk Score:   {req.risk_score or 0}/100
HCP Type:     {req.hcp_type or 'unknown'}
Plan Tier:    {req.plan_tier or 'unknown'}
Fraud Flags:  {req.fraud_flags or 0}
PA Obtained:  {'Yes' if req.has_pa else 'No'}
""".strip()

    result = await call_ai(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=256,
        expect_json=True,
    )

    if not result:
        # Rule-based fallback (mirrors Laravel AIController fallback)
        queue   = "standard"
        reason  = "AI unavailable — rule-based fallback"
        urgency = "normal"

        if req.risk_score and req.risk_score >= 70:
            queue   = "supervisor"
            reason  = "High fraud risk score (≥70)"
            urgency = "high"
        elif req.amount and req.amount > 500_000:
            queue   = "medical_review"
            reason  = "High-value claim (>₦500k)"
            urgency = "high"
        elif req.claim_type in ("inpatient", "surgical", "maternity", "emergency"):
            queue  = "medical_review"
            reason = f"Claim type '{req.claim_type}' requires medical review"

        return RouteResponse(
            suggested_queue=queue,
            reason=reason,
            urgency=urgency,
            pa_required=not req.has_pa and req.claim_type in ("inpatient", "surgical", "maternity"),
            estimated_tat=1 if urgency in ("critical", "high") else 3,
        )

    return RouteResponse(
        suggested_queue=result.get("suggested_queue", "standard"),
        reason=result.get("reason", ""),
        urgency=result.get("urgency", "normal"),
        pa_required=bool(result.get("pa_required", False)),
        estimated_tat=int(result.get("estimated_tat", 3)),
    )