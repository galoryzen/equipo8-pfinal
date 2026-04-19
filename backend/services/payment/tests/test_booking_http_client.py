import uuid
from decimal import Decimal
from unittest.mock import patch

import httpx
import pytest

from app.adapters.outbound.http.booking_http_client import HttpBookingServiceClient
from app.application.exceptions import BookingNotFoundError, BookingNotPayableError, BookingSnapshotError


def _fake_settings():
    class S:
        BOOKING_SERVICE_URL = "http://booking.test"
        BOOKING_CALLBACK_SECRET = "cb-secret"

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


@pytest.mark.asyncio
async def test_notify_payment_confirmed_204():
    bid = uuid.uuid4()
    pid = uuid.uuid4()
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        assert request.headers.get("X-Internal-Payment-Key") == "cb-secret"
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            await svc.notify_payment_confirmed(bid, pid)
    assert "confirm-after-payment" in seen["url"]


@pytest.mark.asyncio
async def test_notify_payment_confirmed_409_404_and_unexpected():
    bid = uuid.uuid4()
    pid = uuid.uuid4()

    transport409 = httpx.MockTransport(lambda r: httpx.Response(409, text="conflict"))
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport409) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingNotPayableError):
                await svc.notify_payment_confirmed(bid, pid)

    transport404 = httpx.MockTransport(lambda r: httpx.Response(404))
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport404) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingSnapshotError, match="not found"):
                await svc.notify_payment_confirmed(bid, pid)

    transport500 = httpx.MockTransport(lambda r: httpx.Response(500))
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport500) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingSnapshotError, match="failed"):
                await svc.notify_payment_confirmed(bid, pid)


@pytest.mark.asyncio
async def test_notify_payment_confirmed_http_error():
    bid = uuid.uuid4()
    pid = uuid.uuid4()

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("t", request=request)

    transport = httpx.MockTransport(boom)
    with patch("app.adapters.outbound.http.booking_http_client.settings", _fake_settings()):
        async with httpx.AsyncClient(transport=transport) as client:
            svc = HttpBookingServiceClient(client)
            with pytest.raises(BookingSnapshotError, match="unavailable"):
                await svc.notify_payment_confirmed(bid, pid)
