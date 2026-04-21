import uuid
from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import (
    BookingNotFoundError,
    GuestsCountMismatchError,
    InvalidBookingStateError,
    PrimaryGuestMissingContactError,
    PrimaryGuestRequiredError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import BookingStatus, Guest
from app.schemas.booking import GuestOut, SaveGuestsIn


def _normalize(s: str | None) -> str | None:
    if s is None:
        return None
    stripped = s.strip()
    return stripped or None


class SaveBookingGuestsUseCase:
    def __init__(self, booking_repo: BookingRepository, guest_repo: GuestRepository):
        self._booking_repo = booking_repo
        self._guest_repo = guest_repo

    async def execute(
        self, booking_id: UUID, user_id: UUID, payload: SaveGuestsIn
    ) -> list[GuestOut]:
        booking = await self._booking_repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()

        if booking.status != BookingStatus.CART:
            raise InvalidBookingStateError(
                f"Cannot edit guests for booking in state {booking.status.value}"
            )

        guests_in = payload.guests
        if len(guests_in) != booking.guests_count:
            raise GuestsCountMismatchError(
                f"Expected {booking.guests_count} guests, got {len(guests_in)}"
            )

        primary_count = sum(1 for g in guests_in if g.is_primary)
        if primary_count != 1:
            raise PrimaryGuestRequiredError(
                "Exactly one guest must be marked as primary"
            )

        primary = next(g for g in guests_in if g.is_primary)
        primary_email = _normalize(primary.email)
        primary_phone = _normalize(primary.phone)
        if not primary_email or not primary_phone:
            raise PrimaryGuestMissingContactError(
                "Primary guest requires email and phone"
            )

        now = datetime.now(UTC).replace(tzinfo=None)
        guest_rows = [
            Guest(
                id=uuid.uuid4(),
                booking_id=booking.id,
                is_primary=g.is_primary,
                full_name=g.full_name.strip(),
                email=_normalize(g.email),
                phone=_normalize(g.phone),
                created_at=now,
                updated_at=now,
            )
            for g in guests_in
        ]

        saved = await self._guest_repo.replace_guests_for_booking(booking.id, guest_rows)
        return [_to_out(g) for g in saved]


def _to_out(guest: Guest) -> GuestOut:
    return GuestOut(
        id=guest.id,
        is_primary=guest.is_primary,
        full_name=guest.full_name,
        email=guest.email,
        phone=guest.phone,
    )
