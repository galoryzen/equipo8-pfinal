from datetime import UTC, datetime
from uuid import UUID

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import BookingDetailOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _policy_type_str(p: CancellationPolicyType | str) -> str:
    return str(p.value) if hasattr(p, "value") else str(p)


class GetBookingDetailUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID, user_id: UUID) -> BookingDetailOut:
        booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()

        now_naive = datetime.now(UTC).replace(tzinfo=None)
        if (
            booking.status == BookingStatus.CART
            and booking.hold_expires_at is not None
            and booking.hold_expires_at < now_naive
        ):
            booking.status = BookingStatus.EXPIRED
            booking.updated_at = now_naive
            await self._repo.save(booking)

        return _to_detail(booking)


def _to_detail(booking: Booking) -> BookingDetailOut:
    return BookingDetailOut(
        id=booking.id,
        status=_status_str(booking),
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
        policy_type_applied=_policy_type_str(booking.policy_type_applied),
        policy_hours_limit_applied=booking.policy_hours_limit_applied,
        policy_refund_percent_applied=booking.policy_refund_percent_applied,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
