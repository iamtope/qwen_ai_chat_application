import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import ChatRequest, HealthResponse
from app.services.model_service import model_service
from app.services.conversation_service import conversation_service
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


async def _stream_response(
    conversation_id: str, message: str
) -> AsyncGenerator[dict, None]:
    conversation_service.add_message(conversation_id, "user", message)
    history = conversation_service.get_history(conversation_id)

    full_response: list[str] = []

    try:
        async for chunk in model_service.generate_stream_async(history):
            if chunk["event"] == "token":
                full_response.append(chunk["data"])
                yield {"event": "token", "data": chunk["data"]}
            elif chunk["event"] == "metadata":
                yield {"event": "metadata", "data": json.dumps(chunk["data"])}
    except Exception:
        logger.error(
            "Streaming failed for conversation %s",
            conversation_id,
            exc_info=True,
            extra={"conversation_id": conversation_id, "input_length": len(message)},
        )
        yield {"event": "error", "data": "Generation failed. Please try again."}
        return

    assistant_text = "".join(full_response)
    if assistant_text:
        conversation_service.add_message(conversation_id, "assistant", assistant_text)

    yield {"event": "done", "data": ""}


@router.post("/chat")
async def chat(request: ChatRequest):
    if not model_service.is_loaded:
        raise HTTPException(status_code=503, detail="Model is still loading")

    return EventSourceResponse(
        _stream_response(request.conversation_id, request.message)
    )


@router.get("/conversations")
async def list_conversations():
    return conversation_service.list_conversations()


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    if not conversation_service.delete_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"detail": "Conversation deleted"}


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if model_service.is_loaded else "loading",
        model_id=f"{settings.model_repo}/{settings.model_filename}",
        model_loaded=model_service.is_loaded,
    )
