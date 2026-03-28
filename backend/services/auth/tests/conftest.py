import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import bcrypt
import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import get_db_session
from app.domain.models import User, UserRole
from app.main import app


@pytest.fixture
def client():
    async def _mock_session():
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _mock_session
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


@pytest.fixture
def mock_get_user_uc(sample_user):
    uc = MagicMock()
    uc.execute = AsyncMock(return_value=sample_user)
    return uc


@pytest.fixture
def mock_check_exists_uc():
    uc = MagicMock()
    uc.execute = AsyncMock(return_value=False)
    return uc


@pytest.fixture
def mock_create_user_uc(sample_user):
    uc = MagicMock()
    uc.execute = AsyncMock(return_value=sample_user)
    return uc
