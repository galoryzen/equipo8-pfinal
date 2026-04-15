
import sys
from datetime import datetime
import os
import pytest
from uuid import uuid4

# Ajustar sys.path para permitir imports absolutos desde 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.application.use_cases.confirm_booking import ConfirmBookingUseCase, InventoryConflictError
from app.domain.models import Booking, BookingStatus
from app.schemas.booking import BookingDetailOut

class DummyRepo:
    def __init__(self, booking: Booking, inventory_ok=True):
        self.booking = booking
        self.inventory_ok = inventory_ok
        self.updated = False
        self.decremented = False

    async def get_by_id_for_user(self, booking_id, user_id):
        return self.booking

    async def check_inventory(self, booking):
        return self.inventory_ok

    async def update(self, booking):
        self.updated = True

    async def decrement_inventory(self, booking):
        self.decremented = True

@pytest.mark.asyncio
async def test_confirm_booking_success():
    booking = Booking(
        id=uuid4(),
        user_id=uuid4(),
        status=BookingStatus.PENDING_CONFIRMATION,
        checkin=datetime(2026, 5, 1),
        checkout=datetime(2026, 5, 5),
        hold_expires_at=None,
        total_amount=1000,
        currency_code="USD",
        policy_type_applied="FULL",
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        items=[],
        confirmed_at=None,
    )
    repo = DummyRepo(booking)
    use_case = ConfirmBookingUseCase(repo)
    result = await use_case.execute(booking.id, booking.user_id)
    assert isinstance(result, BookingDetailOut)
    assert repo.updated
    assert repo.decremented
    assert result.status == BookingStatus.CONFIRMED.value

@pytest.mark.asyncio
async def test_confirm_booking_inventory_conflict():
    booking = Booking(
        id=uuid4(),
        user_id=uuid4(),
        status=BookingStatus.PENDING_CONFIRMATION,
        checkin=datetime(2026, 5, 1),
        checkout=datetime(2026, 5, 5),
        hold_expires_at=None,
        total_amount=1000,
        currency_code="USD",
        policy_type_applied="FULL",
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        items=[],
        confirmed_at=None,
    )
    repo = DummyRepo(booking, inventory_ok=False)
    use_case = ConfirmBookingUseCase(repo)
    with pytest.raises(InventoryConflictError):
        await use_case.execute(booking.id, booking.user_id)

@pytest.mark.asyncio
async def test_confirm_booking_wrong_status():
    booking = Booking(
        id=uuid4(),
        user_id=uuid4(),
        status=BookingStatus.CONFIRMED,
        checkin=datetime(2026, 5, 1),
        checkout=datetime(2026, 5, 5),
        hold_expires_at=None,
        total_amount=1000,
        currency_code="USD",
        policy_type_applied="FULL",
        policy_hours_limit_applied=None,
        policy_refund_percent_applied=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        items=[],
        confirmed_at=None,
    )
    repo = DummyRepo(booking)
    use_case = ConfirmBookingUseCase(repo)
    with pytest.raises(ValueError):
        await use_case.execute(booking.id, booking.user_id)
