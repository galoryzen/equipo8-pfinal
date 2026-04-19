import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status

from app.adapters.inbound.api.dependencies import get_confirm_booking_after_payment_use_case
from app.application.use_cases.confirm_booking_after_payment import ConfirmBookingAfterPaymentUseCase
from app.config import settings
from app.schemas.internal import ConfirmAfterPaymentIn

router = APIRouter()


def _verify_internal_key(x_internal_key: str | None = Header(default=None, alias="X-Internal-Payment-Key")):
    expected = settings.INTERNAL_PAYMENT_CALLBACK_KEY
    if not expected or x_internal_key is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Internal payment callback not configured")
    if not secrets.compare_digest(x_internal_key, expected):
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal key")


@router.post(
    "/internal/bookings/{booking_id}/confirm-after-payment",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_verify_internal_key)],
)
async def confirm_after_payment(
    booking_id: UUID,
    body: ConfirmAfterPaymentIn,
    use_case: ConfirmBookingAfterPaymentUseCase = Depends(get_confirm_booking_after_payment_use_case),
) -> None:
    await use_case.execute(booking_id=booking_id, payment_intent_id=body.payment_intent_id)
