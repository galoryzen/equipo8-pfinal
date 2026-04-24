from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from contracts.events.booking import BOOKING_CONFIRMED

from app.application.use_cases.confirm_booking import (
    ConfirmBookingUseCase,
    InventoryConflictError,
)
from app.domain.models import Booking, BookingStatus, CancellationPolicyType


class DummyRepo:
    def __init__(self, booking: Booking, inventory_ok: bool = True):
        self.booking = booking
        self.inventory_ok = inventory_ok
        self.updated = False
        self.decremented = False
        self.history_rows = []

    async def get_by_id_for_user(self, booking_id, user_id):  # noqa: ARG002
        return self.booking

    async def check_inventory(self, booking):  # noqa: ARG002
        return self.inventory_ok

    async def update(self, booking):  # noqa: ARG002
        self.updated = True

    async def decrement_inventory(self, booking):  # noqa: ARG002
        self.decremented = True

    async def add_status_history(self, row):
        self.history_rows.append(row)


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
async def test_confirm_booking_success():
    booking = _make_booking()
    repo = DummyRepo(booking)

    events = AsyncMock()
    use_case = ConfirmBookingUseCase(repo, events)
    result = await use_case.execute(booking.id, booking.user_id)

    assert repo.updated
    assert repo.decremented
    assert result.status == BookingStatus.CONFIRMED.value

    # BookingConfirmed event published with all fields needed to render the email.
    events.publish.assert_awaited_once()
    envelope = events.publish.await_args.args[0]
    assert envelope.event_type == BOOKING_CONFIRMED
    assert envelope.payload["booking_id"] == str(booking.id)
    assert envelope.payload["user_id"] == str(booking.user_id)
    assert envelope.payload["property_id"] == str(booking.property_id)
    assert envelope.payload["checkin"] == booking.checkin.isoformat()
    assert envelope.payload["checkout"] == booking.checkout.isoformat()
    assert envelope.payload["guests_count"] == booking.guests_count
    assert envelope.payload["total_amount"] == str(booking.total_amount)
    assert envelope.payload["currency_code"] == booking.currency_code


@pytest.mark.asyncio
async def test_confirm_booking_inventory_conflict():
    booking = _make_booking()
    repo = DummyRepo(booking, inventory_ok=False)

    events = AsyncMock()
    use_case = ConfirmBookingUseCase(repo, events)
    with pytest.raises(InventoryConflictError):
        await use_case.execute(booking.id, booking.user_id)

    assert not repo.updated
    assert not repo.decremented


@pytest.mark.asyncio
async def test_confirm_booking_wrong_status():
    booking = _make_booking(status=BookingStatus.CONFIRMED)
    repo = DummyRepo(booking)

    events = AsyncMock()
    use_case = ConfirmBookingUseCase(repo, events)
    with pytest.raises(ValueError, match="pendiente de confirmación"):
        await use_case.execute(booking.id, booking.user_id)

    assert not repo.updated
