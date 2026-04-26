from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import (
    Booking,
    BookingStatus,
    BookingStatusHistory,
    CancellationPolicyType,
    Guest,
    new_status_history_row,
)
from app.schemas.booking import BookingDetailOut, GuestOut, LastPaymentAttemptOut, NightPriceOut
from shared.pricing import compute_fees

# Reason format written by HandlePaymentResultUseCase on PAYMENT_FAILED:
#   payment_failed:{intent_id}:{reason}
# We expose the latest such row in the booking detail so the mobile checkout
# polling can distinguish a real decline from a slow event bus.
_PAYMENT_FAILED_REASON_PREFIX = "payment_failed:"


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

        last_payment_attempt = await self._load_last_payment_attempt(booking.id)
        return _to_detail(booking, guests, last_payment_attempt)

    async def _load_last_payment_attempt(
        self, booking_id: UUID
    ) -> LastPaymentAttemptOut | None:
        row = await self._repo.find_last_status_history_by_reason_prefix(
            booking_id, _PAYMENT_FAILED_REASON_PREFIX
        )
        if row is None:
            return None
        return _failed_attempt_from_history(row)


def _failed_attempt_from_history(row: BookingStatusHistory) -> LastPaymentAttemptOut:
    raw = row.reason or ""
    # Strip "payment_failed:{intent}:" so the UI sees just the gateway reason.
    # split(maxsplit=2) keeps any colons inside the reason itself intact.
    parts = raw.split(":", 2)
    reason = parts[2] if len(parts) >= 3 else raw
    # changed_at is stored as naive UTC (TIMESTAMP WITHOUT TIME ZONE). Marking
    # it tz-aware here forces Pydantic to serialize as ISO 8601 WITH a "+00:00"
    # offset; without this, JS Date.parse on the client treats the naive string
    # as local time and the polling's "occurred_at >= pollStartedAt" filter
    # misfires on retries (the old failure ends up looking N hours in the
    # future of the new attempt's anchor).
    return LastPaymentAttemptOut(
        outcome="failed",
        reason=reason,
        occurred_at=row.changed_at.replace(tzinfo=UTC),
    )


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


def _to_detail(
    booking: Booking,
    guests: list[Guest],
    last_payment_attempt: LastPaymentAttemptOut | None = None,
) -> BookingDetailOut:
    nights_breakdown = _nights_breakdown_from_booking(booking)
    original_total: Decimal | None = None
    if nights_breakdown:
        originals = [n.original_price for n in nights_breakdown if n.original_price is not None]
        if originals:
            original_total = sum(originals, Decimal("0"))

    discount_percent: Decimal | None = None
    original_unit_price: Decimal | None = None
    original_taxes: Decimal | None = None
    original_service_fee: Decimal | None = None
    original_grand_total: Decimal | None = None
    if original_total is not None and original_total > 0 and booking.total_amount < original_total:
        discount_percent = (Decimal("1") - (booking.total_amount / original_total)) * Decimal("100")
        discount_percent = discount_percent.quantize(Decimal("0.01"))
        nights = (booking.checkout - booking.checkin).days
        if nights > 0:
            original_unit_price = (original_total / Decimal(nights)).quantize(Decimal("0.01"))
        original_taxes, original_service_fee = compute_fees(original_total)
        original_grand_total = (original_total + original_taxes + original_service_fee).quantize(Decimal("0.01"))

    return BookingDetailOut(
        id=booking.id,
        status=_status_str(booking),
        checkin=booking.checkin,
        checkout=booking.checkout,
        hold_expires_at=booking.hold_expires_at,
        total_amount=booking.total_amount,
        original_total_amount=original_total,
        discount_percent=discount_percent,
        currency_code=booking.currency_code,
        property_id=booking.property_id,
        room_type_id=booking.room_type_id,
        rate_plan_id=booking.rate_plan_id,
        unit_price=booking.unit_price,
        original_unit_price=original_unit_price,
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
        nights_breakdown=nights_breakdown,
        taxes=booking.taxes,
        service_fee=booking.service_fee,
        grand_total=booking.total_amount + booking.taxes + booking.service_fee,
        original_taxes=original_taxes,
        original_service_fee=original_service_fee,
        original_grand_total=original_grand_total,
        last_payment_attempt=last_payment_attempt,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
