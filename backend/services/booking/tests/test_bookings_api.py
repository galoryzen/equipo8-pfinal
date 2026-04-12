"""API wiring tests for traveler bookings (list + detail)."""

from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_list_my_bookings_use_case,
)
from app.application.exceptions import BookingNotFoundError
from app.main import app
from app.schemas.booking import (
    BookingDetailOut,
    BookingItemDetailOut,
    BookingItemSummaryOut,
    BookingListItemOut,
)

BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")


def _sample_list_row():
    return BookingListItemOut(
        id=BOOKING_ID,
        status="CONFIRMED",
        checkin=date(2026, 5, 10),
        checkout=date(2026, 5, 13),
        total_amount=Decimal("360.00"),
        currency_code="USD",
        created_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc),
        items=[
            BookingItemSummaryOut(
                property_id=UUID("30000000-0000-0000-0000-000000000001"),
                room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
                quantity=1,
            )
        ],
    )


def _sample_detail():
    return BookingDetailOut(
        id=BOOKING_ID,
        status="CONFIRMED",
        checkin=date(2026, 5, 10),
        checkout=date(2026, 5, 13),
        hold_expires_at=None,
        total_amount=Decimal("360.00"),
        currency_code="USD",
        policy_type_applied="FULL",
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        created_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc),
        items=[
            BookingItemDetailOut(
                id=UUID("91000000-0000-0000-0000-000000000001"),
                property_id=UUID("30000000-0000-0000-0000-000000000001"),
                room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
                rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
                quantity=1,
                unit_price=Decimal("120.00"),
                subtotal=Decimal("360.00"),
            )
        ],
    )


class TestBookingsEndpoints:
    def test_list_returns_all_bookings_for_authenticated_user(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [_sample_list_row(), _sample_list_row()]
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        mock_uc.execute.assert_awaited_once()

    def test_list_each_booking_includes_status(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [_sample_list_row()]
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        assert resp.json()[0]["status"] == "CONFIRMED"

    def test_list_empty_when_user_has_no_bookings(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        assert resp.json() == []

    def test_detail_returns_booking_with_items(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _sample_detail()
        app.dependency_overrides[get_booking_detail_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get(f"/api/v1/booking/bookings/{BOOKING_ID}")
        finally:
            app.dependency_overrides.pop(get_booking_detail_use_case, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(BOOKING_ID)
        assert body["status"] == "CONFIRMED"
        assert len(body["items"]) == 1
        assert body["items"][0]["subtotal"] == "360.00"

    def test_detail_other_user_returns_404(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = BookingNotFoundError()
        app.dependency_overrides[get_booking_detail_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get(f"/api/v1/booking/bookings/{BOOKING_ID}")
        finally:
            app.dependency_overrides.pop(get_booking_detail_use_case, None)

        assert resp.status_code == 404
        assert resp.json()["code"] == "BOOKING_NOT_FOUND"
