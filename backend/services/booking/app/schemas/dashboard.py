from pydantic import BaseModel, ConfigDict, Field


class HotelBookingsMetricsOut(BaseModel):
    """Tab-level aggregates for the manager Bookings screen (full hotel scope, not paginated)."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    confirmed_count: int = Field(alias="confirmedCount", ge=0)
    pending_count: int = Field(alias="pendingCount", ge=0)
    check_ins_today_count: int = Field(alias="checkInsTodayCount", ge=0)
    cancelled_count: int = Field(alias="cancelledCount", ge=0)


class MetricFloatOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    value: float
    variation: float = Field(description="Percent change vs equivalent prior period (+/-).")


class MetricRatingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    value: float | None = Field(
        default=None,
        description="Average review score (1–5) for stays in range; null when no reviews.",
    )
    variation: float = Field(description="Percent change vs equivalent prior period (+/-).")


class DashboardMetricsBlockOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    total_bookings: MetricFloatOut = Field(alias="totalBookings")
    revenue: MetricFloatOut
    occupancy_rate: MetricFloatOut = Field(
        alias="occupancyRate",
        description="Approximate occupancy for the hotel (0–100), see service docs.",
    )
    average_rating: MetricRatingOut = Field(alias="averageRating")


class BookingTrendOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    date: str
    bookings: int


class RecentActivityOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    activity_type: str = Field(alias="type")
    description: str
    timestamp: str


class UpcomingCheckinOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    guest: str
    room_type: str = Field(alias="roomType")
    check_in: str = Field(alias="checkIn")
    check_out: str = Field(alias="checkOut")
    status: str
    amount: float


class DashboardMetricsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    metrics: DashboardMetricsBlockOut
    active_cancellations: int = Field(alias="activeCancellations")
    checked_in_count: int = Field(
        alias="checkedInCount",
        description="Reservas en CHECKED_IN con estancia activa hoy (checkin <= hoy < checkout).",
    )
    checked_in_guests: int = Field(
        alias="checkedInGuests",
        description="Suma de guests_count para esas estancias.",
    )
    available_rooms: float = Field(alias="availableRooms")
    booking_trends: list[BookingTrendOut] = Field(alias="bookingTrends")
    recent_activity: list[RecentActivityOut] = Field(alias="recentActivity")
    upcoming_checkins: list[UpcomingCheckinOut] = Field(alias="upcomingCheckins")
