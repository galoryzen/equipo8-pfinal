from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_db_session,
    get_login_use_case,
    get_register_use_case,
    get_token_adapter,
    get_validate_token_use_case,
)
from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.token_port import TokenPort
from app.config import settings
from app.schemas.login import LoginRequest, RegisterRequest

router = APIRouter()


def _set_token_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )


def _clear_token_cookie(response: Response) -> None:
    response.delete_cookie(
        key="access_token",
        secure=not settings.DEBUG,
        samesite="lax",
    )


@router.post("/login")
async def login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
    token: TokenPort = Depends(get_token_adapter),
):
    use_case = get_login_use_case(session, token)
    result = await use_case.execute(request.email, request.password)

    _set_token_cookie(response, result["token"])
    # Token is also returned in the body so non-browser clients (mobile RN + axios)
    # that can't read HttpOnly cookies can still authenticate. Web keeps using the cookie.
    return {
        "id": result["id"],
        "email": result["email"],
        "role": result["role"],
        "full_name": result["full_name"],
        "token": result["token"],
    }


@router.post("/register", status_code=201)
async def register(
    request: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
    token: TokenPort = Depends(get_token_adapter),
):
    use_case = get_register_use_case(session, token)
    result = await use_case.execute(
        email=request.email,
        username=request.username,
        phone=request.phone,
        country_code=request.country_code,
        password=request.password,
    )

    _set_token_cookie(response, result["token"])
    return {
        "id": result["id"],
        "email": result["email"],
        "role": result["role"],
        "full_name": result["full_name"],
        "token": result["token"],
    }


@router.get("/me")
async def me(
    access_token: str | None = Cookie(default=None),
    token: TokenPort = Depends(get_token_adapter),
):
    if not access_token:
        raise InvalidTokenError()

    use_case = get_validate_token_use_case(token)
    return use_case.execute(access_token)


@router.post("/logout", status_code=204)
async def logout(response: Response):
    _clear_token_cookie(response)
