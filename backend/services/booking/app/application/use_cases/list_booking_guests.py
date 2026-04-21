from uuid import UUID

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import Guest
from app.schemas.booking import GuestOut


class ListBookingGuestsUseCase:
    def __init__(self, booking_repo: BookingRepository, guest_repo: GuestRepository):
        self._booking_repo = booking_repo
        self._guest_repo = guest_repo

    async def execute(self, booking_id: UUID, user_id: UUID) -> list[GuestOut]:
        booking = await self._booking_repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        guests = await self._guest_repo.list_by_booking(booking.id)
        return [_to_out(g) for g in guests]


def _to_out(guest: Guest) -> GuestOut:
    return GuestOut(
        id=guest.id,
        is_primary=guest.is_primary,
        full_name=guest.full_name,
        email=guest.email,
        phone=guest.phone,
    )
