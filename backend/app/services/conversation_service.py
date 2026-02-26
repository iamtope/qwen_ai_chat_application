import logging
from datetime import datetime
from dataclasses import dataclass, field

from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a helpful, friendly AI assistant. "
    "Answer the user's questions directly and accurately. "
    "If you don't know something, say so honestly. "
    "Keep responses concise unless the user asks for detail."
)


@dataclass
class Conversation:
    id: str
    title: str
    messages: list[ChatMessage] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class ConversationService:
    def __init__(self) -> None:
        self._store: dict[str, Conversation] = {}

    def get_or_create(self, conversation_id: str) -> Conversation:
        if conversation_id not in self._store:
            self._store[conversation_id] = Conversation(
                id=conversation_id,
                title="New conversation",
            )
            logger.info("Created conversation %s", conversation_id)
        return self._store[conversation_id]

    def add_message(
        self, conversation_id: str, role: str, content: str
    ) -> ChatMessage:
        convo = self.get_or_create(conversation_id)
        message = ChatMessage(role=role, content=content)
        convo.messages.append(message)
        convo.updated_at = datetime.now()

        if role == "user" and len(convo.messages) == 1:
            convo.title = content[:50].strip() + ("..." if len(content) > 50 else "")

        return message

    def get_history(self, conversation_id: str) -> list[dict[str, str]]:
        system_msg = {"role": "system", "content": SYSTEM_PROMPT}
        if conversation_id not in self._store:
            return [system_msg]
        user_assistant_msgs = [
            {"role": m.role, "content": m.content}
            for m in self._store[conversation_id].messages
        ]
        return [system_msg] + user_assistant_msgs

    def list_conversations(self) -> list[dict]:
        return [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "message_count": len(c.messages),
            }
            for c in sorted(
                self._store.values(),
                key=lambda c: c.updated_at,
                reverse=True,
            )
        ]

    def delete_conversation(self, conversation_id: str) -> bool:
        if conversation_id not in self._store:
            return False
        del self._store[conversation_id]
        logger.info("Deleted conversation %s", conversation_id)
        return True


conversation_service = ConversationService()
