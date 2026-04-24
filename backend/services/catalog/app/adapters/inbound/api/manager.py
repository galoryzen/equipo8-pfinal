from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_booking_property_stats,
    get_create_promotion_use_case,
    get_db_session,
    get_delete_promotion_use_case,
    get_hotel_metrics_use_case,
    get_list_manager_hotels_use_case,
    get_list_room_types_availability_use_case,
    get_manager_hotel_id,
    get_rate_plan_cancellation_policy_use_case,
    get_room_type_promotion_use_case,
    get_update_cancellation_policy_use_case,
)
from app.application.use_cases.create_promotion import CreatePromotionUseCase
from app.application.use_cases.delete_promotion import DeletePromotionUseCase
from app.application.use_cases.get_rate_plan_cancellation_policy import GetRatePlanCancellationPolicyUseCase
from app.application.use_cases.get_room_type_promotion import GetRoomTypePromotionUseCase
from app.application.use_cases.list_manager_hotels import ListManagerHotelsUseCase
from app.application.use_cases.list_room_types_availability import ListRoomTypesAvailabilityUseCase
from app.application.use_cases.update_rate_plan_cancellation_policy import UpdateRatePlanCancellationPolicyUseCase
from app.schemas.manager import (
    CreatePromotionIn,
    HotelStatsOut,
    ManagerHotelListOut,
    PromotionCreatedOut,
    RatePlanCancellationPolicyOut,
    RoomTypeManagerListOut,
    RoomTypePromotionOut,
    UpdateCancellationPolicyIn,
)

router = APIRouter()


@router.get("/manager/hotels", response_model=ManagerHotelListOut)
async def list_manager_hotels(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: ListManagerHotelsUseCase = get_list_manager_hotels_use_case(session)
    return await use_case.execute(hotel_id=hotel_id, page=page, page_size=page_size)


@router.get("/manager/hotels/{property_id}/metrics", response_model=HotelStatsOut)
async def get_hotel_metrics(
    property_id: UUID,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    booking_stats = await get_booking_property_stats(property_id=property_id)
    use_case = get_hotel_metrics_use_case(session=session, booking_stats=booking_stats)
    return await use_case.execute(property_id=property_id)


@router.get("/manager/hotels/{property_id}/room-types", response_model=RoomTypeManagerListOut)
async def list_room_types(
    property_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: ListRoomTypesAvailabilityUseCase = get_list_room_types_availability_use_case(session)
    return await use_case.execute(property_id=property_id, page=page, page_size=page_size)


@router.post("/manager/hotels/{property_id}/promotions", response_model=PromotionCreatedOut, status_code=201)
async def create_promotion(
    property_id: UUID,
    body: CreatePromotionIn,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: CreatePromotionUseCase = get_create_promotion_use_case(session)
    return await use_case.execute(property_id=property_id, data=body)


@router.get(
    "/manager/room-types/{room_type_id}/promotion",
    response_model=RoomTypePromotionOut | None,
)
async def get_room_type_promotion(
    room_type_id: UUID,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: GetRoomTypePromotionUseCase = get_room_type_promotion_use_case(session)
    return await use_case.execute(room_type_id=room_type_id)


@router.delete("/manager/promotions/{promotion_id}", status_code=204)
async def delete_promotion(
    promotion_id: UUID,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: DeletePromotionUseCase = get_delete_promotion_use_case(session)
    await use_case.execute(promotion_id=promotion_id)


@router.get(
    "/manager/rate-plans/{rate_plan_id}/cancellation-policy",
    response_model=RatePlanCancellationPolicyOut | None,
)
async def get_rate_plan_cancellation_policy(
    rate_plan_id: UUID,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: GetRatePlanCancellationPolicyUseCase = get_rate_plan_cancellation_policy_use_case(session)
    return await use_case.execute(rate_plan_id=rate_plan_id)


@router.patch(
    "/manager/rate-plans/{rate_plan_id}/cancellation-policy",
    response_model=RatePlanCancellationPolicyOut,
)
async def update_rate_plan_cancellation_policy(
    rate_plan_id: UUID,
    body: UpdateCancellationPolicyIn,
    hotel_id: UUID = Depends(get_manager_hotel_id),
    session: AsyncSession = Depends(get_db_session),
):
    use_case: UpdateRatePlanCancellationPolicyUseCase = get_update_cancellation_policy_use_case(session)
    return await use_case.execute(rate_plan_id=rate_plan_id, data=body)
