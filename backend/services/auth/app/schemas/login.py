import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    country_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(..., description="The email address of the user", min_length=1, max_length=255)
    password: str = Field(..., description="The password of the user", min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        return v

class RegisterRequest(BaseModel):
    email: str = Field(..., description="The email address of the user", min_length=1, max_length=255)
    username: str = Field(..., description="The username of the user", min_length=1, max_length=255)
    phone: str = Field(..., description="The phone number of the user", min_length=1, max_length=255)
    country_code: str = Field(..., description="The country code of the user", min_length=1, max_length=255)
    password: str = Field(..., description="The password of the user", min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email address")
        return v
