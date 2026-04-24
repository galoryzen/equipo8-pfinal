from datetime import datetime
from uuid import UUID

from contracts.events.base import DomainEventEnvelope
from contracts.events.booking import BOOKING_CONFIRMED, BookingConfirmedPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingStatus, new_status_history_row
from app.schemas.booking import BookingDetailOut


class InventoryConflictError(Exception):
    pass


class ConfirmBookingUseCase:
    def __init__(self, repo: BookingRepository, events: DomainEventPublisher):
        self._repo = repo
        self._events = events

    async def execute(self, booking_id: UUID, user_id: UUID | None, notes: str | None = None) -> BookingDetailOut:
        if user_id is None:
            booking = await self._repo.get_by_id(booking_id)
        else:
            booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            raise ValueError("La reserva no está pendiente de confirmación.")

        if not await self._repo.check_inventory(booking):
            raise InventoryConflictError("No hay disponibilidad suficiente para confirmar la reserva.")

        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = datetime.utcnow()
        await self._repo.update(booking)
        await self._repo.decrement_inventory(booking)
        reason = f"hotel_confirmed:{notes}" if notes else "hotel_confirmed"
        await self._repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.PENDING_CONFIRMATION,
                to_status=BookingStatus.CONFIRMED,
                reason=reason,
                changed_by=user_id,
            )
        )
        await self._events.publish(
            DomainEventEnvelope(
                event_type=BOOKING_CONFIRMED,
                payload=BookingConfirmedPayload(
                    booking_id=booking.id,
                    user_id=booking.user_id,
                ).model_dump(mode="json"),
            )
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
