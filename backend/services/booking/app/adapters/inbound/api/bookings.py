from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.adapters.inbound.api.dependencies import (
    get_booking_detail_use_case,
    get_cancel_cart_booking_use_case,
    get_confirm_booking_use_case,
    get_create_cart_booking_use_case,
    get_current_user_id,
    get_list_my_bookings_use_case,
    get_current_user_info,
)
from app.application.use_cases.cancel_cart_booking import CancelCartBookingUseCase
from app.application.use_cases.confirm_booking import ConfirmBookingUseCase
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.domain.models import BookingScope
from app.schemas.booking import (
    BookingDetailOut,
    BookingListItemOut,
    CartBookingOut,
    CreateCartBookingIn,
)

router = APIRouter()


@router.post("/bookings", response_model=CartBookingOut, status_code=201)
async def create_cart_booking(
    body: CreateCartBookingIn,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CreateCartBookingUseCase = Depends(get_create_cart_booking_use_case),
):
    return await use_case.execute(user_id=user_id, payload=body)



from fastapi import Query

@router.get("/bookings", response_model=list[BookingListItemOut])
async def list_bookings(
    scope: BookingScope = BookingScope.ALL,
    status: str | None = Query(None),
    hotel_id: UUID | None = Query(None),
    user_info: dict = Depends(get_current_user_info),
    use_case: ListMyBookingsUseCase = Depends(get_list_my_bookings_use_case),
):
    """
    Si es ADMIN: solo filtra por status.
    Si es MANAGER/HOTEL: filtra por status y hotel_id.
    """
    role = user_info.get("role")
    user_id = user_info.get("user_id")
    if role == "ADMIN":
        return await use_case.execute_admin(status=status)
    elif role in ("HOTEL", "MANAGER"):
        if not hotel_id:
            raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
        return await use_case.execute_hotel(hotel_id=hotel_id, status=status)
    else:
        # Default: solo ve sus propias reservas
        return await use_case.execute(user_id=user_id, status=status, scope=scope)


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
    user_id = user_info.get("user_id")
    try:
        if role in ("ADMIN", "HOTEL", "MANAGER"):
            # Permitir confirmar cualquier reserva
            return await use_case.execute(booking_id=booking_id, user_id=None)
        else:
            # Solo puede confirmar su propia reserva (opcional, o puedes bloquearlo)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para confirmar esta reserva.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
