import logging
from datetime import UTC, datetime
from uuid import UUID

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_REJECTED, BookingRejectedPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import BookingNotFoundError, CatalogUnavailableError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.models import Booking, BookingStatus, new_status_history_row
from app.schemas.booking import BookingDetailOut

logger = logging.getLogger(__name__)


class RejectBookingUseCase:
    def __init__(
        self,
        repo: BookingRepository,
        events: DomainEventPublisher,
        catalog: CatalogInventoryPort,
    ):
        self._repo = repo
        self._events = events
        self._catalog = catalog

    async def execute(self, booking_id: UUID, reason: str | None = None) -> BookingDetailOut:
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            raise ValueError("La reserva no está pendiente de confirmación.")

        booking.status = BookingStatus.REJECTED
        booking.inventory_released = False
        booking.updated_at = datetime.utcnow()
        await self._repo.update(booking)
        history_reason = f"hotel_rejected:{reason}" if reason else "hotel_rejected"
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.PENDING_CONFIRMATION,
                to_status=BookingStatus.REJECTED,
                reason=history_reason,
            )
        )
        await self._events.publish(
            DomainEventEnvelope(
                event_type=BOOKING_REJECTED,
                payload=BookingRejectedPayload(
                    booking_id=booking.id,
                    user_id=booking.user_id,
                    reason=reason,
                ).model_dump(mode="json"),
            )
        )

        # Best-effort inline release so the hold is returned to the pool
        # immediately. If Catalog is down the reconciler will retry
        # (see ReconcileInventoryReleaseUseCase).
        try:
            await self._catalog.release_hold(
                room_type_id=booking.room_type_id,
                checkin=booking.checkin,
                checkout=booking.checkout,
            )
            booking.inventory_released = True
            booking.updated_at = datetime.now(UTC).replace(tzinfo=None)
            await self._repo.update(booking)
        except CatalogUnavailableError:
            logger.warning(
                "Inline release failed for booking %s on reject — reconciler will retry",
                booking.id,
            )

        return _to_detail(booking)


def _to_detail(booking: Booking) -> BookingDetailOut:
    status = booking.status
    policy = booking.policy_type_applied
    return BookingDetailOut(
        id=booking.id,
        status=status.value if hasattr(status, "value") else str(status),
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
        policy_type_applied=policy.value if hasattr(policy, "value") else str(policy),
        policy_hours_limit_applied=booking.policy_hours_limit_applied,
        policy_refund_percent_applied=booking.policy_refund_percent_applied,
        guests_count=booking.guests_count or 1,
        guests=[],
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
