from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class CreateHoldRequest(BaseModel):
    room_type_id: UUID
    checkin: date
    checkout: date
    quantity: int = Field(default=1, ge=1)


class HoldCreatedResponse(BaseModel):
    room_type_id: UUID
    checkin: date
    checkout: date
    quantity: int
    total_amount: float
    currency_code: str
