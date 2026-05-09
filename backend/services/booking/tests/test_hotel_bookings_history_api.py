"""Hotel bookings history: query filters, validation, and CSV export wiring."""

import math
from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

from app.adapters.inbound.api.dependencies import (
    get_current_user_info,
    get_list_my_bookings_use_case,
)
from app.domain.models import BookingStatus
from app.main import app
from app.schemas.booking import BookingListItemOut, PaginatedBookingListOut

USER_A = UUID("a0000000-0000-0000-0000-000000000001")
HOTEL_ID = UUID("e0000000-0000-0000-0000-000000000001")


def _empty_page():
    return PaginatedBookingListOut(items=[], total=0, page=1, page_size=10, total_pages=1)


class TestHotelBookingsHistoryApi:
    def test_hotel_list_forwards_filters_to_execute_hotel(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute_hotel.return_value = _empty_page()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "HOTEL",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        rt = "60000000-0000-0000-0000-000000000099"
        try:
            r = client_authenticated.get(
                "/api/v1/booking/bookings"
                f"?status=CONFIRMED&date_from=2026-06-01&date_to=2026-06-30"
                f"&room_type_id={rt}&q=alice&page=2&page_size=25"
            )
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 200
        mock_uc.execute_hotel.assert_awaited_once()
        assert mock_uc.execute_hotel.await_args.args == (HOTEL_ID,)
        kw = mock_uc.execute_hotel.await_args.kwargs
        assert kw["status"] == BookingStatus.CONFIRMED
        assert kw["date_from"] == date(2026, 6, 1)
        assert kw["date_to"] == date(2026, 6, 30)
        assert str(kw["room_type_id"]) == rt
        assert kw["q"] == "alice"
        assert kw["page"] == 2
        assert kw["page_size"] == 25

    def test_hotel_list_strips_search_whitespace(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute_hotel.return_value = _empty_page()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "MANAGER",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        try:
            r = client_authenticated.get("/api/v1/booking/bookings?q=%20x%20")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 200
        assert mock_uc.execute_hotel.await_args.kwargs["q"] == "x"

    def test_traveler_list_does_not_forward_hotel_filters_to_execute(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _empty_page()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            r = client_authenticated.get(
                "/api/v1/booking/bookings?date_from=2026-01-01&date_to=2026-01-31&q=ignored"
            )
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert r.status_code == 200
        mock_uc.execute_hotel.assert_not_awaited()
        kw = mock_uc.execute.await_args.kwargs
        assert "date_from" not in kw
        assert "q" not in kw

    def test_date_range_invalid_returns_422(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute_hotel.return_value = _empty_page()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "HOTEL",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        try:
            r = client_authenticated.get(
                "/api/v1/booking/bookings?date_from=2026-06-10&date_to=2026-06-01"
            )
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 422
        mock_uc.execute_hotel.assert_not_awaited()

    def test_invalid_status_returns_422(self, client_authenticated):
        mock_uc = AsyncMock()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            r = client_authenticated.get("/api/v1/booking/bookings?status=NOT_A_REAL_STATUS")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert r.status_code == 422

    def test_page_size_over_max_returns_422(self, client_authenticated):
        mock_uc = AsyncMock()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            r = client_authenticated.get("/api/v1/booking/bookings?page_size=101")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert r.status_code == 422

    def test_paginated_response_keeps_expected_booking_fields(self, client_authenticated):
        row = BookingListItemOut(
            id=UUID("90000000-0000-0000-0000-000000000001"),
            status="CONFIRMED",
            checkin=date(2026, 5, 10),
            checkout=date(2026, 5, 13),
            total_amount=Decimal("360.00"),
            currency_code="USD",
            property_id=UUID("30000000-0000-0000-0000-000000000001"),
            room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
            created_at=datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC),
            display_reference="#00000001",
            guest_name="Guest",
            guest_email="g@example.com",
            room_type_name="Standard",
            property_name="Hotel Prop",
        )
        items = [row]
        total = len(items)
        ps = 10
        mock_uc = AsyncMock()
        mock_uc.execute_hotel.return_value = PaginatedBookingListOut(
            items=items,
            total=total,
            page=1,
            page_size=ps,
            total_pages=max(1, math.ceil(total / ps)),
        )
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "HOTEL",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        try:
            r = client_authenticated.get("/api/v1/booking/bookings")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 200
        body = r.json()["items"][0]
        assert body["display_reference"] == "#00000001"
        assert body["guest_name"] == "Guest"
        assert body["guest_email"] == "g@example.com"
        assert body["checkin"] == "2026-05-10"
        assert body["checkout"] == "2026-05-13"
        assert body["created_at"] is not None
        assert body["total_amount"] == "360.00"
        assert body["status"] == "CONFIRMED"

    def test_export_forbidden_for_traveler(self, client_authenticated):
        mock_uc = AsyncMock()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        try:
            r = client_authenticated.get("/api/v1/booking/bookings/export")
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)

        assert r.status_code == 403
        mock_uc.execute_hotel_export_csv.assert_not_awaited()

    def test_export_hotel_invokes_use_case_with_same_filters(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute_hotel_export_csv.return_value = "a\n".encode()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "HOTEL",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        rt = "60000000-0000-0000-0000-000000000099"
        try:
            r = client_authenticated.get(
                "/api/v1/booking/bookings/export"
                f"?status=CANCELLED&date_from=2026-03-01&date_to=2026-03-31"
                f"&room_type_id={rt}&q=refcode"
            )
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("text/csv")
        assert "travelhub-bookings-history.csv" in (
            r.headers.get("content-disposition") or ""
        )
        mock_uc.execute_hotel_export_csv.assert_awaited_once_with(
            HOTEL_ID,
            status=BookingStatus.CANCELLED,
            date_from=date(2026, 3, 1),
            date_to=date(2026, 3, 31),
            room_type_id=UUID(rt),
            q="refcode",
        )

    def test_export_invalid_date_range_returns_422(self, client_authenticated):
        mock_uc = AsyncMock()
        app.dependency_overrides[get_list_my_bookings_use_case] = lambda: mock_uc
        app.dependency_overrides[get_current_user_info] = lambda: {
            "role": "HOTEL",
            "user_id": str(USER_A),
            "hotel_id": str(HOTEL_ID),
        }
        try:
            r = client_authenticated.get(
                "/api/v1/booking/bookings/export?date_from=2026-02-10&date_to=2026-02-01"
            )
        finally:
            app.dependency_overrides.pop(get_list_my_bookings_use_case, None)
            app.dependency_overrides.pop(get_current_user_info, None)

        assert r.status_code == 422
        mock_uc.execute_hotel_export_csv.assert_not_awaited()
