from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

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

    async def get_by_id_for_user(self, booking_id, user_id):  # noqa: ARG002
        return self.booking

    async def check_inventory(self, booking):  # noqa: ARG002
        return self.inventory_ok

    async def update(self, booking):  # noqa: ARG002
        self.updated = True

    async def decrement_inventory(self, booking):  # noqa: ARG002
        self.decremented = True


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
        created_at=now,
        updated_at=now,
        confirmed_at=None,
    )


@pytest.mark.asyncio
async def test_confirm_booking_success():
    booking = _make_booking()
    repo = DummyRepo(booking)

    use_case = ConfirmBookingUseCase(repo)
    result = await use_case.execute(booking.id, booking.user_id)

    assert repo.updated
    assert repo.decremented
    assert result.status == BookingStatus.CONFIRMED.value


@pytest.mark.asyncio
async def test_confirm_booking_inventory_conflict():
    booking = _make_booking()
    repo = DummyRepo(booking, inventory_ok=False)

    use_case = ConfirmBookingUseCase(repo)
    with pytest.raises(InventoryConflictError):
        await use_case.execute(booking.id, booking.user_id)

    assert not repo.updated
    assert not repo.decremented


@pytest.mark.asyncio
async def test_confirm_booking_wrong_status():
    booking = _make_booking(status=BookingStatus.CONFIRMED)
    repo = DummyRepo(booking)

    use_case = ConfirmBookingUseCase(repo)
    with pytest.raises(ValueError, match="pendiente de confirmación"):
        await use_case.execute(booking.id, booking.user_id)

    assert not repo.updated
