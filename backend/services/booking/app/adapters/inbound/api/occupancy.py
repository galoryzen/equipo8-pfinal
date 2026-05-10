from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters.inbound.api.dependencies import (
    get_current_user_info,
    get_occupancy_calendar_use_case,
    get_occupancy_daily_breakdown_use_case,
    get_occupancy_projection_use_case,
)
from app.application.use_cases.get_occupancy_calendar import GetOccupancyCalendarUseCase
from app.application.use_cases.get_occupancy_daily_breakdown import (
    GetOccupancyDailyBreakdownUseCase,
)
from app.application.use_cases.get_occupancy_projection import GetOccupancyProjectionUseCase
from app.schemas.occupancy import (
    OccupancyCalendarResponse,
    OccupancyDailyBreakdownResponse,
    OccupancyProjectionResponse,
)

router = APIRouter(prefix="/occupancy", tags=["occupancy"])


def _resolve_hotel_id(user_info: dict) -> UUID:
    if not user_info.get("user_id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_id es requerido")
    role = user_info.get("role")
    if role not in ("HOTEL", "MANAGER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo personal del hotel puede consultar ocupación.",
        )
    raw = user_info.get("hotel_id")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hotel_id es requerido para este rol",
        )
    try:
        return UUID(str(raw))
    except (TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hotel_id inválido",
        ) from e


@router.get("/calendar", response_model=OccupancyCalendarResponse)
async def get_occupancy_calendar(
    date_from: date = Query(..., description="Start date (inclusive)"),
    date_to: date = Query(..., description="End date (inclusive)"),
    property_id: UUID | None = Query(None),
    room_type_id: UUID | None = Query(None),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetOccupancyCalendarUseCase = Depends(get_occupancy_calendar_use_case),
):
    hotel_id = _resolve_hotel_id(user_info)
    try:
        payload = await use_case.execute(
            hotel_id=hotel_id,
            date_from=date_from,
            date_to=date_to,
            property_id=property_id,
            room_type_id=room_type_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    return OccupancyCalendarResponse.model_validate(payload)


@router.get("/daily-breakdown", response_model=OccupancyDailyBreakdownResponse)
async def get_occupancy_daily_breakdown(
    property_id: UUID = Query(...),
    date: date = Query(...),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetOccupancyDailyBreakdownUseCase = Depends(
        get_occupancy_daily_breakdown_use_case
    ),
):
    hotel_id = _resolve_hotel_id(user_info)
    try:
        payload = await use_case.execute(hotel_id=hotel_id, property_id=property_id, day=date)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    return OccupancyDailyBreakdownResponse.model_validate(payload)


@router.get("/projection", response_model=OccupancyProjectionResponse)
async def get_occupancy_projection(
    property_id: UUID | None = Query(None),
    days: int = Query(90, ge=1, le=90),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetOccupancyProjectionUseCase = Depends(get_occupancy_projection_use_case),
):
    hotel_id = _resolve_hotel_id(user_info)
    try:
        payload = await use_case.execute(hotel_id=hotel_id, property_id=property_id, days=days)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    return OccupancyProjectionResponse.model_validate(payload)
