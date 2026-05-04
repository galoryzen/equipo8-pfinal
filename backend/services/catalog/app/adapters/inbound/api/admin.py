from fastapi import APIRouter, Depends, Query

from app.adapters.inbound.api.dependencies import (
    get_active_hotels_use_case,
    get_list_admin_properties_use_case,
    require_admin_role,
)
from app.application.use_cases.get_active_hotels import GetActiveHotelsUseCase
from app.application.use_cases.list_admin_properties import ListAdminPropertiesUseCase
from app.schemas.common import PaginatedResponse
from app.schemas.manager import ManagerHotelItem
from app.schemas.property import ActiveHotelItem

router = APIRouter()


@router.get(
    "/admin/hotels/active",
    response_model=list[ActiveHotelItem],
    dependencies=[Depends(require_admin_role)],
)
async def get_active_hotels(
    use_case: GetActiveHotelsUseCase = Depends(get_active_hotels_use_case),
):
    """Get all active hotels with name and UUID for admin users."""
    return await use_case.execute()


@router.get("/admin/properties", response_model=PaginatedResponse[ManagerHotelItem], dependencies=[Depends(require_admin_role)])
async def list_admin_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    use_case: ListAdminPropertiesUseCase = Depends(get_list_admin_properties_use_case),
):
    return await use_case.execute(page=page, page_size=page_size)

