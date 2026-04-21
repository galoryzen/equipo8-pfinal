import logging
from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import (
    BookingNotFoundError,
    CatalogUnavailableError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import Booking, BookingStatus
from app.schemas.booking import BookingDetailOut

logger = logging.getLogger(__name__)


class CancelCartBookingUseCase:
    """Cancel a CART booking and release its inventory hold.

    State transition (CART -> CANCELLED) is persisted first; the Catalog release
    is attempted inline as a best-effort to free inventory immediately. If the
    release fails, the reconcile job picks it up later. This means the user
    never sees a 503 because Catalog is temporarily unavailable.
    """

    def __init__(self, repo: BookingRepository, catalog: CatalogInventoryPort):
        self._repo = repo
        self._catalog = catalog

    async def execute(self, booking_id: UUID, user_id: UUID) -> BookingDetailOut:
        booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.CART:
            raise InvalidBookingStateError(f"Cannot cancel booking in state {booking.status.value}")

        now = datetime.now(UTC).replace(tzinfo=None)
        booking.status = BookingStatus.CANCELLED
        booking.inventory_released = False
        booking.updated_at = now
        await self._repo.save(booking)

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
                "Inline release failed for booking %s on cancel — reconciler will retry",
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
