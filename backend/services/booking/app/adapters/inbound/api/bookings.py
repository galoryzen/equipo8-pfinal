from uuid import UUID

from fastapi import APIRouter, Depends

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_current_user_id,
    get_list_my_bookings_use_case,
)
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.schemas.booking import BookingDetailOut, BookingListItemOut

router = APIRouter()


@router.get("/bookings", response_model=list[BookingListItemOut])
async def list_my_bookings(
    user_id: UUID = Depends(get_current_user_id),
    use_case: ListMyBookingsUseCase = Depends(get_list_my_bookings_use_case),
):
    return await use_case.execute(user_id=user_id)


@router.get("/bookings/{booking_id}", response_model=BookingDetailOut)
async def get_booking_detail(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: GetBookingDetailUseCase = Depends(get_booking_detail_use_case),
):
    return await use_case.execute(booking_id=booking_id, user_id=user_id)
