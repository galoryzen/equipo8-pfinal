from pydantic import BaseModel, ConfigDict, Field


class OccupancyCalendarDayOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    total_rooms: int = Field(ge=0)
    occupied_rooms: int = Field(ge=0)
    blocked_rooms: int = Field(ge=0)
    available_rooms: int = Field(ge=0)
    occupancy_rate: float = Field(ge=0.0)
    occupancy_level: str


class OccupancyCalendarResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    property_id: str
    date_from: str
    date_to: str
    days: list[OccupancyCalendarDayOut]


class RoomTypeOccupancyBreakdownOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    room_type_id: str
    room_type_name: str
    total_rooms: int = Field(ge=0)
    occupied_rooms: int = Field(ge=0)
    blocked_rooms: int = Field(ge=0)
    available_rooms: int = Field(ge=0)
    occupancy_rate: float = Field(ge=0.0)
    occupancy_level: str


class OccupancyDailyBreakdownResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    property_id: str
    date: str
    room_types: list[RoomTypeOccupancyBreakdownOut]


class ProjectionDayAlertOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

    type: str
    message: str


class OccupancyProjectionDayOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    occupancy_rate: float = Field(ge=0.0)
    occupancy_level: str
    alert: ProjectionDayAlertOut | None = None


class LowOccupancyPeriodAlertOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

    type: str
    date_from: str
    date_to: str
    average_occupancy_rate: float


class OccupancyProjectionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    property_id: str
    date_from: str
    date_to: str
    days: list[OccupancyProjectionDayOut]
    alerts: list[LowOccupancyPeriodAlertOut]
