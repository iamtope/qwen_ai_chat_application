class TestHealthEndpoint:
    def test_health_when_loaded(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True
        assert "model_id" in data

    def test_health_when_loading(self, client, mock_model_service):
        mock_model_service.is_loaded = False
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "loading"
        assert data["model_loaded"] is False


class TestConversationsEndpoint:
    def test_list_conversations_empty(self, client):
        response = client.get("/api/conversations")
        assert response.status_code == 200
        assert response.json() == []

    def test_delete_nonexistent_conversation(self, client):
        response = client.delete("/api/conversations/nonexistent-id")
        assert response.status_code == 404


class TestChatEndpoint:
    def test_chat_rejects_when_model_not_loaded(self, client, mock_model_service):
        mock_model_service.is_loaded = False
        response = client.post(
            "/api/chat",
            json={"conversation_id": "test", "message": "hello"},
        )
        assert response.status_code == 503

    def test_chat_rejects_empty_message(self, client):
        response = client.post(
            "/api/chat",
            json={"conversation_id": "test", "message": ""},
        )
        assert response.status_code == 422

    def test_chat_rejects_missing_conversation_id(self, client):
        response = client.post(
            "/api/chat",
            json={"message": "hello"},
        )
        assert response.status_code == 422

    def test_chat_rejects_message_too_long(self, client):
        response = client.post(
            "/api/chat",
            json={"conversation_id": "test", "message": "a" * 2001},
        )
        assert response.status_code == 422
