from datetime import datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import PaginatedResponse

# ── Shared sub-schemas ───────────────────────────────────


class ImageSummary(BaseModel):
    url: str
    caption: str | None = None


class AmenitySummary(BaseModel):
    code: str
    name: str


class CitySummary(BaseModel):
    id: UUID
    name: str
    department: str | None = None
    country: str


# ── Search response ──────────────────────────────────────


class PropertySummary(BaseModel):
    id: UUID
    name: str
    city: CitySummary
    address: str | None = None
    rating_avg: Decimal | None = None
    review_count: int
    image: ImageSummary | None = None
    min_price: Decimal | None = None
    original_min_price: Decimal | None = None
    amenities: list[AmenitySummary] = []


# ── Detail response ──────────────────────────────────────


class PropertyImageOut(BaseModel):
    id: UUID
    url: str
    caption: str | None = None
    display_order: int


class PropertyPolicyOut(BaseModel):
    id: UUID
    category: str
    description: str


class CancellationPolicyOut(BaseModel):
    id: UUID
    name: str
    type: str
    hours_limit: int | None = None
    refund_percent: int | None = None


class PromotionOut(BaseModel):
    id: UUID
    name: str
    discount_type: str  # "PERCENT" | "FIXED"
    discount_value: Decimal


class RatePlanOut(BaseModel):
    id: UUID
    name: str
    cancellation_policy: CancellationPolicyOut | None = None
    min_price: Decimal | None = None
    original_min_price: Decimal | None = None
    currency_code: str | None = None
    promotion: PromotionOut | None = None


class RoomTypeImageOut(BaseModel):
    id: UUID
    url: str
    caption: str | None = None
    display_order: int


class RoomTypeOut(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    capacity: int
    amenities: list[AmenitySummary] = []
    images: list[RoomTypeImageOut] = []
    rate_plans: list[RatePlanOut] = []
    min_price: Decimal | None = None


class ReviewOut(BaseModel):
    id: UUID
    user_id: UUID
    rating: int
    comment: str | None = None
    created_at: datetime


class PropertyDetail(BaseModel):
    id: UUID
    hotel_id: UUID
    name: str
    description: str | None = None
    city: CitySummary
    address: str | None = None
    check_in_time: time | None = None
    check_out_time: time | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    rating_avg: Decimal | None = None
    review_count: int
    popularity_score: Decimal
    default_cancellation_policy: CancellationPolicyOut | None = None
    images: list[PropertyImageOut] = []
    amenities: list[AmenitySummary] = []
    policies: list[PropertyPolicyOut] = []
    room_types: list[RoomTypeOut] = []


class PropertyDetailResponse(BaseModel):
    detail: PropertyDetail
    reviews: PaginatedResponse[ReviewOut]
