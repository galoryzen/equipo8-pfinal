"""Check-out registration: eligibility, validation, persistence, idempotency, flags, metrics."""

import inspect
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.hotel_booking_flags import hotel_can_register_check_out
from app.adapters.outbound.db import booking_repository as br_mod
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.register_guest_check_out import RegisterGuestCheckOutUseCase, _to_naive_utc
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import RegisterGuestCheckOutIn


def _booking(
    *,
    bid: UUID,
    status: BookingStatus,
    checkin: date,
    checkout: date,
    actual_checkin_at: datetime | None = None,
    actual_checkout_at: datetime | None = None,
    property_id: UUID | None = None,
) -> Booking:
    now = datetime(2026, 5, 3, 10, 0, 0, tzinfo=UTC)
    pid = property_id or UUID("30000000-0000-0000-0000-000000000001")
    uid = UUID("a0000000-0000-0000-0000-000000000001")
    return Booking(
        id=bid,
        user_id=uid,
        status=status,
        checkin=checkin,
        checkout=checkout,
        actual_checkin_at=actual_checkin_at,
        actual_checkout_at=actual_checkout_at,
        hold_expires_at=None,
        total_amount=Decimal("100.00"),
        currency_code="USD",
        property_id=pid,
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        guests_count=1,
        taxes=Decimal("0"),
        service_fee=Decimal("0"),
        created_at=now,
        updated_at=now,
    )


def test_register_guest_check_out_schema_requires_departure():
    with pytest.raises(ValidationError):
        RegisterGuestCheckOutIn()  # type: ignore[call-arg]


@pytest.mark.asyncio
class TestRegisterGuestCheckOutUseCase:
    async def test_eligible_checked_in_checkout_today_or_past_shows_flag(self):
        """CA1: detalle/lista exponen can_register_check_out cuando aplica."""
        today = date(2026, 5, 3)
        b = _booking(
            bid=uuid4(),
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 1),
            checkout=today,
            actual_checkin_at=datetime(2026, 5, 1, 14, 0, 0),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = GetBookingDetailUseCase(repo, guest_repo)
        hid = UUID("e0000000-0000-0000-0000-000000000001")
        out = await uc.execute(
            b.id,
            UUID("b0000000-0000-0000-0000-000000000001"),
            viewer_role="HOTEL",
            hotel_id=hid,
            today=today,
        )
        assert out.can_register_check_out is True
        assert out.actual_checkout_at is None

    async def test_persists_departure_status_history_and_detail(self):
        """CA3: estado CHECKED_OUT, actual_checkout_at, historial hotel_check_out."""
        bid = uuid4()
        today = date(2026, 5, 3)
        checkin_at = datetime(2026, 5, 1, 14, 0, 0)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 1),
            checkout=today,
            actual_checkin_at=checkin_at,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        history_rows: list = []

        async def capture_history(row):
            history_rows.append(row)

        repo.add_status_history.side_effect = capture_history

        departure = datetime(2026, 5, 3, 11, 0, 0, tzinfo=UTC)
        uc = RegisterGuestCheckOutUseCase(repo, guest_repo)
        out = await uc.execute(
            booking_id=bid,
            hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
            actor_user_id=UUID("b0000000-0000-0000-0000-000000000001"),
            actual_departure_at=departure,
            today=today,
        )
        repo.update.assert_awaited_once()
        repo.add_status_history.assert_awaited_once()
        assert len(history_rows) == 1
        assert history_rows[0].from_status == BookingStatus.CHECKED_IN
        assert history_rows[0].to_status == BookingStatus.CHECKED_OUT
        assert history_rows[0].reason == "hotel_check_out"
        assert out.status == "CHECKED_OUT"
        assert out.actual_checkout_at is not None
        assert out.can_register_check_out is False
        assert b.actual_checkout_at == _to_naive_utc(departure)
        assert b.status == BookingStatus.CHECKED_OUT

    async def test_wrong_hotel_returns_not_found(self):
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = None
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                booking_id=uuid4(),
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime.now(UTC),
                today=date(2026, 5, 3),
            )

    async def test_not_checked_in_raises(self):
        bid = uuid4()
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 3),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="check-in"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime(2026, 5, 3, 10, 0, 0, tzinfo=UTC),
                today=date(2026, 5, 3),
            )

    async def test_missing_actual_checkin_raises(self):
        bid = uuid4()
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 3),
            actual_checkin_at=None,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="check-in"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime(2026, 5, 3, 10, 0, 0, tzinfo=UTC),
                today=date(2026, 5, 3),
            )

    async def test_future_scheduled_checkout_raises(self):
        bid = uuid4()
        today = date(2026, 5, 3)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 10),
            actual_checkin_at=datetime(2026, 5, 1, 12, 0, 0),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="check-out aún no ha llegado"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime(2026, 5, 3, 10, 0, 0, tzinfo=UTC),
                today=today,
            )

    async def test_future_departure_rejected(self):
        bid = uuid4()
        now_utc = datetime.now(UTC)
        today = now_utc.date()
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=today - timedelta(days=1),
            checkout=today,
            actual_checkin_at=datetime.combine(today - timedelta(days=1), datetime.min.time())
            + timedelta(hours=14),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="posterior"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=now_utc + timedelta(hours=2),
                today=today,
            )

    async def test_departure_before_actual_checkin_rejected(self):
        bid = uuid4()
        today = date(2026, 5, 3)
        checkin_at = datetime(2026, 5, 2, 14, 0, 0)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 2),
            checkout=today,
            actual_checkin_at=checkin_at,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="anterior al check-in real"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime(2026, 5, 2, 8, 0, 0, tzinfo=UTC),
                today=today,
            )

    async def test_departure_before_scheduled_checkout_day_rejected(self):
        bid = uuid4()
        today = date(2026, 6, 10)
        checkout_day = date(2026, 6, 10)
        checkin_at = datetime(2026, 6, 8, 15, 0, 0)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 6, 8),
            checkout=checkout_day,
            actual_checkin_at=checkin_at,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        frozen_now = datetime(2026, 6, 10, 14, 0, 0, tzinfo=UTC)
        uc = RegisterGuestCheckOutUseCase(repo, AsyncMock(), clock=lambda: frozen_now)
        with pytest.raises(InvalidBookingStateError, match="programado"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_departure_at=datetime(2026, 6, 9, 10, 0, 0, tzinfo=UTC),
                today=today,
            )

    async def test_idempotent_second_post_skips_persistence(self):
        """Idempotencia documentada: CHECKED_OUT devuelve detalle sin duplicar historial."""
        bid = uuid4()
        today = date(2026, 5, 3)
        co = datetime(2026, 5, 3, 9, 0, 0)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_OUT,
            checkin=date(2026, 5, 1),
            checkout=today,
            actual_checkin_at=datetime(2026, 5, 1, 14, 0, 0),
            actual_checkout_at=co,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = RegisterGuestCheckOutUseCase(repo, guest_repo)
        out = await uc.execute(
            booking_id=bid,
            hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
            actor_user_id=UUID("b0000000-0000-0000-0000-000000000001"),
            actual_departure_at=datetime(2026, 5, 3, 23, 0, 0, tzinfo=UTC),
            today=today,
        )
        repo.update.assert_not_awaited()
        repo.add_status_history.assert_not_awaited()
        assert out.status == "CHECKED_OUT"
        assert b.actual_checkout_at == co

    async def test_traveler_detail_never_shows_can_register_check_out(self):
        today = date(2026, 5, 3)
        b = _booking(
            bid=uuid4(),
            status=BookingStatus.CHECKED_IN,
            checkin=date(2026, 5, 1),
            checkout=today,
            actual_checkin_at=datetime(2026, 5, 1, 14, 0, 0),
        )
        repo = AsyncMock()
        repo.get_by_id_for_user.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = GetBookingDetailUseCase(repo, guest_repo)
        out = await uc.execute(
            b.id,
            UUID("a0000000-0000-0000-0000-000000000001"),
            viewer_role="TRAVELER",
            today=today,
        )
        assert out.can_register_check_out is False


def test_hotel_can_register_check_out_requires_hotel_viewer():
    today = date(2026, 5, 3)
    b = _booking(
        bid=uuid4(),
        status=BookingStatus.CHECKED_IN,
        checkin=date(2026, 5, 1),
        checkout=today,
        actual_checkin_at=datetime(2026, 5, 1, 14, 0, 0),
    )
    assert hotel_can_register_check_out(b, today=today, viewer_is_hotel=False) is False
    assert hotel_can_register_check_out(b, today=today, viewer_is_hotel=True) is True


def test_count_hotel_bookings_metrics_sql_excludes_checked_out_from_checkins_today():
    src = inspect.getsource(br_mod.SqlAlchemyBookingRepository.count_hotel_bookings_metrics)
    assert "CHECKED_OUT" in src
    assert "checkin == today" in src or "Booking.checkin == today" in src
