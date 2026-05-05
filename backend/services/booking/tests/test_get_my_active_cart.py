"""Unit tests for GetMyActiveCartUseCase + /bookings/my-cart endpoint."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.adapters.inbound.api.dependencies import get_my_active_cart_use_case
from app.application.use_cases.get_my_active_cart import GetMyActiveCartUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.main import app

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")


def _cart_booking() -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=BookingStatus.CART,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 4, 1, 12, 15, 0),
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=False,
        guests_count=1,
        nightly_breakdown=None,
        taxes=Decimal("0"),
        service_fee=Decimal("0"),
        confirmation_payment_intent_id=None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestGetMyActiveCartUseCase:
    async def test_returns_detail_when_active_cart_exists(self):
        booking = _cart_booking()
        repo = AsyncMock()
        repo.find_any_active_cart_for_user.return_value = booking

        uc = GetMyActiveCartUseCase(repo)
        out = await uc.execute(user_id=USER_ID)

        assert out is not None
        assert out.id == BOOKING_ID
        assert out.status == "CART"
        repo.find_any_active_cart_for_user.assert_awaited_once_with(USER_ID)

    async def test_returns_none_when_no_active_cart(self):
        repo = AsyncMock()
        repo.find_any_active_cart_for_user.return_value = None

        uc = GetMyActiveCartUseCase(repo)
        out = await uc.execute(user_id=USER_ID)

        assert out is None


class TestGetMyCartEndpoint:
    def test_returns_cart_when_present(self, client_authenticated):
        mock_uc = AsyncMock()
        booking = _cart_booking()
        # The endpoint expects a BookingDetailOut, so let the use case mock build one.
        from app.application.use_cases.get_my_active_cart import _to_detail

        mock_uc.execute.return_value = _to_detail(booking)
        app.dependency_overrides[get_my_active_cart_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings/my-cart")
        finally:
            app.dependency_overrides.pop(get_my_active_cart_use_case, None)

        assert resp.status_code == 200
        body = resp.json()
        assert body is not None
        assert body["status"] == "CART"
        assert body["id"] == str(BOOKING_ID)

    def test_returns_null_body_when_no_cart(self, client_authenticated):
        mock_uc = AsyncMock()
        mock_uc.execute.return_value = None
        app.dependency_overrides[get_my_active_cart_use_case] = lambda: mock_uc
        try:
            resp = client_authenticated.get("/api/v1/booking/bookings/my-cart")
        finally:
            app.dependency_overrides.pop(get_my_active_cart_use_case, None)

        assert resp.status_code == 200
        assert resp.json() is None

    def test_unauthenticated_request_is_rejected(self):
        resp = TestClient(app).get("/api/v1/booking/bookings/my-cart")
        assert resp.status_code == 401
