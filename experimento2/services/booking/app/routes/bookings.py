import logging
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, HTTPException

from .. import catalog_client
from ..database import async_session
from ..models import Booking, BookingItem
from ..schemas import CheckoutStartRequest, CheckoutStartResponse

HOLD_MINUTES = 15

router = APIRouter(prefix="/api/bookings", tags=["bookings"])
logger = logging.getLogger("booking.routes")


@router.post("/checkout-start", response_model=CheckoutStartResponse, status_code=201)
async def checkout_start(req: CheckoutStartRequest):
    # 1. Call Catalog Service to create hold (synchronous HTTP)
    try:
        hold = await catalog_client.create_hold(
            room_type_id=req.room_type_id,
            checkin=req.checkin,
            checkout=req.checkout,
            quantity=req.quantity,
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:
            detail = e.response.json().get("detail", "No inventory available")
            raise HTTPException(status_code=409, detail=detail)
        logger.error("catalog_error status=%d", e.response.status_code)
        raise HTTPException(status_code=502, detail="Catalog service error")
    except httpx.TimeoutException:
        logger.error("catalog_timeout")
        raise HTTPException(status_code=504, detail="Catalog service timeout")
    except httpx.RequestError as e:
        logger.error("catalog_request_error error=%s", str(e))
        raise HTTPException(status_code=502, detail="Catalog service unavailable")

    # 2. Create booking (status=CART) + booking_item
    #    Booking owns the hold: hold_expires_at = now + 15 min
    total_amount = hold["total_amount"]
    currency_code = hold["currency_code"]
    hold_expires_at = datetime.utcnow() + timedelta(minutes=HOLD_MINUTES)
    num_nights = (req.checkout - req.checkin).days
    unit_price = total_amount / num_nights if num_nights > 0 else total_amount

    async with async_session() as session:
        async with session.begin():
            booking = Booking(
                user_id=req.user_id,
                status="CART",
                checkin=req.checkin,
                checkout=req.checkout,
                hold_expires_at=hold_expires_at,
                total_amount=total_amount,
                currency_code=currency_code,
            )
            session.add(booking)
            await session.flush()

            item = BookingItem(
                booking_id=booking.id,
                property_id=req.property_id,
                room_type_id=req.room_type_id,
                rate_plan_id=req.rate_plan_id,
                quantity=req.quantity,
                unit_price=unit_price,
                subtotal=total_amount,
            )
            session.add(item)

    logger.info(
        "checkout_started booking_id=%s total=%.2f hold_expires=%s",
        booking.id,
        total_amount,
        hold_expires_at.isoformat(),
    )

    return CheckoutStartResponse(
        booking_id=booking.id,
        status=booking.status,
        hold_expires_at=hold_expires_at,
        total_amount=total_amount,
        currency_code=currency_code,
    )
