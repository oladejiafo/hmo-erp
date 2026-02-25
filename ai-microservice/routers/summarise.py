"""
routers/summarise.py
─────────────────────
POST /summarise-report

Generates an executive natural-language summary of a report dataset.
Called from ReportsPage.jsx → AI Summary button → Laravel → this endpoint.

The summary is designed for:
  - HQ managers reviewing branch performance
  - Medical directors scanning fraud trends
  - Finance officers reviewing aging reports

Returns: { summary: str, bullets: [str], key_metric: str, recommendation: str }
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

# from routers._client import call_claude
from routers._client import call_ai

logger = logging.getLogger("ai-microservice.summarise")
router = APIRouter()


REPORT_DESCRIPTIONS = {
    "aging":           "Claims Aging Report — how long pending claims have been waiting",
    "by_hcp":          "Claims by HCP — volume and value summary per provider",
    "by_type":         "Claims by Type — breakdown by medical service category",
    "cost_corporate":  "Cost by Corporate — premium vs claims spend per employer",
    "high_cost":       "High-Cost Enrollees — members generating the most claims spend",
    "hcp_performance": "HCP Performance — rejection rates, turnaround times, risk scores",
    "branch_comparison":"Branch Comparison — cross-branch performance overview",
}


class SummariseRequest(BaseModel):
    report_type: str
    data:        list
    context:     Optional[dict]  = None
    org_name:    Optional[str]   = "the HMO"
    branch:      Optional[str]   = None


class SummariseResponse(BaseModel):
    summary:        str
    bullets:        list
    key_metric:     Optional[str] = None
    recommendation: Optional[str] = None


SYSTEM_PROMPT = """
You are an expert healthcare analyst for a Nigerian HMO. Generate a concise executive summary
of the provided report data for management.

Return a JSON object with:
{
  "summary":        "2-3 sentence high-level narrative of the most important findings",
  "bullets":        ["3-5 specific, data-driven insight bullet points"],
  "key_metric":     "The single most important number or percentage from the data",
  "recommendation": "One actionable recommendation based on the data"
}

Style guide:
- Be specific: cite actual numbers, percentages, trend directions
- Highlight anomalies, risks, or items needing management attention
- Use Nigerian context (₦ currency, NHIA regulations where relevant)
- Keep the tone professional but direct
- Return ONLY valid JSON — no preamble, no markdown
"""


@router.post("/summarise-report", response_model=SummariseResponse)
async def summarise_report(req: SummariseRequest):
    report_desc = REPORT_DESCRIPTIONS.get(req.report_type, req.report_type)

    # Truncate data to avoid token overflow — sample first 100 rows
    sample_data = req.data[:100]

    context_parts = []
    if req.branch:
        context_parts.append(f"Branch: {req.branch}")
    if req.context:
        if req.context.get("date_from"):
            context_parts.append(f"Period from: {req.context['date_from']}")
        if req.context.get("date_to"):
            context_parts.append(f"Period to: {req.context['date_to']}")

    user_message = f"""
REPORT TYPE: {report_desc}
ORG: {req.org_name or 'the HMO'}
{chr(10).join(context_parts)}

DATA ({len(req.data)} rows, showing first {len(sample_data)}):
{json.dumps(sample_data, indent=2, default=str)[:8000]}
""".strip()

    result = await call_ai(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        max_tokens=768,
        expect_json=True,
    )

    if not result:
        return SummariseResponse(
            summary="AI summary is temporarily unavailable. Please review the report data directly.",
            bullets=[],
            key_metric=None,
            recommendation=None,
        )

    return SummariseResponse(
        summary=result.get("summary", ""),
        bullets=result.get("bullets", []),
        key_metric=result.get("key_metric"),
        recommendation=result.get("recommendation"),
    )