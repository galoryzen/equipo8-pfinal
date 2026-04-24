import logging
from datetime import UTC, datetime

from app.application.exceptions import CatalogUnavailableError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import BookingStatus, new_status_history_row

logger = logging.getLogger(__name__)


class ExpireUnpaidBookingsUseCase:
    """Transition CART or PENDING_PAYMENT bookings whose hold has elapsed to EXPIRED.

    State transition runs first (always); the Catalog release is attempted
    inline as a best-effort to free inventory immediately. If it fails, the
    reconcile job picks it up on a later tick.
    """

    def __init__(self, repo: BookingRepository, catalog: CatalogInventoryPort):
        self._repo = repo
        self._catalog = catalog

    async def execute(self) -> int:
        now = datetime.now(UTC).replace(tzinfo=None)
        bookings = await self._repo.find_expired_unpaid_bookings(now)
        if not bookings:
            return 0

        for booking in bookings:
            previous_status = booking.status
            booking.status = BookingStatus.EXPIRED
            booking.inventory_released = False
            booking.updated_at = now
            await self._repo.save(booking)
            await self._repo.add_status_history(
                new_status_history_row(
                    booking.id,
                    from_status=previous_status,
                    to_status=BookingStatus.EXPIRED,
                    reason="hold_expired",
                )
            )

            try:
                await self._catalog.release_hold(
                    room_type_id=booking.room_type_id,
                    checkin=booking.checkin,
                    checkout=booking.checkout,
                )
                booking.inventory_released = True
                booking.updated_at = datetime.now(UTC).replace(tzinfo=None)
                await self._repo.save(booking)
            except CatalogUnavailableError:
                logger.warning(
                    "Inline release failed while expiring booking %s — reconciler will retry",
                    booking.id,
                )

        return len(bookings)
