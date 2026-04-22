from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from contracts.events.base import DomainEventEnvelope
from contracts.events.payment import PAYMENT_AUTHORIZED, PAYMENT_FAILED

from app.application.use_cases.handle_payment_result import HandlePaymentResultUseCase
from app.domain.models import Booking, BookingStatus, BookingStatusHistory, CancellationPolicyType


def _booking(bid: UUID, status: BookingStatus, *, hold_expires_at=None, confirmation=None) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid,
        user_id=uuid4(),
        status=status,
        checkin=date(2026, 4, 10),
        checkout=date(2026, 4, 12),
        hold_expires_at=hold_expires_at,
        total_amount=Decimal("100.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("100.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=False,
        confirmation_payment_intent_id=confirmation,
        created_at=now,
        updated_at=now,
    )


def _authorized_envelope(booking_id: UUID, intent_id: UUID) -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=PAYMENT_AUTHORIZED,
        payload={
            "payment_intent_id": str(intent_id),
            "booking_id": str(booking_id),
            "payment_id": str(uuid4()),
            "amount": "100.00",
            "currency": "USD",
        },
    )


def _failed_envelope(booking_id: UUID, intent_id: UUID, reason: str = "card_declined") -> DomainEventEnvelope:
    return DomainEventEnvelope(
        event_type=PAYMENT_FAILED,
        payload={
            "payment_intent_id": str(intent_id),
            "booking_id": str(booking_id),
            "reason": reason,
        },
    )


@pytest.mark.asyncio
async def test_payment_authorized_delegates_to_mark_use_case():
    bid = uuid4()
    intent_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(bid, BookingStatus.PENDING_PAYMENT, hold_expires_at=future)

    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=b)

    uc = HandlePaymentResultUseCase(repo)
    await uc.execute(_authorized_envelope(bid, intent_id))

    assert b.status == BookingStatus.PENDING_CONFIRMATION
    assert b.confirmation_payment_intent_id == intent_id
    repo.save.assert_awaited_once_with(b)


@pytest.mark.asyncio
async def test_payment_failed_inserts_history_row():
    bid = uuid4()
    intent_id = uuid4()
    b = _booking(bid, BookingStatus.PENDING_PAYMENT)

    repo = AsyncMock()
    repo.find_last_status_history_by_reason = AsyncMock(return_value=None)
    repo.get_by_id = AsyncMock(return_value=b)
    repo.add_status_history = AsyncMock()

    uc = HandlePaymentResultUseCase(repo)
    await uc.execute(_failed_envelope(bid, intent_id, reason="card_declined"))

    repo.add_status_history.assert_awaited_once()
    row: BookingStatusHistory = repo.add_status_history.await_args.args[0]
    assert row.booking_id == bid
    assert row.from_status == BookingStatus.PENDING_PAYMENT
    assert row.to_status == BookingStatus.PENDING_PAYMENT
    assert row.reason == f"payment_failed:{intent_id}:card_declined"


@pytest.mark.asyncio
async def test_payment_failed_idempotent_with_existing_reason():
    bid = uuid4()
    intent_id = uuid4()
    existing = BookingStatusHistory(
        id=uuid4(),
        booking_id=bid,
        from_status=BookingStatus.PENDING_PAYMENT,
        to_status=BookingStatus.PENDING_PAYMENT,
        reason=f"payment_failed:{intent_id}:card_declined",
        changed_by=None,
        changed_at=datetime.now(UTC).replace(tzinfo=None),
    )

    repo = AsyncMock()
    repo.find_last_status_history_by_reason = AsyncMock(return_value=existing)
    repo.add_status_history = AsyncMock()
    repo.get_by_id = AsyncMock()

    uc = HandlePaymentResultUseCase(repo)
    await uc.execute(_failed_envelope(bid, intent_id, reason="card_declined"))

    repo.add_status_history.assert_not_awaited()
    repo.get_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_payment_failed_unknown_booking_is_noop():
    bid = uuid4()
    intent_id = uuid4()

    repo = AsyncMock()
    repo.find_last_status_history_by_reason = AsyncMock(return_value=None)
    repo.get_by_id = AsyncMock(return_value=None)
    repo.add_status_history = AsyncMock()

    uc = HandlePaymentResultUseCase(repo)
    await uc.execute(_failed_envelope(bid, intent_id))

    repo.add_status_history.assert_not_awaited()


@pytest.mark.asyncio
async def test_unexpected_event_type_is_noop():
    repo = AsyncMock()
    uc = HandlePaymentResultUseCase(repo)
    envelope = DomainEventEnvelope(event_type="SomethingElse", payload={})
    await uc.execute(envelope)

    repo.get_by_id.assert_not_awaited()
    repo.save.assert_not_awaited()
    repo.add_status_history.assert_not_awaited()
