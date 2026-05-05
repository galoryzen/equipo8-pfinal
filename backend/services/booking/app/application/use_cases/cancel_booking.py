import logging
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CANCELLED, BookingCancelledPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import (
    BookingNotFoundError,
    CancellationNotAllowedError,
    CatalogUnavailableError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.catalog_inventory_port import CatalogInventoryPort
from app.domain.cancellation_policy import evaluate_cancellation_policy
from app.domain.models import Booking, BookingStatus, new_status_history_row
from app.schemas.booking import BookingDetailOut

logger = logging.getLogger(__name__)


class CancelBookingUseCase:
    """Cancel a CONFIRMED booking (traveler-initiated, post-confirmation).

    **Only CONFIRMED is cancellable.** PENDING_CONFIRMATION is in the hotel's hands;
    the user must wait for confirm/reject. CART abandonment goes through
    ``AbandonCartBookingUseCase`` instead.

    The cancellation policy on the booking is evaluated; if it forbids cancellation
    at this time, ``CancellationNotAllowedError`` is raised and the booking remains
    CONFIRMED.

    **Async refund (why not synchronous):** PSP refunds can be slow or flaky; the
    cancel API only persists booking state and publishes ``BookingCancelled``. The
    payment worker performs the refund so the HTTP request stays fast and PSP
    failures do not roll back an already-valid cancellation (inventory + policy).
    """

    _CANCEL_EVENT_REASON = "traveler_cancelled"

    def __init__(
        self,
        repo: BookingRepository,
        catalog: CatalogInventoryPort,
        events: DomainEventPublisher,
        clock: Callable[[], datetime] | None = None,
    ):
        self._repo = repo
        self._catalog = catalog
        self._events = events
        self._now = clock or (lambda: datetime.now(UTC).replace(tzinfo=None))

    async def execute(self, booking_id: UUID, user_id: UUID) -> BookingDetailOut:
        booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.CONFIRMED:
            raise InvalidBookingStateError(
                f"Cannot cancel booking in state {booking.status.value}"
            )

        now = self._now()
        evaluation = evaluate_cancellation_policy(booking, at=now)
        if not evaluation.allowed:
            raise CancellationNotAllowedError(
                "La política de cancelación no permite anular la reserva en este momento."
            )

        from_status = booking.status
        booking.status = BookingStatus.CANCELLED
        booking.inventory_released = False
        booking.updated_at = now
        await self._repo.save(booking)
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=from_status,
                to_status=BookingStatus.CANCELLED,
                reason="user_cancelled_confirmed",
                changed_by=user_id,
            )
        )

        await self._publish_booking_cancelled_for_refund(booking, evaluation.refund_percent)
        await self._release_inventory_best_effort(booking)
        return _to_detail(booking)

    async def _publish_booking_cancelled_for_refund(
        self, booking: Booking, refund_percent: int
    ) -> None:
        """Enqueue async refund via payment worker (``BookingCancelled`` event).

        Bus/publish errors are logged and do not roll back the booking transition;
        inventory release still runs.
        """
        if refund_percent <= 0:
            # Defensive: an allowed cancellation with zero refund means no money
            # to return — skip publish so the worker doesn't record a $0 refund.
            logger.error(
                "Skipping BOOKING_CANCELLED publish for booking_id=%s: refund_percent=%s "
                "(allowed cancellation with no refund — investigate policy data)",
                booking.id,
                refund_percent,
            )
            return
        logger.info(
            "Publishing BOOKING_CANCELLED for booking_id=%s refund_percent=%s",
            booking.id,
            refund_percent,
        )
        envelope = DomainEventEnvelope(
            event_type=BOOKING_CANCELLED,
            payload=BookingCancelledPayload(
                booking_id=booking.id,
                user_id=booking.user_id,
                reason=self._CANCEL_EVENT_REASON,
                refund_percent=refund_percent,
            ).model_dump(mode="json"),
        )
        try:
            await self._events.publish(envelope)
        except Exception:
            logger.exception(
                "Failed to publish refund event for traveler-cancelled booking %s",
                booking.id,
            )

    async def _release_inventory_best_effort(self, booking: Booking) -> None:
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
                "Inline release failed for booking %s on cancel — reconciler will retry",
                booking.id,
            )


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
