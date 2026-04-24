from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from contracts.events.booking import BOOKING_REJECTED

from app.application.exceptions import BookingNotFoundError, CatalogUnavailableError
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.application.use_cases.reject_booking import RejectBookingUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType


class DummyRepo:
    def __init__(self, booking: Booking | None):
        self.booking = booking
        self.update_calls = 0
        self.history_rows = []

    async def get_by_id(self, booking_id):  # noqa: ARG002
        return self.booking

    async def update(self, booking):  # noqa: ARG002
        self.update_calls += 1

    async def add_status_history(self, row):
        self.history_rows.append(row)

    @property
    def updated(self) -> bool:
        return self.update_calls > 0


def _make_booking(status: BookingStatus = BookingStatus.PENDING_CONFIRMATION) -> Booking:
    now = datetime.now(UTC).replace(tzinfo=None)
    return Booking(
        id=uuid4(),
        user_id=uuid4(),
        status=status,
        checkin=date(2026, 5, 1),
        checkout=date(2026, 5, 5),
        hold_expires_at=None,
        total_amount=Decimal("1000.00"),
        currency_code="USD",
        property_id=uuid4(),
        room_type_id=uuid4(),
        rate_plan_id=uuid4(),
        unit_price=Decimal("250.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        guests_count=1,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_reject_booking_success_publishes_event_without_reason_and_releases_hold():
    booking = _make_booking()
    repo = DummyRepo(booking)
    events = AsyncMock()
    catalog = AsyncMock(spec=CatalogInventoryPort)

    uc = RejectBookingUseCase(repo, events, catalog)
    result = await uc.execute(booking.id)

    assert result.status == BookingStatus.REJECTED.value

    # History row recorded.
    assert len(repo.history_rows) == 1
    row = repo.history_rows[0]
    assert row.from_status == BookingStatus.PENDING_CONFIRMATION
    assert row.to_status == BookingStatus.REJECTED
    assert row.reason == "hotel_rejected"

    # BookingRejected event published.
    events.publish.assert_awaited_once()
    envelope = events.publish.await_args.args[0]
    assert envelope.event_type == BOOKING_REJECTED
    assert envelope.payload["booking_id"] == str(booking.id)
    assert envelope.payload["user_id"] == str(booking.user_id)
    assert envelope.payload["reason"] is None

    # Inline catalog release happened; flag flipped on the booking.
    catalog.release_hold.assert_awaited_once_with(
        room_type_id=booking.room_type_id,
        checkin=booking.checkin,
        checkout=booking.checkout,
    )
    assert booking.inventory_released is True
    # Two updates: the state transition, then the flag flip after release.
    assert repo.update_calls == 2


@pytest.mark.asyncio
async def test_reject_booking_forwards_reason_to_event_and_history():
    booking = _make_booking()
    repo = DummyRepo(booking)
    events = AsyncMock()
    catalog = AsyncMock(spec=CatalogInventoryPort)

    uc = RejectBookingUseCase(repo, events, catalog)
    await uc.execute(booking.id, reason="overbooked")

    # Reason suffixed into the history row.
    assert repo.history_rows[0].reason == "hotel_rejected:overbooked"

    # Reason included in the event payload.
    envelope = events.publish.await_args.args[0]
    assert envelope.payload["reason"] == "overbooked"


@pytest.mark.asyncio
async def test_reject_booking_swallows_catalog_failure_leaves_flag_false():
    """State transition must still succeed when Catalog is down — reconciler retries later."""
    booking = _make_booking()
    repo = DummyRepo(booking)
    events = AsyncMock()
    catalog = AsyncMock(spec=CatalogInventoryPort)
    catalog.release_hold.side_effect = CatalogUnavailableError("down")

    uc = RejectBookingUseCase(repo, events, catalog)
    result = await uc.execute(booking.id)

    assert result.status == BookingStatus.REJECTED.value
    # State transition persisted; release was attempted but failed.
    assert booking.inventory_released is False
    # Only the pre-release update happened; the post-release flip was skipped.
    assert repo.update_calls == 1
    events.publish.assert_awaited_once()


@pytest.mark.asyncio
async def test_reject_booking_not_found():
    repo = DummyRepo(None)
    events = AsyncMock()
    catalog = AsyncMock(spec=CatalogInventoryPort)

    uc = RejectBookingUseCase(repo, events, catalog)
    with pytest.raises(BookingNotFoundError):
        await uc.execute(uuid4())

    assert not repo.updated
    events.publish.assert_not_awaited()
    catalog.release_hold.assert_not_awaited()


@pytest.mark.asyncio
async def test_reject_booking_wrong_status():
    booking = _make_booking(status=BookingStatus.CONFIRMED)
    repo = DummyRepo(booking)
    events = AsyncMock()
    catalog = AsyncMock(spec=CatalogInventoryPort)

    uc = RejectBookingUseCase(repo, events, catalog)
    with pytest.raises(ValueError, match="pendiente de confirmación"):
        await uc.execute(booking.id)

    assert not repo.updated
    events.publish.assert_not_awaited()
    catalog.release_hold.assert_not_awaited()
