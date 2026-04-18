import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingItem, BookingStatus, CancellationPolicyType
from app.schemas.booking import BookingItemDetailOut, CartBookingOut, CreateCartBookingIn

_HOLD_MINUTES = 15
_DEFAULT_POLICY = CancellationPolicyType.FULL


class CreateCartBookingUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, user_id: UUID, payload: CreateCartBookingIn) -> CartBookingOut:
        first_item = payload.items[0]

        existing = await self._repo.find_active_cart(
            user_id=user_id,
            room_type_id=first_item.room_type_id,
            rate_plan_id=first_item.rate_plan_id,
            checkin=payload.checkin,
            checkout=payload.checkout,
        )
        if existing is not None:
            return _to_cart_out(existing)

        nights = (payload.checkout - payload.checkin).days
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — columns are TIMESTAMP WITHOUT TIME ZONE

        booking_id = uuid.uuid4()
        items: list[BookingItem] = []
        total = 0

        for item_in in payload.items:
            subtotal = item_in.unit_price * item_in.quantity * nights
            total += subtotal
            items.append(
                BookingItem(
                    id=uuid.uuid4(),
                    booking_id=booking_id,
                    property_id=item_in.property_id,
                    room_type_id=item_in.room_type_id,
                    rate_plan_id=item_in.rate_plan_id,
                    quantity=item_in.quantity,
                    unit_price=item_in.unit_price,
                    subtotal=subtotal,
                )
            )

        booking = Booking(
            id=booking_id,
            user_id=user_id,
            status=BookingStatus.CART,
            checkin=payload.checkin,
            checkout=payload.checkout,
            hold_expires_at=now + timedelta(minutes=_HOLD_MINUTES),
            total_amount=total,
            currency_code=payload.currency_code,
            policy_type_applied=_DEFAULT_POLICY,
            policy_hours_limit_applied=None,
            policy_refund_percent_applied=None,
            created_at=now,
            updated_at=now,
            items=items,
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
        items=[
            BookingItemDetailOut(
                id=i.id,
                property_id=i.property_id,
                room_type_id=i.room_type_id,
                rate_plan_id=i.rate_plan_id,
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal,
            )
            for i in booking.items
        ],
    )
