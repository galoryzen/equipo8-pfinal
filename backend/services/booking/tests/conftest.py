from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import get_current_user_id, get_current_user_info
from app.main import app

USER_A = UUID("a0000000-0000-0000-0000-000000000001")


@pytest.fixture
def client_authenticated():
    app.dependency_overrides[get_current_user_id] = lambda: USER_A
    app.dependency_overrides[get_current_user_info] = lambda: {
        "role": "TRAVELER",
        "user_id": str(USER_A),
    }
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
