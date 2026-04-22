from datetime import datetime
from uuid import UUID

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingStatus
from app.schemas.booking import BookingDetailOut


class RejectBookingUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID) -> BookingDetailOut:
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            raise ValueError("La reserva no está pendiente de confirmación.")

        booking.status = BookingStatus.REJECTED
        booking.updated_at = datetime.utcnow()
        await self._repo.update(booking)
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
