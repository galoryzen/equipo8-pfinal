import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from app.application.dto import BookingForPayment
from app.application.exceptions import (
    BookingNotFoundError,
    BookingNotPayableError,
    BookingSnapshotError,
)
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from tests.conftest import make_payment_intent


@pytest.mark.asyncio
async def test_idempotency_returns_existing_intent():
    booking_id = uuid.uuid4()
    user_id = uuid.uuid4()
    existing = make_payment_intent(
        booking_id=booking_id,
        user_id=user_id,
        start_idempotency_key="idem-1",
        mock_payment_token="tok_existing",
        webhook_signing_secret="whsec_existing",
    )

    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=existing)
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    snap = BookingForPayment(
        id=booking_id,
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("100.00"),
        currency_code="USD",
        hold_expires_at=future,
    )
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    uc = CreatePaymentIntentUseCase(repo, booking)
    out = await uc.execute(
        booking_id=booking_id,
        user_id=user_id,
        authorization_header_value="Bearer x",
        idempotency_key="idem-1",
    )

    assert out.payment_intent_id == existing.id
    assert out.mock_payment_token == "tok_existing"
    repo.add_intent.assert_not_called()


@pytest.mark.asyncio
async def test_idempotency_conflict_raises():
    other_booking = uuid.uuid4()
    existing = make_payment_intent(booking_id=other_booking, start_idempotency_key="idem-1")
    repo = AsyncMock()
    repo.get_intent_by_start_idempotency_key = AsyncMock(return_value=existing)
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    snap = BookingForPayment(
        id=uuid.uuid4(),
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("100.00"),
        currency_code="USD",
        hold_expires_at=future,
    )
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    uc = CreatePaymentIntentUseCase(repo, booking)
    with pytest.raises(BookingNotPayableError, match="Idempotency-Key"):
        await uc.execute(
            booking_id=snap.id,
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key="idem-1",
        )


@pytest.mark.asyncio
async def test_booking_snapshot_id_mismatch():
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    requested = uuid.uuid4()
    snap = BookingForPayment(
        id=uuid.uuid4(),
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("50.00"),
        currency_code="USD",
        hold_expires_at=future,
    )
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    uc = CreatePaymentIntentUseCase(AsyncMock(), booking)
    with pytest.raises(BookingSnapshotError, match="mismatch"):
        await uc.execute(
            booking_id=requested,
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key=None,
        )


@pytest.mark.asyncio
async def test_get_booking_not_found_propagates():
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(side_effect=BookingNotFoundError())

    uc = CreatePaymentIntentUseCase(AsyncMock(), booking)
    with pytest.raises(BookingNotFoundError):
        await uc.execute(
            booking_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key=None,
        )


@pytest.mark.asyncio
async def test_get_booking_snapshot_error_propagates():
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(side_effect=BookingSnapshotError("timeout"))

    uc = CreatePaymentIntentUseCase(AsyncMock(), booking)
    with pytest.raises(BookingSnapshotError):
        await uc.execute(
            booking_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key=None,
        )


@pytest.mark.asyncio
async def test_booking_not_payable_wrong_status():
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    bid = uuid.uuid4()
    snap = BookingForPayment(
        id=bid,
        status="CONFIRMED",
        total_amount=Decimal("10.00"),
        currency_code="USD",
        hold_expires_at=future,
    )
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    uc = CreatePaymentIntentUseCase(AsyncMock(), booking)
    with pytest.raises(BookingNotPayableError, match="PENDING"):
        await uc.execute(
            booking_id=bid,
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key=None,
        )


@pytest.mark.asyncio
async def test_booking_hold_expired():
    past = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
    bid = uuid.uuid4()
    snap = BookingForPayment(
        id=bid,
        status="PENDING_CONFIRMATION",
        total_amount=Decimal("10.00"),
        currency_code="USD",
        hold_expires_at=past,
    )
    booking = AsyncMock()
    booking.get_booking_for_user = AsyncMock(return_value=snap)

    uc = CreatePaymentIntentUseCase(AsyncMock(), booking)
    with pytest.raises(BookingNotPayableError, match="expired"):
        await uc.execute(
            booking_id=bid,
            user_id=uuid.uuid4(),
            authorization_header_value="Bearer x",
            idempotency_key=None,
        )
