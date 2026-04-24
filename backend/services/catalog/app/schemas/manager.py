from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import PaginatedResponse

CancellationPolicyTypeStr = Literal["FULL", "PARTIAL", "NON_REFUNDABLE"]


# ── Manager Hotels list ───────────────────────────────────


class ManagerHotelItem(BaseModel):
    """Matches the Hotel interface expected by frontend/travel-hub/app/manager/hotels/page.tsx"""

    id: UUID
    name: str
    location: str
    totalRooms: int
    occupiedRooms: int
    status: Literal["ACTIVE", "PENDING_REVIEW"]
    imageUrl: str | None
    categories: int


ManagerHotelListOut = PaginatedResponse[ManagerHotelItem]


# ── Hotel metrics ─────────────────────────────────────────


class HotelStatsOut(BaseModel):
    """Matches the HotelStats interface expected by HotelDetailView.tsx"""

    occupancyRate: float
    activeBookings: int
    monthlyRevenue: float


# ── Room types with availability ──────────────────────────


class RoomTypeManagerItem(BaseModel):
    """Matches the RoomTypeItem interface expected by HotelDetailView.tsx"""

    id: UUID
    name: str
    icon: str
    available: int
    total: int
    rate_plan_id: UUID | None = None


RoomTypeManagerListOut = PaginatedResponse[RoomTypeManagerItem]


# ── Room type promotion ───────────────────────────────────


class RoomTypePromotionOut(BaseModel):
    id: UUID
    rate_plan_id: UUID
    name: str
    discount_type: str
    discount_value: Decimal
    start_date: date
    end_date: date
    is_active: bool


# ── Create promotion ──────────────────────────────────────


class CreatePromotionIn(BaseModel):
    rate_plan_id: UUID
    name: str
    discount_type: Literal["PERCENT", "FIXED"]
    discount_value: Decimal
    start_date: date
    end_date: date


class PromotionCreatedOut(BaseModel):
    id: UUID
    name: str
    discount_type: str
    discount_value: Decimal
    start_date: date
    end_date: date
    is_active: bool


# ── Cancellation policy ───────────────────────────────────


class RatePlanCancellationPolicyOut(BaseModel):
    """Current cancellation policy of a rate plan."""

    type: CancellationPolicyTypeStr
    refund_percent: int | None = None
    hours_limit: int | None = None


class UpdateCancellationPolicyIn(BaseModel):
    """Body for PATCH /manager/rate-plans/{id}/cancellation-policy."""

    type: CancellationPolicyTypeStr
    refund_percent: int | None = None
