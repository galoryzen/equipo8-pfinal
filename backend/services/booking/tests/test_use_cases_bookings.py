from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from app.application.exceptions import BookingNotFoundError
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.domain.models import (
    Booking,
    BookingScope,
    BookingStatus,
    BookingStatusHistory,
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
    *,
    actual_checkin_at: datetime | None = None,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid,
        user_id=uid,
        status=status,
        checkin=checkin,
        checkout=checkout,
        actual_checkin_at=actual_checkin_at,
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
        taxes=Decimal("10.00"),
        service_fee=Decimal("5.00"),
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
        assert out.items[0].display_reference == "#00000001"

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
            hotel_id,
            status=None,
            date_from=None,
            date_to=None,
            room_type_id=None,
            q=None,
            page=1,
            page_size=10,
        )
        assert len(out.items) == 1
        assert out.items[0].can_register_check_in is False

    async def test_execute_hotel_can_register_when_confirmed_and_checkin_not_future(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        b = _booking(
            UUID("90000000-0000-0000-0000-000000000095"),
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 4, 10),
            date(2026, 4, 15),
        )
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b], 1)
        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        out = await uc.execute_hotel(hotel_id=hotel_id)
        assert out.items[0].can_register_check_in is True

    async def test_hotel_list_exposes_distinct_display_reference_per_booking(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        b1 = _booking(
            UUID("90000000-0000-0000-0000-000000000001"),
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        b2 = _booking(
            UUID("90000000-0000-0000-0000-0000000000aa"),
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 5, 2),
            date(2026, 5, 5),
        )
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b1, b2], 2)
        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        out = await uc.execute_hotel(hotel_id=hotel_id)
        refs = {x.display_reference for x in out.items}
        assert refs == {"#00000001", "#000000AA"}

    async def test_hotel_list_resolves_room_type_name_from_catalog_property_detail(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        pid = UUID("30000000-0000-0000-0000-000000000099")
        rt_id = UUID("60000000-0000-0000-0000-000000000099")
        b = _booking(
            UUID("90000000-0000-0000-0000-000000000011"),
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        b.property_id = pid
        b.room_type_id = rt_id
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b], 1)

        ok = MagicMock()
        ok.status_code = 200
        ok.json = MagicMock(
            return_value={
                "detail": {
                    "name": "Prop",
                    "images": [],
                    "room_types": [{"id": str(rt_id), "name": "Suite Ocean"}],
                }
            }
        )
        client = AsyncMock()
        client.get = AsyncMock(return_value=ok)

        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=client)
        out = await uc.execute_hotel(hotel_id=hotel_id)
        assert out.items[0].room_type_name == "Suite Ocean"
        assert out.items[0].display_reference == "#00000011"

    async def test_execute_hotel_forwards_filters_to_repository(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([], 0)
        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        d0 = date(2026, 6, 1)
        d1 = date(2026, 6, 30)
        rt = UUID("60000000-0000-0000-0000-000000000099")
        await uc.execute_hotel(
            hotel_id,
            status=BookingStatus.CONFIRMED,
            date_from=d0,
            date_to=d1,
            room_type_id=rt,
            q="alice",
            page=2,
            page_size=20,
        )
        repo.list_by_hotel.assert_awaited_once_with(
            hotel_id,
            status=BookingStatus.CONFIRMED,
            date_from=d0,
            date_to=d1,
            room_type_id=rt,
            q="alice",
            page=2,
            page_size=20,
        )

    async def test_execute_hotel_export_calls_repository_without_pagination(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([], 0)
        uc = ListMyBookingsUseCase(repo, clock=_clock, catalog_http_client=_mock_catalog_client())
        await uc.execute_hotel_export_csv(hotel_id)
        repo.list_by_hotel.assert_awaited_once_with(
            hotel_id,
            status=None,
            date_from=None,
            date_to=None,
            room_type_id=None,
            q=None,
            page=1,
            page_size=None,
        )

    async def test_list_items_include_guest_email_when_guest_repo_returns_it(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000001")
        b = _booking(bid, uid, BookingStatus.CONFIRMED, date(2026, 5, 1), date(2026, 5, 4))
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b], 1)
        guest_repo = AsyncMock()
        guest_repo.get_primary_contact_for_bookings.return_value = {
            bid: ("Jane Doe", "jane@example.com")
        }
        uc = ListMyBookingsUseCase(
            repo,
            guest_repo=guest_repo,
            clock=_clock,
            catalog_http_client=_mock_catalog_client(),
        )
        out = await uc.execute_hotel(hotel_id=hotel_id)
        assert out.items[0].guest_name == "Jane Doe"
        assert out.items[0].guest_email == "jane@example.com"

    async def test_execute_hotel_export_csv_contains_expected_columns(self):
        hotel_id = UUID("e0000000-0000-0000-0000-000000000001")
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000001")
        b = _booking(bid, uid, BookingStatus.CONFIRMED, date(2026, 5, 1), date(2026, 5, 4))
        repo = AsyncMock()
        repo.list_by_hotel.return_value = ([b], 1)
        guest_repo = AsyncMock()
        guest_repo.get_primary_contact_for_bookings.return_value = {
            bid: ("Jane Doe", "jane@example.com")
        }
        uc = ListMyBookingsUseCase(
            repo,
            guest_repo=guest_repo,
            clock=_clock,
            catalog_http_client=_mock_catalog_client(),
        )
        raw = await uc.execute_hotel_export_csv(hotel_id)
        text = raw.decode("utf-8-sig")
        assert "Booking reference" in text
        assert "Guest email" in text
        assert "Currency" in text
        assert "Jane Doe" in text
        assert "jane@example.com" in text
        assert "#00000001" in text

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
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = GetBookingDetailUseCase(repo)
        out = await uc.execute(booking_id=bid, user_id=uid)

        repo.get_by_id_for_user.assert_awaited_once_with(bid, uid)
        assert out.id == bid
        assert out.status == "CONFIRMED"
        assert out.can_register_check_in is False
        assert out.property_id == b.property_id
        assert out.room_type_id == b.room_type_id
        assert out.rate_plan_id == b.rate_plan_id
        assert out.unit_price == b.unit_price
        assert out.total_amount == Decimal("100.00")
        assert out.last_payment_attempt is None

    async def test_other_users_booking_raises_not_found(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000099")
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = None

        uc = GetBookingDetailUseCase(repo)

        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=bid, user_id=uid)

    async def test_exposes_last_payment_attempt_when_history_has_failure(self):
        uid = UUID("a0000000-0000-0000-0000-000000000001")
        bid = UUID("90000000-0000-0000-0000-000000000050")
        b = _booking(
            bid,
            uid,
            BookingStatus.PENDING_PAYMENT,
            date(2026, 5, 1),
            date(2026, 5, 4),
        )
        intent_id = uuid4()
        # changed_at is stored naive UTC, the use case attaches tz info.
        occurred = datetime(2026, 4, 25, 18, 30, 0)
        history_row = BookingStatusHistory(
            id=uuid4(),
            booking_id=bid,
            from_status=BookingStatus.PENDING_PAYMENT,
            to_status=BookingStatus.PENDING_PAYMENT,
            reason=f"payment_failed:{intent_id}:mock_decline:card_declined",
            changed_by=None,
            changed_at=occurred,
        )
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = b
        repo.find_last_status_history_by_reason_prefix.return_value = history_row

        uc = GetBookingDetailUseCase(repo)
        out = await uc.execute(booking_id=bid, user_id=uid)

        repo.find_last_status_history_by_reason_prefix.assert_awaited_once_with(
            bid, "payment_failed:"
        )
        assert out.last_payment_attempt is not None
        assert out.last_payment_attempt.outcome == "failed"
        # Reason strips the "payment_failed:{intent}:" prefix and keeps the rest
        # intact, including any colons in the upstream gateway reason.
        assert out.last_payment_attempt.reason == "mock_decline:card_declined"
        # Returned datetime is tz-aware UTC so JS clients parse it correctly.
        assert out.last_payment_attempt.occurred_at == occurred.replace(tzinfo=UTC)
        assert out.last_payment_attempt.occurred_at.utcoffset() == timedelta(0)

    async def test_hotel_viewer_sees_can_register_when_eligible(self):
        bid = UUID("90000000-0000-0000-0000-000000000095")
        uid = UUID("b0000000-0000-0000-0000-000000000001")
        b = _booking(
            bid,
            UUID("a0000000-0000-0000-0000-000000000001"),
            BookingStatus.CONFIRMED,
            date(2026, 4, 10),
            date(2026, 4, 15),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        repo.find_last_status_history_by_reason_prefix = AsyncMock(return_value=None)
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        uc = GetBookingDetailUseCase(repo, guest_repo)
        hid = UUID("e0000000-0000-0000-0000-000000000001")
        out = await uc.execute(
            bid,
            uid,
            viewer_role="HOTEL",
            hotel_id=hid,
            today=date(2026, 4, 19),
        )
        repo.get_by_id_for_hotel.assert_awaited_once_with(bid, hid)
        assert out.can_register_check_in is True
