from uuid import UUID

from fastapi import APIRouter, Depends, Header, status

from app.adapters.inbound.api.dependencies import (
    get_authorization_header,
    get_create_payment_intent_use_case,
    get_current_user_id,
)
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from app.schemas.payment import (
    CreatePaymentIntentIn,
    PaymentIntentCreatedOut,
)

router = APIRouter()


@router.post("/payment-intents", response_model=PaymentIntentCreatedOut, status_code=status.HTTP_201_CREATED)
async def create_payment_intent(
    body: CreatePaymentIntentIn,
    user_id: UUID = Depends(get_current_user_id),
    authorization: str = Depends(get_authorization_header),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    use_case: CreatePaymentIntentUseCase = Depends(get_create_payment_intent_use_case),
):
    return await use_case.execute(
        booking_id=body.booking_id,
        user_id=user_id,
        authorization_header_value=authorization,
        idempotency_key=idempotency_key,
    )
