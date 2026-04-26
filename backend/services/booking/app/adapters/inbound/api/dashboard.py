from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters.inbound.api.dependencies import (
    get_admin_hotel_revenue_report_use_case,
    get_current_user_info,
    get_hotel_dashboard_metrics_use_case,
    get_hotel_revenue_report_use_case,
)
from app.application.use_cases.get_admin_hotel_revenue_report import GetAdminHotelRevenueReportUseCase
from app.application.use_cases.get_hotel_dashboard_metrics import GetHotelDashboardMetricsUseCase
from app.application.use_cases.get_hotel_revenue_report import GetHotelRevenueReportUseCase
from app.schemas.dashboard import DashboardMetricsResponse
from app.schemas.revenue_report import RevenueReportResponse

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
    hotel_id: UUID | None = Query(..., alias="hotel_id"),
):
    role = user_info.get("role")
    uid = user_info.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="user_id es requerido")

    if role == "TRAVELER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para consultar métricas de hotel.",
        )

    if role == "ADMIN" and not hotel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hotel_id es requerido para este rol",
        )

    hotel_uuid = hotel_id if role == "ADMIN" else UUID(user_info.get("hotel_id"))

    if not hotel_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hotel_id es requerido",
        )

    try:
        payload = await use_case.execute(date_from=date_from, date_to=date_to, hotel_id=hotel_uuid)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return DashboardMetricsResponse.model_validate(payload)


@router.get(
    "/revenue-report",
    response_model=RevenueReportResponse,
    response_model_by_alias=True,
)
async def get_revenue_report(
    hotel_id: UUID = Query(..., alias="hotel_id"),
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetHotelRevenueReportUseCase = Depends(get_hotel_revenue_report_use_case),
):
    role = user_info.get("role")
    uid = user_info.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="user_id es requerido")

    if role not in ("HOTEL", "MANAGER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para generar reportes de hotel.",
        )

    try:
        payload = await use_case.execute(
            user_id=UUID(uid),
            hotel_id=hotel_id,
            date_from=date_from,
            date_to=date_to,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    return RevenueReportResponse.model_validate(payload)


@router.get(
    "/admin/revenue-report",
    response_model=RevenueReportResponse,
    response_model_by_alias=True,
)
async def get_admin_revenue_report(
    hotel_id: UUID = Query(..., alias="hotel_id"),
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    user_info: dict = Depends(get_current_user_info),
    use_case: GetAdminHotelRevenueReportUseCase = Depends(get_admin_hotel_revenue_report_use_case),
):
    role = user_info.get("role")
    uid = user_info.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="user_id es requerido")

    if role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para generar reportes de hotel.",
        )

    try:
        payload = await use_case.execute(hotel_id=hotel_id, date_from=date_from, date_to=date_to)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return RevenueReportResponse.model_validate(payload)
