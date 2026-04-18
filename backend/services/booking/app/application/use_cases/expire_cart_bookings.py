import logging
from datetime import UTC, datetime

from app.application.exceptions import CatalogUnavailableError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import BookingStatus

logger = logging.getLogger(__name__)


class ExpireCartBookingsUseCase:
    """Transition CART bookings whose hold has elapsed to EXPIRED.

    State transition runs first (always); the Catalog release is attempted
    inline as a best-effort to free inventory immediately. If it fails, the
    reconcile job picks it up on a later tick.
    """

    def __init__(self, repo: BookingRepository, catalog: CatalogInventoryPort):
        self._repo = repo
        self._catalog = catalog

    async def execute(self) -> int:
        now = datetime.now(UTC).replace(tzinfo=None)
        carts = await self._repo.find_expired_carts(now)
        if not carts:
            return 0

        for cart in carts:
            cart.status = BookingStatus.EXPIRED
            cart.inventory_released = False
            cart.updated_at = now
            await self._repo.save(cart)

            try:
                await self._catalog.release_hold(
                    room_type_id=cart.room_type_id,
                    checkin=cart.checkin,
                    checkout=cart.checkout,
                )
                cart.inventory_released = True
                cart.updated_at = datetime.now(UTC).replace(tzinfo=None)
                await self._repo.save(cart)
            except CatalogUnavailableError:
                logger.warning(
                    "Inline release failed while expiring booking %s — reconciler will retry",
                    cart.id,
                )

        return len(carts)
