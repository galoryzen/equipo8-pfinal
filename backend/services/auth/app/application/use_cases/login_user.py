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

        # Solo permitir roles HOTEL, AGENCY, ADMIN para login de manager
        allowed_roles = {UserRole.HOTEL, UserRole.AGENCY, UserRole.ADMIN}
        if user.role not in allowed_roles:
            raise InvalidCredentialsError()

        hotel_id: str | None = None
        # Validar usuario activo según rol
        if user.role == UserRole.HOTEL:
            hid = await self._repo.get_hotel_id_by_user_id(user.id)
            if hid is None:
                # No tiene relación activa
                raise InvalidCredentialsError()
            hotel_id = str(hid)
        elif user.role == UserRole.AGENCY:
            agency_id = await self._repo.get_agency_id_by_user_id(user.id)
            if agency_id is None:
                # No tiene relación activa
                raise InvalidCredentialsError()
            agency_id = str(agency_id)
        # ADMIN solo requiere credenciales válidas

        access_token = self._token.create_access_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            hotel_id=hotel_id,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "token": access_token,
        }
