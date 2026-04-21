"""API wiring tests for guests endpoints."""

from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from app.adapters.inbound.api.dependencies import (
    get_list_booking_guests_use_case,
    get_save_booking_guests_use_case,
)
from app.application.exceptions import (
    BookingNotFoundError,
    GuestsCountMismatchError,
    InvalidBookingStateError,
    PrimaryGuestMissingContactError,
    PrimaryGuestRequiredError,
)
from app.main import app
from app.schemas.booking import GuestOut

BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")

_VALID_BODY = {
    "guests": [
        {
            "is_primary": True,
            "full_name": "Alice Primary",
            "email": "alice@example.com",
            "phone": "+1-555-010-1234",
        },
        {"is_primary": False, "full_name": "Bob Companion"},
    ]
}


def _guest_out(is_primary: bool, full_name: str, email=None, phone=None) -> GuestOut:
    return GuestOut(
        id=uuid4(),
        is_primary=is_primary,
        full_name=full_name,
        email=email,
        phone=phone,
    )


class TestSaveGuestsEndpoint:
    def test_returns_200_with_saved_guests(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            _guest_out(True, "Alice Primary", "alice@example.com", "+1-555-010-1234"),
            _guest_out(False, "Bob Companion"),
        ]
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["is_primary"] is True
        mock_uc.execute.assert_awaited_once()

    def test_returns_404_when_booking_not_found(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = BookingNotFoundError()
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 404
        assert resp.json()["code"] == "BOOKING_NOT_FOUND"

    def test_returns_409_when_booking_not_in_cart(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = InvalidBookingStateError("not CART")
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 409
        assert resp.json()["code"] == "INVALID_BOOKING_STATE"

    def test_returns_422_when_guests_count_mismatch(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = GuestsCountMismatchError("expected 3 got 2")
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 422
        assert resp.json()["code"] == "GUESTS_COUNT_MISMATCH"

    def test_returns_422_when_no_primary(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PrimaryGuestRequiredError("need one primary")
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 422
        assert resp.json()["code"] == "PRIMARY_GUEST_REQUIRED"

    def test_returns_422_when_primary_missing_contact(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = PrimaryGuestMissingContactError("no contact")
        app.dependency_overrides[get_save_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.put(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
            )
        finally:
            app.dependency_overrides.pop(get_save_booking_guests_use_case, None)

        assert resp.status_code == 422
        assert resp.json()["code"] == "PRIMARY_GUEST_MISSING_CONTACT"

    def test_empty_body_returns_422(self, client_authenticated):
        resp = client_authenticated.put(
            f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json={}
        )
        assert resp.status_code == 422

    def test_empty_guests_list_returns_422(self, client_authenticated):
        resp = client_authenticated.put(
            f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json={"guests": []}
        )
        assert resp.status_code == 422

    def test_missing_full_name_returns_422(self, client_authenticated):
        body = {"guests": [{"is_primary": True, "email": "x@y.com", "phone": "+123"}]}
        resp = client_authenticated.put(
            f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=body
        )
        assert resp.status_code == 422

    def test_unauthenticated_is_rejected(self):
        from fastapi.testclient import TestClient

        resp = TestClient(app).put(
            f"/api/v1/booking/bookings/{BOOKING_ID}/guests", json=_VALID_BODY
        )
        assert resp.status_code in {401, 422}


class TestListGuestsEndpoint:
    def test_returns_guests_list(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = [
            _guest_out(True, "Alice Primary", "alice@example.com", "+1-555-010-1234"),
        ]
        app.dependency_overrides[get_list_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests"
            )
        finally:
            app.dependency_overrides.pop(get_list_booking_guests_use_case, None)

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["is_primary"] is True

    def test_returns_404_when_booking_not_found(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = BookingNotFoundError()
        app.dependency_overrides[get_list_booking_guests_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get(
                f"/api/v1/booking/bookings/{BOOKING_ID}/guests"
            )
        finally:
            app.dependency_overrides.pop(get_list_booking_guests_use_case, None)

        assert resp.status_code == 404
