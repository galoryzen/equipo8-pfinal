from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateCartBookingItemIn(BaseModel):
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal


class CreateCartBookingIn(BaseModel):
    checkin: date
    checkout: date
    currency_code: str = Field(max_length=3)
    items: list[CreateCartBookingItemIn] = Field(min_length=1)


class BookingItemSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    property_id: UUID
    room_type_id: UUID
    quantity: int = Field(ge=1)


class BookingListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    total_amount: Decimal
    currency_code: str
    created_at: datetime
    items: list[BookingItemSummaryOut]


class BookingItemDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    room_type_id: UUID
    rate_plan_id: UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class BookingDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    hold_expires_at: datetime | None
    total_amount: Decimal
    currency_code: str
    policy_type_applied: str
    policy_hours_limit_applied: int | None
    policy_refund_percent_applied: int | None
    created_at: datetime
    updated_at: datetime
    items: list[BookingItemDetailOut]


class CartBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    checkin: date
    checkout: date
    hold_expires_at: datetime
    total_amount: Decimal
    currency_code: str
    items: list[BookingItemDetailOut]


class HeldRoomsOut(BaseModel):
    held_room_type_ids: list[UUID]
