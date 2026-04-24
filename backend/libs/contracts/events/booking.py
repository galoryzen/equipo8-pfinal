from uuid import UUID

from pydantic import BaseModel

BOOKING_CONFIRMED = "BookingConfirmed"
BOOKING_REJECTED = "BookingRejected"


class BookingConfirmedPayload(BaseModel):
    booking_id: UUID
    user_id: UUID


class BookingRejectedPayload(BaseModel):
    booking_id: UUID
    user_id: UUID
    reason: str | None = None
