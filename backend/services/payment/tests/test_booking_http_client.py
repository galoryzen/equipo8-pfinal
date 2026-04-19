import uuid
from decimal import Decimal
from unittest.mock import patch

import httpx
import pytest

from app.adapters.outbound.http.booking_http_client import HttpBookingServiceClient
from app.application.exceptions import BookingNotFoundError, BookingSnapshotError


def _fake_settings():
    class S:
        BOOKING_SERVICE_URL = "http://booking.test"

    return S()


@pytest.mark.asyncio
async def test_get_booking_success_without_hold():
    bid = uuid.uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(bid) in str(request.url)
        assert request.headers.get("Authorization") == "Bearer t"
        return httpx.Response(
            200,
            json={
                "id": str(bid),
                "total_amount": "10.50",
                "currency_code": "USD",
                "status": "PENDING_CONFIRMATION",
                "hold_expires_at": None,
            },
        )

    transport = httpx.MockTransport(handler)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            out = await svc.get_booking_for_user(bid, "Bearer t")
    assert out.id == bid
    assert out.total_amount == Decimal("10.50")
    assert out.hold_expires_at is None


@pytest.mark.asyncio
async def test_get_booking_parses_z_timezone_hold():
    bid = uuid.uuid4()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": str(bid),
                "total_amount": "1.00",
                "currency_code": "EUR",
                "status": "PENDING_PAYMENT",
                "hold_expires_at": "2026-06-01T15:30:00Z",
            },
        )

    transport = httpx.MockTransport(handler)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            out = await svc.get_booking_for_user(bid, "Bearer x")
    assert out.hold_expires_at is not None
    assert out.hold_expires_at.tzinfo is None


@pytest.mark.asyncio
async def test_get_booking_404_and_401():
    bid = uuid.uuid4()

    def handler404(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    transport = httpx.MockTransport(handler404)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingNotFoundError):
                await svc.get_booking_for_user(bid, "Bearer x")

    def handler401(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401)

    transport2 = httpx.MockTransport(handler401)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport2) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingNotFoundError):
                await svc.get_booking_for_user(bid, "Bearer x")


@pytest.mark.asyncio
async def test_get_booking_unexpected_status():
    bid = uuid.uuid4()
    transport = httpx.MockTransport(lambda r: httpx.Response(500, text="err"))
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingSnapshotError, match="Could not load"):
                await svc.get_booking_for_user(bid, "Bearer x")


@pytest.mark.asyncio
async def test_get_booking_http_error():
    bid = uuid.uuid4()

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    transport = httpx.MockTransport(boom)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingSnapshotError, match="unavailable"):
                await svc.get_booking_for_user(bid, "Bearer x")
