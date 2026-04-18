import logging
from datetime import UTC, datetime

from app.application.exceptions import CatalogUnavailableError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort

logger = logging.getLogger(__name__)


class ReconcileInventoryReleaseUseCase:
    """Retry Catalog release_hold for terminal bookings whose inventory was never released.

    Runs periodically from the scheduler. Idempotent per booking: failures leave
    inventory_released=False and the booking is picked up again next tick.
    """

    def __init__(self, repo: BookingRepository, catalog: CatalogInventoryPort):
        self._repo = repo
        self._catalog = catalog

    async def execute(self) -> int:
        pending = await self._repo.find_unreleased_terminal_bookings()
        if not pending:
            return 0

        released = 0
        for booking in pending:
            try:
                await self._catalog.release_hold(
                    room_type_id=booking.room_type_id,
                    checkin=booking.checkin,
                    checkout=booking.checkout,
                )
            except CatalogUnavailableError:
                logger.warning(
                    "Reconcile release still failing for booking %s — will retry next tick",
                    booking.id,
                )
                continue

            booking.inventory_released = True
            booking.updated_at = datetime.now(UTC).replace(tzinfo=None)
            await self._repo.save(booking)
            released += 1

        return released
