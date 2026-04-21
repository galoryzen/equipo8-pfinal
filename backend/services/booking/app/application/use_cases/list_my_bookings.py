from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID

import httpx

from app.application.ports.outbound.booking_repository import BookingRepository
from app.config import settings
from app.domain.models import Booking, BookingScope
from app.schemas.booking import BookingListItemOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _default_today() -> date:
    return datetime.now(UTC).date()


class ListMyBookingsUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        clock: Callable[[], date] = _default_today,
    ):
        self._repo = repo
        self._clock = clock

    async def execute(
        self,
        user_id: UUID,
        scope: BookingScope = BookingScope.ALL,
    ) -> list[BookingListItemOut]:
        today = self._clock()
        bookings = await self._repo.list_by_user_id(user_id, scope=scope, today=today)
        return [await _to_list_item(b) for b in bookings]


async def _to_list_item(booking: Booking) -> BookingListItemOut:
    # Obtener info de la propiedad desde catalog
    property_name = None
    image_url = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.CATALOG_SERVICE_URL}/properties/{booking.property_id}")
            if resp.status_code == 200:
                property_info = resp.json()
                detail = property_info.get("detail", {})
                property_name = detail.get("name")
                images = detail.get("images", [])
                image_url = images[0]["url"] if images else None
    except Exception:
        property_name = None
        image_url = None

    # Calcular noches
    nights = None
    try:
        if booking.checkin and booking.checkout:
            nights = (booking.checkout - booking.checkin).days
    except Exception:
        nights = None

    # Obtener nombre del huésped desde auth
    guest_name = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.AUTH_SERVICE_URL}/users/{booking.user_id}")
            if resp.status_code == 200:
                guest_name = resp.json().get("full_name")
    except Exception:
        guest_name = None

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
        property_name=property_name,
        image_url=image_url,
        nights=nights,
        guest_name=guest_name,
    )
