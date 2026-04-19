import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.domain.models import PaymentIntent, PaymentIntentStatus


def make_payment_intent(**overrides) -> PaymentIntent:
    defaults = {
        "id": uuid.uuid4(),
        "booking_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "amount": Decimal("10.00"),
        "currency_code": "USD",
        "status": PaymentIntentStatus.PENDING,
        "mock_payment_token": "tok_mock_ok",
        "start_idempotency_key": None,
        "webhook_signing_secret": "whsec_test",
        "payment_id": None,
        "created_at": datetime.now(UTC).replace(tzinfo=None),
        "updated_at": datetime.now(UTC).replace(tzinfo=None),
    }
    defaults.update(overrides)
    return PaymentIntent(**defaults)
