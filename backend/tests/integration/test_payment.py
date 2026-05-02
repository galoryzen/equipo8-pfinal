"""Payment integration tests (OBJ-004 — 2 of 10-12).

Covers the declined payment path (force_decline=true) and the explicit
payment-intent creation endpoint.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta

import asyncpg
import httpx
import pytest

from helpers.polling import wait_for_booking_status, wait_for_db_row


async def _create_cart(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    checkin: date,
    checkout: date,
    property_id: str,
    room_type_id: str,
    rate_plan_id: str,
) -> dict:
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
    if resp.status_code == 404:
        pytest.skip(
            f"cart pre-condition failed (404: {resp.text}). Re-seed with "
            "`make reset-db && make up`."
        )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _save_guests(
    client: httpx.AsyncClient, headers: dict[str, str], booking_id: str
) -> None:
    resp = await client.put(
        f"/api/v1/booking/bookings/{booking_id}/guests",
        headers=headers,
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
    assert resp.status_code in (200, 204), resp.text


async def test_checkout_force_decline_records_failure(
    http_client: httpx.AsyncClient,
    db_pool: asyncpg.Pool,
    traveler_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    """force_decline=True drives MockPaymentGateway to deny the charge.

    Expected effects (from process_payment_requested + handle_payment_result):
      * payments.payment_intent row with status='FAILED'
      * booking.booking_status_history row with reason starting 'payment_failed:'
      * booking.booking remains in 'PENDING_PAYMENT' (no PAYMENT_FAILED state exists)
    """
    headers = auth_header(traveler_token)
    # Distinct date window per test so we don't collide with other tests'
    # bookings on the same room+date (the use case rejects duplicates 409).
    checkin = date.today() + timedelta(days=11)
    checkout = checkin + timedelta(days=2)
    body = await _create_cart(
        http_client,
        headers,
        checkin,
        checkout,
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
        json={"force_decline": True},
    )
    assert resp.status_code in (200, 202), resp.text

    # 1. Wait for the failure history row.
    history_row = await wait_for_db_row(
        db_pool,
        """
        select id, reason, to_status from booking.booking_status_history
        where booking_id = $1::uuid and reason like 'payment_failed:%'
        order by changed_at desc limit 1
        """,
        booking_id,
        timeout=25.0,
    )
    assert history_row["to_status"] == "PENDING_PAYMENT"

    # 2. The payment intent should be marked FAILED.
    intent_row = await wait_for_db_row(
        db_pool,
        """
        select id, status from payments.payment_intent
        where booking_id = $1::uuid order by created_at desc limit 1
        """,
        booking_id,
        timeout=10.0,
    )
    assert intent_row["status"] == "FAILED", (
        f"expected intent.status=FAILED, got {intent_row['status']!r}"
    )

    # 3. Booking itself stays in PENDING_PAYMENT.
    detail = await http_client.get(
        f"/api/v1/booking/bookings/{booking_id}", headers=headers
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["status"] == "PENDING_PAYMENT"


async def test_payment_intent_endpoint_creates_intent(
    http_client: httpx.AsyncClient,
    db_pool: asyncpg.Pool,
    traveler_token: str,
    auth_header: Callable[[str], dict[str, str]],
    seeded_property_id: str,
    seeded_room_type_id: str,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
    created_booking_ids: list[str],
) -> None:
    """POST /payment-intents requires booking in PENDING_PAYMENT or
    PENDING_CONFIRMATION. Drive the booking through a successful checkout
    first, then call the explicit endpoint and assert it returns a 2xx
    with intent fields, and the row exists in payments.payment_intent.
    """
    headers = auth_header(traveler_token)
    checkin = date.today() + timedelta(days=14)
    checkout = checkin + timedelta(days=2)
    body = await _create_cart(
        http_client,
        headers,
        checkin,
        checkout,
        seeded_property_id,
        seeded_room_type_id,
        seeded_rate_plan_id,
    )
    booking_id = body["id"]
    created_booking_ids.append(booking_id)

    await _save_guests(http_client, headers, booking_id)

    co = await http_client.post(
        f"/api/v1/booking/bookings/{booking_id}/checkout",
        headers=headers,
        json={"force_decline": False},
    )
    assert co.status_code in (200, 202), co.text
    await wait_for_booking_status(
        http_client,
        headers,
        booking_id,
        expected={"PENDING_CONFIRMATION"},
        timeout=25.0,
    )

    resp = await http_client.post(
        "/api/v1/payment/payment-intents",
        headers={**headers, "Idempotency-Key": f"int-test-{booking_id}"},
        json={"booking_id": booking_id},
    )
    # The async checkout already created an intent; the explicit endpoint may
    # either return 201 (new) or 200/409 (idempotent or stateful conflict on a
    # SUCCEEDED intent). Any 2xx is fine — we just want a row to exist.
    assert resp.status_code in (200, 201, 202), resp.text

    # Persisted in payments.payment_intent
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "select id, status from payments.payment_intent where booking_id = $1::uuid "
            "order by created_at desc limit 1",
            booking_id,
        )
    assert row is not None, "payment_intent row not found for booking"
    assert row["status"] in ("PENDING", "SUCCEEDED", "FAILED")
