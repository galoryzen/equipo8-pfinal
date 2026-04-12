from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.exceptions import BookingNotFoundError
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.domain.models import Booking, BookingItem, BookingStatus, CancellationPolicyType


def _booking(
    bid: UUID,
    uid: UUID,
    status: BookingStatus,
    checkin: date,
    checkout: date,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc)
    b = Booking(
        id=bid,
        user_id=uid,
        status=status,
        checkin=checkin,
        checkout=checkout,
        hold_expires_at=None,
        total_amount=Decimal("100.00"),
        currency_code="USD",
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        created_at=now,
        updated_at=now,
    )
    b.items = [
        BookingItem(
            id=UUID("91000000-0000-0000-0000-000000000001"),
            booking_id=bid,
            property_id=UUID("30000000-0000-0000-0000-000000000001"),
            room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
            rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
            quantity=1,
            unit_price=Decimal("100.00"),
            subtotal=Decimal("100.00"),
        )
    ]
    return b


@pytest.mark.asyncio
class TestListMyBookingsUseCase:
    async def test_returns_all_bookings_for_user(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        b1 = _booking(
            UUID("90000000-0000-0000-0000-000000000001"),
            uid,
            BookingStatus.CONFIRMED,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        b2 = _booking(
            UUID("90000000-0000-0000-0000-000000000002"),
            uid,
            BookingStatus.CANCELLED,
            date(2026, 6, 1),
            date(2026, 6, 3),
        )
        repo = AsyncMock()
        repo.list_by_user_id.return_value = [b1, b2]

        uc = ListMyBookingsUseCase(repo)
        out = await uc.execute(user_id=uid)

        repo.list_by_user_id.assert_awaited_once_with(uid)
        assert len(out) == 2
        ids = {x.id for x in out}
        assert ids == {b1.id, b2.id}

    async def test_each_item_includes_status(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        b1 = _booking(
            UUID("90000000-0000-0000-0000-000000000001"),
            uid,
            BookingStatus.PENDING_CONFIRMATION,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        repo = AsyncMock()
        repo.list_by_user_id.return_value = [b1]

        uc = ListMyBookingsUseCase(repo)
        out = await uc.execute(user_id=uid)

        assert out[0].status == "PENDING_CONFIRMATION"

    async def test_user_with_no_bookings_returns_empty_list(self):
        uid = UUID("a0000000-0000-0000-0000-000000000099")
        repo = AsyncMock()
        repo.list_by_user_id.return_value = []

        uc = ListMyBookingsUseCase(repo)
        out = await uc.execute(user_id=uid)

        assert out == []


@pytest.mark.asyncio
class TestGetBookingDetailUseCase:
    async def test_returns_detail_with_items_for_owner(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000001")
        b = _booking(
            bid,
            uid,
            BookingStatus.CONFIRMED,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = b

        uc = GetBookingDetailUseCase(repo)
        out = await uc.execute(booking_id=bid, user_id=uid)

        repo.get_by_id_for_user.assert_awaited_once_with(bid, uid)
        assert out.id == bid
        assert out.status == "CONFIRMED"
        assert len(out.items) == 1
        assert out.items[0].property_id == b.items[0].property_id
        assert out.total_amount == Decimal("100.00")

    async def test_other_users_booking_raises_not_found(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000099")
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None

        uc = GetBookingDetailUseCase(repo)

        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=bid, user_id=uid)
