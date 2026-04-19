<<<<<<< Updated upstream
"""API wiring tests for cart creation and cancellation."""
=======
"""API wiring tests for cart creation (POST /bookings) and held rooms (GET /rooms/held)."""
>>>>>>> Stashed changes

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import (
<<<<<<< Updated upstream
    get_cancel_cart_booking_use_case,
    get_create_cart_booking_use_case,
)
from app.application.exceptions import (
    BookingNotFoundError,
    InvalidBookingStateError,
    InventoryUnavailableError,
)
from app.main import app
from app.schemas.booking import BookingDetailOut, CartBookingOut
=======
    get_create_cart_booking_use_case,
    get_held_rooms_use_case,
)
from app.main import app
from app.schemas.booking import BookingItemDetailOut, CartBookingOut, HeldRoomsOut
>>>>>>> Stashed changes

BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")
ROOM_TYPE_ID = UUID("60000000-0000-0000-0000-000000000001")
PROPERTY_ID = UUID("30000000-0000-0000-0000-000000000001")
RATE_PLAN_ID = UUID("70000000-0000-0000-0000-000000000001")

_VALID_PAYLOAD = {
    "checkin": "2026-06-01",
    "checkout": "2026-06-04",
    "currency_code": "USD",
<<<<<<< Updated upstream
    "property_id": str(PROPERTY_ID),
    "room_type_id": str(ROOM_TYPE_ID),
    "rate_plan_id": str(RATE_PLAN_ID),
    "unit_price": "100.00",
=======
    "items": [
        {
            "property_id": str(PROPERTY_ID),
            "room_type_id": str(ROOM_TYPE_ID),
            "rate_plan_id": str(RATE_PLAN_ID),
            "unit_price": "100.00",
        }
    ],
}

_HELD_PARAMS = {
    "property_id": str(PROPERTY_ID),
    "checkin": "2026-06-01",
    "checkout": "2026-06-04",
>>>>>>> Stashed changes
}


def _sample_cart() -> CartBookingOut:
    return CartBookingOut(
        id=BOOKING_ID,
        status="CART",
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 6, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
<<<<<<< Updated upstream
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("100.00"),
    )


def _sample_detail(status: str = "CANCELLED") -> BookingDetailOut:
    return BookingDetailOut(
        id=BOOKING_ID,
        status=status,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 6, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=PROPERTY_ID,
        room_type_id=ROOM_TYPE_ID,
        rate_plan_id=RATE_PLAN_ID,
        unit_price=Decimal("100.00"),
        policy_type_applied="FULL",
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        created_at=datetime(2026, 4, 1, 12, 0, 0),
        updated_at=datetime(2026, 4, 1, 12, 30, 0),
=======
        items=[
            BookingItemDetailOut(
                id=UUID("91000000-0000-0000-0000-000000000001"),
                property_id=PROPERTY_ID,
                room_type_id=ROOM_TYPE_ID,
                rate_plan_id=RATE_PLAN_ID,
                quantity=1,
                unit_price=Decimal("100.00"),
                subtotal=Decimal("300.00"),
            )
        ],
>>>>>>> Stashed changes
    )


class TestCreateCartEndpoint:
    def test_returns_201_with_cart_booking(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _sample_cart()
        app.dependency_overrides[get_create_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post("/api/v1/booking/bookings", json=_VALID_PAYLOAD)
        finally:
            app.dependency_overrides.pop(get_create_cart_booking_use_case, None)

        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "CART"
        assert body["id"] == str(BOOKING_ID)
<<<<<<< Updated upstream
        assert body["property_id"] == str(PROPERTY_ID)
        mock_uc.execute.assert_awaited_once()

    def test_returns_409_when_inventory_unavailable(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = InventoryUnavailableError()
        app.dependency_overrides[get_create_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post("/api/v1/booking/bookings", json=_VALID_PAYLOAD)
        finally:
            app.dependency_overrides.pop(get_create_cart_booking_use_case, None)

        assert resp.status_code == 409
        assert resp.json()["code"] == "INVENTORY_UNAVAILABLE"

=======
        assert "hold_expires_at" in body
        mock_uc.execute.assert_awaited_once()

>>>>>>> Stashed changes
    def test_unauthenticated_request_is_rejected(self):
        resp = TestClient(app).post("/api/v1/booking/bookings", json=_VALID_PAYLOAD)
        assert resp.status_code in {401, 422}

    def test_missing_body_returns_422(self, client_authenticated):
        resp = client_authenticated.post("/api/v1/booking/bookings", json={})
        assert resp.status_code == 422

<<<<<<< Updated upstream
    def test_payload_missing_required_fields_returns_422(self, client_authenticated):
        bad = dict(_VALID_PAYLOAD)
        del bad["room_type_id"]
        resp = client_authenticated.post("/api/v1/booking/bookings", json=bad)
        assert resp.status_code == 422


class TestCancelCartEndpoint:
    def test_returns_200_with_cancelled_booking(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _sample_detail("CANCELLED")
        app.dependency_overrides[get_cancel_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/cancel")
        finally:
            app.dependency_overrides.pop(get_cancel_cart_booking_use_case, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "CANCELLED"
        assert body["id"] == str(BOOKING_ID)

    def test_returns_404_when_booking_not_found(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = BookingNotFoundError()
        app.dependency_overrides[get_cancel_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/cancel")
        finally:
            app.dependency_overrides.pop(get_cancel_cart_booking_use_case, None)

        assert resp.status_code == 404
        assert resp.json()["code"] == "BOOKING_NOT_FOUND"

    def test_returns_409_when_not_in_cart_state(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.side_effect = InvalidBookingStateError("Cannot cancel booking in state CONFIRMED")
        app.dependency_overrides[get_cancel_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post(f"/api/v1/booking/bookings/{BOOKING_ID}/cancel")
        finally:
            app.dependency_overrides.pop(get_cancel_cart_booking_use_case, None)

        assert resp.status_code == 409
        assert resp.json()["code"] == "INVALID_BOOKING_STATE"

    def test_unauthenticated_request_is_rejected(self):
        resp = TestClient(app).post(f"/api/v1/booking/bookings/{BOOKING_ID}/cancel")
        assert resp.status_code == 401
=======
    def test_items_appear_in_response(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = _sample_cart()
        app.dependency_overrides[get_create_cart_booking_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.post("/api/v1/booking/bookings", json=_VALID_PAYLOAD)
        finally:
            app.dependency_overrides.pop(get_create_cart_booking_use_case, None)

        assert len(resp.json()["items"]) == 1
        assert resp.json()["items"][0]["subtotal"] == "300.00"


class TestGetHeldRoomsEndpoint:
    def test_returns_held_room_ids(self):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = HeldRoomsOut(held_room_type_ids=[ROOM_TYPE_ID])
        app.dependency_overrides[get_held_rooms_use_case] = lambda: mock_uc
        try:
            resp = TestClient(app).get("/api/v1/booking/rooms/held", params=_HELD_PARAMS)
        finally:
            app.dependency_overrides.pop(get_held_rooms_use_case, None)

        assert resp.status_code == 200
        assert str(ROOM_TYPE_ID) in resp.json()["held_room_type_ids"]

    def test_returns_empty_list_when_no_holds(self):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = HeldRoomsOut(held_room_type_ids=[])
        app.dependency_overrides[get_held_rooms_use_case] = lambda: mock_uc
        try:
            resp = TestClient(app).get("/api/v1/booking/rooms/held", params=_HELD_PARAMS)
        finally:
            app.dependency_overrides.pop(get_held_rooms_use_case, None)

        assert resp.status_code == 200
        assert resp.json()["held_room_type_ids"] == []

    def test_no_authentication_required(self):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = HeldRoomsOut(held_room_type_ids=[])
        app.dependency_overrides[get_held_rooms_use_case] = lambda: mock_uc
        try:
            # Plain TestClient — no auth headers
            resp = TestClient(app).get("/api/v1/booking/rooms/held", params=_HELD_PARAMS)
        finally:
            app.dependency_overrides.pop(get_held_rooms_use_case, None)

        assert resp.status_code == 200

    def test_missing_query_params_returns_422(self):
        resp = TestClient(app).get("/api/v1/booking/rooms/held")
        assert resp.status_code == 422
>>>>>>> Stashed changes
