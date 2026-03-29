import bcrypt

from app.application.exceptions import InvalidCredentialsError
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository


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

        access_token = self._token.create_access_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "token": access_token,
        }
