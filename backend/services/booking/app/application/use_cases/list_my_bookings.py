import asyncio
from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID

import httpx

from app.application.ports.outbound.booking_repository import BookingRepository
from app.config import settings
from app.domain.models import Booking, BookingScope
from app.schemas.booking import BookingListItemOut, PaginatedBookingListOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _default_today() -> date:
    return datetime.now(UTC).date()


async def _fetch_property_info(client: httpx.AsyncClient, property_id: UUID) -> dict | None:
    try:
        resp = await client.get(
            f"{settings.CATALOG_SERVICE_URL}/api/v1/catalog/properties/{property_id}"
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


def _map_booking_to_list_item(booking: Booking, prop_info: dict | None) -> BookingListItemOut:
    property_name = None
    image_url = None
    if prop_info:
        detail = prop_info.get("detail", {})
        property_name = detail.get("name")
        images = detail.get("images", [])
        image_url = images[0]["url"] if images else None

    nights = None
    if booking.checkin and booking.checkout:
        try:
            nights = (booking.checkout - booking.checkin).days
        except Exception:
            pass

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
        guest_name=None,  # auth fan-out removed; not needed for list view
        guests_count=booking.guests_count,
    )


class ListMyBookingsUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        clock: Callable[[], date] = _default_today,
        catalog_http_client: httpx.AsyncClient | None = None,
    ):
        self._repo = repo
        self._clock = clock
        self._catalog_client = catalog_http_client

    async def _enrich(self, bookings: list[Booking]) -> list[BookingListItemOut]:
        if not bookings:
            return []

        unique_pids = list({b.property_id for b in bookings})
        owned = self._catalog_client is None
        client = self._catalog_client or httpx.AsyncClient(timeout=5.0)

        try:
            results = await asyncio.gather(
                *[_fetch_property_info(client, pid) for pid in unique_pids]
            )
        finally:
            if owned:
                await client.aclose()

        prop_map: dict[UUID, dict | None] = dict(zip(unique_pids, results))
        return [_map_booking_to_list_item(b, prop_map.get(b.property_id)) for b in bookings]

    async def execute(
        self,
        user_id: UUID,
        scope: BookingScope = BookingScope.ALL,
        page: int = 1,
        page_size: int = 10,
    ) -> PaginatedBookingListOut:
        today = self._clock()
        bookings, total = await self._repo.list_by_user_id(
            user_id, scope=scope, today=today, page=page, page_size=page_size
        )
        items = await self._enrich(bookings)
        total_pages = max(1, -(-total // page_size))
        return PaginatedBookingListOut(
            items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
        )

    async def execute_admin(
        self,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> PaginatedBookingListOut:
        bookings, total = await self._repo.list_all(status=status, page=page, page_size=page_size)
        items = await self._enrich(bookings)
        total_pages = max(1, -(-total // page_size))
        return PaginatedBookingListOut(
            items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
        )

    async def execute_hotel(
        self,
        hotel_id: UUID,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> PaginatedBookingListOut:
        bookings, total = await self._repo.list_by_hotel(
            hotel_id=hotel_id, status=status, page=page, page_size=page_size
        )
        items = await self._enrich(bookings)
        total_pages = max(1, -(-total // page_size))
        return PaginatedBookingListOut(
            items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
        )
