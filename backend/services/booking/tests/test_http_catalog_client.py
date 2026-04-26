"""Tests for HttpCatalogClient — use httpx.MockTransport to intercept requests."""

import json
from datetime import date
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest

from app.adapters.outbound.http.catalog_client import HttpCatalogClient
from app.application.exceptions import (
    CatalogUnavailableError,
    InventoryUnavailableError,
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)

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


class TestGetPricing:
    async def test_success_returns_pricing_result(self):
        rate_plan_id = uuid4()
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["url"] = str(request.url)
            return httpx.Response(
                200,
                json={
                    "rate_plan_id": str(rate_plan_id),
                    "currency_code": "USD",
                    "subtotal": "290.00",
                    "original_subtotal": None,
                    "nights": [
                        {"day": "2026-05-01", "price": "140.00", "original_price": None},
                        {"day": "2026-05-02", "price": "150.00", "original_price": None},
                    ],
                },
            )

        client = _client_with(handler)
        result = await client.get_pricing(rate_plan_id, date(2026, 5, 1), date(2026, 5, 3))

        assert (
            captured["url"]
            == f"{BASE_URL}/api/v1/catalog/rate-plans/{rate_plan_id}/pricing?checkin=2026-05-01&checkout=2026-05-03"
        )
        assert result.rate_plan_id == rate_plan_id
        assert result.currency_code == "USD"
        assert result.subtotal == Decimal("290.00")
        assert result.original_subtotal is None
        assert len(result.nights) == 2
        assert result.nights[0].day == date(2026, 5, 1)
        assert result.nights[0].price == Decimal("140.00")
        assert result.nights[0].original_price is None

    async def test_404_raises_rate_plan_not_found(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(404, json={"code": "RATE_PLAN_NOT_FOUND"})

        client = _client_with(handler)
        with pytest.raises(RatePlanNotFoundError):
            await client.get_pricing(uuid4(), date(2026, 5, 1), date(2026, 5, 2))

    async def test_409_raises_rate_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(409, json={"code": "RATE_UNAVAILABLE"})

        client = _client_with(handler)
        with pytest.raises(RateUnavailableError):
            await client.get_pricing(uuid4(), date(2026, 5, 1), date(2026, 5, 2))

    async def test_422_raises_currency_mismatch(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(422, json={"code": "RATE_CURRENCY_MISMATCH"})

        client = _client_with(handler)
        with pytest.raises(RateCurrencyMismatchError):
            await client.get_pricing(uuid4(), date(2026, 5, 1), date(2026, 5, 2))

    async def test_500_raises_catalog_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(500)

        client = _client_with(handler)
        with pytest.raises(CatalogUnavailableError):
            await client.get_pricing(uuid4(), date(2026, 5, 1), date(2026, 5, 2))

    async def test_network_error_raises_catalog_unavailable(self):
        def handler(_: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("refused")

        client = _client_with(handler)
        with pytest.raises(CatalogUnavailableError):
            await client.get_pricing(uuid4(), date(2026, 5, 1), date(2026, 5, 2))

    async def test_handles_promotion_with_original_price(self):
        rate_plan_id = uuid4()

        def handler(_: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "rate_plan_id": str(rate_plan_id),
                    "currency_code": "USD",
                    "subtotal": "170.00",
                    "original_subtotal": "200.00",
                    "nights": [
                        {"day": "2026-05-01", "price": "85.00", "original_price": "100.00"},
                        {"day": "2026-05-02", "price": "85.00", "original_price": "100.00"},
                    ],
                },
            )

        client = _client_with(handler)
        result = await client.get_pricing(rate_plan_id, date(2026, 5, 1), date(2026, 5, 3))

        assert result.subtotal == Decimal("170.00")
        assert result.original_subtotal == Decimal("200.00")
        assert result.nights[0].original_price == Decimal("100.00")
