import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import bcrypt
import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import get_db_session, get_token_adapter
from app.application.ports.outbound.token_port import TokenPort
from app.domain.models import User, UserRole
from app.main import app


@pytest.fixture
def mock_token_adapter():
    adapter = MagicMock(spec=TokenPort)
    adapter.create_access_token.return_value = "mock-jwt-token"
    adapter.decode_access_token.return_value = {
        "sub": str(uuid.uuid4()),
        "email": "user@example.com",
        "role": "TRAVELER",
    }
    return adapter


@pytest.fixture
def client(mock_token_adapter):
    async def _mock_session():
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _mock_session
    app.dependency_overrides[get_token_adapter] = lambda: mock_token_adapter
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user() -> User:
    now = datetime.now(UTC)
    return User(
        id=uuid.uuid4(),
        email="user@example.com",
        full_name="Test User",
        phone="+1234567890",
        country_code="US",
        role=UserRole.TRAVELER,
        password=bcrypt.hashpw(b"secret123", bcrypt.gensalt()),
        created_at=now,
        updated_at=now,
    )
