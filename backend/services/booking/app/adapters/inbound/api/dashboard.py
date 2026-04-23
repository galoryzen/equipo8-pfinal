from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters.inbound.api.dependencies import (
    get_current_user_info,
    get_hotel_dashboard_metrics_use_case,
)
from app.application.hotel_partner import resolve_hotel_id_for_user
from app.application.use_cases.get_hotel_dashboard_metrics import GetHotelDashboardMetricsUseCase
from app.schemas.dashboard import DashboardMetricsResponse

router = APIRouter()


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    response_model_by_alias=True,
)
async def get_dashboard_metrics(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetHotelDashboardMetricsUseCase = Depends(get_hotel_dashboard_metrics_use_case),
):
    role = user_info.get("role")
    uid = user_info.get("user_id")
    if not uid:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    if role not in ("HOTEL", "MANAGER", "TRAVELER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para consultar métricas de hotel.",
        )

    # Viajeros solo si Auth expone hotel_id (tabla users.hotel_user); staff HOTEL/MANAGER sigue igual.
    if role == "TRAVELER":
        try:
            await resolve_hotel_id_for_user(UUID(uid))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Las métricas de hotel requieren una cuenta vinculada a un hotel.",
            ) from None

    try:
        payload = await use_case.execute(user_id=UUID(uid), date_from=date_from, date_to=date_to)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return DashboardMetricsResponse.model_validate(payload)
