from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_active_hotels_use_case,
    get_add_property_image_use_case,
    get_db_session,
    get_delete_property_image_use_case,
    get_hotel_profile_use_case,
    get_list_admin_properties_use_case,
    get_set_primary_property_image_use_case,
    get_update_hotel_profile_use_case,
    require_admin_role,
    resolve_admin_property_hotel_id,
)
from app.application.use_cases.add_property_image import AddPropertyImageUseCase
from app.application.use_cases.delete_property_image import DeletePropertyImageUseCase
from app.application.use_cases.get_active_hotels import GetActiveHotelsUseCase
from app.application.use_cases.get_hotel_profile import GetHotelProfileUseCase
from app.application.use_cases.list_admin_properties import ListAdminPropertiesUseCase
from app.application.use_cases.set_primary_property_image import SetPrimaryPropertyImageUseCase
from app.application.use_cases.update_hotel_profile import UpdateHotelProfileUseCase
from app.schemas.common import PaginatedResponse
from app.schemas.manager import (
    AddPropertyImageIn,
    HotelProfileOut,
    ManagerHotelItem,
    ManagerPropertyImageOut,
    UpdateHotelProfileIn,
)
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


@router.get(
    "/admin/properties",
    response_model=PaginatedResponse[ManagerHotelItem],
    dependencies=[Depends(require_admin_role)],
)
async def list_admin_properties(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    use_case: ListAdminPropertiesUseCase = Depends(get_list_admin_properties_use_case),
):
    return await use_case.execute(page=page, page_size=page_size)


@router.get("/admin/properties/{property_id}/profile", response_model=HotelProfileOut)
async def admin_get_hotel_profile(
    property_id: UUID,
    hotel_id: UUID = Depends(resolve_admin_property_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: GetHotelProfileUseCase = get_hotel_profile_use_case(session)
    return await use_case.execute(property_id=property_id, hotel_id=hotel_id)


@router.patch("/admin/properties/{property_id}/profile", response_model=HotelProfileOut)
async def admin_update_hotel_profile(
    property_id: UUID,
    body: UpdateHotelProfileIn,
    hotel_id: UUID = Depends(resolve_admin_property_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: UpdateHotelProfileUseCase = get_update_hotel_profile_use_case(session)
    return await use_case.execute(property_id=property_id, hotel_id=hotel_id, data=body)


@router.post(
    "/admin/properties/{property_id}/images",
    response_model=ManagerPropertyImageOut,
    status_code=201,
)
async def admin_add_property_image(
    property_id: UUID,
    body: AddPropertyImageIn,
    hotel_id: UUID = Depends(resolve_admin_property_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: AddPropertyImageUseCase = get_add_property_image_use_case(session)
    return await use_case.execute(property_id=property_id, hotel_id=hotel_id, data=body)


@router.delete("/admin/properties/{property_id}/images/{image_id}", status_code=204)
async def admin_delete_property_image(
    property_id: UUID,
    image_id: UUID,
    hotel_id: UUID = Depends(resolve_admin_property_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: DeletePropertyImageUseCase = get_delete_property_image_use_case(session)
    await use_case.execute(property_id=property_id, hotel_id=hotel_id, image_id=image_id)


@router.patch(
    "/admin/properties/{property_id}/images/{image_id}/primary",
    response_model=list[ManagerPropertyImageOut],
)
async def admin_set_primary_property_image(
    property_id: UUID,
    image_id: UUID,
    hotel_id: UUID = Depends(resolve_admin_property_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: SetPrimaryPropertyImageUseCase = get_set_primary_property_image_use_case(session)
    return await use_case.execute(property_id=property_id, hotel_id=hotel_id, image_id=image_id)
