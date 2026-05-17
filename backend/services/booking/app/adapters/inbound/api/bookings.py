from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.adapters.inbound.api.dependencies import (
    get_abandon_cart_booking_use_case,
    get_booking_detail_use_case,
    get_cancel_booking_use_case,
    get_checkout_booking_use_case,
    get_confirm_booking_use_case,
    get_create_cart_booking_use_case,
    get_current_user_id,
    get_current_user_info,
    get_list_booking_guests_use_case,
    get_list_my_bookings_use_case,
    get_register_guest_check_in_use_case,
    get_register_guest_check_out_use_case,
    get_my_active_cart_use_case,
    get_reject_booking_use_case,
    get_save_booking_guests_use_case,
)
from app.application.use_cases.abandon_cart_booking import AbandonCartBookingUseCase
from app.application.use_cases.cancel_booking import CancelBookingUseCase
from app.application.use_cases.checkout_booking import CheckoutBookingUseCase
from app.application.use_cases.confirm_booking import ConfirmBookingUseCase
from app.application.use_cases.create_cart_booking import CreateCartBookingUseCase
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.application.use_cases.get_my_active_cart import GetMyActiveCartUseCase
from app.application.use_cases.list_booking_guests import ListBookingGuestsUseCase
from app.application.use_cases.list_my_bookings import ListMyBookingsUseCase
from app.application.use_cases.reject_booking import RejectBookingUseCase
from app.application.use_cases.register_guest_check_in import RegisterGuestCheckInUseCase
from app.application.use_cases.register_guest_check_out import RegisterGuestCheckOutUseCase
from app.application.use_cases.save_booking_guests import SaveBookingGuestsUseCase
from app.domain.models import BookingScope, BookingStatus
from app.schemas.booking import (
    BookingDetailOut,
    CartBookingOut,
    CheckoutBookingIn,
    CreateCartBookingIn,
    GuestOut,
    PaginatedBookingListOut,
    RegisterGuestCheckInIn,
    RegisterGuestCheckOutIn,
    RejectBookingIn,
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
    booking_status: BookingStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    room_type_id: UUID | None = Query(None),
    q: str | None = Query(None, max_length=200),
    user_info: dict = Depends(get_current_user_info),
    use_case: ListMyBookingsUseCase = Depends(get_list_my_bookings_use_case),
):
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be on or before date_to")
    role = user_info.get("role")
    user_id = user_info.get("user_id")
    q_trim = q.strip() if q else None
    if role == "ADMIN":
        return await use_case.execute_admin(
            status=booking_status,
            date_from=date_from,
            date_to=date_to,
            room_type_id=room_type_id,
            q=q_trim,
            page=page,
            page_size=page_size,
        )
    elif role in ("HOTEL", "MANAGER"):
        hotel_id_str = user_info.get("hotel_id")
        if not hotel_id_str:
            raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
        return await use_case.execute_hotel(
            UUID(hotel_id_str),
            status=booking_status,
            date_from=date_from,
            date_to=date_to,
            room_type_id=room_type_id,
            q=q_trim,
            page=page,
            page_size=page_size,
        )
    else:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id es requerido")
        return await use_case.execute(
            user_id=UUID(user_id), scope=scope, status=booking_status, page=page, page_size=page_size
        )


@router.get("/bookings/export")
async def export_hotel_bookings_csv(
    booking_status: BookingStatus | None = Query(None, alias="status"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    room_type_id: UUID | None = Query(None),
    q: str | None = Query(None, max_length=200),
    user_info: dict = Depends(get_current_user_info),
    use_case: ListMyBookingsUseCase = Depends(get_list_my_bookings_use_case),
):
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be on or before date_to")
    role = user_info.get("role")
    if role not in ("HOTEL", "MANAGER"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el hotel puede exportar el historial de reservas.",
        )
    hotel_id_str = user_info.get("hotel_id")
    if not hotel_id_str:
        raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
    q_trim = q.strip() if q else None
    payload = await use_case.execute_hotel_export_csv(
        UUID(hotel_id_str),
        status=booking_status,
        date_from=date_from,
        date_to=date_to,
        room_type_id=room_type_id,
        q=q_trim,
    )
    return Response(
        content=payload,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="travelhub-bookings-history.csv"',
        },
    )


@router.get("/bookings/my-cart", response_model=BookingDetailOut | None)
async def get_my_active_cart(
    user_id: UUID = Depends(get_current_user_id),
    use_case: GetMyActiveCartUseCase = Depends(get_my_active_cart_use_case),
):
    """Return the user's active CART booking, or null if none.

    Carts are not part of the trip listing; clients use this dedicated endpoint
    to rescue an in-progress cart (e.g. mobile after re-install or cross-device).
    """
    return await use_case.execute(user_id=user_id)


@router.get("/bookings/{booking_id}", response_model=BookingDetailOut)
async def get_booking_detail(
    booking_id: UUID,
    user_info: dict = Depends(get_current_user_info),
    use_case: GetBookingDetailUseCase = Depends(get_booking_detail_use_case),
):
    user_id = UUID(user_info["user_id"])
    role = user_info.get("role")
    hotel_id_str = user_info.get("hotel_id")
    if role in ("HOTEL", "MANAGER"):
        if not hotel_id_str:
            raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
        return await use_case.execute(
            booking_id=booking_id,
            user_id=user_id,
            viewer_role=role,
            hotel_id=UUID(hotel_id_str),
        )
    return await use_case.execute(booking_id=booking_id, user_id=user_id)


@router.post("/bookings/{booking_id}/check-in", response_model=BookingDetailOut)
async def register_guest_check_in(
    booking_id: UUID,
    body: RegisterGuestCheckInIn,
    user_info: dict = Depends(get_current_user_info),
    use_case: RegisterGuestCheckInUseCase = Depends(get_register_guest_check_in_use_case),
):
    role = user_info.get("role")
    if role not in ("HOTEL", "MANAGER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo personal del hotel o administradores pueden registrar check-in.",
        )
    if role == "ADMIN":
        hotel_uuid: UUID | None = None
    else:
        hotel_id_str = user_info.get("hotel_id")
        if not hotel_id_str:
            raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
        hotel_uuid = UUID(hotel_id_str)
    user_id = UUID(user_info["user_id"])
    return await use_case.execute(
        booking_id=booking_id,
        hotel_id=hotel_uuid,
        actor_user_id=user_id,
        actual_arrival_at=body.actual_arrival_at,
    )


@router.post("/bookings/{booking_id}/check-out", response_model=BookingDetailOut)
async def register_guest_check_out(
    booking_id: UUID,
    body: RegisterGuestCheckOutIn,
    user_info: dict = Depends(get_current_user_info),
    use_case: RegisterGuestCheckOutUseCase = Depends(get_register_guest_check_out_use_case),
):
    role = user_info.get("role")
    if role not in ("HOTEL", "MANAGER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo personal del hotel o administradores pueden registrar check-out.",
        )
    if role == "ADMIN":
        hotel_uuid: UUID | None = None
    else:
        hotel_id_str = user_info.get("hotel_id")
        if not hotel_id_str:
            raise HTTPException(status_code=400, detail="hotel_id es requerido para este rol")
        hotel_uuid = UUID(hotel_id_str)
    user_id = UUID(user_info["user_id"])
    return await use_case.execute(
        booking_id=booking_id,
        hotel_id=hotel_uuid,
        actor_user_id=user_id,
        actual_departure_at=body.actual_departure_at,
    )


@router.post("/bookings/{booking_id}/cancel", response_model=BookingDetailOut)
async def cancel_booking(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CancelBookingUseCase = Depends(get_cancel_booking_use_case),
):
    """Cancel a CONFIRMED booking. Triggers async refund. Policy-gated."""
    return await use_case.execute(booking_id=booking_id, user_id=user_id)


@router.post("/bookings/{booking_id}/abandon-cart", response_model=BookingDetailOut)
async def abandon_cart_booking(
    booking_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    use_case: AbandonCartBookingUseCase = Depends(get_abandon_cart_booking_use_case),
):
    """Abandon a CART booking. CART → EXPIRED, no refund event."""
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
    body: RejectBookingIn | None = None,
    user_info: dict = Depends(get_current_user_info),
    use_case: RejectBookingUseCase = Depends(get_reject_booking_use_case),
):
    role = user_info.get("role")
    if role not in ("ADMIN", "HOTEL", "MANAGER"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para rechazar esta reserva.")
    try:
        reason = body.reason if body is not None else None
        return await use_case.execute(booking_id=booking_id, reason=reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/bookings/{booking_id}/checkout",
    response_model=BookingDetailOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def checkout_booking(
    booking_id: UUID,
    body: CheckoutBookingIn | None = None,
    user_id: UUID = Depends(get_current_user_id),
    use_case: CheckoutBookingUseCase = Depends(get_checkout_booking_use_case),
):
    force_decline = body.force_decline if body is not None else False
    return await use_case.execute(
        booking_id=booking_id, user_id=user_id, force_decline=force_decline
    )


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
