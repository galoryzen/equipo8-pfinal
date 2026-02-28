from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CheckoutStartRequest(BaseModel):
    user_id: UUID
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    checkin: date
    checkout: date
    quantity: int = Field(default=1, ge=1)


class CheckoutStartResponse(BaseModel):
    booking_id: UUID
    status: str
    hold_expires_at: datetime
    total_amount: float
    currency_code: str
