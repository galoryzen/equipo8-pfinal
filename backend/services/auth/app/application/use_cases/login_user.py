import bcrypt

from app.application.exceptions import InvalidCredentialsError
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import UserRole


class LoginUserUseCase:
    def __init__(self, repo: UserRepository, token: TokenPort):
        self._repo = repo
        self._token = token

    async def execute(self, email: str, password: str) -> dict:
        user = await self._repo.get_by_email(email)
        if user is None:
            raise InvalidCredentialsError()

        if not bcrypt.checkpw(password.encode("utf-8"), user.password):
            raise InvalidCredentialsError()

        hotel_id: str | None = None
        if user.role == UserRole.HOTEL:
            hid = await self._repo.get_hotel_id_by_user_id(user.id)
            if hid is not None:
                hotel_id = str(hid)

        access_token = self._token.create_access_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            full_name=user.full_name,
            hotel_id=hotel_id,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name,
            "token": access_token,
        }
