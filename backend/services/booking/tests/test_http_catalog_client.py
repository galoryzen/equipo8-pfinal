"""Tests for HttpCatalogClient — use httpx.MockTransport to intercept requests."""

import json
from datetime import date
from uuid import uuid4

import httpx
import pytest

from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.application.exceptions import CatalogUnavailableError, InventoryUnavailableError

BASE_URL = "http://test-catalog"


def _client_with(handler) -> HttpCatalogClient:
    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient(transport=transport, base_url=BASE_URL)
    return HttpCatalogClient(async_client, base_url=BASE_URL)


class TestCreateHold:
    async def test_success_returns_silently_on_204(self):
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["url"] = str(request.url)
            captured["body"] = json.loads(request.content)
            return httpx.Response(204)

        client = _client_with(handler)
        room_id = uuid4()
        await client.create_hold(room_id, date(2026, 6, 1), date(2026, 6, 4))

        assert captured["url"] == f"{BASE_URL}/api/v1/catalog/inventory/holds"
        assert captured["body"] == {
            "room_type_id": str(room_id),
            "checkin": "2026-06-01",
            "checkout": "2026-06-04",
        }

    async def test_409_raises_inventory_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(409, json={"code": "INSUFFICIENT_INVENTORY"})

        client = _client_with(handler)

        with pytest.raises(InventoryUnavailableError):
            await client.create_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

    async def test_500_raises_catalog_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(500)

        client = _client_with(handler)

        with pytest.raises(CatalogUnavailableError):
            await client.create_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

    async def test_connect_error_raises_catalog_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("refused")

        client = _client_with(handler)

        with pytest.raises(CatalogUnavailableError):
            await client.create_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))


class TestReleaseHold:
    async def test_success_returns_silently_on_204(self):
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["url"] = str(request.url)
            return httpx.Response(204)

        client = _client_with(handler)
        await client.release_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))

        assert captured["url"] == f"{BASE_URL}/api/v1/catalog/inventory/holds/release"

    async def test_network_error_raises_catalog_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("timeout")

        client = _client_with(handler)

        with pytest.raises(CatalogUnavailableError):
            await client.release_hold(uuid4(), date(2026, 6, 1), date(2026, 6, 4))
