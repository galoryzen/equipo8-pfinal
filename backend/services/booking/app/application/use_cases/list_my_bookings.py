from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking
from app.schemas.booking import BookingListItemOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


class ListMyBookingsUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, user_id: UUID) -> list[BookingListItemOut]:
        bookings = await self._repo.list_by_user_id(user_id)
        return [_to_list_item(b) for b in bookings]


def _to_list_item(booking: Booking) -> BookingListItemOut:
    return BookingListItemOut(
        id=booking.id,
        status=_status_str(booking),
        checkin=booking.checkin,
        checkout=booking.checkout,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        created_at=booking.created_at,
    )
