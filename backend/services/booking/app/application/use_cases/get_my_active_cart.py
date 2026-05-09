from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking
from app.schemas.booking import BookingDetailOut


class GetMyActiveCartUseCase:
    """Return the user's active (non-expired) CART booking, or None.

    Carts are excluded from ``list_by_user_id`` so they don't pollute trip listings.
    Clients that need to rescue an in-progress cart (e.g. mobile after re-install or
    cross-device login) call this dedicated endpoint instead.
    """

    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, user_id: UUID) -> BookingDetailOut | None:
        booking = await self._repo.find_any_active_cart_for_user(user_id)
        return _to_detail(booking) if booking is not None else None


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
