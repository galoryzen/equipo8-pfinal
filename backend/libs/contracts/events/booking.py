from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

BOOKING_CONFIRMED = "BookingConfirmed"
BOOKING_REJECTED = "BookingRejected"
BOOKING_CANCELLED = "BookingCancelled"


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
    # Hotel rejection always refunds 100% regardless of the booking's policy.
    # Default keeps already-queued events correct without a republish.
    refund_percent: int = Field(default=100, ge=0, le=100)


class BookingCancelledPayload(BaseModel):
    booking_id: UUID
    user_id: UUID
    reason: str | None = None
    # Required: the booking service computes this from the booking's applied policy.
    refund_percent: int = Field(ge=0, le=100)
