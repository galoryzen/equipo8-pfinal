"""Endpoint + validation tests for /inventory/holds routes."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.application.exceptions import InsufficientInventoryError


class TestCreateInventoryHoldEndpoint:
    @patch("app.adapters.inbound.api.inventory.get_create_hold_use_case")
    def test_returns_204_on_success(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc

        resp = client.post(
            "/api/v1/catalog/inventory/holds",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-01",
                "checkout": "2026-06-04",
            },
        )
        assert resp.status_code == 204

    @patch("app.adapters.inbound.api.inventory.get_create_hold_use_case")
    def test_returns_409_when_inventory_insufficient(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = InsufficientInventoryError(uuid4())
        mock_factory.return_value = mock_uc

        resp = client.post(
            "/api/v1/catalog/inventory/holds",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-01",
                "checkout": "2026-06-04",
            },
        )
        assert resp.status_code == 409
        assert resp.json()["code"] == "INSUFFICIENT_INVENTORY"

    def test_returns_422_when_checkout_not_after_checkin(self, client):
        resp = client.post(
            "/api/v1/catalog/inventory/holds",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-04",
                "checkout": "2026-06-04",
            },
        )
        assert resp.status_code == 422

    def test_returns_422_when_checkout_before_checkin(self, client):
        resp = client.post(
            "/api/v1/catalog/inventory/holds",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-04",
                "checkout": "2026-06-01",
            },
        )
        assert resp.status_code == 422

    def test_returns_422_on_missing_fields(self, client):
        resp = client.post(
            "/api/v1/catalog/inventory/holds",
            json={"room_type_id": str(uuid4())},
        )
        assert resp.status_code == 422


class TestReleaseInventoryHoldEndpoint:
    @patch("app.adapters.inbound.api.inventory.get_release_hold_use_case")
    def test_returns_204_on_success(self, mock_factory, client):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        mock_factory.return_value = mock_uc

        resp = client.post(
            "/api/v1/catalog/inventory/holds/release",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-01",
                "checkout": "2026-06-04",
            },
        )
        assert resp.status_code == 204

    def test_returns_422_on_invalid_range(self, client):
        resp = client.post(
            "/api/v1/catalog/inventory/holds/release",
            json={
                "room_type_id": str(uuid4()),
                "checkin": "2026-06-04",
                "checkout": "2026-06-01",
            },
        )
        assert resp.status_code == 422
