"""Check-in registration: eligibility, validation, persistence, idempotency, occupancy SQL."""

import inspect
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.adapters.outbound.db import dashboard_metrics_repository as dm_mod
from app.adapters.outbound.db import revenue_report_repository as rev_mod
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.register_guest_check_in import RegisterGuestCheckInUseCase, _to_naive_utc
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import RegisterGuestCheckInIn


def _booking(
    *,
    bid: UUID,
    status: BookingStatus,
    checkin: date,
    checkout: date,
    actual_checkin_at: datetime | None = None,
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


def test_register_guest_check_in_schema_requires_arrival():
    with pytest.raises(ValidationError):
        RegisterGuestCheckInIn()  # type: ignore[call-arg]


@pytest.mark.asyncio
class TestRegisterGuestCheckInUseCase:
    async def test_eligible_confirmed_checkin_today_or_past(self):
        """CA: botón elegible — CONFIRMED con checkin <= hoy y sin actual_checkin_at."""
        today = date(2026, 5, 3)
        b = _booking(
            bid=uuid4(),
            status=BookingStatus.CONFIRMED,
            checkin=today,
            checkout=date(2026, 5, 6),
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
        assert out.can_register_check_in is True
        assert out.status == "CONFIRMED"

        b_past = _booking(
            bid=uuid4(),
            status=BookingStatus.CONFIRMED,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 6),
        )
        repo.get_by_id_for_hotel.return_value = b_past
        out2 = await uc.execute(
            b_past.id,
            UUID("b0000000-0000-0000-0000-000000000001"),
            viewer_role="HOTEL",
            hotel_id=hid,
            today=today,
        )
        assert out2.can_register_check_in is True

    async def test_persists_arrival_status_history_and_detail(self):
        """CA: persistencia + estado CHECKED_IN + historial + detalle coherente."""
        assert RegisterGuestCheckInIn.model_fields["actual_arrival_at"].is_required()

        bid = uuid4()
        now_utc = datetime.now(UTC)
        today = now_utc.date()
        # Evitar medianoche UTC: (now - 20m).date() podría ser ayer y chocar con arrival.date() < checkin.
        arrival = now_utc - timedelta(minutes=20)
        if arrival.date() < today:
            arrival = datetime.combine(today, datetime.min.time(), tzinfo=UTC) + timedelta(minutes=1)
        if arrival >= now_utc:
            arrival = now_utc - timedelta(seconds=1)
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=today,
            checkout=today + timedelta(days=3),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        repo.find_last_status_history_by_reason_prefix = AsyncMock(return_value=None)
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []

        history_rows: list = []

        async def capture_history(row):
            history_rows.append(row)

        repo.add_status_history.side_effect = capture_history

        uc = RegisterGuestCheckInUseCase(repo, guest_repo)
        expected_naive = _to_naive_utc(arrival)
        out = await uc.execute(
            booking_id=bid,
            hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
            actor_user_id=UUID("b0000000-0000-0000-0000-000000000001"),
            actual_arrival_at=arrival,
            today=today,
        )
        repo.update.assert_awaited_once()
        repo.add_status_history.assert_awaited_once()
        assert len(history_rows) == 1
        assert history_rows[0].from_status == BookingStatus.CONFIRMED
        assert history_rows[0].to_status == BookingStatus.CHECKED_IN
        assert history_rows[0].reason == "hotel_check_in"
        assert out.status == "CHECKED_IN"
        assert out.actual_checkin_at is not None
        assert out.can_register_check_in is False
        assert b.actual_checkin_at == expected_naive
        assert b.status == BookingStatus.CHECKED_IN

    async def test_wrong_hotel_returns_not_found(self):
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = None
        guest_repo = AsyncMock()
        uc = RegisterGuestCheckInUseCase(repo, guest_repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                booking_id=uuid4(),
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_arrival_at=datetime.now(UTC),
                today=date(2026, 5, 3),
            )

    async def test_not_confirmed_raises(self):
        bid = uuid4()
        b = _booking(
            bid=bid,
            status=BookingStatus.PENDING_CONFIRMATION,
            checkin=date(2026, 5, 1),
            checkout=date(2026, 5, 4),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckInUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="confirmadas"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_arrival_at=datetime(2026, 5, 3, 12, 0, 0, tzinfo=UTC),
                today=date(2026, 5, 3),
            )

    async def test_future_scheduled_checkin_raises(self):
        bid = uuid4()
        today = date(2026, 5, 3)
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=date(2026, 5, 10),
            checkout=date(2026, 5, 12),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckInUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="aún no ha llegado"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_arrival_at=datetime(2026, 5, 10, 14, 0, 0, tzinfo=UTC),
                today=today,
            )

    async def test_idempotent_second_post_skips_validation_and_persistence(self):
        """Idempotencia: CHECKED_IN devuelve detalle sin validar actual_arrival_at ni reescribir DB."""
        bid = uuid4()
        today = date(2026, 5, 3)
        arrival = datetime(2026, 5, 3, 11, 0, 0)
        b = _booking(
            bid=bid,
            status=BookingStatus.CHECKED_IN,
            checkin=today,
            checkout=date(2026, 5, 6),
            actual_checkin_at=arrival,
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = RegisterGuestCheckInUseCase(repo, guest_repo)
        out = await uc.execute(
            booking_id=bid,
            hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
            actor_user_id=UUID("b0000000-0000-0000-0000-000000000001"),
            actual_arrival_at=datetime(2026, 5, 3, 14, 0, 0, tzinfo=UTC),
            today=today,
        )
        repo.update.assert_not_awaited()
        repo.add_status_history.assert_not_awaited()
        assert out.status == "CHECKED_IN"

    async def test_future_arrival_rejected(self):
        bid = uuid4()
        now_utc = datetime.now(UTC)
        today = now_utc.date()
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=today,
            checkout=today + timedelta(days=2),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckInUseCase(repo, AsyncMock())
        with pytest.raises(InvalidBookingStateError, match="posterior"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_arrival_at=now_utc + timedelta(hours=1),
                today=today,
            )

    async def test_arrival_before_scheduled_checkin_day_rejected(self):
        bid = uuid4()
        now_utc = datetime.now(UTC)
        today = now_utc.date()
        checkin_day = today
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=checkin_day,
            checkout=today + timedelta(days=2),
        )
        repo = AsyncMock()
        repo.get_by_id_for_hotel.return_value = b
        uc = RegisterGuestCheckInUseCase(repo, AsyncMock())
        prev_day = datetime.combine(checkin_day - timedelta(days=1), datetime.min.time(), tzinfo=UTC)
        with pytest.raises(InvalidBookingStateError, match="anterior"):
            await uc.execute(
                booking_id=bid,
                hotel_id=UUID("e0000000-0000-0000-0000-000000000001"),
                actor_user_id=uuid4(),
                actual_arrival_at=prev_day,
                today=today,
            )

    async def test_admin_path_uses_unscoped_lookup_and_transitions(self):
        """ADMIN (hotel_id=None) bypasses hotel scoping but still drives the transition."""
        bid = uuid4()
        today = date(2026, 5, 3)
        arrival = datetime(2026, 5, 3, 11, 0, 0, tzinfo=UTC)
        b = _booking(
            bid=bid,
            status=BookingStatus.CONFIRMED,
            checkin=today,
            checkout=date(2026, 5, 6),
        )
        repo = AsyncMock()
        repo.get_by_id.return_value = b
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = []
        repo.find_last_status_history_by_reason_prefix.return_value = None

        uc = RegisterGuestCheckInUseCase(repo, guest_repo)
        out = await uc.execute(
            booking_id=bid,
            hotel_id=None,
            actor_user_id=uuid4(),
            actual_arrival_at=arrival,
            today=today,
        )

        # Two awaits: one in this use case, one in the nested detail use case.
        assert repo.get_by_id.await_count == 2
        repo.get_by_id.assert_any_await(bid)
        repo.get_by_id_for_hotel.assert_not_awaited()
        repo.update.assert_awaited_once()
        repo.add_status_history.assert_awaited_once()
        assert b.status == BookingStatus.CHECKED_IN
        assert out.status == "CHECKED_IN"

    async def test_admin_path_returns_not_found_when_missing(self):
        repo = AsyncMock()
        repo.get_by_id.return_value = None
        uc = RegisterGuestCheckInUseCase(repo, AsyncMock())
        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                booking_id=uuid4(),
                hotel_id=None,
                actor_user_id=uuid4(),
                actual_arrival_at=datetime.now(UTC),
                today=date(2026, 5, 3),
            )


def test_dashboard_metrics_sql_counts_checked_in_for_occupancy():
    src = inspect.getsource(dm_mod.SqlAlchemyDashboardMetricsRepository)
    assert "CHECKED_IN" in src


def test_revenue_report_sql_counts_checked_in():
    src = inspect.getsource(rev_mod.SqlAlchemyRevenueReportRepository)
    assert "CHECKED_IN" in src


def test_upcoming_checkins_query_excludes_checked_in_status():
    """CHECKED_IN no debe listarse como check-in pendiente (solo llegadas programadas)."""
    src = inspect.getsource(dm_mod.SqlAlchemyDashboardMetricsRepository.list_upcoming_checkins)
    assert "'CHECKED_IN'" not in src
    assert "CONFIRMED" in src and "PENDING_CONFIRMATION" in src
