"""FastAPI app.

The Pipeline is loaded exactly once, started by the lifespan handler — never
per request and never lazily on first use.

Loading takes ~200s (a 700 MB fp32 checkpoint read from disk), so the load
runs in a background thread instead of blocking startup. The server therefore
accepts connections immediately and /health can honestly report
model_loaded: false while the weights are still coming up. This also keeps
platform health checks (e.g. HF Spaces) from timing out during startup.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from src.pipeline import Pipeline

from .schemas import (
    ClaimRequest,
    ExplainResponse,
    HealthResponse,
    VerifyResponse,
)

log = logging.getLogger("api")


async def _load_pipeline(app: FastAPI) -> None:
    """Build the Pipeline off the event loop, then publish it on app.state."""
    try:
        app.state.pipeline = await asyncio.to_thread(Pipeline)
        log.info("pipeline loaded, model_loaded is now true")
    except Exception as exc:                      # noqa: BLE001 - reported via /health
        app.state.load_error = f"{type(exc).__name__}: {exc}"
        log.exception("pipeline failed to load")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pipeline = None
    app.state.load_error = None
    app.state.load_task = asyncio.create_task(_load_pipeline(app))
    yield
    app.state.load_task.cancel()


app = FastAPI(
    title="Trust-Aware Fake News Detection",
    description="DeBERTa + attention pooling, RAG evidence retrieval, "
                "calibrated confidence and SHAP explanations.",
    version="1.0.0",
    lifespan=lifespan,
)

# The frontend is served from a different origin than the API, so CORS has to
# be explicit. ALLOWED_ORIGINS is a comma-separated list; the default "*" keeps
# local development working, and deployments set it to the real site origin.
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,   # cannot be combined with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_pipeline(request: Request) -> Pipeline:
    """Return the loaded Pipeline, or 503 if it is not ready yet."""
    pipeline = getattr(request.app.state, "pipeline", None)
    if pipeline is None:
        error = getattr(request.app.state, "load_error", None)
        detail = (f"Model failed to load: {error}" if error
                  else "Model is still loading, try again shortly.")
        raise HTTPException(status_code=503, detail=detail)
    return pipeline


@app.get("/", include_in_schema=False)
async def root() -> dict:
    """Landing response, so hitting the service root is not a 404."""
    return {"service": app.title, "version": app.version, "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=getattr(request.app.state, "pipeline", None) is not None,
    )


@app.post("/verify", response_model=VerifyResponse)
async def verify(body: ClaimRequest, request: Request) -> VerifyResponse:
    pipeline = get_pipeline(request)
    # Inference is blocking CPU work; a threadpool keeps the event loop free
    # so /health stays responsive during a slow request.
    result = await run_in_threadpool(pipeline.verify, body.text)
    return VerifyResponse(**result)


@app.post("/explain", response_model=ExplainResponse)
async def explain(body: ClaimRequest, request: Request) -> ExplainResponse:
    pipeline = get_pipeline(request)
    # SHAP takes 15-30s on CPU, which is exactly why this must not block.
    tokens = await run_in_threadpool(pipeline.explain, body.text)
    return ExplainResponse(tokens=tokens)
