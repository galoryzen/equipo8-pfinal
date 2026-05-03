from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

PAYMENT_REQUESTED = "PaymentRequested"
PAYMENT_SUCCEEDED = "PaymentSucceeded"
PAYMENT_FAILED = "PaymentFailed"


class PaymentRequestedPayload(BaseModel):
    booking_id: UUID
    user_id: UUID
    amount: Decimal
    currency: str
    idempotency_key: str
    force_decline: bool = False


class PaymentSucceededPayload(BaseModel):
    payment_intent_id: UUID
    booking_id: UUID
    payment_id: UUID
    amount: Decimal
    currency: str


class PaymentFailedPayload(BaseModel):
    payment_intent_id: UUID
    booking_id: UUID
    user_id: UUID
    reason: str
