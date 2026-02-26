import pytest
from unittest.mock import  patch

from fastapi.testclient import TestClient


@pytest.fixture()
def mock_model_service():
    """Patch model_service so no real model is loaded during tests."""
    with patch("app.routers.chat.model_service") as mock:
        mock.is_loaded = True
        yield mock


@pytest.fixture()
def client(mock_model_service):
    """TestClient with model_service mocked out."""
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
