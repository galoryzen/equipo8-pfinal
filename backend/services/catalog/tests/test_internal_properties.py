import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.application.exceptions import PropertyNotFoundError
from app.config import settings


@pytest.fixture(autouse=True)
def _configure_internal_token(monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_SERVICE_TOKEN", "test-internal-token")


def test_missing_header_returns_401(client):
    resp = client.get(f"/internal/properties/{uuid.uuid4()}/summary")
    assert resp.status_code == 401


def test_wrong_token_returns_401(client):
    resp = client.get(
        f"/internal/properties/{uuid.uuid4()}/summary",
        headers={"X-Internal-Token": "wrong"},
    )
    assert resp.status_code == 401


def _stub_property(prop_id, *, with_image: bool = True):
    # MagicMock treats `name=` in the constructor as the mock's own name rather
    # than the `.name` attribute, so assign explicitly after construction.
    prop = MagicMock(id=prop_id)
    prop.name = "Sol Caribe Cancún"
    prop.city = MagicMock()
    prop.city.name = "CANCÚN"
    prop.city.country = "MÉXICO"
    if with_image:
        image = MagicMock()
        image.url = "https://cdn.example.com/sol-caribe-hero.jpg"
        prop.images = [image]
    else:
        prop.images = []
    return prop


def test_returns_summary_when_found(client):
    prop_id = uuid.uuid4()
    stub_property = _stub_property(prop_id)

    with patch(
        "app.adapters.inbound.api.internal_properties.get_property_repository"
    ) as mock_factory:
        repo = AsyncMock()
        repo.get_by_id.return_value = stub_property
        mock_factory.return_value = repo

        resp = client.get(
            f"/internal/properties/{prop_id}/summary",
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(prop_id)
    assert body["name"] == "Sol Caribe Cancún"
    assert body["city_name"] == "CANCÚN"
    assert body["country"] == "MÉXICO"
    assert body["image_url"] == "https://cdn.example.com/sol-caribe-hero.jpg"


def test_image_url_is_null_when_property_has_no_images(client):
    prop_id = uuid.uuid4()
    stub_property = _stub_property(prop_id, with_image=False)

    with patch(
        "app.adapters.inbound.api.internal_properties.get_property_repository"
    ) as mock_factory:
        repo = AsyncMock()
        repo.get_by_id.return_value = stub_property
        mock_factory.return_value = repo

        resp = client.get(
            f"/internal/properties/{prop_id}/summary",
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert resp.status_code == 200
    assert resp.json()["image_url"] is None


def test_returns_404_when_not_found(client):
    with patch(
        "app.adapters.inbound.api.internal_properties.get_property_repository"
    ) as mock_factory:
        repo = AsyncMock()
        repo.get_by_id.return_value = None
        mock_factory.return_value = repo

        resp = client.get(
            f"/internal/properties/{uuid.uuid4()}/summary",
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert resp.status_code == 404


def test_service_unavailable_when_token_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_SERVICE_TOKEN", "")
    resp = client.get(
        f"/internal/properties/{uuid.uuid4()}/summary",
        headers={"X-Internal-Token": "anything"},
    )
    assert resp.status_code == 503
