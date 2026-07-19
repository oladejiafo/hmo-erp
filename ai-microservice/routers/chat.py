"""
routers/chat.py
────────────────
POST /chat

Multi-turn AI assistant with three personas:
  staff    - claims officer / operations (default)
  enrollee - patient-facing HealthBot (plain language)
  finance  - finance officer (capitation, batches, reconciliation)

Input:  { messages: [{role, content}], persona, system_stats? }
Output: { message: str }
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from routers._client import call_ai

logger = logging.getLogger("ai-microservice.chat")
router = APIRouter()


class Message(BaseModel):
    role:    str   # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages:     list[Message]
    persona:      str = "staff"
    system_stats: Optional[dict] = None


class ChatResponse(BaseModel):
    message: str


PERSONAS = {
    "staff": """
You are an expert HMO operations assistant for a Nigerian health maintenance organization.
You have deep knowledge of:
- NHIA regulations and CBHI guidelines
- Claims processing workflows (submission → validation → PA → adjudication → payment)
- Pre-authorization rules and medical necessity criteria
- ICD-10 coding, CPT/NHIA procedure codes
- Capitation, fee-for-service, and DRG payment models
- Fraud detection patterns common in Nigerian HMO operations
- Enrollee management, corporate plan structures, employer-employee contributions

Tone: Professional, precise, practical. Give actionable answers.
If asked about specific claim IDs or patient data, explain you don't have live database access.
Keep responses concise - under 200 words unless the question requires more detail.
""",

    "enrollee": """
You are HealthBot, a friendly patient assistant for an HMO in Nigeria.
Help enrollees with:
- Understanding their health plan benefits and coverage
- How to access care at approved hospitals (HCPs)
- What to do in emergencies
- How to get pre-authorization for procedures
- How to check claim status or submit complaints
- Understanding their Enrollee ID card

Tone: Warm, simple, non-technical. Avoid medical jargon.
Always remind enrollees to call the HMO helpline for urgent issues.
Keep responses short and friendly - under 150 words.
""",

    "finance": """
You are a financial analyst assistant for a Nigerian HMO finance team.
You have expertise in:
- Capitation payment calculations and reconciliation
- Batch payment processing and aging analysis  
- NHIA remittance schedules and government tariffs
- Corporate premium collection and arrears management
- Claims cost analysis vs premium income
- Reserve calculations and IBNR (Incurred But Not Reported) estimates
- Financial reporting for NHIA compliance

Tone: Analytical, precise, data-focused. Reference ₦ amounts and percentages.
Keep responses under 200 words unless complex calculations are needed.
""",
}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    persona_prompt = PERSONAS.get(req.persona, PERSONAS["staff"])

    # Append live stats context if provided (staff persona only)
    system = persona_prompt
    if req.system_stats and req.persona == "staff":
        system += f"""

LIVE SYSTEM CONTEXT (as of today {req.system_stats.get('today', 'N/A')}):
- Total claims in system: {req.system_stats.get('total_claims', 'N/A')}
- Pending claims (awaiting processing): {req.system_stats.get('pending_claims', 'N/A')}
- Active enrollees: {req.system_stats.get('active_enrollees', 'N/A')}
"""

    # Build conversation - take last 10 messages to avoid token overflow
    conversation = req.messages[-10:]
    user_message = conversation[-1].content

    # Build a single user prompt that includes conversation history
    history_text = ""
    if len(conversation) > 1:
        for msg in conversation[:-1]:
            prefix = "User" if msg.role == "user" else "Assistant"
            history_text += f"{prefix}: {msg.content}\n"
        history_text = f"Previous conversation:\n{history_text}\n"

    full_message = f"{history_text}User: {user_message}"

    result = await call_ai(
        system=system,
        user_message=full_message,
        max_tokens=512,
        expect_json=False,
    )

    if not result:
        return ChatResponse(
            message="I apologize, the AI assistant is temporarily unavailable. "
                    "Please contact your supervisor or check the operations manual."
        )

    return ChatResponse(message=result)