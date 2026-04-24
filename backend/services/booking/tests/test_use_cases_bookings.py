from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest

from app.application.exceptions import BookingNotFoundError
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.domain.models import (
    Booking,
    BookingScope,
    BookingStatus,
    CancellationPolicyType,
)
from app.schemas.booking import PaginatedBookingListOut


def _mock_catalog_client():
    """Stub httpx.AsyncClient whose get() always returns 404 (no enrichment)."""
    response = MagicMock()
    response.status_code = 404
    client = AsyncMock()
    client.get = AsyncMock(return_value=response)
    return client

FIXED_TODAY = date(2026, 4, 19)


def _clock() -> date:
    return FIXED_TODAY


def _booking(
    bid: UUID,
    uid: UUID,
    status: BookingStatus,
    checkin: date,
    checkout: date,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid,
        user_id=uid,
        status=status,
        checkin=checkin,
        checkout=checkout,
        hold_expires_at=None,
        total_amount=Decimal("100.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        guests_count=1,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestListMyBookingsUseCase:
    async def test_returns_all_bookings_for_user_with_default_scope(self):
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
        repo.list_by_user_id.return_value = ([b1, b2], 2)

        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        out = await uc.execute(user_id=uid)

        repo.list_by_user_id.assert_awaited_once_with(
            uid, scope=BookingScope.ALL, today=FIXED_TODAY, page=1, page_size=10
        )
        assert len(out.items) == 2
        ids = {x.id for x in out.items}
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
        repo.list_by_user_id.return_value = ([b1], 1)

        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        out = await uc.execute(user_id=uid)

        assert out.items[0].status == "PENDING_CONFIRMATION"
        assert out.items[0].property_id == b1.property_id
        assert out.items[0].room_type_id == b1.room_type_id

    async def test_user_with_no_bookings_returns_empty_list(self):
        uid = UUID("a0000000-0000-0000-0000-000000000099")
        repo = AsyncMock()
        repo.list_by_user_id.return_value = ([], 0)

        uc = ListMyBookingsUseCase(repo, clock=_clock)
        out = await uc.execute(user_id=uid)

        assert out == PaginatedBookingListOut(items=[], total=0, page=1, page_size=10, total_pages=1)

    async def test_active_scope_forwarded_to_repo(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        repo = AsyncMock()
        repo.list_by_user_id.return_value = ([], 0)

        uc = ListMyBookingsUseCase(repo, clock=_clock)
        await uc.execute(user_id=uid, scope=BookingScope.ACTIVE)

        repo.list_by_user_id.assert_awaited_once_with(
            uid, scope=BookingScope.ACTIVE, today=FIXED_TODAY, page=1, page_size=10
        )

    async def test_past_scope_forwarded_to_repo(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        repo = AsyncMock()
        repo.list_by_user_id.return_value = ([], 0)

        uc = ListMyBookingsUseCase(repo, clock=_clock)
        await uc.execute(user_id=uid, scope=BookingScope.PAST)

        repo.list_by_user_id.assert_awaited_once_with(
            uid, scope=BookingScope.PAST, today=FIXED_TODAY, page=1, page_size=10
        )

    async def test_execute_hotel_uses_hotel_id_directly(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        b1 = _booking(
            UUID("90000000-0000-0000-0000-000000000001"),
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b1], 1)

        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        out = await uc.execute_hotel(hotel_id=hotel_id)

        repo.list_by_hotel.assert_awaited_once_with(
            hotel_id=hotel_id, status=None, page=1, page_size=10
        )
        assert len(out.items) == 1

    async def test_pagination_metadata_is_correct(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        repo = AsyncMock()
        repo.list_by_user_id.return_value = ([], 25)

        uc = ListMyBookingsUseCase(repo, clock=_clock)
        out = await uc.execute(user_id=uid, page=2, page_size=10)

        assert out.total == 25
        assert out.page == 2
        assert out.page_size == 10
        assert out.total_pages == 3


@pytest.mark.asyncio
class TestGetBookingDetailUseCase:
    async def test_returns_detail_with_flat_fields_for_owner(self):
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
        assert out.property_id == b.property_id
        assert out.room_type_id == b.room_type_id
        assert out.rate_plan_id == b.rate_plan_id
        assert out.unit_price == b.unit_price
        assert out.total_amount == Decimal("100.00")

    async def test_other_users_booking_raises_not_found(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000099")
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None

        uc = GetBookingDetailUseCase(repo)

        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=bid, user_id=uid)
