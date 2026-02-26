import pytest
from app.services.conversation_service import ConversationService, SYSTEM_PROMPT


@pytest.fixture()
def service():
    return ConversationService()


class TestGetOrCreate:
    def test_creates_new_conversation(self, service):
        convo = service.get_or_create("conv-1")
        assert convo.id == "conv-1"
        assert convo.title == "New conversation"
        assert convo.messages == []

    def test_returns_existing_conversation(self, service):
        first = service.get_or_create("conv-1")
        second = service.get_or_create("conv-1")
        assert first is second


class TestAddMessage:
    def test_adds_user_message(self, service):
        msg = service.add_message("conv-1", "user", "hello")
        assert msg.role == "user"
        assert msg.content == "hello"

    def test_first_user_message_sets_title(self, service):
        service.add_message("conv-1", "user", "What is Python?")
        convo = service.get_or_create("conv-1")
        assert convo.title == "What is Python?"

    def test_long_title_is_truncated(self, service):
        long_msg = "a" * 100
        service.add_message("conv-1", "user", long_msg)
        convo = service.get_or_create("conv-1")
        assert len(convo.title) <= 53  # 50 chars + "..."
        assert convo.title.endswith("...")

    def test_second_message_does_not_change_title(self, service):
        service.add_message("conv-1", "user", "First message")
        service.add_message("conv-1", "user", "Second message")
        convo = service.get_or_create("conv-1")
        assert convo.title == "First message"


class TestGetHistory:
    def test_empty_conversation_returns_system_prompt_only(self, service):
        history = service.get_history("nonexistent")
        assert len(history) == 1
        assert history[0]["role"] == "system"
        assert history[0]["content"] == SYSTEM_PROMPT

    def test_history_includes_system_prompt_and_messages(self, service):
        service.add_message("conv-1", "user", "hello")
        service.add_message("conv-1", "assistant", "hi there")
        history = service.get_history("conv-1")
        assert len(history) == 3
        assert history[0]["role"] == "system"
        assert history[1] == {"role": "user", "content": "hello"}
        assert history[2] == {"role": "assistant", "content": "hi there"}


class TestListConversations:
    def test_empty_store(self, service):
        assert service.list_conversations() == []

    def test_lists_conversations_sorted_by_updated(self, service):
        service.add_message("conv-1", "user", "first")
        service.add_message("conv-2", "user", "second")
        result = service.list_conversations()
        assert len(result) == 2
        assert result[0]["id"] == "conv-2"

    def test_list_includes_message_count(self, service):
        service.add_message("conv-1", "user", "hello")
        service.add_message("conv-1", "assistant", "hi")
        result = service.list_conversations()
        assert result[0]["message_count"] == 2


class TestDeleteConversation:
    def test_delete_existing(self, service):
        service.add_message("conv-1", "user", "hello")
        assert service.delete_conversation("conv-1") is True
        assert service.list_conversations() == []

    def test_delete_nonexistent_returns_false(self, service):
        assert service.delete_conversation("no-such-id") is False
