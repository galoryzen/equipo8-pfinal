"""Transition a CART booking into PENDING_PAYMENT and publish PaymentRequested."""

import uuid
from datetime import UTC, datetime
import logging
from uuid import UUID

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PAYMENT_REQUESTED, PaymentRequestedPayload
from shared.events import DomainEventPublisher

from app.application.exceptions import (
    BookingNotFoundError,
    CheckoutGuestsIncompleteError,
    InvalidBookingStateError,
)
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.domain.models import Booking, BookingStatus, CancellationPolicyType, Guest, new_status_history_row
from app.schemas.booking import BookingDetailOut, GuestOut

logger = logging.getLogger(__name__)


class CheckoutBookingUseCase:
    def __init__(
        self,
        booking_repo: BookingRepository,
        guest_repo: GuestRepository,
        events: DomainEventPublisher,
    ):
        self._booking_repo = booking_repo
        self._guest_repo = guest_repo
        self._events = events

    async def execute(
        self,
        *,
        booking_id: UUID,
        user_id: UUID,
        force_decline: bool = False,
    ) -> BookingDetailOut:
        booking = await self._booking_repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()

        guests = await self._guest_repo.list_by_booking(booking.id)

        is_retry_after_failure = False
        if booking.status == BookingStatus.PENDING_PAYMENT:
            # PENDING_PAYMENT splits into two sub-states: an in-flight first
            # attempt vs. a failed attempt awaiting retry. The history table
            # is the discriminator — a `payment_failed:` row means the PSP
            # already rejected and the user is now trying again with new card
            # details. Without this branch, the original idempotent no-op
            # would silently swallow the retry and the mobile polling would
            # time out instead of resolving.
            last_failure = await self._booking_repo.find_last_status_history_by_reason_prefix(
                booking.id, "payment_failed:"
            )
            if last_failure is None:
                return _to_detail(booking, guests)
            is_retry_after_failure = True
        elif booking.status != BookingStatus.CART:
            raise InvalidBookingStateError(
                f"Cannot checkout booking in state {booking.status.value}"
            )

        now = datetime.now(UTC).replace(tzinfo=None)
        if booking.hold_expires_at is not None and booking.hold_expires_at <= now:
            raise InvalidBookingStateError("Booking hold has expired")

        self._validate_guests(booking.guests_count, guests)

        idempotency_key = str(uuid.uuid4())

        if is_retry_after_failure:
            # Booking already in PENDING_PAYMENT; only refresh updated_at and
            # log a retry marker so the timeline is auditable.
            booking.updated_at = now
            await self._booking_repo.save(booking)
            await self._booking_repo.add_status_history(
                new_status_history_row(
                    booking.id,
                    from_status=BookingStatus.PENDING_PAYMENT,
                    to_status=BookingStatus.PENDING_PAYMENT,
                    reason="checkout_retry",
                    changed_by=user_id,
                )
            )
        else:
            booking.status = BookingStatus.PENDING_PAYMENT
            booking.updated_at = now
            await self._booking_repo.save(booking)
            await self._booking_repo.add_status_history(
                new_status_history_row(
                    booking.id,
                    from_status=BookingStatus.CART,
                    to_status=BookingStatus.PENDING_PAYMENT,
                    reason="checkout",
                    changed_by=user_id,
                )
            )

        # Charge the user the grand total (subtotal + taxes + service_fee) —
        # the same number the cart/checkout UI showed. ``booking.total_amount``
        # is just the room subtotal; charging it would silently undercharge by
        # the fee amount and create a refund mismatch later.
        charge_amount = booking.total_amount + booking.taxes + booking.service_fee
        envelope = DomainEventEnvelope(
            event_type=PAYMENT_REQUESTED,
            payload=PaymentRequestedPayload(
                booking_id=booking.id,
                user_id=user_id,
                amount=charge_amount,
                currency=booking.currency_code,
                idempotency_key=idempotency_key,
                force_decline=force_decline,
            ).model_dump(mode="json"),
        )
        logger.info("Publishing payment requested event:")
        await self._events.publish(envelope)

        return _to_detail(booking, guests)

    def _validate_guests(self, expected: int, guests: list[Guest]) -> None:
        if len(guests) != expected:
            raise CheckoutGuestsIncompleteError(
                f"Booking expects {expected} guests, found {len(guests)}"
            )
        primaries = [g for g in guests if g.is_primary]
        if len(primaries) != 1:
            raise CheckoutGuestsIncompleteError(
                f"Exactly one primary guest required, found {len(primaries)}"
            )


def _status_str(booking: Booking) -> str:
    s = booking.status
    return s.value if hasattr(s, "value") else str(s)


def _policy_type_str(p: CancellationPolicyType | str) -> str:
    return str(p.value) if hasattr(p, "value") else str(p)


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
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )
