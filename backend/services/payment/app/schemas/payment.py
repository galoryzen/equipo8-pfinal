from decimal import Decimal
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
