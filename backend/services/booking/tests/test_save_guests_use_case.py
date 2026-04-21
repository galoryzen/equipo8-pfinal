"""Unit tests for SaveBookingGuestsUseCase."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.application.exceptions import (
    BookingNotFoundError,
    GuestsCountMismatchError,
    InvalidBookingStateError,
    PrimaryGuestMissingContactError,
    PrimaryGuestRequiredError,
)
from app.application.use_cases.list_booking_guests import ListBookingGuestsUseCase
from app.application.use_cases.save_booking_guests import SaveBookingGuestsUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType, Guest
from app.schemas.booking import GuestIn, SaveGuestsIn

USER_ID = UUID("a0000000-0000-0000-0000-000000000001")
BOOKING_ID = UUID("90000000-0000-0000-0000-000000000001")


def _booking(status: BookingStatus = BookingStatus.CART, guests_count: int = 2) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0)
    return Booking(
        id=BOOKING_ID,
        user_id=USER_ID,
        status=status,
        checkin=date(2026, 6, 1),
        checkout=date(2026, 6, 4),
        hold_expires_at=datetime(2026, 4, 1, 12, 15, 0),
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
        guests_count=guests_count,
        created_at=now,
        updated_at=now,
    )


def _payload_two_guests(
    primary_email: str = "alice@example.com",
    primary_phone: str = "+1-555-010-1234",
) -> SaveGuestsIn:
    return SaveGuestsIn(
        guests=[
            GuestIn(
                is_primary=True,
                full_name="Alice Primary",
                email=primary_email,
                phone=primary_phone,
            ),
            GuestIn(is_primary=False, full_name="Bob Companion"),
        ]
    )


@pytest.mark.asyncio
class TestSaveBookingGuestsUseCase:
    async def test_saves_guests_on_happy_path(self):
        booking = _booking(guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()
        saved_guests = [
            Guest(
                id=uuid4(),
                booking_id=booking.id,
                is_primary=True,
                full_name="Alice Primary",
                email="alice@example.com",
                phone="+1-555-010-1234",
                created_at=datetime(2026, 4, 1, 12, 0, 0),
                updated_at=datetime(2026, 4, 1, 12, 0, 0),
            ),
            Guest(
                id=uuid4(),
                booking_id=booking.id,
                is_primary=False,
                full_name="Bob Companion",
                email=None,
                phone=None,
                created_at=datetime(2026, 4, 1, 12, 0, 0),
                updated_at=datetime(2026, 4, 1, 12, 0, 0),
            ),
        ]
        guest_repo.replace_guests_for_booking.return_value = saved_guests

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)
        out = await uc.execute(
            booking_id=BOOKING_ID, user_id=USER_ID, payload=_payload_two_guests()
        )

        assert len(out) == 2
        assert out[0].is_primary is True
        assert out[0].email == "alice@example.com"
        assert out[1].is_primary is False
        guest_repo.replace_guests_for_booking.assert_awaited_once()

    async def test_raises_not_found_when_booking_missing(self):
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = None
        guest_repo = AsyncMock()

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)

        with pytest.raises(BookingNotFoundError):
            await uc.execute(
                booking_id=BOOKING_ID, user_id=USER_ID, payload=_payload_two_guests()
            )
        guest_repo.replace_guests_for_booking.assert_not_awaited()

    async def test_rejects_when_booking_not_in_cart_state(self):
        booking = _booking(status=BookingStatus.CONFIRMED, guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)

        with pytest.raises(InvalidBookingStateError):
            await uc.execute(
                booking_id=BOOKING_ID, user_id=USER_ID, payload=_payload_two_guests()
            )

    async def test_rejects_count_mismatch(self):
        booking = _booking(guests_count=3)  # expects 3, payload has 2
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)

        with pytest.raises(GuestsCountMismatchError):
            await uc.execute(
                booking_id=BOOKING_ID, user_id=USER_ID, payload=_payload_two_guests()
            )

    async def test_rejects_when_no_primary_guest(self):
        booking = _booking(guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        payload = SaveGuestsIn(
            guests=[
                GuestIn(is_primary=False, full_name="A"),
                GuestIn(is_primary=False, full_name="B"),
            ]
        )

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)
        with pytest.raises(PrimaryGuestRequiredError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID, payload=payload)

    async def test_rejects_when_multiple_primary_guests(self):
        booking = _booking(guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        payload = SaveGuestsIn(
            guests=[
                GuestIn(
                    is_primary=True,
                    full_name="A",
                    email="a@example.com",
                    phone="+1234567",
                ),
                GuestIn(
                    is_primary=True,
                    full_name="B",
                    email="b@example.com",
                    phone="+7654321",
                ),
            ]
        )

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)
        with pytest.raises(PrimaryGuestRequiredError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID, payload=payload)

    async def test_rejects_when_primary_missing_email(self):
        booking = _booking(guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)
        with pytest.raises(PrimaryGuestMissingContactError):
            await uc.execute(
                booking_id=BOOKING_ID,
                user_id=USER_ID,
                payload=_payload_two_guests(primary_email="   "),
            )

    async def test_rejects_when_primary_missing_phone(self):
        booking = _booking(guests_count=2)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()

        uc = SaveBookingGuestsUseCase(booking_repo, guest_repo)
        with pytest.raises(PrimaryGuestMissingContactError):
            await uc.execute(
                booking_id=BOOKING_ID,
                user_id=USER_ID,
                payload=_payload_two_guests(primary_phone=""),
            )


@pytest.mark.asyncio
class TestListBookingGuestsUseCase:
    async def test_lists_guests_for_owner(self):
        booking = _booking(guests_count=1)
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = booking
        guest_repo = AsyncMock()
        guest_repo.list_by_booking.return_value = [
            Guest(
                id=uuid4(),
                booking_id=booking.id,
                is_primary=True,
                full_name="Alice",
                email="a@example.com",
                phone="+1234567",
                created_at=datetime(2026, 4, 1),
                updated_at=datetime(2026, 4, 1),
            )
        ]

        uc = ListBookingGuestsUseCase(booking_repo, guest_repo)
        out = await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)

        assert len(out) == 1
        assert out[0].full_name == "Alice"
        guest_repo.list_by_booking.assert_awaited_once_with(booking.id)

    async def test_raises_not_found_when_booking_missing(self):
        booking_repo = AsyncMock()
        booking_repo.get_by_id_for_user.return_value = None
        guest_repo = AsyncMock()

        uc = ListBookingGuestsUseCase(booking_repo, guest_repo)
        with pytest.raises(BookingNotFoundError):
            await uc.execute(booking_id=BOOKING_ID, user_id=USER_ID)
        guest_repo.list_by_booking.assert_not_awaited()
