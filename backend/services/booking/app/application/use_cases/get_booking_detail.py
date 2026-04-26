from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import Booking, BookingStatus, CancellationPolicyType, Guest, new_status_history_row
from app.schemas.booking import BookingDetailOut, GuestOut, NightPriceOut


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _policy_type_str(p: CancellationPolicyType | str) -> str:
    return str(p.value) if hasattr(p, "value") else str(p)


class GetBookingDetailUseCase:
    def __init__(self, repo: BookingRepository, guest_repo: GuestRepository | None = None):
        self._repo = repo
        self._guest_repo = guest_repo

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
            await self._repo.add_status_history(
                new_status_history_row(
                    booking.id,
                    from_status=BookingStatus.CART,
                    to_status=BookingStatus.EXPIRED,
                    reason="hold_expired_on_read",
                )
            )

        guests: list[Guest] = []
        if self._guest_repo is not None:
            guests = await self._guest_repo.list_by_booking(booking.id)

        return _to_detail(booking, guests)


def _nights_breakdown_from_booking(booking: Booking) -> list[NightPriceOut]:
    raw = booking.nightly_breakdown
    if not raw:
        return []
    out: list[NightPriceOut] = []
    for entry in raw:
        original_raw = entry.get("original_price")
        out.append(
            NightPriceOut(
                day=entry["day"],
                price=Decimal(entry["price"]),
                original_price=Decimal(original_raw) if original_raw is not None else None,
            )
        )
    return out


def _to_detail(booking: Booking, guests: list[Guest]) -> BookingDetailOut:
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
        guests_count=booking.guests_count,
        guests=[
            GuestOut(
                id=g.id,
                is_primary=g.is_primary,
                full_name=g.full_name,
                email=g.email,
                phone=g.phone,
            )
            for g in guests
        ],
        nights_breakdown=_nights_breakdown_from_booking(booking),
        taxes=booking.taxes,
        service_fee=booking.service_fee,
        grand_total=booking.total_amount + booking.taxes + booking.service_fee,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
