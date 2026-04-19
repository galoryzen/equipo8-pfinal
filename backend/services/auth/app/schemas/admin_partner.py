import re
import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AdminPartnerRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    country_code: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)
    organization_type: Literal["HOTEL", "AGENCY"]
    organization_id: uuid.UUID

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid email address")
        return v.strip()

    @field_validator("first_name", "last_name", "phone", "country_code")
    @classmethod
    def strip_required(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be empty")
        return s
