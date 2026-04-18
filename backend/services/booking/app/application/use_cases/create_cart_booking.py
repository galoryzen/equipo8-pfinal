import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingStatus, CancellationPolicyType
from app.schemas.booking import CartBookingOut, CreateCartBookingIn

_HOLD_MINUTES = 15
_DEFAULT_POLICY = CancellationPolicyType.FULL


class CreateCartBookingUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, user_id: UUID, payload: CreateCartBookingIn) -> CartBookingOut:
        existing = await self._repo.find_active_cart(
            user_id=user_id,
            room_type_id=payload.room_type_id,
            rate_plan_id=payload.rate_plan_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )
        if existing is not None:
            return _to_cart_out(existing)

        nights = (payload.checkout - payload.checkin).days
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — columns are TIMESTAMP WITHOUT TIME ZONE

        total = payload.unit_price * nights

        booking = Booking(
            id=uuid.uuid4(),
            user_id=user_id,
            status=BookingStatus.CART,
            checkin=payload.checkin,
            checkout=payload.checkout,
            hold_expires_at=now + timedelta(minutes=_HOLD_MINUTES),
            total_amount=total,
            currency_code=payload.currency_code,
            property_id=payload.property_id,
            room_type_id=payload.room_type_id,
            rate_plan_id=payload.rate_plan_id,
            unit_price=payload.unit_price,
            policy_type_applied=_DEFAULT_POLICY,
            policy_hours_limit_applied=None,
            policy_refund_percent_applied=None,
            created_at=now,
            updated_at=now,
        )

        saved = await self._repo.create(booking)
        return _to_cart_out(saved)


def _to_cart_out(booking: Booking) -> CartBookingOut:
    return CartBookingOut(
        id=booking.id,
        status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
    )
