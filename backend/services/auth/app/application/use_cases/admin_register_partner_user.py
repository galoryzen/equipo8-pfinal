import uuid
from datetime import datetime, timezone
from typing import Literal

import bcrypt

from app.application.exceptions import EmailAlreadyExistsError, InvalidPartnerOrganizationError
from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import User, UserRole


class AdminRegisterPartnerUserUseCase:
    """Provision HOTEL/AGENCY users linked to an existing ACTIVE partner organization."""

    def __init__(self, repo: UserRepository):
        self._repo = repo

    async def execute(
        self,
        *,
        first_name: str,
        last_name: str,
        phone: str,
        email: str,
        country_code: str,
        password: str,
        organization_type: Literal["HOTEL", "AGENCY"],
        organization_id: uuid.UUID,
    ) -> dict:
        if await self._repo.check_user_exists(email):
            raise EmailAlreadyExistsError(email)

        if organization_type == "HOTEL":
            if not await self._repo.hotel_exists_and_active(organization_id):
                raise InvalidPartnerOrganizationError()
            role = UserRole.HOTEL
        else:
            if not await self._repo.agency_exists_and_active(organization_id):
                raise InvalidPartnerOrganizationError()
            role = UserRole.AGENCY

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        full_name = f"{first_name.strip()} {last_name.strip()}".strip()
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        user = User(
            id=uuid.uuid4(),
            email=email.strip(),
            full_name=full_name,
            phone=phone.strip(),
            country_code=country_code.strip(),
            role=role,
            password=hashed_password,
            created_at=now,
            updated_at=now,
        )

        if organization_type == "HOTEL":
            created = await self._repo.create_hotel_partner_user(user, organization_id)
        else:
            created = await self._repo.create_agency_partner_user(user, organization_id)

        return {
            "id": str(created.id),
            "email": created.email,
            "role": created.role.value,
            "organization_type": organization_type,
            "organization_id": str(organization_id),
        }
