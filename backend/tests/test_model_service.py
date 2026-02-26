import pytest
from app.services.model_service import ModelService


@pytest.fixture()
def service():
    return ModelService()


class TestTruncateHistory:
    def _make_messages(self, n: int, with_system: bool = True):
        msgs = []
        if with_system:
            msgs.append({"role": "system", "content": "You are helpful."})
        for i in range(n):
            role = "user" if i % 2 == 0 else "assistant"
            msgs.append({"role": role, "content": f"msg-{i}"})
        return msgs

    def test_no_truncation_when_under_limit(self, service):
        msgs = self._make_messages(4)
        result = service._truncate_history(msgs)
        assert result == msgs

    def test_truncation_preserves_system_prompt(self, service):
        msgs = self._make_messages(20)
        result = service._truncate_history(msgs)
        assert result[0]["role"] == "system"
        assert result[0]["content"] == "You are helpful."

    def test_truncation_keeps_most_recent_messages(self, service):
        msgs = self._make_messages(20)
        result = service._truncate_history(msgs)
        non_system = [m for m in result if m["role"] != "system"]
        original_non_system = [m for m in msgs if m["role"] != "system"]
        assert non_system == original_non_system[-(len(non_system)):]

    def test_truncated_length_within_limit(self, service):
        msgs = self._make_messages(20)
        result = service._truncate_history(msgs)
        from app.config import settings
        assert len(result) <= settings.max_history_messages


class TestIsLoaded:
    def test_initially_not_loaded(self, service):
        assert service.is_loaded is False

    @pytest.mark.asyncio
    async def test_generate_raises_when_not_loaded(self, service):
        with pytest.raises(RuntimeError, match="Model is not loaded"):
            gen = service.generate_stream_async([])
            await gen.__anext__()


class TestEnforceBudget:
    def test_no_warning_within_budget(self, service, caplog):
        import logging
        with caplog.at_level(logging.WARNING):
            service._enforce_budget(elapsed=5.0, tokens_generated=50)
        assert "exceeded budget" not in caplog.text

    def test_warning_when_over_budget(self, service, caplog):
        import logging
        with caplog.at_level(logging.WARNING):
            service._enforce_budget(elapsed=999.0, tokens_generated=50)
        assert "exceeded budget" in caplog.text
