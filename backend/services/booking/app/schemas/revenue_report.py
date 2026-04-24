from pydantic import BaseModel, ConfigDict, Field


class RevenueMetricOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    value: float
    variation: float = Field(description="Percent change vs equivalent prior period (+/-).")


class RevenueKpisOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    total_revenue: RevenueMetricOut = Field(alias="totalRevenue")
    adr: RevenueMetricOut
    occupancy_rate: RevenueMetricOut = Field(alias="occupancyRate")


class RevenueTrendOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    date: str
    revenue: float
    occupancy_rate: float = Field(alias="occupancyRate")


class RevenueByRoomTypeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    room_type: str = Field(alias="roomType")
    units_sold: int = Field(alias="unitsSold")
    avg_rate: float = Field(alias="avgRate")
    total_revenue: float = Field(alias="totalRevenue")


class RevenueReportMetadataOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    date_from: str = Field(alias="from")
    date_to: str = Field(alias="to")
    currency: str


class RevenueReportResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    kpis: RevenueKpisOut
    trends: list[RevenueTrendOut]
    revenue_by_room_type: list[RevenueByRoomTypeOut] = Field(alias="revenueByRoomType")
    total_aggregated_revenue: float = Field(alias="totalAggregatedRevenue")
    metadata: RevenueReportMetadataOut
