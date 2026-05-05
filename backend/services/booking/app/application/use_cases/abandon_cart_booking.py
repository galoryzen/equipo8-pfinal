import logging
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import (
    BookingNotFoundError,
    CatalogUnavailableError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import Booking, BookingStatus, new_status_history_row
from app.schemas.booking import BookingDetailOut

logger = logging.getLogger(__name__)


class AbandonCartBookingUseCase:
    """Abandon a CART booking and release its inventory hold.

    Only valid for CART status; any other state raises ``InvalidBookingStateError``.
    Transitions to EXPIRED (not CANCELLED) — abandoned carts have no payment to refund,
    so no ``BookingCancelled`` event is emitted.

    Inventory release is best-effort inline; if Catalog is unavailable, the reconcile
    job picks it up later. The user never sees a 503 from a Catalog outage.
    """

    def __init__(
        self,
        repo: BookingRepository,
        catalog: CatalogInventoryPort,
        clock: Callable[[], datetime] | None = None,
    ):
        self._repo = repo
        self._catalog = catalog
        self._now = clock or (lambda: datetime.now(UTC).replace(tzinfo=None))

    async def execute(self, booking_id: UUID, user_id: UUID) -> BookingDetailOut:
        booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.CART:
            raise InvalidBookingStateError(
                f"Cannot abandon cart in state {booking.status.value}"
            )

        now = self._now()
        booking.status = BookingStatus.EXPIRED
        booking.inventory_released = False
        booking.updated_at = now
        await self._repo.save(booking)
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.CART,
                to_status=BookingStatus.EXPIRED,
                reason="user_cancelled_cart",
                changed_by=user_id,
            )
        )

        try:
            await self._catalog.release_hold(
                room_type_id=booking.room_type_id,
                checkin=booking.checkin,
                checkout=booking.checkout,
            )
            booking.inventory_released = True
            booking.updated_at = self._now()
            await self._repo.save(booking)
        except CatalogUnavailableError:
            logger.warning(
                "Inline release failed for cart %s on abandon — reconciler will retry",
                booking.id,
            )

        return _to_detail(booking)


def _to_detail(booking: Booking) -> BookingDetailOut:
    status = booking.status
    status_str = status.value if hasattr(status, "value") else str(status)
    policy = booking.policy_type_applied
    policy_str = policy.value if hasattr(policy, "value") else str(policy)
    return BookingDetailOut(
        id=booking.id,
        status=status_str,
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
        policy_type_applied=policy_str,
        policy_hours_limit_applied=booking.policy_hours_limit_applied,
        policy_refund_percent_applied=booking.policy_refund_percent_applied,
        guests_count=booking.guests_count or 1,
        guests=[],
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
