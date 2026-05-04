from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.adapters.inbound.api.dependencies import (
    get_list_admin_properties_use_case,
    require_admin_role,
)
from app.application.use_cases.list_admin_properties import ListAdminPropertiesUseCase
from app.schemas.common import PaginatedResponse
from app.schemas.manager import ManagerHotelItem

router = APIRouter()


@router.get("/admin/properties", response_model=PaginatedResponse[ManagerHotelItem], dependencies=[Depends(require_admin_role)])
async def list_admin_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    use_case: ListAdminPropertiesUseCase = Depends(get_list_admin_properties_use_case),
):
    return await use_case.execute(page=page, page_size=page_size)

