from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

PAYMENT_AUTHORIZED = "PaymentAuthorized"
PAYMENT_SUCCEEDED = "PaymentSucceeded"
PAYMENT_FAILED = "PaymentFailed"


class PaymentAuthorizedPayload(BaseModel):
    payment_intent_id: UUID
    booking_id: UUID
    amount: Decimal
    currency: str


class PaymentSucceededPayload(BaseModel):
    payment_intent_id: UUID
    booking_id: UUID
    payment_id: UUID
    amount: Decimal
    currency: str


class PaymentFailedPayload(BaseModel):
    payment_intent_id: UUID
    booking_id: UUID
    reason: str
