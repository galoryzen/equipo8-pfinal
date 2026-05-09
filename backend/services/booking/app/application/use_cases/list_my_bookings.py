import asyncio
import contextlib
from collections.abc import Callable
from datetime import UTC, date, datetime
from uuid import UUID

import httpx

from app.application.hotel_booking_flags import hotel_can_register_check_out
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.config import settings
from app.domain.models import Booking, BookingScope, BookingStatus
from app.schemas.booking import BookingListItemOut, PaginatedBookingListOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _booking_display_reference(booking_id: UUID) -> str:
    h = str(booking_id).replace("-", "").upper()
    return f"#{h[-8:]}"


def _room_type_name_from_property(prop_info: dict | None, room_type_id: UUID) -> str | None:
    if not prop_info:
        return None
    detail = prop_info.get("detail") or {}
    rid = str(room_type_id)
    for rt in detail.get("room_types") or []:
        if str(rt.get("id")) == rid:
            name = rt.get("name")
            return str(name) if name else None
    return None


def _default_today() -> date:
    return datetime.now(UTC).date()


async def _fetch_property_info(client: httpx.AsyncClient, property_id: UUID) -> dict | None:
    with contextlib.suppress(Exception):
        resp = await client.get(
            f"{settings.CATALOG_SERVICE_URL}/api/v1/catalog/properties/{property_id}"
        )
        if resp.status_code == 200:
            return resp.json()
    return None


def _map_booking_to_list_item(
    booking: Booking,
    prop_info: dict | None,
    guest_name: str | None,
    *,
    for_hotel_portal: bool = False,
    today: date | None = None,
) -> BookingListItemOut:
    property_name = None
    image_url = None
    if prop_info:
        detail = prop_info.get("detail", {})
        property_name = detail.get("name")
        images = detail.get("images", [])
        image_url = images[0]["url"] if images else None

    nights = None
    if booking.checkin and booking.checkout:
        with contextlib.suppress(Exception):
            nights = (booking.checkout - booking.checkin).days

    today_eff = today if today is not None else _default_today()

    can_register = False
    actual_at = booking.actual_checkin_at
    actual_out: datetime | None = None
    if actual_at is not None:
        actual_out = actual_at.replace(tzinfo=UTC)
    actual_co = booking.actual_checkout_at
    actual_checkout_out: datetime | None = None
    if actual_co is not None:
        actual_checkout_out = actual_co.replace(tzinfo=UTC)
    if for_hotel_portal:
        can_register = (
            booking.status == BookingStatus.CONFIRMED
            and booking.checkin <= today_eff
            and booking.actual_checkin_at is None
        )
    can_co = hotel_can_register_check_out(
        booking, today=today_eff, viewer_is_hotel=for_hotel_portal
    )

    room_type_name = _room_type_name_from_property(prop_info, booking.room_type_id)

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
        display_reference=_booking_display_reference(booking.id),
        room_type_name=room_type_name,
        property_name=property_name,
        image_url=image_url,
        nights=nights,
        guest_name=guest_name,
        guests_count=booking.guests_count,
        actual_checkin_at=actual_out,
        can_register_check_in=can_register,
        actual_checkout_at=actual_checkout_out,
        can_register_check_out=can_co,
    )


class ListMyBookingsUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        guest_repo: GuestRepository | None = None,
        clock: Callable[[], date] = _default_today,
        catalog_http_client: httpx.AsyncClient | None = None,
    ):
        self._repo = repo
        self._guest_repo = guest_repo
        self._clock = clock
        self._catalog_client = catalog_http_client

    async def _enrich(
        self,
        bookings: list[Booking],
        *,
        for_hotel_portal: bool = False,
        today: date | None = None,
    ) -> list[BookingListItemOut]:
        if not bookings:
            return []

        unique_pids = list({b.property_id for b in bookings})
        booking_ids = [b.id for b in bookings]
        owned = self._catalog_client is None
        client = self._catalog_client or httpx.AsyncClient(timeout=5.0)

        try:
            results, guest_map = await asyncio.gather(
                asyncio.gather(*[_fetch_property_info(client, pid) for pid in unique_pids]),
                self._guest_repo.get_primary_names_for_bookings(booking_ids)
                if self._guest_repo is not None
                else asyncio.sleep(0, result={}),
            )
        finally:
            if owned:
                await client.aclose()

        prop_map: dict[UUID, dict | None] = dict(zip(unique_pids, results, strict=False))
        return [
            _map_booking_to_list_item(
                b,
                prop_map.get(b.property_id),
                guest_map.get(b.id),
                for_hotel_portal=for_hotel_portal,
                today=today,
            )
            for b in bookings
        ]

    async def execute(
        self,
        user_id: UUID,
        scope: BookingScope = BookingScope.ALL,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> PaginatedBookingListOut:
        today = self._clock()
        kwargs: dict = {"scope": scope, "today": today, "page": page, "page_size": page_size}
        if status is not None:
            kwargs["status"] = status
        bookings, total = await self._repo.list_by_user_id(user_id, **kwargs)
        items = await self._enrich(bookings, for_hotel_portal=False, today=today)
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
        items = await self._enrich(bookings, for_hotel_portal=False, today=self._clock())
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
        today = self._clock()
        bookings, total = await self._repo.list_by_hotel(
            hotel_id=hotel_id, status=status, page=page, page_size=page_size
        )
        items = await self._enrich(bookings, for_hotel_portal=True, today=today)
        total_pages = max(1, -(-total // page_size))
        return PaginatedBookingListOut(
            items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
        )
