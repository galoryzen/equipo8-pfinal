from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterDeviceTokenRequest(BaseModel):
    platform: Literal["IOS", "ANDROID", "WEB"]
    token: str = Field(min_length=1, max_length=2048)


class RegisterDeviceTokenResponse(BaseModel):
    id: UUID
    user_id: UUID
    platform: str
    token: str
    is_active: bool


class SendTestPushRequest(BaseModel):
    title: str = Field(default="TravelHub", max_length=120)
    body: str = Field(min_length=1, max_length=240)


class SendTestPushResponse(BaseModel):
    status: Literal["sent"]
    message_ids: list[str]
