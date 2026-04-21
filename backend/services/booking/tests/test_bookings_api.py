"""API wiring tests for traveler bookings (list + detail)."""

from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_checkout_booking_use_case,
    get_list_my_bookings_use_case,
)
from app.application.exceptions import (
    BookingNotFoundError,
    CheckoutGuestsIncompleteError,
    InvalidBookingStateError,
)
from app.main import app
from app.schemas.booking import BookingDetailOut, BookingListItemOut

BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
PROPERTY_ID = UUID("30000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")
RATE_PLAN_ID = UUID("70000000-0000-0000-0000-000000000001")


def _sample_list_row():
    return BookingListItemOut(
        id=BOOKING_ID,
        status="CONFIRMED",
        checkin=date(2026, 5, 10),
        checkout=date(2026, 5, 13),
        total_amount=Decimal("360.00"),
        currency_code="USD",
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        created_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC),
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
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("120.00"),
        policy_type_applied="FULL",
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        guests_count=2,
        created_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC),
        updated_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC),
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

    def test_list_forwards_active_scope_to_use_case(self, client_authenticated):
        from app.domain.models import BookingScope

        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings?scope=active")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        kwargs = mock_uc.execute.await_args.kwargs
        assert kwargs["scope"] is BookingScope.ACTIVE

    def test_list_forwards_past_scope_to_use_case(self, client_authenticated):
        from app.domain.models import BookingScope

        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings?scope=past")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        assert mock_uc.execute.await_args.kwargs["scope"] is BookingScope.PAST

    def test_list_rejects_invalid_scope_with_422(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = []
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings?scope=bogus")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 422
        mock_uc.execute.assert_not_awaited()

    def test_list_each_booking_includes_flat_room_fields(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [_sample_list_row()]
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert resp.status_code == 200
        first = resp.json()[0]
        assert first["status"] == "CONFIRMED"
        assert first["property_id"] == str(PROPERTY_ID)
        assert first["room_type_id"] == str(ROOM_TYPE_ID)
        assert "items" not in first

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

    def test_detail_returns_booking_with_flat_fields(self, client_authenticated):
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
        assert body["property_id"] == str(PROPERTY_ID)
        assert body["room_type_id"] == str(ROOM_TYPE_ID)
        assert body["rate_plan_id"] == str(RATE_PLAN_ID)
        assert body["unit_price"] == "120.00"
        assert body["total_amount"] == "360.00"
        assert "items" not in body

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

    def test_checkout_returns_202_and_detail(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _sample_detail()
        app.dependency_overrides[get_checkout_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/checkout")
        finally:
            app.dependency_overrides.pop(get_checkout_booking_use_case, None)

        assert resp.status_code == 202
        body = resp.json()
        assert body["id"] == str(BOOKING_ID)

    def test_checkout_maps_invalid_state_to_409(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = InvalidBookingStateError("Cannot checkout booking in state CONFIRMED")
        app.dependency_overrides[get_checkout_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/checkout")
        finally:
            app.dependency_overrides.pop(get_checkout_booking_use_case, None)

        assert resp.status_code == 409
        assert resp.json()["code"] == "INVALID_BOOKING_STATE"

    def test_checkout_maps_guests_incomplete_to_422(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = CheckoutGuestsIncompleteError("Booking expects 3 guests, found 2")
        app.dependency_overrides[get_checkout_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/checkout")
        finally:
            app.dependency_overrides.pop(get_checkout_booking_use_case, None)

        assert resp.status_code == 422
        assert resp.json()["code"] == "CHECKOUT_GUESTS_INCOMPLETE"

    def test_checkout_maps_booking_not_found_to_404(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = BookingNotFoundError()
        app.dependency_overrides[get_checkout_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/checkout")
        finally:
            app.dependency_overrides.pop(get_checkout_booking_use_case, None)

        assert resp.status_code == 404
        assert resp.json()["code"] == "BOOKING_NOT_FOUND"
