from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

BOOKING_CONFIRMED = "BookingConfirmed"
BOOKING_REJECTED = "BookingRejected"


class BookingConfirmedPayload(BaseModel):
    booking_id: UUID
    user_id: UUID
    property_id: UUID
    checkin: date
    checkout: date
    guests_count: int
    total_amount: Decimal
    currency_code: str


class BookingRejectedPayload(BaseModel):
    booking_id: UUID
    user_id: UUID
    reason: str | None = None
