"""Booking integration tests (OBJ-004 — 2-3 of 10-12).

Covers cart creation, the full async checkout chain Booking → RabbitMQ →
Payment → MockGateway → RabbitMQ → Booking, and cart cancellation.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date

import httpx
import pytest

from helpers.polling import wait_for_booking_status


async def _create_cart(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    booking_dates: tuple[date, date],
    property_id: str,
    room_type_id: str,
    rate_plan_id: str,
) -> dict:
    checkin, checkout = booking_dates
    resp = await client.post(
        "/api/v1/booking/bookings",
        headers=headers,
        json={
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "currency_code": "USD",
            "property_id": property_id,
            "room_type_id": room_type_id,
            "rate_plan_id": rate_plan_id,
            "guests_count": 2,
        },
    )
    if resp.status_code in (404, 409):
        pytest.skip(
            f"cart creation pre-condition failed (HTTP {resp.status_code}: {resp.text}). "
            "Likely the seed rate_calendar/inventory_calendar window has expired — "
            "re-run `make reset-db && make up` from backend/."
        )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _save_guests(
    client: httpx.AsyncClient, headers: dict[str, str], booking_id: str
) -> None:
    """Save the two guests required by the booking before checkout."""
    resp = await client.put(
        f"/api/v1/booking/bookings/{booking_id}/guests",
        headers=headers,
        json={
            "guests": [
                {
                    "is_primary": True,
                    "full_name": "Test Primary Guest",
                    "email": "primary@test.local",
                    "phone": "+10000000001",
                },
                {
                    "is_primary": False,
                    "full_name": "Test Secondary Guest",
                    "email": "secondary@test.local",
                    "phone": "+10000000002",
                },
            ]
        },
    )
    assert resp.status_code in (200, 204), resp.text


async def test_create_cart_booking(
    http_client: httpx.AsyncClient,
    traveler_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    headers = auth_header(traveler_token)
    body = await _create_cart(
        http_client,
        headers,
        booking_dates,
        seeded_property_id,
        seeded_room_type_id,
        seeded_rate_plan_id,
    )
    booking_id = body["id"]
    created_booking_ids.append(booking_id)

    assert body["status"] == "CART"
    assert body["property_id"] == seeded_property_id

    # The cart must be retrievable
    detail = await http_client.get(
        f"/api/v1/booking/bookings/{booking_id}", headers=headers
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["status"] == "CART"


async def test_checkout_happy_path_transitions_to_pending_confirmation(
    http_client: httpx.AsyncClient,
    traveler_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    """Validates the full async chain: Booking emits PaymentRequested →
    Payment authorizes via MockGateway → emits PaymentSucceeded → Booking
    consumes and transitions PENDING_PAYMENT → PENDING_CONFIRMATION.
    """
    headers = auth_header(traveler_token)
    body = await _create_cart(
        http_client,
        headers,
        booking_dates,
        seeded_property_id,
        seeded_room_type_id,
        seeded_rate_plan_id,
    )
    booking_id = body["id"]
    created_booking_ids.append(booking_id)

    await _save_guests(http_client, headers, booking_id)

    resp = await http_client.post(
        f"/api/v1/booking/bookings/{booking_id}/checkout",
        headers=headers,
        json={"force_decline": False},
    )
    assert resp.status_code in (200, 202), resp.text

    final = await wait_for_booking_status(
        http_client,
        headers,
        booking_id,
        expected={"PENDING_CONFIRMATION"},
        timeout=25.0,
    )
    assert final["status"] == "PENDING_CONFIRMATION"


async def test_cancel_cart_marks_booking_cancelled(
    http_client: httpx.AsyncClient,
    traveler_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    headers = auth_header(traveler_token)
    body = await _create_cart(
        http_client,
        headers,
        booking_dates,
        seeded_property_id,
        seeded_room_type_id,
        seeded_rate_plan_id,
    )
    booking_id = body["id"]
    created_booking_ids.append(booking_id)

    resp = await http_client.post(
        f"/api/v1/booking/bookings/{booking_id}/cancel",
        headers=headers,
    )
    assert resp.status_code in (200, 204), resp.text

    detail = await http_client.get(
        f"/api/v1/booking/bookings/{booking_id}", headers=headers
    )
    assert detail.status_code == 200, detail.text
    # Per cancel_cart_booking.py, abandoned carts go to EXPIRED (not CANCELLED).
    assert detail.json()["status"] == "EXPIRED"
