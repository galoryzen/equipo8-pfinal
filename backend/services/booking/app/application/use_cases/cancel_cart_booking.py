import logging
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

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


class CancelCartBookingUseCase:
    """Cancel a traveler booking: CART abandonment or CONFIRMED cancellation.

    **CART:** policy validation is skipped so existing cart-abandon semantics stay
    unchanged. Transition CART -> EXPIRED (not CANCELLED).

    **CONFIRMED:** domain cancellation policy is evaluated first; if allowed,
    transition to CATALOG release path (same release_hold coordination as cart).

    EXPIRED remains the terminal for abandoned carts. CANCELLED is used for
    post-confirmation traveler-initiated cancellation (refund orchestration out of scope).
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

        now = self._now()

        if booking.status == BookingStatus.CART:
            return await self._cancel_cart(booking, user_id, now)

        if booking.status == BookingStatus.CONFIRMED:
            return await self._cancel_confirmed(booking, user_id, now)

        raise InvalidBookingStateError(f"Cannot cancel booking in state {booking.status.value}")

    async def _cancel_cart(self, booking: Booking, user_id: UUID, now: datetime) -> BookingDetailOut:
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

        await self._release_inventory_best_effort(booking)
        return _to_detail(booking)

    async def _cancel_confirmed(self, booking: Booking, user_id: UUID, now: datetime) -> BookingDetailOut:
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

        await self._release_inventory_best_effort(booking)
        return _to_detail(booking)

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
