"""Notification integration test (OBJ-004 — 1 of 10-12).

Drives a booking through the full happy path to PENDING_CONFIRMATION,
hotel-manager confirms it, and asserts that the BookingConfirmed event is
consumed by the Notification worker (a row appears in
notifications.notification).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date

import asyncpg
import httpx
import pytest

from helpers.polling import wait_for_booking_status, wait_for_db_row


async def test_hotel_confirms_booking_creates_notification(
    http_client: httpx.AsyncClient,
    db_pool: asyncpg.Pool,
    traveler_token: str,
    hotel_manager_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    traveler_headers = auth_header(traveler_token)
    manager_headers = auth_header(hotel_manager_token)

    # Step 1: traveler creates a cart on a property the manager owns
    # (Cancún belongs to "Cadena del Sol" → roberto@cadenadelsol.com).
    checkin, checkout = booking_dates
    resp = await http_client.post(
        "/api/v1/booking/bookings",
        headers=traveler_headers,
        json={
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "currency_code": "USD",
            "property_id": seeded_property_id,
            "room_type_id": seeded_room_type_id,
            "rate_plan_id": seeded_rate_plan_id,
            "guests_count": 2,
        },
    )
    if resp.status_code in (404, 409):
        pytest.skip(
            f"cart pre-condition failed ({resp.status_code}). Re-seed with "
            "`make reset-db && make up`."
        )
    assert resp.status_code == 201, resp.text
    booking_id = resp.json()["id"]
    created_booking_ids.append(booking_id)

    # Step 1b: save guests (required before checkout)
    guests_resp = await http_client.put(
        f"/api/v1/booking/bookings/{booking_id}/guests",
        headers=traveler_headers,
        json={
            "guests": [
                {
                    "is_primary": True,
                    "full_name": "Test Primary",
                    "email": "primary@test.local",
                    "phone": "+10000000001",
                },
                {
                    "is_primary": False,
                    "full_name": "Test Secondary",
                    "email": "secondary@test.local",
                    "phone": "+10000000002",
                },
            ]
        },
    )
    assert guests_resp.status_code in (200, 204), guests_resp.text

    # Step 2: traveler checks out → reaches PENDING_CONFIRMATION via async flow
    co = await http_client.post(
        f"/api/v1/booking/bookings/{booking_id}/checkout",
        headers=traveler_headers,
        json={"force_decline": False},
    )
    assert co.status_code in (200, 202), co.text
    await wait_for_booking_status(
        http_client,
        traveler_headers,
        booking_id,
        expected={"PENDING_CONFIRMATION"},
        timeout=25.0,
    )

    # Step 3: hotel manager confirms.
    confirm = await http_client.patch(
        f"/api/v1/booking/bookings/{booking_id}/confirm",
        headers=manager_headers,
    )
    assert confirm.status_code in (200, 204), confirm.text

    # Step 4: BookingConfirmed event flows to Notification → row persisted.
    row = await wait_for_db_row(
        db_pool,
        """
        select id, channel, type, status, to_email
        from notifications.notification
        where booking_id = $1::uuid
        order by created_at desc limit 1
        """,
        booking_id,
        timeout=20.0,
    )
    assert row["channel"] == "EMAIL"
    assert row["status"] in ("PENDING", "SENT")
    assert row["to_email"], "expected non-empty recipient email"
