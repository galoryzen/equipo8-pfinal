from uuid import UUID

from pydantic import BaseModel


class ConfirmAfterPaymentIn(BaseModel):
    payment_intent_id: UUID
