"""Unit tests for ExpireUnpaidBookingsUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.exceptions import CatalogUnavailableError
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.use_cases.expire_unpaid_bookings import ExpireUnpaidBookingsUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType


def _booking(booking_id: UUID, *, status: BookingStatus = BookingStatus.CART) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=booking_id,
        user_id=UUID("a0000000-0000-0000-0000-000000000001"),
        status=status,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 4, 1, 11, 45, 0),  # past
        total_amount=Decimal("300.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        inventory_released=False,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestExpireUnpaidBookingsUseCase:
    async def test_noop_when_no_expired_bookings(self):
        repo = AsyncMock()
        repo.find_expired_unpaid_bookings.return_value = []
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = ExpireUnpaidBookingsUseCase(repo, catalog)
        result = await uc.execute()

        assert result == 0
        repo.save.assert_not_awaited()
        catalog.release_hold.assert_not_awaited()

    async def test_transitions_cart_and_releases_inline(self):
        booking = _booking(UUID("90000000-0000-0000-0000-000000000001"))
        repo = AsyncMock()
        repo.find_expired_unpaid_bookings.return_value = [booking]
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = ExpireUnpaidBookingsUseCase(repo, catalog)
        result = await uc.execute()

        assert result == 1
        assert booking.status == BookingStatus.EXPIRED
        assert booking.inventory_released is True
        catalog.release_hold.assert_awaited_once()
        assert repo.save.await_count == 2

    async def test_transitions_pending_payment_same_way(self):
        booking = _booking(
            UUID("90000000-0000-0000-0000-000000000002"),
            status=BookingStatus.PENDING_PAYMENT,
        )
        repo = AsyncMock()
        repo.find_expired_unpaid_bookings.return_value = [booking]
        catalog = AsyncMock(spec=CatalogInventoryPort)

        uc = ExpireUnpaidBookingsUseCase(repo, catalog)
        result = await uc.execute()

        assert result == 1
        assert booking.status == BookingStatus.EXPIRED
        assert booking.inventory_released is True
        catalog.release_hold.assert_awaited_once()

    async def test_state_transition_persists_when_release_fails(self):
        booking = _booking(UUID("90000000-0000-0000-0000-000000000003"))
        repo = AsyncMock()
        repo.find_expired_unpaid_bookings.return_value = [booking]
        catalog = AsyncMock(spec=CatalogInventoryPort)
        catalog.release_hold.side_effect = CatalogUnavailableError("down")

        uc = ExpireUnpaidBookingsUseCase(repo, catalog)
        result = await uc.execute()

        assert result == 1
        assert booking.status == BookingStatus.EXPIRED
        assert booking.inventory_released is False
        assert repo.save.await_count == 1

    async def test_processes_mixed_statuses_independently(self):
        b1 = _booking(UUID("90000000-0000-0000-0000-000000000001"))
        b2 = _booking(
            UUID("90000000-0000-0000-0000-000000000002"),
            status=BookingStatus.PENDING_PAYMENT,
        )
        repo = AsyncMock()
        repo.find_expired_unpaid_bookings.return_value = [b1, b2]
        catalog = AsyncMock(spec=CatalogInventoryPort)
        catalog.release_hold.side_effect = [None, CatalogUnavailableError("partial outage")]

        uc = ExpireUnpaidBookingsUseCase(repo, catalog)
        result = await uc.execute()

        assert result == 2
        assert b1.inventory_released is True
        assert b2.inventory_released is False
        assert b1.status == BookingStatus.EXPIRED
        assert b2.status == BookingStatus.EXPIRED
