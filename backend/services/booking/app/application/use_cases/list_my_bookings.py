from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingItem
from app.schemas.booking import BookingItemSummaryOut, BookingListItemOut


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
    items = [_to_item_summary(i) for i in booking.items]
    return BookingListItemOut(
        id=booking.id,
        status=_status_str(booking),
        checkin=booking.checkin,
        checkout=booking.checkout,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        created_at=booking.created_at,
        items=items,
    )


def _to_item_summary(item: BookingItem) -> BookingItemSummaryOut:
    return BookingItemSummaryOut(
        property_id=item.property_id,
        room_type_id=item.room_type_id,
        quantity=item.quantity,
    )
