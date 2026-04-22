from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_cancel_cart_booking_use_case,
    get_confirm_booking_use_case,
    get_create_cart_booking_use_case,
    get_current_user_id,
    get_current_user_info,
    get_list_booking_guests_use_case,
    get_list_my_bookings_use_case,
    get_reject_booking_use_case,
    get_save_booking_guests_use_case,
)
from app.application.use_cases.cancel_cart_booking import CancelCartBookingUseCase
from app.application.use_cases.confirm_booking import ConfirmBookingUseCase
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_booking_guests import ListBookingGuestsUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.application.use_cases.reject_booking import RejectBookingUseCase
from app.application.use_cases.save_booking_guests import SaveBookingGuestsUseCase
from app.domain.models import BookingScope
from app.schemas.booking import (
    BookingDetailOut,
    BookingListItemOut,
    CartBookingOut,
    CreateCartBookingIn,
    GuestOut,
    PaginatedBookingListOut,
    SaveGuestsIn,
)

router = APIRouter()


@router.post("/bookings", response_model=CartBookingOut, status_code=201)
async def create_cart_booking(
    body: CreateCartBookingIn,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CreateCartBookingUseCase = Depends(get_create_cart_booking_use_case),
):
    return await use_case.execute(user_id=user_id, payload=body)


@router.get("/bookings", response_model=PaginatedBookingListOut)
async def list_bookings(
    scope: BookingScope = BookingScope.ALL,
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user_info: dict = Depends(get_current_user_info),
    use_case: ListMyBookingsUseCase = Depends(get_list_my_bookings_use_case),
):
    role = user_info.get("role")
    user_id = user_info.get("user_id")
    if role == "ADMIN":
        return await use_case.execute_admin(status=status, page=page, page_size=page_size)
    elif role in ("HOTEL", "MANAGER"):
        return await use_case.execute_hotel(user_id=user_id, status=status, page=page, page_size=page_size)
    else:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id es requerido")
        return await use_case.execute(user_id=UUID(user_id), scope=scope, page=page, page_size=page_size)


@router.get("/bookings/{booking_id}", response_model=BookingDetailOut)
async def get_booking_detail(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: GetBookingDetailUseCase = Depends(get_booking_detail_use_case),
):
    return await use_case.execute(booking_id=booking_id, user_id=user_id)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingDetailOut)
async def cancel_cart_booking(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CancelCartBookingUseCase = Depends(get_cancel_cart_booking_use_case),
):
    return await use_case.execute(booking_id=booking_id, user_id=user_id)


@router.patch("/bookings/{booking_id}/confirm", response_model=BookingDetailOut)
async def confirm_booking(
    booking_id: UUID,
    user_info: dict = Depends(get_current_user_info),
    use_case: ConfirmBookingUseCase = Depends(get_confirm_booking_use_case),
):
    role = user_info.get("role")
    try:
        if role in ("ADMIN", "HOTEL", "MANAGER"):
            return await use_case.execute(booking_id=booking_id, user_id=None)
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para confirmar esta reserva.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.patch("/bookings/{booking_id}/reject", response_model=BookingDetailOut)
async def reject_booking(
    booking_id: UUID,
    user_info: dict = Depends(get_current_user_info),
    use_case: RejectBookingUseCase = Depends(get_reject_booking_use_case),
):
    role = user_info.get("role")
    if role not in ("ADMIN", "HOTEL", "MANAGER"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para rechazar esta reserva.")
    try:
        return await use_case.execute(booking_id=booking_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.put("/bookings/{booking_id}/guests", response_model=list[GuestOut])
async def save_booking_guests(
    booking_id: UUID,
    body: SaveGuestsIn,
    user_id: UUID = Depends(get_current_user_id),
    use_case: SaveBookingGuestsUseCase = Depends(get_save_booking_guests_use_case),
):
    return await use_case.execute(booking_id=booking_id, user_id=user_id, payload=body)


@router.get("/bookings/{booking_id}/guests", response_model=list[GuestOut])
async def list_booking_guests(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: ListBookingGuestsUseCase = Depends(get_list_booking_guests_use_case),
):
    return await use_case.execute(booking_id=booking_id, user_id=user_id)
