from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateCartBookingIn(BaseModel):
    checkin: date
    checkout: date
    currency_code: str = Field(max_length=3)
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    unit_price: Decimal


class BookingListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    total_amount: Decimal
    currency_code: str
    property_id: UUID
    room_type_id: UUID
    created_at: datetime
    image_url: str | None = None
    property_name: str | None = None
    nights: int | None = None
    guest_name: str | None = None


class BookingDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    hold_expires_at: datetime | None
    total_amount: Decimal
    currency_code: str
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    unit_price: Decimal
    policy_type_applied: str
    policy_hours_limit_applied: int | None
    policy_refund_percent_applied: int | None
    created_at: datetime
    updated_at: datetime


class CartBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    hold_expires_at: datetime
    total_amount: Decimal
    currency_code: str
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    unit_price: Decimal
