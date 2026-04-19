from uuid import UUID

from fastapi import APIRouter, Depends, Header, status

from app.adapters.inbound.api.dependencies import (
    get_authorization_header,
    get_confirm_payment_intent_use_case,
    get_create_payment_intent_use_case,
    get_current_user_id,
    get_process_mock_webhook_use_case,
)
from app.application.use_cases.confirm_payment_intent import ConfirmPaymentIntentUseCase
from app.application.use_cases.create_payment_intent import CreatePaymentIntentUseCase
from app.application.use_cases.process_mock_webhook import ProcessMockWebhookUseCase
from app.schemas.payment import (
    ConfirmPaymentIn,
    ConfirmPaymentOut,
    CreatePaymentIntentIn,
    MockWebhookIn,
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


@router.post("/payment-intents/{payment_intent_id}/confirm", response_model=ConfirmPaymentOut)
async def confirm_payment_intent(
    payment_intent_id: UUID,
    body: ConfirmPaymentIn,
    user_id: UUID = Depends(get_current_user_id),
    use_case: ConfirmPaymentIntentUseCase = Depends(get_confirm_payment_intent_use_case),
):
    return await use_case.execute(
        payment_intent_id=payment_intent_id,
        user_id=user_id,
        payment_token=body.payment_token,
    )


@router.post("/webhooks/mock")
async def mock_payment_webhook(
    body: MockWebhookIn,
    use_case: ProcessMockWebhookUseCase = Depends(get_process_mock_webhook_use_case),
):
    await use_case.execute(
        payment_intent_id=body.payment_intent_id,
        idempotency_key=body.idempotency_key,
        webhook_signing_secret=body.webhook_signing_secret,
        want_success=body.status == "succeeded",
    )
    return {"status": "processed"}
