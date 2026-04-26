from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from contracts.events.payment import PAYMENT_REQUESTED

from app.application.exceptions import (
    BookingNotFoundError,
    CheckoutGuestsIncompleteError,
    InvalidBookingStateError,
)
from app.application.use_cases.checkout_booking import CheckoutBookingUseCase
from app.domain.models import Booking, BookingStatus, CancellationPolicyType, Guest


def _booking(
    *,
    bid: UUID | None = None,
    status: BookingStatus = BookingStatus.CART,
    guests_count: int = 2,
    hold_expires_at=None,
    user_id: UUID | None = None,
) -> Booking:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Booking(
        id=bid or uuid4(),
        user_id=user_id or uuid4(),
        status=status,
        checkin=date(2026, 5, 10),
        checkout=date(2026, 5, 12),
        hold_expires_at=hold_expires_at,
        total_amount=Decimal("150.00"),
        currency_code="USD",
        property_id=UUID("30000000-0000-0000-0000-000000000001"),
        room_type_id=UUID("60000000-0000-0000-0000-000000000001"),
        rate_plan_id=UUID("70000000-0000-0000-0000-000000000001"),
        unit_price=Decimal("75.00"),
        policy_type_applied=CancellationPolicyType.FULL,
        policy_hours_limit_applied=48,
        policy_refund_percent_applied=100,
        inventory_released=False,
        confirmation_payment_intent_id=None,
        guests_count=guests_count,
        taxes=Decimal("15.00"),
        service_fee=Decimal("7.50"),
        created_at=now,
        updated_at=now,
    )


def _guest(*, is_primary: bool = False, full_name: str = "Alice") -> Guest:
    now = datetime(2026, 4, 1, 12, 0, 0, tzinfo=UTC)
    return Guest(
        id=uuid4(),
        booking_id=uuid4(),
        is_primary=is_primary,
        full_name=full_name,
        email="a@b.com" if is_primary else None,
        phone="+12345" if is_primary else None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_happy_path_saves_pending_payment_and_publishes():
    user_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(user_id=user_id, hold_expires_at=future, guests_count=2)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)

    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[
        _guest(is_primary=True, full_name="Primary"),
        _guest(is_primary=False, full_name="Secondary"),
    ])

    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    result = await uc.execute(booking_id=b.id, user_id=user_id)

    assert b.status == BookingStatus.PENDING_PAYMENT
    booking_repo.save.assert_awaited_once_with(b)
    events.publish.assert_awaited_once()

    envelope = events.publish.call_args[0][0]
    assert envelope.event_type == PAYMENT_REQUESTED
    payload = envelope.payload
    assert payload["booking_id"] == str(b.id)
    assert payload["user_id"] == str(user_id)
    # Grand total: subtotal $150 + taxes $15 + service fee $7.50 = $172.50.
    # Charging only the subtotal would silently undercharge by the fees and
    # mismatch the amount the cart/checkout UI showed the user.
    assert payload["amount"] == "172.50"
    assert payload["currency"] == "USD"
    assert payload["force_decline"] is False
    assert "idempotency_key" in payload and len(payload["idempotency_key"]) > 0
    assert "payment_intent_id" not in payload

    assert result.status == "PENDING_PAYMENT"


@pytest.mark.asyncio
async def test_idempotent_when_already_pending_payment():
    user_id = uuid4()
    b = _booking(user_id=user_id, status=BookingStatus.PENDING_PAYMENT)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[])
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    result = await uc.execute(booking_id=b.id, user_id=user_id)

    booking_repo.save.assert_not_awaited()
    events.publish.assert_not_awaited()
    assert result.status == "PENDING_PAYMENT"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "bad_status",
    [
        BookingStatus.CONFIRMED,
        BookingStatus.PENDING_CONFIRMATION,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
        BookingStatus.REJECTED,
    ],
)
async def test_rejects_non_cart_state(bad_status):
    user_id = uuid4()
    b = _booking(user_id=user_id, status=bad_status)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[])
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(InvalidBookingStateError, match=r"Cannot checkout"):
        await uc.execute(booking_id=b.id, user_id=user_id)
    booking_repo.save.assert_not_awaited()
    events.publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_rejects_expired_hold():
    user_id = uuid4()
    past = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
    b = _booking(user_id=user_id, hold_expires_at=past)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[])
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(InvalidBookingStateError, match=r"hold has expired"):
        await uc.execute(booking_id=b.id, user_id=user_id)


@pytest.mark.asyncio
async def test_rejects_guests_count_mismatch():
    user_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(user_id=user_id, hold_expires_at=future, guests_count=3)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[
        _guest(is_primary=True),
        _guest(is_primary=False),
    ])  # only 2, expected 3
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(CheckoutGuestsIncompleteError, match=r"expects 3"):
        await uc.execute(booking_id=b.id, user_id=user_id)
    booking_repo.save.assert_not_awaited()


@pytest.mark.asyncio
async def test_rejects_missing_primary():
    user_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(user_id=user_id, hold_expires_at=future, guests_count=2)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[
        _guest(is_primary=False),
        _guest(is_primary=False),
    ])
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(CheckoutGuestsIncompleteError, match=r"primary guest required"):
        await uc.execute(booking_id=b.id, user_id=user_id)


@pytest.mark.asyncio
async def test_rejects_multiple_primary():
    user_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(user_id=user_id, hold_expires_at=future, guests_count=2)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[
        _guest(is_primary=True),
        _guest(is_primary=True),
    ])
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(CheckoutGuestsIncompleteError):
        await uc.execute(booking_id=b.id, user_id=user_id)


@pytest.mark.asyncio
async def test_booking_not_found_or_not_owned():
    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=None)
    guest_repo = AsyncMock()
    events = AsyncMock()

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(BookingNotFoundError):
        await uc.execute(booking_id=uuid4(), user_id=uuid4())


@pytest.mark.asyncio
async def test_publish_failure_does_not_rollback_save():
    """Documented trade-off: save commits before publish. If publish fails,
    booking stays in PENDING_PAYMENT. Scheduler extended will expire it
    eventually."""
    user_id = uuid4()
    future = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1)
    b = _booking(user_id=user_id, hold_expires_at=future, guests_count=1)

    booking_repo = AsyncMock()
    booking_repo.get_by_id_for_user = AsyncMock(return_value=b)
    guest_repo = AsyncMock()
    guest_repo.list_by_booking = AsyncMock(return_value=[_guest(is_primary=True)])
    events = AsyncMock()
    events.publish = AsyncMock(side_effect=RuntimeError("broker down"))

    uc = CheckoutBookingUseCase(booking_repo, guest_repo, events)
    with pytest.raises(RuntimeError, match="broker down"):
        await uc.execute(booking_id=b.id, user_id=user_id)

    # Save ran before publish, so the transition is already committed.
    booking_repo.save.assert_awaited_once()
    assert b.status == BookingStatus.PENDING_PAYMENT
