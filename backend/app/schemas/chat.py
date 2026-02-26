from pydantic import BaseModel, Field
from datetime import datetime


class ChatRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, description="Unique conversation identifier")
    message: str = Field(..., min_length=1, max_length=2000, description="User message content")


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now())


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class HealthResponse(BaseModel):
    status: str
    model_id: str
    model_loaded: bool
