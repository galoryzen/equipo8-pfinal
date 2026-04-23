from pydantic import BaseModel, ConfigDict, Field


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
    available_rooms: float = Field(alias="availableRooms")
    booking_trends: list[BookingTrendOut] = Field(alias="bookingTrends")
    recent_activity: list[RecentActivityOut] = Field(alias="recentActivity")
    upcoming_checkins: list[UpcomingCheckinOut] = Field(alias="upcomingCheckins")
