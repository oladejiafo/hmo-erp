"""
AI Microservice - HMO ERP
=========================
FastAPI service that provides AI capabilities to the Laravel backend.
"""

# Load environment variables FIRST, before ANY other imports
import os
from dotenv import load_dotenv
load_dotenv()  # This MUST be first

# Now import everything else
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# These imports will now happen AFTER env vars are loaded
from routers import classify, chat, cluster, ocr, route, summarise

# Debug output (now will show correct values)
print(f"\n=== ENV DEBUG ===")
print(f".env file loaded: True")
print(f"Current directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")
print(f"ANTHROPIC_API_KEY: {os.getenv('ANTHROPIC_API_KEY', 'NOT FOUND')}")
print(f"OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY', 'NOT FOUND')}")
print(f"================\n")

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("ai-microservice")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    logger.info("AI microservice starting up")
    logger.info(f"  Model: {os.getenv('AI_MODEL', 'claude-3-5-sonnet-20241022')}")
    logger.info(f"  Anthropic key present: {bool(os.getenv('ANTHROPIC_API_KEY'))}")
    logger.info(f"  OpenAI key present:    {bool(os.getenv('OPENAI_API_KEY'))}")
    yield
    logger.info("AI microservice shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="HMO ERP AI Microservice",
    description="AI capabilities for claims processing, fraud detection, and staff assistance.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Auth guard ────────────────────────────────────────────────────────────────

AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "")


async def verify_key(x_ai_key: str = Header(..., alias="X-AI-Key")):
    if not AI_SERVICE_KEY:
        logger.warning("AI_SERVICE_KEY not configured - allowing request (dev mode)")
        return

    if x_ai_key != AI_SERVICE_KEY:
        logger.warning("Invalid X-AI-Key received")
        raise HTTPException(status_code=401, detail="Invalid service key")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "model": os.getenv("AI_MODEL", "claude-3-5-sonnet-20241022"),
        "anthropic_ok": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai_ok": bool(os.getenv("OPENAI_API_KEY")),
    }


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(classify.router,   prefix="", tags=["classify"],   dependencies=[Depends(verify_key)])
app.include_router(route.router,      prefix="", tags=["route"],      dependencies=[Depends(verify_key)])
app.include_router(summarise.router,  prefix="", tags=["summarise"],  dependencies=[Depends(verify_key)])
app.include_router(cluster.router,    prefix="", tags=["cluster"],    dependencies=[Depends(verify_key)])
app.include_router(ocr.router,        prefix="", tags=["ocr"],        dependencies=[Depends(verify_key)])
app.include_router(chat.router,       prefix="", tags=["chat"],       dependencies=[Depends(verify_key)])


# ── Global error handler ──────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI service error. Laravel will use rule-based fallback."},
    )