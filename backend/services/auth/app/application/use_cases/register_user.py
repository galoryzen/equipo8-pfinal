import uuid
from datetime import datetime, timezone

import bcrypt

from app.application.exceptions import EmailAlreadyExistsError
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import User, UserRole


class RegisterUserUseCase:
    def __init__(self, repo: UserRepository, token: TokenPort):
        self._repo = repo
        self._token = token

    async def execute(
        self,
        email: str,
        username: str,
        phone: str,
        country_code: str,
        password: str,
    ) -> dict:
        exists = await self._repo.check_user_exists(email)
        if exists:
            raise EmailAlreadyExistsError(email)

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=username,
            phone=phone,
            country_code=country_code,
            role=UserRole.TRAVELER,
            password=hashed_password,
            created_at=now,
            updated_at=now,
        )

        created = await self._repo.create_user(user)

        access_token = self._token.create_access_token(
            subject=str(created.id),
            email=created.email,
            role=created.role.value,
            full_name=created.full_name,
        )

        return {
            "id": str(created.id),
            "email": created.email,
            "role": created.role.value,
            "full_name": created.full_name,
            "token": access_token,
        }
