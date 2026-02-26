import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import setup_logging
from app.services.model_service import model_service
from app.routers import chat

logger = logging.getLogger(__name__)


def _load_model_background() -> None:
    try:
        model_service.load_model()
        logger.info("Model loaded successfully")
    except Exception:
        logger.error("Failed to load model", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    logger.info(
        "Starting up — loading model %s/%s in background",
        settings.model_repo,
        settings.model_filename,
    )
    thread = threading.Thread(target=_load_model_background, daemon=True)
    thread.start()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Chat Model API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )
