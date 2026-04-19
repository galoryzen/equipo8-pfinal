import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.inbound.api.dependencies import (
    get_admin_register_partner_use_case,
    get_db_session,
)
from app.application.use_cases.admin_register_partner_user import AdminRegisterPartnerUserUseCase
from app.config import settings
from app.schemas.admin_partner import AdminPartnerRegisterRequest

router = APIRouter()


async def verify_partner_admin_key(
    x_partner_admin_key: Annotated[str | None, Header()] = None,
) -> None:
    secret = settings.PARTNER_ADMIN_SECRET
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Partner admin user provisioning is not configured",
        )
    if not hmac.compare_digest(
        (x_partner_admin_key or "").encode("utf-8"),
        secret.encode("utf-8"),
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/admin/partner-users", status_code=201)
async def admin_register_partner_user(
    _: Annotated[None, Depends(verify_partner_admin_key)],
    body: AdminPartnerRegisterRequest,
    session: AsyncSession = Depends(get_db_session),
):
    use_case: AdminRegisterPartnerUserUseCase = get_admin_register_partner_use_case(session)
    return await use_case.execute(
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        email=body.email,
        country_code=body.country_code,
        password=body.password,
        organization_type=body.organization_type,
        organization_id=body.organization_id,
    )
