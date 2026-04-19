from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CreatePaymentIntentIn(BaseModel):
    booking_id: UUID


class PaymentIntentCreatedOut(BaseModel):
    payment_intent_id: UUID
    mock_payment_token: str = Field(
        description="Opaque mock token — submit this on confirm (never a PAN or card number)."
    )
    amount: Decimal
    currency_code: str
    webhook_signing_secret: str = Field(
        description="Secret for mock webhook authentication (increment only)."
    )


class ConfirmPaymentIn(BaseModel):
    payment_token: str = Field(min_length=8, max_length=512)


class ConfirmPaymentOut(BaseModel):
    status: Literal["succeeded", "failed", "already_succeeded"]
    payment_intent_id: UUID
    booking_id: UUID


class MockWebhookIn(BaseModel):
    payment_intent_id: UUID
    status: Literal["succeeded", "failed"]
    idempotency_key: str = Field(min_length=4, max_length=256)
    webhook_signing_secret: str = Field(min_length=8, max_length=512)
