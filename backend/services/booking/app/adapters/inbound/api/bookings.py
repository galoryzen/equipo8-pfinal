from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_create_cart_booking_use_case,
    get_current_user_id,
    get_held_rooms_use_case,
    get_list_my_bookings_use_case,
)
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.get_held_rooms import GetHeldRoomsUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.schemas.booking import (
    BookingDetailOut,
    BookingListItemOut,
    CartBookingOut,
    CreateCartBookingIn,
    HeldRoomsOut,
)

router = APIRouter()


@router.get("/rooms/held", response_model=HeldRoomsOut)
async def get_held_rooms(
    property_id: UUID,
    checkin: date,
    checkout: date,
    use_case: GetHeldRoomsUseCase = Depends(get_held_rooms_use_case),
):
    return await use_case.execute(property_id=property_id, checkin=checkin, checkout=checkout)


@router.post("/bookings", response_model=CartBookingOut, status_code=201)
async def create_cart_booking(
    body: CreateCartBookingIn,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CreateCartBookingUseCase = Depends(get_create_cart_booking_use_case),
):
    return await use_case.execute(user_id=user_id, payload=body)


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
