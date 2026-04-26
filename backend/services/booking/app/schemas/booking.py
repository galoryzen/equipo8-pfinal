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
    guests_count: int = Field(default=1, ge=1, le=20)


class NightPriceOut(BaseModel):
    day: date
    price: Decimal
    original_price: Decimal | None = None


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
    guests_count: int | None = None


class GuestIn(BaseModel):
    is_primary: bool
    full_name: str = Field(min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)


class SaveGuestsIn(BaseModel):
    guests: list[GuestIn] = Field(min_length=1, max_length=20)


class RejectBookingIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class GuestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_primary: bool
    full_name: str
    email: str | None
    phone: str | None


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
    guests_count: int
    guests: list[GuestOut] = Field(default_factory=list)
    nights_breakdown: list[NightPriceOut] = Field(default_factory=list)
    taxes: Decimal = Decimal("0")
    service_fee: Decimal = Decimal("0")
    grand_total: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime


class PaginatedBookingListOut(BaseModel):
    items: list[BookingListItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int


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
    guests_count: int
    nights_breakdown: list[NightPriceOut] = Field(default_factory=list)
    taxes: Decimal = Decimal("0")
    service_fee: Decimal = Decimal("0")
    grand_total: Decimal = Decimal("0")
