"""
routers/chat.py
────────────────
POST /chat

Multi-turn AI chat assistant for HMO staff and (via enrollee portal) members.

Context-aware behaviour:
    context = "staff"     → Access to anonymised org stats. Deep knowledge of
                            claims workflow, PA rules, NHIA tariff schedule,
                            SLA requirements. Cannot see PII.

    context = "enrollee"  → Friendly member assistant. Explains benefits,
                            how to use HCP, how to submit claims, ID card,
                            referral process. No access to internal data.

    context = "finance"   → Finance-focused. Capitation, batch processing,
                            reconciliation, ledger terms.

Message history is sent from the client on every call (stateless service).
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

# from routers._client import claude_client, claude_model
from routers._client import call_ai

logger = logging.getLogger("ai-microservice.chat")
router = APIRouter()


class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages:      list
    context:       Optional[str] = "staff"
    stats_context: Optional[dict] = None
    user_role:     Optional[str] = "staff"


class ChatResponse(BaseModel):
    role:    str
    content: str


# ── System prompts by context ─────────────────────────────────────────────────

STAFF_SYSTEM = """
You are an intelligent AI assistant for {org_name}, a Nigerian HMO.
You assist HMO staff — claims officers, medical reviewers, finance officers, managers.

Your knowledge includes:
- Nigerian Health Insurance Act and NHIA regulations
- HMO claims processing workflows (submission → review → approval → payment)
- Pre-authorisation (PA) rules and TAT requirements
- NHIA Standard Tariff Schedule (you know common service codes and prices)
- Fraud detection principles and red flags
- Capitation payment calculations
- SLA requirements for different claim types
- Common ICD-10 codes used in Nigerian healthcare

Current system stats:
  Total Claims:     {total_claims}
  Pending Claims:   {pending_claims}
  Active Enrollees: {active_enrollees}

Rules:
- Never reveal PII (patient names, member IDs, financial account details)
- If asked for specific claim details, direct staff to look it up in the system
- Be concise but thorough — staff are busy
- For regulatory questions, cite the specific regulation when possible
- Acknowledge uncertainty rather than guessing
"""

ENROLLEE_SYSTEM = """
You are a friendly, helpful health insurance assistant for an HMO member.
Your name is "HealthBot". You speak clearly and simply — many members may not
be familiar with insurance terminology.

You can help with:
- Explaining their health plan benefits and coverage limits
- How to find a doctor or hospital (HCP) in their network
- How to get a referral to a specialist
- How to submit a claim for reimbursement
- Understanding their ID card and how to use it
- Pre-authorisation — what it is and when they need it
- General questions about their coverage

Limits:
- You cannot access specific account details, claim statuses, or balances
- For account-specific queries, ask them to call the member services line
  or log in to the member portal
- Never give medical advice — recommend they see a doctor
- Be warm and reassuring — healthcare can be stressful

Keep answers short (2-4 sentences) unless they ask for detail.
"""

FINANCE_SYSTEM = """
You are a finance assistant for an HMO's finance team.
You understand:
- Capitation payment calculations (per-member rates, principal vs dependent)
- Payment batch processing (draft → submitted → approved → processing → completed)
- Claims reconciliation and the payment workflow
- Ledger entries and remittance notes
- NHIA compliance requirements for financial reporting
- Loss ratio calculations and benchmarks
- Corporate invoice management and premium collection
"""


def _build_system(req: ChatRequest) -> str:
    ctx    = (req.context or "staff").lower()
    stats  = req.stats_context or {}

    if ctx == "enrollee":
        return ENROLLEE_SYSTEM.strip()

    if ctx == "finance":
        return FINANCE_SYSTEM.strip()

    # Default: staff
    return STAFF_SYSTEM.format(
        org_name="the HMO",
        total_claims=stats.get("total_claims", "unknown"),
        pending_claims=stats.get("pending_claims", "unknown"),
        active_enrollees=stats.get("active_enrollees", "unknown"),
    ).strip()


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Multi-turn chat assistant.
    Stateless — caller sends full message history each time.
    """

    print("\n" + "="*50)
    print("CHAT REQUEST RECEIVED FROM LARAVEL")
    print(f"Raw request type: {type(req)}")
    print(f"Messages: {req.messages}")
    print(f"Context: {req.context}")
    print(f"Stats context: {req.stats_context}")
    print("="*50)

    system_prompt = _build_system(req)

    # Validate and sanitise messages
    messages = []
    for msg in req.messages[-20:]:
        # ... (your existing validation code) ...
        messages.append({"role": role, "content": content})

    if not messages:
        return ChatResponse(role="assistant", content="I didn't receive your message. Please try again.")

    # Format conversation for the AI
    conversation = "\n".join([f"{m['role']}: {m['content']}" for m in messages])

    try:
        result = await call_ai(
            system=system_prompt,
            user_message=conversation,
            max_tokens=int(os.getenv("AI_MAX_TOKENS", "1024")),
            expect_json=False,
        )

        if result and result.get("text"):
            return ChatResponse(role="assistant", content=result["text"])
        else:
            return ChatResponse(
                role="assistant",
                content="I'm sorry, I couldn't generate a response at this time.",
            )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return ChatResponse(
            role="assistant",
            content="I encountered an error processing your request. Please try again.",
        )
    """
    Multi-turn chat assistant.
    Stateless — caller sends full message history each time.
    """
    if not claude_client:
        return ChatResponse(
            role="assistant",
            content="AI assistant is temporarily unavailable. Please try again later or contact support.",
        )

    system_prompt = _build_system(req)

    # Validate and sanitise messages
    messages = []
    for msg in req.messages[-20:]:  # limit to last 20 messages to control tokens
        if isinstance(msg, dict):
            role    = msg.get("role", "user")
            content = msg.get("content", "")
        elif hasattr(msg, "role"):
            role    = msg.role
            content = msg.content
        else:
            continue

        if role not in ("user", "assistant"):
            continue

        content = str(content)[:5000]  # per-message limit
        messages.append({"role": role, "content": content})

    if not messages:
        return ChatResponse(role="assistant", content="I didn't receive your message. Please try again.")

    # Ensure conversation starts with user message
    if messages[0]["role"] != "user":
        messages = [{"role": "user", "content": "Hello"}] + messages

    try:
        max_tokens = int(os.getenv("AI_MAX_TOKENS", "1024"))

        response = await claude_client.messages.create(
            model=claude_model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )

        reply = response.content[0].text if response.content else "I'm sorry, I couldn't generate a response."

        return ChatResponse(role="assistant", content=reply)

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return ChatResponse(
            role="assistant",
            content="I encountered an error processing your request. Please try again.",
        )