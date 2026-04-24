import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def _configure_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_SERVICE_TOKEN", "test-internal-token")


def test_missing_header_returns_401(client):
    resp = client.get(f"/internal/users/{uuid.uuid4()}/contact")
    assert resp.status_code == 401


def test_wrong_token_returns_401(client):
    resp = client.get(
        f"/internal/users/{uuid.uuid4()}/contact",
        headers={"X-Internal-Token": "wrong"},
    )
    assert resp.status_code == 401


def test_returns_user_contact_when_found(client, sample_user):
    with patch(
        "app.adapters.inbound.api.internal_users.get_user_repository"
    ) as mock_factory:
        repo = AsyncMock()
        repo.get_by_id.return_value = sample_user
        mock_factory.return_value = repo

        resp = client.get(
            f"/internal/users/{sample_user.id}/contact",
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(sample_user.id)
    assert body["email"] == sample_user.email
    assert body["full_name"] == sample_user.full_name


def test_returns_404_when_user_not_found(client):
    with patch(
        "app.adapters.inbound.api.internal_users.get_user_repository"
    ) as mock_factory:
        repo = AsyncMock()
        repo.get_by_id.return_value = None
        mock_factory.return_value = repo

        resp = client.get(
            f"/internal/users/{uuid.uuid4()}/contact",
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert resp.status_code == 404


def test_service_unavailable_when_token_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_SERVICE_TOKEN", "")
    resp = client.get(
        f"/internal/users/{uuid.uuid4()}/contact",
        headers={"X-Internal-Token": "anything"},
    )
    assert resp.status_code == 503
