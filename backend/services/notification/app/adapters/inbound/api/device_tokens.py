from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.adapters.inbound.api.dependencies import (
    get_current_user_id,
    get_delete_device_token_use_case,
    get_register_device_token_use_case,
    get_send_test_push_use_case,
)
from app.application.use_cases.delete_device_token import DeleteDeviceTokenUseCase
from app.application.use_cases.register_device_token import RegisterDeviceTokenUseCase
from app.application.use_cases.send_test_push import SendTestPushNotificationUseCase
from app.config import settings
from app.domain.models import DevicePlatform
from app.schemas.device_tokens import (
    RegisterDeviceTokenRequest,
    RegisterDeviceTokenResponse,
    SendTestPushRequest,
    SendTestPushResponse,
)

router = APIRouter()


@router.post(
    "/device-tokens",
    response_model=RegisterDeviceTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_device_token(
    payload: RegisterDeviceTokenRequest,
    user_id: UUID = Depends(get_current_user_id),
    use_case: RegisterDeviceTokenUseCase = Depends(get_register_device_token_use_case),
) -> RegisterDeviceTokenResponse:
    row = await use_case.execute(
        user_id=user_id,
        platform=DevicePlatform(payload.platform),
        token=payload.token,
    )
    return RegisterDeviceTokenResponse(
        id=row.id,
        user_id=row.user_id,
        platform=row.platform,
        token=row.token,
        is_active=row.is_active,
    )


@router.delete("/device-tokens/{token:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device_token(
    token: str,
    _user_id: UUID = Depends(get_current_user_id),
    use_case: DeleteDeviceTokenUseCase = Depends(get_delete_device_token_use_case),
) -> None:
    await use_case.execute(token=token)


@router.post("/test", response_model=SendTestPushResponse)
async def send_test_push(
    payload: SendTestPushRequest,
    user_id: UUID = Depends(get_current_user_id),
    use_case: SendTestPushNotificationUseCase = Depends(get_send_test_push_use_case),
) -> SendTestPushResponse:
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")
    message_ids = await use_case.execute(user_id=user_id, title=payload.title, body=payload.body)
    return SendTestPushResponse(status="sent", message_ids=message_ids)
