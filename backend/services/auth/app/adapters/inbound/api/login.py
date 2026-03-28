import uuid
from datetime import UTC, datetime

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_check_user_exists_use_case,
    get_create_user_use_case,
    get_db_session,
    get_user_by_email_use_case,
)
from app.config import settings
from app.domain.models import User, UserRole
from app.schemas.login import LoginRequest, RegisterRequest
from app.utils.jwt import create_access_token

router = APIRouter()

@router.post("/login")
async def login(request: LoginRequest, response: Response, session: AsyncSession = Depends(get_db_session)):
    user = await get_user_by_email_use_case(session).execute(request.email)

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(request.password.encode("utf-8"), user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        subject=str(user.id),
        email=user.email,
        role=user.role.value,
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )

    return {"id": str(user.id), "email": user.email, "role": user.role.value}

@router.post("/register", status_code=201)
async def register(request: RegisterRequest, response: Response, session: AsyncSession = Depends(get_db_session)):
    exists = await get_check_user_exists_use_case(session).execute(request.email)
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.now(UTC)
    hashed_password = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt())

    user = User(
        id=uuid.uuid4(),
        email=request.email,
        full_name=request.username,
        phone=request.phone,
        country_code=request.country_code,
        role=UserRole.TRAVELER,
        password=hashed_password,
        created_at=now,
        updated_at=now,
    )

    created = await get_create_user_use_case(session).execute(user)

    token = create_access_token(
        subject=str(created.id),
        email=created.email,
        role=created.role.value,
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )

    return {"id": str(created.id), "email": created.email, "role": created.role.value}
