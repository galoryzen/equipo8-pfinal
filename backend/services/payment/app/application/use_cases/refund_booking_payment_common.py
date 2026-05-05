"""Shared refund path for booking lifecycle events (reject, traveler cancel)."""

import logging
import uuid
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from app.application.ports.outbound.payment_gateway_port import PaymentGatewayPort
from app.application.ports.outbound.payment_repository import PaymentRepository
from app.domain.models import PaymentIntentStatus, Refund

logger = logging.getLogger(__name__)


async def refund_eligible_payment_for_booking(
    repo: PaymentRepository,
    gateway: PaymentGatewayPort,
    booking_id: UUID,
    *,
    refund_reason: str,
    refund_percent: int,
) -> None:
    """Refund ``refund_percent`` % of the booking's authorized amount, if eligible.

    Currency-agnostic: the refund amount is quantized to the same precision as
    ``payment.authorized_amount``, so USD (2dp), JPY (0dp), or BHD (3dp) all work
    without changing this code — the source amount carries the right scale.

    Idempotent by booking and by payment. Exits safely (no exception) when data
    is missing or inconsistent so the worker does not crash on bad rows.
    """
    existing_for_booking = await repo.find_refund_by_booking_id(booking_id)
    if existing_for_booking is not None:
        logger.warning(
            "Refund already exists for booking_id=%s, skipping (duplicate event or replay)",
            booking_id,
        )
        return

    intent = await repo.get_intent_by_booking_id(booking_id)
    if intent is None:
        logger.warning(
            "No payment intent for booking_id=%s; skipping refund (nothing to reverse)",
            booking_id,
        )
        return

    if intent.status != PaymentIntentStatus.SUCCEEDED:
        logger.warning(
            "Payment intent for booking_id=%s is not SUCCEEDED (status=%s); skipping refund",
            booking_id,
            intent.status.value if hasattr(intent.status, "value") else intent.status,
        )
        return

    payment = await repo.get_payment_by_intent_id(intent.id)
    if payment is None:
        logger.error(
            "Data invariant: intent id=%s for booking_id=%s is SUCCEEDED but no Payment row; "
            "skipping refund",
            intent.id,
            booking_id,
        )
        return

    existing_for_payment = await repo.find_refund_by_payment_id(payment.id)
    if existing_for_payment is not None:
        logger.warning(
            "Refund already exists for booking_id=%s payment_id=%s, skipping",
            booking_id,
            payment.id,
        )
        return

    authorized = payment.authorized_amount

    if refund_percent <= 0:
        # Persist a zero refund row so the booking-level idempotency guard catches
        # any replay of the same event. Skip the PSP — nothing to send.
        zero_amount = (authorized * Decimal(0)).quantize(authorized)
        refund = Refund(
            id=uuid.uuid4(),
            payment_id=payment.id,
            amount=zero_amount,
            status="SUCCEEDED",
            reason=refund_reason,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        await repo.add_refund(refund)
        logger.info(
            "Zero-refund recorded for booking_id=%s payment_id=%s reason=%s "
            "(refund_percent=%s, no PSP call)",
            booking_id,
            payment.id,
            refund_reason,
            refund_percent,
        )
        return

    refund_amount = (authorized * Decimal(refund_percent) / Decimal(100)).quantize(
        authorized, rounding=ROUND_HALF_UP
    )
    if refund_amount > authorized:
        # Defensive — would only happen if percent > 100 slipped past validation.
        logger.warning(
            "Computed refund_amount=%s exceeds authorized_amount=%s for booking_id=%s; "
            "clamping to authorized",
            refund_amount,
            authorized,
            booking_id,
        )
        refund_amount = authorized

    outcome = gateway.refund_payment(payment.id, refund_amount)
    status = "SUCCEEDED" if outcome.succeeded else "FAILED"
    refund = Refund(
        id=uuid.uuid4(),
        payment_id=payment.id,
        amount=refund_amount,
        status=status,
        reason=refund_reason,
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )
    await repo.add_refund(refund)
    logger.info(
        "Refund issued for booking_id=%s payment_id=%s refund_percent=%s "
        "authorized_amount=%s amount=%s status=%s reason=%s",
        booking_id,
        payment.id,
        refund_percent,
        authorized,
        refund_amount,
        status,
        refund_reason,
    )
